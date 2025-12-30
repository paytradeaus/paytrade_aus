import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import {
  AddBankAccountResponse,
  ChangeStatusOfBankAccountResponse,
  CheckExistenceOfBankAccountNumberResponse,
  EditDetailsOfABankAccountResponse,
  FetchAllBankAccountsResponse,
  FetchBankAccountDetailsForEditingResponse,
  FetchBankAccountDetailsResponse,
  GetBankAccountListResponse,
} from './bank-accounts.response';
import {
  AddBankAccountInput,
  ChangeStatusOfBankAccountInput,
  CheckExistenceOfBankAccountNumberInput,
  EditDetailsOfABankAccountInput,
  FetchAllBankAccountsInput,
  FetchBankAccountDetailsInput,
  GetBankAccountListInput,
  UpdateDelegatePowersInput,
} from './bank-accounts.input';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { BankAccountsService } from './bank-accounts.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { StringResponse } from '../../signup/response/auth.response';
import { XeroAccountsService } from 'src/api/common/integrations/xero/accounts/xero-accounts.service';

@Resolver()
export class BankAccountsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly xeroAccountsService: XeroAccountsService,
  ) {
    this.logger = new PaytradeLogger('BANK_ACCOUNTS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AddBankAccountResponse, {
    name: 'addBankAccount',
    description:
      'Add a new bank account for the authenticated user. Triggers related Xero notices and returns warnings if any.',
  })
  async addBankAccount(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing bank account details to add',
    })
    payload: AddBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for adding a bank account of type: ${payload.account_type} with details: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.bankAccountsService.addBankAccount(
        decoded,
        payload,
        decoded?.userId,
      );

      let warningMessage, isCashAcc, bank_account_id;
      if (response && 'warningMessage' in response) {
        warningMessage = response.warningMessage;
      }

      if (response && 'bank_account_id' in response) {
        bank_account_id = response.bank_account_id;
        isCashAcc = response.isCashAcc;
      }

      if (response?.warning) {
        return framedResponse('WARNING', warningMessage);
      }

      if (response) {
        await this.xeroAccountsService.addBankAccountToXero(
          decoded,
          payload,
          bank_account_id,
        );
      }

      let responseMessage;
      if (isCashAcc == false) {
        responseMessage = `Bank account added successfully and related notices are triggered.`;
      } else {
        responseMessage = `Bank account added successfully.`;
      }

      return framedResponse('SUCCESS', responseMessage, response);
    } catch (error) {
      this.logger.error(
        `Error in addBankAccount: ${error?.message ? error.message : error}`,
      );

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => EditDetailsOfABankAccountResponse, {
    name: 'editDetailsOfABankAccount',
    description:
      'Edit the details of an existing bank account. Updates Xero integration if necessary and returns warnings if any.',
  })
  async editDetailsOfABankAccount(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing updated bank account details',
    })
    payload: EditDetailsOfABankAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing the details a bank account with details: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const editBankDetails =
        await this.bankAccountsService.editDetailsOfABankAccount(
          decoded,
          payload,
        );

      if (editBankDetails?.warning) {
        return framedResponse('WARNING', editBankDetails.warningMessage);
      }

      await this.xeroAccountsService.editBankAccountToXero(decoded, payload);

      return framedResponse(
        'SUCCESS',
        editBankDetails?.successMessage,
        editBankDetails?.data,
      );
    } catch (error) {
      this.logger.error(
        `Error in edit Bank Account: ${error?.message ? error.message : error}`,
      );

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ChangeStatusOfBankAccountResponse, {
    name: 'changeStatusOfBankAccount',
    description:
      'Change the status of a bank account (Active, Inactive, Deleted). Prevents editing archived accounts in Xero and returns warnings if applicable.',
  })
  async changeStatusOfBankAccount(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing bank account ID and new status',
    })
    payload: ChangeStatusOfBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for changing the status of bank account with id: ${payload.bank_account_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const bankDetails = await this.bankAccountsService.getBankDetails(
        payload.bank_account_id,
      );

      const xeroDetails = await this.xeroAccountsService.getIntegrationDetails(
        bankDetails.company_id,
      );
      if (xeroDetails) {
        const xeroAccountDetails =
          await this.xeroAccountsService.getAccountDetails(
            payload.bank_account_id,
            xeroDetails?.integration_id,
          );
        if (
          payload.status !== 'Deleted' &&
          xeroAccountDetails &&
          xeroAccountDetails.account_status === 'ARCHIVED'
        )
          throw `The specified Account details match an archived Xero account. Since archived accounts cannot be edited via the Xero API, the account cannot be removed from the archive.`;
      }

      const changeBankStatus =
        await this.bankAccountsService.changeStatusOfBankAccount(
          decoded,
          payload,
          decoded?.userId,
        );

      if (changeBankStatus?.warning) {
        return framedResponse('WARNING', changeBankStatus.warningMessage);
      }

      await this.xeroAccountsService.deleteBankAccountToXero(decoded, payload);

      return framedResponse('SUCCESS', changeBankStatus?.successMessage);
    } catch (error) {
      this.logger.error(
        `Error in change status of BankAccount: ${error?.message ? error.message : error}`,
      );

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CheckExistenceOfBankAccountNumberResponse, {
    name: 'checkExistenceOfBankAccountNumber',
    description:
      'Check if a given bank account number already exists for validation purposes.',
  })
  async checkExistenceOfBankAccountNumber(
    @Args('payload', {
      description:
        'Payload containing bank account number and company details for validation',
    })
    payload: CheckExistenceOfBankAccountNumberInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking the existence of bank account number with data: ${payload}.`,
      );

      return this.bankAccountsService.checkExistenceOfBankAccountNumber(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding head contract details for TA1 with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while checking the existence of bank account number with message: ${error.message}`,
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
  @Query(() => FetchAllBankAccountsResponse, {
    name: 'fetchAllBankAccounts',
    description: 'Fetch all bank accounts for a specific company.',
  })
  async fetchAllBankAccounts(
    @Args('payload', {
      description: 'Payload containing company ID and optional filters',
    })
    payload: FetchAllBankAccountsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all bank accounts of company with id: ${payload.company_id}.`,
      );

      return this.bankAccountsService.fetchAllBankAccounts(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all bank accounts with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchBankAccountDetailsResponse, {
    name: 'fetchBankAccountDetails',
    description: 'Fetch details of a specific bank account by ID.',
  })
  async fetchBankAccountDetails(
    @Args('payload', { description: 'Payload containing the bank account ID' })
    payload: FetchBankAccountDetailsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching a bank account details with id: ${payload.bank_account_id}.`,
      );

      return this.bankAccountsService.fetchBankAccountDetails(payload);
    } catch (error) {
      this.logger.error(
        `Errored while fetching a bank account details with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching a bank account details with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchBankAccountDetailsForEditingResponse, {
    name: 'fetchBankAccountDetailsForEditing',
    description:
      'Fetch details of a bank account specifically for editing purposes.',
  })
  async fetchBankAccountDetailsForEditing(
    @Args('payload', { description: 'Payload containing the bank account ID' })
    payload: FetchBankAccountDetailsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching bank account details for editing with id: ${payload.bank_account_id}.`,
      );

      return this.bankAccountsService.fetchBankAccountDetailsForEditing(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching bank account details for editing with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching bank account details for editing with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRIMARY_ADMIN, Role.ADMIN, Role.STANDARD_USER)
  @Query(() => GetBankAccountListResponse, {
    name: 'getBankAccountLists',
    description:
      'Fetch a list of bank accounts based on company or filter criteria.',
  })
  async getBankAccountLists(
    @Args('getBankAccountListInput', {
      description: 'Payload containing company ID and filter criteria',
    })
    getBankAccountListInput: GetBankAccountListInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all bank accounts of company with input: ${JSON.stringify(getBankAccountListInput)}.`,
      );
      const bankAccountDetails =
        await this.bankAccountsService.getBankAccountLists(
          getBankAccountListInput,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        bankAccountDetails,
      );
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored while fetching all bank accounts with message: ${errorMessage}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all bank accounts with message: ${errorMessage}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'updateDelegatePowers',
    description:
      'Update delegated powers for one or multiple bank accounts. Returns warnings if delegation rules are violated.',
  })
  async updateDelegatePowers(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing account IDs and delegation information',
    })
    payload: UpdateDelegatePowersInput,
  ) {
    try {
      this.logger.log(
        `Request received for updating delegated powers to the following bank account ids: ${payload.account_ids}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const updateDelegate =
        await this.bankAccountsService.updateDelegatePowers(decoded, payload);

      if (updateDelegate?.warning) {
        return framedResponse('WARNING', updateDelegate.warningMessage);
      }
      return framedResponse('SUCCESS', updateDelegate?.successMessage);
    } catch (error) {
      this.logger.error(
        `Errored while updating delegated powers with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating delegated powers with message: ${error.message}`,
      );
    }
  }
}
