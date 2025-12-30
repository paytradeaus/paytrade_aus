import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { EntityType } from 'src/entities/company-details.entity';
import { Permission, Status } from 'src/entities/company-user-roles.entity';

@ObjectType({
  description: `Represents a user's association with a business, including role, permissions, and business details with logo.`,
})
export class CompanyWithLogoRes {
  @Field({ description: 'Unique identifier of the user.' })
  user_id: number;

  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Role of the user within the business.' })
  company_role: Role;

  @Field({
    nullable: true,
    description:
      'Current status of the user within the business (e.g., Active, Pending).',
  })
  status: Status;

  @Field({
    nullable: true,
    description:
      'Permission to manage project trust payments within the business.',
  })
  manage_project_trust_payment: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage users within the business.',
  })
  manage_user: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage business details.',
  })
  manage_company: Permission;

  @Field({
    nullable: true,
    description: 'Permission to manage subscriptions within the business.',
  })
  manage_subscription: Permission;

  @Field({
    nullable: true,
    description: 'Date when the user joined the business.',
  })
  joined_on: Date;

  @Field({
    nullable: true,
    description: 'Recent action taken by the user in relation to the business.',
  })
  user_action: string;

  @Field({
    nullable: true,
    description:
      'Number of times an invitation or request was declined by the user.',
  })
  decline_count: number;

  @Field({
    nullable: true,
    description: 'Number of invitations or requests sent to the user.',
  })
  requested_count: number;

  @Field({
    nullable: true,
    description:
      'Timestamp of the last invitation or request sent to the user.',
  })
  last_sent_on: Date;

  @Field({
    nullable: true,
    description: 'Indicates if an admin role has been requested for the user.',
  })
  is_admin_requested: boolean;

  @Field({ description: 'Name of the business.' })
  company_name: string;

  @Field({ description: 'Official email address of the business.' })
  company_email_id: string;

  @Field({
    nullable: true,
    description:
      'Type of business entity (e.g., Business, Sole Trader, Personal).',
  })
  entity_type: EntityType;

  @Field({ nullable: true, description: 'Address of the business.' })
  company_address: string;

  @Field({
    nullable: true,
    description: 'Indicates if the business has been verified.',
  })
  is_verified: boolean;

  @Field({ nullable: true, description: 'Path to the business logo file.' })
  file_path: string;

  @Field({
    nullable: true,
    description: 'Type of the business logo file (e.g., PNG, JPEG).',
  })
  file_type: string;

  @Field({
    nullable: true,
    description: 'Name or identifier of the business logo file.',
  })
  file: string;

  @Field({
    nullable: true,
    description: 'Name of the business subscription plan, if any.',
  })
  plan_name?: string;

  @Field({
    nullable: true,
    description:
      'Type of the business subscription plan (e.g., Basic, Premium).',
  })
  plan_type: string;

  @Field({
    nullable: true,
    description: 'Expiry date of the subscription plan, if applicable.',
  })
  expiry_date?: Date;
}

@ObjectType({
  description:
    'Response object containing a list of companies associated with a user, including logo and permissions.',
})
export class CompanyWithLogoResponse {
  @Field({ description: 'Status of the request (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({
    description:
      'Message providing additional information about the request result.',
  })
  message: string;

  @Field(() => [CompanyWithLogoRes], {
    nullable: true,
    description: 'List of companies associated with the user.',
  })
  data?: CompanyWithLogoRes[];
}
