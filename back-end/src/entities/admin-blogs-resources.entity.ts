import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MasterTypes } from './master-types.entity';
import { BlogComments } from './admin-blog-comments.entity';
import { FileAttachments } from './file-attachments.entity';
import { AdminDetails } from './admin-details.entity';
import { Group } from './user-details.entity';
export type contentType = 'Resource' | 'Blog' | 'howToGuide';
export type resourceType = 'NA' | 'Text' | 'Visual' ;
export type blogStatus = 'Draft' | 'Published' | 'Unpublished' | 'Deleted';

@Entity()
export class BlogResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: ['Resource', 'Blog', 'howToGuide'],
    default: 'Resource',
  })
  content_type: contentType;

  @Column({ type: 'varchar', nullable: true })
  video_link: string;

  @Column({ default: true, nullable: true })
  enable_comments: boolean;

  @Column({ type: 'varchar', nullable: true })
  urlSlug: string;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({
    type: 'enum',
    enum: ['Draft', 'Published', 'Unpublished', 'Deleted'],
    default: 'Draft',
  })
  blog_status: blogStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  published_on: Date;

  @ManyToOne(() => AdminDetails, (admin) => admin.blogs)
  @JoinColumn({ name: 'author_id' })
  author: AdminDetails;

  @ManyToOne(() => MasterTypes, (masterType) => masterType.blog, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: MasterTypes;

  @OneToMany(() => BlogComments, (comments) => comments.blog, {
    nullable: true,
  })
  comment?: BlogComments[];

  @OneToOne(() => FileAttachments, (banner) => banner.blogBanner, {
    nullable: true,
  })
  @JoinColumn({ name: 'bannerImage' })
  banner?: FileAttachments;

  @OneToOne(() => FileAttachments, (banner) => banner.resources, {
    nullable: true,
  })
  @JoinColumn({ name: 'attachment' })
  attachment?: FileAttachments;

  // @Column({ type: 'simple-array', nullable: true })
  // attachment_ids: string[];

  // @ManyToMany(() => FileAttachments, {
  //   nullable: true,
  // })
  // // @JoinColumn([{ name: 'attachment_ids', referencedColumnName: 'id' }])
  // @JoinTable()
  // attachments?: FileAttachments[];

  @Column({ type: 'boolean', default: false })
  featured: boolean;

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
