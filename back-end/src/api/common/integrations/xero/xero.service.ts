import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
import Redis from 'ioredis';
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
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';

dotenv.config();

@Injectable()
export class XeroService implements OnModuleInit, OnModuleDestroy {
  private logger = new PaytradeLogger('XERO_SERVICE');
  private xero: XeroClient;
  private redis: Redis | null = null;
  private static readonly TOKEN_LOCK_TTL_SECONDS = 15;
  private static readonly TOKEN_LOCK_WAIT_MS = 500;
  private static readonly TOKEN_LOCK_MAX_RETRIES = 20;

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
    @InjectRepository(ClientSupplierProjectXeroAccountCodes)
    private supplierProjectAccountCodes: Repository<ClientSupplierProjectXeroAccountCodes>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
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

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        // IMPORTANT: never return null from retryStrategy — that
        // permanently disables reconnection and every subsequent command
        // throws "Connection is closed." until the process restarts.
        // Production Redis (e.g. Upstash) regularly terminates idle TCP
        // connections, so we must retry forever with a capped backoff.
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 5,
          enableReadyCheck: true,
          retryStrategy: (times) =>
            Math.min(Math.max(times * 200, 1000), 30000),
          reconnectOnError: (err) => {
            const msg = err?.message || '';
            return msg.includes('READONLY') || msg.includes('Connection is closed');
          },
        });
        this.redis.on('error', (err) => {
          this.logger.error(`Redis connection error (token lock): ${err.message}`);
        });
      } catch (err) {
        this.logger.warn(`Failed to connect Redis for token lock: ${err?.message}`);
        this.redis = null;
      }
    } else {
      this.logger.warn('REDIS_URL not configured - token refresh lock disabled');
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
  }

  private async acquireTokenLock(companyId: number): Promise<string | null> {
    if (!this.redis) return null;
    const lockKey = `xero-token-lock:${companyId}`;
    const lockValue = `${process.pid}-${Date.now()}`;
    const result = await this.redis.set(
      lockKey,
      lockValue,
      'EX',
      XeroService.TOKEN_LOCK_TTL_SECONDS,
      'NX',
    );
    return result === 'OK' ? lockValue : null;
  }

  private async releaseTokenLock(companyId: number, lockValue: string): Promise<void> {
    if (!this.redis) return;
    const lockKey = `xero-token-lock:${companyId}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, lockKey, lockValue);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  /**
   * Task #109 — Returns the cross-app reauth status for the given company.
   * If the integration row has `needs_reauth=true` (set by the hourly Xero
   * scheduler when the refresh token is dead), bundles a fresh consent
   * URL so the `XeroReauthBanner` can deep-link the admin straight into
   * the Xero OAuth flow.
   *
   * Never throws — all errors are swallowed and surface as
   * `needs_reauth=false` so the polling banner can never break the UI.
   */
  async getXeroReauthStatus(
    company_id: number,
    userid: any,
    isadmin: any,
    timezone: any,
  ): Promise<{
    needs_reauth: boolean;
    company_id?: number;
    tenant_name?: string;
    needs_reauth_since?: Date;
    reauth_url?: string;
  }> {
    try {
      const row = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!row || !row.needs_reauth) {
        return { needs_reauth: false, company_id };
      }
      let reauth_url: string | undefined;
      try {
        reauth_url = await this.getAuthUrl(
          company_id,
          userid,
          isadmin,
          timezone,
        );
      } catch (urlErr: any) {
        this.logger.warn(
          `[Task #109] getXeroReauthStatus: getAuthUrl failed for company_id=${company_id}: ${urlErr?.message || urlErr}`,
        );
      }
      return {
        needs_reauth: true,
        company_id,
        tenant_name: row.tenant_name || undefined,
        needs_reauth_since: row.needs_reauth_since || undefined,
        reauth_url,
      };
    } catch (err: any) {
      this.logger.error(
        `[Task #109] getXeroReauthStatus errored for company_id=${company_id}: ${err?.message || err}`,
      );
      return { needs_reauth: false, company_id };
    }
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
        // Task #109 — Successful re-OAuth clears the sticky reauth flag and
        // its email-throttle timestamps so the cross-app banner disappears
        // and the daily reminder email loop stops.
        xeroDetails.needs_reauth = false;
        xeroDetails.needs_reauth_since = null;
        xeroDetails.last_reauth_email_sent_at = null;
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
      // Phase 2 — populate the org GST defaults cache immediately on
      // connect so consumers (resolveContactGstStatus, alignment widget,
      // claim push) don't have to wait for the hourly cron tick.
      try {
        await this.refreshOrgGstDefaults(companyId);
      } catch (err) {
        this.logger.error(
          `handleCallback:: refreshOrgGstDefaults failed (non-blocking): ${err?.message || err}`,
        );
      }
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
          'x.bill_code_is_variable AS bill_code_is_variable',
          'x.bill_code_naming_convention AS bill_code_naming_convention',
          'x.bill_code_allow_fallback AS bill_code_allow_fallback',
          'x.retention_payable_retained_code AS retention_payable_retained_code',
          'x.retention_payable_release_code AS retention_payable_release_code',
          'x.retention_receivable_retained_code AS retention_receivable_retained_code',
          'x.retention_receivable_release_code AS retention_receivable_release_code',
          'x.liability_payable_code AS liability_payable_code',
          'x.liability_receivable_code AS liability_receivable_code',
          'x.simplified_retention_accounting AS simplified_retention_accounting',
          'x.retention_recording_mode AS retention_recording_mode',
          'x.retention_tax_type AS retention_tax_type',
          'x.auto_gross_up_retention_journals AS auto_gross_up_retention_journals',
          'x.xero_org_country_code AS xero_org_country_code',
          'x.xero_org_is_gst_registered AS xero_org_is_gst_registered',
          'x.xero_org_sales_tax_basis AS xero_org_sales_tax_basis',
          'x.xero_org_default_sales_tax AS xero_org_default_sales_tax',
          'x.xero_org_default_purchases_tax AS xero_org_default_purchases_tax',
          'x.xero_org_settings_synced_at AS xero_org_settings_synced_at',
          'x.pt_to_xero_bank_auto_create AS pt_to_xero_bank_auto_create',
          'x.xero_to_pt_bank_auto_create AS xero_to_pt_bank_auto_create',
          'x.pt_to_xero_contact_auto_create AS pt_to_xero_contact_auto_create',
          'x.xero_to_pt_contact_auto_create AS xero_to_pt_contact_auto_create',
          'x.pt_to_xero_project_auto_create AS pt_to_xero_project_auto_create',
          'x.xero_to_pt_project_auto_create AS xero_to_pt_project_auto_create',
          'x.pt_to_xero_contract_auto_create AS pt_to_xero_contract_auto_create',
          'x.xero_to_pt_contract_auto_create AS xero_to_pt_contract_auto_create',
          'x.sync_contact_financial_to_xero AS sync_contact_financial_to_xero',
          'x.sync_contact_financial_to_pt AS sync_contact_financial_to_pt',
          'x.smart_contract_auto_create AS smart_contract_auto_create',
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
            (CASE WHEN liability_receivable_code IS NULL THEN 1 ELSE 0 END) +
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

  /**
   * Task #120 — Returns true when a `xero_sync_logs` row already
   * exists today (UTC) for the given (integration_id,
   * log_template_id, reference_id) triplet. Callers use this to
   * implement "one breadcrumb per orphan per day" semantics for
   * pending-mapping logs without spamming the Xero sync log UI.
   */
  async hasSyncLogToday(
    integration_id: number,
    log_template_id: number,
    reference_id: string | null,
  ): Promise<boolean> {
    if (!integration_id || !log_template_id || !reference_id) return false;
    const startOfDayUtc = moment.utc().startOf('day').toDate();
    const existing = await this.xeroSyncLogs
      .createQueryBuilder('log')
      .select('log.id', 'id')
      .where('log.integration_id = :integration_id', { integration_id })
      .andWhere('log.log_template_id = :log_template_id', { log_template_id })
      .andWhere('log.reference_id = :reference_id', { reference_id })
      .andWhere('log.created_on >= :startOfDayUtc', { startOfDayUtc })
      .limit(1)
      .getRawOne();
    return !!existing;
  }

  /**
   * Task #128 — Closes any open template-379 "Pending manual map"
   * sync log rows for a given XeroBankAccountDetails row once the
   * orphan has been linked to a PayTrade bank account. Safe to
   * call from any code path that transitions `pt_bank_account_id`
   * from NULL → set (manual map, auto map, scheduler back-fill,
   * inbound auto-create link). Idempotent and best-effort:
   * swallows errors so the caller's primary link/update path is
   * never destabilised by a logging cleanup failure.
   */
  async clearPendingBankMappingLogs(
    integration_id: number,
    xeroBankAccountDetailsId: string | null | undefined,
  ): Promise<number> {
    if (!integration_id || !xeroBankAccountDetailsId) return 0;
    try {
      const result = await this.xeroSyncLogs
        .createQueryBuilder()
        .delete()
        .from(XeroSyncLogs)
        .where('integration_id = :integration_id', { integration_id })
        .andWhere('log_template_id = 379')
        .andWhere('reference_id = :reference_id', {
          reference_id: String(xeroBankAccountDetailsId),
        })
        .execute();
      const affected = result?.affected || 0;
      if (affected > 0) {
        this.logger.log(
          `[Task #128] Cleared ${affected} pending bank-mapping sync log(s) for xero_bank_account ${xeroBankAccountDetailsId}`,
        );
      }
      return affected;
    } catch (err: any) {
      this.logger.warn(
        `[Task #128] clearPendingBankMappingLogs failed for xero_bank_account ${xeroBankAccountDetailsId}: ${err?.message || err}`,
      );
      return 0;
    }
  }

  async insertXeroSyncLogs(
    decoded,
    createXeroSyncLogInput: CreateXeroSyncLogInput,
    options?: { skipCrossTimeDedup?: boolean },
  ) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (createXeroSyncLogInput.contract_id != null && !uuidRegex.test(String(createXeroSyncLogInput.contract_id))) {
      this.logger.warn(
        `[insertXeroSyncLogs] contract_id is not a valid UUID: "${createXeroSyncLogInput.contract_id}". Forcing to null.`
      );
      createXeroSyncLogInput.contract_id = null;
    }
    if (createXeroSyncLogInput.project_id != null && !uuidRegex.test(String(createXeroSyncLogInput.project_id))) {
      this.logger.warn(
        `[insertXeroSyncLogs] project_id is not a valid UUID: "${createXeroSyncLogInput.project_id}". Forcing to null.`
      );
      createXeroSyncLogInput.project_id = null;
    }
    let xeroSyncLog;
    if (!createXeroSyncLogInput?.id) {
      delete createXeroSyncLogInput?.id;
      let allowCreation = true;
      const templateDetails = await this.xeroLogTemplates.findOne({
        where: { id: createXeroSyncLogInput?.log_template_id },
      });
      if (
        !options?.skipCrossTimeDedup &&
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

  // Stamp prior email-waiting warning rows (templates 610-613) for a contact
  // as resolved by merging a `resolved_at` / `resolved_by_log_id` marker into
  // their dynamic_values jsonb. Used after the user adds the missing email
  // and the queued smart-creates have all replayed cleanly.
  async markEmailWaitingLogsResolved(
    contactId: string,
    integrationId: number,
    resolvedByLogId: number | null,
  ): Promise<number> {
    const result = await this.xeroSyncLogs
      .createQueryBuilder()
      .update(XeroSyncLogs)
      .set({
        dynamic_values: () =>
          `COALESCE(dynamic_values, '{}'::jsonb) || jsonb_build_object('resolved_at', to_jsonb(now()::text), 'resolved_by_log_id', to_jsonb(${
            resolvedByLogId === null ? 'NULL' : Number(resolvedByLogId)
          }::int))`,
      })
      .where('integration_id = :integration_id', {
        integration_id: integrationId,
      })
      .andWhere('log_template_id IN (:...templates)', {
        templates: [610, 611, 612, 613],
      })
      .andWhere(`reference->>'paytradeId' = :contactId`, { contactId })
      .andWhere(`COALESCE(dynamic_values->>'resolved_at', '') = ''`)
      .execute();
    return result?.affected ?? 0;
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
      .addSelect('template.error_code', 'error_code')
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

    if (getXeroSyncLogsInput.recovered_only) {
      queryBuilder.andWhere('log.log_template_id IN (:...recoveredIds)', {
        recoveredIds: [493, 495],
      });
    }

    // Archive view: by default the table and counters show only
    // active (non-archived) rows. When archived=true is passed the
    // table flips to "Archived only" so users can review/unarchive.
    if (getXeroSyncLogsInput.archived) {
      queryBuilder.andWhere('log.archived_at IS NOT NULL');
    } else {
      queryBuilder.andWhere('log.archived_at IS NULL');
    }

    // Task #85 — sync_type / sync_status dropdown filters from the Sync
    // Logs dashboard toolbar. Both columns live on `xero_log_templates`,
    // already joined as `template`.
    if (getXeroSyncLogsInput.sync_type) {
      queryBuilder.andWhere('template.sync_type = :sync_type_filter', {
        sync_type_filter: getXeroSyncLogsInput.sync_type,
      });
    }
    if (getXeroSyncLogsInput.sync_status) {
      queryBuilder.andWhere(
        'CAST(template.sync_status AS text) = :sync_status_filter',
        { sync_status_filter: getXeroSyncLogsInput.sync_status },
      );
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

    // Counters always reflect the same archive view as the table:
    // when the user is looking at the active list, Synced/Warning/
    // Failed only count active rows; the separate "Archived" pill
    // counts everything currently archived (regardless of status)
    // so users can see at a glance how big the audit pile is.
    const statuses = ['Succeeded', 'Warning', 'Failed', 'Archived'];
    const statusMap = new Map<string, any>();
    if (id) {
      const combinedTableQuery = `
        WITH combined_table AS (
            SELECT
              l.integration_id as integration_id,
              CASE WHEN l.archived_at IS NOT NULL THEN 'Archived'
                   ELSE CAST(t.sync_status AS text) END AS sync_status,
              COUNT(l.*) AS status_count
            FROM xero_sync_logs l INNER JOIN xero_log_templates t on l.log_template_id = t.id
            GROUP BY l.integration_id, sync_status
          )
          SELECT c.*, i.company_id, i.integration_status
          FROM combined_table c 
          LEFT JOIN integration_details i 
          ON c.integration_id = i.integration_id WHERE i.integration_status <> 'Deleted - archived' AND i.id = $1
        `;

      const result = await this.dataSource.query(combinedTableQuery, [id]);

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

  /**
   * Archive (or un-archive) one or more xero_sync_logs rows.
   *
   * IDOR-safe: every row id is verified to belong to an integration
   * owned by the caller's company before any UPDATE runs. Mismatched
   * rows are silently skipped (we return the count of rows actually
   * affected so the UI can warn the user if some were rejected).
   *
   * `mode` controls direction:
   *   - 'archive'   stamps archived_at = now(), archived_by_user_id,
   *                 archive_note (only on rows currently NOT archived)
   *   - 'unarchive' clears archived_at / archived_by_user_id /
   *                 archive_note (only on rows currently archived)
   */
  async archiveOrUnarchiveSyncLogs(input: {
    ids: string[];
    company_id: number;
    user_id: number;
    note?: string | null;
    mode: 'archive' | 'unarchive';
  }): Promise<{ affected: number; rejected: number }> {
    const { ids, company_id, user_id, note, mode } = input;
    if (!Array.isArray(ids) || ids.length === 0) {
      return { affected: 0, rejected: 0 };
    }
    // Cap to a sane bulk size to keep the IN-list and lock window
    // bounded; the UI's "Archive selected" button respects the same
    // limit on the page-size dropdown (max 100 rows per page).
    const safeIds = Array.from(new Set(ids.map((s) => String(s))))
      .slice(0, 200);

    // IDOR guard — restrict to rows whose integration belongs to
    // this company. Done as part of the UPDATE so we never leak
    // cross-company row existence via the affected count alone.
    if (mode === 'archive') {
      const result = await this.dataSource.query(
        `
        UPDATE xero_sync_logs l
           SET archived_at = timezone('utc', now()),
               archived_by_user_id = $1,
               archive_note = $2
          FROM xero_integration_details x
         WHERE l.integration_id = x.integration_id
           AND x.company_id = $3
           AND l.id = ANY($4::uuid[])
           AND l.archived_at IS NULL
        `,
        [user_id, note ?? null, company_id, safeIds],
      );
      const affected =
        Array.isArray(result) && result[1] != null ? Number(result[1]) : 0;
      return { affected, rejected: safeIds.length - affected };
    } else {
      const result = await this.dataSource.query(
        `
        UPDATE xero_sync_logs l
           SET archived_at = NULL,
               archived_by_user_id = NULL,
               archive_note = NULL
          FROM xero_integration_details x
         WHERE l.integration_id = x.integration_id
           AND x.company_id = $1
           AND l.id = ANY($2::uuid[])
           AND l.archived_at IS NOT NULL
        `,
        [company_id, safeIds],
      );
      const affected =
        Array.isArray(result) && result[1] != null ? Number(result[1]) : 0;
      return { affected, rejected: safeIds.length - affected };
    }
  }

  async getIntegrationIssuesForDashboard(company_id: number) {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });

    if (!xeroDetails) {
      return { issues: [], total_count: 0, succeeded_count: 0, warning_count: 0, failed_count: 0 };
    }

    const integrationId = xeroDetails.integration_id;

    const queryBuilder = this.xeroSyncLogs
      .createQueryBuilder('log')
      .select('log.id', 'id')
      .addSelect('log.sync_id', 'sync_id')
      .addSelect('template.sync_type', 'sync_type')
      .addSelect('template.sync_status', 'sync_status')
      .addSelect('template.description', 'description')
      .addSelect('template.error_code', 'error_code')
      .addSelect('log.error_message', 'error_message')
      .addSelect('project.project_name', 'project_name')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('log.dynamic_values', 'dynamic_values')
      .addSelect('log.created_on', 'created_on')
      .innerJoin('log.xeroLogTemplates', 'template')
      .leftJoin('log.xeroProjectDetails', 'project')
      .leftJoin('log.xeroContractDetails', 'contract')
      .where('log.integration_id = :integrationId', { integrationId })
      .orderBy('log.created_on', 'DESC')
      .limit(10);

    const [issues, counts] = await Promise.all([
      queryBuilder.getRawMany(),
      this.xeroSyncLogs
        .createQueryBuilder('log')
        .select('template.sync_status', 'sync_status')
        .addSelect('COUNT(*)', 'status_count')
        .innerJoin('log.xeroLogTemplates', 'template')
        .where('log.integration_id = :integrationId', { integrationId })
        .groupBy('template.sync_status')
        .getRawMany(),
    ]);

    const countMap: Record<string, number> = {};
    let total = 0;
    for (const row of counts) {
      countMap[row.sync_status] = parseInt(row.status_count, 10);
      total += parseInt(row.status_count, 10);
    }

    const processedIssues = issues.map((issue) => {
      let desc = issue.description || '';
      if (issue.dynamic_values && typeof issue.dynamic_values === 'object') {
        Object.entries(issue.dynamic_values).forEach(([key, value]) => {
          desc = desc.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      }
      desc = desc.replace(/<[^>]*>/g, '');
      return { ...issue, description: desc };
    });

    return {
      issues: processedIssues,
      total_count: total,
      succeeded_count: countMap['Succeeded'] || 0,
      warning_count: countMap['Warning'] || 0,
      failed_count: countMap['Failed'] || 0,
    };
  }

  async viewXeroSyncLog(id: string) {
    const syncLog = await this.xeroSyncLogs
      .createQueryBuilder('l')
      .innerJoin('xero_log_templates', 't', 'l.log_template_id = t.id')
      .leftJoin(
        'client_suppliers_details',
        'c',
        `t.sync_type = 'Contacts' AND (
          CASE
            WHEN l.reference::jsonb->>'paytradeId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN c.id = (l.reference::jsonb->>'paytradeId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'xero_contact_details',
        'contact',
        `t.sync_type = 'Contacts' AND (
          CASE
            WHEN l.reference::jsonb->>'xeroId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN contact.id = (l.reference::jsonb->>'xeroId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'project_details',
        'p',
        `t.sync_type = 'Projects' AND (
          CASE
            WHEN l.reference::jsonb->>'paytradeId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN p.id = (l.reference::jsonb->>'paytradeId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'xero_project_details',
        'project',
        `t.sync_type = 'Projects' AND (
          CASE
            WHEN l.reference::jsonb->>'xeroId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN project.id = (l.reference::jsonb->>'xeroId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'bank_accounts',
        'b',
        `t.sync_type = 'Bank accounts' AND (
          CASE
            WHEN l.reference::jsonb->>'paytradeId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN b.id = (l.reference::jsonb->>'paytradeId')::uuid
            WHEN l.reference::jsonb->>'paytradeId' ~ '^[0-9]+$'
            THEN b.bank_account_id = (l.reference::jsonb->>'paytradeId')::bigint
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'xero_bank_account_details',
        'bank',
        `t.sync_type = 'Bank accounts' AND (
          CASE
            WHEN l.reference::jsonb->>'xeroId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN bank.id = (l.reference::jsonb->>'xeroId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'contract_details',
        'cd',
        `t.sync_type = 'Contracts' AND (
          CASE
            WHEN l.reference::jsonb->>'paytradeId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN cd.id = (l.reference::jsonb->>'paytradeId')::uuid
            ELSE false
          END
        )`,
      )
      .leftJoin(
        'xero_contract_details',
        'contract',
        `t.sync_type = 'Contracts' AND (
          CASE
            WHEN l.reference::jsonb->>'xeroId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN contract.id = (l.reference::jsonb->>'xeroId')::uuid
            ELSE false
          END
        )`,
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
    // Compute Xero/PT deep links for the row (returns null when not
    // resolvable — see sync-log-deep-links.ts). Keep this best-effort:
    // any failure must not block the rest of the log details.
    try {
      const {
        buildXeroDeepLink,
        buildPaytradeDeepLink,
      } = await import('./utils/sync-log-deep-links');
      finalResult.xero_deep_link = buildXeroDeepLink(finalResult);
      finalResult.paytrade_deep_link = buildPaytradeDeepLink(finalResult);
    } catch (err) {
      this.logger.warn(
        `viewXeroSyncLog: deep link computation failed: ${err?.message}`,
      );
      finalResult.xero_deep_link = null;
      finalResult.paytrade_deep_link = null;
    }
    return finalResult;
  }

  async iterateLogArray(syncLogArray) {
    if (syncLogArray && syncLogArray.length > 0) {
      for (const element of syncLogArray) {
        if (element.dynamic_values) {
          const replaceVariablesRes = await this.replaceVariables(
            element.description,
            element.dynamic_values,
          );
          element.description = replaceVariablesRes;
        }
      }
      return syncLogArray;
    }
    return [];
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    let result = template;
    if (variables && Object.keys(variables).length !== 0) {
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
      }
    }
    return result;
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

  /**
   * Phase 2 — Retention/contact GST: cache the connected Xero org's GST
   * defaults onto `xero_integration_details`. Called from the hourly
   * Xero scheduler and on-demand from the alignment widget.
   *
   * Persists country code, registration flag (derived from `salesTaxBasis`
   * + presence of GST tax rates), the basis itself, and the org-level
   * default sales / purchases tax types so PT can resolve a contact's
   * effective GST without a live Xero round-trip on every claim push.
   */
  async refreshOrgGstDefaults(company_id: number): Promise<{
    refreshed: boolean;
    country?: string;
    isGstRegistered?: boolean;
    salesTaxBasis?: string;
  }> {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) return { refreshed: false };
      await this.refreshTokenSet(company_id, this.xero);

      const response = await this.xero.accountingApi.getOrganisations(
        xeroDetails.tenant_id,
      );
      const org = response?.body?.organisations?.[0];
      if (!org) return { refreshed: false };

      const country = (org as any).countryCode || (org as any).country || null;
      const salesTaxBasis = (org as any).salesTaxBasis || null;
      // Heuristic: AU orgs without GST registration have salesTaxBasis = 'NONE'.
      // Anything else (CASH/ACCRUALS/PAYMENTS) implies registered.
      const isGstRegistered =
        salesTaxBasis && String(salesTaxBasis).toUpperCase() !== 'NONE';

      // Org-level default tax types are not part of the Organisation
      // payload; leave nulls in place so resolveContactGstStatus falls
      // through to the company-level flag when the user hasn't picked
      // an explicit org default. The alignment widget/UI can populate
      // `xero_org_default_sales_tax` / `..._purchases_tax` later.
      await this.xeroIntegrationDetails
        .createQueryBuilder()
        .update(XeroIntegrationDetails)
        .set({
          xero_org_country_code: country,
          xero_org_is_gst_registered: isGstRegistered,
          xero_org_sales_tax_basis: salesTaxBasis,
          xero_org_settings_synced_at: moment.tz('UTC').toDate(),
          updated_on: moment.tz('UTC'),
          updated_group: 'SYSTEM',
        })
        .where(`id = :id`, { id: xeroDetails.id })
        .execute();

      return {
        refreshed: true,
        country,
        isGstRegistered,
        salesTaxBasis,
      };
    } catch (error) {
      const errMsg = await handleAxiosError(error).catch(() => error?.message);
      this.logger?.warn?.(
        `[Phase 2] refreshOrgGstDefaults failed for company_id=${company_id}: ${errMsg}`,
      );
      return { refreshed: false };
    }
  }

  async updateSettings(decoded: any, data: UpdateSettingsInput) {
    try {
      const { id } = data;

      const integrationDetails = await this.integrationDetails.findOne({
        where: { id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      // Task #42 — `Inactive`/`Disconnected` rows are now allowed to save
      // **iff** the user has just completed a fresh OAuth (i.e. there is a
      // matching xero_integration_details row with status='ACTIVE' and a
      // refresh token). In that case treat the save as a recovery and let
      // the status-recomputation block below advance the parent status.
      // `Deleted - archived` and `Connected - paused` are still rejected.
      const status = integrationDetails.integration_status;
      if (['Deleted - archived', 'Connected - paused'].includes(status)) {
        throw `Unable to update the pending settings`;
      }
      if (['Inactive', 'Disconnected'].includes(status)) {
        const recoverable = await this.xeroIntegrationDetails.findOne({
          where: {
            integration_id: integrationDetails.integration_id,
            status: 'ACTIVE',
          },
        });
        if (!recoverable || !recoverable.refresh_token) {
          throw `This Xero connection is no longer active. Please reconnect to Xero before saving settings.`;
        }
        this.logger.log(
          `[Task #42] updateSettings allowed in recovery mode for integration_id=${integrationDetails.integration_id} (was ${status})`,
        );
      }

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
      // Task #41 — variable bill code per supplier
      if (data.bill_code_is_variable !== undefined) {
        xeroDetails.bill_code_is_variable = !!data.bill_code_is_variable;
      }
      if (data.bill_code_naming_convention !== undefined) {
        const nc = data.bill_code_naming_convention
          ? String(data.bill_code_naming_convention).trim()
          : '';
        xeroDetails.bill_code_naming_convention = nc.length ? nc : null;
      }
      if (data.bill_code_allow_fallback !== undefined) {
        xeroDetails.bill_code_allow_fallback = !!data.bill_code_allow_fallback;
      }
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
      if (data.retention_recording_mode !== undefined && data.retention_recording_mode !== null) {
        const mode = String(data.retention_recording_mode);
        if (mode === 'ex_gst' || mode === 'inc_gst') {
          xeroDetails.retention_recording_mode = mode;
        }
      }
      if (data.retention_tax_type !== undefined) {
        xeroDetails.retention_tax_type = data.retention_tax_type
          ? String(data.retention_tax_type).trim() || null
          : null;
      }
      if (data.auto_gross_up_retention_journals !== undefined) {
        // Only enable when the prerequisites are met. Otherwise force OFF
        // so the FE toggle and backend invariants stay in sync even if a
        // stale payload arrives.
        const wantsOn = !!data.auto_gross_up_retention_journals;
        const eligible =
          xeroDetails.simplified_retention_accounting === false &&
          xeroDetails.retention_recording_mode === 'ex_gst';
        xeroDetails.auto_gross_up_retention_journals = wantsOn && eligible;
      }
      if (data.pt_to_xero_bank_auto_create !== undefined) {
        xeroDetails.pt_to_xero_bank_auto_create = data.pt_to_xero_bank_auto_create;
      }
      if (data.xero_to_pt_bank_auto_create !== undefined) {
        xeroDetails.xero_to_pt_bank_auto_create = data.xero_to_pt_bank_auto_create;
      }
      if (data.pt_to_xero_contact_auto_create !== undefined) {
        xeroDetails.pt_to_xero_contact_auto_create = data.pt_to_xero_contact_auto_create;
      }
      if (data.xero_to_pt_contact_auto_create !== undefined) {
        xeroDetails.xero_to_pt_contact_auto_create = data.xero_to_pt_contact_auto_create;
      }
      if (data.pt_to_xero_project_auto_create !== undefined) {
        xeroDetails.pt_to_xero_project_auto_create = data.pt_to_xero_project_auto_create;
      }
      if (data.xero_to_pt_project_auto_create !== undefined) {
        xeroDetails.xero_to_pt_project_auto_create = data.xero_to_pt_project_auto_create;
      }
      if (data.pt_to_xero_contract_auto_create !== undefined) {
        xeroDetails.pt_to_xero_contract_auto_create = data.pt_to_xero_contract_auto_create;
      }
      if (data.xero_to_pt_contract_auto_create !== undefined) {
        xeroDetails.xero_to_pt_contract_auto_create = data.xero_to_pt_contract_auto_create;
      }
      if (data.sync_contact_financial_to_xero !== undefined) {
        xeroDetails.sync_contact_financial_to_xero = data.sync_contact_financial_to_xero;
      }
      if (data.sync_contact_financial_to_pt !== undefined) {
        xeroDetails.sync_contact_financial_to_pt = data.sync_contact_financial_to_pt;
      }
      if (data.smart_contract_auto_create !== undefined) {
        xeroDetails.smart_contract_auto_create = data.smart_contract_auto_create;
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

  /**
   * Task #42 — Pure helper that mirrors the status-recomputation block in
   * `updateSettings` so the OAuth callback and the scheduler recovery
   * path can compute the same target status without duplicating logic.
   * Returns the status that should be written to
   * `integration_details.integration_status` based on the current
   * mapping state in `xero_integration_details`.
   */
  async recomputeIntegrationStatusForCompany(
    company_id: number,
  ): Promise<string> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails) return 'Connected - pending settings/mapping';
    return this.computeIntegrationStatusFromXeroDetails(xeroDetails);
  }

  computeIntegrationStatusFromXeroDetails(
    xeroDetails: XeroIntegrationDetails,
  ): string {
    const ab: any = xeroDetails?.action_buttons || {};
    if (!xeroDetails?.project_category_id) {
      return 'Awaiting project id tracking setup';
    }
    if (
      xeroDetails.project_category_id &&
      ab.import_bank === false &&
      ab.import_contact === false &&
      ab.import_project === false
    ) {
      return 'Pending bank account mapping';
    }
    if (
      xeroDetails.project_category_id &&
      ab.import_bank === true &&
      ab.import_contact === false &&
      ab.import_project === false
    ) {
      return 'Pending contact mapping';
    }
    if (
      xeroDetails.project_category_id &&
      ab.import_bank === true &&
      ab.import_contact === true &&
      ab.import_project === false
    ) {
      return 'Pending project tracking id mapping';
    }
    if (
      xeroDetails.project_category_id &&
      ab.import_bank === true &&
      ab.import_contact === true &&
      ab.import_project === true
    ) {
      return 'Connected - active';
    }
    return 'Connected - pending settings/mapping';
  }

  /**
   * Task #42 — Idempotent one-shot recovery for the "stuck Inactive" loop.
   * Scans for integrations that the user has already re-OAuthed (i.e.
   * `xero_integration_details.status='ACTIVE'` with valid tokens) but
   * whose parent `integration_details.integration_status` is still
   * `Inactive`/`Disconnected`/null, and advances the parent row to the
   * status that the current mapping qualifies for. Safe to re-run — only
   * touches rows that match the precondition.
   */
  async recoverStuckInactiveIntegrations(): Promise<{
    scanned: number;
    recovered: number;
  }> {
    let scanned = 0;
    let recovered = 0;
    try {
      const candidates = await this.xeroIntegrationDetails.find({
        where: { status: 'ACTIVE' },
      });
      for (const xd of candidates) {
        scanned++;
        if (!xd.refresh_token) continue;
        const integ = await this.integrationDetails.findOne({
          where: { integration_id: xd.integration_id },
        });
        if (!integ) continue;
        const stuckStatuses = ['Inactive', 'Disconnected', null, undefined, ''];
        if (!stuckStatuses.includes(integ.integration_status as any)) continue;
        const nextStatus = this.computeIntegrationStatusFromXeroDetails(xd);
        await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            previous_status: () =>
              `(integration_status)::text::integration_details_previous_status_enum`,
            integration_status: nextStatus as any,
            updated_on: moment.tz('UTC'),
            updated_group: 'SYSTEM',
          })
          .where(`id = :id`, { id: integ.id })
          .execute();
        recovered++;
        this.logger.log(
          `[Task #42 recovery] integration_id=${xd.integration_id} company_id=${xd.company_id} ${integ.integration_status} -> ${nextStatus}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[Task #42 recovery] failed: ${err?.message || err}`,
      );
    }
    return { scanned, recovered };
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
        let lockValue: string | null = null;
        try {
          lockValue = await this.acquireTokenLock(company_id);
          if (!lockValue) {
            for (let i = 0; i < XeroService.TOKEN_LOCK_MAX_RETRIES; i++) {
              await this.sleep(XeroService.TOKEN_LOCK_WAIT_MS);
              lockValue = await this.acquireTokenLock(company_id);
              if (lockValue) break;
            }
          }

          if (!lockValue) {
            this.logger.warn(`Token lock wait exhausted for company ${company_id}, re-reading token from DB`);
            const freshDetails = await this.xeroIntegrationDetails.findOne({
              where: { company_id, status: 'ACTIVE' },
            });
            if (freshDetails && moment.unix(freshDetails.expires_at).isAfter(moment().utc())) {
              const freshTokenSet = {
                id_token: freshDetails.id_token,
                access_token: freshDetails.access_token,
                refresh_token: freshDetails.refresh_token,
                expires_at: freshDetails.expires_at,
                token_type: 'Bearer',
                scope: tokenSet.scope,
              };
              await xero.setTokenSet(freshTokenSet);
              await xero.updateTenants();
              return freshDetails;
            }
            throw new Error(`Unable to acquire token lock and token still expired for company ${company_id}`);
          }

          const freshDetails = await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          });
          if (freshDetails && moment.unix(freshDetails.expires_at).isAfter(moment().utc()) && !safeRefresh) {
            const freshTokenSet = {
              id_token: freshDetails.id_token,
              access_token: freshDetails.access_token,
              refresh_token: freshDetails.refresh_token,
              expires_at: freshDetails.expires_at,
              token_type: 'Bearer',
              scope: tokenSet.scope,
            };
            await xero.setTokenSet(freshTokenSet);
            await xero.updateTenants();
            return freshDetails;
          }

          const latestRefreshToken = freshDetails?.refresh_token || xeroDetails.refresh_token;
          const refreshedTokenSet = await this.refreshAccessTokenManually(
            latestRefreshToken,
          );
          refreshedTokenSet.expires_at = moment()
            .utc()
            .add(refreshedTokenSet?.expires_in, 'seconds')
            .unix();
          await xero.setTokenSet(refreshedTokenSet);
          if (!refreshedTokenSet.access_token) {
            throw new Error('Unable to authorize Xero. Please try again');
          }

          // Task #42 — Persist the rotated tokens IMMEDIATELY after Xero
          // returns them, BEFORE any further Xero API calls (updateTenants,
          // etc.) that might throw. Xero invalidates the old refresh_token
          // the moment the refresh exchange succeeds, so any failure
          // between that point and the previous DB save would leave PT
          // holding a dead refresh token forever (the documented "stuck
          // Inactive" loop). Tenant metadata is refreshed afterwards on a
          // best-effort basis.
          const detailsToSave = freshDetails || xeroDetails;
          detailsToSave.id_token = refreshedTokenSet.id_token;
          detailsToSave.access_token = refreshedTokenSet.access_token;
          detailsToSave.refresh_token = refreshedTokenSet.refresh_token;
          detailsToSave.expires_at = refreshedTokenSet.expires_at;
          detailsToSave.updated_on = moment.tz('UTC');
          let saved = await this.xeroIntegrationDetails.save(detailsToSave);

          try {
            const tenants = await xero.updateTenants();
            if (tenants.length === 0) {
              this.logger.warn(
                `[Task #42] refreshTokenSet: no tenants returned for company ${company_id} after refresh; tokens persisted, tenant metadata not updated`,
              );
            } else {
              saved.status = tenants[0]?.orgData?.organisationStatus;
              saved.subscription_status = tenants[0]?.orgData?._class;
              saved = await this.xeroIntegrationDetails.save(saved);
            }
          } catch (tenantsErr) {
            // Tenant metadata refresh failed — do NOT roll back the
            // already-persisted tokens. They are valid; only the metadata
            // refresh failed.
            this.logger.warn(
              `[Task #42] refreshTokenSet: updateTenants failed after token refresh for company ${company_id} (tokens persisted): ${tenantsErr?.message || tenantsErr}`,
            );
          }
          return saved;
        } finally {
          if (lockValue) {
            try {
              await this.releaseTokenLock(company_id, lockValue);
            } catch (releaseErr) {
              this.logger.warn(`Failed to release token lock for company ${company_id}: ${releaseErr?.message || releaseErr}`);
            }
          }
        }
      }
      await xero.updateTenants();
      return xeroDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  /**
   * Task #41 — Set or clear the Xero account code override for a supplier
   * (project_id == null) or a supplier × project pair. Pass account_code
   * as null/empty string to remove the override.
   */
  async setSupplierXeroAccountCode(
    decoded: any,
    args: {
      client_supplier_id: number;
      project_id?: number | null;
      account_code?: string | null;
    },
  ): Promise<{ ok: true }> {
    const callerCompanyId = decoded?.companyId ?? decoded?.company_id ?? null;
    if (!callerCompanyId) {
      throw new Error('Unauthorized: missing company context');
    }
    const supplier = await this.clientSuppliersDetails.findOne({
      where: { client_supplier_id: args.client_supplier_id },
    });
    if (!supplier) {
      throw new Error(`Supplier ${args.client_supplier_id} not found`);
    }
    if (Number(supplier.company_id) !== Number(callerCompanyId)) {
      // IDOR guard — caller must own the supplier.
      throw new Error('Unauthorized: supplier does not belong to your company');
    }
    if (args.project_id != null) {
      const projectRow = await this.dataSource.query(
        `SELECT 1 FROM project_details WHERE project_id = $1 AND company_id = $2 LIMIT 1`,
        [args.project_id, callerCompanyId],
      );
      if (!projectRow || projectRow.length === 0) {
        throw new Error(
          'Unauthorized: project does not belong to your company',
        );
      }
    }
    const trimmed = args.account_code ? String(args.account_code).trim() : '';
    const code = trimmed.length ? trimmed : null;
    if (args.project_id == null) {
      await this.clientSuppliersDetails.update(
        { client_supplier_id: args.client_supplier_id },
        { xero_default_account_code: code },
      );
      return { ok: true };
    }
    const existing = await this.supplierProjectAccountCodes.findOne({
      where: {
        client_supplier_id: args.client_supplier_id,
        project_id: args.project_id,
      },
    });
    if (code == null) {
      if (existing) {
        await this.supplierProjectAccountCodes.delete({
          client_supplier_id: args.client_supplier_id,
          project_id: args.project_id,
        });
      }
      return { ok: true };
    }
    if (existing) {
      await this.supplierProjectAccountCodes.update(
        { id: existing.id },
        { account_code: code, updated_by: decoded?.userId || null },
      );
    } else {
      await this.supplierProjectAccountCodes.save({
        company_id: supplier.company_id,
        client_supplier_id: args.client_supplier_id,
        project_id: args.project_id,
        account_code: code,
        created_by: decoded?.userId || null,
        updated_by: decoded?.userId || null,
      } as any);
    }
    return { ok: true };
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
