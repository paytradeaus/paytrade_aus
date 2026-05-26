import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

export const XERO_SYNC_RECOVERY_QUEUE = 'xero-sync-recovery';

export interface XeroSyncRecoveryJob {
  company_id: number;
  client_supplier_id: number;
  trigger:
    | 'contact_edit'
    | 'bank_account_add'
    | 'webhook_contact_mirror'
    | 'manual_contact_resync'
    | 'scheduler_sweep'
    | 'admin_mutation';
}

@Injectable()
export class XeroSyncRecoveryService {
  private logger = new PaytradeLogger('XERO_SYNC_RECOVERY_SERVICE');

  constructor(
    @InjectQueue(XERO_SYNC_RECOVERY_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(job: XeroSyncRecoveryJob): Promise<void> {
    try {
      if (!job?.company_id || !job?.client_supplier_id) return;
      const jobId = `cs-${job.client_supplier_id}-${job.trigger}-${Date.now()}`;
      await this.queue.add(jobId, job, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 3600, count: 200 },
        removeOnFail: { age: 86_400, count: 200 },
      });
      this.logger.log(
        `[enqueue] queued recovery job ${jobId} (company_id=${job.company_id}, cs_id=${job.client_supplier_id}, trigger=${job.trigger})`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[enqueue] non-fatal failure enqueuing recovery job (cs_id=${job?.client_supplier_id}): ${err?.message || err}`,
      );
    }
  }
}
