import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPromptAudit } from 'src/entities/ai-prompt-audit.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

export interface AiPromptAuditEntry {
  model: string;
  promptText: string;
  responseText?: string | null;
  requestId?: string | null;
  metadata?: Record<string, any> | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  durationMs?: number | null;
  userId?: number | null;
  companyId?: number | null;
  adminId?: number | null;
  aiRunId?: string | null;
  errorMessage?: string | null;
}

/** Compliance-grade record of every prompt + response sent to the model. */
@Injectable()
export class AiPromptAuditService {
  private readonly logger = new PaytradeLogger('AI_PROMPT_AUDIT');

  constructor(
    @InjectRepository(AiPromptAudit)
    private readonly repo: Repository<AiPromptAudit>,
  ) {}

  async record(entry: AiPromptAuditEntry): Promise<string | null> {
    try {
      const row = await this.repo.save(
        this.repo.create({
          model: entry.model,
          prompt_text: entry.promptText,
          response_text: entry.responseText ?? null,
          request_id: entry.requestId ?? null,
          metadata: entry.metadata ?? null,
          prompt_tokens: entry.promptTokens ?? null,
          completion_tokens: entry.completionTokens ?? null,
          total_tokens: entry.totalTokens ?? null,
          duration_ms: entry.durationMs ?? null,
          user_id: entry.userId ?? null,
          company_id: entry.companyId ?? null,
          admin_id: entry.adminId ?? null,
          ai_run_id: entry.aiRunId ?? null,
          error_message: entry.errorMessage ?? null,
        }),
      );
      return row.id;
    } catch (error) {
      this.logger.error(
        `Failed to write ai_prompt_audit row (model=${entry.model}): ${error}`,
      );
      return null;
    }
  }
}
