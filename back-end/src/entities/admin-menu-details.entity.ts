import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AdminGroupMenuPriv } from './admin-group-menu-priv.entity';
import { Group } from './user-details.entity';
export type MenuStatus = 'Active' | 'Inactive' | 'Deleted';
export type MenuType = 'Admin' | 'User';

@Entity()
export class AdminMenuDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  menu_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  menu_description: string;

  @Column({ type: 'varchar', length: 100 })
  route_path: string;

  @Column({ type: 'json', array: true, nullable: true })
  sub_menus: JSON[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  menu_icon: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  parent_id: string;

  @Column()
  menu_order: number;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Deleted'],
    default: 'Active',
  })
  menu_status: MenuStatus;

  @Column({
    type: 'enum',
    enum: ['Admin', 'User'],
    default: 'Admin',
  })
  menu_type: MenuType;

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

  @OneToMany(() => AdminGroupMenuPriv, (menu) => menu.adminMenuDetails)
  groupMenuDetails: AdminGroupMenuPriv[];
}
