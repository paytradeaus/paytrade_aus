import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, Like, ILike } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  IContact,
  IUpdateStatusOfAContact,
} from './interfaces/contacts.interfaces';
import {
  FetchInformationsOfAContact,
  FetchInformationsOfAContactResponse,
} from './responses/contacts.responses';
import { ContactSubmissions } from 'src/entities/contact-submissions.entity';
import { FetchAllContactsInput } from './dto/contacts.dto';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PtAdminResolver } from '../admin/pt-admin/pt-admin.resolver';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { EmailService } from 'src/libs/@email-services/email.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class ContactsService {
  private logger: PaytradeLogger;
  constructor(
    // private emailQueueProducer: EmailQueueProducer,
    private emailServices: EmailService,
    private ptAdminResolver: PtAdminResolver,
    @InjectRepository(ContactSubmissions)
    private contactsRepo: Repository<ContactSubmissions>,
    @InjectRepository(EmailTemplates)
    private emailTemplateRepo: Repository<EmailTemplates>,
  ) {
    this.logger = new PaytradeLogger('CONTACTS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async submitAContact(contactDetails: IContact) {
    try {
      this.logger.log(
        `Handling request for submitting a contact with data: ${JSON.stringify(contactDetails)}`,
      );

      const createdContact = await this.contactsRepo.create({
        ...contactDetails,
      });

      const savedContactDetails = await this.contactsRepo.save(createdContact);

        const savedContactDetailsWithDate = {
          ...savedContactDetails, // Spread existing properties
          created_date: new Date(savedContactDetails.created_on).toLocaleDateString('en-GB') // Convert to dd/mm/yyyy
        };
        
      this.logger.log(
        `Contact successfully submitted and saved with id: ${savedContactDetails.id}`,
      );

      const [acknowledgementMailTemplate, notificationEmailTemplate] =
        await Promise.all([
          this.emailTemplateRepo.findOne({
            where: { email_type: 'acknowledge-email-to-contact' },
          }),
          this.emailTemplateRepo.findOne({
            where: { email_type: 'notification-email-on-contact-submission' },
          }),
        ]);

      const keysOfAcknowledgementMail =
        acknowledgementMailTemplate.selected_dynamic;
      const dynamicAcknowledgementMailData: { [key: string]: any } = {};
      keysOfAcknowledgementMail.forEach((key) => {
        dynamicAcknowledgementMailData[key] = savedContactDetailsWithDate[key];
      });

      const bodyOfAcknowledgementEmail =
        await this.ptAdminResolver.replaceVariables(
          acknowledgementMailTemplate.email_content,
          dynamicAcknowledgementMailData,
        );

      const keysOfNotificationMail = notificationEmailTemplate.selected_dynamic;
      const dynamicNotificationMailData: { [key: string]: any } = {};
      keysOfNotificationMail.forEach((key) => {
        dynamicNotificationMailData[key] = savedContactDetailsWithDate[key];
      });

      const bodyOfNotificationEmail =
        await this.ptAdminResolver.replaceVariables(
          notificationEmailTemplate.email_content,
          dynamicNotificationMailData,
        );

      const acknowledgementEmailtoContact = {
        from: process.env.EMAIL_USER,
        toEmail: [contactDetails.email],
        subject: acknowledgementMailTemplate.email_subject,
        template: 'header-footer-email',
        mailBody: bodyOfAcknowledgementEmail,
      };

      const notificationEmailToAdminOnContactSubmission = {
        from: process.env.EMAIL_USER,
        toEmail: [process.env.SUPPORT_EMAIL],
        subject: notificationEmailTemplate.email_subject,
        template: 'header-footer-email',
        // 'make-primary-admin',      
        mailBody: bodyOfNotificationEmail,
      };

      Promise.all([
        this.emailServices.sendMail(acknowledgementEmailtoContact),

        this.emailServices.sendMail(
          notificationEmailToAdminOnContactSubmission,
        ),
      ]);

      this.logger.log(`Acknowledgement emails queued successfully.`);

      return framedResponse(
        'SUCCESS',
        `Contact successfully submitted and saved.`,
        savedContactDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while submitting a contact with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchInformationsOfAContact(
    contactId: string,
  ): Promise<FetchInformationsOfAContactResponse> {
    try {
      this.logger.log(
        `Request received for fetching informations of a contact with id: ${contactId}`,
      );

      const updateStatus = await this.contactsRepo.findOne({
        where: { id: contactId },
      });
      updateStatus.isViewed = true;
      await this.contactsRepo.save(updateStatus);

      const fetchedContactDetails: FetchInformationsOfAContact =
        await this.contactsRepo.findOne({
          where: { id: contactId },
          select: [
            'id',
            'name',
            'companyName',
            'email',
            'message',
            'status',
            'isViewed',
            'created_on',
          ],
        });
      this.logger.log(
        `Details of contact successfully fetched with data: ${JSON.stringify(fetchedContactDetails)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Informations of a contact successfully fetched.`,
        fetchedContactDetails,
      );
    } catch (error) {
      this.logger.log(
        `Errored while fetching informations of a contact with message: ${error.message}`,
      );
      throw new Error(error);
    }
  }

  async fetchAllContacts(data: FetchAllContactsInput, timezone) {
    try {
      this.logger.log(
        `Request received for fetching all contacts submitted with data: ${JSON.stringify(data)}`,
      );

      const {
        page_number,
        page_size,
        date_filter,
        start_date,
        end_date,
        search,
        status,
      } = data;
      const skip = page_size
        ? (page_number - 1) * page_size
        : (page_number - 1) * 10;
      const take = page_size ? page_size : 10;
      const whereConditions: any = {};

      if (search) {
        const keywords = search.split(/\s+/);
        keywords.forEach((keywordPart) => {
          whereConditions.name = ILike(`%${keywordPart}%`);
        });
      }

      if (status) {
        whereConditions.status = status;
      }

      if (date_filter && timezone) {
        let startDate, endDate;
        if (date_filter === 'Custom' && start_date && end_date) {
          startDate = moment
            .tz(start_date, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment.tz(end_date, timezone).endOf('day').utc().toDate();
        } else if (date_filter === 'This Month') {
          startDate = moment.tz(timezone).startOf('month').utc().toDate();
          endDate = moment.tz(timezone).endOf('month').utc().toDate();
        } else if (date_filter === 'Last Month') {
          startDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .startOf('month')
            .utc()
            .toDate();
          endDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .endOf('month')
            .utc()
            .toDate();
        }
        whereConditions.created_on = Between(startDate, endDate);
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      let order_by: any = { created_on: sorting_order };

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'name':
            {
              order_by = { name: sorting_order };
            }
            break;
          case 'email':
            {
              order_by = { email: sorting_order };
            }
            break;
          case 'status':
            {
              order_by = { status: sorting_order };
            }
            break;
          case 'message':
            {
              order_by = { message: sorting_order };
            }
            break;
          case 'created_on':
            {
              order_by = { created_on: sorting_order };
            }
            break;
        }
      }

      const [contacts, totalCount] = await this.contactsRepo.findAndCount({
        where: whereConditions ? whereConditions : {},
        select: [
          'id',
          'name',
          'companyName',
          'email',
          'message',
          'status',
          'isViewed',
          'created_on',
        ],
        order: order_by,
        skip: skip,
        take: page_size,
      });

      this.logger.log(
        `All submitted contacts successfully fetched with data: ${JSON.stringify(contacts)}`,
      );

      return framedResponse(
        'SUCCESS',
        `All submitted contacts successfully fetched.`,
        { contacts, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all submitted contacts with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async searchContactByEmailId(searchableEmailId: string) {
    try {
      this.logger.log(
        `Request received for searching contact with emailId: ${searchableEmailId}`,
      );

      const [contacts, totalCount] = await this.contactsRepo.findAndCount({
        where: { email: Like(`%${searchableEmailId.toLowerCase()}%`) },
        select: ['id', 'email'],
      });

      this.logger.log(
        `Contact successfully searched with data: ${JSON.stringify(contacts)}`,
      );

      return framedResponse('SUCCESS', `Contact successfully searched.`, {
        contacts,
        totalCount,
      });
    } catch (error) {
      this.logger.error(
        `Errored while searching contacts by emailid with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async updateStatusOfAContact(contactDetails: IUpdateStatusOfAContact) {
    try {
      this.logger.log(
        `Request received for updating the status of a contact with data: ${JSON.stringify(contactDetails)}`,
      );

      const { contactId, status } = contactDetails;
      await this.contactsRepo
        .createQueryBuilder()
        .update(ContactSubmissions)
        .set({
          status,
        })
        .where('id = :contactId', { contactId })
        .execute();

      this.logger.log(
        `Status of the contact successfully updated with data: ${JSON.stringify(contactDetails)}`,
      );

      const contact = await this.contactsRepo.findOne({
        where: { id: contactId },
      });

      return framedResponse(
        'SUCCESS',
        `Status of the contact successfully updated.`,
        contact,
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating the status of the contact with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
