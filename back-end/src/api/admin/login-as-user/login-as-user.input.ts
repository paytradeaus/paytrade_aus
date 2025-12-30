import { Field, InputType } from '@nestjs/graphql';

@InputType({
  description: 'Input type to allow an admin to login as a specific user',
})
export class AllowAdminToLoginAsUserInput {
  @Field({ description: 'Unique identifier of the user to login as' })
  user_id: number;

  @Field({ description: 'Password of the admin performing the login' })
  admin_password: string;
}
