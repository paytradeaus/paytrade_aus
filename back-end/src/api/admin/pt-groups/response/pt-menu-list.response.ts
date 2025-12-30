import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a menu item with basic details.' })
export class MenuList {
  @Field({ description: 'Unique identifier of the menu.' })
  id: string;

  @Field({ description: 'Name of the menu.' })
  menu_name: string;

  @Field({ description: 'Description of the menu.' })
  menu_description: string;
}

@ObjectType({ description: 'Response object for a list of menus.' })
export class MenuListResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field(() => [MenuList], {
    nullable: true,
    description: 'Array of menu items.',
  })
  data?: MenuList[];
}
