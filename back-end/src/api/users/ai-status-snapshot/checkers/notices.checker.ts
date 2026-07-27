import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { StatusIssue } from '../types';

const UNSENT_STATUSES: ReadonlyArray<string> = ['Not Sent', 'Draft', 'Sending'];

// 'Sending' is a NORMAL in-flight state for delegated QBCC notices: the
// notice has been emailed to the PayTrade delegated-notices inbox and is
// awaiting an admin to lodge it with QBCC and mark it Sent. Only treat it
// as "stuck" once it has sat there beyond this grace period.
const STUCK_SENDING_AFTER_DAYS = 3;

@Injectable()
export class NoticesChecker {
  constructor(
    @InjectRepository(NoticeDetails)
    private readonly noticeRepo: Repository<NoticeDetails>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const rows = await this.noticeRepo
      .createQueryBuilder('n')
      .select([
        'n.id',
        'n.notice_id',
        'n.notice_type',
        'n.status',
        'n.project_id',
        'n.notice_date',
        'n.updated_on',
      ])
      .where('n.company_id = :cid', { cid: companyId })
      .andWhere('n.status IN (:...statuses)', { statuses: UNSENT_STATUSES })
      .orderBy('n.updated_on', 'DESC')
      .limit(200)
      .getMany();

    const issues: StatusIssue[] = [];
    const now = Date.now();
    for (const r of rows) {
      const isSending = r.status === 'Sending';
      if (isSending) {
        const since = r.updated_on ? new Date(r.updated_on).getTime() : now;
        // Freshly delegated notices are being processed — not an issue.
        // NOTE: updated_on is an approximation of "entered Sending" (any row
        // update resets it), which can only delay — never fabricate — an alert.
        if (now - since <= STUCK_SENDING_AFTER_DAYS * 86400000) continue;
      }
      const isStuck = isSending;
      issues.push({
        id: `notices:notice:${r.notice_id}:unsent`,
        category: 'notices',
        severity: isStuck ? 'critical' : 'warning',
        title: isStuck
          ? `Notice ${r.notice_id} stuck in 'Sending'`
          : `Unsent notice ${r.notice_id}`,
        description: isStuck
          ? `${r.notice_type ?? 'Notice'} #${r.notice_id} has been in 'Sending' state without confirmation.`
          : `${r.notice_type ?? 'Notice'} #${r.notice_id} is in '${r.status}' state and has not been delivered.`,
        affectedRecordType: 'notice',
        affectedRecordId: r.id,
        projectId: r.project_id ?? null,
        suggestedAction: isStuck
          ? 'Open the notice and re-send or mark as failed.'
          : 'Open the notice and send it.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: (r.updated_on ?? new Date()).toISOString(),
      });
    }
    return issues;
  }
}
