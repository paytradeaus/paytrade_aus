import { Field, InputType, Int } from '@nestjs/graphql';

@InputType({ description: 'Input for fetching the deterministic AI status snapshot.' })
export class GetAiStatusSnapshotInput {
  @Field(() => Int, { description: 'Company id (business profile) to scope the snapshot.' })
  company_id: number;

  @Field({
    nullable: true,
    description:
      'Optional: bypass the cache (e.g. after a known mutation). Defaults to false.',
  })
  force_refresh?: boolean;
}
