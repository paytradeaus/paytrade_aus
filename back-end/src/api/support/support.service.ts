import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import {
  SupportTickets,
  TicketMails,
} from 'src/entities/support-tickets.entity';
import { Between, ILike, In, Repository } from 'typeorm';
import { PtAdminResolver } from '../admin/pt-admin/pt-admin.resolver';
import { EmailService } from 'src/libs/@email-services/email.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ITicket } from './interfaces/support.interfaces';
import {
  FetchAllTicketsInput,
  UpdateStatusOfASupportInput,
} from './dto/support.dto';
import {
  GetSupportTicketByIdResponse,
  GetSupportTicketListResponse,
} from './responses/support-ticket.response';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class SupportService {
  private logger: PaytradeLogger;
  constructor(
    private emailServices: EmailService,
    private ptAdminResolver: PtAdminResolver,
    @InjectRepository(SupportTickets)
    private readonly ticketsRepo: Repository<SupportTickets>,
    @InjectRepository(TicketMails)
    private readonly ticketMailsRepo: Repository<TicketMails>,
    @InjectRepository(EmailTemplates)
    private emailTemplateRepo: Repository<EmailTemplates>,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('SUPPORT_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async createSupportTicket(ticketDetails: ITicket) {
    try {
      this.logger.log(
        `Handling request for submitting a contact with data: ${JSON.stringify(ticketDetails)}`,
      );

      const raisedTicket = await this.ticketsRepo.create({
        ...ticketDetails,
      });

      const savedTicketDetails = await this.ticketsRepo.save(raisedTicket);

      const savedTicketDetailsWithDate = {
        ...savedTicketDetails, // Spread existing properties
        created_date: new Date(
          savedTicketDetails.created_on,
        ).toLocaleDateString('en-GB'), // Convert to dd/mm/yyyy
      };

      this.logger.log(
        `Contact successfully submitted and saved with id: ${savedTicketDetailsWithDate.id}`,
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
        const requiredValue = {
          ...savedTicketDetailsWithDate,
          issue_summary: savedTicketDetailsWithDate?.message,
        };
        dynamicAcknowledgementMailData[key] = requiredValue[key];
      });

      const bodyOfAcknowledgementEmail = String(
        await this.ptAdminResolver.replaceVariables(
          acknowledgementMailTemplate.email_content,
          dynamicAcknowledgementMailData,
        ),
      );

      const keysOfNotificationMail = notificationEmailTemplate.selected_dynamic;
      const dynamicNotificationMailData: { [key: string]: any } = {};
      keysOfNotificationMail.forEach((key) => {
        dynamicNotificationMailData[key] = savedTicketDetailsWithDate[key];
      });

      const bodyOfNotificationEmail =
        await this.ptAdminResolver.replaceVariables(
          notificationEmailTemplate.email_content,
          dynamicNotificationMailData,
        );

      const acknowledgementEmail = {
        fromEmail: process.env.EMAIL_USER,
        toEmail: ticketDetails.email,
        subject: acknowledgementMailTemplate.email_subject,
        template: 'header-footer-email',
        mailBody: bodyOfAcknowledgementEmail,
        isSupport: true,
        mail_type: EmailTypeEnum.acknowledgeEmailToTicket,
      };

      const notificationEmailToAdminOnTicket = {
        from: process.env.EMAIL_USER,
        toEmail: process.env.SUPPORT_EMAIL,
        subject: notificationEmailTemplate.email_subject,
        template: 'header-footer-email',
        // 'make-primary-admin',
        mailBody: bodyOfNotificationEmail,
        isSupport: true,
        mail_type: EmailTypeEnum.notificationEmailOnTicketSubmission,
      };

      // Fire-and-forget email sending - don't block response on email queue
      // This ensures the user gets a response even if email service is slow
      Promise.all([
        (async () => {
          try {
            const sentMailRes =
              await this.emailQueueProducer.emailQueueProducer(
                acknowledgementEmail,
              );

            const ackMail = this.ticketMailsRepo.create({
              ticket: savedTicketDetails,
              fromEmail: acknowledgementEmail.fromEmail,
              toEmail: acknowledgementEmail.toEmail,
              subject: acknowledgementEmail.subject,
              body: ticketDetails?.message,
              isInbound: false,
              ...(sentMailRes?.data?.id && {
                messageId: sentMailRes?.data?.id,
              }),
            });
            await this.ticketMailsRepo.save(ackMail);
          } catch (emailError) {
            this.logger.error(`Failed to send acknowledgement email: ${emailError.message}`);
          }
        })(),
        (async () => {
          try {
            await this.emailQueueProducer.emailQueueProducer(
              notificationEmailToAdminOnTicket,
            );
          } catch (emailError) {
            this.logger.error(`Failed to send admin notification email: ${emailError.message}`);
          }
        })(),
      ]).catch((err) => {
        this.logger.error(`Email queue error: ${err.message}`);
      });

      this.logger.log(`Acknowledgement emails queued successfully.`);

      return framedResponse(
        'SUCCESS',
        `Support ticket raised and saved.`,
        savedTicketDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while raising a support ticket with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async handleInboundMail(payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
    messageId: string;
    inReplyTo?: string;
  }): Promise<TicketMails> {
    let ticket: SupportTickets | null = null;

    // 1. Find by inReplyTo
    if (payload.inReplyTo) {
      const parentMail = await this.ticketMailsRepo.findOne({
        where: { messageId: payload.inReplyTo },
        relations: ['ticket'],
      });
      if (parentMail) {
        ticket = parentMail.ticket;
      }
    }

    // 2. Fallback by sender email
    if (!ticket) {
      ticket = await this.ticketsRepo.findOne({
        where: { email: payload.from, status: 'Received' },
      });
    }

    // 3. Create new ticket if none found
    if (!ticket) {
      ticket = this.ticketsRepo.create({
        name: payload.from.split('@')[0],
        email: payload.from,
        companyName: null,
        message: payload.body.substring(0, 200),
        status: 'Received',
        isViewed: false,
      });
      ticket = await this.ticketsRepo.save(ticket);
    }

    // 4. Save mail
    const mail = this.ticketMailsRepo.create({
      ticket: ticket,
      fromEmail: payload.from,
      toEmail: payload.to,
      subject: payload.subject,
      body: payload.body,
      isInbound: true,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
    });

    return this.ticketMailsRepo.save(mail);
  }

  async getTicketById(ticketId: string): Promise<GetSupportTicketByIdResponse> {
    try {
      let ticket = await this.ticketsRepo
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.mails', 'mail')
        .where('ticket.id = :ticketId', { ticketId })
        .orderBy('mail.created_on', 'ASC')
        .getOne();

      if (!ticket) {
        throw new Error(`Ticket with ID ${ticketId} not found`);
      }

      const messageDetail = (ticket?.mails ?? [])?.map((msg) => {
        return {
          ...msg,
          is_user:
            msg?.toEmail === process.env.SUPPORT_TICKET_MAIL ||
            msg?.fromEmail === process.env.EMAIL_USER
              ? true
              : false,
        };
      });
      ticket['ticket_details'] = messageDetail ?? [];

      return framedResponse(
        'SUCCESS',
        'Fetched support ticket by id successfully',
        ticket,
      );
    } catch (error) {
      throw error;
    }
  }

  async handleMailGunWebhook(payload: {
    fromEmail: string;
    toEmail: string;
    subject: string;
    body: string;
    messageId: string;
    inReplyTo?: string;
  }) {
    try {
      console.log('Whiling saving Support Ticket Details.');
      const { fromEmail, subject, messageId, inReplyTo } = payload;

      const disclaimer = `The content of this email is confidential and intended for the recipient specified in the message only. It is strictly forbidden to share any part of this message with any third party, without the written consent of the sender. If you received this message by mistake, please reply to this message and follow it with its deletion. Then we can ensure such a mistake does not occur in the future.`;

      const match = payload?.toEmail?.match(/reply\+(\d+)@/);
      let ticketId = match ? match?.[1] : null,
        getTicketDetail = null,
        toEmail = payload?.toEmail?.replace(/\+.*@/, '@'),
        body = String(payload?.body ?? '')?.replace(disclaimer, '');

      if (ticketId) {
        getTicketDetail = await this.ticketsRepo.findOne({
          where: {
            ticket_id: Number(ticketId ?? 0),
          },
        });

        // avoid user message link under closed ticket
        if (getTicketDetail?.status === 'Closed') {
          return true;
        }
      }

      let ticket: SupportTickets | null = null;

      // Find -> Parent Mail (Existing ticket Mail)
      if (inReplyTo || getTicketDetail?.id) {
        let parentMail = null;
        if (inReplyTo) {
          parentMail = await this.ticketMailsRepo.findOne({
            where: { messageId: inReplyTo },
            relations: ['ticket'],
          });
        } else if (getTicketDetail?.id) {
          parentMail = await this.ticketMailsRepo.findOne({
            where: {
              ticket: {
                id: getTicketDetail?.id,
              },
            },
            relations: ['ticket'],
          });
        }

        if (parentMail) {
          ticket = parentMail?.ticket;
        }
      }

      // Find -> If already available any ticket under sender mail
      if (!ticket) {
        ticket = await this.ticketsRepo.findOne({
          where: { email: fromEmail, status: In(['Received', 'Contacted']) },
        });
      } else {
        getTicketDetail = await this.ticketsRepo.findOne({
          where: {
            id: ticket?.id,
          },
        });

        // avoid user message link under closed ticket
        if (getTicketDetail?.status === 'Closed') {
          return true;
        }
      }

      // Create new ticket
      if (!ticket) {
        const createTicket = this.ticketsRepo.create({
          name: fromEmail?.split('@')?.[0],
          email: fromEmail,
          companyName: null,
          message: body,
          status: 'Received',
          isViewed: false,
        });
        ticket = await this.ticketsRepo.save(createTicket);
      }

      // Save mail -> Ticket
      const mail = this.ticketMailsRepo.create({
        ticket: ticket,
        fromEmail,
        toEmail,
        subject,
        body,
        isInbound: true,
        messageId,
        inReplyTo: payload?.inReplyTo,
      });

      console.log('Saved Support Ticket Details.');

      return await this.ticketMailsRepo.save(mail);
    } catch (error) {
      console.log('Catch handleMailGunWebhook: ', error?.message);
      throw error;
    }
  }

  async fetchAllSupportTicket(
    data: FetchAllTicketsInput,
    timezone,
  ): Promise<GetSupportTicketListResponse> {
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

      const [contacts, totalCount] = await this.ticketsRepo.findAndCount({
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
          'ticket_id',
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

  async updateSupportTicket(ticketDetails: UpdateStatusOfASupportInput) {
    try {
      this.logger.log(
        `Request received for updating the status of a contact with data: ${JSON.stringify(ticketDetails)}`,
      );

      const { ticketId, status, message = '' } = ticketDetails;
      let ticketClosed = status === 'Closed';

      const ticketInfo = await this.ticketsRepo.findOne({
        where: { id: ticketId },
      });

      if (!ticketInfo) {
        this.logger.error(`Support ticket not found with id: ${ticketId}`);
        return framedResponse('ERROR', 'Support ticket not found');
      }

      await this.ticketsRepo
        .createQueryBuilder()
        .update(SupportTickets)
        .set({
          status,
        })
        .where('id = :ticketId', { ticketId })
        .execute();

      this.logger.log(
        `Status of the support ticket successfully updated with data: ${JSON.stringify(ticketDetails)}`,
      );

      const ticket = await this.ticketsRepo.findOne({
        where: { id: ticketId },
      });

      // Save the reply message to ticket_mails FIRST (before any email sending)
      if (message) {
        try {
          const replyMail = this.ticketMailsRepo.create({
            ticket: ticket,
            fromEmail: process.env.SUPPORT_TICKET_MAIL || 'reply@support.paytrade.app',
            toEmail: ticket.email,
            subject: `Re: Support Ticket #${ticket?.ticket_id}`,
            body: message,
            isInbound: false,
          });
          await this.ticketMailsRepo.save(replyMail);
          this.logger.log(`Reply message saved to ticket_mails for ticket: ${ticket?.ticket_id}`);
        } catch (saveError) {
          this.logger.error(`Failed to save reply mail for ticket ${ticket?.ticket_id}: ${saveError.message}`);
        }
      }

      const conversationDetail = await this.getTicketById(ticketId);

      const conversation = [
        ...(conversationDetail?.data?.ticket_details ?? []),
        ...(message
          ? [
              {
                body: message,
                created_on: moment.utc(),
                fromEmail: 'reply@support.paytrade.app',
                is_user: false,
                subject: null,
              },
            ]
          : []),
      ];

      const conversationContent = conversation
        ?.map((obj) => {
          const sentTime = moment(obj?.created_on)
            .tz(ticket?.timezone ?? 'Asia/Kolkata') // Use user timezone or default to IST
            .format('DD/MM/YYYY hh:mm A z'); // e.g., 30/09/2025 04:45 PM IST

          if (!obj?.is_user) {
            // Support Team (left side)
            return `
          <tr>
            <td style="padding:10px; vertical-align:top;">
              <div style="background-color:#e8f5e9; border-left:4px solid #4caf50; padding:10px; border-radius:8px; max-width:400px;">
                <div style="font-weight:bold; color:#4caf50; margin-bottom:5px;">Support Team</div>
                <div style="font-size:14px; line-height:1.4; color:#333;">${obj?.body}</div>
                <div style="color: #4caf50a6;text-align: end;">${sentTime}</div>
              </div>
            </td>
            <td style="width:50%;"></td>
          </tr>
          `;
          } else {
            // User (right side)
            return `
          <tr>
            <td style="width:50%;"></td>
            <td style="padding:10px; vertical-align:top;">
              <div style="background-color:#e3f2fd; border-right:4px solid #2196f3; padding:10px; border-radius:8px; max-width:400px; margin-left:auto;">
                <div style="font-size:14px; line-height:1.4; color:#333;">${obj?.body}</div>
                <div style="color:#2196f394; text-align: end;">${sentTime}</div>
              </div>
            </td>
          </tr>
          `;
          }
        })
        .join('');

      if (ticketInfo?.status !== 'Closed') {
        const supoortTicketReplyToUser = await this.emailTemplateRepo.findOne({
          where: {
            email_type: ticketClosed
              ? 'closed-support-ticket-email'
              : 'support-ticket-reply-email-to-user',
          },
        });

        if (message || ticketClosed) {
          ticket['supportEmail'] =
            `reply+${ticket?.ticket_id}@support.paytrade.app`;

          // Only send email if template exists
          if (supoortTicketReplyToUser) {
            if (status === 'Closed') {
              const subject: any = await this.ptAdminResolver.replaceVariables(
                supoortTicketReplyToUser.email_subject,
                {
                  ticket_id: String(ticketInfo?.ticket_id),
                },
              );
              supoortTicketReplyToUser.email_subject = subject;
            }

            const keysOfAcknowledgementMail =
              supoortTicketReplyToUser.selected_dynamic || [];
            const dynamicAcknowledgementMailData: { [key: string]: any } = {};
            keysOfAcknowledgementMail.forEach((key) => {
              const data = {
                conversation: conversationContent,
                subject: `Ticket ${ticket?.ticket_id} - Reply from ${ticket?.name}`,
                supportTicketLink: process.env.LOG_BASE_URL + 'get-support',
              };

              dynamicAcknowledgementMailData[key] = ticket[key] ?? data?.[key];
            });

            const bodyOfAcknowledgementEmail = String(
              await this.ptAdminResolver.replaceVariables(
                supoortTicketReplyToUser.email_content,
                dynamicAcknowledgementMailData,
              ),
            );

            const acknowledgementEmail = {
              fromEmail: process.env.SUPPORT_TICKET_MAIL,
              toEmail: ticket.email,
              subject: supoortTicketReplyToUser.email_subject,
              template: 'header-footer-email',
              mailBody: bodyOfAcknowledgementEmail,
              conversation,
              isSupport: true,
              mail_type: EmailTypeEnum.ticketReplyToUser,
            };

            try {
              await this.emailQueueProducer.emailQueueProducer(acknowledgementEmail);
              this.logger.log(`Email queued for ticket: ${ticket?.ticket_id}`);
            } catch (emailError) {
              this.logger.error(`Failed to queue email for ticket ${ticket?.ticket_id}: ${emailError.message}`);
            }
          } else {
            this.logger.warn(`Email template not found for support ticket reply. Ticket ${ticket?.ticket_id} updated but email not sent.`);
          }
        }
      }

      return framedResponse(
        'SUCCESS',
        `Status of the support ticket successfully updated.`,
        ticket,
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating the status of the support ticket with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
