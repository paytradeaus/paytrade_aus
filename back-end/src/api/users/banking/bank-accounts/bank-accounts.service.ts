import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccounts } from 'src/entities/banking.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { EntityManager, ILike, In, Not, Repository } from 'typeorm';
import { BankAccountStatus } from 'src/libs/@paytrade-types/paytrade-types';
import {
  AddBankAccountInput,
  ChangeStatusOfBankAccountInput,
  CheckExistenceOfBankAccountNumberInput,
  CloseOrChangeBankAccountInput,
  EditDetailsOfABankAccountInput,
  FetchAllBankAccountsInput,
  FetchBankAccountDetailsInput,
  GetBankAccountListInput,
  UpdateDelegatePowersInput,
} from './bank-accounts.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ExtendedBankAccounts } from './bank-accounts.interface';
import { contractAccountType } from 'src/libs/@json/contract-account-type';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import {
  formatCurrency,
  formatCurrencyWithoutDollars,
} from 'src/libs/@currency-formattor/currency-formattor';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { handleError } from 'src/api/common/error-handler';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { CompliancesService } from '../../compliances/compliances.service';
import { BankAccountsValidator } from './bank-accounts.validator';
import { NoticesService } from '../../notices/notices.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { XeroSyncRecoveryService } from 'src/api/common/xero-webhooks/recoveryQueue/xeroSyncRecovery.service';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

// Australian BSBs are always 6 digits. Task #258 promoted the
// `bank_accounts.bsb_number` and `bank_accounts.closing_target_bsb`
// columns to `varchar(6)` so leading zeros now persist. This helper is
// retained as a defensive normalizer for the write paths
// (`addBankAccount`, `editDetailsOfABankAccount`) — callers may still
// hand us a `number` from a CSV import / Xero payload / legacy code
// path and we coerce to the canonical 6-digit string before save. Also
// used on read paths to harden against any legacy 5-digit rows that
// somehow slipped past the migration backfill.
function padBsb6(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(6, '0').slice(0, 6);
}

