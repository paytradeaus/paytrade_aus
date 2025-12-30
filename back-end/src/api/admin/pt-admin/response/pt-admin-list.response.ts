import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PTAdmins } from './pt-admin.response';

@ObjectType({ description: 'Paginated list of Project Trade Admin users' })
export class PTAdminList {
  @Field(() => [PTAdmins], { description: 'List of Project Trade Admin users' })
  admins: PTAdmins[];

  @Field(() => Int, {
    description: 'Total number of Project Trade Admin users available',
  })
  totalCount: number;
}

@ObjectType({
  description: 'Response wrapper for the Project Trade Admin list API',
})
export class PTAdminListResponse {
  @Field({ description: 'Status of the API response' })
  status: string;

  @Field({ description: 'Message describing the response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Paginated list of Project Trade Admin users',
  })
  data?: PTAdminList;
}
