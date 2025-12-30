import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { FileAttachments } from './file-attachments.entity';

export type status = 'SUCCESS' | 'FAILED';

@Entity()
export class CommunicationEmails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_from_id', type: 'varchar' })
  emailFromId: string;

  @Column({ name: 'subject', type: 'varchar', nullable: true })
  subject: string;

  @Column({ name: 'body', type: 'varchar', nullable: true })
  body: string;

  @Column({ name: 'type', type: 'varchar', nullable: true })
  type: string;

  @Column({ name: 'to_emails', type: 'simple-array' })
  toEmails: string[];

  @Column({ name: 'email_cc_ids', nullable: true, type: 'simple-array' })
  emailCcIds: string[];

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'attachment_id', nullable: true, type: 'simple-array' })
  attachmentIds: string[];

  @ManyToMany((type) => FileAttachments)
  @JoinColumn([{ name: 'attachmentIds', referencedColumnName: 'id' }])
  fileAttachments: FileAttachments[];

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

  @Column({ type: 'varchar', length: 100, default: 'SYSTEM' })
  created_by: string;

  @Column({ type: 'varchar', length: 100, default: 'SYSTEM' })
  updated_by: string;
}
