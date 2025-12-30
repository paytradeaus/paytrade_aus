import { InputType, Field } from '@nestjs/graphql';
import { FinancialInstitutionStatus } from 'src/entities/financial-institution-deatils.entity';

@InputType({
  description: 'Input type for admin to add a new financial institution',
})
export class AdminAddFinInstitutionInput {
  @Field({ description: 'Name of the financial institution' })
  institution_name: string;

  @Field({ description: 'Unique code of the financial institution' })
  institution_code: string;

  @Field({
    nullable: true,
    description: 'Place or city where the institution is located',
  })
  place?: string;

  @Field({
    nullable: true,
    description: 'Place ID of the institution location',
  })
  place_id?: string;

  @Field({ nullable: true, description: 'Address of the institution' })
  institution_address?: string;

  @Field({
    nullable: true,
    description: 'Country where the institution is located',
  })
  country?: string;

  @Field({ nullable: true, description: 'Region/state of the institution' })
  region?: string;

  @Field({
    nullable: true,
    description: 'Latitude coordinate of the institution location',
  })
  latitude?: string;

  @Field({
    nullable: true,
    description: 'Longitude coordinate of the institution location',
  })
  longitude?: string;

  @Field({
    nullable: true,
    description:
      'Maximum allowed length of account numbers for this institution',
  })
  acc_number_maxlength?: number;

  @Field({ nullable: true, description: 'Status of the financial institution' })
  institution_status?: FinancialInstitutionStatus;
}
