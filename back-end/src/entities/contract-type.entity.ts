import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectRole } from './project-details.entity';
import {
  ClientSupplierType,
  RelatedEntity,
} from './client-suppliers-details.entity';
import { ClientSupplierRole } from './contract-details.entity';
import { Group } from './user-details.entity';

@Entity()
export class ContractType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['Principal', 'Head Contractor', 'Sub Contractor'],
  })
  project_role: ProjectRole;

  @Column({
    type: 'enum',
    enum: ['Client', 'Supplier'],
  })
  client_supplier_type: ClientSupplierType;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  related_entity: RelatedEntity;

  @Column({
    type: 'enum',
    enum: [
      'Principal',
      'Head Contractor',
      'Related Entity Sub Contractor',
      'Sub Contractor',
      'Sub sub contractor',
    ],
  })
  client_supplier_role: ClientSupplierRole;

  @Column({ type: 'varchar', length: 100 })
  contract_type: string;

  @Column({ type: 'varchar', length: 500 })
  validation: string;

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
