import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { XeroWebhookService } from './webhook.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import Redis from 'ioredis';
import { isWebhookProcessableStatus } from './integration-status.constants';

const LEGACY_QUEUE_KEY = 'xero_webhook_queue';

function resolveEnvironment(): string {
  if (process.env.APP_ENVIRONMENT) {
    return process.env.APP_ENVIRONMENT;
  }
  if (process.env.REPL_ID) {
    return process.env.REPLIT_DEPLOYMENT ? 'staging' : 'development';
  }
  return 'production';
}

const ATOMIC_POP_SCRIPT = `
local val = redis.call('rpop', KEYS[1])
if val then return val end
local len = redis.call('llen', KEYS[1])
if len > 0 then
  val = redis.call('lindex', KEYS[1], -1)
  if val then
    redis.call('lrem', KEYS[1], -1, val)
    return val
  end
end
return nil
`;

@Injectable()
export class XeroWebhookQueueConsumer implements OnModuleInit {
  private logger: PaytradeLogger;
  private redis: Redis;
  private isProcessing = false;
  private environment: string;
  private queueKey: string;

  constructor(
    private readonly xeroWebhookService: XeroWebhookService,
    private readonly jwtService: JwtService,
    private authService: AuthService,
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
  ) {
    this.logger = new PaytradeLogger('XERO_WEBHOOK_QUEUE');
    this.environment = resolveEnvironment();
    this.queueKey = `xero_webhook_queue:${this.environment}`;
  }

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured - Xero webhook queue consumer disabled');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) return null;
          return Math.min(times * 1000, 5000);
        },
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.redis.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.redis.defineCommand('atomicPop', {
        numberOfKeys: 1,
        lua: ATOMIC_POP_SCRIPT,
      });

      this.logger.log(
        `Initialized — env=${this.environment}, queue=${this.queueKey}, ` +
        `APP_ENVIRONMENT=${process.env.APP_ENVIRONMENT || '(not set)'}, ` +
        `REPL_ID=${process.env.REPL_ID ? 'yes' : 'no'}, ` +
        `REPLIT_DEPLOYMENT=${process.env.REPLIT_DEPLOYMENT ? 'yes' : 'no'}`,
      );
    } catch (err) {
      this.logger.error(`Failed to initialize: ${err.message}`);
    }
  }

  private async popEvent(key: string): Promise<string | null> {
    try {
      return await (this.redis as any).atomicPop(key) as string | null;
    } catch (luaErr) {
      this.logger.warn(`[ATOMIC_POP] Lua failed for ${key} (${luaErr.message}), using rpop`);
      return await this.redis.rpop(key);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (!this.redis || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      let processed = 0;
      const maxBatch = 10;

      while (processed < maxBatch) {
        let eventJson = await this.popEvent(this.queueKey);

        // Defensive read of the legacy unsuffixed key (`xero_webhook_queue`).
        // Production-only — the Cloudflare relay sample in this repo still
        // LPUSHes there (attached_assets/Pasted--Welcome-to-Cloudflare-Workers...
        // line 84). If the deployed relay was incompletely upgraded, events on
        // the legacy key would otherwise be silently dropped (no consumer).
        if (!eventJson && this.environment === 'production') {
          eventJson = await this.popEvent(LEGACY_QUEUE_KEY);
          if (eventJson) {
            this.logger.warn(
              `[LEGACY_QUEUE] Drained event from unsuffixed key '${LEGACY_QUEUE_KEY}' — relay still pushing to legacy key`,
            );
          }
        }

        if (!eventJson) {
          break;
        }

        processed++;
        this.logger.log(`[DEQUEUED] Event ${processed}: ${eventJson.substring(0, 300)}`);

        try {
          const event = JSON.parse(eventJson);
          this.logger.log(`[PARSED] eventCategory=${event.eventCategory}, eventType=${event.eventType}, resourceId=${event.resourceId}, tenantId=${event.tenantId}`);
          await this.processEvent(event);
        } catch (err) {
          this.logger.error(`[PROCESS_ERROR] Failed to process event: ${err.message}`);
        }
      }

      if (processed > 0) {
        this.logger.log(`[DONE] Processed ${processed} event(s) from queue`);
      }
    } catch (err) {
      this.logger.error(`[QUEUE_ERROR] ${err.message}\n${err.stack}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: any) {
    const { eventCategory, eventType, resourceId, tenantId } = event;
    this.logger.log(`[EVENT] Processing ${eventCategory}.${eventType} | resource=${resourceId} | tenant=${tenantId}`);

    this.logger.log(`[EVENT] Looking up xero integration for tenant ${tenantId}...`);
    // A single Xero tenant can be present in multiple xero_integration_details
    // rows (e.g. an old "pending settings/mapping" row left over from a prior
    // OAuth attempt PLUS the current "Connected - active" row created by the
    // re-auth flow added in Task #42). `findOne` returned whichever the DB
    // ordered first (typically the orphan), causing every webhook to be
    // dropped as "Integration not active". Pull all candidates and prefer
    // the Active one so the live integration always wins.
    const candidates = await this.xeroIntegrationDetails.find({
      where: { tenant_id: tenantId, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    const xeroDetails =
      candidates.find(
        (c) => c?.integrationDetails?.integration_status === 'Connected - active',
      ) ?? candidates[0];

    if (!xeroDetails || !xeroDetails.integration_id || !xeroDetails?.integrationDetails) {
      this.logger.error(`[EVENT] No integration found for tenant ${tenantId}`);
      return;
    }

    this.logger.log(`[EVENT] Found integration: id=${xeroDetails.integration_id}, company=${xeroDetails.company_id}, status=${xeroDetails.integrationDetails.integration_status}`);

    if (!isWebhookProcessableStatus(xeroDetails.integrationDetails.integration_status)) {
      this.logger.error(`[EVENT] Integration not in a processable state (status=${xeroDetails.integrationDetails.integration_status}); event dropped`);
      return;
    }

    const companyId = xeroDetails.company_id;

    this.logger.log(`[EVENT] Looking up PRIMARY ADMIN for company ${companyId}...`);
    const companyAdmin = await this.userRoles.findOne({
      where: {
        company_id: companyId,
        company_role: In(['PRIMARY ADMIN']),
        status: 'Active',
      },
      relations: ['userDetails'],
    });

    if (!companyAdmin?.userDetails?.email_id) {
      this.logger.error(`[EVENT] No admin found for company ${companyId}`);
      return;
    }

    this.logger.log(`[EVENT] Admin found: ${companyAdmin.userDetails.email_id}. Getting auth token...`);
    const authResponse = await this.authService.getAuthToken(
      companyAdmin.userDetails.email_id,
      false,
    );

    const decoded = this.jwtService.decode(authResponse.data['access_token']);
    this.logger.log(`[EVENT] Auth token obtained. userId=${(decoded as any)?.userId}, companyId=${(decoded as any)?.companyId}`);

    const eventKey = `${eventCategory}.${eventType}`;

    switch (eventKey) {
      case 'CONTACT.CREATE':
      case 'CONTACT.UPDATE':
        this.logger.log(`[EVENT] Dispatching to handleContactCreateUpdate...`);
        await this.xeroWebhookService.handleContactCreateUpdate(
          resourceId,
          tenantId,
          '',
          {},
          decoded,
        );
        this.logger.log(`[EVENT] handleContactCreateUpdate completed`);
        break;

      case 'INVOICE.CREATE':
      case 'INVOICE.UPDATE':
        this.logger.log(`[EVENT] Dispatching to handleInvoiceCreateUpdate (type=${eventType})...`);
        await this.xeroWebhookService.handleInvoiceCreateUpdate(
          {
            resource_id: resourceId,
            tenant_id: tenantId,
            eventType,
            sync_run_type: 'webhook',
          },
          decoded,
        );
        this.logger.log(`[EVENT] handleInvoiceCreateUpdate completed`);
        break;

      // Phase 3 — Anti-echo handling for Manual Journals. PayTrade posts
      // gross-up MJs on its own and Xero fans the resulting webhook back at
      // us; without this dispatch any future MANUALJOURNAL processing
      // would treat our own writes as inbound user activity. The handler
      // looks up the manual_journal_id in xero_retention_journals and
      // drops self-echoes.
      case 'MANUALJOURNAL.CREATE':
      case 'MANUALJOURNAL.UPDATE':
        this.logger.log(`[EVENT] Dispatching to handleManualJournalUpdate (type=${eventType})...`);
        await this.xeroWebhookService.handleManualJournalUpdate(
          {
            resource_id: resourceId,
            tenant_id: tenantId,
            eventType,
          },
          decoded,
        );
        this.logger.log(`[EVENT] handleManualJournalUpdate completed`);
        break;

      default:
        this.logger.log(`[EVENT] Unhandled event: ${eventKey}`);
    }
  }
}
