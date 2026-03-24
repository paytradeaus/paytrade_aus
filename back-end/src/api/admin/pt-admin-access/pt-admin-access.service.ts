import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDetails, UserStatus } from '../../../entities/user-details.entity';
import { Between, ILike, In, LessThan, Not, Repository } from 'typeorm';
import { UpdateUserDetailsInput } from './dto/ptadmin-update-user.dto';
import { CompanyDetails } from '../../../entities/company-details.entity';
import { UpdateCompanyDetailsInput } from './dto/ptadmin-update-company.dto';
import { AdminCreateUserInput } from './dto/ptadmin-add-user.dto';
import { AdminCreateCompanyInput } from './dto/ptadmin-add-company.dto';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import * as generator from 'password-generator';
import { ImportedCompanyExcel } from 'src/entities/company-imported-excel.entity';
import {
  FinancialInstitutionStatus,
  FinancialInstitutionsDetails,
} from 'src/entities/financial-institution-deatils.entity';
import { AdminAddFinInstitutionInput } from './dto/ptadmin-add-fin-institution.dto';
import { AdminUpdateFinInsInput } from './dto/ptadmin-update-fin-institution.dto';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { CreateSystemCompanySignupInput } from 'src/api/users/signup/dto/create-company-signup.input';
import { CreateSystemCompanySpecificRoles } from 'src/api/users/signup/dto/create-company-specific-roles.input';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SignupService } from 'src/api/users/signup/signup.service';
import { Invitations } from 'src/entities/invitations.entity';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import {
  AdminAddHolidayInput,
  AdminUpdateHolidayInput,
} from './dto/pt-holidays-input.dto';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var bcrypt = require('bcryptjs');
const saltOrRounds = bcrypt.genSaltSync(5);
const XLSX = require('xlsx');
import * as fs from 'fs';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { UpdateBusinessFreeAccessInput } from './dto/ptadmin-update-free-access.dto';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';

