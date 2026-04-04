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
      this.logger.log(`[GQL_RECV] === GraphQL webhook relay received === payload length=${eventsJson?.length ?? 0}`);

      const webhookSecret = process.env.WEBHOOK_RELAY_SECRET;
      const requestSecret = context.req?.headers?.['x-webhook-secret'];

      this.logger.log(`[GQL_RECV] Secret check — configured=${!!webhookSecret}, received=${!!requestSecret}, match=${webhookSecret && requestSecret === webhookSecret}`);
      if (!webhookSecret || requestSecret !== webhookSecret) {
        this.logger.error('[GQL_RECV] Invalid relay secret — returning error');
        return JSON.stringify({ status: 'error', message: 'Unauthorized' });
      }

      this.logger.log(`[GQL_RECV] Auth OK. Parsing events...`);
      const events = JSON.parse(eventsJson);
      this.logger.log(`[GQL_RECV] Parsed — event count=${events?.length ?? 0}, raw=${eventsJson.substring(0, 500)}`);

      if (!events || events.length === 0) {
        this.logger.log('[GQL_RECV] No events to process');
        return JSON.stringify({ status: 'ok', message: 'No events' });
      }

      setImmediate(async () => {
        try {
          for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const { eventCategory, eventType, resourceId, tenantId } = event;
            this.logger.log(`[GQL_RECV] Processing event ${i + 1}/${events.length}: ${eventCategory}.${eventType}, resourceId=${resourceId}, tenantId=${tenantId}`);

            this.logger.log(`[GQL_RECV] Looking up integration for tenant ${tenantId}...`);
            const xeroDetails = await this.xeroIntegrationDetails.findOne({
              where: {
                tenant_id: tenantId,
                status: 'ACTIVE',
              },
              relations: ['integrationDetails'],
            });

            if (!xeroDetails || !xeroDetails.integration_id || !xeroDetails?.integrationDetails) {
              this.logger.error(`[GQL_RECV] No integration found for tenant ${tenantId}. Skipping.`);
              continue;
            }

            this.logger.log(`[GQL_RECV] Integration found: id=${xeroDetails.integration_id}, company=${xeroDetails.company_id}, status=${xeroDetails.integrationDetails.integration_status}`);

            if (xeroDetails.integrationDetails.integration_status !== 'Connected - active') {
              this.logger.error(`[GQL_RECV] Integration not active (status=${xeroDetails.integrationDetails.integration_status}). Skipping.`);
              continue;
            }

            const companyId = xeroDetails.company_id;

            this.logger.log(`[GQL_RECV] Looking up PRIMARY ADMIN for company ${companyId}...`);
            const companyAdmin = await this.userRoles.findOne({
              where: {
                company_id: companyId,
                company_role: In(['PRIMARY ADMIN']),
                status: 'Active',
              },
              relations: ['userDetails'],
            });

            if (!companyAdmin?.userDetails?.email_id) {
              this.logger.error(`[GQL_RECV] No admin found for company ${companyId}. Skipping.`);
              continue;
            }

            this.logger.log(`[GQL_RECV] Admin found: ${companyAdmin.userDetails.email_id}. Getting auth token...`);
            const authResponse = await this.authService.getAuthToken(
              companyAdmin.userDetails.email_id,
              false,
            );

            const decoded = this.jwtService.decode(authResponse.data['access_token']);
            this.logger.log(`[GQL_RECV] Auth token obtained. userId=${(decoded as any)?.userId}`);

            const eventKey = `${eventCategory}.${eventType}`;

            switch (eventKey) {
              case 'CONTACT.CREATE':
              case 'CONTACT.UPDATE':
                this.logger.log(`[GQL_RECV] Dispatching to handleContactCreateUpdate...`);
                await this.xeroWebhookService.handleContactCreateUpdate(
                  resourceId,
                  tenantId,
                  '',
                  {},
                  decoded,
                );
                this.logger.log(`[GQL_RECV] handleContactCreateUpdate completed`);
                break;

              case 'INVOICE.CREATE':
              case 'INVOICE.UPDATE':
                this.logger.log(`[GQL_RECV] Dispatching to handleInvoiceCreateUpdate (type=${eventType})...`);
                await this.xeroWebhookService.handleInvoiceCreateUpdate(
                  {
                    resource_id: resourceId,
                    tenant_id: tenantId,
                    eventType,
                    sync_run_type: 'webhook',
                  },
                  decoded,
                );
                this.logger.log(`[GQL_RECV] handleInvoiceCreateUpdate completed`);
                break;

              default:
                this.logger.log(`[GQL_RECV] Unhandled event: ${eventKey}`);
            }
          }
        } catch (err) {
          this.logger.error(`[GQL_RECV] Async processing error: ${err?.message || err}`);
        }
      });

      return JSON.stringify({ status: 'ok' });
    } catch (err) {
      this.logger.error(`[GQL_RECV] Top-level error: ${err.message}`);
      return JSON.stringify({ status: 'error', message: err.message });
    }
  }
}
