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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Authorization Token Required',
        HttpStatus.FORBIDDEN,
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, this.jwtSecret);

      if (!existsSync(decoded?.fileName)) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      response.setHeader(
        'Content-Disposition',
        `attachment; filename=${decoded?.fileName}`,
      );
      response.setHeader('Content-Type', decoded?.contentType);

      const fileStream = createReadStream(decoded?.fileName);
      fileStream.pipe(response);

      fileStream.on('end', () => {
        // Delete ZIP file after it is sent
        fs.unlinkSync(decoded?.fileName);
      });
    } catch (error) {
      return framedResponse(
        'ERROR',
        `Invalid or expired token: ${error.message}`,
      );
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
