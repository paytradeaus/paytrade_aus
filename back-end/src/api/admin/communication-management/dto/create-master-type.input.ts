import { InputType, Field } from '@nestjs/graphql';
import { settingStatus } from 'src/entities/common-settings.entity';
import { currencyStatus } from 'src/entities/currency-master.entity';
import { categoryStatus } from 'src/entities/master-types.entity';

@InputType({ description: 'Input for creating a new master type entry' })
export class CreateMasterTypeInput {
  @Field({ description: 'Name of the master type category' })
  master_type: string;

  @Field({ description: 'Value for the master type entry' })
  value: string;

  @Field({
    nullable: true,
    description: 'Optional description for the master type',
  })
  description: string;

  @Field({ nullable: true, description: 'Status of the master type entry' })
  status: categoryStatus;
}

@InputType({ description: 'Input for creating a new currency master entry' })
export class CreateCurrencyMasterInput {
  @Field({ description: 'Full name of the currency' })
  currency_name: string;

  @Field({ description: 'Short code for the currency, e.g., USD, AUD' })
  short_code: string;

  @Field({ description: 'Currency symbol, e.g., $, €' })
  symbol: string;

  @Field({ nullable: true, description: 'Status of the currency entry' })
  status: currencyStatus;
}

@InputType({ description: 'Input for creating a new common setting entry' })
export class CreateCommonSettingInput {
  @Field({ description: 'Name of the setting' })
  setting_name: string;

  @Field({ description: 'Option or value of the setting' })
  setting_option: string;

  @Field({ nullable: true, description: 'Status of the setting entry' })
  status: settingStatus;
}
