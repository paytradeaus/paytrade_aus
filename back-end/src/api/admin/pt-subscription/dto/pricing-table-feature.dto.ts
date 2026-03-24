import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class AddPricingTableFeatureInput {
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
}

@InputType()
export class UpdatePricingTableFeatureInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  feature_name: string;

  @Field(() => Int, { nullable: true })
  display_order: number;

  @Field({ nullable: true })
  basic_value: string;

  @Field({ nullable: true })
  standard_value: string;

  @Field({ nullable: true })
  advanced_value: string;

  @Field({ nullable: true })
  pro_audit_value: string;

  @Field({ nullable: true })
  status: string;
}

@InputType()
export class BulkUpdatePricingTableFeaturesInput {
  @Field(() => [UpdatePricingTableFeatureInput])
  features: UpdatePricingTableFeatureInput[];
}
