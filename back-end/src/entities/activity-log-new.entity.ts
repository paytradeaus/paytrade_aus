import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group, UserDetails } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { AdminDetails } from './admin-details.entity';
import { UserMode } from 'src/libs/@paytrade-types/paytrade-types';
import { ActivityLogTemplates } from './activity-log-templates.entity';

/** human = UI action, ai_delegate = action routed through an AI tool, system = background job. */
export type ActorMode = 'human' | 'ai_delegate' | 'system';

@Entity()
export class ActivityLogNew {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  event_template_id: number;

  @Column({ type: 'json', nullable: true })
  dynamic_values: Record<string, any>;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  event_date: Date;

  @Column({ type: 'int', nullable: true })
  from_user: number;

  @Column({ type: 'int', nullable: true })
  to_user: number;

  @Column({ type: 'enum', enum: ['Normal', 'Onboarding'], nullable: true })
  user_mode: UserMode;

  @Column({ type: 'int', nullable: true })
  company_id: number;

  @Column({ default: false })
  is_admin: Boolean;

  @Column({ type: 'int', nullable: true })
  admin_id: number;

  @Column({ type: 'text', nullable: true })
  logged_in_by: string;

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

  @Column({
    type: 'enum',
    enum: ['human', 'ai_delegate', 'system'],
    default: 'human',
    nullable: false,
  })
  actor_mode: ActorMode;

  @Column({ type: 'uuid', nullable: true })
  ai_run_id: string | null;

  @ManyToOne(() => UserDetails, (user) => user.activityLogNew)
  @JoinColumn({ name: 'from_user', referencedColumnName: 'user_id' })
  userDetails: UserDetails;

  @ManyToOne(() => CompanyDetails, (company) => company.activityLogNew)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @ManyToOne(() => ActivityLogTemplates, (template) => template.activityLog)
  @JoinColumn({ name: 'event_template_id', referencedColumnName: 'id' })
  logTemplates: ActivityLogTemplates;

  @ManyToOne(() => AdminDetails, (admin) => admin.activityLogNew)
  @JoinColumn({ name: 'admin_id', referencedColumnName: 'admin_id' })
  adminDetails: AdminDetails;
}
