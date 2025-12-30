import { ObjectType, Field, Int } from '@nestjs/graphql';
import { currencyStatus } from 'src/entities/currency-master.entity';
import { categoryStatus } from 'src/entities/master-types.entity';

@ObjectType({ description: 'Represents a PayTrade Master Type record' })
export class PTMasterTypes {
  @Field({ description: 'Unique identifier of the master type' })
  id: string;

  @Field({ description: 'Category/type of the master record' })
  master_type: string;

  @Field({ description: 'Value of the master record' })
  value: string;

  @Field({ description: 'Description for the master type record' })
  description: string;

  @Field({ description: 'Status of the master type record' })
  status: categoryStatus;
}

@ObjectType({ description: 'Represents a currency master record' })
export class CurrencyMaster {
  @Field({ description: 'Unique identifier of the currency record' })
  id: string;

  @Field({ description: 'Full name of the currency' })
  currency_name: string;

  @Field({ description: 'Short code for the currency (e.g., USD, AUD)' })
  short_code: string;

  @Field({ description: 'Currency symbol (e.g., $, £, ¥)' })
  symbol: string;

  @Field({ nullable: true, description: 'Status of the currency record' })
  status: currencyStatus;
}

@ObjectType({ description: 'Response for fetching a single PT master type' })
export class PTMasterTypesResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Master type data' })
  data?: PTMasterTypes;
}

@ObjectType({
  description: 'Response for fetching a list of PT master types (simple array)',
})
export class PTMastersResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Array of master type values',
  })
  data?: string[];
}

// Deprecated/future removal
@ObjectType({ description: 'Legacy response for PT master type list' })
export class PTMasterTypesListResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field(() => [PTMasterTypes], {
    nullable: true,
    description: 'List of master type records',
  })
  data?: PTMasterTypes[];
}

@ObjectType({
  description: 'Response with master type count and list for pagination',
})
export class PTMasterTypesCount {
  @Field(() => [PTMasterTypes], { description: 'Detailed master type records' })
  MasterTypeDetails: PTMasterTypes[];

  @Field(() => Int, { description: 'Total number of master type records' })
  totalCount: number;
}

@ObjectType({ description: 'Paginated list of currency master records' })
export class CurrencyMastersList {
  @Field(() => [CurrencyMaster], {
    description: 'List of currency master records',
  })
  currencyMasters: CurrencyMaster[];

  @Field(() => Int, { description: 'Total number of currency records' })
  totalCount: number;
}

@ObjectType({
  description: 'Response for fetching a single currency master record',
})
export class CurrencyMastersResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Currency master record' })
  data?: CurrencyMaster;
}

@ObjectType({ description: 'Response for fetching currency master list' })
export class CurrencyMasterListResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Paginated currency master list' })
  data?: CurrencyMastersList;
}

// Response for PT master type with count & pagination
@ObjectType({
  description: 'Response wrapper for PT master type list with count',
})
export class PTMasterTypeListResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Master type records with count' })
  data?: PTMasterTypesCount;
}

@ObjectType({ description: 'Represents a common setting record' })
export class CommonSettings {
  @Field({ description: 'Unique identifier of the setting' })
  id: string;

  @Field({ description: 'Name of the setting' })
  setting_name: string;

  @Field({ description: 'Value/option of the setting' })
  setting_option: string;

  @Field({ nullable: true, description: 'Status of the setting' })
  status: currencyStatus;
}

@ObjectType({ description: 'Response for fetching a single common setting' })
export class CommonSettingsResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Common setting data' })
  data?: CommonSettings;
}

@ObjectType({ description: 'Paginated list of common settings' })
export class CommonSettingsList {
  @Field(() => [CommonSettings], { description: 'List of common settings' })
  commonSettings: CommonSettings[];

  @Field(() => Int, { description: 'Total number of common settings' })
  totalCount: number;
}

@ObjectType({ description: 'Response for fetching a list of common settings' })
export class CommonSettingsListResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Paginated list of common settings' })
  data?: CommonSettingsList;
}
