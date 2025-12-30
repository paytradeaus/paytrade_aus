import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { Repository } from 'typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import { BankAccounts } from 'src/entities/banking.entity';
import { JournalsService } from 'src/api/users/banking/journals/journals.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

@Injectable()
export class AdminDashboardService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(UserDetails)
    private userDetailsRepo: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetailsRepo: Repository<ProjectDetails>,
    @InjectRepository(ReconciliationReport)
    private reconciliationReportRepo: Repository<ReconciliationReport>,
    @InjectRepository(SubscriptionTransaction)
    private subscriptionTransactionRepo: Repository<SubscriptionTransaction>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    private journalsService: JournalsService,
    private complianceService: CompliancesService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_DASHBOARD_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async fetchAllNewUsers() {
    try {
      this.logger.log(`Request received for fetching all new users.`);

      const fetchedNewUsers = await this.userDetailsRepo
        .createQueryBuilder('ud')
        .select([
          'ud.user_id AS user_id',
          'ud.first_name AS first_name',
          'ud.last_name AS last_name',
          'ud.created_on AS created_date',
          'ud.user_status AS status',
        ])
        .where('ud.is_admin_contacted = :is_admin_contacted', {
          is_admin_contacted: false,
        })
        .orderBy({ 'ud.created_on': 'DESC' })
        .getRawMany();

      this.logger.log(
        `All new users fetched successfully with data: ${JSON.stringify(fetchedNewUsers)}`,
      );

      return framedResponse(
        'SUCCESS',
        'All new users successfully fetched.',
        fetchedNewUsers,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all new users with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchAllNewCompanies() {
    try {
      this.logger.log(`Request received for fetching all new companies.`);

      const fetchedNewCompanies = await this.companyDetailsRepo
        .createQueryBuilder('cd')
        .select([
          'cd.company_id AS company_id',
          'cd.company_name AS company_name',
          'cd.created_on AS created_date',
          'cd.is_admin_blocked AS is_admin_blocked',
        ])
        .where('cd.created_on >= :threeMonthsAgo', {
          threeMonthsAgo: new Date(
            new Date().setMonth(new Date().getMonth() - 3),
          ),
        })
        .andWhere('cd.is_system_added = :is_system_added', {
          is_system_added: false,
        })
        .orderBy({ 'cd.created_on': 'DESC' })
        .getRawMany();

      if (fetchedNewCompanies && fetchedNewCompanies.length) {
        for (let company of fetchedNewCompanies) {
          company.status = company.is_admin_blocked ? 'Blocked' : 'Active';
        }
      }

      this.logger.log(
        `All new companies fetched successfully with data: ${JSON.stringify(fetchedNewCompanies)}`,
      );

      return framedResponse(
        'SUCCESS',
        'All new companies fetched successfully.',
        fetchedNewCompanies,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all new companies with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchAllCompaniesWithFailedSubscriptionStatus() {
    try {
      this.logger.log(
        `Request received for fetching all companies with failed subscription status.`,
      );

      const fetchedAllCompaniesWithFailedSubscriptions =
        await this.subscriptionTransactionRepo
          .createQueryBuilder('st')
          .select([
            'st.status AS transaction_status',
            'st.company_id AS company_id',
            'c.company_name AS company_name',
            'r.user_id AS primary_admin_id',
            `u.first_name || ' ' || u.last_name AS primary_admin_name`,
            'u.email_id AS primary_admin_email',
          ])
          .leftJoin(CompanyDetails, 'c', 'c.company_id = st.company_id')
          .leftJoin(
            CompanyUserRoles,
            'r',
            `r.company_id = st.company_id AND r.company_role = 'PRIMARY ADMIN' AND r.status = 'Active'`,
          )
          .leftJoin(
            UserDetails,
            'u',
            `u.user_id = r.user_id AND u.user_status = 'Active'`,
          )
          .where(`st.status != 'paid'`)
          .getRawMany();

      if (fetchedAllCompaniesWithFailedSubscriptions.length) {
        for (const subscription of fetchedAllCompaniesWithFailedSubscriptions) {
          subscription.transaction_status = 'Failed';
        }
      }

      this.logger.log(
        `All companies with failed subscription statuses have been fetched successfully with data: ${JSON.stringify(fetchedAllCompaniesWithFailedSubscriptions)}`,
      );

      return framedResponse(
        'SUCCESS',
        'All companies with failed subscription status has been fetched successfully.',
        fetchedAllCompaniesWithFailedSubscriptions,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all companies with failed subscription status with message: ${error.message}`,
      );
      throw error;
    }
  }

  async fetchAllProjectsWithComplianceIssues() {
    try {
      this.logger.log(
        `Request received for fetching all projects with compliance issues.`,
      );

      const rawQuery = `
          SELECT 
            project.project_id AS project_id,
            project.project_name AS project_name,
            bank.bank_account_id AS bank_account_id,
            bank.account_name AS bank_account_name,
            bank.account_type AS bank_account_type,
            project.pta_compliance AS pta_compliance,
            project.rta_compliance AS rta_compliance,
            project.project_status AS project_status
          FROM 
            project_details project
          LEFT JOIN 
            bank_accounts bank 
          ON 
            bank.project_ids LIKE CONCAT('%,', project.project_id::text, ',%') 
            OR bank.project_ids LIKE CONCAT(project.project_id::text, ',%') 
            OR bank.project_ids LIKE CONCAT('%,', project.project_id::text) 
            OR bank.project_ids = project.project_id::text
          LIMIT 10`;

      const projectAndBankAccountDetails =
        await this.projectDetailsRepo.query(rawQuery);

      const complianceResultsOfProjectsWithNumberOfIssues =
        projectAndBankAccountDetails.map(async (result) => {
          const complianceResults =
            await this.complianceService.fetchComplianceStatusesOfAProject({
              project_id: result.project_id,
            });

          const issues =
            complianceResults.data.number_of_issues_in_pta +
            complianceResults.data.number_of_issues_in_rta;

          return {
            ...result,
            ...{ issues },
          };
        });

      this.logger.log(
        `All projects with compliance issues have been fetched successfully with data: ${JSON.stringify(projectAndBankAccountDetails)}`,
      );

      return framedResponse(
        'SUCCESS',
        'All projects with compliance issues have been fetched successfully.',
        complianceResultsOfProjectsWithNumberOfIssues,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all projects with compliance issues with message: ${error.message}`,
      );
      throw error;
    }
  }

  async fetchAllBankAccountsWithTrustAccountingIssues(timezone) {
    try {
      this.logger.log(
        `Request received for fetching all bank accounts with trust accounting issues.`,
      );

      const fetchedAllBankAccounts = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.bank_account_id AS bank_account_id',
          'ba.account_name AS bank_account_name',
          'ba.status AS bank_account_status',
          'ba.company_id AS company_id',
          'c.company_name AS company_name',
        ])
        .leftJoin(CompanyDetails, 'c', 'c.company_id = ba.company_id')
        .where(`ba.status != 'Deleted'`)
        .getRawMany();

      const fetchedBankAccountsWithTrustAccountingIssues = await Promise.all(
        fetchedAllBankAccounts.map(async (result) => {
          const fetchedLedgerTrialBalanceByAccountId =
            await this.journalsService.fetchLedgerTrialBalanceByAccountId(
              {
                bank_account_id: result.bank_account_id,
                start_date: new Date(),
                timezone: timezone,
              },
              timezone,
            );

          if (
            fetchedLedgerTrialBalanceByAccountId &&
            fetchedLedgerTrialBalanceByAccountId.data.total_closing_balance !=
              '$0.00'
          ) {
            return {
              bank_account_id: result.bank_account_id,
              bank_account_name: result.bank_account_name,
              company_id: result.company_id,
              company_name: result.company_name,
              status: 'Unbalanced',
            };
          } else return null;
        }),
      );

      const finalResults =
        await fetchedBankAccountsWithTrustAccountingIssues.filter((result) => {
          if (result != null) return;
        });

      this.logger.error(
        `All bank accounts with trust accouning issues have been fetched successfully with data: ${JSON.stringify(fetchedBankAccountsWithTrustAccountingIssues)}`,
      );

      return framedResponse(
        'SUCCESS',
        'All bank accounts with trust accounting issues have been fetched successfully.',
        finalResults,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts with trust accounting issue with message: ${error.message}`,
      );
      throw error;
    }
  }
}
