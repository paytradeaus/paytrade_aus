import {
  AfterInsert,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { BankAccounts } from './banking.entity';
import { NilReturnStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { FileAttachments } from './file-attachments.entity';
import { NoticeDetails } from './notices-details.entity';

@Entity()
export class AuditReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  audit_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({ type: 'int', nullable: true })
  project_id?: number;

  @Column({ type: 'date' })
  audit_date: Date;

  @Column({ type: 'date', nullable: true })
  min_aud_from_date: Date;

  @Column({ type: 'date', nullable: true })
  aud_gen_from_date: Date;

  @Column({ type: 'date', nullable: true })
  aud_gen_to_date: Date;


  @Column({ type: 'bigint' })
  bank_account_id: number;

  @Column({
    type: 'enum',
    enum: ['Yes', 'NA'],
    default: 'NA',
  })
  nil_return: NilReturnStatus;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @Column({ type: 'uuid', array: true, nullable: true })
  attachment_ids: string[];

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

  @ManyToOne(() => CompanyDetails, (company) => company.auditDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => BankAccounts, (bankAccount) => bankAccount.auditDetails)
  @JoinColumn({
    name: 'bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  bankAccounts?: BankAccounts;

  // @OneToOne(() => FileAttachments, (file) => file.auditDetails)
  // @JoinColumn({ name: 'attachment_id', referencedColumnName: 'id' })
  // fileAttachments: FileAttachments;

  // @OneToMany(() => FileAttachments, (file) => file.auditDetails)
  // // @JoinColumn({ name: 'attachment_id', referencedColumnName: 'id' }) // this is necessary only if using unidirectional mapping or if customizing the foreign key
  // fileAttachments: FileAttachments[];

  @OneToMany(() => NoticeDetails, (notice) => notice.auditDetails)
  noticeDetails: NoticeDetails[];

  @AfterInsert()
  updateAuditId() {
    console.log(this.audit_id);
  }
}
