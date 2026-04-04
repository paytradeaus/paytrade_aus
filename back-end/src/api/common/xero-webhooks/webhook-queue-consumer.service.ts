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

@Injectable()
export class XeroWebhookQueueConsumer implements OnModuleInit {
  private logger: PaytradeLogger;
  private redis: Redis;
  private isProcessing = false;

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

      this.logger.log(`Initialized (NODE_ENV=${process.env.NODE_ENV || 'not set'})`);
    } catch (err) {
      this.logger.error(`Failed to initialize: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (!this.redis || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const queueLength = await this.redis.llen('xero_webhook_queue');
      if (queueLength === 0) {
        return;
      }

      this.logger.log(`[POLL] Found ${queueLength} event(s) in queue`);

      const peekValue = await this.redis.lindex('xero_webhook_queue', -1);
      this.logger.log(`[PEEK] Last element — type=${typeof peekValue}, length=${peekValue?.length ?? 'null'}, value=${peekValue ? peekValue.substring(0, 300) : 'NULL'}`);

      let processed = 0;
      const maxBatch = 10;

      while (processed < maxBatch) {
        this.logger.log(`[RPOP] Attempting rpop (iteration ${processed + 1})...`);
        const eventJson = await this.redis.rpop('xero_webhook_queue');
        this.logger.log(`[RPOP] Result — type=${typeof eventJson}, value=${eventJson === null ? 'null' : eventJson === undefined ? 'undefined' : eventJson === '' ? 'EMPTY_STRING' : eventJson.substring(0, 300)}`);

        if (!eventJson) {
          if (processed === 0) {
            this.logger.warn(`[RPOP] Returned falsy after llen=${queueLength}. Checking queue again...`);
            const recheckLen = await this.redis.llen('xero_webhook_queue');
            this.logger.warn(`[RPOP] Queue length after failed rpop: ${recheckLen}`);
            const keyType = await this.redis.type('xero_webhook_queue');
            this.logger.warn(`[RPOP] Key type: ${keyType}`);
            if (recheckLen > 0) {
              this.logger.warn(`[FALLBACK] Attempting lindex+lrem...`);
              try {
                const fallbackValue = await this.redis.lindex('xero_webhook_queue', -1);
                this.logger.log(`[FALLBACK] lindex result — type=${typeof fallbackValue}, value=${fallbackValue ? fallbackValue.substring(0, 300) : 'NULL'}`);
                if (fallbackValue) {
                  const removeCount = await this.redis.lrem('xero_webhook_queue', -1, fallbackValue);
                  this.logger.log(`[FALLBACK] lrem removed ${removeCount} element(s)`);
                  if (removeCount > 0) {
                    processed++;
                    try {
                      const event = JSON.parse(fallbackValue);
                      this.logger.log(`[FALLBACK] Parsed event: ${JSON.stringify(event)}`);
                      await this.processEvent(event);
                    } catch (parseErr) {
                      this.logger.error(`[FALLBACK] Failed to process: ${parseErr.message}`);
                    }
                  }
                }
              } catch (fallbackErr) {
                this.logger.error(`[FALLBACK] Failed: ${fallbackErr.message}`);
              }
            }
          }
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

      this.logger.log(`[DONE] Processed ${processed} event(s) from queue`);
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
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
      },
      relations: ['integrationDetails'],
    });

    if (!xeroDetails || !xeroDetails.integration_id || !xeroDetails?.integrationDetails) {
      this.logger.error(`[EVENT] No integration found for tenant ${tenantId}`);
      return;
    }

    this.logger.log(`[EVENT] Found integration: id=${xeroDetails.integration_id}, company=${xeroDetails.company_id}, status=${xeroDetails.integrationDetails.integration_status}`);

    if (xeroDetails.integrationDetails.integration_status !== 'Connected - active') {
      this.logger.error(`[EVENT] Integration not active (status=${xeroDetails.integrationDetails.integration_status})`);
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

      default:
        this.logger.log(`[EVENT] Unhandled event: ${eventKey}`);
    }
  }
}
