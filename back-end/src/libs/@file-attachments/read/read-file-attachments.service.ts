import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { FileAttachmentOrDocumentType } from 'src/libs/@paytrade-types/paytrade-types';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { FileAttachmentsOrDocumentsValidator } from '../validators/file-attachments.validator';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';

@Injectable()
export class ReadFileAttachmentsOrDocumentsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(BankStatements)
    private bankStatementsRepo: Repository<BankStatements>,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger(
      'READ_FILE_ATTACHMENTS_OR_DOCUMENTS_SERVICE',
    );
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async extractFileAttachment(fileDetails: any) {
    try {
      this.logger.log(
        `Requested to extract file attachments or documents with data: ${JSON.stringify(fileDetails)}}`,
      );

      for (const element of fileDetails) {
        if (element.file_path) {
          try {
            const fileBuffer = await this.objectStorageService.downloadFile(element.file_path);
            if (fileBuffer) {
              const image = fileBuffer.toString('base64');
              element['file'] = `data:${element.file_type};base64,${image}`;
            }
          } catch (fileError) {
            this.logger.error(`Failed to read file from storage: ${fileError.message}`);
          }
          element.file_path =
            process.env.UPLOAD_BASE_URL + element.file_path.replace(/\\/g, '/');
          element.uploaded_on = new Date(element.uploaded_on);
        }
      }
      this.logger.log(`Files of all the attachments extracted successfully.`);

      return fileDetails;
    } catch (error) {
      this.logger.error(
        `Errored while extracting the file with message: ${error.message}`,
      );
      throw `Errored while extracting the file with message: ${error.message}`;
    }
  }

  async readFileAttachmentsOrDocuments(
    fileAttachmentOrDocumentType: FileAttachmentOrDocumentType,
    data: any,
  ) {
    try {
      this.logger.log(
        `Requested to read file attachments or documents with data: ${JSON.stringify({ fileAttachmentOrDocumentType, data })}`,
      );

      switch (fileAttachmentOrDocumentType) {
        case 'Retention trust certificate':
          {
            const bankAccountDetails = await this.bankAccountsRepo.findOne({
              where: { bank_account_id: data.bank_account_id },
              select: ['id', 'retention_trust_certificate_attachment_ids'],
            });
            const retention_trust_certificate_attachment_ids =
              bankAccountDetails.retention_trust_certificate_attachment_ids;

            if (
              bankAccountDetails &&
              retention_trust_certificate_attachment_ids &&
              retention_trust_certificate_attachment_ids.length
            ) {
              const fetchedFileAttachments = await this.fileAttachments
                .createQueryBuilder('f')
                .select([
                  `f.id AS id`,
                  `f.file_path AS file_path`,
                  `f.file_name AS file_name`,
                  `f.file_type AS file_type`,
                  `f.name AS name`,
                  `f.uploaded_on AS uploaded_on`,
                  `f.attachment_type AS attachment_type`,
                ])
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Retention_trust_certificates',
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: retention_trust_certificate_attachment_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Provided retention trust certificate attachment ids are invalid or not present.`;

              const allRetentionTrustCertificates =
                await this.extractFileAttachment(fetchedFileAttachments);

              return framedResponse(
                'SUCCESS',
                `All retention trust certificates successfully fetched.`,
                allRetentionTrustCertificates,
              );
            }

            return framedResponse(
              'SUCCESS',
              `No retention trust certificates found. Please upload a new one.`,
              [],
            );
          }
          break;
        case 'Trust training record':
          {
            const companyDetails = await this.companyDetails.findOne({
              where: { company_id: data.company_id },
            });
            if (
              companyDetails.training_records_ids &&
              companyDetails.training_records_ids.length
            ) {
              const fetchedFileAttachments = await this.fileAttachments
                .createQueryBuilder('f')
                .select([
                  `f.id AS id`,
                  `f.file_path AS file_path`,
                  `f.file_type AS file_type`,
                  `f.name AS name`,
                  `f.uploaded_on AS uploaded_on`,
                  `f.attachment_type AS attachment_type`,
                ])
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Trust_Training_Records',
                })
                .andWhere('f.id IN (:...training_records_ids)', {
                  training_records_ids: companyDetails.training_records_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Trust training record ids present in company are invalid or not present.`;

              const allTrustTrainingRecords = await this.extractFileAttachment(
                fetchedFileAttachments,
              );

              return framedResponse(
                'SUCCESS',
                `All Trust training records successfully fetched.`,
                allTrustTrainingRecords,
              );
            }

            return framedResponse(
              'SUCCESS',
              `No trust training records found. Please upload a new one.`,
              [],
            );
          }
          break;
        case 'Supporting statement attachment':
          {
            const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
              where: { payment_claim_id: data.payment_claim_id },
              select: ['id', 'compulsory_attachment_ids'],
            });

            if (!paymentClaimDetails) throw `Payment claim details not found.`;

            const supporting_statement_attachment_ids =
              paymentClaimDetails.compulsory_attachment_ids;

            if (
              paymentClaimDetails &&
              supporting_statement_attachment_ids &&
              supporting_statement_attachment_ids.length
            ) {
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
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Compulsory_attachments',
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: supporting_statement_attachment_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Provided supporting statement attachment ids are invalid or not present.`;

              const allSupportingFileAttachments =
                await this.extractFileAttachment(fetchedFileAttachments);
              const data = allSupportingFileAttachments?.map((f) => {
                const s75File = f?.file_name?.startsWith(
                  'S75-support-statement-claim',
                );

                return {
                  ...f,
                  file_name: s75File ? f?.file_name : f?.custom_file_name,
                };
              });

              return framedResponse(
                'SUCCESS',
                `All supporting file attachments successfully fetched.`,
                data,
              );
            }

            return framedResponse(
              'SUCCESS',
              `No supporting file attachments found. Please upload a new one.`,
              [],
            );
          }
          break;
        case 'Optional supporting statement attachment':
          {
            const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
              where: { payment_claim_id: data.payment_claim_id },
              select: ['id', 'optional_supporting_statement_attachment_ids'],
            });

            if (!paymentClaimDetails) throw `Payment claim details not found.`;

            const optional_supporting_statement_attachment_ids =
              paymentClaimDetails.optional_supporting_statement_attachment_ids;

            if (
              paymentClaimDetails &&
              optional_supporting_statement_attachment_ids &&
              optional_supporting_statement_attachment_ids.length
            ) {
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
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Optional_supporting_statement_attachments',
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: optional_supporting_statement_attachment_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Provided optional supporting statement attachment ids are invalid or not present.`;

              const allOptionalSupportingFileAttachments =
                await this.extractFileAttachment(fetchedFileAttachments);
              const data = allOptionalSupportingFileAttachments?.map((f) => {
                return {
                  ...f,
                  file_name: f?.custom_file_name
                    ? f?.custom_file_name
                    : f?.file_name,
                };
              });

              return framedResponse(
                'SUCCESS',
                `All optional supporting file attachments successfully fetched.`,
                data,
              );
            }

            return framedResponse(
              'SUCCESS',
              `No optional supporting file attachments found. Please upload a new one.`,
              [],
            );
          }
          break;
        case 'Other optional payment claim attachment':
          {
            const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
              where: { payment_claim_id: data.payment_claim_id },
              select: ['id', 'optional_attachment_ids'],
            });

            if (!paymentClaimDetails) throw `Payment claim details not found.`;

            const other_optional_attachment_ids =
              paymentClaimDetails.optional_attachment_ids;

            if (
              paymentClaimDetails &&
              other_optional_attachment_ids &&
              other_optional_attachment_ids.length
            ) {
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
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Optional_attachments',
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: other_optional_attachment_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Provided optional attachment ids are invalid or not present.`;

              const allSupportingFileAttachments =
                await this.extractFileAttachment(fetchedFileAttachments);
              const data = allSupportingFileAttachments?.map((f) => {
                return {
                  ...f,
                  file_name: f?.custom_file_name
                    ? f?.custom_file_name
                    : f?.file_name,
                };
              });

              return framedResponse(
                'SUCCESS',
                `All other optional attachments successfully fetched.`,
                data,
              );
            }

            return framedResponse(
              'SUCCESS',
              `No other optional attachments found. Please upload a new one.`,
              [],
            );
          }
          break;
        case 'Part payment advice attachment':
        case 'Other optional payment attachment':
        case 'Pay zero payment advice attachment':
        case 'Payless full payment advice attachment':
        case '3rd party payment attachment':
        case 'Payless part payment advice attachment':
          {
            const fetchedFileAttachmentIdsOfAPayment =
              await this.paymentsRepo.findOne({
                where: {
                  payment_claim_id: data.payment_claim_id,
                  payment_id: data.payment_id,
                },
                select: [
                  'id',
                  'compulsory_attachment_ids',
                  'optional_attachment_ids'
                ],
              });

            if (!fetchedFileAttachmentIdsOfAPayment) {
              return framedResponse(
                'SUCCESS',
                `No ${fileAttachmentOrDocumentType}s found. Please upload a new one.`,
                [],
              );
            }
            if (fetchedFileAttachmentIdsOfAPayment) {
              const { compulsory_attachment_ids, optional_attachment_ids } =
                fetchedFileAttachmentIdsOfAPayment;

              let queriableFileAttachmentType;
              let queriableFileAttachmentIds;

              switch (fileAttachmentOrDocumentType) {
                case 'Other optional payment attachment':
                  {
                    if (
                      !optional_attachment_ids ||
                      !optional_attachment_ids.length
                    )
                      throw `No optional other attachments found. Please upload an attachment with the payment.`;
                    queriableFileAttachmentType = 'Optional_attachments';
                    queriableFileAttachmentIds = optional_attachment_ids;
                  }
                  break;
                // case 'Part payment advice attachment':
                //   {
                //     if (!compulsory_attachment_ids)
                //       throw `No part payment advice attachments found. Please upload an attachment with the payment.`;
                //     queriableFileAttachmentType = 'Compulsory_attachments';
                //     queriableFileAttachmentIds = compulsory_attachment_ids;
                //   }
                //   break;
                // case '3rd party payment attachment':
                //   {
                //     if (!compulsory_attachment_ids)
                //       throw `No 3rd party payment attachment found. Please upload an attachment with the payment.`;
                //     queriableFileAttachmentType = 'Compulsory_attachments';
                //     queriableFileAttachmentIds = compulsory_attachment_ids;
                //   }
                //   break;
                // case 'Pay zero payment advice attachment':
                //   {
                //     if (!compulsory_attachment_ids)
                //       throw `No pay zero payment advice attachments found. Please upload an attachment with the payment.`;
                //     queriableFileAttachmentType = 'Compulsory_attachments';
                //     queriableFileAttachmentIds = compulsory_attachment_ids;
                //   }
                //   break;
                // case 'Payless full payment advice attachment':
                //   {
                //     if (!compulsory_attachment_ids)
                //       throw `No payless full payment advice attachments found. Please upload an attachment with the payment.`;
                //     queriableFileAttachmentType = 'Compulsory_attachments';
                //     queriableFileAttachmentIds = compulsory_attachment_ids;
                //   }
                //   break;
                // case 'Payless part payment advice attachment':
                // {
                //   if (!compulsory_attachment_ids)
                //     throw `No payless part payment advice attachments found. Please upload an attachment with the payment.`;
                //   queriableFileAttachmentType = 'Compulsory_attachments';
                //   queriableFileAttachmentIds = compulsory_attachment_ids;
                // }
                // break;
                default:
                  queriableFileAttachmentType = 'Compulsory_attachments';
                  queriableFileAttachmentIds = compulsory_attachment_ids;
                  break;
              }

              if (!queriableFileAttachmentIds || !queriableFileAttachmentIds.length) {
                return framedResponse(
                  'SUCCESS',
                  `No ${fileAttachmentOrDocumentType}s found. Please upload a new one.`,
                  [],
                );
              }


              const fetchedFileAttachments = await this.fileAttachments
                .createQueryBuilder('f')
                .select([
                  `f.id AS id`,
                  `f.file_path AS file_path`,
                  `f.file_name AS file_name`,
                  `f.file_type AS file_type`,
                  `f.custom_file_name AS custom_file_name`,
                  `f.name AS name`,
                  `f.uploaded_on AS uploaded_on`,
                  `f.attachment_type AS attachment_type`,
                ])
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: queriableFileAttachmentType,
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: queriableFileAttachmentIds,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              // if (!fetchedFileAttachments.length)
              //   throw `Provided ${fileAttachmentOrDocumentType}s are invalid or not present.`;

              // If no results found, skip instead of throwing
              if (!fetchedFileAttachments.length) {
                return framedResponse(
                  'SUCCESS',
                  `No ${fileAttachmentOrDocumentType}s found. Please upload a new one.`,
                  [],
                );
              }

              const allFileAttachments = await this.extractFileAttachment(
                fetchedFileAttachments,
              );

              const data = allFileAttachments?.map((f) => {
                return {
                  ...f,
                  file_name: f?.custom_file_name ?? f?.file_name,
                };
              });

              return framedResponse(
                'SUCCESS',
                `All ${fileAttachmentOrDocumentType}s successfully fetched.`,
                data,
              );
            }
          }
          break;
        case 'Bank statement': {
          const { bank_statement_attachment_id } =
            await this.bankStatementsRepo.findOne({
              where: { bank_statement_id: data.bank_statement_id },
              select: ['id', 'bank_statement_attachment_id'],
            });

          if (bank_statement_attachment_id) {
            const fetchedFileAttachments = await this.fileAttachments
              .createQueryBuilder('f')
              .select([
                `f.id AS id`,
                `f.file_path AS file_path`,
                `f.file_name AS file_name`,
                `f.file_type AS file_type`,
                `f.name AS name`,
                `f.uploaded_on AS uploaded_on`,
                `f.attachment_type AS attachment_type`,
              ])
              .where('f.attachment_type = :attachment_type', {
                attachment_type: 'Bank_statements',
              })
              .andWhere('f.id = :bank_statement_attachment_id', {
                bank_statement_attachment_id,
              })
              .orderBy({ 'f.uploaded_on': 'DESC' })
              .getRawMany();

            if (!fetchedFileAttachments.length)
              throw `Provided bank statement attachment ids are invalid or not present.`;

            const allFileAttachments = await this.extractFileAttachment(
              fetchedFileAttachments,
            );

            return framedResponse(
              'SUCCESS',
              `Bank statement attachment successfully fetched.`,
              allFileAttachments,
            );
          }
          return framedResponse(
            'SUCCESS',
            `No Bank statement attachment found. Please upload a new one.`,
            [],
          );
        }
        case 'Other payment attachment':
          {
            const paymentDetails = await this.paymentsRepo.findOne({
              where: { payment_id: data.payment_id },
              select: ['id', 'optional_attachment_ids'],
            });

            if (!paymentDetails) throw `Payment details not found.`;

            const other_payment_attachment_ids =
              paymentDetails.optional_attachment_ids;

            if (
              paymentDetails &&
              other_payment_attachment_ids &&
              other_payment_attachment_ids.length
            ) {
              const fetchedFileAttachments = await this.fileAttachments
                .createQueryBuilder('f')
                .select([
                  `f.id AS id`,
                  `f.file_path AS file_path`,
                  `f.file_name AS file_name`,
                  `f.file_type AS file_type`,
                  `f.name AS name`,
                  `f.uploaded_on AS uploaded_on`,
                  `f.attachment_type AS attachment_type`,
                ])
                .where('f.attachment_type = :attachment_type', {
                  attachment_type: 'Optional_attachments',
                })
                .andWhere('f.id IN (:...ids)', {
                  ids: other_payment_attachment_ids,
                })
                .orderBy({ 'f.uploaded_on': 'DESC' })
                .getRawMany();

              if (!fetchedFileAttachments.length)
                throw `Provided other payment attachment ids are invalid or not present.`;
              const allOtherPaymentAttachments =
                await this.extractFileAttachment(fetchedFileAttachments);

              return framedResponse(
                'SUCCESS',
                `All other payment attachments successfully fetched.`,
                allOtherPaymentAttachments,
              );
            }
            return framedResponse(
              'SUCCESS',
              `No other payment attachments found. Please upload a new one.`,
              [],
            );
          }
          break;
      }
    } catch (error) {
      this.logger.error(
        `Errored while reading file attachments with message: ${error}`,
      );
      throw error;
    }
  }
}
