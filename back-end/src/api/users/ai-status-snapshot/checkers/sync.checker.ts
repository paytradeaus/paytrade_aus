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
 * Linked-record references discovered on a sync-log row. Used for two
 * things: appending a "(Project: X · Claim: Y)" suffix to the title so
 * the user can triage at a glance, and producing a stable dedup key so
 * the same root cause collapses across many retry rows.
 */
export interface SyncLinkedRefs {
  projectId: string | null;
  projectName: string | null;
  contractId: string | null;
  contractName: string | null;
  claimId: string | null;
  claimRef: string | null;
  invoiceId: string | null;
  invoiceRef: string | null;
  billId: string | null;
  billRef: string | null;
}

/**
 * Surfaces Xero sync failures in the recent window, with per-row severity
 * classification + meaningful titles + same-root-cause dedup. See
 * `docs/architecture/sync-status-classification.md` for the rule set.
 *
 * Severity decision (per row): intentionally binary on the dashboard
 * card per user requirement ("only critical sync errors should be
 * critical; everything else is info"). The wider StatusIssueSeverity
 * type still admits `warning`, but this checker only emits
 * `critical` | `info`:
 *   - critical = action genuinely blocks money movement / compliance
 *     (Bills, Invoices, Payments, Claims, Smart contract, Retentions,
 *     Trust movements, Manual sync).
 *   - info = background noise that the system is retrying on its own,
 *     metadata-only mirror failures, missing-parent dependencies, or
 *     rows already downgraded by the Task #274 contact-mirror
 *     interceptor.
 *
 * Title fallback chain (best → worst):
 *   1. Authored `error_message` when present and reasonably sized.
 *   2. Template-derived action verb + entity name + missing-fields list.
 *   3. Template description (stripped of HTML).
 *   4. Legacy `Xero sync failed (<error_code>)` as final fallback.
 * Whichever path is taken, the discovered linked-record references
 * (project / contract / claim / invoice / bill) are appended in a
 * concise " (Project: … · Claim: …)" suffix so the row is triageable
 * even when the underlying message doesn't already mention them.
 *
 * Dedup: rows with the same structured root cause (template_id +
 * severity + entity + project + contract + claim + invoice + bill)
 * collapse to the newest row with a `+N more occurrences` suffix.
 * Using structured fields rather than title text means we don't
 * accidentally collapse distinct rows that happen to truncate to a
 * similar string, and we don't fail to collapse true duplicates when
 * the authored message wording drifts slightly between retries.
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
  // - EDIT_BANK / EDIT_CONTACT : metadata mirror only.
  // - *_NOT_MAPPED : record doesn't exist in Xero — nothing to do.
  // - *_CONTACT_INCOMPLETE : pre-flight validation block — no API call
  //                  was attempted, the underlying claim/bill/payment
  //                  hasn't actually failed to sync. The user fixes the
  //                  missing contact field (email/bank) in PayTrade and
  //                  the next sync attempt succeeds. Treat as info so
  //                  it doesn't dominate the critical card.
  private static readonly INFO_ERROR_CODE_RX =
    /^(SCHEDULER_|WH_|MISSING_PROJECT|MISSING_CONTRACT|DELETE_|EDIT_BANK|EDIT_CONTACT)/i;
  private static readonly NOT_MAPPED_RX = /_NOT_MAPPED$/i;
  private static readonly CONTACT_INCOMPLETE_RX = /_CONTACT_INCOMPLETE$/i;

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

    const pairs = rows.map((r) => this.toIssueWithKey(r));
    return SyncChecker.dedup(pairs);
  }

  /**
   * Build a StatusIssue from a single sync-log row + its joined template
   * and return it alongside a structured dedup key. The key is computed
   * here (not inside the StatusIssue) so the public contract stays
   * narrow.
   */
  private toIssueWithKey(r: XeroSyncLogs): {
    issue: StatusIssue;
    dedupKey: string;
  } {
    const template = (r as any).xeroLogTemplates as
      | Pick<
          XeroLogTemplates,
          'id' | 'sync_type' | 'description' | 'error_code' | 'sync_status'
        >
      | undefined;
    const severity = SyncChecker.classify(r, template);
    const refs = SyncChecker.extractLinkedRefs(r);
    const { title, entityName, missingFields } = SyncChecker.buildTitle(
      r,
      template,
      refs,
    );
    const description = SyncChecker.buildDescription(
      r,
      template,
      entityName,
      missingFields,
      refs,
    );
    const issue: StatusIssue = {
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
    const dedupKey = [
      template?.id ?? '',
      severity,
      entityName ?? '',
      refs.projectId ?? '',
      refs.contractId ?? '',
      refs.claimId ?? '',
      refs.invoiceId ?? '',
      refs.billId ?? '',
    ].join('|');
    return { issue, dedupKey };
  }

  /**
   * Classify a sync-log row. Returns 'critical' | 'info' only — see the
   * class-level severity note for why this checker doesn't emit
   * 'warning'.
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
    if (SyncChecker.CONTACT_INCOMPLETE_RX.test(errorCode)) return 'info';
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
    refs?: SyncLinkedRefs,
  ): { title: string; entityName: string | null; missingFields: string | null } {
    const entityName = SyncChecker.extractEntityName(r);
    const missingFields = SyncChecker.extractMissingFields(r);
    const linkedRefs = refs ?? SyncChecker.extractLinkedRefs(r);
    const refSuffix = SyncChecker.formatLinkedRefs(linkedRefs);

    // 1. Prefer an authored error_message when it's substantive but not
    //    a wall of text. Most authored messages already include the
    //    entity name + what's wrong; reusing them preserves nuance the
    //    original writer captured. Even when the message is rich we
    //    still append the linked-record suffix when the message doesn't
    //    already mention the project/contract/claim/invoice/bill — so
    //    triage doesn't depend on the message author having remembered
    //    to include them.
    const em = (r.error_message || '').trim();
    if (em && em.length >= 30) {
      const body =
        em.length <= MAX_TITLE_LEN
          ? em
          : SyncChecker.truncate(em, MAX_TITLE_LEN);
      const composed = SyncChecker.appendRefSuffix(body, refSuffix, em);
      return {
        title: SyncChecker.truncate(composed, MAX_TITLE_LEN),
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
    const composed2 = SyncChecker.appendRefSuffix(title, refSuffix, title);
    if (composed2 && composed2.trim() !== 'Xero sync failed') {
      return {
        title: SyncChecker.truncate(composed2, MAX_TITLE_LEN),
        entityName,
        missingFields,
      };
    }

    // 3. Template description as plain text.
    const desc = SyncChecker.stripHtml(template?.description || '').trim();
    if (desc) {
      const composed3 = SyncChecker.appendRefSuffix(desc, refSuffix, desc);
      return {
        title: SyncChecker.truncate(composed3, MAX_TITLE_LEN),
        entityName,
        missingFields,
      };
    }

    // 4. Final legacy fallback (still gets the ref suffix so the row is
    //    at least triageable).
    const legacy = `Xero sync failed (${r.error_code ?? 'unknown'})`;
    const composed4 = SyncChecker.appendRefSuffix(legacy, refSuffix, legacy);
    return {
      title: SyncChecker.truncate(composed4, MAX_TITLE_LEN),
      entityName,
      missingFields,
    };
  }

  private static buildDescription(
    r: XeroSyncLogs,
    template: Pick<XeroLogTemplates, 'sync_type'> | undefined,
    entityName: string | null,
    missingFields: string | null,
    refs: SyncLinkedRefs,
  ): string {
    const bits: string[] = [];
    bits.push(`Xero sync log #${r.sync_id}`);
    if (template?.sync_type) bits.push(`type: ${template.sync_type}`);
    if (entityName) bits.push(`entity: ${entityName}`);
    if (missingFields) bits.push(`missing: ${missingFields}`);
    if (r.error_code) bits.push(`code: ${r.error_code}`);
    const refStr = SyncChecker.formatLinkedRefs(refs);
    if (refStr) bits.push(refStr.replace(/^\s*\(|\)\s*$/g, ''));
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
   * Pull project / contract / claim / invoice / bill references from
   * the row's structured columns + JSON blobs. Names are preferred for
   * display; ids are kept for dedup grouping.
   */
  static extractLinkedRefs(r: XeroSyncLogs): SyncLinkedRefs {
    const dv = (r.dynamic_values as Record<string, any>) || {};
    const ap = (r.api_payload as Record<string, any>) || {};
    const ref = (r.reference as Record<string, any>) || {};
    const pick = (...vals: any[]): string | null => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim()) return v.trim();
        if (typeof v === 'number') return String(v);
      }
      return null;
    };
    return {
      projectId: pick(r.project_id, dv.project_id, ap.project_id, ref.project_id),
      projectName: pick(
        dv.project_name,
        dv.project_display_name,
        ap.project_name,
        ref.project_name,
      ),
      contractId: pick(
        r.contract_id,
        dv.contract_id,
        ap.contract_id,
        ref.contract_id,
      ),
      contractName: pick(
        dv.contract_name,
        dv.contract_display_name,
        ap.contract_name,
        ref.contract_name,
      ),
      claimId: pick(dv.claim_id, ap.claim_id, ref.claim_id, dv.payment_claim_id),
      claimRef: pick(
        dv.claim_reference,
        dv.claim_ref,
        dv.claim_number,
        ap.claim_reference,
      ),
      invoiceId: pick(dv.invoice_id, ap.invoice_id, ref.invoice_id),
      invoiceRef: pick(
        dv.invoice_number,
        dv.invoice_reference,
        ap.invoice_number,
        ap.invoice_reference,
      ),
      billId: pick(dv.bill_id, ap.bill_id, ref.bill_id),
      billRef: pick(
        dv.bill_number,
        dv.bill_reference,
        ap.bill_number,
        ap.bill_reference,
      ),
    };
  }

  /**
   * Render a concise " (Project: X · Claim: Y · …)" suffix from the
   * linked refs. Returns empty string when nothing is set, in which
   * case callers should NOT append. Uses display names when available
   * and falls back to a short id-tail when only ids are present (the
   * full UUID would dominate the title).
   */
  static formatLinkedRefs(refs: SyncLinkedRefs | undefined): string {
    if (!refs) return '';
    const shortId = (s: string | null): string | null => {
      if (!s) return null;
      // Keep numeric ids and short tokens whole; abbreviate UUIDs.
      if (/^[0-9]+$/.test(s)) return s;
      if (s.length <= 8) return s;
      return s.slice(0, 8);
    };
    const parts: string[] = [];
    if (refs.projectName) parts.push(`Project: ${refs.projectName}`);
    else if (refs.projectId)
      parts.push(`Project: ${shortId(refs.projectId)}`);
    if (refs.contractName) parts.push(`Contract: ${refs.contractName}`);
    else if (refs.contractId)
      parts.push(`Contract: ${shortId(refs.contractId)}`);
    if (refs.claimRef) parts.push(`Claim: ${refs.claimRef}`);
    else if (refs.claimId) parts.push(`Claim: ${shortId(refs.claimId)}`);
    if (refs.invoiceRef) parts.push(`Invoice: ${refs.invoiceRef}`);
    else if (refs.invoiceId)
      parts.push(`Invoice: ${shortId(refs.invoiceId)}`);
    if (refs.billRef) parts.push(`Bill: ${refs.billRef}`);
    else if (refs.billId) parts.push(`Bill: ${shortId(refs.billId)}`);
    if (!parts.length) return '';
    return ` (${parts.join(' · ')})`;
  }

  /**
   * Append the linked-refs suffix to `body` unless the underlying
   * `source` text already mentions the same project / contract / claim
   * tokens (avoids duplicating the reference the author already
   * included). Pass `body === source` when no truncation happened.
   */
  private static appendRefSuffix(
    body: string,
    refSuffix: string,
    source: string,
  ): string {
    if (!refSuffix) return body;
    // Cheap "already mentioned" test: if the source already contains
    // each of the rendered ref values, skip the suffix entirely. We
    // strip the leading " (" and trailing ")" before splitting.
    const inner = refSuffix.replace(/^\s*\(|\)\s*$/g, '');
    const tokens = inner.split(' · ').map((t) => t.split(': ').pop() || '');
    const lcSource = source.toLowerCase();
    const allMentioned = tokens.every(
      (t) => t && lcSource.includes(t.toLowerCase()),
    );
    if (allMentioned) return body;
    return `${body}${refSuffix}`;
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
   * Collapse rows sharing the same structured root cause (template_id +
   * severity + entity + project + contract + claim + invoice + bill) to
   * a single representative (the newest) with a `+N more occurrences`
   * suffix. Input is already DESC by `created_on`, so the first entry
   * per group is the newest representative.
   *
   * Structured keys (vs title text) keep dedup explicit: distinct rows
   * with similar wording stay separate, and true duplicates collapse
   * even when retry attempts produce slightly different message text.
   */
  static dedup(
    pairs: { issue: StatusIssue; dedupKey: string }[],
  ): StatusIssue[] {
    const groups = new Map<
      string,
      { issue: StatusIssue; dedupKey: string }[]
    >();
    for (const p of pairs) {
      const g = groups.get(p.dedupKey);
      if (g) g.push(p);
      else groups.set(p.dedupKey, [p]);
    }
    const out: StatusIssue[] = [];
    for (const g of groups.values()) {
      const rep = g[0].issue;
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
