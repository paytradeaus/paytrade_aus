import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { StatusIssue, StatusIssueSeverity } from '../types';

const LOOKBACK_DAYS = 30;
const FETCH_LIMIT = 200; // wider than the previous 100: we classify + dedup
const MAX_TITLE_LEN = 160;

/**
 * Surfaces Xero sync failures in the recent window, with per-row severity
 * classification + meaningful titles + same-root-cause dedup. See
 * `docs/architecture/sync-status-classification.md` for the rule set.
 *
 * Severity decision (per row):
 *   - critical = action genuinely blocks money movement / compliance
 *     (Bills, Invoices, Payments, Claims, Smart contract, Retentions,
 *     Trust movements, Manual sync).
 *   - info = background noise that the system is retrying on its own or
 *     that the user has already mitigated (webhook re-receives,
 *     scheduler retries, missing-parent dependencies, metadata-only
 *     deletes/edits on contacts/bank-accounts/projects/contracts,
 *     or rows wrapped by the Task #274 contact-mirror downgrade).
 *
 * Title fallback chain (best → worst):
 *   1. Authored `error_message` when present and reasonably sized.
 *   2. Template-derived action verb + entity name from dynamic_values
 *      / api_payload + missing-fields list when discoverable.
 *   3. Template description (stripped of HTML).
 *   4. Legacy `Xero sync failed (<error_code>)` as final fallback.
 *
 * Dedup: rows with the same (template + entity + project + contract) in
 * the lookback window collapse to the newest row with a `+N more`
 * suffix, so one bad contact can't fill the dashboard card.
 */
@Injectable()
export class SyncChecker {
  constructor(
    @InjectRepository(XeroSyncLogs)
    private readonly logRepo: Repository<XeroSyncLogs>,
  ) {}

  // sync_types we treat as "always critical when failed".
  private static readonly CRITICAL_SYNC_TYPES = new Set<string>([
    'Bills',
    'Invoices',
    'Payments',
    'Claims',
    'Smart contract',
    'Smart contracts',
    'Retention journals',
    'Retention transfer',
    'Retention transfers',
    'Trust movements',
    'Manual sync',
    'Manual sync (two-sided)',
    'Variable bill code',
  ]);

  // sync_types we treat as "background noise" — schedulers + webhook
  // re-receives. These are auto-retried; one-off failures are not
  // user-actionable until they persist (and even then surface elsewhere).
  private static readonly RETRY_NOISE_SYNC_TYPES = new Set<string>([
    'Invoice webhook',
    'Contact webhook',
    'Invoice schedulers',
    'Project schedulers',
    'Contract schedulers',
    'Account schedulers',
    'Contact schedulers',
    'Overpayment schedulers',
  ]);

  // error_code prefixes that always = info noise regardless of sync_type.
  // - SCHEDULER_*  : retry-loop attempts; if they persist, downstream
  //                  push errors will surface as critical.
  // - WH_*         : Xero → PT webhook receives, mostly metadata mirror.
  // - MISSING_PROJECT/CONTRACT : push blocked by a missing parent that
  //                  another sync will create — auto-resolves.
  // - DELETE_*     : harmless; the record is going away in Xero.
  // - EDIT_BANK / EDIT_CONTACT / DELETE_BANK / DELETE_CONTACT /
  //   DELETE_PROJECT / DELETE_CONTRACT : metadata mirror only.
  // - *_NOT_MAPPED : record doesn't exist in Xero — nothing to do.
  private static readonly INFO_ERROR_CODE_RX =
    /^(SCHEDULER_|WH_|MISSING_PROJECT|MISSING_CONTRACT|DELETE_|EDIT_BANK|EDIT_CONTACT)/i;
  private static readonly NOT_MAPPED_RX = /_NOT_MAPPED$/i;

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
      // Pull the joined template so we can classify per-row without
      // a second round-trip per log row. The relation is declared on
      // the entity (`xeroLogTemplates`) and `innerJoinAndSelect`
      // populates `l.xeroLogTemplates` in the materialised result.
      .innerJoinAndSelect(
        'l.xeroLogTemplates',
        'xt',
        "xt.sync_status = 'Failed'",
      )
      .where('l.created_on >= :since', { since })
      // User-archived sync logs are hidden everywhere else in the app
      // (xero.service.ts list views default to archived_at IS NULL). The
      // system-status snapshot must follow the same convention or
      // archiving a fixed log won't actually clear it from the
      // dashboard's critical count.
      .andWhere('l.archived_at IS NULL')
      .orderBy('l.created_on', 'DESC')
      .limit(FETCH_LIMIT)
      .getMany();

