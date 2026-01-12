import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { SignupService } from './signup.service';
import { SignupResponse } from './response/signup.response';
import { CreateSignupInput } from './dto/create-signup.input';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { AuthResponse, StringResponse } from './response/auth.response';
import { EmailService } from 'src/libs/@email-services/email.service';
import { CreateCompanySignupInput } from './dto/create-company-signup.input';
import {
  CompanyDetailsResponse,
  CompanySignupResponse,
} from './response/company-signup.response';
import { CreateEmailVerificationInput } from './dto/create-email-verification-input';
import { CheckUserExistenceResponse } from './response/check-user-existence.response';
import { CheckCompanyExistenceResponse } from './response/check-company-existence.response';
import { CompanyWithLogoResponse } from './response/company-with-logo.response';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { UpdateSignupInput } from './dto/update-signup.input';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { UpdateCompanySignupInput } from './dto/update-company-signup.input';
import { handleError } from 'src/api/common/error-handler';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { JwtService } from '@nestjs/jwt';
import { GetUserEmailPreferenceResponse } from './response/get-user-email-preferences.response';
import { CompanyEmailPreferences } from 'src/entities/company-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
var bcrypt = require('bcryptjs');
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
const axios = require('axios');
// const passwordRegex =
//   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~`!@#$%^&*()\-_=+{}[\]|\\;:'",<.>/?])[A-Za-z\d~`!@#$%^&*()\-_=+{}[\]|\\;:'",<.>/?]{8,}$/;

var errorMessage = '';

