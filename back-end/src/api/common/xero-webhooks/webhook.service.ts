import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { UpdateClientSuppliersDetailInput } from 'src/api/users/client-suppliers-details/dto/update-client-suppliers-detail.input';
import { XeroWaitQueueService } from './waitQueue/webhookWait.service';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { XeroResolver } from '../integrations/xero/xero.resolver';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';
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
    private readonly xeroResolver: XeroResolver,
    private readonly xeroService: XeroService,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly paymentsService: PaymentsService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly clientSuppliersDetailsService: ClientSuppliersDetailsService,
    private readonly xeroInvoicesService: XeroInvoicesService,
    private readonly xeroWaitQueueService: XeroWaitQueueService,
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

    this.logger = new PaytradeLogger('XERO_WEBHOOK_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
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
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          tenant_id,
          status: 'ACTIVE',
        },
        relations: ['integrationDetails'],
      });

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
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        this.logger.error(
          `[Xero Webhook] Paytrade is currently not active in Xero`,
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

      let pt_client_supplier;

      if (xeroContactDetails.pt_contact_id) {
        const clientSuppliersDetails =
          await this.clientSuppliersDetails.findOne({
            where: { client_supplier_id: xeroContactDetails.pt_contact_id },
          });
        if (xeroContactDetails?.contact_status === 'ACTIVE') {
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
            client_supplier_address:
              clientSuppliersDetails.client_supplier_address,
            country: clientSuppliersDetails.country,
            region: clientSuppliersDetails.region,
            latitude: clientSuppliersDetails.latitude,
            longitude: clientSuppliersDetails.longitude,
            client_phone_no: clientSuppliersDetails.client_phone_no,
            client_email_id: contact.emailAddress,
            client_website: clientSuppliersDetails.client_website,
            qbcc_number: clientSuppliersDetails.qbcc_number,
            acn_number: clientSuppliersDetails.acn_number,
            abn_number: clientSuppliersDetails.abn_number,
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
      } else {
        pt_client_supplier = await this.handleContactCreate(
          contactID,
          xeroDetails,
          contact,
          xeroContactDetails,
          sync_id,
          data,
        );
        this.logger.log(`[Xero Contact Webhook] new::` + " " + JSON.stringify(pt_client_supplier));
        if (pt_client_supplier) {
          xeroContactDetails.pt_contact_id =
            pt_client_supplier?.client_supplier_id;
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
          log_template_id: 201,
          dynamic_values: {
            contact_name: pt_client_supplier?.client_supplier_name,
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: xeroContactDetails?.id,
            paytradeId: pt_client_supplier?.id,
          },
          reference_id: xeroContactDetails?.id,
          history: [
            `API triggered from contact webhook ${pt_client_supplier?.client_supplier_name}`,
            'Import successful',
          ],
          important_checks: {},
          error_message: null,
          xero_records: [contact],
          paytrade_records: [pt_client_supplier],
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
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { tenant_id, status: 'ACTIVE' },
          });

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
    if (
      !client_supplier_name ||
      !client_supplier_type ||
      !client_supplier_status ||
      !related_entity ||
      !entity_type ||
      !place_id ||
      !client_supplier_address ||
      !country ||
      !region ||
      !latitude ||
      !longitude ||
      !client_phone_no ||
      !client_email_id
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
        error_message: `Missing mandatory fields`,
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

  async handleInvoiceCreateUpdate(data: any, decoded?: any) {
    const { resource_id, tenant_id, eventType, sync_run_type } = data;
    this.logger.log(
      `[Xero Service] Invoice CREATED: ${resource_id} of Tenant ${tenant_id}`,
    );

    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        this.logger.error(
          `[Xero Webhook] No integration found for tenant_id: ${tenant_id}`,
        );
        return false;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        this.logger.error(
          `[Xero Webhook] Paytrade is currently not active in Xero`,
        );
        return false;
      }

      const companyId = xeroDetails.company_id;
      await this.xeroService.refreshTokenSet(companyId, this.xero);

      const response = await this.xero.accountingApi.getInvoice(
        tenant_id,
        resource_id,
      );
      const invoice = response.body.invoices?.[0];

      if (!invoice) {
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
          {},
          xeroContactDetails,
          eventType,
          sync_run_type,
          decoded,
        );

        this.logger.log(JSON.stringify({ invoiceResponse }));
        return invoiceResponse;
      }
      return true;
    } catch (err) {
      const error = await handleAxiosError(err);
      this.logger.error(`[Xero Service] Failed to fetch invoice:` + " " + JSON.stringify(error));

      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { tenant_id, status: 'ACTIVE' },
          });

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
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

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
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        this.logger.error(
          `[Xero Webhook] Paytrade is currently not active in Xero`,
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
          const xeroDetails = await this.xeroIntegrationDetails.findOne({
            where: { tenant_id, status: 'ACTIVE' },
          });

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
      this.logger.log('Webhook::eventType::' + " " + JSON.stringify(eventType));
      // 1. Check if invoice exists in xeroInvoicesBills
      let existingXeroInvoice = await this.xeroInvoicesBills.findOne({
        where: {
          invoice_id: invoice.invoiceID,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (
        existingXeroInvoice &&
        existingXeroInvoice?.pt_claim_id &&
        eventType === 'CREATE'
      ) {
        return false; // restricting edit claim during create event when triggered from paytrade
      }

      await this.xeroService.refreshTokenSet(company_id, this.xero);
      if (
        !invoice.lineItems ||
        (invoice.lineItems.length > 0 && !invoice.lineItems[0]?.accountCode)
      ) {
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

      if (!this.hasValidTracking(invoice)) {
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

      if (!this.isInvoiceFormatValid(invoice)) {
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

      if (!xeroDetails.project_category_id) {
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
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id || null,
          api_name: 'createClaimInPaytrade',
          api_payload: {
            sync_run_type,
            invoice_id: invoice?.invoiceID,
            tenant_id,
            category_type: 'contract',
            type:
              invoice?.type === Invoice.TypeEnum.ACCPAY ? 'bill' : 'invoice',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: sync_run_type === 'webhook' ? 257 : 417,
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
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [invoice],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      let contractTrackingId = null;
      let projectTrackingId = null;

      if (
        invoice?.status !== Invoice.StatusEnum.DRAFT &&
        invoice?.lineItems &&
        invoice?.lineItems?.some((li) => li.tracking?.length) &&
        invoice?.lineItems[0]?.tracking[0]?.trackingCategoryID
      ) {
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

      if (!this.isAccountCodeValid(invoice, xeroDetails)) {
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
            'Import account type validation': 'Failed',
          },
          error_message: `Missing account field type. Please configure the mapping in Settings to continue.`,
          xero_records: [invoice],
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
      for (let item of invoice?.lineItems) {
        if (!accountCodes.includes(item.accountCode)) {
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
              'Import account type validation': 'Failed',
            },
            error_message: `Mismatch in account codes`,
            xero_records: [invoice],
            paytrade_records: [],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return false;
        }
      }

      let expectedTaxCode = null;

      if (invoice.type === Invoice.TypeEnum.ACCPAY) {
        expectedTaxCode = xeroDetails.bill_tax_code;
      } else if (invoice.type === Invoice.TypeEnum.ACCREC) {
        expectedTaxCode = xeroDetails.invoice_tax_code;
      }

      if (!expectedTaxCode) {
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

      if (
        invoice.lineItems.length > 0 &&
        invoice.lineItems?.some(
          (item) => item?.taxAmount > 0 && item?.taxType !== expectedTaxCode,
        )
      ) {
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
          error_message: `Mismatch in tax field type`,
          xero_records: [invoice],
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

      const xeroContractDetails = contractTrackingId
        ? await this.xeroContractDetails.findOne({
            where: {
              contract_id: contractTrackingId,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!xeroContractDetails) {
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

      const contractDetails =
        xeroContractDetails && xeroContractDetails?.pt_contract_id
          ? await this.contractDetails.findOne({
              where: { contract_id: xeroContractDetails.pt_contract_id },
            })
          : null;

      if (!contractDetails) {
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

      const xeroProjectDetails = projectTrackingId
        ? await this.xeroProjectDetails.findOne({
            where: {
              project_id: projectTrackingId,
              integration_id: xeroDetails.integration_id,
            },
          })
        : null;

      if (!xeroProjectDetails) {
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
          contract_id: xeroContractDetails?.id,
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

      const projectDetails =
        xeroProjectDetails && xeroProjectDetails?.pt_project_id
          ? await this.projectDetails.findOne({
              where: { project_id: xeroProjectDetails.pt_project_id },
            })
          : null;

      if (!projectDetails) {
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
          contract_id: xeroContractDetails?.id,
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
          error_message: `Project details not mapped`,
          xero_records: [{ ...invoice, xeroProjectDetails }],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        clientSuppliersDetails.client_supplier_id !==
        contractDetails.client_supplier_id
      ) {
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

      if (projectDetails.project_id !== contractDetails.project_id) {
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

      //Get new claim- Invoice type check - Validate against contract size OK
      if (
        invoice?.status !== Invoice.StatusEnum.DRAFT &&
        Number(invoice.total) > Number(contractDetails.initial_contract_sum)
      ) {
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
        existingXeroInvoice.reference = invoice.reference || null;
        existingXeroInvoice.sub_total = invoice.subTotal || null;
        existingXeroInvoice.total_tax = invoice.totalTax || null;
        existingXeroInvoice.total_amount = invoice.total || null;
        existingXeroInvoice.line_items = invoice.lineItems || [];
        existingXeroInvoice.line_amount_types = invoice.lineAmountTypes;
        existingXeroInvoice.updated_group = 'SYSTEM';
        existingXeroInvoice.updated_on = moment().toISOString();
        xeroInvoice = await this.xeroInvoicesBills.save(existingXeroInvoice);
        this.logger.log('Webhook::xeroInvoice::exist::' + " " + JSON.stringify(existingXeroInvoice));
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
          reference: invoice.reference || null,
          sub_total: invoice.subTotal || null,
          total_tax: invoice.totalTax || null,
          total_amount: invoice.total || null,
          line_items: invoice.lineItems || [],
          line_amount_types: invoice.lineAmountTypes,
          created_group: 'SYSTEM',
          created_on: moment().toISOString(),
        };
        const newXeroInvoice = await this.xeroInvoicesBills.create(xeroPayload);
        xeroInvoice = await this.xeroInvoicesBills.save(newXeroInvoice);
        this.logger.log('Webhook::xeroInvoice::new::' + " " + JSON.stringify(xeroInvoice));
      }

      if (xeroInvoice) {
        if (!xeroInvoice?.pt_claim_id) {
          const retentionClaimnlineItem = invoice?.lineItems?.some(
            (item) =>
              item?.accountCode ===
              (invoice.type === Invoice.TypeEnum.ACCPAY
                ? xeroDetails.retention_payable_release_code
                : xeroDetails.retention_receivable_release_code),
          );

          const lineItem1 = invoice?.lineItems?.some(
            (item) =>
              item?.accountCode ===
              (retentionClaimnlineItem
                ? invoice.type === Invoice.TypeEnum.ACCPAY
                  ? xeroDetails.retention_payable_release_code
                  : xeroDetails.retention_receivable_release_code
                : invoice.type === Invoice.TypeEnum.ACCPAY
                  ? xeroDetails.retention_payable_retained_code
                  : xeroDetails.retention_receivable_retained_code),
          );

          const lineItem2 = invoice?.lineItems?.some(
            (item) =>
              item?.accountCode ===
              (invoice.type === Invoice.TypeEnum.ACCPAY
                ? xeroDetails.liability_payable_code
                : xeroDetails.liability_receivable_code),
          );

          const webhookSimplifiedRetention = !!xeroDetails.simplified_retention_accounting;
          if (!webhookSimplifiedRetention && ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2))) {
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
                where pc.company_id = ${company_id} and pc.project_id = ${xeroProjectDetails.pt_project_id} and pc.client_supplier_id = ${xeroContactDetails.pt_contact_id} and pc.contract_id = ${xeroContractDetails.pt_contract_id};`;

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

          const retentionAmount = retentionLineItems.reduce((sum, item) => {
            return (
              sum +
              (item?.unitAmount === null
                ? 0.0
                : Math.abs(Number(item?.unitAmount))) +
              (item?.taxAmount === null ? 0.0 : Number(item?.taxAmount))
            );
          }, 0.0);

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
            filteredInvoices = invoice.lineItems?.filter(
              (item) =>
                item.accountCode ===
                (invoice.type === Invoice.TypeEnum.ACCPAY
                  ? xeroDetails.bill_code
                  : xeroDetails.invoice_code),
            );
            invoices = await this.xeroInvoicesService.adjustItemsWithRetention(
              invoice,
              filteredInvoices,
              retentionAmount,
              invoice.lineAmountTypes,
            );

            const subtotal = invoices.reduce((sum, i) => sum + i.unit_price, 0);
            retainedAmountExcludingGST = retentionAmount
              ? invoice.lineAmountTypes !== LineAmountTypes.NoTax
                ? retentionAmount / 1.1
                : retentionAmount
              : 0;
            retentionPercentage = (retainedAmountExcludingGST / subtotal) * 100;
          }

          if (
            invoice.date &&
            moment
              .tz(invoice.date, 'UTC')
              .utc()
              .isAfter(moment.tz('UTC').startOf('day').utc())
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
              log_template_id:
                invoice.type === Invoice.TypeEnum.ACCPAY
                  ? sync_run_type === 'webhook'
                    ? 350
                    : 453
                  : sync_run_type === 'webhook'
                    ? 351
                    : 454,
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
              error_message:
                invoice.type === Invoice.TypeEnum.ACCPAY
                  ? `The received date is in the future`
                  : `The sent date is in the future`,
              xero_records: [invoice],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }

          if (
            invoice.dueDate &&
            moment
              .tz(invoice.dueDate, 'UTC')
              .utc()
              .isBefore(moment.tz('UTC').startOf('day').utc())
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
              log_template_id: sync_run_type === 'webhook' ? 352 : 455,
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
              error_message: `The due date is in the past`,
              xero_records: [invoice],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }

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
            project_id: contractDetails.project_id,
            contract_id: contractDetails.contract_id,
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
            claim_amount: Number(invoice.total || 0) + retentionAmount,
            cash_retention: cashRetention,
            retention_percentage: retentionPercentage,
            retention_amount: cashRetention
              ? retentionAmount
                ? invoice.lineAmountTypes !== LineAmountTypes.NoTax
                  ? retentionAmount / 1.1
                  : retentionAmount
                : 0
              : 0,
            retention_amount_with_gst: retentionAmount,
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
              const retentionClaimnlineItem = invoice?.lineItems?.some(
                (item) =>
                  item?.accountCode ===
                  (invoice.type === Invoice.TypeEnum.ACCPAY
                    ? xeroDetails.retention_payable_release_code
                    : xeroDetails.retention_receivable_release_code),
              );

              const lineItem1 = invoice?.lineItems?.some(
                (item) =>
                  item?.accountCode ===
                  (retentionClaimnlineItem
                    ? invoice.type === Invoice.TypeEnum.ACCPAY
                      ? xeroDetails.retention_payable_release_code
                      : xeroDetails.retention_receivable_release_code
                    : invoice.type === Invoice.TypeEnum.ACCPAY
                      ? xeroDetails.retention_payable_retained_code
                      : xeroDetails.retention_receivable_retained_code),
              );

              const lineItem2 = invoice?.lineItems?.some(
                (item) =>
                  item?.accountCode ===
                  (invoice.type === Invoice.TypeEnum.ACCPAY
                    ? xeroDetails.liability_payable_code
                    : xeroDetails.liability_receivable_code),
              );

              if ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2)) {
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
                      where pc.company_id = ${company_id} and pc.project_id = ${xeroProjectDetails.pt_project_id} and pc.client_supplier_id = ${xeroContactDetails.pt_contact_id} and pc.contract_id = ${xeroContractDetails.pt_contract_id};`;

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

              const retentionAmount = retentionLineItems.reduce((sum, item) => {
                return (
                  sum +
                  (item?.unitAmount === null
                    ? 0.0
                    : Math.abs(Number(item?.unitAmount))) +
                  (item?.taxAmount === null ? 0.0 : Number(item?.taxAmount))
                );
              }, 0.0);

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
                filteredInvoices = invoice.lineItems?.filter(
                  (item) =>
                    item.accountCode ===
                    (invoice.type === Invoice.TypeEnum.ACCPAY
                      ? xeroDetails.bill_code
                      : xeroDetails.invoice_code),
                );
                invoices =
                  await this.xeroInvoicesService.adjustItemsWithRetention(
                    invoice,
                    filteredInvoices,
                    retentionAmount,
                    invoice.lineAmountTypes,
                  );
                for (const element of invoices) {
                  element.payment_claim_id = claimDetails?.payment_claim_id;
                }
                const subtotal = invoices.reduce(
                  (sum, i) => sum + i.unit_price,
                  0,
                );
                retainedAmountExcludingGST = retentionAmount
                  ? invoice.lineAmountTypes !== LineAmountTypes.NoTax
                    ? retentionAmount / 1.1
                    : retentionAmount
                  : 0;
                retentionPercentage =
                  (retainedAmountExcludingGST / subtotal) * 100;
              }

              if (
                invoice.date &&
                moment
                  .tz(invoice.date, 'UTC')
                  .utc()
                  .isAfter(moment.tz('UTC').startOf('day').utc())
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
                  log_template_id:
                    invoice.type === Invoice.TypeEnum.ACCPAY
                      ? sync_run_type === 'webhook'
                        ? 350
                        : 453
                      : sync_run_type === 'webhook'
                        ? 351
                        : 454,
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
                  error_message:
                    invoice.type === Invoice.TypeEnum.ACCPAY
                      ? `The received date is in the future`
                      : `The sent date is in the future`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }

              if (
                invoice.dueDate &&
                moment
                  .tz(invoice.dueDate, 'UTC')
                  .utc()
                  .isBefore(moment.tz('UTC').startOf('day').utc())
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
                  log_template_id: sync_run_type === 'webhook' ? 352 : 455,
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
                  error_message: `The due date is in the past`,
                  xero_records: [invoice],
                  paytrade_records: [],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
                return false;
              }

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
                project_id: contractDetails.project_id,
                contract_id: contractDetails.contract_id,
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
                claim_amount: Number(invoice.total || 0) + retentionAmount,
                cash_retention: cashRetention,
                retention_percentage: retentionPercentage,
                //(retentionAmount / Number(invoice.subTotal || 0)) * 100,
                retention_amount: cashRetention
                  ? retentionAmount
                    ? invoice.lineAmountTypes !== LineAmountTypes.NoTax
                      ? retentionAmount / 1.1
                      : retentionAmount
                    : 0
                  : 0,
                retention_amount_with_gst: retentionAmount,
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
            //delete invoice
            if (['Draft', 'Confirmed'].includes(claimDetails.status)) {
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
          xeroDetails?.wait_time > 0
        ) {
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
          if (processPayment) {
            return processPayment;
          } else {
            return false;
          }
        }
      }
      return false;
    } catch (err) {
      this.logger.error(
        `[Webhook Validation Fail] ${invoice.invoiceID}: ${'Unexpected error: ' + (err?.message || err)}`,
      );
    }
  }

  async checkAndProcessPayment(payload, decoded) {
    try {
      const { tenant_id, resource_id, data, sync_run_type } = payload;

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                      await this.paymentsService.changeStatusOfAPayment(
                        decoded,
                        paytradePayload,
                        decoded?.userId,
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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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

      const retentionClaimnlineItem = invoice?.lineItems?.some(
        (item) =>
          item?.accountCode ===
          (invoice.type === Invoice.TypeEnum.ACCPAY
            ? xeroDetails.retention_payable_release_code
            : xeroDetails.retention_receivable_release_code),
      );

      const lineItem1 = invoice?.lineItems?.some(
        (item) =>
          item?.accountCode ===
          (retentionClaimnlineItem
            ? invoice.type === Invoice.TypeEnum.ACCPAY
              ? xeroDetails.retention_payable_release_code
              : xeroDetails.retention_receivable_release_code
            : invoice.type === Invoice.TypeEnum.ACCPAY
              ? xeroDetails.retention_payable_retained_code
              : xeroDetails.retention_receivable_retained_code),
      );

      const lineItem2 = invoice?.lineItems?.some(
        (item) =>
          item?.accountCode ===
          (invoice.type === Invoice.TypeEnum.ACCPAY
            ? xeroDetails.liability_payable_code
            : xeroDetails.liability_receivable_code),
      );

      if ((lineItem1 && !lineItem2) || (!lineItem1 && lineItem2)) {
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
          (item?.taxAmount === null ? 0.0 : Number(item?.taxAmount))
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
        const allCreditNotes = await this.xero.accountingApi.getCreditNotes(
          xeroDetails.tenant_id,
          new Date('1900-01-01T00:00:00.000-00:00'),
          null,
          'CreditNoteNumber ASC',
          1,
          4,
          100,
        );

        // this.logger.log(
        //   'allCreditNotes?.body?.creditNotes: ',
        //   allCreditNotes?.body?.creditNotes,
        // );
        if (allCreditNotes?.body?.creditNotes?.length > 0) {
          for (const creditNote of allCreditNotes?.body?.creditNotes) {
            if (
              Array.isArray(creditNote?.allocations) &&
              creditNote?.allocations[0]?.invoice?.invoiceID ===
                invoice?.invoiceID
            ) {
              creditNotesOfAnInvoice.push(creditNote);
            }
          }
        }
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
                            await this.paymentsService.changeStatusOfAPayment(
                              decoded,
                              paytradePayload,
                              decoded?.userId,
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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                      await this.paymentsService.changeStatusOfAPayment(
                        decoded,
                        paytradePayload,
                        decoded?.userId,
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
                creditNotes?.length == 1) ||
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
                          await this.paymentsService.changeStatusOfAPayment(
                            decoded,
                            paytradePayload,
                            decoded?.userId,
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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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

        // Match retention transfers - check BOTH from and to account since transfer direction can vary
        let retentionTransfers = !data?.bank_transfer_id
          ? bankTransferResponse?.body?.bankTransfers?.filter(
              (transfer) => {
                const accountMatches = 
                  transfer?.fromBankAccount?.accountID === xeroBankAccountDetails.account_id ||
                  transfer?.toBankAccount?.accountID === xeroBankAccountDetails.account_id;
                const amountMatches = Math.abs(Number(transfer?.amount)) === Math.abs(Number(retention_amount));
                return accountMatches && amountMatches;
              }
            ) || []
          : bankTransferResponse?.body?.bankTransfers?.filter(
              (transfer) => transfer?.bankTransferID === data?.bank_transfer_id,
            ) || [];
        
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

        const creditNoteAmount =
          creditNotes && creditNotes?.length == 1
            ? Number(creditNotes[0]?.allocations[0]?.amount)
            : 0;

        this.logger.log(JSON.stringify({ underPayments, underPaymentAmount, creditNoteAmount }));

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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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
                  is_retention_confirmed:
                    cash_retention_type === 'Claim' &&
                    invoice.type === Invoice.TypeEnum.ACCPAY &&
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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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
                    await this.paymentsService.changeStatusOfAPayment(
                      decoded,
                      paytradePayload,
                      decoded?.userId,
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
                  await this.paymentsService.changeStatusOfAPayment(
                    decoded,
                    paytradePayload,
                    decoded?.userId,
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
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { tenant_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

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
                      await this.paymentsService.changeStatusOfAPayment(
                        decoded,
                        paytradePayload,
                        decoded?.userId,
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
                      await this.paymentsService.changeStatusOfAPayment(
                        decoded,
                        paytradePayload,
                        decoded?.userId,
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
}
