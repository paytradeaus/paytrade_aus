import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FeatureStatus = 'Active' | 'Inactive';

@Entity()
export class PricingTableFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  feature_name: string;

  @Column({ type: 'integer', default: 0 })
  display_order: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  basic_value: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  standard_value: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  advanced_value: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pro_audit_value: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive'],
    default: 'Active',
  })
  status: FeatureStatus;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