@Injectable()
export class BankAccountsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(TransactionDetails)
    private transactionsRepo: Repository<TransactionDetails>,
    @InjectRepository(ReconciliationReport)
    private reconciliationReportRepo: Repository<ReconciliationReport>,
    private readonly bankAccountsValidator: BankAccountsValidator,
    private activityLogService: ActivityLogService,
    private readonly fileUploadService: FileUploadService,
    private readonly complianceService: CompliancesService,
    private readonly noticeService: NoticesService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private entityManager: EntityManager,
    private emailQueueProducer: EmailQueueProducer,
    private readonly xeroSyncRecoveryService: XeroSyncRecoveryService,
  ) {
    this.logger = new PaytradeLogger('BANK_ACCOUNTS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  /**
   * Task #266: deterministic fingerprint over the bank-account fields that
   * actually appear on (or gate) S18B / TA1 / S23 trust-account notices.
   * Used by `editDetailsOfABankAccount` to decide whether a save warrants
   * re-triggering notice generation. Fields not on this list (status,
   * balances, last_journal_id, audit fields, etc.) do NOT trigger
   * regeneration when changed.
   */
  private getNoticeContentFingerprint(
    account: Partial<BankAccounts> | Record<string, any> | null | undefined,
  ): string {
    if (!account) return '';
    const norm = (v: any) => {
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (Array.isArray(v))
        return v.map((x) => String(x).trim()).sort().join(',');
      if (typeof v === 'string') return v.trim();
      return String(v);
    };
    const normProjectIds = (v: any) => {
      if (v === null || v === undefined) return '';
      const list = Array.isArray(v) ? v : String(v).split(',');
      return list
        .map((x) => String(x).trim())
        .filter(Boolean)
        .sort()
        .join(',');
    };
    const fields = [
      norm(account.account_name),
      norm(account.account_number),
      norm(account.bsb_number),
      norm(account.financial_institution),
      norm(account.account_type),
      normProjectIds(account.project_ids),
      norm(account.client_supplier_id),
      norm(account.trustee_id),
      norm(account.company_id),
      norm(account.contract_date),
      norm(account.opening_date),
      norm(account.contract_practical_completion_date),
      norm(account.first_sub_contract_date),
      norm(account.contract_value),
      norm(account.delegate_powers),
      norm(account.retention_trust_certificate_attachment_ids),
    ];
    return fields.join('|');
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async addBankAccount(decoded, payload: AddBankAccountInput, userId?: number) {
    try {
      this.logger.log(
        `Handling request for adding a bank account with data: ${JSON.stringify(payload)}`,
      );

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          payload.company_id,
        );

      if (
        payload.status === 'Open' &&
        ['Project Trust Account', 'Retention Trust Account'].includes(
          payload.account_type,
        )
      ) {
        const getCount = await this.fetchAllBankAccounts({
          company_id: payload.company_id,
          status: 'Open',
          account_type: 'Retention Trust Account, Project Trust Account',
          page: 1,
          items_per_page: 10,
        });
        this.logger.log('getCount: ' + JSON.stringify(getCount));

        const subscriptionItem =
          subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Trusts',
            )
            : [];

        if (
          !subscriptionDetails?.is_free_plan_eligible && // true  -> false
          (!subscriptionItem ||
            (subscriptionItem &&
              subscriptionItem?.length > 0 &&
              !subscriptionItem[0]?.is_unlimited &&
              (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                  getCount &&
                  getCount?.data?.total_count &&
                  getCount?.data?.total_count >=
                  subscriptionItem[0]?.limit_value))))
        ) {
          return {
            warning: true,
            warningMessage: `Trust cannot be added. Please upgrade your subscription plan.`,
          };
        }
      }

      if (payload.account_type === 'Cash Account') {
        payload.delegate_powers = 'No';
      }

      if (payload.status === 'Open') {
        const subscriptionItemForRestriction =
          subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Delegate authority',
            )
            : [];
        if (
          payload.delegate_powers === 'Yes' &&
          !subscriptionDetails?.is_free_plan_eligible &&
          (!subscriptionItemForRestriction ||
            (subscriptionItemForRestriction &&
              subscriptionItemForRestriction?.length > 0 &&
              subscriptionItemForRestriction[0]?.limit_value != 'true'))
        ) {
          return {
            warning: true,
            warningMessage: `Trust cannot have delegate authority. Please upgrade your subscription plan.`,
          };
        }
      }

      const data =
        await this.bankAccountsValidator.validateAddBankAccountDetails(payload);

      // `mark_notices_as_sent` is a transient input flag consumed by
      // `handleTriggerAccountNotices` — it is NOT a column on the
      // BankAccounts entity. Strip it from `data` before any TypeORM
      // write, otherwise the query builder throws:
      //   Property "mark_notices_as_sent" was not found in "BankAccounts"
      const markNoticesAsSent = !!(data as any)?.mark_notices_as_sent;
      delete (data as any).mark_notices_as_sent;

      /*
      Notices needs to be sent after the successful addition of bank account either manually or automatically based upon the subscription plan.
      Need to check whether the status needs to be updated as 'Open' as soon as the notices are sent.(As per document).
      Financial institution must be selected with the list of banks provided by the Paytrade administrator.
      Check for the valid subscriptions according to the delegate powers selected.
      */

      // console.log('decoded', decoded);
      data.created_by = userId;
      if (data.account_type == 'Cash Account') {
        data.status = 'Open';
      }

      // Task #258 — normalize bsb_number to a 6-digit string before
      // hitting the `varchar(6)` column. GraphQL still accepts `Int`
      // for back-compat (and the Xero scheduler hands us `parseInt`-ed
      // numbers), so coerce + zero-pad here. `data.bsb_number` is
      // typed as `number` on the input DTO; cast to `any` so TypeORM's
      // string column accepts the padded value.
      if ((data as any).bsb_number != null) {
        (data as any).bsb_number = padBsb6((data as any).bsb_number);
      }

      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Create entity
          const newAccount = this.bankAccountsRepo.create({
            ...data,
            created_by: userId,
            created_on: moment.tz('UTC'),
            created_group: 'USER',
          });

          // Save bank account
          const saved = await transactionalEntityManager.save(newAccount);

          // Convert to 100000000XX format
          const bank_account_id =
            Number(saved.bank_account_id) + 10000000000;

          // Update bank_account_id formatting
          await transactionalEntityManager
            .createQueryBuilder()
            .update(BankAccounts)
            .set({ bank_account_id })
            .where(`id = :id`, { id: saved.id })
            .execute();

          // Rename uploaded retention certificate files
          if (data?.retention_trust_certificate_attachment_ids?.length) {
            await this.fileUploadService.updateFileName(
              {
                attachment_type: 'Retention_trust_certificates',
                attachment_ids: data?.retention_trust_certificate_attachment_ids,
                module_id: bank_account_id,
                decoded,
              },
            );
          }
          if (data.account_type === 'Cash Account') {
            await transactionalEntityManager
              .createQueryBuilder()
              .update(BankAccounts)
              .set({ associated_cash_account_id: bank_account_id })
              .where(`bank_account_id = :bank_account_id`, {
                bank_account_id,
              })
              .execute();
          }

          this.logger.log('saved: ' + JSON.stringify(saved) + ' data: ' + JSON.stringify(data));

          let notices = null;
          if (data.status === 'Open' && (data.account_type !== 'Cash Account')) {

            notices = await this.noticeService.handleTriggerAccountNotices(
              decoded,
              {
                bank_account_id,
                mark_notices_as_sent: markNoticesAsSent,
              },
              transactionalEntityManager
            );

            this.logger.log('notices: ' + JSON.stringify(notices));

            if (notices?.status === 'ERROR') {
              this.logger.error(`Notice generation failed with message: ${notices.message}`);
              this.logger.error('NOTICE ERROR DETAILS: ' + JSON.stringify(notices, null, 2));
              throw new Error(`Notice generation failed: ${notices.message}`);
            }
          }

          return {
            ...saved,
            bank_account_id,
            notices: notices?.data,
          };
        },
      );

      // const addedBankAccount = await this.bankAccountsRepo.create({
      //   ...data,
      //   ...{
      //     created_by: userId,
      //     created_on: moment.tz('UTC'),
      //     created_group: 'USER',
      //   },
      // });
      // const savedBankAccountDetails =
      //   await this.bankAccountsRepo.save(addedBankAccount);
      // const bank_account_id =
      //   Number(savedBankAccountDetails.bank_account_id) + 10000000000;

      // if (data?.retention_trust_certificate_attachment_ids?.length) {
      //   await this.fileUploadService.updateFileName({
      //     attachment_type: 'Retention_trust_certificates',
      //     attachment_ids: data?.retention_trust_certificate_attachment_ids,
      //     module_id: bank_account_id,
      //     decoded,
      //   });
      // }

      // this.logger.log(
      //   `Bank account added successfully with id: ${bank_account_id}`,
      // );

      // if (data.account_type == 'Cash Account') {
      //   await this.bankAccountsRepo
      //     .createQueryBuilder()
      //     .update(BankAccounts)
      //     .set({ associated_cash_account_id: bank_account_id })
      //     .where(`bank_account_id = :bank_account_id`, {
      //       bank_account_id,
      //     })
      //     .execute();
      // }

      // if (data.project_ids) {
      //   for (const projectId of data.project_ids) {
      //     if (
      //       data.account_type === 'Project Trust Account' ||
      //       data.account_type === 'Retention Trust Account'
      //     ) {
      //       const compliance_init =
      //         await this.complianceService.fetchComplianceResultsOfAProject({
      //           project_id: projectId,
      //           bank_account_type: data.account_type,
      //           failedFilter: false,
      //         });
      //     }
      //   }
      // }


      if (!response) {
        throw `Unable to add bank account`;
      }

      if (response.notices?.mails_to_sent.length) {
        for (let i = 0; i < response.notices?.mails_to_sent.length; i++) {
          const mailDetails = response.notices?.mails_to_sent[i];
          const updatePayload = response.notices?.update_notice_inputs[i];

          // 1. SEND THE MAIL
          await this.emailQueueProducer.emailQueueProducer({
            ...mailDetails,
            mail_type: EmailTypeEnum.notice,
          });

          // 2. UPDATE THE NOTICE
          await this.noticeService.handleUpdateNotice(decoded, updatePayload);
        }
      }

      if (data.project_ids) {
        for (const projectId of data.project_ids) {
          if (
            data.account_type === 'Project Trust Account' ||
            data.account_type === 'Retention Trust Account'
          ) {
            const compliance_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: projectId,
                bank_account_type: data.account_type,
                failedFilter: false,
              });
            // Task #297: invalidate the persisted compliance cache.
            await this.complianceService.markComplianceDirty(
              projectId,
              'bank_account.create',
            );
          }
        }
      }

      //Generating bank account link to view added bank account.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[12]}` +
        `${response.bank_account_id}/` +
        `${data.company_id}` +
        `?from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a bank account is added.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 66,
        admin_id:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.admin_id
            : null,
        to_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.userId
            : null,
        from_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? null
            : decoded?.userId,
        company_id: data.company_id,
        dynamic_values: {
          bankAccountName: data.account_name,
          bankAccountLink,
        },
        is_admin: false,
        created_by: userId,
      };
      // console.log('createActivityLogInput', createActivityLogInput);
      // await this.activityLogService.insertActivityLog(createActivityLogInput);

      // let notices;
      // if (data.status === 'Open') {
      //   notices = await this.noticeService.handleTriggerAccountNotices(
      //     decoded,
      //     { bank_account_id: bank_account_id },
      //   );
      // }

      let isCashAcc = false;
      if (data.account_type === 'Cash Account') {
        isCashAcc = true;
      }

      // return {
      //   warning: false,
      //   bank_account_id,
      //   isCashAcc,
      //   notices: notices?.data,
      // };
      const responceFormated = {
        warning: false,
        bank_account_id: response.bank_account_id,
        isCashAcc,
        notices: response.notices,
      }
      // Task #268 — If this bank account belongs to a client/supplier,
      // a previously-Failed Xero contact-mirror log may now be
      // recoverable (Xero requires bank accounts on certain push
      // patterns). Best-effort enqueue; recovery service is idempotent
      // and flap-guarded.
      if (data?.client_supplier_id) {
        try {
          await this.xeroSyncRecoveryService.enqueue({
            company_id: Number(data.company_id ?? payload?.company_id),
            client_supplier_id: Number(data.client_supplier_id),
            trigger: 'bank_account_add',
          });
        } catch (recErr: any) {
          this.logger.log(
            `[Task#268] Failed to enqueue Xero sync recovery for contact ${data.client_supplier_id}: ${recErr?.message || recErr}`,
          );
        }
      }
      return responceFormated;
    } catch (error) {
      this.logger.error(
        `Errored while adding a bank account with message: ${error?.message ? error?.message : error}`,
      );
      throw new Error(
        `Errored while adding bank account with message: ${error.message}`,
      );
    }
  }

  async editDetailsOfABankAccount(
    decoded,
    payload: EditDetailsOfABankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling request for editing the details of a bank account with data: ${JSON.stringify(payload)}`,
      );

      const bankDetails = await this.getBankDetails(payload.bank_account_id);

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          payload.company_id,
        );

      if (
        bankDetails &&
        bankDetails?.status === 'Draft' &&
        payload.status === 'Open' &&
        ['Project Trust Account', 'Retention Trust Account'].includes(
          payload.account_type,
        )
      ) {
        const getCount = await this.fetchAllBankAccounts({
          company_id: payload.company_id,
          status: 'Open',
          account_type: 'Retention Trust Account, Project Trust Account',
          page: 1,
          items_per_page: 10,
        });
        this.logger.log('getCount: ' + JSON.stringify(getCount));

        const subscriptionItem =
          subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Trusts',
            )
            : [];

        if (
          !subscriptionDetails?.is_free_plan_eligible && // true  -> false
          (!subscriptionItem ||
            (subscriptionItem &&
              subscriptionItem?.length > 0 &&
              !subscriptionItem[0]?.is_unlimited &&
              (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                  getCount &&
                  getCount?.data?.total_count &&
                  getCount?.data?.total_count >=
                  subscriptionItem[0]?.limit_value))))
        ) {
          return {
            warning: true,
            warningMessage: `Trust cannot be made active. Please upgrade your subscription plan.`,
          };
        }
      }

      if (payload.account_type === 'Cash Account') {
        payload.delegate_powers = 'No';
      }

      if (payload.status !== 'Draft') {
        const subscriptionItemForRestriction =
          subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Delegate authority',
            )
            : [];
        if (
          payload.delegate_powers === 'Yes' &&
          !subscriptionDetails?.is_free_plan_eligible &&
          (!subscriptionItemForRestriction ||
            (subscriptionItemForRestriction &&
              subscriptionItemForRestriction?.length > 0 &&
              subscriptionItemForRestriction[0]?.limit_value != 'true'))
        ) {
          return {
            warning: true,
            warningMessage: `Trust cannot have delegate authority. Please upgrade your subscription plan.`,
          };
        }
      }

      // console.log('decoded', decoded);
      const data =
        await this.bankAccountsValidator.validateEditDetailsOfABankAccount(
          payload,
        );

      const { bank_account_id } = data;
      delete data.bank_account_id;
      delete data.company_id;
      // `mark_notices_as_sent` is a transient input flag consumed by
      // `handleTriggerAccountNotices` — it is NOT a column on the
      // BankAccounts entity. Strip it from `data` before any TypeORM
      // write, otherwise the query builder throws:
      //   Property "mark_notices_as_sent" was not found in "BankAccounts"
      const markNoticesAsSent = !!(data as any)?.mark_notices_as_sent;
      delete (data as any).mark_notices_as_sent;

      // Task #258 — normalize bsb_number to a 6-digit string before
      // the `varchar(6)` write. See the equivalent block in
      // `addBankAccount` for why a number may still arrive here.
      if ((data as any).bsb_number != null) {
        (data as any).bsb_number = padBsb6((data as any).bsb_number);
      }

      const accountDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
      });

      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          if (data.account_type == 'Cash Account') {
            data.status == 'Open';
            data.associated_cash_account_id =
              accountDetails.associated_cash_account_id;
          }

          await transactionalEntityManager
            .createQueryBuilder()
            .update(BankAccounts)
            .set({
              ...data,
              updated_by: decoded?.userId,
            })
            .where('bank_account_id = :bank_account_id', { bank_account_id })
            .andWhere('added_by_client_supplier = :added_by_client_supplier', {
              added_by_client_supplier: false,
            })
            .execute();
          this.logger.log(`Details of a bank account edited successfully.`);

          if (data?.retention_trust_certificate_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Retention_trust_certificates',
              attachment_ids: data?.retention_trust_certificate_attachment_ids,
              module_id: bank_account_id,
              decoded,
            });
          }

          let notices;
          // Task #266: GraphQL edit inputs are nullable, so `data.status` /
          // `data.account_type` may be omitted on a legitimate edit. Fall
          // back to the persisted values so a content-only edit (e.g.
          // renaming the account) still passes this gate.
          const effectiveStatus = data.status ?? accountDetails?.status;
          const effectiveAccountType =
            data.account_type ?? accountDetails?.account_type;
          if (
            effectiveStatus === 'Open' &&
            effectiveAccountType !== 'Cash Account'
          ) {
            // Task #266: only re-trigger account-notice generation when the
            // save actually warrants it. Previously every edit-and-save of a
            // Project/Retention Trust Account re-fired the trigger and (with
            // no idempotency in notices.service.ts) produced duplicate
            // S18B/TA1 rows — see the project 1006 incident.
            //
            // Decision matrix:
            //   - first time the account goes to 'Open' (`justBecameOpen`)
            //       → trigger (regular initial notice generation).
            //   - already 'Open' AND notice-content-affecting fields changed
            //       → soft-delete stale unsent notices, then trigger
            //         (regeneration with up-to-date content).
            //   - already 'Open' AND no content change
            //       → skip trigger entirely (the duplicate-bug fix).
            const justBecameOpen =
              !accountDetails || accountDetails.status !== 'Open';
            const beforeFingerprint = accountDetails
              ? this.getNoticeContentFingerprint(accountDetails)
              : '';
            const afterFingerprint = this.getNoticeContentFingerprint({
              ...accountDetails,
              ...data,
            });
            const contentChanged =
              !!accountDetails && beforeFingerprint !== afterFingerprint;
            const shouldTrigger = justBecameOpen || contentChanged;

            this.logger.log(
              `[NOTICE_TRIGGER_GATE] bank_account_id=${bank_account_id} just_became_open=${justBecameOpen} content_changed=${contentChanged} should_trigger=${shouldTrigger}`,
            );

            // Task #238 — rename auto-trigger detection. If the *only*
            // notice-content-affecting field that changed is
            // `account_name`, AND a Sent S18B (PTA) or Sent TA1 (PTA
            // or RTA) already exists for this account, we fire the
            // TA2-Renamed + Contracting Party Account Closing notice
            // set in addition to (or instead of) the regular
            // S18B/TA1 regeneration. We persist `closing_mode='Renamed'`,
            // the previous account name, and today's date so the
            // generator branches can render the BEFORE/AFTER section.
            // Already-Sent S18B/TA1 are NOT soft-deleted.
            const renameOnlyDetected = (() => {
              if (!contentChanged || !accountDetails) return false;
              const before = { ...accountDetails, account_name: '' };
              const after = { ...accountDetails, ...data, account_name: '' };
              const sameApartFromName =
                this.getNoticeContentFingerprint(before) ===
                this.getNoticeContentFingerprint(after);
              const nameChanged =
                (accountDetails.account_name ?? '') !==
                (data.account_name ?? accountDetails.account_name ?? '');
              return sameApartFromName && nameChanged;
            })();
            let renameClosingShouldFire = false;
            if (renameOnlyDetected) {
              const repo =
                transactionalEntityManager.getRepository(NoticeDetails);
              // Task #238 — the rename auto-trigger must fire when an
              // S18B/TA1 exists in *any* status except the unsent /
              // deleted set. Restricting to 'Sent' alone misses valid
              // delegated/onboarded states such as 'Sent - Onboarded'
              // and 'Sending'.
              const renameGateExcludedStatuses = [
                'Not Sent',
                'Draft',
                'Sending',
                'Sent - Notice Attachment Failed',
                'Delete-Unsent',
                'Delete-Sent',
              ];
              const sentExisting = await repo.findOne({
                where: {
                  bank_account_id,
                  notice_type: In([
                    'Client S18B Project Trust Account Notice',
                    'QBCC TA1 Project Trust Account Notice',
                    'QBCC TA1 Retention Trust Account Notice',
                  ]) as any,
                  status: Not(In(renameGateExcludedStatuses)) as any,
                },
              });
              if (sentExisting) {
                renameClosingShouldFire = true;
                await transactionalEntityManager
                  .getRepository(BankAccounts)
                  .update(
                    { bank_account_id },
                    {
                      closing_mode: 'Renamed',
                      closing_previous_account_name:
                        accountDetails.account_name,
                      closing_effective_date: moment
                        .tz('UTC')
                        .startOf('day')
                        .toDate(),
                    } as any,
                  );
                this.logger.log(
                  `[NOTICE_TRIGGER_GATE] rename-only auto-trigger bank_account_id=${bank_account_id} sent_notice_id=${sentExisting.notice_id} previous_name='${accountDetails.account_name}' new_name='${data.account_name}' — will fire TA2-Renamed + Contracting Party Account Closing notices.`,
                );
              } else {
                this.logger.log(
                  `[NOTICE_TRIGGER_GATE] rename-only detected for bank_account_id=${bank_account_id} but no Sent S18B/TA1 exists — skipping closing auto-trigger.`,
                );
              }
            }

            if (shouldTrigger) {
              // When content changed (but the account was already Open), the
              // existing in-flight unsent notices are stale — soft-delete
              // them so the downstream idempotency check inside
              // `handleTriggerAccountNotices` will allow fresh ones to be
              // generated. Already-Sent notices are NOT touched (legal
              // audit trail). If a Sent notice exists for a type whose
              // contents changed, the idempotency check will currently
              // block the new amendment — that's intentional for now and
              // logged below; surfacing an explicit "send amendment"
              // action to the user is a follow-up.
              if (contentChanged && !justBecameOpen) {
                const noticeTypesToCheck = [
                  'Client S18B Project Trust Account Notice',
                  'QBCC TA1 Project Trust Account Notice',
                  'QBCC TA1 Retention Trust Account Notice',
                ];
                const repo =
                  transactionalEntityManager.getRepository(NoticeDetails);
                const existing = await repo.find({
                  where: {
                    bank_account_id,
                    notice_type: In(noticeTypesToCheck) as any,
                    status: Not(In(['Delete-Unsent', 'Delete-Sent'])),
                  },
                });
                const unsentStatuses = [
                  'Not Sent',
                  'Draft',
                  'Sending',
                  'Sent - Notice Attachment Failed',
                ];
                const toSoftDelete = existing.filter((n) =>
                  unsentStatuses.includes(n.status as any),
                );
                const sentBlocking = existing.filter(
                  (n) => !unsentStatuses.includes(n.status as any),
                );
                if (toSoftDelete.length) {
                  await repo
                    .createQueryBuilder()
                    .update(NoticeDetails)
                    .set({
                      status: 'Delete-Unsent' as any,
                      updated_by: decoded?.userId,
                      updated_on: moment.tz('UTC').toDate(),
                    })
                    .whereInIds(toSoftDelete.map((n) => n.id))
                    .execute();
                  this.logger.log(
                    `[NOTICE_TRIGGER_GATE] soft-deleted ${toSoftDelete.length} stale unsent notice(s) for bank_account_id=${bank_account_id} types=${toSoftDelete.map((n) => n.notice_type).join(',')}`,
                  );
                }
                if (sentBlocking.length) {
                  this.logger.warn(
                    `[NOTICE_TRIGGER_GATE] content changed but ${sentBlocking.length} already-Sent notice(s) remain for bank_account_id=${bank_account_id} (types=${sentBlocking.map((n) => n.notice_type).join(',')}); idempotency will block fresh notice creation — manual amendment required.`,
                  );
                }
              }

              notices = await this.noticeService.handleTriggerAccountNotices(
                decoded,
                {
                  bank_account_id: bank_account_id,
                  mark_notices_as_sent: markNoticesAsSent,
                },
                transactionalEntityManager,
              );

              if (notices?.status === 'ERROR') {
                throw new Error('Notice generation failed');
              }
            }

            // Task #238 — fire closing-notice set for the rename path.
            // Runs after the regular trigger so any sniffer state is
            // independent. Errors here roll back the whole edit txn.
            if (renameClosingShouldFire) {
              const closingNotices =
                await this.noticeService.handleTriggerAccountNotices(
                  decoded,
                  {
                    bank_account_id: bank_account_id,
                    mark_notices_as_sent: markNoticesAsSent,
                    closing_trigger: true,
                  },
                  transactionalEntityManager,
                );
              if (closingNotices?.status === 'ERROR') {
                throw new Error(
                  'Rename-auto-trigger closing notice generation failed',
                );
              }
            }
          }
          return {
            notices,
          };
        });

      const details_for_compli_trigger =
        await this.fetchBankAccountDetailsforCompliance([data.bank_account_id]);

      if (details_for_compli_trigger) {
        for (const account of details_for_compli_trigger) {
          if (account.project_ids.length) {
            const oldProjectIds =
              account.project_ids.split(',').map((id) => Number(id.trim())) ||
              [];
            const payloadProjectIds = data.project_ids;

            const allProjectIds = Array.from(
              new Set([...oldProjectIds, ...payloadProjectIds]),
            );

            if (
              account.account_type === 'Project Trust Account' ||
              account.account_type === 'Retention Trust Account'
            ) {
              for (const projectId of allProjectIds) {
                this.logger.log('projectId: ' + projectId);
                this.complianceService.fetchComplianceResultsOfAProject({
                  project_id: projectId,
                  bank_account_type: account.account_type,
                  failedFilter: false,
                });
                // Task #297: invalidate the persisted compliance cache.
                await this.complianceService.markComplianceDirty(
                  projectId,
                  'bank_account.update',
                );
              }
            }
          }
        }
      }

      //Generating bank account link to view added bank account.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[12]}` +
        `${bank_account_id}/` +
        `${accountDetails.company_id}` +
        `?from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a bank account is added.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 67,
        admin_id:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.admin_id
            : null,
        to_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.userId
            : null,
        from_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? null
            : decoded?.userId,
        company_id: accountDetails.company_id,
        dynamic_values: {
          bankAccountName: data.account_name,
          bankAccountLink,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      // console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      if (
        accountDetails.account_type === 'Retention Trust Account' &&
        accountDetails.project_ids
      ) {
        const oldProjectIds = accountDetails.project_ids;
        const projectIdsSet = new Set(data.project_ids);
        const removedProjectIds =
          oldProjectIds.filter((id) => !projectIdsSet.has(Number(id))) || [];
        const removedProjectsCount =
          removedProjectIds && removedProjectIds[0] !== null
            ? removedProjectIds.length
            : 0;
        const oldProjectsCount =
          oldProjectIds && oldProjectIds[0] !== null ? oldProjectIds.length : 0;
        const newProjectsCount =
          data.project_ids && data.project_ids[0] !== null
            ? data.project_ids.length
            : 0;
        if (newProjectsCount > oldProjectsCount - removedProjectsCount) {
          const createActivityLogInput1: CreateActivityLogInput = {
            event_template_id: 72,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: accountDetails.company_id,
            dynamic_values: {
              bankAccountName: data.account_name,
              bankAccountLink,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          // console.log('createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput1,
          );
        }
        if (removedProjectsCount > 0) {
          await this.noticesRepo
            .createQueryBuilder()
            .update(NoticeDetails)
            .set({
              status: 'Delete-Unsent',
              updated_by: decoded?.userId,
            })
            .where('bank_account_id = :bank_account_id', { bank_account_id })
            .andWhere(`notice_type = 'QBCC TA1 Retention Trust Account Notice'`)
            .andWhere(`status IN ('Not Sent', 'Sending', 'Sent - Onboarded')`)
            .execute();

          await this.noticesRepo
            .createQueryBuilder()
            .update(NoticeDetails)
            .set({
              status: 'Delete-Sent',
              updated_by: decoded?.userId,
            })
            .where('bank_account_id = :bank_account_id', { bank_account_id })
            .andWhere(`notice_type = 'QBCC TA1 Retention Trust Account Notice'`)
            .andWhere(`status IN ('Sent')`)
            .execute();

          const createActivityLogInput2: CreateActivityLogInput = {
            event_template_id: 73,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: accountDetails.company_id,
            dynamic_values: {
              bankAccountName: data.account_name,
              bankAccountLink,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          // console.log('createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput2,
          );
        }
      }

      if (response.notices?.data?.mails_to_sent.length) {
        for (let i = 0; i < response.notices?.data?.mails_to_sent.length; i++) {
          const mailDetails = response.notices?.data?.mails_to_sent[i];
          const updatePayload = response.notices?.data?.update_notice_inputs[i];

          // 1. SEND THE MAIL
          await this.emailQueueProducer.emailQueueProducer({
            ...mailDetails,
            mail_type: EmailTypeEnum.notice,
          });

          // 2. UPDATE THE NOTICE
          await this.noticeService.handleUpdateNotice(decoded, updatePayload);
        }
      }

      return {
        warning: false,
        successMessage: `Details of a bank account with id: ${bank_account_id} has edited successfully.`,
        data: {
          notices: {
            notice_previews: response?.notices?.data?.notice_previews ?? [],
            qbcc_notice_previews: response?.notices?.data?.qbcc_notice_previews ?? [],
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Errored while editing the details of a bank account with message: ${error?.error ? error?.error : error}`,
      );
      const errMsg = await handleError(error);

      throw errMsg;
    }
  }

  /**
   * Task #238 — explicit user-driven close/transfer of a Project or
   * Retention Trust account. Persists the closing context onto the
   * `bank_accounts` row, flips the status, and fires the QBCC TA2 +
   * per-beneficiary Contracting Party Account Closing notice set in
   * the same transaction. Any failure (validation, persistence, or
   * notice generation) rolls back the whole operation.
   *
   * 'Renamed' mode is reserved for the internal rename-auto-trigger
   * path in `editDetailsOfABankAccount` and is rejected here.
   */
  async closeOrChangeBankAccount(
    decoded,
    payload: CloseOrChangeBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling close/change bank account: ${JSON.stringify(payload)}`,
      );
      const {
        bank_account_id,
        closing_mode,
        closing_effective_date,
        closing_target_account_name,
        closing_target_financial_institution,
        closing_target_bsb,
        closing_target_account_number,
        closing_target_opening_date,
        mark_notices_as_sent,
      } = payload;

      if (!bank_account_id) {
        return { warning: true, warningMessage: 'bank_account_id is required.' };
      }
      if (closing_mode !== 'Closed' && closing_mode !== 'Transferred') {
        return {
          warning: true,
          warningMessage:
            "closing_mode must be 'Closed' or 'Transferred'. 'Renamed' is reserved for internal use.",
        };
      }
      // Task #260 — wire-level BSB shape guard. `closing_target_bsb`
      // is a 6-digit string column; reject malformed input up-front so
      // a bad client doesn't silently get its leading zeros stripped.
      if (
        closing_target_bsb !== undefined &&
        closing_target_bsb !== null &&
        closing_target_bsb !== ''
      ) {
        if (!/^\d{6}$/.test(String(closing_target_bsb))) {
          return {
            warning: true,
            warningMessage: `closing_target_bsb must be exactly 6 digits (received "${closing_target_bsb}").`,
          };
        }
      }
      // Task #244 — the 'Transferred' path has moved to the dedicated
      // Trust Account Transfer wizard (`startTrustAccountTransfer` →
      // `confirmTrustAccountTransfer`). This mutation now refuses
      // Transferred mode so callers cannot bypass the preflight +
      // payment-match gates. The enum value is preserved for
      // back-compat with cached frontends.
      if (closing_mode === 'Transferred') {
        return {
          warning: true,
          warningMessage:
            "Use the Trust Account Transfer wizard (startTrustAccountTransfer / confirmTrustAccountTransfer) instead of this mutation. The legacy 'Transferred' path here is no longer supported.",
        };
      }
      if (!closing_effective_date) {
        return {
          warning: true,
          warningMessage: 'closing_effective_date is required.',
        };
      }

      const account = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
      });
      if (!account) {
        return { warning: true, warningMessage: 'Bank account not found.' };
      }
      // Task #238 — tenant scoping. The caller's JWT must belong to the
      // same company that owns this bank account. ADMIN impersonation is
      // permitted (matches the rest of this service).
      const callerCompanyId = decoded?.companyId ?? null;
      const isAdmin = decoded?.logged_in_by === 'ADMIN';
      if (
        !isAdmin &&
        (!callerCompanyId || Number(callerCompanyId) !== Number(account.company_id))
      ) {
        this.logger.warn(
          `closeOrChangeBankAccount: tenant mismatch — caller company=${callerCompanyId}, account company=${account.company_id}, bank_account_id=${bank_account_id}`,
        );
        return {
          warning: true,
          warningMessage: 'You are not authorized to close or change this bank account.',
        };
      }
      if (
        account.account_type !== 'Project Trust Account' &&
        account.account_type !== 'Retention Trust Account'
      ) {
        return {
          warning: true,
          warningMessage:
            'Close/change is only available for Project Trust Account or Retention Trust Account.',
        };
      }
      if (account.status !== 'Open') {
        return {
          warning: true,
          warningMessage: `Cannot close/transfer a bank account in status '${account.status}'. Only 'Open' accounts are eligible.`,
        };
      }
      // Task #244 — strict Close preflight. Refuse Close unless:
      //   * current_balance is zero (±0.005),
      //   * no in-flight (non-settled) payments reference this account,
      //   * no open payment claims on contracts pointing at this account,
      //   * no Retained retention rows whose parent payment is on this RTA.
      // Each failed check is surfaced individually so the user knows
      // exactly what to fix before retrying.
      {
        const closeBlockers: string[] = [];
        const balance = Number(account.current_balance ?? 0);
        if (Math.abs(balance) > 0.005) {
          closeBlockers.push(
            `Current balance is ${balance.toFixed(2)} — must be 0.00 before closing.`,
          );
        }
        const inFlight = await this.paymentsRepo
          .createQueryBuilder('p')
          .where(
            `(p.payment_from_account = :bid OR p.payment_to_account = :bid OR p.retention_account = :bid)`,
            { bid: bank_account_id },
          )
          .andWhere(`p.current_status NOT IN (:...settled)`, {
            settled: [
              'Confirmed - Matched',
              'Reconciled',
              'Deleted',
              'Completed',
            ],
          })
          .getCount();
        if (inFlight > 0) {
          closeBlockers.push(
            `${inFlight} in-flight payment(s) reference this account — settle, delete, or transfer them before closing.`,
          );
        }
        const openClaims = await this.entityManager.query(
          `SELECT COUNT(*)::int AS count
           FROM payment_claims pc
           JOIN contract_details ct ON ct.contract_id = pc.contract_id
           WHERE (ct.payment_from_account = $1 OR ct.payment_to_account = $1 OR ct.retention_from_account = $1)
             AND pc.status NOT IN ('Completed','Deleted','Paid','Archived')`,
          [bank_account_id],
        );
        if (Number(openClaims?.[0]?.count ?? 0) > 0) {
          closeBlockers.push(
            `${openClaims[0].count} open payment claim(s) on contracts pointing at this account.`,
          );
        }
        if (account.account_type === 'Retention Trust Account') {
          const openRetention = await this.entityManager.query(
            `SELECT COUNT(*)::int AS count
             FROM retention_details rd
             JOIN payment_details pd ON pd.payment_id = rd.payment_id
             WHERE pd.retention_account = $1 AND rd.retention_status = 'Retained'`,
            [bank_account_id],
          );
          if (Number(openRetention?.[0]?.count ?? 0) > 0) {
            closeBlockers.push(
              `${openRetention[0].count} Retained retention row(s) on this RTA — release or migrate before closing.`,
            );
          }
        }
        // Task #244 — strict Close also requires the imported bank
        // statement to be fully cleared. Any transaction row in
        // status 'To Review' or 'Unmatched' blocks Close.
        const unreconciledRows = await this.entityManager.query(
          `SELECT COUNT(*)::int AS count
           FROM transactions
           WHERE bank_account_id = $1
             AND status NOT IN ('Matched','Excluded')`,
          [bank_account_id],
        );
        const unreconciledCount = Number(unreconciledRows?.[0]?.count ?? 0);
        if (unreconciledCount > 0) {
          closeBlockers.push(
            `${unreconciledCount} unreconciled bank transaction(s) on this account — match or exclude them before closing.`,
          );
        }
        if (closeBlockers.length) {
          return {
            warning: true,
            warningMessage: `Close preflight failed:\n• ${closeBlockers.join('\n• ')}`,
          };
        }
      }

      const newStatus: BankAccountStatus =
        closing_mode === 'Closed' ? 'Closed' : 'Transferred';

      // Task #238 — activity-log event for the explicit close/transfer
      // action. Reuses the existing Closed/Transferred templates from
      // changeStatusOfBankAccount so the log surface stays consistent.
      const closingEventTemplateId =
        closing_mode === 'Closed' ? 70 : 71;

      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager
            .getRepository(BankAccounts)
            .update(
              { bank_account_id },
              {
                closing_mode,
                closing_effective_date,
                closing_previous_account_name: account.account_name,
                // Task #244 — Transferred mode is now refused above and
                // handled by the Trust Account Transfer wizard, so the
                // closing_target_* snapshot here is always null on
                // Close. The wizard's cutover writes these fields
                // directly when it flips the source to 'Transferred'.
                closing_target_account_name: null,
                closing_target_financial_institution: null,
                closing_target_bsb: null,
                closing_target_account_number: null,
                closing_target_opening_date: null,
                status: newStatus,
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC').toDate(),
              } as any,
            );

          const notices =
            await this.noticeService.handleTriggerAccountNotices(
              decoded,
              {
                bank_account_id,
                mark_notices_as_sent,
                closing_trigger: true,
              },
              transactionalEntityManager,
            );
          if (notices?.status === 'ERROR') {
            throw new Error(
              `Closing notice generation failed: ${notices.message}`,
            );
          }

          // Task #238 — write a dedicated activity-log entry for the
          // close/transfer action inside the same transaction.
          try {
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: closingEventTemplateId,
              admin_id:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.admin_id
                  : null,
              to_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.userId
                  : null,
              from_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? null
                  : decoded?.userId,
              company_id: account.company_id,
              dynamic_values: {
                bankAccountName: account.account_name,
                bankAccountLink: `/user/bank-accounts/edit/${bank_account_id}`,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          } catch (logErr) {
            this.logger.warn(
              `closeOrChangeBankAccount: activity log insert failed (non-fatal): ${logErr?.message}`,
            );
          }

          return { notices };
        },
      );

      return {
        successMessage:
          closing_mode === 'Closed'
            ? 'Account closed and TA2 / Contracting Party Account Closing notices generated.'
            : 'Account transferred and TA2 / Contracting Party Account Closing notices generated.',
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Errored in closeOrChangeBankAccount: ${error?.message ? error.message : error}`,
      );
      throw error;
    }
  }

  async getBankDetails(bank_account_id: number) {
    return await this.bankAccountsRepo.findOne({
      where: { bank_account_id },
    });
  }

  async changeStatusOfBankAccount(
    decoded,
    payload: ChangeStatusOfBankAccountInput,
    userId?: number,
  ) {
    try {
      this.logger.log(
        `Handling request for changing the status of bank account with data: ${JSON.stringify(payload)}`,
      );

      const data =
        await this.bankAccountsValidator.validateChangeStatusOfABankAccount(
          payload,
        );

      if (data.status === 'Archived') throw `Invalid status.`;

      //Notices should be sent if the account is Closed or Deleted.

      const { bank_account_id, status } = data;
      const bankAccountDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
        select: [
          'status',
          'account_type',
          'company_id',
          'account_name',
          'bank_account_id',
          'id',
        ],
      });

      if (
        bankAccountDetails &&
        bankAccountDetails?.status === 'Draft' &&
        payload.status === 'Open' &&
        ['Project Trust Account', 'Retention Trust Account'].includes(
          bankAccountDetails?.account_type,
        )
      ) {
        const getCount = await this.fetchAllBankAccounts({
          company_id: bankAccountDetails?.company_id,
          status: 'Open',
          account_type: 'Retention Trust Account, Project Trust Account',
          page: 1,
          items_per_page: 10,
        });
        this.logger.log('getCount: ' + JSON.stringify(getCount));

        const subscriptionDetails =
          await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
            bankAccountDetails?.company_id,
          );
        const subscriptionItem =
          subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Trusts',
            )
            : [];

        if (
          !subscriptionDetails?.is_free_plan_eligible && // true  -> false
          (!subscriptionItem ||
            (subscriptionItem &&
              subscriptionItem?.length > 0 &&
              !subscriptionItem[0]?.is_unlimited &&
              (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                  getCount &&
                  getCount?.data?.total_count &&
                  getCount?.data?.total_count >=
                  subscriptionItem[0]?.limit_value))))
        ) {
          return {
            warning: true,
            warningMessage: `Trust cannot be made active. Please upgrade your subscription plan.`,
          };
        }
      }

      if (
        bankAccountDetails.account_type == 'Cash Account' &&
        data.status == 'Draft'
      ) {
        throw `Invalid input. General accounts can't be changed to draft.`;
      } else {
        await this.bankAccountsRepo
          .createQueryBuilder()
          .update(BankAccounts)
          .set({
            status,
            previous_status: bankAccountDetails.status,
            updated_by: userId,
          })
          .where('bank_account_id = :bank_account_id', { bank_account_id })
          .andWhere('added_by_client_supplier = :added_by_client_supplier', {
            added_by_client_supplier: false,
          })
          .execute();
        this.logger.log(`Status of bank account changed successfully.`);
        if (data.status === 'Deleted') {
          const notices = await this.noticesRepo.find({
            where: { bank_account_id: bank_account_id },
          });

          if (notices && notices.length > 0) {
            notices.forEach((notice) => {
              notice.status =
                notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';
              notice.updated_by = userId;
              notice.updated_on = moment().tz('UTC');
              notice.updated_group = 'USER';
            });
            await this.noticesRepo.save(notices);
          }
        }

        const details_for_compli_trigger =
          await this.fetchBankAccountDetailsforCompliance([
            data.bank_account_id,
          ]);

        if (details_for_compli_trigger) {
          for (const account of details_for_compli_trigger) {
            if (account.project_ids.length) {
              const projectIds =
                account.project_ids.split(',').map((id) => Number(id.trim())) ||
                [];
              if (
                account.account_type === 'Project Trust Account' ||
                account.account_type === 'Retention Trust Account'
              ) {
                for (const projectId of projectIds) {
                  this.logger.log('projectId: ' + projectId);
                  this.complianceService.fetchComplianceResultsOfAProject({
                    project_id: projectId,
                    bank_account_type: account.account_type,
                    failedFilter: false,
                  });
                  // Task #297: invalidate the persisted compliance cache.
                  await this.complianceService.markComplianceDirty(
                    projectId,
                    'bank_account.update',
                  );
                }
              }
            }
          }
        }

        //Generating bank account link to view added bank account.
        const bankAccountLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[12]}` +
          `${bank_account_id}/` +
          `${bankAccountDetails.company_id}` +
          `?from=log`;
        this.logger.log('bankAccountLink: ' + bankAccountLink);

        let eventTemplateId;
        if (data.status === 'Deleted') {
          eventTemplateId = 68;
        } else if (data.status === 'Open') {
          eventTemplateId = 69;
        } else if (data.status === 'Closed') {
          eventTemplateId = 70;
        } else if (data.status === 'Transferred') {
          eventTemplateId = 71;
        }

        //Create activity log as soon a bank account is added.
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: eventTemplateId,
          admin_id:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? decoded?.admin_id
              : null,
          to_user:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? decoded?.userId
              : null,
          from_user:
            decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
              ? null
              : decoded?.userId,
          company_id: bankAccountDetails.company_id,
          dynamic_values: {
            bankAccountName: bankAccountDetails.account_name,
            bankAccountLink,
          },
          is_admin: false,
          created_by: userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }

      return {
        warning: false,
        successMessage: `Status of bank account with id: ${bank_account_id} has been changed successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of bank account with message: ${error?.message ? error?.message : error}`,
      );
      throw error?.message ? error?.message : error;
    }
  }

  async fetchBankAccountDetailsforCompliance(bank_account_ids: number[]) {
    const results = await this.bankAccountsRepo
      .createQueryBuilder('ba')
      .select([
        'ba.bank_account_id AS bank_account_id',
        'ba.account_type AS account_type',
        'ba.project_ids AS project_ids',
      ])
      .where('ba.bank_account_id IN (:...bank_account_ids)', {
        bank_account_ids,
      })
      .andWhere('ba.added_by_client_supplier = false')
      .getRawMany();

    return results.map((row) => ({
      bank_account_id: row.bank_account_id,
      account_type: row.account_type,
      project_ids: row.project_ids || [],
    }));
  }

  async fetchBankAccountDetails(data: FetchBankAccountDetailsInput) {
    try {
      this.logger.log(
        `Handling request for fetching the details of bank account with data: ${JSON.stringify(data)}`,
      );

      //The current interest status based on the sum of all interests received, withdrawn and charges applied and topped up along with the last withdrawal date.
      const { bank_account_id, company_id } = data;
      const bank_account_details = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_name AS account_name',
          'ba.bank_account_id AS bank_account_id',
          'ba.account_type AS account_type',
          'ba.financial_institution AS financial_institution',
          'ba.status AS status',
          'ba.opening_date AS opening_date',
          'ba.previous_status AS previous_status',
          'ba.current_balance AS current_balance',
          'ba.created_on AS created_on',
          'ba.updated_on AS updated_on',
          'ba.last_updated_type AS last_updated_type',
          'ba.account_number AS account_number',
          'ba.bsb_number AS bsb_number',
          'ba.apca_number AS apca_number',
          'ba.last_updated_type AS last_updated_type',
          'ba.associated_cash_account_id AS associated_cash_account_id',
        ])
        .where('ba.bank_account_id = :bank_account_id', { bank_account_id })
        .andWhere('ba.company_id = :company_id', { company_id })
        .andWhere('ba.added_by_client_supplier = :added_by_client_supplier', {
          added_by_client_supplier: false,
        })
        .getRawOne();

      if (!bank_account_details)
        throw new Error(`Bank account not found. Please provide a valid one.`);
      this.logger.log(`Bank account details fetched successfully.`);

      bank_account_details.created_on = new Date(
        bank_account_details.created_on,
      );

      bank_account_details.interest_charges_sum =
        await this.calculateInterestChargesSum(bank_account_id);

      bank_account_details.bsb_number = padBsb6(
        bank_account_details.bsb_number,
      );

      return framedResponse(
        'SUCCESS',
        `Bank account details fetched successfully.`,
        bank_account_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the bank account details with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async calculateInterestChargesSum(bank_account_id: number): Promise<number> {
    const result = await this.paymentsRepo
      .createQueryBuilder('payments')
      .select(
        `SUM( CASE WHEN payment.amount IS NOT NULL THEN payment.amount::numeric ELSE 0::numeric END ) AS interest_charges_sum`,
      )
      .addSelect(
        `CASE
          WHEN payments.payment_type IN ('Interest Received', 'Bank Charge Top Up') THEN payments.payment_to_account
          WHEN payments.payment_type IN ('Bank Charge Applied', 'Interest Withdrawal') THEN payments.payment_from_account
          ELSE NULL
        END AS bank_account_id`,
      )
      .leftJoin(
        'payments.subPayments',
        'payment',
        `payment.sub_payment_type = 'Payment'`,
      )
      .where(
        `payments.current_status IN ('Unconfirmed - Matched','Paid - Matched','Received - Matched','Paid - Unmatched','Received - Unmatched') 
          AND payments.payment_type IN ('Interest Received', 'Bank Charge Top Up', 'Bank Charge Applied', 'Interest Withdrawal')`,
      )
      .groupBy('bank_account_id')
      .having(
        `CASE
            WHEN payments.payment_type IN ('Interest Received', 'Bank Charge Top Up') THEN payments.payment_to_account
            WHEN payments.payment_type IN ('Bank Charge Applied', 'Interest Withdrawal') THEN payments.payment_from_account
            ELSE NULL
          END = :bank_account_id`,
        { bank_account_id },
      )
      .getRawOne();
    return result && result.interest_charges_sum
      ? result.interest_charges_sum
      : 0;
  }

  async fetchBankAccountDetailsForEditing(data: FetchBankAccountDetailsInput) {
    try {
      this.logger.log(
        `Handling request for fetching the details of bank account for editing with data: ${JSON.stringify(data)}`,
      );

      //The current interest status based on the sum of all interests received, withdrawn and charges will be applied and topped up along wth the last withdrawal date.
      const { bank_account_id, company_id } = data;
      const bank_account_details = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_name AS account_name',
          'ba.bank_account_id AS bank_account_id',
          'ba.account_type AS account_type',
          'ba.financial_institution AS financial_institution',
          'ba.trustee_id AS trustee_id',
          'ba.client_supplier_id AS client_supplier_id',
          'ba.opening_date AS opening_date',
          'ba.project_ids AS project_ids',
          'ba.contract_date AS contract_date',
          'ba.contract_practical_completion_date AS contract_practical_completion_date',
          'ba.first_sub_contract_date AS first_sub_contract_date',
          'ba.contract_value AS contract_value',
          'ba.delegate_powers AS delegate_powers',
          'ba.retention_trust_certificate_attachment_ids AS retention_trust_certificate_attachment_ids',
          'ba.account_number AS account_number',
          'ba.bsb_number AS bsb_number',
          'ba.apca_number AS apca_number',
          'ba.status AS status',
          'ba.previous_status AS previous_status',
          'ba.associated_cash_account_id AS associated_cash_account_id',
        ])
        .where('ba.bank_account_id = :bank_account_id', { bank_account_id })
        .andWhere('ba.company_id = :company_id', { company_id })
        .andWhere('ba.added_by_client_supplier = :added_by_client_supplier', {
          added_by_client_supplier: false,
        })
        .getRawOne();

      if (!bank_account_details)
        throw new Error(`Bank account not found. Please provide a valid one.`);
      this.logger.log(`Bank account details fetched successfully.`);

      if (bank_account_details.project_ids) {
        bank_account_details.project_ids = bank_account_details.project_ids
          .split(',')
          .map((id) => Number(id));
        bank_account_details.retention_trust_certificate_attachment_ids =
          bank_account_details.retention_trust_certificate_attachment_ids
            ? bank_account_details.retention_trust_certificate_attachment_ids.split(
              ',',
            )
            : null;
      }

      bank_account_details.bsb_number = padBsb6(
        bank_account_details.bsb_number,
      );

      return framedResponse(
        'SUCCESS',
        `Bank account details fetched successfully.`,
        bank_account_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the bank account details for editing with message: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  async fetchAllBankAccounts(data: FetchAllBankAccountsInput) {
    try {
      this.logger.log(
        `Handling request for fetching all bank accounts with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        account_type,
        project_id,
        page,
        search,
        status,
        items_per_page,
        sorting_field,
        delegate_powers,
      } = data;

      const account_types_array =
        account_type && account_type.length
          ? account_type.split(', ').map((item) => item.trim())
          : null;
      // console.log('account_types_array', account_types_array);

      const queryBuilder = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.bank_account_id',
          'ba.account_name',
          'ba.bsb_number',
          'ba.apca_number',
          'ba.account_number',
          'ba.account_type',
          'ba.opening_date',
          'ba.created_on',
          'ba.current_balance',
          'ba.previous_status',
          'ba.updated_on',
          'ba.last_updated_type',
          'ba.status',
          'ba.project_ids',
        ])
        .where(`ba.company_id = :company_id`, {
          company_id,
        })
        .andWhere('ba.added_by_client_supplier = :added_by_client_supplier', {
          added_by_client_supplier: false,
        });

      if (search) {
        queryBuilder.andWhere(`(LOWER(ba.account_name) LIKE :search)`, {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (account_types_array && account_types_array.length) {
        queryBuilder.andWhere('ba.account_type IN(:...account_types_array)', {
          account_types_array,
        });
      }

      if (project_id) {
        queryBuilder.andWhere(
          'ba.added_by_client_supplier = :added_by_client_supplier',
          { added_by_client_supplier: false },
        );
        queryBuilder.andWhere(
          ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
          {
            project_id,
          },
        );
      }

      if (status && status === ('Archived' as any)) {
        const archivedStatuses = ['Deleted', 'Closed', 'Transferred'];
        queryBuilder.andWhere('ba.status IN(:...archivedStatuses)', {
          archivedStatuses,
        });
      } else if (status && status != ('Archived' as any)) {
        queryBuilder.andWhere('ba.status = :status', {
          status,
        });
      } else if (!status) {
        const unarchivedStatuses = ['Draft', 'Open', 'Active'];
        queryBuilder.andWhere('ba.status IN(:...unarchivedStatuses)', {
          unarchivedStatuses,
        });
      }

      if (delegate_powers) {
        queryBuilder.andWhere('ba.delegate_powers = :delegate_powers', {
          delegate_powers,
        });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field && !data.is_alphabetical_order) {
        queryBuilder.orderBy({ 'ba.created_on': sorting_order });
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }
      if (
        data.sorting_field &&
        data.sorting_field !== 'projects_count' &&
        data.sorting_field !== 'formatted_bank_account_balance' &&
        data.sorting_field !== 'last_updated_type' &&
        !data.is_alphabetical_order
      ) {
        switch (data.sorting_field) {
          case 'account_name':
            {
              queryBuilder.orderBy({ 'LOWER(ba.account_name)': sorting_order });
            }
            break;
          case 'account_type':
            {
              queryBuilder.orderBy({ 'ba.account_type': sorting_order });
            }
            break;
          case 'created_on':
            {
              queryBuilder.orderBy({ 'ba.created_on': sorting_order });
            }
            break;
          case 'updated_on':
            {
              queryBuilder.orderBy({ 'ba.updated_on': sorting_order });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({ 'ba.status': sorting_order });
            }
            break;
        }
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }

      if (data.is_alphabetical_order) {
        queryBuilder.orderBy({ 'ba.account_name': 'ASC' });
      }

      const [bank_accounts, total_count] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      const extendedBankAccounts: ExtendedBankAccounts[] = await Promise.all(
        bank_accounts.map(async (bank_account) => {
          //Fetch transaction details to find number of days until month end.
          const unmatchedTransactions = await this.transactionsRepo
            .createQueryBuilder('tr')
            .select([
              'tr.txn_amount AS transaction_amount',
              'tr.txn_date AS transaction_date',
              `date_trunc('MONTH', tr.txn_date) + interval '1 MONTH' - interval '1 day' AS month_end_date`,
              `CURRENT_DATE - (date_trunc('MONTH', tr.txn_date) + interval '1 MONTH' - interval '1 day') AS days_difference`,
            ])
            .where('tr.bank_account_id = :bank_account_id', {
              bank_account_id: Number(bank_account.bank_account_id),
            })
            .andWhere('tr.status IN(:...unmatchedStatuses)', {
              unmatchedStatuses: ['To Review', 'Unmatched'],
            })
            .getRawMany();
          // console.log('unmatchedTransactions', unmatchedTransactions);

          let diffInDays;
          if (unmatchedTransactions && unmatchedTransactions.length) {
            // Finding the minimum days difference from current date in the results
            const minDaysDifference = Math.min(
              ...unmatchedTransactions.map((tr) =>
                Math.abs(tr.days_difference.days),
              ),
            );
            // console.log('minDaysDifference', minDaysDifference);

            diffInDays = minDaysDifference;
            // console.log('diffInDays', diffInDays);
          } else {
            diffInDays = 0;
          }

          //Calculate last updated days.
          const today = new Date();
          const differenceInTime =
            today.getTime() - bank_account.updated_on.getTime();
          // console.log('differenceInTime', differenceInTime);
          const differenceInDays = Math.ceil(
            differenceInTime / (1000 * 3600 * 24),
          );
          // console.log('differenceInDays', differenceInDays);

          let cashAssociated = false;
          if (bank_account.account_type == 'Cash Account') {
            const associatedCashAccounts = await this.bankAccountsRepo.findOne({
              where: {
                associated_cash_account_id: bank_account.bank_account_id,
                bank_account_id: Not(bank_account.bank_account_id),
                status: Not('Deleted'),
              },
            });
            if (associatedCashAccounts) {
              cashAssociated = true;
            }
          }

          const extendedBankAccount = {
            ...bank_account,
            bsb_number: padBsb6(bank_account.bsb_number) as any,
            projects_count: bank_account.project_ids
              ? bank_account.project_ids.length
              : 0,
            unmatched_transactions_count: unmatchedTransactions.length,
            remaining_days: diffInDays,
            last_updated_days: differenceInDays < 7 ? differenceInDays : null,
            formatted_bank_account_balance: bank_account.current_balance
              ? await formatCurrencyWithoutDollars(bank_account.current_balance)
              : null,
            is_cash_associated: cashAssociated,
          } as ExtendedBankAccounts;
          return extendedBankAccount;
        }),
      );
      // console.log('extendedBankAccounts', extendedBankAccounts);
      extendedBankAccounts.forEach((bank_account) => {
        bank_account.updated_on = bank_account.updated_on
          ? new Date(bank_account.updated_on)
          : new Date(0);
        bank_account.created_on = bank_account.created_on
          ? new Date(bank_account.created_on)
          : new Date(0);
        bank_account.opening_date = bank_account.opening_date
          ? new Date(bank_account.opening_date)
          : new Date(0);
      });

      let finalResult, finalCount;
      if (sorting_field && sorting_field === 'projects_count') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(extendedBankAccounts).sort(
            (a, b) => a.projects_count - b.projects_count,
          );
        } else {
          sortedResult = Array.from(extendedBankAccounts).sort(
            (a, b) => b.projects_count - a.projects_count,
          );
        }

        const startIndex =
          page && items_per_page ? (page - 1) * items_per_page : 0;
        const endIndex =
          page && items_per_page
            ? Math.min(
              (page - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (
        sorting_field &&
        sorting_field === 'formatted_bank_account_balance'
      ) {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(extendedBankAccounts).sort(
            (a, b) => a.current_balance - b.current_balance,
          );
        } else {
          sortedResult = Array.from(extendedBankAccounts).sort(
            (a, b) => b.current_balance - a.current_balance,
          );
        }

        const startIndex =
          page && items_per_page ? (page - 1) * items_per_page : 0;
        const endIndex =
          page && items_per_page
            ? Math.min(
              (page - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (sorting_field && sorting_field === 'last_updated_type') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(extendedBankAccounts).sort((a, b) =>
            a.last_updated_type
              ?.trim()
              ?.localeCompare(b.last_updated_type?.trim()),
          );
        } else {
          sortedResult = Array.from(extendedBankAccounts).sort((a, b) =>
            b.last_updated_type
              ?.trim()
              ?.localeCompare(a.last_updated_type?.trim()),
          );
        }

        const startIndex =
          page && items_per_page ? (page - 1) * items_per_page : 0;
        const endIndex =
          page && items_per_page
            ? Math.min(
              (page - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = extendedBankAccounts;
        finalCount = total_count;
      }

      // console.log('bankAccounts', bank_accounts, total_count);
      this.logger.log(
        `All bank accounts fetched successfully with data: ${JSON.stringify(bank_accounts)}`,
      );

      return framedResponse(
        'SUCCESS',
        `All bank accounts fetched successfully.`,
        { extendedBankAccounts: finalResult, total_count: finalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async checkExistenceOfBankAccountNumber(
    data: CheckExistenceOfBankAccountNumberInput,
  ) {
    try {
      this.logger.log(
        `Handling request for checking the existence if bank account number with data: ${JSON.stringify(data)}`,
      );

      const bankAccountDetails = await this.bankAccountsRepo.find({
        where: {
          account_number: data.bank_account_number,
          added_by_client_supplier: false,
        },
      });
      const is_present = bankAccountDetails.length ? true : false;

      return framedResponse(
        `SUCCESS`,
        `Existence of bank account number checked successfully.`,
        { is_present },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the existence of bank account number with message: ${error?.message ?? error}`,
      );
      throw new Error(error?.message ?? error);
    }
  }

  async getBankAccountLists(getBankAccountListInput: GetBankAccountListInput) {
    const {
      company_id,
      type,
      project_id,
      client_supplier_id,
      client_supplier_role,
      retention_type,
    } = getBankAccountListInput;

    let payment_from_account = [],
      payment_to_account = [],
      retention_from_account = [];

    const projectDetails = await this.projectDetails
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.project_id AS project_id',
        'p.project_role AS project_role',
        'p.pta_eligibility AS pta_eligibility',
        'p.rta_eligibility AS rta_eligibility',
      ])
      .where('p.company_id = :company_id', { company_id })
      .andWhere('p.project_id = :project_id', { project_id })
      .getRawOne();

    const clientSuppliersDetails = await this.clientSuppliersDetails
      .createQueryBuilder('c')
      .select(['c.id AS id', 'c.related_entity AS related_entity'])
      .where('c.company_id = :company_id', { company_id })
      .andWhere('c.client_supplier_id = :client_supplier_id', {
        client_supplier_id,
      })
      .getRawOne();

    const options = {
      client_supplier_type: type,
      project_role: projectDetails.project_role,
      client_supplier_role: client_supplier_role,
      related_entity: clientSuppliersDetails.related_entity,
      pta_eligibility: projectDetails.pta_eligibility,
    };

    const accountType = await this.getAccountTypesForContract(options);
    // console.log('accountType: ', accountType);
    if (accountType && Object.keys(accountType).length !== 0) {
      // console.log(Object.keys(accountType).length);
      if (type === 'Client') {
        if (
          accountType.payment_to_account &&
          accountType.payment_to_account.length > 0
        ) {
          const queryBuilder = this.bankAccountsRepo
            .createQueryBuilder('b')
            .select([
              'b.id AS id',
              'b.bank_account_id AS bank_account_id',
              'b.account_name AS account_name',
              'b.account_type AS account_type',
            ]);
          if (accountType.payment_to_account.length === 2) {
            // A Project Trust Account is project-scoped (matched via
            // project_ids), NOT owned by the contract's client_supplier. Do
            // not filter the PTA clause by client_supplier_id or the project's
            // PTA is silently excluded, leaving only Cash Accounts selectable.
            queryBuilder.where(
              "((b.project_ids LIKE :project_id AND b.account_type = 'Project Trust Account') OR (b.account_type = 'Cash Account')) AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              {
                project_id: `%${projectDetails.project_id}%`,
                company_id,
              },
            );
          } else {
            if (
              accountType.payment_to_account.includes('Project Trust Account')
            ) {
              queryBuilder.where(
                "b.project_ids LIKE :project_id AND b.account_type = 'Project Trust Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
                {
                  project_id: `%${projectDetails.project_id}%`,
                  company_id,
                },
              );
            } else {
              queryBuilder.where(
                "b.account_type = 'Cash Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
                {
                  company_id,
                },
              );
            }
          }
          payment_to_account = await queryBuilder
            .orderBy({ account_name: 'ASC' })
            .getRawMany();
        }
      } else {
        if (
          accountType.payment_from_account &&
          accountType.payment_from_account.length > 0
        ) {
          const queryBuilder = this.bankAccountsRepo
            .createQueryBuilder('b')
            .select([
              'b.id AS id',
              'b.bank_account_id AS bank_account_id',
              'b.account_name AS account_name',
              'b.account_type AS account_type',
            ]);

          if (
            accountType.payment_from_account.includes('Project Trust Account')
          ) {
            queryBuilder.where(
              "b.project_ids LIKE :project_id AND b.account_type = 'Project Trust Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              {
                project_id: `%${projectDetails.project_id}%`,
                company_id,
              },
            );
          } else {
            queryBuilder.where(
              "b.account_type = 'Cash Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              {
                company_id,
              },
            );
          }

          payment_from_account = await queryBuilder
            .orderBy({ account_name: 'ASC' })
            .getRawMany();
        }

        if (retention_type === 'Cash') {
          const retentionProjectDetails = await this.projectDetails
            .createQueryBuilder('p')
            .select([
              'p.id AS id',
              'p.project_id AS project_id',
              'p.project_role AS project_role',
              'p.pta_eligibility AS pta_eligibility',
              'p.rta_eligibility AS rta_eligibility',
            ])
            .where('p.company_id = :company_id', { company_id })
            .andWhere('p.project_id = :project_id', { project_id })
            .andWhere("p.rta_eligibility = 'Yes'")
            .getRawOne();

          const retentionQueryBuilder = this.bankAccountsRepo
            .createQueryBuilder('b')
            .select([
              'b.id AS id',
              'b.bank_account_id AS bank_account_id',
              'b.account_name AS account_name',
              'b.account_type AS account_type',
            ]);

          if (
            retentionProjectDetails &&
            retentionProjectDetails.project_id &&
            retentionProjectDetails.project_role !== 'Sub Contractor'
          ) {
            retentionQueryBuilder.where(
              "b.project_ids LIKE :project_id AND b.account_type = 'Retention Trust Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              {
                project_id: `%${retentionProjectDetails.project_id}%`,
                company_id,
              },
            );
          } else {
            retentionQueryBuilder.where(
              "b.account_type = 'Cash Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              { company_id },
            );
          }

          retention_from_account = await retentionQueryBuilder
            .orderBy({ account_name: 'ASC' })
            .getRawMany();
        }

        if (
          accountType.payment_to_account &&
          accountType.payment_to_account.length > 0
        ) {
          if (
            accountType.payment_to_account.includes('Project Trust Account')
          ) {
            // The project's PTA is company-owned and project-scoped
            // (added_by_client_supplier = false, matched via project_ids), so
            // it is not returned by the supplier-owned account lookup. Surface
            // it alongside the supplier's own accounts so it can be selected.
            payment_to_account = await this.bankAccountsRepo
              .createQueryBuilder('b')
              .select([
                'b.id AS id',
                'b.bank_account_id AS bank_account_id',
                'b.account_name AS account_name',
                'b.account_type AS account_type',
              ])
              .where(
                "((b.client_supplier_id = :client_supplier_id AND b.added_by_client_supplier = true AND b.account_type IN (:...selfTypes)) OR (b.account_type = 'Project Trust Account' AND b.project_ids LIKE :project_id AND b.added_by_client_supplier = false AND b.company_id = :company_id)) AND b.status = 'Open'",
                {
                  client_supplier_id,
                  selfTypes: accountType.payment_to_account,
                  project_id: `%${projectDetails.project_id}%`,
                  company_id,
                },
              )
              .orderBy({ account_name: 'ASC' })
              .getRawMany();
          } else {
            payment_to_account = await this.bankAccountsRepo.find({
              where: {
                client_supplier_id,
                added_by_client_supplier: true,
                account_type: In(accountType.payment_to_account),
              },
              select: ['id', 'bank_account_id', 'account_name', 'account_type'],
              order: { account_name: 'ASC' },
            });
          }
        }
      }
    }

    const bank_accounts = {
      payment_from_account,
      payment_to_account,
      retention_from_account,
    };
    return bank_accounts;
  }

  async getAccountTypesForContract(options): Promise<any> {
    // console.log('options: ', options);
    const filteredType = contractAccountType.filter((type) => {
      return (
        (options.client_supplier_type === undefined ||
          type.client_supplier_type === options.client_supplier_type) &&
        (options.project_role === undefined ||
          type.project_role === options.project_role) &&
        (options.client_supplier_role === undefined ||
          type.client_supplier_role === options.client_supplier_role) &&
        (!options.related_entity ||
          type.related_entity?.includes(options.related_entity)) &&
        (options.pta_eligibility === undefined ||
          type.pta_eligibility === options.pta_eligibility)
      );
    });
    // console.log('filteredType: ', filteredType);
    if (filteredType.length > 0) {
      return {
        payment_from_account: filteredType[0].payment_from_account,
        payment_to_account: filteredType[0].payment_to_account,
      };
    } else {
      return {
        payment_from_account: [],
        payment_to_account: [],
      };
    }
  }

  async updateDelegatePowers(decoded, data: UpdateDelegatePowersInput) {
    try {
      this.logger.log(
        `Handling request for updating delegated powers to the following bank account ids: ${data.account_ids}`,
      );

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          data?.company_id,
        );
      const subscriptionItemForRestriction =
        subscriptionDetails &&
          subscriptionDetails?.plan_items &&
          subscriptionDetails?.plan_items?.length > 0
          ? subscriptionDetails?.plan_items?.filter(
            (item) => item?.item_name === 'Delegate authority',
          )
          : [];
      if (
        !subscriptionDetails?.is_free_plan_eligible && // true  -> false
        (!subscriptionItemForRestriction ||
          (subscriptionItemForRestriction &&
            subscriptionItemForRestriction?.length > 0 &&
            subscriptionItemForRestriction[0]?.limit_value != 'true'))
      ) {
        return {
          warning: true,
          warningMessage: `Trust cannot have delegate authority. Please upgrade your subscription plan.`,
        };
      }

      const response = await this.bankAccountsRepo
        .createQueryBuilder()
        .update(BankAccounts)
        .set({
          delegate_powers: 'Yes',
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
        })
        .where('bank_account_id IN (:...account_ids)', {
          account_ids: data.account_ids,
        })
        .andWhere('company_id = :company_id', {
          company_id: data.company_id,
        })
        .andWhere(`delegate_powers = 'No'`)
        .execute();

      this.logger.log('response.affected: ' + response.affected);

      const details_for_compli_trigger =
        await this.fetchBankAccountDetailsforCompliance(data.account_ids);

      if (details_for_compli_trigger) {
        for (const account of details_for_compli_trigger) {
          const projectIds: number[] = account.project_ids || [];
          if (
            account.account_type === 'Project Trust Account' ||
            'Retention Trust Account'
          ) {
            const isPTA = account.account_type === 'Project Trust Account';
            for (const projectId of projectIds) {
              await this.complianceService.syncCompliancesOfProject(
                projectId,
                4,
                isPTA,
              );
            }
          }
        }
      }

      this.logger.log(
        `Status of delegated powers updated for the bank accounts successfully.`,
      );
      return {
        warning: false,
        successMessage: `Delegated powers updated for ${response?.affected} bank account(s) successfully.`,
      };
    } catch (error) {
      this.logger.error(
        `Errored while updating delegated powers for the bank accounts with message: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }
}
