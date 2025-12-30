import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { BankStatementsService } from './bank-statements.service';
import {
  AddBankStatementResponse,
  ChangeStatusOfBankStatementResponse,
  CheckExistenceOfBankStatementResponse,
  EditDetailsOfABankStatementResponse,
  FetchAllBankStatementsResponse,
  FetchBankStatementDetailsResponse,
} from './bank-statements.response';
import {
  AddBankStatementInput,
  ChangeStatusOfBankStatementInput,
  CheckExistenceOfBankStatementInput,
  EditDetailsOfABankStatementInput,
  FetchAllBankStatementsInput,
  FetchBankStatementDetailsInput,
} from './bank-statements.input';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { BankStatementsValidator } from './bank-statements.validator';

@Resolver()
export class BankStatementsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly bankStatementsService: BankStatementsService,
    private readonly bankStatementsValidator: BankStatementsValidator,
  ) {
    this.logger = new PaytradeLogger('BANK_STATEMENTS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AddBankStatementResponse, {
    name: 'addBankStatement',
    description:
      'Add a new bank statement for a bank account. Requires authenticated user context and validates input data.',
  })
  async addBankStatement(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing bank statement details to be added',
    })
    payload: AddBankStatementInput,
  ) {
    try {
      this.logger.log(
        `Handling request for adding bank statement with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.bankStatementsService.addBankStatement(payload, decoded);
    } catch (error) {
      this.logger.error(
        `Errored while adding bank statement with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while adding bank statement with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CheckExistenceOfBankStatementResponse, {
    name: 'checkExistenceOfBankStatement',
    description:
      'Check whether a bank statement already exists based on specific input criteria (e.g., statement date, bank account).',
  })
  async checkExistenceOfBankStatement(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing criteria to check bank statement existence',
    })
    payload: CheckExistenceOfBankStatementInput,
  ) {
    try {
      this.logger.log(
        `Handling request for checking the existence of a bank statement with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.bankStatementsService.checkExistenceOfBankStatement(payload);
    } catch (error) {
      this.logger.error(
        `Errored while checking the existence of a bank statement with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while checking the existence of a bank statement with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllBankStatementsResponse, {
    name: 'fetchAllBankStatements',
    description:
      'Fetch all bank statements for a specific bank account, optionally filtered by date range and timezone.',
  })
  async fetchAllBankStatements(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing bank account ID and optional filters',
    })
    payload: FetchAllBankStatementsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all bank statements of bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || payload.timezone;

      return this.bankStatementsService.fetchAllBankStatements(
        payload,
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank statements of bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all bank statements of bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.STANDARD_USER,
  )
  @Query(() => FetchBankStatementDetailsResponse, {
    name: 'fetchBankStatementDetails',
    description:
      'Fetch detailed information of a specific bank statement by its ID.',
  })
  async fetchBankStatementDetails(
    @Args('payload', {
      description: 'Payload containing the ID of the bank statement to fetch',
    })
    payload: FetchBankStatementDetailsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching a bank statement details with id: ${payload.bank_statement_id}.`,
      );

      return this.bankStatementsService.fetchBankStatementDetails(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching a bank statement details with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching a bank statement details with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => EditDetailsOfABankStatementResponse, {
    name: 'editDetailsOfABankStatement',
    description:
      'Edit the details of an existing bank statement. Input is validated before applying updates.',
  })
  async editDetailsOfABankStatement(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank statement details to be updated',
    })
    payload: EditDetailsOfABankStatementInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing the details a bank statement with details: ${JSON.stringify(payload)}`,
      );

      const validatedBankStatementDetailsToBeUpdated =
        await this.bankStatementsValidator.validateEditDetailsOfABankStatement(
          payload,
        );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.bankStatementsService.editDetailsOfABankStatement(
        validatedBankStatementDetailsToBeUpdated,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while editing the details a bank statement with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while editing the details a bank statement with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ChangeStatusOfBankStatementResponse, {
    name: 'changeStatusOfBankStatement',
    description:
      'Change the status of a bank statement (e.g., Active, Inactive, Deleted). Returns appropriate error messages if operation fails.',
  })
  async changeStatusOfBankStatement(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing the bank statement ID and the new status',
    })
    payload: ChangeStatusOfBankStatementInput,
  ) {
    try {
      this.logger.log(
        `Request received for changing the status of bank statement with id: ${payload.bank_statement_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.bankStatementsService.changeStatusOfBankStatement(
        payload,
        decoded,
      );
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of bank statement with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while changing the status of bank statement with message: ${error.message}`,
      );
    }
  }
}
