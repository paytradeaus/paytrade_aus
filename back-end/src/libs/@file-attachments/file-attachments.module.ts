import { Module } from '@nestjs/common';
import { ReadFileAttachmentsOrDocumentsService } from './read/read-file-attachments.service';
import { ReadFileAttachmentsOrDocumentsResolver } from './read/read-file-attachments.resolver';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
  Transactions,
} from 'src/entities/banking.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { FileAttachmentsOrDocumentsValidator } from './validators/file-attachments.validator';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { JwtInternalService } from '../@jwt-internal-services/jwt.internal.service';
import { UpdateFileAttachmentsOrDocumentsResolver } from './update/update-file-attachments.resolver';
import { UpdateFileAttachmentsOrDocumentsListService } from './update/update-file-attachments.service';
import { PaymentDetails } from 'src/entities/payment-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccounts,
      FileAttachments,
      CompanyDetails,
      UserDetails,
      AdminDetails,
      Transactions,
      PaymentClaims,
      BankStatements,
      PaymentDetails,
    ]),
  ],
  providers: [
    FileAttachmentsOrDocumentsValidator,
    ReadFileAttachmentsOrDocumentsResolver,
    ReadFileAttachmentsOrDocumentsService,
    JwtInternalService,
    UpdateFileAttachmentsOrDocumentsResolver,
    UpdateFileAttachmentsOrDocumentsListService,
  ],
  exports: [
    ReadFileAttachmentsOrDocumentsService,
    UpdateFileAttachmentsOrDocumentsListService,
  ],
})
export class FileAttachmentsModule {}
