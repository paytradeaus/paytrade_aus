import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
  Transactions,
} from 'src/entities/banking.entity';
import { FileAttachmentOrDocumentType } from 'src/libs/@paytrade-types/paytrade-types';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaymentDetails } from 'src/entities/payment-details.entity';

export class UpdateFileAttachmentsOrDocumentsListService {
  private readonly logger: PaytradeLogger;
  constructor(
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(Transactions)
    private transactionsRepo: Repository<Transactions>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(BankStatements)
    private bankStatementsRepo: Repository<BankStatements>,
  ) {
    this.logger = new PaytradeLogger(
      'UPDATE_FILE_ATTACHMENTS_OR_DOCUMENTS_LIST_SERVICE',
    );
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async updateFileAttachmentsOrDocumentsList(
    fileAttachmentOrDocumentType: FileAttachmentOrDocumentType,
    data: any,
  ) {
    try {
      this.logger.log(
        `Requested to update file attachments or documents with data: ${JSON.stringify({ ...{ fileAttachmentOrDocumentType }, ...data })}`,
      );

      switch (fileAttachmentOrDocumentType) {
        case 'Retention trust certificate':
          {
            const {
              bank_account_id,
              retention_trust_certificate_attachment_ids,
            } = data;
            const bankAccountDetails = await this.bankAccountsRepo.findOne({
              where: { bank_account_id },
            });
            if (!bankAccountDetails)
              throw `Provided bank account id is invalid. Please provide a valid one.`;
            if (bankAccountDetails.account_type != 'Retention Trust Account')
              throw `Updation of retention trust certificates is restricted because the provided bank account id belongs to a ${bankAccountDetails.account_type}.`;

            await this.bankAccountsRepo
              .createQueryBuilder()
              .update(BankAccounts)
              .set({
                retention_trust_certificate_attachment_ids,
              })
              .where('bank_account_id = :bank_account_id', { bank_account_id })
              .execute();
            this.logger.log(
              `Retention trust certificates of Bank account with id: ${bank_account_id} updated successfully with ids: ${retention_trust_certificate_attachment_ids}`,
            );

            return framedResponse(
              'SUCCESS',
              `Retention trust certificates of bank account updated successfully with ids: ${retention_trust_certificate_attachment_ids.join(', ')}`,
            );
          }
          break;
        case 'Transaction csv file attachment':
          {
            const { transaction_id, transaction_csv_file_attachment_id } = data;
            const transactionDetails = await this.transactionsRepo.findOne({
              where: { id: transaction_id },
            });
            if (!transactionDetails)
              throw `Provided transaction doesn't exist. Please provide a valid one.`;
            // if (transactionDetails.matched_to_payment_ids.length)
            //   throw `Cannot update transaction csv file attachment. Provided transaction is already matched with the payments.`;

            await this.transactionsRepo
              .createQueryBuilder()
              .update(Transactions)
              .set({
                transaction_csv_file_attachment_id,
              })
              .where('id = :id', { id: transaction_id })
              .execute();
            this.logger.log(
              `Transaction csv file attachment for the transaction with id: ${transaction_id} has updated successfully.`,
            );

            return framedResponse(
              `SUCCESS`,
              `Transaction csv file attachment of the transaction updated successfully with id: ${transaction_csv_file_attachment_id}.`,
            );
          }
          break;
        case 'Supporting statement attachment':
        case 'Other optional payment claim attachment':
          {
            const {
              payment_claim_id,
              supporting_statement_attachment_ids,
              optional_other_attachment_ids,
            } = data;
            const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
              where: { payment_claim_id: payment_claim_id },
              select: ['compulsory_attachment_ids', 'optional_attachment_ids'],
            });
            if (!paymentClaimDetails)
              throw `Provided payment claim id is invalid. Please provide a valid one.`;

            switch (fileAttachmentOrDocumentType) {
              case 'Supporting statement attachment':
                {
                  await this.paymentClaimsRepo
                    .createQueryBuilder()
                    .update(PaymentClaims)
                    .set({
                      compulsory_attachment_ids:
                        supporting_statement_attachment_ids,
                    })
                    .where('payment_claim_id = :payment_claim_id', {
                      payment_claim_id,
                    })
                    .execute();
                }
                break;
              case 'Other optional payment claim attachment':
                {
                  await this.paymentClaimsRepo
                    .createQueryBuilder()
                    .update(PaymentClaims)
                    .set({
                      optional_attachment_ids: optional_other_attachment_ids,
                    })
                    .where('payment_claim_id = :payment_claim_id', {
                      payment_claim_id,
                    })
                    .execute();
                }
                break;
            }
            this.logger.log(
              `Supporting statement attachment of a payment claim with id: ${payment_claim_id} updated successfully with ids: ${supporting_statement_attachment_ids}`,
            );

            return framedResponse(
              `SUCCESS`,
              `${fileAttachmentOrDocumentType}s of the payment updated successfully.`,
            );
          }
          break;
        case 'Optional supporting statement attachment':
          {
            const {
              payment_claim_id,
              optional_supporting_statement_attachment_ids,
            } = data;
            const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
              where: { payment_claim_id: payment_claim_id },
              select: ['optional_supporting_statement_attachment_ids'],
            });
            if (!paymentClaimDetails)
              throw `Payment claim details not found. Please provide a valid one.`;

            await this.paymentClaimsRepo
              .createQueryBuilder()
              .update(PaymentClaims)
              .set({
                optional_supporting_statement_attachment_ids,
              })
              .where('payment_claim_id = :payment_claim_id', {
                payment_claim_id,
              })
              .execute();

            this.logger.log(
              `Optional supporting statement attachment of a payment claim with id: ${payment_claim_id} updated successfully with ids: ${optional_supporting_statement_attachment_ids}`,
            );

            return framedResponse(
              `SUCCESS`,
              `${fileAttachmentOrDocumentType}s of the payment updated successfully.`,
            );
          }
          break;
        case 'Other optional payment attachment':
        case 'Part payment advice attachment':
        case 'Pay zero payment advice attachment':
        case 'Payless full payment advice attachment':
        case 'Payless part payment advice attachment':
          {
            const {
              payment_claim_id,
              payment_id,
              part_payment_advice_attachment_ids,
              optional_other_attachment_ids,
              pay_zero_payment_advice_attachment_ids,
              payless_full_payment_advice_attachment_ids,
              payless_part_payment_advice_attachment_ids,
            } = data;
            const fetchedFileAttachmentIdsOfPayments =
              await this.paymentsRepo.findOne({
                where: {
                  payment_claim_id: payment_claim_id,
                  payment_id: payment_id,
                },
                select: [
                  'compulsory_attachment_ids',
                  'optional_attachment_ids',
                ],
              });
            if (!fetchedFileAttachmentIdsOfPayments)
              throw `Payment details not found.`;

            let updatableFileAttachmentIds;
            switch (fileAttachmentOrDocumentType) {
              case 'Other optional payment attachment':
                {
                  updatableFileAttachmentIds = {
                    optional_attachment_ids: optional_other_attachment_ids,
                  };
                }
                break;
              case 'Part payment advice attachment':
                {
                  updatableFileAttachmentIds = {
                    compulsory_attachment_ids:
                      part_payment_advice_attachment_ids,
                  };
                }
                break;
              case 'Pay zero payment advice attachment':
                {
                  updatableFileAttachmentIds = {
                    compulsory_attachment_ids:
                      pay_zero_payment_advice_attachment_ids,
                  };
                }
                break;
              case 'Payless full payment advice attachment':
                {
                  updatableFileAttachmentIds = {
                    compulsory_attachment_ids:
                      payless_full_payment_advice_attachment_ids,
                  };
                }
                break;
              case 'Payless part payment advice attachment':
                {
                  updatableFileAttachmentIds = {
                    compulsory_attachment_ids:
                      payless_part_payment_advice_attachment_ids,
                  };
                }
                break;
            }

            await this.paymentsRepo
              .createQueryBuilder()
              .update(PaymentDetails)
              .set(updatableFileAttachmentIds)
              .where('payment_id = :payment_id', { payment_id })
              .execute();
            return framedResponse(
              `SUCCESS`,
              `${fileAttachmentOrDocumentType}s of the payment updated successfully.`,
            );
          }
          break;
        case 'Bank statement':
          {
            const { bank_statement_id, bank_statement_attachment_id } = data;
            const bankStatementDetails = await this.bankStatementsRepo.findOne({
              where: { bank_statement_id },
              select: ['bank_statement_attachment_id'],
            });
            if (!bankStatementDetails)
              throw `Provided bank statement id is invalid. Please provide a valid one.`;

            await this.bankStatementsRepo
              .createQueryBuilder()
              .update(BankStatements)
              .set({
                bank_statement_attachment_id: bank_statement_attachment_id[0],
              })
              .where('bank_statement_id = :bank_statement_id', {
                bank_statement_id,
              })
              .execute();
            this.logger.log(
              `Bank statements attachment updated successfully with id: ${bank_statement_attachment_id}`,
            );

            return framedResponse(
              `SUCCESS`,
              `Bank statement attachment of a bank statement successfully updated.`,
            );
          }
          break;
        case 'Other payment attachment':
          {
            const { payment_id, other_payment_attachment_ids } = data;
            const paymentDetails = await this.paymentsRepo.findOne({
              where: { payment_id },
              select: ['optional_attachment_ids'],
            });
            if (!paymentDetails) throw `Payment details not found.`;

            await this.paymentsRepo
              .createQueryBuilder()
              .update(PaymentDetails)
              .set({ optional_attachment_ids: other_payment_attachment_ids })
              .where('payment_id = :payment_id', {
                payment_id,
              })
              .execute();

            this.logger.log(
              `Other payment attachments of a payment with id: ${payment_id} has been updated successfully.`,
            );

            return framedResponse(
              'SUCCESS',
              `${fileAttachmentOrDocumentType}s of the other payment updated successfully.`,
            );
          }
          break;
      }
    } catch (error) {
      this.logger.error(
        `Errored while updating file attachments with message: ${error}`,
      );
      throw error;
    }
  }
}
