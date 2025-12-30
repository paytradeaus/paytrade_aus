import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    OneToMany,
    ManyToOne,
    ManyToMany,
    Generated,
    UpdateDateColumn,
    CreateDateColumn,
  } from 'typeorm';
import { Group } from './user-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { NoticeDetails } from './notices-details.entity';


@Entity()
export class NoticeTemplates {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  notice_template_id: number;

  @Column({ type: 'varchar', nullable: true, unique: true })
  notice_template_name: string;

  @Column({ type: 'varchar', nullable: true })
  memo_notes: string;

  @Column({ name: 'is_viewed', type: 'boolean', default: false })
  sign_required: boolean;

  @OneToOne(() => FileAttachments, (notice_temp) => notice_temp.noticeTemplate, {
    nullable: true,
  })
  @JoinColumn({ name: 'noticeTemplate' })
  notice_template?: FileAttachments;

  @OneToMany(() => NoticeDetails, (notice) => notice.templateDetails)
  noticeDetails: NoticeDetails[];

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
    default: 'USER',
    nullable: true,
  })
  created_group: Group;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'USER',
    nullable: true,
  })
  updated_group: Group;
}