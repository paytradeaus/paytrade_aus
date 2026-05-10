import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XeroClient, ManualJournal, ManualJournalLine } from 'xero-node';
import * as moment from 'moment-timezone';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { XeroRetentionJournals } from 'src/entities/xero-retention-journals.entity';
import { Group } from 'src/entities/user-details.entity';
import { XeroService } from '../xero.service';
import { resolveContactGstStatus } from '../contacts/contact-gst-resolver';

const GST_RATE = 0.1;

const NON_GST_TAX_TYPES = new Set([
  'BASEXCLUDED',
  'NONE',
  'EXEMPTOUTPUT',
  'EXEMPTEXPENSES',
  'EXEMPTCAPITAL',
  'INPUTTAXED',
]);

function isGstApplicableTaxType(taxType: string | undefined | null): boolean {
  if (!taxType) return false;
  return !NON_GST_TAX_TYPES.has(String(taxType).toUpperCase());
}

export interface PostJournalArgs {
  claim: any;
  xeroDetails: XeroIntegrationDetails;
  contact: ClientSuppliersDetails | null | undefined;
  company?: CompanyDetails | null;
  retentionExGst: number;
  baseLineTaxType?: string | null;
  invoice_id?: string | null;
  pt_sub_payment_id?: number | null;
  pt_retention_id?: number | null;
  posted_date?: Date | string | null;
}

export interface ResolvedGstApplicability {
  applicable: boolean;
  taxType: string | null;
  source: string;
}

/**
 * Phase 3 — Auto gross-up retention journals.
 *
 * Posts balanced 2-line POSTED Manual Journals to Xero to gross up the GST
 * portion of retention amounts (only fires when ex_gst recording mode is
 * configured and the claim's effective tax type is GST-applicable). The
 * mirror operation when the Retention claim is created posts a reversal MJ
 * with opposite sign so the books net to zero across the held/release
 * lifecycle.
 *
 * Smart identifier resolution order (first non-blank wins):
 *   1. The bill/invoice base line's own taxType (when known)
 *   2. Phase 2 contact-level GST helper (per-contact override → cached
 *      Xero org default → company.is_gst_registered)
 *   3. Unknown — caller writes a "skipped" sync log and no MJ is posted
 *
 * Anti-echo: every Xero MANUALJOURNAL webhook checks
 * `xero_retention_journals.manual_journal_id` first; matches are dropped.
 */
@Injectable()
export class XeroManualJournalService {
  private logger: PaytradeLogger;

  constructor(
    @Inject(forwardRef(() => XeroService))
    private readonly xeroService: XeroService,
    @InjectRepository(XeroRetentionJournals)
    private readonly retentionJournalsRepo: Repository<XeroRetentionJournals>,
    @InjectRepository(CompanyDetails)
    private readonly companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(XeroIntegrationDetails)
    private readonly xeroIntegrationDetailsRepo: Repository<XeroIntegrationDetails>,
  ) {
    this.logger = new PaytradeLogger('XERO_MANUAL_JOURNAL');
  }

  isAutoGrossUpEnabled(xeroDetails: XeroIntegrationDetails | null | undefined): boolean {
    if (!xeroDetails) return false;
    if (!xeroDetails.auto_gross_up_retention_journals) return false;
    if (xeroDetails.simplified_retention_accounting) return false;
    if (xeroDetails.retention_recording_mode !== 'ex_gst') return false;
    return true;
  }

