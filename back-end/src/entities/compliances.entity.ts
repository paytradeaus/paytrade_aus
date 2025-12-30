import {
  ActionButtonType,
  BankAccountType,
  ComplianceCheckStatus,
  ComplianceChecksOfPTA,
  ComplianceChecksOfRTA,
} from 'src/libs/@paytrade-types/paytrade-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';

@Entity()
export class PtaCompliances {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['Project Trust Account', 'Retention Trust Account'],
  })
  bank_account_type: BankAccountType;

  @Column({ type: 'varchar' })
  display_message: string;

  @Column({ type: 'varchar', nullable: true })
  display_message_colour: string;

  @Column({
    type: 'enum',
    enum: [
      'ADD_BANK_ACCOUNT',
      'ADD_CONTRACT',
      'EDIT_BANK_ACCOUNT',
      'EDIT_PROJECT',
      'MATCH_TRANSACTIONS',
      'EDIT_CONTRACT',
      'NONE',
      'SEND_NOTICE',
      'RECONCILE',
      'REVIEW_AUDIT',
      'VIEW_UNMATCHED_PAYMENTS',
      'SEND_SCHEDULE',
      'UPDATE_TRANSACTION_LIST',
      'TOPUP_ACCOUNT',
      'SEND_REMITTANCE',
      'WITHDRAW_BALANCE',
      'UPLOAD_CERTIFICATE',
      'VIEW_PAYMENTS'
    ],
    nullable: true,
  })
  action_button_type: ActionButtonType;

  @Column({ type: 'integer' })
  check_number: number;

  @Column({
    type: 'enum',
    enum: [
      'CHECK CONTRACT ELIGIBILITY',
      'OPEN PROJECT TRUST ACCOUNT',
      'NOTIFY PARTIES OF THE TRUST ACCOUNT',
      'ADMINISTRATION OF THE ACCOUNT',
      'PAYMENTS FROM THE PRINCIPAL',
      'PAYMENTS TO SUBCONTRACTORS',
      'PAYMENTS TO YOURSELF AS TRUSTEE',
      'MONTHLY RECONCILIATIONS AND RECORDKEEPING',
      'ANNUAL ACCOUNT REVIEW REPORTS',
      'CLOSE THE ACCOUNT',
    ],
    nullable: true,
  })
  check_name: ComplianceChecksOfPTA;

  @Column({ type: 'enum', enum: ['PASSED', 'FAILED'] })
  check_status: ComplianceCheckStatus;

  @Column({ type: 'integer' })
  rule_number: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

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
}

@Entity()
export class RtaCompliances {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['Project Trust Account', 'Retention Trust Account'],
  })
  bank_account_type: BankAccountType;

  @Column({ type: 'varchar' })
  display_message: string;

  @Column({ type: 'varchar', nullable: true })
  display_message_colour: string;

  @Column({
    type: 'enum',
    enum: [
      'ADD_BANK_ACCOUNT',
      'EDIT_PAYMENT',
      'VIEW_PAYMENT',
      'EDIT_BANK_ACCOUNT',
      'NONE',
      'SEND_NOTICE',
      'RECONCILE',
      'REVIEW_AUDIT',
      'VIEW_UNMATCHED_PAYMENTS',
      'SEND_SCHEDULE',
      'UPDATE_TRANSACTION_LIST',
      'TOPUP_ACCOUNT',
      'SEND_REMITTANCE',
      'WITHDRAW_BALANCE',
      'UPDATE_AND_MATCH',
      'PAY_NOW',
      'DELEGATE_NOW',
      'UPLOAD_CERTIFICATE',
      'VIEW_PAYMENTS'
    ],
    nullable: true,
  })
  action_button_type: ActionButtonType;

  @Column({ type: 'integer' })
  check_number: number;

  @Column({
    type: 'enum',
    enum: [
      'CHECK CONTRACT ELIGIBILITY',
      'OPEN RETENTION TRUST ACCOUNT',
      'NOTIFY PARTIES OF THE TRUST ACCOUNT',
      'ADMINISTRATION OF THE ACCOUNT',
      'WITHHOLDING RETENTION AMOUNTS FROM PAYMENT',
      'RELEASING RETENTION AMOUNTS TO CONTRACTED PARTIES',
      'RELEASING RETENTION AMOUNTS TO SOMEONE ELSE FROM THE ACCOUNT',
      'RELEASING RETENTION AMOUNTS TO YOURSELF AS TRUSTEE',
      'MONTHLY RECONCILIATIONS AND RECORDKEEPING',
      'ANNUAL ACCOUNT REVIEW REPORTS',
      'CLOSE THE ACCOUNT',
    ],
    nullable: true,
  })
  check_name: ComplianceChecksOfRTA;

  @Column({ type: 'enum', enum: ['PASSED', 'FAILED'] })
  check_status: ComplianceCheckStatus;

  @Column({ type: 'integer' })
  rule_number: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

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
}

@Entity()
export class ComplianceChecks {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  check_number: number;

  @Column({ type: 'varchar' })
  check_name: ComplianceChecksOfRTA | ComplianceChecksOfPTA;

  @Column({ type: 'integer' })
  rule_number: number;

  @Column({
    type: 'enum',
    enum: ['Project Trust Account', 'Retention Trust Account'],
    nullable: true,
  })
  bank_account_type: BankAccountType;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar' })
  content: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

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
}

@Entity()
export class ComplianceSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  admin_id: number;

  @Column({ type: 'decimal' })
  contract_value: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

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
}

@Entity()
export class ComplianceOfProjects {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: number;

  @Column({
    type: 'jsonb',
    default: [],
    nullable: true,
  })
  pta_compliances: {
    check_number: number;
    check_name: ComplianceChecksOfPTA;
    check_status: string; // PASSED or FAILED
    notify: boolean;
    mails: boolean;
  }[];

  @Column({
    type: 'jsonb',
    default: [],
    nullable: true,
  })
  rta_compliances: {
    check_number: number;
    check_name: ComplianceChecksOfRTA; 
    check_status: string; // PASSED or FAILED
    notify: boolean;
    mails: boolean;
  }[];
}
