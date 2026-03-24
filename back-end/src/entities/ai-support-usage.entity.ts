import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class AiSupportUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({ type: 'integer', nullable: true })
  company_id: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar', length: 64 })
  question_hash: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  asked_at: Date;
}