    const issues: StatusIssue[] = rows.map((r) => this.toIssue(r));
    return this.dedup(issues);
  }

  /**
   * Build a StatusIssue from a single sync-log row + its joined template.
   * Pure mapping function; pulled out for testability.
   */
  private toIssue(r: XeroSyncLogs): StatusIssue {
    const template = (r as any).xeroLogTemplates as
      | Pick<
          XeroLogTemplates,
          'id' | 'sync_type' | 'description' | 'error_code' | 'sync_status'
        >
      | undefined;
    const severity = SyncChecker.classify(r, template);
    const { title, entityName, missingFields } = SyncChecker.buildTitle(
      r,
      template,
    );
    const description = SyncChecker.buildDescription(
      r,
      template,
      entityName,
      missingFields,
    );
    return {
      // Dedup key shape mirrors the grouping below: if two rows from
      // the same template + entity collapse into one, the surviving id
      // is still well-defined.
      id: `sync:xero_sync_log:${r.sync_id ?? r.id}:${severity}`,
      category: 'sync',
      severity,
      title,
      description,
      affectedRecordType: 'xero_sync_log',
      affectedRecordId: r.id,
      projectId: null,
      suggestedAction:
        'Open the Sync Log to see the full error, then resolve the underlying record (or use Manual Xero sync if the fix is in Xero).',
      agentCanHelp: false,
      requiresApproval: true,
      detectedAt:
        r.created_on?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  /**
   * Classify a sync-log row to critical | warning | info.
   * Trusts explicit `downgrade_reason` set by the Task #274 contact-
   * mirror interceptor; otherwise applies the sync_type / error_code
   * rule set documented at the top of this file.
   */
  static classify(
    r: XeroSyncLogs,
    template?: Pick<XeroLogTemplates, 'sync_type' | 'error_code'>,
  ): StatusIssueSeverity {
    const dv = (r.dynamic_values as Record<string, any>) || {};
    if (dv.downgrade_reason) return 'info';

    const syncType = template?.sync_type || '';
    const errorCode = r.error_code || template?.error_code || '';

    if (SyncChecker.RETRY_NOISE_SYNC_TYPES.has(syncType)) return 'info';
    if (SyncChecker.INFO_ERROR_CODE_RX.test(errorCode)) return 'info';
    if (SyncChecker.NOT_MAPPED_RX.test(errorCode)) return 'info';
    if (SyncChecker.CRITICAL_SYNC_TYPES.has(syncType)) return 'critical';

    // Failed templates outside both lists are metadata-mirror failures
    // (Bank accounts, Contacts, Projects, Contracts add/edit). User
    // wants binary critical/info on the card, so default to info.
    return 'info';
  }

  /**
   * Compose a human-readable title for the dashboard card and the full
   * issues list. Returns the entity name + missing fields it discovered
   * so they can be re-used in the description without re-parsing.
   */
  static buildTitle(
    r: XeroSyncLogs,
    template?: Pick<XeroLogTemplates, 'sync_type' | 'description'>,
  ): { title: string; entityName: string | null; missingFields: string | null } {
    const entityName = SyncChecker.extractEntityName(r);
    const missingFields = SyncChecker.extractMissingFields(r);

    // 1. Prefer an authored error_message when it's substantive but not
    //    a wall of text. Most authored messages already include the
    //    entity name + what's wrong; reusing them avoids us losing
    //    nuance the original writer captured.
    const em = (r.error_message || '').trim();
    if (em && em.length >= 30 && em.length <= MAX_TITLE_LEN) {
      return { title: em, entityName, missingFields };
    }
    if (em && em.length > MAX_TITLE_LEN) {
      return {
        title: SyncChecker.truncate(em, MAX_TITLE_LEN),
        entityName,
        missingFields,
      };
    }

    // 2. Template-derived action + entity + missing fields.
    const syncType = template?.sync_type || 'Xero';
    const action = SyncChecker.inferAction(template?.description);
    let title = `${syncType} ${action}`;
    if (entityName) title += ` — ${entityName}`;
    if (missingFields) title += ` (missing: ${missingFields})`;
    if (title && title !== 'Xero sync failed') {
      return {
        title: SyncChecker.truncate(title, MAX_TITLE_LEN),
        entityName,
        missingFields,
      };
    }

    // 3. Template description as plain text.
    const desc = SyncChecker.stripHtml(template?.description || '').trim();
    if (desc) {
      return {
        title: SyncChecker.truncate(desc, MAX_TITLE_LEN),
        entityName,
        missingFields,
      };
    }

    // 4. Final legacy fallback.
    return {
      title: `Xero sync failed (${r.error_code ?? 'unknown'})`,
      entityName,
      missingFields,
    };
  }

  private static buildDescription(
    r: XeroSyncLogs,
    template: Pick<XeroLogTemplates, 'sync_type'> | undefined,
    entityName: string | null,
    missingFields: string | null,
  ): string {
    const bits: string[] = [];
    bits.push(`Xero sync log #${r.sync_id}`);
    if (template?.sync_type) bits.push(`type: ${template.sync_type}`);
    if (entityName) bits.push(`entity: ${entityName}`);
    if (missingFields) bits.push(`missing: ${missingFields}`);
    if (r.error_code) bits.push(`code: ${r.error_code}`);
    return `${bits.join(' · ')}.`;
  }

  private static extractEntityName(r: XeroSyncLogs): string | null {
    const dv = (r.dynamic_values as Record<string, any>) || {};
    const ap = (r.api_payload as Record<string, any>) || {};
    const candidates = [
      dv.contact_name,
      dv.client_supplier_name,
      dv.supplier_name,
      dv.account_name,
      dv.project_name,
      dv.contract_name,
      dv.bill_name,
      dv.invoice_name,
      ap.client_supplier_name,
      ap.contact_name,
      ap.account_name,
      ap.project_name,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
    return null;
  }

  private static extractMissingFields(r: XeroSyncLogs): string | null {
    const dv = (r.dynamic_values as Record<string, any>) || {};
    const raw = dv.missing_fields;
    if (raw) {
      if (Array.isArray(raw)) {
        const cleaned = raw.filter(Boolean).map(String);
        if (cleaned.length) return cleaned.join(', ');
      }
      if (typeof raw === 'string' && raw.trim() && raw !== 'NA') {
        return raw.trim();
      }
    }
    if (
      r.information_required &&
      r.information_required.trim() &&
      r.information_required !== 'NA'
    ) {
      return r.information_required.trim();
    }
    // Fallback: parse "missing required information: X, Y" from message.
    const em = r.error_message || '';
    const m = em.match(
      /missing(?:\s+required\s+information)?:\s*([^.;]+?)(?:[.;]|$)/i,
    );
    if (m && m[1]) return m[1].trim();
    return null;
  }

  /**
   * Map a template description like
   *   "Add bank account in xero failed"
   * to a short action verb suitable for compositing into a title.
   */
  private static inferAction(description?: string): string {
    const d = SyncChecker.stripHtml(description || '').toLowerCase();
    if (!d) return 'sync failed';
    if (d.includes('add') && d.includes('failed')) return 'create failed';
    if (d.includes('edit') && d.includes('failed')) return 'update failed';
    if (d.includes('delete') && d.includes('failed')) return 'delete failed';
    if (d.includes('missing')) return 'sync blocked';
    if (d.includes('failed')) return 'failed';
    return 'sync failed';
  }

  private static stripHtml(s: string): string {
    return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private static truncate(s: string, n: number): string {
    if (!s) return s;
    if (s.length <= n) return s;
    return `${s.slice(0, n - 1).trimEnd()}…`;
  }

  /**
   * Collapse rows sharing the same root cause to a single representative
   * (the newest) with a `+N more occurrences` suffix.
   *
   * Grouping key is `(severity, title)`. We rely on the title builder
   * to produce a stable string per root cause: authored error_messages
   * already include the entity / missing fields, and the composed
   * fallback string is built from (sync_type + action + entity +
   * missing fields). Two rows from the same template + same entity
   * therefore produce the same title and collapse together; rows with
   * different entities or different generated wording stay distinct.
   * This catches the common pattern of one bad contact firing the same
   * Failed log on every webhook tick without needing to carry extra
   * grouping columns on the narrow StatusIssue contract.
   */
  private dedup(issues: StatusIssue[]): StatusIssue[] {
    const groups = new Map<string, StatusIssue[]>();
    const keyOf = (i: StatusIssue) => `${i.severity}|${i.title}`;
    // Input is already DESC by created_on, so the first entry per group
    // is the newest representative.
    for (const i of issues) {
      const k = keyOf(i);
      const g = groups.get(k);
      if (g) g.push(i);
      else groups.set(k, [i]);
    }
    const out: StatusIssue[] = [];
    for (const g of groups.values()) {
      const rep = g[0];
      if (g.length === 1) {
        out.push(rep);
      } else {
        out.push({
          ...rep,
          title: SyncChecker.truncate(
            `${rep.title} (+${g.length - 1} more occurrence${g.length - 1 === 1 ? '' : 's'})`,
            MAX_TITLE_LEN,
          ),
          description: `${rep.description} Repeated ${g.length} times in the last ${LOOKBACK_DAYS} days.`,
        });
      }
    }
    return out;
  }
}
