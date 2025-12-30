import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
export type FinancialInstitutionStatus =
  | 'Active'
  | 'Inactive'
  | 'Blocked'
  | 'Archived';

@Entity()
export class FinancialInstitutionsDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  institution_name: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  institution_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  place: string;

  @Column({ type: 'text', nullable: true })
  place_id: string;

  @Column({ nullable: true, type: 'varchar', length: 200 })
  institution_address: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  country: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  region: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  latitude: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  longitude: string;

  @Column({ nullable: true })
  acc_number_maxlength: number;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Blocked', 'Archived'],
    default: 'Active',
  })
  institution_status: FinancialInstitutionStatus;

  @Column({ type: 'text', nullable: true })
  txn_csv_template_id: string;

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
