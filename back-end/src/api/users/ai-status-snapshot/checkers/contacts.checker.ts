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
      // Only surface contacts whose email is genuinely missing. The
      // `needs_email` flag (set at Xero import time) can go stale once a user
      // adds an email later, so it must NOT trigger on its own — gate on the
      // actual email value being empty.
      .andWhere("(c.client_email_id IS NULL OR TRIM(c.client_email_id) = '')")
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
        // Deep-link by the uuid PK (`id`): the contact view page fetches via
        // viewClientSuppliersDetails(id: String!). `client_supplier_id` is a
        // separate integer business key the view cannot resolve. The stable
        // `id` above keeps using client_supplier_id for human readability.
        affectedRecordId: r.id,
        suggestedAction: 'Open the contact and add an email address.',
        agentCanHelp: false,
        requiresApproval: true,
        detectedAt: r.updated_on?.toISOString?.() ?? new Date().toISOString(),
      });
    }
    return issues;
  }
}
