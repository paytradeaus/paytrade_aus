import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Group } from './user-details.entity';
  
  @Entity()
  export class AdminEmailVerificationDetails {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'integer', nullable: true })
    admin_id: number;
  
    @Column({ type: 'varchar', length: 100 })
    email_id: string;
  
    @Column({ type: 'char', length: 6 })
    verification_code: string;
  
    @Column({ type: 'timestamp with time zone' })
    code_expires_in: Date;
  
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
  