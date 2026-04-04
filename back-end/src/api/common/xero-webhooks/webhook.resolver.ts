import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { XeroWebhookService } from './webhook.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
dotenv.config();

@Controller('xero-webhook')
export class XeroWebhookResolver {
  private logger: PaytradeLogger;

  constructor(
    private readonly xeroWebhookService: XeroWebhookService,
    private readonly jwtService: JwtService,
    private authService: AuthService,
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
  ) {
    this.logger = new PaytradeLogger('WEBHOOK_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @Post()
  @Public()
  async handleWebhook(@Req() request: Request, @Res() response: Response) {
    const startTime = process.hrtime();
    try {
      this.logger.log('[WEBHOOK_RECV] === Xero direct webhook received ===');
      this.logger.log(`[WEBHOOK_RECV] Headers: ${JSON.stringify(request.headers)}`);
      const rawBodyBuffer = (request as any).rawBody;
      if (!rawBodyBuffer) {
        this.logger.error('[WEBHOOK_RECV] Raw body not found! Returning 401.');
        return response.status(401).send();
      }
      const rawBodyString = rawBodyBuffer.toString('utf8');
      this.logger.log(`[WEBHOOK_RECV] Raw body (length=${rawBodyBuffer.length}): ${rawBodyString.substring(0, 500)}`);

      const signature = Array.isArray(request.headers['x-xero-signature'])
        ? request.headers['x-xero-signature'][0]
        : request.headers['x-xero-signature'];
      this.logger.log(`[WEBHOOK_RECV] x-xero-signature: ${signature}`);
      
      const webhookKey = process.env.XERO_WEBHOOK_KEY?.trim();
      this.logger.log(`[WEBHOOK_RECV] XERO_WEBHOOK_KEY exists: ${!!webhookKey}, length: ${webhookKey?.length || 0}`);
      
      if (!webhookKey) {
        this.logger.error('[WEBHOOK_RECV] XERO_WEBHOOK_KEY not configured! Returning 401.');
        return response.status(401).send();
      }
      
      const computedHmac = crypto
        .createHmac('sha256', webhookKey)
        .update(rawBodyBuffer)
        .digest('base64');
      
      this.logger.log(`[WEBHOOK_RECV] HMAC comparison — match=${signature === computedHmac}`);

      if (!signature || signature !== computedHmac) {
        this.logger.warn('[WEBHOOK_RECV] HMAC verification FAILED — returning 401');
        return response.status(401).send();
      }

      this.logger.log('[WEBHOOK_RECV] HMAC verification OK — returning 200');

      const diff = process.hrtime(startTime);
      this.logger.log(`[WEBHOOK_RECV] Response time: ${diff[0]}s ${diff[1] / 1e6}ms`);
      
      response.status(200).send();

      setImmediate(async () => {
        try {
          const eventPayload = JSON.parse(rawBodyBuffer.toString('utf8'));
          this.logger.log(`[WEBHOOK_RECV] Parsed payload — events count=${eventPayload.events?.length ?? 0}, firstEvent=${eventPayload.events?.length > 0 ? JSON.stringify(eventPayload.events[0]) : 'none'}`);

          if (eventPayload.events?.length > 0) {
            for (let i = 0; i < eventPayload.events.length; i++) {
              const event = eventPayload.events[i];
              const { eventCategory, eventType, resourceId, tenantId } = event;
              this.logger.log(`[WEBHOOK_RECV] Processing event ${i + 1}/${eventPayload.events.length}: ${eventCategory}.${eventType}, resourceId=${resourceId}, tenantId=${tenantId}`);

              this.logger.log(`[WEBHOOK_RECV] Looking up integration for tenant ${tenantId}...`);
              const xeroDetails = await this.xeroIntegrationDetails.findOne({
                where: {
                  tenant_id: tenantId,
                  status: 'ACTIVE',
                },
                relations: ['integrationDetails'],
              });

              if (
                !xeroDetails ||
                !xeroDetails.integration_id ||
                !xeroDetails?.integrationDetails
              ) {
                this.logger.error(`[WEBHOOK_RECV] No integration found for tenant ${tenantId}`);
                throw `No integration found for tenant id: ${tenantId}`;
              }

              this.logger.log(`[WEBHOOK_RECV] Integration found: id=${xeroDetails.integration_id}, company=${xeroDetails.company_id}, status=${xeroDetails.integrationDetails.integration_status}`);

              if (
                xeroDetails.integrationDetails.integration_status !==
                'Connected - active'
              ) {
                this.logger.error(`[WEBHOOK_RECV] Integration not active (status=${xeroDetails.integrationDetails.integration_status})`);
                throw `Paytrade is currently not active in Xero for tenant id: ${tenantId}`;
              }

              const companyId = xeroDetails.company_id;

              this.logger.log(`[WEBHOOK_RECV] Looking up PRIMARY ADMIN for company ${companyId}...`);
              const companyAdmin = await this.userRoles.findOne({
                where: {
                  company_id: companyId,
                  company_role: In(['PRIMARY ADMIN']),
                  status: 'Active',
                },
                relations: ['userDetails'],
              });

              if (!companyAdmin?.userDetails?.email_id) {
                this.logger.error(`[WEBHOOK_RECV] No admin found for company ${companyId}`);
                throw `No admin found for company ${companyId}`;
              }

              this.logger.log(`[WEBHOOK_RECV] Admin found: ${companyAdmin.userDetails.email_id}. Getting auth token...`);
              const authResponse = await this.authService.getAuthToken(
                companyAdmin?.userDetails?.email_id,
                false,
              );

              const decoded = this.jwtService.decode(
                authResponse.data['access_token'],
              );
              this.logger.log(`[WEBHOOK_RECV] Auth token obtained. userId=${(decoded as any)?.userId}`);

              const eventKey = `${eventCategory}.${eventType}`;

              switch (eventKey) {
                case 'CONTACT.CREATE':
                case 'CONTACT.UPDATE':
                  this.logger.log(`[WEBHOOK_RECV] Dispatching to handleContactCreateUpdate...`);
                  await this.xeroWebhookService.handleContactCreateUpdate(
                    resourceId,
                    tenantId,
                    '',
                    {},
                    decoded,
                  );
                  this.logger.log(`[WEBHOOK_RECV] handleContactCreateUpdate completed`);
                  break;

                case 'INVOICE.CREATE':
                case 'INVOICE.UPDATE':
                  this.logger.log(`[WEBHOOK_RECV] Dispatching to handleInvoiceCreateUpdate (type=${eventType})...`);
                  await this.xeroWebhookService.handleInvoiceCreateUpdate(
                    {
                      resource_id: resourceId,
                      tenant_id: tenantId,
                      eventType,
                      sync_run_type: 'webhook',
                    },
                    decoded,
                  );
                  this.logger.log(`[WEBHOOK_RECV] handleInvoiceCreateUpdate completed`);
                  break;

                default:
                  this.logger.log(`[WEBHOOK_RECV] Unhandled event: ${eventKey}`);
              }
            }
          } else {
            this.logger.log('[WEBHOOK_RECV] Intent-to-receive ping (no events)');
          }
        } catch (err) {
          this.logger.error(`[WEBHOOK_RECV] Async processing error: ${err?.message || err}`);
        }
      });
    } catch (err) {
      this.logger.error(`[WEBHOOK_RECV] Top-level error: ${err.message}`);
      return response.status(401).send();
    }
  }
}
