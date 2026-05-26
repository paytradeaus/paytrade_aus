import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';
import { XeroPayments } from './xero-payments.entity';

@Entity()
// Task #135 — Partial unique index prevents duplicate Xero contact rows
// per integration. Created with `WHERE contact_id IS NOT NULL` so the
// existing legacy rows that pre-date `contact_id` (kept as NULL on
// disconnected/archived integrations) don't collide. The matching DB
// migration deduplicates existing rows before adding the index so the
// constraint can be enforced safely on production data.
@Index('UQ_xero_contact_details_integration_contact', ['integration_id', 'contact_id'], {
  unique: true,
  where: '"contact_id" IS NOT NULL',
})
export class XeroContactDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  contact_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  merge_to_contact_id: string;

  @Column({ type: 'text' })
  contact_name: string;

  @Column({ type: 'varchar', length: 50 })
  contact_status: string;

  @Column({ nullable: true })
  is_supplier: boolean;

  @Column({ nullable: true })
  is_customer: boolean;

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

  @Column({ type: 'integer', nullable: true })
  pt_contact_id: number;

  // Task #289 — When true, this contact is deliberately excluded from
  // Xero auto-mapping (sync + webhook) and from invoice/bill push. It
  // remains queryable as "unmapped" (pt_contact_id IS NULL, mapped_status
  // IS NULL) but lives in its own "Permanently unmapped" view until a
  // user explicitly re-enables it.
  @Column({ type: 'boolean', default: false })
  permanently_unmapped: boolean;

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
    (contact) => contact.xeroContactDetails,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(
    () => ClientSuppliersDetails,
    (contact) => contact.xeroContactDetails,
  )
  @JoinColumn({
    name: 'pt_contact_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSupplierDetails: ClientSuppliersDetails;

  @OneToMany(() => XeroInvoicesBills, (contact) => contact.xeroContactDetails)
  xeroInvoicesBills: XeroInvoicesBills[];

  @OneToMany(() => XeroPayments, (contact) => contact.xeroContactDetails)
  xeroPayments: XeroPayments[];
}
