import { ObjectType, Field } from '@nestjs/graphql';
import {
  Eligibility,
  ProjectRole,
  ProjectStatus,
  RetentionType,
} from 'src/entities/project-details.entity';
import { ComplianceStatus } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Detailed information about a single project.' })
export class ViewProjectRes {
  @Field({
    nullable: true,
    description: 'Unique identifier of the project record in the database.',
  })
  id: string;

  @Field({
    nullable: true,
    description: 'Numeric project ID assigned by the system.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Business ID associated with this project.',
  })
  company_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name: string;

  @Field({
    nullable: true,
    description:
      'Role of the project (e.g., Principal, Head Contractor, Sub Contractor).',
  })
  project_role: ProjectRole;

  @Field({
    nullable: true,
    description: 'Official start or reference date of the project.',
  })
  project_date: Date;

  @Field({ nullable: true, description: 'Description of the project.' })
  project_description: string;

  @Field({ nullable: true, description: 'Address of the project site.' })
  site_address: string;

  @Field({
    nullable: true,
    description: 'Country where the project is located.',
  })
  country: string;

  @Field({ nullable: true, description: 'State or region of the project.' })
  region: string;

  @Field({
    nullable: true,
    description:
      'Place ID corresponding to the location, e.g., from Google Places API.',
  })
  place_id: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the project site.',
  })
  latitude: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the project site.',
  })
  longitude: string;

  @Field({
    nullable: true,
    description: 'Head contract sum in numeric format.',
  })
  head_contract_sum: number;

  @Field({
    nullable: true,
    description:
      'Formatted head contract sum for display (e.g., with currency symbols).',
  })
  formatted_head_contract_sum: string;

  @Field({
    nullable: true,
    description: 'Type of retention (e.g., Cash, Bank guaranteed, None).',
  })
  retention_type: RetentionType;

  @Field({ nullable: true, description: 'Number of units in the project.' })
  number_of_units: number;

  @Field({
    nullable: true,
    description: 'PTA eligibility status for the project.',
  })
  pta_eligibility: Eligibility;

  @Field({
    nullable: true,
    description: 'RTA eligibility status for the project.',
  })
  rta_eligibility: Eligibility;

  @Field({
    nullable: true,
    description:
      'Current status of the project (e.g., Draft, In Progress, Completed, Deleted).',
  })
  project_status: ProjectStatus;

  @Field({
    nullable: true,
    description: 'Number of contracts linked to the project.',
  })
  contract_count: number;

  @Field({ nullable: true, description: 'Compliance status for PTA.' })
  pta_compliance: ComplianceStatus;

  @Field({ nullable: true, description: 'Compliance status for RTA.' })
  rta_compliance: ComplianceStatus;

  @Field({
    nullable: true,
    description: 'Overall compliance status of the project.',
  })
  compliance: ComplianceStatus;
}

@ObjectType({
  description: 'Standard API response wrapper for fetching a single project.',
})
export class ViewProjectResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS, ERROR).' })
  status: string;

  @Field({ description: 'Message describing the outcome of the API call.' })
  message: string;

  @Field({
    nullable: true,
    description:
      'Data object containing detailed information about the project.',
  })
  data?: ViewProjectRes;
}
