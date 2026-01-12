import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ObjectStorageService } from 'src/libs/@object-storage';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';

@Controller()
@Public()
export class DirectFileServeController {
  private logger: PaytradeLogger;

  constructor(private readonly objectStorageService: ObjectStorageService) {
    this.logger = new PaytradeLogger('DIRECT_FILE_SERVE');
  }

  @Get('profile_photo/:filename')
  async serveProfilePhoto(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('profile_photo', filename, res);
  }

  @Get('admin_profile_photo/:filename')
  async serveAdminProfilePhoto(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('admin_profile_photo', filename, res);
  }

  @Get('company_logo/:filename')
  async serveCompanyLogo(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('company_logo', filename, res);
  }

  @Get('communication/:filename')
  async serveCommunication(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('communication', filename, res);
  }

  @Get('trust_training_records/:filename')
  async serveTrustTrainingRecords(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('trust_training_records', filename, res);
  }

  @Get('blog_banner/:filename')
  async serveBlogBanner(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('blog_banner', filename, res);
  }

  @Get('resources/:filename')
  async serveResources(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('resources', filename, res);
  }

  @Get('notice-templates/:filename')
  async serveNoticeTemplates(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('notice-templates', filename, res);
  }

  @Get('notices/:filename')
  async serveNotices(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('notices', filename, res);
  }

  @Get('recieved-notices/:filename')
  async serveReceivedNotices(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('recieved-notices', filename, res);
  }

  @Get('notices_supporting_docs/:filename')
  async serveNoticesSupportingDocs(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('notices_supporting_docs', filename, res);
  }

  @Get('contracts/:filename')
  async serveContracts(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('contracts', filename, res);
  }

  @Get('variations/:filename')
  async serveVariations(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('variations', filename, res);
  }

  @Get('bank_statements/:filename')
  async serveBankStatements(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('bank_statements', filename, res);
  }

  @Get('retention_trust_certificates/:filename')
  async serveRetentionTrustCertificates(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('retention_trust_certificates', filename, res);
  }

  @Get('transaction_csv_file_attachments/:filename')
  async serveTransactionCsvFileAttachments(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('transaction_csv_file_attachments', filename, res);
  }

  @Get('optional_attachments/:filename')
  async serveOptionalAttachments(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('optional_attachments', filename, res);
  }

  @Get('compulsory_attachments/:filename')
  async serveCompulsoryAttachments(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('compulsory_attachments', filename, res);
  }

  @Get('optional_supporting_statement_attachments/:filename')
  async serveOptionalSupportingStatementAttachments(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('optional_supporting_statement_attachments', filename, res);
  }

  @Get('audit_reports/:filename')
  async serveAuditReports(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('audit_reports', filename, res);
  }

  @Get('generated_aba_files/:filename')
  async serveGeneratedAbaFiles(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('generated_aba_files', filename, res);
  }

  @Get('Admin_holiday/:filename')
  async serveAdminHoliday(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('Admin_holiday', filename, res);
  }

  @Get('misc/:filename')
  async serveMisc(@Param('filename') filename: string, @Res() res: Response) {
    return this.serveFromFolder('misc', filename, res);
  }

  private async serveFromFolder(folder: string, filename: string, res: Response) {
    const objectPath = `${folder}/${filename}`;
    this.logger.log(`Serving file: ${objectPath}`);

    try {
      const fileBuffer = await this.objectStorageService.downloadFile(objectPath);

      if (!fileBuffer) {
        this.logger.error(`File not found: ${objectPath}`);
        throw new NotFoundException('File not found');
      }

      const contentType = this.getContentType(filename);
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'Cache-Control': 'public, max-age=31536000',
      });

      res.send(fileBuffer);
    } catch (error) {
      this.logger.error(`Error serving file ${objectPath}: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'aba': 'text/plain',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}
