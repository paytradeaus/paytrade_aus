import { Field, InputType } from '@nestjs/graphql';
import { FileAttachmentOrDocumentType } from 'src/libs/@paytrade-types/paytrade-types';

//All the expected input keys should be added here for reading all types of file attachments.
//The validations for expected input data is handled in the service.
@InputType()
export class ReadFileAttachmentsGenericInput {
  @Field({ nullable: true })
  company_id: number;

  @Field({ nullable: true })
  bank_account_id: number;

  @Field({ nullable: true })
  payment_claim_id: number;

  @Field({ nullable: true })
  transaction_id: number;

  @Field({ nullable: true })
  payment_id: number;

  @Field({ nullable: true })
  bank_statement_id: number;
}
@InputType()
export class ReadFileAttachmentsOrDocumentsInput {
  @Field()
  fileAttachmentOrDocumentType: FileAttachmentOrDocumentType;

  @Field()
  data: ReadFileAttachmentsGenericInput;
}
