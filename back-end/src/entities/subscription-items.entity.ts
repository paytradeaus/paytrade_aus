import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  AfterInsert,
} from 'typeorm';
import { Group } from './user-details.entity';

export type itemStatus = 'Active' | 'Inactive' | 'Archived' | 'Deleted';

export type LimitType = 'Checkbox' | 'Numeric' | 'Dropdown';

export type UnitType =
  | 'No unit'
  | 'Second'
  | 'Minute'
  | 'Hour'
  | 'Day'
  | 'Month'
  | 'Year';

@Entity()
export class SubscriptionItems {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  subscription_item_id: number;

  @Column({ unique: true })
  item_name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Archived', 'Deleted'],
    default: 'Active',
    nullable: true,
  })
  item_status: itemStatus;

  @Column({
    type: 'enum',
    enum: ['Checkbox', 'Numeric', 'Dropdown'],
    default: 'Checkbox',
  })
  limit_type: LimitType;

  @Column({ type: 'json', nullable: true })
  dropdown_type: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['No unit', 'Second', 'Minute', 'Hour', 'Day', 'Month', 'Year'],
    nullable: true,
  })
  unit_type: UnitType;

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

  @AfterInsert()
  updateSubItemId() {
    console.log(this.subscription_item_id);
  }
}
