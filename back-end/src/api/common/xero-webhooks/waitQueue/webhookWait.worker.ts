import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { XeroClient } from 'xero-node';
import { In, Repository } from 'typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { XeroWaitQueueService } from './webhookWait.service';
import { XeroWebhookService } from '../webhook.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Processor('xero-wait-queue')
export class XeroWaitQueueWorker extends WorkerHost {
  private xero: XeroClient;
  private logger = new PaytradeLogger('XERO_WAIT_QUEUE_WORKER');

  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    private xeroWaitQueueService: XeroWaitQueueService,
    private xeroWebhookService: XeroWebhookService,
    private readonly jwtService: JwtService,
    private authService: AuthService,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
  ) {
    super();
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.BASE_URL + 'xero/callback'],
      scopes: [
        'openid',
        'email',
        'profile',
        'accounting.transactions',
        'accounting.settings',
        'accounting.settings.read',
        'offline_access',
        'projects',
        'accounting.contacts',
        'accounting.contacts.read',
      ],
      state: '',
      httpTimeout: 10000,
    });
  }

  async process(job: Job): Promise<any> {
    try {
      this.logger.log(
        `Processing wait job for resource_id ${job?.data?.resource_id}`,
      );
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: job?.data?.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        this.logger.error(
          `[Xero Webhook] No integration found for company id: ${job?.data?.company_id}`,
        );
        throw `No integration found for company id: ${job?.data?.company_id}`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        this.logger.error(
          `[Xero Webhook] Paytrade is currently not active in Xero`,
        );
        throw `Paytrade is currently not active in Xero for company id: ${job?.data?.company_id}`;
      }

      const companyAdmin = await this.userRoles.findOne({
        where: {
          company_id: job?.data?.company_id,
          company_role: In(['PRIMARY ADMIN']),
          status: 'Active',
        },
        relations: ['userDetails'],
      });

      if (!companyAdmin || !companyAdmin?.userDetails?.email_id) {
        this.logger.error(
          `[Xero Webhook] No PRIMARY ADMIN found for company id: ${job?.data?.company_id}`,
        );
        throw `No PRIMARY ADMIN found for company id: ${job?.data?.company_id}`;
      }

      const authResponse = await this.authService.getAuthToken(
        companyAdmin.userDetails.email_id,
        false,
      );

      if (!authResponse?.data?.['access_token']) {
        this.logger.error(
          `[Xero Webhook] Failed to get auth token for company id: ${job?.data?.company_id}`,
        );
        throw `Failed to get auth token for company id: ${job?.data?.company_id}`;
      }

      this.logger.log('Auth token obtained for Xero webhook processing');
      const decoded = this.jwtService.decode(authResponse.data['access_token']);

      if (xeroDetails) {
        const invoiceResponse =
          await this.xeroWebhookService.checkAndProcessPayment(
            {
              tenant_id: job?.data?.tenant_id,
              resource_id: job?.data?.resource_id,
              data: job?.data?.data,
              sync_run_type: job?.data?.sync_run_type,
            },
            decoded,
          );
        this.logger.log(`invoiceResponse: ${JSON.stringify({ invoiceResponse })}`);
        if (invoiceResponse && job?.data?.contactId) {
          const overpayments =
            await this.xeroWebhookService.checkAndCreateOverPaymentAndRefunds(
              {
                tenant_id: job?.data?.tenant_id,
                contact_id: job?.data?.contactId,
                sync_run_type: job?.data?.sync_run_type,
              },
              decoded,
            );
          this.logger.log(`overpayment check in job:: ${JSON.stringify({ overpayments })}`);
          return { success: true, invoiceResponse, overpayments };
        }
        this.logger.log(
          `Xero Wait Job completed for resource ${job?.data?.resource_id}`,
        );
        return { success: true, invoiceResponse };
      } else {
        this.logger.log(
          `Xero Wait Job completed (no xeroDetails) for resource ${job?.data?.resource_id}`,
        );
        return { success: true, invoiceResponse: false };
      }
    } catch (error) {
      const errMsg = error?.message ? error?.message : error;
      this.logger.error(
        `Error waiting for resource ${job?.data?.resource_id}: ${JSON.stringify(errMsg)}`,
      );
      throw errMsg;
    }
  }
}
