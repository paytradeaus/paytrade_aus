import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  Account,
  AccountType,
  Address,
  Contact,
  CurrencyCode,
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
  MoreThanOrEqual,
  IsNull,
} from 'typeorm';
import { XeroPayments } from 'src/entities/xero-payments.entity';
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
import { XeroInvoicesService } from '../invoicesAndBills/xero-invoices.service';
import { XeroPaymentsService } from '../payments/xero-payments.service';
import { UpdateProjectInput } from 'src/api/users/projects/dto/update-project.input';
import axios from 'axios';
import { XeroResolver } from '../xero.resolver';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { JwtService } from '@nestjs/jwt';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';

dotenv.config();

@Injectable()
export class XeroSchedulerService implements OnApplicationBootstrap {
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
    @InjectRepository(XeroInvoicesBills)
    private xeroInvoicesBillsRepo: Repository<XeroInvoicesBills>,
    @InjectRepository(XeroPayments)
    private xeroPaymentsRepo: Repository<XeroPayments>,
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
    private readonly xeroInvoicesService: XeroInvoicesService,
    private readonly xeroPaymentsService: XeroPaymentsService,
    private readonly emailQueueProducer: EmailQueueProducer,
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

  /**
   * On application bootstrap, backfill cached Xero PDFs for any
   * xero_invoices_bills rows that don't yet have one. Runs throttled
   * (~60/min) in the background so it doesn't block startup.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureXeroPdfColumns();
    } catch (err: any) {
      this.logger.error(
        `[XERO_PDF_MIGRATION] Failed to ensure xero_invoices_bills columns: ${err?.message || err}`,
      );
    }
    setTimeout(() => {
      this.backfillCachedXeroPdfs().catch((err) =>
        this.logger.error(`Xero PDF backfill failed: ${err?.message || err}`),
      );
    }, 60_000);

    // Task #42 — One-shot idempotent recovery for integrations that have a
    // valid re-OAuthed `xero_integration_details` row but whose parent
    // `integration_details.integration_status` is still stuck on
    // `Inactive`/`Disconnected`/null (e.g. integration_id 1007 / company
    // 1012). Best-effort, never blocks startup.
    // Task #55 — One-shot best-effort retry of legacy "exceeds amount
    // outstanding" payment sync failures so historical Failed logs heal
    // themselves now that the Task #51 inline recovery exists. Runs ~120s
    // after boot so it never competes with startup work, scoped to the
    // last 90 days, all integrations.
    setTimeout(() => {
      this.xeroPaymentsService
        .recoverFailedExceedsOutstandingPaymentSyncs(
          { userId: null, isAdmin: true },
          { lookback_days: 90, limit: 500 },
        )
        .then((res) =>
          this.logger.log(
            `[Task #55] recoverFailedExceedsOutstandingPaymentSyncs: scanned=${res.scanned} recovered=${res.recovered} classified=${res.classified} skipped=${res.skipped} failed=${res.failed}`,
          ),
        )
        .catch((err) =>
          this.logger.error(
            `[Task #55] recoverFailedExceedsOutstandingPaymentSyncs failed: ${err?.message || err}`,
          ),
        );
    }, 120_000);

    setTimeout(() => {
      this.xeroService
        .recoverStuckInactiveIntegrations()
        .then((res) =>
          this.logger.log(
            `[Task #42] recoverStuckInactiveIntegrations: scanned=${res.scanned} recovered=${res.recovered}`,
          ),
        )
        .catch((err) =>
          this.logger.error(
            `[Task #42] recoverStuckInactiveIntegrations failed: ${err?.message || err}`,
          ),
        );
    }, 30_000);
  }

  /**
   * Task #42 — Threshold of consecutive missing-tenant readings before the
   * scheduler is allowed to demote a parent integration to `Inactive`.
   * One transient `/connections` failure or a single stale-cache miss is
   * never enough on its own.
   */
  private readonly MISSING_TENANT_DEMOTE_THRESHOLD = 3;

  /**
   * Task #42 — Resets the counter when the tenant is observed in the
   * latest `/connections` response. Best-effort.
   */
  private async resetMissingTenantCounter(
    xeroDetailsId: string,
  ): Promise<void> {
    try {
      await this.xeroIntegrationDetails
        .createQueryBuilder()
        .update(XeroIntegrationDetails)
        .set({ consecutive_missing_tenant_count: 0 })
        .where(`id = :id`, { id: xeroDetailsId })
        .execute();
    } catch (err) {
      this.logger.warn(
        `[Task #42] resetMissingTenantCounter failed for id=${xeroDetailsId}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Task #42 — Increments the counter and returns the new value. Returns
   * 0 (and does NOT increment) on failure, so a DB hiccup never tips the
   * caller into demoting the integration.
   */
  private async bumpMissingTenantCounter(
    xeroDetailsId: string,
  ): Promise<number> {
    try {
      const row = await this.xeroIntegrationDetails.findOne({
        where: { id: xeroDetailsId },
      });
      const next = (row?.consecutive_missing_tenant_count || 0) + 1;
      await this.xeroIntegrationDetails
        .createQueryBuilder()
        .update(XeroIntegrationDetails)
        .set({ consecutive_missing_tenant_count: next })
        .where(`id = :id`, { id: xeroDetailsId })
        .execute();
      return next;
    } catch (err) {
      this.logger.warn(
        `[Task #42] bumpMissingTenantCounter failed for id=${xeroDetailsId}: ${err?.message || err}`,
      );
      return 0;
    }
  }

  /**
   * Idempotent online migration for the new xero_invoices_bills columns
   * introduced by Task #27. Runs `ADD COLUMN IF NOT EXISTS` so production
   * (synchronize=false) gets the schema without a manual DDL step.
   */
  private async ensureXeroPdfColumns(): Promise<void> {
    const ds = this.xeroInvoicesBillsRepo.manager.connection;
    const stmts: string[] = [
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS cached_pdf_object_key text`,
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS last_fetched_at timestamp with time zone`,
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS deep_link_url text`,
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS current_xero_status varchar(50)`,
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS is_stale boolean NOT NULL DEFAULT false`,
      `ALTER TABLE xero_invoices_bills ADD COLUMN IF NOT EXISTS void_date timestamp with time zone`,
      // Task #45 — throttle column for Inactive-notification email
      `ALTER TABLE xero_integration_details ADD COLUMN IF NOT EXISTS last_inactive_email_sent_at timestamp with time zone`,
      // Task #109 — sticky reauth flag + daily-email throttle
      `ALTER TABLE xero_integration_details ADD COLUMN IF NOT EXISTS needs_reauth boolean NOT NULL DEFAULT false`,
      `ALTER TABLE xero_integration_details ADD COLUMN IF NOT EXISTS needs_reauth_since timestamp with time zone`,
      `ALTER TABLE xero_integration_details ADD COLUMN IF NOT EXISTS last_reauth_email_sent_at timestamp with time zone`,
    ];
    for (const sql of stmts) {
      await ds.query(sql);
    }
    this.logger.log('[XERO_PDF_MIGRATION] xero_invoices_bills columns verified');
  }

  /**
   * Task #45 — Notify the company's PRIMARY ADMIN by email when the
   * scheduler genuinely demotes a Xero integration to `Inactive` (after
   * the 3-strike threshold introduced in Task #42). Throttled to at most
   * one email per integration per 24 hours via
   * `xero_integration_details.last_inactive_email_sent_at`.
   *
   * Best-effort: any failure is logged and swallowed so the surrounding
   * demotion flow is never blocked.
   */
  private async notifyPrimaryAdminOfXeroInactive(
    xeroDetailsId: string,
    company_id: number,
    tenant_name: string,
  ): Promise<void> {
    try {
      const row = await this.xeroIntegrationDetails.findOne({
        where: { id: xeroDetailsId },
      });
      if (!row) {
        this.logger.warn(
          `[Task #45] notifyPrimaryAdminOfXeroInactive: xero row ${xeroDetailsId} not found; skipping`,
        );
        return;
      }

      // 24h throttle
      const lastSent = row.last_inactive_email_sent_at
        ? new Date(row.last_inactive_email_sent_at).getTime()
        : 0;
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      if (lastSent && Date.now() - lastSent < TWENTY_FOUR_HOURS_MS) {
        this.logger.log(
          `[Task #45] Inactive-notification email throttled for company_id=${company_id} (last sent ${row.last_inactive_email_sent_at})`,
        );
        return;
      }

      const primaryAdmin = await this.userRoles.findOne({
        where: {
          company_id: company_id,
          company_role: In(['PRIMARY ADMIN']),
          status: 'Active',
        },
        relations: ['userDetails'],
      });
      const toEmail = primaryAdmin?.userDetails?.email_id;
      if (!toEmail) {
        this.logger.warn(
          `[Task #45] No active PRIMARY ADMIN with email found for company_id=${company_id}; skipping notification`,
        );
        return;
      }

      const adminName =
        [
          primaryAdmin?.userDetails?.first_name,
          primaryAdmin?.userDetails?.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || 'there';

      const orgLabel = tenant_name && tenant_name.trim() ? tenant_name : 'your Xero organisation';
      const baseUrl = (process.env.LOG_BASE_URL || '').replace(/\/+$/, '');
      const settingsLink = `${baseUrl}/user/integrations/xero/settings`;

      const mailBody = `
        <p>Hi ${adminName},</p>
        <p>We tried to reach <strong>${orgLabel}</strong> in Xero from PayTrade several times in a row and the connection is no longer responding.</p>
        <p>To keep your invoices, bills and contacts in sync, please reconnect this Xero organisation in PayTrade:</p>
        <p>
          <a href="${settingsLink}" style="background-color:#1A73E8;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;">
            Reconnect Xero in PayTrade
          </a>
        </p>
        <p>If the button above doesn't work, copy and paste this link into your browser:<br/>
          <a href="${settingsLink}">${settingsLink}</a>
        </p>
        <p>You'll be asked to sign in to Xero and re-authorise PayTrade. Once you do, syncing will resume automatically.</p>
        <p>If you've already reconnected, you can ignore this email.</p>
        <p>Thanks,<br/>The PayTrade team</p>
      `;

      const mailDetails = {
        toEmail,
        subject: `Action required: your Xero connection for ${orgLabel} has gone inactive`,
        template: 'header-footer-email',
        mailBody,
        mail_type: EmailTypeEnum.failedCompliance,
      };

      await this.emailQueueProducer.emailQueueProducer(mailDetails);

      await this.xeroIntegrationDetails
        .createQueryBuilder()
        .update(XeroIntegrationDetails)
        .set({ last_inactive_email_sent_at: moment.tz('UTC').toDate() })
        .where(`id = :id`, { id: xeroDetailsId })
        .execute();

      this.logger.log(
        `[Task #45] Inactive-notification email queued for company_id=${company_id} primary_admin=${toEmail}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[Task #45] notifyPrimaryAdminOfXeroInactive failed for company_id=${company_id}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Task #109 — Mark a Xero integration as needing reauth and (optionally)
   * send a daily reminder email to the company's PRIMARY ADMIN. Throttled
   * to at most one reauth email per integration per 24 hours via
   * `last_reauth_email_sent_at`. The sticky `needs_reauth` flag drives
   * the cross-app `XeroReauthBanner` until `handleCallback` clears it.
   *
   * Best-effort: any failure is logged and swallowed so the surrounding
   * scheduler tick is never blocked.
   */
  private async markIntegrationNeedsReauth(
    company_id: number,
  ): Promise<void> {
    try {
      const row = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!row) {
        this.logger.warn(
          `[Task #109] markIntegrationNeedsReauth: no ACTIVE xero_integration_details for company_id=${company_id}; skipping`,
        );
        return;
      }

      const wasAlreadyMarked = !!row.needs_reauth;
      const now = moment.tz('UTC').toDate();

      // Set the sticky flag if it wasn't already on.
      if (!wasAlreadyMarked) {
        await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            needs_reauth: true,
            needs_reauth_since: now,
          })
          .where(`id = :id`, { id: row.id })
          .execute();
        this.logger.log(
          `[Task #109] needs_reauth=true set for company_id=${company_id} integration row ${row.id}`,
        );
      }

      // 24h throttle on reminder emails.
      const lastSent = row.last_reauth_email_sent_at
        ? new Date(row.last_reauth_email_sent_at).getTime()
        : 0;
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      if (lastSent && Date.now() - lastSent < TWENTY_FOUR_HOURS_MS) {
        this.logger.log(
          `[Task #109] reauth reminder email throttled for company_id=${company_id} (last sent ${row.last_reauth_email_sent_at})`,
        );
        return;
      }

      const primaryAdmin = await this.userRoles.findOne({
        where: {
          company_id: company_id,
          company_role: In(['PRIMARY ADMIN']),
          status: 'Active',
        },
        relations: ['userDetails'],
      });
      const toEmail = primaryAdmin?.userDetails?.email_id;
      if (!toEmail) {
        this.logger.warn(
          `[Task #109] No active PRIMARY ADMIN with email found for company_id=${company_id}; skipping reauth email`,
        );
        return;
      }

      const adminName =
        [
          primaryAdmin?.userDetails?.first_name,
          primaryAdmin?.userDetails?.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || 'there';

      const orgLabel =
        row.tenant_name && row.tenant_name.trim()
          ? row.tenant_name
          : 'your Xero organisation';
      const baseUrl = (process.env.LOG_BASE_URL || '').replace(/\/+$/, '');
      const settingsLink = `${baseUrl}/user/integrations/xero/settings`;

      const mailBody = `
        <p>Hi ${adminName},</p>
        <p>PayTrade can no longer reach <strong>${orgLabel}</strong> in Xero — the connection's refresh token has expired and we need you to sign back in.</p>
        <p>Until you reconnect, invoices, bills, contacts and payments won't sync between PayTrade and Xero.</p>
        <p>
          <a href="${settingsLink}" style="background-color:#1A73E8;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:4px;display:inline-block;">
            Reconnect Xero in PayTrade
          </a>
        </p>
        <p>If the button above doesn't work, copy and paste this link into your browser:<br/>
          <a href="${settingsLink}">${settingsLink}</a>
        </p>
        <p>You'll be asked to sign in to Xero and re-authorise PayTrade. Once you do, syncing resumes automatically and these reminders stop.</p>
        <p>If you've already reconnected, you can ignore this email.</p>
        <p>Thanks,<br/>The PayTrade team</p>
      `;

      const mailDetails = {
        toEmail,
        subject: `Action required: reconnect ${orgLabel} to Xero in PayTrade`,
        template: 'header-footer-email',
        mailBody,
        mail_type: EmailTypeEnum.failedCompliance,
      };

      await this.emailQueueProducer.emailQueueProducer(mailDetails);

      await this.xeroIntegrationDetails
        .createQueryBuilder()
        .update(XeroIntegrationDetails)
        .set({ last_reauth_email_sent_at: now })
        .where(`id = :id`, { id: row.id })
        .execute();

      this.logger.log(
        `[Task #109] reauth reminder email queued for company_id=${company_id} primary_admin=${toEmail}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[Task #109] markIntegrationNeedsReauth failed for company_id=${company_id}: ${err?.message || err}`,
      );
    }
  }

