import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Context, Query } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentClaimsService } from './payment-claims.service';
import { PaymentClaimsValidator } from './payment-claims.validator';
import {
  AddPaymentClaimInput,
  ChangeStatusOfAPaymentClaimInput,
  CheckCompletionStatusOfAssociatedRetentionClaimsInput,
  EditDetailsOfAPaymentClaimInput,
  FetchAllPaymentClaimsOfACompanyInput,
  FetchAutoPopulatableFieldsOfARetentionClaimInput,
  FetchDetailsOfAPaymentClaimInput,
  FetchPaymentToAccountListOfSelectedSupplierInput,
  FetchSubContractorClaimsInput,
  GenerateS75NoticeInput,
  GetListActionButtonsInput,
} from './payment-claims.input';
import {
  AddPaymentClaimResponse,
  ChangeStatusOfAPaymentClaimResponse,
  CheckCompletionStatusOfAssociatedRetentionClaimsResponse,
  EditDetailsOfAPaymentClaimResponse,
  FetchAllPaymentClaimsResponse,
  FetchAutoPopulatableFieldsOfARetentionClaimResponse,
  FetchDetailsOfAPaymentClaimResponse,
  FetchDetailsOfImportPaymentClaimResponse,
  FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplierResponse,
  FetchSubContractorClaimsResponse,
  GenerateS75NoticeResponse,
  GetListActionButtonsResponse,
  s75TemplateFileDetailsResponse,
} from './payment-claims.response';
import { StatusService } from '../ui-status.service';
import { XeroInvoicesService } from 'src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class PaymentClaimsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly paymentClaimsValidator: PaymentClaimsValidator,
    private readonly statusService: StatusService,
    private readonly xeroInvoicesService: XeroInvoicesService,
    private readonly xeroService: XeroService,
  ) {
    this.logger = new PaytradeLogger('PAYMENT_CLAIMS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AddPaymentClaimResponse, {
    name: 'addPaymentClaim',
    description:
      'Add a new payment claim or retention claim for a company. Automatically integrates with Xero if enabled.',
  })
  async addPaymentClaim(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details to add a payment claim or retention claim',
    })
    payload: AddPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for adding a payment claim with details: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';

      const validatedPayload =
        await this.paymentClaimsValidator.validateAddPaymentClaim(
          payload,
          decoded?.timezone || 'UTC',
          decoded?.userId,
        );

      const res = await this.paymentClaimsService.addPaymentClaim(
        decoded,
        validatedPayload,
        decoded?.userId,
      );

      if (res) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          payload.company_id,
        );

        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const xeroPayload = {
            payment_claim_id: res.payment_claim_id,
            mapped_status: 'System',
          };
          const response: any =
            await this.xeroInvoicesService.createInvoiceOrBillInXero(
              decoded,
              xeroPayload,
            );
          this.logger.log(
            `Xero Account details inserted successfully with data: ${JSON.stringify(response)}`,
          );
        }
      }

      return framedResponse(
        'SUCCESS',
        res.showJournalMessage
          ? 'Trust journal updated'
          : `${res.cash_retention_type == 'Claim' ? 'Payment claim' : 'Retention claim'} is added successfully`,
        {
          payment_claim_id: res.payment_claim_id,
          notices: res?.notices,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding a payment claim with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
        null,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => s75TemplateFileDetailsResponse, {
    name: 'downloadS75Template',
    description:
      'Download the CSV template for S75 notices used in payment claims.',
  })
  async downloadS75Template(
    @Context() context,
  ): Promise<s75TemplateFileDetailsResponse> {
    try {
      this.logger.log(`Request to download csv template`);

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.paymentClaimsService.downloadS75Template(decoded?.userId);
    } catch (error) {
      this.logger.error(
        `Errored while downloading the s75 template with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while downloading the s75 template with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllPaymentClaimsResponse, {
    name: 'fetchAllPaymentClaims',
    description: 'Fetch all payment claims of a company.',
  })
  async fetchAllPaymentClaims(
    @Context() context,
    @Args('payload', {
      description:
        'Filter criteria for fetching all payment claims of a company',
    })
    payload: FetchAllPaymentClaimsOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all the payment claims with details: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const timezone = decoded?.timezone || 'UTC';

      const validatedPayload =
        await this.paymentClaimsValidator.validateFetchAllPaymentClaims(
          payload,
        );
      return this.paymentClaimsService.fetchAllPaymentClaims(
        validatedPayload,
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all the payment claims with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchSubContractorClaimsResponse, {
    name: 'fetchSubContractorClaimsByHeadContractor',
    description:
      'Fetch all payment claims of subcontractors under a given head contractor.',
  })
  async fetchSubContractorClaimsByHeadContractor(
    @Args('payload', {
      description:
        'Payload containing head contractor details to fetch subcontractor claims',
    })
    payload: FetchSubContractorClaimsInput,
  ): Promise<FetchSubContractorClaimsResponse> {
    try {
      const { payment_claims, total_count } =
        await this.paymentClaimsService.fetchSubContractorClaimsByHeadContractor(
          payload,
        );

      if (total_count === 0) {
        return framedResponse(
          'ERROR',
          `All the subcontractors have been paid full.`,
        );
      } else {
        return framedResponse(
          'SUCCESS',
          `Fetched all subcontractor claims under the head contractor.`,
          { payment_claims, total_count },
        );
      }
    } catch (error) {
      this.logger.error(
        `Error fetching subcontractor claims by head contractor: ${error.message || error}`,
      );
      return framedResponse(
        'ERROR',
        `Error fetching subcontractor claims by head contractor: ${error.message || error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GenerateS75NoticeResponse, {
    name: 'generateS75Document',
    description: 'Generate an S75 PDF notice for a payment claim.',
  })
  async generateS75Document(
    @Args('payload', {
      description:
        'Payload containing the payment claim ID and details to generate an S75 notice',
    })
    payload: GenerateS75NoticeInput,
    @Context() context,
  ): Promise<GenerateS75NoticeResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const file = await this.paymentClaimsService.generateS75Pdf(
        payload,
        decoded,
      );

      return framedResponse('SUCCESS', `S75 generated`, file);
    } catch (error) {
      this.logger.error(`Error generating s75: ${error.message || error}`);
      return framedResponse(
        'ERROR',
        `Error  generating s75: ${error.message || error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => EditDetailsOfAPaymentClaimResponse, {
    name: 'editDetailsOfAPaymentClaim',
    description:
      'Edit the details of an existing payment or retention claim. Integrates updates with Xero if applicable.',
  })
  async editDetailsOfAPaymentClaim(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing updated payment claim details to edit',
    })
    payload: EditDetailsOfAPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing the details of a payment claim with details: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const timezone = decoded?.timezone || 'UTC';
      const sync_id = payload?.sync_id;
      if (payload?.sync_id) delete payload?.sync_id;

      const validatedPaymentClaimDetails =
        await this.paymentClaimsValidator.validateEditDetailsOfAPaymentClaim(
          payload,
          timezone,
          decoded?.userId,
        );

      const res = await this.paymentClaimsService.editDetailsOfAPaymentClaim(
        decoded,
        validatedPaymentClaimDetails,
        decoded?.userId,
      );

      if (res && payload.company_id && payload.payment_claim_id) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          payload.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const isClaimExists =
            await this.xeroInvoicesService.getInvoiceDetails(
              payload.payment_claim_id,
              xeroDetails.integration_id,
            );
          if (isClaimExists) {
            const xeroPayload = {
              payment_claim_id: payload.payment_claim_id,
              sync_id,
            };

            const response: any =
              await this.xeroInvoicesService.editInvoicesOrBills(
                decoded,
                xeroPayload,
              );
            this.logger.log(
              `Xero claim updated successfully with data: ${JSON.stringify(response)}`,
            );
          }
        }
      }
      return framedResponse(
        `SUCCESS`,
        res?.showJournalMessage
          ? 'Trust journal updated'
          : `Details of a payment claim has been updated successfully.`,
        res,
      );
    } catch (error) {
      this.logger.error(
        `Errored while editing the details of a payment claim with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ChangeStatusOfAPaymentClaimResponse, {
    name: 'changeStatusOfAPaymentClaim',
    description:
      'Change the status of a payment claim, e.g., mark as deleted. Integrates updates with Xero if applicable.',
  })
  async changeStatusOfAPaymentClaim(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing the payment claim ID and the new status to be applied (e.g., Deleted).',
    })
    payload: ChangeStatusOfAPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for changing the status of a payment claim with details: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const claimDetails =
        await this.paymentClaimsService.getPaymentClaimByClaimId(
          payload.payment_claim_id,
        );
      if (!claimDetails) {
        throw `Claim details not found`;
      }
      const res = await this.paymentClaimsService.changeStatusOfAPaymentClaim(
        decoded,
        payload,
        decoded?.userId,
      );

      if (res) {
        if (payload.status == 'Deleted') {
          const xeroDetails = await this.xeroService.getIntegrationDetails(
            res.data.company_id,
          );
          if (
            xeroDetails &&
            xeroDetails.integration_id &&
            xeroDetails?.integrationDetails &&
            xeroDetails?.integrationDetails?.integration_status ===
              'Connected - active'
          ) {
            const isClaimExists =
              await this.xeroInvoicesService.getInvoiceDetails(
                payload.payment_claim_id,
                xeroDetails.integration_id,
              );
            if (isClaimExists) {
              const xeroPayload = {
                payment_claim_id: payload.payment_claim_id,
              };
              const response: any =
                await this.xeroInvoicesService.deleteInvoicesOrBills(
                  decoded,
                  xeroPayload,
                );
              this.logger.log(
                `Xero Client supplier details inserted successfully with data: ${JSON.stringify(response)}`,
              );
            }
          }
        }
      }

      return framedResponse(
        `SUCCESS`,
        res.showJournalMessage
          ? 'Trust journal updated'
          : `Payment claim with id: ${res.data.payment_claim_id} has deleted successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of a payment claim with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchDetailsOfAPaymentClaimResponse, {
    name: 'fetchDetailsOfAPaymentClaim',
    description: 'Fetch detailed information for a specific payment claim.',
  })
  async fetchDetailsOfAPaymentClaim(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing identifiers required to fetch detailed information of a specific payment claim.',
    })
    payload: FetchDetailsOfAPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching details of a payment claim with details: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const timezone = decoded?.timezone || 'UTC';
      return this.paymentClaimsService.fetchDetailsOfAPaymentClaim(
        payload,
        timezone,
      );
    } catch (error) {
      console.log(error);
      this.logger.error(
        `Errored while fetching details of a payment claims with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(
    () =>
      FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplierResponse,
    {
      name: 'fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier',
      description:
        'Fetch details of the payment from accounts and available payment to accounts for a selected supplier.',
    },
  )
  async fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
    @Args('payload', {
      description:
        'Input containing supplier and contract details to fetch payment-from account information and eligible payment-to accounts.',
    })
    payload: FetchPaymentToAccountListOfSelectedSupplierInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching payment from account details and payment to account list of selected supplier with details: ${JSON.stringify(payload)}`,
      );

      return this.paymentClaimsService.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching payment from account details and payment to account list of selected supplier with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAutoPopulatableFieldsOfARetentionClaimResponse, {
    name: 'fetchAutoPopulatableFieldsOfARetentionClaim',
    description:
      'Fetch the fields that can be auto-populated for a retention claim based on the supplier and contract details.',
  })
  async fetchAutoPopulatableFieldsOfARetentionClaim(
    @Args('payload', {
      description:
        'Input containing supplier and contract identifiers used to determine auto-populatable retention claim fields.',
    })
    payload: FetchAutoPopulatableFieldsOfARetentionClaimInput,
  ) {
    try {
      this.logger.log(
        `Request for fetching auto populatable fields of retention claim with data: ${JSON.stringify(payload)}`,
      );

      return this.paymentClaimsService.fetchAutoPopulatableFieldsOfARetentionClaim(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching auto populatable fields of retention claim with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CheckCompletionStatusOfAssociatedRetentionClaimsResponse, {
    name: 'checkCompletionStatusOfAssociatedRetentionClaims',
    description:
      'Check whether all associated retention claims under a head contractor have been completed.',
  })
  async checkCompletionStatusOfAssociatedRetentionClaims(
    @Args('payload', {
      description:
        'Input containing head contractor or contract identifiers to check whether all associated retention claims are completed.',
    })
    payload: CheckCompletionStatusOfAssociatedRetentionClaimsInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking the completion status of associated retention claims with message: ${JSON.stringify(payload)}`,
      );

      return this.paymentClaimsService.checkCompletionStatusOfAssociatedRetentionClaims(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching auto populatable fields of retention claim with message: ${error.message ? error.message : error}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetListActionButtonsResponse, {
    name: 'getListActionButtons',
    description:
      'Fetch all the action buttons available for a payment claim or payment based on its current status for UI rendering.',
  })
  async getListActionButtons(
    @Args('getListActionButtonsInput', {
      description:
        'Input containing either a payment claim ID or payment ID to determine available UI action buttons based on current status.',
    })
    getListActionButtonsInput: GetListActionButtonsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all the list action buttons with input details: ${JSON.stringify(getListActionButtonsInput)}`,
      );
      var response;
      if (
        getListActionButtonsInput.payment_claim_id &&
        !getListActionButtonsInput.payment_id
      ) {
        response =
          await this.statusService.getUiStatusAndActionButtonsForClaims(
            getListActionButtonsInput,
          );
      } else if (
        !getListActionButtonsInput.payment_claim_id &&
        getListActionButtonsInput.payment_id
      ) {
        response =
          await this.statusService.getUiStatusAndActionButtonsForPayments(
            getListActionButtonsInput,
          );
      } else {
        throw `Please provide proper input.`;
      }
      return framedResponse(
        'SUCCESS',
        `Fetched the list action buttons successfully.`,
        response,
      );
    } catch (error) {
      let errMsg = error.message ? error.message : error;
      this.logger.error(
        `Errored while fetching all the list action buttons with message: ${errMsg}`,
      );
      return framedResponse('ERROR', `${errMsg}`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchDetailsOfImportPaymentClaimResponse, {
    name: 'fetchDetailsOfAPaymentClaimForImport',
    description:
      'Fetch the details of a payment claim specifically for import purposes into another system or module.',
  })
  async fetchDetailsOfAPaymentClaimForImport(
    @Args('id', {
      description: 'Unique identifier of the payment claim to fetch for import',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request received for fetching details of a payment claim for importing with payment_claim_id: ${id}`,
      );

      const fetchedDetailsOfPaymentClaim =
        await this.paymentClaimsService.fetchDetailsOfAPaymentClaimForImport(
          id,
        );

      if (
        fetchedDetailsOfPaymentClaim &&
        Object.keys(fetchedDetailsOfPaymentClaim).length !== 0
      ) {
        return framedResponse(
          'SUCCESS',
          `Details of a payment claim has been fetched successfully.`,
          fetchedDetailsOfPaymentClaim,
        );
      } else {
        throw `Payment claim not found.`;
      }
    } catch (error) {
      console.log(error);
      const errMsg = error.message ? error.message : error;
      this.logger.error(
        `Errored while fetching details of a payment claims for importing with message: ${errMsg}`,
      );
      return framedResponse('ERROR', `${errMsg}`);
    }
  }
}
