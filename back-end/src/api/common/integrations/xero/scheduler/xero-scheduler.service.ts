import { Injectable } from '@nestjs/common';
import {
  Account,
  Address,
  Contact,
  Invoice,
  LineAmountTypes,
  Phone,
  TrackingOption,
  XeroClient,
} from 'xero-node';
import * as dotenv from 'dotenv';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Repository,
  DataSource,
  Not,
  LessThan,
  LessThanOrEqual,
} from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { Cron } from '@nestjs/schedule';
import { Group, UserDetails } from 'src/entities/user-details.entity';
import { handleAxiosError } from 'src/api/common/error-handler';
import { XeroService } from '../xero.service';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroWebhookService } from 'src/api/common/xero-webhooks/webhook.service';
import { ProjectsService } from 'src/api/users/projects/projects.service';
import { ContractDetailsService } from 'src/api/users/contract-details/contract-details.service';
import { BankAccountsService } from 'src/api/users/banking/bank-accounts/bank-accounts.service';
import { ClientSuppliersDetailsService } from 'src/api/users/client-suppliers-details/client-suppliers-details.service';
import { XeroAccountsService } from '../accounts/xero-accounts.service';
import { XeroContactsService } from '../contacts/xero-contacts.service';
import { EditDetailsOfABankAccountInput } from 'src/api/users/banking/bank-accounts/bank-accounts.input';
import { UpdateClientSuppliersDetailInput } from 'src/api/users/client-suppliers-details/dto/update-client-suppliers-detail.input';
import { XeroProjectsService } from '../projects/xero-projects.service';
import { XeroContractsService } from '../contracts/xero-contracts.service';
import { UpdateProjectInput } from 'src/api/users/projects/dto/update-project.input';
import axios from 'axios';
import { XeroResolver } from '../xero.resolver';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { JwtService } from '@nestjs/jwt';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';

dotenv.config();

