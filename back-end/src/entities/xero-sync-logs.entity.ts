import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  Generated,
  AfterInsert,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { XeroLogTemplates } from './xero-log-templates.entity';
import { XeroStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroProjectDetails } from './xero-project-details.entity';
import { XeroContractDetails } from './xero-contract-details.entity';

@Entity()
export class XeroSyncLogs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  sync_id: number;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'int' })
  log_template_id: number;

  @Column({ type: 'json', default: {} })
  dynamic_values: Record<string, any>;

  @Column({ type: 'json', default: {} })
  reference: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string;

  @Column({ type: 'varchar', nullable: true })
  reference_id: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  history: string[];

  @Column({ type: 'varchar', default: 'NA' })
  notification: string;

  @Column({ type: 'varchar', default: 'NA' })
  information_required: string;

  @Column({ type: 'json', default: {} })
  important_checks: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  xero_records: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  paytrade_records: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  new_records: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  updated_records: Record<string, any>[];

  @Column({ type: 'jsonb', nullable: true })
  synced_records: Record<string, any>[];

  @Column({ type: 'varchar', nullable: true })
  api_name: string;

  @Column({ type: 'json', default: {} })
  api_payload: Record<string, any>;

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

  @ManyToOne(() => XeroLogTemplates, (template) => template.xeroSyncLogs)
  @JoinColumn({ name: 'log_template_id', referencedColumnName: 'id' })
  xeroLogTemplates: XeroLogTemplates;

  @ManyToOne(() => XeroIntegrationDetails, (sync) => sync.xeroSyncLogs)
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => XeroProjectDetails, (sync) => sync.xeroSyncLogs)
  @JoinColumn({
    name: 'project_id',
    referencedColumnName: 'id',
  })
  xeroProjectDetails: XeroProjectDetails;

  @ManyToOne(() => XeroContractDetails, (sync) => sync.xeroSyncLogs)
  @JoinColumn({
    name: 'contract_id',
    referencedColumnName: 'id',
  })
  xeroContractDetails: XeroContractDetails;

  @AfterInsert()
  updateSyncId() {
    console.log(this.sync_id);
  }
}
