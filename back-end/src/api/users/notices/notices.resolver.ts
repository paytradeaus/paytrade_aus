import { MaxFileSizeValidator, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { NoticesService } from './notices.service';
import {
  FetchAllUnsentNoticesOfACompanyInput,
  FetchDetailsOfANoticeInput,
  fetchNoticeMailInput,
  GenerateMailForANoticeInput,
  generateNoticeInput,
  ListAllDelegatesInput,
  ListAllMailsofANoticesInput,
  ListAllNoticesInput,
  SentMailForANoticeInput,
  SentMailForMultipleNoticesInput,
  triggerAccountNoticesInput,
  triggerAuditNoticesInput,
  triggerContractNoticesInput,
  triggerPaymentClaimNoticesInput,
  triggerPaymentNoticesInput,
  updateNoticesInput,
  updateNoticesMailInput,
} from './notices.input';
import {
  FetchAllUnsentNoticesOfACompanyResponse,
  FetchDetailsOfANoticeResponse,
  fetchNoticeMailResponse,
  generateNoticeDocResponse,
  generateNoticeMailResponse,
  generateNoticeResponse,
  listAllDelegatedAccountsResponse,
  listAllNoticesResponse,
  listMailsOfANoticeResponse,
  noticeStatusResponse,
  RegenerateNoticeResponse,
  sentNoticeMailResponse,
  triggerNoticesResponse,
  updateNoticeMailResponse,
} from './notices.response';
import { NoticesValidator } from './notices.validator';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { ContractDetailsService } from '../contract-details/contract-details.service';
import { UserAccessService } from '../user-access/user-access.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { In, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NoticeGenDocService } from './notice-gen-doc.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { StatusService } from '../banking/ui-status.service';
import { CompliancesService } from '../compliances/compliances.service';

@Resolver()
export class NoticesResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly noticeService: NoticesService,
    private readonly noticessValidator: NoticesValidator,
    private readonly ptContentService: PtContentsService,
    private readonly emailServices: EmailService,
    private readonly contractServices: ContractDetailsService,
    private readonly userAccessService: UserAccessService,
    private readonly complianceService: CompliancesService,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    private readonly genDocNoticeServices: NoticeGenDocService,
    private activityLogService: ActivityLogService,
    private readonly statusService: StatusService,
  ) {
    this.logger = new PaytradeLogger('PAYMENTS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  // async fetchModeOfAnUser(user_id: number) {
  //   try {
  //     this.logger.log(
  //       `Request received for fetching the mode of an user with id: ${user_id}`,
  //     );

  //     const userDetails = await this.userDetails.findOne({
  //       where: { user_id },
  //       select: ['user_id', 'user_mode'],
  //     });

  //     return userDetails.user_mode;
  //   } catch (error) {
  //     this.logger.error(
  //       `Errored while fetching the mode of an user with message: ${error}`,
  //     );
  //     throw error;
  //   }
  // }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => generateNoticeResponse, {
    name: 'generateNotice',
    description: `
    Generates a new notice for a specified company or project.
    Handles notice creation logic, validation, and activity logging.
    If associated with a project, may trigger related compliance checks.
    Returns the created notice details.
    `,
  })
  async generateNotice(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details to generate a new notice, including company, project, notice type, and other metadata',
    })
    payload: generateNoticeInput,
  ) {
    try {
      this.logger.log(
        `Handling request for creating a new notice with data: ${JSON.stringify(payload)}`,
      );

      // const validatedNoticeDetails =
      //   await this.noticessValidator.validateCreateNotice(payload);

      // const decoded = await this.jwtInternalService.decodeJwtToken(context);

      // const newNotice = await this.noticeService.generateNotice(
      //   validatedNoticeDetails,
      //   decoded?.userId,
      // );

      // if (payload.project_id && newNotice) {
      //   const compliance_pta_init =
      //     await this.complianceService.fetchComplianceResultsOfAProject({
      //       project_id: payload.project_id,
      //       bank_account_type: 'Project Trust Account',
      //       failedFilter: false,
      //     });

      //   const compliance_rta_init =
      //     await this.complianceService.fetchComplianceResultsOfAProject({
      //       project_id: payload.project_id,
      //       bank_account_type: 'Retention Trust Account',
      //       failedFilter: false,
      //     });
      // }

      return await this.noticeService.handleGenerateNotice(context, payload);
    } catch (error) {
      this.logger.error(
        `Errored while creating a notice with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        // `Errored while adding a payment with message: ${error.message}`,
        error.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => generateNoticeResponse, {
    name: 'uploadReceivedNotice',
    description: `
    Uploads metadata for a received notice.
    Rejects QBCC notices and validates required fields (company_id, project_id, notice_type, bank_account_id).
    Marks the notice as a received notice and saves it.
    Returns the created notice details.
    `,
  })
  async uploadReceivedNotice(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing metadata for a received notice, including company_id, project_id, notice_type, and bank_account_id',
    })
    payload: generateNoticeInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Creating metadata for a received notice: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      // Reject QBCC notices
      if (
        payload.notice_type &&
        payload.notice_type.toLowerCase().includes('qbcc')
      ) {
        return framedResponse(
          'ERROR',
          'QBCC notices cannot be uploaded manually',
        );
      }

      // Validate required fields
      if (
        !payload.company_id ||
        !payload.project_id ||
        !payload.notice_type ||
        !payload.bank_account_id
      ) {
        return framedResponse(
          'ERROR',
          'company_id, project_id, and notice_type are required',
        );
      }

      const createdNotice = await this.noticeService.generateNotice(
        {
          ...payload,
          is_recieved_notice: true,
        },
        decoded?.userId,
      );

      return createdNotice;
    } catch (error) {
      this.logger.error(
        `Error while uploading received notice: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => noticeStatusResponse, {
    name: 'updateNotice',
    description: `
    Updates the status of a notice (e.g., Draft, Sent, Sending).
    Handles activity logging, QBCC notice restrictions, and triggers compliance checks if associated with a project.
    Returns the updated notice status.
    `,
  })
  async updateNotice(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing notice ID, new status, optional reference ID/link, recipient details, and QBCC or auto-send flags for updating notice status',
    })
    payload: updateNoticesInput,
  ) {
    try {
      this.logger.log(
        `Handling request for updating notice status with data: ${JSON.stringify(payload)}`,
      );

      // const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // // console.log('decoded', decoded);

      // const noticeDetails = await this.noticesRepo.findOne({
      //   where: { notice_id: payload.notice_id },
      //   select: ['id', 'notice_type', 'company_id', 'project_id'],
      // });
      // console.log('noticeDetails', noticeDetails);

      // //Generating link to view inserted master type details.
      // const noticeLink =
      //   `${process.env.LOG_BASE_URL}` +
      //   `${linkExtensions[decoded?.isAdmin ? 36 : 14]}` +
      //   `${noticeDetails.id}` +
      //   `?from=log`;
      // console.log('noticeLink: update_notice: -', noticeLink);

      // let eventTemplateId = null;
      // const qbccNotices = [
      //   'QBCC TA1 Project Trust Account Notice',
      //   'QBCC TA3 Notice Of Related Entities',
      //   'QBCC TA4 Part Payment Notice',
      //   'QBCC TA2 Account Closing Notice',
      //   'QBCC TA5 Nil Return Notice',
      //   'QBCC TA1 Retention Trust Account Notice',
      //   'QBCC TA2 Retention Account Closing Notice',
      // ];

      // if (payload.status === 'Draft') {
      //   eventTemplateId = 131;
      // } else if (payload.status === 'Sent') {
      //   if (
      //     payload.qbcc === true ||
      //     (noticeDetails.notice_type &&
      //       qbccNotices.includes(noticeDetails.notice_type))
      //   ) {
      //     eventTemplateId = 132;
      //   } else {
      //     if (payload.auto_sent === true) {
      //       eventTemplateId = 133;
      //     } else if (payload.auto_sent === false) {
      //       eventTemplateId = null;
      //     } else {
      //       eventTemplateId = 130;
      //     }
      //   }
      // } else if (decoded?.isAdmin && payload?.status === 'Sending') {
      //   eventTemplateId = 195;
      // }

      // if (eventTemplateId) {
      //   const createActivityLogInput: CreateActivityLogInput = {
      //     event_template_id: eventTemplateId,
      //     admin_id: decoded?.isAdmin
      //       ? decoded?.userId
      //       : decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //         ? decoded?.admin_id
      //         : null,
      //     to_user:
      //       decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //         ? decoded?.userId
      //         : null,
      //     from_user:
      //       decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //         ? null
      //         : decoded?.userId,
      //     company_id: noticeDetails.company_id,
      //     dynamic_values: {
      //       noticeLink,
      //       noticeSubject: noticeDetails.notice_type,
      //       referenceId: payload.reference_id,
      //       referenceIdLink: payload.reference_link,
      //       clientName: payload.toName,
      //       clientMail: payload.toMail,
      //     },
      //     is_admin: decoded?.isAdmin,
      //     created_by: decoded?.userId,
      //   };
      //   await this.activityLogService.insertActivityLog(createActivityLogInput);
      // }

      // const updateNotice = await this.noticeService.updateNoticeStatus(
      //   payload,
      //   decoded?.userId,
      // );

      // if (noticeDetails.project_id && updateNotice) {
      //   const compliance_pta_init =
      //     await this.complianceService.fetchComplianceResultsOfAProject({
      //       project_id: noticeDetails.project_id,
      //       bank_account_type: 'Project Trust Account',
      //       failedFilter: false,
      //     });

      //   const compliance_rta_init =
      //     await this.complianceService.fetchComplianceResultsOfAProject({
      //       project_id: noticeDetails.project_id,
      //       bank_account_type: 'Retention Trust Account',
      //       failedFilter: false,
      //     });
      // }
      return this.noticeService.handleUpdateNotice(context, payload);
    } catch (error) {
      this.logger.error(
        `Errored while updating notice status with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => updateNoticeMailResponse, {
    name: 'updateNoticeMail',
    description: `
    Updates the email-related details of a notice.
    Returns the updated notice mail information.
    `,
  })
  async updateNoticeMail(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing email-related details for a notice, used to update its mail information',
    })
    payload: updateNoticesMailInput,
  ) {
    try {
      this.logger.log(
        `Handling request for updating notice status with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const updatedNoticeMail = await this.noticeService.updateNoticeMail(
        payload,
        decoded?.userId,
      );
      return updatedNoticeMail;
    } catch (error) {
      this.logger.error(
        `Errored while updating notice status with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => RegenerateNoticeResponse, {
    name: 'regenerateFailedNotice',
    description: `
    Regenerates a previously failed notice.
    Useful for retrying notice creation after failure.
    Returns the regenerated notice details.
    `,
  })
  async regenerateFailedNotice(
    @Context() context,
    @Args('noticeId', {
      description: 'Unique ID of the failed notice to regenerate',
    })
    noticeId: number,
  ) {
    try {
      this.logger.log(
        `Handling request to regenerate failed notice with ID: ${noticeId}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const result = await this.noticeService.regenerateFailedNotice(
        noticeId,
        decoded,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Errored while regenerating failed notice ${noticeId}: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchDetailsOfANoticeResponse, {
    name: 'fetchDetailsOfANotice',
    description: `
    Fetches detailed information of a specific notice by its ID.
    Returns notice metadata, status, and related information.
    `,
  })
  async fetchDetailsOfANotice(
    @Args('payload', {
      description:
        'Payload containing the ID of the notice to fetch detailed information for',
    })
    payload: FetchDetailsOfANoticeInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the details of a notice with id: ${payload.id}`,
      );

      const response = this.noticeService.fetchDetailsOfANotice(payload);

      return framedResponse(
        'SUCCESS',
        `Details of notice has fetched successfully.`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => generateNoticeMailResponse, {
    name: 'generateMailForANotice',
    description: `
    Generates an email template for a specific notice.
    Handles logic for previewing or sending notice emails.
    Returns mail details for the notice.
    `,
  })
  async generateMailForANotice(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the ID and parameters of a notice for which to generate or preview an email template',
    })
    payload: GenerateMailForANoticeInput,
  ) {
    try {
      this.logger.log(
        `Request received for generating a mail for a notice with id: ${payload.id}`,
      );
      // if (
      //   Object.keys(payload).length !== 0 &&
      //   !Object.keys(payload).includes('has_import_button')
      // ) {
      //   payload['has_import_button'] = false;
      // }
      // payload.has_import_button = !payload.has_import_button
      //   ? (await this.noticeService.fetchNoticeDetails(payload.id))
      //     .has_import_button
      //   : payload.has_import_button;

      // console.log('payload.has_import_button: ', payload.has_import_button);

      // const mailTemplate = await this.ptContentService.getMailTemplateByMailType(
      //   payload.has_import_button
      //     ? 'notice-to-client-supplier-import'
      //     : 'notice-to-client-supplier',
      // );

      // const decoded = await this.jwtInternalService.decodeJwtToken(context);

      // return this.noticeService.generateNoticeMail(
      //   payload,
      //   decoded?.userId,
      //   mailTemplate,
      // );

      return this.noticeService.handleGenerateMailForANotice(context, payload);
    } catch (error) {
      this.logger.error(
        `Errored while generating mail for a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => generateNoticeDocResponse, {
    name: 'generateDocForANotice',
    description: `
    Generates a document for a specified notice.
    Returns document details including download links.
    `,
  })
  async generateDocForANotice(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the ID and parameters of a notice for which to generate a document, including download details',
    })
    payload: GenerateMailForANoticeInput,
  ) {
    try {
      this.logger.log(
        `Request received for generating the doc for a notice with id: ${payload.id}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.noticeService.generateNoticeDocument(
        payload,
        decoded?.userId,
      );
    } catch (error) {
      this.logger.error(
        `Errored while generating doc for a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => sentNoticeMailResponse, {
    name: 'sentMailForANotice',
    description: `
    Sends an email for a single notice or multiple notices.
    Returns mail sending status and details.
    `,
  })
  async sentMailForANotice(
    @Context() context,
    @Args('payload', {
      description: 'Input for sending mail for a single notice',
      nullable: true,
    })
    payload: SentMailForANoticeInput,
    @Args('multiPayload', {
      description: 'Input for sending mail for multiple notices',
      nullable: true,
    })
    multiPayload?: SentMailForMultipleNoticesInput,
  ) {
    try {
      // if (multiPayload) {
      //   if (!multiPayload.ids?.length) {
      //     return framedResponse('ERROR', 'Notices are generated and added to the list. For updates visit the notice list page.');
      //   }

      //   for (const id of multiPayload.ids) {
      //     this.logger.log(`Sending mail for notice with id: ${id}`);

      //     const mailDetails = await this.noticeService.sentNoticeMail({ id });

      //     await this.emailServices.sendMail(mailDetails);

      //     const updateNoticeData: Partial<updateNoticesInput> = {
      //       notice_id: mailDetails.noticeId,
      //       notice_mail_uuid: id,
      //       status: 'Sent',
      //     };
      //     await this.updateNotice(context, updateNoticeData as updateNoticesInput);
      //   }

      //   return framedResponse('SUCCESS', 'Mail sent successfully.');
      // }

      // if (payload) {
      //   this.logger.log(
      //     `Request received for sending mail for a notice with mail_entry_id: ${payload.id}`,
      //   );

      //   const mailDetails = await this.noticeService.sentNoticeMail(payload);

      //   const preview_response = {
      //     mail_uuid: payload.id,
      //     file_details: mailDetails.notice_file,
      //   }

      //   if (payload.view_preview === true) {
      //     return framedResponse('SUCCESS', 'Preview loaded', preview_response)
      //   }
      //   else {
      //     await this.emailServices.sendMail(mailDetails);

      //     const updateNoticeData: Partial<updateNoticesInput> = {
      //       notice_id: mailDetails.noticeId,
      //       notice_mail_uuid: payload.id,
      //       status: 'Sent',
      //     };
      //     this.logger.log(`Email sent successfully.`);
      //     await this.updateNotice(context, updateNoticeData as updateNoticesInput);
      //     return framedResponse('SUCCESS', `Email sent successfully.`);
      //   }
      // }

      return await this.noticeService.handlesentNoticeMail(
        context,
        payload,
        multiPayload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while sending mail for a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => sentNoticeMailResponse, {
    name: 'sentAdminMailForQbccNotice',
    description: `
    Sends QBCC-related notice emails to PayTrade admins.
    Supports single or multiple notices and optional preview mode.
    Returns sending status.
    `,
  })
  async sentAdminMailForQbccNotice(
    @Context() context,
    @Args('notice_id', {
      description: 'Optional: ID of the QBCC notice',
      nullable: true,
    })
    notice_id?: string,
    @Args('view_preview', {
      description: 'Optional: Preview the email instead of sending',
      nullable: true,
    })
    view_preview?: boolean,
    @Args('multiPayload', {
      description: 'Optional input for sending mail for multiple notices',
      nullable: true,
    })
    multiPayload?: SentMailForMultipleNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for sending mail for a qbcc notice to paytrade admin  with notice_id: ${notice_id}`,
      );

      return await this.noticeService.handleSentAdminMailQbccNotice(
        context,
        notice_id,
        view_preview,
        multiPayload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while sending mail for a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => sentNoticeMailResponse, {
    name: 'sentAdminReminderMailForNotices',
    description: `
    Sends reminder emails to PayTrade admins for pending QBCC notices.
    Returns status of reminder emails.
    `,
  })
  async sentAdminReminderMailForNotices(@Context() context) {
    try {
      this.logger.log(
        `Request received for sending reminder mail for pending qbcc notices to paytrade admin`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      // const mailTemplate =
      //   await this.ptContentService.getMailTemplateByMailType(
      //     'admin-qbcc-reminder',
      //   );

      const mailDetails =
        await this.noticeService.sentAdminReminderPendingQbccNotice(timezone);

      // await this.emailServices.sendMail(mailDetails);

      this.logger.log(`Admin notification sent successfully.`);
      return framedResponse('SUCCESS', `Email sent successfully.`);
    } catch (error) {
      this.logger.error(
        `Errored while sending mail for a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => fetchNoticeMailResponse, {
    name: 'fetchDetailsOfANoticeMail',
    description: `
    Fetches the mail details of a specific notice.
    Returns email metadata and associated notice information.
    `,
  })
  async fetchDetailsOfANoticeMail(
    @Args('payload', {
      description:
        'Payload containing the ID of the notice to fetch email-related details for',
    })
    payload: fetchNoticeMailInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the details of a notice with id: ${payload.id}`,
      );

      const response = this.noticeService.fetchDetailsOfANoticeMail(payload);

      return framedResponse(
        'SUCCESS',
        `Details of notice has fetched successfully.`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a notice with message: ${error.message}`,
      );
      return framedResponse(`ERROR`, error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => listAllNoticesResponse, {
    name: 'listAllNotices',
    description: `
    Lists all notices of a company.
    Returns paginated notice list with status, type, and metadata.
    `,
  })
  async listAllNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing company ID, pagination, and filters to list all notices of the company',
    })
    payload: ListAllNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for listing all notices of company ${payload.company_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      return this.noticeService.listAllNotices(payload, timezone);
    } catch (error) {
      this.logger.error(
        `Errored while listing all notices of company: ${payload.company_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => listAllDelegatedAccountsResponse, {
    name: 'listAllDelegatedAccounts',
    description: `
    Lists all delegated accounts for notice management.
    Returns user and delegation metadata for each account.
    `,
  })
  async listAllDelegatedAccounts(
    @Args('payload', {
      description:
        'Payload containing filters to list all delegated accounts for notice management',
    })
    payload: ListAllDelegatesInput,
  ) {
    try {
      this.logger.log(`Request received for listing all delegated accounts.`);

      return this.noticeService.listAllDelgatedAccounts(payload);
    } catch (error) {
      this.logger.error(
        `Errored while listing all delegated accounts with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => triggerNoticesResponse, {
    name: 'triggerContractNotices',
    description: `Triggers all relevant notices associated with a specific contract. 
    Handles generating notices, updating status, and optionally preparing mail previews for the contract.`,
  })
  async triggerContractNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing contract ID and related parameters to trigger all notices associated with a contract',
    })
    payload: triggerContractNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for triggering multiple notices of contract ${payload.contract_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // const userMode = await this.noticeService.fetchModeOfAnUser(decoded?.userId);
      // const userDetails = await this.userDetails.findOne({
      //   where: { user_id: decoded?.userId },
      // });
      // // console.log('userDetails2', userDetails);

      // let notice_previews = [];
      // let qbcc_notice_previews = [];
      // let noticeGen = false;

      // const noticeListWithData =
      //   await this.noticeService.triggerContractNotices(payload);

      // if (noticeListWithData.trustAccountNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     contract_id: noticeListWithData.contract_id,
      //     notice_type: 'Supplier S23 Project Trust Account Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   const contractNoticeStatus =
      //     await this.contractServices.updateContractNoticeStatus(
      //       payload.contract_id,
      //     );
      //   noticeGen = true;
      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }
      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode === 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );
      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }

      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.contract_id,
      //         reference_link: noticeListWithData.contract_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };

      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.contract_id,
      //         referenceLink: noticeListWithData.contract_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }
      // if (noticeListWithData.RetentionAccountNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     contract_id: noticeListWithData.contract_id,
      //     notice_type: 'Supplier S23 Retention Trust Account Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   const contractNoticeStatus =
      //     await this.contractServices.updateContractNoticeStatus(
      //       payload.contract_id,
      //     );
      //   noticeGen = true;

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );
      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }

      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.contract_id,
      //         reference_link: noticeListWithData.contract_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.contract_id,
      //         referenceLink: noticeListWithData.contract_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }
      // if (noticeListWithData.trustQBCC === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     contract_id: noticeListWithData.contract_id,
      //     notice_type: 'QBCC TA3 Notice Of Related Entities',
      //     is_retention: false,
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   const contractNoticeStatus =
      //     await this.contractServices.updateContractNoticeStatus(
      //       payload.contract_id,
      //     );
      //   noticeGen = true;

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const adminMail = await this.sentAdminMailForQbccNotice(
      //           context,
      //           newNotice?.data?.id,
      //           true,
      //         );

      //         qbcc_notice_previews.push(adminMail.data);
      //       }

      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newNotice.data.notice_id,
      //         delegated_qbcc: true,
      //         status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
      //         qbcc: true,
      //         reference_id: noticeListWithData.contract_id,
      //         reference_link: noticeListWithData.contract_link,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.contract_id,
      //         referenceLink: noticeListWithData.contract_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }
      // if (noticeListWithData.retentionQBCC === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     contract_id: noticeListWithData.contract_id,
      //     notice_type: 'QBCC TA3 Notice Of Related Entities',
      //     is_retention: true,
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   const contractNoticeStatus =
      //     await this.contractServices.updateContractNoticeStatus(
      //       payload.contract_id,
      //     );
      //   noticeGen = true;

      //   if (
      //     noticeListWithData.retentionAccDelegation === 'Paid' ||
      //     noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };

      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid' ||
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated'
      //     ) {
      //       //need to confirm
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const adminMail = await this.sentAdminMailForQbccNotice(
      //           context,
      //           newNotice?.data?.id,
      //           true,
      //         );

      //         qbcc_notice_previews.push(adminMail.data);
      //       }

      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newNotice.data.notice_id,
      //         delegated_qbcc: true,
      //         status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
      //         qbcc: true,
      //         reference_id: noticeListWithData.contract_id,
      //         reference_link: noticeListWithData.contract_link,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.contract_id,
      //         referenceLink: noticeListWithData.contract_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeGen === true) {
      //   return framedResponse('SUCCESS', `Notices added to list successfully.`, { notice_previews, qbcc_notice_previews });
      // } else return framedResponse('SUCCESS');

      return this.noticeService.handleTriggerContractNotices(decoded, payload);
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of contract: ${payload.contract_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => triggerNoticesResponse, {
    name: 'triggerPaymentClaimNotices',
    description: `Triggers all relevant notices for a specific payment claim. 
    Handles notice generation, updating status, and optionally preparing mail previews for the payment claim.`,
  })
  async triggerPaymentClaimNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing payment claim ID and parameters to trigger all relevant notices for a specific payment claim',
    })
    payload: triggerPaymentClaimNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for triggering notices of payment claim with id ${payload.payment_claim_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // const userMode = await this.noticeService.fetchModeOfAnUser(decoded?.userId);
      // const userDetails = await this.userDetails.findOne({
      //   where: { user_id: decoded?.userId },
      // });
      // // console.log('userDetails2', userDetails);

      // let noticeGen = false;
      // let notice_previews = [];

      // const noticeListWithData =
      //   await this.noticeService.triggerPaymentClaimNotices(payload);

      // if (noticeListWithData.trustAccountNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_claim_id: noticeListWithData.payment_claim_id,
      //     notice_type: 'Client Payment Claim Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   noticeGen = true;
      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //       has_import_button: true,
      //     };
      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }
      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };
      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );

      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }

      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newNotice.data.notice_id,
      //         notice_mail_uuid: newNotice?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_claim_id,
      //         reference_link: noticeListWithData.payment_claim_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_claim_id,
      //         referenceLink: noticeListWithData.payment_claim_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }

      //   const updateClaimButtons =
      //     await this.statusService.getUiStatusAndActionButtonsForClaims({
      //       payment_claim_id: payload.payment_claim_id,
      //     });
      //   console.log('updateClaimButtons: ', updateClaimButtons);

      //   //Generating notice link.
      //   if (noticeGen === true) {
      //     return framedResponse(
      //       'SUCCESS',
      //       `Notices added to list successfully.`,
      //       { notice_previews }
      //     );
      //   } else return framedResponse('SUCCESS');
      // } else return framedResponse('SUCCESS');

      return this.noticeService.handleTriggerPaymentClaimNotices(
        decoded,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of payment claim with id: ${payload.payment_claim_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => triggerNoticesResponse, {
    name: 'triggerAuditNotices',
    description: `Triggers notices related to a specific audit. 
    Generates the notices, updates status, optionally sends admin mails, and logs activity.`,
  })
  async triggerAuditNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing audit ID and parameters to trigger notices related to a specific audit',
    })
    payload: triggerAuditNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for triggering notices of audit with id ${payload.audit_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const userMode = await this.noticeService.fetchModeOfAnUser(
        decoded?.userId,
      );
      const userDetails = await this.userDetails.findOne({
        where: { user_id: decoded?.userId },
      });
      // console.log('userDetails2', userDetails);

      const noticeListWithData =
        await this.noticeService.triggerAuditNotices(payload);

      let noticeGen = false;

      let qbcc_notice_previews = [];

      if (noticeListWithData.auditNotice === true) {
        const generateNoticePayload: Partial<generateNoticeInput> = {
          company_id: noticeListWithData.company_id,
          audit_id: noticeListWithData.audit_id,
          bank_account_id: noticeListWithData.bank_account_id,
          notice_type: 'QBCC TA5 Nil Return Notice',
        };

        const newNotice = (await this.generateNotice(
          context,
          generateNoticePayload as generateNoticeInput,
        )) as generateNoticeResponse;
        noticeGen = true;

        if (
          noticeListWithData.trustAccDelegation === 'Paid' ||
          noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
          userMode == 'Onboarding'
        ) {
          const generateMailNoticePayload: GenerateMailForANoticeInput = {
            id: newNotice?.data?.id,
          };
          if (
            noticeListWithData.trustAccDelegation === 'Paid' ||
            noticeListWithData.trustAccDelegation === 'Paid-delegated'
          ) {
            const decoded =
              await this.jwtInternalService.decodeJwtToken(context);
            const doc = await this.noticeService.generateNoticeDocument(
              generateMailNoticePayload,
              decoded,
            );
          }

          if (
            noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
            userMode == 'Onboarding'
          ) {
            //Trigger notice emails only if the user mode is Normal.
            if (userMode && userMode == 'Normal') {
              const adminMail = (await this.sentAdminMailForQbccNotice(
                context,
                newNotice?.data?.id,
                true,
                null,
              )) as {
                status: string;
                message: string;
                data: {
                  qbcc_notice_file: {
                    mail_uuid: string;
                    file_details: any;
                  };
                  mails: any;
                };
              };

              qbcc_notice_previews.push(adminMail.data);
            }

            const updateNoticePayload: updateNoticesInput = {
              notice_id: newNotice.data.notice_id,
              delegated_qbcc: true,
              status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
              qbcc: true,
              reference_id: noticeListWithData.audit_id,
              reference_link: noticeListWithData.audit_link,
            };
            const updateStatus = await this.updateNotice(
              context,
              updateNoticePayload,
            );
          }
        } else {
          //Generating notice link link to view matched transactions.
          const noticeLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[14]}` +
            `${newNotice.data.id}` +
            `?from=log`;
          console.log('noticeLink', noticeLink);

          //Create activity log as soon a payment claim is created.
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 128,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: noticeListWithData.company_id,
            dynamic_values: {
              noticeLink,
              noticeSubject: generateNoticePayload.notice_type,
              referenceId: noticeListWithData.audit_id,
              referenceLink: noticeListWithData.audit_link,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          //console.log('createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        }
        // if (noticeMailSent) {
        //   return framedResponse('SUCCESS', `Notices sent successfully.`);
        // } else

        const formattedQbccPreviews = qbcc_notice_previews.map((item) => {
          return {
            notice_uuid: item.qbcc_notice_file?.notice_uuid,
            qbcc_file_details: item.qbcc_notice_file?.qbcc_file_details,
          };
        });

        if (noticeGen === true) {
          return framedResponse(
            'SUCCESS',
            `Notices added to list successfully.`,
            {
              qbcc_notice_previews: formattedQbccPreviews,
            },
          );
        } else return framedResponse('SUCCESS');
      } else return framedResponse('SUCCESS');
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of audit with id: ${payload.audit_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => triggerNoticesResponse, {
    name: 'triggerPaymentNotices',
    description: 'Triggers payment-related notices for the given payment IDs.',
  })
  async triggerPaymentNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing payment IDs and other parameters to trigger payment-related notices',
    })
    payload: triggerPaymentNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for triggering the notices after matching a payment with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // const userMode = await this.noticeService.fetchModeOfAnUser(decoded?.userId);
      // const userDetails = await this.userDetails.findOne({
      //   where: { user_id: decoded?.userId },
      // });
      // console.log('userDetails2', userDetails);

      // let noticeGen = false;
      // let notice_previews = [];
      // let qbcc_notice_previews = [];

      // for (const payment_id of payload.payment_ids) {
      //   const noticeListWithData =
      //     await this.noticeService.triggerPaymentNotices(payment_id);

      // if (noticeListWithData.trustAccountPaymentNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'Supplier Payment Schedule Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //       has_import_button: true,
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );

      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.billablePaymentNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'Supplier Payment Remittance Advice Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //       has_import_button: true,
      //     };
      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }
      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );
      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.billableRetentionPaymentNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'Supplier Payment with Retention Schedule Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //       has_import_button: true,
      //     };
      //     //need to confirm
      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );

      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.retentionWithheldNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     bank_account_id: noticeListWithData.bank_account_id,
      //     notice_type: 'Supplier Payment with Retention Withheld Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };
      //     //need to confirm

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );

      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.partPaymentTrustQBCC === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'QBCC TA4 Part Payment Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;
      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.trustAccDelegation === 'Paid' ||
      //     noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };
      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       if (userMode && userMode == 'Normal') {
      //         const adminMail = await this.sentAdminMailForQbccNotice(
      //           context,
      //           newNotice?.data?.id,
      //           true
      //         );

      //         qbcc_notice_previews.push(adminMail.data);
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newNotice.data.notice_id,
      //         delegated_qbcc: true,
      //         status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
      //         qbcc: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.billablefromRetentionNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'Supplier Retention Payment Remittance Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;

      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.retentionAccDelegation === 'Paid' ||
      //     noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //     };
      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid' ||
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }
      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );
      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // if (noticeListWithData.retentionAccountPaymentNotice === true) {
      //   const generateNoticePayload: Partial<generateNoticeInput> = {
      //     company_id: noticeListWithData.company_id,
      //     payment_id: noticeListWithData.payment_id,
      //     notice_type: 'Supplier Retention Payment Schedule Notice',
      //   };

      //   const newNotice = (await this.generateNotice(
      //     context,
      //     generateNoticePayload as generateNoticeInput,
      //   )) as generateNoticeResponse;
      //   noticeGen = true;

      //   const contractNoticeStatus =
      //     await this.noticeService.updatePaymentNoticeStatus(payment_id);

      //   if (
      //     noticeListWithData.retentionAccDelegation === 'Paid' ||
      //     noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //     userMode == 'Onboarding'
      //   ) {
      //     const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //       id: newNotice?.data?.id,
      //       has_import_button: true,
      //     };
      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid' ||
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated'
      //     ) {
      //       const decoded =
      //         await this.jwtInternalService.decodeJwtToken(context);
      //       const doc = await this.noticeService.generateNoticeDocument(
      //         generateMailNoticePayload,
      //         decoded,
      //       );
      //     }
      //     const newMail = (await this.generateMailForANotice(
      //       context,
      //       generateMailNoticePayload,
      //     )) as generateNoticeMailResponse;
      //     const sentMailNoticePayload: SentMailForANoticeInput = {
      //       id: newMail?.data?.id,
      //       view_preview: true
      //     };

      //     if (
      //       noticeListWithData.retentionAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       //Trigger notice emails only if the user mode is Normal.
      //       if (userMode && userMode == 'Normal') {
      //         const mailSent = await this.sentMailForANotice(
      //           context,
      //           sentMailNoticePayload,
      //         );
      //         notice_previews.push(mailSent.data);
      //         noticeGen = true;
      //       }
      //       const updateNoticePayload: updateNoticesInput = {
      //         notice_id: newMail.data.notice_id,
      //         notice_mail_uuid: newMail?.data?.id,
      //         status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //         auto_sent: true,
      //         reference_id: noticeListWithData.payment_id,
      //         reference_link: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       };
      //       const updateStatus = await this.updateNotice(
      //         context,
      //         updateNoticePayload,
      //       );
      //     }
      //   } else {
      //     //Generating notice link link to view matched transactions.
      //     const noticeLink =
      //       `${process.env.LOG_BASE_URL}` +
      //       `${linkExtensions[14]}` +
      //       `${newNotice.data.id}` +
      //       `?from=log`;
      //     console.log('noticeLink', noticeLink);

      //     //Create activity log as soon a payment claim is created.
      //     const createActivityLogInput: CreateActivityLogInput = {
      //       event_template_id: 128,
      //       admin_id:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.admin_id
      //           : null,
      //       to_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? decoded?.userId
      //           : null,
      //       from_user:
      //         decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //           ? null
      //           : decoded?.userId,
      //       company_id: noticeListWithData.company_id,
      //       dynamic_values: {
      //         noticeLink,
      //         noticeSubject: generateNoticePayload.notice_type,
      //         referenceId: noticeListWithData.payment_id,
      //         referenceLink: noticeListWithData.payment_link,
      //         toName: noticeListWithData.clientName,
      //         toMail: noticeListWithData.clientMail,
      //       },
      //       is_admin: false,
      //       created_by: decoded?.userId,
      //     };
      //     //console.log('createActivityLogInput', createActivityLogInput);
      //     await this.activityLogService.insertActivityLog(
      //       createActivityLogInput,
      //     );
      //   }
      // }

      // const updatePaymentButtons =
      //   await this.statusService.getUiStatusAndActionButtonsForPayments({
      //     payment_id,
      //   });
      // console.log('updatePaymentButtons: ', updatePaymentButtons);
      // }

      // if (noticeGen === true) {
      //   return framedResponse('SUCCESS', `Notices added to list successfully.`, { notice_previews, qbcc_notice_previews });
      // } else return framedResponse('SUCCESS');

      return this.noticeService.handleTriggerPaymentNotices(decoded, payload);
    } catch (error) {
      this.logger.error(
        `Errored while triggering the notices after matching a payment with id: ${payload.payment_ids} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => triggerNoticesResponse, {
    name: 'triggerAccountNotices',
    description:
      'Triggers notices for a specific bank account and its related projects.',
  })
  async triggerAccountNotices(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing bank account ID and related parameters to trigger notices for that account',
    })
    payload: triggerAccountNoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for triggering multiple notices of bank account ${payload.bank_account_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      // const userMode = await this.noticeService.fetchModeOfAnUser(decoded?.userId);
      // const userDetails = await this.userDetails.findOne({
      //   where: { user_id: decoded?.userId },
      // });

      // const noticeListWithData =
      //   await this.noticeService.triggerAccountNotices(payload);

      // console.log('notice_list_to_be_generated', noticeListWithData);

      // let noticeGen = false;

      // if (noticeListWithData) {
      //   let notice_previews = [];
      //   let qbcc_notice_previews = [];

      //   if (noticeListWithData.trustAccountNotice === true) {
      //     const generateNoticePayload: Partial<generateNoticeInput> = {
      //       company_id: noticeListWithData.company_id,
      //       bank_account_id: noticeListWithData.bank_account_id,
      //       client_supplier_id: noticeListWithData.client_supplier_id,
      //       notice_type: 'Client S18B Project Trust Account Notice',
      //     };

      //     const newNotice = (await this.generateNotice(
      //       context,
      //       generateNoticePayload as generateNoticeInput,
      //     )) as generateNoticeResponse;

      //     noticeGen = true;

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //         id: newNotice?.data?.id,
      //       };
      //       if (
      //         noticeListWithData.trustAccDelegation === 'Paid' ||
      //         noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //       ) {
      //         const decoded =
      //           await this.jwtInternalService.decodeJwtToken(context);
      //         const doc = await this.noticeService.generateNoticeDocument(
      //           generateMailNoticePayload,
      //           decoded,
      //         );
      //       }

      //       const newMail = (await this.generateMailForANotice(
      //         context,
      //         generateMailNoticePayload,
      //       )) as generateNoticeMailResponse;
      //       const sentMailNoticePayload: SentMailForANoticeInput = {
      //         id: newMail?.data?.id,
      //         view_preview: true
      //       };
      //       if (
      //         noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //         userMode == 'Onboarding'
      //       ) {
      //         //Trigger notice emails only if the user mode is Normal.
      //         if (userMode && userMode == 'Normal') {

      //           const mailSent = await this.sentMailForANotice(
      //             context,
      //             sentMailNoticePayload,
      //           );

      //           notice_previews.push(mailSent.data);
      //           noticeGen = true;
      //         }
      //         const updateNoticePayload: updateNoticesInput = {
      //           notice_id: newMail.data.notice_id,
      //           notice_mail_uuid: newMail?.data?.id,
      //           status: userMode == 'Normal' ? 'Sent' : 'Sent - Onboarded',
      //           auto_sent: true,
      //           reference_id: noticeListWithData.bank_account_id,
      //           reference_link: noticeListWithData.bank_accoutn_link,
      //           toName: noticeListWithData.clientName,
      //           toMail: noticeListWithData.clientMail,
      //         };
      //         const updateStatus = await this.updateNotice(
      //           context,
      //           updateNoticePayload,
      //         );
      //       }
      //     } else {
      //       //Generating notice link link to view matched transactions.
      //       const noticeLink =
      //         `${process.env.LOG_BASE_URL}` +
      //         `${linkExtensions[14]}` +
      //         `${newNotice.data.id}` +
      //         `?from=log`;
      //       console.log('noticeLink', noticeLink);

      //       //Create activity log as soon a payment claim is created.
      //       const createActivityLogInput: CreateActivityLogInput = {
      //         event_template_id: 128,
      //         admin_id:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? decoded?.admin_id
      //             : null,
      //         to_user:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? decoded?.userId
      //             : null,
      //         from_user:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? null
      //             : decoded?.userId,
      //         company_id: noticeListWithData.company_id,
      //         dynamic_values: {
      //           noticeLink,
      //           noticeSubject: generateNoticePayload.notice_type,
      //           referenceId: noticeListWithData.bank_account_id,
      //           referenceLink: noticeListWithData.bank_accoutn_link,
      //         },
      //         is_admin: false,
      //         created_by: decoded?.userId,
      //       };
      //       //console.log('createActivityLogInput', createActivityLogInput);
      //       await this.activityLogService.insertActivityLog(
      //         createActivityLogInput,
      //       );
      //     }
      //   }
      //   if (noticeListWithData.trustQBCC === true) {
      //     const generateNoticePayload: Partial<generateNoticeInput> = {
      //       company_id: noticeListWithData.company_id,
      //       bank_account_id: noticeListWithData.bank_account_id,
      //       client_supplier_id: noticeListWithData.client_supplier_id,
      //       notice_type: 'QBCC TA1 Project Trust Account Notice',
      //     };

      //     const newNotice = (await this.generateNotice(
      //       context,
      //       generateNoticePayload as generateNoticeInput,
      //     )) as generateNoticeResponse;

      //     noticeGen = true;

      //     if (
      //       noticeListWithData.trustAccDelegation === 'Paid' ||
      //       noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //       userMode == 'Onboarding'
      //     ) {
      //       const generateMailNoticePayload: GenerateMailForANoticeInput = {
      //         id: newNotice?.data?.id,
      //       };

      //       if (
      //         noticeListWithData.trustAccDelegation === 'Paid' ||
      //         noticeListWithData.trustAccDelegation === 'Paid-delegated'
      //       ) {
      //         const decoded =
      //           await this.jwtInternalService.decodeJwtToken(context);
      //         const doc = await this.noticeService.generateNoticeDocument(
      //           generateMailNoticePayload,
      //           decoded,
      //         );
      //       }
      //       if (
      //         noticeListWithData.trustAccDelegation === 'Paid-delegated' ||
      //         userMode == 'Onboarding'
      //       ) {
      //         if (userMode && userMode == 'Normal') {
      //           const adminMail = await this.sentAdminMailForQbccNotice(
      //             context,
      //             newNotice?.data?.id,
      //             true
      //           );

      //           qbcc_notice_previews.push(adminMail.data);
      //         }

      //         const updateNoticePayload: updateNoticesInput = {
      //           notice_id: newNotice.data.notice_id,
      //           delegated_qbcc: true,
      //           status: userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
      //           qbcc: true,
      //           reference_id: noticeListWithData.bank_account_id,
      //           reference_link: noticeListWithData.bank_accoutn_link,
      //         };
      //         const updateStatus = await this.updateNotice(
      //           context,
      //           updateNoticePayload,
      //         );
      //       }
      //     } else {
      //       //Generating notice link link to view matched transactions.
      //       const noticeLink =
      //         `${process.env.LOG_BASE_URL}` +
      //         `${linkExtensions[14]}` +
      //         `${newNotice.data.id}` +
      //         `?from=log`;
      //       console.log('noticeLink', noticeLink);

      //       //Create activity log as soon a payment claim is created.
      //       const createActivityLogInput: CreateActivityLogInput = {
      //         event_template_id: 128,
      //         admin_id:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? decoded?.admin_id
      //             : null,
      //         to_user:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? decoded?.userId
      //             : null,
      //         from_user:
      //           decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //             ? null
      //             : decoded?.userId,
      //         company_id: noticeListWithData.company_id,
      //         dynamic_values: {
      //           noticeLink,
      //           noticeSubject: generateNoticePayload.notice_type,
      //           referenceId: noticeListWithData.bank_account_id,
      //           referenceLink: noticeListWithData.bank_accoutn_link,
      //         },
      //         is_admin: false,
      //         created_by: decoded?.userId,
      //       };
      //       //console.log('createActivityLogInput', createActivityLogInput);
      //       await this.activityLogService.insertActivityLog(
      //         createActivityLogInput,
      //       );
      //     }
      //   }
      //   if (noticeListWithData.retentionQBCC === true) {
      //     const account_details = await this.bankAccountsRepo.findOne({
      //       where: {
      //         bank_account_id: noticeListWithData.bank_account_id,
      //         account_type: 'Retention Trust Account',
      //       },
      //     });

      //     if (account_details.project_ids.length > 0) {
      //       const existing_RAT_project_notices = await this.noticesRepo.find({
      //         where: {
      //           project_id: In(account_details.project_ids),
      //           notice_type: 'QBCC TA1 Retention Trust Account Notice',
      //           status: Not(In(['Delete-Unsent', 'Delete-Sent'])),
      //         },
      //       });

      //       const existingProjectIds = Array.from(
      //         new Set(
      //           existing_RAT_project_notices.map((notice) =>
      //             String(notice.project_id),
      //           ),
      //         ),
      //       );

      //       const missingProjectIds = account_details.project_ids.filter(
      //         (projectId) => !existingProjectIds.includes(String(projectId)),
      //       );

      //       if (missingProjectIds.length > 0) {
      //         console.log('Projects without a notice:', missingProjectIds);
      //         // Do something with the missingProjectIds array

      //         for (const projectId of missingProjectIds) {
      //           const generateNoticePayload: Partial<generateNoticeInput> = {
      //             company_id: noticeListWithData.company_id,
      //             bank_account_id: noticeListWithData.bank_account_id,
      //             project_id: Number(projectId),
      //             notice_type: 'QBCC TA1 Retention Trust Account Notice',
      //           };

      //           const newNotice = (await this.generateNotice(
      //             context,
      //             generateNoticePayload as generateNoticeInput,
      //           )) as generateNoticeResponse;

      //           noticeGen = true;

      //           if (
      //             noticeListWithData.retentionAccDelegation === 'Paid' ||
      //             noticeListWithData.retentionAccDelegation ===
      //             'Paid-delegated' ||
      //             userMode == 'Onboarding'
      //           ) {
      //             const generateMailNoticePayload: GenerateMailForANoticeInput =
      //             {
      //               id: newNotice?.data?.id,
      //             };
      //             //need to confirm
      //             if (
      //               noticeListWithData.retentionAccDelegation === 'Paid' ||
      //               noticeListWithData.retentionAccDelegation ===
      //               'Paid-delegated'
      //             ) {
      //               const decoded =
      //                 await this.jwtInternalService.decodeJwtToken(context);
      //               const doc = await this.noticeService.generateNoticeDocument(
      //                 generateMailNoticePayload,
      //                 decoded,
      //               );
      //             }

      //             if (
      //               noticeListWithData.retentionAccDelegation ===
      //               'Paid-delegated' ||
      //               userMode == 'Onboarding'
      //             ) {
      //               if (userMode && userMode == 'Normal') {
      //                 const adminMail = await this.sentAdminMailForQbccNotice(
      //                   context,
      //                   newNotice?.data?.id,
      //                   true
      //                 );

      //                 qbcc_notice_previews.push(adminMail.data);
      //               }
      //               const updateNoticePayload: updateNoticesInput = {
      //                 notice_id: newNotice.data.notice_id,
      //                 delegated_qbcc: true,
      //                 status:
      //                   userMode == 'Normal' ? 'Sending' : 'Sent - Onboarded',
      //                 qbcc: true,
      //                 reference_id: noticeListWithData.bank_account_id,
      //                 reference_link: noticeListWithData.bank_accoutn_link,
      //               };
      //               const updateStatus = await this.updateNotice(
      //                 context,
      //                 updateNoticePayload,
      //               );
      //             }
      //           } else {
      //             //Generating notice link link to view matched transactions.
      //             const noticeLink =
      //               `${process.env.LOG_BASE_URL}` +
      //               `${linkExtensions[14]}` +
      //               `${newNotice.data.id}` +
      //               `?from=log`;
      //             console.log('noticeLink', noticeLink);

      //             //Create activity log as soon a payment claim is created.
      //             const createActivityLogInput: CreateActivityLogInput = {
      //               event_template_id: 128,
      //               admin_id:
      //                 decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //                   ? decoded?.admin_id
      //                   : null,
      //               to_user:
      //                 decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //                   ? decoded?.userId
      //                   : null,
      //               from_user:
      //                 decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
      //                   ? null
      //                   : decoded?.userId,
      //               company_id: noticeListWithData.company_id,
      //               dynamic_values: {
      //                 noticeLink,
      //                 noticeSubject: generateNoticePayload.notice_type,
      //                 referenceId: noticeListWithData.bank_account_id,
      //                 referenceLink: noticeListWithData.bank_accoutn_link,
      //               },
      //               is_admin: false,
      //               created_by: decoded?.userId,
      //             };
      //             //console.log('createActivityLogInput', createActivityLogInput);
      //             await this.activityLogService.insertActivityLog(
      //               createActivityLogInput,
      //             );
      //           }
      //         }
      //       }
      //     }
      //   }
      //   if (noticeGen === true && userMode === 'Normal') {
      //     return framedResponse(
      //       'SUCCESS',
      //       `Notices added to list successfully.`,
      //       { notice_previews, qbcc_notice_previews }
      //     );
      //     // return notice_previews;
      //   } else if (userMode === 'Onboarding') {
      //     return framedResponse(
      //       'SUCCESS',
      //       `Notices created and marked as sent-onboarded`,
      //     );
      //   } else return framedResponse('SUCCESS');
      // } else return framedResponse('SUCCESS');

      return this.noticeService.handleTriggerAccountNotices(decoded, payload);
    } catch (error) {
      this.logger.error(
        `Errored while triggering notices of contract: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => listMailsOfANoticeResponse, {
    name: 'listAllMailsOfANotice',
    description: 'Lists all email records associated with a given notice.',
  })
  async listAllMailsOfANotice(
    @Args('payload', {
      description:
        'Payload containing notice ID to list all associated email records',
    })
    payload: ListAllMailsofANoticesInput,
  ) {
    try {
      this.logger.log(
        `Request received for listing all mails of notice ${payload.notice_id}.`,
      );

      return this.noticeService.listAllMailsOfANotice(payload);
    } catch (error) {
      this.logger.error(
        `Errored while listing all mails of a notice: ${payload.notice_id} with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllUnsentNoticesOfACompanyResponse, {
    name: 'fetchAllUnsentNoticesOfACompany',
    description:
      'Fetches all unsent notices for a given company based on the provided input payload.',
  })
  async fetchAllUnsentNoticesOfACompany(
    @Args('payload', {
      description:
        'Payload containing company ID and filters to fetch all unsent notices for that company',
    })
    payload: FetchAllUnsentNoticesOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all unsent notices of a company with data: ${JSON.stringify(payload)}`,
      );

      const allMatchedTransactionsOfAPayment =
        await this.noticeService.fetchAllUnsentNoticesOfACompany(payload);
      return allMatchedTransactionsOfAPayment;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all unsent notices of a company with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all unsent notices of a company with message: ${error}`,
      );
    }
  }
}
