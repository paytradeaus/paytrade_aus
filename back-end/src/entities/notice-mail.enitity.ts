import {
  AfterInsert,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { NoticeDetails } from './notices-details.entity';

@Entity()
export class NoticeMail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  notice_mail_id: number;

  @Column({ type: 'bigint', nullable: true })
  notice_id: number;

  @Column({ type: 'varchar', nullable: true })
  email_from: string;

  @Column({ type: 'varchar', nullable: true })
  email_to: string;

  @Column({ nullable: true, default: true })
  auto_mail: boolean;

  @Column({ nullable: true, default: false })
  mail_sent: boolean;

  @Column({ type: 'varchar', nullable: true })
  email_cc: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  email_subject: string;

  @Column({ type: 'text', nullable: true })
  email_content: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  email_date: Date;

  @ManyToOne(() => NoticeDetails, (notice) => notice.noticeMail)
  @JoinColumn({ name: 'notice_id', referencedColumnName: 'notice_id' })
  noticeDetails?: NoticeDetails;

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
}
