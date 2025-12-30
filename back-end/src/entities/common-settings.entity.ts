import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
import { Group } from './user-details.entity';
  
export type settingStatus = 'Active' | 'Inactive' ;

  @Entity()
  export class CommonSettings {

    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'varchar', length: 50, unique: true})
    setting_name: string;

    @Column({ type: 'varchar', length: 50,})
    setting_option: string;
  
    @Column({
      type: 'enum',
      enum: ['Active', 'Inactive'],
      default: 'Active'})
    status: settingStatus;
  
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
  