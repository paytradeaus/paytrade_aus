import { Controller, Get, Param, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ObjectStorageService } from 'src/libs/@object-storage';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';

const ALLOWED_FOLDERS = [
  'profile_photo', 'admin_profile_photo', 'company_logo', 'communication',
  'trust_training_records', 'blog_banner', 'resources', 'notice-templates',
  'notices', 'recieved-notices', 'notices_supporting_docs', 'contracts',
  'variations', 'bank_statements', 'retention_trust_certificates',
  'transaction_csv_file_attachments', 'optional_attachments', 'compulsory_attachments',
  'optional_supporting_statement_attachments', 'audit_reports', 'generated_aba_files',
  'Admin_holiday', 'misc', 'notices-generated', 'original-notices-generated',
  'content_images'
];

@Controller()
@Public()
export class DirectFileServeController {
  private logger: PaytradeLogger;

  constructor(private readonly objectStorageService: ObjectStorageService) {
    this.logger = new PaytradeLogger('DIRECT_FILE_SERVE');
  }

  @Get(':folder/:filename')
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new NotFoundException('Resource not found');
    }

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
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
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
