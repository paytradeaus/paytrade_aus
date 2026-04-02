import { Injectable } from '@nestjs/common';
import {
  Account,
  AccountType,
  CurrencyCode,
  TaxComponent,
  TaxRate,
  TaxRates,
  XeroClient,
} from 'xero-node';
import * as dotenv from 'dotenv';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
import axios from 'axios';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { handleAxiosError } from '../../error-handler';
import {
  CreateAccountInput,
  CreateTaxTypeInput,
  CreateXeroSyncLogInput,
  GetAccountCodesInput,
  GetTaxTypeInput,
  GetXeroSyncLogsInput,
  UpdateSettingsInput,
} from './xero.input';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { XeroRefreshTokenService } from './refreshToken/xeroRefreshToken.service';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';

dotenv.config();

@Injectable()
export class XeroService {
  private logger = new PaytradeLogger('XERO_SERVICE');
  private xero: XeroClient;
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    @InjectRepository(XeroSyncLogs)
    private xeroSyncLogs: Repository<XeroSyncLogs>,
    @InjectRepository(XeroLogTemplates)
    private xeroLogTemplates: Repository<XeroLogTemplates>,
    @InjectRepository(CompanyUserRoles)
    private readonly companyUserRolesRepo: Repository<CompanyUserRoles>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    private readonly dataSource: DataSource,
    private xeroRefreshTokenService: XeroRefreshTokenService,
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

  async getAuthResponse(company_id: number) {
    const companyUserRole = await this.companyUserRolesRepo.findOne({
      where: {
        company_id,
        company_role: In(['PRIMARY ADMIN']),
        status: 'Active',
      },
    });

    const companyAdmin = companyUserRole
      ? await this.userDetails.findOne({
          where: { user_id: companyUserRole?.user_id },
        })
      : null;

    return await this.getAuthUrl(
      company_id,
      companyAdmin?.user_id,
      false,
      companyAdmin?.user_timezone,
    );
  }

  async getAuthUrl(
    company_id: number,
    userid,
    isadmin,
    timezone,
  ): Promise<string> {
    // Set the state dynamically
    this.xero.config.state = JSON.stringify({
      company_id,
      userid,
      isadmin,
      timezone,
    });
    return await this.xero.buildConsentUrl();
    // const stateObj = { company_id, userid, isadmin, timezone };

    // const encodedState = Buffer.from(JSON.stringify(stateObj)).toString(
    //   'base64',
    // );

    // // this.xero.config.state = encodedState;
    // // return await this.xero.buildConsentUrl();

    // const consentUrl = await this.xero.buildConsentUrl();
    // // return `${consentUrl}&state=${encodeURIComponent(encodedState)}`;

    // // Append state safely
    // const url = new URL(consentUrl);
    // url.searchParams.set('state', encodedState);

    // return url.toString();
  }

  async handleCallback(
    decoded: any,
    callbackUrl: string,
    integration_id: number,
  ) {
    try {
      const url = new URL(callbackUrl);
      // Get query parameters
      // console.log('Inside handleCallback:: url', url);

      const state = url.searchParams.get('state');
      if (!state) throw new Error('State not found');
      // console.log('Inside handleCallback:: state', state);

      // Set state on XeroClient before calling apiCallback - required for OAuth validation
      this.xero.config.state = state;

      const stateData = JSON.parse(state);
      // const stateData = JSON.parse(
      //   Buffer.from(state, 'base64').toString('utf8'),
      // );
      // console.log('Inside handleCallback:: stateData', stateData);

      const companyId = stateData?.company_id;
      if (!companyId) throw new Error('Company Id not found');

      const integrationDetails = await this.integrationDetails.findOne({
        where: { integration_id },
      });

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { integration_id },
      });

      let updatedXero: XeroIntegrationDetails = xeroDetails;
      const tokenSet = await this.xero.apiCallback(callbackUrl);
      // console.log('Inside handleCallback:: tokenSet', tokenSet);

      await this.xero.setTokenSet(tokenSet);
      if (!tokenSet.access_token) {
        throw new Error('Unable to authorize Xero. Please try again');
      }
      const tenants = await this.xero.updateTenants();
      // console.log('Inside handleCallback:: tenants', tenants);
      if (tenants.length === 0) {
        throw new Error(
          'No tenants found. Ensure the user is connected to a Xero organization.',
        );
      }

