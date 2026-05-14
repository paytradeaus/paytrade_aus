import { Injectable } from '@nestjs/common';
import { Account, AccountType, CurrencyCode, XeroClient } from 'xero-node';
import * as dotenv from 'dotenv';
import {
  GetMappedXeroAccountListsInput,
  GetPaytradeAccountListsInput,
  GetXeroAccountListsInput,
  YetToMapAccountsInput,
} from './dto/xero.input';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { BankAccountsService } from 'src/api/users/banking/bank-accounts/bank-accounts.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AddBankAccountInput,
  ChangeStatusOfBankAccountInput,
  EditDetailsOfABankAccountInput,
} from 'src/api/users/banking/bank-accounts/bank-accounts.input';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroAccountsService {
  private logger: PaytradeLogger;
  private xero: XeroClient;
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(XeroBankAccountDetails)
    private xeroBankAccountDetails: Repository<XeroBankAccountDetails>,
    @InjectRepository(BankAccounts)
    private accountDetails: Repository<BankAccounts>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    private readonly xeroService: XeroService,
    private readonly bankAccountsService: BankAccountsService,
  ) {
    this.logger = new PaytradeLogger('XERO_BANK_ACCOUNTS_SERVICE');
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_CALLBACK_URL + 'xero/callback'],
      scopes: [
        'openid',
        'email',
        'profile',
        'accounting.transactions',
        'accounting.settings', // Required for tenants
        'accounting.settings.read',
        'offline_access', // Required for token refresh
        'projects', // Required for projects
        'accounting.contacts', // Required for contacts
        'accounting.contacts.read',
      ],
      state: '',
      httpTimeout: 10000, // Set timeout for requests
    });
  }

  private readonly INACTIVE_STATUSES = [
    'Inactive',
    'Deleted - archived',
    'Disconnected',
    'Connected - paused',
  ];

  private isXeroConnectionUsable(integrationStatus: string): boolean {
    return !this.INACTIVE_STATUSES.includes(integrationStatus);
  }

  async getAccountsDetails(bank_account_id) {
    return await this.accountDetails.findOne({
      where: { bank_account_id },
    });
  }

  async createBankAccount(decoded: any, data: any) {
    try {
      const accountDetails = await this.getAccountsDetails(
        data.bank_account_id,
      );
      if (!accountDetails) {
        throw `Account details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: accountDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        !this.isXeroConnectionUsable(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      await this.xeroService.refreshTokenSet(
        accountDetails.company_id,
        this.xero,
      );

      const checkExistenceInXero = await this.xero.accountingApi.getAccounts(
        xeroDetails.tenant_id,
        new Date('1900-01-01T00:00:00.000+00:00'),
        `Status=="ACTIVE" AND Type=="BANK" AND Name=="${accountDetails.account_name}"`,
        'Name ASC',
      );

      this.logger.log(`checkExistenceInXero.body: ${JSON.stringify(checkExistenceInXero.body)}`);
      if (
        checkExistenceInXero &&
        checkExistenceInXero?.body &&
        checkExistenceInXero?.body?.accounts &&
        checkExistenceInXero?.body?.accounts?.length > 0 &&
        checkExistenceInXero?.body?.accounts[0] !== null
      ) {
        const account = checkExistenceInXero.body.accounts[0];
        let requestData: any = {
          account_id: account.accountID,
          integration_id: xeroDetails.integration_id,
          tenant_id: xeroDetails.tenant_id,
          account_name: account.name,
          account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
          bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
          account_type: account.type,
          account_status: account.status,
          description: account.description,
          pt_bank_account_id: data.bank_account_id,
          mapped_status: data.mapped_status,
        };
        const checkExistenceInDb = await this.getAccountDetailsByAccountId(
          account.accountID,
          xeroDetails.integration_id,
        );
        if (checkExistenceInDb && checkExistenceInDb?.id) {
          if (
            checkExistenceInDb.pt_bank_account_id &&
            checkExistenceInDb.pt_bank_account_id !== data.bank_account_id
          ) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createAccountInXero',
              api_payload: {
                bank_account_id: data.bank_account_id,
                account_id: account.accountID,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 280,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: accountDetails?.id,
              },
              reference_id: accountDetails?.id,
              history: [
                `API triggered from bank account ${accountDetails?.account_name}`,
                'Export failed',
              ],
              important_checks: {},
              error_message: `Bank account in Xero exists already and mapped to some other bank account in paytrade ${checkExistenceInDb.pt_bank_account_id}`,
              xero_records: [account],
              paytrade_records: [accountDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
          requestData = {
            ...requestData,
            updated_on: account.updatedDateUTC,
            updated_by: decoded?.userId,
            updated_group: 'USER',
          };
          const response =
            await this.updateAccountDetailsByAccountId(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 9,
            dynamic_values: { account_name: accountDetails?.account_name },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: accountDetails?.id,
            },
            reference_id: accountDetails?.id,
            history: [
              `API triggered from bank account ${accountDetails?.account_name}`,
              'Export successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: [account],
            paytrade_records: [accountDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        } else {
          requestData = {
            ...requestData,
            created_on: account.updatedDateUTC,
            created_by: decoded?.userId,
            created_group: 'USER',
          };
          const response: any = await this.insertAccountDetails(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 9,
            dynamic_values: { account_name: accountDetails?.account_name },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: accountDetails?.id,
            },
            reference_id: accountDetails?.id,
            history: [
              `API triggered from bank account ${accountDetails?.account_name}`,
              'Export successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: [account],
            paytrade_records: [accountDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        }
      } else {
        try {
          // Task #116 — Only send bankAccountNumber when we actually have
          // a BSB + account number pair. Never send "null12345" or "".
          const bsbDigitsCreate =
            accountDetails.bsb_number != null
              ? String(accountDetails.bsb_number).replace(/\D/g, '')
              : '';
          const acctDigitsCreate = (accountDetails.account_number || '')
            .toString()
            .replace(/\D/g, '');
          const bankAccountNumberCreate =
            bsbDigitsCreate && acctDigitsCreate
              ? `${bsbDigitsCreate.padStart(6, '0')}${acctDigitsCreate}`
              : undefined;
          const xeroResponse = await this.xero.accountingApi.createAccount(
            xeroDetails.tenant_id,
            {
              code: Math.floor(Math.random() * 100000).toString(),
              name: accountDetails.account_name,
              ...(bankAccountNumberCreate
                ? { bankAccountNumber: bankAccountNumberCreate }
                : {}),
              currencyCode: CurrencyCode.AUD,
              description: accountDetails.account_type || '',
              type: AccountType.BANK,
            },
          );

          this.logger.log(`Bank account created successfully: ${JSON.stringify(xeroResponse.body)}`);
          if (
            xeroResponse?.body?.accounts &&
            xeroResponse?.body?.accounts.length > 0
          ) {
            const account = xeroResponse.body.accounts[0];
            let requestData: any = {
              account_id: account.accountID,
              integration_id: xeroDetails.integration_id,
              tenant_id: xeroDetails.tenant_id,
              account_name: account.name,
              account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
              bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
              account_type: account.type,
              account_status: account.status,
              description: account.description,
              pt_bank_account_id: data.bank_account_id,
              mapped_status: data.mapped_status,
            };

            const is_edit = await this.xeroBankAccountDetails.findOne({
              where: {
                pt_bank_account_id: data.bank_account_id,
                integration_id: xeroDetails.integration_id,
              },
            });

            if (!is_edit) {
              requestData = {
                ...requestData,
                created_on: account.updatedDateUTC,
                created_by: decoded?.userId,
                created_group: 'USER',
              };
              const response: any =
                await this.insertAccountDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 9,
                dynamic_values: { account_name: accountDetails?.account_name },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: response?.id,
                  paytradeId: accountDetails?.id,
                },
                reference_id: accountDetails?.id,
                history: [
                  `API triggered from bank account ${accountDetails?.account_name}`,
                  'Export successful',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [account],
                paytrade_records: [accountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            } else {
              requestData = {
                ...requestData,
                updated_on: account.updatedDateUTC,
                updated_by: decoded?.userId,
                updated_group: 'USER',
              };
              const response = await this.updateAccountDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 9,
                dynamic_values: { account_name: accountDetails?.account_name },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: response?.id,
                  paytradeId: accountDetails?.id,
                },
                reference_id: accountDetails?.id,
                history: [
                  `API triggered from bank account ${accountDetails?.account_name}`,
                  'Export successful',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [account],
                paytrade_records: [accountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            }
          } else {
            const errMsg = await handleAxiosError(xeroResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createAccountInXero',
                api_payload: { bank_account_id: data.bank_account_id },
                integration_id: xeroDetails.integration_id,
                log_template_id: 27,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: null,
                  paytradeId: accountDetails?.id,
                },
                reference_id: accountDetails?.id,
                history: [
                  `API triggered from bank account ${accountDetails?.account_name}`,
                  'Export failed',
                ],
                error_message: errMsg,
                important_checks: {},
                xero_records: [],
                paytrade_records: [accountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

            return false;
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'createAccountInXero',
              api_payload: { bank_account_id: data.bank_account_id },
              integration_id: xeroDetails.integration_id,
              log_template_id: 27,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: null,
                paytradeId: accountDetails?.id,
              },
              reference_id: accountDetails?.id,
              history: [
                `API triggered from bank account ${accountDetails?.account_name}`,
                'Export failed',
              ],
              error_message: errMsg,
              important_checks: {},
              xero_records: [],
              paytrade_records: [accountDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getAccountDetails(pt_bank_account_id: number, integration_id: number) {
    return await this.xeroBankAccountDetails.findOne({
      where: { pt_bank_account_id, integration_id },
    });
  }

  async getAccountDetailsByAccountId(
    account_id: string,
    integration_id: number,
  ) {
    return await this.xeroBankAccountDetails.findOne({
      where: { account_id, integration_id },
    });
  }

  async insertAccountDetails(requestData: any) {
    const xeroBankAccountDetails =
      await this.xeroBankAccountDetails.create(requestData);

    return await this.xeroBankAccountDetails.save(xeroBankAccountDetails);
  }

  async insertAccountDetailsInPaytrade(decoded: any, data: any) {
    const { company_id, account_id, sync_id } = data;

    const {
      account_name,
      account_number,
      bsb_number,
      account_type,
      project_ids,
      trustee_id,
      associated_cash_account_id,
      client_supplier_id,
      opening_date,
      contract_date,
      contract_practical_completion_date,
      first_sub_contract_date,
      contract_value,
      financial_institution,
      delegate_powers,
    } = data.payload || {};

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });

    if (
      !xeroDetails ||
      !xeroDetails.integration_id ||
      !xeroDetails?.integrationDetails
    ) {
      throw `No xero integration found`;
    }

    if (
      !this.isXeroConnectionUsable(
        xeroDetails.integrationDetails.integration_status,
      )
    ) {
      throw `Paytrade is currently not active in Xero.`;
    }

    const checkExistenceInDb = await this.getAccountDetailsByAccountId(
      account_id,
      xeroDetails.integration_id,
    );

    if (!checkExistenceInDb) {
      throw `Xero account details not found`;
    }

    const account = await this.getBankAccountByAccountId(
      account_id,
      company_id,
    );

    if (
      checkExistenceInDb &&
      checkExistenceInDb.pt_bank_account_id &&
      checkExistenceInDb.mapped_status
    ) {
      const checkExistenceInPaytrade = await this.getAccountsDetails(
        checkExistenceInDb.pt_bank_account_id,
      );
      if (checkExistenceInPaytrade) {
        throw `Bank account in Xero exists already and mapped to some other bank account in paytrade ${checkExistenceInDb.pt_bank_account_id}`;
      }
    }

    if (
      !account_type ||
      !account_name ||
      !financial_institution ||
      !account_number ||
      !bsb_number ||
      !opening_date ||
      !delegate_powers ||
      (account_type === 'Project Trust Account' &&
        (!associated_cash_account_id ||
          !trustee_id ||
          !project_ids ||
          !client_supplier_id ||
          !contract_date ||
          !contract_practical_completion_date ||
          !first_sub_contract_date ||
          !contract_value)) ||
      (account_type === 'Retention Trust Account' &&
        (!associated_cash_account_id || !trustee_id || !project_ids))
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: sync_id || null,
        api_name: 'createAccountInPaytrade',
        api_payload: {
          account_id,
          account_name: account.name,
          account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
          bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id: 365,
        dynamic_values: {},
        project_id: null,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [
          `API triggered from bank account ${account.name}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: `Missing mandatory fields`,
        xero_records: [account],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    } else {
      const bankResponse = await this.bankAccountsService.addBankAccount(
        decoded,
        data.payload,
        decoded?.userId,
      );
      this.logger.log(`bankResponse: ${JSON.stringify(bankResponse)}`);
      let warningMessage, bank_account_id;
      if (bankResponse && "warningMessage" in bankResponse) {
        warningMessage = bankResponse.warningMessage;
      }
      if (bankResponse && "bank_account_id" in bankResponse) {
        bank_account_id = bankResponse.bank_account_id;
      }

      if (
        bankResponse &&
        bankResponse?.warning &&
        warningMessage
          ?.toLowerCase()
          ?.includes('Please upgrade your subscription plan'.toLowerCase())
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createAccountInPaytrade',
          api_payload: {
            account_id,
            account_name: account.name,
            account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
            bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
            payload: data.payload || {},
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 387,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from bank account ${account?.name}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: warningMessage,
          xero_records: [account],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      if (bankResponse && bank_account_id) {
        const paytradeAccountDetails = await this.getAccountsDetails(
          bank_account_id,
        );

        // Task #116 — Only send bankAccountNumber when we have both
        // BSB + account number; otherwise omit the field.
        const bsbDigitsImp =
          paytradeAccountDetails.bsb_number != null
            ? String(paytradeAccountDetails.bsb_number).replace(/\D/g, '')
            : '';
        const acctDigitsImp = (paytradeAccountDetails.account_number || '')
          .toString()
          .replace(/\D/g, '');
        const bankAccountNumberImp =
          bsbDigitsImp && acctDigitsImp
            ? `${bsbDigitsImp.padStart(6, '0')}${acctDigitsImp}`
            : undefined;
        const updateBankAccountResponse =
          await this.xero.accountingApi.updateAccount(
            xeroDetails.tenant_id,
            account_id,
            {
              accounts: [
                {
                  name: paytradeAccountDetails.account_name,
                  ...(bankAccountNumberImp
                    ? { bankAccountNumber: bankAccountNumberImp }
                    : {}),
                  description: paytradeAccountDetails.account_type,
                },
              ],
            },
          );
        const updatedAccount =
          updateBankAccountResponse.response.data.Accounts[0];

        const xeroBankAccountDetails =
          await this.xeroBankAccountDetails.findOne({
            where: {
              account_id,
              integration_id: xeroDetails.integration_id,
            },
          });
        xeroBankAccountDetails.account_name = updatedAccount.Name;
        xeroBankAccountDetails.account_status = updatedAccount.Status;
        xeroBankAccountDetails.account_number =
          updatedAccount.BankAccountNumber?.slice(6);
        xeroBankAccountDetails.bsb_number =
          updatedAccount.BankAccountNumber?.slice(0, 6);
        xeroBankAccountDetails.account_type = updatedAccount.Type;
        xeroBankAccountDetails.description = updatedAccount.Description;
        xeroBankAccountDetails.pt_bank_account_id =
          bank_account_id;
        xeroBankAccountDetails.mapped_status = 'System';
        xeroBankAccountDetails.updated_by = paytradeAccountDetails.created_by;
        xeroBankAccountDetails.updated_on = moment.tz('UTC');
        xeroBankAccountDetails.updated_group = 'USER';
        await this.xeroBankAccountDetails.save(xeroBankAccountDetails);

        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createAccountInPaytrade',
          api_payload: {
            account_id,
            account_name: account.name,
            account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
            bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 13,
          dynamic_values: {
            account_name: paytradeAccountDetails?.account_name,
            status: data.payload?.status?.toLowerCase(),
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: xeroBankAccountDetails?.id,
            paytradeId: paytradeAccountDetails?.id,
          },
          reference_id: xeroBankAccountDetails?.id,
          history: [
            `API triggered from bank account ${paytradeAccountDetails?.account_name}`,
            'Import successful',
          ],
          important_checks: {},
          error_message: null,
          xero_records: [account],
          paytrade_records: [paytradeAccountDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });

        return {
          id: paytradeAccountDetails.id,
          account_id: paytradeAccountDetails.bank_account_id,
          account_name: paytradeAccountDetails.account_name,
          account_status: paytradeAccountDetails.status,
        };
      }
    }
  }

  async updateAccountDetails(data: any) {
    const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
      where: {
        pt_bank_account_id: data.pt_bank_account_id,
        integration_id: data.integration_id,
      },
    });
    xeroBankAccountDetails.tenant_id = data.tenant_id;
    xeroBankAccountDetails.integration_id = data.integration_id;
    xeroBankAccountDetails.account_id = data.account_id;
    xeroBankAccountDetails.account_name = data.account_name;
    xeroBankAccountDetails.account_status = data.account_status;
    xeroBankAccountDetails.account_number = data.account_number;
    xeroBankAccountDetails.bsb_number = data.bsb_number;
    xeroBankAccountDetails.account_type = data.account_type;
    xeroBankAccountDetails.description = data.description;
    xeroBankAccountDetails.mapped_status = data.mapped_status;
    xeroBankAccountDetails.updated_by = data.updated_by;
    xeroBankAccountDetails.updated_on = data.updated_on;
    xeroBankAccountDetails.updated_group = data.updated_group;
    return await this.xeroBankAccountDetails.save(xeroBankAccountDetails);
  }

  async updateAccountDetailsByAccountId(data: any) {
    const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
      where: {
        account_id: data.account_id,
        integration_id: data.integration_id,
      },
    });
    xeroBankAccountDetails.tenant_id = data.tenant_id;
    xeroBankAccountDetails.integration_id = data.integration_id;
    xeroBankAccountDetails.account_id = data.account_id;
    xeroBankAccountDetails.account_name = data.account_name;
    xeroBankAccountDetails.account_status = data.account_status;
    xeroBankAccountDetails.account_number = data.account_number;
    xeroBankAccountDetails.bsb_number = data.bsb_number;
    xeroBankAccountDetails.account_type = data.account_type;
    xeroBankAccountDetails.description = data.description;
    xeroBankAccountDetails.mapped_status = data.mapped_status;
    xeroBankAccountDetails.pt_bank_account_id = data.pt_bank_account_id;
    xeroBankAccountDetails.updated_by = data.updated_by;
    xeroBankAccountDetails.updated_on = data.updated_on;
    xeroBankAccountDetails.updated_group = data.updated_group;
    return await this.xeroBankAccountDetails.save(xeroBankAccountDetails);
  }

  async editBankAccount(decoded: any, data: any) {
    try {
      const accountDetails = await this.getAccountsDetails(
        data.bank_account_id,
      );
      if (!accountDetails) {
        throw `Account details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: accountDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      const bankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          pt_bank_account_id: data.bank_account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!bankAccountDetails) {
        {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'editAccountInXero',
            api_payload: {
              bank_account_id: data.bank_account_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 37,
            dynamic_values: { account_name: accountDetails?.account_name },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: null,
              paytradeId: accountDetails?.id,
            },
            reference_id: accountDetails?.id,
            history: [
              `API triggered from bank account ${accountDetails?.account_name}`,
              `Bank Account edit in xero failed - bank account is not mapped`,
              'Export failed',
            ],
            important_checks: {},
            error_message: `Bank account is not mapped`,
            xero_records: [],
            paytrade_records: [accountDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }

      await this.xeroService.refreshTokenSet(
        accountDetails.company_id,
        this.xero,
      );

      const xeroAccountDetails = await this.xero.accountingApi.getAccount(
        xeroDetails.tenant_id,
        bankAccountDetails.account_id,
      );
      this.logger.log(`xeroAccountDetails: ${JSON.stringify(xeroAccountDetails)}`);
      if (xeroAccountDetails.body.accounts[0] !== null) {
        try {
          // Task #116 — Only send bankAccountNumber when we have both
          // BSB + account number; otherwise omit the field.
          const bsbDigitsEdit =
            accountDetails.bsb_number != null
              ? String(accountDetails.bsb_number).replace(/\D/g, '')
              : '';
          const acctDigitsEdit = (accountDetails.account_number || '')
            .toString()
            .replace(/\D/g, '');
          const bankAccountNumberEdit =
            bsbDigitsEdit && acctDigitsEdit
              ? `${bsbDigitsEdit.padStart(6, '0')}${acctDigitsEdit}`
              : undefined;
          const updateBankAccountResponse =
            await this.xero.accountingApi.updateAccount(
              xeroDetails.tenant_id,
              bankAccountDetails.account_id,
              {
                accounts: [
                  {
                    name: accountDetails.account_name,
                    ...(bankAccountNumberEdit
                      ? { bankAccountNumber: bankAccountNumberEdit }
                      : {}),
                    description: accountDetails.account_type,
                  },
                ],
              },
            );

          this.logger.log(
            `Bank account edited successfully: ${updateBankAccountResponse.response.status}`,
          );
          if (updateBankAccountResponse.response.status === 200) {
            const account = updateBankAccountResponse.response.data.Accounts[0];
            this.logger.log(`account: ${JSON.stringify(account)}`);
            const xeroPayload: any = {
              account_id: account.AccountID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              account_name: account.Name,
              account_number: account.BankAccountNumber?.slice(6),
              bsb_number: account.BankAccountNumber?.slice(0, 6),
              account_type: account.Type,
              account_status: account.Status,
              description: account.Description,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
            };
            const xeroResponse = await this.updateAccountDetails(xeroPayload);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 21,
              dynamic_values: { account_name: accountDetails?.account_name },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: accountDetails?.id,
              },
              reference_id: accountDetails?.id,
              history: [
                `API triggered from bank account ${xeroPayload?.account_name}`,
                'Export successful',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [account],
              paytrade_records: [accountDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(updateBankAccountResponse);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'editAccountInXero',
              api_payload: {
                bank_account_id: data.bank_account_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 31,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: bankAccountDetails?.id,
                paytradeId: accountDetails?.id,
              },
              reference_id: accountDetails?.id,
              history: [
                `API triggered from bank account ${accountDetails?.account_name}`,
                `Bank Account edit in xero failed - bank account is not updated`,
                'Export failed',
              ],
              important_checks: {},
              error_message: errMsg,
              xero_records: [xeroAccountDetails.body.accounts[0]],
              paytrade_records: [accountDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'editAccountInXero',
            api_payload: {
              bank_account_id: data.bank_account_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 31,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: bankAccountDetails?.id,
              paytradeId: accountDetails?.id,
            },
            reference_id: accountDetails?.id,
            history: [
              `API triggered from bank account ${accountDetails?.account_name}`,
              `Bank Account edit in xero failed - bank account is not updated`,
              'Export failed',
            ],
            important_checks: {},
            error_message: errMsg,
            xero_records: [xeroAccountDetails.body.accounts[0]],
            paytrade_records: [accountDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      } else {
        const errMsg = await handleAxiosError(xeroAccountDetails);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editAccountInXero',
          api_payload: {
            bank_account_id: data.bank_account_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 281,
          dynamic_values: { account_name: accountDetails?.account_name },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: bankAccountDetails?.id,
            paytradeId: accountDetails?.id,
          },
          reference_id: accountDetails?.id,
          history: [
            `API triggered from bank account ${accountDetails?.account_name}`,
            `Bank Account edit in xero failed - bank account is not found`,
            'Export failed',
          ],
          important_checks: {},
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [accountDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async deleteBankAccount(decoded: any, data: any) {
    try {
      const bankAccountDetails = await this.getAccountsDetails(
        data.bank_account_id,
      );
      if (!bankAccountDetails) {
        throw `Account details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: bankAccountDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      const account_details = await this.xeroBankAccountDetails.findOne({
        where: {
          pt_bank_account_id: data.bank_account_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!account_details) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteAccountInXero',
          api_payload: {
            bank_account_id: data.bank_account_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 39,
          dynamic_values: { account_name: bankAccountDetails?.account_name },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: bankAccountDetails?.id,
          },
          reference_id: bankAccountDetails?.id,
          history: [
            `API triggered from bank account ${bankAccountDetails?.account_name}`,
            `Bank Account edit in xero failed - bank account is not mapped`,
            'Export failed',
          ],
          important_checks: {},
          error_message: `Bank account is not mapped`,
          xero_records: [],
          paytrade_records: [bankAccountDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        !account_details.account_id &&
        account_details.account_status === 'DRAFT'
      ) {
        account_details.account_status = 'ARCHIVED';
        account_details.updated_by = decoded?.userId;
        account_details.updated_on = moment.tz('UTC');
        account_details.updated_group = 'USER';
        const xeroResponse =
          await this.xeroBankAccountDetails.save(account_details);
        if (xeroResponse) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 23,
              dynamic_values: { account_name: account_details?.account_name },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: account_details?.id,
              },
              reference_id: account_details?.id,
              history: [
                `API triggered from bank account ${account_details?.account_name}`,
                'Export successful',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [],
              paytrade_records: [account_details],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
        }
        return xeroResponse;
      }

      await this.xeroService.refreshTokenSet(
        bankAccountDetails.company_id,
        this.xero,
      );

      const accountDetails = await this.xero.accountingApi.getAccount(
        xeroDetails.tenant_id,
        account_details.account_id,
      );
      this.logger.log(`accountDetails: ${JSON.stringify(accountDetails)}`);
      if (accountDetails.body.accounts[0] !== null) {
        try {
          const deleteBankAccountResponse =
            await this.xero.accountingApi.updateAccount(
              xeroDetails.tenant_id,
              account_details.account_id,
              {
                accounts: [
                  {
                    status: Account.StatusEnum.ARCHIVED,
                  },
                ],
              },
            );

          this.logger.log(
            `Bank account deleted successfully: ${deleteBankAccountResponse.response.status}`,
          );
          if (deleteBankAccountResponse.response.status === 200) {
            const account = deleteBankAccountResponse.response.data.Accounts[0];
            account_details.account_status = account.Status;
            account_details.updated_by = decoded?.userId;
            account_details.updated_on = moment.tz('UTC');
            account_details.updated_group = 'USER';
            const xeroResponse =
              await this.xeroBankAccountDetails.save(account_details);

            if (xeroResponse) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 23,
                  dynamic_values: {
                    account_name: account_details?.account_name,
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroResponse?.id,
                    paytradeId: bankAccountDetails?.id,
                  },
                  reference_id: bankAccountDetails?.id,
                  history: [
                    `API triggered from bank account ${bankAccountDetails?.account_name}`,
                    'Export successful',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [accountDetails.body.accounts[0]],
                  paytrade_records: [bankAccountDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(deleteBankAccountResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteAccountInXero',
                api_payload: {
                  bank_account_id: data.bank_account_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 33,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: account_details.id,
                  paytradeId: bankAccountDetails?.id,
                },
                reference_id: bankAccountDetails?.id,
                history: [
                  `API triggered from bank account ${bankAccountDetails?.account_name}`,
                  `Bank Account delete in xero failed - bank account is not updated`,
                  'Export failed',
                ],
                important_checks: {},
                error_message: errMsg,
                xero_records: [accountDetails.body.accounts[0]],
                paytrade_records: [bankAccountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

            return false;
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'deleteAccountInXero',
              api_payload: {
                bank_account_id: data.bank_account_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 33,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: account_details.id,
                paytradeId: bankAccountDetails?.id,
              },
              reference_id: bankAccountDetails?.id,
              history: [
                `API triggered from bank account ${bankAccountDetails?.account_name}`,
                `Bank Account delete in xero failed - bank account is not updated`,
                'Export failed',
              ],
              important_checks: {},
              error_message: errMsg,
              xero_records: [accountDetails.body.accounts[0]],
              paytrade_records: [bankAccountDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } else {
        const errMsg = await handleAxiosError(accountDetails);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteAccountInXero',
          api_payload: {
            bank_account_id: data.bank_account_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 282,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: account_details?.id,
            paytradeId: bankAccountDetails?.id,
          },
          reference_id: bankAccountDetails?.id,
          history: [
            `API triggered from bank account ${bankAccountDetails?.account_name}`,
            `Bank Account edit in xero failed - bank account is not found`,
            'Export failed',
          ],
          important_checks: {},
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [bankAccountDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
        // account_details.account_status = 'ARCHIVED';
        // account_details.updated_by = decoded?.userId;
        // account_details.updated_on = moment.tz('UTC');
        // account_details.updated_group = 'USER';
        // return await this.xeroBankAccountDetails.save(account_details);
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getBankAccountByAccountId(account_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const accountDetails = await this.xero.accountingApi.getAccount(
        xeroDetails.tenant_id,
        account_id,
      );
      if (accountDetails.body.accounts[0]) {
        // console.log('accountDetails:', accountDetails.body.accounts[0]);
        return accountDetails.body.accounts[0];
      }
      throw accountDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async syncAllBankAccountsByCompanyId(decoded: any, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);

      const integrationDetails = await this.integrationDetails.findOne({
        where: { integration_id: xeroDetails.integration_id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      if (
        xeroDetails.action_buttons.import_bank === false &&
        integrationDetails.integration_status !== 'Pending bank account mapping'
      )
        throw `Unauthorized to perform this action`;

      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = 'Type=="BANK"';
      const order = 'Name ASC';

      const newAccounts = [];
      const existingAccounts = [];

      let oldData = [],
        newData = [],
        syncedData = [];

      const count = { mapped: 0, unmapped: 0, total: 0 };

      const response = await this.xero.accountingApi.getAccounts(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
      );

      // console.log('response.body: ', response.body);
      const accounts = response.body.accounts || [];

      if (accounts && accounts[0] !== null && accounts.length !== 0) {
        // Fetch all account IDs from DB in a single query
        const accountIdsInDb = await this.xeroBankAccountDetails.find({
          where: {
            account_id: In(accounts.map((a) => a.accountID)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['account_id'],
        });
        const existingAccountIds = new Set(
          accountIdsInDb.map((a) => a.account_id),
        );

        const existingAccountIdsSet = new Set(existingAccountIds);
        // Separate new and existing accounts
        accounts.forEach((account) => {
          this.logger.log(`account: ${account.status}`);
          const accountData: any = {
            account_id: account.accountID,
            integration_id: xeroDetails.integration_id,
            tenant_id: xeroDetails.tenant_id,
            account_name: account.name,
            account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
            bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
            account_type: account.type,
            account_status: account.status,
            description: account.description,
            created_on: account.updatedDateUTC,
          };

          if (existingAccountIdsSet?.has(String(account.accountID))) {
            if (
              !existingAccounts.some(
                (c) => c.contact_id === String(account.accountID),
              )
            ) {
              existingAccounts.push(accountData);
              oldData.push(account);
            }
          } else {
            if (
              accountData &&
              accountData?.account_status === Account.StatusEnum.ACTIVE
            ) {
              newAccounts.push(accountData);
              newData.push(account);
            }
          }
        });

        // Batch insert new accounts
        if (newAccounts.length > 0) {
          const xeroBankAccountDetails =
            await this.xeroBankAccountDetails.create(newAccounts);
          await this.xeroBankAccountDetails.save(xeroBankAccountDetails);
          // console.log(
          //   `Inserted ${xeroBankAccountDetails.length} new accounts.`,
          // );
        }

        // Batch update existing accounts
        if (existingAccounts.length > 0) {
          for (const account of existingAccounts) {
            await this.xeroBankAccountDetails.update(
              {
                account_id: account.account_id,
                integration_id: xeroDetails.integration_id,
              },
              account,
            );
          }
          // console.log(`Updated ${existingAccounts.length} existing accounts.`);
        }

        // console.log(
        //   `newAccounts ${newAccounts} existingAccounts ${existingAccounts[0]}`,
        // );

        //automapping
        const autoMappingRecords = await this.xeroBankAccountDetails
          .createQueryBuilder('account')
          .select([
            'account.id AS id',
            'account.account_id AS account_id',
            'account.tenant_id AS tenant_id',
            'account.account_name AS account_name',
            'account.account_number AS account_number',
            'account.bsb_number AS bsb_number',
            'account.account_status AS account_status',
            'account.description AS description',
            'b.bank_account_id AS pt_bank_account_id',
            'b.account_name AS pt_account_name',
          ])
          .innerJoin(
            XeroIntegrationDetails,
            'xero',
            `xero.status = 'ACTIVE' AND xero.integration_id = account.integration_id`,
          )
          .innerJoin(
            BankAccounts,
            'b',
            `LOWER(TRIM(account.account_name)) = LOWER(TRIM(b.account_name))`,
          )
          .distinct(true)
          .where(
            `xero.company_id = :companyId and b.company_id = :companyId and b.status <> 'Deleted'`,
            {
              companyId: company_id,
            },
          )
          .andWhere('account.pt_bank_account_id IS NULL')
          .orderBy({ 'account.account_name': 'ASC' })
          .getRawMany();
        // console.log('autoMappingRecords: ', autoMappingRecords);

        const yet_to_map = autoMappingRecords?.map((res) => ({
          account_id: res.account_id,
          pt_bank_account_id: res?.pt_bank_account_id,
        }));

        let mappedAccounts = [];
        if (yet_to_map && yet_to_map.length > 0) {
          for (const element of yet_to_map) {
            await this.xeroBankAccountDetails
              .createQueryBuilder()
              .update(XeroBankAccountDetails)
              .set({
                pt_bank_account_id: element.pt_bank_account_id,
                mapped_status: 'Auto',
                updated_by: decoded.userId,
                updated_on: moment.tz('UTC'),
                updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
              })
              .where(
                'account_id = :account_id AND integration_id = :integration_id',
                {
                  account_id: element.account_id,
                  integration_id: xeroDetails.integration_id,
                },
              )
              .execute();
            mappedAccounts.push(element.account_id);
          }
        }

        // synced records
        const syncedRecords = await this.xeroBankAccountDetails
          .createQueryBuilder('account')
          .select([
            'account.id AS id',
            'account.account_id AS account_id',
            'account.tenant_id AS tenant_id',
            'account.account_name AS account_name',
            'account.account_number AS account_number',
            'account.bsb_number AS bsb_number',
            'account.account_status AS account_status',
            'account.description AS description',
            'b.bank_account_id AS pt_bank_account_id',
            'b.account_name AS pt_account_name',
            'b.account_number AS pt_account_number',
            'b.bsb_number AS pt_bsb_number',
          ])
          .innerJoin(
            XeroIntegrationDetails,
            'xero',
            `xero.status = 'ACTIVE' AND xero.integration_id = account.integration_id`,
          )
          .innerJoin(
            BankAccounts,
            'b',
            `LOWER(TRIM(account.account_name)) = LOWER(TRIM(b.account_name))`,
          )
          .distinct(true)
          .where(
            `xero.company_id = :companyId and b.company_id = :companyId and b.status <> 'Deleted'`,
            {
              companyId: company_id,
            },
          )
          .orderBy({ 'account.account_name': 'ASC' })
          .getRawMany();
        // console.log('syncedRecords: ', syncedRecords);
        const newIds = new Set(newAccounts.map((r) => r.account_id));
        const existingIds = new Set(existingAccounts.map((r) => r.account_id));
        const syncedMap = new Map<number | string, any>();
        syncedRecords.forEach((record) => {
          syncedMap.set(record.account_id, record);
        });
        // console.log({ syncedMap });
        syncedData = accounts
          .map((record) => {
            const account_id = record.accountID;
            const syncedData = syncedMap.get(account_id);
            // console.log({ syncedData });
            let sync_status = 'Unsynced';

            if (newIds.has(account_id) && syncedData) {
              sync_status = 'Synced';
            } else if (existingIds.has(account_id) && syncedData) {
              sync_status = 'Already synced';
            }

            return {
              ...record,
              ...{
                pt_bank_account_id: syncedData?.pt_bank_account_id ?? null,
              },
              ...{
                pt_account_name: syncedData?.pt_account_name ?? null,
              },
              ...{
                pt_account_number: syncedData?.pt_account_number ?? null,
              },
              ...{
                pt_bsb_number: syncedData?.pt_bsb_number ?? null,
              },
              sync_status,
            };
          })
          .filter((record) => record.sync_status !== 'Already synced');
        // console.log({ syncedData });
        const allrecords = await this.xeroBankAccountDetails
          .createQueryBuilder('x')
          .select([
            `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
            'COUNT(*)::int AS count',
          ])
          .innerJoin(
            XeroIntegrationDetails,
            'xero',
            `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
          )
          .distinct(true)
          .where(`xero.company_id = :companyId`, {
            companyId: company_id,
          })
          .groupBy(
            `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
          )
          .getRawMany();

        allrecords.forEach((row) => {
          count[row.status] = row.count;
          count.total += row.count;
        });
        count.mapped =
          mappedAccounts && mappedAccounts[0] !== null
            ? mappedAccounts.length
            : 0;
      }

      if (
        xeroDetails.action_buttons.import_bank === false &&
        integrationDetails.integration_status === 'Pending bank account mapping'
      ) {
        const updateIntegrationResult = await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            integration_status: 'Pending contact mapping',
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: integrationDetails.id })
          .execute();
        // console.log(updateIntegrationResult);

        xeroDetails.action_buttons.import_bank = true;
        const updateXeroResult = await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            action_buttons: xeroDetails.action_buttons,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroDetails.id })
          .execute();
        // console.log(updateXeroResult);

        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            integration_id: integrationDetails.integration_id,
            log_template_id: 1,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Import successful'],
            important_checks: {},
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      } else {
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            integration_id: integrationDetails.integration_id,
            log_template_id: 5,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Sync successful'],
            important_checks: {},
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      }

      this.logger.log('All accounts fetched, inserted, and updated successfully');
      if (newAccounts || existingAccounts) {
        // return 'Data synced and automapped successfully';
        return framedResponse(
          'SUCCESS',
          `Data synced and automapped successfully`,
          count,
        );
      } else {
        // return 'No data available to sync';
        return framedResponse('ERROR', `No data available to sync`, count);
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getXeroBankAccountListsForCompany(data: GetXeroAccountListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroBankAccountDetails
        .createQueryBuilder('account')
        .select('account.id', 'id')
        .addSelect('account.account_id', 'account_id')
        .addSelect('account.tenant_id', 'tenant_id')
        .addSelect('account.account_name', 'account_name')
        .addSelect('account.account_number', 'account_number')
        .addSelect('account.bsb_number', 'bsb_number')
        .addSelect('account.description', 'description')
        .addSelect('account.account_status', 'account_status')
        .addSelect('account.pt_bank_account_id', 'pt_bank_account_id')
        .addSelect(
          `CASE WHEN account.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .addSelect('xero.company_id', 'company_id')
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = account.integration_id`,
        )
        .where(`xero.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`account.account_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(account.account_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `account.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`account.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(account.account_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'account_name':
            {
              queryBuilder.orderBy({
                'LOWER(account.account_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
              (data.page_number - 1) * data.page_size + data.page_size,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, account_list: finalResult };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getPaytradeAccountListsForCompany(data: GetPaytradeAccountListsInput) {
    try {
      const queryBuilder = await this.accountDetails
        .createQueryBuilder('a')
        .select('a.id', 'id')
        .addSelect('a.bank_account_id', 'account_id')
        .addSelect('a.account_name', 'account_name')
        .addSelect('a.status', 'account_status')
        .addSelect('account.account_id', 'xero_bank_account_id')
        .addSelect(
          `CASE WHEN account.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = a.company_id`,
        )
        .leftJoin(
          XeroBankAccountDetails,
          'account',
          'account.pt_bank_account_id = a.bank_account_id AND xero.integration_id = account.integration_id',
        )
        .where(`a.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(
          `a.added_by_client_supplier = false and a.status not in ('Closed', 'Deleted', 'Archived', 'Transferred')`,
        );

      if (data.search) {
        queryBuilder.andWhere(`(LOWER(a.account_name) LIKE LOWER(:keyword))`, {
          keyword: `%${data.search.toLowerCase()}%`,
        });
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `account.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`account.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(a.account_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'account_name':
            {
              queryBuilder.orderBy({
                'LOWER(a.account_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
              (data.page_number - 1) * data.page_size + data.page_size,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, account_list: finalResult };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getMappedAccountLists(data: GetMappedXeroAccountListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroBankAccountDetails
        .createQueryBuilder('account')
        .select([
          'account.id AS id',
          'account.account_id AS account_id',
          'account.tenant_id AS tenant_id',
          'account.account_name AS account_name',
          'account.account_number AS account_number',
          'account.bsb_number AS bsb_number',
          'account.account_status AS account_status',
          `CASE WHEN account.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
          'account.description AS description',
          'account.pt_bank_account_id AS pt_bank_account_id',
          'b.account_name AS pt_account_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = account.integration_id`,
        )
        .innerJoin(
          BankAccounts,
          'b',
          'b.bank_account_id = account.pt_bank_account_id',
        )
        .where(`account.mapped_status IN (:...mappedStatuses)`, {
          mappedStatuses: ['Manual', 'Auto', 'System'],
        })
        .andWhere(
          `xero.company_id = :companyId and b.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        )
        .andWhere(`account.account_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(account.account_name) LIKE LOWER(:keyword) OR LOWER(b.account_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(account.account_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'account_name':
            {
              queryBuilder.orderBy({
                'LOWER(account.account_name)': sorting_order,
              });
            }
            break;
          case 'pt_account_name':
            {
              queryBuilder.orderBy({
                'LOWER(b.account_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      return { total_count, account_list: rawResults };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async manualMappingAccount(
    data: YetToMapAccountsInput,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
          where: { company_id, status: 'ACTIVE' },
        })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const checkPaytradeId = await this.xeroBankAccountDetails.findOne({
        where: {
          pt_bank_account_id: data.pt_bank_account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.account_name) {
        throw `This account has been already mapped to xero account ${checkPaytradeId?.account_name}`;
      }

      const checkXeroId = await this.xeroBankAccountDetails.findOne({
        where: {
          account_id: data.account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_bank_account_id &&
        checkXeroId?.bankAccounts?.account_name
      ) {
        throw `This account has been already mapped to paytrade account ${checkXeroId?.bankAccounts?.account_name ? checkXeroId?.bankAccounts?.account_name : checkXeroId.pt_bank_account_id}`;
      }
      const response = await this.xeroBankAccountDetails
        .createQueryBuilder()
        .update(XeroBankAccountDetails)
        .set({
          pt_bank_account_id: data.pt_bank_account_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'account_id = :account_id AND integration_id = :integration_id',
          {
            account_id: data.account_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Accounts has been mapped successfully`;
      } else {
        return `Account is not mapped`;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async autoMappingAccount(company_id: number, decoded: any) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroBankAccountDetails
        .createQueryBuilder('account')
        .select([
          'account.id AS id',
          'account.account_id AS account_id',
          'account.tenant_id AS tenant_id',
          'account.account_name AS account_name',
          'account.account_number AS account_number',
          'account.bsb_number AS bsb_number',
          'account.account_status AS account_status',
          'account.description AS description',
          'b.bank_account_id AS pt_bank_account_id',
          'b.account_name AS pt_account_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = account.integration_id`,
        )
        .innerJoin(
          BankAccounts,
          'b',
          `LOWER(TRIM(account.account_name)) = LOWER(TRIM(b.account_name))`,
        )
        .distinct(true)
        .where(
          `xero.company_id = :companyId and b.company_id = :companyId and b.status <> 'Deleted'`,
          {
            companyId: company_id,
          },
        )
        .andWhere('account.pt_bank_account_id IS NULL');

      const rawResults = await queryBuilder
        .orderBy({ 'account.account_name': 'ASC' })
        .getRawMany();

      const yet_to_map = rawResults?.map((res) => ({
        account_id: res.account_id,
        pt_bank_account_id: res?.pt_bank_account_id,
      }));

      let mappedAccounts = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroBankAccountDetails
            .createQueryBuilder()
            .update(XeroBankAccountDetails)
            .set({
              pt_bank_account_id: element.pt_bank_account_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'account_id = :account_id AND integration_id = :integration_id',
              {
                account_id: element.account_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedAccounts.push(element.account_id);
        }
      }

      const allrecords = await this.xeroBankAccountDetails
        .createQueryBuilder('x')
        .select([
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
          'COUNT(*)::int AS count',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId`, {
          companyId: company_id,
        })
        .groupBy(
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
        )
        .getRawMany();

      const count = { mapped: 0, unmapped: 0, total: 0 };

      allrecords.forEach((row) => {
        count[row.status] = row.count;
        count.total += row.count;
      });
      count.mapped =
        mappedAccounts && mappedAccounts[0] !== null
          ? mappedAccounts.length
          : 0;
      if (yet_to_map && yet_to_map.length > 0) {
        return framedResponse(
          'SUCCESS',
          `Accounts has been auto mapped successfully`,
          count,
        );
      } else {
        return framedResponse(
          'ERROR',
          `No Accounts available for automapping.`,
          count,
        );
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async unMappingAccount(account_id: string, company_id: number, decoded: any) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
          where: { company_id, status: 'ACTIVE' },
        })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const response = await this.xeroBankAccountDetails
        .createQueryBuilder()
        .update(XeroBankAccountDetails)
        .set({
          pt_bank_account_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'account_id = :account_id AND integration_id = :integration_id',
          {
            account_id: account_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Accounts has been unmapped successfully`;
      } else {
        return `Accounts are not unmapped`;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async addBankAccountToXero(
    decoded,
    data: AddBankAccountInput,
    bank_account_id,
  ) {
    try {
      const accountDetails = await this.accountDetails.findOne({
        where: { bank_account_id },
      });
      if (!accountDetails) {
        throw `Account details not found`;
      }

      const xeroDetails = await this.xeroService.getIntegrationDetails(
        data.company_id,
      );

      if (
        xeroDetails &&
        xeroDetails.integration_id &&
        xeroDetails?.integrationDetails &&
        this.isXeroConnectionUsable(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        if (data.status === 'Draft') {
          const payload = {
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            account_id: accountDetails.id,
            account_name: accountDetails.account_name,
            account_number: accountDetails.account_number,
            bsb_number: accountDetails.bsb_number,
            account_status: 'DRAFT',
            mapped_status: 'System',
            description: accountDetails.account_type,
            pt_bank_account_id: bank_account_id,
            created_by: accountDetails.created_by,
            created_on: accountDetails.created_on,
            created_group: accountDetails.created_group,
          };

          const response: any = await this.insertAccountDetails(payload);
          this.logger.log(
            `Xero Account details inserted successfully with data: ${JSON.stringify(response)}`,
          );
          if (response) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                integration_id: xeroDetails.integration_id,
                log_template_id: 17,
                dynamic_values: { account_name: payload?.account_name },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: response?.id,
                  paytradeId: accountDetails?.id,
                },
                reference_id: accountDetails?.id,
                history: [
                  `API triggered from bank account ${payload?.account_name}`,
                  'Export will not occur in draft state',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [],
                paytrade_records: [accountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
        } else if (data.status === 'Open') {
          const xeroPayload = {
            bank_account_id,
            mapped_status: 'System',
          };

          const xeroResponse: any = await this.createBankAccount(
            decoded,
            xeroPayload,
          );
          this.logger.log(
            `Xero Account details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
          );
        }
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  async editBankAccountToXero(decoded, data: EditDetailsOfABankAccountInput) {
    try {
      const { bank_account_id } = data;

      const accountDetails = await this.accountDetails.findOne({
        where: { bank_account_id },
      });
      if (!accountDetails) {
        throw `Account details not found`;
      }

      const xeroDetails = await this.xeroService.getIntegrationDetails(
        accountDetails.company_id,
      );
      if (
        xeroDetails &&
        xeroDetails.integration_id &&
        xeroDetails?.integrationDetails &&
        xeroDetails?.integrationDetails?.integration_status ===
        'Connected - active'
      ) {
        const isAccountExists = await this.getAccountDetails(
          accountDetails.bank_account_id,
          xeroDetails.integration_id,
        );
        if (isAccountExists) {
          if (accountDetails.status === 'Draft' && data.status === 'Draft') {
            const payload = {
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              account_id: accountDetails.id,
              account_name: data.account_name,
              account_number: data.account_number,
              bsb_number: data.bsb_number,
              description: data.account_type,
              pt_bank_account_id: accountDetails.bank_account_id,
              updated_by: data.updated_by,
              updated_on: moment.tz('UTC'),
              updated_group: 'USER',
            };

            const response: any = await this.updateAccountDetails(payload);
            this.logger.log(
              `Xero Client supplier details inserted successfully with data: ${JSON.stringify(response)}`,
            );
            if (response) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 21,
                  dynamic_values: { account_name: payload?.account_name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: response?.id,
                    paytradeId: accountDetails?.id,
                  },
                  reference_id: accountDetails?.id,
                  history: [
                    `API triggered from bank account ${payload?.account_name}`,
                    'Export will not occur in draft state',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [],
                  paytrade_records: [accountDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
          } else if (
            accountDetails.status === 'Draft' &&
            data.status === 'Open'
          ) {
            const xeroPayload = {
              bank_account_id,
              mapped_status: 'System',
            };

            const xeroResponse: any = await this.createBankAccount(
              decoded,
              xeroPayload,
            );
            this.logger.log(
              `Xero account details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
            );
          } else if (accountDetails.status === 'Open') {
            const xeroPayload = {
              bank_account_id: accountDetails.bank_account_id,
            };
            const xeroResponse: any = await this.editBankAccount(
              decoded,
              xeroPayload,
            );
            this.logger.log(
              `Xero account details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
            );
          }
        }
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  async deleteBankAccountToXero(decoded, data: ChangeStatusOfBankAccountInput) {
    try {
      const { bank_account_id, status } = data;

      const accountDetails = await this.accountDetails.findOne({
        where: { bank_account_id },
      });
      if (!accountDetails) {
        throw `Account details not found`;
      }
      const xeroDetails = await this.xeroService.getIntegrationDetails(
        accountDetails.company_id,
      );
      if (
        xeroDetails &&
        xeroDetails.integration_id &&
        xeroDetails?.integrationDetails &&
        xeroDetails?.integrationDetails?.integration_status ===
        'Connected - active'
      ) {
        if (status === 'Deleted') {
          const isAccountExists = await this.getAccountDetails(
            accountDetails.bank_account_id,
            xeroDetails.integration_id,
          );
          if (isAccountExists) {
            const xeroPayload = {
              bank_account_id: accountDetails.bank_account_id,
            };
            const xeroResponse = await this.deleteBankAccount(
              decoded,
              xeroPayload,
            );
            this.logger.log(
              `Xero account details deleted successfully with data: ${JSON.stringify(xeroResponse)}`,
            );
          }
        }
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  async markSkipXeroAutoCreate(decoded: any, bank_account_id: number) {
    const userCompanyId = decoded?.companyId;
    if (!userCompanyId) throw `Unauthorized: company context missing`;

    const result = await this.accountDetails.update(
      { bank_account_id, company_id: userCompanyId },
      { skip_xero_auto_create: true },
    );

    if (!result.affected || result.affected === 0) {
      return framedResponse('ERROR', 'Bank account not found or does not belong to your company');
    }

    return framedResponse('SUCCESS', 'Bank account marked to skip auto-create in Xero');
  }

  async getIntegrationDetails(company_id) {
    return await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
  }

  async completeBankAccountDraft(decoded: any, data: any) {
    const { bank_account_id, sync_id } = data;

    const userCompanyId = decoded?.companyId;
    if (!userCompanyId) throw `Unauthorized: company context missing`;

    const accountDetails = await this.accountDetails.findOne({
      where: { bank_account_id, company_id: userCompanyId },
    });
    if (!accountDetails) throw `Bank account not found`;
    if (accountDetails.status !== 'Draft')
      throw `Only draft bank accounts can be completed`;

    if (!data.account_type || !data.financial_institution || !data.opening_date || !data.delegate_powers) {
      throw `Missing required fields: account_type, financial_institution, opening_date, delegate_powers`;
    }

    const validAccountTypes = ['Cash Account', 'Project Trust Account', 'Retention Trust Account'];
    if (!validAccountTypes.includes(data.account_type)) {
      throw `Invalid account type: ${data.account_type}`;
    }

    if (data.account_type === 'Project Trust Account') {
      if (!data.associated_cash_account_id) throw `Associated general account is required for Project Trust Accounts`;
      if (!data.trustee_id) throw `Trustee is required for Project Trust Accounts`;
    }
    if (data.account_type === 'Retention Trust Account') {
      if (!data.associated_cash_account_id) throw `Associated general account is required for Retention Trust Accounts`;
      if (!data.trustee_id) throw `Trustee is required for Retention Trust Accounts`;
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: userCompanyId, status: 'ACTIVE' },
    });
    if (!xeroDetails) throw `No xero integration found`;

    const updatePayload: Partial<BankAccounts> = {
      account_type: data.account_type,
      financial_institution: data.financial_institution,
      opening_date: data.opening_date,
      delegate_powers: data.delegate_powers,
      status: 'Active' as any,
      updated_by: decoded?.userId,
      updated_on: moment.tz('UTC'),
    };

    if (data.account_number) updatePayload.account_number = data.account_number;
    if (data.bsb_number) updatePayload.bsb_number = data.bsb_number;
    if (data.associated_cash_account_id)
      updatePayload.associated_cash_account_id = data.associated_cash_account_id;
    if (data.trustee_id) updatePayload.trustee_id = data.trustee_id;
    if (data.project_ids) updatePayload.project_ids = data.project_ids;
    if (data.client_supplier_id)
      updatePayload.client_supplier_id = data.client_supplier_id;
    if (data.contract_date) updatePayload.contract_date = data.contract_date;
    if (data.contract_practical_completion_date)
      updatePayload.contract_practical_completion_date =
        data.contract_practical_completion_date;
    if (data.first_sub_contract_date)
      updatePayload.first_sub_contract_date = data.first_sub_contract_date;
    if (data.contract_value) updatePayload.contract_value = data.contract_value;

    await this.accountDetails.update(
      { bank_account_id, company_id: userCompanyId },
      updatePayload,
    );

    if (sync_id) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: sync_id,
        api_name: 'completeBankAccountDraft',
        api_payload: data,
        integration_id: xeroDetails.integration_id,
        log_template_id: 468,
        dynamic_values: { account_name: accountDetails.account_name },
        project_id: null,
        contract_id: null,
        reference: { paytradeId: bank_account_id },
        reference_id: null,
        history: [
          `Draft bank account ${accountDetails.account_name} completed with required fields`,
          'Draft activated',
        ],
        important_checks: {},
        error_message: null,
        xero_records: [],
        paytrade_records: [accountDetails],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
    }

    return framedResponse(
      'SUCCESS',
      `Bank account ${accountDetails.account_name} has been activated`,
    );
  }

  /**
   * Task #122 — Bulk-create every unmapped active Xero bank account in
   * PayTrade. Mirrors the contacts equivalent: iterate the unmapped
   * `xero_bank_account_details` rows for the company's active Xero
   * integration, build a default-`Cash Account` payload from the Xero
   * record, and reuse the existing `insertAccountDetailsInPaytrade`
   * service path so account-type defaults, validation, Xero-side
   * `updateAccount` mapping and sync logging stay identical to the
   * per-row "Create in PayTrade" action. Each per-account create is
   * wrapped in its own try/catch so one bad account doesn't abort the
   * batch.
   *
   * Task #122 — Returns the number of Xero bank account rows for the
   * company that the bulk batch will actually try to create. Kept as a
   * single source of truth so the front-end count, the disabled-button
   * state, and the batch loop never disagree.
   */
  async countUnmappedActiveXeroAccounts(companyId: number): Promise<number> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: companyId, status: 'ACTIVE' },
    });
    if (!xeroDetails) {
      return 0;
    }
    return this.xeroBankAccountDetails.count({
      where: {
        integration_id: xeroDetails.integration_id,
        pt_bank_account_id: null as any,
        account_status: 'ACTIVE',
      },
    });
  }

  async batchCreateAccountsInPaytrade(
    decoded: any,
    companyId: number,
    // Task #123 — User-picked default account type from the bulk
    // dialog. Keep "Cash Account" as the fallback so the existing
    // one-click default behaviour stays intact when the caller omits
    // the argument.
    defaultAccountType?: string,
    // Task #123 — Per-row overrides keyed by Xero `account_id` so the
    // user can mark a subset of accounts as Project Trust / Retention
    // Trust without changing the default.
    accountTypeOverrides?: { account_id: string; account_type: string }[],
  ) {
    const result: {
      created: number;
      skipped: number;
      failed: number;
      errors: { account_id?: string; account_name?: string; reason: string }[];
    } = { created: 0, skipped: 0, failed: 0, errors: [] };
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: companyId, status: 'ACTIVE' },
      });
      if (!xeroDetails) {
        throw new Error('No active Xero integration found');
      }

      // Task #123 — Validate the picked account types up-front so a
      // typo in `default_account_type` doesn't silently fall back to
      // "Cash Account" for every row.
      const validAccountTypes = [
        'Cash Account',
        'Project Trust Account',
        'Retention Trust Account',
      ];
      const resolvedDefault =
        defaultAccountType && defaultAccountType.trim()
          ? defaultAccountType
          : 'Cash Account';
      if (!validAccountTypes.includes(resolvedDefault)) {
        throw new Error(
          `Invalid default account type: ${resolvedDefault}. Allowed: ${validAccountTypes.join(
            ', ',
          )}`,
        );
      }
      const overrideMap = new Map<string, string>();
      for (const o of accountTypeOverrides || []) {
        if (!o?.account_id || !o?.account_type) continue;
        if (!validAccountTypes.includes(o.account_type)) {
          throw new Error(
            `Invalid account type override for ${o.account_id}: ${o.account_type}`,
          );
        }
        overrideMap.set(o.account_id, o.account_type);
      }

      const unmappedAccounts = await this.xeroBankAccountDetails.find({
        where: {
          integration_id: xeroDetails.integration_id,
          pt_bank_account_id: null as any,
          account_status: 'ACTIVE',
        },
      });

      for (const xeroAccount of unmappedAccounts) {
        // Task #123 — Resolve the per-row account type: row override
        // wins, otherwise fall back to the dialog default.
        const rowAccountType =
          overrideMap.get(xeroAccount.account_id) || resolvedDefault;
        try {
          const acctNumStr = (xeroAccount.account_number || '').toString();
          const bsbNum =
            xeroAccount.bsb_number != null
              ? Number(xeroAccount.bsb_number)
              : null;

          const payload: any = {
            company_id: companyId,
            account_name: xeroAccount.account_name,
            account_type: rowAccountType,
            account_number: acctNumStr,
            bsb_number: bsbNum,
            financial_institution: xeroAccount.account_name || 'Unknown',
            opening_date: new Date(),
            delegate_powers: 'No',
            status: 'Open',
            project_ids: [],
          };

          const response = await this.insertAccountDetailsInPaytrade(decoded, {
            company_id: companyId,
            account_id: xeroAccount.account_id,
            sync_id: null,
            payload,
          });

          if (response && response.id) {
            result.created++;
          } else {
            result.skipped++;
            // Task #123 — Trust account types need extra fields
            // (trustee, projects, contract dates) that the bulk
            // dialog can't reasonably collect per row. Surface a
            // type-specific reason so the user knows to finish the
            // setup in PayTrade's bank account form.
            let reason: string;
            if (rowAccountType === 'Project Trust Account') {
              reason =
                'Skipped — Project Trust accounts need trustee, associated cash account, project, client/supplier, contract dates and contract value. ' +
                'Create the row as Cash Account here, or finish the trust-account fields in PayTrade.';
            } else if (rowAccountType === 'Retention Trust Account') {
              reason =
                'Skipped — Retention Trust accounts need trustee, associated cash account and projects. ' +
                'Create the row as Cash Account here, or finish the trust-account fields in PayTrade.';
            } else {
              reason =
                'Skipped — missing required fields (e.g. BSB or account number) or subscription cap reached. See Xero sync logs for details.';
            }
            result.errors.push({
              account_id: xeroAccount.account_id,
              account_name: xeroAccount.account_name,
              reason,
            });
          }
        } catch (err) {
          const msg =
            typeof err === 'string'
              ? err
              : err?.message || JSON.stringify(err);
          if (
            msg &&
            msg.toLowerCase().includes('mapped to some other bank account')
          ) {
            result.skipped++;
          } else {
            result.failed++;
          }
          result.errors.push({
            account_id: xeroAccount.account_id,
            account_name: xeroAccount.account_name,
            reason: msg || 'Unknown error',
          });
          this.logger.warn(
            `Batch create in PayTrade failed for Xero bank account ${xeroAccount.account_id}: ${msg}`,
          );
        }
      }

      return result;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }
}
