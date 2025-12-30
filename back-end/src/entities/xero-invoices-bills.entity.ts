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
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroContactDetails } from './xero-contact-details.entity';
import { PaymentClaims } from './banking.entity';
import { XeroPayments } from './xero-payments.entity';
import { XeroProjectDetails } from './xero-project-details.entity';
import { XeroContractDetails } from './xero-contract-details.entity';

interface LineItem {
  line_item_id: string;
  description?: string;
  quantity?: number;
  unit_amount?: number;
  account_code?: string;
  account_id?: string;
  tax_type?: string;
  tax_amount?: number;
  line_amount?: number;
  contract_id?: string;
  project_id?: string;
}

@Entity()
export class XeroInvoicesBills {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  invoice_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string;

  @Column({ type: 'uuid' })
  contact_id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'date', nullable: true })
  invoice_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ type: 'text', nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  sub_total: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  total_tax: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  total_amount: number;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  line_items: LineItem[];

  @Column({ type: 'text', nullable: true })
  line_amount_types: string; //lineAmountTypes

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

  @Column({ type: 'bigint', nullable: true })
  pt_claim_id: number;

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
    (invoice) => invoice.xeroInvoicesBills,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => PaymentClaims, (contract) => contract.xeroInvoicesBills)
  @JoinColumn({ name: 'pt_claim_id', referencedColumnName: 'payment_claim_id' })
  paymentClaims: PaymentClaims;

  @ManyToOne(() => XeroContactDetails, (contact) => contact.xeroInvoicesBills)
  @JoinColumn({
    name: 'contact_id',
    referencedColumnName: 'id',
  })
  xeroContactDetails: XeroContactDetails;

  @ManyToOne(() => XeroProjectDetails, (project) => project.xeroInvoicesBills)
  @JoinColumn({
    name: 'project_id',
    referencedColumnName: 'id',
  })
  xeroProjectDetails: XeroProjectDetails;

  @ManyToOne(
    () => XeroContractDetails,
    (contract) => contract.xeroInvoicesBills,
  )
  @JoinColumn({
    name: 'contract_id',
    referencedColumnName: 'id',
  })
  xeroContractDetails: XeroContractDetails;

  @OneToMany(() => XeroPayments, (invoice) => invoice.xeroInvoicesBills)
  xeroPayments: XeroPayments[];
}
