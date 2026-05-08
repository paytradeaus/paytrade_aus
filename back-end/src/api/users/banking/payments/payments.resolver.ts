import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AddPaymentResponse,
  ChangeStatusOfAPaymentResponse,
  EditDetailsOfAPaymentResponse,
  FetchAllABAGeneratedFileHistoryResponse,
  FetchAllRetentionInPaymentsListResponse,
  FetchAllSubPaymentsOfAPaymentResponse,
  FetchAllTheMatchedTransactionsOfAPaymentResponse,
  FetchAllUnmatchedPaymentsOfACompanyResponse,
  FetchAutoPopulatableFieldsWhileAddingAPaymentResponse,
  FetchDetailsOfAPaymentResponse,
  FetchRetentionSummaryResponse,
  generateAbaFilesResponse,
  GetListOfAllPaymentsToDoInDashboardResponse,
  ListAllPaymentsResponse,
  ListSubPaymentsResponse,
} from './payments.response';
import {
  AddPaymentInput,
  ChangeStatusOfAPaymentInput,
  EditDetailsOfAPaymentInput,
  FetchAllRetentionInPaymentsListInput,
  FetchAllSubPaymentsOfAPaymentInput,
  FetchAllTheMatchedTransactionsOfAPaymentInput,
  FetchAutoPopulatableFieldsWhileAddingAPaymentInput,
  FetchDetailsOfAPaymentInput,
  FetchRetentionSummaryInput,
  GetABAFileHistoryInput,
  GetListOfAllPaymentsToDoInDashboardInput,
  ListAllPaymentsInput,
  ListSubPaymentsInput,
} from './payments.input';
import { PaymentsService } from './payments.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentsValidator } from './payments.validator';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroPaymentsService } from 'src/api/common/integrations/xero/payments/xero-payments.service';
import { StringResponse } from '../../signup/response/auth.response';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class PaymentsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly paymentsService: PaymentsService,
    private readonly paymentsValidator: PaymentsValidator,
    private readonly xeroPaymentsService: XeroPaymentsService,
    private readonly xeroService: XeroService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {
    this.logger = new PaytradeLogger('PAYMENTS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AddPaymentResponse, {
    name: 'addPayment',
    description: `Create a new payment against a payment claim and synchronize with Xero if integration is active. 
    Handles full, partial, pay-less, retention, and overpayment scenarios automatically.`,
  })
  async addPayment(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing payment claim ID, payment type, amounts, accounts, dates, and related details required to create a new payment.',
    })
    payload: AddPaymentInput,
  ) {
    try {
      this.logger.log(
        `Handling request for adding a payment with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const timezone = decoded?.timezone || 'UTC';

      const other_payment_types = [
        'Interest Received',
        'Interest Withdrawal',
        'Bank Charge Applied',
        'Bank Charge Top Up',
        'Top Up',
        'Withdrawal',
        'Overpayment refund from supplier',
        'Overpayment refund to client',
        'Overpayment to supplier',
        'Underpayment to supplier',
        'Overpayment from client',
        'Underpayment from client',
        'Top Up Retention',
      ];

      let claimDetails = null;
      if (!other_payment_types.includes(payload.payment_type)) {
        claimDetails = await this.paymentsService.getPaymentClaimByClaimId(
          payload.payment_claim_id,
        );
        if (!claimDetails) {
          throw `Claim details not found`;
        }
      }

      const validatedPaymentDetails =
        await this.paymentsValidator.validateAddPayment(
          payload,
          timezone,
          decoded?.userId,
        );

      const newPayment = await this.paymentsService.addPayment(
        decoded,
        validatedPaymentDetails,
        decoded?.userId,
      );

      if (newPayment) {
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
          this.logger.log(`newPayment: ${JSON.stringify(newPayment)}`);
          const paymentDetails = await this.paymentsService.fetchPaymentDetails(
            newPayment.data.payment_id,
          );
          if (
            ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
              paymentDetails?.payment_type,
            )
          ) {
            let xeroPayload: any = {
              payment_id: newPayment.data.payment_id,
              payment_date: payload.payment_date,
              bank_account_id: null,
              amount: 0,
              retention_amount: 0,
              cash_retention: paymentDetails?.cash_retention,
            };
            let isPaymentChecked = null,
              isRetentionChecked = null;
            await Promise.all(
              paymentDetails.subPayments.map(async (element) => {
                if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_paid_confirmed !== null &&
                  element.is_received_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_from_account;
                  xeroPayload.amount = Math.abs(element.amount);
                  isPaymentChecked = element.is_paid_confirmed;
                } else if (
                  element.sub_payment_type === 'Retention Out' &&
                  element.is_retention_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_received_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_from_account;
                  xeroPayload.retention_account =
                    paymentDetails.retention_account;
                  xeroPayload.retention_amount = Math.abs(element.amount);
                  isRetentionChecked = element.is_retention_confirmed;
                } else if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_received_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_to_account;
                  xeroPayload.amount = Math.abs(element.amount);
                  isPaymentChecked = element.is_received_confirmed;
                }
              }),
            );
            if (xeroPayload && xeroPayload.bank_account_id) {
              // ---------------------------------------------------------
              // Task #50 — Independent gates. Each ticked checkbox fires
              // its own Xero leg (Payment vs BankTransfer). The service
              // is idempotent: if both are ticked at once, both legs are
              // created in one call; if only one is ticked now and the
              // other is ticked later (in editDetails), the second call
              // will only push the missing half and UPDATE the existing
              // xero_payments row.
              // ---------------------------------------------------------
              const wantPayment = !!isPaymentChecked;
              const wantTransfer =
                !!paymentDetails.cash_retention && !!isRetentionChecked;
              if (wantPayment || wantTransfer) {
                const createPaymentDetails: any =
                  await this.xeroPaymentsService.createPayment(decoded, {
                    ...xeroPayload,
                    sync_payment: wantPayment,
                    sync_transfer: wantTransfer,
                  });
                // console.log('createPaymentDetails: ', createPaymentDetails);
                if (
                  createPaymentDetails &&
                  ['Pay Less - Full', 'Pay Less - Part'].includes(
                    payload.payment_type,
                  )
                ) {
                  const payment_list =
                    await this.paymentsService.fetchPaymentList(
                      payload?.payment_claim_id,
                    );
                  if (payment_list && payment_list.length > 0) {
                    if (payment_list.length === 1) {
                      const createCreditNotes =
                        await this.xeroPaymentsService.createCreditNotes(
                          decoded,
                          {
                            company_id: payload.company_id,
                            client_supplier_id: payload.client_supplier_id,
                            payment_claim_id: payload.payment_claim_id,
                            pt_payment_id: newPayment.data.payment_id,
                            payment_id: createPaymentDetails.payment_id,
                            retained_amount:
                              claimDetails.claim_amount -
                              payload.payless_amount,
                            is_gst_optional: claimDetails.is_gst_optional,
                            description: `${payload.payment_type} credit note`,
                          },
                        );
                      // console.log('createCreditNotes: ', createCreditNotes);
                    }
                  }
                }
              }
            }
          } else if (
            ['Pay - Zero', '3rd Party'].includes(payload.payment_type)
          ) {
            const createCreditNotes =
              await this.xeroPaymentsService.createCreditNotes(decoded, {
                company_id: payload.company_id,
                client_supplier_id: payload.client_supplier_id,
                payment_claim_id: payload.payment_claim_id,
                pt_payment_id: newPayment.data.payment_id,
                payment_id: null,
                retained_amount: claimDetails.claim_amount,
                is_gst_optional: claimDetails.is_gst_optional,
                description: `${payload.payment_type} credit note`,
              });
            // console.log('createCreditNotes: ', createCreditNotes);
          } else if (
            [
              'Overpayment refund from supplier',
              'Overpayment refund to client',
            ].includes(payload.payment_type) &&
            paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
            ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
              paymentDetails.subPayments[0].is_paid_confirmed === true &&
              paymentDetails.subPayments[0].is_received_confirmed === null) ||
              (paymentDetails.subPayments[0].is_received_confirmed !== null &&
                paymentDetails.subPayments[0].is_received_confirmed === true &&
                paymentDetails.subPayments[0].is_paid_confirmed === null))
          ) {
            const createOverPaymentRefundDetails =
              await this.xeroPaymentsService.createOverPaymentRefund(decoded, {
                payment_id: newPayment.data.payment_id,
                overpayment_id: payload.associated_overpayment_id,
              });
            this.logger.log(
              `createOverPaymentRefundDetails: ${JSON.stringify(createOverPaymentRefundDetails)}`,
            );
          } else if (
            ['Overpayment to supplier', 'Overpayment from client'].includes(
              payload.payment_type,
            ) &&
            paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
            ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
              paymentDetails.subPayments[0].is_paid_confirmed === true &&
              paymentDetails.subPayments[0].is_received_confirmed === null) ||
              (paymentDetails.subPayments[0].is_received_confirmed !== null &&
                paymentDetails.subPayments[0].is_received_confirmed === true &&
                paymentDetails.subPayments[0].is_paid_confirmed === null))
          ) {
            const createOverPaymentDetails =
              await this.xeroPaymentsService.createOverPayment(decoded, {
                payment_id: newPayment.data.payment_id,
                bank_account_id:
                  paymentDetails.payment_type === 'Overpayment to supplier'
                    ? paymentDetails.payment_from_account
                    : paymentDetails.payment_to_account,
                amount: Math.abs(Number(paymentDetails.total_amount)),
                payment_date: paymentDetails.payment_date,
              });
            this.logger.log(`createOverPaymentDetails: ${JSON.stringify(createOverPaymentDetails)}`);
          }
        }
      }
      return newPayment;
    } catch (error) {
      this.logger.error(
        `Errored while adding a payment with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        // `Errored while adding a payment with message: ${error.message}`,
        error.message ? error.message : error,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAutoPopulatableFieldsWhileAddingAPaymentResponse, {
    name: 'fetchAutoPopulatableFieldsWhileAddingAPayment',
    description:
      'Fetch auto-populated payment details such as accounts, supplier/client data, and default values while adding a new payment.',
  })
  async fetchAutoPopulatableFieldsWhileAddingAPayment(
    @Args('payload', {
      description:
        'Input containing payment claim, supplier/client, and company identifiers used to auto-populate fields while adding a payment.',
    })
    payload: FetchAutoPopulatableFieldsWhileAddingAPaymentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching auto populatable fields while adding a payment with payload: ${JSON.stringify(payload)}`,
      );

      return this.paymentsService.fetchAutoPopulatableFieldsWhileAddingAPayment(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching auto populatable fields while adding a payment with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching auto populatable fields while adding a payment with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ListAllPaymentsResponse, {
    name: 'listAllPayments',
    description:
      'Retrieve a paginated and filtered list of all payments including cash retention and payment status details.',
  })
  async listAllPayments(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing filters, pagination details, cash retention type, and date ranges to retrieve a list of payments.',
    })
    payload: ListAllPaymentsInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for listing all the payments with payload: ${JSON.stringify(payload)}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const paymentList = await this.paymentsService.getListOfAllpayments(
        payload,
        timezone,
      );
      this.logger.log(
        `All ${payload.cash_retention_type}s successfully fetched with data: ${JSON.stringify(paymentList)}`,
      );
      return framedResponse(
        'SUCCESS',
        `All payments successfully fetched.`,
        paymentList,
      );
    } catch (error) {
      this.logger.error(
        `Errored while listing all the payments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while listing all the payments with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ListSubPaymentsResponse, {
    name: 'listAllSubPayments',
    description:
      'Fetch all sub-payments related to payments, including retention components and payment splits.',
  })
  async listAllSubPayments(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing filters and pagination options to fetch sub-payments associated with payments.',
    })
    payload: ListSubPaymentsInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for listing all the sub payments with payload: ${JSON.stringify(payload)}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const paymentList = await this.paymentsService.getListOfSubpayments(
        payload,
        decoded?.userId,
        decoded?.timezone || 'UTC',
      );
      this.logger.log(`All sub payments successfully fetched`);
      return framedResponse(
        'SUCCESS',
        `All sub payments successfully fetched`,
        paymentList,
      );
    } catch (error) {
      this.logger.error(
        `Errored while listing all the sub payments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while listing all the sub payments with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => generateAbaFilesResponse, {
    name: 'generateABAfiles',
    description:
      'Generate ABA bank files from selected sub-payments and mark them as paid if applicable. Restricted based on subscription plan.',
  })
  async generateABAfiles(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing selected sub-payments, company ID, and flags to generate ABA files and optionally mark payments as paid.',
    })
    payload: ListSubPaymentsInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for listing all the sub payments with payload: ${JSON.stringify(payload)}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          payload?.company_id,
        );
      const subscriptionItemForRestriction =
        subscriptionDetails &&
        subscriptionDetails?.plan_items &&
        subscriptionDetails?.plan_items?.length > 0
          ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'ABA Generation',
            )
          : [];
      if (
        !subscriptionDetails?.is_free_plan_eligible &&
        (!subscriptionItemForRestriction ||
          (subscriptionItemForRestriction &&
            subscriptionItemForRestriction?.length > 0 &&
            subscriptionItemForRestriction[0]?.limit_value != 'true'))
      ) {
        return framedResponse(
          'WARNING',
          `ABA files cannot be generated. Please upgrade your subscription plan.`,
        );
      }

      const paymentList = await this.paymentsService.getListOfSubpayments(
        payload,
        decoded?.userId,
        decoded?.timezone || 'UTC',
      );
      const fileDetails = await this.paymentsService.generateAbaFile(
        paymentList.payments,
        payload.mark_paid,
        decoded,
        payload?.company_id,
      );

      let successMessage = 'ABA file generated successfully';
      if (payload.mark_paid && String(payload.mark_paid).toLowerCase() === 'yes') {
        successMessage = 'ABA file generated and payments marked as paid';
      }
      
      return framedResponse(
        'SUCCESS',
        successMessage,
        fileDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while listing all the sub payments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while listing all the sub payments with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllABAGeneratedFileHistoryResponse, {
    name: 'getABAFileHistoryList',
    description:
      'Retrieve the full history of all previously generated ABA files for audit and reference purposes.',
  })
  async getABAFileHistoryList(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing company and pagination details to retrieve the history of generated ABA files.',
    })
    payload: GetABAFileHistoryInput,
  ) {
    try {
      this.logger.log(
        `Request received for get ABA file history list: ${payload}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const abaHistoryList = await this.paymentsService.getABAFileHistoryList(
        payload,
        decoded,
      );

      return abaHistoryList;
    } catch (error) {
      this.logger.error(
        `Errored while get ABA file history list with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ChangeStatusOfAPaymentResponse, {
    name: 'changeStatusOfAPayment',
    description:
      'Update the status of a payment and synchronize changes with Xero including deletions of payments, credit notes, and overpayments if required.',
  })
  async changeStatusOfAPayment(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing payment ID and the new status to be applied, including flags affecting Xero synchronization.',
    })
    payload: ChangeStatusOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for changing the status of a payment with id: ${payload.payment_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.paymentsService.changeStatusOfAPayment(
        decoded,
        payload,
        decoded?.userId,
      );
      const paymentDetails = await this.paymentsService.fetchPaymentDetails(
        payload.payment_id,
      );

      if (response && paymentDetails) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          paymentDetails.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const isExisted =
            await this.xeroPaymentsService.checkExistingXeroPayment(
              payload.payment_id,
              xeroDetails.integration_id,
            );
          if (
            isExisted &&
            [
              'Full',
              'Part',
              'Pay Less - Full',
              'Pay Less - Part',
              'Pay - Zero',
              '3rd Party',
            ].includes(paymentDetails.payment_type)
          ) {
            const payment_list = paymentDetails?.payment_claim_id
              ? await this.paymentsService.fetchPaymentList(
                  paymentDetails?.payment_claim_id,
                )
              : [];
            // console.log({ payment_list });
            if (payment_list.length == 0) {
              // console.log(paymentDetails.payment_type);
              if (
                ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
                  paymentDetails.payment_type,
                )
              ) {
                let xeroPayload: any = {
                  payment_id: payload.payment_id,
                  cash_retention: paymentDetails?.cash_retention,
                };
                await Promise.all(
                  paymentDetails.subPayments.map(async (element) => {
                    if (
                      element.sub_payment_type === 'Payment' &&
                      element.is_paid_confirmed !== null &&
                      element.is_received_confirmed === null &&
                      element.is_retention_confirmed === null
                    ) {
                      xeroPayload.bank_account_id =
                        paymentDetails.payment_from_account;
                      xeroPayload.amount = Math.abs(element.amount);
                    } else if (
                      element.sub_payment_type === 'Retention Out' &&
                      element.is_retention_confirmed !== null &&
                      element.is_paid_confirmed === null &&
                      element.is_received_confirmed === null
                    ) {
                      xeroPayload.bank_account_id =
                        paymentDetails.payment_from_account;
                      xeroPayload.retention_account =
                        paymentDetails.retention_account;
                      xeroPayload.retention_amount = Math.abs(element.amount);
                    } else if (
                      element.sub_payment_type === 'Payment' &&
                      element.is_received_confirmed !== null &&
                      element.is_paid_confirmed === null &&
                      element.is_retention_confirmed === null
                    ) {
                      xeroPayload.bank_account_id =
                        paymentDetails.payment_to_account;
                      xeroPayload.amount = Math.abs(element.amount);
                    }
                  }),
                );
                const deletePaymentDetails =
                  await this.xeroPaymentsService.deletePayment(
                    decoded,
                    xeroPayload,
                  );
                // console.log('deletePaymentDetails: ', deletePaymentDetails);
              }
              if (
                [
                  'Pay Less - Full',
                  'Pay Less - Part',
                  'Pay - Zero',
                  '3rd Party',
                ].includes(paymentDetails.payment_type)
              ) {
                const deleteCreditNotes =
                  await this.xeroPaymentsService.deleteCreditNotes(decoded, {
                    payment_id: payload.payment_id,
                  });
                // console.log('deleteCreditNotes: ', deleteCreditNotes);
              }
            }
          } else if (
            isExisted &&
            [
              'Overpayment refund from supplier',
              'Overpayment refund to client',
            ].includes(paymentDetails.payment_type)
          ) {
            const deleteOverPaymentRefundDetails =
              await this.xeroPaymentsService.deleteOverPaymentRefund(decoded, {
                payment_id: paymentDetails.payment_id,
              });
            this.logger.log(
              `deleteOverPaymentRefundDetails: ${JSON.stringify(deleteOverPaymentRefundDetails)}`,
            );
          } else if (
            isExisted &&
            ['Overpayment to supplier', 'Overpayment from client'].includes(
              paymentDetails.payment_type,
            )
          ) {
            const deleteOverPaymentDetails =
              await this.xeroPaymentsService.deleteOverPayment(decoded, {
                payment_id: paymentDetails.payment_id,
              });
            this.logger.log(`deleteOverPaymentDetails: ${JSON.stringify(deleteOverPaymentDetails)}`);
          }
        }
      }
      return response;
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of a payment with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => EditDetailsOfAPaymentResponse, {
    name: 'editDetailsOfAPayment',
    description: `Edit an existing payment's details and synchronize the updates with Xero if integration is enabled.`,
  })
  async editDetailsOfAPayment(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing payment ID and updated payment details such as amounts, dates, accounts, and confirmation flags.',
    })
    payload: EditDetailsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing the details of a payment with id: ${payload.payment_id}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.paymentsService.editDetailsOfAPayment(
        decoded,
        payload,
        decoded?.userId,
      );

      const paymentDetails = await this.paymentsService.fetchPaymentDetails(
        payload.payment_id,
      );

      if (response && paymentDetails && !payload?.delete_paytrade_only) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          paymentDetails.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const isExisted =
            await this.xeroPaymentsService.checkExistingXeroPayment(
              payload.payment_id,
              xeroDetails.integration_id,
            );
          if (
            ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
              paymentDetails?.payment_type,
            )
          ) {
            let xeroPayload: any = {
              payment_id: payload.payment_id,
              payment_date: paymentDetails.payment_date,
              bank_account_id: null,
              amount: 0,
              retention_amount: 0,
              cash_retention: paymentDetails?.cash_retention,
            };
            let isPaymentChecked = null,
              isRetentionChecked = null;
            await Promise.all(
              paymentDetails.subPayments.map(async (element) => {
                if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_paid_confirmed !== null &&
                  element.is_received_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_from_account;
                  xeroPayload.amount = Math.abs(element.amount);
                  isPaymentChecked = element.is_paid_confirmed;
                } else if (
                  element.sub_payment_type === 'Retention Out' &&
                  element.is_retention_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_received_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_from_account;
                  xeroPayload.retention_account =
                    paymentDetails.retention_account;
                  xeroPayload.retention_amount = Math.abs(element.amount);
                  isRetentionChecked = element.is_retention_confirmed;
                } else if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_received_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  xeroPayload.bank_account_id =
                    paymentDetails.payment_to_account;
                  xeroPayload.amount = Math.abs(element.amount);
                  isPaymentChecked = element.is_received_confirmed;
                }
              }),
            );
            if (xeroPayload && xeroPayload.bank_account_id) {
              // ---------------------------------------------------------
              // Task #50 — Same independent-gate logic as addPayment.
              // We compute which legs are still missing (either the row
              // does not exist, or the corresponding column is null) and
              // pass sync_payment/sync_transfer accordingly. The service
              // upserts so callers can safely re-fire on every save.
              // ---------------------------------------------------------
              const paymentLegSynced = !!isExisted?.payment_id;
              const transferLegSynced = !!isExisted?.bank_transfer_id;
              const wantPayment = !!isPaymentChecked && !paymentLegSynced;
              const wantTransfer =
                !!paymentDetails.cash_retention &&
                !!isRetentionChecked &&
                !transferLegSynced;
              // ---------------------------------------------------------
              // Task #52 — Per-leg un-tick detection. When a previously
              // synced checkbox is now explicitly unchecked, delete the
              // matching Xero record so PT and Xero stay in sync. We
              // only treat `=== false` as un-tick (null = no matching
              // subPayment row → no-op).
              // ---------------------------------------------------------
              const wantDeletePayment =
                isPaymentChecked === false && paymentLegSynced;
              const wantDeleteTransfer =
                !!paymentDetails.cash_retention &&
                isRetentionChecked === false &&
                transferLegSynced;
              if (wantPayment || wantTransfer) {
                const createPaymentDetails =
                  await this.xeroPaymentsService.createPayment(decoded, {
                    ...xeroPayload,
                    sync_payment: wantPayment,
                    sync_transfer: wantTransfer,
                  });
                this.logger.log(`createPaymentDetails: ${JSON.stringify(createPaymentDetails)}`);
              } else if (wantDeletePayment || wantDeleteTransfer) {
                try {
                  const deletePerLegDetails =
                    await this.xeroPaymentsService.deletePayment(decoded, {
                      ...xeroPayload,
                      delete_payment: wantDeletePayment,
                      delete_transfer: wantDeleteTransfer,
                    });
                  this.logger.log(
                    `deletePerLegDetails: ${JSON.stringify(deletePerLegDetails)}`,
                  );
                } catch (err: any) {
                  // Xero refused one or both legs. The service
                  // attaches `legResults` describing per-leg outcome
                  // — we revert ONLY the un-tick(s) whose Xero side
                  // did NOT persist, so PT and Xero stay strictly in
                  // sync (e.g. payment-leg succeeded + transfer-leg
                  // failed ⇒ keep is_paid_confirmed false, but
                  // re-tick is_retention_confirmed because the
                  // BankTransfer is still live in Xero).
                  this.logger.log(
                    `deletePerLeg failed, reverting failed-leg un-ticks only: ${JSON.stringify(err?.message ?? err)}`,
                  );
                  const legResults = err?.legResults as
                    | {
                        paymentRequested: boolean;
                        paymentDeleted: boolean;
                        transferRequested: boolean;
                        transferReversed: boolean;
                      }
                    | undefined;
                  // Defensive fallback: if the inner helper threw
                  // before recording per-leg results (shouldn't
                  // happen post-refactor, but defensive), revert
                  // everything that was requested.
                  const revertPaid = legResults
                    ? legResults.paymentRequested && !legResults.paymentDeleted
                    : wantDeletePayment;
                  const revertRetention = legResults
                    ? legResults.transferRequested &&
                      !legResults.transferReversed
                    : wantDeleteTransfer;
                  await this.paymentsService.revertSubPaymentConfirmation(
                    payload.payment_id,
                    { paid: revertPaid, retention: revertRetention },
                  );
                  throw err;
                }
              } else if (
                isExisted &&
                ['Unconfirmed - Unmatched'].includes(
                  paymentDetails.current_status,
                )
              ) {
                const deletePaymentDetails =
                  await this.xeroPaymentsService.deletePayment(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(`deletePaymentDetails: ${JSON.stringify(deletePaymentDetails)}`);
              }
            }
          } else if (
            [
              'Overpayment refund from supplier',
              'Overpayment refund to client',
            ].includes(paymentDetails.payment_type)
          ) {
            if (
              !isExisted &&
              paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
              ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
                paymentDetails.subPayments[0].is_paid_confirmed === true &&
                paymentDetails.subPayments[0].is_received_confirmed === null) ||
                (paymentDetails.subPayments[0].is_received_confirmed !== null &&
                  paymentDetails.subPayments[0].is_received_confirmed ===
                    true &&
                  paymentDetails.subPayments[0].is_paid_confirmed === null))
            ) {
              const createOverPaymentRefundDetails =
                await this.xeroPaymentsService.createOverPaymentRefund(
                  decoded,
                  {
                    payment_id: paymentDetails.payment_id,
                    overpayment_id:
                      paymentDetails.associatedOverPayment.payment_id,
                  },
                );
              this.logger.log(
                `createOverPaymentRefundDetails: ${JSON.stringify(createOverPaymentRefundDetails)}`,
              );
            } else if (
              isExisted &&
              paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
              ['Unconfirmed - Unmatched'].includes(
                paymentDetails.current_status,
              )
              //  &&   ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
              // paymentDetails.subPayments[0].is_paid_confirmed === false &&
              // paymentDetails.subPayments[0].is_received_confirmed === null) ||
              // (paymentDetails.subPayments[0].is_received_confirmed !== null &&
              //   paymentDetails.subPayments[0].is_received_confirmed ===
              //     false &&
              //   paymentDetails.subPayments[0].is_paid_confirmed === null))
            ) {
              const deleteOverPaymentRefundDetails =
                await this.xeroPaymentsService.deleteOverPaymentRefund(
                  decoded,
                  {
                    payment_id: payload.payment_id,
                  },
                );
              this.logger.log(
                `deleteOverPaymentRefundDetails: ${JSON.stringify(deleteOverPaymentRefundDetails)}`,
              );
            }
          } else if (
            ['Overpayment to supplier', 'Overpayment from client'].includes(
              paymentDetails.payment_type,
            )
          ) {
            if (
              !isExisted &&
              paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
              ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
                paymentDetails.subPayments[0].is_paid_confirmed === true &&
                paymentDetails.subPayments[0].is_received_confirmed === null) ||
                (paymentDetails.subPayments[0].is_received_confirmed !== null &&
                  paymentDetails.subPayments[0].is_received_confirmed ===
                    true &&
                  paymentDetails.subPayments[0].is_paid_confirmed === null))
            ) {
              const createOverPaymentDetails =
                await this.xeroPaymentsService.createOverPayment(decoded, {
                  payment_id: paymentDetails.payment_id,
                  bank_account_id:
                    paymentDetails.payment_type === 'Overpayment to supplier'
                      ? paymentDetails.payment_from_account
                      : paymentDetails.payment_to_account,
                  amount: Math.abs(Number(paymentDetails.total_amount)),
                  payment_date: paymentDetails.payment_date,
                });
              this.logger.log(
                `createOverPaymentDetails: ${JSON.stringify(createOverPaymentDetails)}`,
              );
            } else if (
              isExisted &&
              paymentDetails.subPayments[0].sub_payment_type === 'Payment' &&
              ['Unconfirmed - Unmatched'].includes(
                paymentDetails.current_status,
              )
              // && ((paymentDetails.subPayments[0].is_paid_confirmed !== null &&
              //   paymentDetails.subPayments[0].is_paid_confirmed === false &&
              //   paymentDetails.subPayments[0].is_received_confirmed === null) ||
              //   (paymentDetails.subPayments[0].is_received_confirmed !== null &&
              //     paymentDetails.subPayments[0].is_received_confirmed ===
              //       false &&
              //     paymentDetails.subPayments[0].is_paid_confirmed === null))
            ) {
              const deleteOverPaymentDetails =
                await this.xeroPaymentsService.deleteOverPayment(decoded, {
                  payment_id: payload.payment_id,
                });
              this.logger.log(
                `deleteOverPaymentDetails: ${JSON.stringify(deleteOverPaymentDetails)}`,
              );
            }
          }
        }
      }

      return response;
    } catch (error) {
      // Task #52 — defense-in-depth: some inner Xero call sites
      // historically `throw` raw strings, where `error.message` is
      // undefined. Coerce so the GraphQL response always carries a
      // user-actionable string (e.g. "Payment is already reconciled").
      const errMsg =
        error?.message ??
        (typeof error === 'string' ? error : JSON.stringify(error));
      this.logger.error(
        `Errored while editing the details of a payment with message: ${errMsg}`,
      );
      return framedResponse(`ERROR`, `${errMsg}`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchDetailsOfAPaymentResponse, {
    name: 'fetchDetailsOfAPayment',
    description:
      'Fetch complete details of a specific payment including payment breakdowns, status, and related accounts.',
  })
  async fetchDetailsOfAPayment(
    @Args('payload', {
      description:
        'Input containing the payment ID used to fetch complete payment details.',
    })
    payload: FetchDetailsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the details of a payment with id: ${payload.payment_id}`,
      );

      const fetchedAllRequiredPaymentDetails =
        await this.paymentsService.fetchDetailsOfAPayment(payload);

      return framedResponse(
        'SUCCESS',
        `Details of a payment with id: ${payload.payment_id} has fetched successfully.`,
        fetchedAllRequiredPaymentDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error.message}`,
      );
      return framedResponse(
        `ERROR`,
        `Errored while fetching the details of a payment with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllRetentionInPaymentsListResponse, {
    name: 'fetchAllRetentionInPaymentsList',
    description:
      'Retrieve all retention-related payments based on filters including project, company.',
  })
  async fetchAllRetentionInPaymentsList(
    @Args('payload', {
      description:
        'Input containing filters such as project, company, and date range to retrieve retention-related payments.',
    })
    payload: FetchAllRetentionInPaymentsListInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching all retention in payments list with payload: ${JSON.stringify(payload)}.`,
      );

      const retentionPaymentList =
        await this.paymentsService.fetchAllRetentionInPaymentsList(payload);
      // console.log('retentionPaymentList', retentionPaymentList);

      return retentionPaymentList;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all matched retention in payments with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all matched retention in payments with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchRetentionSummaryResponse, {
    name: 'fetchRetentionSummary',
    description:
      'Fetch aggregated retention totals and summary calculations for sub-payments.',
  })
  async fetchRetentionSummary(
    @Args('payload', {
      description:
        'Input containing filters required to calculate and fetch aggregated retention summary data.',
    })
    payload: FetchRetentionSummaryInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching retention summary of the sub payment with payload: ${JSON.stringify(payload)}.`,
      );

      const retentionSummary =
        await this.paymentsService.fetchRetentionSummary(payload);

      return retentionSummary;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all retention summary of the sub payment with message: ${error}`,
      );
      return framedResponse('ERROR', `${error}`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllSubPaymentsOfAPaymentResponse, {
    name: 'fetchAllSubPaymentsOfAPayment',
    description:
      'Retrieve all sub-payments associated with a specific payment including retention and payment splits.',
  })
  async fetchAllSubPaymentsOfAPayment(
    @Args('payload', {
      description:
        'Input containing the payment ID used to retrieve all associated sub-payments.',
    })
    payload: FetchAllSubPaymentsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all sub payments of a payment with payload: ${JSON.stringify(payload)}.`,
      );

      const allSubPayments =
        await this.paymentsService.fetchAllSubPaymentsOfAPayment(payload);
      return allSubPayments;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all sub payments of a payment with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all sub payments of a payment with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllTheMatchedTransactionsOfAPaymentResponse, {
    name: 'fetchAllTheMatchedTransactionsOfAPayment',
    description:
      'Fetch all bank transactions and retentions matched to a specific payment for reconciliation.',
  })
  async fetchAllTheMatchedTransactionsOfAPayment(
    @Args('payload', {
      description:
        'Input containing payment ID to fetch all matched bank transactions and retentions linked to the payment.',
    })
    payload: FetchAllTheMatchedTransactionsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all the matched retentions of a payment with payload: ${JSON.stringify(payload)}.`,
      );

      const allMatchedTransactionsOfAPayment =
        await this.paymentsService.fetchAllTheMatchedTransactionsOfAPayment(
          payload,
        );
      return allMatchedTransactionsOfAPayment;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all the matched retentions of a payment with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all the matched retentions of a payment with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetListOfAllPaymentsToDoInDashboardResponse, {
    name: 'getListOfAllPaymentsToDoInDashboard',
    description:
      'Fetch all pending actions related to payments for dashboard display.',
  })
  async getListOfAllPaymentsToDoInDashboard(
    @Args('payload', {
      description:
        'Input containing user, company, and filter details to fetch pending payment actions for dashboard display.',
    })
    payload: GetListOfAllPaymentsToDoInDashboardInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting list of all payments to do in dashboard with data: ${JSON.stringify(payload)}.`,
      );

      return this.paymentsService.getListOfAllPaymentsToDoInDashboard(payload);
    } catch (error) {
      this.logger.error(
        `Errored while getting list of all payments to do in dashboard with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while getting list of all payments to do in dashboard with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => FetchAllUnmatchedPaymentsOfACompanyResponse, {
    name: 'fetchAllUnmatchedPaymentsOfACompany',
    description:
      'Retrieve all unmatched payments for a company to assist with reconciliation and error resolution.',
  })
  async fetchAllUnmatchedTransactionsOfACompany(
    @Args('company_id', {
      description:
        'Unique identifier of the company whose unmatched payments need to be fetched',
    })
    company_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all unmatched payments of a company with data; ${company_id}`,
      );

      const response =
        await this.paymentsService.fetchAllUnmatchedPaymentsOfACompany(
          company_id,
        );
      return framedResponse(
        'SUCCESS',
        'List of all unmatched payments successfully fetched.',
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all unmatched payments of a company with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all unmatched payments of a company with message: ${error}`,
      );
    }
  }
}