  async resolveGstApplicability(
    claim: any,
    contact: ClientSuppliersDetails | null | undefined,
    xeroDetails: XeroIntegrationDetails,
    baseLineTaxType?: string | null,
  ): Promise<ResolvedGstApplicability> {
    // 1. Base line tax type (most specific)
    const trimmedBase = baseLineTaxType ? String(baseLineTaxType).trim() : '';
    if (trimmedBase) {
      return {
        applicable: isGstApplicableTaxType(trimmedBase),
        taxType: trimmedBase,
        source: 'invoice_line',
      };
    }

    // 2. Phase 2 contact + org + company fallback
    let company: CompanyDetails | null = null;
    if (xeroDetails.company_id) {
      company = await this.companyDetailsRepo.findOne({
        where: { company_id: xeroDetails.company_id },
      });
    }
    const resolved = resolveContactGstStatus(
      contact ?? null,
      claim?.claim_type,
      {
        xero_org_default_sales_tax: xeroDetails.xero_org_default_sales_tax,
        xero_org_default_purchases_tax: xeroDetails.xero_org_default_purchases_tax,
      },
      company ? { is_gst_registered: company.is_gst_registered } : null,
    );

    if (!resolved.resolved || !resolved.taxType) {
      return { applicable: false, taxType: null, source: 'unknown' };
    }

    return {
      applicable: isGstApplicableTaxType(resolved.taxType),
      taxType: resolved.taxType,
      source: resolved.source,
    };
  }

  /** Find an existing journal link (used to prevent duplicates and for edits/deletes). */
  async findActiveLink(
    integration_id: number,
    pt_claim_id: number,
    kind: 'gross_up' | 'gross_up_reversal',
  ): Promise<XeroRetentionJournals | null> {
    return this.retentionJournalsRepo.findOne({
      where: {
        integration_id,
        pt_claim_id,
        kind,
        status: 'POSTED',
      },
    });
  }

  /**
   * Phase 3 — list every retention journal link for a given claim, scoped
   * to the caller's company. Used by the FE Xero Integration expander.
   * Returns plain JSON (newest first); empty array when none exist.
   */
  async listJournalsForClaim(
    pt_claim_id: number,
    company_id: number,
  ): Promise<any[]> {
    if (!pt_claim_id || !company_id) return [];
    const xeroDetails = await this.xeroIntegrationDetailsRepo.findOne({
      where: { company_id, status: 'ACTIVE' as any },
    });
    if (!xeroDetails?.integration_id) return [];
    const rows = await this.retentionJournalsRepo.find({
      where: {
        integration_id: xeroDetails.integration_id,
        pt_claim_id,
      },
      order: { created_on: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      manual_journal_id: r.manual_journal_id,
      kind: r.kind,
      status: r.status,
      retention_ex_gst:
        r.retention_ex_gst != null ? Number(r.retention_ex_gst) : null,
      gst_amount: r.gst_amount != null ? Number(r.gst_amount) : null,
      resolved_tax_type: r.resolved_tax_type,
      resolution_source: r.resolution_source,
      narration: r.narration,
      account_1_code: r.account_1_code,
      account_2_code: r.account_2_code,
      deep_link_url:
        r.deep_link_url ||
        (r.manual_journal_id
          ? `https://go.xero.com/Bank/RestoreManualJournal.aspx?ID=${r.manual_journal_id}`
          : null),
      error_text: r.error_text,
      created_on: r.created_on ? r.created_on.toISOString() : null,
    }));
  }

  /**
   * Anti-echo lookup used by the MANUALJOURNAL webhook handler. The
   * lookup is scoped to the calling integration (derived from tenant_id)
   * so an MJ id collision across tenants — or a stale row from another
   * tenant — cannot incorrectly suppress an external manual journal.
   */
  async findByManualJournalId(
    manual_journal_id: string,
    integration_id?: number,
  ): Promise<XeroRetentionJournals | null> {
    if (!manual_journal_id) return null;
    const where: any = { manual_journal_id };
    if (integration_id) where.integration_id = integration_id;
    return this.retentionJournalsRepo.findOne({ where });
  }

