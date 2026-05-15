import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { StatusIssue } from '../types';

const UNSENT_STATUSES: ReadonlyArray<string> = ['Not Sent', 'Draft', 'Sending'];

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
    for (const r of rows) {
      const isStuck = r.status === 'Sending';
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
