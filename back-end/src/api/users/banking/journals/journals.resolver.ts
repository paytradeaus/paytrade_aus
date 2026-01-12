import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AuditReportResponse,
  AuditStartDateResponse,
  CheckAndGetStatementResponse,
  CheckAuditReturnForAuditResponse,
  CheckNilReturnForAuditResponse,
  CheckReportExistenceResponse,
  FetchAccountLedgerByAccountIdResponse,
  FetchLedgerJournalsByAccountIdResponse,
  FetchLedgerTrialBalanceByAccountIdResponse,
  FetchWithdrawAndDepositByAccountIdResponse,
  GetAllAuditReportListResponse,
  GetAllBankAccountsForJournalsResponse,
  GetAllReconciliationReportListResponse,
  GetFiltersForAdminResponse,
  GetTrustAccountingBalanceResponse,
  ReconciliationReportResponse,
  ViewAuditReportResponse,
  ViewReconciliationReportResponse,
} from './journals.response';
import {
  AddAuditReportInput,
  AddReconciliationReportInput,
  CheckNilReturnForAuditInput,
  CheckReportExistenceByAccountIdInput,
  EditAuditReportInput,
  EditReconciliationReportInput,
  FetchAccountLedgerByAccountIdInput,
  FetchDepositsAndWithdrawalsByAccountIdInput,
  FetchLedgerJournalsByAccountIdInput,
  FetchLedgerTrialBalanceByAccountIdInput,
  GetAllAuditReportInput,
  GetAllBankAccountsForJournalsInput,
  GetAllReconciliationReportInput,
  GetTrustAccountingBalanceInput,
} from './journals.input';
import { JournalsService } from './journals.service';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { handleError } from 'src/api/common/error-handler';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CompliancesService } from '../../compliances/compliances.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Resolver()
export class JournalsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly journalsService: JournalsService,
    private readonly complianceService: CompliancesService,
    private activityLogService: ActivityLogService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('JOURNALS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchLedgerJournalsByAccountIdResponse, {
    name: 'fetchLedgerJournalsByAccountId',
    description:
      'Fetch all ledger journals associated with a specific bank account ID.',
  })
  async fetchLedgerJournalsByAccountId(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to fetch ledger journals',
    })
    payload: FetchLedgerJournalsByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching Ledger journals of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.journalsService.fetchLedgerJournalsByAccountId(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Ledger journals of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching Ledger journals of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => FetchAccountLedgerByAccountIdResponse, {
    name: 'fetchAccountLedgerByAccountId',
    description:
      'Fetch account ledger entries for a specific bank account, showing debits, credits, and balances.',
  })
  async fetchAccountLedgerByAccountId(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to fetch account ledger',
    })
    payload: FetchAccountLedgerByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching Account Ledger of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.journalsService.fetchAccountLedgerByAccountId(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Account Ledger of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching Account Ledger of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => FetchLedgerTrialBalanceByAccountIdResponse, {
    name: 'fetchLedgerTrialBalanceByAccountId',
    description:
      'Fetch the trial balance of a specific bank account, summarizing debits and credits for reporting purposes.',
  })
  async fetchLedgerTrialBalanceByAccountId(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to fetch trial balance',
    })
    payload: FetchLedgerTrialBalanceByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching Ledger Trial Balance of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.journalsService.fetchLedgerTrialBalanceByAccountId(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Ledger Trial Balance of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching Ledger Trial Balance of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => FetchWithdrawAndDepositByAccountIdResponse, {
    name: 'fetchDepositsAndWithdrawalsByAccountId',
    description:
      'Fetch all deposits and withdrawals for a specific bank account within a specified period.',
  })
  async fetchDepositsAndWithdrawalsByAccountId(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID and optional date range for deposits and withdrawals',
    })
    payload: FetchDepositsAndWithdrawalsByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching Deposits and Withdrawals of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.journalsService.fetchDepositsAndWithdrawalsByAccountId(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Deposits and Withdrawals of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching Deposits and Withdrawals of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => CheckReportExistenceResponse, {
    name: 'checkReportExistence',
    description:
      'Check whether a financial report already exists for a specific bank account.',
  })
  async checkReportExistence(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to check report existence',
    })
    payload: CheckReportExistenceByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking existing report of a bank account with id: ${payload.bank_account_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const isExisted = await this.journalsService.checkReportExistence(
        payload,
        decoded,
      );
      console.log(isExisted, isExisted && isExisted.length > 0 ? true : false);
      return framedResponse(
        'SUCCESS',
        `Checking existing report of a bank account successfully.`,
        isExisted && isExisted.length > 0 ? true : false,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking existing report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while checking existing report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => CheckAndGetStatementResponse, {
    name: 'checkAndGetStatementBalance',
    description:
      'Check if a bank statement exists for the given bank account and retrieve its balance. Returns an error if no statement is found.',
  })
  async checkAndGetStatementBalance(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to check and get statement balance',
    })
    payload: CheckReportExistenceByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for check and get statement of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const isExisted = await this.journalsService.checkAndGetStatementBalance(
        payload,
        decoded,
      );
      if (
        isExisted &&
        Object.keys(isExisted).length !== 0 &&
        isExisted.bank_statement_balance !== null
      ) {
        return framedResponse(
          'SUCCESS',
          'Check and get statement of a bank account successfully.',
          {
            name: isExisted.bank_statement_balance,
            value: formatCurrency(isExisted.bank_statement_balance),
          },
        );
      } else {
        return framedResponse(
          'ERROR',
          'Please add bank statement for this month end and then return to create the monthly reconciliation report.',
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while check and get statement of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while check and get statement of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => GetTrustAccountingBalanceResponse, {
    name: 'getTrustAccountingBalanceByAccountId',
    description:
      'Fetch the trust accounting balance of a specific bank account by its ID.',
  })
  async getTrustAccountingBalanceByAccountId(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank account ID to fetch trust accounting balance',
    })
    payload: GetTrustAccountingBalanceInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching balance of a bank account with id: ${payload.bank_account_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.journalsService.getTrustAccountingBalanceByAccountId(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching balance of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching balance of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => GetAllBankAccountsForJournalsResponse, {
    name: 'getAllBankAccountsForJournals',
    description:
      'Fetch a list of all bank accounts that can be used in journal entries.',
  })
  async getAllBankAccountsForJournals(
    @Args('payload', {
      description:
        'Payload containing optional filters to fetch bank accounts for journals',
    })
    payload: GetAllBankAccountsForJournalsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all bank accounts for Journals: ${JSON.stringify(payload)}.`,
      );

      return await this.journalsService.getAllBankAccountsForJournals(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts for Journals: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all bank accounts for Journals: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
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
  @Query(() => GetFiltersForAdminResponse, {
    name: 'getFiltersForAdmin',
    description:
      'Fetch available filters for admin users to generate or view reports.',
  })
  async getFiltersForAdmin() {
    try {
      this.logger.log(`Request received for fetching filters for Admin.`);

      return await this.journalsService.getFiltersForAdmin();
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters for Admin with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching filters for Admin with message: ${error.message}`,
      );
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
  @Mutation(() => ReconciliationReportResponse, {
    name: 'insertReconciliationReportDetails',
    description:
      'Insert a new reconciliation report and create an activity log for tracking.',
  })
  async insertReconciliationReportDetails(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details to add a new reconciliation report',
    })
    payload: AddReconciliationReportInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for inserting reconciliation report details with payload: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const reconciliationDetails =
        await this.journalsService.insertReconciliationReportDetails(
          decoded,
          payload,
        );
      this.logger.log(
        `Response received after inserting reconciliation report details with data: ${JSON.stringify(reconciliationDetails)}`,
      );
      if (reconciliationDetails) {
        reconciliationDetails.report_id =
          100000 + Number(reconciliationDetails.report_id);

        //Create activity log as soon as a reconciliation report is added.
        const reconciliationLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[16]}` +
          `${reconciliationDetails.id}` +
          `?from=log`;
        console.log('reconciliationLink', reconciliationLink);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 116,
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
          company_id: reconciliationDetails.company_id,
          dynamic_values: {
            reconciliationLink,
            reconciliationId: reconciliationDetails.report_id,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);

        if (reconciliationDetails.id) {
          const reconsiliationData =
            await this.journalsService.getReconciliationaDataForCompliance(
              reconciliationDetails.id,
            );
          if (reconsiliationData.project_ids) {
            const projectIds = reconsiliationData.project_ids
              .split(',')
              .map((id) => Number(id.trim()));
            for (const projectId of projectIds) {
              if (
                reconsiliationData.account_type === 'Project Trust Account' ||
                reconsiliationData.account_type === 'Retention Trust Account'
              ) {
                const compliance_init =
                  await this.complianceService.fetchComplianceResultsOfAProject(
                    {
                      project_id: projectId,
                      bank_account_type: reconsiliationData.account_type,
                      failedFilter: false,
                    },
                  );
              }
            }
          }
        }
        return framedResponse(
          'SUCCESS',
          `This reconciliation report has been added.`,
          reconciliationDetails,
        );
      }
      throw new Error(`Unable to add reconciliation report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => ReconciliationReportResponse, {
    name: 'editReconciliationReportDetails',
    description:
      'Edit an existing reconciliation report and update activity logs accordingly.',
  })
  async editReconciliationReportDetails(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details to edit an existing reconciliation report',
    })
    payload: EditReconciliationReportInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing reconciliation report details with payload: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const reconciliationDetails =
        await this.journalsService.editReconciliationReportDetails(
          decoded,
          payload,
        );
      this.logger.log(
        `Response received after editing reconciliation report details with data: ${JSON.stringify(reconciliationDetails)}`,
      );
      if (reconciliationDetails) {
        const reconsiliation =
          await this.journalsService.getReconciliationaDataForCompliance(
            payload.id,
          );

        if (reconsiliation.project_ids) {
          const projectIds = reconsiliation.project_ids
            .split(',')
            .map((id) => Number(id.trim()));

          for (const projectId of projectIds) {
            if (
              reconsiliation.account_type === 'Project Trust Account' ||
              reconsiliation.account_type === 'Retention Trust Account'
            ) {
              const compliance_init =
                await this.complianceService.fetchComplianceResultsOfAProject({
                  project_id: projectId,
                  bank_account_type: reconsiliation.account_type,
                  failedFilter: false,
                });
            }
          }
        }
      }
      if (reconciliationDetails) {
        //Create activity log as soon as a reconciliation report is edited.
        const reconciliationLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[16]}` +
          `${reconciliationDetails.id}` +
          `?from=log`;
        console.log('reconciliationLink', reconciliationLink);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 117,
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
          company_id: reconciliationDetails.company_id,
          dynamic_values: {
            reconciliationLink,
            reconciliationId: reconciliationDetails.report_id,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `The reconciliation report has been updated.`,
          reconciliationDetails,
        );
      }
      throw new Error(`Unable to update reconciliation report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => ViewReconciliationReportResponse, {
    name: 'viewReconciliationReportById',
    description: 'View the details of a reconciliation report by its ID.',
  })
  async viewReconciliationReportById(
    @Args('id', {
      description: 'Unique identifier of the reconciliation report',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}`,
      );
      const reconciliationDetails =
        await this.journalsService.viewReconciliationReportById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(reconciliationDetails)}`,
      );
      if (reconciliationDetails) {
        return framedResponse(
          'SUCCESS',
          `Fetched Reconciliation Report Succcessfully.`,
          reconciliationDetails,
        );
      }
      throw new Error(`Unable to fetch reconciliation report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => ReconciliationReportResponse, {
    name: 'deleteReconciliationReportDetails',
    description:
      'Delete a reconciliation report by its ID and log the activity.',
  })
  async deleteReconciliationReportDetails(
    @Context() context,
    @Args('id', {
      description: 'Unique identifier of the reconciliation report',
    })
    id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting reconciliation report details with id: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const reconciliationDetails =
        await this.journalsService.deleteReconciliationReportDetails(
          decoded,
          id,
        );
      this.logger.log(
        `Response received after deleting reconciliation report details with data: ${JSON.stringify(reconciliationDetails)}`,
      );
      if (reconciliationDetails) {
        const reconsiliation =
          await this.journalsService.getReconciliationaDataForCompliance(id);

        if (reconsiliation.project_ids) {
          const projectIds = reconsiliation.project_ids
            .split(',')
            .map((id) => Number(id.trim()));

          for (const projectId of projectIds) {
            if (
              reconsiliation.account_type === 'Project Trust Account' ||
              reconsiliation.account_type === 'Retention Trust Account'
            ) {
              const compliance_init =
                await this.complianceService.fetchComplianceResultsOfAProject({
                  project_id: projectId,
                  bank_account_type: reconsiliation.account_type,
                  failedFilter: false,
                });
            }
          }
        }
      }
      if (reconciliationDetails) {
        //Create activity log as soon as a reconciliation report is deleted.
        const reconciliationLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[16]}` +
          `${reconciliationDetails.id}` +
          `?from=log`;
        console.log('reconciliationLink', reconciliationLink);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 118,
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
          company_id: reconciliationDetails?.company_id,
          dynamic_values: {
            reconciliationLink,
            reconciliationId: reconciliationDetails.report_id,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `The reconciliation report has been deleted.`,
          reconciliationDetails,
        );
      }
      throw new Error(`Unable to delete reconciliation report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => GetAllReconciliationReportListResponse, {
    name: 'getAllReconciliationReportList',
    description:
      'Fetch all reconciliation reports for the given filter criteria.',
  })
  async getAllReconciliationReportList(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing filter criteria to fetch reconciliation reports',
    })
    payload: GetAllReconciliationReportInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all reconciliation report: ${JSON.stringify(payload)}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return await this.journalsService.getAllReconciliationReportList(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all reconciliation report: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all reconciliation report: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
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
  @Query(() => CheckNilReturnForAuditResponse, {
    name: 'checkNilReturnForAudit',
    description:
      'Check if a Nil return is required for an audit report of a specific bank account.',
  })
  async checkNilReturnForAudit(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing bank account details to check Nil return for audit',
    })
    payload: CheckNilReturnForAuditInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking Nil return for an audit report of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const nilReturnDetails =
        await this.journalsService.checkNilReturnForAudit(payload, decoded);
      console.log(
        nilReturnDetails,
        nilReturnDetails && nilReturnDetails.length > 0 ? true : false,
      );

      return framedResponse(
        'SUCCESS',
        'Check Nil return for an audit report of a bank account successfully.',
        {
          warning:
            nilReturnDetails && nilReturnDetails.length > 0 ? true : false,
          message:
            nilReturnDetails && nilReturnDetails.length > 0
              ? 'The Retention Trust Account was used during this year period. Are you sure you wish to file a nil return. This will require a notice to be sent to the regulator.'
              : '',
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking Nil return for an audit report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while checking Nil return for an audit report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
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
  @Query(() => AuditStartDateResponse, {
    name: 'getStartAuditDate',
    description:
      'Get the next possible start date for an audit of a given bank account.',
  })
  async getStartAuditDate(
    @Context() context,
    @Args('bank_account_id', {
      description:
        'The bank account ID to determine the next audit start date for',
    })
    bank_account_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for checking the next possible date to start and audit of a bank account with id: ${bank_account_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const account_details =
        await this.journalsService.getBankAccountDetails(bank_account_id);
      if (!account_details) {
        return {
          status: 'ERROR',
          message: 'Bank account not found',
        };
      }

      const lastAudit =
        await this.journalsService.getLatestAuditReportForBankAccount(
          bank_account_id,
        );

      const timezone = decoded?.timezone || 'UTC';

      let startDate: Date;
      if (lastAudit?.audit_date) {
        // Start from next day of last audit's date
        startDate = moment(lastAudit.audit_date)
          .add(1, 'day')
          .startOf('day')
          .toDate();
      } else {
        // No audits exist yet, use bank opening date
        startDate = moment(account_details.opening_date)
          .startOf('day')
          .toDate();
      }

      const today = moment().startOf('day');
      const endOfCurrentMonth = moment().endOf('month').startOf('day');

      const isFuture = moment(startDate).isAfter(today);
      if (isFuture) {
        throw new Error('Start date cannot be in the future.');
      }
      const isInCurrentMonth = moment(startDate).isSame(today, 'month');
      const isTodayMonthEnd = today.isSame(endOfCurrentMonth, 'day');

      if (isInCurrentMonth && !isTodayMonthEnd) {
        throw new Error('Audit is already completed till last month end.');
      }

      return {
        status: 'SUCCESS',
        message: 'Start audit date fetched successfully',
        data: {
          bank_account_id,
          start_audit_date: startDate,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error in getStartAuditDate: ${error.message || error}`,
      );
      return {
        status: 'ERROR',
        message: error.message,
      };
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
  @Mutation(() => AuditReportResponse, {
    name: 'insertAuditReportDetails',
    description:
      'Insert a new audit report for a bank account and create an activity log.',
  })
  async insertAuditReportDetails(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing details to add a new audit report',
    })
    payload: AddAuditReportInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for inserting audit report details with payload: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const account_details = await this.journalsService.getBankAccountDetails(
        payload.bank_account_id,
      );
      if (account_details) {
        let response;
        const firstAuditDate = new Date(account_details.opening_date);
        firstAuditDate.setFullYear(firstAuditDate.getFullYear() + 1);
        const auditPayload = {
          bank_account_id: payload.bank_account_id,
          month_end_date: payload.audit_date,
          timezone: decoded?.timezone,
        };
        const auditDate = moment(auditPayload.month_end_date).toDate();

        console.log(account_details.opening_date, firstAuditDate, auditDate);
        const isStatementExisted =
          await this.journalsService.checkAndGetStatementBalance(
            auditPayload,
            decoded,
          );
        if (
          isStatementExisted &&
          Object.keys(isStatementExisted).length !== 0 &&
          isStatementExisted.bank_statement_balance !== null
        ) {
          const isExisted =
            await this.journalsService.checkAuditReportExistence(
              auditPayload,
              firstAuditDate,
              decoded,
            );
          if (isExisted && isExisted.length > 0) {
            response = {
              warning: true,
              message: 'Audit has been made already for the selected year.',
            };
          }
        } else {
          response = {
            warning: true,
            message:
              'Please add bank statement for this month end and then return to create the audit report.',
          };
        }
        if (response) {
          return framedResponse(
            'SUCCESS',
            'Unable to add audit report details',
            response,
          );
        }
        const auditDetails =
          await this.journalsService.insertAuditReportDetails(decoded, payload);
        console.log('auditDetails', auditDetails);
        this.logger.log(
          `Response received after inserting audit report details with data: ${JSON.stringify(auditDetails)}`,
        );
        if (auditDetails) {
          auditDetails.audit_id = 100000 + Number(auditDetails.audit_id);

          if (auditDetails.bank_account_id) {
            const bank_details =
              await this.journalsService.getBankAccountDetails(
                auditDetails.bank_account_id,
              );

            const projectIds = bank_details.project_ids;

            for (const projectId of projectIds) {
              if (
                bank_details.account_type === 'Project Trust Account' ||
                bank_details.account_type === 'Retention Trust Account'
              ) {
                const compliance_init =
                  await this.complianceService.fetchComplianceResultsOfAProject(
                    {
                      project_id: projectId,
                      bank_account_type: bank_details.account_type,
                      failedFilter: false,
                    },
                  );
              }
            }
          }

          //Create activity log as soon as an audit report is inserted.
          const auditLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[15]}` +
            `${auditDetails.id}` +
            `?from=log`;
          console.log('auditLink', auditLink);

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 114,
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
            company_id: auditDetails.company_id,
            dynamic_values: {
              auditLink,
              auditId: auditDetails.audit_id,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          //console.log('createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
          return framedResponse(
            'SUCCESS',
            `This audit report has been added.`,
            auditDetails,
          );
        }
        throw new Error(`Unable to add audit report details`);
      }
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => AuditReportResponse, {
    name: 'editAuditReportDetails',
    description:
      'Edit an existing audit report and update activity logs accordingly.',
  })
  async editAuditReportDetails(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details to edit an existing audit report',
    })
    payload: EditAuditReportInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing audit report details with payload: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const auditDetails = await this.journalsService.editAuditReportDetails(
        decoded,
        payload,
      );
      this.logger.log(
        `Response received after editing audit report details with data: ${JSON.stringify(auditDetails)}`,
      );
      if (auditDetails) {
        //Create activity log as soon as an audit report is inserted.
        const auditLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[15]}` +
          `${auditDetails.id}` +
          `?from=log`;
        console.log('auditLink', auditLink);

        if (auditDetails.bank_account_id) {
          const bank_details = await this.journalsService.getBankAccountDetails(
            auditDetails.bank_account_id,
          );

          const projectIds = bank_details.project_ids;

          for (const projectId of projectIds) {
            if (
              bank_details.account_type === 'Project Trust Account' ||
              bank_details.account_type === 'Retention Trust Account'
            ) {
              const compliance_init =
                await this.complianceService.fetchComplianceResultsOfAProject({
                  project_id: projectId,
                  bank_account_type: bank_details.account_type,
                  failedFilter: false,
                });
            }
          }
        }

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 115,
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
          company_id: auditDetails.company_id,
          dynamic_values: {
            auditLink,
            auditId: auditDetails.audit_id,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `The audit report has been updated.`,
          auditDetails,
        );
      }
      throw new Error(`Unable to update audit report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => ViewAuditReportResponse, {
    name: 'viewAuditReportById',
    description: 'View the details and file of an audit report by its ID.',
  })
  async viewAuditReportById(
    @Args('id', { description: 'Unique identifier of the audit report' })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}`,
      );
      const auditDetails = await this.journalsService.viewAuditReportById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(auditDetails)}`,
      );
      if (auditDetails && auditDetails !== null && auditDetails.file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(auditDetails.file_path);
          if (fileBuffer) {
            auditDetails['file'] = `data:${auditDetails.file_type};base64,${fileBuffer.toString('base64')}`;
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
      }
      if (auditDetails) {
        return framedResponse(
          'SUCCESS',
          `Fetched Audit Report Succcessfully.`,
          auditDetails,
        );
      }
      throw new Error(`Unable to fetch audit report details`);
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
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => GetAllAuditReportListResponse, {
    name: 'getAllAuditReportList',
    description:
      'Fetch all audit reports based on filter criteria for the given bank accounts.',
  })
  async getAllAuditReportList(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing filter criteria to fetch audit reports',
    })
    payload: GetAllAuditReportInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all audit report: ${JSON.stringify(payload)}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const auditDetails = await this.journalsService.getAllAuditReportList(
        payload,
        decoded,
      );
      if (
        auditDetails &&
        auditDetails !== null &&
        auditDetails.data &&
        auditDetails.data.report_list
      ) {
        for (const element of auditDetails.data.report_list) {
          if (element.file_path) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(element.file_path);
              if (fileBuffer) {
                element['file'] = `data:${element.file_type};base64,${fileBuffer.toString('base64')}`;
              }
            } catch (fileError) {
              this.logger.error(`Failed to read file from storage: ${fileError.message}`);
            }
          }
        }
      }
      return auditDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all audit report: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all audit report: ${JSON.stringify(payload)} with message: ${error.message}`,
      );
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
  @Query(() => CheckAuditReturnForAuditResponse, {
    name: 'checkAuditReportExistence',
    description:
      'Check if an audit report already exists for a bank account for a given month and project.',
  })
  async checkAuditReportExistence(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing bank account and project details to check existing audit reports',
    })
    payload: CheckReportExistenceByAccountIdInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking existing report of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const account_details = await this.journalsService.getBankAccountDetails(
        payload.bank_account_id,
      );
      if (account_details) {
        let response;
        const firstAuditDate = new Date(account_details.opening_date);
        firstAuditDate.setFullYear(firstAuditDate.getFullYear() + 1);

        const auditDate = moment(payload.month_end_date).toDate();

        console.log(
          account_details.opening_date,
          '*&^%$#@!',
          firstAuditDate,
          auditDate,
        );
        const isStatementExisted =
          await this.journalsService.checkAndGetStatementBalance(
            payload,
            decoded,
          );
        if (
          isStatementExisted &&
          Object.keys(isStatementExisted).length !== 0 &&
          isStatementExisted.bank_statement_balance !== null
        ) {
          const existingAudits =
            await this.journalsService.checkAuditReportExistence(
              payload,
              firstAuditDate,
              decoded,
            );

          response = {
            warning: existingAudits.length > 0,
            message: '',
          };

          if (existingAudits.length > 0) {
            const hasNullProject = existingAudits.some(
              (a) => a.project_id === null || a.project_id === undefined,
            );
            const hasSameProject = existingAudits.some(
              (a) => a.project_id === payload.project_id,
            );
            const hasAnyProject = existingAudits.some(
              (a) => a.project_id !== null && a.project_id !== undefined,
            );

            if (hasNullProject) {
              response.message =
                'A generic audit without project preference exists for this account in the selected year.';
            } else if (hasSameProject) {
              response.message =
                'An audit already exists for the selected project and account in the given year.';
            } else if (!payload.project_id && hasAnyProject) {
              response.message =
                'Audit reports already exist for some projects of this account. You must select a project to create a new audit.';
            } else {
              response.warning = false;
              response.message = '';
            }
          }
        } else {
          response = {
            warning: true,
            message:
              'Please add bank statement for this month end and then return to create the audit report.',
          };
        }
        return framedResponse(
          'SUCCESS',
          'Check existence for an audit report of a bank account successfully.',
          response,
        );
      }
      return framedResponse('ERROR', `Unable to find the account details.`);
    } catch (error) {
      this.logger.error(
        `Errored while checking existing report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while checking existing report of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
    }
  }
}
