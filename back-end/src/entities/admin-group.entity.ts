import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminDetails } from './admin-details.entity';
import { AdminGroupDetails } from './admin-group-details.entity';
import { Group } from './user-details.entity';

@Entity()
export class AdminGroup {
  @PrimaryColumn()
  admin_id: string;

  @PrimaryColumn()
  group_id: string;

  @ManyToOne(() => AdminDetails, (admin) => admin.adminDetailsGroup)
  @JoinColumn({ name: 'admin_id', referencedColumnName: 'id' })
  adminDetails: AdminDetails;

  @ManyToOne(() => AdminGroupDetails, (group) => group.adminDetailsGroup)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  adminGroupDetails: AdminGroupDetails;

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
