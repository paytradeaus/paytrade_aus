import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { JwtAuthGuard } from '../../../api/auth/jwt-guard/jwt-auth.guard';
import { Role } from '../../../api/auth/role-guard/role.enum';
import { Roles } from '../../../api/auth/role-guard/roles.decorator';
import { PtAdminAccessService } from './pt-admin-access.service';
import { PTUserListResponse } from './response/pt-user-list.response';
import { UserStatus } from '../../../entities/user-details.entity';
import { PTUserResponse } from './response/pt-user.response';
import { UpdateUserDetailsInput } from './dto/ptadmin-update-user.dto';
import { EmailService } from 'src/libs/@email-services/email.service';
import { PTCompanyListResponse } from './response/pt-company-list.response';
import { PTCompanyResponse } from './response/pt-company.response';
import { UpdateCompanyDetailsInput } from './dto/ptadmin-update-company.dto';
import { AdminCreateUserInput } from './dto/ptadmin-add-user.dto';
import { AdminCreateCompanyInput } from './dto/ptadmin-add-company.dto';
import { handleError } from 'src/api/common/error-handler';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { FinancialInstitutionStatus } from 'src/entities/financial-institution-deatils.entity';
import { AdminAddFinInstitutionInput } from './dto/ptadmin-add-fin-institution.dto';
import {
  financialInsDetailsResponse,
  financialInsListResponse,
} from './response/pt-fin-institutions-details.response';
import { AdminUpdateFinInsInput } from './dto/ptadmin-update-fin-institution.dto';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import {
  AdminAddHolidayInput,
  AdminUpdateHolidayInput,
} from './dto/pt-holidays-input.dto';
import {
  HolidayDetailsResponse,
  HolidayListResponse,
  HolidayTableStatusResponse,
} from './response/pt-holidays.response';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { UpdateBusinessFreeAccessInput } from './dto/ptadmin-update-free-access.dto';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class PtAdminAccessResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly ptContentService: PtContentsService,
    // private emailQueueProducer: EmailQueueProducer,
    private readonly ptAdminAccessService: PtAdminAccessService,
    private readonly activityLogService: ActivityLogService,
    private readonly emailServices: EmailService,
    private emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTUserListResponse, {
    name: 'adminlistAllUsers',
    description: 'Fetches a list of all users.',
  })
  async adminlistAllUsers(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to filter users by name or email.',
    })
    keyword: string,
    @Args('status', {
      nullable: true,
      description: 'Filter users by their status (Active/Inactive).',
    })
    status: UserStatus,
    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,
    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of users per page.',
    })
    perPage: number,
    @Args('sortingField', {
      nullable: true,
      description: 'Field to sort the user list by.',
    })
    sorting_field: string,
    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      const { users, totalCount } =
        await this.ptAdminAccessService.listAllUsers(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { users, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTUserResponse, {
    name: 'adminUpdateUser',
    description: 'Updates user details by admin and logs the activity.',
  })
  async adminUpdateUser(
    @Context() context,
    @Args('updateAdminInput', {
      description:
        'Input payload containing fields to update for the user by admin.',
    })
    updateUserDetailsInput: UpdateUserDetailsInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating a user details by admin with payload: ${JSON.stringify(updateUserDetailsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const user = await this.ptAdminAccessService.updateUser(
        updateUserDetailsInput,
      );
      let templateID, action, userLink;
      if (updateUserDetailsInput.is_admin_contacted) {
        templateID = 146;
        action = 'contacted';
        userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink1: ${userLink}`);
      } else if (
        updateUserDetailsInput.user_status === 'Blocked' &&
        !updateUserDetailsInput.latitude
      ) {
        templateID = 145;
        action = 'Blocked';
        userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink2: ${userLink}`);
      } else if (
        updateUserDetailsInput.is_admin_contacted == false &&
        Object.keys(updateUserDetailsInput).length < 3
      ) {
        templateID = 146;
        action = 'uncontacted';
        userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink3: ${userLink}`);
      } else if (
        updateUserDetailsInput.user_status === 'Active' &&
        Object.keys(updateUserDetailsInput).length < 3
      ) {
        templateID = 145;
        action = 'Unblocked';
        userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink4: ${userLink}`);
      } else {
        templateID = 144;
        userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink5: ${userLink}`);
      }

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: templateID,
        admin_id: decoded?.userId,
        dynamic_values: {
          action: action,
          userName: user.first_name,
          userLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Errored while inserting project details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTUserResponse, {
    name: 'adminGetUserById',
    description: 'Retrieves user details by ID.',
  })
  async adminGetUserById(
    @Args('user_id', { description: 'ID of the user to fetch details for.' })
    user_id: number,
  ): Promise<any> {
    try {
      const user = await this.ptAdminAccessService.getUserById(user_id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'adminResetUserPassword',
    description: 'Resets a user password and sends a notification email.',
  })
  async adminResetUserPassword(
    @Context() context,
    @Args('Id', { description: 'ID of the user whose password will be reset.' })
    Id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for admin reset password for the user: ${Id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const userData = await this.ptAdminAccessService.resetUserPassword(Id);
      // const createActivityLogInput: CreateActivityLogInput = {
      //   event_template_id: 174,
      //   admin_id: decoded?.userId,
      //   dynamic_values: {
      //     adminName: decoded?.userName,
      //     userName: userData.user.first_name + ' ' + userData.user.last_name,
      //   },
      //   is_admin: true,
      //   created_by: decoded?.userId,
      // };

      // await this.activityLogService.insertActivityLog(createActivityLogInput);
      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'admin-reset-user-password',
        );

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = userData.user[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      if (userData) {
        var mailDetails = {
          toEmail: userData.user.email_id,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.adminResetUserPassword,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully.`);

        const userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${userData.user.user_id}` +
          `?from=log`;
        this.logger.log(`userLink2: ${userLink}`);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 174,
          admin_id: decoded?.userId,
          dynamic_values: {
            userName: userData.user.first_name + userData.user.last_name,
            userLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);

        return framedResponse('SUCCESS', `Email sent successfully.`);
      }
    } catch (error) {
      this.logger.error(
        `Errored while inserting project details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTCompanyListResponse, {
    name: 'adminlistAllCompanies',
    description: 'Fetches a list of all companies.',
  })
  async adminlistAllCompanies(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to filter companies by name or email.',
    })
    keyword: string,
    @Args('plan', {
      nullable: true,
      description: 'Filter companies by subscription plan.',
    })
    plan: string,
    @Args('blocked', {
      nullable: true,
      description: 'Filter companies based on blocked status.',
    })
    blocked: boolean,
    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,
    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of companies per page.',
    })
    perPage: number,
    @Args('sortingField', {
      nullable: true,
      description: 'Field to sort the company list by.',
    })
    sorting_field: string,
    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      const { companies, totalCount } =
        await this.ptAdminAccessService.listAllCompanies(
          keyword,
          plan,
          blocked,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { companies, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  // @Query(() => String, { name: 'adminExportCompaniesExcel' })
  // async adminExportCompaniesExcel(): Promise<any> {
  //   return this.ptAdminAccessService.exportAllCompanies();
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  // @Mutation(() => String, { name: 'adminUploadCompanyList' })
  // async adminUploadCompanyList(
  //   @Args('filePath') filePath: string,
  // ): Promise<any> {
  //   try {
  //     const companyData =
  //       await this.ptAdminAccessService.importCompaniesFromExcel(filePath);
  //     return companyData;
  //   } catch (error) {
  //     return new HttpException(error, HttpStatus.BAD_REQUEST);
  //   }
  // }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTCompanyResponse, {
    name: 'adminGetCompanyById',
    description: 'Retrieves company details by ID.',
  })
  async adminGetCompanyById(
    @Args('company_id', {
      description: 'ID of the company to fetch details for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      const company =
        await this.ptAdminAccessService.getCompanyById(company_id);

      if (company.icon_file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(company.icon_file_path);
          if (fileBuffer) {
            const icon = `data:${company.icon_file_type};base64,${fileBuffer.toString('base64')}`;
            company.icon_base64 = icon;
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        company,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTCompanyResponse, {
    name: 'adminUpdateCompany',
    description: 'Updates company details and logs admin activity.',
  })
  async adminUpdateCompany(
    @Context() context,
    @Args('updateAdminInput', {
      description:
        'Input payload containing fields to update for the company by admin.',
    })
    updateCompanyDetailsInput: UpdateCompanyDetailsInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating company details by admin with payload: ${JSON.stringify(updateCompanyDetailsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      this.logger.log(`resulttttt: ${Object.keys(updateCompanyDetailsInput).length}`);
      const company = await this.ptAdminAccessService.updateCompany(
        updateCompanyDetailsInput,
      );
      let templateID, action;
      if (
        updateCompanyDetailsInput.is_admin_blocked &&
        Object.keys(updateCompanyDetailsInput).length < 3
      ) {
        templateID = 149;
        action = 'Blocked';
      } else if (
        updateCompanyDetailsInput.is_admin_blocked == false &&
        Object.keys(updateCompanyDetailsInput).length < 3
      ) {
        templateID = 149;
        action = 'Unblocked';
      } else {
        templateID = 148;
      }

      //Generating company link.
      const companyLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[20]}` +
        `${company.company_id}` +
        `?from=log`;
      this.logger.log(`companyLink: ${companyLink}`);

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: templateID,
        admin_id: decoded?.userId,
        dynamic_values: {
          action: action,
          companyName: company.company_name,
          companyLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse('SUCCESS', `Company details updated`, company);
    } catch (error) {
      this.logger.error(
        `Errored while updating company details with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTUserResponse, {
    name: 'AdminCreateUserDetails',
    description: 'Creates a new user account and sends email notifications.',
  })
  async AdminCreateUserDetails(
    @Context() context,
    @Args('adminCreateUserInput', {
      description:
        'Input payload containing details to create a new user by admin.',
    })
    adminCreateUserInput: AdminCreateUserInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for adding a new user by admin with payload: ${JSON.stringify(adminCreateUserInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const userDetails = await this.ptAdminAccessService.createUser(
        decoded,
        adminCreateUserInput,
      );

      //Generating link to view created admin user.
      const userId = userDetails.user.user_id + 1000;
      const userLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[18]}` +
        userId +
        `?from=log`;
      this.logger.log(`userLink: ${userLink}`);

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 143,
        admin_id: decoded?.userId,
        dynamic_values: {
          userName: userDetails.user.first_name,
          userLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'admin-added-user',
        );

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = userDetails.user[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      if (userDetails) {
        var mailDetails = {
          toEmail: userDetails.user.email_id,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.adminAddedUser,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);

        const adminDetails = await this.ptAdminAccessService.getAdminDetails();

        const adminMailTemplate =
          await this.ptContentService.getMailTemplateByMailType(
            'intimate-admin',
          );

        const adminDynamicData: any = {
          admin_first_name: adminDetails.first_name,
          admin_last_name: adminDetails.last_name,
          user_name:
            userDetails.user.first_name + ' ' + userDetails.user.last_name,
          email_id: userDetails.user.email_id,
          signup_date: moment
            .utc(userDetails.user.created_on)
            .tz(adminDetails.user_timezone)
            .format('DD/MM/YYYY HH:mm:SS A'),
          location: userDetails.user.user_address,
        };

        const adminMailbody = await this.replaceVariables(
          adminMailTemplate.email_content,
          adminDynamicData,
        );

        let adminMailDetails = {
          toEmail: process.env.ADMIN_EMAIL, // adminDetails.email_id,
          subject: adminMailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: adminMailbody,
          mail_type: EmailTypeEnum.intimateAdmin,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(adminMailDetails);
        this.logger.log(
          `Email sent successfully with details: ${adminMailDetails}`,
        );

        return framedResponse('SUCCESS', `New user added`, userDetails.user);
      } else {
        throw new Error('Failed to add new User');
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTCompanyResponse, {
    name: 'AdminCreateCompanyDetails',
    description: 'Creates a new company and sends notification emails.',
  })
  async AdminCreateCompanyDetails(
    @Context() context,
    @Args('adminCreateCompanyInput', {
      description:
        'Input payload containing details to create a new company by admin.',
    })
    adminCreateCompanyInput: AdminCreateCompanyInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating new company details by admin with payload: ${JSON.stringify(adminCreateCompanyInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const company = await this.ptAdminAccessService.createCompany(
        adminCreateCompanyInput,
      );

      //Generating company link.
      const companyLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[20]}` +
        `${company.companyDetails.company_id}` +
        `?from=log`;
      this.logger.log(`companyLink: ${companyLink}`);

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 147,
        admin_id: decoded?.userId,
        dynamic_values: {
          companyName: company.companyDetails.company_name,
          companyLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'admin-added-company',
        );
      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        if (key in company.user) {
          dynamicData[key] = company.user[key];
        }
        if (key in company.companyDetails) {
          dynamicData[key] = company.companyDetails[key];
        }
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      if (company) {
        var mailDetails = {
          toEmail: company.user.email_id,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.adminAddedBusiness,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully with details: ${mailDetails}`);

        return framedResponse(
          'SUCCESS',
          `New Business added`,
          company.companyDetails,
        );
      } else {
        throw new Error('Failed to add new Business');
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => financialInsDetailsResponse, {
    name: 'adminAddFinancialInstitutionDetails',
    description: 'Adds new financial institution details.',
  })
  async adminAddFinancialInstitutionDetails(
    @Context() context,
    @Args('addFinInsDetailsInput', {
      description:
        'Input payload containing details to add a new financial institution.',
    })
    addFinInsDetailsInput: AdminAddFinInstitutionInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const newFinIns = await this.ptAdminAccessService.addFinInsDetails(
        addFinInsDetailsInput,
      );
      if (newFinIns) {
        //Generating link to view inserted master type details.
        const financialInstitutionLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[31]}` +
          `${newFinIns.id}` +
          `?from=log`;
        this.logger.log(`financialInstitutionLink: ${financialInstitutionLink}`);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 158,
          admin_id: decoded?.userId,
          dynamic_values: {
            adminName: decoded?.userName,
            financialInstitutionName: newFinIns.institution_name,
            financialInstitutionLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newFinIns,
        );
      } else {
        throw new Error(`Add Bank Details failed`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => financialInsDetailsResponse, {
    name: 'checkFinInstitutionExistence',
    description: 'Checks if a financial institution exists by code.',
  })
  async checkFinInstitutionExistence(
    @Args('institution_code', {
      description: 'Unique code of the financial institution to check.',
    })
    institution_code: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: institution_code: ${institution_code}`,
      );
      const FinInsDetails =
        await this.ptAdminAccessService.getFinInstitutionByCode(
          institution_code,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(FinInsDetails)}`,
      );
      if (FinInsDetails) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          FinInsDetails,
        );
      } else {
        return framedResponse(
          'ERROR',
          `Error in insertion of Financial Institution details`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Error in insertion of Financial Institution details`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => financialInsDetailsResponse, {
    name: 'checkFinInstitutionNameExistence',
    description: 'Checks if a financial institution exists by name.',
  })
  async checkFinInstitutionNameExistence(
    @Args('institution_name', {
      description: 'Name of the financial institution to check.',
    })
    institution_name: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: institution_name: ${institution_name}`,
      );
      const FinInsDetails =
        await this.ptAdminAccessService.getFinInstitutionByName(
          institution_name,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(FinInsDetails)}`,
      );
      if (FinInsDetails) {
        return framedResponse(
          'SUCCESS',
          `Financial institution with same name found`,
          FinInsDetails,
        );
      } else {
        return framedResponse(
          'ERROR',
          `Financial Institution details not found`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', `Financial Institution details not found`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => financialInsDetailsResponse, {
    name: 'adminUpdateFinancialInstitutionDetails',
    description: 'Updates financial institution details and logs changes.',
  })
  async adminUpdateFinancialInstitutionDetails(
    @Context() context,
    @Args('addFinancialInsDetailsInput', {
      description:
        'Input payload containing details to update a financial institution.',
    })
    updateFinInsDetailsInput: AdminUpdateFinInsInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const prvsStatus = (
        await this.ptAdminAccessService.getFinInsById(
          updateFinInsDetailsInput.id,
        )
      ).institution_status;

      const updatedFinIns = await this.ptAdminAccessService.updateFinInsDetails(
        updateFinInsDetailsInput,
      );
      if (updatedFinIns) {
        //Generating link to view inserted master type details.
        const financialInstitutionLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[31]}` +
          `${updatedFinIns.id}` +
          `?from=log`;
        this.logger.log(`financialInstitutionLink: ${financialInstitutionLink}`);

        const createActivityLogInputEdit: CreateActivityLogInput = {
          event_template_id: 159,
          admin_id: decoded?.userId,
          dynamic_values: {
            action: 'Edited',
            financialInstitutionName: updatedFinIns.institution_name,
            financialInstitutionLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        this.logger.log(`Activity_log_edited _FI: ${JSON.stringify(createActivityLogInputEdit)}`);
        await this.activityLogService.insertActivityLog(
          createActivityLogInputEdit,
        );

        if (
          updateFinInsDetailsInput.institution_status &&
          updatedFinIns.institution_status !== prvsStatus
        ) {
          let action;
          if (updatedFinIns.institution_status === 'Blocked') {
            action = 'Blocked';
          } else if (updatedFinIns.institution_status === 'Archived') {
            action = 'Archived';
          } else if (updatedFinIns.institution_status === 'Inactive') {
            action = 'Inactivated';
          } else if (updatedFinIns.institution_status === 'Active') {
            action = 'Activated';
          }
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 159,
            admin_id: decoded?.userId,
            dynamic_values: {
              action: action,
              financialInstitutionName: updatedFinIns.institution_name,
              financialInstitutionLink,
            },
            is_admin: true,
            created_by: decoded?.userId,
          };
          this.logger.log(`Activity_log: ${JSON.stringify(createActivityLogInput)}`);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        }

        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          updatedFinIns,
        );
      } else {
        throw new Error(`Update Bank Details failed`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
    Role.ADMIN,
  )
  @Query(() => financialInsListResponse, {
    name: 'adminlistAllFinancialInstituion',
    description: 'Lists all financial institutions.',
  })
  async adminlistAllFinancialInstituion(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to filter financial institutions by name or code.',
    })
    keyword: string,
    @Args('status', {
      nullable: true,
      description: 'Filter financial institutions by their status.',
    })
    status: FinancialInstitutionStatus,
    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,
    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of financial institutions per page.',
    })
    perPage: number,
    @Args('sortingField', {
      nullable: true,
      description: 'Field to sort the financial institutions by.',
    })
    sorting_field: string,
    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
    @Args('isAlphabeticalOrder', {
      nullable: true,
      description: 'If true, returns the list in alphabetical order.',
    })
    isAlphabeticalOrder: boolean,
  ): Promise<any> {
    try {
      const { institutions, totalCount } =
        await this.ptAdminAccessService.listAllFinIns(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
          isAlphabeticalOrder,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { institutions, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => financialInsDetailsResponse, {
    name: 'adminGetFinancialInstitutionById',
    description: 'Retrieves financial institution details by ID.',
  })
  async adminGetFinancialInstitutionById(
    @Args('Id', { description: 'ID of the financial institution to retrieve.' })
    Id: string,
  ): Promise<any> {
    try {
      const bank = await this.ptAdminAccessService.getFinInsById(Id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        bank,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => HolidayDetailsResponse, {
    name: 'adminAddHolidayDetails',
    description: 'Adds a new holiday record.',
  })
  async adminAddHolidayDetails(
    @Context() context,
    @Args('addHolidayDetailsInput', {
      description: 'Input payload containing details for the new holiday.',
    })
    addHolidayDetailsInput: AdminAddHolidayInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const sameHoliday = await this.ptAdminAccessService.getHolidayOfSameDate(
        addHolidayDetailsInput,
      );

      if (sameHoliday) {
        throw new Error('Holiday is already added');
      }
      const newHoliday = await this.ptAdminAccessService.addHolidayDetails(
        addHolidayDetailsInput,
      );
      if (newHoliday) {
        //   const createActivityLogInput = {
        //     event_template_id: 200,
        //     admin_id: decoded?.userId,
        //     dynamic_values: {
        //       adminName: decoded?.userName,
        //       holidayName: newHoliday.holiday_name,
        //     },
        //     is_admin: true,
        //     created_by: decoded?.userId,
        //   };
        //   await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          'Holiday added successfully',
          newHoliday,
        );
      } else {
        throw new Error('Adding Holiday failed');
      }
    } catch (error) {
      this.logger.error(
        `Error inside adminAddHolidayDetails: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => error);
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => HolidayDetailsResponse, {
    name: 'adminUpdateHolidayDetails',
    description: 'Updates an existing holiday record.',
  })
  async adminUpdateHolidayDetails(
    @Context() context,
    @Args('updateHolidayDetailsInput', {
      description:
        'Input payload containing updated details of an existing holiday.',
    })
    updateHolidayDetailsInput: AdminUpdateHolidayInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      // const prevStatus = (
      //   await this.ptAdminAccessService.getHolidayById(updateHolidayDetailsInput.id)
      // ).status;

      const updatedHoliday =
        await this.ptAdminAccessService.updateHolidayDetails(
          updateHolidayDetailsInput,
        );
      if (updatedHoliday) {
        let message = 'Holiday updated successfully';
        if (updatedHoliday.holiday_status === 'Deleted') {
          message = 'Holiday deleted successfully';
        }
        return framedResponse('SUCCESS', message, updatedHoliday);
      } else {
        throw new Error('Updating Holiday failed');
      }
    } catch (error) {
      this.logger.error(
        `Error inside adminUpdateHolidayDetails: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => error);
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => HolidayListResponse, {
    name: 'adminListAllHolidays',
    description: 'Lists all holidays.',
  })
  async adminListAllHolidays(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to search holidays by name or description.',
    })
    keyword: string,

    @Args('status', {
      nullable: true,
      description: 'Filter holidays by status (e.g., ACTIVE or INACTIVE).',
    })
    status: string,

    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of holidays per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name to sort the holiday list by.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: string,

    @Args('startDate', {
      nullable: true,
      description: 'Start date to filter holidays (YYYY-MM-DD).',
    })
    startDate: string,

    @Args('endDate', {
      nullable: true,
      description: 'End date to filter holidays (YYYY-MM-DD).',
    })
    endDate: string,
  ): Promise<any> {
    try {
      const { holidays, totalCount } =
        await this.ptAdminAccessService.listAllHolidays(
          keyword,
          status,
          page,
          perPage,
          sorting_field,
          sorting_order,
          startDate,
          endDate,
        );
      return framedResponse(
        'SUCCESS',
        'Response successfully sent back to the client',
        { holidays, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => HolidayDetailsResponse, {
    name: 'adminGetHolidayById',
    description: 'Retrieves holiday details by ID.',
  })
  async adminGetHolidayById(
    @Args('Id', {
      description: 'Unique identifier of the holiday.',
    })
    Id: string,
  ): Promise<any> {
    try {
      const holiday = await this.ptAdminAccessService.getHolidayById(Id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        holiday,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => HolidayTableStatusResponse, {
    name: 'getHolidayTableStatus',
    description: 'Checks if the holiday table has sufficient future dates.',
  })
  async getHolidayTableStatus(): Promise<any> {
    try {
      const status =
        await this.ptAdminAccessService.getHolidayTableStatus();
      return framedResponse(
        'SUCCESS',
        'Holiday table status retrieved',
        status,
      );
    } catch (error) {
      this.logger.error(
        `Error checking holiday table status: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Error checking holiday table status: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updateBusinessFreeAccess',
    description: 'Enables or disables free premium access for a company.',
  })
  async updateBusinessFreeAccess(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing company ID and the free plan eligibility status.',
    })
    payload: UpdateBusinessFreeAccessInput,
  ) {
    try {
      this.logger.log(
        `Request received for updating company free access by admin with payload: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response =
        await this.ptAdminAccessService.updateBusinessFreeAccess(payload);

      return framedResponse(
        'SUCCESS',
        payload?.is_free_plan_eligible
          ? 'Enabled free premium access successfully'
          : 'Disabled free premium access successfully',
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating company free access with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }
}
