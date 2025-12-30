import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
import { Group } from './user-details.entity';
  
export type currencyStatus = 'Active' | 'Inactive' ;

  @Entity()
  export class CurrencyMaster {

    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'varchar', length: 50, unique: true})
    currency_name: string;
  
    @Column({ type: 'varchar', length: 50 })
    short_code: string;

    @Column({ type: 'varchar', length: 5 })
    symbol: string;
  
    @Column({
      type: 'enum',
      enum: ['Active', 'Inactive'],
      default: 'Active'})
    status: currencyStatus;
  
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
  