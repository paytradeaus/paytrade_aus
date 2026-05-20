import { Injectable } from '@nestjs/common';
import {
  Account,
  Allocation,
  Allocations,
  BalanceDetails,
  BankTransaction,
  BankTransactions,
  BankTransfer,
  Contact,
  CreditNote,
  CreditNotes,
  Invoice,
  LineAmountTypes,
  LineItem,
  Overpayment,
  Payment,
  PaymentDelete,
  Payments,
  XeroClient,
} from 'xero-node';
import * as dotenv from 'dotenv';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository, InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, ILike, In, Repository } from 'typeorm';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { PaymentClaimTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroPayments } from 'src/entities/xero-payments.entity';
import { XeroBankAccountDetails } from 'src/entities/xero-bank-account-details.entity';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';
import {
  CreateCreditNotesInput,
  CreateOverPaymentInput,
  CreateOverPaymentRefundInput,
  CreatePaymentInput,
  DeleteCreditNotesInput,
  DeleteOverPaymentInput,
  DeleteOverPaymentRefundInput,
  DeletePaymentInput,
  GetMappedXeroPaymentListsInput,
  GetPaytradePaymentListsInput,
  GetXeroPaymentListsInput,
  YetToMapPaymentsInput,
} from './dto/xero.input';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import axios from 'axios';
import { PaymentsService } from 'src/api/users/banking/payments/payments.service';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { StatusService } from 'src/api/users/banking/ui-status.service';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroPaymentsService {
  private logger = new PaytradeLogger('XERO_PAYMENTS_SERVICE');
  private xero: XeroClient;
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
    @InjectRepository(XeroBankAccountDetails)
    private xeroBankAccountDetails: Repository<XeroBankAccountDetails>,
    @InjectRepository(BankAccounts)
    private bankAccounts: Repository<BankAccounts>,
    @InjectRepository(XeroPayments)
    private xeroPayments: Repository<XeroPayments>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(XeroSyncLogs)
    private xeroSyncLogs: Repository<XeroSyncLogs>,
    private readonly xeroService: XeroService,
    // Task #231 — used by handleInboundTrustMovementBankTransfer to
    // materialise PaymentDetails + SubPayments + xero_payments in a
    // single atomic transaction.
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    // Task #231 follow-up — inbound matcher must post the same
    // double-entry journals the user-creation path does, otherwise
    // the bank account balance, Journals tab, audit pack and every
    // report that joins through `journal_entries` skips the movement.
    private readonly paymentClaimsService: PaymentClaimsService,
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

  async getPaymentDetails(payment_id) {
    return await this.paymentDetails.findOne({
      where: { payment_id },
      relations: [
        'paymentClaims',
        'projectDetails',
        'clientSupplierDetails',
        'contractDetails',
        'paymentFromAccount',
        'paymentToAccount',
        'retentionAccount',
        'subPayments',
        'associatedPayment',
        'associatedOverPayment',
      ],
    });
  }

  async checkExistingXeroPayment(payment_id, integration_id) {
    return await this.xeroPayments.findOne({
      where: {
        integration_id,
        pt_payment_id: payment_id,
        status: 'AUTHORISED',
      },
    });
  }

  async createPayment(decoded: any, data: CreatePaymentInput) {
    try {
      const {
        payment_id,
        bank_account_id,
        retention_account,
        amount,
        retention_amount,
        payment_date,
        cash_retention,
      } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 171,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 177,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (xeroInvoicesBills?.status !== String(Invoice.StatusEnum.AUTHORISED)) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            unmapping_invoice_id: xeroInvoicesBills?.invoice_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 190,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Xero Claim is in ${xeroInvoicesBills.status.toLowerCase()} state`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const accountDetails = await this.bankAccounts.findOne({
        where: { bank_account_id },
      });
      if (!accountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 180,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          pt_bank_account_id: bank_account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data, mapping_bank_account_id: bank_account_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 181,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const retentionAccountDetails = cash_retention
        ? await this.bankAccounts.findOne({
            where: { bank_account_id: retention_account },
          })
        : null;
      if (cash_retention && !retentionAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 182,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Retention account details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroRetentionBankAccountDetails = cash_retention
        ? await this.xeroBankAccountDetails.findOne({
            where: {
              pt_bank_account_id: retention_account,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;
      if (cash_retention && !xeroRetentionBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            mapping_retention_account: retention_account,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 183,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Retention account is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data, category_type: 'project' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 328,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Failed',
          },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // Sync proceeds without contract tracking if contract_category_id is not configured.
      // Previously this was a hard block that caused unnecessary sync failures.

      const isSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
      if (
        (xeroInvoicesBills.type === String(Invoice.TypeEnum.ACCPAY) &&
          (!xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_payable_code) ||
            !xeroDetails.retention_payable_release_code)) ||
        (xeroInvoicesBills.type === String(Invoice.TypeEnum.ACCREC) &&
          (!xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            (!isSimplifiedRetention && !xeroDetails.liability_receivable_code) ||
            !xeroDetails.retention_receivable_release_code))
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 184,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Failed',
          },
          error_message: `Missing account field type. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        (xeroInvoicesBills.type === String(Invoice.TypeEnum.ACCPAY) &&
          !xeroDetails.bill_tax_code) ||
        (xeroInvoicesBills.type === String(Invoice.TypeEnum.ACCREC) &&
          !xeroDetails.invoice_tax_code)
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 185,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
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
          paytrade_records: [paymentDetails],
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
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 178,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Client/supplier details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
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
      if (!xeroContactDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            mapping_client_supplier_id: claimDetails.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 179,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Import tracking id validation': 'Ok',
            'Import account type validation': 'Ok',
            'Import tax type validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // If the contract is not mapped to Xero, the sync proceeds without contract tracking.
      // Previously both xeroContractDetails and pt_contract_id were hard blocks.
      const xeroContractDetails = xeroInvoicesBills?.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              id: xeroInvoicesBills?.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!xeroContractDetails || !xeroContractDetails.pt_contract_id) {
        this.logger.log(
          `Contract not mapped to Xero for payment ${payment_id}. ` +
          `Proceeding without contract tracking category.`
        );
      }

      const xeroProjectDetails = xeroInvoicesBills?.project_id
        ? await this.xeroProjectDetails.findOne({
            where: {
              id: xeroInvoicesBills?.project_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!xeroProjectDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 186,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
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
          error_message: `Project details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroProjectDetails.pt_project_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            mapping_project_id: xeroInvoicesBills?.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 187,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
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
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      const dateValue = moment(payment_date).toDate();

      // ---------------------------------------------------------------
      // Task #50 — Independent gates for the Payment leg vs the
      // BankTransfer leg. Either or both may fire on a given call.
      // We look up any prior xero_payments row for this PT payment so
      // we can (a) skip API calls for already-synced halves and
      // (b) UPDATE the existing row when adding the missing half.
      // ---------------------------------------------------------------
      const existingXp = await this.xeroPayments.findOne({
        where: {
          integration_id: xeroDetails.integration_id,
          pt_payment_id: payment_id,
        },
      });
      const wantPayment = data?.sync_payment !== false;
      const wantTransfer =
        !!cash_retention && data?.sync_transfer !== false;
      const skipPayment = !wantPayment || !!existingXp?.payment_id;
      const skipTransfer = !wantTransfer || !!existingXp?.bank_transfer_id;
      try {
        this.logger.log(
          `[Task#50 gate-split] payment_id=${payment_id} wantPayment=${wantPayment} wantTransfer=${wantTransfer} skipPayment=${skipPayment} skipTransfer=${skipTransfer} cash_retention=${cash_retention} sync_payment_flag=${data?.sync_payment} sync_transfer_flag=${data?.sync_transfer} retention_amount=${retention_amount} existingXp.payment_id=${existingXp?.payment_id || null} existingXp.bank_transfer_id=${existingXp?.bank_transfer_id || null}`,
        );

        // Task #54.1 — Diagnostic sync log when the transfer leg is
        // suppressed despite cash_retention being requested. Without
        // this, callers see only the Payment-leg sync log and have no
        // way to tell why no BankTransfer was created. Three distinct
        // suppression reasons are surfaced below.
        if (!wantTransfer && !!cash_retention) {
          let reason = 'Unknown';
          if (data?.sync_transfer === false) {
            reason =
              'sync_transfer flag was explicitly false (resolver did not request the transfer leg — Confirm Retention was probably not ticked, or it was already synced previously)';
          }
          this.logger.log(
            `[Task#54.1 transfer-not-requested] payment_id=${payment_id} reason="${reason}"`,
          );
          try {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            api_name: 'createPaymentInXero',
            api_payload: {
              ...data,
              mapping_project_id: xeroInvoicesBills?.project_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 502,
            dynamic_values: {
              payment_id: paymentDetails?.payment_id,
              reason,
              cash_retention: String(!!cash_retention),
              sync_transfer: String(data?.sync_transfer),
              is_retention_checked: 'see resolver wantTransfer compute',
              existing_bank_transfer_id:
                existingXp?.bank_transfer_id || 'none',
              retention_amount: Number(retention_amount || 0).toFixed(2),
            },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: { xeroId: null, paytradeId: paymentDetails?.id },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              `Transfer leg suppressed: ${reason}`,
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          } catch (logErr) {
            this.logger.error(
              `[Task#54.1] Failed to write transfer-suppressed sync log (template 502): ${logErr?.message ?? logErr}`,
            );
          }
        } else if (
          wantTransfer &&
          skipTransfer &&
          !!existingXp?.bank_transfer_id
        ) {
          // Transfer was requested AND a previous BankTransfer is
          // already mapped — write a Succeeded "already mapped" log
          // so the user sees the transfer leg's outcome instead of
          // silence next to the Payment-leg log.
          this.logger.log(
            `[Task#54.1 transfer-already-mapped] payment_id=${payment_id} bank_transfer_id=${existingXp.bank_transfer_id}`,
          );
          try {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            api_name: 'createPaymentInXero',
            api_payload: {
              ...data,
              mapping_project_id: xeroInvoicesBills?.project_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 501,
            dynamic_values: {
              payment_id: paymentDetails?.payment_id,
              bank_transfer_id: existingXp.bank_transfer_id,
            },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: existingXp.bank_transfer_id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              `Transfer leg short-circuited — existing BankTransfer ${existingXp.bank_transfer_id} already mapped`,
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          } catch (logErr) {
            this.logger.error(
              `[Task#54.1] Failed to write transfer-already-mapped sync log (template 501): ${logErr?.message ?? logErr}`,
            );
          }
        }

        if (skipPayment && skipTransfer) {
          this.logger.log(
            `[Task#50 gate-split] Nothing to push for payment_id=${payment_id} — both legs already synced or both gates closed.`,
          );
          return existingXp || true;
        }

        const invoice: Invoice = {
          invoiceID: xeroInvoicesBills.invoice_id,
        };

        const account: Account = {
          accountID: xeroBankAccountDetails.account_id,
        };

        const payment: Payment = {
          invoice: invoice,
          account: account,
          amount: amount,
          date: dateValue,
          status: Payment.StatusEnum.AUTHORISED,
        };

        let response: any = null;
        if (!skipPayment) {
          response = await this.xero.accountingApi.createPayment(
            xeroDetails.tenant_id,
            payment,
          );
          this.logger.log(
            `Payment created: ${JSON.stringify(response?.body?.payments?.[0])}`,
          );
        }

        const paymentLegOk = skipPayment ? true : !!response?.body?.payments;
        if (paymentLegOk) {
          let bank_transfer_id: string | null =
            existingXp?.bank_transfer_id || null;
          let bank_transfer_reference: string | null =
            (existingXp as any)?.bank_transfer_reference || null;
          // Task #54 — set when the transfer leg fails AND we could not
          // recover by linking an existing PT-RET-{payment_id} transfer.
          // Used downstream to suppress the contradictory "success" log
          // (template 168) so operators don't see a Failed + Succeeded
          // pair for the same run.
          let transferFailedWithoutRecovery = false;
          if (!skipTransfer) {
            const ptRef = `PT-RET-${payment_id}`;
            const bankTransfer: BankTransfer = {
              fromBankAccount: { accountID: xeroBankAccountDetails.account_id },
              toBankAccount: {
                accountID: xeroRetentionBankAccountDetails.account_id,
              },
              amount: retention_amount,
              date: dateValue,
              reference: ptRef,
            };
            this.logger.log(`bankTransfer: ${JSON.stringify(bankTransfer)}`);
            try {
              const retentionTransfer =
                await this.xero.accountingApi.createBankTransfer(
                  xeroDetails.tenant_id,
                  { bankTransfers: [bankTransfer] },
                );
              if (retentionTransfer?.body?.bankTransfers) {
                this.logger.log(
                  `retention: ${JSON.stringify(retentionTransfer?.body?.bankTransfers)}`,
                );
                bank_transfer_id =
                  retentionTransfer?.body?.bankTransfers[0]?.bankTransferID;
                bank_transfer_reference = ptRef;

                // Task #54.1 — Dedicated success log for the transfer
                // leg so the sync log list shows TWO rows (one for the
                // Payment, one for the BankTransfer) when both fire in
                // the same call. Previously only the combined success
                // log (template 168) was written and users could not
                // tell whether the retention BankTransfer had actually
                // posted.
                try {
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    api_name: 'createPaymentInXero',
                    api_payload: {
                      ...data,
                      mapping_project_id: xeroInvoicesBills?.project_id,
                    },
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 500,
                    dynamic_values: {
                      reference: ptRef,
                      bank_transfer_id,
                      retention_amount:
                        Number(retention_amount).toFixed(2),
                    },
                    project_id: xeroInvoicesBills?.project_id,
                    contract_id: xeroInvoicesBills?.contract_id,
                    reference: {
                      xeroId: bank_transfer_id,
                      paytradeId: paymentDetails?.id,
                    },
                    reference_id: paymentDetails?.id,
                    history: [
                      `API triggered from payment ${paymentDetails?.payment_id}`,
                      `Retention BankTransfer ${bank_transfer_id} created in Xero (reference ${ptRef})`,
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
                    xero_records: [
                      retentionTransfer.body.bankTransfers[0],
                    ],
                    paytrade_records: [paymentDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
                } catch (logErr) {
                  this.logger.error(
                    `[Task#54.1] Failed to write transfer-success sync log (template 500): ${logErr?.message ?? logErr}`,
                  );
                }
              } else {
                this.logger.log(
                  `[Task#54.1 transfer-leg] Xero returned no bankTransfers in response body for payment_id=${payment_id} — falling through without success log.`,
                );
              }
            } catch (transferErr) {
              // ---------------------------------------------------------
              // Task #54 — Auto-recover when Xero rejects the BankTransfer
              // leg. Mirrors Task #51 for the Payment leg. Detect known
              // rejection patterns (duplicate reference, account mismatch,
              // insufficient balance), look up any pre-existing transfer
              // that already carries our PT-RET-{payment_id} reference,
              // and either short-circuit (link it) or surface a dedicated
              // Failed sync log explaining the cause. The Payment leg's
              // success is preserved either way.
              // ---------------------------------------------------------
              const transferErrMsg = await handleAxiosError(transferErr);
              this.logger.log(
                `[Task#54 transfer-recovery] payment_id=${payment_id} transfer leg failed: ${transferErrMsg}`,
              );
              const lower =
                typeof transferErrMsg === 'string'
                  ? transferErrMsg.toLowerCase()
                  : '';
              const isDuplicateRef =
                /duplicate|already\s+exists|reference.*(unique|exists)|unique.*reference/.test(
                  lower,
                );
              const isAccountMismatch =
                /from.*bank.*account|to.*bank.*account|same\s+account|invalid\s+account|account.*not.*valid|account.*does\s*not\s*exist|bankaccount/.test(
                  lower,
                );
              const isInsufficientBalance =
                /insufficient|not\s+enough|balance|funds/.test(lower);
              const isKnownPattern =
                isDuplicateRef ||
                isAccountMismatch ||
                isInsufficientBalance;

              // Step 1: Try to recover by finding an existing Xero
              // BankTransfer that carries our PT reference. Gated to
              // known rejection patterns to avoid an extra Xero API
              // call on transient/unrelated errors (network blips,
              // 500s, etc.) which fall through to the generic Failed
              // log below.
              let recovered: any = null;
              if (isKnownPattern) {
                try {
                  const lookbackDate = moment(dateValue)
                    .subtract(60, 'days')
                    .toDate();
                  const existingResp =
                    await this.xero.accountingApi.getBankTransfers(
                      xeroDetails.tenant_id,
                      lookbackDate,
                      null,
                      'Date DESC',
                    );
                  const candidates =
                    existingResp?.body?.bankTransfers || [];
                  recovered =
                    candidates.find(
                      (t: any) =>
                        typeof t?.reference === 'string' &&
                        t.reference === ptRef,
                    ) || null;
                  this.logger.log(
                    `[Task#54 transfer-recovery] candidate count=${candidates.length} matched_by_ref=${!!recovered}`,
                  );
                } catch (lookupErr) {
                  this.logger.log(
                    `[Task#54 transfer-recovery] getBankTransfers failed: ${await handleAxiosError(lookupErr)}`,
                  );
                }
              }

              if (recovered?.bankTransferID) {
                bank_transfer_id = recovered.bankTransferID;
                bank_transfer_reference = ptRef;
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  api_name: 'createPaymentInXero',
                  api_payload: {
                    ...data,
                    mapping_project_id: xeroInvoicesBills?.project_id,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 495,
                  dynamic_values: {
                    reference: ptRef,
                    bank_transfer_id: recovered.bankTransferID,
                  },
                  project_id: xeroInvoicesBills?.project_id,
                  contract_id: xeroInvoicesBills?.contract_id,
                  reference: {
                    xeroId: null,
                    paytradeId: paymentDetails?.id,
                  },
                  reference_id: paymentDetails?.id,
                  history: [
                    `API triggered from payment ${paymentDetails?.payment_id}`,
                    `Recovered: linked existing Xero BankTransfer ${recovered.bankTransferID} via reference ${ptRef}`,
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
                  xero_records: [recovered],
                  paytrade_records: [paymentDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              } else {
                // Step 2: No existing transfer found — surface a dedicated
                // Failed log keyed off the detected pattern. The payment
                // leg (if it fired) still gets persisted below; the user
                // can re-tick Confirm Retention once they fix the cause.
                transferFailedWithoutRecovery = true;
                let log_template_id = 498;
                let history_tail =
                  `Xero rejected the BankTransfer and no existing transfer with reference ${ptRef} was found: ${transferErrMsg}`;
                if (isDuplicateRef) {
                  log_template_id = 496;
                  history_tail = `Xero rejected the BankTransfer as a duplicate reference, but no existing transfer with reference ${ptRef} was found in Xero — manual reconciliation may be required: ${transferErrMsg}`;
                } else if (isAccountMismatch) {
                  log_template_id = 497;
                  history_tail = `Xero rejected the BankTransfer due to an account problem (from/to accounts equal or invalid): ${transferErrMsg}`;
                } else if (isInsufficientBalance) {
                  log_template_id = 498;
                  history_tail = `Xero rejected the BankTransfer (insufficient balance or similar): ${transferErrMsg}`;
                }
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  api_name: 'createPaymentInXero',
                  api_payload: {
                    ...data,
                    mapping_project_id: xeroInvoicesBills?.project_id,
                  },
                  integration_id: xeroDetails.integration_id,
                  log_template_id,
                  dynamic_values: {
                    reference: ptRef,
                    retention_amount: Number(retention_amount).toFixed(2),
                    error: transferErrMsg,
                  },
                  project_id: xeroInvoicesBills?.project_id,
                  contract_id: xeroInvoicesBills?.contract_id,
                  reference: {
                    xeroId: null,
                    paytradeId: paymentDetails?.id,
                  },
                  reference_id: paymentDetails?.id,
                  history: [
                    `API triggered from payment ${paymentDetails?.payment_id}`,
                    history_tail,
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
                  error_message: transferErrMsg,
                  xero_records: [],
                  paytrade_records: [paymentDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
              }
            }
          }

          const freshPayment = response?.body?.payments?.[0];
          const requestData: any = {
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            contact_id: xeroContactDetails.id,
            invoice_id: xeroInvoicesBills.id,
            pt_payment_id: payment_id,
            mapped_status: 'System',
          };
          if (freshPayment) {
            requestData.payment_id = freshPayment.paymentID;
            requestData.account_id = xeroBankAccountDetails.id;
            requestData.payment_type = freshPayment.paymentType;
            requestData.status = freshPayment.status;
            requestData.payment_date = freshPayment.date;
            requestData.reference = freshPayment.reference;
            requestData.payment_amount = freshPayment.amount;
            requestData.bank_amount = freshPayment.bankAmount;
            requestData.is_reconciled = freshPayment.isReconciled;
          }
          if (bank_transfer_id) {
            requestData.bank_transfer_id = bank_transfer_id;
            requestData.bank_transfer_reference = bank_transfer_reference;
          }

          // Task #54 — if the transfer leg failed without recovery AND
          // the payment leg didn't fire (or also produced nothing), there
          // is no new Xero state to persist. The dedicated Failed log
          // (496/497/498) was already emitted; short-circuit before
          // writing an empty/duplicate xero_payments row or the
          // contradictory success log (168).
          const haveNewXeroState = !!freshPayment || !!bank_transfer_id;
          if (transferFailedWithoutRecovery && !haveNewXeroState) {
            this.logger.log(
              `[Task#54 transfer-recovery] Suppressing success log/persist for payment_id=${payment_id} — transfer leg failed and no payment leg state to persist.`,
            );
            return false;
          }

          let xeroResponse: any;
          if (existingXp) {
            this.logger.log(
              `[Task#50 gate-split] Updating xero_payments id=${existingXp.id} with new leg(s): ${JSON.stringify(requestData)}`,
            );
            await this.xeroPayments.update({ id: existingXp.id }, requestData);
            xeroResponse = await this.xeroPayments.findOne({
              where: { id: existingXp.id },
            });
          } else {
            requestData.created_on =
              freshPayment?.updatedDateUTC || moment.tz('UTC').toDate();
            requestData.created_by = decoded?.userId;
            requestData.created_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
            // Status fallback when only the transfer leg fired (no Payment in Xero yet).
            if (!requestData.status) {
              requestData.status = 'AUTHORISED';
            }
            this.logger.log(`requestData: ${JSON.stringify(requestData)}`);
            const xeroPaymentsRow = await this.xeroPayments.create(requestData);
            xeroResponse = await this.xeroPayments.save(xeroPaymentsRow);
          }

          // Task #54 — when the payment leg succeeded but the transfer
          // leg failed without recovery, skip the generic success log
          // (template 168) so operators don't see a Failed + Succeeded
          // pair for the same run. The persist above still runs so the
          // payment leg's progress isn't lost; the dedicated Failed log
          // (496/497/498) tells the user what to fix.
          if (transferFailedWithoutRecovery) {
            this.logger.log(
              `[Task#54 transfer-recovery] payment_id=${payment_id} payment leg persisted; success log 168 suppressed because transfer leg failed.`,
            );
            return xeroResponse;
          }
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 168,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
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
            xero_records: [payment],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        } else {
          const errMsg = await handleAxiosError(response);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'createPaymentInXero',
              api_payload: {
                ...data,
                mapping_project_id: xeroInvoicesBills?.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 332,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
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
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } catch (error) {
        const errMsg = await handleAxiosError(error);

        // -----------------------------------------------------------------
        // Task #51 — Auto-recover when Xero rejects the Payment leg with
        // "exceeds amount outstanding". The invoice is already (partially)
        // paid in Xero. We refresh the invoice and either short-circuit
        // (mark already-synced if AmountDue == 0) or surface a clear
        // remediation log carrying the AmountDue figure.
        // -----------------------------------------------------------------
        const isExceedsOutstanding =
          !skipPayment &&
          typeof errMsg === 'string' &&
          /exceeds?.*(amount\s+)?outstanding/i.test(errMsg);
        if (isExceedsOutstanding) {
          try {
            const invResp = await this.xero.accountingApi.getInvoice(
              xeroDetails.tenant_id,
              xeroInvoicesBills.invoice_id,
            );
            const freshInvoice = invResp?.body?.invoices?.[0];
            const amountDue = Number(freshInvoice?.amountDue ?? 0);
            const invoiceNumber =
              freshInvoice?.invoiceNumber ||
              xeroInvoicesBills.invoice_id ||
              '';
            this.logger.log(
              `[Task#51 exceeds-outstanding] payment_id=${payment_id} invoice=${invoiceNumber} amountDue=${amountDue}`,
            );

            if (Math.abs(amountDue) < 0.005) {
              // (a) Invoice fully paid in Xero — short-circuit by
              // recording an existing Xero payment against the PT row
              // so the resolver gate won't keep retrying.
              const xeroPayments: any[] = Array.isArray(freshInvoice?.payments)
                ? freshInvoice.payments
                : [];
              const wantAmount = Number(amount);
              const matched =
                xeroPayments.find(
                  (p: any) =>
                    (p?.account?.accountID ===
                      xeroBankAccountDetails.account_id ||
                      !p?.account?.accountID) &&
                    Math.abs(Number(p?.amount ?? 0) - wantAmount) < 0.005,
                ) ||
                xeroPayments
                  .slice()
                  .sort(
                    (a: any, b: any) =>
                      new Date(b?.date || 0).getTime() -
                      new Date(a?.date || 0).getTime(),
                  )[0];

              let bank_transfer_id: string | null =
                existingXp?.bank_transfer_id || null;
              let bank_transfer_reference: string | null =
                (existingXp as any)?.bank_transfer_reference || null;

              // Best-effort: if the transfer leg was also requested and
              // not yet pushed, attempt it now that the payment leg is
              // resolved. Failures here should not break recovery.
              if (!skipTransfer) {
                try {
                  const ptRef = `PT-RET-${payment_id}`;
                  const bankTransfer: BankTransfer = {
                    fromBankAccount: {
                      accountID: xeroBankAccountDetails.account_id,
                    },
                    toBankAccount: {
                      accountID: xeroRetentionBankAccountDetails.account_id,
                    },
                    amount: retention_amount,
                    date: dateValue,
                    reference: ptRef,
                  };
                  const retentionTransfer =
                    await this.xero.accountingApi.createBankTransfer(
                      xeroDetails.tenant_id,
                      { bankTransfers: [bankTransfer] },
                    );
                  if (retentionTransfer?.body?.bankTransfers) {
                    bank_transfer_id =
                      retentionTransfer?.body?.bankTransfers[0]?.bankTransferID;
                    bank_transfer_reference = ptRef;
                  }
                } catch (transferErr) {
                  this.logger.log(
                    `[Task#51 exceeds-outstanding] transfer leg failed during recovery: ${await handleAxiosError(transferErr)}`,
                  );
                }
              }

              const requestData: any = {
                tenant_id: xeroDetails.tenant_id,
                integration_id: xeroDetails.integration_id,
                contact_id: xeroContactDetails.id,
                invoice_id: xeroInvoicesBills.id,
                pt_payment_id: payment_id,
                mapped_status: 'System',
              };
              if (matched) {
                requestData.payment_id = matched.paymentID;
                requestData.account_id = xeroBankAccountDetails.id;
                requestData.payment_type = matched.paymentType;
                requestData.status = matched.status || 'AUTHORISED';
                requestData.payment_date = matched.date;
                requestData.reference = matched.reference;
                requestData.payment_amount = matched.amount;
                requestData.bank_amount = matched.bankAmount;
                requestData.is_reconciled = matched.isReconciled;
              }
              if (bank_transfer_id) {
                requestData.bank_transfer_id = bank_transfer_id;
                requestData.bank_transfer_reference = bank_transfer_reference;
              }

              // Always persist (or update) a xero_payments row so the
              // recovery is durable, even when no Xero payment record
              // matched (e.g. invoice settled via credit note or
              // adjustment with no payments[] entry returned).
              if (!requestData.reference) {
                requestData.reference = `RECOVERED-EXCEEDS-OUTSTANDING:${invoiceNumber}`;
              }
              if (!requestData.status) {
                requestData.status = 'AUTHORISED';
              }
              let xeroResponse: any;
              if (existingXp) {
                await this.xeroPayments.update(
                  { id: existingXp.id },
                  requestData,
                );
                xeroResponse = await this.xeroPayments.findOne({
                  where: { id: existingXp.id },
                });
              } else {
                requestData.created_on =
                  matched?.updatedDateUTC || moment.tz('UTC').toDate();
                requestData.created_by = decoded?.userId;
                requestData.created_group = decoded?.isAdmin
                  ? 'ADMIN'
                  : 'USER';
                const row = await this.xeroPayments.create(requestData);
                xeroResponse = await this.xeroPayments.save(row);
              }

              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createPaymentInXero',
                api_payload: {
                  ...data,
                  mapping_project_id: xeroInvoicesBills?.project_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 493,
                dynamic_values: {
                  invoice_number: invoiceNumber,
                  matched_payment_id: matched?.paymentID || 'none',
                },
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: xeroResponse?.id || null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Recovered: invoice already fully paid in Xero',
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
                xero_records: matched ? [matched] : [],
                paytrade_records: [paymentDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return xeroResponse || true;
            }

            // (b) Invoice still has an outstanding balance smaller than
            // the requested payment amount — surface a dedicated Failed
            // log explaining the gap so the user can adjust.
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createPaymentInXero',
              api_payload: {
                ...data,
                mapping_project_id: xeroInvoicesBills?.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 494,
              dynamic_values: {
                invoice_number: invoiceNumber,
                amount_due: amountDue.toFixed(2),
                requested_amount: Number(amount).toFixed(2),
              },
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                `Xero rejected: payment ${Number(amount).toFixed(2)} exceeds amount outstanding ${amountDue.toFixed(2)}`,
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
              xero_records: freshInvoice ? [freshInvoice] : [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          } catch (recoverErr) {
            // Fall through to the generic failed log below.
            this.logger.log(
              `[Task#51 exceeds-outstanding] recovery path failed: ${await handleAxiosError(recoverErr)}`,
            );
          }
        }

        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: data?.sync_id,
            api_name: 'createPaymentInXero',
            api_payload: {
              ...data,
              mapping_project_id: xeroInvoicesBills?.project_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 332,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
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
            paytrade_records: [paymentDetails],
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

  /**
   * Task #55 — One-shot / on-demand healer for legacy "exceeds amount
   * outstanding" payment sync failures that were logged BEFORE the
   * Task #51 inline recovery path existed.
   *
   * Scans recent Failed payment sync logs (template 332) whose
   * `error_message` contains "exceeds outstanding", deduplicates by
   * `reference_id` (PT payment row id), then re-invokes
   * `createPayment(...)` for each with `sync_id` pointing at the
   * original 332 row — `insertXeroSyncLogs` treats a non-empty `id`
   * as an UPDATE, so the legacy Failed row is healed in place to:
   *  - template 493 (recovered) when AmountDue == 0 — the existing
   *    Xero payment is recorded against the PT row,
   *  - template 168 (synced) when the recovery actually pushed a
   *    fresh payment that succeeded,
   *  - template 494 (PAYMENT_EXCEEDS_OUTSTANDING) when AmountDue > 0
   *    — the row carries the outstanding figure so the user can
   *    adjust and re-sync.
   *
   * NOTE on the task spec wording: the task description references
   * "template 492" for the AmountDue > 0 case, but template 492 is the
   * BankTransfer-reversal log added in Task #52 and is unrelated to
   * payment-exceeds-outstanding. Template 494 is the correct semantic
   * match (it was added alongside 493 in Task #51 specifically to
   * carry `amount_due` / `requested_amount` for this exact case).
   *
   * Idempotent — re-runs are safe because the latest-332-per-reference
   * loop only sees rows that are still Failed, and any row already
   * healed to 168 / 493 / 494 by a previous run is filtered out by
   * the `latestByRef` dedup + the post-update guard below.
   *
   * Best-effort: per-row failures are caught and counted; a single bad
   * row never aborts the scan.
   */
  async recoverFailedExceedsOutstandingPaymentSyncs(
    decoded: any,
    options: {
      integration_id?: number;
      lookback_days?: number;
      limit?: number;
    } = {},
  ): Promise<{
    scanned: number;
    recovered: number;
    classified: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const PREFIX = '[Task#55 retry-exceeds-outstanding]';
    const lookbackDays = Math.max(1, Math.min(365, options.lookback_days || 90));
    const limit = Math.max(1, Math.min(1000, options.limit || 500));
    const summary = {
      scanned: 0,
      recovered: 0,
      classified: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Find candidate failed logs.
      const candidatesQb = this.xeroPayments.manager
        .getRepository(XeroSyncLogs)
        .createQueryBuilder('log')
        .where('log.log_template_id = :tpl', { tpl: 332 })
        .andWhere('log.error_message ILIKE :pat', {
          pat: '%exceeds%outstanding%',
        })
        .andWhere('log.reference_id IS NOT NULL')
        .andWhere(
          `log.created_on >= (now() - (:days || ' days')::interval)`,
          { days: lookbackDays },
        )
        .orderBy('log.created_on', 'DESC')
        .take(limit);
      if (options.integration_id) {
        candidatesQb.andWhere('log.integration_id = :iid', {
          iid: options.integration_id,
        });
      }
      const candidates = await candidatesQb.getMany();

      // Deduplicate to the latest 332 per reference_id (PT payment id).
      const latestByRef = new Map<string, XeroSyncLogs>();
      for (const row of candidates) {
        if (!latestByRef.has(row.reference_id)) {
          latestByRef.set(row.reference_id, row);
        }
      }
      summary.scanned = latestByRef.size;
      this.logger.log(
        `${PREFIX} scanning ${summary.scanned} unique failed payment(s) (lookback=${lookbackDays}d, integration_id=${options.integration_id || 'ALL'})`,
      );

      for (const [refId, failedLog] of latestByRef.entries()) {
        try {
          // Reconstruct CreatePaymentInput from the failed log's api_payload.
          const payload: any = { ...(failedLog.api_payload || {}) };
          // Strip log-only / server-side fields so they don't pollute
          // the createPayment validation surface.
          delete payload.mapping_project_id;
          delete payload.mapping_payment_claim_id;
          delete payload.mapping_bank_account_id;
          delete payload.unmapping_invoice_id;

          // Route the in-place update back to the original 332 row.
          // `insertXeroSyncLogs` treats a non-empty `id` as UPDATE, so
          // every log write inside `createPayment` will mutate the
          // legacy Failed row instead of inserting a new one — the
          // user's "Failed" view heals itself.
          payload.sync_id = failedLog.id;

          const ptPaymentId = Number(payload.payment_id);
          if (!ptPaymentId || Number.isNaN(ptPaymentId)) {
            summary.skipped++;
            this.logger.log(
              `${PREFIX} skipping log id=${failedLog.id}: missing payment_id in api_payload`,
            );
            continue;
          }

          // Re-invoke createPayment — the inline Task #51 recovery
          // path will classify the result and (via insertXeroSyncLogs
          // UPDATE) flip the legacy 332 row to the correct template.
          const result = await this.createPayment(
            decoded,
            payload as CreatePaymentInput,
          );

          // Re-read the now-updated original row to classify outcome.
          const updated = await this.xeroPayments.manager
            .getRepository(XeroSyncLogs)
            .findOne({ where: { id: failedLog.id } });
          const tpl = updated?.log_template_id;

          if (tpl === 493 || tpl === 168) {
            summary.recovered++;
          } else if (tpl === 494) {
            summary.classified++;
          } else if (tpl === 332) {
            summary.failed++;
          } else {
            // Validation gate (171/177/180/190/etc.) caught the row;
            // the legacy Failed log has been healed to a more accurate
            // failure reason. Count as classified so users know the
            // row was acted on.
            summary.classified++;
          }

          // result is unused for classification but logged for trace.
          if (result === false) {
            this.logger.log(
              `${PREFIX} reference_id=${refId} createPayment returned false; final template=${tpl}`,
            );
          }
        } catch (err: any) {
          summary.failed++;
          const msg = await handleAxiosError(err);
          summary.errors.push(
            `reference_id=${refId}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`,
          );
          this.logger.log(
            `${PREFIX} retry failed for reference_id=${refId}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`,
          );
        }
      }

      this.logger.log(
        `${PREFIX} done. scanned=${summary.scanned} recovered=${summary.recovered} classified=${summary.classified} skipped=${summary.skipped} failed=${summary.failed}`,
      );
      return summary;
    } catch (err: any) {
      const msg = await handleAxiosError(err);
      this.logger.error(
        `${PREFIX} top-level failure: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`,
      );
      summary.errors.push(
        `top-level: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`,
      );
      return summary;
    }
  }

  async createOverPayment(decoded: any, data: CreateOverPaymentInput) {
    try {
      const { payment_id, bank_account_id, amount, payment_date } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 208,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 210,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const accountDetails = await this.bankAccounts.findOne({
        where: { bank_account_id },
      });
      if (!accountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 209,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          pt_bank_account_id: bank_account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentInXero',
          api_payload: { ...data, mapping_bank_account_id: bank_account_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 211,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
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
          api_name: 'createOverPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 212,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Client/supplier details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
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
      if (!xeroContactDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentInXero',
          api_payload: {
            ...data,
            mapping_client_supplier_id: claimDetails.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 213,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      try {
        const dateValue = moment(payment_date).toDate();

        const contact: Contact = {
          contactID: xeroContactDetails.contact_id,
        };

        const lineItem: LineItem = {
          description: 'Overpayment',
          quantity: 1.0,
          unitAmount: amount,
        };
        const lineItems = [];
        lineItems.push(lineItem);

        const bankAccount: Account = {
          accountID: xeroBankAccountDetails.account_id,
        };

        const bankTransaction: BankTransaction = {
          type:
            claimDetails.claim_type === 'Billable'
              ? BankTransaction.TypeEnum.SPENDOVERPAYMENT
              : BankTransaction.TypeEnum.RECEIVEOVERPAYMENT,
          contact: contact,
          lineItems: lineItems,
          bankAccount: bankAccount,
          status: BankTransaction.StatusEnum.AUTHORISED,
          lineAmountTypes: LineAmountTypes.NoTax,
          date: dateValue,
        };

        const bankTransactions: BankTransactions = {
          bankTransactions: [bankTransaction],
        };

        const response = await this.xero.accountingApi.createBankTransactions(
          xeroDetails.tenant_id,
          bankTransactions,
        );

        this.logger.log(`Overpayment created: ${JSON.stringify(response.body.bankTransactions[0])}`);
        if (response.body.bankTransactions) {
          const bankTransaction = response.body.bankTransactions[0];
          const overpaymentResponse =
            await this.xero.accountingApi.getOverpayment(
              xeroDetails.tenant_id,
              bankTransaction?.overpaymentID,
            );
          this.logger.log(`opRes: ${JSON.stringify(overpaymentResponse.body.overpayments[0])}`);
          const overpayment = overpaymentResponse.body.overpayments[0];
          let requestData: any = {
            payment_id: bankTransaction.bankTransactionID,
            overpayment_id: bankTransaction.overpaymentID,
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            contact_id: xeroContactDetails.id,
            account_id: xeroBankAccountDetails.id,
            payment_type: overpayment.type,
            status: overpayment.status,
            payment_date: overpayment.date,
            reference: bankTransaction.reference,
            payment_amount: overpayment.total,
            is_reconciled: bankTransaction.isReconciled,
            pt_payment_id: payment_id,
            mapped_status: 'System',
            created_on: overpayment.updatedDateUTC,
            created_by: decoded?.userId,
            created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          };
          this.logger.log(`requestData: ${JSON.stringify(requestData)}`);
          const xeroPayments = await this.xeroPayments.create(requestData);
          const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 214,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: null,
            xero_records: [overpayment],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        } else {
          const errMsg = await handleAxiosError(response);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'createOverPaymentInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 333,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
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
            api_name: 'createOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 333,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [paymentDetails],
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

  async createOverPaymentRefund(
    decoded: any,
    data: CreateOverPaymentRefundInput,
  ) {
    try {
      const { payment_id, overpayment_id } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const overpaymentDetails = await this.paymentDetails.findOne({
        where: { payment_id: overpayment_id },
      });
      if (!overpaymentDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 216,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Over payment details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments: any = await this.xeroPayments.findOne({
        where: {
          pt_payment_id: overpayment_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroPayments) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: { ...data, mapping_payment_id: overpayment_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 202,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Over Payment is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // if (xeroPayments.status !== 'AUTHORISED') {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'createOverPaymentRefundInXero',
      //     api_payload: {
      //       ...data,
      //       unmapping_payment_id: xeroPayments?.payment_id,
      //     },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id: 203,
      //     dynamic_values: {},
      //     project_id: null,
      //     contract_id: null,
      //     reference: {
      //       xeroId: null,
      //       paytradeId: paymentDetails?.id,
      //     },
      //     reference_id: paymentDetails?.id,
      //     history: [
      //       `API triggered from payment ${paymentDetails?.payment_id}`,
      //       'Export failed',
      //     ],
      //     important_checks: {
      //       'Import data format validation': 'Failed',
      //     },
      //     error_message: `This overpayment has been already ${xeroPayments?.status?.toLowerCase()}`,
      //     xero_records: [],
      //     paytrade_records: [paymentDetails],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 217,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 334,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroBankAccountDetails = await this.xeroBankAccountDetails.findOne({
        where: {
          id: xeroPayments.account_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroBankAccountDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 219,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account is not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // const accountDetails = await this.bankAccounts.findOne({
      //   where: { bank_account_id: xeroBankAccountDetails.pt_bank_account_id },
      // });
      if (!xeroBankAccountDetails.pt_bank_account_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: {
            ...data,
            mapping_account_id: xeroPayments.account_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 218,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Account details not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
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
          api_name: 'createOverPaymentRefundInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 220,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Client/supplier details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
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
      if (!xeroContactDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createOverPaymentRefundInXero',
          api_payload: {
            ...data,
            mapping_client_supplier_id: claimDetails.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 221,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        xeroPayments.overpayment_id &&
        [
          'Overpayment refund from supplier',
          'Overpayment refund to client',
        ].includes(paymentDetails?.payment_type)
      ) {
        const xeroPayment =
          await await this.xero.accountingApi.getBankTransaction(
            xeroDetails.tenant_id,
            xeroPayments.payment_id,
          );

        if (
          !xeroPayment ||
          !xeroPayment?.body?.bankTransactions ||
          xeroPayment?.body?.bankTransactions?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'createOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 205,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: `Over Payment details not found in xero`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(
          `xeroPayments: ${xeroPayments?.status} - ${JSON.stringify(xeroPayment?.body?.bankTransactions[0])}`,
        );

        const xeroOverpayment = await this.xero.accountingApi.getOverpayment(
          xeroDetails.tenant_id,
          xeroPayment?.body?.bankTransactions[0]?.overpaymentID,
        );

        if (
          !xeroOverpayment ||
          !xeroOverpayment?.body?.overpayments ||
          xeroOverpayment?.body?.overpayments?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'createOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 205,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: `Over Payment details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(`xeroOverpayment: ${JSON.stringify(xeroOverpayment.body.overpayments[0])}`);
        if (
          xeroPayments.status === 'PAID' &&
          xeroOverpayment?.body?.overpayments[0]?.status ===
            Overpayment.StatusEnum.PAID
        ) {
          const xeroRefundPayments = xeroPayments;
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 222,
            dynamic_values: { id: xeroRefundPayments?.id },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: xeroRefundPayments?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroPayment?.body?.bankTransactions[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroRefundPayments;
        }
        try {
          const overpayment = xeroOverpayment.body.overpayments[0];
          const dateValue = moment.utc().toDate();
          const payment: Payment = {
            overpayment: { overpaymentID: overpayment.overpaymentID },
            account: {
              accountID:
                xeroPayment?.body?.bankTransactions[0]?.bankAccount?.accountID,
            },
            amount: paymentDetails.total_amount, //overpayment.total,
            date: dateValue,
            status: Payment.StatusEnum.AUTHORISED,
            reference: 'Overpayment refund event from Pay Trade',
          };

          const response = await this.xero.accountingApi.createPayment(
            xeroDetails.tenant_id,
            payment,
          );
          this.logger.log(
            `response over payment deleted: ${JSON.stringify(response?.body?.payments[0])}`,
          );
          if (response?.body?.payments?.length > 0) {
            let refundIds = xeroPayments.overpayment_refund_id
                ? xeroPayments.overpayment_refund_id
                : [],
              requestData = [];
            for (let refundPayment of response?.body?.payments) {
              const refundDetails = await this.xero.accountingApi.getPayment(
                xeroDetails.tenant_id,
                refundPayment.paymentID,
              );
              this.logger.log(`refundDetails: ${JSON.stringify(refundDetails?.body?.payments[0])}`);
              const payment = refundDetails.body.payments[0];

              if (!refundIds.includes(payment.paymentID)) {
                refundIds.push(payment.paymentID);
                requestData.push({
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
                  pt_payment_id: payment_id,
                  mapped_status: 'System',
                  created_on: payment.updatedDateUTC,
                  created_by: decoded?.userId,
                  created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                });
              }
            }

            xeroPayments.status =
              response?.body?.payments[0]?.overpayment?.status;
            xeroPayments.overpayment_refund_id = refundIds;
            await this.xeroPayments.save(xeroPayments);

            this.logger.log(`requestData: ${JSON.stringify(requestData)}`);
            if (requestData && requestData.length > 0) {
              if (requestData.length == 1) {
                const newXeroPayments =
                  await this.xeroPayments.create(requestData);
                const xeroRefundPayments: any =
                  await this.xeroPayments.save(newXeroPayments);
                this.logger.log(`xeroRefundPayments: ${JSON.stringify(xeroRefundPayments)}`);
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 222,
                  dynamic_values: { id: xeroRefundPayments?.id },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroRefundPayments?.id,
                    paytradeId: paymentDetails?.id,
                  },
                  reference_id: paymentDetails?.id,
                  history: [
                    `API triggered from payment ${paymentDetails?.payment_id}`,
                    'Export successful',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [response?.body?.payments[0]],
                  paytrade_records: [paymentDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return xeroRefundPayments;
              } else {
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  api_name: 'createOverPaymentRefundInXero',
                  api_payload: { ...data },
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 206,
                  dynamic_values: {},
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: null,
                    paytradeId: paymentDetails?.id,
                  },
                  reference_id: paymentDetails?.id,
                  history: [
                    `API triggered from payment ${paymentDetails?.payment_id}`,
                    'Export failed',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                  },
                  error_message: `Refund details are not in sync. Multiple refunds found.`,
                  xero_records: [],
                  paytrade_records: [paymentDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }
            }
          } else {
            const errMsg = await handleAxiosError(response);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createOverPaymentRefundInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 223,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
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
              api_name: 'createOverPaymentRefundInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 223,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  /**
   * Task #60 — Auto-recover stuck retention BankTransfer write paths.
   *
   * Mirrors the Task #54 recovery wrapper (createPayment outbound) for the
   * reversal/cleanup call sites — `deletePaymentLeg` (single-leg un-tick),
   * `deletePaymentPerLeg` (per-leg dual un-tick), and the legacy combined
   * `deletePayment` path. All of these post a brand new "reversing"
   * BankTransfer back to Xero and previously emitted a generic Failed log
   * (template 173) if Xero rejected the call, leaving PT and Xero out of
   * sync with no actionable hint.
   *
   * Pattern: try the create → on rejection detect known patterns
   * (duplicate reference, account problem, insufficient balance) → look
   * up an existing transfer that already carries the supplied PT
   * reference → either short-circuit (link it, sync log 495) or surface a
   * dedicated Failed log (496 / 497 / 498). Reversals are now stamped
   * with `PT-RET-REV-{payment_id}` so subsequent retries can recover via
   * the same reference-lookup shortcut.
   *
   * Returns:
   *   • transferId             — the BankTransfer id to persist (newly
   *                              created, recovered, or null on failure).
   *   • recovered              — true when 495 (recovered via lookup) was
   *                              written; caller should NOT also write
   *                              its own success log (491/492/170) for
   *                              this leg, mirroring Task #54.
   *   • failedWithoutRecovery  — true when the create failed AND no
   *                              recovery match was found; the dedicated
   *                              496/497/498 log was already written.
   *   • errMsg                 — the underlying Xero error message when
   *                              failedWithoutRecovery is true; null
   *                              otherwise.
   */
  private async tryCreateBankTransferWithRecovery(
    decoded: any,
    ctx: {
      sync_id?: any;
      api_name: string;
      api_payload: any;
      integration_id: any;
      tenant_id: string;
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      date: Date | string;
      reference: string;
      paymentDetails: any;
      xeroInvoicesBills: any;
      history_prefix: string;
    },
  ): Promise<{
    transferId: string | null;
    reference: string;
    recovered: boolean;
    failedWithoutRecovery: boolean;
    errMsg: string | null;
  }> {
    const {
      tenant_id,
      fromAccountId,
      toAccountId,
      amount,
      date,
      reference,
    } = ctx;
    try {
      const bankTransfer: BankTransfer = {
        fromBankAccount: { accountID: fromAccountId },
        toBankAccount: { accountID: toAccountId },
        amount,
        date:
          date instanceof Date
            ? date.toISOString().slice(0, 10)
            : date,
        reference,
      };
      const resp = await this.xero.accountingApi.createBankTransfer(
        tenant_id,
        { bankTransfers: [bankTransfer] },
      );
      const tid =
        resp?.body?.bankTransfers?.[0]?.bankTransferID || null;
      return {
        transferId: tid,
        reference,
        recovered: false,
        failedWithoutRecovery: false,
        errMsg: null,
      };
    } catch (transferErr) {
      const errMsg = await handleAxiosError(transferErr);
      this.logger.log(
        `[Task#60 transfer-recovery] reference=${reference} createBankTransfer failed: ${errMsg}`,
      );
      const lower =
        typeof errMsg === 'string' ? errMsg.toLowerCase() : '';
      const isDuplicateRef =
        /duplicate|already\s+exists|reference.*(unique|exists)|unique.*reference/.test(
          lower,
        );
      const isAccountMismatch =
        /from.*bank.*account|to.*bank.*account|same\s+account|invalid\s+account|account.*not.*valid|account.*does\s*not\s*exist|bankaccount/.test(
          lower,
        );
      const isInsufficientBalance =
        /insufficient|not\s+enough|balance|funds/.test(lower);
      const isKnownPattern =
        isDuplicateRef || isAccountMismatch || isInsufficientBalance;

      let recovered: any = null;
      if (isKnownPattern) {
        try {
          const lookbackDate = moment(date).subtract(60, 'days').toDate();
          const existingResp =
            await this.xero.accountingApi.getBankTransfers(
              tenant_id,
              lookbackDate,
              null,
              'Date DESC',
            );
          const candidates = existingResp?.body?.bankTransfers || [];
          recovered =
            candidates.find(
              (t: any) =>
                typeof t?.reference === 'string' &&
                t.reference === reference,
            ) || null;
          this.logger.log(
            `[Task#60 transfer-recovery] candidate count=${candidates.length} matched_by_ref=${!!recovered}`,
          );
        } catch (lookupErr) {
          this.logger.log(
            `[Task#60 transfer-recovery] getBankTransfers failed: ${await handleAxiosError(lookupErr)}`,
          );
        }
      }

      if (recovered?.bankTransferID) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: ctx.sync_id,
          api_name: ctx.api_name,
          api_payload: ctx.api_payload,
          integration_id: ctx.integration_id,
          log_template_id: 495,
          dynamic_values: {
            reference,
            bank_transfer_id: recovered.bankTransferID,
          },
          project_id: ctx.xeroInvoicesBills?.project_id,
          contract_id: ctx.xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: recovered.bankTransferID,
            paytradeId: ctx.paymentDetails?.id,
          },
          reference_id: ctx.paymentDetails?.id,
          history: [
            ctx.history_prefix,
            `Recovered: linked existing Xero BankTransfer ${recovered.bankTransferID} via reference ${reference}`,
          ],
          important_checks: { 'Import data format validation': 'Ok' },
          error_message: null,
          xero_records: [recovered],
          paytrade_records: [ctx.paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return {
          transferId: recovered.bankTransferID,
          reference,
          recovered: true,
          failedWithoutRecovery: false,
          errMsg: null,
        };
      }

      let log_template_id = 498;
      let history_tail = `Xero rejected the BankTransfer and no existing transfer with reference ${reference} was found: ${errMsg}`;
      if (isDuplicateRef) {
        log_template_id = 496;
        history_tail = `Xero rejected the BankTransfer as a duplicate reference, but no existing transfer with reference ${reference} was found in Xero — manual reconciliation may be required: ${errMsg}`;
      } else if (isAccountMismatch) {
        log_template_id = 497;
        history_tail = `Xero rejected the BankTransfer due to an account problem (from/to accounts equal or invalid): ${errMsg}`;
      } else if (isInsufficientBalance) {
        log_template_id = 498;
        history_tail = `Xero rejected the BankTransfer (insufficient balance or similar): ${errMsg}`;
      }
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: ctx.sync_id,
        api_name: ctx.api_name,
        api_payload: ctx.api_payload,
        integration_id: ctx.integration_id,
        log_template_id,
        dynamic_values: {
          reference,
          retention_amount: Number(amount).toFixed(2),
          error: errMsg,
        },
        project_id: ctx.xeroInvoicesBills?.project_id,
        contract_id: ctx.xeroInvoicesBills?.contract_id,
        reference: {
          xeroId: null,
          paytradeId: ctx.paymentDetails?.id,
        },
        reference_id: ctx.paymentDetails?.id,
        history: [ctx.history_prefix, history_tail],
        important_checks: { 'Import data format validation': 'Ok' },
        error_message: errMsg,
        xero_records: [],
        paytrade_records: [ctx.paymentDetails],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return {
        transferId: null,
        reference,
        recovered: false,
        failedWithoutRecovery: true,
        errMsg,
      };
    }
  }

  /**
   * Task #52 — Delete one leg of a synced payment in Xero when the user
   * un-ticks the corresponding confirmation checkbox.
   *
   *   leg='payment'  → calls accountingApi.deletePayment (status DELETED) and
   *                    clears xero_payments.payment_id.
   *   leg='transfer' → posts a *reversing* BankTransfer (Xero has no
   *                    deleteBankTransfer endpoint), updates
   *                    xero_payments.bank_transfer_id to the reversal id, and
   *                    clears bank_transfer_reference.
   *
   * Silent no-op when (a) Xero isn't connected, (b) no xero_payments row
   * exists, or (c) the targeted leg's id is already null. On Xero rejection
   * (e.g. reconciled payment) the method writes a sync log and rethrows so
   * the resolver surfaces a toast and the PT-side flag stays in sync with
   * Xero.
   */
  async deletePaymentLeg(
    decoded: any,
    data: DeletePaymentInput & { leg: 'payment' | 'transfer' },
  ) {
    const {
      payment_id,
      leg,
      bank_account_id,
      retention_account,
      retention_amount,
    } = data;

    const paymentDetails = await this.getPaymentDetails(payment_id);
    if (!paymentDetails) {
      throw `Payment details not found`;
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (
      !xeroDetails ||
      !xeroDetails.integration_id ||
      !xeroDetails?.integrationDetails
    ) {
      return false;
    }
    if (
      xeroDetails.integrationDetails.integration_status !==
      'Connected - active'
    ) {
      throw `Paytrade is currently not active in Xero.`;
    }

    await this.xeroService.refreshTokenSet(
      paymentDetails.company_id,
      this.xero,
    );

    const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
      where: {
        pt_claim_id: paymentDetails.payment_claim_id,
        integration_id: xeroDetails.integration_id,
      },
    });

    const xeroPayments: any = await this.xeroPayments.findOne({
      where: {
        pt_payment_id: payment_id,
        integration_id: xeroDetails.integration_id,
      },
    });
    if (!xeroPayments) {
      return false;
    }

    try {
      if (leg === 'payment') {
        if (!xeroPayments.payment_id) {
          return false;
        }
        const paymentDelete: PaymentDelete = { status: 'DELETED' };
        const response = await this.xero.accountingApi.deletePayment(
          xeroDetails.tenant_id,
          xeroPayments.payment_id,
          paymentDelete,
        );
        if (response.response.data?.Payments[0]?.Status === 'DELETED') {
          const deletedPaymentXeroId = xeroPayments.payment_id;
          xeroPayments.payment_id = null;
          if (!xeroPayments.bank_transfer_id) {
            xeroPayments.status = 'DELETED';
          }
          const xeroResponse: any =
            await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentLegInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 491,
            dynamic_values: {
              payment_id: deletedPaymentXeroId,
              invoice_number: xeroInvoicesBills?.reference || '',
            },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: deletedPaymentXeroId,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `Confirm Paid un-ticked on payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: { 'Import data format validation': 'Ok' },
            error_message: null,
            xero_records: [response.response.data?.Payments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        }
        const errMsg = await handleAxiosError(response);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentLegInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 173,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: xeroPayments.payment_id,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `Confirm Paid un-ticked on payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: { 'Import data format validation': 'Ok' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw errMsg;
      }

      if (leg === 'transfer') {
        if (!xeroPayments.bank_transfer_id) {
          return false;
        }
        const opAcc = await this.xeroBankAccountDetails.findOne({
          where: {
            pt_bank_account_id: bank_account_id,
            integration_id: xeroDetails.integration_id,
          },
        });
        const retAcc = await this.xeroBankAccountDetails.findOne({
          where: {
            pt_bank_account_id: retention_account,
            integration_id: xeroDetails.integration_id,
          },
        });
        if (!opAcc || !retAcc) {
          throw `Bank account mapping not found for retention transfer reversal`;
        }
        const dateValue = moment.utc().toDate();
        // Task #60 — wrap the reversal in the recovery helper. Stamp the
        // reversal with `PT-RET-REV-{payment_id}` so subsequent retries
        // can short-circuit via reference lookup if Xero rejected the
        // first attempt after actually persisting the reversal.
        const reversalRef = `PT-RET-REV-${payment_id}`;
        const recoveryResult = await this.tryCreateBankTransferWithRecovery(
          decoded,
          {
            sync_id: data?.sync_id,
            api_name: 'deletePaymentLegInXero',
            api_payload: { ...data, leg: 'transfer' },
            integration_id: xeroDetails.integration_id,
            tenant_id: xeroDetails.tenant_id,
            fromAccountId: retAcc.account_id,
            toAccountId: opAcc.account_id,
            amount: retention_amount,
            date: dateValue,
            reference: reversalRef,
            paymentDetails,
            xeroInvoicesBills,
            history_prefix: `Confirm Retention un-ticked on payment ${paymentDetails?.payment_id}`,
          },
        );
        if (recoveryResult.failedWithoutRecovery) {
          // Dedicated 496 / 497 / 498 sync log already written. Surface
          // the underlying Xero error so the resolver can revert the
          // un-tick — the BankTransfer is still live in Xero.
          throw recoveryResult.errMsg;
        }
        const reversalId = recoveryResult.transferId;
        const originalTransferId = xeroPayments.bank_transfer_id;
        // Idempotency: clear the leg pointer so the resolver's
        // `transferLegSynced` check is false on subsequent saves and we
        // never post a second reversal. The reversal id is preserved in the
        // sync log (`xero_records` + `dynamic_values.reversal_id`) for audit.
        xeroPayments.bank_transfer_id = null;
        xeroPayments.bank_transfer_reference = null;
        if (!xeroPayments.payment_id) {
          xeroPayments.status = 'DELETED';
        }
        const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
        // When recovery short-circuited, the helper already wrote the
        // 495 (Recovered) sync log; suppress the 492 success log here so
        // operators don't see a Recovered + Succeeded pair for the same
        // run (mirrors the Task #54 suppression of template 168).
        if (!recoveryResult.recovered) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentLegInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 492,
            dynamic_values: {
              bank_transfer_id: originalTransferId,
              reversal_id: reversalId,
            },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: reversalId,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `Confirm Retention un-ticked on payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: { 'Import data format validation': 'Ok' },
            error_message: null,
            xero_records: reversalId ? [{ bankTransferID: reversalId }] : [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        }
        return xeroResponse;
      }

      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async deletePayment(decoded: any, data: DeletePaymentInput) {
    try {
      const {
        payment_id,
        bank_account_id,
        cash_retention,
        retention_account,
        retention_amount,
      } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 335,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 336,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments: any = await this.xeroPayments.findOne({
        where: {
          pt_payment_id: payment_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      // ---------------------------------------------------------
      // Task #52 — Per-leg delete path. When the caller explicitly
      // passes either delete_payment or delete_transfer (true OR
      // false), we route through the per-leg helper so that:
      //   • single-leg un-tick deletes only the requested leg, and
      //   • both-leg un-tick (both flags === true) still runs each
      //     leg back-to-back via the per-leg helper, producing the
      //     correct 491 / 492 sync log entries.
      // The legacy combined path below stays unchanged for the
      // existing "Unconfirmed - Unmatched" call site (which omits
      // the flags entirely → both undefined → legacy behaviour).
      // ---------------------------------------------------------
      const flagsExplicit =
        data.delete_payment !== undefined ||
        data.delete_transfer !== undefined;
      const wantDelPayment = data.delete_payment !== false;
      const wantDelTransfer = data.delete_transfer !== false;
      const isPerLegMode = flagsExplicit;
      if (isPerLegMode && xeroPayments) {
        return await this.deletePaymentPerLeg(decoded, data, {
          paymentDetails,
          xeroDetails,
          xeroInvoicesBills,
          xeroPayments,
          wantDelPayment,
          wantDelTransfer,
        });
      }

      if (!xeroPayments) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: { ...data, mapping_payment_id: payment_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 195,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Payment is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // if (
      //   xeroPayments &&
      //   xeroPayments.status !== Payment.StatusEnum.AUTHORISED
      // ) {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'deletePaymentInXero',
      //     api_payload: {
      //       ...data,
      //       unmapping_payment_id: xeroPayments?.payment_id,
      //     },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id: 207,
      //     dynamic_values: {},
      //     project_id: xeroInvoicesBills?.project_id,
      //     contract_id: xeroInvoicesBills?.contract_id,
      //     reference: {
      //       xeroId: null,
      //       paytradeId: paymentDetails?.id,
      //     },
      //     reference_id: paymentDetails?.id,
      //     history: [
      //       `API triggered from payment ${paymentDetails?.payment_id}`,
      //       'Export failed',
      //     ],
      //     important_checks: {
      //       'Import data format validation': 'Failed',
      //     },
      //     error_message: `Payment was already in ${xeroPayments.status?.toLowerCase()} state`,
      //     xero_records: [],
      //     paytrade_records: [paymentDetails],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }

      if (
        xeroPayments.payment_id &&
        ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
          paymentDetails?.payment_type,
        )
      ) {
        const accountDetails = await this.bankAccounts.findOne({
          where: { bank_account_id },
        });
        if (!accountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 191,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const xeroBankAccountDetails =
          await this.xeroBankAccountDetails.findOne({
            where: {
              pt_bank_account_id: bank_account_id,
              integration_id: xeroDetails.integration_id,
            },
          });
        if (!xeroBankAccountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data, mapping_bank_account_id: bank_account_id },
            integration_id: xeroDetails.integration_id,
            log_template_id: 192,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account is not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        const retentionAccountDetails = cash_retention
          ? await this.bankAccounts.findOne({
              where: { bank_account_id: retention_account },
            })
          : null;
        if (cash_retention && !retentionAccountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 193,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Retention account details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const xeroRetentionBankAccountDetails = cash_retention
          ? await this.xeroBankAccountDetails.findOne({
              where: {
                pt_bank_account_id: retention_account,
                integration_id: xeroDetails.integration_id,
              },
            })
          : null;
        if (cash_retention && !xeroRetentionBankAccountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: {
              ...data,
              mapping_retention_account: retention_account,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 194,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Retention account is not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const xeroPayment = await await this.xero.accountingApi.getPayment(
          xeroDetails.tenant_id,
          xeroPayments.payment_id,
        );

        if (
          !xeroPayment ||
          !xeroPayment?.body?.payments ||
          xeroPayment?.body?.payments?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 196,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Payment details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(
          `xeroPayments status: ${xeroPayments.status} - ${xeroPayment?.body?.payments[0]?.status}`,
        );
        if (
          xeroPayments.status === 'DELETED' &&
          xeroPayment?.body?.payments[0]?.status === Payment.StatusEnum.DELETED
        ) {
          const xeroResponse: any = xeroPayments;
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 170,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroPayment?.body?.payments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        } else if (
          xeroPayments.status !== 'DELETED' &&
          xeroPayment?.body?.payments[0]?.status === Payment.StatusEnum.DELETED
        ) {
          xeroPayments.status = 'DELETED';
          const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 170,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroPayment?.body?.payments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        }
        try {
          const paymentDelete: PaymentDelete = {
            status: 'DELETED',
          };

          const response = await this.xero.accountingApi.deletePayment(
            xeroDetails.tenant_id,
            xeroPayments.payment_id,
            paymentDelete,
          );
          this.logger.log(
            `response deleted: ${response.response.data?.Payments[0]?.Status}`,
          );
          if (response.response.data?.Payments[0]?.Status === 'DELETED') {
            let bank_transfer_id = xeroPayments.bank_transfer_id || null;
            if (cash_retention) {
              const dateValue = moment.utc().toDate();
              // Task #60 — wrap the legacy combined-path reversal in the
              // recovery helper. Stamp the reversal so subsequent retries
              // (e.g. after a transient Xero rejection) can short-circuit
              // via reference lookup. The Payment delete leg above is
              // already irreversible at this point, so a reversal failure
              // here must NOT throw — it surfaces a dedicated 496/497/498
              // log and continues with `bank_transfer_id = null` so the
              // PT-side state still matches the deleted Payment in Xero.
              const reversalRef = `PT-RET-REV-${payment_id}`;
              const recoveryResult =
                await this.tryCreateBankTransferWithRecovery(decoded, {
                  sync_id: data?.sync_id,
                  api_name: 'deletePaymentInXero',
                  api_payload: { ...data, leg: 'transfer-legacy' },
                  integration_id: xeroDetails.integration_id,
                  tenant_id: xeroDetails.tenant_id,
                  fromAccountId:
                    xeroRetentionBankAccountDetails.account_id, // trust account
                  toAccountId: xeroBankAccountDetails.account_id, // main account
                  amount: retention_amount,
                  date: dateValue,
                  reference: reversalRef,
                  paymentDetails,
                  xeroInvoicesBills,
                  history_prefix: `API triggered from payment ${paymentDetails?.payment_id}`,
                });
              if (recoveryResult.transferId) {
                bank_transfer_id = recoveryResult.transferId;
                this.logger.log(
                  `retention reversal id=${bank_transfer_id} recovered=${recoveryResult.recovered}`,
                );
              } else {
                bank_transfer_id = null;
              }
            }

            xeroPayments.status = response.response.data?.Payments[0]?.Status;
            xeroPayments.bank_transfer_id = bank_transfer_id;
            const xeroResponse: any =
              await this.xeroPayments.save(xeroPayments);

            const xeroRes = await await this.xero.accountingApi.getPayment(
              xeroDetails.tenant_id,
              xeroPayments.payment_id,
            );

            this.logger.log(`xeroRes: ${JSON.stringify(xeroRes)}`);
            if (
              xeroRes &&
              xeroRes?.body?.payments &&
              xeroRes?.body?.payments?.length > 0 &&
              xeroRes?.body?.payments[0]?.status === Payment.StatusEnum.DELETED
            ) {
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 170,
                dynamic_values: { id: xeroResponse?.id },
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export successful',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                },
                error_message: null,
                xero_records: [xeroRes?.body?.payments[0]],
                paytrade_records: [paymentDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
            }
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(response);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deletePaymentInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 173,
                dynamic_values: {},
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
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
              api_name: 'deletePaymentInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 173,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } else if (
        !xeroPayments.payment_id &&
        ['Pay Less - Full', 'Pay Less - Part'].includes(
          paymentDetails?.payment_type,
        )
      ) {
        xeroPayments.status = 'DELETED';
        const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 170,
          dynamic_values: { id: xeroResponse?.id },
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: xeroResponse?.id,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export successful',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
          },
          error_message: null,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return xeroResponse;
      }
      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  // ---------------------------------------------------------------
  // Task #52 — Per-leg delete helper.
  // Runs the Payment delete leg and/or the BankTransfer reversal
  // leg independently. Caller (resolver edit-path) decides which
  // legs to fire based on per-checkbox un-tick detection.
  // ---------------------------------------------------------------
  private async deletePaymentPerLeg(
    decoded: any,
    data: DeletePaymentInput,
    ctx: {
      paymentDetails: any;
      xeroDetails: any;
      xeroInvoicesBills: any;
      xeroPayments: any;
      wantDelPayment: boolean;
      wantDelTransfer: boolean;
    },
  ) {
    const {
      paymentDetails,
      xeroDetails,
      xeroInvoicesBills,
      xeroPayments,
      wantDelPayment,
      wantDelTransfer,
    } = ctx;
    const { bank_account_id, retention_account, cash_retention } = data;

    const doPaymentLeg = wantDelPayment && !!xeroPayments.payment_id;
    const doTransferLeg =
      wantDelTransfer && !!cash_retention && !!xeroPayments.bank_transfer_id;

    if (!doPaymentLeg && !doTransferLeg) {
      // Nothing to do — either flag was off or the leg was never synced.
      return xeroPayments;
    }

    // -----------------------------------------------------------
    // Task #52 — per-leg result tracking. Each leg is run inside
    // its own try/catch so that a transfer failure cannot reverse
    // a successful payment-leg delete (Xero `accountingApi.deletePayment`
    // is irreversible — once `status: DELETED` the row is gone).
    // We collect per-leg outcomes and, if any leg failed, throw a
    // single Error with `legResults` attached so the resolver can
    // revert ONLY the un-tick(s) that did not actually persist in
    // Xero, keeping PT and Xero strictly in sync.
    //
    // In dual-leg mode we additionally pre-validate the transfer
    // leg's prerequisites (bank-account mappings) BEFORE running
    // the irreversible payment-leg delete, to minimise the chance
    // of a partial-success outcome.
    // -----------------------------------------------------------
    const legResults: {
      paymentRequested: boolean;
      paymentDeleted: boolean;
      transferRequested: boolean;
      transferReversed: boolean;
      errors: string[];
    } = {
      paymentRequested: doPaymentLeg,
      paymentDeleted: false,
      transferRequested: doTransferLeg,
      transferReversed: false,
      errors: [],
    };

    let preResolvedFromAccount: any = null;
    let preResolvedRetentionAccount: any = null;
    if (doPaymentLeg && doTransferLeg) {
      preResolvedFromAccount = bank_account_id
        ? await this.xeroBankAccountDetails.findOne({
            where: {
              pt_bank_account_id: bank_account_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;
      preResolvedRetentionAccount = retention_account
        ? await this.xeroBankAccountDetails.findOne({
            where: {
              pt_bank_account_id: retention_account,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!preResolvedFromAccount || !preResolvedRetentionAccount) {
        // Pre-validation failure — bail BEFORE the irreversible
        // payment-leg delete. Log under template 173/192/194 with
        // a clear message, and throw so the resolver reverts both
        // un-ticks (nothing was deleted in Xero).
        const errMsg = !preResolvedFromAccount
          ? `Account is not mapped`
          : `Retention account is not mapped`;
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: { ...data, leg: 'transfer-prevalidate' },
          integration_id: xeroDetails.integration_id,
          log_template_id: !preResolvedFromAccount ? 192 : 194,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: { xeroId: null, paytradeId: paymentDetails?.id },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Dual-leg un-tick — transfer prerequisites missing, aborting before payment delete',
          ],
          important_checks: { 'Import data format validation': 'Failed' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        const err: any = new Error(errMsg);
        err.legResults = legResults;
        throw err;
      }
    }

    // -------- Payment delete leg ----------
    if (doPaymentLeg) {
      try {
        const paymentDelete: PaymentDelete = { status: 'DELETED' };
        const response = await this.xero.accountingApi.deletePayment(
          xeroDetails.tenant_id,
          xeroPayments.payment_id,
          paymentDelete,
        );
        if (response.response.data?.Payments[0]?.Status === 'DELETED') {
          legResults.paymentDeleted = true;
          const deletedPaymentId = xeroPayments.payment_id;
          xeroPayments.status = 'DELETED';
          xeroPayments.payment_id = null;
          await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data, leg: 'payment' },
            integration_id: xeroDetails.integration_id,
            log_template_id: 491,
            dynamic_values: {
              payment_id: deletedPaymentId,
              invoice_number: xeroInvoicesBills?.invoice_number || '',
            },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: deletedPaymentId,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Confirm Paid un-ticked — payment deleted in Xero',
            ],
            important_checks: { 'Import data format validation': 'Ok' },
            error_message: null,
            xero_records: [response?.response?.data?.Payments?.[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
        } else {
          const errMsg = await handleAxiosError(response);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data, leg: 'payment' },
            integration_id: xeroDetails.integration_id,
            log_template_id: 173,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Confirm Paid un-tick — payment delete failed',
            ],
            important_checks: { 'Import data format validation': 'Ok' },
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          // Task #52 — capture per-leg failure instead of throwing
          // straight away so a transfer leg can still run (or, when
          // only the payment leg was requested, surface a clear
          // error message at the end of the helper).
          legResults.errors.push(`payment: ${errMsg}`);
        }
      } catch (error) {
        const errMsg = await handleAxiosError(error);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: { ...data, leg: 'payment' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 173,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: { xeroId: null, paytradeId: paymentDetails?.id },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Confirm Paid un-tick — payment delete failed',
          ],
          important_checks: { 'Import data format validation': 'Ok' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        // Task #52 — capture and continue (see note above).
        legResults.errors.push(`payment: ${errMsg}`);
      }
    }

    // -------- BankTransfer reversal leg ----------
    if (doTransferLeg) {
      // Need account mappings for the reversal. Reuse the pre-
      // validated lookups from dual-leg mode when available so we
      // do not double-query.
      const xeroBankAccountDetails =
        preResolvedFromAccount ??
        (bank_account_id
          ? await this.xeroBankAccountDetails.findOne({
              where: {
                pt_bank_account_id: bank_account_id,
                integration_id: xeroDetails.integration_id,
              },
            })
          : null);
      const xeroRetentionBankAccountDetails =
        preResolvedRetentionAccount ??
        (retention_account
          ? await this.xeroBankAccountDetails.findOne({
              where: {
                pt_bank_account_id: retention_account,
                integration_id: xeroDetails.integration_id,
              },
            })
          : null);

      if (!xeroBankAccountDetails || !xeroRetentionBankAccountDetails) {
        const errMsg = !xeroBankAccountDetails
          ? `Account is not mapped`
          : `Retention account is not mapped`;
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deletePaymentInXero',
          api_payload: { ...data, leg: 'transfer' },
          integration_id: xeroDetails.integration_id,
          log_template_id: !xeroBankAccountDetails ? 192 : 194,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: { xeroId: null, paytradeId: paymentDetails?.id },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Confirm Retention un-tick — account is not mapped',
          ],
          important_checks: { 'Import data format validation': 'Failed' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        legResults.errors.push(`transfer: ${errMsg}`);
      } else {
        const reversalAmount = Math.abs(Number(data.retention_amount || 0));
        const dateValue = moment.utc().toDate();
        // Task #60 — wrap the reversal in the recovery helper. Stamp the
        // reversal with `PT-RET-REV-{payment_id}` so subsequent retries
        // can short-circuit via reference lookup. Reversal direction:
        // original was operating → retention; reversal swaps to
        // retention → operating (returns the held funds).
        const reversalRef = `PT-RET-REV-${data.payment_id}`;
        const recoveryResult = await this.tryCreateBankTransferWithRecovery(
          decoded,
          {
            sync_id: data?.sync_id,
            api_name: 'deletePaymentInXero',
            api_payload: { ...data, leg: 'transfer' },
            integration_id: xeroDetails.integration_id,
            tenant_id: xeroDetails.tenant_id,
            fromAccountId: xeroRetentionBankAccountDetails.account_id,
            toAccountId: xeroBankAccountDetails.account_id,
            amount: reversalAmount,
            date: dateValue,
            reference: reversalRef,
            paymentDetails,
            xeroInvoicesBills,
            history_prefix: `API triggered from payment ${paymentDetails?.payment_id}`,
          },
        );

        if (recoveryResult.failedWithoutRecovery) {
          // Dedicated 496 / 497 / 498 sync log already written by the
          // helper. Capture and continue — the per-leg aggregator below
          // throws so the resolver can revert ONLY the un-tick(s) whose
          // Xero side did not persist.
          legResults.errors.push(`transfer: ${recoveryResult.errMsg}`);
        } else {
          const reversalId = recoveryResult.transferId;
          const originalTransferId = xeroPayments.bank_transfer_id;
          xeroPayments.bank_transfer_id = reversalId;
          xeroPayments.bank_transfer_reference = null;
          if (!xeroPayments.payment_id) {
            // Only mark fully DELETED if the payment leg is also gone.
            xeroPayments.status = 'DELETED';
          }
          await this.xeroPayments.save(xeroPayments);
          legResults.transferReversed = true;

          // Suppress the 492 success log when the helper already wrote
          // the 495 (Recovered) log so operators don't see a Recovered +
          // Succeeded pair for the same run (mirrors Task #54).
          if (!recoveryResult.recovered) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'deletePaymentInXero',
              api_payload: { ...data, leg: 'transfer' },
              integration_id: xeroDetails.integration_id,
              log_template_id: 492,
              dynamic_values: {
                bank_transfer_id: originalTransferId,
                reversal_id: reversalId,
              },
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: reversalId,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Confirm Retention un-ticked — reversing transfer posted in Xero',
              ],
              important_checks: { 'Import data format validation': 'Ok' },
              error_message: null,
              xero_records: reversalId
                ? [{ bankTransferID: reversalId }]
                : [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
          }
        }
      } // end else (mappings present)
    }

    // -----------------------------------------------------------
    // Task #52 — final aggregator. If any requested leg failed,
    // throw a single Error with `legResults` attached so the
    // resolver can revert ONLY the un-tick(s) whose Xero side did
    // not persist — payment-leg success + transfer-leg failure
    // must NOT re-tick is_paid_confirmed (Xero record is gone).
    // -----------------------------------------------------------
    const paymentLegFailed =
      legResults.paymentRequested && !legResults.paymentDeleted;
    const transferLegFailed =
      legResults.transferRequested && !legResults.transferReversed;
    if (paymentLegFailed || transferLegFailed) {
      const err: any = new Error(
        legResults.errors.join('; ') || 'Xero delete failed',
      );
      err.legResults = legResults;
      throw err;
    }

    return xeroPayments;
  }

  async deleteOverPayment(decoded: any, data: DeleteOverPaymentInput) {
    try {
      const { payment_id } = data;
      this.logger.log(`overpaymentData: ${JSON.stringify(data)}`);

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 197,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 198,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments: any = await this.xeroPayments.findOne({
        where: {
          pt_payment_id: payment_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroPayments) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentInXero',
          api_payload: { ...data, mapping_payment_id: payment_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 199,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Overpayment is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (xeroPayments && xeroPayments.status !== 'AUTHORISED') {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentInXero',
          api_payload: {
            ...data,
            unmapping_payment_id: xeroPayments?.payment_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 200,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Overpayment was already in ${xeroPayments.status?.toLowerCase()} state`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        xeroPayments.overpayment_id &&
        ['Overpayment to supplier', 'Overpayment from client'].includes(
          paymentDetails?.payment_type,
        )
      ) {
        const xeroBankAccountDetails =
          await this.xeroBankAccountDetails.findOne({
            where: {
              id: xeroPayments?.account_id,
              integration_id: xeroDetails.integration_id,
            },
          });
        if (!xeroBankAccountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 225,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account is not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        // const accountDetails = await this.bankAccounts.findOne({
        //   where: {
        //     bank_account_id: xeroBankAccountDetails?.pt_bank_account_id,
        //   },
        // });
        if (!xeroBankAccountDetails?.pt_bank_account_id) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: {
              ...data,
              mapping_account_id: xeroPayments?.account_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 226,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account details not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const clientSuppliersDetails =
          await this.clientSuppliersDetails.findOne({
            where: { client_supplier_id: claimDetails.client_supplier_id },
          });
        if (!clientSuppliersDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 227,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Client/supplier details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
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
        if (!xeroContactDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: {
              ...data,
              mapping_client_supplier_id: claimDetails.client_supplier_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 228,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Failed',
            },
            error_message: `Contact is not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const xeroPayment =
          await await this.xero.accountingApi.getBankTransaction(
            xeroDetails.tenant_id,
            xeroPayments.payment_id,
          );

        if (
          !xeroPayment ||
          !xeroPayment?.body?.bankTransactions ||
          xeroPayment?.body?.bankTransactions?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 204,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: `Overpayment details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(
          `xeroPayments: ${xeroPayments?.status} - ${JSON.stringify(xeroPayment?.body?.bankTransactions[0])}`,
        );

        const xeroOverpayment = await this.xero.accountingApi.getOverpayment(
          xeroDetails.tenant_id,
          xeroPayment?.body?.bankTransactions[0]?.overpaymentID,
        );

        if (
          !xeroOverpayment ||
          !xeroOverpayment?.body?.overpayments ||
          xeroOverpayment?.body?.overpayments?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 204,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: `Over Payment details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(`xeroOverpayment: ${JSON.stringify(xeroOverpayment.body.overpayments[0])}`);
        if (
          xeroPayments.status === 'PAID' &&
          xeroOverpayment?.body?.overpayments[0]?.status ===
            Overpayment.StatusEnum.PAID
        ) {
          const xeroResponse: any = xeroPayments;
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 224,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroOverpayment?.body?.overpayments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        } else if (
          xeroPayments.status !== 'PAID' &&
          xeroOverpayment?.body?.overpayments[0]?.status ===
            Overpayment.StatusEnum.PAID
        ) {
          xeroPayments.status = xeroOverpayment?.body?.overpayments[0]?.status;
          const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 224,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroOverpayment?.body?.overpayments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        }
        try {
          const overpayment = xeroOverpayment.body.overpayments[0];
          const dateValue = moment.utc().toDate();
          const payment: Payment = {
            overpayment: { overpaymentID: overpayment.overpaymentID },
            account: {
              accountID:
                xeroPayment?.body?.bankTransactions[0]?.bankAccount?.accountID,
            },
            amount: overpayment.total,
            date: dateValue,
            status: Payment.StatusEnum.AUTHORISED,
            reference: 'Auto-refund triggered by deletion event from Pay Trade',
          };

          const response = await this.xero.accountingApi.createPayment(
            xeroDetails.tenant_id,
            payment,
          );
          this.logger.log(
            `response over payment deleted: ${JSON.stringify(response?.body?.payments[0])}`,
          );
          if (response?.body?.payments?.length > 0) {
            let refundIds = xeroPayments.overpayment_refund_id
                ? xeroPayments.overpayment_refund_id
                : [],
              requestData;
            for (let refundPayment of response?.body?.payments) {
              const refundDetails = await this.xero.accountingApi.getPayment(
                xeroDetails.tenant_id,
                refundPayment.paymentID,
              );
              this.logger.log(`refundDetails: ${JSON.stringify(refundDetails?.body?.payments[0])}`);
              const payment = refundDetails.body.payments[0];

              if (!refundIds.includes(payment.paymentID)) {
                refundIds.push(payment.paymentID);
                requestData = {
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
                  created_by: decoded?.userId,
                  created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                };
                this.logger.log(`requestData: ${JSON.stringify(requestData)}`);
                // if (requestData && requestData.length > 0) {
                const newXeroPayments =
                  await this.xeroPayments.create(requestData);
                const xeroRefundPayments: any =
                  await this.xeroPayments.save(newXeroPayments);

                const associatedOverPayment = xeroPayments.pt_payment_id
                  ? await this.paymentDetails.findOne({
                      where: { payment_id: xeroPayments.pt_payment_id },
                    })
                  : null;

                const associatedPayment = paymentDetails.associatedPayment
                  .payment_id
                  ? await this.paymentDetails.findOne({
                      where: {
                        payment_id: paymentDetails.associatedPayment.payment_id,
                      },
                    })
                  : null;

                const paytradePayload: any = {
                  company_id: paymentDetails.company_id,
                  payment_type:
                    String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
                      ? 'Overpayment refund from supplier'
                      : 'Overpayment refund to client',
                  payment_from_account:
                    String(payment.paymentType) === 'AROVERPAYMENTPAYMENT'
                      ? xeroBankAccountDetails?.pt_bank_account_id
                      : null,
                  payment_to_account:
                    String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
                      ? xeroBankAccountDetails?.pt_bank_account_id
                      : null,
                  project_id: associatedPayment?.project_id,
                  payment_claim_id: associatedPayment?.payment_claim_id,
                  client_supplier_id: clientSuppliersDetails.client_supplier_id,
                  payment_amount: payment.amount,
                  total_amount: payment.amount,
                  payment_date: new Date(payment.date),
                  input_date: moment.tz(decoded?.timezone || 'UTC').toDate(),
                  current_status: 'Draft',
                  list_status: 'Draft',
                  payment_list_buttons: {
                    view: true,
                    delete: true,
                    view_notice: false,
                  },
                  payment_overview_buttons: {
                    save: false,
                    edit: true,
                    delete: true,
                    view_notice: false,
                  },
                  associatedPayment,
                  associatedOverPayment,
                };

                this.logger.log(`paytradePayload: ${JSON.stringify(paytradePayload)}`);
                const createPaymentDetails =
                  await this.paymentDetails.create(paytradePayload);
                const ptPaymentDetails: any =
                  await this.paymentDetails.save(createPaymentDetails);
                this.logger.log(`ptPaymentDetails: ${JSON.stringify(ptPaymentDetails)}`);
                const pt_payment_id =
                  10000000000 + Number(ptPaymentDetails.payment_id);
                this.logger.log(`pt_payment_id: ${pt_payment_id}`);
                await this.paymentDetails
                  .createQueryBuilder()
                  .update(PaymentDetails)
                  .set({
                    payment_id: pt_payment_id,
                  })
                  .where('id = :id', {
                    id: ptPaymentDetails.id,
                  })
                  .execute();

                const subPaymentData: any = {
                  payment_id: pt_payment_id,
                  sub_payment_type: 'Payment',
                  amount:
                    String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
                      ? parseFloat(`${payment.amount}`)
                      : parseFloat(`-${payment.amount}`),
                  is_paid_confirmed:
                    String(payment.paymentType) === 'AROVERPAYMENTPAYMENT'
                      ? false
                      : null,
                  is_received_confirmed:
                    String(payment.paymentType) === 'APOVERPAYMENTPAYMENT'
                      ? false
                      : null,
                  status: 'Unmatched',
                };
                this.logger.log(`subPaymentData: ${JSON.stringify(subPaymentData)}`);
                const createdSubPaymentDetails: any =
                  await this.subPaymentsRepo.save(
                    this.subPaymentsRepo.create(subPaymentData),
                  );
                this.logger.log(`createdSubPaymentDetails: ${JSON.stringify(createdSubPaymentDetails)}`);
                await this.subPaymentsRepo
                  .createQueryBuilder()
                  .update(SubPayments)
                  .set({
                    sub_payment_id:
                      10000000000 +
                      Number(createdSubPaymentDetails.sub_payment_id),
                  })
                  .where('id = :id', {
                    id: createdSubPaymentDetails.id,
                  })
                  .execute();
                await this.xeroPayments
                  .createQueryBuilder()
                  .update(XeroPayments)
                  .set({
                    pt_payment_id: pt_payment_id,
                    mapped_status: 'System',
                  })
                  .where('id = :id', {
                    id: xeroRefundPayments.id,
                  })
                  .execute();

                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 224,
                  dynamic_values: { id: xeroRefundPayments?.id },
                  project_id: xeroInvoicesBills?.project_id,
                  contract_id: xeroInvoicesBills?.contract_id,
                  reference: {
                    xeroId: xeroRefundPayments?.id,
                    paytradeId: paymentDetails?.id,
                  },
                  reference_id: paymentDetails?.id,
                  history: [
                    `API triggered from payment ${paymentDetails?.payment_id}`,
                    'Export successful',
                  ],
                  important_checks: {
                    'Import data format validation': 'Ok',
                    'Client/Supplier mapping validation': 'Ok',
                  },
                  error_message: null,
                  xero_records: [payment],
                  paytrade_records: [paymentDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });

                return xeroRefundPayments;
              }
            }

            xeroPayments.status =
              response?.body?.payments[0]?.overpayment?.status;
            xeroPayments.overpayment_refund_id = refundIds;
            await this.xeroPayments.save(xeroPayments);
          } else {
            const errMsg = await handleAxiosError(response);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteOverPaymentInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 229,
                dynamic_values: {},
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
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
              api_name: 'deleteOverPaymentInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 229,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async deleteOverPaymentRefund(
    decoded: any,
    data: DeleteOverPaymentRefundInput,
  ) {
    try {
      const { payment_id } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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

      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentRefundInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 230,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentRefundInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 231,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments: any = await this.xeroPayments.findOne({
        where: {
          pt_payment_id: payment_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroPayments) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteOverPaymentRefundInXero',
          api_payload: { ...data, mapping_payment_id: payment_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 232,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Overpayment refund is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // if (xeroPayments && xeroPayments.status !== 'AUTHORISED') {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'deleteOverPaymentRefundInXero',
      //     api_payload: {
      //       ...data,
      //       unmapping_payment_id: xeroPayments?.payment_id,
      //     },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id: 234,
      //     dynamic_values: {},
      //     project_id: xeroInvoicesBills?.project_id,
      //     contract_id: xeroInvoicesBills?.contract_id,
      //     reference: {
      //       xeroId: null,
      //       paytradeId: paymentDetails?.id,
      //     },
      //     reference_id: paymentDetails?.id,
      //     history: [
      //       `API triggered from payment ${paymentDetails?.payment_id}`,
      //       'Export failed',
      //     ],
      //     important_checks: {
      //       'Import data format validation': 'Failed',
      //     },
      //     error_message: `Overpayment refund was already in ${xeroPayments.status?.toLowerCase()} state`,
      //     xero_records: [],
      //     paytrade_records: [paymentDetails],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }

      this.logger.log(`xeroPayments: ${JSON.stringify(xeroPayments)}`);
      if (
        xeroPayments.payment_id &&
        [
          'Overpayment refund from supplier',
          'Overpayment refund to client',
        ].includes(paymentDetails?.payment_type)
      ) {
        const xeroBankAccountDetails =
          await this.xeroBankAccountDetails.findOne({
            where: {
              pt_bank_account_id:
                paymentDetails.payment_type ===
                'Overpayment refund from supplier'
                  ? paymentDetails.payment_to_account
                  : paymentDetails.payment_from_account,
              integration_id: xeroDetails.integration_id,
            },
          });
        if (!xeroBankAccountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 236,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account is not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const accountDetails = await this.bankAccounts.findOne({
          where: {
            bank_account_id: xeroBankAccountDetails?.pt_bank_account_id,
          },
        });
        if (!accountDetails) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 235,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Account details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        const xeroOverPayments = await this.xeroPayments
          .createQueryBuilder('xero')
          .where('xero.integration_id = :integrationId', {
            integrationId: xeroDetails.integration_id,
          })
          .andWhere(':overpaymentRefundId = ANY(xero.overpayment_refund_id)', {
            overpaymentRefundId: xeroPayments.payment_id,
          })
          .getOne();

        if (!xeroOverPayments) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 237,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Overpayment is not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        if (!xeroOverPayments.pt_payment_id) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentRefundInXero',
            api_payload: {
              ...data,
              mapping_payment_id: xeroOverPayments.payment_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 238,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Overpayment is not mapped`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }

        this.logger.log(`xeroOverPayments: ${JSON.stringify(xeroOverPayments)}`);

        const xeroPayment = await await this.xero.accountingApi.getPayment(
          xeroDetails.tenant_id,
          xeroPayments.payment_id,
        );

        if (
          !xeroPayment ||
          !xeroPayment?.body?.payments ||
          xeroPayment?.body?.payments?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteOverPaymentRefundInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 239,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Overpayment refund details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        this.logger.log(
          `xeroPayments status: ${xeroPayments.status} - ${xeroPayment?.body?.payments[0]?.status}`,
        );
        if (
          xeroPayments.status === 'DELETED' &&
          xeroPayment?.body?.payments[0]?.status === Payment.StatusEnum.DELETED
        ) {
          const xeroResponse: any = xeroPayments;
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 233,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroPayment?.body?.payments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        } else if (
          xeroPayments.status !== 'DELETED' &&
          xeroPayment?.body?.payments[0]?.status === Payment.StatusEnum.DELETED
        ) {
          xeroPayments.status = 'DELETED';
          const xeroResponse = await this.xeroPayments.save(xeroPayments);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 233,
            dynamic_values: { id: xeroResponse?.id },
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: xeroResponse?.id,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export successful',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
            },
            error_message: null,
            xero_records: [xeroPayment?.body?.payments[0]],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return xeroResponse;
        }

        const paymentDelete: PaymentDelete = {
          status: 'DELETED',
        };
        try {
          const response = await this.xero.accountingApi.deletePayment(
            xeroDetails.tenant_id,
            xeroPayments.payment_id,
            paymentDelete,
          );
          this.logger.log(
            `response deleted: ${response.response.data?.Payments[0]?.Status}`,
          );
          if (response.response.data?.Payments[0]?.Status === 'DELETED') {
            const xeroOverpayment =
              await this.xero.accountingApi.getOverpayment(
                xeroDetails.tenant_id,
                xeroOverPayments.overpayment_id,
              );
            let refundIds: string[] = [];

            if (
              xeroOverpayment?.body?.overpayments[0]?.payments &&
              xeroOverpayment?.body?.overpayments[0]?.payments.length > 0
            ) {
              refundIds = xeroOverpayment?.body?.overpayments[0]?.payments
                .filter(
                  (refund) => refund.paymentID !== xeroPayments.payment_id,
                )
                .map((refund) => refund.paymentID as string);
            }
            await this.xeroPayments
              .createQueryBuilder()
              .update(XeroPayments)
              .set({
                overpayment_refund_id: refundIds,
                status: String(xeroOverpayment?.body?.overpayments[0].status),
              })
              .where('id = :id', {
                id: xeroOverPayments.id,
              })
              .execute();

            xeroPayments.status = response.response.data?.Payments[0]?.Status;
            const xeroResponse = await this.xeroPayments.save(xeroPayments);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'deleteOverPaymentRefundInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 233,
              dynamic_values: { id: xeroResponse?.id },
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export successful',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
              },
              error_message: null,
              xero_records: [xeroOverpayment?.body?.overpayments[0]],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(response);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteOverPaymentRefundInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 240,
                dynamic_values: {},
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
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
              api_name: 'deleteOverPaymentRefundInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 240,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async createCreditNotes(decoded: any, data: CreateCreditNotesInput) {
    try {
      const {
        company_id,
        client_supplier_id,
        payment_claim_id,
        pt_payment_id,
        payment_id,
        retained_amount,
        is_gst_optional,
        description,
      } = data;

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

      const paymentDetails = await this.getPaymentDetails(pt_payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createCreditNotesInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 172,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills: any = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createCreditNotesInXero',
          api_payload: { ...data, mapping_payment_claim_id: payment_claim_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 174,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const clientSuppliersDetails = await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id },
      });
      if (!clientSuppliersDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createCreditNotesInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 175,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Client/supplier details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroContactDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createCreditNotesInXero',
          api_payload: {
            ...data,
            mapping_client_supplier_id: client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 176,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Ok',
            'Client/Supplier mapping validation': 'Failed',
          },
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      try {
        const dateValue = moment.tz(Date.now(), decoded.timezone).toDate(); // '2020-10-10'
        const summarizeErrors = true;
        const unitdp = 4;
        const contact: Contact = {
          contactID: xeroContactDetails.contact_id,
        };
        const lineItem: LineItem = {
          description: description,
          quantity: 1.0,
          unitAmount: retained_amount,
          accountCode:
            xeroInvoicesBills.type === Invoice.TypeEnum.ACCPAY
              ? xeroDetails.bill_code
              : xeroDetails.invoice_code,
        };
        const lineItems = [];
        lineItems.push(lineItem);
        const creditNote: CreditNote = {
          type:
            xeroInvoicesBills.type === Invoice.TypeEnum.ACCPAY
              ? CreditNote.TypeEnum.ACCPAYCREDIT
              : CreditNote.TypeEnum.ACCRECCREDIT,
          contact: contact,
          date: dateValue,
          lineItems: lineItems,
          status: CreditNote.StatusEnum.AUTHORISED,
          lineAmountTypes: is_gst_optional
            ? LineAmountTypes.Inclusive
            : LineAmountTypes.Exclusive,
        };
        const creditNotes: CreditNotes = {
          creditNotes: [creditNote],
        };
        const response = await this.xero.accountingApi.createCreditNotes(
          xeroDetails.tenant_id,
          creditNotes,
          summarizeErrors,
          unitdp,
        );
        this.logger.log(`response created: ${JSON.stringify(response.body.creditNotes[0])}`);
        if (response.body.creditNotes) {
          const creditNotes = response.body.creditNotes[0];
          const invoice: Invoice = {
            invoiceID: xeroInvoicesBills.invoice_id,
          };
          const allocation: Allocation = {
            amount: retained_amount,
            date: dateValue,
            invoice: invoice,
          };
          const allocations: Allocations = {
            allocations: [allocation],
          };
          this.logger.log(`allocations: ${JSON.stringify(allocations)}`);
          const createCreditNoteAllocation =
            await this.xero.accountingApi.createCreditNoteAllocation(
              xeroDetails.tenant_id,
              creditNotes.creditNoteID,
              allocations,
            );
          this.logger.log(
            `createCreditNoteAllocation created: ${JSON.stringify(createCreditNoteAllocation?.body?.allocations[0])}`,
          );
          if (createCreditNoteAllocation?.body?.allocations) {
            const creditNote = response.body.creditNotes[0];
            const allocation = createCreditNoteAllocation.body.allocations[0];
            let requestData: any = {
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_id: xeroContactDetails.id,
              credit_note_id: creditNote.creditNoteID,
              credit_note_allocation_id: allocation.allocationID,
              credit_note_type: creditNote.type,
              credit_note_status: creditNote.status,
              credit_amount: creditNote.total,
              credit_note_date: creditNote.date,
              pt_payment_id: pt_payment_id,
              mapped_status: 'System',
              created_on: creditNote.updatedDateUTC,
              created_by: decoded?.userId,
              created_group: 'USER',
            };
            this.logger.log(`requestData: ${JSON.stringify(requestData)}`);
            if (!payment_id) {
              const xeroPayments = await this.xeroPayments.create(requestData);
              const xeroResponse: any =
                await this.xeroPayments.save(xeroPayments);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 169,
                dynamic_values: { id: xeroResponse?.id },
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export successful',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                },
                error_message: null,
                xero_records: [creditNote],
                paytrade_records: [paymentDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return xeroResponse;
            } else {
              const xeroPayments: any = await this.xeroPayments.findOne({
                where: { payment_id },
              });
              xeroPayments.credit_note_id = creditNote.creditNoteID;
              xeroPayments.credit_note_allocation_id = allocation.allocationID;
              xeroPayments.credit_note_type = creditNote.type;
              xeroPayments.credit_note_status = creditNote.status;
              xeroPayments.credit_amount = creditNote.total;
              xeroPayments.credit_note_date = creditNote.date;
              xeroPayments.updated_on = creditNote.updatedDateUTC;
              xeroPayments.updated_by = decoded?.userId;
              xeroPayments.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
              const xeroResponse: any =
                await this.xeroPayments.save(xeroPayments);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 169,
                dynamic_values: { id: xeroResponse?.id },
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export successful',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                },
                error_message: null,
                xero_records: [creditNote],
                paytrade_records: [paymentDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return xeroResponse;
            }
          } else {
            const errMsg = await handleAxiosError(createCreditNoteAllocation);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createCreditNotesInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 215,
                dynamic_values: {},
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                  'Client/Supplier mapping validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

            return false;
          }
        } else {
          const errMsg = await handleAxiosError(response);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'createCreditNotesInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 215,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
                'Client/Supplier mapping validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
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
            api_name: 'createCreditNotesInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 215,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Ok',
              'Client/Supplier mapping validation': 'Ok',
            },
            error_message: errMsg,
            xero_records: [],
            paytrade_records: [paymentDetails],
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

  async deleteCreditNotes(decoded: any, data: DeleteCreditNotesInput) {
    try {
      const { payment_id } = data;

      const paymentDetails = await this.getPaymentDetails(payment_id);
      if (!paymentDetails) {
        throw `Payment details not found`;
      }
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
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
      await this.xeroService.refreshTokenSet(
        paymentDetails.company_id,
        this.xero,
      );

      const claimDetails = await this.paymentClaims.findOne({
        where: { payment_claim_id: paymentDetails.payment_claim_id },
      });
      if (!claimDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteCreditNotesInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 241,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroInvoicesBills = await this.xeroInvoicesBills.findOne({
        where: {
          pt_claim_id: paymentDetails.payment_claim_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroInvoicesBills) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteCreditNotesInXero',
          api_payload: {
            ...data,
            mapping_payment_claim_id: paymentDetails.payment_claim_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 242,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Claim is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroPayments = await this.xeroPayments.find({
        where: {
          // pt_payment_id: payment_id,
          invoice_id: xeroInvoicesBills?.id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (!xeroPayments || xeroPayments?.length == 0) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteCreditNotesInXero',
          api_payload: { ...data, mapping_payment_id: payment_id },
          integration_id: xeroDetails.integration_id,
          log_template_id: 243,
          dynamic_values: {},
          project_id: xeroInvoicesBills?.project_id,
          contract_id: xeroInvoicesBills?.contract_id,
          reference: {
            xeroId: null,
            paytradeId: paymentDetails?.id,
          },
          reference_id: paymentDetails?.id,
          history: [
            `API triggered from payment ${paymentDetails?.payment_id}`,
            'Export failed',
          ],
          important_checks: {
            'Import data format validation': 'Failed',
          },
          error_message: `Payment is not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      // if (!xeroPayments.credit_note_id) {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'deleteCreditNotesInXero',
      //     api_payload: { ...data },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id: 244,
      //     dynamic_values: {},
      //     project_id: xeroInvoicesBills?.project_id,
      //     contract_id: xeroInvoicesBills?.contract_id,
      //     reference: {
      //       xeroId: null,
      //       paytradeId: paymentDetails?.id,
      //     },
      //     reference_id: paymentDetails?.id,
      //     history: [
      //       `API triggered from payment ${paymentDetails?.payment_id}`,
      //       'Export failed',
      //     ],
      //     important_checks: {
      //       'Import data format validation': 'Failed',
      //     },
      //     error_message: `Credit note id is missing`,
      //     xero_records: [],
      //     paytrade_records: [paymentDetails],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }
      // if (!xeroPayments.credit_note_allocation_id) {
      //   await this.xeroService.insertXeroSyncLogs(decoded, {
      //     id: data?.sync_id,
      //     api_name: 'deleteCreditNotesInXero',
      //     api_payload: { ...data },
      //     integration_id: xeroDetails.integration_id,
      //     log_template_id: 245,
      //     dynamic_values: {},
      //     project_id: xeroInvoicesBills?.project_id,
      //     contract_id: xeroInvoicesBills?.contract_id,
      //     reference: {
      //       xeroId: null,
      //       paytradeId: paymentDetails?.id,
      //     },
      //     reference_id: paymentDetails?.id,
      //     history: [
      //       `API triggered from payment ${paymentDetails?.payment_id}`,
      //       'Export failed',
      //     ],
      //     important_checks: {
      //       'Import data format validation': 'Failed',
      //     },
      //     error_message: `Credit note allocation id is missing`,
      //     xero_records: [],
      //     paytrade_records: [paymentDetails],
      //     new_records: null,
      //     updated_records: null,
      //     synced_records: null,
      //   });
      //   return false;
      // }
      if (
        xeroPayments[0]?.credit_note_id &&
        xeroPayments[0]?.credit_note_allocation_id
      ) {
        const creditNoteDetails =
          await await this.xero.accountingApi.getCreditNote(
            xeroDetails.tenant_id,
            xeroPayments[0]?.credit_note_id,
            4,
          );
        if (
          !creditNoteDetails ||
          !creditNoteDetails?.body?.creditNotes ||
          creditNoteDetails?.body?.creditNotes?.length === 0
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteCreditNotesInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 246,
            dynamic_values: {},
            project_id: xeroInvoicesBills?.project_id,
            contract_id: xeroInvoicesBills?.contract_id,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Credit note details not found`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        if (
          !creditNoteDetails?.body?.creditNotes[0]?.allocations[0]?.allocationID
        ) {
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            api_name: 'deleteCreditNotesInXero',
            api_payload: { ...data },
            integration_id: xeroDetails.integration_id,
            log_template_id: 247,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: null,
              paytradeId: paymentDetails?.id,
            },
            reference_id: paymentDetails?.id,
            history: [
              `API triggered from payment ${paymentDetails?.payment_id}`,
              'Export failed',
            ],
            important_checks: {
              'Import data format validation': 'Failed',
            },
            error_message: `Credit note allocation details is missing`,
            xero_records: [],
            paytrade_records: [paymentDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
        try {
          const response =
            await this.xero.accountingApi.deleteCreditNoteAllocations(
              xeroDetails.tenant_id,
              creditNoteDetails?.body?.creditNotes[0]?.creditNoteID,
              creditNoteDetails.body.creditNotes[0].allocations[0].allocationID,
            );
          this.logger.log(
            `response created: ${response.response.data.Allocations[0].IsDeleted}`,
          );
          if (response?.response?.data?.Allocations[0]?.IsDeleted) {
            await this.xeroPayments
              .createQueryBuilder()
              .update(XeroPayments)
              .set({
                credit_note_status: 'DELETED',
              })
              .where(
                'invoice_id = :invoice_id AND integration_id = :integration_id',
                {
                  invoice_id: xeroInvoicesBills?.id,
                  integration_id: xeroDetails.integration_id,
                },
              )
              .execute();

            const creditNoteResponse =
              await await this.xero.accountingApi.getCreditNote(
                xeroDetails.tenant_id,
                xeroPayments[0].credit_note_id,
                4,
              );
            const xeroResponse = await this.xeroPayments.findOne({
              where: { pt_payment_id: payment_id },
            });
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 250,
              dynamic_values: { id: xeroResponse?.id },
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export successful',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
              },
              error_message: null,
              xero_records: [creditNoteResponse?.body?.creditNotes[0]],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(response);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteCreditNotesInXero',
                api_payload: { ...data },
                integration_id: xeroDetails.integration_id,
                log_template_id: 248,
                dynamic_values: {},
                project_id: xeroInvoicesBills?.project_id,
                contract_id: xeroInvoicesBills?.contract_id,
                reference: {
                  xeroId: null,
                  paytradeId: paymentDetails?.id,
                },
                reference_id: paymentDetails?.id,
                history: [
                  `API triggered from payment ${paymentDetails?.payment_id}`,
                  'Export failed',
                ],
                important_checks: {
                  'Import data format validation': 'Ok',
                },
                error_message: errMsg,
                xero_records: [],
                paytrade_records: [paymentDetails],
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
              api_name: 'deleteCreditNotesInXero',
              api_payload: { ...data },
              integration_id: xeroDetails.integration_id,
              log_template_id: 248,
              dynamic_values: {},
              project_id: xeroInvoicesBills?.project_id,
              contract_id: xeroInvoicesBills?.contract_id,
              reference: {
                xeroId: null,
                paytradeId: paymentDetails?.id,
              },
              reference_id: paymentDetails?.id,
              history: [
                `API triggered from payment ${paymentDetails?.payment_id}`,
                'Export failed',
              ],
              important_checks: {
                'Import data format validation': 'Ok',
              },
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [paymentDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
      return false;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getXeroPaymentDetails(pt_payment_id: number, integration_id: number) {
    return await this.xeroPayments.findOne({
      where: { pt_payment_id, integration_id },
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

  async getPaymentByPaymentId(payment_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const paymentDetails = await this.xero.accountingApi.getPayment(
        xeroDetails.tenant_id,
        payment_id,
      );
      this.logger.log(`paymentDetails: ${JSON.stringify(paymentDetails?.body?.payments[0])}`);
      if (paymentDetails.body.payments[0]) {
        return paymentDetails.body.payments[0];
      }
      throw paymentDetails;
    } catch (error) {
      this.logger.log(`error: ${JSON.stringify(error)}`);
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getPaymentOrBankTransaction(tenantId, payment_id, invoice_id) {
    try {
      // Try as Payment
      const paymentResponse = await this.xero.accountingApi.getPayment(
        tenantId,
        payment_id,
      );
      this.logger.log(`paymentResponse: ${JSON.stringify(paymentResponse?.body?.payments)}`);
      if (paymentResponse?.body?.payments?.length) {
        return {
          type: 'payment',
          data: paymentResponse.body.payments[0],
        };
      }
    } catch (err) {
      const statusCode =
        typeof err === 'string'
          ? JSON?.parse(err)?.response?.statusCode
          : err?.response?.statusCode;
      this.logger.log(`Payment lookup failed with: ${statusCode}`);

      // If it's not a 404, rethrow
      if (statusCode !== 404) {
        throw err;
      }
    }

    try {
      // Try as BankTransaction
      const bankTxResponse = await this.xero.accountingApi.getBankTransaction(
        tenantId,
        payment_id,
      );
      this.logger.log(`bankTxResponse: ${JSON.stringify(bankTxResponse?.body?.bankTransactions)}`);
      if (bankTxResponse?.body?.bankTransactions?.length) {
        return {
          type: 'bankTransaction',
          data: bankTxResponse.body.bankTransactions[0],
        };
      }
    } catch (err) {
      const statusCode =
        typeof err === 'string'
          ? JSON?.parse(err)?.response?.statusCode
          : err?.response?.statusCode;
      this.logger.log(`BankTransaction lookup failed with: ${statusCode}`);

      // If it's not a 404, rethrow
      if (statusCode !== 404) {
        throw err;
      }
    }

    try {
      // Try as payment list
      const paymentListResponse = await this.xero.accountingApi.getPayments(
        tenantId,
        undefined,
        undefined,
        `Invoice.InvoiceID == Guid("${invoice_id}")`,
      );
      this.logger.log(`paymentListResponse: ${JSON.stringify(paymentListResponse?.body?.payments)}`);
      if (paymentListResponse?.body?.payments?.length) {
        for (const payment of paymentListResponse?.body?.payments) {
          if (
            payment.paymentID === payment_id ||
            payment.batchPaymentID === payment_id
          ) {
            return {
              type: 'paymentList',
              data: payment,
            };
          }
        }
      }
    } catch (err) {
      const statusCode =
        typeof err === 'string'
          ? JSON?.parse(err)?.response?.statusCode
          : err?.response?.statusCode;
      this.logger.log(`PaymentList lookup failed with: ${statusCode}`);

      if (statusCode === 404) {
        throw new Error(
          `No payment or bank transaction or payment list found with ID: ${payment_id}`,
        );
      } else {
        throw err;
      }
    }
  }

  async getXeroContact(contact_id: string, integration_id: number) {
    return await this.xeroContactDetails.findOne({
      where: { contact_id, integration_id },
    });
  }

  async getXeroInvoice(invoice_id: string, integration_id: number) {
    return await this.xeroInvoicesBills.findOne({
      where: { invoice_id, integration_id },
    });
  }

  async getXeroAccount(account_id: string, integration_id: number) {
    return await this.xeroBankAccountDetails.findOne({
      where: { account_id, integration_id },
    });
  }

  async syncAllPaymentsByCompanyId(
    decoded: any,
    company_id: number,
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
          api_payload: { company_id, category_type: 'project' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 249,
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
          api_payload: { company_id, category_type: 'contract' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 76,
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
      const where = 'Status=="AUTHORISED"';
      const order = 'Amount ASC';
      const page = 1;
      const pageSize = 100;

      const newPayments = [];
      const existingPayments = [];
      const skipPaymentsAddition = [];

      let oldData = [],
        newData = [];

      const response = await this.xero.accountingApi.getPayments(
        xeroDetails.tenant_id,
        ifModifiedSince,
        where,
        order,
        page,
        pageSize,
      );

      this.logger.log(`response.body: ${JSON.stringify(response?.body?.payments[0])}`);
      const payments = response?.body?.payments || [];

      if (payments && payments[0] !== null && payments.length !== 0) {
        // Fetch all payment IDs from DB in a single query
        const paymentIdsInDb = await this.xeroPayments.find({
          where: {
            payment_id: In(payments.map((a) => a.paymentID)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['payment_id'],
        });
        const existingPaymentIds = new Set(
          paymentIdsInDb.map((a) => a.payment_id),
        );
        const existingPaymentIdsSet = new Set(existingPaymentIds);
        // Separate new and existing payments
        for (const payment of payments) {
          this.logger.log(`payment: ${payment.paymentID} - ${payment.paymentType}`);
          const contactId =
            (
              await this.getXeroContact(
                payment.invoice.contact.contactID,
                xeroDetails.integration_id,
              )
            )?.id || null;
          const invoiceId =
            (
              await this.getXeroInvoice(
                payment.invoice.invoiceID,
                xeroDetails.integration_id,
              )
            )?.id || null;
          const accountId =
            (
              await this.getXeroAccount(
                payment.account.accountID,
                xeroDetails.integration_id,
              )
            )?.id || null;
          if (contactId && invoiceId && accountId) {
            const paymentData: any = {
              payment_id: payment.paymentID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_id: contactId,
              invoice_id: invoiceId,
              account_id: accountId,
              payment_type: payment.paymentType,
              status: payment.status,
              payment_date: payment.date,
              reference: payment.reference,
              payment_amount: payment.amount,
              bank_amount: payment.bankAmount,
              is_reconciled: payment.isReconciled,
              created_on: payment.updatedDateUTC,
            };
            if (existingPaymentIdsSet.has(String(payment.paymentID))) {
              if (
                !existingPayments.some(
                  (c) => c.payment_id === String(payment.paymentID),
                )
              ) {
                existingPayments.push(paymentData);
                oldData.push(paymentData);
              }
            } else {
              newPayments.push(paymentData);
              newData.push(paymentData);
            }
          } else {
            skipPaymentsAddition.push(payment);
          }
        }
      }

      // Batch insert new payments
      if (newPayments.length > 0) {
        const xeroPayments = await this.xeroPayments.create(newPayments);
        await this.xeroPayments.save(xeroPayments);
        this.logger.log(`Inserted ${xeroPayments.length} new payments.`);
      }

      // Batch update existing payments
      if (existingPayments.length > 0) {
        for (const payment of existingPayments) {
          await this.xeroPayments.update(
            {
              payment_id: payment.payment_id,
              integration_id: xeroDetails.integration_id,
            },
            payment,
          );
        }
        this.logger.log(`Updated ${existingPayments.length} existing payments.`);
      }

      this.logger.log(
        `newPayments ${newPayments} existingPayments ${existingPayments}`,
      );

      const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
        decoded,
        {
          id: sync_id,
          integration_id: xeroDetails.integration_id,
          log_template_id: 49,
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

      this.logger.log('All payments fetched, inserted, and updated successfully.');

      if (newPayments || existingPayments) {
        return 'Data synced successfully';
      } else {
        return 'No data available to sync';
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getXeroPaymentListsForCompany(data: GetXeroPaymentListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const skip = (data.page_number - 1) * data.page_size;
      const queryBuilder = await this.xeroPayments
        .createQueryBuilder('payment')
        .select('payment.id', 'id')
        .addSelect('payment.payment_id', 'payment_id')
        .addSelect('payment.tenant_id', 'tenant_id')
        .addSelect('payment.payment_type', 'payment_type')
        .addSelect('payment.contact_id', 'contact_id')
        .addSelect('contact.contact_name', 'contact_name')
        .addSelect('payment.invoice_id', 'invoice_id')
        .addSelect('payment.account_id', 'account_id')
        .addSelect('account.account_name', 'account_name')
        .addSelect('payment.status', 'status')
        .addSelect('payment.payment_date', 'payment_date')
        .addSelect('payment.reference', 'reference')
        .addSelect('payment.payment_amount', 'payment_amount')
        .addSelect('payment.pt_payment_id', 'pt_payment_id')
        .addSelect(
          `CASE WHEN payment.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .addSelect('xero.company_id', 'company_id')
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = payment.integration_id`,
        )
        .leftJoin('payment.xeroContactDetails', 'contact')
        .leftJoin('payment.xeroBankAccountDetails', 'account')
        .where(`xero.company_id = :companyId AND payment.status <> 'DELETED'`, {
          companyId: data.company_id,
        });

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(payment.payment_id::text) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `payment.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`payment.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(payment.payment_id::text)': sorting_order,
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
                'LOWER(payment.id::text)': sorting_order,
              });
            }
            break;
          case 'payment_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.payment_id::text)': sorting_order,
              });
            }
            break;
          case 'contact_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.contact_id::text)': sorting_order,
              });
            }
            break;
          case 'invoice_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.invoice_id::text)': sorting_order,
              });
            }
            break;
          case 'account_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.account_id::text)': sorting_order,
              });
            }
            break;
          case 'payment_type':
            {
              queryBuilder.orderBy({
                'LOWER(payment.payment_type)': sorting_order,
              });
            }
            break;
          case 'payment_date':
            {
              queryBuilder.orderBy({
                'payment.payment_date': sorting_order,
              });
            }
            break;
          case 'payment_amount':
            {
              queryBuilder.orderBy({
                'payment.payment_amount': sorting_order,
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
          case 'account_name':
            {
              queryBuilder.orderBy({
                'LOWER(account.account_name)': sorting_order,
              });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({
                'payment.status': sorting_order,
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

      return { total_count: finalCount, payment_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getPaytradePaymentListsForCompany(data: GetPaytradePaymentListsInput) {
    try {
      const queryBuilder = await this.paymentDetails
        .createQueryBuilder('a')
        .select('a.id', 'id')
        .addSelect('a.payment_id', 'payment_id')
        .addSelect('a.payment_type', 'payment_type')
        .addSelect('a.payment_claim_id', 'invoice_id')
        .addSelect('a.client_supplier_id', 'contact_id')
        .addSelect('client.client_supplier_name', 'contact_name')
        .addSelect('a.current_status', 'status')
        .addSelect('a.payment_date', 'payment_date')
        .addSelect('a.total_amount', 'payment_amount')
        .addSelect('payment.payment_id', 'xero_payment_id')
        .addSelect(
          `CASE WHEN payment.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = a.company_id`,
        )
        .leftJoin(
          XeroPayments,
          'payment',
          'payment.pt_payment_id = a.payment_id AND xero.integration_id = payment.integration_id',
        )
        .leftJoin('a.clientSupplierDetails', 'client')
        .where(`a.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`a.current_status not in ('Deleted', 'Archived')`);

      if (data.search) {
        queryBuilder.andWhere(`(a.payment_id::text LIKE :keyword)`, {
          keyword: `%${data.search}%`,
        });
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `payment.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`payment.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'a.payment_id': sorting_order });
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
          case 'payment_id':
            {
              queryBuilder.orderBy({
                'a.payment_id': sorting_order,
              });
            }
            break;
          case 'xero_payment_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.payment_id::text)': sorting_order,
              });
            }
            break;
          case 'payment_type':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(a.payment_type AS text))': sorting_order,
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
          case 'payment_amount':
            {
              queryBuilder.orderBy({
                'a.total_amount': sorting_order,
              });
            }
            break;
          case 'payment_date':
            {
              queryBuilder.orderBy({
                'a.payment_date': sorting_order,
              });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({
                'a.current_status': sorting_order,
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

      return { total_count: finalCount, payment_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getMappedPaymentLists(data: GetMappedXeroPaymentListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const skip = (data.page_number - 1) * data.page_size;
      const queryBuilder = await this.xeroPayments
        .createQueryBuilder('payment')
        .select([
          'payment.id AS id',
          'payment.payment_id AS payment_id',
          'payment.tenant_id AS tenant_id',
          'payment.payment_type AS payment_type',
          'payment.invoice_id AS invoice_id',
          'payment.account_id AS account_id',
          'account.account_name AS account_name',
          'payment.contact_id AS contact_id',
          'contact.contact_name AS contact_name',
          'payment.status AS status',
          `CASE WHEN payment.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END AS mapped_status`,
          'payment.payment_date AS payment_date',
          'payment.reference AS reference',
          'payment.payment_amount AS payment_amount',
          'payment.pt_payment_id AS pt_payment_id',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = payment.integration_id`,
        )
        .innerJoin(PaymentDetails, 'b', 'b.payment_id = payment.pt_payment_id')
        .leftJoin('payment.xeroContactDetails', 'contact')
        .leftJoin('payment.xeroBankAccountDetails', 'account')
        .where(`payment.mapped_status IN (:...mappedStatuses)`, {
          mappedStatuses: ['Manual', 'Auto', 'System'],
        })
        .andWhere(
          `xero.company_id = :companyId and b.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        );

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(payment.payment_id::text) LIKE LOWER(:keyword) OR b.payment_id::text LIKE :keyword)`,
          {
            keyword: `%${data.search?.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(payment.payment_id::text)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'payment_id':
            {
              queryBuilder.orderBy({
                'LOWER(payment.payment_id::text)': sorting_order,
              });
            }
            break;
          case 'pt_payment_id':
            {
              queryBuilder.orderBy({
                'b.payment_id': sorting_order,
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

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      return { total_count, payment_list: rawResults };
    } catch (error) {
      throw error;
    }
  }

  async manualMappingPayment(
    data: YetToMapPaymentsInput,
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

      const checkPaytradeId = await this.xeroPayments.findOne({
        where: {
          pt_payment_id: data.pt_payment_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.payment_id) {
        throw `This payment has been already mapped to xero payment ${checkPaytradeId?.payment_id}`;
      }

      const checkXeroId = await this.xeroPayments.findOne({
        where: {
          payment_id: data.payment_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_payment_id &&
        checkXeroId?.paymentDetails?.payment_id
      ) {
        throw `This payment has been already mapped to paytrade payment ${checkXeroId?.paymentDetails?.payment_id ? checkXeroId?.paymentDetails?.payment_id : checkXeroId.payment_id}`;
      }
      const response = await this.xeroPayments
        .createQueryBuilder()
        .update(XeroPayments)
        .set({
          pt_payment_id: data.pt_payment_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'payment_id = :payment_id AND integration_id = :integration_id',
          {
            payment_id: data.payment_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Payment has been mapped successfully`;
      } else {
        return `Payment is not mapped`;
      }
    } catch (error) {
      throw error;
    }
  }

  // Task #61 — One-click "Retry retention transfer" from a failed sync log.
  // Re-invokes createPayment with sync_payment=false / sync_transfer=true so
  // only the BankTransfer leg fires. Used after the user has fixed whatever
  // Xero rejected (duplicate ref, account mismatch, insufficient balance).
  async retryRetentionTransferFromSyncLog(
    decoded: any,
    sync_log_id: string,
    company_id: number,
  ) {
    const RETRYABLE_CODES = [
      'RETENTION_TRANSFER_DUPLICATE_REFERENCE',
      'RETENTION_TRANSFER_ACCOUNT_INVALID',
      'RETENTION_TRANSFER_REJECTED',
    ];

    if (!company_id) {
      throw `Company context missing — cannot authorize retry`;
    }

    const syncLog = await this.xeroSyncLogs.findOne({
      where: { id: sync_log_id },
    });
    if (!syncLog) {
      throw `Sync log not found`;
    }
    if (syncLog.api_name !== 'createPaymentInXero') {
      throw `Sync log is not a payment sync — cannot retry retention transfer`;
    }
    if (!RETRYABLE_CODES.includes(syncLog.error_code)) {
      throw `Sync log is not a retryable retention transfer failure`;
    }
    const payload = (syncLog.api_payload || {}) as any;
    const payment_id = Number(payload.payment_id);
    if (!payment_id) {
      throw `Sync log is missing payment_id — cannot retry`;
    }

    // Ownership / tenant scoping (Task #61 follow-up to code review):
    // Verify the sync log's integration AND the underlying payment both
    // belong to the caller's active company. Without this, a user could
    // POST any sync_log_id and trigger a retention transfer in another
    // tenant's Xero org (IDOR).
    const callerXeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: Number(company_id), status: 'ACTIVE' },
    });
    if (
      !callerXeroDetails ||
      !callerXeroDetails.integration_id ||
      callerXeroDetails.integration_id !== syncLog.integration_id
    ) {
      throw `Sync log does not belong to the current company`;
    }
    const paymentRow = await this.paymentDetails.findOne({
      where: { payment_id },
    });
    if (!paymentRow || Number(paymentRow.company_id) !== Number(company_id)) {
      throw `Payment does not belong to the current company`;
    }

    this.logger.log(
      `[Task#61 retry-retention-transfer] sync_log_id=${sync_log_id} payment_id=${payment_id} error_code=${syncLog.error_code} company_id=${company_id}`,
    );

    const retryInput: CreatePaymentInput = {
      payment_id,
      bank_account_id: payload.bank_account_id,
      retention_account: payload.retention_account,
      amount: payload.amount,
      retention_amount: payload.retention_amount,
      payment_date: payload.payment_date,
      cash_retention: true,
      sync_payment: false,
      sync_transfer: true,
      // Omit sync_id so a fresh sync log run is created instead of
      // overwriting the historical failure entry.
    };

    return await this.createPayment(decoded, retryInput);
  }

  // ============================================================
  // Task #231 — Trust account movements two-way Xero sync.
  // See docs/architecture/xero-trust-movements-sync.md.
  //
  // Scope: payments of type Withdrawal / Top Up / Interest Received /
  // Interest Withdrawal / Bank Charge Applied / Bank Charge Top Up /
  // Top Up Retention that move money between a Project Trust Account
  // or Retention Trust Account and that trust account's
  // associated_cash_account_id.
  //
  // Outbound (push): creates a Xero BankTransfer stamped with
  // `PT-MOV-{payment_id}` and persists the mapping in xero_payments
  // (re-uses the bank_transfer_id / bank_transfer_reference columns
  // added for Task #50, distinguished from PT-RET-* by prefix).
  //
  // Reversal: posts an opposite BankTransfer with
  // `PT-MOV-REV-{payment_id}`; Xero has no deleteBankTransfer.
  //
  // Inbound: matched by reference round-trip (anti-echo) when ours,
  // otherwise materialises a new PT payment between the mapped
  // trust account and its associated cash account.
  // ============================================================
  /**
   * Task #231 — pure inference of trust-movement payment_type from
   * direction (cash → trust vs trust → cash), the destination trust's
   * `account_type`, and the BankTransfer reference/narration text.
   * Shared by `handleInboundTrustMovementBankTransfer` (importer) and
   * `manualXeroResyncLookup` (UI candidate listing) so the suggested
   * type the admin sees matches exactly what the one-click import
   * will materialise.
   */
  static inferTrustMovementType(input: {
    fromIsTrust: boolean;
    isRtaTrust: boolean;
    refText: string;
  }): { payment_type: string; ambiguous: boolean } {
    const text = String(input.refText || '').toLowerCase();
    const hasInterest = /interest/.test(text);
    const hasBankCharge = /bank\s*charge|bank\s*fee/.test(text);
    const hasRetention = /retention/.test(text);
    if (input.fromIsTrust) {
      if (hasInterest) return { payment_type: 'Interest Withdrawal', ambiguous: false };
      if (hasBankCharge) return { payment_type: 'Bank Charge Applied', ambiguous: false };
      return { payment_type: 'Withdrawal', ambiguous: !text.trim() };
    }
    if (hasInterest) return { payment_type: 'Interest Received', ambiguous: false };
    if (hasBankCharge) return { payment_type: 'Bank Charge Top Up', ambiguous: false };
    if (input.isRtaTrust && hasRetention) return { payment_type: 'Top Up Retention', ambiguous: false };
    return { payment_type: 'Top Up', ambiguous: !text.trim() || input.isRtaTrust };
  }

  private static readonly TRUST_MOVEMENT_TYPES = new Set<string>([
    'Withdrawal',
    'Top Up',
    'Interest Received',
    'Interest Withdrawal',
    'Bank Charge Applied',
    'Bank Charge Top Up',
    'Top Up Retention',
  ]);

  isTrustMovementType(payment_type: string | null | undefined): boolean {
    return !!payment_type && XeroPaymentsService.TRUST_MOVEMENT_TYPES.has(payment_type);
  }

  /**
   * Returns the resolved trust account and its paired cash account
   * for a PT payment of trust-movement type, or null when the
   * payment's from/to accounts don't form a trust↔associated_cash
   * pair owned by the same company.
   */
  private async resolveTrustMovementPair(paymentDetails: any): Promise<{
    trustAccount: BankAccounts;
    cashAccount: BankAccounts;
    isOutflow: boolean;
  } | null> {
    if (!paymentDetails?.payment_from_account || !paymentDetails?.payment_to_account) {
      return null;
    }
    const [fromAcc, toAcc] = await Promise.all([
      this.bankAccounts.findOne({
        where: { bank_account_id: paymentDetails.payment_from_account },
      }),
      this.bankAccounts.findOne({
        where: { bank_account_id: paymentDetails.payment_to_account },
      }),
    ]);
    if (!fromAcc || !toAcc) return null;
    if (Number(fromAcc.company_id) !== Number(toAcc.company_id)) return null;
    const TRUST = new Set(['Project Trust Account', 'Retention Trust Account']);
    const fromIsTrust = TRUST.has(String(fromAcc.account_type));
    const toIsTrust = TRUST.has(String(toAcc.account_type));
    if (fromIsTrust === toIsTrust) return null; // need exactly one trust side
    const trustAccount = fromIsTrust ? fromAcc : toAcc;
    const cashAccount = fromIsTrust ? toAcc : fromAcc;
    if (
      Number(trustAccount.associated_cash_account_id) !==
      Number(cashAccount.bank_account_id)
    ) {
      return null;
    }
    return { trustAccount, cashAccount, isOutflow: fromIsTrust };
  }

  /**
   * Outbound push — create a Xero BankTransfer for a trust-movement
   * PT payment. Idempotent: a second call for the same payment_id
   * short-circuits when an xero_payments row already carries a
   * bank_transfer_id stamped with `PT-MOV-{payment_id}`.
   *
   * Fire-and-forget contract: throws on hard error so the caller
   * can decide whether to surface it; sync log rows are written
   * for both success (615) and failure (616).
   */
  async pushTrustMovement(
    decoded: any,
    input: { payment_id: number },
  ): Promise<{ success: boolean; bank_transfer_id?: string; reference?: string; message?: string }> {
    const payment_id = Number(input?.payment_id);
    if (!payment_id) return { success: false, message: 'payment_id is required' };

    const paymentDetails = await this.getPaymentDetails(payment_id);
    if (!paymentDetails) return { success: false, message: 'payment not found' };
    if (!this.isTrustMovementType(paymentDetails.payment_type)) {
      return { success: false, message: `payment_type ${paymentDetails.payment_type} is not a trust movement` };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails?.integration_id) {
      return { success: false, message: 'no active xero integration' };
    }
    if (xeroDetails.integrationDetails?.integration_status !== 'Connected - active') {
      return { success: false, message: 'xero integration not connected' };
    }

    const pair = await this.resolveTrustMovementPair(paymentDetails);
    if (!pair) {
      return { success: false, message: 'payment is not between a trust account and its associated cash account' };
    }

    // Idempotency: if we already have a PT-MOV mapping, no-op.
    const ptRef = `PT-MOV-${payment_id}`;
    const existing = await this.xeroPayments.findOne({
      where: {
        integration_id: xeroDetails.integration_id,
        pt_payment_id: payment_id as any,
      },
    });
    if (existing?.bank_transfer_id && (existing as any)?.bank_transfer_reference === ptRef) {
      return { success: true, bank_transfer_id: existing.bank_transfer_id, reference: ptRef, message: 'already synced' };
    }

    // Resolve Xero account ids for both sides.
    const [fromXa, toXa] = await Promise.all([
      this.xeroBankAccountDetails.findOne({
        where: { pt_bank_account_id: paymentDetails.payment_from_account as any, integration_id: xeroDetails.integration_id },
      }),
      this.xeroBankAccountDetails.findOne({
        where: { pt_bank_account_id: paymentDetails.payment_to_account as any, integration_id: xeroDetails.integration_id },
      }),
    ]);
    if (!fromXa?.account_id || !toXa?.account_id) {
      const msg = `Trust movement push aborted — one or both bank accounts are not mapped to Xero (from=${!!fromXa?.account_id}, to=${!!toXa?.account_id}).`;
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'pushTrustMovementToXero',
        api_payload: { payment_id, payment_type: paymentDetails.payment_type },
        integration_id: xeroDetails.integration_id,
        log_template_id: 616,
        dynamic_values: { reference: ptRef, payment_id, error: msg },
        reference: { xeroId: null, paytradeId: paymentDetails.id },
        reference_id: paymentDetails.id,
        history: [
          `Trust movement push triggered for payment ${payment_id} (${paymentDetails.payment_type})`,
          msg,
        ],
        important_checks: { 'Bank account mapping': msg.includes('false') ? 'Failed' : 'Ok' },
        error_message: msg,
        xero_records: [],
        paytrade_records: [paymentDetails],
        new_records: null, updated_records: null, synced_records: null,
      });
      return { success: false, message: msg };
    }

    const amount = Number(paymentDetails.total_amount ?? 0);
    if (!(amount > 0)) {
      return { success: false, message: 'payment amount is zero/negative' };
    }
    const dateVal = paymentDetails.payment_date
      ? moment(paymentDetails.payment_date).format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');

    await this.xeroService.refreshTokenSet(paymentDetails.company_id, this.xero);

    const result = await this.tryCreateBankTransferWithRecovery(decoded, {
      api_name: 'pushTrustMovementToXero',
      api_payload: { payment_id, payment_type: paymentDetails.payment_type },
      integration_id: xeroDetails.integration_id,
      tenant_id: xeroDetails.tenant_id,
      fromAccountId: fromXa.account_id,
      toAccountId: toXa.account_id,
      amount,
      date: dateVal,
      reference: ptRef,
      paymentDetails,
      xeroInvoicesBills: { project_id: paymentDetails.project_id, contract_id: paymentDetails.contract_id },
      history_prefix: `Trust movement push triggered for payment ${payment_id} (${paymentDetails.payment_type})`,
    });

    if (result.failedWithoutRecovery) {
      return { success: false, message: result.errMsg || 'createBankTransfer failed' };
    }
    if (!result.transferId) {
      return { success: false, message: 'createBankTransfer returned no id' };
    }

    // Upsert xero_payments row carrying the PT-MOV mapping.
    if (existing) {
      await this.xeroPayments
        .createQueryBuilder()
        .update(XeroPayments)
        .set({
          bank_transfer_id: result.transferId,
          bank_transfer_reference: ptRef,
          payment_type: paymentDetails.payment_type,
          payment_amount: amount,
          payment_date: paymentDetails.payment_date,
          updated_on: moment.tz('UTC').toDate(),
          updated_by: decoded?.userId ?? null,
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: existing.id })
        .execute();
    } else {
      await this.xeroPayments.save(
        this.xeroPayments.create({
          integration_id: xeroDetails.integration_id,
          tenant_id: xeroDetails.tenant_id,
          contact_id: null as any,
          account_id: pair.isOutflow ? (fromXa.id as any) : (toXa.id as any),
          payment_type: paymentDetails.payment_type,
          status: 'AUTHORISED',
          payment_date: paymentDetails.payment_date,
          reference: ptRef,
          payment_amount: amount,
          bank_transfer_id: result.transferId,
          bank_transfer_reference: ptRef,
          pt_payment_id: payment_id as any,
          mapped_status: 'Auto' as any,
          created_by: decoded?.userId ?? null,
          created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        }),
      );
    }

    if (!result.recovered) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'pushTrustMovementToXero',
        api_payload: { payment_id, payment_type: paymentDetails.payment_type },
        integration_id: xeroDetails.integration_id,
        log_template_id: 615,
        dynamic_values: {
          reference: ptRef,
          bank_transfer_id: result.transferId,
          payment_id,
          payment_type: paymentDetails.payment_type,
          amount: Number(amount).toFixed(2),
        },
        project_id: paymentDetails.project_id != null ? String(paymentDetails.project_id) : undefined,
        contract_id: paymentDetails.contract_id != null ? String(paymentDetails.contract_id) : undefined,
        reference: { xeroId: result.transferId, paytradeId: paymentDetails.id },
        reference_id: paymentDetails.id,
        history: [
          `Trust movement push triggered for payment ${payment_id} (${paymentDetails.payment_type})`,
          `Xero BankTransfer ${result.transferId} created with reference ${ptRef}`,
        ],
        important_checks: { 'Trust pair validation': 'Ok', 'Bank account mapping': 'Ok' },
        error_message: null,
        xero_records: [],
        paytrade_records: [paymentDetails],
        new_records: null, updated_records: null, synced_records: null,
      });
    }
    return { success: true, bank_transfer_id: result.transferId, reference: ptRef };
  }

  /**
   * Reversal — post an opposite-direction BankTransfer for a
   * previously-pushed trust movement. Stamped with
   * `PT-MOV-REV-{payment_id}` for retry idempotency. Clears the
   * forward `bank_transfer_id` on the xero_payments row so the
   * mapping reflects "no longer present".
   */
  async reverseTrustMovement(
    decoded: any,
    input: { payment_id: number },
  ): Promise<{ success: boolean; reversal_id?: string; message?: string }> {
    const payment_id = Number(input?.payment_id);
    if (!payment_id) return { success: false, message: 'payment_id is required' };

    const paymentDetails = await this.getPaymentDetails(payment_id);
    if (!paymentDetails) return { success: false, message: 'payment not found' };

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: paymentDetails.company_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails?.integration_id) return { success: false, message: 'no active xero integration' };
    if (xeroDetails.integrationDetails?.integration_status !== 'Connected - active') {
      return { success: false, message: 'xero integration not connected' };
    }

    const existing = await this.xeroPayments.findOne({
      where: {
        integration_id: xeroDetails.integration_id,
        pt_payment_id: payment_id as any,
      },
    });
    if (!existing?.bank_transfer_id) {
      return { success: true, message: 'no outbound trust movement to reverse' };
    }
    // Idempotency — if the mapping already points at the reversal
    // stamp, the prior reversal succeeded and there is nothing to do.
    // Prevents repeated cancel/edit cycles from posting duplicate
    // opposite-direction BankTransfers and drifting the ledger.
    const reversalRefStamp = `PT-MOV-REV-${payment_id}`;
    if ((existing as any)?.bank_transfer_reference === reversalRefStamp) {
      // Forward mapping was already cleared by a prior successful
      // reversal — nothing else to do.
      return { success: true, message: 'already reversed' };
    }

    const pair = await this.resolveTrustMovementPair(paymentDetails);
    if (!pair) return { success: false, message: 'pair no longer resolvable' };

    const [fromXa, toXa] = await Promise.all([
      this.xeroBankAccountDetails.findOne({
        where: { pt_bank_account_id: paymentDetails.payment_from_account as any, integration_id: xeroDetails.integration_id },
      }),
      this.xeroBankAccountDetails.findOne({
        where: { pt_bank_account_id: paymentDetails.payment_to_account as any, integration_id: xeroDetails.integration_id },
      }),
    ]);
    if (!fromXa?.account_id || !toXa?.account_id) {
      return { success: false, message: 'bank account mappings missing' };
    }

    const amount = Number(paymentDetails.total_amount ?? 0);
    const dateVal = moment().format('YYYY-MM-DD');
    const reversalRef = `PT-MOV-REV-${payment_id}`;

    await this.xeroService.refreshTokenSet(paymentDetails.company_id, this.xero);

    const result = await this.tryCreateBankTransferWithRecovery(decoded, {
      api_name: 'reverseTrustMovementInXero',
      api_payload: { payment_id, payment_type: paymentDetails.payment_type },
      integration_id: xeroDetails.integration_id,
      tenant_id: xeroDetails.tenant_id,
      // SWAP from/to to post the opposite leg.
      fromAccountId: toXa.account_id,
      toAccountId: fromXa.account_id,
      amount,
      date: dateVal,
      reference: reversalRef,
      paymentDetails,
      xeroInvoicesBills: { project_id: paymentDetails.project_id, contract_id: paymentDetails.contract_id },
      history_prefix: `Trust movement REVERSAL triggered for payment ${payment_id} (${paymentDetails.payment_type})`,
    });

    if (result.failedWithoutRecovery) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'reverseTrustMovementInXero',
        api_payload: { payment_id },
        integration_id: xeroDetails.integration_id,
        log_template_id: 618,
        dynamic_values: { reference: reversalRef, payment_id, error: result.errMsg },
        reference: { xeroId: null, paytradeId: paymentDetails.id },
        reference_id: paymentDetails.id,
        history: [`Trust movement reversal failed for payment ${payment_id}: ${result.errMsg}`],
        important_checks: { 'Reversal posted': 'Failed' },
        error_message: result.errMsg,
        xero_records: [],
        paytrade_records: [paymentDetails],
        new_records: null, updated_records: null, synced_records: null,
      });
      return { success: false, message: result.errMsg || 'reversal failed' };
    }

    // Clear the forward `bank_transfer_id` so the mapping row
    // reflects "no longer present in Xero" semantics — admins and
    // reports can distinguish unmapped/reversed from currently-linked
    // forward movements. The reversal stamp is retained in
    // `bank_transfer_reference` for audit + idempotency on retries.
    await this.xeroPayments
      .createQueryBuilder()
      .update(XeroPayments)
      .set({
        bank_transfer_id: null as any,
        bank_transfer_reference: reversalRef,
        updated_on: moment.tz('UTC').toDate(),
        updated_by: decoded?.userId ?? null,
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where('id = :id', { id: existing.id })
      .execute();

    if (!result.recovered) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'reverseTrustMovementInXero',
        api_payload: { payment_id, payment_type: paymentDetails.payment_type },
        integration_id: xeroDetails.integration_id,
        log_template_id: 617,
        dynamic_values: {
          reference: reversalRef,
          bank_transfer_id: result.transferId,
          payment_id,
          amount: Number(amount).toFixed(2),
        },
        reference: { xeroId: result.transferId, paytradeId: paymentDetails.id },
        reference_id: paymentDetails.id,
        history: [
          `Trust movement REVERSAL posted for payment ${payment_id}`,
          `Reversing Xero BankTransfer ${result.transferId} created with reference ${reversalRef}`,
        ],
        important_checks: { 'Reversal posted': 'Ok' },
        error_message: null,
        xero_records: [],
        paytrade_records: [paymentDetails],
        new_records: null, updated_records: null, synced_records: null,
      });
    }
    return { success: true, reversal_id: result.transferId };
  }

  /**
   * Inbound handler — invoked by the BANKTRANSFER.* webhook
   * dispatcher and by the manual `trust_movement` re-sync flow.
   *
   * Behaviour:
   *   - PT-MOV-{id} reference → upsert the mapping (anti-echo log 619).
   *   - PT-RET-{id} / PT-RET-REV-{id} reference → no-op here;
   *     retention transfers are handled by the existing inbound
   *     matcher inside validateAndProcessWebhookInvoice.
   *   - Otherwise → resolve from/to Xero account ids back to PT
   *     bank accounts; if they form a trust ↔ associated_cash pair
   *     owned by the same company, materialise a new PT payment
   *     (Top Up / Withdrawal / Top Up Retention) of the resolved
   *     direction and link it via xero_payments (sync log 620).
   *     Mismatched/un-mapped pairs are surfaced as sync log 621.
   */
  async handleInboundTrustMovementBankTransfer(
    input: { resource_id: string; tenant_id: string; sync_run_type?: string },
    decoded: any,
  ): Promise<{ success: boolean; created_payment_id?: number; message: string }> {
    const tenant_id = String(input?.tenant_id || '').trim();
    const bank_transfer_id = String(input?.resource_id || '').trim();
    if (!tenant_id || !bank_transfer_id) {
      return { success: false, message: 'tenant_id and resource_id are required' };
    }

    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { tenant_id, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails?.integration_id) {
      return { success: false, message: 'no active integration for tenant' };
    }

    await this.xeroService.refreshTokenSet(xeroDetails.company_id, this.xero);

    let bt: any = null;
    try {
      const resp = await this.xero.accountingApi.getBankTransfer(tenant_id, bank_transfer_id);
      bt = resp?.body?.bankTransfers?.[0] || null;
    } catch (err: any) {
      const msg = await handleAxiosError(err).catch(() => err?.message || String(err));
      this.logger.error(`[TRUST_MOV inbound] getBankTransfer failed: ${msg}`);
      return { success: false, message: `getBankTransfer failed: ${msg}` };
    }
    if (!bt) return { success: false, message: 'bank transfer not found in Xero' };

    const reference: string = String(bt?.reference || '');
    const xeroFromId: string = bt?.fromBankAccount?.accountID;
    const xeroToId: string = bt?.toBankAccount?.accountID;
    const amount = Number(bt?.amount || 0);
    const btDate = bt?.date ? new Date(bt.date) : new Date();

    // Self-echo (PT-RET-* / PT-RET-REV-*) — retention flow handles
    // its own anti-echo via the invoice update pipeline.
    if (/^PT-RET-(REV-)?\d+$/.test(reference)) {
      return { success: true, message: `retention transfer (${reference}) — handled by retention flow` };
    }

    // Self-echo of an outbound trust-movement we just pushed.
    if (/^PT-MOV-(REV-)?\d+$/.test(reference)) {
      const m = /^PT-MOV-(REV-)?(\d+)$/.exec(reference);
      const ptPaymentId = Number(m?.[2]);
      const isReversal = !!m?.[1];
      let existing = await this.xeroPayments.findOne({
        where: { integration_id: xeroDetails.integration_id, pt_payment_id: ptPaymentId as any },
      });
      // Forward stamp re-attach: only bind the inbound BankTransfer's
      // id back onto an existing mapping row when this is the FORWARD
      // PT-MOV-{id} echo. Reversal echoes (PT-MOV-REV-{id}) must NOT
      // repopulate `bank_transfer_id` — `reverseTrustMovement` deliberately
      // clears it so the row reflects "no longer present in Xero", and
      // re-attaching the reversal id here would defeat that invariant
      // and re-link the mapping to the opposite-direction transfer.
      if (existing && !existing.bank_transfer_id && !isReversal) {
        try {
          await this.xeroPayments
            .createQueryBuilder()
            .update(XeroPayments)
            .set({ bank_transfer_id, bank_transfer_reference: reference })
            .where('id = :id', { id: existing.id })
            .execute();
        } catch (e: any) {
          // Unique violation on bank_transfer_id → another worker
          // already claimed this BankTransfer; safe to ignore.
          if (!String(e?.message || '').includes('uq_xero_payments_bank_transfer_id')) throw e;
        }
      } else if (!existing && !isReversal) {
        // True upsert: PT payment still exists but its xero_payments
        // mapping row was lost (e.g. manual cleanup). Recreate it so
        // future reconciliation has the link back.
        const pt = await this.paymentDetails.findOne({ where: { payment_id: ptPaymentId as any } });
        if (pt) {
          try {
            const saved = await this.xeroPayments.save(
              this.xeroPayments.create({
                integration_id: xeroDetails.integration_id,
                tenant_id,
                contact_id: null as any,
                account_id: null as any,
                payment_type: pt.payment_type,
                status: 'AUTHORISED',
                payment_date: pt.payment_date,
                reference,
                payment_amount: amount,
                bank_transfer_id,
                bank_transfer_reference: reference,
                pt_payment_id: ptPaymentId as any,
                mapped_status: 'Auto' as any,
                created_by: decoded?.userId ?? null,
                created_group: 'SYSTEM' as any,
              }),
            );
            existing = saved as any;
          } catch (e: any) {
            if (!String(e?.message || '').includes('uq_xero_payments_bank_transfer_id')) throw e;
          }
        }
      }
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'handleInboundTrustMovementBankTransfer',
        api_payload: { resource_id: bank_transfer_id, tenant_id, reference },
        integration_id: xeroDetails.integration_id,
        log_template_id: 619,
        dynamic_values: { reference, bank_transfer_id, payment_id: ptPaymentId, kind: isReversal ? 'reversal' : 'forward' },
        reference: { xeroId: bank_transfer_id, paytradeId: existing?.id || null },
        reference_id: existing?.id || null,
        history: [
          `Inbound BankTransfer ${bank_transfer_id} matched our PT-MOV reference ${reference}`,
          `Anti-echo: no PT-side action required (${isReversal ? 'reversal' : 'forward'})`,
        ],
        important_checks: { 'Anti-echo match': 'Ok' },
        error_message: null,
        xero_records: [bt],
        paytrade_records: [],
        new_records: null, updated_records: null, synced_records: null,
      });
      return { success: true, message: 'matched outbound trust movement (anti-echo)' };
    }

    // Already mapped to a PT payment by bank_transfer_id? No-op.
    const alreadyMapped = await this.xeroPayments.findOne({
      where: { integration_id: xeroDetails.integration_id, bank_transfer_id: bank_transfer_id as any },
    });
    if (alreadyMapped) {
      return { success: true, message: 'already mapped' };
    }

    // Resolve from/to back to PT bank accounts.
    const [fromXa, toXa] = await Promise.all([
      this.xeroBankAccountDetails.findOne({
        where: { account_id: xeroFromId as any, integration_id: xeroDetails.integration_id },
      }),
      this.xeroBankAccountDetails.findOne({
        where: { account_id: xeroToId as any, integration_id: xeroDetails.integration_id },
      }),
    ]);
    if (!fromXa?.pt_bank_account_id || !toXa?.pt_bank_account_id) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'handleInboundTrustMovementBankTransfer',
        api_payload: { resource_id: bank_transfer_id, tenant_id, reference },
        integration_id: xeroDetails.integration_id,
        log_template_id: 621,
        dynamic_values: { bank_transfer_id, reason: 'unmapped bank accounts' },
        reference: { xeroId: bank_transfer_id, paytradeId: null },
        history: [
          `Inbound BankTransfer ${bank_transfer_id} ignored — one or both accounts are not mapped in PayTrade`,
        ],
        important_checks: { 'Account mapping': 'Failed' },
        error_message: 'unmapped bank accounts',
        xero_records: [bt],
        paytrade_records: [],
        new_records: null, updated_records: null, synced_records: null,
      });
      return { success: false, message: 'unmapped bank accounts' };
    }

    const [fromBank, toBank] = await Promise.all([
      this.bankAccounts.findOne({ where: { bank_account_id: fromXa.pt_bank_account_id as any } }),
      this.bankAccounts.findOne({ where: { bank_account_id: toXa.pt_bank_account_id as any } }),
    ]);
    if (!fromBank || !toBank || Number(fromBank.company_id) !== Number(toBank.company_id)) {
      return { success: false, message: 'bank account company mismatch' };
    }
    const TRUST = new Set(['Project Trust Account', 'Retention Trust Account']);
    const fromIsTrust = TRUST.has(String(fromBank.account_type));
    const toIsTrust = TRUST.has(String(toBank.account_type));
    if (fromIsTrust === toIsTrust) {
      return { success: false, message: 'not a trust↔cash pair' };
    }
    const trustBank = fromIsTrust ? fromBank : toBank;
    const cashBank = fromIsTrust ? toBank : fromBank;
    if (Number(trustBank.associated_cash_account_id) !== Number(cashBank.bank_account_id)) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        api_name: 'handleInboundTrustMovementBankTransfer',
        api_payload: { resource_id: bank_transfer_id, tenant_id, reference },
        integration_id: xeroDetails.integration_id,
        log_template_id: 621,
        dynamic_values: { bank_transfer_id, reason: 'cash account is not the trust account\'s associated_cash_account_id' },
        reference: { xeroId: bank_transfer_id, paytradeId: null },
        history: [
          `Inbound BankTransfer ${bank_transfer_id} ignored — cash account is not the trust account's associated cash account`,
        ],
        important_checks: { 'Trust pair validation': 'Failed' },
        error_message: 'cash account is not the trust\'s associated cash account',
        xero_records: [bt],
        paytrade_records: [],
        new_records: null, updated_records: null, synced_records: null,
      });
      return { success: false, message: 'cash account is not the trust\'s associated cash account' };
    }

    // Direction + reference-keyword → payment_type mapping. Xero gives
    // us no first-class signal for Interest/Bank Charge variants, but
    // the user-facing `reference` and `narration`/memo on the
    // BankTransfer often contains those words. Parse them; fall back
    // to a safe neutral default (Withdrawal / Top Up / Top Up Retention)
    // and emit a warn-level sync log so the admin can re-classify.
    const refTextRaw = `${reference || ''} ${(bt as any)?.narration || ''}`;
    const isRtaTrust = String(trustBank.account_type) === 'Retention Trust Account';
    const inferred = XeroPaymentsService.inferTrustMovementType({
      fromIsTrust,
      isRtaTrust,
      refText: refTextRaw,
    });
    const payment_type = inferred.payment_type;
    const typeAmbiguous = inferred.ambiguous;
    if (typeAmbiguous) {
      try {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          api_name: 'handleInboundTrustMovementBankTransfer',
          api_payload: { resource_id: bank_transfer_id, tenant_id, reference },
          integration_id: xeroDetails.integration_id,
          log_template_id: 622,
          dynamic_values: {
            bank_transfer_id,
            payment_id: null,
            payment_type,
            reason: `Reference "${reference || '(empty)'}" had no Interest/Bank Charge hint — defaulted to ${payment_type}`,
          },
          reference: { xeroId: bank_transfer_id, paytradeId: null },
          history: [
            `Inbound BankTransfer ${bank_transfer_id} type inference is neutral — defaulted to ${payment_type}`,
            'Re-classify in PayTrade if this should be Interest Received/Withdrawal or Bank Charge Applied/Top Up.',
          ],
          important_checks: { 'Type classification': 'Warn' },
          error_message: null,
          xero_records: [bt],
          paytrade_records: [],
          new_records: null, updated_records: null, synced_records: null,
        });
      } catch {}
    }

    // Materialise the PT payment + matched sub_payment + xero_payments
    // mapping in one transaction so a partial failure can't leave a
    // BankTransfer with no PT side. The unique index on
    // xero_payments.bank_transfer_id collapses any concurrent race
    // (webhook + manual sync hitting at the same moment) into one
    // winning insert; the loser catches the violation and exits.
    let created: PaymentDetails;
    try {
      created = await this.entityManager.transaction(async (txn) => {
      const paymentRow = (await txn.save(
        PaymentDetails,
        this.paymentDetails.create({
          company_id: trustBank.company_id,
          payment_type: payment_type as any,
          cash_retention: false as any,
          payment_from_account: fromBank.bank_account_id,
          payment_to_account: toBank.bank_account_id,
          total_amount: amount,
          payment_date: btDate,
          input_date: btDate,
          current_status: 'Confirmed - Matched',
          created_by: decoded?.userId ?? null,
          created_group: 'SYSTEM' as any,
          memo: `Imported from Xero BankTransfer ${bank_transfer_id}`,
        } as any),
      )) as unknown as PaymentDetails;
      // Bump payment_id into the 10000000000+ namespace, mirroring addPayment.
      await txn
        .createQueryBuilder()
        .update(PaymentDetails)
        .set({ payment_id: 10000000000 + Number(paymentRow.payment_id) })
        .where('id = :id', { id: paymentRow.id })
        .execute();
      const reloaded = await txn.findOne(PaymentDetails, { where: { id: paymentRow.id } });

      // Leave sub_payment status as 'Unmatched' so Smart Match offers
      // this PT payment as a candidate against the inbound bank-feed
      // line in Bookkeeping. The Xero side is already linked via
      // xero_payments.bank_transfer_id; that link is independent of the
      // PT-side bank-feed reconciliation. When the user later accepts
      // the Smart Match suggestion, the existing matchTxnsToPayments
      // flow flips this row to 'Auto matched' and re-calls
      // createJournals — which no-ops because the journals we post
      // below already exist (idempotent check at
      // payment-claims.service.ts:3119).
      const subPayment = (await txn.save(
        SubPayments,
        this.subPaymentsRepo.create({
          payment_id: reloaded.payment_id,
          sub_payment_type: 'Payment',
          amount: fromIsTrust ? -Math.abs(amount) : Math.abs(amount),
          status: 'Unmatched',
          is_paid_confirmed: fromIsTrust ? true : null,
          is_received_confirmed: fromIsTrust ? null : true,
          created_by: decoded?.userId ?? null,
          created_group: 'SYSTEM' as any,
        } as any),
      )) as unknown as SubPayments;
      await txn
        .createQueryBuilder()
        .update(SubPayments)
        .set({ sub_payment_id: 10000000000 + Number(subPayment.sub_payment_id) })
        .where('id = :id', { id: subPayment.id })
        .execute();

      const reference_stamp = `PT-MOV-${reloaded.payment_id}`;
      await txn.save(
        XeroPayments,
        this.xeroPayments.create({
          integration_id: xeroDetails.integration_id,
          tenant_id,
          contact_id: null as any,
          account_id: (fromIsTrust ? fromXa.id : toXa.id) as any,
          payment_type,
          status: 'AUTHORISED',
          payment_date: btDate,
          reference: reference_stamp,
          payment_amount: amount,
          bank_transfer_id,
          bank_transfer_reference: reference || null,
          pt_payment_id: reloaded.payment_id as any,
          mapped_status: 'Auto' as any,
          created_by: decoded?.userId ?? null,
          created_group: 'SYSTEM' as any,
        }),
      );

      // Post the double-entry journal pair for this trust movement.
      // Routes via createJournals → otherPayments branch
      // (payment-claims.service.ts:4096), which selects the correct
      // process_id per payment_type (Top Up=43, Top Up Retention=42,
      // Withdrawal PTA=1 / RTA=2, Interest Received=12, Interest
      // Withdrawal=17, Bank Charge Applied=4, Bank Charge Top Up=43)
      // and posts the matching `journal_entries` rows on both the
      // trust and cash bank accounts. Idempotent — if the user later
      // accepts a Smart Match suggestion that re-invokes this for the
      // same audit_id, the existing-journals check no-ops it.
      await this.paymentClaimsService.createJournals(
        txn,
        null,
        reloaded,
        'Payment',
        null,
        null,
        false,
        decoded?.userId ?? null,
      );

      return reloaded;
      });
    } catch (e: any) {
      if (String(e?.message || '').includes('uq_xero_payments_bank_transfer_id')) {
        return { success: true, message: 'already mapped (concurrent insert)' };
      }
      throw e;
    }

    await this.xeroService.insertXeroSyncLogs(decoded, {
      api_name: 'handleInboundTrustMovementBankTransfer',
      api_payload: { resource_id: bank_transfer_id, tenant_id, reference, sync_run_type: input?.sync_run_type || 'webhook' },
      integration_id: xeroDetails.integration_id,
      log_template_id: 620,
      dynamic_values: {
        bank_transfer_id,
        payment_id: created.payment_id,
        payment_type,
        amount: Number(amount).toFixed(2),
      },
      reference: { xeroId: bank_transfer_id, paytradeId: created.id },
      reference_id: created.id,
      history: [
        `Inbound BankTransfer ${bank_transfer_id} (${reference || 'no reference'}) imported as PT payment ${created.payment_id} (${payment_type})`,
        `Direction: ${fromBank.account_type} → ${toBank.account_type}; amount ${Number(amount).toFixed(2)}`,
      ],
      important_checks: { 'Trust pair validation': 'Ok', 'PT payment created': 'Ok' },
      error_message: null,
      xero_records: [bt],
      paytrade_records: [created],
      new_records: [{ payment_id: created.payment_id }],
      updated_records: null,
      synced_records: null,
    });

    return { success: true, created_payment_id: created.payment_id, message: 'imported' };
  }

  async unMappingPayment(payment_id: string, company_id: number, decoded: any) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const response = await this.xeroPayments
        .createQueryBuilder()
        .update(XeroPayments)
        .set({
          pt_payment_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'payment_id = :payment_id AND integration_id = :integration_id',
          {
            payment_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Payment has been unmapped successfully`;
      } else {
        return `Payment is not unmapped`;
      }
    } catch (error) {
      throw error;
    }
  }
}
