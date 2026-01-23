import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PtAdminService } from './pt-admin.service';
import { Public } from '../../../api/auth/jwt-guard/public.decorator';
import { AddPTAdminInput, SortingOrder } from './dto/add-admin.dto';
import { PTAdminResponse } from './response/pt-admin.response';
import {
  AuthResponse,
  StringResponse,
} from '../../../api/users/signup/response/auth.response';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { Roles } from '../../../api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtAuthGuard } from '../../../api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AdminStatus } from 'src/entities/admin-details.entity';
import { PtGroupsService } from '../pt-groups/pt-groups.service';
import { AdminGroup } from '../../../entities/admin-group.entity';
import { PTAdminListResponse } from './response/pt-admin-list.response';
import {
  CreateAdminEmailVerificationInput,
  UpdateAdminInput,
} from './dto/update-admin.dto';
import {
  PTAdminGroup,
  PTAdminGroupResponse,
} from './response/pt-admin-group.response';
import { EmailService } from 'src/libs/@email-services/email.service';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { PtContentsService } from '../pt-contents/pt-contents.service';
import { handleError } from 'src/api/common/error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
const axios = require('axios');
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
var errorMessage = '';

var bcrypt = require('bcryptjs');
var moment = require('moment-timezone');

@Resolver()
export class PtAdminResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly ptAdminService: PtAdminService,
    private readonly ptGroupService: PtGroupsService,
    private readonly ptContentService: PtContentsService,
    private readonly emailServices: EmailService,
    private readonly activityLogService: ActivityLogService,
    // private emailQueueProducer: EmailQueueProducer,
    private authService: AuthService,
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
  @Roles(Role.PORTAL_ADMIN)
  @Mutation(() => PTAdminResponse, {
    name: 'insertAdminDetails',
    description:
      'Adds a new portal admin to the system and sends a verification email with credentials.',
  })
  async insertAdminDetails(
    @Context() context,
    @Args('addPTAdminInput', {
      description:
        'Input payload containing details required to create a new portal admin.',
    })
    addPTAdminInput: AddPTAdminInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const passwordString = addPTAdminInput.password;
      this.logger.log(
        `Request recieved to add a new admin with email-id: ${JSON.stringify(addPTAdminInput.email_id)}`,
      );
      const adminDetails = await this.ptAdminService.create(addPTAdminInput);

      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'add-portal-admin',
        );

      const mailDynamicData = {
        ...adminDetails,
        loginPassword: passwordString,
      };

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      var mailDetails = {
        toEmail: adminDetails.email_id,
        subject: mailTemplate.email_subject,
        template: 'header-footer-email',
        mailBody: mailbody,
        mail_type: EmailTypeEnum.addedPortalAdmin,
      };

      //Generating admin-user link.
      const adminUserLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[39]}` +
        `${adminDetails.id}` +
        `?from=log`;
      this.logger.log(`adminUserLink: ${adminUserLink}`);
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 136,
        admin_id: decoded?.userId,
        dynamic_values: {
          userName: adminDetails.first_name + adminDetails.last_name,
          userLink: adminUserLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      //console.log('createActivityLogInput', createActivityLogInput);

      await this.activityLogService.insertActivityLog(createActivityLogInput);

      if (addPTAdminInput.group_ids && addPTAdminInput.group_ids.length > 0) {
        const adminGroupDetails = await Promise.all(
          addPTAdminInput.group_ids.map((groupId) =>
            this.ptGroupService.getGroupDetailsById(groupId),
          ),
        );

        // const adminGroupDetails = await this.ptGroupService.getGroupById(addPTAdminInput.group_id);
        if (adminGroupDetails.some((groupDetail) => !groupDetail)) {
          throw new Error('Invalid group_id');
        }
        const adminGroups = adminGroupDetails.map((groupDetail) => {
          const adminGroup = new AdminGroup();
          adminGroup.adminDetails = adminDetails;
          adminGroup.adminGroupDetails = groupDetail;
          return adminGroup;
        });

        const savedAdminGroups = await Promise.all(
          adminGroups.map((adminGroup) =>
            this.ptAdminService.createAdminGroup(adminGroup),
          ),
        );
        if (savedAdminGroups.every((savedAdminGroup) => savedAdminGroup)) {
          this.emailQueueProducer.emailQueueProducer(mailDetails);
          // this.emailServices.sendMail(mailDetails);
          this.logger.log(`Email sent successfully.`);
          return framedResponse(
            'SUCCESS',
            `Response successfully sent back to the client`,
            adminDetails,
          );
        }
      } else {
        if (adminDetails) {
          this.emailQueueProducer.emailQueueProducer(mailDetails);
          // this.emailServices.sendMail(mailDetails);
          this.logger.log(`Email sent successfully.`);
          return framedResponse(
            'SUCCESS',
            `Response successfully sent back to the client`,
            adminDetails,
          );
        } else {
          return framedResponse('ERROR', `Error in insertion of admin details`);
        }
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
  @Query(() => PTAdminResponse, {
    name: 'checkAdminExistence',
    description:
      'Checks if an admin already exists in the system by their email ID.',
  })
  async checkAdminExistence(
    @Args('email_id', {
      description:
        'The email ID of the admin to check for existence in the system.',
    })
    email_id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}`,
      );
      const adminDetails =
        await this.ptAdminService.checkAdminExistence(email_id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(adminDetails)}`,
      );
      if (adminDetails) {
        return framedResponse('SUCCESS', `User already exists.`, adminDetails);
      } else {
        return framedResponse('SUCCESS', `User not exist.`);
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', `Error in checking admin details.`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => PTAdminResponse, {
    name: 'updateAdminDetails',
    description:
      'Updates details of an existing admin. Restricted admins can update only their own information.',
  })
  async updateAdminDetails(
    @Context() context,
    @Args('updateAdminInput', {
      description: 'Input payload containing fields to update for the admin.',
    })
    updateAdminInput: UpdateAdminInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const adminId = decoded?.id;
      const isRestrictedPortalAdmin = decoded?.role.includes(
        Role.RESTRICTED_PORTAL_ADMIN,
      );

      if (isRestrictedPortalAdmin && updateAdminInput.id != adminId) {
        throw new BadRequestException(
          "Restricted admin can only update personal data -  ID can't be accepted",
        );
      }

      if (!isRestrictedPortalAdmin && !updateAdminInput.id) {
        throw new BadRequestException(
          'Portal admin must provide the ID of the admin to update',
        );
      }

      if (
        !isRestrictedPortalAdmin &&
        updateAdminInput.id != adminId &&
        updateAdminInput.password !== undefined
      ) {
        throw new BadRequestException(
          "Can't update the password of another admin. Consider reset.",
        );
      }

      if (isRestrictedPortalAdmin) {
        // Handle updates for restricted portal admin

        if (updateAdminInput.signature) {
          //signature upload only for super admin
          throw new BadRequestException(
            'Only super Admin can upload a signature',
          );
        }
        const response = this.ptAdminService.update(adminId, updateAdminInput);

        let eventTemplateId = 137;

        if (updateAdminInput.password && response) {
          eventTemplateId = 175;
        }
        //Generating admin-user link.
        const adminUserLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[39]}` +
          `${updateAdminInput.id}` +
          `?from=log`;
        this.logger.log(`adminUserLink: ${adminUserLink}`);
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: eventTemplateId,
          admin_id: decoded?.userId,
          dynamic_values: {
            userName: updateAdminInput.first_name + updateAdminInput.last_name,
            userLink: adminUserLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);

        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse('SUCCESS', `Admin details updated.`, response);
      } else {
        let signatureUpdate = false;
        let eventTemplateId = 137;
        if (updateAdminInput.signature) {
          //signature upload only for super admin
          if (adminId !== updateAdminInput.id) {
            throw new BadRequestException(
              'Only portal Admin signature can be uploaded',
            );
          } else {
            signatureUpdate = true;
          }
        }
        const response = await this.ptAdminService.PortalAdminUpdate(
          adminId,
          updateAdminInput,
        );

        if (updateAdminInput.password && response) {
          eventTemplateId = 175;
        }

        if (response && signatureUpdate === true) {
          eventTemplateId = 177;
        }

        if (response && updateAdminInput.admin_status === 'Deleted') {
          eventTemplateId = 138;
        }

        if (response && updateAdminInput.admin_role === Role.PORTAL_ADMIN) {
          eventTemplateId = 139;
        }

        //Generating admin-user link.
        const adminUserLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[39]}` +
          `${updateAdminInput.id}` +
          `?from=log`;
        this.logger.log(`adminUserLink: ${adminUserLink}`);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: eventTemplateId,
          admin_id: decoded?.userId,
          dynamic_values: {
            userName: response.first_name + response.last_name,
            userLink: adminUserLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);

        const actionType = eventTemplateId == 138 ? 'deleted' : 'updated';

        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Admin user ${actionType} successfully`,
          response,
        );
      }
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
  @Mutation(() => StringResponse, {
    name: 'insertAdminEmailVerificationDetails',
    description:
      'Inserts verification code and expiry details to verify an admin email and sends a verification email.',
  })
  async insertAdminEmailVerificationDetails(
    @Args('createAdminEmailVerificationInput', {
      description:
        'Input payload containing admin email and verification type for inserting email verification details.',
    })
    createAdminEmailVerificationInput: CreateAdminEmailVerificationInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved to verify the mail account to create admin with email: ${JSON.stringify(createAdminEmailVerificationInput.email_id)}`,
      );

      createAdminEmailVerificationInput.verification_code = String(
        Math.floor(Math.random() * 900000 + 100000),
      );
      createAdminEmailVerificationInput.code_expires_in = new Date(
        Date.now() + 20 * 60 * 1000,
      );
      if (createAdminEmailVerificationInput.type != 'Resend') {
        // createEmailVerificationInput.created_by = decoded?.userId;
        createAdminEmailVerificationInput.created_on = moment.tz('UTC');
      } else {
        // createEmailVerificationInput.updated_by = decoded?.userId;
        createAdminEmailVerificationInput.updated_on = moment.tz('UTC');
      }
      const response = await this.ptAdminService.verifyAdminEmail(
        createAdminEmailVerificationInput,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );

      if (response) {
        var mailTemplate, toMaildetails;

        mailTemplate =
          await this.ptContentService.getMailTemplateByMailType(
            'admin-mail-verify',
          );
        toMaildetails = response.email_id;

        const Keys = mailTemplate.selected_dynamic;
        const dynamicData: { [key: string]: any } = {};
        Keys.forEach((key) => {
          dynamicData[key] = response[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        var mailDetails = {
          toEmail: toMaildetails,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.adminMailVerify,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully with details: ${mailDetails}`);
        return framedResponse('SUCCESS', `Email sent successfully`);
      }
      return framedResponse(
        'ERROR',
        `Error in inserting verfification details: ${JSON.stringify(response)}`,
      );
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
  @Query(() => AuthResponse, {
    name: 'verifyAdminCode',
    description:
      'Verifies an admin email using the provided verification code and optionally updates email ID.',
  })
  async verifyAdminCode(
    @Context() context,
    @Args('verification_code', {
      description: 'The verification code sent to the admin email.',
    })
    verification_code: string,
    @Args('new_email_id', {
      nullable: true,
      description: 'Optional new email ID to update the admin account.',
    })
    new_email_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: verification_code:: ${verification_code}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const emailVerificationInput = {
        email_id: new_email_id,
      };

      const emailVerifyDetails =
        await this.ptAdminService.getAdminEmailVerifyDetails(
          emailVerificationInput,
        );

      if (emailVerifyDetails) {
        if (
          moment(emailVerifyDetails.code_expires_in).utc().isAfter(moment.utc())
        ) {
          if (emailVerifyDetails.verification_code === verification_code) {
            const updateAdminEmailRes =
              await this.ptAdminService.updateAdminEmail(
                decoded?.emailId,
                emailVerifyDetails.email_id,
              );
            this.logger.log(
              `Response recieved while leaving the client: ${JSON.stringify(updateAdminEmailRes)}`,
            );
            if (updateAdminEmailRes) {
              const response = await this.authService.getAuthToken(
                emailVerifyDetails.email_id,
                true,
              );

              this.logger.log(
                `Response recieved while leaving the client: ${JSON.stringify(response)}`,
              );
              return framedResponse(
                'SUCCESS',
                `Response successfully sent back to the client`,
                response.data,
              );
            }
            return framedResponse(
              'ERROR',
              `Unable to update email address, please try again.`,
            );
          }
          return framedResponse('ERROR', `This code is invalid.`);
        }
        return framedResponse(
          'ERROR',
          `Verification code expired. Click on the send verification email again link to receive a new code.`,
        );
      }
      return framedResponse('ERROR', `Please enter a valid email address`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => PTAdminListResponse, {
    name: 'listAllAdmins',
    description: 'Fetches a list of all admins.',
  })
  async listAllAdmins(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to filter admin list by name or email.',
    })
    keyword: string,
    @Args('status', {
      nullable: true,
      description: 'Status to filter admins (Active/Inactive/Deleted).',
    })
    status: AdminStatus,
    @Args('page', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Page number for pagination.',
    })
    page: number,
    @Args('perPage', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Number of records per page.',
    })
    perPage: number,
    @Args('sortingField', {
      nullable: true,
      description: 'Field name to sort the admin list.',
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
      const { admins, totalCount } = await this.ptAdminService.searchAdmins(
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
        { admins, totalCount },
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
  @Roles(Role.PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'resetAdminPassword',
    description:
      'Resets the password of an admin and sends an email notification with new password details.',
  })
  async resetAdminPassword(
    @Context() context,
    @Args('Id', {
      description: 'The unique ID of the admin whose password will be reset.',
    })
    Id: string,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const adminData = await this.ptAdminService.resetAdminPassword(Id);
      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'reset-admin-password',
        );

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = adminData.admin[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      if (adminData) {
        var mailDetails = {
          toEmail: adminData.admin.email_id,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.resetAdminPassword,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully.`);

        //Generating admin-user link.
        const adminUserLink =
          `${process.env.LOG_BASE_URL}` + `${linkExtensions[39]}` + `${Id}`;
        this.logger.log(`adminUserLink: ${adminUserLink}`);

        this.logger.log(`decodededed: ${JSON.stringify(decoded)}`);
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 176,
          admin_id: decoded?.userId,
          dynamic_values: {
            userName: adminData.admin.first_name + adminData.admin.last_name,
            userLink: adminUserLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);

        await this.activityLogService.insertActivityLog(createActivityLogInput);

        return framedResponse('SUCCESS', `Email sent successfully.`);
      }
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

  @Public()
  @Query(() => AuthResponse, {
    name: 'adminLoginByEmailId',
    description:
      'Logs in an admin using email and password and returns authentication token.',
  })
  async adminLoginByEmailId(
    @Args('email_id', { description: 'Email ID of the admin to log in.' })
    email_id: string,
    @Args('password', { description: 'Password of the admin.' })
    password: string,
    @Args('user_timezone', {
      description: 'Timezone of the user for login timestamp.',
    })
    user_timezone: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}`,
      );
      const userDetails = await this.ptAdminService.getAdminByEmail(email_id);
      if (
        userDetails &&
        userDetails !== null &&
        userDetails.admin_status === 'Active'
      ) {
        // const isMatch = await bcrypt.compare(password, String(userDetails.password));
        // Use the below code in local to generate Super admin password.
        // var bcrypt = require('bcryptjs');
        // const superAdminPassword = await bcrypt.hashSync(
        //   'F0und@tion$2025#',
        //   bcrypt.genSaltSync(5),
        // );
        // console.log({ superAdminPassword });
        const isMatch = await bcrypt.compareSync(
          password,
          String(userDetails.password),
        );
        if (isMatch) {
          const lastLoggedIn = moment.tz('UTC');
          const updateLoginInfoRes = await this.ptAdminService.updateLoginInfo(
            email_id,
            lastLoggedIn,
            user_timezone,
          );
          // console.log(updateLoginInfoRes);
          const response = await this.authService.getAuthToken(
            userDetails.email_id,
            true,
          );
          this.logger.log(`token: ${JSON.stringify(response.data)}`);
          this.logger.log(
            `Response recieved while leaving the client: ${JSON.stringify(response)}`,
          );

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 3,
            admin_id: userDetails.admin_id,
            is_admin: true,
            created_by: userDetails.admin_id,
          };
          //console.log('createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          return framedResponse(
            'SUCCESS',
            `Response successfully sent back to the client`,
            response.data,
          );
        }
        return framedResponse('ERROR', `Invalid credentials.`);
      } else if (
        userDetails &&
        userDetails !== null &&
        userDetails.admin_status !== 'Active'
      ) {
        return framedResponse(
          'ERROR',
          `Your account is inactive. Please contact the paytrade administrator.`,
        );
      }
      return framedResponse('ERROR', `Invalid credentials.`);
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
  @Query(() => PTAdminGroupResponse, {
    name: 'getAdminDetailsById',
    description:
      'Fetches detailed information about a specific admin including groups, profile, and attachments.',
  })
  async getAdminById(
    @Args('Id', { description: 'The unique ID of the admin to fetch.' })
    id: string,
  ): Promise<any> {
    try {
      const admin = await this.ptAdminService.getAdminById(id);
      let file;
      if (admin.fileAttachments && admin.fileAttachments.file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(admin.fileAttachments.file_path);
          if (fileBuffer) {
            file = `data:${admin.fileAttachments.file_type};base64,${fileBuffer.toString('base64')}`;
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
        admin.fileAttachments.file_path =
          process.env.UPLOAD_BASE_URL +
          admin.fileAttachments.file_path.replace(/\\/g, '/');
      }

      const response: PTAdminGroup = {
        id: admin.id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email_id: admin.email_id,
        admin_status: admin.admin_status,
        last_logged_in: admin.last_logged_in,
        created_on: admin.created_on,
        admin_role: admin.admin_role,
        signature: admin.signature,
        signature_type: admin.signature_type,
        groupIds: admin.adminDetailsGroup.map((group) => group.group_id),
        profile_id: admin.profile_id,
        file_path: admin?.fileAttachments?.file_path,
        file_type: admin?.fileAttachments?.file_type,
        file: file,
      };

      if (admin) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          response,
        );
      } else {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }
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
