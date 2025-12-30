import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlogResource } from './admin-blogs-resources.entity';
import { Group } from './user-details.entity';
export type commentStatus = 'Approved' | 'Rejected' | 'Deleted' | 'Pending';

@Entity()
export class BlogComments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  comment: string;

  @ManyToOne(() => BlogResource, (blogResource) => blogResource.comment, {
    nullable: true,
  })
  @JoinColumn({ name: 'blog_id' })
  blog: BlogResource;

  @Column({
    type: 'enum',
    enum: ['Approved', 'Rejected', 'Deleted', 'Pending'],
    default: 'Pending',
  })
  comment_status: commentStatus;

  @Column({ nullable: true })
  comment_by: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  posted_on: Date; //date when the comment is approved and posted

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
