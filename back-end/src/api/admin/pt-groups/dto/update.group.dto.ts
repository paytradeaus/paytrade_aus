import { InputType, Field } from '@nestjs/graphql';
import { MenuPrivileges } from './add.group.dto';

export type GroupStatus = 'Active' | 'Inactive' | 'Deleted';

@InputType({
  description: 'Input type for updating an existing group and its permissions.',
})
export class UpdateGroupInput {
  @Field({
    nullable: true,
    description: 'Unique identifier of the group to be updated.',
  })
  id: string;

  @Field({ nullable: true, description: 'Updated name of the group.' })
  group_name: string;

  @Field({
    nullable: true,
    description: 'Updated description or details about the group.',
  })
  group_description: string;

  @Field({ nullable: true, description: 'Updated status of the group.' })
  group_status: GroupStatus;

  @Field(() => [MenuPrivileges], {
    nullable: true,
    description: 'Updated list of menu privileges for the group.',
  })
  menuPrivileges: MenuPrivileges[];
}
