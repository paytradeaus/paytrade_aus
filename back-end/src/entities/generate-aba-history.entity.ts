import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { FileAttachments } from './file-attachments.entity';

export type GenerateABAStatus = 'Active' | 'Archived' | ' Deleted';

@Entity()
export class GenerateABAFileHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', nullable: true })
  company_id: number;

  @Column({ type: 'bigint' })
  bank_account_id: number;

  @Column({ type: 'int', nullable: true })
  aba_number: number;

  @Column()
  aba_file_id: string;

  @Column({ type: 'boolean', default: false })
  mark_paid: boolean;

  @OneToOne(() => FileAttachments)
  @JoinColumn({ name: 'aba_file_id', referencedColumnName: 'id' })
  fileAttachments: FileAttachments;

  @Column({
    type: 'enum',
    enum: ['Active', 'Archived', 'Deleted'],
    default: 'Active',
    nullable: true,
  })
  status: GenerateABAStatus;

  @Column({ type: 'integer' })
  generated_by: number;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'SYSTEM',
    nullable: true,
  })
  created_group: Group;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'SYSTEM',
    nullable: true,
  })
  updated_group: Group;
}
