import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { XeroRefreshTokenService } from './xeroRefreshToken.service';
import { XeroService } from '../xero.service';
import { XeroClient } from 'xero-node';
import { Repository } from 'typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Processor('xero-refresh-token')
export class XeroRefreshTokenWorker extends WorkerHost {
  private logger = new PaytradeLogger('XERO_REFRESH_TOKEN_WORKER');
  private xero: XeroClient;

  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    private xeroRefreshTokenService: XeroRefreshTokenService,
    private xeroService: XeroService,
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

  async process(job: Job): Promise<any> {
    try {
      this.logger.log(
        `Processing safeguard job for company ${job?.data?.company_id}`,
      );
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: job?.data?.company_id, status: 'ACTIVE' },
      });

      if (xeroDetails) {
        await this.xeroService.refreshTokenSet(
          job?.data?.company_id,
          this.xero,
          true,
        );
        this.logger.log(
          `Safeguard refresh successful for company ${job?.data?.company_id}`,
        );
      } else {
        await this.xeroRefreshTokenService.removeRefreshSafeguardJob(
          job?.data?.company_id,
        );
        this.logger.log(
          `Safeguard refresh removed for company ${job?.data?.company_id}`,
        );
      }
    } catch (error) {
      const errMsg = error?.message ? error?.message : error;
      this.logger.error(
        `Error refreshing safeguard token for company ${job?.data?.company_id}: ${errMsg}`,
      );
      throw errMsg;
    }
  }
}
