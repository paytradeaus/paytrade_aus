import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../api/auth/role-guard/role.enum';
import { CompanyDetails } from './company-details.entity';
import { Group, UserDetails } from './user-details.entity';
export type UserAction = 'Accept' | 'Decline';
export type Permission = 'Yes' | 'No' | 'View Only';

@Entity()
export class Invitations {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  company_id: number;

  @ManyToOne(() => CompanyDetails, (company) => company.invitations)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @Column({ type: 'varchar', length: 100 })
  user_name: string;

  @Column({ type: 'varchar', length: 100 })
  email_id: string;

  @Column({
    type: 'enum',
    enum: ['Accept', 'Decline'],
    nullable: true,
  })
  user_action: UserAction;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STANDARD_USER,
    nullable: true,
  })
  company_role: Role;

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

  @Column({ nullable: true })
  is_user_exists: Boolean;

  @Column({ type: 'integer', default: 0, nullable: true })
  requested_count: number;

  @Column({ type: 'integer', default: 0, nullable: true })
  decline_count: number;

  @Column({ nullable: true })
  is_admin_requested: Boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requested_by: string;

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

  @Column({ type: 'integer', nullable: true })
  user_id: number;

  @ManyToOne(() => UserDetails, (user) => user.invitations)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  userDetails: UserDetails;
}