  private async backfillCachedXeroPdfs(): Promise<void> {
    const PREFIX = '[XERO_PDF_BACKFILL]';
    const BATCH = 100;
    const SLEEP_MS = 1100; // ~55/min – well under Xero's 60/min limit
    let offset = 0;
    let processed = 0;
    let cached = 0;
    let failed = 0;

    this.logger.log(`${PREFIX} starting backfill of cached Xero PDFs`);

    let lastId = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const qb = this.xeroInvoicesBillsRepo
        .createQueryBuilder('xib')
        .leftJoin(
          'xero_integration_details',
          'xid',
          'xid.integration_id = xib.integration_id',
        )
        .addSelect('xid.company_id', 'xid_company_id')
        .where('xib.cached_pdf_object_key IS NULL')
        .andWhere('xib.invoice_id IS NOT NULL')
        .andWhere(
          "(xib.current_xero_status IS NULL OR xib.current_xero_status NOT IN ('DELETED','VOIDED'))",
        )
        .andWhere('xib.id > :lastId', { lastId })
        .orderBy('xib.id', 'ASC')
        .take(BATCH);
      const rows = await qb.getRawAndEntities();

      const entities = rows.entities;
      const raws = rows.raw;
      if (!entities.length) break;
      lastId = Number(entities[entities.length - 1].id) || lastId;

      for (let i = 0; i < entities.length; i++) {
        const row = entities[i];
        const company_id = Number(raws[i]?.xid_company_id);
        if (!company_id) {
          processed++;
          failed++;
          continue;
        }
        processed++;
        try {
          const ok = await this.xeroInvoicesService.fetchAndCacheXeroPdf({
            invoice_id: row.invoice_id,
            integration_id: row.integration_id,
            company_id,
            type: row.type,
          });
          if (ok) cached++;
          else failed++;
        } catch (err) {
          failed++;
          this.logger.error(
            `${PREFIX} backfill failed for invoice ${row.invoice_id}: ${err?.message || err}`,
          );
        }
        await new Promise((r) => setTimeout(r, SLEEP_MS));
      }
    }
    this.logger.log(
      `${PREFIX} done. processed=${processed} cached=${cached} failed=${failed}`,
    );
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
  @Cron('0 * * * *', { timeZone: 'UTC' })
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
                // Phase 2 — refresh cached Xero org GST defaults so the
                // resolveContactGstStatus helper has fresh fall-throughs.
                // Best-effort: never block the rest of the scheduler.
                try {
                  await this.xeroService.refreshOrgGstDefaults(
                    element.company_id,
                  );
                } catch (orgErr) {
                  this.logger.warn(
                    `[Phase 2] refreshOrgGstDefaults failed for company_id=${element.company_id}: ${orgErr?.message || orgErr}`,
                  );
                }
              } catch (err) {
                const error = await handleAxiosError(err);

                const isRefreshToken =
                  await this.xeroResolver.refreshTokenReAuthenticate({
                    error,
                  });

                if (isRefreshToken) {
                  // Task #108 — Single WARN per tick per company for dead
                  // refresh tokens. Skip downstream sub-syncs (which would
                  // each re-throw the same dead-token ERROR and spam logs).
                  this.logger.warn(
                    `[WEBHOOK_FALLBACK] Skipping company ${element.company_id} — needs reauth (${error})`,
                  );
                  // Task #109 — Light up the cross-app reauth banner and
                  // queue a daily reminder email to the PRIMARY ADMIN.
                  // Best-effort: never blocks the scheduler tick.
                  await this.markIntegrationNeedsReauth(element.company_id);
                  continue;
                }

                this.logger.error(
                  `[Xero Scheduler] Failed in scheduler: ${error}`,
                );
              }

              const xeroDetails = await this.xeroIntegrationDetails.findOne({
                where: { company_id: element.company_id, status: 'ACTIVE' },
              });
              if (xeroDetails) {
                // Task #42 — Wrap the /connections call in its own try/catch
                // so a transient network/Xero-API failure does NOT demote
                // the integration to Inactive on its own. Demotion now
                // requires MISSING_TENANT_DEMOTE_THRESHOLD consecutive
                // confirmed misses (HTTP 200 with no matching tenant).
                let connections: any[] | null = null;
                let connectionsCallFailed = false;
                try {
                  const getConnections = await axios.get(
                    'https://api.xero.com/connections',
                    {
                      headers: {
                        Authorization: `Bearer ${xeroDetails?.access_token}`,
                      },
                    },
                  );
                  this.logger.log(
                    `getConnections: ${getConnections?.status}`,
                  );
                  connections =
                    getConnections.status === 200 ? getConnections.data : [];
                } catch (connErr: any) {
                  connectionsCallFailed = true;
                  this.logger.warn(
                    `[Task #42] /connections call failed for company_id=${element.company_id}; treating as transient (NOT demoting): ${connErr?.message || connErr}`,
                  );
                }

                if (connectionsCallFailed || connections === null) {
                  // Transient — do not touch status or counter.
                } else {
                  const connection = connections?.filter(
                    (connection) =>
                      connection?.tenantId === xeroDetails?.tenant_id,
                  );
                  this.logger.log(`connection: ${JSON.stringify(connection)}`);
                  if (!connection || connection?.length == 0) {
                    const newCount = await this.bumpMissingTenantCounter(
                      xeroDetails.id,
                    );
                    if (newCount < this.MISSING_TENANT_DEMOTE_THRESHOLD) {
                      this.logger.warn(
                        `[Task #42] tenant ${xeroDetails?.tenant_id} missing for company_id=${element.company_id} (count=${newCount}/${this.MISSING_TENANT_DEMOTE_THRESHOLD}); NOT demoting yet`,
                      );
                    } else {
                      this.logger.warn(
                        `[Task #42] tenant ${xeroDetails?.tenant_id} missing for company_id=${element.company_id} (count=${newCount}); demoting to Inactive`,
                      );
                      const updateXeroResult = await this.xeroIntegrationDetails
                        .createQueryBuilder()
                        .update(XeroIntegrationDetails)
                        .set({
                          status: 'INACTIVE',
                          access_token: null,
                          id_token: null,
                          refresh_token: null,
                          expires_at: null,
                          consecutive_missing_tenant_count: 0,
                          updated_on: moment.tz('UTC'),
                          updated_group: 'SYSTEM',
                        })
                        .where(`id = :id`, { id: xeroDetails?.id })
                        .execute();

                      this.logger.log(
                        `updateXeroResult: ${JSON.stringify(updateXeroResult)}`,
                      );

                      const getIntegrationDetails =
                        await this.integrationDetails.findOne({
                          where: {
                            integration_id: xeroDetails?.integration_id,
                          },
                        });

                      const updateIntegrationResult =
                        await this.integrationDetails
                          .createQueryBuilder()
                          .update(IntegrationDetails)
                          .set({
                            previous_status:
                              getIntegrationDetails.integration_status,
                            integration_status: 'Inactive',
                            updated_on: moment.tz('UTC'),
                            updated_group: 'SYSTEM',
                          })
                          .where(`id = :id`, { id: getIntegrationDetails?.id })
                          .execute();

                      this.logger.log(
                        `updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`,
                      );

                      // Task #45 — notify PRIMARY ADMIN that the Xero
                      // connection has truly gone Inactive.
                      await this.notifyPrimaryAdminOfXeroInactive(
                        xeroDetails?.id,
                        element.company_id,
                        xeroDetails?.tenant_name,
                      );
                    }
                  } else {
                    // Tenant present — reset counter and continue normal sync flow.
                    if (
                      (xeroDetails.consecutive_missing_tenant_count || 0) > 0
                    ) {
                      await this.resetMissingTenantCounter(xeroDetails.id);
                    }
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
            }
          } else {
            const getXeroDetails = await this.xeroIntegrationDetails.findOne({
              where: { company_id: element.company_id, status: 'ACTIVE' },
            });
            if (getXeroDetails) {
              // Task #42 — refreshTokenSet may legitimately fail (transient
              // network, dead refresh token). Either way the user must
              // re-OAuth via the FE banner; the scheduler should never
              // demote the parent integration from this branch.
              try {
                await this.xeroService.refreshTokenSet(
                  element.company_id,
                  this.xero,
                );
              } catch (refreshErr: any) {
                this.logger.warn(
                  `[Task #42] refreshTokenSet failed for company_id=${element.company_id} (non-active branch); skipping: ${refreshErr?.message || refreshErr}`,
                );
                continue;
              }

              const xeroDetails = await this.xeroIntegrationDetails.findOne({
                where: { company_id: element.company_id, status: 'ACTIVE' },
              });
              if (xeroDetails) {
                // Task #42 — same defensive wrapper as the active-branch above.
                let connections: any[] | null = null;
                let connectionsCallFailed = false;
                try {
                  const getConnections = await axios.get(
                    'https://api.xero.com/connections',
                    {
                      headers: {
                        Authorization: `Bearer ${xeroDetails?.access_token}`,
                      },
                    },
                  );
                  this.logger.log(`getConnections: ${getConnections.status}`);
                  connections =
                    getConnections.status === 200 ? getConnections.data : [];
                } catch (connErr: any) {
                  connectionsCallFailed = true;
                  this.logger.warn(
                    `[Task #42] /connections call failed for company_id=${element.company_id} (non-active branch); treating as transient: ${connErr?.message || connErr}`,
                  );
                }

                if (!connectionsCallFailed && connections !== null) {
                  const connection = connections?.filter(
                    (connection) =>
                      connection?.tenantId === xeroDetails?.tenant_id,
                  );
                  this.logger.log(`connection: ${JSON.stringify(connection)}`);

                  if (!connection || connection?.length == 0) {
                    const newCount = await this.bumpMissingTenantCounter(
                      xeroDetails.id,
                    );
                    if (newCount < this.MISSING_TENANT_DEMOTE_THRESHOLD) {
                      this.logger.warn(
                        `[Task #42] tenant ${xeroDetails?.tenant_id} missing for company_id=${element.company_id} (count=${newCount}/${this.MISSING_TENANT_DEMOTE_THRESHOLD}); NOT demoting yet`,
                      );
                    } else {
                      const updateXeroResult =
                        await this.xeroIntegrationDetails
                          .createQueryBuilder()
                          .update(XeroIntegrationDetails)
                          .set({
                            status: 'INACTIVE',
                            access_token: null,
                            id_token: null,
                            refresh_token: null,
                            expires_at: null,
                            consecutive_missing_tenant_count: 0,
                            updated_on: moment.tz('UTC'),
                            updated_group: 'SYSTEM',
                          })
                          .where(`id = :id`, { id: xeroDetails?.id })
                          .execute();

                      this.logger.log(
                        `updateXeroResult: ${JSON.stringify(updateXeroResult)}`,
                      );

                      const getIntegrationDetails =
                        await this.integrationDetails.findOne({
                          where: {
                            integration_id: xeroDetails?.integration_id,
                          },
                        });

                      const updateIntegrationResult =
                        await this.integrationDetails
                          .createQueryBuilder()
                          .update(IntegrationDetails)
                          .set({
                            previous_status:
                              getIntegrationDetails.integration_status,
                            integration_status: 'Inactive',
                            updated_on: moment.tz('UTC'),
                            updated_group: 'SYSTEM',
                          })
                          .where(`id = :id`, { id: getIntegrationDetails?.id })
                          .execute();

                      this.logger.log(
                        `updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`,
                      );

                      // Task #45 — notify PRIMARY ADMIN that the Xero
                      // connection has truly gone Inactive (non-active branch).
                      await this.notifyPrimaryAdminOfXeroInactive(
                        xeroDetails?.id,
                        element.company_id,
                        xeroDetails?.tenant_name,
                      );
                    }
                  } else if (
                    (xeroDetails.consecutive_missing_tenant_count || 0) > 0
                  ) {
                    // Task #42 — tenant is back; clear the counter.
                    await this.resetMissingTenantCounter(xeroDetails.id);
                  }
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
          const rawBankNumber = account.bankAccountNumber || '';
          const digitsOnly = rawBankNumber.replace(/\D/g, '');
          const bsbParsed = digitsOnly.length >= 6 ? parseInt(digitsOnly.slice(0, 6), 10) : null;
          const accountNumberParsed = digitsOnly.length > 6 ? digitsOnly.slice(6) : rawBankNumber.slice(6) || null;
          const accountData: any = {
            account_id: account.accountID,
            integration_id: xeroDetails.integration_id,
            tenant_id: xeroDetails.tenant_id,
            account_name: account.name,
            account_number: accountNumberParsed,
            bsb_number: bsbParsed,
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

        if (xeroDetails.pt_to_xero_bank_auto_create) {
          const mappedPtIds = new Set(
            (await this.xeroBankAccountDetails.find({
              where: { integration_id: xeroDetails.integration_id },
              select: ['pt_bank_account_id'],
            }))
              .map((a) => a.pt_bank_account_id)
              .filter(Boolean),
          );

          const bankAccountsRepo = this.xeroBankAccountDetails.manager.getRepository(BankAccounts);
          const allPtAccounts = await bankAccountsRepo.find({
            where: { company_id, status: In(['Active', 'Open'] as any) },
          });

          const unmappedPtAccounts = allPtAccounts.filter(
            (a) => !mappedPtIds.has(a.bank_account_id) && !a.skip_xero_auto_create,
          );

          for (const ptAccount of unmappedPtAccounts) {
            try {
              // Task #108 — Pre-flight idempotency: if a Xero account
              // already exists with the same name (case-insensitive) or
              // the same bank account number, just link it and skip the
              // create call. Eliminates the noisy "ValidationException ...
              // Please enter a unique Code/Name" failure path that was
              // firing every tick for legacy accounts.
              const ptBankAcctNumber =
                (ptAccount.bsb_number ? String(ptAccount.bsb_number) : '') +
                (ptAccount.account_number || '');
              const ptNameLower = (ptAccount.account_name || '')
                .trim()
                .toLowerCase();
              // Task #108 — Skip ARCHIVED Xero accounts so we don't link a
              // PT bank account to a stale Xero record.
              const preExisting = accounts.find((a: any) => {
                if (
                  String(a?.status || '').toUpperCase() !== 'ACTIVE'
                ) {
                  return false;
                }
                const xName = String(a?.name || '').trim().toLowerCase();
                const xBankNo = String(a?.bankAccountNumber || '').replace(
                  /\D/g,
                  '',
                );
                return (
                  (ptNameLower && xName && xName === ptNameLower) ||
                  (ptBankAcctNumber && xBankNo && xBankNo === ptBankAcctNumber)
                );
              });
              if (preExisting) {
                // Task #108 — Upsert keyed by (account_id, integration_id)
                // so refresh ticks don't accumulate duplicate mapping rows.
                const existingMapping = await this.xeroBankAccountDetails.findOne({
                  where: {
                    account_id: preExisting.accountID,
                    integration_id: xeroDetails.integration_id,
                  },
                });
                const linkPayload: any = {
                  account_id: preExisting.accountID,
                  integration_id: xeroDetails.integration_id,
                  tenant_id: xeroDetails.tenant_id,
                  account_name: preExisting.name,
                  account_number: ptAccount.account_number || '',
                  bsb_number: ptAccount.bsb_number
                    ? Number(ptAccount.bsb_number)
                    : null,
                  account_type: preExisting.type,
                  account_status: preExisting.status,
                  description: preExisting.description,
                  pt_bank_account_id: ptAccount.bank_account_id,
                  mapped_status: 'System',
                };
                if (existingMapping) {
                  await this.xeroBankAccountDetails
                    .createQueryBuilder()
                    .update(XeroBankAccountDetails)
                    .set(linkPayload)
                    .where(
                      'account_id = :account_id AND integration_id = :integration_id',
                      {
                        account_id: preExisting.accountID,
                        integration_id: xeroDetails.integration_id,
                      },
                    )
                    .execute();
                } else {
                  const linkRecord = this.xeroBankAccountDetails.create({
                    ...linkPayload,
                    created_on: new Date(),
                  } as any);
                  await this.xeroBankAccountDetails.save(linkRecord);
                }
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 503,
                  dynamic_values: { account_name: ptAccount.account_name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: preExisting.accountID,
                    paytradeId: ptAccount.bank_account_id,
                  },
                  reference_id: preExisting.accountID,
                  history: [
                    `Matched existing Xero account "${preExisting.name}" for PayTrade account "${ptAccount.account_name}"`,
                    'Linked instead of creating duplicate',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [preExisting],
                  paytrade_records: [ptAccount],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                continue;
              }

              const existingCodes = accounts.map((a) => a.code).filter(Boolean);
              let newCode: string;
              do {
                newCode = String(Math.floor(10000 + Math.random() * 90000));
              } while (existingCodes.includes(newCode));

              const bankAccountNumber = ptBankAcctNumber;

              const createResponse =
                await this.xero.accountingApi.createAccount(
                  xeroDetails.tenant_id,
                  {
                    code: newCode,
                    name: ptAccount.account_name,
                    bankAccountNumber: bankAccountNumber || undefined,
                    currencyCode: CurrencyCode.AUD,
                    description: ptAccount.account_type || '',
                    type: AccountType.BANK,
                  },
                );

              const createdAccount =
                createResponse?.body?.accounts?.[0];
              if (createdAccount) {
                const newXeroRecord = this.xeroBankAccountDetails.create({
                  account_id: createdAccount.accountID,
                  integration_id: xeroDetails.integration_id,
                  tenant_id: xeroDetails.tenant_id,
                  account_name: createdAccount.name,
                  account_number: ptAccount.account_number || '',
                  bsb_number: ptAccount.bsb_number
                    ? Number(ptAccount.bsb_number)
                    : null,
                  account_type: createdAccount.type,
                  account_status: createdAccount.status,
                  description: createdAccount.description,
                  pt_bank_account_id: ptAccount.bank_account_id,
                  mapped_status: 'System' as any,
                  created_on: new Date(),
                } as any);
                await this.xeroBankAccountDetails.save(newXeroRecord);
                accounts.push(createdAccount);

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 466,
                  dynamic_values: { account_name: ptAccount.account_name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: createdAccount.accountID,
                    paytradeId: ptAccount.bank_account_id,
                  },
                  reference_id: createdAccount.accountID,
                  history: [
                    `Auto-created ${ptAccount.account_name} in Xero from PayTrade`,
                    'Export successful',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [createdAccount],
                  paytrade_records: [ptAccount],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              }
            } catch (autoCreateErr) {
              let friendlyError = String(autoCreateErr);
              let rawError = String(autoCreateErr);
              let validationMsgs: string[] = [];
              try {
                const errObj =
                  typeof autoCreateErr === 'object' && autoCreateErr !== null
                    ? autoCreateErr
                    : JSON.parse(String(autoCreateErr));
                const body = errObj?.response?.body || errObj?.body || errObj;
                validationMsgs =
                  body?.Elements?.flatMap((el: any) =>
                    (el?.ValidationErrors || []).map((ve: any) => ve?.Message),
                  ).filter(Boolean) || [];
                if (validationMsgs.length > 0) {
                  friendlyError = `${body?.Type || 'Error'} (${errObj?.response?.statusCode || 'N/A'}): ${validationMsgs.join('; ')}`;
                } else if (body?.Message) {
                  friendlyError = `${body?.Type || 'Error'} (${errObj?.response?.statusCode || 'N/A'}): ${body.Message}`;
                }
                rawError = JSON.stringify(errObj?.response || errObj);
              } catch {
              }

              // Task #108 — Post-failure idempotency: if Xero rejected the
              // create with an "already exists" / "unique" validation
              // message, refetch accounts and link the existing one
              // instead of writing a recurring ERROR every tick.
              const looksLikeDuplicate = validationMsgs.some((m) =>
                /already exists|unique\s+(code|name)|duplicate/i.test(
                  String(m || ''),
                ),
              );
              if (looksLikeDuplicate) {
                try {
                  const refetched =
                    await this.xero.accountingApi.getAccounts(
                      xeroDetails.tenant_id,
                    );
                  const refetchedAccounts =
                    refetched?.body?.accounts || [];
                  const ptNameLower = (ptAccount.account_name || '')
                    .trim()
                    .toLowerCase();
                  const ptBankNo =
                    (ptAccount.bsb_number ? String(ptAccount.bsb_number) : '') +
                    (ptAccount.account_number || '');
                  const match = refetchedAccounts.find((a: any) => {
                    if (
                      String(a?.status || '').toUpperCase() !== 'ACTIVE'
                    ) {
                      return false;
                    }
                    const xName = String(a?.name || '').trim().toLowerCase();
                    const xBankNo = String(
                      a?.bankAccountNumber || '',
                    ).replace(/\D/g, '');
                    return (
                      (ptNameLower && xName && xName === ptNameLower) ||
                      (ptBankNo && xBankNo && xBankNo === ptBankNo)
                    );
                  });
                  if (match) {
                    // Task #108 — Upsert keyed by (account_id, integration_id)
                    // so duplicate-recovery doesn't accumulate mapping rows.
                    const existingMapping =
                      await this.xeroBankAccountDetails.findOne({
                        where: {
                          account_id: match.accountID,
                          integration_id: xeroDetails.integration_id,
                        },
                      });
                    const linkPayload: any = {
                      account_id: match.accountID,
                      integration_id: xeroDetails.integration_id,
                      tenant_id: xeroDetails.tenant_id,
                      account_name: match.name,
                      account_number: ptAccount.account_number || '',
                      bsb_number: ptAccount.bsb_number
                        ? Number(ptAccount.bsb_number)
                        : null,
                      account_type: match.type,
                      account_status: match.status,
                      description: match.description,
                      pt_bank_account_id: ptAccount.bank_account_id,
                      mapped_status: 'System',
                    };
                    if (existingMapping) {
                      await this.xeroBankAccountDetails
                        .createQueryBuilder()
                        .update(XeroBankAccountDetails)
                        .set(linkPayload)
                        .where(
                          'account_id = :account_id AND integration_id = :integration_id',
                          {
                            account_id: match.accountID,
                            integration_id: xeroDetails.integration_id,
                          },
                        )
                        .execute();
                    } else {
                      const linkRecord = this.xeroBankAccountDetails.create({
                        ...linkPayload,
                        created_on: new Date(),
                      } as any);
                      await this.xeroBankAccountDetails.save(linkRecord);
                    }
                    accounts.push(match);
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      integration_id: xeroDetails.integration_id,
                      log_template_id: 503,
                      dynamic_values: {
                        account_name: ptAccount.account_name,
                      },
                      project_id: null,
                      contract_id: null,
                      reference: {
                        xeroId: match.accountID,
                        paytradeId: ptAccount.bank_account_id,
                      },
                      reference_id: match.accountID,
                      history: [
                        `Xero rejected create as duplicate; matched existing "${match.name}"`,
                        'Linked instead of creating duplicate',
                      ],
                      important_checks: {},
                      error_message: null,
                      xero_records: [match],
                      paytrade_records: [ptAccount],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    continue;
                  }
                } catch (recoveryErr) {
                  this.logger.warn(
                    `[Task #108] Auto-link recovery after duplicate validation failed for PT account ${ptAccount.account_name}: ${recoveryErr?.message || recoveryErr}`,
                  );
                }
              }

              this.logger.error(
                `Failed to auto-create PT account ${ptAccount.account_name} in Xero: ${friendlyError}`,
              );

              await this.xeroService.insertXeroSyncLogs(decoded, {
                integration_id: xeroDetails.integration_id,
                log_template_id: 27,
                dynamic_values: { account_name: ptAccount.account_name },
                project_id: null,
                contract_id: null,
                reference: { paytradeId: ptAccount.bank_account_id },
                reference_id: null,
                history: [
                  `Auto-create ${ptAccount.account_name} in Xero failed`,
                  friendlyError,
                ],
                important_checks: {},
                error_message: rawError,
                xero_records: [],
                paytrade_records: [ptAccount],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            }
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

        if (
          (newData?.length || 0) > 0 ||
          (oldData?.length || 0) > 0 ||
          (syncedData?.length || 0) > 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            integration_id: xeroDetails.integration_id,
            log_template_id: 381,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xero_record_count: accounts?.length || 0,
              paytrade_record_count: allBankAccounts?.length || 0,
            },
            reference_id: null,
            history: [
              `API triggered from bank account scheduler`,
              'Sync successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: null,
            paytrade_records: null,
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          });
        }
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
                    account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
                    bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
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

        const hasMissingFields =
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
            (!associated_cash_account_id || !trustee_id || !project_ids));

        // Task #108 — Idempotent inbound bank-account auto-create: if a
        // PT bank account already exists with the same account number
        // (preferring an exact bsb+number match), link it to this Xero
        // account instead of creating a noisy "Account number already
        // exists" failure on every tick.
        if (xeroDetails.xero_to_pt_bank_auto_create) {
          try {
            const xeroBankNo = String(account?.bankAccountNumber || '').replace(
              /\D/g,
              '',
            );
            const xeroAcctTail = xeroBankNo.length > 6 ? xeroBankNo.slice(6) : xeroBankNo;
            const xeroBsb = xeroBankNo.length > 6
              ? parseInt(xeroBankNo.slice(0, 6), 10)
              : null;
            if (xeroAcctTail) {
              const bankAccountsRepoLocal =
                this.xeroBankAccountDetails.manager.getRepository(BankAccounts);
              // Task #108 — Skip Deleted/Closed PT bank accounts so we
              // don't link a Xero account to a stale local record.
              const ptCandidates = await bankAccountsRepoLocal.find({
                where: {
                  company_id,
                  account_number: xeroAcctTail,
                  status: In(['Active', 'Open', 'Draft'] as any),
                },
              });
              const exactMatch =
                ptCandidates.find(
                  (c) =>
                    xeroBsb != null &&
                    c.bsb_number != null &&
                    Number(c.bsb_number) === xeroBsb,
                ) || ptCandidates[0];
              if (exactMatch) {
                await this.xeroBankAccountDetails
                  .createQueryBuilder()
                  .update(XeroBankAccountDetails)
                  .set({
                    pt_bank_account_id: exactMatch.bank_account_id,
                    mapped_status: 'System',
                    updated_by: decoded?.userId || null,
                    updated_on: moment.tz('UTC'),
                    updated_group: decoded ? 'USER' : 'SYSTEM',
                  })
                  .where(
                    'account_id = :account_id AND integration_id = :integration_id',
                    {
                      account_id,
                      integration_id: xeroDetails.integration_id,
                    },
                  )
                  .execute();

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'createOrUpdateAccountInPaytrade',
                  api_payload: { account_id, account_name: account.name },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 504,
                  dynamic_values: { account_name: account.name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroAccountDetails?.id,
                    paytradeId: exactMatch.bank_account_id,
                  },
                  reference_id: xeroAccountDetails?.id,
                  history: [
                    `Matched existing PayTrade bank account "${exactMatch.account_name}" by account number`,
                    'Linked instead of creating duplicate draft',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [account],
                  paytrade_records: [exactMatch],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return account;
              }
            }
          } catch (linkErr) {
            this.logger.warn(
              `[Task #108] Idempotent inbound bank-account link failed for account_id=${account_id}: ${linkErr?.message || linkErr}`,
            );
          }
        }

        if (hasMissingFields && xeroDetails.xero_to_pt_bank_auto_create) {
          try {
            const draftPayload: any = {
              company_id,
              account_name: account.name || account_name || 'Unnamed Xero Account',
              account_type: account_type || 'Cash Account',
              account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || account_number || '',
              bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || bsb_number || 0,
              financial_institution: financial_institution || 'From Xero - pending update',
              opening_date: opening_date || new Date().toISOString().split('T')[0],
              delegate_powers: delegate_powers || null,
              status: 'Draft',
            };
            const bankResponse = await this.bankAccountsService.addBankAccount(
              decoded,
              draftPayload,
              decoded?.userId,
            );

            let newBankAccountId;
            if (bankResponse && 'bank_account_id' in bankResponse) {
              newBankAccountId = bankResponse.bank_account_id;
              await this.xeroBankAccountDetails
                .createQueryBuilder()
                .update(XeroBankAccountDetails)
                .set({
                  pt_bank_account_id: newBankAccountId,
                  mapped_status: 'System',
                  updated_by: decoded?.userId || null,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded ? 'USER' : 'SYSTEM',
                })
                .where(
                  'account_id = :account_id AND integration_id = :integration_id',
                  {
                    account_id,
                    integration_id: xeroDetails.integration_id,
                  },
                )
                .execute();
            }

            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createOrUpdateAccountInPaytrade',
              api_payload: {
                account_id,
                account_name: account.name,
                account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
                bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
                account_status: account.status,
                created_as_draft: true,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 467,
              dynamic_values: { account_name: account.name },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroAccountDetails?.id,
                paytradeId: newBankAccountId || null,
              },
              reference_id: xeroAccountDetails?.id,
              history: [
                `API triggered from bank account scheduler ${account.name}`,
                'Auto-created as draft in PayTrade',
              ],
              important_checks: {},
              error_message: `Bank account ${account.name} was created as a draft. Required fields (account type, financial institution, opening date, delegate powers) need to be completed to activate it.`,
              xero_records: [account],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return account;
          } catch (draftError) {
            this.logger.error(`Failed to auto-create draft bank account: ${draftError}`);
          }
        }

        if (hasMissingFields) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'createOrUpdateAccountInPaytrade',
              api_payload: {
                account_id,
                account_name: account.name,
                account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
                bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
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
                account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
                bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
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

            // Task #116 — Only send bankAccountNumber when we actually
            // have a BSB + account number pair. Never send "null12345"
            // or "" back to Xero.
            const bsbDigitsSched =
              paytradeAccountDetails.bsb_number != null
                ? String(paytradeAccountDetails.bsb_number).replace(/\D/g, '')
                : '';
            const acctDigitsSched = (paytradeAccountDetails.account_number || '')
              .toString()
              .replace(/\D/g, '');
            const bankAccountNumberSched =
              bsbDigitsSched && acctDigitsSched
                ? `${bsbDigitsSched.padStart(6, '0')}${acctDigitsSched}`
                : undefined;
            const updateBankAccountResponse =
              await this.xero.accountingApi.updateAccount(
                xeroDetails.tenant_id,
                account_id,
                {
                  accounts: [
                    {
                      name: paytradeAccountDetails.account_name,
                      ...(bankAccountNumberSched
                        ? { bankAccountNumber: bankAccountNumberSched }
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
                  account_number: (account.bankAccountNumber || '').replace(/\D/g, '').slice(6) || null,
                  bsb_number: parseInt((account.bankAccountNumber || '').replace(/\D/g, '').slice(0, 6), 10) || null,
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
              'contact.is_customer AS is_customer',
              'contact.is_supplier AS is_supplier',
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

              // Task #110 — Auto-mapping by name match is an idempotent
              // link path (no row was created in either system). Emit the
              // dedicated "matched and linked existing" log so audit
              // history reflects the link decision instead of leaving it
              // silent (parallels template 504 for bank accounts).
              try {
                type AutoMappingRow = (typeof autoMappingRecords)[number];
                const autoRow = autoMappingRecords.find(
                  (r: AutoMappingRow) => r.contact_id === element.contact_id,
                );
                const contactName = autoRow?.contact_name || '';
                const ptContactName = autoRow?.pt_contact_name || contactName;
                const xeroRowId = autoRow?.id || null;
                const ptType = autoRow?.is_customer ? 'Client' : 'Supplier';
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 505,
                  dynamic_values: {
                    contact_name: contactName,
                    contact_type: ptType,
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroRowId,
                    paytradeId: element.pt_contact_id,
                  },
                  reference_id: xeroRowId,
                  history: [
                    `Matched existing PayTrade contact "${ptContactName}" for Xero contact "${contactName}" by name`,
                    'Linked instead of creating duplicate',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [{ contact_id: element.contact_id, contact_name: contactName }],
                  paytrade_records: [{ client_supplier_id: element.pt_contact_id, client_supplier_name: ptContactName }],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              } catch (logErr) {
                this.logger.warn(
                  `[Task #110] Failed to write linked-existing log for auto-mapped Xero contact ${element.contact_id}: ${logErr?.message || logErr}`,
                );
              }
            }
          }

          if (xeroDetails.pt_to_xero_contact_auto_create) {
            const mappedPtContactIds = new Set(
              (await this.xeroContactDetails.find({
                where: { integration_id: xeroDetails.integration_id },
                select: ['pt_contact_id'],
              }))
                .map((c) => c.pt_contact_id)
                .filter(Boolean),
            );

            const allPtContacts = await this.clientSuppliersDetailsService
              .getActiveContactsByCompanyId(company_id);

            const unmappedPtContacts = (allPtContacts || []).filter(
              (c) => !mappedPtContactIds.has(c.client_supplier_id),
            );

            // Task #110 — Preload all unmapped active Xero contacts once
            // and index them by normalized name so the per-PT idempotent
            // pre-check below is O(1) instead of issuing a fresh DB
            // scan inside each loop iteration.
            const candidateXeroRows: XeroContactDetails[] =
              await this.xeroContactDetails.find({
                where: {
                  integration_id: xeroDetails.integration_id,
                  pt_contact_id: IsNull(),
                  contact_status: 'ACTIVE',
                },
              });
            const xeroByNormalizedName = new Map<string, XeroContactDetails>();
            for (const row of candidateXeroRows) {
              const key = String(row.contact_name || '').trim().toLowerCase();
              if (key && !xeroByNormalizedName.has(key)) {
                xeroByNormalizedName.set(key, row);
              }
            }

            for (const ptContact of unmappedPtContacts) {
              try {
                // Task #110 — Idempotent pre-check: if an unmapped Xero
                // contact in our DB matches by name (case/whitespace-
                // insensitive), link it directly instead of asking Xero
                // to create a duplicate. Emits the dedicated "matched
                // and linked existing" log (parallels template 503 for
                // bank accounts) instead of the misleading 469
                // "auto-created" entry.
                const ptNameNorm = String(
                  ptContact.client_supplier_name || '',
                )
                  .trim()
                  .toLowerCase();
                let linkedExisting = false;
                if (ptNameNorm) {
                  const matchedRow = xeroByNormalizedName.get(ptNameNorm);
                  if (matchedRow) {
                    const linkedStatus: MappedStatus = 'System';
                    await this.xeroContactDetails
                      .createQueryBuilder()
                      .update(XeroContactDetails)
                      .set({
                        pt_contact_id: ptContact.client_supplier_id,
                        mapped_status: linkedStatus,
                        updated_by: userId,
                        updated_on: moment.tz('UTC'),
                        updated_group: createdGroup,
                      })
                      .where(
                        'contact_id = :contact_id AND integration_id = :integration_id',
                        {
                          contact_id: matchedRow.contact_id,
                          integration_id: xeroDetails.integration_id,
                        },
                      )
                      .execute();
                    xeroByNormalizedName.delete(ptNameNorm);
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      integration_id: xeroDetails.integration_id,
                      log_template_id: 506,
                      dynamic_values: {
                        contact_name: ptContact.client_supplier_name,
                      },
                      project_id: null,
                      contract_id: null,
                      reference: {
                        xeroId: matchedRow.id,
                        paytradeId: ptContact.client_supplier_id,
                      },
                      reference_id: matchedRow.id,
                      history: [
                        `Matched existing Xero contact "${matchedRow.contact_name}" for PayTrade contact "${ptContact.client_supplier_name}"`,
                        'Linked instead of creating duplicate',
                      ],
                      important_checks: {},
                      error_message: null,
                      xero_records: [matchedRow],
                      paytrade_records: [ptContact],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    linkedExisting = true;
                  }
                }
                if (linkedExisting) {
                  continue;
                }

                await this.xeroContactsService.createContact(decoded, {
                  client_supplier_id: ptContact.client_supplier_id,
                  mapped_status: 'System',
                });

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 469,
                  dynamic_values: { contact_name: ptContact.client_supplier_name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    paytradeId: ptContact.client_supplier_id,
                  },
                  reference_id: null,
                  history: [
                    `Auto-created ${ptContact.client_supplier_name} in Xero from PayTrade`,
                    'Export successful',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [],
                  paytrade_records: [ptContact],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              } catch (autoCreateErr) {
                // Task #108 — Widen diagnostic capture to include the full
                // Elements[].ValidationErrors[] payload from Xero so the
                // root cause is visible without re-deploying.
                let friendlyError = String(autoCreateErr);
                try {
                  const errObj =
                    typeof autoCreateErr === 'object' && autoCreateErr !== null
                      ? autoCreateErr
                      : JSON.parse(String(autoCreateErr));
                  const body =
                    errObj?.response?.body || errObj?.body || errObj;
                  const validationMsgs =
                    body?.Elements?.flatMap((el: any) =>
                      (el?.ValidationErrors || []).map(
                        (ve: any) => ve?.Message,
                      ),
                    ).filter(Boolean) || [];
                  if (validationMsgs.length > 0) {
                    friendlyError = `${body?.Type || 'Error'} (${errObj?.response?.statusCode || 'N/A'}): ${validationMsgs.join('; ')}`;
                  } else if (body?.Message) {
                    friendlyError = `${body?.Type || 'Error'} (${errObj?.response?.statusCode || 'N/A'}): ${body.Message}`;
                  }
                } catch {
                }
                this.logger.error(
                  `Failed to auto-create PT contact ${ptContact.client_supplier_name} in Xero: ${friendlyError}`,
                );
              }
            }
          }

          if (xeroDetails.xero_to_pt_contact_auto_create) {
            const unmappedXeroContacts = await this.xeroContactDetails.find({
              where: {
                integration_id: xeroDetails.integration_id,
                pt_contact_id: null as any,
                contact_status: 'ACTIVE',
              },
            });

            for (const xeroContact of unmappedXeroContacts) {
              try {
                const contactType = xeroContact.is_customer ? 'Client' : 'Supplier';

                // Task #108 — Idempotent inbound match: try name first
                // (case-/whitespace-insensitive); fall back to ABN via an
                // on-demand getContact lookup so a renamed PT contact
                // still links instead of failing with a duplicate-name
                // insert.
                let existingContact = await this.clientSuppliersDetailsService
                  .findByNameAndCompany(
                    xeroContact.contact_name,
                    company_id,
                  );
                if (!existingContact) {
                  try {
                    const fullResp = await this.xero.accountingApi.getContact(
                      xeroDetails.tenant_id,
                      xeroContact.contact_id,
                    );
                    const abnFromXero =
                      fullResp?.body?.contacts?.[0]?.taxNumber || null;
                    if (abnFromXero) {
                      existingContact = await this.clientSuppliersDetailsService
                        .findByAbnAndCompany(String(abnFromXero), company_id);
                    }
                  } catch (abnLookupErr) {
                    // Non-fatal — fall through to insert path.
                  }
                }

                if (existingContact) {
                  await this.xeroContactDetails
                    .createQueryBuilder()
                    .update(XeroContactDetails)
                    .set({
                      pt_contact_id: existingContact.client_supplier_id,
                      mapped_status: 'System',
                      updated_by: userId,
                      updated_on: moment.tz('UTC'),
                      updated_group: createdGroup,
                    })
                    .where(
                      'contact_id = :contact_id AND integration_id = :integration_id',
                      {
                        contact_id: xeroContact.contact_id,
                        integration_id: xeroDetails.integration_id,
                      },
                    )
                    .execute();
                  // Task #108 — Write a single matched-existing info log
                  // so ops can see the link decision in the sync history
                  // (parallels templates 503/504 for bank accounts).
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 505,
                    dynamic_values: {
                      contact_name: xeroContact.contact_name,
                      contact_type: contactType,
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: xeroContact.id,
                      paytradeId: existingContact.client_supplier_id,
                    },
                    reference_id: xeroContact.id,
                    history: [
                      `Matched existing PayTrade contact "${existingContact.client_supplier_name}" for Xero contact "${xeroContact.contact_name}"`,
                      'Linked instead of creating duplicate',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: [xeroContact],
                    paytrade_records: [existingContact],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  continue;
                }

                const createPayload: any = {
                  company_id,
                  client_supplier_name: xeroContact.contact_name,
                  business_name: xeroContact.contact_name,
                  client_supplier_type: contactType,
                  client_supplier_status: 'Completed',
                  related_entity: 'No',
                  client_email_id: '',
                  account_details: [],
                };

                const newContact =
                  await this.clientSuppliersDetailsService.insertClientSupplierDetails(
                    decoded,
                    createPayload,
                  );

                if (newContact && newContact.client_supplier_id) {
                  await this.xeroContactDetails
                    .createQueryBuilder()
                    .update(XeroContactDetails)
                    .set({
                      pt_contact_id: newContact.client_supplier_id,
                      mapped_status: 'System',
                      updated_by: userId,
                      updated_on: moment.tz('UTC'),
                      updated_group: createdGroup,
                    })
                    .where(
                      'contact_id = :contact_id AND integration_id = :integration_id',
                      {
                        contact_id: xeroContact.contact_id,
                        integration_id: xeroDetails.integration_id,
                      },
                    )
                    .execute();

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 470,
                    dynamic_values: {
                      contact_name: xeroContact.contact_name,
                      contact_type: contactType,
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: xeroContact.id,
                      paytradeId: newContact.client_supplier_id,
                    },
                    reference_id: xeroContact.id,
                    history: [
                      `Auto-created ${xeroContact.contact_name} in PayTrade as ${contactType}`,
                      'Import successful',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: [xeroContact],
                    paytrade_records: [newContact],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                }
              } catch (autoCreateErr) {
                this.logger.error(
                  `Failed to auto-create Xero contact ${xeroContact.contact_name} in PayTrade: ${autoCreateErr}`,
                );
              }
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

          const bankAccountsRepo = this.xeroContactDetails.manager.getRepository(BankAccounts);
          const csRepo = this.xeroContactDetails.manager.getRepository(ClientSuppliersDetails);
          const mappedContactsForFinancial = await this.xeroContactDetails.find({
            where: {
              integration_id: xeroDetails.integration_id,
              contact_status: 'ACTIVE',
            },
          });
          const mappedWithPt = mappedContactsForFinancial.filter(c => c.pt_contact_id);

          const resolveClientSupplierId = async (ptContactId: any): Promise<number | null> => {
            const asNum = Number(ptContactId);
            if (!isNaN(asNum) && Number.isInteger(asNum)) {
              return asNum;
            }
            const csRecord = await csRepo.findOne({
              where: { id: String(ptContactId) },
              select: ['client_supplier_id'],
            });
            return csRecord?.client_supplier_id ?? null;
          };

          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

          let allFullContacts: any[] = [];
          try {
            const fullContactsResp = await this.xero.accountingApi.getContacts(
              xeroDetails.tenant_id,
            );
            allFullContacts = fullContactsResp?.body?.contacts || [];
          } catch (bulkErr: any) {
            if (bulkErr?.response?.statusCode === 429 || bulkErr?.statusCode === 429) {
              const retryAfter = parseInt(bulkErr?.response?.headers?.['retry-after'] || '60', 10);
              this.logger.warn(`Xero rate limit on bulk contacts fetch for financial sync, waiting ${retryAfter}s...`);
              await delay(retryAfter * 1000);
              try {
                const retryResp = await this.xero.accountingApi.getContacts(xeroDetails.tenant_id);
                allFullContacts = retryResp?.body?.contacts || [];
              } catch (retryErr) {
                this.logger.error(`Failed to fetch full contacts after retry: ${retryErr}`);
              }
            } else {
              this.logger.error(`Failed to fetch full contacts for financial sync: ${bulkErr}`);
            }
          }

          const xeroContactMap = new Map<string, any>();
          for (const xc of allFullContacts) {
            if (xc.contactID) {
              xeroContactMap.set(xc.contactID, xc);
            }
          }
          this.logger.log(`Bulk fetched ${allFullContacts.length} full contacts for financial sync (map size: ${xeroContactMap.size})`);

          const safeCreatedGroup = (createdGroup === 'USER' || createdGroup === 'SYSTEM' || createdGroup === 'ADMIN') ? createdGroup : 'SYSTEM';

          for (const mappedContact of mappedWithPt) {
            try {
              const resolvedCsId = await resolveClientSupplierId(mappedContact.pt_contact_id);
              if (!resolvedCsId) {
                this.logger.warn(
                  `Could not resolve client_supplier_id for contact ${mappedContact.contact_name} (pt_contact_id: ${mappedContact.pt_contact_id})`,
                );
                continue;
              }

              const ptAccountDetails = await bankAccountsRepo.find({
                where: { client_supplier_id: resolvedCsId },
              });
              const hasPtAccount = ptAccountDetails && ptAccountDetails.length > 0;

              let xeroFullContact: any = xeroContactMap.get(mappedContact.contact_id) || null;
              let xeroBatchPayments = xeroFullContact?.batchPayments;
              let hasXeroFinancial = !!(
                xeroBatchPayments &&
                (xeroBatchPayments.bankAccountNumber || xeroBatchPayments.bankAccountName)
              );

              if (xeroDetails.sync_contact_financial_to_pt && hasXeroFinancial && !hasPtAccount) {
                try {
                  // Xero stores AU contact bank details as a single concatenated string
                  // in BatchPayments.BankAccountNumber — first 6 digits are the BSB,
                  // the remainder is the account number. There is no separate `code`
                  // field on a Contact's BatchPayments (that exists only on Accounts).
                  const xeroDigits = (xeroBatchPayments.bankAccountNumber || '').replace(/\D/g, '');
                  const bsbParsed = xeroDigits.length >= 6 ? parseInt(xeroDigits.slice(0, 6), 10) || null : null;
                  const acctParsed = xeroDigits.length > 6 ? xeroDigits.slice(6) : (xeroDigits || '');
                  const accountDetail: any = {
                    account_type: 'Cash Account',
                    account_name: xeroBatchPayments.bankAccountName || mappedContact.contact_name,
                    account_number: acctParsed,
                    bsb_number: bsbParsed,
                    company_id: company_id,
                    client_supplier_id: resolvedCsId,
                    status: 'Open',
                    added_by_client_supplier: true,
                    created_by: userId,
                    created_on: new Date(),
                    created_group: safeCreatedGroup,
                    updated_by: userId,
                    updated_on: new Date(),
                    updated_group: safeCreatedGroup,
                  };
                  await this.clientSuppliersDetailsService.insertAccountDetails([accountDetail]);

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 471,
                    dynamic_values: {
                      contact_name: mappedContact.contact_name,
                      account_name: accountDetail.account_name,
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: mappedContact.id,
                      paytradeId: String(mappedContact.pt_contact_id),
                    },
                    reference_id: mappedContact.id,
                    history: [
                      `Financial details synced from Xero for ${mappedContact.contact_name}`,
                      'Sync successful',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: [xeroFullContact],
                    paytrade_records: null,
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                } catch (createErr) {
                  this.logger.error(
                    `Failed to create account details for ${mappedContact.contact_name}: ${createErr}`,
                  );
                }
              } else if (!xeroDetails.sync_contact_financial_to_pt && hasXeroFinancial && !hasPtAccount) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 473,
                  dynamic_values: {
                    contact_name: mappedContact.contact_name,
                    account_name: xeroBatchPayments.bankAccountName || 'Unknown',
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: mappedContact.id,
                    paytradeId: String(mappedContact.pt_contact_id),
                  },
                  reference_id: mappedContact.id,
                  history: [
                    `Financial details found in Xero for ${mappedContact.contact_name} but sync is disabled`,
                  ],
                  important_checks: {},
                  error_message: `Contact ${mappedContact.contact_name} has financial details in Xero (${xeroBatchPayments.bankAccountName || 'Unknown'}) but no account details in PayTrade. Enable financial details sync in settings.`,
                  xero_records: [xeroFullContact],
                  paytrade_records: null,
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              }

              if (xeroDetails.sync_contact_financial_to_xero && hasPtAccount && !hasXeroFinancial) {
                try {
                  const firstAccount = ptAccountDetails[0];
                  // Xero AU expects a single concatenated string: 6-digit BSB
                  // (zero-padded) + account number. No separate `code` field.
                  const bsbDigitsPush = firstAccount.bsb_number
                    ? String(firstAccount.bsb_number).replace(/\D/g, '').padStart(6, '0')
                    : '';
                  const acctDigitsPush = (firstAccount.account_number || '').replace(/\D/g, '');
                  const batchPaymentData = {
                    bankAccountName: firstAccount.account_name || '',
                    bankAccountNumber: `${bsbDigitsPush}${acctDigitsPush}`,
                  };

                  await this.xero.accountingApi.updateContact(
                    xeroDetails.tenant_id,
                    mappedContact.contact_id,
                    {
                      contacts: [{
                        name: mappedContact.contact_name,
                        batchPayments: batchPaymentData,
                      }],
                    },
                  );

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 472,
                    dynamic_values: {
                      contact_name: mappedContact.contact_name,
                      account_name: firstAccount.account_name || '',
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: mappedContact.id,
                      paytradeId: String(mappedContact.pt_contact_id),
                    },
                    reference_id: mappedContact.id,
                    history: [
                      `Financial details synced to Xero for ${mappedContact.contact_name}`,
                      'Sync successful',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: null,
                    paytrade_records: [firstAccount],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                } catch (pushErr) {
                  this.logger.error(
                    `Failed to push financial details to Xero for ${mappedContact.contact_name}: ${pushErr}`,
                  );
                }
              } else if (!xeroDetails.sync_contact_financial_to_xero && hasPtAccount && !hasXeroFinancial) {
                const firstAccount = ptAccountDetails[0];
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 474,
                  dynamic_values: {
                    contact_name: mappedContact.contact_name,
                    account_name: firstAccount.account_name || '',
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: mappedContact.id,
                    paytradeId: String(mappedContact.pt_contact_id),
                  },
                  reference_id: mappedContact.id,
                  history: [
                    `Account details found in PayTrade for ${mappedContact.contact_name} but sync to Xero is disabled`,
                  ],
                  important_checks: {},
                  error_message: `Contact ${mappedContact.contact_name} has account details in PayTrade (${firstAccount.account_name || ''}) but no financial details in Xero. Enable financial details sync in settings.`,
                  xero_records: null,
                  paytrade_records: [firstAccount],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              } else if (hasPtAccount && hasXeroFinancial) {
                const firstAccount = ptAccountDetails[0];
                const ptName = firstAccount.account_name || '';
                const ptNumberDigits = (firstAccount.account_number || '').replace(/\D/g, '');
                const ptBsbDigits = firstAccount.bsb_number
                  ? String(firstAccount.bsb_number).replace(/\D/g, '').padStart(6, '0')
                  : '';
                const xeroName = xeroBatchPayments.bankAccountName || '';
                // Split Xero's concatenated bankAccountNumber: first 6 digits = BSB,
                // remainder = account number.
                const xeroDigits = (xeroBatchPayments.bankAccountNumber || '').replace(/\D/g, '');
                const xeroBsb = xeroDigits.length >= 6 ? xeroDigits.slice(0, 6) : '';
                const xeroNumber = xeroDigits.length > 6 ? xeroDigits.slice(6) : xeroDigits;
                const ptNumber = ptNumberDigits;
                const ptBsb = ptBsbDigits;

                const detailsMatch =
                  ptName === xeroName &&
                  ptNumber === xeroNumber &&
                  ptBsb === xeroBsb;

                if (!detailsMatch) {
                  try {
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      integration_id: xeroDetails.integration_id,
                      log_template_id: 481,
                      dynamic_values: {
                        contact_name: mappedContact.contact_name,
                        pt_account_name: ptName,
                        pt_bsb: ptBsb || 'N/A',
                        pt_account_number: ptNumber || 'N/A',
                        xero_account_name: xeroName,
                        xero_bsb: xeroBsb || 'N/A',
                        xero_account_number: xeroNumber || 'N/A',
                      },
                      project_id: null,
                      contract_id: null,
                      reference: {
                        xeroId: mappedContact.id,
                        paytradeId: String(mappedContact.pt_contact_id),
                      },
                      reference_id: mappedContact.id,
                      history: [
                        `Financial details mismatch detected for ${mappedContact.contact_name}`,
                        'Scheduled sync',
                      ],
                      important_checks: {},
                      error_message: null,
                      xero_records: [xeroFullContact],
                      paytrade_records: [firstAccount],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                  } catch (logErr) {
                    this.logger.error(
                      `Failed to log financial mismatch for ${mappedContact.contact_name}: ${logErr}`,
                    );
                  }
                }
              }
            } catch (financialErr) {
              this.logger.error(
                `Error processing financial details for contact ${mappedContact.contact_name}: ${financialErr}`,
              );
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
              'contact.pt_contact_id::text = c.client_supplier_id::text OR contact.pt_contact_id::text = c.id::text',
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

      if (
        (newData?.length || 0) > 0 ||
        (oldData?.length || 0) > 0 ||
        (syncedData?.length || 0) > 0
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          integration_id: xeroDetails.integration_id,
          log_template_id: 382,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xero_record_count: allXeroContacts?.length || 0,
            paytrade_record_count: allContacts?.length || 0,
          },
          reference_id: null,
          history: [`API triggered from contact scheduler`, 'Sync successful'],
          important_checks: {},
          error_message: null,
          xero_records: null,
          paytrade_records: null,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        });
      }

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
        const ptId = xeroContactDetails.pt_contact_id;
        const asNum = Number(ptId);
        let clientSupplierDetails: any = null;
        if (!isNaN(asNum) && Number.isInteger(asNum)) {
          clientSupplierDetails = await this.xeroContactsService.getClientSuppliersDetails(asNum);
        } else {
          clientSupplierDetails = await this.xeroContactDetails.manager
            .getRepository(ClientSuppliersDetails)
            .findOne({ where: { id: String(ptId) } });
        }
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

      let projectIdsInDb = [];
      let existingProjectIds = new Set<string>();
      let existingProjectIdsSet = new Set<string>();
      let unFoundProjectIdsInDb = [];

      if (existingXeroProjects.length > 0) {
        projectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            project_id: In(existingXeroProjects),
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id'],
        });
        existingProjectIds = new Set(
          projectIdsInDb.map((p) => p.project_id),
        );
        existingProjectIdsSet = new Set(existingProjectIds);

        unFoundProjectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            project_id: Not(In(existingXeroProjects)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id', 'pt_project_id', 'project_name'],
        });
      } else {
        unFoundProjectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id', 'pt_project_id', 'project_name'],
        });
      }

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

      if (
        (newData?.length || 0) > 0 ||
        (oldData?.length || 0) > 0 ||
        (syncedData?.length || 0) > 0
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 396,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xero_record_count: projects?.length || 0,
            paytrade_record_count: allProjects?.length || 0,
          },
          reference_id: null,
          history: [`API triggered from project scheduler`, 'Sync successful'],
          important_checks: {
            'Import tracking id validation': 'Ok',
            'Import data format validation': 'Ok',
          },
          error_message: null,
          xero_records: null,
          paytrade_records: null,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        });
      }

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
        this.logger.log(`refreshContracts: contract_category_id not configured (optional) — skipping contract tracking refresh for company ${company_id}.`);
        return true;
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

      let contractIdsInDb = [];
      let existingContractIds = new Set<string>();
      let existingContractIdsSet = new Set<string>();
      let unFoundContractIdsInDb = [];

      if (existingXeroContracts.length > 0) {
        contractIdsInDb = await this.xeroContractDetails.find({
          where: {
            contract_id: In(existingXeroContracts),
            integration_id: xeroDetails.integration_id,
          },
          select: ['contract_id'],
        });
        existingContractIds = new Set(
          contractIdsInDb.map((c) => c.contract_id),
        );
        existingContractIdsSet = new Set(existingContractIds);

        unFoundContractIdsInDb = await this.xeroContractDetails.find({
          where: {
            contract_id: Not(In(existingXeroContracts)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['contract_id', 'pt_contract_id', 'contract_name'],
        });
      } else {
        unFoundContractIdsInDb = await this.xeroContractDetails.find({
          where: {
            integration_id: xeroDetails.integration_id,
          },
          select: ['contract_id', 'pt_contract_id', 'contract_name'],
        });
      }

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

      if (
        (newData?.length || 0) > 0 ||
        (oldData?.length || 0) > 0 ||
        (syncedData?.length || 0) > 0
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 405,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xero_record_count: contracts?.length || 0,
            paytrade_record_count: allContracts?.length || 0,
          },
          reference_id: null,
          history: [`API triggered from contract scheduler`, 'Sync successful'],
          important_checks: {
            'Import tracking id validation': 'Ok',
            'Import data format validation': 'Ok',
          },
          error_message: null,
          xero_records: null,
          paytrade_records: null,
          new_records: newData,
          updated_records: oldData,
          synced_records: syncedData,
        });
      }

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

      // Per-invoice sync logs are already written inside createClaimInPaytrade for
      // every processed invoice (template IDs 412+). The previous unconditional
      // template-411 summary row was duplicative and fired on every scheduler tick
      // for any tenant with at least one SUBMITTED/AUTHORISED/PAID invoice, so it
      // has been removed to stop bloating xero_sync_logs with no-op summaries.

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

  async manualSyncContactFinancialDetails(
    decoded: any,
    company_id: number,
  ): Promise<{ synced_to_pt: number; synced_to_xero: number; skipped: number; errors: number; mismatches: number }> {
    const result = { synced_to_pt: 0, synced_to_xero: 0, skipped: 0, errors: 0, mismatches: 0 };

    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });

    if (!xeroDetails) {
      throw new Error('No active Xero integration found for this company');
    }

    const bankAccountsRepo = this.xeroContactDetails.manager.getRepository(BankAccounts);
    const csRepo = this.xeroContactDetails.manager.getRepository(ClientSuppliersDetails);

    const mappedContactsForFinancial = await this.xeroContactDetails.find({
      where: {
        integration_id: xeroDetails.integration_id,
        contact_status: 'ACTIVE',
      },
    });
    const mappedWithPt = mappedContactsForFinancial.filter(c => c.pt_contact_id);

    const resolveClientSupplierId = async (ptContactId: any): Promise<number | null> => {
      const asNum = Number(ptContactId);
      if (!isNaN(asNum) && Number.isInteger(asNum)) {
        return asNum;
      }
      const csRecord = await csRepo.findOne({
        where: { id: String(ptContactId) },
        select: ['client_supplier_id'],
      });
      return csRecord?.client_supplier_id ?? null;
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    let allXeroContacts: any[] = [];
    try {
      const xeroContactsResp = await this.xero.accountingApi.getContacts(
        xeroDetails.tenant_id,
      );
      allXeroContacts = xeroContactsResp?.body?.contacts || [];
    } catch (fetchErr: any) {
      if (fetchErr?.response?.statusCode === 429 || fetchErr?.statusCode === 429) {
        const retryAfter = parseInt(fetchErr?.response?.headers?.['retry-after'] || '60', 10);
        this.logger.warn(`Xero rate limit on bulk contacts fetch, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        try {
          const retryResp = await this.xero.accountingApi.getContacts(xeroDetails.tenant_id);
          allXeroContacts = retryResp?.body?.contacts || [];
        } catch (retryErr) {
          this.logger.error(`Failed to fetch Xero contacts after retry: ${retryErr}`);
          throw new Error('Unable to fetch contacts from Xero. Please try again later.');
        }
      } else {
        throw fetchErr;
      }
    }

    const xeroContactMap = new Map<string, any>();
    for (const xc of allXeroContacts) {
      if (xc.contactID) {
        xeroContactMap.set(xc.contactID, xc);
      }
    }

    const userId = decoded ? decoded.userId : null;
    const rawCreatedGroup = decoded ? 'USER' : 'SYSTEM';
    const createdGroup = (rawCreatedGroup === 'USER' || rawCreatedGroup === 'SYSTEM' || rawCreatedGroup === 'ADMIN') ? rawCreatedGroup : 'SYSTEM';

    const contactsNeedingPush: Array<{ mappedContact: any; firstAccount: any; resolvedCsId: number }> = [];

    for (const mappedContact of mappedWithPt) {
      try {
        const resolvedCsId = await resolveClientSupplierId(mappedContact.pt_contact_id);
        if (!resolvedCsId) {
          this.logger.warn(
            `Could not resolve client_supplier_id for contact ${mappedContact.contact_name} (pt_contact_id: ${mappedContact.pt_contact_id})`,
          );
          result.skipped++;
          continue;
        }

        const ptAccountDetails = await bankAccountsRepo.find({
          where: { client_supplier_id: resolvedCsId },
        });
        const hasPtAccount = ptAccountDetails && ptAccountDetails.length > 0;

        let xeroFullContact = xeroContactMap.get(mappedContact.contact_id) || null;
        let xeroBatchPayments = xeroFullContact?.batchPayments;

        if (!xeroBatchPayments && mappedContact.contact_id) {
          try {
            const fullContactResp = await this.xero.accountingApi.getContact(
              xeroDetails.tenant_id,
              mappedContact.contact_id,
            );
            xeroFullContact = fullContactResp?.body?.contacts?.[0] || xeroFullContact;
            xeroBatchPayments = xeroFullContact?.batchPayments;
          } catch (fetchErr: any) {
            if (fetchErr?.response?.statusCode === 429 || fetchErr?.statusCode === 429) {
              const retryAfter = parseInt(fetchErr?.response?.headers?.['retry-after'] || '5', 10);
              await delay(retryAfter * 1000);
              try {
                const retryResp = await this.xero.accountingApi.getContact(
                  xeroDetails.tenant_id,
                  mappedContact.contact_id,
                );
                xeroFullContact = retryResp?.body?.contacts?.[0] || xeroFullContact;
                xeroBatchPayments = xeroFullContact?.batchPayments;
              } catch (retryErr) {
                this.logger.warn(
                  `Failed to fetch contact ${mappedContact.contact_name} after rate-limit retry: ${retryErr}`,
                );
              }
            } else {
              this.logger.warn(
                `Failed to fetch full contact ${mappedContact.contact_name} from Xero: ${fetchErr?.message || fetchErr}`,
              );
            }
          }
        }

        const hasXeroFinancial = !!(
          xeroBatchPayments &&
          (xeroBatchPayments.bankAccountNumber || xeroBatchPayments.bankAccountName)
        );

        if (hasXeroFinancial && !hasPtAccount) {
          try {
            // Xero stores AU contact bank details as a single concatenated string
            // in BatchPayments.BankAccountNumber — first 6 digits are the BSB,
            // the remainder is the account number. There is no separate `code`
            // field on a Contact's BatchPayments (that exists only on Accounts).
            const xeroDigits = (xeroBatchPayments.bankAccountNumber || '').replace(/\D/g, '');
            const bsbParsed = xeroDigits.length >= 6 ? parseInt(xeroDigits.slice(0, 6), 10) || null : null;
            const acctParsed = xeroDigits.length > 6 ? xeroDigits.slice(6) : (xeroDigits || '');
            const accountDetail: any = {
              account_type: 'Cash Account',
              account_name: xeroBatchPayments.bankAccountName || mappedContact.contact_name,
              account_number: acctParsed,
              bsb_number: bsbParsed,
              company_id: company_id,
              client_supplier_id: resolvedCsId,
              status: 'Open',
              added_by_client_supplier: true,
              created_by: userId,
              created_on: new Date(),
              created_group: createdGroup,
              updated_by: userId,
              updated_on: new Date(),
              updated_group: createdGroup,
            };
            await this.clientSuppliersDetailsService.insertAccountDetails([accountDetail]);

            await this.xeroService.insertXeroSyncLogs(decoded, {
              integration_id: xeroDetails.integration_id,
              log_template_id: 471,
              dynamic_values: {
                contact_name: mappedContact.contact_name,
                account_name: accountDetail.account_name,
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: mappedContact.id,
                paytradeId: String(mappedContact.pt_contact_id),
              },
              reference_id: mappedContact.id,
              history: [
                `Financial details synced from Xero for ${mappedContact.contact_name}`,
                'Manual sync',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [xeroFullContact],
              paytrade_records: null,
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            result.synced_to_pt++;
          } catch (createErr) {
            this.logger.error(
              `Failed to create account details for ${mappedContact.contact_name}: ${createErr}`,
            );
            result.errors++;
          }
        } else if (hasPtAccount && !hasXeroFinancial) {
          contactsNeedingPush.push({
            mappedContact,
            firstAccount: ptAccountDetails[0],
            resolvedCsId,
          });
        } else if (hasPtAccount && hasXeroFinancial) {
          const firstAccount = ptAccountDetails[0];
          const ptName = firstAccount.account_name || '';
          const ptNumberDigits = (firstAccount.account_number || '').replace(/\D/g, '');
          const ptBsbDigits = firstAccount.bsb_number
            ? String(firstAccount.bsb_number).replace(/\D/g, '').padStart(6, '0')
            : '';
          const xeroName = xeroBatchPayments.bankAccountName || '';
          // Split Xero's concatenated bankAccountNumber: first 6 digits = BSB,
          // remainder = account number.
          const xeroDigits = (xeroBatchPayments.bankAccountNumber || '').replace(/\D/g, '');
          const xeroBsb = xeroDigits.length >= 6 ? xeroDigits.slice(0, 6) : '';
          const xeroNumber = xeroDigits.length > 6 ? xeroDigits.slice(6) : xeroDigits;
          const ptNumber = ptNumberDigits;
          const ptBsb = ptBsbDigits;

          const detailsMatch =
            ptName === xeroName &&
            ptNumber === xeroNumber &&
            ptBsb === xeroBsb;

          if (!detailsMatch) {
            try {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                integration_id: xeroDetails.integration_id,
                log_template_id: 481,
                dynamic_values: {
                  contact_name: mappedContact.contact_name,
                  pt_account_name: ptName,
                  pt_bsb: ptBsb || 'N/A',
                  pt_account_number: ptNumber || 'N/A',
                  xero_account_name: xeroName,
                  xero_bsb: xeroBsb || 'N/A',
                  xero_account_number: xeroNumber || 'N/A',
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: mappedContact.id,
                  paytradeId: String(mappedContact.pt_contact_id),
                },
                reference_id: mappedContact.id,
                history: [
                  `Financial details mismatch detected for ${mappedContact.contact_name}`,
                  'Manual sync',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [xeroFullContact],
                paytrade_records: [firstAccount],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            } catch (logErr) {
              this.logger.error(
                `Failed to log financial mismatch for ${mappedContact.contact_name}: ${logErr}`,
              );
            }
            result.mismatches++;
          } else {
            result.skipped++;
          }
        } else {
          result.skipped++;
        }
      } catch (contactErr) {
        this.logger.error(
          `Error processing contact financial sync for ${mappedContact.contact_name}: ${contactErr}`,
        );
        result.errors++;
      }
    }

    for (const { mappedContact, firstAccount } of contactsNeedingPush) {
      try {
        // Xero AU expects a single concatenated string: 6-digit BSB
        // (zero-padded) + account number. No separate `code` field.
        const bsbDigitsPush = firstAccount.bsb_number
          ? String(firstAccount.bsb_number).replace(/\D/g, '').padStart(6, '0')
          : '';
        const acctDigitsPush = (firstAccount.account_number || '').replace(/\D/g, '');
        const batchPaymentData = {
          bankAccountName: firstAccount.account_name || '',
          bankAccountNumber: `${bsbDigitsPush}${acctDigitsPush}`,
        };

        let pushed = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await this.xero.accountingApi.updateContact(
              xeroDetails.tenant_id,
              mappedContact.contact_id,
              {
                contacts: [{
                  name: mappedContact.contact_name,
                  batchPayments: batchPaymentData,
                }],
              },
            );
            pushed = true;
            break;
          } catch (pushErr: any) {
            if (pushErr?.response?.statusCode === 429 || pushErr?.statusCode === 429) {
              const retryAfter = parseInt(pushErr?.response?.headers?.['retry-after'] || '60', 10);
              this.logger.warn(
                `Xero rate limit hit pushing ${mappedContact.contact_name}, waiting ${retryAfter}s...`,
              );
              await delay(retryAfter * 1000);
            } else {
              throw pushErr;
            }
          }
        }

        if (!pushed) {
          this.logger.error(
            `Failed to push financial details to Xero for ${mappedContact.contact_name} after retries`,
          );
          result.errors++;
          continue;
        }

        await delay(700);

        await this.xeroService.insertXeroSyncLogs(decoded, {
          integration_id: xeroDetails.integration_id,
          log_template_id: 472,
          dynamic_values: {
            contact_name: mappedContact.contact_name,
            account_name: firstAccount.account_name || '',
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: mappedContact.id,
            paytradeId: String(mappedContact.pt_contact_id),
          },
          reference_id: mappedContact.id,
          history: [
            `Financial details synced to Xero for ${mappedContact.contact_name}`,
            'Manual sync',
          ],
          important_checks: {},
          error_message: null,
          xero_records: null,
          paytrade_records: [firstAccount],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        result.synced_to_xero++;
      } catch (pushErr) {
        this.logger.error(
          `Failed to push financial details to Xero for ${mappedContact.contact_name}: ${pushErr}`,
        );
        result.errors++;
      }
    }

    return result;
  }

  async manualSyncContactInformation(
    decoded: any,
    company_id: number,
  ): Promise<{ updated: number; skipped: number; errors: number }> {
    const result = { updated: 0, skipped: 0, errors: 0 };

    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });

    if (!xeroDetails) {
      throw new Error('No active Xero integration found for this company');
    }

    const csRepo = this.xeroContactDetails.manager.getRepository(ClientSuppliersDetails);

    const mappedContacts = await this.xeroContactDetails.find({
      where: {
        integration_id: xeroDetails.integration_id,
        contact_status: 'ACTIVE',
      },
    });
    const mappedWithPt = mappedContacts.filter(c => c.pt_contact_id);

    const resolveClientSupplierId = async (ptContactId: any): Promise<number | null> => {
      const asNum = Number(ptContactId);
      if (!isNaN(asNum) && Number.isInteger(asNum)) {
        return asNum;
      }
      const csRecord = await csRepo.findOne({
        where: { id: String(ptContactId) },
        select: ['client_supplier_id'],
      });
      return csRecord?.client_supplier_id ?? null;
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    let allXeroContacts: any[] = [];
    try {
      const xeroContactsResp = await this.xero.accountingApi.getContacts(
        xeroDetails.tenant_id,
      );
      allXeroContacts = xeroContactsResp?.body?.contacts || [];
    } catch (fetchErr: any) {
      if (fetchErr?.response?.statusCode === 429 || fetchErr?.statusCode === 429) {
        const retryAfter = parseInt(fetchErr?.response?.headers?.['retry-after'] || '60', 10);
        this.logger.warn(`Xero rate limit on bulk contacts fetch, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        try {
          const retryResp = await this.xero.accountingApi.getContacts(xeroDetails.tenant_id);
          allXeroContacts = retryResp?.body?.contacts || [];
        } catch (retryErr) {
          this.logger.error(`Failed to fetch Xero contacts after retry: ${retryErr}`);
          throw new Error('Unable to fetch contacts from Xero. Please try again later.');
        }
      } else {
        throw fetchErr;
      }
    }

    const xeroContactMap = new Map<string, any>();
    for (const xc of allXeroContacts) {
      if (xc.contactID) {
        xeroContactMap.set(xc.contactID, xc);
      }
    }

    for (const mappedContact of mappedWithPt) {
      try {
        const resolvedCsId = await resolveClientSupplierId(mappedContact.pt_contact_id);
        if (!resolvedCsId) {
          this.logger.warn(
            `[ContactInfoSync] Could not resolve client_supplier_id for ${mappedContact.contact_name} (pt_contact_id: ${mappedContact.pt_contact_id})`,
          );
          result.skipped++;
          continue;
        }

        const xeroContact = xeroContactMap.get(mappedContact.contact_id);
        if (!xeroContact) {
          this.logger.warn(
            `[ContactInfoSync] Xero contact not found for ${mappedContact.contact_name} (${mappedContact.contact_id})`,
          );
          result.skipped++;
          continue;
        }

        const ptContact = await csRepo.findOne({
          where: { client_supplier_id: resolvedCsId },
        });
        if (!ptContact) {
          result.skipped++;
          continue;
        }

        const xeroAddress =
          xeroContact.addresses?.find((a: any) => a.addressType === 'POBOX') ||
          xeroContact.addresses?.find((a: any) => a.addressType === 'STREET');
        const xeroPhone =
          xeroContact.phones?.find((p: any) => p.phoneType === 'MOBILE') ||
          xeroContact.phones?.find((p: any) => p.phoneType === 'DEFAULT');

        const newAddress = xeroAddress?.addressLine1 || '';
        const newCountry = xeroAddress?.country || '';
        const newPhone = xeroPhone?.phoneNumber || '';
        const newEmail = xeroContact.emailAddress || '';

        const addressChanged = newAddress && newAddress !== (ptContact.client_supplier_address || '');
        const countryChanged = newCountry && newCountry !== (ptContact.country || '');
        const phoneChanged = newPhone && newPhone !== (ptContact.client_phone_no || '');
        const emailChanged = newEmail && newEmail !== (ptContact.client_email_id || '');

        if (!addressChanged && !countryChanged && !phoneChanged && !emailChanged) {
          result.skipped++;
          continue;
        }

        const updatePayload: any = {};
        if (addressChanged) updatePayload.client_supplier_address = newAddress;
        if (countryChanged) updatePayload.country = newCountry;
        if (phoneChanged) updatePayload.client_phone_no = newPhone;
        if (emailChanged) updatePayload.client_email_id = newEmail;

        await csRepo.update(
          { client_supplier_id: resolvedCsId },
          updatePayload,
        );

        const changedFields: string[] = [];
        if (addressChanged) changedFields.push(`Address: "${newAddress}"`);
        if (countryChanged) changedFields.push(`Country: "${newCountry}"`);
        if (phoneChanged) changedFields.push(`Phone: "${newPhone}"`);
        if (emailChanged) changedFields.push(`Email: "${newEmail}"`);

        await this.xeroService.insertXeroSyncLogs(decoded, {
          integration_id: xeroDetails.integration_id,
          log_template_id: 383,
          dynamic_values: {
            contact_name: mappedContact.contact_name,
            fields_updated: changedFields.join(', '),
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: mappedContact.id,
            paytradeId: String(mappedContact.pt_contact_id),
          },
          reference_id: mappedContact.id,
          history: [
            `Contact information synced from Xero for ${mappedContact.contact_name}`,
            `Updated: ${changedFields.join(', ')}`,
            'Manual sync',
          ],
          important_checks: {},
          error_message: null,
          xero_records: [{
            address: newAddress,
            country: newCountry,
            phone: newPhone,
            email: newEmail,
          }],
          paytrade_records: [{
            address: ptContact.client_supplier_address,
            country: ptContact.country,
            phone: ptContact.client_phone_no,
            email: ptContact.client_email_id,
          }],
          new_records: null,
          updated_records: updatePayload,
          synced_records: null,
        });

        result.updated++;
        await delay(200);
      } catch (contactErr: any) {
        this.logger.error(
          `[ContactInfoSync] Error syncing ${mappedContact.contact_name}: ${contactErr?.message || contactErr}`,
        );
        result.errors++;
      }
    }

    return result;
  }

  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async webhookFallbackSync() {
    const PREFIX = '[WEBHOOK_FALLBACK]';
    try {
      this.logger.log(`${PREFIX} Starting webhook fallback sync...`);

      const activeIntegrations = await this.integrationDetails.find({
        where: { integration_status: 'Connected - active' },
      });

      if (!activeIntegrations || activeIntegrations.length === 0) {
        this.logger.log(`${PREFIX} No active integrations found, skipping.`);
        return;
      }

      for (const integration of activeIntegrations) {
        const companyId = integration.company_id;
        try {
          // Multi-row tenant guard. The Task #42 re-OAuth flow can leave
          // an orphan xero_integration_details row alongside the live one
          // (both with status='ACTIVE'). A bare findOne returns whichever
          // the DB orders first — typically the orphan — and any
          // subsequent getInvoice call uses the orphan's stale tenant
          // binding, producing a phantom 403 even though the live
          // integration is healthy. Pull all candidates and prefer the
          // one whose parent integration is 'Connected - active'.
          const _xeroCandidates = await this.xeroIntegrationDetails.find({
            where: { company_id: companyId, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const xeroDetails =
            _xeroCandidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ?? _xeroCandidates[0];

          if (!xeroDetails) {
            this.logger.log(`${PREFIX} No active Xero details for company ${companyId}, skipping.`);
            continue;
          }
          if (_xeroCandidates.length > 1) {
            this.logger.warn(
              `${PREFIX} Company ${companyId}: ${_xeroCandidates.length} ACTIVE xero_integration_details rows found — selected integration_id=${xeroDetails.integration_id} (Connected - active preferred). Orphan rows should be cleaned up.`,
            );
          }

          try {
            await this.xeroService.refreshTokenSet(companyId, this.xero);
          } catch (refreshErr) {
            this.logger.error(`${PREFIX} Token refresh failed for company ${companyId}: ${refreshErr?.message || refreshErr}`);
            continue;
          }

          // Re-read using the same multi-row guard so we get the freshly
          // refreshed token from the *correct* row, not an orphan that
          // refreshTokenSet didn't touch.
          const _refreshedCandidates = await this.xeroIntegrationDetails.find({
            where: { company_id: companyId, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const refreshedXero =
            _refreshedCandidates.find(
              (c) =>
                c?.integration_id === xeroDetails.integration_id,
            ) ??
            _refreshedCandidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ??
            _refreshedCandidates[0];
          if (!refreshedXero?.access_token) {
            this.logger.error(`${PREFIX} No access token after refresh for company ${companyId}`);
            continue;
          }

          const companyAdmin = await this.userRoles.findOne({
            where: {
              company_id: companyId,
              company_role: In(['PRIMARY ADMIN']),
              status: 'Active',
            },
            relations: ['userDetails'],
          });

          if (!companyAdmin?.userDetails?.email_id) {
            this.logger.error(`${PREFIX} No admin found for company ${companyId}`);
            continue;
          }

          const authResponse = await this.authService.getAuthToken(
            companyAdmin.userDetails.email_id,
            false,
          );
          const decoded = this.jwtService.decode(authResponse.data['access_token']);

          const sinceMoment = moment().subtract(2, 'hours');
          const sinceDate = sinceMoment.toDate();
          this.logger.log(`${PREFIX} Company ${companyId}: checking invoices modified since ${sinceMoment.toISOString()}`);

          let xeroInvoices: any[] = [];
          try {
            const invoiceResp = await this.xero.accountingApi.getInvoices(
              refreshedXero.tenant_id,
              sinceDate,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
            );
            xeroInvoices = invoiceResp?.body?.invoices || [];
          } catch (apiErr) {
            this.logger.error(`${PREFIX} Failed to fetch invoices for company ${companyId}: ${apiErr?.message || apiErr}`);
          }

          this.logger.log(`${PREFIX} Company ${companyId}: found ${xeroInvoices.length} recently modified invoices`);

          if (xeroInvoices.length > 0) {
            const xeroInvoiceIds = xeroInvoices.map((inv: any) => inv.invoiceID);

            const existingRecords = await this.xeroInvoicesBillsRepo.find({
              where: {
                invoice_id: In(xeroInvoiceIds),
                integration_id: refreshedXero.integration_id,
              },
              select: [
                'invoice_id',
                'updated_on',
                'last_fetched_at',
                'cached_pdf_object_key',
              ],
            });

            type FreshnessRow = {
              updated_on: Date;
              last_fetched_at: Date | null;
              has_cached_pdf: boolean;
            };
            const existingMap = new Map<string, FreshnessRow>();
            for (const rec of existingRecords) {
              existingMap.set(rec.invoice_id, {
                updated_on: rec.updated_on,
                last_fetched_at: rec.last_fetched_at || null,
                has_cached_pdf: !!rec.cached_pdf_object_key,
              });
            }

            let processedCount = 0;
            let skippedCount = 0;

            for (const invoice of xeroInvoices) {
              const invoiceId = invoice.invoiceID;
              const xeroUpdatedDate = invoice.updatedDateUTC
                ? new Date(invoice.updatedDateUTC)
                : null;

              const ptRecord = existingMap.get(invoiceId);

              if (ptRecord && xeroUpdatedDate) {
                const ptTime = new Date(ptRecord.updated_on).getTime();
                const xeroTime = xeroUpdatedDate.getTime();
                const rowFresh = xeroTime <= ptTime + 60000;
                // PDF freshness: stale if no cached PDF, or Xero has been
                // modified since we last fetched the PDF (with 60s skew).
                const lastFetchedTime = ptRecord.last_fetched_at
                  ? new Date(ptRecord.last_fetched_at).getTime()
                  : 0;
                const pdfFresh =
                  ptRecord.has_cached_pdf &&
                  lastFetchedTime > 0 &&
                  xeroTime <= lastFetchedTime + 60000;
                if (rowFresh && pdfFresh) {
                  skippedCount++;
                  continue;
                }
              } else if (ptRecord && !xeroUpdatedDate) {
                // No Xero update timestamp: only skip if we already have a
                // cached PDF, otherwise we still need to fetch one.
                if (ptRecord.has_cached_pdf) {
                  skippedCount++;
                  continue;
                }
              }

              const isNew = !ptRecord;
              this.logger.log(
                `${PREFIX} Company ${companyId}: ${isNew ? 'NEW' : 'UPDATED'} invoice gap detected: ${invoiceId} (${invoice.type || 'unknown type'})`
              );

              try {
                await this.xeroWebhookService.handleInvoiceCreateUpdate(
                  {
                    resource_id: invoiceId,
                    tenant_id: refreshedXero.tenant_id,
                    eventType: isNew ? 'CREATE' : 'UPDATE',
                    sync_run_type: 'fallback',
                  },
                  decoded,
                );
                processedCount++;
              } catch (procErr) {
                this.logger.error(
                  `${PREFIX} Company ${companyId}: Failed to process invoice ${invoiceId}: ${procErr?.message || procErr}`
                );
              }
            }

            this.logger.log(
              `${PREFIX} Company ${companyId}: invoices done. Processed=${processedCount}, Skipped=${skippedCount}, Total=${xeroInvoices.length}`
            );
          }

          let xeroContacts: any[] = [];
          try {
            const contactSinceDate = new Date(sinceMoment.valueOf());
            const contactResp = await this.xero.accountingApi.getContacts(
              refreshedXero.tenant_id,
              contactSinceDate,
            );
            xeroContacts = contactResp?.body?.contacts || [];
          } catch (apiErr) {
            this.logger.error(`${PREFIX} Failed to fetch contacts for company ${companyId}: ${apiErr?.message || apiErr}`);
          }

          this.logger.log(`${PREFIX} Company ${companyId}: found ${xeroContacts.length} recently modified contacts`);

          if (xeroContacts.length > 0) {
            const existingMappedContacts = await this.xeroContactDetails.find({
              where: {
                integration_id: refreshedXero.integration_id,
                contact_status: 'ACTIVE',
              },
              select: ['contact_id', 'updated_on'],
            });

            const contactMap = new Map<string, Date>();
            for (const mc of existingMappedContacts) {
              contactMap.set(mc.contact_id, mc.updated_on);
            }

            let contactProcessed = 0;
            let contactSkipped = 0;

            for (const contact of xeroContacts) {
              const contactId = contact.contactID;
              const xeroUpdatedDate = contact.updatedDateUTC
                ? new Date(contact.updatedDateUTC)
                : null;

              const ptContactRecord = contactMap.get(contactId);

              if (ptContactRecord && xeroUpdatedDate) {
                const ptTime = new Date(ptContactRecord).getTime();
                const xeroTime = xeroUpdatedDate.getTime();
                if (xeroTime <= ptTime + 60000) {
                  contactSkipped++;
                  continue;
                }
              } else if (ptContactRecord && !xeroUpdatedDate) {
                contactSkipped++;
                continue;
              }

              this.logger.log(
                `${PREFIX} Company ${companyId}: contact gap detected: ${contactId} (${contact.name || 'unknown'})`
              );

              try {
                await this.xeroWebhookService.handleContactCreateUpdate(
                  contactId,
                  refreshedXero.tenant_id,
                  '',
                  {},
                  decoded,
                );
                contactProcessed++;
              } catch (procErr) {
                this.logger.error(
                  `${PREFIX} Company ${companyId}: Failed to process contact ${contactId}: ${procErr?.message || procErr}`
                );
              }
            }

            this.logger.log(
              `${PREFIX} Company ${companyId}: contacts done. Processed=${contactProcessed}, Skipped=${contactSkipped}, Total=${xeroContacts.length}`
            );
          }

        } catch (companyErr) {
          this.logger.error(`${PREFIX} Error processing company ${companyId}: ${companyErr?.message || companyErr}`);
        }
      }

      this.logger.log(`${PREFIX} Webhook fallback sync complete.`);
    } catch (err) {
      this.logger.error(`${PREFIX} Fatal error in webhook fallback sync: ${err?.message || err}`);
    }
  }

  /**
   * Task #53 — Daily retro re-check of legacy unmatched retention
   * transfers. Walks `xero_payments` rows with payment_id IS NOT NULL
   * AND bank_transfer_id IS NULL created in the last 90 days, and
   * retriggers the invoice handler so the Task #50 tightened matcher
   * (extracted into `XeroWebhookService.matchRetentionTransferCandidates`)
   * gets a chance to link the missing leg against fresh Xero data.
   *
   * Successes get template 488 logs (or no log if linked silently);
   * out-of-window candidates surface template 489; multi-match surfaces
   * template 490. All re-runs use `sync_run_type='retro_recheck'` so
   * they're distinguishable from webhook/fallback runs.
   *
   * Behind a per-company feature flag
   * (`xero_integration_details.auto_recheck_unmatched_retention_transfers`,
   * default true). Set FALSE to opt a company out.
   */
  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async recheckUnmatchedRetentionTransfers() {
    const PREFIX = '[Task#53 retro_recheck]';
    try {
      this.logger.log(`${PREFIX} Starting legacy retention re-check sweep...`);

      const activeIntegrations = await this.integrationDetails.find({
        where: { integration_status: 'Connected - active' },
      });

      if (!activeIntegrations || activeIntegrations.length === 0) {
        this.logger.log(`${PREFIX} No active integrations, skipping.`);
        return;
      }

      const cutoff = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      );

      for (const integration of activeIntegrations) {
        const companyId = integration.company_id;
        try {
          // Multi-row tenant guard (mirrors webhookFallbackSync).
          const _xeroCandidates = await this.xeroIntegrationDetails.find({
            where: { company_id: companyId, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const xeroDetails =
            _xeroCandidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ?? _xeroCandidates[0];
          if (!xeroDetails) {
            continue;
          }

          // Per-company feature flag — null/undefined treated as ON
          // (default), only an explicit FALSE opts the company out.
          if (xeroDetails.auto_recheck_unmatched_retention_transfers === false) {
            this.logger.log(
              `${PREFIX} Company ${companyId}: feature flag OFF, skipping.`,
            );
            continue;
          }

          const candidateRows = await this.xeroPaymentsRepo.find({
            where: {
              integration_id: xeroDetails.integration_id,
              payment_id: Not(IsNull()),
              bank_transfer_id: IsNull(),
              status: Not('DELETED'),
              created_on: MoreThanOrEqual(cutoff),
            },
            order: { created_on: 'DESC' },
          });

          if (candidateRows.length === 0) {
            continue;
          }

          this.logger.log(
            `${PREFIX} Company ${companyId}: ${candidateRows.length} candidate xero_payments rows missing bank_transfer_id`,
          );

          // Refresh token + decoded JWT once per company.
          try {
            await this.xeroService.refreshTokenSet(companyId, this.xero);
          } catch (refreshErr: any) {
            this.logger.error(
              `${PREFIX} Token refresh failed for company ${companyId}: ${refreshErr?.message || refreshErr}`,
            );
            continue;
          }

          const _refreshedCandidates = await this.xeroIntegrationDetails.find({
            where: { company_id: companyId, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const refreshedXero =
            _refreshedCandidates.find(
              (c) => c?.integration_id === xeroDetails.integration_id,
            ) ??
            _refreshedCandidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ??
            _refreshedCandidates[0];
          if (!refreshedXero?.access_token) {
            this.logger.error(
              `${PREFIX} No access token after refresh for company ${companyId}`,
            );
            continue;
          }

          const companyAdmin = await this.userRoles.findOne({
            where: {
              company_id: companyId,
              company_role: In(['PRIMARY ADMIN']),
              status: 'Active',
            },
            relations: ['userDetails'],
          });
          if (!companyAdmin?.userDetails?.email_id) {
            this.logger.error(
              `${PREFIX} No PRIMARY ADMIN for company ${companyId}, skipping.`,
            );
            continue;
          }

          const authResponse = await this.authService.getAuthToken(
            companyAdmin.userDetails.email_id,
            false,
          );
          const decoded = this.jwtService.decode(
            authResponse.data['access_token'],
          );

          // Resolve the underlying Xero invoice IDs for the candidate
          // payments — we retrigger the invoice handler (rather than
          // calling the matcher directly) so the row gets re-linked
          // through the same code path the webhook would use.
          const ptInvoiceRowIds = Array.from(
            new Set(
              candidateRows
                .map((r) => r.invoice_id)
                .filter((v): v is string => !!v),
            ),
          );
          if (ptInvoiceRowIds.length === 0) {
            continue;
          }

          const invoiceRows = await this.xeroInvoicesBillsRepo.find({
            where: {
              id: In(ptInvoiceRowIds),
              integration_id: refreshedXero.integration_id,
            },
            select: ['invoice_id'],
          });
          const xeroInvoiceIds = Array.from(
            new Set(
              invoiceRows
                .map((r) => r.invoice_id)
                .filter((v): v is string => !!v),
            ),
          );

          let processed = 0;
          let errors = 0;
          for (const xeroInvoiceId of xeroInvoiceIds) {
            try {
              await this.xeroWebhookService.handleInvoiceCreateUpdate(
                {
                  resource_id: xeroInvoiceId,
                  tenant_id: refreshedXero.tenant_id,
                  eventType: 'UPDATE',
                  sync_run_type: 'retro_recheck',
                },
                decoded,
              );
              processed++;
            } catch (procErr: any) {
              errors++;
              this.logger.error(
                `${PREFIX} Company ${companyId}: failed to re-process invoice ${xeroInvoiceId}: ${procErr?.message || procErr}`,
              );
            }
          }

          this.logger.log(
            `${PREFIX} Company ${companyId}: processed=${processed} errors=${errors} (from ${candidateRows.length} candidate xero_payments rows / ${xeroInvoiceIds.length} unique invoices)`,
          );
        } catch (companyErr: any) {
          this.logger.error(
            `${PREFIX} Error processing company ${companyId}: ${companyErr?.message || companyErr}`,
          );
        }
      }

      this.logger.log(`${PREFIX} Legacy retention re-check sweep complete.`);
    } catch (err: any) {
      this.logger.error(
        `${PREFIX} Fatal error in retro re-check sweep: ${err?.message || err}`,
      );
    }
  }
}
