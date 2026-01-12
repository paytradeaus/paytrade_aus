import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ObjectStorageService } from 'src/libs/@object-storage';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@Controller('uploads')
@Public()
export class FileServeController {
  private logger: PaytradeLogger;

  constructor(private readonly objectStorageService: ObjectStorageService) {
    this.logger = new PaytradeLogger('FILE_SERVE');
  }

  @Get('generated-pdf/:subfolder/:filename')
  async serveGeneratedPdf(
    @Param('subfolder') subfolder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = join(process.cwd(), 'uploads', 'generated-pdf', subfolder, filename);
    this.logger.log(`Serving generated PDF: ${filePath}`);

    try {
      if (!existsSync(filePath)) {
        this.logger.error(`Generated PDF not found: ${filePath}`);
        throw new NotFoundException('File not found');
      }

      const contentType = this.getContentType(filename);
      
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
      });

      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving generated PDF: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }

  @Get(':folder/:filename')
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
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
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}
