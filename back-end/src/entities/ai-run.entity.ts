import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AiRunStatus = 'running' | 'completed' | 'failed' | 'stopped';

@Entity({ name: 'ai_runs' })
@Index('IX_ai_runs_user_id', ['user_id'])
@Index('IX_ai_runs_company_id', ['company_id'])
@Index('IX_ai_runs_conversation_id', ['conversation_id'])
@Index('IX_ai_runs_status', ['status'])
export class AiRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  conversation_id: string | null;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'integer', nullable: true })
  company_id: number | null;

  @Column({
    type: 'enum',
    enum: ['running', 'completed', 'failed', 'stopped'],
    default: 'running',
  })
  status: AiRunStatus;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  started_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  openai_response_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  model: string | null;

  @Column({ type: 'numeric', precision: 13, scale: 6, default: 0 })
  raw_cost_usd: string;

  @Column({ type: 'numeric', precision: 13, scale: 4, default: 0 })
  amount_charged_usd: string;

  @Column({ type: 'integer', default: 0 })
  prompt_tokens: number;

  @Column({ type: 'integer', default: 0 })
  completion_tokens: number;

  @Column({ type: 'integer', default: 0 })
  total_tokens: number;

  @Column({ type: 'integer', default: 0 })
  tool_call_count: number;

  @Column({ type: 'integer', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
