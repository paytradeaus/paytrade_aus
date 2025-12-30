import { InputType, Field } from '@nestjs/graphql';
import { settingStatus } from 'src/entities/common-settings.entity';
import { currencyStatus } from 'src/entities/currency-master.entity';
import { categoryStatus } from 'src/entities/master-types.entity';

@InputType({ description: 'Input for updating an existing master type entry' })
export class UpdateMasterTypeInput {
  @Field({
    nullable: true,
    description: 'Unique identifier of the master type to update',
  })
  id: string;

  @Field({ nullable: true, description: 'Name of the master type' })
  master_type: string;

  @Field({
    nullable: true,
    description: 'Value associated with the master type',
  })
  value: string;

  @Field({ nullable: true, description: 'Description of the master type' })
  description: string;

  @Field({ nullable: true, description: 'Status of the master type' })
  status: categoryStatus;
}

@InputType({
  description: 'Input for updating an existing currency master entry',
})
export class UpdateCurrencyMasterInput {
  @Field({
    nullable: true,
    description: 'Unique identifier of the currency master to update',
  })
  id: string;

  @Field({ nullable: true, description: 'Name of the currency' })
  currency_name: string;

  @Field({
    nullable: true,
    description: 'Short code of the currency (e.g., USD, AUD)',
  })
  short_code: string;

  @Field({ nullable: true, description: 'Symbol of the currency (e.g., $, €)' })
  symbol: string;

  @Field({ nullable: true, description: 'Status of the currency master entry' })
  status: currencyStatus;
}

@InputType({ description: 'Input for updating an existing common setting' })
export class UpdateCommonSettingsInput {
  @Field({ description: 'Unique identifier of the setting to update' })
  id: string;

  @Field({ nullable: true, description: 'Name of the setting' })
  setting_name: string;

  @Field({ nullable: true, description: 'Option or value of the setting' })
  setting_option: string;

  @Field({ nullable: true, description: 'Status of the setting' })
  status: settingStatus;
}
