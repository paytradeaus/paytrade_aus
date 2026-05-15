import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_conversation_messages' })
@Index('IX_ai_conversation_messages_conversation_id', ['conversation_id'])
@Index('IX_ai_conversation_messages_conv_created', [
  'conversation_id',
  'created_on',
])
export class AiConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'uuid', nullable: true })
  run_id: string | null;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  status: string | null;

  @Column({ type: 'jsonb', nullable: true })
  page_context: Record<string, any> | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
