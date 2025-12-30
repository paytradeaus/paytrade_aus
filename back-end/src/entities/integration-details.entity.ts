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
  OneToOne,
  Generated,
  AfterInsert,
} from 'typeorm';
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import {
  Integrations,
  IntegrationStatus,
  ProviderTpe,
} from 'src/libs/@paytrade-types/paytrade-types';

@Entity()
export class IntegrationDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  integration_id: number;

  @Column({ type: 'integer' })
  company_id: number;

  @Column({
    type: 'enum',
    enum: ['Xero', 'Adatree'],
  })
  integration_name: Integrations;

  @Column({
    type: 'enum',
    enum: ['Accounting', 'Open banking', 'ERP'],
  })
  integration_type: ProviderTpe;

  @Column({
    type: 'enum',
    enum: [
      'Inactive',
      'Disconnected',
      'Deleted - archived',
      'Connected - paused',
      'Connected - active',
      'Connected - pending settings/mapping',
      'Pending contact mapping',
      'Pending bank account mapping',
      'Pending invoice mapping',
      'Pending bill mapping',
      'Pending payment mapping',
      'Awaiting project id tracking setup',
      'Pending project tracking id check',
      'Pending project tracking id mapping',
      'Awaiting contract id tracking setup',
      'Pending contract tracking id check',
      'Skip contract mapping',
      'Pending contract tracking id mapping',
      'Activation in Progress',
      'Pending',
    ],
  })
  integration_status: IntegrationStatus;

  @Column({
    type: 'enum',
    enum: [
      'Inactive',
      'Disconnected',
      'Deleted - archived',
      'Connected - paused',
      'Connected - active',
      'Connected - pending settings/mapping',
      'Pending contact mapping',
      'Pending bank account mapping',
      'Pending invoice mapping',
      'Pending bill mapping',
      'Pending payment mapping',
      'Awaiting project id tracking setup',
      'Pending project tracking id check',
      'Pending project tracking id mapping',
      'Awaiting contract id tracking setup',
      'Pending contract tracking id check',
      'Skip contract mapping',
      'Pending contract tracking id mapping',
      'Activation in Progress',
      'Pending',
    ],
    nullable: true,
  })
  previous_status: IntegrationStatus;

  @Column({ type: 'date' })
  integration_date: Date;

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

  @OneToOne(() => XeroIntegrationDetails, (xero) => xero.integrationDetails)
  xeroIntegration: XeroIntegrationDetails;

  @ManyToOne(() => CompanyDetails, (company) => company.integrationDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @AfterInsert()
  updateIntegrationId() {
    console.log(this.integration_id);
  }
}
