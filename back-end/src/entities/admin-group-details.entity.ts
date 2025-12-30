import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  AfterInsert,
  Timestamp,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AdminGroup } from './admin-group.entity';
import { AdminGroupMenuPriv } from './admin-group-menu-priv.entity';
import { Group } from './user-details.entity';

export type GroupStatus = 'Active' | 'Inactive' | 'Deleted';

@Entity()
export class AdminGroupDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  group_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  group_description: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Deleted'],
    default: 'Active',
  })
  group_status: GroupStatus;

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

  @OneToMany(() => AdminGroup, (admin) => admin.adminGroupDetails)
  adminDetailsGroup: AdminGroup[];

  @OneToMany(() => AdminGroupMenuPriv, (group) => group.adminGroupDetails)
  groupMenuDetails: AdminGroupMenuPriv[];
}
