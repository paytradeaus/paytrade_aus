import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  ExcludeTransactionInput,
  FetchAllTransactionsInput,
  FetchAllTransactionsOfABankAccountInput,
  FetchAllUnmatchedTransactionsOfACompanyInput,
  FetchDetailsOfATransactionInBankAccountInput,
} from './transactions.input';
import {
  AddTransactionsFromCsv,
  ExcludeTransactionResponse,
  FetchAllTransactionsOfABankAccountResponse,
  FetchAllTransactionsResponse,
  FetchDetailsOfATransactionInBankAccountResponse,
  ProcessFilterCsvUpload,
  csvTemplateFileDetailsResponse,
  fetchAllUnmatchedTransactionsOfACompanyResponse,
  BatchSuggestedMatchesResponse,
  BatchMatchResponse,
  QuickAdjustMatchResponse,
  SmartMatchPreferenceResponse,
} from './transactions.response';
import { TransactionsService } from './transactions.service';
import {
  deleteTxnsResponse,
  ListforMatchingTxnPaymentsResponse,
  MatchedTxnPaymentsResponse,
  UnMatchTxnPaymentsResponse,
} from '../payments/payments.response';
import { handleError } from 'src/api/common/error-handler';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CompliancesService } from '../../compliances/compliances.service';
import { XeroPaymentsService } from 'src/api/common/integrations/xero/payments/xero-payments.service';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { PaymentsService } from '../payments/payments.service';
import { BankTransaction } from 'xero-node';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class TransactionsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly transactionsService: TransactionsService,
    private readonly complianceService: CompliancesService,
    private readonly paymentsService: PaymentsService,
    private readonly xeroPaymentsService: XeroPaymentsService,
    private readonly xeroService: XeroService,
  ) {
    this.logger = new PaytradeLogger('TRANSACTIONS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchAllTransactionsOfABankAccountResponse, {
    name: 'fetchAllTransactionsOfABankAccount',
    description:
      'Retrieve all transactions associated with a specific bank account.',
  })
  async fetchAllTransactionsOfABankAccount(
    @Args('payload', {
      description:
        'Input containing the bank account ID along with optional filters and pagination details to retrieve all associated transactions.',
    })
    payload: FetchAllTransactionsOfABankAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all transactions of a bank account with id: ${payload.bank_account_id}.`,
      );

      return this.transactionsService.fetchAllTransactionsOfABankAccount(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all transactions of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all transactions of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchDetailsOfATransactionInBankAccountResponse, {
    name: 'fetchDetailsOfATransactionInBankAccount',
    description:
      'Fetch detailed information of a single transaction from a bank account.',
  })
  async fetchDetailsOfATransactionInBankAccount(
    @Args('payload', {
      description:
        'Input containing bank account ID and transaction ID used to fetch detailed information of a specific transaction.',
    })
    payload: FetchDetailsOfATransactionInBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching details of a transaction in bank account with id: ${payload.bank_account_id}.`,
      );

      return this.transactionsService.fetchDetailsOfATransactionInBankAccount(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of a transaction with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching details of a transaction with message: ${error.message}`,
      );
    }
  }

  //An API for adding latest_csv_transaction_file_attachment_id along with the bank account should be added if needed.

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN, Role.STANDARD_USER)
  @Mutation(() => ExcludeTransactionResponse, {
    name: 'excludeTransactions',
    description: 'Exclude selected bank transactions from matching.',
  })
  async excludeTransactions(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing one or more bank transaction IDs and exclusion flags to mark transactions as excluded from matching.',
    })
    payload: ExcludeTransactionInput,
  ) {
    try {
      this.logger.log(`Request received for excluding transactions `);

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.transactionsService.excludeTransactions(
        payload,
        decoded?.userId,
      );
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of a transaction in bank account with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while changing the status of a transaction in bank account with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => csvTemplateFileDetailsResponse, {
    name: 'downloadTransactionUploadCsvTemplate',
    description:
      'Download a CSV template based on the selected financial institution for uploading bank transactions.',
  })
  async downloadTransactionUploadCsvTemplate(
    @Context() context,
    @Args('financialInstitutionId', {
      description:
        'ID of the financial institution for which the CSV template is requested',
    })
    financialInstitutionId: string,
  ): Promise<csvTemplateFileDetailsResponse> {
    try {
      this.logger.log(`Request to download csv template`);

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.transactionsService.downloadCsvTemplate(
        financialInstitutionId,
        decoded?.userId,
      );
    } catch (error) {
      this.logger.error(
        `Errored while downloading the csv template with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while downloading the csv template with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ProcessFilterCsvUpload, {
    name: 'processUploadedTransactionsCsv',
    description:
      'Validate and filter uploaded CSV transactions before final confirmation and import.',
  })
  async processUploadedTransactionsCsv(
    @Context() context,
    @Args('filePath', { description: 'Server path of the uploaded CSV file' })
    filePath: string,
    @Args('bank_account_id', {
      description:
        'ID of the bank account associated with the uploaded CSV transactions',
    })
    bank_account_id: number,
  ): Promise<ProcessFilterCsvUpload> {
    try {
      this.logger.log(`Processing uploaded CSV file at path: ${filePath}`);

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.transactionsService.processUploadedTxnCsvFile(
        filePath,
        bank_account_id,
        decoded?.userId,
      );
    } catch (error) {
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => AddTransactionsFromCsv, {
    name: 'addSelectedTransactionsFromCsv',
    description:
      'Confirm and import selected transactions from a CSV file into the system and update compliance if required.',
  })
  async addSelectedTransactionsFromCsv(
    @Context() context,
    @Args('selected_ids', {
      type: () => [String],
      description:
        'List of transaction IDs selected for import from the CSV file',
    })
    selected_ids: string[],
    @Args('balance_manual', {
      nullable: true,
      description:
        'Optional manually entered balance to adjust transactions if required',
    })
    balance_manual: number | null,
    @Args('company_id', {
      description: 'ID of the company to which these transactions belong',
    })
    company_id: number,
    @Args('bank_account_id', {
      description: 'ID of the bank account where transactions will be applied',
    })
    bank_account_id: number,
    @Args('confirm', {
      type: () => Boolean,
      description: 'Confirmation flag indicating whether to finalize import',
    })
    confirm: boolean,
  ): Promise<AddTransactionsFromCsv> {
    try {
      this.logger.log(`adding selected payments from csv`);

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const uploadedtransactions =
        await this.transactionsService.addSelectedTransactions(
          selected_ids,
          balance_manual,
          decoded?.userId,
          company_id,
          bank_account_id,
          confirm,
        );

      if (uploadedtransactions) {
        const bankAccounts =
          await this.transactionsService.fetchBankAccountDetailsforCompliance([
            bank_account_id,
          ]);

        for (const account of bankAccounts) {
          if (account.project_ids.length) {
            const projectIds =
              account.project_ids.split(',').map((id) => Number(id.trim())) ||
              [];
            if (
              account.account_type === 'Project Trust Account' ||
              account.account_type === 'Retention Trust Account'
            ) {
              for (const projectId of projectIds) {
                this.logger.log(`projectId: ${projectId}`);
                await this.complianceService.fetchComplianceResultsOfAProject({
                  project_id: projectId,
                  bank_account_type: account.account_type,
                  failedFilter: false,
                });
              }
            }
          }
        }
      }

      return uploadedtransactions;
    } catch (error) {
      return framedResponse(
        'ERROR',
        `Errored while adding selected csv txns${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchAllTransactionsResponse, {
    name: 'fetchAllTransactions',
    description: 'Fetch all transactions of a bank account.',
  })
  async fetchAllTransactions(
    @Context() context,
    @Args('payload', {
      description:
        'Input containing the bank account ID along with filters, pagination, and date range details to fetch all related transactions.',
    })
    payload: FetchAllTransactionsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all transactions of a bank account with id: ${payload.bank_account_id}.`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      return this.transactionsService.fetchAllTransactions(payload, timezone);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all transactions of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all transactions of a bank account with id: ${payload.bank_account_id} with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ListforMatchingTxnPaymentsResponse, {
    name: 'fetchPaymentsToMatchTransactions',
    description:
      'Retrieve a list of payments that can be matched with the selected bank transactions.',
  })
  async fetchPaymentsToMatchTransactions(
    @Context() context,
    @Args('transaction_ids', {
      type: () => [String],
      description:
        'List of transaction IDs for which matching payments are requested',
    })
    transaction_ids: string[],
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for fetching matching payments to transaction with ids: ${transaction_ids.join(', ')}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';

      return await this.transactionsService.fetchPaymentsToMatch(
        transaction_ids,
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching matching payments to transactions with ids: ${transaction_ids.join(', ')} with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching matching payments to transactions with ids: ${transaction_ids.join(', ')} with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => MatchedTxnPaymentsResponse, {
    name: 'matchTransactions',
    description:
      'Match selected bank transactions with payments and synchronize results with Xero and compliance services.',
  })
  async matchTransactions(
    @Context() context,
    @Args('transaction_ids', {
      type: () => [String],
      description: 'List of bank transaction IDs to be matched with payments',
    })
    transaction_ids: string[],
    @Args('payment_ids', {
      type: () => [Number],
      description:
        'List of payment IDs that correspond to the selected transactions',
    })
    payment_ids: number[],
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for matching payments to transaction with ids: ${transaction_ids.join(', ')}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response = (await this.transactionsService.matchTxnsToPayments(
        transaction_ids,
        payment_ids,
        decoded?.userId,
      )) as MatchedTxnPaymentsResponse;

      if (
        response &&
        response?.data?.payments &&
        response?.data?.payments.length > 0 &&
        response?.data?.transactions &&
        response?.data?.transactions.length > 0
      ) {
        const duplicatePaymentIds = response?.data?.payments?.map(
          (payment) => payment.payment_id,
        );
        const uniquePaymentIds = new Set(duplicatePaymentIds);

        const uniqueProjectIds = new Set<number>();
        for (const payment_id of uniquePaymentIds) {
          const paymentDetails =
            await this.paymentsService.fetchPaymentDetails(payment_id);

          if (paymentDetails?.project_id) {
            uniqueProjectIds.add(paymentDetails.project_id);
          }
          for (const project_id of uniqueProjectIds) {
            const compliance_pta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              });

            const compliance_rta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              });
          }
        }

        const company_id = response?.data?.payments[0]?.company_id;
        const xeroDetails =
          await this.xeroService.getIntegrationDetails(company_id);
        this.logger.log(JSON.stringify({ xeroDetails }));
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          let xeroPayloads = [],
            overpaymentPayloads = [];

          for (const payment_id of uniquePaymentIds) {
            const paymentDetails =
              await this.paymentsService.fetchPaymentDetails(payment_id);

            if (
              paymentDetails &&
              [
                'Unconfirmed - Matched',
                'Paid - Matched',
                'Received - Matched',
              ].includes(paymentDetails.current_status) &&
              ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
                paymentDetails?.payment_type,
              )
            ) {
              let xeroPayload: any = {
                payment_id: payment_id,
                payment_date: paymentDetails.payment_date,
                bank_account_id: null,
                amount: 0,
                retention_amount: 0,
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
                    xeroPayload.amount = Math.abs(element.amount); //+ overpayment;
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
                    xeroPayload.amount = Math.abs(element.amount); //+ overpayment;
                  }
                }),
              );
              if (xeroPayload && xeroPayload.bank_account_id) {
                xeroPayloads.push(xeroPayload);
              }

              const overPaymentDetails =
                await this.paymentsService.fetchOverPaymentDetails(payment_id);
              this.logger.log(JSON.stringify({ overPaymentDetails }));
              if (overPaymentDetails && overPaymentDetails.length > 0) {
                for (const element of overPaymentDetails) {
                  if (
                    [
                      'Unconfirmed - Matched',
                      'Paid - Matched',
                      'Received - Matched',
                    ].includes(element.current_status)
                  ) {
                    overpaymentPayloads.push({
                      payment_id: element.payment_id,
                      bank_account_id:
                        element.payment_type === 'Overpayment to supplier'
                          ? element.payment_from_account
                          : element.payment_to_account,
                      amount: Math.abs(Number(element.total_amount)),
                      payment_date: element.payment_date,
                    });
                  }
                }
                this.logger.log(JSON.stringify({ overpaymentPayloads }));
              }
            } else if (
              paymentDetails &&
              [
                'Unconfirmed - Matched',
                'Paid - Matched',
                'Received - Matched',
              ].includes(paymentDetails.current_status) &&
              [
                'Overpayment refund from supplier',
                'Overpayment refund to client',
              ].includes(paymentDetails?.payment_type)
            ) {
              const isExisted =
                await this.xeroPaymentsService.checkExistingXeroPayment(
                  paymentDetails.payment_id,
                  xeroDetails.integration_id,
                );
              this.logger.log(JSON.stringify({ isExisted }));
              if (!isExisted) {
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
              }
            } else if (
              paymentDetails &&
              [
                'Unconfirmed - Matched',
                'Paid - Matched',
                'Received - Matched',
              ].includes(paymentDetails.current_status) &&
              ['Overpayment to supplier', 'Overpayment from client'].includes(
                paymentDetails?.payment_type,
              )
            ) {
              const isExisted =
                await this.xeroPaymentsService.checkExistingXeroPayment(
                  paymentDetails.payment_id,
                  xeroDetails.integration_id,
                );
              this.logger.log(JSON.stringify({ isExisted }));
              if (!isExisted) {
                overpaymentPayloads.push({
                  payment_id: paymentDetails.payment_id,
                  bank_account_id:
                    paymentDetails.payment_type === 'Overpayment to supplier'
                      ? paymentDetails.payment_from_account
                      : paymentDetails.payment_to_account,
                  amount: Math.abs(Number(paymentDetails.total_amount)),
                  payment_date: paymentDetails.payment_date,
                });
              }
              this.logger.log(`overpaymentPayloads: : ${JSON.stringify(overpaymentPayloads)}`);
            }
          }
          this.logger.log(JSON.stringify({ xeroPayloads }));
          if (xeroPayloads && xeroPayloads.length > 0) {
            for (const xeroPayload of xeroPayloads) {
              const isExisted =
                await this.xeroPaymentsService.checkExistingXeroPayment(
                  xeroPayload.payment_id,
                  xeroDetails.integration_id,
                );
              this.logger.log(JSON.stringify({ isExisted }));
              if (!isExisted) {
                const createPaymentDetails =
                  await this.xeroPaymentsService.createPayment(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(`createPaymentDetails: : ${JSON.stringify(createPaymentDetails)}`);
              }
            }
          }

          if (overpaymentPayloads && overpaymentPayloads.length > 0) {
            for (const overpaymentPayload of overpaymentPayloads) {
              const createOverPaymentDetails =
                await this.xeroPaymentsService.createOverPayment(
                  decoded,
                  overpaymentPayload,
                );
              this.logger.log(
                `createOverPaymentDetails: ${JSON.stringify(createOverPaymentDetails)}`,
              );
            }
          }
        }
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Errored while matching payments to transactions with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `${error.message ? error.message : error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => UnMatchTxnPaymentsResponse, {
    name: 'unmatchTransactions',
    description:
      'Unmatch a transaction from its associated payment and reverse related accounting and compliance effects.',
  })
  async unmatchTransactions(
    @Context() context,
    @Args('transaction_id', {
      nullable: true,
      description: 'The transaction ID to unmatch from its associated payment',
    })
    transaction_id: string,
    @Args('confirm', {
      nullable: true,
      description:
        'Confirm unmatching to trigger associated compliance and Xero updates',
    })
    confirm: boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for unmatching payments to transaction with id: ${transaction_id}.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response = (await this.transactionsService.unmatchTxnsPayments(
        transaction_id,
        confirm,
        decoded?.userId,
      )) as UnMatchTxnPaymentsResponse;

      if (
        confirm &&
        response &&
        response?.data?.payments &&
        response?.data?.payments.length > 0
      ) {
        const duplicatePaymentIds = response?.data?.payments.map(
          (payment) => payment.payment_id,
        );
        const uniquePaymentIds = new Set(duplicatePaymentIds);
        const uniqueProjectIds = new Set<number>();
        if (!uniquePaymentIds) {
          return response;
        }
        for (const payment_id of uniquePaymentIds) {
          const paymentDetails =
            await this.paymentsService.fetchPaymentDetails(payment_id);

          if (paymentDetails?.project_id) {
            uniqueProjectIds.add(paymentDetails.project_id);
          }
          for (const project_id of uniqueProjectIds) {
            const compliance_pta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              });

            const compliance_rta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              });
          }
        }

        const company_id = response?.data?.payments[0]?.company_id;
        const xeroDetails =
          await this.xeroService.getIntegrationDetails(company_id);
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          let xeroPayloads = [],
            overpaymentPayloads = [];

          for (const payment_id of uniquePaymentIds) {
            const paymentDetails =
              await this.paymentsService.fetchPaymentDetails(payment_id);
            const isExisted =
              await this.xeroPaymentsService.checkExistingXeroPayment(
                payment_id,
                xeroDetails.integration_id,
              );
            if (
              isExisted &&
              ['Unconfirmed - Unmatched'].includes(
                paymentDetails.current_status,
              )
            ) {
              if (
                ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
                  paymentDetails?.payment_type,
                )
              ) {
                // if (
                //   isExisted &&
                //   [
                //     'Unconfirmed - Unmatched',
                // 'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                // 'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                // 'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
                // 'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                // 'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched',
                // 'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched',
                // 'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                // 'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
                // 'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                // 'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
                // 'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
                // 'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                // 'Paid - Unmatched',
                // 'Received - Unmatched',
                //   ].includes(paymentDetails.current_status)
                // ) {
                let xeroPayload: any = {
                  payment_id,
                  bank_account_id: null,
                  amount: 0,
                  retention_amount: 0,
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

                if (xeroPayload && xeroPayload.bank_account_id) {
                  xeroPayloads.push(xeroPayload);
                }

                const overPaymentDetails =
                  await this.paymentsService.fetchOverPaymentDetails(
                    payment_id,
                  );
                this.logger.log(JSON.stringify({ overPaymentDetails }));
                if (overPaymentDetails && overPaymentDetails.length > 0) {
                  for (const element of overPaymentDetails) {
                    if (
                      ['Unconfirmed - Unmatched'].includes(
                        element.current_status,
                      )
                    ) {
                      overpaymentPayloads.push({
                        payment_id: element.payment_id,
                      });
                    }
                  }
                  this.logger.log(JSON.stringify({ overpaymentPayloads }));
                }
                this.logger.log(JSON.stringify({ xeroPayloads }));
                if (xeroPayloads && xeroPayloads.length > 0) {
                  for (const xeroPayload of xeroPayloads) {
                    const deletePaymentDetails =
                      await this.xeroPaymentsService.deletePayment(
                        decoded,
                        xeroPayload,
                      );
                    this.logger.log(`deletePaymentDetails: : ${JSON.stringify(deletePaymentDetails)}`);
                  }
                }
                if (overpaymentPayloads && overpaymentPayloads.length > 0) {
                  for (const overpaymentPayload of overpaymentPayloads) {
                    const deleteOverPaymentDetails =
                      await this.xeroPaymentsService.deleteOverPayment(
                        decoded,
                        overpaymentPayload,
                      );
                    this.logger.log(
                      `deleteOverPaymentDetails: ${JSON.stringify(deleteOverPaymentDetails)}`,
                    );
                  }
                }
                // }
              } else if (
                [
                  'Overpayment refund from supplier',
                  'Overpayment refund to client',
                ].includes(paymentDetails.payment_type)
              ) {
                const deleteOverPaymentRefundDetails =
                  await this.xeroPaymentsService.deleteOverPaymentRefund(
                    decoded,
                    { payment_id: paymentDetails.payment_id },
                  );
                this.logger.log(
                  `deleteOverPaymentRefundDetails: ${JSON.stringify(deleteOverPaymentRefundDetails)}`,
                );
              } else if (
                ['Overpayment to supplier', 'Overpayment from client'].includes(
                  paymentDetails.payment_type,
                )
                // ![
                //   'Unconfirmed - Matched',
                //   'Paid - Matched',
                //   'Received - Matched',
                //   'Deleted',
                //   'Draft',
                // ].includes(paymentDetails.current_status)
              ) {
                const deleteOverPaymentDetails =
                  await this.xeroPaymentsService.deleteOverPayment(decoded, {
                    payment_id: paymentDetails.payment_id,
                  });
                this.logger.log(
                  `deleteOverPaymentDetails: ${JSON.stringify(deleteOverPaymentDetails)}`,
                );
              }
            }
          }
        }
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Errored while unmatching payments to transactions with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while unmatching payments to transactions with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => UnMatchTxnPaymentsResponse, {
    name: 'bulkUnmatchTransactions',
    description:
      'Unmatch multiple transactions from their linked payments in a single operation.',
  })
  async bulkUnmatchTransactions(
    @Context() context,
    @Args('transaction_ids', {
      type: () => [String],
      description:
        'List of transaction IDs to unmatch from their associated payments',
    })
    transaction_ids: string[],
    @Args('confirm', {
      nullable: true,
      description:
        'Confirm unmatching to trigger associated compliance and Xero updates',
    })
    confirm: boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `Handling request for unmatching payments for transaction IDs: ${transaction_ids.join(', ')}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return await this.transactionsService.bulkUnmatchTxnsPayments(
        transaction_ids,
        confirm,
        decoded?.userId,
      );
    } catch (error) {
      this.logger.error(
        `Errored while unmatching payments to transactions with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while unmatching payments to transactions with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => deleteTxnsResponse, {
    name: 'deleteTransactions',
    description: 'Permanently remove selected transactions from the system.',
  })
  async deleteTransactions(
    @Context() context,
    @Args('transaction_ids', {
      type: () => [String],
      description: 'List of transaction IDs to be permanently deleted',
    })
    transaction_ids: string[],
  ): Promise<any> {
    try {
      this.logger.log(
        `Handling request for deleting transaction with IDs: ${transaction_ids.join(', ')}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      await this.transactionsService.deleteTxns(transaction_ids, decoded);

      return framedResponse('SUCCESS', `Transaction deleted successfully`);
    } catch (error) {
      this.logger.error(
        `Errored while deleting transactions with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while deleting transactions with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => fetchAllUnmatchedTransactionsOfACompanyResponse, {
    name: 'fetchAllUnmatchedTransactionsOfACompany',
    description:
      'Retrieve all bank transactions of a company that are not matched to any payments.',
  })
  async fetchAllUnmatchedTransactionsOfACompany(
    @Args('payload', {
      description:
        'Input containing the company ID along with optional filters such as date range, bank account, pagination, and sorting to fetch all unmatched bank transactions.',
    })
    payload: FetchAllUnmatchedTransactionsOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all unmatched transactions of a company with data; ${payload}`,
      );

      const allUnmatchedTransactionsOfACompany =
        await this.transactionsService.fetchAllUnmatchedTransactionsOfACompany(
          payload,
        );
      return allUnmatchedTransactionsOfACompany;
    } catch (error) {
      this.logger.error(
        `Errored while fetching all unmatched transactions of a company with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all unmatched transactions of a company with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN, Role.STANDARD_USER)
  @Query(() => BatchSuggestedMatchesResponse, {
    name: 'fetchBatchSuggestedMatches',
    description:
      'Fetch suggested payment matches for all unmatched transactions in a bank account.',
  })
  async fetchBatchSuggestedMatches(
    @Context() context,
    @Args('bank_account_id', {
      type: () => Number,
      description: 'Bank account ID to find matches for.',
    })
    bank_account_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for batch suggested matches for bank account: ${bank_account_id}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      const company_id = decoded?.companyId;

      if (!company_id) {
        return framedResponse('ERROR', 'Company context not available.');
      }

      return await this.transactionsService.fetchBatchSuggestedMatches(
        bank_account_id,
        company_id,
        timezone,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching batch suggested matches: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching batch suggested matches: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN, Role.STANDARD_USER)
  @Mutation(() => BatchMatchResponse, {
    name: 'batchMatchExactTransactions',
    description:
      'Match multiple transaction-payment pairs in a single batch operation.',
  })
  async batchMatchExactTransactions(
    @Context() context,
    @Args('transaction_ids', {
      type: () => [String],
      description: 'List of transaction IDs to match.',
    })
    transaction_ids: string[],
    @Args('sub_payment_ids', {
      type: () => [[Number]],
      description: 'List of sub-payment ID arrays, one per transaction.',
    })
    sub_payment_ids: number[][],
  ) {
    try {
      this.logger.log(
        `Request received for batch match of ${transaction_ids.length} pairs.`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      if (!decoded?.companyId) {
        return framedResponse(
          'ERROR',
          'Company context is required for batch matching.',
        );
      }

      if (transaction_ids.length !== sub_payment_ids.length) {
        return framedResponse(
          'ERROR',
          'transaction_ids and sub_payment_ids arrays must have the same length.',
        );
      }

      const matchPairs = transaction_ids.map((tid, idx) => ({
        transaction_id: tid,
        sub_payment_ids: sub_payment_ids[idx],
      }));

      const result =
        await this.transactionsService.batchMatchExactTransactions(
          matchPairs,
          decoded.userId,
          decoded.companyId,
        );

      const batchPaymentIds = (result?.data as Record<string, unknown>)?.payment_ids as number[] | undefined;
      if (batchPaymentIds && batchPaymentIds.length > 0) {
        for (const payment_id of batchPaymentIds) {
          const paymentDetails =
            await this.paymentsService.fetchPaymentDetails(payment_id);
          if (paymentDetails?.project_id) {
            await this.complianceService
              .fetchComplianceResultsOfAProject({
                project_id: paymentDetails.project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              })
              .catch(() => {});
            await this.complianceService
              .fetchComplianceResultsOfAProject({
                project_id: paymentDetails.project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              })
              .catch(() => {});
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Errored during batch match: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored during batch match: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN, Role.STANDARD_USER)
  @Mutation(() => QuickAdjustMatchResponse, {
    name: 'quickAdjustAndMatch',
    description:
      'Create an adjustment payment and match it together with the original payment to the transaction.',
  })
  async quickAdjustAndMatch(
    @Context() context,
    @Args('transaction_id', {
      type: () => String,
      description: 'Transaction ID to adjust and match.',
    })
    transaction_id: string,
    @Args('sub_payment_id', {
      type: () => Number,
      description: 'Sub-payment ID of the near-match payment.',
    })
    sub_payment_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for quick adjust and match: txn=${transaction_id}, sp=${sub_payment_id}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      if (!decoded?.companyId) {
        return framedResponse(
          'ERROR',
          'Company context is required for quick adjust and match.',
        );
      }

      const result = await this.transactionsService.quickAdjustAndMatch(
        transaction_id,
        sub_payment_id,
        decoded,
        decoded.userId,
      );

      const qaPaymentIds = (result?.data as Record<string, unknown>)?.payment_ids as number[] | undefined;
      if (qaPaymentIds && qaPaymentIds.length > 0) {
        for (const payment_id of qaPaymentIds) {
          const paymentDetails =
            await this.paymentsService.fetchPaymentDetails(payment_id);
          if (paymentDetails?.project_id) {
            await this.complianceService
              .fetchComplianceResultsOfAProject({
                project_id: paymentDetails.project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              })
              .catch(() => {});
            await this.complianceService
              .fetchComplianceResultsOfAProject({
                project_id: paymentDetails.project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              })
              .catch(() => {});
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Errored during quick adjust and match: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored during quick adjust and match: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => Boolean, {
    name: 'getSmartMatchPreference',
    description: 'Get the current user smart match toggle preference.',
  })
  async getSmartMatchPreference(@Context() context): Promise<boolean> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (!decoded?.companyId || !decoded?.userId) {
        return false;
      }
      return this.transactionsService.getSmartMatchPreference(
        decoded.companyId,
        decoded.userId,
      );
    } catch (error) {
      this.logger.error(`Error fetching smart match preference: ${error.message}`);
      return false;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SmartMatchPreferenceResponse, {
    name: 'setSmartMatchPreference',
    description: 'Set the user smart match toggle preference.',
  })
  async setSmartMatchPreference(
    @Context() context,
    @Args('enabled', {
      type: () => Boolean,
      description: 'Whether smart match is enabled.',
    })
    enabled: boolean,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (!decoded?.companyId || !decoded?.userId) {
        return framedResponse('ERROR', 'Company context is required.');
      }
      return this.transactionsService.setSmartMatchPreference(
        decoded.companyId,
        decoded.userId,
        enabled,
      );
    } catch (error) {
      this.logger.error(`Error setting smart match preference: ${error.message}`);
      return framedResponse('ERROR', `Error setting smart match preference: ${error.message}`);
    }
  }
}
