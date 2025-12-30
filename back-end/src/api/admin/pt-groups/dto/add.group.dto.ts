import { InputType, Field, InputTypeOptions } from '@nestjs/graphql';
import { GroupStatus } from './update.group.dto';

@InputType({
  description: 'Input type for adding a new group with associated permissions.',
})
export class AddGroupInput {
  @Field({ description: 'Name of the group.' })
  group_name: string;

  @Field({
    nullable: true,
    description: 'Description or details about the group.',
  })
  group_description: string;

  @Field({ nullable: true, description: 'Current status of the group.' })
  group_status: GroupStatus;

  @Field(() => [MenuPrivileges], {
    nullable: true,
    description: 'List of menu privileges assigned to the group.',
  })
  menuPrivileges: MenuPrivileges[];
}

@InputType('MenuPrivileges', {} as InputTypeOptions)
export class MenuPrivileges {
  @Field({ description: 'Unique identifier of the menu.' })
  menuId: string;

  @Field({
    description: 'Indicates if the user has all permissions for this menu.',
  })
  allPermission: boolean;

  @Field({
    nullable: true,
    description: 'Permission to view the list of items.',
  })
  listPermission: boolean;

  @Field({ nullable: true, description: 'Permission to insert/add new items.' })
  insertPermission: boolean;

  @Field({ nullable: true, description: 'Permission to update/edit items.' })
  updatePermission: boolean;

  @Field({ nullable: true, description: 'Permission to delete items.' })
  deletePermission: boolean;

  @Field({ nullable: true, description: 'Permission to export items.' })
  exportPermission: boolean;

  @Field({ nullable: true, description: 'Permission to print items.' })
  printPermission: boolean;

  @Field({ nullable: true, description: 'Permission to view menu details.' })
  viewPermission: boolean;
}
