import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, EntityManager, In, ILike, Not } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import {
  FetchAllUnsentNoticesOfACompanyInput,
  FetchDetailsOfANoticeInput,
  fetchNoticeMailInput,
  GenerateMailForANoticeInput,
  generateNoticeInput,
  ListAllDelegatesInput,
  ListAllMailsofANoticesInput,
  ListAllNoticesInput,
  SentMailForANoticeInput,
  SentMailForMultipleNoticesInput,
  triggerAccountNoticesInput,
  triggerAuditNoticesInput,
  triggerContractNoticesInput,
  triggerPaymentClaimNoticesInput,
  triggerPaymentNoticesInput,
  updateNoticesInput,
  updateNoticesMailInput,
} from './notices.input';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { NoticeMail } from 'src/entities/notice-mail.enitity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import {
  generateNoticeMailResponse,
  generateNoticeResponse,
  listAllNoticesResponse,
  triggerNoticesResponse,
} from './notices.response';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { NoticeGenDocService } from './notice-gen-doc.service';
import { paytradeLogo, qbccLogo } from './doc-images-base64';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { generatePaymentClaimLink } from '../banking/payment-claims/payment-claims.activity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompliancesService } from '../compliances/compliances.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { NoticesValidator } from './notices.validator';
import { StatusService } from '../banking/ui-status.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
const axios = require('axios');
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class NoticesService {
  private logger: PaytradeLogger;
  constructor(
    private readonly noticessValidator: NoticesValidator,
    private readonly jwtInternalService: JwtInternalService,
    private readonly complianceService: CompliancesService,
    private readonly statusService: StatusService,
    private activityLogService: ActivityLogService,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(FinancialInstitutionsDetails)
    private bankDetails: Repository<FinancialInstitutionsDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(NoticeMail)
    private noticeMailRepo: Repository<NoticeMail>,
    @InjectRepository(SubscriptionDetails)
    private companySubscriptionPlan: Repository<SubscriptionDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(FileAttachments)
    private readonly fileAttachments: Repository<FileAttachments>,
    @InjectRepository(PaymentClaims)
    private readonly paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(AuditReport)
    private readonly auditRepo: Repository<AuditReport>,
    @InjectRepository(PaymentDetails)
    private readonly paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(RetentionDetails)
    private readonly retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(SubPayments)
    private readonly subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(ClientSuppliersDetails)
    private readonly clientSupplierRepo: Repository<ClientSuppliersDetails>,
    @InjectRepository(PaymentClaimInvoices)
    private readonly claimInvoiceRepo: Repository<PaymentClaimInvoices>,
    @InjectRepository(CompanyUserRoles)
    private readonly companyUserRolesRepo: Repository<CompanyUserRoles>,
    private entityManager: EntityManager,
    private readonly ptContentService: PtContentsService,
    private readonly emailServices: EmailService,
    private readonly genDocNoticeServices: NoticeGenDocService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('PAYMENTS_SERVICE');
  }

  private async addFileBase64FromStorage(
    filePath: string | null,
    file_type: string | null,
  ): Promise<string | null> {
    if (!filePath || !file_type) {
      return null;
    }
    try {
      const fileBuffer = await this.objectStorageService.downloadFile(filePath);
      if (fileBuffer) {
        return `data:${file_type};base64,${fileBuffer.toString('base64')}`;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to read file from storage: ${error.message}`);
      return null;
    }
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async fetchModeOfAnUser(
    user_id: number,
    manager?: EntityManager,
  ): Promise<string | null> {
    try {
      this.logger.log(
        `Request received for fetching the mode of a user with id: ${user_id}`,
      );

      const userDetails = await this.userDetails.findOne({
        where: { user_id },
        select: ['user_id', 'user_mode'],
      });

      return userDetails?.user_mode ?? null;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the mode of a user with message: ${error.message}`,
      );
      throw error;
    }
  }

  async generateNotice(
    data: generateNoticeInput,
    userId?: number,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for creating a new notice with data: ${JSON.stringify(data)}`,
      );

      const noticeRepo = manager
        ? manager.getRepository(NoticeDetails)
        : this.noticesRepo;

      const newNotice = await noticeRepo.create({
        ...data,
        ...{ created_by: userId },
      });

      const noticeDetails = await noticeRepo.save(newNotice);
      noticeDetails.notice_id = Number(noticeDetails.notice_id) + 100000;

      let response_message = 'Notice generated successfully.';

      if (data.is_recieved_notice === true) {
        noticeDetails.status = 'Received';
        await noticeRepo.save(noticeDetails);
        response_message = 'Notice uploaded successfully.';
      }

      const savedNoticeDetails = await noticeRepo.save(noticeDetails);

      this.logger.log(
        `Notice generated successfully with id: ${savedNoticeDetails.notice_id}`,
      );

      return await framedResponse('SUCCESS', response_message, {
        notice_id: savedNoticeDetails.notice_id,
        id: savedNoticeDetails.id,
      });
    } catch (error) {
      this.logger.error(
        `Errored while generating a notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleGenerateNotice(
    decoded: any,
    payload: generateNoticeInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for notice trigger with payload: ${JSON.stringify(payload)}`,
      );

      // 1. Validate notice input
      const validatedNoticeDetails =
        await this.noticessValidator.validateCreateNotice(payload, manager);

      this.logger.log(
        `Notice details Validated succesfully and returned details ${JSON.stringify(validatedNoticeDetails.notice_type)}`,
      );

      this.logger.log(`Validated notice details: ${JSON.stringify(validatedNoticeDetails)}`);

      // 3. Generate the notice
      const newNotice = await this.generateNotice(
        validatedNoticeDetails,
        decoded?.userId,
        manager,
      );

      this.logger.log(
        `New notice generated with details : ${JSON.stringify(newNotice.data.notice_id)}`,
      );

      // 4. Trigger compliance check if project-based - uncommment
      if (payload.project_id && newNotice) {
        this.logger.log(
          ` Compliance calc triggered after new notice generation with details: ${JSON.stringify(newNotice.data.notice_id)}`,
        );

        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: payload.project_id,
          bank_account_type: 'Project Trust Account',
          failedFilter: false,
        });

        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: payload.project_id,
          bank_account_type: 'Retention Trust Account',
          failedFilter: false,
        });

        this.logger.log(
          ` Compliance calc success after new notice generation with details: ${JSON.stringify(newNotice.data.notice_id)}`,
        );
      }
      return newNotice;
    } catch (error) {
      this.logger.error(
        `Errored while handling generate notice with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async updateNoticeStatus(
    data: updateNoticesInput,
    userId?: number,
    manager?: EntityManager,
  ) {
    const repo = manager ?? this.entityManager;

    try {
      this.logger.log(
        `Handling request for update notice status with data: ${JSON.stringify(data)}`,
      );

      const notice = await repo.findOne(NoticeDetails, {
        where: { notice_id: data.notice_id },
        relations: ['companyDetails'],
      });

      if (!notice)
        throw `Invalid input. Notice not found. Please provide a valid notice id.`;

      if (data.status === 'Sent') {
        notice.status = 'Sent';

        let notice_mail = null;

        if (data.notice_mail_uuid) {
          notice_mail = await repo.findOne(NoticeMail, {
            where: { id: data?.notice_mail_uuid },
          });
        }

        if (notice_mail) {
          const updatedMail = { ...notice_mail, updated_by: userId };
          updatedMail.mail_sent = true;
          updatedMail.updated_on = moment().toDate();
          await repo.save(NoticeMail, updatedMail);
        } else {
          let noticeData;
          let qbccNotice = false;
          if (
            [
              'QBCC TA4 Part Payment Notice',
              'QBCC TA2 Account Closing Notice',
              'QBCC TA5 Nil Return Notice',
              'QBCC TA1 Project Trust Account Notice',
              'QBCC TA3 Notice Of Related Entities',
              'QBCC TA1 Retention Trust Account Notice',
              'QBCC TA2 Retention Account Closing Notice',
            ].includes(notice.notice_type)
          ) {
            qbccNotice = true;
          }
          if (qbccNotice === true) {
            if (notice.delegated_qbcc === true) {
              noticeData = {
                notice_id: notice.notice_id,
                email_from:
                  'Paytrade Admin ' +
                  'on behalf of ' +
                  notice.companyDetails.company_name,
                email_to: 'QBCC',
                auto_mail: false,
                mail_sent: true,
              };
            } else {
              noticeData = {
                notice_id: notice.notice_id,
                email_from: notice.companyDetails.company_name,
                email_to: 'QBCC',
                auto_mail: false,
                mail_sent: true,
              };
            }
          } else {
            noticeData = {
              notice_id: notice.notice_id,
              email_from: notice.companyDetails.company_name,
              email_to: 'client/supplier',
              auto_mail: false,
              mail_sent: true,
            };
          }

          const newNoticeMail = repo.create(NoticeMail, {
            ...noticeData,
            created_by: userId,
          });

          await repo.save(NoticeMail, newNoticeMail);
        }
      } else if (data.status === 'Delete') {
        if (notice.status === 'Sent') notice.status = 'Delete-Sent';
        else {
          notice.status = 'Delete-Unsent';
        }
      } else if (data.status === 'Draft') {
        notice.status = 'Draft';
      } else if (data.status === 'Not Sent') {
        notice.status = 'Not Sent';
      } else if (data.status === 'Sending') {
        notice.status = 'Sending';
      } else if (data.status === 'Sent - Onboarded') {
        notice.status = 'Sent - Onboarded';
      } else {
        throw new Error('Wrong notice status');
      }
      if (data.delegated_qbcc) {
        notice.delegated_qbcc = data.delegated_qbcc;
      }

      await repo.save(NoticeDetails, notice);

      this.logger.log(`Notice updated successfully with id: ${data.notice_id}`);

      return framedResponse('SUCCESS', `Notice updated successfully.`);
    } catch (error) {
      this.logger.error(
        `Errored while updating a notice with message: ${error}`,
      );
      throw error;
    }
  }
  async handleUpdateNotice(
    decoded: any,
    payload: updateNoticesInput,
    manager?: EntityManager,
  ) {
    try {
      const repo = manager ?? this.entityManager;

      const noticeDetails = await repo.findOne(NoticeDetails, {
        where: { notice_id: payload.notice_id },
        select: ['id', 'notice_type', 'company_id', 'project_id'],
      });

      if (!noticeDetails) {
        throw new Error(`Notice not found with id ${payload.notice_id}`);
      }

      // Build link to view master type details
      const noticeLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[decoded?.isAdmin ? 36 : 14]}` +
        `${noticeDetails.id}` +
        `?from=log`;

      // Decide activity log template
      const qbccNotices = [
        'QBCC TA1 Project Trust Account Notice',
        'QBCC TA3 Notice Of Related Entities',
        'QBCC TA4 Part Payment Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA5 Nil Return Notice',
        'QBCC TA1 Retention Trust Account Notice',
        'QBCC TA2 Retention Account Closing Notice',
      ];

      let eventTemplateId: number | null = null;
      if (payload.status === 'Draft') {
        eventTemplateId = 131;
      } else if (payload.status === 'Sent') {
        if (
          payload.qbcc === true ||
          (noticeDetails.notice_type &&
            qbccNotices.includes(noticeDetails.notice_type))
        ) {
          eventTemplateId = 132;
        } else if (payload.auto_sent === true) {
          eventTemplateId = 133;
        } else if (payload.auto_sent === false) {
          eventTemplateId = null;
        } else {
          eventTemplateId = 130;
        }
      } else if (decoded?.isAdmin && payload?.status === 'Sending') {
        eventTemplateId = 195;
      }

      // Create activity log if needed
      if (eventTemplateId) {
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: eventTemplateId,
          admin_id: decoded?.isAdmin
            ? decoded?.userId
            : decoded?.logged_in_by === 'ADMIN'
              ? decoded?.admin_id
              : null,
          to_user: decoded?.logged_in_by === 'ADMIN' ? decoded?.userId : null,
          from_user: decoded?.logged_in_by === 'ADMIN' ? null : decoded?.userId,
          company_id: noticeDetails.company_id,
          dynamic_values: {
            noticeLink,
            noticeSubject: noticeDetails.notice_type,
            referenceId: payload.reference_id,
            referenceIdLink: payload.reference_link,
            clientName: payload.toName,
            clientMail: payload.toMail,
          },
          is_admin: decoded?.isAdmin,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }

      // Delegate to existing status update logic
      const updateNotice = await this.updateNoticeStatus(
        payload,
        decoded?.userId,
        manager,
      );

      // Trigger compliance re-check if project is present
      if (noticeDetails.project_id && updateNotice) {
        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: noticeDetails.project_id,
          bank_account_type: 'Project Trust Account',
          failedFilter: false,
        });

        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: noticeDetails.project_id,
          bank_account_type: 'Retention Trust Account',
          failedFilter: false,
        });
      }

      return updateNotice;
    } catch (error) {
      this.logger.error(
        `Errored while handling update notice with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async updateNoticeMail(
    data: updateNoticesMailInput,
    userId?: number,
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(NoticeMail)
      : this.noticeMailRepo;

    try {
      this.logger.log(
        `Handling request for update notice status with data: ${JSON.stringify(data)}`,
      );

      const noticeMail = await repo.findOne({
        where: { notice_mail_id: data.notice_mail_id },
      });

      if (!noticeMail)
        throw `Invalid input. Notice Mail not found. Please provide a valid notice mail id.`;

      const updatedMail = { ...noticeMail, ...data, updated_by: userId };
      updatedMail.email_to = data.email_to || noticeMail.email_to;
      updatedMail.email_from = data.email_from || noticeMail.email_from;
      updatedMail.email_cc = data.email_cc || noticeMail.email_cc;
      updatedMail.email_subject =
        data.email_subject || noticeMail.email_subject;
      updatedMail.email_content =
        data.email_content || noticeMail.email_content;

      const updated_notice_mail = await repo.save(updatedMail);

      this.logger.log(
        `Notice updated successfully with id: ${data.notice_mail_id}`,
      );

      return framedResponse(
        'SUCCESS',
        `Notice Mail updated successfully.`,
        updated_notice_mail,
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating a notice with message: ${error}`,
      );
      throw error;
    }
  }

  async listAllNotices(data: ListAllNoticesInput, timezone) {
    try {
      this.logger.log(
        `Handling request for fetching all notices with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        bank_account_id,
        project_id,
        notice_type,
        contract_id,
        payment_claim_id,
        payment_id,
        date_filter,
        delegated_qbcc,
        page,
        items_per_page,
        status,
        search,
        end_date,
        start_date,
        sorting_field,
      } = data;

      const queryBuilder = await this.noticesRepo
        .createQueryBuilder('notices')
        .select([
          'notices.id AS id',
          'notices.notice_id AS notice_id',
          'notices.company_id AS company_id',
          'notices.status AS status',
          'notices.contract_id AS contract_id',
          'notices.notice_type AS notice_type',
          'notices.payment_claim_id AS payment_claim_id',
          'notices.payment_id AS payment_id',
          'notices.bank_account_id AS bank_account_id',
          'notices.project_id AS project_id',
          'notices.notice_date AS notice_date',
          'contract.contract_name AS contract_name',
          'project.project_name AS project_name',
          'company.company_name AS company_name',
          'account.account_name AS account_name',
          'account.account_type AS bank_account_type',
          `notices.notice_source AS notice_source`,
        ])
        .leftJoin('notices.contractDetails', 'contract')
        .leftJoin('notices.projectDetails', 'project')
        .leftJoin('notices.companyDetails', 'company')
        .leftJoin('notices.accountDetails', 'account')
        .leftJoinAndSelect('notices.uploaded_notice', 'uploadedNotice')
        .leftJoinAndSelect('notices.qbcc_uploaded_notice', 'qbccNotice');

      if (company_id) {
        queryBuilder.andWhere('(notices.company_id = :company_id)', {
          company_id,
        });
      }

      if (delegated_qbcc) {
        queryBuilder.andWhere('(notices.delegated_qbcc = :delegated_qbcc)', {
          delegated_qbcc,
        });
      }

      if (bank_account_id) {
        queryBuilder.andWhere('(notices.bank_account_id = :bank_account_id)', {
          bank_account_id,
        });
      }

      if (project_id) {
        queryBuilder.andWhere('(notices.project_id = :project_id)', {
          project_id,
        });
      }

      if (contract_id) {
        queryBuilder.andWhere('(notices.contract_id = :contract_id)', {
          contract_id,
        });
      }

      if (payment_id) {
        queryBuilder.andWhere('(notices.payment_id = :payment_id)', {
          payment_id,
        });
      }

      if (payment_claim_id) {
        queryBuilder.andWhere(
          '(notices.payment_claim_id = :payment_claim_id)',
          {
            payment_claim_id,
          },
        );
      }

      if (notice_type) {
        queryBuilder.andWhere('notices.notice_type = :notice_type', {
          notice_type: notice_type,
        });
      }

      if (delegated_qbcc === true || delegated_qbcc === false) {
        queryBuilder.andWhere('notices.delegated_qbcc = :qbcc_delegation', {
          qbcc_delegation: delegated_qbcc,
        });
      }

      if (status) {
        if (status === 'Deleted') {
          queryBuilder.andWhere('notices.status IN (:...deleteStatuses)', {
            deleteStatuses: ['Delete-Unsent', 'Delete-Sent', 'Delete-Received'],
          });
        } else {
          queryBuilder.andWhere('notices.status = :noticeStatus', {
            noticeStatus: status,
          });
        }
      } else {
        queryBuilder.andWhere('notices.status NOT IN (:...deleteStatuses)', {
          deleteStatuses: [
            'Delete-Unsent',
            'Delete-Sent',
            'Delete-Received',
            'Received',
          ],
        });
      }

      // if (search) {
      //   queryBuilder.andWhere(
      //     `(LOWER(CAST(t.description AS text)) LIKE :keyword)`,
      //     { keyword: `%${search.toLowerCase()}%` },
      //   );
      // }

      if (data.date_filter && timezone) {
        const moment = require('moment-timezone');
        moment.tz.setDefault('UTC');
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment
            .tz(data.start_date, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment
            .tz(data.end_date, timezone)
            .endOf('day')
            .utc()
            .toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment.tz(timezone).startOf('month').utc().toDate();
          endDate = moment.tz(timezone).endOf('month').utc().toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .startOf('month')
            .utc()
            .toDate();
          endDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .endOf('month')
            .utc()
            .toDate();
        }
        queryBuilder.andWhere(
          'notices.notice_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!sorting_field) {
        queryBuilder.orderBy({ 'notices.created_on': sorting_order });
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }
      if (sorting_field) {
        switch (sorting_field) {
          case 'notice_date':
            {
              queryBuilder.orderBy({ 'notices.notice_date': sorting_order });
            }
            break;
          case 'project_name':
            {
              queryBuilder.orderBy({
                'LOWER(project.project_name)': sorting_order,
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
          case 'bank_account_type':
            {
              queryBuilder.orderBy({ 'account.account_type': sorting_order });
            }
            break;
          case 'notice_type':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(notices.notice_type AS text))': sorting_order,
              });
            }
            break;
          case 'notice_source':
            {
              queryBuilder.orderBy({ 'notices.notice_source': sorting_order });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({ 'notices.status': sorting_order });
            }
            break;
        }
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      for (const v of rawResults) {
        v.txn_date = new Date(v.txn_date);

        const contractSourceNotices = [
          'Supplier S23 Project Trust Account Notice',
          'Supplier S23 Retention Trust Account Notice',
          'QBCC TA3 Notice Of Related Entities',
          'Supplier S18C Retention Trust Account Notice',
          'Supplier S18C Project Trust Account Notice',
        ];

        const accountSourceNotices = [
          'QBCC TA1 Project Trust Account Notice',
          'QBCC TA1 Retention Trust Account Notice',
          'Client S18B Project Trust Account Notice',
          'QBCC TA5 Nil Return Notice',
          'QBCC TA2 Account Closing Notice',
          'QBCC TA2 Retention Account Closing Notice',
        ];

        const claimSourceNotices = [
          'Client Payment Claim Notice',
          'Supplier Payment Remittance Advice Notice',
        ];

        const paymentSourceNotices = [
          'Supplier Payment Schedule Notice',
          'QBCC TA4 Part Payment Notice',
          'Supplier Retention Payment Remittance Notice',
          'Supplier Retention Payment Schedule Notice',
          'Supplier Payment with Retention Withheld Notice',
          'Supplier Payment with Retention Schedule Notice',
        ];

        if (claimSourceNotices.includes(v.notice_type)) {
          v.source_type = 'claim';

          const claimDetails = v.payment_claim_id
            ? await this.paymentClaimsRepo.findOne({
                where: { payment_claim_id: v.payment_claim_id },
              })
            : null;

          const payments = v.payment_claim_id
            ? await this.paymentsRepo.find({
                where: {
                  payment_claim_id: v.payment_claim_id,
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
                order: {
                  created_on: 'DESC',
                },
                select: [
                  'payment_id',
                  'payment_type',
                  'cash_retention',
                  'current_status',
                  'payless_amount',
                  'total_amount',
                ],
              })
            : [];

          let retention_details;
          if (v.cash_retention_type == 'Retention claim') {
            retention_details = await this.retentionDetailsRepo.findOne({
              where: {
                retention_id: v.retention_id,
              },
              select: ['beneficiary_type', 'retention_id'],
            });
          }

          v.source_claim_details = {
            claim_type: claimDetails?.claim_type ?? null,
            cash_retention_type: claimDetails?.cash_retention_type ?? null,
            beneficiary_type: retention_details?.beneficiary_type ?? null,
            payments: payments.map((p) => ({
              payment_id: p.payment_id,
              payment_type: p.payment_type,
            })),
          };
        } else if (contractSourceNotices.includes(v.notice_type)) {
          v.source_type = 'contract';

          const contract_details = await this.contractDetails.findOne({
            where: {
              contract_id: v.contract_id,
            },
            select: ['id', 'contract_id'],
          });

          v.contract_uuid = contract_details.id;
        } else if (accountSourceNotices.includes(v.notice_type)) {
          v.source_type = 'account';
        } else if (paymentSourceNotices.includes(v.notice_type)) {
          v.source_type = 'payment';
        } else {
          v.source_type = null; // or some default if needed
        }
        //checkimh files
        // QBCC-related notice types
        const qbccNotices = [
          'QBCC TA1 Project Trust Account Notice',
          'QBCC TA1 Retention Trust Account Notice',
          'QBCC TA2 Account Closing Notice',
          'QBCC TA2 Retention Account Closing Notice',
          'QBCC TA3 Notice Of Related Entities',
          'QBCC TA4 Part Payment Notice',
          'QBCC TA5 Nil Return Notice',
        ];

        // Determine if current notice is QBCC type
        const isQbccNoticeType = qbccNotices.includes(v.notice_type);

        // Pick file path & type depending on notice type
        const filePath = isQbccNoticeType
          ? v.qbccNotice_file_path
          : v.uploadedNotice_file_path;
        const fileType = isQbccNoticeType
          ? v.qbccNotice_file_type
          : v.uploadedNotice_file_type;

        const subscription = await this.getSubscriptionType(
          v.company_id,
          v.bank_account_id,
        );

        const isFileGenerated =
          subscription === 'Basic'
            ? true
            : !!filePath && !!(await this.addFileBase64FromStorage(filePath, fileType));

        // New key: true if generation failed or file missing
        v.notice_document_gen_failed = !isFileGenerated;
      }
      this.logger.log(
        `All notices of a company id: ${company_id} fetched successfully`,
      );

      return framedResponse(
        'SUCCESS',
        `All notices of a company fetched successfully.`,
        { notices_list: rawResults, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all notices of a company with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async listAllMailsOfANotice(data: ListAllMailsofANoticesInput) {
    try {
      this.logger.log(
        `Handling request for fetching all notice mails with data: ${JSON.stringify(data)}`,
      );

      const { notice_id, page, items_per_page, sorting_field } = data;

      const queryBuilder = await this.noticeMailRepo
        .createQueryBuilder('mails')
        .select([
          'mails.id AS id',
          'mails.notice_id AS notice_id',
          'mails.notice_mail_id AS notice_mail_id',
          'mails.email_from AS email_from',
          'mails.email_to AS email_to',
          'mails.email_date AS email_date',
          'mails.email_subject AS email_subject',
          'client.client_supplier_name AS client_supplier_name',
          'company.company_name AS company_name',
        ])
        .leftJoin('mails.noticeDetails', 'notices')
        .leftJoin('notices.clientSupplierDetails', 'client')
        .leftJoin('notices.companyDetails', 'company')

        .where('mails.notice_id = :notice_id', { notice_id })
        .andWhere('mails.mail_sent = :sentStatus', { sentStatus: true });

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!sorting_field) {
        queryBuilder.orderBy({ 'mails.created_on': sorting_order });
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }

      if (sorting_field) {
        switch (sorting_field) {
          case 'email_from':
            {
              queryBuilder.orderBy({
                'LOWER(mails.email_from)': sorting_order,
              });
            }
            break;
          case 'email_to':
            {
              queryBuilder.orderBy({ 'LOWER(mails.email_to)': sorting_order });
            }
            break;
          case 'email_date':
            {
              queryBuilder.orderBy({ 'mails.email_date': sorting_order });
            }
            break;
          case 'email_subject':
            {
              queryBuilder.orderBy({
                'LOWER(mails.email_subject)': sorting_order,
              });
            }
            break;
          case 'client_supplier_name':
            {
              queryBuilder.orderBy({
                'LOWER(client.client_supplier_name)': sorting_order,
              });
            }
            break;
          case 'company_name':
            {
              queryBuilder.orderBy({
                'LOWER(company.company_name)': sorting_order,
              });
            }
            break;
        }
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      rawResults.forEach((m) => {
        m.email_date = new Date(m.email_date);
      });
      this.logger.log(
        `All mails of notice id: ${notice_id} fetched successfully`,
      );

      return framedResponse(
        'SUCCESS',
        `All mails of a notice fetched successfully.`,
        { mails_list: rawResults, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all mails of a notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async listAllDelgatedAccounts(data: ListAllDelegatesInput) {
    try {
      this.logger.log(
        `Handling request for fetching all delegated accounts with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        bank_account_id,
        page,
        items_per_page,
        sorting_field,
      } = data;

      const queryBuilder = await this.bankAccountsRepo
        .createQueryBuilder('banks')
        .select([
          'banks.bank_account_id AS bank_account_id',
          'banks.account_name AS account_name',
          'banks.account_type AS account_type',
          'banks.delegate_powers AS delegation',
          'company.company_id AS company_id',
          'company.company_name AS company_name',
        ])
        .leftJoin('banks.companyId', 'company')
        .leftJoin(SubscriptionDetails, 's', 'company.company_id = s.company_id')
        .leftJoin(SubscriptionPlanDetails, 'pd', 's.plan_id = pd.plan_id')
        .where(`banks.delegate_powers = 'Yes'`)
        .andWhere('banks.status != :deletestatus', { deletestatus: 'Deleted' })
        .andWhere(
          `banks.account_type IN ('Project Trust Account', 'Retention Trust Account')`,
        )
        .andWhere(
          `(s.is_free_plan_eligible = TRUE OR pd.plan_type IS NULL OR pd.plan_type != 'Free')`,
        );

      if (company_id) {
        queryBuilder.andWhere('(company.company_id = :company_id)', {
          company_id,
        });
      }

      if (bank_account_id) {
        queryBuilder.andWhere('(banks.bank_account_id = :bank_account_id)', {
          bank_account_id,
        });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!sorting_field) {
        queryBuilder.orderBy({ 'banks.created_on': sorting_order });
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }

      if (sorting_field) {
        switch (sorting_field) {
          case 'company_name':
            {
              queryBuilder.orderBy({
                'LOWER(company.company_name)': sorting_order,
              });
            }
            break;
          case 'account_name':
            {
              queryBuilder.orderBy({
                'LOWER(banks.account_name)': sorting_order,
              });
            }
            break;
          case 'account_type':
            {
              queryBuilder.orderBy({ 'banks.account_type': sorting_order });
            }
            break;
          case 'delegation':
            {
              queryBuilder.orderBy({ 'banks.delegation': sorting_order });
            }
            break;
        }
        if (page && items_per_page) {
          queryBuilder
            .offset((page - 1) * items_per_page)
            .limit(items_per_page);
        }
      }

      // Log the SQL query for debugging
      const sqlQuery = queryBuilder.getSql();
      this.logger.log(`[Delegation Query Debug] SQL: ${sqlQuery}`);

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      this.logger.log(
        `[Delegation Query Debug] Results count: ${rawResults?.length}, Total count: ${total_count}`,
      );
      this.logger.log(`All delegated accounts: fetched successfully }`);

      return framedResponse(
        'SUCCESS',
        `All delagated accounts fetched successfully.`,
        { account_list: rawResults, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all mails of a notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async triggerContractNotices(
    data: triggerContractNoticesInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for triggering notices of a contract with data: ${JSON.stringify(data)}`,
      );

      const { contract_id } = data;

      const contractsrepo = manager
        ? manager.getRepository(ContractDetails)
        : this.contractDetails;

      let trustAccountNotice = false;
      let RetentionAccountNotice = false;
      let trustAccDelegation;
      let retentionAccDelegation;
      let trustQBCC = false;
      let retentionQBCC = false;

      // const xx = await contractsrepo.findOne({
      //   where: { contract_id: contract_id },
      //   relations: [
      //     'companyDetails',
      //     'projectDetails',
      //     'clientSuppliersDetails',
      //     'contractPaymentFromAccount',
      //     'contractPaymentToAccount',
      //     'contractRetentionFromAccount',
      //   ],
      // });
      // console.log("contract_id value:", contract_id);
      // console.log("contract_id type:", typeof contract_id);

      // const contractDDDDs = await contractsrepo
      //   .createQueryBuilder('c')
      //   .leftJoinAndSelect('c.companyDetails', 'companyDetails')
      //   .leftJoinAndSelect('c.projectDetails', 'projectDetails')
      //   .leftJoinAndSelect('c.clientSuppliersDetails', 'clientSuppliersDetails')
      //   .leftJoinAndSelect('c.contractPaymentFromAccount', 'paymentFrom')
      //   .leftJoinAndSelect('c.contractPaymentToAccount', 'paymentTo')
      //   .leftJoinAndSelect('c.contractRetentionFromAccount', 'retentionFrom')
      //   .where('c.contract_id = :contractId', { contractId: contract_id })
      //   .getOne();

      const cntrts = await contractsrepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.companyDetails', 'companyDetails')
        .leftJoinAndSelect('c.projectDetails', 'projectDetails')
        .leftJoinAndSelect('c.clientSuppliersDetails', 'clientSuppliersDetails')
        .leftJoinAndSelect('c.contractPaymentFromAccount', 'paymentFrom')
        .leftJoinAndSelect('c.contractPaymentToAccount', 'paymentTo')
        .leftJoinAndSelect('c.contractRetentionFromAccount', 'retentionFrom')
        .where('c.contract_id = :contractId', { contractId: contract_id })
        .getOne();

      const contractLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[6]}` +
        cntrts.id +
        `?from=log`;

      if (cntrts) {
        this.logger.log(
          `[NOTICE_TRIGGER] Contract ${contract_id} loaded: company_id=${cntrts.company_id}, ` +
          `payment_from_account=${cntrts.contractPaymentFromAccount?.bank_account_id || 'NONE'} (type=${cntrts.contractPaymentFromAccount?.account_type || 'N/A'}), ` +
          `payment_to_account=${cntrts.contractPaymentToAccount?.bank_account_id || 'NONE'}, ` +
          `retention_from_account=${cntrts.contractRetentionFromAccount?.bank_account_id || 'NONE'} (type=${cntrts.contractRetentionFromAccount?.account_type || 'N/A'}), ` +
          `related_entity=${cntrts.clientSuppliersDetails?.related_entity || 'N/A'}`
        );

        if (cntrts.contractPaymentFromAccount) {
          if (
            cntrts.contractPaymentFromAccount.account_type ===
            'Project Trust Account'
          ) {
            trustAccountNotice = true;
            this.logger.log(
              `[NOTICE_TRIGGER] S23 PTA notice WILL be triggered (payment_from is PTA). Checking subscription type...`
            );
            trustAccDelegation = await this.getSubscriptionType(
              cntrts.company_id,
              cntrts.contractPaymentFromAccount.bank_account_id,
            );
            this.logger.log(
              `[NOTICE_TRIGGER] S23 PTA subscription result: '${trustAccDelegation}' ` +
              `(Paid=auto-generate+doc, Paid-delegated=auto-send, Basic=manual only)`
            );

            if (cntrts.clientSuppliersDetails.related_entity === 'Yes') {
              trustQBCC = true;
              this.logger.log(`[NOTICE_TRIGGER] S23 PTA QBCC notice also required (related_entity=Yes)`);
            }
          } else {
            this.logger.log(
              `[NOTICE_TRIGGER] S23 PTA notice NOT triggered — payment_from account type is '${cntrts.contractPaymentFromAccount.account_type}', not PTA`
            );
          }
        } else {
          this.logger.log(
            `[NOTICE_TRIGGER] S23 PTA notice NOT triggered — no payment_from_account assigned`
          );
        }
        if (cntrts.contractRetentionFromAccount) {
          if (
            cntrts.contractRetentionFromAccount.account_type ===
            'Retention Trust Account'
          ) {
            RetentionAccountNotice = true;
            this.logger.log(
              `[NOTICE_TRIGGER] S23 RTA notice WILL be triggered (retention_from is RTA). Checking subscription type...`
            );
            retentionAccDelegation = await this.getSubscriptionType(
              cntrts.company_id,
              cntrts.contractRetentionFromAccount.bank_account_id,
            );
            this.logger.log(
              `[NOTICE_TRIGGER] S23 RTA subscription result: '${retentionAccDelegation}' ` +
              `(Paid=auto-generate+doc, Paid-delegated=auto-send, Basic=manual only)`
            );
            if (cntrts.clientSuppliersDetails.related_entity === 'Yes') {
              retentionQBCC = true;
              this.logger.log(`[NOTICE_TRIGGER] S23 RTA QBCC notice also required (related_entity=Yes)`);
            }
          } else {
            this.logger.log(
              `[NOTICE_TRIGGER] S23 RTA notice NOT triggered — retention_from account type is '${cntrts.contractRetentionFromAccount.account_type}', not RTA`
            );
          }
        } else {
          this.logger.log(
            `[NOTICE_TRIGGER] S23 RTA notice NOT triggered — no retention_from_account assigned`
          );
        }

        const response = {
          trustAccountNotice: trustAccountNotice,
          RetentionAccountNotice: RetentionAccountNotice,
          trustQBCC: trustQBCC,
          retentionQBCC: retentionQBCC,
          trustAccDelegation: trustAccDelegation,
          retentionAccDelegation: retentionAccDelegation,
          clientName: cntrts.clientSuppliersDetails.client_supplier_name,
          clientMail: cntrts.clientSuppliersDetails.client_email_id,
          contract_id: contract_id,
          contract_link: contractLink,
          company_id: cntrts.company_id,
        };

        this.logger.log(
          `[NOTICE_TRIGGER] Final decision: S23_PTA=${trustAccountNotice}, S23_RTA=${RetentionAccountNotice}, ` +
          `QBCC_PTA=${trustQBCC}, QBCC_RTA=${retentionQBCC}, ` +
          `PTA_delegation='${trustAccDelegation || 'N/A'}', RTA_delegation='${retentionAccDelegation || 'N/A'}'`
        );

        return response;
      } else {
        throw new Error('Contract details not found');
      }
    } catch (error) {
      this.logger.error(
        `Errored while triggering all contract notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  /**
   * Task #97: per-company opt-out for delegated auto-send.
   * Returns FALSE only when company_details.notices_auto_send === false
   * (explicit opt-out). NULL / TRUE / unknown company → TRUE (legacy default).
   * The flag is consulted at every inner auto-send gate so the user still gets
   * the notice + mail file generated for manual sending — only the automatic
   * mail dispatch is suppressed.
   */
  private async getCompanyAutoSendSetting(
    companyId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    if (!companyId) return true;
    try {
      const repo = manager
        ? manager.getRepository(CompanyDetails)
        : this.companyDetails;
      const c = await repo.findOne({
        where: { company_id: companyId },
        select: { company_id: true, notices_auto_send: true },
      });
      return c?.notices_auto_send !== false;
    } catch (e) {
      this.logger.warn(
        `[NOTICE_FLOW] getCompanyAutoSendSetting failed company_id=${companyId}: ${e?.message}`,
      );
      return true;
    }
  }

  async handleTriggerContractNotices(
    decoded: any,
    payload: triggerContractNoticesInput,
    manager?: EntityManager,
  ): Promise<triggerNoticesResponse> {
    const userMode =
      decoded && decoded?.userId
        ? await this.fetchModeOfAnUser(decoded?.userId, manager)
        : null;

    this.logger.log(
      `[HANDLE_NOTICE] User mode for userId=${decoded?.userId}: '${userMode}' (Normal=send notices, Onboarding=mark as Sent-Onboarded)`
    );

    // Task #97: per-company auto-send opt-out. Fetched once and threaded
    // through every inner gate (see getCompanyAutoSendSetting). When FALSE on
    // a Paid-delegated path, the inner mail-send + status update are skipped;
    // the notice + doc + mail file are still produced for manual sending.
    const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const companyAutoSend = await this.getCompanyAutoSendSetting(
      decoded?.companyId ?? null,
      manager,
    );
    this.logger.log(
      `[NOTICE_FLOW] flow_id=${flowId} stage=trigger_entry kind=contract contract_id=${payload?.contract_id} company_auto_send=${companyAutoSend} user_mode=${userMode}`,
    );

    let notice_previews = [];
    let qbcc_notice_previews = [];
    let noticeGen = false;
    let mails_to_sent = [];
    let update_notice_inputs = [];

    const noticeListWithData = await this.triggerContractNotices(
      payload,
      manager,
    );

    this.logger.log(
      `[HANDLE_NOTICE] triggerContractNotices result: S23_PTA=${noticeListWithData.trustAccountNotice}, ` +
      `S23_RTA=${noticeListWithData.RetentionAccountNotice}, ` +
      `PTA_delegation='${noticeListWithData.trustAccDelegation || 'N/A'}', ` +
      `RTA_delegation='${noticeListWithData.retentionAccDelegation || 'N/A'}', ` +
      `clientMail_present=${!!noticeListWithData.clientMail}`
    );

    if (noticeListWithData.trustAccountNotice === true) {
      this.logger.log(
        `[HANDLE_NOTICE] === S23 PTA Notice: GENERATING for contract ${noticeListWithData.contract_id} ===`
      );
      const generateNoticePayload: Partial<generateNoticeInput> = {
        company_id: noticeListWithData.company_id,
        contract_id: noticeListWithData.contract_id,
        notice_type: 'Supplier S23 Project Trust Account Notice',
      };

      const newNotice = (await this.handleGenerateNotice(
        decoded,
        generateNoticePayload as generateNoticeInput,
        manager,
      )) as generateNoticeResponse;

      this.logger.log(
        `[HANDLE_NOTICE] S23 PTA notice generated: notice_id=${newNotice?.data?.id}, notice_id_ref=${newNotice?.data?.notice_id}`
      );

      const contractNoticeStatus = await this.updateContractNoticeStatus(
        payload.contract_id,
        manager,
      );
      noticeGen = true;
      if (
        noticeListWithData.trustAccDelegation === 'Paid' ||
        noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
        (userMode && userMode == 'Onboarding')
      ) {
        this.logger.log(
          `[HANDLE_NOTICE] S23 PTA: Paid/delegated/onboarding path — generating mail. delegation='${noticeListWithData.trustAccDelegation}', userMode='${userMode}'`
        );
        const generateMailNoticePayload: GenerateMailForANoticeInput = {
          id: newNotice?.data?.id,
        };

        if (
          noticeListWithData.trustAccDelegation === 'Paid' ||
          noticeListWithData.trustAccDelegation === 'Paid-delegated'
        ) {
          this.logger.log(`[HANDLE_NOTICE] S23 PTA: Generating PDF document (paid plan)`);
          const doc = await this.generateNoticeDocument(
            generateMailNoticePayload,
            decoded,
            manager,
          );
        }
        const newMail = await this.handleGenerateMailForANotice(
          decoded,
          generateMailNoticePayload,
          manager,
        );

        if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
          throw new Error(`Mail generation failed: ${newMail?.message}`);
        }

        this.logger.log(
          `[HANDLE_NOTICE] S23 PTA mail generated: mail_id=${newMail?.data?.id}, notice_id=${newMail?.data?.notice_id}`
        );

        const sentMailNoticePayload: SentMailForANoticeInput = {
          id: newMail?.data?.id,
          view_preview: true,
        };

        if (
          noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
          userMode === 'Onboarding'
        ) {
          if (userMode && userMode == 'Normal' && companyAutoSend) {
            this.logger.log(`[HANDLE_NOTICE] S23 PTA: AUTO-SENDING mail (Paid-delegated + Normal mode)`);
            const mailSent = (await this.handlesentNoticeMail(
              decoded,
              sentMailNoticePayload,
              null,
              manager,
            )) as {
              status: string;
              message: string;
              data: {
                mails: any;
                preview: {
                  mail_uuid: string;
                  file_details: any;
                };
              };
            };

            notice_previews.push(mailSent.data.preview);
            mails_to_sent.push(mailSent.data.mails);
            noticeGen = true;
          } else {
            this.logger.log(`[HANDLE_NOTICE] S23 PTA: Onboarding mode — marking as 'Sent - Onboarded' without actual send`);
          }

          const updateNoticePayload: updateNoticesInput = {
            notice_id: newMail.data.notice_id,
            notice_mail_uuid: newMail?.data?.id,
            status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
            auto_sent: !!(userMode == 'Normal' && companyAutoSend),
            reference_id: noticeListWithData.contract_id,
            reference_link: noticeListWithData.contract_link,
            toName: noticeListWithData.clientName,
            toMail: noticeListWithData.clientMail,
          };

          update_notice_inputs.push(updateNoticePayload);
        } else {
          this.logger.log(
            `[HANDLE_NOTICE] S23 PTA: Paid (not delegated) — mail generated but NOT auto-sent. User must send manually.`
          );
        }
      } else {
        this.logger.log(
          `[HANDLE_NOTICE] S23 PTA: Basic plan — notice generated, activity log created, no mail auto-generation`
        );
        const noticeLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[14]}` +
          `${newNotice.data.id}` +
          `?from=log`;
        this.logger.log(`noticeLink: ${noticeLink}`);

        //Create activity log as soon a payment claim is created.
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 128,
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
          company_id: noticeListWithData.company_id,
          dynamic_values: {
            noticeLink,
            noticeSubject: generateNoticePayload.notice_type,
            referenceId: noticeListWithData.contract_id,
            referenceLink: noticeListWithData.contract_link,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }
    }
    if (noticeListWithData.RetentionAccountNotice === true) {
      this.logger.log(
        `[HANDLE_NOTICE] === S23 RTA Notice: GENERATING for contract ${noticeListWithData.contract_id} ===`
      );
      const generateNoticePayload: Partial<generateNoticeInput> = {
        company_id: noticeListWithData.company_id,
        contract_id: noticeListWithData.contract_id,
        notice_type: 'Supplier S23 Retention Trust Account Notice',
      };
      const newNotice = (await this.handleGenerateNotice(
        decoded,
        generateNoticePayload as generateNoticeInput,
        manager,
      )) as generateNoticeResponse;

      this.logger.log(
        `[HANDLE_NOTICE] S23 RTA notice generated: notice_id=${newNotice?.data?.id}, notice_id_ref=${newNotice?.data?.notice_id}`
      );
      noticeGen = true;

      if (
        noticeListWithData.retentionAccDelegation === 'Paid' ||
        noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
        (userMode && userMode == 'Onboarding')
      ) {
        this.logger.log(
          `[HANDLE_NOTICE] S23 RTA: Paid/delegated/onboarding path — generating mail. delegation='${noticeListWithData.retentionAccDelegation}', userMode='${userMode}'`
        );
        const generateMailNoticePayload: GenerateMailForANoticeInput = {
          id: newNotice?.data?.id,
        };

        if (
          noticeListWithData.retentionAccDelegation === 'Paid' ||
          noticeListWithData.retentionAccDelegation === 'Paid-delegated'
        ) {
          this.logger.log(`[HANDLE_NOTICE] S23 RTA: Generating PDF document (paid plan)`);
          const doc = await this.generateNoticeDocument(
            generateMailNoticePayload,
            decoded,
            manager,
          );
        }

        const newMail = await this.handleGenerateMailForANotice(
          decoded,
          generateMailNoticePayload,
          manager,
        );

        this.logger.log(
          `[HANDLE_NOTICE] S23 RTA mail generated: mail_id=${newMail?.data?.id}, notice_id=${newMail?.data?.notice_id}`
        );

        const sentMailNoticePayload: SentMailForANoticeInput = {
          id: newMail?.data?.id,
          view_preview: true,
        };

        if (
          noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
          (userMode && userMode == 'Onboarding')
        ) {
          if (userMode && userMode == 'Normal' && companyAutoSend) {
            this.logger.log(`[HANDLE_NOTICE] S23 RTA: AUTO-SENDING mail (Paid-delegated + Normal mode)`);
            const mailSent = (await this.handlesentNoticeMail(
              decoded,
              sentMailNoticePayload,
              null,
              manager,
            )) as {
              status: string;
              message: string;
              data: {
                mails: any;
                preview?: {
                  mail_uuid?: any;
                  file_details?: any;
                };
              };
            };

            notice_previews.push(mailSent.data.preview);
            mails_to_sent.push(mailSent.data.mails);
            noticeGen = true;
          } else {
            this.logger.log(`[HANDLE_NOTICE] S23 RTA: Onboarding mode — marking as 'Sent - Onboarded' without actual send`);
          }

          const updateNoticePayload: updateNoticesInput = {
            notice_id: newMail.data.notice_id,
            notice_mail_uuid: newMail?.data?.id,
            status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
            auto_sent: !!(userMode == 'Normal' && companyAutoSend),
            reference_id: noticeListWithData.contract_id,
            reference_link: noticeListWithData.contract_link,
            toName: noticeListWithData.clientName,
            toMail: noticeListWithData.clientMail,
          };
          update_notice_inputs.push(updateNoticePayload);
        } else {
          this.logger.log(
            `[HANDLE_NOTICE] S23 RTA: Paid (not delegated) — mail generated but NOT auto-sent. User must send manually.`
          );
        }
      } else {
        this.logger.log(
          `[HANDLE_NOTICE] S23 RTA: Basic plan — notice generated, activity log created, no mail auto-generation`
        );
        //Generating notice link link to view matched transactions.
        const noticeLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[14]}` +
          `${newNotice.data.id}` +
          `?from=log`;
        this.logger.log(`noticeLink: ${noticeLink}`);

        //Create activity log as soon a payment claim is created.
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 128,
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
          company_id: noticeListWithData.company_id,
          dynamic_values: {
            noticeLink,
            noticeSubject: generateNoticePayload.notice_type,
            referenceId: noticeListWithData.contract_id,
            referenceLink: noticeListWithData.contract_link,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }
    }
    if (noticeListWithData.trustQBCC === true) {
      this.logger.log(
        `[HANDLE_NOTICE] === QBCC TA3 PTA Notice: GENERATING for contract ${noticeListWithData.contract_id} (related_entity=Yes) ===`
      );
      const generateNoticePayload: Partial<generateNoticeInput> = {
        company_id: noticeListWithData.company_id,
        contract_id: noticeListWithData.contract_id,
        notice_type: 'QBCC TA3 Notice Of Related Entities',
        is_retention: false,
      };

      const newNotice = (await this.handleGenerateNotice(
        decoded,
        generateNoticePayload as generateNoticeInput,
        manager,
      )) as generateNoticeResponse;

      this.logger.log(
        `[HANDLE_NOTICE] QBCC TA3 PTA notice generated: notice_id=${newNotice?.data?.id}`
      );
      noticeGen = true;

      if (
        noticeListWithData.trustAccDelegation === 'Paid' ||
        noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
        (userMode && userMode == 'Onboarding')
      ) {
        this.logger.log(
          `[HANDLE_NOTICE] QBCC TA3 PTA: Paid/delegated/onboarding path. delegation='${noticeListWithData.trustAccDelegation}', userMode='${userMode}'`
        );
        const generateMailNoticePayload: GenerateMailForANoticeInput = {
          id: newNotice?.data?.id,
        };

        if (
          noticeListWithData.trustAccDelegation === 'Paid' ||
          noticeListWithData.trustAccDelegation === 'Paid-delegated'
        ) {
          this.logger.log(`[HANDLE_NOTICE] QBCC TA3 PTA: Generating PDF document (paid plan)`);
          const doc = await this.generateNoticeDocument(
            generateMailNoticePayload,
            decoded,
            manager,
          );
        }

        if (
          noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
          (userMode && userMode == 'Onboarding')
        ) {
          // Task #97 — QBCC delegated lodgement is a regulatory channel and is
          // intentionally NOT controlled by the per-company `notices_auto_send`
          // opt-out (which only governs client-facing notice mails).
          if (userMode && userMode == 'Normal') {
            this.logger.log(`[HANDLE_NOTICE] QBCC TA3 PTA: AUTO-SENDING admin QBCC mail (Paid-delegated + Normal mode)`);
            const adminMail = (await this.handleSentAdminMailQbccNotice(
              decoded,
              newNotice?.data?.id,
              true,
              null,
              manager,
            )) as {
              status: string;
              message: string;
              data: {
                qbcc_notice_file: {
                  mail_uuid: string;
                  file_details: any;
                };
                mails: any;
              };
            };

            qbcc_notice_previews.push(adminMail.data.qbcc_notice_file);
            mails_to_sent.push(adminMail.data.mails);
          } else {
            this.logger.log(`[HANDLE_NOTICE] QBCC TA3 PTA: Onboarding mode — marking as 'Sent - Onboarded' without actual send`);
          }

          const updateNoticePayload: updateNoticesInput = {
            notice_id: newNotice.data.notice_id,
            delegated_qbcc: true,
            status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
            qbcc: true,
            reference_id: noticeListWithData.contract_id,
            reference_link: noticeListWithData.contract_link,
          };

          update_notice_inputs.push(updateNoticePayload);
        } else {
          this.logger.log(
            `[HANDLE_NOTICE] QBCC TA3 PTA: Paid (not delegated) — doc generated but NOT auto-sent`
          );
        }
      } else {
        this.logger.log(
          `[HANDLE_NOTICE] QBCC TA3 PTA: Basic plan — notice generated, activity log only`
        );
        //Generating notice link link to view matched transactions.
        const noticeLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[14]}` +
          `${newNotice.data.id}` +
          `?from=log`;
        this.logger.log(`noticeLink: ${noticeLink}`);

        //Create activity log as soon a payment claim is created.
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 128,
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
          company_id: noticeListWithData.company_id,
          dynamic_values: {
            noticeLink,
            noticeSubject: generateNoticePayload.notice_type,
            referenceId: noticeListWithData.contract_id,
            referenceLink: noticeListWithData.contract_link,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }
    }
    if (noticeListWithData.retentionQBCC === true) {
      this.logger.log(
        `[HANDLE_NOTICE] === QBCC TA3 RTA Notice: GENERATING for contract ${noticeListWithData.contract_id} (related_entity=Yes, retention) ===`
      );
      const generateNoticePayload: Partial<generateNoticeInput> = {
        company_id: noticeListWithData.company_id,
        contract_id: noticeListWithData.contract_id,
        notice_type: 'QBCC TA3 Notice Of Related Entities',
        is_retention: true,
      };

      const newNotice = (await this.handleGenerateNotice(
        decoded,
        generateNoticePayload as generateNoticeInput,
        manager,
      )) as generateNoticeResponse;

      this.logger.log(
        `[HANDLE_NOTICE] QBCC TA3 RTA notice generated: notice_id=${newNotice?.data?.id}`
      );

      const contractNoticeStatus = await this.updateContractNoticeStatus(
        payload.contract_id,
        manager,
      );
      noticeGen = true;

      if (
        noticeListWithData.retentionAccDelegation === 'Paid' ||
        noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
        (userMode && userMode == 'Onboarding')
      ) {
        this.logger.log(
          `[HANDLE_NOTICE] QBCC TA3 RTA: Paid/delegated/onboarding path. delegation='${noticeListWithData.retentionAccDelegation}', userMode='${userMode}'`
        );
        const generateMailNoticePayload: GenerateMailForANoticeInput = {
          id: newNotice?.data?.id,
        };

        if (
          noticeListWithData.retentionAccDelegation === 'Paid' ||
          noticeListWithData.retentionAccDelegation === 'Paid-delegated'
        ) {
          this.logger.log(`[HANDLE_NOTICE] QBCC TA3 RTA: Generating PDF document (paid plan)`);
          const doc = await this.generateNoticeDocument(
            generateMailNoticePayload,
            decoded,
            manager,
          );
        }

        if (
          noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
          (userMode && userMode == 'Onboarding')
        ) {
          // Task #97 — QBCC delegated lodgement is regulatory and not gated by
          // the per-company `notices_auto_send` opt-out.
          if (userMode && userMode == 'Normal') {
            this.logger.log(`[HANDLE_NOTICE] QBCC TA3 RTA: AUTO-SENDING admin QBCC mail (Paid-delegated + Normal mode)`);
            const adminMail = (await this.handleSentAdminMailQbccNotice(
              decoded,
              newNotice?.data?.id,
              true,
              null,
              manager,
            )) as {
              status: string;
              message: string;
              data: {
                qbcc_notice_file: {
                  mail_uuid: string;
                  file_details: any;
                };
                mails: any;
              };
            };

            qbcc_notice_previews.push(adminMail.data.qbcc_notice_file);
            mails_to_sent.push(adminMail.data.mails);
          } else {
            this.logger.log(`[HANDLE_NOTICE] QBCC TA3 RTA: Onboarding mode — marking as 'Sent - Onboarded' without actual send`);
          }

          const updateNoticePayload: updateNoticesInput = {
            notice_id: newNotice.data.notice_id,
            delegated_qbcc: true,
            status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
            qbcc: true,
            reference_id: noticeListWithData.contract_id,
            reference_link: noticeListWithData.contract_link,
          };
          update_notice_inputs.push(updateNoticePayload);
        } else {
          this.logger.log(
            `[HANDLE_NOTICE] QBCC TA3 RTA: Paid (not delegated) — doc generated but NOT auto-sent`
          );
        }
      } else {
        this.logger.log(
          `[HANDLE_NOTICE] QBCC TA3 RTA: Basic plan — notice generated, activity log only`
        );
        //Generating notice link link to view matched transactions.
        const noticeLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[14]}` +
          `${newNotice.data.id}` +
          `?from=log`;
        this.logger.log(`noticeLink: ${noticeLink}`);

        //Create activity log as soon a payment claim is created.
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 128,
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
          company_id: noticeListWithData.company_id,
          dynamic_values: {
            noticeLink,
            noticeSubject: generateNoticePayload.notice_type,
            referenceId: noticeListWithData.contract_id,
            referenceLink: noticeListWithData.contract_link,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }
    }

    this.logger.log(
      `[HANDLE_NOTICE] === SUMMARY: noticeGen=${noticeGen}, ` +
      `mails_to_sent=${mails_to_sent.length}, update_notice_inputs=${update_notice_inputs.length}, ` +
      `notice_previews=${notice_previews.length}, qbcc_notice_previews=${qbcc_notice_previews.length} ===`
    );

    if (noticeGen === true) {
      return framedResponse('SUCCESS', `Notices added to list successfully.`, {
        notice_previews,
        qbcc_notice_previews,
        mails_to_sent,
        update_notice_inputs,
      });
    } else {
      this.logger.log(
        `[HANDLE_NOTICE] No notices generated — contract likely has no PTA/RTA bank accounts and no related entity`
      );
      return framedResponse('SUCCESS');
    }
  }

  async updateContractNoticeStatus(contract_id, manager?: EntityManager) {
    try {
      if (manager) {
        const contract = await manager.findOne(ContractDetails, {
          where: { contract_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!contract) {
          throw new Error(`Contract not found: ${contract_id}`);
        }

        contract.notice_generated = true;
        contract.updated_on = moment.tz('UTC');
        contract.updated_group = 'USER';

        return await manager.save(contract);
      } else {
        return await this.entityManager.transaction(
          async (transactionalEntityManager) => {
            const contract = await transactionalEntityManager.findOne(
              ContractDetails,
              {
                where: { contract_id: contract_id },
                lock: { mode: 'pessimistic_write' },
              },
            );
            contract.notice_generated = true;
            contract.updated_on = moment.tz('UTC');
            contract.updated_group = 'USER';
            const response = await transactionalEntityManager.save(contract);
            // throw new Error('Error');
            return response;
          },
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async triggerPaymentClaimNotices(
    data: triggerPaymentClaimNoticesInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Request received for triggering the payment claim notices with data: ${JSON.stringify(data)}`,
      );

      const { payment_claim_id } = data;

      let trustAccountNotice = false;
      let trustAccDelegation;

      const pcRepo = manager
        ? manager.getRepository(PaymentClaims)
        : this.paymentClaimsRepo;

      const paymentClaimDetails = await pcRepo
        .createQueryBuilder('pc')
        .select([
          'pc.claim_type AS claim_type',
          'pc.company_id AS company_id',
          'pc.cash_retention_type AS cash_retention_type',
          'c.payment_to_account AS bank_account_id',
          'client.client_supplier_name AS client_name',
          'client.client_email_id AS client_mail',
        ])
        .leftJoin(ContractDetails, 'c', 'c.contract_id = pc.contract_id')
        .leftJoin(
          ClientSuppliersDetails,
          'client',
          'client.client_supplier_id = pc.client_supplier_id',
        )
        .where('pc.payment_claim_id = :payment_claim_id', { payment_claim_id })
        .getRawOne();

      if (!paymentClaimDetails) {
        throw new Error(
          `Payment claim not found for payment_claim_id: ${payment_claim_id}`,
        );
      }

      //Generating payment claim link to view edited payment claim.
      const paymentClaimLink = generatePaymentClaimLink({
        cash_retention_type: paymentClaimDetails.cash_retention_type,
        claim_type: paymentClaimDetails.claim_type,
        payment_claim_id,
      });

      //Client payment claim notice
      if (paymentClaimDetails.claim_type == 'Receivable') {
        trustAccountNotice = true;
      }
      trustAccDelegation = await this.getSubscriptionType(
        paymentClaimDetails.company_id,
        paymentClaimDetails.bank_account_id,
      );

      const response = {
        trustAccountNotice,
        trustAccDelegation,
        payment_claim_id,
        payment_claim_link: paymentClaimLink,
        bank_account_id: paymentClaimDetails.bank_account_id,
        company_id: paymentClaimDetails.company_id,
        clientName: paymentClaimDetails.client_name,
        clientMail: paymentClaimDetails.client_mail,
      };
      this.logger.log(`response: ${JSON.stringify(response)}`);

      return response;
    } catch (error) {
      this.logger.log(
        `Errored while triggering the payment claim notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleTriggerPaymentClaimNotices(
    decoded: any,
    payload: triggerPaymentClaimNoticesInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Request received for triggering notices of payment claim with id ${payload.payment_claim_id}.`,
      );

      const userMode =
        decoded && decoded?.userId
          ? await this.fetchModeOfAnUser(decoded?.userId)
          : null;
      const userDetails = await this.userDetails.findOne({
        where: { user_id: decoded?.userId },
      });

      let noticeGen = false;
      let notice_previews = [];
      let qbcc_notice_previews = [];
      let mails_to_sent = [];
      let update_notice_inputs = [];

      const noticeListWithData = await this.triggerPaymentClaimNotices(
        payload,
        manager,
      );

      // Task #97: per-company auto-send opt-out (see getCompanyAutoSendSetting).
      const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const companyAutoSend = await this.getCompanyAutoSendSetting(
        (noticeListWithData as any)?.company_id ?? decoded?.companyId ?? null,
        manager,
      );
      this.logger.log(
        `[NOTICE_FLOW] flow_id=${flowId} stage=trigger_entry kind=payment_claim payment_claim_id=${payload?.payment_claim_id} company_auto_send=${companyAutoSend} user_mode=${userMode}`,
      );

      if (noticeListWithData.trustAccountNotice === true) {
        const generateNoticePayload: Partial<generateNoticeInput> = {
          company_id: noticeListWithData.company_id,
          payment_claim_id: noticeListWithData.payment_claim_id,
          notice_type: 'Client Payment Claim Notice',
        };

        const newNotice = (await this.handleGenerateNotice(
          decoded,
          generateNoticePayload as generateNoticeInput,
          manager,
        )) as generateNoticeResponse;

        noticeGen = true;

        if (
          noticeListWithData.trustAccDelegation === 'Paid' ||
          noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
          (userMode && userMode == 'Onboarding')
        ) {
          const generateMailNoticePayload: GenerateMailForANoticeInput = {
            id: newNotice?.data?.id,
            has_import_button: true,
          };

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated'
          ) {
            const doc = await this.generateNoticeDocument(
              generateMailNoticePayload,
              decoded,
              manager,
            );
          }

          const newMail = (await this.handleGenerateMailForANotice(
            decoded,
            generateMailNoticePayload,
            manager,
          )) as generateNoticeMailResponse;

          const sentMailNoticePayload: SentMailForANoticeInput = {
            id: newMail?.data?.id,
            view_preview: true,
          };

          if (
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            if (userMode && userMode == 'Normal' && companyAutoSend) {
              const mailSent = (await this.handlesentNoticeMail(
                decoded,
                sentMailNoticePayload,
                null,
                manager,
              )) as {
                status: string;
                message: string;
                data: {
                  mails: any;
                  preview: {
                    mail_uuid: string;
                    file_details: any;
                  };
                };
              };

              // Only preview needed inside transaction
              notice_previews.push(mailSent.data.preview);
              mails_to_sent.push(mailSent.data.mails);

              noticeGen = true;
            }

            const updateNoticePayload: updateNoticesInput = {
              notice_id: newNotice.data.notice_id,
              notice_mail_uuid: newMail?.data?.id,
              status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
              auto_sent: !!(userMode == 'Normal' && companyAutoSend),
              reference_id: noticeListWithData.payment_claim_id,
              reference_link: noticeListWithData.payment_claim_link,
              toName: noticeListWithData.clientName,
              toMail: noticeListWithData.clientMail,
            };

            // const u = await this.handleUpdateNotice(decoded, updateNoticePayload, manager);

            update_notice_inputs.push(updateNoticePayload);
          }
        } else {
          const noticeLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[14]}` +
            `${newNotice.data.id}` +
            `?from=log`;

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 128,
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
            company_id: noticeListWithData.company_id,
            dynamic_values: {
              noticeLink,
              noticeSubject: generateNoticePayload.notice_type,
              referenceId: noticeListWithData.payment_claim_id,
              referenceLink: noticeListWithData.payment_claim_link,
              toName: noticeListWithData.clientName,
              toMail: noticeListWithData.clientMail,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        }

        // await this.statusService.getUiStatusAndActionButtonsForClaims({
        //   payment_claim_id: payload.payment_claim_id,
        // });

        if (noticeGen === true) {
          return framedResponse(
            'SUCCESS',
            `Notices added to list successfully.`,
            {
              notice_previews,
              qbcc_notice_previews,
              mails_to_sent,
              update_notice_inputs,
            },
          );
        } else return framedResponse('SUCCESS');
      } else return framedResponse('SUCCESS');
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of payment claim with id: ${payload.payment_claim_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async triggerAuditNotices(data: triggerAuditNoticesInput) {
    try {
      this.logger.log(
        `Request received for triggering the audit notices with data: ${JSON.stringify(data)}`,
      );

      const { audit_id } = data;

      let auditNotice = false;
      let trustAccDelegation;

      const auditDetails = await this.auditRepo
        .createQueryBuilder('au')
        .select([
          'au.id AS id',
          'au.company_id AS company_id',
          'au.bank_account_id AS bank_account_id',
          'au.nil_return AS nil_return',
        ])
        .leftJoin(BankAccounts, 'b', 'b.bank_account_id = au.bank_account_id')
        .where('au.audit_id = :audit_id', { audit_id })
        .getRawOne();

      const auditLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[15]}` +
        `${auditDetails.id}` +
        `?from=log`;
      this.logger.log(`auditLink: ${auditLink}`);

      if (auditDetails.nil_return == 'Yes') {
        auditNotice = true;
      }
      trustAccDelegation = await this.getSubscriptionType(
        auditDetails.company_id,
        auditDetails.bank_account_id,
      );

      const response = {
        auditNotice,
        trustAccDelegation,
        audit_id,
        audit_link: auditLink,
        bank_account_id: auditDetails.bank_account_id,
        company_id: auditDetails.company_id,
      };
      this.logger.log(`response: ${JSON.stringify(response)}`);

      return response;
    } catch (error) {
      this.logger.log(
        `Errored while triggering the audit notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchPaymentDetails(payment_id: number, manager?: EntityManager) {
    try {
      const payRepo = manager
        ? manager.getRepository(PaymentDetails)
        : this.paymentsRepo;

      const paymentDetails = await payRepo
        .createQueryBuilder('p')
        .select([
          'p.payment_id AS payment_id',
          'p.company_id AS company_id',
          'p.payment_type AS payment_type',
          'p.current_status AS status',
          'p.payment_from_account AS payment_from_account',
          'p.payment_to_account AS payment_to_account',
          'p.cash_retention AS cash_retention',
          'fba.account_type AS from_account_type',
          'tba.account_type AS to_account_type',
          'pc.claim_type AS claim_type',
          'pc.cash_retention_type AS cash_retention_type',
          'client.client_supplier_name AS client_name',
          'client.client_email_id AS client_mail',
        ])
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = p.payment_claim_id',
        )
        .leftJoin(
          BankAccounts,
          'fba',
          'fba.bank_account_id = p.payment_from_account',
        )
        .leftJoin(
          BankAccounts,
          'tba',
          'tba.bank_account_id = p.payment_to_account',
        )
        .leftJoin(
          ClientSuppliersDetails,
          'client',
          'client.client_supplier_id = p.client_supplier_id',
        )
        .leftJoin(SubPayments, 'sub', 'sub.payment_id = p.payment_id')
        .addSelect([
          'sub.sub_payment_id AS sub_payment_id',
          'sub.sub_payment_type AS sub_payment_type',
          'sub.is_paid_confirmed AS is_paid_confirmed',
          'sub.is_received_confirmed AS is_received_confirmed',
          'sub.is_retention_confirmed AS is_retention_confirmed',
          'sub.amount AS sub_payment_amount',
        ])
        .where('p.payment_id = :payment_id', { payment_id })
        .getRawMany();

      if (!paymentDetails || paymentDetails.length === 0) return null;

      const mainPayment = {
        payment_id: paymentDetails[0].payment_id,
        company_id: paymentDetails[0].company_id,
        payment_type: paymentDetails[0].payment_type,
        status: paymentDetails[0].status,
        payment_from_account: paymentDetails[0].payment_from_account,
        payment_to_account: paymentDetails[0].payment_to_account,
        cash_retention: paymentDetails[0].cash_retention,
        from_account_type: paymentDetails[0].from_account_type,
        to_account_type: paymentDetails[0].to_account_type,
        payment_claim_id: paymentDetails[0].payment_claim_id,
        claim_type: paymentDetails[0].claim_type,
        cash_retention_type: paymentDetails[0].cash_retention_type,
        client_name: paymentDetails[0].client_name,
        client_mail: paymentDetails[0].client_mail,
        subPayments: paymentDetails.map((row) => ({
          sub_payment_id: row.sub_payment_id,
          sub_payment_type: row.sub_payment_type,
          is_paid_confirmed: row.is_paid_confirmed,
          is_received_confirmed: row.is_received_confirmed,
          is_retention_confirmed: row.is_retention_confirmed,
          amount: row.sub_payment_amount,
        })),
      };

      this.logger.log(`paymentDetails: ${JSON.stringify(mainPayment)}`);

      return mainPayment;
    } catch (error) {
      throw error;
    }
  }

  async triggerPaymentNotices(payment_id: number, manager?: EntityManager) {
    try {
      this.logger.log(
        `Request received for triggering the notices of a payment with data: ${JSON.stringify(payment_id)}`,
      );

      let trustAccountPaymentNotice = false;
      let billablePaymentNotice = false;
      let partPaymentTrustQBCC = false;
      let billableRetentionPaymentNotice = false;
      let billablefromRetentionNotice = false;
      let retentionAccountPaymentNotice = false;
      let retentionWithheldNotice = false;
      let trustAccDelegation;
      let retentionAccDelegation;
      let response;

      const paymentDetails = await this.fetchPaymentDetails(
        payment_id,
        manager,
      );

      const isPaymentConfirmed = paymentDetails.subPayments.some(
        (sub) =>
          sub.sub_payment_type === 'Payment' &&
          (sub.is_paid_confirmed === true ||
            sub.is_received_confirmed === true),
      );

      const isRetentionConfirmed = paymentDetails.subPayments.some(
        (sub) =>
          sub.sub_payment_type === 'Retention Out' &&
          sub.is_retention_confirmed === true,
      );

      const paymentLink = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ].includes(paymentDetails.payment_type)
        ? `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[9]}` +
          `${paymentDetails?.payment_claim_id != null || paymentDetails?.payment_claim_id != undefined ? paymentDetails?.payment_claim_id : ''}` +
          `&mode=view&payment=` +
          `${payment_id}` +
          `&from=log`
        : `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[13]}` +
          `${payment_id}` +
          `?from=log`;
      // console.log('paymentLink', paymentLink);

      if (
        paymentDetails.claim_type === 'Billable' &&
        (paymentDetails.from_account_type === 'Project Trust Account' ||
          paymentDetails.from_account_type === 'Cash Account') &&
        !(
          paymentDetails.payment_type === 'Overpayment to supplier' ||
          paymentDetails.payment_type === 'Underpayment to supplier' ||
          paymentDetails.payment_type === 'Overpayment from client' ||
          paymentDetails.payment_type === 'Underpayment from client'
        ) &&
        // paymentDetails.status === 'Paid - Matched' ||
        // paymentDetails.status === 'Paid - Unmatched' ||
        // paymentDetails.status === 'Received - Matched' ||
        // paymentDetails.status === 'Received - Unmatched' ||
        (paymentDetails.status === 'Unconfirmed - Matched' ||
          // All "Unconfirmed" with Payment Matched and Retention variations
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched' ||
          isPaymentConfirmed)
      ) {
        billablePaymentNotice = true;
        trustAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        (paymentDetails.from_account_type === 'Retention Trust Account' ||
          paymentDetails.from_account_type === 'Cash Account') &&
        (paymentDetails.payment_type === 'Pay Less - Full' ||
          paymentDetails.payment_type === 'Pay Less - Part' ||
          paymentDetails.payment_type === '3rd Party' ||
          paymentDetails.payment_type === 'Part' ||
          paymentDetails.payment_type === 'Pay - Zero') &&
        // paymentDetails.status === 'Paid - Matched' ||
        // paymentDetails.status === 'Paid - Unmatched' ||
        // paymentDetails.status === 'Received - Matched' ||
        // paymentDetails.status === 'Received - Unmatched' ||
        (paymentDetails.status === 'No Match Required' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status === 'Unconfirmed - Matched' ||
          isPaymentConfirmed)
      ) {
        retentionAccountPaymentNotice = true;
        retentionAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        (paymentDetails.from_account_type === 'Project Trust Account' ||
          paymentDetails.from_account_type === 'Cash Account') &&
        (paymentDetails.payment_type === 'Pay Less - Full' ||
          paymentDetails.payment_type === 'Pay Less - Part' ||
          paymentDetails.payment_type === '3rd Party' ||
          paymentDetails.payment_type === 'Part' ||
          paymentDetails.payment_type === 'Pay - Zero') &&
        (paymentDetails.status === 'No Match Required' ||
          paymentDetails.status === 'Unconfirmed - Matched' ||
          // All "Unconfirmed" with Payment Matched and Retention variations
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched' ||
          isPaymentConfirmed)
      ) {
        trustAccountPaymentNotice = true;
        trustAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        paymentDetails.from_account_type === 'Project Trust Account' &&
        (paymentDetails.payment_type === 'Pay Less - Part' ||
          paymentDetails.payment_type === 'Part') &&
        (paymentDetails.status === 'Unconfirmed - Matched' ||
          // All "Unconfirmed" with Payment Matched and Retention variations
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched' ||
          isPaymentConfirmed)
      ) {
        partPaymentTrustQBCC = true;
        trustAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        paymentDetails.claim_type === 'Billable' &&
        paymentDetails.from_account_type === 'Retention Trust Account' &&
        !(
          paymentDetails.payment_type === 'Overpayment to supplier' ||
          paymentDetails.payment_type === 'Underpayment to supplier' ||
          paymentDetails.payment_type === 'Overpayment from client' ||
          paymentDetails.payment_type === 'Underpayment from client'
        ) &&
        (paymentDetails.status === 'Unconfirmed - Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          isPaymentConfirmed)
      ) {
        billablefromRetentionNotice = true;
        retentionAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        (paymentDetails.claim_type === 'Billable' &&
          paymentDetails.cash_retention == true &&
          (paymentDetails.from_account_type === 'Project Trust Account' ||
            paymentDetails.from_account_type === 'Cash Account') &&
          !(
            paymentDetails.payment_type === 'Overpayment to supplier' ||
            paymentDetails.payment_type === 'Underpayment to supplier' ||
            paymentDetails.payment_type === 'Overpayment from client' ||
            paymentDetails.payment_type === 'Underpayment from client'
          ) &&
          (paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched' ||
            paymentDetails.status ===
              'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched' ||
            paymentDetails.status ===
              'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
            paymentDetails.status === 'Unconfirmed - Matched')) ||
        isRetentionConfirmed
      ) {
        billableRetentionPaymentNotice = true;
        trustAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      if (
        paymentDetails.claim_type === 'Billable' &&
        paymentDetails.cash_retention == true &&
        // paymentDetails.to_account_type === 'Retention Trust Account' &&
        !(
          paymentDetails.payment_type === 'Overpayment to supplier' ||
          paymentDetails.payment_type === 'Underpayment to supplier' ||
          paymentDetails.payment_type === 'Overpayment from client' ||
          paymentDetails.payment_type === 'Underpayment from client'
        ) &&
        (paymentDetails.status ===
          'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched' ||
          paymentDetails.status ===
            'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched' ||
          paymentDetails.status === 'Unconfirmed - Matched' ||
          isRetentionConfirmed)
      ) {
        retentionWithheldNotice = true;
        trustAccDelegation = await this.getSubscriptionType(
          paymentDetails.company_id,
          paymentDetails.payment_from_account,
        );
      }

      response = {
        trustAccountPaymentNotice,
        billablePaymentNotice,
        partPaymentTrustQBCC,
        billableRetentionPaymentNotice,
        billablefromRetentionNotice,
        retentionAccountPaymentNotice,
        retentionWithheldNotice,
        trustAccDelegation,
        retentionAccDelegation,
        payment_id,
        payment_link: paymentLink,
        bank_account_id: paymentDetails.payment_from_account,
        company_id: paymentDetails.company_id,
        clientName: paymentDetails.client_name,
        clientMail: paymentDetails.client_mail,
      };
      return response;
    } catch (error) {
      this.logger.error(
        `Errored while triggering payment notices of a payment with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async handleTriggerPaymentNotices(
    decoded: any,
    payload: triggerPaymentNoticesInput,
    manager?: EntityManager,
  ): Promise<triggerNoticesResponse> {
    try {
      this.logger.log(
        `Request received for triggering the notices after matching a payment with data: ${JSON.stringify(payload)}`,
      );

      const userMode =
        decoded && decoded?.userId
          ? await this.fetchModeOfAnUser(decoded?.userId)
          : null;
      const userDetails = await this.userDetails.findOne({
        where: { user_id: decoded?.userId },
      });

      let noticeGen = false;
      let notice_previews = [];
      let qbcc_notice_previews = [];
      let mails_to_sent = [];
      let update_notice_inputs = [];

      // Task #97: per-company auto-send opt-out resolved per-payment inside the
      // loop (companyId may differ per payment in admin/multi-company flows).
      let companyAutoSend = true;
      const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.logger.log(
        `[NOTICE_FLOW] flow_id=${flowId} stage=trigger_entry kind=payment payment_ids=${JSON.stringify(payload?.payment_ids)} user_mode=${userMode}`,
      );

      for (const payment_id of payload.payment_ids) {
        const noticeListWithData = await this.triggerPaymentNotices(
          payment_id,
          manager,
        );

        this.logger.log(`Payment-notices-list: ${JSON.stringify(noticeListWithData)}`);

        companyAutoSend = await this.getCompanyAutoSendSetting(
          (noticeListWithData as any)?.company_id ?? null,
          manager,
        );
        this.logger.log(
          `[NOTICE_FLOW] flow_id=${flowId} stage=gate_decision payment_id=${payment_id} company_auto_send=${companyAutoSend}`,
        );

        if (noticeListWithData.trustAccountPaymentNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'Supplier Payment Schedule Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          this.logger.log(`contractNoticeStatus: ${JSON.stringify(contractNoticeStatus)}`);

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
              has_import_button: true,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );

              this.logger.log(`doc: ${JSON.stringify(doc)}`);
            }

            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            this.logger.log(`newMail: ${JSON.stringify(newMail)}`);

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);

                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );

              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.billablePaymentNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'Supplier Payment Remittance Advice Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
              has_import_button: true,
            };
            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }
            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );
            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };
                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);
                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );
              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.billableRetentionPaymentNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'Supplier Payment with Retention Schedule Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
              has_import_button: true,
            };
            //need to confirm
            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }

            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);

                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );
              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.retentionWithheldNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            bank_account_id: noticeListWithData.bank_account_id,
            notice_type: 'Supplier Payment with Retention Withheld Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
            };
            //need to confirm

            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }

            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);

                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );

              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.partPaymentTrustQBCC === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'QBCC TA4 Part Payment Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;
          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
            };
            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }

            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              // Task #97 — QBCC delegated lodgement is regulatory and not
              // gated by the per-company `notices_auto_send` opt-out.
              if (userMode && userMode == 'Normal') {
                const adminMail = (await this.handleSentAdminMailQbccNotice(
                  decoded,
                  newNotice?.data?.id,
                  true,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    qbcc_notice_file: {
                      mail_uuid: string;
                      file_details: any;
                    };
                    mails: any;
                  };
                };

                qbcc_notice_previews.push(adminMail.data.qbcc_notice_file);
                mails_to_sent.push(adminMail.data.mails);
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newNotice.data.notice_id,
                delegated_qbcc: true,
                status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
                qbcc: true,
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );
              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.billablefromRetentionNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'Supplier Retention Payment Remittance Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.retentionAccDelegation === 'Paid' ||
            noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
            };
            if (
              noticeListWithData.retentionAccDelegation === 'Paid' ||
              noticeListWithData.retentionAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }
            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mailDetails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mailDetails);

                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );

              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        if (noticeListWithData.retentionAccountPaymentNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            payment_id: noticeListWithData.payment_id,
            notice_type: 'Supplier Retention Payment Schedule Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;
          noticeGen = true;

          const contractNoticeStatus = await this.updatePaymentNoticeStatus(
            payment_id,
            manager,
          );

          if (
            noticeListWithData.retentionAccDelegation === 'Paid' ||
            noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
              has_import_button: true,
            };
            if (
              noticeListWithData.retentionAccDelegation === 'Paid' ||
              noticeListWithData.retentionAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }
            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };

            if (
              noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview?: {
                      mail_uuid?: any;
                      file_details?: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);
                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.payment_id,
                reference_link: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );
              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.payment_id,
                referenceLink: noticeListWithData.payment_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }

        const updatePaymentButtons =
          await this.statusService.getUiStatusAndActionButtonsForPayments({
            payment_id,
          });
      }

      if (noticeGen === true) {
        return framedResponse(
          'SUCCESS',
          `Notices added to list successfully.`,
          {
            notice_previews,
            qbcc_notice_previews,
            mails_to_sent,
            update_notice_inputs,
          },
        );
      } else {
        return framedResponse('SUCCESS');
      }
    } catch (error) {
      this.logger.error(
        `Errored while triggering the notices after matching a payment with id: ${payload.payment_ids} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async triggerAccountNotices(
    data: triggerAccountNoticesInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for triggering notices of bank accounts with data: ${JSON.stringify(data)}`,
      );

      const { bank_account_id } = data;

      let trustAccountNotice = false;
      let trustAccDelegation;
      let retentionAccDelegation;
      let trustQBCC = false;
      let retentionQBCC = false;

      const bankRepo = manager
        ? manager.getRepository(BankAccounts)
        : this.bankAccountsRepo;

      const bankAccountDetails = await bankRepo.findOne({
        where: { bank_account_id: bank_account_id },
        relations: ['companyId', 'clientSuppliersDetails'],
      });

      // const bankAccountDetails = await bankRepo
      //   .createQueryBuilder('b')
      //   .leftJoinAndSelect('b.clientSuppliersDetails', 'clientSuppliersDetails')
      //   .leftJoinAndSelect('c.projectDetails', 'projectDetails')
      //   .where('b.bank_account_id = :bank_account_id', { bank_account_id: bank_account_id })
      //   .getOne();

      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[12]}` +
        `${bank_account_id}/` +
        `${bankAccountDetails.company_id}` +
        `?from=log`;

      if (bankAccountDetails) {
        if (bankAccountDetails.project_ids) {
          if (bankAccountDetails.account_type === 'Project Trust Account') {
            trustAccountNotice = true;
            trustAccDelegation = await this.getSubscriptionType(
              bankAccountDetails.company_id,
              bank_account_id,
              manager,
            );
            trustQBCC = true;
          }
          if (bankAccountDetails.account_type === 'Retention Trust Account') {
            retentionQBCC = true;
            retentionAccDelegation = await this.getSubscriptionType(
              bankAccountDetails.company_id,
              bank_account_id,
              manager,
            );
          }
        } else {
          throw new Error('No projects associated with this account');
        }

        const response = {
          trustAccountNotice: trustAccountNotice,
          trustQBCC: trustQBCC,
          retentionQBCC: retentionQBCC,
          trustAccDelegation: trustAccDelegation,
          retentionAccDelegation: retentionAccDelegation,
          bank_account_id: bank_account_id,
          bank_accoutn_link: bankAccountLink,
          company_id: bankAccountDetails.company_id,
          client_supplier_id: bankAccountDetails.client_supplier_id,
          clientName:
            bankAccountDetails.clientSuppliersDetails?.client_supplier_name,
          clientMail:
            bankAccountDetails.clientSuppliersDetails?.client_email_id,
        };

        return response;
      }
    } catch (error) {
      this.logger.error(
        `Errored while triggering all account notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleTriggerAccountNotices(
    decoded: any,
    payload: triggerAccountNoticesInput,
    manager?: EntityManager,
  ): Promise<triggerNoticesResponse> {
    try {
      this.logger.log(
        `Request received for triggering multiple notices of bank account ${payload.bank_account_id}.`,
      );
      this.logger.log(`payload: ${JSON.stringify(payload)}`);

      const userMode =
        decoded && decoded?.userId
          ? await this.fetchModeOfAnUser(decoded?.userId, manager)
          : null;
      // const userDetails = await this.userDetails.findOne({
      //   where: { user_id: decoded?.userId },
      // });

      const noticeListWithData = await this.triggerAccountNotices(
        payload,
        manager,
      );

      this.logger.log(`notice_list_to_be_generated: ${JSON.stringify(noticeListWithData)}`);

      // Task #97: per-company auto-send opt-out (see getCompanyAutoSendSetting).
      const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const companyAutoSend = await this.getCompanyAutoSendSetting(
        (noticeListWithData as any)?.company_id ?? decoded?.companyId ?? null,
        manager,
      );
      this.logger.log(
        `[NOTICE_FLOW] flow_id=${flowId} stage=trigger_entry kind=account bank_account_id=${payload?.bank_account_id} company_auto_send=${companyAutoSend} user_mode=${userMode}`,
      );

      let noticeGen = false;

      let notice_previews = [];
      let qbcc_notice_previews = [];
      let mails_to_sent = [];
      let update_notice_inputs = [];

      if (noticeListWithData) {
        if (noticeListWithData.trustAccountNotice === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            bank_account_id: noticeListWithData.bank_account_id,
            client_supplier_id: noticeListWithData.client_supplier_id,
            notice_type: 'Client S18B Project Trust Account Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
            };
            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }

            const newMail = await this.handleGenerateMailForANotice(
              decoded,
              generateMailNoticePayload,
              manager,
            );

            if (!newMail || newMail.status !== 'SUCCESS' || !newMail.data) {
              throw new Error(`Mail generation failed: ${newMail?.message}`);
            }

            const sentMailNoticePayload: SentMailForANoticeInput = {
              id: newMail?.data?.id,
              view_preview: true,
            };
            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              //Trigger notice emails only if the user mode is Normal.
              if (userMode && userMode == 'Normal' && companyAutoSend) {
                const mailSent = (await this.handlesentNoticeMail(
                  decoded,
                  sentMailNoticePayload,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    mails: any;
                    preview: {
                      mail_uuid: string;
                      file_details: any;
                    };
                  };
                };

                notice_previews.push(mailSent.data.preview);
                mails_to_sent.push(mailSent.data.mails);
                noticeGen = true;
              }
              const updateNoticePayload: updateNoticesInput = {
                notice_id: newMail.data.notice_id,
                notice_mail_uuid: newMail?.data?.id,
                status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
                auto_sent: !!(userMode == 'Normal' && companyAutoSend),
                reference_id: noticeListWithData.bank_account_id,
                reference_link: noticeListWithData.bank_accoutn_link,
                toName: noticeListWithData.clientName,
                toMail: noticeListWithData.clientMail,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );

              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.bank_account_id,
                referenceLink: noticeListWithData.bank_accoutn_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }
        if (noticeListWithData.trustQBCC === true) {
          const generateNoticePayload: Partial<generateNoticeInput> = {
            company_id: noticeListWithData.company_id,
            bank_account_id: noticeListWithData.bank_account_id,
            client_supplier_id: noticeListWithData.client_supplier_id,
            notice_type: 'QBCC TA1 Project Trust Account Notice',
          };

          const newNotice = (await this.handleGenerateNotice(
            decoded,
            generateNoticePayload as generateNoticeInput,
            manager,
          )) as generateNoticeResponse;

          noticeGen = true;

          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            (userMode && userMode == 'Onboarding')
          ) {
            const generateMailNoticePayload: GenerateMailForANoticeInput = {
              id: newNotice?.data?.id,
            };

            if (
              noticeListWithData.trustAccDelegation === 'Paid' ||
              noticeListWithData.trustAccDelegation === 'Paid-delegated'
            ) {
              const doc = await this.generateNoticeDocument(
                generateMailNoticePayload,
                decoded,
                manager,
              );
            }
            if (
              noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
              (userMode && userMode == 'Onboarding')
            ) {
              // Task #97 — QBCC delegated lodgement is regulatory and not
              // gated by the per-company `notices_auto_send` opt-out.
              if (userMode && userMode == 'Normal') {
                const adminMail = (await this.handleSentAdminMailQbccNotice(
                  decoded,
                  newNotice?.data?.id,
                  true,
                  null,
                  manager,
                )) as {
                  status: string;
                  message: string;
                  data: {
                    qbcc_notice_file: {
                      mail_uuid: string;
                      file_details: any;
                    };
                    mails: any;
                  };
                };

                qbcc_notice_previews.push(adminMail.data.qbcc_notice_file);
                mails_to_sent.push(adminMail.data.mails);
              }

              const updateNoticePayload: updateNoticesInput = {
                notice_id: newNotice.data.notice_id,
                delegated_qbcc: true,
                status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
                qbcc: true,
                reference_id: noticeListWithData.bank_account_id,
                reference_link: noticeListWithData.bank_accoutn_link,
              };
              // const updateStatus = await this.handleUpdateNotice(
              //   decoded,
              //   updateNoticePayload,
              // );
              update_notice_inputs.push(updateNoticePayload);
            }
          } else {
            //Generating notice link link to view matched transactions.
            const noticeLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[14]}` +
              `${newNotice.data.id}` +
              `?from=log`;
            this.logger.log(`noticeLink: ${noticeLink}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 128,
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
              company_id: noticeListWithData.company_id,
              dynamic_values: {
                noticeLink,
                noticeSubject: generateNoticePayload.notice_type,
                referenceId: noticeListWithData.bank_account_id,
                referenceLink: noticeListWithData.bank_accoutn_link,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //console.log('createActivityLogInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }
        if (noticeListWithData.retentionQBCC === true) {
          const banksrepo = manager
            ? manager.getRepository(BankAccounts)
            : this.bankAccountsRepo;

          const noticeRepo = manager
            ? manager.getRepository(NoticeDetails)
            : this.noticesRepo;

          const account_details = await banksrepo.findOne({
            where: {
              bank_account_id: noticeListWithData.bank_account_id,
              account_type: 'Retention Trust Account',
            },
          });

          if (account_details.project_ids.length > 0) {
            const existing_RAT_project_notices = await noticeRepo.find({
              where: {
                project_id: In(account_details.project_ids),
                notice_type: 'QBCC TA1 Retention Trust Account Notice',
                status: Not(In(['Delete-Unsent', 'Delete-Sent'])),
              },
            });

            const existingProjectIds = Array.from(
              new Set(
                existing_RAT_project_notices.map((notice) =>
                  String(notice.project_id),
                ),
              ),
            );

            const missingProjectIds = account_details.project_ids.filter(
              (projectId) => !existingProjectIds.includes(String(projectId)),
            );

            if (missingProjectIds.length > 0) {
              this.logger.log(`Projects without a notice: ${JSON.stringify(missingProjectIds)}`);
              // Do something with the missingProjectIds array

              for (const projectId of missingProjectIds) {
                const generateNoticePayload: Partial<generateNoticeInput> = {
                  company_id: noticeListWithData.company_id,
                  bank_account_id: noticeListWithData.bank_account_id,
                  project_id: Number(projectId),
                  notice_type: 'QBCC TA1 Retention Trust Account Notice',
                };

                const newNotice = (await this.handleGenerateNotice(
                  decoded,
                  generateNoticePayload as generateNoticeInput,
                  manager,
                )) as generateNoticeResponse;

                noticeGen = true;

                if (
                  noticeListWithData.retentionAccDelegation === 'Paid' ||
                  noticeListWithData.retentionAccDelegation ===
                    'Paid-delegated' ||
                  (userMode && userMode == 'Onboarding')
                ) {
                  const generateMailNoticePayload: GenerateMailForANoticeInput =
                    {
                      id: newNotice?.data?.id,
                    };
                  //need to confirm
                  if (
                    noticeListWithData.retentionAccDelegation === 'Paid' ||
                    noticeListWithData.retentionAccDelegation ===
                      'Paid-delegated'
                  ) {
                    const doc = await this.generateNoticeDocument(
                      generateMailNoticePayload,
                      decoded,
                      manager,
                    );
                  }

                  if (
                    noticeListWithData.retentionAccDelegation ===
                      'Paid-delegated' ||
                    (userMode && userMode == 'Onboarding')
                  ) {
                    // Task #97 — QBCC delegated lodgement is regulatory and
                    // not gated by per-company `notices_auto_send` opt-out.
                    if (userMode && userMode == 'Normal') {
                      const adminMail =
                        (await this.handleSentAdminMailQbccNotice(
                          decoded,
                          newNotice?.data?.id,
                          true,
                          null,
                          manager,
                        )) as {
                          status: string;
                          message: string;
                          data: {
                            qbcc_notice_file: {
                              mail_uuid: string;
                              file_details: any;
                            };
                            mails: any;
                          };
                        };

                      qbcc_notice_previews.push(
                        adminMail.data.qbcc_notice_file,
                      );
                      mails_to_sent.push(adminMail.data.mails);
                    }
                    const updateNoticePayload: updateNoticesInput = {
                      notice_id: newNotice.data.notice_id,
                      delegated_qbcc: true,
                      status:
                        userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
                      qbcc: true,
                      reference_id: noticeListWithData.bank_account_id,
                      reference_link: noticeListWithData.bank_accoutn_link,
                    };
                    // const updateStatus = await this.handleUpdateNotice(
                    //   decoded,
                    //   updateNoticePayload,
                    // );
                    update_notice_inputs.push(updateNoticePayload);
                  }
                } else {
                  //Generating notice link link to view matched transactions.
                  const noticeLink =
                    `${process.env.LOG_BASE_URL}` +
                    `${linkExtensions[14]}` +
                    `${newNotice.data.id}` +
                    `?from=log`;
                  this.logger.log(`noticeLink: ${noticeLink}`);

                  //Create activity log as soon a payment claim is created.
                  const createActivityLogInput: CreateActivityLogInput = {
                    event_template_id: 128,
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
                    company_id: noticeListWithData.company_id,
                    dynamic_values: {
                      noticeLink,
                      noticeSubject: generateNoticePayload.notice_type,
                      referenceId: noticeListWithData.bank_account_id,
                      referenceLink: noticeListWithData.bank_accoutn_link,
                    },
                    is_admin: false,
                    created_by: decoded?.userId,
                  };
                  //console.log('createActivityLogInput', createActivityLogInput);
                  await this.activityLogService.insertActivityLog(
                    createActivityLogInput,
                  );
                }
              }
            }
          }
        }
        if (noticeGen === true && userMode === 'Normal') {
          return framedResponse(
            'SUCCESS',
            `Notices added to list successfully.`,
            {
              notice_previews,
              qbcc_notice_previews,
              mails_to_sent,
              update_notice_inputs,
            },
          );
          // return notice_previews;
        } else if (userMode === 'Onboarding') {
          return framedResponse(
            'SUCCESS',
            `Notices created and marked as sent-onboarded`,
          );
        } else return framedResponse('SUCCESS');
      } else return framedResponse('SUCCESS');
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of contract: ${payload.bank_account_id} with message: ${error.message}`,
      );
      this.logger.error(`Full error stack: ${error.stack}`);
      this.logger.error(`NOTICE GENERATION ERROR: ${error}`);
      return framedResponse('ERROR', error.message);
    }
  }

  async fetchNoticeDetails(id, manager?: EntityManager) {
    const NoticeRepo = manager
      ? manager.getRepository(NoticeDetails)
      : this.noticesRepo;
    return await NoticeRepo.findOne({ where: { id } });
  }

  async fetchDetailsOfANotice(
    data: FetchDetailsOfANoticeInput,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a notice with data: ${JSON.stringify(data)}`,
      );

      const { id } = data;

      const NoticeRepo = manager
        ? manager.getRepository(NoticeDetails)
        : this.noticesRepo;

      const fetchedNoticetDetails = await NoticeRepo.createQueryBuilder(
        'notice',
      )
        .select([
          'notice.id AS id',
          'notice.notice_id AS notice_id',
          'notice.company_id AS company_id',
          'notice.status AS status',
          'notice.contract_id AS contract_id',
          'notice.notice_type AS notice_type',
          'notice.payment_claim_id AS payment_claim_id',
          'notice.payment_id AS payment_id',
          'notice.bank_account_id AS bank_account_id',
          'notice.supporting_file_attachment_ids AS supporting_file_attachment_ids',
          'account.account_number AS bank_account_number',
          'account.account_name AS bank_account_name',
          'clientSupplier.client_supplier_id AS client_supplier_id',
          'clientSupplier.client_supplier_name AS client_supplier_name',
          'clientSupplier.client_supplier_type AS client_supplier_type',
          'clientSupplier.client_email_id AS client_email_id',
          'notice.project_id AS project_id',
          'contract.id AS contract_uuid',
          'contract.contract_name AS contract_name',
          'contract.contract_date AS contract_date',
          'project.project_name AS project_name',
          'project.project_date AS project_date',
          'company.company_name AS company_name',
          'company.company_email_id AS company_email_id',
          `notice.notice_source AS notice_source`,
        ])
        .leftJoin('notice.contractDetails', 'contract')
        .leftJoinAndSelect('contract.fileAttachments', 'contractAttach')
        .leftJoin('notice.projectDetails', 'project')
        .leftJoin('notice.companyDetails', 'company')
        .leftJoin('notice.accountDetails', 'account')
        .leftJoin('notice.clientSupplierDetails', 'clientSupplier')
        .leftJoin('notice.templateDetails', 'templateData')
        .addSelect('templateData.memo_notes', 'memo_notes')
        .leftJoinAndSelect('templateData.notice_template', 'notice_template')
        .leftJoinAndSelect('notice.uploaded_notice', 'uploadedNotice')
        // .leftJoinAndSelect('notice.supportingFileAttachment', 'supportFile')
        .leftJoinAndSelect('notice.qbcc_uploaded_notice', 'qbccNotice')
        .where('notice.id = :id', { id })
        .getRawOne();

      const UPLOAD_BASE_URL = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');

      const addFilePath = (filePath: string | null) => {
        if (!filePath) return null;
        const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        return UPLOAD_BASE_URL + '/' + normalized;
      };

      let supportFileIds: string[] = [];
      if (
        fetchedNoticetDetails?.supporting_file_attachment_ids &&
        fetchedNoticetDetails.supporting_file_attachment_ids !== 'undefined' &&
        fetchedNoticetDetails.supporting_file_attachment_ids !== 'null'
      ) {
        supportFileIds = fetchedNoticetDetails.supporting_file_attachment_ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      }

      let supportDocs: any[] = [];

      if (supportFileIds.length > 0) {
        const fetchedFileAttachments = await this.fileAttachments
          .createQueryBuilder('f')
          .select([
            `f.id AS id`,
            `f.file_path AS file_path`,
            `f.file_name AS file_name`,
            `f.custom_file_name AS custom_file_name`,
            `f.file_type AS file_type`,
            `f.name AS name`,
            `f.uploaded_on AS uploaded_on`,
            `f.attachment_type AS attachment_type`,
          ])
          .where('f.id IN (:...ids)', { ids: supportFileIds })
          .orderBy({ 'f.uploaded_on': 'DESC' })
          .getRawMany();

        for (const f of fetchedFileAttachments) {
          supportDocs.push({
            id: f.id,
            file_name: f.custom_file_name ?? f.file_name,
            file_type: f.file_type,
            attachment_type: f.attachment_type,
            file_path: addFilePath(f.file_path),
            file: await this.addFileBase64FromStorage(f.file_path, f.file_type),
          });
        }
      }

      let s75File: Record<string, any> = {};
      let supportingFile: any[] = [];

      if (
        fetchedNoticetDetails?.notice_type === 'Client Payment Claim Notice'
      ) {
        s75File = supportDocs?.find((f) =>
          f?.file_name?.startsWith('S75-support-statement-claim'),
        );

        supportingFile =
          supportDocs?.filter(
            (f) => !f?.file_name?.startsWith('S75-support-statement-claim'),
          ) || [];
      } else {
        supportingFile = supportDocs;
      }

      const view_type = await this.getSubscriptionType(
        fetchedNoticetDetails.company_id,
        fetchedNoticetDetails.bank_account_id,
      );

      const qbccNotices = [
        'QBCC TA1 Project Trust Account Notice',
        'QBCC TA3 Notice Of Related Entities',
        'QBCC TA4 Part Payment Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA5 Nil Return Notice',
        'QBCC TA1 Retention Trust Account Notice',
        'QBCC TA2 Retention Account Closing Notice',
      ];

      const isQbccNoticeType = qbccNotices.includes(
        fetchedNoticetDetails.notice_type,
      );
      const fileToCheck = isQbccNoticeType
        ? fetchedNoticetDetails.qbccNotice_file_path
        : fetchedNoticetDetails.uploadedNotice_file_path;

      const subscription = await this.getSubscriptionType(
        fetchedNoticetDetails.company_id,
        fetchedNoticetDetails.bank_account_id,
      );

      const isFileGenerated =
        subscription === 'Basic'
          ? true
          : !!fileToCheck &&
            !!addFilePath(fileToCheck) &&
            !!(await this.addFileBase64FromStorage(
              fileToCheck,
              isQbccNoticeType
                ? fetchedNoticetDetails.qbccNotice_file_type
                : fetchedNoticetDetails.uploadedNotice_file_type,
            ));

      const noticeTemplateFile = await this.addFileBase64FromStorage(
        fetchedNoticetDetails.notice_template_file_path,
        fetchedNoticetDetails.notice_template_file_type,
      );
      const uploadedNoticeFile = await this.addFileBase64FromStorage(
        fetchedNoticetDetails.uploadedNotice_file_path,
        fetchedNoticetDetails.uploadedNotice_file_type,
      );
      const qbccNoticeFile = await this.addFileBase64FromStorage(
        fetchedNoticetDetails.qbccNotice_file_path,
        fetchedNoticetDetails.qbccNotice_file_type,
      );
      const s75FileBase64 = await this.addFileBase64FromStorage(s75File?.file_path, s75File?.file_type);

      const fetchedNoticeDetailsMapped = {
        id: fetchedNoticetDetails.id,
        notice_id: fetchedNoticetDetails.notice_id,
        notice_type: fetchedNoticetDetails.notice_type,
        notice_source: fetchedNoticetDetails.notice_source,
        memo_notes: fetchedNoticetDetails.memo_notes,
        notice_template: {
          id: fetchedNoticetDetails.notice_template_id,
          file_name: fetchedNoticetDetails.notice_template_file_name,
          file_type: fetchedNoticetDetails.notice_template_file_type,
          attachment_type:
            fetchedNoticetDetails.notice_template_attachment_type,
          file_path: addFilePath(
            fetchedNoticetDetails.notice_template_file_path,
          ),
          file: noticeTemplateFile,
        },

        supportDoc: supportingFile || [],

        uploadedNotice: {
          id: fetchedNoticetDetails.uploadedNotice_id,
          file_name: fetchedNoticetDetails.uploadedNotice_file_name,
          file_type: fetchedNoticetDetails.uploadedNotice_file_type,
          attachment_type: fetchedNoticetDetails.uploadedNotice_attachment_type,
          file_path: addFilePath(
            fetchedNoticetDetails.uploadedNotice_file_path,
          ),
          file: uploadedNoticeFile,
        },
        qbccNotice: {
          id: fetchedNoticetDetails.qbccNotice_id,
          file_name: fetchedNoticetDetails.qbccNotice_file_name,
          file_type: fetchedNoticetDetails.qbccNotice_file_type,
          attachment_type: fetchedNoticetDetails.qbccNotice_attachment_type,
          file_path: addFilePath(fetchedNoticetDetails.qbccNotice_file_path),
          file: qbccNoticeFile,
        },
        s75_file: {
          id: s75File?.id,
          file_name: s75File?.file_name,
          file_type: s75File?.file_type,
          attachment_type: s75File?.attachment_type,
          file_path: addFilePath(s75File?.file_path),
          file: s75FileBase64,
        },
        ViewType: view_type,
        status: fetchedNoticetDetails.status,
        company_id: fetchedNoticetDetails.company_id,
        company_name: fetchedNoticetDetails.company_name,
        company_email_id: fetchedNoticetDetails.company_email_id,
        project_id: fetchedNoticetDetails.project_id,
        project_name: fetchedNoticetDetails.project_name,
        project_date: fetchedNoticetDetails.project_date,
        contract_id: fetchedNoticetDetails.contract_id,
        contract_name: fetchedNoticetDetails.contract_name,
        contract_date: fetchedNoticetDetails.contract_date,
        client_supplier_id: fetchedNoticetDetails.client_supplier_id,
        client_supplier_name: fetchedNoticetDetails.client_supplier_name,
        client_supplier_type: fetchedNoticetDetails.client_supplier_type,
        client_email_id: fetchedNoticetDetails.client_email_id,
        bank_account_id: fetchedNoticetDetails.bank_account_id,
        bank_account_number: fetchedNoticetDetails.bank_account_number,
        bank_account_name: fetchedNoticetDetails.bank_account_name,
        payment_claim_id: fetchedNoticetDetails.payment_claim_id,
        payment_id: fetchedNoticetDetails.payment_id,
        contract_uuid: fetchedNoticetDetails.contract_uuid,

        // for source
        source_type: null,
        source_claim_details: null,
        notice_document_gen_failed: !isFileGenerated,
      };

      this.logger.log(
        `Details of a notice with id: ${data.id} has fetched successfully.`,
      );

      const claimSourceNotices = [
        'Client Payment Claim Notice',
        'Supplier Payment Remittance Advice Notice',
      ];

      const contractSourceNotices = [
        'Supplier S23 Project Trust Account Notice',
        'Supplier S23 Retention Trust Account Notice',
        'QBCC TA3 Notice Of Related Entities',
        'Supplier S18C Retention Trust Account Notice',
        'Supplier S18C Project Trust Account Notice',
      ];

      const accountSourceNotices = [
        'QBCC TA1 Project Trust Account Notice',
        'QBCC TA1 Retention Trust Account Notice',
        'Client S18B Project Trust Account Notice',
        'QBCC TA5 Nil Return Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA2 Retention Account Closing Notice',
      ];

      const paymentSourceNotices = [
        'Supplier Payment Schedule Notice',
        'QBCC TA4 Part Payment Notice',
        'Supplier Retention Payment Remittance Notice',
        'Supplier Retention Payment Schedule Notice',
        'Supplier Payment with Retention Withheld Notice',
        'Supplier Payment with Retention Schedule Notice',
      ];

      if (claimSourceNotices.includes(fetchedNoticetDetails.notice_type)) {
        fetchedNoticeDetailsMapped.source_type = 'claim';

        const claimDetails = fetchedNoticetDetails.payment_claim_id
          ? await this.paymentClaimsRepo.findOne({
              where: {
                payment_claim_id: fetchedNoticetDetails.payment_claim_id,
              },
            })
          : null;

        const payments = fetchedNoticetDetails.payment_claim_id
          ? await this.paymentsRepo.find({
              where: {
                payment_claim_id: fetchedNoticetDetails.payment_claim_id,
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
              select: [
                'payment_id',
                'payment_type',
                'cash_retention',
                'current_status',
                'payless_amount',
                'total_amount',
              ],
            })
          : [];

        let retention_details;
        if (claimDetails?.cash_retention_type === 'Retention claim') {
          retention_details = await this.retentionDetailsRepo.findOne({
            where: {
              retention_id: claimDetails.retention_id,
            },
            select: ['beneficiary_type', 'retention_id'],
          });
        }

        fetchedNoticeDetailsMapped.source_claim_details = {
          claim_type: claimDetails?.claim_type ?? null,
          cash_retention_type: claimDetails?.cash_retention_type ?? null,
          beneficiary_type: retention_details?.beneficiary_type ?? null,
          payments: payments.map((p) => ({
            payment_id: p.payment_id,
            payment_type: p.payment_type,
          })),
        };
      } else if (
        contractSourceNotices.includes(fetchedNoticetDetails.notice_type)
      ) {
        fetchedNoticeDetailsMapped.source_type = 'contract';
      } else if (
        accountSourceNotices.includes(fetchedNoticetDetails.notice_type)
      ) {
        fetchedNoticeDetailsMapped.source_type = 'account';
      } else if (
        paymentSourceNotices.includes(fetchedNoticetDetails.notice_type)
      ) {
        fetchedNoticeDetailsMapped.source_type = 'payment';
      } else {
        fetchedNoticeDetailsMapped.source_type = null;
      }

      return fetchedNoticeDetailsMapped;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a notice with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchDetailsOfANoticeMail(data: fetchNoticeMailInput) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a notice mail with data: ${JSON.stringify(data)}`,
      );

      const { id } = data;
      const fetchedNoticetMailDetails = await this.noticeMailRepo
        .createQueryBuilder('noticeMail')
        .select([
          'noticeMail.id AS id',
          'noticeMail.notice_mail_id AS notice_mail_id',
          'noticeMail.notice_id AS notice_id',
          'noticeMail.email_to AS email_to',
          'noticeMail.email_cc AS email_cc',
          'noticeMail.email_from AS email_from',
          'noticeMail.email_subject AS email_subject',
          'noticeMail.email_content AS email_content',
          'notice.supporting_file_attachment_ids AS supporting_file_attachment_ids',
        ])
        .leftJoin('noticeMail.noticeDetails', 'notice')
        .leftJoinAndSelect('notice.uploaded_notice', 'uploadedNotice')
        .where('noticeMail.id = :id', { id })
        .getRawOne();

      const UPLOAD_BASE_URL = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');

      const addFilePath = (filePath: string | null) => {
        if (!filePath) return null;
        const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        return UPLOAD_BASE_URL + '/' + normalized;
      };

      let supportFileIds: string[] = [];
      let supportDocs: any[] = [];

      if (fetchedNoticetMailDetails?.supporting_file_attachment_ids) {
        supportFileIds =
          fetchedNoticetMailDetails?.supporting_file_attachment_ids
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
      }

      if (supportFileIds.length > 0) {
        const fetchedFileAttachments = await this.fileAttachments
          .createQueryBuilder('f')
          .select([
            `f.id AS id`,
            `f.file_path AS file_path`,
            `f.file_name AS file_name`,
            `f.custom_file_name AS custom_file_name`,
            `f.file_type AS file_type`,
            `f.name AS name`,
            `f.uploaded_on AS uploaded_on`,
            `f.attachment_type AS attachment_type`,
          ])
          .where('f.id IN (:...ids)', { ids: supportFileIds })
          .orderBy({ 'f.uploaded_on': 'DESC' })
          .getRawMany();

        for (const f of fetchedFileAttachments) {
          supportDocs.push({
            id: f.id,
            file_name: f.custom_file_name ?? f.file_name,
            file_type: f.file_type,
            attachment_type: f.attachment_type,
            file_path: addFilePath(f.file_path),
            file: await this.addFileBase64FromStorage(f.file_path, f.file_type),
          });
        }
      }

      const fetchedNoticeMailDetailsMapped = {
        id: fetchedNoticetMailDetails.id,
        notice_mail_id: fetchedNoticetMailDetails.notice_mail_id,
        notice_id: fetchedNoticetMailDetails.notice_id,
        email_to: fetchedNoticetMailDetails.email_to,
        email_from: fetchedNoticetMailDetails.email_from,
        email_cc: fetchedNoticetMailDetails.email_cc,
        email_subject: fetchedNoticetMailDetails.email_subject,
        email_content: fetchedNoticetMailDetails.email_content,

        uploadedNotice: {
          id: fetchedNoticetMailDetails.uploadedNotice_id,
          file_name: fetchedNoticetMailDetails.uploadedNotice_file_name,
          file_type: fetchedNoticetMailDetails.uploadedNotice_file_type,
          attachment_type:
            fetchedNoticetMailDetails.uploadedNotice_attachment_type,
          file_path: addFilePath(
            fetchedNoticetMailDetails.uploadedNotice_file_path,
          ),
          file: await this.addFileBase64FromStorage(
            fetchedNoticetMailDetails.uploadedNotice_file_path,
            fetchedNoticetMailDetails.uploadedNotice_file_type,
          ),
        },

        supportDoc: supportDocs,
      };

      this.logger.log(
        `Details of a notice mail with id: ${data.id} has fetched successfully.`,
      );

      return fetchedNoticeMailDetailsMapped;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async generateNoticeMail(
    data: GenerateMailForANoticeInput,
    userId: number,
    mailTemplate,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for generating mail for notice with data: ${JSON.stringify(data)}`,
      );

      const repo = manager ?? this.entityManager;

      const notice = await this.fetchDetailsOfANotice(data, manager);

      const claim = notice.payment_claim_id
        ? await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: notice.payment_claim_id },
          })
        : null;

      // const claim = notice.payment_claim_id
      //   ? await this.paymentClaimsRepo.findOne({
      //     where: { payment_claim_id: notice.payment_claim_id },
      //   })
      //   : null;

      const payment = notice.payment_id
        ? await repo.findOne(PaymentDetails, {
            where: { payment_id: notice.payment_id },
          })
        : null;

      // const payment = notice.payment_id
      //   ? await this.paymentsRepo.findOne({
      //     where: { payment_id: notice.payment_id },
      //   })
      //   : null;

      const user = await repo.findOne(UserDetails, {
        where: { user_id: userId },
      });

      // const user = await this.userDetails.findOne({
      //   where: { user_id: userId },
      // });

      const mailDynamicData = {
        notice_type: notice.notice_type,
        client_supplier_name: notice.client_supplier_name,
        company_name: notice.company_name,
        project_name: notice.project_name || ' ',
        account_name: notice.bank_account_name || ' ',
        first_name: user.first_name,
        last_name: user.last_name,
      };

      if (
        data.has_import_button &&
        notice.notice_type === 'Client Payment Claim Notice' &&
        claim &&
        claim.id
      ) {
        mailDynamicData['siteName'] = 'Import this Claim';
        mailDynamicData['siteLink'] =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[11]}` +
          `${notice.company_id}` +
          `&importid=${claim.id}` +
          `&from=log`;
      } else if (
        data.has_import_button &&
        [
          'Supplier Payment Schedule Notice',
          'Supplier Payment Remittance Advice Notice',
          'Supplier Retention Payment Schedule Notice',
          'Supplier Payment with Retention Schedule Notice',
        ].includes(notice.notice_type) &&
        payment &&
        payment.id
      ) {
        mailDynamicData['siteName'] = 'Import this Payment';
        mailDynamicData['siteLink'] =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[10]}` +
          `${notice.company_id}` +
          `&importid=${payment.id}` +
          `&from=log`;
      }
      if (!notice.notice_type.toLowerCase().includes('qbcc')) {
        mailDynamicData['importNoticeLink'] =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[42]}` +
          `${notice.company_id}` +
          `&importid=${notice.id}`;
      }

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      const noticeData = {
        notice_id: notice.notice_id,
        email_from: notice.company_name,
        email_to: notice.client_email_id,
        email_subject: `Notice id: ${notice.notice_id} - ${notice.project_name} - ${notice.notice_type}`,
        email_content: String(mailbody),
      };

      const newNoticeMail = repo.create(NoticeMail, {
        ...noticeData,
        ...{ created_by: userId },
      });

      const noticeMailDetails = await repo.save(newNoticeMail);

      await repo.update(
        NoticeMail,
        { id: noticeMailDetails.id },
        { notice_mail_id: Number(noticeMailDetails.notice_mail_id) + 1000000 },
      );

      // const savedNoticeMailDetails =
      //   await this.noticeMailRepo.save(noticeMailDetails);

      this.logger.log(
        `Notice Mail generated successfully with id: ${noticeMailDetails.notice_mail_id}`,
      );

      return framedResponse('SUCCESS', `Notice mail generated successfully.`, {
        id: noticeMailDetails.id,
        notice_mail_id: Number(noticeMailDetails.notice_mail_id),
        notice_id: Number(notice.notice_id),
      });
    } catch (error) {
      this.logger.error(
        `Errored while generating a notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleGenerateMailForANotice(
    decoded: any,
    payload: GenerateMailForANoticeInput,
    manager?: EntityManager,
  ): Promise<generateNoticeMailResponse> {
    try {
      // Ensure has_import_button is always present
      this.logger.log(`Handles the generate mail with Payload: ${payload}`);
      if (
        Object.keys(payload).length !== 0 &&
        !Object.keys(payload).includes('has_import_button')
      ) {
        payload['has_import_button'] = false;
      }

      payload.has_import_button = !payload.has_import_button
        ? (await this.fetchNoticeDetails(payload.id, manager)).has_import_button
        : payload.has_import_button;

      this.logger.log(
        `Final resolved has_import_button: ${payload.has_import_button}`,
      );

      // Fetch template based on condition
      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          payload.has_import_button
            ? 'notice-to-client-supplier-import'
            : 'notice-to-client-supplier',
        );

      // Call the existing mail generation function
      const resp = await this.generateNoticeMail(
        payload,
        decoded?.userId,
        mailTemplate,
        manager,
      );
      return resp;
    } catch (error) {
      this.logger.error(
        `Errored in handleGenerateMailForANotice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  async calculateOutstandingAmount(
    payment_id: number,
    manager?: EntityManager,
  ): Promise<number> {
    let outstanding_amount = 0;

    this.logger.log(
      `Calculating Outstanding amount for the payment payment_id: ${payment_id}`,
    );

    // 1. Get payment details first
    // 1. Get payment details + claim details in one shot
    const paysRepo = manager
      ? manager.getRepository(PaymentDetails)
      : this.paymentsRepo;

    const payment_details = await paysRepo
      .createQueryBuilder('p')
      .leftJoin('p.paymentClaims', 'pc')
      .select([
        'p.payment_id AS payment_id',
        'p.payment_type AS payment_type',
        'p.payment_claim_id AS payment_claim_id',
        'p.total_amount AS total_amount',
        'p.payless_amount AS payless_amount',
        'pc.claim_amount AS claim_amount',
        'pc.retention_amount_with_gst AS retention_amount',
      ])
      .where('p.payment_id = :payment_id', { payment_id })
      .getRawOne();

    if (!payment_details) {
      this.logger.log(`No payment found with id: ${payment_id}`);

      throw new Error(`No payment found with id: ${payment_id}`);
    }

    const payable_payment_types = [
      'Full',
      'Part',
      'Pay Less - Full',
      'Pay Less - Part',
      'Pay - Zero',
      '3rd Party',
    ];

    if (payable_payment_types.includes(payment_details.payment_type)) {
      // 2. Fetch all payments under the same claim

      const payments = await paysRepo
        .createQueryBuilder('p')
        .select([
          'p.payment_type AS payment_type',
          'p.payless_amount AS payless_amount',
          'p.total_amount AS total_amount',
          'payment.amount AS payment_amount',
        ])
        .where('p.payment_claim_id = :payment_claim_id', {
          payment_claim_id: payment_details.payment_claim_id,
        })
        .andWhere("p.current_status != 'Deleted'")
        .andWhere(
          `p.payment_type NOT IN (
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier'
        )`,
        )
        .leftJoin(
          'p.subPayments',
          'payment',
          `payment.sub_payment_type = 'Payment'`,
        )
        .orderBy({ 'p.created_on': 'DESC' })
        .getRawMany();

      // 3. Effective claim amount = claim - retention
      let effective_claim_amount =
        parseFloat(payment_details.claim_amount) || 0;
      if (payment_details.retention_amount) {
        effective_claim_amount -= parseFloat(payment_details.retention_amount);
      }

      // // 3. Pick out payless payments
      // const payless_payments = payments.filter(
      //   (payment) =>
      //     payment.payment_type === 'Pay Less - Full' ||
      //     payment.payment_type === 'Pay Less - Part',
      // );

      // // 4. Sum eligible payments
      let existingTotalAmount = 0;

      const hasThirdPartyOrZero = payments.some(
        (p) =>
          p.payment_type === '3rd Party' || p.payment_type === 'Pay - Zero',
      );

      if (hasThirdPartyOrZero) {
        outstanding_amount = payment_details.claim_amount;
      } else if (payments && payments.length > 0) {
        for (const payment of payments) {
          if (
            payment.payment_type === 'Full' ||
            payment.payment_type === 'Part' ||
            payment.payment_type === 'Pay Less - Full' ||
            payment.payment_type === 'Pay Less - Part'
          ) {
            existingTotalAmount += Math.abs(parseFloat(payment.payment_amount));
          }
        }

        // console.log("total paid:", existingTotalAmount, "effect_claim:", effective_claim_amount)

        // 5. Calculate outstanding
        outstanding_amount = effective_claim_amount - existingTotalAmount;
        if (outstanding_amount < 0) outstanding_amount = 0;
      }
    } else {
      outstanding_amount = payment_details.claim_amount;
    }
    this.logger.log(
      `Outstanding amount of payment-id: ${payment_id} calculated as ${JSON.stringify(outstanding_amount)}`,
    );

    return outstanding_amount;
  }

  async generateNoticeDocument(
    data: GenerateMailForANoticeInput,
    decoded,
    manager?: EntityManager,
  ) {
    try {
      const { id } = data;

      this.logger.log(
        `Handling request for generating document pdf for notice with data: ${JSON.stringify(data)}`,
      );

      const useRepo = (repo) =>
        manager ? manager.getRepository(repo.target) : repo;

      const notice = await useRepo(this.noticesRepo)
        .createQueryBuilder('notice')
        .leftJoinAndSelect('notice.clientSupplierDetails', 'client')
        .leftJoinAndSelect('notice.projectDetails', 'project')
        .where('notice.id = :id', { id: data.id })
        .getOne();

      const company = await useRepo(this.companyDetails).findOne({
        where: { company_id: notice.company_id },
      });

      const companyUserRole = await this.companyUserRolesRepo.findOne({
        where: {
          company_id: notice.company_id,
          company_role: In(['PRIMARY ADMIN']),
          status: 'Active',
        },
      });

      const companyAdmin = companyUserRole
        ? await this.userDetails.findOne({
            where: { user_id: companyUserRole.user_id },
          })
        : null;

      let logoBase64;
      if (company.logo_id) {
        let logoDetails = await this.fileAttachments.findOne({
          where: { id: company.logo_id },
          select: ['file_path', 'file_type'],
        });

        logoBase64 = await this.addFileBase64FromStorage(
          logoDetails.file_path,
          logoDetails.file_type,
        );
      }

      const subscription = await this.companySubscriptionPlan.findOne({
        where: { company_id: notice.company_id },
      });

      const project = await useRepo(this.projectDetails).findOne({
        where: { project_id: notice.project_id },
      });

      // const contracts = await this.contractDetails.findOne({
      //   where: notice.contract_id
      //   ? { contract_id: notice.contract_id }
      //   : { contract_id: null },
      // });

      const contracts = await useRepo(this.contractDetails)
        .createQueryBuilder('contract')
        .where(
          notice.contract_id !== null
            ? 'contract.contract_id = :contract_id'
            : 'contract.contract_id IS NULL',
          {
            contract_id: notice.contract_id,
          },
        )
        .getOne();

      const bankAccount = await useRepo(this.bankAccountsRepo).findOne({
        where: { bank_account_id: notice.bank_account_id },
      });

      // const clientSupplier = await this.clientSupplierRepo.findOne({
      //   where: { client_supplier_id: notice.client_supplier_id },
      //   relations: ['companyDetails'],
      // });

      const clientSupplier = await useRepo(this.clientSupplierRepo)
        .createQueryBuilder('clientSupplier')
        .leftJoinAndSelect('clientSupplier.companyDetails', 'companyDetails')
        .where(
          notice.client_supplier_id !== null
            ? 'clientSupplier.client_supplier_id = :client_supplier_id'
            : 'clientSupplier.client_supplier_id IS NULL',
          { client_supplier_id: notice.client_supplier_id },
        )
        .getOne();

      const payment_claim_details = notice.payment_claim_id
        ? await useRepo(this.paymentClaimsRepo).findOne({
            where: { payment_claim_id: notice.payment_claim_id },
          })
        : null;

      const claimDate = payment_claim_details
        ? payment_claim_details.claim_type === 'Billable'
          ? payment_claim_details.received_date
          : payment_claim_details.sent_date
        : null;

      const claim_invoice_details = notice.payment_claim_id
        ? await useRepo(this.claimInvoiceRepo).find({
            where: { payment_claim_id: notice.payment_claim_id },
          })
        : [];

      const payment_details = notice.payment_id
        ? await useRepo(this.paymentsRepo).findOne({
            where: { payment_id: notice.payment_id },
          })
        : null;

      let retention_details;
      if (payment_details?.retention_id) {
        retention_details = await useRepo(this.retentionDetailsRepo).findOne({
          where: {
            retention_id: payment_details.retention_id,
          },
        });
      } else {
        retention_details = await useRepo(this.subPaymentsRepo).findOne({
          where: {
            payment_id: notice.payment_id,
            sub_payment_type: In(['Retention', 'Retention In']),
          },
        });
      }

      const portalAdmin_details = await this.adminDetails.findOne({
        where: {
          // admin_role: In(['PORTAL ADMIN']),
          // admin_id: 1001,
          admin_role: Role.PORTAL_ADMIN,
          admin_status: 'Active',
        },
      });

      const AccDelegation = await this.getSubscriptionType(
        notice.company_id,
        notice.bank_account_id,
        manager,
      );

      const userLoggedIn = await this.userDetails.findOne({
        where: { user_id: decoded?.userId },
      });

      const timezone = userLoggedIn.user_timezone || 'UTC';

      function convertToLocalDate(utcDateStr): {
        d1: number;
        d2: number;
        m1: number;
        m2: number;
        y1: number;
        y2: number;
        y3: number;
        y4: number;
        dd: string;
        mm: string;
        yyyy: string;
        ddmmyyyy: string;
        noticeDate: string;
      } {
        // Parse the input UTC date string
        if (!utcDateStr) return;

        const utcDate = new Date(utcDateStr);

        if (isNaN(utcDate.getTime())) {
          throw new Error('Invalid UTC date string provided');
        }

        // Use `Intl.DateTimeFormat` to format the date in the desired timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        // Extract formatted parts (day, month, year)
        const parts = formatter?.formatToParts(utcDate);
        const dateParts: Record<string, string> = {};
        parts?.forEach(({ type, value }) => {
          if (type === 'year' || type === 'month' || type === 'day') {
            dateParts[type] = value;
          }
        });

        const dd = dateParts.day ?? '00';
        const mm = dateParts.month ?? '00';
        const yyyy = dateParts.year ?? '0000';

        // Split into individual digits
        const d1 = Number(dd[0]);
        const d2 = Number(dd[1]);
        const m1 = Number(mm[0]);
        const m2 = Number(mm[1]);
        const y1 = Number(yyyy[0]);
        const y2 = Number(yyyy[1]);
        const y3 = Number(yyyy[2]);
        const y4 = Number(yyyy[3]);

        // Build formatted date strings
        const ddmmyyyy = `${dd}/${mm}/${yyyy}`;
        const noticeDate = `${dd}${mm}${yyyy}`;

        return {
          d1,
          d2,
          m1,
          m2,
          y1,
          y2,
          y3,
          y4,
          dd,
          mm,
          yyyy,
          ddmmyyyy,
          noticeDate,
        };
      }

      function convertPhoneNumber(phoneNumber: string): string {
        const countryCodes = ['+1', '+44', '+61', '+91', '+33']; // Country codes for US, UK, Australia, Canada, India, France

        let countryCodeLength = 0;

        for (let code of countryCodes) {
          if (phoneNumber.startsWith(code)) {
            countryCodeLength = code.length;
            break;
          }
        }

        if (countryCodeLength > 0) {
          return '0' + phoneNumber.slice(countryCodeLength);
        }

        return phoneNumber;
      }

      let pdfData,
        noticeData = {};

      if (notice.notice_type == 'Client Payment Claim Notice') {
        let total_amount = 0;

        const invoiceList = claim_invoice_details.map((detail) => {
          const invoiceDetail = {
            description: detail.description,
            quantity: Math.round(detail.quantity),
            unit_price: '$' + detail.unit_price,
            gst: '$' + detail.gst,
            total_amount_including_gst: '$' + detail.total_amount_including_gst,
          };

          total_amount += Number(detail.total_amount_including_gst);
          return invoiceDetail;
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          claimInvoiceDetails: {
            due: convertToLocalDate(payment_claim_details.due_date),
            contract: contracts.contract_name,
            terms: contracts.payment_terms + ' days',
            project: notice.projectDetails.project_name,
            invoice_list: invoiceList,
            invoice_id: notice.notice_id,
            invoice_date: convertToLocalDate(claimDate),
            total: '$' + total_amount.toFixed(2),
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (notice.notice_type == 'Supplier Payment Schedule Notice') {
        let total_claimed_amount = 0;
        let retention_amount = 0;

        const outstanding_amount = await this.calculateOutstandingAmount(
          payment_details.payment_id,
          manager,
        );

        this.logger.log(`outstanding_amount: ${outstanding_amount}`);

        let attachmentDetails;

        if (payment_details.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }

        if (
          payment_details.compulsory_attachment_ids &&
          payment_details.compulsory_attachment_ids.length > 0
        ) {
          attachmentDetails = await useRepo(this.fileAttachments).findOne({
            where: { id: payment_details.compulsory_attachment_ids[0] },
            select: ['file_path', 'file_name'],
          });
        }

        const invoiceList = claim_invoice_details.map((detail) => {
          const invoiceDetail = {
            description: detail.description,
            total_amount_including_gst: formatCurrency(
              detail.total_amount_including_gst,
            ),
          };

          total_claimed_amount += Number(detail.total_amount_including_gst);
          return invoiceDetail;
        });

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          sign: subscription?.signature ? subscription.signature : ' ',
          paymentScheduleDetails: {
            invoice_list: invoiceList,
            invoice_id: notice.notice_id,
            claim_id: payment_claim_details.payment_claim_id,
            claim_date: convertToLocalDate(claimDate),
            claim_amount: formatCurrency(total_claimed_amount),
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? null : formatCurrency(retention_amount),
            memo: 'Retention',
            outstanding_amount:
              outstanding_amount == 0
                ? null
                : formatCurrency(outstanding_amount),
            withheld_reason: payment_details.withhold_payment_reason,
            invoice_date: convertToLocalDate(payment_claim_details.created_on),
            due: convertToLocalDate(claimDate),
            total: formatCurrency(total_claimed_amount),
            attachments: attachmentDetails?.file_name,
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (
        notice.notice_type == 'Supplier Payment with Retention Schedule Notice'
      ) {
        let total_claimed_amount = 0;
        let retention_amount = 0;
        let attachmentDetails;

        const outstanding_amount = await this.calculateOutstandingAmount(
          payment_details.payment_id,
          manager,
        );

        if (payment_details.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }

        if (
          payment_details.compulsory_attachment_ids &&
          payment_details.compulsory_attachment_ids.length > 0
        ) {
          attachmentDetails = await useRepo(this.fileAttachments).findOne({
            where: { id: payment_details.compulsory_attachment_ids[0] },
            select: ['file_path', 'file_name'],
          });
        }

        const invoiceList = claim_invoice_details.map((detail) => {
          const invoiceDetail = {
            description: detail.description,
            total_amount_including_gst: formatCurrency(
              detail.total_amount_including_gst,
            ),
          };

          total_claimed_amount += Number(detail.total_amount_including_gst);
          return invoiceDetail;
        });

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          sign: subscription?.signature ? subscription.signature : ' ',
          paymentScheduleDetails: {
            invoice_list: invoiceList,
            invoice_id: notice.notice_id,
            claim_id: payment_claim_details.payment_claim_id,
            claim_date: convertToLocalDate(claimDate),
            claim_amount: formatCurrency(total_claimed_amount),
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? null : formatCurrency(retention_amount),
            memo: 'Retention',
            outstanding_amount:
              outstanding_amount == 0
                ? null
                : formatCurrency(outstanding_amount),
            withheld_reason: payment_details.withhold_payment_reason,
            invoice_date: convertToLocalDate(claimDate),
            due: convertToLocalDate(payment_claim_details.due_date),
            total: formatCurrency(total_claimed_amount),
            attachments: attachmentDetails?.file_name,
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (notice.notice_type == 'Supplier Retention Payment Schedule Notice') {
        let total_claimed_amount = 0;
        let retention_amount = 0;
        let attachmentDetails;

        if (payment_details.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }

        if (
          payment_details.compulsory_attachment_ids &&
          payment_details.compulsory_attachment_ids.length > 0
        ) {
          attachmentDetails = await useRepo(this.fileAttachments).findOne({
            where: { id: payment_details.compulsory_attachment_ids[0] },
            select: ['file_path', 'file_name'],
          });
        }

        const outstanding_amount = await this.calculateOutstandingAmount(
          payment_details.payment_id,
          manager,
        );

        const invoiceList = claim_invoice_details.map((detail) => {
          const invoiceDetail = {
            description: detail.description,
            total_amount_including_gst: formatCurrency(
              detail.total_amount_including_gst,
            ),
          };

          total_claimed_amount += Number(detail.total_amount_including_gst);
          return invoiceDetail;
        });

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          sign: subscription?.signature ? subscription.signature : ' ',
          paymentScheduleDetails: {
            invoice_list: invoiceList,
            invoice_id: notice.notice_id,
            claim_id: payment_claim_details.payment_claim_id,
            claim_date: convertToLocalDate(claimDate),
            claim_amount: formatCurrency(total_claimed_amount),
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? null : '$' + retention_amount,
            memo: 'Retention',
            outstanding_amount: outstanding_amount,
            withheld_reason: payment_details.withhold_payment_reason,
            invoice_date: convertToLocalDate(claimDate),
            due: convertToLocalDate(payment_claim_details.due_date),
            total: formatCurrency(total_claimed_amount),
            attachments: attachmentDetails?.file_name,
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (notice.notice_type == 'Client S18B Project Trust Account Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            account_number: bankAccount.account_number,
            sign: subscription?.signature ? subscription.signature : ' ',
            opening_date: convertToLocalDate(bankAccount.opening_date),
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Supplier S23 Project Trust Account Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          sign: subscription?.signature ? subscription.signature : ' ',
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            dateO: convertToLocalDate(bankAccount.opening_date),
            account_number: bankAccount.account_number,
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Supplier S23 Retention Trust Account Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          sign: subscription?.signature ? subscription.signature : ' ',
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier?.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            account_number: bankAccount.account_number,
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Supplier S18C Project Trust Account Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          sign: subscription?.signature ? subscription.signature : ' ',
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            dateO: convertToLocalDate(bankAccount.opening_date),
            account_number: bankAccount.account_number,
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Supplier S18C Retention Trust Account Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          sign: subscription?.signature ? subscription.signature : ' ',
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier?.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            account_number: bankAccount.account_number,
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Contracting Party Account Closing Notice') {
        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: paytradeLogo,
          noticeData: {
            invoice_id: notice.notice_id,
            project_description: project.project_description,
            project_address: project.site_address,
            client_supplier_name: clientSupplier.client_supplier_name,
            user_name: userLoggedIn.first_name + ' ' + userLoggedIn.last_name,
            account_name: bankAccount.account_name,
            bank_name: bank.institution_name,
            bsb: bankAccount.bsb_number,
            account_number: bankAccount.account_number,
            sign: subscription?.signature ? subscription.signature : ' ',
            opening_date: convertToLocalDate(bankAccount.opening_date),
            notice_date: convertToLocalDate(notice.created_on),
          },
        };
      }

      if (notice.notice_type == 'Supplier Payment Remittance Advice Notice') {
        let retention_amount = 0;

        const toBankAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: { bank_account_id: payment_details.payment_to_account },
        });

        if (payment_details.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }
        const retentiomBankAccount = await useRepo(
          this.bankAccountsRepo,
        ).findOne({
          where: { bank_account_id: payment_details.retention_account },
        });

        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: retentiomBankAccount.financial_institution },
        });

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          notice_date: convertToLocalDate(notice.created_on),
          RemittanceAdviceDetails: {
            claim_date: convertToLocalDate(claimDate),
            claim_id: payment_claim_details.payment_claim_id,
            payment_date: convertToLocalDate(payment_details.payment_date),
            account_name: toBankAccount.account_name,
            bsb: toBankAccount.bsb_number,
            acc_number: toBankAccount.account_number,
            ret_account_finins: bank.institution_name,
            ret_account_name: retentiomBankAccount.account_name,
            ret_bsb: retentiomBankAccount.bsb_number,
            ret_acc_number: retentiomBankAccount.account_number,
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? '0.00' : formatCurrency(retention_amount),
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (
        notice.notice_type == 'Supplier Retention Payment Remittance Notice'
      ) {
        let retention_amount = 0;

        if (payment_details?.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }

        if (payment_details?.retention_id) {
          retention_amount =
            retention_details.retained_amount - payment_details.total_amount;
        }

        const toBankAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: { bank_account_id: payment_details.payment_to_account },
        });

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          RemittanceAdviceDetails: {
            claim_date: convertToLocalDate(claimDate),
            claim_id: payment_claim_details.payment_claim_id,
            payment_date: convertToLocalDate(payment_details.payment_date),
            account_name: toBankAccount.account_name,
            bsb: toBankAccount.bsb_number,
            acc_number: toBankAccount.account_number,
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? '0.00' : formatCurrency(retention_amount),
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (
        notice.notice_type == 'Supplier Payment with Retention Withheld Notice'
      ) {
        let retention_amount = 0;

        const toBankAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: { bank_account_id: payment_details.payment_to_account },
        });

        const retentiomBankAccount = await useRepo(
          this.bankAccountsRepo,
        ).findOne({
          where: { bank_account_id: payment_details.retention_account },
        });

        if (payment_details.cash_retention === true) {
          if (retention_details) {
            retention_amount = retention_details.amount;
          }
        }

        pdfData = {
          paytradeLogo: logoBase64 ? logoBase64 : null,
          paymentRetWithheldDetails: {
            claim_date: convertToLocalDate(claimDate),
            claim_id: payment_claim_details.payment_claim_id,
            payment_date: convertToLocalDate(payment_details.payment_date),
            account_name: toBankAccount.account_name,
            bsb: toBankAccount.bsb_number,
            acc_number: toBankAccount.account_number,
            ret_account_name: retentiomBankAccount.account_name,
            ret_bsb: retentiomBankAccount.bsb_number,
            ret_acc_number: retentiomBankAccount.account_number,
            payment_amount: formatCurrency(payment_details.total_amount),
            retention_amount:
              retention_amount == 0 ? null : formatCurrency(retention_amount),
          },

          fromDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            phone: company.company_phone_no,
          },

          toDetails: {
            name: clientSupplier.client_supplier_name,
            company: clientSupplier.business_name || '',
            address: clientSupplier.client_supplier_address,
            abn: clientSupplier.abn_number,
            acn: clientSupplier.acn_number,
            phone: clientSupplier.client_phone_no,
          },
        };
      }

      if (notice.notice_type == 'QBCC TA4 Part Payment Notice') {
        const allContractOfProject = await useRepo(this.contractDetails).find({
          where: { project_id: notice.project_id },
        });

        const subcontractorContracts = allContractOfProject.filter(
          (contract) => contract.client_supplier_role === 'Sub Contractor',
        );

        const clientSupplierIds = subcontractorContracts.map(
          (subcontract) => subcontract.client_supplier_id,
        );

        // Query clientSupplierRepo for all subcontractor details
        const sub_contractors = await useRepo(this.clientSupplierRepo).find({
          where: { client_supplier_id: In(clientSupplierIds) },
        });

        const trustAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: { project_ids: In([project.project_id]) },
        });

        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          contract: {
            party: clientSupplier.client_supplier_name,
            date: contracts.contract_date
              ? convertToLocalDate(contracts.contract_date)
              : convertToLocalDate(trustAccount?.contract_date),
            desc: project.project_description,
            address: project.site_address,
            sub: project.region,
            country: project.country,
            state: await this.getStateCodeFromPlaceId(project.place_id),
          },
          trustAcct: {
            name: trustAccount?.account_name,
            bsb: trustAccount?.bsb_number,
            dateO: trustAccount?.account_name
              ? convertToLocalDate(trustAccount?.opening_date)
              : '',
            accno: trustAccount?.account_number,
            finIns: bank.institution_name,
          },

          declaration: {
            name: approver,
            position: approver_position,
          },

          subCont: sub_contractors,
        };

        noticeData = {
          trusteeName: pdfData.trusteeDetails?.name || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          trusteePostCode: pdfData.trusteeDetails?.postcode || '',
          trusteeState: pdfData.trusteeDetails?.state || '',
          trusteePhone: pdfData.trusteeDetails?.phone || '',
          trusteeEmail: pdfData.trusteeDetails?.mail || '',
          contractingParty: pdfData.contract?.party || '',
          contractDate: pdfData.contract?.date?.noticeDate || '',
          projectDescription: pdfData.contract?.desc || '',
          contractSiteAddress: pdfData.contract?.address || '',
          contractSubUrb: pdfData.contract?.sub || '',
          contractPostCode: pdfData.contract?.postcode || '',
          contractState: pdfData.contract?.state || '',
          haveMultipleProjects: pdfData.contract?.haveMultipleProjects || '',
          trusteeAccountName: pdfData.trustAcct?.name || '',
          trusteeFinancialInstituitionName: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.finIns
            : '',
          trusteeBsb: pdfData.trustAcct?.name
            ? `${pdfData.trustAcct?.bsb}`
            : '',
          trusteeAccountNumber: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.accno
            : '',
          trusteeDateOpened: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.dateO?.noticeDate
            : '',
          subcontractorName1: pdfData?.subcontractorName1 || '',
          subcontractorAmountDue1: pdfData?.subcontractorAmountDue1 || '',
          subcontractorAmountPaid1: pdfData?.subcontractorAmountPaid1 || '',
          subcontractorDatePaid1: pdfData?.subcontractorDatePaid1 || '',
          subcontractorName2: pdfData?.subcontractorName2 || '',
          subcontractorAmountDue2: pdfData?.subcontractorAmountDue2 || '',
          subcontractorAmountPaid2: pdfData?.subcontractorAmountPaid2 || '',
          subcontractorDatePaid2: pdfData?.subcontractorDatePaid2 || '',
          subcontractorAmountDue3: pdfData?.subcontractorAmountDue3 || '',
          subcontractorAmountPaid3: pdfData?.subcontractorAmountPaid3 || '',
          subcontractorDatePaid3: pdfData?.subcontractorDatePaid3 || '',
          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationCheckbox4: true || '',
          declarationCheckbox5: true || '',
          declarationCheckbox6: true || '',
          declarationName: pdfData.declaration?.name || '',
          declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA5 Nil Return Notice') {
        const bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },

          trustAcct: {
            name: bankAccount.account_name,
            bsb: bankAccount.bsb_number,
            dateO: bankAccount.account_name
              ? convertToLocalDate(bankAccount.opening_date)
              : '',
            accno: bankAccount.account_number,
            finIns: bank.institution_name,
          },

          declaration: {
            name: approver,
            position: approver_position,
          },
        };
        noticeData = {
          ta5_trusteeName: pdfData.trusteeDetails?.name || '',
          ta5_trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          ta5_trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          ta5_trusteeState: pdfData.trusteeDetails?.state || '',
          ta5_trusteePhone: pdfData.trusteeDetails?.phone || '',
          ta5_trusteeEmail: pdfData.trusteeDetails?.mail || '',

          ta5_rtnAccountName: pdfData.trustAcct?.name || '',
          ta5_rtnFinancialInstituitionName: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.finIns
            : '',
          ta5_trusteeBsb: pdfData.trustAcct?.name
            ? `${pdfData.trustAcct?.bsb}`
            : '',
          ta5_trusteeAccountNumber: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.accno
            : '',

          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationCheckbox4: true || '',
          declarationCheckbox5: true || '',
          declarationCheckbox6: true || '',
          ta5_declarationName: pdfData.declaration?.name || '',
          ta5_declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          ta5_onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA1 Project Trust Account Notice') {
        const trustAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: {
            project_ids: In([project.project_id]),
            status: Not('Deleted'),
            // bank_account_id: notice.bank_account_id,
            account_type: 'Project Trust Account',
          },
        });

        const retentionAccount = await useRepo(this.bankAccountsRepo)
          .createQueryBuilder('b')
          .select([
            'b.id AS id',
            'b.bank_account_id AS bank_account_id',
            'b.account_name AS account_name',
            'b.account_type AS account_type',
            'b.bsb_number AS bsb_number',
            'b.opening_date AS opening_date',
            'b.account_number AS account_number',
            'b.financial_institution AS financial_institution',
          ])
          .where(
            "b.project_ids LIKE :project_id AND b.account_type = 'Retention Trust Account' AND b.status != 'Deleted'",
            {
              project_id: `%${project.project_id}%`,
            },
          )
          .getRawOne();

        // const retentionAccount = await this.bankAccountsRepo.findOne({
        //   where: {
        //     project_ids:  In([project.project_id]),
        //     account_type: 'Retention Trust Account',
        //   },
        // });

        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: trustAccount?.financial_institution },
        });

        let retnbank = await useRepo(this.bankDetails).findOne({
          where: { id: retentionAccount?.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          contract: {
            party: trustAccount?.account_name
              ? clientSupplier.client_supplier_name
              : ' ',
            date: trustAccount?.account_name
              ? convertToLocalDate(trustAccount?.contract_date)
              : ' ',
            desc: trustAccount?.account_name
              ? project.project_description
              : ' ',
            // desc: project.project_description,
            value: trustAccount?.account_name
              ? trustAccount?.contract_value
              : ' ',
            endDate: trustAccount?.account_name
              ? convertToLocalDate(
                  trustAccount?.contract_practical_completion_date,
                )
              : ' ',
            subContractDate: trustAccount?.account_name
              ? convertToLocalDate(trustAccount?.first_sub_contract_date)
              : ' ',
            address: trustAccount?.account_name ? project.site_address : ' ',
            sub: trustAccount?.account_name ? project.region : ' ',
            country: trustAccount?.account_name ? project.country : ' ',
            state: trustAccount?.account_name
              ? await this.getStateCodeFromPlaceId(project.place_id)
              : ' ',
          },
          trustAcct: {
            name: trustAccount?.account_name,
            bsb: trustAccount?.bsb_number,
            dateO: trustAccount?.account_name
              ? convertToLocalDate(trustAccount?.opening_date)
              : '',
            accno: trustAccount?.account_number,
            finIns: bank.institution_name,
          },
          retnAcct: {
            name: retentionAccount?.account_name,
            bsb: retentionAccount?.bsb_number,
            dateO: retentionAccount?.account_name
              ? convertToLocalDate(retentionAccount?.opening_date)
              : '',
            accno: retentionAccount?.account_number,
            finIns: retentionAccount?.account_name
              ? bank.institution_name
              : ' ',
          },

          declaration: {
            name: approver,
            position: approver_position,
          },
        };

        noticeData = {
          trusteeName: pdfData.trusteeDetails?.name || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          trusteePostCode: pdfData.trusteeDetails?.postcode || '',
          trusteeState: pdfData.trusteeDetails?.state || '',
          trusteePhone: pdfData.trusteeDetails?.phone || '',
          trusteeEmail: pdfData.trusteeDetails?.mail || '',
          trusteeAccountName: pdfData.trustAcct?.name || '',
          trusteeFinancialInstituitionName: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.finIns
            : '',
          trusteeBsb: pdfData.trustAcct?.name
            ? `${pdfData.trustAcct?.bsb}`
            : '',
          trusteeAccountNumber: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.accno
            : '',
          trusteeDateOpened: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.dateO?.noticeDate
            : '',
          contractingParty: pdfData.trustAcct?.name
            ? pdfData.contract?.party
            : '',
          contractDate: pdfData.trustAcct?.name
            ? pdfData.contract?.date?.noticeDate
            : '',
          completionDate: pdfData.trustAcct?.name
            ? pdfData.contract?.endDate?.noticeDate
            : '',
          subContractDate: pdfData.trustAcct?.name
            ? pdfData.contract?.subContractDate?.noticeDate
            : '',
          contractValue: pdfData.trustAcct?.name ? pdfData.contract?.value : '',
          projectDescription: pdfData.trustAcct?.name
            ? pdfData.contract?.desc
            : '',
          lotOnPlan: pdfData.contract?.lotOnPlan || '',
          contractSiteAddress: pdfData.trustAcct?.name
            ? pdfData.contract?.address
            : '',
          contractSubUrb: pdfData.trustAcct?.name ? pdfData.contract?.sub : '',
          contractPostCode: pdfData.trustAcct?.name
            ? pdfData.contract?.postcode
            : '',
          contractState: pdfData.trustAcct?.name ? pdfData.contract?.state : '',
          contractPhone: pdfData.trustAcct?.name
            ? pdfData.trusteeDetails?.phone
            : '',
          haveNoContractSiteAddress:
            pdfData.contract?.haveNoContractSiteAddress || '',
          haveMultipleProjects: pdfData.contract?.haveMultipleProjects || '',
          retentionAccountName: pdfData.retnAcct?.name || '',
          retentionFinancialInstitutionName: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.finIns
            : '',
          retentionBsb: pdfData.retnAcct?.name
            ? `${pdfData.retnAcct?.bsb}`
            : '',
          retentionAccountNumber: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.accno
            : '',
          retentionDateOpened: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.dateO?.noticeDate
            : '',
          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationName: pdfData.declaration?.name || '',
          declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA1 Retention Trust Account Notice') {
        // const trustAccount = await this.bankAccountsRepo.findOne({
        //   where: {
        //     project_ids: In([project.project_id]),
        //     status: Not('Deleted'),
        //     account_type: 'Project Trust Account',
        //   },
        // });

        const retentionAccount = await this.bankAccountsRepo
          .createQueryBuilder('b')
          .select([
            'b.id AS id',
            'b.bank_account_id AS bank_account_id',
            'b.account_name AS account_name',
            'b.account_type AS account_type',
            'b.bsb_number AS bsb_number',
            'b.opening_date AS opening_date',
            'b.account_number AS account_number',
            'b.financial_institution AS financial_institution',
          ])
          .where(
            "b.project_ids LIKE :project_id AND b.account_type = 'Retention Trust Account' AND b.status != 'Deleted'",
            {
              project_id: `%${project.project_id}%`,
            },
          )
          .getRawOne();

        // const retentionAccount = await this.bankAccountsRepo.findOne({
        //   where: {
        //     project_ids:  In([project.project_id]),
        //     account_type: 'Retention Trust Account',
        //   },
        // });

        // let bank = await this.bankDetails.findOne({
        //   where: { id: trustAccount?.financial_institution },
        // });

        let retnbank = await useRepo(this.bankDetails).findOne({
          where: { id: retentionAccount?.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          // contract: {
          //   party: retentionAccount?.account_name
          //     ? clientSupplier?.client_supplier_name
          //     : ' ',
          //   date: retentionAccount?.account_name
          //     ? convertToLocalDate(retentionAccount?.contract_date)
          //     : ' ',
          //   desc: retentionAccount?.contract_value
          //     ? project.project_description
          //     : ' ',
          //   address: retentionAccount?.contract_value ? project.site_address : ' ',
          //   value: retentionAccount?.contract_value
          //     ? retentionAccount?.contract_value
          //     : ' ',
          //   endDate: retentionAccount?.contract_practical_completion_date
          //     ? convertToLocalDate(
          //       retentionAccount?.contract_practical_completion_date,
          //       )
          //     : ' ',
          //   subContractDate: retentionAccount?.account_name
          //     ? convertToLocalDate(retentionAccount?.first_sub_contract_date)
          //     : ' ',
          //   sub: retentionAccount?.contract_value ? project?.region : ' ',
          //   country: retentionAccount?.contract_value ? project?.country : ' ',
          //   phone: retentionAccount?.contract_value
          //     ? convertPhoneNumber(company.company_phone_no)
          //     : ' ',
          //   state: retentionAccount?.contract_value
          //     ? await this.getStateCodeFromPlaceId(project.place_id)
          //     : ' ',
          // },

          retnAcct: {
            name: retentionAccount?.account_name,
            bsb: retentionAccount?.bsb_number,
            dateO: retentionAccount?.account_name
              ? convertToLocalDate(retentionAccount?.opening_date)
              : '',
            accno: retentionAccount?.account_number,
            finIns: retentionAccount?.account_name
              ? retnbank.institution_name
              : ' ',
          },

          declaration: {
            name: approver,
            position: approver_position,
          },
        };

        noticeData = {
          trusteeName: pdfData.trusteeDetails?.name || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          trusteePostCode: pdfData.trusteeDetails?.postcode || '',
          trusteeState: pdfData.trusteeDetails?.state || '',
          trusteePhone: pdfData.trusteeDetails?.phone || '',
          trusteeEmail: pdfData.trusteeDetails?.mail || '',
          trusteeAccountName: pdfData.trustAcct?.name || '',
          trusteeFinancialInstituitionName: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.finIns
            : '',
          trusteeBsb: pdfData.trustAcct?.name
            ? `${pdfData.trustAcct?.bsb}`
            : '',
          trusteeAccountNumber: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.accno
            : '',
          trusteeDateOpened: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.dateO?.noticeDate
            : '',
          contractingParty: pdfData.contract?.party || '',
          contractDate: pdfData.contract?.date?.noticeDate || '',
          completionDate: pdfData.contract?.endDate?.noticeDate || '',
          subContractDate: pdfData.contract?.subContractDate?.noticeDate || '',
          contractValue: pdfData.contract?.value || '',
          projectDescription: pdfData.contract?.desc || '',
          lotOnPlan: pdfData.contract?.lotOnPlan || '',
          contractSiteAddress: pdfData.contract?.address || '',
          contractSubUrb: pdfData.contract?.sub || '',
          contractPostCode: pdfData.contract?.postcode || '',
          contractState: pdfData.contract?.state || '',
          contractPhone: '',
          haveNoContractSiteAddress:
            pdfData.contract?.haveNoContractSiteAddress || '',
          haveMultipleProjects: pdfData.contract?.haveMultipleProjects || '',
          retentionAccountName: pdfData.retnAcct?.name || '',
          retentionFinancialInstitutionName: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.finIns
            : '',
          retentionBsb: pdfData.retnAcct?.name
            ? `${pdfData.retnAcct?.bsb}`
            : '',
          retentionAccountNumber: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.accno
            : '',
          retentionDateOpened: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.dateO?.noticeDate
            : '',
          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationName: pdfData.declaration?.name || '',
          declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA2 Account Closing Notice') {
        const trustAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: {
            bank_account_id: notice.bank_account_id,
            status: Not('Deleted'),
          },
        });

        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: trustAccount?.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          trustAcct: {
            name: trustAccount?.account_name,
            bsb: trustAccount?.bsb_number,
            dateO: trustAccount?.account_name
              ? convertToLocalDate(trustAccount?.opening_date)
              : '',
            accno: trustAccount?.account_number,
            finIns: bank?.institution_name || '',
          },
          declaration: {
            name: approver,
            position: approver_position,
          },
        };

        noticeData = {
          trusteeName: pdfData.trusteeDetails?.name || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          trusteePostCode: pdfData.trusteeDetails?.postcode || '',
          trusteeState: pdfData.trusteeDetails?.state || '',
          trusteePhone: pdfData.trusteeDetails?.phone || '',
          trusteeEmail: pdfData.trusteeDetails?.mail || '',
          isProjectTrust: true,
          isRetentionTrust: '',
          beforeAccountName: pdfData.trustAcct?.name || '',
          beforeFinancialInstitution: pdfData.trustAcct?.finIns || '',
          beforeBsb: pdfData.trustAcct?.name
            ? `${pdfData.trustAcct?.bsb}`
            : '',
          beforeAccountNumber: pdfData.trustAcct?.name
            ? pdfData.trustAcct?.accno
            : '',
          hasClosedAndEnded: true,
          dateAccountClosed: pdfData.notice_date?.noticeDate || '',
          hasTransferred: '',
          dateAccountTransferred: '',
          hasNameChanged: '',
          afterNameChangeAccountName: '',
          dateOfChange: '',
          afterTransferAccountName: '',
          afterFinancialInstitution: '',
          afterBsb: '',
          afterAccountNumber: '',
          afterDateOpened: '',
          afterDateIntended: '',
          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationName: pdfData.declaration?.name || '',
          declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA2 Retention Account Closing Notice') {
        const retentionAccount = await useRepo(this.bankAccountsRepo).findOne({
          where: {
            bank_account_id: notice.bank_account_id,
            status: Not('Deleted'),
          },
        });

        let retnbank = await useRepo(this.bankDetails).findOne({
          where: { id: retentionAccount?.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          retnAcct: {
            name: retentionAccount?.account_name,
            bsb: retentionAccount?.bsb_number,
            dateO: retentionAccount?.account_name
              ? convertToLocalDate(retentionAccount?.opening_date)
              : '',
            accno: retentionAccount?.account_number,
            finIns: retentionAccount?.account_name
              ? retnbank?.institution_name
              : ' ',
          },
          declaration: {
            name: approver,
            position: approver_position,
          },
        };

        noticeData = {
          trusteeName: pdfData.trusteeDetails?.name || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeBusinessAddress: pdfData.trusteeDetails?.address || '',
          trusteeSubUrb: pdfData.trusteeDetails?.suburb || '',
          trusteePostCode: pdfData.trusteeDetails?.postcode || '',
          trusteeState: pdfData.trusteeDetails?.state || '',
          trusteePhone: pdfData.trusteeDetails?.phone || '',
          trusteeEmail: pdfData.trusteeDetails?.mail || '',
          isProjectTrust: '',
          isRetentionTrust: true,
          beforeAccountName: pdfData.retnAcct?.name || '',
          beforeFinancialInstitution: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.finIns
            : '',
          beforeBsb: pdfData.retnAcct?.name
            ? `${pdfData.retnAcct?.bsb}`
            : '',
          beforeAccountNumber: pdfData.retnAcct?.name
            ? pdfData.retnAcct?.accno
            : '',
          hasClosedAndEnded: true,
          dateAccountClosed: pdfData.notice_date?.noticeDate || '',
          hasTransferred: '',
          dateAccountTransferred: '',
          hasNameChanged: '',
          afterNameChangeAccountName: '',
          dateOfChange: '',
          afterTransferAccountName: '',
          afterFinancialInstitution: '',
          afterBsb: '',
          afterAccountNumber: '',
          afterDateOpened: '',
          afterDateIntended: '',
          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationName: pdfData.declaration?.name || '',
          declarationPosition: pdfData.declaration?.position || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
          onBehalfOfName: pdfData.trusteeDetails?.company || '',
        };
      }

      if (notice.notice_type == 'QBCC TA3 Notice Of Related Entities') {
        const trustAccount = await useRepo(this.bankAccountsRepo).findOne({
          // where: { project_ids: In([project.project_id]) },
          where: { bank_account_id: notice.bank_account_id },
        });

        let bank = await useRepo(this.bankDetails).findOne({
          where: { id: bankAccount.financial_institution },
        });

        let signature, approver, approver_position;
        if (AccDelegation === 'Paid-delegated') {
          signature = portalAdmin_details?.signature
            ? portalAdmin_details.signature
            : ' ';
          approver =
            portalAdmin_details.first_name +
            ' ' +
            portalAdmin_details.last_name;
          approver_position = 'PayTrade Admin';
        } else {
          signature = subscription?.signature ? subscription.signature : ' ';
          approver = userLoggedIn.first_name + ' ' + userLoggedIn.last_name;
          approver_position = userLoggedIn.position_title;
        }

        let contracting_person,
          contracted_person = false;

        if (clientSupplier.client_supplier_type === 'Client') {
          contracted_person = true;
        } else {
          contracting_person = true;
        }

        pdfData = {
          paytradeLogo: qbccLogo,
          sign: signature,
          notice_date: convertToLocalDate(notice.created_on),
          trusteeDetails: {
            name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
            position: companyAdmin.position_title,
            company: company.company_name,
            address: company.company_address,
            abn: company.abn_number,
            acn: company.acn_number,
            qbcc: company.qbcc_number,
            suburb: company.region,
            mail: company.company_email_id,
            country: company.country,
            state: await this.getStateCodeFromPlaceId(company.place_id),
            phone: convertPhoneNumber(company.company_phone_no),
          },
          contract: {
            party: clientSupplier.client_supplier_name,
            date: contracts?.contract_date
              ? convertToLocalDate(contracts?.contract_date)
              : convertToLocalDate(trustAccount?.contract_date),
            desc: project.project_description,
            address: project.site_address,
            sub: project.region,
            country: project.country,
            state: await this.getStateCodeFromPlaceId(project.place_id),
            contracted: contracted_person,
            contracting: contracting_person,
          },
          trustAcct: {
            trustee: contracted_person
              ? companyAdmin.first_name + ' ' + companyAdmin.last_name
              : ' ',
            name: contracted_person ? trustAccount?.account_name : ' ',
            bsb: contracted_person ? trustAccount?.bsb_number : '',
            dateO: contracted_person
              ? convertToLocalDate(trustAccount?.opening_date)
              : '',
            accno: contracted_person ? trustAccount?.account_number : ' ',
            finIns: contracted_person ? bank.institution_name : '',
          },
          related: {
            name: clientSupplier.client_supplier_name,
            qbcc: clientSupplier.qbcc_number,
          },
          declaration: {
            name: approver,
            position: approver_position,
          },
        };

        noticeData = {
          fullName: pdfData.trusteeDetails?.name || '',
          position: pdfData.trusteeDetails?.position || '',
          company: pdfData.trusteeDetails?.company || '',
          postalAddress: pdfData.trusteeDetails?.address || '',
          suburb: pdfData.trusteeDetails?.suburb || '',
          state: pdfData.trusteeDetails?.state || '',
          email: pdfData.trusteeDetails?.mail || '',
          phone: pdfData.trusteeDetails?.phone || '',
          abn: pdfData.trusteeDetails?.abn || '',
          acn: pdfData.trusteeDetails?.acn || '',
          qbcc: pdfData.trusteeDetails?.qbcc || '',
          trusteeName: pdfData.trustAcct?.trustee || '',
          accountName: pdfData.trustAcct?.name || '',
          FinsInsName: pdfData.trustAcct?.name ? pdfData.trustAcct?.finIns : '',
          bsb: pdfData.trustAcct?.name ? `${pdfData.trustAcct?.bsb}` : '',
          accNumber: pdfData.trustAcct?.name ? pdfData.trustAcct?.accno : '',

          contractingParty: pdfData.trusteeDetails?.company || '',
          contractedParty: pdfData.contract?.party || '',
          projectDescription: pdfData.contract?.desc || '',
          siteAdress: pdfData.contract?.address || '',
          contractSubUrb: pdfData.contract?.sub || '',
          contractState: pdfData.contract?.state || '',
          contractPhone: pdfData.trusteeDetails?.phone || '',
          subContractorName: pdfData.related?.name || '',
          subContractorQbcc: pdfData.related?.qbcc || '',
          contractDate: pdfData.contract?.date?.noticeDate || '',
          contractedCheckBox: contracted_person || '',
          contractingCheckBox: contracting_person || '',

          declarationCheckbox1: true || '',
          declarationCheckbox2: true || '',
          declarationCheckbox3: true || '',
          declarationName: pdfData.declaration?.name || '',
          signature:
            pdfData.sign != ' '
              ? await this.resizeBase64Image(pdfData.sign, 430, 76)
              : '',
          declarationDate: pdfData.notice_date?.noticeDate || '',
        };
      }

      await this.genDocNoticeServices.generatePDFfromHTML(
        pdfData,
        noticeData,
        decoded,
        notice.notice_id,
        notice.notice_type,
        convertToLocalDate(notice.notice_date).noticeDate,
        manager,
      );

      const docQbccData = {
        applicant_details: {
          name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
          position: companyAdmin.position_title,
          company: company.company_name,
          address: company.company_address,
          email: company.company_email_id,
          postcode: company.company_number,
        },
      };

      return framedResponse(
        'SUCCESS',
        `Doc data fetched successfully.`,
        pdfData,
      );
    } catch (error) {
      this.logger.error(
        `Errored while generating a notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async sentNoticeMail(data: SentMailForANoticeInput, manager?: EntityManager) {
    const useRepo = (
      manager: EntityManager | undefined,
      repo: Repository<any>,
    ) => {
      return manager ? manager.getRepository(repo.target) : repo;
    };

    const noticeMailRepo = useRepo(manager, this.noticeMailRepo);
    const fileRepo = useRepo(manager, this.fileAttachments);

    try {
      this.logger.log(
        `Handling request for sending mail for notice with data- mail-entry-id: ${JSON.stringify(data)}`,
      );

      // const notice_mail = await noticeMailRepo
      //   .createQueryBuilder('noticeMail')
      //   .where('noticeMail.id = :id', { id: data.id })
      //   .leftJoinAndSelect('noticeMail.noticeDetails', 'notice')
      //   .leftJoinAndSelect('notice.uploaded_notice', 'uploaded_notice')
      // .leftJoinAndSelect('notice.contractDetails', 'contract')
      // .leftJoinAndSelect(
      //   'contract.fileAttachments',
      //   'supportingFileAttachment',
      // )
      // .getOne();

      const notice_mail = await noticeMailRepo.findOne({
        where: { id: data.id },
        relations: [
          'noticeDetails',
          'noticeDetails.uploaded_notice',
          'noticeDetails.qbcc_uploaded_notice',
        ],
        select: [
          'id',
          'email_to',
          'email_cc',
          'email_subject',
          'email_content',
        ],
      });

      if (!notice_mail) {
        throw new Error(`Notice mail entry not found: ${data.id}`);
      }

      let mail_attachments = [];
      if (notice_mail?.noticeDetails?.supporting_file_attachment_ids) {
      }
      let attachmentIds = [
        notice_mail?.noticeDetails?.uploaded_notice?.id,
        ...(notice_mail?.noticeDetails?.supporting_file_attachment_ids ?? []),
        notice_mail?.noticeDetails?.qbcc_uploaded_notice?.id,
      ].filter(Boolean);

      let notice_file = null;

      if (data.view_preview === true) {
        const UPLOAD_BASE_URL = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');

        const addFilePath = (filePath: string | null) => {
          if (!filePath) return null;
          const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
          return UPLOAD_BASE_URL + '/' + normalized;
        };

        const notice_file_id = notice_mail.noticeDetails.uploaded_notice?.id;

        if (notice_file_id) {
          const fetch_notice_file = await fileRepo
            .createQueryBuilder('file')
            .select([
              'file.id',
              'file.file_path',
              'file.file_name',
              'file.file_type',
              'file.custom_file_name',
            ])
            .where('file.id = :id', { id: notice_file_id })
            .getOne();

          if (fetch_notice_file) {
            notice_file = {
              id: fetch_notice_file.id,
              file_name: fetch_notice_file.custom_file_name
                ? fetch_notice_file.custom_file_name
                : fetch_notice_file.file_name,
              file_path: addFilePath(fetch_notice_file.file_path),
              file: await this.addFileBase64FromStorage(
                fetch_notice_file.file_path,
                fetch_notice_file.file_type,
              ),
            };
          }
        }
      }

      if (attachmentIds?.length) {
        for (let attachmentId of attachmentIds) {
          let attachmentDetails = await fileRepo.findOne({
            where: { id: attachmentId },
            select: ['file_path', 'file_name', 'custom_file_name'],
          });

          if (!attachmentDetails)
            throw `Invalid attachmentId. Cannot find any attachment with id: ${attachmentId}`;

          mail_attachments.push({
            filePath: attachmentDetails.file_path,
            fileName: attachmentDetails.custom_file_name
              ? attachmentDetails.custom_file_name
              : attachmentDetails.file_name,
          });
        }
      }

      var mailDetails = {
        toEmail: notice_mail.email_to,
        ccMail: notice_mail.email_cc,
        subject: notice_mail.email_subject,
        template: 'header-footer-email',
        mailBody: notice_mail.email_content,
        attachments: mail_attachments,
        noticeId: notice_mail.noticeDetails.notice_id,
        notice_file: notice_file ? notice_file : null,
      };

      return mailDetails;
    } catch (error) {
      this.logger.error(
        `Errored while generating a notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handlesentNoticeMail(
    decoded: any,
    payload?: SentMailForANoticeInput,
    multiPayload?: SentMailForMultipleNoticesInput,
    manager?: EntityManager,
  ): Promise<ReturnType<typeof framedResponse>> {
    if (multiPayload) {
      if (!multiPayload.ids?.length) {
        return framedResponse(
          'ERROR',
          'Notices are generated and added to the list. For updates visit the notice list page.',
        );
      }

      const preparedMails = [];

      for (const id of multiPayload.ids) {
        this.logger.log(`Sending mail for notice with id: ${id}`);

        const mailDetails = await this.sentNoticeMail({ id }, manager);

        preparedMails.push({
          mailDetails,
        });

        // const updateNoticeData: Partial<updateNoticesInput> = {
        //   notice_id: mailDetails.noticeId,
        //   notice_mail_uuid: id,
        //   status: 'Sent',
        // };

        // await this.handleUpdateNotice(
        //   decoded,
        //   updateNoticeData as updateNoticesInput,
        //   manager
        // );

        if (!manager) {
          await this.emailQueueProducer.emailQueueProducer({
            ...mailDetails,
            mail_type: EmailTypeEnum.notice,
          });
        }
      }
      return framedResponse('SUCCESS', 'Mail sent', {
        mails: preparedMails,
      });

      // return framedResponse('SUCCESS', 'Mail sent successfully.');
    }

    if (payload) {
      this.logger.log(
        `Request received for sending mail for a notice with mail_entry_id: ${payload.id}`,
      );

      const mailDetails = await this.sentNoticeMail(payload, manager);

      if (!manager) {
        await this.emailQueueProducer.emailQueueProducer({
          ...mailDetails,
          mail_type: EmailTypeEnum.notice,
        });
      }

      const preview_response = {
        mail_uuid: payload.id,
        file_details: mailDetails.notice_file,
      };

      // await this.emailServices.sendMail(mailDetails);

      // const updateNoticeData: Partial<updateNoticesInput> = {
      //   notice_id: mailDetails.noticeId,
      //   notice_mail_uuid: payload.id,
      //   status: 'Sent',
      // };

      // await this.handleUpdateNotice(
      //   decoded,
      //   updateNoticeData as updateNoticesInput,
      // );

      // Task #97 — record an activity-log entry whenever the system actually
      // dispatches a notice mail on the user's behalf so users can see in
      // their activity log that an auto-send happened.
      try {
        await this.activityLogService.insertActivityLog({
          event_template_id: 202,
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
          company_id: (mailDetails as any)?.company_id ?? null,
          dynamic_values: {
            noticeId: (mailDetails as any)?.noticeId ?? payload?.id,
            mailUuid: payload?.id,
          },
          is_admin: false,
          created_by: decoded?.userId,
        });
      } catch (e) {
        this.logger.warn(
          `[NOTICE_FLOW] auto-sent activity log insert failed: ${e?.message || e}`,
        );
      }

      return framedResponse('SUCCESS', 'Mail Sent', {
        preview: preview_response,
        mails: mailDetails,
      });
    }
  }

  async sentAdminMailQbccNotice(
    id: string,
    mailTemplate,
    view_review: boolean = false,
    manager?: EntityManager,
  ) {
    try {
      this.logger.log(
        `Handling request for sending mail for qbcc notice to paytrade admin with data notice_id: ${JSON.stringify(id)}`,
      );

      const notice_details = await this.fetchDetailsOfANotice({ id }, manager);

      const notice_file = notice_details?.qbccNotice;

      const useRepo = (
        manager: EntityManager | undefined,
        repo: Repository<any>,
      ) => {
        return manager ? manager.getRepository(repo.target) : repo;
      };
      const companyRepo = useRepo(manager, this.companyDetails);

      const company = await companyRepo.findOne({
        where: { company_id: notice_details.company_id },
      });

      const mailDynamicData = {
        company_name: company.company_name,
        notice_id: notice_details.notice_id,
        project_name: notice_details.project_name || ' ',
        account_name: notice_details.bank_account_name || ' ',
      };

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      let mailDetails;
      if (view_review === true) {
        mailDetails = {
          toEmail: process.env.NOTICE_PAYTRADE_ADMIN_DELEGATE,
          // ccMail: notice_mail.email_cc,
          subject: `QBCC notice ${notice_details.notice_id} - ${notice_details.project_name}`,
          template: 'header-footer-email',
          mailBody: String(mailbody),
          noticeDoc: notice_file,
        };
      } else {
        mailDetails = {
          toEmail: process.env.NOTICE_PAYTRADE_ADMIN_DELEGATE,
          // ccMail: notice_mail.email_cc,
          subject: `QBCC notice ${notice_details.notice_id} - ${notice_details.project_name}`,
          template: 'header-footer-email',
          mailBody: String(mailbody),
        };
      }

      return mailDetails;
    } catch (error) {
      this.logger.error(
        `Errored while generating a qbcc notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleSentAdminMailQbccNotice(
    decoded: any,
    notice_id?: string,
    view_preview?: boolean,
    multiPayload?: SentMailForMultipleNoticesInput,
    manager?: EntityManager,
  ) {
    this.logger.log(
      `Handling request for sending QBCC notice to Paytrade admin with notice_id: ${notice_id}`,
    );

    // fetch mail template once
    const mailTemplate =
      await this.ptContentService.getMailTemplateByMailType(
        'notices-qbcc-admin',
      );

    if (view_preview === true) {
      const mailDetails = await this.sentAdminMailQbccNotice(
        notice_id,
        mailTemplate,
        true,
        manager,
      );

      const preview_response = {
        notice_uuid: notice_id,
        qbcc_file_details: mailDetails.noticeDoc ? mailDetails.noticeDoc : null,
      };

      if (!manager) {
        this.emailQueueProducer.emailQueueProducer({
          ...mailDetails,
          mail_type: EmailTypeEnum.adminQbccNotice,
        });
      }
      // await this.emailServices.sendMail(mailDetails);

      // const framed = framedResponse(
      //   'SUCCESS',
      //   'Document preview',
      //   preview_response,
      // );

      // // remap for GraphQL:
      // return {
      //   ...framed,
      //   qbcc_notice_file: framed.data,
      //   mails: mailDetails
      // };

      return framedResponse(
        'SUCCESS',
        'Admin notification sent for QBCC notice',
        {
          qbcc_notice_file: preview_response,
          mails: mailDetails,
        },
      );
    }

    if (multiPayload) {
      const preparedMails = [];
      for (const id of multiPayload.ids) {
        this.logger.log(`Sending QBCC admin mail for notice id: ${id}`);

        const mailDetails = await this.sentAdminMailQbccNotice(
          id,
          mailTemplate,
          false,
          manager,
        );

        preparedMails.push({
          mailDetails,
        });

        if (!manager) {
          await this.emailQueueProducer.emailQueueProducer({
            ...mailDetails,
            mail_type: EmailTypeEnum.adminQbccNotice,
          });
        }
        // await this.emailServices.sendMail(mailDetails);
      }

      this.logger.log('All QBCC admin notifications sent successfully.');
      return framedResponse('SUCCESS', 'Mail Sent', {
        mails: preparedMails,
      });
    }

    // single notice case
    const mailDetails = await this.sentAdminMailQbccNotice(
      notice_id,
      mailTemplate,
      false,
    );

    await this.emailQueueProducer.emailQueueProducer({
      ...mailDetails,
      mail_type: EmailTypeEnum.adminQbccNotice,
    });
    // await this.emailServices.sendMail(mailDetails);

    this.logger.log('Admin notification sent successfully.');
    return framedResponse('SUCCESS', 'Email sent successfully.');
  }

  async sentAdminReminderPendingQbccNotice(timezone) {
    try {
      this.logger.log(
        `Handling request for sending reminder mail for pending qbcc notice to paytrade admin`,
      );

      const notices_payload = {
        delegated_qbcc: true,
        status: 'Sending',
      } as ListAllNoticesInput;

      const notices = (await this.listAllNotices(
        notices_payload,
        timezone,
      )) as listAllNoticesResponse;

      const portalAdmin_details = await this.adminDetails.findOne({
        where: {
          // admin_role: In(['PORTAL ADMIN']),
          // admin_id: 1001,
          admin_role: Role.PORTAL_ADMIN,
          admin_status: 'Active',
        },
      });

      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'admin-qbcc-reminder',
        );

      const mailDynamicData = {
        notice_count: notices?.data?.total_count,
        admin_name:
          portalAdmin_details.first_name + portalAdmin_details.last_name,
      };

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      var mailDetails = {
        toEmail: process.env.NOTICE_PAYTRADE_ADMIN_DELEGATE,
        // ccMail: notice_mail.email_cc,
        subject: `Reminder mail for pending QBCC notices `,
        template: 'header-footer-email',
        mailBody: String(mailbody),
      };

      if (notices?.data?.total_count > 0) {
        await this.emailQueueProducer.emailQueueProducer({
          ...mailDetails,
          mail_type: EmailTypeEnum.adminQbccReminder,
        });
        // await this.emailServices.sendMail(mailDetails);
      }

      return mailDetails;
    } catch (error) {
      this.logger.error(
        `Errored while generating a reminder qbcc notice mail with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async regenerateFailedNotice(noticeId: number, decoded: any) {
    try {
      this.logger.log(
        `Re-generating failed notice document for notice_id: ${noticeId}`,
      );

      // 1) fetch notice
      const notice = await this.noticesRepo.findOne({
        where: { notice_id: noticeId },
        relations: ['qbcc_uploaded_notice', 'uploaded_notice'],
      });

      if (!notice) {
        return framedResponse('ERROR', `Notice not found for id: ${noticeId}`);
      }

      const userMode =
        decoded && decoded?.userId
          ? await this.fetchModeOfAnUser(decoded?.userId)
          : null;

      // Task #97: per-company auto-send opt-out for the regenerate path.
      const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const companyAutoSend = await this.getCompanyAutoSendSetting(
        (notice as any)?.company_id ?? null,
      );
      this.logger.log(
        `[NOTICE_FLOW] flow_id=${flowId} stage=trigger_entry kind=regenerate notice_id=${noticeId} company_auto_send=${companyAutoSend} user_mode=${userMode}`,
      );

      // 2️⃣ Remove existing attachments if any
      if (notice.uploaded_notice || notice.qbcc_uploaded_notice) {
        this.logger.log(`Removing old attachments for notice_id: ${noticeId}`);

        const notice_doc_file_id = notice.uploaded_notice?.id;
        const qbcc_notice_doc_id = notice.qbcc_uploaded_notice?.id;

        await this.noticesRepo.update(
          { notice_id: noticeId },
          { uploaded_notice: null, qbcc_uploaded_notice: null },
        );

        if (qbcc_notice_doc_id)
          await this.fileAttachments.delete({ id: qbcc_notice_doc_id });
        if (notice_doc_file_id)
          await this.fileAttachments.delete({ id: notice_doc_file_id });
      }

      // regenerate document
      this.logger.log(`Calling generateNoticeDocument for notice ${noticeId}`);
      const x = await this.generateNoticeDocument({ id: notice.id }, decoded);

      this.logger.log(
        `Document regenerated (and uploaded) for notice ${noticeId}`,
      );

      // subscription + bank account settings instead of relying on the stale
      // delegated_qbcc flag stored on the notice record. The old flag may be
      // wrong if the notice was originally created before a delegation bug fix.
      const qbccNoticeTypes = [
        'QBCC TA1 Project Trust Account Notice',
        'QBCC TA1 Retention Trust Account Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA2 Retention Account Closing Notice',
        'QBCC TA3 Notice Of Related Entities',
        'QBCC TA4 Part Payment Notice',
        'QBCC TA5 Nil Return Notice',
      ];
      const isQbccNoticeType = qbccNoticeTypes.includes(notice.notice_type);

      let shouldUseDelegatedQbccFlow = notice.delegated_qbcc === true;

      if (isQbccNoticeType && !shouldUseDelegatedQbccFlow && notice.bank_account_id) {
        const currentSubPlan = await this.getSubscriptionType(
          notice.company_id,
          notice.bank_account_id,
        );
        this.logger.log(
          `Re-evaluated subscription type for notice ${noticeId}: ${currentSubPlan} (original delegated_qbcc was ${notice.delegated_qbcc})`,
        );
        if (currentSubPlan === 'Paid-delegated') {
          shouldUseDelegatedQbccFlow = true;
        }
      }

      if (shouldUseDelegatedQbccFlow) {
        // PayTrade admin team who lodge the notice with QBCC on the user's behalf.
        this.logger.log(
          `Detected delegated QBCC notice (${notice.notice_type}), triggering admin flow.`,
        );

        await this.handleSentAdminMailQbccNotice(decoded, notice?.id, false);

        const updateNoticePayload: updateNoticesInput = {
          notice_id: notice.notice_id,
          delegated_qbcc: true,
          status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
          qbcc: true,
        };
        await this.handleUpdateNotice(decoded, updateNoticePayload);

        return framedResponse('SUCCESS', 'QBCC notice regenerated', {
          notice_id: noticeId,
        });
      } else if (isQbccNoticeType) {
        // been regenerated above but must NOT be emailed to the client. QBCC
        // notices are sent to the QBCC (not the client) — the user prints or
        // downloads the PDF and lodges it themselves via post or QBCC portal.
        this.logger.log(
          `QBCC notice (${notice.notice_type}) without delegation — PDF regenerated, no email sent. User must lodge manually.`,
        );

        return framedResponse(
          'SUCCESS',
          'QBCC notice PDF regenerated. Download and lodge with the QBCC manually.',
          {
            notice_id: noticeId,
          },
        );
      } else {
        // Non-QBCC notice (e.g. Client S18B, Supplier S23) — these ARE sent
        // directly to the client/supplier via email.
        const newMail = (await this.handleGenerateMailForANotice(decoded, {
          id: notice.id,
        })) as generateNoticeMailResponse;

        if (!newMail?.data?.id) {
          throw new Error(`Mail generation failed for notice_id: ${noticeId}`);
        }

        const subscriptionPlan = await this.getSubscriptionType(
          notice.company_id,
          notice.bank_account_id,
        );

        if (
          subscriptionPlan !== 'Basic' ||
          (userMode && userMode == 'Onboarding')
        ) {
          const sentMailNoticePayload: SentMailForANoticeInput = {
            id: newMail?.data?.id,
            view_preview: true,
          };

          if (userMode && userMode == 'Normal' && companyAutoSend) {
            const mailSent = await this.handlesentNoticeMail(
              decoded,
              sentMailNoticePayload,
            );
          }
          const updateNoticePayload: updateNoticesInput = {
            notice_id: newMail.data.notice_id,
            notice_mail_uuid: newMail?.data?.id,
            status: userMode == 'Normal' && companyAutoSend ? 'Sent' : userMode == 'Normal' ? 'Not Sent' : 'Sent - Onboarded',
            auto_sent: !!(userMode == 'Normal' && companyAutoSend),
          };

          await this.handleUpdateNotice(decoded, updateNoticePayload);
        }
        return framedResponse(
          'SUCCESS',
          'Notice regenerated and mail re-sent successfully.',
          {
            notice_id: noticeId,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Error while regenerating failed notice ${noticeId}: ${error.stack || error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Failed to regenerate notice: ${error.message || error}`,
      );
    }
  }

  async getSubscriptionType(company_id, account_id, manager?: EntityManager) {
    let hasDelegationAuthority = false;

    this.logger.log(
      `[SUBSCRIPTION_CHECK] Checking subscription for company_id=${company_id}, account_id=${account_id}`
    );

    const subscriptionDetails =
      await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
        company_id,
      );

    const bankRepo = manager
      ? manager.getRepository(BankAccounts)
      : this.bankAccountsRepo;

    const items = subscriptionDetails?.plan_items || [];

    const noticesItem = items.find((item) => item?.item_name === 'Notices');
    const planValue = noticesItem?.limit_value ? noticesItem.limit_value : '';

    const delegationItem = items.find(
      (item) => item?.item_name === 'Delegate authority',
    );
    if (delegationItem?.limit_value) {
      hasDelegationAuthority = Boolean(delegationItem.limit_value);
    }

    if (subscriptionDetails?.is_free_plan_eligible) {
      hasDelegationAuthority = true;
    }

    this.logger.log(
      `[SUBSCRIPTION_CHECK] Plan: ${subscriptionDetails?.plan_name || 'Unknown'}, ` +
      `notices_value='${planValue}', delegation_authority=${hasDelegationAuthority}, ` +
      `is_free_plan_eligible=${subscriptionDetails?.is_free_plan_eligible || false}, ` +
      `expiry_date=${subscriptionDetails?.expiry_date || 'N/A'}`
    );

    const account_details = await bankRepo.findOne({
      where: { bank_account_id: account_id },
    });

    this.logger.log(
      `[SUBSCRIPTION_CHECK] Bank account ${account_id}: delegate_powers='${account_details?.delegate_powers || 'N/A'}'`
    );

    let subscription_plan = 'Basic';

    if (planValue || subscriptionDetails?.is_free_plan_eligible) {
      const expiryDate = subscriptionDetails?.expiry_date
        ? moment(subscriptionDetails.expiry_date).utc()
        : null;

      const isExpired = expiryDate ? moment.utc().isAfter(expiryDate) : false;

      this.logger.log(
        `[SUBSCRIPTION_CHECK] Expiry check: isExpired=${isExpired}`
      );

      if (
        (planValue === 'Manual' || (hasDelegationAuthority && isExpired)) &&
        !subscriptionDetails?.is_free_plan_eligible
      ) {
        subscription_plan = 'Basic';
        this.logger.log(
          `[SUBSCRIPTION_CHECK] Result: 'Basic' (planValue='${planValue}' is Manual or delegation expired, not free plan eligible)`
        );
      } else {
        if (
          hasDelegationAuthority &&
          account_details?.delegate_powers === 'Yes'
        ) {
          subscription_plan = 'Paid-delegated';
          this.logger.log(
            `[SUBSCRIPTION_CHECK] Result: 'Paid-delegated' (delegation authority + delegate_powers=Yes)`
          );
        } else {
          subscription_plan = 'Paid';
          this.logger.log(
            `[SUBSCRIPTION_CHECK] Result: 'Paid' (paid plan, delegation=${hasDelegationAuthority}, delegate_powers='${account_details?.delegate_powers || 'N/A'}')`
          );
        }
      }
    } else {
      this.logger.log(
        `[SUBSCRIPTION_CHECK] Result: 'Basic' (no notices plan value and not free plan eligible)`
      );
    }

    return subscription_plan;
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }

  async updatePaymentNoticeStatus(payment_id, manager?: EntityManager) {
    try {
      if (manager) {
        const payment = await manager.findOne(PaymentDetails, {
          where: { payment_id: payment_id },
          lock: { mode: 'pessimistic_write' },
        });
        payment.notice_generated = true;
        payment.updated_on = moment.tz('UTC');
        payment.updated_group = 'USER';
        return await manager.save(payment);
      } else {
        return await this.entityManager.transaction(
          async (transactionalEntityManager) => {
            const payment = await transactionalEntityManager.findOne(
              PaymentDetails,
              {
                where: { payment_id: payment_id },
                lock: { mode: 'pessimistic_write' },
              },
            );
            payment.notice_generated = true;
            payment.updated_on = moment.tz('UTC');
            payment.updated_group = 'USER';
            const response = await transactionalEntityManager.save(payment);
            // throw new Error('Error');
            return response;
          },
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async fetchAllUnsentNoticesOfACompany(
    data: FetchAllUnsentNoticesOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all unsent notices of a company with data: ${JSON.stringify(data)}`,
      );

      const { company_id } = data;
      const unsentStatuses = ['Not Sent', 'Sending'];
      const fetchedAllUnsentNotices = await this.noticesRepo
        .createQueryBuilder('n')
        .select([
          'n.notice_type AS notice_type',
          'n.status AS status',
          'n.notice_id AS notice_id',
          'n.bank_account_id AS bank_account_id',
          'ba.account_name AS bank_account_name',
          'ba.account_type AS bank_account_type',
          'n.id AS id',
        ])
        .leftJoin(
          BankAccounts,
          'ba',
          'ba.bank_account_id = n.bank_account_id',
          { company_id },
        )
        .where('n.company_id = :company_id', { company_id })
        .andWhere('n.status IN(:...unsentStatuses)', { unsentStatuses })
        .getRawMany();
      // console.log('fetchedAllUnsentNotices', fetchedAllUnsentNotices);

      return framedResponse(
        'SUCCESS',
        `All unsent notices successfully fetched.`,
        fetchedAllUnsentNotices,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all unsent notices of a company with message: ${error}`,
      );
      throw error;
    }
  }

  async getStateCodeFromPlaceId(place_id: string) {
    try {
      this.logger.log(
        `Request received for fetching state code from place id: ${place_id}`,
      );

      const googlePlacesResponse = await axios.post(
        `${process.env.GOOGLE_PLACES_URI}${place_id}&key=${process.env.GOOGLE_PLACES_KEY}`,
      );

      if (googlePlacesResponse.data.status == 'OK') {
        const address_components =
          googlePlacesResponse.data.result.address_components;
        for (const component of address_components) {
          this.logger.log(`component: ${JSON.stringify(component)}`);
          if (component.types.includes('administrative_area_level_1')) {
            this.logger.log(`component.short_name: ${component.short_name}`);
            return component.short_name;
          }
        }
      } else {
        this.logger.log(`googlePlacesResponse.data: ${JSON.stringify(googlePlacesResponse.data)}`);
        return '';
      }
    } catch (error) {
      this.logger.error(
        `Errored while fetching state code from place id with message: ${error}`,
      );
      throw error;
    }
  }

  async resizeBase64Image(
    base64Str: string,
    maxWidth: number,
    maxHeight: number,
  ): Promise<string> {
    try {
      // Decode Base64 string to extract image data
      if (!base64Str) return '';

      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Load the image using the canvas library
      const img = await loadImage(buffer);

      // Get the original dimensions of the image
      const originalWidth = img.width;
      const originalHeight = img.height;

      // Check if the image already fits within the box
      if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
        // If the image fits, trim the white space only
        const canvasTrim = createCanvas(originalWidth, originalHeight);
        const ctxTrim = canvasTrim.getContext('2d');
        ctxTrim.drawImage(img, 0, 0, originalWidth, originalHeight);

        // Get image data to detect white space
        const imageData = ctxTrim.getImageData(
          0,
          0,
          originalWidth,
          originalHeight,
        );
        const data = imageData.data;

        // Find the bounds of the non-white areas
        let top = 0,
          bottom = originalHeight,
          left = 0,
          right = originalWidth;

        // Loop through the image data to find the first non-white pixel
        for (let y = 0; y < originalHeight; y++) {
          for (let x = 0; x < originalWidth; x++) {
            const index = (y * originalWidth + x) * 4; // Get pixel index
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            // Check if the pixel is not white (allowing some tolerance for color variation)
            if (r < 255 || g < 255 || b < 255 || a < 255) {
              if (y < top) top = y;
              if (y > bottom) bottom = y;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
        }

        // Crop the image to remove the white space (use the detected bounds)
        const trimmedWidth = right - left;
        const trimmedHeight = bottom - top;
        const croppedCanvas = createCanvas(trimmedWidth, trimmedHeight);
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(
          img,
          left,
          top,
          trimmedWidth,
          trimmedHeight,
          0,
          0,
          trimmedWidth,
          trimmedHeight,
        );

        // Return the cropped (trimmed) image as a Base64 string
        return croppedCanvas.toDataURL('image/png');
      }

      // If the image does not fit within the box, resize it
      const aspectRatio = originalWidth / originalHeight;

      let newWidth = originalWidth;
      let newHeight = originalHeight;

      // Scale the image to fit within the max width or height, maintaining the aspect ratio
      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        if (aspectRatio > 1) {
          // Image is wider than tall, scale to maxWidth
          newWidth = maxWidth;
          newHeight = Math.floor(newWidth / aspectRatio);
        } else {
          // Image is taller than wide, scale to maxHeight
          newHeight = maxHeight;
          newWidth = Math.floor(newHeight * aspectRatio);
        }

        // Ensure the image fits within both maxWidth and maxHeight
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = Math.floor(newWidth / aspectRatio);
        }
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = Math.floor(newHeight * aspectRatio);
        }
      }

      // Create a canvas to draw the resized image
      const canvas = createCanvas(maxWidth, maxHeight);
      const ctx = canvas.getContext('2d');

      // Clear the canvas (optional: set a white background)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, maxWidth, maxHeight);

      // Calculate position to center the image within the canvas
      const offsetX = Math.floor((maxWidth - newWidth) / 2);
      const offsetY = Math.floor((maxHeight - newHeight) / 2);

      // Draw the image onto the canvas, centered
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        img,
        0,
        0,
        originalWidth,
        originalHeight,
        offsetX,
        offsetY,
        newWidth,
        newHeight,
      );

      // Return the resized image as a Base64 string
      return canvas.toDataURL('image/png');
    } catch (error) {
      throw new Error(`Failed to resize the image: ${error.message}`);
    }
  }
}
