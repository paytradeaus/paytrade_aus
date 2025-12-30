import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { BankAccounts } from './banking.entity';
import { XeroPayments } from './xero-payments.entity';

@Entity()
export class XeroBankAccountDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  account_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'text' })
  account_name: string;

  @Column({ type: 'text' })
  account_number: string;

  @Column({ type: 'int', nullable: true })
  bsb_number: number;

  @Column({ type: 'text', nullable: true })
  account_type: string;

  @Column({ type: 'varchar', length: 50 })
  account_status: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

  @Column({ type: 'bigint', nullable: true })
  pt_bank_account_id: number;

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
    (project) => project.xeroBankAccountDetails,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => BankAccounts, (account) => account.xeroBankAccountDetails)
  @JoinColumn({
    name: 'pt_bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  bankAccounts: BankAccounts;

  @OneToMany(() => XeroPayments, (account) => account.xeroBankAccountDetails)
  xeroPayments: XeroPayments[];
}
