import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  AfterInsert,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ContractDetails } from './contract-details.entity';
import { CompanyDetails } from './company-details.entity';
import { Group } from './user-details.entity';
import { BankAccounts, PaymentClaims } from './banking.entity';
import { PaymentDetails } from './payment-details.entity';
import { JournalEntries } from './journal-entries.entity';
import { NoticeDetails } from './notices-details.entity';
import { XeroContactDetails } from './xero-contact-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
export type ClientSupplierType = 'Client' | 'Supplier';
export type ClientSupplierStatus = 'Draft' | 'Completed';
export type RelatedEntity = 'Yes' | 'No';
export type EntityType = 'Business' | 'Sole Trader' | 'Personal';

@Entity()
export class ClientSuppliersDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  client_supplier_id: number;

  @Column({ type: 'integer' })
  company_id: number;

  @ManyToOne(() => CompanyDetails, (company) => company.clientSuppliersDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @Column({ type: 'varchar', length: 150 })
  client_supplier_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  business_name: string;

  @Column({
    type: 'enum',
    enum: ['Client', 'Supplier'],
    nullable: true,
  })
  client_supplier_type: ClientSupplierType;

  @Column({
    type: 'enum',
    enum: ['Draft', 'Completed'],
  })
  client_supplier_status: ClientSupplierStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  related_entity: RelatedEntity;

  @Column({
    type: 'enum',
    enum: ['Business', 'Sole Trader', 'Personal'],
    nullable: true,
  })
  entity_type: EntityType;

  @Column({ type: 'text', nullable: true })
  place_id: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  client_supplier_address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  client_phone_no: string;

  @Column({ type: 'varchar', length: 100 })
  client_email_id: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  client_website: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  qbcc_number: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  acn_number: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  abn_number: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  tfn_number: string;

  @Column({ type: 'int', nullable: true })
  payment_terms: number;

  // Phase 2 Xero per-contact GST defaults. These mirror Xero's contact-level
  // `salesDefaultTaxType` and `purchasesDefaultTaxType` (free-form text so
  // any jurisdiction's tax-type code can be stored). NULL means
  // "fall through to organisation default". Used by
  // `resolveContactGstStatus(contact, claimType)` to determine whether GST
  // applies to a claim line for this contact.
  @Column({ type: 'text', nullable: true })
  xero_sales_gst_setting: string;

  @Column({ type: 'text', nullable: true })
  xero_purchases_gst_setting: string;

  // Task #41 — Per-supplier default Xero expense account override used by
  // the variable bill code resolver. NULL means "no override; use the
  // company-level fallback bill_code (when allowed) or fail up-front".
  @Column({ type: 'text', nullable: true })
  xero_default_account_code: string;

  @Column({ default: false })
  is_deleted: Boolean;

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

  @OneToMany(
    () => BankAccounts,
    (clientSuppliers) => clientSuppliers.clientSuppliersDetails,
  )
  accountDetails: BankAccounts[];

  @OneToMany(
    () => ContractDetails,
    (contract) => contract.clientSuppliersDetails,
  )
  contractDetails: ContractDetails[];

  @OneToMany(
    () => PaymentClaims,
    (paymentClaim) => paymentClaim.clientSupplierDetails,
  )
  paymentClaims: PaymentClaims[];

  @OneToMany(() => PaymentDetails, (company) => company.clientSupplierDetails)
  paymentDetails: PaymentDetails[];

  @OneToMany(() => JournalEntries, (company) => company.clientSupplierDetails)
  journalEntries: JournalEntries[];

  @OneToMany(() => NoticeDetails, (notice) => notice.clientSupplierDetails)
  noticeDetails: NoticeDetails[];

  @Column({ name: 'notice_generated', type: 'boolean', default: false })
  notice_generated: boolean;

  @OneToMany(
    () => XeroContactDetails,
    (contact) => contact.clientSupplierDetails,
  )
  xeroContactDetails: XeroContactDetails[];

  @AfterInsert()
  updateClientSupplierId() {
    console.log(this.client_supplier_id);
  }
}
