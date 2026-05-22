import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { StatusIssue } from '../types';

const LOOKBACK_DAYS = 30;

/**
 * Surfaces failed Xero sync attempts in the recent window. XeroSyncLogs has
 * no `company_id` column — scoping happens through XeroIntegrationDetails;
 * the failed/warning verdict lives on the joined XeroLogTemplates.sync_status.
 */
@Injectable()
export class SyncChecker {
  constructor(
    @InjectRepository(XeroSyncLogs)
    private readonly logRepo: Repository<XeroSyncLogs>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
    const rows = await this.logRepo
      .createQueryBuilder('l')
      .innerJoin(
        XeroIntegrationDetails,
        'xi',
        'xi.integration_id = l.integration_id AND xi.company_id = :cid',
        { cid: companyId },
      )
      .innerJoin(
        XeroLogTemplates,
        'xt',
        "xt.id = l.log_template_id AND xt.sync_status = 'Failed'",
      )
      .where('l.created_on >= :since', { since })
      // User-archived sync logs are hidden everywhere else in the app
      // (xero.service.ts list views default to archived_at IS NULL). The
      // system-status snapshot must follow the same convention or
      // archiving a fixed log won't actually clear it from the
      // dashboard's critical count.
      .andWhere('l.archived_at IS NULL')
      .orderBy('l.created_on', 'DESC')
      .limit(100)
      .getMany();

    const issues: StatusIssue[] = [];
    for (const r of rows) {
      issues.push({
        id: `sync:xero_sync_log:${r.sync_id ?? r.id}:failed`,
        category: 'sync',
        severity: 'critical',
        title: `Xero sync failed (${r.error_code ?? 'unknown'})`,
        description: `Xero sync log #${r.sync_id} failed: ${r.error_message ?? r.error_code ?? 'no detail'}.`,
        affectedRecordType: 'xero_sync_log',
        affectedRecordId: r.id,
        suggestedAction:
          'Open the Sync Log and use Manual Xero sync to recover the affected record.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.created_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
