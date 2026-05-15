import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  LlmChatStreamInput,
  LlmProvider,
  LlmStreamEvent,
} from './llm-provider.interface';

/**
 * Approximate per-1K-token USD pricing for the models we use. Kept
 * conservative; the user-facing dollar figure is multiplied by the
 * admin cost multiplier so small price drift never under-charges us.
 *
 * Source: OpenAI public pricing as of 2026-05.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025 / 1, output: 0.01 / 1 },
  'gpt-4o-mini': { input: 0.00015 / 1, output: 0.0006 / 1 },
  'gpt-4o-2024-08-06': { input: 0.0025 / 1, output: 0.01 / 1 },
};

const FALLBACK_PRICING = MODEL_PRICING['gpt-4o-mini'];

function priceFor(model: string) {
  const key = Object.keys(MODEL_PRICING).find((k) =>
    model.toLowerCase().startsWith(k),
  );
  return key ? MODEL_PRICING[key] : FALLBACK_PRICING;
}

@Injectable()
export class OpenAiLlmProvider implements LlmProvider {
  readonly defaultModel = 'gpt-4o';
  private readonly logger = new PaytradeLogger('AI_CHAT_LLM_OPENAI');
  private readonly client: OpenAI | null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set — AI chat agent will refuse to run.',
      );
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async *chatStream(
    input: LlmChatStreamInput,
  ): AsyncIterable<LlmStreamEvent> {
    if (!this.client) {
      yield { type: 'error', message: 'AI chat is not available right now.' };
      yield { type: 'completed', finishReason: 'error' };
      return;
    }

    const model = input.modelOverride || this.defaultModel;
    const messages = input.messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.toolCallId!,
        };
      }
      return { role: m.role, content: m.content };
    });

    const tools =
      input.tools.length > 0
        ? input.tools.map((t) => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          }))
        : undefined;

    let stream;
    try {
      stream = await this.client.chat.completions.create(
        {
          model,
          messages: messages as any,
          tools,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: input.signal },
      );
    } catch (err: any) {
      if (input.signal?.aborted) {
        yield { type: 'completed', finishReason: 'stopped' };
        return;
      }
      yield {
        type: 'error',
        message: `LLM request failed: ${err?.message || String(err)}`,
      };
      yield { type: 'completed', finishReason: 'error' };
      return;
    }

    const toolBuf = new Map<
      number,
      { id: string; name: string; args: string }
    >();
    let responseId: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let finishReason: 'stop' | 'tool_calls' | 'stopped' | 'error' = 'stop';

    try {
      for await (const chunk of stream) {
        if (input.signal?.aborted) {
          finishReason = 'stopped';
          break;
        }
        if (chunk.id && !responseId) responseId = chunk.id;
        const choice = chunk.choices?.[0];
        if (choice) {
          const delta: any = choice.delta || {};
          if (typeof delta.content === 'string' && delta.content.length) {
            yield { type: 'text_delta', text: delta.content };
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const cur = toolBuf.get(idx) || { id: '', name: '', args: '' };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (typeof tc.function?.arguments === 'string') {
                cur.args += tc.function.arguments;
              }
              toolBuf.set(idx, cur);
            }
          }
          if (choice.finish_reason === 'tool_calls') {
            finishReason = 'tool_calls';
          } else if (choice.finish_reason === 'stop') {
            finishReason = 'stop';
          }
        }
        if ((chunk as any).usage) {
          const u = (chunk as any).usage;
          promptTokens = u.prompt_tokens || 0;
          completionTokens = u.completion_tokens || 0;
          totalTokens = u.total_tokens || promptTokens + completionTokens;
        }
      }
    } catch (err: any) {
      if (input.signal?.aborted) {
        finishReason = 'stopped';
      } else {
        yield {
          type: 'error',
          message: `LLM stream error: ${err?.message || String(err)}`,
        };
        yield { type: 'completed', finishReason: 'error' };
        return;
      }
    }

    if (finishReason === 'tool_calls') {
      for (const tc of toolBuf.values()) {
        if (tc.id && tc.name) {
          yield {
            type: 'tool_call',
            id: tc.id,
            name: tc.name,
            argumentsJson: tc.args || '{}',
          };
        }
      }
    }

    const price = priceFor(model);
    const rawCostUsd = +(
      (promptTokens / 1000) * price.input +
      (completionTokens / 1000) * price.output
    ).toFixed(6);

    yield {
      type: 'usage',
      promptTokens,
      completionTokens,
      totalTokens,
      rawCostUsd,
      responseId,
      model,
    };
    yield { type: 'completed', finishReason, responseId };
  }
}
