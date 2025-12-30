import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { XeroRefreshTokenService } from './xeroRefreshToken.service';
import { XeroService } from '../xero.service';
import { XeroClient } from 'xero-node';
import { Repository } from 'typeorm';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Processor('xero-refresh-token')
export class XeroRefreshTokenWorker extends WorkerHost {
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
      console.log(
        `Processing safeguard job for company ${job?.data?.company_id}`,
      );
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: job?.data?.company_id, status: 'ACTIVE' },
      });

      // console.log({ xeroDetails });

      if (xeroDetails) {
        await this.xeroService.refreshTokenSet(
          job?.data?.company_id,
          this.xero,
          true,
        );
        console.log(
          `Safeguard refresh successful for company ${job?.data?.company_id}`,
        );
      } else {
        await this.xeroRefreshTokenService.removeRefreshSafeguardJob(
          job?.data?.company_id,
        );
        console.log(
          `Safeguard refresh removed for company ${job?.data?.company_id}`,
        );
      }
    } catch (error) {
      const errMsg = error?.message ? error?.message : error;
      console.error(
        `Error refreshing safeguard token for company ${job?.data?.company_id}:`,
        errMsg,
      );
      throw errMsg;
    }
  }
}