  /**
   * Build a balanced 2-line POSTED Manual Journal for the GST portion of
   * retention. `kind`:
   *   - 'gross_up'         → Claim creation. DR Retention Payable, CR Retention Held.
   *   - 'gross_up_reversal'→ Retention claim creation. Opposite signs.
   */
  private buildJournalPayload(
    args: PostJournalArgs,
    kind: 'gross_up' | 'gross_up_reversal',
    gstAmount: number,
    taxType: string,
  ): ManualJournal {
    const xd = args.xeroDetails;
    const claim = args.claim;
    const isBillable = claim?.claim_type === 'Billable';
    // For Billable (bills/payable side) — DR retention_payable_retained, CR liability_payable.
    // For Receivable (invoices/receivable side) — DR liability_receivable, CR retention_receivable_retained.
    const retainedCode = isBillable
      ? xd.retention_payable_retained_code
      : xd.retention_receivable_retained_code;
    const liabilityCode = isBillable
      ? xd.liability_payable_code
      : xd.liability_receivable_code;

    const grossUpDR = isBillable ? retainedCode : liabilityCode;
    const grossUpCR = isBillable ? liabilityCode : retainedCode;

    // Reversal swaps debits ↔ credits.
    const drCode = kind === 'gross_up' ? grossUpDR : grossUpCR;
    const crCode = kind === 'gross_up' ? grossUpCR : grossUpDR;

    const amount = Math.round(Math.abs(gstAmount) * 100) / 100;
    const narration =
      kind === 'gross_up'
        ? `PayTrade GST gross-up — claim ${claim?.payment_claim_id || claim?.id} (retention $${args.retentionExGst.toFixed(2)} ex-GST)`
        : `PayTrade GST gross-up reversal — retention claim ${claim?.payment_claim_id || claim?.id} (retention $${args.retentionExGst.toFixed(2)} ex-GST)`;

    const debitLine: ManualJournalLine = {
      lineAmount: amount,
      accountCode: drCode,
      description: narration,
      taxType: taxType || undefined,
    };
    const creditLine: ManualJournalLine = {
      lineAmount: -amount,
      accountCode: crCode,
      description: narration,
      taxType: taxType || undefined,
    };

    const date = args.posted_date
      ? moment(args.posted_date).format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');

    return {
      narration,
      date,
      status: ManualJournal.StatusEnum.POSTED,
      showOnCashBasisReports: true,
      journalLines: [debitLine, creditLine],
    } as ManualJournal;
  }

