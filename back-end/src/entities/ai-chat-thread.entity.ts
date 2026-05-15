import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'ai_chat_threads' })
@Index('IX_ai_chat_threads_user_id', ['user_id'])
@Index('IX_ai_chat_threads_company_id', ['company_id'])
@Index('IX_ai_chat_threads_user_last_message', ['user_id', 'last_message_at'])
export class AiChatThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'integer', nullable: true })
  company_id: number | null;

  @Column({ type: 'varchar', length: 200, default: 'New chat' })
  title: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_message_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  message_count: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
