import { InputType, Field } from '@nestjs/graphql';
import {
  Eligibility,
  ProjectRole,
  ProjectStatus,
  RetentionType,
} from 'src/entities/project-details.entity';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description: 'Input type for updating details of an existing project.',
})
export class UpdateProjectInput {
  @Field({ description: 'Unique identifier of the project to be updated.' })
  id: string;

  @Field({ description: 'Updated description of the project.' })
  project_description: string;

  @Field({
    nullable: true,
    description: 'Updated site address of the project.',
  })
  site_address: string;

  @Field({
    nullable: true,
    description: 'Updated country of the project location.',
  })
  country: string;

  @Field({
    nullable: true,
    description: 'Updated state or region of the project address.',
  })
  region: string;

  @Field({
    nullable: true,
    description: 'Updated Place ID of the project location.',
  })
  place_id: string;

  @Field({
    nullable: true,
    description: 'Updated latitude of the project location.',
  })
  latitude: string;

  @Field({
    nullable: true,
    description: 'Updated longitude of the project location.',
  })
  longitude: string;

  @Field({ description: 'Updated head contract sum of the project.' })
  head_contract_sum: number;

  @Field({ description: 'Updated retention type for the project.' })
  retention_type: RetentionType;

  @Field({
    description: 'Updated number of units associated with the project.',
  })
  number_of_units: number;

  @Field({
    description:
      'Updated role of the project (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role: ProjectRole;

  @Field({
    nullable: true,
    description: 'Updated PTA eligibility for the project.',
  })
  pta_eligibility: Eligibility;

  @Field({
    nullable: true,
    description: 'Updated RTA eligibility for the project.',
  })
  rta_eligibility: Eligibility;

  @Field({
    description:
      'Updated status of the project (e.g., Active, Completed, Archived).',
  })
  project_status: ProjectStatus;

  @Field({
    nullable: true,
    description: 'User ID of the person performing the update.',
  })
  updated_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the project was updated.',
  })
  updated_on?: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the project is updated.',
  })
  updated_group?: Group;
}
