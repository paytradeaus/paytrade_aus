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
    // Only run consumer in production to avoid dev consuming production events
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      this.logger.log('Xero webhook queue consumer disabled in development');
      return;
    }
    
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.logger.log('Xero webhook queue consumer initialized');
    } else {
      this.logger.error('REDIS_URL not configured - webhook queue consumer disabled');
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
        const eventJson = await this.redis.rpop('xero_webhook_queue');
        
        if (!eventJson) {
          break;
        }

        processed++;
        
        try {
          const event = JSON.parse(eventJson);
          await this.processEvent(event);
        } catch (err) {
          this.logger.error(`Failed to process event: ${err.message}`);
        }
      }

      if (processed > 0) {
        this.logger.log(`Processed ${processed} Xero webhook events`);
      }
    } catch (err) {
      this.logger.error(`Queue processing error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: any) {
    const { eventCategory, eventType, resourceId, tenantId } = event;
    this.logger.log(`Processing: ${eventCategory}.${eventType} for tenant ${tenantId}`);

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
      },
      relations: ['integrationDetails'],
    });

    if (!xeroDetails || !xeroDetails.integration_id || !xeroDetails?.integrationDetails) {
      this.logger.error(`No integration found for tenant id: ${tenantId}`);
      return;
    }

    if (xeroDetails.integrationDetails.integration_status !== 'Connected - active') {
      this.logger.error(`Integration not active for tenant id: ${tenantId}`);
      return;
    }

    const companyId = xeroDetails.company_id;

    const companyAdmin = await this.userRoles.findOne({
      where: {
        company_id: companyId,
        company_role: In(['PRIMARY ADMIN']),
        status: 'Active',
      },
      relations: ['userDetails'],
    });

    if (!companyAdmin?.userDetails?.email_id) {
      this.logger.error(`No admin found for company ${companyId}`);
      return;
    }

    const authResponse = await this.authService.getAuthToken(
      companyAdmin.userDetails.email_id,
      false,
    );

    const decoded = this.jwtService.decode(authResponse.data['access_token']);

    const eventKey = `${eventCategory}.${eventType}`;

    switch (eventKey) {
      case 'CONTACT.CREATE':
      case 'CONTACT.UPDATE':
        await this.xeroWebhookService.handleContactCreateUpdate(
          resourceId,
          tenantId,
          '',
          {},
          decoded,
        );
        break;

      case 'INVOICE.CREATE':
      case 'INVOICE.UPDATE':
        await this.xeroWebhookService.handleInvoiceCreateUpdate(
          {
            resource_id: resourceId,
            tenant_id: tenantId,
            eventType,
            sync_run_type: 'webhook',
          },
          decoded,
        );
        break;

      default:
        this.logger.log(`Unhandled event: ${eventKey}`);
    }
  }
}
