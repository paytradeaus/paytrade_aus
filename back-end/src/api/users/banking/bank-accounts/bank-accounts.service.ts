import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccounts } from 'src/entities/banking.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { EntityManager, ILike, In, Not, Repository } from 'typeorm';
import {
  AddBankAccountInput,
  ChangeStatusOfBankAccountInput,
  CheckExistenceOfBankAccountNumberInput,
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

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

// Australian BSBs are always 6 digits. The `bsb_number` column is numeric so
// any leading zero is stripped on write (e.g. NAB BSB "084004" stored as 84004,
// commonly arriving via the Xero → PT bank-account sync). Zero-pad on read so
// the frontend always receives the canonical 6-digit value and its
// "must be 6 digits" validator passes on save.
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
  ) {
    this.logger = new PaytradeLogger('BANK_ACCOUNTS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
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
                mark_notices_as_sent: !!data?.mark_notices_as_sent,
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
          if (data.status === 'Open' && data.account_type !== 'Cash Account') {
            notices = await this.noticeService.handleTriggerAccountNotices(
              decoded,
              {
                bank_account_id: bank_account_id,
                mark_notices_as_sent: !!data?.mark_notices_as_sent,
              },
              transactionalEntityManager,
            );

            if (notices?.status === 'ERROR') {
              throw new Error('Notice generation failed');
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
            queryBuilder.where(
              "((b.project_ids LIKE :project_id AND b.client_supplier_id = :client_supplier_id AND b.account_type = 'Project Trust Account') OR (b.account_type = 'Cash Account')) AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
              {
                project_id: `%${projectDetails.project_id}%`,
                client_supplier_id,
                company_id,
              },
            );
          } else {
            if (
              accountType.payment_to_account.includes('Project Trust Account')
            ) {
              console;
              queryBuilder.where(
                "b.project_ids LIKE :project_id AND b.client_supplier_id = :client_supplier_id AND b.account_type = 'Project Trust Account' AND b.status = 'Open' AND b.added_by_client_supplier = false AND b.company_id = :company_id",
                {
                  project_id: `%${projectDetails.project_id}%`,
                  client_supplier_id,
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
