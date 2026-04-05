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
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
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
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroInvoicesService {
  private logger = new PaytradeLogger('XERO_INVOICES_SERVICE');
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
    private readonly noticesService: NoticesService,
    private readonly emailQueueProducer: EmailQueueProducer,
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

      if (invoices && invoices.length > 0 && invoices[0] !== null) {
        this.logger.log(`invoices: ${JSON.stringify(invoices)}`);
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
        const useSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
        for (const element of invoices) {
          // Protect against division by zero to prevent Infinity/NaN values
          const retentionShare = (!useSimplifiedRetention && claimDetails.retention_amount && totalLineAmount !== 0)
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
          if (useSimplifiedRetention) {
            let retentionLine: LineItem = {
              description: 'Retention Held',
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
            if (claimDetails.is_gst_optional) {
              retentionLine = {
                ...retentionLine,
                taxType:
                  claimDetails.claim_type === 'Billable'
                    ? xeroDetails.bill_tax_code
                    : xeroDetails.invoice_tax_code,
              };
            }
            lineItems.push(retentionLine);
          } else {
            // Standard 3-line pattern: +retention held, -liability for defects
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
            let retentionReleaseLine: LineItem = {
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
            if (claimDetails.is_gst_optional) {
              retentionReleaseLine = {
                ...retentionReleaseLine,
                taxType:
                  claimDetails.claim_type === 'Billable'
                    ? xeroDetails.bill_tax_code
                    : xeroDetails.invoice_tax_code,
              };
            }
            lineItems.push(retentionReleaseLine);
          } else {
            // Standard 3-line pattern: +liability for defects, -retention release
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
          this.logger.log(`requestData: ${JSON.stringify(requestData)}`);

          const xeroResponse: any =
            await this.insertInvoiceDetails(requestData);
          if (xeroResponse) {
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

    const importSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
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

    const retentionAmount = retentionLineItems.reduce((sum, item) => {
      return (
        sum +
        (item?.unitAmount === null ? 0.0 : Math.abs(Number(item?.unitAmount))) +
        (item?.taxAmount === null ? 0.0 : Math.abs(Number(item?.taxAmount)))
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

      if (cashRetention && importSimplifiedRetention) {
        invoices = this.mapItemsDirectly(
          filteredInvoices,
          invoiceDetails.lineAmountTypes,
        );
      } else {
        invoices = await this.adjustItemsWithRetention(
          invoiceDetails,
          filteredInvoices,
          retentionAmount,
          invoiceDetails.lineAmountTypes,
        );
      }

      const subtotal = invoices.reduce((sum, i) => sum + i.unit_price, 0);
      retainedAmountExcludingGST = retentionAmount
        ? invoiceDetails.lineAmountTypes !== LineAmountTypes.NoTax
          ? retentionAmount / 1.1
          : retentionAmount
        : 0;
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
    this.logger.log(`response: ${JSON.stringify(response)}`);

    return {
      id: response.id,
      invoice_id: response.payment_claim_id,
      status: response.status,
    };
  }

  mapItemsDirectly(items: any[], lineAmountTypes: LineAmountTypes) {
    return items.map((item) => {
      const unitAmount =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount - item.taxAmount
          : item.unitAmount;

      const gst = [LineAmountTypes.Inclusive, LineAmountTypes.Exclusive].includes(
        lineAmountTypes,
      )
        ? parseFloat(Math.abs(Number(item.taxAmount || 0)).toFixed(2))
        : 0.0;

      const totalAmountIncludingGst =
        lineAmountTypes === LineAmountTypes.Inclusive
          ? item.unitAmount * item.quantity
          : item.unitAmount * item.quantity + (item.taxAmount || 0);

      return {
        unit_price: parseFloat(Number(unitAmount).toFixed(2)),
        gst,
        total_amount_including_gst: parseFloat(totalAmountIncludingGst.toFixed(2)),
        description: item.description,
        quantity: item.quantity,
      };
    });
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

      // Protect against division by zero to prevent Infinity/NaN values
      const itemRatio = totalOriginal !== 0 ? lineAmount / totalOriginal : 0;

      const retentionShare = retentionAmountIncludingGST * itemRatio;

      // Protect against division by zero to prevent Infinity/NaN values
      const baseRatio = lineAmount !== 0 ? unitAmount / lineAmount : 0;

      const taxRatio = lineAmount !== 0 ? item.taxAmount / lineAmount : 0;

      const unitRetention = retentionShare * baseRatio;
      const taxRetention = retentionShare * taxRatio;

      const newUnitAmount = unitAmount + unitRetention;
      const newTaxAmount = item.taxAmount + taxRetention;
      const newAmountIncludingGST = lineAmount + retentionShare;

      this.logger.log(JSON.stringify({
        newUnitAmount,
        newTaxAmount,
        newAmountIncludingGST,
        unitRetention,
        taxRetention,
        retentionShare,
      }));
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
          const useSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
          for (const element of invoices) {
            const retentionShare = (!useSimplifiedRetention && claimDetails.retention_amount)
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
            if (useSimplifiedRetention) {
              let retentionLine: LineItem = {
                description: 'Retention Held',
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
              if (claimDetails.is_gst_optional) {
                retentionLine = {
                  ...retentionLine,
                  taxType:
                    claimDetails.claim_type === 'Billable'
                      ? xeroDetails.bill_tax_code
                      : xeroDetails.invoice_tax_code,
                };
              }
              lineItems.push(retentionLine);
            } else {
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
              let retentionReleaseLine: LineItem = {
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
              if (claimDetails.is_gst_optional) {
                retentionReleaseLine = {
                  ...retentionReleaseLine,
                  taxType:
                    claimDetails.claim_type === 'Billable'
                      ? xeroDetails.bill_tax_code
                      : xeroDetails.invoice_tax_code,
                };
              }
              lineItems.push(retentionReleaseLine);
            } else {
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
              const newAccount = bankAccountsRepo.create({
                account_type: 'Cash Account' as const,
                account_name: xeroBatchPayments.bankAccountName || contactName,
                account_number: xeroBatchPayments.bankAccountNumber || '',
                bsb_number: xeroBatchPayments.code && /^\d+$/.test(xeroBatchPayments.code.trim()) ? parseInt(xeroBatchPayments.code.trim(), 10) : null,
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
        supplierPaymentToAccount = supplierAccounts[0];
      }
    }

    if (allIssues.length > 0) {
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
        },
        project_id: xeroProjectId,
        contract_id: String(updatedContractId),
        reference: { xeroId: checkExistenceInDb?.id, paytradeId: saved.id },
        reference_id: checkExistenceInDb?.id,
        history: [`API triggered from claim ${invoice_id}`, 'Smart contract created'],
        important_checks: {},
        error_message: null,
        xero_records: [invoiceDetails],
        paytrade_records: [saved],
        new_records: [saved],
        updated_records: null,
        synced_records: null,
      });

      if (derived.clientSupplierType === 'Supplier') {
        try {
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] === BEGIN notice flow for smart contract ${updatedContractId} ===`
          );
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] Contract details: type=${derived.clientSupplierType}, ` +
            `role=${derived.clientSupplierRole}, has_project=${!!projectName}, has_contact=${!!contactName}`
          );
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] Bank accounts assigned: payment_from=${contractData.payment_from_account || 'NONE'}, ` +
            `payment_to=${contractData.payment_to_account || 'NONE'}, retention_from=${contractData.retention_from_account || 'NONE'}`
          );
          const noticeResult: any = await this.noticesService.handleTriggerContractNotices(
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

          const mailsToSend = noticeResult?.data?.mails_to_sent || [];
          const updateInputs = noticeResult?.data?.update_notice_inputs || [];

          if (mailsToSend.length > 0) {
            for (let i = 0; i < mailsToSend.length; i++) {
              const mailDetails = mailsToSend[i];
              const updatePayload = updateInputs[i];

              this.logger.log(
                `[SMART_CONTRACT_NOTICES] Queueing notice email ${i + 1}/${mailsToSend.length}: ` +
                `has_recipient=${!!mailDetails?.to}, subject=${mailDetails?.subject || 'N/A'}`
              );
              await this.emailQueueProducer.emailQueueProducer({
                ...mailDetails,
                mail_type: EmailTypeEnum.notice,
              });

              if (updatePayload) {
                this.logger.log(
                  `[SMART_CONTRACT_NOTICES] Updating notice status: notice_id=${updatePayload?.notice_id}, ` +
                  `status=${updatePayload?.status}, auto_sent=${updatePayload?.auto_sent}`
                );
                await this.noticesService.handleUpdateNotice(decoded, updatePayload);
              }
            }
            this.logger.log(
              `[SMART_CONTRACT_NOTICES] Sent ${mailsToSend.length} notice(s) for smart contract ${updatedContractId}`
            );
          } else {
            this.logger.log(
              `[SMART_CONTRACT_NOTICES] No notices to send for smart contract ${updatedContractId}. ` +
              `This typically means: no PTA/RTA bank accounts assigned, or subscription plan is Basic (Manual notices only).`
            );
          }
          this.logger.log(
            `[SMART_CONTRACT_NOTICES] === END notice flow for smart contract ${updatedContractId} ===`
          );
        } catch (noticeErr) {
          const noticeErrMsg = noticeErr instanceof Error ? noticeErr.message : String(noticeErr);
          this.logger.warn(
            `[SMART_CONTRACT_NOTICES] Notice generation FAILED for smart contract ${updatedContractId}: ${noticeErrMsg}`
          );
        }
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
}