@Injectable()
export class PtAdminAccessService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    @InjectRepository(ImportedCompanyExcel)
    private importedCompany: Repository<ImportedCompanyExcel>,
    @InjectRepository(FinancialInstitutionsDetails)
    private financialInsDetails: Repository<FinancialInstitutionsDetails>,
    @InjectRepository(HolidayDetails)
    private holidayDetails: Repository<HolidayDetails>,
    @InjectRepository(EmailTemplates)
    private emailTemplateRepo: Repository<EmailTemplates>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(Invitations) private invitations: Repository<Invitations>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    private readonly signupService: SignupService,
    private readonly emailServices: EmailService,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('ADMIN_ACCESS_SERVICE');
  }

  async listAllUsers(
    keyword: string,
    status: UserStatus | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<{ users: any[]; totalCount: number }> {
    const queryBuilder = this.userDetails
      .createQueryBuilder('user')
      .select([
        'user.id as id',
        'user.user_id as user_id',
        'user.first_name as first_name',
        'user.last_name as last_name',
        'user.email_id as email_id',
        'user.occupation as occupation',
        'user.position_title as position_title',
        'user.company_name as company_name',
        'user.user_status as user_status',
        'user.user_role as user_role',
        'user.user_address as user_address',
        'user.place_id as place_id',
        'user.region as region',
        'user.country as country',
        'user.latitude as latitude',
        'user.longitude as longitude',
        'user.user_phone_no as user_phone_no',
        'user.is_admin_contacted as is_admin_contacted',
        'user.created_on as created_on',
        'c.company_id as user_company_id',
        'c.company_name as user_company_name',
        'sd.subscription_id as subscription_id',
        'sd.plan_id as plan_id',
        'sd.status as subscription_status',
        'sd.expiry_date as expiry_date',
        'sd.is_free_plan_eligible as is_free_plan_eligible',
        'sd.free_plan_reason as free_plan_reason',
        `CASE 
            WHEN sd.is_free_plan_eligible = 'true' THEN 'Free Premium'
            ELSE pd.plan_name
          END as plan_name
          `,
      ])
      .innerJoin(CompanyUserRoles, 'cr', `cr.user_id = user.user_id`)
      .innerJoin(
        CompanyDetails,
        'c',
        `cr.user_id = user.user_id AND cr.company_id = c.company_id AND c.is_system_added = 'true'`,
      )
      .leftJoin(SubscriptionDetails, 'sd', `sd.company_id = c.company_id`)
      .leftJoin(SubscriptionPlanDetails, 'pd', `sd.plan_id = pd.plan_id`);

    if (status) {
      queryBuilder.andWhere('user.user_status = :status', { status });
    } else {
      queryBuilder.andWhere('user.user_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(user.email_id) LIKE :keyword OR CONCAT(LOWER(user.first_name), ' ', LOWER(user.last_name)) LIKE :keyword)`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'user.created_on': 'DESC' });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'user_id':
          {
            queryBuilder.orderBy('user.user_id', sorting_order);
          }
          break;
        case 'first_name':
          {
            queryBuilder.orderBy({ 'LOWER(user.first_name)': sorting_order });
          }
          break;
        case 'last_name':
          {
            queryBuilder.orderBy({ 'LOWER(user.last_name)': sorting_order });
          }
          break;
        case 'email_id':
          {
            queryBuilder.orderBy({ 'LOWER(user.email_id)': sorting_order });
          }
          break;
        case 'user_role':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(user.user_role AS text))': sorting_order,
            });
          }
          break;
        case 'position_title':
          {
            queryBuilder.orderBy({
              'LOWER(user.position_title)': sorting_order,
            });
          }
          break;
        case 'user_phone_no':
          {
            queryBuilder.orderBy({ 'user.user_phone_no': sorting_order });
          }
          break;
        case 'occupation':
          {
            queryBuilder.orderBy({ 'LOWER(user.occupation)': sorting_order });
          }
          break;
        case 'is_admin_contacted':
          {
            queryBuilder.orderBy({ 'user.is_admin_contacted': sorting_order });
          }
          break;
        case 'user_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(user.user_status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [allUsers, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            totalCount,
          )
        : totalCount;
    // Slice the results array to get the results for the current page
    const users = allUsers?.slice(startIndex, endIndex);

    return { users, totalCount };
  }

  async getUserById(id: number) {
    const result = await this.userDetails.findOne({
      where: { user_id: id },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`User with id ${id} not found`);
    }

    return result;
  }

  async getCompanyById(id: number) {
    const queryBuilder = this.companyDetails
      .createQueryBuilder('c')
      .where('c.company_id = :id', { id })
      .andWhere('c.is_system_added = false')
      .select([
        'c.company_id AS id', // map c.company_id to id
        'c.*', // select all columns from CompanyDetails table
        'file.file_path AS icon_file_path',
        'file.file_type AS icon_file_type',
        'role.user_id AS primary_admin_id',
        `user.first_name || ' ' || user.last_name AS primary_admin_name`,
      ])
      .leftJoin(
        CompanyUserRoles,
        'role',
        `c.company_id = role.company_id and role.company_role = 'PRIMARY ADMIN' and role.status = 'Active'`,
      )
      .leftJoin(UserDetails, 'user', `role.user_id = user.user_id`)
      .leftJoin(
        FileAttachments,
        'file',
        'c.logo_id = file.id and file.attachment_type = :attachmentType',
        { attachmentType: 'Company_logo' },
      );

    const result = await queryBuilder.getRawOne();
    if (!result) {
      // Handle the case where no data is found for the given i
      throw new Error(`Company with id ${id} not found`);
    }

    return result;
  }

  async updateUser(
    updateUserDetailsInput: UpdateUserDetailsInput,
  ): Promise<any> {
    const user = await this.getUserById(updateUserDetailsInput.user_id);

    this.logger.log(
      `Admin updates user with payload: ${JSON.stringify(updateUserDetailsInput)}`,
    );

    if (!user) {
      throw new NotFoundException(`User not found`);
    } else {
      const updatedUser = { ...user, ...updateUserDetailsInput };
      updatedUser.user_status =
        updateUserDetailsInput.user_status || user.user_status;
      updatedUser.user_role =
        updateUserDetailsInput.user_role || user.user_role;
      updatedUser.first_name =
        updateUserDetailsInput.first_name || user.first_name;
      updatedUser.email_id = updateUserDetailsInput.email_id || user.email_id;
      return await this.userDetails.save(updatedUser);
    }
  }

  async resetUserPassword(id: string) {
    const user = await this.userDetails.findOne({
      where: { id },
    });
    this.logger.log(
      `Admin reset user password of user: ${JSON.stringify(user)}`,
    );
    const newPassword = generator(12, false, /[\w\d!@#$%^&*()-_=+]/);
    const EncrypNewPassword = await bcrypt.hashSync(
      String(newPassword),
      saltOrRounds,
    );
    user.password = EncrypNewPassword;
    await this.userDetails.save(user);

    return { user: { ...user, newPassword } };
  }

  async listAllCompanies(
    keyword: string,
    plan: string,
    blocked: boolean,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<{ companies: any[]; totalCount: number }> {
    const queryBuilder = await this.companyDetails
      .createQueryBuilder('company')
      .select([
        'company.id as id',
        'company.company_id as company_id',
        'company.company_name as company_name',
        'company.company_email_id as company_email_id',
        'company.legal_company_name as legal_company_name',
        'company.entity_type as entity_type',
        'company.company_phone_no as company_phone_no',
        'company.company_address as company_address',
        'company.place_id as place_id',
        'company.country as country',
        'company.region as region',
        'company.latitude as latitude',
        'company.longitude as longitude',
        'company.qbcc_number as qbcc_number',
        'company.acn_number as acn_number',
        'company.abn_number as abn_number',
        'company.tfn_number as tfn_number',
        'company.vat_number as vat_number',
        'company.utr_number as utr_number',
        'company.is_verified as is_verified',
        'company.is_admin_blocked as is_admin_blocked',
        'sd.subscription_id as subscription_id',
        'sd.plan_id as plan_id',
        'sd.status as subscription_status',
        'sd.expiry_date as expiry_date',
        'sd.is_free_plan_eligible as is_free_plan_eligible',
        'sd.free_plan_reason as free_plan_reason',
        `CASE 
          WHEN sd.is_free_plan_eligible = 'true' THEN 'Free Premium'
          ELSE pd.plan_name
        END as plan_name
        `,
        'role.user_id AS primary_admin_id',
        `user.first_name || ' ' || user.last_name AS primary_admin_name`,
      ])
      .leftJoin(
        CompanyUserRoles,
        'role',
        `company.company_id = role.company_id and role.company_role = 'PRIMARY ADMIN' and role.status = 'Active'`,
      )
      .leftJoin(UserDetails, 'user', `role.user_id = user.user_id`)
      .leftJoin(SubscriptionDetails, 'sd', `sd.company_id = company.company_id`)
      .leftJoin(SubscriptionPlanDetails, 'pd', `sd.plan_id = pd.plan_id`)
      .where('company.is_system_added = false');

    if (plan === 'Free Premium') {
      queryBuilder.andWhere(`sd.is_free_plan_eligible = 'true'`);
    } else if (plan && plan !== 'Free Premium') {
      queryBuilder.andWhere('pd.plan_name = :plan', { plan });
    }

    if (blocked !== undefined) {
      if (blocked !== null) {
        queryBuilder.andWhere('company.is_admin_blocked = :blocked', {
          blocked,
        });
      }
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(company.company_name) LIKE :keyword OR
        LOWER(company.legal_company_name) LIKE LOWER(:keyword) OR
        LOWER(company.company_email_id) LIKE LOWER(:keyword) OR
        LOWER(company.qbcc_number) LIKE LOWER(:keyword))`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'company.created_on': 'DESC' });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'company_id':
          {
            queryBuilder.orderBy('company.company_id', sorting_order);
          }
          break;
        case 'company_name':
          {
            queryBuilder.orderBy({
              'LOWER(company.company_name)': sorting_order,
            });
          }
          break;
        case 'legal_company_name':
          {
            queryBuilder.orderBy({
              'LOWER(company.legal_company_name)': sorting_order,
            });
          }
          break;
        case 'entity_type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(company.entity_type AS text))': sorting_order,
            });
          }
          break;
        case 'expiry_date':
          {
            queryBuilder.orderBy({ 'sd.expiry_date': sorting_order });
          }
          break;
        case 'plan_name':
          {
            queryBuilder.orderBy({ 'LOWER(pd.plan_name)': sorting_order });
          }
          break;
        case 'is_admin_blocked':
          {
            queryBuilder.orderBy({ 'company.is_admin_blocked': sorting_order });
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            totalCount,
          )
        : totalCount;

    // Slice the results array to get the results for the current page
    const companies = rawResults.slice(startIndex, endIndex);
    return { companies, totalCount };
  }

  async updateCompany(
    updateCompanyDetailsInput: UpdateCompanyDetailsInput,
  ): Promise<any> {
    const company = await this.getCompanyById(
      updateCompanyDetailsInput.company_id,
    );

    if (!company) {
      throw new NotFoundException(`Company not found`);
    } else {
      const updatedCompany = { ...company, ...updateCompanyDetailsInput };

      updatedCompany.company_name =
        updateCompanyDetailsInput.company_name || company.company_name;
      updatedCompany.company_email_id =
        updateCompanyDetailsInput.company_email_id || company.company_email_id;
      updatedCompany.company_phone_no =
        updateCompanyDetailsInput.company_phone_no || company.company_phone_no;
      updatedCompany.company_address =
        updateCompanyDetailsInput.company_address || company.company_address;
      updatedCompany.qbcc_number =
        updateCompanyDetailsInput.qbcc_number || company.qbcc_number;
      updatedCompany.abn_number =
        updateCompanyDetailsInput.abn_number || company.abn_number;

      await this.companyDetails.save(updatedCompany);

      return updatedCompany;
    }
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

  async createUser(decoded, adminCreateUserInput: AdminCreateUserInput) {
    try {
      this.logger.log(
        `Admin creates a user with payload: ${JSON.stringify(adminCreateUserInput)}`,
      );
      adminCreateUserInput.first_name = await startCasePreserveUnicode(
        adminCreateUserInput.first_name,
      );
      adminCreateUserInput.last_name = await startCasePreserveUnicode(
        adminCreateUserInput.last_name,
      );
      // const newPassword = uuidv4().slice(0,8);
      const newPassword = generator(12, false, /[\w\d!@#$%^&*()-_=+]/);
      const EncrypNewPassword = await bcrypt.hashSync(
        String(newPassword),
        saltOrRounds,
      );
      adminCreateUserInput.created_by = decoded?.userId;
      adminCreateUserInput.created_group = 'ADMIN';
      adminCreateUserInput.created_on = moment.tz('UTC');

      const newUserInput = {
        ...adminCreateUserInput,
        password: EncrypNewPassword,
        is_verified: true,
        is_admin_contacted: true,
        is_admin_added: true,
      };

      const user = await this.userDetails.create(newUserInput);
      const userResponse = await this.userDetails.save(user);

      const userDetails = await this.userDetails.findOne({
        where: { email_id: userResponse.email_id, user_status: 'Active' },
      });

      const createCompanySignupInput: CreateSystemCompanySignupInput = {
        company_name: userResponse.first_name + ' ' + userResponse.last_name,
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
        created_by: decoded?.userId,
        created_group: 'ADMIN',
        created_on: moment.tz('UTC'),
      };

      const companyDetails = await this.companyDetails.create(
        createCompanySignupInput,
      );
      await this.companyDetails.save(companyDetails);
      companyDetails.company_id = 1000 + Number(companyDetails.company_id);

      await this.signupService.insertSubscriptionDetails(
        companyDetails.company_id,
        userDetails.user_id,
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
          created_group: 'ADMIN',
          created_on: moment.tz('UTC'),
          created_by: decoded?.userId,
        };

      const userRoles = await this.userRoles.create(
        createCompanySpecificRolesInput,
      );
      await this.userRoles.save(userRoles);

      userDetails.user_role = Role.STANDARD_USER;

      await this.userDetails.save(userDetails);

      const inviteDetails = await this.invitations.find({
        where: {
          email_id: ILike(`${userResponse.email_id}`),
          is_admin_requested: true,
        },
      });

      if (
        inviteDetails &&
        inviteDetails !== null &&
        inviteDetails[0] !== null &&
        inviteDetails.length > 0
      ) {
        var inviteArr = [];
        for (const element of inviteDetails) {
          const createUserAccessInput: any = {
            user_name: await startCasePreserveUnicode(element.user_name),
            user_id: userDetails.user_id,
            company_id: element.company_id,
            company_role: element.company_role,
            manage_user: element.manage_user,
            manage_subscription: element.manage_subscription,
            manage_project_trust_payment: element.manage_project_trust_payment,
            manage_company: element.manage_company,
            created_on: moment.tz('UTC'),
            created_by: userDetails.user_id,
            created_group: 'USER',
            email_id: element.email_id,
          };

          const companyUserRoles = await this.userRoles.create(
            createUserAccessInput,
          );
          const roleResponse = await this.userRoles.save(companyUserRoles);

          if (roleResponse) {
            inviteArr.push(roleResponse);
          }
        }

        if (inviteArr) {
          inviteDetails.forEach((element) => {
            element.user_id = userDetails.user_id;
            element.updated_on = moment.tz('UTC');
            element.updated_by = userDetails.user_id;
            element.updated_group = 'USER';
          });
          await this.invitations.save(inviteDetails);
        }
      }

      return { user: { ...user, newPassword } };
    } catch (error) {
      this.logger.log(
        `Admin creates a user failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async addFinInsDetails(
    adminAddFinInstitutionsDetails: AdminAddFinInstitutionInput,
  ) {
    this.logger.log(
      `Admin adds a financial institution with payload: ${JSON.stringify(adminAddFinInstitutionsDetails)}`,
    );
    const finIncDetails = this.financialInsDetails.create(
      adminAddFinInstitutionsDetails,
    );
    return await this.financialInsDetails.save(finIncDetails);
  }

  async listAllFinIns(
    keyword: string,
    status: FinancialInstitutionStatus | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
    isAlphabeticalOrder?: boolean,
  ): Promise<{ institutions: any[]; totalCount: number }> {
    const queryBuilder = this.financialInsDetails.createQueryBuilder('bank');

    if (status) {
      queryBuilder.andWhere('bank.institution_status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(LOWER(bank.institution_name) LIKE LOWER(:keyword) OR LOWER(bank.institution_code) LIKE LOWER(:keyword))',
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }

    // Set the ordering based on the isAlphabeticalOrder flag
    if (isAlphabeticalOrder) {
      queryBuilder.orderBy('bank.institution_name', 'ASC');
    } else {
      queryBuilder.orderBy('bank.created_on', 'DESC');
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'bank.created_on': sorting_order });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'institution_name':
          {
            queryBuilder.orderBy({
              'LOWER(bank.institution_name)': sorting_order,
            });
          }
          break;
        case 'institution_status': {
          queryBuilder.orderBy({
            'LOWER(CAST(bank.institution_status AS text))': sorting_order,
          });
        }
        case 'created_on':
          {
            queryBuilder.orderBy('bank.created_on', sorting_order);
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            totalCount,
          )
        : totalCount;

    // Slice the results array to get the results for the current page
    const institutions = rawResults.slice(startIndex, endIndex);

    return { institutions, totalCount };
  }

  async getFinInsById(id: string) {
    const result = await this.financialInsDetails.findOne({
      where: { id: id },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Financial Institution with id ${id} not found`);
    }
    return result;
  }

  async getFinInstitutionByCode(code: string) {
    const result = await this.financialInsDetails.findOne({
      where: { institution_code: code },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Financial Institution with code ${code} not found`);
    }
    return result;
  }

  async getFinInstitutionByName(name: string) {
    const result = await this.financialInsDetails
      .createQueryBuilder('financialInsDetails')
      .where('LOWER(financialInsDetails.institution_name) = LOWER(:name)', {
        name,
      })
      .getOne();
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Financial Institution with name ${name} not found`);
    }
    return result;
  }

  async updateFinInsDetails(
    updateFinInsInput: AdminUpdateFinInsInput,
  ): Promise<any> {
    const finIns = await this.getFinInsById(updateFinInsInput.id);

    this.logger.log(
      `Admin updates financial institution with payload: ${JSON.stringify(updateFinInsInput)}`,
    );

    if (!finIns) {
      throw new NotFoundException(`Financial Institution not found`);
    } else {
      const updatedFinIns = { ...finIns, ...updateFinInsInput };

      updatedFinIns.institution_name =
        updateFinInsInput.institution_name || finIns.institution_name;
      updatedFinIns.institution_code =
        updateFinInsInput.institution_code || finIns.institution_code;
      updatedFinIns.institution_address =
        updateFinInsInput.institution_address || finIns.institution_address;
      updatedFinIns.institution_status =
        updateFinInsInput.institution_status || finIns.institution_status;
      updatedFinIns.acc_number_maxlength =
        updateFinInsInput.acc_number_maxlength || finIns.acc_number_maxlength;
      await this.financialInsDetails.save(updatedFinIns);

      return updatedFinIns;
    }
  }

  async createCompany(adminCreateCompanyInput: AdminCreateCompanyInput) {
    const company = this.companyDetails.create(adminCreateCompanyInput);
    const companyDetails = await this.companyDetails.save(company);
    const user = await this.getUserById(adminCreateCompanyInput.user_id);
    companyDetails.company_id = 1000 + Number(companyDetails.company_id);

    const companySpecificRoles = await this.userRoles.create({
      user_id: user.user_id,
      company_id: companyDetails.company_id,
      user_name: user.first_name + ' ' + user.last_name,
      company_role: Role.PRIMARY_ADMIN,
      status: 'Active',
    });

    if (user.user_role === Role.BASIC_USER) {
      user.user_role = Role.STANDARD_USER;
      await this.userDetails.save(user);
    }

    await this.userRoles.save(companySpecificRoles);

    await this.signupService.insertSubscriptionDetails(
      companyDetails.company_id,
      user.user_id,
    );

    return { companyDetails, user };
  }

  async addHolidayDetails(adminAddHolidayDetails: AdminAddHolidayInput) {
    this.logger.log(
      `Admin adds a holiday with payload: ${JSON.stringify(adminAddHolidayDetails)}`,
    );
    const holiday = this.holidayDetails.create(adminAddHolidayDetails);
    return await this.holidayDetails.save(holiday);
  }

  async getHolidayOfSameDate(getSameHolidayInput: AdminAddHolidayInput) {
    const holiday = await this.holidayDetails.findOne({
      where: {
        holiday_date: getSameHolidayInput.holiday_date,
        holiday_status: 'Active',
      },
    });
    return holiday;
  }

  async updateHolidayDetails(
    updateHolidayDetailsInput: AdminUpdateHolidayInput,
  ): Promise<any> {
    this.logger.log(
      `Admin updates the holiday details with payload: ${JSON.stringify(updateHolidayDetailsInput)}`,
    );
    const holiday = await this.getHolidayById(updateHolidayDetailsInput.id);

    if (!holiday) {
      throw new NotFoundException(`Holiday not found`);
    } else {
      const updatedHoliday = { ...holiday, ...updateHolidayDetailsInput };

      updatedHoliday.holiday_name =
        updateHolidayDetailsInput.holiday_name || holiday.holiday_name;
      updatedHoliday.holiday_date =
        updateHolidayDetailsInput.holiday_date || holiday.holiday_date;
      updatedHoliday.recurring_every_year =
        updateHolidayDetailsInput.recurring_every_year !== undefined
          ? updateHolidayDetailsInput.recurring_every_year
          : holiday.recurring_every_year;
      updatedHoliday.holiday_status =
        updateHolidayDetailsInput.holiday_status || holiday.holiday_status;

      await this.holidayDetails.save(updatedHoliday);
      return updatedHoliday;
    }
  }

  async getHolidayById(id: string) {
    const holidayDetails = await this.holidayDetails.findOne({ where: { id } });
    const holiday = {
      ...holidayDetails,
      holiday_date: holidayDetails.holiday_date
        ? new Date(holidayDetails.holiday_date)
        : new Date(0),
    };

    return holiday;
  }

  async extractDataFromExcel(payload: { filePath: string }) {
    try {
      const { filePath } = payload;

      if (!fs.existsSync) {
        throw new Error('Excel not found');
      }

      const workbook = XLSX.readFile(filePath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1, // Returns an array of arrays
        defval: '', // Use empty string for undefined cells
      });

      if (jsonData.length === 0) {
        throw new Error('Empty Excel sheet');
      }

      const headerRow = jsonData[0];
      const records = [];
      let header = null;

      const col1 = String(headerRow[0] || '')
        .trim()
        .toLowerCase();
      const col2 = String(headerRow[1] || '')
        .trim()
        .toLowerCase();
      const col3 = String(headerRow[2] || '')
        .trim()
        .toLowerCase();

      if (
        col1 === 'holiday name' &&
        col2 === 'holiday date' &&
        col3.includes('recurring yearly')
      ) {
        header = {
          holiday_name: col1,
          holiday_date: col2,
          recurring_every_year: col3,
        };
      } else {
        throw new Error(
          `Unsupported Excel format. Expected columns: 'Holiday Name, Holiday Date, Recurring yearly'. Found: '${col1}, ${col2}, ${col3}'`,
        );
      }

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const holiday_name = String(row[0] || '').trim();
        const holiday_date = row[1];
        const recurring_every_year = String(row[2] || '')
          .trim()
          .toLowerCase();

        const holidayDate =
          holiday_date && !isNaN(new Date(holiday_date).getTime())
            ? new Date(holiday_date)
            : null;

        const isRecurring = recurring_every_year === 'yes';

        records.push({
          holiday_name,
          holiday_date: holidayDate,
          recurring_every_year: isRecurring,
        });
      }

      return { header, records };
    } catch (error) {
      throw error;
    }
  }

  async addHolidayFromExcel(payload: {
    filePath: string;
    actionType?: 'save';
  }) {
    try {
      const { filePath, actionType } = payload;
      let response: any[] = [],
        validRecord: any[] = [],
        inValidRecord: any[] = [];

      // extracted data
      const { header, records } = await this.extractDataFromExcel({ filePath });

      for (const [rowNo, holiday] of records?.entries()) {
        const excelRowNow = rowNo + 2; // match Excel row number
        if (!holiday?.holiday_date || !holiday?.holiday_name) {
          inValidRecord.push({
            ...holiday,
            message: `Invalid data`,
          });
          continue;
        }

        const sameHoliday = await this.getHolidayOfSameDate({
          holiday_date: holiday?.holiday_date,
          holiday_name: holiday?.holiday_name,
          recurring_every_year: holiday?.recurring_every_year,
        });

        if (sameHoliday) {
          inValidRecord.push({
            isValid: false,
            ...holiday,
            message: `Holiday is already added`,
          });
        } else {
          validRecord.push({
            ...holiday,
          });
        }
      }
      if (
        (!actionType &&
          inValidRecord?.length === 0 &&
          validRecord?.length > 0) ||
        (actionType === 'save' && validRecord?.length > 0)
      ) {
        for (const [rowNo, holiday] of validRecord?.entries()) {
          const newHoliday = await this.addHolidayDetails({
            holiday_date: holiday?.holiday_date,
            holiday_name: holiday?.holiday_name,
            recurring_every_year: holiday?.recurring_every_year,
          });

          if (newHoliday) {
            response.push({
              ...holiday,
              message: `Holiday added successfully`,
            });
          } else {
            response.push({
              ...holiday,
              message: `Failed to save`,
            });
          }
        }
      }

      return {
        status:
          ((inValidRecord?.length === 0 && !actionType) || actionType) &&
          validRecord?.length > 0
            ? true
            : false,
        inValidRecord,
        is_valid_record_available: validRecord?.length > 0 ? true : false,
      };
    } catch (error) {
      return {
        status: false,
        message: error?.message,
      };
    }
  }

  async listAllHolidays(
    keyword: string,
    status: string | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: string | 'DESC',
    startDate?: string,
    endDate?: string,
  ): Promise<{ holidays: any[]; totalCount: number }> {
    const queryBuilder = this.holidayDetails
      .createQueryBuilder('holiday')
      .where('holiday.holiday_status != :status', { status: 'Deleted' });

    if (status) {
      queryBuilder.andWhere('holiday.holiday_status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        'LOWER(holiday.holiday_name) LIKE LOWER(:keyword)',
        {
          keyword: `%${keyword.toLowerCase()}%`,
        },
      );
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'holiday.holiday_date BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    const sortingOrder = sorting_order === 'ASC' ? 'ASC' : 'DESC';
    if (sorting_field) {
      switch (sorting_field) {
        case 'holiday_name':
          queryBuilder.orderBy('LOWER(holiday.holiday_name)', sortingOrder);
          break;
        case 'holiday_date':
          queryBuilder.orderBy('holiday.holiday_date', sortingOrder);
          break;
        case 'recurring_every_year':
          queryBuilder.orderBy('holiday.recurring_every_year', sortingOrder);
          break;
        case 'holiday_status':
          queryBuilder.orderBy(
            'LOWER(CAST(holiday.holiday_status AS text))',
            sortingOrder,
          );
          break;
        default:
          queryBuilder.orderBy('holiday.holiday_date', sortingOrder);
      }
    } else {
      queryBuilder.orderBy('holiday.holiday_date', sortingOrder);
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const startIndex = page && perPage ? (page - 1) * perPage : 0;
    const endIndex =
      page && perPage
        ? Math.min((page - 1) * perPage + perPage, totalCount)
        : totalCount;

    // const holidays = rawResults.slice(startIndex, endIndex);
    const holidays = rawResults.slice(startIndex, endIndex).map((holiday) => ({
      ...holiday,
      holiday_date: holiday.holiday_date
        ? new Date(holiday.holiday_date)
        : new Date(0),
    }));
    return { holidays, totalCount };
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

  async checkAndNotifyNonRecurringHolidaysForNextYear(): Promise<void> {
    const nextYear = new Date().getFullYear() + 1;

    const nextYearNonRecurringHolidays = await this.holidayDetails.find({
      where: {
        recurring_every_year: false,
        holiday_status: 'Active',
        holiday_date: Between(
          new Date(`${nextYear}-01-01`),
          new Date(`${nextYear}-12-31`),
        ),
      },
    });

    if (nextYearNonRecurringHolidays.length === 0) {
      const portalAdmin_details = await this.adminDetails.findOne({
        where: {
          // admin_role: In(['PORTAL ADMIN']),
          // admin_id: 1001,
          admin_role: Role.PORTAL_ADMIN,
          admin_status: 'Active',
        },
      });

      const notificationEmailTemplate = await this.emailTemplateRepo.findOne({
        where: { email_type: 'admin-add-holidays-reminder' },
      });

      const mailDynamicData = {
        holidays_count:
          nextYearNonRecurringHolidays.length > 0
            ? nextYearNonRecurringHolidays.length
            : 'no',
        next_year: nextYear,
        admin_name:
          portalAdmin_details.first_name + ' ' + portalAdmin_details.last_name,
      };

      const Keys = notificationEmailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        notificationEmailTemplate.email_content,
        dynamicData,
      );

      var mailDetails = {
        toEmail: process.env.NOTICE_PAYTRADE_ADMIN_DELEGATE,
        // ccMail: notice_mail.email_cc,
        subject: `Reminder mail to add holiday list `,
        template: 'header-footer-email',
        mailBody: String(mailbody),
        mail_type: EmailTypeEnum.holidayReminder,
      };

      await this.emailQueueProducer.emailQueueProducer(mailDetails);
      // await this.emailServices.sendMail(mailDetails);
    }
  }

  async mapRecurringHolidaysForNextYear(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const recurringHolidays = await this.holidayDetails
      .createQueryBuilder('holiday')
      .where('holiday.recurring_every_year = true')
      .andWhere('EXTRACT(YEAR FROM holiday.holiday_date) = :year', {
        year: currentYear,
      })
      .andWhere('holiday.holiday_status != :status', { status: 'Deleted' })
      .getMany();

    for (const holiday of recurringHolidays) {
      const newDate = new Date(holiday.holiday_date);
      newDate.setFullYear(nextYear);

      const exists = await this.holidayDetails.findOne({
        where: {
          holiday_name: holiday.holiday_name,
          holiday_date: newDate,
          recurring_every_year: true,
        },
      });

      if (!exists) {
        const copy = this.holidayDetails.create({
          ...holiday,
          id: undefined,
          holiday_date: newDate,
          created_on: new Date(),
          updated_on: new Date(),
        });

        await this.holidayDetails.save(copy);
      }
    }
  }

  async getHolidayTableStatus(): Promise<{
    warning: boolean;
    days_remaining: number;
    latest_holiday_date: string | null;
    total_active_holidays: number;
    status_message: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeHolidaysCount = await this.holidayDetails.count({
      where: { holiday_status: 'Active' as any },
    });

    const latestHoliday = await this.holidayDetails
      .createQueryBuilder('holiday')
      .where('holiday.holiday_status = :status', { status: 'Active' })
      .orderBy('holiday.holiday_date', 'DESC')
      .getOne();

    if (!latestHoliday) {
      return {
        warning: true,
        days_remaining: 0,
        latest_holiday_date: null,
        total_active_holidays: 0,
        status_message:
          'No active holidays found. Please add public holidays to ensure accurate business day calculations.',
      };
    }

    const latestDate = new Date(latestHoliday.holiday_date);
    latestDate.setHours(0, 0, 0, 0);
    const diffMs = latestDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const WARNING_THRESHOLD_DAYS = 90;
    const isWarning = daysRemaining <= WARNING_THRESHOLD_DAYS;

    let statusMessage: string;
    if (daysRemaining <= 0) {
      statusMessage =
        'Holiday table has expired! All dates are in the past. Please add future public holidays immediately.';
    } else if (daysRemaining <= 30) {
      statusMessage = `Critical: Only ${daysRemaining} days of holiday coverage remaining. Add future dates now.`;
    } else if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
      statusMessage = `Holiday table coverage ends in ${daysRemaining} days. Please add holidays for the upcoming period.`;
    } else {
      statusMessage = `Holiday table is up to date with coverage for the next ${daysRemaining} days.`;
    }

    return {
      warning: isWarning,
      days_remaining: daysRemaining,
      latest_holiday_date: latestDate.toISOString().split('T')[0],
      total_active_holidays: activeHolidaysCount,
      status_message: statusMessage,
    };
  }

  async sendHolidayExpiryAlert(): Promise<void> {
    const status = await this.getHolidayTableStatus();
    if (!status.warning) return;

    const portalAdmin = await this.adminDetails.findOne({
      where: {
        admin_role: Role.PORTAL_ADMIN,
        admin_status: 'Active',
      },
    });

    if (!portalAdmin) return;

    const adminEmail =
      process.env.NOTICE_PAYTRADE_ADMIN_DELEGATE || portalAdmin.email_id;

    const mailDetails = {
      toEmail: adminEmail,
      subject: `Action Required: Holiday Table ${status.days_remaining <= 0 ? 'Expired' : 'Expiring Soon'} - ${status.days_remaining} days remaining`,
      template: 'header-footer-email',
      mailBody: `
        <h2>Holiday Table Maintenance Required</h2>
        <p>Dear ${portalAdmin.first_name},</p>
        <p>${status.status_message}</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Days of coverage remaining: <strong>${status.days_remaining}</strong></li>
          <li>Latest holiday date: <strong>${status.latest_holiday_date || 'None'}</strong></li>
          <li>Total active holidays: <strong>${status.total_active_holidays}</strong></li>
        </ul>
        <p>Please log in to the admin panel and navigate to <strong>Holidays</strong> to add future public holiday dates.</p>
        <p>Accurate holidays are essential for correct business day calculations on payment claims and QBCC notices.</p>
      `,
      mail_type: EmailTypeEnum.holidayReminder,
    };

    await this.emailQueueProducer.emailQueueProducer(mailDetails);
    this.logger.log(
      `Holiday expiry alert sent: ${status.days_remaining} days remaining`,
    );
  }

  // async exportAllCompanies() {
  //   const companies = await this.companyDetails.find();

  //   const worksheet = xlsx.utils.json_to_sheet(companies, {
  //     header: ['company_name', 'company_email_id', 'company_phone_no',], // Define headers as needed
  //   });

  //   const workbook = xlsx.utils.book_new();
  //   xlsx.utils.book_append_sheet(workbook, worksheet, 'Companies');

  //   const excelFilePath = 'exported_companies.xlsx';
  //   xlsx.writeFile(workbook, excelFilePath);

  //   return excelFilePath;
  // }

  // async importCompaniesFromExcel(filePath: string): Promise<any> {
  //   interface ExcelRow {
  //     company_id: number;
  //     company_name: string;
  //     company_email_id: string;
  //     company_phone_no: string;
  //     is_verified: boolean;

  //     // Add other properties as needed
  //   }

  //   // Read the uploaded Excel file
  //   const fileContent = fs.readFileSync(filePath);
  //   const workbook = xlsx.read(fileContent, { type: 'buffer' });

  //   // Assume the first sheet contains the data
  //   const sheetName = workbook.SheetNames[0];
  //   const sheet = workbook.Sheets[sheetName];

  //   // Convert Excel data to JSON format
  //   const jsonData: ExcelRow[] = xlsx.utils.sheet_to_json<ExcelRow>(sheet);

  //   // Map JSON data to entities and save to the database
  //   for (const row of jsonData) {

  //     const company = this.importedCompany.create({
  //       company_name: row.company_name,
  //       company_email_id: row.company_email_id,
  //       company_phone_no: row.company_phone_no,
  //       company_id: row.company_id,
  //       // Map other properties as needed
  //     });

  //     await this.importedCompany.save(company);
  //   }
  //   return "Success";

  // }

  async updateBusinessFreeAccess(payload: UpdateBusinessFreeAccessInput) {
    try {
      const company = await this.companyDetails.findOne({
        where: {
          company_id: payload.company_id,
        },
      });

      if (!company) {
        throw new NotFoundException(`Company not found`);
      } else {
        const cmpySubscriptionDetail = await this.subscriptionDetails.findOne({
          where: {
            company_id: company?.company_id,
          },
        });

        if (!cmpySubscriptionDetail)
          throw new NotFoundException(`Subscription details not found`);

        if (!payload?.is_free_plan_eligible) {
          const expiredSubscriptionDetails =
            await this.subscriptionDetails.findOne({
              where: {
                company_id: company?.company_id,
                status: In(['Subscribed', 'Cancelled', 'Unsubscribed']),
                is_free_plan_eligible: true,
              },
              select: [
                'id',
                'subscription_id',
                'company_id',
                'expiry_date',
                'amount',
                'status',
              ],
              order: { company_id: 'DESC' },
            });

          this.logger.log(`expiredSubscriptionDetails: ${JSON.stringify(expiredSubscriptionDetails)}`);

          if (expiredSubscriptionDetails) {
            const expireIntegrations = await this.integrationDetails.findOne({
              where: {
                company_id: company?.company_id,
                integration_status: Not(In(['Inactive', 'Deleted - archived'])),
              },
              order: { company_id: 'DESC' },
            });

            this.logger.log(`expireIntegrations: ${JSON.stringify(expireIntegrations)}`);
            if (expireIntegrations) {
              const updateIntegrationResult = await this.integrationDetails
                .createQueryBuilder()
                .update(IntegrationDetails)
                .set({
                  previous_status: () =>
                    `(integration_status)::text::integration_details_previous_status_enum`,
                  integration_status: 'Inactive',
                  updated_on: moment.tz('UTC'),
                  updated_group: 'SYSTEM',
                })
                .where(`integration_id =:integration_id`, {
                  integration_id: expireIntegrations?.integration_id,
                })
                .execute();

              this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
              this.logger.log('Integration updated for expired subscriptions!');
            }
          }
        } else {
          const activeSubscriptionDetails =
            await this.subscriptionDetails.findOne({
              where: {
                company_id: company?.company_id,
                status: In(['Subscribed', 'Cancelled', 'Unsubscribed']),
                is_free_plan_eligible: false,
              },
              select: [
                'id',
                'subscription_id',
                'company_id',
                'expiry_date',
                'amount',
                'status',
              ],
              order: { company_id: 'DESC' },
            });

          this.logger.log(`activeSubscriptionDetails: ${JSON.stringify(activeSubscriptionDetails)}`);

          if (activeSubscriptionDetails) {
            const activeXeroIntegrations =
              await this.xeroIntegrationDetails.find({
                where: { company_id: company?.company_id, status: 'ACTIVE' },
              });
            if (activeXeroIntegrations) {
              const activeIntegrations = await this.integrationDetails.findOne({
                where: {
                  company_id: company?.company_id,
                  integration_status: 'Inactive',
                  previous_status: Not(In(['Inactive', 'Deleted - archived'])),
                },
                order: { company_id: 'DESC' },
              });

              this.logger.log(`activeIntegrations: ${JSON.stringify(activeIntegrations)}`);
              if (activeIntegrations) {
                const updateIntegrationResult = await this.integrationDetails
                  .createQueryBuilder()
                  .update(IntegrationDetails)
                  .set({
                    previous_status: () =>
                      `(integration_status)::text::integration_details_previous_status_enum`,
                    integration_status: () =>
                      `(previous_status)::text::integration_details_integration_status_enum`,
                    updated_on: moment.tz('UTC'),
                    updated_group: 'SYSTEM',
                  })
                  .where(`integration_id =:integration_id`, {
                    integration_id: activeIntegrations?.integration_id,
                  })
                  .execute();

                this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
                this.logger.log('Integration updated for active subscriptions!');
              }
            }
          }
        }

        const updatedCmpyFreeAccess = await this.subscriptionDetails.update(
          {
            company_id: company?.company_id,
          },
          {
            is_free_plan_eligible: payload?.is_free_plan_eligible ?? false,
            free_plan_reason: payload?.free_plan_reason ?? null,
          },
        );

        return company;
      }
    } catch (error) {
      throw error;
    }
  }
}
