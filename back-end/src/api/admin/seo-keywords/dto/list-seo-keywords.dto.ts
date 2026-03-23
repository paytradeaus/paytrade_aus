import { Field, InputType, Int } from '@nestjs/graphql';
import { SortingOrder } from '../../pt-admin/dto/add-admin.dto';

@InputType()
export class ListSeoKeywordsInput {
  @Field(() => Int, { nullable: true, description: 'Page number' })
  page?: number;

  @Field(() => Int, { nullable: true, description: 'Items per page' })
  perPage?: number;

  @Field({ nullable: true, description: 'Search keyword' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by status: Active or Inactive' })
  status?: string;

  @Field({ nullable: true, description: 'Sort field' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sort order: ASC or DESC' })
  sorting_order?: SortingOrder;
}
