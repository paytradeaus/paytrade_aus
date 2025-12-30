import { ObjectType, Field } from '@nestjs/graphql';
import { PTCompany } from './pt-company.response';

@ObjectType({
  description: 'Represents a list of PT companies with total count',
})
export class PTCompanyList {
  @Field(() => [PTCompany], {
    nullable: true,
    description: 'Array of PT company objects',
  })
  companies: PTCompany[];

  @Field({ description: 'Total number of PT companies' })
  totalCount: number;
}

@ObjectType({ description: 'Response type for fetching PT company list' })
export class PTCompanyListResponse {
  @Field({ description: 'Status of the response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({ description: 'Message describing the response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of PT companies and total count',
  })
  data?: PTCompanyList;
}
