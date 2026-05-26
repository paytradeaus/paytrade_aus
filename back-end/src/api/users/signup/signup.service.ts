import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EntityManager, ILike, In, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSignupInput } from './dto/create-signup.input';
import {
  UserDetails,
  UserEmailPreferences,
  UserDefaultOnEmailPreferenceKeys,
  DefaultUserEmailPreferences,
} from '../../../entities/user-details.entity';
import {
  CreateCompanySignupInput,
  CreateSystemCompanySignupInput,
} from './dto/create-company-signup.input';
import {
  CompanyDetails,
  CompanyEmailPreferences,
} from '../../../entities/company-details.entity';
import { CreateEmailVerificationInput } from './dto/create-email-verification-input';
import { EmailVerificationDetails } from 'src/entities/email-verification-entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import {
  CreateCompanySpecificRoles,
  CreateSystemCompanySpecificRoles,
} from './dto/create-company-specific-roles.input';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { CreateSubscriptionInput } from './dto/create-subscription.input';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { UpdateSignupInput } from './dto/update-signup.input';
import { UpdateCompanySignupInput } from './dto/update-company-signup.input';
import { Invitations } from 'src/entities/invitations.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var bcrypt = require('bcryptjs');
const saltOrRounds = bcrypt.genSaltSync(5);

