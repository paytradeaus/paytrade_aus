import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { ProjectDetails } from './project-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroSyncLogs } from './xero-sync-logs.entity';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';

@Entity()
export class XeroProjectDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'text' })
  project_name: string;

  @Column({ type: 'varchar', length: 50 })
  project_status: string;

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

  @Column({ type: 'integer', nullable: true })
  pt_project_id: number;

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

  @ManyToOne(
    () => XeroIntegrationDetails,
    (project) => project.xeroProjectDetails,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.xeroProjectDetails)
  @JoinColumn({
    name: 'pt_project_id',
    referencedColumnName: 'project_id',
  })
  projectDetails: ProjectDetails;

  @OneToMany(() => XeroInvoicesBills, (project) => project.xeroProjectDetails)
  xeroInvoicesBills: XeroInvoicesBills[];

  @OneToMany(() => XeroSyncLogs, (project) => project.xeroProjectDetails)
  xeroSyncLogs: XeroSyncLogs[];
}
