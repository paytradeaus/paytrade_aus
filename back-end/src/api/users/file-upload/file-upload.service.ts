import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, EntityManager, IsNull } from 'typeorm';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { CreateFileUploadInput } from './dto/create-file-upload.input';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { createReadStream, mkdirSync, existsSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { parse } from 'csv-parse';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { FileUploadResolver } from './file-upload.resolver';
import * as path from 'path';
import { join } from 'path';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class FileUploadService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(FileAttachments)
    private readonly fileAttachments: Repository<FileAttachments>,
    @InjectRepository(UserDetails)
    private readonly userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private readonly adminDetails: Repository<AdminDetails>,
    @InjectRepository(CompanyDetails)
    private readonly companyDetails: Repository<CompanyDetails>,
    @InjectRepository(BlogResource)
    private readonly blogResources: Repository<BlogResource>,
    @InjectRepository(NoticeDetails)
    private readonly noticeDetails: Repository<NoticeDetails>,
    @InjectRepository(NoticeTemplates)
    private readonly noticeTemplates: Repository<NoticeTemplates>,
    @InjectRepository(ContractDetails)
    private readonly contractDetails: Repository<ContractDetails>,
    @InjectRepository(VariationDetails)
    private readonly variationDetails: Repository<VariationDetails>,
    @InjectRepository(PaymentDetails)
    private readonly paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(CmtyDiscussionsIdeas)
    private discussionsIdeas: Repository<CmtyDiscussionsIdeas>,
    @InjectRepository(CmtyAnswersComments)
    private answerComments: Repository<CmtyAnswersComments>,
    @InjectRepository(AuditReport)
    private auditReportRepo: Repository<AuditReport>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(BankStatements)
    private bankStatements: Repository<BankStatements>,
    @InjectRepository(BankAccounts)
    private bankAccounts: Repository<BankAccounts>,
    @InjectRepository(AuditReport)
    private auditReport: Repository<AuditReport>,
    private entityManager: EntityManager,
    private activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('FILE_UPLOAD_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  public createFilePath({
    attachmentType,
    fileNamePrefix,
    filename,
    customFileName,
  }: {
    attachmentType: string;
    fileNamePrefix?: string;
    filename?: string;
    customFileName?: string;
  }): Promise<any> {
    this.logger.log(
      `Create file path method called for: ${JSON.stringify(filename)}`,
    );
    return new Promise(async (resolve, reject) => {
      var baseDir = 'uploads/';
      switch (attachmentType) {
        case 'User_profile':
          {
            baseDir += 'profile_photo';
          }
          break;
        case 'Admin_profile':
          {
            baseDir += 'admin_profile_photo';
          }
          break;
        case 'Company_logo':
          {
            baseDir += 'company_logo';
          }
          break;
        case 'Communication_attach':
          {
            baseDir += 'communication';
          }
          break;
        case 'Trust_Training_Records':
          {
            baseDir += 'trust_training_records';
          }
          break;
        case 'Blog_banner':
          {
            baseDir += 'blog_banner';
          }
          break;
        case 'Resource_attachments':
          {
            baseDir += 'resources';
          }
          break;
        case 'Notices_templates':
          {
            baseDir += 'notice-templates';
          }
          break;
        case 'Notices_uploads':
          {
            baseDir += 'notices';
          }
          break;
        case 'Recieved_notices_uploads':
          {
            baseDir += 'recieved-notices';
          }
          break;
        case 'Notices_supporting_docs':
          {
            baseDir += 'notices_supporting_docs';
          }
          break;
        case 'Contracts':
          {
            baseDir += 'contracts';
          }
          break;
        case 'Variations':
          {
            baseDir += 'variations';
          }
          break;
        case 'Bank_statements':
          {
            baseDir += 'bank_statements';
          }
          break;
        case 'Retention_trust_certificates':
          {
            baseDir += 'retention_trust_certificates';
          }
          break;
        case 'Transaction_csv_file_attachments':
          {
            baseDir += 'transaction_csv_file_attachments';
          }
          break;
        case 'Optional_attachments':
          {
            baseDir += 'optional_attachments';
          }
          break;
        case 'Compulsory_attachments':
          {
            baseDir += 'compulsory_attachments';
          }
          break;
        case 'Bank_statements':
          {
            baseDir += 'bank_statements';
          }
          break;
        case 'Optional_supporting_statement_attachments':
          {
            baseDir += 'optional_supporting_statement_attachments';
          }
          break;
        case 'Audit':
          {
            baseDir += 'audit_reports';
          }
          break;
        case 'Aba_file_upload':
          {
            baseDir += 'generated_aba_files';
          }
          break;
        case 'Admin_holiday':
          {
            baseDir += 'Admin_holiday';
          }
          break;
      }

      const fullPath = join(
        baseDir,
        customFileName ? customFileName : `${fileNamePrefix}-${filename}`,
      );
      // Ensure the directory exists
      if (!existsSync(baseDir)) {
        mkdirSync(baseDir, { recursive: true });
      }
      this.logger.log(
        `Response recieved in create file path method: ${JSON.stringify(fullPath)}`,
      );
      resolve(fullPath);
    });
  }

  async saveFile(
    decoded,
    createFileUploadInput: CreateFileUploadInput,
    manager?: EntityManager,
  ): Promise<FileAttachments> {

    if (!manager) {
      return await this.entityManager.transaction(async (transactionalManager) => {
        return await this.saveFile(decoded, createFileUploadInput, transactionalManager);
      });
    }
    const fileRepo = manager.getRepository(FileAttachments);
    const userRepo = manager.getRepository(UserDetails);
    const adminRepo = manager.getRepository(AdminDetails);
    const companyRepo = manager.getRepository(CompanyDetails);
    const contractRepo = manager.getRepository(ContractDetails);
    const noticeRepo = manager.getRepository(NoticeDetails);
    const claimsRepo = manager.getRepository(PaymentClaims)

    try {
      const createFile = fileRepo.create(createFileUploadInput);
      const savedFile = await fileRepo.save(createFile);
      console.log('savedFile: ', savedFile);
      this.logger.log(
        `File save and map initiated: ${savedFile.file_name}`,
      );
      if (savedFile && savedFile.id) {
        if (createFileUploadInput?.attachment_type === 'User_profile') {
          const result = await userRepo
            .createQueryBuilder()
            .update(UserDetails)
            .set({
              profile_id: savedFile.id,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('user_id = :user_id', {
              user_id: createFileUploadInput?.user_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Admin_profile') {
          const result = await adminRepo
            .createQueryBuilder()
            .update(AdminDetails)
            .set({
              profile_id: savedFile.id,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('admin_id = :admin_id', {
              admin_id: createFileUploadInput?.admin_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Company_logo') {
          const result = await companyRepo
            .createQueryBuilder()
            .update(CompanyDetails)
            .set({
              logo_id: savedFile.id,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('company_id = :company_id', {
              company_id: createFileUploadInput?.company_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Blog_banner') {
          const result = await this.blogResources
            .createQueryBuilder()
            .update(BlogResource)
            .set({
              banner: savedFile,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('id = :blog_id', {
              blog_id: createFileUploadInput?.blog_res_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Notices_templates'
        ) {
          const result = await this.noticeTemplates
            .createQueryBuilder()
            .update(NoticeTemplates)
            .set({
              notice_template: savedFile,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('notice_template_id = :notice_template_id', {
              notice_template_id: createFileUploadInput?.notice_template_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          ['Notices_uploads', 'Recieved_notices_uploads'].includes(
            createFileUploadInput?.attachment_type,
          )
        ) {
          const noticeData = await noticeRepo.findOne({
            where: { notice_id: createFileUploadInput?.notice_id },
            select: ['id', 'notice_type', 'company_id'],
          });

          if (!noticeData) {
            throw new Error(
              `Notice not found for id: ${createFileUploadInput.notice_id}`,
            );
          }
          console.log('noticeDetails', noticeData);

          // Safely assign the relation using .save()
          noticeData.uploaded_notice = savedFile;
          noticeData.updated_by = decoded.userId;
          noticeData.updated_on = moment.tz('UTC');
          noticeData.updated_group = decoded.isAdmin ? 'ADMIN' : 'USER';


          const updatedNotice = await noticeRepo.save(noticeData);

          this.logger.log(
            `Notice attachment mapped successfully (notice_id: ${updatedNotice.notice_id})`
          );

          // const result = await noticeRepo
          //   .createQueryBuilder()
          //   .update(NoticeDetails)
          //   .set({
          //     uploaded_notice: savedFile,
          //     updated_by: decoded?.userId,
          //     updated_on: moment.tz('UTC'),
          //     updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          //   })
          //   .where('notice_id = :notice_id', {
          //     notice_id: createFileUploadInput?.notice_id,
          //   })
          //   .execute();
          // this.logger.log(
          //   `Response received while updating the attachment id: ${result?.affected}`,
          // );
        } else if (
          createFileUploadInput?.attachment_type === 'qbcc_notice_uploads'
        ) {
          const result = await noticeRepo
            .createQueryBuilder()
            .update(NoticeDetails)
            .set({
              qbcc_uploaded_notice: savedFile,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('notice_id = :notice_id', {
              notice_id: createFileUploadInput?.notice_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Notices_support_docs'
        ) {
          const noticeDetails = await noticeRepo.findOne({
            where: { notice_id: createFileUploadInput?.notice_id },
          });

          let attachmentIds =
            noticeDetails?.supporting_file_attachment_ids ?? [];
          attachmentIds.push(savedFile.id);

          const result = await noticeRepo
            .createQueryBuilder()
            .update(NoticeDetails)
            .set({
              supporting_file_attachment_ids: attachmentIds,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('notice_id = :notice_id', {
              notice_id: createFileUploadInput?.notice_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Discussion_idea_uploads'
        ) {
          const discussionIdeaDetails = await this.discussionsIdeas.findOne({
            where: {
              discussion_idea_id: createFileUploadInput?.discussion_idea_id,
            },
          });

          var discAttachmentIds = discussionIdeaDetails.disc_idea_attachment_ids
            ? discussionIdeaDetails.disc_idea_attachment_ids
            : [];
          discAttachmentIds.push(savedFile.id);
          console.log('savedFile.id: ', savedFile.id);
          console.log('attachmentIds: ', discAttachmentIds);

          const result = await this.discussionsIdeas
            .createQueryBuilder()
            .update(CmtyDiscussionsIdeas)
            .set({
              disc_idea_attachment_ids: discAttachmentIds,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('discussion_idea_id = :discussion_idea_id', {
              discussion_idea_id: createFileUploadInput?.discussion_idea_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Answer_comment_uploads'
        ) {
          const answerCommentDetails = await this.answerComments.findOne({
            where: {
              answer_comment_id: createFileUploadInput?.answer_comment_id,
            },
          });

          var ansAttachmentIds = answerCommentDetails.ans_comm_attachment_ids
            ? answerCommentDetails.ans_comm_attachment_ids
            : [];
          ansAttachmentIds.push(savedFile.id);
          console.log('savedFile.id: ', savedFile.id);
          console.log('attachmentIds: ', attachmentIds);

          const result = await this.answerComments
            .createQueryBuilder()
            .update(CmtyAnswersComments)
            .set({
              ans_comm_attachment_ids: ansAttachmentIds,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('answer_comment_id = :answer_comment_id', {
              answer_comment_id: createFileUploadInput?.answer_comment_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Resource_attachments'
        ) {
          const result = await this.blogResources
            .createQueryBuilder()
            .update(BlogResource)
            .set({
              attachment: savedFile,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('id = :blog_id', {
              blog_id: createFileUploadInput?.blog_res_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Trust_Training_Records'
        ) {
          const companyDetails = await this.companyDetails.findOne({
            where: { company_id: createFileUploadInput?.company_id },
          });
          console.log('companyDetails: ', companyDetails);
          var attachmentIds = companyDetails.training_records_ids
            ? companyDetails.training_records_ids
            : [];
          attachmentIds.push(savedFile.id);
          console.log('savedFile.id: ', savedFile.id);
          console.log('attachmentIds: ', attachmentIds);
          const result = await this.companyDetails
            .createQueryBuilder()
            .update(CompanyDetails)
            .set({
              training_records_ids: attachmentIds,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('company_id = :company_id', {
              company_id: createFileUploadInput?.company_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Contracts') {
          const result = await contractRepo
            .createQueryBuilder()
            .update(ContractDetails)
            .set({
              attachment_id: savedFile.id,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('contract_id = :contract_id', {
              contract_id: createFileUploadInput?.contract_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Variations') {
          const result = await this.variationDetails
            .createQueryBuilder()
            .update(VariationDetails)
            .set({
              attachment_id: savedFile.id,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('variation_id = :variation_id', {
              variation_id: createFileUploadInput?.variation_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (
          createFileUploadInput?.attachment_type === 'Compulsory_attachments'
        ) {
          if (createFileUploadInput?.payment_claim_id) {
            console.log("*********update payment claim repo - txn")
            const claimDetails = await claimsRepo.findOne({
              where: {
                payment_claim_id: createFileUploadInput.payment_claim_id,
              },
            });

            var attachmentIds =
              claimDetails && claimDetails?.compulsory_attachment_ids
                ? claimDetails?.compulsory_attachment_ids
                : [];
            attachmentIds.push(savedFile?.id);

            const result = await claimsRepo
              .createQueryBuilder()
              .update(PaymentClaims)
              .set({
                compulsory_attachment_ids: attachmentIds,
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC'),
                updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
              })
              .where('payment_claim_id = :claim_id', {
                claim_id: createFileUploadInput?.payment_claim_id,
              })
              .execute();
            this.logger.log(
              `Response received while updating the attachment id: ${result?.affected}`,
            );
          } else if (createFileUploadInput?.payment_id) {
            const paymentDetails = await this.paymentDetails.findOne({
              where: { payment_id: createFileUploadInput?.payment_id },
            });
            // console.log('paymentDetails: ', paymentDetails);
            var attachmentIds =
              paymentDetails && paymentDetails?.compulsory_attachment_ids
                ? paymentDetails?.compulsory_attachment_ids
                : [];
            attachmentIds.push(savedFile?.id);
            console.log('savedFile.id: ', savedFile?.id);
            console.log('attachmentIds: ', attachmentIds);
            const result = await this.paymentDetails
              .createQueryBuilder()
              .update(PaymentDetails)
              .set({
                compulsory_attachment_ids: attachmentIds,
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC'),
                updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
              })
              .where('payment_id = :payment_id', {
                payment_id: createFileUploadInput?.payment_id,
              })
              .execute();
            this.logger.log(
              `Response received while updating the attachment id: ${result?.affected}`,
            );
          }
        } else if (
          createFileUploadInput?.attachment_type === 'Optional_attachments'
        ) {
          const paymentDetails = await this.paymentDetails.findOne({
            where: { payment_id: createFileUploadInput?.payment_id },
          });
          // console.log('paymentDetails: ', paymentDetails);
          var attachmentIds = paymentDetails.optional_attachment_ids
            ? paymentDetails.optional_attachment_ids
            : [];
          attachmentIds.push(savedFile.id);
          console.log('savedFile.id: ', savedFile.id);
          console.log('attachmentIds: ', attachmentIds);
          const result = await this.paymentDetails
            .createQueryBuilder()
            .update(PaymentDetails)
            .set({
              optional_attachment_ids: attachmentIds,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('payment_id = :payment_id', {
              payment_id: createFileUploadInput?.payment_id,
            })
            .execute();
          this.logger.log(
            `Response received while updating the attachment id: ${result?.affected}`,
          );
        } else if (createFileUploadInput?.attachment_type === 'Audit') {
          if (createFileUploadInput.audit_id) {
            const audit = await this.auditReportRepo.findOne({
              where: { audit_id: createFileUploadInput.audit_id },
            });

            if (audit) {
              const updatedAttachmentIds = audit.attachment_ids || [];
              updatedAttachmentIds.push(savedFile.id);

              const result = await this.auditReportRepo
                .createQueryBuilder()
                .update(AuditReport)
                .set({
                  attachment_ids: updatedAttachmentIds,
                  updated_by: decoded?.userId,
                  updated_on: moment.tz('UTC'),
                  updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
                })
                .where('audit_id = :audit_id', {
                  audit_id: createFileUploadInput?.audit_id,
                })
                .execute();

              this.logger.log(
                `Attachment ${savedFile.id} added to audit ${createFileUploadInput.audit_id}. Rows affected: ${result?.affected}`,
              );
            } else {
              this.logger.warn(
                `No audit found for audit_id ${createFileUploadInput.audit_id}`,
              );
            }
          } else {
            this.logger.log(
              `Audit ID not provided, skipping attachment update`,
            );
          }
        } else if (
          createFileUploadInput?.attachment_type === 'aba_file_uploads'
        ) {
          this.logger.log(
            `Response received while updating the attachment id: ${savedFile.id}`,
          );
        }
      }
      return savedFile;
    } catch (error) {
      this.logger.log(
        `File save and map errored out with message ${error}`,
      );
      throw error;
    }
  }

  async getBlogFileDetails(attachment_type: string, blog_res_id?: string) {
    this.logger.log(
      `Get attachment of blog called for blog-id: ${blog_res_id}`,
    );
    const queryBuilder = this.blogResources
      .createQueryBuilder('b')
      .select('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .where('b.id = :blog_res_id', { blog_res_id })
      .andWhere('f.attachment_type = :attachment_type', { attachment_type });
    if (attachment_type === 'Blog_banner') {
      queryBuilder
        .leftJoin(FileAttachments, 'f', 'b.bannerImage = f.id')
        .addSelect('b.bannerImage', 'attachment_id');
    } else {
      queryBuilder
        .leftJoin(FileAttachments, 'f', 'b.attachment = f.id')
        .addSelect('b.attachment', 'attachment_id');
    }
    return await queryBuilder.getRawOne();
  }

  async getFileDetails(
    attachment_type: string,
    user_id?: number,
    company_id?: number,
    is_admin?: boolean,
  ) {
    if (company_id) {
      const queryBuilder = this.companyDetails
        .createQueryBuilder('c')
        .select('f.file_path', 'file_path')
        .addSelect('f.file_type', 'file_type')
        .addSelect('c.company_id', 'company_id')
        .addSelect('c.logo_id', 'attachment_id')
        .addSelect('r.user_id', 'user_id')
        .leftJoin(FileAttachments, 'f', 'c.logo_id = f.id')
        .leftJoin(CompanyUserRoles, 'r', 'c.company_id = r.company_id')
        .where('c.company_id = :company_id', { company_id })
        .andWhere('f.attachment_type = :attachment_type', { attachment_type });
      return await queryBuilder.getRawOne();
      // await this.fileAttachments.findOne({
      //   where: { attachment_type }, //{ company_id, attachment_type }
      // });
    } else {
      if (!is_admin) {
        const queryBuilder = this.userDetails
          .createQueryBuilder('c')
          .select('f.file_path', 'file_path')
          .addSelect('f.file_type', 'file_type')
          .addSelect('c.user_id', 'user_id')
          .addSelect('c.profile_id', 'attachment_id')
          .leftJoin(FileAttachments, 'f', 'c.profile_id = f.id')
          .where('c.user_id = :user_id', { user_id })
          .andWhere('f.attachment_type = :attachment_type', {
            attachment_type,
          });
        return await queryBuilder.getRawOne();
      } else {
        const queryBuilder = this.adminDetails
          .createQueryBuilder('c')
          .select('f.file_path', 'file_path')
          .addSelect('f.file_type', 'file_type')
          .addSelect('c.admin_id', 'admin_id')
          .addSelect('c.profile_id', 'attachment_id')
          .leftJoin(FileAttachments, 'f', 'c.profile_id = f.id')
          .where('c.admin_id = :admin_id', { admin_id: user_id })
          .andWhere('f.attachment_type = :attachment_type', {
            attachment_type,
          });
        return await queryBuilder.getRawOne();
      }
    }
  }

  async deleteBlogFile(
    decoded: any,
    attachment_type: string,
    attachment_id: string,
    blogResId: string,
  ) {
    if (attachment_type === 'Blog_banner') {
      const result = await this.blogResources
        .createQueryBuilder()
        .update(BlogResource)
        .set({
          banner: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :blog_res_id', {
          blog_res_id: blogResId,
        })
        .execute();
    }
    if (attachment_type === 'Resource_attachments') {
      const result = await this.blogResources
        .createQueryBuilder()
        .update(BlogResource)
        .set({
          attachment: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :blog_res_id', {
          blog_res_id: blogResId,
        })
        .execute();
    }
    return await this.fileAttachments.delete({ id: attachment_id });
  }

  async deleteFile(decoded: any, id: string, company_id: number) {
    if (company_id) {
      const result = await this.companyDetails
        .createQueryBuilder()
        .update(CompanyDetails)
        .set({
          logo_id: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('company_id = :company_id', {
          company_id: company_id,
        })
        .execute();
      //return await this.fileAttachments.delete({ company_id, attachment_type });
    } else {
      if (!decoded?.isAdmin) {
        const result = await this.userDetails
          .createQueryBuilder()
          .update(UserDetails)
          .set({
            profile_id: null,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where('user_id = :user_id', {
            user_id: decoded?.userId,
          })
          .execute();
        //return this.fileAttachments.delete({ user_id, attachment_type });
      } else {
        const result = await this.adminDetails
          .createQueryBuilder()
          .update(AdminDetails)
          .set({
            profile_id: null,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where('admin_id = :admin_id', {
            admin_id: decoded?.userId,
          })
          .execute();
        //return this.fileAttachments.delete({ user_id, attachment_type });
      }
    }
    return await this.fileAttachments.delete({ id });
  }

  async getFileDetailsById(id: string) {
    return await this.fileAttachments.findOne({
      where: { id },
    });
  }

  async getTrustTrainingRecordsByCompany(company_id: number) {
    const companyDetails = await this.companyDetails.findOne({
      where: { company_id },
    });
    if (
      companyDetails.training_records_ids &&
      companyDetails.training_records_ids.length > 0
    ) {
      const queryBuilder = await this.fileAttachments
        .createQueryBuilder('f')
        .select('f.id', 'id')
        .addSelect('f.file_path', 'file_path')
        .addSelect('f.file_type', 'file_type')
        .addSelect('f.name', 'name')
        .addSelect('f.uploaded_on', 'uploaded_on')
        .where('f.attachment_type = :attachment_type', {
          attachment_type: 'Trust_Training_Records',
        })
        .andWhere('f.id IN (:...training_records_ids)', {
          training_records_ids: companyDetails.training_records_ids,
        })
        .orderBy({ 'f.uploaded_on': 'DESC' });
      const response = await queryBuilder.getRawMany();
      return response;
    }
    return [];
  }

  async validateCsvHeaders(
    filePath: string,
    requiredHeaders: string[],
  ): Promise<void> {
    this.logger.log(
      `CSV uploaded validation initiated for ${filePath}`,
    );
    return new Promise((resolve, reject) => {
      const parser = createReadStream(filePath).pipe(parse({ columns: true }));

      let headersValidated = false;
      parser.on('data', (data) => {
        if (!headersValidated) {
          const headers = Object.keys(data);

          const hasAllHeaders = requiredHeaders.every((header) =>
            headers.includes(header),
          );

          if (!hasAllHeaders) {
            this.logger.log(
              `CSV file validation failed with absence of mandatory headers`,
            );
            reject(
              new Error('CSV file does not contain all mandatory headers.'),
            );
            return;
          }
          headersValidated = true;
        }
      });

      parser.on('end', resolve);
      parser.on('error', reject);
    });
  }

  async getTrustTrainingRecordsByIdArray(id_array: string[]) {
    if (id_array && id_array.length > 0) {
      const queryBuilder = await this.fileAttachments
        .createQueryBuilder('f')
        .select('f.id', 'id')
        .addSelect('f.file_path', 'file_path')
        .addSelect('f.file_type', 'file_type')
        .addSelect('f.name', 'name')
        .addSelect('f.uploaded_on', 'uploaded_on')
        .where('f.attachment_type = :attachment_type', {
          attachment_type: 'Trust_Training_Records',
        })
        .andWhere('f.id IN (:...training_records_ids)', {
          training_records_ids: id_array,
        })
        .orderBy({ 'f.uploaded_on': 'DESC' });
      const response = await queryBuilder.getRawMany();
      return response;
    }
    return [];
  }

  async getFileDetailsByIdAndType(id: string, attachmentType: string) {
    const queryBuilder = this.fileAttachments
      .createQueryBuilder('f')
      .select('f.id', 'id')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .addSelect('f.name', 'name')
      .addSelect('f.uploaded_on', 'uploaded_on')
      .where('f.attachment_type = :attachment_type', {
        attachment_type: attachmentType,
      })
      .andWhere('f.id = :id', { id });
    return await queryBuilder.getRawOne();
  }

  async deleteTrustTrainingRecordsById(
    decoded: any,
    idArray: string[],
    company_id: number,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const companyDetails = await transactionalEntityManager.findOne(
            CompanyDetails,
            {
              where: { company_id },
            },
          );
          console.log(
            'companyDetails: ',
            companyDetails,
            companyDetails.training_records_ids,
          );
          companyDetails.training_records_ids =
            companyDetails.training_records_ids
              ? companyDetails.training_records_ids.filter(
                (element) => !idArray.includes(element),
              ) //element !== id
              : null;
          const result = await transactionalEntityManager
            .createQueryBuilder()
            .update(CompanyDetails)
            .set({
              training_records_ids: companyDetails.training_records_ids,
              updated_by: decoded?.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where('company_id = :company_id', {
              company_id: company_id,
            })
            .execute();
          return await transactionalEntityManager.delete(FileAttachments, {
            id: In(idArray),
          });
        },
      );
    } catch (error) {
      throw new Error(error);
    }
  }

  async getCompanyName(company_id: number) {
    const companyDetails = await this.companyDetails.findOne({
      where: { company_id },
    });

    return companyDetails.company_name;
  }

  async getNoticeNameId(notice_id: number) {
    const noticeData = await this.noticeDetails.findOne({
      where: { notice_id },
    });

    return {
      id: noticeData.id,
      notice_type: noticeData.notice_type,
      notice_id: noticeData.notice_id,
    };
  }

  async deleteFileByIdAndType(
    decoded: any,
    id: string,
    attachmentId: string,
    attachment_type: string,
  ) {
    this.logger.log(
      `Delete attachment initiated ${attachmentId}`,
    );
    if (attachment_type === 'Contracts') {
      const result = await this.contractDetails
        .createQueryBuilder()
        .update(ContractDetails)
        .set({
          attachment_id: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: id })
        .execute();
    } else if (attachment_type === 'Variations') {
      const result = await this.variationDetails
        .createQueryBuilder()
        .update(VariationDetails)
        .set({
          attachment_id: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: id })
        .execute();
    } else if (attachment_type === 'Notices_support_docs') {
      const notice = await this.noticeDetails.findOne({
        where: { id },
      });

      let attachmentIds = notice?.supporting_file_attachment_ids ?? [];

      // Remove the given id
      attachmentIds = attachmentIds.filter((attId) => attId !== attachmentId);

      await this.noticeDetails
        .createQueryBuilder()
        .update(NoticeDetails)
        .set({
          supporting_file_attachment_ids: attachmentIds,
          updated_by: decoded?.userId,
          updated_on: moment().tz('UTC').toDate(),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id })
        .execute();
    } else if (attachment_type === 'Notices_uploads') {
      const result = await this.noticeDetails
        .createQueryBuilder()
        .update(NoticeDetails)
        .set({
          uploaded_notice: null,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: id })
        .execute();
    } else if (attachment_type === 'Answer_comment_uploads') {
      const result = await this.noticeDetails
        .createQueryBuilder()
        .update(CmtyAnswersComments)
        .set({
          ans_comm_attachment_ids: () => `
          NULLIF(
                array_to_string(
                    array_remove(string_to_array(ans_comm_attachment_ids, ','), '${attachmentId}'), 
                    ','
                ), 
                ''
            )`,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: id })
        .execute();
    } else if (attachment_type === 'Discussion_idea_uploads') {
      const result = await this.noticeDetails
        .createQueryBuilder()
        .update(CmtyDiscussionsIdeas)
        .set({
          disc_idea_attachment_ids: () => `
          NULLIF(
                array_to_string(
                    array_remove(string_to_array(disc_idea_attachment_ids, ','), '${attachmentId}'), 
                    ','
                ), 
                ''
            )`,
          updated_by: decoded?.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where('id = :id', { id: id })
        .execute();
    }
    // else if (attachment_type === 'Audit') {
    //   const result = await this.auditReportRepo
    //     .createQueryBuilder()
    //     .update(AuditReport)
    //     .set({
    //       attachment_ids: null,
    //       updated_by: decoded?.userId,
    //       updated_on: moment.tz('UTC'),
    //       updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
    //     })
    //     .where('id = :id', { id: id })
    //     .execute();
    // }
    if (attachment_type !== 'Notices_support_docs') {
      return await this.fileAttachments.delete({ id: attachmentId });
    } else {
      this.logger.log(
        `No files are deleted ${attachmentId}`,
      );
      return;
    }
  }

  async getCustomFileName(payload: {
    attachment_type: string;
    module_id?: number;
    data?: Partial<Record<string, any>>;
    decoded?: Partial<Record<string, any>>;
  }) {
    try {
      const { attachment_type, module_id, data, decoded } = payload;
      let customFileName = null,
        isClaimPayment = false,
        dataLength = Object.keys(data ?? {}).length,
        fileNamePrefix = Date.now(),
        timeZone = decoded?.timezone;

      if (dataLength) {
        isClaimPayment = data?.isClaimPayment ? true : false;
      }

      const formattedDate = (
        date?: Date,
        format: 'MM' | 'DDMMYYYY' = 'DDMMYYYY',
      ) =>
        moment(date ?? new Date())
          .tz(timeZone ?? 'UTC')
          .format(format);

      const formatDate = (
        date?: Date,
        format: 'MM' | 'DDMMYYYY' = 'DDMMYYYY',
      ) => moment(date ?? new Date()).format(format);

      const throwErrIfRecordNotFound = () => {
        throw new Error(`${attachment_type} record not found`);
      };

      if (attachment_type === 'Variations') {
        const variation = await this.variationDetails.findOne({
          where: {
            variation_id: module_id,
          },
          relations: ['contractDetails'],
        });

        if (!variation) throwErrIfRecordNotFound();

        customFileName = `${variation?.variation_id}-${variation?.variation_name}-${variation?.contractDetails?.contract_name}-${formattedDate(variation?.created_on)}`;
      } else if (attachment_type === 'Contracts') {
        const contract = await this.contractDetails.findOne({
          where: {
            contract_id: module_id,
          },
          relations: ['clientSuppliersDetails'],
        });

        if (!contract) throwErrIfRecordNotFound();

        customFileName = `${contract?.clientSuppliersDetails?.client_supplier_type} Contract-${contract?.contract_id}-${contract?.contract_name}-${formatDate(contract?.contract_start_date)}`;
      } else if (attachment_type === 'Bank_statements' && dataLength) {
        customFileName = `${formattedDate(data?.created_on)}-${data?.account_name}-${data?.account_number}-Statement-${formatDate(data?.statement_date)}`;
      } else if (
        attachment_type === 'Optional_supporting_statement_attachments'
      ) {
        customFileName = `${data?.claim_type}-Supporting Statement-${data?.payment_claim_id}-${formatDate(data?.claim_type === 'Billable' ? data?.received_date : data?.sent_date)}-${fileNamePrefix}`;
      } else if (
        attachment_type === 'Optional_attachments' &&
        !isClaimPayment
      ) {
        customFileName = `${data?.claim_type}-Optional-${data?.payment_claim_id}-${formatDate(data?.claim_type === 'Billable' ? data?.received_date : data?.sent_date)}-${fileNamePrefix}`;
      } else if (
        attachment_type === 'Compulsory_attachments' &&
        !isClaimPayment
      ) {
        customFileName = `${data?.claim_type}-Compulsory attachment-${data?.payment_claim_id}-${formatDate(data?.claim_type === 'Billable' ? data?.received_date : data?.sent_date)}-${fileNamePrefix}`;
      } else if (attachment_type === 'Retention_trust_certificates') {
        customFileName = `Training-${data?.account_number}-${formattedDate()}-${fileNamePrefix}`;
      } else if (attachment_type === 'Audit') {
        const auditReport = await this.getAuditReportDetail(Number(module_id));
        customFileName = `AuditReport-${auditReport?.account_name}-${formattedDate(new Date(auditReport?.aud_gen_from_date))}-${formattedDate(new Date(auditReport?.aud_gen_to_date))}-${formattedDate(new Date(auditReport?.audit_date), 'MM')}-${fileNamePrefix}`;
      } else if (
        (attachment_type === 'Optional_attachments' ||
          attachment_type === 'Compulsory_attachments') &&
        isClaimPayment
      ) {
        const claimPayment = await this.getPaymentDetail(Number(module_id));
        customFileName = `Payment-${claimPayment?.payment_claim_id}-Supporting Statement-${claimPayment?.payment_type}-${formatDate(claimPayment?.payment_date)}-${fileNamePrefix}`;
        console.log('customFileName: ', customFileName);
      }

      // else if (attachment_type === 'Notices_uploads') {
      //   const noticeDetail = await this.getNoticeDetail(Number(module_id));

      //   customFileName = ``
      // }

      if (customFileName) {
        return `Paytrade-${customFileName}`;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  async getNoticeDetail(notice_id: number) {
    const noticeDetail = await this.noticeDetails.findOne({
      where: {
        notice_id,
      },
    });

    if (!noticeDetail) throw new Error('Notice record not found');

    return noticeDetail;
  }

  async getPaymentDetail(payment_id: number) {
    const paymentDetail = await this.paymentDetails.findOne({
      where: {
        payment_id,
      },
    });

    if (!paymentDetail) throw new Error('Payment record not found');

    return paymentDetail;
  }

  async getBankStatmentDetail(id: number) {
    const bankStatement = await this.bankStatements
      .createQueryBuilder('bs')
      .select([
        'bs.id as id',
        'bs.bank_statement_id as bank_statement_id',
        'bs.bank_account_id as bank_account_id',
        'bs.created_on as created_on',
        'bs.statement_date as statement_date',
        'bs.bank_statement_attachment_id as bank_statement_attachment_id',
        'ba.account_name as account_name',
        'ba.account_number as account_number',
      ])
      .innerJoin(BankAccounts, 'ba', 'ba.bank_account_id = bs.bank_account_id')
      .where('bs.bank_statement_id = :bank_statement_id', {
        bank_statement_id: id,
      })
      .getRawOne();

    if (!bankStatement) throw new Error('Bank statement record not found');

    return bankStatement;
  }

  async getPaymentClaimDetail(payment_claim_id: number) {
    const paymentClaim = await this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .select([
        'pc.id as id',
        'pc.payment_claim_id as payment_claim_id',
        'pc.claim_type as claim_type',
        'pc.sent_date as sent_date',
        'pc.received_date as received_date',
        'pc.compulsory_attachment_ids as compulsory_attachment_ids',
        'pc.optional_attachment_ids as optional_attachment_ids',
      ])
      .where('pc.payment_claim_id = :payment_claim_id', {
        payment_claim_id,
      })
      .getRawOne();

    console.log('payment_claim_id: ', payment_claim_id);
    console.log('paymentClaim: ', paymentClaim);

    if (!paymentClaim) throw new Error('Claim record not found');

    return paymentClaim;
  }

  async getBankAccountDetail(bank_account_id: number) {
    const bankAcc = await this.bankAccounts
      .createQueryBuilder('bc')
      .where('bc.bank_account_id = :bank_account_id', { bank_account_id })
      .getOne();

    if (!bankAcc) throw new Error('Bank account record not found');

    console.log('bank_account_id: ', bank_account_id);
    console.log('bankAcc: ', bankAcc);

    return bankAcc;
  }

  async getAuditReportDetail(audit_id: number) {
    const auditReport = await this.auditReport
      .createQueryBuilder('ar')
      .select([
        'ar.audit_id as audit_id',
        'ar.audit_date as audit_date',
        'ar.aud_gen_to_date as aud_gen_to_date',
        'ar.aud_gen_from_date as aud_gen_from_date',
        'bc.account_name as account_name',
      ])
      .innerJoin(BankAccounts, 'bc', 'bc.bank_account_id = ar.bank_account_id')
      .where('ar.audit_id = :audit_id', { audit_id })
      .getRawOne();

    console.log('auditReport: ', auditReport);

    if (!auditReport) throw new Error('Audit report record not found');

    return auditReport;
  }

  async getFileDetailById(id: string) {
    return await this.fileAttachments.findOne({
      where: {
        id,
        custom_file_name: IsNull(),
      },
    });
  }

  async changeAttachmentName(oldPath: string, newPath: string) {
    try {
      if (existsSync(oldPath)) {
        await fsPromises.rename(oldPath, newPath);
        console.log(`File renamed from ${oldPath} to ${newPath}`);
        return true;
      }
      console.log(`File not found ${oldPath}`);
    } catch (error) {
      console.error(`Error renaming file: ${error.message}`);
      throw error;
    }
  }

  async updateFileName({
    attachment_type,
    attachment_ids,
    module_id,
    module_detail,
    decoded,
  }: {
    attachment_type:
    | 'Bank_statements'
    | 'Optional_supporting_statement_attachments'
    | 'Compulsory_attachments'
    | 'Optional_attachments'
    | 'Retention_trust_certificates';
    attachment_ids: string | string[];
    module_id?: string | number;
    module_detail?: Partial<Record<string, any>>;
    decoded?: Partial<Record<string, any>>;
  }) {
    try {
      const isAttachmentIdArr = Array.isArray(attachment_ids),
        moduleDetailLen = Object.keys(module_detail ?? {}).length;
      const newFileDetail: Record<
        'oldPath' | 'customFileName' | 'attachment_id',
        any
      >[] = [];

      const noChangeToSave = () => {
        console.log('No changes to save');
        return true;
      };

      const addFileDetailToArr = async ({
        attachmentIds,
        data,
      }: {
        attachmentIds: string[];
        data: Partial<Record<string, any>>;
      }) => {
        for (let index = 0; index < attachmentIds.length; index++) {
          const fileDetails = await this.getFileDetailById(
            attachmentIds?.[index],
          );

          if (!fileDetails) {
            continue;
          }

          // Skip renaming for compulsory attachments that start with 'S75'
          if (
            attachment_type === 'Compulsory_attachments' &&
            typeof fileDetails.file_name === 'string' &&
            fileDetails.file_name.toUpperCase().startsWith('S75')
          ) {
            console.log(
              `Skipping rename for compulsory attachment starting with S75: ${fileDetails.file_name} (id: ${fileDetails.id})`,
            );
            continue; // skip this file
          }

          const customFileName = await this.getCustomFileName({
            attachment_type,
            data,
            decoded,
          }),
            fileMimeType = path.extname(fileDetails?.file_name);

          newFileDetail.push({
            customFileName: `${customFileName}${fileMimeType}`,
            oldPath: fileDetails?.file_path,
            attachment_id: fileDetails?.id,
          });
        }
        return true;
      };

      if (attachment_type === 'Bank_statements' && !isAttachmentIdArr) {
        const bankStatement = await this.getBankStatmentDetail(
          Number(module_id),
        );

        await addFileDetailToArr({
          attachmentIds: [attachment_ids],
          data: bankStatement,
        });
      } else if (
        attachment_type === 'Optional_supporting_statement_attachments' &&
        isAttachmentIdArr &&
        attachment_ids.length &&
        moduleDetailLen
      ) {
        await addFileDetailToArr({
          attachmentIds: attachment_ids,
          data: module_detail,
        });
      } else if (
        attachment_type === 'Compulsory_attachments' &&
        isAttachmentIdArr &&
        attachment_ids.length &&
        moduleDetailLen
      ) {
        await addFileDetailToArr({
          attachmentIds: attachment_ids,
          data: module_detail,
        });
      } else if (
        attachment_type === 'Optional_attachments' &&
        isAttachmentIdArr &&
        attachment_ids.length &&
        moduleDetailLen
      ) {
        await addFileDetailToArr({
          attachmentIds: attachment_ids,
          data: module_detail,
        });
      } else if (
        attachment_type === 'Retention_trust_certificates' &&
        isAttachmentIdArr &&
        attachment_ids.length
      ) {
        const bankAcc = await this.getBankAccountDetail(Number(module_id));

        await addFileDetailToArr({
          attachmentIds: attachment_ids,
          data: bankAcc,
        });
      }

      console.log('newFileDetail: ', newFileDetail);

      for (let index = 0; index < newFileDetail.length; index++) {
        const newFileDetailObj = newFileDetail[index];
        const { oldPath, customFileName, attachment_id } = newFileDetailObj;

        const newPath = await this.createFilePath({
          attachmentType: attachment_type,
          customFileName: customFileName,
        });
        const res = await this.changeAttachmentName(oldPath, newPath);

        if (res) {
          await this.fileAttachments.update(
            {
              id: attachment_id,
            },
            {
              file_path: newPath,
              custom_file_name: customFileName,
            },
          );
          console.log(`File path updated - ${attachment_id}`);
        } else {
          console.log(`File path updated - Failed`);
        }
      }

      this.logger.log(
        `Updated ${attachment_type} attachment name with module id: ${JSON.stringify({ module_id })}`,
      );

      return true;
    } catch (error) {
      console.log('Err updateFileName: ', error?.message);
      throw error;
    }
  }
}
