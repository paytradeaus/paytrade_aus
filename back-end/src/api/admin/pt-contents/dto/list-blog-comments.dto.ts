import { InputType, Field } from '@nestjs/graphql';
import { commentStatus } from 'src/entities/admin-blog-comments.entity';

@InputType({
  description:
    'Input for listing blog comments with optional filters and pagination',
})
export class ListBlogCommentsInput {
  @Field({ nullable: true, description: 'Filter comments by status' })
  status?: commentStatus;

  @Field({
    nullable: true,
    description: 'Filter comments for a specific blog by its ID',
  })
  blog?: string;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination',
  })
  page?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of comments per page',
  })
  perPage?: number;

  @Field({
    nullable: true,
    description: 'Type of date filter to apply, e.g., "This month, Last month"',
  })
  date_filter?: string;

  @Field({ nullable: true, description: 'Start date for date filtering' })
  start_date?: Date;

  @Field({ nullable: true, description: 'End date for date filtering' })
  end_date?: Date;
}
