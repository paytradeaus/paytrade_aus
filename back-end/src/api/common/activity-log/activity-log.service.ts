import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CreateActivityLogInput } from './dto/create-activity-log.input';
import { UpdateActivityLogInput } from './dto/update-activity-log.input';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { GetActivityLogInput } from './dto/get-activity-log.input';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import {
  EventGroupRes,
  EventGroupResponse,
} from './response/event-group-list.response';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class ActivityLogService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ActivityLogNew)
    private activityLog: Repository<ActivityLogNew>,
    @InjectRepository(ActivityLogTemplates)
    private eventTemplates: Repository<ActivityLogTemplates>,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(BankAccounts)
    private BankDetails: Repository<BankAccounts>,
    @InjectRepository(NoticeDetails)
    private NoticeDetails: Repository<NoticeDetails>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRoles: Repository<CompanyUserRoles>,
  ) {
    this.logger = new PaytradeLogger('ACTIVITY_LOG_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getFullTimezoneName(event_date: Date, user_timezone: string) {
    const dateInUserTimezone = moment
      .utc(event_date)
      .tz(user_timezone)
      .toDate();

    // Use Intl.DateTimeFormat to get the full timezone name
    const fullTimezoneName = new Intl.DateTimeFormat('en-US', {
      timeZone: user_timezone,
      timeZoneName: 'long',
    }).format(dateInUserTimezone);

    return fullTimezoneName;
  }

  async insertActivityLog(createActivityLogInput: CreateActivityLogInput) {
    createActivityLogInput.created_group = createActivityLogInput.is_admin
      ? 'ADMIN'
      : 'USER';

    if (!createActivityLogInput.is_admin && !createActivityLogInput.from_user) {
      this.log('Skipping activity log insert: from_user is null for non-admin event');
      return null;
    }

    let userMode = null;
    if (!createActivityLogInput.is_admin && createActivityLogInput.from_user) {
      const fetchedUserDetails = await this.userDetails.findOne({
        where: { user_id: createActivityLogInput.from_user },
        select: ['user_mode'],
      });
      userMode = fetchedUserDetails?.user_mode ?? null;
    }

    createActivityLogInput.event_date = moment.tz('UTC');
    const activityLogDetails = await this.activityLog.create({
      ...createActivityLogInput,
      ...{
        user_mode: userMode,
      },
    });
    return await this.activityLog.save(activityLogDetails);
  }

  async getEventGroup(decoded?: any): Promise<any> {
    const requiredGroup = decoded?.isAdmin
      ? [
          { label: 'Blogs', value: 'Blogs' },
          { label: 'Business onboarding', value: 'Business onboarding' },
          { label: 'Communication', value: 'Communication' },
          { label: 'Email Templates', value: 'Email Templates' },
          { label: 'FAQ', value: 'FAQ' },
          { label: 'Login As User', value: 'Login As User' },
          { label: 'Manage Admin Users', value: 'Manage Admin Users' },
          { label: 'Manage Contents', value: 'Manage Contents' },
          { label: 'Manage Groups', value: 'Manage Groups' },
          { label: 'Masters', value: 'Masters' },
          { label: 'Notices', value: 'Notices' },
          { label: 'Resource Guides', value: 'Resource Guides' },
          { label: 'Signed in/out', value: 'Signed in/out' },
          {
            label: 'Subscription Management',
            value: 'Subscription Management',
          },
        ]
      : [
          { label: 'Bank accounts', value: 'Bank accounts' },
          { label: 'Client/Supplier', value: 'Client/Supplier' },
          { label: 'Contracts', value: 'Contracts' },
          { label: 'Variations', value: 'Variations' },
          { label: 'Manage business', value: 'Manage business' },
          { label: 'Manage users', value: 'Manage users' },
          { label: 'Notices', value: 'Notices' },
          { label: 'Payment claims', value: 'Payment claims' },
          { label: 'Payments', value: 'Payments' },
          { label: 'Projects', value: 'Projects' },
          { label: 'Signed in/out', value: 'Signed in/out' },
          { label: 'Subscriptions', value: 'Subscriptions' },
          { label: 'Journals', value: 'Journals' },
          { label: 'Bookkeeping', value: 'Book keeping' },
        ];

    const queryBuilder = await this.eventTemplates
      .createQueryBuilder('e')
      .select('ARRAY_AGG(e.id)', 'id_array')
      .addSelect('e.event_group', 'event_group')
      .distinct(true)
      .orderBy('e.event_group')
      .groupBy('e.event_group');

    queryBuilder.where(`e.event_by = :event_by`, {
      event_by: decoded?.isAdmin ? 'ADMIN' : 'USER',
    });

    const distinctEventGroups = await queryBuilder.getRawMany();

    const eventGroups = distinctEventGroups.map((row) => {
      return {
        name: row.event_group,
        value: row.id_array,
      };
    });
    return eventGroups;
  }

  async getUsersList(): Promise<any> {
    const usersList = await this.userDetails
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect(`concat(u.first_name, ' ', u.last_name)`, 'user_name')
      .distinct(true)
      // .where(`u.user_status = 'Active'`)
      .orderBy(`concat(u.first_name, ' ', u.last_name)`)
      .getRawMany();

    return usersList;
  }

  async getActivityLog(
    decoded,
    getActivityLogInput: GetActivityLogInput,
    timezone,
  ) {
    const {
      user_id,
      company_id,
      admin_id,
      event_group,
      page_number,
      page_size,
      sorting_field,
    } = getActivityLogInput;
    const skip =
      (getActivityLogInput.page_number - 1) * getActivityLogInput.page_size;

    const admin_role = (
      await this.adminDetails.findOne({ where: { admin_id } })
    )?.admin_role;
    const is_super = admin_role === 'PORTAL ADMIN';

    const queryBuilder = await this.activityLog
      .createQueryBuilder('log')
      // .select('log.from_user', 'from_user')
      // .addSelect('user.first_name', 'first_name')
      // .addSelect('user.last_name', 'last_name')
      // .addSelect('user.email_id', 'email_id')
      .select(
        'CASE WHEN log.from_user IS NOT NULL THEN log.from_user ELSE log.admin_id END',
        'from_user',
      )
      .addSelect(
        `CASE 
          WHEN log.is_admin IS TRUE AND log.admin_id IS NOT NULL AND template.event_by <> 'SYSTEM' THEN CASE WHEN ${is_super ? 'TRUE' : 'FALSE'} THEN 'Paytrade Admin (' || admin.email_id || ')' ELSE 'Admin (' || admin.email_id || ')' END 
          WHEN log.is_admin IS FALSE AND log.from_user IS NULL AND log.to_user IS NOT NULL AND log.admin_id IS NOT NULL AND template.event_by <> 'SYSTEM' THEN 'Admin' 
          WHEN log.is_admin IS FALSE AND log.from_user IS NOT NULL AND log.to_user IS NULL AND log.admin_id IS NULL AND template.event_by <> 'SYSTEM' THEN user.first_name 
          WHEN template.event_by = 'SYSTEM' THEN 'SYSTEM' 
          ELSE ''
        END`,
        'first_name',
      ) //admin.first_name
      .addSelect(
        `CASE 
          WHEN log.from_user IS NOT NULL AND log.to_user IS NULL AND log.admin_id IS NULL AND template.event_by <> 'SYSTEM' THEN user.last_name 
          ELSE '' 
        END`,
        'last_name',
      ) //admin.last_name
      .addSelect(
        'CASE WHEN log.from_user IS NOT NULL THEN user.email_id ELSE admin.email_id END',
        'email_id',
      )
      .addSelect('log.to_user', 'to_user')
      .addSelect('log.company_id', 'company_id')
      .addSelect('log.user_mode', 'user_mode')
      .addSelect('log.admin_id', 'admin_id')
      .addSelect('company.company_name', 'company_name')
      .addSelect('company.company_email_id', 'company_email_id')
      .addSelect('log.event_template_id', 'event_template_id')
      .addSelect('template.event_group', 'event_group')
      .addSelect('template.event_type', 'event_type')
      .addSelect('template.event_text', 'event_text')
      // .addSelect('log.dynamic_values', 'dynamic_values')
      .addSelect('CAST(log.dynamic_values AS TEXT)', 'dynamic_values')
      .addSelect('log.event_date', 'event_date')
      .addSelect('log.is_admin', 'is_admin')
      .addSelect('log.created_on', 'created_on')
      .distinct(true)
      .innerJoin('log.logTemplates', 'template')
      .leftJoin('log.userDetails', 'user')
      .leftJoin('log.companyDetails', 'company')
      .leftJoin('log.adminDetails', 'admin');

    // if (user_id) {
    //   queryBuilder.where('log.to_user = :user_id', { user_id });
    //   queryBuilder.where('log.from_user = :user_id', { user_id });
    // }
    if (admin_id) {
      queryBuilder.where(`log.admin_id = :admin_id`, {
        admin_id: admin_id,
      });
    } else {
      if (decoded?.isAdmin && decoded?.role === Role.PORTAL_ADMIN) {
        const admin_ids = await this.adminDetails
          .createQueryBuilder('a')
          .select('ARRAY_AGG(a.admin_id)', 'id_array')
          .distinct(true)
          .where(`a.admin_status = 'Active'`)
          .getRawOne();
        const id_array =
          admin_ids && admin_ids.id_array
            ? admin_ids.id_array
            : [decoded?.admin_id];
        queryBuilder.where(
          'log.admin_id IN(:...idArray) AND log.is_admin IS TRUE',
          {
            idArray: id_array,
          },
        );
      } else if (
        decoded?.isAdmin &&
        decoded?.role === Role.RESTRICTED_PORTAL_ADMIN
      ) {
        queryBuilder.where('log.admin_id = :user_id AND log.is_admin IS TRUE', {
          user_id: decoded?.userId,
        });
      } else {
        const is_system_added = company_id
          ? (await this.companyDetails.findOne({ where: { company_id } }))
              ?.is_system_added
          : null;
        if (is_system_added) {
          queryBuilder.where(
            '(log.from_user = :user_id OR log.to_user = :user_id) AND log.is_admin IS FALSE',
            {
              user_id: decoded?.userId,
            },
          );
        }
      }
    }

    if (company_id) {
      queryBuilder.andWhere(`log.company_id = :companyId`, {
        companyId: company_id,
      });
    }

    if (event_group) {
      const event_template_ids = await this.eventTemplates
        .createQueryBuilder('e')
        .select('ARRAY_AGG(e.id)', 'id_array')
        .addSelect('e.event_group', 'event_group')
        .distinct(true)
        .where('e.event_group ILike :event_group', {
          event_group: `%${event_group}%`,
        })
        .orderBy('e.event_group')
        .groupBy('e.event_group')
        .getRawOne();

      queryBuilder.andWhere(`log.event_template_id IN(:...idArray)`, {
        idArray: event_template_ids.id_array,
      });
    }

    if (getActivityLogInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getActivityLogInput.date_filter === 'Custom' &&
        getActivityLogInput.start_date &&
        getActivityLogInput.end_date
      ) {
        startDate = moment
          .tz(getActivityLogInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getActivityLogInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (getActivityLogInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (getActivityLogInput.date_filter === 'Last Month') {
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
      queryBuilder.andWhere(
        'log.event_date BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getActivityLogInput.sorting_order
      ? getActivityLogInput.sorting_order
      : 'DESC';
    if (!sorting_field) {
      queryBuilder.orderBy({ 'log.created_on': sorting_order });
      if (page_number && page_size) {
        queryBuilder.offset((page_number - 1) * page_size).limit(page_size);
      }
    }
    if (
      sorting_field &&
      sorting_field !== 'first_name' &&
      sorting_field !== 'event_text'
    ) {
      switch (sorting_field) {
        case 'event_date':
          {
            queryBuilder.orderBy({ 'log.event_date': sorting_order });
          }
          break;
      }
      if (page_number && page_size) {
        queryBuilder.offset((page_number - 1) * page_size).limit(page_size);
      }
    }

    const [rawResults, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    //Manipulate the event_text based on user_mode.
    for (const result of rawResults) {
      if (result.user_mode == 'Onboarding') {
        //Modify the event_text for 'Onboarding'
        result.event_text = `Onboarding - ${result.event_text}`;
      }

      let user_timezone;
      let timeZone;
      if (result.admin_id) {
        const admin_details = await this.adminDetails.findOne({
          where: { admin_id: result.admin_id },
          select: ['user_timezone', 'first_name', 'last_name'],
        });
        user_timezone = admin_details.user_timezone;
        timeZone = await this.getFullTimezoneName(
          result.event_date,
          user_timezone,
        );
      }

      if ((result.from_user || result.to_user) && !result.admin_id) {
        const user_details = await this.userDetails.findOne({
          where: {
            user_id: result.from_user ? result.from_user : result.to_user,
          },
          select: ['user_timezone'],
        });

        user_timezone = user_details.user_timezone;
        timeZone = await this.getFullTimezoneName(
          result.event_date,
          user_timezone,
        );
      }

      result.timezone = timeZone ? timeZone.split(', ').pop() : null;
    }

    let finalResult, finalCount;
    if (sorting_field && sorting_field === 'first_name') {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.first_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.first_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.first_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.first_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        page_number && page_size ? (page_number - 1) * page_size : 0;
      const endIndex =
        page_number && page_size
          ? Math.min(
              (page_number - 1) * page_size + page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (sorting_field && sorting_field === 'event_text') {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.event_text
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.event_text?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.event_text
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.event_text?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        page_number && page_size ? (page_number - 1) * page_size : 0;
      const endIndex =
        page_number && page_size
          ? Math.min(
              (page_number - 1) * page_size + page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else {
      finalResult = rawResults;
      finalCount = total_count;
    }

    return { total_count: finalCount, activity_logs: finalResult };
  }

  async getSystemAddedCompanyId(user_id): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const companyDetails = await this.companyDetails
          .createQueryBuilder('c')
          .select('c.company_id', 'company_id')
          .distinct(true)
          .leftJoin(
            CompanyUserRoles,
            'r',
            'c.company_id = r.company_id and r.is_system_added = true and c.is_system_added = true',
          )
          .where('r.user_id = :user_id', {
            user_id: user_id,
          })
          .getRawOne();

        if (!companyDetails)
          throw `System added company details was not found.`;

        resolve(companyDetails?.company_id);
      } catch (error) {
        this.logger.error(
          `Errored while getting system added company id with message: ${error.message}`,
        );
        reject(error.message ? error.message : error);
      }
    });
  }

  async getCompanyIdofABank(bank_account_id): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const company_id = (
          await this.BankDetails.findOne({
            where: { bank_account_id: bank_account_id },
          })
        ).company_id;
        resolve(company_id);
      } catch (error) {
        this.logger.error(
          `Errored while getting company id of the bank account with message: ${error.message}`,
        );
      }
    });
  }

  async getCompanyIdofANotice(notice_id): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const company_id = (
          await this.NoticeDetails.findOne({
            where: { notice_id: notice_id },
          })
        ).company_id;
        resolve(company_id);
      } catch (error) {
        this.logger.error(
          `Errored while getting company id of the notice with message: ${error.message}`,
        );
      }
    });
  }

  async checkCompanyAuthorized(decoded: any, company_id: number) {
    return new Promise(async (resolve, reject) => {
      const user_id = decoded?.userId;
      if (user_id && company_id) {
        const queryBuilder = this.userDetails
          .createQueryBuilder('u')
          .select('u.id', 'id')
          .addSelect('u.user_id', 'user_id')
          .addSelect('r.company_id', 'company_id')
          .distinct(true)
          .leftJoin(CompanyUserRoles, 'r', 'u.user_id = r.user_id')
          .leftJoin(
            CompanyDetails,
            'c',
            `c.company_id = r.company_id ${!decoded?.logged_in_by || !decoded?.admin_id ? ' and c.is_admin_blocked = false' : ''}`,
          )
          .where('r.user_id = :user_id and r.company_id = :company_id', {
            user_id,
            company_id,
          });
        if (!decoded?.logged_in_by || !decoded?.admin_id) {
          queryBuilder.andWhere(`u.user_status = 'Active'`);
        }

        const result = await queryBuilder.getRawOne();
        if (result && result.id) {
          resolve(true);
        }
      }
      resolve(false);
    });
  }
}
