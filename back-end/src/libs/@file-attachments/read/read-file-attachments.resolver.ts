import { JwtInternalService } from '../../@jwt-internal-services/jwt.internal.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ReadFileAttachmentsOrDocumentsInput } from './read-file-attachments.input';
import { ReadFileAttachmentsOrDocumentsService } from './read-file-attachments.service';
import { ReadFileAttachmentsOrDocumentsResponse } from './read-file-attachments.response';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { FileAttachmentsOrDocumentsValidator } from '../validators/file-attachments.validator';

@Resolver()
export class ReadFileAttachmentsOrDocumentsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly readFileAttachmentsService: ReadFileAttachmentsOrDocumentsService,
    private readonly fileAttachmentsValidator: FileAttachmentsOrDocumentsValidator,
  ) {
    this.logger = new PaytradeLogger(
      'READ_FILE_ATTACHMENTS_OR_DOCUMENTS_RESOLVER',
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
  @Query(() => ReadFileAttachmentsOrDocumentsResponse, {
    name: 'readFileAttachmentsOrDocuments',
  })
  async readFileAttachmentsOrDocuments(
    @Args('payload') payload: ReadFileAttachmentsOrDocumentsInput,
  ) {
    try {
      this.logger.log(
        `Requested to read file attachments or documents with data: ${JSON.stringify(payload)}`,
      );
      const { fileAttachmentOrDocumentType, data } = payload;
      await this.fileAttachmentsValidator.validateFileAttachmentsOrDocuments(
        fileAttachmentOrDocumentType,
        'READ',
        data,
      );

      return this.readFileAttachmentsService.readFileAttachmentsOrDocuments(
        fileAttachmentOrDocumentType,
        data,
      );
    } catch (error) {
      this.logger.error(
        `Errored while reading file attachments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while reading file attachments with message: ${error}`,
      );
    }
  }
}
