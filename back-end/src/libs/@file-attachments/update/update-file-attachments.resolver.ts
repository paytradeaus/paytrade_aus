import { JwtInternalService } from '../../@jwt-internal-services/jwt.internal.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { UpdateFileAttachmentsOrDocumentsInput } from './update-file-attachments.input';
import { UpdateFileAttachmentsOrDocumentsResponse } from './update-file-attachments.response';
import { UpdateFileAttachmentsOrDocumentsListService } from './update-file-attachments.service';
import { FileAttachmentsOrDocumentsValidator } from '../validators/file-attachments.validator';

@Resolver()
export class UpdateFileAttachmentsOrDocumentsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly updateFileAttachmentsListService: UpdateFileAttachmentsOrDocumentsListService,
    private readonly fileAttachmentsValidator: FileAttachmentsOrDocumentsValidator,
  ) {
    this.logger = new PaytradeLogger(
      'UPDATE_FILE_ATTACHMENTS_OR_DOCUMENTS_RESOLVER',
    );
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => UpdateFileAttachmentsOrDocumentsResponse, {
    name: 'updateFileAttachmentsOrDocuments',
  })
  async updateFileAttachmentsOrDocuments(
    @Args('payload') payload: UpdateFileAttachmentsOrDocumentsInput,
  ) {
    try {
      this.logger.log(
        `Requested to update file attachments or documents with data: ${JSON.stringify(payload)}`,
      );
      const { fileAttachmentOrDocumentType, data } = payload;
      await this.fileAttachmentsValidator.validateFileAttachmentsOrDocuments(
        fileAttachmentOrDocumentType,
        'UPDATE',
        data,
      );
      return this.updateFileAttachmentsListService.updateFileAttachmentsOrDocumentsList(
        fileAttachmentOrDocumentType,
        data,
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating file attachments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating file attachments with message: ${error}`,
      );
    }
  }
}
