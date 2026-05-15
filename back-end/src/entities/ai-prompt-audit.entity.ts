import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_prompt_audit' })
@Index('IX_ai_prompt_audit_user_id', ['user_id'])
@Index('IX_ai_prompt_audit_company_id', ['company_id'])
@Index('IX_ai_prompt_audit_ai_run_id', ['ai_run_id'])
export class AiPromptAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  model: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  request_id: string | null;

  @Column({ type: 'text' })
  prompt_text: string;

  @Column({ type: 'text', nullable: true })
  response_text: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'integer', nullable: true })
  prompt_tokens: number | null;

  @Column({ type: 'integer', nullable: true })
  completion_tokens: number | null;

  @Column({ type: 'integer', nullable: true })
  total_tokens: number | null;

  @Column({ type: 'integer', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'integer', nullable: true })
  user_id: number | null;

  @Column({ type: 'integer', nullable: true })
  company_id: number | null;

  @Column({ type: 'integer', nullable: true })
  admin_id: number | null;

  @Column({ type: 'uuid', nullable: true })
  ai_run_id: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
