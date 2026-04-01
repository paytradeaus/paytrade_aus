import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UserAccessService } from './user-access.service';
import {
  CreateJoinUserAccessInput,
  CreateUserAccessInput,
} from './dto/create-user-access.input';
import { UpdateUserAccessInput } from './dto/update-user-access.input';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { UserResponse } from './response/user-response';
import { UserListResponse } from './response/user-list.response';
import { EmailService } from 'src/libs/@email-services/email.service';
import { InvitationListResponse } from './response/invitation-list.response';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { handleError } from 'src/api/common/error-handler';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from '../signup/response/auth.response';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import {
  FetchModeOfAnUserInput,
  SwitchModeOfAnUserInput,
} from './dto/switch-user-mode.input';
import {
  FetchModeOfAnUserResponse,
  SwitchUserModeResponse,
} from './response/switch-user-mode.response';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class UserAccessResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly userAccessService: UserAccessService,
    private readonly activityLogService: ActivityLogService,
    private readonly paymentGatewayService: PaymentGatewayService,
    // private emailQueueProducer: EmailQueueProducer,
    private readonly ptContentService: PtContentsService,
    private emailServices: EmailService,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetailsRepo: Repository<SubscriptionDetails>,
    @InjectRepository(CompanyUserRoles)
    private companyUsersRolesRepo: Repository<CompanyUserRoles>,
    private emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('USER_ACCESS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => UserListResponse, {
    name: 'getUserListsForCompany',
    description: `Fetches a paginated list of users belonging to a specific company.
    Supports search, sorting, and pagination.
    Access is restricted to users with user management permissions.`,
  })
  async getUserListsForCompany(
    @Context() context,
    @Args('companyId', {
      description: 'ID of the company to retrieve users for',
    })
    companyId: number,
    @Args('pageNumber', {
      nullable: true,
      description: 'Page number for pagination',
    })
    pageNumber?: number,
    @Args('pageSize', {
      nullable: true,
      description: 'Number of records per page',
    })
    pageSize?: number,
    @Args('search', {
      nullable: true,
      description: 'Optional search string to filter users',
    })
    search?: string,
    @Args('sorting_field', { nullable: true, description: 'Field to sort by' })
    sorting_field?: string,
    @Args('sorting_order', {
      nullable: true,
      description: 'Sort order: ASC or DESC',
    })
    sorting_order?: 'ASC' | 'DESC',
  ) {
    try {
      this.logger.log(
        `Request received for getting user lists for company with id: ${companyId}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        companyId,
      );

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes') ||
          (roles.role === 'STANDARD USER' &&
            roles.manageUser === 'View Only')) &&
        !roles.isSystemAdded
      ) {
        const response = await this.userAccessService.getUserListsForCompany(
          decoded,
          companyId,
          pageNumber,
          pageSize,
          search,
          sorting_field,
          sorting_order,
        );

        this.logger.log(
          `User lists for company obtained with data: ${JSON.stringify(response)}`,
        );
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          response,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while getting user lists for company with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => UserResponse, {
    name: 'getUserByEmailId',
    description: `Retrieves detailed user information by email address for a specific company.
    Also fetches associated profile files if available.
    Accessible only to authorized company administrators.`,
  })
  async getUserByEmailId(
    @Args('emailId', { description: 'Email ID of the user to fetch' })
    emailId: string,
    @Args('companyId', { description: 'Company ID the user belongs to' })
    companyId: number,
  ) {
    try {
      this.logger.log(
        `Request received for getting user details with emailId: ${emailId} and companyId: ${companyId}`,
      );
      const userDetails = await this.userAccessService.getUserByEmail(
        emailId,
        companyId,
      );
      this.logger.log(
        `User details fetched with data: ${JSON.stringify(userDetails)}`,
      );
      if (userDetails && userDetails[0] !== null && userDetails.length > 0) {
        for (const element of userDetails) {
          if (element.file_path) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(element.file_path);
              if (fileBuffer) {
                const image = fileBuffer.toString('base64');
                element.file = `data:${element.file_type};base64,${image}`;
              }
            } catch (fileError) {
              this.logger.error(`Failed to read file from storage: ${fileError.message}`);
            }
            const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
            const normalizedPath = element.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
            element.file_path = baseUrl + '/' + normalizedPath;
          }
        }
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        userDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting user by emailId with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => InvitationListResponse, {
    name: 'getInvitationListsForCompany',
    description: `
    Returns invitation records for a company.
    Supports pagination, filtering, sorting, and search.
    Used to track sent, pending, and declined invitations.`,
  })
  async getInvitationListsForCompany(
    @Context() context,
    @Args('pageNumber', { description: 'Page number for pagination' })
    pageNumber: number,
    @Args('pageSize', { description: 'Number of records per page' })
    pageSize: number,
    @Args('type', { description: 'Type of invitations to fetch' }) type: string,
    @Args('companyId', {
      nullable: true,
      description: 'Optional company ID to filter invitations',
    })
    companyId?: number,
    @Args('search', {
      nullable: true,
      description: 'Optional search term for invitations',
    })
    search?: string,
    @Args('sorting_field', { nullable: true, description: 'Field to sort by' })
    sorting_field?: string,
    @Args('sorting_order', {
      nullable: true,
      description: 'Sort order: ASC or DESC',
    })
    sorting_order?: 'ASC' | 'DESC',
  ) {
    try {
      this.logger.log(
        `Request received for getting invitation lists for type: ${type}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.userAccessService.getInvitationListsForCompany(
          decoded,
          type,
          pageNumber,
          pageSize,
          companyId,
          search,
          sorting_field,
          sorting_order,
          false,
        );
      this.logger.log(
        `Response received after getting invitation lists for company with data: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting invitation lists for company with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'insertCompanyUserRoles',
    description: `
    Adds or invites a user to a company with a defined role.
    Validates role permissions and subscription limits.
    Supports both new user invitations and existing users.
    `,
  })
  async insertCompanyUserRoles(
    @Context() context,
    @Args('createUserAccessInput', {
      description:
        'Input payload containing user details, assigned role, company ID, and flag indicating if the user already exists',
    })
    createUserAccessInput: CreateUserAccessInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for inserting company user roles with input: ${JSON.stringify(createUserAccessInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      createUserAccessInput.created_by = decoded?.userId;
      createUserAccessInput.created_on = moment.tz('UTC');
      createUserAccessInput.created_group = 'USER';
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        createUserAccessInput.company_id,
      );

      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes')) &&
        !roles.isSystemAdded
      ) {
        const getCount = await this.userAccessService.getUserListsForCompany(
          decoded,
          createUserAccessInput.company_id,
          1,
          10,
          null,
          null,
          null,
        );
        this.logger.log(`User count for company: ${JSON.stringify(getCount)}`);

        const subscriptionDetails =
          await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
            createUserAccessInput.company_id,
          );
        const subscriptionItem =
          subscriptionDetails &&
          subscriptionDetails?.plan_items &&
          subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
                (item) => item?.item_name === 'Users',
              )
            : [];

        if (
          !subscriptionDetails?.is_free_plan_eligible && // true  -> false
          (!subscriptionItem ||
            (subscriptionItem &&
              subscriptionItem?.length > 0 &&
              !subscriptionItem[0]?.is_unlimited &&
              (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                  getCount &&
                  getCount?.total_count &&
                  getCount?.pending_invitations !== null &&
                  getCount?.total_count + getCount?.pending_invitations >=
                    subscriptionItem[0]?.limit_value))))
        ) {
          return framedResponse(
            'WARNING',
            `User cannot be added. Please upgrade your subscription plan.`,
          );
        }

        if (createUserAccessInput.is_user_exists) {
          const response = await this.sendRequestToExistingUsers(
            decoded,
            createUserAccessInput,
          );
          this.logger.log(
            `Response received after sending request to existing users with data: ${JSON.stringify(response)}`,
          );
          return framedResponse('SUCCESS', response);
        } else {
          const response = await this.sendRequestToNewUsers(
            decoded,
            createUserAccessInput,
          );
          this.logger.log(
            `Response received after sending request to new users with data: ${JSON.stringify(response)}`,
          );
          return framedResponse('SUCCESS', response);
        }
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while inserting company user roles with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'checkCompanyInviteAndUpdate',
    description: `
    Validates pending company invitations for a user.
    Automatically associates user with company if a valid invitation exists.
    `,
  })
  async checkCompanyInviteAndUpdate(@Context() context): Promise<any> {
    try {
      this.logger.log(
        `Request received for checking company invite and update.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const inviteDetails =
        await this.userAccessService.checkCompanyInviteForUser(
          decoded?.emailId,
        );
      this.logger.log(
        `Response received with invite details: ${JSON.stringify(inviteDetails)}`,
      );
      if (
        inviteDetails &&
        inviteDetails !== null &&
        inviteDetails[0] !== null &&
        inviteDetails.length > 0
      ) {
        const inviteArr = await this.insertCompanyUserRolesIntoDB(
          decoded,
          inviteDetails,
        );
        this.logger.log(
          `Response received with details: ${JSON.stringify(inviteArr)}`,
        );
        if (inviteArr) {
          inviteDetails.forEach((element) => {
            element.user_id = decoded?.userId;
            element.updated_on = moment.tz('UTC');
            element.updated_by = decoded?.userId;
            element.updated_group = 'USER';
          });
          const inviteUpdateResponse =
            await this.userAccessService.updateInvites(inviteDetails);
          this.logger.error(
            `Response received with update invite details: ${JSON.stringify(inviteUpdateResponse)}`,
          );
          return framedResponse('SUCCESS', `Join Request updated.`);
        }
        return framedResponse('ERROR', `No invite found.`);
      }
      return framedResponse('ERROR', `No invite found.`);
    } catch (error) {
      this.logger.error(
        `Errored while checking company invite and update with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updateAcceptOrDecline',
    description: `
    Processes invite acceptance or rejection for company membership.
    Performs access validation and updates company roles accordingly.
    Triggers notification workflows after processing.
    `,
  })
  async updateAcceptOrDecline(
    @Context() context,
    @Args('user_id', {
      description: 'ID of the user accepting or declining the invitation',
    })
    user_id: number,
    @Args('company_id', {
      description: 'ID of the company the invitation belongs to',
    })
    company_id: number,
    @Args('user_email', {
      description: 'Email of the user acting on the invitation',
    })
    user_email: string,
    @Args('user_action', {
      description: 'Action taken by the user: Accept or Decline',
    })
    user_action: string,
    @Args('is_admin', {
      description: 'Indicates if the action is performed by an admin',
    })
    is_admin: Boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for accepting or declining the user access with user_id: ${user_id} and company_id: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        company_id,
      );
      const getInviteDetails = await this.userAccessService.getInviteDetails(
        user_email,
        company_id,
        !is_admin,
      );
      this.logger.log(
        `Response received in getInviteDetails method: ${JSON.stringify(getInviteDetails)}`,
      );
      if (
        getInviteDetails &&
        getInviteDetails !== null &&
        getInviteDetails.user_action === null
      ) {
        if (
          !is_admin ||
          (is_admin &&
            roles &&
            roles.role &&
            (roles.role === 'PRIMARY ADMIN' ||
              roles.role === 'ADMIN' ||
              (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes')) &&
            !roles.isSystemAdded)
        ) {
          if (user_action === 'Accept' && is_admin) {
            const getCount =
              await this.userAccessService.getUserListsForCompany(
                decoded,
                company_id,
                1,
                10,
                null,
                null,
                null,
              );
            this.logger.log(`User count for company: ${JSON.stringify(getCount)}`);

            const subscriptionDetails =
              await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
                company_id,
              );
            const subscriptionItem =
              subscriptionDetails &&
              subscriptionDetails?.plan_items &&
              subscriptionDetails?.plan_items?.length > 0
                ? subscriptionDetails?.plan_items?.filter(
                    (item) => item?.item_name === 'Users',
                  )
                : [];

            if (
              !subscriptionDetails?.is_free_plan_eligible && // true  -> false
              (!subscriptionItem ||
                (subscriptionItem &&
                  subscriptionItem?.length > 0 &&
                  !subscriptionItem[0]?.is_unlimited &&
                  (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                    (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                      getCount &&
                      getCount?.total_count &&
                      getCount?.pending_invitations !== null &&
                      getCount?.total_count + getCount?.pending_invitations >=
                        subscriptionItem[0]?.limit_value))))
            ) {
              return framedResponse(
                'WARNING',
                `User cannot be added. Please upgrade your subscription plan.`,
              );
            }
          }
          const oldDeclineCount = getInviteDetails.decline_count
            ? Number(getInviteDetails.decline_count)
            : 0;
          const declineCount =
            user_action !== 'Accept' ? oldDeclineCount + 1 : oldDeclineCount;
          const updateAcceptOrDeclineRes =
            await this.userAccessService.updateAcceptOrDecline(
              decoded,
              user_email,
              company_id,
              user_action,
              !is_admin,
              declineCount,
            );
          this.logger.log(
            `Response received in updateAcceptOrDecline method: ${JSON.stringify(updateAcceptOrDeclineRes)}`,
          );
          if (updateAcceptOrDeclineRes) {
            const updateCompanyUserRoleRes =
              await this.userAccessService.updateCompanyUserRole(
                decoded,
                user_id,
                company_id,
                user_action,
              );
            this.logger.log(
              `Response received in updateCompanyUserRole method: ${JSON.stringify(updateCompanyUserRoleRes)}`,
            );
            if (updateCompanyUserRoleRes && user_action === 'Accept') {
              const updateUserRoleRes =
                await this.userAccessService.updateUserRole(
                  decoded,
                  user_email,
                );
              this.logger.log(
                `Response received in updateUserRole method: ${JSON.stringify(updateUserRoleRes)}`,
              );
            }
            const response = is_admin
              ? await this.sendAdminAcceptDeclineMail(
                  decoded,
                  user_id,
                  user_email,
                  company_id,
                  user_action,
                )
              : await this.sendUserAcceptDeclineMail(
                  decoded,
                  company_id,
                  user_action,
                );
            this.logger.log(
              `Response received with data: ${JSON.stringify(response)}`,
            );
            return framedResponse('SUCCESS', response);
          }
          return framedResponse('ERROR', `Failed to update join request.`);
        }
        return framedResponse('ERROR', `Unauthorized to perform this action`);
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while accepting or declining the user access with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'requestToJoinCompany',
    description: `
    Allows a user to request access to a company's account.
    Prevents excessive retry attempts.
    Sends join request notification to administrators.
    `,
  })
  async requestToJoinCompany(
    @Context() context,
    @Args('createUserAccessInput', {
      description:
        'Input payload containing user details and company information to request joining a company',
    })
    createUserAccessInput: CreateJoinUserAccessInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for requesting to join company: ${JSON.stringify(createUserAccessInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      createUserAccessInput.created_by = decoded?.userId;
      createUserAccessInput.created_on = moment.tz('UTC');
      createUserAccessInput.created_group = 'USER';
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        createUserAccessInput.company_id,
      );
      if (
        !roles ||
        !roles.status ||
        (roles.status && roles.status !== 'Active')
      ) {
        const getInviteDetails = await this.userAccessService.getInviteDetails(
          createUserAccessInput.email_id,
          createUserAccessInput.company_id,
          false,
        );
        this.logger.log(`getInviteDetails: ${JSON.stringify(getInviteDetails)}`);
        if (
          getInviteDetails &&
          getInviteDetails.decline_count !== null &&
          getInviteDetails.decline_count >= 3
        ) {
          return framedResponse(
            'ERROR',
            `Your request has been declined thrice. Please contact the business administrator to join their business.`,
          );
        } else if (
          getInviteDetails &&
          getInviteDetails.requested_count !== null &&
          getInviteDetails.requested_count >= 3
        ) {
          return framedResponse(
            'ERROR',
            `Please contact the business administrator to join their business.`,
          );
        } else {
          var roleResponse;
          if (getInviteDetails && getInviteDetails !== null) {
            roleResponse = await this.userAccessService.updateCompanyUserRoles(
              decoded,
              createUserAccessInput,
            );
          } else {
            roleResponse = await this.userAccessService.insertCompanyUserRoles(
              createUserAccessInput,
            );
          }
          this.logger.log(`roleResponse: ${JSON.stringify(roleResponse)}`);
          const existingAdminDetails =
            await this.userAccessService.getExistingAdmin(
              createUserAccessInput.company_id,
            );
          this.logger.log(`existingAdminDetails: ${JSON.stringify(existingAdminDetails)}`);
          if (roleResponse) {
            var response;
            if (getInviteDetails) {
              const requestedCount = getInviteDetails.requested_count
                ? Number(getInviteDetails.requested_count) + 1
                : 1;
              this.logger.log(`requestedCount: ${requestedCount}`);
              getInviteDetails.requested_count = requestedCount;
              getInviteDetails.user_action = null;
              response = await this.userAccessService.updateInvitation(
                getInviteDetails,
                createUserAccessInput,
              );
            } else {
              const createInvitationInput = {
                company_id: createUserAccessInput.company_id,
                user_id: createUserAccessInput.user_id,
                user_name: await startCasePreserveUnicode(
                  createUserAccessInput.user_name,
                ),
                email_id: createUserAccessInput.email_id,
                company_role: null,
                is_user_exists: createUserAccessInput.is_user_exists,
                is_admin_requested: false,
                requested_count: 1,
                requested_by: decoded?.emailId,
                created_by: createUserAccessInput.created_by,
                created_on: createUserAccessInput.created_on,
              };
              response = await this.userAccessService.insertInvitation(
                createInvitationInput,
              );
            }
            this.logger.log(
              `Response received after creating the invitation with data: ${JSON.stringify(response)}`,
            );

            const mailTemplate =
              await this.ptContentService.getMailTemplateByMailType(
                'user-joined',
              );

            const mailDynamicData = {
              ...decoded,
              ...createUserAccessInput,
              ...existingAdminDetails.userDetails,
              ...existingAdminDetails.companyDetails,
              companyName: existingAdminDetails.companyDetails.company_name,
              adminName:
                existingAdminDetails.userDetails.first_name +
                ' ' +
                existingAdminDetails.userDetails.last_name,
              companyId: existingAdminDetails.companyDetails.company_id,
            };

            if (response) {
              const Keys = mailTemplate.selected_dynamic;
              const dynamicData: { [key: string]: any } = {};
              Keys.forEach((key) => {
                dynamicData[key] = mailDynamicData[key];
              });

              const mailbody = await this.replaceVariables(
                mailTemplate.email_content,
                dynamicData,
              );

              const mailDetails = {
                toEmail: existingAdminDetails.userDetails.email_id,
                subject: mailTemplate.email_subject,
                template: 'header-footer-email',
                mailBody: mailbody,
                mail_type: EmailTypeEnum.UserJoined,
              };

              this.emailQueueProducer.emailQueueProducer(mailDetails);
              // this.emailServices.sendMail(mailDetails);
              this.logger.log(
                `Email sent successfully with details: ${mailDetails}`,
              );

              //Generating company link.
              const companyLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[2]}` +
                `${createUserAccessInput.company_id}` +
                `?from=log`;
              this.logger.log(`companyLink: ${companyLink}`);

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 16,
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
                company_id:
                  await this.activityLogService.getSystemAddedCompanyId(
                    decoded?.userId,
                  ),
                dynamic_values: {
                  companyName: existingAdminDetails.companyDetails.company_name,
                  companyLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
              return framedResponse(
                'SUCCESS',
                String(response.requested_count),
              );
            }
            return framedResponse(
              'ERROR',
              `Failed to send join request, please try again.`,
            );
          }
          return framedResponse(
            'ERROR',
            `Failed to send join request, please try again.`,
          );
        }
      }
      return framedResponse('ERROR', `You have already joined this business.`);
    } catch (error) {
      this.logger.error(
        `Errored while requesting to join company with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updatePrimaryAdmin',
    description: `
    Transfers Primary Admin role to another user within the company.
    Ensures only authorized admin can perform the transfer.
    Sends email notification after update.
    `,
  })
  async updatePrimaryAdmin(
    @Context() context,
    @Args('user_id', {
      description: 'ID of the user to assign as Primary Admin',
    })
    user_id: number,
    @Args('company_id', {
      description:
        'ID of the company where the Primary Admin role is being transferred',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received while updating primary admin with user_id: ${user_id} and company_id: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        company_id,
      );
      if (
        roles &&
        roles.role &&
        roles.role === 'PRIMARY ADMIN' &&
        !roles.isSystemAdded
      ) {
        const user = await this.userAccessService.getUserById(
          user_id,
          company_id,
        );

        if (user) {
          const existingAdminDetails =
            await this.userAccessService.getExistingAdmin(company_id);
          const updatePrimaryAdminRes =
            await this.userAccessService.updatePrimaryAdmin(
              user,
              decoded?.userId,
            );
          if (updatePrimaryAdminRes) {
            if (existingAdminDetails) {
              const updateAdminRes = await this.userAccessService.updateAdmin(
                existingAdminDetails,
                decoded?.userId,
              );
              this.logger.log(
                `Response received after updating admin with data: ${JSON.stringify(updateAdminRes)}`,
              );
            }

            const userDetails =
              await this.userAccessService.getUserDetails(user_id);
            const companyDetails =
              await this.userAccessService.getCompanyDetails(company_id);

            const mailTemplate =
              await this.ptContentService.getMailTemplateByMailType(
                'make-primary-admin',
              );

            const mailDynamicData = {
              ...userDetails,
              ...companyDetails,
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

            const mailDetails = {
              toEmail: userDetails.email_id,
              subject: mailTemplate.email_subject,
              template: 'header-footer-email',
              mailBody: mailbody,
              mail_type: EmailTypeEnum.makePrimaryAdmin,
            };
            this.emailQueueProducer.emailQueueProducer(mailDetails);
            // this.emailServices.sendMail(mailDetails);

            //Generating company link.
            const companyLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[2]}` +
              `${companyDetails.company_id}` +
              `?from=log`;
            this.logger.log(`companyLink: ${companyLink}`);

            //Generating user link.
            const userLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[1]}` +
              `?from=log`;
            this.logger.log(`userLink: ${userLink}`);

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 26,
              // to_user: userDetails.user_id,
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
              company_id: company_id,
              dynamic_values: {
                userName: userDetails.first_name + ' ' + userDetails.last_name,
                userLink,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
            this.logger.log(
              `Email sent successfully with details: ${mailDetails}`,
            );
            return framedResponse('SUCCESS', `Primary Admin has been updated.`);
          }
          return framedResponse(
            'ERROR',
            `Failed to update Primary Admin, please try again`,
          );
        }
        return framedResponse(
          'ERROR',
          `Failed to update Primary Admin, please try again`,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while updating primary admin with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'deleteUserFromCompany',
    description: `
    Removes an active user from the company account.
    Prevents deletion of the Primary Admin.
    Sends activity audit logs and notification.
    `,
  })
  async deleteUserFromCompany(
    @Context() context,
    @Args('user_id', {
      description: 'ID of the user to delete from the company',
    })
    user_id: number,
    @Args('company_id', {
      description: 'ID of the company from which the user will be removed',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received after deleting the user from company with user_id: ${user_id} and company_id: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        company_id,
      );
      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' &&
            roles.manageUser === 'Yes' &&
            !roles.isSystemAdded))
      ) {
        const userDetails = await this.userAccessService.getUserById(
          user_id,
          company_id,
        );
        if (userDetails) {
          const existingAdminDetails =
            await this.userAccessService.getExistingAdmin(company_id);
          this.logger.log(
            `Response received after getting existing admin with data: ${JSON.stringify(existingAdminDetails)}`,
          );
          if (userDetails.user_id !== existingAdminDetails.user_id) {
            const deleteUserFromCompanyRes =
              await this.userAccessService.deleteUserFromCompany(
                userDetails,
                decoded?.userId,
              );
            this.logger.log(
              `Response received after deleting user from company with data: ${JSON.stringify(deleteUserFromCompanyRes)}`,
            );
            if (deleteUserFromCompanyRes) {
              //Generating company link.
              const companyLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[2]}` +
                `${company_id}` +
                `?from=log`;
              this.logger.log(`companyLink: ${companyLink}`);

              //Generating user link.
              const userLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[1]}` +
                `?from=log`;
              this.logger.log(`userLink: ${userLink}`);

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 28,
                // to_user: userDetails.user_id,
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
                company_id: company_id,
                dynamic_values: {
                  userName:
                    userDetails.userDetails.first_name +
                    ' ' +
                    userDetails.userDetails.last_name,
                  userLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
              return framedResponse('SUCCESS', `User has been deleted.`);
            }
            return framedResponse(
              'ERROR',
              `Failed to delete the user, please try again`,
            );
          }
          return framedResponse('ERROR', `Unauthorized to perform this action`);
        }
        return framedResponse(
          'ERROR',
          `Failed to delete the user, please try again`,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while deleting the user from company with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'editUserFromCompany',
    description: `
    Updates assigned roles and permissions for an existing company user.
    Restricted to administrators.
    Triggers audit logging and notification workflows.
    `,
  })
  async editUserFromCompany(
    @Context() context,
    @Args('updateUserAccessInput', {
      description:
        'Input payload containing user ID, company ID, and role updates for editing an existing user',
    })
    updateUserAccessInput: UpdateUserAccessInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing user from company with input: ${JSON.stringify(updateUserAccessInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      updateUserAccessInput.updated_by = decoded?.userId;
      updateUserAccessInput.updated_on = moment.tz('UTC');
      updateUserAccessInput.updated_group = 'USER';
      const roles = await this.userAccessService.getCompanySpecificRole(
        decoded,
        updateUserAccessInput.company_id,
      );
      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes')) &&
        !roles.isSystemAdded
      ) {
        const userDetails = await this.userAccessService.getUserById(
          updateUserAccessInput.user_id,
          updateUserAccessInput.company_id,
        );
        if (userDetails) {
          const existingAdminDetails =
            await this.userAccessService.getExistingAdmin(
              updateUserAccessInput.company_id,
            );
          this.logger.log(
            `Response received after getting existing admin details: ${JSON.stringify(existingAdminDetails)}`,
          );
          if (userDetails.user_id !== existingAdminDetails.user_id) {
            const editUserFromCompanyRes =
              await this.userAccessService.editUserFromCompany(
                updateUserAccessInput,
                decoded?.userId,
              );
            this.logger.log(
              `Response received after editing user from company: ${JSON.stringify(editUserFromCompanyRes)}`,
            );
            if (editUserFromCompanyRes) {
              //Generating company link.
              const companyLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[2]}` +
                `${updateUserAccessInput.company_id}` +
                `?from=log`;
              this.logger.log(`companyLink: ${companyLink}`);

              //Generating user link.
              const userLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[1]}` +
                `?from=log`;
              this.logger.log(`userLink: ${userLink}`);

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 27,
                // to_user: userDetails.user_id,
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
                company_id: updateUserAccessInput.company_id,
                dynamic_values: {
                  userName:
                    userDetails.userDetails.first_name +
                    ' ' +
                    userDetails.userDetails.last_name,
                  userLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
              return framedResponse('SUCCESS', `User has been updated.`);
            }
            return framedResponse(
              'ERROR',
              `Failed to edit the user, please try again`,
            );
          }
          return framedResponse('ERROR', `Unauthorized to perform this action`);
        }
        return framedResponse(
          'ERROR',
          `Failed to edit the user, please try again`,
        );
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored while editing user from company with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  private sendRequestToExistingUsers(
    decoded,
    createUserAccessInput,
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const getInviteDetails = await this.userAccessService.getInviteDetails(
          createUserAccessInput.email_id,
          createUserAccessInput.company_id,
          true,
        );
        this.logger.log(`getInviteDetails: ${JSON.stringify(getInviteDetails)}`);
        if (
          getInviteDetails &&
          getInviteDetails.decline_count !== null &&
          getInviteDetails.decline_count >= 3
        ) {
          this.logger.log(`getInviteDetails.decline_count: ${getInviteDetails.decline_count}`);
          reject(
            `User has declined your request thrice. Please contact the Paytrade administrator for further assistance.`,
          );
        } else if (
          getInviteDetails &&
          getInviteDetails.requested_count !== null &&
          getInviteDetails.requested_count >= 3
        ) {
          this.logger.log(`getInviteDetails.requested_count: ${getInviteDetails.requested_count}`);
          reject(
            `Please contact the Paytrade administrator for further assistance.`,
          );
        } else {
          this.logger.log(`Processing invite details`);
          var roleResponse;
          if (getInviteDetails && getInviteDetails !== null) {
            roleResponse = await this.userAccessService.updateCompanyUserRoles(
              decoded,
              createUserAccessInput,
            );
          } else {
            roleResponse = await this.userAccessService.insertCompanyUserRoles(
              createUserAccessInput,
            );
          }
          this.logger.log(
            `Response received in insertCompanyUserRoles method: ${JSON.stringify(roleResponse)}`,
          );
          if (roleResponse) {
            var response;
            if (getInviteDetails) {
              const requestedCount = getInviteDetails.requested_count
                ? Number(getInviteDetails.requested_count) + 1
                : 1;
              this.logger.log(`requestedCount: ${requestedCount}`);
              getInviteDetails.requested_count = requestedCount;
              getInviteDetails.user_action = null;
              response = await this.userAccessService.updateInvitation(
                getInviteDetails,
                createUserAccessInput,
              );
            } else {
              const createInvitationInput = {
                company_id: createUserAccessInput.company_id,
                user_id: createUserAccessInput.user_id,
                user_name: await startCasePreserveUnicode(
                  createUserAccessInput.user_name,
                ),
                email_id: createUserAccessInput.email_id,
                company_role: null,
                is_user_exists: createUserAccessInput.is_user_exists,
                is_admin_requested: true,
                requested_count: 1,
                requested_by: decoded?.emailId,
                created_by: createUserAccessInput.created_by,
                created_on: createUserAccessInput.created_on,
              };
              response = await this.userAccessService.insertInvitation(
                createInvitationInput,
              );
            }
            this.logger.log(
              `Response received from insertInvitation with data: ${JSON.stringify(response)}`,
            );
            if (response) {
              const companyDetails =
                await this.userAccessService.getCompanyDetails(
                  createUserAccessInput.company_id,
                );
              const mailTemplate =
                await this.ptContentService.getMailTemplateByMailType(
                  'invite-user-to-company',
                );

              const mailDynamicData = {
                ...companyDetails,
                ...decoded,
                ...createUserAccessInput,
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

              const mailDetails = {
                toEmail: createUserAccessInput.email_id,
                subject: mailTemplate.email_subject,
                template: 'header-footer-email',
                mailBody: mailbody,
                mail_type: EmailTypeEnum.inviteExistUserToCmpy,
              };
              this.emailQueueProducer.emailQueueProducer(mailDetails);
              // this.emailServices.sendMail(mailDetails);
              this.logger.log('Email sent successfully');

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 17,
                // to_user: createUserAccessInput.user_id,
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
                company_id: createUserAccessInput.company_id,
                dynamic_values: {
                  userName: createUserAccessInput.user_name,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
              resolve(String(response.requested_count));
            }
            reject(`Failed to send join request, please try again.`);
          }
          reject(`Failed to send join request, please try again.`);
        }
      } catch (error) {
        this.logger.error(
          `Errored inside the client with message: ${error.message}`,
        );
        reject(error.message);
      }
    });
  }

  private sendRequestToNewUsers(decoded, createUserAccessInput): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const getInviteDetails = await this.userAccessService.getInviteDetails(
          createUserAccessInput.email_id,
          createUserAccessInput.company_id,
          true,
        );
        this.logger.log(`getInviteDetails: ${JSON.stringify(getInviteDetails)}`);
        if (
          getInviteDetails &&
          getInviteDetails.decline_count !== null &&
          getInviteDetails.decline_count >= 3
        ) {
          reject(
            'User has declined your request thrice. Please contact the Paytrade administrator for further assistance.',
          );
        } else if (
          getInviteDetails &&
          getInviteDetails.requested_count !== null &&
          getInviteDetails.requested_count >= 3
        ) {
          reject(
            'Please contact the Paytrade administrator for further assistance.',
          );
        } else {
          var response;
          if (getInviteDetails) {
            const requestedCount = getInviteDetails.requested_count
              ? Number(getInviteDetails.requested_count) + 1
              : 1;
            this.logger.log(`requestedCount: ${requestedCount}`);
            getInviteDetails.requested_count = requestedCount;
            getInviteDetails.user_action = null;
            response = await this.userAccessService.updateInvitation(
              getInviteDetails,
              createUserAccessInput,
            );
          } else {
            const createInvitationInput = {
              company_id: createUserAccessInput.company_id,
              user_name: await startCasePreserveUnicode(
                createUserAccessInput.user_name,
              ),
              email_id: createUserAccessInput.email_id,
              company_role: createUserAccessInput.company_role,
              manage_project_trust_payment:
                createUserAccessInput.manage_project_trust_payment,
              manage_user: createUserAccessInput.manage_user,
              manage_company: createUserAccessInput.manage_company,
              manage_subscription: createUserAccessInput.manage_subscription,
              is_user_exists: createUserAccessInput.is_user_exists,
              is_admin_requested: true,
              requested_count: 1,
              requested_by: decoded?.emailId,
              created_by: createUserAccessInput.created_by,
              created_on: createUserAccessInput.created_on,
            };
            response = await this.userAccessService.insertInvitation(
              createInvitationInput,
            );
          }
          this.logger.log(
            `Response received from insertInvitation with data: ${JSON.stringify(response)}`,
          );
          if (response) {
            const companyDetails =
              await this.userAccessService.getCompanyDetails(
                createUserAccessInput.company_id,
              );
            const detailsToMail = {
              ...decoded,
              ...companyDetails,
              ...createUserAccessInput,
            };

            const mailTemplate =
              await this.ptContentService.getMailTemplateByMailType(
                'new-user-invite',
              );
            const Keys = mailTemplate.selected_dynamic;
            const dynamicData: { [key: string]: any } = {};
            Keys.forEach((key) => {
              dynamicData[key] = detailsToMail[key];
            });

            const mailbody = await this.replaceVariables(
              mailTemplate.email_content,
              dynamicData,
            );

            var mailDetails = {
              toEmail: createUserAccessInput.email_id,
              subject: mailTemplate.email_subject,
              template: 'header-footer-email',
              mailBody: mailbody,
              mail_type: EmailTypeEnum.newUserInvite,
            };

            this.emailQueueProducer.emailQueueProducer(mailDetails);
            // this.emailServices.sendMail(mailDetails);
            this.logger.log('Email sent successfully');

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 17,
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
              dynamic_values: {
                userName: createUserAccessInput.user_name,
              },
              company_id: createUserAccessInput.company_id,
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
            resolve(String(response.requested_count));
          }
          reject(`Failed to send join request, please try again.`);
        }
      } catch (error) {
        this.logger.error(
          `Errored while sending request to new users with message: ${error.message}`,
        );
        reject(error.message);
      }
    });
  }

  private sendUserAcceptDeclineMail(
    decoded,
    company_id,
    user_action,
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const companyDetails =
          await this.userAccessService.getCompanyDetails(company_id);
        const getRequestedByRes = await this.userAccessService.getInviteDetails(
          decoded?.emailId,
          company_id,
          true,
        );
        const userAction = user_action === 'Accept' ? 'accepted' : 'declined';
        const subject =
          user_action === 'Accept'
            ? 'User Acceptance Mail'
            : 'User Declined Mail';

        const detailsToMail = {
          ...decoded,
          ...getRequestedByRes,
          ...companyDetails,
          userAction: userAction,
          company: companyDetails.company_name,
        };

        const mailTemplate =
          await this.ptContentService.getMailTemplateByMailType(
            'user-accept-decline',
          );
        const Keys = mailTemplate.selected_dynamic;
        const dynamicData: { [key: string]: any } = {};
        Keys.forEach((key) => {
          dynamicData[key] = detailsToMail[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        var mailDetails = {
          toEmail: getRequestedByRes.requested_by,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.UserAcceptDecline,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);

        //Generating company link.
        const companyLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[2]}` +
          `${companyDetails.company_id}` +
          `?from=log`;
        this.logger.log(`companyLink: ${companyLink}`);

        //Generating user link.
        const userLink =
          `${process.env.LOG_BASE_URL}` + `${linkExtensions[1]}` + `?from=log`;
        this.logger.log(`userLink: ${userLink}`);

        const requestor = await this.userAccessService.getUserDetailsByEmailId(
          getRequestedByRes.requested_by,
        );
        const createActivityLogInput = {
          dynamic_values: {
            userName: decoded?.userName,
            userLink,
            companyName: companyDetails.company_name,
            companyLink,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        let createActivityLogInput1: CreateActivityLogInput =
          createActivityLogInput;
        let createActivityLogInput2: CreateActivityLogInput =
          createActivityLogInput;
        if (user_action === 'Accept') {
          createActivityLogInput1 = {
            ...createActivityLogInput1,
            company_id: await this.activityLogService.getSystemAddedCompanyId(
              decoded?.userId,
            ),
            event_template_id: 18,
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
          };
          createActivityLogInput2 = {
            ...createActivityLogInput1,
            company_id: company_id,
            event_template_id: 19,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? requestor?.user_id
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : requestor?.user_id,
          };
        } else {
          createActivityLogInput1 = {
            ...createActivityLogInput1,
            company_id: await this.activityLogService.getSystemAddedCompanyId(
              decoded?.userId,
            ),
            event_template_id: 20,
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
          };
          createActivityLogInput2 = {
            ...createActivityLogInput1,
            company_id: company_id,
            event_template_id: 21,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? requestor?.user_id
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : requestor?.user_id,
          };
        }

        await this.activityLogService.insertActivityLog(
          createActivityLogInput1,
        );
        await this.activityLogService.insertActivityLog(
          createActivityLogInput2,
        );
        this.logger.log(`Email sent successfully with details: ${mailDetails}`);
        resolve(`You have ${userAction} this invite.`);
      } catch (error) {
        this.logger.error(
          `Errored while sending user to accept or decline mail with message: ${error.message}`,
        );
        reject(error.message);
      }
    });
  }

  private sendAdminAcceptDeclineMail(
    decoded,
    user_id,
    user_email,
    company_id,
    user_action,
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const userDetails =
          await this.userAccessService.getUserDetails(user_id);
        const companyDetails =
          await this.userAccessService.getCompanyDetails(company_id);
        const getRequestedByRes = await this.userAccessService.getInviteDetails(
          user_email,
          company_id,
          false,
        );
        this.logger.log(`getRequestedByRes: ${JSON.stringify(getRequestedByRes)}`);
        const userAction = user_action === 'Accept' ? 'accepted' : 'declined';
        const subject =
          user_action === 'Accept'
            ? `Pay Trade - ${companyDetails.company_name} has accepted your request`
            : `Pay Trade - ${companyDetails.company_name} has rejected your request`;
        const message =
          user_action === 'Accept'
            ? 'You will now be able to view this business on login.'
            : ' ';
        const detailsToMail = {
          ...decoded,
          ...getRequestedByRes,
          ...companyDetails,
          ...userDetails,
          company: companyDetails.company_name,
          userAction: userAction,
          message: message,
        };

        const mailTemplate =
          await this.ptContentService.getMailTemplateByMailType(
            'admin-accept-decline',
          );
        const Keys = mailTemplate.selected_dynamic;
        const dynamicData: { [key: string]: any } = {};
        Keys.forEach((key) => {
          dynamicData[key] = detailsToMail[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        var mailDetails = {
          toEmail: user_email,
          subject: subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.AdminAcceptDecline,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);

        //Generating company link.
        const companyLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[2]}` +
          `${companyDetails.company_id}` +
          `?from=log`;
        this.logger.log(`companyLink: ${companyLink}`);

        //Generating user link.
        const userLink =
          `${process.env.LOG_BASE_URL}` + `${linkExtensions[1]}` + `?from=log`;
        this.logger.log(`userLink: ${userLink}`);

        const requestor = await this.userAccessService.getUserDetailsByEmailId(
          getRequestedByRes.requested_by,
        );

        const createActivityLogInput = {
          dynamic_values: {
            userName: userDetails.first_name + ' ' + userDetails.last_name,
            userLink,
            companyName: companyDetails.company_name,
            companyLink,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        let createActivityLogInput1: CreateActivityLogInput =
          createActivityLogInput;
        let createActivityLogInput2: CreateActivityLogInput =
          createActivityLogInput;
        if (user_action === 'Accept') {
          createActivityLogInput1 = {
            ...createActivityLogInput1,
            company_id:
              await this.activityLogService.getSystemAddedCompanyId(user_id),
            event_template_id: 22,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? user_id
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : user_id,
          };
          createActivityLogInput2 = {
            ...createActivityLogInput1,
            company_id: company_id,
            event_template_id: 23,
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
          };
        } else {
          createActivityLogInput1 = {
            ...createActivityLogInput1,
            company_id: company_id,
            event_template_id: 24,
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
          };
          createActivityLogInput2 = {
            ...createActivityLogInput1,
            company_id:
              await this.activityLogService.getSystemAddedCompanyId(user_id),
            event_template_id: 25,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? user_id
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : user_id,
          };
        }

        await this.activityLogService.insertActivityLog(
          createActivityLogInput1,
        );
        await this.activityLogService.insertActivityLog(
          createActivityLogInput2,
        );
        this.logger.log(`Email sent successfully with details: ${mailDetails}`);
        resolve(`You have ${userAction} this invite.`);
      } catch (error) {
        this.logger.error(
          `Errored while sending admin the accept or decline mail with message: ${error.message}`,
        );
        reject(error.message);
      }
    });
  }

  private insertCompanyUserRolesIntoDB(decoded, inviteDetails): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        var inviteArr = [];
        inviteDetails.forEach(async (element) => {
          const createUserAccessInput = {
            user_name: element.user_name,
            user_id: decoded?.userId,
            company_id: element.company_id,
            company_role: element.company_role,
            manage_user: element.manage_user,
            manage_subscription: element.manage_subscription,
            manage_project_trust_payment: element.manage_project_trust_payment,
            manage_company: element.manage_company,
            created_on: moment.tz('UTC'),
            created_by: decoded?.userId,
            created_group: 'USER',
            email_id: element.email_id,
          };
          const roleResponse =
            await this.userAccessService.insertCompanyUserRoles(
              createUserAccessInput,
            );
          this.logger.log(
            `Response received from insertCompanyUserRoles with data: ${JSON.stringify(roleResponse)}`,
          );
          if (roleResponse) {
            inviteArr.push(roleResponse);
          } else {
            resolve(`Failed to send join request, please try again.`);
          }
        });
        resolve(inviteArr);
      } catch (error) {
        this.logger.error(
          `Errored while inserting company user roles into DB with message: ${error.message}`,
        );
        reject(error.message);
      }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => SwitchUserModeResponse, {
    name: 'switchModeOfAnUser',
    description: `
    Switches the mode of a specified user.
    Logs the activity and records who initiated the change.
    Applicable for Normal and Admin user modes.
    `,
  })
  async switchModeOfAnUser(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing user ID, company ID, and target mode to switch a user’s mode',
    })
    payload: SwitchModeOfAnUserInput,
  ) {
    try {
      this.logger.log(
        `Request received for switching the mode of an user with data: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const result = await this.userAccessService.switchModeOfAnUser(payload);

      const eventTemplateId = payload?.user_mode === 'Normal' ? 30 : 29;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: eventTemplateId,
        // to_user: userDetails.user_id,
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
        company_id: payload.company_id,
        is_admin: false,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      this.logger.log(`Mode of an user switched successfully.`);

      return result;
    } catch (error) {
      this.logger.error(
        `Errored while switching mode of an user with message: ${error}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchModeOfAnUserResponse, {
    name: 'fetchModeOfAnUser',
    description: `
    Fetches the current mode of a specified user.
    Useful for checking if a user is in Normal or Admin mode.
    `,
  })
  async fetchModeOfAnUser(
    @Args('payload', {
      description:
        'Input containing user ID and company ID to fetch the current user mode',
    })
    payload: FetchModeOfAnUserInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the mode of an user with data: ${JSON.stringify(payload)}`,
      );

      const result = await this.userAccessService.fetchModeOfAnUser(payload);
      this.logger.log(`Mode of an user fetched successfully.`);

      return result;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the mode of an user with message: ${error}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      try {
        let result = template;
        if (Object.keys(result).length !== 0) {
          for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }
        }
        this.logger.log(
          `Response received with result: ${JSON.stringify(result)}`,
        );
        resolve(result);
      } catch (error) {
        this.logger.error(
          `Errored while replacing variables with message: ${error.message}`,
        );
      }
    });
  }
}