@Resolver()
export class SignupResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtInternalService: JwtInternalService,
    private readonly signupService: SignupService,
    private authService: AuthService,
    private readonly activityLogService: ActivityLogService,
    private readonly ptContentService: PtContentsService,
    // private emailQueueProducer: EmailQueueProducer,
    private emailQueueProducer: EmailQueueProducer,
    private emailServices: EmailService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('SIGNUP_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @Public()
  @Query((returns) => CheckUserExistenceResponse, {
    name: 'checkUserExistence',
    description: `Checks whether a user exists for the given email address.`,
  })
  async checkUserExistence(
    @Args('email_id', {
      description: 'Email address of the user to check existence for',
    })
    email_id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received while checking the user existence with emailId: ${email_id}`,
      );
      const userDetails = await this.signupService.getUserByEmail(email_id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(userDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        userDetails,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
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
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
  )
  @Query(() => CheckCompanyExistenceResponse, {
    name: 'checkCompanyExistence',
    description: `Verifies whether a company exists for the provided keyword.`,
  })
  async checkCompanyExistence(
    @Args('company_keyword', {
      description: 'Keyword to search for company names',
    })
    company_keyword: string,
    @Args('match_full', {
      description: 'Optional flag to match full company name',
      nullable: true,
    })
    match_full?: boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_keyword:: ${company_keyword}`,
      );
      const companyDetails = await this.signupService.checkCompanyExistence(
        company_keyword,
        match_full,
      );
      this.logger.log(
        `Response recieved while calling the checkCompanyExistence method: ${JSON.stringify(companyDetails)}`,
      );
      if (
        companyDetails &&
        companyDetails[0] !== null &&
        companyDetails.length > 0
      ) {
        for (const element of companyDetails) {
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
            element.file_path =
              process.env.UPLOAD_BASE_URL +
              element.file_path.replace(/\\/g, '/');
          }
        }
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        companyDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => CheckCompanyExistenceResponse, {
    name: 'checkQbccExistence',
    description: `Verifies whether a company exists for the provided QBCC number.`,
  })
  async checkQbccExistence(
    @Args('qbcc_number', {
      description: 'QBCC number of the company to verify existence',
    })
    qbcc_number: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: qbcc_number:: ${qbcc_number}`,
      );
      const companyDetails =
        await this.signupService.checkQbccExistence(qbcc_number);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(companyDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        companyDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => StringResponse, {
    name: 'checkCompanyEmailExistence',
    description: `Checks if a business email address is already registered in the system.`,
  })
  async checkCompanyEmailExistence(
    @Args('company_email', {
      description: 'Business email address to check for existence',
    })
    company_email: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_email:: ${company_email}`,
      );
      var response = '';
      const emailDetails =
        await this.signupService.checkCompanyEmailExistence(company_email);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(emailDetails)}`,
      );
      if (emailDetails.company_email_id) {
        response = 'Business email already exists';
      } else {
        response = 'Business email not exists';
      }
      this.logger.log(
        `Response recieved while leaving the client: ${response}`,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Mutation(() => StringResponse, {
    name: 'insertEmailVerificationDetails',
    description: `Sends or resends a verification email with a one-time password (OTP) to validate user or company email ownership.`,
  })
  async insertEmailVerificationDetails(
    @Args('createEmailVerificationInput', {
      description:
        'Input payload containing email, type, mail_type, and optional reCAPTCHA token for verification',
    })
    createEmailVerificationInput: CreateEmailVerificationInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createEmailVerificationInput)}`,
      );
      console.log(JSON.stringify(createEmailVerificationInput));
      var isRecaptchaVerified = true,
        errMsg = '';
      if (
        createEmailVerificationInput.mail_type == 'Verify_User' &&
        createEmailVerificationInput.type == 'Send'
      ) {
        const recaptchaResponse = await axios.post(
          `${process.env.RECAPTCHA_URI}${process.env.RECAPTCHA_SECRET_KEY}&response=${createEmailVerificationInput.recaptcha_token}`,
        );
        if (recaptchaResponse.data.success) {
          isRecaptchaVerified = true;
        } else {
          errMsg = recaptchaResponse.data['error-codes'];
          isRecaptchaVerified = false;
        }
      }
      if (isRecaptchaVerified) {
        createEmailVerificationInput.verification_code = String(
          Math.floor(Math.random() * 900000 + 100000),
        );
        createEmailVerificationInput.code_expires_in = new Date(
          Date.now() + 20 * 60 * 1000,
        );
        if (createEmailVerificationInput.type != 'Resend') {
          // createEmailVerificationInput.created_by = decoded?.userId;
          createEmailVerificationInput.created_on = moment.tz('UTC');
          createEmailVerificationInput.created_group = 'USER';
        } else {
          // createEmailVerificationInput.updated_by = decoded?.userId;
          createEmailVerificationInput.updated_on = moment.tz('UTC');
          createEmailVerificationInput.updated_group = 'USER';
        }
        const response = await this.signupService.verifyEmail(
          createEmailVerificationInput,
        );
        this.logger.log(
          `Response recieved while leaving the client: ${JSON.stringify(response)}`,
        );

        if (response) {
          var mailTemplate, toMaildetails;
          if (response.mail_type == 'Verify_User') {
            mailTemplate =
              await this.ptContentService.getMailTemplateByMailType(
                'verify-user',
              );
            toMaildetails = response.email_id;
          } else if (response.mail_type == 'Verify_Company') {
            mailTemplate =
              await this.ptContentService.getMailTemplateByMailType(
                'verify-company',
              );
            toMaildetails = response.company_email_id;
          }
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
            mail_type: EmailTypeEnum.VerifyOtp,
          };
          this.emailQueueProducer.emailQueueProducer(mailDetails);

          // this.emailServices.sendMail(mailDetails);
          this.logger.log(
            `Email sent successfully with details: ${mailDetails}`,
          );
          return framedResponse('SUCCESS', `Email sent successfully`);
        }
        return framedResponse(
          'ERROR',
          `Error in inserting verfification details: ${JSON.stringify(response)}`,
        );
      }
      return framedResponse(
        'ERROR',
        `Robot detected on User Registration: ${errMsg}`,
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

  @Public()
  @Mutation(() => AuthResponse, {
    name: 'insertUserDetails',
    description: `Registers a new user after successful email verification. 
    Creates user account and issues authentication token upon success.`,
  })
  async insertUserDetails(
    @Args('createSignupInput', {
      description:
        'Payload containing user registration details, email, password, and verification code',
    })
    createSignupInput: CreateSignupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createSignupInput)}`,
      );
      const checkUser = await this.signupService.getUserByEmail(
        createSignupInput.email_id,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(checkUser)}`,
      );
      if (checkUser.length === 0) {
        const emailVerifyDetails =
          await this.signupService.getEmailVerifyDetails(createSignupInput);
        if (emailVerifyDetails) {
          if (passwordRegex.test(String(createSignupInput.password))) {
            if (
              moment(emailVerifyDetails.code_expires_in)
                .utc()
                .isAfter(moment.utc())
            ) {
              if (
                emailVerifyDetails.verification_code ===
                createSignupInput.verification_code
              ) {
                const passwordBeforeHashing = createSignupInput.password;
                const userDetails =
                  await this.signupService.insertUserDetails(createSignupInput);
                this.logger.log(
                  `User details added for user with input: ${JSON.stringify(createSignupInput)}`,
                );
                if (userDetails) {
                  const mailTemplate =
                    await this.ptContentService.getMailTemplateByMailType(
                      'sign-up',
                    );

                  userDetails.password = passwordBeforeHashing;
                  const Keys = mailTemplate.selected_dynamic;
                  const dynamicData: { [key: string]: any } = {};
                  Keys.forEach((key) => {
                    dynamicData[key] = userDetails[key];
                  });

                  const mailbody = await this.replaceVariables(
                    mailTemplate.email_content,
                    dynamicData,
                  );

                  var mailDetails = {
                    toEmail: userDetails.email_id,
                    subject: mailTemplate.email_subject,
                    template: 'header-footer-email',
                    mailBody: mailbody,
                    mail_type: EmailTypeEnum.UserSignUpAcknowledgement,
                  };

                  this.emailQueueProducer.emailQueueProducer(mailDetails);
                  // this.emailServices.sendMail(mailDetails);
                  this.logger.log(
                    `Email sent successfully with details: ${mailDetails}`,
                  );

                  const adminDetails =
                    await this.signupService.getAdminDetails();

                  const adminMailTemplate =
                    await this.ptContentService.getMailTemplateByMailType(
                      'intimate-admin',
                    );

                  const adminDynamicData: any = {
                    admin_first_name: adminDetails.first_name,
                    admin_last_name: adminDetails.last_name,
                    user_name:
                      userDetails.first_name + ' ' + userDetails.last_name,
                    email_id: userDetails.email_id,
                    signup_date: moment
                      .utc(userDetails.created_on)
                      .tz(adminDetails.user_timezone)
                      .format('DD/MM/YYYY HH:mm:SS A'),
                    location: userDetails.user_address,
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
                    mail_type: EmailTypeEnum.intimateAdminUserSignup,
                  };

                  this.emailQueueProducer.emailQueueProducer(mailDetails);
                  // this.emailServices.sendMail(adminMailDetails);
                  this.logger.log(
                    `Email sent successfully with details: ${adminMailDetails}`,
                  );

                  const response = await this.authService.getAuthToken(
                    createSignupInput.email_id,
                    false,
                  );
                  console.log(response.data['access_token']);
                  const decoded = this.jwtService.decode(
                    response.data['access_token'],
                  );
                  const createActivityLogInput: CreateActivityLogInput = {
                    event_template_id: 5,
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
                    company_id: userDetails.company_id,
                    is_admin: false,
                    created_by: decoded?.userId,
                  };

                  await this.activityLogService.insertActivityLog(
                    createActivityLogInput,
                  );
                  return framedResponse(
                    'SUCCESS',
                    `Response successfully sent back to the client`,
                    response.data,
                  );
                }
                return framedResponse(
                  'ERROR',
                  `Error in insertion of User details: ${JSON.stringify(userDetails)}`,
                );
              }
              return framedResponse('ERROR', `This code is invalid.`);
            }
            return framedResponse(
              'ERROR',
              `Verification code expired. Click on the send verification email again link to receive a new code.`,
            );
          }
          return framedResponse(
            'ERROR',
            `Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.`,
          );
        }
        return framedResponse('ERROR', `Please enter a valid email address`);
      }
      return framedResponse('ERROR', 'This email address is taken');
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => CompanySignupResponse, {
    name: 'insertCompanyDetails',
    description: `Creates a new company associated with an authenticated user. 
    Validates email verification and registers company details.`,
  })
  async insertCompanyDetails(
    @Context() context,
    @Args('createCompanySignupInput', {
      description:
        'Payload containing company details, email verification code, and associated user information',
    })
    createCompanySignupInput: CreateCompanySignupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createCompanySignupInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const checkCompany = await this.signupService.checkCompanyEmailExistence(
        createCompanySignupInput.company_email_id,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(checkCompany)}`,
      );
      if (!checkCompany.company_email_id) {
        createCompanySignupInput.email_id = decoded?.emailId;
        createCompanySignupInput.created_by = decoded?.userId;
        const emailVerifyDetails =
          await this.signupService.getEmailVerifyDetails(
            createCompanySignupInput,
          );
        console.log(createCompanySignupInput.email_id, emailVerifyDetails);
        if (emailVerifyDetails) {
          if (
            moment(emailVerifyDetails.code_expires_in)
              .utc()
              .isAfter(moment.utc())
          ) {
            if (
              emailVerifyDetails.verification_code ===
              createCompanySignupInput.verification_code
            ) {
              const companyDetails =
                await this.signupService.insertCompanyDetails(
                  createCompanySignupInput,
                  emailVerifyDetails,
                );

              console.log('companyDetails', companyDetails);

              const response = await this.authService.getAuthToken(
                decoded?.emailId,
                false,
              );
              companyDetails['token'] = response.data;
              //Generating company link.
              const companyLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[2]}` +
                `?from=log`;
              console.log('companyLink', companyLink);

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 12,
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
                company_id: companyDetails.company_id,
                dynamic_values: {
                  companyName: companyDetails.company_name,
                  companyLink,
                },
                is_admin: false,
                created_by: emailVerifyDetails.user_id,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
              return framedResponse(
                'SUCCESS',
                `This Business has been added.`,
                companyDetails,
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
      }
      return framedResponse('ERROR', 'Business email already exists');
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
  @Query(() => AuthResponse, {
    name: 'getAuthToken',
    description: `Generates an authentication token for a user or admin based on credentials.`,
  })
  async getAuthToken(
    @Args('email_id', {
      description: 'Email address of the user/admin requesting token',
    })
    email_id: string,
    @Args('is_admin', {
      description:
        'Boolean flag indicating if the request is for an admin account',
    })
    is_admin: boolean,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}, is_admin:: ${is_admin}`,
      );
      const response = await this.authService.getAuthToken(email_id, is_admin);
      this.logger.log(
        `Auth token generated for email_id: ${JSON.stringify(email_id)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response.data,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => AuthResponse, {
    name: 'refreshAccessToken',
    description: `Generates a new access token using a valid refresh token. 
    Enables session continuation without re-login.`,
  })
  async refreshAccessToken(
    @Args('refresh_token', {
      description: 'Valid refresh token for session continuation',
    })
    refresh_token: string,
  ) {
    try {
      this.logger.log(
        `Refreshing access token for refresh token: ${refresh_token}`,
      );
      const response = await this.authService.refreshToken(refresh_token);
      this.logger.log(`Access token refreshed successfully`);
      return framedResponse(
        'SUCCESS',
        'Access token refreshed successfully',
        response.data,
      );
    } catch (error) {
      this.logger.error(`Error refreshing access token: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => SignupResponse, {
    name: 'getUserDetailsByEmailId',
    description: `Retrieves user profile details by email address. 
    If email_id is not provided, user details are fetched using the authenticated token.`,
  })
  async getUserDetailsByEmailId(
    @Context() context,
    @Args('email_id', {
      nullable: true,
      description: 'Optional email address to fetch user details',
    })
    email_id?: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const emailId = email_id ? email_id : decoded?.emailId;
      const response = await this.signupService.getUserByEmail(emailId);
      this.logger.log(
        `User details retrieved succesfully from DB for ${JSON.stringify(emailId)}`,
      );
      if (response && response[0] !== null && response.length > 0) {
        for (const element of response) {
          if (element && element.file_path) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(element.file_path);
              if (fileBuffer) {
                const image = fileBuffer.toString('base64');
                element['file'] = `data:${element.file_type};base64,${image}`;
              }
            } catch (fileError) {
              this.logger.error(`Failed to read file from storage: ${fileError.message}`);
            }
            element.file_path =
              process.env.UPLOAD_BASE_URL +
              element.file_path.replace(/\\/g, '/');
          }
          if (element.company_id) {
            element.has_bank_account = await this.signupService.checkAccount(
              element.company_id,
            );
          }
        }
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => StringResponse, {
    name: 'checkUserStatus',
    description: `Returns the current status of the authenticated user's account. 
    Identifies whether the account is active, blocked, or accessed by an administrator.`,
  })
  async checkUserStatus(@Context() context) {
    try {
      this.logger.log(`Request recieved while entering the client.`);
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.signupService.checkUserStatus(
        decoded?.userId,
      );
      this.logger.log(
        `Response recieved for check user status for user: ${response.email_id} with status: ${response.user_status}`,
      );
      if (response && response.user_status === 'Active') {
        return framedResponse('SUCCESS', `Your account is active.`);
      } else if (
        response &&
        response.user_status !== 'Active' &&
        decoded?.logged_in_by &&
        decoded?.admin_id
      ) {
        return framedResponse(
          'SUCCESS',
          `Your account is currently inactive or has been blocked. Paytrade administrator has logged into your account for debugging.`,
        );
      }
      return framedResponse(
        'ERROR',
        `Your account is currently inactive or has been blocked. Please contact the Paytrade administrator.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => AuthResponse, {
    name: 'loginByEmailId',
    description: `Authenticates a user using email and password. 
    Generates an access token upon successful login and logs login activity. 
    Enforces account lockout policy after multiple failed attempts.`,
  })
  async loginByEmailId(
    @Args('email_id', { description: 'Email address of the user' })
    email_id: string,
    @Args('password', { description: 'Password of the user' }) password: string,
    @Args('user_timezone', {
      description: 'Timezone of the user for login timestamp',
    })
    user_timezone: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}`,
      );
      const userDetails =
        await this.signupService.getUserByEmailForLogin(email_id);
      if (
        userDetails &&
        userDetails !== null &&
        userDetails.user_status === 'Active'
      ) {
        if (userDetails.lock_time) {
          if (moment(userDetails.lock_time).utc().isAfter(moment.utc())) {
            return framedResponse(
              'ERROR',
              `Too many failed attempts. Account is locked for 5 minutes.`,
            );
          }
        }
        // const isMatch = await bcrypt.compare(password, String(userDetails.password));
        const isMatch = await bcrypt.compareSync(
          password,
          String(userDetails.password),
        );
        const lastLoggedIn = moment.tz('UTC');

        if (isMatch) {
          const updateLoginInfoRes = await this.signupService.updateLoginInfo(
            userDetails.user_id,
            email_id,
            lastLoggedIn,
            user_timezone,
            null,
          );
          this.logger.log(
            `Response received while leaving the client: ${JSON.stringify(updateLoginInfoRes)}`,
          );
          const response = await this.authService.getAuthToken(
            userDetails.email_id,
            false,
          );
          this.logger.log(`Auth token generated succesfully`);
          if (response.status === 'SUCCESS') {
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 1,
              from_user: userDetails.user_id,
              company_id: await this.activityLogService.getSystemAddedCompanyId(
                userDetails.user_id,
              ),
              is_admin: false,
              created_by: userDetails.user_id,
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
          } else {
            return framedResponse('ERROR', response.message);
          }
        } else {
          if (userDetails.lock_time) {
            if (moment(userDetails.lock_time).utc().isAfter(moment.utc())) {
              return framedResponse(
                'ERROR',
                `Too many failed attempts. Account is locked for 5 minutes.`,
              );
            } else {
              const updateLoginInfoRes =
                await this.signupService.updateLoginInfo(
                  userDetails.user_id,
                  email_id,
                  lastLoggedIn,
                  user_timezone,
                  1,
                );
              this.logger.log(
                `Response received while leaving the client: ${JSON.stringify(updateLoginInfoRes)}`,
              );
              return framedResponse('ERROR', `Invalid credentials.`);
            }
          }
          const failed_attempts = Number(userDetails.failed_attempts) + 1;
          const updateLoginInfoRes = await this.signupService.updateLoginInfo(
            userDetails.user_id,
            email_id,
            lastLoggedIn,
            user_timezone,
            failed_attempts,
          );
          this.logger.log(
            `Response received while leaving the client: ${JSON.stringify(updateLoginInfoRes)}`,
          );
          return framedResponse('ERROR', `Invalid credentials.`);
        }
      } else if (
        userDetails &&
        userDetails !== null &&
        userDetails.user_status !== 'Active'
      ) {
        return framedResponse(
          'ERROR',
          `Your account is inactive. Please contact the Paytrade administrator.`,
        );
      }
      return framedResponse('ERROR', `Invalid credentials.`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Mutation(() => StringResponse, {
    name: 'sendVerificationCode',
    description: `Sends a one-time verification code to the user's email address. 
    Used for password reset and email validation. 
    Automatically handles resend and regenerates expiration time.`,
  })
  async sendVerificationCode(
    @Args('email_id', {
      description: 'Email address to send verification code to',
    })
    email_id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}`,
      );
      var emailVerificationDetails;
      var emailVerificationInput: {} = {
        mail_type: 'Verify_User',
        email_id: email_id,
      };
      const emailDetails = await this.signupService.getEmailVerificationDetails(
        emailVerificationInput,
      );
      const userDetails = await this.signupService.getUserByEmail(email_id);
      if (userDetails && userDetails.length > 0 && userDetails[0] !== null) {
        if (userDetails[0].is_admin_added && !emailDetails) {
          emailVerificationInput = {
            ...emailVerificationInput,
            first_name: userDetails[0].first_name,
            last_name: userDetails[0].last_name,
            type: 'Send',
            verification_code: '',
            code_expires_in: moment.tz('UTC'),
            created_by: userDetails[0].user_id,
            created_group: 'USER',
            created_on: moment.tz('UTC'),
          };
          await this.signupService.insertEmailVerification(
            emailVerificationInput,
          );
        }
      }
      emailVerificationInput = {
        ...emailVerificationInput,
        verification_code: String(Math.floor(Math.random() * 900000 + 100000)),
        code_expires_in: new Date(Date.now() + 20 * 60 * 1000),
      };
      emailVerificationDetails =
        await this.signupService.getEmailVerificationDetails(
          emailVerificationInput,
        );
      if (emailVerificationDetails) {
        const response = await this.signupService.verifyEmailForPassword(
          emailVerificationDetails,
          emailVerificationInput,
        );
        this.logger.log(
          `Response recieved while leaving the client: ${JSON.stringify(emailVerificationDetails)}`,
        );
        const mailTemplate =
          await this.ptContentService.getMailTemplateByMailType(
            'change-password',
          );

        const adminDetails = await this.signupService.getAdminDetails();
        response.admin_email = 'mailto:' + adminDetails.email_id;
        // console.log(response.admin_email);

        const Keys = mailTemplate.selected_dynamic;
        const dynamicData: { [key: string]: any } = {};
        Keys.forEach((key) => {
          dynamicData[key] = response[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        if (response) {
          var mailDetails = {
            toEmail: response.email_id,
            subject: mailTemplate.email_subject,
            template: 'header-footer-email',
            mailBody: mailbody,
          };

          this.emailQueueProducer.emailQueueProducer(mailDetails);

          // this.emailServices.sendMail(mailDetails);
          this.logger.log(
            `Email sent successfully with details: ${mailDetails}`,
          );

          return framedResponse('SUCCESS', `Email sent successfully `);
        }
        return framedResponse('ERROR', `Please enter a valid email address`);
      }
      return framedResponse('ERROR', `Please enter a valid email address`);
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

  @Public()
  @Query(() => AuthResponse, {
    name: 'verifyCode',
    description: `Validates a verification code sent to the user email. 
    Supports email update and authentication upon successful verification.`,
  })
  async verifyCode(
    @Args('email_id', { description: 'Current email address of the user' })
    email_id: string,
    @Args('verification_code', {
      description: 'Verification code sent to the email',
    })
    verification_code: string,
    @Args('new_email_id', {
      nullable: true,
      description: 'Optional new email address if updating email',
    })
    new_email_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: email_id:: ${email_id}, new_email_id:: ${new_email_id}, verification_code:: ${verification_code}`,
      );
      const emailId = new_email_id ? new_email_id : email_id;
      const emailVerificationInput = {
        mail_type: 'Verify_User',
        email_id: emailId,
      };
      const emailVerifyDetails = await this.signupService.getEmailVerifyDetails(
        emailVerificationInput,
      );
      if (emailVerifyDetails) {
        if (
          moment(emailVerifyDetails.code_expires_in).utc().isAfter(moment.utc())
        ) {
          if (emailVerifyDetails.verification_code === verification_code) {
            if (new_email_id) {
              const updateUserEmailRes =
                await this.signupService.updateUserEmail(
                  email_id,
                  new_email_id,
                );
              this.logger.log(
                `User email updated ${JSON.stringify(updateUserEmailRes)}`,
              );
              if (updateUserEmailRes) {
                const response = await this.authService.getAuthToken(
                  new_email_id,
                  false,
                );
                this.logger.log(
                  `Auth token generated for ${JSON.stringify(new_email_id)}`,
                );
                if (response.status === 'SUCCESS') {
                  return framedResponse(
                    'SUCCESS',
                    `Response successfully sent back to the client`,
                    response.data,
                  );
                } else {
                  return framedResponse('ERROR', response.message);
                }
              }
              return framedResponse(
                'ERROR',
                `Unable to update email address, please try again.`,
              );
            } else {
              const response = await this.authService.getAuthToken(
                emailVerifyDetails.email_id,
                false,
              );
              this.logger.log(
                `Auth token for ${JSON.stringify(emailVerifyDetails.email_id)}`,
              );
              if (response.status === 'SUCCESS') {
                return framedResponse(
                  'SUCCESS',
                  `Response successfully sent back to the client`,
                  response.data,
                );
              } else {
                return framedResponse('ERROR', response.message);
              }
            }
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updatePassword',
    description: `Updates the authenticated user's password. 
    Ensures password complexity rules are enforced. 
    Sends a confirmation email after successful update.`,
  })
  async updatePassword(
    @Context() context,
    @Args('password', { description: 'New password to set for the user' })
    password: string,
  ): Promise<any> {
    try {
      this.logger.log(`Request recieved to update the password`);
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (passwordRegex.test(password)) {
        const userDetails = await this.signupService.getUserByEmailForLogin(
          decoded?.emailId,
        );
        this.logger.log(
          `Fetched user details: ${JSON.stringify(userDetails.user_id)}`,
        );
        if (userDetails && userDetails !== null) {
          const isMatch = await bcrypt.compareSync(
            password,
            String(userDetails.password),
          );
          if (isMatch)
            return framedResponse(
              'ERROR',
              `Your new password must be different from your old password.`,
            );
          const response = await this.signupService.updatePassword(
            decoded?.emailId,
            decoded?.userId,
            userDetails,
            password,
          );
          this.logger.log(`Password update success`);
          const mailTemplate =
            await this.ptContentService.getMailTemplateByMailType(
              'update-password-confirmation',
            );

          response.newPassword = password;
          const Keys = mailTemplate.selected_dynamic;
          const dynamicData: { [key: string]: any } = {};
          Keys.forEach((key) => {
            dynamicData[key] = response[key];
          });

          const mailbody = await this.replaceVariables(
            mailTemplate.email_content,
            dynamicData,
          );
          if (response) {
            var mailDetails = {
              toEmail: response.email_id,
              subject: mailTemplate.email_subject,
              template: 'header-footer-email',
              mailBody: mailbody,
              mail_type: EmailTypeEnum.updatePasswordConfirmation,
            };
            this.emailQueueProducer.emailQueueProducer(mailDetails);
            // this.emailServices.sendMail(mailDetails);
            this.logger.log(
              `Email sent successfully with details: ${mailDetails}`,
            );

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 9,
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
              company_id: await this.activityLogService.getSystemAddedCompanyId(
                decoded?.userId,
              ),
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );

            return framedResponse('SUCCESS', `Password has been updated.`);
          }
          return framedResponse(
            'ERROR',
            `Failed to update Password, please try again`,
          );
        }
        return framedResponse(
          'ERROR',
          `Failed to update Password, please try again`,
        );
      }
      return framedResponse(
        'ERROR',
        `Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.`,
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CompanyDetailsResponse, {
    name: 'getCompanyDetailsByUserId',
    description: `Retrieves company profile details associated with the authenticated user.`,
  })
  async getCompanyDetailsByUserId(@Context() context): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client without arguments}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const companyDetails = await this.signupService.getCompanyDetailsByUserId(
        decoded?.userId,
      );
      this.logger.log(
        `Company details fetched for the user: ${JSON.stringify(decoded?.user_id)}`,
      );
      if (companyDetails) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          companyDetails,
        );
      }
      return framedResponse('ERROR', `Company Details could not be found`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => CompanyWithLogoResponse, {
    name: 'getCompanyProfilesWithLogos',
    description: `Returns a list of company profiles with logos. 
    Restricted to admins and authorized users. 
    Automatically filters blocked companies for non-admin users.`,
  })
  async getCompanyProfilesWithLogos(@Context() context): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client without arguments}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const isAdmin =
        decoded?.role === Role.ADMIN ||
        decoded?.role === Role.PRIMARY_ADMIN ||
        decoded?.role === Role.RESTRICTED_PORTAL_ADMIN;

      const companyDetails =
        await this.signupService.getCompanyProfilesWithLogos(
          decoded,
          isAdmin, // Pass this flag to indicate whether to include blocked users
        );
      this.logger.log(`All company profiles with logos fetched`);
      if (
        companyDetails &&
        companyDetails[0] !== null &&
        companyDetails.length > 0
      ) {
        companyDetails.forEach((element) => {
          if (element.file_path) {
            element.file_path =
              process.env.UPLOAD_BASE_URL +
              element.file_path.replace(/\\/g, '/');
            // const image = readFileSync(element.file_path, {
            //   encoding: 'base64',
            // });
            // element.file = `data:${element.file_type};base64,${image}`;
          }
        });
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        companyDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AuthResponse, {
    name: 'updateUserDetails',
    description: `Updates the authenticated user's profile information. 
    Generates a fresh authentication token after updating user records. 
    Logs activity and tracks signature updates when applicable.`,
  })
  async updateUserDetails(
    @Context() context,
    @Args('updateSignupInput', {
      description:
        'Input payload containing the user details to be updated, including optional signature update flag',
    })
    updateSignupInput: UpdateSignupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(updateSignupInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const updateUserResponse = await this.signupService.updateUserDetails(
        decoded,
        updateSignupInput,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(updateSignupInput)}`,
      );
      if (updateUserResponse) {
        const response = await this.authService.getAuthToken(
          decoded?.emailId,
          false,
        );
        if (response.status === 'SUCCESS') {
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 6,
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
            company_id: await this.activityLogService.getSystemAddedCompanyId(
              decoded?.userId,
            ),
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          if (updateSignupInput.is_signature_updated) {
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 11,
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
              company_id: await this.activityLogService.getSystemAddedCompanyId(
                decoded?.userId,
              ),
              is_admin: false,
              created_by: decoded?.userId,
            };
            console.log('createActivityInput', createActivityLogInput);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
          return framedResponse(
            'SUCCESS',
            `Response successfully sent back to the client`,
            response.data,
          );
        } else {
          return framedResponse('ERROR', response.message);
        }
      }
      return framedResponse('ERROR', `Unable to update User Details`);
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AuthResponse, {
    name: 'updateWelcomePop',
    description: `Updates welcome message status for the current user. 
    Used to track user onboarding and first-login experience.`,
  })
  async updateWelcomePop(@Context() context): Promise<any> {
    try {
      this.logger.log(`Request recieved while entering the client}`);
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const updateUserResponse =
        await this.signupService.updateWelcomePop(decoded);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(updateUserResponse)}`,
      );
      if (updateUserResponse) {
        const response = await this.authService.getAuthToken(
          decoded?.emailId,
          false,
        );
        this.logger.log(`Auth token recieved for ${decoded.emailId}`);
        if (response.status === 'SUCCESS') {
          return framedResponse(
            'SUCCESS',
            `Data saved successfully`,
            response.data,
          );
        } else {
          return framedResponse('ERROR', response.message);
        }
      }
      return framedResponse('ERROR', `Unable to save the data`);
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CompanySignupResponse, {
    name: 'getCompanyDetailsById',
    description: `Retrieves company profile details by company ID. 
    Access restricted to admins and authorized company managers.`,
  })
  async getCompanyDetailsById(
    @Context() context,
    @Args('company_id', {
      description: 'Unique ID of the company to retrieve details for',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client without arguments}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (
        decoded?.companySpecificRoles &&
        decoded?.companySpecificRoles.length > 0 &&
        decoded?.companySpecificRoles[0] !== null
      ) {
        const roles = decoded?.companySpecificRoles.filter((item) => {
          return item.companyId === company_id;
        });
        this.logger.log(
          `Response received with roles: ${JSON.stringify(roles)}`,
        );
        if (
          roles &&
          roles.length > 0 &&
          roles[0] !== null &&
          roles[0].role &&
          (roles[0].role === 'PRIMARY ADMIN' ||
            roles[0].role === 'ADMIN' ||
            (roles[0].role === 'STANDARD USER' &&
              roles[0].manageCompany === 'Yes')) &&
          !roles[0].isSystemAdded
        ) {
          let companyDetails = await this.signupService.getCompanyDetailsById(
            company_id,
            decoded?.userId,
          );
          this.logger.log(
            `Response recieved while leaving the client: ${JSON.stringify(companyDetails)}`,
          );
          if (companyDetails) {
            let email_preferences: Record<string, boolean> = {};
            CompanyEmailPreferences.map((moduleName) => {
              if (
                (companyDetails?.email_preferences
                  ? companyDetails?.email_preferences
                  : {}
                )?.hasOwnProperty(moduleName)
              ) {
                email_preferences = {
                  ...email_preferences,
                  [moduleName]: companyDetails?.email_preferences?.[moduleName],
                };
              } else {
                email_preferences = {
                  ...email_preferences,
                  [moduleName]: false,
                };
              }
            });

            companyDetails = {
              ...companyDetails,
              email_preferences,
            };

            if (
              companyDetails &&
              companyDetails.file_path &&
              companyDetails.file_type
            ) {
              try {
                const fileBuffer = await this.objectStorageService.downloadFile(companyDetails.file_path);
                if (fileBuffer) {
                  const image = fileBuffer.toString('base64');
                  companyDetails['file'] =
                    `data:${companyDetails.file_type};base64,${image}`;
                }
              } catch (fileError) {
                this.logger.error(`Failed to read file from storage: ${fileError.message}`);
              }
              companyDetails.file_path =
                process.env.UPLOAD_BASE_URL +
                companyDetails.file_path.replace(/\\/g, '/');
            }
            if (companyDetails.company_id) {
              companyDetails.has_bank_account =
                await this.signupService.checkAccount(
                  companyDetails.company_id,
                );
            }
          }
          return framedResponse(
            'SUCCESS',
            `Response successfully sent back to the client`,
            companyDetails,
          );
        }
        return framedResponse('ERROR', `Unauthorized to perform this action`);
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => CompanySignupResponse, {
    name: 'updateCompanyDetails',
    description: `Updates company profile information. 
    Verifies email ownership before applying email changes. 
    Logs all updates and generates audit events.`,
  })
  async updateCompanyDetails(
    @Context() context,
    @Args('updateCompanySignupInput', {
      description:
        'Input payload containing the company details to be updated, including optional email and signature updates',
    })
    updateCompanySignupInput: UpdateCompanySignupInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(updateCompanySignupInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (
        decoded?.companySpecificRoles &&
        decoded?.companySpecificRoles.length > 0 &&
        decoded?.companySpecificRoles[0] !== null
      ) {
        const roles = decoded?.companySpecificRoles.filter((item) => {
          return item.companyId === updateCompanySignupInput.company_id;
        });
        this.logger.log(
          `Response received with roles: ${JSON.stringify(roles)}`,
        );
        if (
          roles &&
          roles.length > 0 &&
          roles[0] !== null &&
          roles[0].role &&
          (roles[0].role === 'PRIMARY ADMIN' ||
            roles[0].role === 'ADMIN' ||
            (roles[0].role === 'STANDARD USER' &&
              roles[0].manageCompany === 'Yes')) &&
          !roles[0].isSystemAdded
        ) {
          const checkedEmail = await this.checkEmailVerification(
            decoded,
            updateCompanySignupInput,
          );
          console.log(checkedEmail);
          if (checkedEmail && checkedEmail['isUpdateAllowed'] === false) {
            return framedResponse('ERROR', checkedEmail['errMsg']);
          } else {
            const updateCompanyResponse =
              await this.signupService.updateCompanyDetails(
                decoded,
                updateCompanySignupInput,
              );
            this.logger.log(
              `Response recieved while leaving the client: ${JSON.stringify(updateCompanyResponse)}`,
            );
            if (updateCompanyResponse) {
              const response = await this.authService.getAuthToken(
                decoded?.emailId,
                false,
              );
              updateCompanyResponse['token'] = response.data;
              if (response.status === 'SUCCESS') {
                //Generating company link.
                const companyLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[2]}` +
                  `?from=log`;
                console.log('companyLink', companyLink);

                const createActivityLogInput: CreateActivityLogInput = {
                  event_template_id: 13,
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
                  company_id: updateCompanyResponse.company_id,
                  dynamic_values: {
                    companyName: updateCompanyResponse.company_name,
                    companyLink,
                  },
                  is_admin: false,
                  created_by: decoded?.userId,
                };
                await this.activityLogService.insertActivityLog(
                  createActivityLogInput,
                );
                if (updateCompanySignupInput.is_signature_updated) {
                  //Generating company link.
                  const companyLink =
                    `${process.env.LOG_BASE_URL}` +
                    `${linkExtensions[2]}` +
                    `${updateCompanySignupInput.company_id}` +
                    `?from=log`;
                  console.log('companyLink', companyLink);

                  const createActivityLogInput: CreateActivityLogInput = {
                    event_template_id: 11,
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
                    company_id: updateCompanySignupInput.company_id,
                    is_admin: false,
                    created_by: decoded?.userId,
                  };
                  console.log('createActivityInput', createActivityLogInput);
                  await this.activityLogService.insertActivityLog(
                    createActivityLogInput,
                  );
                }
                return framedResponse(
                  'SUCCESS',
                  `Response successfully sent back to the client`,
                  updateCompanyResponse,
                );
              } else {
                return framedResponse('ERROR', response.message);
              }
            }
            return framedResponse('ERROR', `Unable to update Company Details`);
          }
        }
        return framedResponse('ERROR', `Unauthorized to perform this action`);
      }
      return framedResponse('ERROR', `Unauthorized to perform this action`);
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

  async checkEmailVerification(decoded, updateCompanySignupInput) {
    return new Promise(async (resolve, reject) => {
      if (updateCompanySignupInput.old_company_email_id) {
        const emailVerificationInput = {
          email_id: decoded?.emailId,
          mail_type: 'Verify_Company',
          company_email_id: updateCompanySignupInput.company_email_id,
        };
        const emailVerifyDetails =
          await this.signupService.getEmailVerifyDetails(
            emailVerificationInput,
          );
        if (emailVerifyDetails) {
          if (
            moment(emailVerifyDetails.code_expires_in)
              .utc()
              .isAfter(moment.utc())
          ) {
            if (
              emailVerifyDetails.verification_code ===
              updateCompanySignupInput.verification_code
            ) {
              return resolve({ isUpdateAllowed: true, errMsg: '' });
            }
            return resolve({
              isUpdateAllowed: false,
              errMsg: 'This code is invalid.',
            });
          }
          return resolve({
            isUpdateAllowed: false,
            errMsg:
              'Verification code expired. Click on the send verification email again link to receive a new code.',
          });
        }
        return resolve({
          isUpdateAllowed: false,
          errMsg: 'Please enter a valid email address',
        });
      }
      return resolve({ isUpdateAllowed: true, errMsg: '' });
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'insertEmailVerificationDetailsForSignIn',
    description: `Generates and sends email verification codes for user sign-in and validation. 
    Supports resend flow and updates verification expiration time.`,
  })
  async insertEmailVerificationDetailsForSignIn(
    @Context() context,
    @Args('createEmailVerificationInput', {
      description:
        'Input payload containing email verification details, type, and optional resend flag',
    })
    createEmailVerificationInput: CreateEmailVerificationInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createEmailVerificationInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      createEmailVerificationInput.verification_code = String(
        Math.floor(Math.random() * 900000 + 100000),
      );
      createEmailVerificationInput.code_expires_in = new Date(
        Date.now() + 20 * 60 * 1000,
      );
      if (createEmailVerificationInput.type != 'Resend') {
        createEmailVerificationInput.created_by = decoded?.userId;
        createEmailVerificationInput.created_on = moment.tz('UTC');
        createEmailVerificationInput.created_group = 'USER';
      } else {
        createEmailVerificationInput.updated_by = decoded?.userId;
        createEmailVerificationInput.updated_on = moment.tz('UTC');
        createEmailVerificationInput.updated_group = 'USER';
      }
      const response = await this.signupService.verifyEmail(
        createEmailVerificationInput,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType('verify-user');

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = response[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );
      if (response) {
        var mailDetails = {
          toEmail: response.email_id,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.VerifyUser,
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
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetUserEmailPreferenceResponse, {
    name: 'getUserEmailPreferenceDetail',
    description: `Retrieves the authenticated user's email notification preferences. 
    Used for managing subscription and compliance alerts.`,
  })
  async getUserEmailPreferenceDetail(@Context() context) {
    try {
      this.logger.log(
        `Request recieved for getUserEmailPreferenceDetail without payload`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const user = await this.signupService.getUserEmailPreferenceDetail({
        user_id: decoded?.userId,
        moduleName: 'compliance',
      });
      return framedResponse(
        'SUCCESS',
        'Fetched user email preference details successfully',
        user,
      );
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
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
