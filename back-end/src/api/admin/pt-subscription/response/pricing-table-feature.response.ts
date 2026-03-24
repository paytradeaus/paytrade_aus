import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class PricingTableFeatureType {
  @Field()
  id: string;

  @Field()
  feature_name: string;

  @Field(() => Int)
  display_order: number;

  @Field({ nullable: true })
  basic_value: string;

  @Field({ nullable: true })
  standard_value: string;

  @Field({ nullable: true })
  advanced_value: string;

  @Field({ nullable: true })
  pro_audit_value: string;

  @Field()
  status: string;
}

@ObjectType()
export class PricingTableFeatureListResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => [PricingTableFeatureType], { nullable: true })
  data: PricingTableFeatureType[];
}

@ObjectType()
export class PricingTableFeatureResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => PricingTableFeatureType, { nullable: true })
  data: PricingTableFeatureType;
}
