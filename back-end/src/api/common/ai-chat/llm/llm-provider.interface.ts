/**
 * Thin abstraction over the chosen LLM. We intentionally hide the
 * provider's wire format behind a small streaming-friendly interface so
 * the orchestrator never depends on OpenAI types directly. Choosing a
 * different provider is a code change only — there is no user-facing
 * model switcher.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Set on `tool` messages to thread the result back to the model. */
  toolCallId?: string;
  /** Set on `tool` messages to identify which tool the result came from. */
  name?: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LlmStreamTextDelta {
  type: 'text_delta';
  text: string;
}

export interface LlmStreamToolCall {
  type: 'tool_call';
  id: string;
  name: string;
  argumentsJson: string;
}

export interface LlmStreamUsage {
  type: 'usage';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Raw cost in USD computed from token usage and per-model price. */
  rawCostUsd: number;
  responseId?: string | null;
  model: string;
}

export interface LlmStreamCompleted {
  type: 'completed';
  finishReason: 'stop' | 'tool_calls' | 'stopped' | 'error';
  responseId?: string | null;
}

export interface LlmStreamError {
  type: 'error';
  message: string;
}

export type LlmStreamEvent =
  | LlmStreamTextDelta
  | LlmStreamToolCall
  | LlmStreamUsage
  | LlmStreamCompleted
  | LlmStreamError;

export interface LlmChatStreamInput {
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
  /** AbortSignal to cancel the in-flight request cleanly. */
  signal?: AbortSignal;
  /** Optional override for the default model. */
  modelOverride?: string;
}

export interface LlmProvider {
  /** Default model used when no override is supplied. */
  readonly defaultModel: string;
  /** Whether the provider is configured (e.g. has an API key). */
  isAvailable(): boolean;
  /**
   * Run a streaming chat completion. Yields incremental events as the
   * model produces them. Always yields exactly one `usage` and one
   * `completed` event (in that order) on success.
   */
  chatStream(input: LlmChatStreamInput): AsyncIterable<LlmStreamEvent>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
