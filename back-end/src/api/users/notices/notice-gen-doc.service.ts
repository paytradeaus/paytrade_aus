import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, EntityManager, In } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import fs from 'fs';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { FileUploadService } from '../file-upload/file-upload.service';
import { CreateFileUploadInput } from '../file-upload/dto/create-file-upload.input';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import * as puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { ImageService } from './write-to-image/write-to-image.service';
import { NoticeTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

@Injectable()
export class NoticeGenDocService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    private readonly fileUploadService: FileUploadService,
    private readonly imageService: ImageService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('Document generation');
  }

  private async uploadToObjectStorage(localPath: string, objectPath: string): Promise<boolean> {
    try {
      if (!existsSync(localPath)) {
        this.logger.error(`File not found for upload: ${localPath}`);
        return false;
      }
      const fileBuffer = readFileSync(localPath);
      const uploaded = await this.objectStorageService.uploadFileDirect(objectPath, fileBuffer);
      if (uploaded) {
        this.logger.log(`Uploaded to Object Storage: ${objectPath}`);
        unlinkSync(localPath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to upload to Object Storage: ${error.message}`);
      return false;
    }
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async generatePDFfromHTML(
    data: any,
    noticeData: any,
    decoded,
    noticeId: number,
    noticeType: NoticeTypes,
    noticeDate: any,
    manager?: EntityManager,
  ) {
    Handlebars.registerHelper('checkNumber', function (value) {
      return isNaN(Number(value)) ? ' ' : value;
    });

    // Register a helper called `splitString - boxes`
    Handlebars.registerHelper('splitString', function (inputString) {
      // Split the input string into an array of characters
      let chars = inputString?.split('');

      // Generate HTML for each character
      let html = '';
      chars?.forEach((char, index) => {
        char = isNaN(char) ? char.toUpperCase() : char;
        // Add different border styles depending on the position
        let borderLeft =
          index === 0
            ? 'border: 1px solid #ccc; border-right: 1px solid #ccc;'
            : 'border: 1px solid #ccc; border-left: none;';
        html += `<div style="width: 20px; padding: 4px; height: 11px; margin-left: 0px; ${borderLeft} text-align: center;" class="labelFieldText">${char}</div>`;
      });

      // Return HTML as SafeString to prevent escaping
      return new Handlebars.SafeString(html);
    });

    const result = await this.emailTemplates.findOne({
      where: { email_type: noticeType },
    });

    const styleconfig = await this.emailTemplates.findOne({
      where: { email_type: 'style config' },
    });

    const htmlTemplate = result?.email_content || ''; // Replace with your HTML template string
    const additionalStyles = styleconfig?.email_content || ''; // Replace with your HTML template string

    const fullHtml = htmlTemplate.replace(
      '</style>', // Find the closing style tag
      `${additionalStyles}</style>`, // Inject additional styles before the closing style tag
    );

    const templateCompiler = Handlebars.compile(fullHtml);

    const htmlOutput = templateCompiler(data);

    let noticesFolderPath = 'notices-generated';
    let fileName;
    let qbccNotice = false;
    if (
      [
        'QBCC TA4 Part Payment Notice',
        'QBCC TA2 Account Closing Notice',
        'QBCC TA5 Nil Return Notice',
        'QBCC TA1 Project Trust Account Notice',
        'QBCC TA3 Notice Of Related Entities',
        'QBCC TA1 Retention Trust Account Notice',
        'QBCC TA2 Retention Account Closing Notice',
      ].includes(noticeType)
    ) {
      qbccNotice = true;
    }
    if (qbccNotice === true) {
      fileName =
        'annex-' + noticeId + '-' + noticeType + '-' + noticeDate + '.pdf';
    } else {
      fileName = noticeId + '-' + noticeType + '-' + noticeDate + '.pdf';
    }

    // Check if the directory exists, if not, create it
    if (!existsSync(noticesFolderPath)) {
      mkdirSync(noticesFolderPath, { recursive: true });
    }

    let outputPath = join(noticesFolderPath, fileName);

    let finalFileName;
    if (noticeType === 'S75 Supporting Statement') {
      noticesFolderPath = 'uploads/compulsory_attachments';

      if (!existsSync(noticesFolderPath)) {
        mkdirSync(noticesFolderPath, { recursive: true });
      }

      fileName = 'S75-support-statement-claim' + noticeId + '-' + noticeDate;
      let fileExtension = '.pdf';
      let counter = 0;
      finalFileName = `${fileName}${fileExtension}`;
      outputPath = join(noticesFolderPath, finalFileName);

      while (existsSync(outputPath)) {
        counter++;
        finalFileName = `${fileName}-${counter}${fileExtension}`;
        outputPath = join(noticesFolderPath, finalFileName);
      }
    }

    // Save the PDF - puppeteer
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';

    const launchOptions = {
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    };

    let browser;
    try {
      this.logger.log(`[PDF] Launching Puppeteer with options: ${JSON.stringify(launchOptions)}`);
      browser = await puppeteer.launch(launchOptions);
      this.logger.log(`[PDF] Browser launched successfully`);
    } catch (error) {
      this.logger.error(`[PDF] Error launching browser: ${error}`);
      this.logError(`PDF generation failed - browser launch error: ${error.message}`);
      throw new Error(`PDF generation failed: ${error.message}`);
    }

    // const browser = await puppeteer.launch({
    //   args: ['--no-sandbox', '--disable-setuid-sandbox']
    // });

    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(htmlOutput);

    // Generate the PDF and save it to the output path
    await page.pdf({
      path: outputPath,
      format: 'A4',
      displayHeaderFooter: true, // Enable header and footer
      headerTemplate: '<span></span>', // Empty header (no content)
      footerTemplate: `
            <div style="font-size:9px; width:80%; text-align:left; padding-left:20px;">
              Page <span class="pageNumber"></span> of <span class="totalPages"></span>
            </div>`, // Add page number
      margin: {
        top: '10px',
        left: '20px', // Adjust as needed
        bottom: '30px', // Add margin for footer
      },
    });

    await browser.close();

    // Upload the generated PDF to Object Storage (skip for S75 - handled separately below)
    let objectStoragePath: string;
    if (noticeType !== 'S75 Supporting Statement') {
      objectStoragePath = `${noticesFolderPath}/${fileName}`;
      const uploadedToStorage = await this.uploadToObjectStorage(outputPath, objectStoragePath);
      if (!uploadedToStorage) {
        this.logger.error(`Failed to upload notice PDF to Object Storage: ${outputPath}`);
      }
    } else {
      // For S75, set objectStoragePath for later use but don't upload yet
      objectStoragePath = `compulsory_attachments/${finalFileName}`;
    }

    if (noticeData && Object.keys(noticeData).length > 0) {
      const outputFolderName = 'original-notices-generated';
      const outputFileName =
        noticeId + '-' + noticeType + '-' + noticeDate + '.pdf';

      // Check if the directory exists, if not, create it
      if (!existsSync(outputFolderName)) {
        mkdirSync(outputFolderName, { recursive: true });
      }

      const outputFilePath = join(outputFolderName, outputFileName);

      const runJsScriptResponse = await this.imageService.runJsScript(
        noticeType,
        noticeData,
        outputFilePath,
      );
      this.logger.log(`runJsScriptResponse: ${runJsScriptResponse}`);
      if (runJsScriptResponse) {
        // Upload original notice PDF to Object Storage
        const originalObjectPath = `${outputFolderName}/${outputFileName}`;
        await this.uploadToObjectStorage(outputFilePath, originalObjectPath);

        const createFileUploadInput: Partial<CreateFileUploadInput> = {
          notice_id: noticeId,
          file_path: originalObjectPath,
          file_name: outputFileName,
          file_type: 'application/pdf',
          attachment_type: 'qbcc_notice_uploads',
        };

        this.logger.log(`Saving file: ${JSON.stringify(createFileUploadInput)}`);

        const uploadedFile = await this.fileUploadService.saveFile(
          decoded,
          createFileUploadInput as CreateFileUploadInput,
          manager,
        );
      }
    }

    if (noticeType === 'S75 Supporting Statement') {
      const s75OutputPath = join(noticesFolderPath, finalFileName);

      // Upload S75 PDF to Object Storage
      const s75ObjectPath = `compulsory_attachments/${finalFileName}`;
      await this.uploadToObjectStorage(s75OutputPath, s75ObjectPath);

      const createFileUploadInput: Partial<CreateFileUploadInput> = {
        payment_claim_id: noticeId,
        file_path: s75ObjectPath,
        file_name: finalFileName,
        file_type: 'application/pdf',
        attachment_type: 'Compulsory_attachments',
      };

      const JJ = await this.fileUploadService.saveFile(
        decoded,
        createFileUploadInput as CreateFileUploadInput,
        manager
      );
      
    } else {
      const createFileUploadInput: Partial<CreateFileUploadInput> = {
        notice_id: noticeId,
        file_path: objectStoragePath,
        file_name: fileName,
        file_type: 'application/pdf',
        attachment_type: 'Notices_uploads',
      };

      await this.fileUploadService.saveFile(
        decoded,
        createFileUploadInput as CreateFileUploadInput,
        manager,
      );
    }
    // Return the Object Storage path
    return objectStoragePath;
  }
}
