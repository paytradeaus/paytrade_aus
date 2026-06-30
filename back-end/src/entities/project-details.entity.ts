import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  AfterInsert,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyDetails } from './company-details.entity';
import { ContractDetails } from './contract-details.entity';
import { VariationDetails } from './variation-details.entity';
import { Group } from './user-details.entity';
import { PaymentClaims } from './banking.entity';
import { PaymentDetails } from './payment-details.entity';
import { NoticeDetails } from './notices-details.entity';
import { JournalEntries } from './journal-entries.entity';
import { ComplianceStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroProjectDetails } from './xero-project-details.entity';
export type ProjectStatus =
  | 'Draft'
  | 'In Progress'
  | 'Completed'
  | 'Archived'
  | 'Deleted';
export type ProjectRole = 'Principal' | 'Head Contractor' | 'Sub Contractor';
export type RetentionType = 'Cash' | 'Bank guaranteed' | 'None';
export type Eligibility = 'Yes' | 'No';

@Entity()
export class ProjectDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  project_id: number;

  @PrimaryColumn({ type: 'int' })
  company_id: number;

  @ManyToOne(() => CompanyDetails, (company) => company.projectDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @Column({ type: 'varchar', length: 150 })
  project_name: string;

  @Column({
    type: 'enum',
    enum: ['Principal', 'Head Contractor', 'Sub Contractor'],
    nullable: true,
  })
  project_role: ProjectRole;

  @Column({ type: 'date', nullable: true })
  project_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  project_description: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  site_address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string;

  @Column({ type: 'text', nullable: true })
  place_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude: string;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: true })
  head_contract_sum: number;

  @Column({
    type: 'enum',
    enum: ['Cash', 'Bank guaranteed', 'None'],
    nullable: true,
  })
  retention_type: RetentionType;

  @Column({ type: 'int', nullable: true })
  number_of_units: number;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  pta_eligibility: Eligibility;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  rta_eligibility: Eligibility;

  @Column({
    type: 'enum',
    enum: ['Ok', 'Action required'],
    default: 'Action required',
  })
  pta_compliance: ComplianceStatus;

  @Column({
    type: 'enum',
    enum: ['Ok', 'Action required'],
    default: 'Action required',
  })
  rta_compliance: ComplianceStatus;

  @Column({
    type: 'enum',
    enum: ['Draft', 'In Progress', 'Completed', 'Archived', 'Deleted'],
    default: 'In Progress',
  })
  project_status: ProjectStatus;

  // Manual per-project compliance pause. When true, all compliance
  // recompute / system-issue generation, dashboard issue counting and
  // compliance emails are suppressed for this project until it is
  // explicitly resumed (which re-runs the full recompute).
  @Column({ type: 'boolean', default: false })
  compliance_paused: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  compliance_paused_reason: string;

  @Column({ type: 'integer', nullable: true })
  compliance_paused_by: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  compliance_paused_at: Date;

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

  @OneToMany(() => ContractDetails, (contract) => contract.projectDetails)
  contractDetails: ContractDetails[];

  @OneToMany(() => VariationDetails, (variation) => variation.projectDetails)
  variationDetails: VariationDetails[];

  @OneToMany(() => PaymentClaims, (paymentClaim) => paymentClaim.projectDetails)
  paymentClaims: PaymentClaims[];

  @OneToMany(() => PaymentDetails, (company) => company.projectDetails)
  paymentDetails: PaymentDetails[];

  @OneToMany(() => NoticeDetails, (notice) => notice.projectDetails)
  noticeDetails: NoticeDetails[];

  @OneToMany(() => JournalEntries, (journal) => journal.projectDetails)
  journalEntries: JournalEntries[];

  @OneToMany(() => XeroProjectDetails, (project) => project.projectDetails)
  xeroProjectDetails: XeroProjectDetails[];

  @AfterInsert()
  updateProjectId() {
    console.log(this.project_id);
  }
}
