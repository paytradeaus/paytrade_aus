import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { buildMissingFieldsLog } from '../integrations/xero/utils/xero-missing-fields.util';
import { extractAxiosErrorContext } from '../error-handler';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { jwtConstants } from 'src/api/auth/constants';
import { XeroPaymentsService } from '../integrations/xero/payments/xero-payments.service';
import {
  buildXeroDeepLink as buildXeroSyncLogDeepLink,
  buildPaytradeDeepLink as buildPaytradeSyncLogDeepLink,
} from '../integrations/xero/utils/sync-log-deep-links';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import {
  Contact,
  CreditNote,
  Invoice,
  LineAmountTypes,
  Overpayment,
  Payment,
  XeroClient,
} from 'xero-node';
import { XeroService } from '../integrations/xero/xero.service';
import { XeroContactsService } from '../integrations/xero/contacts/xero-contacts.service';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { XeroPayments } from 'src/entities/xero-payments.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import {
  AddPaymentClaimInput,
  EditDetailsOfAPaymentClaimInput,
} from 'src/api/users/banking/payment-claims/payment-claims.input';
import { handleAxiosError } from '../error-handler';
import { PaymentsService } from 'src/api/users/banking/payments/payments.service';
import {
  AddPaymentInput,
  ChangeStatusOfAPaymentInput,
  EditDetailsOfAPaymentInput,
} from 'src/api/users/banking/payments/payments.input';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { ClientSuppliersDetailsService } from 'src/api/users/client-suppliers-details/client-suppliers-details.service';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import { XeroInvoicesService } from '../integrations/xero/invoicesAndBills/xero-invoices.service';
import { XeroManualJournalService } from '../integrations/xero/manualJournals/xero-manual-journal.service';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { resolveSupplierBillCode } from '../integrations/xero/invoicesAndBills/supplier-bill-code-resolver';
import { UpdateClientSuppliersDetailInput } from 'src/api/users/client-suppliers-details/dto/update-client-suppliers-detail.input';
import { XeroWaitQueueService } from './waitQueue/webhookWait.service';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { XeroResolver } from '../integrations/xero/xero.resolver';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { isWebhookProcessableStatus } from './integration-status.constants';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class XeroWebhookService {
  private xero: XeroClient;
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(XeroContactDetails)
    private xeroContactDetails: Repository<XeroContactDetails>,
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(XeroInvoicesBills)
    private xeroInvoicesBills: Repository<XeroInvoicesBills>,
    @InjectRepository(XeroContractDetails)
    private xeroContractDetails: Repository<XeroContractDetails>,
    @InjectRepository(XeroPayments)
    private xeroPayments: Repository<XeroPayments>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(XeroProjectDetails)
    private xeroProjectDetails: Repository<XeroProjectDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(XeroBankAccountDetails)
    private xeroBankAccountDetails: Repository<XeroBankAccountDetails>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(BankAccounts)
    private bankAccounts: Repository<BankAccounts>,
    @InjectRepository(XeroSyncLogs)
    private xeroSyncLogs: Repository<XeroSyncLogs>,
    @InjectRepository(TransactionDetails)
    private transactionDetails: Repository<TransactionDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly companyUserRolesRepo: Repository<CompanyUserRoles>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(ClientSupplierProjectXeroAccountCodes)
    private supplierProjectAccountCodes: Repository<ClientSupplierProjectXeroAccountCodes>,
    @Inject(forwardRef(() => XeroResolver))
    private readonly xeroResolver: XeroResolver,
    private readonly xeroService: XeroService,
    private readonly xeroContactsService: XeroContactsService,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly paymentsService: PaymentsService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly clientSuppliersDetailsService: ClientSuppliersDetailsService,
    private readonly xeroInvoicesService: XeroInvoicesService,
    private readonly xeroManualJournalService: XeroManualJournalService,
    private readonly xeroWaitQueueService: XeroWaitQueueService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => XeroPaymentsService))
    private readonly xeroPaymentsService: XeroPaymentsService,
  ) {
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_CALLBACK_URL + 'xero/callback'],
      scopes: [
        'openid',
        'email',
        'profile',
        'accounting.transactions',
        'accounting.settings', // Required for tenants
        'accounting.settings.read',
        'offline_access', // Required for token refresh
        'projects', // Required for projects
        'accounting.contacts', // Required for contacts
        'accounting.contacts.read',
      ],
      state: '',
      httpTimeout: 10000, // Set timeout for requests
    });

    this.logger = new PaytradeLogger('XERO_WEBHOOK_SERVICE');
  }

  private async safeWebhookDeletePayment(
    decoded: any,
    paytradePayload: ChangeStatusOfAPaymentInput,
    marker: string,
  ) {
    const payment_id = paytradePayload?.payment_id;
    try {
      const pt = payment_id
        ? await this.paymentDetails.findOne({ where: { payment_id } })
        : null;
      if (!pt) {
        this.logger.warn(`[XERO_DELETE_GUARD][${marker}] payment_id=${payment_id} not found; skipping`);
        return null;
      }
      if (pt.current_status === 'Deleted') return null;

      const subs = await this.subPaymentsRepo.find({ where: { payment_id } });
      const isConfirmed = subs.some(
        (s) => !!s.is_paid_confirmed || !!s.is_received_confirmed || !!s.is_retention_confirmed,
      );
      const xeroMirror = await this.xeroPayments.findOne({
        where: { pt_payment_id: payment_id, status: Not('DELETED') },
      });

      if (!isConfirmed && !xeroMirror) {
        this.logger.warn(
          `[XERO_DELETE_GUARD][${marker}] refusing delete payment_id=${payment_id} type=${pt.payment_type} status=${pt.current_status}: unconfirmed, no xero mirror`,
        );
        return null;
      }
    } catch (guardErr) {
      this.logger.error(
        `[XERO_DELETE_GUARD][${marker}] guard failed for payment_id=${payment_id}: ${guardErr?.message || guardErr}`,
      );
    }

    return this.paymentsService.changeStatusOfAPayment(
      decoded,
      paytradePayload,
      decoded?.userId,
    );
  }

  /**
   * Task #50/#53 — Pure matcher for Xero BankTransfer candidates against a
   * PT retention payment leg.
   *
   * Resolution order:
   *   0. If `preferKnownBankTransferId` is supplied (legacy fast path), only
   *      return the matching transfer (no further filtering).
   *   1. Reference round-trip — prefer transfers whose `reference` equals
   *      `PT-RET-{pt_payment_id}` and amount matches AND in window.
   *   2. AND on accounts (one side === paymentAccountId AND the *other*
   *      side is a different account) + amount + ±windowDays date window.
   *   3. Surface out-of-window candidates separately so the caller can log
   *      template 489.
   *
   * Pure: no DB, no Xero API, no logging. Caller decides what to do with
   * the result (link in webhook, skip & log in scheduler).
   */
  public matchRetentionTransferCandidates(opts: {
    allCandidateTransfers: any[];
    paymentAccountId: string;
    retentionAmount: number;
    paymentDate: Date | null;
    ptRefForRoundTrip: string | null;
    preferKnownBankTransferId?: string | null;
    windowDays?: number;
  }): {
    matched: any[];
    outOfWindow: any[];
    matchedByReference: boolean;
    windowDays: number;
  } {
    const windowDays = opts.windowDays ?? 14;
    const all = opts.allCandidateTransfers || [];
    const paymentDateMs =
      opts.paymentDate && !Number.isNaN(opts.paymentDate.getTime())
        ? opts.paymentDate.getTime()
        : null;

    const isInWindow = (t: any): boolean => {
      // Treat missing/invalid dates as a hard non-match (per architect
      // feedback): otherwise the ±N-day constraint is silently bypassed.
      if (!paymentDateMs) return false;
      if (!t?.date) return false;
      const tMs = new Date(t.date as any).getTime();
      if (Number.isNaN(tMs)) return false;
      const diffDays =
        Math.abs(tMs - paymentDateMs) / (24 * 60 * 60 * 1000);
      return diffDays <= windowDays;
    };

    if (opts.preferKnownBankTransferId) {
      const known = all.filter(
        (t: any) => t?.bankTransferID === opts.preferKnownBankTransferId,
      );
      return {
        matched: known,
        outOfWindow: [],
        matchedByReference: false,
        windowDays,
      };
    }

    let matched: any[] = [];
    let matchedByReference = false;

    // (1) Reference round-trip shortcut.
    if (opts.ptRefForRoundTrip) {
      matched = all.filter((t: any) => {
        const refMatches =
          (t?.reference || '').trim() === opts.ptRefForRoundTrip;
        const amountMatches =
          Math.abs(Number(t?.amount)) ===
          Math.abs(Number(opts.retentionAmount));
        return refMatches && amountMatches && isInWindow(t);
      });
      if (matched.length > 0) {
        matchedByReference = true;
      }
    }

    // (2) Account AND-pair + amount + window.
    if (matched.length === 0) {
      matched = all.filter((t: any) => {
        const fromAcc = t?.fromBankAccount?.accountID;
        const toAcc = t?.toBankAccount?.accountID;
        const fromMatches = fromAcc === opts.paymentAccountId;
        const toMatches = toAcc === opts.paymentAccountId;
        if (!fromMatches && !toMatches) return false;
        const otherSide = fromMatches ? toAcc : fromAcc;
        if (!otherSide || otherSide === opts.paymentAccountId) return false;
        const amountMatches =
          Math.abs(Number(t?.amount)) ===
          Math.abs(Number(opts.retentionAmount));
        if (!amountMatches) return false;
        return isInWindow(t);
      });
    }

    // (3) Out-of-window companions — surfaced only when nothing in-window
    // was found, so the caller can write a template-489 log.
    let outOfWindow: any[] = [];
    if (matched.length === 0) {
      outOfWindow = all.filter((t: any) => {
        const fromAcc = t?.fromBankAccount?.accountID;
        const toAcc = t?.toBankAccount?.accountID;
        const fromMatches = fromAcc === opts.paymentAccountId;
        const toMatches = toAcc === opts.paymentAccountId;
        if (!fromMatches && !toMatches) return false;
        const amountMatches =
          Math.abs(Number(t?.amount)) ===
          Math.abs(Number(opts.retentionAmount));
        return amountMatches && !isInWindow(t);
      });
    }

    return { matched, outOfWindow, matchedByReference, windowDays };
  }

  /**
   * Classify a Xero invoice/bill as a regular Claim or a Retention Release
   * (cash_retention_type = 'Claim' | 'Retention claim') in a way that is
   * robust to the common misconfiguration where the user has pointed
   * `retention_payable_release_code` and `retention_payable_retained_code`
   * (or the receivable equivalents) at the same Xero account.
   *
   * Option C predicate (agreed with product):
   *   isRelease  iff (no base bill_code/invoice_code line is present)
   *              AND (net signed sum on retained_code <= 0)
   *              AND (at least one line on release_code OR retained_code).
   *
   * Why: PayTrade's own producer (xero-invoices.service.ts ~lines 786-938)
   * writes a release as base items on `release_code` (positive) plus a
   * NEGATIVE balancing line on `retained_code` and a POSITIVE balancing
   * line on `liability_code`, and never includes a `bill_code` /
   * `invoice_code` line. A regular Claim with a retention component does
   * include base lines on `bill_code`/`invoice_code` and a POSITIVE line
   * on `retained_code`. The presence of a base line + sign of the
   * retained-code line are therefore the two signals that uniquely
   * separate the two shapes even when codes are shared.
   *
   * Returns the classifier flag plus the lineItem1/lineItem2 booleans
   * used by the existing 2-line guard, with a `codesShared` adjustment
   * that prevents the guard from false-triggering when retained_code
   * === release_code.
   */
  static classifyRetentionShape(invoice: any, xeroDetails: any): {
    retentionClaimnlineItem: boolean;
    lineItem1: boolean;
    lineItem2: boolean;
    hasBaseLine: boolean;
    netRetainedSigned: number;
    codesShared: boolean;
  } {
    const isAccPay = invoice?.type === Invoice.TypeEnum.ACCPAY;
    const releaseCode = isAccPay
      ? xeroDetails?.retention_payable_release_code
      : xeroDetails?.retention_receivable_release_code;
    const retainedCode = isAccPay
      ? xeroDetails?.retention_payable_retained_code
      : xeroDetails?.retention_receivable_retained_code;
    const liabilityCode = isAccPay
      ? xeroDetails?.liability_payable_code
      : xeroDetails?.liability_receivable_code;
    const baseCode = isAccPay
      ? xeroDetails?.bill_code
      : xeroDetails?.invoice_code;

    const codesShared = !!(
      releaseCode &&
      retainedCode &&
      releaseCode === retainedCode
    );

    const lineItems: any[] = invoice?.lineItems || [];

    const hasBaseLine =
      !!baseCode && lineItems.some((item) => item?.accountCode === baseCode);
    const hasReleaseCodeLine =
      !!releaseCode &&
      lineItems.some((item) => item?.accountCode === releaseCode);
    const hasRetainedCodeLine =
      !!retainedCode &&
      lineItems.some((item) => item?.accountCode === retainedCode);
    const hasLiabilityLine =
      !!liabilityCode &&
      lineItems.some((item) => item?.accountCode === liabilityCode);

    const netRetainedSigned = lineItems
      .filter((item) => retainedCode && item?.accountCode === retainedCode)
      .reduce(
        (sum: number, item: any) => sum + Number(item?.unitAmount || 0),
        0,
      );

    // Option C: a release has no base line AND nets <=0 on the retained
    // code AND has at least one line on release_code (or retained_code,
    // since when codes are shared they are the same line).
    const retentionClaimnlineItem =
      !hasBaseLine &&
      (hasReleaseCodeLine || hasRetainedCodeLine) &&
      netRetainedSigned <= 0;

    // Preserve the existing 2-line guard semantics, but when codes are
    // shared do not double-count the same line as both release and
    // retained — collapse to a single signal so (lineItem1 XOR lineItem2)
    // does not false-trigger the "There should be 2 line items" error.
    const lineItem1 = retentionClaimnlineItem
      ? hasReleaseCodeLine
      : hasRetainedCodeLine;
    const lineItem2 = hasLiabilityLine;

    return {
      retentionClaimnlineItem,
      lineItem1,
      lineItem2,
      hasBaseLine,
      netRetainedSigned,
      codesShared,
    };
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  /**
   * Task #41 — Resolve the inbound bill_code for the given supplier (and
   * optional project) on a Xero ACCPAY webhook. When variable mode is OFF
   * this returns `xeroDetails.bill_code` unchanged so legacy behaviour is
   * preserved. When variable mode is ON:
   *   - load the supplier's per-project overrides
   *   - if no per-supplier match AND a naming convention is configured,
   *     fetch the Xero chart of accounts and try to auto-discover by
   *     matching the candidate `accountCode` of a non-retention/liability
   *     line against the CoA name
   *   - persist auto-learned codes to the override table (or supplier
   *     default when projectId is null) and write sync log 608
   *   - fall back to xeroDetails.bill_code only when allow_fallback is on
   *
   * Returns null when fully unresolved (variable mode + no fallback).
   */
  async resolveInboundBillCode(
    decoded: any,
    xeroDetails: XeroIntegrationDetails | any,
    supplier: ClientSuppliersDetails | null | undefined,
    projectId: number | null,
    invoice: any,
    syncId: string | null = null,
  ): Promise<string | null> {
    const isAccPay = invoice?.type === Invoice.TypeEnum.ACCPAY;
    if (!isAccPay) {
      return xeroDetails?.invoice_code || null;
    }
    if (!xeroDetails?.bill_code_is_variable) {
      return xeroDetails?.bill_code || null;
    }
    let projectOverrides: { project_id: number; account_code: string }[] = [];
    if (supplier?.client_supplier_id) {
      const rows = await this.supplierProjectAccountCodes.find({
        where: { client_supplier_id: supplier.client_supplier_id },
      });
      projectOverrides = rows.map((r) => ({
        project_id: r.project_id,
        account_code: r.account_code,
      }));
    }
    // Try without CoA first to avoid the API hit when supplier already
    // has an override.
    const cheap = resolveSupplierBillCode({
      supplier: supplier
        ? {
            client_supplier_id: supplier.client_supplier_id,
            xero_default_account_code: (supplier as any)
              ?.xero_default_account_code,
          }
        : null,
      projectId,
      xeroDetails: {
        bill_code: xeroDetails?.bill_code,
        bill_code_is_variable: xeroDetails?.bill_code_is_variable,
        bill_code_naming_convention: xeroDetails?.bill_code_naming_convention,
        bill_code_allow_fallback: xeroDetails?.bill_code_allow_fallback,
      },
      projectOverrides,
      direction: 'inbound',
    });
    if (cheap.source === 'project' || cheap.source === 'supplier_default') {
      return cheap.accountCode;
    }
    // Naming-convention discovery — fetch CoA and the candidate code
    // from non-retention/liability lines.
    const knownCodes = new Set(
      [
        xeroDetails?.retention_payable_retained_code,
        xeroDetails?.retention_payable_release_code,
        xeroDetails?.liability_payable_code,
        xeroDetails?.retention_receivable_retained_code,
        xeroDetails?.retention_receivable_release_code,
        xeroDetails?.liability_receivable_code,
      ].filter(Boolean),
    );
    const candidateLine = (invoice?.lineItems || []).find(
      (li: any) => li?.accountCode && !knownCodes.has(li.accountCode),
    );
    const candidateAccountCode = candidateLine?.accountCode || null;
    let chartOfAccounts: any[] = [];
    if (xeroDetails?.bill_code_naming_convention && xeroDetails?.tenant_id) {
      try {
        await this.xeroService.refreshTokenSet(
          xeroDetails.company_id,
          this.xero,
        );
        const resp = await this.xero.accountingApi.getAccounts(
          xeroDetails.tenant_id,
        );
        chartOfAccounts = resp?.body?.accounts || [];
      } catch (e: any) {
        this.logger.error(
          `[VARIABLE_BILL_CODE_INBOUND] CoA fetch failed: ${e?.message || e}`,
        );
      }
    }
    const result = resolveSupplierBillCode({
      supplier: supplier
        ? {
            client_supplier_id: supplier.client_supplier_id,
            xero_default_account_code: (supplier as any)
              ?.xero_default_account_code,
          }
        : null,
      projectId,
      xeroDetails: {
        bill_code: xeroDetails?.bill_code,
        bill_code_is_variable: xeroDetails?.bill_code_is_variable,
        bill_code_naming_convention: xeroDetails?.bill_code_naming_convention,
        bill_code_allow_fallback: xeroDetails?.bill_code_allow_fallback,
      },
      projectOverrides,
      xeroChartOfAccounts: chartOfAccounts,
      candidateAccountCode,
      direction: 'inbound',
    });
    if (result.autoLearned && supplier?.client_supplier_id) {
      try {
        if (result.autoLearned.projectId) {
          await this.supplierProjectAccountCodes.save({
            company_id: xeroDetails?.company_id,
            client_supplier_id: supplier.client_supplier_id,
            project_id: result.autoLearned.projectId,
            account_code: result.autoLearned.accountCode,
            created_by: decoded?.userId || null,
            updated_by: decoded?.userId || null,
          } as any);
        } else if (!supplier?.xero_default_account_code) {
          await this.clientSuppliersDetails.update(
            { client_supplier_id: supplier.client_supplier_id },
            { xero_default_account_code: result.autoLearned.accountCode },
          );
        }
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: syncId,
          api_name: 'resolveInboundBillCode',
          api_payload: {
            invoice_id: invoice?.invoiceID,
            client_supplier_id: supplier.client_supplier_id,
            project_id: result.autoLearned.projectId,
          },
          integration_id: xeroDetails?.integration_id,
          log_template_id: 608,
          dynamic_values: {
            account_code: result.autoLearned.accountCode,
            supplier_name: supplier?.client_supplier_name || '',
            project_id:
              result.autoLearned.projectId == null
                ? ''
                : String(result.autoLearned.projectId),
            naming_convention: xeroDetails?.bill_code_naming_convention || '',
          },
          project_id: result.autoLearned.projectId == null
            ? null
            : (String(result.autoLearned.projectId) as any),
          contract_id: null,
          reference: { xeroId: invoice?.invoiceID, paytradeId: null },
          reference_id: null,
          history: [
            `Auto-learned account code ${result.autoLearned.accountCode} for supplier ${supplier?.client_supplier_name}`,
            'Override saved',
          ],
          important_checks: {
            'Variable bill code resolution': 'Auto-learned',
          },
          error_message: '',
          xero_records: [invoice],
          paytrade_records: [supplier],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
      } catch (e: any) {
        this.logger.error(
          `[VARIABLE_BILL_CODE_608] auto-learn persist failed: ${e?.message || e}`,
        );
      }
    }
    if (result.source === 'unresolved') {
      this.logger.error(
        `[VARIABLE_BILL_CODE_INBOUND_UNRESOLVED] supplier=${supplier?.client_supplier_id} project=${projectId} invoice=${invoice?.invoiceID}`,
      );
      try {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: syncId,
          api_name: 'resolveInboundBillCode',
          api_payload: {
            invoice_id: invoice?.invoiceID,
            invoice_number: invoice?.invoiceNumber,
            client_supplier_id: supplier?.client_supplier_id,
            project_id: projectId,
          },
          integration_id: xeroDetails?.integration_id,
          log_template_id: 609,
          dynamic_values: {
            invoice_number: invoice?.invoiceNumber || invoice?.invoiceID || '',
            supplier_name: supplier?.client_supplier_name || '',
            project_id: projectId == null ? '' : String(projectId),
          },
          project_id: projectId == null ? null : (String(projectId) as any),
          contract_id: null,
          reference: { xeroId: invoice?.invoiceID, paytradeId: null },
          reference_id: null,
          history: [
            `Variable bill code unresolved for supplier ${supplier?.client_supplier_name || supplier?.client_supplier_id}`,
            'Import blocked',
          ],
          important_checks: {
            'Variable bill code resolution': 'Failed',
          },
          error_message:
            'Variable bill code unresolved — supplier has no default account code, no project override, no naming-convention match, and company-level fallback is disabled.',
          xero_records: [invoice],
          paytrade_records: supplier ? [supplier] : [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
      } catch (e: any) {
        this.logger.error(
          `[VARIABLE_BILL_CODE_609] failure log persist failed: ${e?.message || e}`,
        );
      }
      return null;
    }
    return result.accountCode;
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async handleContactCreateUpdate(
    resource_id: string,
    tenant_id: string,
    sync_id?: string,
    data?: any,
    decoded?: any,
  ) {
    this.logger.log(
      `[Xero Service] Contact Update initiated: ${resource_id} (Tenant: ${tenant_id})`,
    );

    try {
      // Multi-row tenant guard: prefer the Connected - active integration
      // when more than one xero_integration_details row points at the same
      // tenant. See webhook-queue-consumer.service.ts for the full backstory.
      const candidates = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        candidates.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? candidates[0];

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        this.logger.error(
          `[Xero Webhook] No integration found for tenant id: ${tenant_id}`,
        );
        return false;
      }

      if (
        !isWebhookProcessableStatus(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        this.logger.error(
          `[Xero Webhook] Integration not in a processable state (status=${xeroDetails.integrationDetails.integration_status})`,
        );
        return false;
      }

      const companyId = xeroDetails.company_id;
      await this.xeroService.refreshTokenSet(companyId, this.xero);

      const response = await this.xero.accountingApi.getContact(
        tenant_id,
        resource_id,
      );

      const contact = response.body.contacts?.[0];

      if (!contact) {
        this.logger.warn(
          `[Xero Service] No contact found in Xero for ID: ${resource_id}`,
        );
        return false;
      }

      const { contactID, name, contactStatus, isCustomer, isSupplier } =
        contact;

      // 2. Upsert into your DB
      const existing = await this.xeroContactDetails.findOne({
        where: {
          contact_id: contactID,
          integration_id: xeroDetails.integration_id,
        },
      });

      this.logger.log(`[Xero Webhook] existing contact::` + " " + JSON.stringify(existing));

      if (existing) {
        // Update existing contact
        existing.contact_name = name;
        existing.is_customer = isCustomer ?? false;
        existing.is_supplier = isSupplier ?? false;
        existing.contact_status = String(contactStatus);
        // Force-bump updated_on so the scheduler's "Xero updatedDateUTC > PT
        // updated_on + 60s" skew guard (xero-scheduler.service.ts
        // webhookFallbackSync, contact branch) can actually trip on the next
        // cycle. When none of the four mirrored fields above changed,
        // TypeORM's save() diff skips the UPDATE entirely, @UpdateDateColumn
        // never fires, updated_on stays stale, and the same contact gets
        // re-processed every 15 minutes forever — flooding xero_sync_logs
        // with duplicate "Contact <name> has been synced through webhook"
        // template-201 rows (seen in production for APS Earthmoving:
        // 19 fallback rebroadcasts in 4h on a never-changing contact).
        existing.updated_on = new Date();
        await this.xeroContactDetails.save(existing);
        this.logger.log(`[Xero Service] Contact updated in DB`);
      } else {
        this.logger.log('Adding Contact to the paytrade db');
        await this.xeroContactDetails.save({
          contact_id: contactID,
          tenant_id,
          contact_name: name,
          integration_id: xeroDetails.integration_id,
          contact_status: String(contactStatus),
          is_customer: isCustomer ?? false,
          is_supplier: isSupplier ?? false,
        });
        this.logger.log(`[Xero Service] New contact added to DB`);
      }

      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          contact_id: contactID,
          integration_id: xeroDetails.integration_id,
        },
      });

      let pt_client_supplier: ClientSuppliersDetails | boolean | null;

      if (xeroContactDetails.pt_contact_id) {
        const clientSuppliersDetails =
          await this.clientSuppliersDetails.findOne({
            where: { client_supplier_id: xeroContactDetails.pt_contact_id },
          });
        // Phase 2: capture per-contact Xero GST defaults onto the mapped PT contact.
        await this.xeroContactsService.persistContactGstFromXero(
          xeroContactDetails.pt_contact_id,
          contact,
        );
        if (xeroContactDetails?.contact_status === 'ACTIVE') {
          const xeroAddress =
            contact.addresses?.find((a: any) => a.addressType === 'POBOX') ||
            contact.addresses?.find((a: any) => a.addressType === 'STREET');
          const xeroPhone =
            contact.phones?.find((p: any) => p.phoneType === 'MOBILE') ||
            contact.phones?.find((p: any) => p.phoneType === 'DEFAULT');

          const syncedAddress = xeroAddress?.addressLine1
            ? xeroAddress.addressLine1
            : clientSuppliersDetails.client_supplier_address;
          const syncedCountry = xeroAddress?.country
            ? xeroAddress.country
            : clientSuppliersDetails.country;
          const syncedPhone = xeroPhone?.phoneNumber
            ? xeroPhone.phoneNumber
            : clientSuppliersDetails.client_phone_no;
          const syncedEmail = contact.emailAddress
            ? contact.emailAddress
            : clientSuppliersDetails.client_email_id;
          // Task #326 — Mirror Xero's taxNumber onto PT abn_number when
          // present. An empty/missing incoming taxNumber is treated as
          // "no change" so we never wipe an ABN the user typed in PT.
          const incomingAbn =
            typeof contact.taxNumber === 'string'
              ? contact.taxNumber.trim()
              : '';
          const syncedAbn = incomingAbn
            ? incomingAbn
            : clientSuppliersDetails.abn_number;

          const payload: UpdateClientSuppliersDetailInput = {
            company_id: companyId,
            id: clientSuppliersDetails.id,
            client_supplier_name: contact.name,
            business_name: clientSuppliersDetails.business_name,
            client_supplier_type: clientSuppliersDetails.client_supplier_type,
            client_supplier_status:
              clientSuppliersDetails.client_supplier_status,
            related_entity: clientSuppliersDetails.related_entity,
            entity_type: clientSuppliersDetails.entity_type,
            place_id: clientSuppliersDetails.place_id,
            client_supplier_address: syncedAddress,
            country: syncedCountry,
            region: clientSuppliersDetails.region,
            latitude: clientSuppliersDetails.latitude,
            longitude: clientSuppliersDetails.longitude,
            client_phone_no: syncedPhone,
            client_email_id: syncedEmail,
            client_website: clientSuppliersDetails.client_website,
            qbcc_number: clientSuppliersDetails.qbcc_number,
            acn_number: clientSuppliersDetails.acn_number,
            abn_number: syncedAbn,
            tfn_number: clientSuppliersDetails.tfn_number,
            payment_terms: clientSuppliersDetails.payment_terms,
            account_details: clientSuppliersDetails.accountDetails || [],
            is_deleted: false,
          };

          pt_client_supplier =
            await this.clientSuppliersDetailsService.editClientSuppliersDetailsById(
              payload,
              decoded,
            );
          this.logger.log(JSON.stringify({ pt_client_supplier1: pt_client_supplier }));
        } else if (
          xeroContactDetails?.contact_status !== 'ACTIVE' &&
          ['Draft', 'Completed']?.includes(
            clientSuppliersDetails?.client_supplier_status,
          ) &&
          !clientSuppliersDetails?.is_deleted
        ) {
          try {
            pt_client_supplier =
              await this.clientSuppliersDetailsService.updateClientSuppliersStatusById(
                clientSuppliersDetails?.id,
                true,
                decoded,
              );
            this.logger.log(JSON.stringify({ pt_client_supplier2: pt_client_supplier }));
          } catch (error) {
            const errMsg = error?.message ? error?.message : error;
            if (
              errMsg
                ?.toLowerCase()
                ?.includes(
                  'This contact is linked to one or more contracts/claims or payments. You are unable to delete this contact from the Client/Supplier list to avoid system error.'.toLowerCase(),
                )
            ) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'createContactInPaytradeThroughWebhook',
                api_payload: {
                  contact_id: contactID,
                  tenant_id: xeroDetails.tenant_id,
                  client_supplier_name: contact.name,
                  client_email_id: contact.emailAddress || '',
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 389,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: xeroContactDetails?.id,
                  paytradeId: clientSuppliersDetails?.id,
                },
                reference_id: xeroContactDetails?.id,
                history: [
                  `API triggered from contact webhook ${clientSuppliersDetails?.client_supplier_name}`,
                  'Import failed',
                ],
                important_checks: {
                  'Import data format validation': 'Failed',
                },
                error_message: errMsg,
                xero_records: [contact],
                paytrade_records: [clientSuppliersDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
          }
        } else {
          pt_client_supplier = clientSuppliersDetails;
          this.logger.log(JSON.stringify({ pt_client_supplier3: pt_client_supplier }));
        }
      } else if (xeroContactDetails?.permanently_unmapped) {
        // Task #289 — Skip the name-match re-link path for any row the
        // user has marked as permanently unmapped. The Xero-side fields
        // (name, status, type) were already upserted above so our local
        // mirror stays fresh; we just refuse to restore the PT link.
        this.logger.log(
          `[Xero Contact Webhook] Skipping name-match re-link for permanently unmapped contact ${contactID} (${name})`,
        );
        pt_client_supplier = null;
      } else {
        // Task #265 — Skip archived Xero contacts on webhook import.
        // Archived contacts in Xero usually have most fields stripped, so
        // attempting to import them as new PT contacts almost always fails
        // with a noisy "Missing mandatory fields" sync log. The real reason
        // is that the contact is archived, not that the user forgot to fill
        // in 10 fields. The bulk contact sync already skips non-ACTIVE
        // contacts on create — the webhook path now behaves the same way.
        //
        // The local xero_contact_details row was already upserted above
        // with the correct ARCHIVED status, so our mirror stays accurate.
        // Once the user un-archives the contact in Xero and clicks Retry
        // import on this sync log, handleContactCreateUpdate re-runs, sees
        // ACTIVE, and proceeds through the normal create path.
        if (
          String(contactStatus) === String(Contact.ContactStatusEnum.ARCHIVED)
        ) {
          this.logger.log(
            `[Xero Contact Webhook] Skipping unmapped archived contact ${contactID} (${name})`,
          );
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createContactInPaytradeThroughWebhook',
            api_payload: {
              contact_id: contactID,
              tenant_id: xeroDetails.tenant_id,
              client_supplier_name: contact.name,
              client_email_id: contact.emailAddress || '',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 623,
            dynamic_values: { contact_name: contact.name },
            project_id: null,
            contract_id: null,
            reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
            reference_id: xeroContactDetails?.id,
            history: [
              `API triggered from contact webhook ${contact.name}`,
              'Import skipped — contact is archived in Xero',
            ],
            important_checks: {},
            error_message:
              'Contact is archived in Xero — import skipped. Un-archive the contact in Xero, then click Retry import to bring it into Pay Trade.',
            xero_records: [contact],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        // Task #283 — Webhook queue and direct/resolver entry points all
        // pass `data = {}` for new contacts because the webhook envelope
        // carries no fields, only resource ids. Running the missing-
        // field validator against `{}` flagged every Active contact as
        // "missing Name, Type, Status, ..." — the well-known symptom in
        // sync log 112724. The single source of truth for "Xero contact
        // → PT payload" now lives in `buildContactPayloadFromXero`; use
        // it whenever the caller did not pre-fill the payload (frontend
        // Add-Mapping calls still pre-fill via the resolver so admins
        // can choose Related entity / address values explicitly).
        const callerHasPrefilledData =
          data &&
          typeof data === 'object' &&
          (data.client_supplier_name ||
            data.client_supplier_type ||
            data.client_supplier_address);
        const builtData = callerHasPrefilledData
          ? data
          : this.xeroContactsService.buildContactPayloadFromXero(
              contact,
              companyId,
            );

        pt_client_supplier = await this.handleContactCreate(
          contactID,
          xeroDetails,
          contact,
          xeroContactDetails,
          sync_id,
          builtData,
        );
        this.logger.log(`[Xero Contact Webhook] new::` + " " + JSON.stringify(pt_client_supplier));
        if (pt_client_supplier && typeof pt_client_supplier === 'object') {
          xeroContactDetails.pt_contact_id =
            pt_client_supplier.client_supplier_id;
          xeroContactDetails.mapped_status = 'System';
          await this.xeroContactDetails.save(xeroContactDetails);
        }
      }
      if (pt_client_supplier) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createContactInPaytradeThroughWebhook',
          api_payload: {
            contact_id: contactID,
            tenant_id: xeroDetails.tenant_id,
            client_supplier_name: contact.name,
            client_email_id: contact.emailAddress || '',
          },
          integration_id: xeroDetails.integration_id,
          // Use the email-missing warning template when the freshly created
          // PT contact was flagged needs_email by the soft-fail path inside
          // handleContactCreate. handleContactCreate may return a boolean
          // sentinel on early-exit paths, so guard with a type check.
          log_template_id:
            typeof pt_client_supplier === 'object' &&
            pt_client_supplier?.needs_email
              ? 612
              : 201,
          dynamic_values: {
            contact_name:
              typeof pt_client_supplier === 'object'
                ? pt_client_supplier?.client_supplier_name
                : undefined,
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: xeroContactDetails?.id,
            paytradeId:
              typeof pt_client_supplier === 'object'
                ? pt_client_supplier?.id
                : undefined,
          },
          reference_id: xeroContactDetails?.id,
          history: [
            `API triggered from contact webhook ${
              typeof pt_client_supplier === 'object'
                ? pt_client_supplier?.client_supplier_name
                : ''
            }`,
            typeof pt_client_supplier === 'object' &&
            pt_client_supplier?.needs_email
              ? 'Imported with warning: email missing'
              : 'Import successful',
          ],
          important_checks: {},
          error_message:
            typeof pt_client_supplier === 'object' &&
            pt_client_supplier?.needs_email
              ? 'Imported without an email address — add one to enable notices and smart contract creation.'
              : null,
          xero_records: [contact],
          paytrade_records:
            typeof pt_client_supplier === 'object' && pt_client_supplier
              ? [pt_client_supplier]
              : [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return pt_client_supplier;
      }
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Service] Failed to fetch contact:` + " " + JSON.stringify(error));

      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          // Multi-row tenant guard: prefer the Active integration row.
          const candidates = await this.xeroIntegrationDetails.find({
            where: { tenant_id, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const xeroDetails =
            candidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ?? candidates[0];

          const companyId = xeroDetails?.company_id;

          const companyUserRole = await this.companyUserRolesRepo.findOne({
            where: {
              company_id: companyId,
              company_role: In(['PRIMARY ADMIN']),
              status: 'Active',
            },
          });

          const companyAdmin = companyUserRole
            ? await this.userDetails.findOne({
                where: { user_id: companyUserRole?.user_id },
              })
            : null;

          const response = await this.xeroService.getAuthUrl(
            companyId,
            companyAdmin?.user_id,
            false,
            companyAdmin?.user_timezone,
          );

          await this.xeroService.insertXeroSyncLogs(decoded, {
            api_name: 'createContactInPaytradeThroughWebhook',
            api_payload: {
              contact_id: resource_id,
              tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 391,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from contact webhook`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Service] Failed to fetch contact:` + " " + JSON.stringify(error));
        }
      }
    }
  }

  async handleContactCreate(
    contact_id,
    xeroDetails: any,
    contact,
    xeroContactDetails,
    sync_id?,
    data?: any,
    decoded?: any,
  ): Promise<ClientSuppliersDetails | boolean> {
    const company_id = xeroDetails?.company_id;
    const {
      client_supplier_name,
      client_supplier_type,
      client_supplier_status,
      related_entity,
      entity_type,
      place_id,
      client_supplier_address,
      country,
      region,
      latitude,
      longitude,
      client_phone_no,
      client_email_id,
      account_details,
    } = data || {};
    // Task #154 — Soft-fail on email-only missing; hard-fail on every other
    // missing mandatory field with the exact field names listed.
    // Task #283 — `webhookSource: true` restricts the check to fields
    // Xero actually sends, so the "missing" list only mentions fields
    // the admin can fix in Xero.
    const _otherMissing =
      this.xeroContactsService.collectMissingMandatoryFields(data, {
        excludeEmail: true,
        webhookSource: true,
      });
    const _emailMissing = !client_email_id;
    if (_otherMissing.length > 0) {
      // Build human-readable {error_message, notification, information_required}
      // so the sync-log details screen explains *which* fields are missing
      // and *where* in Xero the admin should fix them.
      // Task #283 — pass the live contactStatus so the Status hint only
      // mentions "archived contacts cannot be imported" when the contact
      // really is archived (otherwise show neutral guidance).
      const _missingFieldsLog = buildMissingFieldsLog(
        'contact',
        contact?.name,
        _otherMissing,
        {
          ...(_emailMissing ? { extraNote: '(email also missing)' } : {}),
          contactStatus: String(contact?.contactStatus ?? ''),
        },
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: sync_id || null,
        api_name: 'createContactInPaytradeThroughWebhook',
        api_payload: {
          contact_id,
          tenant_id: xeroDetails.tenant_id,
          client_supplier_name: contact.name,
          client_email_id: contact.emailAddress || '',
        },
        integration_id: xeroDetails.integration_id,
        log_template_id: 368,
        dynamic_values: {},
        project_id: null,
        contract_id: null,
        reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
        reference_id: xeroContactDetails?.id,
        history: [
          `API triggered from contact webhook ${contact.name}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: _missingFieldsLog.error_message,
        notification: _missingFieldsLog.notification,
        information_required: _missingFieldsLog.information_required,
        xero_records: [contact],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    } else if (
      client_supplier_type === 'Client' &&
      account_details.length > 1
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: sync_id || null,
        api_name: 'createContactInPaytradeThroughWebhook',
        api_payload: {
          contact_id,
          tenant_id: xeroDetails.tenant_id,
          client_supplier_name: contact.name,
          client_email_id: contact.emailAddress || '',
        },
        integration_id: xeroDetails.integration_id,
        log_template_id: 368,
        dynamic_values: {},
        project_id: null,
        contract_id: null,
        reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
        reference_id: xeroContactDetails?.id,
        history: [
          `API triggered from contact webhook ${contact.name}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: `Only one account can be added per client`,
        xero_records: [contact],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    } else if (
      client_supplier_type === 'Supplier' &&
      account_details.length > 10
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: sync_id || null,
        api_name: 'createContactInPaytradeThroughWebhook',
        api_payload: {
          contact_id,
          tenant_id: xeroDetails.tenant_id,
          client_supplier_name: contact.name,
          client_email_id: contact.emailAddress || '',
        },
        integration_id: xeroDetails.integration_id,
        log_template_id: 368,
        dynamic_values: {},
        project_id: null,
        contract_id: null,
        reference: { xeroId: xeroContactDetails?.id, paytradeId: null },
        reference_id: xeroContactDetails?.id,
        history: [
          `API triggered from contact webhook ${contact.name}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: `You can only have up to 10 accounts per supplier. To add a new one, please delete an existing account`,
        xero_records: [contact],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    } else {
      const checkNameExistence =
        await this.clientSuppliersDetailsService.checkExistenceForClient(
          company_id,
          client_supplier_type,
          client_supplier_name,
        );
      if (!checkNameExistence || checkNameExistence?.length == 0) {
        const response =
          await this.clientSuppliersDetailsService.insertClientSupplierDetails(
            decoded,
            data,
          );
        if (response) {
          const xeroContactDetails = await this.xeroContactDetails.findOne({
            where: {
              contact_id,
              integration_id: xeroDetails.integration_id,
            },
          });
          xeroContactDetails.pt_contact_id = response.client_supplier_id;
          xeroContactDetails.mapped_status = 'System';
          xeroContactDetails.updated_by = response.created_by;
          xeroContactDetails.updated_on = response.created_on;
          xeroContactDetails.updated_group = response.created_group;
          await this.xeroContactDetails.save(xeroContactDetails);

          // Mark needs_email so the wrapper can pick the warning sync-log
          // template and the UI can render the badge.
          if (_emailMissing) {
            await this.clientSuppliersDetailsService.markNeedsEmail(
              response.id,
              true,
            );
            response.needs_email = true;
          }

          return response;
        }
      } else {
        const checkExistenceInXero = checkNameExistence[0]?.client_supplier_id
          ? await this.xeroContactDetails.findOne({
              where: {
                pt_contact_id: checkNameExistence[0]?.client_supplier_id,
                integration_id: xeroDetails?.integration_id,
              },
            })
          : null;
        if (!checkExistenceInXero) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createContactInPaytradeThroughWebhook',
            api_payload: {
              contact_id,
              tenant_id: xeroDetails.tenant_id,
              client_supplier_id: checkNameExistence[0]?.client_supplier_id,
              client_supplier_name: contact.name,
              client_email_id: contact.emailAddress || '',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 369,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: xeroContactDetails?.id,
              paytradeId: checkNameExistence[0]?.id,
            },
            reference_id: xeroContactDetails?.id,
            history: [
              `API triggered from contact webhook ${contact.name}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `The contact name already exists but is not linked to any Xero contact`,
            xero_records: [contact],
            paytrade_records: [checkNameExistence[0]],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        } else {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'createContactInPaytradeThroughWebhook',
            api_payload: {
              contact_id,
              tenant_id: xeroDetails.tenant_id,
              client_supplier_id: checkNameExistence[0]?.client_supplier_id,
              client_supplier_name: contact.name,
              client_email_id: contact.emailAddress || '',
              unmapping_contact_id: checkExistenceInXero?.contact_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 370,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: xeroContactDetails?.id,
              paytradeId: checkNameExistence[0]?.id,
            },
            reference_id: xeroContactDetails?.id,
            history: [
              `API triggered from contact webhook ${contact.name}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `The contact name already exists and is linked to some Xero contact`,
            xero_records: [contact],
            paytrade_records: [
              {
                ...checkNameExistence[0],
                unmapContactDetails: checkExistenceInXero,
              },
            ],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }
    }
  }

  /**
   * Phase 3 — MANUALJOURNAL.* webhook handler. The only role is anti-echo:
   * if PayTrade posted this MJ itself (matching row in
   * `xero_retention_journals.manual_journal_id`), drop it with a log entry.
   * For any other manual journal we currently no-op — full inbound MJ
   * processing is a future enhancement and explicitly out of scope for
   * Task #26.
   */
  async handleManualJournalUpdate(data: any, decoded?: any) {
    const { resource_id, tenant_id, eventType } = data || {};
    if (!resource_id) return false;
    try {
      // Multi-row tenant guard: prefer the Active integration row.
      const candidates = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        candidates.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? candidates[0];
      if (!xeroDetails?.integration_id) {
        this.logger.log(
          `[MJ_WEBHOOK] no integration for tenant ${tenant_id}; ignoring ${eventType}`,
        );
        return false;
      }
      const link = await this.xeroManualJournalService.findByManualJournalId(
        resource_id,
        xeroDetails.integration_id,
      );
      if (link) {
        this.logger.log(
          `[MJ_WEBHOOK] dropping self-echo for manual_journal_id=${resource_id} (claim ${link.pt_claim_id}, kind ${link.kind})`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: null,
          api_name: 'handleManualJournalUpdate',
          api_payload: { resource_id, tenant_id, eventType },
          integration_id: xeroDetails.integration_id,
          log_template_id: 606,
          dynamic_values: { manual_journal_id: resource_id },
          project_id: null,
          contract_id: null,
          reference: { xeroId: resource_id, paytradeId: link.pt_claim_id },
          reference_id:
            link.pt_claim_id != null ? String(link.pt_claim_id) : null,
          history: [
            `MJ webhook ${eventType} for ${resource_id}`,
            'Self-echo of PayTrade-posted gross-up — ignored',
          ],
          important_checks: { 'Anti-echo lookup': 'Ok' },
          error_message: null,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return true;
      }
      this.logger.log(
        `[MJ_WEBHOOK] external manual journal ${resource_id} (${eventType}) — no PT-side action`,
      );
      return false;
    } catch (err: any) {
      this.logger.error(
        `[MJ_WEBHOOK] error handling manual journal ${resource_id}: ${err?.message || err}`,
      );
      return false;
    }
  }

  async handleInvoiceCreateUpdate(data: any, decoded?: any) {
    const { resource_id, tenant_id, eventType, sync_run_type } = data;
    this.logger.debug(
      `[BILL_TRACE] === START handleInvoiceCreateUpdate === resource_id=${resource_id}, tenant=${tenant_id}, eventType=${eventType}, sync_run_type=${sync_run_type}`,
    );

    try {
      this.logger.debug(`[BILL_TRACE] Step 1: Looking up xero integration for tenant ${tenant_id}...`);
      // Multi-row tenant guard: prefer the Active integration row when more
      // than one xero_integration_details row points at the same tenant
      // (orphan rows can be left behind by the Task #42 re-OAuth flow).
      const _candidatesInv = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        _candidatesInv.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? _candidatesInv[0];

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        this.logger.error(
          `[BILL_TRACE] Step 1 FAILED: No integration found for tenant_id: ${tenant_id}`,
        );
        return false;
      }

      this.logger.debug(`[BILL_TRACE] Step 1 OK: integration_id=${xeroDetails.integration_id}, company_id=${xeroDetails.company_id}, status=${xeroDetails.integrationDetails.integration_status}`);

      if (
        !isWebhookProcessableStatus(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        this.logger.error(
          `[BILL_TRACE] Step 1 FAILED: Integration not in a processable state (status=${xeroDetails.integrationDetails.integration_status})`,
        );
        return false;
      }

      const companyId = xeroDetails.company_id;
      this.logger.debug(`[BILL_TRACE] Step 2: Refreshing Xero token for company ${companyId}...`);
      await this.xeroService.refreshTokenSet(companyId, this.xero);
      this.logger.debug(`[BILL_TRACE] Step 2 OK: Token refreshed`);

      this.logger.debug(`[BILL_TRACE] Step 3: Fetching invoice ${resource_id} from Xero API...`);
      const response = await this.xero.accountingApi.getInvoice(
        tenant_id,
        resource_id,
      );
      const invoice = response.body.invoices?.[0];

      if (!invoice) {
        this.logger.error(`[BILL_TRACE] Step 3 FAILED: Invoice not found in Xero response`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: resource_id,
            tenant_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 252 : 412,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Resource not found in xero`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] Step 3 OK: Invoice fetched — invoiceID=${invoice.invoiceID}, type=${invoice.type}, status=${invoice.status}, contact=${invoice.contact?.name} (${invoice.contact?.contactID}), lineItems=${invoice.lineItems?.length ?? 0}`);

      if (invoice?.status !== Invoice.StatusEnum.DRAFT) {
        this.logger.debug(`[BILL_TRACE] Step 4: Invoice is NOT Draft (status=${invoice.status}). Proceeding with processing...`);

        this.logger.debug(`[BILL_TRACE] Step 5: Looking up xero contact mapping for contactID=${invoice.contact?.contactID}...`);
        const xeroContactDetails = await this.xeroContactDetails.findOne({
          where: {
            contact_id: invoice.contact?.contactID,
            integration_id: xeroDetails.integration_id,
          },
        });
        if (!xeroContactDetails) {
          this.logger.error(`[BILL_TRACE] Step 5 FAILED: Contact not found in xero mapping (contactID=${invoice.contact?.contactID}). Writing sync log template 264/424.`);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 264 : 424,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Contact details not found`,
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        this.logger.debug(`[BILL_TRACE] Step 5 OK: Contact mapped — pt_contact_id=${xeroContactDetails.pt_contact_id}, contact_name=${xeroContactDetails.contact_name}`);

        if (!xeroContactDetails.pt_contact_id) {
          this.logger.error(`[BILL_TRACE] Step 5 FAILED: Contact exists but pt_contact_id is null/empty. Writing sync log template 265/425.`);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              contact_id: invoice?.contact?.contactID,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 265 : 425,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Contact details not mapped`,
            xero_records: [{ ...invoice, xeroContactDetails }],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        this.logger.debug(`[BILL_TRACE] Step 6: All pre-checks passed. Calling validateAndProcessWebhookInvoice...`);
        const invoiceResponse = await this.validateAndProcessWebhookInvoice(
          invoice,
          xeroDetails,
          companyId,
          tenant_id,
          {},
          xeroContactDetails,
          eventType,
          sync_run_type,
          decoded,
        );

        this.logger.debug(`[BILL_TRACE] Step 6 RESULT: validateAndProcessWebhookInvoice returned ${JSON.stringify(invoiceResponse)}`);
        this.logger.debug(`[BILL_TRACE] === END handleInvoiceCreateUpdate (processed) ===`);
        return invoiceResponse;
      }
      this.logger.debug(`[BILL_TRACE] Step 4: Invoice is DRAFT (status=${invoice?.status}). Skipping processing — returning true silently.`);
      this.logger.debug(`[BILL_TRACE] === END handleInvoiceCreateUpdate (draft skipped) ===`);
      return true;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[BILL_TRACE] CATCH: handleInvoiceCreateUpdate failed — ${JSON.stringify(error)}`);

      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          // Multi-row tenant guard: prefer the Active integration row.
          const candidates = await this.xeroIntegrationDetails.find({
            where: { tenant_id, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const xeroDetails =
            candidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ?? candidates[0];

          const companyId = xeroDetails?.company_id;

          const companyUserRole = await this.companyUserRolesRepo.findOne({
            where: {
              company_id: companyId,
              company_role: In(['PRIMARY ADMIN']),
              status: 'Active',
            },
          });

          const companyAdmin = companyUserRole
            ? await this.userDetails.findOne({
                where: { user_id: companyUserRole?.user_id },
              })
            : null;

          const response = await this.xeroService.getAuthUrl(
            companyId,
            companyAdmin?.user_id,
            false,
            companyAdmin?.user_timezone,
          );

          await this.xeroService.insertXeroSyncLogs(decoded, {
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: resource_id,
              tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 391 : 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Service] Failed to fetch invoice:` + " " + JSON.stringify(error));
        }
      }
    }
  }

  async createClaimInPaytrade(data: any, decoded?: any) {
    const { invoice_id, tenant_id, sync_run_type } = data;
    this.logger.log(
      `[Xero Service] Invoice CREATED: ${invoice_id} of Tenant ${tenant_id}`,
    );

    try {
      // Multi-row tenant guard: prefer the Active integration row.
      const _candidatesClaim = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        _candidatesClaim.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? _candidatesClaim[0];

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        this.logger.error(
          `[Xero Webhook] No integration found for tenant id: ${tenant_id}`,
        );
        throw `No xero integration found`;
      }

      if (
        !isWebhookProcessableStatus(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        this.logger.error(
          `[Xero Webhook] Integration not in a processable state (status=${xeroDetails.integrationDetails.integration_status})`,
        );
        throw `Paytrade is currently not active in Xero.`;
      }

      const companyId = xeroDetails.company_id;
      await this.xeroService.refreshTokenSet(companyId, this.xero);

      const response = await this.xero.accountingApi.getInvoice(
        tenant_id,
        invoice_id,
      );
      const invoice = response.body.invoices?.[0];

      if (!invoice) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 252 : 412,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Resource not found in xero`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw `Xero claim details not found`;
      }

      if (invoice?.status !== Invoice.StatusEnum.DRAFT) {
        // Process invoice create logic..
        this.logger.log('*****************invoice****************' + " " + JSON.stringify(invoice));

        const xeroContactDetails = await this.xeroContactDetails.findOne({
          where: {
            contact_id: invoice.contact?.contactID,
            integration_id: xeroDetails.integration_id,
          },
        });
        if (!xeroContactDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 264 : 424,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Contact details not found`,
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        if (!xeroContactDetails.pt_contact_id) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              contact_id: invoice?.contact?.contactID,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 265 : 425,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Contact details not mapped`,
            xero_records: [{ ...invoice, xeroContactDetails }],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const invoiceResponse = await this.validateAndProcessWebhookInvoice(
          invoice,
          xeroDetails,
          companyId,
          tenant_id,
          {
            sync_id: data?.sync_id,
            retention_id: data?.retention_id,
            associated_retention_sub_payment_id:
              data?.associated_retention_sub_payment_id,
            claims_with_reason: data?.claims_with_reason,
            compulsory_attachment_ids: data?.compulsory_attachment_ids,
            withhold_payment_reason: data?.withhold_payment_reason,
            bank_transfer_id: data?.bank_transfer_id,
            credit_note_id: data?.credit_note_id,
          },
          xeroContactDetails,
          '',
          sync_run_type,
          decoded,
        );

        if (invoiceResponse && invoice?.contact?.contactID) {
          const overpayments = await this.checkAndCreateOverPaymentAndRefunds(
            {
              tenant_id: tenant_id,
              contact_id: invoice?.contact?.contactID,
              sync_run_type,
            },
            decoded,
          );
          this.logger.log('overpayment check in createClaimPaytrade:: ' + " " + JSON.stringify({
            overpayments,
          }));
          return overpayments;
        }

        return invoiceResponse;
      }
      return false;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Service] Failed to fetch invoice:` + " " + JSON.stringify(error));

      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          // Multi-row tenant guard: prefer the Active integration row.
          const candidates = await this.xeroIntegrationDetails.find({
            where: { tenant_id, status: 'ACTIVE' },
            relations: ['integrationDetails'],
          });
          const xeroDetails =
            candidates.find(
              (c) =>
                c?.integrationDetails?.integration_status ===
                'Connected - active',
            ) ?? candidates[0];

          const companyId = xeroDetails?.company_id;

          const companyUserRole = await this.companyUserRolesRepo.findOne({
            where: {
              company_id: companyId,
              company_role: In(['PRIMARY ADMIN']),
              status: 'Active',
            },
          });

          const companyAdmin = companyUserRole
            ? await this.userDetails.findOne({
                where: { user_id: companyUserRole?.user_id },
              })
            : null;

          const response = await this.xeroService.getAuthUrl(
            companyId,
            companyAdmin?.user_id,
            false,
            companyAdmin?.user_timezone,
          );

          await this.xeroService.insertXeroSyncLogs(decoded, {
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id,
              tenant_id,
              auth_url: response,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 391 : 463,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Refresh token invalid or expired. Need to re-authenticate.`,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } catch (error) {
          this.logger.error(`[Xero Service] Failed to fetch invoice:` + " " + JSON.stringify(error));
        }
      }
    }
  }

  async validateAndProcessWebhookInvoice(
    invoice: any,
    xeroDetails: XeroIntegrationDetails,
    company_id: number,
    tenant_id: any,
    data?: any,
    xeroContactDetails?: any,
    eventType?: string,
    sync_run_type?: string,
    decoded?: any,
  ) {
    try {
      this.logger.debug(`[BILL_TRACE] === START validateAndProcessWebhookInvoice === invoiceID=${invoice.invoiceID}, eventType=${eventType}, sync_run_type=${sync_run_type}`);

      this.logger.debug(`[BILL_TRACE] V-Step 1: Checking if invoice already exists in xeroInvoicesBills...`);
      let existingXeroInvoice = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: invoice.invoiceID,
          integration_id: xeroDetails.integration_id,
        },
      });

      this.logger.debug(`[BILL_TRACE] V-Step 1: existingXeroInvoice=${existingXeroInvoice ? `id=${existingXeroInvoice.id}, pt_claim_id=${existingXeroInvoice.pt_claim_id}` : 'null'}`);

      if (
        existingXeroInvoice &&
        existingXeroInvoice?.pt_claim_id &&
        eventType === 'CREATE'
      ) {
        this.logger.debug(`[BILL_TRACE] V-Step 1 EXIT: Already has pt_claim_id and eventType=CREATE. Returning false (skip duplicate create).`);
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 2: Refreshing Xero token...`);
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      this.logger.debug(`[BILL_TRACE] V-Step 2 OK`);

      this.logger.debug(`[BILL_TRACE] V-Step 3: Validating line items... lineItems count=${invoice.lineItems?.length ?? 0}, first accountCode=${invoice.lineItems?.[0]?.accountCode ?? 'null'}`);
      if (
        !invoice.lineItems ||
        (invoice.lineItems.length > 0 && !invoice.lineItems[0]?.accountCode)
      ) {
        this.logger.error(`[BILL_TRACE] V-Step 3 FAILED: No line items or missing accountCode. Writing sync log 253/413.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 253 : 413,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `There should be atleast one line item`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      this.logger.debug(`[BILL_TRACE] V-Step 3 OK: Line items valid`);

      this.logger.debug(`[BILL_TRACE] V-Step 4: Checking tracking categories...`);
      if (!this.hasValidTracking(invoice)) {
        this.logger.error(`[BILL_TRACE] V-Step 4 FAILED: Missing tracking in line items. Writing sync log 254/414.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 254 : 414,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Missing tracking id in line item`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      this.logger.debug(`[BILL_TRACE] V-Step 4 OK: Tracking valid`);

      this.logger.debug(`[BILL_TRACE] V-Step 5: Checking invoice format...`);
      if (!this.isInvoiceFormatValid(invoice)) {
        this.logger.error(`[BILL_TRACE] V-Step 5 FAILED: Invoice format invalid. Writing sync log 255/415.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 255 : 415,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Invoice format does not match expected structure`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      this.logger.debug(`[BILL_TRACE] V-Step 5 OK: Format valid`);

      this.logger.debug(`[BILL_TRACE] V-Step 6: Checking project_category_id=${xeroDetails.project_category_id}, contract_category_id=${xeroDetails.contract_category_id}...`);
      if (!xeroDetails.project_category_id) {
        this.logger.error(`[BILL_TRACE] V-Step 6 FAILED: Missing project_category_id. Writing sync log 256/416.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            category_type: 'project',
            type: invoice.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 256 : 416,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Failed',
          },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroDetails.contract_category_id) {
        this.logger.debug(`[BILL_TRACE] V-Step 6: contract_category_id not configured (optional) — skipping contract tracking extraction; will rely on project + smart contract auto-create if enabled.`);
      }

      this.logger.debug(`[BILL_TRACE] V-Step 6 OK: Project category ID present`);

      let contractTrackingId = null;
      let projectTrackingId = null;

      this.logger.debug(`[BILL_TRACE] V-Step 7: Extracting tracking IDs from line items...`);
      const hasTracking = invoice?.status !== Invoice.StatusEnum.DRAFT &&
        invoice?.lineItems &&
        invoice?.lineItems?.some((li) => li.tracking?.length) &&
        invoice?.lineItems[0]?.tracking[0]?.trackingCategoryID;
      this.logger.debug(`[BILL_TRACE] V-Step 7: hasTracking=${!!hasTracking}, first line tracking=${JSON.stringify(invoice?.lineItems?.[0]?.tracking)}`);

      if (hasTracking) {
        let contractTrackingCategoryId = null;
        let projectTrackingCategoryId = null;

        invoice?.lineItems[0]?.tracking?.forEach((item) => {
          if (item?.trackingCategoryID === xeroDetails.contract_category_id) {
            contractTrackingCategoryId = item?.trackingCategoryID;
            contractTrackingId = item?.trackingOptionID;
          } else if (
            item?.trackingCategoryID === xeroDetails.project_category_id
          ) {
            projectTrackingCategoryId = item?.trackingCategoryID;
            projectTrackingId = item?.trackingOptionID;
          }
        });

        this.logger.debug(`[BILL_TRACE] V-Step 7: Extracted — projectTrackingId=${projectTrackingId}, contractTrackingId=${contractTrackingId}, projectCategoryMatch=${projectTrackingCategoryId}, contractCategoryMatch=${contractTrackingCategoryId}`);

        // if (!projectTrackingCategoryId) {
        //   await this.xeroService.insertXeroSyncLogs(
        //     {},
        //     {
        //       id: data?.sync_id || null,
        //       api_name: 'createClaimInPaytrade',
        //       api_payload: {sync_run_type,
        //         invoice_id: invoice?.invoiceID,
        //         tenant_id,
        //         category_type: 'project',
        //         type:
        //           invoice?.type === Invoice.TypeEnum.ACCPAY
        //             ? 'bill'
        //             : 'invoice',
        //       },
        //       integration_id: xeroDetails.integration_id,
        //       log_template_id: sync_run_type === 'webhook' ?  258: 418,
        //       dynamic_values: {},
        //       project_id: null,
        //       contract_id: null,
        //       reference: {},
        //       reference_id: null,
        //       history: [`API triggered from invoice ${sync_run_type}`, 'Import failed'],
        //       important_checks: {
        //         'Import data format validation': 'Ok',
        //         'Import tracking id validation': 'Failed',
        //       },
        //       error_message: `Mismatch in project tracking category id.`,
        //       xero_records: [invoice],
        //       paytrade_records: [],
        //       new_records: null,
        //       updated_records: null,
        //       synced_records: null,
        //     },
        //   );
        //   return false;
        // }

        // if (!contractTrackingCategoryId) {
        //   await this.xeroService.insertXeroSyncLogs(
        //     {},
        //     {
        //       id: data?.sync_id || null,
        //       api_name: 'createClaimInPaytrade',
        //       api_payload: {sync_run_type,
        //         invoice_id: invoice?.invoiceID,
        //         tenant_id,
        //         category_type: 'contract',
        //         type:
        //           invoice?.type === Invoice.TypeEnum.ACCPAY
        //             ? 'bill'
        //             : 'invoice',
        //       },
        //       integration_id: xeroDetails.integration_id,
        //       log_template_id: sync_run_type === 'webhook' ?  259: 419,
        //       dynamic_values: {},
        //       project_id: null,
        //       contract_id: null,
        //       reference: {},
        //       reference_id: null,
        //       history: [`API triggered from invoice ${sync_run_type}`, 'Import failed'],
        //       important_checks: {
        //         'Import data format validation': 'Ok',
        //         'Import tracking id validation': 'Failed',
        //       },
        //       error_message: `Mismatch in contract tracking category id`,
        //       xero_records: [invoice],
        //       paytrade_records: [],
        //       new_records: null,
        //       updated_records: null,
        //       synced_records: null,
        //     },
        //   );
        //   return false;
        // }
      }

      this.logger.debug(`[BILL_TRACE] V-Step 8: Validating account codes...`);
      if (!this.isAccountCodeValid(invoice, xeroDetails)) {
        this.logger.error(`[BILL_TRACE] V-Step 8 FAILED: Account code invalid. Writing sync log 260/420.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 260 : 420,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Skipped',
          },
          error_message: `Skipped — line item account code is not one of your configured trust-flow accounts. This bill looks like a general supplier expense rather than a subcontractor payment. If this supplier never flows through trust, unmap them on the Xero Contacts tab to suppress future attempts.`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      this.logger.debug(`[BILL_TRACE] V-Step 8 OK: Account code valid`);

      this.logger.debug(`[BILL_TRACE] V-Step 9: Checking line item account codes against configured codes...`);
      const codes = [
        xeroDetails.bill_code,
        xeroDetails.retention_payable_retained_code,
        xeroDetails.liability_payable_code,
        xeroDetails.retention_payable_release_code,
        xeroDetails.invoice_code,
        xeroDetails.retention_receivable_retained_code,
        xeroDetails.liability_receivable_code,
        xeroDetails.retention_receivable_release_code,
      ];

      const accountCodes = codes?.filter((code) => code !== null);
      this.logger.debug(`[BILL_TRACE] V-Step 9: Configured account codes=${JSON.stringify(accountCodes)}, line item codes=${JSON.stringify(invoice?.lineItems?.map(li => li.accountCode))}`);
      // Task #41 — In variable bill code mode the per-supplier override
      // (or auto-discovered code) may be ANY active expense account, so
      // we relax the strict company-level allow-list here. Lines are
      // re-filtered downstream against the resolved per-supplier code.
      const isVariableBillCodeMode =
        !!xeroDetails?.bill_code_is_variable &&
        invoice?.type === Invoice.TypeEnum.ACCPAY;
      for (let item of invoice?.lineItems) {
        if (isVariableBillCodeMode && !accountCodes.includes(item.accountCode)) {
          continue;
        }
        if (!accountCodes.includes(item.accountCode)) {
          this.logger.error(`[BILL_TRACE] V-Step 9 FAILED: accountCode=${item.accountCode} not in configured codes. Writing sync log 261/421.`);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 261 : 421,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Skipped',
            },
            error_message: `Skipped — one or more line item account codes do not match your configured trust-flow accounts. Part of this bill looks like a general supplier expense rather than a subcontractor payment. If this supplier never flows through trust, unmap them on the Xero Contacts tab to suppress future attempts.`,
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }

      this.logger.debug(`[BILL_TRACE] V-Step 9 OK: All line item account codes match`);

      this.logger.debug(`[BILL_TRACE] V-Step 10: Validating tax codes... type=${invoice.type}`);
      let expectedTaxCode = null;

      if (invoice.type === Invoice.TypeEnum.ACCPAY) {
        expectedTaxCode = xeroDetails.bill_tax_code;
      } else if (invoice.type === Invoice.TypeEnum.ACCREC) {
        expectedTaxCode = xeroDetails.invoice_tax_code;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 10: expectedTaxCode=${expectedTaxCode}, line item taxTypes=${JSON.stringify(invoice?.lineItems?.map(li => ({ desc: li.description?.substring(0, 30), taxType: li.taxType, taxAmount: li.taxAmount })))}`);
      if (!expectedTaxCode) {
        this.logger.error(`[BILL_TRACE] V-Step 10 FAILED: Missing expectedTaxCode. Writing sync log 262/422.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 262 : 422,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Failed',
          },
          error_message: `Missing tax field type. Please configure the mapping in Settings to continue.`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const mismatchedTaxLines = invoice.lineItems.length > 0
        ? invoice.lineItems.filter(
            (item) => item?.taxAmount > 0 && item?.taxType !== expectedTaxCode,
          )
        : [];

      this.logger.debug(`[BILL_TRACE] V-Step 10: mismatchedTaxLines count=${mismatchedTaxLines.length}`);
      if (mismatchedTaxLines.length > 0) {
        this.logger.error(`[BILL_TRACE] V-Step 10 FAILED: Tax code mismatch on ${mismatchedTaxLines.length} line(s). Writing sync log 263/423.`);
        const mismatchDetails = mismatchedTaxLines
          .map(
            (item) =>
              `Line "${item.description || 'No description'}" has tax type "${item.taxType}" but expected "${expectedTaxCode}"`,
          )
          .join('; ');

        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 263 : 423,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Failed',
          },
          error_message: `Mismatch in tax field type. ${mismatchDetails}`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 10 OK: All tax codes valid`);

      this.logger.debug(`[BILL_TRACE] V-Step 11: Looking up client/supplier for pt_contact_id=${xeroContactDetails.pt_contact_id}...`);
      const clientSuppliersDetails = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: xeroContactDetails.pt_contact_id },
      });
      this.logger.debug(`[BILL_TRACE] V-Step 11: clientSuppliersDetails=${clientSuppliersDetails ? `id=${clientSuppliersDetails.client_supplier_id}, name=${clientSuppliersDetails.client_supplier_name}` : 'null'}`);

      // if (!clientSuppliersDetails) {
      //   await this.xeroService.insertXeroSyncLogs(
      //     {},
      //     {
      //       id: data?.sync_id || null,
      //       api_name: 'createClaimInPaytrade',
      //       api_payload: {sync_run_type,
      //         invoice_id: invoice?.invoiceID,
      //         tenant_id,
      // type: invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice'
      //       },
      //       integration_id: xeroDetails.integration_id,
      //       log_template_id: sync_run_type === 'webhook' ?  266:426,
      //       dynamic_values: {},
      //       project_id: null,
      //       contract_id: null,
      //       reference: {},
      //       reference_id: null,
      //       history: [`API triggered from invoice ${sync_run_type}`, 'Import failed'],
      //       important_checks: {
      //         'Import data format validation': 'Ok',
      //         'Import tracking id validation': 'Ok',
      //         'Import account type validation': 'Ok',
      //         'Import tax type validation': 'Ok',
      //         'Client/Supplier mapping validation': 'Failed',
      //       },
      //       error_message: `Client/supplier not found`,
      //       xero_records: [invoice],
      //       paytrade_records: [],
      //       new_records: null,
      //       updated_records: null,
      //       synced_records: null,
      //     },
      //   );
      //   return false;
      // }

      this.logger.debug(`[BILL_TRACE] V-Step 12: Looking up xero project mapping for projectTrackingId=${projectTrackingId}...`);
      const xeroProjectDetails = projectTrackingId
        ? await this.xeroProjectDetails.findOne({
            where: {
              project_id: projectTrackingId,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;
      this.logger.debug(`[BILL_TRACE] V-Step 12: xeroProjectDetails=${xeroProjectDetails ? `id=${xeroProjectDetails.id}, pt_project_id=${xeroProjectDetails.pt_project_id}` : 'null'}`);

      if (projectTrackingId && !xeroProjectDetails) {
        this.logger.error(`[BILL_TRACE] V-Step 12 FAILED: Project tracking exists but no xero mapping. Writing sync log 270/430.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            project_id: projectTrackingId,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 270 : 430,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Failed',
          },
          error_message: `Project details not found`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 13: Looking up PT project for pt_project_id=${xeroProjectDetails?.pt_project_id}...`);
      const projectDetails =
        xeroProjectDetails && xeroProjectDetails?.pt_project_id
          ? await this.projectDetails.findOne({
              where: { project_id: xeroProjectDetails.pt_project_id },
            })
          : null;
      this.logger.debug(`[BILL_TRACE] V-Step 13: projectDetails=${projectDetails ? `project_id=${projectDetails.project_id}, project_name=${projectDetails.project_name}` : 'null'}`);

      if (projectTrackingId && !projectDetails) {
        this.logger.error(`[BILL_TRACE] V-Step 13 FAILED: Project mapping exists but PT project not found. Writing sync log 269/429.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            project_id: projectTrackingId,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 269 : 429,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Failed',
          },
          error_message: `Project details not mapped`,
          xero_records: [{ ...invoice, xeroProjectDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 14: Looking up xero contract mapping for contractTrackingId=${contractTrackingId}...`);
      const xeroContractDetails = contractTrackingId
        ? await this.xeroContractDetails.findOne({
            where: {
              contract_id: contractTrackingId,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;
      this.logger.debug(`[BILL_TRACE] V-Step 14: xeroContractDetails=${xeroContractDetails ? `id=${xeroContractDetails.id}, pt_contract_id=${xeroContractDetails.pt_contract_id}` : 'null'}`);

      if (contractTrackingId && !xeroContractDetails) {
        this.logger.error(`[BILL_TRACE] V-Step 14 FAILED: Contract tracking exists but no xero mapping. Writing sync log 267/427.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 267 : 427,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Failed',
          },
          error_message: `Contract details not found`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 15: Looking up PT contract for pt_contract_id=${xeroContractDetails?.pt_contract_id}...`);
      let contractDetails =
        xeroContractDetails && xeroContractDetails?.pt_contract_id
          ? await this.contractDetails.findOne({
              where: { contract_id: xeroContractDetails.pt_contract_id },
            })
          : null;
      this.logger.debug(`[BILL_TRACE] V-Step 15: contractDetails=${contractDetails ? `contract_id=${contractDetails.contract_id}, status=${contractDetails.contract_status}` : 'null'}`);

      if (contractTrackingId && !contractDetails) {
        this.logger.error(`[BILL_TRACE] V-Step 15 FAILED: Contract mapping exists but PT contract not found. Writing sync log 268/428.`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            contract_id: xeroContractDetails?.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 268 : 428,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Failed',
          },
          error_message: `Contract details not mapped`,
          xero_records: [{ ...invoice, xeroContractDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 16: Contract resolution — contractTrackingId=${contractTrackingId}, contractDetails=${contractDetails ? 'found' : 'null'}, projectDetails=${projectDetails ? 'found' : 'null'}, pt_contact_id=${xeroContactDetails?.pt_contact_id}`);
      if (!contractTrackingId && !contractDetails && projectDetails && xeroContactDetails?.pt_contact_id) {
        this.logger.debug(`[BILL_TRACE] V-Step 16: No contract tracking — searching by project_id=${projectDetails.project_id} + client_supplier_id=${xeroContactDetails.pt_contact_id}...`);
        const matchingContracts = await this.contractDetails.find({
          where: {
            project_id: projectDetails.project_id,
            client_supplier_id: xeroContactDetails.pt_contact_id,
            contract_status: Not('Deleted'),
          },
        });
        this.logger.debug(`[BILL_TRACE] V-Step 16: Found ${matchingContracts.length} matching contract(s)`);

        if (matchingContracts.length === 1) {
          contractDetails = matchingContracts[0];
          this.logger.debug(`[BILL_TRACE] V-Step 16: Single contract match — contract_id=${contractDetails.contract_id}`);
        } else if (matchingContracts.length === 0) {
          this.logger.debug(`[BILL_TRACE] V-Step 16: No contracts found. smart_contract_auto_create=${xeroDetails.smart_contract_auto_create}`);
          if (xeroDetails.smart_contract_auto_create && projectDetails && clientSuppliersDetails) {
            this.logger.debug(
              `[BILL_TRACE] V-Step 16: Smart contract auto-create ENABLED. Attempting for project ${projectDetails.project_id} and contact ${xeroContactDetails.pt_contact_id}...`
            );
            const smartContract = await this.xeroInvoicesService.smartCreateContract(decoded, {
              company_id,
              projectDetails,
              clientSuppliersDetails,
              invoiceDetails: invoice,
              xeroDetails,
              data: {
                sync_id: data?.sync_id || null,
                invoice_id: invoice?.invoiceID,
                tenant_id,
              },
              invoice_id: invoice?.invoiceID,
              checkExistenceInDb: existingXeroInvoice || null,
              xeroProjectDetailsId: xeroProjectDetails?.id || null,
            });

            if (smartContract) {
              contractDetails = smartContract;
              this.logger.debug(
                `[BILL_TRACE] V-Step 16: Smart contract auto-created: contract_id=${smartContract.contract_id}. Continuing claim import.`
              );
            } else {
              this.logger.debug(
                `[BILL_TRACE] V-Step 16: Smart contract auto-creation FAILED or was skipped. Returning false.`
              );
              return false;
            }
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id || null,
              api_name: 'createClaimInPaytrade',
              api_payload: {
                sync_run_type,
                invoice_id: invoice?.invoiceID,
                tenant_id,
                type:
                  invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: sync_run_type === 'webhook' ? 267 : 427,
              dynamic_values: {},
              project_id: xeroProjectDetails?.id,
              contract_id: null,
              reference: {},
              reference_id: null,
              history: [
                `API triggered from invoice ${sync_run_type}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Import tracking id validation': 'Ok',
                'Import account type validation': 'Ok',
                'Import tax type validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
                'Contract mapping validation': 'Failed',
              },
              error_message: `No contract found for this project and contact`,
              xero_records: [invoice],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
        } else {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 267 : 427,
            dynamic_values: {},
            project_id: xeroProjectDetails?.id,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
              'Contract mapping validation': 'Failed',
            },
            error_message: `Multiple contracts found for this project and contact. Please assign a contract tracking category in Xero`,
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }

      this.logger.debug(`[BILL_TRACE] V-Step 17: Final validations — contractDetails=${contractDetails ? `id=${contractDetails.contract_id}, status=${contractDetails.contract_status}, project_id=${contractDetails.project_id}, client_supplier_id=${contractDetails.client_supplier_id}` : 'null'}`);

      if (
        contractDetails &&
        clientSuppliersDetails.client_supplier_id !==
        contractDetails.client_supplier_id
      ) {
        this.logger.error(`[BILL_TRACE] V-Step 17 FAILED: Client/supplier mismatch — invoice contact cs_id=${clientSuppliersDetails.client_supplier_id} vs contract cs_id=${contractDetails.client_supplier_id}`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 271 : 431,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Mismatch in Client/supplier id`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (contractDetails && projectDetails && projectDetails.project_id !== contractDetails.project_id) {
        this.logger.error(`[BILL_TRACE] V-Step 17 FAILED: Project mismatch — tracking project_id=${projectDetails.project_id} vs contract project_id=${contractDetails.project_id}`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 272 : 432,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Mismatch in project tracking id`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        contractDetails &&
        contractDetails.contract_status !== 'In Progress'
      ) {
        this.logger.error(`[BILL_TRACE] V-Step 17 FAILED: Contract not in progress (status=${contractDetails.contract_status})`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 273 : 433,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Contract is in ${contractDetails.contract_status.toLowerCase()} state`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      this.logger.debug(`[BILL_TRACE] V-Step 18: Checking contract size — invoice total=${invoice.total}, contract initial_contract_sum=${contractDetails?.initial_contract_sum}`);
      if (
        contractDetails &&
        invoice?.status !== Invoice.StatusEnum.DRAFT &&
        Number(invoice.total) > Number(contractDetails.initial_contract_sum)
      ) {
        this.logger.error(`[BILL_TRACE] V-Step 18 FAILED: Invoice total ${invoice.total} > contract sum ${contractDetails.initial_contract_sum}`);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 277 : 437,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Amount exceeds the contract size`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
        //send warning email
      }

      this.logger.debug(`[BILL_TRACE] V-Step 18 OK: All validations passed`);

      this.logger.debug(`[BILL_TRACE] V-Step 18b: Validating contact completeness...`);
      // Per Task #154 plan: missing email alone must NOT block an
      // invoice/bill import. It downgrades to a soft-fail — the
      // contact is flagged `needs_email = true`, a warning sync log
      // (template 612 — webhook missing email) is written, and the
      // claim/payment is allowed to import. Notice sending downstream
      // checks the `needs_email` flag and suppresses outbound mail
      // until the user adds an address.
      //
      // Address and supplier-bank-account issues remain hard fails
      // — without them the claim/payment cannot be reconciled or paid.
      const _emailMissing =
        !!clientSuppliersDetails && !clientSuppliersDetails.client_email_id;
      const _otherIssues: string[] = [];
      if (clientSuppliersDetails) {
        if (!clientSuppliersDetails.client_supplier_address) {
          _otherIssues.push('Address');
        }
      }
      if (
        clientSuppliersDetails &&
        clientSuppliersDetails.client_supplier_type === 'Supplier' &&
        contractDetails
      ) {
        const supplierBankAccounts = await this.bankAccounts.find({
          where: { client_supplier_id: clientSuppliersDetails.client_supplier_id },
        });
        if (!supplierBankAccounts || supplierBankAccounts.length === 0) {
          _otherIssues.push(`Supplier bank account details`);
        } else {
          const hasComplete = supplierBankAccounts.some(
            (acc) => acc.account_number && acc.bsb_number,
          );
          if (!hasComplete) {
            _otherIssues.push(`Supplier bank account BSB number`);
          }
        }
      }

      const contactName =
        clientSuppliersDetails?.client_supplier_name ||
        xeroContactDetails?.contact_name ||
        'Unknown';

      if (_otherIssues.length > 0) {
        const issueList = _otherIssues.join(', ');
        const _emailNote = _emailMissing ? ' (email also missing)' : '';
        this.logger.error(
          `[BILL_TRACE] V-Step 18b FAILED: Contact '${contactName}' missing: ${issueList}${_emailNote}`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type: invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            contact_id: invoice?.contact?.contactID,
            client_supplier_id: clientSuppliersDetails?.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 486 : 486,
          dynamic_values: {
            contact_name: contactName,
            missing_fields: issueList,
          },
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed — contact details incomplete',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contact completeness validation': 'Failed',
          },
          error_message: `Contact '${contactName}' is missing required information: ${issueList}${_emailNote}. Please update the contact in PayTrade and retry.`,
          xero_records: [invoice],
          paytrade_records: [clientSuppliersDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // Email-only soft-fail: flag the contact and write a warning,
      // then fall through to continue the import.
      if (_emailMissing && clientSuppliersDetails) {
        this.logger.warn(
          `[BILL_TRACE] V-Step 18b WARNING: Contact '${contactName}' missing email — proceeding with import, notices will be suppressed until email is added.`,
        );
        try {
          await this.clientSuppliersDetailsService.markNeedsEmail(
            clientSuppliersDetails.id,
            true,
          );
        } catch (markErr) {
          this.logger.warn(
            `[BILL_TRACE] V-Step 18b: markNeedsEmail failed for contact ${clientSuppliersDetails.id}: ${markErr?.message || markErr}`,
          );
        }
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type: invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            contact_id: invoice?.contact?.contactID,
            client_supplier_id: clientSuppliersDetails?.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id:
            sync_run_type === 'webhook'
              ? 612
              : sync_run_type === 'scheduler'
              ? 611
              : 610,
          dynamic_values: {
            contact_name: contactName,
            invoice_id: invoice?.invoiceID,
          },
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroContactDetails?.id,
            paytradeId: clientSuppliersDetails?.id,
          },
          reference_id: clientSuppliersDetails?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Imported with warning — contact email missing, notices suppressed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contact completeness validation': 'Warning',
          },
          error_message: `Imported with warning: contact '${contactName}' has no email address. Notices will not be sent until an email is added in PayTrade or Xero.`,
          xero_records: [invoice],
          paytrade_records: [clientSuppliersDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
      }
      this.logger.debug(`[BILL_TRACE] V-Step 18b OK: Contact details complete`);

      this.logger.debug(`[BILL_TRACE] V-Step 19: Saving xero invoice record... existingXeroInvoice=${existingXeroInvoice ? `id=${existingXeroInvoice.id}` : 'null (new)'}`);

      const _deepLinkUrl = this.xeroInvoicesService.buildXeroDeepLink(
        invoice.invoiceID,
        invoice.type,
      );
      const _currentStatus = invoice.status || null;
      let xeroInvoice;
      if (existingXeroInvoice) {
        existingXeroInvoice.tenant_id = xeroDetails.tenant_id;
        existingXeroInvoice.type = invoice.type;
        existingXeroInvoice.contact_id = xeroContactDetails?.id;
        existingXeroInvoice.project_id = xeroProjectDetails?.id;
        existingXeroInvoice.contract_id = xeroContractDetails?.id;
        existingXeroInvoice.status = invoice.status;
        existingXeroInvoice.invoice_date = invoice.date;
        existingXeroInvoice.due_date = invoice.dueDate || null;
        existingXeroInvoice.reference =
          invoice.invoiceNumber || invoice.reference || null;
        existingXeroInvoice.sub_total = invoice.subTotal || null;
        existingXeroInvoice.total_tax = invoice.totalTax || null;
        existingXeroInvoice.total_amount = invoice.total || null;
        existingXeroInvoice.line_items = invoice.lineItems || [];
        existingXeroInvoice.line_amount_types = invoice.lineAmountTypes;
        existingXeroInvoice.current_xero_status = _currentStatus;
        existingXeroInvoice.deep_link_url = _deepLinkUrl;
        existingXeroInvoice.updated_group = 'SYSTEM';
        existingXeroInvoice.updated_on = moment().toISOString();
        xeroInvoice = await this.xeroInvoicesBills.save(existingXeroInvoice);
        this.logger.debug(`[BILL_TRACE] V-Step 19: Updated existing xero invoice — id=${xeroInvoice?.id}`);
      } else {
        const xeroPayload: any = {
          invoice_id: invoice.invoiceID,
          integration_id: xeroDetails.integration_id,
          tenant_id: xeroDetails.tenant_id,
          type: invoice.type,
          contact_id: xeroContactDetails?.id,
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          status: invoice.status,
          invoice_date: invoice.date,
          due_date: invoice.dueDate || null,
          reference: invoice.invoiceNumber || invoice.reference || null,
          sub_total: invoice.subTotal || null,
          total_tax: invoice.totalTax || null,
          total_amount: invoice.total || null,
          line_items: invoice.lineItems || [],
          line_amount_types: invoice.lineAmountTypes,
          current_xero_status: _currentStatus,
          deep_link_url: _deepLinkUrl,
          is_stale: false,
          created_group: 'SYSTEM',
          created_on: moment().toISOString(),
        };
        const newXeroInvoice = await this.xeroInvoicesBills.create(xeroPayload);
        xeroInvoice = await this.xeroInvoicesBills.save(newXeroInvoice);
        this.logger.debug(`[BILL_TRACE] V-Step 19: Created new xero invoice — id=${xeroInvoice?.id}`);
      }

      // Refresh cached PDF for non-void/non-deleted CREATE/UPDATE events.
      // Fire-and-forget so the webhook handler is not blocked by Xero's
      // PDF endpoint latency. fetchAndCacheXeroPdf updates
      // cached_pdf_object_key, last_fetched_at, deep_link_url, and clears
      // is_stale on success.
      const _statusUpper = String(_currentStatus || '').toUpperCase();
      if (_statusUpper !== 'VOIDED' && _statusUpper !== 'DELETED') {
        this.xeroInvoicesService
          .fetchAndCacheXeroPdf({
            company_id,
            invoice_id: invoice.invoiceID,
            integration_id: xeroDetails.integration_id,
            type: invoice.type,
            status: _currentStatus,
            // Always re-refresh the token inside fetchAndCacheXeroPdf.
            // The earlier V-Step 2 refresh can be invalidated by
            // concurrent Xero calls reseating the in-memory token
            // (this is what caused the persistent 401s on the manual
            // catch-up path). The redundant refresh is cheap and
            // protected by the Redis token-refresh lock.
          })
          .catch((err: any) => {
            this.logger.error(
              `[XERO_PDF] webhook PDF refresh failed for ${invoice.invoiceID}: ${err?.message || err}`,
            );
          });
      }

      if (xeroInvoice) {
        this.logger.debug(`[BILL_TRACE] V-Step 20: Invoice saved. pt_claim_id=${xeroInvoice?.pt_claim_id || 'null'}. Proceeding to claim creation...`);
        if (!xeroInvoice?.pt_claim_id) {
          const {
            retentionClaimnlineItem,
            lineItem1,
            lineItem2,
            hasBaseLine,
            netRetainedSigned,
            codesShared,
          } = XeroWebhookService.classifyRetentionShape(invoice, xeroDetails);

          const webhookSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
          this.logger.debug(`[BILL_TRACE] V-Step 20: cash_retention_type check — retentionClaimLineItem=${retentionClaimnlineItem}, lineItem1=${lineItem1}, lineItem2=${lineItem2}, hasBaseLine=${hasBaseLine}, netRetainedSigned=${netRetainedSigned}, codesShared=${codesShared}, simplifiedRetention=${webhookSimplifiedRetention}`);
          if (!webhookSimplifiedRetention && ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2))) {
            this.logger.error(`[BILL_TRACE] V-Step 20 FAILED: Retention line item count mismatch (need 2). Writing sync log 274/434.`);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id || null,
              api_name: 'createClaimInPaytrade',
              api_payload: {
                sync_run_type,
                invoice_id: invoice?.invoiceID,
                tenant_id,
                type:
                  invoice?.type === Invoice.TypeEnum.ACCPAY
                    ? 'bill'
                    : 'invoice',
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: sync_run_type === 'webhook' ? 274 : 434,
              dynamic_values: {},
              project_id: xeroProjectDetails?.id,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: xeroInvoice?.id,
                paytradeId: null,
              },
              reference_id: xeroInvoice?.id,
              history: [
                `API triggered from invoice ${sync_run_type}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
                'Import tracking id validation': 'Ok',
                'Import account type validation': 'Ok',
                'Import tax type validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
                'Contract mapping validation': 'Ok',
                'Project mapping validation': 'Ok',
              },
              error_message: `There should be 2 line items for a retention`,
              xero_records: [invoice],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }

          const cash_retention_type = retentionClaimnlineItem
            ? 'Retention claim'
            : 'Claim';

          let retention_id = null,
            associated_retention_sub_payment_id = null;
          if (cash_retention_type === 'Retention claim') {
            if (
              !data?.retention_id &&
              !data?.associated_retention_sub_payment_id
            ) {
              const retentionListQuery = `
                select pc.company_id, pc.payment_claim_id, pc.claim_type, pc.project_id, pc.client_supplier_id, pc.contract_id, pc.claim_amount, 
                p.payment_id, s.sub_payment_id, r.retention_id, r.retained_amount, r.retention_status 
                from payment_claims pc inner join payment_details p on pc.payment_claim_id = p.payment_claim_id and pc.cash_retention_type <> 'Retention claim' 
                inner join sub_payments s on p.payment_id = s.payment_id and p.current_status <> 'Deleted' 
                inner join retention_details r on p.payment_id = r.payment_id and s.sub_payment_id = r.sub_payment_id and r.retention_status = 'Retained' 
                inner join integration_details i on i.company_id = pc.company_id and i.integration_status = 'Connected - active'  
                where pc.company_id = ${company_id} and pc.project_id = ${xeroProjectDetails?.pt_project_id || projectDetails?.project_id} and pc.client_supplier_id = ${xeroContactDetails.pt_contact_id} and pc.contract_id = ${contractDetails?.contract_id};`;

              const retentionDetails =
                await this.dataSource.query(retentionListQuery);
              this.logger.log(retentionDetails);

              if (!retentionDetails) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    project_id: contractDetails?.project_id,
                    contract_id: contractDetails?.contract_id,
                    client_supplier_id: xeroContactDetails?.pt_contact_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 275 : 435,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Retention list is not identified`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }

              if (
                retentionDetails &&
                Array.isArray(retentionDetails) &&
                retentionDetails.length > 0
              ) {
                const identifiedRetentions =
                  retentionDetails?.filter(
                    (retention) =>
                      Number(retention.retained_amount) ==
                      Number(invoice.total),
                  ) || [];
                if (identifiedRetentions && identifiedRetentions.length > 0) {
                  if (identifiedRetentions.length == 1) {
                    retention_id = identifiedRetentions[0]?.retention_id;
                    associated_retention_sub_payment_id =
                      identifiedRetentions[0]?.sub_payment_id;
                  } else {
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        project_id: contractDetails?.project_id,
                        contract_id: contractDetails?.contract_id,
                        client_supplier_id: xeroContactDetails?.pt_contact_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 276 : 436,
                      dynamic_values: {},
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: xeroInvoice?.id,
                        paytradeId: null,
                      },
                      reference_id: xeroInvoice?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `Multiple retentions identified`,
                      xero_records: [invoice],
                      paytrade_records: [],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                } else {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      project_id: contractDetails?.project_id,
                      contract_id: contractDetails?.contract_id,
                      client_supplier_id: xeroContactDetails?.pt_contact_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 275 : 435,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroInvoice?.id,
                      paytradeId: null,
                    },
                    reference_id: xeroInvoice?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `Retention list is not identified`,
                    xero_records: [invoice],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              } else {
                if (
                  retentionDetails &&
                  retentionDetails.retained_amount &&
                  Number(retentionDetails.retained_amount) ==
                    Number(invoice.total)
                ) {
                  retention_id = retentionDetails?.retention_id;
                  associated_retention_sub_payment_id =
                    retentionDetails?.sub_payment_id;
                } else {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      project_id: contractDetails?.project_id,
                      contract_id: contractDetails?.contract_id,
                      client_supplier_id: xeroContactDetails?.pt_contact_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 275 : 435,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroInvoice?.id,
                      paytradeId: null,
                    },
                    reference_id: xeroInvoice?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `Retention list is not identified`,
                    xero_records: [invoice],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            } else {
              retention_id = data?.retention_id || null;
              associated_retention_sub_payment_id =
                data?.associated_retention_sub_payment_id || null;
            }
          }
          //Get new claim - Invoice type check - retention check
          const retentionLineItems =
            invoice?.lineItems?.filter((item) =>
              [
                xeroDetails.retention_payable_retained_code,
                // xeroDetails.liability_payable_code,
                // xeroDetails.retention_payable_release_code,
                xeroDetails.retention_receivable_retained_code,
                // xeroDetails.liability_receivable_code,
                // xeroDetails.retention_receivable_release_code,
              ].includes(item?.accountCode),
            ) || [];

          // See xero-invoices.service.ts adjustItemsWithRetention for
          // the full rationale: track ex-GST (unit) and GST (tax)
          // retention portions separately so BAS-Excluded retention
          // lines aren't double-deducted for phantom GST. When the
          // company's retention_recording_mode is 'inc_gst' on Inclusive
          // invoices the unitAmount on the retention line is the gross
          // figure regardless of taxAmount, so derive the split from u.
          const vUseIncGstSplit =
            xeroDetails.retention_recording_mode === 'inc_gst' &&
            invoice.lineAmountTypes === LineAmountTypes.Inclusive;
          const retentionUnitOnly = retentionLineItems.reduce((sum, item) => {
            const u = Math.abs(Number(item?.unitAmount || 0));
            const t = Math.abs(Number(item?.taxAmount || 0));
            if (vUseIncGstSplit) return sum + u / 1.1;
            const unitExGst =
              invoice.lineAmountTypes === LineAmountTypes.Inclusive ? u - t : u;
            return sum + unitExGst;
          }, 0.0);
          const retentionTaxOnly = retentionLineItems.reduce((sum, item) => {
            const u = Math.abs(Number(item?.unitAmount || 0));
            if (vUseIncGstSplit) return sum + (u - u / 1.1);
            return sum + Math.abs(Number(item?.taxAmount || 0));
          }, 0.0);
          const retentionAmount = retentionUnitOnly + retentionTaxOnly;

          const cashRetention =
            cash_retention_type === 'Claim' &&
            retentionLineItems &&
            retentionLineItems.length > 0 &&
            retentionAmount > 0
              ? true
              : false;

          let invoices = [],
            filteredInvoices = [],
            retentionPercentage = 0,
            retainedAmountExcludingGST = 0;
          if (invoice.lineItems && invoice.lineItems.length > 0) {
            // Task #41 — variable bill code per supplier (V-Step path).
            const vResolvedBillCode = await this.resolveInboundBillCode(
              decoded,
              xeroDetails,
              clientSuppliersDetails,
              projectDetails?.project_id ?? null,
              invoice,
              data?.sync_id || null,
            );
            // Variable mode: unresolved → hard-fail (resolveInboundBillCode
            // already wrote sync log 609). Non-variable: keep legacy fallback.
            if (
              invoice.type === Invoice.TypeEnum.ACCPAY &&
              xeroDetails?.bill_code_is_variable &&
              vResolvedBillCode == null
            ) {
              this.logger.error(
                `[BILL_TRACE] V-Step: variable bill code unresolved → aborting import for invoice ${invoice?.invoiceID}`,
              );
              return false;
            }
            const vBaseAccountCode =
              invoice.type === Invoice.TypeEnum.ACCPAY
                ? vResolvedBillCode || xeroDetails.bill_code
                : xeroDetails.invoice_code;
            filteredInvoices = invoice.lineItems?.filter(
              (item) => item.accountCode === vBaseAccountCode,
            );
            if (cashRetention && webhookSimplifiedRetention) {
              invoices = this.xeroInvoicesService.mapItemsDirectly(
                filteredInvoices,
                invoice.lineAmountTypes,
              );
            } else {
              invoices = await this.xeroInvoicesService.adjustItemsWithRetention(
                invoice,
                filteredInvoices,
                retentionUnitOnly,
                retentionTaxOnly,
                invoice.lineAmountTypes,
              );
            }

            const subtotal = invoices.reduce((sum, i) => sum + i.unit_price, 0);
            retainedAmountExcludingGST = retentionUnitOnly;
            retentionPercentage = subtotal !== 0 ? (retainedAmountExcludingGST / subtotal) * 100 : 0;
            this.logger.debug(`[BILL_TRACE] V-Step retention math: retentionUnitOnly=${retentionUnitOnly}, retentionTaxOnly=${retentionTaxOnly}, subtotal=${subtotal}, retentionPercentage=${retentionPercentage}`);
          }

          // Future-date check removed: Xero does not have a "received
          // date" field — this was actually checking the bill/invoice
          // issue Date, which suppliers and admins legitimately
          // pre-date into the future (e.g. an invoice issued today
          // for next week's billing period). Rejecting these blocked
          // valid ingest and forced users to edit Xero just to make
          // PayTrade accept the record. Mirrors the past-due-date
          // removal below.

          // Past-due-date check removed: a bill or invoice with a due
          // date in the past is a legitimate record (overdue or
          // already paid) and downstream PayTrade logic handles
          // overdue state correctly. Refusing the import on that
          // basis blocked legitimate ingest of both historical paid
          // records and currently-overdue unpaid records, which the
          // user has confirmed should always import.

          let isS75eligible = false,
            claimNotPaidCount = 0;

          if (invoice.type === Invoice.TypeEnum.ACCREC) {
            const subscriptionDetails =
              await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
                company_id,
              );

            const noticesItem = subscriptionDetails?.plan_items.find(
              (item) => item?.item_name === 'Notices',
            );
            const planValue = noticesItem?.limit_value
              ? noticesItem.limit_value
              : '';

            if (
              ((planValue && planValue !== 'Manual') ||
                subscriptionDetails?.is_free_plan_eligible) &&
              xeroProjectDetails?.pt_project_id &&
              projectDetails &&
              projectDetails?.project_role === 'Head Contractor' &&
              contractDetails &&
              contractDetails?.client_supplier_role === 'Principal'
            ) {
              isS75eligible = true;
              const { payment_claims, total_count } =
                await this.paymentClaimsService.fetchSubContractorClaimsByHeadContractor(
                  {
                    project_id: xeroProjectDetails?.pt_project_id,
                    page: null,
                    items_per_page: null,
                  },
                );

              claimNotPaidCount = total_count;
              if (
                claimNotPaidCount > 0 &&
                (!data?.claims_with_reason ||
                  data?.claims_with_reason?.length == 0)
              ) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    project_id: contractDetails?.project_id,
                    contract_id: contractDetails?.contract_id,
                    client_supplier_id: xeroContactDetails?.pt_contact_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 353 : 456,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Missing reason for non-paid claim(s)`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            } else if (
              !data?.compulsory_attachment_ids ||
              data?.compulsory_attachment_ids?.length == 0
            ) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  project_id: contractDetails?.project_id,
                  contract_id: contractDetails?.contract_id,
                  client_supplier_id: xeroContactDetails?.pt_contact_id,
                  type:
                    invoice?.type === Invoice.TypeEnum.ACCPAY
                      ? 'bill'
                      : 'invoice',
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: sync_run_type === 'webhook' ? 354 : 457,
                dynamic_values: {},
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xeroInvoice?.id,
                  paytradeId: null,
                },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Import failed',
                ],
                important_checks: {
                  'Import data format validation': 'Failed',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: `Missing supporting statement attachments`,
                xero_records: [invoice],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
          }

          let expectedDraftStatusCheck = null;

          if (invoice.type === Invoice.TypeEnum.ACCPAY) {
            expectedDraftStatusCheck = xeroDetails.xero_to_pt_bill_as_draft;
          } else if (invoice.type === Invoice.TypeEnum.ACCREC) {
            expectedDraftStatusCheck = xeroDetails.xero_to_pt_invoice_as_draft;
          }

          const claimStatus =
            expectedDraftStatusCheck === 'No'
              ? invoice.status === Invoice.StatusEnum.DRAFT
                ? 'Draft'
                : 'Confirmed'
              : 'Draft';

          const claimData: AddPaymentClaimInput = {
            company_id,
            claim_type:
              invoice.type === Invoice.TypeEnum.ACCPAY
                ? 'Billable'
                : 'Receivable',
            cash_retention_type,
            status: claimStatus,
            project_id: contractDetails?.project_id || projectDetails?.project_id,
            contract_id: contractDetails?.contract_id,
            client_supplier_id: xeroContactDetails.pt_contact_id,
            client_supplier_type: clientSuppliersDetails.client_supplier_type,
            due_date: new Date(invoice.dueDate),
            received_date:
              invoice.type === Invoice.TypeEnum.ACCPAY
                ? new Date(invoice.date)
                : null,
            sent_date:
              invoice.type === Invoice.TypeEnum.ACCREC
                ? new Date(invoice.date)
                : null,
            invoices,
            associated_retention_sub_payment_id,
            retention_id,
            // Sum of recomputed per-line totals so SUB TOTAL + GST = TOTAL
            // on the claim drawer. The previous `invoice.total +
            // retentionAmount` mirrored Xero's raw figures, but
            // `adjustItemsWithRetention` now recomputes per-line GST as
            // `workLineRate × merged_unit` (clean 10% on the merged
            // ex-GST unit when the work line is taxable, 0 otherwise).
            // For BAS-Excluded retention setups, that recomputed GST
            // diverges from `invoice.totalTax + retentionTaxOnly` by
            // exactly the missing GST on the retention portion, so we
            // must derive `claim_amount` from the SAME numbers we just
            // wrote into `invoices` (otherwise SUB TOTAL $15,724 + GST
            // $1,572.40 = $17,296.40 but TOTAL would still show
            // $17,217.78 from the old formula).
            claim_amount: Array.isArray(invoices)
              ? parseFloat(
                  invoices
                    .reduce(
                      (sum, i) =>
                        sum + Number(i?.total_amount_including_gst || 0),
                      0,
                    )
                    .toFixed(2),
                )
              : Number(invoice.total || 0) + retentionAmount,
            cash_retention: cashRetention,
            retention_percentage: retentionPercentage,
            // Use the already-computed ex-GST retention (which is just
            // `retentionUnitOnly` when retention is present). The previous
            // `retentionAmount / 1.1` re-strip wrongly attributed phantom
            // GST when retention lines were BAS Excluded — see
            // adjustItemsWithRetention rationale.
            retention_amount: cashRetention ? retainedAmountExcludingGST : 0,
            // retention_amount_with_gst is what the payment page shows
            // under "Retention amount (including GST)". The user's mental
            // model is "retention as a slice of the gross claim total",
            // so we gross up the ex-GST retention by the work-line's GST
            // rate regardless of whether the retention line itself is
            // BAS Excluded in Xero. Rate is derived from the invoice
            // header (totalTax / subTotal), falling back to 10% for
            // taxable invoices and 0% for NoTax invoices.
            retention_amount_with_gst: cashRetention
              ? parseFloat(
                  (
                    retainedAmountExcludingGST *
                    (1 +
                      (invoice.lineAmountTypes === LineAmountTypes.NoTax
                        ? 0
                        : Number(invoice.subTotal) > 0
                          ? Number(invoice.totalTax || 0) /
                            Number(invoice.subTotal)
                          : 0.1))
                  ).toFixed(2),
                )
              : 0,
            // Pull through the Xero invoice/bill number as the PT claim
            // reference so users don't have to re-key it.
            claim_reference:
              invoice.invoiceNumber || invoice.reference || null,
            compulsory_attachment_ids: data?.compulsory_attachment_ids || [],
            all_subcontracts_paid: claimNotPaidCount > 0 ? false : true,
            is_gst_optional:
              invoice.lineAmountTypes !== LineAmountTypes.NoTax ? true : false,
            pending_claims_with_reason:
              claimNotPaidCount > 0 && data.claims_with_reason
                ? data.claims_with_reason
                : [],
          };

          const response = await this.paymentClaimsService.addPaymentClaim(
            decoded,
            claimData,
            decoded?.userId,
          );
          if (response) {
            xeroInvoice.pt_claim_id = response.payment_claim_id;
            xeroInvoice.mapped_status = 'System';
            xeroInvoice.updated_on = moment().toISOString();
            xeroInvoice.updated_group = 'SYSTEM';
            const xero_invoice = await this.xeroInvoicesBills.save(xeroInvoice);

            const claimDetails = await this.paymentClaims.findOne({
              where: { id: response?.id },
            });

            // Phase 3 — auto gross-up retention via Manual Journals on
            // inbound (Xero → PT) Claim creation. Best-effort: failures
            // are written to sync logs and never block the webhook.
            try {
              if (
                this.xeroManualJournalService.isAutoGrossUpEnabled(xeroDetails) &&
                Number(claimDetails?.retention_amount) > 0
              ) {
                const baseCode =
                  invoice?.type === Invoice.TypeEnum.ACCPAY
                    ? xeroDetails?.bill_code
                    : xeroDetails?.invoice_code;
                const baseLine =
                  Array.isArray(invoice?.lineItems) && baseCode
                    ? invoice.lineItems.find(
                        (li: any) => li?.accountCode === baseCode,
                      )
                    : null;
                const kind: 'gross_up' | 'gross_up_reversal' =
                  claimDetails?.cash_retention_type === 'Retention claim'
                    ? 'gross_up_reversal'
                    : 'gross_up';
                await this.xeroManualJournalService.postGrossUpJournal(
                  decoded,
                  {
                    claim: claimDetails,
                    xeroDetails,
                    contact: clientSuppliersDetails,
                    retentionExGst: Number(claimDetails?.retention_amount) || 0,
                    baseLineTaxType: baseLine?.taxType || null,
                    invoice_id: invoice?.invoiceID || null,
                  },
                  kind,
                  this.xero,
                );
              }
            } catch (mjErr: any) {
              this.logger.error(
                `[MJ_INBOUND_CREATE] gross-up post failed for claim ${claimDetails?.payment_claim_id}: ${mjErr?.message || mjErr}`,
              );
            }

            this.logger.log(JSON.stringify({ response: response?.id }));
            // if (isS75eligible) {
            //   const file = await this.paymentClaimsService.generateS75Pdf(
            //     {
            //       new_claim_id: response.payment_claim_id,
            //       project_id: xeroProjectDetails?.pt_project_id,
            //       claims_with_reason:
            //         claimNotPaidCount > 0 && data.claims_with_reason
            //           ? data.claims_with_reason
            //           : [],
            //     },
            //     {},
            //   );
            // }

            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  type:
                    invoice?.type === Invoice.TypeEnum.ACCPAY
                      ? 'bill'
                      : 'invoice',
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                dynamic_values: { id: claimDetails?.id },
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xero_invoice?.id,
                  paytradeId: claimDetails?.id,
                },
                reference_id: xero_invoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Import successful',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: null,
                xero_records: [invoice],
                paytrade_records: [claimDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
        } else {
          //update invoice and payment code should come here
          const claimDetails = await this.paymentClaims.findOne({
            where: { payment_claim_id: xeroInvoice?.pt_claim_id },
            relations: ['paymentClaimInvoices'],
          });

          if (['DRAFT', 'SUBMITTED', 'AUTHORISED'].includes(invoice.status)) {
            if (['Draft', 'Confirmed'].includes(claimDetails.status)) {
              claimDetails['invoices'] = claimDetails.paymentClaimInvoices;
              const {
                retentionClaimnlineItem,
                lineItem1,
                lineItem2,
                hasBaseLine,
                netRetainedSigned,
                codesShared,
              } = XeroWebhookService.classifyRetentionShape(invoice, xeroDetails);

              const draftSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
              this.logger.debug(`[BILL_TRACE] D-Step: cash_retention_type check (draft path) — retentionClaimLineItem=${retentionClaimnlineItem}, lineItem1=${lineItem1}, lineItem2=${lineItem2}, hasBaseLine=${hasBaseLine}, netRetainedSigned=${netRetainedSigned}, codesShared=${codesShared}, simplifiedRetention=${draftSimplifiedRetention}`);
              if (!draftSimplifiedRetention && ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2))) {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 274 : 434,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `There should be 2 line items for a retention`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }

              const cash_retention_type = retentionClaimnlineItem
                ? 'Retention claim'
                : 'Claim';

              let retention_id = null,
                associated_retention_sub_payment_id = null;
              if (cash_retention_type === 'Retention claim') {
                if (claimDetails.status === 'Draft') {
                  if (
                    !data?.retention_id &&
                    !data?.associated_retention_sub_payment_id
                  ) {
                    const retentionListQuery = `
                      select pc.company_id, pc.payment_claim_id, pc.claim_type, pc.project_id, pc.client_supplier_id, pc.contract_id, pc.claim_amount, 
                      p.payment_id, s.sub_payment_id, r.retention_id, r.retained_amount, r.retention_status 
                      from payment_claims pc inner join payment_details p on pc.payment_claim_id = p.payment_claim_id and pc.cash_retention_type <> 'Retention claim' 
                      inner join sub_payments s on p.payment_id = s.payment_id and p.current_status <> 'Deleted' 
                      inner join retention_details r on p.payment_id = r.payment_id and s.sub_payment_id = r.sub_payment_id and r.retention_status = 'Retained' 
                      inner join integration_details i on i.company_id = pc.company_id and i.integration_status = 'Connected - active' 
                      where pc.company_id = ${company_id} and pc.project_id = ${xeroProjectDetails?.pt_project_id || projectDetails?.project_id} and pc.client_supplier_id = ${xeroContactDetails.pt_contact_id} and pc.contract_id = ${contractDetails?.contract_id};`;

                    const retentionDetails =
                      await this.dataSource.query(retentionListQuery);
                    this.logger.log(retentionDetails);

                    if (!retentionDetails) {
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          project_id: contractDetails?.project_id,
                          contract_id: contractDetails?.contract_id,
                          client_supplier_id: xeroContactDetails?.pt_contact_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 275 : 435,
                        dynamic_values: {},
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: xeroInvoice?.id,
                          paytradeId: null,
                        },
                        reference_id: xeroInvoice?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import failed',
                        ],
                        important_checks: {
                          'Import data format validation': 'Failed',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: `Retention list is not identified`,
                        xero_records: [invoice],
                        paytrade_records: [],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                      return false;
                    }

                    if (
                      retentionDetails &&
                      Array.isArray(retentionDetails) &&
                      retentionDetails.length > 0
                    ) {
                      const identifiedRetentions =
                        retentionDetails?.filter(
                          (retention) =>
                            Number(retention.retained_amount) ==
                            Number(invoice.total),
                        ) || [];
                      if (
                        identifiedRetentions &&
                        identifiedRetentions.length > 0
                      ) {
                        if (identifiedRetentions.length == 1) {
                          retention_id = identifiedRetentions[0]?.retention_id;
                          associated_retention_sub_payment_id =
                            identifiedRetentions[0]?.sub_payment_id;
                        } else {
                          await this.xeroService.insertXeroSyncLogs(decoded, {
                            id: data?.sync_id || null,
                            api_name: 'createClaimInPaytrade',
                            api_payload: {
                              sync_run_type,
                              invoice_id: invoice?.invoiceID,
                              tenant_id,
                              project_id: contractDetails?.project_id,
                              contract_id: contractDetails?.contract_id,
                              client_supplier_id:
                                xeroContactDetails?.pt_contact_id,
                              type:
                                invoice?.type === Invoice.TypeEnum.ACCPAY
                                  ? 'bill'
                                  : 'invoice',
                            },
                            integration_id: xeroDetails.integration_id,
                            log_template_id:
                              sync_run_type === 'webhook' ? 276 : 436,
                            dynamic_values: {},
                            project_id: xeroProjectDetails?.id,
                            contract_id: xeroContractDetails?.id,
                            reference: {
                              xeroId: xeroInvoice?.id,
                              paytradeId: null,
                            },
                            reference_id: xeroInvoice?.id,
                            history: [
                              `API triggered from invoice ${sync_run_type}`,
                              'Import failed',
                            ],
                            important_checks: {
                              'Import data format validation': 'Failed',
                              'Import tracking id validation': 'Ok',
                              'Import account type validation': 'Ok',
                              'Import tax type validation': 'Ok',
                              'Client/Supplier mapping validation': 'Ok',
                              'Contract mapping validation': 'Ok',
                              'Project mapping validation': 'Ok',
                            },
                            error_message: `Multiple retentions identified`,
                            xero_records: [invoice],
                            paytrade_records: [],
                            new_records: null,
                            updated_records: null,
                            synced_records: null,
                          });
                          return false;
                        }
                      } else {
                        await this.xeroService.insertXeroSyncLogs(decoded, {
                          id: data?.sync_id || null,
                          api_name: 'createClaimInPaytrade',
                          api_payload: {
                            sync_run_type,
                            invoice_id: invoice?.invoiceID,
                            tenant_id,
                            project_id: contractDetails?.project_id,
                            contract_id: contractDetails?.contract_id,
                            client_supplier_id:
                              xeroContactDetails?.pt_contact_id,
                            type:
                              invoice?.type === Invoice.TypeEnum.ACCPAY
                                ? 'bill'
                                : 'invoice',
                          },
                          integration_id: xeroDetails.integration_id,
                          log_template_id:
                            sync_run_type === 'webhook' ? 275 : 435,
                          dynamic_values: {},
                          project_id: xeroProjectDetails?.id,
                          contract_id: xeroContractDetails?.id,
                          reference: {
                            xeroId: xeroInvoice?.id,
                            paytradeId: null,
                          },
                          reference_id: xeroInvoice?.id,
                          history: [
                            `API triggered from invoice ${sync_run_type}`,
                            'Import failed',
                          ],
                          important_checks: {
                            'Import data format validation': 'Failed',
                            'Import tracking id validation': 'Ok',
                            'Import account type validation': 'Ok',
                            'Import tax type validation': 'Ok',
                            'Client/Supplier mapping validation': 'Ok',
                            'Contract mapping validation': 'Ok',
                            'Project mapping validation': 'Ok',
                          },
                          error_message: `Retention list is not identified`,
                          xero_records: [invoice],
                          paytrade_records: [],
                          new_records: null,
                          updated_records: null,
                          synced_records: null,
                        });
                        return false;
                      }
                    } else {
                      if (
                        retentionDetails &&
                        retentionDetails.retained_amount &&
                        Number(retentionDetails.retained_amount) ==
                          Number(invoice.total)
                      ) {
                        retention_id = retentionDetails?.retention_id;
                        associated_retention_sub_payment_id =
                          retentionDetails?.sub_payment_id;
                      } else {
                        await this.xeroService.insertXeroSyncLogs(decoded, {
                          id: data?.sync_id || null,
                          api_name: 'createClaimInPaytrade',
                          api_payload: {
                            sync_run_type,
                            invoice_id: invoice?.invoiceID,
                            tenant_id,
                            project_id: contractDetails?.project_id,
                            contract_id: contractDetails?.contract_id,
                            client_supplier_id:
                              xeroContactDetails?.pt_contact_id,
                            type:
                              invoice?.type === Invoice.TypeEnum.ACCPAY
                                ? 'bill'
                                : 'invoice',
                          },
                          integration_id: xeroDetails.integration_id,
                          log_template_id:
                            sync_run_type === 'webhook' ? 275 : 435,
                          dynamic_values: {},
                          project_id: xeroProjectDetails?.id,
                          contract_id: xeroContractDetails?.id,
                          reference: {
                            xeroId: xeroInvoice?.id,
                            paytradeId: null,
                          },
                          reference_id: xeroInvoice?.id,
                          history: [
                            `API triggered from invoice ${sync_run_type}`,
                            'Import failed',
                          ],
                          important_checks: {
                            'Import data format validation': 'Failed',
                            'Import tracking id validation': 'Ok',
                            'Import account type validation': 'Ok',
                            'Import tax type validation': 'Ok',
                            'Client/Supplier mapping validation': 'Ok',
                            'Contract mapping validation': 'Ok',
                            'Project mapping validation': 'Ok',
                          },
                          error_message: `Retention list is not identified`,
                          xero_records: [invoice],
                          paytrade_records: [],
                          new_records: null,
                          updated_records: null,
                          synced_records: null,
                        });
                        return false;
                      }
                    }
                  } else {
                    retention_id = data?.retention_id || null;
                    associated_retention_sub_payment_id =
                      data?.associated_retention_sub_payment_id || null;
                  }
                } else {
                  retention_id = claimDetails?.retention_id;
                  associated_retention_sub_payment_id =
                    claimDetails?.associated_retention_sub_payment_id;
                }
              }
              //Get new claim - Invoice type check - retention check
              const retentionLineItems =
                invoice?.lineItems?.filter((item) =>
                  [
                    xeroDetails.retention_payable_retained_code,
                    // xeroDetails.liability_payable_code,
                    // xeroDetails.retention_payable_release_code,
                    xeroDetails.retention_receivable_retained_code,
                    // xeroDetails.liability_receivable_code,
                    // xeroDetails.retention_receivable_release_code,
                  ].includes(item?.accountCode),
                ) || [];

              // Honour retention_recording_mode = 'inc_gst' on Inclusive
              // invoices: unitAmount is the gross figure (BAS-Excluded
              // retention accounts have taxAmount=0 but the user still
              // wants the inc-GST amount on the line). Derive the split
              // from u rather than (u - taxAmount).
              const dUseIncGstSplit =
                xeroDetails.retention_recording_mode === 'inc_gst' &&
                invoice.lineAmountTypes === LineAmountTypes.Inclusive;
              const retentionUnitOnly = retentionLineItems.reduce((sum, item) => {
                const u = Math.abs(Number(item?.unitAmount || 0));
                const t = Math.abs(Number(item?.taxAmount || 0));
                if (dUseIncGstSplit) return sum + u / 1.1;
                const unitExGst =
                  invoice.lineAmountTypes === LineAmountTypes.Inclusive ? u - t : u;
                return sum + unitExGst;
              }, 0.0);
              const retentionTaxOnly = retentionLineItems.reduce((sum, item) => {
                const u = Math.abs(Number(item?.unitAmount || 0));
                if (dUseIncGstSplit) return sum + (u - u / 1.1);
                return sum + Math.abs(Number(item?.taxAmount || 0));
              }, 0.0);
              const retentionAmount = retentionUnitOnly + retentionTaxOnly;

              const cashRetention =
                cash_retention_type === 'Claim' &&
                retentionLineItems &&
                retentionLineItems.length > 0 &&
                retentionAmount > 0
                  ? true
                  : false;

              let invoices = [],
                filteredInvoices = [],
                retentionPercentage = 0,
                retainedAmountExcludingGST = 0;
              if (invoice.lineItems && invoice.lineItems.length > 0) {
                // Task #41 — variable bill code per supplier (D-Step path).
                const dResolvedBillCode = await this.resolveInboundBillCode(
                  decoded,
                  xeroDetails,
                  clientSuppliersDetails,
                  projectDetails?.project_id ?? null,
                  invoice,
                  data?.sync_id || null,
                );
                if (
                  invoice.type === Invoice.TypeEnum.ACCPAY &&
                  xeroDetails?.bill_code_is_variable &&
                  dResolvedBillCode == null
                ) {
                  this.logger.error(
                    `[BILL_TRACE] D-Step: variable bill code unresolved → aborting import for invoice ${invoice?.invoiceID}`,
                  );
                  return false;
                }
                const dBaseAccountCode =
                  invoice.type === Invoice.TypeEnum.ACCPAY
                    ? dResolvedBillCode || xeroDetails.bill_code
                    : xeroDetails.invoice_code;
                filteredInvoices = invoice.lineItems?.filter(
                  (item) => item.accountCode === dBaseAccountCode,
                );
                if (cashRetention && draftSimplifiedRetention) {
                  invoices = this.xeroInvoicesService.mapItemsDirectly(
                    filteredInvoices,
                    invoice.lineAmountTypes,
                  );
                } else {
                  invoices =
                    await this.xeroInvoicesService.adjustItemsWithRetention(
                      invoice,
                      filteredInvoices,
                      retentionUnitOnly,
                      retentionTaxOnly,
                      invoice.lineAmountTypes,
                    );
                }
                for (const element of invoices) {
                  element.payment_claim_id = claimDetails?.payment_claim_id;
                }
                const subtotal = invoices.reduce(
                  (sum, i) => sum + i.unit_price,
                  0,
                );
                retainedAmountExcludingGST = retentionUnitOnly;
                retentionPercentage =
                  subtotal !== 0 ? (retainedAmountExcludingGST / subtotal) * 100 : 0;
                this.logger.debug(`[BILL_TRACE] D-Step retention math: retentionUnitOnly=${retentionUnitOnly}, retentionTaxOnly=${retentionTaxOnly}, subtotal=${subtotal}, retentionPercentage=${retentionPercentage}`);
              }

              // Future-date check removed: Xero does not have a
              // "received date" field — this was actually checking
              // the bill/invoice issue Date, which suppliers and
              // admins legitimately pre-date into the future (e.g.
              // an invoice issued today for next week's billing
              // period). Rejecting these blocked valid ingest and
              // forced users to edit Xero just to make PayTrade
              // accept the record. Mirrors the past-due-date
              // removal below.

              // Past-due-date check removed for the same reason as the
              // create path above — overdue is a legitimate state and
              // import should proceed with the original past dates.

              let isS75eligible = false,
                claimNotPaidCount = 0;

              if (invoice.type === Invoice.TypeEnum.ACCREC) {
                const subscriptionDetails =
                  await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
                    company_id,
                  );

                const noticesItem = subscriptionDetails?.plan_items.find(
                  (item) => item?.item_name === 'Notices',
                );
                const planValue = noticesItem?.limit_value
                  ? noticesItem.limit_value
                  : '';

                if (
                  ((planValue && planValue !== 'Manual') ||
                    subscriptionDetails?.is_free_plan_eligible) &&
                  xeroProjectDetails?.pt_project_id &&
                  projectDetails &&
                  projectDetails?.project_role === 'Head Contractor' &&
                  contractDetails &&
                  contractDetails?.client_supplier_role === 'Principal'
                ) {
                  isS75eligible = true;
                  const { payment_claims, total_count } =
                    await this.paymentClaimsService.fetchSubContractorClaimsByHeadContractor(
                      {
                        project_id: xeroProjectDetails?.pt_project_id,
                        page: null,
                        items_per_page: null,
                      },
                    );

                  claimNotPaidCount = total_count;
                  if (
                    claimNotPaidCount > 0 &&
                    (!data?.claims_with_reason ||
                      data?.claims_with_reason?.length == 0)
                  ) {
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        project_id: contractDetails?.project_id,
                        contract_id: contractDetails?.contract_id,
                        client_supplier_id: xeroContactDetails?.pt_contact_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 353 : 456,
                      dynamic_values: {},
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: xeroInvoice?.id,
                        paytradeId: null,
                      },
                      reference_id: xeroInvoice?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `Missing reason for non-paid claim(s)`,
                      xero_records: [invoice],
                      paytrade_records: [],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                } else if (
                  (!claimDetails?.compulsory_attachment_ids ||
                    claimDetails?.compulsory_attachment_ids?.length == 0) &&
                  (!data?.compulsory_attachment_ids ||
                    data?.compulsory_attachment_ids?.length == 0)
                ) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      project_id: contractDetails?.project_id,
                      contract_id: contractDetails?.contract_id,
                      client_supplier_id: xeroContactDetails?.pt_contact_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 354 : 457,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroInvoice?.id,
                      paytradeId: null,
                    },
                    reference_id: xeroInvoice?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `Missing supporting statement attachments`,
                    xero_records: [invoice],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }

              let expectedDraftStatusCheck = null;

              if (invoice.type === Invoice.TypeEnum.ACCPAY) {
                expectedDraftStatusCheck = xeroDetails.xero_to_pt_bill_as_draft;
              } else if (invoice.type === Invoice.TypeEnum.ACCREC) {
                expectedDraftStatusCheck =
                  xeroDetails.xero_to_pt_invoice_as_draft;
              }

              const claimStatus =
                expectedDraftStatusCheck === 'No'
                  ? invoice.status === Invoice.StatusEnum.DRAFT
                    ? 'Draft'
                    : 'Confirmed'
                  : 'Draft';

              const claimData: EditDetailsOfAPaymentClaimInput = {
                payment_claim_id: claimDetails?.payment_claim_id,
                company_id,
                cash_retention_type,
                status: claimStatus,
                previous_status: claimDetails?.status,
                project_id: contractDetails?.project_id || projectDetails?.project_id,
                contract_id: contractDetails?.contract_id,
                client_supplier_id: xeroContactDetails.pt_contact_id,
                client_supplier_type:
                  clientSuppliersDetails.client_supplier_type,
                due_date: invoice.dueDate,
                received_date:
                  invoice.type === Invoice.TypeEnum.ACCPAY
                    ? invoice.date
                    : null,
                sent_date:
                  invoice.type === Invoice.TypeEnum.ACCREC
                    ? invoice.date
                    : null,
                invoices,
                associated_retention_sub_payment_id,
                retention_id,
                // Sum of recomputed per-line totals so SUB TOTAL + GST = TOTAL
            // on the claim drawer. The previous `invoice.total +
            // retentionAmount` mirrored Xero's raw figures, but
            // `adjustItemsWithRetention` now recomputes per-line GST as
            // `workLineRate × merged_unit` (clean 10% on the merged
            // ex-GST unit when the work line is taxable, 0 otherwise).
            // For BAS-Excluded retention setups, that recomputed GST
            // diverges from `invoice.totalTax + retentionTaxOnly` by
            // exactly the missing GST on the retention portion, so we
            // must derive `claim_amount` from the SAME numbers we just
            // wrote into `invoices` (otherwise SUB TOTAL $15,724 + GST
            // $1,572.40 = $17,296.40 but TOTAL would still show
            // $17,217.78 from the old formula).
            claim_amount: Array.isArray(invoices)
              ? parseFloat(
                  invoices
                    .reduce(
                      (sum, i) =>
                        sum + Number(i?.total_amount_including_gst || 0),
                      0,
                    )
                    .toFixed(2),
                )
              : Number(invoice.total || 0) + retentionAmount,
                cash_retention: cashRetention,
                retention_percentage: retentionPercentage,
                // See V-Step site above and adjustItemsWithRetention
                // rationale: use the already-computed ex-GST retention
                // (`retentionUnitOnly`) so BAS-Excluded retention lines
                // aren't double-stripped for phantom GST.
                retention_amount: cashRetention ? retainedAmountExcludingGST : 0,
                // See V-Step site for rationale: gross up by the work-line
                // GST rate so the payment page "Retention amount
                // (including GST)" is the inc-GST slice of the gross
                // claim total, even when the Xero retention line itself
                // is BAS Excluded.
                retention_amount_with_gst: cashRetention
                  ? parseFloat(
                      (
                        retainedAmountExcludingGST *
                        (1 +
                          (invoice.lineAmountTypes === LineAmountTypes.NoTax
                            ? 0
                            : Number(invoice.subTotal) > 0
                              ? Number(invoice.totalTax || 0) /
                                Number(invoice.subTotal)
                              : 0.1))
                      ).toFixed(2),
                    )
                  : 0,
                claim_reference:
                  invoice.invoiceNumber || invoice.reference || null,
                compulsory_attachment_ids:
                  data?.compulsory_attachment_ids ||
                  claimDetails?.compulsory_attachment_ids,
                all_subcontracts_paid: claimNotPaidCount > 0 ? false : true,
                is_gst_optional:
                  invoice.lineAmountTypes !== LineAmountTypes.NoTax
                    ? true
                    : false,
                pending_claims_with_reason:
                  claimNotPaidCount > 0 && data.claims_with_reason
                    ? data.claims_with_reason
                    : [],
              };

              const commonKeys = Object.keys(claimData).filter(
                (key) => key in claimDetails,
              );
              let needsEdit = false;
              this.logger.log(`Webhook::: ${JSON.stringify(commonKeys)} ${JSON.stringify(claimData)} ${JSON.stringify(claimDetails)}`);
              for (const key of commonKeys) {
                if (
                  ![
                    'previous_status',
                    'pending_claims_with_reason',
                    'compulsory_attachment_ids',
                  ]?.includes(key)
                ) {
                  this.logger.log(`Webhook::claimData[key] !== claimDetails[key]:: ${JSON.stringify(key)} ${JSON.stringify(claimData[key])} ${JSON.stringify(claimDetails[key])}`);
                  if (
                    ['due_date', 'received_date', 'sent_date']?.includes(key)
                  ) {
                    if (
                      moment(claimData[key]).format('YYYY-MM-DD') !==
                      moment(claimDetails[key]).format('YYYY-MM-DD')
                    ) {
                      needsEdit = true;
                      break;
                    }
                  } else if (
                    [
                      'claim_amount',
                      'retention_amount',
                      'retention_percentage',
                      'retention_amount_with_gst',
                    ]?.includes(key)
                  ) {
                    if (
                      Number(claimData[key] || 0) !==
                      Number(claimDetails[key] || 0)
                    ) {
                      needsEdit = true;
                      break;
                    }
                  } else if (
                    [
                      'cash_retention',
                      'all_subcontracts_paid',
                      'is_gst_optional',
                    ]?.includes(key)
                  ) {
                    if (
                      Boolean(claimData[key] || false) !==
                      Boolean(claimDetails[key] || false)
                    ) {
                      needsEdit = true;
                      break;
                    }
                  } else if (key === 'invoices') {
                    const dataInvoices = claimData[key] || [];
                    const detailsInvoices = claimDetails[key] || [];

                    if (dataInvoices.length !== detailsInvoices.length) {
                      needsEdit = true;
                      break;
                    } else {
                      for (let i = 0; i < dataInvoices.length; i++) {
                        const dataItem = dataInvoices[i];
                        const detailsItem = detailsInvoices[i];

                        if (
                          dataItem.description !== detailsItem.description ||
                          Number(dataItem.quantity || 0) !==
                            Number(detailsItem.quantity || 0) ||
                          Number(dataItem.unit_price || 0) !==
                            Number(detailsItem.unit_price || 0) ||
                          Number(dataItem.gst || 0) !==
                            Number(detailsItem.gst || 0) ||
                          Number(dataItem.total_amount_including_gst || 0) !==
                            Number(detailsItem.total_amount_including_gst || 0)
                        ) {
                          needsEdit = true;
                          break;
                        }
                      }
                      if (needsEdit) break;
                    }
                  } else if (claimData[key] !== claimDetails[key]) {
                    needsEdit = true;
                    break;
                  }
                }
                this.logger.log(JSON.stringify({ needsEdit }));
              }

              if (needsEdit) {
                // Phase 3 — void any existing gross-up MJs before the
                // edit so we can re-post against the new retention amount.
                try {
                  if (
                    this.xeroManualJournalService.isAutoGrossUpEnabled(
                      xeroDetails,
                    )
                  ) {
                    await this.xeroManualJournalService.voidAllForClaim(
                      decoded,
                      xeroDetails.integration_id,
                      claimDetails?.payment_claim_id,
                      this.xero,
                      xeroDetails.company_id,
                      'Inbound Xero invoice edit — voiding before re-post',
                    );
                  }
                } catch (mjVoidErr: any) {
                  this.logger.error(
                    `[MJ_INBOUND_EDIT] void failed for claim ${claimDetails?.payment_claim_id}: ${mjVoidErr?.message || mjVoidErr}`,
                  );
                }

                const response =
                  await this.paymentClaimsService.editDetailsOfAPaymentClaim(
                    decoded,
                    claimData,
                    decoded?.userId,
                  );
                if (response) {
                  const paymentClaimDetails = await this.paymentClaims.findOne({
                    where: { id: response?.id },
                  });

                  // Phase 3 — re-post the gross-up MJ for the edited claim.
                  try {
                    if (
                      this.xeroManualJournalService.isAutoGrossUpEnabled(
                        xeroDetails,
                      ) &&
                      Number(paymentClaimDetails?.retention_amount) > 0
                    ) {
                      const baseCode =
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? xeroDetails?.bill_code
                          : xeroDetails?.invoice_code;
                      const baseLine =
                        Array.isArray(invoice?.lineItems) && baseCode
                          ? invoice.lineItems.find(
                              (li: any) => li?.accountCode === baseCode,
                            )
                          : null;
                      const kind: 'gross_up' | 'gross_up_reversal' =
                        paymentClaimDetails?.cash_retention_type ===
                        'Retention claim'
                          ? 'gross_up_reversal'
                          : 'gross_up';
                      await this.xeroManualJournalService.postGrossUpJournal(
                        decoded,
                        {
                          claim: paymentClaimDetails,
                          xeroDetails,
                          contact: clientSuppliersDetails,
                          retentionExGst:
                            Number(paymentClaimDetails?.retention_amount) || 0,
                          baseLineTaxType: baseLine?.taxType || null,
                          invoice_id: invoice?.invoiceID || null,
                        },
                        kind,
                        this.xero,
                      );
                    }
                  } catch (mjErr: any) {
                    this.logger.error(
                      `[MJ_INBOUND_EDIT] re-post failed for claim ${paymentClaimDetails?.payment_claim_id}: ${mjErr?.message || mjErr}`,
                    );
                  }
                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: xeroInvoice?.id,
                        paytradeId: paymentClaimDetails?.id,
                      },
                      reference_id: xeroInvoice?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [paymentClaimDetails],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                }
              }
            }
            // else {
            //   await this.xeroService.insertXeroSyncLogs(
            //     {},
            //     {
            //       id: data?.sync_id || null,
            //       api_name: 'createClaimInPaytrade',
            //       api_payload: {sync_run_type,
            //         invoice_id: invoice?.invoiceID,
            //         tenant_id,
            //         type:
            //           invoice?.type === Invoice.TypeEnum.ACCPAY
            //             ? 'bill'
            //             : 'invoice',
            //       },
            //       integration_id: xeroDetails.integration_id,
            //       log_template_id: sync_run_type === 'webhook' ?  77: 410,
            //       dynamic_values: {},
            //       project_id: xeroProjectDetails?.id,
            //       contract_id: xeroContractDetails?.id,
            //       reference: {
            //         xeroId: xeroInvoice?.id,
            //         paytradeId: null,
            //       },
            //       reference_id: xeroInvoice?.id,
            //       history: [
            //         `API triggered from invoice ${sync_run_type}`,
            //         'Import failed',
            //       ],
            //       important_checks: {
            //         'Import data format validation': 'Failed',
            //         'Import tracking id validation': 'Ok',
            //         'Import account type validation': 'Ok',
            //         'Import tax type validation': 'Ok',
            //         'Client/Supplier mapping validation': 'Ok',
            //         'Contract mapping validation': 'Ok',
            //         'Project mapping validation': 'Ok',
            //       },
            //       error_message: `Claim cannot be edited in paytrade since it is in ${claimDetails.status} status and in xero with ${invoice.status} status`,
            //       xero_records: [invoice],
            //       paytrade_records: [],
            //       new_records: null,
            //       updated_records: null,
            //       synced_records: null,
            //     },
            //   );
            //   return false;
            // }
          } else if (['DELETED', 'VOIDED'].includes(invoice.status)) {
            // Mark cached Xero invoice/bill row as voided so the UI &
            // audit pack reflect the void state. PDF cache is intentionally
            // retained for the audit trail.
            try {
              await this.xeroInvoicesService.markXeroInvoiceVoided({
                invoice_id: invoice.invoiceID,
                integration_id: xeroDetails.integration_id,
                status: invoice.status,
              });
            } catch (e: any) {
              this.logger.error(`[XERO_PDF] markXeroInvoiceVoided failed: ${e?.message || e}`);
            }
            //delete invoice
            if (['Draft', 'Confirmed'].includes(claimDetails.status)) {
              // Phase 3 — void any retention gross-up MJs before deleting
              // the claim so the GST entries don't dangle in Xero.
              try {
                if (
                  this.xeroManualJournalService.isAutoGrossUpEnabled(
                    xeroDetails,
                  )
                ) {
                  await this.xeroManualJournalService.voidAllForClaim(
                    decoded,
                    xeroDetails.integration_id,
                    claimDetails?.payment_claim_id,
                    this.xero,
                    xeroDetails.company_id,
                    `Inbound Xero invoice ${invoice.status} — voiding gross-up MJs`,
                  );
                }
              } catch (mjVoidErr: any) {
                this.logger.error(
                  `[MJ_INBOUND_DELETE] void failed for claim ${claimDetails?.payment_claim_id}: ${mjVoidErr?.message || mjVoidErr}`,
                );
              }

              const response =
                await this.paymentClaimsService.changeStatusOfAPaymentClaim(
                  decoded,
                  {
                    payment_claim_id: claimDetails?.payment_claim_id,
                    status: 'Deleted',
                    previous_status: claimDetails?.status,
                  },
                  decoded?.userId,
                );
              if (response) {
                const paymentClaimDetails = await this.paymentClaims.findOne({
                  where: { id: response?.id },
                });
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroInvoice?.id,
                      paytradeId: paymentClaimDetails?.id,
                    },
                    reference_id: xeroInvoice?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [paymentClaimDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              }
            } else if (['Deleted'].includes(claimDetails.status)) {
              // already deleted in paytrade
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                  dynamic_values: { id: claimDetails?.id },
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: claimDetails?.id,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import successful',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [invoice],
                  paytrade_records: [claimDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
          }
        }
        if (
          eventType &&
          eventType !== 'CREATE' &&
          xeroDetails?.wait_time &&
          xeroDetails?.wait_time > 0 &&
          sync_run_type !== 'manual'
        ) {
          // Webhook / scheduled-fallback path: defer the payment walk by
          // `wait_time` seconds via the BullMQ wait-queue worker. Manual
          // sync (sync_run_type === 'manual') deliberately falls through
          // to the inline Stage 2 path below — it is user-initiated and
          // must produce payments + payment_details in the same request,
          // and we cannot rely on the wait-queue worker firing in every
          // deployment topology.
          const addedJob =
            await this.xeroWaitQueueService.addDelayInXeroWebhookJob({
              tenant_id,
              resource_id: invoice?.invoiceID,
              integrationId: xeroDetails?.integration_id,
              company_id: xeroDetails?.company_id,
              contactId: invoice?.contact?.contactID,
              waitTime: xeroDetails?.wait_time,
              data,
              sync_run_type,
            });
          this.logger.log(JSON.stringify({ addedJob: addedJob?.name }));
          return true;
        } else {
          // ─── Stage 2 — Payment walk (best-effort) ────────────────
          // Stage 1 (invoice/bill import — including any required
          // smart-contract creation) has already succeeded by the
          // time we reach here, otherwise we would have returned
          // earlier with a specific child sync log row.
          //
          // The payment walk is a *separate* stage that mirrors how
          // Xero itself emits PAYMENT events independently from
          // INVOICE events. It writes its own per-payment sync log
          // entries inside `checkAndProcessPayment`, so any payment-
          // side problem (missing PT bank-account mapping, payment
          // already reconciled in PT, etc.) surfaces as its own row
          // in the sync log table — *not* as a failure of the
          // invoice import that just succeeded. This prevents a
          // legitimate smart-contract creation + bill import from
          // being retroactively reported as "Failed" because of a
          // downstream payment hiccup, which is what previously
          // poisoned every catch-up of a PAID bill.
          try {
            const processPayment = await this.checkAndProcessPayment(
              {
                tenant_id,
                resource_id: invoice?.invoiceID,
                data,
                sync_run_type,
              },
              decoded,
            );
            this.logger.log(JSON.stringify({ processPayment }));
          } catch (paymentErr: any) {
            this.logger.error(
              `[BILL_TRACE] Stage 2 (payment walk) threw for invoice ${invoice?.invoiceID} — ${paymentErr?.message || paymentErr}. Stage 1 (invoice import) already succeeded; trigger row will report success and any payment-side issues are written as their own sync log entries by checkAndProcessPayment.`,
            );
          }
          return true;
        }
      }
      this.logger.debug(`[BILL_TRACE] validateAndProcessWebhookInvoice returning false (no xeroInvoice or end of method)`);
      return false;
    } catch (err) {
      this.logger.error(
        `[BILL_TRACE] CATCH: validateAndProcessWebhookInvoice EXCEPTION — ${err?.message || err}\n${err?.stack || ''}`,
      );
      try {
        // Friendly error formatting. Xero SDK errors arrive as huge nested
        // objects whose stringified `.message` is the entire HTTP response
        // (headers + cookies + base64 set-cookie payload). Rendered raw in
        // the sync log UI it becomes an unreadable wall of text. Detect the
        // common Xero status codes (403 / 404 / 401 / 429 / 5xx) and replace
        // the body with a one-line, actionable explanation; keep the raw
        // payload only when we can't classify it.
        const rawMessage = err?.message || (typeof err === 'string' ? err : '');
        const ctx = extractAxiosErrorContext(err);
        const statusCode =
          ctx.status ??
          err?.response?.statusCode ??
          err?.statusCode ??
          err?.response?.status ??
          null;
        const invoiceType = invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice';
        let errMessage: string;
        switch (statusCode) {
          case 403:
            errMessage =
              `Xero returned 403 (not permitted) for ${invoiceType} ${invoice?.invoiceID}. ` +
              `The connected Xero user no longer has access to this record. ` +
              `Check the user's role in Xero (Settings → Users) and reconnect the integration if it was recently changed.` +
              (ctx.problemDetailsDetail && ctx.problemDetailsDetail !== 'AuthenticationUnsuccessful'
                ? ` Xero said: ${ctx.problemDetailsDetail}`
                : '');
            break;
          case 404:
            errMessage =
              `Xero returned 404 for ${invoiceType} ${invoice?.invoiceID}. ` +
              `The record was deleted in Xero or belongs to a different organisation.`;
            break;
          case 401:
            errMessage =
              `Xero returned 401 (unauthorised) for ${invoiceType} ${invoice?.invoiceID}. ` +
              `OAuth token may be expired or revoked — reconnect the integration.`;
            break;
          case 429:
            errMessage =
              `Xero rate-limited the ${invoiceType} fetch (HTTP 429). The 15-minute fallback will retry automatically.`;
            break;
          default:
            if (statusCode && Number(statusCode) >= 500) {
              errMessage = `Xero is returning ${statusCode} (server error) for ${invoiceType} ${invoice?.invoiceID}. Will retry on next fallback run.`;
            } else if (ctx.validationErrors.length > 0) {
              // Highest-value path: Xero gave us specific validation feedback.
              const desc =
                ctx.xeroErrorNumberDescription ||
                ctx.xeroErrorType ||
                'Validation error';
              errMessage = `${desc}: ${ctx.validationErrors.join('; ')}`;
            } else if (!ctx.usedGenericFallback && ctx.message) {
              // Use the structured one-liner (already includes ProblemDetails title etc).
              errMessage = ctx.message;
            } else {
              // Last-resort fallback — surface what little context we have
              // instead of a meaningless "An error occurred in Xero".
              const parts: string[] = [];
              if (statusCode) parts.push(`HTTP ${statusCode}`);
              if (ctx.url) parts.push(`${ctx.method || 'GET'} ${ctx.url}`);
              if (ctx.bodySnippet) parts.push(`body=${ctx.bodySnippet}`);
              const hint = parts.length
                ? parts.join(' — ')
                : String(rawMessage).slice(0, 400);
              errMessage = hint || 'Unknown error processing invoice';
            }
        }
        // Build an "Open in Xero" deep link for the failing record so the
        // user can jump straight to it from the sync log details page.
        const xeroDeepLink = invoice?.invoiceID
          ? invoiceType === 'bill'
            ? `https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${invoice.invoiceID}`
            : `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoice.invoiceID}`
          : null;
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            invoice_number: invoice?.invoiceNumber,
            invoice_reference: invoice?.reference,
            tenant_id,
            type: invoiceType,
            status_code: statusCode,
            // Structured Xero error context — surfaced in the sync log
            // details UI so the user can see exactly what failed without
            // grepping server logs.
            xero_request_method: ctx.method,
            xero_request_url: ctx.url,
            xero_error_number: ctx.xeroErrorNumber,
            xero_error_type: ctx.xeroErrorType,
            xero_error_number_description: ctx.xeroErrorNumberDescription,
            xero_problem_title: ctx.problemDetailsTitle,
            xero_problem_detail: ctx.problemDetailsDetail,
            xero_validation_errors: ctx.validationErrors,
            xero_response_body: ctx.bodySnippet,
            xero_deep_link: xeroDeepLink,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 252 : 412,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from ${invoiceType} ${sync_run_type}`,
            `Failing record: ${invoiceType} ${invoice?.invoiceNumber || invoice?.invoiceID || '(unknown)'}` +
              (invoice?.reference ? ` (ref ${invoice.reference})` : '') +
              (xeroDeepLink ? ` — ${xeroDeepLink}` : ''),
            `Processing failed: ${errMessage}`,
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `${invoiceType} processing failed: ${errMessage}`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
      } catch (logErr) {
        this.logger.error(`[Webhook] Failed to write sync log for error: ${logErr?.message || logErr}`);
      }
    }
  }

  async checkAndProcessPayment(payload, decoded) {
    try {
      const { tenant_id, resource_id, data, sync_run_type } = payload;

      // Multi-row tenant guard: prefer the Active integration row.
      const _candidatesPay = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        _candidatesPay.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? _candidatesPay[0];

      await this.xeroService.refreshTokenSet(
        xeroDetails?.company_id,
        this.xero,
      );

      const response = await this.xero.accountingApi.getInvoice(
        tenant_id,
        resource_id,
      );
      const invoice = response?.body?.invoices?.[0];

      const xeroInvoice = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: invoice?.invoiceID,
          integration_id: xeroDetails?.integration_id,
        },
      });

      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          id: xeroInvoice?.contact_id,
          integration_id: xeroDetails?.integration_id,
        },
      });

      const xeroProjectDetails = await this.xeroProjectDetails.findOne({
        where: {
          id: xeroInvoice?.project_id,
          integration_id: xeroDetails?.integration_id,
        },
      });

      const xeroContractDetails = await this.xeroContractDetails.findOne({
        where: {
          id: xeroInvoice?.contract_id,
          integration_id: xeroDetails?.integration_id,
        },
      });

      // Fail-fast: only fully mapped Xero entities should sync. The CREATE
      // path (createClaimInPaytrade) already enforces this at L1538/L2541/
      // L2593/L2647; the UPDATE/payment path historically did not, so an
      // orphan xero_*_details row (auto-discovered Xero entity with no PT
      // mapping yet) would slip past these lookups and surface a misleading
      // downstream error like "Mismatch in claim type". Mirror the CREATE
      // path's templates here so the user sees an honest "not mapped" log.
      if (xeroContactDetails && !xeroContactDetails.pt_contact_id) {
        this.logger.error(
          `[checkAndProcessPayment] Contact found in xero_contact_details but pt_contact_id is null for invoice ${invoice?.invoiceID}. Aborting sync — write template ${sync_run_type === 'webhook' ? 265 : 425}.`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 265 : 425,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: invoice?.invoiceID, paytradeId: null },
          reference_id: invoice?.invoiceID,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Contact details not mapped`,
          xero_records: [{ ...invoice, xeroContactDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (xeroProjectDetails && !xeroProjectDetails.pt_project_id) {
        this.logger.error(
          `[checkAndProcessPayment] Project found in xero_project_details but pt_project_id is null for invoice ${invoice?.invoiceID}. Aborting sync — write template ${sync_run_type === 'webhook' ? 269 : 429}.`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            project_id: xeroProjectDetails?.project_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 269 : 429,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: invoice?.invoiceID, paytradeId: null },
          reference_id: invoice?.invoiceID,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Failed',
          },
          error_message: `Project details not mapped`,
          xero_records: [{ ...invoice, xeroProjectDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (xeroContractDetails && !xeroContractDetails.pt_contract_id) {
        this.logger.error(
          `[checkAndProcessPayment] Contract found in xero_contract_details but pt_contract_id is null for invoice ${invoice?.invoiceID}. Aborting sync — write template ${sync_run_type === 'webhook' ? 268 : 428}.`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 268 : 428,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id || null,
          contract_id: null,
          reference: { xeroId: invoice?.invoiceID, paytradeId: null },
          reference_id: invoice?.invoiceID,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Failed',
            'Project mapping validation': 'Ok',
          },
          error_message: `Contract details not mapped`,
          xero_records: [{ ...invoice, xeroContractDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const contractDetails = await this.contractDetails.findOne({
        where: { contract_id: xeroContractDetails?.pt_contract_id },
      });

      const paymentClaimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: xeroInvoice?.pt_claim_id },
      });
      this.logger.log(JSON.stringify({ paymentClaimDetails }));
      this.logger.log(JSON.stringify({ invoice }));

      const previousPayments = await this.paymentDetails.find({
        where: {
          payment_claim_id: xeroInvoice?.pt_claim_id,
          current_status: Not('Deleted'),
          payment_type: Not(
            In([
              'Overpayment from client',
              'Underpayment from client',
              'Overpayment to supplier',
              'Underpayment to supplier',
            ]),
          ),
        },
        order: { created_on: 'DESC' },
      });

      this.logger.log('1:: ' + " " + JSON.stringify({ previousPayments }));

      const associatedUnderPaymentsInXero = await this.xeroPayments.find({
        where: {
          is_under_payment: true,
          overpayment_id: Not(IsNull()),
          status: Not('DELETED'),
          invoice_id: xeroInvoice?.id,
          integration_id: xeroDetails?.integration_id,
        },
      });
      this.logger.log(JSON.stringify({ associatedUnderPaymentsInXero }));

      if (
        associatedUnderPaymentsInXero &&
        associatedUnderPaymentsInXero?.length > 0
      ) {
        if (!invoice?.overpayments) {
          for (const element of associatedUnderPaymentsInXero) {
            if (element?.pt_payment_id) {
              const existingPaymentStatusCheck =
                await this.paymentDetails?.findOne({
                  where: { payment_id: element.pt_payment_id },
                });
              this.logger.log(`existingPaymentStatusCheck for underpayments:  ${JSON.stringify(existingPaymentStatusCheck)}`);
              if (
                existingPaymentStatusCheck &&
                existingPaymentStatusCheck?.current_status !== 'Deleted'
              ) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.pt_payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '1',
                    );

                  this.logger.log('1:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  await this.xeroPayments.update(
                    {
                      id: element?.id,
                    },
                    {
                      status: String(Payment.StatusEnum.DELETED),
                    },
                  );

                  const existingPaytradePayment =
                    await this.paymentDetails?.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                    });
                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: existingPaytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [existingPaytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (element.sub_payment_type === 'Payment') {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true,
                          )
                        : [];

                    const existingXeroPayment = await this.xeroPayments.findOne(
                      {
                        where: {
                          pt_payment_id: element.pt_payment_id,
                        },
                      },
                    );

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: element.pt_payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            } else {
              await this.xeroPayments.update(
                {
                  id: element?.id,
                },
                {
                  status: String(Payment.StatusEnum.DELETED),
                },
              );
            }
          }
        } else if (invoice?.overpayments && invoice?.overpayments?.length > 0) {
          const overpaymentIds = [
            ...new Set(
              invoice?.overpayments
                ?.map((e) => e?.overpaymentID)
                .filter((id) => id != null),
            ),
          ];
          this.logger.log('overpaymentIds: ' + " " + JSON.stringify(overpaymentIds));

          for (const element of associatedUnderPaymentsInXero) {
            if (!overpaymentIds?.includes(element?.overpayment_id)) {
              this.logger.log(`!overpaymentIds?.includes(element?.overpayment_id): ${JSON.stringify(!overpaymentIds?.includes(element?.overpayment_id))}`);
              if (element?.pt_payment_id) {
                const existingPaymentStatusCheck =
                  await this.paymentDetails?.findOne({
                    where: { payment_id: element.pt_payment_id },
                  });
                this.logger.log(`existingPaymentStatusCheck:  ${JSON.stringify(existingPaymentStatusCheck)}`);
                if (
                  existingPaymentStatusCheck &&
                  existingPaymentStatusCheck?.current_status !== 'Deleted'
                ) {
                  try {
                    const paytradePayload: ChangeStatusOfAPaymentInput = {
                      payment_id: element.pt_payment_id,
                      status: 'Deleted',
                      input_date: null,
                    };
                    this.logger.log(JSON.stringify({ paytradePayload }));
                    const deletePaymentResponse =
                      await this.safeWebhookDeletePayment(
                        decoded,
                        paytradePayload,
                        '2',
                      );

                    this.logger.log('2:::' + " " + JSON.stringify({ deletePaymentResponse }));

                    await this.xeroPayments.update(
                      {
                        id: element?.id,
                      },
                      {
                        status: String(Payment.StatusEnum.DELETED),
                      },
                    );

                    const existingPaytradePayment =
                      await this.paymentDetails?.findOne({
                        where: {
                          payment_id: element.pt_payment_id,
                        },
                      });
                    const addSyncLogResponse =
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 251 : 411,
                        dynamic_values: { id: paymentClaimDetails?.id },
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: element?.id,
                          paytradeId: existingPaytradePayment?.id,
                        },
                        reference_id: element?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import successful',
                        ],
                        important_checks: {
                          'Import data format validation': 'Ok',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: null,
                        xero_records: [invoice],
                        paytrade_records: [existingPaytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                  } catch (error) {
                    const errMsg = error?.message ? error?.message : error;
                    if (errMsg == `The confirmed payment cannot be deleted.`) {
                      const paytradePayment = await this.paymentDetails.findOne(
                        {
                          where: {
                            payment_id: element.pt_payment_id,
                          },
                          relations: ['subPayments'],
                          order: { created_on: 'DESC' },
                        },
                      );

                      const matchedPayments =
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) => element.status === 'Matched',
                            )
                          : [];

                      this.logger.log(JSON.stringify({ matchedPayments }));
                      let payment_account = null,
                        retention_account = null,
                        unmatchTransactions = [];
                      if (matchedPayments && matchedPayments?.length > 0) {
                        for (const element of matchedPayments) {
                          if (
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            )
                          ) {
                            payment_account =
                              paymentClaimDetails?.claim_type == 'Billable'
                                ? paytradePayment?.payment_from_account
                                : paytradePayment?.payment_to_account;
                            unmatchTransactions.push({
                              ...element,
                              account_id: payment_account,
                            });
                          } else if (
                            element.sub_payment_type === 'Retention In'
                          ) {
                            retention_account =
                              paytradePayment?.retention_account;
                            unmatchTransactions.push({
                              ...element,
                              account_id: retention_account,
                            });
                          }
                        }
                      }

                      const checkedPayments =
                        (!unmatchTransactions ||
                          unmatchTransactions?.length === 0) &&
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) =>
                                ['Payment', 'Retention Out'].includes(
                                  element.sub_payment_type,
                                ) &&
                                (element.is_paid_confirmed === true ||
                                  element.is_received_confirmed === true ||
                                  element.is_retention_confirmed === true),
                            )
                          : [];

                      const existingXeroPayment =
                        await this.xeroPayments.findOne({
                          where: {
                            pt_payment_id: element.pt_payment_id,
                            status: Not('DELETED'),
                          },
                        });

                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                          payment_id: element.pt_payment_id,
                          payment_type: paytradePayment?.payment_type,
                          claim_id: paytradePayment?.payment_claim_id,
                          // unmapping_payment_id:
                          //   existingXeroPayment?.payment_id,
                          delete_paytrade_only: true,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 378 : 462,
                        dynamic_values: { id: paymentClaimDetails?.id },
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: element?.id,
                          paytradeId: paytradePayment?.id,
                        },
                        reference_id: element?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import failed',
                        ],
                        important_checks: {
                          'Import data format validation': 'Failed',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                        xero_records: [
                          {
                            ...invoice,
                            payment_account,
                            retention_account,
                            ...(unmatchTransactions &&
                            unmatchTransactions?.length > 0
                              ? { unmatchTransactions }
                              : {}),
                            ...(!unmatchTransactions ||
                            unmatchTransactions?.length === 0
                              ? { checkedPayments }
                              : {}),
                          },
                        ],
                        paytrade_records: [paytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                      return false;
                    }
                  }
                }
              } else {
                await this.xeroPayments.update(
                  {
                    id: element?.id,
                  },
                  {
                    status: String(Payment.StatusEnum.DELETED),
                  },
                );
              }
            }
          }
        }
      }
      const associatedUnderPaymentsInPaytrade = await this.paymentDetails.find({
        where: {
          payment_claim_id: xeroInvoice?.pt_claim_id,
          current_status: Not('Deleted'),
          payment_type: In([
            'Underpayment from client',
            'Underpayment to supplier',
          ]),
        },
        order: { created_on: 'DESC' },
      });

      this.logger.log(JSON.stringify({ associatedUnderPaymentsInPaytrade }));

      if (
        associatedUnderPaymentsInPaytrade &&
        associatedUnderPaymentsInPaytrade?.length > 0
      ) {
        if (!invoice?.overpayments) {
          for (const element of associatedUnderPaymentsInPaytrade) {
            if (element?.current_status !== 'Deleted') {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: element.payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '3',
                  );

                this.logger.log('3:::' + " " + JSON.stringify({ deletePaymentResponse }));

                const existingPaytradePayment =
                  await this.paymentDetails?.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                  });
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (element.sub_payment_type === 'Payment') {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            element.is_paid_confirmed === true ||
                            element.is_received_confirmed === true,
                        )
                      : [];

                  const existingXeroPayment = await this.xeroPayments.findOne({
                    where: {
                      pt_payment_id: element.payment_id,
                    },
                  });

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: element.payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id: existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
        }
      }

      const {
        retentionClaimnlineItem,
        lineItem1,
        lineItem2,
        hasBaseLine,
        netRetainedSigned,
        codesShared,
      } = XeroWebhookService.classifyRetentionShape(invoice, xeroDetails);

      const updateSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
      this.logger.debug(`[BILL_TRACE] U-Step: cash_retention_type check (update path) — retentionClaimLineItem=${retentionClaimnlineItem}, lineItem1=${lineItem1}, lineItem2=${lineItem2}, hasBaseLine=${hasBaseLine}, netRetainedSigned=${netRetainedSigned}, codesShared=${codesShared}, simplifiedRetention=${updateSimplifiedRetention}`);
      if (!updateSimplifiedRetention && ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2))) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 274 : 434,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `There should be 2 line items for a retention`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const cash_retention_type = retentionClaimnlineItem
        ? 'Retention claim'
        : 'Claim';

      if (cash_retention_type !== paymentClaimDetails.cash_retention_type) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 278 : 438,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Mismatch in claim type between paytrade and xero`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const retentionLineItems =
        invoice?.lineItems?.filter((item) =>
          [
            xeroDetails.retention_payable_retained_code,
            // xeroDetails.liability_payable_code,
            // xeroDetails.retention_payable_release_code,
            xeroDetails.retention_receivable_retained_code,
            // xeroDetails.liability_receivable_code,
            // xeroDetails.retention_receivable_release_code,
          ].includes(item?.accountCode),
        ) || [];

      const retentionAmount = retentionLineItems.reduce((sum, item) => {
        return (
          sum +
          (item?.unitAmount === null
            ? 0.0
            : Math.abs(Number(item?.unitAmount))) +
          (item?.taxAmount === null ? 0.0 : Math.abs(Number(item?.taxAmount)))
        );
      }, 0.0);

      const cashRetention =
        cash_retention_type === 'Claim' &&
        retentionLineItems &&
        retentionLineItems.length > 0 &&
        retentionAmount > 0
          ? true
          : false;

      this.logger.log(JSON.stringify({ cash_retention_type }));

      let creditNotesOfAnInvoice: CreditNote[] = [],
        creditNotes: CreditNote[] = [],
        existingCreditNotesInBothXeroAndDb: CreditNote[] = [];

      this.logger.log(`[Credit Note Debug] invoice.creditNotes: ${JSON.stringify(invoice?.creditNotes)} ${JSON.stringify('invoice.status:')} ${JSON.stringify(invoice?.status)} ${JSON.stringify('invoice.amountPaid:')} ${JSON.stringify(invoice?.amountPaid)} ${JSON.stringify('invoice.amountDue:')} ${JSON.stringify(invoice?.amountDue)}`);

      const shouldCheckCreditNotes =
        (invoice?.creditNotes && invoice?.creditNotes?.length > 0) ||
        (invoice?.status === Invoice.StatusEnum.PAID &&
          Number(invoice?.amountPaid || 0) === 0);

      this.logger.log('[Credit Note Debug] shouldCheckCreditNotes:' + " " + JSON.stringify(shouldCheckCreditNotes));

      if (shouldCheckCreditNotes) {
        // Task #140 — shared credit-note correlation helper. Behaviour
        // is byte-identical to the previous inline lookup; the manual
        // pre-flight (manualXeroPreflight) reuses the same helper to
        // disambiguate pay-less from interim part-payment.
        creditNotesOfAnInvoice = await this.findCreditNotesAllocatedToInvoice(
          xeroDetails.tenant_id,
          invoice?.invoiceID,
        );
      }
      this.logger.log('creditNotesOfAnInvoice: ' + " " + JSON.stringify(creditNotesOfAnInvoice));

      if (creditNotesOfAnInvoice && creditNotesOfAnInvoice?.length > 0) {
        const creditNotesfilter = data?.credit_note_id
          ? creditNotesOfAnInvoice?.filter(
              (credit) => credit?.creditNoteID === data?.credit_note_id,
            )
          : creditNotesOfAnInvoice;
        this.logger.log('creditNotesfilter: ' + " " + JSON.stringify(creditNotesfilter));
        if (creditNotesfilter && creditNotesfilter?.length > 0) {
          if (creditNotesfilter?.length == 1) {
            const existingCreditNotesInDb = await this.xeroPayments.findOne({
              where: {
                credit_note_id: creditNotesfilter[0]?.creditNoteID,
                credit_note_status: Not(In(['DELETED', 'VOIDED'])),
                integration_id: xeroDetails.integration_id,
                invoice_id: xeroInvoice?.id,
                status: Not('DELETED'),
              },
            });
            this.logger.log('existingCreditNotesInDb: ' + " " + JSON.stringify(existingCreditNotesInDb));
            if (
              existingCreditNotesInDb &&
              existingCreditNotesInDb?.pt_payment_id
            ) {
              existingCreditNotesInBothXeroAndDb = creditNotesfilter;
            } else {
              creditNotes = creditNotesfilter;
            }
            this.logger.log(`existingCreditNotesInDb && existingCreditNotesInBothXeroAndDb && creditNotes:  ${JSON.stringify(existingCreditNotesInDb)} ${JSON.stringify(existingCreditNotesInBothXeroAndDb)} ${JSON.stringify(creditNotes)}`);
          } else {
            const creditNoteIds = [
              ...new Set(
                creditNotesfilter
                  ?.map((e) => e?.creditNoteID)
                  .filter((id) => id != null),
              ),
            ];
            this.logger.log('creditNoteIds: ' + " " + JSON.stringify(creditNoteIds));
            const existingCreditNotesInDb = await this.xeroPayments.find({
              where: {
                credit_note_id: In(creditNoteIds),
                credit_note_status: Not(In(['DELETED', 'VOIDED'])),
                integration_id: xeroDetails.integration_id,
                invoice_id: xeroInvoice?.id,
                pt_payment_id: Not(IsNull()),
              },
            });
            this.logger.log('existingCreditNotesInDb: ' + " " + JSON.stringify(existingCreditNotesInDb));
            if (
              existingCreditNotesInDb &&
              existingCreditNotesInDb?.length > 0
            ) {
              for (const element of creditNotesfilter) {
                if (
                  !existingCreditNotesInDb?.some(
                    (credit) => credit.credit_note_id === element?.creditNoteID,
                  )
                ) {
                  creditNotes.push(element);
                } else {
                  existingCreditNotesInBothXeroAndDb.push(element);
                }
              }
              this.logger.log(`creditNotes && existingCreditNotesInBothXeroAndDb:  ${JSON.stringify(creditNotes)} ${JSON.stringify(existingCreditNotesInBothXeroAndDb)}`);
            } else {
              creditNotes = creditNotesfilter;
              this.logger.log('creditNotes: ' + " " + JSON.stringify(creditNotes));
            }

            this.logger.log(`existingCreditNotesInBothXeroAndDb:  ${JSON.stringify(existingCreditNotesInBothXeroAndDb)}`);
            if (
              existingCreditNotesInBothXeroAndDb &&
              existingCreditNotesInBothXeroAndDb?.length > 0
            ) {
              const existingCreditNoteIds = existingCreditNotesInBothXeroAndDb
                ? [
                    ...new Set(
                      existingCreditNotesInBothXeroAndDb
                        ?.map((e) => e?.creditNoteID)
                        .filter((id) => id != null),
                    ),
                  ]
                : [];

              this.logger.log('existingCreditNoteIds: ' + " " + JSON.stringify(existingCreditNoteIds));
              const existingPayment = await this.xeroPayments.find({
                where: {
                  credit_note_id: Not(IsNull()),
                  credit_note_status: Not(In(['DELETED', 'VOIDED'])),
                  integration_id: xeroDetails.integration_id,
                  invoice_id: xeroInvoice?.id,
                },
              });
              this.logger.log('existingPayment: ' + " " + JSON.stringify(existingPayment));

              if (existingPayment && existingPayment?.length > 0) {
                for (const element of existingPayment) {
                  if (
                    !existingCreditNoteIds?.includes(element?.credit_note_id)
                  ) {
                    this.logger.log(`!existingCreditNoteIds?.includes(element?.credit_note_id): ${JSON.stringify(!existingCreditNoteIds?.includes(element?.credit_note_id))}`);
                    if (element?.pt_payment_id) {
                      const existingPaymentStatusCheck =
                        await this.paymentDetails?.findOne({
                          where: { payment_id: element.pt_payment_id },
                        });
                      this.logger.log(`existingPaymentStatusCheck:  ${JSON.stringify(existingPaymentStatusCheck)}`);
                      if (
                        existingPaymentStatusCheck &&
                        existingPaymentStatusCheck?.current_status !== 'Deleted'
                      ) {
                        try {
                          const paytradePayload: ChangeStatusOfAPaymentInput = {
                            payment_id: element.pt_payment_id,
                            status: 'Deleted',
                            input_date: null,
                          };
                          this.logger.log(JSON.stringify({ paytradePayload }));
                          const deletePaymentResponse =
                            await this.safeWebhookDeletePayment(
                              decoded,
                              paytradePayload,
                              '4',
                            );

                          this.logger.log('4:::' + " " + JSON.stringify({ deletePaymentResponse }));

                          await this.xeroPayments.update(
                            {
                              integration_id: xeroDetails.integration_id,
                              invoice_id: xeroInvoice?.id,
                              credit_note_id: element?.credit_note_id,
                              status: Not('DELETED'),
                            },
                            {
                              credit_note_status: String(
                                Payment.StatusEnum.DELETED,
                              ),
                              status: String(Payment.StatusEnum.DELETED),
                            },
                          );

                          const existingPaytradePayment =
                            await this.paymentDetails?.findOne({
                              where: {
                                payment_id: element.pt_payment_id,
                              },
                            });
                          const addSyncLogResponse =
                            await this.xeroService.insertXeroSyncLogs(decoded, {
                              id: data?.sync_id || null,
                              api_name: 'createClaimInPaytrade',
                              api_payload: {
                                sync_run_type,
                                invoice_id: invoice?.invoiceID,
                                tenant_id,
                                type:
                                  invoice?.type === Invoice.TypeEnum.ACCPAY
                                    ? 'bill'
                                    : 'invoice',
                              },
                              integration_id: xeroDetails.integration_id,
                              log_template_id:
                                sync_run_type === 'webhook' ? 251 : 411,
                              dynamic_values: { id: paymentClaimDetails?.id },
                              project_id: xeroProjectDetails?.id,
                              contract_id: xeroContractDetails?.id,
                              reference: {
                                xeroId: element?.id,
                                paytradeId: existingPaytradePayment?.id,
                              },
                              reference_id: element?.id,
                              history: [
                                `API triggered from invoice ${sync_run_type}`,
                                'Import successful',
                              ],
                              important_checks: {
                                'Import data format validation': 'Ok',
                                'Import tracking id validation': 'Ok',
                                'Import account type validation': 'Ok',
                                'Import tax type validation': 'Ok',
                                'Client/Supplier mapping validation': 'Ok',
                                'Contract mapping validation': 'Ok',
                                'Project mapping validation': 'Ok',
                              },
                              error_message: null,
                              xero_records: [invoice],
                              paytrade_records: [existingPaytradePayment],
                              new_records: null,
                              updated_records: null,
                              synced_records: null,
                            });
                        } catch (error) {
                          const errMsg = error?.message
                            ? error?.message
                            : error;
                          if (
                            errMsg == `The confirmed payment cannot be deleted.`
                          ) {
                            const paytradePayment =
                              await this.paymentDetails.findOne({
                                where: {
                                  payment_id: element.pt_payment_id,
                                },
                                relations: ['subPayments'],
                                order: { created_on: 'DESC' },
                              });

                            const matchedPayments =
                              paytradePayment &&
                              paytradePayment?.subPayments &&
                              paytradePayment?.subPayments?.length > 0
                                ? paytradePayment?.subPayments?.filter(
                                    (element) => element.status === 'Matched',
                                  )
                                : [];

                            this.logger.log(JSON.stringify({ matchedPayments }));
                            let payment_account = null,
                              retention_account = null,
                              unmatchTransactions = [];
                            if (
                              matchedPayments &&
                              matchedPayments?.length > 0
                            ) {
                              for (const element of matchedPayments) {
                                if (
                                  ['Payment', 'Retention Out'].includes(
                                    element.sub_payment_type,
                                  )
                                ) {
                                  payment_account =
                                    paymentClaimDetails?.claim_type ==
                                    'Billable'
                                      ? paytradePayment?.payment_from_account
                                      : paytradePayment?.payment_to_account;
                                  unmatchTransactions.push({
                                    ...element,
                                    account_id: payment_account,
                                  });
                                } else if (
                                  element.sub_payment_type === 'Retention In'
                                ) {
                                  retention_account =
                                    paytradePayment?.retention_account;
                                  unmatchTransactions.push({
                                    ...element,
                                    account_id: retention_account,
                                  });
                                }
                              }
                            }

                            const checkedPayments =
                              (!unmatchTransactions ||
                                unmatchTransactions?.length === 0) &&
                              paytradePayment &&
                              paytradePayment?.subPayments &&
                              paytradePayment?.subPayments?.length > 0
                                ? paytradePayment?.subPayments?.filter(
                                    (element) =>
                                      ['Payment', 'Retention Out'].includes(
                                        element.sub_payment_type,
                                      ) &&
                                      (element.is_paid_confirmed === true ||
                                        element.is_received_confirmed ===
                                          true ||
                                        element.is_retention_confirmed ===
                                          true),
                                  )
                                : [];

                            const existingXeroPayment =
                              await this.xeroPayments.findOne({
                                where: {
                                  pt_payment_id: element.pt_payment_id,
                                  status: Not('DELETED'),
                                },
                              });

                            await this.xeroService.insertXeroSyncLogs(decoded, {
                              id: data?.sync_id || null,
                              api_name: 'createClaimInPaytrade',
                              api_payload: {
                                sync_run_type,
                                invoice_id: invoice?.invoiceID,
                                tenant_id,
                                type:
                                  invoice?.type === Invoice.TypeEnum.ACCPAY
                                    ? 'bill'
                                    : 'invoice',
                                payment_id: element.pt_payment_id,
                                payment_type: paytradePayment?.payment_type,
                                claim_id: paytradePayment?.payment_claim_id,
                                // unmapping_payment_id:
                                //   existingXeroPayment?.payment_id,
                                delete_paytrade_only: true,
                              },
                              integration_id: xeroDetails.integration_id,
                              log_template_id:
                                sync_run_type === 'webhook' ? 378 : 462,
                              dynamic_values: { id: paymentClaimDetails?.id },
                              project_id: xeroProjectDetails?.id,
                              contract_id: xeroContractDetails?.id,
                              reference: {
                                xeroId: element?.id,
                                paytradeId: paytradePayment?.id,
                              },
                              reference_id: element?.id,
                              history: [
                                `API triggered from invoice ${sync_run_type}`,
                                'Import failed',
                              ],
                              important_checks: {
                                'Import data format validation': 'Failed',
                                'Import tracking id validation': 'Ok',
                                'Import account type validation': 'Ok',
                                'Import tax type validation': 'Ok',
                                'Client/Supplier mapping validation': 'Ok',
                                'Contract mapping validation': 'Ok',
                                'Project mapping validation': 'Ok',
                              },
                              error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                              xero_records: [
                                {
                                  ...invoice,
                                  payment_account,
                                  retention_account,
                                  ...(unmatchTransactions &&
                                  unmatchTransactions?.length > 0
                                    ? { unmatchTransactions }
                                    : {}),
                                  ...(!unmatchTransactions ||
                                  unmatchTransactions?.length === 0
                                    ? { checkedPayments }
                                    : {}),
                                },
                              ],
                              paytrade_records: [paytradePayment],
                              new_records: null,
                              updated_records: null,
                              synced_records: null,
                            });
                            return false;
                          }
                        }
                      }
                    } else {
                      await this.xeroPayments.update(
                        {
                          integration_id: xeroDetails.integration_id,
                          invoice_id: xeroInvoice?.id,
                          credit_note_id: element?.credit_note_id,
                          status: Not('DELETED'),
                        },
                        {
                          credit_note_status: String(
                            Payment.StatusEnum.DELETED,
                          ),
                          status: String(Payment.StatusEnum.DELETED),
                        },
                      );
                      this.logger.log(
                        `[Xero Webhook] Updated credit note ${creditNotes[0]?.creditNoteID}`,
                      );
                    }
                  }
                }
              }
            }
          }
        }
        this.logger.log('creditNotes: ' + " " + JSON.stringify(creditNotes));
        if (creditNotes && creditNotes?.length > 1) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 344 : 447,
            dynamic_values: {},
            project_id: xeroProjectDetails?.id,
            contract_id: xeroContractDetails?.id,
            reference: {
              xeroId: xeroInvoice?.id,
              paytradeId: null,
            },
            reference_id: xeroInvoice?.id,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
              'Contract mapping validation': 'Ok',
              'Project mapping validation': 'Ok',
            },
            error_message: `Multiple credit notes found`,
            xero_records: [{ ...invoice, creditNotes }],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      } else {
        const existingPayment = await this.xeroPayments.find({
          where: {
            credit_note_id: Not(IsNull()),
            credit_note_status: Not(In(['DELETED', 'VOIDED'])),
            integration_id: xeroDetails.integration_id,
            invoice_id: xeroInvoice?.id,
          },
        });
        this.logger.log('existingPayment: ' + " " + JSON.stringify(existingPayment));

        if (existingPayment && existingPayment?.length > 0) {
          for (const element of existingPayment) {
            if (element?.pt_payment_id) {
              const existingPaymentStatusCheck =
                await this.paymentDetails?.findOne({
                  where: { payment_id: element.pt_payment_id },
                });
              this.logger.log(`existingPaymentStatusCheck:  ${JSON.stringify(existingPaymentStatusCheck)}`);
              if (
                existingPaymentStatusCheck &&
                existingPaymentStatusCheck?.current_status !== 'Deleted'
              ) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.pt_payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '5',
                    );

                  this.logger.log('5:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  await this.xeroPayments.update(
                    {
                      integration_id: xeroDetails.integration_id,
                      invoice_id: xeroInvoice?.id,
                      credit_note_id: element?.credit_note_id,
                      status: Not('DELETED'),
                    },
                    {
                      credit_note_status: String(Payment.StatusEnum.DELETED),
                      status: String(Payment.StatusEnum.DELETED),
                    },
                  );

                  const existingPaytradePayment =
                    await this.paymentDetails?.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                    });
                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: existingPaytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [existingPaytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      retention_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (
                          ['Payment', 'Retention Out'].includes(
                            element.sub_payment_type,
                          )
                        ) {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        } else if (
                          element.sub_payment_type === 'Retention In'
                        ) {
                          retention_account =
                            paytradePayment?.retention_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: retention_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              ['Payment', 'Retention Out'].includes(
                                element.sub_payment_type,
                              ) &&
                              (element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true ||
                                element.is_retention_confirmed === true),
                          )
                        : [];

                    const existingXeroPayment = await this.xeroPayments.findOne(
                      {
                        where: {
                          pt_payment_id: element.pt_payment_id,
                        },
                      },
                    );

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: element.pt_payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          retention_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            } else {
              await this.xeroPayments.update(
                {
                  integration_id: xeroDetails.integration_id,
                  invoice_id: xeroInvoice?.id,
                  credit_note_id: element?.credit_note_id,
                  status: Not('DELETED'),
                },
                {
                  credit_note_status: String(Payment.StatusEnum.DELETED),
                  status: String(Payment.StatusEnum.DELETED),
                },
              );
              this.logger.log(
                `[Xero Webhook] Updated credit note ${creditNotes[0]?.creditNoteID}`,
              );
            }
          }
        }
      }

      this.logger.log(
        `[Xero Webhook] Credit notes applied: ${JSON.stringify(creditNotes)}`,
      );

      if (
        creditNotes &&
        creditNotes?.length == 1 &&
        Number(invoice.total || 0) ===
          Number(creditNotes[0]?.allocations[0]?.amount)
      ) {
        const checkExistence = await this.xeroPayments.findOne({
          where: {
            credit_note_id: creditNotes[0]?.creditNoteID,
            credit_note_status: Not('DELETED'),
            status: Not('DELETED'),
          },
        });
        this.logger.log('checkExistence: ' + " " + JSON.stringify(checkExistence));
        if (!checkExistence) {
          let xeroPaymentPayload: any = {
            payment_id: null,
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            contact_id: xeroContactDetails.id,
            invoice_id: xeroInvoice?.id,
            payment_type: creditNotes[0]?.type,
            payment_date: creditNotes[0]?.date,
            status: Payment.StatusEnum.AUTHORISED,
            created_group: 'SYSTEM',
            credit_note_id: creditNotes[0]?.creditNoteID,
            credit_note_allocation_id:
              creditNotes[0]?.allocations[0]?.allocationID,
            credit_note_type: creditNotes[0]?.type,
            credit_note_status: creditNotes[0]?.status,
            credit_amount: creditNotes[0]?.total,
            credit_note_date: creditNotes[0]?.date,
          };

          const newPayment = this.xeroPayments.create(xeroPaymentPayload);
          await this.xeroPayments.save(newPayment);
          this.logger.log(
            `[Xero Webhook] Inserted new credit note ${creditNotes[0]?.creditNoteID}`,
          );
        }

        const xeroPaymentEntity = await this.xeroPayments.findOne({
          where: {
            credit_note_id: creditNotes[0]?.creditNoteID,
            credit_note_status: Not('DELETED'),
            status: Not('DELETED'),
          },
        });
        this.logger.log('xeroPaymentEntity: ' + " " + JSON.stringify(xeroPaymentEntity));

        if (
          xeroPaymentEntity &&
          !xeroPaymentEntity?.pt_payment_id &&
          ['Add payment', 'Overdue'].includes(paymentClaimDetails.list_status)
        ) {
          const bank_account_id =
            invoice.type === Invoice.TypeEnum.ACCPAY
              ? cash_retention_type === 'Claim'
                ? contractDetails?.payment_from_account
                : contractDetails?.retention_from_account
              : cash_retention_type === 'Claim'
                ? contractDetails?.payment_to_account
                : contractDetails?.retention_from_account;

          if (
            cash_retention_type === 'Claim' &&
            invoice.type === Invoice.TypeEnum.ACCPAY
          ) {
            const subscriptionDetails =
              await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
                xeroDetails.company_id,
              );
            const noticesItem = subscriptionDetails?.plan_items.find(
              (item) => item?.item_name === 'Notices',
            );
            const planValue = noticesItem?.limit_value
              ? noticesItem.limit_value
              : '';
            if (planValue || subscriptionDetails?.is_free_plan_eligible) {
              if (
                planValue == 'Manual' &&
                !subscriptionDetails?.is_free_plan_eligible
              ) {
                if (
                  !data?.compulsory_attachment_ids ||
                  data?.compulsory_attachment_ids?.length == 0
                ) {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      credit_note_id: creditNotes[0]?.creditNoteID,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 363 : 460,
                    dynamic_values: {},
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroPaymentEntity?.id,
                      paytradeId: null,
                    },
                    reference_id: xeroPaymentEntity?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `Missing supporting statement attachments`,
                    xero_records: [invoice],
                    paytrade_records: [],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              } else {
                if (!data?.withhold_payment_reason) {
                  const checkExistenceInSync = await this.xeroSyncLogs.findOne({
                    where: {
                      log_template_id: sync_run_type === 'webhook' ? 371 : 461,
                      reference_id: xeroPaymentEntity?.id,
                    },
                  });
                  if (!checkExistenceInSync) {
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        credit_note_id: creditNotes[0]?.creditNoteID,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 371 : 461,
                      dynamic_values: {},
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: xeroPaymentEntity?.id,
                        paytradeId: null,
                      },
                      reference_id: xeroPaymentEntity?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `Missing reason for withholding payment`,
                      xero_records: [invoice],
                      paytrade_records: [],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                  }
                  return false;
                }
              }
            }
          }

          const paytradePayload: AddPaymentInput = {
            company_id: xeroDetails.company_id,
            payment_claim_id: paymentClaimDetails?.payment_claim_id,
            project_id: xeroProjectDetails?.pt_project_id,
            contract_id: xeroContractDetails?.pt_contract_id,
            client_supplier_id: xeroContactDetails.pt_contact_id,
            input_date: moment.tz('UTC').toDate(),
            // memo: '',
            payment_type: 'Pay - Zero',
            total_amount: Number(creditNotes[0]?.allocations[0]?.amount),
            payment_from_account:
              invoice.type === Invoice.TypeEnum.ACCPAY ? bank_account_id : null,
            payment_to_account:
              invoice.type === Invoice.TypeEnum.ACCREC ? bank_account_id : null,
            withhold_payment_reason: data?.withhold_payment_reason || '',
          };

          this.logger.log(`%%%%----------paytrade-pay----------------->>>>>> ${JSON.stringify(paytradePayload)}`);

          const newPayment = await this.paymentsService.addPayment(
            decoded,
            paytradePayload,
            decoded?.userId,
          );
          this.logger.log('newPayment' + " " + JSON.stringify(newPayment));
          await this.xeroPayments
            .createQueryBuilder()
            .update()
            .set({
              pt_payment_id: newPayment?.data?.payment_id,
              mapped_status: 'System',
            })
            .where('id = :id', { id: xeroPaymentEntity.id })
            .execute();
          this.logger.log(
            `[Xero Webhook] Synced to Paytrade: Payment ${newPayment?.data?.payment_id}`,
          );

          const paytradeDetails = await this.paymentDetails?.findOne({
            where: { payment_id: newPayment?.data?.payment_id },
          });

          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id || null,
              api_name: 'createClaimInPaytrade',
              api_payload: {
                sync_run_type,
                invoice_id: invoice?.invoiceID,
                tenant_id,
                type:
                  invoice?.type === Invoice.TypeEnum.ACCPAY
                    ? 'bill'
                    : 'invoice',
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: sync_run_type === 'webhook' ? 251 : 411,
              dynamic_values: { id: paymentClaimDetails?.id },
              project_id: xeroProjectDetails?.id,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: xeroPaymentEntity?.id,
                paytradeId: paytradeDetails?.id,
              },
              reference_id: xeroPaymentEntity?.id,
              history: [
                `API triggered from invoice ${sync_run_type}`,
                'Import successful',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Import tracking id validation': 'Ok',
                'Import account type validation': 'Ok',
                'Import tax type validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
                'Contract mapping validation': 'Ok',
                'Project mapping validation': 'Ok',
              },
              error_message: null,
              xero_records: [invoice],
              paytrade_records: [paytradeDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
          return true;
        }
      }

      this.logger.log(
        `hasPayments: ${invoice?.payments && Array.isArray(invoice?.payments) && invoice?.payments?.length > 0}`,
      );
      if (
        invoice?.payments &&
        Array.isArray(invoice?.payments) &&
        invoice?.payments?.length > 0
      ) {
        const paymentListResponse = await this.xero.accountingApi.getPayments(
          tenant_id,
          undefined,
          `Invoice.InvoiceID == Guid("${invoice.invoiceID}")`,
        );

        const paymentList = paymentListResponse?.body?.payments || [];
        this.logger.log(JSON.stringify({ paymentList }));

        if (paymentList?.length > 0) {
          const paymentIds = [
            ...new Set(
              paymentList?.map((e) => e?.paymentID).filter((id) => id != null),
            ),
          ];
          this.logger.log(JSON.stringify({ paymentIds }));
          const existingPaymentsInPaytrade = await this.xeroPayments.find({
            where: {
              payment_id: Not(In(paymentIds)),
              status: Not('DELETED'),
              invoice_id: xeroInvoice?.id,
              integration_id: xeroDetails?.integration_id,
            },
          });
          this.logger.log(JSON.stringify({ existingPaymentsInPaytrade }));
          if (
            existingPaymentsInPaytrade &&
            existingPaymentsInPaytrade?.length > 0
          ) {
            for (const element of existingPaymentsInPaytrade) {
              if (element?.pt_payment_id) {
                const existingPaymentStatusCheck =
                  await this.paymentDetails.findOne({
                    where: { payment_id: element.pt_payment_id },
                  });
                if (
                  existingPaymentStatusCheck &&
                  existingPaymentStatusCheck?.current_status !== 'Deleted'
                ) {
                  try {
                    const paytradePayload: ChangeStatusOfAPaymentInput = {
                      payment_id: element.pt_payment_id,
                      status: 'Deleted',
                      input_date: null,
                    };
                    this.logger.log(JSON.stringify({ paytradePayload }));
                    const deletePaymentResponse =
                      await this.safeWebhookDeletePayment(
                        decoded,
                        paytradePayload,
                        '6',
                      );

                    this.logger.log('6:::' + " " + JSON.stringify({ deletePaymentResponse }));

                    await this.xeroPayments.update(
                      {
                        id: element?.id,
                      },
                      {
                        status: String(Payment.StatusEnum.DELETED),
                      },
                    );

                    const existingPaytradePayment =
                      await this.paymentDetails.findOne({
                        where: {
                          payment_id: element.pt_payment_id,
                        },
                      });
                    const addSyncLogResponse =
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 251 : 411,
                        dynamic_values: { id: paymentClaimDetails?.id },
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: element?.id,
                          paytradeId: existingPaytradePayment?.id,
                        },
                        reference_id: element?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import successful',
                        ],
                        important_checks: {
                          'Import data format validation': 'Ok',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: null,
                        xero_records: [invoice],
                        paytrade_records: [existingPaytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                  } catch (error) {
                    const errMsg = error?.message ? error?.message : error;
                    if (errMsg == `The confirmed payment cannot be deleted.`) {
                      const paytradePayment = await this.paymentDetails.findOne(
                        {
                          where: {
                            payment_id: element.pt_payment_id,
                          },
                          relations: ['subPayments'],
                          order: { created_on: 'DESC' },
                        },
                      );

                      const matchedPayments =
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) => element.status === 'Matched',
                            )
                          : [];

                      this.logger.log(JSON.stringify({ matchedPayments }));
                      let payment_account = null,
                        retention_account = null,
                        unmatchTransactions = [];
                      if (matchedPayments && matchedPayments?.length > 0) {
                        for (const element of matchedPayments) {
                          if (
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            )
                          ) {
                            payment_account =
                              paymentClaimDetails?.claim_type == 'Billable'
                                ? paytradePayment?.payment_from_account
                                : paytradePayment?.payment_to_account;
                            unmatchTransactions.push({
                              ...element,
                              account_id: payment_account,
                            });
                          } else if (
                            element.sub_payment_type === 'Retention In'
                          ) {
                            retention_account =
                              paytradePayment?.retention_account;
                            unmatchTransactions.push({
                              ...element,
                              account_id: retention_account,
                            });
                          }
                        }
                      }

                      const checkedPayments =
                        (!unmatchTransactions ||
                          unmatchTransactions?.length === 0) &&
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) =>
                                ['Payment', 'Retention Out'].includes(
                                  element.sub_payment_type,
                                ) &&
                                (element.is_paid_confirmed === true ||
                                  element.is_received_confirmed === true ||
                                  element.is_retention_confirmed === true),
                            )
                          : [];

                      const existingXeroPayment =
                        await this.xeroPayments.findOne({
                          where: {
                            pt_payment_id: element.pt_payment_id,
                            status: Not('DELETED'),
                          },
                        });

                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                          payment_id: element.pt_payment_id,
                          payment_type: paytradePayment?.payment_type,
                          claim_id: paytradePayment?.payment_claim_id,
                          // unmapping_payment_id:
                          //   existingXeroPayment?.payment_id,
                          delete_paytrade_only: true,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 378 : 462,
                        dynamic_values: { id: paymentClaimDetails?.id },
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: element?.id,
                          paytradeId: paytradePayment?.id,
                        },
                        reference_id: element?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import failed',
                        ],
                        important_checks: {
                          'Import data format validation': 'Failed',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                        xero_records: [
                          {
                            ...invoice,
                            payment_account,
                            retention_account,
                            ...(unmatchTransactions &&
                            unmatchTransactions?.length > 0
                              ? { unmatchTransactions }
                              : {}),
                            ...(!unmatchTransactions ||
                            unmatchTransactions?.length === 0
                              ? { checkedPayments }
                              : {}),
                          },
                        ],
                        paytrade_records: [paytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                      return false;
                    }
                  }
                }
              }
            }
          }
          if (previousPayments && previousPayments?.length > 0) {
            //reversal of payments due to credit notes and overpayments
            this.logger.log(`previousPayments[0]?.payment_type:: ${JSON.stringify(previousPayments[0]?.payment_type)} ${JSON.stringify(creditNotes?.length)}`);
            this.logger.log(`previousPayments[0]?.payment_type:: ${JSON.stringify(previousPayments[0]?.payment_type)} ${JSON.stringify(existingCreditNotesInBothXeroAndDb?.length)} ${JSON.stringify(creditNotes?.length)}`);
            if (
              (previousPayments[0]?.payment_type === 'Part' &&
                creditNotes &&
                creditNotes?.length >= 1) ||
              (['Pay Less - Full', 'Pay Less - Part'].includes(
                previousPayments[0]?.payment_type,
              ) &&
                (!existingCreditNotesInBothXeroAndDb ||
                  existingCreditNotesInBothXeroAndDb?.length == 0) &&
                (!creditNotes || creditNotes?.length == 0))
            ) {
              this.logger.log('2:: ' + " " + JSON.stringify({ previousPayments }));
              for (const element of previousPayments) {
                const associatedOverUnderPaymentsInPaytrade =
                  await this.paymentDetails.find({
                    where: {
                      payment_claim_id: xeroInvoice?.pt_claim_id,
                      associatedPayment: { payment_id: element.payment_id },
                      current_status: Not('Deleted'),
                      payment_type: In([
                        'Overpayment from client',
                        'Underpayment from client',
                        'Overpayment to supplier',
                        'Underpayment to supplier',
                      ]),
                    },
                    order: { created_on: 'DESC' },
                  });

                this.logger.log('1::' + " " + JSON.stringify({ associatedOverUnderPaymentsInPaytrade }));

                if (
                  associatedOverUnderPaymentsInPaytrade &&
                  associatedOverUnderPaymentsInPaytrade?.length > 0
                ) {
                  for (const element of associatedOverUnderPaymentsInPaytrade) {
                    if (element && element?.current_status !== 'Deleted') {
                      try {
                        const paytradePayload: ChangeStatusOfAPaymentInput = {
                          payment_id: element.payment_id,
                          status: 'Deleted',
                          input_date: null,
                        };
                        this.logger.log(JSON.stringify({ paytradePayload }));
                        const deletePaymentResponse =
                          await this.safeWebhookDeletePayment(
                            decoded,
                            paytradePayload,
                            '8',
                          );

                        this.logger.log('8:::' + " " + JSON.stringify({ deletePaymentResponse }));

                        await this.xeroPayments.update(
                          {
                            pt_payment_id: element?.payment_id,
                          },
                          {
                            status: String(Payment.StatusEnum.DELETED),
                          },
                        );

                        const existingPaytradePayment =
                          await this.paymentDetails.findOne({
                            where: {
                              payment_id: element.payment_id,
                            },
                          });
                        const addSyncLogResponse =
                          await this.xeroService.insertXeroSyncLogs(decoded, {
                            id: data?.sync_id || null,
                            api_name: 'createClaimInPaytrade',
                            api_payload: {
                              sync_run_type,
                              invoice_id: invoice?.invoiceID,
                              tenant_id,
                              type:
                                invoice?.type === Invoice.TypeEnum.ACCPAY
                                  ? 'bill'
                                  : 'invoice',
                            },
                            integration_id: xeroDetails.integration_id,
                            log_template_id:
                              sync_run_type === 'webhook' ? 251 : 411,
                            dynamic_values: { id: paymentClaimDetails?.id },
                            project_id: xeroProjectDetails?.id,
                            contract_id: xeroContractDetails?.id,
                            reference: {
                              xeroId: element?.id,
                              paytradeId: existingPaytradePayment?.id,
                            },
                            reference_id: element?.id,
                            history: [
                              `API triggered from invoice ${sync_run_type}`,
                              'Import successful',
                            ],
                            important_checks: {
                              'Import data format validation': 'Ok',
                              'Import tracking id validation': 'Ok',
                              'Import account type validation': 'Ok',
                              'Import tax type validation': 'Ok',
                              'Client/Supplier mapping validation': 'Ok',
                              'Contract mapping validation': 'Ok',
                              'Project mapping validation': 'Ok',
                            },
                            error_message: null,
                            xero_records: [invoice],
                            paytrade_records: [existingPaytradePayment],
                            new_records: null,
                            updated_records: null,
                            synced_records: null,
                          });
                      } catch (error) {
                        const errMsg = error?.message ? error?.message : error;
                        if (
                          errMsg == `The confirmed payment cannot be deleted.`
                        ) {
                          const paytradePayment =
                            await this.paymentDetails.findOne({
                              where: {
                                payment_id: element.payment_id,
                              },
                              relations: ['subPayments'],
                              order: { created_on: 'DESC' },
                            });

                          const matchedPayments =
                            paytradePayment &&
                            paytradePayment?.subPayments &&
                            paytradePayment?.subPayments?.length > 0
                              ? paytradePayment?.subPayments?.filter(
                                  (element) => element.status === 'Matched',
                                )
                              : [];

                          this.logger.log(JSON.stringify({ matchedPayments }));
                          let payment_account = null,
                            retention_account = null,
                            unmatchTransactions = [];
                          if (matchedPayments && matchedPayments?.length > 0) {
                            for (const element of matchedPayments) {
                              if (
                                ['Payment', 'Retention Out'].includes(
                                  element.sub_payment_type,
                                )
                              ) {
                                payment_account =
                                  paymentClaimDetails?.claim_type == 'Billable'
                                    ? paytradePayment?.payment_from_account
                                    : paytradePayment?.payment_to_account;
                                unmatchTransactions.push({
                                  ...element,
                                  account_id: payment_account,
                                });
                              } else if (
                                element.sub_payment_type === 'Retention In'
                              ) {
                                retention_account =
                                  paytradePayment?.retention_account;
                                unmatchTransactions.push({
                                  ...element,
                                  account_id: retention_account,
                                });
                              }
                            }
                          }

                          const checkedPayments =
                            (!unmatchTransactions ||
                              unmatchTransactions?.length === 0) &&
                            paytradePayment &&
                            paytradePayment?.subPayments &&
                            paytradePayment?.subPayments?.length > 0
                              ? paytradePayment?.subPayments?.filter(
                                  (element) =>
                                    ['Payment', 'Retention Out'].includes(
                                      element.sub_payment_type,
                                    ) &&
                                    (element.is_paid_confirmed === true ||
                                      element.is_received_confirmed === true ||
                                      element.is_retention_confirmed === true),
                                )
                              : [];

                          await this.xeroService.insertXeroSyncLogs(decoded, {
                            id: data?.sync_id || null,
                            api_name: 'createClaimInPaytrade',
                            api_payload: {
                              sync_run_type,
                              invoice_id: invoice?.invoiceID,
                              tenant_id,
                              type:
                                invoice?.type === Invoice.TypeEnum.ACCPAY
                                  ? 'bill'
                                  : 'invoice',
                              payment_id: element.payment_id,
                              payment_type: paytradePayment?.payment_type,
                              claim_id: paytradePayment?.payment_claim_id,
                              // unmapping_payment_id: existingXeroPayment?.payment_id,
                              delete_paytrade_only: true,
                            },
                            integration_id: xeroDetails.integration_id,
                            log_template_id:
                              sync_run_type === 'webhook' ? 378 : 462,
                            dynamic_values: { id: paymentClaimDetails?.id },
                            project_id: xeroProjectDetails?.id,
                            contract_id: xeroContractDetails?.id,
                            reference: {
                              xeroId: element?.id,
                              paytradeId: paytradePayment?.id,
                            },
                            reference_id: element?.id,
                            history: [
                              `API triggered from invoice ${sync_run_type}`,
                              'Import failed',
                            ],
                            important_checks: {
                              'Import data format validation': 'Failed',
                              'Import tracking id validation': 'Ok',
                              'Import account type validation': 'Ok',
                              'Import tax type validation': 'Ok',
                              'Client/Supplier mapping validation': 'Ok',
                              'Contract mapping validation': 'Ok',
                              'Project mapping validation': 'Ok',
                            },
                            error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                            xero_records: [
                              {
                                ...invoice,
                                payment_account,
                                retention_account,
                                ...(unmatchTransactions &&
                                unmatchTransactions?.length > 0
                                  ? { unmatchTransactions }
                                  : {}),
                                ...(!unmatchTransactions ||
                                unmatchTransactions?.length === 0
                                  ? { checkedPayments }
                                  : {}),
                              },
                            ],
                            paytrade_records: [paytradePayment],
                            new_records: null,
                            updated_records: null,
                            synced_records: null,
                          });
                          return false;
                        }
                      }
                    }
                  }
                }
              }
              for (const element of previousPayments) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '7',
                    );

                  this.logger.log('7:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  await this.xeroPayments.update(
                    {
                      pt_payment_id: element?.payment_id,
                    },
                    {
                      status: String(Payment.StatusEnum.DELETED),
                    },
                  );

                  const existingPaytradePayment =
                    await this.paymentDetails?.findOne({
                      where: {
                        payment_id: element.payment_id,
                      },
                    });
                  if (data?.sync_id) {
                    const addSyncLogResponse =
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: data?.sync_id || null,
                        api_name: 'createClaimInPaytrade',
                        api_payload: {
                          sync_run_type,
                          invoice_id: invoice?.invoiceID,
                          tenant_id,
                          type:
                            invoice?.type === Invoice.TypeEnum.ACCPAY
                              ? 'bill'
                              : 'invoice',
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 251 : 411,
                        dynamic_values: { id: paymentClaimDetails?.id },
                        project_id: xeroProjectDetails?.id,
                        contract_id: xeroContractDetails?.id,
                        reference: {
                          xeroId: element?.id,
                          paytradeId: existingPaytradePayment?.id,
                        },
                        reference_id: element?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import successful',
                        ],
                        important_checks: {
                          'Import data format validation': 'Ok',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: null,
                        xero_records: [invoice],
                        paytrade_records: [existingPaytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                  }
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      retention_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (
                          ['Payment', 'Retention Out'].includes(
                            element.sub_payment_type,
                          )
                        ) {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        } else if (
                          element.sub_payment_type === 'Retention In'
                        ) {
                          retention_account =
                            paytradePayment?.retention_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: retention_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              ['Payment', 'Retention Out'].includes(
                                element.sub_payment_type,
                              ) &&
                              (element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true ||
                                element.is_retention_confirmed === true),
                          )
                        : [];

                    const existingXeroPayment = await this.xeroPayments.findOne(
                      {
                        where: {
                          pt_payment_id: element.payment_id,
                        },
                      },
                    );

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: element.payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          retention_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            } else if (
              ['Pay Less - Full', 'Pay Less - Part'].includes(
                previousPayments[0]?.payment_type,
              ) &&
              existingCreditNotesInBothXeroAndDb &&
              existingCreditNotesInBothXeroAndDb?.length == 1 &&
              (!creditNotes || creditNotes?.length == 0)
            ) {
              creditNotes = existingCreditNotesInBothXeroAndDb;
              existingCreditNotesInBothXeroAndDb = [];
              this.logger.error(`creditNotes && existingCreditNotesInBothXeroAndDb:: ${JSON.stringify(creditNotes)} ${JSON.stringify(existingCreditNotesInBothXeroAndDb)}`);
            } else if (
              ['Pay Less - Full', 'Pay Less - Part'].includes(
                previousPayments[0]?.payment_type,
              ) &&
              existingCreditNotesInBothXeroAndDb &&
              existingCreditNotesInBothXeroAndDb?.length > 0 &&
              creditNotes &&
              creditNotes?.length == 1
            ) {
              this.logger.error(`existingCreditNotesInBothXeroAndDb?.length:: ${JSON.stringify(existingCreditNotesInBothXeroAndDb?.length)} ${JSON.stringify({ existingCreditNotesInBothXeroAndDb })}`);
            }
          }
          const updatedClaimDetails = await this.paymentClaims.findOne({
            where: { payment_claim_id: xeroInvoice?.pt_claim_id },
          });
          this.logger.log(JSON.stringify({ updatedClaimDetails }));

          for (let index = 0; index < paymentList.length; index++) {
            const payment = paymentList[index];

            this.logger.log(
              `Start:: [${index + 1}/${paymentList.length}] ${payment.paymentID}`,
            );

            const paymentResponse = await this.processPayment(
              {
                tenant_id,
                payment,
                data,
                invoice,
                xeroDetails,
                xeroProjectDetails,
                xeroContractDetails,
                xeroInvoice,
                cashRetention,
                retentionAmount,
                xeroContactDetails,
                cash_retention_type,
                paymentClaimDetails: updatedClaimDetails,
                contractDetails,
                company_id: xeroDetails.company_id,
                creditNotes,
                sync_run_type,
              },
              decoded,
            );

            this.logger.log(`Done:: [${index + 1}] ${payment.paymentID} ${JSON.stringify({ paymentResponse })}`);

            if (!paymentResponse) {
              return false; // stop further processing
            }
          }

          return true;
        }
      } else {
        const associatedOverUnderPaymentsInXero = await this.xeroPayments.find({
          where: {
            overpayment_id: Not(IsNull()),
            status: Not('DELETED'),
            invoice_id: xeroInvoice?.id,
            integration_id: xeroDetails?.integration_id,
          },
        });

        this.logger.log(JSON.stringify({ associatedOverUnderPaymentsInXero }));

        if (
          associatedOverUnderPaymentsInXero &&
          associatedOverUnderPaymentsInXero?.length > 0
        ) {
          for (const element of associatedOverUnderPaymentsInXero) {
            if (element?.pt_payment_id) {
              const existingPaymentStatusCheck =
                await this.paymentDetails.findOne({
                  where: { payment_id: element.pt_payment_id },
                });
              if (
                existingPaymentStatusCheck &&
                existingPaymentStatusCheck?.current_status !== 'Deleted'
              ) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.pt_payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '11',
                    );

                  this.logger.log('11:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  await this.xeroPayments.update(
                    {
                      id: element?.id,
                    },
                    {
                      status: String(Payment.StatusEnum.DELETED),
                    },
                  );

                  const existingPaytradePayment =
                    await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                    });
                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: existingPaytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [existingPaytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      retention_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (
                          ['Payment', 'Retention Out'].includes(
                            element.sub_payment_type,
                          )
                        ) {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        } else if (
                          element.sub_payment_type === 'Retention In'
                        ) {
                          retention_account =
                            paytradePayment?.retention_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: retention_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              ['Payment', 'Retention Out'].includes(
                                element.sub_payment_type,
                              ) &&
                              (element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true ||
                                element.is_retention_confirmed === true),
                          )
                        : [];

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: element.payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          retention_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            } else {
              await this.xeroPayments
                .createQueryBuilder()
                .update(XeroPayments)
                .set({
                  status: 'DELETED',
                })
                .where(
                  'payment_id = :payment_id AND invoice_id = :invoice_id',
                  {
                    payment_id: element.payment_id,
                    invoice_id: xeroInvoice?.id,
                  },
                )
                .execute();
            }
          }
        }

        const associatedOverUnderPaymentsInPaytrade =
          await this.paymentDetails.find({
            where: {
              payment_claim_id: xeroInvoice?.pt_claim_id,
              current_status: Not('Deleted'),
              payment_type: In([
                'Overpayment from client',
                'Underpayment from client',
                'Overpayment to supplier',
                'Underpayment to supplier',
              ]),
            },
            order: { created_on: 'DESC' },
          });

        this.logger.log('2::' + " " + JSON.stringify({ associatedOverUnderPaymentsInPaytrade }));

        if (
          associatedOverUnderPaymentsInPaytrade &&
          associatedOverUnderPaymentsInPaytrade?.length > 0
        ) {
          for (const element of associatedOverUnderPaymentsInPaytrade) {
            if (element && element?.current_status !== 'Deleted') {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: element.payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '12',
                  );

                this.logger.log('12:::' + " " + JSON.stringify({ deletePaymentResponse }));

                const existingPaytradePayment =
                  await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                  });
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    retention_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (
                        ['Payment', 'Retention Out'].includes(
                          element.sub_payment_type,
                        )
                      ) {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      } else if (element.sub_payment_type === 'Retention In') {
                        retention_account = paytradePayment?.retention_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: retention_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            ) &&
                            (element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true ||
                              element.is_retention_confirmed === true),
                        )
                      : [];

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: element.payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id: existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        retention_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
        }

        const existingPaymentsInPaytradeNotInXero =
          await this.xeroPayments.find({
            where: {
              status: Not('DELETED'),
              invoice_id: xeroInvoice?.id,
              integration_id: xeroDetails?.integration_id,
            },
          });
        if (
          existingPaymentsInPaytradeNotInXero &&
          existingPaymentsInPaytradeNotInXero?.length > 0
        ) {
          for (const element of existingPaymentsInPaytradeNotInXero) {
            if (element?.pt_payment_id) {
              const existingPaymentStatusCheck =
                await this.paymentDetails.findOne({
                  where: { payment_id: element.pt_payment_id },
                });
              if (
                existingPaymentStatusCheck &&
                existingPaymentStatusCheck?.current_status !== 'Deleted'
              ) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.pt_payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '9',
                    );

                  this.logger.log('9:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  await this.xeroPayments.update(
                    {
                      id: element?.id,
                    },
                    {
                      status: String(Payment.StatusEnum.DELETED),
                    },
                  );

                  const existingPaytradePayment =
                    await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                    });
                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: existingPaytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [existingPaytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.pt_payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      retention_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (
                          ['Payment', 'Retention Out'].includes(
                            element.sub_payment_type,
                          )
                        ) {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        } else if (
                          element.sub_payment_type === 'Retention In'
                        ) {
                          retention_account =
                            paytradePayment?.retention_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: retention_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              ['Payment', 'Retention Out'].includes(
                                element.sub_payment_type,
                              ) &&
                              (element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true ||
                                element.is_retention_confirmed === true),
                          )
                        : [];

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: element.pt_payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: element?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: element?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          retention_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            }
          }
        }

        const existingPaymentsInPaytradeNotInXeroDb =
          await this.paymentDetails.find({
            where: {
              current_status: Not('DELETED'),
              payment_claim_id: xeroInvoice?.pt_claim_id,
              payment_type: Not(
                In([
                  'Overpayment from client',
                  'Underpayment from client',
                  'Overpayment to supplier',
                  'Underpayment to supplier',
                ]),
              ),
            },
            order: { created_on: 'DESC' },
          });
        if (
          existingPaymentsInPaytradeNotInXeroDb &&
          existingPaymentsInPaytradeNotInXeroDb?.length > 0
        ) {
          for (const element of existingPaymentsInPaytradeNotInXeroDb) {
            const existingPaymentStatusCheck =
              await this.paymentDetails.findOne({
                where: { payment_id: element.payment_id },
              });
            if (
              existingPaymentStatusCheck &&
              existingPaymentStatusCheck?.current_status !== 'Deleted'
            ) {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: element.payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '10',
                  );

                this.logger.log('10:::' + " " + JSON.stringify({ deletePaymentResponse }));

                const existingPaytradePayment =
                  await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                  });
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    retention_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (
                        ['Payment', 'Retention Out'].includes(
                          element.sub_payment_type,
                        )
                      ) {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      } else if (element.sub_payment_type === 'Retention In') {
                        retention_account = paytradePayment?.retention_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: retention_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            ) &&
                            (element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true ||
                              element.is_retention_confirmed === true),
                        )
                      : [];

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: element.payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id: existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        retention_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
        }

        //check for creditnotes and overpayments
        // if (
        //   ['Add payment', 'Overdue'].includes(
        //     paymentClaimDetails.list_status,
        //   ) &&
        //   invoice?.overpayments &&
        //   invoice?.overpayments?.length > 0
        // ) {
        //   let paymentType;
        //   const invoiceAmount = Number(invoice.total || 0);
        //   let underPayments = invoice?.overpayments || [];
        //   let underPaymentAmount = invoice?.overpayments?.reduce(
        //     (sum, item) => {
        //       return (
        //         sum +
        //         (item?.appliedAmount === null
        //           ? 0.0
        //           : Number(item?.appliedAmount))
        //       );
        //     },
        //     0.0,
        //   );

        //   const creditNoteAmount =
        //     creditNotes && creditNotes?.length == 1
        //       ? Number(creditNotes[0]?.allocations[0]?.amount)
        //       : 0;

        //   this.logger.log(JSON.stringify({ underPayments, underPaymentAmount, creditNoteAmount }));

        //   if (
        //     underPaymentAmount > 0 &&
        //     (!creditNoteAmount || creditNoteAmount === 0)
        //   ) {
        //     paymentType =
        //       underPaymentAmount === invoiceAmount ? 'Full' : 'Part';
        //   } else {
        //     paymentType =
        //       underPaymentAmount > 0 &&
        //       underPaymentAmount + creditNoteAmount === invoiceAmount
        //         ? 'Pay Less - Full'
        //         : 'Pay Less - Part';
        //   }

        //   const checkExistence = await this.xeroPayments.findOne({
        //     where: {
        //       credit_note_id: creditNotes[0]?.creditNoteID,
        //       credit_note_status: Not('DELETED'),
        //       status: Not('DELETED'),
        //     },
        //   });
        //   this.logger.log('checkExistence: ' + " " + JSON.stringify(checkExistence));
        //   if (!checkExistence) {
        //     let xeroPaymentPayload: any = {
        //       payment_id: null,
        //       tenant_id: xeroDetails.tenant_id,
        //       integration_id: xeroDetails.integration_id,
        //       contact_id: xeroContactDetails.id,
        //       invoice_id: xeroInvoice?.id,
        //       payment_type: creditNotes[0]?.type,
        //       payment_date: creditNotes[0]?.date,
        //       status: Payment.StatusEnum.AUTHORISED,
        //       created_group: 'SYSTEM',
        //       credit_note_id: creditNotes[0]?.creditNoteID,
        //       credit_note_allocation_id:
        //         creditNotes[0]?.allocations[0]?.allocationID,
        //       credit_note_type: creditNotes[0]?.type,
        //       credit_note_status: creditNotes[0]?.status,
        //       credit_amount: creditNotes[0]?.total,
        //       credit_note_date: creditNotes[0]?.date,
        //     };

        //     const newPayment = this.xeroPayments.create(xeroPaymentPayload);
        //     await this.xeroPayments.save(newPayment);
        //     this.logger.log(
        //       `[Xero Webhook] Inserted new credit note ${creditNotes[0]?.creditNoteID}`,
        //     );
        //   }

        //   const xeroPaymentEntity = await this.xeroPayments.findOne({
        //     where: {
        //       credit_note_id: creditNotes[0]?.creditNoteID,
        //       credit_note_status: Not('DELETED'),
        //       status: Not('DELETED'),
        //     },
        //   });
        //   this.logger.log('xeroPaymentEntity: ' + " " + JSON.stringify(xeroPaymentEntity));
        // }

        return true;
      }
    } catch (error) {
      throw error;
    }
  }

  async processPayment(paymentPayload, decoded) {
    try {
      const {
        tenant_id,
        payment,
        data,
        invoice,
        xeroDetails,
        xeroProjectDetails,
        xeroContractDetails,
        xeroInvoice,
        cashRetention,
        retentionAmount,
        xeroContactDetails,
        cash_retention_type,
        paymentClaimDetails,
        contractDetails,
        company_id,
        creditNotes,
        sync_run_type,
      } = paymentPayload;
      const existingPayment = await this.xeroPayments.findOne({
        where: {
          payment_id: payment.paymentID,
          integration_id: xeroDetails.integration_id,
          status: Not('DELETED'),
        },
      });

      const paymentResponse = await this.xero.accountingApi.getPayment(
        tenant_id,
        payment.paymentID,
      );
      const paymentDetails = paymentResponse.body.payments?.[0];
      if (!paymentDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 279 : 439,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Payment details not found`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          account_id: paymentDetails?.account?.accountID,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 337 : 440,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Account details not found`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroBankAccountDetails.pt_bank_account_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            account_id: paymentDetails?.account?.accountID,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 338 : 441,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Account details not mapped`,
          xero_records: [{ ...invoice, xeroBankAccountDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let paymentAccount: string | null = null;
      let retentionAccount: string | null = null;
      let bankTransferId: string | null = null;
      let retention_amount =
        cash_retention_type === 'Retention claim'
          ? payment?.amount
          : retentionAmount;
      this.logger.log(JSON.stringify({
        retentionAmount,
        retention_amount,
        payment_amount: payment?.amount,
      }));
      if (
        (cash_retention_type === 'Claim' && cashRetention) ||
        cash_retention_type === 'Retention claim'
      ) {
        const previousPartPayments = await this.xeroPayments.findOne({
          where: { invoice_id: xeroInvoice?.id, status: Not('DELETED') },
        });
        this.logger.log(JSON.stringify({ previousPartPayments }));
        if (existingPayment && existingPayment?.bank_transfer_id) {
          data.bank_transfer_id = existingPayment?.bank_transfer_id;
        } else if (
          !existingPayment &&
          previousPartPayments &&
          previousPartPayments?.bank_transfer_id
        ) {
          data.bank_transfer_id = previousPartPayments?.bank_transfer_id;
        }
        this.logger.log(JSON.stringify({ bank_transfer_id: data.bank_transfer_id }));
        this.logger.log('[Retention Transfer Debug] Fetching bank transfers from Xero for tenant_id:' + " " + JSON.stringify(xeroDetails.tenant_id));
        let bankTransferResponse;
        try {
          bankTransferResponse = await this.xero.accountingApi.getBankTransfers(
            xeroDetails.tenant_id,
            new Date('1900-01-01T00:00:00.000+00:00'),
            null,
            'Amount ASC',
          );
          this.logger.log('[Retention Transfer Debug] Bank transfer API response status:' + " " + JSON.stringify(bankTransferResponse?.response?.statusCode));
        } catch (apiError: any) {
          this.logger.error(`[Retention Transfer Debug] Bank transfer API ERROR: ${JSON.stringify(apiError?.message)} ${JSON.stringify(apiError?.response?.body || apiError)}`);
          bankTransferResponse = { body: { bankTransfers: [] } };
        }

        this.logger.log('[Retention Transfer Debug] All bank transfers count:' + " " + JSON.stringify(bankTransferResponse?.body?.bankTransfers?.length));
        this.logger.log(`[Retention Transfer Debug] Looking for accountID: ${JSON.stringify(xeroBankAccountDetails.account_id)} ${JSON.stringify('retention_amount:')} ${JSON.stringify(retention_amount)}`);
        this.logger.log('[Retention Transfer Debug] retentionAccount:' + " " + JSON.stringify(retentionAccount));
        this.logger.log('[Retention Transfer Debug] cash_retention_type:' + " " + JSON.stringify(cash_retention_type));
        
        // Log each bank transfer for debugging
        bankTransferResponse?.body?.bankTransfers?.forEach((t, i) => {
          const fromMatches = t?.fromBankAccount?.accountID === xeroBankAccountDetails.account_id;
          const toMatches = t?.toBankAccount?.accountID === xeroBankAccountDetails.account_id;
          const amountMatches = Math.abs(Number(t?.amount)) === Math.abs(Number(retention_amount));
          this.logger.log(`[Retention Transfer Debug] Transfer ${i}: ID=${t?.bankTransferID}, fromAccount=${t?.fromBankAccount?.accountID}, toAccount=${t?.toBankAccount?.accountID}, amount=${t?.amount}, fromMatches=${fromMatches}, toMatches=${toMatches}, amountMatches=${amountMatches}`);
        });

        // -----------------------------------------------------------------
        // Task #50 — Tightened inbound matcher (extracted to
        // `matchRetentionTransferCandidates` for re-use by the Task #53
        // legacy retro re-check scheduler).
        // -----------------------------------------------------------------
        const allCandidateTransfers =
          bankTransferResponse?.body?.bankTransfers || [];

        // Resolve the PT-side reference we may have stamped on the way out.
        const ptPaymentIdForRef =
          existingPayment?.pt_payment_id ||
          previousPartPayments?.pt_payment_id ||
          null;
        const ptRefForRoundTrip = ptPaymentIdForRef
          ? `PT-RET-${ptPaymentIdForRef}`
          : null;

        const matchResult = this.matchRetentionTransferCandidates({
          allCandidateTransfers,
          paymentAccountId: xeroBankAccountDetails.account_id,
          retentionAmount: retention_amount,
          paymentDate: payment?.date ? new Date(payment.date as any) : null,
          ptRefForRoundTrip,
          preferKnownBankTransferId: data?.bank_transfer_id || null,
        });
        const TASK50_WINDOW_DAYS = matchResult.windowDays;
        let retentionTransfers: any[] = matchResult.matched;
        const matchedByReference = matchResult.matchedByReference;
        const outOfWindowOnly = matchResult.outOfWindow;

        if (!data?.bank_transfer_id) {
          if (matchedByReference) {
            this.logger.log(
              `[Task#50 matcher] Matched ${retentionTransfers.length} transfer(s) via reference ${ptRefForRoundTrip}`,
            );
          }

          // (3) Surface out-of-window rejections with template 489 — but
          // only when no in-window candidate was found (otherwise the
          // sync log would be noisy on every match).
          if (retentionTransfers.length === 0) {
            if (outOfWindowOnly.length > 0) {
              try {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    candidate_transfer_ids: outOfWindowOnly.map(
                      (t: any) => t?.bankTransferID,
                    ),
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 489,
                  dynamic_values: {
                    invoice_number: invoice?.invoiceNumber || invoice?.invoiceID,
                    transfer_date:
                      outOfWindowOnly[0]?.date?.toString?.() ||
                      String(outOfWindowOnly[0]?.date || ''),
                    payment_date: payment?.date
                      ? new Date(payment.date as any)
                          .toISOString()
                          .substring(0, 10)
                      : '',
                  },
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: { xeroId: xeroInvoice?.id, paytradeId: null },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Out-of-window retention transfer rejected',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Retention transfer outside ±${TASK50_WINDOW_DAYS} day window`,
                  xero_records: outOfWindowOnly,
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              } catch (e: any) {
                this.logger.error(
                  `[Task#50 matcher] failed to write template 489 log: ${e?.message || e}`,
                );
              }
            }
          }

          // (4) Multi-match after tightening — log template 490 and
          // surface as a Failed sync so users can resolve manually.
          // Per architect review: this MUST be a hard stop (return
          // false), not a "log and continue", otherwise the downstream
          // legacy disambiguation can still pick a transfer.
          if (retentionTransfers.length > 1) {
            try {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  candidate_transfer_ids: retentionTransfers.map(
                    (t: any) => t?.bankTransferID,
                  ),
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 490,
                dynamic_values: {
                  invoice_number:
                    invoice?.invoiceNumber || invoice?.invoiceID,
                  candidate_ids: retentionTransfers
                    .map((t: any) => t?.bankTransferID)
                    .join(', '),
                },
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: { xeroId: xeroInvoice?.id, paytradeId: null },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Multiple retention transfers after tightened filter',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: 'Multiple retention transfers matched',
                xero_records: retentionTransfers,
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            } catch (e: any) {
              this.logger.error(
                `[Task#50 matcher] failed to write template 490 log: ${e?.message || e}`,
              );
            }
            // Hard stop — multi-match is not recoverable automatically.
            return false;
          }

          // (5) Reference shortcut win — surface a Succeeded log entry
          // so the audit trail shows we matched via reference rather
          // than the heuristic.
          if (matchedByReference && retentionTransfers.length === 1) {
            try {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  bank_transfer_id: retentionTransfers[0]?.bankTransferID,
                  reference: ptRefForRoundTrip,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 488,
                dynamic_values: {
                  invoice_number:
                    invoice?.invoiceNumber || invoice?.invoiceID,
                  reference: ptRefForRoundTrip,
                },
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: { xeroId: xeroInvoice?.id, paytradeId: null },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Matched retention transfer via PayTrade reference',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: null,
                xero_records: retentionTransfers,
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            } catch (e: any) {
              this.logger.error(
                `[Task#50 matcher] failed to write template 488 log: ${e?.message || e}`,
              );
            }
          }
        }
        
        this.logger.log('[Retention Transfer Debug] After matching with fromAccount OR toAccount, retentionTransfers count:' + " " + JSON.stringify(retentionTransfers?.length));

        // If existing payment has a bank_transfer_id but transfer not found in API response,
        // trust the existing record and create a synthetic transfer object for processing
        if (retentionTransfers.length === 0 && existingPayment?.bank_transfer_id) {
          this.logger.log('[Retention Transfer Debug] Existing payment has bank_transfer_id but not found in API - using existing record');
          retentionTransfers = [{ bankTransferID: existingPayment.bank_transfer_id }] as any;
        }

        this.logger.log(`[Retention Transfer Debug] Matched retentionTransfers: ${JSON.stringify(retentionTransfers?.length)} ${JSON.stringify(retentionTransfers?.map(t => t?.bankTransferID))}`);

        // Build debug info string for all error messages
        const retentionDebugContext = `[DEBUG CONTEXT] existingPayment=${!!existingPayment}, existingPayment.bank_transfer_id=${existingPayment?.bank_transfer_id || 'null'}, data.bank_transfer_id=${data?.bank_transfer_id || 'null'}, totalXeroTransfers=${bankTransferResponse?.body?.bankTransfers?.length || 0}, matchedTransfers=${retentionTransfers?.length || 0}, matchedIds=${retentionTransfers?.map(t => t?.bankTransferID)?.join(',') || 'none'}`;
        this.logger.log(retentionDebugContext);

        this.logger.log('[Retention Flow Debug] retentionTransfers.length:' + " " + JSON.stringify(retentionTransfers?.length));
        if (retentionTransfers && retentionTransfers.length > 0) {
          this.logger.log('[Retention Flow Debug] Entering length > 0 branch');
          if (retentionTransfers && retentionTransfers.length == 1) {
            this.logger.log('[Retention Flow Debug] Entering length == 1 branch');
            const checkBankTransferIdExistence =
              !existingPayment && !previousPartPayments
                ? await this.xeroPayments.findOne({
                    where: {
                      bank_transfer_id: retentionTransfers[0]?.bankTransferID,
                      status: Not('DELETED'),
                    },
                  })
                : null;
            this.logger.log('[Retention Flow Debug] checkBankTransferIdExistence:' + " " + JSON.stringify(checkBankTransferIdExistence));
            this.logger.log(`[Retention Flow Debug] existingPayment: ${JSON.stringify(!!existingPayment)} ${JSON.stringify('previousPartPayments:')} ${JSON.stringify(!!previousPartPayments)}`);
            if (checkBankTransferIdExistence) {
              this.logger.log('[Retention Flow Debug] Bank transfer already exists in another payment, returning No retention transfer error');
              // no retention transfers identified
              this.logger.log('if::' + " " + JSON.stringify({ existingPayment, previousPartPayments }));
              const debugInfo = `[DEBUG] Branch: checkBankTransferIdExistence=true (transfer already used), bankTransferId=${retentionTransfers[0]?.bankTransferID}, usedByPaymentId=${checkBankTransferIdExistence?.id}. ${retentionDebugContext}`;
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  type:
                    invoice?.type === Invoice.TypeEnum.ACCPAY
                      ? 'bill'
                      : 'invoice',
                  transfer_bank_account_id: xeroBankAccountDetails.account_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: sync_run_type === 'webhook' ? 340 : 443,
                dynamic_values: {},
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xeroInvoice?.id,
                  paytradeId: null,
                },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Import failed',
                  debugInfo,
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: 'No retention transfer identified.',
                xero_records: [invoice],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
            this.logger.log('[Retention Flow Debug] Check passed, setting bankTransferId');
            bankTransferId = retentionTransfers[0]?.bankTransferID || null;
            paymentAccount =
              retentionTransfers[0]?.fromBankAccount?.accountID || null;
            retentionAccount =
              cash_retention_type === 'Claim'
                ? retentionTransfers[0]?.toBankAccount?.accountID ||
                  contractDetails?.retention_from_account
                : null;
            this.logger.log(
              `[Retention Flow Debug] Set bankTransferId: ${bankTransferId}, paymentAccount: ${paymentAccount}, retentionAccount: ${retentionAccount}`,
            );
            this.logger.log(
              `[Xero Retention] Bank transaction for ${payment.paymentID} From: ${paymentAccount}, To: ${retentionAccount}, Amount: ${retentionAmount}`,
            );
          } else {
            this.logger.log('[Retention Flow Debug] Multiple transfers branch (length > 1)');
            // multiple bank transfers identified
            const existingBankTransfers =
              (await this.xeroPayments.find({
                where: {
                  status: Not('DELETED'),
                  integration_id: xeroDetails.integration_id,
                },
              })) || [];
            const existingBankTransferIds =
              existingBankTransfers && existingBankTransfers?.length > 0
                ? Array.from(
                    new Set(
                      existingBankTransfers?.map((d) => d?.bank_transfer_id),
                    ),
                  )
                : [];
            this.logger.log(JSON.stringify({ existingBankTransferIds }));
            const retentionTransferList = retentionTransfers?.filter(
              (element) =>
                !existingBankTransferIds?.includes(element.bankTransferID),
            );
            this.logger.log(JSON.stringify({ retentionTransferList }));
            if (retentionTransferList && retentionTransferList.length > 0) {
              if (retentionTransferList.length == 1) {
                bankTransferId =
                  retentionTransferList[0]?.bankTransferID || null;
                paymentAccount =
                  retentionTransferList[0]?.fromBankAccount?.accountID || null;
                retentionAccount =
                  cash_retention_type === 'Claim'
                    ? retentionTransferList[0]?.toBankAccount?.accountID ||
                      contractDetails?.retention_from_account
                    : null;
                this.logger.log(
                  `[Xero Retention] Bank transaction for ${payment.paymentID} From: ${paymentAccount}, To: ${retentionAccount}, Amount: ${retentionAmount}`,
                );
              } else {
                this.logger.log('multiple else::' + " " + JSON.stringify({
                  existingPayment,
                  previousPartPayments,
                }));
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 339 : 442,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Multiple retention transfers identified`,
                  xero_records: [{ ...invoice, retentionTransferList }],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            } else {
              this.logger.log('else multiple::' + " " + JSON.stringify({
                existingPayment,
                previousPartPayments,
              }));
              // no retention transfers identified - filtered out by existing bank transfer IDs
              const debugInfo = `[DEBUG] Branch: multipleTransfers=true BUT retentionTransferList=0 after filtering. Original count=${retentionTransfers?.length}, existingBankTransferIds=${existingBankTransfers?.map(p => p.bank_transfer_id)?.join(',')}. ${retentionDebugContext}`;
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  type:
                    invoice?.type === Invoice.TypeEnum.ACCPAY
                      ? 'bill'
                      : 'invoice',
                  transfer_bank_account_id: xeroBankAccountDetails.account_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: sync_run_type === 'webhook' ? 340 : 443,
                dynamic_values: {},
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xeroInvoice?.id,
                  paytradeId: null,
                },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Import failed',
                  debugInfo,
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: 'No retention transfer identified.',
                xero_records: [invoice],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
          }
        } else {
          this.logger.log('[Retention Flow Debug] NO retention transfers found (length == 0), returning error');
          this.logger.log('else::' + " " + JSON.stringify({ existingPayment, previousPartPayments }));

          // Task #141 — gross-amount-aware diagnostic. Before falling
          // through to the legacy "No retention transfer identified"
          // error, see whether there *is* an in-window candidate from
          // the same payment account whose amount mismatches the
          // expected gross retention (per recording mode + invoice
          // lineAmountTypes). Emits template 521 so users can see when
          // a transfer was created in Xero with the wrong amount
          // (e.g. net pushed instead of gross). Log-only — does not
          // change the existing block-and-return-false behaviour.
          try {
            const expectedGrossDiag = this.computeExpectedGrossRetention(
              Number(paymentClaimDetails?.retention_amount || retention_amount || 0),
              invoice?.lineAmountTypes,
              (xeroDetails as any)?.retention_recording_mode,
            );
            const paymentMs = payment?.date
              ? new Date(payment.date as any).getTime()
              : null;
            const WIN_MS_141 = 7 * 24 * 60 * 60 * 1000;

            // Resolve mapped retention/trust account ids from PT
            // payment-details for this claim. Without this we can't
            // distinguish a real (wrongly-amounted) retention transfer
            // from an unrelated transfer between two arbitrary
            // accounts that happens to share the date and amount.
            const trustAccountIdsDiag = new Set<string>();
            try {
              const claimPaysDiag = paymentClaimDetails?.payment_claim_id
                ? await this.paymentDetails.find({
                    where: {
                      payment_claim_id: Number(
                        paymentClaimDetails.payment_claim_id,
                      ),
                    },
                  })
                : [];
              const ptRetentionBankIdsDiag = Array.from(
                new Set(
                  claimPaysDiag
                    .map((p: any) => p?.retention_account)
                    .filter((v: any) => v !== null && v !== undefined)
                    .map((v: any) => Number(v)),
                ),
              );
              if (ptRetentionBankIdsDiag.length > 0) {
                const trustMapsDiag =
                  await this.xeroBankAccountDetails.find({
                    where: {
                      integration_id: xeroDetails.integration_id,
                      pt_bank_account_id: In(ptRetentionBankIdsDiag),
                    },
                  });
                for (const m of trustMapsDiag) {
                  if (m?.account_id)
                    trustAccountIdsDiag.add(m.account_id);
                }
              }
            } catch (_e) {
              // Fall through with empty set — we'll require a trust
              // endpoint below, so an empty set means we emit no
              // mismatch log (fail-closed) rather than risking a
              // false-positive against an unrelated transfer.
            }

            const mismatchCandidate = (
              bankTransferResponse?.body?.bankTransfers || []
            ).find((t: any) => {
              const fromAcc = t?.fromBankAccount?.accountID;
              const toAcc = t?.toBankAccount?.accountID;
              const paymentTouches =
                fromAcc === xeroBankAccountDetails.account_id ||
                toAcc === xeroBankAccountDetails.account_id;
              if (!paymentTouches) return false;
              const trustTouches =
                trustAccountIdsDiag.size > 0 &&
                ((fromAcc && trustAccountIdsDiag.has(fromAcc)) ||
                  (toAcc && trustAccountIdsDiag.has(toAcc)));
              if (!trustTouches) return false;
              if (!paymentMs || !t?.date) return false;
              const tMs = new Date(t.date as any).getTime();
              if (Number.isNaN(tMs)) return false;
              if (Math.abs(tMs - paymentMs) > WIN_MS_141) return false;
              const a = Math.abs(Number(t?.amount || 0));
              return (
                a > 0 && Math.abs(a - expectedGrossDiag) > 0.01
              );
            });
            if (mismatchCandidate && expectedGrossDiag > 0) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id || null,
                api_name: 'createClaimInPaytrade',
                api_payload: {
                  sync_run_type,
                  invoice_id: invoice?.invoiceID,
                  tenant_id,
                  expected_gross: expectedGrossDiag,
                  found_amount: Number(mismatchCandidate.amount || 0),
                  found_bank_transfer_id: mismatchCandidate.bankTransferID,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 521,
                dynamic_values: {
                  invoice_number:
                    invoice?.invoiceNumber || invoice?.invoiceID,
                  expected_gross: `$${expectedGrossDiag.toFixed(2)}`,
                  found_amount: `$${Number(mismatchCandidate.amount || 0).toFixed(2)}`,
                  bank_transfer_id: mismatchCandidate.bankTransferID,
                  window_days: 7,
                },
                project_id: xeroProjectDetails?.id,
                contract_id: xeroContractDetails?.id,
                reference: { xeroId: xeroInvoice?.id, paytradeId: null },
                reference_id: xeroInvoice?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Retention transfer amount mismatch detected (gross-amount aware)',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: `Retention transfer amount mismatch — expected gross $${expectedGrossDiag.toFixed(2)}, found $${Number(mismatchCandidate.amount || 0).toFixed(2)} (BankTransfer ${mismatchCandidate.bankTransferID})`,
                xero_records: [mismatchCandidate],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            }
          } catch (diagErr: any) {
            this.logger.error(
              `[Task#141 mismatch-diag] failed to write template 521 log: ${diagErr?.message || diagErr}`,
            );
          }

          // no retention transfers identified
          const debugInfo = `[DEBUG] Branch: retentionTransfers.length=0 (no matches at all). ${retentionDebugContext}`;
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id || null,
            api_name: 'createClaimInPaytrade',
            api_payload: {
              sync_run_type,
              invoice_id: invoice?.invoiceID,
              tenant_id,
              type:
                invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
              transfer_bank_account_id: xeroBankAccountDetails.account_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 340 : 443,
            dynamic_values: {},
            project_id: xeroProjectDetails?.id,
            contract_id: xeroContractDetails?.id,
            reference: {
              xeroId: xeroInvoice?.id,
              paytradeId: null,
            },
            reference_id: xeroInvoice?.id,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
              debugInfo,
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
              'Contract mapping validation': 'Ok',
              'Project mapping validation': 'Ok',
            },
            error_message: 'No retention transfer identified.',
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }

      const retentionAccountDetails = retentionAccount
        ? await this.xeroBankAccountDetails.findOne({
            where: { account_id: retentionAccount },
          })
        : null;

      if (retentionAccount && !retentionAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 342 : 445,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Retention account details not found`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (retentionAccount && !retentionAccountDetails.pt_bank_account_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
            retention_account_id: retentionAccount,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 343 : 446,
          dynamic_values: {},
          project_id: xeroProjectDetails?.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: xeroInvoice?.id,
            paytradeId: null,
          },
          reference_id: xeroInvoice?.id,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Retention account details not mapped`,
          xero_records: [
            {
              ...invoice,
              xeroBankAccountDetails: retentionAccountDetails,
            },
          ],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const response = await this.addOrDeletePaymentInPaytrade(
        {
          tenant_id,
          payment,
          data,
          invoice,
          xeroDetails,
          xeroProjectDetails,
          xeroContractDetails,
          xeroInvoice,
          cashRetention,
          retentionAmount,
          xeroContactDetails,
          cash_retention_type,
          paymentClaimDetails,
          contractDetails,
          company_id,
          paymentDetails,
          xeroBankAccountDetails,
          bankTransferId,
          creditNotes,
          retentionAccountDetails,
          existingPayment,
          sync_run_type,
        },
        decoded,
      );
      this.logger.log(JSON.stringify({ response }));
      return response;
    } catch (error) {
      throw error;
    }
  }

  async addOrDeletePaymentInPaytrade(paytradeData, decoded) {
    try {
      const {
        tenant_id,
        payment,
        data,
        invoice,
        xeroDetails,
        xeroProjectDetails,
        xeroContractDetails,
        xeroInvoice,
        cashRetention,
        retentionAmount,
        xeroContactDetails,
        cash_retention_type,
        paymentClaimDetails,
        contractDetails,
        company_id,
        paymentDetails,
        xeroBankAccountDetails,
        bankTransferId,
        creditNotes,
        retentionAccountDetails,
        existingPayment,
        sync_run_type,
      } = paytradeData;

      let xeroPaymentPayload: any = {
        payment_id: payment.paymentID,
        tenant_id: xeroDetails.tenant_id,
        integration_id: xeroDetails.integration_id,
        contact_id: xeroContactDetails.id,
        invoice_id: xeroInvoice?.id,
        account_id: xeroBankAccountDetails?.id,
        payment_type: paymentDetails?.paymentType,
        status: paymentDetails?.status,
        payment_date: paymentDetails?.date,
        reference: paymentDetails?.reference,
        payment_amount: paymentDetails?.amount,
        bank_amount: paymentDetails?.bankAmount,
        is_reconciled: paymentDetails?.isReconciled,
        bank_transfer_id: bankTransferId,
        created_on: paymentDetails?.updatedDateUTC,
        created_group: 'SYSTEM',
      };

      if (creditNotes && creditNotes?.length == 1) {
        xeroPaymentPayload = {
          ...xeroPaymentPayload,
          credit_note_id: creditNotes[0]?.creditNoteID,
          credit_note_allocation_id:
            creditNotes[0]?.allocations[0]?.allocationID,
          credit_note_type: creditNotes[0]?.type,
          credit_note_status: creditNotes[0]?.status,
          credit_amount: creditNotes[0]?.total,
          credit_note_date: creditNotes[0]?.date,
        };
      }

      if (existingPayment) {
        await this.xeroPayments.update(
          {
            payment_id: payment.paymentID,
            integration_id: xeroDetails.integration_id,
            status: Not('DELETED'),
          },
          xeroPaymentPayload,
        );
        this.logger.log(`[Xero Webhook] Updated payment ${payment.paymentID}`);
      } else {
        if (paymentDetails?.status !== Payment.StatusEnum.DELETED) {
          const newPayment = this.xeroPayments.create(xeroPaymentPayload);
          await this.xeroPayments.save(newPayment);
          this.logger.log(
            `[Xero Webhook] Inserted new payment ${payment.paymentID}`,
          );
        }
      }

      const xeroPaymentEntitycheck = await this.xeroPayments.findOne({
        where: { payment_id: payment.paymentID, status: Not('DELETED') },
      });

      this.logger.log('xeroPaymentEntitycheck: ' + " " + JSON.stringify(xeroPaymentEntitycheck));
      if (xeroPaymentEntitycheck) {
        let isPreviousPartPaymentExist = false,
          isPreviousPaymentExist = false;
        let paymentType;
        const queryBuilder = this.paymentClaims
          .createQueryBuilder('pc')
          .select([
            'pc.payment_claim_id AS payment_claim_id',
            'pc.company_id AS company_id',
            'pc.claim_type AS claim_type',
            'pc.cash_retention_type AS cash_retention_type',
            'pc.due_date AS due_date',
            'pc.claim_amount AS claim_amount',
            'pc.status AS claim_status',
          ]);

        queryBuilder.addSelect((subQuery) => {
          return subQuery
            .select(
              `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'payment_id', p.payment_id,
                  'payment_type', p.payment_type,
                  'cash_retention', p.cash_retention,
                  'payment_status', p.current_status,
                  'payless_amount', p.payless_amount,
                  'total_amount', p.total_amount
                )
              )`,
              'payments',
            )
            .from(PaymentDetails, 'p')
            .where('p.payment_claim_id = pc.payment_claim_id')
            .andWhere(`p.current_status != 'Deleted'`)
            .andWhere(
              `p.payment_type NOT IN ('Overpayment from client','Underpayment from client','Overpayment to supplier','Underpayment to supplier')`,
            )
            .groupBy('p.payment_claim_id')
            .orderBy('MAX(p.created_on)', 'DESC');
        }, 'payment_list');

        queryBuilder.where('pc.payment_claim_id =:payment_claim_id', {
          payment_claim_id: paymentClaimDetails?.payment_claim_id,
        });

        const claimAndPaymentdetails = paymentClaimDetails?.payment_claim_id
          ? await queryBuilder.getRawOne()
          : null;
        this.logger.log('claimAndPaymentdetails: ' + " " + JSON.stringify(claimAndPaymentdetails));
        const payment_list =
          claimAndPaymentdetails && claimAndPaymentdetails.payment_list
            ? claimAndPaymentdetails.payment_list
            : null;

        let paidAmount = 0,
          outstandingAmount = 0;
        if (payment_list !== null && payment_list[0] !== null) {
          if (!xeroPaymentEntitycheck.pt_payment_id) {
            const existingPaymentIds = [
              ...new Set(
                payment_list
                  ?.map((e) => e?.payment_id)
                  .filter((id) => id != null),
              ),
            ];
            this.logger.log(JSON.stringify({ existingPaymentIds }));

            const mappedXeroPayments = await this.xeroPayments.find({
              where: {
                payment_id: Not(payment.paymentID),
                pt_payment_id: In(existingPaymentIds),
                status: Not('DELETED'),
              },
            });
            const mappedXeroPaymentIds =
              mappedXeroPayments && mappedXeroPayments?.length > 0
                ? new Set(mappedXeroPayments.map((item) => item?.pt_payment_id))
                : new Set([]);

            const updatedExistingPaymentIds = existingPaymentIds?.filter(
              (id) => !mappedXeroPaymentIds.has(id),
            );
            const filteredPayments =
              updatedExistingPaymentIds && updatedExistingPaymentIds?.length > 0
                ? payment_list?.filter(
                    (element) =>
                      updatedExistingPaymentIds.includes(element.payment_id) &&
                      Number(element.total_amount) ===
                        Number(xeroPaymentEntitycheck.payment_amount),
                  )
                : [];
            if (filteredPayments && filteredPayments?.length > 0) {
              if (filteredPayments.length == 1) {
                const subPayments = await this.subPaymentsRepo.find({
                  where: { payment_id: filteredPayments[0]?.payment_id },
                });

                let is_paid_confirmed,
                  is_received_confirmed,
                  is_retention_confirmed;
                await Promise.all(
                  subPayments.map(async (element) => {
                    if (
                      element.sub_payment_type === 'Payment' &&
                      element.is_paid_confirmed !== null &&
                      element.is_received_confirmed === null &&
                      element.is_retention_confirmed === null
                    ) {
                      is_paid_confirmed = true;
                    } else if (
                      element.sub_payment_type === 'Retention Out' &&
                      element.is_retention_confirmed !== null &&
                      element.is_paid_confirmed === null &&
                      element.is_received_confirmed === null
                    ) {
                      is_retention_confirmed = true;
                    } else if (
                      element.sub_payment_type === 'Payment' &&
                      element.is_received_confirmed !== null &&
                      element.is_paid_confirmed === null &&
                      element.is_retention_confirmed === null
                    ) {
                      is_received_confirmed = true;
                    }
                  }),
                );

                const editPayload: EditDetailsOfAPaymentInput = {
                  payment_id: filteredPayments[0].payment_id,
                  is_paid_confirmed,
                  is_received_confirmed,
                  is_retention_confirmed,
                  delete_paytrade_only: false,
                };
                this.logger.log(JSON.stringify({
                  filteredPayments: filteredPayments[0],
                  editPayload,
                }));
                const editPayment =
                  await this.paymentsService.editDetailsOfAPayment(
                    decoded,
                    editPayload,
                    decoded?.userId,
                  );
                this.logger.log(JSON.stringify({ editPayment }));

                await this.xeroPayments
                  .createQueryBuilder()
                  .update(XeroPayments)
                  .set({
                    pt_payment_id: filteredPayments[0].payment_id,
                    mapped_status: 'System',
                    updated_on: moment.tz('UTC'),
                    updated_group: 'SYSTEM',
                  })
                  .where(
                    'payment_id = :payment_id AND integration_id = :integration_id',
                    {
                      payment_id: xeroPaymentEntitycheck.payment_id,
                      integration_id: xeroDetails.integration_id,
                    },
                  )
                  .execute();
              } else {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                    claim_id: paymentClaimDetails?.payment_claim_id,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 464 : 465,
                  dynamic_values: { id: paymentClaimDetails?.id },
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroPaymentEntitycheck?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroPaymentEntitycheck?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Multiple paytrade payments found with same amount`,
                  xero_records: [
                    {
                      ...invoice,
                      ...(filteredPayments && filteredPayments?.length > 0
                        ? { filteredPayments }
                        : {}),
                    },
                  ],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            }
          }
          isPreviousPaymentExist = true;
          if (
            ['Part', 'Pay Less - Part'].includes(payment_list[0].payment_type)
          ) {
            isPreviousPartPaymentExist = true;
            payment_list.forEach((element) => {
              paidAmount += element.total_amount;
            });
            outstandingAmount =
              payment_list[0].payment_type == 'Part'
                ? claimAndPaymentdetails.claim_amount - paidAmount
                : payment_list[0].payless_amount - paidAmount;
          }
        }

        const invoiceAmount = Number(invoice.total || 0);
        let underPayments = invoice?.overpayments || [];
        let underPaymentAmount = invoice?.overpayments?.reduce((sum, item) => {
          return (
            sum +
            (item?.appliedAmount === null ? 0.0 : Number(item?.appliedAmount))
          );
        }, 0.0);

        // Sum allocation amounts across every credit note attached to this invoice.
        // Previously only the first credit note's first allocation was used, so an
        // invoice paid down by 2+ credit notes was mis-classified as Part/Full
        // instead of one of the Pay Less variants. We now cope with any number
        // of credit notes and any number of allocations per credit note, only
        // counting allocations that target the current invoice.
        const creditNotesForClassification = Array.isArray(creditNotes)
          ? creditNotes
          : [];
        let contributingCreditNoteCount = 0;
        const creditNoteAmount = creditNotesForClassification.reduce(
          (sum, cn) => {
            if (!cn || !Array.isArray(cn.allocations)) {
              return sum;
            }
            const cnTotal = cn.allocations.reduce((aSum, alloc) => {
              // Only sum allocations that explicitly target THIS invoice.
              // If the allocation has no invoice linkage we skip it rather
              // than over-counting unrelated credit-note usage.
              if (alloc?.invoice?.invoiceID !== invoice?.invoiceID) {
                return aSum;
              }
              const amt =
                alloc?.amount === null || alloc?.amount === undefined
                  ? 0
                  : Number(alloc.amount);
              return aSum + (Number.isFinite(amt) ? amt : 0);
            }, 0);
            if (cnTotal > 0) {
              contributingCreditNoteCount += 1;
            }
            return sum + cnTotal;
          },
          0,
        );
        const summedCreditNoteCount = creditNotesForClassification.length;

        this.logger.log(JSON.stringify({ underPayments, underPaymentAmount, creditNoteAmount, summedCreditNoteCount, contributingCreditNoteCount }));

        if (invoiceAmount == creditNoteAmount) {
          paymentType = 'Pay - Zero';
        } else if (
          invoice?.payments[0]?.amount > 0 &&
          (!creditNoteAmount || creditNoteAmount === 0)
        ) {
          paymentType =
            invoice?.payments[0]?.amount + underPaymentAmount === invoiceAmount
              ? 'Full'
              : 'Part';
        } else {
          paymentType =
            invoice?.payments[0]?.amount > 0 &&
            invoice?.payments[0]?.amount +
              underPaymentAmount +
              creditNoteAmount ===
              invoiceAmount
              ? 'Pay Less - Full'
              : 'Pay Less - Part';
        }

        this.logger.log(JSON.stringify({
          isPreviousPaymentExist,
          isPreviousPartPaymentExist,
          underPaymentAmount,
          paymentType,
        }));

        if (isPreviousPaymentExist) {
          if (
            ['Part', 'Pay Less - Part'].includes(
              payment_list[0].payment_type,
            ) &&
            ['Full', 'Pay Less - Full']?.includes(paymentType)
          ) {
            for (const element of payment_list) {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: element.payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '13',
                  );

                this.logger.log('13:::' + " " + JSON.stringify({ deletePaymentResponse }));

                await this.xeroPayments.update(
                  {
                    pt_payment_id: element?.payment_id,
                  },
                  {
                    status: String(Payment.StatusEnum.DELETED),
                  },
                );

                const existingPaytradePayment =
                  await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                  });

                const existingXeroPayment = await this.xeroPayments.findOne({
                  where: {
                    pt_payment_id: element.payment_id,
                    invoice_id: xeroInvoice?.id,
                  },
                });

                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: existingXeroPayment?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: existingXeroPayment?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    retention_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (
                        ['Payment', 'Retention Out'].includes(
                          element.sub_payment_type,
                        )
                      ) {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      } else if (element.sub_payment_type === 'Retention In') {
                        retention_account = paytradePayment?.retention_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: retention_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            ) &&
                            (element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true ||
                              element.is_retention_confirmed === true),
                        )
                      : [];

                  const existingXeroPayment = await this.xeroPayments.findOne({
                    where: {
                      pt_payment_id: element.payment_id,
                    },
                  });

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: element.pt_payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id:
                      //   existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: element?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: element?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        retention_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          } else if (
            ['Part', 'Pay Less - Part'].includes(
              payment_list[0].payment_type,
            ) &&
            ['Part', 'Pay Less - Part']?.includes(paymentType) &&
            underPaymentAmount
          ) {
            const associatedUnderPaymentsInXero = await this.xeroPayments.find({
              where: {
                invoice_id: xeroInvoice?.id,
                status: Not('DELETED'),
                is_under_payment: true,
                pt_payment_id: Not(IsNull()),
              },
              order: { created_on: 'DESC' },
            });

            this.logger.log(JSON.stringify({ associatedUnderPaymentsInXero }));

            if (
              associatedUnderPaymentsInXero &&
              associatedUnderPaymentsInXero?.length > 0
            ) {
              const underpaymentIds = [
                ...new Set(
                  associatedUnderPaymentsInXero
                    ?.map((e) => e?.overpayment_id)
                    .filter((id) => id != null),
                ),
              ];
              underPayments = invoice?.overpayments?.filter(
                (element) => !underpaymentIds.includes(element?.overpaymentID),
              );
              underPaymentAmount = underPayments?.reduce((sum, item) => {
                return (
                  sum +
                  (item?.appliedAmount === null
                    ? 0.0
                    : Number(item?.appliedAmount))
                );
              }, 0.0);
            }
          }
        }

        const xeroPaymentEntity = await this.xeroPayments.findOne({
          where: { payment_id: payment.paymentID, status: Not('DELETED') },
        });

        this.logger.log('xeroPaymentEntity: ' + " " + JSON.stringify(xeroPaymentEntity));
        if (xeroPaymentEntity) {
          if (!xeroPaymentEntity?.pt_payment_id) {
            if (paymentDetails?.status === Payment.StatusEnum.AUTHORISED) {
              if (
                ['Add payment', 'Overdue', 'Reconcile'].includes(
                  paymentClaimDetails.list_status,
                )
              ) {
                if (
                  cash_retention_type === 'Claim' &&
                  invoice.type === Invoice.TypeEnum.ACCPAY &&
                  paymentType &&
                  paymentType !== 'Full'
                ) {
                  const subscriptionDetails =
                    await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
                      company_id,
                    );
                  const noticesItem = subscriptionDetails?.plan_items.find(
                    (item) => item?.item_name === 'Notices',
                  );
                  const planValue = noticesItem?.limit_value
                    ? noticesItem.limit_value
                    : '';
                  if (planValue || subscriptionDetails?.is_free_plan_eligible) {
                    if (
                      planValue == 'Manual' &&
                      !subscriptionDetails?.is_free_plan_eligible
                    ) {
                      if (
                        !data?.compulsory_attachment_ids ||
                        data?.compulsory_attachment_ids?.length == 0
                      ) {
                        await this.xeroService.insertXeroSyncLogs(decoded, {
                          id: data?.sync_id || null,
                          api_name: 'createClaimInPaytrade',
                          api_payload: {
                            sync_run_type,
                            invoice_id: invoice?.invoiceID,
                            tenant_id,
                            type:
                              invoice?.type === Invoice.TypeEnum.ACCPAY
                                ? 'bill'
                                : 'invoice',
                          },
                          integration_id: xeroDetails.integration_id,
                          log_template_id:
                            sync_run_type === 'webhook' ? 363 : 460,
                          dynamic_values: {},
                          project_id: xeroProjectDetails?.id,
                          contract_id: xeroContractDetails?.id,
                          reference: {
                            xeroId: xeroPaymentEntity?.id,
                            paytradeId: null,
                          },
                          reference_id: xeroPaymentEntity?.id,
                          history: [
                            `API triggered from invoice ${sync_run_type}`,
                            'Import failed',
                          ],
                          important_checks: {
                            'Import data format validation': 'Failed',
                            'Import tracking id validation': 'Ok',
                            'Import account type validation': 'Ok',
                            'Import tax type validation': 'Ok',
                            'Client/Supplier mapping validation': 'Ok',
                            'Contract mapping validation': 'Ok',
                            'Project mapping validation': 'Ok',
                          },
                          error_message: `Missing supporting statement attachments`,
                          xero_records: [invoice],
                          paytrade_records: [],
                          new_records: null,
                          updated_records: null,
                          synced_records: null,
                        });
                        return false;
                      }
                    } else {
                      if (!data?.withhold_payment_reason) {
                        this.logger.log(JSON.stringify({
                          outstandingAmount,
                          amount: Number(
                            paymentDetails.amount + underPaymentAmount,
                          ),
                          paymentType,
                        }));
                        if (
                          ['Full', 'Pay Less - Full', 'Pay - Zero'].includes(
                            paymentType,
                          ) ||
                          (outstandingAmount !==
                            Number(
                              paymentDetails.amount +
                                underPaymentAmount +
                                (!isPreviousPartPaymentExist
                                  ? retentionAmount || 0
                                  : 0),
                            ) &&
                            ['Part', 'Pay Less - Part'].includes(paymentType))
                        ) {
                          const checkExistenceInSync =
                            await this.xeroSyncLogs.findOne({
                              where: {
                                log_template_id:
                                  sync_run_type === 'webhook' ? 371 : 461,
                                reference_id: xeroPaymentEntity?.id,
                              },
                            });

                          if (!checkExistenceInSync) {
                            await this.xeroService.insertXeroSyncLogs(decoded, {
                              id: data?.sync_id || null,
                              api_name: 'createClaimInPaytrade',
                              api_payload: {
                                sync_run_type,
                                invoice_id: invoice?.invoiceID,
                                tenant_id,
                                type:
                                  invoice?.type === Invoice.TypeEnum.ACCPAY
                                    ? 'bill'
                                    : 'invoice',
                              },
                              integration_id: xeroDetails.integration_id,
                              log_template_id:
                                sync_run_type === 'webhook' ? 371 : 461,
                              dynamic_values: {},
                              project_id: xeroProjectDetails?.id,
                              contract_id: xeroContractDetails?.id,
                              reference: {
                                xeroId: xeroPaymentEntity?.id,
                                paytradeId: null,
                              },
                              reference_id: xeroPaymentEntity?.id,
                              history: [
                                `API triggered from invoice ${sync_run_type}`,
                                'Import failed',
                              ],
                              important_checks: {
                                'Import data format validation': 'Failed',
                                'Import tracking id validation': 'Ok',
                                'Import account type validation': 'Ok',
                                'Import tax type validation': 'Ok',
                                'Client/Supplier mapping validation': 'Ok',
                                'Contract mapping validation': 'Ok',
                                'Project mapping validation': 'Ok',
                              },
                              error_message: `Missing reason for withholding payment`,
                              xero_records: [invoice],
                              paytrade_records: [],
                              new_records: null,
                              updated_records: null,
                              synced_records: null,
                            });
                          }
                          return false;
                        }
                      }
                    }
                  }
                }

                // ── Retention release date guard ──────────────────────────────
                // When this Xero payment carries cash retention, PayTrade must
                // record a retention release date. We default it to the
                // contract's defect_liability_end_date — if that is missing on
                // the contract we cannot sync the payment, so emit a sync log
                // error asking the user to set it on the contract and resync.
                if (
                  cashRetention &&
                  !isPreviousPartPaymentExist &&
                  !contractDetails?.defect_liability_end_date
                ) {
                  const checkExistenceInSync =
                    await this.xeroSyncLogs.findOne({
                      where: {
                        log_template_id: 487,
                        reference_id: xeroPaymentEntity?.id,
                      },
                    });

                  if (!checkExistenceInSync) {
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: 487,
                      dynamic_values: {
                        contract_name:
                          contractDetails?.contract_name || '',
                        contract_id:
                          contractDetails?.contract_id || '',
                      },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: xeroPaymentEntity?.id,
                        paytradeId: null,
                      },
                      reference_id: xeroPaymentEntity?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message:
                        'Defect liability end date is missing on the contract — required as the retention release date for this payment. Please add it to the contract and re-sync.',
                      xero_records: [invoice],
                      paytrade_records: [],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                  }
                  return false;
                }

                const paytradePayload: AddPaymentInput = {
                  company_id,
                  payment_claim_id: paymentClaimDetails?.payment_claim_id,
                  project_id: xeroProjectDetails?.pt_project_id,
                  contract_id: xeroContractDetails?.pt_contract_id,
                  client_supplier_id: xeroContactDetails.pt_contact_id,
                  payment_type: paymentType,
                  cash_retention:
                    cashRetention && !isPreviousPartPaymentExist ? true : false,
                  payment_from_account:
                    invoice.type === Invoice.TypeEnum.ACCPAY
                      ? cash_retention_type === 'Claim'
                        ? xeroBankAccountDetails?.pt_bank_account_id
                        : xeroBankAccountDetails?.pt_bank_account_id
                      : null,
                  payment_to_account:
                    invoice.type === Invoice.TypeEnum.ACCREC
                      ? cash_retention_type === 'Claim'
                        ? xeroBankAccountDetails?.pt_bank_account_id
                        : xeroBankAccountDetails?.pt_bank_account_id
                      : contractDetails?.payment_to_account,
                  retention_account:
                    cash_retention_type === 'Claim'
                      ? retentionAccountDetails?.pt_bank_account_id
                      : null,
                  previous_status: null,
                  current_status: 'Draft',
                  payless_amount:
                    paymentType !== 'Pay - Zero' && creditNoteAmount
                      ? Number(paymentClaimDetails.claim_amount) -
                        creditNoteAmount
                      : null,
                  payment_amount:
                    paymentType === 'Pay - Zero'
                      ? creditNoteAmount
                      : paymentDetails.amount + underPaymentAmount,
                  retention_amount:
                    cashRetention && !isPreviousPartPaymentExist
                      ? retentionAmount || 0
                      : null,
                  total_amount:
                    paymentType === 'Pay - Zero'
                      ? creditNoteAmount
                      : paymentDetails.amount +
                        underPaymentAmount +
                        (cashRetention && !isPreviousPartPaymentExist
                          ? retentionAmount || 0
                          : 0),
                  payment_date: new Date(paymentDetails.date),
                  input_date: moment.tz('UTC').toDate(),
                  retention_release_date:
                    cashRetention && !isPreviousPartPaymentExist
                      ? contractDetails?.defect_liability_end_date
                      : null,
                  // memo: '',
                  retention_id:
                    cash_retention_type === 'Claim'
                      ? data?.retention_id || null
                      : paymentClaimDetails?.retention_id,
                  third_party_payment_reason: '',
                  // Task #50 — ACCREC parity. The legacy code only
                  // auto-confirmed retention on ACCPAY (bills). With the
                  // outbound gate split, ACCREC (invoices) can also push
                  // a BankTransfer leg, so the inbound webhook must
                  // mirror that and auto-confirm retention regardless of
                  // invoice type.
                  is_retention_confirmed:
                    cash_retention_type === 'Claim' &&
                    cashRetention &&
                    !isPreviousPartPaymentExist
                      ? true
                      : null,
                  is_paid_confirmed:
                    invoice.type === Invoice.TypeEnum.ACCPAY ? true : null,
                  is_received_confirmed:
                    invoice.type === Invoice.TypeEnum.ACCREC ? true : null,
                  compulsory_attachment_ids:
                    data?.compulsory_attachment_ids || [],
                  withhold_payment_reason: data?.withhold_payment_reason || '',
                  created_on: moment.tz('UTC'),
                  created_group: 'SYSTEM',
                };

                this.logger.log(`%%%%----------paytrade-pay----------------->>>>>> ${JSON.stringify(paytradePayload)}`);

                const newPayment = await this.paymentsService.addPayment(
                  decoded,
                  paytradePayload,
                  decoded?.userId,
                );
                this.logger.log('newPayment' + " " + JSON.stringify(newPayment));
                await this.xeroPayments
                  .createQueryBuilder()
                  .update()
                  .set({
                    pt_payment_id: newPayment?.data?.payment_id,
                    mapped_status: 'System',
                  })
                  .where('id = :id', { id: xeroPaymentEntity.id })
                  .execute();
                this.logger.log(
                  `[Xero Webhook] Synced to Paytrade: Payment ${newPayment?.data?.payment_id}`,
                );

                const paytradeDetails = await this.paymentDetails.findOne({
                  where: { payment_id: newPayment?.data?.payment_id },
                });

                if (underPayments && underPayments?.length > 0) {
                  for (const element of underPayments) {
                    const underPayment =
                      await this.checkAndCreateOverPaymentAndRefunds(
                        {
                          tenant_id: xeroDetails?.tenant_id,
                          contact_id: xeroContactDetails?.contact_id,
                          overpayment_id: element?.overpaymentID,
                          sync_id: data?.sync_id || null,
                          project_id: xeroProjectDetails?.pt_project_id,
                          payment_claim_id:
                            paymentClaimDetails?.payment_claim_id,
                          associated_payment_id: newPayment?.data?.payment_id,
                          associated_overpayment_id: null,
                          is_under_payment: true,
                          under_payment_amount: element?.appliedAmount,
                          sync_run_type,
                        },
                        decoded,
                      );

                    this.logger.log('underPayment check in payment:: ' + " " + JSON.stringify({
                      underPayment,
                    }));
                    if (!underPayment) {
                      return false;
                    }
                  }
                }

                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroPaymentEntity?.id,
                      paytradeId: paytradeDetails?.id,
                    },
                    reference_id: xeroPaymentEntity?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      ...(contributingCreditNoteCount > 1
                        ? [
                            `Classification ${paymentType} driven by ${contributingCreditNoteCount} credit notes (summed allocation total ${creditNoteAmount})`,
                          ]
                        : []),
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [paytradeDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } else if (
                ['Confirm payment', 'Confirm receipt'].includes(
                  paymentClaimDetails.list_status,
                )
              ) {
                this.logger.log(
                  `Payment cannot be created/updated in paytrade since claim is in ${paymentClaimDetails.list_status}`,
                );
                const outstandingPayments = await this.paymentDetails.findOne({
                  where: {
                    payment_claim_id: paymentClaimDetails.payment_claim_id,
                    payment_type: Not(
                      In([
                        'Overpayment from client',
                        'Underpayment from client',
                        'Overpayment to supplier',
                        'Underpayment to supplier',
                      ]),
                    ),
                  },
                  relations: ['subPayments'],
                  order: { created_on: 'DESC' },
                });

                const unmatchedPayments =
                  outstandingPayments &&
                  outstandingPayments?.subPayments &&
                  outstandingPayments?.subPayments?.length > 0
                    ? outstandingPayments?.subPayments?.filter(
                        (element) => element.status === 'Unmatched',
                      )
                    : [];

                this.logger.log(JSON.stringify({ unmatchedPayments }));
                let payment_account = null,
                  retention_account = null;
                if (unmatchedPayments && unmatchedPayments?.length > 0) {
                  for (const element of unmatchedPayments) {
                    if (
                      ['Payment', 'Retention Out'].includes(
                        element.sub_payment_type,
                      )
                    ) {
                      payment_account =
                        paymentClaimDetails?.claim_type == 'Billable'
                          ? outstandingPayments?.payment_from_account
                          : outstandingPayments?.payment_to_account;
                    } else if (element.sub_payment_type === 'Retention In') {
                      retention_account =
                        outstandingPayments?.retention_account;
                    }
                  }
                }

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 345 : 448,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Payment(${paymentDetails?.status}) cannot be created/updated in paytrade since claim is in ${paymentClaimDetails.list_status}`,
                  xero_records: [
                    { ...invoice, payment_account, retention_account },
                  ],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              } else {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id || null,
                  api_name: 'createClaimInPaytrade',
                  api_payload: {
                    sync_run_type,
                    invoice_id: invoice?.invoiceID,
                    tenant_id,
                    type:
                      invoice?.type === Invoice.TypeEnum.ACCPAY
                        ? 'bill'
                        : 'invoice',
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 345 : 448,
                  dynamic_values: {},
                  project_id: xeroProjectDetails?.id,
                  contract_id: xeroContractDetails?.id,
                  reference: {
                    xeroId: xeroInvoice?.id,
                    paytradeId: null,
                  },
                  reference_id: xeroInvoice?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Failed',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: `Payment(${paymentDetails?.status}) cannot be created/updated in paytrade since claim is in ${paymentClaimDetails.list_status}`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            }
          } else {
            const existingPaymentStatusCheck =
              await this.paymentDetails.findOne({
                where: { payment_id: xeroPaymentEntity.pt_payment_id },
              });
            if (
              existingPaymentStatusCheck &&
              existingPaymentStatusCheck?.current_status !== 'Deleted' &&
              paymentDetails?.status === Payment.StatusEnum.DELETED
            ) {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: xeroPaymentEntity.pt_payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '14',
                  );

                this.logger.log('14:::' + " " + JSON.stringify({ deletePaymentResponse }));

                const existingPaytradePayment =
                  await this.paymentDetails.findOne({
                    where: {
                      payment_id: xeroPaymentEntity.pt_payment_id,
                    },
                  });
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroPaymentEntity?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: xeroPaymentEntity?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: xeroPaymentEntity.pt_payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    retention_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (
                        ['Payment', 'Retention Out'].includes(
                          element.sub_payment_type,
                        )
                      ) {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      } else if (element.sub_payment_type === 'Retention In') {
                        retention_account = paytradePayment?.retention_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: retention_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            ) &&
                            (element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true ||
                              element.is_retention_confirmed === true),
                        )
                      : [];

                  const existingXeroPayment = await this.xeroPayments.findOne({
                    where: {
                      pt_payment_id: xeroPaymentEntity.pt_payment_id,
                    },
                  });

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: xeroPaymentEntity.pt_payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id: existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: xeroPaymentEntity?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: xeroPaymentEntity?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        retention_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
        } else {
          const deletedPayments = await this.xeroPayments.find({
            where: {
              payment_id: payment.paymentID,
              pt_payment_id: Not(IsNull()),
              status: 'DELETED',
            },
          });
          if (deletedPayments && deletedPayments?.length > 0) {
            const deletedPaymentIds = [
              ...new Set(
                deletedPayments
                  ?.map((e) => e?.pt_payment_id)
                  .filter((id) => id != null),
              ),
            ];
            this.logger.log(JSON.stringify({ deletedPaymentIds }));

            const toBeDeletedPayments = await this.paymentDetails.find({
              where: {
                payment_id: In(deletedPaymentIds),
                current_status: Not('Deleted'),
              },
            });
            if (toBeDeletedPayments && toBeDeletedPayments?.length > 0) {
              for (const element of toBeDeletedPayments) {
                try {
                  const paytradePayload: ChangeStatusOfAPaymentInput = {
                    payment_id: element.payment_id,
                    status: 'Deleted',
                    input_date: null,
                  };
                  this.logger.log(JSON.stringify({ paytradePayload }));
                  const deletePaymentResponse =
                    await this.safeWebhookDeletePayment(
                      decoded,
                      paytradePayload,
                      '17',
                    );

                  this.logger.log('17:::' + " " + JSON.stringify({ deletePaymentResponse }));

                  const existingPaytradePayment =
                    await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.payment_id,
                      },
                    });

                  const existingXeroPayment = await this.xeroPayments.findOne({
                    where: {
                      pt_payment_id: element.payment_id,
                    },
                  });

                  const addSyncLogResponse =
                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: existingXeroPayment?.id,
                        paytradeId: existingPaytradePayment?.id,
                      },
                      reference_id: existingXeroPayment?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import successful',
                      ],
                      important_checks: {
                        'Import data format validation': 'Ok',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: null,
                      xero_records: [invoice],
                      paytrade_records: [existingPaytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                } catch (error) {
                  const errMsg = error?.message ? error?.message : error;
                  if (errMsg == `The confirmed payment cannot be deleted.`) {
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: {
                        payment_id: element.payment_id,
                      },
                      relations: ['subPayments'],
                      order: { created_on: 'DESC' },
                    });

                    const existingXeroPayment = await this.xeroPayments.findOne(
                      {
                        where: {
                          pt_payment_id: element.payment_id,
                        },
                      },
                    );

                    const matchedPayments =
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) => element.status === 'Matched',
                          )
                        : [];

                    this.logger.log(JSON.stringify({ matchedPayments }));
                    let payment_account = null,
                      retention_account = null,
                      unmatchTransactions = [];
                    if (matchedPayments && matchedPayments?.length > 0) {
                      for (const element of matchedPayments) {
                        if (
                          ['Payment', 'Retention Out'].includes(
                            element.sub_payment_type,
                          )
                        ) {
                          payment_account =
                            paymentClaimDetails?.claim_type == 'Billable'
                              ? paytradePayment?.payment_from_account
                              : paytradePayment?.payment_to_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: payment_account,
                          });
                        } else if (
                          element.sub_payment_type === 'Retention In'
                        ) {
                          retention_account =
                            paytradePayment?.retention_account;
                          unmatchTransactions.push({
                            ...element,
                            account_id: retention_account,
                          });
                        }
                      }
                    }

                    const checkedPayments =
                      (!unmatchTransactions ||
                        unmatchTransactions?.length === 0) &&
                      paytradePayment &&
                      paytradePayment?.subPayments &&
                      paytradePayment?.subPayments?.length > 0
                        ? paytradePayment?.subPayments?.filter(
                            (element) =>
                              ['Payment', 'Retention Out'].includes(
                                element.sub_payment_type,
                              ) &&
                              (element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true ||
                                element.is_retention_confirmed === true),
                          )
                        : [];

                    await this.xeroService.insertXeroSyncLogs(decoded, {
                      id: data?.sync_id || null,
                      api_name: 'createClaimInPaytrade',
                      api_payload: {
                        sync_run_type,
                        invoice_id: invoice?.invoiceID,
                        tenant_id,
                        type:
                          invoice?.type === Invoice.TypeEnum.ACCPAY
                            ? 'bill'
                            : 'invoice',
                        payment_id: existingXeroPayment.pt_payment_id,
                        payment_type: paytradePayment?.payment_type,
                        claim_id: paytradePayment?.payment_claim_id,
                        // unmapping_payment_id: existingXeroPayment?.payment_id,
                        delete_paytrade_only: true,
                      },
                      integration_id: xeroDetails.integration_id,
                      log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                      dynamic_values: { id: paymentClaimDetails?.id },
                      project_id: xeroProjectDetails?.id,
                      contract_id: xeroContractDetails?.id,
                      reference: {
                        xeroId: existingXeroPayment?.id,
                        paytradeId: paytradePayment?.id,
                      },
                      reference_id: existingXeroPayment?.id,
                      history: [
                        `API triggered from invoice ${sync_run_type}`,
                        'Import failed',
                      ],
                      important_checks: {
                        'Import data format validation': 'Failed',
                        'Import tracking id validation': 'Ok',
                        'Import account type validation': 'Ok',
                        'Import tax type validation': 'Ok',
                        'Client/Supplier mapping validation': 'Ok',
                        'Contract mapping validation': 'Ok',
                        'Project mapping validation': 'Ok',
                      },
                      error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                      xero_records: [
                        {
                          ...invoice,
                          payment_account,
                          retention_account,
                          ...(unmatchTransactions &&
                          unmatchTransactions?.length > 0
                            ? { unmatchTransactions }
                            : {}),
                          ...(!unmatchTransactions ||
                          unmatchTransactions?.length === 0
                            ? { checkedPayments }
                            : {}),
                        },
                      ],
                      paytrade_records: [paytradePayment],
                      new_records: null,
                      updated_records: null,
                      synced_records: null,
                    });
                    return false;
                  }
                }
              }
            }
          }
        }
        return true;
      } else {
        const deletedPayments = await this.xeroPayments.find({
          where: {
            payment_id: payment.paymentID,
            pt_payment_id: Not(IsNull()),
            status: 'DELETED',
          },
        });
        if (deletedPayments && deletedPayments?.length > 0) {
          const deletedPaymentIds = [
            ...new Set(
              deletedPayments
                ?.map((e) => e?.pt_payment_id)
                .filter((id) => id != null),
            ),
          ];
          this.logger.log(JSON.stringify({ deletedPaymentIds }));

          const toBeDeletedPayments = await this.paymentDetails.find({
            where: {
              payment_id: In(deletedPaymentIds),
              current_status: Not('Deleted'),
            },
          });
          if (toBeDeletedPayments && toBeDeletedPayments?.length > 0) {
            for (const element of toBeDeletedPayments) {
              try {
                const paytradePayload: ChangeStatusOfAPaymentInput = {
                  payment_id: element.payment_id,
                  status: 'Deleted',
                  input_date: null,
                };
                this.logger.log(JSON.stringify({ paytradePayload }));
                const deletePaymentResponse =
                  await this.safeWebhookDeletePayment(
                    decoded,
                    paytradePayload,
                    '18',
                  );

                this.logger.log('18:::' + " " + JSON.stringify({ deletePaymentResponse }));

                const existingPaytradePayment =
                  await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                  });

                const existingXeroPayment = await this.xeroPayments.findOne({
                  where: {
                    pt_payment_id: element.payment_id,
                  },
                });

                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: existingXeroPayment?.id,
                      paytradeId: existingPaytradePayment?.id,
                    },
                    reference_id: existingXeroPayment?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import successful',
                    ],
                    important_checks: {
                      'Import data format validation': 'Ok',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: null,
                    xero_records: [invoice],
                    paytrade_records: [existingPaytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              } catch (error) {
                const errMsg = error?.message ? error?.message : error;
                if (errMsg == `The confirmed payment cannot be deleted.`) {
                  const paytradePayment = await this.paymentDetails.findOne({
                    where: {
                      payment_id: element.payment_id,
                    },
                    relations: ['subPayments'],
                    order: { created_on: 'DESC' },
                  });

                  const existingXeroPayment = await this.xeroPayments.findOne({
                    where: {
                      pt_payment_id: element.payment_id,
                    },
                  });

                  const matchedPayments =
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) => element.status === 'Matched',
                        )
                      : [];

                  this.logger.log(JSON.stringify({ matchedPayments }));
                  let payment_account = null,
                    retention_account = null,
                    unmatchTransactions = [];
                  if (matchedPayments && matchedPayments?.length > 0) {
                    for (const element of matchedPayments) {
                      if (
                        ['Payment', 'Retention Out'].includes(
                          element.sub_payment_type,
                        )
                      ) {
                        payment_account =
                          paymentClaimDetails?.claim_type == 'Billable'
                            ? paytradePayment?.payment_from_account
                            : paytradePayment?.payment_to_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: payment_account,
                        });
                      } else if (element.sub_payment_type === 'Retention In') {
                        retention_account = paytradePayment?.retention_account;
                        unmatchTransactions.push({
                          ...element,
                          account_id: retention_account,
                        });
                      }
                    }
                  }

                  const checkedPayments =
                    (!unmatchTransactions ||
                      unmatchTransactions?.length === 0) &&
                    paytradePayment &&
                    paytradePayment?.subPayments &&
                    paytradePayment?.subPayments?.length > 0
                      ? paytradePayment?.subPayments?.filter(
                          (element) =>
                            ['Payment', 'Retention Out'].includes(
                              element.sub_payment_type,
                            ) &&
                            (element.is_paid_confirmed === true ||
                              element.is_received_confirmed === true ||
                              element.is_retention_confirmed === true),
                        )
                      : [];

                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    id: data?.sync_id || null,
                    api_name: 'createClaimInPaytrade',
                    api_payload: {
                      sync_run_type,
                      invoice_id: invoice?.invoiceID,
                      tenant_id,
                      type:
                        invoice?.type === Invoice.TypeEnum.ACCPAY
                          ? 'bill'
                          : 'invoice',
                      payment_id: existingXeroPayment.pt_payment_id,
                      payment_type: paytradePayment?.payment_type,
                      claim_id: paytradePayment?.payment_claim_id,
                      // unmapping_payment_id: existingXeroPayment?.payment_id,
                      delete_paytrade_only: true,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: sync_run_type === 'webhook' ? 378 : 462,
                    dynamic_values: { id: paymentClaimDetails?.id },
                    project_id: xeroProjectDetails?.id,
                    contract_id: xeroContractDetails?.id,
                    reference: {
                      xeroId: existingXeroPayment?.id,
                      paytradeId: paytradePayment?.id,
                    },
                    reference_id: existingXeroPayment?.id,
                    history: [
                      `API triggered from invoice ${sync_run_type}`,
                      'Import failed',
                    ],
                    important_checks: {
                      'Import data format validation': 'Failed',
                      'Import tracking id validation': 'Ok',
                      'Import account type validation': 'Ok',
                      'Import tax type validation': 'Ok',
                      'Client/Supplier mapping validation': 'Ok',
                      'Contract mapping validation': 'Ok',
                      'Project mapping validation': 'Ok',
                    },
                    error_message: `${paytradePayment?.payment_type} payment in paytrade cannot be deleted`,
                    xero_records: [
                      {
                        ...invoice,
                        payment_account,
                        retention_account,
                        ...(unmatchTransactions &&
                        unmatchTransactions?.length > 0
                          ? { unmatchTransactions }
                          : {}),
                        ...(!unmatchTransactions ||
                        unmatchTransactions?.length === 0
                          ? { checkedPayments }
                          : {}),
                      },
                    ],
                    paytrade_records: [paytradePayment],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                  return false;
                }
              }
            }
          }
        }
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  private hasValidTracking(invoice: any): boolean {
    return invoice?.lineItems?.some((li) => li.tracking?.length);
  }

  private isInvoiceFormatValid(invoice: any): boolean {
    return invoice?.lineItems?.every(
      (li) => li?.description && li?.unitAmount && li?.quantity,
    );
  }

  private isAccountCodeValid(
    invoice: any,
    xeroDetails: XeroIntegrationDetails,
  ): boolean {
    // Task #41 — variable bill code mode: the supplier's bill_code may be
    // ANY active expense account, so we cannot enforce the strict
    // company-level allow-list. Lines must still all carry an
    // accountCode (truthy), and at least one line on the bill side must
    // be a non-retention/liability code (the prospective bill_code).
    if (
      xeroDetails?.bill_code_is_variable &&
      invoice?.type === Invoice.TypeEnum.ACCPAY
    ) {
      const restricted = new Set(
        [
          xeroDetails.retention_payable_retained_code,
          xeroDetails.liability_payable_code,
          xeroDetails.retention_payable_release_code,
        ].filter(Boolean),
      );
      const hasBaseLine = invoice?.lineItems?.some(
        (li: any) => li?.accountCode && !restricted.has(li.accountCode),
      );
      const allHaveCode = invoice?.lineItems?.every((li: any) => !!li?.accountCode);
      return !!(hasBaseLine && allHaveCode);
    }
    const requiredCodes =
      invoice.type === Invoice.TypeEnum.ACCPAY
        ? [
            xeroDetails.bill_code,
            xeroDetails.retention_payable_retained_code,
            xeroDetails.liability_payable_code,
            xeroDetails.retention_payable_release_code,
          ]
        : [
            xeroDetails.invoice_code,
            xeroDetails.retention_receivable_retained_code,
            xeroDetails.liability_receivable_code,
            xeroDetails.retention_receivable_release_code,
          ];
    return invoice?.lineItems?.every((item) =>
      requiredCodes.includes(item.accountCode),
    );
  }

  async checkAndCreateOverPaymentAndRefunds(
    overpaymentPayload: any,
    decoded?: any,
  ) {
    try {
      const {
        tenant_id,
        contact_id,
        overpayment_id,
        sync_id,
        project_id,
        payment_claim_id,
        associated_payment_id,
        associated_overpayment_id,
        is_under_payment,
        under_payment_amount,
        sync_run_type,
      } = overpaymentPayload;
      // Multi-row tenant guard: prefer the Active integration row.
      const _candidatesOver = await this.xeroIntegrationDetails.find({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      const xeroDetails =
        _candidatesOver.find(
          (c) =>
            c?.integrationDetails?.integration_status === 'Connected - active',
        ) ?? _candidatesOver[0];

      await this.xeroService.refreshTokenSet(
        xeroDetails?.company_id,
        this.xero,
      );

      const ifModifiedSince: Date = !overpayment_id
        ? new Date(Date.now() - 5 * 60 * 1000)
        : null;
      const where = `Contact.ContactID == Guid("${contact_id}") AND Status != "${Overpayment.StatusEnum.VOIDED}"`;
      const order = 'Date ASC';

      const overPaymentDetails = await this.xero.accountingApi.getOverpayments(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
      );
      const overpayments = overPaymentDetails?.body?.overpayments || [];
      // this.logger.log(JSON.stringify({ overpayments }));

      if (overpayments && overpayments?.length > 0) {
        if (!overpayment_id) {
          for (const element of overpayments) {
            this.logger.log(JSON.stringify({ overpayment_element: element }));
            await this.createOverPaymentAndRefunds(
              {
                xeroDetails,
                overpayment: element,
                contact_id,
                sync_run_type,
              },
              decoded,
            );
          }
        } else {
          const overpayment = overpayments?.filter(
            (payment) => payment?.overpaymentID == overpayment_id,
          );
          this.logger.log(JSON.stringify({ overpayment }));
          await this.createOverPaymentAndRefunds(
            {
              xeroDetails,
              overpayment: overpayment[0],
              contact_id,
              sync_id,
              project_id,
              payment_claim_id,
              associated_payment_id,
              associated_overpayment_id,
              is_under_payment,
              under_payment_amount,
              sync_run_type,
            },
            decoded,
          );
          return overpayment;
        }
      }
      return true;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async createOverPaymentAndRefunds(overpaymentPayload: any, decoded?: any) {
    try {
      const {
        xeroDetails,
        overpayment,
        contact_id,
        sync_id,
        project_id,
        payment_claim_id,
        associated_payment_id,
        associated_overpayment_id,
        is_under_payment,
        under_payment_amount,
        sync_run_type,
      } = overpaymentPayload;
      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          contact_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      // Fail-fast: only fully mapped Xero contacts should sync. An orphan
      // xero_contact_details row (auto-discovered Xero contact with no PT
      // mapping yet) would otherwise cause a null deref on pt_contact_id
      // below and surface a misleading runtime error to the user.
      if (!xeroContactDetails || !xeroContactDetails.pt_contact_id) {
        this.logger.error(
          `[createOverPaymentAndRefunds] Contact ${contact_id} ${
            xeroContactDetails ? 'has no pt_contact_id mapping' : 'not found in xero_contact_details'
          } on integration ${xeroDetails?.integration_id}. Aborting overpayment/refund sync — write template ${sync_run_type === 'webhook' ? 265 : 425}.`,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'checkAndCreateOverPaymentAndRefunds',
          api_payload: {
            sync_run_type,
            contact_id,
            tenant_id: xeroDetails.tenant_id,
            overpayment_id: overpayment?.overpaymentID,
            is_under_payment,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 265 : 425,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: overpayment?.overpaymentID, paytradeId: null },
          reference_id: overpayment?.overpaymentID,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Contact details not mapped`,
          xero_records: [{ overpayment, xeroContactDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const clientSuppliersDetails = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: xeroContactDetails.pt_contact_id },
      });

      const getBankTransactions =
        await this.xero.accountingApi.getBankTransactions(
          xeroDetails.tenant_id,
          undefined,
          `Contact.ContactID == Guid("${contact_id}") AND overpaymentID == Guid("${overpayment.overpaymentID}")`,
        );
      const bankTransactions =
        getBankTransactions?.body?.bankTransactions || [];
      this.logger.log(JSON.stringify({ bankTransactions }));

      if (!bankTransactions || bankTransactions?.length === 0) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'checkAndCreateOverPaymentAndRefunds',
          api_payload: {
            sync_run_type,
            contact_id,
            tenant_id: xeroDetails.tenant_id,
            overpayment_id: overpayment.overpaymentID,
            is_under_payment: is_under_payment,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 346 : 449,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Over payment is not found in bank transaction`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const bankTransaction = bankTransactions[0];
      const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          account_id: bankTransaction.bankAccount.accountID,
          integration_id: xeroDetails.integration_id,
        },
      });

      const accountDetails = await this.xero.accountingApi.getAccount(
        xeroDetails.tenant_id,
        bankTransaction.bankAccount.accountID,
      );

      if (!xeroBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'checkAndCreateOverPaymentAndRefunds',
          api_payload: {
            sync_run_type,
            contact_id,
            tenant_id: xeroDetails.tenant_id,
            account_id: bankTransaction.bankAccount.accountID,
            overpayment_id: overpayment.overpaymentID,
            is_under_payment: is_under_payment,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 347 : 450,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Overpayment account details not found`,
          xero_records: [
            {
              ...overpayment,
              accountDetails: accountDetails?.body?.accounts[0] || [],
            },
          ],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroBankAccountDetails.pt_bank_account_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'checkAndCreateOverPaymentAndRefunds',
          api_payload: {
            sync_run_type,
            contact_id,
            tenant_id: xeroDetails.tenant_id,
            account_id: bankTransaction.bankAccount.accountID,
            overpayment_id: overpayment.overpaymentID,
            is_under_payment: is_under_payment,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 348 : 451,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from invoice ${sync_run_type}`,
            'Import failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Overpayment account details not mapped`,
          xero_records: [{ ...overpayment, xeroBankAccountDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments = await this.xeroPayments.findOne({
        where: {
          overpayment_id: overpayment.overpaymentID,
          is_under_payment: is_under_payment || false,
          status: Not('DELETED'),
        },
      });
      let xeroOverpayment: any;

      if (is_under_payment || !xeroPayments) {
        const xeroPayload: any = {
          payment_id: bankTransaction.bankTransactionID,
          overpayment_id: overpayment.overpaymentID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          contact_id: xeroContactDetails.id,
          account_id: xeroBankAccountDetails.id,
          payment_type: overpayment.type,
          status: overpayment.status,
          payment_date: overpayment.date,
          reference: bankTransaction.reference,
          payment_amount: is_under_payment
            ? under_payment_amount
            : overpayment.total,
          is_reconciled: bankTransaction.isReconciled,
          is_under_payment: is_under_payment || false,
          created_on: overpayment.updatedDateUTC,
          created_group: 'SYSTEM',
        };
        const newXeroPayments = await this.xeroPayments.create(xeroPayload);
        xeroOverpayment = await this.xeroPayments.save(newXeroPayments);
      } else {
        xeroPayments.contact_id = xeroContactDetails.id;
        xeroPayments.account_id = xeroBankAccountDetails.id;
        xeroPayments.payment_type = String(overpayment.type);
        xeroPayments.status = String(overpayment.status);
        xeroPayments.payment_date = new Date(overpayment.date);
        xeroPayments.reference = bankTransaction.reference;
        xeroPayments.payment_amount = is_under_payment
          ? under_payment_amount
          : overpayment.total;
        xeroPayments.is_reconciled = bankTransaction.isReconciled;
        xeroPayments.is_under_payment = is_under_payment || false;
        xeroPayments.updated_on = overpayment.updatedDateUTC;
        xeroPayments.updated_group = 'SYSTEM';
        xeroOverpayment = await this.xeroPayments.save(xeroPayments);
      }

      this.logger.log(JSON.stringify({
        pt_payment_id: xeroOverpayment.pt_payment_id,
        type: overpayment,
      }));
      if (
        ['SPEND-OVERPAYMENT', 'RECEIVE-OVERPAYMENT'].includes(
          String(overpayment.type),
        )
      ) {
        if (!xeroOverpayment.pt_payment_id) {
          const paytradePayload: AddPaymentInput = {
            company_id: xeroDetails?.company_id,
            payment_type:
              String(overpayment.type) === 'SPEND-OVERPAYMENT'
                ? !is_under_payment
                  ? 'Overpayment to supplier'
                  : 'Underpayment to supplier'
                : !is_under_payment
                  ? 'Overpayment from client'
                  : 'Underpayment from client',
            payment_from_account:
              String(overpayment.type) === 'SPEND-OVERPAYMENT'
                ? xeroBankAccountDetails.pt_bank_account_id
                : null,
            payment_to_account:
              String(overpayment.type) === 'RECEIVE-OVERPAYMENT'
                ? xeroBankAccountDetails.pt_bank_account_id
                : null,
            client_supplier_id: clientSuppliersDetails.client_supplier_id,
            payment_amount: is_under_payment
              ? under_payment_amount
              : overpayment.total,
            total_amount: is_under_payment
              ? under_payment_amount
              : overpayment.total,
            payment_date: new Date(overpayment.date),
            input_date: moment.tz('UTC').toDate(),
            current_status: 'Draft',
            project_id: project_id,
            payment_claim_id: payment_claim_id,
            associated_payment_id: associated_payment_id,
            associated_overpayment_id: null,
            contract_id: null,
            is_paid_confirmed:
              String(overpayment.type) === 'SPEND-OVERPAYMENT' ? true : null,
            is_received_confirmed:
              String(overpayment.type) === 'RECEIVE-OVERPAYMENT' ? true : null,
          };

          this.logger.log(JSON.stringify({ paytradePayload }));

          if (project_id && payment_claim_id && associated_payment_id) {
            const newPayment = await this.paymentsService.addPayment(
              decoded,
              paytradePayload,
              decoded?.userId,
            );
            this.logger.log('newPayment' + " " + JSON.stringify(newPayment));

            await this.xeroPayments
              .createQueryBuilder()
              .update(XeroPayments)
              .set({
                pt_payment_id: newPayment?.data?.payment_id,
                mapped_status: 'System',
              })
              .where('id = :id', {
                id: xeroOverpayment.id,
              })
              .execute();

            const paytradePayment = await this.paymentDetails.findOne({
              where: { payment_id: newPayment?.data?.payment_id },
            });

            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: sync_id || null,
                api_name: 'checkAndCreateOverPaymentAndRefunds',
                api_payload: {
                  sync_run_type,
                  contact_id,
                  tenant_id: xeroDetails.tenant_id,
                  account_id: xeroBankAccountDetails.pt_bank_account_id,
                  overpayment_id: overpayment.overpaymentID,
                  project_id,
                  client_supplier_id: clientSuppliersDetails.client_supplier_id,
                  payment_claim_id,
                  associated_payment_id,
                  is_under_payment,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: xeroOverpayment?.id,
                  paytradeId: paytradePayment?.id,
                },
                reference_id: xeroOverpayment?.id,
                history: [
                  `API triggered from invoice ${sync_run_type}`,
                  'Import successful',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Import tracking id validation': 'Ok',
                  'Import account type validation': 'Ok',
                  'Import tax type validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                  'Contract mapping validation': 'Ok',
                  'Project mapping validation': 'Ok',
                },
                error_message: null,
                xero_records: [overpayment],
                paytrade_records: [paytradePayment],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'checkAndCreateOverPaymentAndRefunds',
              api_payload: {
                sync_run_type,
                contact_id,
                tenant_id: xeroDetails.tenant_id,
                account_id: xeroBankAccountDetails.pt_bank_account_id,
                overpayment_id: overpayment.overpaymentID,
                project_id,
                client_supplier_id: clientSuppliersDetails.client_supplier_id,
                payment_claim_id,
                associated_payment_id,
                is_under_payment,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: sync_run_type === 'webhook' ? 361 : 458,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroOverpayment?.id,
                paytradeId: null,
              },
              reference_id: xeroOverpayment?.id,
              history: [
                `API triggered from invoice ${sync_run_type}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `Missing overpayment mandatory fields`,
              xero_records: [overpayment],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
        } else {
          const checkExistenceInSync = await this.xeroSyncLogs.findOne({
            where: {
              id: sync_id,
              log_template_id: 361,
              reference_id: xeroOverpayment?.id,
            },
          });
          if (
            sync_id &&
            checkExistenceInSync &&
            project_id &&
            payment_claim_id &&
            associated_payment_id
          ) {
            const ptOverpayment = await this.paymentDetails.findOne({
              where: { payment_id: xeroOverpayment?.pt_payment_id },
              relations: ['associatedPayment'],
            });
            if (
              ptOverpayment?.project_id === project_id &&
              ptOverpayment?.payment_claim_id === payment_claim_id &&
              ptOverpayment?.associatedPayment?.payment_id ===
                associated_payment_id
            ) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'checkAndCreateOverPaymentAndRefunds',
                  api_payload: {
                    sync_run_type,
                    contact_id,
                    tenant_id: xeroDetails.tenant_id,
                    account_id: xeroBankAccountDetails.pt_bank_account_id,
                    overpayment_id: overpayment.overpaymentID,
                    project_id,
                    client_supplier_id:
                      clientSuppliersDetails.client_supplier_id,
                    payment_claim_id,
                    associated_payment_id,
                    is_under_payment,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroOverpayment?.id,
                    paytradeId: ptOverpayment?.id,
                  },
                  reference_id: xeroOverpayment?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Import successful',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [overpayment],
                  paytrade_records: [ptOverpayment],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            } else {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: sync_id || null,
                  api_name: 'checkAndCreateOverPaymentAndRefunds',
                  api_payload: {
                    sync_run_type,
                    contact_id,
                    tenant_id: xeroDetails.tenant_id,
                    account_id: xeroBankAccountDetails.pt_bank_account_id,
                    overpayment_id: overpayment.overpaymentID,
                    project_id,
                    client_supplier_id:
                      clientSuppliersDetails.client_supplier_id,
                    payment_claim_id,
                    associated_payment_id,
                    is_under_payment,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: sync_run_type === 'webhook' ? 251 : 411,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroOverpayment?.id,
                    paytradeId: ptOverpayment?.id,
                  },
                  reference_id: xeroOverpayment?.id,
                  history: [
                    `API triggered from invoice ${sync_run_type}`,
                    'Overpayment in paytrade is already created for this sync',
                    'Import successful',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Import tracking id validation': 'Ok',
                    'Import account type validation': 'Ok',
                    'Import tax type validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                    'Contract mapping validation': 'Ok',
                    'Project mapping validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [overpayment],
                  paytrade_records: [ptOverpayment],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              return true;
            }
          }
        }
      }

      if (xeroOverpayment.id) {
        const xeroOverPayments = await this.xeroPayments.findOne({
          where: { id: xeroOverpayment.id },
        });
        // check for refund
        if (overpayment?.payments?.length > 0) {
          let refundIds = [];
          xeroOverPayments.overpayment_refund_id =
            xeroOverPayments.overpayment_refund_id
              ? xeroOverPayments.overpayment_refund_id
              : [];
          for (let refundPayment of overpayment?.payments) {
            const refundId = await this.createOverPaymentRefund(
              xeroDetails,
              overpayment,
              contact_id,
              clientSuppliersDetails,
              xeroContactDetails,
              xeroBankAccountDetails,
              xeroOverPayments,
              refundPayment,
              sync_id,
              project_id,
              payment_claim_id,
              associated_payment_id,
              associated_overpayment_id,
              sync_run_type,
              decoded,
            );

            if (refundId && !refundIds.includes(refundId)) {
              refundIds.push(refundId);
            }
          }

          await this.xeroPayments
            .createQueryBuilder()
            .update(XeroPayments)
            .set({
              overpayment_refund_id: refundIds,
              status: String(overpayment.status),
            })
            .where('id = :id', {
              id: xeroOverPayments.id,
            })
            .execute();

          const removedRefund = xeroOverPayments.overpayment_refund_id?.filter(
            (refundId) => !refundIds.includes(refundId),
          );

          const xeroRefunds = await this.xeroPayments.find({
            where: { payment_id: In(removedRefund) },
          });

          if (xeroRefunds && xeroRefunds.length > 0) {
            for (let xeroRefund of xeroRefunds) {
              await this.xeroPayments
                .createQueryBuilder()
                .update(XeroPayments)
                .set({
                  status: 'DELETED',
                })
                .where('payment_id = :payment_id', {
                  payment_id: xeroRefund.payment_id,
                })
                .execute();

              if (xeroRefund.pt_payment_id) {
                const existingRefundStatusCheck =
                  await this.paymentDetails.findOne({
                    where: { payment_id: xeroRefund.pt_payment_id },
                  });

                if (
                  existingRefundStatusCheck &&
                  existingRefundStatusCheck?.current_status !== 'Deleted'
                ) {
                  try {
                    const paytradePayload: ChangeStatusOfAPaymentInput = {
                      payment_id: xeroRefund.pt_payment_id,
                      status: 'Deleted',
                      input_date: null,
                    };
                    this.logger.log(JSON.stringify({ paytradePayload }));
                    const deletePaymentResponse =
                      await this.safeWebhookDeletePayment(
                        decoded,
                        paytradePayload,
                        '15',
                      );

                    this.logger.log('15:::' + " " + JSON.stringify({ deletePaymentResponse }));
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: { payment_id: xeroRefund.pt_payment_id },
                    });

                    const addSyncLogResponse =
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: sync_id || null,
                        api_name: 'checkAndCreateOverPaymentAndRefunds',
                        api_payload: {
                          sync_run_type,
                          contact_id,
                          tenant_id: xeroDetails.tenant_id,
                          account_id: xeroBankAccountDetails.pt_bank_account_id,
                          overpayment_id: overpayment.overpaymentID,
                          project_id,
                          client_supplier_id:
                            clientSuppliersDetails.client_supplier_id,
                          payment_claim_id,
                          associated_payment_id,
                          is_under_payment,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 251 : 411,
                        dynamic_values: {},
                        project_id: null,
                        contract_id: null,
                        reference: {
                          xeroId: xeroOverpayment?.id,
                          paytradeId: paytradePayment?.id,
                        },
                        reference_id: xeroOverpayment?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import successful',
                        ],
                        important_checks: {
                          'Import data format validation': 'Ok',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: null,
                        xero_records: [overpayment],
                        paytrade_records: [paytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                  } catch (error) {
                    const errMsg = error?.message ? error?.message : error;
                    if (errMsg == `The confirmed payment cannot be deleted.`) {
                      const paytradePayment = await this.paymentDetails.findOne(
                        {
                          where: {
                            payment_id: xeroRefund.pt_payment_id,
                          },
                          relations: ['subPayments'],
                          order: { created_on: 'DESC' },
                        },
                      );

                      const matchedPayments =
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) => element.status === 'Matched',
                            )
                          : [];

                      this.logger.log(JSON.stringify({ matchedPayments }));
                      let payment_account = null,
                        unmatchTransactions = [];
                      if (matchedPayments && matchedPayments?.length > 0) {
                        payment_account =
                          xeroBankAccountDetails.pt_bank_account_id;
                        unmatchTransactions.push({
                          ...matchedPayments[0],
                          account_id: payment_account,
                        });
                      }

                      const checkedPayments =
                        (!unmatchTransactions ||
                          unmatchTransactions?.length === 0) &&
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) =>
                                element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true,
                            )
                          : [];

                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: sync_id || null,
                        api_name: 'checkAndCreateOverPaymentAndRefunds',
                        api_payload: {
                          sync_run_type,
                          contact_id,
                          tenant_id: xeroDetails.tenant_id,
                          overpayment_id: overpayment.overpaymentID,
                          payment_id: xeroRefund.pt_payment_id,
                          payment_type: paytradePayment?.payment_type,
                          is_under_payment,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 349 : 452,
                        dynamic_values: {},
                        project_id: null,
                        contract_id: null,
                        reference: {},
                        reference_id: null,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import failed',
                        ],
                        important_checks: {
                          'Import data format validation': 'Failed',
                        },
                        error_message: `Overpayment refund in paytrade cannot be deleted`,
                        xero_records: [
                          {
                            ...overpayment,
                            payment_account,
                            ...(unmatchTransactions &&
                            unmatchTransactions?.length > 0
                              ? { unmatchTransactions }
                              : {}),
                            ...(!unmatchTransactions ||
                            unmatchTransactions?.length === 0
                              ? { checkedPayments }
                              : {}),
                          },
                        ],
                        paytrade_records: [],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                      return false;
                    }
                  }
                }
              }
            }
          }
        } else if (
          overpayment?.payments?.length == 0 &&
          xeroOverPayments.overpayment_refund_id &&
          xeroOverPayments.overpayment_refund_id.length > 0
        ) {
          this.logger.log('Refund exists in paytrade and not in xero');
          await this.xeroPayments
            .createQueryBuilder()
            .update(XeroPayments)
            .set({
              overpayment_refund_id: null,
              status: String(overpayment.status),
            })
            .where('id = :id', {
              id: xeroOverPayments.id,
            })
            .execute();

          const xeroRefunds = await this.xeroPayments.find({
            where: {
              payment_id: In(xeroOverPayments.overpayment_refund_id),
            },
          });
          if (xeroRefunds && xeroRefunds.length > 0) {
            for (let xeroRefund of xeroRefunds) {
              await this.xeroPayments
                .createQueryBuilder()
                .update(XeroPayments)
                .set({
                  status: 'DELETED',
                })
                .where('payment_id = :payment_id', {
                  payment_id: xeroRefund.payment_id,
                })
                .execute();

              if (xeroRefund.pt_payment_id) {
                const existingRefundStatusCheck =
                  await this.paymentDetails.findOne({
                    where: { payment_id: xeroRefund.pt_payment_id },
                  });

                if (
                  existingRefundStatusCheck &&
                  existingRefundStatusCheck?.current_status !== 'Deleted'
                ) {
                  try {
                    const paytradePayload: ChangeStatusOfAPaymentInput = {
                      payment_id: xeroRefund.pt_payment_id,
                      status: 'Deleted',
                      input_date: null,
                    };
                    this.logger.log(JSON.stringify({ paytradePayload }));
                    const deletePaymentResponse =
                      await this.safeWebhookDeletePayment(
                        decoded,
                        paytradePayload,
                        '16',
                      );

                    this.logger.log('16:::' + " " + JSON.stringify({ deletePaymentResponse }));
                    const paytradePayment = await this.paymentDetails.findOne({
                      where: { payment_id: xeroRefund.pt_payment_id },
                    });

                    const addSyncLogResponse =
                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: sync_id || null,
                        api_name: 'checkAndCreateOverPaymentAndRefunds',
                        api_payload: {
                          sync_run_type,
                          contact_id,
                          tenant_id: xeroDetails.tenant_id,
                          account_id: xeroBankAccountDetails.pt_bank_account_id,
                          overpayment_id: overpayment.overpaymentID,
                          project_id,
                          client_supplier_id:
                            clientSuppliersDetails.client_supplier_id,
                          payment_claim_id,
                          associated_payment_id,
                          is_under_payment,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 251 : 411,
                        dynamic_values: {},
                        project_id: null,
                        contract_id: null,
                        reference: {
                          xeroId: xeroOverpayment?.id,
                          paytradeId: paytradePayment?.id,
                        },
                        reference_id: xeroOverpayment?.id,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import successful',
                        ],
                        important_checks: {
                          'Import data format validation': 'Ok',
                          'Import tracking id validation': 'Ok',
                          'Import account type validation': 'Ok',
                          'Import tax type validation': 'Ok',
                          'Client/Supplier mapping validation': 'Ok',
                          'Contract mapping validation': 'Ok',
                          'Project mapping validation': 'Ok',
                        },
                        error_message: null,
                        xero_records: [overpayment],
                        paytrade_records: [paytradePayment],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                  } catch (error) {
                    const errMsg = error?.message ? error?.message : error;
                    if (errMsg == `The confirmed payment cannot be deleted.`) {
                      const paytradePayment = await this.paymentDetails.findOne(
                        {
                          where: {
                            payment_id: xeroRefund.pt_payment_id,
                          },
                          relations: ['subPayments'],
                          order: { created_on: 'DESC' },
                        },
                      );

                      const matchedPayments =
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) => element.status === 'Matched',
                            )
                          : [];

                      this.logger.log(JSON.stringify({ matchedPayments }));
                      let payment_account = null,
                        unmatchTransactions = [];
                      if (matchedPayments && matchedPayments?.length > 0) {
                        payment_account =
                          xeroBankAccountDetails.pt_bank_account_id;
                        unmatchTransactions.push({
                          ...matchedPayments[0],
                          account_id: payment_account,
                        });
                      }

                      const checkedPayments =
                        (!unmatchTransactions ||
                          unmatchTransactions?.length === 0) &&
                        paytradePayment &&
                        paytradePayment?.subPayments &&
                        paytradePayment?.subPayments?.length > 0
                          ? paytradePayment?.subPayments?.filter(
                              (element) =>
                                element.is_paid_confirmed === true ||
                                element.is_received_confirmed === true,
                            )
                          : [];

                      await this.xeroService.insertXeroSyncLogs(decoded, {
                        id: sync_id || null,
                        api_name: 'checkAndCreateOverPaymentAndRefunds',
                        api_payload: {
                          sync_run_type,
                          contact_id,
                          tenant_id: xeroDetails.tenant_id,
                          overpayment_id: overpayment.overpaymentID,
                          payment_id: xeroRefund.pt_payment_id,
                          payment_type: paytradePayment?.payment_type,
                          is_under_payment,
                        },
                        integration_id: xeroDetails.integration_id,
                        log_template_id:
                          sync_run_type === 'webhook' ? 349 : 452,
                        dynamic_values: {},
                        project_id: null,
                        contract_id: null,
                        reference: {},
                        reference_id: null,
                        history: [
                          `API triggered from invoice ${sync_run_type}`,
                          'Import failed',
                        ],
                        important_checks: {
                          'Import data format validation': 'Failed',
                        },
                        error_message: `Overpayment refund in paytrade cannot be deleted`,
                        xero_records: [
                          {
                            ...overpayment,
                            payment_account,
                            ...(unmatchTransactions &&
                            unmatchTransactions?.length > 0
                              ? { unmatchTransactions }
                              : {}),
                            ...(!unmatchTransactions ||
                            unmatchTransactions?.length === 0
                              ? { checkedPayments }
                              : {}),
                          },
                        ],
                        paytrade_records: [],
                        new_records: null,
                        updated_records: null,
                        synced_records: null,
                      });
                      return false;
                    }
                  }
                }
              }
            }
          }
        } else {
          this.logger.log('No refund exists');
        }
      }
      return true;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async createOverPaymentRefund(
    xeroDetails,
    overpayment,
    contact_id: string,
    clientSuppliersDetails,
    xeroContactDetails,
    xeroBankAccountDetails,
    xeroOverPayments,
    refundPayment,
    sync_id?: string,
    project_id?: number,
    payment_claim_id?: number,
    associated_payment_id?: number,
    associated_overpayment_id?: number,
    sync_run_type?: string,
    decoded?: any,
  ) {
    const refundDetails = await this.xero.accountingApi.getPayment(
      xeroDetails.tenant_id,
      refundPayment.paymentID,
    );

    const payment = refundDetails.body.payments[0];

    if (!xeroOverPayments.overpayment_refund_id.includes(payment.paymentID)) {
      let requestData: any = {
        payment_id: payment.paymentID,
        tenant_id: xeroDetails.tenant_id,
        integration_id: xeroDetails.integration_id,
        contact_id: xeroContactDetails.id,
        account_id: xeroBankAccountDetails.id,
        payment_type: payment.paymentType,
        status: payment.status,
        payment_date: payment.date,
        reference: payment.reference,
        payment_amount: payment.amount,
        is_reconciled: payment.isReconciled,
        created_on: payment.updatedDateUTC,
        created_group: 'SYSTEM',
      };
      this.logger.log(JSON.stringify({ requestData }));
      const newXeroPayments = await this.xeroPayments.create(requestData);
      const xeroRefundPayments: any =
        await this.xeroPayments.save(newXeroPayments);

      if (
        ['APOVERPAYMENTPAYMENT', 'AROVERPAYMENTPAYMENT'].includes(
          String(payment.paymentType),
        )
      ) {
        const associatedOverPayment = xeroOverPayments.pt_payment_id
          ? await this.paymentDetails.findOne({
              where: { payment_id: xeroOverPayments.pt_payment_id },
              relations: ['associatedPayment'],
            })
          : null;

        this.logger.log(JSON.stringify({ associatedOverPayment }));
        if (associatedOverPayment) {
          project_id = associatedOverPayment?.project_id;
          payment_claim_id = associatedOverPayment?.payment_claim_id;
          associated_payment_id = associatedOverPayment?.associatedPayment
            ? associatedOverPayment?.associatedPayment?.payment_id
            : null;
          associated_overpayment_id = associatedOverPayment?.payment_id;
        }

        const paytradePayload: AddPaymentInput = {
          company_id: xeroDetails?.company_id,
          payment_type:
            String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
              ? 'Overpayment refund from supplier'
              : 'Overpayment refund to client',
          payment_from_account:
            String(payment.paymentType) === 'AROVERPAYMENTPAYMENT'
              ? xeroBankAccountDetails.pt_bank_account_id
              : null,
          payment_to_account:
            String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
              ? xeroBankAccountDetails.pt_bank_account_id
              : null,
          payment_amount: payment.amount,
          total_amount: payment.amount,
          payment_date: new Date(payment.date),
          input_date: moment.tz('UTC').toDate(),
          current_status: 'Draft',
          client_supplier_id: clientSuppliersDetails.client_supplier_id,
          project_id: project_id,
          payment_claim_id: payment_claim_id,
          associated_payment_id: associated_payment_id,
          associated_overpayment_id: associated_overpayment_id,
          contract_id: null,
          is_paid_confirmed:
            String(payment.paymentType) === 'AROVERPAYMENTPAYMENT'
              ? true
              : null,
          is_received_confirmed:
            String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
              ? true
              : null,
        };

        this.logger.log(JSON.stringify({ paytradePayload }));
        if (
          project_id &&
          payment_claim_id &&
          associated_payment_id &&
          associated_overpayment_id
        ) {
          const newRefundPayment = await this.paymentsService.addPayment(
            decoded,
            paytradePayload,
            decoded?.userId,
          );
          this.logger.log('newRefundPayment' + " " + JSON.stringify(newRefundPayment));

          await this.xeroPayments
            .createQueryBuilder()
            .update(XeroPayments)
            .set({
              pt_payment_id: newRefundPayment?.data?.payment_id,
              mapped_status: 'System',
            })
            .where('id = :id', {
              id: xeroRefundPayments.id,
            })
            .execute();

          const paytradePayment = await this.paymentDetails.findOne({
            where: { payment_id: newRefundPayment?.data?.payment_id },
          });
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: sync_id || null,
              api_name: 'checkAndCreateOverPaymentAndRefunds',
              api_payload: {
                sync_run_type,
                contact_id,
                tenant_id: xeroDetails.tenant_id,
                account_id: xeroBankAccountDetails.pt_bank_account_id,
                overpayment_id: overpayment.overpaymentID,
                project_id,
                client_supplier_id: clientSuppliersDetails.client_supplier_id,
                payment_claim_id,
                associated_payment_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: sync_run_type === 'webhook' ? 251 : 411,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroRefundPayments?.id,
                paytradeId: paytradePayment?.id,
              },
              reference_id: xeroRefundPayments?.id,
              history: [
                `API triggered from invoice ${sync_run_type}`,
                'Import successful',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Import tracking id validation': 'Ok',
                'Import account type validation': 'Ok',
                'Import tax type validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
                'Contract mapping validation': 'Ok',
                'Project mapping validation': 'Ok',
              },
              error_message: null,
              xero_records: [payment],
              paytrade_records: [paytradePayment],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return payment.paymentID;
        } else {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: sync_id || null,
            api_name: 'checkAndCreateOverPaymentAndRefunds',
            api_payload: {
              sync_run_type,
              contact_id,
              tenant_id: xeroDetails.tenant_id,
              overpayment_id: overpayment.overpaymentID,
              account_id: xeroBankAccountDetails.pt_bank_account_id,
              project_id,
              client_supplier_id: clientSuppliersDetails.client_supplier_id,
              payment_claim_id,
              associated_payment_id,
              associated_overpayment_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: sync_run_type === 'webhook' ? 362 : 459,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [
              `API triggered from invoice ${sync_run_type}`,
              'Import failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Missing overpayment refund mandatory fields`,
            xero_records: [overpayment],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }
    }
  }

  /**
   * Task #65 — Manual Xero re-sync by ID.
   *
   * Admin-triggered recovery tool: pull the named Xero record fresh from
   * Xero by its ID (or invoice number for Invoice/Bill) and re-run the
   * existing inbound webhook handler stamped with `sync_run_type: 'manual'`.
   *
   * Reuses every code path the 15-min webhook fallback and the daily retro
   * re-check already exercise — no new business logic.
   *
   *   type:
   *     - 'invoice_bill'   → handleInvoiceCreateUpdate (also walks payments[])
   *     - 'payment'        → resolve payment → invoice id → handleInvoiceCreateUpdate
   *     - 'bank_transfer'  → parse PT-RET-{id} reference → resolve linked
   *                          PT payment's claim invoice → handleInvoiceCreateUpdate
   *     - 'contact'        → handleContactCreateUpdate
   *     - 'manual_journal' → handleManualJournalUpdate (anti-echo aware)
   *
   * Returns a structured payload the resolver JSON-stringifies. All paths
   * are wrapped in try/catch; failures surface a Failed sync log row and
   * a clear human-readable error message.
   */
  async manualXeroResync(
    decoded: any,
    input: {
      company_id: number;
      type: string;
      id: string;
      // When invoked by the two-sided manual sync dispatcher
      // (`dispatchManualSync` → writeTwoSidedTriggerLog), the
      // dispatcher already writes its own enriched trigger row
      // (templates 518/519/520) carrying the preflight snapshot,
      // direction and outcome. Suppress this method's own legacy
      // template-499 trigger row in that case so the sync log table
      // shows ONE trigger row per user click instead of two.
      _suppressLegacyTrigger?: boolean;
    },
  ): Promise<{
    success: boolean;
    message: string;
    syncLogId?: number | null;
    resolvedXeroId?: string | null;
  }> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const rawId = String(input?.id || '').trim();
    const suppressLegacyTrigger = !!input?._suppressLegacyTrigger;

    const allowedTypes = new Set([
      'invoice_bill',
      'payment',
      'bank_transfer',
      'contact',
      'manual_journal',
      // Task #231 — re-pull a single Xero BankTransfer between a
      // trust account and its associated cash account.
      'trust_movement',
    ]);

    if (!company_id || !rawType || !rawId) {
      return {
        success: false,
        message: 'company_id, type and id are all required.',
      };
    }
    if (!allowedTypes.has(rawType)) {
      return {
        success: false,
        message: `Unsupported type "${rawType}". Supported: ${Array.from(
          allowedTypes,
        ).join(', ')}.`,
      };
    }

    // Look up the active Xero integration for this company.
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        success: false,
        message: 'No active Xero integration found for this company.',
      };
    }
    if (
      xeroDetails.integrationDetails?.integration_status !==
      'Connected - active'
    ) {
      return {
        success: false,
        message: 'Xero integration is not in Connected - active state.',
      };
    }

    const tenant_id = xeroDetails.tenant_id;
    const integration_id = xeroDetails.integration_id;
    const triggeredByUserId = decoded?.userId ?? null;

    // Refresh the token (Redis-locked) before any Xero API call.
    // Re-throw — the resolver's `refreshTokenReAuthenticate` catch path
    // detects the dead-refresh-token signature and returns XERO_REFRESH so
    // the frontend can surface the in-page reauth banner instead of
    // swallowing the error as a generic failure.
    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Helper to write the trigger log row (template 499).
    const writeTriggerLog = async (params: {
      status: 'Succeeded' | 'Failed';
      resolvedXeroId: string | null;
      message: string;
      extraHistory?: string[];
      reference_id?: string | null;
    }): Promise<number | null> => {
      // Two-sided dispatcher writes its own enriched trigger row —
      // suppress the legacy 499 to avoid the duplicate "Manual sync
      // (two-sided) — Failed" + "Manual sync — Succeeded" pair the
      // user was seeing in the sync log table for every click.
      if (suppressLegacyTrigger) return null;
      try {
        const log = await this.xeroService.insertXeroSyncLogs(decoded, {
          id: null,
          api_name: 'manualXeroResync',
          api_payload: {
            type: rawType,
            id: rawId,
            resolvedXeroId: params.resolvedXeroId,
            sync_run_type: 'manual',
            triggered_by_user_id: triggeredByUserId,
          },
          integration_id,
          log_template_id: 499,
          dynamic_values: {
            type: rawType,
            id: rawId,
            resolved_id: params.resolvedXeroId || rawId,
            user_id: String(triggeredByUserId ?? ''),
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: params.resolvedXeroId,
            paytradeId: null,
          },
          reference_id: params.reference_id ?? null,
          history: [
            `Manual re-sync triggered by user ${triggeredByUserId ?? 'unknown'}`,
            `Type=${rawType}, id=${rawId}`,
            ...(params.extraHistory || []),
            params.status === 'Succeeded' ? 'Dispatched' : 'Aborted',
          ],
          important_checks: {
            'Manual sync trigger': params.status === 'Succeeded' ? 'Ok' : 'Failed',
          },
          error_message: params.status === 'Failed' ? params.message : null,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        } as any);
        return (log && (log as any).id) || null;
      } catch (err: any) {
        this.logger.error(
          `[MANUAL_RESYNC] writeTriggerLog failed: ${err?.message || err}`,
        );
        return null;
      }
    };

    try {
      // ───────────────────────────── INVOICE / BILL ─────────────────────────────
      if (rawType === 'invoice_bill') {
        let resolvedId = rawId;

        // Number → GUID resolution path.
        if (!uuidRegex.test(rawId)) {
          try {
            const where = `InvoiceNumber=="${rawId.replace(/"/g, '\\"')}"`;
            const lookup = await this.xero.accountingApi.getInvoices(
              tenant_id,
              undefined,
              where,
            );
            const matches = lookup?.body?.invoices || [];
            if (matches.length === 0) {
              const msg = `No invoice or bill found with number "${rawId}".`;
              const syncLogId = await writeTriggerLog({
                status: 'Failed',
                resolvedXeroId: null,
                message: msg,
              });
              return { success: false, message: msg, syncLogId };
            }
            if (matches.length > 1) {
              const candidateIds = matches
                .map((m: any) => m?.invoiceID)
                .filter(Boolean)
                .slice(0, 5)
                .join(', ');
              const msg = `Multiple invoices found for number "${rawId}". Use the Xero GUID instead. Candidates: ${candidateIds}`;
              const syncLogId = await writeTriggerLog({
                status: 'Failed',
                resolvedXeroId: null,
                message: msg,
              });
              return { success: false, message: msg, syncLogId };
            }
            resolvedId = matches[0]?.invoiceID;
          } catch (err: any) {
            const errMsg = await handleAxiosError(err).catch(() => err?.message || String(err));
            const msg = `Failed to resolve invoice number to GUID: ${errMsg}`;
            const syncLogId = await writeTriggerLog({
              status: 'Failed',
              resolvedXeroId: null,
              message: msg,
            });
            return { success: false, message: msg, syncLogId };
          }
        }

        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: resolvedId,
          message: '',
          extraHistory: [`Resolved invoice GUID: ${resolvedId}`],
        });

        // Re-run the same handler the webhook would, stamped 'manual'.
        // Handlers return `false` (without throwing) when the record can't
        // be processed (missing mappings, contact not yet created, etc.).
        // Treat that as a real failure so the UI doesn't show a misleading
        // green tick.
        const handlerOk = await this.handleInvoiceCreateUpdate(
          {
            resource_id: resolvedId,
            tenant_id,
            eventType: 'UPDATE',
            sync_run_type: 'manual',
          },
          decoded,
        );
        if (handlerOk === false) {
          return {
            success: false,
            message: `Invoice/Bill ${resolvedId} was re-pulled from Xero but the handler reported a processing failure. Check the sync log entries that follow this trigger row for details.`,
            syncLogId,
            resolvedXeroId: resolvedId,
          };
        }
        return {
          success: true,
          message: `Invoice/Bill ${resolvedId} re-pulled and re-processed.`,
          syncLogId,
          resolvedXeroId: resolvedId,
        };
      }

      // ───────────────────────────── PAYMENT ─────────────────────────────
      if (rawType === 'payment') {
        if (!uuidRegex.test(rawId)) {
          const msg = 'Payment id must be a Xero GUID.';
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: null,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }
        let invoiceId: string | null = null;
        try {
          const resp = await this.xero.accountingApi.getPayment(tenant_id, rawId);
          const payment = resp?.body?.payments?.[0];
          invoiceId = payment?.invoice?.invoiceID || null;
          if (!invoiceId) {
            const msg = `Payment ${rawId} has no linked invoice in Xero.`;
            const syncLogId = await writeTriggerLog({
              status: 'Failed',
              resolvedXeroId: rawId,
              message: msg,
            });
            return { success: false, message: msg, syncLogId };
          }
        } catch (err: any) {
          const errMsg = await handleAxiosError(err).catch(() => err?.message || String(err));
          const msg = `Failed to fetch payment ${rawId}: ${errMsg}`;
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: rawId,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }

        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: rawId,
          message: '',
          extraHistory: [
            `Payment ${rawId} → invoice ${invoiceId} — re-running invoice handler`,
          ],
        });

        const paymentHandlerOk = await this.handleInvoiceCreateUpdate(
          {
            resource_id: invoiceId,
            tenant_id,
            eventType: 'UPDATE',
            sync_run_type: 'manual',
          },
          decoded,
        );
        if (paymentHandlerOk === false) {
          return {
            success: false,
            message: `Payment ${rawId} was resolved to invoice ${invoiceId} but the handler reported a processing failure. Check the sync log entries that follow this trigger row.`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        }
        return {
          success: true,
          message: `Payment ${rawId} re-pulled (via invoice ${invoiceId}).`,
          syncLogId,
          resolvedXeroId: rawId,
        };
      }

      // ───────────────────────────── BANK TRANSFER ─────────────────────────────
      if (rawType === 'bank_transfer') {
        if (!uuidRegex.test(rawId)) {
          const msg = 'Bank transfer id must be a Xero GUID.';
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: null,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }

        let reference: string | null = null;
        try {
          const resp = await this.xero.accountingApi.getBankTransfer(
            tenant_id,
            rawId,
          );
          const bt = resp?.body?.bankTransfers?.[0];
          reference = (bt as any)?.reference || null;
        } catch (err: any) {
          const errMsg = await handleAxiosError(err).catch(() => err?.message || String(err));
          const msg = `Failed to fetch bank transfer ${rawId}: ${errMsg}`;
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: rawId,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }

        // Task #244 — manual re-pull of an Inter Trust Transfer
        // (PT-XFER-{transfer_id}). Delegate to the same inbound
        // matcher the live BANKTRANSFER webhook uses; that path is
        // anti-echo aware and idempotent.
        if (reference && /^PT-XFER-\d+$/.test(reference.trim())) {
          const syncLogId = await writeTriggerLog({
            status: 'Succeeded',
            resolvedXeroId: rawId,
            message: '',
            extraHistory: [
              `Dispatching PT-XFER BankTransfer ${rawId} to handleInboundTrustMovementBankTransfer (manual)`,
            ],
          });
          try {
            const result =
              await this.xeroPaymentsService.handleInboundTrustMovementBankTransfer(
                { resource_id: rawId, tenant_id, sync_run_type: 'manual' },
                decoded,
              );
            return {
              success: !!result?.success,
              message:
                result?.message ||
                `Inter Trust Transfer ${rawId} processed.`,
              syncLogId,
              resolvedXeroId: rawId,
            };
          } catch (err: any) {
            return {
              success: false,
              message: `Inter Trust Transfer ${rawId} handler threw: ${err?.message || String(err)}`,
              syncLogId,
              resolvedXeroId: rawId,
            };
          }
        }

        // Reference round-trip: PT-RET-{pt_payment_id}
        const refMatch = reference && /^PT-RET-(\d+)$/.exec(reference.trim());
        if (!refMatch) {
          const msg = `Bank transfer ${rawId} has no PT-RET-{id} reference. Re-sync the linked Invoice/Bill GUID instead to refresh retention payments.`;
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: rawId,
            message: msg,
            extraHistory: [`Reference="${reference || ''}"`],
          });
          return { success: false, message: msg, syncLogId };
        }

        const ptPaymentId = Number(refMatch[1]);
        const ptPayment = await this.paymentDetails.findOne({
          where: { payment_id: ptPaymentId },
          relations: ['paymentClaims'],
        });
        if (!ptPayment) {
          const msg = `Reference points to PT payment ${ptPaymentId} but no such payment exists.`;
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: rawId,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }
        const xeroInvoice = await this.xeroInvoicesBills.findOne({
          where: {
            pt_claim_id: ptPayment.payment_claim_id,
            integration_id,
          },
        });
        if (!xeroInvoice?.invoice_id) {
          const msg = `PT claim ${ptPayment.payment_claim_id} has no mapped Xero invoice. Map the claim first, then re-sync.`;
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: rawId,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }

        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: rawId,
          message: '',
          extraHistory: [
            `BankTransfer ${rawId} reference=${reference} → PT payment ${ptPaymentId} → invoice ${xeroInvoice.invoice_id}`,
          ],
          reference_id: String(ptPayment.id),
        });

        const transferHandlerOk = await this.handleInvoiceCreateUpdate(
          {
            resource_id: xeroInvoice.invoice_id,
            tenant_id,
            eventType: 'UPDATE',
            sync_run_type: 'manual',
          },
          decoded,
        );
        if (transferHandlerOk === false) {
          return {
            success: false,
            message: `Bank transfer ${rawId} resolved to invoice ${xeroInvoice.invoice_id} but the handler reported a processing failure. Check the sync log entries that follow this trigger row.`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        }
        return {
          success: true,
          message: `Bank transfer ${rawId} re-pulled (via invoice ${xeroInvoice.invoice_id}).`,
          syncLogId,
          resolvedXeroId: rawId,
        };
      }

      // ─────────────────────── TRUST ACCOUNT MOVEMENT ────────────────────
      // Task #231 — Re-pull a single Xero BankTransfer between a
      // trust account (PTA/RTA) and its associated cash account.
      // Delegates to the anti-echo-aware inbound handler on
      // XeroPaymentsService; the handler decides whether to mark an
      // existing PT payment as matched (PT-MOV reference) or
      // materialise a brand-new PT payment of the right direction.
      if (rawType === 'trust_movement') {
        if (!uuidRegex.test(rawId)) {
          const msg = 'Trust movement id must be a Xero BankTransfer GUID.';
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: null,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }
        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: rawId,
          message: '',
          extraHistory: [
            `Dispatching trust-movement BankTransfer ${rawId} to handleInboundTrustMovementBankTransfer (manual)`,
          ],
        });
        try {
          const result =
            await this.xeroPaymentsService.handleInboundTrustMovementBankTransfer(
              { resource_id: rawId, tenant_id, sync_run_type: 'manual' },
              decoded,
            );
          if (!result?.success) {
            return {
              success: false,
              message: `Trust movement ${rawId} could not be imported: ${result?.message || 'unknown error'}.`,
              syncLogId,
              resolvedXeroId: rawId,
            };
          }
          return {
            success: true,
            message: result.created_payment_id
              ? `Trust movement ${rawId} imported as PT payment ${result.created_payment_id}.`
              : `Trust movement ${rawId} processed: ${result.message}.`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          return {
            success: false,
            message: `Trust movement ${rawId} handler threw: ${errMsg}`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        }
      }

      // ───────────────────────────── CONTACT ─────────────────────────────
      if (rawType === 'contact') {
        if (!uuidRegex.test(rawId)) {
          const msg = 'Contact id must be a Xero GUID.';
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: null,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }
        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: rawId,
          message: '',
        });
        const contactHandlerOk = await this.handleContactCreateUpdate(
          rawId,
          tenant_id,
          '',
          { sync_run_type: 'manual' },
          decoded,
        );
        if (contactHandlerOk === false) {
          return {
            success: false,
            message: `Contact ${rawId} was re-pulled from Xero but the handler reported a processing failure. Check the sync log entries that follow this trigger row.`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        }
        return {
          success: true,
          message: `Contact ${rawId} re-pulled and re-processed.`,
          syncLogId,
          resolvedXeroId: rawId,
        };
      }

      // ───────────────────────────── MANUAL JOURNAL ─────────────────────────────
      if (rawType === 'manual_journal') {
        if (!uuidRegex.test(rawId)) {
          const msg = 'Manual Journal id must be a Xero GUID.';
          const syncLogId = await writeTriggerLog({
            status: 'Failed',
            resolvedXeroId: null,
            message: msg,
          });
          return { success: false, message: msg, syncLogId };
        }
        const syncLogId = await writeTriggerLog({
          status: 'Succeeded',
          resolvedXeroId: rawId,
          message: '',
        });
        const mjHandlerOk = await this.handleManualJournalUpdate(
          {
            resource_id: rawId,
            tenant_id,
            eventType: 'UPDATE',
            sync_run_type: 'manual',
          },
          decoded,
        );
        if (mjHandlerOk === false) {
          return {
            success: false,
            message: `Manual Journal ${rawId} was re-pulled from Xero but the handler reported a processing failure (or anti-echo skipped a self-posted journal). Check the sync log entries that follow this trigger row.`,
            syncLogId,
            resolvedXeroId: rawId,
          };
        }
        return {
          success: true,
          message: `Manual Journal ${rawId} re-pulled (anti-echo applied if PayTrade-posted).`,
          syncLogId,
          resolvedXeroId: rawId,
        };
      }

      // Should be unreachable thanks to the allowedTypes check above.
      return { success: false, message: `Unsupported type "${rawType}".` };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.logger.error(`[MANUAL_RESYNC] unhandled error: ${errMsg}`);
      const syncLogId = await writeTriggerLog({
        status: 'Failed',
        resolvedXeroId: null,
        message: errMsg,
      });
      return { success: false, message: errMsg, syncLogId };
    }
  }

  /**
   * Task #72 — Lookup helper for Manual Xero re-sync.
   *
   * Lets admins find the correct Xero GUID without leaving PayTrade. For
   * each supported type we fetch a recent slice of records from Xero
   * (and/or PT-side mappings for bank_transfer) and filter by a
   * human-readable hint (invoice number, contact name, reference,
   * narration, amount, or PT-side payment id). Returns up to 10 candidates
   * with `{ id, label, sublabel }` so the frontend can render a short
   * autocomplete list. The user picks one → `id` populates the resync
   * input → they click Run sync against the existing `manualXeroResync`
   * mutation.
   *
   * Read-only: no writes, no sync log rows, no token refresh side-effects
   * other than the standard Redis-locked refresh that every Xero call
   * already performs.
   */
  async manualXeroResyncLookup(
    decoded: any,
    input: {
      company_id: number;
      type: string;
      hint: string;
      from_date?: string | null;
      to_date?: string | null;
      page?: number | null;
      account_hint?: string;
      date?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    candidates: Array<{
      id: string;
      label: string;
      sublabel?: string;
    }>;
    has_more?: boolean;
    page?: number;
    window?: { from?: string; to?: string };
  }> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const hint = String(input?.hint || '').trim();
    const accountHint = String(input?.account_hint || '').trim();
    const dateHint = String(input?.date || '').trim();

    // Task #73 — optional date-range / pagination so admins can recover
    // records older than the default rolling window. `from_date` widens
    // `ifModifiedSince`; `to_date` is applied client-side as an
    // UpdatedDateUTC upper bound; `page` walks Xero's own pagination
    // for endpoints that support it.
    const parseDate = (v: any, endOfDay = false): Date | null => {
      if (!v) return null;
      const m = moment(v);
      if (!m.isValid()) return null;
      // HTML <input type="date"> emits YYYY-MM-DD which moment parses to
      // midnight. For an inclusive upper bound we want the very end of
      // the chosen day so records updated later that day still match.
      // Detect "date-only" strings and snap to 23:59:59.999 in that case.
      const isDateOnly =
        typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
      if (endOfDay && isDateOnly) {
        return m.endOf('day').toDate();
      }
      return m.toDate();
    };
    const fromDate = parseDate(input?.from_date);
    const toDate = parseDate(input?.to_date, true);
    const page = Math.max(1, Number(input?.page) || 1);

    const allowedTypes = new Set([
      'invoice_bill',
      'payment',
      'bank_transfer',
      'trust_movement',
      'contact',
      'manual_journal',
    ]);
    // Task #231 — trust_movement lookup reuses the bank_transfer branch
    // (BankTransfers + PT-MOV-{id} reference search) since they share
    // the same Xero entity. Caller must still dispatch with
    // type=trust_movement so the resync handler routes to the
    // anti-echo-aware inbound trust handler.
    const resolvedType = rawType === 'trust_movement' ? 'bank_transfer' : rawType;

    if (!company_id || !rawType) {
      return {
        success: false,
        message: 'company_id and type are required.',
        candidates: [],
      };
    }
    if (!allowedTypes.has(rawType)) {
      return {
        success: false,
        message: `Unsupported type "${rawType}".`,
        candidates: [],
      };
    }
    // Task #74 — bank_transfer can be searched by account_hint and/or
    // date alone (e.g. for transfers created directly in Xero with no
    // PT-RET-… reference). All other types still require a text hint.
    const hasBankTransferFilters =
      resolvedType === 'bank_transfer' &&
      (accountHint.length >= 2 || (!!dateHint && moment(dateHint).isValid()));
    if ((!hint || hint.length < 2) && !hasBankTransferFilters) {
      return {
        success: false,
        message:
          rawType === 'bank_transfer'
            ? 'Enter at least 2 characters, or pick a bank account / date.'
            : 'Enter at least 2 characters to search.',
        candidates: [],
      };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        success: false,
        message: 'No active Xero integration found for this company.',
        candidates: [],
      };
    }
    if (
      xeroDetails.integrationDetails?.integration_status !==
      'Connected - active'
    ) {
      return {
        success: false,
        message: 'Xero integration is not in Connected - active state.',
        candidates: [],
      };
    }

    const tenant_id = xeroDetails.tenant_id;
    const integration_id = xeroDetails.integration_id;

    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const lower = hint.toLowerCase();
    const fmtDate = (d: any): string => {
      try {
        if (!d) return '';
        const m = moment(d);
        return m.isValid() ? m.format('DD MMM YYYY') : '';
      } catch {
        return '';
      }
    };
    const num = (v: any): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    try {
      // ─── INVOICE / BILL ────────────────────────────────────────────────
      if (rawType === 'invoice_bill') {
        // Default 365-day rolling window; widened by the caller via
        // `from_date` for archive lookups. Page-size capped at 200 to
        // stay well under Xero's per-call throttle.
        const since = fromDate || moment().subtract(365, 'days').toDate();
        const pageSize = 200;
        // Signature (xero-node): tenantId, ifModifiedSince, where, order,
        // iDs, invoiceNumbers, contactIDs, statuses, page, includeArchived,
        // createdByMyApp, unitdp, summaryOnly, pageSize, searchTerm.
        const resp = await this.xero.accountingApi.getInvoices(
          tenant_id,
          since,
          undefined,
          'UpdatedDateUTC DESC',
          undefined,
          undefined,
          undefined,
          undefined,
          page,
          undefined,
          undefined,
          undefined,
          true,
          pageSize,
        );
        const list = resp?.body?.invoices || [];
        const bounded = toDate
          ? list.filter((inv: any) => {
              const u = inv?.updatedDateUTC ? moment(inv.updatedDateUTC) : null;
              return !u || !u.isValid() || u.toDate() <= toDate;
            })
          : list;
        const matched = bounded.filter((inv: any) => {
          const n = String(inv?.invoiceNumber || '').toLowerCase();
          const ref = String(inv?.reference || '').toLowerCase();
          const name = String(inv?.contact?.name || '').toLowerCase();
          return (
            n.includes(lower) || ref.includes(lower) || name.includes(lower)
          );
        });
        const out = matched.slice(0, 10).map((inv: any) => ({
          id: String(inv?.invoiceID || ''),
          label: `${inv?.invoiceNumber || '(no number)'} — ${
            inv?.contact?.name || '(no contact)'
          }`,
          sublabel: `${inv?.type || ''} • ${fmtDate(inv?.date)} • ${
            inv?.status || ''
          } • Total ${num(inv?.total).toFixed(2)}`,
        }));
        return {
          success: true,
          candidates: out,
          has_more: list.length >= pageSize || matched.length > out.length,
          page,
          window: {
            from: since.toISOString(),
            to: toDate ? toDate.toISOString() : undefined,
          },
        };
      }

      // ─── PAYMENT ──────────────────────────────────────────────────────
      if (rawType === 'payment') {
        const since = fromDate || moment().subtract(180, 'days').toDate();
        const resp = await this.xero.accountingApi.getPayments(
          tenant_id,
          since,
          undefined,
          'Date DESC',
          page,
        );
        const rawList = resp?.body?.payments || [];
        const list = toDate
          ? rawList.filter((p: any) => {
              const u = p?.updatedDateUTC ? moment(p.updatedDateUTC) : null;
              return !u || !u.isValid() || u.toDate() <= toDate;
            })
          : rawList;
        const out = list
          .filter((p: any) => {
            const invNum = String(
              p?.invoice?.invoiceNumber || '',
            ).toLowerCase();
            const name = String(
              p?.invoice?.contact?.name || '',
            ).toLowerCase();
            const ref = String(p?.reference || '').toLowerCase();
            const amt = String(p?.amount ?? '');
            return (
              invNum.includes(lower) ||
              name.includes(lower) ||
              ref.includes(lower) ||
              amt === hint
            );
          })
          .slice(0, 10)
          .map((p: any) => ({
            id: String(p?.paymentID || ''),
            label: `${p?.invoice?.invoiceNumber || '(no invoice)'} — ${
              p?.invoice?.contact?.name || ''
            }`,
            sublabel: `${fmtDate(p?.date)} • ${num(p?.amount).toFixed(2)} • ${
              p?.status || ''
            }`,
          }));
        // getPayments returns up to 100 rows per page (Xero default).
        return {
          success: true,
          candidates: out,
          has_more: rawList.length >= 100 || list.length > out.length,
          page,
          window: {
            from: since.toISOString(),
            to: toDate ? toDate.toISOString() : undefined,
          },
        };
      }

      // ─── BANK TRANSFER ────────────────────────────────────────────────
      // Two paths — both deduped by transfer id:
      //   (a) PT-side mappings: search xero_payments for matches on
      //       PT payment id, bank_transfer_reference, or PT-RET-{id}.
      //   (b) Recent Xero BankTransfers filtered by reference Contains.
      if (resolvedType === 'bank_transfer') {
        // Task #231 — when the original rawType was 'trust_movement',
        // restrict candidates to (a) unlinked transfers only (no
        // xero_payments.bank_transfer_id row yet) AND (b) transfers
        // whose from/to Xero accounts resolve to a valid PT
        // trust↔associated_cash pair. The lookup then becomes a true
        // date-range scan for unmapped trust movements.
        const isTrustMovementLookup = rawType === 'trust_movement';
        let trustValidPairs: Set<string> = new Set();
        let alreadyLinkedIds: Set<string> = new Set();
        if (isTrustMovementLookup) {
          try {
            const xeroBanks = await this.xeroBankAccountDetails.find({
              where: { integration_id },
            });
            const ptToXero = new Map<number, string>();
            for (const xb of xeroBanks) {
              if (xb.pt_bank_account_id && xb.account_id) {
                ptToXero.set(Number(xb.pt_bank_account_id), xb.account_id);
              }
            }
            const ptBanks = await this.bankAccounts.find({
              where: { company_id },
            });
            const trustList = ptBanks.filter((b) =>
              ['Project Trust Account', 'Retention Trust Account'].includes(
                String((b as any).account_type || ''),
              ),
            );
            for (const tb of trustList) {
              const cashId = Number((tb as any).associated_cash_account_id || 0);
              if (!cashId) continue;
              const trustXero = ptToXero.get(Number((tb as any).bank_account_id));
              const cashXero = ptToXero.get(cashId);
              if (trustXero && cashXero) {
                trustValidPairs.add(`${trustXero}|${cashXero}`);
                trustValidPairs.add(`${cashXero}|${trustXero}`);
              }
            }
          } catch (err: any) {
            this.logger.log(
              `[MANUAL_RESYNC_LOOKUP] trust_movement pair preload failed: ${err?.message || err}`,
            );
          }
        }
        const collected = new Map<string, { id: string; label: string; sublabel?: string }>();
        const accountLower = accountHint.toLowerCase();
        const parsedDate = dateHint && moment(dateHint).isValid()
          ? moment(dateHint).startOf('day')
          : null;
        const dateWindowDays = 7; // ± window when matching by date
        const hasHint = hint.length >= 2;
        // Bank transfers don't paginate; `from_date`/`to_date` widen
        // and bound the slice instead. Task #74 also widens when the
        // user supplied a `date` filter older than the default window.
        const defaultSince = moment().subtract(180, 'days');
        const widenedByDateHint = parsedDate
          ? moment.min(defaultSince, parsedDate.clone().subtract(dateWindowDays + 1, 'days'))
          : defaultSince;
        const btSince = fromDate || widenedByDateHint.toDate();
        let btRawCount = 0;
        // Task #74 — robust amount matching. The hint may contain
        // currency formatting like "1,234.50" or "$1234". Parse it once
        // and compare numerically with a 1c tolerance so "100" matches
        // both "100" and "100.00".
        const hintAmountNumeric = (() => {
          const stripped = hint.replace(/[^0-9.-]/g, '');
          if (!stripped) return null;
          const n = Number(stripped);
          return Number.isFinite(n) ? n : null;
        })();

        // (a) PT-side: numeric hint = pt_payment_id; otherwise treat as
        // reference substring. Only run when the user typed a text hint —
        // account/date-only searches are about Xero-side transfers we
        // don't already track.
        const ptHintNumeric = /^\d+$/.test(hint) ? Number(hint) : null;
        // For trust_movement lookups we want ONLY unmapped Xero
        // transfers — skip the PT-side query entirely, since every row
        // it returns has a non-null bank_transfer_id (already linked).
        if (hasHint && !isTrustMovementLookup) {
          try {
            const qb = this.xeroPayments
              .createQueryBuilder('xp')
              .where('xp.integration_id = :integration_id', { integration_id })
              .andWhere('xp.bank_transfer_id IS NOT NULL');
            if (ptHintNumeric != null) {
              qb.andWhere(
                '(xp.pt_payment_id = :pt OR xp.bank_transfer_reference ILIKE :ref)',
                { pt: ptHintNumeric, ref: `%${hint}%` },
              );
            } else {
              qb.andWhere('xp.bank_transfer_reference ILIKE :ref', {
                ref: `%${hint}%`,
              });
            }
            const ptRows = await qb.orderBy('xp.id', 'DESC').limit(10).getMany();
            for (const r of ptRows) {
              if (!r.bank_transfer_id || collected.has(r.bank_transfer_id)) continue;
              collected.set(r.bank_transfer_id, {
                id: r.bank_transfer_id,
                label: `[PayTrade] ${r.bank_transfer_reference || `BankTransfer ${r.bank_transfer_id.slice(0, 8)}…`}`,
                sublabel: `PT payment #${r.pt_payment_id} • ${fmtDate(r.payment_date)} • ${num(r.payment_amount).toFixed(2)}`,
              });
            }
          } catch (err: any) {
            this.logger.log(
              `[MANUAL_RESYNC_LOOKUP] PT-side bank_transfer search failed: ${err?.message || err}`,
            );
          }
        }

        // (b) Xero-side: recent transfers. Match by ANY supplied filter
        // (reference/amount text, from/to bank account name or code,
        // date within ±dateWindowDays). Surfaces transfers created
        // directly in Xero (no PT-RET-… reference) so admins can
        // reconcile them against PT retention payments.
        try {
          const resp = await this.xero.accountingApi.getBankTransfers(
            tenant_id,
            btSince,
            undefined,
            'Date DESC',
          );
          const list = resp?.body?.bankTransfers || [];
          btRawCount = list.length;
          // For trust_movement lookups, prefetch the set of already-
          // mapped BankTransfer IDs so we can exclude them in one pass.
          if (isTrustMovementLookup && list.length) {
            try {
              const ids = list
                .map((bt: any) => String(bt?.bankTransferID || ''))
                .filter(Boolean);
              if (ids.length) {
                const mapped = await this.xeroPayments.find({
                  where: { integration_id, bank_transfer_id: In(ids) },
                  select: ['bank_transfer_id'],
                });
                alreadyLinkedIds = new Set(
                  mapped.map((m) => String(m.bank_transfer_id)),
                );
              }
            } catch (err: any) {
              this.logger.log(
                `[MANUAL_RESYNC_LOOKUP] trust_movement linked-id preload failed: ${err?.message || err}`,
              );
            }
          }
          // Build a lookup of pt_bank_account_id → account_type so we
          // can infer direction (cash→trust vs trust→cash) and emit a
          // suggested_payment_type per candidate for trust_movement
          // lookups (Task #231).
          const xeroIdToPtType = new Map<string, { ptId: number; type: string }>();
          if (isTrustMovementLookup) {
            try {
              const xbs = await this.xeroBankAccountDetails.find({
                where: { integration_id },
              });
              const ptIds = xbs.map((x) => Number(x.pt_bank_account_id)).filter(Boolean);
              const ptBanksAll = ptIds.length
                ? await this.bankAccounts.find({
                    where: { bank_account_id: In(ptIds) },
                  })
                : [];
              const ptTypeById = new Map<number, string>();
              for (const b of ptBanksAll) {
                ptTypeById.set(Number((b as any).bank_account_id), String((b as any).account_type || ''));
              }
              for (const xb of xbs) {
                if (xb.account_id && xb.pt_bank_account_id) {
                  xeroIdToPtType.set(xb.account_id, {
                    ptId: Number(xb.pt_bank_account_id),
                    type: ptTypeById.get(Number(xb.pt_bank_account_id)) || '',
                  });
                }
              }
            } catch (err: any) {
              this.logger.log(
                `[MANUAL_RESYNC_LOOKUP] trust_movement direction map failed: ${err?.message || err}`,
              );
            }
          }
          for (const bt of list) {
            const id = String((bt as any)?.bankTransferID || '');
            if (!id || collected.has(id)) continue;
            let suggestedType: string | null = null;
            let suggestedAmbiguous = false;
            // Trust-movement constraints: unlinked + valid trust-pair.
            if (isTrustMovementLookup) {
              if (alreadyLinkedIds.has(id)) continue;
              const fromId = String((bt as any)?.fromBankAccount?.accountID || '');
              const toId = String((bt as any)?.toBankAccount?.accountID || '');
              if (!trustValidPairs.has(`${fromId}|${toId}`)) continue;
              // Suggested type via shared resolver inference.
              const TRUST = new Set([
                'Project Trust Account',
                'Retention Trust Account',
              ]);
              const fromMeta = xeroIdToPtType.get(fromId);
              const toMeta = xeroIdToPtType.get(toId);
              const fromIsTrust = !!fromMeta && TRUST.has(fromMeta.type);
              const trustMeta = fromIsTrust ? fromMeta : toMeta;
              const isRtaTrust = String(trustMeta?.type || '') === 'Retention Trust Account';
              const refTextRaw = `${(bt as any)?.reference || ''} ${(bt as any)?.narration || ''}`;
              const inf = XeroPaymentsService.inferTrustMovementType({
                fromIsTrust,
                isRtaTrust,
                refText: refTextRaw,
              });
              suggestedType = inf.payment_type;
              suggestedAmbiguous = inf.ambiguous;
            }
            const dt = (bt as any)?.date ? moment((bt as any).date) : null;
            if (toDate && dt?.isValid() && dt.toDate() > toDate) continue;
            const ref = String((bt as any)?.reference || '');
            const amtNum = Number((bt as any)?.amount);
            const fromAcc = (bt as any)?.fromBankAccount || {};
            const toAcc = (bt as any)?.toBankAccount || {};
            const fromName = String(fromAcc?.name || '');
            const fromCode = String(fromAcc?.code || '');
            const toName = String(toAcc?.name || '');
            const toCode = String(toAcc?.code || '');
            const btDate = (bt as any)?.date
              ? moment((bt as any).date)
              : null;

            const hintMatches =
              hasHint &&
              (ref.toLowerCase().includes(lower) ||
                (hintAmountNumeric != null &&
                  Number.isFinite(amtNum) &&
                  Math.abs(amtNum - hintAmountNumeric) < 0.01));
            const accountMatches =
              accountLower.length >= 2 &&
              (fromName.toLowerCase().includes(accountLower) ||
                fromCode.toLowerCase().includes(accountLower) ||
                toName.toLowerCase().includes(accountLower) ||
                toCode.toLowerCase().includes(accountLower));
            const dateMatches =
              !!parsedDate &&
              !!btDate &&
              btDate.isValid() &&
              Math.abs(btDate.diff(parsedDate, 'days')) <= dateWindowDays;

            // Require AT LEAST ONE filter to match (and ALL provided
            // filters that are restrictive — i.e. when both account and
            // date are supplied, both must match — so the candidate list
            // doesn't explode).
            const filtersProvided = [hasHint, accountLower.length >= 2, !!parsedDate].filter(Boolean).length;
            const filtersMatched = [hintMatches, accountMatches, dateMatches].filter(Boolean).length;
            if (filtersProvided === 0 || filtersMatched < filtersProvided) continue;

            const isPtOriginated = /^PT-RET-\d+/i.test(ref);
            const originTag = isPtOriginated ? '[PayTrade]' : '[Xero]';
            const accountSummary = (fromName || toName)
              ? `${fromName || '(?)'} → ${toName || '(?)'}`
              : '';
            const subParts = [
              fmtDate((bt as any)?.date),
              num((bt as any)?.amount).toFixed(2),
              accountSummary,
            ];
            if (suggestedType) {
              subParts.push(
                `suggested: ${suggestedType}${suggestedAmbiguous ? ' (uncertain)' : ''}`,
              );
            }
            collected.set(id, {
              id,
              label: `${originTag} ${ref || `BankTransfer ${id.slice(0, 8)}…`}`,
              sublabel: subParts.filter(Boolean).join(' • '),
              ...(suggestedType
                ? {
                    suggested_payment_type: suggestedType,
                    suggested_payment_type_ambiguous: suggestedAmbiguous,
                  }
                : {}),
            } as any);
            if (collected.size >= 10) break;
          }
        } catch (err: any) {
          this.logger.log(
            `[MANUAL_RESYNC_LOOKUP] Xero-side bank_transfer search failed: ${err?.message || err}`,
          );
        }

        const all = Array.from(collected.values());
        return {
          success: true,
          candidates: all.slice(0, 10),
          // BankTransfers endpoint has no pagination; flag "more" only
          // when we trimmed the collected set OR the raw Xero list looks
          // suspiciously large (>= 100 implies a busy window worth
          // narrowing).
          has_more: all.length > 10 || btRawCount >= 100,
          page,
          window: {
            from: btSince.toISOString(),
            to: toDate ? toDate.toISOString() : undefined,
          },
        };
      }

      // ─── CONTACT ──────────────────────────────────────────────────────
      if (rawType === 'contact') {
        const safe = hint.replace(/"/g, '\\"');
        let list: any[] = [];
        let rawCount = 0;
        const contactPageSize = 50;
        const contactSince = fromDate || new Date('1900-01-01T00:00:00.000+00:00');
        try {
          const resp = await this.xero.accountingApi.getContacts(
            tenant_id,
            contactSince,
            `Name!=null&&Name.Contains("${safe}")`,
            'Name ASC',
            [],
            page,
            true,
            true,
            '',
            contactPageSize,
          );
          list = resp?.body?.contacts || [];
          rawCount = list.length;
        } catch (err: any) {
          // Fall back to unfiltered first page if the where clause is
          // rejected by Xero (e.g. special characters).
          this.logger.log(
            `[MANUAL_RESYNC_LOOKUP] contact where clause failed, falling back: ${err?.message || err}`,
          );
          const resp = await this.xero.accountingApi.getContacts(
            tenant_id,
            fromDate || undefined,
            undefined,
            'Name ASC',
            [],
            page,
            true,
            true,
            '',
            500,
          );
          const all = resp?.body?.contacts || [];
          rawCount = all.length;
          list = all.filter((c: any) =>
            String(c?.name || '').toLowerCase().includes(lower),
          );
        }
        if (toDate) {
          list = list.filter((c: any) => {
            const u = c?.updatedDateUTC ? moment(c.updatedDateUTC) : null;
            return !u || !u.isValid() || u.toDate() <= toDate;
          });
        }
        const out = list.slice(0, 10).map((c: any) => ({
          id: String(c?.contactID || ''),
          label: c?.name || '(no name)',
          sublabel: [
            c?.emailAddress || null,
            c?.isCustomer ? 'Customer' : null,
            c?.isSupplier ? 'Supplier' : null,
            c?.contactStatus || null,
          ]
            .filter(Boolean)
            .join(' • '),
        }));
        return {
          success: true,
          candidates: out,
          has_more: rawCount >= contactPageSize || list.length > out.length,
          page,
          window: {
            from: contactSince.toISOString(),
            to: toDate ? toDate.toISOString() : undefined,
          },
        };
      }

      // ─── MANUAL JOURNAL ───────────────────────────────────────────────
      if (rawType === 'manual_journal') {
        const since = fromDate || moment().subtract(365, 'days').toDate();
        // Signature: tenantId, ifModifiedSince, where, order, page, pageSize.
        const mjPageSize = 100;
        const resp = await this.xero.accountingApi.getManualJournals(
          tenant_id,
          since,
          undefined,
          'UpdatedDateUTC DESC',
          page,
          mjPageSize,
        );
        const rawList = resp?.body?.manualJournals || [];
        const list = toDate
          ? rawList.filter((mj: any) => {
              const u = mj?.updatedDateUTC ? moment(mj.updatedDateUTC) : null;
              return !u || !u.isValid() || u.toDate() <= toDate;
            })
          : rawList;
        const matched = list.filter((mj: any) => {
          const narration = String(mj?.narration || '').toLowerCase();
          const ref = String(mj?.reference || '').toLowerCase();
          return narration.includes(lower) || ref.includes(lower);
        });
        const out = matched.slice(0, 10).map((mj: any) => ({
          id: String(mj?.manualJournalID || ''),
          label: mj?.narration || '(no narration)',
          sublabel: `${fmtDate(mj?.date)} • ${mj?.status || ''}${
            mj?.reference ? ` • Ref ${mj.reference}` : ''
          }`,
        }));
        return {
          success: true,
          candidates: out,
          has_more: rawList.length >= mjPageSize || matched.length > out.length,
          page,
          window: {
            from: since.toISOString(),
            to: toDate ? toDate.toISOString() : undefined,
          },
        };
      }

      return {
        success: false,
        message: `Unsupported type "${rawType}".`,
        candidates: [],
      };
    } catch (err: any) {
      const errMsg = await handleAxiosError(err).catch(
        () => err?.message || String(err),
      );
      this.logger.error(
        `[MANUAL_RESYNC_LOOKUP] unhandled error: ${errMsg}`,
      );
      return { success: false, message: errMsg, candidates: [] };
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Two-sided Manual Xero Sync helpers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Action token = HMAC over a canonical preflight tuple. Binds a
   * subsequent Run sync call to the exact (company, type, xero_id, pt_id,
   * recommendedAction) the user just reviewed, with a 10-minute TTL. This
   * prevents the UI from skipping the Check step or substituting a
   * different record between Check and Run.
   */
  private signManualSyncActionToken(payload: {
    company_id: number;
    type: string;
    xero_id: string;
    pt_id: string;
    recommendedAction: string;
  }): { token: string; expiresAt: number } {
    const ts = Date.now();
    const canonical = `${ts}|${payload.company_id}|${payload.type}|${payload.xero_id || ''}|${payload.pt_id || ''}|${payload.recommendedAction}`;
    const hash = crypto
      .createHmac('sha256', jwtConstants.secret as string)
      .update(canonical)
      .digest('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return {
      token: `${ts}.${payload.recommendedAction}.${hash}`,
      expiresAt: ts + 10 * 60 * 1000,
    };
  }

  private verifyManualSyncActionToken(
    token: string | null | undefined,
    payload: {
      company_id: number;
      type: string;
      xero_id: string;
      pt_id: string;
    },
  ): { ok: boolean; reason?: string; action?: string } {
    if (!token) return { ok: false, reason: 'missing' };
    const parts = String(token).split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed' };
    const [tsStr, action, hash] = parts;
    const ts = Number(tsStr);
    if (!ts || Date.now() - ts > 10 * 60 * 1000) {
      return { ok: false, reason: 'expired' };
    }
    const canonical = `${ts}|${payload.company_id}|${payload.type}|${payload.xero_id || ''}|${payload.pt_id || ''}|${action}`;
    const expected = crypto
      .createHmac('sha256', jwtConstants.secret as string)
      .update(canonical)
      .digest('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (expected !== hash) return { ok: false, reason: 'invalid' };
    return { ok: true, action };
  }

  /**
   * PT-side picker. Mirrors `manualXeroResyncLookup` but
   * searches PayTrade entities instead of pulling from Xero. Read-only.
   */
  async manualXeroPaytradeLookup(
    decoded: any,
    input: { company_id: number; type: string; hint: string },
  ): Promise<{
    success: boolean;
    message?: string;
    candidates: Array<{ id: string; label: string; sublabel?: string }>;
  }> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const hint = String(input?.hint || '').trim();
    if (!company_id || !rawType) {
      return {
        success: false,
        message: 'company_id and type are required.',
        candidates: [],
      };
    }
    if (hint.length < 2) {
      return { success: true, candidates: [] };
    }
    const lower = hint.toLowerCase();
    const numericHint = Number(hint.replace(/[^0-9.]/g, '')) || null;

    const fmtDate = (d: any): string => {
      if (!d) return '';
      try {
        return moment(d).format('YYYY-MM-DD');
      } catch {
        return '';
      }
    };
    const fmtAmt = (n: any): string => {
      const v = Number(n);
      return Number.isFinite(v) ? `$${v.toFixed(2)}` : '';
    };

    try {
      if (rawType === 'invoice_bill') {
        // PaymentClaims by claim_reference / payment_claim_id / amount /
        // contact name / project name / contract name.
        const qb = this.paymentClaims
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.clientSupplierDetails', 'cs')
          .leftJoinAndSelect('c.projectDetails', 'pj')
          .leftJoinAndSelect('c.contractDetails', 'ct')
          .where('c.company_id = :company_id', { company_id });
        const ors: string[] = [];
        const params: any = {};
        if (/^\d+$/.test(hint)) {
          ors.push('c.payment_claim_id = :pcid');
          params.pcid = Number(hint);
        }
        if (numericHint) {
          ors.push('CAST(c.claim_amount AS TEXT) ILIKE :amt');
          params.amt = `%${numericHint}%`;
        }
        ors.push('LOWER(c.claim_reference) LIKE :ref');
        params.ref = `%${lower}%`;
        ors.push('LOWER(cs.client_supplier_name) LIKE :name');
        ors.push('LOWER(COALESCE(cs.business_name, \'\')) LIKE :name');
        ors.push('LOWER(COALESCE(pj.project_name, \'\')) LIKE :name');
        ors.push('LOWER(COALESCE(ct.contract_name, \'\')) LIKE :name');
        params.name = `%${lower}%`;
        qb.andWhere('(' + ors.join(' OR ') + ')', params);
        qb.orderBy('c.created_on', 'DESC').limit(10);
        const rows = await qb.getMany();
        return {
          success: true,
          candidates: rows.map((r) => ({
            id: String(r.payment_claim_id),
            label: `Claim #${r.payment_claim_id}${r.claim_reference ? ` — ${r.claim_reference}` : ''}`,
            sublabel: `${r.claim_type} • ${fmtAmt(r.claim_amount)} • ${fmtDate(
              r.claim_type === 'Billable' ? r.received_date : r.sent_date,
            )} • ${r.clientSupplierDetails?.client_supplier_name || ''}${r.projectDetails?.project_name ? ` • ${r.projectDetails.project_name}` : ''}${r.contractDetails?.contract_name ? ` / ${r.contractDetails.contract_name}` : ''} • ${r.status}`,
          })),
        };
      }

      if (rawType === 'payment') {
        const qb = this.paymentDetails
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.clientSupplierDetails', 'cs')
          .where('p.company_id = :company_id', { company_id });
        const ors: string[] = [];
        const params: any = {};
        if (/^\d+$/.test(hint)) {
          ors.push('p.payment_id = :pid');
          params.pid = Number(hint);
        }
        if (numericHint) {
          ors.push('CAST(p.total_amount AS TEXT) ILIKE :amt');
          params.amt = `%${numericHint}%`;
        }
        ors.push('LOWER(COALESCE(p.memo, \'\')) LIKE :memo');
        params.memo = `%${lower}%`;
        ors.push('LOWER(cs.client_supplier_name) LIKE :name');
        params.name = `%${lower}%`;
        qb.andWhere('(' + ors.join(' OR ') + ')', params);
        qb.orderBy('p.created_on', 'DESC').limit(10);
        const rows = await qb.getMany();
        return {
          success: true,
          candidates: rows.map((r) => ({
            id: String(r.payment_id),
            label: `Payment #${r.payment_id} — ${fmtAmt(r.total_amount)}`,
            sublabel: `${r.payment_type || ''} • ${fmtDate(r.payment_date)} • ${r.clientSupplierDetails?.client_supplier_name || ''} • ${r.current_status || ''}`,
          })),
        };
      }

      if (rawType === 'contact') {
        const rows = await this.clientSuppliersDetails
          .createQueryBuilder('cs')
          .where('cs.company_id = :company_id', { company_id })
          .andWhere(
            '(LOWER(cs.client_supplier_name) LIKE :n OR LOWER(COALESCE(cs.business_name, \'\')) LIKE :n)',
            { n: `%${lower}%` },
          )
          .limit(10)
          .getMany();
        return {
          success: true,
          candidates: rows.map((r) => ({
            id: String(r.client_supplier_id),
            label: r.client_supplier_name,
            sublabel: `${r.client_supplier_type || ''}${r.business_name ? ` • ${r.business_name}` : ''}`,
          })),
        };
      }

      if (rawType === 'trust_movement') {
        // Task #231 — PT-side picker for trust-movement payments
        // (Withdrawal, Top Up, Interest Received/Withdrawal, Bank
        // Charge Applied/Top Up, Top Up Retention). Search the same
        // payment_details table as 'payment' but restricted to
        // trust-movement payment_types so the dialog only surfaces
        // PT-MOV-{id} candidates.
        const trustTypes = [
          'Withdrawal',
          'Top Up',
          'Interest Received',
          'Interest Withdrawal',
          'Bank Charge Applied',
          'Bank Charge Top Up',
          'Top Up Retention',
        ];
        const qb = this.paymentDetails
          .createQueryBuilder('p')
          .where('p.company_id = :company_id', { company_id })
          .andWhere('p.payment_type IN (:...trustTypes)', { trustTypes });
        const ors: string[] = [];
        const params: any = {};
        if (/^\d+$/.test(hint)) {
          ors.push('p.payment_id = :pid');
          params.pid = Number(hint);
        }
        if (numericHint) {
          ors.push('CAST(p.total_amount AS TEXT) ILIKE :amt');
          params.amt = `%${numericHint}%`;
        }
        // Allow searching by the PT-MOV-{id} reference stamp.
        const movMatch = /pt[-_ ]?mov[-_ ]?(\d+)/i.exec(hint);
        if (movMatch) {
          ors.push('p.payment_id = :movPid');
          params.movPid = Number(movMatch[1]);
        }
        ors.push('LOWER(COALESCE(p.memo, \'\')) LIKE :memo');
        params.memo = `%${lower}%`;
        if (ors.length) {
          qb.andWhere('(' + ors.join(' OR ') + ')', params);
        }
        qb.orderBy('p.created_on', 'DESC').limit(10);
        const rows = await qb.getMany();
        return {
          success: true,
          candidates: rows.map((r) => ({
            id: String(r.payment_id),
            label: `PT-MOV-${r.payment_id} — ${fmtAmt(r.total_amount)}`,
            sublabel: `${r.payment_type || ''} • ${fmtDate(r.payment_date)} • ${r.current_status || ''}`,
          })),
        };
      }

      // bank_transfer / manual_journal: not user-creatable from PT side via
      // this dialog. Retention transfers come from confirming a payment;
      // retention auto-journals come from gross-up. Direct PT-side
      // selection is intentionally unsupported.
      return {
        success: true,
        message:
          'PayTrade-side picker is not supported for this record type. Use the Xero-side picker only, or trigger this record from its source page.',
        candidates: [],
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.error(`[MANUAL_PT_LOOKUP] ${msg}`);
      return { success: false, message: msg, candidates: [] };
    }
  }

  /**
   * Pre-flight inspection for two-sided manual sync.
   * Read-only: classifies the record(s), inspects mapping, payment-status
   * and reconciliation, then proposes a direction (`import` / `push` /
   * `link` / `blocked`) and signs an action token the Run-sync caller
   * must echo back.
   */
  /**
   * Task #140 — shared credit-note correlation. Returns Xero credit
   * notes whose first allocation targets `invoiceID`. Used by both the
   * standard inbound flow (`validateAndProcessWebhookInvoice`) and the
   * manual pre-flight (`manualXeroPreflight`) so the two paths can
   * never disagree about whether a residual is covered by a credit
   * note. Behaviour deliberately mirrors the original inline lookup
   * (paged at 100, allocations[0] only) — do not change without
   * touching both call sites.
   */
  private async findCreditNotesAllocatedToInvoice(
    tenant_id: string,
    invoiceID: string | undefined,
  ): Promise<CreditNote[]> {
    const matched: CreditNote[] = [];
    if (!invoiceID) return matched;
    const allCreditNotes = await this.xero.accountingApi.getCreditNotes(
      tenant_id,
      new Date('1900-01-01T00:00:00.000-00:00'),
      null,
      'CreditNoteNumber ASC',
      1,
      4,
      100,
    );
    if (allCreditNotes?.body?.creditNotes?.length > 0) {
      for (const creditNote of allCreditNotes.body.creditNotes) {
        if (
          Array.isArray(creditNote?.allocations) &&
          creditNote?.allocations[0]?.invoice?.invoiceID === invoiceID
        ) {
          matched.push(creditNote);
        }
      }
    }
    return matched;
  }

  /**
   * Task #147 — Shared amount/date tolerance comparator used by both the
   * catch-up discovery layer (`manualXeroCatchupDiscover`) and the
   * preflight's payment-leg matcher (`manualXeroPreflight`). Returns
   * true when |amtA − amtB| ≤ amtTol AND (if both dates are present)
   * |daysBetween(dateA, dateB)| ≤ dayTol. This is the canonical
   * "is this the same record" rule — keeping the two layers in lock-
   * step prevents discovery from flagging "needs_link" only for the
   * preflight to disagree on Run sync.
   */
  private compareAmountAndDate(
    amtA: number,
    amtB: number,
    dateA: any,
    dateB: any,
    amtTol = 0.01,
    dayTol = 2,
  ): boolean {
    if (Math.abs((Number(amtA) || 0) - (Number(amtB) || 0)) > amtTol) {
      return false;
    }
    if (!dateA || !dateB) return true;
    try {
      return Math.abs(moment(dateA).diff(moment(dateB), 'days')) <= dayTol;
    } catch {
      return true;
    }
  }

  /**
   * Task #147 — Catch-up discovery mode for Manual Xero Sync.
   *
   * Read-only. Given a user-defined date window and a record type,
   * lists every PT-side and Xero-side record in the window with its
   * mapping/link status and a per-row classification:
   *   - already_in_sync  — both sides exist and are linked
   *   - needs_link       — both sides exist (matched by reference,
   *                        or by amount + date) but no mapping row
   *   - needs_push       — exists in PT only
   *   - needs_import     — exists in Xero only
   *   - blocked          — push unsupported (e.g. PT-only Paid claim)
   *
   * No new sync engine. The frontend then drives the existing per-row
   * `manualXeroPreflight` + `manualXeroTwoSidedSync` sequentially. The
   * discovery's classification is a hint — the per-row preflight
   * remains the authoritative gate (and signs the action token).
   */
  async manualXeroCatchupDiscover(
    decoded: any,
    input: {
      company_id: number;
      type: string;
      from_date: string;
      to_date: string;
    },
  ): Promise<any> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const fromStr = String(input?.from_date || '').trim();
    const toStr = String(input?.to_date || '').trim();

    const allowedTypes = new Set([
      'invoice_bill',
      'payment',
      'contact',
      'trust_movement',
    ]);
    if (!company_id || !rawType) {
      return { success: false, message: 'company_id and type are required.' };
    }
    if (!allowedTypes.has(rawType)) {
      return {
        success: false,
        message: `Catch-up discovery is supported for invoice_bill, payment, contact and trust_movement only. ("${rawType}" is not catch-up-eligible — generic bank transfers and manual journals are produced as side-effects of other syncs and have no standalone discovery surface.)`,
      };
    }
    if (!fromStr || !toStr) {
      return { success: false, message: 'from_date and to_date are required.' };
    }
    const fromDate = moment(fromStr, [moment.ISO_8601, 'YYYY-MM-DD'], true);
    const toDate = moment(toStr, [moment.ISO_8601, 'YYYY-MM-DD'], true);
    if (!fromDate.isValid() || !toDate.isValid()) {
      return {
        success: false,
        message: 'from_date and to_date must be ISO dates (YYYY-MM-DD).',
      };
    }
    if (fromDate.isAfter(toDate)) {
      return { success: false, message: 'from_date must be on or before to_date.' };
    }
    const windowDays = toDate.diff(fromDate, 'days');
    if (windowDays > 366) {
      return {
        success: false,
        message: 'Date window cannot exceed 366 days. Pick a tighter range.',
      };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        success: false,
        message: 'No active Xero integration found for this company.',
      };
    }
    const integration_id = xeroDetails.integration_id;
    const tenant_id = xeroDetails.tenant_id;

    // Inclusive end-of-day for the upper bound so a same-day record at
    // 23:59 is included. Xero `where` clauses use `DateTime(y,m,d)`.
    const fromIso = fromDate.format('YYYY-MM-DD');
    const toIso = toDate.format('YYYY-MM-DD');
    const fromYmd = `DateTime(${fromDate.year()},${fromDate.month() + 1},${fromDate.date()})`;
    const toYmd = `DateTime(${toDate.year()},${toDate.month() + 1},${toDate.date()})`;
    // Task #149 — auto-page Xero fetches up to a higher hard cap with
    // a server-side time budget so dense catch-up windows (>200 rows
    // per side) no longer silently hide records behind the
    // "truncated" warning. The cap and budget are both safety rails:
    // whichever trips first sets `truncated = true` so the UI can
    // still warn the user that more rows may exist.
    //   PER_SIDE_CAP — hard ceiling per side (PT and Xero each).
    //   XERO_PAGE_SIZE — Xero accounting API page size (fixed at 100).
    //   MAX_XERO_PAGES — derived: enough pages to fill the cap.
    //   TIME_BUDGET_MS — wall-clock budget for the whole discovery
    //     request. Stops paging once exceeded (the rows already
    //     gathered are still returned with truncated=true).
    const PER_SIDE_CAP = 1000;
    const XERO_PAGE_SIZE = 100;
    const MAX_XERO_PAGES = Math.ceil(PER_SIDE_CAP / XERO_PAGE_SIZE);
    const TIME_BUDGET_MS = 25_000;
    const startedAt = Date.now();
    const budgetExceeded = () => Date.now() - startedAt > TIME_BUDGET_MS;

    type Row = {
      key: string;
      classification:
        | 'already_in_sync'
        | 'needs_link'
        | 'amounts_disagree'
        | 'needs_push'
        | 'needs_import'
        | 'blocked';
      type: string;
      pt_id: string | null;
      xero_id: string | null;
      label: string;
      sublabel: string;
      hint?: string;
      pt_summary?: string;
      xero_summary?: string;
      // Task #151 — diagnostic / row-detail payload. Each side carries
      // a flat list of {label, value} pairs the FE renders verbatim in
      // the secondary "Catch-up row details" dialog. Tracking option
      // info is surfaced raw so operators can see WHY a Xero record
      // came back as needs_import (e.g. tagged with a Xero project
      // option that PayTrade hasn't linked).
      pt_details?: Array<{ label: string; value: string }>;
      xero_details?: Array<{ label: string; value: string }>;
      project_name?: string | null;
      contract_name?: string | null;
      xero_tracking_option_name?: string | null;
      xero_tracking_option_id?: string | null;
      xero_deep_link?: string | null;
      paytrade_deep_link?: string | null;
      // Task #151 follow-up — cheap in-memory pre-checks surfaced in
      // discovery so the operator can see which rows will likely fail
      // BEFORE hitting Run sync. Each issue is a short human-readable
      // string. Populated only for invoice_bill rows today; rows with
      // any blocking_issues are still selectable — operator chooses
      // whether to attempt the sync anyway.
      blocking_issues?: string[];
      // Task #151 follow-up — per-line validation against the
      // operator's configured Xero settings (Invoice/Bill account
      // code + tax code). Each entry is a short human-readable line
      // prefixed with ✓ (match), ⚠ (mismatch) or ✗ (missing). FE
      // renders these in a dedicated "Settings match" panel at the
      // top of the row-detail dialog so the operator can see at a
      // glance WHY a Xero record qualifies as importable before
      // ever opening the line items.
      validation_checks?: string[];
      // Task #152 — single derived flag the FE renders as a column
      // chip on the catch-up table so operators can tell at a glance
      // which rows match the configured Xero settings without
      // opening the row-detail dialog. Computed from validation_checks
      // (`ok` = all ✓, `warning` = at least one ⚠ but no ✗, `fail` =
      // any ✗ — typically a missing/unresolvable account code which
      // WILL block inbound import).
      settings_match?: 'ok' | 'warning' | 'fail';
    };
    const rows: Row[] = [];

    // Task #151 — row-detail formatting helpers + deep-link adapter.
    const fmtMoney = (v: any): string =>
      `$${(Number(v) || 0).toFixed(2)}`;
    const fmtDate = (v: any): string => {
      if (!v) return '—';
      try {
        const m = moment(v);
        return m.isValid() ? m.format('DD/MM/YYYY') : String(v);
      } catch {
        return String(v);
      }
    };
    const detail = (
      label: string,
      value: any,
    ): { label: string; value: string } => ({
      label,
      value:
        value === null || value === undefined || value === ''
          ? '—'
          : String(value),
    });
    const buildDeepLinks = (
      syncType: string,
      ptId: string | number | null | undefined,
      xeroId: string | null | undefined,
      xeroRecord: any,
      paytradeRecord: any,
      ptDetailsObj: Record<string, any> = {},
      xeroDetailsObj: Record<string, any> = {},
    ): { xero: string | null; pt: string | null } => {
      const looseRow = {
        sync_type: syncType,
        xero_id: xeroId ?? null,
        paytrade_id: ptId != null ? String(ptId) : null,
        xero_records: xeroRecord ? [xeroRecord] : [],
        paytrade_records: paytradeRecord ? [paytradeRecord] : [],
        xero_details: xeroDetailsObj,
        paytrade_details: ptDetailsObj,
      };
      return {
        xero: buildXeroSyncLogDeepLink(looseRow),
        pt: buildPaytradeSyncLogDeepLink(looseRow),
      };
    };
    const notes: Record<string, any> = {};
    let truncated = false;

    try {
      await this.xeroService.refreshTokenSet(company_id, this.xero);

      if (rawType === 'trust_movement') {
        // Task #231 — Trust movement catch-up discovery.
        //
        // Strategy:
        //   • Scope: BankTransfers in the date window whose from/to
        //     accounts resolve to a valid trust↔associated-cash pair
        //     owned by this company (same invariant the inbound
        //     resolver enforces).
        //   • Xero side: paged BankTransfer fetch, anti-echo skip for
        //     our own PT-MOV-{id} / PT-MOV-REV-{id} stamps (no row),
        //     and PT-RET-* (retention) which has its own catch-up.
        //     Each candidate that isn't yet linked to a PT payment is
        //     classified `needs_import` with the inferred suggested
        //     payment_type; already-mapped rows are `already_in_sync`.
        //   • PT side: trust-movement payments in window with no
        //     forward `bank_transfer_id` mapping → classified
        //     `needs_push` so the operator can recover PT-origin
        //     records that never made it to Xero.

        // `inferTrustMovementType` is a static method on
        // XeroPaymentsService — call it via the constructor, not the
        // instance. Input shape is { fromIsTrust, isRtaTrust, refText }
        // (NOT bank-account ids — the caller derives those from the
        // pre-loaded trust↔cash pair map and account-type lookup).
        const inferType = (XeroPaymentsService as any).inferTrustMovementType?.bind(
          XeroPaymentsService,
        );

        // ---- PT side: unlinked PT trust movements in window ----
        const isTrustMovementType = (t: string | null | undefined): boolean => {
          const s = String(t || '').toLowerCase();
          return (
            s === 'withdrawal' ||
            s === 'top up' ||
            s === 'interest received' ||
            s === 'interest withdrawal' ||
            s === 'bank charge applied' ||
            s === 'bank charge top up' ||
            s === 'top up retention'
          );
        };
        const ptPayments = await this.paymentDetails
          .createQueryBuilder('p')
          .where('p.company_id = :company_id', { company_id })
          .andWhere('p.payment_date >= :from AND p.payment_date < :to', {
            from: fromDate.startOf('day').toDate(),
            to: toDate.clone().add(1, 'day').startOf('day').toDate(),
          })
          .andWhere(
            "(p.deleted IS NULL OR p.deleted = false) AND (p.status IS NULL OR p.status <> 'cancelled')",
          )
          .orderBy('p.payment_date', 'DESC')
          .limit(PER_SIDE_CAP + 1)
          .getMany()
          .catch(() => [] as any[]);
        if (ptPayments.length > PER_SIDE_CAP) {
          truncated = true;
          ptPayments.length = PER_SIDE_CAP;
        }
        const eligiblePt = ptPayments.filter((p: any) =>
          isTrustMovementType(p.payment_type),
        );
        const eligibleIds = eligiblePt.map((p: any) => Number(p.payment_id));
        const ptMappings = eligibleIds.length
          ? await this.xeroPayments
              .createQueryBuilder('x')
              .where('x.integration_id = :integration_id', { integration_id })
              .andWhere('x.pt_payment_id IN (:...ids)', { ids: eligibleIds })
              .getMany()
          : [];
        const ptIdToMapping = new Map<number, any>();
        for (const m of ptMappings) {
          if (m.pt_payment_id) ptIdToMapping.set(Number(m.pt_payment_id), m);
        }
        for (const p of eligiblePt) {
          const ptKey = `pt:${p.payment_id}`;
          const mapping = ptIdToMapping.get(Number(p.payment_id));
          const linked = !!mapping?.bank_transfer_id;
          const ptSummary = `Payment ${p.payment_id} (${p.payment_type}) — $${Number(p.total_amount || 0).toFixed(2)} — ${fmtDate(p.payment_date)}`;
          if (linked) {
            rows.push({
              key: ptKey,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(p.payment_id),
              xero_id: mapping.bank_transfer_id,
              label: `PT-MOV-${p.payment_id}`,
              sublabel: `${p.payment_type} — already linked to BankTransfer ${mapping.bank_transfer_id}`,
              pt_summary: ptSummary,
              xero_summary: `BankTransfer ${mapping.bank_transfer_id}`,
            });
          } else {
            rows.push({
              key: ptKey,
              classification: 'needs_push',
              type: rawType,
              pt_id: String(p.payment_id),
              xero_id: null,
              label: `PT payment ${p.payment_id}`,
              sublabel: `${p.payment_type} — not yet pushed to Xero`,
              hint: 'Use "Run sync" to create PT-MOV-{id} BankTransfer in Xero.',
              pt_summary: ptSummary,
            });
          }
        }

        // ---- Xero side: BankTransfers in window ----
        // Build trust↔associated-cash pair map from PT bank accounts so
        // we can quickly reject transfers that are not trust-movement
        // candidates without round-tripping to PT for each one.
        const xeroBankAccounts = await this.xeroBankAccountDetails.find({
          where: { integration_id },
        });
        const xeroAcctIdToPtBank = new Map<string, number>();
        for (const xa of xeroBankAccounts) {
          if (xa.account_id && xa.pt_bank_account_id) {
            xeroAcctIdToPtBank.set(
              String(xa.account_id),
              Number(xa.pt_bank_account_id),
            );
          }
        }
        const trustPairs = await (async () => {
          // Lazy-load PT bank account pair table — one query.
          // `bank_accounts.bank_account_id` is the integer surrogate
          // referenced by `xero_bank_account_details.pt_bank_account_id`,
          // and `account_type` is the human-readable enum value
          // ('Project Trust Account' / 'Retention Trust Account' / 'Cash Account').
          try {
            const sql = `
              SELECT b.bank_account_id AS trust_id,
                     b.associated_cash_account_id AS cash_id,
                     b.account_type AS trust_account_type
              FROM bank_accounts b
              WHERE b.company_id = $1
                AND b.account_type IN ('Project Trust Account', 'Retention Trust Account')
                AND b.associated_cash_account_id IS NOT NULL
            `;
            const r = await this.paymentDetails.query(sql, [company_id]);
            return (r || []).map((row: any) => ({
              trust_id: Number(row.trust_id),
              cash_id: Number(row.cash_id),
              trust_account_type: String(row.trust_account_type || ''),
            }));
          } catch {
            return [] as Array<{
              trust_id: number;
              cash_id: number;
              trust_account_type: string;
            }>;
          }
        })();
        const trustPairSet = new Set<string>();
        // Map a (fromPt → toPt) directed key to { trustOnFrom, isRtaTrust }
        // so we can compute `fromIsTrust` + `isRtaTrust` for the inferer
        // in O(1) without re-querying account types per transfer.
        const trustPairMeta = new Map<
          string,
          { trustOnFrom: boolean; isRtaTrust: boolean }
        >();
        for (const pair of trustPairs) {
          const isRta =
            pair.trust_account_type === 'Retention Trust Account';
          trustPairSet.add(`${pair.trust_id}:${pair.cash_id}`);
          trustPairSet.add(`${pair.cash_id}:${pair.trust_id}`);
          trustPairMeta.set(`${pair.trust_id}:${pair.cash_id}`, {
            trustOnFrom: true,
            isRtaTrust: isRta,
          });
          trustPairMeta.set(`${pair.cash_id}:${pair.trust_id}`, {
            trustOnFrom: false,
            isRtaTrust: isRta,
          });
        }

        // Xero accountingApi.getBankTransfers does NOT page (it returns
        // all transfers since `ifModifiedSince`). We pass the lower
        // bound and client-side filter the upper bound against the
        // BankTransfer `date` field (the only timestamp the type
        // exposes — `updatedDateUTC` is not on BankTransfer).
        const btRaw: any[] = [];
        const btToUpper = toDate.clone().endOf('day').toDate();
        try {
          if (!budgetExceeded()) {
            const resp = await this.xero.accountingApi.getBankTransfers(
              tenant_id,
              fromDate.startOf('day').toDate(),
              undefined,
              'Date DESC',
            );
            const batchAll = resp?.body?.bankTransfers || [];
            for (const bt of batchAll) {
              const d = (bt as any)?.date;
              let withinUpper = true;
              if (d) {
                try {
                  withinUpper = moment(d).toDate() <= btToUpper;
                } catch {
                  withinUpper = true;
                }
              }
              if (!withinUpper) continue;
              btRaw.push(bt);
              if (btRaw.length >= PER_SIDE_CAP) {
                truncated = true;
                break;
              }
            }
          } else {
            truncated = true;
          }
        } catch (e: any) {
          notes.xero_bank_transfers_error = e?.message || String(e);
        }

        // Pre-load existing xero_payments rows for the BT ids we found so
        // we can classify already_in_sync vs needs_import without N
        // round-trips.
        const btIds = btRaw.map((bt: any) => bt?.bankTransferID).filter(Boolean);
        const existingByBtId = new Map<string, any>();
        if (btIds.length) {
          const existing = await this.xeroPayments
            .createQueryBuilder('x')
            .where('x.integration_id = :integration_id', { integration_id })
            .andWhere('x.bank_transfer_id IN (:...ids)', { ids: btIds })
            .getMany();
          for (const row of existing) {
            if (row.bank_transfer_id) {
              existingByBtId.set(String(row.bank_transfer_id), row);
            }
          }
        }

        for (const bt of btRaw) {
          const xeroId = String(bt?.bankTransferID || '');
          if (!xeroId) continue;
          const reference = String(bt?.reference || '');
          // Skip retention transfers (separate catch-up flow).
          if (/^PT-RET-(REV-)?\d+$/.test(reference)) continue;
          // Skip our own outbound trust-movement stamps when already
          // mapped (anti-echo). If unmapped, fall through and surface
          // as a recoverable import.
          const mappedRow = existingByBtId.get(xeroId);
          const fromAcct = String(bt?.fromBankAccount?.accountID || '');
          const toAcct = String(bt?.toBankAccount?.accountID || '');
          const fromPt = xeroAcctIdToPtBank.get(fromAcct);
          const toPt = xeroAcctIdToPtBank.get(toAcct);
          const isTrustPair =
            fromPt != null &&
            toPt != null &&
            trustPairSet.has(`${fromPt}:${toPt}`);
          if (!isTrustPair) continue;
          const key = `xero:${xeroId}`;
          if (rows.find((r) => r.key === key)) continue;
          const xeroSummary = `BankTransfer ${xeroId} — $${Number(bt.amount || 0).toFixed(2)} — ${fmtDate(bt.date)}${reference ? ` — "${reference}"` : ''}`;
          if (mappedRow?.pt_payment_id) {
            rows.push({
              key,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(mappedRow.pt_payment_id),
              xero_id: xeroId,
              label: `BankTransfer ${xeroId.slice(0, 8)}…`,
              sublabel: `Already linked to PT payment #${mappedRow.pt_payment_id}`,
              xero_summary: xeroSummary,
            });
            continue;
          }
          // Suggest payment_type for the import action.
          let suggestedType: string | null = null;
          try {
            const meta = trustPairMeta.get(`${fromPt}:${toPt}`);
            if (inferType && meta) {
              suggestedType =
                inferType({
                  fromIsTrust: meta.trustOnFrom,
                  isRtaTrust: meta.isRtaTrust,
                  refText: reference,
                })?.payment_type || null;
            }
          } catch {
            suggestedType = null;
          }
          rows.push({
            key,
            classification: 'needs_import',
            type: rawType,
            pt_id: null,
            xero_id: xeroId,
            label: `BankTransfer ${xeroId.slice(0, 8)}…`,
            sublabel: suggestedType
              ? `Inbound — would import as "${suggestedType}"`
              : 'Inbound — type inference ambiguous',
            hint: 'Use "Run sync" to import as a PT trust-movement payment.',
            xero_summary: xeroSummary,
          });
        }

        notes.trust_movement_pairs_loaded = trustPairs.length;
        notes.trust_movement_xero_bank_transfers_scanned = btRaw.length;
        notes.trust_movement_pt_payments_scanned = eligiblePt.length;

        const counts = {
          total: rows.length,
          already_in_sync: rows.filter(
            (r) => r.classification === 'already_in_sync',
          ).length,
          needs_link: rows.filter((r) => r.classification === 'needs_link').length,
          needs_push: rows.filter((r) => r.classification === 'needs_push').length,
          needs_import: rows.filter((r) => r.classification === 'needs_import').length,
          blocked: rows.filter((r) => r.classification === 'blocked').length,
        };
        return {
          success: true,
          type: rawType,
          company_id,
          from_date: fromIso,
          to_date: toIso,
          rows,
          counts,
          notes,
          truncated,
          per_side_cap: PER_SIDE_CAP,
          elapsed_ms: Date.now() - startedAt,
        };
      }

      if (rawType === 'invoice_bill') {
        // Build the Xero project / contract tracking-option → PT id
        // maps so we can scope discovery to records that touch a
        // tracking option this company has linked to a PT
        // project / contract. Per task requirements: discovery only
        // surfaces records "with a Xero-linked project/contract".
        const xeroProjects = await this.xeroProjectDetails.find({
          where: { integration_id },
        });
        const xeroContracts = await this.xeroContractDetails.find({
          where: { integration_id },
        });
        const trackingToPtProject = new Map<string, number>();
        // Name-fallback map: Xero's /Invoices LIST endpoint returns
        // tracking entries with `option` (the option name, e.g.
        // "2501 - Alba") populated but `trackingOptionID` is often
        // NULL — full option IDs only come back from GET-by-ID. To
        // avoid a per-record detail fetch, we also key the map by
        // lowercased option name as a fallback when ID is missing.
        const trackingNameToPtProject = new Map<string, number>();
        for (const p of xeroProjects) {
          if (p.pt_project_id) {
            if (p.project_id) {
              trackingToPtProject.set(
                String(p.project_id).toLowerCase(),
                Number(p.pt_project_id),
              );
            }
            if (p.project_name) {
              trackingNameToPtProject.set(
                String(p.project_name).trim().toLowerCase(),
                Number(p.pt_project_id),
              );
            }
          }
        }
        const trackingToPtContract = new Map<string, number>();
        const trackingNameToPtContract = new Map<string, number>();
        for (const c of xeroContracts) {
          if (c.pt_contract_id) {
            if (c.contract_id) {
              trackingToPtContract.set(
                String(c.contract_id).toLowerCase(),
                Number(c.pt_contract_id),
              );
            }
            if (c.contract_name) {
              trackingNameToPtContract.set(
                String(c.contract_name).trim().toLowerCase(),
                Number(c.pt_contract_id),
              );
            }
          }
        }

        // PT side — claims created in window. Project-tracking-linked
        // scope: the claim must carry both a project_id and a
        // contract_id (those are the rows that flow through Xero
        // with tracking categories). Claims with no project or no
        // contract are out of scope for catch-up — they wouldn't
        // round-trip cleanly anyway.
        const ptClaims = await this.paymentClaims
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.clientSupplierDetails', 'cs')
          .leftJoinAndSelect('c.projectDetails', 'pj')
          .leftJoinAndSelect('c.contractDetails', 'ct')
          .where('c.company_id = :company_id', { company_id })
          .andWhere('c.project_id IS NOT NULL')
          .andWhere('c.contract_id IS NOT NULL')
          .andWhere('c.created_on >= :from AND c.created_on < :to', {
            from: fromDate.startOf('day').toDate(),
            to: toDate.clone().add(1, 'day').startOf('day').toDate(),
          })
          .orderBy('c.created_on', 'DESC')
          .limit(PER_SIDE_CAP + 1)
          .getMany();
        if (ptClaims.length > PER_SIDE_CAP) {
          truncated = true;
          ptClaims.length = PER_SIDE_CAP;
        }
        const ptClaimIds = ptClaims.map((c) => c.payment_claim_id);
        const localMappings = ptClaimIds.length
          ? await this.xeroInvoicesBills
              .createQueryBuilder('x')
              .where('x.integration_id = :integration_id', { integration_id })
              .andWhere('x.pt_claim_id IN (:...ids)', { ids: ptClaimIds })
              .getMany()
          : [];
        const ptToXeroMap = new Map<number, XeroInvoicesBills>();
        for (const m of localMappings) {
          if (m.pt_claim_id) ptToXeroMap.set(Number(m.pt_claim_id), m);
        }

        // Xero side — invoices CREATED OR MODIFIED in window.
        //
        // Catch-up semantics: the user's mental model is "what's new in
        // Xero since I last synced", which means we must filter by when
        // the record was created/updated in Xero — NOT by the
        // transactional `Date` field stamped on the bill (which can be
        // backdated to the supplier's invoice date and fall outside the
        // window even for bills created today).
        //
        // We mirror the contact-side approach: pass `ifModifiedSince`
        // as the lower bound and client-side filter the upper bound
        // by `updatedDateUTC` so the explicit date window is honoured.
        // Auto-page up to MAX_XERO_PAGES or until the time budget is
        // exhausted.
        // Sort ASC by UpdatedDateUTC so we can early-break once a record's
        // updatedDateUTC exceeds the upper bound — guarantees we don't
        // burn the page budget on post-window rows and miss in-window
        // records below them. Raw fetched count drives truncation
        // detection so a full page-budget run still flags truncated=true
        // even if the filter dropped some.
        const xeroInvoicesRaw: any[] = [];
        const invToUpper = toDate.clone().endOf('day').toDate();
        let invStoppedByUpper = false;
        try {
          for (let page = 1; page <= MAX_XERO_PAGES; page++) {
            if (budgetExceeded()) {
              truncated = true;
              break;
            }
            const resp = await this.xero.accountingApi.getInvoices(
              tenant_id,
              fromDate.startOf('day').toDate(),
              undefined,
              'UpdatedDateUTC ASC',
              undefined,
              undefined,
              undefined,
              undefined,
              page,
              undefined, // includeArchived
              undefined, // createdByMyApp
              undefined, // unitdp
              false,     // summaryOnly — REQUIRED so Xero returns
                         // LineItems (and therefore tracking
                         // categories), otherwise paginated list
                         // responses come back as summary-only and
                         // every invoice gets dropped by the
                         // tracking-category resolver.
            );
            const batchAll = resp?.body?.invoices || [];
            for (const inv of batchAll) {
              const u = inv?.updatedDateUTC;
              let withinUpper = true;
              if (u) {
                try {
                  withinUpper = moment(u).toDate() <= invToUpper;
                } catch {
                  withinUpper = true;
                }
              }
              if (!withinUpper) {
                invStoppedByUpper = true;
                break;
              }
              xeroInvoicesRaw.push(inv);
            }
            if (invStoppedByUpper) break;
            if (batchAll.length < XERO_PAGE_SIZE) break;
            if (xeroInvoicesRaw.length >= PER_SIDE_CAP) {
              truncated = true;
              xeroInvoicesRaw.length = PER_SIDE_CAP;
              break;
            }
            if (page === MAX_XERO_PAGES && batchAll.length === XERO_PAGE_SIZE) {
              // Hit page ceiling with a full page — there may still be
              // in-window rows we never fetched.
              truncated = true;
            }
          }
        } catch (e: any) {
          return {
            success: false,
            message: `Xero invoice fetch failed: ${e?.message || e}`,
          };
        }

        // Resolve each Xero invoice's tracking → PT project / contract
        // (via XeroProjectDetails / XeroContractDetails). Drop any
        // invoice whose tracking does NOT resolve to a known PT
        // project/contract — those are out of catch-up scope.
        type XeroInvWithLinks = {
          inv: any;
          ptProjectId: number | null;
          ptContractId: number | null;
        };
        const xeroInvoices: XeroInvWithLinks[] = [];
        let xeroSkippedNoTracking = 0;
        for (const inv of xeroInvoicesRaw) {
          let ptProjectId: number | null = null;
          let ptContractId: number | null = null;
          for (const li of inv?.lineItems || []) {
            for (const t of li?.tracking || []) {
              const opt = t?.trackingOptionID
                ? String(t.trackingOptionID).toLowerCase()
                : null;
              const optName = t?.option
                ? String(t.option).trim().toLowerCase()
                : null;
              // Prefer ID match; fall back to option-name match
              // because Xero's /Invoices LIST endpoint frequently
              // returns trackingOptionID = null while populating the
              // option name. (The single-record GET /Invoices/{id}
              // path used by the regular webhook + manual single-record
              // import always returns a populated trackingOptionID,
              // so this fallback only matters for the catch-up
              // discovery flow.)
              const projHit =
                (opt ? trackingToPtProject.get(opt) : null) ||
                (optName ? trackingNameToPtProject.get(optName) : null) ||
                null;
              const ctrHit =
                (opt ? trackingToPtContract.get(opt) : null) ||
                (optName ? trackingNameToPtContract.get(optName) : null) ||
                null;
              if (!opt && !optName) continue;
              if (!ptProjectId && projHit) ptProjectId = projHit;
              if (!ptContractId && ctrHit) ptContractId = ctrHit;
            }
            if (ptProjectId && ptContractId) break;
          }
          if (ptProjectId) {
            xeroInvoices.push({ inv, ptProjectId, ptContractId });
          } else {
            xeroSkippedNoTracking++;
          }
        }
        // Stash for response counts so the FE can show a helpful hint
        // when Xero returned records but tracking-resolution dropped
        // them all (otherwise the user sees "0 rows" with no clue why).
        notes.xero_skipped_no_tracking = xeroSkippedNoTracking;
        notes.xero_total_in_window = xeroInvoicesRaw.length;
        notes.tracking_map_projects = trackingToPtProject.size;
        notes.tracking_map_contracts = trackingToPtContract.size;

        // Index by invoiceNumber (lower-cased) for reference matching.
        const xeroByNumber = new Map<string, XeroInvWithLinks>();
        for (const x of xeroInvoices) {
          if (x.inv?.invoiceNumber) {
            xeroByNumber.set(
              String(x.inv.invoiceNumber).trim().toLowerCase(),
              x,
            );
          }
        }
        const consumedXeroIds = new Set<string>();

        // Walk PT claims first. Matching rule (one source of truth
        // with preflight): invoice number first, then
        // contract+amount±$0.01+date±2days using the shared
        // compareAmountAndDate comparator.
        for (const claim of ptClaims) {
          const mapping = ptToXeroMap.get(Number(claim.payment_claim_id));
          const ptSummary = `Claim #${claim.payment_claim_id}${claim.claim_reference ? ` — ${claim.claim_reference}` : ''} • ${claim.claim_type} • $${Number(claim.claim_amount || 0).toFixed(2)} • ${claim.clientSupplierDetails?.client_supplier_name || ''} • ${claim.status}`;
          if (mapping?.invoice_id) {
            consumedXeroIds.add(String(mapping.invoice_id));
            // Already linked. Compare totals (amount tolerance only —
            // dates can legitimately differ once Xero has paid the
            // invoice on a different day) to flag amounts_disagree.
            const amountsAgree =
              this.compareAmountAndDate(
                Number(claim.claim_amount || 0),
                Number(mapping.total_amount || 0),
                null,
                null,
              );
            rows.push({
              key: `pt:${claim.payment_claim_id}`,
              classification: amountsAgree ? 'already_in_sync' : 'amounts_disagree',
              type: rawType,
              pt_id: String(claim.payment_claim_id),
              xero_id: String(mapping.invoice_id),
              label: amountsAgree
                ? `Claim #${claim.payment_claim_id} ↔ Xero invoice ${mapping.invoice_id}`
                : `Claim #${claim.payment_claim_id} ↔ ${mapping.invoice_id} — totals disagree`,
              sublabel: amountsAgree
                ? ptSummary
                : `PT $${Number(claim.claim_amount || 0).toFixed(2)} vs Xero $${Number(mapping.total_amount || 0).toFixed(2)} — re-importing from Xero will overwrite the PT row.`,
              pt_summary: ptSummary,
              xero_summary: `Xero ${mapping.type || 'invoice'} ${mapping.invoice_id} — total $${Number(mapping.total_amount || 0).toFixed(2)}`,
              hint: amountsAgree
                ? undefined
                : 'Recommend re-importing from Xero — preflight will produce the canonical action.',
            });
            continue;
          }
          // No mapping. Pair against an unconsumed Xero invoice using
          // the project/contract-tracking-aware matcher.
          let pairedXero: XeroInvWithLinks | null = null;
          let pairedAmountAgrees = true;
          // 1. invoice number
          if (claim.claim_reference) {
            const candidate = xeroByNumber.get(
              String(claim.claim_reference).trim().toLowerCase(),
            );
            if (candidate && !consumedXeroIds.has(String(candidate.inv.invoiceID))) {
              pairedXero = candidate;
              pairedAmountAgrees = this.compareAmountAndDate(
                Number(claim.claim_amount || 0),
                Number(candidate.inv.total || 0),
                null,
                null,
              );
            }
          }
          // 2. contract + amount + date (only when both sides agree on
          //    PT contract id — prevents cross-contract collisions on
          //    same-amount/same-day claims).
          if (!pairedXero) {
            const claimDate =
              claim.claim_type === 'Billable'
                ? claim.received_date
                : claim.sent_date;
            for (const x of xeroInvoices) {
              if (consumedXeroIds.has(String(x.inv.invoiceID))) continue;
              const sameContract =
                x.ptContractId &&
                Number(x.ptContractId) === Number(claim.contract_id);
              if (!sameContract) continue;
              if (
                this.compareAmountAndDate(
                  Number(claim.claim_amount || 0),
                  Number(x.inv.total || 0),
                  claimDate,
                  x.inv.date,
                )
              ) {
                pairedXero = x;
                pairedAmountAgrees = true;
                break;
              }
            }
          }
          if (pairedXero) {
            consumedXeroIds.add(String(pairedXero.inv.invoiceID));
            rows.push({
              key: `pair:${claim.payment_claim_id}:${pairedXero.inv.invoiceID}`,
              classification: pairedAmountAgrees ? 'needs_link' : 'amounts_disagree',
              type: rawType,
              pt_id: String(claim.payment_claim_id),
              xero_id: String(pairedXero.inv.invoiceID),
              label: pairedAmountAgrees
                ? `Claim #${claim.payment_claim_id} ↔ ${pairedXero.inv.invoiceNumber || pairedXero.inv.invoiceID}`
                : `Claim #${claim.payment_claim_id} ↔ ${pairedXero.inv.invoiceNumber || pairedXero.inv.invoiceID} — totals disagree`,
              sublabel: pairedAmountAgrees
                ? `Both sides exist but no mapping — recommend linking.`
                : `PT $${Number(claim.claim_amount || 0).toFixed(2)} vs Xero $${Number(pairedXero.inv.total || 0).toFixed(2)} — preflight will recommend the canonical direction.`,
              pt_summary: ptSummary,
              xero_summary: `${pairedXero.inv.type} ${pairedXero.inv.invoiceNumber || pairedXero.inv.invoiceID} — total $${Number(pairedXero.inv.total || 0).toFixed(2)} — ${pairedXero.inv.status}`,
            });
            continue;
          }
          // PT-only.
          const isPaid =
            String(claim.status || '').toLowerCase() === 'paid';
          rows.push({
            key: `pt:${claim.payment_claim_id}`,
            classification: isPaid ? 'blocked' : 'needs_push',
            type: rawType,
            pt_id: String(claim.payment_claim_id),
            xero_id: null,
            label: `Claim #${claim.payment_claim_id}${claim.claim_reference ? ` — ${claim.claim_reference}` : ''}`,
            sublabel: isPaid
              ? 'Locally Paid but never pushed — push blocked (reset claim to Confirmed first).'
              : ptSummary,
            pt_summary: ptSummary,
            hint: isPaid
              ? 'Reset the claim to Confirmed in PayTrade, push the invoice, then push its payments individually.'
              : undefined,
          });
        }

        // Walk remaining Xero invoices (Xero-only). Already filtered
        // to "tracking resolves to a known PT project" above.
        for (const x of xeroInvoices) {
          const inv = x.inv;
          if (consumedXeroIds.has(String(inv.invoiceID))) continue;
          const localRow = await this.xeroInvoicesBills.findOne({
            where: { integration_id, invoice_id: inv.invoiceID },
          });
          if (localRow?.pt_claim_id) {
            rows.push({
              key: `xero:${inv.invoiceID}`,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(localRow.pt_claim_id),
              xero_id: String(inv.invoiceID),
              label: `Xero invoice ${inv.invoiceNumber || inv.invoiceID} ↔ PT claim #${localRow.pt_claim_id}`,
              sublabel: `${inv.type} • $${Number(inv.total || 0).toFixed(2)} • ${inv.contact?.name || ''} • ${inv.status}`,
              xero_summary: `${inv.type} ${inv.invoiceNumber || inv.invoiceID} — total $${Number(inv.total || 0).toFixed(2)} — ${inv.status}`,
            });
          } else {
            rows.push({
              key: `xero:${inv.invoiceID}`,
              classification: 'needs_import',
              type: rawType,
              pt_id: null,
              xero_id: String(inv.invoiceID),
              label: `Xero ${inv.type} ${inv.invoiceNumber || inv.invoiceID}`,
              sublabel: `${inv.contact?.name || ''} • $${Number(inv.total || 0).toFixed(2)} • ${inv.status} • ${inv.date ? moment(inv.date).format('DD/MM/YYYY') : ''}`,
              xero_summary: `${inv.type} ${inv.invoiceNumber || inv.invoiceID} — total $${Number(inv.total || 0).toFixed(2)} — ${inv.status}`,
            });
          }
        }

        // Task #151 — row-detail enrichment (invoice/bill).
        const claimByIdMap = new Map<number, any>();
        for (const c of ptClaims) claimByIdMap.set(Number(c.payment_claim_id), c);
        const invByIdMap = new Map<string, XeroInvWithLinks>();
        for (const x of xeroInvoices) invByIdMap.set(String(x.inv.invoiceID), x);
        const ptProjectNameByPtId = new Map<number, string>();
        const ptContractNameByPtId = new Map<number, string>();
        for (const c of ptClaims) {
          if (c.project_id && c.projectDetails?.project_name)
            ptProjectNameByPtId.set(
              Number(c.project_id),
              c.projectDetails.project_name,
            );
          if (c.contract_id && c.contractDetails?.contract_name)
            ptContractNameByPtId.set(
              Number(c.contract_id),
              c.contractDetails.contract_name,
            );
        }
        // Also seed name lookups from the integration's mapped Xero
        // project/contract table — needed for "Xero only / needs_import"
        // rows where there is no PT claim in the window to source the
        // PT project/contract name from. Without this, the FE warning
        // "No matching PayTrade project/contract" fires even when the
        // tracking option IS mapped to a PT project.
        const mappedPtProjectIds = Array.from(
          new Set(
            xeroProjects
              .map((p) => (p.pt_project_id ? Number(p.pt_project_id) : 0))
              .filter((n) => n > 0),
          ),
        );
        const mappedPtContractIds = Array.from(
          new Set(
            xeroContracts
              .map((c) => (c.pt_contract_id ? Number(c.pt_contract_id) : 0))
              .filter((n) => n > 0),
          ),
        );
        if (mappedPtProjectIds.length) {
          const ptProjs = await this.projectDetails.find({
            where: { project_id: In(mappedPtProjectIds) },
          });
          for (const p of ptProjs) {
            if (p.project_id && p.project_name && !ptProjectNameByPtId.has(Number(p.project_id))) {
              ptProjectNameByPtId.set(Number(p.project_id), p.project_name);
            }
          }
        }
        if (mappedPtContractIds.length) {
          const ptCtrs = await this.contractDetails.find({
            where: { contract_id: In(mappedPtContractIds) },
          });
          for (const c of ptCtrs) {
            if (c.contract_id && c.contract_name && !ptContractNameByPtId.has(Number(c.contract_id))) {
              ptContractNameByPtId.set(Number(c.contract_id), c.contract_name);
            }
          }
        }

        // Task #151 follow-up — load the small set of mapping tables
        // we need to run cheap per-row preflight checks in-memory.
        // These mirror the lookups the run-sync's per-row preflight
        // performs, so the operator sees the same "this will fail"
        // signals at Discovery time without paying for any extra
        // Xero API calls.
        const mappedContacts = await this.xeroContactDetails.find({
          where: { integration_id, pt_contact_id: Not(IsNull()) },
        });
        const mappedContactByXeroId = new Map<
          string,
          { pt_contact_id: number; contact_name: string }
        >();
        for (const mc of mappedContacts) {
          if (mc.contact_id && mc.pt_contact_id) {
            mappedContactByXeroId.set(String(mc.contact_id).toLowerCase(), {
              pt_contact_id: Number(mc.pt_contact_id),
              contact_name: mc.contact_name || '',
            });
          }
        }
        const allSuppliersForCompany = await this.clientSuppliersDetails.find({
          where: { company_id },
        });
        const supplierByPtId = new Map<number, ClientSuppliersDetails>();
        for (const s of allSuppliersForCompany) {
          if (s.client_supplier_id) {
            supplierByPtId.set(Number(s.client_supplier_id), s);
          }
        }
        const allProjectOverrides = await this.supplierProjectAccountCodes.find({
          where: { company_id },
        });
        const overridesBySupplierId = new Map<
          number,
          { project_id: number; account_code: string }[]
        >();
        for (const ov of allProjectOverrides) {
          if (!ov.client_supplier_id) continue;
          const list =
            overridesBySupplierId.get(Number(ov.client_supplier_id)) || [];
          list.push({
            project_id: Number(ov.project_id),
            account_code: ov.account_code,
          });
          overridesBySupplierId.set(Number(ov.client_supplier_id), list);
        }
        const integrationCfg = await this.xeroIntegrationDetails.findOne({
          where: { integration_id },
        });

        for (const r of rows) {
          if (r.type !== rawType) continue;
          const claim = r.pt_id
            ? claimByIdMap.get(Number(r.pt_id))
            : null;
          const xeroLink = r.xero_id
            ? invByIdMap.get(String(r.xero_id))
            : null;
          const inv = xeroLink?.inv ?? null;
          const dl = buildDeepLinks(
            'Invoices',
            claim?.payment_claim_id ?? r.pt_id,
            inv?.invoiceID ?? r.xero_id,
            inv,
            claim,
          );
          if (dl.xero) r.xero_deep_link = dl.xero;
          if (dl.pt) r.paytrade_deep_link = dl.pt;
          if (claim) {
            r.project_name = claim.projectDetails?.project_name || null;
            r.contract_name = claim.contractDetails?.contract_name || null;
            const claimDate =
              claim.claim_type === 'Billable'
                ? claim.received_date
                : claim.sent_date;
            r.pt_details = [
              detail('Claim ID', claim.payment_claim_id),
              detail('Reference', claim.claim_reference),
              detail('Type', claim.claim_type),
              detail('Status', claim.status),
              detail(
                'Contact',
                claim.clientSupplierDetails?.client_supplier_name,
              ),
              detail('Project', claim.projectDetails?.project_name),
              detail('Contract', claim.contractDetails?.contract_name),
              detail('Amount', fmtMoney(claim.claim_amount)),
              detail('GST', fmtMoney((claim as any).gst_amount)),
              detail(
                'Retention',
                fmtMoney((claim as any).retention_amount),
              ),
              detail('Date', fmtDate(claimDate)),
              detail('Due date', fmtDate(claim.due_date)),
              detail('Created on', fmtDate(claim.created_on)),
            ];
          }
          if (inv) {
            let firstTracking: any = null;
            for (const li of inv.lineItems || []) {
              for (const t of li?.tracking || []) {
                if (t?.option || t?.trackingOptionID) {
                  firstTracking = t;
                  break;
                }
              }
              if (firstTracking) break;
            }
            if (firstTracking) {
              r.xero_tracking_option_name = firstTracking.option || null;
              r.xero_tracking_option_id =
                firstTracking.trackingOptionID || null;
            }
            if (!r.project_name && xeroLink?.ptProjectId) {
              const n = ptProjectNameByPtId.get(
                Number(xeroLink.ptProjectId),
              );
              if (n) r.project_name = n;
            }
            if (!r.contract_name && xeroLink?.ptContractId) {
              const n = ptContractNameByPtId.get(
                Number(xeroLink.ptContractId),
              );
              if (n) r.contract_name = n;
            }
            r.xero_details = [
              detail('Invoice ID', inv.invoiceID),
              detail('Number', inv.invoiceNumber),
              detail('Type', inv.type),
              detail('Status', inv.status),
              detail('Contact', inv.contact?.name),
              detail('Subtotal', fmtMoney(inv.subTotal)),
              detail('GST', fmtMoney(inv.totalTax)),
              detail('Total', fmtMoney(inv.total)),
              detail('Amount due', fmtMoney(inv.amountDue)),
              detail('Amount paid', fmtMoney(inv.amountPaid)),
              detail('Date', fmtDate(inv.date)),
              detail('Due date', fmtDate(inv.dueDate)),
              detail('Updated (UTC)', fmtDate(inv.updatedDateUTC)),
              detail('Line amount type', inv.lineAmountTypes),
              detail('Tracking option (raw)', r.xero_tracking_option_name),
              detail('Tracking option ID', r.xero_tracking_option_id),
              detail('Resolved PT project', r.project_name),
              detail('Resolved PT contract', r.contract_name),
            ];

            // Task #151 follow-up — push per-line-item rows into
            // xero_details so operators can see WHAT the Xero record
            // is billing for. Without this, the row-detail dialog
            // hid the most useful piece of information for deciding
            // whether the record can be imported safely.
            const lineItemsForDetail: any[] = Array.isArray(inv.lineItems)
              ? inv.lineItems
              : [];
            if (lineItemsForDetail.length > 0) {
              r.xero_details.push({ label: '— Line items —', value: '' });
              lineItemsForDetail.forEach((li: any, idx: number) => {
                const tracking =
                  Array.isArray(li?.tracking) && li.tracking.length
                    ? li.tracking
                        .map((t: any) =>
                          t?.option
                            ? t.option
                            : t?.trackingOptionID || '',
                        )
                        .filter(Boolean)
                        .join(', ')
                    : '';
                const parts: string[] = [];
                if (li?.description) parts.push(String(li.description));
                if (li?.quantity != null && li?.unitAmount != null) {
                  parts.push(
                    `qty ${li.quantity} × ${fmtMoney(li.unitAmount)}`,
                  );
                }
                if (li?.lineAmount != null) {
                  parts.push(`= ${fmtMoney(li.lineAmount)}`);
                }
                if (li?.accountCode) parts.push(`Acct ${li.accountCode}`);
                if (li?.taxType) parts.push(`Tax ${li.taxType}`);
                if (tracking) parts.push(`Tracking ${tracking}`);
                r.xero_details.push({
                  label: `Line ${idx + 1}`,
                  value: parts.join(' • ') || '—',
                });
              });
            }

            // Task #151 follow-up — validation against the operator's
            // configured Xero settings (Invoice Code / Bill Code and
            // matching Tax Codes). Tells the operator at a glance
            // whether each Xero line will land on the expected
            // account / tax code or not.
            //
            // Task #332 — retention-aware. The real importer classifies
            // retention shapes via `classifyRetentionShape` in
            // xero-invoices.service.ts and accepts the company's
            // configured retention/liability/release accounts on extra
            // lines. The pre-flight must mirror that, otherwise every
            // legitimate 3-line retention bill is mis-flagged as
            // "differ from your configured Bill Code". Keep this set
            // in lockstep with `classifyRetentionShape` if new
            // retention-code fields are introduced there.
            const isBillCheck =
              String(inv.type || '').toUpperCase() === 'ACCPAY';
            const expectedAccountCode = isBillCheck
              ? integrationCfg?.bill_code
              : integrationCfg?.invoice_code;
            const expectedTaxCode = isBillCheck
              ? integrationCfg?.bill_tax_code
              : integrationCfg?.invoice_tax_code;
            const simplifiedRetention = !!integrationCfg
              ?.simplified_retention_accounting;
            const retentionRetainedCode = isBillCheck
              ? integrationCfg?.retention_payable_retained_code
              : integrationCfg?.retention_receivable_retained_code;
            const retentionReleaseCode = isBillCheck
              ? integrationCfg?.retention_payable_release_code
              : integrationCfg?.retention_receivable_release_code;
            const liabilityCode = simplifiedRetention
              ? null
              : isBillCheck
              ? integrationCfg?.liability_payable_code
              : integrationCfg?.liability_receivable_code;
            const retentionAccountCodeSet = new Set<string>(
              [retentionRetainedCode, retentionReleaseCode, liabilityCode]
                .filter((c): c is string => !!c)
                .map((c) => String(c)),
            );
            const retentionTaxTypeOverride = integrationCfg?.retention_tax_type
              ? String(integrationCfg.retention_tax_type)
              : null;
            const checks: string[] = [];
            const lineCodes = Array.from(
              new Set(
                lineItemsForDetail
                  .map((li: any) =>
                    li?.accountCode ? String(li.accountCode) : '',
                  )
                  .filter((c: string) => c),
              ),
            );
            // Split codes into "matches base", "matches a retention
            // account", and "unexpected".
            const expectedBaseStr = expectedAccountCode
              ? String(expectedAccountCode)
              : null;
            const unexpectedAccountCodes = lineCodes.filter(
              (c) =>
                c !== expectedBaseStr && !retentionAccountCodeSet.has(c),
            );
            const matchedRetentionCodes = lineCodes.filter((c) =>
              retentionAccountCodeSet.has(c),
            );
            if (expectedAccountCode) {
              if (lineCodes.length === 0) {
                checks.push(
                  `✗ No account codes set on Xero lines — inbound import WILL FAIL (your configured ${
                    isBillCheck ? 'Bill' : 'Invoice'
                  } Code is ${expectedAccountCode}; PayTrade can't resolve which PT line item to create without one)`,
                );
              } else if (unexpectedAccountCodes.length === 0) {
                if (matchedRetentionCodes.length > 0) {
                  checks.push(
                    `✓ All line account codes match your configured ${
                      isBillCheck ? 'Bill' : 'Invoice'
                    } Code (${expectedAccountCode}) or configured retention accounts (${matchedRetentionCodes.join(
                      ', ',
                    )})`,
                  );
                } else {
                  checks.push(
                    `✓ All line account codes match your configured ${
                      isBillCheck ? 'Bill' : 'Invoice'
                    } Code (${expectedAccountCode})`,
                  );
                }
              } else if (isBillCheck) {
                // Inbound bills: a non-matching, non-retention account
                // code only succeeds if the supplier has a per-account
                // override mapping it to a PayTrade bill code. Without
                // that the run-sync will fail with "supplier bill code
                // unresolved".
                checks.push(
                  `✗ Line account code(s) ${unexpectedAccountCodes.join(
                    ', ',
                  )} differ from your configured Bill Code (${expectedAccountCode}) — inbound import will FAIL unless the supplier has a per-account override mapping these codes`,
                );
              } else {
                // Outbound invoices: PayTrade pushes its own configured
                // code to Xero, so a mismatch here just means the
                // existing Xero record uses a different code; the link
                // will still be created on import.
                checks.push(
                  `⚠ Line account code(s) ${unexpectedAccountCodes.join(
                    ', ',
                  )} differ from your configured Invoice Code (${expectedAccountCode}) — import still links the records but the Xero invoice keeps its own line account codes`,
                );
              }
            } else {
              checks.push(
                `✗ No ${
                  isBillCheck ? 'Bill' : 'Invoice'
                } Code configured in PayTrade Xero settings — fix in Xero settings before running sync`,
              );
            }
            // Tax codes: treat each line independently so retention
            // lines (account ∈ retention codes) can legitimately be
            // BASEXCLUDED — that's the "account default" behaviour the
            // operator picks in the dropdown when retention accounts
            // are BAS-Excluded. A non-default `retention_tax_type` is
            // also accepted on retention lines.
            const expectedBaseTax = expectedTaxCode
              ? String(expectedTaxCode)
              : null;
            const unexpectedTaxes: string[] = [];
            const linesWithTax = lineItemsForDetail.filter(
              (li: any) => li?.taxType,
            );
            for (const li of linesWithTax) {
              const tax = String(li.taxType);
              const acct = li?.accountCode ? String(li.accountCode) : '';
              const isRetentionLine = retentionAccountCodeSet.has(acct);
              if (isRetentionLine) {
                if (
                  tax === 'BASEXCLUDED' ||
                  (retentionTaxTypeOverride &&
                    tax === retentionTaxTypeOverride) ||
                  (expectedBaseTax && tax === expectedBaseTax)
                ) {
                  continue;
                }
                unexpectedTaxes.push(tax);
              } else {
                if (expectedBaseTax && tax === expectedBaseTax) {
                  continue;
                }
                unexpectedTaxes.push(tax);
              }
            }
            const uniqueUnexpectedTaxes = Array.from(
              new Set(unexpectedTaxes),
            );
            if (!expectedTaxCode) {
              checks.push(
                `⚠ No ${
                  isBillCheck ? 'Bill' : 'Invoice'
                } Tax Code configured in PayTrade Xero settings`,
              );
            } else if (linesWithTax.length === 0) {
              checks.push(
                `⚠ No tax codes set on Xero lines (your configured ${
                  isBillCheck ? 'Bill' : 'Invoice'
                } Tax Code is ${expectedTaxCode})`,
              );
            } else if (uniqueUnexpectedTaxes.length === 0) {
              checks.push(
                `✓ All line tax codes match your configured ${
                  isBillCheck ? 'Bill' : 'Invoice'
                } Tax Code (${expectedTaxCode})${
                  matchedRetentionCodes.length > 0
                    ? ' (retention lines accepted as BASEXCLUDED or configured retention tax type)'
                    : ''
                }`,
              );
            } else {
              checks.push(
                `⚠ Line tax code(s) ${uniqueUnexpectedTaxes.join(
                  ', ',
                )} differ from your configured ${
                  isBillCheck ? 'Bill' : 'Invoice'
                } Tax Code (${expectedTaxCode})`,
              );
            }
            if (checks.length > 0) {
              r.validation_checks = checks;
              // Task #152 — derive a single chip state for the table.
              // Any ✗ → fail (run-sync will block / error);
              // any ⚠ (without a ✗) → warning (operator should review);
              // otherwise → ok.
              const hasFail = checks.some((c) => c.startsWith('✗'));
              const hasWarn = checks.some((c) => c.startsWith('⚠'));
              r.settings_match = hasFail
                ? 'fail'
                : hasWarn
                ? 'warning'
                : 'ok';
            }

            // Task #151 follow-up — cheap in-memory pre-checks. We
            // only flag failures the run-sync would hit deterministi-
            // cally on the PT side: contact mapping, missing line
            // account codes, and (for inbound bills) supplier bill-
            // code resolution. Does NOT auto-exclude the row from
            // selection — the operator decides whether to attempt.
            const issues: string[] = [];
            const xeroContactId = inv.contact?.contactID
              ? String(inv.contact.contactID).toLowerCase()
              : null;
            const mappedContact = xeroContactId
              ? mappedContactByXeroId.get(xeroContactId) || null
              : null;
            if (!mappedContact) {
              const cname = inv.contact?.name || 'Unknown contact';
              issues.push(`Xero contact "${cname}" is not mapped to a PayTrade client/supplier`);
            }
            const lines: any[] = Array.isArray(inv.lineItems)
              ? inv.lineItems
              : [];
            const blankCodes = lines.filter(
              (li) => !li?.accountCode || String(li.accountCode).trim() === '',
            );
            if (blankCodes.length > 0) {
              issues.push(
                `${blankCodes.length} line item(s) have no Xero account code`,
              );
            }
            const isBill =
              String(inv.type || '').toUpperCase() === 'ACCPAY';
            if (isBill && mappedContact) {
              const supplier =
                supplierByPtId.get(mappedContact.pt_contact_id) || null;
              const overrides = supplier?.client_supplier_id
                ? overridesBySupplierId.get(
                    Number(supplier.client_supplier_id),
                  ) || []
                : [];
              const ptProjectId =
                xeroLink?.ptProjectId != null
                  ? Number(xeroLink.ptProjectId)
                  : null;
              const unresolvedCodes = new Set<string>();
              for (const li of lines) {
                const candidate = li?.accountCode
                  ? String(li.accountCode)
                  : null;
                const res = resolveSupplierBillCode({
                  supplier,
                  projectId: ptProjectId,
                  xeroDetails: integrationCfg,
                  projectOverrides: overrides,
                  // Skip CoA naming-convention discovery here — it
                  // requires a Xero API call we deliberately avoid
                  // at Discovery time. Run-sync still does it.
                  xeroChartOfAccounts: [],
                  direction: 'inbound',
                  candidateAccountCode: candidate,
                });
                if (res.source === 'unresolved') {
                  unresolvedCodes.add(candidate || '(blank)');
                }
              }
              if (unresolvedCodes.size > 0) {
                const list = Array.from(unresolvedCodes).join(', ');
                issues.push(
                  `Supplier bill code unresolved for line account code(s): ${list}`,
                );
              }
            }
            if (issues.length > 0) {
              r.blocking_issues = issues;
            }
          }
        }
      } else if (rawType === 'payment') {
        const ptPays = await this.paymentDetails
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.clientSupplierDetails', 'cs')
          .leftJoinAndSelect('p.xeroPayments', 'xp')
          .where('p.company_id = :company_id', { company_id })
          .andWhere('p.payment_date >= :from AND p.payment_date <= :to', {
            from: fromDate.format('YYYY-MM-DD'),
            to: toDate.format('YYYY-MM-DD'),
          })
          .orderBy('p.payment_date', 'DESC')
          .limit(PER_SIDE_CAP + 1)
          .getMany();
        if (ptPays.length > PER_SIDE_CAP) {
          truncated = true;
          ptPays.length = PER_SIDE_CAP;
        }
        // Xero side — payments CREATED OR MODIFIED in window.
        // Same rationale + ASC/early-break guard as the invoice fetch
        // above: filter by when the payment was created/updated in
        // Xero (via `ifModifiedSince`), not by the transactional
        // `Date` field which can be backdated. Sort ASC and stop once
        // we cross the upper bound so the page budget is never burned
        // by post-window churn.
        const xeroPays: any[] = [];
        const payToUpper = toDate.clone().endOf('day').toDate();
        let payStoppedByUpper = false;
        try {
          for (let page = 1; page <= MAX_XERO_PAGES; page++) {
            if (budgetExceeded()) {
              truncated = true;
              break;
            }
            const resp = await this.xero.accountingApi.getPayments(
              tenant_id,
              fromDate.startOf('day').toDate(),
              undefined,
              'UpdatedDateUTC ASC',
              page,
            );
            const batchAll = resp?.body?.payments || [];
            for (const pay of batchAll) {
              const u = pay?.updatedDateUTC;
              let withinUpper = true;
              if (u) {
                try {
                  withinUpper = moment(u).toDate() <= payToUpper;
                } catch {
                  withinUpper = true;
                }
              }
              if (!withinUpper) {
                payStoppedByUpper = true;
                break;
              }
              xeroPays.push(pay);
            }
            if (payStoppedByUpper) break;
            if (batchAll.length < XERO_PAGE_SIZE) break;
            if (xeroPays.length >= PER_SIDE_CAP) {
              truncated = true;
              xeroPays.length = PER_SIDE_CAP;
              break;
            }
            if (page === MAX_XERO_PAGES && batchAll.length === XERO_PAGE_SIZE) {
              truncated = true;
            }
          }
        } catch (e: any) {
          return {
            success: false,
            message: `Xero payment fetch failed: ${e?.message || e}`,
          };
        }
        const consumedXeroIds = new Set<string>();
        for (const p of ptPays) {
          const xp = (p as any).xeroPayments?.[0];
          const ptSummary = `Payment #${p.payment_id} • ${p.payment_type || ''} • $${Number(p.total_amount || 0).toFixed(2)} • ${p.payment_date} • ${p.clientSupplierDetails?.client_supplier_name || ''} • ${p.current_status || ''}`;
          if (xp?.payment_id) {
            consumedXeroIds.add(String(xp.payment_id));
            rows.push({
              key: `pt:${p.payment_id}`,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(p.payment_id),
              xero_id: String(xp.payment_id),
              label: `Payment #${p.payment_id} ↔ Xero payment ${xp.payment_id}`,
              sublabel: ptSummary,
              pt_summary: ptSummary,
            });
            continue;
          }
          let paired: any = null;
          for (const xpay of xeroPays) {
            if (consumedXeroIds.has(String(xpay.paymentID))) continue;
            if (
              this.compareAmountAndDate(
                Number(p.total_amount || 0),
                Number(xpay.amount || 0),
                p.payment_date,
                xpay.date,
              )
            ) {
              paired = xpay;
              break;
            }
          }
          if (paired) {
            consumedXeroIds.add(String(paired.paymentID));
            rows.push({
              key: `pair:${p.payment_id}:${paired.paymentID}`,
              classification: 'needs_link',
              type: rawType,
              pt_id: String(p.payment_id),
              xero_id: String(paired.paymentID),
              label: `Payment #${p.payment_id} ↔ Xero ${paired.paymentID}`,
              sublabel: `Amount/date match — recommend linking.`,
              pt_summary: ptSummary,
              xero_summary: `Xero payment ${paired.paymentID} — $${Number(paired.amount || 0).toFixed(2)} on ${paired.date} — ${paired.status}`,
            });
            continue;
          }
          rows.push({
            key: `pt:${p.payment_id}`,
            classification: 'needs_push',
            type: rawType,
            pt_id: String(p.payment_id),
            xero_id: null,
            label: `Payment #${p.payment_id} — $${Number(p.total_amount || 0).toFixed(2)}`,
            sublabel: ptSummary,
            pt_summary: ptSummary,
          });
        }
        for (const xpay of xeroPays) {
          if (consumedXeroIds.has(String(xpay.paymentID))) continue;
          const local = await this.xeroPayments.findOne({
            where: { integration_id, payment_id: xpay.paymentID },
          });
          if (local?.pt_payment_id) {
            rows.push({
              key: `xero:${xpay.paymentID}`,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(local.pt_payment_id),
              xero_id: String(xpay.paymentID),
              label: `Xero payment ${xpay.paymentID} ↔ PT payment #${local.pt_payment_id}`,
              sublabel: `$${Number(xpay.amount || 0).toFixed(2)} • ${xpay.date} • ${xpay.status}`,
              xero_summary: `Xero payment ${xpay.paymentID} — $${Number(xpay.amount || 0).toFixed(2)} on ${xpay.date} — ${xpay.status}`,
            });
          } else {
            rows.push({
              key: `xero:${xpay.paymentID}`,
              classification: 'needs_import',
              type: rawType,
              pt_id: null,
              xero_id: String(xpay.paymentID),
              label: `Xero payment ${xpay.paymentID} — $${Number(xpay.amount || 0).toFixed(2)}`,
              sublabel: `${xpay.date || ''} • ${xpay.status || ''} • invoice ${xpay.invoice?.invoiceID || '(none)'}`,
              xero_summary: `Xero payment ${xpay.paymentID} — $${Number(xpay.amount || 0).toFixed(2)} on ${xpay.date} — ${xpay.status}`,
            });
          }
        }

        // Task #151 — row-detail enrichment (payment).
        const payByPtIdMap = new Map<number, any>();
        for (const p of ptPays) payByPtIdMap.set(Number(p.payment_id), p);
        const payByXeroIdMap = new Map<string, any>();
        for (const x of xeroPays) payByXeroIdMap.set(String(x.paymentID), x);
        for (const r of rows) {
          if (r.type !== rawType) continue;
          const p = r.pt_id ? payByPtIdMap.get(Number(r.pt_id)) : null;
          const xpay = r.xero_id
            ? payByXeroIdMap.get(String(r.xero_id))
            : null;
          const dl = buildDeepLinks(
            'Payments',
            p?.payment_id ?? r.pt_id,
            xpay?.paymentID ?? r.xero_id,
            xpay,
            p,
          );
          if (dl.xero) r.xero_deep_link = dl.xero;
          if (dl.pt) r.paytrade_deep_link = dl.pt;
          if (p) {
            r.pt_details = [
              detail('Payment ID', p.payment_id),
              detail('Type', p.payment_type),
              detail(
                'Contact',
                p.clientSupplierDetails?.client_supplier_name,
              ),
              detail('Amount', fmtMoney(p.total_amount)),
              detail('Cash retention', fmtMoney(p.cash_retention)),
              detail(
                'Retention amount',
                fmtMoney((p as any).retention_amount),
              ),
              detail('Payment date', fmtDate(p.payment_date)),
              detail('Status', p.current_status),
              detail('Bank account ID', p.bank_account_id),
            ];
          }
          if (xpay) {
            r.xero_details = [
              detail('Payment ID', xpay.paymentID),
              detail('Status', xpay.status),
              detail('Type', xpay.paymentType),
              detail('Amount', fmtMoney(xpay.amount)),
              detail('Date', fmtDate(xpay.date)),
              detail('Reference', xpay.reference),
              detail(
                'Account',
                xpay.account?.code || xpay.account?.name,
              ),
              detail('Invoice ID', xpay.invoice?.invoiceID),
              detail('Invoice number', xpay.invoice?.invoiceNumber),
              detail('Contact', xpay.invoice?.contact?.name),
              detail('Updated (UTC)', fmtDate(xpay.updatedDateUTC)),
            ];
          }
        }
      } else {
        // contact
        const ptContacts = await this.clientSuppliersDetails
          .createQueryBuilder('cs')
          .where('cs.company_id = :company_id', { company_id })
          .andWhere('cs.created_on >= :from AND cs.created_on < :to', {
            from: fromDate.startOf('day').toDate(),
            to: toDate.clone().add(1, 'day').startOf('day').toDate(),
          })
          .orderBy('cs.created_on', 'DESC')
          .limit(PER_SIDE_CAP + 1)
          .getMany();
        if (ptContacts.length > PER_SIDE_CAP) {
          truncated = true;
          ptContacts.length = PER_SIDE_CAP;
        }
        const ptIds = ptContacts.map((c) => c.client_supplier_id);
        const ptMap = ptIds.length
          ? await this.xeroContactDetails
              .createQueryBuilder('x')
              .where('x.integration_id = :integration_id', { integration_id })
              .andWhere('x.pt_contact_id IN (:...ids)', { ids: ptIds })
              .getMany()
          : [];
        const ptToXero = new Map<number, any>();
        for (const m of ptMap) {
          if (m.pt_contact_id) ptToXero.set(Number(m.pt_contact_id), m);
        }
        // Xero contacts modified in window — Contacts has no creation
        // date filter so we use ifModifiedSince as the lower bound and
        // then client-side filter the upper bound by updatedDateUTC.
        // This honours the explicit date-window contract: nothing
        // modified after to_date should appear in the result.
        const xeroContacts: any[] = [];
        const toUpper = toDate.clone().endOf('day').toDate();
        try {
          for (let page = 1; page <= MAX_XERO_PAGES; page++) {
            if (budgetExceeded()) {
              truncated = true;
              break;
            }
            const resp = await this.xero.accountingApi.getContacts(
              tenant_id,
              fromDate.toDate(),
              undefined,
              'Name ASC',
              undefined,
              page,
            );
            const batchAll = resp?.body?.contacts || [];
            const batch = batchAll.filter((c: any) => {
              const u = c?.updatedDateUTC || c?.UpdatedDateUTC;
              if (!u) return true;
              try {
                return moment(u).toDate() <= toUpper;
              } catch {
                return true;
              }
            });
            xeroContacts.push(...batch);
            if (batchAll.length < XERO_PAGE_SIZE) break;
            if (xeroContacts.length >= PER_SIDE_CAP) {
              truncated = true;
              xeroContacts.length = PER_SIDE_CAP;
              break;
            }
          }
        } catch (e: any) {
          return {
            success: false,
            message: `Xero contact fetch failed: ${e?.message || e}`,
          };
        }
        const xeroByName = new Map<string, any>();
        for (const c of xeroContacts) {
          if (c?.name) {
            xeroByName.set(String(c.name).trim().toLowerCase(), c);
          }
        }
        const consumedXeroIds = new Set<string>();
        for (const cs of ptContacts) {
          const ptSummary = `${cs.client_supplier_name}${cs.business_name ? ` (${cs.business_name})` : ''} • ${cs.client_supplier_type}`;
          const mapping = ptToXero.get(Number(cs.client_supplier_id));
          if (mapping?.contact_id) {
            consumedXeroIds.add(String(mapping.contact_id));
            rows.push({
              key: `pt:${cs.client_supplier_id}`,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(cs.client_supplier_id),
              xero_id: String(mapping.contact_id),
              label: `${cs.client_supplier_name} ↔ Xero ${mapping.contact_id}`,
              sublabel: ptSummary,
              pt_summary: ptSummary,
              xero_summary: `Xero contact ${mapping.contact_id} — ${mapping.contact_name || ''}`,
            });
            continue;
          }
          const candidate = xeroByName.get(
            String(cs.client_supplier_name || '').trim().toLowerCase(),
          );
          if (candidate && !consumedXeroIds.has(String(candidate.contactID))) {
            consumedXeroIds.add(String(candidate.contactID));
            rows.push({
              key: `pair:${cs.client_supplier_id}:${candidate.contactID}`,
              classification: 'needs_link',
              type: rawType,
              pt_id: String(cs.client_supplier_id),
              xero_id: String(candidate.contactID),
              label: `${cs.client_supplier_name} ↔ Xero ${candidate.contactID}`,
              sublabel: 'Same name on both sides — recommend linking.',
              pt_summary: ptSummary,
              xero_summary: `Xero contact ${candidate.contactID} — ${candidate.name || ''}`,
            });
            continue;
          }
          rows.push({
            key: `pt:${cs.client_supplier_id}`,
            classification: 'needs_push',
            type: rawType,
            pt_id: String(cs.client_supplier_id),
            xero_id: null,
            label: cs.client_supplier_name,
            sublabel: ptSummary,
            pt_summary: ptSummary,
            hint: 'PT contact push from this dialog is not yet supported — create the contact in Xero (or trigger from the contact page).',
          });
        }
        for (const c of xeroContacts) {
          if (consumedXeroIds.has(String(c.contactID))) continue;
          const local = await this.xeroContactDetails.findOne({
            where: { integration_id, contact_id: c.contactID },
          });
          if (local?.pt_contact_id) {
            rows.push({
              key: `xero:${c.contactID}`,
              classification: 'already_in_sync',
              type: rawType,
              pt_id: String(local.pt_contact_id),
              xero_id: String(c.contactID),
              label: `Xero ${c.name || c.contactID} ↔ PT contact #${local.pt_contact_id}`,
              sublabel: `${c.contactStatus || ''}`,
              xero_summary: `Xero contact ${c.contactID} — ${c.name || ''}`,
            });
          } else {
            rows.push({
              key: `xero:${c.contactID}`,
              classification: 'needs_import',
              type: rawType,
              pt_id: null,
              xero_id: String(c.contactID),
              label: `Xero contact ${c.name || c.contactID}`,
              sublabel: `${c.contactStatus || ''}`,
              xero_summary: `Xero contact ${c.contactID} — ${c.name || ''}`,
            });
          }
        }

        // Task #151 — row-detail enrichment (contact).
        const ptContactByIdMap = new Map<number, any>();
        for (const cs of ptContacts)
          ptContactByIdMap.set(Number(cs.client_supplier_id), cs);
        const xeroContactByIdMap = new Map<string, any>();
        for (const c of xeroContacts)
          xeroContactByIdMap.set(String(c.contactID), c);
        for (const r of rows) {
          if (r.type !== rawType) continue;
          const cs = r.pt_id
            ? ptContactByIdMap.get(Number(r.pt_id))
            : null;
          const xc = r.xero_id
            ? xeroContactByIdMap.get(String(r.xero_id))
            : null;
          const dl = buildDeepLinks(
            'Contacts',
            cs?.client_supplier_id ?? r.pt_id,
            xc?.contactID ?? r.xero_id,
            xc,
            cs,
            cs ? { client_supplier_id: cs.client_supplier_id } : {},
            xc ? { contact_id: xc.contactID } : {},
          );
          if (dl.xero) r.xero_deep_link = dl.xero;
          if (dl.pt) r.paytrade_deep_link = dl.pt;
          if (cs) {
            r.pt_details = [
              detail('Contact ID', cs.client_supplier_id),
              detail('Name', cs.client_supplier_name),
              detail('Business name', (cs as any).business_name),
              detail('Type', cs.client_supplier_type),
              detail('Email', (cs as any).email),
              detail('Phone', (cs as any).phone),
              detail(
                'GST registered',
                (cs as any).is_gst_registered ? 'Yes' : 'No',
              ),
              detail('Created on', fmtDate(cs.created_on)),
            ];
          }
          if (xc) {
            r.xero_details = [
              detail('Contact ID', xc.contactID),
              detail('Name', xc.name),
              detail('Status', xc.contactStatus),
              detail('Email', xc.emailAddress),
              detail('Account number', xc.accountNumber),
              detail('Default currency', xc.defaultCurrency),
              detail('Updated (UTC)', fmtDate(xc.updatedDateUTC)),
            ];
          }
        }
      }

      // Push-unsupported types fall back to needs_link / needs_import
      // via classification — `needs_push` for `contact` already carries
      // a hint above. The frontend's per-row preflight will still gate
      // dispatch.

      const counts = {
        total: rows.length,
        already_in_sync: rows.filter(
          (r) => r.classification === 'already_in_sync',
        ).length,
        needs_link: rows.filter((r) => r.classification === 'needs_link')
          .length,
        needs_push: rows.filter((r) => r.classification === 'needs_push')
          .length,
        needs_import: rows.filter((r) => r.classification === 'needs_import')
          .length,
        blocked: rows.filter((r) => r.classification === 'blocked').length,
      };
      return {
        success: true,
        type: rawType,
        company_id,
        from_date: fromIso,
        to_date: toIso,
        rows,
        counts,
        notes,
        truncated,
        per_side_cap: PER_SIDE_CAP,
        elapsed_ms: Date.now() - startedAt,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.error(`[MANUAL_CATCHUP] ${msg}`);
      return { success: false, message: msg };
    }
  }

  /**
   * Task #141 — single source of truth for the expected gross retention
   * amount compared against the outbound Xero `BankTransfer` leg
   * (`xero-payments.service.ts` ~L951). PT stores `retention_amount`
   * ex-GST; the BankTransfer push uses that raw stored value, so the
   * only way the *transferred* figure becomes inc-GST is when the
   * configured recording mode + invoice line-amount-types combination
   * causes the upstream payment flow to substitute the gross figure.
   *
   * Per Task #141 product rules, that substitution is in scope ONLY
   * when `lineAmountTypes === 'Inclusive'` AND
   * `retention_recording_mode === 'inc_gst'` — matching the
   * `forceGrossUp` arm of `getRetentionLineSpec()` in
   * `xero-invoices.service.ts`. The other producer arm (Inclusive +
   * GST-applicable account tax type with ex_gst mode) governs the
   * retention LINE on the invoice but does NOT change what the
   * BankTransfer leg carries — so this helper deliberately omits the
   * per-account tax-type lookup. Adding it would diverge from the
   * actual outbound transfer amount and cause false mismatches.
   *
   * Used by both `manualXeroPreflight` (blocking) and the inbound
   * webhook diagnostic (log-only) so the two paths can never drift.
   */
  private computeExpectedGrossRetention(
    retentionExGst: number,
    lineAmountTypes: any,
    recordingMode?: string | null,
  ): number {
    const amount = Number(retentionExGst) || 0;
    const lat = String(lineAmountTypes || '').toLowerCase();
    const isInc = lat === 'inclusive';
    const gross =
      isInc && recordingMode === 'inc_gst' ? amount * 1.1 : amount;
    return Math.round(gross * 100) / 100;
  }

  async manualXeroPreflight(
    decoded: any,
    input: {
      company_id: number;
      type: string;
      xero_id?: string | null;
      pt_id?: string | null;
    },
  ): Promise<any> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const xero_id = String(input?.xero_id || '').trim();
    const pt_id = String(input?.pt_id || '').trim();

    const allowedTypes = new Set([
      'invoice_bill',
      'payment',
      'bank_transfer',
      'trust_movement',
      'contact',
      'manual_journal',
    ]);
    if (!company_id || !rawType) {
      return { success: false, message: 'company_id and type are required.' };
    }
    if (!allowedTypes.has(rawType)) {
      return {
        success: false,
        message: `Unsupported type "${rawType}".`,
      };
    }
    if (!xero_id && !pt_id) {
      return {
        success: false,
        message:
          'Pick at least one side — a Xero record, a PayTrade record, or both.',
      };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        success: false,
        message: 'No active Xero integration found for this company.',
      };
    }

    const checks: Array<{
      label: string;
      status: 'ok' | 'warn' | 'fail';
      detail: string;
    }> = [];
    const xeroSide: any = { exists: false };
    const ptSide: any = { exists: false };
    const link: any = { mapped: false };
    let blocked = false;
    let blockReason: string | null = null;

    try {
      // ─────────── invoice_bill / bank_transfer / payment all share an
      // invoice anchor for the import path — handle each explicitly.
      if (rawType === 'invoice_bill') {
        // Hoisted so cross-side mapping validators can read the live
        // Xero invoice fetched in the `if (xero_id)` block below.
        let xeroInvoice: any = null;
        // PT side
        if (pt_id) {
          const claim = await this.paymentClaims.findOne({
            where: {
              company_id,
              payment_claim_id: Number(pt_id),
            },
            relations: [
              'clientSupplierDetails',
              'paymentClaimInvoices',
              'projectDetails',
              'contractDetails',
            ],
          });
          if (claim) {
            ptSide.exists = true;
            ptSide.id = claim.payment_claim_id;
            ptSide.uuid = claim.id;
            ptSide.kind = claim.claim_type; // Billable/Receivable
            ptSide.cash_retention_type = claim.cash_retention_type;
            ptSide.cash_retention = !!claim.cash_retention;
            ptSide.status = claim.status;
            ptSide.reference = claim.claim_reference;
            ptSide.amount = Number(claim.claim_amount || 0);
            ptSide.retention_amount = Number(claim.retention_amount || 0);
            ptSide.contact = claim.clientSupplierDetails?.client_supplier_name;
            ptSide.project = claim.projectDetails?.project_name;
            ptSide.contract = claim.contractDetails?.contract_name;
            ptSide.summary = `Claim #${claim.payment_claim_id} (${claim.claim_type}) — ${ptSide.contact || 'No contact'} — $${ptSide.amount.toFixed(2)}${claim.cash_retention ? ` (retention $${ptSide.retention_amount.toFixed(2)})` : ''} — ${claim.status}`;
            checks.push({
              label: 'PayTrade claim status',
              status: ['Draft', 'Confirmed', 'Sent', 'Paid'].includes(
                claim.status,
              )
                ? 'ok'
                : 'warn',
              detail: claim.status,
            });
          } else {
            checks.push({
              label: 'PayTrade claim',
              status: 'fail',
              detail: `No claim found for id ${pt_id}.`,
            });
          }
        }

        // Xero side — try local mapping first, then live fetch (live fetch
        // may need a UUID; we accept invoice number too via getInvoices
        // lookup only when the local mapping doesn't already cover it).
        if (xero_id) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          let resolvedXeroId = xero_id;
          // Branch explicitly: TypeORM strips undefined fields, so a
          // ternary that produced `invoice_id: undefined` for non-UUIDs
          // would degrade to a match on integration_id alone.
          let xeroInvoiceLocal: XeroInvoicesBills | null = null;
          if (uuidRegex.test(xero_id)) {
            xeroInvoiceLocal = await this.xeroInvoicesBills.findOne({
              where: {
                integration_id: xeroDetails.integration_id,
                invoice_id: xero_id,
              },
            });
          } else {
            xeroInvoiceLocal = await this.xeroInvoicesBills.findOne({
              where: {
                integration_id: xeroDetails.integration_id,
                reference: xero_id,
              },
            });
          }
          // Live-fetch the invoice for shape classification + amounts.
          try {
            await this.xeroService.refreshTokenSet(company_id, this.xero);
            const where = uuidRegex.test(xero_id)
              ? undefined
              : `InvoiceNumber=="${xero_id.replace(/"/g, '\\"')}"`;
            const lookup = uuidRegex.test(xero_id)
              ? await this.xero.accountingApi.getInvoice(
                  xeroDetails.tenant_id,
                  xero_id,
                )
              : await this.xero.accountingApi.getInvoices(
                  xeroDetails.tenant_id,
                  undefined,
                  where,
                );
            xeroInvoice =
              (lookup as any)?.body?.invoices?.[0] ||
              (lookup as any)?.body?.invoice ||
              null;
            if (xeroInvoice?.invoiceID) {
              resolvedXeroId = xeroInvoice.invoiceID;
              // Re-query local mapping by the canonical invoice_id once
              // the live fetch has resolved a non-UUID input.
              if (!xeroInvoiceLocal) {
                xeroInvoiceLocal = await this.xeroInvoicesBills.findOne({
                  where: {
                    integration_id: xeroDetails.integration_id,
                    invoice_id: resolvedXeroId,
                  },
                });
              }
            }
          } catch (e: any) {
            checks.push({
              label: 'Live Xero lookup',
              status: 'warn',
              detail: e?.message || String(e),
            });
          }
          if (xeroInvoice) {
            xeroSide.exists = true;
            xeroSide.id = resolvedXeroId;
            xeroSide.invoiceNumber = xeroInvoice.invoiceNumber;
            xeroSide.type = xeroInvoice.type;
            xeroSide.status = xeroInvoice.status;
            xeroSide.amountDue = Number(xeroInvoice.amountDue || 0);
            xeroSide.amountPaid = Number(xeroInvoice.amountPaid || 0);
            xeroSide.amountTotal = Number(xeroInvoice.total || 0);
            xeroSide.contact = xeroInvoice?.contact?.name;
            xeroSide.payments =
              (xeroInvoice.payments || []).map((p: any) => ({
                id: p.paymentID,
                amount: Number(p.amount || 0),
                date: p.date,
              })) || [];
            xeroSide.summary = `${xeroInvoice.type} ${xeroInvoice.invoiceNumber || resolvedXeroId} — ${xeroSide.contact || ''} — total $${xeroSide.amountTotal.toFixed(2)} (paid $${xeroSide.amountPaid.toFixed(2)}, due $${xeroSide.amountDue.toFixed(2)}) — ${xeroInvoice.status}`;
            // Shape via static helper
            try {
              const shape = (this
                .constructor as any).classifyRetentionShape(
                xeroInvoice,
                xeroDetails,
              );
              xeroSide.shape = shape;
              checks.push({
                label: 'Retention shape',
                status: 'ok',
                detail: `${shape.retentionClaimnlineItem ? 'Retention release' : 'Standard'} — codesShared=${shape.codesShared}, hasBaseLine=${shape.hasBaseLine}, netRetained=${shape.netRetainedSigned}`,
              });
            } catch {}
          } else {
            checks.push({
              label: 'Xero invoice/bill',
              status: 'fail',
              detail: `No Xero invoice found for "${xero_id}".`,
            });
          }
          if (xeroInvoiceLocal) {
            link.mapped = true;
            link.pt_claim_id = xeroInvoiceLocal.pt_claim_id;
            link.local_invoice_uuid = xeroInvoiceLocal.id;
          }

          // Credit notes for this contact plus a leg-by-leg recon
          // matrix joining live Xero invoice.payments[] against PT
          // PaymentDetails. Surfaces unsynced PT confirmed legs.
          if (xeroInvoice) {
            try {
              const contactId = xeroInvoice?.contact?.contactID;
              if (contactId) {
                const cnResp = await this.xero.accountingApi.getCreditNotes(
                  xeroDetails.tenant_id,
                  undefined,
                  `Contact.ContactID==Guid("${contactId}")`,
                );
                const cnotes = cnResp?.body?.creditNotes || [];
                xeroSide.creditNotes = cnotes
                  .map((cn: any) => ({
                    id: cn.creditNoteID,
                    number: cn.creditNoteNumber,
                    status: cn.status,
                    total: Number(cn.total || 0),
                    remaining: Number(cn.remainingCredit || 0),
                    date: cn.date,
                  }))
                  .slice(0, 10);
                checks.push({
                  label: 'Xero credit notes (contact)',
                  status: 'ok',
                  detail: `${xeroSide.creditNotes.length} credit note(s) on file for ${xeroInvoice?.contact?.name || contactId}.`,
                });
              }
            } catch (e: any) {
              checks.push({
                label: 'Xero credit notes lookup',
                status: 'warn',
                detail: e?.message || String(e),
              });
            }

            // Payment status classification (Unpaid / Part-paid /
            // Full-paid / Overpaid). Surfaced as a typed check so the
            // user can see exactly how Xero is treating the invoice
            // *before* clicking Run sync — this is what tells them
            // whether the upcoming sync is a full payment, a part
            // payment, or a "pay less" / overpayment scenario.
            try {
              const total = Number(xeroSide.amountTotal || 0);
              const paid = Number(xeroSide.amountPaid || 0);
              const due = Number(xeroSide.amountDue || 0);
              const status = String(xeroInvoice?.status || '').toUpperCase();
              let payLabel = 'Unpaid';
              let payStatus: 'ok' | 'warn' | 'fail' = 'ok';
              let payDetail = '';
              if (paid <= 0.01) {
                payLabel = 'Unpaid';
                payDetail = `No payments recorded on Xero invoice (total $${total.toFixed(2)}).`;
              } else if (paid > total + 0.01) {
                payLabel = 'Overpaid (credit on file)';
                payStatus = 'warn';
                payDetail = `Xero shows paid $${paid.toFixed(2)} > total $${total.toFixed(2)} (excess $${(paid - total).toFixed(2)}). Likely a credit note or overpayment — review before syncing.`;
              } else if (due <= 0.01 || status === 'PAID') {
                payLabel = 'Full payment';
                payDetail = `Xero invoice is fully paid ($${paid.toFixed(2)} of $${total.toFixed(2)}, status ${status || 'PAID'}).`;
              } else {
                // Task #140 — disambiguate pay-less (residual covered
                // by a Xero credit note) from interim part-payment
                // using the same correlation the standard inbound
                // flow uses. If the credit-note allocations cover the
                // residual within $0.01, downgrade to a green "Full
                // payment (covered by credit note …)" check; if they
                // cover only part of the residual, keep the warning
                // but surface the partial-cover detail.
                let cnOffset = 0;
                const cnRefs: Array<{
                  id: string;
                  number: string;
                  amount: number;
                  date: any;
                }> = [];
                try {
                  const matchedCns =
                    await this.findCreditNotesAllocatedToInvoice(
                      xeroDetails.tenant_id,
                      xeroInvoice.invoiceID,
                    );
                  for (const cn of matchedCns) {
                    for (const alloc of cn.allocations || []) {
                      if (
                        alloc?.invoice?.invoiceID === xeroInvoice.invoiceID
                      ) {
                        const amt = Number(alloc.amount || 0);
                        cnOffset += amt;
                        cnRefs.push({
                          id: cn.creditNoteID,
                          number: cn.creditNoteNumber,
                          amount: amt,
                          date: cn.date,
                        });
                      }
                    }
                  }
                } catch (_e) {
                  // Non-fatal — fall back to the original ambiguous
                  // warning so a credit-note lookup hiccup never
                  // blocks the pre-flight.
                }
                if (cnRefs.length > 0) {
                  xeroSide.creditNoteOffsets = cnRefs;
                }
                if (cnOffset > 0 && paid + cnOffset >= total - 0.01) {
                  const refStr = cnRefs
                    .map(
                      (r) =>
                        `${r.number || r.id} for $${r.amount.toFixed(2)}${r.date ? ` on ${moment(r.date).format('DD/MM/YYYY')}` : ''}`,
                    )
                    .join(', ');
                  // Task #140 acceptance — embed the matched CN refs
                  // into payLabel itself so xeroSide.paymentStatus
                  // (used by consumers that don't walk the checks
                  // array) is self-describing.
                  payLabel = `Full payment (covered by credit note ${refStr})`;
                  payStatus = 'ok';
                  payDetail = `Xero invoice fully settled: $${paid.toFixed(2)} paid + $${cnOffset.toFixed(2)} credit note(s) (${refStr}) of $${total.toFixed(2)} total.`;
                } else if (cnOffset > 0) {
                  const refStr = cnRefs
                    .map((r) => `${r.number || r.id} ($${r.amount.toFixed(2)})`)
                    .join(', ');
                  payLabel = 'Part payment / pay less';
                  payStatus = 'warn';
                  payDetail = `Xero invoice is part-paid: $${paid.toFixed(2)} of $${total.toFixed(2)} (still owing $${due.toFixed(2)}). Credit note(s) ${refStr} cover $${cnOffset.toFixed(2)} of the $${due.toFixed(2)} residual — remainder still outstanding.`;
                } else {
                  payLabel = 'Part payment / pay less';
                  payStatus = 'warn';
                  payDetail = `Xero invoice is part-paid: $${paid.toFixed(2)} of $${total.toFixed(2)} (still owing $${due.toFixed(2)}). No credit note allocations found against this invoice — review whether this is an interim part-payment or a "pay less" final settlement before syncing.`;
                }
              }
              xeroSide.paymentStatus = payLabel;
              checks.push({
                label: `Payment status: ${payLabel}`,
                status: payStatus,
                detail: payDetail,
              });
            } catch (_e) {
              // Non-fatal — recon matrix below still runs.
            }

            // Reconciliation matrix
            const xeroLegs = (xeroInvoice.payments || []).map((p: any) => ({
              source: 'xero',
              id: p.paymentID,
              date: p.date,
              amount: Number(p.amount || 0),
              reference: p.reference || null,
            }));
            let ptLegs: Array<{
              source: 'pt';
              id: number;
              date: any;
              amount: number;
              reference: string | null;
              cash_retention: boolean;
              status: string;
              confirmed: boolean;
              xero_payment_id: string | null;
            }> = [];
            const claimIdForLegs =
              ptSide?.id ||
              (xeroInvoiceLocal && xeroInvoiceLocal.pt_claim_id) ||
              null;
            if (claimIdForLegs) {
              const ptPays = await this.paymentDetails.find({
                where: {
                  company_id,
                  payment_claim_id: Number(claimIdForLegs),
                },
                relations: ['subPayments', 'xeroPayments'],
                order: { payment_date: 'ASC' as any },
              });
              ptLegs = ptPays.map((p: any) => {
                const subs = p.subPayments || [];
                const confirmed = subs.some(
                  (s: any) =>
                    s.is_paid_confirmed ||
                    s.is_received_confirmed ||
                    s.is_retention_confirmed,
                );
                const xp = (p.xeroPayments || [])[0];
                return {
                  source: 'pt' as const,
                  id: p.payment_id,
                  date: p.payment_date,
                  amount: Number(p.total_amount || 0),
                  reference: p.memo || null,
                  cash_retention: !!p.cash_retention,
                  status: p.current_status || '',
                  confirmed,
                  xero_payment_id: xp?.payment_id || null,
                };
              });
            }
            // Match each PT leg to a Xero leg by amount (±$0.01) +
            // payment_date (±2 days) using the shared
            // compareAmountAndDate comparator — same source of truth
            // as Task #147 catch-up discovery so divergence between
            // discovery and pre-flight cannot occur.
            const usedXero = new Set<number>();
            const matched: any[] = [];
            const ptUnmatched: any[] = [];
            for (const pl of ptLegs) {
              let hit = -1;
              for (let i = 0; i < xeroLegs.length; i++) {
                if (usedXero.has(i)) continue;
                const xl = xeroLegs[i];
                if (
                  this.compareAmountAndDate(
                    pl.amount || 0,
                    xl.amount || 0,
                    pl.date,
                    xl.date,
                  )
                ) {
                  hit = i;
                  break;
                }
              }
              if (hit >= 0) {
                usedXero.add(hit);
                matched.push({ pt: pl, xero: xeroLegs[hit] });
              } else {
                ptUnmatched.push(pl);
              }
            }
            const xeroUnmatched = xeroLegs.filter(
              (_, i) => !usedXero.has(i),
            );
            const ptUnsyncedConfirmedLegs = ptUnmatched.filter(
              (l) => l.confirmed,
            ).length;
            xeroSide.legs = xeroLegs;
            ptSide.legs = ptLegs;
            xeroSide.reconciliation = {
              matched,
              ptUnmatched,
              xeroUnmatched,
              ptUnsyncedConfirmedLegs,
            };
            checks.push({
              label: 'Payment legs reconciled',
              status:
                ptUnsyncedConfirmedLegs > 0
                  ? 'warn'
                  : xeroUnmatched.length > 0
                  ? 'warn'
                  : 'ok',
              detail: `Matched ${matched.length}, PT-only ${ptUnmatched.length} (confirmed: ${ptUnsyncedConfirmedLegs}), Xero-only ${xeroUnmatched.length}.`,
            });

            // Task #141 — Retention BankTransfer presence check.
            // For paid-with-retention claims, verify that a Xero
            // BankTransfer exists with the *gross* retention amount
            // (per `retention_recording_mode` + invoice `lineAmountTypes`)
            // within ±7 days of any payment leg. Surface present /
            // missing / amount-mismatch as a typed check so operators
            // see the leg's status before re-syncing — without changing
            // PT-side `is_retention_confirmed` flipping logic.
            if (
              ptSide?.cash_retention &&
              Number(ptSide?.retention_amount) > 0
            ) {
              retentionCheck: try {
                const expectedGross = this.computeExpectedGrossRetention(
                  Number(ptSide.retention_amount),
                  xeroInvoice?.lineAmountTypes,
                  (xeroDetails as any)?.retention_recording_mode,
                );
                const ptRetLeg =
                  ptLegs.find((l) => l.cash_retention) || ptLegs[0] || null;
                const refDate =
                  ptRetLeg?.date ||
                  xeroSide?.payments?.[0]?.date ||
                  null;
                const refMs = refDate
                  ? new Date(refDate as any).getTime()
                  : null;
                const WIN_DAYS = 7;
                const WIN_MS = WIN_DAYS * 24 * 60 * 60 * 1000;

                // Resolve the set of mapped retention/trust-account
                // Xero accountIDs for this claim — we only consider a
                // BankTransfer to be "the retention transfer" if one
                // of its endpoints lands in a mapped retention bank
                // account. This prevents false present/mismatch
                // verdicts from unrelated transfers that happen to
                // share the same date and amount.
                const trustAccountIds = new Set<string>();
                const claimIdForTrust = ptSide?.id || claimIdForLegs;
                if (claimIdForTrust) {
                  try {
                    const claimPays = await this.paymentDetails.find({
                      where: {
                        company_id,
                        payment_claim_id: Number(claimIdForTrust),
                      },
                    });
                    const ptRetentionBankIds = Array.from(
                      new Set(
                        claimPays
                          .map((p: any) => p?.retention_account)
                          .filter(
                            (v: any) => v !== null && v !== undefined,
                          )
                          .map((v: any) => Number(v)),
                      ),
                    );
                    if (ptRetentionBankIds.length > 0) {
                      const trustMaps =
                        await this.xeroBankAccountDetails.find({
                          where: {
                            integration_id: xeroDetails.integration_id,
                            pt_bank_account_id: In(ptRetentionBankIds),
                          },
                        });
                      for (const m of trustMaps) {
                        if (m?.account_id)
                          trustAccountIds.add(m.account_id);
                      }
                    }
                  } catch (_e) {
                    // Non-fatal — fall through with empty set; the
                    // check below will degrade to a clear warn.
                  }
                }

                const btResp =
                  await this.xero.accountingApi.getBankTransfers(
                    xeroDetails.tenant_id,
                    new Date('1900-01-01T00:00:00.000+00:00'),
                    null,
                    'Date DESC',
                  );
                const allBts = btResp?.body?.bankTransfers || [];
                const inWindow = refMs
                  ? allBts.filter((t: any) => {
                      if (!t?.date) return false;
                      const tMs = new Date(t.date as any).getTime();
                      if (Number.isNaN(tMs)) return false;
                      return Math.abs(tMs - refMs) <= WIN_MS;
                    })
                  : allBts;
                // Scope to candidates that actually touch a mapped
                // retention/trust account. Fail-closed: if no trust
                // account could be resolved (e.g. retention bank not
                // mapped to Xero yet), surface an inconclusive warn
                // and skip the present/mismatch evaluation entirely
                // — never fall back to unscoped matching, because
                // an unrelated same-date/same-amount transfer could
                // produce a false positive.
                if (trustAccountIds.size === 0) {
                  checks.push({
                    label: 'Retention transfer check inconclusive',
                    status: 'warn',
                    detail:
                      'Could not resolve a mapped retention/trust bank account for this claim — the BankTransfer presence check was skipped. Map the PT retention bank account to its Xero counterpart in Settings → Xero → Bank Accounts and re-run the pre-flight.',
                  });
                  xeroSide.retentionTransferMissing = {
                    expected_gross: expectedGross,
                    window_days: WIN_DAYS,
                    reason: 'no_trust_account_mapped',
                  };
                  break retentionCheck;
                }
                const scopedInWindow = inWindow.filter((t: any) => {
                  const fromAcc = t?.fromBankAccount?.accountID;
                  const toAcc = t?.toBankAccount?.accountID;
                  return (
                    (fromAcc && trustAccountIds.has(fromAcc)) ||
                    (toAcc && trustAccountIds.has(toAcc))
                  );
                });
                const ptRefForRoundTrip = ptRetLeg?.id
                  ? `PT-RET-${ptRetLeg.id}`
                  : null;
                const refMatched = ptRefForRoundTrip
                  ? scopedInWindow.find(
                      (t: any) =>
                        (t?.reference || '').trim() === ptRefForRoundTrip,
                    )
                  : null;
                const exact = scopedInWindow.filter(
                  (t: any) =>
                    Math.abs(
                      Math.abs(Number(t?.amount || 0)) - expectedGross,
                    ) <= 0.01,
                );
                const winner = refMatched || exact[0] || null;
                if (winner) {
                  const wAmt = Number(winner.amount || 0);
                  const wDate = winner.date
                    ? moment(winner.date as any).format('DD/MM/YYYY')
                    : '';
                  checks.push({
                    label: `Retention transfer present (BankTransfer ${winner.bankTransferID}, $${wAmt.toFixed(2)} on ${wDate})`,
                    status: 'ok',
                    detail: `Matched expected gross retention $${expectedGross.toFixed(2)} against Xero BankTransfer ${winner.bankTransferID}${refMatched ? ' via PT-RET reference' : ' on amount + ±7-day window'}.`,
                  });
                  xeroSide.retentionTransfer = {
                    bank_transfer_id: winner.bankTransferID,
                    amount: wAmt,
                    date: winner.date,
                    matched_by: refMatched ? 'reference' : 'amount',
                    expected_gross: expectedGross,
                  };
                } else {
                  // Look for an in-window candidate with a different
                  // amount — likely someone pushed the net instead of
                  // the gross. Surface it as an explicit mismatch
                  // rather than letting it disappear behind a generic
                  // "missing" warning.
                  const mismatchCandidate = scopedInWindow.find(
                    (t: any) => {
                      const a = Math.abs(Number(t?.amount || 0));
                      return a > 0 && Math.abs(a - expectedGross) > 0.01;
                    },
                  );
                  if (mismatchCandidate) {
                    const fAmt = Number(mismatchCandidate.amount || 0);
                    checks.push({
                      label: 'Retention transfer amount mismatch',
                      status: 'warn',
                      detail: `Expected gross $${expectedGross.toFixed(2)} (incl. GST where applicable), found BankTransfer ${mismatchCandidate.bankTransferID} for $${fAmt.toFixed(2)} in the ±${WIN_DAYS}-day window. Likely the net was transferred instead of the gross — review before syncing.`,
                    });
                    xeroSide.retentionTransferMismatch = {
                      expected_gross: expectedGross,
                      found_bank_transfer_id:
                        mismatchCandidate.bankTransferID,
                      found_amount: fAmt,
                      window_days: WIN_DAYS,
                    };
                  } else {
                    checks.push({
                      label: 'Retention transfer leg missing',
                      status: 'warn',
                      detail: `No BankTransfer found in Xero matching the expected gross retention of $${expectedGross.toFixed(2)} within ±${WIN_DAYS} days. is_retention_confirmed will remain unticked on PayTrade until the transfer exists in Xero.`,
                    });
                    xeroSide.retentionTransferMissing = {
                      expected_gross: expectedGross,
                      window_days: WIN_DAYS,
                    };
                  }
                }
              } catch (e: any) {
                // Non-fatal — surface the lookup failure as a warn so
                // the operator knows the retention check didn't run,
                // without blocking the rest of the pre-flight.
                checks.push({
                  label: 'Retention transfer check',
                  status: 'warn',
                  detail: `Could not query Xero BankTransfers: ${e?.message || String(e)}`,
                });
              }
            }
          }
        }

        // Cross-side mapping
        if (xeroSide.exists && ptSide.exists) {
          if (link.mapped && Number(link.pt_claim_id) === Number(ptSide.id)) {
            checks.push({
              label: 'Mapping',
              status: 'ok',
              detail: `Xero invoice already linked to PT claim #${ptSide.id}.`,
            });
          } else if (link.mapped) {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail: `Xero invoice is linked to a different PT claim (#${link.pt_claim_id}). Re-importing may rebind it.`,
            });
          } else {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail:
                'Xero invoice and PT claim are not linked. Re-import will attempt to link by reference/contact.',
            });
          }
          // Amount sanity
          const amtDelta = Math.abs(
            (xeroSide.amountTotal || 0) - (ptSide.amount || 0),
          );
          if (amtDelta > 0.01) {
            checks.push({
              label: 'Amount agreement',
              status: 'warn',
              detail: `Xero total $${(xeroSide.amountTotal || 0).toFixed(2)} ≠ PT claim $${(ptSide.amount || 0).toFixed(2)} (Δ $${amtDelta.toFixed(2)}).`,
            });
          } else {
            checks.push({
              label: 'Amount agreement',
              status: 'ok',
              detail: 'Totals match within $0.01.',
            });
          }
          // Mapping validators surfaced as typed checks.
          try {
            // 1) Contact mapping: PT claim's client_supplier should
            //    have a XeroContactDetails row pointing at this
            //    invoice's Xero contactID.
            const ptClaimRow = await this.paymentClaims.findOne({
              where: {
                company_id,
                payment_claim_id: Number(ptSide.id),
              },
              relations: ['clientSupplierDetails'],
            });
            const csId = ptClaimRow?.client_supplier_id;
            const xeroContactId = (xeroInvoice?.contact?.contactID as
              | string
              | undefined) || undefined;
            if (csId && xeroContactId) {
              const cmap = await this.xeroContactDetails.findOne({
                where: {
                  integration_id: xeroDetails.integration_id,
                  pt_contact_id: Number(csId),
                  contact_id: xeroContactId,
                },
              });
              if (cmap) {
                checks.push({
                  label: 'Contact mapping',
                  status: 'ok',
                  detail: `PT contact #${csId} ↔ Xero ${xeroInvoice?.contact?.name || xeroContactId}.`,
                });
              } else {
                const anyMap = await this.xeroContactDetails.findOne({
                  where: {
                    integration_id: xeroDetails.integration_id,
                    pt_contact_id: Number(csId),
                  },
                });
                checks.push({
                  label: 'Contact mapping',
                  status: 'warn',
                  detail: anyMap
                    ? `PT contact #${csId} maps to a different Xero contact (${anyMap.contact_id}). Re-import will rebind to ${xeroContactId}.`
                    : `No XeroContactDetails row binds PT contact #${csId} to Xero ${xeroContactId}. Re-import will create one.`,
                });
              }
            }

            // 2) Project tracking category: warn if the integration
            //    has tracking enabled but lineItems carry no tracking
            //    references.
            const trackingEnabled = !!(
              (xeroDetails as any)?.project_tracking_category_id ||
              (xeroDetails as any)?.tracking_category_id ||
              (xeroDetails as any)?.project_tracking_enabled
            );
            if (trackingEnabled) {
              const lineItems = (xeroInvoice?.lineItems || []) as any[];
              const withTracking = lineItems.filter(
                (li) =>
                  Array.isArray(li.tracking) && li.tracking.length > 0,
              ).length;
              checks.push({
                label: 'Project tracking',
                status:
                  lineItems.length === 0
                    ? 'warn'
                    : withTracking === lineItems.length
                    ? 'ok'
                    : 'warn',
                detail: `${withTracking}/${lineItems.length} line item(s) carry a tracking category.`,
              });
            }

            // 3) Account codes: every line item should have one.
            const lineItems = (xeroInvoice?.lineItems || []) as any[];
            const missingAcct = lineItems.filter(
              (li) => !li.accountCode,
            ).length;
            checks.push({
              label: 'Account codes',
              status:
                lineItems.length > 0 && missingAcct === 0 ? 'ok' : 'warn',
              detail:
                lineItems.length === 0
                  ? 'No line items on the Xero invoice.'
                  : missingAcct === 0
                  ? `All ${lineItems.length} line item(s) have account codes.`
                  : `${missingAcct}/${lineItems.length} line item(s) missing accountCode — Xero will reject re-push.`,
            });

            // 4) Tax rates: every line item should have a taxType.
            const missingTax = lineItems.filter(
              (li) => !li.taxType,
            ).length;
            checks.push({
              label: 'Tax rates',
              status:
                lineItems.length > 0 && missingTax === 0 ? 'ok' : 'warn',
              detail:
                lineItems.length === 0
                  ? '—'
                  : missingTax === 0
                  ? `All ${lineItems.length} line item(s) have tax types.`
                  : `${missingTax}/${lineItems.length} line item(s) missing taxType.`,
            });
          } catch (e: any) {
            checks.push({
              label: 'Mapping validators',
              status: 'warn',
              detail: e?.message || String(e),
            });
          }

          // Block: both fully paid with disagreeing totals
          const xeroFullyPaid =
            xeroSide.amountDue <= 0.01 && xeroSide.status === 'PAID';
          const ptFullyPaid = ptSide.status === 'Paid';
          if (xeroFullyPaid && ptFullyPaid && amtDelta > 0.01) {
            blocked = true;
            blockReason =
              'Both sides are fully paid but their totals disagree. Resolve manually before syncing — this dialog will not over-write paid records.';
          }
        }
      } else if (rawType === 'payment') {
        if (pt_id) {
          const pay = await this.paymentDetails.findOne({
            where: { company_id, payment_id: Number(pt_id) },
            relations: ['clientSupplierDetails', 'subPayments', 'paymentClaims'],
          });
          if (pay) {
            ptSide.exists = true;
            ptSide.id = pay.payment_id;
            ptSide.uuid = pay.id;
            ptSide.kind = pay.payment_type;
            ptSide.amount = Number(pay.total_amount || 0);
            ptSide.cash_retention = !!pay.cash_retention;
            ptSide.status = pay.current_status;
            ptSide.payment_claim_id = pay.payment_claim_id;
            ptSide.contact = pay.clientSupplierDetails?.client_supplier_name;
            const subs = pay.subPayments || [];
            ptSide.confirmed = subs.some(
              (s: any) =>
                s.is_paid_confirmed ||
                s.is_received_confirmed ||
                s.is_retention_confirmed,
            );
            ptSide.summary = `Payment #${pay.payment_id} (${pay.payment_type || ''}) — ${ptSide.contact || ''} — $${ptSide.amount.toFixed(2)}${pay.cash_retention ? ' (with retention)' : ''} — ${pay.current_status || ''}`;
          } else {
            checks.push({
              label: 'PayTrade payment',
              status: 'fail',
              detail: `No payment found for id ${pt_id}.`,
            });
          }
        }
        if (xero_id) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(xero_id)) {
            checks.push({
              label: 'Xero payment id',
              status: 'fail',
              detail: 'Payment id must be a Xero GUID.',
            });
          } else {
            const local = await this.xeroPayments.findOne({
              where: {
                integration_id: xeroDetails.integration_id,
                payment_id: xero_id,
              },
            });
            if (local) {
              link.mapped = !!local.pt_payment_id;
              link.pt_payment_id = local.pt_payment_id;
            }
            try {
              await this.xeroService.refreshTokenSet(company_id, this.xero);
              const resp = await this.xero.accountingApi.getPayment(
                xeroDetails.tenant_id,
                xero_id,
              );
              const p = resp?.body?.payments?.[0];
              if (p) {
                xeroSide.exists = true;
                xeroSide.id = p.paymentID;
                xeroSide.amount = Number(p.amount || 0);
                xeroSide.date = p.date;
                xeroSide.status = p.status;
                xeroSide.invoiceId = p.invoice?.invoiceID;
                xeroSide.summary = `Payment ${p.paymentID} — $${xeroSide.amount.toFixed(2)} on ${p.date} — ${p.status} — invoice ${xeroSide.invoiceId || '(none)'}`;
              } else {
                checks.push({
                  label: 'Xero payment',
                  status: 'fail',
                  detail: `No Xero payment found for ${xero_id}.`,
                });
              }
            } catch (e: any) {
              checks.push({
                label: 'Live Xero lookup',
                status: 'warn',
                detail: e?.message || String(e),
              });
            }
          }
        }
        // Push prerequisites for PT-only payment push: the PT payment
        // must reference an invoice mapped into Xero, and its bank
        // account must map to a XeroBankAccountDetails row.
        if (ptSide.exists && !xeroSide.exists) {
          try {
            const pay = await this.paymentDetails.findOne({
              where: { company_id, payment_id: Number(pt_id) },
            });
            const claimId = pay?.payment_claim_id;
            if (claimId) {
              const mappedInv = await this.xeroInvoicesBills.findOne({
                where: {
                  integration_id: xeroDetails.integration_id,
                  pt_claim_id: Number(claimId),
                },
              });
              checks.push({
                label: 'Push prerequisite: invoice mapped',
                status: mappedInv?.invoice_id ? 'ok' : 'fail',
                detail: mappedInv?.invoice_id
                  ? `PT claim #${claimId} maps to Xero invoice ${mappedInv.invoice_id}.`
                  : `PT claim #${claimId} is not yet pushed to Xero. Push the invoice first.`,
              });
              if (!mappedInv?.invoice_id) {
                blocked = true;
                blockReason =
                  blockReason ||
                  `PT payment cannot be pushed: the parent claim #${claimId} has no Xero invoice yet.`;
              }
            }
            const bankAcctId = pay?.payment_from_account || pay?.payment_to_account;
            if (bankAcctId) {
              const bankMap = await this.xeroBankAccountDetails.findOne({
                where: {
                  integration_id: xeroDetails.integration_id,
                  pt_bank_account_id: Number(bankAcctId),
                },
              });
              checks.push({
                label: 'Push prerequisite: bank account mapped',
                status: bankMap ? 'ok' : 'fail',
                detail: bankMap
                  ? `PT bank account #${bankAcctId} → Xero account ${bankMap.account_id}.`
                  : `PT bank account #${bankAcctId} has no Xero mapping.`,
              });
              if (!bankMap) {
                blocked = true;
                blockReason =
                  blockReason ||
                  `PT payment cannot be pushed: bank account #${bankAcctId} is not mapped to a Xero account.`;
              }
            }
          } catch (e: any) {
            checks.push({
              label: 'Push prerequisite checks',
              status: 'warn',
              detail: e?.message || String(e),
            });
          }
        }
        if (xeroSide.exists && ptSide.exists) {
          if (link.mapped && Number(link.pt_payment_id) === Number(ptSide.id)) {
            checks.push({
              label: 'Mapping',
              status: 'ok',
              detail: `Xero payment already linked to PT payment #${ptSide.id}.`,
            });
          } else if (link.mapped) {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail: `Xero payment is linked to a different PT payment (#${link.pt_payment_id}).`,
            });
          } else {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail: 'Xero payment and PT payment are not linked.',
            });
          }
          const amtDelta = Math.abs(
            (xeroSide.amount || 0) - (ptSide.amount || 0),
          );
          checks.push({
            label: 'Amount agreement',
            status: amtDelta < 0.01 ? 'ok' : 'warn',
            detail:
              amtDelta < 0.01
                ? 'Amounts match.'
                : `Xero $${(xeroSide.amount || 0).toFixed(2)} ≠ PT $${(ptSide.amount || 0).toFixed(2)} (Δ $${amtDelta.toFixed(2)}).`,
          });
        }
      } else if (rawType === 'contact') {
        if (pt_id) {
          const cs = await this.clientSuppliersDetails.findOne({
            where: { company_id, client_supplier_id: Number(pt_id) },
          });
          if (cs) {
            ptSide.exists = true;
            ptSide.id = cs.client_supplier_id;
            ptSide.uuid = cs.id;
            ptSide.kind = cs.client_supplier_type;
            ptSide.summary = `${cs.client_supplier_name}${cs.business_name ? ` (${cs.business_name})` : ''} — ${cs.client_supplier_type}`;
          }
        }
        if (xero_id) {
          const local = await this.xeroContactDetails.findOne({
            where: {
              integration_id: xeroDetails.integration_id,
              contact_id: xero_id,
            },
          });
          if (local) {
            link.mapped = !!local.pt_contact_id;
            link.pt_client_supplier_id = local.pt_contact_id;
            xeroSide.exists = true;
            xeroSide.id = local.contact_id;
            xeroSide.summary = `Xero contact ${local.contact_id}${local.contact_name ? ` — ${local.contact_name}` : ''}`;
          } else {
            try {
              await this.xeroService.refreshTokenSet(company_id, this.xero);
              const resp = await this.xero.accountingApi.getContact(
                xeroDetails.tenant_id,
                xero_id,
              );
              const c = resp?.body?.contacts?.[0];
              if (c) {
                xeroSide.exists = true;
                xeroSide.id = c.contactID;
                xeroSide.summary = `Xero contact ${c.contactID} — ${c.name || ''}`;
              }
            } catch (e: any) {
              checks.push({
                label: 'Live Xero lookup',
                status: 'warn',
                detail: e?.message || String(e),
              });
            }
          }
        }
        if (xeroSide.exists && ptSide.exists) {
          checks.push({
            label: 'Mapping',
            status: link.mapped ? 'ok' : 'warn',
            detail: link.mapped
              ? `Already linked to PT contact #${link.pt_client_supplier_id}.`
              : 'Not linked yet.',
          });
        }
      } else if (rawType === 'trust_movement') {
        // Task #231 — Trust movement preflight. PT side is a row in
        // payment_details (payment_type ∈ trust set), Xero side is a
        // BankTransfer, link is xero_payments.bank_transfer_id ↔
        // pt_payment_id. We surface presence + amount-agreement
        // diagnostics so the user can confirm before linking.
        if (pt_id) {
          const pay = await this.paymentDetails.findOne({
            where: { company_id, payment_id: Number(pt_id) },
            relations: ['clientSupplierDetails'],
          });
          if (pay) {
            const isTrust = [
              'Withdrawal',
              'Top Up',
              'Interest Received',
              'Interest Withdrawal',
              'Bank Charge Applied',
              'Bank Charge Top Up',
              'Top Up Retention',
            ].includes(String(pay.payment_type || ''));
            if (!isTrust) {
              checks.push({
                label: 'PayTrade payment type',
                status: 'fail',
                detail: `PT payment #${pay.payment_id} is "${pay.payment_type}", not a trust movement.`,
              });
            } else {
              ptSide.exists = true;
              ptSide.id = pay.payment_id;
              ptSide.uuid = pay.id;
              ptSide.kind = pay.payment_type;
              ptSide.amount = Number(pay.total_amount || 0);
              ptSide.status = pay.current_status;
              ptSide.summary = `PT-MOV-${pay.payment_id} (${pay.payment_type}) — $${ptSide.amount.toFixed(2)} — ${pay.current_status || ''}`;
            }
          } else {
            checks.push({
              label: 'PayTrade payment',
              status: 'fail',
              detail: `No payment found for id ${pt_id}.`,
            });
          }
        }
        if (xero_id) {
          const local = await this.xeroPayments.findOne({
            where: {
              integration_id: xeroDetails.integration_id,
              bank_transfer_id: xero_id,
            },
          });
          if (local) {
            link.mapped = !!local.pt_payment_id;
            link.pt_payment_id = local.pt_payment_id;
          }
          try {
            await this.xeroService.refreshTokenSet(company_id, this.xero);
            const resp = await this.xero.accountingApi.getBankTransfer(
              xeroDetails.tenant_id,
              xero_id,
            );
            const bt: any = resp?.body?.bankTransfers?.[0];
            if (bt) {
              xeroSide.exists = true;
              xeroSide.id = bt.bankTransferID;
              xeroSide.amount = Number(bt.amount || 0);
              xeroSide.date = bt.date;
              const ref = bt.reference || '';
              xeroSide.summary = `BankTransfer ${bt.bankTransferID} — $${xeroSide.amount.toFixed(2)} on ${bt.date} — ${ref}`;

              // Trust-pair invariant: a real trust movement must move
              // funds between a trust account (PTA/RTA) and that
              // trust's `associated_cash_account_id`. Look up the
              // from/to Xero accounts in xero_bank_account_details,
              // resolve to PT bank accounts, then verify the pairing.
              try {
                const fromXeroId = bt?.fromBankAccount?.accountID;
                const toXeroId = bt?.toBankAccount?.accountID;
                const [fromMap, toMap] = await Promise.all([
                  fromXeroId
                    ? this.xeroBankAccountDetails.findOne({
                        where: {
                          integration_id: xeroDetails.integration_id,
                          account_id: fromXeroId,
                        },
                      })
                    : Promise.resolve(null),
                  toXeroId
                    ? this.xeroBankAccountDetails.findOne({
                        where: {
                          integration_id: xeroDetails.integration_id,
                          account_id: toXeroId,
                        },
                      })
                    : Promise.resolve(null),
                ]);
                if (!fromMap?.pt_bank_account_id || !toMap?.pt_bank_account_id) {
                  checks.push({
                    label: 'Trust pair: account mappings',
                    status: 'fail',
                    detail: `One or both Xero bank accounts are not mapped to PayTrade bank accounts (from=${fromXeroId || '?'} to=${toXeroId || '?'}).`,
                  });
                } else {
                  const [fromBank, toBank] = await Promise.all([
                    this.bankAccounts.findOne({
                      where: { bank_account_id: Number(fromMap.pt_bank_account_id) },
                    }),
                    this.bankAccounts.findOne({
                      where: { bank_account_id: Number(toMap.pt_bank_account_id) },
                    }),
                  ]);
                  const trustTypes = new Set([
                    'Project Trust Account',
                    'Retention Trust Account',
                  ]);
                  const fromIsTrust = trustTypes.has(String(fromBank?.account_type || ''));
                  const toIsTrust = trustTypes.has(String(toBank?.account_type || ''));
                  if (fromIsTrust === toIsTrust) {
                    checks.push({
                      label: 'Trust pair: direction',
                      status: 'fail',
                      detail: 'Trust movement requires exactly one trust (PTA/RTA) leg and one cash leg.',
                    });
                  } else {
                    const trustBank = fromIsTrust ? fromBank : toBank;
                    const cashBank = fromIsTrust ? toBank : fromBank;
                    const associated = Number((trustBank as any)?.associated_cash_account_id || 0);
                    if (!associated || associated !== Number(cashBank?.bank_account_id)) {
                      checks.push({
                        label: 'Trust pair: associated cash account',
                        status: 'fail',
                        detail: `Cash leg (PT bank #${cashBank?.bank_account_id}) is not the trust's associated_cash_account_id (#${associated || 'not set'}).`,
                      });
                    } else {
                      checks.push({
                        label: 'Trust pair: associated cash account',
                        status: 'ok',
                        detail: `${trustBank?.account_type} #${trustBank?.bank_account_id} ↔ cash #${cashBank?.bank_account_id} pairing is valid.`,
                      });
                    }
                  }
                }
              } catch (pairErr: any) {
                checks.push({
                  label: 'Trust pair validation',
                  status: 'warn',
                  detail: pairErr?.message || String(pairErr),
                });
              }
            } else {
              checks.push({
                label: 'Xero BankTransfer',
                status: 'fail',
                detail: `No Xero BankTransfer found for ${xero_id}.`,
              });
            }
          } catch (e: any) {
            checks.push({
              label: 'Live Xero lookup',
              status: 'warn',
              detail: e?.message || String(e),
            });
          }
        }
        if (xeroSide.exists && ptSide.exists) {
          if (link.mapped && Number(link.pt_payment_id) === Number(ptSide.id)) {
            checks.push({
              label: 'Mapping',
              status: 'ok',
              detail: `BankTransfer already linked to PT payment #${ptSide.id}.`,
            });
          } else if (link.mapped) {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail: `BankTransfer is linked to a different PT payment (#${link.pt_payment_id}).`,
            });
          } else {
            checks.push({
              label: 'Mapping',
              status: 'warn',
              detail: 'BankTransfer and PT payment are not linked.',
            });
          }
          const amtDelta = Math.abs(
            (xeroSide.amount || 0) - (ptSide.amount || 0),
          );
          checks.push({
            label: 'Amount agreement',
            status: amtDelta < 0.01 ? 'ok' : 'warn',
            detail:
              amtDelta < 0.01
                ? 'Amounts match.'
                : `Xero $${(xeroSide.amount || 0).toFixed(2)} ≠ PT $${(ptSide.amount || 0).toFixed(2)} (Δ $${amtDelta.toFixed(2)}).`,
          });
        }
      } else {
        // bank_transfer / manual_journal — Xero-side import path only.
        if (pt_id) {
          checks.push({
            label: 'PayTrade-side selection',
            status: 'fail',
            detail:
              'PayTrade-side selection is not supported for this record type. Use the Xero-side picker only.',
          });
        }
        if (xero_id) {
          xeroSide.exists = true;
          xeroSide.id = xero_id;
          xeroSide.summary = `Xero ${rawType} ${xero_id}`;
        }
      }

      // Recommended action decision table:
      //   blocked                                              → blocked
      //   only Xero / only PT                                  → import / push
      //   both, reconcile + agree                              → link
      //   both, amounts disagree (and not both fully paid)     → import
      //   both, PT has unsynced confirmed legs                 → push
      let recommendedAction: 'import' | 'push' | 'link' | 'blocked' = 'import';
      const recon: any = (xeroSide && xeroSide.reconciliation) || null;
      if (blocked) {
        recommendedAction = 'blocked';
      } else if (xeroSide.exists && ptSide.exists && link.mapped) {
        const amtDelta =
          rawType === 'invoice_bill'
            ? Math.abs(
                (xeroSide.amountTotal || 0) - (ptSide.amount || 0),
              )
            : Math.abs((xeroSide.amount || 0) - (ptSide.amount || 0));
        const ptUnsyncedLegs = Number(recon?.ptUnsyncedConfirmedLegs || 0);
        const xeroUnmatchedLegs = Number(
          (recon?.xeroUnmatched || []).length || 0,
        );
        if (ptUnsyncedLegs > 0) {
          // PT has confirmed payments Xero doesn't know about → push.
          recommendedAction = 'push';
        } else if (xeroUnmatchedLegs > 0) {
          // Xero has payment legs PT is missing → import to pull them in.
          recommendedAction = 'import';
        } else if (amtDelta < 0.01) {
          // Both agree on totals and legs → no overwrite, just confirm
          // the binding via the explicit link path.
          recommendedAction = 'link';
        } else {
          recommendedAction = 'import';
        }
      } else if (xeroSide.exists && ptSide.exists && !link.mapped) {
        // Both records exist but no mapping row binds them yet. Use
        // reconciliation to pick a direction instead of a blanket link.
        const amtDelta =
          rawType === 'invoice_bill'
            ? Math.abs(
                (xeroSide.amountTotal || 0) - (ptSide.amount || 0),
              )
            : Math.abs((xeroSide.amount || 0) - (ptSide.amount || 0));
        const ptUnsyncedLegs = Number(recon?.ptUnsyncedConfirmedLegs || 0);
        const xeroUnmatchedLegs = Number(
          (recon?.xeroUnmatched || []).length || 0,
        );
        if (ptUnsyncedLegs > 0) {
          recommendedAction = 'push';
        } else if (xeroUnmatchedLegs > 0 || amtDelta > 0.01) {
          recommendedAction = 'import';
        } else {
          recommendedAction = 'link';
        }
      } else if (xeroSide.exists) {
        recommendedAction = 'import';
      } else if (ptSide.exists) {
        recommendedAction = 'push';
      }

      // PT-side push support guard
      const ptPushSupported = new Set([
        'invoice_bill',
        'payment',
        'trust_movement',
      ]);
      if (recommendedAction === 'push' && !ptPushSupported.has(rawType)) {
        blocked = true;
        blockReason = `Pushing a "${rawType}" from PayTrade is not supported via this dialog. Use the per-record action on its source page.`;
        recommendedAction = 'blocked';
      }

      // PT-only invoice push with status=Paid is unsupported by the
      // per-claim creator (it throws on Paid). The user must reconfirm
      // the claim to Confirmed first, then push, then push payments.
      if (
        recommendedAction === 'push' &&
        rawType === 'invoice_bill' &&
        ptSide.exists &&
        !xeroSide.exists &&
        String(ptSide.status || '').toLowerCase() === 'paid'
      ) {
        blocked = true;
        blockReason =
          `PT claim #${ptSide.id} is locally Paid but has no Xero invoice. ` +
          `The per-claim creator does not accept Paid claims. ` +
          `Reset the claim to Confirmed, push the invoice, then push its payments individually.`;
        recommendedAction = 'blocked';
        checks.push({
          label: 'Push prerequisite: claim status',
          status: 'fail',
          detail: blockReason,
        });
      }

      // Action description
      const actionSummary =
        recommendedAction === 'import'
          ? `Re-pull the Xero record and re-run the inbound webhook handler (sync_run_type=manual).`
          : recommendedAction === 'push'
          ? `Push the PayTrade record (or its unsynced payment legs) to Xero using the per-record creator service.`
          : recommendedAction === 'link'
          ? `Records are linked and reconciled — re-confirm linkage without overwriting either side.`
          : `Blocked — see reason. No sync will be performed.`;

      const tokenPayload = {
        company_id,
        type: rawType,
        xero_id,
        pt_id,
        recommendedAction,
      };
      const signed = blocked
        ? { token: '', expiresAt: 0 }
        : this.signManualSyncActionToken(tokenPayload);

      return {
        success: true,
        type: rawType,
        company_id,
        xero_id: xero_id || null,
        pt_id: pt_id || null,
        recommendedAction,
        blocked,
        blockReason,
        actionSummary,
        checks,
        xeroSide,
        ptSide,
        link,
        actionToken: signed.token,
        actionTokenExpiresAt: signed.expiresAt,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.error(`[MANUAL_PREFLIGHT] ${msg}`);
      return { success: false, message: msg };
    }
  }

  /**
   * Two-sided manual sync entry point. Wraps the existing
   * `manualXeroResync` (Xero-side import) and adds the PT-side push and
   * link routes. Validates the action token signed by `manualXeroPreflight`
   * so the UI cannot bypass the Check step.
   */
  async manualXeroTwoSidedSync(
    decoded: any,
    input: {
      company_id: number;
      type: string;
      xero_id?: string | null;
      pt_id?: string | null;
      action_token: string;
      reviewed?: boolean;
      preflight_snapshot_json?: string | null;
    },
  ): Promise<{
    success: boolean;
    message: string;
    syncLogId?: number | null;
    resolvedXeroId?: string | null;
    direction?: string;
  }> {
    const company_id = Number(input?.company_id);
    const rawType = String(input?.type || '').trim().toLowerCase();
    const xero_id = String(input?.xero_id || '').trim();
    const pt_id = String(input?.pt_id || '').trim();
    const action_token = String(input?.action_token || '');
    const reviewed = !!input?.reviewed;
    let preflightSnapshot: any = null;
    if (input?.preflight_snapshot_json) {
      try {
        preflightSnapshot = JSON.parse(String(input.preflight_snapshot_json));
      } catch {
        preflightSnapshot = null;
      }
    }

    const verify = this.verifyManualSyncActionToken(action_token, {
      company_id,
      type: rawType,
      xero_id,
      pt_id,
    });
    if (!verify.ok) {
      return {
        success: false,
        message: `Pre-flight token ${verify.reason}. Click Check again before running the sync.`,
      };
    }
    if (!reviewed) {
      return {
        success: false,
        message:
          'You must tick "I\'ve reviewed this" before running a two-sided sync.',
      };
    }
    const direction = String(verify.action || '').toLowerCase();
    if (direction === 'blocked') {
      const blockReason =
        preflightSnapshot?.blockReason ||
        'Pre-flight blocked this combination. Resolve the underlying issue before re-running.';
      const blockedLogId = await this.writeTwoSidedTriggerLog(decoded, {
        company_id,
        type: rawType,
        direction: 'blocked',
        xero_id,
        pt_id,
        integration_id: 0,
        success: false,
        message: blockReason,
        reviewed,
        preflightSnapshot,
        outcome: 'blocked',
      });
      return {
        success: false,
        message: blockReason,
        direction: 'blocked',
        syncLogId: blockedLogId,
      };
    }

    // PT → Xero push
    if (direction === 'push') {
      if (!pt_id) {
        return {
          success: false,
          message: 'Push direction requires a PayTrade record id.',
        };
      }
      try {
        if (rawType === 'invoice_bill') {
          const result = await this.xeroInvoicesService.createInvoiceOrBillInXero(
            decoded,
            { payment_claim_id: Number(pt_id) },
          );
          const triggerLogId = await this.writeTwoSidedTriggerLog(decoded, {
            company_id,
            type: rawType,
            direction,
            xero_id,
            pt_id,
            integration_id: 0,
            success: result !== false,
            message:
              result === false
                ? 'Push reported failure — see preceding sync log entries.'
                : `Push of PT claim ${pt_id} to Xero dispatched.`,
            reviewed,
            preflightSnapshot,
            outcome: result === false ? 'push_failed' : 'push_dispatched',
          });
          return {
            success: result !== false,
            message:
              result === false
                ? `Push of PT claim ${pt_id} reported failure — see sync log.`
                : `PT claim ${pt_id} pushed to Xero (per-claim creator).`,
            direction,
            syncLogId: triggerLogId,
          };
        }
        if (rawType === 'trust_movement') {
          // Task #231 — PT-origin manual recovery: push an unlinked
          // trust-movement payment to Xero as a PT-MOV-{id} BankTransfer
          // through the same code path the resolver / scheduler use.
          const result = await this.xeroPaymentsService.pushTrustMovement(
            decoded,
            { payment_id: Number(pt_id) },
          );
          const triggerLogId = await this.writeTwoSidedTriggerLog(decoded, {
            company_id,
            type: rawType,
            direction,
            xero_id,
            pt_id,
            integration_id: 0,
            success: !!result?.success,
            message: result?.success
              ? `Trust movement PT payment ${pt_id} pushed to Xero as BankTransfer ${result.bank_transfer_id} (${result.reference}).`
              : `Push of trust movement PT payment ${pt_id} failed: ${result?.message || 'unknown error'}.`,
            reviewed,
            preflightSnapshot,
            outcome: result?.success ? 'push_dispatched' : 'push_failed',
          });
          return {
            success: !!result?.success,
            message: result?.success
              ? `Trust movement PT payment ${pt_id} pushed to Xero.`
              : `Push of trust movement PT payment ${pt_id} reported failure — ${result?.message || 'see sync log'}.`,
            direction,
            syncLogId: triggerLogId,
            resolvedXeroId: result?.bank_transfer_id || null,
          };
        }
        if (rawType === 'payment') {
          const pay = await this.paymentDetails.findOne({
            where: { company_id, payment_id: Number(pt_id) },
          });
          if (!pay) {
            return {
              success: false,
              message: `PT payment #${pt_id} not found.`,
              direction,
            };
          }
          const result = await this.xeroPaymentsService.createPayment(decoded, {
            payment_id: pay.payment_id,
            bank_account_id: pay.payment_from_account || pay.payment_to_account,
            retention_account: pay.retention_account,
            amount: Number(pay.total_amount || 0),
            retention_amount: 0,
            payment_date: pay.payment_date,
            cash_retention: pay.cash_retention,
            sync_payment: true,
            sync_transfer: !!pay.cash_retention,
          });
          const triggerLogId = await this.writeTwoSidedTriggerLog(decoded, {
            company_id,
            type: rawType,
            direction,
            xero_id,
            pt_id,
            integration_id: 0,
            success: result !== false,
            message:
              result === false
                ? 'Push reported failure — see preceding sync log entries.'
                : `Push of PT payment ${pt_id} to Xero dispatched.`,
            reviewed,
            preflightSnapshot,
            outcome: result === false ? 'push_failed' : 'push_dispatched',
          });
          return {
            success: result !== false,
            message:
              result === false
                ? `Push of PT payment ${pt_id} reported failure — see sync log.`
                : `PT payment ${pt_id} pushed to Xero (per-payment creator).`,
            direction,
            syncLogId: triggerLogId,
          };
        }
        return {
          success: false,
          message: `Push not supported for type "${rawType}".`,
          direction,
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        this.logger.error(`[MANUAL_TWO_SIDED_PUSH] ${msg}`);
        return { success: false, message: msg, direction };
      }
    }

    // Xero → PT import (also handles 'link' — re-import attempts mapping).
    if (!xero_id) {
      return {
        success: false,
        message: 'Import/link direction requires a Xero record id.',
      };
    }

    // Explicit link path: when both ids are provided and the recommended
    // action is 'link', persist the binding on the local mapping table
    // without calling the inbound webhook handler. If no local row
    // exists for the Xero id we INSERT one using a fresh Xero fetch —
    // we never fall through to import (which would drop pt_id).
    if (direction === 'link' && pt_id) {
      try {
        const xeroDetailsForLink = await this.xeroIntegrationDetails.findOne({
          where: { company_id, status: 'ACTIVE' },
        });
        const integration_id = xeroDetailsForLink?.integration_id;
        if (!integration_id) {
          return {
            success: false,
            message: 'No active Xero integration found for this company.',
            direction,
          };
        }
        const tenant_id = xeroDetailsForLink!.tenant_id;
        let bound = false;
        let boundDetail = '';
        let createdNew = false;
        await this.xeroService.refreshTokenSet(company_id, this.xero);
        if (rawType === 'invoice_bill') {
          let row = await this.xeroInvoicesBills.findOne({
            where: { integration_id, invoice_id: xero_id },
          });
          if (!row) {
            const resp = await this.xero.accountingApi.getInvoice(
              tenant_id,
              xero_id,
            );
            const inv: any = resp?.body?.invoices?.[0];
            if (!inv) {
              return {
                success: false,
                message: `Cannot link: Xero invoice ${xero_id} not found.`,
                direction,
              };
            }
            row = this.xeroInvoicesBills.create({
              invoice_id: inv.invoiceID,
              integration_id,
              tenant_id,
              type: inv.type,
              contact_id: inv.contact?.contactID,
              status: inv.status,
              invoice_date: inv.date,
              due_date: inv.dueDate,
              reference: inv.reference,
              sub_total: Number(inv.subTotal || 0),
              total_tax: Number(inv.totalTax || 0),
              total_amount: Number(inv.total || 0),
              line_amount_types: inv.lineAmountTypes,
              mapped_status: 'Manual',
              pt_claim_id: Number(pt_id),
            });
            createdNew = true;
          } else {
            row.pt_claim_id = Number(pt_id);
            row.mapped_status = row.mapped_status || 'Manual';
          }
          await this.xeroInvoicesBills.save(row);
          bound = true;
          boundDetail = `XeroInvoicesBills(${row.id}).pt_claim_id ← ${pt_id}${createdNew ? ' (row created)' : ''}`;
        } else if (rawType === 'payment') {
          let row = await this.xeroPayments.findOne({
            where: { integration_id, payment_id: xero_id },
          });
          if (!row) {
            const resp = await this.xero.accountingApi.getPayment(
              tenant_id,
              xero_id,
            );
            const p: any = resp?.body?.payments?.[0];
            if (!p) {
              return {
                success: false,
                message: `Cannot link: Xero payment ${xero_id} not found.`,
                direction,
              };
            }
            row = Object.assign(new XeroPayments(), {
              payment_id: p.paymentID,
              integration_id,
              tenant_id,
              invoice_id: p.invoice?.invoiceID,
              account_id: p.account?.accountID,
              date: p.date,
              amount: Number(p.amount || 0),
              status: p.status,
              payment_type: p.paymentType,
              mapped_status: 'Manual',
              pt_payment_id: Number(pt_id),
            });
            createdNew = true;
          } else {
            row.pt_payment_id = Number(pt_id);
            row.mapped_status = row.mapped_status || 'Manual';
          }
          await this.xeroPayments.save(row);
          bound = true;
          boundDetail = `XeroPayments(${row.id}).pt_payment_id ← ${pt_id}${createdNew ? ' (row created)' : ''}`;
        } else if (rawType === 'trust_movement') {
          // Task #231 — bind an existing Xero BankTransfer to an
          // unlinked PT trust-movement payment. If no xero_payments row
          // exists yet, create one from a live BankTransfer fetch so
          // the link is durable across the next scheduler sweep
          // (which checks bank_transfer_id presence).
          let row = await this.xeroPayments.findOne({
            where: { integration_id, bank_transfer_id: xero_id },
          });
          if (row && row.pt_payment_id && Number(row.pt_payment_id) !== Number(pt_id)) {
            return {
              success: false,
              message: `Cannot link: BankTransfer ${xero_id} is already linked to PT payment #${row.pt_payment_id}.`,
              direction,
            };
          }
          if (!row) {
            const resp = await this.xero.accountingApi.getBankTransfer(
              tenant_id,
              xero_id,
            );
            const bt: any = resp?.body?.bankTransfers?.[0];
            if (!bt) {
              return {
                success: false,
                message: `Cannot link: Xero BankTransfer ${xero_id} not found.`,
                direction,
              };
            }
            row = Object.assign(new XeroPayments(), {
              integration_id,
              tenant_id,
              bank_transfer_id: bt.bankTransferID,
              bank_transfer_reference: bt.reference || null,
              payment_date: bt.date,
              payment_amount: Number(bt.amount || 0),
              mapped_status: 'Manual',
              pt_payment_id: Number(pt_id),
            });
            createdNew = true;
          } else {
            row.pt_payment_id = Number(pt_id);
            row.mapped_status = row.mapped_status || 'Manual';
          }
          await this.xeroPayments.save(row);
          bound = true;
          boundDetail = `XeroPayments(${row.id}).pt_payment_id ← ${pt_id} (BankTransfer ${xero_id}${createdNew ? ', row created' : ''})`;
        } else if (rawType === 'contact') {
          let row = await this.xeroContactDetails.findOne({
            where: { integration_id, contact_id: xero_id },
          });
          if (!row) {
            const resp = await this.xero.accountingApi.getContact(
              tenant_id,
              xero_id,
            );
            const c: any = resp?.body?.contacts?.[0];
            if (!c) {
              return {
                success: false,
                message: `Cannot link: Xero contact ${xero_id} not found.`,
                direction,
              };
            }
            row = Object.assign(new XeroContactDetails(), {
              contact_id: c.contactID,
              integration_id,
              tenant_id,
              contact_name: c.name,
              contact_status: c.contactStatus,
              mapped_status: 'Manual',
              pt_contact_id: Number(pt_id),
            });
            createdNew = true;
          } else {
            row.pt_contact_id = Number(pt_id);
            row.mapped_status = row.mapped_status || 'Manual';
          }
          await this.xeroContactDetails.save(row);
          bound = true;
          boundDetail = `XeroContactDetails(${row.id}).pt_contact_id ← ${pt_id}${createdNew ? ' (row created)' : ''}`;
        } else {
          return {
            success: false,
            message: `Link not supported for type "${rawType}".`,
            direction,
          };
        }
        const linkLogId = await this.writeTwoSidedTriggerLog(decoded, {
          company_id,
          type: rawType,
          direction,
          xero_id,
          pt_id,
          integration_id: 0,
          success: bound,
          message: `Link confirmed: ${boundDetail}`,
          reviewed,
          preflightSnapshot,
          outcome: createdNew ? 'link_created' : 'link_bound',
        });
        return {
          success: true,
          message: `Link confirmed and stored — no overwrite. ${boundDetail}.`,
          direction,
          syncLogId: linkLogId,
          resolvedXeroId: xero_id,
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        this.logger.error(`[MANUAL_TWO_SIDED_LINK] ${msg}`);
        const failLogId = await this.writeTwoSidedTriggerLog(decoded, {
          company_id,
          type: rawType,
          direction,
          xero_id,
          pt_id,
          integration_id: 0,
          success: false,
          message: msg,
          reviewed,
          preflightSnapshot,
          outcome: 'link_failed',
        });
        return {
          success: false,
          message: `Link failed: ${msg}`,
          direction,
          syncLogId: failLogId,
        };
      }
    }

    const result = await this.manualXeroResync(decoded, {
      company_id,
      type: rawType,
      id: xero_id,
      _suppressLegacyTrigger: true,
    } as any);
    // Always write the enriched two-sided audit log carrying the
    // preflight snapshot, reviewed flag, chosen direction and outcome
    // (templates 518/519/520). For the import direction the legacy
    // template-499 trigger row that manualXeroResync would normally
    // write is suppressed via _suppressLegacyTrigger above, so the
    // sync log table shows ONE enriched trigger row per click instead
    // of two ("Manual sync (two-sided)" + "Manual sync"). For
    // non-import directions (push/link/blocked) writeTwoSidedTriggerLog
    // still emits its own legacy 499 for back-compat, since those
    // paths never go through manualXeroResync.
    await this.writeTwoSidedTriggerLog(decoded, {
      company_id,
      type: rawType,
      direction,
      xero_id,
      pt_id,
      integration_id: 0,
      success: !!result.success,
      message: result.message,
      reviewed,
      preflightSnapshot,
      outcome: result.success
        ? direction === 'link'
          ? 'link_verified'
          : 'import_completed'
        : 'import_failed',
      childSyncLogId: result.syncLogId || null,
    });
    return { ...result, direction };
  }

  private async writeTwoSidedTriggerLog(
    decoded: any,
    params: {
      company_id: number;
      type: string;
      direction: string;
      xero_id: string;
      pt_id: string;
      integration_id: number;
      success: boolean;
      message: string;
      reviewed?: boolean;
      preflightSnapshot?: any;
      outcome?: string;
      childSyncLogId?: number | null;
    },
  ): Promise<number | null> {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: params.company_id, status: 'ACTIVE' },
      });
      const integration_id =
        params.integration_id || xeroDetails?.integration_id || null;
      if (!integration_id) return null;
      const triggeredByUserId = decoded?.userId ?? null;
      // 518 = succeeded, 519 = blocked-by-preflight, 520 = dispatch failure.
      const log_template_id =
        params.direction === 'blocked'
          ? 519
          : params.success
          ? 518
          : 520;
      const snap = params.preflightSnapshot || {};
      const recon = snap?.xeroSide?.reconciliation || null;
      const importantChecks: any = {
        'Manual sync trigger': params.success ? 'Ok' : 'Failed',
        Direction: params.direction,
        Outcome: params.outcome || (params.success ? 'completed' : 'failed'),
        'Reviewed by user': params.reviewed ? 'Yes' : 'No',
        'Xero side': params.xero_id ? 'Provided' : 'Empty',
        'PayTrade side': params.pt_id ? 'Provided' : 'Empty',
      };
      if (Array.isArray(snap?.checks)) {
        for (const c of snap.checks) {
          if (!c?.label) continue;
          importantChecks[`Pre-flight: ${c.label}`] = `${c.status} — ${c.detail}`;
        }
      }
      if (recon) {
        importantChecks['Pre-flight: legs matched'] = String(
          (recon.matched || []).length,
        );
        importantChecks['Pre-flight: PT-only legs'] = String(
          (recon.ptUnmatched || []).length,
        );
        importantChecks['Pre-flight: Xero-only legs'] = String(
          (recon.xeroUnmatched || []).length,
        );
        importantChecks['Pre-flight: PT unsynced confirmed legs'] = String(
          recon.ptUnsyncedConfirmedLegs || 0,
        );
      }
      const history = [
        `Two-sided manual sync triggered by user ${triggeredByUserId ?? 'unknown'}`,
        `Type=${params.type}, direction=${params.direction}, outcome=${params.outcome || 'n/a'}`,
        `xero_id=${params.xero_id || '∅'}, pt_id=${params.pt_id || '∅'}`,
        `Reviewed flag=${params.reviewed ? 'true' : 'false'}`,
        snap?.actionSummary
          ? `Pre-flight summary: ${snap.actionSummary}`
          : 'Pre-flight summary: (none provided)',
        params.success ? 'Dispatched' : 'Aborted',
      ];
      if (params.childSyncLogId) {
        history.push(`Linked import sync log id: ${params.childSyncLogId}`);
      }
      const log = await this.xeroService.insertXeroSyncLogs(decoded, {
        id: null,
        api_name: 'manualXeroTwoSidedSync',
        api_payload: {
          type: params.type,
          xero_id: params.xero_id,
          pt_id: params.pt_id,
          direction: params.direction,
          sync_run_type: 'manual',
          triggered_by_user_id: triggeredByUserId,
          reviewed: !!params.reviewed,
          outcome: params.outcome || null,
          child_sync_log_id: params.childSyncLogId || null,
          preflight: snap || null,
        },
        integration_id,
        log_template_id,
        dynamic_values: {
          type: params.type,
          direction: params.direction,
          xero_id: params.xero_id || '',
          pt_id: params.pt_id || '',
          block_reason:
            params.direction === 'blocked' || !params.success
              ? params.message
              : '',
          user_id: String(triggeredByUserId ?? ''),
          id: params.xero_id || params.pt_id,
          resolved_id: params.xero_id || params.pt_id,
        },
        project_id: null,
        contract_id: null,
        reference: {
          xeroId: params.xero_id || null,
          paytradeId: params.pt_id || null,
        },
        reference_id: null,
        history,
        important_checks: importantChecks,
        error_message: params.success ? null : params.message,
        xero_records: [],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      } as any);
      const enrichedLogId = (log && (log as any).id) || null;
      // Legacy compatibility: emit a template-499 trigger row for
      // push/link/blocked directions so consumers that filter by the
      // legacy MANUAL_XERO_SYNC_TRIGGERED code see two-sided runs too.
      // The import path already gets 499 via manualXeroResync, so we
      // skip it there to avoid duplicates.
      if (params.direction !== 'import') {
        try {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: null,
            api_name: 'manualXeroTwoSidedSync',
            api_payload: {
              type: params.type,
              xero_id: params.xero_id,
              pt_id: params.pt_id,
              direction: params.direction,
              sync_run_type: 'manual',
              triggered_by_user_id: triggeredByUserId,
              reviewed: !!params.reviewed,
              outcome: params.outcome || null,
              enriched_sync_log_id: enrichedLogId,
              preflight: snap || null,
            },
            integration_id,
            log_template_id: 499,
            dynamic_values: {
              type: params.type,
              id: params.xero_id || params.pt_id,
              resolved_id: params.xero_id || params.pt_id,
              user_id: String(triggeredByUserId ?? ''),
            },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: params.xero_id || null,
              paytradeId: params.pt_id || null,
            },
            reference_id: null,
            history: [
              `Legacy trigger row for two-sided sync (direction=${params.direction}, outcome=${params.outcome || 'n/a'})`,
              `Enriched two-sided sync log id: ${enrichedLogId ?? 'n/a'}`,
            ],
            important_checks: {
              Direction: params.direction,
              Outcome: params.outcome || 'n/a',
              'Enriched log id': String(enrichedLogId ?? ''),
            },
            error_message: params.success ? null : params.message,
            xero_records: [],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          } as any);
        } catch (legacyErr: any) {
          this.logger.error(
            `[MANUAL_TWO_SIDED] legacy 499 trigger log failed: ${legacyErr?.message || legacyErr}`,
          );
        }
      }
      return enrichedLogId;
    } catch (err: any) {
      this.logger.error(
        `[MANUAL_TWO_SIDED] writeTriggerLog failed: ${err?.message || err}`,
      );
      return null;
    }
  }

  /**
   * Task #266 — Sweep old failed Contact webhook sync logs whose
   * underlying Xero contact is now ARCHIVED.
   *
   * Before Task #265, a Xero contact webhook for an archived contact
   * would fall through into the "missing mandatory fields" path and
   * write a Failed sync log (template 368) — Xero strips most fields
   * from archived contacts, so the real reason was "archived", not
   * "user forgot fields". Task #265 added a short-circuit so future
   * webhooks for archived contacts get the friendlier Warning template
   * 623 instead. This sweep retro-fits the same fix to historical rows.
   *
   * For every still-active (not archived_at) failed template-368 row on
   * this company's integration whose linked `xero_contact_details.contact_status`
   * is now `ARCHIVED`, the row is rewritten in-place to template 623
   * (Warning, `WH_CONTACT_ARCHIVED_SKIPPED`), with a clearer error
   * message and a history breadcrumb explaining the reclassification.
   *
   * Idempotent: rows already on template 623 are skipped (they are not
   * template-368 to begin with). Re-running the sweep finds zero new
   * candidates once the backlog is cleared.
   */
  async recoverArchivedContactSyncLogs(
    decoded: any,
    input: { company_id: number; dry_run?: boolean },
  ): Promise<{
    success: boolean;
    message: string;
    scanned: number;
    updated: number;
    skipped: number;
    sample_sync_ids?: number[];
  }> {
    const company_id = Number(input?.company_id);
    const dryRun = !!input?.dry_run;
    if (!company_id) {
      return {
        success: false,
        message: 'company_id is required.',
        scanned: 0,
        updated: 0,
        skipped: 0,
      };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        success: false,
        message: 'No active Xero integration found for this company.',
        scanned: 0,
        updated: 0,
        skipped: 0,
      };
    }

    // Pull every still-active failed contact-missing-fields log on this
    // integration. The volume is bounded (one per archived contact) so a
    // straight find is fine here.
    const candidates = await this.xeroSyncLogs.find({
      where: {
        integration_id: xeroDetails.integration_id,
        log_template_id: 368,
        archived_at: IsNull(),
      },
    });

    let updated = 0;
    let skipped = 0;
    const sampleUpdated: number[] = [];
    const triggeredByUserId = decoded?.userId ?? null;

    for (const log of candidates) {
      try {
        // Resolve the linked xero contact. reference_id is the
        // xero_contact_details.id (uuid) — see handleContactCreateUpdate
        // where the failed 368 row is written. api_payload.contact_id is
        // the Xero GUID, which is our backup path when reference_id is
        // missing on older rows.
        let contactRow: XeroContactDetails | null = null;
        if (log.reference_id) {
          contactRow = await this.xeroContactDetails.findOne({
            where: { id: log.reference_id },
          });
        }
        if (!contactRow) {
          const xeroContactId = log.api_payload?.contact_id;
          if (xeroContactId) {
            contactRow = await this.xeroContactDetails.findOne({
              where: {
                contact_id: String(xeroContactId),
                integration_id: xeroDetails.integration_id,
              },
            });
          }
        }
        if (
          !contactRow ||
          String(contactRow.contact_status) !==
            String(Contact.ContactStatusEnum.ARCHIVED)
        ) {
          skipped++;
          continue;
        }

        if (dryRun) {
          updated++;
          if (sampleUpdated.length < 10) sampleUpdated.push(log.sync_id);
          continue;
        }

        const contactName =
          contactRow.contact_name ||
          log.api_payload?.client_supplier_name ||
          'this contact';
        const newHistory = [
          ...(Array.isArray(log.history) ? log.history : []),
          `Reclassified by archived-contact sweep — contact is archived in Xero (was: template 368 "missing mandatory fields").`,
        ];
        const newImportantChecks = {
          ...(log.important_checks || {}),
          'Reclassified by sweep': 'Archived in Xero',
        };

        await this.xeroSyncLogs.update(
          { id: log.id },
          {
            log_template_id: 623,
            error_code: 'WH_CONTACT_ARCHIVED_SKIPPED',
            error_message:
              'Contact is archived in Xero — import skipped. Un-archive the contact in Xero, then click Retry import to bring it into Pay Trade.',
            history: newHistory,
            important_checks: newImportantChecks,
            dynamic_values: {
              ...(log.dynamic_values || {}),
              contact_name: contactName,
            },
            updated_by: triggeredByUserId,
          } as any,
        );
        updated++;
        if (sampleUpdated.length < 10) sampleUpdated.push(log.sync_id);
      } catch (rowErr: any) {
        this.logger.warn(
          `[recoverArchivedContactSyncLogs] Failed to reclassify sync_id=${log?.sync_id}: ${rowErr?.message || rowErr}`,
        );
        skipped++;
      }
    }

    const msg = dryRun
      ? `Dry-run: ${updated} of ${candidates.length} failed contact log(s) would be reclassified to "archived in Xero" (template 623).`
      : `Reclassified ${updated} of ${candidates.length} failed contact log(s) to "archived in Xero" (template 623).`;

    return {
      success: true,
      message: msg,
      scanned: candidates.length,
      updated,
      skipped,
      sample_sync_ids: sampleUpdated,
    };
  }

  /**
   * Task #283 — Retroactive retry sweep for the historical template-368
   * "missing mandatory fields" rows that were minted by the pre-fix
   * webhook handler. Those rows landed in the Failed sync log because
   * the inbound webhook envelope carried an empty `data` payload, so
   * every Active contact failed the missing-fields validator. Now that
   * `handleContactCreateUpdate` builds the payload from the live Xero
   * contact, re-running these rows succeeds for any contact that is
   * still Active in Xero.
   *
   * Mirror of `recoverArchivedContactSyncLogs` (and shaped like
   * `retryFailedSyncsForContact`), but scoped to the opposite half of
   * the population: template-368 rows whose linked
   * `xero_contact_details.contact_status = 'ACTIVE'`. ARCHIVED rows are
   * left to the archived-contact sweep.
   *
   * On success, the original Failed row is stamped with
   * `important_checks.Recovered = 'Yes'` + a history breadcrumb +
   * `api_payload.recovered_by_sync_id` linking to the new SUCCESS row.
   * Idempotent: rows already linked to a `recovered_by_sync_id` are
   * skipped on subsequent runs.
   */
  async recoverFailedContactImportSyncLogs(
    decoded: any,
    input: { company_id: number; dry_run?: boolean; limit?: number },
  ): Promise<{
    success: boolean;
    message: string;
    scanned: number;
    retried: number;
    recovered: number;
    skipped: number;
    sample_sync_ids?: number[];
  }> {
    const company_id = Number(input?.company_id);
    const dryRun = !!input?.dry_run;
    const limit = Math.max(1, Math.min(500, Number(input?.limit) || 200));

    const empty = {
      success: false as boolean,
      message: '',
      scanned: 0,
      retried: 0,
      recovered: 0,
      skipped: 0,
    };
    if (!company_id) {
      return { ...empty, message: 'company_id is required.' };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return {
        ...empty,
        success: true,
        message: 'No active Xero integration; nothing to recover.',
      };
    }
    if (
      xeroDetails.integrationDetails?.integration_status !==
      'Connected - active'
    ) {
      return {
        ...empty,
        success: true,
        message: `Xero integration is not connected (status=${xeroDetails.integrationDetails?.integration_status}); skipping recovery.`,
      };
    }

    const candidates = await this.xeroSyncLogs.find({
      where: {
        integration_id: xeroDetails.integration_id,
        log_template_id: 368,
        archived_at: IsNull(),
      },
      take: limit,
    });

    let retried = 0;
    let recovered = 0;
    let skipped = 0;
    const sampleSyncIds: number[] = [];

    for (const log of candidates) {
      try {
        // Idempotency — never retry a row that has already been recovered.
        if (log.api_payload?.recovered_by_sync_id) {
          skipped++;
          continue;
        }

        let contactRow: XeroContactDetails | null = null;
        if (log.reference_id) {
          contactRow = await this.xeroContactDetails.findOne({
            where: { id: log.reference_id },
          });
        }
        if (!contactRow) {
          const xeroContactId = log.api_payload?.contact_id;
          if (xeroContactId) {
            contactRow = await this.xeroContactDetails.findOne({
              where: {
                contact_id: String(xeroContactId),
                integration_id: xeroDetails.integration_id,
              },
            });
          }
        }
        // Only retry Active contacts — ARCHIVED rows belong to
        // recoverArchivedContactSyncLogs and would just fail again.
        if (
          !contactRow ||
          String(contactRow.contact_status) !==
            String(Contact.ContactStatusEnum.ACTIVE)
        ) {
          skipped++;
          continue;
        }
        if (!contactRow.contact_id) {
          skipped++;
          continue;
        }

        if (dryRun) {
          retried++;
          if (sampleSyncIds.length < 10) sampleSyncIds.push(log.sync_id);
          continue;
        }

        retried++;
        const result = await this.manualXeroResync(
          { userId: null, logged_in_by: 'SYSTEM' },
          {
            company_id,
            type: 'contact',
            id: String(contactRow.contact_id),
            _suppressLegacyTrigger: true,
          },
        );

        if (result?.success) {
          recovered++;
          const newHistory = [
            ...(Array.isArray(log.history) ? log.history : []),
            `Auto-recovered by Task #283 sweep — new sync_id=${result.syncLogId ?? 'n/a'}.`,
          ];
          const newImportantChecks = {
            ...(log.important_checks || {}),
            Recovered: 'Yes',
            'Recovered by': 'Task #283 missing-fields sweep',
          };
          await this.xeroSyncLogs.update(
            { id: log.id },
            {
              history: newHistory,
              important_checks: newImportantChecks,
              api_payload: {
                ...(log.api_payload || {}),
                recovered_by_sync_id: result.syncLogId ?? null,
                recovered_at: new Date().toISOString(),
                recovery_trigger: 'task_283_sweep',
              },
            } as any,
          );
          if (sampleSyncIds.length < 10) sampleSyncIds.push(log.sync_id);
        } else {
          skipped++;
        }
      } catch (rowErr: any) {
        this.logger.warn(
          `[recoverFailedContactImportSyncLogs] Failed to retry sync_id=${log?.sync_id}: ${rowErr?.message || rowErr}`,
        );
        skipped++;
      }
    }

    const verb = dryRun ? 'would retry' : 'retried';
    const msg = `Scanned ${candidates.length}, ${verb} ${retried}, recovered ${recovered}, skipped ${skipped}.`;
    return {
      success: true,
      message: msg,
      scanned: candidates.length,
      retried,
      recovered,
      skipped,
      sample_sync_ids: sampleSyncIds,
    };
  }

  /**
   * Task #268 — Auto-recover recently-Failed Xero sync logs tied to a
   * client/supplier once the missing prerequisite (email and/or bank
   * account) has been supplied.
   *
   * Scope (initial implementation, reuses `manualXeroResync`):
   *   - Inbound Contact webhook mirror failures (templates 366, 368, 384)
   *     where Xero stripped mandatory fields. After the user fills them
   *     in (either in PT or in Xero, which fires a contact webhook), we
   *     re-pull the Xero contact via `manualXeroResync({type:'contact'})`
   *     so PT's mirror gets the now-complete record.
   *
   * Allowlist is template-id based — error codes are diverse across
   * versions of the seed JSON but the templates themselves are stable.
   *
   * Guards:
   *   - 30-day lookback (older rows treated as truly stale).
   *   - Max 50 retries per contact per run (BullMQ retries the run, but
   *     a single tick never floods Xero).
   *   - 5-minute flap guard: each log row stamps
   *     `api_payload.recovery_last_attempt_at` before retry; subsequent
   *     runs within 5 minutes skip that row.
   *   - `archived_at IS NULL` — the existing dedup logic in
   *     `insertXeroSyncLogs` already auto-archives prior failed rows when
   *     a SUCCESS replaces them; we only retry currently-failing rows.
   *
   * Marker: on success, the original Failed row is stamped with
   * `important_checks.Recovered = 'Yes'`, a history breadcrumb, and
   * `api_payload.recovered_by_sync_id` linking to the new SUCCESS row.
   */
  async retryFailedSyncsForContact(input: {
    company_id: number;
    client_supplier_id: number;
    trigger?: string;
  }): Promise<{
    success: boolean;
    message: string;
    scanned: number;
    retried: number;
    recovered: number;
    skipped: number;
    sample_sync_ids?: number[];
  }> {
    const company_id = Number(input?.company_id);
    const csId = Number(input?.client_supplier_id);
    const trigger = String(input?.trigger || 'unspecified');

    const empty = {
      success: false as boolean,
      message: 'company_id and client_supplier_id are required.',
      scanned: 0,
      retried: 0,
      recovered: 0,
      skipped: 0,
    };
    if (!company_id || !csId) return empty;

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails || !xeroDetails.integration_id) {
      return { ...empty, success: true, message: 'No active Xero integration; nothing to recover.' };
    }
    if (
      xeroDetails.integrationDetails?.integration_status !==
      'Connected - active'
    ) {
      return {
        ...empty,
        success: true,
        message: `Xero integration is not connected (status=${xeroDetails.integrationDetails?.integration_status}); skipping recovery.`,
      };
    }

    // Resolve every xero_contact_details row mirrored to this PT client/supplier.
    // We need both the row id (used as `reference_id` on inbound logs) and
    // the Xero contact GUID (used in api_payload.contact_id on older rows
    // and as the `id` argument when dispatching `manualXeroResync`).
    const xeroContactRows = await this.xeroContactDetails.find({
      where: {
        pt_contact_id: csId,
        integration_id: xeroDetails.integration_id,
      },
    });
    if (!xeroContactRows.length) {
      return {
        success: true,
        message:
          'No mirrored Xero contact for this client/supplier; nothing to recover.',
        scanned: 0,
        retried: 0,
        recovered: 0,
        skipped: 0,
      };
    }

    // Eligibility gate — only retry if the contact now actually
    // satisfies the prerequisites that the original push failed on.
    // Templates 366/368/384 all stem from "missing mandatory field"
    // (email + bank-account presence). Without this gate the 5-minute
    // flap guard alone would still re-attempt failing contacts every
    // 15 minutes via the sweeper.
    const csRow = await this.clientSuppliersDetails.findOne({
      where: { client_supplier_id: csId, company_id } as any,
    });
    if (!csRow) {
      return {
        success: true,
        message: 'Client/supplier not found for this company; skipping.',
        scanned: 0,
        retried: 0,
        recovered: 0,
        skipped: 0,
      };
    }
    const hasEmail = !!(csRow as any)?.client_email_id;
    const bankAccountCount = await this.bankAccounts.count({
      where: { client_supplier_id: csId } as any,
    });
    if (!hasEmail && bankAccountCount === 0) {
      return {
        success: true,
        message:
          'Contact still missing both email and bank accounts; skipping recovery.',
        scanned: 0,
        retried: 0,
        recovered: 0,
        skipped: 0,
      };
    }

    const xeroRowIds = xeroContactRows.map((r) => r.id).filter(Boolean);
    const xeroGuids = xeroContactRows
      .map((r) => r.contact_id)
      .filter(Boolean) as string[];

    // Template allowlist — contact-missing-fields failures only. These
    // are the rows that flip to SUCCESS once the contact carries the
    // missing email / mandatory fields.
    const INBOUND_CONTACT_FAILURE_TEMPLATES = [366, 368, 384];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fiveMinutesAgoIso = new Date(
      Date.now() - 5 * 60 * 1000,
    ).toISOString();

    // Pull candidate failed logs. Volume per contact is tiny (one per
    // template per contact at most) so a straight find is fine.
    const qb = this.xeroSyncLogs
      .createQueryBuilder('log')
      .where('log.integration_id = :integration_id', {
        integration_id: xeroDetails.integration_id,
      })
      .andWhere('log.archived_at IS NULL')
      .andWhere('log.created_on > :since', { since: thirtyDaysAgo })
      .andWhere('log.log_template_id IN (:...templates)', {
        templates: INBOUND_CONTACT_FAILURE_TEMPLATES,
      });

    if (xeroRowIds.length && xeroGuids.length) {
      qb.andWhere(
        '(log.reference_id IN (:...rowIds) OR log.api_payload->>\'contact_id\' IN (:...guids))',
        { rowIds: xeroRowIds, guids: xeroGuids },
      );
    } else if (xeroRowIds.length) {
      qb.andWhere('log.reference_id IN (:...rowIds)', { rowIds: xeroRowIds });
    } else {
      qb.andWhere('log.api_payload->>\'contact_id\' IN (:...guids)', {
        guids: xeroGuids,
      });
    }

    qb.orderBy('log.created_on', 'DESC').limit(50);

    const candidates = await qb.getMany();
    const scanned = candidates.length;
    if (!scanned) {
      return {
        success: true,
        message: 'No recoverable failed sync logs in the last 30 days.',
        scanned: 0,
        retried: 0,
        recovered: 0,
        skipped: 0,
      };
    }

    let retried = 0;
    let recovered = 0;
    let skipped = 0;
    const sampleSyncIds: number[] = [];

    for (const log of candidates) {
      try {
        // 5-min flap guard
        const lastAttempt = log.api_payload?.recovery_last_attempt_at;
        if (lastAttempt && String(lastAttempt) > fiveMinutesAgoIso) {
          skipped++;
          continue;
        }

        // Resolve the Xero contact GUID to re-pull. Prefer the value on
        // the log row (covers historical mismatches) then fall back to
        // the mirrored row.
        const guid =
          log.api_payload?.contact_id ||
          xeroContactRows.find((r) => r.id === log.reference_id)?.contact_id ||
          xeroGuids[0];
        if (!guid) {
          skipped++;
          continue;
        }

        // Stamp the attempt marker BEFORE dispatching so a crash mid-run
        // still blocks the next tick from immediately re-attempting.
        const stampedPayload = {
          ...(log.api_payload || {}),
          recovery_last_attempt_at: new Date().toISOString(),
          recovery_trigger: trigger,
        };
        await this.xeroSyncLogs.update(
          { id: log.id },
          { api_payload: stampedPayload } as any,
        );

        retried++;

        const result = await this.manualXeroResync(
          { userId: null, logged_in_by: 'SYSTEM' },
          {
            company_id,
            type: 'contact',
            id: String(guid),
            _suppressLegacyTrigger: true,
          },
        );

        if (result?.success) {
          recovered++;
          const newHistory = [
            ...(Array.isArray(log.history) ? log.history : []),
            `Auto-recovered (trigger=${trigger}) — new sync_id=${result.syncLogId ?? 'n/a'}.`,
          ];
          const newImportantChecks = {
            ...(log.important_checks || {}),
            Recovered: 'Yes',
          };
          await this.xeroSyncLogs.update(
            { id: log.id },
            {
              history: newHistory,
              important_checks: newImportantChecks,
              api_payload: {
                ...stampedPayload,
                recovered_by_sync_id: result.syncLogId ?? null,
                recovered_at: new Date().toISOString(),
              },
            } as any,
          );

          // Mirror the linkage onto the child SUCCESS log so the UI can
          // surface "this resolved sync_id=X" without a reverse join.
          if (result.syncLogId) {
            try {
              const childRow = await this.xeroSyncLogs.findOne({
                where: { sync_id: result.syncLogId },
              });
              if (childRow) {
                await this.xeroSyncLogs.update(
                  { id: childRow.id },
                  {
                    api_payload: {
                      ...(childRow.api_payload || {}),
                      recovers_sync_id: log.sync_id,
                      recovery_trigger: trigger,
                    },
                    important_checks: {
                      ...(childRow.important_checks || {}),
                      'Recovered for sync_id': log.sync_id,
                    },
                  } as any,
                );
              }
            } catch (linkErr: any) {
              this.logger.warn(
                `[retryFailedSyncsForContact] Failed to stamp child log linkage for sync_id=${result.syncLogId}: ${linkErr?.message || linkErr}`,
              );
            }
          }

          if (sampleSyncIds.length < 10) sampleSyncIds.push(log.sync_id);
        }
      } catch (rowErr: any) {
        this.logger.warn(
          `[retryFailedSyncsForContact] Failed to retry sync_id=${log?.sync_id}: ${rowErr?.message || rowErr}`,
        );
        skipped++;
      }
    }

    return {
      success: true,
      message: `Scanned ${scanned}, retried ${retried}, recovered ${recovered}, skipped ${skipped}.`,
      scanned,
      retried,
      recovered,
      skipped,
      sample_sync_ids: sampleSyncIds,
    };
  }
}
