import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, Between, Not, In, EntityManager } from 'typeorm';
import {
  validatePresenceOfMandatoryParams,
  validatePresenceOfValidParams,
} from 'src/libs/@validators/validator';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { NoticesService } from './notices.service';
import { generateNoticeInput } from './notices.input';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';

@Injectable()
export class NoticesValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(NoticeTemplates)
    private noticesTemplatesRepo: Repository<NoticeTemplates>,
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepo: Repository<PaymentDetails>,
    @InjectRepository(AuditReport)
    private AuditRepo: Repository<AuditReport>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(FileAttachments)
    private readonly fileAttachments: Repository<FileAttachments>,

    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('NOTICES_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateCreateNotice(data: generateNoticeInput, manager?: EntityManager) {
    try {
      this.logger.log(
        `Request received for validating create notice with data: ${JSON.stringify(data)}`,
      );

      let {
        company_id,
        contract_id,
        project_id,
        audit_id,
        bank_account_id,
        payment_claim_id,
        payment_id,
        notice_type,
      } = data;

      const all_notices_types = [
        'QBCC TA1 Project Trust Account Notice',
        'Client S18B Project Trust Account Notice',
        'Supplier S23 Project Trust Account Notice',
        'QBCC TA3 Notice Of Related Entities',
        'Supplier S18C Project Trust Account Notice',
        'Client Payment Claim Notice',
        'Supplier Payment Schedule Notice',
        'Supplier Payment Remittance Advice Notice',
        'QBCC TA4 Part Payment Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA5 Nil Return Notice',
        'Supplier Retention Payment Remittance Notice',
        'Supplier Retention Payment Schedule Notice',
        'Supplier Payment with Retention Withheld Notice',
        'Supplier Payment with Retention Schedule Notice',
        'Supplier S23 Retention Trust Account Notice',
        'Supplier S18C Retention Trust Account Notice',
        'QBCC TA1 Retention Trust Account Notice',
        'Contracting Party Account Closing Notice',
        'QBCC TA2 Retention Account Closing Notice',
      ];

      const repo = manager ?? this.entityManager;

      const useRepo = (manager: EntityManager | undefined, repo: Repository<any>) => {
        return manager ? manager.getRepository(repo.target) : repo;
      };
      const fileRepo = useRepo(manager, this.fileAttachments);

      if (all_notices_types.includes(notice_type)) {
        let validParams;
        let mandatoryParams;

        const genericMandatoryParams = [
          'company_id',
          'notice_type',
          'notice_source',
        ];

        if (notice_type == 'Supplier S23 Project Trust Account Notice') {
          mandatoryParams = [
            'contract_id',
            'project_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];
          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: contract_id },
            relations: ['fileAttachments'],
          });

          if (contract_details.payment_from_account) {
            const account_details = await repo.findOne(BankAccounts, {
              where: {
                bank_account_id: contract_details.payment_from_account,
                account_type: 'Project Trust Account',
              },
            });

            const template_details = await this.noticesTemplatesRepo.findOne({
              where: {
                notice_template_name:
                  'Supplier S23 Project Trust Account Notice',
              },
            });

            data.project_id = contract_details.project_id;
            data.bank_account_id = account_details.bank_account_id;
            data.client_supplier_id = contract_details.client_supplier_id;
            data.notice_template_id = template_details.notice_template_id;
            data.supporting_file_attachment_ids = contract_details?.fileAttachments?.id
              ? [contract_details.fileAttachments.id]
              : [];
            data.notice_source =
              contract_details.contract_id +
              ' ' +
              contract_details.contract_name;

          } else {
            throw new Error('Trust account details not found');
          }
        } else if (notice_type == 'QBCC TA1 Project Trust Account Notice') {
          mandatoryParams = [
            'company_id',
            'bank_account_id',
            'project_id',
            'notice_template_id',
            'client_supplier_id',
          ];

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: 'Project Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: {
              notice_template_name: 'QBCC TA1 Project Trust Account Notice',
            },
          });

          data.company_id = company_id;
          data.bank_account_id = account_details.bank_account_id;
          data.notice_template_id = template_details.notice_template_id;
          data.client_supplier_id = account_details.client_supplier_id;
          data.project_id = account_details.project_ids[0];
          data.notice_source =
            account_details.bank_account_id +
            ' ' +
            account_details.account_name;
        } else if (notice_type == 'Client S18B Project Trust Account Notice') {
          mandatoryParams = [
            'company_id',
            'bank_account_id',
            'project_id',
            'client_supplier_id',
            'notice_template_id',
            // 'supporting_file_attachment_id',
          ];

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: 'Project Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.company_id = company_id;
          data.client_supplier_id = account_details.client_supplier_id;
          data.bank_account_id = account_details.bank_account_id;
          data.notice_template_id = template_details.notice_template_id;
          data.project_id = account_details.project_ids[0];
          data.notice_source =
            account_details.bank_account_id +
            ' ' +
            account_details.account_name;
        } else if (notice_type == 'QBCC TA3 Notice Of Related Entities') {
          mandatoryParams = [
            'contract_id',
            'project_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: contract_id },
            relations: ['fileAttachments'],
          });

          const whereConditions: any = data.is_retention
            ? {
              bank_account_id: contract_details.retention_from_account,
              account_type: 'Retention Trust Account',
            }
            : {
              bank_account_id: contract_details.payment_from_account,
              account_type: 'Project Trust Account',
            };

          const account_details = await repo.findOne(BankAccounts, {
            where: whereConditions,
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          delete data.is_retention;

          data.project_id = contract_details.project_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.supporting_file_attachment_ids = contract_details?.fileAttachments?.id
            ? [contract_details.fileAttachments.id]
            : [];
          data.notice_source =
            contract_details.contract_id + ' ' + contract_details.contract_name;
        } else if (
          notice_type == 'Supplier S18C Project Trust Account Notice'
        ) {
          //old account details pending
          mandatoryParams = [
            'contract_id',
            'project_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: contract_id },
            relations: ['fileAttachments'],
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: contract_details.payment_from_account,
              account_type: 'Project Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.supporting_file_attachment_ids = contract_details?.fileAttachments?.id
            ? [contract_details.fileAttachments.id]
            : [];
          data.notice_source =
            contract_details.contract_id + ' ' + contract_details.contract_name;
        } else if (notice_type == 'Client Payment Claim Notice') {
          mandatoryParams = [
            'payment_claim_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
            'has_import_button',
          ];

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
            // relations: ['payment_to_acount'],
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          let supportDocs: any[] = [];

          if (payment_claim_details.compulsory_attachment_ids) {
            const supportFileIds = (payment_claim_details.compulsory_attachment_ids || [])
              .map((id) => id.trim())
              .filter(Boolean);
            if (supportFileIds.length > 0) {
              const fetchedFileAttachments = await fileRepo
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

              const s75Files = fetchedFileAttachments?.filter((f) =>
                f?.file_name?.startsWith('S75-support-statement-claim'),
              ) || [];

              const otherFiles =
                fetchedFileAttachments?.filter(
                  (f) => !f?.file_name?.startsWith('S75-support-statement-claim'),
                ) || [];

              // Pick the latest S75 file (if any)
              let latestS75File = null;
              if (s75Files.length > 0) {
                s75Files.sort((a, b) => {
                  const dateA = new Date(a.uploaded_on || 0).getTime();
                  const dateB = new Date(b.uploaded_on || 0).getTime();
                  return dateB - dateA;
                });
                latestS75File = s75Files[0];
              }

              supportDocs = latestS75File ? [latestS75File, ...otherFiles] : otherFiles;

            }
          }

          data.project_id = contract_details.project_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.bank_account_id = contract_details.payment_to_account;
          data.contract_id = contract_details.contract_id;
          // data.supporting_file_attachment_ids =
          //   payment_claim_details.compulsory_attachment_ids ?
          //     payment_claim_details.compulsory_attachment_ids : [];
          data.supporting_file_attachment_ids = supportDocs ? supportDocs.map((f) => f.id) : [];
          data.notice_source =
            payment_claim_details.payment_claim_id +
            ' ' +
            payment_claim_details.claim_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
          data.has_import_button = true;
        } else if (notice_type == 'Supplier Payment Schedule Notice') {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'has_import_button',
            // 'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          // const payment_details = await this.paymentDetailsRepo
          //   .createQueryBuilder('p')
          //   .select([
          //     'p.payment_id AS payment_id',
          //     'p.project_id AS project_id',
          //     'p.payment_claim_id AS payment_claim_id',
          //     'p.client_supplier_id AS client_supplier_id',
          //     'p.contract_id AS contract_id',
          //     'p.payment_type AS payment_type',
          //     'p.payment_from_account AS payment_from_account',
          //   ])
          //   .where('p.payment_id = :payment_id', { payment_id })
          //   .getRawOne();

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = payment_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.contract_id = payment_details.contract_id;
          data.payment_claim_id = payment_details.payment_claim_id;
          data.bank_account_id = payment_details.payment_from_account;
          data.client_supplier_id = payment_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.notice_source =
            payment_details.payment_id + ' ' + payment_details.payment_type;
          data.has_import_button = true;
          data.supporting_file_attachment_ids =
            payment_details.compulsory_attachment_ids
              ? payment_details?.compulsory_attachment_ids
              : [];
        } else if (notice_type == 'Supplier Payment Remittance Advice Notice') {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'has_import_button',
            // 'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.contract_id = contract_details.contract_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.bank_account_id = payment_details.payment_from_account;
          data.notice_template_id = template_details.notice_template_id;
          data.notice_source =
            payment_claim_details.payment_claim_id +
            ' ' +
            payment_claim_details.claim_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
          data.supporting_file_attachment_ids =
            payment_details.compulsory_attachment_ids
              ? payment_details?.compulsory_attachment_ids
              : [];
          data.has_import_button = true;
        } else if (notice_type == 'QBCC TA4 Part Payment Notice') {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            // 'supporting_file_attachment_ids'
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: payment_details.payment_from_account,
              account_type: 'Project Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });
          data.project_id = contract_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.contract_id = contract_details.contract_id;
          if (Array.isArray(payment_details?.compulsory_attachment_ids) && payment_details.compulsory_attachment_ids.length > 0)
            data.supporting_file_attachment_ids =
              payment_details.compulsory_attachment_ids ?  payment_details.compulsory_attachment_ids: [];
          data.notice_source =
            payment_details.payment_id +
            ' ' +
            payment_details.payment_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
        } else if (notice_type == 'QBCC TA2 Account Closing Notice') {
          //pending
          mandatoryParams = ['bank_account_id'];

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: 'Project Trust Account',
            },
          });
          data.bank_account_id = account_details.bank_account_id;
        } else if (notice_type == 'QBCC TA5 Nil Return Notice') {
          mandatoryParams = [
            'bank_account_id',
            'company_id',
            'audit_id',
            'project_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: In([
                'Project Trust Account',
                'Retention Trust Account',
              ]),
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          const audit_details = await repo.findOne(AuditReport, {
            where: { audit_id: audit_id },
          });

          data.bank_account_id = account_details.bank_account_id;
          data.audit_id = audit_id;
          data.notice_source =
            account_details.bank_account_id +
            ' ' +
            account_details.account_name;
          data.project_id =
            account_details.project_ids.length > 0
              ? account_details.project_ids[0]
              : null;
          data.notice_template_id = template_details.notice_template_id;
          data.supporting_file_attachment_ids = audit_details.attachment_ids ? audit_details.attachment_ids : [];
        } else if (
          notice_type == 'Supplier Retention Payment Remittance Notice'
        ) {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const paymentAttachment = payment_details.compulsory_attachment_ids
            ? payment_details.compulsory_attachment_ids
            : [];

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: payment_details.payment_from_account,
              account_type: 'Retention Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.contract_id = contract_details.contract_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.notice_source =
            payment_details.payment_id +
            ' ' +
            payment_details.payment_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;

          data.supporting_file_attachment_ids = paymentAttachment ? paymentAttachment : [];
        } else if (
          notice_type == 'Supplier Retention Payment Schedule Notice'
        ) {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'has_import_button',
            'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const paymentAttachment = payment_details.compulsory_attachment_ids
            ? payment_details.compulsory_attachment_ids
            : [];

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: payment_details.payment_from_account,
              account_type: In(['Retention Trust Account', 'Cash Account']),
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.contract_id = contract_details.contract_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.notice_source =
            payment_details.payment_id +
            ' ' +
            payment_details.payment_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
          data.has_import_button = true;
          data.supporting_file_attachment_ids = paymentAttachment ? paymentAttachment : [];
        } else if (
          notice_type == 'Supplier Payment with Retention Withheld Notice'
        ) {
          mandatoryParams = [
            'payment_claim_id',
            'payment_id',
            'project_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: payment_details.payment_from_account,
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.payment_id = payment_details.payment_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.contract_id = contract_details.contract_id;
          data.supporting_file_attachment_ids =
            payment_details.compulsory_attachment_ids
              ? payment_details?.compulsory_attachment_ids
              : [];

          data.notice_source =
            payment_details.payment_id +
            ' ' +
            payment_details.payment_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
        } else if (
          notice_type == 'Supplier Payment with Retention Schedule Notice'
        ) {
          mandatoryParams = [
            'payment_claim_id',
            'project_id',
            'payment_id',
            'contract_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'has_import_button',
            'supporting_file_attachment_ids',
          ];

          const payment_details = await repo.findOne(PaymentDetails, {
            where: { payment_id: payment_id },
          });

          const payment_claim_details = await repo.findOne(PaymentClaims, {
            where: { payment_claim_id: payment_details.payment_claim_id },
            relations: ['clientSupplierDetails'],
          });

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: payment_claim_details.contract_id },
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: [
              {
                bank_account_id: payment_details.payment_from_account,
                account_type: In(['Project Trust Account', 'Cash Account']),
              },
            ],
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.payment_claim_id = payment_claim_details.payment_claim_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.bank_account_id = account_details.bank_account_id;
          data.contract_id = contract_details.contract_id;
          data.notice_source =
            payment_details.payment_id +
            ' ' +
            payment_details.payment_type +
            ' ' +
            payment_claim_details.clientSupplierDetails.client_supplier_name;
          data.has_import_button = true;

          data.supporting_file_attachment_ids =
            payment_details.compulsory_attachment_ids
              ? payment_details?.compulsory_attachment_ids
              : [];
        } else if (
          notice_type == 'Supplier S23 Retention Trust Account Notice'
        ) {
          mandatoryParams = [
            'contract_id',
            'project_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
            'supporting_file_attachment_ids',
          ];
          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: contract_id },
            relations: ['fileAttachments'],
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: contract_details.retention_from_account,
              account_type: 'Retention Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.supporting_file_attachment_ids = contract_details?.fileAttachments?.id
            ? [contract_details.fileAttachments.id]
            : [];

          data.notice_source =
            contract_details.contract_id + ' ' + contract_details.contract_name;
        } else if (
          notice_type == 'Supplier S18C Retention Trust Account Notice'
        ) {
          mandatoryParams = [
            'contract_id',
            'project_id',
            'bank_account_id',
            'client_supplier_id',
            'notice_template_id',
          ];

          const contract_details = await repo.findOne(ContractDetails, {
            where: { contract_id: contract_id },
            relations: ['fileAttachments'],
          });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: contract_details.retention_from_account, //check payment_from_account
              account_type: 'Retention Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = contract_details.project_id;
          data.bank_account_id = account_details.bank_account_id;
          data.client_supplier_id = contract_details.client_supplier_id;
          data.notice_template_id = template_details.notice_template_id;
          data.supporting_file_attachment_ids = contract_details?.fileAttachments?.id
            ? [contract_details.fileAttachments.id]
            : [];
        } else if (notice_type == 'QBCC TA1 Retention Trust Account Notice') {
          mandatoryParams = [
            'project_id',
            'bank_account_id',
            'notice_template_id',
          ];

          // const project_details = await this.projectDetails.findOne({
          //   where: { project_id: project_id },
          // });

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: 'Retention Trust Account',
            },
          });

          const template_details = await this.noticesTemplatesRepo.findOne({
            where: { notice_template_name: notice_type },
          });

          data.project_id = project_id;
          data.notice_source =
            account_details.bank_account_id +
            ' ' +
            account_details.account_name;
          // project_details.project_id;
          data.bank_account_id = account_details.bank_account_id;
          data.notice_template_id = template_details.notice_template_id;
        } else if (notice_type == 'Contracting Party Account Closing Notice') {
          mandatoryParams = [];
        } else if (notice_type == 'QBCC TA2 Retention Account Closing Notice') {
          mandatoryParams = ['bank_account_id'];

          const account_details = await repo.findOne(BankAccounts, {
            where: {
              bank_account_id: bank_account_id,
              account_type: 'Retention Trust Account',
            },
          });
          data.bank_account_id = account_details.bank_account_id;
          data.notice_source =
            account_details.bank_account_id +
            ' ' +
            account_details.account_name;
        }

        validParams = genericMandatoryParams.concat(mandatoryParams);
        await validatePresenceOfMandatoryParams(validParams, data);
        await validatePresenceOfValidParams(
          [...validParams, 'supporting_file_attachment_ids'],
          data,
        );

        return data;
      }
    } catch (error) {
      this.logger.error(
        `Errored while validating trigger notices with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
