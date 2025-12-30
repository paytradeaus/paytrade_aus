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
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
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
import { SubPayments } from 'src/entities/sub-payments.entity';
import { StatusService } from 'src/api/users/banking/ui-status.service';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroPaymentsService {
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
    private readonly xeroService: XeroService,
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

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data, category_type: 'contract' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 329,
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
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
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
          (!xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            !xeroDetails.liability_payable_code ||
            !xeroDetails.retention_payable_release_code)) ||
        (xeroInvoicesBills.type === String(Invoice.TypeEnum.ACCREC) &&
          (!xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            !xeroDetails.liability_receivable_code ||
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

      const xeroContractDetails = xeroInvoicesBills?.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              id: xeroInvoicesBills?.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!xeroContractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: { ...data },
          integration_id: xeroDetails.integration_id,
          log_template_id: 188,
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
            'Contract mapping validation': 'Failed',
          },
          error_message: `Contract details not found`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (!xeroContractDetails.pt_contract_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createPaymentInXero',
          api_payload: {
            ...data,
            mapping_contract_id: xeroInvoicesBills?.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 189,
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
            'Contract mapping validation': 'Failed',
          },
          error_message: `Contract details not mapped`,
          xero_records: [],
          paytrade_records: [paymentDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
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
      try {
        const dateValue = moment(payment_date).toDate();

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

        const response = await this.xero.accountingApi.createPayment(
          xeroDetails.tenant_id,
          payment,
        );

        console.log('Payment created:', response.body.payments[0]);
        if (response.body.payments) {
          let bank_transfer_id = null;
          if (cash_retention) {
            const bankTransfer: BankTransfer = {
              fromBankAccount: { accountID: xeroBankAccountDetails.account_id }, // main account
              toBankAccount: {
                accountID: xeroRetentionBankAccountDetails.account_id,
              }, // trust account
              amount: retention_amount,
              date: dateValue,
            };
            console.log({ bankTransfer });
            const retentionTransfer =
              await this.xero.accountingApi.createBankTransfer(
                xeroDetails.tenant_id,
                { bankTransfers: [bankTransfer] },
              );
            if (retentionTransfer?.body?.bankTransfers) {
              console.log(
                'retention: ',
                retentionTransfer?.body?.bankTransfers,
              );
              bank_transfer_id =
                retentionTransfer?.body?.bankTransfers[0]?.bankTransferID;
            }
          }
          const payment = response.body.payments[0];
          let requestData: any = {
            payment_id: payment.paymentID,
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            contact_id: xeroContactDetails.id,
            invoice_id: xeroInvoicesBills.id,
            account_id: xeroBankAccountDetails.id,
            payment_type: payment.paymentType,
            status: payment.status,
            payment_date: payment.date,
            reference: payment.reference,
            payment_amount: payment.amount,
            bank_amount: payment.bankAmount,
            is_reconciled: payment.isReconciled,
            bank_transfer_id: bank_transfer_id,
            // credit_note_id: creditNote.creditNoteID,
            // credit_note_allocation_id: allocation.allocationID,
            // credit_note_type: creditNote.type,
            // credit_note_status: creditNote.status,
            // credit_amount: creditNote.total,
            // credit_note_date: creditNote.date,
            pt_payment_id: payment_id,
            mapped_status: 'System',
            created_on: payment.updatedDateUTC,
            created_by: decoded?.userId,
            created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          };
          console.log({ requestData });
          const xeroPayments = await this.xeroPayments.create(requestData);
          const xeroResponse: any = await this.xeroPayments.save(xeroPayments);
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

        console.log('Overpayment created: ', response.body.bankTransactions[0]);
        if (response.body.bankTransactions) {
          const bankTransaction = response.body.bankTransactions[0];
          const overpaymentResponse =
            await this.xero.accountingApi.getOverpayment(
              xeroDetails.tenant_id,
              bankTransaction?.overpaymentID,
            );
          console.log('opRes: ', overpaymentResponse.body.overpayments[0]);
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
          console.log({ requestData });
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
        console.log(
          'xeroPayments: ',
          xeroPayments?.status,
          xeroPayment?.body?.bankTransactions[0],
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
        console.log('xeroOverpayment: ', xeroOverpayment.body.overpayments[0]);
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
          console.log(
            'response over payment deleted:',
            response?.body?.payments[0],
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
              console.log('refundDetails:', refundDetails?.body?.payments[0]);
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

            console.log({ requestData });
            if (requestData && requestData.length > 0) {
              if (requestData.length == 1) {
                const newXeroPayments =
                  await this.xeroPayments.create(requestData);
                const xeroRefundPayments: any =
                  await this.xeroPayments.save(newXeroPayments);
                console.log({ xeroRefundPayments });
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
        console.log(
          xeroPayments.status,
          xeroPayment?.body?.payments[0]?.status,
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
          console.log(
            'response deleted:',
            response.response.data?.Payments[0]?.Status,
          );
          if (response.response.data?.Payments[0]?.Status === 'DELETED') {
            let bank_transfer_id = xeroPayments.bank_transfer_id || null;
            if (cash_retention) {
              const dateValue = moment.utc().toDate();
              const bankTransfer: BankTransfer = {
                fromBankAccount: {
                  accountID: xeroRetentionBankAccountDetails.account_id,
                }, // trust account
                toBankAccount: { accountID: xeroBankAccountDetails.account_id }, // main account
                amount: retention_amount,
                date: dateValue,
              };

              const retentionTransfer =
                await this.xero.accountingApi.createBankTransfer(
                  xeroDetails.tenant_id,
                  { bankTransfers: [bankTransfer] },
                );
              if (retentionTransfer?.body?.bankTransfers) {
                bank_transfer_id =
                  retentionTransfer?.body?.bankTransfers[0]?.bankTransferID;
                console.log(
                  'retention: ',
                  retentionTransfer?.body?.bankTransfers,
                );
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

            console.log({ xeroRes });
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

  async deleteOverPayment(decoded: any, data: DeleteOverPaymentInput) {
    try {
      const { payment_id } = data;
      console.log({ overpaymentData: data });

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
        console.log(
          'xeroPayments: ',
          xeroPayments?.status,
          xeroPayment?.body?.bankTransactions[0],
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
        console.log('xeroOverpayment: ', xeroOverpayment.body.overpayments[0]);
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
          console.log(
            'response over payment deleted:',
            response?.body?.payments[0],
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
              console.log('refundDetails:', refundDetails?.body?.payments[0]);
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
                console.log({ requestData });
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

                console.log({ paytradePayload });
                const createPaymentDetails =
                  await this.paymentDetails.create(paytradePayload);
                const ptPaymentDetails: any =
                  await this.paymentDetails.save(createPaymentDetails);
                console.log({ ptPaymentDetails });
                const pt_payment_id =
                  10000000000 + Number(ptPaymentDetails.payment_id);
                console.log({ pt_payment_id });
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
                console.log({ subPaymentData });
                const createdSubPaymentDetails: any =
                  await this.subPaymentsRepo.save(
                    this.subPaymentsRepo.create(subPaymentData),
                  );
                console.log({ createdSubPaymentDetails });
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

      console.log({ xeroPayments });
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

        console.log({ xeroOverPayments });

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
        console.log(
          xeroPayments.status,
          xeroPayment?.body?.payments[0]?.status,
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
          console.log(
            'response deleted:',
            response.response.data?.Payments[0]?.Status,
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
        console.log('response created:', response.body.creditNotes[0]);
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
          console.log('allocations:', allocations);
          const createCreditNoteAllocation =
            await this.xero.accountingApi.createCreditNoteAllocation(
              xeroDetails.tenant_id,
              creditNotes.creditNoteID,
              allocations,
            );
          console.log(
            'createCreditNoteAllocation created:',
            createCreditNoteAllocation?.body?.allocations[0],
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
            console.log({ requestData });
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
          console.log(
            'response created:',
            response.response.data.Allocations[0].IsDeleted,
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
      console.log('paymentDetails:', paymentDetails?.body?.payments[0]);
      if (paymentDetails.body.payments[0]) {
        return paymentDetails.body.payments[0];
      }
      throw paymentDetails;
    } catch (error) {
      console.log({ error });
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
      console.log({ paymentResponse: paymentResponse?.body?.payments });
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
      console.log('Payment lookup failed with:', statusCode);

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
      console.log({ bankTxResponse: bankTxResponse?.body?.bankTransactions });
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
      console.log('BankTransaction lookup failed with:', statusCode);

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
      console.log({ paymentListResponse: paymentListResponse?.body?.payments });
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
      console.log('PaymentList lookup failed with:', statusCode);

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

      console.log('response.body: ', response?.body?.payments[0]);
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
          console.log('payment: ', payment.paymentID, payment.paymentType);
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
        console.log(`Inserted ${xeroPayments.length} new payments.`);
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
        console.log(`Updated ${existingPayments.length} existing payments.`);
      }

      console.log(
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

      console.log('All payments fetched, inserted, and updated successfully.');

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
