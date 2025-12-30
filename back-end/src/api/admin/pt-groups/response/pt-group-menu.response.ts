import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GroupStatus } from '../../../../entities/admin-group-details.entity';

@ObjectType({
  description: 'Details of a PT group along with its menu privileges.',
})
export class PTGroupMenu {
  @Field({ description: 'Unique identifier for the group.' })
  id: string;

  @Field({ description: 'Name of the group.' })
  group_name: string;

  @Field({ nullable: true, description: 'Description of the group.' })
  group_description: string;

  @Field({ description: 'Status of the group.' })
  group_status: GroupStatus;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the group was created.',
  })
  created_on: Date;

  @Field(() => [MenuPrivilegesResponse], {
    nullable: true,
    description: 'List of menu privileges associated with the group.',
  })
  menuPrivileges: MenuPrivilegesResponse[];
}

@ObjectType('MenuPrivilegesResponse', {
  description: 'Details of the permissions a group has for a specific menu.',
})
export class MenuPrivilegesResponse {
  @Field({ description: 'Identifier of the menu.' })
  menuId: string;

  @Field({ description: 'Name of the menu.' })
  menuName: string;

  @Field({
    description: 'Whether the group has all permissions for this menu.',
  })
  allPermission: boolean;

  @Field({
    description: 'Whether the group has list permission for this menu.',
  })
  listPermission: boolean;

  @Field({
    description: 'Whether the group has insert permission for this menu.',
  })
  insertPermission: boolean;

  @Field({
    description: 'Whether the group has update permission for this menu.',
  })
  updatePermission: boolean;

  @Field({
    description: 'Whether the group has delete permission for this menu.',
  })
  deletePermission: boolean;

  @Field({
    description: 'Whether the group has export permission for this menu.',
  })
  exportPermission: boolean;

  @Field({
    description: 'Whether the group has print permission for this menu.',
  })
  printPermission: boolean;

  @Field({
    description: 'Whether the group has view permission for this menu.',
  })
  viewPermission: boolean;
}

@ObjectType({
  description:
    'Response for fetching details of a PT group and its menu privileges.',
})
export class PTGroupMenuResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the PT group and its menu privileges.',
  })
  data?: PTGroupMenu;
}