  /**
   * Post a gross-up (or reversal) MJ. Returns the created link row, or null
   * if the operation was skipped (with a sync log already written) or
   * failed (with the failure log already written).
   */
  async postGrossUpJournal(
    decoded: any,
    args: PostJournalArgs,
    kind: 'gross_up' | 'gross_up_reversal',
    xeroClient: XeroClient,
  ): Promise<XeroRetentionJournals | null> {
    const xd = args.xeroDetails;
    const claim = args.claim;
    if (!this.isAutoGrossUpEnabled(xd)) {
      return null;
    }

    const integration_id = xd.integration_id;
    const pt_claim_id = claim?.payment_claim_id;

    const existing = await this.findActiveLink(integration_id, pt_claim_id, kind);
    if (existing) {
      this.logger.log(
        `[MJ_${kind.toUpperCase()}] active link already exists for claim ${pt_claim_id} (mj=${existing.manual_journal_id}); skipping duplicate post.`,
      );
      return existing;
    }

    const retentionExGst = Number(args.retentionExGst) || 0;
    if (retentionExGst <= 0) {
      await this.writeSkippedLog(decoded, args, kind, 'retention amount is zero');
      return null;
    }

    // Need both retained + liability codes for the 2-line MJ shape.
    const isBillable = claim?.claim_type === 'Billable';
    const retainedCode = isBillable
      ? xd.retention_payable_retained_code
      : xd.retention_receivable_retained_code;
    const liabilityCode = isBillable
      ? xd.liability_payable_code
      : xd.liability_receivable_code;
    if (!retainedCode || !liabilityCode) {
      await this.writeSkippedLog(
        decoded,
        args,
        kind,
        'retention/liability account codes not configured',
      );
      return null;
    }

    const applicability = await this.resolveGstApplicability(
      claim,
      args.contact,
      xd,
      args.baseLineTaxType,
    );
    if (!applicability.applicable || !applicability.taxType) {
      await this.writeSkippedLog(
        decoded,
        args,
        kind,
        applicability.source === 'unknown'
          ? 'GST applicability could not be determined (no contact/org/company GST signal)'
          : `effective tax type ${applicability.taxType || 'unknown'} is non-GST (source ${applicability.source})`,
      );
      return null;
    }

    const gstAmount = Math.round(retentionExGst * GST_RATE * 100) / 100;
    if (gstAmount <= 0) {
      await this.writeSkippedLog(decoded, args, kind, 'computed GST amount is zero');
      return null;
    }

    const payload = this.buildJournalPayload(args, kind, gstAmount, applicability.taxType);

    // Diagnostic: log exactly what we're sending so we can correlate against
    // what Xero booked if a user reports the MJ "isn't grossing up".
    this.logger.log(
      `[MJ_${kind.toUpperCase()}] posting MJ for claim ${pt_claim_id}: ` +
        `retentionExGst=${retentionExGst} gstAmount=${gstAmount} ` +
        `taxType=${applicability.taxType} (source=${applicability.source}) ` +
        `lines=${JSON.stringify(
          (payload.journalLines || []).map((l: any) => ({
            accountCode: l.accountCode,
            lineAmount: l.lineAmount,
            taxType: l.taxType,
          })),
        )}`,
    );

    let manualJournalId: string | null = null;
    let createdJournal: any = null;
    try {
      await this.xeroService.refreshTokenSet(xd.company_id, xeroClient);
      const resp = await xeroClient.accountingApi.createManualJournals(
        xd.tenant_id,
        { manualJournals: [payload] },
        true,
      );
      const created = resp?.body?.manualJournals?.[0];
      manualJournalId = created?.manualJournalID || null;
      createdJournal = created || null;
      if (!manualJournalId) {
        throw new Error(
          `Xero did not return a manualJournalID (response status=${(resp?.response as any)?.statusCode ?? 'unknown'})`,
        );
      }
      // Diagnostic: log the lines as Xero recorded them — accountCode,
      // grossAmount, netAmount, taxAmount, taxType — so we can confirm Xero
      // booked the GST portion and not some other amount.
      this.logger.log(
        `[MJ_${kind.toUpperCase()}] Xero accepted MJ ${manualJournalId} ` +
          `status=${created?.status} narration="${created?.narration}" date=${created?.date} ` +
          `lines=${JSON.stringify(
            (created?.journalLines || []).map((l: any) => ({
              accountCode: l.accountCode,
              accountID: l.accountID,
              lineAmount: l.lineAmount,
              grossAmount: l.grossAmount,
              netAmount: l.netAmount,
              taxAmount: l.taxAmount,
              taxType: l.taxType,
            })),
          )}`,
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.body?.Message ||
        err?.response?.body?.message ||
        err?.message ||
        String(err);
      this.logger.error(
        `[MJ_${kind.toUpperCase()}] createManualJournals failed for claim ${pt_claim_id}: ${errMsg}`,
      );
      // Persist a FAILED row so the FE can deterministically expose
      // a retry button for the latest failed attempt.
      try {
        const failedLink = this.retentionJournalsRepo.create({
          integration_id,
          tenant_id: xd.tenant_id,
          pt_claim_id,
          pt_retention_id: args.pt_retention_id ?? null,
          pt_sub_payment_id: args.pt_sub_payment_id ?? null,
          invoice_id: args.invoice_id ?? null,
          manual_journal_id: null,
          kind,
          status: 'FAILED',
          retention_ex_gst: retentionExGst,
          gst_amount: gstAmount,
          resolved_tax_type: applicability.taxType,
          resolution_source: applicability.source,
          narration: payload.narration,
          account_1_code:
            (payload.journalLines?.[0] as ManualJournalLine | undefined)
              ?.accountCode ?? null,
          account_2_code:
            (payload.journalLines?.[1] as ManualJournalLine | undefined)
              ?.accountCode ?? null,
          deep_link_url: null,
          error_text: errMsg,
          created_by: decoded?.userId ?? null,
          created_group: 'SYSTEM',
        });
        await this.retentionJournalsRepo.save(failedLink);
      } catch (persistErr: any) {
        this.logger.error(
          `[MJ_${kind.toUpperCase()}] could not persist FAILED row: ${persistErr?.message || persistErr}`,
        );
      }
      await this.writeFailureLog(decoded, args, kind, errMsg);
      return null;
    }

    const journalLines = (payload.journalLines || []) as ManualJournalLine[];
    const account_1_code =
      journalLines[0]?.accountCode != null
        ? String(journalLines[0].accountCode)
        : null;
    const account_2_code =
      journalLines[1]?.accountCode != null
        ? String(journalLines[1].accountCode)
        : null;

    // Build a Xero deep-link to the manual journal so users can click
    // through from the FE table directly to the source ledger entry.
    const deep_link_url = manualJournalId
      ? `https://go.xero.com/Bank/RestoreManualJournal.aspx?ID=${manualJournalId}`
      : null;

    const link = this.retentionJournalsRepo.create({
      integration_id,
      tenant_id: xd.tenant_id,
      pt_claim_id,
      pt_retention_id: args.pt_retention_id ?? null,
      pt_sub_payment_id: args.pt_sub_payment_id ?? null,
      invoice_id: args.invoice_id ?? null,
      manual_journal_id: manualJournalId,
      kind,
      status: 'POSTED',
      retention_ex_gst: retentionExGst,
      gst_amount: gstAmount,
      resolved_tax_type: applicability.taxType,
      resolution_source: applicability.source,
      narration: payload.narration,
      account_1_code,
      account_2_code,
      deep_link_url,
      created_by: decoded?.userId ?? null,
      created_group: 'SYSTEM',
    });
    const saved = await this.retentionJournalsRepo.save(link);

    await this.writeSuccessLog(
      decoded,
      args,
      kind,
      saved,
      applicability,
      payload,
      createdJournal,
    );

    return saved;
  }

  async voidGrossUpJournal(
    decoded: any,
    link: XeroRetentionJournals,
    xeroClient: XeroClient,
    company_id: number,
    reason: string,
    pt_claim_id_for_log?: number,
  ): Promise<boolean> {
    if (!link?.manual_journal_id || link.status !== 'POSTED') {
      return false;
    }
    try {
      await this.xeroService.refreshTokenSet(company_id, xeroClient);
      await xeroClient.accountingApi.updateManualJournal(
        link.tenant_id,
        link.manual_journal_id,
        {
          manualJournals: [
            {
              narration: link.narration || 'PayTrade GST gross-up (voided)',
              status: ManualJournal.StatusEnum.DELETED,
            } as ManualJournal,
          ],
        },
      );
      link.status = 'DELETED';
      link.updated_by = decoded?.userId ?? null;
      link.updated_group = 'SYSTEM';
      link.updated_on = new Date();
      await this.retentionJournalsRepo.save(link);

      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: null,
        api_name: 'voidGrossUpManualJournal',
        api_payload: {
          manual_journal_id: link.manual_journal_id,
          payment_claim_id: pt_claim_id_for_log ?? link.pt_claim_id,
          reason,
        },
        integration_id: link.integration_id,
        log_template_id: 602,
        dynamic_values: {
          manual_journal_id: link.manual_journal_id,
          payment_claim_id: pt_claim_id_for_log ?? link.pt_claim_id,
          reason,
        },
        project_id: null,
        contract_id: null,
        reference: { xeroId: link.manual_journal_id, paytradeId: link.pt_claim_id },
        reference_id: link.pt_claim_id != null ? String(link.pt_claim_id) : null,
        history: [
          `MJ void triggered for claim ${pt_claim_id_for_log ?? link.pt_claim_id}`,
          `Reason: ${reason}`,
        ],
        important_checks: { 'Manual journal void': 'Ok' },
        error_message: null,
        xero_records: [],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return true;
    } catch (err: any) {
      const errMsg =
        err?.response?.body?.Message ||
        err?.response?.body?.message ||
        err?.message ||
        String(err);
      this.logger.error(
        `[MJ_VOID] failed to void manual journal ${link.manual_journal_id}: ${errMsg}`,
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: null,
        api_name: 'voidGrossUpManualJournal',
        api_payload: {
          manual_journal_id: link.manual_journal_id,
          payment_claim_id: pt_claim_id_for_log ?? link.pt_claim_id,
        },
        integration_id: link.integration_id,
        log_template_id: 605,
        dynamic_values: {
          manual_journal_id: link.manual_journal_id,
          payment_claim_id: pt_claim_id_for_log ?? link.pt_claim_id,
          error: errMsg,
        },
        project_id: null,
        contract_id: null,
        reference: { xeroId: link.manual_journal_id, paytradeId: link.pt_claim_id },
        reference_id: link.pt_claim_id != null ? String(link.pt_claim_id) : null,
        history: [
          `MJ void failed for claim ${pt_claim_id_for_log ?? link.pt_claim_id}`,
        ],
        important_checks: { 'Manual journal void': 'Failed' },
        error_message: errMsg,
        xero_records: [],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }
  }

  async voidAllForClaim(
    decoded: any,
    integration_id: number,
    pt_claim_id: number,
    xeroClient: XeroClient,
    company_id: number,
    reason: string,
  ): Promise<number> {
    const links = await this.retentionJournalsRepo.find({
      where: { integration_id, pt_claim_id, status: 'POSTED' },
    });
    let voided = 0;
    for (const link of links) {
      const ok = await this.voidGrossUpJournal(
        decoded,
        link,
        xeroClient,
        company_id,
        reason,
        pt_claim_id,
      );
      if (ok) voided++;
    }
    return voided;
  }

  // ---------------------------------------------------------------------------
  // Sync log helpers
  // ---------------------------------------------------------------------------

  private async writeSuccessLog(
    decoded: any,
    args: PostJournalArgs,
    kind: 'gross_up' | 'gross_up_reversal',
    link: XeroRetentionJournals,
    applicability: ResolvedGstApplicability,
    requestPayload?: ManualJournal,
    createdJournal?: any,
  ) {
    const templateId = kind === 'gross_up' ? 600 : 601;
    const claim = args.claim;

    // Snapshot request lines (what we asked Xero to post) and response
    // lines (what Xero actually booked) so the sync log shows exactly
    // which accounts and amounts landed.
    const requestLines = (requestPayload?.journalLines || []).map((l: any) => ({
      accountCode: l.accountCode,
      lineAmount: l.lineAmount,
      taxType: l.taxType,
      description: l.description,
    }));
    const responseLines = (createdJournal?.journalLines || []).map((l: any) => ({
      accountCode: l.accountCode,
      accountID: l.accountID,
      lineAmount: l.lineAmount,
      grossAmount: l.grossAmount,
      netAmount: l.netAmount,
      taxAmount: l.taxAmount,
      taxType: l.taxType,
      description: l.description,
    }));

    await this.xeroService.insertXeroSyncLogs(decoded, {
      id: null,
      api_name: 'createGrossUpManualJournal',
      api_payload: {
        payment_claim_id: claim?.payment_claim_id,
        kind,
        retention_ex_gst: link.retention_ex_gst,
        gst_amount: link.gst_amount,
        resolved_tax_type: applicability.taxType,
        resolution_source: applicability.source,
        request_lines: requestLines,
      },
      integration_id: args.xeroDetails.integration_id,
      log_template_id: templateId,
      dynamic_values: {
        manual_journal_id: link.manual_journal_id,
        payment_claim_id: claim?.payment_claim_id,
        gst_amount: link.gst_amount,
        source: applicability.source,
      },
      project_id: null,
      contract_id: null,
      reference: {
        xeroId: link.manual_journal_id,
        paytradeId: claim?.id,
      },
      reference_id: claim?.id != null ? String(claim.id) : null,
      history: [
        `Posted ${kind === 'gross_up' ? 'gross-up' : 'reversal'} MJ for claim ${claim?.payment_claim_id}`,
        `Tax type ${applicability.taxType} (source ${applicability.source})`,
        `Retention ex-GST $${Number(link.retention_ex_gst).toFixed(2)}; GST gross-up $${Number(link.gst_amount).toFixed(2)}`,
        requestLines.length
          ? `Requested lines: ${requestLines
              .map(
                (l) =>
                  `${Number(l.lineAmount) >= 0 ? 'DR' : 'CR'} ${l.accountCode} ${Math.abs(Number(l.lineAmount)).toFixed(2)}`,
              )
              .join(' / ')}`
          : 'Requested lines: (none)',
        responseLines.length
          ? `Xero booked: ${responseLines
              .map(
                (l) =>
                  `${Number(l.lineAmount) >= 0 ? 'DR' : 'CR'} ${l.accountCode} ${Math.abs(Number(l.lineAmount)).toFixed(2)} (net ${l.netAmount ?? '-'} / tax ${l.taxAmount ?? '-'} / gross ${l.grossAmount ?? '-'})`,
              )
              .join(' / ')}`
          : 'Xero booked: (no journalLines returned)',
      ],
      important_checks: {
        'GST applicability resolution': 'Ok',
        'Manual journal post': 'Ok',
      },
      error_message: null,
      xero_records: createdJournal ? [createdJournal] : [],
      paytrade_records: [claim],
      new_records: null,
      updated_records: null,
      synced_records: null,
    });
  }

  private async writeSkippedLog(
    decoded: any,
    args: PostJournalArgs,
    kind: 'gross_up' | 'gross_up_reversal',
    reason: string,
  ) {
    const claim = args.claim;
    await this.xeroService.insertXeroSyncLogs(decoded, {
      id: null,
      api_name: 'createGrossUpManualJournal',
      api_payload: {
        payment_claim_id: claim?.payment_claim_id,
        kind,
      },
      integration_id: args.xeroDetails.integration_id,
      log_template_id: 603,
      dynamic_values: {
        payment_claim_id: claim?.payment_claim_id,
        reason,
      },
      project_id: null,
      contract_id: null,
      reference: { xeroId: null, paytradeId: claim?.id },
      reference_id: claim?.id != null ? String(claim.id) : null,
      history: [
        `MJ skipped for claim ${claim?.payment_claim_id}`,
        `Reason: ${reason}`,
      ],
      important_checks: { 'GST applicability resolution': 'Skipped' },
      error_message: null,
      xero_records: [],
      paytrade_records: [claim],
      new_records: null,
      updated_records: null,
      synced_records: null,
    });
  }

  private async writeFailureLog(
    decoded: any,
    args: PostJournalArgs,
    kind: 'gross_up' | 'gross_up_reversal',
    errMsg: string,
  ) {
    const claim = args.claim;
    await this.xeroService.insertXeroSyncLogs(decoded, {
      id: null,
      api_name: 'createGrossUpManualJournal',
      api_payload: {
        payment_claim_id: claim?.payment_claim_id,
        kind,
      },
      integration_id: args.xeroDetails.integration_id,
      log_template_id: 604,
      dynamic_values: {
        payment_claim_id: claim?.payment_claim_id,
        error: errMsg,
      },
      project_id: null,
      contract_id: null,
      reference: { xeroId: null, paytradeId: claim?.id },
      reference_id: claim?.id != null ? String(claim.id) : null,
      history: [
        `MJ post failed for claim ${claim?.payment_claim_id}`,
      ],
      important_checks: { 'Manual journal post': 'Failed' },
      error_message: errMsg,
      xero_records: [],
      paytrade_records: [claim],
      new_records: null,
      updated_records: null,
      synced_records: null,
    });
  }
}
