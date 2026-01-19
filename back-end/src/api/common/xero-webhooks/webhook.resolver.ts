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
      console.log('[Xero Webhook] Request received.');
      console.log(`[Xero Webhook] Headers: ${JSON.stringify(request.headers)}`);
      const rawBodyBuffer = (request as any).rawBody;
      if (!rawBodyBuffer) {
        console.error('[Xero Webhook] Raw body not found!');
        // Must return 401 for Xero intent-to-receive validation (not 500)
        return response.status(401).send();
      }
      const rawBodyString = rawBodyBuffer.toString('utf8');
      console.log(`[Xero Webhook] Raw Body: ${rawBodyString}`);
      console.log(`[Xero Webhook] Raw Body Length: ${rawBodyBuffer.length}`);

      const signature = Array.isArray(request.headers['x-xero-signature'])
        ? request.headers['x-xero-signature'][0]
        : request.headers['x-xero-signature'];
      console.log(`[Xero Webhook] x-xero-signature: ${signature}`);
      
      const webhookKey = process.env.XERO_WEBHOOK_KEY?.trim();
      console.log(`[Xero Webhook] XERO_WEBHOOK_KEY exists: ${!!webhookKey}, length: ${webhookKey?.length || 0}`);
      
      if (!webhookKey) {
        console.error('[Xero Webhook] XERO_WEBHOOK_KEY not configured!');
        return response.status(401).send();
      }
      
      const computedHmac = crypto
        .createHmac('sha256', webhookKey)
        .update(rawBodyBuffer)
        .digest('base64');
      
      console.log(`[Xero Webhook] Computed HMAC: ${computedHmac}`);
      console.log(`[Xero Webhook] Received signature: ${signature}`);
      console.log(`[Xero Webhook] Signatures match: ${signature === computedHmac}`);

      if (!signature || signature !== computedHmac) {
        console.warn('[Xero Webhook] HMAC verification failed - returning 401 (expected for 3 of 4 intent-to-receive tests)');
        // Xero intent-to-receive sends 3 invalid + 1 valid signature - must return 401 for invalid
        return response.status(401).send();
      }

      console.log('[Xero Webhook] HMAC verification successful - returning 200.');

      const diff = process.hrtime(startTime);
      console.log(`[Xero Webhook] Response Time: ${diff[0]}s ${diff[1] / 1e6}ms`);
      
      // Respond right away with empty body - Xero requires this exact format
      response.status(200).send();

      // Process webhook asynchronously
      setImmediate(async () => {
        try {
          const eventPayload = JSON.parse(rawBodyBuffer.toString('utf8'));

          if (eventPayload.events?.length > 0) {
            for (const event of eventPayload.events) {
              const { eventCategory, eventType, resourceId, tenantId } = event;

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
                console.error(
                  `[Xero Webhook] No integration found for tenant id: ${tenantId}`,
                );
                throw `No integration found for tenant id: ${tenantId}`;
              }

              if (
                xeroDetails.integrationDetails.integration_status !==
                'Connected - active'
              ) {
                console.error(
                  `[Xero Webhook] Paytrade is currently not active in Xero`,
                );
                throw `Paytrade is currently not active in Xero for tenant id: ${tenantId}`;
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

              const authResponse = await this.authService.getAuthToken(
                companyAdmin?.userDetails?.email_id,
                false,
              );

              console.log(authResponse.data['access_token']);
              const decoded = this.jwtService.decode(
                authResponse.data['access_token'],
              );

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
                  console.log(`[Xero Webhook] Unhandled event: ${eventKey}`);
              }
            }
          } else {
            console.log('[Xero Webhook] Intent-to-receive ping, no events.');
          }
        } catch (err) {
          console.error('[Xero Webhook] Async error:', err.message);
        }
      });
    } catch (err) {
      console.error(`[Xero Webhook] Error: ${err.message}`);
      // Return 401 for any errors during intent-to-receive validation
      return response.status(401).send();
    }
  }
}