@Injectable()
export class XeroSchedulerService {
  private logger = new PaytradeLogger('XERO_SCHEDULER_SERVICE');
  private xero: XeroClient;
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    @InjectRepository(XeroBankAccountDetails)
    private xeroBankAccountDetails: Repository<XeroBankAccountDetails>,
    @InjectRepository(XeroContactDetails)
    private xeroContactDetails: Repository<XeroContactDetails>,
    @InjectRepository(XeroProjectDetails)
    private xeroProjectDetails: Repository<XeroProjectDetails>,
    @InjectRepository(XeroContractDetails)
    private xeroContractDetails: Repository<XeroContractDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(XeroSyncLogs)
    private xeroSyncLogs: Repository<XeroSyncLogs>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    private readonly jwtService: JwtService,
    private authService: AuthService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
    private readonly xeroWebhookService: XeroWebhookService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly clientSuppliersDetailsService: ClientSuppliersDetailsService,
    private readonly projectsService: ProjectsService,
    private readonly contractDetailsService: ContractDetailsService,
    private readonly xeroAccountsService: XeroAccountsService,
    private readonly xeroContactsService: XeroContactsService,
    private readonly xeroProjectsService: XeroProjectsService,
    private readonly xeroContractsService: XeroContractsService,
  ) {
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

  @Cron('0 13 * * *', { timeZone: 'UTC' })
  async checkSubscriptionExpiryAndUpdateXeroJob() {
    try {
      this.logger.log('Expiry check starts');
      const expiredSubscriptionDetails = await this.subscriptionDetails.find({
        where: {
          status: In(['Subscribed', 'Cancelled', 'Unsubscribed']),
          is_free_plan_eligible: false,
          expiry_date: LessThanOrEqual(new Date()),
        },
        select: [
          'id',
          'subscription_id',
          'company_id',
          'expiry_date',
          'amount',
          'status',
        ],
        order: { company_id: 'DESC' },
      });

      this.logger.log(`expiredSubscriptionDetails: ${JSON.stringify(expiredSubscriptionDetails)}`);
      if (
        expiredSubscriptionDetails &&
        expiredSubscriptionDetails?.length > 0
      ) {
        const expiredCompanyIds = [
          ...new Set(expiredSubscriptionDetails.map((r) => r.company_id)),
        ];

        this.logger.log(`expiredCompanyIds: ${JSON.stringify(expiredCompanyIds)}`);
        const expireIntegrations = await this.integrationDetails.find({
          where: {
            company_id: In(expiredCompanyIds),
            integration_status: Not(In(['Inactive', 'Deleted - archived'])),
          },
          order: { company_id: 'DESC' },
        });

        this.logger.log(`expireIntegrations: ${JSON.stringify(expireIntegrations)}`);
        if (expireIntegrations && expireIntegrations?.length > 0) {
          const expiredIntegrationIds = [
            ...new Set(expireIntegrations.map((r) => r.integration_id)),
          ];

          this.logger.log(`expiredIntegrationIds: ${JSON.stringify(expiredIntegrationIds)}`);
          const updateIntegrationResult = await this.integrationDetails
            .createQueryBuilder()
            .update(IntegrationDetails)
            .set({
              previous_status: () =>
                `(integration_status)::text::integration_details_previous_status_enum`,
              integration_status: 'Inactive',
              updated_on: moment.tz('UTC'),
              updated_group: 'SYSTEM',
            })
            .where(`integration_id IN (:...integration_id)`, {
              integration_id: expiredIntegrationIds,
            })
            .execute();

          this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
          this.logger.log('Integration updated for expired subscriptions!');
        } else {
          this.logger.log('No integration found for expired subscriptions!');
        }
      } else {
        this.logger.log('No expired subscriptions!');
      }
    } catch (error) {
      this.logger.error(
        `Error in check subscription expiry scheduler: ${error?.message ? error.message : error}`,
      );
    }
  }

  // @Cron('0 8 * * *', {
  //   timeZone: 'UTC',
  // // })
  // @Cron('*/15 * * * *', {
  //   timeZone: 'UTC',
  // })
  // @Cron('0 0 * * *', { timeZone: 'UTC' })
  // @Cron('45 11 * * *', {
  //   timeZone: 'Australia/Sydney',
  // })
  @Cron('0 13 * * *', { timeZone: 'UTC' })
  async checkAndRunJobs() {
    try {
      this.logger.log('Starts');
      const integrationDetails = await this.integrationDetails.find({
        where: {
          integration_status: Not('Deleted - archived'),
        },
        order: { company_id: 'DESC' },
      });
      if (
        integrationDetails &&
        integrationDetails.length > 0 &&
        integrationDetails[0] !== null
      ) {
        for (const element of integrationDetails) {
          this.logger.log(`element.company_id: ${element.company_id}`);
          // if (element?.company_id === 1057) {
          if (element?.integration_status === 'Connected - active') {
            const getXeroDetails = await this.xeroIntegrationDetails.findOne({
              where: { company_id: element.company_id, status: 'ACTIVE' },
            });
            if (getXeroDetails) {
              try {
                await this.xeroService.refreshTokenSet(
                  element.company_id,
                  this.xero,
                );
              } catch (err) {
                const error = await handleAxiosError(err);
                this.logger.error(`[Xero Scheduler] Failed in scheduler: ${error}`);

                const isRefreshToken =
                  await this.xeroResolver.refreshTokenReAuthenticate({
                    error,
                  });

                if (isRefreshToken) {
                  continue;
                }
              }

              const xeroDetails = await this.xeroIntegrationDetails.findOne({
                where: { company_id: element.company_id, status: 'ACTIVE' },
              });
              if (xeroDetails) {
                const getConnections = await axios.get(
                  'https://api.xero.com/connections',
                  {
                    headers: {
                      Authorization: `Bearer ${xeroDetails?.access_token}`,
                    },
                  },
                );
                this.logger.log(`getConnections: ${getConnections?.status}`);

                const connections =
                  getConnections.status === 200 ? getConnections.data : [];

                const connection = connections?.filter(
                  (connection) =>
                    connection?.tenantId === xeroDetails?.tenant_id,
                );
                this.logger.log(`connection: ${JSON.stringify(connection)}`);
                if (!connection || connection?.length == 0) {
                  const updateXeroResult = await this.xeroIntegrationDetails
                    .createQueryBuilder()
                    .update(XeroIntegrationDetails)
                    .set({
                      status: 'INACTIVE',
                      access_token: null,
                      id_token: null,
                      refresh_token: null,
                      expires_at: null,
                      updated_on: moment.tz('UTC'),
                      updated_group: 'SYSTEM',
                    })
                    .where(`id = :id`, { id: xeroDetails?.id })
                    .execute();

                  this.logger.log(`updateXeroResult: ${JSON.stringify(updateXeroResult)}`);

                  const getIntegrationDetails =
                    await this.integrationDetails.findOne({
                      where: { integration_id: xeroDetails?.integration_id },
                    });

                  const updateIntegrationResult = await this.integrationDetails
                    .createQueryBuilder()
                    .update(IntegrationDetails)
                    .set({
                      previous_status: getIntegrationDetails.integration_status,
                      integration_status: 'Inactive',
                      updated_on: moment.tz('UTC'),
                      updated_group: 'SYSTEM',
                    })
                    .where(`id = :id`, { id: getIntegrationDetails?.id })
                    .execute();

                  this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
                } else {
                  const companyAdmin = await this.userRoles.findOne({
                    where: {
                      company_id: element.company_id,
                      company_role: In(['PRIMARY ADMIN']),
                      status: 'Active',
                    },
                    relations: ['userDetails'],
                  });

                  const authResponse = await this.authService.getAuthToken(
                    companyAdmin?.userDetails?.email_id,
                    false,
                  );

                  this.logger.log(`authResponse access_token: ${authResponse.data['access_token']}`);
                  const decoded = this.jwtService.decode(
                    authResponse.data['access_token'],
                  );

                  const isRefreshed = await this.refreshAllByCompanyId(
                    decoded,
                    element.company_id,
                  );
                  this.logger.log(`isRefreshed: ${JSON.stringify(isRefreshed)}`);
                }
              }
            }
          } else {
            const getXeroDetails = await this.xeroIntegrationDetails.findOne({
              where: { company_id: element.company_id, status: 'ACTIVE' },
            });
            if (getXeroDetails) {
              await this.xeroService.refreshTokenSet(
                element.company_id,
                this.xero,
              );

              const xeroDetails = await this.xeroIntegrationDetails.findOne({
                where: { company_id: element.company_id, status: 'ACTIVE' },
              });
              if (xeroDetails) {
                const getConnections = await axios.get(
                  'https://api.xero.com/connections',
                  {
                    headers: {
                      Authorization: `Bearer ${xeroDetails?.access_token}`,
                    },
                  },
                );
                this.logger.log(`getConnections: ${getConnections.status}`);
                const connections =
                  getConnections.status === 200 ? getConnections.data : [];

                const connection = connections?.filter(
                  (connection) =>
                    connection?.tenantId === xeroDetails?.tenant_id,
                );
                this.logger.log(`connection: ${JSON.stringify(connection)}`);

                if (!connection || connection?.length == 0) {
                  const updateXeroResult = await this.xeroIntegrationDetails
                    .createQueryBuilder()
                    .update(XeroIntegrationDetails)
                    .set({
                      status: 'INACTIVE',
                      access_token: null,
                      id_token: null,
                      refresh_token: null,
                      expires_at: null,
                      updated_on: moment.tz('UTC'),
                      updated_group: 'SYSTEM',
                    })
                    .where(`id = :id`, { id: xeroDetails?.id })
                    .execute();

                  this.logger.log(`updateXeroResult: ${JSON.stringify(updateXeroResult)}`);

                  const getIntegrationDetails =
                    await this.integrationDetails.findOne({
                      where: { integration_id: xeroDetails?.integration_id },
                    });

                  const updateIntegrationResult = await this.integrationDetails
                    .createQueryBuilder()
                    .update(IntegrationDetails)
                    .set({
                      previous_status: getIntegrationDetails.integration_status,
                      integration_status: 'Inactive',
                      updated_on: moment.tz('UTC'),
                      updated_group: 'SYSTEM',
                    })
                    .where(`id = :id`, { id: getIntegrationDetails?.id })
                    .execute();

                  this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
                }
              }
            }
          }
          // }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in Xero scheduler: ${error?.message ? error.message : error}`,
      );
    }
  }

  async refreshAllByCompanyId(decoded: any, company_id: number) {
    try {
      const newAccounts = await this.refreshAccounts(decoded, company_id);
      this.logger.log(`newAccounts: ${JSON.stringify(newAccounts)}`);
      const newContacts = await this.refreshContacts(decoded, company_id);
      this.logger.log(`newContacts: ${JSON.stringify(newContacts)}`);
      const newProjects = await this.refreshProjects(decoded, company_id);
      this.logger.log(`newProjects: ${JSON.stringify(newProjects)}`);
      const newContracts = await this.refreshContracts(decoded, company_id);
      this.logger.log(`newContracts: ${JSON.stringify(newContracts)}`);
      const newInvoices = await this.refreshInvoicesAndBills(
        decoded,
        company_id,
      );
      this.logger.log(`newInvoices: ${JSON.stringify(newInvoices)}`);

      return {
        newAccounts,
        newContacts,
        newProjects,
        newContracts,
        newInvoices,
      };
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      this.logger.log(`error::: ${errMsg}`);
      // throw errMsg;
    }
  }

  async refreshAccounts(decoded: any, company_id: number) {
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const userId = decoded ? decoded.userId : null;
      const createdGroup = decoded ? 'USER' : 'SYSTEM';
      const mappedStatus = decoded ? 'Auto' : 'System';
      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = 'Type=="BANK"';
      const order = 'Name ASC';

      let newAccounts = [];
      let existingAccounts = [];
      let allBankAccounts = [];

      let oldData = [],
        newData = [],
        syncedData = [],
        mappedAccounts = [];

      const response = await this.xero.accountingApi.getAccounts(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
      );

      const accounts = response.body.accounts || [];

      if (accounts && accounts[0] !== null && accounts.length !== 0) {
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
        accounts.forEach((account) => {
          const accountData: any = {
            account_id: account.accountID,
            integration_id: xeroDetails.integration_id,
            tenant_id: xeroDetails.tenant_id,
            account_name: account.name,
            account_number: account.bankAccountNumber?.slice(6),
            bsb_number: account.bankAccountNumber?.slice(0, 6),
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

        if (newAccounts.length > 0) {
          const xeroBankAccountDetails =
            await this.xeroBankAccountDetails.create(newAccounts);
          await this.xeroBankAccountDetails.save(xeroBankAccountDetails);
        }

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
        }

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
            'LOWER(TRIM(account.account_name)) = LOWER(TRIM(b.account_name))',
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

        const yet_to_map = autoMappingRecords?.map((res) => ({
          account_id: res.account_id,
          pt_bank_account_id: res?.pt_bank_account_id,
        }));

        if (yet_to_map && yet_to_map.length > 0) {
          for (const element of yet_to_map) {
            await this.xeroBankAccountDetails
              .createQueryBuilder()
              .update(XeroBankAccountDetails)
              .set({
                pt_bank_account_id: element.pt_bank_account_id,
                mapped_status: mappedStatus,
                updated_by: userId,
                updated_on: moment.tz('UTC'),
                updated_group: createdGroup,
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

        allBankAccounts = await this.xeroBankAccountDetails.find({
          where: { integration_id: xeroDetails.integration_id },
          select: ['account_id', 'pt_bank_account_id', 'account_status'],
        });

        if (allBankAccounts && allBankAccounts?.length > 0) {
          for (const element of allBankAccounts) {
            const requestData = {
              account_id: element?.account_id,
              account_status:
                accounts?.find(
                  (item) => item?.accountID === element?.account_id,
                )?.status || 'ARCHIVED',
              company_id,
              sync_id: null,
              decoded,
              payload: {},
            };
            const response: any =
              await this.createOrUpdateAccountInPaytrade(requestData);

            if (response) {
              if (
                !oldData.some(
                  (item) => item.accountID === response.accountID,
                ) &&
                !newData.some((item) => item.accountID === response.accountID)
              ) {
                newData.push(response);
              } else if (
                oldData.some((item) => item.accountID === response.accountID) &&
                response.sync_id
              ) {
                for (const element of oldData) {
                  if (
                    element.accountID === response.accountID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              } else if (
                newData.some((item) => item.accountID === response.accountID) &&
                response.sync_id
              ) {
                for (const element of newData) {
                  if (
                    element.accountID === response.accountID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              }
            }
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
            'account.pt_bank_account_id = b.bank_account_id',
          )
          .distinct(true)
          .where(`xero.company_id = :companyId and b.company_id = :companyId`, {
            companyId: company_id,
          })
          .orderBy({ 'account.account_name': 'ASC' })
          .getRawMany();

        const newIds = new Set(newData.map((r) => r.accountID));
        const existingIds = new Set(oldData.map((r) => r.accountID));
        const syncedMap = new Map<number | string, any>();
        syncedRecords.forEach((record) => {
          syncedMap.set(record.account_id, record);
        });
        syncedData = accounts
          .map((record) => {
            const account_id = record.accountID;
            const syncedData = syncedMap.get(account_id);
            let sync_status = 'Unsynced';
            let sync_id = null;

            if (newIds.has(account_id) && syncedData) {
              sync_status = 'Synced';
            } else if (newIds.has(account_id) && !syncedData) {
              sync_status = 'Unsynced';
              sync_id =
                newData.find((element) => element?.accountID === account_id)
                  ?.sync_id || null;
            } else if (existingIds.has(account_id) && syncedData) {
              sync_status = 'Already synced';
            }

            return {
              ...record,
              pt_bank_account_id: syncedData?.pt_bank_account_id ?? null,
              pt_account_name: syncedData?.pt_account_name ?? null,
              pt_account_number: syncedData?.pt_account_number ?? null,
              pt_bsb_number: syncedData?.pt_bsb_number ?? null,
              sync_status,
              sync_id,
            };
          })
          .filter((record) => record.sync_status !== 'Already synced');

        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            integration_id: xeroDetails.integration_id,
            log_template_id: 381,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from bank account scheduler`,
              'Sync successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: accounts,
            paytrade_records: allBankAccounts,
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
      }

      return newAccounts;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      this.logger.error(`[Xero Scheduler] Failed in Account scheduler: ${error}`);
      throw errMsg;
    }
  }

  async createOrUpdateAccountInPaytrade(data: any) {
    const { account_id, company_id, sync_id, decoded } = data;
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const xeroAccountDetails =
        await this.xeroAccountsService.getAccountDetailsByAccountId(
          account_id,
          xeroDetails.integration_id,
        );
      xeroAccountDetails.account_status = data?.account_status;
      await this.xeroBankAccountDetails.save(xeroAccountDetails);

      if (xeroAccountDetails?.pt_bank_account_id) {
        const accountDetails =
          await this.xeroAccountsService.getAccountsDetails(
            xeroAccountDetails?.pt_bank_account_id,
          );
        if (xeroAccountDetails && accountDetails) {
          if (xeroAccountDetails?.account_status === 'ACTIVE') {
            const account =
              await this.xeroAccountsService.getBankAccountByAccountId(
                account_id,
                company_id,
              );
            if (
              xeroAccountDetails?.account_name !==
                accountDetails?.account_name ||
              xeroAccountDetails?.bsb_number !== accountDetails?.bsb_number ||
              xeroAccountDetails?.account_number !==
                accountDetails?.account_number
            ) {
              const payload: EditDetailsOfABankAccountInput = {
                company_id,
                bank_account_id: accountDetails?.bank_account_id,
                account_name: xeroAccountDetails?.account_name,
                account_number: xeroAccountDetails?.account_number,
                bsb_number: xeroAccountDetails?.bsb_number,
                apca_number: accountDetails?.apca_number,
                account_type: accountDetails?.account_type,
                project_ids: accountDetails?.project_ids,
                trustee_id: accountDetails?.trustee_id,
                client_supplier_id: accountDetails?.client_supplier_id,
                contract_date: accountDetails?.contract_date,
                opening_date: accountDetails?.opening_date,
                contract_practical_completion_date:
                  accountDetails?.contract_practical_completion_date,
                first_sub_contract_date:
                  accountDetails?.first_sub_contract_date,
                contract_value: accountDetails?.contract_value,
                retention_trust_certificate_attachment_ids:
                  accountDetails?.retention_trust_certificate_attachment_ids,
                financial_institution: accountDetails?.financial_institution,
                delegate_powers: accountDetails?.delegate_powers,
                updated_by: decoded?.userId,
                status: accountDetails?.status,
                associated_cash_account_id:
                  accountDetails?.associated_cash_account_id,
              };
              const editBankDetails =
                await this.bankAccountsService.editDetailsOfABankAccount(
                  decoded,
                  payload,
                );
              this.logger.log(`editBankDetails: ${JSON.stringify(editBankDetails)}`);
              if (
                editBankDetails &&
                editBankDetails?.warning &&
                editBankDetails?.warningMessage
                  ?.toLowerCase()
                  ?.includes(
                    'Please upgrade your subscription plan'.toLowerCase(),
                  )
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateAccountInPaytrade',
                  api_payload: {
                    account_id,
                    account_name: account.name,
                    account_number: account.bankAccountNumber?.slice(6),
                    bsb_number: Number(account.bankAccountNumber?.slice(0, 6)),
                    payload: payload || {},
                    account_status: data?.account_status,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 388,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroAccountDetails?.id,
                    paytradeId: accountDetails?.id,
                  },
                  reference_id: xeroAccountDetails?.id,
                  history: [
                    `API triggered from bank account scheduler ${account?.name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                  },
                  error_message: editBankDetails?.warningMessage,
                  xero_records: [account],
                  paytrade_records: [accountDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            }
            return account;
          } else if (
            xeroAccountDetails?.account_status !== 'ACTIVE' &&
            ['Draft', 'Open', 'Active']?.includes(accountDetails?.status)
          ) {
            const deleteBankDetails =
              await this.bankAccountsService.changeStatusOfBankAccount(
                decoded,
                {
                  bank_account_id: accountDetails?.bank_account_id,
                  status: 'Deleted',
                },
              );
            this.logger.log(`deleteBankDetails: ${JSON.stringify(deleteBankDetails)}`);
            if (
              deleteBankDetails &&
              deleteBankDetails?.warning &&
              deleteBankDetails?.warningMessage
                ?.toLowerCase()
                ?.includes(
                  'Please upgrade your subscription plan'.toLowerCase(),
                )
            ) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createOrUpdateAccountInPaytrade',
                api_payload: {
                  account_id,
                  bank_account_id: accountDetails?.bank_account_id,
                  account_status: data?.account_status,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 388,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: xeroAccountDetails?.id,
                  paytradeId: accountDetails?.id,
                },
                reference_id: xeroAccountDetails?.id,
                history: [
                  `API triggered from bank account scheduler ${accountDetails?.account_name}`,
                  'Import failed',
                ],
                important_checks: {
                  'Import data format validation': 'Failed',
                },
                error_message: deleteBankDetails?.warningMessage,
                xero_records: [],
                paytrade_records: [accountDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
          }
        }
      } else {
        const account =
          await this.xeroAccountsService.getBankAccountByAccountId(
            account_id,
            company_id,
          );
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
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'createOrUpdateAccountInPaytrade',
              api_payload: {
                account_id,
                account_name: account.name,
                account_number: account.bankAccountNumber?.slice(6),
                bsb_number: Number(account.bankAccountNumber?.slice(0, 6)),
                account_status: account.status,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 379,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: { xeroId: xeroAccountDetails?.id, paytradeId: null },
              reference_id: xeroAccountDetails?.id,
              history: [
                `API triggered from bank account scheduler ${account.name}`,
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
            },
          );
          return {
            ...account,
            sync_id: addSyncLogResponse?.id,
          };
        } else {
          const bankResponse = await this.bankAccountsService.addBankAccount(
            decoded,
            data.payload,
            decoded?.userId,
          );

          let warningMessage, bank_account_id;
          if (bankResponse && 'warningMessage' in bankResponse) {
            warningMessage = bankResponse.warningMessage;
          }
          if (bankResponse && 'bank_account_id' in bankResponse) {
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
              api_name: 'createOrUpdateAccountInPaytrade',
              api_payload: {
                account_id,
                account_name: account.name,
                account_number: account.bankAccountNumber?.slice(6),
                bsb_number: Number(account.bankAccountNumber?.slice(0, 6)),
                payload: data.payload || {},
                account_status: data?.account_status,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 388,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroAccountDetails?.id,
                paytradeId: null,
              },
              reference_id: xeroAccountDetails?.id,
              history: [
                `API triggered from bank account scheduler ${account?.name}`,
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
            const paytradeAccountDetails =
              await this.xeroAccountsService.getAccountsDetails(
                bank_account_id,
              );

            const updateBankAccountResponse =
              await this.xero.accountingApi.updateAccount(
                xeroDetails.tenant_id,
                account_id,
                {
                  accounts: [
                    {
                      name: paytradeAccountDetails.account_name,
                      bankAccountNumber:
                        String(paytradeAccountDetails.bsb_number) +
                        paytradeAccountDetails.account_number,
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
                  account_id: account_id,
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
            xeroBankAccountDetails.pt_bank_account_id = bank_account_id;
            xeroBankAccountDetails.mapped_status = 'System';
            xeroBankAccountDetails.updated_by =
              paytradeAccountDetails.created_by;
            xeroBankAccountDetails.updated_on = moment.tz('UTC');
            xeroBankAccountDetails.updated_group = 'USER';
            await this.xeroBankAccountDetails.save(xeroBankAccountDetails);

            if (sync_id) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createOrUpdateAccountInPaytrade',
                api_payload: {
                  account_id,
                  account_name: account.name,
                  account_number: account.bankAccountNumber?.slice(6),
                  bsb_number: Number(account.bankAccountNumber?.slice(0, 6)),
                  account_status: account.status,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 380,
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
                  `API triggered from bank account scheduler ${paytradeAccountDetails?.account_name}`,
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
            }
            return account;
          }
        }
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Account scheduler: ${error}`);

      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createOrUpdateAccountInPaytrade',
            api_payload: {
              account_id,
              tenant_id: xeroDetails?.tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from bank account scheduler`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Scheduler] Failed in account scheduler: ${error}`);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async refreshContacts(decoded: any, company_id: number) {
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const userId = decoded ? decoded.userId : null;
      const createdGroup = decoded ? 'USER' : 'SYSTEM';
      const mappedStatus = decoded ? 'Auto' : 'System';
      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = null;
      const order = 'Name ASC';
      const contactIds = [];
      const includeArchived = true; //ARCHIVED
      const summaryOnly = true; //Use summaryOnly=true
      const searchTerm = '';
      let page = 1;
      const pageSize = 500;
      let hasMoreContacts = true;

      let allXeroContacts = [];
      let newContacts = [];
      let existingContacts = [];
      let allContacts = [];

      let oldData = [],
        newData = [],
        syncedData = [],
        mappedContacts = [];

      while (hasMoreContacts) {
        const response = await this.xero.accountingApi.getContacts(
          xeroDetails.tenant_id,
          ifModifiedSince,
          where,
          order,
          contactIds,
          page,
          includeArchived,
          summaryOnly,
          searchTerm,
          pageSize,
        );

        const contacts = response.body.contacts || [];

        if (contacts.length === 0) {
          hasMoreContacts = false;
        } else {
          const contactIdsInDb = await this.xeroContactDetails.find({
            where: {
              contact_id: In(contacts.map((c) => c.contactID)),
              integration_id: xeroDetails.integration_id,
            },
            select: ['contact_id'],
          });
          const existingContactIds = new Set(
            contactIdsInDb.map((c) => c.contact_id),
          );

          const existingContactIdsSet = new Set(existingContactIds);
          contacts.forEach((contact) => {
            this.logger.log(`contact: ${contact.contactStatus}`);
            allXeroContacts.push(contact);
            const contactData: any = {
              contact_id: contact.contactID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_name: contact.name,
              contact_status: contact.contactStatus,
              is_supplier: contact.isSupplier || false,
              is_customer: contact.isCustomer || false,
              created_on: contact.updatedDateUTC,
              merge_to_contact_id: contact.mergedToContactID || null,
            };

            if (existingContactIdsSet.has(String(contact.contactID))) {
              if (
                !existingContacts.some(
                  (c) => c.contact_id === String(contact.contactID),
                )
              ) {
                existingContacts.push(contactData);
                oldData.push(contact);
              }
            } else {
              if (
                contactData &&
                contactData?.contact_status === Contact.ContactStatusEnum.ACTIVE
              ) {
                newContacts.push(contactData);
                newData.push(contact);
              }
            }
          });

          if (newContacts.length > 0) {
            const xeroContactDetails =
              await this.xeroContactDetails.create(newContacts);
            await this.xeroContactDetails.save(xeroContactDetails);
          }

          if (existingContacts.length > 0) {
            for (const contact of existingContacts) {
              await this.xeroContactDetails.update(
                {
                  contact_id: contact.contact_id,
                  integration_id: xeroDetails.integration_id,
                },
                contact,
              );
            }
          }

          const autoMappingRecords = await this.xeroContactDetails
            .createQueryBuilder('contact')
            .select([
              'contact.id AS id',
              'contact.contact_id AS contact_id',
              'contact.tenant_id AS tenant_id',
              'contact.merge_to_contact_id AS merge_to_contact_id',
              'contact.contact_name AS contact_name',
              'contact.contact_status AS contact_status',
              'c.client_supplier_id AS pt_contact_id',
              'c.client_supplier_name AS pt_contact_name',
            ])
            .innerJoin(
              XeroIntegrationDetails,
              'xero',
              `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
            )
            .innerJoin(
              ClientSuppliersDetails,
              'c',
              'LOWER(TRIM(contact.contact_name)) = LOWER(TRIM(c.client_supplier_name))',
            )
            .distinct(true)
            .where(
              `xero.company_id = :companyId and c.company_id = :companyId and c.is_deleted = false`,
              {
                companyId: company_id,
              },
            )
            .andWhere('contact.pt_contact_id IS NULL')
            .orderBy({ 'contact.contact_name': 'ASC' })
            .getRawMany();

          const yet_to_map = autoMappingRecords?.map((res) => ({
            contact_id: res.contact_id,
            pt_contact_id: res?.pt_contact_id,
          }));

          if (yet_to_map && yet_to_map.length > 0) {
            for (const element of yet_to_map) {
              await this.xeroContactDetails
                .createQueryBuilder()
                .update(XeroContactDetails)
                .set({
                  pt_contact_id: element.pt_contact_id,
                  mapped_status: mappedStatus,
                  updated_by: userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: createdGroup,
                })
                .where(
                  'contact_id = :contact_id AND integration_id = :integration_id',
                  {
                    contact_id: element.contact_id,
                    integration_id: xeroDetails.integration_id,
                  },
                )
                .execute();
              mappedContacts.push(element.contact_id);
            }
          }

          allContacts = await this.xeroContactDetails.find({
            where: { integration_id: xeroDetails.integration_id },
            select: ['contact_id', 'pt_contact_id', 'contact_status'],
          });

          if (allContacts && allContacts?.length > 0) {
            if (allContacts && allContacts?.length > 0) {
              for (const element of allContacts) {
                const requestData = {
                  contact_id: element?.contact_id,
                  contact_status:
                    contacts?.find(
                      (item) => item?.contactID === element?.contact_id,
                    )?.contactStatus || 'ARCHIVED',
                  company_id,
                  sync_id: null,
                  decoded,
                  payload: {},
                };
                const response: any =
                  await this.createOrUpdateContactInPaytrade(requestData);

                if (response) {
                  if (
                    !oldData.some(
                      (item) => item.contactID === response.contactID,
                    ) &&
                    !newData.some(
                      (item) => item.contactID === response.contactID,
                    )
                  ) {
                    newData.push(response);
                  } else if (
                    oldData.some(
                      (item) => item.contactID === response.contactID,
                    ) &&
                    response.sync_id
                  ) {
                    for (const element of oldData) {
                      if (
                        element.contactID === response.contactID &&
                        response.sync_id
                      ) {
                        element.sync_id = response.sync_id;
                      }
                    }
                  } else if (
                    newData.some(
                      (item) => item.contactID === response.contactID,
                    ) &&
                    response.sync_id
                  ) {
                    for (const element of newData) {
                      if (
                        element.contactID === response.contactID &&
                        response.sync_id
                      ) {
                        element.sync_id = response.sync_id;
                      }
                    }
                  }
                }
              }
            }
          }

          // synced records
          const syncedRecords = await this.xeroContactDetails
            .createQueryBuilder('contact')
            .select([
              'contact.id AS id',
              'contact.contact_id AS contact_id',
              'contact.tenant_id AS tenant_id',
              'contact.merge_to_contact_id AS merge_to_contact_id',
              'contact.contact_name AS contact_name',
              'contact.contact_status AS contact_status',
              'c.client_supplier_id AS pt_contact_id',
              'c.client_supplier_name AS pt_contact_name',
            ])
            .innerJoin(
              XeroIntegrationDetails,
              'xero',
              `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
            )
            .innerJoin(
              ClientSuppliersDetails,
              'c',
              'contact.pt_contact_id = c.client_supplier_id',
            )
            .distinct(true)
            .where(
              `xero.company_id = :companyId and c.company_id = :companyId`,
              {
                companyId: company_id,
              },
            )
            .orderBy({ 'contact.contact_name': 'ASC' })
            .getRawMany();

          const newIds = new Set(newData.map((r) => r.contactID));
          const existingIds = new Set(oldData.map((r) => r.contactID));
          const syncedMap = new Map<number | string, any>();
          syncedRecords.forEach((record) => {
            syncedMap.set(record.contact_id, record);
          });
          const tempSyncedData = contacts
            .map((record) => {
              const contact_id = record.contactID;
              const syncedData = syncedMap.get(contact_id);
              let sync_status = 'Unsynced';
              let sync_id = null;

              if (newIds.has(contact_id) && syncedData) {
                sync_status = 'Synced';
              } else if (newIds.has(contact_id) && !syncedData) {
                sync_status = 'Unsynced';
                sync_id =
                  newData.find((element) => element?.contactID === contact_id)
                    ?.sync_id || null;
              } else if (existingIds.has(contact_id) && syncedData) {
                sync_status = 'Already synced';
              }

              return {
                ...record,
                pt_contact_id: syncedData?.pt_contact_id ?? null,
                pt_contact_name: syncedData?.pt_contact_name ?? null,
                sync_status,
                sync_id,
              };
            })
            .filter((record) => record.sync_status !== 'Already synced');
          syncedData.push(...tempSyncedData);
          page++;
        }
      }

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          integration_id: xeroDetails.integration_id,
          log_template_id: 382,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from contact scheduler`, 'Sync successful'],
          important_checks: {},
          error_message: null,
          xero_records: allXeroContacts,
          paytrade_records: allContacts,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        },
      );

      return newContacts;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      this.logger.error(`[Xero Scheduler] Failed in Contact scheduler: ${error}`);
      throw errMsg;
    }
  }

  async createOrUpdateContactInPaytrade(data: any) {
    const { contact_id, contact_status, company_id, sync_id, decoded } = data;
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const xeroContactDetails =
        await this.xeroContactsService.getContactDetailsByContactId(
          contact_id,
          xeroDetails.integration_id,
        );
      xeroContactDetails.contact_status = contact_status;
      await this.xeroContactDetails.save(xeroContactDetails);

      if (xeroContactDetails?.pt_contact_id) {
        const clientSupplierDetails =
          await this.xeroContactsService.getClientSuppliersDetails(
            xeroContactDetails?.pt_contact_id,
          );
        if (xeroContactDetails && clientSupplierDetails) {
          const contact = await this.xeroContactsService.getContactByContactId(
            contact_id,
            company_id,
          );
          if (xeroContactDetails?.contact_status === 'ACTIVE') {
            this.logger.log(
              `contact: ${xeroContactDetails?.contact_name} - ${xeroContactDetails?.pt_contact_id} - ${clientSupplierDetails?.client_supplier_name} - ${clientSupplierDetails?.client_supplier_id}`,
            );
            if (
              xeroContactDetails?.contact_name !==
              clientSupplierDetails?.client_supplier_name
            ) {
              const payload: UpdateClientSuppliersDetailInput = {
                company_id,
                id: clientSupplierDetails?.id,
                client_supplier_name: contact.name,
                business_name: clientSupplierDetails?.business_name,
                client_supplier_type:
                  clientSupplierDetails?.client_supplier_type,
                client_supplier_status:
                  clientSupplierDetails?.client_supplier_status,
                related_entity: clientSupplierDetails?.related_entity,
                place_id: clientSupplierDetails?.place_id,
                client_supplier_address:
                  clientSupplierDetails?.client_supplier_address,
                country: clientSupplierDetails?.country,
                region: clientSupplierDetails?.region,
                latitude: clientSupplierDetails?.latitude,
                longitude: clientSupplierDetails?.longitude,
                client_phone_no: clientSupplierDetails?.client_phone_no,
                client_email_id: contact.emailAddress,
                client_website: clientSupplierDetails?.client_website,
                qbcc_number: clientSupplierDetails?.qbcc_number,
                acn_number: clientSupplierDetails?.acn_number,
                abn_number: clientSupplierDetails?.abn_number,
                tfn_number: clientSupplierDetails?.tfn_number,
                payment_terms: clientSupplierDetails?.payment_terms,
                account_details: clientSupplierDetails.accountDetails || [],
                is_deleted: false,
              };
              this.logger.log(`editpayload: ${JSON.stringify(payload)}`);
              const editClientSupplierDetails =
                await this.clientSuppliersDetailsService.editClientSuppliersDetailsById(
                  payload,
                  decoded,
                );
              this.logger.log(`editClientSupplierDetails: ${JSON.stringify(editClientSupplierDetails)}`);
            } else {
              const syncCheck = sync_id
                ? await this.xeroSyncLogs.findOne({
                    where: {
                      id: sync_id,
                      log_template_id: In([384, 385, 386]),
                    },
                  })
                : null;
              if (syncCheck) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateContactInPaytrade',
                  api_payload: {
                    contact_id,
                    client_supplier_name: contact.name,
                    client_email_id: contact.emailAddress || '',
                    contact_status,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 383,
                  dynamic_values: {
                    contact_name: clientSupplierDetails?.client_supplier_name,
                    status: String(contact?.contactStatus)?.toLowerCase(),
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroContactDetails?.id,
                    paytradeId: clientSupplierDetails?.id,
                  },
                  reference_id: xeroContactDetails?.id,
                  history: [
                    `API triggered from contact scheduler ${clientSupplierDetails?.client_supplier_name}`,
                    'Import successful',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [contact],
                  paytrade_records: [clientSupplierDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });

                return contact;
              }
            }
            return contact;
          } else if (
            xeroContactDetails?.contact_status !== 'ACTIVE' &&
            ['Draft', 'Completed']?.includes(
              clientSupplierDetails?.client_supplier_status,
            )
          ) {
            try {
              const deleteClientSupplierDetails =
                await this.clientSuppliersDetailsService.updateClientSuppliersStatusById(
                  clientSupplierDetails?.id,
                  true,
                  decoded,
                );
              this.logger.log(`deleteClientSupplierDetails: ${JSON.stringify(deleteClientSupplierDetails)}`);
            } catch (error) {
              const errMsg = error?.message ? error?.message : error;
              if (
                errMsg
                  ?.toLowerCase()
                  ?.includes(
                    'This contact is linked to one or more contracts/claims or payments. You are unable to delete this contact from the Client/Supplier list to avoid system error.'.toLowerCase(),
                  )
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateContactInPaytrade',
                  api_payload: {
                    contact_id: contact?.contactID,
                    tenant_id: xeroDetails.tenant_id,
                    client_supplier_name: contact?.name,
                    client_email_id: contact?.emailAddress || '',
                    contact_status,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 390,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroContactDetails?.id,
                    paytradeId: clientSupplierDetails?.id,
                  },
                  reference_id: xeroContactDetails?.id,
                  history: [
                    `API triggered from contact scheduler ${clientSupplierDetails?.client_supplier_name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                  },
                  error_message: errMsg,
                  xero_records: [contact],
                  paytrade_records: [clientSupplierDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            }
          }
          return contact;
        }
      } else {
        const contact = await this.xeroContactsService.getContactByContactId(
          contact_id,
          company_id,
        );
        const {
          client_supplier_name,
          client_supplier_type,
          client_supplier_status,
          related_entity,
          entity_type,
          place_id,
          client_supplier_address,
          country,
          region,
          latitude,
          longitude,
          client_phone_no,
          client_email_id,
          account_details,
        } = data.payload || {};

        if (
          !client_supplier_name ||
          !client_supplier_type ||
          !client_supplier_status ||
          !related_entity ||
          !entity_type ||
          !place_id ||
          !client_supplier_address ||
          !country ||
          !region ||
          !latitude ||
          !longitude ||
          !client_phone_no ||
          !client_email_id
        ) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'createOrUpdateContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
                contact_status,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 384,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
              reference_id: xeroContactDetails?.id,
              history: [
                `API triggered from contact scheduler ${contact.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `Missing mandatory fields`,
              xero_records: [contact],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
          return {
            ...contact,
            sync_id: addSyncLogResponse?.id,
          };
        } else if (
          client_supplier_type === 'Client' &&
          account_details?.length > 1
        ) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'createOrUpdateContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
                contact_status,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 384,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
              reference_id: xeroContactDetails?.id,
              history: [
                `API triggered from contact scheduler ${contact.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `Only one account can be added per client`,
              xero_records: [contact],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
          return {
            ...contact,
            sync_id: addSyncLogResponse?.id,
          };
        } else if (
          client_supplier_type === 'Supplier' &&
          account_details?.length > 10
        ) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'createOrUpdateContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
                contact_status,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 384,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
              reference_id: xeroContactDetails?.id,
              history: [
                `API triggered from contact scheduler ${contact.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `You can only have up to 10 accounts per supplier. To add a new one, please delete an existing account`,
              xero_records: [contact],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
          return {
            ...contact,
            sync_id: addSyncLogResponse?.id,
          };
        } else {
          const checkNameExistence =
            await this.clientSuppliersDetailsService.checkExistenceForClient(
              company_id,
              client_supplier_type,
              client_supplier_name,
            );
          if (!checkNameExistence || checkNameExistence?.length == 0) {
            const response =
              await this.clientSuppliersDetailsService.insertClientSupplierDetails(
                decoded,
                data.payload,
              );
            if (response) {
              const phone: Phone = {
                phoneNumber: response.client_phone_no,
                phoneType: Phone.PhoneTypeEnum.MOBILE,
              };
              const phones = [];
              phones.push(phone);

              const address: Address = {
                addressType: Address.AddressTypeEnum.POBOX,
                addressLine1: response.client_supplier_address,
                country: response.country,
              };
              const addresses = [];
              addresses.push(address);

              const contactData = {
                name: response.client_supplier_name,
                addresses: addresses,
                emailAddress: response.client_email_id,
                phones: phones,
              };

              const updateContactResponse =
                await this.xero.accountingApi.updateContact(
                  xeroDetails.tenant_id,
                  contact_id,
                  {
                    contacts: [contactData],
                  },
                );
              // console.log('updateContactResponse: ', updateContactResponse);
              const updatedContact: any =
                updateContactResponse?.body?.contacts[0];

              const xeroContactDetails = await this.xeroContactDetails.findOne({
                where: {
                  contact_id,
                  integration_id: xeroDetails.integration_id,
                },
              });
              xeroContactDetails.contact_name = updatedContact.name;
              xeroContactDetails.contact_status = String(
                updatedContact.contactStatus,
              );
              xeroContactDetails.is_supplier = updatedContact.isSupplier;
              xeroContactDetails.is_customer = updatedContact.isCustomer;
              xeroContactDetails.merge_to_contact_id =
                updatedContact.mergedToContactID || null;
              xeroContactDetails.pt_contact_id = response.client_supplier_id;
              xeroContactDetails.mapped_status = 'System';
              xeroContactDetails.updated_by = response.created_by;
              xeroContactDetails.updated_on = response.created_on;
              xeroContactDetails.updated_group = response.created_group;
              await this.xeroContactDetails.save(xeroContactDetails);

              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createOrUpdateContactInPaytrade',
                api_payload: {
                  contact_id,
                  client_supplier_name: contact.name,
                  client_email_id: contact.emailAddress || '',
                  contact_status,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 383,
                dynamic_values: {
                  contact_name: response?.client_supplier_name,
                  status: String(contact?.contactStatus)?.toLowerCase(),
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: xeroContactDetails?.id,
                  paytradeId: response?.id,
                },
                reference_id: xeroContactDetails?.id,
                history: [
                  `API triggered from contact scheduler ${response?.client_supplier_name}`,
                  'Import successful',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [contact],
                paytrade_records: [response],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

              return contact;
            }
          } else {
            const checkExistenceInXero = checkNameExistence[0]
              ?.client_supplier_id
              ? await this.xeroContactsService.getContactDetails(
                  checkNameExistence[0]?.client_supplier_id,
                  xeroDetails.integration_id,
                )
              : null;
            if (!checkExistenceInXero) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateContactInPaytrade',
                  api_payload: {
                    contact_id,
                    client_supplier_id:
                      checkNameExistence[0]?.client_supplier_id,
                    client_supplier_name: contact.name,
                    client_email_id: contact.emailAddress || '',
                    contact_status,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 385,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroContactDetails?.id,
                    paytradeId: checkNameExistence[0]?.id,
                  },
                  reference_id: xeroContactDetails?.id,
                  history: [
                    `API triggered from contact scheduler ${contact.name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                  },
                  error_message: `The contact name already exists but is not linked to any Xero contact`,
                  xero_records: [contact],
                  paytrade_records: [checkNameExistence[0]],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              return {
                ...contact,
                sync_id: addSyncLogResponse?.id,
              };
            } else {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateContactInPaytrade',
                  api_payload: {
                    contact_id,
                    client_supplier_id:
                      checkNameExistence[0]?.client_supplier_id,
                    client_supplier_name: contact.name,
                    client_email_id: contact.emailAddress || '',
                    unmapping_contact_id: checkExistenceInXero?.contact_id,
                    contact_status,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 386,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroContactDetails?.id,
                    paytradeId: checkNameExistence[0]?.id,
                  },
                  reference_id: xeroContactDetails?.id,
                  history: [
                    `API triggered from contact scheduler ${contact.name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                  },
                  error_message: `The contact name already exists and is linked to some Xero contact`,
                  xero_records: [contact],
                  paytrade_records: [
                    {
                      ...checkNameExistence[0],
                      unmapContactDetails: checkExistenceInXero,
                    },
                  ],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              return {
                ...contact,
                sync_id: addSyncLogResponse?.id,
              };
            }
          }
        }
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Contact scheduler: ${error}`);

      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createOrUpdateContactInPaytrade',
            api_payload: {
              contact_id,
              tenant_id: xeroDetails?.tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from contact scheduler`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Scheduler] Failed in contact scheduler: ${error}`);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async refreshProjects(decoded: any, company_id: number, sync_id?: string) {
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const userId = decoded ? decoded.userId : null;
      const createdGroup = decoded ? 'USER' : 'SYSTEM';
      const mappedStatus = decoded ? 'Auto' : 'System';
      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'refreshProjects',
          api_payload: { company_id, category_type: 'project' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 395,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from project scheduler`, 'Import failed'],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const where = null;
      const order = 'Name ASC';
      const includeArchived = true;

      let newProjects = [];
      let existingProjects = [];
      let allProjects = [];

      let oldData = [],
        newData = [],
        syncedData = [],
        mappedProjects = [];

      const projectDetails =
        await this.xero.accountingApi.getTrackingCategories(
          xeroDetails.tenant_id,
          where,
          order,
          includeArchived,
        );

      if (
        !projectDetails ||
        projectDetails.body.trackingCategories.length === 0
      ) {
        this.logger.error(`No project was found`);
        return false;
      }

      const projects = projectDetails.body.trackingCategories.filter(
        (category) =>
          category.trackingCategoryID === xeroDetails.project_category_id,
      );

      const existingXeroProjects =
        projects[0]?.options?.map((p) => p.trackingOptionID) || [];

      const projectIdsInDb = await this.xeroProjectDetails.find({
        where: {
          project_id: In(existingXeroProjects),
          integration_id: xeroDetails.integration_id,
        },
        select: ['project_id'],
      });
      const existingProjectIds = new Set(
        projectIdsInDb.map((p) => p.project_id),
      );

      const existingProjectIdsSet = new Set(existingProjectIds);

      //Existing projects need to be archived if not present in xero
      const unFoundProjectIdsInDb = await this.xeroProjectDetails.find({
        where: {
          project_id: Not(In(existingXeroProjects)),
          integration_id: xeroDetails.integration_id,
        },
        select: ['project_id', 'pt_project_id', 'project_name'],
      });

      if (unFoundProjectIdsInDb && unFoundProjectIdsInDb?.length > 0) {
        const deletePtProjectIds = unFoundProjectIdsInDb.map(
          (c) => c.pt_project_id,
        );

        this.logger.log(`unFoundProjectIdsInDb: ${JSON.stringify(unFoundProjectIdsInDb)}, deletePtProjectIds: ${JSON.stringify(deletePtProjectIds)}`);

        if (existingXeroProjects && existingXeroProjects?.length > 0) {
          await this.xeroProjectDetails
            .createQueryBuilder()
            .update(XeroProjectDetails)
            .set({
              project_status: 'ARCHIVED',
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: createdGroup,
            })
            .where(
              'project_id NOT IN (:...project_id) AND integration_id = :integration_id',
              {
                project_id: existingXeroProjects,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
        }

        const deletePtProjectDetails = await this.projectDetails.find({
          where: {
            project_id: In(deletePtProjectIds),
            project_status: Not('Deleted'),
          },
        });

        if (deletePtProjectDetails && deletePtProjectDetails?.length > 0) {
          for (const element of deletePtProjectDetails) {
            try {
              const updateProjectStatusRes =
                await this.projectsService.updateProjectStatusById(
                  element?.id,
                  decoded,
                  'Deleted',
                );
              this.logger.log(`updateProjectStatusRes: ${JSON.stringify(updateProjectStatusRes)}`);
            } catch (error) {
              const errMsg = error?.message ? error?.message : error;
              if (
                errMsg
                  ?.toLowerCase()
                  ?.includes(
                    'There are still contracts, payments/claims that are in process.'.toLowerCase(),
                  )
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'refreshProjects',
                  api_payload: { company_id, category_type: 'project' },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 400,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: null,
                    paytradeId: element?.id,
                  },
                  reference_id: null,
                  history: [
                    `API triggered from project scheduler ${element.project_name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import tracking id validation': 'Ok',
                    'Import data format validation': 'Failed',
                  },
                  error_message: errMsg,
                  xero_records: [],
                  paytrade_records: [element],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              }
            }
          }
        }
      }

      projects[0]?.options?.forEach((project) => {
        this.logger.log(`project: ${project.status}`);
        const projectData: any = {
          project_id: project.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          project_name: project.name,
          project_status: project.status,
        };

        if (existingProjectIdsSet.has(String(project.trackingOptionID))) {
          if (
            !existingProjects.some(
              (c) => c.project_id === String(project.trackingOptionID),
            )
          ) {
            existingProjects.push(projectData);
            oldData.push(project);
          }
        } else {
          if (
            projectData &&
            projectData?.project_status === TrackingOption.StatusEnum.ACTIVE
          ) {
            newProjects.push(projectData);
            newData.push(project);
          }
        }
      });

      if (newProjects.length > 0) {
        const xeroProjectDetails =
          await this.xeroProjectDetails.create(newProjects);
        await this.xeroProjectDetails.save(xeroProjectDetails);
      }

      if (existingProjects.length > 0) {
        for (const project of existingProjects) {
          await this.xeroProjectDetails.update(
            {
              project_id: project.project_id,
              integration_id: xeroDetails.integration_id,
            },
            project,
          );
        }
      }

      const autoMappingRecords = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          'p.project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(
          ProjectDetails,
          'p',
          `LOWER(TRIM(project.project_name)) = LOWER(TRIM(p.project_name)) AND p.project_status <> 'Deleted'`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and p.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('project.pt_project_id IS NULL')
        .orderBy({ 'project.project_name': 'ASC' })
        .getRawMany();

      const yet_to_map = autoMappingRecords?.map((res) => ({
        project_id: res.project_id,
        pt_project_id: res.pt_project_id,
      }));

      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroProjectDetails
            .createQueryBuilder()
            .update(XeroProjectDetails)
            .set({
              pt_project_id: element.pt_project_id,
              mapped_status: mappedStatus,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: createdGroup,
            })
            .where(
              'project_id = :project_id AND integration_id = :integration_id',
              {
                project_id: element.project_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedProjects.push(element.project_id);
        }
      }

      allProjects = await this.xeroProjectDetails.find({
        where: { integration_id: xeroDetails.integration_id },
        select: ['project_id', 'pt_project_id', 'project_status'],
      });

      if (allProjects && allProjects?.length > 0) {
        if (allProjects && allProjects?.length > 0) {
          for (const element of allProjects) {
            const requestData = {
              project_id: element?.project_id,
              project_status:
                projects[0]?.options?.find(
                  (item) => item?.trackingOptionID === element?.project_id,
                )?.status || 'ARCHIVED',
              company_id,
              sync_id: null,
              decoded,
              payload: {},
            };
            const response: any =
              await this.createOrUpdateProjectInPaytrade(requestData);

            if (response) {
              if (
                !oldData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                !newData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                )
              ) {
                newData.push(response);
              } else if (
                oldData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                response.sync_id
              ) {
                for (const element of oldData) {
                  if (
                    element.trackingOptionID === response.trackingOptionID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              } else if (
                newData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                response.sync_id
              ) {
                for (const element of newData) {
                  if (
                    element.trackingOptionID === response.trackingOptionID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              }
            }
          }
        }
      }

      const syncedRecords = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          'p.project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(ProjectDetails, 'p', 'project.pt_project_id = p.project_id')
        .distinct(true)
        .where(`xero.company_id = :companyId and p.company_id = :companyId`, {
          companyId: company_id,
        })
        .orderBy({ 'project.project_name': 'ASC' })
        .getRawMany();
      // console.log('syncedRecords: ', syncedRecords);
      const newIds = new Set(newData.map((r) => r.trackingOptionID));
      const existingIds = new Set(oldData.map((r) => r.trackingOptionID));
      const syncedMap = new Map<number | string, any>();
      syncedRecords.forEach((record) => {
        syncedMap.set(record.project_id, record);
      });
      // console.log({ syncedMap });
      syncedData = projects[0]?.options
        .map((record) => {
          const project_id = record.trackingOptionID;
          const syncedData = syncedMap.get(project_id);
          // console.log({ syncedData });
          let sync_status = 'Unsynced';
          let sync_id = null;

          if (newIds.has(project_id) && syncedData) {
            sync_status = 'Synced';
          } else if (newIds.has(project_id) && !syncedData) {
            sync_status = 'Unsynced';
            sync_id =
              newData.find(
                (element) => element?.trackingOptionID === project_id,
              )?.sync_id || null;
          } else if (existingIds.has(project_id) && syncedData) {
            sync_status = 'Already synced';
          }

          return {
            ...record,
            pt_project_id: syncedData?.pt_project_id ?? null,
            pt_project_name: syncedData?.pt_project_name ?? null,
            sync_status,
            sync_id,
          };
        })
        .filter((record) => record.sync_status !== 'Already synced');
      // console.log({ syncedData });

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 396,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from project scheduler`, 'Sync successful'],
          important_checks: {
            'Import tracking id validation': 'Ok',
            'Import data format validation': 'Ok',
          },
          error_message: null,
          xero_records: projects,
          paytrade_records: allProjects,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        },
      );

      return newProjects;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Project scheduler: ${error}`);
      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'refreshProjects',
            api_payload: {
              company_id,
              category_type: 'project',
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from project scheduler`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Scheduler] Failed in project scheduler: ${error}`);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async createOrUpdateProjectInPaytrade(data: any) {
    const { project_id, company_id, sync_id, decoded } = data;
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const xeroProjectDetails =
        await this.xeroProjectsService.getProjectDetailsByProjectId(
          project_id,
          xeroDetails.integration_id,
        );
      xeroProjectDetails.project_status = data?.project_status;
      await this.xeroProjectDetails.save(xeroProjectDetails);
      this.logger.log(`xeroProjectDetails: ${JSON.stringify(xeroProjectDetails)}`);
      if (xeroProjectDetails?.pt_project_id) {
        const projectDetails =
          await this.xeroProjectsService.getProjectsDetails(
            xeroProjectDetails?.pt_project_id,
          );
        this.logger.log(`projectDetails: ${JSON.stringify(projectDetails)}`);
        if (xeroProjectDetails && projectDetails) {
          const project = await this.xeroProjectsService.getProjectByProjectId(
            project_id,
            company_id,
          );
          if (project) {
            if (xeroProjectDetails?.project_status === 'ACTIVE') {
              if (
                xeroProjectDetails?.project_name !==
                projectDetails?.project_name
              ) {
                this.logger.log('Project name cannot be updated');
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    api_payload: {
                      project_id,
                      project_name: project?.name,
                      project_status: data?.project_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 397,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: projectDetails?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${project.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `Project name cannot be modified in paytrade`,
                    xero_records: [project],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...project,
                  sync_id: addSyncLogResponse?.id,
                };
              } else {
                const syncCheck = sync_id
                  ? await this.xeroSyncLogs.findOne({
                      where: {
                        id: sync_id,
                        log_template_id: In([394, 392, 393]),
                      },
                    })
                  : null;
                if (syncCheck) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 401,
                    dynamic_values: {
                      project_name: projectDetails?.project_name,
                      status: String(project?.status)?.toLowerCase(),
                    },
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: projectDetails?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${projectDetails?.project_name}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [project],
                    paytrade_records: [projectDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });

                  return project;
                }
              }
            } else if (
              xeroProjectDetails?.project_status !== 'ACTIVE' &&
              ['Draft', 'In Progress', 'Completed']?.includes(
                projectDetails?.project_status,
              )
            ) {
              try {
                const deleteProjectDetails: any =
                  await this.projectsService.updateProjectStatusById(
                    projectDetails?.id,
                    decoded,
                    'Deleted',
                  );
                this.logger.log(`deleteProjectDetails: ${JSON.stringify(deleteProjectDetails)}`);
                if (
                  deleteProjectDetails &&
                  deleteProjectDetails?.warning &&
                  deleteProjectDetails?.warningMessage
                    ?.toLowerCase()
                    ?.includes(
                      'Please upgrade your subscription plan'.toLowerCase(),
                    )
                ) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    api_payload: {
                      project_id,
                      project_name: project.name,
                      project_status: data?.project_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 399,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: projectDetails?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${project.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: deleteProjectDetails?.warningMessage,
                    xero_records: [project],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (
                  errMsg
                    ?.toLowerCase()
                    ?.includes(
                      'There are still contracts, payments/claims that are in process.'.toLowerCase(),
                    )
                ) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    api_payload: {
                      project_id,
                      project_name: project.name,
                      project_status: data?.project_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 400,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: projectDetails?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${project.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: errMsg,
                    xero_records: [project],
                    paytrade_records: [projectDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
          return project;
        }
      } else {
        const project = await this.xeroProjectsService.getProjectByProjectId(
          project_id,
          company_id,
        );
        if (project) {
          const {
            project_name,
            project_role,
            project_date,
            project_description,
            site_address,
            country,
            region,
            place_id,
            latitude,
            longitude,
            head_contract_sum,
            retention_type,
            number_of_units,
            pta_eligibility,
            rta_eligibility,
            project_status,
          } = data.payload || {};
          if (
            !project_name ||
            !project_role ||
            !project_date ||
            !project_description ||
            !site_address ||
            !country ||
            !region ||
            !place_id ||
            !latitude ||
            !longitude ||
            !head_contract_sum ||
            !retention_type ||
            !number_of_units ||
            !pta_eligibility ||
            !rta_eligibility ||
            !project_status
          ) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createOrUpdateProjectInPaytrade',
                api_payload: {
                  project_id,
                  project_name: project.name,
                  project_status: data?.project_status,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 394,
                dynamic_values: {},
                project_id: xeroProjectDetails?.id,
                contract_id: null,
                reference: { xeroId: xeroProjectDetails?.id, paytradeId: null },
                reference_id: xeroProjectDetails?.id,
                history: [
                  `API triggered from project scheduler ${project.name}`,
                  'Import failed',
                ],
                important_checks: {
                  'Import tracking id validation': 'Ok',
                  'Import data format validation': 'Failed',
                },
                error_message: `Missing mandatory fields`,
                xero_records: [project],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            return {
              ...project,
              sync_id: addSyncLogResponse?.id,
            };
          } else {
            const checkNameExistence =
              await this.xeroProjectsService.checkProjectName(
                company_id,
                project?.name,
              );
            this.logger.log(`checkNameExistence: ${JSON.stringify(checkNameExistence)}`);
            if (!checkNameExistence || checkNameExistence?.length == 0) {
              const response: any =
                await this.projectsService.insertProjectDetails(
                  decoded,
                  data.payload,
                );
              this.logger.log(`response: ${JSON.stringify(response)}`);

              if (
                response &&
                response?.warning &&
                response?.warningMessage
                  ?.toLowerCase()
                  ?.includes(
                    'Please upgrade your subscription plan'.toLowerCase(),
                  )
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createProjectInPaytrade',
                  api_payload: {
                    project_id,
                    project_name: project.name,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 399,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: null,
                  reference: {
                    xeroId: xeroProjectDetails?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroProjectDetails?.id,
                  history: [
                    `API triggered from project scheduler ${project?.name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import tracking id validation': 'Ok',
                    'Import data format validation': 'Failed',
                  },
                  error_message: response?.warningMessage,
                  xero_records: [project],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }

              if (response) {
                const xeroProjectDetails =
                  await this.xeroProjectDetails.findOne({
                    where: {
                      project_id,
                      integration_id: xeroDetails.integration_id,
                    },
                  });
                xeroProjectDetails.pt_project_id = response.project_id;
                xeroProjectDetails.mapped_status = 'System';
                xeroProjectDetails.updated_by = response.created_by;
                xeroProjectDetails.updated_on = response.created_on;
                xeroProjectDetails.updated_group = response.created_group;
                await this.xeroProjectDetails.save(xeroProjectDetails);

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateProjectInPaytrade',
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 401,
                  dynamic_values: {
                    project_name: response?.project_name,
                    status: String(project?.status)?.toLowerCase(),
                  },
                  project_id: xeroProjectDetails?.id,
                  contract_id: null,
                  reference: {
                    xeroId: xeroProjectDetails?.id,
                    paytradeId: response?.id,
                  },
                  reference_id: xeroProjectDetails?.id,
                  history: [
                    `API triggered from project scheduler ${response?.project_name}`,
                    'Import successful',
                  ],
                  important_checks: {
                    'Import tracking id validation': 'Ok',
                    'Import data format validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [project],
                  paytrade_records: [response],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });

                return project;
              }
            } else {
              const checkExistenceInXero = checkNameExistence[0]?.project_id
                ? await this.xeroProjectsService.getProjectDetails(
                    checkNameExistence[0]?.project_id,
                    xeroDetails?.integration_id,
                  )
                : null;
              this.logger.log(`checkExistenceInXero: ${JSON.stringify(checkExistenceInXero)}`);
              if (!checkExistenceInXero) {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    api_payload: {
                      project_id,
                      project_name: project.name,
                      mapping_project_id: checkNameExistence[0]?.project_id,
                      project_status: data?.project_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 393,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: checkNameExistence[0]?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${project.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `The project name already exists but is not linked to any Xero project`,
                    xero_records: [project],
                    paytrade_records: [checkNameExistence[0]],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...project,
                  sync_id: addSyncLogResponse?.id,
                };
              } else {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateProjectInPaytrade',
                    api_payload: {
                      project_id,
                      project_name: project.name,
                      mapping_project_id: checkNameExistence[0]?.project_id,
                      unmapping_project_id: checkExistenceInXero?.project_id,
                      project_status: data?.project_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 392,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: null,
                    reference: {
                      xeroId: xeroProjectDetails?.id,
                      paytradeId: checkNameExistence[0]?.id,
                    },
                    reference_id: xeroProjectDetails?.id,
                    history: [
                      `API triggered from project scheduler ${project.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `The project name already exists and is linked to some Xero project`,
                    xero_records: [project],
                    paytrade_records: [
                      {
                        ...checkNameExistence[0],
                        unmapProjectDetails: checkExistenceInXero,
                      },
                    ],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...project,
                  sync_id: addSyncLogResponse?.id,
                };
              }
            }
          }
        }
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Contact scheduler: ${error}`);

      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createOrUpdateProjectInPaytrade',
            api_payload: {
              project_id,
              tenant_id: xeroDetails?.tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from project scheduler`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Scheduler] Failed in project scheduler: ${error}`);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async refreshContracts(decoded: any, company_id: number, sync_id?: string) {
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const userId = decoded ? decoded.userId : null;
      const createdGroup = decoded ? 'USER' : 'SYSTEM';
      const mappedStatus = decoded ? 'Auto' : 'System';
      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'refreshContracts',
          api_payload: { company_id, category_type: 'contract' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 402,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from contract scheduler`, 'Import failed'],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const where = null;
      const order = 'Name ASC';
      const includeArchived = true;

      let newContracts = [];
      let existingContracts = [];
      let allContracts = [];

      let oldData = [],
        newData = [],
        syncedData = [],
        mappedContracts = [];

      const contractDetails =
        await this.xero.accountingApi.getTrackingCategories(
          xeroDetails.tenant_id,
          where,
          order,
          includeArchived,
        );

      if (
        !contractDetails ||
        contractDetails.body.trackingCategories.length === 0
      ) {
        this.logger.error(`No contract was found`);
        return false;
      }

      const contracts = contractDetails.body.trackingCategories.filter(
        (category) =>
          category.trackingCategoryID === xeroDetails.contract_category_id,
      );
      const existingXeroContracts =
        contracts[0]?.options?.map((c) => c.trackingOptionID) || [];

      const contractIdsInDb = await this.xeroContractDetails.find({
        where: {
          contract_id: In(existingXeroContracts),
          integration_id: xeroDetails.integration_id,
        },
        select: ['contract_id'],
      });
      const existingContractIds = new Set(
        contractIdsInDb.map((c) => c.contract_id),
      );
      const existingContractIdsSet = new Set(existingContractIds);

      //Existing contracts need to be archived if not present in xero
      const unFoundContractIdsInDb = await this.xeroContractDetails.find({
        where: {
          contract_id: Not(In(existingXeroContracts)),
          integration_id: xeroDetails.integration_id,
        },
        select: ['contract_id', 'pt_contract_id', 'contract_name'],
      });

      if (unFoundContractIdsInDb && unFoundContractIdsInDb?.length > 0) {
        const deletePtContractIds = unFoundContractIdsInDb.map(
          (c) => c.pt_contract_id,
        );

        this.logger.log(`unFoundContractIdsInDb: ${JSON.stringify(unFoundContractIdsInDb)}, deletePtContractIds: ${JSON.stringify(deletePtContractIds)}`);

        if (existingXeroContracts && existingXeroContracts?.length > 0) {
          await this.xeroContractDetails
            .createQueryBuilder()
            .update(XeroContractDetails)
            .set({
              contract_status: 'ARCHIVED',
              updated_by: userId,
              updated_on: moment.tz('UTC'),
              updated_group: createdGroup,
            })
            .where(
              'contract_id NOT IN (:...contract_id) AND integration_id = :integration_id',
              {
                contract_id: existingXeroContracts,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
        }

        const deletePtContractDetails = await this.contractDetails.find({
          where: {
            contract_id: In(deletePtContractIds),
            contract_status: Not('Deleted'),
          },
        });

        if (deletePtContractDetails && deletePtContractDetails?.length > 0) {
          for (const element of deletePtContractDetails) {
            try {
              const updateContractStatusRes =
                await this.contractDetailsService.updateContractStatusById(
                  element?.id,
                  userId,
                  'Deleted',
                );
              this.logger.log(`updateContractStatusRes: ${JSON.stringify(updateContractStatusRes)}`);
            } catch (error) {
              const errMsg = error?.message ? error?.message : error;
              if (
                errMsg
                  ?.toLowerCase()
                  ?.includes(
                    `There are claims and payments in progress. You can't move this contract to the archive list to avoid system error.`.toLowerCase(),
                  )
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'refreshContracts',
                  api_payload: { company_id, category_type: 'contract' },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 403,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: null,
                    paytradeId: element?.id,
                  },
                  reference_id: null,
                  history: [
                    `API triggered from contract scheduler ${element.contract_name}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import tracking id validation': 'Ok',
                    'Import data format validation': 'Failed',
                  },
                  error_message: errMsg,
                  xero_records: [],
                  paytrade_records: [element],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              }
            }
          }
        }
      }

      // Separate new and existing contracts
      contracts[0]?.options?.forEach((contract) => {
        this.logger.log(`contract: ${contract.status}`);
        const contractData: any = {
          contract_id: contract.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          contract_name: contract.name,
          contract_status: contract.status,
        };
        if (existingContractIdsSet.has(String(contract.trackingOptionID))) {
          if (
            !existingContracts.some(
              (c) => c.contact_id === String(contract.trackingOptionID),
            )
          ) {
            existingContracts.push(contractData);
            oldData.push(contract);
          }
        } else {
          if (
            contractData &&
            contractData?.contract_status === TrackingOption.StatusEnum.ACTIVE
          ) {
            newContracts.push(contractData);
            newData.push(contract);
          }
        }
      });

      if (newContracts.length > 0) {
        const xeroContractDetails =
          await this.xeroContractDetails.create(newContracts);
        await this.xeroContractDetails.save(xeroContractDetails);
      }

      if (existingContracts.length > 0) {
        for (const contract of existingContracts) {
          await this.xeroContractDetails.update(
            {
              contract_id: contract.contract_id,
              integration_id: xeroDetails.integration_id,
            },
            contract,
          );
        }
      }

      const autoMappingRecords = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          'c.contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          `LOWER(TRIM(contract.contract_name)) = LOWER(TRIM(c.contract_name)) AND c.contract_status <> 'Deleted'`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and c.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('contract.pt_contract_id IS NULL')
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      const yet_to_map = autoMappingRecords?.map((res) => ({
        contract_id: res.contract_id,
        pt_contract_id: res.pt_contract_id,
      }));

      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroContractDetails
            .createQueryBuilder()
            .update(XeroContractDetails)
            .set({
              pt_contract_id: element.pt_contract_id,
              mapped_status: mappedStatus,
              updated_by: userId,
              updated_on: moment.tz('UTC'),
              updated_group: createdGroup,
            })
            .where(
              'contract_id = :contract_id AND integration_id = :integration_id',
              {
                contract_id: element.contract_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedContracts.push(element.contract_id);
        }
      }

      allContracts = await this.xeroContractDetails.find({
        where: { integration_id: xeroDetails.integration_id },
        select: ['contract_id', 'pt_contract_id', 'contract_status'],
      });

      if (allContracts && allContracts?.length > 0) {
        if (allContracts && allContracts?.length > 0) {
          for (const element of allContracts) {
            const requestData = {
              contract_id: element?.contract_id,
              contract_status:
                contracts[0]?.options?.find(
                  (item) => item?.trackingOptionID === element?.contract_id,
                )?.status || 'ARCHIVED',
              company_id,
              sync_id: null,
              decoded,
              payload: {},
            };
            const response: any =
              await this.createOrUpdateContractInPaytrade(requestData);

            if (response) {
              if (
                !oldData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                !newData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                )
              ) {
                newData.push(response);
              } else if (
                oldData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                response.sync_id
              ) {
                for (const element of oldData) {
                  if (
                    element.trackingOptionID === response.trackingOptionID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              } else if (
                newData.some(
                  (item) => item.trackingOptionID === response.trackingOptionID,
                ) &&
                response.sync_id
              ) {
                for (const element of newData) {
                  if (
                    element.trackingOptionID === response.trackingOptionID &&
                    response.sync_id
                  ) {
                    element.sync_id = response.sync_id;
                  }
                }
              }
            }
          }
        }
      }

      const syncedRecords = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          'c.contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          'contract.pt_contract_id = c.contract_id',
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and c.company_id = :companyId`, {
          companyId: company_id,
        })
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      // console.log('syncedRecords: ', syncedRecords);
      const newIds = new Set(newData.map((r) => r.trackingOptionID));
      const existingIds = new Set(oldData.map((r) => r.trackingOptionID));
      const syncedMap = new Map<number | string, any>();
      syncedRecords.forEach((record) => {
        syncedMap.set(record.contract_id, record);
      });
      // console.log({ syncedMap });
      syncedData = contracts[0]?.options
        .map((record) => {
          const contract_id = record.trackingOptionID;
          const syncedData = syncedMap.get(contract_id);
          // console.log({ syncedData });
          let sync_status = 'Unsynced';
          let sync_id = null;

          if (newIds.has(contract_id) && syncedData) {
            sync_status = 'Synced';
          } else if (newIds.has(contract_id) && !syncedData) {
            sync_status = 'Unsynced';
            sync_id =
              newData.find(
                (element) => element?.trackingOptionID === contract_id,
              )?.sync_id || null;
          } else if (existingIds.has(contract_id) && syncedData) {
            sync_status = 'Already synced';
          }

          return {
            ...record,
            pt_contract_id: syncedData?.pt_contract_id ?? null,
            pt_contract_name: syncedData?.pt_contract_name ?? null,
            sync_status,
            sync_id,
          };
        })
        .filter((record) => record.sync_status !== 'Already synced');
      // console.log({ syncedData });

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 405,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from contract scheduler`, 'Sync successful'],
          important_checks: {
            'Import tracking id validation': 'Ok',
            'Import data format validation': 'Ok',
          },
          error_message: null,
          xero_records: contracts,
          paytrade_records: allContracts,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        },
      );

      return newContracts;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Contract scheduler: ${error}`);

      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'refreshContracts',
            api_payload: {
              company_id,
              category_type: 'contract',
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from contract scheduler`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(
            `[Xero Scheduler] Failed in contract scheduler:`,
            error,
          );
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async createOrUpdateContractInPaytrade(data: any) {
    const { contract_id, company_id, sync_id, decoded } = data;
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const xeroContractDetails =
        await this.xeroContractsService.getContractDetailsByContractId(
          contract_id,
          xeroDetails.integration_id,
        );
      xeroContractDetails.contract_status = data?.contract_status;
      await this.xeroContractDetails.save(xeroContractDetails);

      if (xeroContractDetails?.pt_contract_id) {
        const contractDetails =
          await this.xeroContractsService.getContractsDetails(
            xeroContractDetails?.pt_contract_id,
          );
        this.logger.log(`xeroContractDetails: ${JSON.stringify(xeroContractDetails)}, contractDetails: ${JSON.stringify(contractDetails)}`);
        if (xeroContractDetails && contractDetails) {
          const contract =
            await this.xeroContractsService.getContractByContractId(
              contract_id,
              company_id,
            );
          if (contract) {
            if (xeroContractDetails?.contract_status === 'ACTIVE') {
              this.logger.log(
                `xeroContractDetails: ${xeroContractDetails?.contract_name}, contractDetails: ${contractDetails?.contract_name}`,
              );
              if (
                xeroContractDetails?.contract_name !==
                contractDetails?.contract_name
              ) {
                this.logger.log('Contract name cannot be updated');
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateContractInPaytrade',
                    api_payload: {
                      contract_id,
                      contract_name: contract?.name,
                      contract_status: data?.contract_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 406,
                    dynamic_values: {},
                    project_id: null,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroContractDetails?.id,
                      paytradeId: contractDetails?.id,
                    },
                    reference_id: xeroContractDetails?.id,
                    history: [
                      `API triggered from contract scheduler ${contract.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `Contract name cannot be modified in paytrade`,
                    xero_records: [contract],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...contract,
                  sync_id: addSyncLogResponse?.id,
                };
              } else {
                const syncCheck = sync_id
                  ? await this.xeroSyncLogs.findOne({
                      where: {
                        id: sync_id,
                        log_template_id: In([409, 407, 408]),
                      },
                    })
                  : null;
                if (syncCheck) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateContractInPaytrade',
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 404,
                    dynamic_values: {
                      contract_name: contractDetails?.contract_name,
                      status: String(contract?.status)?.toLowerCase(),
                    },
                    project_id: null,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroContractDetails?.id,
                      paytradeId: contractDetails?.id,
                    },
                    reference_id: xeroContractDetails?.id,
                    history: [
                      `API triggered from contract scheduler ${contractDetails?.contract_name}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [contract],
                    paytrade_records: [contractDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });

                  return contract;
                }
              }
            } else if (
              xeroContractDetails?.contract_status !== 'ACTIVE' &&
              ['Draft', 'In Progress', 'Completed']?.includes(
                contractDetails?.contract_status,
              )
            ) {
              try {
                const deleteContractDetails: any =
                  await this.contractDetailsService.updateContractStatusById(
                    contractDetails?.id,
                    decoded,
                    'Deleted',
                  );
                this.logger.log(`deleteContractDetails: ${JSON.stringify(deleteContractDetails)}`);
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (
                  errMsg
                    ?.toLowerCase()
                    ?.includes(
                      `There are claims and payments in progress. You can't move this contract to the archive list to avoid system error.`.toLowerCase(),
                    )
                ) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateContractInPaytrade',
                    api_payload: {
                      contract_id,
                      contract_name: contract.name,
                      contract_status: data?.contract_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 403,
                    dynamic_values: {},
                    project_id: null,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroContractDetails?.id,
                      paytradeId: contractDetails?.id,
                    },
                    reference_id: xeroContractDetails?.id,
                    history: [
                      `API triggered from contract scheduler ${contract.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: errMsg,
                    xero_records: [contract],
                    paytrade_records: [contractDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
          return contract;
        }
      } else {
        const contract =
          await this.xeroContractsService.getContractByContractId(
            contract_id,
            company_id,
          );
        if (contract) {
          const {
            contract_name,
            client_supplier_role,
            contract_status,
            contract_date,
            project_id,
            project_role,
            client_supplier_id,
            client_supplier_type,
            related_entity,
            retention_type,
            payment_terms,
            initial_contract_sum,
            contract_start_date,
            defect_liability_end_date,
          } = data.payload || {};
          if (
            !contract_name ||
            !client_supplier_role ||
            !contract_status ||
            !contract_date ||
            !project_id ||
            !project_role ||
            !client_supplier_id ||
            !client_supplier_type ||
            !related_entity ||
            !retention_type ||
            !payment_terms ||
            !initial_contract_sum ||
            !contract_start_date ||
            !defect_liability_end_date
          ) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createOrUpdateContractInPaytrade',
                api_payload: {
                  contract_id,
                  contract_name: contract.name,
                  contract_status: data?.contract_status,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 409,
                dynamic_values: {},
                project_id: null,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xeroContractDetails?.id,
                  paytradeId: null,
                },
                reference_id: xeroContractDetails?.id,
                history: [
                  `API triggered from contract scheduler ${contract.name}`,
                  'Import failed',
                ],
                important_checks: {
                  'Import tracking id validation': 'Ok',
                  'Import data format validation': 'Failed',
                },
                error_message: `Missing mandatory fields`,
                xero_records: [contract],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            return {
              ...contract,
              sync_id: addSyncLogResponse?.id,
            };
          } else {
            const checkNameExistence =
              await this.xeroContractsService.checkContractName(
                company_id,
                contract?.name,
              );

            if (!checkNameExistence || checkNameExistence?.length == 0) {
              const response: any =
                await this.contractDetailsService.insertContractDetails(
                  decoded,
                  data.payload,
                );
              this.logger.log(`response: ${JSON.stringify(response)}`);

              if (response) {
                const xeroContractDetails =
                  await this.xeroContractDetails.findOne({
                    where: {
                      contract_id,
                      integration_id: xeroDetails.integration_id,
                    },
                  });
                xeroContractDetails.pt_contract_id = response.contract_id;
                xeroContractDetails.mapped_status = 'System';
                xeroContractDetails.updated_by = response.created_by;
                xeroContractDetails.updated_on = response.created_on;
                xeroContractDetails.updated_group = response.created_group;
                await this.xeroContractDetails.save(xeroContractDetails);

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateContractInPaytrade',
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 404,
                  dynamic_values: {
                    contract_name: response?.contract_name,
                    status: String(contract?.status)?.toLowerCase(),
                  },
                  project_id: null,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroContractDetails?.id,
                    paytradeId: response?.id,
                  },
                  reference_id: xeroContractDetails?.id,
                  history: [
                    `API triggered from contract scheduler ${response?.contract_name}`,
                    'Import successful',
                  ],
                  important_checks: {
                    'Import tracking id validation': 'Ok',
                    'Import data format validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [contract],
                  paytrade_records: [response],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });

                return contract;
              }
            } else {
              const checkExistenceInXero = checkNameExistence[0]?.contract_id
                ? await this.xeroContractsService.getContractDetail(
                    checkNameExistence[0]?.contract_id,
                    xeroDetails?.integration_id,
                  )
                : null;
              if (!checkExistenceInXero) {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateContractInPaytrade',
                    api_payload: {
                      contract_id,
                      contract_name: contract.name,
                      mapping_contract_id: checkNameExistence[0]?.contract_id,
                      contract_status: data?.contract_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 408,
                    dynamic_values: {},
                    project_id: null,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroContractDetails?.id,
                      paytradeId: checkNameExistence[0]?.id,
                    },
                    reference_id: xeroContractDetails?.id,
                    history: [
                      `API triggered from contract scheduler ${contract.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `The contract name already exists but is not linked to any Xero project`,
                    xero_records: [contract],
                    paytrade_records: [checkNameExistence[0]],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...contract,
                  sync_id: addSyncLogResponse?.id,
                };
              } else {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: sync_id || null,
                    api_name: 'createOrUpdateContractInPaytrade',
                    api_payload: {
                      contract_id,
                      contract_name: contract.name,
                      mapping_contract_id: checkNameExistence[0]?.contract_id,
                      unmapping_contract_id: checkExistenceInXero?.contract_id,
                      contract_status: data?.contract_status,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 407,
                    dynamic_values: {},
                    project_id: null,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroContractDetails?.id,
                      paytradeId: checkNameExistence[0]?.id,
                    },
                    reference_id: xeroContractDetails?.id,
                    history: [
                      `API triggered from contract scheduler ${contract.name}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import tracking id validation': 'Ok',
                      'Import data format validation': 'Failed',
                    },
                    error_message: `The contract name already exists and is linked to some Xero project`,
                    xero_records: [contract],
                    paytrade_records: [
                      {
                        ...checkNameExistence[0],
                        unmapContractDetails: checkExistenceInXero,
                      },
                    ],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                return {
                  ...contract,
                  sync_id: addSyncLogResponse?.id,
                };
              }
            }
          }
        }
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Contract scheduler: ${error}`);

      const isRefreshToken = await this.xeroResolver.refreshTokenReAuthenticate(
        {
          error,
        },
      );

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });

          const response = await this.xeroService.getAuthResponse(company_id);

          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createOrUpdateContractInPaytrade',
            api_payload: {
              contract_id,
              tenant_id: xeroDetails?.tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from contract scheduler`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(
            `[Xero Scheduler] Failed in contract scheduler:`,
            error,
          );
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  async refreshInvoicesAndBills(decoded: any, company_id: number) {
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

      if (integrationDetails.integration_status !== 'Connected - active')
        throw `Paytrade is currently not active in Xero.`;

      const userId = decoded ? decoded.userId : null;
      const createdGroup = decoded ? 'USER' : 'SYSTEM';
      const mappedStatus = decoded ? 'Auto' : 'System';
      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = null; //`Type=="${type === 'bill' ? 'ACCPAY' : 'ACCREC'}"`; //'Status=="DRAFT"';

      const order = 'InvoiceID ASC';
      const iDs = [];
      const invoiceNumbers = [];
      const contactIDs = [];
      const statuses = ['SUBMITTED', 'AUTHORISED', 'PAID'];
      const page = 1;
      const includeArchived = true;
      const summaryOnly = false;
      const pageSize = 500;

      const newInvoices = [];
      const skipInvoicesAddition = [];

      const response = await this.xero.accountingApi.getInvoices(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
        iDs,
        invoiceNumbers,
        contactIDs,
        statuses,
        page,
        includeArchived,
        null,
        null,
        summaryOnly,
        pageSize,
      );

      // console.log('response.body: ', response.body);
      const invoices = response.body.invoices || [];

      if (invoices && invoices[0] !== null && invoices.length !== 0) {
        for (const element of invoices) {
          const invoiceSchedulerResponse =
            await this.xeroWebhookService.createClaimInPaytrade(
              {
                invoice_id: element?.invoiceID, //invoices[1]?.invoiceID
                tenant_id: xeroDetails.tenant_id,
                eventType: '',
                sync_run_type: 'scheduler',
              },
              decoded,
            );
          this.logger.log(`invoiceSchedulerResponse: ${JSON.stringify(invoiceSchedulerResponse)}`);
        }
      }

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          integration_id: xeroDetails.integration_id,
          log_template_id: 411,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from invoice scheduler`, 'Sync successful'],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: null,
          xero_records: invoices,
          paytrade_records: [],
          new_records: [],
          updated_records: [],
          synced_records: [],
        },
      );

      return newInvoices;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in Invoice scheduler: ${error}`);
      throw error;
    }
  }

  // @Cron('0 8 * * *', {
  //   timeZone: 'UTC',
  // })
  async checkAndCreateOverPaymentAndRefunds() {
    try {
      this.logger.log('Starts');
      const integrationDetails = await this.integrationDetails.find({
        where: { integration_status: 'Connected - active' },
        relations: ['xeroIntegration'],
      });
      if (
        integrationDetails &&
        integrationDetails.length > 0 &&
        integrationDetails[0] !== null
      ) {
        let tenantIds = [];
        for (const element of integrationDetails) {
          tenantIds.push(element?.xeroIntegration?.tenant_id);
        }

        const allContacts = await this.xeroContactDetails.find({
          where: {
            tenant_id: In(tenantIds),
          },
        });

        if (allContacts && allContacts?.length > 0) {
          for (const element of allContacts) {
            await this.xeroWebhookService.checkAndCreateOverPaymentAndRefunds(
              {
                tenant_id: element?.tenant_id,
                contact_id: element?.contact_id,
                sync_run_type: 'scheduler',
              },
              {},
            );
          }
        }
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Scheduler] Failed in overpayment scheduler: ${error}`);
    }
  }
}