      if (xeroDetails && integrationDetails) {
        const tenant = tenants.find(
          (tenant) => tenant.tenantId === xeroDetails.tenant_id,
        );
        // if (!tenant) {
        //   throw new Error(
        //     'Selected organization not matches with the existing organization. Please ensure you have selected the right one.',
        //   );
        // }
        xeroDetails.tenant_name = tenant?.tenantName;
        xeroDetails.tenant_type = tenant?.tenantType;
        xeroDetails.status = tenant?.orgData?.organisationStatus;
        xeroDetails.subscription_status = tenant?.orgData?._class;
        xeroDetails.id_token = tokenSet.id_token;
        xeroDetails.access_token = tokenSet.access_token;
        xeroDetails.refresh_token = tokenSet.refresh_token;
        xeroDetails.expires_at = tokenSet.expires_at;
        xeroDetails.updated_by = decoded?.userId;
        xeroDetails.updated_on = moment.tz('UTC');
        xeroDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
        updatedXero = await this.xeroIntegrationDetails.save(xeroDetails);
      } else {
        const tenants = await this.xero.updateTenants();
        if (tenants.length === 0) {
          throw new Error(
            'No tenants found. Ensure the user is connected to a Xero organization.',
          );
        }

        const checkExistence = await this.xeroIntegrationDetails.findOne({
          where: { tenant_id: tenants[0]?.tenantId, status: 'ACTIVE' },
        });

        if (
          checkExistence &&
          checkExistence.tenant_id === tenants[0]?.tenantId &&
          checkExistence.company_id !== companyId
        ) {
          throw new Error(
            'Selected organization is mapped to some other business. Please ensure you have selected the right one.',
          );
        }

        const data: any = {
          company_id: companyId,
          integration_id: integration_id,
          tenant_id: tenants[0]?.tenantId,
          tenant_name: tenants[0]?.tenantName,
          tenant_type: tenants[0]?.tenantType,
          status: tenants[0]?.orgData?.organisationStatus,
          subscription_status: tenants[0]?.orgData?._class,
          id_token: tokenSet.id_token,
          access_token: tokenSet.access_token,
          refresh_token: tokenSet.refresh_token,
          expires_at: tokenSet.expires_at,
          created_by: decoded?.userId,
          created_on: moment.tz('UTC'),
          created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        };
        const xeroIntegrationDetails: any =
          await this.xeroIntegrationDetails.create(data);
        const response = await this.xeroIntegrationDetails.save(
          xeroIntegrationDetails,
        );
        const expiresAt = tokenSet.expires_at;
        if (moment.unix(expiresAt).isBefore(moment().utc())) {
          updatedXero = await this.refreshTokenSet(companyId, this.xero);
        }
        updatedXero = response;
      }
      await this.xeroRefreshTokenService.addRefreshSafeguardJob(companyId);
      return updatedXero;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      this.logger.error(`Inside handleCallback:: error ${JSON.stringify(error)}`);
      throw new Error(errMsg);
    }
  }

  async getAllTenants() {
    const tenants = await this.xero.tenants;
    return tenants;
  }

  async getTenantId() {
    const tenants = this.xero.tenants;
    if (tenants.length === 0) {
      throw new Error(
        'No tenants found. Ensure the user is connected to a Xero organization.',
      );
    }
    const tenantId = tenants[0]?.tenantId;
    return tenantId;
  }

  async getIntegrationDetails(company_id) {
    return await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
  }

  async createTrackingCategory(company_id, category_name) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);
      const trackingCategoryResponse =
        await this.xero.accountingApi.createTrackingCategory(
          xeroDetails.tenant_id,
          { name: category_name },
        );
      const trackingCategory =
        trackingCategoryResponse?.body?.trackingCategories?.find(
          (category) =>
            category?.name?.toLowerCase() === category_name.toLowerCase(),
        );
      return trackingCategory?.trackingCategoryID;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async createTrackingOptions(data: any) {
    try {
      const { company_id, type, name } = data;
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      if (
        (type == 'project' && !xeroDetails.project_category_id) ||
        (type == 'contract' && !xeroDetails.contract_category_id)
      )
        throw 'Tracking Category doesnot exists';
      const trackingOption: any = {
        name: name,
        status: 'ACTIVE',
        trackingCategoryID:
          type == 'project'
            ? xeroDetails.project_category_id
            : xeroDetails.contract_category_id,
      };
      const response = await this.xero.accountingApi.createTrackingOptions(
        xeroDetails.tenant_id,
        type == 'project'
          ? xeroDetails.project_category_id
          : xeroDetails.contract_category_id,
        trackingOption,
      );

      return JSON.stringify(response.body.options[0]);
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getTrackingCategories(company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);
      const xeroTenantId = xeroDetails.tenant_id;
      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const response: any = await this.xero.accountingApi.getTrackingCategories(
        xeroTenantId,
        where,
        order,
        includeArchived,
      );

      const tracking_category_list = response?.body?.trackingCategories
        ?.filter((element) => element.status === 'ACTIVE')
        ?.map((element) => ({
          id: element.trackingCategoryID,
          name: element.name,
          status: element.status,
        }));
      return {
        tracking_category_list: tracking_category_list || [],
        total_count: tracking_category_list.length || 0,
      };
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getXeroDetailsForCompany(id: string) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails
        .createQueryBuilder('x')
        .leftJoin(
          'integration_details',
          'i',
          'x.integration_id = i.integration_id',
        )
        .select([
          'x.id AS id',
          'x.integration_id AS integration_id',
          'x.company_id AS company_id',
          'x.tenant_id AS tenant_id',
          'x.tenant_name AS tenant_name',
          'x.tenant_type AS tenant_type',
          'x.status AS status',
          'x.project_category_id AS project_category_id',
          'x.contract_category_id AS contract_category_id',
          'i.id AS integration_list_id',
          'i.integration_name AS integration_name',
          'i.integration_type AS integration_type',
          'i.integration_status AS integration_status',
          'x.action_buttons AS action_buttons',
          'x.invoice_code AS invoice_code',
          'x.bill_code AS bill_code',
          'x.retention_payable_retained_code AS retention_payable_retained_code',
          'x.retention_payable_release_code AS retention_payable_release_code',
          'x.retention_receivable_retained_code AS retention_receivable_retained_code',
          'x.retention_receivable_release_code AS retention_receivable_release_code',
          'x.liability_payable_code AS liability_payable_code',
          'x.liability_receivable_code AS liability_receivable_code',
          'x.simplified_retention_accounting AS simplified_retention_accounting',
          'x.invoice_tax_code AS invoice_tax_code',
          'x.bill_tax_code AS bill_tax_code',
          'x.reference_format AS reference_format',
          'x.wait_time AS wait_time',
          'x.pt_to_xero_invoice_as_draft AS pt_to_xero_invoice_as_draft',
          'x.pt_to_xero_bill_as_draft AS pt_to_xero_bill_as_draft',
          'x.pt_to_xero_payment_as_draft AS pt_to_xero_payment_as_draft',
          'x.xero_to_pt_invoice_as_draft AS xero_to_pt_invoice_as_draft',
          'x.xero_to_pt_bill_as_draft AS xero_to_pt_bill_as_draft',
          'x.xero_to_pt_payment_as_draft AS xero_to_pt_payment_as_draft',
        ])
        .where(`i.id = :id`, { id })
        .getRawOne();

      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(xeroDetails.company_id, this.xero);
      const xeroTenantId = xeroDetails.tenant_id;
      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const response: any = await this.xero.accountingApi.getTrackingCategories(
        xeroTenantId,
        where,
        order,
        includeArchived,
      );
      const tracking_category_ids = [];
      if (xeroDetails.project_category_id) {
        tracking_category_ids.push(xeroDetails.project_category_id);
      }
      if (xeroDetails.contract_category_id) {
        tracking_category_ids.push(xeroDetails.contract_category_id);
      }
      const tracking_category_list = response?.body?.trackingCategories
        ?.filter((element) =>
          tracking_category_ids.includes(element.trackingCategoryID),
        )
        ?.map((element) => ({
          id: element.trackingCategoryID,
          name: element.name,
          status: element.status,
        }));
      for (const element of tracking_category_list) {
        if (xeroDetails.project_category_id === element.id) {
          xeroDetails.project_category_name = element.name;
        }
        if (xeroDetails.contract_category_id === element.id) {
          xeroDetails.contract_category_name = element.name;
        }
      }

      return xeroDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async deleteTrackingCategory(company_id, category_id) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);
      const trackingCategoriesResponse =
        await this.xero.accountingApi.deleteTrackingCategory(
          xeroDetails.tenant_id,
          category_id,
        );
      const trackingCategories =
        trackingCategoriesResponse.body.trackingCategories[0];
      return trackingCategories;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async checkTrackingCategoryId(decoded, company_id: number, category_type) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      const integrationDetails = await this.integrationDetails.findOne({
        where: { integration_id: xeroDetails.integration_id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      if (
        [
          'Inactive',
          'Disconnected',
          'Deleted - archived',
          'Connected - paused',
        ].includes(integrationDetails.integration_status)
      )
        throw `Unable to check the id settings`;

      let integration_status = integrationDetails.integration_status;

      if (category_type === 'project' && !xeroDetails.project_category_id)
        integration_status = 'Awaiting project id tracking setup';
      if (category_type === 'contract' && !xeroDetails.contract_category_id)
        integration_status = 'Awaiting contract id tracking setup';

      const xeroTenantId = xeroDetails.tenant_id;
      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const response: any = await this.xero.accountingApi.getTrackingCategories(
        xeroTenantId,
        where,
        order,
        includeArchived,
      );

      const category_id =
        category_type === 'project'
          ? xeroDetails.project_category_id
          : xeroDetails.contract_category_id;

      const tracking_category = category_id
        ? response?.body?.trackingCategories
            ?.filter((element) => element.trackingCategoryID === category_id)
            ?.map((element) => ({
              id: element.trackingCategoryID,
              name: element.name,
              status: element.status,
            }))
        : [];

      if (!tracking_category || tracking_category.length === 0) {
        integration_status =
          category_type === 'project'
            ? 'Awaiting project id tracking setup'
            : 'Awaiting contract id tracking setup';
        // if (category_type === 'project') {
        //   xeroDetails.project_category_id = null;
        //   xeroDetails.action_buttons.import_project = false;
        // }
      }
      const previousStatus = integrationDetails.integration_status;

      if (integration_status !== integrationDetails.integration_status) {
        const updateIntegrationResult = await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            previous_status: previousStatus,
            integration_status: integration_status,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: integrationDetails.id })
          .execute();
      }

      return await this.integrationDetails.findOne({
        where: { id: integrationDetails.id },
      });
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async disconnectFromXero(decoded, id, type) {
    try {
      const integrationDetails = await this.integrationDetails.findOne({
        where: { id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: integrationDetails.company_id, status: 'ACTIVE' },
      });
      if (xeroDetails && xeroDetails?.tenant_id && xeroDetails?.access_token) {
        try {
          // const revokeTokenResponse = await this.xero.revokeToken();
          const revokeTokenResponse = await this.disconnectXero(xeroDetails);
          if (revokeTokenResponse === 204) {
            return await this.updateIntegrationStatus(
              decoded,
              integrationDetails.id,
              xeroDetails.id,
              type,
            );
          }
          throw `Failed to disconnect from Xero`;
        } catch (error) {
          const errMsg = error?.message ? error?.message : error;
          if (
            errMsg?.toLowerCase()?.includes('Tenant not found'.toLowerCase())
          ) {
            return await this.updateIntegrationStatus(
              decoded,
              integrationDetails.id,
              xeroDetails.id,
              type,
            );
          }
          throw errMsg;
        }
      } else {
        return await this.updateIntegrationStatus(
          decoded,
          integrationDetails.id,
          '',
          type,
        );
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async disconnectXero(xeroDetails: any) {
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const revokeUrl = 'https://identity.xero.com/connect/revocation';

    try {
      // const response = await axios.post(
      //   revokeUrl,
      //   new URLSearchParams({
      //     token: accessToken,
      //   }).toString(),
      //   {
      //     headers: {
      //       Authorization:
      //         'Basic ' +
      //         Buffer.from(`${clientId}:${clientSecret}`).toString('base64'), //`Bearer ${accessToken}`,
      //       'Content-Type': 'application/x-www-form-urlencoded',
      //     },
      //   },
      // );

      await this.refreshTokenSet(xeroDetails?.company_id, this.xero);
      const getConnections = await axios.get(
        'https://api.xero.com/connections',
        {
          headers: {
            Authorization: `Bearer ${xeroDetails?.access_token}`,
          },
        },
      );
      const connections =
        getConnections.status === 200 ? getConnections.data : [];
      const connection = connections?.filter(
        (connection) => connection?.tenantId === xeroDetails?.tenant_id,
      );
      if (connection && connection?.length > 0) {
        const response = await axios.delete(
          `https://api.xero.com/connections/${connection[0]?.id}`,
          {
            headers: {
              Authorization: `Bearer ${xeroDetails.access_token}`,
            },
          },
        );
        return response.status;
      }
      throw `Tenant not found`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async updateIntegrationStatus(
    decoded: any,
    integrationId: string,
    xeroId: string,
    type: 'disconnect' | 'delete',
  ): Promise<IntegrationDetails> {
    const integrationDetails = await this.integrationDetails.findOne({
      where: { id: integrationId },
    });

    if (!integrationDetails) throw `No xero integration found`;

    const xeroDetails = xeroId
      ? await this.xeroIntegrationDetails.findOne({
          where: { id: xeroId },
        })
      : null;
    if (xeroDetails) {
      if (type === 'disconnect') {
        const updateXeroResult = await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            status: 'INACTIVE',
            // access_token: null,
            // id_token: null,
            // refresh_token: null,
            // expires_at: null,
            // project_category_id: null,
            // contract_category_id: null,
            // action_buttons: {
            //   import_bank: false,
            //   import_contact: false,
            //   import_project: false,
            // },
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroId })
          .execute();
      } else {
        const updateXeroResult = await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            status: 'INACTIVE',
            // access_token: null,
            // id_token: null,
            // refresh_token: null,
            // expires_at: null,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroId })
          .execute();
      }
    }

    const previousStatus = integrationDetails.integration_status;

    const updateIntegrationResult = await this.integrationDetails
      .createQueryBuilder()
      .update(IntegrationDetails)
      .set({
        previous_status: () =>
          `(integration_status)::text::integration_details_previous_status_enum`, //previousStatus,
        integration_status:
          type === 'disconnect' ? 'Disconnected' : 'Deleted - archived',
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where(`id = :id`, { id: integrationId })
      .execute();
    return await this.integrationDetails.findOne({
      where: { id: integrationId },
    });
  }

  async pauseOrUnpauseXero(
    decoded: any,
    id: string,
    is_paused: boolean,
  ): Promise<IntegrationDetails> {
    const integrationDetails = await this.integrationDetails.findOne({
      where: { id },
    });
    if (!integrationDetails) throw `No xero integration found`;

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: integrationDetails.company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails) throw `No Xero integration found`;

    // const updateXeroResult = await this.xeroIntegrationDetails
    //   .createQueryBuilder()
    //   .update(XeroIntegrationDetails)
    //   .set({
    //     project_category_id: null,
    //     contract_category_id: null,
    //     action_buttons: {
    //       import_bank: false,
    //       import_contact: false,
    //       import_project: false,
    //     },
    //     updated_by: decoded?.userId,
    //     updated_on: moment.tz('UTC'),
    //     updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
    //   })
    //   .where(`id = :id`, { id: xeroDetails.id })
    //   .execute();

    const previousStatus = integrationDetails.integration_status;

    const updateIntegrationResult = await this.integrationDetails
      .createQueryBuilder()
      .update(IntegrationDetails)
      .set({
        previous_status: () =>
          `(integration_status)::text::integration_details_previous_status_enum`, //previousStatus,
        integration_status: is_paused
          ? 'Connected - paused'
          : () =>
              `(previous_status)::text::integration_details_integration_status_enum`, //'Connected - pending settings/mapping',
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where(`id = :id`, { id })
      .execute();
    return await this.integrationDetails.findOne({
      where: { id },
    });
  }

  async skipContractMapping(decoded: any, company_id: number): Promise<any> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails || !xeroDetails.integration_id)
      throw `No Xero integration found`;

    const integrationDetails = await this.integrationDetails.findOne({
      where: { integration_id: xeroDetails.integration_id },
    });
    if (!integrationDetails) throw `No xero integration found`;

    if (
      ![
        'Pending contract tracking id check',
        'Awaiting contract id tracking setup',
        'Pending contract tracking id mapping',
      ].includes(integrationDetails.integration_status)
    )
      throw `Unable to skip contract mapping`;

    const previousStatus = integrationDetails.integration_status;

    const updateIntegrationResult = await this.integrationDetails
      .createQueryBuilder()
      .update(IntegrationDetails)
      .set({
        previous_status: previousStatus,
        integration_status: 'Connected - active',
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where(`id = :id`, { id: integrationDetails.id })
      .execute();

    return updateIntegrationResult;
  }

  //Need to add sync log, invoices, bills, payments
  async getXeroDashboardCountForCompany(company_id: number) {
    try {
      const xeroDetails: any = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      if (!xeroDetails) throw `No xero integration found`;
      const combinedTableQuery = `
          WITH combined_table AS (
            SELECT 'settings' as type, integration_id, 'issues' as status, 
            ((CASE WHEN project_category_id IS NULL THEN 1 ELSE 0 END) + (CASE WHEN contract_category_id IS NULL THEN 1 ELSE 0 END) +
            (CASE WHEN invoice_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN bill_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN retention_payable_retained_code IS NULL THEN 1 ELSE 0 END) + 
            (CASE WHEN retention_payable_release_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN retention_receivable_retained_code IS NULL THEN 1 ELSE 0 END) +
            (CASE WHEN retention_receivable_release_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN liability_payable_code IS NULL THEN 1 ELSE 0 END) +
            (CASE WHEN liability_receivable_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN reference_format IS NULL THEN 1 ELSE 0 END) +
            (CASE WHEN invoice_tax_code IS NULL THEN 1 ELSE 0 END) + (CASE WHEN bill_tax_code IS NULL THEN 1 ELSE 0 END)) AS status_count
            FROM xero_integration_details
            UNION
            SELECT 'bank' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_bank_account_details 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END 
            UNION
            SELECT 'contact' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_contact_details 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END 
            UNION
            SELECT 'project' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_project_details 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END 
            UNION
            SELECT 'contract' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_contract_details 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END  
            UNION
            SELECT 'bill' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_invoices_bills  WHERE type = 'ACCPAY' 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END  
            UNION
            SELECT 'invoice' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_invoices_bills WHERE type = 'ACCREC' 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END 
            UNION
            SELECT 'payment' AS type, integration_id as integration_id, 
                  CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END AS status, 
                  COUNT(*) AS status_count
            FROM xero_payments 
            GROUP BY integration_id, CASE WHEN mapped_status IS NULL THEN 'pending' ELSE 'synced' END 
          )
          SELECT c.*, i.integration_id, i.company_id, i.integration_status
          FROM combined_table c 
          LEFT JOIN integration_details i 
          ON c.integration_id = i.integration_id WHERE i.integration_status <> 'Deleted - archived' AND i.company_id = ${company_id} 
          ORDER BY c.type;`;

      const result = await this.dataSource.query(combinedTableQuery);
      const statuses = ['synced', 'pending'];
      const types = [
        'settings',
        'bank',
        'contact',
        'project',
        'contract',
        'bill',
        'invoice',
        'payment',
      ];
      const integrationMap = new Map<string, any>();

      // Group data by integration_id, company_id, type, and status
      result.forEach((entry) => {
        const key = `${entry.integration_id}-${entry.company_id}-${entry.type}-${entry.status}`;
        integrationMap.set(key, entry);
      });

      const filledData: any[] = [];

      // Ensure each integration_id & company_id has exactly 2 statuses for each type
      const uniqueIntegrations: string[] = Array.from(
        new Set(result.map((d) => `${d.integration_id}-${d.company_id}`)),
      );

      uniqueIntegrations.forEach((integrationKey) => {
        const [integration_id, company_id] = integrationKey
          .split('-')
          .map(Number);

        types.forEach((type) => {
          statuses.forEach((status) => {
            const key = `${integration_id}-${company_id}-${type}-${status}`;
            if (integrationMap.has(key)) {
              filledData.push(integrationMap.get(key)); // Use existing entry
            } else {
              filledData.push({
                type,
                integration_id,
                status,
                status_count: '0', // Default count
                company_id,
                integration_status: 'N/A', // Default status
              });
            }
          });
        });
      });

      return filledData;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async insertXeroSyncLogs(
    decoded,
    createXeroSyncLogInput: CreateXeroSyncLogInput,
  ) {
    let xeroSyncLog;
    if (!createXeroSyncLogInput?.id) {
      delete createXeroSyncLogInput?.id;
      let allowCreation = true;
      const templateDetails = await this.xeroLogTemplates.findOne({
        where: { id: createXeroSyncLogInput?.log_template_id },
      });
      if (
        templateDetails &&
        templateDetails.sync_status !== 'Succeeded' &&
        templateDetails.from_xero &&
        (templateDetails.sync_type?.toLowerCase()?.includes('webhook') ||
          templateDetails.sync_type?.toLowerCase()?.includes('scheduler'))
      ) {
        const checkExistenceInSchedulers = await this.xeroSyncLogs.findOne({
          where: {
            integration_id: createXeroSyncLogInput.integration_id,
            log_template_id: createXeroSyncLogInput?.log_template_id,
            reference_id: createXeroSyncLogInput?.reference_id,
          },
        });
        if (checkExistenceInSchedulers) {
          allowCreation = false;
        } else {
          const checkExistenceInOthers = templateDetails?.associated_log_ids
            ? await this.xeroSyncLogs.findOne({
                where: {
                  integration_id: createXeroSyncLogInput.integration_id,
                  log_template_id: In(templateDetails?.associated_log_ids),
                  reference_id: createXeroSyncLogInput?.reference_id,
                },
              })
            : null;
          if (checkExistenceInOthers) {
            allowCreation = false;
          }
        }
      }
      if (allowCreation) {
        const response = await this.xeroSyncLogs.create({
          ...createXeroSyncLogInput,
          ...{
            created_by: decoded?.userId,
            created_on: moment.tz('UTC'),
            created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          },
        });
        xeroSyncLog = await this.xeroSyncLogs.save(response);
      }
    } else {
      await this.xeroSyncLogs
        .createQueryBuilder()
        .update(XeroSyncLogs)
        .set({
          ...createXeroSyncLogInput,
          ...{
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          },
        })
        .where('id = :id', { id: createXeroSyncLogInput?.id })
        .execute();
      xeroSyncLog = await this.xeroSyncLogs.findOne({
        where: { id: createXeroSyncLogInput?.id },
      });
    }

    return xeroSyncLog;
  }

  async getXeroSyncLogs(getXeroSyncLogsInput: GetXeroSyncLogsInput, timezone) {
    const { id, page_number, page_size, sorting_field } = getXeroSyncLogsInput;
    const skip =
      (getXeroSyncLogsInput.page_number - 1) * getXeroSyncLogsInput.page_size;

    const queryBuilder = await this.xeroSyncLogs
      .createQueryBuilder('log')
      .select('log.id', 'id')
      .addSelect('log.sync_id', 'sync_id')
      .addSelect('log.integration_id', 'integration_id')
      .addSelect('log.log_template_id', 'log_template_id')
      // .addSelect('CAST(log.dynamic_values AS TEXT)', 'dynamic_values')
      // .addSelect('CAST(log.reference AS TEXT)', 'reference')
      .addSelect('log.dynamic_values', 'dynamic_values')
      .addSelect('log.reference', 'reference')
      .addSelect('log.project_id', 'project_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('log.contract_id', 'contract_id')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('template.sync_type', 'sync_type')
      .addSelect('template.description', 'description')
      .addSelect('template.process', 'process')
      .addSelect('template.from_xero', 'from_xero')
      .addSelect('template.sync_status', 'sync_status')
      .addSelect('log.created_on', 'created_on')
      .addSelect('xero.company_id', 'company_id')
      .addSelect('company.company_name', 'company_name')
      // .distinct(true)
      .innerJoin('log.xeroLogTemplates', 'template')
      .leftJoin(
        'integration_details',
        'integration',
        'integration.integration_id = log.integration_id',
      )
      .leftJoin(
        'xero_integration_details',
        'xero',
        'xero.integration_id = log.integration_id',
      )
      .leftJoin('xero.companyDetails', 'company')
      .leftJoin('log.xeroProjectDetails', 'project')
      .leftJoin('log.xeroContractDetails', 'contract');

    if (id) {
      queryBuilder.andWhere(`integration.id = :id`, {
        id: id,
      });
    }

    if (getXeroSyncLogsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getXeroSyncLogsInput.date_filter === 'Custom' &&
        getXeroSyncLogsInput.start_date &&
        getXeroSyncLogsInput.end_date
      ) {
        startDate = moment
          .tz(getXeroSyncLogsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getXeroSyncLogsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (getXeroSyncLogsInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (getXeroSyncLogsInput.date_filter === 'Last Month') {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere(
        'log.created_on BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getXeroSyncLogsInput.sorting_order
      ? getXeroSyncLogsInput.sorting_order
      : 'DESC';
    if (!sorting_field) {
      queryBuilder.orderBy({ 'log.created_on': sorting_order });
      if (page_number && page_size) {
        queryBuilder.offset((page_number - 1) * page_size).limit(page_size);
      }
    }
    if (sorting_field && sorting_field !== 'description') {
      switch (sorting_field) {
        case 'created_on':
          {
            queryBuilder.orderBy({ 'log.created_on': sorting_order });
          }
          break;
        case 'sync_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(template.sync_status AS text))': sorting_order,
            });
          }
          break;
        case 'sync_type':
          {
            queryBuilder.orderBy({
              'LOWER(template.sync_type)': sorting_order,
            });
          }
          break;
        case 'project_name':
          {
            queryBuilder.orderBy({
              'LOWER(project.project_name)': sorting_order,
            });
          }
          break;
        case 'contract_name':
          {
            queryBuilder.orderBy({
              'LOWER(contract.contract_name)': sorting_order,
            });
          }
          break;
        case 'process':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(template.process AS text))': sorting_order,
            });
          }
          break;
        case 'reference':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(log.reference AS text))': sorting_order,
            });
          }
          break;
      }
      if (page_number && page_size) {
        queryBuilder.offset((page_number - 1) * page_size).limit(page_size);
      }
    }

    const [response, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const rawResults = Array.from(
      new Map(response.map((result) => [result.id, result])).values(),
    );

    const results = (await this.iterateLogArray(rawResults)) as any[];

    let finalResult, finalCount;
    if (sorting_field && sorting_field === 'description') {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(results).sort((a, b) =>
          a.description
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.description?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(results).sort((a, b) =>
          b.description
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.description?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        page_number && page_size ? (page_number - 1) * page_size : 0;
      const endIndex =
        page_number && page_size
          ? Math.min(
              (page_number - 1) * page_size + page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else {
      finalResult = results;
      finalCount = total_count;
    }

    const statuses = ['Succeeded', 'Warning', 'Failed'];
    const statusMap = new Map<string, any>();
    if (id) {
      const combinedTableQuery = `
        WITH combined_table AS (
            SELECT l.integration_id as integration_id, t.sync_status, COUNT(l.*) AS status_count
            FROM xero_sync_logs l INNER JOIN xero_log_templates t on l.log_template_id = t.id
            GROUP BY l.integration_id, t.sync_status
          )
          SELECT c.*, i.company_id, i.integration_status
          FROM combined_table c 
          LEFT JOIN integration_details i 
          ON c.integration_id = i.integration_id WHERE i.integration_status <> 'Deleted - archived' AND i.id = '${id}'
        `;

      const result = await this.dataSource.query(combinedTableQuery);

      // Aggregate database results into the map
      result.forEach((entry) => {
        statusMap.set(entry.sync_status, {
          sync_status: entry.sync_status,
          status_count: entry.status_count.toString(), // Ensure it's a string
        });
      });
    }

    // Fill missing statuses with default values
    const filledData = statuses.map(
      (sync_status) =>
        statusMap.get(sync_status) || { sync_status, status_count: '0' },
    );

    return {
      total_count: finalCount,
      xero_logs: finalResult,
      count: filledData,
    };
  }

  async viewXeroSyncLog(id: string) {
    const syncLog = await this.xeroSyncLogs
      .createQueryBuilder('l')
      .innerJoin('xero_log_templates', 't', 'l.log_template_id = t.id')
      .leftJoin(
        'client_suppliers_details',
        'c',
        "c.id = (l.reference::jsonb->>'paytradeId')::uuid AND t.sync_type = 'Contacts'",
      )
      .leftJoin(
        'xero_contact_details',
        'contact',
        "contact.id = (l.reference::jsonb->>'xeroId')::uuid AND t.sync_type = 'Contacts'",
      )
      .leftJoin(
        'project_details',
        'p',
        "p.id = (l.reference::jsonb->>'paytradeId')::uuid AND t.sync_type = 'Projects'",
      )
      .leftJoin(
        'xero_project_details',
        'project',
        "project.id = (l.reference::jsonb->>'xeroId')::uuid AND t.sync_type = 'Projects'",
      )
      .leftJoin(
        'bank_accounts',
        'b',
        "b.id = (l.reference::jsonb->>'paytradeId')::uuid AND t.sync_type = 'Bank accounts'",
      )
      .leftJoin(
        'xero_bank_account_details',
        'bank',
        "bank.id = (l.reference::jsonb->>'xeroId')::uuid AND t.sync_type = 'Bank accounts'",
      )
      .leftJoin(
        'contract_details',
        'cd',
        "cd.id = (l.reference::jsonb->>'paytradeId')::uuid AND t.sync_type = 'Contracts'",
      )
      .leftJoin(
        'xero_contract_details',
        'contract',
        "contract.id = (l.reference::jsonb->>'xeroId')::uuid AND t.sync_type = 'Contracts'",
      )
      .leftJoin('xero_project_details', 'pd', 'pd.id = l.project_id')
      .select([
        'l.id AS id',
        'l.sync_id AS sync_id',
        'l.integration_id AS integration_id',
        'l.log_template_id AS log_template_id',
        'l.dynamic_values AS dynamic_values',
        'l.reference AS reference',
        'l.project_id AS project_id',
        'pd.project_name AS project_name',
        'l.contract_id AS contract_id',
        'l.created_on AS created_on',
        't.sync_type AS sync_type',
        't.description AS description',
        't.process AS process',
        't.sync_status AS sync_status',
        't.from_xero AS from_xero',
        't.error_code AS error_code',
        "l.reference::jsonb->>'paytradeId' AS paytrade_id",
        "l.reference::jsonb->>'xeroId' AS xero_id",
        `CASE WHEN l.reference_id IS NOT NULL THEN l.reference_id ELSE 'N/A' END AS reference_id`,
        'l.history AS history',
        'l.notification AS notification',
        'l.information_required AS information_required',
        'l.important_checks AS important_checks',
        'l.error_message AS error_message',
        'l.xero_records AS xero_records',
        'l.paytrade_records AS paytrade_records',
        'l.new_records AS new_records',
        'l.updated_records AS updated_records',
        'l.synced_records AS synced_records',
        'l.api_name AS api_name',
        'l.api_payload AS api_payload',
        `COALESCE(
            CASE
                WHEN c.id IS NOT NULL THEN jsonb_build_object(
                  'client_supplier_id', c.client_supplier_id,
                  'company_id', c.company_id,
                  'client_supplier_name', c.client_supplier_name,
                  'business_name', c.business_name,
                  'client_supplier_type', c.client_supplier_type,
                  'client_supplier_status', c.client_supplier_status,
                  'entity_type', c.entity_type,
                  'place_id', c.place_id,
                  'client_supplier_address', c.client_supplier_address,
                  'country', c.country,
                  'region', c.region,
                  'latitude', c.latitude,
                  'longitude', c.longitude,
                  'client_phone_no', c.client_phone_no,
                  'client_email_id', c.client_email_id,
                  'client_website', c.client_website,
                  'qbcc_number', c.qbcc_number,
                  'acn_number', c.acn_number,
                  'abn_number', c.abn_number,
                  'tfn_number', c.tfn_number,
                  'payment_terms', c.payment_terms
                )
              WHEN p.id IS NOT NULL THEN jsonb_build_object(
                  'project_id', p.project_id,
                  'company_id', p.company_id,
                  'project_name', p.project_name,
                  'project_role', p.project_role,
                  'project_date', p.project_date,
                  'project_description', p.project_description,
                  'site_address', p.site_address,
                  'country', p.country,
                  'region', p.region,
                  'place_id', p.place_id,
                  'latitude', p.latitude,
                  'longitude', p.longitude,
                  'head_contract_sum', p.head_contract_sum,
                  'retention_type', p.retention_type,
                  'number_of_units', p.number_of_units,
                  'pta_eligibility', p.pta_eligibility,
                  'rta_eligibility', p.rta_eligibility,
                  'pta_compliance', p.pta_compliance,
                  'rta_compliance', p.rta_compliance,
                  'project_status', p.project_status
                )
              WHEN b.id IS NOT NULL THEN jsonb_build_object(
                  'bank_account_id', b.bank_account_id,
                  'company_id', b.company_id,
                  'account_name', b.account_name,
                  'account_type', b.account_type,
                  'account_number', b.account_number,
                  'bsb_number', b.bsb_number,
                  'project_ids', b.project_ids,
                  'trustee_id', b.trustee_id,
                  'client_supplier_id', b.client_supplier_id,
                  'contract_date', b.contract_date,
                  'opening_date', b.opening_date,
                  'contract_practical_completion_date', b.contract_practical_completion_date,
                  'first_sub_contract_date', b.first_sub_contract_date,
                  'contract_value', b.contract_value,
                  'retention_trust_certificate_attachment_ids', b.retention_trust_certificate_attachment_ids,
                  'status', b.status,
                  'previous_status', b.previous_status,
                  'financial_institution', b.financial_institution,
                  'delegate_powers', b.delegate_powers,
                  'current_balance', b.current_balance,
                  'interest_charges', b.interest_charges,
                  'associated_cash_account_id', b.associated_cash_account_id
                )
                  WHEN cd.id IS NOT NULL THEN jsonb_build_object(
                  'contract_id', cd.contract_id,
                  'company_id', cd.company_id,
                  'contract_name', cd.contract_name,
                  'client_supplier_role', cd.client_supplier_role,
                  'contract_type', cd.contract_type,
                  'contract_status', cd.contract_status,
                  'contract_date', cd.contract_date,
                  'project_id', cd.project_id,
                  'client_supplier_id', cd.client_supplier_id,
                  'retention_type', cd.retention_type,
                  'payment_terms', cd.payment_terms,
                  'initial_contract_sum', cd.initial_contract_sum,
                  'attachment_id', cd.attachment_id,
                  'contract_start_date', cd.contract_start_date,
                  'defect_liability_end_date', cd.defect_liability_end_date,
                  'payment_from_account', cd.payment_from_account,
                  'retention_from_account', cd.retention_from_account,
                  'payment_to_account', cd.payment_to_account,
                  'previous_status', cd.previous_status,
                  'notice_generated', cd.notice_generated
                )
              ELSE '{}'::jsonb 
            END, '{}'::jsonb
        ) AS paytrade_details`,
        `COALESCE(
            CASE
                WHEN contact.id IS NOT NULL THEN jsonb_build_object(
                    'id', contact.id,
                    'contact_id', contact.contact_id,
                    'integration_id', contact.integration_id,
                    'tenant_id', contact.tenant_id,
                    'merge_to_contact_id', contact.merge_to_contact_id,
                    'contact_name', contact.contact_name,
                    'contact_status', contact.contact_status,
                    'is_supplier', contact.is_supplier,
                    'is_customer', contact.is_customer,
                    'mapped_status', contact.mapped_status,
                    'pt_contact_id', contact.pt_contact_id
                )
                    WHEN project.id IS NOT NULL THEN jsonb_build_object(
                    'id', project.id,
                    'project_id', project.project_id,
                    'integration_id', project.integration_id,
                    'tenant_id', project.tenant_id,
                    'project_name', project.project_name,
                    'project_status', project.project_status,
                    'mapped_status', project.mapped_status,
                    'pt_project_id', project.pt_project_id
                )
                    WHEN bank.id IS NOT NULL THEN jsonb_build_object(
                    'id', bank.id,
                    'account_id', bank.account_id,
                    'integration_id', bank.integration_id,
                    'tenant_id', bank.tenant_id,
                    'account_name', bank.account_name,
                    'account_number', bank.account_number,
                    'bsb_number', bank.bsb_number,
                    'account_type', bank.account_type,
                    'account_status', bank.account_status,
                    'description', bank.description,
                    'mapped_status', bank.mapped_status,
                    'pt_bank_account_id', bank.pt_bank_account_id
                )
                    WHEN contract.id IS NOT NULL THEN jsonb_build_object(
                    'id', contract.id,
                    'contract_id', contract.contract_id,
                    'integration_id', contract.integration_id,
                    'tenant_id', contract.tenant_id,
                    'contract_name', contract.contract_name,
                    'contract_status', contract.contract_status,
                    'pt_contract_id', contract.pt_contract_id,
                    'mapped_status', contract.mapped_status
                ) 
              ELSE '{}'::jsonb
            END, '{}'::jsonb
        ) AS xero_details`,
      ])
      .where('l.id = :id', { id })
      .getRawOne();

    const result = syncLog
      ? ((await this.iterateLogArray([syncLog])) as any[])
      : null;
    const finalResult =
      result && result.length > 0 && result[0] !== null ? result[0] : {};
    return finalResult;
  }

  async iterateLogArray(syncLogArray) {
    return new Promise(async (resolve, reject) => {
      if (syncLogArray && syncLogArray.length > 0) {
        syncLogArray?.forEach(async (element) => {
          if (element.dynamic_values) {
            // element.dynamic_values = JSON.parse(element.dynamic_values);
            const replaceVariablesRes = await this.replaceVariables(
              element.description,
              element.dynamic_values,
            );
            element.description = replaceVariablesRes;
          }
        });
      } else {
        syncLogArray = [];
      }
      resolve(syncLogArray);
    });
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }

  async getAccountCodes(data: GetAccountCodesInput) {
    try {
      const { company_id } = data;
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      const response = await this.xero.accountingApi.getAccounts(
        xeroDetails.tenant_id,
        new Date('1900-01-01T00:00:00.000+00:00'),
        'Status=="ACTIVE"',
        'Name ASC',
      );
      const accounts = response.body.accounts || [];

      if (accounts && accounts[0] !== null && accounts.length !== 0) {
        const code_list = accounts
          // ?.filter((element) => element.enablePaymentsToAccount === true)
          ?.map((element) => ({
            id: element.accountID,
            name: element.name,
            code: element.code,
            type: element.type,
            status: element.status,
          }));
        return code_list;
      }
      throw `No account code is available`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async createAccount(data: CreateAccountInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found `;

      await this.refreshTokenSet(data.company_id, this.xero);

      const accounts: any = {
        code: data.code,
        name: data.account_name,
        currencyCode: CurrencyCode.AUD,
        description: data.description || '',
        type: data.account_type,
        enablePaymentsToAccount: data.enable_payments_to_account,
      };

      const response = await this.xero.accountingApi.createAccount(
        xeroDetails.tenant_id,
        accounts,
      );

      const account = response?.body?.accounts[0] || [];
      return account;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getTaxRates(data: GetTaxTypeInput) {
    try {
      const { company_id } = data;
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      const response = await this.xero.accountingApi.getTaxRates(
        xeroDetails.tenant_id,
        'Status=="ACTIVE"',
        'Name ASC',
      );

      const taxRates = response.body.taxRates || [];

      if (taxRates && taxRates[0] !== null && taxRates.length !== 0) {
        const taxRateList = taxRates?.map((element) => ({
          name: element.name,
          type: element.taxType,
          status: element.status,
        }));
        return taxRateList;
      }
      throw `No tax field type is available`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async createTaxRates(data: CreateTaxTypeInput) {
    try {
      const { company_id } = data;
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      let taxComponents = [];
      for (let element of data.tax_component) {
        const taxComponent: TaxComponent = {
          name: element.component_name,
          rate: element.rate,
          isCompound: element.is_compound,
        };
        taxComponents.push(taxComponent);
      }

      const report_tax_type: any = data.report_tax_type; //TaxRate.ReportTaxTypeEnum

      const taxRate: TaxRate = {
        name: data.display_name,
        reportTaxType: report_tax_type,
        taxComponents: taxComponents,
      };
      const taxRates: TaxRates = {
        taxRates: [taxRate],
      };

      const response = await this.xero.accountingApi.createTaxRates(
        xeroDetails.tenant_id,
        taxRates,
      );

      const taxRatesResponse = response?.body?.taxRates || [];

      return taxRatesResponse;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getOrganisation(company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.refreshTokenSet(company_id, this.xero);

      const response = await this.xero.accountingApi.getOrganisations(
        xeroDetails?.tenant_id,
      );

      const organisations = response.body.organisations || [];

      if (
        organisations &&
        organisations[0] !== null &&
        organisations.length !== 0
      ) {
        return { short_code: organisations[0].shortCode };
      }
      throw `No organisation is available`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async updateSettings(decoded: any, data: UpdateSettingsInput) {
    try {
      const { id } = data;

      const integrationDetails = await this.integrationDetails.findOne({
        where: { id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      if (
        [
          'Inactive',
          'Disconnected',
          'Deleted - archived',
          'Connected - paused',
        ].includes(integrationDetails.integration_status)
      )
        throw `Unable to update the pending settings`;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          integration_id: integrationDetails.integration_id,
          status: 'ACTIVE',
        },
      });
      if (!xeroDetails) throw `No xero integration found`;

      xeroDetails.project_category_id = data.project_category_id;
      xeroDetails.contract_category_id = data.contract_category_id;
      xeroDetails.invoice_code = data.invoice_code;
      xeroDetails.bill_code = data.bill_code;
      xeroDetails.retention_payable_retained_code =
        data.retention_payable_retained_code;
      xeroDetails.retention_receivable_retained_code =
        data.retention_receivable_retained_code;
      xeroDetails.retention_payable_release_code =
        data.retention_payable_release_code;
      xeroDetails.retention_receivable_release_code =
        data.retention_receivable_release_code;
      xeroDetails.liability_payable_code = data.liability_payable_code;
      xeroDetails.liability_receivable_code = data.liability_receivable_code;
      if (data.simplified_retention_accounting !== undefined) {
        xeroDetails.simplified_retention_accounting = data.simplified_retention_accounting;
      }
      xeroDetails.bill_tax_code = data.bill_tax_code;
      xeroDetails.invoice_tax_code = data.invoice_tax_code;
      xeroDetails.reference_format = data.reference_format;
      xeroDetails.wait_time = data.wait_time;
      xeroDetails.pt_to_xero_invoice_as_draft =
        data.pt_to_xero_invoice_as_draft;
      xeroDetails.pt_to_xero_bill_as_draft = data.pt_to_xero_bill_as_draft;
      xeroDetails.pt_to_xero_payment_as_draft =
        data.pt_to_xero_payment_as_draft;
      xeroDetails.xero_to_pt_invoice_as_draft =
        data.xero_to_pt_invoice_as_draft;
      xeroDetails.xero_to_pt_bill_as_draft = data.xero_to_pt_bill_as_draft;
      xeroDetails.xero_to_pt_payment_as_draft =
        data.xero_to_pt_payment_as_draft;
      xeroDetails.updated_by = decoded?.userId;
      xeroDetails.updated_on = moment.tz('UTC');
      xeroDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
      const updatedXeroDetails =
        await this.xeroIntegrationDetails.save(xeroDetails);

      const previousStatus = integrationDetails.integration_status;
      integrationDetails.previous_status = previousStatus;
      if (
        updatedXeroDetails.project_category_id &&
        updatedXeroDetails.action_buttons.import_bank === false &&
        updatedXeroDetails.action_buttons.import_contact === false &&
        updatedXeroDetails.action_buttons.import_project === false
      ) {
        integrationDetails.integration_status = 'Pending bank account mapping';
      } else if (
        updatedXeroDetails.project_category_id &&
        updatedXeroDetails.action_buttons.import_bank === true &&
        updatedXeroDetails.action_buttons.import_contact === false &&
        updatedXeroDetails.action_buttons.import_project === false
      ) {
        integrationDetails.integration_status = 'Pending contact mapping';
      } else if (
        updatedXeroDetails.project_category_id &&
        updatedXeroDetails.action_buttons.import_bank === true &&
        updatedXeroDetails.action_buttons.import_contact === true &&
        updatedXeroDetails.action_buttons.import_project === false
      ) {
        integrationDetails.integration_status =
          'Pending project tracking id mapping';
      } else if (
        updatedXeroDetails.project_category_id &&
        updatedXeroDetails.action_buttons.import_bank === true &&
        updatedXeroDetails.action_buttons.import_contact === true &&
        updatedXeroDetails.action_buttons.import_project === true
      ) {
        integrationDetails.integration_status = 'Connected - active';
      } else if (!updatedXeroDetails.project_category_id) {
        integrationDetails.integration_status =
          'Awaiting project id tracking setup';
      } else {
        integrationDetails.integration_status =
          'Connected - pending settings/mapping';
      }
      integrationDetails.updated_by = decoded?.userId;
      integrationDetails.updated_on = moment.tz('UTC');
      integrationDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
      return await this.integrationDetails.save(integrationDetails);
    } catch (error) {
      throw error;
    }
  }

  async updateTrackingCategory(decoded, id, category_id, category_type) {
    try {
      const integrationDetails = await this.integrationDetails.findOne({
        where: { id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      if (
        [
          'Inactive',
          'Disconnected',
          'Deleted - archived',
          'Connected - paused',
        ].includes(integrationDetails.integration_status)
      )
        throw `Unable to update the pending settings`;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          integration_id: integrationDetails.integration_id,
          status: 'ACTIVE',
        },
      });
      if (!xeroDetails) throw `No xero integration found`;

      if (
        category_type === 'project' &&
        xeroDetails.contract_category_id !== category_id
      ) {
        xeroDetails.project_category_id = category_id;
      } else if (
        category_type === 'contract' &&
        xeroDetails.project_category_id !== category_id
      ) {
        xeroDetails.contract_category_id = category_id;
      } else {
        throw `Project and contract tracking category id cannot be same`;
      }
      xeroDetails.updated_by = decoded?.userId;
      xeroDetails.updated_on = moment.tz('UTC');
      xeroDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
      return await this.xeroIntegrationDetails.save(xeroDetails);
    } catch (error) {
      throw error;
    }
  }

  async refreshTokenSet(
    company_id: number,
    xero: XeroClient,
    safeRefresh?: Boolean,
  ) {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    try {
      if (!xeroDetails) throw `No xero integration found`;
      const tokenSet = {
        id_token: xeroDetails.id_token,
        access_token: xeroDetails.access_token,
        refresh_token: xeroDetails.refresh_token,
        expires_at: xeroDetails.expires_at,
        token_type: 'Bearer',
        scope:
          'openid email profile accounting.transactions accounting.settings accounting.settings.read projects accounting.contacts accounting.contacts.read offline_access',
      };
      await xero.setTokenSet(tokenSet);
      const expiresAt = tokenSet.expires_at;
      if (moment.unix(expiresAt).isBefore(moment().utc()) || safeRefresh) {
        const readTokenSet = await xero.readTokenSet();
        const refreshedTokenSet = await this.refreshAccessTokenManually(
          xeroDetails.refresh_token,
        );
        refreshedTokenSet.expires_at = moment()
          .utc()
          .add(refreshedTokenSet?.expires_in, 'seconds')
          .unix();
        await xero.setTokenSet(refreshedTokenSet);
        if (!refreshedTokenSet.access_token) {
          throw new Error('Unable to authorize Xero. Please try again');
        }
        const tenants = await xero.updateTenants();
        if (tenants.length === 0) {
          throw new Error(
            'No tenants found. Ensure the user is connected to a Xero organization.',
          );
        }

        // xeroDetails.tenant_id = tenants[0]?.tenantId;
        // xeroDetails.tenant_name = tenants[0]?.tenantName;
        // xeroDetails.tenant_type = tenants[0]?.tenantType;
        xeroDetails.status = tenants[0]?.orgData?.organisationStatus;
        xeroDetails.subscription_status = tenants[0]?.orgData?._class;
        xeroDetails.id_token = refreshedTokenSet.id_token;
        xeroDetails.access_token = refreshedTokenSet.access_token;
        xeroDetails.refresh_token = refreshedTokenSet.refresh_token;
        xeroDetails.expires_at = refreshedTokenSet.expires_at;
        // xeroDetails.updated_by = decoded?.userId
        xeroDetails.updated_on = moment.tz('UTC');
        // xeroDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER'
        return await this.xeroIntegrationDetails.save(xeroDetails);
      }
      await xero.updateTenants();
      return xeroDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async refreshAccessTokenManually(refreshToken: string) {
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const tokenUrl = 'https://identity.xero.com/connect/token';

    try {
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          redirect_uri: process.env.XERO_CALLBACK_URL + 'xero/callback',
        }).toString(),
        {
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      // console.log({ response: response.data });
      return response.data;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }
}
