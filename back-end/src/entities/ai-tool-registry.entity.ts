import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AiToolRiskLevel = 'read' | 'low' | 'medium' | 'high' | 'critical';

@Entity({ name: 'ai_tool_registry' })
export class AiToolRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('UQ_ai_tool_registry_name', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  category: string | null;

  @Column({ type: 'jsonb', nullable: true })
  input_schema: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  output_schema: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ['read', 'low', 'medium', 'high', 'critical'],
    default: 'read',
  })
  risk_level: AiToolRiskLevel;

  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  @Column({ type: 'jsonb', nullable: true })
  required_permissions: string[] | null;

  @Column({ type: 'boolean', default: true })
  reversible: boolean;

  @Column({ type: 'text', nullable: true })
  revert_strategy: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

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
