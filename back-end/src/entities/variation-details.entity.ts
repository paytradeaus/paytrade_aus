import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  AfterInsert,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyDetails } from './company-details.entity';
import { ProjectDetails } from './project-details.entity';
import { ContractDetails } from './contract-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { Group } from './user-details.entity';
export type VariationStatus =
  | 'Draft'
  | 'Agreed'
  | 'In Review'
  | 'Refused'
  | 'Archived'
  | 'Deleted';

@Entity()
export class VariationDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  variation_id: number;

  @PrimaryColumn({ type: 'int' })
  company_id: number;

  @Column({ type: 'varchar', length: 150 })
  variation_name: string;

  @Column({
    type: 'enum',
    enum: ['Draft', 'Agreed', 'In Review', 'Refused', 'Archived', 'Deleted'],
    default: 'Draft',
    nullable: true,
  })
  variation_status: VariationStatus;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  contract_id: number;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  variation_amount: number;

  @Column({ default: false })
  is_archived: Boolean;

  @Column({ nullable: true })
  attachment_id: string;

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

  @ManyToOne(() => CompanyDetails, (company) => company.variationDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.variationDetails)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails: ProjectDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.variationDetails)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'contract_id' })
  contractDetails: ContractDetails;

  @OneToOne(() => FileAttachments, (file) => file.variationDetails)
  @JoinColumn({ name: 'attachment_id', referencedColumnName: 'id' })
  fileAttachments: FileAttachments;

  @AfterInsert()
  updateVariationId() {
    console.log(this.variation_id);
  }
}
