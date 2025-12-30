import { FileAttachmentOrDocumentType } from 'src/libs/@paytrade-types/paytrade-types';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

export class FileAttachmentsOrDocumentsValidator {
  private readonly logger: PaytradeLogger;
  constructor() {
    this.logger = new PaytradeLogger('FILE_ATTACHMENTS_OR_DOCUMENTS_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateFileAttachmentsOrDocuments(
    fileAttachmentOrDocumentType: FileAttachmentOrDocumentType,
    operationType: 'READ' | 'UPDATE',
    data: any,
  ) {
    try {
      this.logger.log(
        `Requested to validate payload for file attachments or documents.`,
      );

      //Validate mandatory and invalid fields depending upon the file attachment type.
      let expectedKeys = [];
      switch (operationType) {
        case 'READ':
          {
            switch (fileAttachmentOrDocumentType) {
              case 'Retention trust certificate':
                {
                  if (!data.bank_account_id) throw `Missing bank_account_id.`;
                  expectedKeys = ['bank_account_id'];
                }
                break;
              case 'Trust training record':
                {
                  if (!data.company_id)`Missing company_id.`;
                  expectedKeys = ['company_id'];
                }
                break;
              case 'Optional supporting statement attachment':
                {
                  if (!data.payment_claim_id) throw `Missing payment_claim_id.`;
                  expectedKeys = ['payment_claim_id'];
                }
                break;
              case 'Supporting statement attachment':
                {
                  if (!data.payment_claim_id) throw `Missing payment_claim_id.`;
                  expectedKeys = ['payment_claim_id'];
                }
                break;
              case 'Other optional payment claim attachment':
                {
                  if (!data.payment_claim_id) throw `Missing payment_claim_id.`;
                  expectedKeys = ['payment_claim_id'];
                }
                break;
              case 'Part payment advice attachment':
              case 'Other optional payment attachment':
              case 'Pay zero payment advice attachment':
              case 'Payless full payment advice attachment':
              case 'Payless part payment advice attachment':
              case '3rd party payment attachment':
                {
                  if (!data.payment_claim_id || !data.payment_id)
                    throw `Missing mandatory param. Expecting payment_claim_id and payment_id.`;
                  expectedKeys = ['payment_claim_id', 'payment_id'];
                }
                break;
              case 'Bank statement':
                {
                  if (!data.bank_statement_id)
                    throw `Missing mandatory param. Expecting bank_statement_id.`;
                  expectedKeys = ['bank_statement_id'];
                }
                break;
              case 'Other payment attachment':
                {
                  if (!data.payment_id) throw `Missing payment_id.`;
                  expectedKeys = ['payment_id'];
                }
                break;
            }
          }
          break;
        case 'UPDATE':
          {
            switch (fileAttachmentOrDocumentType) {
              case 'Retention trust certificate':
                {
                  if (!data.bank_account_id) throw `Missing bankAccountId.`;
                  if (!data.retention_trust_certificate_attachment_ids)
                    throw `Missing retentionTrustCertificateAttachmentIds.`;
                  expectedKeys = [
                    'bank_account_id',
                    'retention_trust_certificate_attachment_ids',
                  ];
                }
                break;
              case 'Transaction csv file attachment': {
                expectedKeys = [
                  'transaction_id',
                  'transaction_csv_file_attachment_ids',
                ];
              }
              case 'Trust training record':
                {
                  if (!data.company_id)`Missing companyId.`;
                  expectedKeys = ['company_id'];
                }
                break;
              case 'Supporting statement attachment':
                {
                  if (!data.payment_claim_id) throw `Missing payment_claim_id.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'supporting_statement_attachment_ids',
                  ];
                }
                break;
              case 'Optional supporting statement attachment':
                {
                  if (!data.payment_claim_id) throw `Missing payment_claim_id.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'optional_supporting_statement_attachment_ids',
                  ];
                }
                break;
              case 'Other optional payment claim attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.optional_other_attachment_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id and optional_other_attachment_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'optional_other_attachment_ids',
                  ];
                }
                break;

              case 'Part payment advice attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.payment_id ||
                    !data.part_payment_advice_attachment_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id, payment_id and part_payment_advice_attachment_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'payment_id',
                    'part_payment_advice_attachment_ids',
                  ];
                }
                break;
              case 'Other optional payment attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.payment_id ||
                    !data.optional_other_attachment_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id, payment_id and optional_other_attachment_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'payment_id',
                    'optional_other_attachment_ids',
                  ];
                }
                break;
              case 'Pay zero payment advice attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.payment_id ||
                    !data.pay_zero_payment_advice_attachment_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id, payment_id and pay_zero_payment_advice_attachment_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'payment_id',
                    'pay_zero_payment_advice_attachment_ids',
                  ];
                }
                break;
              case 'Payless full payment advice attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.payment_id ||
                    !data.payless_full_payment_advice_attachment_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id, payment_id and payless_full_payment_advice_attachment_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'payment_id',
                    'payless_full_payment_advice_attachment_ids',
                  ];
                }
                break;
              case 'Payless part payment advice attachment':
                {
                  if (
                    !data.payment_claim_id ||
                    !data.payment_id ||
                    !data.payless_part_payment_advice_attachments_ids
                  )
                    throw `Missing mandatory param. Expecting payment_claim_id, payment_id and payless_part_payment_advice_attachments_ids.`;
                  expectedKeys = [
                    'payment_claim_id',
                    'payment_id',
                    'payless_part_payment_advice_attachments_ids',
                  ];
                }
                break;
              case 'Bank statement':
                {
                  if (
                    !data.bank_statement_id ||
                    !data.bank_statement_attachment_id
                  )
                    throw `Missing mandatory param. Expecting bank_statement_id and bank_statement_attachment_id.`;
                  if (data.bank_statement_attachment_id.length > 1)
                    throw `Invalid data. Expecting only one bank statement attachment id for updation.`;
                  expectedKeys = [
                    'bank_statement_id',
                    'bank_statement_attachment_id',
                  ];
                }
                break;
              case 'Other payment attachment':
                {
                  if (!data.payment_id || !data.other_payment_attachment_ids)
                    throw `Missing payment_id.`;
                  expectedKeys = ['payment_id'];
                }
                break;
            }
          }
          break;
      }
      const unexpectedKeys = [];
      const keysOfDataToBeUpdated = Object.keys(data);
      for (let key of keysOfDataToBeUpdated) {
        if (!expectedKeys.includes(key)) unexpectedKeys.push(key);
      }
      if (unexpectedKeys.length)
        throw `Fields including ${unexpectedKeys.join(', ')} are not accepted for CRUD operations with file attachment type: ${fileAttachmentOrDocumentType}`;

      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating file attachments with message: ${error}`,
      );
      throw error;
    }
  }
}
