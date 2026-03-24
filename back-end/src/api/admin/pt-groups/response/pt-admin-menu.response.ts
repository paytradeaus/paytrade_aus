import { ObjectType, Field, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class AdminMenuSubMenu {
  @Field({ nullable: true })
  name: string;

  @Field({ nullable: true })
  route: string;

  @Field({ nullable: true })
  icon: string;
}

@ObjectType()
export class AdminMenuDetail {
  @Field()
  id: string;

  @Field()
  menu_name: string;

  @Field({ nullable: true })
  menu_description: string;

  @Field()
  route_path: string;

  @Field(() => Int)
  menu_order: number;

  @Field({ nullable: true })
  menu_icon: string;

  @Field({ nullable: true })
  menu_status: string;

  @Field(() => [AdminMenuSubMenu], { nullable: true })
  sub_menus: AdminMenuSubMenu[];
}

@ObjectType()
export class AdminMenuDetailResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => AdminMenuDetail, { nullable: true })
  data?: AdminMenuDetail;
}

@ObjectType()
export class AdminMenuDetailListResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => [AdminMenuDetail], { nullable: true })
  data?: AdminMenuDetail[];
}
