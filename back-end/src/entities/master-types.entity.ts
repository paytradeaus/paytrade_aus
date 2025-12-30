import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FAQ } from './admin-faq.entity';
import { BlogResource } from './admin-blogs-resources.entity';
import { Group } from './user-details.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';

export type categoryStatus = 'Active' | 'Inactive' ;
@Entity()
export class MasterTypes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  master_type: string;

  @Column({ type: 'varchar', length: 50 })
  value: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive'],
    default: 'Active'})
  status: categoryStatus;

  @OneToMany(() => FAQ, (faq) => faq.category, { nullable: true })
  faqs?: FAQ[];

  @OneToMany(() => BlogResource, (blog) => blog.category, { nullable: true })
  blog?: BlogResource[];

  @OneToMany(() => CmtyDiscussionsIdeas, (discussionIdea) => discussionIdea.category, { nullable: true })
  discussionIdea?: CmtyDiscussionsIdeas[];

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
