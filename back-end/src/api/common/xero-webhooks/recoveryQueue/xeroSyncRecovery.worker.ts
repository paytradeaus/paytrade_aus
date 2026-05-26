import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { XeroWebhookService } from '../webhook.service';
import {
  XERO_SYNC_RECOVERY_QUEUE,
  XeroSyncRecoveryJob,
} from './xeroSyncRecovery.service';

@Processor(XERO_SYNC_RECOVERY_QUEUE)
export class XeroSyncRecoveryWorker extends WorkerHost {
  private logger = new PaytradeLogger('XERO_SYNC_RECOVERY_WORKER');

  constructor(private readonly xeroWebhookService: XeroWebhookService) {
    super();
  }

  async process(job: Job<XeroSyncRecoveryJob>): Promise<any> {
    const { company_id, client_supplier_id, trigger } = job.data || ({} as any);
    this.logger.log(
      `[process] starting recovery (company_id=${company_id}, cs_id=${client_supplier_id}, trigger=${trigger})`,
    );
    try {
      const result =
        await this.xeroWebhookService.retryFailedSyncsForContact({
          company_id,
          client_supplier_id,
          trigger,
        });
      this.logger.log(
        `[process] finished (cs_id=${client_supplier_id}): ${JSON.stringify(result)}`,
      );
      return result;
    } catch (err: any) {
      this.logger.error(
        `[process] recovery failed (cs_id=${client_supplier_id}): ${err?.message || err}`,
      );
      throw err;
    }
  }
}
