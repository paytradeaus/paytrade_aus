import {
  Controller,
  Get,
  Headers,
  Res,
  HttpException,
  HttpStatus,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { createReadStream, existsSync } from 'fs';
import { jwtConstants } from 'src/api/auth/constants';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ExportDataService } from './export-data.service';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import * as path from 'path';

@Controller('files')
export class ExportDataController {
  private readonly jwtSecret = jwtConstants.secret;
  private logger: PaytradeLogger;
  constructor(
    private readonly exportDataService: ExportDataService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('EXPORT_DATA');
  }

  @Get('excel')
  async exportExcel(
    @Headers('authorization') authHeader: string,
    @Res() response,
  ) {
    this.logger.log('Excel download request received');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Excel download: Missing or invalid authorization header');
      throw new HttpException(
        'Authorization Token Required',
        HttpStatus.FORBIDDEN,
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      this.logger.log('Verifying JWT token...');
      const decoded: any = jwt.verify(token, this.jwtSecret);
      this.logger.log(`JWT verified. fileName: ${decoded?.fileName}, filePath: ${decoded?.filePath}`);
      
      // Download from Object Storage
      const filePath = decoded?.filePath || `excel_exports/${decoded?.fileName}`;
      this.logger.log(`Downloading from Object Storage: ${filePath}`);
      
      const fileBuffer = await this.objectStorageService.downloadFile(filePath);

      if (!fileBuffer) {
        this.logger.error(`File not found in Object Storage: ${filePath}`);
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`File downloaded successfully, size: ${fileBuffer.length} bytes`);

      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${decoded?.fileName}"`,
      );
      response.setHeader('Content-Type', decoded?.contentType);

      response.send(fileBuffer);
      this.logger.log('Excel file sent to client');
      
      // Optionally delete from Object Storage after download
      try {
        await this.objectStorageService.deleteFile(filePath);
        this.logger.log(`Deleted temp Excel file from Object Storage: ${filePath}`);
      } catch (deleteErr) {
        this.logger.warn(`Failed to delete temp Excel file: ${deleteErr.message}`);
      }
    } catch (error) {
      this.logger.error(`Error downloading Excel file: ${error.message}`);
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: 'ERROR',
          message: `Failed to download Excel file: ${error.message}`,
        });
      }
    }
  }

  @Post('pdf')
  async exportPdf(
    @Headers('authorization') authHeader: string,
    @Body() payload: any,
    @Res() response,
    @Query('clientId') clientId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Authorization Token Required',
        HttpStatus.FORBIDDEN,
      );
    }

    const token = authHeader.split(' ')[1];
    try {
      const decodedToken: any = jwt.verify(token, this.jwtSecret);

      payload = {
        ...payload,
        timezone: decodedToken.timezone || 'UTC',
        decodedToken,
      };

      // Immediately respond with acknowledgment message
      response.status(HttpStatus.ACCEPTED).json({
        message: 'PDF generation started. You will be notified when ready.',
      });

      // Start PDF generation in background (DO NOT WAIT for it)
      this.exportDataService.generateDynamicPdf(payload, clientId);
    } catch (error) {
      return framedResponse(
        'ERROR',
        `Something went wrong: ${error.message ? error.message : error}`,
      );
    }
  }

  @Get('auditReport')
  async auditReport(
    @Headers('authorization') authHeader: string,
    @Res() response,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Authorization Token Required',
        HttpStatus.FORBIDDEN,
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);
      
      // Download from Object Storage
      const filePath = decoded?.filePath || `audit_reports/${decoded?.fileName}`;
      const fileBuffer = await this.objectStorageService.downloadFile(filePath);

      if (!fileBuffer) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      response.setHeader(
        'Content-Disposition',
        `attachment; filename=${decoded?.fileName}`,
      );

      response.setHeader('Content-Type', decoded?.contentType);

      response.send(fileBuffer);
    } catch (error) {
      this.logger.error(`Error downloading audit report: ${error.message}`);
      return framedResponse(
        'ERROR',
        `Invalid or expired token: ${error.message}`,
      );
    }
  }
}
