import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';

@Entity()
export class UiStatusAndActionButtons {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  claim_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_type: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  current_status: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  status_in_ui: string;

  @Column({ type: 'json', nullable: true })
  claim_list_buttons: JSON;

  @Column({ type: 'json', nullable: true })
  claim_overview_buttons: JSON;

  @Column({ type: 'json', nullable: true })
  payment_list_buttons: JSON;

  @Column({ type: 'json', nullable: true })
  payment_overview_buttons: JSON;

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
