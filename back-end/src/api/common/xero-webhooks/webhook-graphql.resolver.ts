import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { XeroWebhookService } from './webhook.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';

@Resolver()
export class XeroWebhookGraphQLResolver {
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
    this.logger = new PaytradeLogger('XERO_WEBHOOK_GRAPHQL');
  }

  @Mutation(() => String)
  @Public()
  async processXeroWebhook(
    @Args('events') eventsJson: string,
    @Context() context: any,
  ): Promise<string> {
    try {
      const webhookSecret = process.env.WEBHOOK_RELAY_SECRET;
      const requestSecret = context.req?.headers?.['x-webhook-secret'];

      if (!webhookSecret || requestSecret !== webhookSecret) {
        this.logger.error('[Xero GraphQL Webhook] Invalid relay secret');
        return JSON.stringify({ status: 'error', message: 'Unauthorized' });
      }

      this.logger.log('[Xero GraphQL Webhook] Processing forwarded events');
      const events = JSON.parse(eventsJson);

      if (!events || events.length === 0) {
        this.logger.log('[Xero GraphQL Webhook] No events to process');
        return JSON.stringify({ status: 'ok', message: 'No events' });
      }

      setImmediate(async () => {
        try {
          for (const event of events) {
            const { eventCategory, eventType, resourceId, tenantId } = event;
            this.logger.log(`[Xero GraphQL Webhook] Processing: ${eventCategory}.${eventType} for tenant ${tenantId}`);

            const xeroDetails = await this.xeroIntegrationDetails.findOne({
              where: {
                tenant_id: tenantId,
                status: 'ACTIVE',
              },
              relations: ['integrationDetails'],
            });

            if (!xeroDetails || !xeroDetails.integration_id || !xeroDetails?.integrationDetails) {
              this.logger.error(`[Xero GraphQL Webhook] No integration found for tenant id: ${tenantId}`);
              continue;
            }

            if (xeroDetails.integrationDetails.integration_status !== 'Connected - active') {
              this.logger.error(`[Xero GraphQL Webhook] Integration not active for tenant id: ${tenantId}`);
              continue;
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
              this.logger.error(`[Xero GraphQL Webhook] No admin found for company ${companyId}`);
              continue;
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
                this.logger.log(`[Xero GraphQL Webhook] Unhandled event: ${eventKey}`);
            }
          }
        } catch (err) {
          this.logger.error('[Xero GraphQL Webhook] Async processing error:', err.message);
        }
      });

      return JSON.stringify({ status: 'ok' });
    } catch (err) {
      this.logger.error(`[Xero GraphQL Webhook] Error: ${err.message}`);
      return JSON.stringify({ status: 'error', message: err.message });
    }
  }
}
