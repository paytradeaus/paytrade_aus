import { ObjectType, Field } from '@nestjs/graphql';
import { categoryStatus } from 'src/entities/master-types.entity';

@ObjectType({ description: 'Details of a holiday' })
export class HolidayDetails {
  @Field({ description: 'Unique ID of the holiday' })
  id: string;

  @Field({ description: 'Name of the holiday' })
  holiday_name: string;

  @Field({ description: 'Date of the holiday' })
  holiday_date: Date;

  @Field({ description: 'Indicates if the holiday recurs every year' })
  recurring_every_year: boolean;

  @Field({ description: 'Status of the holiday, e.g., ACTIVE or INACTIVE' })
  holiday_status: categoryStatus;

  @Field({
    description: 'Timestamp indicating when the holiday record was created',
  })
  created_on: Date;
}

@ObjectType({ description: 'Response containing a single holiday detail' })
export class HolidayDetailsResponse {
  @Field({ description: 'Status of the API response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Holiday details if the request was successful',
  })
  data?: HolidayDetails;
}

@ObjectType({ description: 'List of holidays with total count' })
export class HolidayList {
  @Field(() => [HolidayDetails], {
    nullable: true,
    description: 'Array of holiday details',
  })
  holidays: HolidayDetails[];

  @Field({ description: 'Total number of holidays available' })
  totalCount: number;
}

@ObjectType({ description: 'Response containing a list of holidays' })
export class HolidayListResponse {
  @Field({ description: 'Status of the API response, e.g., SUCCESS or FAILED' })
  status: string;

  @Field({
    description: 'Message providing additional information about the response',
  })
  message: string;

  @Field({ nullable: true, description: 'List of holidays with total count' })
  data?: HolidayList;
}
