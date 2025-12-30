import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a sub-menu item in the side menu.' })
export class SubMenu {
  @Field({ nullable: true, description: 'Icon associated with the sub-menu.' })
  icon: string;

  @Field({ nullable: true, description: 'Name of the sub-menu.' })
  name: string;

  @Field({
    nullable: true,
    description: 'Route path for the sub-menu navigation.',
  })
  route: string;
}

@ObjectType({
  description:
    'Represents a side menu item with permissions and optional sub-menus.',
})
export class SideMenu {
  @Field({ description: 'Unique identifier of the side menu item.' })
  id: string;

  @Field({ description: 'ID of the admin the menu is associated with.' })
  admin_id: number;

  @Field({ description: 'ID of the group the menu belongs to.' })
  group_id: string;

  @Field({ description: 'Name of the group the menu belongs to.' })
  group_name: string;

  @Field({ description: 'ID of the menu item.' })
  menu_id: string;

  @Field({ description: 'Name of the menu item.' })
  menu_name: string;

  @Field({ nullable: true, description: 'Description of the menu item.' })
  menu_description: string;

  @Field({ description: 'Route path of the menu item.' })
  route_path: string;

  @Field({ description: 'Icon of the menu item.' })
  menu_icon: string;

  @Field({
    nullable: true,
    description: 'Parent menu ID if this menu is a sub-menu, otherwise null.',
  })
  parent_id: string | null;

  @Field({ description: 'Order of the menu in the side menu list.' })
  menu_order: number;

  @Field({ description: 'Status of the menu item (e.g., active/inactive).' })
  menu_status: string;

  @Field({ description: 'Type of the menu.' })
  menu_type: string;

  @Field(() => [SubMenu], {
    nullable: true,
    description: 'List of sub-menus under this menu item.',
  })
  sub_menus: SubMenu[];

  @Field({
    description: 'Indicates if all permissions are granted for this menu item.',
  })
  all_permission: boolean;

  @Field({
    description:
      'Indicates if the list permission is granted for this menu item.',
  })
  list_permission: boolean;

  @Field({
    description:
      'Indicates if the insert permission is granted for this menu item.',
  })
  insert_permission: boolean;

  @Field({
    description:
      'Indicates if the update permission is granted for this menu item.',
  })
  update_permission: boolean;

  @Field({
    description:
      'Indicates if the delete permission is granted for this menu item.',
  })
  delete_permission: boolean;

  @Field({
    description:
      'Indicates if the export permission is granted for this menu item.',
  })
  export_permission: boolean;

  @Field({
    description:
      'Indicates if the print permission is granted for this menu item.',
  })
  print_permission: boolean;

  @Field({
    description:
      'Indicates if the view permission is granted for this menu item.',
  })
  view_permission: boolean;
}

@ObjectType({ description: 'Response containing a list of side menu items.' })
export class SideMenuResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field(() => [SideMenu], {
    nullable: true,
    description: 'Array of side menu items.',
  })
  data: SideMenu[];
}
