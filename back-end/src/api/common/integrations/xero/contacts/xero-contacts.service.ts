import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { buildMissingFieldsLog } from '../utils/xero-missing-fields.util';
import { Address, Contact, Phone, XeroClient } from 'xero-node';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import {
  GetMappedXeroContactListsInput,
  GetPaytradeContactListsInput,
  GetXeroContactListsInput,
  YetToMapContactsInput,
} from './dto/xero.input';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { XeroContactDetails } from 'src/entities/xero-contact-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ClientSuppliersDetailsService } from 'src/api/users/client-suppliers-details/client-suppliers-details.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroContactsService implements OnModuleInit, OnModuleDestroy {
  private logger = new PaytradeLogger('XERO_CONTACTS_SERVICE');
  private xero: XeroClient;
  // Task #135 — Per-company Redis lock to serialise sync runs and stop
  // concurrent SYNC clicks / webhook fallbacks from racing into the
  // check-then-insert path that produced duplicate xero_contact_details
  // rows. Mirrors the pattern used by `XeroService.refreshTokenSet`.
  private redis: Redis | null = null;
  private static readonly SYNC_LOCK_TTL_SECONDS = 300; // 5 min, longer than a worst-case sync
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(XeroContactDetails)
    private xeroContactDetails: Repository<XeroContactDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    private readonly xeroService: XeroService,
    private readonly clientSuppliersDetailsService: ClientSuppliersDetailsService,
    private readonly activityLogService: ActivityLogService,
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

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn(
        '[Task #135] REDIS_URL not configured - per-company sync lock disabled (DB-level unique index still prevents duplicate inserts)',
      );
      return;
    }
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 5,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
          const msg = err?.message || '';
          return msg.includes('READONLY') || msg.includes('Connection is closed');
        },
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
      this.redis.on('error', (err) => {
        this.logger.error(`Redis connection error (contacts sync lock): ${err.message}`);
      });
    } catch (err: any) {
      this.logger.warn(
        `[Task #135] Failed to connect Redis for contacts sync lock: ${err?.message}`,
      );
      this.redis = null;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
  }

  private async acquireSyncLock(companyId: number): Promise<string | null> {
    if (!this.redis) return 'no-lock'; // sentinel — proceed but rely on DB unique index
    const lockKey = `xero-sync-contacts-lock:${companyId}`;
    const lockValue = `${process.pid}-${Date.now()}`;
    const result = await this.redis.set(
      lockKey,
      lockValue,
      'EX',
      XeroContactsService.SYNC_LOCK_TTL_SECONDS,
      'NX',
    );
    return result === 'OK' ? lockValue : null;
  }

  private async releaseSyncLock(companyId: number, lockValue: string): Promise<void> {
    if (!this.redis || lockValue === 'no-lock') return;
    const lockKey = `xero-sync-contacts-lock:${companyId}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await this.redis.eval(script, 1, lockKey, lockValue);
    } catch (err: any) {
      this.logger.warn(
        `[Task #135] Failed to release contacts sync lock for company ${companyId}: ${err?.message}`,
      );
    }
  }

  private readonly INACTIVE_STATUSES = [
    'Inactive',
    'Deleted - archived',
    'Disconnected',
    'Connected - paused',
  ];

  private isXeroConnectionUsable(integrationStatus: string): boolean {
    return !this.INACTIVE_STATUSES.includes(integrationStatus);
  }

  /**
   * Phase 2: copy a PT contact's per-contact GST overrides onto an
   * outbound Xero contact payload (used by createContact /
   * insertContactDetailsInPaytrade post-import / editContact). Sends:
   *   - salesDefaultLineAmountType: NotApplicable (we set tax type, not basis)
   *   - paymentTermsBillsAreDueIn: untouched
   *   - salesDefaultTaxType / purchasesDefaultTaxType from the PT contact
   *
   * Empty / null values on the PT side leave the corresponding Xero
   * default untouched (Xero treats absent fields as no-change on update).
   */
  applyContactGstToXeroPayload(target: any, ptContact: any) {
    if (!target || !ptContact) return;
    const sales = ptContact?.xero_sales_gst_setting;
    const purchases = ptContact?.xero_purchases_gst_setting;
    const sentinel = (v: any) =>
      typeof v === 'string' &&
      v.trim().toLowerCase() === 'use organisation settings';
    // Belt-and-braces: if a stored value matches a known human label
    // (legacy data from a Phase 2 build that used labels), translate
    // into its canonical Xero code so the API call still succeeds.
    const labelToCode: Record<string, string> = {
      'gst on income': 'OUTPUT',
      'gst on expenses': 'INPUT',
      'gst free income': 'EXEMPTOUTPUT',
      'gst free expenses': 'EXEMPTEXPENSES',
      'gst on imports': 'GSTONIMPORTS',
      'bas excluded': 'BASEXCLUDED',
      'input taxed': 'INPUTTAXED',
    };
    const toCode = (v: any): string => {
      const s = String(v).trim();
      const code = labelToCode[s.toLowerCase()];
      return code || s;
    };
    if (sales && !sentinel(sales)) {
      target.salesDefaultTaxType = toCode(sales);
    }
    if (purchases && !sentinel(purchases)) {
      target.purchasesDefaultTaxType = toCode(purchases);
    }
  }

  /**
   * Phase 2: write the per-contact GST defaults from an inbound Xero
   * Contact payload onto the mapped PT `client_suppliers_details` row.
   * No-ops if the Xero contact has no defaults set or the PT contact
   * is not found.
   */
  async persistContactGstFromXero(
    pt_contact_id: number | string | null | undefined,
    xeroContact: any,
    options: { allowNullClear?: boolean } = {},
  ): Promise<void> {
    if (!pt_contact_id || !xeroContact) return;
    const sales =
      xeroContact?.salesDefaultTaxType ?? xeroContact?.SalesDefaultTaxType;
    const purchases =
      xeroContact?.purchasesDefaultTaxType ??
      xeroContact?.PurchasesDefaultTaxType;
    const updates: any = {};
    if (typeof sales === 'string' && sales.trim()) {
      updates.xero_sales_gst_setting = sales.trim();
    } else if (options.allowNullClear && (sales === null || sales === '')) {
      // Xero explicitly cleared the sales default — mirror the unset.
      updates.xero_sales_gst_setting = null;
    }
    if (typeof purchases === 'string' && purchases.trim()) {
      updates.xero_purchases_gst_setting = purchases.trim();
    } else if (options.allowNullClear && (purchases === null || purchases === '')) {
      updates.xero_purchases_gst_setting = null;
    }
    if (Object.keys(updates).length === 0) return;
    try {
      const asNum = Number(pt_contact_id);
      const where: any = !isNaN(asNum) && Number.isInteger(asNum)
        ? { client_supplier_id: asNum }
        : { id: String(pt_contact_id) };
      await this.clientSuppliersDetails.update(where, updates);
    } catch (error) {
      this.logger.warn(
        `[Phase 2] Failed to persist contact GST defaults for pt_contact_id=${pt_contact_id}: ${error?.message || error}`,
      );
    }
  }

  /**
   * Phase 2 — Pull every mapped contact for `company_id` from Xero
   * (full Contact record) and persist `salesDefaultTaxType` /
   * `purchasesDefaultTaxType` onto the matching `client_suppliers_details`
   * row. Returns a summary suitable for displaying in the alignment widget.
   */
  async backfillContactGstFromXero(
    company_id: number,
    decoded: any,
  ): Promise<{ scanned: number; updated: number; skipped: number; errors: number }> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails) throw `No active Xero integration for company ${company_id}`;
    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const mapped = await this.xeroContactDetails.find({
      where: {
        integration_id: xeroDetails.integration_id,
        contact_status: 'ACTIVE' as any,
        pt_contact_id: Not(IsNull()),
      },
    });

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    for (const row of mapped) {
      try {
        const resp = await this.xero.accountingApi.getContact(
          xeroDetails.tenant_id,
          row.contact_id,
        );
        const contact = resp?.body?.contacts?.[0];
        if (!contact) { skipped += 1; continue; }
        const before = await this.clientSuppliersDetails.findOne({
          where: { client_supplier_id: row.pt_contact_id as any },
          select: ['client_supplier_id', 'xero_sales_gst_setting', 'xero_purchases_gst_setting'] as any,
        });
        // Backfill is the explicit "Xero is source of truth" path, so
        // honour clears as well as sets.
        await this.persistContactGstFromXero(row.pt_contact_id, contact, {
          allowNullClear: true,
        });
        const after = await this.clientSuppliersDetails.findOne({
          where: { client_supplier_id: row.pt_contact_id as any },
          select: ['client_supplier_id', 'xero_sales_gst_setting', 'xero_purchases_gst_setting'] as any,
        });
        if (
          before?.xero_sales_gst_setting !== after?.xero_sales_gst_setting ||
          before?.xero_purchases_gst_setting !== after?.xero_purchases_gst_setting
        ) {
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (err) {
        errors += 1;
        this.logger.warn(
          `[Phase 2] backfillContactGstFromXero failed for contact ${row.contact_id}: ${err?.message || err}`,
        );
      }
    }
    return { scanned: mapped.length, updated, skipped, errors };
  }

  /**
   * Phase 2 — Push every mapped PT contact's per-contact GST overrides
   * to Xero. Skips contacts with no override set ("Use organisation
   * settings" / null), since pushing those would clobber Xero's choice.
   */
  async backfillContactGstFromPaytrade(
    company_id: number,
    decoded: any,
  ): Promise<{ scanned: number; pushed: number; skipped: number; errors: number }> {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id, status: 'ACTIVE' },
    });
    if (!xeroDetails) throw `No active Xero integration for company ${company_id}`;
    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const mapped = await this.xeroContactDetails.find({
      where: {
        integration_id: xeroDetails.integration_id,
        contact_status: 'ACTIVE' as any,
        pt_contact_id: Not(IsNull()),
      },
    });

    let pushed = 0;
    let skipped = 0;
    let errors = 0;
    for (const row of mapped) {
      try {
        const ptContact = await this.clientSuppliersDetails.findOne({
          where: { client_supplier_id: row.pt_contact_id as any },
        });
        if (!ptContact) { skipped += 1; continue; }
        const payload: any = { name: ptContact.client_supplier_name };
        this.applyContactGstToXeroPayload(payload, ptContact);
        if (
          payload.salesDefaultTaxType === undefined &&
          payload.purchasesDefaultTaxType === undefined
        ) {
          skipped += 1;
          continue;
        }
        await this.xero.accountingApi.updateContact(
          xeroDetails.tenant_id,
          row.contact_id,
          { contacts: [payload] },
        );
        pushed += 1;
      } catch (err) {
        errors += 1;
        this.logger.warn(
          `[Phase 2] backfillContactGstFromPaytrade failed for contact ${row.contact_id}: ${err?.message || err}`,
        );
      }
    }
    return { scanned: mapped.length, pushed, skipped, errors };
  }

  async getClientSuppliersDetails(client_supplier_id) {
    const asNum = Number(client_supplier_id);
    if (!isNaN(asNum) && Number.isInteger(asNum)) {
      return await this.clientSuppliersDetails.findOne({
        where: { client_supplier_id: asNum },
      });
    }
    return await this.clientSuppliersDetails.findOne({
      where: { id: String(client_supplier_id) },
    });
  }

  async createContact(decoded: any, data: any) {
    try {
      const clientSupplierDetails = await this.getClientSuppliersDetails(
        data.client_supplier_id,
      );
      if (!clientSupplierDetails) {
        throw `Client Supplier details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          company_id: clientSupplierDetails.company_id,
          status: 'ACTIVE',
        },
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
        !this.isXeroConnectionUsable(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      await this.xeroService.refreshTokenSet(
        clientSupplierDetails.company_id,
        this.xero,
      );

      const checkExistenceInXero = await this.xero.accountingApi.getContacts(
        xeroDetails.tenant_id,
        new Date('1900-01-01T00:00:00.000+00:00'),
        `ContactStatus=="ACTIVE" AND Name=="${clientSupplierDetails.client_supplier_name}"`,
        'Name ASC',
        [],
        1,
        true,
        true,
        '',
        500,
      );

      this.logger.log(`response.body: ${JSON.stringify(checkExistenceInXero.body)}`);
      if (
        checkExistenceInXero &&
        checkExistenceInXero?.body &&
        checkExistenceInXero?.body?.contacts &&
        checkExistenceInXero?.body?.contacts.length > 0 &&
        checkExistenceInXero?.body?.contacts[0] !== null
      ) {
        const contact = checkExistenceInXero.body.contacts[0];
        let requestData: any = {
          contact_id: contact.contactID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          contact_name: contact.name,
          contact_status: contact.contactStatus,
          is_supplier: contact.isSupplier,
          is_customer: contact.isCustomer,
          merge_to_contact_id: contact.mergedToContactID || null,
          pt_contact_id: data.client_supplier_id,
          mapped_status: data.mapped_status,
        };
        const checkExistenceInDb = await this.getContactDetailsByContactId(
          contact.contactID,
          xeroDetails.integration_id,
        );
        if (checkExistenceInDb && checkExistenceInDb?.id) {
          if (
            checkExistenceInDb.pt_contact_id &&
            checkExistenceInDb.pt_contact_id !== data.client_supplier_id
          ) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createContactInXero',
              api_payload: {
                client_supplier_id: data.client_supplier_id,
                contact_id: contact.contactID,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 283,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: clientSupplierDetails?.id,
              },
              reference_id: clientSupplierDetails?.id,
              history: [
                `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                'Export failed',
              ],
              important_checks: {},
              error_message: `Contact in Xero exists already and mapped to some other contact in paytrade ${checkExistenceInDb.pt_contact_id}`,
              xero_records: [contact],
              paytrade_records: [clientSupplierDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
          requestData = {
            ...requestData,
            created_on: contact.updatedDateUTC,
            created_by: decoded?.userId,
            created_group: 'USER',
          };
          const response =
            await this.updateContactDetailsByContactId(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 10,
            dynamic_values: {
              contact_name: clientSupplierDetails?.client_supplier_name,
            },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: clientSupplierDetails?.id,
            },
            reference_id: clientSupplierDetails?.id,
            history: [
              `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
              'Export successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: [contact],
            paytrade_records: [clientSupplierDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        } else {
          requestData = {
            ...requestData,
            updated_on: contact.updatedDateUTC,
            updated_by: decoded?.userId,
            updated_group: 'USER',
          };
          const response: any = await this.insertContactDetails(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 10,
            dynamic_values: {
              contact_name: clientSupplierDetails?.client_supplier_name,
            },
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: clientSupplierDetails?.id,
            },
            reference_id: clientSupplierDetails?.id,
            history: [
              `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
              'Export successful',
            ],
            important_checks: {},
            error_message: null,
            xero_records: [contact],
            paytrade_records: [clientSupplierDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        }
      } else {
        const phone: Phone = {
          phoneNumber: clientSupplierDetails.client_phone_no,
          phoneType: Phone.PhoneTypeEnum.MOBILE,
        };
        const phones = [phone];

        const address: Address = {
          addressType: Address.AddressTypeEnum.POBOX,
          addressLine1: clientSupplierDetails.client_supplier_address,
          country: clientSupplierDetails.country,
        };
        const addresses = [address];
        try {
          const newContactPayload: any = {
            name: clientSupplierDetails.client_supplier_name,
            addresses: addresses,
            emailAddress: clientSupplierDetails.client_email_id,
            phones: phones,
          };
          // Phase 2 outbound: push per-contact GST overrides to Xero on create.
          this.applyContactGstToXeroPayload(
            newContactPayload,
            clientSupplierDetails,
          );
          const xeroResponse = await this.xero.accountingApi.createContacts(
            xeroDetails.tenant_id,
            {
              contacts: [newContactPayload],
            },
          );
          this.logger.log(
            `Contact created successfully:: ${JSON.stringify(xeroResponse.body.contacts)}`,
          );
          if (
            xeroResponse?.body?.contacts &&
            xeroResponse?.body?.contacts.length > 0
          ) {
            const contact = xeroResponse.body.contacts[0];
            let requestData: any = {
              contact_id: contact.contactID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_name: contact.name,
              contact_status: contact.contactStatus,
              is_supplier: contact.isSupplier,
              is_customer: contact.isCustomer,
              merge_to_contact_id: contact.mergedToContactID || null,
              pt_contact_id: data.client_supplier_id,
              mapped_status: data.mapped_status,
            };

            const is_edit = await this.xeroContactDetails.findOne({
              where: {
                pt_contact_id: data.client_supplier_id,
                integration_id: xeroDetails.integration_id,
              },
            });

            if (!is_edit) {
              requestData = {
                ...requestData,
                created_on: contact.updatedDateUTC,
                created_by: decoded?.userId,
                created_group: 'USER',
              };
              const response: any =
                await this.insertContactDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 10,
                dynamic_values: {
                  contact_name: clientSupplierDetails?.client_supplier_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: response?.id,
                  paytradeId: clientSupplierDetails?.id,
                },
                reference_id: clientSupplierDetails?.id,
                history: [
                  `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                  'Export successful',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [contact],
                paytrade_records: [clientSupplierDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            } else {
              requestData = {
                ...requestData,
                updated_on: contact.updatedDateUTC,
                updated_by: decoded?.userId,
                updated_group: 'USER',
              };
              const response = await this.updateContactDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 10,
                dynamic_values: {
                  contact_name: clientSupplierDetails?.client_supplier_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: response?.id,
                  paytradeId: clientSupplierDetails?.id,
                },
                reference_id: clientSupplierDetails?.id,
                history: [
                  `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                  'Export successful',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [contact],
                paytrade_records: [clientSupplierDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            }
          } else {
            const errMsg = await handleAxiosError(xeroResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createContactInXero',
                api_payload: {
                  client_supplier_id: data.client_supplier_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 28,
                dynamic_values: {
                  contact_name: clientSupplierDetails.client_supplier_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: null,
                  paytradeId: clientSupplierDetails?.id,
                },
                reference_id: clientSupplierDetails?.id,
                history: [
                  `API triggered from client/suppliers ${clientSupplierDetails.client_supplier_name}`,
                  'Export failed',
                ],
                error_message: errMsg,
                important_checks: {},
                xero_records: [],
                paytrade_records: [clientSupplierDetails],
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
              api_name: 'createContactInXero',
              api_payload: {
                client_supplier_id: data.client_supplier_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 28,
              dynamic_values: {
                contact_name: clientSupplierDetails.client_supplier_name,
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: null,
                paytradeId: clientSupplierDetails?.id,
              },
              reference_id: clientSupplierDetails?.id,
              history: [
                `API triggered from client/suppliers ${clientSupplierDetails.client_supplier_name}`,
                'Export failed',
              ],
              error_message: errMsg,
              important_checks: {},
              xero_records: [],
              paytrade_records: [clientSupplierDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getContactDetails(pt_contact_id: number, integration_id: number) {
    return await this.xeroContactDetails.findOne({
      where: { pt_contact_id, integration_id },
    });
  }

  async getContactDetailsByContactId(
    contact_id: string,
    integration_id: number,
  ) {
    return await this.xeroContactDetails.findOne({
      where: { contact_id, integration_id },
    });
  }

  async insertContactDetails(requestData: any) {
    const xeroContactDetails =
      await this.xeroContactDetails.create(requestData);

    return await this.xeroContactDetails.save(xeroContactDetails);
  }

  // Returns the list of mandatory contact fields that are
  // empty in the inbound Xero payload. When `excludeEmail` is true the
  // email field is omitted from the check (so callers can soft-fail on
  // email alone while still hard-failing on any other missing field).
  //
  // Task #283 — `webhookSource: true` narrows the check to fields that
  // Xero itself can plausibly supply on a Contact webhook. Pay Trade's
  // map-resolution fields (Place ID, Region, Latitude, Longitude) and
  // the import-time UI fields (Related entity, Entity type) are skipped
  // because Xero never sends them — the webhook handler fills them with
  // sensible defaults / resolves them later, so they should never count
  // as "missing" on the inbound side.
  collectMissingMandatoryFields(
    payload: any,
    opts: { excludeEmail?: boolean; webhookSource?: boolean } = {},
  ): string[] {
    const p = payload || {};
    const checks: Array<[string, any]> = [
      ['Name', p.client_supplier_name],
      ['Type', p.client_supplier_type],
      ['Status', p.client_supplier_status],
    ];
    if (!opts.webhookSource) {
      checks.push(
        ['Related entity', p.related_entity],
        ['Entity type', p.entity_type],
        ['Place ID', p.place_id],
        ['Region', p.region],
        ['Latitude', p.latitude],
        ['Longitude', p.longitude],
      );
    }
    checks.push(
      ['Address', p.client_supplier_address],
      ['Country', p.country],
      ['Phone', p.client_phone_no],
    );
    if (!opts.excludeEmail) {
      checks.push(['Email', p.client_email_id]);
    }
    return checks.filter(([, v]) => !v).map(([k]) => k);
  }

  /**
   * Task #283 — Single source of truth for "Xero Contact → Pay Trade
   * contact payload" used by the webhook create path. Mirrors the field
   * extraction the mapped-update branch in
   * `XeroWebhookService.handleContactCreateUpdate` already uses (POBOX
   * preferred, then first STREET address; MOBILE phone preferred, then
   * DEFAULT), and fills the import-time UI defaults that Xero cannot
   * supply (`related_entity: 'No'`, `entity_type: 'Organisation'`,
   * `client_supplier_status: 'Completed'`).
   *
   * Place ID / Region / Latitude / Longitude are intentionally left
   * blank — these are Pay Trade map-resolution fields populated by the
   * frontend Google Places autocomplete when an admin imports manually.
   * `collectMissingMandatoryFields({ webhookSource: true })` excludes
   * them from the missing-field check so the webhook does not fail on
   * fields Xero never sends.
   */
  buildContactPayloadFromXero(
    contact: any,
    companyId: number,
  ): any {
    if (!contact) return null;
    const xeroAddress =
      contact.addresses?.find((a: any) => a.addressType === 'POBOX') ||
      contact.addresses?.find((a: any) => a.addressType === 'STREET') ||
      contact.addresses?.[0] ||
      null;
    const xeroPhone =
      contact.phones?.find(
        (p: any) => p.phoneType === 'MOBILE' && p.phoneNumber,
      ) ||
      contact.phones?.find(
        (p: any) => p.phoneType === 'DEFAULT' && p.phoneNumber,
      ) ||
      contact.phones?.find((p: any) => p.phoneNumber) ||
      null;

    const type = contact.isCustomer
      ? 'Client'
      : contact.isSupplier
        ? 'Supplier'
        : null;

    // Build a single concatenated phone string from area/country/number
    // pieces if the raw phoneNumber field is empty but the others are
    // populated (some Xero clients store the number across all three).
    let phoneNumber: string | null = xeroPhone?.phoneNumber || null;
    if (!phoneNumber && xeroPhone) {
      const parts = [
        xeroPhone.phoneCountryCode,
        xeroPhone.phoneAreaCode,
        xeroPhone.phoneNumber,
      ]
        .map((s: any) => (s ? String(s).trim() : ''))
        .filter((s: string) => s.length > 0);
      phoneNumber = parts.length ? parts.join(' ') : null;
    }

    // Build a financial account_details entry from Xero's batchPayments
    // block when present, mirroring the bulk-import path so contacts
    // that have a bank account in Xero arrive in Pay Trade with one
    // already attached.
    const accountDetails: any[] = [];
    const bp = contact?.batchPayments;
    if (bp && (bp.bankAccountNumber || bp.bankAccountName)) {
      const concat = String(bp.bankAccountNumber || '').replace(/\D/g, '');
      // Xero AU concatenates 6-digit BSB + account number. Split back
      // out where possible; otherwise leave bsb blank and let the user
      // complete it in Pay Trade.
      let bsb = '';
      let acct = concat;
      if (concat.length > 6) {
        bsb = concat.slice(0, 6);
        acct = concat.slice(6);
      }
      if (bp.bankAccountName || acct) {
        accountDetails.push({
          account_name: bp.bankAccountName || '',
          bsb_number: bsb || null,
          account_number: acct || null,
        });
      }
    }

    return {
      company_id: companyId,
      client_supplier_name: contact.name || null,
      business_name: contact.name || null,
      client_supplier_type: type,
      client_supplier_status: 'Completed',
      related_entity: 'No',
      entity_type: 'Organisation',
      place_id: null,
      client_supplier_address: xeroAddress?.addressLine1 || null,
      country: xeroAddress?.country || null,
      region: null,
      latitude: null,
      longitude: null,
      client_phone_no: phoneNumber,
      client_email_id: contact.emailAddress || null,
      account_details: accountDetails,
    };
  }

  async insertContactDetailsInPaytrade(decoded: any, data: any) {
    try {
      const { company_id, contact_id, sync_id } = data;

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
      } = data.payload || {};

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
        !this.isXeroConnectionUsable(
          xeroDetails.integrationDetails.integration_status,
        )
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      const checkExistenceInDb = await this.getContactDetailsByContactId(
        contact_id,
        xeroDetails.integration_id,
      );

      if (!checkExistenceInDb) {
        throw `Contact details not found`;
      }

      const contact = await this.getContactByContactId(contact_id, company_id);

      if (
        checkExistenceInDb &&
        checkExistenceInDb.pt_contact_id &&
        checkExistenceInDb.mapped_status
      ) {
        const checkExistenceInPaytrade = await this.getClientSuppliersDetails(
          checkExistenceInDb.pt_contact_id,
        );
        if (checkExistenceInPaytrade) {
          if (sync_id) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 14,
              dynamic_values: {
                contact_name: checkExistenceInDb?.contact_name,
                status: String(contact?.contactStatus)?.toLowerCase(),
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkExistenceInPaytrade?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from Client/supplier ${checkExistenceInDb?.contact_name}`,
                'Import successful',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [contact],
              paytrade_records: [checkExistenceInPaytrade],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: checkExistenceInPaytrade.id,
              contact_id: checkExistenceInPaytrade.client_supplier_id,
              contact_name: checkExistenceInPaytrade.client_supplier_name,
              contact_status: checkExistenceInPaytrade.client_supplier_status,
            };
          } else {
            throw `Client/supplier in Xero exists already and mapped to some other Client/Supplier in paytrade ${checkExistenceInDb.pt_contact_id}`;
          }
        }
      }

      // Split missing-field validation. Email alone is now a
      // soft-fail (the contact is still imported and flagged needs_email).
      // Every other missing mandatory field is still a hard failure, and
      // the error message now lists exactly which fields are missing
      // instead of the old generic "Missing mandatory fields".
      const _otherMissing = this.collectMissingMandatoryFields(data.payload, {
        excludeEmail: true,
      });
      const _emailMissing = !client_email_id;
      if (_otherMissing.length > 0) {
        const _missingFieldsLog = buildMissingFieldsLog(
          'contact',
          contact?.name,
          _otherMissing,
          _emailMissing ? { extraNote: '(email also missing)' } : undefined,
        );
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createContactInPaytrade',
          api_payload: {
            contact_id,
            client_supplier_name: contact.name,
            client_email_id: contact.emailAddress || '',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 366,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from Client/supplier ${contact.name}`,
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
          api_name: 'createContactInPaytrade',
          api_payload: {
            contact_id,
            client_supplier_name: contact.name,
            client_email_id: contact.emailAddress || '',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 366,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from Client/supplier ${contact.name}`,
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
          api_name: 'createContactInPaytrade',
          api_payload: {
            contact_id,
            client_supplier_name: contact.name,
            client_email_id: contact.emailAddress || '',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 366,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: { xeroId: checkExistenceInDb?.id, paytradeId: null },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from Client/supplier ${contact.name}`,
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
              data.payload,
            );
          if (response) {
            const phone: Phone = {
              phoneNumber: response.client_phone_no,
              phoneType: Phone.PhoneTypeEnum.MOBILE,
            };
            const phones = [];
            phones.push(phone);

            const address: Address = {
              addressType: Address.AddressTypeEnum.POBOX,
              addressLine1: response.client_supplier_address,
              country: response.country,
            };
            const addresses = [];
            addresses.push(address);

            const contactData: any = {
              name: response.client_supplier_name,
              addresses: addresses,
              phones: phones,
            };
            // Only echo emailAddress back to Xero when we have
            // one. Otherwise leave it untouched (and remember to flag the
            // contact as needs_email below).
            if (response.client_email_id) {
              contactData.emailAddress = response.client_email_id;
            }

            // Phase 2 outbound: push per-contact GST overrides to Xero.
            this.applyContactGstToXeroPayload(contactData, response);

            const updateContactResponse =
              await this.xero.accountingApi.updateContact(
                xeroDetails.tenant_id,
                contact_id,
                {
                  contacts: [contactData],
                },
              );
            this.logger.log(`updateContactResponse: ${JSON.stringify(updateContactResponse)}`);
            const updatedContact: any =
              updateContactResponse?.body?.contacts[0];

            const xeroContactDetails = await this.xeroContactDetails.findOne({
              where: {
                contact_id,
                integration_id: xeroDetails.integration_id,
              },
            });
            xeroContactDetails.contact_name = updatedContact.name;
            xeroContactDetails.contact_status = String(
              updatedContact.contactStatus,
            );
            xeroContactDetails.is_supplier = updatedContact.isSupplier;
            xeroContactDetails.is_customer = updatedContact.isCustomer;
            xeroContactDetails.merge_to_contact_id =
              updatedContact.mergedToContactID || null;
            xeroContactDetails.pt_contact_id = response.client_supplier_id;
            xeroContactDetails.mapped_status = 'System';
            xeroContactDetails.updated_by = response.created_by;
            xeroContactDetails.updated_on = response.created_on;
            xeroContactDetails.updated_group = response.created_group;
            await this.xeroContactDetails.save(xeroContactDetails);

            // Phase 2: capture per-contact Xero GST defaults onto the
            // PayTrade contact when the contact is mapped.
            await this.persistContactGstFromXero(
              response.client_supplier_id,
              contact,
            );

            // Mark the freshly imported PT contact as
            // needs_email so the UI can render the badge / Resolve link.
            if (_emailMissing) {
              await this.clientSuppliersDetails.update(
                { id: response.id },
                { needs_email: true },
              );
            }

            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
              },
              integration_id: xeroDetails.integration_id,
              // soft-fail warning template when email missing.
              log_template_id: _emailMissing ? 610 : 14,
              dynamic_values: {
                contact_name: response?.client_supplier_name,
                status: updatedContact.contactStatus?.toLowerCase(),
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroContactDetails?.id,
                paytradeId: response?.id,
              },
              reference_id: xeroContactDetails?.id,
              history: [
                `API triggered from Client/supplier ${response?.client_supplier_name}`,
                _emailMissing
                  ? 'Imported with warning: email missing'
                  : 'Import successful',
              ],
              important_checks: {},
              error_message: _emailMissing
                ? 'Imported without an email address — add one to enable notices and smart contract creation.'
                : null,
              xero_records: [contact],
              paytrade_records: [response],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: response.id,
              contact_id: response.client_supplier_id,
              contact_name: response.client_supplier_name,
              contact_status: response.client_supplier_status,
            };
          }
        } else {
          const checkExistenceInXero = checkNameExistence[0]?.client_supplier_id
            ? await this.getContactDetails(
                checkNameExistence[0]?.client_supplier_id,
                xeroDetails?.integration_id,
              )
            : null;
          if (!checkExistenceInXero) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_id: checkNameExistence[0]?.client_supplier_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 367,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from Client/supplier ${contact.name}`,
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
              api_name: 'createContactInPaytrade',
              api_payload: {
                contact_id,
                client_supplier_id: checkNameExistence[0]?.client_supplier_id,
                client_supplier_name: contact.name,
                client_email_id: contact.emailAddress || '',
                unmapping_contact_id: checkExistenceInXero?.contact_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 364,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from Client/supplier ${contact.name}`,
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
    } catch (error) {
      error = error?.message ? error?.message : error;
      throw new Error(error);
    }
  }

  async updateContactDetails(data: any) {
    const xeroContactDetails = await this.xeroContactDetails.findOne({
      where: {
        pt_contact_id: data.pt_contact_id,
        integration_id: data.integration_id,
      },
    });
    xeroContactDetails.tenant_id = data.tenant_id;
    xeroContactDetails.integration_id = data.integration_id;
    xeroContactDetails.contact_id = data.contact_id;
    xeroContactDetails.contact_name = data.contact_name;
    xeroContactDetails.contact_status = data.contact_status;
    xeroContactDetails.is_supplier = data.is_supplier;
    xeroContactDetails.is_customer = data.is_customer;
    xeroContactDetails.merge_to_contact_id = data.merge_to_contact_id;
    xeroContactDetails.mapped_status = data.mapped_status;
    xeroContactDetails.updated_by = data.updated_by;
    xeroContactDetails.updated_on = data.updated_on;
    xeroContactDetails.updated_group = data.updated_group;
    return await this.xeroContactDetails.save(xeroContactDetails);
  }

  async updateContactDetailsByContactId(data: any) {
    const xeroContactDetails = await this.xeroContactDetails.findOne({
      where: {
        contact_id: data.contact_id,
        integration_id: data.integration_id,
      },
    });
    xeroContactDetails.tenant_id = data.tenant_id;
    xeroContactDetails.integration_id = data.integration_id;
    xeroContactDetails.contact_id = data.contact_id;
    xeroContactDetails.contact_name = data.contact_name;
    xeroContactDetails.contact_status = data.contact_status;
    xeroContactDetails.is_supplier = data.is_supplier;
    xeroContactDetails.is_customer = data.is_customer;
    xeroContactDetails.merge_to_contact_id = data.merge_to_contact_id;
    xeroContactDetails.mapped_status = data.mapped_status;
    xeroContactDetails.pt_contact_id = data.pt_contact_id;
    xeroContactDetails.updated_by = data.updated_by;
    xeroContactDetails.updated_on = data.updated_on;
    xeroContactDetails.updated_group = data.updated_group;
    return await this.xeroContactDetails.save(xeroContactDetails);
  }

  async editContact(decoded: any, data: any) {
    try {
      const clientSupplierDetails = await this.getClientSuppliersDetails(
        data.client_supplier_id,
      );
      if (!clientSupplierDetails) {
        throw `Client Supplier details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          company_id: clientSupplierDetails.company_id,
          status: 'ACTIVE',
        },
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

      const contact_details = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: data.client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!contact_details) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editContactInXero',
          api_payload: {
            client_supplier_id: data.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 38,
          dynamic_values: {
            contact_name: clientSupplierDetails?.client_supplier_name,
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: clientSupplierDetails?.id,
          },
          reference_id: clientSupplierDetails?.id,
          history: [
            `API triggered from contact ${clientSupplierDetails?.client_supplier_name}`,
            `Contact edit in xero failed - contact is not mapped`,
            'Export failed',
          ],
          important_checks: {},
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [clientSupplierDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      await this.xeroService.refreshTokenSet(
        clientSupplierDetails.company_id,
        this.xero,
      );

      const xeroContactDetails = await this.xero.accountingApi.getContact(
        xeroDetails.tenant_id,
        contact_details.contact_id,
      );

      this.logger.log(`xeroContactDetails: ${JSON.stringify(xeroContactDetails)}`);
      if (xeroContactDetails.body.contacts[0]) {
        try {
          const phone: Phone = {
            phoneNumber: clientSupplierDetails.client_phone_no,
            phoneType: Phone.PhoneTypeEnum.MOBILE,
          };
          const phones = [];
          phones.push(phone);

          const address: Address = {
            addressType: Address.AddressTypeEnum.POBOX,
            addressLine1: clientSupplierDetails.client_supplier_address,
            country: clientSupplierDetails.country,
          };
          const addresses = [];
          addresses.push(address);

          const contactData: any = {
            name: clientSupplierDetails.client_supplier_name,
            addresses: addresses,
            emailAddress: clientSupplierDetails.client_email_id,
            phones: phones,
          };

          // Phase 2 outbound: push per-contact GST overrides to Xero.
          this.applyContactGstToXeroPayload(contactData, clientSupplierDetails);

          if (xeroDetails.sync_contact_financial_to_xero) {
            const fullDetails = await this.clientSuppliersDetails.findOne({
              where: { client_supplier_id: clientSupplierDetails.client_supplier_id },
              relations: ['accountDetails'],
            });
            const bankAccount = fullDetails?.accountDetails?.find(
              (acc) => acc.account_number && acc.bsb_number,
            );
            if (bankAccount) {
              // Xero AU expects a single concatenated string: 6-digit BSB
              // (zero-padded) + account number. No separate `code` field.
              const bsbDigitsPush = String(bankAccount.bsb_number).replace(/\D/g, '').padStart(6, '0');
              const acctDigitsPush = String(bankAccount.account_number || '').replace(/\D/g, '');
              contactData.batchPayments = {
                bankAccountName: bankAccount.account_name || '',
                bankAccountNumber: `${bsbDigitsPush}${acctDigitsPush}`,
              };
              this.logger.log(
                `Including financial details in Xero contact update for ${clientSupplierDetails.client_supplier_name}`,
              );
            } else {
              this.logger.log(
                `Skipping financial details sync — no complete bank account (account_number + BSB) found for ${clientSupplierDetails.client_supplier_name}`,
              );
            }
          }

          const response = await this.xero.accountingApi.updateContact(
            xeroDetails.tenant_id,
            contact_details.contact_id,
            {
              contacts: [contactData],
            },
          );
          this.logger.log(`response: ${JSON.stringify(response.body.contacts)}`);
          if (response.body.contacts) {
            const contact: any = response.body.contacts[0];
            const requestData: any = {
              contact_id: contact.contactID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_name: contact.name,
              contact_status: contact.contactStatus,
              is_supplier: contact.isSupplier,
              is_customer: contact.isCustomer,
              merge_to_contact_id: contact.mergedToContactID || null,
              pt_contact_id: clientSupplierDetails.client_supplier_id,
              mapped_status: 'System',
              updated_on: contact.updatedDateUTC,
            };
            const xeroResponse = await this.updateContactDetails(requestData);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 22,
              dynamic_values: {
                contact_name: clientSupplierDetails?.client_supplier_name,
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: clientSupplierDetails?.id,
              },
              reference_id: clientSupplierDetails?.id,
              history: [
                `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                'Export successful',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [contact],
              paytrade_records: [clientSupplierDetails],
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
                api_name: 'editContactInXero',
                api_payload: {
                  client_supplier_id: data.client_supplier_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 32,
                dynamic_values: {
                  contact_name: clientSupplierDetails?.client_supplier_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: contact_details?.id,
                  paytradeId: clientSupplierDetails?.id,
                },
                reference_id: clientSupplierDetails?.id,
                history: [
                  `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                  `Contact edit in xero failed - contact is not updated`,
                  'Export failed',
                ],
                important_checks: {},
                error_message: errMsg,
                xero_records: [response.body.contacts[0]],
                paytrade_records: [clientSupplierDetails],
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
              api_name: 'editContactInXero',
              api_payload: {
                client_supplier_id: data.client_supplier_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 32,
              dynamic_values: {
                contact_name: clientSupplierDetails?.client_supplier_name,
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: contact_details?.id,
                paytradeId: clientSupplierDetails?.id,
              },
              reference_id: clientSupplierDetails?.id,
              history: [
                `API triggered from client/suppliers ${clientSupplierDetails?.client_supplier_name}`,
                `Contact edit in xero failed - contact is not updated`,
                'Export failed',
              ],
              important_checks: {},
              error_message: errMsg,
              xero_records: [],
              paytrade_records: [clientSupplierDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } else {
        const errMsg = await handleAxiosError(xeroContactDetails);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'editContactInXero',
          api_payload: {
            client_supplier_id: data.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 284,
          dynamic_values: {
            contact_name: clientSupplierDetails?.client_supplier_name,
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: contact_details?.id,
            paytradeId: clientSupplierDetails?.id,
          },
          reference_id: clientSupplierDetails?.id,
          history: [
            `API triggered from contact ${clientSupplierDetails?.client_supplier_name}`,
            `Contact edit in xero failed - contact is not found`,
            'Export failed',
          ],
          important_checks: {},
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [clientSupplierDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async deleteContact(decoded: any, data: any) {
    try {
      const clientSuppliersDetails = await this.getClientSuppliersDetails(
        data.client_supplier_id,
      );
      if (!clientSuppliersDetails) {
        throw `Contact details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: {
          company_id: clientSuppliersDetails.company_id,
          status: 'ACTIVE',
        },
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

      const contact_details = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: data.client_supplier_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!contact_details) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContactInXero',
          api_payload: {
            client_supplier_id: data.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 40,
          dynamic_values: {
            contact_name: clientSuppliersDetails?.client_supplier_name,
          },
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: clientSuppliersDetails?.id,
          },
          reference_id: clientSuppliersDetails?.id,
          history: [
            `API triggered from contact ${clientSuppliersDetails?.client_supplier_name}`,
            `Contact edit in xero failed - contact is not mapped`,
            'Export failed',
          ],
          important_checks: {},
          error_message: `Contact is not mapped`,
          xero_records: [],
          paytrade_records: [clientSuppliersDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        !contact_details.contact_id &&
        contact_details.contact_status === 'DRAFT'
      ) {
        contact_details.contact_status = 'ARCHIVED';
        contact_details.updated_by = decoded?.userId;
        contact_details.updated_on = moment.tz('UTC');
        contact_details.updated_group = 'USER';
        const xeroResponse =
          await this.xeroContactDetails.save(contact_details);
        if (xeroResponse) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 24,
              dynamic_values: { contact_name: contact_details?.contact_name },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: contact_details?.id,
              },
              reference_id: contact_details?.id,
              history: [
                `API triggered from contact ${contact_details?.contact_name}`,
                'Export successful',
              ],
              important_checks: {},
              error_message: null,
              xero_records: [],
              paytrade_records: [contact_details],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
        }
        return xeroResponse;
      }

      await this.xeroService.refreshTokenSet(
        clientSuppliersDetails.company_id,
        this.xero,
      );

      const contactDetails = await this.xero.accountingApi.getContact(
        xeroDetails.tenant_id,
        contact_details.contact_id,
      );
      // console.log('contactDetails:', contactDetails);

      if (contactDetails.body.contacts[0]) {
        try {
          const deleteContactResponse =
            await this.xero.accountingApi.updateContact(
              xeroDetails.tenant_id,
              contact_details.contact_id,
              {
                contacts: [
                  { contactStatus: Contact.ContactStatusEnum.ARCHIVED },
                ],
              },
            );

          this.logger.log(
            `Contact deleted successfully: ${deleteContactResponse.response.status}`,
          );
          if (deleteContactResponse.response.status === 200) {
            const contact = deleteContactResponse.body.contacts[0];
            contact_details.contact_status = String(contact.contactStatus);
            contact_details.updated_by = decoded?.userId;
            contact_details.updated_on = moment.tz('UTC');
            contact_details.updated_group = 'USER';
            const xeroResponse =
              await this.xeroContactDetails.save(contact_details);
            if (xeroResponse) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  id: data?.sync_id,
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 24,
                  dynamic_values: {
                    contact_name: clientSuppliersDetails?.client_supplier_name,
                  },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: xeroResponse?.id,
                    paytradeId: clientSuppliersDetails?.id,
                  },
                  reference_id: clientSuppliersDetails?.id,
                  history: [
                    `API triggered from client/suppliers ${clientSuppliersDetails?.client_supplier_name}`,
                    'Export successful',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [contactDetails.body.contacts[0]],
                  paytrade_records: [clientSuppliersDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
            return xeroResponse;
          } else {
            const errMsg = await handleAxiosError(deleteContactResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'deleteContactInXero',
                api_payload: {
                  client_supplier_id: data.client_supplier_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 34,
                dynamic_values: {
                  contact_name: clientSuppliersDetails?.client_supplier_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: contact_details.id,
                  paytradeId: clientSuppliersDetails?.id,
                },
                reference_id: clientSuppliersDetails?.id,
                history: [
                  `API triggered from client/suppliers ${clientSuppliersDetails?.client_supplier_name}`,
                  `Contact delete in xero failed - contact is not updated`,
                  'Export failed',
                ],
                important_checks: {},
                error_message: errMsg,
                xero_records: [contactDetails.body.contacts[0]],
                paytrade_records: [clientSuppliersDetails],
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
              api_name: 'deleteContactInXero',
              api_payload: {
                client_supplier_id: data.client_supplier_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 34,
              dynamic_values: {
                contact_name: clientSuppliersDetails?.client_supplier_name,
              },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: contact_details.id,
                paytradeId: clientSuppliersDetails?.id,
              },
              reference_id: clientSuppliersDetails?.id,
              history: [
                `API triggered from client/suppliers ${clientSuppliersDetails?.client_supplier_name}`,
                `Contact delete in xero failed - contact is not updated`,
                'Export failed',
              ],
              important_checks: {},
              error_message: errMsg,
              xero_records: [contactDetails.body.contacts[0]],
              paytrade_records: [clientSuppliersDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } else {
        const errMsg = await handleAxiosError(contactDetails);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContactInXero',
          api_payload: {
            client_supplier_id: data.client_supplier_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 285,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: contact_details.id,
            paytradeId: clientSuppliersDetails?.id,
          },
          reference_id: clientSuppliersDetails?.id,
          history: [
            `API triggered from client/suppliers ${clientSuppliersDetails?.client_supplier_name}`,
            `Contact delete in xero failed - contact is not found`,
            'Export failed',
          ],
          important_checks: {},
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [clientSuppliersDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
        // contact_details.contact_status = 'ARCHIVED';
        // contact_details.updated_by = decoded?.userId;
        // contact_details.updated_on = moment.tz('UTC');
        // contact_details.updated_group = 'USER';
        // return await this.xeroContactDetails.save(contact_details);
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getContactByContactId(contact_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const contactDetails = await this.xero.accountingApi.getContact(
        xeroDetails.tenant_id,
        contact_id,
      );
      // console.log('contactDetails:', contactDetails.body.contacts[0]);
      if (contactDetails.body.contacts[0]) {
        return contactDetails.body.contacts[0];
      }
      throw contactDetails;
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  // Task #135 — Public entry point: serialise per-company so concurrent
  // SYNC clicks / webhook fallbacks can't race into the check-then-insert
  // path that produced duplicate xero_contact_details rows.
  async syncAllContactsByCompanyId(decoded: any, company_id: number) {
    const lockValue = await this.acquireSyncLock(company_id);
    if (!lockValue) {
      this.logger.warn(
        `[Task #135] syncAllContactsByCompanyId skipped for company ${company_id}: another sync is already in progress`,
      );
      const payload: {
        mapped: number;
        unmapped: number;
        total: number;
        already_running: boolean;
      } = { mapped: 0, unmapped: 0, total: 0, already_running: true };
      return framedResponse(
        'SUCCESS',
        'A Xero contacts sync is already in progress for this company. Please wait for it to finish.',
        payload,
      );
    }
    try {
      return await this.runSyncAllContactsByCompanyId(decoded, company_id);
    } finally {
      await this.releaseSyncLock(company_id, lockValue);
    }
  }

  private async runSyncAllContactsByCompanyId(decoded: any, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);

      const integrationDetails = await this.integrationDetails.findOne({
        where: { integration_id: xeroDetails.integration_id },
      });
      if (!integrationDetails) throw `No xero integration found`;

      if (
        xeroDetails.action_buttons.import_contact === false &&
        integrationDetails.integration_status !== 'Pending contact mapping'
      )
        throw `Unauthorized to perform this action`;

      const ifModifiedSince: Date = new Date('1900-01-01T00:00:00.000+00:00'); //Only records created or modified since this timestamp will be returned
      const where = null; // 'ContactStatus=="ACTIVE"';
      const order = 'Name ASC';
      const contactIds = [];
      const includeArchived = true; //ARCHIVED
      const summaryOnly = true; //Use summaryOnly=true in GET Contacts and Invoices endpoint to retrieve a smaller version of the response object. This returns only lightweight fields, excluding computation-heavy fields from the response, making the API calls quick and efficient.
      const searchTerm = '';
      let page = 1;
      const pageSize = 500;
      let hasMoreContacts = true;

      const newContacts = [];
      const existingContacts = [];

      let oldData = [],
        newData = [],
        syncedData = [],
        mappedContacts = [];
      const count = { mapped: 0, unmapped: 0, total: 0 };

      while (hasMoreContacts) {
        const response = await this.xero.accountingApi.getContacts(
          xeroDetails.tenant_id,
          ifModifiedSince,
          where,
          order,
          contactIds,
          page,
          includeArchived,
          summaryOnly,
          searchTerm,
          pageSize,
        );

        // console.log('response.body: ', response.body);
        const contacts = response.body.contacts || [];

        if (contacts.length === 0) {
          hasMoreContacts = false; // Stop looping when no more contacts are returned
        } else {
          // Fetch all contact IDs from DB in a single query
          const contactIdsInDb = await this.xeroContactDetails.find({
            where: {
              contact_id: In(contacts.map((c) => c.contactID)),
              integration_id: xeroDetails.integration_id,
            },
            select: ['contact_id'],
          });
          const existingContactIds = new Set(
            contactIdsInDb.map((c) => c.contact_id),
          );
          const existingContactIdsSet = new Set(existingContactIds);
          // Separate new and existing contacts
          contacts.forEach((contact) => {
            this.logger.log(`contact: ${contact.contactStatus}`);
            const contactData: any = {
              contact_id: contact.contactID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contact_name: contact.name,
              contact_status: contact.contactStatus,
              is_supplier: contact.isSupplier || false,
              is_customer: contact.isCustomer || false,
              created_on: contact.updatedDateUTC,
              merge_to_contact_id: contact.mergedToContactID || null,
            };

            if (existingContactIdsSet.has(String(contact.contactID))) {
              if (
                !existingContacts.some(
                  (c) => c.contact_id === String(contact.contactID),
                )
              ) {
                existingContacts.push(contactData);
                oldData.push(contact);
              }
            } else {
              if (
                contactData &&
                contactData?.contact_status === Contact.ContactStatusEnum.ACTIVE
              ) {
                newContacts.push(contactData);
                newData.push(contact);
              }
            }
          });

          // Batch insert new contacts.
          // Task #135 — Use ON CONFLICT DO NOTHING so a race that slips
          // past the per-company Redis lock (or a sync triggered from a
          // host where Redis is unreachable) cannot insert a duplicate
          // row. The partial unique index on
          // (integration_id, contact_id) WHERE contact_id IS NOT NULL
          // is the DB-level backstop this clause hooks into.
          if (newContacts.length > 0) {
            await this.xeroContactDetails
              .createQueryBuilder()
              .insert()
              .into(XeroContactDetails)
              .values(newContacts)
              .orIgnore()
              .execute();
          }

          // Batch update existing contacts
          if (existingContacts.length > 0) {
            for (const contact of existingContacts) {
              await this.xeroContactDetails.update(
                {
                  contact_id: contact.contact_id,
                  integration_id: xeroDetails.integration_id,
                },
                contact,
              );
            }
          }

          //automapping
          const autoMappingRecords = await this.xeroContactDetails
            .createQueryBuilder('contact')
            .select([
              'contact.id AS id',
              'contact.contact_id AS contact_id',
              'contact.tenant_id AS tenant_id',
              'contact.merge_to_contact_id AS merge_to_contact_id',
              'contact.contact_name AS contact_name',
              'contact.contact_status AS contact_status',
              'c.client_supplier_id AS pt_contact_id',
              'c.client_supplier_name AS pt_contact_name',
            ])
            .innerJoin(
              XeroIntegrationDetails,
              'xero',
              `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
            )
            .innerJoin(
              ClientSuppliersDetails,
              'c',
              'LOWER(TRIM(contact.contact_name)) = LOWER(TRIM(c.client_supplier_name))',
            )
            .distinct(true)
            .where(
              `xero.company_id = :companyId and c.company_id = :companyId and c.is_deleted = false`,
              {
                companyId: company_id,
              },
            )
            .andWhere('contact.pt_contact_id IS NULL')
            // Task #289 — Never auto-link a row the user explicitly
            // marked as permanently unmapped.
            .andWhere('contact.permanently_unmapped = false')
            .orderBy({ 'contact.contact_name': 'ASC' })
            .getRawMany();
          // console.log('autoMappingRecords: ', autoMappingRecords);

          const yet_to_map = autoMappingRecords?.map((res) => ({
            contact_id: res.contact_id,
            pt_contact_id: res?.pt_contact_id,
          }));

          if (yet_to_map && yet_to_map.length > 0) {
            for (const element of yet_to_map) {
              await this.xeroContactDetails
                .createQueryBuilder()
                .update(XeroContactDetails)
                .set({
                  pt_contact_id: element.pt_contact_id,
                  mapped_status: 'Auto',
                  updated_by: decoded.userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                })
                .where(
                  'contact_id = :contact_id AND integration_id = :integration_id',
                  {
                    contact_id: element.contact_id,
                    integration_id: xeroDetails.integration_id,
                  },
                )
                .execute();
              mappedContacts.push(element.contact_id);
            }
          }

          // synced records
          const syncedRecords = await this.xeroContactDetails
            .createQueryBuilder('contact')
            .select([
              'contact.id AS id',
              'contact.contact_id AS contact_id',
              'contact.tenant_id AS tenant_id',
              'contact.merge_to_contact_id AS merge_to_contact_id',
              'contact.contact_name AS contact_name',
              'contact.contact_status AS contact_status',
              'c.client_supplier_id AS pt_contact_id',
              'c.client_supplier_name AS pt_contact_name',
            ])
            .innerJoin(
              XeroIntegrationDetails,
              'xero',
              `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
            )
            .innerJoin(
              ClientSuppliersDetails,
              'c',
              'LOWER(TRIM(contact.contact_name)) = LOWER(TRIM(c.client_supplier_name))',
            )
            .distinct(true)
            .where(
              `xero.company_id = :companyId and c.company_id = :companyId and c.is_deleted = false`,
              {
                companyId: company_id,
              },
            )
            .orderBy({ 'contact.contact_name': 'ASC' })
            .getRawMany();
          // console.log('syncedRecords: ', syncedRecords);
          const newIds = new Set(newContacts.map((r) => r.contact_id));
          const existingIds = new Set(
            existingContacts.map((r) => r.contact_id),
          );
          const syncedMap = new Map<number | string, any>();
          syncedRecords.forEach((record) => {
            syncedMap.set(record.contact_id, record);
          });
          // console.log({ syncedMap });
          const tempSyncedData = contacts
            .map((record) => {
              const contact_id = record.contactID;
              const syncedData = syncedMap.get(contact_id);
              // console.log({ syncedData });
              let sync_status = 'Unsynced';

              if (newIds.has(contact_id) && syncedData) {
                sync_status = 'Synced';
              } else if (existingIds.has(contact_id) && syncedData) {
                sync_status = 'Already synced';
              }

              // return {
              //   ...record,
              //   ...(syncedData?.pt_contact_id && {
              //     pt_contact_id: syncedData.pt_contact_id,
              //   }),
              //   ...(syncedData?.pt_contact_name && {
              //     pt_contact_name: syncedData.pt_contact_name,
              //   }),
              //   sync_status,
              // };
              return {
                ...record,
                ...{
                  pt_contact_id: syncedData?.pt_contact_id ?? null,
                },
                ...{
                  pt_contact_name: syncedData?.pt_contact_name ?? null,
                },
                sync_status,
              };
            })
            .filter((record) => record.sync_status !== 'Already synced');
          syncedData.push(...tempSyncedData);
          // console.log({ syncedData });
          page++; // Move to the next page
        }
      }

      const allrecords = await this.xeroContactDetails
        .createQueryBuilder('x')
        .select([
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
          'COUNT(*)::int AS count',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId`, {
          companyId: company_id,
        })
        .groupBy(
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
        )
        .getRawMany();

      allrecords.forEach((row) => {
        count[row.status] = row.count;
        count.total += row.count;
      });
      count.mapped =
        mappedContacts && mappedContacts[0] !== null
          ? mappedContacts.length
          : 0;

      if (
        xeroDetails.action_buttons.import_contact === false &&
        integrationDetails.integration_status === 'Pending contact mapping'
      ) {
        const updateIntegrationResult = await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            integration_status: 'Pending project tracking id mapping',
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: integrationDetails.id })
          .execute();
        // console.log(updateIntegrationResult);

        xeroDetails.action_buttons.import_contact = true;
        const updateXeroResult = await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            action_buttons: xeroDetails.action_buttons,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroDetails.id })
          .execute();
        // console.log(updateXeroResult);
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            integration_id: integrationDetails.integration_id,
            log_template_id: 2,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Import successful'],
            important_checks: {},
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      } else {
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            integration_id: integrationDetails.integration_id,
            log_template_id: 6,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Sync successful'],
            important_checks: {},
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      }

      this.logger.log('All contacts fetched, inserted, and updated successfully.');
      if (newContacts || existingContacts) {
        // return 'Data synced and automapped successfully';
        return framedResponse(
          'SUCCESS',
          `Data synced and automapped successfully`,
          count,
        );
      } else {
        // return 'No data available to sync';
        return framedResponse('ERROR', `No data available to sync`, count);
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getXeroContactListsForCompany(data: GetXeroContactListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContactDetails
        .createQueryBuilder('contact')
        .select('contact.id', 'id')
        .addSelect('contact.contact_id', 'contact_id')
        .addSelect('contact.tenant_id', 'tenant_id')
        .addSelect('contact.merge_to_contact_id', 'merge_to_contact_id')
        .addSelect('contact.contact_name', 'contact_name')
        .addSelect('contact.contact_status', 'contact_status')
        .addSelect('contact.pt_contact_id', 'pt_contact_id')
        .addSelect(
          // Task #289 — Surface "Permanently unmapped" as a distinct
          // status so the UI can render it alongside Mapped / Unmapped.
          `CASE
             WHEN contact.permanently_unmapped = true THEN 'Permanently unmapped'
             WHEN contact.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped'
             ELSE 'Unmapped'
           END`,
          'mapped_status',
        )
        .addSelect('contact.permanently_unmapped', 'permanently_unmapped')
        // Task #135 — Use a subquery on the integration table instead of
        // an inner join so a company that has more than one ACTIVE row
        // sharing the same `integration_id` cannot multiply the contact
        // result set. The Map-based de-dupe further down is kept as a
        // defence in depth.
        .where(
          `contact.integration_id IN (
            SELECT xero.integration_id
            FROM xero_integration_details xero
            WHERE xero.status = 'ACTIVE' AND xero.company_id = :companyId
          )`,
          { companyId: data.company_id },
        )
        .andWhere(`contact.contact_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(contact.contact_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder
            .andWhere(`contact.mapped_status IN (:...mappedStatuses)`, {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            })
            // Task #289 — Permanently unmapped rows must never appear
            // in the Mapped or plain Unmapped views.
            .andWhere('contact.permanently_unmapped = false');
        } else if (data.mapped_status === 'Permanently unmapped') {
          queryBuilder.andWhere('contact.permanently_unmapped = true');
        } else {
          queryBuilder
            .andWhere(`contact.mapped_status IS NULL`)
            .andWhere('contact.permanently_unmapped = false');
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(contact.contact_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(contact.contact_name)': sorting_order,
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

      return { total_count: finalCount, contact_list: finalResult };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getPaytradeContactListsForCompany(data: GetPaytradeContactListsInput) {
    try {
      const queryBuilder = await this.clientSuppliersDetails
        .createQueryBuilder('cs')
        .select('cs.id', 'id')
        .addSelect('cs.client_supplier_id', 'contact_id')
        .addSelect('cs.client_supplier_name', 'contact_name')
        .addSelect('cs.client_supplier_status', 'contact_status')
        .addSelect('contact.contact_id', 'xero_contact_id')
        .addSelect(
          `CASE WHEN contact.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = cs.company_id`,
        )
        .leftJoin(
          XeroContactDetails,
          'contact',
          '(contact.pt_contact_id::text = cs.client_supplier_id::text OR contact.pt_contact_id::text = cs.id::text) AND xero.integration_id = contact.integration_id',
        )
        .where(`cs.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`cs.is_deleted = false`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(cs.client_supplier_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `contact.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`contact.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(cs.client_supplier_name)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(cs.client_supplier_name)': sorting_order,
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
      return { total_count: finalCount, contact_list: finalResult };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getMappedContactLists(data: GetMappedXeroContactListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContactDetails
        .createQueryBuilder('contact')
        .select([
          'contact.id AS id',
          'contact.contact_id AS contact_id',
          'contact.tenant_id AS tenant_id',
          'contact.merge_to_contact_id AS merge_to_contact_id',
          'contact.contact_name AS contact_name',
          'contact.contact_status AS contact_status',
          `CASE WHEN contact.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
          'contact.pt_contact_id AS pt_contact_id',
          'c.client_supplier_name AS pt_contact_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
        )
        .innerJoin(
          ClientSuppliersDetails,
          'c',
          'contact.pt_contact_id::text = c.client_supplier_id::text OR contact.pt_contact_id::text = c.id::text',
        )
        .where(`contact.mapped_status IN (:...mappedStatuses)`, {
          mappedStatuses: ['Manual', 'Auto', 'System'],
        })
        .andWhere(
          `xero.company_id = :companyId and c.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        )
        .andWhere(`contact.contact_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(contact.contact_name) LIKE LOWER(:keyword) OR LOWER(c.client_supplier_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(contact.contact_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(contact.contact_name)': sorting_order,
              });
            }
            break;
          case 'pt_contact_name':
            {
              queryBuilder.orderBy({
                'LOWER(c.client_supplier_name)': sorting_order,
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

      return { total_count, contact_list: rawResults };
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async manualMappingContact(
    data: YetToMapContactsInput,
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

      const checkPaytradeId = await this.xeroContactDetails.findOne({
        where: {
          pt_contact_id: data.pt_contact_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.contact_name) {
        throw `This contact has been already mapped to xero contact ${checkPaytradeId?.contact_name}`;
      }

      const checkXeroId = await this.xeroContactDetails.findOne({
        where: {
          contact_id: data.contact_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_contact_id &&
        checkXeroId?.clientSupplierDetails?.client_supplier_name
      ) {
        throw `This contact has been already mapped to paytrade contact ${checkXeroId?.clientSupplierDetails?.client_supplier_name ? checkXeroId?.clientSupplierDetails?.client_supplier_name : checkXeroId.pt_contact_id}`;
      }
      const response = await this.xeroContactDetails
        .createQueryBuilder()
        .update(XeroContactDetails)
        .set({
          pt_contact_id: data.pt_contact_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id: data.contact_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Contacts has been mapped successfully`;
      } else {
        return `Contact is not mapped`;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async autoMappingContact(company_id: number, decoded: any) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContactDetails
        .createQueryBuilder('contact')
        .select([
          'contact.id AS id',
          'contact.contact_id AS contact_id',
          'contact.tenant_id AS tenant_id',
          'contact.merge_to_contact_id AS merge_to_contact_id',
          'contact.contact_name AS contact_name',
          'contact.contact_status AS contact_status',
          'c.client_supplier_id AS pt_contact_id',
          'c.client_supplier_name AS pt_contact_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contact.integration_id`,
        )
        .innerJoin(
          ClientSuppliersDetails,
          'c',
          'LOWER(TRIM(contact.contact_name)) = LOWER(TRIM(c.client_supplier_name))',
        )
        .distinct(true)
        .where(
          `xero.company_id = :companyId and c.company_id = :companyId and c.is_deleted = false`,
          {
            companyId: company_id,
          },
        )
        .andWhere('contact.pt_contact_id IS NULL')
        // Task #289 — Auto-map respects per-contact "permanently
        // unmapped" exclusion.
        .andWhere('contact.permanently_unmapped = false');

      const rawResults = await queryBuilder
        .orderBy({ 'contact.contact_name': 'ASC' })
        .getRawMany();

      const yet_to_map = rawResults?.map((res) => ({
        contact_id: res.contact_id,
        pt_contact_id: res?.pt_contact_id,
      }));

      let mappedContacts = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroContactDetails
            .createQueryBuilder()
            .update(XeroContactDetails)
            .set({
              pt_contact_id: element.pt_contact_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'contact_id = :contact_id AND integration_id = :integration_id',
              {
                contact_id: element.contact_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedContacts.push(element.contact_id);
        }
      }
      const allrecords = await this.xeroContactDetails
        .createQueryBuilder('x')
        .select([
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
          'COUNT(*)::int AS count',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId`, {
          companyId: company_id,
        })
        .groupBy(
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
        )
        .getRawMany();

      const count = { mapped: 0, unmapped: 0, total: 0 };

      allrecords.forEach((row) => {
        count[row.status] = row.count;
        count.total += row.count;
      });
      count.mapped =
        mappedContacts && mappedContacts[0] !== null
          ? mappedContacts.length
          : 0;
      if (yet_to_map && yet_to_map.length > 0) {
        return framedResponse(
          'SUCCESS',
          `Contacts has been auto mapped successfully`,
          count,
        );
      } else {
        return framedResponse(
          'ERROR',
          `No Contacts available for automapping.`,
          count,
        );
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async unMappingContact(contact_id: string, company_id: number, decoded: any) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const response = await this.xeroContactDetails
        .createQueryBuilder()
        .update(XeroContactDetails)
        .set({
          pt_contact_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id: contact_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        return `Contacts has been unmapped successfully`;
      } else {
        return `Contacts are not unmapped`;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  /**
   * Task #289 — Mark a Xero contact as permanently unmapped. Clears
   * any current PT link (same as unMappingContact) and sets the
   * sticky `permanently_unmapped` flag so the auto-mapper (sync +
   * webhook) and invoice/bill push will all skip it. Writes an
   * activity-log entry so admins can trace who excluded it.
   */
  async permanentlyUnmapContact(
    contact_id: string,
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

      const existing = await this.xeroContactDetails.findOne({
        where: {
          contact_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      const response = await this.xeroContactDetails
        .createQueryBuilder()
        .update(XeroContactDetails)
        .set({
          pt_contact_id: null,
          mapped_status: null,
          permanently_unmapped: true,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        try {
          await this.activityLogService.insertActivityLog({
            company_id,
            from_user: decoded?.userId,
            is_admin: !!decoded?.isAdmin,
            admin_id: decoded?.isAdmin ? decoded?.userId : null,
            created_by: decoded?.userId,
            dynamic_values: {
              action: 'xero_contact_permanently_unmapped',
              contact_id,
              contact_name: existing?.contact_name ?? null,
              previous_pt_contact_id: existing?.pt_contact_id ?? null,
              previous_mapped_status: existing?.mapped_status ?? null,
              integration_id: xeroDetails.integration_id,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[Task #289] activity log insert failed for permanentlyUnmapContact: ${err?.message || err}`,
          );
        }
        return `Contact permanently unmapped from Xero sync`;
      }
      return `Contact is not permanently unmapped`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  /**
   * Task #291 — Bulk version of `permanentlyUnmapContact`. Processes
   * the entire list in a single UPDATE (atomic) and writes ONE
   * activity-log entry summarising the batch instead of one per row.
   * Skips silently if the list is empty.
   */
  async permanentlyUnmapContactsBulk(
    contact_ids: string[],
    company_id: number,
    decoded: any,
  ) {
    try {
      const ids = Array.isArray(contact_ids)
        ? Array.from(new Set(contact_ids.filter((x) => typeof x === 'string' && x.length > 0)))
        : [];
      if (ids.length === 0) {
        throw `No contacts selected`;
      }

      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const existingRows = await this.xeroContactDetails.find({
        where: {
          contact_id: In(ids),
          integration_id: xeroDetails.integration_id,
        },
      });

      const response = await this.xeroContactDetails
        .createQueryBuilder()
        .update(XeroContactDetails)
        .set({
          pt_contact_id: null,
          mapped_status: null,
          permanently_unmapped: true,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contact_id IN (:...contact_ids) AND integration_id = :integration_id',
          {
            contact_ids: ids,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      const affected = response?.affected ?? 0;
      if (affected > 0) {
        try {
          await this.activityLogService.insertActivityLog({
            company_id,
            from_user: decoded?.userId,
            is_admin: !!decoded?.isAdmin,
            admin_id: decoded?.isAdmin ? decoded?.userId : null,
            created_by: decoded?.userId,
            dynamic_values: {
              action: 'xero_contacts_permanently_unmapped_bulk',
              integration_id: xeroDetails.integration_id,
              requested_count: ids.length,
              affected_count: affected,
              contacts: existingRows.map((r) => ({
                contact_id: r.contact_id,
                contact_name: r.contact_name ?? null,
                previous_pt_contact_id: r.pt_contact_id ?? null,
                previous_mapped_status: r.mapped_status ?? null,
              })),
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[Task #291] activity log insert failed for permanentlyUnmapContactsBulk: ${err?.message || err}`,
          );
        }
        return `${affected} contact${affected === 1 ? '' : 's'} permanently unmapped from Xero sync`;
      }
      return `No contacts were permanently unmapped`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  /**
   * Task #289 — Reverse a previous permanent-unmap so the row returns
   * to the normal "unmapped" pool and becomes eligible for auto-map
   * (name match) and invoice/bill push again. Writes an activity-log
   * entry.
   */
  async reEnableContactMapping(
    contact_id: string,
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

      const existing = await this.xeroContactDetails.findOne({
        where: {
          contact_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      const response = await this.xeroContactDetails
        .createQueryBuilder()
        .update(XeroContactDetails)
        .set({
          permanently_unmapped: false,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      if (response?.affected > 0) {
        try {
          await this.activityLogService.insertActivityLog({
            company_id,
            from_user: decoded?.userId,
            is_admin: !!decoded?.isAdmin,
            admin_id: decoded?.isAdmin ? decoded?.userId : null,
            created_by: decoded?.userId,
            dynamic_values: {
              action: 'xero_contact_mapping_re_enabled',
              contact_id,
              contact_name: existing?.contact_name ?? null,
              integration_id: xeroDetails.integration_id,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `[Task #289] activity log insert failed for reEnableContactMapping: ${err?.message || err}`,
          );
        }
        return `Contact mapping re-enabled`;
      }
      return `Contact mapping is not re-enabled`;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async autoCreateSingleContactInPaytrade(
    decoded: any,
    companyId: number,
    contactId: string,
  ) {
    const xeroDetails = await this.xeroIntegrationDetails.findOne({
      where: { company_id: companyId, status: 'ACTIVE' },
      relations: ['integrationDetails'],
    });
    if (!xeroDetails) {
      throw new Error('No active Xero integration found');
    }

    const xeroContact = await this.xeroContactDetails.findOne({
      where: {
        contact_id: contactId,
        integration_id: xeroDetails.integration_id,
      },
    });
    if (!xeroContact) {
      throw new Error('Contact not found in Xero contact details');
    }
    if (xeroContact.pt_contact_id && xeroContact.mapped_status) {
      throw new Error('Contact is already mapped');
    }

    const contactType = xeroContact.is_customer ? 'Client' : 'Supplier';
    const userId = decoded ? decoded.userId : null;
    const createdGroup = decoded ? 'USER' : 'SYSTEM';

    const existingContact =
      await this.clientSuppliersDetailsService.findByNameAndCompany(
        xeroContact.contact_name,
        companyId,
      );

    if (existingContact) {
      await this.xeroContactDetails
        .createQueryBuilder()
        .update()
        .set({
          pt_contact_id: existingContact.client_supplier_id,
          mapped_status: 'System',
          updated_by: userId,
          updated_on: moment.tz('UTC'),
          updated_group: createdGroup,
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id: contactId,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      return {
        id: existingContact.id,
        contact_id: existingContact.client_supplier_id,
        contact_name: existingContact.client_supplier_name,
        contact_status: existingContact.client_supplier_status,
      };
    }

    const createPayload: any = {
      company_id: companyId,
      client_supplier_name: xeroContact.contact_name,
      business_name: xeroContact.contact_name,
      client_supplier_type: contactType,
      client_supplier_status: 'Completed',
      related_entity: 'No',
      client_email_id: '',
      account_details: [],
    };

    const newContact =
      await this.clientSuppliersDetailsService.insertClientSupplierDetails(
        decoded,
        createPayload,
      );

    if (newContact && newContact.client_supplier_id) {
      await this.xeroContactDetails
        .createQueryBuilder()
        .update()
        .set({
          pt_contact_id: newContact.client_supplier_id,
          mapped_status: 'System',
          updated_by: userId,
          updated_on: moment.tz('UTC'),
          updated_group: createdGroup,
        })
        .where(
          'contact_id = :contact_id AND integration_id = :integration_id',
          {
            contact_id: contactId,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();

      return {
        id: newContact.id,
        contact_id: newContact.client_supplier_id,
        contact_name: newContact.client_supplier_name,
        contact_status: newContact.client_supplier_status,
      };
    }

    throw new Error('Failed to create contact in PayTrade');
  }

  async batchCreateContactsInPaytrade(decoded: any, companyId: number) {
    const result = { created: 0, skipped: 0, failed: 0 };
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: companyId, status: 'ACTIVE' },
      });
      if (!xeroDetails) {
        throw new Error('No active Xero integration found');
      }

      const unmappedContacts = await this.xeroContactDetails.find({
        where: {
          integration_id: xeroDetails.integration_id,
          pt_contact_id: null as any,
          contact_status: 'ACTIVE',
        },
      });

      for (const xeroContact of unmappedContacts) {
        try {
          await this.autoCreateSingleContactInPaytrade(
            decoded,
            companyId,
            xeroContact.contact_id,
          );
          result.created++;
        } catch (err) {
          if (err?.message === 'Contact is already mapped') {
            result.skipped++;
          } else {
            result.failed++;
            this.logger.warn(
              `Batch create in PayTrade failed for contact ${xeroContact.contact_id}: ${err?.message || err}`,
            );
          }
        }
      }

      return result;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async batchCreateContactsInXero(decoded: any, companyId: number) {
    const result = { created: 0, skipped: 0, failed: 0 };
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: companyId, status: 'ACTIVE' },
      });
      if (!xeroDetails) {
        throw new Error('No active Xero integration found');
      }

      const unmappedPtContacts = await this.clientSuppliersDetails
        .createQueryBuilder('cs')
        .leftJoin(
          'xero_contact_details',
          'xcd',
          `(xcd.pt_contact_id::text = cs.client_supplier_id::text OR xcd.pt_contact_id::text = cs.id::text) AND xcd.integration_id = :integrationId`,
          { integrationId: xeroDetails.integration_id },
        )
        .where('cs.company_id = :companyId', { companyId })
        .andWhere('cs.client_supplier_status = :status', { status: 'Completed' })
        .andWhere('xcd.id IS NULL')
        .getMany();

      for (const contact of unmappedPtContacts) {
        try {
          const xeroPayload = {
            client_supplier_id: contact.client_supplier_id,
            mapped_status: 'System',
          };
          await this.createContact(decoded, xeroPayload);
          result.created++;
        } catch (err) {
          result.failed++;
          this.logger.warn(
            `Batch create in Xero failed for PT contact ${contact.id}: ${err?.message || err}`,
          );
        }
      }

      return result;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }
}
