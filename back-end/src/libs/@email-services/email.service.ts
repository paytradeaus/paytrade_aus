import { Injectable } from '@nestjs/common';
const nodemailer = require('nodemailer');
const path = require('path');
const handlebars = require('nodemailer-express-handlebars');
const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
import { join } from 'path';
import { MailOptions } from './mail-options.interface';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { handleError } from 'src/api/common/error-handler';
import { readFile } from 'fs/promises';
import nodemailer from 'nodemailer';
import Mailgun from 'mailgun.js';
var errorMessage = '';
import * as Handlebars from 'handlebars';
import * as fileSystem from 'fs';
const FormData = require('form-data');
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

const OBJECT_STORAGE_FOLDERS = [
  'notices-generated',
  'original-notices-generated',
  'notices',
  'recieved-notices',
  'notices_supporting_docs',
  'contracts',
  'variations',
  'bank_statements',
  'retention_trust_certificates',
  'transaction_csv_file_attachments',
  'optional_attachments',
  'compulsory_attachments',
  'optional_supporting_statement_attachments',
  'audit_reports',
  'generated_aba_files',
  'profile_photo',
  'admin_profile_photo',
  'company_logo',
  'communication',
  'trust_training_records',
  'blog_banner',
  'resources',
  'notice-templates',
  'Admin_holiday',
  'misc',
];

@Injectable()
export class EmailService {
  private logger: PaytradeLogger;
  constructor(private readonly objectStorageService: ObjectStorageService) {
    this.logger = new PaytradeLogger('EMAIL_SERVICE');
  }

