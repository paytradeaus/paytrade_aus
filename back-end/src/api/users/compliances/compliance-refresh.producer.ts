import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ComplianceCheckpoint } from 'src/entities/compliance-details-pro-acc.entity';
import {
  COMPLIANCE_REFRESH_DEBOUNCE_MS,
  COMPLIANCE_REFRESH_JOB,
  COMPLIANCE_REFRESH_QUEUE,
  ComplianceRefreshJob,
} from './compliance-refresh.queue';

/**
 * Task #297 — Compliance cache invalidator.
 *
 * Call `markDirty(projectId)` from any write path that could change a
 * rule outcome (payment confirm/delete, contract upload/edit, notice
 * sent, bank account added, trust top-up, reconciliation save, etc.)
 * AFTER the write itself has been committed. Two things happen:
 *
 *   1. Every `compliance_checkpoint` row for this project is flipped to
 *      `is_stale = true`. The read-time safety net inside
 *      `getComplianceData` uses this flag to know when it must do a
 *      synchronous fast-path recompute instead of trusting the cache.
 *
 *   2. A delayed BullMQ job is enqueued on the `compliance-refresh`
 *      queue with a stable `jobId = "compliance-refresh-<projectId>"`
 *      and a 5s delay. BullMQ rejects duplicate job-ids, which is the
 *      mechanism we use to debounce bursts of dirty markers — all the
 *      writes inside a single user interaction get serviced by the
 *      same job. The worker (`ComplianceRefreshConsumer`) then calls
 *      `CompliancesService.refreshProjectComplianceCache(projectId)`
 *      which persists fresh results via the existing
 *      `syncCompliancesOfProject` path.
 *
 * Failures are swallowed and logged — compliance freshness is a UX /
 * notification concern, never a hard dependency of the write itself.
 */
@Injectable()
export class ComplianceRefreshProducer {
  private logger = new PaytradeLogger('COMPLIANCE_REFRESH_PRODUCER');

  constructor(
    @InjectQueue(COMPLIANCE_REFRESH_QUEUE) private readonly queue: Queue,
    @InjectRepository(ComplianceCheckpoint)
    private readonly checkpointRepo: Repository<ComplianceCheckpoint>,
  ) {}

  async markDirty(project_id: number, trigger?: string): Promise<void> {
    if (!project_id || !Number.isFinite(Number(project_id))) return;

    // 1. Flip the in-DB freshness flag so the read-time safety net knows
    //    to recompute even before the worker runs.
    try {
      await this.checkpointRepo.update(
        { project_id: Number(project_id) },
        { is_stale: true },
      );
    } catch (err: any) {
      this.logger.error(
        `[markDirty] is_stale update failed for project ${project_id}: ${err?.message || err}`,
      );
    }

    // 2. Enqueue a debounced refresh. While a delayed job for this
    //    project is still waiting, BullMQ dedupes by jobId → all the
    //    rapid-fire writes inside one user interaction coalesce into a
    //    single recompute. `removeOnComplete: true` / `removeOnFail:
    //    true` are critical: with a numeric retention, BullMQ keeps the
    //    completed job record alive and would dedupe *future* dirty
    //    events against it long after the recompute finished, leaving
    //    the cache stuck stale until either a process restart or the
    //    08:00 UTC cron. Immediate removal frees the jobId the instant
    //    the worker finishes.
    try {
      await this.queue.add(
        COMPLIANCE_REFRESH_JOB,
        { project_id: Number(project_id), trigger } as ComplianceRefreshJob,
        {
          jobId: `compliance-refresh-${project_id}`,
          delay: COMPLIANCE_REFRESH_DEBOUNCE_MS,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err: any) {
      // A duplicate jobId throw means a delayed/active job for this
      // project is already in flight — that is exactly what debouncing
      // is for, not an error.
      const msg = String(err?.message || err);
      const isDuplicate =
        msg.includes('Job') &&
        (msg.includes('already exists') || msg.includes('Duplicated'));
      if (!isDuplicate) {
        this.logger.error(
          `[markDirty] enqueue failed for project ${project_id}: ${msg}`,
        );
      }
    }
  }

  /**
   * Force-enqueue a follow-up refresh with a unique jobId so it cannot
   * be deduped against an already-active or just-completed job. Used by
   * the worker to recover from the "write landed mid-refresh" race
   * where the dirty signal is still set on at least one row after a
   * sync pass completed.
   */
  async enqueueFollowUp(project_id: number, trigger?: string): Promise<void> {
    if (!project_id) return;
    try {
      await this.queue.add(
        COMPLIANCE_REFRESH_JOB,
        { project_id: Number(project_id), trigger } as ComplianceRefreshJob,
        {
          jobId: `compliance-refresh-${project_id}-followup-${Date.now()}`,
          delay: COMPLIANCE_REFRESH_DEBOUNCE_MS,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err: any) {
      this.logger.error(
        `[enqueueFollowUp] failed for project ${project_id}: ${err?.message || err}`,
      );
    }
  }
}
