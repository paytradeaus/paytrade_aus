import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MasterTypes } from './master-types.entity';
import { Group } from './user-details.entity';

export type FaqStatus = 'Active' | 'Inactive' | 'Deleted';

@Entity()
export class FAQ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ nullable: true, default: false })
  show_in_home: Boolean;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Deleted'],
    default: 'Active',
  })
  faq_status: FaqStatus;

  @ManyToOne(() => MasterTypes, (masterType) => masterType.faqs, {
    nullable: true,
  })
  category: MasterTypes;

  @Column({ type: 'int', nullable: true }) // Global order
  globalOrder: number;

  @Column({ type: 'int', nullable: true }) // Category-specific order
  categoryOrder: number;

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
