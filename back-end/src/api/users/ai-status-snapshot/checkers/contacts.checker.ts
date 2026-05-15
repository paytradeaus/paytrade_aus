import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { StatusIssue } from '../types';

/**
 * Surfaces contacts blocking notice/email delivery: explicit `needs_email`
 * flag (Task #154) plus active contacts with no email captured at all.
 */
@Injectable()
export class ContactsChecker {
  constructor(
    @InjectRepository(ClientSuppliersDetails)
    private readonly contactRepo: Repository<ClientSuppliersDetails>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const rows = await this.contactRepo
      .createQueryBuilder('c')
      .where('c.company_id = :cid', { cid: companyId })
      .andWhere('c.is_deleted = false')
      .andWhere(
        "(c.needs_email = true OR c.client_email_id IS NULL OR c.client_email_id = '')",
      )
      .orderBy('c.updated_on', 'DESC')
      .limit(200)
      .getMany();

    const issues: StatusIssue[] = [];
    for (const r of rows) {
      const flagged = r.needs_email === true;
      issues.push({
        id: `contacts:client_supplier:${r.client_supplier_id}:missing_email`,
        category: 'contacts',
        severity: flagged ? 'warning' : 'info',
        title: `Contact ${r.business_name || r.client_supplier_id} is missing an email`,
        description: flagged
          ? `Contact #${r.client_supplier_id} (${r.business_name ?? r.client_email_id ?? 'unnamed'}) was imported from Xero with no email and has queued actions waiting on it.`
          : `Contact #${r.client_supplier_id} (${r.business_name ?? 'unnamed'}) has no email — notices and remittances cannot be delivered.`,
        affectedRecordType: 'client_supplier',
        affectedRecordId: r.client_supplier_id,
        suggestedAction: 'Open the contact and add an email address.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
