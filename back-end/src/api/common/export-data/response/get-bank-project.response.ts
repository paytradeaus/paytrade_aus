import { Field, ObjectType } from '@nestjs/graphql';
import { StringResponse } from 'src/api/users/signup/response/auth.response';

@ObjectType({
  description: 'Basic project information linked to a bank account',
})
class BankProjectDetail {
  @Field({
    description: 'Unique identifier of the project',
  })
  project_id: number;

  @Field({
    description: 'Name of the project',
  })
  project_name: string;

  @Field({
    nullable: true,
    description: 'Optional description of the project',
  })
  project_description: string;
}

@ObjectType({ description: 'Response containing bank-related project details' })
export class GetBankProjectResponse extends StringResponse {
  @Field(() => [BankProjectDetail], {
    nullable: true,
    description: 'List of projects associated with the bank account',
  })
  data: BankProjectDetail[];
}
