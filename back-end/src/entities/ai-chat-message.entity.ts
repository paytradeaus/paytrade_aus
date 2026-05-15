import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_chat_messages' })
@Index('IX_ai_chat_messages_thread_id', ['thread_id'])
@Index('IX_ai_chat_messages_thread_created', ['thread_id', 'created_on'])
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  thread_id: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  error_reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  page_context: Record<string, any> | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
