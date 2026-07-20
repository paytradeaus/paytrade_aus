import { Injectable, Optional } from '@nestjs/common';
import { XeroContractsService } from '../contracts/xero-contracts.service';
import {
  composeXeroAddress,
  pickXeroAddress,
} from '../xero-address.util';
import {
  Contact,
  Invoice,
  LineAmountTypes,
  LineItem,
  LineItemTracking,
  XeroClient,
} from 'xero-node';
import * as dotenv from 'dotenv';
import {
  GetMappedXeroInvoicesListsInput,
  GetPaytradeInvoicesListsInput,
  GetXeroInvoicesListsInput,
  YetToMapInvoicesInput,
} from './dto/xero.input';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ClientSuppliersDetails, ClientSupplierType, RelatedEntity } from 'src/entities/client-suppliers-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { PaymentClaimTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { ContractDetails, ClientSupplierRole, RetentionType } from 'src/entities/contract-details.entity';
import { ContractType } from 'src/entities/contract-type.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { AddPaymentClaimInput } from 'src/api/users/banking/payment-claims/payment-claims.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Group } from 'src/entities/user-details.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { NoticesService } from 'src/api/users/notices/notices.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { XeroManualJournalService } from '../manualJournals/xero-manual-journal.service';
import { ClientSupplierProjectXeroAccountCodes } from 'src/entities/client-supplier-project-xero-account-codes.entity';
import { padBsb6 } from 'src/libs/@bsb/pad-bsb';
import {
  resolveSupplierBillCode,
  ResolveSupplierBillCodeResult,
} from './supplier-bill-code-resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroInvoicesService {
  private logger = new PaytradeLogger('XERO_INVOICES_SERVICE');
  private xero: XeroClient;
  // Per-tenant cache of Xero account tax types (keyed `${tenantId}:${code}`).
  // Used by retention/liability producer logic to decide whether to gross
  // up unitAmount * 1.1 when sending lines to Xero — only accounts whose
  // taxType is GST-applicable (INPUT, OUTPUT, etc) should be grossed up.
  // BAS Excluded / Exempt / None accounts must be sent as ex-GST as-is.
  private accountTaxTypeCache = new Map<string, { taxType: string; expiresAt: number }>();
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(XeroContactDetails)
    private xeroContactDetails: Repository<XeroContactDetails>,
    @InjectRepository(XeroContractDetails)
    private xeroContractDetails: Repository<XeroContractDetails>,
    @InjectRepository(XeroProjectDetails)
    private xeroProjectDetails: Repository<XeroProjectDetails>,
    @InjectRepository(XeroInvoicesBills)
    private xeroInvoicesBills: Repository<XeroInvoicesBills>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(PaymentClaimInvoices)
    private paymentClaimInvoices: Repository<PaymentClaimInvoices>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(ClientSupplierProjectXeroAccountCodes)
    private supplierProjectAccountCodes: Repository<ClientSupplierProjectXeroAccountCodes>,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly xeroService: XeroService,
    private readonly dataSource: DataSource,
    private readonly noticesService: NoticesService,
    private readonly emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
    private readonly xeroManualJournalService: XeroManualJournalService,
    private readonly activityLogService: ActivityLogService,
    @Optional()
    private readonly xeroContractsService?: XeroContractsService,
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
  }

  /**
   * Classify a Xero invoice/bill as a regular Claim or a Retention
   * Release. See XeroWebhookService.classifyRetentionShape for the full
   * Option C rationale — this is the same predicate, duplicated locally
   * to avoid a circular module dependency between xero-invoices and
   * xero-webhooks.
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

    const retentionClaimnlineItem =
      !hasBaseLine &&
      (hasReleaseCodeLine || hasRetainedCodeLine) &&
      netRetainedSigned <= 0;

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

  /**
   * Task #41 — Resolves the Xero account code to use on the base "service"
   * line of an outbound bill for a given supplier (and optional project).
   * On unresolved (variable mode + no fallback), writes a FAIL sync log
   * (template 607) and returns null so the caller can short-circuit.
   * For Receivable claims (invoices), variable mode is out of scope and
   * the company-level invoice_code is returned unchanged.
   */
  async resolveOutboundBillCode(
    decoded: any,
    xeroDetails: XeroIntegrationDetails | any,
    supplier: ClientSuppliersDetails | null | undefined,
    claimDetails: PaymentClaims | any,
    syncId: string | null = null,
  ): Promise<{ accountCode: string | null; source: string }> {
    if (claimDetails?.claim_type !== 'Billable') {
      return { accountCode: xeroDetails?.invoice_code || null, source: 'fallback' };
    }
    const projectId = claimDetails?.project_id ?? null;
    let projectOverrides: { project_id: number; account_code: string }[] = [];
    if (xeroDetails?.bill_code_is_variable && supplier?.client_supplier_id) {
      const rows = await this.supplierProjectAccountCodes.find({
        where: { client_supplier_id: supplier.client_supplier_id },
      });
      projectOverrides = rows.map((r) => ({
        project_id: r.project_id,
        account_code: r.account_code,
      }));
    }
    const result: ResolveSupplierBillCodeResult = resolveSupplierBillCode({
      supplier: supplier
        ? {
            client_supplier_id: supplier.client_supplier_id,
            xero_default_account_code: (supplier as any).xero_default_account_code,
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
      direction: 'outbound',
    });
    if (result.source === 'unresolved') {
      try {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: syncId,
          api_name: 'resolveOutboundBillCode',
          api_payload: {
            payment_claim_id: claimDetails?.payment_claim_id,
            client_supplier_id: supplier?.client_supplier_id || null,
            project_id: projectId,
          },
          integration_id: xeroDetails?.integration_id,
          log_template_id: 607,
          dynamic_values: {
            supplier_name: supplier?.client_supplier_name || '',
            payment_claim_id: claimDetails?.payment_claim_id || '',
            project_id: projectId == null ? '' : String(projectId),
          },
          project_id: projectId == null ? null : (String(projectId) as any),
          contract_id: claimDetails?.contract_id || null,
          reference: { xeroId: null, paytradeId: claimDetails?.id },
          reference_id: claimDetails?.id,
          history: [
            `Variable bill code unresolved for supplier ${supplier?.client_supplier_name}`,
            'Export blocked',
          ],
          important_checks: {
            'Variable bill code resolution': 'Failed',
          },
          error_message: 'Variable bill code unresolved (no supplier override and fallback disabled).',
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
      } catch (e) {
        this.logger.error(`[VARIABLE_BILL_CODE_607] sync log write failed: ${e?.message || e}`);
      }
      return { accountCode: null, source: 'unresolved' };
    }
    this.logger.log(
      `[VARIABLE_BILL_CODE] outbound resolved code=${result.accountCode} source=${result.source} supplier=${supplier?.client_supplier_id} project=${projectId}`,
    );
    return { accountCode: result.accountCode, source: result.source };
  }

  async getClaimsDetails(payment_claim_id) {
    return await this.paymentClaims.findOne({
      where: { payment_claim_id },
      relations: [
        'clientSupplierDetails',
        'paymentClaimInvoices',
        'contractDetails',
        'projectDetails',
      ],
    });
  }

  async createInvoiceOrBillInXero(decoded: any, data: any) {
    try {
      const { payment_claim_id } = data;

      const claimDetails = await this.getClaimsDetails(payment_claim_id);
      if (!claimDetails) {
        throw `Claim details not found`;
      }

      if (!['Draft', 'Confirmed'].includes(claimDetails.status))
        throw `Payment claim status as ${claimDetails.status} cannot be created in Xero`;

      const invoice_date =
        claimDetails.claim_type == 'Billable'
          ? claimDetails.received_date
          : claimDetails.sent_date;
      const invoices = claimDetails.paymentClaimInvoices ?? null;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: claimDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      if (claimDetails.status !== 'Draft' && !invoices) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 94 : 107,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `There should be atleast one invoice`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        claimDetails.cash_retention_type === 'Retention claim' &&
        claimDetails.cash_retention
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 88 : 100,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Amount cannot be retained in retention claim`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!claimDetails.client_supplier_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 87 : 99,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Client/supplier is mandatory`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const clientSuppliersDetails = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: claimDetails.client_supplier_id },
      });

      if (!clientSuppliersDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 86 : 98,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Client/Supplier details not found`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const contractDetails = claimDetails.contract_id
        ? await this.contractDetails.findOne({
            where: { contract_id: claimDetails.contract_id },
          })
        : null;

      if (claimDetails.status !== 'Draft' && !contractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 85 : 97,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Contract details not found`,
          xero_records: [],
          paytrade_records: [claimDetails],
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
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 84 : 96,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Contract is in ${contractDetails.contract_status.toLowerCase()} state`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            category_type: 'project',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 296 : 298,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Failed',
          },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // Sync proceeds without contract tracking if contract_category_id is not configured.
      // Previously this was a hard block that caused unnecessary sync failures.

      let expectedCodeCheck = null;

      const isSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
      if (claimDetails.cash_retention_type === 'Claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_payable_code);
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_receivable_code);
        }
      } else if (claimDetails.cash_retention_type === 'Retention claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_payable_code) ||
            !xeroDetails.retention_payable_release_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_receivable_code) ||
            !xeroDetails.retention_receivable_release_code;
        }
      }

      if (expectedCodeCheck) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 83 : 95,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Failed',
          },
          error_message: `Missing account field type. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let expectedTaxCode = null;

      if (claimDetails.claim_type === 'Billable') {
        expectedTaxCode = xeroDetails.bill_tax_code;
      } else if (claimDetails.claim_type === 'Receivable') {
        expectedTaxCode = xeroDetails.invoice_tax_code;
      }

      if (!expectedTaxCode) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 89 : 101,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Failed',
          },
          error_message: `Missing tax field type. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // Task #289 — A PT contact may be linked to a Xero contact that
      // the user has since marked as permanently unmapped. The find
      // above is scoped by `pt_contact_id`, but a separate name-matched
      // row with the same name could also exist as permanently
      // unmapped. Check both: (1) the resolved mapped row's flag, and
      // (2) any permanently-unmapped row whose Xero name matches the
      // PT contact's name. Either case short-circuits with a distinct
      // "excluded" message.
      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: claimDetails.client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      const excludedByName = !xeroContactDetails
        ? await this.xeroContactDetails
            .createQueryBuilder('c')
            .where('c.integration_id = :iid', {
              iid: xeroDetails.integration_id,
            })
            .andWhere('c.permanently_unmapped = true')
            .andWhere(
              'LOWER(TRIM(c.contact_name)) = LOWER(TRIM(:n))',
              { n: claimDetails?.clientSupplierDetails?.client_supplier_name || '' },
            )
            .getOne()
        : null;

      const isExcluded =
        xeroContactDetails?.permanently_unmapped === true || !!excludedByName;

      if (!xeroContactDetails || isExcluded) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            client_supplier_id: claimDetails.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 90 : 102,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: isExcluded
            ? `Contact excluded from Xero sync (permanently unmapped). Re-enable mapping from Integrations > Xero > Contacts > Permanently unmapped.`
            : `Client/Supplier details not mapped`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let xeroContractDetails = claimDetails.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              pt_contract_id: claimDetails.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      // If the specific contract is not mapped, the sync proceeds without contract tracking
      // on the Xero line items. This prevents unnecessary sync failures when contract mapping
      // is not configured. The contract is already known in PayTrade via claimDetails.contract_id;
      // the only impact is that Xero line items won't carry the contract tracking category.
      // The user can still map contracts later for richer Xero reporting.
      if (claimDetails.status !== 'Draft' && !xeroContractDetails) {
        this.logger.log(
          `Contract ${claimDetails.contract_id} not mapped to Xero for claim ${claimDetails.payment_claim_id}. ` +
          `Proceeding without contract tracking category on Xero line items.`
        );
      }

      const xeroProjectDetails = claimDetails.project_id
        ? await this.xeroProjectDetails.findOne({
            where: {
              pt_project_id: claimDetails.project_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (claimDetails.status !== 'Draft' && !xeroProjectDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            project_id: claimDetails.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 92 : 104,
          dynamic_values: {},
          project_id: null,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
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
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const invoiceDetails = await this.getInvoiceDetails(
        payment_claim_id,
        xeroDetails.integration_id,
      );

      if (
        invoiceDetails &&
        invoiceDetails.invoice_id &&
        invoiceDetails.mapped_status
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            invoice_id: invoiceDetails.invoice_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 93 : 105,
          dynamic_values: {},
          project_id: xeroProjectDetails.id,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
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
          error_message: `Paytrade claim Id ${payment_claim_id} is already mapped to xero ${claimDetails.claim_type === 'Billable' ? 'bill' : 'invoice'} Id ${invoiceDetails.invoice_id}`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const contact: Contact = xeroContactDetails?.contact_id
        ? {
            contactID: xeroContactDetails.contact_id,
          }
        : {};

      const contractTracking: LineItemTracking =
        xeroDetails?.contract_category_id && xeroContractDetails?.contract_id
          ? {
              trackingCategoryID: xeroDetails.contract_category_id,
              trackingOptionID: xeroContractDetails.contract_id,
            }
          : {};

      const projectTracking: LineItemTracking =
        xeroDetails?.project_category_id && xeroProjectDetails?.project_id
          ? {
              trackingCategoryID: xeroDetails.project_category_id,
              trackingOptionID: xeroProjectDetails.project_id,
            }
          : {};

      const lineItemTrackings = [];
      // sending empty objects to the Xero API which causes validation failures.
      if (contractTracking?.trackingCategoryID && contractTracking?.trackingOptionID) {
        lineItemTrackings.push(contractTracking);
      }

      if (projectTracking?.trackingCategoryID && projectTracking?.trackingOptionID) {
        lineItemTrackings.push(projectTracking);
      }

      let claimStatus = Invoice.StatusEnum.DRAFT;
      if (
        (claimDetails.claim_type === 'Billable' &&
          xeroDetails.pt_to_xero_bill_as_draft === 'No') ||
        (claimDetails.claim_type === 'Receivable' &&
          xeroDetails.pt_to_xero_invoice_as_draft === 'No')
      ) {
        claimStatus =
          claimDetails.status === 'Draft'
            ? Invoice.StatusEnum.DRAFT
            : Invoice.StatusEnum.AUTHORISED;
      }

      let invoice: Invoice = {
        type:
          claimDetails.claim_type === 'Billable'
            ? Invoice.TypeEnum.ACCPAY
            : Invoice.TypeEnum.ACCREC,
        contact,
        status: claimStatus,
        reference:
          claimDetails.cash_retention_type + ' - # ' + payment_claim_id, //need to modify
        lineAmountTypes: claimDetails.is_gst_optional
          ? LineAmountTypes.Inclusive
          : LineAmountTypes.NoTax,
        date: moment(invoice_date).toDate(), // today's date
        dueDate: moment(claimDetails.due_date).toDate(), // 14 days later need to check
      };

      // create path always uses Inclusive when GST-optional (no Exclusive option exposed)
      const resolvedLineAmountTypes: LineAmountTypes = claimDetails.is_gst_optional
        ? LineAmountTypes.Inclusive
        : LineAmountTypes.NoTax;
      // Pick the per-line price source based on the actual Xero
      // lineAmountTypes (not is_gst_optional). Inclusive lines must be
      // sent inc-GST; Exclusive/NoTax lines must be sent ex-GST.
      const isInclusiveLine = resolvedLineAmountTypes === LineAmountTypes.Inclusive;
      if (invoices && invoices.length > 0 && invoices[0] !== null) {
        this.logger.log(`invoices: ${JSON.stringify(invoices)}`);
        let lineItems = [];
        const totalLineAmount = invoices?.reduce((sum, item) => {
          return (
            sum +
            (isInclusiveLine
              ? item?.total_amount_including_gst === null
                ? 0.0
                : Math.abs(Number(item?.total_amount_including_gst))
              : item?.unit_price === null
                ? 0.0
                : Math.abs(Number(item?.unit_price)))
          );
        }, 0.0);
        const useSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
        const fallbackTaxCode =
          claimDetails.claim_type === 'Billable'
            ? xeroDetails.bill_tax_code
            : xeroDetails.invoice_tax_code;
        // Task #41 — variable bill code per supplier. Resolves to either a
        // per-(supplier × project) override, supplier default, or the
        // company-level bill_code (with optional fallback). For Receivable
        // claims this returns invoice_code unchanged.
        const resolvedBillCodeOutcome = await this.resolveOutboundBillCode(
          decoded,
          xeroDetails,
          clientSuppliersDetails,
          claimDetails,
          data?.sync_id || null,
        );
        if (resolvedBillCodeOutcome.source === 'unresolved') {
          return false;
        }
        const resolvedBaseAccountCode =
          resolvedBillCodeOutcome.accountCode ||
          (claimDetails.claim_type === 'Billable'
            ? xeroDetails.bill_code
            : xeroDetails.invoice_code);
        for (const element of invoices) {
          // Protect against division by zero to prevent Infinity/NaN values.
          // `retention_amount` is stored ex-GST in PayTrade. The share to
          // deduct from each bill_code line is the ex-GST retention pro-rated
          // by line amount. Whether the line is expressed inc-GST or ex-GST,
          // the deduction is the same dollar value (retention has no GST
          // component on its own — that is captured separately on the
          // retention/liability lines below). The previous `* 1.1` here
          // double-counted the gross-up and produced bill totals that were
          // retention * 0.1 too low.
          const retentionShare = (!useSimplifiedRetention && claimDetails.retention_amount && totalLineAmount !== 0)
            ? (Number(claimDetails.retention_amount) *
                (isInclusiveLine
                  ? Number(element.total_amount_including_gst)
                  : Number(element.unit_price))) /
              totalLineAmount
            : 0;
          let lineItem: LineItem = {
            description: element.description,
            quantity: element.quantity,
            unitAmount:
              (isInclusiveLine
                ? Number(element.total_amount_including_gst)
                : Number(element.unit_price)) - retentionShare,
            accountCode:
              claimDetails.cash_retention_type === 'Claim'
                ? resolvedBaseAccountCode
                : claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_release_code
                  : xeroDetails.retention_receivable_release_code,
            tracking: lineItemTrackings,
          };
          if (claimDetails.is_gst_optional) {
            lineItem = {
              ...lineItem,
              taxType:
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.bill_tax_code
                  : xeroDetails.invoice_tax_code,
              // taxAmount: element.gst,
            };
          }
          lineItems.push(lineItem);
        }

        if (
          claimDetails.cash_retention &&
          claimDetails.cash_retention_type === 'Claim'
        ) {
          if (useSimplifiedRetention) {
            const retentionHeldCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code;
            const heldSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              retentionHeldCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const retentionLine: LineItem = {
              description: 'Retention Held',
              quantity: 1,
              unitAmount: -heldSpec.unitAmount,
              accountCode: retentionHeldCode,
              tracking: lineItemTrackings,
              ...(heldSpec.taxType ? { taxType: heldSpec.taxType } : {}),
            };
            lineItems.push(retentionLine);
          } else {
            // Standard 3-line pattern: +retention held, -liability for defects
            const retentionHeldCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code;
            const liabilityCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.liability_payable_code
                : xeroDetails.liability_receivable_code;
            const heldSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              retentionHeldCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const liabSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              liabilityCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const lineItem1: LineItem = {
              description: 'Retention Held',
              quantity: 1,
              unitAmount: heldSpec.unitAmount,
              accountCode: retentionHeldCode,
              tracking: lineItemTrackings,
              ...(heldSpec.taxType ? { taxType: heldSpec.taxType } : {}),
            };
            const lineItem2: LineItem = {
              description: 'Liability for defects',
              quantity: 1,
              unitAmount: -liabSpec.unitAmount,
              accountCode: liabilityCode,
              tracking: lineItemTrackings,
              ...(liabSpec.taxType ? { taxType: liabSpec.taxType } : {}),
            };
            lineItems.push(lineItem1);
            lineItems.push(lineItem2);
          }
        } else if (claimDetails.cash_retention_type === 'Retention claim') {
          claimDetails.retention_amount = invoices?.reduce((sum, item) => {
            return (
              sum +
              (item?.total_amount_including_gst === null
                ? 0.0
                : Math.abs(Number(item?.total_amount_including_gst)))
            );
          }, 0.0);
          if (useSimplifiedRetention) {
            const retentionReleaseCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code;
            const releaseSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              retentionReleaseCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const retentionReleaseLine: LineItem = {
              description: 'Retention Release',
              quantity: 1,
              unitAmount: -releaseSpec.unitAmount,
              accountCode: retentionReleaseCode,
              tracking: lineItemTrackings,
              ...(releaseSpec.taxType ? { taxType: releaseSpec.taxType } : {}),
            };
            lineItems.push(retentionReleaseLine);
          } else {
            // Standard 3-line pattern: +liability for defects, -retention release
            const liabilityCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.liability_payable_code
                : xeroDetails.liability_receivable_code;
            const retentionReleaseCode =
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code;
            const liabSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              liabilityCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const releaseSpec = await this.getRetentionLineSpec(
              Number(claimDetails.retention_amount),
              retentionReleaseCode,
              xeroDetails.tenant_id,
              resolvedLineAmountTypes,
              fallbackTaxCode,
              xeroDetails.retention_recording_mode,
              xeroDetails.retention_tax_type,
            );
            const lineItem1: LineItem = {
              description: 'Liability for defects',
              quantity: 1,
              unitAmount: liabSpec.unitAmount,
              accountCode: liabilityCode,
              tracking: lineItemTrackings,
              ...(liabSpec.taxType ? { taxType: liabSpec.taxType } : {}),
            };
            const lineItem2: LineItem = {
              description: 'Retention Release',
              quantity: 1,
              unitAmount: -releaseSpec.unitAmount,
              accountCode: retentionReleaseCode,
              tracking: lineItemTrackings,
              ...(releaseSpec.taxType ? { taxType: releaseSpec.taxType } : {}),
            };

            lineItems.push(lineItem1);
            lineItems.push(lineItem2);
          }
        }

        invoice = { ...invoice, lineItems };
      }

      await this.xeroService.refreshTokenSet(
        claimDetails.company_id,
        this.xero,
      );

      try {
        const response = await this.xero.accountingApi.createInvoices(
          xeroDetails.tenant_id,
          { invoices: [invoice] },
        );

        this.logger.log(`Invoice created: ${JSON.stringify(response.body.invoices[0])}`);
        if (response.body.invoices) {
          const invoice = response.body.invoices[0];
          // Get new claim - project/contract mapping validation
          let contractTrackingId = null;
          let projectTrackingId = null;

          invoice?.lineItems[0]?.tracking?.forEach((item) => {
            if (item?.trackingCategoryID === xeroDetails.contract_category_id) {
              contractTrackingId = item?.trackingOptionID;
            } else if (
              item?.trackingCategoryID === xeroDetails.project_category_id
            ) {
              projectTrackingId = item?.trackingOptionID;
            }
          });

          const requestData: any = {
            invoice_id: invoice.invoiceID,
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            type: invoice.type,
            contact_id: xeroContactDetails?.id,
            project_id: xeroProjectDetails?.id,
            contract_id: xeroContractDetails?.id,
            status: invoice.status,
            invoice_date: invoice.date,
            due_date: invoice.dueDate || null,
            reference: invoice.invoiceNumber || invoice.reference,
            sub_total: invoice.subTotal,
            total_tax: invoice.totalTax,
            total_amount: invoice.total,
            line_items:
              invoice.lineItems
                ?.filter(
                  (item) =>
                    item.accountCode !== undefined && item.accountCode !== null,
                )
                ?.map((item) => ({
                  line_item_id: item.lineItemID,
                  description: item.description || null,
                  quantity: item.quantity || null,
                  unit_amount: item.unitAmount || null,
                  account_code: item.accountCode || null,
                  account_id: item.accountID || null,
                  tax_type: item.taxType || null,
                  tax_amount: item.taxAmount || null,
                  line_amount: item.lineAmount || null,
                  contract_id: contractTrackingId,
                  project_id: projectTrackingId,
                })) || null,
            line_amount_types: invoice.lineAmountTypes,
            pt_claim_id: claimDetails.payment_claim_id,
            mapped_status: data.mapped_status,
            created_on: invoice.updatedDateUTC,
            created_by: decoded?.userId,
            created_group: 'USER',
          };
          this.logger.log(`requestData: ${JSON.stringify(requestData)}`);

          const xeroResponse: any =
            await this.insertInvoiceDetails(requestData);
          if (xeroResponse) {
            // Phase 3 — auto gross-up retention via Manual Journals.
            // Best-effort: failures are logged via sync log and never block
            // the main create flow.
            try {
              await this.maybePostRetentionGrossUpJournal(
                decoded,
                claimDetails,
                xeroDetails,
                invoice,
                xeroResponse?.invoice_id || invoice?.invoiceID,
              );
            } catch (mjErr) {
              this.logger.error(
                `[MJ_OUTBOUND_CREATE] gross-up post failed for claim ${claimDetails?.payment_claim_id}: ${mjErr?.message || mjErr}`,
              );
            }

            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: claimDetails.claim_type === 'Billable' ? 50 : 63,
              dynamic_values: { id: xeroResponse?.id },
              project_id: xeroProjectDetails.id,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: claimDetails?.id,
              },
              reference_id: claimDetails?.id,
              history: [
                `API triggered from claim ${claimDetails?.payment_claim_id}`,
                'Export successful',
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
            xeroResponse.claim_type = claimDetails.claim_type;
            return xeroResponse;
          }
        } else {
          const errMsg = await handleAxiosError(response);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'editDetailsOfAPaymentClaim',
              api_payload: {
                payment_claim_id: data.payment_claim_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: claimDetails.claim_type == 'Billable' ? 55 : 68,
              dynamic_values: {},
              project_id: xeroProjectDetails.id,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: null,
                paytradeId: claimDetails?.id,
              },
              reference_id: claimDetails?.id,
              history: [
                `API triggered from claim ${claimDetails?.payment_claim_id}`,
                'Export failed',
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
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [claimDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } catch (error) {
        const errMsg = await handleAxiosError(error);
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: data?.sync_id,
            api_name: 'editDetailsOfAPaymentClaim',
            api_payload: {
              payment_claim_id: data.payment_claim_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: claimDetails.claim_type == 'Billable' ? 55 : 68,
            dynamic_values: {},
            project_id: xeroProjectDetails.id,
            contract_id: xeroContractDetails?.id,
            reference: {
              xeroId: null,
              paytradeId: claimDetails?.id,
            },
            reference_id: claimDetails?.id,
            history: [
              `API triggered from claim ${claimDetails?.payment_claim_id}`,
              'Export failed',
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
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [claimDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          },
        );

        return false;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getInvoiceDetails(pt_claim_id: number, integration_id: number) {
    return await this.xeroInvoicesBills.findOne({
      where: { pt_claim_id, integration_id },
    });
  }

  async getInvoiceDetailsByInvoiceId(
    invoice_id: string,
    integration_id: number,
  ) {
    return await this.xeroInvoicesBills.findOne({
      where: { invoice_id, integration_id },
    });
  }

  async insertInvoiceDetails(requestData: any) {
    const xeroInvoicesBills = await this.xeroInvoicesBills.create(requestData);

    return await this.xeroInvoicesBills.save(xeroInvoicesBills);
  }

  async insertClaimDetailsInPaytrade(decoded: any, data: any) {
    const { company_id, invoice_id } = data;
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });

    if (
      !xeroDetails ||
      !xeroDetails.integration_id ||
      !xeroDetails?.integrationDetails
    ) {
      throw `No xero integration found`;
    }

    if (
      xeroDetails?.integrationDetails?.integration_status !==
      'Connected - active'
    ) {
      throw `Paytrade is currently not active in Xero.`;
    }

    const checkExistenceInDb = await this.getInvoiceDetailsByInvoiceId(
      invoice_id,
      xeroDetails.integration_id,
    );
    if (!checkExistenceInDb) {
      throw `Claim details not found`;
    }

    const invoiceDetails = await this.getInvoiceByInvoiceId(
      invoice_id,
      company_id,
    );

    if (!invoiceDetails) {
      throw `Xero claim details not found`;
    }

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      (!invoiceDetails.lineItems ||
        (invoiceDetails.lineItems.length > 0 &&
          !invoiceDetails.lineItems[0]?.accountCode))
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 133 : 135,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [
          `API triggered from claim ${checkExistenceInDb?.id}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: `There should be atleast one line item`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      invoiceDetails?.lineItems &&
      !invoiceDetails?.lineItems?.some((li) => li.tracking?.length)
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 312 : 313,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [
          `API triggered from claim ${checkExistenceInDb?.id}`,
          'Import failed',
        ],
        important_checks: {
          'Import data format validation': 'Failed',
        },
        error_message: `Missing tracking id in line item`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    if (!xeroDetails.project_category_id) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          category_type: 'project',
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 314 : 315,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
        important_checks: {
          'Import data format validation': 'Ok',
          'Import tracking id validation': 'Failed',
        },
        error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    // If contract_category_id is not configured, the import proceeds and attempts to
    // resolve the contract using smart matching (single contract for supplier+project,
    // or by matching claim amount against contract value + approved variations).
    // Previously this was a hard block that caused unnecessary import failures.

    // Get new claim - project/contract mapping validation
    let contractTrackingId = null;
    let projectTrackingId = null;

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      invoiceDetails?.lineItems &&
      invoiceDetails?.lineItems?.some((li) => li.tracking?.length) &&
      invoiceDetails?.lineItems[0]?.tracking[0]?.trackingCategoryID
    ) {
      let contractTrackingCategoryId = null;
      let projectTrackingCategoryId = null;
      invoiceDetails?.lineItems[0]?.tracking?.forEach((item) => {
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

      // if (!projectTrackingCategoryId) {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'createInvoiceOrBillInPaytrade',
      //     api_payload: {
      //       invoice_id: data.invoice_id,
      //       category_type: 'project',
      //     },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id:
      //       invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 318 : 319,
      //     dynamic_values: {},
      //     project_id: checkExistenceInDb?.project_id,
      //     contract_id: checkExistenceInDb?.contract_id,
      //     reference: {
      //       xeroId: checkExistenceInDb?.id,
      //       paytradeId: null,
      //     },
      //     reference_id: checkExistenceInDb?.id,
      //     history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
      //     important_checks: {
      //       'Import data format validation': 'Ok',
      //       'Import tracking id validation': 'Failed',
      //     },
      //     error_message: `Mismatch in project tracking category id.`,
      //     xero_records: [invoiceDetails],
      //     paytrade_records: [],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }

      // if (!contractTrackingCategoryId) {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'createInvoiceOrBillInPaytrade',
      //     api_payload: {
      //       invoice_id: data.invoice_id,
      //       category_type: 'contract',
      //     },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id:
      //       invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 320 : 321,
      //     dynamic_values: {},
      //     project_id: checkExistenceInDb?.project_id,
      //     contract_id: checkExistenceInDb?.contract_id,
      //     reference: {
      //       xeroId: checkExistenceInDb?.id,
      //       paytradeId: null,
      //     },
      //     reference_id: checkExistenceInDb?.id,
      //     history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
      //     important_checks: {
      //       'Import data format validation': 'Ok',
      //       'Import tracking id validation': 'Failed',
      //     },
      //     error_message: `Mismatch in contract tracking category id`,
      //     xero_records: [invoiceDetails],
      //     paytrade_records: [],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }
    }

    let expectedCodeCheck = null;

    const isSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
    if (invoiceDetails.type === Invoice.TypeEnum.ACCPAY) {
      expectedCodeCheck =
        !xeroDetails.bill_code ||
        !xeroDetails.retention_payable_retained_code ||
        (!isSimplifiedRetention && !xeroDetails.liability_payable_code) ||
        !xeroDetails.retention_payable_release_code;
    } else if (invoiceDetails.type === Invoice.TypeEnum.ACCREC) {
      expectedCodeCheck =
        !xeroDetails.invoice_code ||
        !xeroDetails.retention_receivable_retained_code ||
        (!isSimplifiedRetention && !xeroDetails.liability_receivable_code) ||
        !xeroDetails.retention_receivable_release_code;
    }

    if (expectedCodeCheck) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 134 : 136,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
        important_checks: {
          'Import data format validation': 'Ok',
          'Import tracking id validation': 'Ok',
          'Import account type validation': 'Failed',
        },
        error_message: `Missing account field type. Please configure the mapping in Settings to continue.`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

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
    for (let item of invoiceDetails?.lineItems) {
      if (!accountCodes.includes(item.accountCode)) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInPaytrade',
          api_payload: {
            invoice_id: data.invoice_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id:
            invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 322 : 323,
          dynamic_values: {},
          project_id: checkExistenceInDb?.project_id,
          contract_id: checkExistenceInDb?.contract_id,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Failed',
          },
          error_message: `Mismatch in account codes`,
          xero_records: [invoiceDetails],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
    }

    //Get new claim - Check account validation

    let expectedTaxCode = null;

    if (invoiceDetails.type === Invoice.TypeEnum.ACCPAY) {
      expectedTaxCode = xeroDetails.bill_tax_code;
    } else if (invoiceDetails.type === Invoice.TypeEnum.ACCREC) {
      expectedTaxCode = xeroDetails.invoice_tax_code;
    }

    if (!expectedTaxCode) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 137 : 138,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
        important_checks: {
          'Import data format validation': 'Ok',
          'Import tracking id validation': 'Ok',
          'Import account type validation': 'Ok',
          'Import tax type validation': 'Failed',
        },
        error_message: `Missing tax field type. Please configure the mapping in Settings to continue.`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    const mismatchedTaxLines = invoiceDetails.lineItems.length > 0
      ? invoiceDetails.lineItems.filter(
          (item) => item?.taxAmount > 0 && item?.taxType !== expectedTaxCode,
        )
      : [];

    if (mismatchedTaxLines.length > 0) {
      const mismatchDetails = mismatchedTaxLines
        .map(
          (item) =>
            `Line "${item.description || 'No description'}" has tax type "${item.taxType}" but expected "${expectedTaxCode}"`,
        )
        .join('; ');

      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 324 : 325,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
        important_checks: {
          'Import data format validation': 'Ok',
          'Import tracking id validation': 'Ok',
          'Import account type validation': 'Ok',
          'Import tax type validation': 'Failed',
        },
        error_message: `Mismatch in tax field type. ${mismatchDetails}`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    //Get new claim - Check data format validation
    const xeroContactDetails = await this.xeroContactDetails.findOne({
      where: {
        contact_id: invoiceDetails?.contact?.contactID,
        integration_id: xeroDetails.integration_id,
      },
    });

    if (!xeroContactDetails) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 139 : 140,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [
          `API triggered from claim ${checkExistenceInDb?.id}`,
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    if (!xeroContactDetails.pt_contact_id) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          contact_id: invoiceDetails?.contact?.contactID,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 141 : 142,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [
          `API triggered from claim ${checkExistenceInDb?.id}`,
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
        xero_records: [invoiceDetails],
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

    // if (!clientSuppliersDetails) {
    //   await this.xeroService.insertXeroSyncLogs(decoded, {
    //     integration_id: xeroDetails.integration_id,
    //     log_template_id: 30,
    //     dynamic_values: {},
    //     project_id: checkExistenceInDb?.project_id,
    //     contract_id: checkExistenceInDb?.contract_id,
    //     reference: {
    //       xeroId: checkExistenceInDb?.id,
    //       paytradeId: null,
    //     },
    //     reference_id: checkExistenceInDb?.id,
    //     history: [
    //       `API triggered from claim ${checkExistenceInDb?.id}`,
    //       'Import failed',
    //     ],
    //     important_checks: {
    //       'Import data format validation': 'Ok',
    //       'Import tracking id validation': 'Ok',
    //       'Import account type validation': 'Ok',
    //       'Import tax type validation': 'Ok',
    //       'Client/Supplier mapping validation': 'Failed',
    //     },
    //     error_message: `Client/Supplier details not found`,
    //     xero_records: [invoiceDetails],
    //     paytrade_records: [],
    //     new_records: null,
    //     updated_records: null,
    //     synced_records: null,
    //   });
    //   return false;
    // }

    // Contract mapping is now optional — smart resolution happens after project is resolved.
    const xeroContractDetails = contractTrackingId
      ? await this.xeroContractDetails.findOne({
          where: {
            contract_id: contractTrackingId,
            integration_id: xeroDetails.integration_id,
          },
        })
      : null;

    let contractDetails =
      xeroContractDetails && xeroContractDetails?.pt_contract_id
        ? await this.contractDetails.findOne({
            where: { contract_id: xeroContractDetails.pt_contract_id },
          })
        : null;

    const xeroProjectDetails = projectTrackingId
      ? await this.xeroProjectDetails.findOne({
          where: {
            project_id: projectTrackingId,
            integration_id: xeroDetails.integration_id,
          },
        })
      : null;

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      !xeroProjectDetails
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          project_id: projectTrackingId,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 106 : 131,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    const projectDetails =
      xeroProjectDetails && xeroProjectDetails?.pt_project_id
        ? await this.projectDetails.findOne({
            where: { project_id: xeroProjectDetails.pt_project_id },
          })
        : null;

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      !projectDetails
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          project_id: projectTrackingId,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 147 : 148,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    // If contract was not resolved via tracking ID, attempt automatic resolution:
    // 1. Single contract for this supplier+project → use it.
    // 2. Multiple contracts → match by claim amount vs contract value (initial sum + agreed variations).
    // 3. Fail only if genuinely ambiguous.
    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      !contractDetails &&
      xeroContactDetails?.pt_contact_id
    ) {
      this.logger.log(
        `Contract not resolved via tracking for invoice ${invoice_id}. ` +
        `Attempting smart contract resolution for supplier ${xeroContactDetails.pt_contact_id}.`
      );

      const candidateContracts = await this.contractDetails.find({
        where: {
          company_id: company_id,
          client_supplier_id: xeroContactDetails.pt_contact_id,
          ...(projectDetails?.project_id
            ? { project_id: projectDetails.project_id }
            : {}),
          contract_status: In(['Draft', 'In Progress', 'Completed']),
        },
        relations: ['variationDetails'],
      });

      if (candidateContracts.length === 1) {
        contractDetails = candidateContracts[0];
        this.logger.log(
          `Smart match: single contract found (contract_id: ${contractDetails.contract_id}). Auto-resolved.`
        );
      } else if (candidateContracts.length > 1) {
        const claimTotal = Math.abs(Number(invoiceDetails.total || 0));
        const amountMatches = candidateContracts.filter((contract) => {
          const agreedVariations = (contract.variationDetails || [])
            .filter((v) => v.variation_status === 'Agreed')
            .reduce((sum, v) => sum + Number(v.variation_amount || 0), 0);
          const contractTotal = Number(contract.initial_contract_sum || 0) + agreedVariations;
          return Math.abs(contractTotal - claimTotal) <= 0.01;
        });

        if (amountMatches.length === 1) {
          contractDetails = amountMatches[0];
          this.logger.log(
            `Smart match: amount-matched contract found ` +
            `(contract_id: ${contractDetails.contract_id}, amount: ${claimTotal}). Auto-resolved.`
          );
        } else {
          this.logger.log(
            `Smart match failed: ${candidateContracts.length} contracts found, ` +
            `${amountMatches.length} amount matches. Cannot auto-resolve.`
          );
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'createInvoiceOrBillInPaytrade',
            api_payload: {
              invoice_id: data.invoice_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id:
              invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 145 : 146,
            dynamic_values: {},
            project_id: checkExistenceInDb?.project_id,
            contract_id: checkExistenceInDb?.contract_id,
            reference: {
              xeroId: checkExistenceInDb?.id,
              paytradeId: null,
            },
            reference_id: checkExistenceInDb?.id,
            history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
            important_checks: {
              'Import data format validation': 'Ok',
              'Import tracking id validation': 'Ok',
              'Import account type validation': 'Ok',
              'Import tax type validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
              'Contract mapping validation': 'Failed',
            },
            error_message: `Multiple contracts found for this supplier and project. Please map the contract in Xero tracking categories to resolve.`,
            xero_records: [invoiceDetails],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      } else {
        this.logger.log(
          `No candidate contracts found for supplier ${xeroContactDetails.pt_contact_id}.`
        );

        if (xeroDetails.smart_contract_auto_create && projectDetails && clientSuppliersDetails) {
          this.logger.log(
            `Smart contract auto-create is enabled. Attempting to create contract for ` +
            `project ${projectDetails.project_id} and contact ${xeroContactDetails.pt_contact_id}.`
          );
          const smartContract = await this.smartCreateContract(decoded, {
            company_id,
            projectDetails,
            clientSuppliersDetails,
            invoiceDetails,
            xeroDetails,
            data,
            invoice_id,
            checkExistenceInDb,
            xeroProjectDetailsId: xeroProjectDetails?.id || null,
          });

          if (smartContract) {
            contractDetails = smartContract;
            this.logger.log(
              `Smart contract auto-created: contract_id=${smartContract.contract_id}. Continuing claim import.`
            );
          } else {
            this.logger.log(
              `Smart contract auto-creation failed or was skipped. Claim import will proceed without contract.`
            );
          }
        } else {
          this.logger.log(
            `Smart contract auto-create is disabled or missing project/contact. Proceeding without contract.`
          );
        }
      }
    }

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      contractDetails &&
      clientSuppliersDetails?.client_supplier_id !==
        contractDetails.client_supplier_id
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 149 : 150,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      contractDetails &&
      projectDetails?.project_id !== contractDetails.project_id
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 151 : 152,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    //Get new claim - Data success - transaction step validation
    if (contractDetails && contractDetails.contract_status !== 'In Progress') {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 153 : 154,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    let existingXeroInvoice: any = await this.xeroInvoicesBills.findOne({
      where: {
        invoice_id: invoiceDetails.invoiceID,
        integration_id: xeroDetails.integration_id,
      },
    });
    if (existingXeroInvoice) {
      existingXeroInvoice.tenant_id = xeroDetails.tenant_id;
      existingXeroInvoice.type = invoiceDetails.type;
      existingXeroInvoice.contact_id = xeroContactDetails?.id;
      existingXeroInvoice.project_id = xeroProjectDetails?.id;
      existingXeroInvoice.contract_id = xeroContractDetails?.id;
      existingXeroInvoice.status = invoiceDetails.status;
      existingXeroInvoice.invoice_date = invoiceDetails.date;
      existingXeroInvoice.due_date = invoiceDetails.dueDate || null;
      existingXeroInvoice.reference = invoiceDetails.reference || null;
      existingXeroInvoice.sub_total = invoiceDetails.subTotal || null;
      existingXeroInvoice.total_tax = invoiceDetails.totalTax || null;
      existingXeroInvoice.total_amount = invoiceDetails.total || null;
      existingXeroInvoice.line_items = invoiceDetails.lineItems || [];
      existingXeroInvoice.line_amount_types = invoiceDetails.lineAmountTypes;
      existingXeroInvoice.updated_group = 'SYSTEM';
      existingXeroInvoice.updated_on = moment().toISOString();
      existingXeroInvoice.current_xero_status = invoiceDetails.status;
      existingXeroInvoice.deep_link_url = this.buildXeroDeepLink(
        invoiceDetails.invoiceID,
        invoiceDetails.type as any,
      );
      existingXeroInvoice.is_stale = true;
      await this.xeroInvoicesBills.save(existingXeroInvoice);
      // Refresh the cached PDF in the background — failures are logged
      // and never block the webhook update path.
      this.fetchAndCacheXeroPdf({
        company_id: xeroDetails.company_id,
        invoice_id: invoiceDetails.invoiceID,
        integration_id: xeroDetails.integration_id,
        type: invoiceDetails.type as any,
        status: invoiceDetails.status as any,
        skipTokenRefresh: true,
      }).catch((e) =>
        this.logger.error(`[XERO_PDF] background refresh failed: ${e?.message || e}`),
      );
    }

    const {
      retentionClaimnlineItem,
      lineItem1,
      lineItem2,
      hasBaseLine,
      netRetainedSigned,
      codesShared,
    } = XeroInvoicesService.classifyRetentionShape(invoiceDetails, xeroDetails);

    const importSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
    this.logger.debug(`[BILL_TRACE] I-Step: cash_retention_type check (import path) — retentionClaimLineItem=${retentionClaimnlineItem}, lineItem1=${lineItem1}, lineItem2=${lineItem2}, hasBaseLine=${hasBaseLine}, netRetainedSigned=${netRetainedSigned}, codesShared=${codesShared}, simplifiedRetention=${importSimplifiedRetention}`);
    if (!importSimplifiedRetention && ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2))) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 155 : 156,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
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
      if (!data?.retention_id && !data?.associated_retention_sub_payment_id) {
        const retentionListQuery = `
          select pc.company_id, pc.payment_claim_id, pc.claim_type, pc.project_id, pc.client_supplier_id, pc.contract_id, pc.claim_amount, 
          p.payment_id, s.sub_payment_id, r.retention_id, r.retained_amount, r.retention_status 
          from payment_claims pc inner join payment_details p on pc.payment_claim_id = p.payment_claim_id and pc.cash_retention_type <> 'Retention claim' 
          inner join sub_payments s on p.payment_id = s.payment_id and p.current_status <> 'Deleted' 
          inner join retention_details r on p.payment_id = r.payment_id and s.sub_payment_id = r.sub_payment_id and r.retention_status = 'Retained' 
          inner join integration_details i on i.company_id = pc.company_id and i.integration_status = 'Connected - active' 
          where pc.company_id = ${company_id} and pc.project_id = ${xeroProjectDetails.pt_project_id} and pc.client_supplier_id = ${xeroContactDetails.pt_contact_id} and pc.contract_id = ${xeroContractDetails.pt_contract_id};`;

        const retentionDetails =
          await this.dataSource.query(retentionListQuery);
        this.logger.log(`retentionDetails: ${JSON.stringify(retentionDetails)}`);

        if (!retentionDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'createInvoiceOrBillInPaytrade',
            api_payload: {
              invoice_id: data.invoice_id,
              project_id: contractDetails?.project_id,
              contract_id: contractDetails?.contract_id,
              client_supplier_id: xeroContactDetails?.pt_contact_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id:
              invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 157 : 158,
            dynamic_values: {},
            project_id: checkExistenceInDb?.project_id,
            contract_id: checkExistenceInDb?.contract_id,
            reference: {
              xeroId: checkExistenceInDb?.id,
              paytradeId: null,
            },
            reference_id: checkExistenceInDb?.id,
            history: [
              `API triggered from claim ${invoice_id}`,
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
            error_message: `Retention list is not identified.`,
            xero_records: [invoiceDetails],
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
                Number(invoiceDetails.total),
            ) || [];
          if (identifiedRetentions && identifiedRetentions.length > 0) {
            if (identifiedRetentions.length == 1) {
              retention_id = identifiedRetentions[0]?.retention_id;
              associated_retention_sub_payment_id =
                identifiedRetentions[0]?.sub_payment_id;
            } else {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createInvoiceOrBillInPaytrade',
                api_payload: {
                  invoice_id: data.invoice_id,
                  project_id: contractDetails?.project_id,
                  contract_id: contractDetails?.contract_id,
                  client_supplier_id: xeroContactDetails?.pt_contact_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 159 : 160,
                dynamic_values: {},
                project_id: checkExistenceInDb?.project_id,
                contract_id: checkExistenceInDb?.contract_id,
                reference: {
                  xeroId: checkExistenceInDb?.id,
                  paytradeId: null,
                },
                reference_id: checkExistenceInDb?.id,
                history: [
                  `API triggered from claim ${invoice_id}`,
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
                xero_records: [invoiceDetails],
                paytrade_records: [],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return false;
            }
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createInvoiceOrBillInPaytrade',
              api_payload: {
                invoice_id: data.invoice_id,
                project_id: contractDetails?.project_id,
                contract_id: contractDetails?.contract_id,
                client_supplier_id: xeroContactDetails?.pt_contact_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id:
                invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 157 : 158,
              dynamic_values: {},
              project_id: checkExistenceInDb?.project_id,
              contract_id: checkExistenceInDb?.contract_id,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: null,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from claim ${invoice_id}`,
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
              error_message: `Retention list is not identified.`,
              xero_records: [invoiceDetails],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
        } else {
          if (
            retentionDetails.retained_amount &&
            Number(retentionDetails.retained_amount) ==
              Number(invoiceDetails.total)
          ) {
            retention_id = retentionDetails?.retention_id;
            associated_retention_sub_payment_id =
              retentionDetails?.sub_payment_id;
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createInvoiceOrBillInPaytrade',
              api_payload: {
                invoice_id: data.invoice_id,
                project_id: contractDetails?.project_id,
                contract_id: contractDetails?.contract_id,
                client_supplier_id: xeroContactDetails?.pt_contact_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id:
                invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 157 : 158,
              dynamic_values: {},
              project_id: checkExistenceInDb?.project_id,
              contract_id: checkExistenceInDb?.contract_id,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: null,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from claim ${invoice_id}`,
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
              error_message: `Retention list is not identified.`,
              xero_records: [invoiceDetails],
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
    //Get new claim- Invoice type check - Validate against contract size OK
    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      contractDetails &&
      Number(invoiceDetails.total) >
        Number(contractDetails.initial_contract_sum)
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 161 : 162,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
      //send warning email
    }
    //Get new claim - Invoice type check - retention check
    const retentionLineItems =
      invoiceDetails?.lineItems?.filter((item) =>
        [
          xeroDetails.retention_payable_retained_code,
          // xeroDetails.liability_payable_code,
          // xeroDetails.retention_payable_release_code,
          xeroDetails.retention_receivable_retained_code,
          // xeroDetails.liability_receivable_code,
          // xeroDetails.retention_receivable_release_code,
        ].includes(item?.accountCode),
      ) || [];

    // Track ex-GST (unit) and GST (tax) portions of the retention
    // separately so we don't lose the BAS-Excluded vs GST-on-Expenses
    // signal carried by each retention line. `unitExGst` normalises the
    // unitAmount to an ex-GST figure whatever `lineAmountTypes` is.
    // When retention_recording_mode === 'inc_gst' on Inclusive invoices
    // the unitAmount is the gross figure (regardless of the destination
    // account's taxAmount being 0 for BAS-Excluded), so derive the
    // ex/GST split as u/1.1 + (u - u/1.1).
    const useIncGstSplit =
      xeroDetails.retention_recording_mode === 'inc_gst' &&
      invoiceDetails.lineAmountTypes === LineAmountTypes.Inclusive;
    const retentionUnitOnly = retentionLineItems.reduce((sum, item) => {
      const u = Math.abs(Number(item?.unitAmount || 0));
      const t = Math.abs(Number(item?.taxAmount || 0));
      if (useIncGstSplit) return sum + u / 1.1;
      const unitExGst =
        invoiceDetails.lineAmountTypes === LineAmountTypes.Inclusive
          ? u - t
          : u;
      return sum + unitExGst;
    }, 0.0);
    const retentionTaxOnly = retentionLineItems.reduce((sum, item) => {
      const u = Math.abs(Number(item?.unitAmount || 0));
      if (useIncGstSplit) return sum + (u - u / 1.1);
      return sum + Math.abs(Number(item?.taxAmount || 0));
    }, 0.0);
    const retentionAmount = retentionUnitOnly + retentionTaxOnly;

    const cashRetention =
      retentionLineItems && retentionLineItems.length > 0 && retentionAmount > 0
        ? true
        : false;

    let invoices = [],
      filteredInvoices = [],
      retentionPercentage = 0,
      retainedAmountExcludingGST = 0;
    if (invoiceDetails.lineItems && invoiceDetails.lineItems.length > 0) {
      filteredInvoices = invoiceDetails.lineItems?.filter(
        (item) =>
          item.accountCode ===
          (invoiceDetails.type === Invoice.TypeEnum.ACCPAY
            ? xeroDetails.bill_code
            : xeroDetails.invoice_code),
      );

      if (cashRetention && importSimplifiedRetention) {
        invoices = this.mapItemsDirectly(
          filteredInvoices,
          invoiceDetails.lineAmountTypes,
        );
      } else {
        invoices = await this.adjustItemsWithRetention(
          invoiceDetails,
          filteredInvoices,
          retentionUnitOnly,
          retentionTaxOnly,
          invoiceDetails.lineAmountTypes,
        );
      }

      const subtotal = invoices.reduce((sum, i) => sum + i.unit_price, 0);
      // Use the ex-GST sum directly — BAS-Excluded retention has no GST
      // to strip out, and GST-on-Expenses retention has its tax tracked
      // on the line itself. The old `retentionAmount / 1.1` over-stripped
      // GST whenever taxAmount was already zero on the retention line.
      retainedAmountExcludingGST = retentionUnitOnly;
      retentionPercentage = subtotal !== 0 ? (retainedAmountExcludingGST / subtotal) * 100 : 0;
    }

    if (
      checkExistenceInDb &&
      checkExistenceInDb.pt_claim_id &&
      checkExistenceInDb.mapped_status
    ) {
      const checkExistenceInPaytrade = await this.getClaimsDetails(
        checkExistenceInDb.pt_claim_id,
      );
      if (checkExistenceInPaytrade) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInPaytrade',
          api_payload: {
            invoice_id: data.invoice_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id:
            invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 163 : 164,
          dynamic_values: {},
          project_id: checkExistenceInDb?.project_id,
          contract_id: checkExistenceInDb?.contract_id,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: checkExistenceInPaytrade?.id,
          },
          reference_id: checkExistenceInDb?.id,
          history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Ok',
            'Contract mapping validation': 'Ok',
            'Project mapping validation': 'Ok',
          },
          error_message: `Claim in Xero exists already and mapped to some other claim in paytrade ${checkExistenceInDb.pt_claim_id}`,
          xero_records: [invoiceDetails],
          paytrade_records: [checkExistenceInPaytrade],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
    }

    // Future-date check removed: Xero does not have a "received date"
    // field — this was actually checking the bill/invoice issue Date,
    // which suppliers and admins legitimately pre-date into the future
    // (e.g. an invoice issued today for next week's billing period).
    // Rejecting these blocked valid ingest and forced users to edit
    // Xero just to make PayTrade accept the record. Mirrors the
    // past-due-date removal in the webhook ingest paths.

    if (
      invoiceDetails?.dueDate &&
      moment
        .tz(invoiceDetails?.dueDate, 'UTC')
        .utc()
        .isBefore(moment.tz('UTC').startOf('day').utc())
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 357 : 358,
        dynamic_values: {},
        project_id: checkExistenceInDb?.project_id,
        contract_id: checkExistenceInDb?.contract_id,
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: null,
        },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
        important_checks: {
          'Import data format validation': 'Failed',
          'Import tracking id validation': 'Ok',
          'Import account type validation': 'Ok',
          'Import tax type validation': 'Ok',
          'Client/Supplier mapping validation': 'Ok',
          'Contract mapping validation': 'Ok',
          'Project mapping validation': 'Ok',
        },
        error_message: `The due date is in the past`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    let isS75eligible = false,
      claimNotPaidCount = 0;

    if (invoiceDetails.type === Invoice.TypeEnum.ACCREC) {
      if (
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
          (!data?.claims_with_reason || data?.claims_with_reason?.length == 0)
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'createInvoiceOrBillInPaytrade',
            api_payload: {
              invoice_id: data.invoice_id,
              project_id: checkExistenceInDb?.project_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 359,
            dynamic_values: {},
            project_id: checkExistenceInDb?.project_id,
            contract_id: checkExistenceInDb?.contract_id,
            reference: {
              xeroId: checkExistenceInDb?.id,
              paytradeId: null,
            },
            reference_id: checkExistenceInDb?.id,
            history: [
              `API triggered from claim ${invoice_id}`,
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
            xero_records: [invoiceDetails],
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
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInPaytrade',
          api_payload: {
            invoice_id: data.invoice_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 360,
          dynamic_values: {},
          project_id: checkExistenceInDb?.project_id,
          contract_id: checkExistenceInDb?.contract_id,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [`API triggered from claim ${invoice_id}`, 'Import failed'],
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
          xero_records: [invoiceDetails],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
    }

    let expectedDraftStatusCheck = null;

    if (invoiceDetails.type === Invoice.TypeEnum.ACCPAY) {
      expectedDraftStatusCheck = xeroDetails.xero_to_pt_bill_as_draft;
    } else if (invoiceDetails.type === Invoice.TypeEnum.ACCREC) {
      expectedDraftStatusCheck = xeroDetails.xero_to_pt_invoice_as_draft;
    }

    const claimStatus =
      expectedDraftStatusCheck === 'No'
        ? invoiceDetails?.status === Invoice.StatusEnum.DRAFT
          ? 'Draft'
          : 'Confirmed'
        : 'Draft';

    const paytradePayload: AddPaymentClaimInput = {
      company_id,
      claim_type:
        invoiceDetails.type === Invoice.TypeEnum.ACCPAY
          ? 'Billable'
          : 'Receivable',
      cash_retention_type,
      status: claimStatus,
      project_id: contractDetails?.project_id,
      contract_id: contractDetails?.contract_id,
      client_supplier_id: xeroContactDetails?.pt_contact_id,
      client_supplier_type: clientSuppliersDetails?.client_supplier_type,
      due_date: new Date(invoiceDetails?.dueDate),
      received_date:
        invoiceDetails.type === Invoice.TypeEnum.ACCPAY
          ? new Date(invoiceDetails?.date)
          : null,
      sent_date:
        invoiceDetails.type === Invoice.TypeEnum.ACCREC
          ? new Date(invoiceDetails?.date)
          : null,
      invoices,
      associated_retention_sub_payment_id,
      retention_id,
      // Derive claim_amount from the mapped line items (qty × unit + gst)
      // rather than trusting `invoiceDetails.total`, which historically has
      // been observed to be the unit price + tax (line gross-of-quantity)
      // rather than the true qty-weighted total in some Xero responses.
      // The line-item Σ is the canonical PayTrade definition of the claim
      // header amount and matches what `payment_claim_invoices` will hold.
      claim_amount:
        (invoices || []).reduce(
          (sum: number, ln: any) =>
            sum + Number(ln.quantity || 0) * Number(ln.unit_price || 0),
          0,
        ) +
        (invoices || []).reduce(
          (sum: number, ln: any) => sum + Number(ln.gst || 0),
          0,
        ) +
        retentionAmount,
      cash_retention: cashRetention,
      retention_percentage: retentionPercentage,
      retention_amount: retainedAmountExcludingGST,
      retention_amount_with_gst: retentionAmount,
      compulsory_attachment_ids: data?.compulsory_attachment_ids || [],
      all_subcontracts_paid: claimNotPaidCount > 0 ? false : true,
      created_by: decoded?.userId,
      is_gst_optional:
        invoiceDetails.lineAmountTypes !== LineAmountTypes.NoTax ? true : false,
    };

    const response = await this.paymentClaimsService.addPaymentClaim(
      decoded,
      paytradePayload,
      decoded?.userId,
    );
    if (response) {
      const xeroInvoicesBills: any = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: invoiceDetails?.invoiceID,
          integration_id: xeroDetails.integration_id,
        },
      });
      xeroInvoicesBills.pt_claim_id = response.payment_claim_id;
      xeroInvoicesBills.mapped_status = 'System';
      xeroInvoicesBills.updated_by = decoded?.userId;
      xeroInvoicesBills.updated_on = moment.tz('UTC');
      xeroInvoicesBills.updated_group = 'USER';
      await this.xeroInvoicesBills.save(xeroInvoicesBills);

      const paymentClaimDetails = await this.paymentClaims.findOne({
        where: { id: response?.id },
      });

      if (isS75eligible) {
        const file = await this.paymentClaimsService.generateS75Pdf(
          {
            new_claim_id: response.payment_claim_id,
            project_id: xeroProjectDetails?.pt_project_id,
            claims_with_reason:
              claimNotPaidCount > 0 && data.claims_with_reason
                ? data.claims_with_reason
                : [],
          },
          decoded,
        );
      }

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          id: data?.sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: paytradePayload.claim_type === 'Billable' ? 51 : 64,
          dynamic_values: { id: response?.id },
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: xeroInvoicesBills?.id,
            paytradeId: paymentClaimDetails?.id,
          },
          reference_id: xeroInvoicesBills?.id,
          history: [
            `API triggered from claim ${invoice_id}`,
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
          xero_records: [invoiceDetails],
          paytrade_records: [paymentClaimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        },
      );
    }
    this.logger.log(`response: ${JSON.stringify(response)}`);

    return {
      id: response.id,
      invoice_id: response.payment_claim_id,
      status: response.status,
    };
  }

  mapItemsDirectly(items: any[], lineAmountTypes: LineAmountTypes) {
    return items.map((item) => {
      // Coerce raw Xero values to JS numbers explicitly. Xero may send
      // numeric strings (e.g. "0.2") which silently round-trip OK in JS
      // arithmetic but, when fed into INSERT VALUES without explicit
      // Number() casting, can be coerced to integer by some downstream
      // mappers. Forcing Number() here preserves the decimal payload all
      // the way to the numeric DB column.
      const rawQty = Number(item.quantity ?? 0);
      const rawUnit = Number(item.unitAmount ?? 0);
      const rawTax = Number(item.taxAmount ?? 0);

      const unitAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? rawUnit - rawTax
          : rawUnit;

      const gst = [LineAmountTypes.Inclusive, LineAmountTypes.Exclusive].includes(
        lineAmountTypes,
      )
        ? parseFloat(Math.abs(rawTax).toFixed(2))
        : 0.0;

      const totalAmountIncludingGst =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? rawUnit * rawQty
          : rawUnit * rawQty + rawTax;

      return {
        unit_price: parseFloat(Number(unitAmount).toFixed(2)),
        gst,
        total_amount_including_gst: parseFloat(totalAmountIncludingGst.toFixed(2)),
        description: item.description,
        quantity: rawQty,
      };
    });
  }

  // Look up a Xero account's taxType by accountCode for a given tenant.
  // Cached for 5 minutes per (tenant, code). Returns undefined on lookup
  // failure (caller should fall back to legacy behaviour).
  async getAccountTaxType(tenantId: string, code: string): Promise<string | undefined> {
    if (!code || !tenantId) return undefined;
    const key = `${tenantId}:${code}`;
    const cached = this.accountTaxTypeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.taxType;
    try {
      const resp = await this.xero.accountingApi.getAccounts(
        tenantId,
        undefined,
        `Code=="${code}"`,
      );
      const account = resp?.body?.accounts?.[0];
      const taxType = account?.taxType as string | undefined;
      if (taxType) {
        this.accountTaxTypeCache.set(key, {
          taxType,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
      }
      this.logger.log(
        `[RETENTION_TAX_LOOKUP] tenant=${tenantId} code=${code} taxType=${taxType}`,
      );
      return taxType;
    } catch (e) {
      this.logger.log(
        `[RETENTION_TAX_LOOKUP_FAIL] tenant=${tenantId} code=${code} error=${e?.message || e}`,
      );
      return undefined;
    }
  }

  // Returns true when the given Xero taxType carries GST (10% inc/exc),
  // false for BAS-Excluded / Exempt / None / Input-Taxed style accounts.
  // Defaults to true (preserve legacy gross-up behaviour) when unknown.
  isGstApplicableTaxType(taxType: string | undefined): boolean {
    if (!taxType) return true;
    const noGst = new Set([
      'BASEXCLUDED',
      'NONE',
      'EXEMPTOUTPUT',
      'EXEMPTEXPENSES',
      'EXEMPTCAPITAL',
      'INPUTTAXED',
    ]);
    return !noGst.has(taxType.toUpperCase());
  }

  // Resolves the unitAmount + explicit taxType to send on a Xero retention
  // or liability line. PayTrade stores `retention_amount` as ex-GST. We
  // gross up to inc-GST (* 1.1) ONLY when ALL of:
  //   - the invoice's lineAmountTypes is Inclusive (unitAmount is inc-GST), AND
  //   - the destination Xero account has a GST-applicable tax type.
  // For Exclusive invoices the unitAmount must remain ex-GST regardless
  // of the account tax type. For NoTax invoices we send ex-GST and omit
  // taxType. The taxType is set explicitly on Inclusive/Exclusive lines
  // for deterministic Xero behaviour rather than relying on account default.
  async getRetentionLineSpec(
    retentionAmount: number,
    accountCode: string,
    tenantId: string,
    lineAmountTypes: LineAmountTypes,
    fallbackTaxCode: string | undefined,
    recordingMode?: 'ex_gst' | 'inc_gst' | string,
    configuredTaxType?: string | null,
  ): Promise<{ unitAmount: number; taxType: string | undefined }> {
    const amount = Number(retentionAmount) || 0;
    if (lineAmountTypes === LineAmountTypes.NoTax) {
      return { unitAmount: amount, taxType: undefined };
    }
    const accountTaxType = await this.getAccountTaxType(tenantId, accountCode);
    const explicitTaxType =
      configuredTaxType && String(configuredTaxType).trim()
        ? String(configuredTaxType).trim()
        : undefined;
    // inc_gst recording mode: on Inclusive invoices the retention line must
    // carry the gross figure regardless of the destination account's tax
    // type (e.g. BAS-Excluded retention accounts where the user still wants
    // the inc-GST amount on the line). On Exclusive invoices the unitAmount
    // is always ex-GST whatever the recording mode says.
    const isInc = lineAmountTypes === LineAmountTypes.Inclusive;
    const forceGrossUp = isInc && recordingMode === 'inc_gst';
    const grossUp =
      forceGrossUp ||
      (isInc && this.isGstApplicableTaxType(explicitTaxType || accountTaxType));
    return {
      unitAmount: grossUp ? amount * 1.1 : amount,
      taxType: explicitTaxType || accountTaxType || fallbackTaxCode,
    };
  }

  /**
   * Phase 3 helper — picks the retention amount + base-line tax type off
   * the freshly-created/updated Xero invoice, looks up the PT contact, and
   * delegates to XeroManualJournalService to post a gross-up (or reversal,
   * for Retention claims) MJ. No-op when Phase 3 is disabled or retention
   * is zero. Wrap the call in try/catch — sync logs are written by the MJ
   * service.
   */
  async maybePostRetentionGrossUpJournal(
    decoded: any,
    claimDetails: any,
    xeroDetails: XeroIntegrationDetails,
    invoice: any,
    invoice_id: string | null | undefined,
  ): Promise<void> {
    if (!this.xeroManualJournalService.isAutoGrossUpEnabled(xeroDetails)) {
      return;
    }
    const retentionExGst = Number(claimDetails?.retention_amount) || 0;
    if (retentionExGst <= 0) return;

    const baseCode =
      claimDetails?.claim_type === 'Billable'
        ? xeroDetails?.bill_code
        : xeroDetails?.invoice_code;
    const baseLine =
      Array.isArray(invoice?.lineItems) && baseCode
        ? invoice.lineItems.find((li: any) => li?.accountCode === baseCode)
        : null;
    const baseLineTaxType: string | null = baseLine?.taxType || null;

    let contact: ClientSuppliersDetails | null = null;
    if (claimDetails?.client_supplier_id) {
      contact = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: claimDetails.client_supplier_id },
      });
    }

    const kind: 'gross_up' | 'gross_up_reversal' =
      claimDetails?.cash_retention_type === 'Retention claim'
        ? 'gross_up_reversal'
        : 'gross_up';

    await this.xeroManualJournalService.postGrossUpJournal(
      decoded,
      {
        claim: claimDetails,
        xeroDetails,
        contact,
        retentionExGst,
        baseLineTaxType,
        invoice_id: invoice_id || null,
      },
      kind,
      this.xero,
    );
  }

  /**
   * Phase 3 — re-attempt the gross-up Manual Journal post for a claim
   * whose latest attempt failed. Looks up the claim + xero details +
   * cached invoice and calls the helper. Returns a short status string
   * for the FE.
   */
  async retryRetentionGrossUpJournalForClaim(
    decoded: any,
    company_id: number,
    payment_claim_id: number,
  ): Promise<{ status: string; message: string }> {
    if (!payment_claim_id) {
      return { status: 'ERROR', message: 'payment_claim_id required' };
    }
    const claim = await this.paymentClaims.findOne({
      where: { payment_claim_id },
    });
    if (!claim) {
      return { status: 'ERROR', message: 'Claim not found' };
    }
    if (Number(claim.company_id) !== Number(company_id)) {
      return { status: 'ERROR', message: 'Cross-company access denied' };
    }
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' as any },
    });
    if (!xeroDetails) {
      return { status: 'ERROR', message: 'No active Xero integration' };
    }
    if (!this.xeroManualJournalService.isAutoGrossUpEnabled(xeroDetails)) {
      return {
        status: 'ERROR',
        message:
          'Auto gross-up is not enabled (requires simplified retention OFF and ex-GST recording mode).',
      };
    }
    // The cached xero_invoices_bills row gives us the invoice_id; pass null
    // for `invoice` so the helper falls back to the contact GST helper for
    // tax type resolution.
    const cached = await this.xeroInvoicesBills.findOne({
      where: { pt_claim_id: payment_claim_id },
      order: { updated_on: 'DESC' },
    });
    try {
      await this.maybePostRetentionGrossUpJournal(
        decoded,
        claim,
        xeroDetails,
        null,
        cached?.invoice_id || null,
      );
      return { status: 'SUCCESS', message: 'Retry triggered' };
    } catch (err: any) {
      return {
        status: 'ERROR',
        message: err?.message || 'Retry failed',
      };
    }
  }

  async adjustItemsWithRetention(
    invoice,
    items,
    retentionUnitOnly: number,
    retentionTaxOnly: number,
    lineAmountTypes,
  ) {
    // Why two scalars instead of one inc-GST total: when the user has
    // their retention accounts mapped as `BAS Excluded` in Xero (a very
    // common configuration), the retention line(s) carry the full
    // retention as `unitAmount` with `taxAmount = 0`. Tracking the
    // ex-GST and GST portions separately (computed by the caller from
    // each retention line's true unitAmount/taxAmount with respect to
    // the invoice's lineAmountTypes AND the company's
    // `retention_recording_mode`) preserves the source-of-truth split
    // for retention TOTAL while letting the per-line GST be recomputed
    // cleanly from the work line's own rate (see below).
    //
    // NOTE: `retentionUnitOnly` arriving here is ALREADY net (ex-GST).
    // The consumer (webhook.service.ts V-Step ~L3328 and D-Step ~L3730)
    // checks `retention_recording_mode === 'inc_gst'` + Inclusive and
    // strips the gross-up to `unitAmount/1.1` before calling us, so we
    // do NOT re-check the recording mode here — the input is already
    // the correct net retention unit per supplier setup.
    const totalOriginal = (invoice?.subTotal ?? 0) + (invoice?.totalTax ?? 0);

    return items.map((item) => {
      // `qty` is needed by both the retention allocation and the GST-rate
      // derivation below; hoist it to the top so both blocks share one
      // safe-coerced value (Number(undefined) → NaN, hence the ?? 1).
      const qty = Number(item.quantity ?? 1) || 1;

      const unitAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount - item.taxAmount
          : item.unitAmount;

      const lineAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount * item.quantity
          : item.unitAmount * item.quantity + (item.taxAmount || 0);

      // Protect against division by zero to prevent Infinity/NaN values
      const itemRatio = totalOriginal !== 0 ? lineAmount / totalOriginal : 0;

      // `retentionUnitOnly`/`retentionTaxOnly` are TOTAL retention amounts
      // (line-level), so `unitRetention`/`taxRetention` here are also the
      // line's share of retention. To merge into the per-unit `unitAmount`
      // we must convert the line share back to per-unit by dividing by
      // quantity — otherwise for qty≠1 the merged unit gets retention
      // applied qty-times when later multiplied by qty (under-applied for
      // qty<1, over-applied for qty>1).
      const unitRetentionLine = retentionUnitOnly * itemRatio;
      const taxRetentionLine = retentionTaxOnly * itemRatio;
      const unitRetention = unitRetentionLine / qty;
      const taxRetention = taxRetentionLine / qty;

      const newUnitAmount = unitAmount + unitRetention;

      // -----------------------------------------------------------------
      // Per-line GST = (this work line's effective tax rate) × merged unit.
      //
      // Rationale (per user spec, replaces commit 80662b2):
      // 1. Reconstruct the original total claim by adding the net
      //    retention back to the work line — `newUnitAmount` above.
      // 2. Decide if GST is applicable from the WORK LINE's own
      //    taxability — `workLineRate = item.taxAmount / unitAmount`.
      //    If the work line was BAS-Excluded / NoTax in Xero, rate = 0
      //    → merged GST = 0. If it was 10% GST on Income/Expense, the
      //    merged unit gets 10% applied uniformly, giving a clean
      //    consumer-facing GST figure that doesn't depend on how the
      //    supplier mapped their retention account in Xero.
      // 3. We deliberately ignore `retentionTaxOnly` for the per-line
      //    GST: when the retention account is BAS-Excluded the previous
      //    "preserve Xero" formula (`item.taxAmount + taxRetention`)
      //    produced an effective rate < 10% on the merged unit (e.g.
      //    $15,724 × 9.50% = $1,493.78 instead of $1,572.40), which
      //    confuses end users reading the claim drawer. The retention
      //    account being BAS-Excluded in Xero is a Xero-side booking
      //    convention; PT must still display the consumer's view of
      //    the claim with GST on the genuinely-taxable supply.
      //
      // Worked example — claim 100024 (Xero bill with BAS-Excl retention):
      //   work line:   unitAmount=14937.80, taxAmount=1493.78  (rate=0.10)
      //   retention:   unitAmount=-786.20,  taxAmount=0        (BAS-Excl)
      //   retentionUnitOnly=786.20, retentionTaxOnly=0
      //   newUnitAmount  = 14937.80 + 786.20 = 15724.00
      //   workLineRate   = 1493.78 / 14937.80 = 0.10
      //   newTaxAmount   = 15724.00 × 0.10 = 1572.40           ✓ clean 10%
      //   total          = 15724.00 + 1572.40 = 17296.40
      //
      // Worked example — claim 100022 (GST-applicable retention account):
      //   work line:   unitAmount=14937.80, taxAmount=1493.78  (rate=0.10)
      //   retention:   unitAmount=-786.20,  taxAmount=-78.62   (10% GST)
      //   retentionUnitOnly=786.20, retentionTaxOnly=78.62
      //   newUnitAmount  = 15724.00, workLineRate = 0.10
      //   newTaxAmount   = 1572.40                              ✓ same answer
      //
      // Worked example — fully NoTax/BAS-Excl supply:
      //   work line:   unitAmount=10000, taxAmount=0           (rate=0)
      //   newTaxAmount = 0                                      ✓ zero
      // -----------------------------------------------------------------
      const isInvoiceTaxable = [
        LineAmountTypes.Inclusive,
        LineAmountTypes.Exclusive,
      ].includes(lineAmountTypes);
      // Xero's `taxAmount` on a line is the LINE total tax (qty-weighted),
      // and `unitAmount` is per-unit. Dividing taxAmount/unitAmount only
      // yields the true GST rate when qty=1; for fractional/decimal qty
      // (e.g. claim 100044: qty=0.2, unitAmount=10000, taxAmount=200) it
      // produces 0.02 instead of 0.10, which then mis-derives downstream
      // line totals. Use the LINE ex-GST base (unitAmount × qty) as the
      // denominator so any quantity works. (`qty` is hoisted at the top.)
      const lineExGstOriginal = unitAmount * qty;
      const workLineRate =
        isInvoiceTaxable && lineExGstOriginal > 0
          ? (Number(item.taxAmount) || 0) / lineExGstOriginal
          : 0;
      // PT line shape:
      //   unit_price                    = per-unit ex-GST (newUnitAmount)
      //   gst                           = line-total GST  (qty-weighted)
      //   total_amount_including_gst    = line ex-GST × qty + line GST
      // The reconciliation guard in addPaymentClaim re-derives the header
      // as Σ(qty × unit_price) + Σ gst, so we MUST emit gst and
      // total_amount_including_gst as line totals (not per-unit) here.
      const lineExGstMerged = newUnitAmount * qty;
      const newTaxAmount = workLineRate > 0 ? lineExGstMerged * workLineRate : 0;
      const newAmountIncludingGST = lineExGstMerged + newTaxAmount;

      this.logger.log(JSON.stringify({
        newUnitAmount,
        newTaxAmount,
        newAmountIncludingGST,
        unitRetention,
        taxRetention,
        retentionUnitOnly,
        retentionTaxOnly,
        workLineRate,
        lineAmountTypes,
      }));
      return {
        unit_price: parseFloat(newUnitAmount.toFixed(2)),
        gst: parseFloat(newTaxAmount.toFixed(2)),
        total_amount_including_gst: parseFloat(
          newAmountIncludingGST.toFixed(2),
        ),
        description: item.description,
        quantity: item.quantity,
      };
    });
  }

  async updateInvoiceDetails(data: any) {
    const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
      where: {
        pt_claim_id: data.pt_claim_id,
        integration_id: data.integration_id,
      },
    });
    xeroInvoicesBills.tenant_id = data.tenant_id;
    xeroInvoicesBills.integration_id = data.integration_id;
    xeroInvoicesBills.invoice_id = data.invoice_id;
    xeroInvoicesBills.type = data.type;
    xeroInvoicesBills.contact_id = data.contact_id;
    xeroInvoicesBills.status = data.status;
    xeroInvoicesBills.invoice_date = data.invoice_date;
    xeroInvoicesBills.due_date = data.due_date;
    xeroInvoicesBills.reference = data.reference;
    xeroInvoicesBills.sub_total = data.sub_total;
    xeroInvoicesBills.total_tax = data.total_tax;
    xeroInvoicesBills.total_amount = data.total_amount;
    xeroInvoicesBills.line_items = data.line_items;
    xeroInvoicesBills.line_amount_types = data.line_amount_types;
    xeroInvoicesBills.mapped_status = data.mapped_status;
    xeroInvoicesBills.updated_by = data.updated_by;
    xeroInvoicesBills.updated_on = data.updated_on;
    xeroInvoicesBills.updated_group = data.updated_group;
    return await this.xeroInvoicesBills.save(xeroInvoicesBills);
  }

  async updateInvoiceDetailsByInvoiceId(data: any) {
    const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
      where: {
        invoice_id: data.invoice_id,
        integration_id: data.integration_id,
      },
    });
    xeroInvoicesBills.tenant_id = data.tenant_id;
    xeroInvoicesBills.integration_id = data.integration_id;
    xeroInvoicesBills.invoice_id = data.invoice_id;
    xeroInvoicesBills.type = data.type;
    xeroInvoicesBills.contact_id = data.contact_id;
    xeroInvoicesBills.status = data.status;
    xeroInvoicesBills.invoice_date = data.invoice_date;
    xeroInvoicesBills.due_date = data.due_date;
    xeroInvoicesBills.reference = data.reference;
    xeroInvoicesBills.sub_total = data.sub_total;
    xeroInvoicesBills.total_tax = data.total_tax;
    xeroInvoicesBills.total_amount = data.total_amount;
    xeroInvoicesBills.line_items = data.line_items;
    xeroInvoicesBills.line_amount_types = data.line_amount_types;
    xeroInvoicesBills.mapped_status = data.mapped_status;
    xeroInvoicesBills.pt_claim_id = data.pt_claim_id;
    xeroInvoicesBills.updated_by = data.updated_by;
    xeroInvoicesBills.updated_on = data.updated_on;
    xeroInvoicesBills.updated_group = data.updated_group;
    return await this.xeroInvoicesBills.save(xeroInvoicesBills);
  }

  async deleteInvoiceDetails(data: any) {
    const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
      where: {
        pt_claim_id: data.pt_claim_id,
        integration_id: data.integration_id,
      },
    });
    xeroInvoicesBills.status = data.status;
    xeroInvoicesBills.updated_by = data.updated_by;
    xeroInvoicesBills.updated_on = data.updated_on;
    xeroInvoicesBills.updated_group = data.updated_group;
    return await this.xeroInvoicesBills.save(xeroInvoicesBills);
  }

  async editInvoicesOrBills(decoded: any, data: any) {
    try {
      const { payment_claim_id } = data;

      const claimDetails = await this.getClaimsDetails(payment_claim_id);
      if (!claimDetails) {
        throw `Claim details not found`;
      }

      if (!['Draft', 'Confirmed'].includes(claimDetails.status))
        throw `Payment claim status as ${claimDetails.status} cannot be created in Xero`;

      const invoice_date =
        claimDetails.claim_type == 'Billable'
          ? claimDetails.received_date
          : claimDetails.sent_date;
      const invoices = claimDetails.paymentClaimInvoices ?? null;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: claimDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      const invoiceBillDetails = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!invoiceBillDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 58 : 71,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `${claimDetails.claim_type === 'Billable' ? 'Bill' : 'Invoice'} details not mapped.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (claimDetails.status !== 'Draft' && !invoices) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 119 : 132,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `There should be atleast one invoice`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        claimDetails.cash_retention_type === 'Retention claim' &&
        claimDetails.cash_retention
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 113 : 125,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Amount cannot be retained in retention claim`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!claimDetails.client_supplier_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 112 : 124,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Client/supplier is mandatory`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const clientSuppliersDetails = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: claimDetails.client_supplier_id },
      });

      if (!clientSuppliersDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 111 : 123,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Client/Supplier details not found`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const contractDetails = claimDetails.contract_id
        ? await this.contractDetails.findOne({
            where: { contract_id: claimDetails.contract_id },
          })
        : null;

      if (claimDetails.status !== 'Draft' && !contractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 110 : 122,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Contract details not found`,
          xero_records: [],
          paytrade_records: [claimDetails],
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
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editDetailsOfAPaymentClaim',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 109 : 121,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Contract is in ${contractDetails.contract_status.toLowerCase()} state`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            category_type: 'project',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 297 : 299,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Failed',
          },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroDetails.contract_category_id) {
        this.logger.log(`contract_category_id not configured (optional) — proceeding without contract tracking dimension on line items.`);
      }

      let expectedCodeCheck = null;

      const isSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
      if (claimDetails.cash_retention_type === 'Claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_payable_code);
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_receivable_code);
        }
      } else if (claimDetails.cash_retention_type === 'Retention claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_payable_code) ||
            !xeroDetails.retention_payable_release_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_receivable_code) ||
            !xeroDetails.retention_receivable_release_code;
        }
      }

      if (expectedCodeCheck) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 108 : 120,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Failed',
          },
          error_message: `Missing account field type. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let expectedTaxCode = null;

      if (claimDetails.claim_type === 'Billable') {
        expectedTaxCode = xeroDetails.bill_tax_code;
      } else if (claimDetails.claim_type === 'Receivable') {
        expectedTaxCode = xeroDetails.invoice_tax_code;
      }

      if (!expectedTaxCode) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 114 : 126,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Failed',
          },
          error_message: `Missing tax field type. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: claimDetails.client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      // Task #289 — Mirror the create path: surface a distinct
      // "excluded from Xero sync" message for permanently-unmapped rows.
      const excludedByName = !xeroContactDetails
        ? await this.xeroContactDetails
            .createQueryBuilder('c')
            .where('c.integration_id = :iid', {
              iid: xeroDetails.integration_id,
            })
            .andWhere('c.permanently_unmapped = true')
            .andWhere(
              'LOWER(TRIM(c.contact_name)) = LOWER(TRIM(:n))',
              { n: claimDetails?.clientSupplierDetails?.client_supplier_name || '' },
            )
            .getOne()
        : null;
      const isExcluded =
        xeroContactDetails?.permanently_unmapped === true || !!excludedByName;

      if (!xeroContactDetails || isExcluded) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            client_supplier_id: claimDetails.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 115 : 127,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: isExcluded
            ? `Contact excluded from Xero sync (permanently unmapped). Re-enable mapping from Integrations > Xero > Contacts > Permanently unmapped.`
            : `Client/Supplier details not mapped`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let xeroContractDetails = claimDetails.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              pt_contract_id: claimDetails.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      // Self-heal: contracts created before contract-sync was enabled (or
      // whose auto-push failed) have no xero_contract_details mirror row and
      // previously hard-failed here with template 116/128 ("Contract details
      // not mapped"). When the company has opted in to
      // pt_to_xero_contract_auto_create, push the contract to Xero now (the
      // helper is idempotent: it links an existing same-name tracking option
      // or creates a new one, and writes its own sync logs on failure), then
      // re-read the mirror before deciding to fail.
      if (
        claimDetails.status !== 'Draft' &&
        !xeroContractDetails &&
        claimDetails.contract_id &&
        xeroDetails?.pt_to_xero_contract_auto_create === true &&
        this.xeroContractsService
      ) {
        try {
          this.logger.log(
            `Contract ${claimDetails.contract_id} not mapped for claim ${claimDetails.payment_claim_id}; attempting auto-push to Xero before failing the bill/invoice edit.`,
          );
          await this.xeroContractsService.createContractTrackingOptions(
            decoded,
            { contract_id: claimDetails.contract_id, mapped_status: 'System' },
          );
          xeroContractDetails = await this.xeroContractDetails.findOne({
            where: {
              pt_contract_id: claimDetails.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          });
        } catch (autoPushErr) {
          this.logger.error(
            `Contract auto-push during edit failed for contract ${claimDetails.contract_id}: ${autoPushErr?.message ?? autoPushErr}`,
          );
        }
      }

      if (claimDetails.status !== 'Draft' && !xeroContractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            contract_id: claimDetails.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 116 : 128,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
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
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroProjectDetails = claimDetails.project_id
        ? await this.xeroProjectDetails.findOne({
            where: {
              pt_project_id: claimDetails.project_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (claimDetails.status !== 'Draft' && !xeroProjectDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            project_id: claimDetails.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 117 : 129,
          dynamic_values: {},
          project_id: null,
          contract_id: xeroContractDetails?.id,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
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
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      await this.xeroService.refreshTokenSet(
        claimDetails.company_id,
        this.xero,
      );

      const invoiceDetails = await this.xero.accountingApi.getInvoice(
        xeroDetails.tenant_id,
        invoiceBillDetails.invoice_id,
      );
      this.logger.log(`invoiceDetails: ${JSON.stringify(invoiceDetails?.body?.invoices[0])}`);
      if (invoiceDetails.body.invoices[0] !== null) {
        const contractTracking: LineItemTracking =
          xeroDetails?.contract_category_id && xeroContractDetails?.contract_id
            ? {
                trackingCategoryID: xeroDetails.contract_category_id,
                trackingOptionID: xeroContractDetails.contract_id,
              }
            : {};

        const projectTracking: LineItemTracking =
          xeroDetails?.project_category_id && xeroProjectDetails?.project_id
            ? {
                trackingCategoryID: xeroDetails.project_category_id,
                trackingOptionID: xeroProjectDetails.project_id,
              }
            : {};

        const lineItemTrackings = [];
        if (contractTracking?.trackingCategoryID && contractTracking?.trackingOptionID) {
          lineItemTrackings.push(contractTracking);
        }

        if (projectTracking?.trackingCategoryID && projectTracking?.trackingOptionID) {
          lineItemTrackings.push(projectTracking);
        }

        const contact: Contact = {
          contactID: xeroContactDetails.contact_id,
        };

        let claimStatus =
          claimDetails.status === 'Draft'
            ? Invoice.StatusEnum.DRAFT
            : Invoice.StatusEnum.AUTHORISED;

        let invoice: Invoice = {
          type:
            claimDetails.claim_type === 'Billable'
              ? Invoice.TypeEnum.ACCPAY
              : Invoice.TypeEnum.ACCREC,
          contact,
          status: claimStatus, // or 'DRAFT' if you want to save but not approve
          reference:
            claimDetails.cash_retention_type + ' - # ' + payment_claim_id,
          lineAmountTypes: claimDetails.is_gst_optional
            ? invoiceDetails?.body?.invoices[0]?.lineAmountTypes ===
              LineAmountTypes.Exclusive
              ? LineAmountTypes.Exclusive
              : LineAmountTypes.Inclusive
            : LineAmountTypes.NoTax,
          date: moment(invoice_date).toDate(), // today's date
          dueDate: moment(claimDetails.due_date).toDate(), // 14 days later need to check
        };
        // Capture the resolved lineAmountTypes so retention/liability line
        // specs honour Exclusive vs Inclusive vs NoTax correctly. For
        // Exclusive we keep retention amounts ex-GST (no *1.1).
        const resolvedLineAmountTypes: LineAmountTypes = invoice.lineAmountTypes as LineAmountTypes;
        // Pick the per-line price source based on the actual Xero
        // lineAmountTypes (not is_gst_optional). Inclusive lines must be
        // sent inc-GST; Exclusive/NoTax lines must be sent ex-GST.
        // This matters in the update path because an existing Xero
        // invoice may carry lineAmountTypes=Exclusive while the PT claim
        // has is_gst_optional=true.
        const isInclusiveLine = resolvedLineAmountTypes === LineAmountTypes.Inclusive;

        if (invoices && invoices.length > 0 && invoices[0] !== null) {
          let lineItems = [];
          const totalLineAmount = invoices?.reduce((sum, item) => {
            return (
              sum +
              (isInclusiveLine
                ? item?.total_amount_including_gst === null
                  ? 0.0
                  : Math.abs(Number(item?.total_amount_including_gst))
                : item?.unit_price === null
                  ? 0.0
                  : Math.abs(Number(item?.unit_price)))
            );
          }, 0.0);
          const useSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
          const fallbackTaxCode =
            claimDetails.claim_type === 'Billable'
              ? xeroDetails.bill_tax_code
              : xeroDetails.invoice_tax_code;
          // Task #41 — variable bill code per supplier (edit path).
          const resolvedBillCodeOutcomeEdit = await this.resolveOutboundBillCode(
            decoded,
            xeroDetails,
            clientSuppliersDetails,
            claimDetails,
            data?.sync_id || null,
          );
          if (resolvedBillCodeOutcomeEdit.source === 'unresolved') {
            return false;
          }
          const resolvedBaseAccountCodeEdit =
            resolvedBillCodeOutcomeEdit.accountCode ||
            (claimDetails.claim_type === 'Billable'
              ? xeroDetails.bill_code
              : xeroDetails.invoice_code);
          for (const element of invoices) {
            // See createInvoiceOrBillInXero for explanation: retention_amount
            // is ex-GST and the share to deduct from each bill_code line is
            // the ex-GST value pro-rated by line amount — never grossed up.
            const retentionShare = (!useSimplifiedRetention && claimDetails.retention_amount && totalLineAmount !== 0)
              ? (Number(claimDetails.retention_amount) *
                  (isInclusiveLine
                    ? Number(element.total_amount_including_gst)
                    : Number(element.unit_price))) /
                totalLineAmount
              : 0;
            let lineItem: LineItem = {
              description: element.description,
              quantity: element.quantity,
              unitAmount:
                (isInclusiveLine
                  ? Number(element.total_amount_including_gst)
                  : Number(element.unit_price)) - retentionShare,
              accountCode:
                claimDetails.cash_retention_type === 'Claim'
                  ? resolvedBaseAccountCodeEdit
                  : claimDetails.claim_type === 'Billable'
                    ? xeroDetails.retention_payable_release_code
                    : xeroDetails.retention_receivable_release_code,
              tracking: lineItemTrackings,
            };
            if (claimDetails.is_gst_optional) {
              lineItem = {
                ...lineItem,
                taxType:
                  claimDetails.claim_type === 'Billable'
                    ? xeroDetails.bill_tax_code
                    : xeroDetails.invoice_tax_code,
                // taxAmount: element.gst,
              };
            }
            lineItems.push(lineItem);
          }
          if (
            claimDetails.cash_retention &&
            claimDetails.cash_retention_type === 'Claim'
          ) {
            if (useSimplifiedRetention) {
              const retentionHeldCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code;
              const heldSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                retentionHeldCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const retentionLine: LineItem = {
                description: 'Retention Held',
                quantity: 1,
                unitAmount: -heldSpec.unitAmount,
                accountCode: retentionHeldCode,
                tracking: lineItemTrackings,
                ...(heldSpec.taxType ? { taxType: heldSpec.taxType } : {}),
              };
              lineItems.push(retentionLine);
            } else {
              const retentionHeldCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code;
              const liabilityCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.liability_payable_code
                  : xeroDetails.liability_receivable_code;
              const heldSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                retentionHeldCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const liabSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                liabilityCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const lineItem1: LineItem = {
                description: 'Retention Held',
                quantity: 1,
                unitAmount: heldSpec.unitAmount,
                accountCode: retentionHeldCode,
                tracking: lineItemTrackings,
                ...(heldSpec.taxType ? { taxType: heldSpec.taxType } : {}),
              };
              const lineItem2: LineItem = {
                description: 'Liability for defects',
                quantity: 1,
                unitAmount: -liabSpec.unitAmount,
                accountCode: liabilityCode,
                tracking: lineItemTrackings,
                ...(liabSpec.taxType ? { taxType: liabSpec.taxType } : {}),
              };
              lineItems.push(lineItem1);
              lineItems.push(lineItem2);
            }
          } else if (claimDetails.cash_retention_type === 'Retention claim') {
            claimDetails.retention_amount = invoices?.reduce((sum, item) => {
              return (
                sum +
                (item?.total_amount_including_gst === null
                  ? 0.0
                  : Math.abs(Number(item?.total_amount_including_gst)))
              );
            }, 0.0);
            if (useSimplifiedRetention) {
              const retentionReleaseCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code;
              const releaseSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                retentionReleaseCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const retentionReleaseLine: LineItem = {
                description: 'Retention Release',
                quantity: 1,
                unitAmount: -releaseSpec.unitAmount,
                accountCode: retentionReleaseCode,
                tracking: lineItemTrackings,
                ...(releaseSpec.taxType ? { taxType: releaseSpec.taxType } : {}),
              };
              lineItems.push(retentionReleaseLine);
            } else {
              const liabilityCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.liability_payable_code
                  : xeroDetails.liability_receivable_code;
              const retentionReleaseCode =
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code;
              const liabSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                liabilityCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const releaseSpec = await this.getRetentionLineSpec(
                Number(claimDetails.retention_amount),
                retentionReleaseCode,
                xeroDetails.tenant_id,
                resolvedLineAmountTypes,
                fallbackTaxCode,
                xeroDetails.retention_recording_mode,
                xeroDetails.retention_tax_type,
              );
              const lineItem1: LineItem = {
                description: 'Liability for defects',
                quantity: 1,
                unitAmount: liabSpec.unitAmount,
                accountCode: liabilityCode,
                tracking: lineItemTrackings,
                ...(liabSpec.taxType ? { taxType: liabSpec.taxType } : {}),
              };
              const lineItem2: LineItem = {
                description: 'Retention Release',
                quantity: 1,
                unitAmount: -releaseSpec.unitAmount,
                accountCode: retentionReleaseCode,
                tracking: lineItemTrackings,
                ...(releaseSpec.taxType ? { taxType: releaseSpec.taxType } : {}),
              };

              lineItems.push(lineItem1);
              lineItems.push(lineItem2);
            }
          }

          invoice = { ...invoice, lineItems };
        }

        try {
          const updateInvoiceResponse =
            await this.xero.accountingApi.updateInvoice(
              xeroDetails.tenant_id,
              invoiceBillDetails.invoice_id,
              {
                invoices: [invoice],
              },
            );

          this.logger.log(
            `Invoice/Bill edited: ${JSON.stringify(updateInvoiceResponse.response?.data)}`,
          );
          if (updateInvoiceResponse.response.status === 200) {
            const invoice = updateInvoiceResponse.response.data.Invoices[0];
            let contractTrackingId = null;
            let projectTrackingId = null;

            invoice?.LineItems[0]?.Tracking?.forEach((item) => {
              if (
                item?.TrackingCategoryID === xeroDetails.contract_category_id
              ) {
                contractTrackingId = item?.TrackingOptionID;
              } else if (
                item?.TrackingCategoryID === xeroDetails.project_category_id
              ) {
                projectTrackingId = item?.TrackingOptionID;
              }
            });

            const requestData: any = {
              invoice_id: invoice.InvoiceID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              type: invoice.Type,
              contact_id: xeroContactDetails?.id,
              project_id: xeroProjectDetails?.id,
              contract_id: xeroContractDetails?.id,
              status: invoice.Status,
              invoice_date: invoice.DateString,
              due_date: invoice.DueDateString,
              reference: invoice.InvoiceNumber || invoice.Reference,
              sub_total: invoice.SubTotal,
              total_tax: invoice.TotalTax,
              total_amount: invoice.Total,
              line_items: invoice.LineItems?.filter(
                (item) =>
                  item.accountCode !== undefined && item.accountCode !== null,
              )?.map((item) => ({
                line_item_id: item.LineItemID,
                description: item.Description,
                quantity: item.Quantity,
                unit_amount: item.UnitAmount,
                account_code: item.AccountCode,
                account_id: item.AccountID,
                tax_type: item.TaxType,
                tax_amount: item.TaxAmount,
                line_amount: item.LineAmount,
                contract_id: contractTrackingId,
                project_id: projectTrackingId,
              })),
              line_amount_types: invoice.LineAmountTypes,
              pt_claim_id: claimDetails.payment_claim_id,
              updated_by: decoded?.userId,
              updated_on: moment().tz('UTC'),
              updated_group: 'USER',
            };

            const xeroResponse: any =
              await this.updateInvoiceDetails(requestData);
            if (xeroResponse) {
              // Phase 3 — void any existing gross-up MJ for this claim and
              // re-post against the updated retention amount. Best-effort:
              // never blocks the edit response.
              try {
                await this.xeroManualJournalService.voidAllForClaim(
                  decoded,
                  xeroDetails.integration_id,
                  claimDetails.payment_claim_id,
                  this.xero,
                  claimDetails.company_id,
                  'Claim edited — recreating gross-up MJ',
                );
                await this.maybePostRetentionGrossUpJournal(
                  decoded,
                  claimDetails,
                  xeroDetails,
                  invoice,
                  invoiceBillDetails?.invoice_id,
                );
              } catch (mjErr) {
                this.logger.error(
                  `[MJ_OUTBOUND_EDIT] gross-up recreate failed for claim ${claimDetails?.payment_claim_id}: ${mjErr?.message || mjErr}`,
                );
              }

              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  claimDetails.claim_type == 'Billable' ? 53 : 66,
                dynamic_values: { id: xeroResponse?.id },
                project_id: xeroProjectDetails.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: claimDetails?.id,
                },
                reference_id: claimDetails?.id,
                history: [
                  `API triggered from claim ${claimDetails?.payment_claim_id}`,
                  'Export successful',
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
              xeroResponse.claim_type = claimDetails.claim_type;
              return xeroResponse;
            }
          } else {
            const errMsg = await handleAxiosError(updateInvoiceResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'editDetailsOfAPaymentClaim',
                api_payload: {
                  payment_claim_id: data.payment_claim_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  claimDetails.claim_type == 'Billable' ? 306 : 307,
                dynamic_values: {},
                project_id: xeroProjectDetails.id,
                contract_id: xeroContractDetails?.id,
                reference: {
                  xeroId: invoiceBillDetails?.id,
                  paytradeId: claimDetails?.id,
                },
                reference_id: claimDetails?.id,
                history: [
                  `API triggered from claim ${claimDetails?.payment_claim_id}`,
                  'Export failed',
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
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [claimDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

            return false;
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'editDetailsOfAPaymentClaim',
              api_payload: {
                payment_claim_id: data.payment_claim_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: claimDetails.claim_type == 'Billable' ? 56 : 69,
              dynamic_values: {},
              project_id: xeroProjectDetails.id,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: null,
                paytradeId: claimDetails?.id,
              },
              reference_id: claimDetails?.id,
              history: [
                `API triggered from claim ${claimDetails?.payment_claim_id}`,
                'Export failed',
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
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [claimDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } else {
        const errMsg = await handleAxiosError(invoiceDetails);
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: data?.sync_id,
            api_name: 'editDetailsOfAPaymentClaim',
            api_payload: {
              payment_claim_id: data.payment_claim_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: claimDetails.claim_type == 'Billable' ? 304 : 305,
            dynamic_values: {},
            project_id: xeroProjectDetails.id,
            contract_id: xeroContractDetails?.id,
            reference: {
              xeroId: null,
              paytradeId: claimDetails?.id,
            },
            reference_id: claimDetails?.id,
            history: [
              `API triggered from claim ${claimDetails?.payment_claim_id}`,
              'Export failed',
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
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [claimDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          },
        );

        return false;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async deleteInvoicesOrBills(decoded: any, data: any) {
    try {
      const claimDetails = await this.getClaimsDetails(data.payment_claim_id);
      if (!claimDetails) {
        throw `Claim details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: claimDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      const invoiceBillDetails = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: data.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!invoiceBillDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 59 : 72,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: claimDetails?.id,
          },
          reference_id: claimDetails?.id,
          history: [
            `API triggered from claim ${claimDetails?.payment_claim_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `${claimDetails.claim_type === 'Billable' ? 'Bill' : 'Invoice'} details not mapped.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      await this.xeroService.refreshTokenSet(
        claimDetails.company_id,
        this.xero,
      );

      const invoiceDetails = await this.xero.accountingApi.getInvoice(
        xeroDetails.tenant_id,
        invoiceBillDetails.invoice_id,
      );
      this.logger.log(`invoiceDetails: ${JSON.stringify(invoiceDetails)}`);
      if (invoiceDetails.body.invoices[0] !== null) {
        try {
          const deleteInvoiceResponse =
            await this.xero.accountingApi.updateInvoice(
              xeroDetails.tenant_id,
              invoiceBillDetails.invoice_id,
              {
                invoices: [
                  {
                    status: Invoice.StatusEnum.VOIDED,
                  },
                ],
              },
            );

          this.logger.log(
            `Invoice/bill deleted successfully: ${deleteInvoiceResponse.response.status}`,
          );
          if (deleteInvoiceResponse.response.status === 200) {
            const invoice = deleteInvoiceResponse.response.data.Invoices[0];
            invoiceBillDetails.status = invoice.Status;
            invoiceBillDetails.updated_by = decoded?.userId;
            invoiceBillDetails.updated_on = moment.tz('UTC');
            invoiceBillDetails.updated_group = 'USER';
            const xeroResponse =
              await this.xeroInvoicesBills.save(invoiceBillDetails);
            if (xeroResponse) {
              // Phase 3 — void any gross-up MJ for the deleted claim.
              try {
                await this.xeroManualJournalService.voidAllForClaim(
                  decoded,
                  xeroDetails.integration_id,
                  claimDetails.payment_claim_id,
                  this.xero,
                  claimDetails.company_id,
                  'Claim deleted/voided in Xero',
                );
              } catch (mjErr) {
                this.logger.error(
                  `[MJ_OUTBOUND_DELETE] gross-up void failed for claim ${claimDetails?.payment_claim_id}: ${mjErr?.message || mjErr}`,
                );
              }
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  integration_id: xeroDetails.integration_id,
                  log_template_id:
                    claimDetails?.claim_type === 'Billable' ? 54 : 67,
                  dynamic_values: { id: xeroResponse?.id },
                  project_id: invoiceBillDetails.project_id,
                  contract_id: invoiceBillDetails.contract_id,
                  reference: {
                    xeroId: invoiceBillDetails?.id,
                    paytradeId: claimDetails?.id,
                  },
                  history: [
                    `API triggered from claim ${claimDetails?.payment_claim_id}`,
                    'Export successful',
                  ],
                  important_checks: { 'Import data format validation': 'Ok' },
                  error_message: null,
                  xero_records: [invoiceDetails.body.invoices[0]],
                  paytrade_records: [claimDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(deleteInvoiceResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteInvoiceOrBillInXero',
                api_payload: {
                  payment_claim_id: data.payment_claim_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  claimDetails.claim_type === 'Billable' ? 308 : 309,
                dynamic_values: {},
                project_id: invoiceBillDetails.project_id,
                contract_id: invoiceBillDetails.contract_id,
                reference: {
                  xeroId: invoiceBillDetails?.id,
                  paytradeId: claimDetails?.id,
                },
                reference_id: claimDetails?.id,
                history: [
                  `API triggered from claim ${claimDetails?.payment_claim_id}`,
                  'Export failed',
                ],
                important_checks: { 'Import data format validation': 'Ok' },
                error_message: errMsg,
                xero_records: [invoiceDetails.body.invoices[0]],
                paytrade_records: [claimDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'deleteInvoiceOrBillInXero',
              api_payload: {
                payment_claim_id: data.payment_claim_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: claimDetails.claim_type === 'Billable' ? 57 : 70,
              dynamic_values: {},
              project_id: invoiceBillDetails.project_id,
              contract_id: invoiceBillDetails.contract_id,
              reference: {
                xeroId: invoiceBillDetails?.id,
                paytradeId: claimDetails?.id,
              },
              reference_id: claimDetails?.id,
              history: [
                `API triggered from claim ${claimDetails?.payment_claim_id}`,
                'Export failed',
              ],
              important_checks: { 'Import data format validation': 'Ok' },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [claimDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
        }
      } else {
        const errMsg = await handleAxiosError(invoiceDetails);
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: data?.sync_id,
            api_name: 'deleteInvoiceOrBillInXero',
            api_payload: {
              payment_claim_id: data.payment_claim_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: claimDetails.claim_type === 'Billable' ? 310 : 311,
            dynamic_values: {},
            project_id: invoiceBillDetails.project_id,
            contract_id: invoiceBillDetails.contract_id,
            reference: {
              xeroId: invoiceBillDetails?.id,
              paytradeId: claimDetails?.id,
            },
            reference_id: claimDetails?.id,
            history: [
              `API triggered from claim ${claimDetails?.payment_claim_id}`,
              'Export failed',
            ],
            important_checks: { 'Import data format validation': 'Ok' },
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [claimDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          },
        );
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  /**
   * Build the Xero deep-link URL for an invoice/bill based on its ACCREC/ACCPAY
   * type. Returns null if the type is unknown.
   */
  buildXeroDeepLink(invoiceId: string, type: string): string | null {
    if (!invoiceId) return null;
    const t: any = type;
    if (t === Invoice.TypeEnum.ACCREC || t === 'ACCREC') {
      return `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoiceId}`;
    }
    if (t === Invoice.TypeEnum.ACCPAY || t === 'ACCPAY') {
      return `https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${invoiceId}`;
    }
    return null;
  }

  /**
   * Fetch the PDF rendering of a Xero invoice/bill via getInvoiceAsPdf and
   * cache it in object storage under `xero_pdfs/<invoice_id>.pdf`. Updates
   * the matching xero_invoices_bills row with cached_pdf_object_key,
   * last_fetched_at, deep_link_url, current_xero_status and clears is_stale.
   * Safe to call repeatedly — failures are swallowed and logged.
   */
  async fetchAndCacheXeroPdf(params: {
    company_id: number;
    invoice_id: string;
    integration_id?: number;
    type?: string;
    status?: string;
    skipTokenRefresh?: boolean;
  }): Promise<boolean> {
    const { company_id, invoice_id } = params;
    if (!company_id || !invoice_id) return false;
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) {
        this.logger.warn(`[XERO_PDF] No active Xero integration for company ${company_id}`);
        return false;
      }
      if (!params.skipTokenRefresh) {
        try {
          await this.xeroService.refreshTokenSet(company_id, this.xero);
        } catch (refreshErr: any) {
          this.logger.error(`[XERO_PDF] Token refresh failed for company ${company_id}: ${refreshErr?.message || refreshErr}`);
          return false;
        }
      }
      const pdfResp: any = await this.xero.accountingApi.getInvoiceAsPdf(
        xeroDetails.tenant_id,
        invoice_id,
      );
      const body = pdfResp?.body;
      let buffer: Buffer | null = null;
      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else if (body && typeof body === 'object' && typeof (body as any).pipe === 'function') {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          (body as any).on('data', (c: Buffer) => chunks.push(c));
          (body as any).on('end', () => resolve());
          (body as any).on('error', (e: any) => reject(e));
        });
        buffer = Buffer.concat(chunks);
      } else if (body) {
        try {
          buffer = Buffer.from(body as any);
        } catch (e) {
          buffer = null;
        }
      }
      if (!buffer || buffer.length === 0) {
        this.logger.warn(`[XERO_PDF] Empty PDF body for invoice ${invoice_id}`);
        return false;
      }
      const objectKey = `xero_pdfs/${invoice_id}.pdf`;
      const ok = await this.objectStorageService.uploadFileDirect(
        objectKey,
        buffer,
        'application/pdf',
      );
      if (!ok) {
        this.logger.error(`[XERO_PDF] Failed to upload PDF to storage: ${objectKey}`);
        return false;
      }
      const integrationId = params.integration_id ?? xeroDetails.integration_id;
      const existing = await this.xeroInvoicesBills.findOne({
        where: { invoice_id, integration_id: integrationId },
      });
      if (existing) {
        existing.cached_pdf_object_key = objectKey;
        existing.last_fetched_at = new Date();
        existing.deep_link_url = this.buildXeroDeepLink(invoice_id, params.type ?? existing.type);
        if (params.status) existing.current_xero_status = params.status;
        existing.is_stale = false;
        await this.xeroInvoicesBills.save(existing);
      }
      this.logger.log(`[XERO_PDF] Cached PDF for invoice ${invoice_id} (${buffer.length} bytes)`);
      return true;
    } catch (err: any) {
      this.logger.error(`[XERO_PDF] Failed to fetch/cache PDF for ${invoice_id}: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Mark a Xero invoice as stale (used when DELETE/VOID arrives — we keep
   * the cached PDF so the audit trail remains intact but flag it for the UI).
   */
  async markXeroInvoiceVoided(params: {
    invoice_id: string;
    integration_id: number;
    status: string;
  }): Promise<void> {
    try {
      const existing = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: params.invoice_id,
          integration_id: params.integration_id,
        },
      });
      if (!existing) return;
      existing.current_xero_status = params.status;
      existing.is_stale = true;
      existing.void_date = new Date();
      await this.xeroInvoicesBills.save(existing);
    } catch (err: any) {
      this.logger.error(`[XERO_PDF] Failed to mark invoice voided ${params.invoice_id}: ${err?.message || err}`);
    }
  }

  /**
   * Lookup the cached Xero invoice/bill row for a Paytrade payment claim and
   * return UI-friendly metadata (no buffer). Used by the claim drawer's
   * "Xero Integration" expander.
   */
  async getXeroInvoiceForClaim(payment_claim_id: number, company_id?: number) {
    if (!payment_claim_id) return null;
    const claim = await this.paymentClaims.findOne({
      where: { payment_claim_id },
    });
    if (!claim) return null;
    if (company_id != null && Number(claim.company_id) !== Number(company_id)) {
      this.logger.warn(
        `[XERO_PDF] Company mismatch: claim ${payment_claim_id} belongs to ${claim.company_id}, requester ${company_id}`,
      );
      return null;
    }
    const row = await this.xeroInvoicesBills.findOne({
      where: { pt_claim_id: claim.payment_claim_id },
      order: { updated_on: 'DESC' },
    });
    if (!row) return null;
    return {
      invoice_id: row.invoice_id,
      invoice_number: row.reference || null,
      type: row.type,
      mapped_status: row.mapped_status || null,
      current_xero_status: row.current_xero_status || row.status,
      deep_link_url: row.deep_link_url || this.buildXeroDeepLink(row.invoice_id, row.type),
      has_cached_pdf: !!row.cached_pdf_object_key,
      last_fetched_at: row.last_fetched_at,
      is_stale: !!row.is_stale,
      void_date: row.void_date,
    };
  }

  /**
   * Task #82 — Returns Xero sync log entries scoped to a single claim and
   * its payments. Filters sync_type IN (Invoices, Bills, Payments) and
   * matches log.reference_id against the claim uuid + every payment uuid
   * under the claim. Newest first, capped at 50 rows. Description is
   * placeholder-resolved + HTML-stripped (truncation handled client-side).
   */
  async getXeroSyncLogsForClaim(payment_claim_id: number, company_id?: number) {
    if (!payment_claim_id) return [];
    const claim = await this.paymentClaims.findOne({
      where: { payment_claim_id },
    });
    if (!claim) return [];
    if (company_id != null && Number(claim.company_id) !== Number(company_id)) {
      this.logger.warn(
        `[CLAIM_SYNC_LOGS] Company mismatch: claim ${payment_claim_id} belongs to ${claim.company_id}, requester ${company_id}`,
      );
      return [];
    }
    const paymentRows: { id: string; payment_id: string | number }[] =
      await this.dataSource.query(
        `SELECT id, payment_id FROM payment_details WHERE payment_claim_id = $1`,
        [claim.payment_claim_id],
      );
    const xibRows: { id: string }[] = await this.dataSource.query(
      `SELECT id FROM xero_invoices_bills WHERE pt_claim_id = $1`,
      [claim.payment_claim_id],
    );
    // Task #91 — widen the reference set so the initial claim → Xero
    // invoice/bill creation row appears regardless of whether the producer
    // wrote the claim uuid, the bigint payment_claim_id (cast to text), a
    // payment_details uuid, a payment_details.payment_id bigint, or the
    // xero_invoices_bills.id uuid.
    const refIds = [
      claim.id,
      String(claim.payment_claim_id),
      ...paymentRows.map((p) => p.id),
      ...paymentRows
        .map((p) => (p.payment_id != null ? String(p.payment_id) : null))
        .filter((v): v is string => !!v),
      ...xibRows.map((x) => x.id),
    ].filter(Boolean);
    if (refIds.length === 0) return [];
    const rows: any[] = await this.dataSource.query(
      `SELECT l.id::text         AS id,
              l.sync_id          AS sync_id,
              t.sync_type        AS sync_type,
              t.sync_status::text AS sync_status,
              t.description      AS description,
              t.process::text    AS process,
              l.reference_id     AS reference,
              l.dynamic_values   AS dynamic_values,
              l.created_on       AS created_on
         FROM xero_sync_logs l
         INNER JOIN xero_log_templates t ON l.log_template_id = t.id
        WHERE l.reference_id::text = ANY($1::text[])
          AND t.sync_type IN ('Invoices', 'Bills', 'Payments')
        ORDER BY l.created_on DESC
        LIMIT 50`,
      [refIds],
    );
    return rows.map((r) => {
      let desc: string = r.description || '';
      if (r.dynamic_values && typeof r.dynamic_values === 'object') {
        for (const [k, v] of Object.entries(r.dynamic_values)) {
          desc = desc.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
      }
      desc = desc.replace(/<[^>]*>/g, '').trim();
      return {
        id: r.id,
        sync_id: r.sync_id,
        sync_type: r.sync_type,
        sync_status: r.sync_status,
        description: desc,
        process: r.process,
        reference: r.reference || null,
        created_on: r.created_on
          ? new Date(r.created_on).toISOString()
          : null,
      };
    });
  }

  /**
   * Download a cached Xero PDF for a payment claim. Used by REST endpoint.
   * Returns { buffer, fileName } or null if not available. If the PDF is
   * missing from storage but the row exists, attempts a live re-fetch.
   */
  async getCachedXeroPdfForClaim(
    payment_claim_id: number,
    company_id: number,
  ): Promise<{ buffer: Buffer; fileName: string } | null> {
    const claim = await this.paymentClaims.findOne({
      where: { payment_claim_id },
    });
    if (!claim) return null;
    if (Number(claim.company_id) !== Number(company_id)) {
      this.logger.warn(
        `[XERO_PDF] Company mismatch on download: claim ${payment_claim_id} belongs to ${claim.company_id}, requester ${company_id}`,
      );
      return null;
    }
    const row = await this.xeroInvoicesBills.findOne({
      where: { pt_claim_id: claim.payment_claim_id },
      order: { updated_on: 'DESC' },
    });
    if (!row) return null;
    let objectKey = row.cached_pdf_object_key;
    if (!objectKey) {
      const ok = await this.fetchAndCacheXeroPdf({
        company_id,
        invoice_id: row.invoice_id,
        integration_id: row.integration_id,
        type: row.type,
        status: row.status,
      });
      if (!ok) return null;
      const refreshed = await this.xeroInvoicesBills.findOne({
        where: { id: row.id },
      });
      objectKey = refreshed?.cached_pdf_object_key;
      if (!objectKey) return null;
    }
    const buffer = await this.objectStorageService.downloadFile(objectKey);
    if (!buffer) return null;
    const baseName = row.reference || row.invoice_id;
    const safeName = String(baseName).replace(/[^a-zA-Z0-9._-]+/g, '_');
    return { buffer, fileName: `Xero-${safeName}.pdf` };
  }

  async getInvoiceByInvoiceId(invoice_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const invoiceDetails = await this.xero.accountingApi.getInvoice(
        xeroDetails.tenant_id,
        invoice_id,
      );
      this.logger.log(`invoiceDetails: ${JSON.stringify(invoiceDetails?.body?.invoices[0])}`);
      if (invoiceDetails.body.invoices[0]) {
        return invoiceDetails.body.invoices[0];
      }
      throw invoiceDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getXeroContact(contact_id: string, integration_id: number) {
    return await this.xeroContactDetails.findOne({
      where: { contact_id, integration_id },
    });
  }

  async syncAllInvoicesOrBillsByCompanyId(
    decoded: any,
    company_id: number,
    type: 'bill' | 'invoice',
    sync_id?: string,
  ) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      await this.xeroService.refreshTokenSet(company_id, this.xero);

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'syncAllInvoicesOrBillsByCompanyId',
          api_payload: { company_id, category_type: 'project', type },
          integration_id: xeroDetails.integration_id,
          log_template_id: type === 'bill' ? 165 : 326,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from application`, 'Import failed'],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw `Missing project tracking category ID. Please configure the mapping in Settings to continue.`;
      }

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'syncAllInvoicesOrBillsByCompanyId',
          api_payload: { company_id, category_type: 'contract', type },
          integration_id: xeroDetails.integration_id,
          log_template_id: type === 'bill' ? 166 : 327,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [`API triggered from application`, 'Import failed'],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`;
      }

      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = `Type=="${type === 'bill' ? 'ACCPAY' : 'ACCREC'}"`; //'Status=="DRAFT"';

      const order = 'InvoiceID ASC';
      const iDs = [];
      const invoiceNumbers = [];
      const contactIDs = [];
      const statuses = null; //['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID'];
      const page = 1;
      const includeArchived = true;
      const summaryOnly = false;
      const pageSize = 500;

      const newInvoices = [];
      const existingInvoices = [];
      const skipInvoicesAddition = [];

      let oldData = [],
        newData = [];

      const response = await this.xero.accountingApi.getInvoices(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
        iDs,
        invoiceNumbers,
        contactIDs,
        statuses,
        page,
        includeArchived,
        null,
        null,
        summaryOnly,
        pageSize,
      );

      // console.log('response.body: ', response?.body?.invoices);
      const invoices = response.body.invoices || [];

      if (invoices && invoices[0] !== null && invoices.length !== 0) {
        // Fetch all claim IDs from DB in a single query
        const invoiceIdsInDb = await this.xeroInvoicesBills.find({
          where: {
            invoice_id: In(invoices.map((a) => a.invoiceID)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['invoice_id'],
        });
        const existingInvoiceIds = new Set(
          invoiceIdsInDb.map((a) => a.invoice_id),
        );
        const existingInvoiceIdsSet = new Set(existingInvoiceIds);
        // Separate new and existing invoices
        for (const invoice of invoices) {
          const contactId =
            (
              await this.getXeroContact(
                invoice.contact.contactID,
                xeroDetails.integration_id,
              )
            )?.id || null;
          if (contactId) {
            const invoiceData: any = {
              invoice_id: invoice.invoiceID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              type: invoice.type,
              contact_id: contactId,
              status: invoice.status,
              invoice_date: invoice.date,
              due_date: invoice.dueDate || null,
              reference: invoice.invoiceNumber || invoice.reference,
              sub_total: invoice.subTotal,
              total_tax: invoice.totalTax,
              total_amount: invoice.total,
              line_items:
                invoice.lineItems?.map((item) => ({
                  line_item_id: item.lineItemID,
                  description: item.description,
                  quantity: item.quantity,
                  unit_amount: item.unitAmount,
                  account_code: item.accountCode,
                  account_id: item.accountID,
                  tax_type: item.taxType,
                  tax_amount: item.taxAmount,
                  line_amount: item.lineAmount,
                })) || null,
              line_amount_types: invoice.lineAmountTypes,
              created_on: invoice.updatedDateUTC,
            };
            if (existingInvoiceIdsSet.has(String(invoice.invoiceID))) {
              if (
                !existingInvoices.some(
                  (c) => c.invoice_id === String(invoice.invoiceID),
                )
              ) {
                existingInvoices.push(invoiceData);
                oldData.push(invoiceData);
              }
            } else {
              newInvoices.push(invoiceData);
              newData.push(invoiceData);
            }
          } else {
            skipInvoicesAddition.push(invoice);
          }
        }
      }

      // Batch insert new invoices
      if (newInvoices.length > 0) {
        const xeroInvoicesBills =
          await this.xeroInvoicesBills.create(newInvoices);
        await this.xeroInvoicesBills.save(xeroInvoicesBills);
        this.logger.log(`Inserted ${xeroInvoicesBills.length} new invoices.`);
      }

      // Batch update existing invoices
      if (existingInvoices.length > 0) {
        for (const invoice of existingInvoices) {
          await this.xeroInvoicesBills.update(
            {
              invoice_id: invoice.invoice_id,
              integration_id: xeroDetails.integration_id,
            },
            invoice,
          );
        }
        this.logger.log(`Updated ${existingInvoices.length} existing invoices.`);
      }

      this.logger.log(
        `newInvoices ${newInvoices} existingInvoices ${existingInvoices}`,
      );

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: type === 'bill' ? 49 : 62,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {},
          reference_id: null,
          history: [
            `API triggered from application`,
            'Import successful',
            'No auto matching was done',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: null,
          xero_records: [],
          paytrade_records: [],
          new_records: newData,
          updated_records: oldData,
          synced_records: [],
        },
      );

      this.logger.log('All invoices fetched, inserted, and updated successfully.');

      if (newInvoices || existingInvoices) {
        return 'Data synced successfully';
      } else {
        return 'No data available to sync';
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getXeroInvoiceBillListsForCompany(data: GetXeroInvoicesListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const skip = (data.page_number - 1) * data.page_size;
      const queryBuilder = await this.xeroInvoicesBills
        .createQueryBuilder('invoice')
        .select('invoice.id', 'id')
        .addSelect('invoice.invoice_id', 'invoice_id')
        .addSelect('invoice.tenant_id', 'tenant_id')
        .addSelect('invoice.type', 'type')
        .addSelect('invoice.contact_id', 'contact_id')
        .addSelect('contact.contact_name', 'contact_name')
        .addSelect('invoice.status', 'status')
        .addSelect('invoice.invoice_date', 'invoice_date')
        .addSelect('invoice.due_date', 'due_date')
        .addSelect('invoice.reference', 'reference')
        .addSelect('invoice.sub_total', 'sub_total')
        .addSelect('invoice.total_tax', 'total_tax')
        .addSelect('invoice.total_amount', 'total_amount')
        .addSelect('invoice.line_items', 'line_items')
        .addSelect('invoice.line_amount_types', 'line_amount_types')
        .addSelect('invoice.pt_claim_id', 'pt_claim_id')
        .addSelect(
          // Task #368 — Surface "Permanently unmapped" as a distinct
          // status so the UI can render it alongside Mapped / Unmapped.
          `CASE
             WHEN invoice.permanently_unmapped = true THEN 'Permanently unmapped'
             WHEN invoice.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped'
             ELSE 'Unmapped'
           END`,
          'mapped_status',
        )
        .addSelect('invoice.permanently_unmapped', 'permanently_unmapped')
        .addSelect('xero.company_id', 'company_id')
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = invoice.integration_id`,
        )
        .leftJoin('invoice.xeroContactDetails', 'contact')
        .where(
          `xero.company_id = :companyId AND invoice.type = :type AND invoice.status <> 'VOIDED'`,
          {
            companyId: data.company_id,
            type: data.type === 'bill' ? 'ACCPAY' : 'ACCREC',
          },
        );

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(invoice.invoice_id::text) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder
            .andWhere(`invoice.mapped_status IN (:...mappedStatuses)`, {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            })
            // Task #368 — Permanently unmapped rows must never appear in
            // the Mapped or plain Unmapped views.
            .andWhere('invoice.permanently_unmapped = false');
        } else if (data.mapped_status === 'Permanently unmapped') {
          queryBuilder.andWhere('invoice.permanently_unmapped = true');
        } else {
          queryBuilder
            .andWhere(`invoice.mapped_status IS NULL`)
            .andWhere('invoice.permanently_unmapped = false');
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(invoice.invoice_id::text)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'id':
            {
              queryBuilder.orderBy({
                'LOWER(invoice.id::text)': sorting_order,
              });
            }
            break;
          case 'invoice_id':
            {
              queryBuilder.orderBy({
                'LOWER(invoice.invoice_id::text)': sorting_order,
              });
            }
            break;
          case 'type':
            {
              queryBuilder.orderBy({
                'LOWER(invoice.type)': sorting_order,
              });
            }
            break;
          case 'total_amount':
            {
              queryBuilder.orderBy({
                'invoice.total_amount': sorting_order,
              });
            }
            break;
          case 'due_date':
            {
              queryBuilder.orderBy({
                'invoice.due_date': sorting_order,
              });
            }
            break;
          case 'contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(contact.contact_name)': sorting_order,
              });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({
                'invoice.status': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      //
      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
                (data.page_number - 1) * data.page_size + data.page_size,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, invoice_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getPaytradeInvoiceListsForCompany(data: GetPaytradeInvoicesListsInput) {
    try {
      const queryBuilder = await this.paymentClaims
        .createQueryBuilder('a')
        .select('a.id', 'id')
        .addSelect('a.payment_claim_id', 'invoice_id')
        .addSelect('a.claim_type', 'type')
        .addSelect('a.client_supplier_id', 'contact_id')
        .addSelect('client.client_supplier_name', 'contact_name')
        .addSelect('a.status', 'status')
        .addSelect('a.due_date', 'due_date')
        .addSelect('a.claim_amount', 'total_amount')
        .addSelect('invoice.invoice_id', 'xero_invoice_id')
        .addSelect(
          `CASE WHEN invoice.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = a.company_id`,
        )
        .leftJoin(
          XeroInvoicesBills,
          'invoice',
          'invoice.pt_claim_id = a.payment_claim_id AND xero.integration_id = invoice.integration_id',
        )
        .leftJoin('a.clientSupplierDetails', 'client')
        .where(`a.company_id = :companyId and a.claim_type = :type`, {
          companyId: data.company_id,
          type: data.type === 'bill' ? 'Billable' : 'Receivable',
        })
        .andWhere(`a.status not in ('Deleted', 'Archived')`);

      if (data.search) {
        queryBuilder.andWhere(`(a.payment_claim_id::text LIKE :keyword)`, {
          keyword: `%${data.search}%`,
        });
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `invoice.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`invoice.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'a.payment_claim_id': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'id':
            {
              queryBuilder.orderBy({
                'LOWER(a.id::text)': sorting_order,
              });
            }
            break;
          case 'invoice_id':
            {
              queryBuilder.orderBy({
                'a.payment_claim_id': sorting_order,
              });
            }
            break;
          case 'xero_invoice_id':
            {
              queryBuilder.orderBy({
                'LOWER(invoice.invoice_id::text)': sorting_order,
              });
            }
            break;
          case 'type':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(a.claim_type AS text))': sorting_order,
              });
            }
            break;
          case 'contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(client.client_supplier_name)': sorting_order,
              });
            }
            break;
          case 'total_amount':
            {
              queryBuilder.orderBy({
                'a.claim_amount': sorting_order,
              });
            }
            break;
          case 'due_date':
            {
              queryBuilder.orderBy({
                'a.due_date': sorting_order,
              });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({
                'a.status': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      //
      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
                (data.page_number - 1) * data.page_size + data.page_size,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, invoice_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getMappedInvoiceBillLists(data: GetMappedXeroInvoicesListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const skip = (data.page_number - 1) * data.page_size;
      const queryBuilder = await this.xeroInvoicesBills
        .createQueryBuilder('invoice')
        .select([
          'invoice.id AS id',
          'invoice.invoice_id AS invoice_id',
          'invoice.tenant_id AS tenant_id',
          'invoice.type AS type',
          'invoice.contact_id AS contact_id',
          'contact.contact_name AS contact_name',
          'invoice.status AS status',
          `CASE WHEN invoice.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END AS mapped_status`,
          'invoice.invoice_date AS invoice_date',
          'invoice.due_date AS due_date',
          'invoice.reference AS reference',
          'invoice.sub_total AS sub_total',
          'invoice.total_tax AS total_tax',
          'invoice.line_amount_types AS line_amount_types',
          'invoice.total_amount AS total_amount',
          'invoice.pt_claim_id AS pt_claim_id',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = invoice.integration_id`,
        )
        .innerJoin(
          PaymentClaims,
          'b',
          'b.payment_claim_id = invoice.pt_claim_id',
        )
        .leftJoin('invoice.xeroContactDetails', 'contact')
        .where(
          `invoice.mapped_status IN (:...mappedStatuses) and invoice.type = :type`,
          {
            mappedStatuses: ['Manual', 'Auto', 'System'],
            type: data.type === 'bill' ? 'ACCPAY' : 'ACCREC',
          },
        )
        .andWhere(
          `xero.company_id = :companyId and b.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        );

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(invoice.invoice_id::text) LIKE LOWER(:keyword) OR b.payment_claim_id::text LIKE :keyword)`,
          {
            keyword: `%${data.search?.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(invoice.invoice_id::text)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'invoice_id':
            {
              queryBuilder.orderBy({
                'LOWER(invoice.invoice_id::text)': sorting_order,
              });
            }
            break;
          case 'pt_claim_id':
            {
              queryBuilder.orderBy({
                'b.payment_claim_id': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      //
      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      return { total_count, invoice_list: rawResults };
    } catch (error) {
      throw error;
    }
  }

  async manualMappingInvoiceBill(
    data: YetToMapInvoicesInput,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const checkPaytradeId = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: data.pt_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.invoice_id) {
        throw `This ${checkPaytradeId.type === 'ACCPAY' ? 'bill' : 'invoice'} has been already mapped to xero ${checkPaytradeId.type === 'ACCPAY' ? 'bill' : 'invoice'} ${checkPaytradeId?.invoice_id}`;
      }

      const checkXeroId = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: data.invoice_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_claim_id &&
        checkXeroId?.paymentClaims?.payment_claim_id
      ) {
        throw `This ${checkXeroId.type === 'ACCPAY' ? 'bill' : 'invoice'} has been already mapped to paytrade ${checkXeroId.type === 'ACCPAY' ? 'bill' : 'invoice'} ${checkXeroId?.paymentClaims?.payment_claim_id ? checkXeroId?.paymentClaims?.payment_claim_id : checkXeroId.pt_claim_id}`;
      }
      const response = await this.xeroInvoicesBills
        .createQueryBuilder()
        .update(XeroInvoicesBills)
        .set({
          pt_claim_id: data.pt_claim_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'invoice_id = :invoice_id AND integration_id = :integration_id',
          {
            invoice_id: data.invoice_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `${checkXeroId.type === 'ACCPAY' ? 'Bill' : 'Invoice'} has been mapped successfully`;
      } else {
        return `${checkXeroId.type === 'ACCPAY' ? 'Bill' : 'Invoice'} is not mapped`;
      }
    } catch (error) {
      throw error;
    }
  }

  async unMappingInvoiceBill(
    invoice_id: string,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: { invoice_id, integration_id: xeroDetails.integration_id },
      });
      const response = await this.xeroInvoicesBills
        .createQueryBuilder()
        .update(XeroInvoicesBills)
        .set({
          pt_claim_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'invoice_id = :invoice_id AND integration_id = :integration_id',
          {
            invoice_id: invoice_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `${xeroInvoicesBills.type === 'ACCPAY' ? 'Bill' : 'Invoice'} has been unmapped successfully`;
      } else {
        return `${xeroInvoicesBills.type === 'ACCPAY' ? 'Bill' : 'Invoice'} is not unmapped`;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Task #368 — Mark a Xero bill/invoice as permanently unmapped. Clears
   * any current PT link (same as unMappingInvoiceBill) and sets the
   * sticky `permanently_unmapped` flag so inbound import/re-link (webhook
   * + scheduler) skip it until a user explicitly re-enables it.
   */
  async permanentlyUnmapInvoiceBill(
    invoice_id: string,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: { invoice_id, integration_id: xeroDetails.integration_id },
      });
      const response = await this.xeroInvoicesBills
        .createQueryBuilder()
        .update(XeroInvoicesBills)
        .set({
          pt_claim_id: null,
          mapped_status: null,
          permanently_unmapped: true,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'invoice_id = :invoice_id AND integration_id = :integration_id',
          {
            invoice_id: invoice_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      const label = xeroInvoicesBills?.type === 'ACCPAY' ? 'Bill' : 'Invoice';
      if (response?.affected > 0) {
        try {
          await this.activityLogService.insertActivityLog({
            company_id,
            from_user: decoded?.userId,
            is_admin: !!decoded?.isAdmin,
            admin_id: decoded?.isAdmin ? decoded?.userId : null,
            created_by: decoded?.userId,
            dynamic_values: {
              action: 'xero_invoice_bill_permanently_unmapped',
              invoice_id,
              type: xeroInvoicesBills?.type ?? null,
              previous_pt_claim_id: xeroInvoicesBills?.pt_claim_id ?? null,
              previous_mapped_status: xeroInvoicesBills?.mapped_status ?? null,
              integration_id: xeroDetails.integration_id,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[Task #368] activity log insert failed for permanentlyUnmapInvoiceBill: ${err?.message || err}`,
          );
        }
        return `${label} permanently unmapped from Xero sync`;
      }
      return `${label} is not permanently unmapped`;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Task #368 — Reverse a previous permanent-unmap so the bill/invoice
   * returns to the normal "unmapped" pool and becomes eligible for
   * import/re-link again. Writes nothing else.
   */
  async reEnableInvoiceBillMapping(
    invoice_id: string,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: { invoice_id, integration_id: xeroDetails.integration_id },
      });
      const response = await this.xeroInvoicesBills
        .createQueryBuilder()
        .update(XeroInvoicesBills)
        .set({
          permanently_unmapped: false,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'invoice_id = :invoice_id AND integration_id = :integration_id',
          {
            invoice_id: invoice_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      const label = xeroInvoicesBills?.type === 'ACCPAY' ? 'Bill' : 'Invoice';
      if (response?.affected > 0) {
        try {
          await this.activityLogService.insertActivityLog({
            company_id,
            from_user: decoded?.userId,
            is_admin: !!decoded?.isAdmin,
            admin_id: decoded?.isAdmin ? decoded?.userId : null,
            created_by: decoded?.userId,
            dynamic_values: {
              action: 'xero_invoice_bill_mapping_re_enabled',
              invoice_id,
              type: xeroInvoicesBills?.type ?? null,
              integration_id: xeroDetails.integration_id,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[Task #368] activity log insert failed for reEnableInvoiceBillMapping: ${err?.message || err}`,
          );
        }
        return `${label} mapping re-enabled`;
      }
      return `${label} mapping is not re-enabled`;
    } catch (error) {
      throw error;
    }
  }

  private deriveSmartContractParams(
    projectRole: string,
    invoiceType: string,
    relatedEntity: string,
  ): { clientSupplierType: ClientSupplierType; clientSupplierRole: ClientSupplierRole } | null {
    const isBill = invoiceType === 'ACCPAY';

    const matrix: Record<string, { clientSupplierType: ClientSupplierType; clientSupplierRole: ClientSupplierRole } | null> = {
      'Head Contractor_bill_No': { clientSupplierType: 'Supplier', clientSupplierRole: 'Sub Contractor' },
      'Head Contractor_bill_Yes': { clientSupplierType: 'Supplier', clientSupplierRole: 'Related Entity Sub Contractor' },
      'Head Contractor_invoice_No': { clientSupplierType: 'Client', clientSupplierRole: 'Principal' },
      'Head Contractor_invoice_Yes': { clientSupplierType: 'Client', clientSupplierRole: 'Principal' },
      'Principal_bill_No': { clientSupplierType: 'Supplier', clientSupplierRole: 'Head Contractor' },
      'Principal_bill_Yes': { clientSupplierType: 'Supplier', clientSupplierRole: 'Head Contractor' },
      'Principal_invoice_No': null,
      'Principal_invoice_Yes': null,
      'Sub Contractor_bill_No': { clientSupplierType: 'Supplier', clientSupplierRole: 'Sub Contractor' },
      'Sub Contractor_bill_Yes': { clientSupplierType: 'Supplier', clientSupplierRole: 'Related Entity Sub Contractor' },
      'Sub Contractor_invoice_No': { clientSupplierType: 'Client', clientSupplierRole: 'Head Contractor' },
      'Sub Contractor_invoice_Yes': { clientSupplierType: 'Client', clientSupplierRole: 'Head Contractor' },
    };

    const key = `${projectRole}_${isBill ? 'bill' : 'invoice'}_${relatedEntity}`;
    return matrix[key] ?? null;
  }

  async smartCreateContract(
    decoded: any,
    params: {
      company_id: number;
      projectDetails: ProjectDetails;
      clientSuppliersDetails: ClientSuppliersDetails;
      invoiceDetails: any;
      xeroDetails: any;
      data: any;
      invoice_id: string;
      checkExistenceInDb: any;
      xeroProjectDetailsId: string | null;
    },
  ): Promise<ContractDetails | null> {
    const {
      company_id,
      projectDetails,
      clientSuppliersDetails,
      invoiceDetails,
      xeroDetails,
      data,
      invoice_id,
      checkExistenceInDb,
      xeroProjectDetailsId,
    } = params;

    const projectName = projectDetails.project_name || `Project ${projectDetails.project_id}`;
    const contactName = clientSuppliersDetails.client_supplier_name || `Contact ${clientSuppliersDetails.client_supplier_id}`;
    const relatedEntity = clientSuppliersDetails.related_entity || 'No';
    const isBill = invoiceDetails?.type === 'ACCPAY';
    const smartLogPayload = {
      invoice_id: data.invoice_id,
      tenant_id: data.tenant_id,
      client_supplier_id: clientSuppliersDetails.client_supplier_id,
      client_supplier_uuid: clientSuppliersDetails.id,
      project_id: projectDetails.project_id,
      project_uuid: projectDetails.id,
      sync_run_type: data.sync_run_type || null,
      type: isBill ? 'bill' : 'invoice',
    };
    const xeroProjectId = xeroProjectDetailsId;

    if (relatedEntity === 'Yes') {
      this.logger.log(
        `Smart contract creation skipped: contact ${contactName} is a Related Entity.`
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 477,
        dynamic_values: { contact_name: contactName },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: `Contact is a Related Entity — contracts must be created manually`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    const derived = this.deriveSmartContractParams(
      projectDetails.project_role,
      invoiceDetails.type,
      relatedEntity,
    );

    if (!derived) {
      const claimType = invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 'Bill' : 'Invoice';
      this.logger.log(
        `Smart contract creation failed: invalid combination ${projectDetails.project_role} + ${claimType}`
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 476,
        dynamic_values: {
          project_role: projectDetails.project_role,
          claim_type: claimType,
          contact_name: contactName,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: `Invalid role/claim type combination: ${projectDetails.project_role} cannot receive ${claimType}s`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    const contractTypeRecord = await this.dataSource.getRepository(ContractType).findOne({
      where: {
        project_role: projectDetails.project_role,
        client_supplier_type: derived.clientSupplierType,
        related_entity: relatedEntity as RelatedEntity,
        client_supplier_role: derived.clientSupplierRole,
      },
    });

    if (!contractTypeRecord || contractTypeRecord.contract_type === 'Error') {
      const validationMsg = contractTypeRecord?.validation ||
        `PayTrade doesn't allow ${projectDetails.project_role}/${derived.clientSupplierRole} contract types`;
      this.logger.log(`Smart contract creation failed: contract type validation error — ${validationMsg}`);
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 478,
        dynamic_values: {
          project_role: projectDetails.project_role,
          client_supplier_role: derived.clientSupplierRole,
          validation_message: validationMsg,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: validationMsg,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    const actualContactType = clientSuppliersDetails.client_supplier_type;
    if (actualContactType && actualContactType !== derived.clientSupplierType) {
      this.logger.log(
        `Smart contract creation failed: contact type mismatch — expected '${derived.clientSupplierType}', got '${actualContactType}'`
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 484,
        dynamic_values: {
          contact_name: contactName,
          actual_type: actualContactType,
          expected_type: derived.clientSupplierType,
          project_role: projectDetails.project_role,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: `Contact '${contactName}' is type '${actualContactType}' but expected '${derived.clientSupplierType}'`,
        xero_records: [invoiceDetails],
        paytrade_records: [clientSuppliersDetails],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    // Backfill missing address/email on the PT contact from the live Xero
    // contact BEFORE validating completeness. The smart-create pipeline
    // already holds this data in Xero (it auto-imports bank details from the
    // same live read further down), so failing the import and asking the
    // user to re-type an address Xero already sent is a self-inflicted
    // failure. Blank-fill only — never overwrite anything typed in PayTrade.
    if (
      !clientSuppliersDetails.client_supplier_address ||
      !clientSuppliersDetails.client_email_id
    ) {
      try {
        const mirrorForBackfill = await this.xeroContactDetails
          .createQueryBuilder('xcd')
          .where('xcd.integration_id = :integrationId', {
            integrationId: xeroDetails.integration_id,
          })
          .andWhere('xcd.pt_contact_id::text = :ptId', {
            ptId: String(clientSuppliersDetails.client_supplier_id),
          })
          .andWhere('xcd.contact_status = :status', { status: 'ACTIVE' })
          .getOne();
        if (mirrorForBackfill?.contact_id) {
          await this.xeroService.refreshTokenSet(company_id, this.xero);
          const liveContactResp = await this.xero.accountingApi.getContact(
            xeroDetails.tenant_id,
            mirrorForBackfill.contact_id,
          );
          const liveContact = liveContactResp?.body?.contacts?.[0];
          if (liveContact) {
            const backfill: Partial<ClientSuppliersDetails> = {};
            if (!clientSuppliersDetails.client_supplier_address) {
              const xeroAddress = pickXeroAddress(liveContact);
              const composedAddress = composeXeroAddress(xeroAddress);
              if (composedAddress) {
                backfill.client_supplier_address = composedAddress;
                if (xeroAddress?.country && !clientSuppliersDetails.country) {
                  backfill.country = xeroAddress.country;
                }
              }
            }
            if (
              !clientSuppliersDetails.client_email_id &&
              liveContact.emailAddress
            ) {
              backfill.client_email_id = liveContact.emailAddress;
            }
            if (Object.keys(backfill).length > 0) {
              await this.clientSuppliersDetails.update(
                { id: clientSuppliersDetails.id },
                {
                  ...backfill,
                  updated_by: decoded?.userId,
                  updated_on: new Date(),
                  updated_group: 'SYSTEM' as Group,
                },
              );
              Object.assign(clientSuppliersDetails, backfill);
              this.logger.log(
                `Auto-backfilled ${Object.keys(backfill).join(', ')} from Xero contact for '${contactName}' (company ${company_id})`,
              );
            }
          }
        }
      } catch (backfillErr) {
        const errMsg =
          backfillErr instanceof Error
            ? backfillErr.message
            : String(backfillErr);
        this.logger.warn(
          `Failed to backfill contact details from Xero for '${contactName}' (company ${company_id}): ${errMsg}`,
        );
      }
    }

    const allIssues: string[] = [];

    if (!clientSuppliersDetails.client_supplier_address) {
      allIssues.push('Address');
    }
    if (!clientSuppliersDetails.client_email_id) {
      allIssues.push('Email Address');
    }

    const bankAccountsRepo = this.dataSource.getRepository(BankAccounts);

    const projectBankAccounts = await bankAccountsRepo.find({
      where: { company_id },
    });
    const pidStr = String(projectDetails.project_id);
    const projectPtaBankAccounts = projectBankAccounts.filter(
      (ba) =>
        ba.account_type === 'Project Trust Account' &&
        ba.project_ids?.map(String).includes(pidStr),
    );
    const projectRtaBankAccounts = projectBankAccounts.filter(
      (ba) =>
        ba.account_type === 'Retention Trust Account' &&
        ba.project_ids?.map(String).includes(pidStr),
    );

    let ptaAccount: BankAccounts | null = null;
    let rtaAccount: BankAccounts | null = null;

    if (projectDetails.pta_eligibility === 'Yes') {
      if (projectPtaBankAccounts.length === 0) {
        allIssues.push(`Project '${projectName}' is PTA-eligible but has no Project Trust Account`);
      } else {
        ptaAccount = projectPtaBankAccounts[0];
      }
    }

    if (projectDetails.rta_eligibility === 'Yes') {
      if (projectRtaBankAccounts.length === 0) {
        allIssues.push(`Project '${projectName}' is RTA-eligible but has no Retention Trust Account`);
      } else {
        rtaAccount = projectRtaBankAccounts[0];
      }
    }

    let supplierPaymentToAccount: BankAccounts | null = null;
    if (derived.clientSupplierType === 'Supplier') {
      let supplierAccounts = await bankAccountsRepo.find({
        where: {
          client_supplier_id: clientSuppliersDetails.client_supplier_id,
        },
      });

      if (!supplierAccounts || supplierAccounts.length === 0) {
        const xeroContact = await this.xeroContactDetails
          .createQueryBuilder('xcd')
          .where('xcd.integration_id = :integrationId', { integrationId: xeroDetails.integration_id })
          .andWhere('xcd.pt_contact_id::text = :ptId', { ptId: String(clientSuppliersDetails.client_supplier_id) })
          .andWhere('xcd.contact_status = :status', { status: 'ACTIVE' })
          .getOne();

        if (xeroContact?.contact_id) {
          try {
            await this.xeroService.refreshTokenSet(company_id, this.xero);
            const xeroContactResp = await this.xero.accountingApi.getContact(
              xeroDetails.tenant_id,
              xeroContact.contact_id,
            );
            const xeroFullContact = xeroContactResp?.body?.contacts?.[0] || null;
            const xeroBatchPayments = xeroFullContact?.batchPayments;
            if (xeroBatchPayments && (xeroBatchPayments.bankAccountNumber || xeroBatchPayments.bankAccountName)) {
              // Xero stores AU contact bank details as a single concatenated string
              // in BatchPayments.BankAccountNumber — first 6 digits are the BSB,
              // the remainder is the account number. There is no separate `code`
              // field on a Contact's BatchPayments (that exists only on Accounts).
              const xeroDigits = (xeroBatchPayments.bankAccountNumber || '').replace(/\D/g, '');
              const bsbParsedNew = xeroDigits.length >= 6 ? padBsb6(xeroDigits.slice(0, 6)) : null;
              const acctParsedNew = xeroDigits.length > 6 ? xeroDigits.slice(6) : (xeroDigits || '');
              const newAccount = bankAccountsRepo.create({
                account_type: 'Cash Account' as const,
                account_name: xeroBatchPayments.bankAccountName || contactName,
                account_number: acctParsedNew,
                bsb_number: bsbParsedNew,
                company_id: company_id,
                client_supplier_id: clientSuppliersDetails.client_supplier_id,
                status: 'Open' as const,
                added_by_client_supplier: true,
                created_by: decoded?.userId,
                created_on: new Date(),
                created_group: 'SYSTEM' as Group,
                updated_by: decoded?.userId,
                updated_on: new Date(),
                updated_group: 'SYSTEM' as Group,
              });
              await bankAccountsRepo.save(newAccount);
              this.logger.log(
                `Auto-imported financial details from Xero for supplier '${contactName}' (company ${company_id})`
              );
              supplierAccounts = await bankAccountsRepo.find({
                where: { client_supplier_id: clientSuppliersDetails.client_supplier_id },
              });
            }
          } catch (importErr) {
            const errMsg = importErr instanceof Error ? importErr.message : String(importErr);
            this.logger.warn(
              `Failed to auto-import financial details from Xero for supplier '${contactName}' (company ${company_id}, contact_id ${xeroContact.contact_id}): ${errMsg}`
            );
          }
        }
      }

      if (!supplierAccounts || supplierAccounts.length === 0) {
        allIssues.push(`Supplier '${contactName}' has no bank account details in PayTrade`);
      } else {
        const completeAccount = supplierAccounts.find(
          (acc) => acc.account_number && acc.bsb_number,
        );
        if (completeAccount) {
          supplierPaymentToAccount = completeAccount;
        } else {
          allIssues.push(`Supplier '${contactName}' bank account details are incomplete (missing BSB number)`);
        }
      }
    }

    // Task #154: split email-missing (soft-fail) from other contact issues
    // (hard-fail). Email-only contacts get marked needs_email=true and a
    // warning sync log is written, but execution continues so the contract
    // and downstream claim/payment import succeed. Notice sending is
    // suppressed below while the contact has no email.
    const _emailMissing = allIssues.includes('Email Address');
    const _otherIssues = allIssues.filter((i) => i !== 'Email Address');

    if (_otherIssues.length === 0 && _emailMissing) {
      try {
        await this.clientSuppliersDetails.update(
          { id: clientSuppliersDetails.id },
          { needs_email: true },
        );
      } catch (flagErr) {
        const msg = flagErr instanceof Error ? flagErr.message : String(flagErr);
        this.logger.warn(
          `[SMART_CREATE_CONTRACT] Failed to set needs_email for contact ${contactName} (id=${clientSuppliersDetails.id}): ${msg}`,
        );
      }
      this.logger.log(
        `Smart contract proceeding with email-soft-fail: contact ${contactName} missing email (invoice ${invoice_id}) — notices will be suppressed until email is added`,
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 613,
        dynamic_values: {
          contact_name: contactName,
          invoice_id,
        },
        project_id: xeroProjectId,
        contract_id: null,
        // paytradeId must point to the client_suppliers_details row so
        // the email-edit transition / sync-log resolve UI can attribute
        // this warning back to the contact.
        reference: {
          xeroId: checkExistenceInDb?.id,
          paytradeId: clientSuppliersDetails?.id,
        },
        reference_id: clientSuppliersDetails?.id,
        history: [
          `API triggered from claim ${invoice_id}`,
          'Smart contract proceeding — contact email missing, notices suppressed',
        ],
        important_checks: {},
        error_message: `Imported with warning — contact '${contactName}' has no email; notices suppressed until an email is added.`,
        xero_records: [invoiceDetails],
        paytrade_records: [clientSuppliersDetails],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      // fall through — continue smart contract creation
    }

    if (_otherIssues.length > 0) {
      const issueList = allIssues.join('; ');
      const contactFieldsMissing = allIssues.filter(i =>
        ['Address', 'Email Address'].includes(i)
      );
      const otherIssues = allIssues.filter(i =>
        !['Address', 'Email Address'].includes(i)
      );
      let errorMessage = '';
      if (contactFieldsMissing.length > 0 && otherIssues.length > 0) {
        errorMessage = `Contact '${contactName}' is missing required information: ${contactFieldsMissing.join(', ')}. Also: ${otherIssues.join('; ')}. Please update the details in PayTrade and retry.`;
      } else if (contactFieldsMissing.length > 0) {
        errorMessage = `Contact '${contactName}' is missing required information: ${contactFieldsMissing.join(', ')}. Please update the contact in PayTrade and retry.`;
      } else {
        errorMessage = `${otherIssues.join('; ')}. Please update the details in PayTrade and retry.`;
      }
      this.logger.log(
        `Smart contract creation failed: ${issueList}`
      );
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 486,
        dynamic_values: {
          contact_name: contactName,
          missing_fields: issueList,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: errorMessage,
        xero_records: [invoiceDetails],
        paytrade_records: [clientSuppliersDetails],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    const contractName = await startCasePreserveUnicode(
      `${projectName} - ${contactName} - Smart Contract`
    );

    const existingContract = await this.contractDetails.findOne({
      where: {
        company_id: company_id,
        contract_name: contractName,
      },
    });

    if (existingContract) {
      this.logger.log(`Smart contract creation failed: contract name '${contractName}' already exists`);
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 479,
        dynamic_values: { contract_name: contractName },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: `Contract name '${contractName}' already exists`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }

    const retentionType: RetentionType = projectDetails.rta_eligibility === 'Yes' ? 'Cash' : 'None';
    const now = moment.tz('UTC').toDate();

    try {
      const contractData: any = {
        company_id: company_id,
        contract_name: contractName,
        client_supplier_role: derived.clientSupplierRole,
        contract_type: contractTypeRecord.contract_type,
        contract_status: 'In Progress',
        contract_date: now,
        project_id: projectDetails.project_id,
        client_supplier_id: clientSuppliersDetails.client_supplier_id,
        retention_type: retentionType,
        payment_terms: 10,
        initial_contract_sum: 99999999,
        contract_start_date: now,
        defect_liability_end_date: moment.tz('UTC').add(1, 'year').toDate(),
        created_by: decoded?.userId,
        created_on: now,
        created_group: 'SYSTEM',
      };

      if (supplierPaymentToAccount) {
        contractData.payment_to_account = supplierPaymentToAccount.bank_account_id;
        if (ptaAccount) {
          contractData.payment_from_account = ptaAccount.bank_account_id;
        }
      } else if (ptaAccount) {
        contractData.payment_to_account = ptaAccount.bank_account_id;
      }
      if (rtaAccount) {
        contractData.retention_from_account = rtaAccount.bank_account_id;
      }

      const newContract = this.contractDetails.create(contractData as ContractDetails);

      const saved = await this.contractDetails.save(newContract) as ContractDetails;

      const updatedContractId = 100000 + Number(saved.contract_id);
      await this.dataSource
        .createQueryBuilder()
        .update(ContractDetails)
        .set({ contract_id: updatedContractId })
        .where('id = :id', { id: saved.id })
        .execute();

      saved.contract_id = updatedContractId;

      this.logger.log(
        `Smart contract created: contract_id=${updatedContractId}, name='${contractName}', ` +
        `type=${derived.clientSupplierType}/${derived.clientSupplierRole}`
      );

      // Auto-push the new PT contract to Xero as a tracking option when the
      // company has enabled `pt_to_xero_contract_auto_create`. Fire-and-forget:
      // failures are recorded by createContractTrackingOptions itself via
      // xero_sync_logs, and must not break smart contract creation.
      if (
        xeroDetails?.pt_to_xero_contract_auto_create === true &&
        this.xeroContractsService
      ) {
        try {
          await this.xeroContractsService.createContractTrackingOptions(
            decoded,
            { contract_id: updatedContractId, mapped_status: 'System' },
          );
          this.logger.log(
            `Auto-push to Xero triggered for smart contract ${updatedContractId}`,
          );
        } catch (autoPushErr) {
          this.logger.error(
            `Auto-push to Xero failed for smart contract ${updatedContractId}: ${autoPushErr?.message ?? autoPushErr}`,
          );
        }
      }

      const savedPlain = JSON.parse(JSON.stringify(saved));

      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 475,
        dynamic_values: {
          contract_name: contractName,
          project_name: projectName,
          contact_name: contactName,
          client_supplier_type: derived.clientSupplierType,
          client_supplier_role: derived.clientSupplierRole,
          numeric_contract_id: updatedContractId,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: saved.id },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract created'],
        important_checks: {},
        error_message: null,
        xero_records: [invoiceDetails],
        paytrade_records: [savedPlain],
        new_records: [savedPlain],
        updated_records: null,
        synced_records: null,
      });

      if (derived.clientSupplierType === 'Supplier' && !_emailMissing) {
        // Task #271: per-notice failure isolation. handleTriggerContractNotices
        // now wraps each notice branch (PTA / RTA) in its own try/catch and
        // runs handleUpdateNotice INLINE after a successful auto-send (so
        // mail_sent=true is flipped immediately, not deferred to this caller
        // loop). That means:
        //   1. A failure in one branch (e.g. RTA) can no longer strand a
        //      previously-successful branch (PTA) at mail_sent=false.
        //   2. handlesentNoticeMail (called without an EntityManager from this
        //      path) already queued the notice email itself, so re-queueing
        //      it here would double-send. We no longer call emailQueueProducer
        //      from this loop.
        //   3. We still iterate update_notice_inputs to handle any non-auto
        //      cases (Onboarding 'Sent - Onboarded' / 'Not Sent') the trigger
        //      handler deliberately leaves for the caller, guarded by the
        //      auto_sent_handled flag.
        const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const branchStatus = { pta: 'skipped', rta: 'skipped', pta_mail_sent: false, rta_mail_sent: false };
        let noticeResult: any = null;
        try {
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] === BEGIN notice flow flow_id=${flowId} smart contract ${updatedContractId} ===`
          );
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] Contract details: type=${derived.clientSupplierType}, ` +
            `role=${derived.clientSupplierRole}, has_project=${!!projectName}, has_contact=${!!contactName}`
          );
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] Bank accounts assigned: payment_from=${contractData.payment_from_account || 'NONE'}, ` +
            `payment_to=${contractData.payment_to_account || 'NONE'}, retention_from=${contractData.retention_from_account || 'NONE'}`
          );
          noticeResult = await this.noticesService.handleTriggerContractNotices(
            decoded,
            {
              contract_id: updatedContractId,
              view_preview: true,
            },
          );

          this.logger.log(
            `[SMART_CONTRACT_NOTICES] handleTriggerContractNotices returned: status=${noticeResult?.status}, ` +
            `mails_to_sent count=${noticeResult?.data?.mails_to_sent?.length || 0}, ` +
            `update_notice_inputs count=${noticeResult?.data?.update_notice_inputs?.length || 0}, ` +
            `notice_previews count=${noticeResult?.data?.notice_previews?.length || 0}`
          );
        } catch (noticeErr) {
          const noticeErrMsg = noticeErr instanceof Error ? noticeErr.message : String(noticeErr);
          // Task #271: log at ERROR (not WARN) — silently swallowing this
          // hid the original ALBA bug for the entire 25 May incident.
          this.logger.error(
            `[SMART_CONTRACT_NOTICES] flow_id=${flowId} handleTriggerContractNotices THREW for smart contract ${updatedContractId}: ${noticeErrMsg}`
          );
        }

        // Even if the trigger threw, anything it managed to push into
        // mails_to_sent / update_notice_inputs before throwing is exposed
        // here via the partial-result fields once the trigger is refactored
        // to return on partial failure (see Step 1 / Task #271). For now,
        // only the auto-sent items that finished cleanly will have
        // auto_sent_handled=true and require nothing from this loop.
        const updateInputs: any[] = noticeResult?.data?.update_notice_inputs || [];

        for (let i = 0; i < updateInputs.length; i++) {
          const updatePayload = updateInputs[i];
          if (!updatePayload) continue;

          if (updatePayload.auto_sent_handled) {
            // Inline handleUpdateNotice already fired template 133 + flipped
            // mail_sent=true inside the trigger handler. Nothing left to do.
            if (updatePayload.notice_id) {
              // Track per-branch status for the summary breadcrumb below.
              const noticeType: string =
                noticeResult?.data?.notice_previews?.[i]?.file_details?.notice_type || '';
              if (noticeType.includes('Project Trust')) {
                branchStatus.pta = 'sent';
                branchStatus.pta_mail_sent = true;
              } else if (noticeType.includes('Retention Trust')) {
                branchStatus.rta = 'sent';
                branchStatus.rta_mail_sent = true;
              }
            }
            continue;
          }

          // Non-auto path (e.g. Onboarding 'Sent - Onboarded' or 'Not Sent'):
          // still needs the bulk status update. Wrap per-item so one bad
          // payload can't strand others.
          try {
            this.logger.log(
              `[SMART_CONTRACT_NOTICES] flow_id=${flowId} Updating non-auto notice status: notice_id=${updatePayload?.notice_id}, ` +
              `status=${updatePayload?.status}, auto_sent=${updatePayload?.auto_sent}`
            );
            await this.noticesService.handleUpdateNotice(decoded, updatePayload);
          } catch (updErr) {
            this.logger.error(
              `[SMART_CONTRACT_NOTICES] flow_id=${flowId} non-auto handleUpdateNotice failed notice_id=${updatePayload?.notice_id} error=${updErr instanceof Error ? updErr.message : String(updErr)}`
            );
          }
        }

        // Task #271 / Task #97 regression breadcrumb — one-line per-run
        // summary for easy log scraping when investigating future stuck-
        // notice reports.
        this.logger.log(
          `[SMART_CONTRACT_NOTICES_SUMMARY] flow_id=${flowId} contract_id=${updatedContractId} ` +
          `pta_status=${branchStatus.pta} rta_status=${branchStatus.rta} ` +
          `pta_mail_sent=${branchStatus.pta_mail_sent} rta_mail_sent=${branchStatus.rta_mail_sent}`
        );
        this.logger.log(
          `[SMART_CONTRACT_NOTICES] === END notice flow flow_id=${flowId} smart contract ${updatedContractId} ===`
        );
      } else if (derived.clientSupplierType === 'Supplier' && _emailMissing) {
        this.logger.log(
          `[SMART_CONTRACT_NOTICES] Skipping notices — contact '${contactName}' has no email (needs_email=true). Notices will be re-evaluated after email is added.`
        );
      } else {
        this.logger.log(
          `[SMART_CONTRACT_NOTICES] Skipping notices — clientSupplierType='${derived.clientSupplierType}' (only Supplier triggers S23/TA3 notices)`
        );
      }

      return saved;
    } catch (error) {
      const errorMsg = error?.message || String(error);
      this.logger.error(`Smart contract creation failed with error: ${errorMsg}`);
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'smartCreateContract',
        api_payload: smartLogPayload,
        integration_id: xeroDetails.integration_id,
        log_template_id: 480,
        dynamic_values: {
          project_name: projectName,
          contact_name: contactName,
          error_message: errorMsg,
        },
        project_id: xeroProjectId,
        contract_id: null,
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract creation failed'],
        important_checks: {},
        error_message: errorMsg,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return null;
    }
  }

  // Append a smart-create attempt to the contact's queue when
  // it was blocked by a missing email. Idempotent on (invoice_id) so the
  // same claim can't pile up multiple replay entries across re-syncs.
  async queueSmartCreateForEmailReplay(
    contact: ClientSuppliersDetails,
    entry: {
      invoice_id: string;
      tenant_id: string;
      company_id: number;
      project_id: number;
      sync_run_type: string | null;
      queued_on: string;
    },
  ): Promise<void> {
    const fresh = await this.clientSuppliersDetails.findOne({
      where: { id: contact.id },
    });
    if (!fresh) return;
    const existing: any[] = Array.isArray(fresh.pending_email_actions)
      ? fresh.pending_email_actions
      : [];
    const dedup = existing.filter(
      (e) =>
        !(
          e &&
          e.kind === 'smart_create_contract' &&
          e.invoice_id === entry.invoice_id
        ),
    );
    dedup.push({ kind: 'smart_create_contract', ...entry });
    await this.clientSuppliersDetails.update(
      { id: contact.id },
      { needs_email: true, pending_email_actions: dedup },
    );
  }

  // Replay queued smart-create attempts after a contact's email is added.
  // Successes/skips are removed from the queue; failures are kept (with an
  // incremented attempt counter and last_error) so a future save can retry.
  async replayPendingSmartCreatesForContact(
    decoded: any,
    contactId: string,
  ): Promise<Array<{ invoice_id: string; status: 'created' | 'skipped' | 'failed'; reason?: string; contract_id?: number }>> {
    const fresh = await this.clientSuppliersDetails.findOne({
      where: { id: contactId },
    });
    if (!fresh) return [];
    const queue: any[] = Array.isArray(fresh.pending_email_actions)
      ? fresh.pending_email_actions
      : [];
    const others = queue.filter(
      (e) => !(e && e.kind === 'smart_create_contract'),
    );
    const smartCreates = queue.filter(
      (e) => e && e.kind === 'smart_create_contract',
    );

    const results: Array<{
      invoice_id: string;
      status: 'created' | 'skipped' | 'failed';
      reason?: string;
      contract_id?: number;
    }> = [];
    const retainedFailures: any[] = [];
    for (const entry of smartCreates) {
      let result: { invoice_id: string; status: 'created' | 'skipped' | 'failed'; reason?: string; contract_id?: number };
      try {
        result = await this.replaySingleSmartCreate(decoded, fresh, entry);
      } catch (err: any) {
        result = {
          invoice_id: entry.invoice_id,
          status: 'failed',
          reason: err?.message || String(err),
        };
      }
      results.push(result);
      if (result.status === 'failed') {
        retainedFailures.push({
          ...entry,
          attempt_count: Number(entry?.attempt_count || 0) + 1,
          last_error: result.reason || null,
          last_attempt_at: new Date().toISOString(),
        });
      }
    }

    const remaining = [...others, ...retainedFailures];
    await this.clientSuppliersDetails.update(
      { id: contactId },
      { pending_email_actions: remaining },
    );
    return results;
  }

  private async replaySingleSmartCreate(
    decoded: any,
    contact: ClientSuppliersDetails,
    entry: any,
  ): Promise<{
    invoice_id: string;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    contract_id?: number;
  }> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: entry.company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails) {
      return {
        invoice_id: entry.invoice_id,
        status: 'skipped',
        reason: 'No active Xero integration',
      };
    }
    const projectDetails: any = await this.dataSource
      .getRepository(ProjectDetails)
      .findOne({ where: { project_id: entry.project_id } });
    if (!projectDetails) {
      return {
        invoice_id: entry.invoice_id,
        status: 'skipped',
        reason: 'Project no longer available',
      };
    }
    let invoiceDetails: any;
    try {
      await this.xeroService.refreshTokenSet(entry.company_id, this.xero);
      const invResp = await this.xero.accountingApi.getInvoice(
        entry.tenant_id,
        entry.invoice_id,
      );
      invoiceDetails = invResp?.body?.invoices?.[0];
    } catch (err: any) {
      return {
        invoice_id: entry.invoice_id,
        status: 'failed',
        reason: `Could not fetch claim from Xero: ${err?.message || err}`,
      };
    }
    if (!invoiceDetails) {
      return {
        invoice_id: entry.invoice_id,
        status: 'skipped',
        reason: 'Claim no longer exists in Xero',
      };
    }
    const created = await this.smartCreateContract(decoded, {
      company_id: entry.company_id,
      projectDetails,
      clientSuppliersDetails: contact,
      invoiceDetails,
      xeroDetails,
      data: {
        invoice_id: entry.invoice_id,
        tenant_id: entry.tenant_id,
        sync_run_type: entry.sync_run_type || 'email_replay',
      },
      invoice_id: entry.invoice_id,
      checkExistenceInDb: null,
      xeroProjectDetailsId: null,
    });
    if (created) {
      return {
        invoice_id: entry.invoice_id,
        status: 'created',
        contract_id: created.contract_id,
      };
    }
    return {
      invoice_id: entry.invoice_id,
      status: 'skipped',
      reason: 'Smart create returned no contract — see most recent sync log for details',
    };
  }
}
