import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';

export type status = 'Received' | 'Contacted' | 'Closed';

@Entity()
export class ContactSubmissions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'company_name', type: 'varchar', nullable: true })
  companyName: string;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'message', type: 'varchar' })
  message: string;

  @Column({
    type: 'enum',
    enum: ['Received', 'Contacted', 'Closed'],
    default: 'Received',
  })
  status: status;

  @Column({ name: 'is_viewed', type: 'boolean', default: false })
  isViewed: boolean;

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
