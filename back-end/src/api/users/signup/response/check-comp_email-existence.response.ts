import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description:
    'Represents the result of checking whether a user or business email already exists.',
})
export class CheckCompanyEmailExistenceRes {
  @Field({
    nullable: true,
    description: 'User email address if it already exists in the system.',
  })
  email_id: string;

  @Field({
    nullable: true,
    description: 'Company email address if it already exists in the system.',
  })
  company_email_id: string;
}

@ObjectType({
  description:
    'Response returned after validating the existence of user or business email.',
})
export class CheckCompanyEmailExistenceResponse {
  @Field({
    description: 'Indicates whether the email existence check was successful.',
  })
  status: string;

  @Field({
    description: 'Message describing the result of the email existence check.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Email existence details for user or business.',
  })
  data?: CheckCompanyEmailExistenceRes;
}
