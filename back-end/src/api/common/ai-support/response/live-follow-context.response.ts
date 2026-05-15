import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecordAiLiveFollowContextResponse {
  @Field({ description: 'SUCCESS, IGNORED (flag off / not eligible), or ERROR.' })
  status: string;

  @Field({ nullable: true, description: 'Optional human-readable message.' })
  message?: string;

  @Field({ nullable: true, description: 'Echo of the route we recorded (when status=SUCCESS).' })
  recordedRoute?: string;
}
