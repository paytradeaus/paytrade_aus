import { Injectable } from '@nestjs/common';
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
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { XeroInvoicesBills } from 'src/entities/xero-invoices-bills.entity';
import { PaymentClaimTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { PaymentClaimsService } from 'src/api/users/banking/payment-claims/payment-claims.service';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { AddPaymentClaimInput } from 'src/api/users/banking/payment-claims/payment-claims.input';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroInvoicesService {
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
    @InjectRepository(PaymentClaimInvoices)
    private paymentClaimInvoices: Repository<PaymentClaimInvoices>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly xeroService: XeroService,
    private readonly dataSource: DataSource,
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

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            category_type: 'contract',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 300 : 302,
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
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let expectedCodeCheck = null;

      if (claimDetails.cash_retention_type === 'Claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            !xeroDetails.liability_payable_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            !xeroDetails.liability_receivable_code;
        }
      } else if (claimDetails.cash_retention_type === 'Retention claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            !xeroDetails.liability_payable_code ||
            !xeroDetails.retention_payable_release_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            !xeroDetails.liability_receivable_code ||
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

      const xeroContactDetails = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: claimDetails.client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroContactDetails) {
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
          error_message: `Client/Supplier details not mapped`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroContractDetails = claimDetails.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              pt_contract_id: claimDetails.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (claimDetails.status !== 'Draft' && !xeroContractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            contract_id: claimDetails.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 91 : 103,
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
          api_name: 'createInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            project_id: claimDetails.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 92 : 104,
          dynamic_values: {},
          project_id: null,
          contract_id: xeroContractDetails.id,
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
          contract_id: xeroContractDetails.id,
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
      if (contractTracking) {
        lineItemTrackings.push(contractTracking);
      }

      if (projectTracking) {
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

      if (invoices && invoices.length > 0 && invoices[0] !== null) {
        console.log({ invoices });
        let lineItems = [];
        const totalLineAmount = invoices?.reduce((sum, item) => {
          return (
            sum +
            (claimDetails.is_gst_optional
              ? item?.total_amount_including_gst === null
                ? 0.0
                : Math.abs(Number(item?.total_amount_including_gst))
              : item?.unit_price === null
                ? 0.0
                : Math.abs(Number(item?.unit_price)))
          );
        }, 0.0);
        for (const element of invoices) {
          const retentionShare = claimDetails.retention_amount
            ? ((claimDetails.is_gst_optional
                ? Number(claimDetails.retention_amount) * 1.1
                : Number(claimDetails.retention_amount)) *
                (claimDetails.is_gst_optional
                  ? Number(element.total_amount_including_gst)
                  : Number(element.unit_price))) /
              totalLineAmount
            : 0;
          let lineItem: LineItem = {
            description: element.description,
            quantity: element.quantity,
            unitAmount:
              (claimDetails.is_gst_optional
                ? Number(element.total_amount_including_gst)
                : Number(element.unit_price)) - retentionShare,
            accountCode:
              claimDetails.cash_retention_type === 'Claim'
                ? claimDetails.claim_type === 'Billable'
                  ? xeroDetails.bill_code
                  : xeroDetails.invoice_code
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
          const lineItem1: LineItem = {
            description: 'Retention Held',
            quantity: 1,
            unitAmount: claimDetails.is_gst_optional
              ? claimDetails.retention_amount * 1.1
              : claimDetails.retention_amount,
            accountCode:
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code,
            tracking: lineItemTrackings,
          };
          const lineItem2: LineItem = {
            description: 'Liability for defects',
            quantity: 1,
            unitAmount: Number(
              '-' +
                (claimDetails.is_gst_optional
                  ? claimDetails.retention_amount * 1.1
                  : claimDetails.retention_amount),
            ),
            accountCode:
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.liability_payable_code
                : xeroDetails.liability_receivable_code,
            tracking: lineItemTrackings,
          };
          lineItems.push(lineItem1);
          lineItems.push(lineItem2);
        } else if (claimDetails.cash_retention_type === 'Retention claim') {
          claimDetails.retention_amount = invoices?.reduce((sum, item) => {
            return (
              sum +
              (item?.total_amount_including_gst === null
                ? 0.0
                : Math.abs(Number(item?.total_amount_including_gst)))
            );
          }, 0.0);
          const lineItem1: LineItem = {
            description: 'Liability for defects',
            quantity: 1,
            unitAmount: claimDetails.is_gst_optional
              ? claimDetails.retention_amount * 1.1
              : claimDetails.retention_amount,
            accountCode:
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.liability_payable_code
                : xeroDetails.liability_receivable_code,
            tracking: lineItemTrackings,
          };
          const lineItem2: LineItem = {
            description: 'Retention Release',
            quantity: 1,
            unitAmount: Number(
              '-' +
                (claimDetails.is_gst_optional
                  ? claimDetails.retention_amount * 1.1
                  : claimDetails.retention_amount),
            ),
            accountCode:
              claimDetails.claim_type === 'Billable'
                ? xeroDetails.retention_payable_retained_code
                : xeroDetails.retention_receivable_retained_code,
            tracking: lineItemTrackings,
          };

          lineItems.push(lineItem1);
          lineItems.push(lineItem2);
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

        console.log('Invoice created:', response.body.invoices[0]);
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
            reference: invoice.reference,
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
          console.log({ requestData });

          const xeroResponse: any =
            await this.insertInvoiceDetails(requestData);
          if (xeroResponse) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: claimDetails.claim_type === 'Billable' ? 50 : 63,
              dynamic_values: { id: xeroResponse?.id },
              project_id: xeroProjectDetails.id,
              contract_id: xeroContractDetails.id,
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
              contract_id: xeroContractDetails.id,
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
            contract_id: xeroContractDetails.id,
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

    if (!xeroDetails.contract_category_id) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          category_type: 'contract',
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 316 : 317,
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
        error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

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

    if (invoiceDetails.type === Invoice.TypeEnum.ACCPAY) {
      expectedCodeCheck =
        !xeroDetails.bill_code ||
        !xeroDetails.retention_payable_retained_code ||
        !xeroDetails.liability_payable_code ||
        !xeroDetails.retention_payable_release_code;
    } else if (invoiceDetails.type === Invoice.TypeEnum.ACCREC) {
      expectedCodeCheck =
        !xeroDetails.invoice_code ||
        !xeroDetails.retention_receivable_retained_code ||
        !xeroDetails.liability_receivable_code ||
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

    if (
      invoiceDetails.lineItems.length > 0 &&
      invoiceDetails.lineItems?.some(
        (item) => item?.taxAmount > 0 && item?.taxType !== expectedTaxCode,
      )
    ) {
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
        error_message: `Mismatch in tax field type`,
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

    const xeroContractDetails = contractTrackingId
      ? await this.xeroContractDetails.findOne({
          where: {
            contract_id: contractTrackingId,
            integration_id: xeroDetails.integration_id,
          },
        })
      : null;

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      !xeroContractDetails
    ) {
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
        error_message: `Contract details not found`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

    const contractDetails =
      xeroContractDetails && xeroContractDetails?.pt_contract_id
        ? await this.contractDetails.findOne({
            where: { contract_id: xeroContractDetails.pt_contract_id },
          })
        : null;

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      !contractDetails
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
          contract_id: contractTrackingId,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 143 : 144,
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
        error_message: `Contract details not mapped`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

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

    if (
      invoiceDetails?.status !== Invoice.StatusEnum.DRAFT &&
      clientSuppliersDetails.client_supplier_id !==
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
      projectDetails.project_id !== contractDetails.project_id
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
      await this.xeroInvoicesBills.save(existingXeroInvoice);
    }

    const retentionClaimnlineItem = invoiceDetails?.lineItems?.some(
      (item) =>
        item?.accountCode ===
        (invoiceDetails.type === Invoice.TypeEnum.ACCPAY
          ? xeroDetails.retention_payable_release_code
          : xeroDetails.retention_receivable_release_code),
    );

    const lineItem1 = invoiceDetails?.lineItems?.some(
      (item) =>
        item?.accountCode ===
        (retentionClaimnlineItem
          ? invoiceDetails.type === Invoice.TypeEnum.ACCPAY
            ? xeroDetails.retention_payable_release_code
            : xeroDetails.retention_receivable_release_code
          : invoiceDetails.type === Invoice.TypeEnum.ACCPAY
            ? xeroDetails.retention_payable_retained_code
            : xeroDetails.retention_receivable_retained_code),
    );

    const lineItem2 = invoiceDetails?.lineItems?.some(
      (item) =>
        item?.accountCode ===
        (invoiceDetails.type === Invoice.TypeEnum.ACCPAY
          ? xeroDetails.liability_payable_code
          : xeroDetails.liability_receivable_code),
    );

    if ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2)) {
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
        console.log(retentionDetails);

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

    const retentionAmount = retentionLineItems.reduce((sum, item) => {
      return (
        sum +
        (item?.unitAmount === null ? 0.0 : Math.abs(Number(item?.unitAmount))) +
        (item?.taxAmount === null ? 0.0 : Number(item?.taxAmount))
      );
    }, 0.0);

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

      invoices = await this.adjustItemsWithRetention(
        invoiceDetails,
        filteredInvoices,
        retentionAmount,
        invoiceDetails.lineAmountTypes,
      );

      const subtotal = invoices.reduce((sum, i) => sum + i.unit_price, 0);
      retainedAmountExcludingGST = retentionAmount
        ? invoiceDetails.lineAmountTypes !== LineAmountTypes.NoTax
          ? retentionAmount / 1.1
          : retentionAmount
        : 0;
      retentionPercentage = (retainedAmountExcludingGST / subtotal) * 100;
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

    if (
      invoiceDetails?.date &&
      moment
        .tz(invoiceDetails?.date, 'UTC')
        .utc()
        .isAfter(moment.tz('UTC').startOf('day').utc())
    ) {
      await this.xeroService.insertXeroSyncLogs(decoded, {
        id: data?.sync_id,
        api_name: 'createInvoiceOrBillInPaytrade',
        api_payload: {
          invoice_id: data.invoice_id,
        },
        integration_id: xeroDetails.integration_id,
        log_template_id:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY ? 355 : 356,
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
        error_message:
          invoiceDetails.type === Invoice.TypeEnum.ACCPAY
            ? `The received date is in the future`
            : `The sent date is in the future`,
        xero_records: [invoiceDetails],
        paytrade_records: [],
        new_records: null,
        updated_records: null,
        synced_records: null,
      });
      return false;
    }

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
      claim_amount: Number(invoiceDetails.total || 0) + retentionAmount,
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
    console.log('response', response);

    return {
      id: response.id,
      invoice_id: response.payment_claim_id,
      status: response.status,
    };
  }

  async adjustItemsWithRetention(
    invoice,
    items,
    retentionAmountIncludingGST: number,
    lineAmountTypes,
  ) {
    const totalOriginal = (invoice?.subTotal ?? 0) + (invoice?.totalTax ?? 0);

    return items.map((item) => {
      const unitAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount - item.taxAmount
          : item.unitAmount;

      const lineAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount * item.quantity
          : item.unitAmount * item.quantity + item.taxAmount;

      const itemRatio = lineAmount / totalOriginal;

      const retentionShare = retentionAmountIncludingGST * itemRatio;

      const baseRatio = unitAmount / lineAmount;

      const taxRatio = item.taxAmount / lineAmount;

      const unitRetention = retentionShare * baseRatio;
      const taxRetention = retentionShare * taxRatio;

      const newUnitAmount = unitAmount + unitRetention;
      const newTaxAmount = item.taxAmount + taxRetention;
      const newAmountIncludingGST = lineAmount + retentionShare;

      console.log({
        newUnitAmount,
        newTaxAmount,
        newAmountIncludingGST,
        unitRetention,
        taxRetention,
        retentionShare,
      });
      return {
        unit_price: [
          LineAmountTypes.Inclusive,
          LineAmountTypes.Exclusive,
        ].includes(lineAmountTypes)
          ? parseFloat(newUnitAmount.toFixed(2))
          : parseFloat(newUnitAmount.toFixed(2)),
        gst: [LineAmountTypes.Inclusive, LineAmountTypes.Exclusive].includes(
          lineAmountTypes,
        )
          ? parseFloat(newTaxAmount.toFixed(2))
          : 0.0,
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
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editInvoiceOrBillInXero',
          api_payload: {
            payment_claim_id: data.payment_claim_id,
            category_type: 'contract',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: claimDetails.claim_type == 'Billable' ? 301 : 303,
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
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let expectedCodeCheck = null;

      if (claimDetails.cash_retention_type === 'Claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            !xeroDetails.liability_payable_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            !xeroDetails.liability_receivable_code;
        }
      } else if (claimDetails.cash_retention_type === 'Retention claim') {
        if (claimDetails.claim_type === 'Billable') {
          expectedCodeCheck =
            !xeroDetails.bill_code ||
            !xeroDetails.retention_payable_retained_code ||
            !xeroDetails.liability_payable_code ||
            !xeroDetails.retention_payable_release_code;
        } else if (claimDetails.claim_type === 'Receivable') {
          expectedCodeCheck =
            !xeroDetails.invoice_code ||
            !xeroDetails.retention_receivable_retained_code ||
            !xeroDetails.liability_receivable_code ||
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

      if (!xeroContactDetails) {
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
          error_message: `Client/Supplier details not mapped`,
          xero_records: [],
          paytrade_records: [claimDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroContractDetails = claimDetails.contract_id
        ? await this.xeroContractDetails.findOne({
            where: {
              pt_contract_id: claimDetails.contract_id,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

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
          contract_id: xeroContractDetails.id,
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
      console.log('invoiceDetails:', invoiceDetails?.body?.invoices[0]);
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
        if (contractTracking) {
          lineItemTrackings.push(contractTracking);
        }

        if (projectTracking) {
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

        if (invoices && invoices.length > 0 && invoices[0] !== null) {
          let lineItems = [];
          const totalLineAmount = invoices?.reduce((sum, item) => {
            return (
              sum +
              (claimDetails.is_gst_optional
                ? item?.total_amount_including_gst === null
                  ? 0.0
                  : Math.abs(Number(item?.total_amount_including_gst))
                : item?.unit_price === null
                  ? 0.0
                  : Math.abs(Number(item?.unit_price)))
            );
          }, 0.0);
          for (const element of invoices) {
            const retentionShare = claimDetails.retention_amount
              ? ((claimDetails.is_gst_optional
                  ? Number(claimDetails.retention_amount) * 1.1
                  : Number(claimDetails.retention_amount)) *
                  (claimDetails.is_gst_optional
                    ? Number(element.total_amount_including_gst)
                    : Number(element.unit_price))) /
                totalLineAmount
              : 0;
            let lineItem: LineItem = {
              description: element.description,
              quantity: element.quantity,
              unitAmount:
                (claimDetails.is_gst_optional
                  ? Number(element.total_amount_including_gst)
                  : Number(element.unit_price)) - retentionShare,
              accountCode:
                claimDetails.cash_retention_type === 'Claim'
                  ? claimDetails.claim_type === 'Billable'
                    ? xeroDetails.bill_code
                    : xeroDetails.invoice_code
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
            const lineItem1: LineItem = {
              description: 'Retention Held',
              quantity: 1,
              unitAmount: claimDetails.is_gst_optional
                ? claimDetails.retention_amount * 1.1
                : claimDetails.retention_amount,
              accountCode:
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code,
              tracking: lineItemTrackings,
            };
            const lineItem2: LineItem = {
              description: 'Liability for defects',
              quantity: 1,
              unitAmount: Number(
                '-' +
                  (claimDetails.is_gst_optional
                    ? claimDetails.retention_amount * 1.1
                    : claimDetails.retention_amount),
              ),
              accountCode:
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.liability_payable_code
                  : xeroDetails.liability_receivable_code,
              tracking: lineItemTrackings,
            };
            lineItems.push(lineItem1);
            lineItems.push(lineItem2);
          } else if (claimDetails.cash_retention_type === 'Retention claim') {
            claimDetails.retention_amount = invoices?.reduce((sum, item) => {
              return (
                sum +
                (item?.total_amount_including_gst === null
                  ? 0.0
                  : Math.abs(Number(item?.total_amount_including_gst)))
              );
            }, 0.0);
            const lineItem1: LineItem = {
              description: 'Liability for defects',
              quantity: 1,
              unitAmount: claimDetails.is_gst_optional
                ? claimDetails.retention_amount * 1.1
                : claimDetails.retention_amount,
              accountCode:
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.liability_payable_code
                  : xeroDetails.liability_receivable_code,
              tracking: lineItemTrackings,
            };
            const lineItem2: LineItem = {
              description: 'Retention Release',
              quantity: 1,
              unitAmount: Number(
                '-' +
                  (claimDetails.is_gst_optional
                    ? claimDetails.retention_amount * 1.1
                    : claimDetails.retention_amount),
              ),
              accountCode:
                claimDetails.claim_type === 'Billable'
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code,
              tracking: lineItemTrackings,
            };

            lineItems.push(lineItem1);
            lineItems.push(lineItem2);
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

          console.log(
            'Invoice/Bill edited:',
            updateInvoiceResponse.response?.data,
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
              reference: invoice.Reference,
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
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  claimDetails.claim_type == 'Billable' ? 53 : 66,
                dynamic_values: { id: xeroResponse?.id },
                project_id: xeroProjectDetails.id,
                contract_id: xeroContractDetails.id,
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
                contract_id: xeroContractDetails.id,
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
              contract_id: xeroContractDetails.id,
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
            contract_id: xeroContractDetails.id,
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
      console.log('invoiceDetails:', invoiceDetails);
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

          console.log(
            'Invoice/bill deleted successfully:',
            deleteInvoiceResponse.response.status,
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
      console.log('invoiceDetails:', invoiceDetails?.body?.invoices[0]);
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
              reference: invoice.reference,
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
        console.log(`Inserted ${xeroInvoicesBills.length} new invoices.`);
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
        console.log(`Updated ${existingInvoices.length} existing invoices.`);
      }

      console.log(
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

      console.log('All invoices fetched, inserted, and updated successfully.');

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
          `CASE WHEN invoice.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
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
}
