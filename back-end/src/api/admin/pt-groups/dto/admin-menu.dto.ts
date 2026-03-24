import { InputType, Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class SubMenuInput {
  @Field()
  name: string;

  @Field()
  route: string;

  @Field({ defaultValue: '' })
  icon: string;
}

@InputType()
export class AddAdminMenuInput {
  @Field()
  menu_name: string;

  @Field()
  route_path: string;

  @Field()
  menu_order: number;

  @Field({ nullable: true, defaultValue: '' })
  menu_icon: string;

  @Field({ nullable: true, defaultValue: '' })
  menu_description: string;

  @Field(() => [SubMenuInput], { nullable: true })
  sub_menus: SubMenuInput[];

  @Field({ nullable: true, defaultValue: 'Active' })
  menu_status: string;
}

@InputType()
export class UpdateAdminMenuInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  menu_name: string;

  @Field({ nullable: true })
  route_path: string;

  @Field({ nullable: true })
  menu_order: number;

  @Field({ nullable: true })
  menu_icon: string;

  @Field({ nullable: true })
  menu_description: string;

  @Field(() => [SubMenuInput], { nullable: true })
  sub_menus: SubMenuInput[];

  @Field({ nullable: true })
  menu_status: string;
}

@InputType()
export class BulkUpdateAdminMenuInput {
  @Field(() => [UpdateAdminMenuInput])
  menus: UpdateAdminMenuInput[];
}
