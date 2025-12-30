import { InputType, Field } from '@nestjs/graphql';
import { FinancialInstitutionStatus } from 'src/entities/financial-institution-deatils.entity';

@InputType({
  description: 'Input type for updating a financial institution by admin',
})
export class AdminUpdateFinInsInput {
  @Field({ description: 'Unique ID of the financial institution' })
  id: string;

  @Field({ nullable: true, description: 'Name of the financial institution' })
  institution_name?: string;

  @Field({
    nullable: true,
    description: 'Unique code assigned to the financial institution',
  })
  institution_code?: string;

  @Field({
    nullable: true,
    description: 'Place name of the financial institution',
  })
  place?: string;

  @Field({
    nullable: true,
    description: 'Place ID of the financial institution',
  })
  place_id?: string;

  @Field({
    nullable: true,
    description: 'Address of the financial institution',
  })
  institution_address?: string;

  @Field({
    nullable: true,
    description: 'Country where the institution is located',
  })
  country?: string;

  @Field({ nullable: true, description: 'Region or state of the institution' })
  region?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the institution',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the institution',
  })
  longitude?: string;

  @Field({
    nullable: true,
    description:
      'Maximum length allowed for account numbers at this institution',
  })
  acc_number_maxlength?: number;

  @Field({
    nullable: true,
    description: 'Current status of the financial institution',
  })
  institution_status?: FinancialInstitutionStatus;
}
