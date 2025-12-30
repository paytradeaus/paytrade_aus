import { Field, InputType, Int } from '@nestjs/graphql';
import { FileAttachmentOrDocumentType } from 'src/libs/@paytrade-types/paytrade-types';

//All the expected input keys should be added here for reading all types of file attachments.
//The validations for expected input data is handled in the service.
@InputType()
export class UpdateFileAttachmentsGenericInput {
  //Retention trust certificates of a bank account.
  @Field({ nullable: true })
  bank_account_id: number;

  @Field(() => [String], { nullable: true })
  retention_trust_certificate_attachment_ids: string[];

  //Transaction CSV file attachments of a transaction.
  @Field({ nullable: true })
  transaction_id: number;

  @Field(() => [String], { nullable: true })
  transaction_csv_file_attachment_ids: string[];

  //Supporting statement attachments of a payment claim.
  @Field({ nullable: true })
  payment_claim_id: number;

  @Field(() => [String], { nullable: true })
  supporting_statement_attachment_ids: string[];

  @Field(() => [String], { nullable: true })
  optional_supporting_statement_attachment_ids: string[];

  //Optional other attachments of a payment.
  //Part payment advice attachments of a payment.
  //Payless full payment advice attachments of a payment.
  //Payless part payment adivce attachments of a payment.
  //Pay - Zero payment advice attachments of a payment.
  @Field({ nullable: true })
  payment_id: number;

  @Field(() => [String], { nullable: true })
  optional_other_attachment_ids?: string[];

  @Field(() => [String], { nullable: true })
  part_payment_advice_attachment_ids?: string[];

  @Field(() => [String], { nullable: true })
  payless_full_payment_advice_attachment_ids?: string[];

  @Field(() => [String], { nullable: true })
  payless_part_payment_advice_attachments_ids: string[];

  @Field(() => [String], { nullable: true })
  pay_zero_payment_advice_attachment_ids: string[];

  //Bank statements
  @Field({ nullable: true })
  bank_statement_id: number;

  @Field(() => [String], { nullable: true })
  bank_statement_attachment_id: string[];

  //Other payments
  @Field(() => [String], { nullable: true })
  other_payment_attachment_ids: string[];
}
@InputType()
export class UpdateFileAttachmentsOrDocumentsInput {
  @Field()
  fileAttachmentOrDocumentType: FileAttachmentOrDocumentType;

  @Field()
  data: UpdateFileAttachmentsGenericInput;
}
