import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Generated,
} from 'typeorm';
import { Group } from './user-details.entity';
import { JournalEntries } from './journal-entries.entity';

@Entity()
export class JournalType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  @Generated('increment')
  process_id: number;

  @Column({ type: 'int' })
  process_type: number;

  @Column({ type: 'varchar', length: 150 })
  process_name: string;

  @Column({ type: 'varchar', length: 500 })
  process_description: string;

  @Column({ type: 'int' })
  number_of_entries: number;

  @Column({ type: 'varchar', array: true })
  dynamic_values: string[];

  @Column()
  is_same_activity_id: Boolean;

  @Column({ type: 'varchar' })
  journal_suffix: string;

  @Column({ type: 'varchar' })
  activity_suffix: string;

  @Column()
  is_debited: Boolean;

  @Column({ type: 'varchar' })
  beneficiary_type: string;

  @Column({ type: 'varchar', nullable: true }) //remove null
  beneficiary_account: string;

  @Column({ type: 'varchar' })
  amount_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  date_type: string;

  @Column({ type: 'varchar', length: 50 })
  entry_type: string;

  @Column({ default: false })
  reverse_order: Boolean;

  @Column({ type: 'int', array: true, nullable: true })
  reverse_values: number[];

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

  @OneToMany(() => JournalEntries, (journal) => journal.journalType)
  journalEntries: JournalEntries[];
}
