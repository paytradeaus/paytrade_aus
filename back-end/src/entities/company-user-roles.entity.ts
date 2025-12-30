import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../api/auth/role-guard/role.enum';
import { Group, UserDetails } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
export type Status =
  | 'Active'
  | 'Inactive'
  | 'Blocked'
  | 'Archived'
  | 'Deleted'
  | 'Declined';
export type Permission = 'Yes' | 'No' | 'View Only';

@Entity()
export class CompanyUserRoles {
  @PrimaryColumn({ type: 'int' })
  user_id: number;

  @PrimaryColumn({ type: 'int' })
  company_id: number;

  @ManyToOne(() => UserDetails, (user) => user.companyRoles)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  userDetails: UserDetails;

  @ManyToOne(() => CompanyDetails, (company) => company.userRoles)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @Column({ type: 'varchar', length: 100, nullable: true })
  user_name: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STANDARD_USER,
  })
  company_role: Role;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Blocked', 'Archived', 'Deleted', 'Declined'],
    default: 'Inactive',
    nullable: true,
  })
  status: Status;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No', 'View Only'],
    nullable: true,
  })
  manage_project_trust_payment: Permission;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No', 'View Only'],
    nullable: true,
  })
  manage_user: Permission;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No', 'View Only'],
    nullable: true,
  })
  manage_company: Permission;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No', 'View Only'],
    nullable: true,
  })
  manage_subscription: Permission;

  @Column({ type: 'json', nullable: true })
  email_preferences: Record<string, any>;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  joined_on: Date;

  @Column({ default: false })
  is_system_added: Boolean;

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
}