  private isObjectStoragePath(filePath: string): boolean {
    const normalizedPath = filePath.replace(/^\//, '').replace(/^uploads\//, '');
    const folder = normalizedPath.split('/')[0];
    return OBJECT_STORAGE_FOLDERS.includes(folder);
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  // private createTransporter() {
  //   const transporter = nodemailer.createTransport({
  //     host: 'smtp.gmail.com',
  //     port: 250,
  //     service: 'gmail',
  //     auth: {
  //       user: process.env.EMAIL_USER,
  //       pass: process.env.EMAIL_PASSWORD,
  //     },
  //   });
  //   return transporter;
  // }

  private createTransporter() {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_EMAIL_LOGIN, // Your Brevo SMTP login
        pass: process.env.BREVO_EMAIL_PASSWORD, // Your Brevo SMTP master password
      },
    });
    transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP Connection Error:', error);
      } else {
        console.log('SMTP Server is ready to take messages:', success);
      }
    });
    return transporter;
  }

  // private createTransporter() {
  //   const transporter = nodemailer.createTransport({
  //     host: 'smtp.sendgrid.net',
  //     port: 465,
  //     auth: {
  //       user: 'apikey',
  //       pass: process.env.SENDGRID_API_KEY,
  //     },
  //   });
  //   transporter.verify((error, success) => {
  //     if (error) {
  //       console.error('SMTP Connection Error:', error);
  //     } else {
  //       console.log('SMTP Server is ready to take messages:', success);
  //     }
  //   });
  //   return transporter;
  // }

  // private createTransporter() {
  //   const transporter = nodemailer.createTransport({
  //     host: 'mail.paytrade.app',
  //     port: 465,
  //     auth: {
  //       user: process.env.EMAIL_USER,
  //       pass: process.env.EMAIL_PASSWORD,
  //     },
  //   });
  //   transporter.verify((error, success) => {
  //     if (error) {
  //       console.error('SMTP Connection Error:', error);
  //     } else {
  //       console.log('SMTP Server is ready to take messages:', success);
  //     }
  //   });
  //   return transporter;
  // }

  // private createTransporter() {
  //   const transporter = nodemailer.createTransport({
  //     host: 'smtp.postmarkapp.com',
  //     port: 25, //587,
  //     secure: false,
  //     auth: {
  //       user: '54b2d553-3d5e-4fbb-a898-4c40b2460596', //'PM-T-outbound-1-OIQHx6_RXb0GlaS0Zg-k',
  //       pass: '54b2d553-3d5e-4fbb-a898-4c40b2460596', //'_ru-JBT0d7PE-K32BLcuHja8poqKfiSybcY-',
  //     },
  //   });
  //   transporter.verify((error, success) => {
  //     if (error) {
  //       console.error('SMTP Connection Error:', error);
  //     } else {
  //       console.log('SMTP Server is ready to take messages:', success);
  //     }
  //   });
  //   return transporter;
  // }

  // private createTransporter() {
  //   const transporter = nodemailer.createTransport({
  //     host: 'smtp.postmarkapp.com',
  //     port: 587,
  //     secure: false,
  //     auth: {
  //       user: 'd2c47abe-8cf3-4bd0-b8f7-f50177f1b9e5',
  //       pass: 'd2c47abe-8cf3-4bd0-b8f7-f50177f1b9e5',
  //     },
  //     header: 'X-PM-Message-Stream: outbound',
  //   });
  //   transporter.verify((error, success) => {
  //     if (error) {
  //       console.error('SMTP Connection Error:', error);
  //     } else {
  //       console.log('SMTP Server is ready to take messages:', success);
  //     }
  //   });
  //   return transporter;
  // }

  public async sendMail(mailDetails): Promise<string> {
    try {
      this.logger.log(
        `Request received for sending mail with data: ${JSON.stringify(mailDetails)}`,
      );

      // if (true) {
      //   throw 'Failed case testing - Mail Queue';
      // }

      const mailTransporter = this.createTransporter();
      const handlebarOptions = {
        viewEngine: {
          extName: '.handlebars',
          partialsDir: path.resolve(`./src/libs/@email-services/handlers/`),
          defaultLayout: false,
        },
        viewPath: path.resolve(`./src/libs/@email-services/handlers/`),
        extName: '.handlebars',
      };
      mailTransporter.use('compile', handlebars(handlebarOptions));
      const fromEmail = process.env.EMAIL_USER;
      // const logo = await readFileAsync(join('assets/PAY-TRADE-LOGO-BT.png'), {
      //   encoding: 'base64',
      // });
      // const logoCid = 'logoCid';
      const header = await readFileAsync(join('assets/emailheader.png'), {
        encoding: 'base64',
      });
      const headerCid = 'headerCid';
      const footer = await readFileAsync(join('assets/footer.png'), {
        encoding: 'base64',
      });
      const footerCid = 'footerCid';
      // const fbIcon = await readFileAsync(join('assets/icon-fb.png'), {
      //   encoding: 'base64',
      // });
      // const fbCid = 'fbCid';
      // const gpIcon = await readFileAsync(join('assets/icon-gp.png'), {
      //   encoding: 'base64',
      // });
      // const gpCid = 'gpCid';
      // const twitterIcon = await readFileAsync(
      //   join('assets/icon-twitter-x.png'),
      //   {
      //     encoding: 'base64',
      //   },
      // );
      // const twitterCid = 'twitterCid';

      let mailOptions: MailOptions = {
        from: fromEmail,
        to: mailDetails.toEmail,
        cc: mailDetails?.ccMail,
        subject: mailDetails.subject,
        template: mailDetails.template,
        // template: 'header-footer-email',
        context: {
          data: mailDetails,
          mailBody: mailDetails.mailBody,
          faqLink: process.env.LOG_BASE_URL + 'faq',
          contactTo: process.env.EMAIL_USER,
          link: 'mailto:' + process.env.EMAIL_USER,
          // logoCid: logoCid,
          footerCid: footerCid,
          headerCid: headerCid,
          // fbCid: fbCid,
          // gpCid: gpCid,
          // twitterCid: twitterCid,
        },
        attachments: [
          // {
          //   filename: 'logo.png',
          //   content: logo,
          //   encoding: 'base64',
          //   cid: logoCid,
          // },
          {
            filename: 'emailheader.png',
            content: header,
            encoding: 'base64',
            cid: headerCid,
          },
          {
            filename: 'footer.png',
            content: footer,
            encoding: 'base64',
            cid: footerCid,
          },
          // {
          //   filename: 'fbIcon.png',
          //   content: fbIcon,
          //   encoding: 'base64',
          //   cid: fbCid,
          // },
          // {
          //   filename: 'gpIcon.png',
          //   content: gpIcon,
          //   encoding: 'base64',
          //   cid: gpCid,
          // },
          // {
          //   filename: 'twitterIcon.png',
          //   content: twitterIcon,
          //   encoding: 'base64',
          //   cid: twitterCid,
          // },
        ],
        // headers: {
        //   'X-PM-Message-Stream': 'outbound', //'outbound-1',
        //   'X-PM-Tag': 'paytrade-email',
        // },
      };
      const dynamicAttachments = mailDetails.attachments
        ? mailDetails.attachments
        : null;
      if (dynamicAttachments) {
        for (let attachment of dynamicAttachments) {
          let content: string;
          
          if (this.isObjectStoragePath(attachment.filePath)) {
            this.logger.log(`Reading attachment from Object Storage: ${attachment.filePath}`);
            const fileBuffer = await this.objectStorageService.downloadFile(attachment.filePath);
            if (fileBuffer) {
              content = fileBuffer.toString('base64');
            } else {
              this.logger.error(`Failed to read attachment from Object Storage: ${attachment.filePath}`);
              continue;
            }
          } else {
            content = await readFileAsync(join(`${attachment.filePath}`), {
              encoding: 'base64',
            });
          }
          
          let dynamicAttachment = {
            filename: attachment.fileName,
            content,
            encoding: 'base64',
            cid: null,
          };
          mailOptions.attachments.push(dynamicAttachment);
        }
      }

      const mailSender = await mailTransporter.sendMail(mailOptions);
      if (!mailSender) throw new Error();
      this.logger.log(`Email sent successfully`);

      return 'Email sent successfully';
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored while sending email with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      console.log('errorMessage: ', errorMessage);
      console.log('mailDetails?.isMailQueue: ', mailDetails?.isMailQueue);
      if (mailDetails?.isMailQueue) {
        throw new Error(errMsg);
      } else {
        return;
      }
    }
  }

  public async sentSupportMail(
    mailDetails,
  ): Promise<Record<'message' | 'data', any> | any> {
    try {
      this.logger.log(
        `Request received for sending support mail: ${JSON.stringify(mailDetails)}`,
      );

      const mg = new Mailgun(FormData).client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: process.env.MAILGUN_DOMAIN_URL || 'https://api.mailgun.net',
      });

      const fromEmail = process.env.EMAIL_USER;

      // const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(
        fileSystem.readFileSync(
          path.resolve(
            `src/libs/@email-services/handlers/${mailDetails.template}.handlebars`,
          ),
          'utf8',
        ),
      );

      const htmlContent = template({
        data: mailDetails,
        mailBody: mailDetails.mailBody,
        faqLink: process.env.LOG_BASE_URL + 'faq',
        contactTo: process.env.EMAIL_USER,
        link: 'mailto:' + process.env.EMAIL_USER,
        headerCid: 'emailheader.png',
        footerCid: 'footer.png',
        fbCid: 'icon-fb.png',
        gpCid: 'icon-gp.png',
        twitterCid: 'icon-twitter-x.png',
      });

      // helper to load inline images
      function loadInlineImage(filename: string, cid: string) {
        const filepath = path.resolve(process.cwd(), 'assets', filename);
        const fileStream = fs.createReadStream(filepath);
        const fileStat = fs.statSync(filepath);

        return {
          filename,
          data: fileStream,
          knownLength: fileStat.size,
          contentType: 'image/png',
          cid,
        };
      }

      // prepare inline attachments
      const inlineImages = [
        loadInlineImage('emailheader.png', 'headerCid'),
        loadInlineImage('footer.png', 'footerCid'),
        loadInlineImage('icon-fb.png', 'fbCid'),
        loadInlineImage('icon-gp.png', 'gpCid'),
        loadInlineImage('icon-twitter-x.png', 'twitterCid'),
      ];

      // send email with Mailgun
      const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `Support <${fromEmail}>`,
        'h:Reply-To': process.env.SUPPORT_TICKET_MAIL,
        to: mailDetails.toEmail,
        cc: mailDetails?.ccMail,
        subject: mailDetails.subject,
        html: htmlContent,
        inline: inlineImages,
      });

      this.logger.log(
        `Support email sent successfully: ${response.details}`,
      );
      return { message: 'Support email sent successfully', data: response };
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      console.log('errorMessage: ', errorMessage);
      this.logger.error(`Errored while sending support email: ${errorMessage}`);
      return `Failed to send support email: ${errorMessage}`;
    }
  }
}
