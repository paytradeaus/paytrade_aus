import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({ description: 'A single deterministic status issue.' })
export class StatusIssueGql {
  @Field({ description: 'Stable id `<category>:<record_type>:<id>:<check>`.' })
  id: string;

  @Field({ description: 'Issue category.' })
  category: string;

  @Field({ description: 'critical | warning | info' })
  severity: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  affectedRecordType: string;

  @Field({ nullable: true })
  affectedRecordId?: string;

  @Field(() => Int, { nullable: true })
  projectId?: number;

  @Field()
  suggestedAction: string;

  @Field()
  agentCanHelp: boolean;

  @Field()
  requiresApproval: boolean;

  @Field()
  detectedAt: string;
}

@ObjectType({ description: 'Severity counters across the snapshot.' })
export class StatusSnapshotSummaryGql {
  @Field(() => Int) critical: number;
  @Field(() => Int) warning: number;
  @Field(() => Int) info: number;
  @Field(() => Int) total: number;
}

@ObjectType({ description: 'Per-category block of issues.' })
export class StatusSnapshotCategoryBlockGql {
  @Field()
  category: string;

  @Field(() => Int)
  totalFound: number;

  @Field(() => [StatusIssueGql])
  issues: StatusIssueGql[];

  @Field()
  truncated: boolean;
}

@ObjectType({ description: 'Deterministic AI status snapshot for a company.' })
export class StatusSnapshotGql {
  @Field(() => Int)
  companyId: number;

  @Field()
  generatedAt: string;

  @Field(() => StatusSnapshotSummaryGql)
  summary: StatusSnapshotSummaryGql;

  @Field(() => [StatusSnapshotCategoryBlockGql])
  categories: StatusSnapshotCategoryBlockGql[];

  @Field(() => [StatusIssueGql])
  topIssues: StatusIssueGql[];
}

@ObjectType({ description: 'GraphQL response wrapper for the AI status snapshot.' })
export class GetAiStatusSnapshotResponse {
  @Field()
  status: ApiStatusType;

  @Field({ nullable: true })
  message?: string;

  @Field(() => StatusSnapshotGql, { nullable: true })
  data?: StatusSnapshotGql;
}
