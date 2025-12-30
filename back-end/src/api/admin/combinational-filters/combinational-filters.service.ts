import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  FetchFiltersForComplianceInput,
  FetchFiltersForNoticeInput,
  FetchFiltersForTrustAccountingInput,
} from './combinational-filters.input';
import {
  GetFiltersForComplianceAdminResponse,
  GetFiltersForNoticeAdminResponse,
  GetFiltersForTAadminResponse,
} from './combinational-filters.response';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { Repository } from 'typeorm';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class AdminCombinationalFiltersService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(NoticeDetails)
    private noticeDetails: Repository<NoticeDetails>,
    @InjectRepository(BankAccounts)
    private accountDetails: Repository<BankAccounts>,
  ) {
    this.logger = new PaytradeLogger('ADMIN_COMBINATIONAL_FILTERS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async fetchFiltersForAdminTrustAccounting(
    data: FetchFiltersForTrustAccountingInput,
  ): Promise<GetFiltersForTAadminResponse> {
    try {
      const { company_id, bank_account_id, account_type } = data;

      // Initialize sets to avoid duplicates
      const companySet = new Set<string>();
      const accountSet = new Set<string>();
      const accountTypeSet = new Set<string>();

      const query = this.companyDetails
        .createQueryBuilder('company')
        .select([
          'company.company_id AS company_id',
          'company.company_name AS company_name',
          'account.bank_account_id AS bank_account_id',
          'account.account_name AS account_name',
          'account.account_type AS account_type',
          'account.opening_date AS opening_date',
        ])
        .leftJoin(
          BankAccounts,
          'account',
          `company.company_id = account.company_id AND account.added_by_client_supplier = false AND account.status NOT IN ('Draft', 'Deleted')`,
        );

      if (company_id) {
        query.andWhere('company.company_id = :company_id', { company_id });
      }

      if (bank_account_id) {
        query.andWhere('account.bank_account_id = :bank_account_id', {
          bank_account_id,
        });
      }

      if (account_type) {
        query.andWhere('account.account_type = :account_type', {
          account_type,
        });
      }

      const rawResults = await query.getRawMany();

      const companies = rawResults
        .filter((result) => result.company_id != null)
        .map((result) => ({
          company_id: result.company_id,
          company_name: result.company_name,
        }));

      const accounts = rawResults
        .filter((result) => result.bank_account_id != null)
        .map((result) => ({
          bank_account_id: result.bank_account_id,
          account_name: result.account_name,
          account_type: result.account_type,
          opening_date: result.opening_date,
        }));

      const accountTypes = rawResults
        .filter((result) => result.account_type != null)
        .map((result) => ({
          account_type: result.account_type,
        }));

      companies.forEach((record) => {
        companySet.add(
          JSON.stringify({
            name: record.company_name,
            value: record.company_id,
          }),
        );
      });

      accounts.forEach((record) => {
        accountSet.add(
          JSON.stringify({
            name: record.account_name,
            value: record.bank_account_id,
            account_type: record.account_type,
            opening_date: new Date(record.opening_date),
          }),
        );
      });

      accountTypes.forEach((record) => {
        accountTypeSet.add(
          JSON.stringify({
            name: record.account_type,
            value: record.account_type,
          }),
        );
      });

      // Convert sets to lists of objects
      const company_list: any[] = Array.from(companySet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_list: any[] = Array.from(accountSet)
        .map((item) => {
          const parsedItem = JSON.parse(item);
          return {
            ...parsedItem,
            opening_date: new Date(parsedItem.opening_date), // Re-convert to Date object
          };
        })
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_type_list: any[] = Array.from(accountTypeSet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      return framedResponse(
        'SUCCESS',
        `Filters of trust accounting successfully fetched.`,
        {
          company_list,
          account_list,
          account_type_list,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters of trust accounting with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchFiltersForAdminNotices(
    data: FetchFiltersForNoticeInput,
  ): Promise<GetFiltersForNoticeAdminResponse> {
    try {
      const {
        company_id,
        bank_account_id,
        account_type,
        notice_type,
        status,
        project_id,
        delegated_qbcc,
      } = data;

      // Initialize sets to avoid duplicates
      const companySet = new Set<string>();
      const accountSet = new Set<string>();
      const accountTypeSet = new Set<string>();
      const noticeTypeSet = new Set<string>();
      const projectSet = new Set<string>();

      const query = this.noticeDetails
        .createQueryBuilder('notice')
        .select([
          'notice.company_id AS company_id',
          'company.company_name AS company_name',
          'notice.bank_account_id AS bank_account_id',
          'account.account_name AS account_name',
          'account.account_type AS account_type',
          'account.opening_date AS opening_date',
          'notice.notice_type AS notice_type',
          'notice.project_id AS project_id',
          'project.project_name AS project_name',
        ])
        .distinct(true)
        .leftJoin(
          CompanyDetails,
          'company',
          `notice.company_id = company.company_id`,
        )
        .leftJoin(
          ProjectDetails,
          'project',
          `notice.project_id = project.project_id AND company.company_id = project.company_id`,
        )
        .leftJoin(
          BankAccounts,
          'account',
          `notice.bank_account_id = account.bank_account_id AND notice.company_id = account.company_id`,
        );
      if (delegated_qbcc) {
        query.andWhere('notice.delegated_qbcc = :delegated_qbcc', {
          delegated_qbcc,
        });
      }

      if (company_id) {
        query.andWhere('notice.company_id = :company_id', { company_id });
      }

      if (bank_account_id) {
        query.andWhere('notice.bank_account_id = :bank_account_id', {
          bank_account_id,
        });
      }

      if (account_type) {
        query.andWhere('account.account_type = :account_type', {
          account_type,
        });
      }

      if (notice_type) {
        query.andWhere('notice.notice_type = :notice_type', {
          notice_type,
        });
      }

      if (project_id) {
        query.andWhere('notice.project_id = :project_id', {
          project_id,
        });
      }

      if (status) {
        if (status === 'Deleted') {
          query.andWhere('notice.status IN (:...deleteStatuses)', {
            deleteStatuses: ['Delete-Unsent', 'Delete-Sent'],
          });
        } else {
          query.andWhere('notice.status = :noticeStatus', {
            noticeStatus: status,
          });
        }
      } else {
        query.andWhere('notice.status NOT IN (:...deleteStatuses)', {
          deleteStatuses: ['Delete-Unsent', 'Delete-Sent'],
        });
      }

      const rawResults = await query.getRawMany();

      const companies = rawResults
        .filter((result) => result.company_id != null)
        .map((result) => ({
          company_id: result.company_id,
          company_name: result.company_name,
        }));

      const accounts = rawResults
        .filter((result) => result.bank_account_id != null  && result.account_name != null)
        .map((result) => ({
          bank_account_id: result.bank_account_id,
          account_name: result.account_name,
          account_type: result.account_type,
          opening_date: result.opening_date,
        }));

      const accountTypes = rawResults
        .filter((result) => result.account_type != null)
        .map((result) => ({
          account_type: result.account_type,
        }));

      const noticeTypes = rawResults
        .filter((result) => result.notice_type != null)
        .map((result) => ({
          notice_type: result.notice_type,
        }));

      const projects = rawResults
        .filter(
          (result) => result.project_id != null && result.project_name != null
        )
        .map((result) => ({
          project_id: result.project_id,
          project_name: result.project_name,
        }));

      companies.forEach((record) => {
        companySet.add(
          JSON.stringify({
            name: record.company_name,
            value: record.company_id,
          }),
        );
      });

      accounts.forEach((record) => {
        accountSet.add(
          JSON.stringify({
            name: record.account_name,
            value: record.bank_account_id,
            account_type: record.account_type,
            opening_date: new Date(record.opening_date),
          }),
        );
      });

      accountTypes.forEach((record) => {
        accountTypeSet.add(
          JSON.stringify({
            name: record.account_type,
            value: record.account_type,
          }),
        );
      });

      noticeTypes.forEach((record) => {
        noticeTypeSet.add(
          JSON.stringify({
            name: record.notice_type,
            value: record.notice_type,
          }),
        );
      });

      projects.forEach((record) => {
        projectSet.add(
          JSON.stringify({
            name: record.project_name,
            value: record.project_id,
          }),
        );
      });

      // Convert sets to lists of objects
      const company_list: any[] = Array.from(companySet)
        ?.map((item) => JSON.parse(item))
        ?.sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_list: any[] = Array.from(accountSet)
        ?.map((item) => {
          const parsedItem = JSON.parse(item);
          return {
            ...parsedItem,
            opening_date: new Date(parsedItem.opening_date), // Re-convert to Date object
          };
        })
        ?.sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_type_list: any[] = Array.from(accountTypeSet)
        ?.map((item) => JSON.parse(item))
        ?.sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const notice_type_list: any[] = Array.from(noticeTypeSet)
        ?.map((item) => JSON.parse(item))
        ?.sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));



      const project_list: any[] = Array.from(projectSet)
        ?.map((item) => JSON.parse(item))
        ?.sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));


      return framedResponse(
        'SUCCESS',
        `Filters of notices successfully fetched.`,
        {
          company_list,
          account_list,
          account_type_list,
          notice_type_list,
          project_list,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters of notices with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchFiltersForAdminCompliance(
    data: FetchFiltersForComplianceInput,
  ): Promise<GetFiltersForComplianceAdminResponse> {
    try {
      const { company_id, project_id, bank_account_id, account_type } = data;

      // Initialize sets to avoid duplicates
      const companySet = new Set<string>();
      const projectSet = new Set<string>();
      const accountSet = new Set<string>();
      const accountTypeSet = new Set<string>();

      const query = this.companyDetails
        .createQueryBuilder('company')
        .select([
          'company.company_id AS company_id',
          'company.company_name AS company_name',
          'project.project_id AS project_id',
          'project.project_name AS project_name',
          'account.bank_account_id AS bank_account_id',
          'account.account_name AS account_name',
          'account.account_type AS account_type',
          'account.opening_date AS opening_date',
        ])
        .leftJoin(
          ProjectDetails,
          'project',
          `company.company_id = project.company_id AND project.project_status NOT IN ('Deleted')`,
        )
        .leftJoin(
          BankAccounts,
          'account',
          `company.company_id = account.company_id AND account.added_by_client_supplier = false AND account.status NOT IN ('Draft', 'Deleted') AND account.account_type <> 'Cash Account' AND project.project_id = ANY(string_to_array(account.project_ids, ',')::int[])`,
        );
      if (company_id) {
        query.andWhere('company.company_id = :company_id', { company_id });
      }

      if (bank_account_id) {
        query.andWhere('account.bank_account_id = :bank_account_id', {
          bank_account_id,
        });
      }

      if (account_type) {
        query.andWhere('account.account_type = :account_type', {
          account_type,
        });
      }

      if (project_id) {
        query.andWhere(`project.project_id = :project_id`, { project_id });
      }

      const rawResults = await query.getRawMany();

      const companies = rawResults
        .filter((result) => result.company_id != null)
        .map((result) => ({
          company_id: result.company_id,
          company_name: result.company_name,
        }));

      const projects = rawResults
        .filter((result) => result.project_id != null)
        .map((result) => ({
          project_id: result.project_id,
          project_name: result.project_name,
        }));

      const accounts = rawResults
        .filter((result) => result.bank_account_id != null)
        .map((result) => ({
          bank_account_id: result.bank_account_id,
          account_name: result.account_name,
          account_type: result.account_type,
          opening_date: result.opening_date,
        }));

      const accountTypes = rawResults
        .filter((result) => result.account_type != null)
        .map((result) => ({
          account_type: result.account_type,
        }));

      companies.forEach((record) => {
        companySet.add(
          JSON.stringify({
            name: record.company_name,
            value: record.company_id,
          }),
        );
      });

      projects.forEach((record) => {
        projectSet.add(
          JSON.stringify({
            name: record.project_name,
            value: record.project_id,
          }),
        );
      });

      accounts.forEach((record) => {
        accountSet.add(
          JSON.stringify({
            name: record.account_name,
            value: record.bank_account_id,
            account_type: record.account_type,
            opening_date: new Date(record.opening_date),
          }),
        );
      });

      accountTypes.forEach((record) => {
        accountTypeSet.add(
          JSON.stringify({
            name: record.account_type,
            value: record.account_type,
          }),
        );
      });

      // Convert sets to lists of objects
      const company_list: any[] = Array.from(companySet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const project_list: any[] = Array.from(projectSet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_list: any[] = Array.from(accountSet)
        .map((item) => {
          const parsedItem = JSON.parse(item);
          return {
            ...parsedItem,
            opening_date: new Date(parsedItem.opening_date), // Re-convert to Date object
          };
        })
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      const account_type_list: any[] = Array.from(accountTypeSet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      return framedResponse(
        'SUCCESS',
        `Filters of trust accounting successfully fetched.`,
        {
          company_list,
          project_list,
          account_list,
          account_type_list,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters of trust accounting with message: ${error}`,
      );
      throw error;
    }
  }
}
