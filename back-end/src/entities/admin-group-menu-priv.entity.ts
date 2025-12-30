import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminGroupDetails } from './admin-group-details.entity';
import { AdminMenuDetails } from './admin-menu-details.entity';
import { Group } from './user-details.entity';

@Entity()
export class AdminGroupMenuPriv {
  @PrimaryColumn()
  group_id: string;

  @PrimaryColumn()
  menu_id: string;

  @Column({ type: 'boolean', default: false })
  all_permission: boolean;

  @Column({ type: 'boolean', default: false })
  list_permission: boolean;

  @Column({ type: 'boolean', default: false })
  insert_permission: boolean;

  @Column({ type: 'boolean', default: false })
  update_permission: boolean;

  @Column({ type: 'boolean', default: false })
  delete_permission: boolean;

  @Column({ type: 'boolean', default: false })
  export_permission: boolean;

  @Column({ type: 'boolean', default: false })
  print_permission: boolean;

  @Column({ type: 'boolean', default: false })
  view_permission: boolean;

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

  @ManyToOne(() => AdminGroupDetails, (group) => group.groupMenuDetails)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  adminGroupDetails: AdminGroupDetails;

  @ManyToOne(() => AdminMenuDetails, (menu) => menu.groupMenuDetails)
  @JoinColumn({ name: 'menu_id', referencedColumnName: 'id' })
  adminMenuDetails: AdminMenuDetails;
}