@Injectable()
export class SignupService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(EmailVerificationDetails)
    private emailVerificationDetails: Repository<EmailVerificationDetails>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    @InjectRepository(EmailTemplates)
    private invitations: Repository<Invitations>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    @InjectRepository(SubscriptionPlanDetails)
    private subscriptionPlanDetails: Repository<SubscriptionPlanDetails>,
    @InjectRepository(BankAccounts)
    private accountDetails: Repository<BankAccounts>,
    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('SIGNUP_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  /**
   * One-shot startup backfill for the default-ON email preferences
   * regime. Sets the canonical opt-IN defaults
   * (community / compliance / notices / xero_sync_failures = true,
   * xero_sync_failures_mode = 'daily') on any user_details row that is
   * either missing email_preferences entirely or missing one of the
   * recognised keys. Existing explicit values (including `false`) are
   * preserved — `||` only fills NULL / missing.
   *
   * Runs as fire-and-forget so a slow / failed backfill never blocks
   * startup. Idempotent: re-running it on already-backfilled rows is
   * a no-op.
   */
  async onApplicationBootstrap(): Promise<void> {
    setTimeout(() => {
      void (async () => {
        try {
          const defaultsJson = JSON.stringify(DefaultUserEmailPreferences);
          // jsonb || jsonb merges right-into-left, so put existing prefs
          // on the right to ensure they win. Cast user_details
          // .email_preferences (json) to jsonb for the merge and store
          // back as the original json type.
          const result = await this.userDetails.query(
            `UPDATE user_details
             SET    email_preferences = (
                      $1::jsonb || COALESCE(email_preferences::jsonb, '{}'::jsonb)
                    )::json
             WHERE  email_preferences IS NULL
                OR  NOT (email_preferences::jsonb ? 'community')
                OR  NOT (email_preferences::jsonb ? 'compliance')
                OR  NOT (email_preferences::jsonb ? 'notices')
                OR  NOT (email_preferences::jsonb ? 'xero_sync_failures')
                OR  NOT (email_preferences::jsonb ? 'xero_sync_failures_mode')`,
            [defaultsJson],
          );
          const rowCount = Array.isArray(result) && result[1] != null
            ? result[1]
            : (result as any)?.affected ?? 0;
          this.logger.log(
            `[email_preferences backfill] default-ON keys applied to ${rowCount} user_details row(s)`,
          );
        } catch (err: any) {
          this.logger.error(
            `[email_preferences backfill] failed (non-fatal): ${err?.message || err}`,
          );
        }
      })();
    }, 15000);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getEmailVerifyDetails(createInput) {
    const mail_type = createInput.mail_type;
    this.logger.log(
      `User email vewrification with input: ${JSON.stringify(createInput)}`,
    );
    if (createInput.mail_type == 'Verify_User') {
      const response = await this.emailVerificationDetails.findOne({
        where: {
          email_id: ILike(`${createInput.email_id}`),
          mail_type,
        },
      });
      return response;
    } else {
      const response = await this.emailVerificationDetails.findOne({
        where: {
          email_id: ILike(`${createInput.email_id}`),
          mail_type,
          company_email_id: ILike(`${createInput.company_email_id}`),
        },
      });
      return response;
    }
  }

  async insertUserDetails(createSignupInput: CreateSignupInput) {
    try {
      this.logger.log(
        `Add new User initiated with payload: ${JSON.stringify(createSignupInput)}`,
      );
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          createSignupInput.first_name = await startCasePreserveUnicode(
            createSignupInput.first_name,
          );
          createSignupInput.last_name = await startCasePreserveUnicode(
            createSignupInput.last_name,
          );
          createSignupInput.password = await bcrypt.hashSync(
            String(createSignupInput.password),
            saltOrRounds,
          );
          createSignupInput.is_verified = true;
          createSignupInput.user_status = 'Active';
          createSignupInput.created_on = moment.tz('UTC');
          createSignupInput.created_group = 'USER';
          // Default-ON email preferences for every new user. Without this
          // seed, brand-new accounts had `email_preferences = NULL` and
          // every gating query needs to treat NULL as opted-in to avoid
          // dropping notifications. Seeding here lets the row carry
          // explicit consent from day one, and gives the UI a non-empty
          // object to bind the toggle states against.
          (createSignupInput as any).email_preferences = {
            ...DefaultUserEmailPreferences,
            ...((createSignupInput as any).email_preferences || {}),
          };

          const createUser = await transactionalEntityManager.create(
            UserDetails,
            createSignupInput,
          );
          const userResponse = await transactionalEntityManager.save(
            UserDetails,
            createUser,
          );

          const userDetails = await transactionalEntityManager.findOne(
            UserDetails,
            {
              where: { email_id: userResponse.email_id, user_status: 'Active' },
            },
          );

          const createCompanySignupInput: CreateSystemCompanySignupInput = {
            company_name:
              userResponse.first_name + ' ' + userResponse.last_name,
            company_email_id: userResponse.email_id,
            company_phone_no: userResponse.user_phone_no,
            company_address: userResponse.user_address,
            country: userResponse.country,
            region: userResponse.region,
            latitude: userResponse.latitude,
            longitude: userResponse.longitude,
            place_id: userResponse.place_id,
            entity_type: 'Personal',
            is_verified: true,
            is_system_added: true,
            created_by: userDetails.user_id,
            created_group: 'USER',
            created_on: moment.tz('UTC'),
          };

          const companyDetails = await transactionalEntityManager.create(
            CompanyDetails,
            createCompanySignupInput,
          );
          await transactionalEntityManager.save(CompanyDetails, companyDetails);
          companyDetails.company_id = 1000 + Number(companyDetails.company_id);

          const subscriptionPlanDetails = await transactionalEntityManager
            .createQueryBuilder(SubscriptionPlanDetails, 'pd')
            .select([
              'pd.id as id',
              'pd.plan_id as plan_id',
              'pd.plan_type as plan_type',
              'pd.plan_status as plan_status',
              'pp.price_id as price_id',
              'pp.plan_price as price',
            ])
            .leftJoin(
              SubscriptionPricingPlan,
              'pp',
              `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
            )
            .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active'`)
            .getRawOne();

          let createSubscriptionInput: CreateSubscriptionInput = {
            company_id: companyDetails.company_id,
            plan_id: subscriptionPlanDetails.plan_id,
            price_id: subscriptionPlanDetails.price_id ?? null,
            amount: subscriptionPlanDetails.price ?? 0,
            start_date: moment.tz('UTC'),
            created_by: userDetails.user_id,
            created_on: moment.tz('UTC'),
            created_group: 'USER',
          };
          const subscriptionDetails = await transactionalEntityManager.create(
            SubscriptionDetails,
            createSubscriptionInput,
          );

          await transactionalEntityManager.save(
            SubscriptionDetails,
            subscriptionDetails,
          );

          const createCompanySpecificRolesInput: CreateSystemCompanySpecificRoles =
          {
            user_name:
              (await startCasePreserveUnicode(userDetails.first_name)) +
              ' ' +
              (await startCasePreserveUnicode(userDetails.last_name)),
            user_id: userDetails.user_id,
            company_id: companyDetails.company_id,
            company_role: Role.PRIMARY_ADMIN,
            joined_on: moment.tz('UTC'),
            status: 'Active',
            is_system_added: true,
            created_group: 'USER',
            created_on: moment.tz('UTC'),
            created_by: userDetails.user_id,
          };

          const userRoles = await transactionalEntityManager.create(
            CompanyUserRoles,
            createCompanySpecificRolesInput,
          );
          await transactionalEntityManager.save(CompanyUserRoles, userRoles);

          userDetails.user_role = Role.STANDARD_USER;
          userDetails.created_by = userDetails.user_id;
          const userDetailsResponse = await transactionalEntityManager.save(
            UserDetails,
            userDetails,
          );
          return {
            ...userDetailsResponse,
            company_id: companyDetails.company_id,
          };
        },
      );
    } catch (error) {
      this.logger.log(
        `Add user failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async isNumericString(value: string): Promise<boolean> {
    return /^[0-9]+(\.[0-9]+)?$/.test(value);
  }

  async insertCompanyDetails(
    createCompanySignupInput: CreateCompanySignupInput,
    emailVerifyDetails: any,
  ) {
    try {
      this.logger.log(
        `Add company profile initiated with payload: ${JSON.stringify(createCompanySignupInput)}`,
      );
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          createCompanySignupInput.company_name =
            await startCasePreserveUnicode(
              createCompanySignupInput.company_name,
            );
          createCompanySignupInput.country = createCompanySignupInput.country;

          createCompanySignupInput.legal_company_name =
            await startCasePreserveUnicode(
              createCompanySignupInput.legal_company_name,
            );
          createCompanySignupInput.is_verified = true;
          const createCompany = await transactionalEntityManager.create(
            CompanyDetails,
            createCompanySignupInput,
          );
          createCompanySignupInput.created_on = moment.tz('UTC');
          createCompanySignupInput.created_group = 'USER';
          const companyResponse = await transactionalEntityManager.save(
            CompanyDetails,
            createCompany,
          );
          const companyDetails = await transactionalEntityManager.findOne(
            CompanyDetails,
            {
              where: {
                company_email_id: companyResponse.company_email_id,
                is_admin_blocked: false,
                is_verified: true,
              },
            },
          );

          this.logger.log(
            `Response recieved while leaving the client: ${JSON.stringify(companyDetails)}`,
          );
          const subscriptionPlanDetails = await transactionalEntityManager
            .createQueryBuilder(SubscriptionPlanDetails, 'pd')
            .select([
              'pd.id as id',
              'pd.plan_id as plan_id',
              'pd.plan_type as plan_type',
              'pd.plan_status as plan_status',
              'pp.price_id as price_id',
              'pp.plan_price as price',
            ])
            .leftJoin(
              SubscriptionPricingPlan,
              'pp',
              `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
            )
            .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active'`)
            .getRawOne();

          let createSubscriptionInput: CreateSubscriptionInput = {
            company_id: companyDetails.company_id,
            plan_id: subscriptionPlanDetails.plan_id,
            price_id: subscriptionPlanDetails.price_id ?? null,
            amount: subscriptionPlanDetails.price ?? 0,
            start_date: moment.tz('UTC'),
            created_by: createCompanySignupInput.created_by,
            created_on: moment.tz('UTC'),
            created_group: 'USER',
          };
          const subscriptionDetails = await transactionalEntityManager.create(
            SubscriptionDetails,
            createSubscriptionInput,
          );
          await transactionalEntityManager.save(
            SubscriptionDetails,
            subscriptionDetails,
          );
          this.logger.log(`Subscription details saved: ${JSON.stringify(subscriptionDetails)}`);

          const createCompanySpecificRolesInput: any = {
            user_name:
              (await startCasePreserveUnicode(emailVerifyDetails.first_name)) +
              ' ' +
              (await startCasePreserveUnicode(emailVerifyDetails.last_name)),
            user_id: emailVerifyDetails.user_id,
            company_id: companyDetails.company_id,
            company_role: Role.PRIMARY_ADMIN,
            joined_on: moment.tz('UTC'),
            status: 'Active',
            created_group: 'USER',
            created_on: moment.tz('UTC'),
            created_by: emailVerifyDetails.user_id,
          };
          const companySpecificRoles = await transactionalEntityManager.create(
            CompanyUserRoles,
            createCompanySpecificRolesInput,
          );
          const response = await transactionalEntityManager.save(
            CompanyUserRoles,
            companySpecificRoles,
          );
          this.logger.log(
            `Response recieved while leaving the client: ${JSON.stringify(response)}`,
          );

          const user = await transactionalEntityManager.findOne(UserDetails, {
            where: {
              email_id: ILike(`${createCompanySignupInput.email_id}`),
              user_status: 'Active',
            },
          });
          if (user.user_role == Role.BASIC_USER) {
            user.user_role = Role.STANDARD_USER;
            user.updated_group = 'USER';
            user.updated_on = moment.tz('UTC');
            user.updated_by = user.user_id;
            await transactionalEntityManager.save(UserDetails, user);
          }
          this.logger.log(
            `Response recieved while leaving the client: ${JSON.stringify(user)}`,
          );
          return companyDetails;
        },
      );
    } catch (error) {
      this.logger.log(
        `Insert Company details failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async insertCompanySpecificRoles(
    createCompanySpecificRolesInput: CreateCompanySpecificRoles,
  ) {
    const companySpecificRoles = await this.userRoles.create(
      createCompanySpecificRolesInput,
    );
    return await this.userRoles.save(companySpecificRoles);
  }

  async insertSubscriptionDetails(company_id, userId) {
    const subscriptionPlanDetails = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.plan_id as plan_id',
        'pd.plan_type as plan_type',
        'pd.plan_status as plan_status',
        'pp.price_id as price_id',
        'pp.plan_price as price',
      ])
      .leftJoin(
        SubscriptionPricingPlan,
        'pp',
        `pd.plan_id = pp.plan_id AND pp.id::varchar = ANY(pd.associated_price_ids) AND pp.is_active = true`,
      )
      .where(`pd.plan_type = 'Free' and pd.plan_status = 'Active'`)
      .getRawOne();

    let createSubscriptionInput: CreateSubscriptionInput = {
      company_id: company_id,
      plan_id: subscriptionPlanDetails.plan_id,
      price_id: subscriptionPlanDetails.price_id ?? null,
      amount: subscriptionPlanDetails.price ?? 0,
      start_date: moment.tz('UTC'),
      created_by: userId,
      created_on: moment.tz('UTC'),
      created_group: 'USER',
    };
    const subscriptionDetails = await this.subscriptionDetails.create(
      createSubscriptionInput,
    );
    return await this.subscriptionDetails.save(subscriptionDetails);
  }

  async updateUserRole(email_id: any) {
    const user = await this.userDetails.findOne({
      where: { email_id: ILike(`${email_id}`), user_status: 'Active' },
    });
    if (user.user_role == Role.BASIC_USER) {
      user.user_role = Role.STANDARD_USER;
      user.updated_group = 'USER';
      user.updated_on = moment.tz('UTC');
      user.updated_by = user.user_id;
      return await this.userDetails.save(user);
    }
    return 'No update required';
  }

  async verifyEmail(
    createEmailVerificationInput: CreateEmailVerificationInput,
  ) {
    // console.log('Service: ', JSON.stringify(createEmailVerificationInput));
    this.logger.log(
      `User email verification initiated with payload: ${JSON.stringify(createEmailVerificationInput)}`,
    );
    var emailVerificationDetails;
    if (
      (createEmailVerificationInput.mail_type == 'Verify_User' &&
        createEmailVerificationInput.type != 'Resend') ||
      (createEmailVerificationInput.mail_type == 'Verify_Company' &&
        createEmailVerificationInput.type != 'Resend')
    ) {
      const whereConditions =
        createEmailVerificationInput.mail_type == 'Verify_User'
          ? {
            email_id: ILike(`${createEmailVerificationInput.email_id}`),
          }
          : {
            company_email_id: ILike(
              `${createEmailVerificationInput.company_email_id}`,
            ),
          };
      const checkEmailExists = await this.emailVerificationDetails.find({
        where: whereConditions,
      });
      if (
        checkEmailExists &&
        checkEmailExists !== null &&
        checkEmailExists.length > 0 &&
        checkEmailExists[0] !== null
      ) {
        const deleteUser =
          await this.emailVerificationDetails.delete(whereConditions);
      }
    }
    if (createEmailVerificationInput.type != 'Resend') {
      createEmailVerificationInput.first_name = await startCasePreserveUnicode(
        createEmailVerificationInput.first_name,
      );
      createEmailVerificationInput.last_name = await startCasePreserveUnicode(
        createEmailVerificationInput.last_name,
      );
      createEmailVerificationInput.company_name =
        createEmailVerificationInput.company_name
          ? await startCasePreserveUnicode(
            createEmailVerificationInput.company_name,
          )
          : createEmailVerificationInput.company_name;
      emailVerificationDetails = this.emailVerificationDetails.create(
        createEmailVerificationInput,
      );
    } else {
      const mail_type = createEmailVerificationInput.mail_type;
      var email_id = createEmailVerificationInput.old_email_id
        ? createEmailVerificationInput.old_email_id
        : createEmailVerificationInput.email_id;
      var company_email_id = createEmailVerificationInput.old_company_email_id
        ? createEmailVerificationInput.old_company_email_id
        : createEmailVerificationInput.company_email_id;
      if (createEmailVerificationInput.mail_type == 'Verify_User') {
        emailVerificationDetails = await this.emailVerificationDetails.findOne({
          where: {
            email_id: ILike(`${email_id}`),
            mail_type,
          },
        });
        emailVerificationDetails.email_id =
          createEmailVerificationInput.email_id;
      } else {
        emailVerificationDetails = await this.emailVerificationDetails.findOne({
          where: {
            email_id: ILike(`${email_id}`),
            mail_type,
            company_email_id: ILike(`${company_email_id}`),
          },
        });
        emailVerificationDetails.company_email_id =
          createEmailVerificationInput.company_email_id;
      }
      emailVerificationDetails.verification_code =
        createEmailVerificationInput.verification_code;
      emailVerificationDetails.code_expires_in =
        createEmailVerificationInput.code_expires_in;
      emailVerificationDetails.first_name = await startCasePreserveUnicode(
        emailVerificationDetails.first_name,
      );
      emailVerificationDetails.last_name = await startCasePreserveUnicode(
        emailVerificationDetails.last_name,
      );
      emailVerificationDetails.company_name =
        emailVerificationDetails.company_name
          ? await startCasePreserveUnicode(
            emailVerificationDetails.company_name,
          )
          : emailVerificationDetails.company_name;
    }
    return await this.emailVerificationDetails.save(emailVerificationDetails);
  }

  async getUserByEmail(email_id: any) {
    const queryBuilder = this.userDetails
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.user_id', 'user_id')
      .addSelect('u.first_name', 'first_name')
      .addSelect('u.last_name', 'last_name')
      .addSelect('u.date_of_birth', 'date_of_birth')
      .addSelect('u.email_id', 'email_id')
      .addSelect('u.occupation', 'occupation')
      .addSelect('u.position_title', 'position_title')
      .addSelect('u.company_name', 'company_name')
      .addSelect('u.place_id', 'place_id')
      .addSelect('u.user_address', 'user_address')
      .addSelect('u.country', 'country')
      .addSelect('u.region', 'region')
      .addSelect('u.latitude', 'latitude')
      .addSelect('u.longitude', 'longitude')
      .addSelect('u.user_phone_no', 'user_phone_no')
      .addSelect('u.user_role', 'user_role')
      .addSelect('u.is_admin_added', 'is_admin_added')
      .addSelect('u.last_logged_in', 'last_logged_in')
      .addSelect('u.user_status', 'user_status')
      .addSelect('u.is_verified', 'is_verified')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .addSelect('f.file_name', 'file_name')
      .addSelect('s.signature', 'signature')
      .addSelect('s.signature_type', 'signature_type')
      .addSelect('r.company_id', 'company_id')
      .addSelect('u.email_preferences::JSONB', 'email_preferences')
      .addSelect('u.ai_live_follow_enabled', 'ai_live_follow_enabled')
      .addSelect('u.ui_preferences::JSONB', 'ui_preferences')
      .distinct(true)
      .leftJoin(FileAttachments, 'f', 'u.profile_id = f.id')
      .leftJoin(
        CompanyUserRoles,
        'r',
        'u.user_id = r.user_id and r.is_system_added = true',
      )
      .leftJoin(SubscriptionDetails, 's', 's.company_id = r.company_id')
      .where('trim(LOWER(u.email_id)) LIKE trim(LOWER(:email_id))', {
        email_id: `%${email_id.toLowerCase().trim()}%`,
      })
      .andWhere(`u.user_status = 'Active'`);
    let result = await queryBuilder.getRawMany();

    if (result?.length > 0) {
      result = result?.map((u) => {
        // Normalise the stored prefs JSON into a complete object the
        // frontend can render against. Default-ON keys
        // (UserDefaultOnEmailPreferenceKeys) coerce missing / null to
        // `true` so legacy users who never touched their prefs see all
        // toggles ON (matching the gating queries which treat NULL as
        // opted-in). Non-boolean keys (e.g. xero_sync_failures_mode)
        // fall back to the seed defaults.
        const stored: Record<string, any> = u?.email_preferences || {};
        const email_preferences: Record<string, any> = {};
        UserEmailPreferences.forEach((key) => {
          if (
            Object.prototype.hasOwnProperty.call(stored, key) &&
            stored[key] !== null &&
            stored[key] !== undefined
          ) {
            email_preferences[key] = stored[key];
          } else if (UserDefaultOnEmailPreferenceKeys.includes(key)) {
            email_preferences[key] = true;
          } else {
            email_preferences[key] = DefaultUserEmailPreferences[key];
          }
        });
        return { ...u, email_preferences };
      });
    }
    // console.log('result: ', result);
    return result;
  }

  async checkAccount(company_id: number) {
    const accountDetails = await this.accountDetails.find({
      where: { company_id },
    });

    if (
      accountDetails &&
      accountDetails[0] !== null &&
      accountDetails.length > 0
    ) {
      return true;
    }
    return false;
  }

  async checkUserStatus(user_id: any) {
    return await this.userDetails.findOne({ where: { user_id } });
  }

  async getUserByEmailForLogin(email_id: any) {
    const result = await this.userDetails.findOne({
      where: {
        email_id: ILike(`${email_id}`),
        user_status: Not('Deleted'),
      },
    });
    return result;
  }

  async checkCompanyExistence(company_keyword, match_full) {
    const keyword = match_full
      ? `${company_keyword.toLowerCase().trim()}`
      : `%${company_keyword.toLowerCase().trim()}%`;
    const queryBuilder = this.companyDetails
      .createQueryBuilder('c')
      .select('c.company_id', 'company_id')
      .addSelect('c.company_name', 'company_name')
      .addSelect('c.company_email_id', 'company_email_id')
      .addSelect('c.legal_company_name', 'legal_company_name')
      .addSelect('c.entity_type', 'entity_type')
      .addSelect('c.company_address', 'company_address')
      .addSelect('c.place_id', 'place_id')
      .addSelect('c.country', 'country')
      .addSelect('c.region', 'region')
      .addSelect('c.latitude', 'latitude')
      .addSelect('c.longitude', 'longitude')
      .addSelect('c.is_verified', 'is_verified')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .leftJoin(
        FileAttachments,
        'f',
        'c.logo_id = f.id and f.attachment_type = :attachmentType',
        { attachmentType: 'Company_logo' },
      )
      .where('trim(LOWER(c.company_name)) LIKE trim(LOWER(:company_keyword))', {
        company_keyword: keyword,
      })
      .andWhere('c.is_system_added = false');
    const results = await queryBuilder.getRawMany();
    return results;
  }

  async checkQbccExistence(qbcc_number) {
    const companyDetails = await this.companyDetails.find({
      where: {
        qbcc_number: ILike(`${qbcc_number}`),
      },
    });
    this.logger.log(`QBCC company details: ${JSON.stringify(companyDetails)}`);
    return companyDetails;
  }

  async checkCompanyEmailExistence(company_email) {
    const leftQueryBuilder = await this.userDetails.findOne({
      where: { email_id: ILike(`${company_email}`) },
      select: ['email_id'],
    });

    const rightQueryBuilder = await this.companyDetails.findOne({
      where: { company_email_id: ILike(`${company_email}`) },
      select: ['company_email_id'],
    });

    const result = { ...leftQueryBuilder, ...rightQueryBuilder };
    this.logger.log(`Email existence check result: ${JSON.stringify(result)}`);
    return result;
  }

  async updateLoginInfo(
    user_id: any,
    email_id: any,
    lastLoggedIn: any,
    user_timezone: string,
    failed_attempts: number,
  ) {
    this.logger.log(
      `Update login info initiated with user-id: ${user_id}`,
    );
    const user = await this.userDetails.findOne({
      where: {
        email_id: ILike(`${email_id}`),
        user_status: 'Active',
      },
    });
    this.logger.log(`user_details: ${user_id}`);

    if (user) {
      this.logger.log(`failed_attempts: ${failed_attempts}`);
      if (failed_attempts !== null && Number(failed_attempts) >= 0) {
        user.failed_attempts = failed_attempts;
        user.lock_time =
          Number(failed_attempts) >= 3
            ? moment().utc().add(5, 'minutes')
            : null;
        user.updated_by = user.user_id;
        user.user_timezone = user_timezone;
        user.updated_on = moment.tz('UTC');
        user.updated_group = 'USER';
        var result = await this.userDetails.save(user);
        this.logger.log('Maximum attempts updated.');
        return result;
      } else {
        user.failed_attempts = 0;
        user.lock_time = null;
        user.logged_in_email_id = email_id;
        user.last_logged_in = lastLoggedIn;
        user.updated_by = user.user_id;
        user.user_timezone = user_timezone;
        user.updated_on = moment.tz('UTC');
        user.updated_group = 'USER';
        user.user_mode = 'Normal';
        user.first_time_logged_in = Number(user.first_time_logged_in) + 1;
        var result = await this.userDetails.save(user);
        this.logger.log('Login Info updated successfully');
        return result;
      }
    } else {
      this.logger.log('User not found');
      return user;
    }
  }

  async insertEmailVerification(emailVerificationInput) {
    emailVerificationInput.first_name = await startCasePreserveUnicode(
      emailVerificationInput.first_name,
    );
    emailVerificationInput.last_name = await startCasePreserveUnicode(
      emailVerificationInput.last_name,
    );
    const emailDetails = await this.emailVerificationDetails.create(
      emailVerificationInput,
    );
    return await this.emailVerificationDetails.save(emailDetails);
  }

  async getEmailVerificationDetails(emailVerificationInput) {
    const mail_type = emailVerificationInput.mail_type;
    return await this.emailVerificationDetails.findOne({
      where: {
        email_id: ILike(`${emailVerificationInput.email_id}`),
        mail_type,
      },
    });
  }

  async verifyEmailForPassword(
    emailVerificationDetails,
    emailVerificationInput,
  ) {
    this.logger.log(
      `Verify email for password with payload: ${JSON.stringify(emailVerificationDetails)}`,
    );
    emailVerificationDetails.verification_code =
      emailVerificationInput.verification_code;
    emailVerificationDetails.code_expires_in =
      emailVerificationInput.code_expires_in;
    emailVerificationDetails.updated_by = emailVerificationInput.user_id;
    emailVerificationDetails.updated_group = 'USER';
    emailVerificationDetails.updated_on = moment.tz('UTC');
    return await this.emailVerificationDetails.save(emailVerificationDetails);
  }

  async getAdminDetails() {
    return this.adminDetails.findOne({
      where: {
        admin_role: Role.PORTAL_ADMIN,
        admin_status: 'Active',
        // email_id: 'super@paytrade.com', // need to remove in production - There should be only one portal admin
      },
    });
  }

  async updatePassword(emailId, userId, userDetails, password) {
    this.logger.log(
      `Update user password initiated with payload: ${JSON.stringify(emailId)}`,
    );
    userDetails.password = await bcrypt.hashSync(
      String(password),
      saltOrRounds,
    );
    userDetails.logged_in_email_id = emailId;
    userDetails.last_logged_in = moment.tz('UTC');
    userDetails.updated_by = userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userDetails.save(userDetails);
  }

  async getCompanyDetailsByUserId(userId: number) {
    return await this.companyDetails
      .createQueryBuilder('c')
      .innerJoin(CompanyUserRoles, 'u', 'c.company_id = u.company_id')
      .where('u.user_id = :userId', { userId })
      .andWhere('c.is_system_added = false')
      .getMany();
  }

  async getCompanyProfilesWithLogos(decoded, isAdmin) {
    const user_id = decoded?.userId;
    const queryBuilder = await this.userRoles
      .createQueryBuilder('r')
      .select('r.user_id', 'user_id')
      .addSelect('r.company_id', 'company_id')
      .addSelect('r.company_role', 'company_role')
      .addSelect('r.status', 'status')
      .addSelect('r.manage_project_trust_payment', '')
      .addSelect('r.manage_user', 'manage_user')
      .addSelect('r.manage_company', 'manage_company')
      .addSelect(
        'r.manage_project_trust_payment',
        'manage_project_trust_payment',
      )
      .addSelect('r.manage_subscription', 'manage_subscription')
      .addSelect('r.joined_on', 'joined_on')
      .addSelect('c.company_name', 'company_name')
      .addSelect('c.company_email_id', 'company_email_id')
      .addSelect('c.entity_type', 'entity_type')
      .addSelect('c.company_address', 'company_address')
      .addSelect('c.is_verified', 'is_verified')
      .addSelect('plan.plan_name', 'plan_name')
      .addSelect('plan.plan_type', 'plan_type')
      .addSelect('subscription.expiry_date', 'expiry_date')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .addSelect('i.user_action', 'user_action')
      .addSelect('i.decline_count', 'decline_count')
      .addSelect('i.requested_count', 'requested_count')
      .addSelect('i.is_admin_requested', 'is_admin_requested')
      .addSelect('i.updated_on', 'last_sent_on')
      .innerJoin(
        CompanyDetails,
        'c',
        `r.company_id = c.company_id ${!decoded?.logged_in_by || !decoded?.admin_id ? ' and c.is_admin_blocked = false' : ''}`,
      )
      .leftJoinAndSelect('c.subscriptionDetails', 'subscription')
      .leftJoinAndSelect('subscription.planDetails', 'plan')
      .leftJoin(FileAttachments, 'f', 'f.id = c.logo_id')
      .leftJoin(
        Invitations,
        'i',
        'i.user_id = r.user_id and i.company_id = r.company_id',
      )
      .where('r.user_id = :userId', { userId: user_id })
      // .andWhere('r.status NOT IN (:...statusArray)', {
      //   statusArray: ['Blocked', 'Archived', 'Deleted', 'Declined'],
      // })
      .andWhere('c.is_system_added = false');

    if (!isAdmin) {
      queryBuilder.andWhere('r.status NOT IN (:...statusArray)', {
        statusArray: ['Blocked', 'Archived', 'Deleted', 'Declined'],
      });
    }
    queryBuilder.orderBy({ 'c.company_name': 'ASC' });
    const results = await queryBuilder.getRawMany();
    // if (results && results[0] !== null && results.length > 0) {
    //   results.forEach((element) => {
    //     element.joined_on = element.joined_on
    //       ? new Date(element.joined_on)
    //       : new Date(0);
    //     element.last_sent_on = element.last_sent_on
    //       ? new Date(element.last_sent_on)
    //       : new Date(0);
    //   });
    // }
    return results;
  }

  async updateUserDetails(decoded: any, updateSignupInput: UpdateSignupInput) {
    const userDetails = await this.userDetails.findOne({
      where: { user_id: decoded?.userId },
    });

    const company_id = (
      await this.userRoles.findOne({
        where: { user_id: userDetails.user_id, is_system_added: true },
      })
    ).company_id;

    const accountDetails = await this.accountDetails.find({
      where: { company_id },
    });

    if (
      (userDetails.first_name?.toLowerCase()?.trim() !=
        updateSignupInput.first_name?.toLowerCase()?.trim() ||
        userDetails.last_name?.toLowerCase()?.trim() !=
        updateSignupInput.last_name?.toLowerCase()?.trim()) &&
      accountDetails &&
      accountDetails[0] !== null &&
      accountDetails.length > 0
    ) {
      throw `Username cannot be changed as a bank account is linked to this profile, and the account cannot be removed.`;
    }

    userDetails.first_name = await startCasePreserveUnicode(
      updateSignupInput.first_name,
    );
    userDetails.last_name = await startCasePreserveUnicode(
      updateSignupInput.last_name,
    );
    userDetails.date_of_birth = updateSignupInput.date_of_birth;
    userDetails.occupation = updateSignupInput.occupation;
    userDetails.position_title = updateSignupInput.position_title;
    userDetails.place_id = updateSignupInput.place_id;
    userDetails.user_address = updateSignupInput.user_address;
    userDetails.country = updateSignupInput.country;
    userDetails.region = updateSignupInput.region;
    userDetails.latitude = updateSignupInput.latitude;
    userDetails.longitude = updateSignupInput.longitude;
    userDetails.user_phone_no = updateSignupInput.user_phone_no;
    userDetails.updated_by = decoded?.userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';

    if (updateSignupInput?.email_preferences) {
      const keys = Object.keys(
        updateSignupInput.email_preferences
          ? updateSignupInput.email_preferences
          : {},
      );

      // Find invalid keys
      const invalidKeys = keys.filter(
        (key) => !UserEmailPreferences.includes(key),
      );

      if (invalidKeys.length > 0) {
        throw new Error(
          `Invalid email preference keys: ${invalidKeys.join(', ')}`,
        );
      }

      // Only update allowed fields
      userDetails.email_preferences = {
        ...(userDetails.email_preferences || {}),
        ...updateSignupInput.email_preferences,
      };
    }

    await this.subscriptionDetails
      .createQueryBuilder()
      .update(SubscriptionDetails)
      .set({
        signature: updateSignupInput.signature,
        signature_type: updateSignupInput.signature_type,
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: 'USER',
      })
      .where('company_id = :company_id', { company_id })
      .execute();

    const companyDetails = await this.companyDetails.findOne({
      where: {
        company_id,
      },
    });
    companyDetails.company_name = await startCasePreserveUnicode(
      updateSignupInput.first_name + ' ' + updateSignupInput.last_name,
    );
    companyDetails.company_phone_no = updateSignupInput.user_phone_no;
    companyDetails.place_id = updateSignupInput.place_id;
    companyDetails.company_address = updateSignupInput.user_address;
    companyDetails.country = updateSignupInput.country;
    companyDetails.region = updateSignupInput.region;
    companyDetails.latitude = updateSignupInput.latitude;
    companyDetails.longitude = updateSignupInput.longitude;
    companyDetails.updated_by = decoded?.userId;
    companyDetails.updated_on = moment.tz('UTC');
    companyDetails.updated_group = 'USER';
    await this.companyDetails.save(companyDetails);

    return await this.userDetails.save(userDetails);
  }

  async updateWelcomePop(decoded: any) {
    const userDetails = await this.userDetails.findOne({
      where: { user_id: decoded?.userId },
    });
    userDetails.show_popup = false;
    userDetails.updated_by = decoded?.userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userDetails.save(userDetails);
  }

  async getCompanyDetailsById(company_id: number, user_id: number) {
    return await this.companyDetails
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect('c.company_id', 'company_id')
      .addSelect('c.company_number', 'company_number')
      .addSelect('c.company_name', 'company_name')
      .addSelect('c.legal_company_name', 'legal_company_name')
      .addSelect('c.company_email_id', 'company_email_id')
      .addSelect('c.company_phone_no', 'company_phone_no')
      .addSelect('c.entity_type', 'entity_type')
      .addSelect('c.place_id', 'place_id')
      .addSelect('c.company_address', 'company_address')
      .addSelect('c.country', 'country')
      .addSelect('c.region', 'region')
      .addSelect('c.latitude', 'latitude')
      .addSelect('c.longitude', 'longitude')
      .addSelect('c.qbcc_number', 'qbcc_number')
      .addSelect('c.acn_number', 'acn_number')
      .addSelect('c.abn_number', 'abn_number')
      .addSelect('c.tfn_number', 'tfn_number')
      .addSelect('c.vat_number', 'vat_number')
      .addSelect('c.utr_number', 'utr_number')
      .addSelect('c.cis_rate', 'cis_rate')
      .addSelect('c.accounting_system', 'accounting_system')
      .addSelect('c.is_verified', 'is_verified')
      .addSelect('c.is_admin_blocked', 'is_admin_blocked')
      .addSelect('c.logo_id', 'logo_id')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .addSelect('subscription.subscription_id', 'subscription_id')
      .addSelect('subscription.signature', 'signature')
      .addSelect('subscription.signature_type', 'signature_type')
      .addSelect('plan.plan_name', 'plan_name')
      .addSelect('plan.plan_type', 'plan_type')
      .addSelect('subscription.expiry_date', 'expiry_date')
      .addSelect('c.email_preferences::JSONB', 'email_preferences')
      .addSelect('c.is_gst_registered', 'is_gst_registered')
      .addSelect('c.notices_auto_send', 'notices_auto_send')
      .leftJoin(FileAttachments, 'f', 'c.logo_id = f.id')
      .leftJoinAndSelect('c.subscriptionDetails', 'subscription')
      .leftJoinAndSelect('subscription.planDetails', 'plan')
      .where('c.company_id = :company_id', { company_id })
      .andWhere('c.is_system_added = false')
      .getRawOne();
  }

  // Task #97 — dedicated lightweight setter for the Notices page gear-icon
  // dialog so the modal can persist `notices_auto_send` without going through
  // the full company-profile update path.
  async updateNoticesAutoSendFlag(
    company_id: number,
    notices_auto_send: boolean,
  ): Promise<void> {
    await this.companyDetails.update(
      { company_id },
      { notices_auto_send },
    );
  }

  async updateCompanyDetails(
    decoded: any,
    updateCompanySignupInput: UpdateCompanySignupInput,
  ) {
    const companyDetails = await this.companyDetails.findOne({
      where: {
        company_id: updateCompanySignupInput.company_id,
      },
    });

    const accountDetails = await this.accountDetails.find({
      where: { company_id: updateCompanySignupInput.company_id },
    });

    if (
      companyDetails.company_name?.toLowerCase()?.trim() !=
      updateCompanySignupInput.company_name?.toLowerCase()?.trim() &&
      accountDetails &&
      accountDetails[0] !== null &&
      accountDetails.length > 0
    ) {
      throw `Username cannot be changed as a bank account is linked to this profile, and the account cannot be removed.`;
    }

    companyDetails.company_name = await startCasePreserveUnicode(
      updateCompanySignupInput.company_name,
    );
    companyDetails.company_email_id = updateCompanySignupInput.company_email_id;
    companyDetails.company_number = updateCompanySignupInput.company_number;
    companyDetails.legal_company_name = await startCasePreserveUnicode(
      updateCompanySignupInput.legal_company_name,
    );
    companyDetails.company_phone_no = updateCompanySignupInput.company_phone_no;
    companyDetails.entity_type = updateCompanySignupInput.entity_type;
    companyDetails.place_id = updateCompanySignupInput.place_id;
    companyDetails.company_address = updateCompanySignupInput.company_address;
    companyDetails.country = updateCompanySignupInput.country;
    companyDetails.region = updateCompanySignupInput.region;
    companyDetails.latitude = updateCompanySignupInput.latitude;
    companyDetails.longitude = updateCompanySignupInput.longitude;
    companyDetails.qbcc_number = updateCompanySignupInput.qbcc_number;
    companyDetails.acn_number = updateCompanySignupInput.acn_number;
    companyDetails.abn_number = updateCompanySignupInput.abn_number;
    companyDetails.tfn_number = updateCompanySignupInput.tfn_number;
    companyDetails.vat_number = updateCompanySignupInput.vat_number;
    if (updateCompanySignupInput.is_gst_registered !== undefined) {
      // null is allowed (= unknown)
      companyDetails.is_gst_registered =
        updateCompanySignupInput.is_gst_registered;
    }
    // Task #97: per-company notices auto-send toggle. NULL/TRUE = default,
    // FALSE = explicit opt-out (notice + mail still generated, but the
    // delegated auto-send step is skipped so the user must manually send).
    if (updateCompanySignupInput.notices_auto_send !== undefined) {
      companyDetails.notices_auto_send =
        updateCompanySignupInput.notices_auto_send;
    }
    companyDetails.utr_number = updateCompanySignupInput.utr_number;
    companyDetails.cis_rate = updateCompanySignupInput.cis_rate;
    companyDetails.accounting_system =
      updateCompanySignupInput.accounting_system;
    companyDetails.updated_by = decoded?.userId;
    companyDetails.updated_on = moment.tz('UTC');
    companyDetails.updated_group = 'USER';

    if (updateCompanySignupInput?.email_preferences) {
      const keys = Object.keys(
        updateCompanySignupInput.email_preferences
          ? updateCompanySignupInput.email_preferences
          : {},
      );

      // Find invalid keys
      const invalidKeys = keys.filter(
        (key) => !CompanyEmailPreferences.includes(key),
      );

      if (invalidKeys.length > 0) {
        throw new Error(
          `Invalid email preference keys: ${invalidKeys.join(', ')}`,
        );
      }

      // Only update allowed fields
      companyDetails.email_preferences = {
        ...(companyDetails.email_preferences || {}),
        ...updateCompanySignupInput.email_preferences,
      };
    }

    await this.subscriptionDetails
      .createQueryBuilder()
      .update(SubscriptionDetails)
      .set({
        signature: updateCompanySignupInput.signature,
        signature_type: updateCompanySignupInput.signature_type,
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: 'USER',
      })
      .where('company_id = :company_id', {
        company_id: updateCompanySignupInput.company_id,
      })
      .execute();

    return await this.companyDetails.save(companyDetails);
  }

  async getUserEmailPreferenceDetail({
    user_id,
    email_id,
    moduleName,
  }: {
    user_id?: number;
    email_id?: string;
    moduleName: string;
  }) {
    try {
      const emailPreferencesObj = [
        'community',
        'compliance',
        'notices',
        'blog',
        'resource',
      ];
      let email_preferences: Record<string, boolean> = {};

      if (!user_id && !email_id) {
        throw new Error('Failed to check user email preferences');
      }

      const queryBuilder = await this.userDetails
        .createQueryBuilder('u')
        .select([
          'u.user_id as user_id',
          'u.email_preferences::JSON as email_preferences',
        ]);

      if (user_id) {
        queryBuilder.where('u.user_id = :user_id', { user_id });
      } else {
        queryBuilder.where('u.email_id = :email_id', { email_id });
      }

      if (moduleName) {
        queryBuilder.andWhere(
          `u.email_preferences ->> '${moduleName}' = 'true'`,
        );
      }

      const user = await queryBuilder.getRawOne();

      if (!user) {
        throw new Error(`User with id ${user_id} not found`);
      }

      emailPreferencesObj.map((moduleName) => {
        if (
          (user?.email_preferences
            ? user?.email_preferences
            : {}
          )?.hasOwnProperty(moduleName)
        ) {
          email_preferences = {
            ...email_preferences,
            [moduleName]: user?.email_preferences?.[moduleName],
          };
        } else {
          email_preferences = {
            ...email_preferences,
            [moduleName]: false,
          };
        }
      });

      return { ...user, email_preferences };
    } catch (error) {
      throw error;
    }
  }

  async getUiPreferencesByUserId(user_id: number) {
    const u = await this.userDetails.findOne({
      where: { user_id },
      select: {
        user_id: true,
        ai_live_follow_enabled: true,
        ai_live_follow_enabled_at: true,
        ui_preferences: true,
      },
    });
    const stored: Record<string, any> = u?.ui_preferences || {};
    const { navCollapsed, aiPanelState, aiPanelWidth, ...extra } = stored;
    return {
      navCollapsed: !!navCollapsed,
      aiPanelState:
        aiPanelState === 'rail' || aiPanelState === 'hidden'
          ? aiPanelState
          : 'open',
      aiPanelWidth:
        typeof aiPanelWidth === 'number' && aiPanelWidth > 0
          ? Math.round(aiPanelWidth)
          : 360,
      aiLiveFollowEnabled: !!u?.ai_live_follow_enabled,
      aiLiveFollowEnabledAt: u?.ai_live_follow_enabled_at || null,
      extra: Object.keys(extra).length ? extra : null,
    };
  }

  async updateUiPreferencesForUser(
    user_id: number,
    input: {
      navCollapsed?: boolean;
      aiPanelState?: string;
      aiPanelWidth?: number;
      extra?: Record<string, any>;
    },
  ) {
    const user = await this.userDetails.findOne({ where: { user_id } });
    if (!user) {
      throw new Error('User not found');
    }
    const merged: Record<string, any> = { ...(user.ui_preferences || {}) };
    if (typeof input.navCollapsed === 'boolean') {
      merged.navCollapsed = input.navCollapsed;
    }
    if (typeof input.aiPanelState === 'string') {
      const allowed = ['open', 'rail', 'hidden'];
      if (!allowed.includes(input.aiPanelState)) {
        throw new Error(
          `Invalid aiPanelState: must be one of ${allowed.join(', ')}`,
        );
      }
      merged.aiPanelState = input.aiPanelState;
    }
    if (typeof input.aiPanelWidth === 'number') {
      merged.aiPanelWidth = Math.max(240, Math.min(720, input.aiPanelWidth));
    }
    if (input.extra && typeof input.extra === 'object') {
      Object.assign(merged, input.extra);
    }
    user.ui_preferences = merged;
    user.updated_by = user_id;
    user.updated_on = moment.tz('UTC');
    user.updated_group = 'USER';
    await this.userDetails.save(user);
    return this.getUiPreferencesByUserId(user_id);
  }

  async setAiLiveFollowForUser(
    user_id: number,
    enabled: boolean,
    password: string | undefined,
  ) {
    const user = await this.userDetails.findOne({ where: { user_id } });
    if (!user) {
      throw new Error('User not found');
    }
    if (enabled) {
      // Trim env-var on both sides — secrets pasted via the dashboard
      // commonly carry a trailing newline / surrounding whitespace, which
      // would silently fail the strict `!==` compare below. Also trim the
      // submitted password defensively (mobile keyboards / clipboards
      // sometimes append whitespace) so a paste from the same secret
      // store always matches.
      const expectedRaw = process.env.AI_LIVE_FOLLOW_ACCESS_PASSWORD;
      const expected = (expectedRaw || '').trim();
      if (!expected) {
        throw new Error(
          'AI live follow is not currently available. Please contact an administrator.',
        );
      }
      const submitted = (password || '').trim();
      if (!submitted || submitted !== expected) {
        throw new Error('Incorrect access password.');
      }
      user.ai_live_follow_enabled = true;
      user.ai_live_follow_enabled_at = moment.tz('UTC');
    } else {
      user.ai_live_follow_enabled = false;
    }
    user.updated_by = user_id;
    user.updated_on = moment.tz('UTC');
    user.updated_group = 'USER';
    await this.userDetails.save(user);
    return this.getUiPreferencesByUserId(user_id);
  }

  async listAiLiveFollowUsers() {
    return this.userDetails.find({
      where: { ai_live_follow_enabled: true },
      select: {
        user_id: true,
        email_id: true,
        first_name: true,
        last_name: true,
        ai_live_follow_enabled_at: true,
      },
      order: { ai_live_follow_enabled_at: 'DESC' },
    });
  }

  async updateUserEmail(email_id: string, new_email_id: string) {
    const userDetails = await this.userDetails.findOne({
      where: { email_id: ILike(`${email_id}`), user_status: 'Active' },
    });
    userDetails.email_id = new_email_id;
    userDetails.is_verified = true;
    userDetails.updated_by = userDetails.user_id;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userDetails.save(userDetails);
  }
}
