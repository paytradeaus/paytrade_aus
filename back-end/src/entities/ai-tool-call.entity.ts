import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AiToolCallStatus = 'success' | 'error' | 'denied' | 'replay';

@Entity({ name: 'ai_tool_calls' })
@Index('IX_ai_tool_calls_tool_name', ['tool_name'])
@Index('IX_ai_tool_calls_user_id', ['user_id'])
@Index('IX_ai_tool_calls_company_id', ['company_id'])
@Index('IX_ai_tool_calls_ai_run_id', ['ai_run_id'])
@Index(
  'UQ_ai_tool_calls_idempotency_scope',
  ['tool_name', 'user_id', 'company_id', 'idempotency_key'],
  {
    unique: true,
    where: '"idempotency_key" IS NOT NULL AND "status" = \'success\'',
    synchronize: false,
  },
)
export class AiToolCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  tool_name: string;

  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  error_code: string | null;

  @Column({
    type: 'enum',
    enum: ['success', 'error', 'denied', 'replay'],
    default: 'success',
  })
  status: AiToolCallStatus;

  @Column({ type: 'uuid', nullable: true })
  replay_of_call_id: string | null;

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

  @Column({ type: 'varchar', length: 200, nullable: true })
  idempotency_key: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
