import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { XeroSyncLogs } from './xero-sync-logs.entity';
import {
  XeroProcess,
  XeroStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@Entity()
export class XeroLogTemplates {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  sync_type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['Pay Trade > Xero', 'Xero > Pay Trade'],
  })
  process: XeroProcess;

  @Column({ type: 'enum', enum: ['Succeeded', 'Warning', 'Failed', 'Info'] })
  sync_status: XeroStatus;

  @Column({ default: false })
  from_xero: boolean;

  @Column({ type: 'text', nullable: true })
  error_code: string;

  @Column({ type: 'int', array: true, nullable: true })
  associated_log_ids: number[];

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @OneToMany(() => XeroSyncLogs, (log) => log.xeroLogTemplates)
  xeroSyncLogs: XeroSyncLogs[];
}
