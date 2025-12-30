import { InputType, Field } from '@nestjs/graphql';
import { categoryStatus } from 'src/entities/master-types.entity';

@InputType({ description: 'Input type for adding a new holiday by an admin' })
export class AdminAddHolidayInput {
  @Field({ description: 'Name of the holiday' })
  holiday_name: string;

  @Field({ nullable: true, description: 'Date of the holiday' })
  holiday_date?: Date;

  @Field({
    nullable: true,
    description: 'Whether the holiday recurs every year',
  })
  recurring_every_year?: boolean;

  @Field({
    nullable: true,
    description: 'Status of the holiday (active/inactive)',
  })
  holiday_status?: categoryStatus;
}

@InputType({
  description: 'Input type for updating an existing holiday by an admin',
})
export class AdminUpdateHolidayInput {
  @Field({ description: 'Unique identifier of the holiday' })
  id: string;

  @Field({ nullable: true, description: 'Updated name of the holiday' })
  holiday_name?: string;

  @Field({ nullable: true, description: 'Updated date of the holiday' })
  holiday_date?: Date;

  @Field({
    nullable: true,
    description: 'Whether the holiday recurs every year',
  })
  recurring_every_year?: boolean;

  @Field({ nullable: true, description: 'Updated status of the holiday' })
  holiday_status?: categoryStatus;
}
