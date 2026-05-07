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

  /** True when Phase 3 auto gross-up is active for this integration. */
  isAutoGrossUpEnabled(xeroDetails: XeroIntegrationDetails | null | undefined): boolean {
    if (!xeroDetails) return false;
    if (!xeroDetails.auto_gross_up_retention_journals) return false;
    if (xeroDetails.simplified_retention_accounting) return false;
    if (xeroDetails.retention_recording_mode !== 'ex_gst') return false;
    return true;
  }

  /**
   * Resolve whether GST grossing-up should be applied for this claim, and
   * the tax type that drives it. See the smart-order docblock at the top of
   * the file.
   */
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

    let manualJournalId: string | null = null;
    try {
      await this.xeroService.refreshTokenSet(xd.company_id, xeroClient);
      const resp = await xeroClient.accountingApi.createManualJournals(
        xd.tenant_id,
        { manualJournals: [payload] },
        true,
      );
      const created = resp?.body?.manualJournals?.[0];
      manualJournalId = created?.manualJournalID || null;
      if (!manualJournalId) {
        throw new Error(
          `Xero did not return a manualJournalID (response status=${(resp?.response as any)?.statusCode ?? 'unknown'})`,
        );
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.body?.Message ||
        err?.response?.body?.message ||
        err?.message ||
        String(err);
      this.logger.error(
        `[MJ_${kind.toUpperCase()}] createManualJournals failed for claim ${pt_claim_id}: ${errMsg}`,
      );
      await this.writeFailureLog(decoded, args, kind, errMsg);
      return null;
    }

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
      created_by: decoded?.userId ?? null,
      created_group: 'SYSTEM',
    });
    const saved = await this.retentionJournalsRepo.save(link);

    await this.writeSuccessLog(decoded, args, kind, saved, applicability);

    return saved;
  }

  /**
   * Void a previously-posted gross-up journal (used by edit-recreate and
   * delete flows). Updates Xero to status DELETED and marks the link row.
   */
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

  /**
   * Convenience: void all active links for a claim (used on delete and on
   * edit before re-posting). Both 'gross_up' and 'gross_up_reversal' kinds
   * are handled.
   */
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
  ) {
    const templateId = kind === 'gross_up' ? 600 : 601;
    const claim = args.claim;
    await this.xeroService.insertXeroSyncLogs(decoded, {
      id: null,
      api_name: 'createGrossUpManualJournal',
      api_payload: {
        payment_claim_id: claim?.payment_claim_id,
        kind,
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
      ],
      important_checks: {
        'GST applicability resolution': 'Ok',
        'Manual journal post': 'Ok',
      },
      error_message: null,
      xero_records: [],
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
