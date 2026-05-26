import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ComplianceCheckpoint } from 'src/entities/compliance-details-pro-acc.entity';
import { CompliancesService } from './compliances.service';
import { ComplianceRefreshProducer } from './compliance-refresh.producer';
import {
  COMPLIANCE_REFRESH_QUEUE,
  ComplianceRefreshJob,
} from './compliance-refresh.queue';

/**
 * Task #297 — Compliance cache refresh worker.
 *
 * Pulls debounced jobs off the `compliance-refresh` queue (enqueued by
 * `ComplianceRefreshProducer.markDirty`) and rebuilds the persisted
 * compliance cache for the target project by re-running the existing
 * PTA + RTA sync path. The work is delegated to
 * `CompliancesService.refreshProjectComplianceCache` so the same
 * logic is reachable from the read-time safety net and the manual
 * "Refresh now" mutation without duplication.
 *
 * `forwardRef` on `CompliancesService` resolves the circular import
 * between the worker (declared in `CompliancesModule`) and the
 * service that owns the rebuild logic.
 */
@Processor(COMPLIANCE_REFRESH_QUEUE)
export class ComplianceRefreshConsumer extends WorkerHost {
  private logger = new PaytradeLogger('COMPLIANCE_REFRESH_CONSUMER');

  constructor(
    @Inject(forwardRef(() => CompliancesService))
    private readonly compliancesService: CompliancesService,
    private readonly producer: ComplianceRefreshProducer,
    @InjectRepository(ComplianceCheckpoint)
    private readonly checkpointRepo: Repository<ComplianceCheckpoint>,
  ) {
    super();
  }

  async process(job: Job<ComplianceRefreshJob>): Promise<any> {
    const { project_id, trigger } = job.data || ({} as any);
    if (!project_id) {
      this.logger.warn('[process] missing project_id, skipping');
      return { skipped: true };
    }

    this.logger.log(
      `[process] refreshing compliance cache project=${project_id} trigger=${trigger ?? 'unknown'}`,
    );
    try {
      const summary =
        await this.compliancesService.refreshProjectComplianceCache(
          Number(project_id),
        );

      // Race-recovery: if a write (markComplianceDirty) landed AFTER
      // `saveFullComplianceData` overwrote the row's `is_stale` to
      // false but BEFORE we returned, the row is dirty again. The
      // orphan-only blanket clear inside refreshProjectComplianceCache
      // intentionally leaves those rows alone. Enqueue a follow-up
      // job with a unique jobId so BullMQ cannot dedupe it against
      // the job we're about to complete.
      const stillDirty = await this.checkpointRepo.count({
        where: { project_id: Number(project_id), is_stale: true },
      });
      if (stillDirty > 0) {
        this.logger.log(
          `[process] race detected for project=${project_id}: ${stillDirty} row(s) re-dirtied during refresh, enqueuing follow-up`,
        );
        await this.producer.enqueueFollowUp(
          Number(project_id),
          `${trigger ?? 'unknown'}.follow-up`,
        );
      }

      this.logger.log(
        `[process] done project=${project_id}: ${JSON.stringify(summary)} stillDirty=${stillDirty}`,
      );
      return { ok: true, ...summary, stillDirty };
    } catch (err: any) {
      this.logger.error(
        `[process] failed project=${project_id}: ${err?.message || err}`,
      );
      throw err;
    }
  }
}
