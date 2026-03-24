import { ObjectType, Field, Int } from '@nestjs/graphql';
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

@ObjectType({ description: 'Holiday table coverage status data' })
export class HolidayTableStatusData {
  @Field({ description: 'Whether the holiday table needs attention' })
  warning: boolean;

  @Field(() => Int, { description: 'Days of holiday coverage remaining from today' })
  days_remaining: number;

  @Field({ nullable: true, description: 'The latest holiday date in the table' })
  latest_holiday_date: string;

  @Field(() => Int, { description: 'Total active holidays in the table' })
  total_active_holidays: number;

  @Field({ description: 'Human-readable status message' })
  status_message: string;
}

@ObjectType({ description: 'Response for holiday table status check' })
export class HolidayTableStatusResponse {
  @Field({ description: 'Status of the API response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Holiday table status data' })
  data?: HolidayTableStatusData;
}
