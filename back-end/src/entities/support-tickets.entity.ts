import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { Group } from './user-details.entity';

export type status = 'Received' | 'Contacted' | 'Closed';

@Entity()
export class SupportTickets {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  ticket_id: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'company_name', type: 'varchar', nullable: true })
  companyName: string;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'message', type: 'varchar' })
  message: string;

  @Column({
    type: 'enum',
    enum: ['Received', 'Contacted', 'Closed'],
    default: 'Received',
  })
  status: status;

  @Column({ name: 'is_viewed', type: 'boolean', default: false })
  isViewed: boolean;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

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
  created_group: Group;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'SYSTEM',
    nullable: true,
  })
  updated_group: Group;

  @OneToMany(() => TicketMails, (mail) => mail.ticket, { cascade: true })
  mails: TicketMails[];

  @Column({ type: 'varchar', nullable: true })
  timezone: string;
}

@Entity()
export class TicketMails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SupportTickets, (ticket) => ticket.mails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTickets;

  @Column({ name: 'from_email', type: 'varchar' })
  fromEmail: string;

  @Column({ name: 'to_email', type: 'varchar' })
  toEmail: string;

  @Column({ name: 'subject', type: 'varchar', nullable: true })
  subject: string;

  @Column({ name: 'body', type: 'text' })
  body: string;

  @Column({ name: 'is_inbound', type: 'boolean', default: true })
  isInbound: boolean; // true = inbound mail, false = outbound (reply)

  @Column({ name: 'message_id', type: 'varchar', nullable: true })
  messageId: string; // For threading

  @Column({ name: 'in_reply_to', type: 'varchar', nullable: true })
  inReplyTo: string; // Parent mail message_id

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
