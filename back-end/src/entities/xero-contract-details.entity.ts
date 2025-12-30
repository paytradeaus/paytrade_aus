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
import { ContractDetails } from './contract-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroSyncLogs } from './xero-sync-logs.entity';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';

@Entity()
export class XeroContractDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'text' })
  contract_name: string;

  @Column({ type: 'varchar', length: 50 })
  contract_status: string;

  @Column({ type: 'integer', nullable: true })
  pt_contract_id: number;

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

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
    (contract) => contract.xeroContractDetails,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.xeroContractDetails)
  @JoinColumn({ name: 'pt_contract_id', referencedColumnName: 'contract_id' })
  contractDetails: ContractDetails;

  @OneToMany(
    () => XeroInvoicesBills,
    (contract) => contract.xeroContractDetails,
  )
  xeroInvoicesBills: XeroInvoicesBills[];

  @OneToMany(() => XeroSyncLogs, (contract) => contract.xeroContractDetails)
  xeroSyncLogs: XeroSyncLogs[];
}
