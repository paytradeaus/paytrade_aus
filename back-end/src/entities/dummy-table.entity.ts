import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class DummyTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500, default: 'currency_name' })
  currency_name: string;

  @Column({ type: 'varchar', length: 500, default: 'short_code' })
  short_code: string;

  @Column({ type: 'varchar', length: 500, default: 'symbol' })
  symbol: string;

  @Column({ type: 'varchar', length: 500, default: 'project_role' })
  project_role: string;

  @Column({ type: 'varchar', length: 500, default: 'client_supplier_type' })
  client_supplier_type: string;

  @Column({ type: 'varchar', length: 500, default: 'related_entity' })
  related_entity: string;

  @Column({ type: 'varchar', length: 500, default: 'client_supplier_role' })
  client_supplier_role: string;

  @Column({ type: 'varchar', length: 100, default: 'contract_type' })
  contract_type: string;

  @Column({ type: 'varchar', length: 500, default: 'validation' })
  validation: string;

  @Column({ type: 'varchar', length: 500, default: 'status' })
  status: string;

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
