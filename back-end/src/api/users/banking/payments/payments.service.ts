import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, EntityManager, In, Not } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

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
import { parseCommaSeparatedInput } from 'src/libs/@parsers/parse-comma-separated-input';
import { getStatusForUpdateInDB } from 'src/libs/@json/get-payment-status';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import {
  FetchAllABAGeneratedFileHistoryResponse,
  FetchAllRetentionInPaymentListWithCount,
  FetchDetailsOfSubPayment,
} from './payments.response';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { StatusService } from '../ui-status.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { RetentionStatusFunctions } from './retentions/retention-status-functions';
import { PaymentClaimsService } from '../payment-claims/payment-claims.service';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { BeneficiaryType } from 'src/libs/@paytrade-types/paytrade-types';
import { RetentionProgressionFunctions } from './retentions/retention-progression-functions';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import * as fs from 'fs';

import {
  formatCurrency,
  formatCurrencyWithoutDollars,
} from 'src/libs/@currency-formattor/currency-formattor';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { FinancialInstitutionsDetails } from 'src/entities/financial-institution-deatils.entity';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CreateFileUploadInput } from '../../file-upload/dto/create-file-upload.input';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { CompliancesService } from '../../compliances/compliances.service';
import { NoticesService } from '../../notices/notices.service';
import { RetentionReversalFunctions } from './retentions/retention-reversal-functions';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PaymentsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(FinancialInstitutionsDetails)
    private financialInsRepo: Repository<FinancialInstitutionsDetails>,
    @InjectRepository(PaymentClaimInvoices)
    private paymentClaimInvoicesRepo: Repository<PaymentClaimInvoices>,
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(RetentionSummaryDetails)
    private retentionSummaryRepo: Repository<RetentionSummaryDetails>,
    @InjectRepository(TransactionDetails)
    private transactionsRepo: Repository<TransactionDetails>,
    @InjectRepository(ContractDetails)
    private contractDetailsRepo: Repository<ContractDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSupplierDetailsRepo: Repository<ClientSuppliersDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(GenerateABAFileHistory)
    private generateABAFileHistory: Repository<GenerateABAFileHistory>,
    private readonly statusService: StatusService,
    private readonly fileUploadService: FileUploadService,
    private retentionStatusFunctions: RetentionStatusFunctions,
    private readonly paymentClaimsService: PaymentClaimsService,
    private entityManager: EntityManager,
    private retentionProgressionFns: RetentionProgressionFunctions,
    private activityLogService: ActivityLogService,
    private readonly complianceService: CompliancesService,
    private readonly noticeService: NoticesService,
    private retentionReversalFns: RetentionReversalFunctions,
    private retentionStatusFns: RetentionStatusFunctions,
    private emailQueueProducer: EmailQueueProducer,
    private objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('PAYMENTS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getPaymentClaimByClaimId(payment_claim_id: number) {
    return await this.paymentClaimsRepo.findOne({
      where: { payment_claim_id },
    });
  }

  async addPayment(decoded, data: AddPaymentInput, userId?: number) {
    try {
      const {
        payment_claim_id,
        payment_type,
        cash_retention,
        client_supplier_id,
        company_id,
        payment_from_account,
        payment_to_account,
        retention_account,
        associated_payment_id,
        associated_overpayment_id,
        retention_id,
        payless_amount,
        created_by,
        payment_amount,
        input_date,
        is_retention_confirmed,
        is_paid_confirmed,
        is_received_confirmed,
      } = data;

      let payment_id;
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Handling request for adding a payment with data: ${JSON.stringify(data)}`,
          );

          let showJournalMessage = false;

          const associated_payment = associated_payment_id
            ? await transactionalEntityManager.findOne(PaymentDetails, {
              where: { payment_id: associated_payment_id },
              lock: { mode: 'pessimistic_write' },
            })
            : null;

          const associated_overpayment = associated_overpayment_id
            ? await transactionalEntityManager.findOne(PaymentDetails, {
              where: { payment_id: associated_overpayment_id },
              lock: { mode: 'pessimistic_write' },
            })
            : null;

          const claimDetails = payment_claim_id
            ? await transactionalEntityManager.findOne(PaymentClaims, {
              where: { payment_claim_id: payment_claim_id },
              relations: ['clientSupplierDetails'],
              // lock: { mode: 'pessimistic_write' },
            })
            : null;
          // console.log'claimDetails:', claimDetails);

          data.created_by = userId;
          data.created_group = 'USER';
          data.created_on = moment.tz('UTC');
          data.input_date = input_date
            ? input_date
            : moment.tz(decoded?.timezone || 'UTC').toDate();
          if (payment_type === '3rd Party' || payment_type === 'Pay - Zero') {
            data.payment_date = moment.tz(decoded?.timezone || 'UTC').toDate();
          }
          const createPaymentDetails = await transactionalEntityManager.save(
            this.paymentsRepo.create(data),
          );

          await transactionalEntityManager
            .createQueryBuilder()
            .update(PaymentDetails)
            .set({
              payment_id: 10000000000 + Number(createPaymentDetails.payment_id),
              associatedPayment: associated_payment,
              associatedOverPayment: associated_overpayment,
            })
            .where('id = :id', {
              id: createPaymentDetails.id,
            })
            .execute();

          const createdPaymentDetails =
            await transactionalEntityManager.findOne(PaymentDetails, {
              where: { id: createPaymentDetails.id },
              relations: [
                'projectDetails',
                'clientSupplierDetails',
                'paymentFromAccount',
                'paymentToAccount',
                'retentionAccount',
              ],
            });

          payment_id = createdPaymentDetails.payment_id;

          this.logger.log('createdPaymentDetails: ' + payment_id);

          this.logger.log(`Payment added successfully with id: ${payment_id}`);

          let requestData: any = {
            user_id: userId,
            payment_id: payment_id,
            payment_type: data.payment_type,
            current_payment_status: data?.current_status
              ? data?.current_status
              : 'Unconfirmed - Unmatched',
            previous_payment_status: null,
            list_status: '',
          };

          if (data?.payment_claim_id && claimDetails) {
            requestData = {
              ...requestData,
              payment_claim_id: data?.payment_claim_id,
              previous_claim_status: claimDetails?.status,
              current_claim_status: claimDetails?.status,
              cash_retention_type: claimDetails?.cash_retention_type,
              claim_type: claimDetails?.claim_type,
            };
          }

          let subPaymentData = [];
          let paymentData = {
            payment_id: payment_id,
            created_by: userId,
            created_group: 'USER',
            created_on: moment.tz('UTC'),
          };
          if (
            data.payment_type !== 'Pay - Zero' &&
            data.payment_type !== '3rd Party'
          ) {
            if (
              claimDetails?.claim_type === 'Billable' ||
              claimDetails?.claim_type === 'Receivable'
            ) {
              requestData = {
                ...requestData,
                cash_retention: data?.cash_retention,
              };
            }

            if (
              (claimDetails?.claim_type === 'Billable' &&
                ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
                  data.payment_type,
                )) ||
              [
                'Interest Withdrawal',
                'Bank Charge Applied',
                'Withdrawal',
                'Overpayment refund to client',
                'Overpayment to supplier',
                'Underpayment to supplier',
              ].includes(data.payment_type)
            ) {
              subPaymentData.push({
                ...paymentData,
                sub_payment_type: 'Payment',
                amount:
                  data.payment_type === 'Underpayment to supplier'
                    ? parseFloat(`${data.payment_amount}`)
                    : parseFloat(`-${data.payment_amount}`),
                is_paid_confirmed: data.is_paid_confirmed,
                status: 'Unmatched',
              });

              requestData = {
                ...requestData,
                is_paid_confirmed: data?.is_paid_confirmed,
                payment_matched: false,
              };

              if (cash_retention) {
                const accountDetails =
                  payment_from_account == retention_account
                    ? await transactionalEntityManager.findOne(BankAccounts, {
                      where: { bank_account_id: payment_from_account },
                    })
                    : null;

                const subPaymentStatus =
                  accountDetails &&
                    accountDetails.account_type === 'Cash Account'
                    ? 'Auto matched'
                    : 'Unmatched';

                subPaymentData.push({
                  ...paymentData,
                  sub_payment_type: 'Retention Out',
                  amount: parseFloat(`-${data.retention_amount}`),
                  is_retention_confirmed: data.is_retention_confirmed,
                  status: subPaymentStatus,
                });

                subPaymentData.push({
                  ...paymentData,
                  sub_payment_type: 'Retention In',
                  amount: parseFloat(`${data.retention_amount}`),
                  status: subPaymentStatus,
                });

                requestData = {
                  ...requestData,
                  is_retention_confirmed: data?.is_retention_confirmed,
                  retention_out_matched:
                    subPaymentStatus === 'Auto matched' ? true : false,
                  retention_in_matched:
                    subPaymentStatus === 'Auto matched' ? true : false,
                };
              }
            } else {
              subPaymentData.push({
                ...paymentData,
                sub_payment_type: 'Payment',
                amount:
                  data.payment_type === 'Underpayment from client'
                    ? parseFloat(`-${data.payment_amount}`)
                    : parseFloat(`${data.payment_amount}`),
                is_received_confirmed: data.is_received_confirmed,
                status: 'Unmatched',
              });

              requestData = {
                ...requestData,
                is_received_confirmed: data?.is_received_confirmed,
                payment_matched: false,
              };

              if (cash_retention) {
                subPaymentData.push({
                  ...paymentData,
                  sub_payment_type: 'Retention',
                  amount: parseFloat(`${data.retention_amount}`),
                  status: 'Auto matched',
                });
              }
            }

            const createdSubPaymentDetails =
              await transactionalEntityManager.save(
                this.subPaymentsRepo.create(subPaymentData),
              );

            if (
              createdSubPaymentDetails &&
              createdSubPaymentDetails.length > 0
            ) {
              for (const payment of createdSubPaymentDetails) {
                payment.sub_payment_id =
                  10000000000 + Number(payment.sub_payment_id);
                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(SubPayments)
                  .set({
                    sub_payment_id: payment.sub_payment_id,
                  })
                  .where('id = :id', {
                    id: payment.id,
                  })
                  .execute();
              }
            }
          }

          await this.updateClaimAndPaymentStatuses(
            transactionalEntityManager,
            requestData,
          );

          if (
            data?.payment_claim_id &&
            claimDetails &&
            claimDetails?.claim_type === 'Billable' &&
            payment_from_account &&
            [
              'Pay Less - Full',
              'Pay Less - Part',
              'Pay - Zero',
              '3rd Party',
            ]?.includes(data.payment_type)
          ) {
            const account_details = await transactionalEntityManager.findOne(
              BankAccounts,
              {
                where: { bank_account_id: payment_from_account },
              },
            );

            if (
              claimDetails.cash_retention_type === 'Claim' &&
              account_details &&
              (account_details.account_type === 'Project Trust Account' ||
                account_details.account_type === 'Cash Account')
            ) {
              if (
                ['Pay Less - Full', 'Pay Less - Part']?.includes(
                  data.payment_type,
                )
              ) {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    14,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              } else if (data.payment_type === '3rd Party') {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    16,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              } else {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    15,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              }
            } else if (
              claimDetails.cash_retention_type === 'Retention claim' &&
              account_details &&
              (account_details.account_type === 'Retention Trust Account' ||
                account_details.account_type === 'Cash Account')
            ) {
              if (
                ['Pay Less - Full', 'Pay Less - Part']?.includes(
                  data.payment_type,
                )
              ) {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    45,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              } else if (data.payment_type === '3rd Party') {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    18,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              } else {
                showJournalMessage =
                  await this.paymentClaimsService.createJournalEntries(
                    transactionalEntityManager,
                    46,
                    claimDetails,
                    payment_from_account,
                    payment_claim_id,
                    createdPaymentDetails,
                    userId,
                  );
              }
            }
          }

          const journalPaymentDetails =
            await transactionalEntityManager.findOne(PaymentDetails, {
              where: { id: createPaymentDetails.id },
            });
          if (journalPaymentDetails) {
            // new journal changes
            const subPayments = await transactionalEntityManager
              .createQueryBuilder(SubPayments, 'subpayment')
              .select([
                'subpayment.id AS id',
                'subpayment.payment_id AS payment_id',
                'subpayment.amount AS amount',
                'subpayment.status AS status',
                'subpayment.sub_payment_id AS sub_payment_id',
                'subpayment.sub_payment_type AS sub_payment_type',
                'subpayment.is_paid_confirmed AS is_paid_confirmed',
                'subpayment.is_received_confirmed AS is_received_confirmed',
                'subpayment.is_retention_confirmed AS is_retention_confirmed',
                'payment.cash_retention AS cash_retention',
                'claim.claim_type AS claim_type',
              ])
              .leftJoin('subpayment.paymentDetails', 'payment')
              .leftJoin('payment.paymentClaims', 'claim')
              .where('subpayment.payment_id =:payment_id', { payment_id })
              .getRawMany();
            // this.logger.log(`payments: ${JSON.stringify(payments)}`);
            let payments = [];
            if (subPayments) {
              for (const subPayment of subPayments) {
                if (
                  subPayment?.claim_type === 'Billable' &&
                  ((subPayment?.sub_payment_type === 'Payment' &&
                    subPayment?.is_paid_confirmed) ||
                    (subPayment?.sub_payment_type === 'Retention Out' &&
                      subPayment?.is_retention_confirmed &&
                      subPayment?.cash_retention))
                ) {
                  payments.push(subPayment);
                  if (
                    subPayment?.sub_payment_type === 'Retention Out' &&
                    subPayment?.is_retention_confirmed &&
                    subPayment?.cash_retention
                  ) {
                    const matchingRetentionIn = subPayments?.find(
                      (p) =>
                        p.sub_payment_type === 'Retention In' &&
                        p.claim_type === subPayment.claim_type,
                    );

                    if (matchingRetentionIn) {
                      payments.push(matchingRetentionIn);
                    }
                  }
                } else if (
                  subPayment?.claim_type === 'Receivable' &&
                  subPayment?.sub_payment_type === 'Payment' &&
                  subPayment?.is_received_confirmed
                ) {
                  payments.push(subPayment);
                }
              }
            }

            if (payments && payments?.length > 0) {
              for (const payment of payments) {
                const paymentDetails = await transactionalEntityManager.findOne(
                  PaymentDetails,
                  {
                    where: { payment_id: payment.payment_id },
                    relations: ['subPayments'],
                  },
                );

                const claimDetails = paymentDetails.payment_claim_id
                  ? await transactionalEntityManager.findOne(PaymentClaims, {
                    where: {
                      payment_claim_id: paymentDetails.payment_claim_id,
                    },
                    lock: { mode: 'pessimistic_write' },
                  })
                  : null;

                showJournalMessage =
                  await this.paymentClaimsService.createJournals(
                    transactionalEntityManager,
                    claimDetails,
                    paymentDetails,
                    payment?.sub_payment_type,
                    null,
                    null,
                    false,
                    userId,
                  );
              }
            }
          }

          //Update activity log after adding a payment
          //Generating payment link to view created payment.
          const paymentLink = [
            'Full',
            'Part',
            'Pay Less - Full',
            'Pay Less - Part',
            'Pay - Zero',
            '3rd Party',
          ].includes(data.payment_type)
            ? `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[9]}` +
            `${claimDetails?.payment_claim_id != null || claimDetails?.payment_claim_id != undefined ? claimDetails?.payment_claim_id : ''}` +
            `&mode=view&payment=` +
            `${payment_id}` +
            `&from=log`
            : `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[13]}` +
            `${payment_id}` +
            `?from=log`;
          // console.log'paymentLink', paymentLink);

          let eventTemplateId, dynamicValues;
          const payable_payment_types = [
            'Full',
            'Part',
            'Pay Less - Full',
            'Pay Less - Part',
            'Pay - Zero',
            '3rd Party',
          ];
          if (payable_payment_types.includes(data.payment_type)) {
            eventTemplateId =
              claimDetails.claim_type === 'Receivable' ? 77 : 86;
            dynamicValues = {
              paymentLink,
              paymentType: payment_type,
              paymentId: payment_id,
              paymentAmount: formatCurrency(payment_amount),
              clientSupplierName:
                claimDetails.clientSupplierDetails?.client_supplier_name,
            };
          } else {
            switch (data.payment_type) {
              case 'Bank Charge Applied':
                {
                  eventTemplateId = 96;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    accountName:
                      createdPaymentDetails.paymentFromAccount.account_name,
                  };
                }
                break;
              case 'Bank Charge Top Up':
                {
                  eventTemplateId = 100;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    accountName:
                      createdPaymentDetails.paymentToAccount.account_name,
                  };
                }
                break;
              case 'Interest Received':
                {
                  eventTemplateId = 92;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    accountName:
                      createdPaymentDetails.paymentToAccount.account_name,
                  };
                }
                break;
              case 'Interest Withdrawal':
                {
                  eventTemplateId = 98;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    fromAccountName:
                      createdPaymentDetails.paymentFromAccount.account_name,
                    toAccountName:
                      createdPaymentDetails.paymentToAccount.account_name,
                  };
                }
                break;
              case 'Top Up':
                {
                  eventTemplateId = 94;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    accountName:
                      createdPaymentDetails.paymentToAccount.account_name,
                  };
                }
                break;
              case 'Top Up Retention':
                {
                  eventTemplateId = 104;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    projectName:
                      createdPaymentDetails.projectDetails.project_name,
                  };
                }
                break;
              case 'Withdrawal':
                {
                  eventTemplateId = 102;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    fromAccountName:
                      createdPaymentDetails.paymentFromAccount.account_name,
                    toAccountName:
                      createdPaymentDetails.paymentToAccount.account_name,
                  };
                }
                break;
              case 'Overpayment refund from supplier':
                {
                  eventTemplateId = 106;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        .client_supplier_name,
                  };
                }
                break;
              case 'Overpayment refund to client':
                {
                  eventTemplateId = 108;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        .client_supplier_name,
                  };
                }
                break;
              case 'Overpayment from client':
                {
                  eventTemplateId = 88;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        ?.client_supplier_name,
                  };
                }
                break;
              case 'Overpayment to supplier':
                {
                  eventTemplateId = 110;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        ?.client_supplier_name,
                  };
                }
                break;
              case 'Underpayment from client':
                {
                  eventTemplateId = 112;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        ?.client_supplier_name,
                  };
                }
                break;
              case 'Underpayment to supplier':
                {
                  eventTemplateId = 90;
                  dynamicValues = {
                    paymentLink,
                    paymentType: payment_type,
                    paymentAmount: formatCurrency(payment_amount),
                    clientSupplierName:
                      createdPaymentDetails.clientSupplierDetails
                        ?.client_supplier_name,
                  };
                }
                break;
            }
          }

          //Create activity log as soon a payment claim is created.
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: eventTemplateId,
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
            company_id,
            dynamic_values: dynamicValues,
            is_admin: false,
            created_by: decoded?.userId,
          };
          //// console.log'createActivityLogInput', createActivityLogInput);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          // console.log'----->');
          // Update the status of retention list entry.
          if (claimDetails?.cash_retention_type == 'Retention claim') {
            //Update the status of retention list to Payment generated.
            await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionDetails)
              .set({
                retention_status: 'Payment generated',
              })
              .where('retention_id = :retention_id', {
                retention_id: retention_id,
              })
              .execute();
            // console.log'----------1');

            if (payment_type == 'Pay - Zero') {
              //Update the status of retention list to Claim completed if the retention payment type is pay zero.
              await transactionalEntityManager
                .createQueryBuilder()
                .update(RetentionDetails)
                .set({
                  retention_status: 'Claim completed',
                })
                .where('retention_id = :retention_id', {
                  retention_id: retention_id,
                })
                .execute();
              // console.log'----------2');
            }

            //Update retention summary for Payless retention payments.
            const paymentDetails = await transactionalEntityManager
              .createQueryBuilder(PaymentDetails, 'p')
              .select([
                'p.payment_id AS payment_id',
                'p.payment_claim_id AS payment_claim_id',
                'pc.claim_type AS claim_type',
                'pc.cash_retention_type AS cash_retention_type',
                'pc.retention_id AS retention_id',
                'pc.claim_amount AS claim_amount',
                'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
                'pc.retention_id AS retention_id',
              ])
              .leftJoin(
                PaymentClaims,
                'pc',
                'pc.payment_claim_id = p.payment_claim_id',
              )
              .where('p.payment_id = :payment_id', { payment_id })
              .getRawOne();
            // console.log'paymentDetailsToUpdateSelfBeneficiary', paymentDetails);

            if (
              paymentDetails.cash_retention_type == 'Retention claim' &&
              paymentDetails.claim_type == 'Receivable' &&
              (payment_type == 'Pay Less - Full' ||
                payment_type == 'Pay Less - Part')
            ) {
              //Calculation of payment amount for Payless payments.
              const payment_amount =
                Number(claimDetails.claim_amount) - Number(payless_amount);
              // console.log'payment_amount', payment_amount);

              //Fetching event_id.
              let event_id = await this.retentionProgressionFns.eventIdHandler({
                claim_type: paymentDetails.claim_type,
                cash_retention_type: paymentDetails.cash_retention_type,
                payment_type,
              });

              const client_supplier_details =
                await this.clientSupplierDetailsRepo.findOne({
                  where: {
                    client_supplier_id,
                  },
                  select: ['client_supplier_name'],
                });
              // console.log'client_supplier_details', client_supplier_details);

              const company_details = await this.companyDetailsRepo.findOne({
                where: { company_id },
                select: ['company_name'],
              });
              // console.log'company_details', company_details);

              if (payment_type == 'Pay Less - Full') {
                // console.log'--------->');
                //Pay Less - Full payment
                const createdPaylessReducedRetainedAmountEntryInSummary =
                  await transactionalEntityManager.save(
                    this.retentionSummaryRepo.create({
                      sub_payment_id:
                        paymentDetails.associated_retention_sub_payment_id,
                      event_id: event_id,
                      amount: -payment_amount,
                      status: 'Retained',
                      beneficiary_type: 'Current supplier',
                      beneficiary_name: company_details.company_name,
                      retention_id: paymentDetails.retention_id,
                      retained_account_name:
                        client_supplier_details.client_supplier_name,
                      client_supplier_id,
                      created_by,
                      created_on: moment.tz('UTC'),
                    }),
                  );
                // console.log(
                //   'createdPaylessRetainedAmountEntryInSummary',
                //   createdPaylessReducedRetainedAmountEntryInSummary,
                // );

                //Create another payment amount entry in retention summary while self beneficiary is made against a retained amount.
                const createdPaylessAdditionalPaymentAmountEntryInSummary =
                  await transactionalEntityManager.save(
                    this.retentionSummaryRepo.create({
                      sub_payment_id:
                        paymentDetails.associated_retention_sub_payment_id,
                      payment_amount: payment_amount,
                      event_id: event_id,
                      status: 'Retained',
                      beneficiary_type:
                        paymentDetails.claim_type == 'Billable'
                          ? 'Self'
                          : 'Current supplier',
                      beneficiary_name:
                        client_supplier_details.client_supplier_name,
                      client_supplier_id,
                      retention_id: paymentDetails.retention_id,
                      retained_account_name:
                        client_supplier_details.client_supplier_name,
                      company_id,
                      created_by,
                      created_on: moment.tz('UTC'),
                    }),
                  );
                // console.log(
                //   'createdPaylessAdditionalPaymentAmountEntryInSummary',
                //   createdPaylessAdditionalPaymentAmountEntryInSummary,
                // );
              } else if (payment_type == 'Pay Less - Part') {
                //Pay Less - Part payment
                const checkPresenceOfSelfBeneficiaryEntryInSummary =
                  await transactionalEntityManager
                    .createQueryBuilder(RetentionSummaryDetails, 'rs')
                    .select(['rs.retention_id AS retention_id'])
                    .where('rs.retention_id = :retention_id', {
                      retention_id: paymentDetails.retention_id,
                    })
                    .andWhere('rs.beneficiary_type = :beneficiary_type', {
                      beneficiary_type: 'Self',
                    })
                    .andWhere(`rs.status != 'Deleted'`)
                    .orderBy('rs.created_on', 'DESC')
                    .limit(1)
                    .getRawOne();
                // console.log(
                //   'checkPresenceOfSelfBeneficiaryEntryInSummary',
                //   checkPresenceOfSelfBeneficiaryEntryInSummary,
                // );

                if (!checkPresenceOfSelfBeneficiaryEntryInSummary) {
                  // console.log'event_id', event_id);

                  const createdPaylessReducedRetainedAmountEntryInRetentionSummary =
                    await transactionalEntityManager.save(
                      this.retentionSummaryRepo.create({
                        sub_payment_id:
                          paymentDetails.associated_retention_sub_payment_id,
                        amount: -payment_amount,
                        status: 'Retained',
                        beneficiary_type: 'Current supplier',
                        beneficiary_name: company_details.company_name,
                        retention_id: paymentDetails.retention_id,
                        retained_account_name:
                          client_supplier_details.client_supplier_name,
                        client_supplier_id,
                        created_by,
                        created_on: moment.tz('UTC'),
                        event_id: event_id,
                      }),
                    );
                  // console.log(
                  //   'createdPaylessReducedRetainedAmountEntryInRetentionSummary',
                  //   createdPaylessReducedRetainedAmountEntryInRetentionSummary,
                  // );

                  //Create another payment amount entry in retentnion summary while self beneficiary is made against a retained amount.
                  const createdPaylessAdditionalPaymentAmountEntryInRetentionSummary =
                    await transactionalEntityManager.save(
                      this.retentionSummaryRepo.create({
                        sub_payment_id:
                          paymentDetails.associated_retention_sub_payment_id,
                        payment_amount: payment_amount,
                        status: 'Retained',
                        beneficiary_type:
                          paymentDetails.claim_type == 'Billable'
                            ? 'Self'
                            : 'Current supplier',
                        beneficiary_name:
                          client_supplier_details.client_supplier_name,
                        client_supplier_id,
                        retention_id: paymentDetails.retention_id,
                        retained_account_name:
                          client_supplier_details.client_supplier_name,
                        company_id,
                        created_by,
                        created_on: moment.tz('UTC'),
                        event_id: event_id,
                      }),
                    );
                  // console.log(
                  //   'createdPaylessAdditionalPaymentAmountEntryInSummary',
                  //   createdPaylessAdditionalPaymentAmountEntryInRetentionSummary,
                  // );
                }
              }
            }
          } else if (payment_type == 'Withdrawal' && retention_id) {
            //Update the status of retention list to Payment generated.
            await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionDetails)
              .set({
                retention_status: 'Payment generated',
              })
              .where('retention_id = :retention_id', {
                retention_id: retention_id,
              })
              .execute();
            // console.log'----------1');
          } else if (
            payment_type == '3rd Party' ||
            payment_type == 'Pay - Zero'
          ) {
            const paymentDetails = await transactionalEntityManager
              .createQueryBuilder(PaymentDetails, 'p')
              .select([
                'p.payment_id AS payment_id',
                'p.payment_claim_id AS payment_claim_id',
                'pc.claim_type AS claim_type',
                'pc.cash_retention_type AS cash_retention_type',
                'pc.retention_id AS retention_id',
                'pc.claim_amount AS claim_amount',
              ])
              .leftJoin(
                PaymentClaims,
                'pc',
                'pc.payment_claim_id = p.payment_claim_id',
              )
              .where('p.payment_id = :payment_id', { payment_id })
              .getRawOne();

            if (
              paymentDetails &&
              paymentDetails.cash_retention_type == 'Retention claim'
            ) {
              const retention_in_payment = await transactionalEntityManager
                .createQueryBuilder(RetentionDetails, 'rd')
                .select([
                  'rd.beneficiary_type AS beneficiary_type',
                  'rd.retention_id AS retention_id',
                  'rd.retained_amount AS retained_amount',
                ])
                .where('rd.retention_id = :retention_id', {
                  retention_id: paymentDetails.retention_id,
                })
                .andWhere(`rd.retention_status != 'Deleted'`)
                .getRawOne();

              //Check whether the retained amount is equal to the claim amount. If yes, update the status of the retention list to completed.
              //-----Need to implement the creation of retention list after a discussion because sub_payment_id is not present for Pay - Zero payment.----
              if (
                Number(retention_in_payment.retained_amount) ==
                Number(paymentDetails.claim_amount)
              ) {
                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(RetentionDetails)
                  .set({
                    retention_status: 'Completed',
                  })
                  .where('retention_id = :retention_id', {
                    retention_id: paymentDetails.retention_id,
                  })
                  .execute();
              } else {
                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(RetentionDetails)
                  .set({
                    retention_status: 'Claim completed',
                  })
                  .where('retention_id = :retention_id', {
                    retention_id: paymentDetails.retention_id,
                  })
                  .execute();
              }
            }
          }

          // create retentions
          const subPaymentDetails = await transactionalEntityManager
            .createQueryBuilder(SubPayments, 'subpayment')
            .select([
              'subpayment.id AS id',
              'subpayment.payment_id AS payment_id',
              'subpayment.amount AS amount',
              'subpayment.status AS status',
              'subpayment.sub_payment_id AS sub_payment_id',
              'subpayment.sub_payment_type AS sub_payment_type',
              'subpayment.is_paid_confirmed AS is_paid_confirmed',
              'subpayment.is_received_confirmed AS is_received_confirmed',
              'subpayment.is_retention_confirmed AS is_retention_confirmed',
              'claim.cash_retention_type AS cash_retention_type',
              'claim.claim_amount AS claim_amount',
              'claim.claim_type AS claim_type',
              'claim.retention_id AS retention_id',
              'claim.status AS claim_status',
              'claim.payment_claim_id AS payment_claim_id',
              'payment.cash_retention AS cash_retention',
              'payment.payment_type AS payment_type',
              'payment.total_amount AS total_amount',
            ])
            .leftJoin('subpayment.paymentDetails', 'payment')
            .leftJoin('payment.paymentClaims', 'claim')
            .where('subpayment.payment_id =:payment_id', { payment_id })
            .getRawMany();

          this.logger.log('subPaymentDetails: ' + JSON.stringify(subPaymentDetails));
          let sub_payment_ids = [];
          for (const element of subPaymentDetails) {
            if (element.sub_payment_type == 'Retention In') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Retention Out' &&
                  p.is_retention_confirmed,
              );

              if (isConfirmed) {
                if (element.status === 'Auto matched') {
                  const isPayment = subPaymentDetails?.find(
                    (p) => p.sub_payment_type === 'Payment',
                  );
                  sub_payment_ids.push(isPayment.sub_payment_id);
                } else {
                  sub_payment_ids.push(element.sub_payment_id);
                }
              }
            } else if (element.sub_payment_type == 'Retention') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Payment' && p.is_received_confirmed,
              );

              if (isConfirmed) {
                sub_payment_ids.push(isConfirmed.sub_payment_id);
              }
            } else if (
              element.cash_retention_type == 'Retention claim' &&
              element.sub_payment_type == 'Payment' &&
              ((element.claim_type == 'Billable' &&
                element.is_paid_confirmed) ||
                (element.claim_type == 'Receivable' &&
                  element.is_received_confirmed))
            ) {
              sub_payment_ids.push(element.sub_payment_id);
            }
          }

          let noticeResult = null;

          if (
            data.is_paid_confirmed === true ||
            data.is_received_confirmed === true ||
            data.payment_type === '3rd Party' ||
            data.payment_type === 'Pay - Zero'
          ) {

            noticeResult = await this.noticeService.handleTriggerPaymentNotices(
              decoded,
              { payment_ids: [payment_id], view_preview: true },
              transactionalEntityManager,
            );

            if (noticeResult?.status === 'ERROR') {
              this.logger.error('Error triggering payment notices');
              throw new Error('Payment Notice generation failed');
            }
          }

          this.logger.log('sub_payment_ids: ' + JSON.stringify(sub_payment_ids));

          if (sub_payment_ids && sub_payment_ids?.length > 0) {
            await this.createOrDeleteRetentionEntries(
              transactionalEntityManager,
              sub_payment_ids,
              false,
            );
          }

          return framedResponse(
            'SUCCESS',
            showJournalMessage
              ? 'Trust journal updated'
              : `${payment_type} - payment added successfully.`,
            {
              payment_id,
              notices: noticeResult?.data,
            },
          );
        },
      );

      if (!response) {
        this.logger.log(`Payment addition failed`);
        throw `Unable to add payment details`;
      }

      if (response) {
        if (response.data.notices?.mails_to_sent.length) {
          for (let i = 0; i < response.data.notices?.mails_to_sent.length; i++) {
            const mailDetails = response.data.notices?.mails_to_sent[i];
            const updatePayload = response.data.notices?.update_notice_inputs[i];

            // 1. SEND THE MAIL
            await this.emailQueueProducer.emailQueueProducer({
              ...mailDetails,
              mail_type: EmailTypeEnum.notice,
            });

            // 2. UPDATE THE NOTICE
            await this.noticeService.handleUpdateNotice(decoded, updatePayload);
          }
        }
        if (data.project_id) {
          const compliance_pta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: data.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            });

          const compliance_rta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: data.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            });
        }
      }

      const responseWithNotice = {
        ...response,
        data: {
          ...response?.data,
          // notices: noticeResult?.data,
        },
      };

      return responseWithNotice;
    } catch (error) {
      this.logger.error(
        `Errored while adding a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async changeStatusOfAPayment(
    decoded,
    data: ChangeStatusOfAPaymentInput,
    userId?: number,
  ) {
    try {
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Handling request for changing the status of a payment with data: ${JSON.stringify(data)}`,
          );

          const { payment_id, status, input_date } = data;

          let showJournalMessage = false;

          const paymentDetails = await transactionalEntityManager.findOne(
            PaymentDetails,
            {
              where: { payment_id: payment_id },
              relations: [
                'paymentClaims',
                'projectDetails',
                'clientSupplierDetails',
                'paymentFromAccount',
                'paymentToAccount',
                'retentionAccount',
              ],
              // lock: { mode: 'pessimistic_write' },
            },
          );
          // console.log'paymentDetails: ', paymentDetails);
          if (!paymentDetails)
            throw `Invalid input. Payment not found. Please provide a valid payment id.`;

          const userMode = userId
            ? (await this.userDetails.findOne({ where: { user_id: userId } }))
              ?.user_mode
            : null;

          if (
            userMode &&
            userMode != 'Normal' &&
            [
              'Pay Less - Full',
              'Pay Less - Part',
              'Pay - Zero',
              '3rd Party',
            ].includes(paymentDetails.payment_type) &&
            !input_date
          ) {
            throw `Only for onboarding mode for the related transactions requiring the input date. Please input the required input date which will be input into your journal records if different from today.`;
          }
          this.logger.log('current_status: ' + paymentDetails.current_status);
          if (
            ![
              'No Match Required',
              'Unconfirmed - Unmatched',
              // 'Paid - Unmatched',
              // 'Received - Unmatched',
              'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
              'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
            ].includes(paymentDetails.current_status)
          ) {
            throw `The confirmed payment cannot be deleted.`;
          }
          let allowDelete = true;
          if (
            [
              'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
              'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
            ].includes(paymentDetails.current_status)
          ) {
            if (
              paymentDetails &&
              paymentDetails?.paymentClaims &&
              paymentDetails?.paymentClaims?.claim_type == 'Billable' &&
              paymentDetails?.paymentClaims?.cash_retention_type == 'Claim' &&
              paymentDetails?.cash_retention &&
              paymentDetails?.payment_id
            ) {
              const retention_payment_details = await this.subPaymentsRepo
                .createQueryBuilder('sp')
                .select([
                  'sp.sub_payment_type AS sub_payment_type',
                  'sp.sub_payment_id AS sub_payment_id',
                  'sp.status AS status',
                  'sp.amount AS retained_amount',
                  'sp.payment_id AS payment_id',
                ])
                .where(`sp.payment_id = :payment_id`, {
                  payment_id: payment_id,
                })
                .andWhere(
                  `sp.sub_payment_type IN ('Retention Out', 'Retention In') AND sp.status = 'Auto matched'`,
                )
                .getRawMany();
              // console.log(
              //   'retention_payment_details::::action buttons:::',
              //   retention_payment_details,
              // );
              if (
                retention_payment_details &&
                retention_payment_details.length > 0 &&
                retention_payment_details[0] !== null
              ) {
                allowDelete = true;
              } else {
                allowDelete = false;
              }
            } else {
              allowDelete = false;
            }
          }
          this.logger.log('allowDelete: ' + allowDelete);

          if (allowDelete) {
            await transactionalEntityManager
              .createQueryBuilder()
              .update(PaymentDetails)
              .set({
                previous_status: paymentDetails.current_status,
                current_status: status,
                list_status: 'Void',
                input_date: input_date ? input_date : paymentDetails.input_date,
                updated_by: userId,
                updated_on: moment.tz('UTC'),
                updated_group: userId ? 'USER' : 'SYSTEM',
              })
              .where('payment_id = :payment_id', { payment_id })
              .execute();

            const updatePaymentButtons =
              await this.statusService.getUiStatusAndActionButtonsForPaymentsTransaction(
                transactionalEntityManager,
                {
                  payment_id: payment_id,
                },
              );
            // console.log'updatePaymentButtons: ', updatePaymentButtons);

            if (status === 'Deleted') {
              const notices = await transactionalEntityManager.find(
                NoticeDetails,
                {
                  where: {
                    payment_id: paymentDetails.payment_id,
                    notice_type: In([
                      'Supplier Retention Payment Schedule Notice',
                      'Supplier Retention Payment Remittance Notice',
                      'QBCC TA4 Part Payment Notice',
                      'Supplier Payment with Retention Withheld Notice',
                      'Supplier Payment with Retention Schedule Notice',
                      'Supplier Payment Remittance Advice Notice',
                      'Supplier Payment Schedule Notice',
                    ]),
                  },
                  lock: { mode: 'pessimistic_write' },
                },
              );

              if (notices && notices.length > 0) {
                notices.forEach((notice) => {
                  notice.status =
                    notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';
                  notice.updated_by = userId;
                  notice.updated_on = moment().tz('UTC');
                  notice.updated_group = userId ? 'USER' : 'SYSTEM';
                });
                await transactionalEntityManager.save(notices);
              }
              if (
                paymentDetails.payment_claim_id &&
                ![
                  'Overpayment from client',
                  'Underpayment from client',
                  'Overpayment to supplier',
                  'Underpayment to supplier',
                  'Overpayment refund from supplier',
                  'Overpayment refund to client',
                ].includes(paymentDetails.payment_type)
              ) {
                const queryBuilder = await transactionalEntityManager
                  .createQueryBuilder(PaymentClaims, 'pc')
                  .select([
                    'pc.payment_claim_id AS payment_claim_id',
                    'pc.company_id AS company_id',
                    'pc.claim_type AS claim_type',
                    'pc.cash_retention_type AS cash_retention_type',
                    'pc.due_date AS due_date',
                    'pc.claim_amount AS claim_amount',
                    'pc.status AS claim_status',
                  ]);

                queryBuilder.addSelect((subQuery) => {
                  return subQuery
                    .select(
                      `JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                      'payment_id', p.payment_id,
                      'payment_type', p.payment_type,
                      'cash_retention', p.cash_retention,
                      'payment_status', p.current_status,
                      'list_status', p.list_status,
                      'payless_amount', p.payless_amount,
                      'total_amount', p.total_amount
                    )
                  )`,
                      'payments',
                    )
                    .from(PaymentDetails, 'p')
                    .where('p.payment_claim_id = pc.payment_claim_id')
                    .andWhere(`p.current_status != 'Deleted'`)
                    .andWhere(
                      `p.payment_type NOT IN ('Overpayment from client',
                    'Underpayment from client','Overpayment to supplier',
                    'Underpayment to supplier')`,
                    )
                    .groupBy('p.payment_claim_id')
                    .orderBy('MAX(p.created_on)', 'DESC');
                }, 'payment_list');

                queryBuilder.where('pc.payment_claim_id =:payment_claim_id', {
                  payment_claim_id: paymentDetails.payment_claim_id,
                });

                const claimAndPaymentdetails = paymentDetails.payment_claim_id
                  ? await queryBuilder.getRawOne()
                  : null;
                //  console.log'claimAndPaymentdetails: ', claimAndPaymentdetails);
                const payment_list =
                  claimAndPaymentdetails && claimAndPaymentdetails?.payment_list
                    ? claimAndPaymentdetails?.payment_list
                    : null;
                let paidAmount = 0,
                  outstandingAmount = 0;
                if (payment_list !== null && payment_list[0] !== null) {
                  payment_list.forEach((element) => {
                    paidAmount += element.total_amount;
                  });
                  if (payment_list[0].payment_type === 'Part') {
                    outstandingAmount =
                      claimAndPaymentdetails.claim_amount - paidAmount;
                  } else if (
                    payment_list[0].payment_type === 'Pay Less - Part'
                  ) {
                    outstandingAmount =
                      payment_list[0].payless_amount - paidAmount;
                  } else {
                    outstandingAmount = 0;
                  }
                }

                let list_status = 'Add payment';
                if (payment_list) {
                  if (
                    outstandingAmount > 0 &&
                    payment_list &&
                    [
                      'Unconfirmed - Matched',
                      'Paid - Matched',
                      'Received - Matched',
                      'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                      'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
                      'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                      'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
                      'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
                      'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                      'Paid - Unmatched',
                      'Received - Unmatched',
                    ].includes(payment_list[0].payment_status)
                  ) {
                    list_status = 'Add payment';
                  } else {
                    list_status = payment_list[0]?.list_status;
                  }
                }

                const previous_claim_status =
                  claimAndPaymentdetails.claim_status;
                const current_claim_status =
                  payment_list !== null && payment_list[0] !== null
                    ? payment_list[0]?.payment_status
                    : 'Confirmed';

                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(PaymentClaims)
                  .set({
                    previous_status: previous_claim_status,
                    status: current_claim_status,
                    list_status: list_status,
                    updated_by: userId,
                    updated_on: moment.tz('UTC'),
                    updated_group: userId ? 'USER' : 'SYSTEM',
                  })
                  .where(`payment_claim_id = :payment_claim_id`, {
                    payment_claim_id: paymentDetails.payment_claim_id,
                  })
                  .execute();

                const updateClaimButtons =
                  await this.statusService.getUiStatusAndActionButtonsForClaimsTransaction(
                    transactionalEntityManager,
                    {
                      payment_claim_id: paymentDetails.payment_claim_id,
                    },
                  );
                // console.log'updateClaimButtons: ', updateClaimButtons);

                if (
                  paymentDetails.payment_claim_id &&
                  paymentDetails?.paymentClaims &&
                  paymentDetails?.paymentClaims?.claim_type === 'Billable' &&
                  paymentDetails?.payment_from_account &&
                  [
                    'Pay Less - Full',
                    'Pay Less - Part',
                    'Pay - Zero',
                    '3rd Party',
                  ]?.includes(paymentDetails.payment_type)
                ) {
                  const account_details =
                    await transactionalEntityManager.findOne(BankAccounts, {
                      where: {
                        bank_account_id: paymentDetails?.payment_from_account,
                      },
                    });
                  if (
                    paymentDetails?.paymentClaims.cash_retention_type ===
                    'Claim' &&
                    account_details &&
                    (account_details.account_type === 'Project Trust Account' ||
                      account_details.account_type === 'Cash Account')
                  ) {
                    if (paymentDetails.payment_type === '3rd Party') {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          35,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    } else if (paymentDetails.payment_type === 'Pay - Zero') {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          33,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    } else if (
                      paymentDetails.payment_type === 'Pay Less - Full' ||
                      (paymentDetails.payment_type === 'Pay Less - Part' &&
                        claimAndPaymentdetails &&
                        claimAndPaymentdetails?.payment_list &&
                        claimAndPaymentdetails?.payment_list === null)
                    ) {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          32,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    }
                  } else if (
                    paymentDetails?.paymentClaims.cash_retention_type ===
                    'Retention claim' &&
                    account_details &&
                    (account_details.account_type ===
                      'Retention Trust Account' ||
                      account_details.account_type === 'Cash Account')
                  ) {
                    if (paymentDetails.payment_type === '3rd Party') {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          37,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    } else if (paymentDetails.payment_type === 'Pay - Zero') {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          34,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    } else if (
                      paymentDetails.payment_type === 'Pay Less - Full' ||
                      (paymentDetails.payment_type === 'Pay Less - Part' &&
                        claimAndPaymentdetails &&
                        claimAndPaymentdetails?.payment_list &&
                        claimAndPaymentdetails?.payment_list === null)
                    ) {
                      showJournalMessage =
                        await this.paymentClaimsService.createJournalEntries(
                          transactionalEntityManager,
                          47,
                          paymentDetails?.paymentClaims,
                          paymentDetails?.payment_from_account,
                          paymentDetails.payment_claim_id,
                          paymentDetails,
                          userId,
                        );
                    }
                  }
                }
              }

              // Update the status of retention list entry.
              if (
                paymentDetails.paymentClaims?.cash_retention_type ==
                'Retention claim' &&
                paymentDetails?.retention_id
              ) {
                //Update the status of retention list to Payment generated.
                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(RetentionDetails)
                  .set({
                    retention_status: 'Claim generated',
                  })
                  .where('retention_id = :retention_id', {
                    retention_id: paymentDetails.retention_id,
                  })
                  .execute();
              } else if (
                paymentDetails.payment_type == 'Withdrawal' &&
                paymentDetails?.retention_id
              ) {
                //Update the status of retention list to Payment generated.
                await transactionalEntityManager
                  .createQueryBuilder()
                  .update(RetentionDetails)
                  .set({
                    retention_status: 'Retained',
                  })
                  .where('retention_id = :retention_id', {
                    retention_id: paymentDetails.retention_id,
                  })
                  .execute();
              }

              let eventTemplateId, dynamicValues;
              const payable_payment_types = [
                'Full',
                'Part',
                'Pay Less - Full',
                'Pay Less - Part',
                'Pay - Zero',
                '3rd Party',
              ];
              if (payable_payment_types.includes(paymentDetails.payment_type)) {
                //Generating payment link to view created payment.
                const paymentLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[9]}` +
                  `${paymentDetails?.paymentClaims?.payment_claim_id}` +
                  `&mode=view&payment=` +
                  `${payment_id}` +
                  `&from=log`;
                // console.log'paymentLink', paymentLink);
                eventTemplateId =
                  paymentDetails.paymentClaims.claim_type === 'Receivable'
                    ? 82
                    : 87;
                dynamicValues = {
                  paymentLink,
                  paymentType: paymentDetails.payment_type,
                  paymentId: payment_id,
                  paymentAmount: formatCurrency(paymentDetails.total_amount),
                  clientSupplierName:
                    paymentDetails?.clientSupplierDetails?.client_supplier_name,
                };
              } else {
                //Generating payment link to view created payment.
                const paymentLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[13]}` +
                  `${payment_id}` +
                  `?from=log`;
                // console.log'paymentLink', paymentLink);
                switch (paymentDetails.payment_type) {
                  case 'Bank Charge Applied':
                    {
                      eventTemplateId = 97;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        accountName:
                          paymentDetails.paymentFromAccount.account_name,
                      };
                    }
                    break;
                  case 'Bank Charge Top Up':
                    {
                      eventTemplateId = 101;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        accountName:
                          paymentDetails.paymentToAccount.account_name,
                      };
                    }
                    break;
                  case 'Interest Received':
                    {
                      eventTemplateId = 93;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        accountName:
                          paymentDetails.paymentToAccount.account_name,
                      };
                    }
                    break;
                  case 'Interest Withdrawal':
                    {
                      eventTemplateId = 99;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        fromAccountName:
                          paymentDetails.paymentFromAccount.account_name,
                        toAccountName:
                          paymentDetails.paymentToAccount.account_name,
                      };
                    }
                    break;
                  case 'Top Up':
                    {
                      eventTemplateId = 95;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        accountName:
                          paymentDetails.paymentToAccount.account_name,
                      };
                    }
                    break;
                  case 'Top Up Retention':
                    {
                      eventTemplateId = 105;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        projectName: paymentDetails.projectDetails.project_name,
                      };
                    }
                    break;
                  case 'Withdrawal':
                    {
                      eventTemplateId = 103;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        fromAccountName:
                          paymentDetails.paymentFromAccount.account_name,
                        toAccountName:
                          paymentDetails.paymentToAccount.account_name,
                      };
                    }
                    break;
                  case 'Overpayment refund from supplier':
                    {
                      eventTemplateId = 107;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            .client_supplier_name,
                      };
                    }
                    break;
                  case 'Overpayment refund to client':
                    {
                      eventTemplateId = 109;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            .client_supplier_name,
                      };
                    }
                    break;
                  case 'Overpayment from client':
                    {
                      eventTemplateId = 89;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            ?.client_supplier_name,
                      };
                    }
                    break;
                  case 'Overpayment to supplier':
                    {
                      eventTemplateId = 111;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            ?.client_supplier_name,
                      };
                    }
                    break;
                  case 'Underpayment from client':
                    {
                      eventTemplateId = 113;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            ?.client_supplier_name,
                      };
                    }
                    break;
                  case 'Underpayment to supplier':
                    {
                      eventTemplateId = 91;
                      dynamicValues = {
                        paymentLink,
                        paymentType: paymentDetails.payment_type,
                        paymentAmount: formatCurrency(
                          paymentDetails.total_amount,
                        ),
                        clientSupplierName:
                          paymentDetails.clientSupplierDetails
                            ?.client_supplier_name,
                      };
                    }
                    break;
                }
              }

              //Create activity log as soon a payment claim is created.
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: eventTemplateId,
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
                company_id: paymentDetails.company_id,
                dynamic_values: dynamicValues,
                is_admin: false,
                created_by: decoded?.userId,
              };
              //// console.log'createActivityLogInput', createActivityLogInput);
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }

            this.logger.log(`Status of payment changed successfully.`);

            return framedResponse(
              'SUCCESS',
              showJournalMessage
                ? 'Trust journal updated'
                : `This payment has been deleted.`,
            );
          }
          throw `The confirmed payment cannot be deleted.`;
        },
      );

      if (response) {
        const paymentDetails = await this.paymentsRepo.findOne({
          where: { payment_id: data?.payment_id },
        });
        if (paymentDetails?.project_id) {
          const compliance_pta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: paymentDetails.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            });

          const compliance_rta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: paymentDetails.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            });
        }
      }
      return response;
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async editDetailsOfAPayment(
    decoded,
    data: EditDetailsOfAPaymentInput,
    userId?: number,
  ) {
    try {
      const { payment_id } = data;
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Handling request for editing the details of a payment with data: ${JSON.stringify(data)}`,
          );
          // console.log'data', data);

          let showJournalMessage = false;

          const paymentDetails = await transactionalEntityManager.findOne(
            PaymentDetails,
            {
              where: { payment_id: payment_id },
              relations: ['subPayments'],
              // lock: { mode: 'pessimistic_write' },
            },
          );
          // console.log'paymentDetails', paymentDetails);

          if (!paymentDetails && !paymentDetails?.subPayments)
            throw `Invalid input. Payment not found. Please provide a valid payment id.`;

          const claimDetails = paymentDetails.payment_claim_id
            ? await transactionalEntityManager.findOne(PaymentClaims, {
              where: { payment_claim_id: paymentDetails.payment_claim_id },
              lock: { mode: 'pessimistic_write' },
            })
            : null;
          // console.log'claimDetails', claimDetails);
          let eventTemplateId;
          //Generating payment link to view created payment.
          const paymentLink = [
            'Full',
            'Part',
            'Pay Less - Full',
            'Pay Less - Part',
            'Pay - Zero',
            '3rd Party',
          ].includes(paymentDetails?.payment_type)
            ? `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[9]}` +
            `${claimDetails?.payment_claim_id != null || claimDetails?.payment_claim_id != undefined ? claimDetails?.payment_claim_id : ''}` +
            `&mode=view&payment=` +
            `${payment_id}` +
            `&from=log`
            : `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[13]}` +
            `${payment_id}` +
            `?from=log`;
          // console.log'paymentLink', paymentLink);

          let requestData: any = {
            user_id: userId,
            payment_id: payment_id,
            payment_type: paymentDetails?.payment_type,
            current_payment_status: paymentDetails?.current_status,
            previous_payment_status: paymentDetails?.current_status,
            list_status: paymentDetails?.list_status,
          };

          if (paymentDetails?.payment_claim_id && claimDetails) {
            requestData = {
              ...requestData,
              payment_claim_id: paymentDetails?.payment_claim_id,
              previous_claim_status: claimDetails?.status,
              current_claim_status: claimDetails?.status,
              cash_retention_type: claimDetails?.cash_retention_type,
              claim_type: claimDetails?.claim_type,
            };
          }

          let changesMade = false; // <-- Added flag
          let confirmedPayments = [],
            unConfirmedPayments = [];
          if (
            paymentDetails?.payment_type !== 'Pay - Zero' &&
            paymentDetails?.payment_type !== '3rd Party'
          ) {
            let payment_matched, retention_out_matched, retention_in_matched;
            await Promise.all(
              paymentDetails.subPayments.map(async (element) => {
                if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_paid_confirmed !== null &&
                  element.is_received_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  if (
                    data.is_paid_confirmed !== undefined &&
                    element.is_paid_confirmed !== data.is_paid_confirmed
                  ) {
                    changesMade = true;

                    await transactionalEntityManager
                      .createQueryBuilder()
                      .update(SubPayments)
                      .set({
                        is_paid_confirmed: data.is_paid_confirmed,
                        updated_by: userId,
                        updated_on: moment.tz('UTC'),
                        updated_group: 'USER',
                      })
                      .where('sub_payment_id = :sub_payment_id', {
                        sub_payment_id: element.sub_payment_id,
                      })
                      .execute();
                    payment_matched =
                      element.status === 'Unmatched' ? false : true;

                    //Create activity log as soon a payment claim is created.
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: data.is_paid_confirmed ? 78 : 79,
                      admin_id:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: paymentDetails?.company_id,
                      dynamic_values: {
                        paymentLink,
                        paymentType: paymentDetails?.payment_type,
                        paymentId: payment_id,
                      },
                      is_admin: false,
                      created_by: decoded?.userId,
                    };

                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );
                    if (data.is_paid_confirmed) {
                      confirmedPayments.push(element);
                    } else {
                      unConfirmedPayments.push(element);
                    }
                  }
                } else if (
                  element.sub_payment_type === 'Retention Out' &&
                  element.is_retention_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_received_confirmed === null
                ) {
                  if (
                    data.is_retention_confirmed !== undefined &&
                    element.is_retention_confirmed !==
                    data.is_retention_confirmed
                  ) {
                    changesMade = true;
                    await transactionalEntityManager
                      .createQueryBuilder()
                      .update(SubPayments)
                      .set({
                        is_retention_confirmed: data.is_retention_confirmed,
                        updated_by: userId,
                        updated_on: moment.tz('UTC'),
                        updated_group: 'USER',
                      })
                      .where('sub_payment_id = :sub_payment_id', {
                        sub_payment_id: element.sub_payment_id,
                      })
                      .execute();
                    retention_out_matched =
                      element.status === 'Unmatched' ? false : true;

                    //Create activity log as soon a payment claim is created.
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: data.is_retention_confirmed ? 80 : 81,
                      admin_id:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: paymentDetails?.company_id,
                      dynamic_values: {
                        paymentLink,
                        paymentType: paymentDetails?.payment_type,
                        paymentId: payment_id,
                      },
                      is_admin: false,
                      created_by: decoded?.userId,
                    };
                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );

                    if (data.is_retention_confirmed) {
                      confirmedPayments.push(element);
                      const matchingRetentionIn =
                        paymentDetails.subPayments?.find(
                          (p) => p.sub_payment_type === 'Retention In',
                        );

                      if (matchingRetentionIn) {
                        confirmedPayments.push(matchingRetentionIn);
                      }
                    } else {
                      unConfirmedPayments.push(element);
                      const matchingRetentionIn =
                        paymentDetails.subPayments?.find(
                          (p) => p.sub_payment_type === 'Retention In',
                        );

                      if (matchingRetentionIn) {
                        unConfirmedPayments.push(matchingRetentionIn);
                      }
                    }
                  }
                } else if (element.sub_payment_type === 'Retention In') {
                  retention_in_matched =
                    element.status === 'Unmatched' ? false : true;
                } else if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_received_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  if (
                    data.is_received_confirmed !== undefined &&
                    element.is_received_confirmed !== data.is_received_confirmed
                  ) {
                    changesMade = true;
                    await transactionalEntityManager
                      .createQueryBuilder()
                      .update(SubPayments)
                      .set({
                        is_received_confirmed: data.is_received_confirmed,
                        updated_by: userId,
                        updated_on: moment.tz('UTC'),
                        updated_group: 'USER',
                      })
                      .where('sub_payment_id = :sub_payment_id', {
                        sub_payment_id: element.sub_payment_id,
                      })
                      .execute();
                    payment_matched =
                      element.status === 'Unmatched' ? false : true;

                    //Create activity log as soon a payment claim is created.
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: data.is_received_confirmed ? 78 : 79,
                      admin_id:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: paymentDetails?.company_id,
                      dynamic_values: {
                        paymentLink,
                        paymentType: paymentDetails?.payment_type,
                        paymentId: payment_id,
                      },
                      is_admin: false,
                      created_by: decoded?.userId,
                    };

                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );

                    if (data.is_received_confirmed) {
                      confirmedPayments.push(element);
                    } else {
                      unConfirmedPayments.push(element);
                    }
                  }
                }
              }),
            );

            if (
              claimDetails?.claim_type === 'Billable' ||
              claimDetails?.claim_type === 'Receivable'
            ) {
              requestData = {
                ...requestData,
                cash_retention: paymentDetails?.cash_retention,
              };
            }

            if (
              (claimDetails?.claim_type === 'Billable' &&
                ['Full', 'Part', 'Pay Less - Full', 'Pay Less - Part'].includes(
                  paymentDetails?.payment_type,
                )) ||
              [
                'Interest Withdrawal',
                'Bank Charge Applied',
                'Withdrawal',
                'Overpayment refund to client',
                'Overpayment to supplier',
                'Underpayment to supplier',
              ].includes(paymentDetails?.payment_type)
            ) {
              requestData = {
                ...requestData,
                is_paid_confirmed: data?.is_paid_confirmed,
                payment_matched: payment_matched,
                is_retention_confirmed: paymentDetails?.cash_retention
                  ? data?.is_retention_confirmed
                  : undefined,
                retention_out_matched: retention_out_matched,
                retention_in_matched: retention_in_matched,
              };
            } else {
              requestData = {
                ...requestData,
                is_received_confirmed: data?.is_received_confirmed,
                payment_matched: payment_matched,
              };
            }
          }

          if (!changesMade) {
            throw 'No changes to save';
          }

          await this.updateClaimAndPaymentStatuses(
            transactionalEntityManager,
            requestData,
          );

          this.logger.log('confirmedPayments: ' + JSON.stringify(confirmedPayments));
          this.logger.log('unConfirmedPayments: ' + JSON.stringify(unConfirmedPayments));

          // create retentions
          const subPaymentDetails = await transactionalEntityManager
            .createQueryBuilder(SubPayments, 'subpayment')
            .select([
              'subpayment.id AS id',
              'subpayment.payment_id AS payment_id',
              'subpayment.amount AS amount',
              'subpayment.status AS status',
              'subpayment.sub_payment_id AS sub_payment_id',
              'subpayment.sub_payment_type AS sub_payment_type',
              'subpayment.is_paid_confirmed AS is_paid_confirmed',
              'subpayment.is_received_confirmed AS is_received_confirmed',
              'subpayment.is_retention_confirmed AS is_retention_confirmed',
              'claim.cash_retention_type AS cash_retention_type',
              'claim.claim_amount AS claim_amount',
              'claim.claim_type AS claim_type',
              'claim.retention_id AS retention_id',
              'claim.status AS claim_status',
              'claim.payment_claim_id AS payment_claim_id',
              'payment.cash_retention AS cash_retention',
              'payment.payment_type AS payment_type',
              'payment.total_amount AS total_amount',
            ])
            .leftJoin('subpayment.paymentDetails', 'payment')
            .leftJoin('payment.paymentClaims', 'claim')
            .where('subpayment.payment_id =:payment_id', { payment_id })
            .getRawMany();

          if (confirmedPayments && confirmedPayments?.length > 0) {
            let sub_payment_ids = [];
            for (const element of subPaymentDetails) {
              if (
                element.sub_payment_type == 'Retention In' &&
                ['Auto matched', 'Unmatched'].includes(element.status)
              ) {
                const isConfirmed = subPaymentDetails?.find(
                  (p) =>
                    p.sub_payment_type === 'Retention Out' &&
                    confirmedPayments.some(
                      (payment) => payment.sub_payment_id === p.sub_payment_id,
                    ),
                );

                if (isConfirmed) {
                  if (element.status === 'Auto matched') {
                    const isPayment = subPaymentDetails?.find(
                      (p) => p.sub_payment_type === 'Payment',
                    );
                    sub_payment_ids.push(isPayment.sub_payment_id);
                  } else {
                    sub_payment_ids.push(element.sub_payment_id);
                  }
                }
              } else if (element.sub_payment_type == 'Retention') {
                const isConfirmed = subPaymentDetails?.find(
                  (p) =>
                    p.sub_payment_type === 'Payment' &&
                    confirmedPayments.some(
                      (payment) => payment.sub_payment_id === p.sub_payment_id,
                    ) &&
                    p.status === 'Unmatched',
                );

                if (isConfirmed) {
                  sub_payment_ids.push(isConfirmed.sub_payment_id);
                }
              } else if (
                element.cash_retention_type == 'Retention claim' &&
                element.sub_payment_type == 'Payment' &&
                confirmedPayments.some(
                  (payment) =>
                    payment.sub_payment_id === element.sub_payment_id,
                ) &&
                element.status === 'Unmatched'
              ) {
                sub_payment_ids.push(element.sub_payment_id);
              }
            }

            if (sub_payment_ids && sub_payment_ids?.length > 0) {
              await this.createOrDeleteRetentionEntries(
                transactionalEntityManager,
                sub_payment_ids,
                false,
              );
            }
          }

          if (unConfirmedPayments && unConfirmedPayments?.length > 0) {
            let sub_payment_ids = [];
            for (const element of subPaymentDetails) {
              if (
                element.sub_payment_type == 'Retention In' &&
                ['Auto matched', 'Unmatched'].includes(element.status)
              ) {
                const isUnconfirmed = subPaymentDetails?.find(
                  (p) =>
                    p.sub_payment_type === 'Retention Out' &&
                    unConfirmedPayments.some(
                      (payment) => payment.sub_payment_id === p.sub_payment_id,
                    ),
                );

                if (isUnconfirmed) {
                  if (element.status === 'Auto matched') {
                    const isPayment = subPaymentDetails?.find(
                      (p) => p.sub_payment_type === 'Payment',
                    );
                    sub_payment_ids.push(isPayment.sub_payment_id);
                  } else {
                    sub_payment_ids.push(element.sub_payment_id);
                  }
                }
              } else if (element.sub_payment_type == 'Retention') {
                const isUnconfirmed = subPaymentDetails?.find(
                  (p) =>
                    p.sub_payment_type === 'Payment' &&
                    unConfirmedPayments.some(
                      (payment) => payment.sub_payment_id === p.sub_payment_id,
                    ) &&
                    p.status === 'Unmatched',
                );

                if (isUnconfirmed) {
                  sub_payment_ids.push(isUnconfirmed.sub_payment_id);
                }
              } else if (
                element.cash_retention_type == 'Retention claim' &&
                element.sub_payment_type == 'Payment' &&
                unConfirmedPayments.some(
                  (payment) =>
                    payment.sub_payment_id === element.sub_payment_id,
                ) &&
                element.status === 'Unmatched'
              ) {
                sub_payment_ids.push(element.sub_payment_id);
              }
            }

            if (sub_payment_ids && sub_payment_ids?.length > 0) {
              await this.createOrDeleteRetentionEntries(
                transactionalEntityManager,
                sub_payment_ids,
                true,
              );
            }
          }

          const journalPaymentDetails =
            await transactionalEntityManager.findOne(PaymentDetails, {
              where: { id: paymentDetails.id },
            });
          if (journalPaymentDetails) {
            // new journal changes
            if (confirmedPayments && confirmedPayments?.length > 0) {
              for (const payment of confirmedPayments) {
                const paymentDetails = await transactionalEntityManager.findOne(
                  PaymentDetails,
                  {
                    where: { payment_id: payment.payment_id },
                    relations: ['subPayments'],
                  },
                );

                const claimDetails = paymentDetails.payment_claim_id
                  ? await transactionalEntityManager.findOne(PaymentClaims, {
                    where: {
                      payment_claim_id: paymentDetails.payment_claim_id,
                    },
                    lock: { mode: 'pessimistic_write' },
                  })
                  : null;

                showJournalMessage =
                  await this.paymentClaimsService.createJournals(
                    transactionalEntityManager,
                    claimDetails,
                    paymentDetails,
                    payment?.sub_payment_type,
                    null,
                    null,
                    false,
                    userId,
                  );
              }
            }
            if (unConfirmedPayments && unConfirmedPayments?.length > 0) {
              const paymentDetails = await transactionalEntityManager.findOne(
                PaymentDetails,
                {
                  where: { payment_id },
                  relations: ['subPayments'],
                },
              );

              const claimDetails = paymentDetails.payment_claim_id
                ? await transactionalEntityManager.findOne(PaymentClaims, {
                  where: {
                    payment_claim_id: paymentDetails.payment_claim_id,
                  },
                  lock: { mode: 'pessimistic_write' },
                })
                : null;

              showJournalMessage =
                await this.paymentClaimsService.createJournals(
                  transactionalEntityManager,
                  claimDetails,
                  paymentDetails,
                  null,
                  paymentDetails,
                  unConfirmedPayments,
                  true,
                  userId,
                );
            }
          }

          this.logger.log(
            `Details of a payment with id: ${payment_id} has edited successfully.`,
          );

          return framedResponse(
            'SUCCESS',
            showJournalMessage
              ? 'Trust journal updated'
              : `This payment has been updated.`,
          );
        },
      );

      let notices;

      if (response) {
        const paymentDetails = await this.paymentsRepo.findOne({
          where: { payment_id: data?.payment_id },
        });

        const currentStatus = paymentDetails.current_status || '';

        if (
          data.is_paid_confirmed === false ||
          data.is_received_confirmed === false ||
          data.is_retention_confirmed === false
        ) {
          const retentionNoticeTypes = [
            'Supplier Retention Payment Schedule Notice',
            'Supplier Retention Payment Remittance Notice',
          ];

          const paymentNoticeTypes = [
            'QBCC TA4 Part Payment Notice',
            'Supplier Payment with Retention Withheld Notice',
            'Supplier Payment with Retention Schedule Notice',
            'Supplier Payment Remittance Advice Notice',
            'Supplier Payment Schedule Notice',
          ];

          // Step 2: Identify match states
          const isPaymentMatched = currentStatus.includes('Payment Matched');
          const isRetentionInMatched = currentStatus.includes(
            'Retention In Matched',
          );

          const allNotices = await this.noticesRepo.find({
            where: {
              payment_id: paymentDetails.payment_id,
              notice_type: In([...paymentNoticeTypes, ...retentionNoticeTypes]),
            },
          });

          this.logger.log('All notices of payment: ' + JSON.stringify(allNotices));

          const noticesToArchive: NoticeDetails[] = [];

          if (
            (data.is_paid_confirmed === false ||
              data.is_received_confirmed === false) &&
            !isPaymentMatched
          ) {
            const paymentNotices = allNotices.filter((n) =>
              paymentNoticeTypes.includes(n.notice_type),
            );
            noticesToArchive.push(...paymentNotices);
          }

          if (data.is_retention_confirmed === false) {
            if (!isRetentionInMatched) {
              const retentionNotices = allNotices.filter((n) =>
                retentionNoticeTypes.includes(n.notice_type),
              );
              noticesToArchive.push(...retentionNotices);
            }
          }

          if (noticesToArchive.length > 0) {
            noticesToArchive.forEach((notice) => {
              notice.status =
                notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';
              notice.updated_by = userId;
              notice.updated_on = moment().tz('UTC');
              notice.updated_group = userId ? 'USER' : 'SYSTEM';
            });

            await this.noticesRepo.save(noticesToArchive);
            this.logger.log(
              `Archived (deleted) ${noticesToArchive.length} notices for payment_id ${paymentDetails.payment_id} as confirmations turned false and payment unmatched.`,
            );
          }
        }

        if (
          data.is_paid_confirmed === true ||
          data.is_received_confirmed === true ||
          data.is_retention_confirmed === true ||
          paymentDetails.payment_type === '3rd Party' ||
          paymentDetails.payment_type === 'Pay - Zero'
        ) {
          notices = await this.noticeService.handleTriggerPaymentNotices(
            decoded,
            { payment_ids: [payment_id], view_preview: true },
          );
        }
        if (paymentDetails?.project_id) {
          const compliance_pta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: paymentDetails.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            });

          const compliance_rta_init =
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: paymentDetails.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            });
        }
      }

      const responseWithNotice = {
        ...response,
        data: {
          notices: notices?.data,
        },
      };
      return responseWithNotice;
    } catch (error) {
      this.logger.error(
        `Errored while editing the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async updateClaimAndPaymentStatuses(
    transactionalEntityManager,
    data: any,
  ): Promise<Boolean> {
    try {
      const options = {
        cash_retention_type: data?.cash_retention_type,
        claim_type: data?.claim_type,
        payment_type: data?.payment_type,
        cash_retention: data?.cash_retention,
        is_paid_confirmed: data?.is_paid_confirmed,
        is_received_confirmed: data?.is_received_confirmed,
        is_retention_confirmed: data?.is_retention_confirmed,
        payment_matched: data?.payment_matched,
        retention_out_matched: data?.retention_out_matched,
        retention_in_matched: data?.retention_in_matched,
      };

      const getStatusRes = await getStatusForUpdateInDB(options);

      const current_payment_status = getStatusRes?.payment_status
        ? getStatusRes?.payment_status
        : data?.current_payment_status;
      const current_claim_status = getStatusRes?.claim_status
        ? getStatusRes?.claim_status
        : data?.current_claim_status;
      let list_status = getStatusRes?.list_status
        ? getStatusRes?.list_status
        : data?.list_status;
      // console.log(
      //   'getStatusRes?.list_status: ',
      //   getStatusRes?.list_status,
      //   data?.list_status,
      // );

      await transactionalEntityManager
        .createQueryBuilder()
        .update(PaymentDetails)
        .set({
          previous_status: data?.previous_payment_status,
          current_status: current_payment_status,
          list_status: list_status,
          updated_by: data?.user_id,
          updated_on: moment.tz('UTC'),
          updated_group: 'USER',
        })
        .where(`payment_id = :payment_id`, {
          payment_id: data?.payment_id,
        })
        .execute();

      const updatePaymentButtons =
        await this.statusService.getUiStatusAndActionButtonsForPaymentsTransaction(
          transactionalEntityManager,
          {
            payment_id: data?.payment_id,
          },
        );
      // console.log'updatePaymentButtons: ', updatePaymentButtons);

      // console.log(
      //   'data?.payment_claim_id: ',
      //   data?.payment_claim_id,
      //   data?.previous_claim_status,
      //   current_claim_status,
      //   list_status,
      // );
      if (
        data?.payment_claim_id &&
        current_claim_status &&
        // data?.previous_claim_status !== current_claim_status &&
        ![
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier',
          'Overpayment refund from supplier',
          'Overpayment refund to client',
        ].includes(data?.payment_type)
      ) {
        if (
          data?.payment_claim_id &&
          ['Part', 'Pay Less - Part'].includes(data?.payment_type)
        ) {
          const queryBuilder = transactionalEntityManager
            .createQueryBuilder(PaymentClaims, 'pc')
            .select([
              'pc.payment_claim_id AS payment_claim_id',
              'pc.company_id AS company_id',
              'pc.claim_type AS claim_type',
              'pc.cash_retention_type AS cash_retention_type',
              'pc.due_date AS due_date',
              'pc.claim_amount AS claim_amount',
              'pc.status AS claim_status',
            ]);

          queryBuilder.addSelect((subQuery) => {
            return subQuery
              .select(
                `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'payment_id', p.payment_id,
                  'payment_type', p.payment_type,
                  'cash_retention', p.cash_retention,
                  'payment_status', p.current_status,
                  'payless_amount', p.payless_amount,
                  'total_amount', p.total_amount
                )
              )`,
                'payments',
              )
              .from(PaymentDetails, 'p')
              .where('p.payment_claim_id = pc.payment_claim_id')
              .andWhere(`p.current_status != 'Deleted'`)
              .andWhere(
                `p.payment_type NOT IN ('Overpayment from client',
              'Underpayment from client','Overpayment to supplier',
              'Underpayment to supplier')`,
              )
              .groupBy('p.payment_claim_id')
              .orderBy('MAX(p.created_on)', 'DESC');
          }, 'payment_list');

          queryBuilder.where('pc.payment_claim_id =:payment_claim_id', {
            payment_claim_id: data?.payment_claim_id,
          });

          const claimAndPaymentdetails = await queryBuilder.getRawOne();
          //  console.log'claimAndPaymentdetails: ', claimAndPaymentdetails);
          const payment_list =
            claimAndPaymentdetails && claimAndPaymentdetails.payment_list
              ? claimAndPaymentdetails.payment_list
              : null;
          let paidAmount = 0,
            outstandingAmount = 0;
          if (payment_list !== null && payment_list[0] !== null) {
            payment_list.forEach((element) => {
              paidAmount += element.total_amount;
            });
            if (payment_list[0].payment_type === 'Part') {
              outstandingAmount =
                claimAndPaymentdetails.claim_amount - paidAmount;
            } else if (payment_list[0].payment_type === 'Pay Less - Part') {
              outstandingAmount = payment_list[0].payless_amount - paidAmount;
            } else {
              outstandingAmount = 0;
            }
          }

          if (
            outstandingAmount > 0 &&
            payment_list &&
            [
              'Unconfirmed - Matched',
              'Paid - Matched',
              'Received - Matched',
              'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
              'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
              'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
              'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
              'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
              'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
              'Paid - Unmatched',
              'Received - Unmatched',
            ].includes(payment_list[0].payment_status)
          ) {
            list_status = 'Add payment';
          }
        }
        // console.log'list_status: ', list_status);
        await transactionalEntityManager
          .createQueryBuilder()
          .update(PaymentClaims)
          .set({
            previous_status: data?.previous_claim_status,
            status: current_claim_status,
            list_status: list_status,
            updated_by: data?.user_id,
            updated_on: moment.tz('UTC'),
            updated_group: 'USER',
          })
          .where(`payment_claim_id = :payment_claim_id`, {
            payment_claim_id: data?.payment_claim_id,
          })
          .execute();

        const updateClaimButtons =
          await this.statusService.getUiStatusAndActionButtonsForClaimsTransaction(
            transactionalEntityManager,
            {
              payment_claim_id: data?.payment_claim_id,
            },
          );
        // console.log'updateClaimButtons: ', updateClaimButtons);
        // throw new Error();
        return true;
      } else {
        // throw new Error();
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Errored while adding a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchDetailsOfAPayment(data: FetchDetailsOfAPaymentInput) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );

      const { payment_id } = data;
      const fetchedPaymentDetails = await this.paymentsRepo
        .createQueryBuilder('p')
        .select([
          'p.payment_id AS payment_id',
          'p.payment_claim_id AS payment_claim_id',
          'p.payment_type AS payment_type',
          'p.cash_retention AS cash_retention',
          'p.project_id AS project_id',
          'pr.project_name AS project_name',
          'pr.project_date AS project_date',
          'p.contract_id AS contract_id',
          'p.associated_payment_id AS associated_payment_id',
          'p.associated_overpayment_id AS associated_overpayment_id',
          'c.contract_name AS contract_name',
          'c.contract_date AS contract_date',
          'c.client_supplier_role AS client_supplier_role',
          'c.retention_type AS retention_type',
          'c.payment_terms AS payment_terms',
          'c.defect_liability_end_date AS defect_liability_end_date',
          'p.client_supplier_id AS client_supplier_id',
          'cs.client_supplier_type AS client_supplier_type',
          'cs.client_supplier_name AS client_supplier_name',
          'cs.client_supplier_address AS client_supplier_address',
          'pc.claim_type AS claim_type',
          'pc.cash_retention_type AS cash_retention_type',
          'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
          'pc.retention_id AS retention_id',
          'pc.claim_reference AS claim_reference',
          'pc.memo AS claim_memo',
          'pc.is_gst_optional AS is_gst_optional',
          'p.payment_from_account AS payment_from_account',
          'fromAccount.account_name AS payment_from_account_name',
          'fromAccount.account_type AS payment_from_account_type',
          'fromAccount.bsb_number AS payment_from_account_bsb_number',
          'fromAccount.account_number AS payment_from_account_number',
          'p.payment_to_account AS payment_to_account',
          'toAccount.account_name AS payment_to_account_name',
          'toAccount.account_type AS payment_to_account_type',
          'toAccount.bsb_number AS payment_to_account_bsb_number',
          'toAccount.account_number AS payment_to_account_number',
          'p.retention_account AS retention_account',
          'retentionAcc.account_name AS retention_account_name',
          'retentionAcc.account_number AS retention_account_number',
          'pc.due_date AS due_date',
          'pc.sent_date AS sent_date',
          'pc.received_date AS received_date',
          'pc.status AS claim_status',
          'p.current_status AS status',
          'p.list_status AS list_status',
          'p.payment_overview_buttons AS payment_overview_buttons',
          'pc.claim_amount AS claim_amount',
          'payment.is_paid_confirmed AS is_paid_confirmed',
          'payment.is_received_confirmed AS is_received_confirmed',
          'retention.is_retention_confirmed AS is_retention_confirmed',
          'payment.amount AS payment_amount',
          'retention.amount AS retention_amount',
          'p.payless_amount AS payless_amount',
          'p.total_amount AS total_amount',
          'p.payment_date AS payment_date',
          'p.retention_release_date AS retention_release_date',
          'p.memo AS memo',
          'p.optional_attachment_ids AS optional_attachment_ids',
          'p.compulsory_attachment_ids AS compulsory_attachment_ids',
          'payment.matched_transactions AS matched_transactions',
          'p.third_party_payment_reason AS third_party_payment_reason',
          'p.withhold_payment_reason AS withhold_payment_reason',
          'p.input_date AS input_date',
          'pc.cash_retention AS has_claim_retention',
          'pc.retention_amount AS claim_retention_amount',
          'pc.retention_percentage AS retention_percentage',
          'pc.retention_amount_with_gst AS retention_amount_with_gst',
        ])
        .leftJoin('p.paymentClaims', 'pc')
        .leftJoin('p.contractDetails', 'c')
        .leftJoin('p.clientSupplierDetails', 'cs')
        .leftJoin('p.projectDetails', 'pr')
        .leftJoin('p.paymentFromAccount', 'fromAccount')
        .leftJoin('p.paymentToAccount', 'toAccount')
        .leftJoin('p.retentionAccount', 'retentionAcc')
        .leftJoin(
          'p.subPayments',
          'payment',
          `payment.sub_payment_type = 'Payment'`,
        )
        .leftJoin(
          'p.subPayments',
          'retention',
          `retention.sub_payment_type IN ('Retention', 'Retention Out')`,
        )
        .where('p.payment_id = :payment_id', { payment_id })
        .getRawOne();

      if (!fetchedPaymentDetails)
        throw `Details of a payment with id: ${data.payment_id} has not found. Please provide a valid payment_id`;

      if (
        fetchedPaymentDetails.cash_retention_type &&
        fetchedPaymentDetails.cash_retention_type == 'Retention claim'
      ) {
        const retentionDetails = await this.retentionDetailsRepo
          .createQueryBuilder('rd')
          .select([
            'rd.retention_id AS retention_id',
            'rd.beneficiary_type AS beneficiary_type',
          ])
          .where('rd.sub_payment_id = :sub_payment_id', {
            sub_payment_id:
              fetchedPaymentDetails.associated_retention_sub_payment_id,
          })
          .andWhere('rd.retention_id = :retention_id', {
            retention_id: fetchedPaymentDetails.retention_id,
          })
          .getRawOne();
        fetchedPaymentDetails.beneficiary_type =
          retentionDetails?.beneficiary_type;
      }

      if (fetchedPaymentDetails.matched_transactions) {
        fetchedPaymentDetails.matched_transactions = parseCommaSeparatedInput(
          fetchedPaymentDetails.matched_transactions,
        );
      }
      if (fetchedPaymentDetails.optional_attachment_ids) {
        fetchedPaymentDetails.optional_attachment_ids =
          parseCommaSeparatedInput(
            fetchedPaymentDetails.optional_attachment_ids,
          );
      }
      if (fetchedPaymentDetails.compulsory_attachment_ids) {
        fetchedPaymentDetails.compulsory_attachment_ids =
          parseCommaSeparatedInput(
            fetchedPaymentDetails.compulsory_attachment_ids,
          );
      }

      //Change payment_from_account details based upon the cash_retention_type.
      if (
        fetchedPaymentDetails.cash_retention_type == 'Retention claim' &&
        fetchedPaymentDetails.claim_type == 'Billable'
      ) {
        const bankAccountDetailsFromContract = await this.bankAccountsRepo
          .createQueryBuilder('ba')
          .select([
            'ba.bank_account_id AS payment_from_account',
            'ba.account_name AS payment_from_account_name',
            'ba.account_type AS payment_from_account_type',
          ])
          .where('ba.bank_account_id = :bank_account_id', {
            bank_account_id: fetchedPaymentDetails.payment_from_account,
          })
          .getRawOne();

        fetchedPaymentDetails.payment_from_account =
          bankAccountDetailsFromContract.payment_from_account;
        fetchedPaymentDetails.payment_from_account_name =
          bankAccountDetailsFromContract.payment_from_account_name;
        fetchedPaymentDetails.payment_from_account_type =
          bankAccountDetailsFromContract.payment_from_account_type;
      }

      const payable_payment_types = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];

      let gstSummary = {},
        fetchedInvoiceDetails = [];
      let outstanding_amount = 0,
        outstanding_retention_amount = 0;
      if (payable_payment_types.includes(fetchedPaymentDetails.payment_type)) {
        const payments = await this.paymentsRepo
          .createQueryBuilder('p')
          .select([
            'p.payment_id AS payment_id',
            'p.payment_type AS payment_type',
            'p.payless_amount AS payless_amount',
            'p.total_amount AS total_amount',
          ])
          .where('p.payment_claim_id = :payment_claim_id', {
            payment_claim_id: fetchedPaymentDetails.payment_claim_id,
          })
          .andWhere("p.current_status != 'Deleted'")
          .andWhere(
            `p.payment_type NOT IN ('Overpayment from client',
            'Underpayment from client','Overpayment to supplier',
            'Underpayment to supplier')`,
          )
          .orderBy({ 'p.created_on': 'DESC' })
          .getRawMany();
        this.logger.log(`paymentss: ${JSON.stringify(payments)}`);
        const payless_payments = payments?.filter(
          (payment) =>
            payment?.payment_type == 'Pay Less - Full' ||
            payment?.payment_type == 'Pay Less - Part',
        );
        this.logger.log(`payless_payments: ${JSON.stringify(payless_payments)}`);

        let existingTotalAmount = 0,
          totalRetentionAmount = 0;
        const paymentClaimDetails = fetchedPaymentDetails.payment_claim_id
          ? await this.paymentClaimsRepo.findOne({
            where: {
              payment_claim_id: fetchedPaymentDetails.payment_claim_id,
            },
          })
          : null;
        if (payments && payments[0] !== null && payments.length > 0) {
          if (
            fetchedPaymentDetails.payment_type === 'Full' ||
            fetchedPaymentDetails.payment_type === 'Part' ||
            fetchedPaymentDetails.payment_type === 'Pay Less - Full' ||
            fetchedPaymentDetails.payment_type === 'Pay Less - Part'
          ) {
            for (let payment of payments) {
              if (
                payment.payment_type === 'Full' ||
                payment.payment_type === 'Part' ||
                payment.payment_type === 'Pay Less - Full' ||
                payment.payment_type === 'Pay Less - Part'
              ) {
                const retentionDetails = await this.subPaymentsRepo
                  .createQueryBuilder('sp')
                  .select([
                    'sp.payment_id AS payment_id',
                    'sp.amount as retention_amount',
                  ])
                  .where(
                    `sp.sub_payment_type IN ('Retention', 'Retention In') and sp.payment_id = :payment_id`,
                    {
                      payment_id: payment.payment_id,
                    },
                  )
                  .getRawOne();

                this.logger.log(`retentionDetails: ${JSON.stringify(retentionDetails)}`);

                totalRetentionAmount += retentionDetails
                  ? parseFloat(retentionDetails?.retention_amount)
                  : 0;
                existingTotalAmount += parseFloat(payment.total_amount);
              }
            }
            outstanding_amount = payless_payments.length
              ? payless_payments[0].payless_amount - existingTotalAmount
              : fetchedPaymentDetails.claim_amount - existingTotalAmount;
            outstanding_retention_amount =
              paymentClaimDetails?.retention_amount_with_gst -
              totalRetentionAmount;

            if (outstanding_amount < 0) outstanding_amount = 0;
          }
        } else {
          outstanding_amount = fetchedPaymentDetails.claim_amount;
          outstanding_retention_amount =
            paymentClaimDetails?.retention_amount_with_gst;
        }

        fetchedInvoiceDetails = await this.paymentClaimInvoicesRepo
          .createQueryBuilder('i')
          .select([
            'i.description AS description',
            'i.quantity AS quantity',
            'i.unit_price AS unit_price',
            'i.gst AS gst',
            'i.total_amount_including_gst AS total_amount_including_gst',
            'i.payment_claim_id AS payment_claim_id',
          ])
          .where('i.payment_claim_id = :payment_claim_id', {
            payment_claim_id: fetchedPaymentDetails.payment_claim_id,
          })
          .getRawMany();

        if (!fetchedInvoiceDetails || !fetchedInvoiceDetails.length)
          throw `Invoice details not found for the provided payment claim details. Please provide a valid one.`;

        const subTotalSummaries = [];
        const gsts = [];
        await fetchedInvoiceDetails.map((invoice) => {
          subTotalSummaries.push(invoice.quantity * invoice.unit_price);
          gsts.push(+invoice.gst);
        });
        gstSummary = { gst_summary: gsts.reduce((acc, curr) => acc + curr, 0) };
        for (const element of fetchedInvoiceDetails) {
          element.formatted_unit_price = formatCurrencyWithoutDollars(
            element.unit_price,
          );
          element.formatted_gst = formatCurrencyWithoutDollars(element.gst);
          element.formatted_total_amount_including_gst =
            formatCurrencyWithoutDollars(element.total_amount_including_gst);
        }
      }

      const uiStatusDetails =
        await this.statusService.getUiStatusAndActionButtonsForPayments({
          payment_id: payment_id,
        });
      const statusDetails = {
        status_in_ui: uiStatusDetails?.status_in_ui,
        // payment_overview_buttons: uiStatusDetails?.payment_overview_buttons,
      };

      let associatedPaymentDetails = [];
      if (
        fetchedPaymentDetails.associated_payment_id &&
        fetchedPaymentDetails.associated_payment_id !== null
      ) {
        associatedPaymentDetails = await this.fetchDetailsOfAPayment({
          payment_id: fetchedPaymentDetails.associated_payment_id,
        });
      }

      let associatedOverPaymentDetails = [];
      if (
        fetchedPaymentDetails.associated_overpayment_id &&
        fetchedPaymentDetails.associated_overpayment_id !== null
      ) {
        associatedOverPaymentDetails = await this.fetchDetailsOfAPayment({
          payment_id: fetchedPaymentDetails.associated_overpayment_id,
        });
      }

      const fetchedAllRequiredPaymentDetails = {
        ...fetchedPaymentDetails,
        ...gstSummary,
        outstanding_amount,
        outstanding_retention_amount,
        ...statusDetails,
        ...{ invoices: fetchedInvoiceDetails },
        ...{ associated_payment_details: associatedPaymentDetails },
        ...{ associated_overpayment_details: associatedOverPaymentDetails },
      };

      //Formatted amounts in the results.
      fetchedAllRequiredPaymentDetails.formatted_payment_amount =
        formatCurrencyWithoutDollars(
          fetchedAllRequiredPaymentDetails.payment_amount,
        );
      fetchedAllRequiredPaymentDetails.formatted_claim_amount =
        fetchedAllRequiredPaymentDetails.claim_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllRequiredPaymentDetails.claim_amount,
          )
          : null;
      fetchedAllRequiredPaymentDetails.formatted_total_amount =
        formatCurrencyWithoutDollars(
          fetchedAllRequiredPaymentDetails.total_amount,
        );
      fetchedAllRequiredPaymentDetails.formatted_payless_amount =
        fetchedAllRequiredPaymentDetails.payless_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllRequiredPaymentDetails.payless_amount,
          )
          : null;
      fetchedAllRequiredPaymentDetails.formatted_retention_amount =
        fetchedAllRequiredPaymentDetails.retention_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllRequiredPaymentDetails.retention_amount,
          )
          : null;
      fetchedAllRequiredPaymentDetails.formatted_claim_retention_amount =
        fetchedAllRequiredPaymentDetails.claim_retention_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllRequiredPaymentDetails.claim_retention_amount,
          )
          : null;
      fetchedAllRequiredPaymentDetails.formatted_retention_amount_with_gst =
        fetchedAllRequiredPaymentDetails.retention_amount_with_gst
          ? formatCurrencyWithoutDollars(
            Math.abs(
              fetchedAllRequiredPaymentDetails.retention_amount_with_gst,
            ),
          )
          : null;
      fetchedAllRequiredPaymentDetails.formatted_outstanding_retention_amount =
        fetchedAllRequiredPaymentDetails.outstanding_retention_amount
          ? formatCurrencyWithoutDollars(
            Math.abs(
              fetchedAllRequiredPaymentDetails.outstanding_retention_amount,
            ),
          )
          : null;
      fetchedAllRequiredPaymentDetails.memo =
        fetchedAllRequiredPaymentDetails.memo == null ||
          fetchedAllRequiredPaymentDetails.memo == 'null'
          ? ''
          : fetchedAllRequiredPaymentDetails.memo;
      fetchedAllRequiredPaymentDetails.claim_memo =
        fetchedAllRequiredPaymentDetails.claim_memo == null ||
          fetchedAllRequiredPaymentDetails.claim_memo == 'null'
          ? ''
          : fetchedAllRequiredPaymentDetails.claim_memo;
      this.logger.log(
        `Details of a payment with id: ${data.payment_id} has fetched successfully.`,
      );

      return fetchedAllRequiredPaymentDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchAutoPopulatableFieldsWhileAddingAPayment(
    data: FetchAutoPopulatableFieldsWhileAddingAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );

      const { payment_claim_id, payment_type } = data;

      const paymentClaimDetails = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select([
          'pc.payment_claim_id AS payment_claim_id',
          'pc.claim_type AS claim_type',
          'pc.claim_amount AS claim_amount',
          'pc.cash_retention_type AS cash_retention_type',
          'pc.due_date AS due_date',
          'pc.sent_date AS sent_date',
          'pc.received_date AS received_date',
          'pc.status AS status',
          'pc.contract_id AS contract_id',
          'pc.project_id AS project_id',
          'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
          'pc.retention_id AS retention_id',
          'pc.claim_reference AS claim_reference',
          'pc.memo AS claim_memo',
          'pc.is_gst_optional AS is_gst_optional',
          'pc.cash_retention AS has_claim_retention',
          'pc.retention_amount AS retention_amount',
          'pc.retention_percentage AS retention_percentage',
          'pc.retention_amount_with_gst AS retention_amount_with_gst',
          'p.project_name AS project_name',
          'p.company_id AS company_id',
          'c.contract_name AS contract_name',
          'c.retention_type AS retention_type',
          'c.payment_terms AS payment_terms',
          'c.defect_liability_end_date AS defect_liability_end_date',
          'pc.client_supplier_id AS client_supplier_id',
          'cs.client_supplier_name AS client_supplier_name',
          'cs.client_supplier_type AS client_supplier_type',
          'cs.client_supplier_address AS client_supplier_address',
          'c.payment_from_account AS payment_from_account',
          'c.payment_to_account AS payment_to_account',
          'c.retention_from_account AS retention_from_account',
          'c.client_supplier_role AS client_supplier_role',
        ])
        .leftJoin('pc.contractDetails', 'c')
        .leftJoin('pc.projectDetails', 'p')
        .leftJoin('pc.clientSupplierDetails', 'cs')
        .where(`pc.payment_claim_id = :payment_claim_id`, { payment_claim_id })
        .getRawOne();

      if (!paymentClaimDetails)
        throw `Invalid data. Payment claim details not found.`;

      const paymentDetails = await this.subPaymentsRepo
        .createQueryBuilder('sp')
        .select([
          'sp.payment_id AS payment_id',
          'p.payment_from_account AS payment_from_account',
          'p.payment_to_account AS payment_to_account',
          'p.retention_account AS retention_account',
        ])
        .leftJoin(PaymentDetails, 'p', 'p.payment_id = sp.payment_id')
        .where('sp.sub_payment_id = :sub_payment_id', {
          sub_payment_id:
            paymentClaimDetails.associated_retention_sub_payment_id,
        })
        .getRawOne();

      let fetchedPaymentFromAccountDetails = {};
      if (paymentClaimDetails.client_supplier_type == 'Supplier') {
        const payment_from_account_id =
          paymentClaimDetails.cash_retention_type == 'Claim'
            ? paymentClaimDetails.payment_from_account
            : paymentClaimDetails.retention_from_account
              ? paymentClaimDetails.retention_from_account
              : paymentDetails.payment_from_account;

        fetchedPaymentFromAccountDetails = await this.bankAccountsRepo
          .createQueryBuilder('ba')
          .select([
            'ba.bank_account_id AS payment_from_account',
            'ba.account_name AS payment_from_account_name',
            'ba.account_type AS payment_from_account_type',
            'ba.bsb_number AS payment_from_account_bsb_number',
            'ba.account_number AS payment_from_account_number',
          ])
          .where('ba.bank_account_id = :bank_account_id', {
            bank_account_id: payment_from_account_id,
          })
          .getRawOne();

        if (!fetchedPaymentFromAccountDetails)
          throw `Payment from account id present in the contracts entity is invalid or not present in the bank accounts entity.`;
      }

      const payment_to_account_id =
        paymentClaimDetails.cash_retention_type == 'Claim'
          ? paymentClaimDetails.payment_to_account
          : paymentDetails.payment_to_account;
      const fetchedPaymentToAccountDetails = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.bank_account_id AS payment_to_account',
          'ba.account_name AS payment_to_account_name',
          'ba.account_type AS payment_to_account_type',
          'ba.bsb_number AS payment_to_account_bsb_number',
          'ba.account_number AS payment_to_account_number',
        ])
        .where('ba.bank_account_id = :bank_account_id', {
          bank_account_id: payment_to_account_id,
        })
        .getRawOne();

      if (!fetchedPaymentToAccountDetails)
        throw `Payment to account id present in the contracts entity is invalid or not present in the bank accounts entity.`;

      const payable_payment_types = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
      let outstanding_amount = 0,
        outstanding_retention_amount = 0,
        payless_amount = null;
      let gst_summary = {};
      const payments = payment_claim_id
        ? await this.paymentsRepo
          .createQueryBuilder('p')
          .select([
            'p.payment_id AS payment_id',
            'p.payment_type AS payment_type',
            'p.payless_amount AS payless_amount',
            'p.total_amount AS total_amount',
          ])
          .where('p.payment_claim_id = :payment_claim_id', {
            payment_claim_id: payment_claim_id,
          })
          .andWhere(`p.current_status != 'Deleted'`)
          .andWhere(
            `p.payment_type NOT IN ('Overpayment from client',
              'Underpayment from client','Overpayment to supplier',
              'Underpayment to supplier')`,
          )
          .orderBy({ 'p.created_on': 'DESC' })
          .getRawMany()
        : null;
      this.logger.log(`paymentss: ${JSON.stringify(payments)}`);
      const payless_payments = payments.filter(
        (payment) =>
          payment.payment_type == 'Pay Less - Full' ||
          payment.payment_type == 'Pay Less - Part',
      );
      this.logger.log(`payless_payments: ${JSON.stringify(payless_payments)}`);

      let existingTotalAmount = 0,
        totalRetentionAmount = 0;
      if (
        payments &&
        payments[0] !== null &&
        payments.length > 0 &&
        payable_payment_types.includes(payments[0]?.payment_type)
      ) {
        for (let payment of payments) {
          if (
            payment.payment_type === 'Full' ||
            payment.payment_type === 'Part' ||
            payment.payment_type === 'Pay Less - Full' ||
            payment.payment_type === 'Pay Less - Part'
          ) {
            const retentionDetails = await this.subPaymentsRepo
              .createQueryBuilder('sp')
              .select([
                'sp.payment_id AS payment_id',
                'sp.amount as retention_amount',
              ])
              .where(
                `sp.sub_payment_type IN ('Retention', 'Retention In') and sp.payment_id = :payment_id`,
                {
                  payment_id: payment.payment_id,
                },
              )
              .getRawOne();

            this.logger.log(`retentionDetails: ${JSON.stringify(retentionDetails)}`);

            totalRetentionAmount += retentionDetails
              ? parseFloat(retentionDetails?.retention_amount)
              : 0;
            existingTotalAmount += parseFloat(payment.total_amount);
          }
        }
        outstanding_amount = payless_payments.length
          ? payless_payments[0].payless_amount - existingTotalAmount
          : paymentClaimDetails.claim_amount - existingTotalAmount;
        outstanding_retention_amount =
          paymentClaimDetails?.retention_amount_with_gst - totalRetentionAmount;

        if (outstanding_amount < 0) outstanding_amount = 0;
      } else {
        outstanding_amount = paymentClaimDetails.claim_amount;
        outstanding_retention_amount =
          paymentClaimDetails?.retention_amount_with_gst;
      }

      const fetchedInvoiceDetails = payment_claim_id
        ? await this.paymentClaimInvoicesRepo
          .createQueryBuilder('i')
          .select([
            'i.description AS description',
            'i.quantity AS quantity',
            'i.unit_price AS unit_price',
            'i.gst AS gst',
            'i.total_amount_including_gst AS total_amount_including_gst',
            'i.payment_claim_id AS payment_claim_id',
          ])
          .where('i.payment_claim_id = :payment_claim_id', {
            payment_claim_id: payment_claim_id,
          })
          .getRawMany()
        : null;

      if (!fetchedInvoiceDetails || !fetchedInvoiceDetails.length)
        throw `Invoice details not found for the provided payment claim details. Please provide a valid one.`;

      const subTotalSummaries = [];
      const gsts = [];
      await fetchedInvoiceDetails.map((invoice) => {
        subTotalSummaries.push(invoice.quantity * invoice.unit_price);
        gsts.push(+invoice.gst);
      });
      gst_summary = { gst_summary: gsts.reduce((acc, curr) => acc + curr, 0) };

      for (const element of fetchedInvoiceDetails) {
        element.formatted_unit_price = element.unit_price
          ? formatCurrencyWithoutDollars(element.unit_price)
          : '';
        element.formatted_gst = element.gst
          ? formatCurrencyWithoutDollars(element.gst)
          : '';
        element.formatted_total_amount_including_gst =
          element.total_amount_including_gst
            ? formatCurrencyWithoutDollars(element.total_amount_including_gst)
            : '';
      }
      const payment_id = data.import_id
        ? (await this.paymentsRepo.findOne({ where: { id: data.import_id } }))
          .payment_id
        : null;
      // console.log'payment_id', payment_id);
      const fetchDetailsOfAPayment = payment_id
        ? await this.fetchDetailsOfAPayment({ payment_id })
        : null;
      // console.log'fetchDetailsOfAPayment', fetchDetailsOfAPayment);

      const paymentDetailsForImport = fetchDetailsOfAPayment
        ? {
          payment_type: fetchDetailsOfAPayment.payment_type ?? null,
          client_supplier_type:
            fetchDetailsOfAPayment.client_supplier_type ?? null,
          cash_retention: fetchDetailsOfAPayment.cash_retention ?? null,
          retention_release_date:
            fetchDetailsOfAPayment.retention_release_date ?? null,
          payment_amount: fetchDetailsOfAPayment.payment_amount ?? null,
          payless_amount: fetchDetailsOfAPayment.payless_amount ?? null,
          total_amount: fetchDetailsOfAPayment.total_amount ?? null,
          payment_date: fetchDetailsOfAPayment.payment_date ?? null,
          beneficiary_type: fetchDetailsOfAPayment.beneficiary_type ?? null,
          claim_retention_amount:
            fetchDetailsOfAPayment.claim_retention_amount ?? null,
        }
        : null;
      // console.log'paymentDetailsForImport', paymentDetailsForImport);

      const uiStatusDetails =
        await this.statusService.getUiStatusAndActionButtonsForClaims({
          payment_claim_id: payment_claim_id,
          payment_type: payment_type
            ? payment_type
            : paymentDetailsForImport.payment_type,
        });

      const statusDetails = {
        status_in_ui: uiStatusDetails?.status_in_ui,
        payment_overview_buttons: uiStatusDetails?.payment_overview_buttons,
      };

      delete paymentClaimDetails.payment_from_account;
      delete paymentClaimDetails.payment_to_account;
      paymentClaimDetails.cash_retention = fetchDetailsOfAPayment
        ? fetchDetailsOfAPayment.cash_retention
        : paymentClaimDetails.retention_type == 'Cash' ||
          paymentClaimDetails.has_claim_retention
          ? true
          : false;
      paymentClaimDetails.retention_amount = fetchDetailsOfAPayment
        ? fetchDetailsOfAPayment.retention_amount
        : paymentClaimDetails.retention_amount;
      paymentClaimDetails.claim_retention_amount = fetchDetailsOfAPayment
        ? fetchDetailsOfAPayment.claim_retention_amount
        : paymentClaimDetails.retention_amount;
      const fetchedAllAutoPopulatableFields = {
        ...gst_summary,
        ...paymentClaimDetails,
        ...fetchedPaymentFromAccountDetails,
        ...fetchedPaymentToAccountDetails,
        ...{ outstanding_amount, outstanding_retention_amount },
        ...{
          payless_amount: payless_payments.length
            ? payless_payments[0].payless_amount
            : null,
        },
        ...statusDetails,
        ...paymentDetailsForImport,
        ...{ invoices: fetchedInvoiceDetails },
      };
      // console.log(
      //   'fetchedAllAutoPopulatableFields1',
      //   fetchedAllAutoPopulatableFields,
      // );
      // console.log'paymentClaimDetails', paymentClaimDetails);

      //Insert formatted amounts.
      fetchedAllAutoPopulatableFields.formatted_claim_amount =
        paymentClaimDetails.claim_amount
          ? formatCurrencyWithoutDollars(paymentClaimDetails.claim_amount)
          : '';
      fetchedAllAutoPopulatableFields.formatted_gst_summary =
        fetchedAllAutoPopulatableFields.gst_summary
          ? formatCurrencyWithoutDollars(
            fetchedAllAutoPopulatableFields.gst_summary,
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_outstanding_amount =
        fetchedAllAutoPopulatableFields.outstanding_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllAutoPopulatableFields.outstanding_amount,
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_outstanding_retention_amount =
        fetchedAllAutoPopulatableFields.outstanding_retention_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllAutoPopulatableFields.outstanding_retention_amount,
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_payless_amount =
        fetchedAllAutoPopulatableFields.payless_amount
          ? formatCurrencyWithoutDollars(
            fetchedAllAutoPopulatableFields.payless_amount,
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_payment_amount =
        fetchedAllAutoPopulatableFields.payment_amount
          ? formatCurrencyWithoutDollars(
            Math.abs(fetchedAllAutoPopulatableFields.payment_amount),
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_retention_amount =
        fetchedAllAutoPopulatableFields.retention_amount
          ? formatCurrencyWithoutDollars(
            Math.abs(fetchedAllAutoPopulatableFields.retention_amount),
          )
          : '';

      fetchedAllAutoPopulatableFields.formatted_retention_amount_with_gst =
        fetchedAllAutoPopulatableFields.retention_amount_with_gst
          ? formatCurrencyWithoutDollars(
            Math.abs(
              fetchedAllAutoPopulatableFields.retention_amount_with_gst,
            ),
          )
          : '';
      fetchedAllAutoPopulatableFields.formatted_claim_retention_amount =
        fetchedAllAutoPopulatableFields.claim_retention_amount
          ? formatCurrencyWithoutDollars(
            Math.abs(fetchedAllAutoPopulatableFields.claim_retention_amount),
          )
          : '';
      fetchedAllAutoPopulatableFields.claim_memo =
        fetchedAllAutoPopulatableFields.claim_memo == null ||
          fetchedAllAutoPopulatableFields.claim_memo == 'null'
          ? ''
          : fetchedAllAutoPopulatableFields.claim_memo;
      // console.log(
      //   'fetchedAllAutoPopulatableFields2',
      //   fetchedAllAutoPopulatableFields,
      // );

      this.logger.log(
        `Auto populatable fields while adding a payment has been fetched successfully with data: ${JSON.stringify(fetchedAllAutoPopulatableFields)}.`,
      );

      return framedResponse(
        'SUCCESS',
        `Auto populatable fields while adding a payment has been fetched successfully.`,
        fetchedAllAutoPopulatableFields,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getListOfAllPaymentsToDoInDashboard(
    data: GetListOfAllPaymentsToDoInDashboardInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting list of all payments to do in dashboard with data: ${JSON.stringify(data)}`,
      );

      const { company_id } = data;
      const pendingStatuses = [
        'Unconfirmed - Unmatched',
        'Unconfirmed - Matched',
        'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
        'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
        'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
        'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
        'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched',
        'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched',
      ];

      const results = await this.paymentsRepo
        .createQueryBuilder('pd')
        .select([
          'pd.payment_id AS payment_id',
          'pd.project_id AS project_id',
          'pd.total_amount AS payment_amount',
          'pd.contract_id AS contract_id',
          'p.project_name AS project_name',
          'c.contract_name AS contract_name',
          'pc.payment_claim_id AS payment_claim_id',
          'pc.due_date AS due_date',
        ])
        .innerJoin(ProjectDetails, 'p', 'p.project_id = pd.project_id')
        .innerJoin(ContractDetails, 'c', 'c.contract_id = pd.contract_id')
        .innerJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = pd.payment_claim_id',
        )
        .where('pd.company_id = :company_id', { company_id })
        .andWhere('pd.current_status IN (:...pendingStatuses)', {
          pendingStatuses,
        })
        .getRawMany();
      // console.log'results', results);

      results.forEach(
        (result) =>
        (result.formatted_payment_amount = formatCurrencyWithoutDollars(
          result.payment_amount,
        )),
      );
      // console.log'finalResults', results);

      return framedResponse(
        'SUCCESS',
        'List of all pending payments successfully fetched.',
        results,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting list of all payments to do in dashboard with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getListOfAllpayments(
    getListOfpaymentsInput: ListAllPaymentsInput,
    timezone,
  ) {
    const company_id = getListOfpaymentsInput.company_id;

    const queryBuilder = await this.paymentsRepo
      .createQueryBuilder('payments')
      .addSelect('payments.id AS id')
      .addSelect('payments.payment_id AS payment_id')
      .addSelect('payments.payment_type', 'payment_type')
      .addSelect('payments.current_status', 'status')
      .addSelect('payments.list_status', 'list_status')
      .addSelect('payments.payment_claim_id', 'payment_claim_id')
      .addSelect('payments.project_id', 'project_id')
      .addSelect('payments.contract_id', 'contract_id')
      .addSelect('payments.client_supplier_id', 'client_supplier_id')
      .addSelect('payments.cash_retention', 'cash_retention')
      .addSelect('payments.payment_from_account', 'payment_from_account')
      .addSelect('payments.payment_to_account', 'payment_to_account')
      .addSelect('payments.retention_account', 'retention_account')
      .addSelect('payments.retention_release_date', 'retention_release_date')
      .addSelect('payments.total_amount', 'total_amount')
      .addSelect('payments.payless_amount', 'payless_amount')
      .addSelect('payments.payment_date', 'payment_date')
      .addSelect('payments.input_date', 'input_date')
      .addSelect('payments.payment_list_buttons', 'payment_list_buttons')
      .addSelect('payments.associated_payment_id', 'associated_payment_id')
      .addSelect(
        'payments.associated_overpayment_id',
        'associated_overpayment_id',
      )
      //other table joins
      .innerJoin('payments.companyDetails', 'company')
      .addSelect('company.company_name', 'company_name')
      .leftJoin('payments.projectDetails', 'project')
      .addSelect('project.project_name', 'project_name')
      .addSelect('project.project_date', 'project_date')
      .leftJoin('payments.contractDetails', 'contract')
      .leftJoin('contract.contractPaymentFromAccount', 'cpf')
      .leftJoin('contract.contractPaymentToAccount', 'cpt')
      .leftJoin('contract.contractRetentionFromAccount', 'crf')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('contract.contract_type', 'contract_type')
      .addSelect('contract.contract_date', 'contract_date')
      .leftJoin('payments.clientSupplierDetails', 'clientSupplier')
      .addSelect('clientSupplier.client_supplier_name', 'client_supplier_name')
      .addSelect('clientSupplier.client_supplier_type', 'client_supplier_type')
      .leftJoin('payments.paymentFromAccount', 'fromAccount')
      .addSelect('fromAccount.account_name', 'payment_from_account_name')
      .leftJoin('payments.paymentToAccount', 'toAccount')
      .addSelect('toAccount.account_name', 'payment_to_account_name')
      .addSelect('toAccount.bsb_number', 'payment_to_account_bsb_number')
      .addSelect('toAccount.account_number', 'payment_to_account_number')
      .leftJoin('payments.retentionAccount', 'retentionAcc')
      .addSelect('retentionAcc.account_name', 'retention_account_name')
      .addSelect('retentionAcc.account_number', 'retention_account_number')
      .leftJoin('payments.paymentClaims', 'pc')
      .addSelect('pc.claim_type AS claim_type')
      .addSelect('pc.claim_amount AS claim_amount')
      .addSelect('pc.cash_retention_type AS cash_retention_type')
      .addSelect('pc.due_date AS due_date')
      .leftJoin(
        'payments.subPayments',
        'payment',
        `payment.sub_payment_type = 'Payment'`,
      )
      .addSelect('payment.amount AS payment_amount')
      .addSelect('payment.is_paid_confirmed', 'is_paid_confirmed')
      .addSelect('payment.is_received_confirmed', 'is_received_confirmed')
      .leftJoin(
        'payments.subPayments',
        'retention',
        `retention.sub_payment_type IN ('Retention', 'Retention Out')`,
      )
      .addSelect('retention.amount AS retention_amount')
      .addSelect('retention.is_retention_confirmed', 'is_retention_confirmed')
      .where(`payments.company_id = :companyId`, {
        companyId: company_id,
      });

    if (getListOfpaymentsInput.project_id) {
      queryBuilder.andWhere('payments.project_id = :project_id', {
        project_id: getListOfpaymentsInput.project_id,
      });
    }

    if (getListOfpaymentsInput.contract_id) {
      queryBuilder.andWhere('payments.contract_id = :contract_id', {
        contract_id: getListOfpaymentsInput.contract_id,
      });
    }

    if (getListOfpaymentsInput.claim_id) {
      queryBuilder.andWhere('payments.payment_claim_id = :claim_id', {
        claim_id: getListOfpaymentsInput.claim_id,
      });
    }

    if (getListOfpaymentsInput.payment_id) {
      queryBuilder.andWhere('payments.associated_payment_id = :payment_id', {
        payment_id: getListOfpaymentsInput.payment_id,
      });
    }

    if (getListOfpaymentsInput.bank_account_id) {
      queryBuilder.andWhere(
        `
        (payments.payment_from_account = :bank_account_id OR 
        payments.payment_to_account = :bank_account_id OR
        payments.retention_account = :bank_account_id)
      `,
        { bank_account_id: getListOfpaymentsInput.bank_account_id },
      );
    }

    if (getListOfpaymentsInput.client_supplier_id) {
      queryBuilder.andWhere(
        'payments.client_supplier_id = :client_supplier_id',
        {
          client_supplier_id: getListOfpaymentsInput.client_supplier_id,
        },
      );
    }

    if (getListOfpaymentsInput.claim_type) {
      queryBuilder.andWhere(
        'pc.claim_type = :claim_type AND payments.associated_payment_id IS NULL',
        {
          claim_type: getListOfpaymentsInput.claim_type,
        },
      );
    }

    if (getListOfpaymentsInput.search) {
      queryBuilder.andWhere(
        `(
         CAST(payments.payment_id AS TEXT) ILIKE :keyword OR  
         CAST(payments.payment_type AS TEXT) ILIKE :keyword OR 
         CAST(payments.cash_retention AS TEXT) ILIKE :keyword OR 
         CAST(payments.current_status AS TEXT) ILIKE :keyword OR 
         CAST(payments.list_status AS TEXT) ILIKE :keyword OR 
         CAST(payments.payless_amount AS TEXT) ILIKE :keyword OR 
         CAST(payments.total_amount AS TEXT) ILIKE :keyword OR 
         TO_CHAR(payments.payment_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         TO_CHAR(payments.retention_release_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         CAST(payments.memo AS TEXT) ILIKE :keyword OR 
         CAST(payments.third_party_payment_reason AS TEXT) ILIKE :keyword OR 
         CAST(payments.withhold_payment_reason AS TEXT) ILIKE :keyword OR 
         CAST(payments.payment_claim_id AS TEXT) ILIKE :keyword OR 
         CAST(pc.company_id AS TEXT) ILIKE :keyword OR 
         CAST(pc.claim_type AS TEXT) ILIKE :keyword OR 
         CAST(pc.cash_retention_type AS TEXT) ILIKE :keyword OR 
         CAST(pc.status AS TEXT) ILIKE :keyword OR 
         CAST(pc.list_status AS TEXT) ILIKE :keyword OR 
         CAST(pc.project_id AS TEXT) ILIKE :keyword OR 
         CAST(pc.contract_id AS TEXT) ILIKE :keyword OR 
         CAST(pc.client_supplier_id AS TEXT) ILIKE :keyword OR 
         TO_CHAR(pc.due_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         TO_CHAR(pc.sent_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         TO_CHAR(pc.received_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         CAST(pc.claim_reference AS TEXT) ILIKE :keyword OR 
         CAST(pc.claim_amount AS TEXT) ILIKE :keyword OR 
         CAST(pc.memo AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.client_supplier_name AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.business_name AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.client_supplier_type AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.client_supplier_status AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.related_entity AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.entity_type AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.client_supplier_address AS TEXT) ILIKE :keyword OR 
         CAST(clientSupplier.payment_terms AS TEXT) ILIKE :keyword OR 
         CAST(project.project_name AS TEXT) ILIKE :keyword OR 
         CAST(project.project_role AS TEXT) ILIKE :keyword OR 
         TO_CHAR(project.project_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         CAST(project.project_description AS TEXT) ILIKE :keyword OR 
         CAST(project.site_address AS TEXT) ILIKE :keyword OR 
         CAST(project.head_contract_sum AS TEXT) ILIKE :keyword OR 
         CAST(project.retention_type AS TEXT) ILIKE :keyword OR 
         CAST(project.number_of_units AS TEXT) ILIKE :keyword OR 
         CAST(project.pta_eligibility AS TEXT) ILIKE :keyword OR 
         CAST(project.rta_eligibility AS TEXT) ILIKE :keyword OR 
         CAST(project.pta_compliance AS TEXT) ILIKE :keyword OR 
         CAST(project.rta_compliance AS TEXT) ILIKE :keyword OR 
         CAST(project.project_status AS TEXT) ILIKE :keyword OR 
         CAST(contract.contract_name AS TEXT) ILIKE :keyword OR 
         CAST(contract.client_supplier_role AS TEXT) ILIKE :keyword OR 
         CAST(contract.contract_type AS TEXT) ILIKE :keyword OR 
         CAST(contract.contract_status AS TEXT) ILIKE :keyword OR 
         TO_CHAR(contract.contract_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         CAST(contract.payment_terms AS TEXT) ILIKE :keyword OR 
         CAST(contract.initial_contract_sum AS TEXT) ILIKE :keyword OR 
         TO_CHAR(contract.contract_start_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         TO_CHAR(contract.defect_liability_end_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
         CAST(contract.payment_from_account AS TEXT) ILIKE :keyword OR 
         CAST(contract.retention_from_account AS TEXT) ILIKE :keyword OR 
         CAST(contract.payment_to_account AS TEXT) ILIKE :keyword OR 
         CAST(cpf.account_name AS TEXT) ILIKE :keyword OR 
         CAST(cpf.account_type AS TEXT) ILIKE :keyword OR 
         CAST(cpf.account_number AS TEXT) ILIKE :keyword OR 
         CAST(cpf.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(cpf.apca_number AS TEXT) ILIKE :keyword OR 
         CAST(cpt.account_name AS TEXT) ILIKE :keyword OR 
         CAST(cpt.account_type AS TEXT) ILIKE :keyword OR 
         CAST(cpt.account_number AS TEXT) ILIKE :keyword OR 
         CAST(cpt.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(cpt.apca_number AS TEXT) ILIKE :keyword OR 
         CAST(crf.account_name AS TEXT) ILIKE :keyword OR 
         CAST(crf.account_type AS TEXT) ILIKE :keyword OR 
         CAST(crf.account_number AS TEXT) ILIKE :keyword OR 
         CAST(crf.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(crf.apca_number AS TEXT) ILIKE :keyword OR 
          CAST(fromAccount.account_name AS TEXT) ILIKE :keyword OR 
         CAST(fromAccount.account_type AS TEXT) ILIKE :keyword OR 
         CAST(fromAccount.account_number AS TEXT) ILIKE :keyword OR 
         CAST(fromAccount.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(fromAccount.apca_number AS TEXT) ILIKE :keyword OR 
          CAST(toAccount.account_name AS TEXT) ILIKE :keyword OR 
         CAST(toAccount.account_type AS TEXT) ILIKE :keyword OR 
         CAST(toAccount.account_number AS TEXT) ILIKE :keyword OR 
         CAST(toAccount.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(toAccount.apca_number AS TEXT) ILIKE :keyword OR 
          CAST(retentionAcc.account_name AS TEXT) ILIKE :keyword OR 
         CAST(retentionAcc.account_type AS TEXT) ILIKE :keyword OR 
         CAST(retentionAcc.account_number AS TEXT) ILIKE :keyword OR 
         CAST(retentionAcc.bsb_number AS TEXT) ILIKE :keyword OR 
         CAST(retentionAcc.apca_number AS TEXT) ILIKE :keyword OR 
         EXISTS (SELECT 1 FROM payment_claim_invoices pci WHERE pci.payment_claim_id = pc.payment_claim_id AND (
            CAST(pci.description AS TEXT) ILIKE :keyword OR  
            CAST(pci.quantity AS TEXT) ILIKE :keyword OR 
            CAST(pci.unit_price AS TEXT) ILIKE :keyword OR 
            CAST(pci.gst AS TEXT) ILIKE :keyword OR 
            CAST(pci.total_amount_including_gst AS TEXT) ILIKE :keyword  
            )) OR 
          EXISTS (SELECT 1 FROM journal_entries je left join journal_type jt on je.journal_process_id = jt.process_id WHERE je.audit_id = payments.payment_id AND (
          CAST(je.journal_number AS TEXT) ILIKE :keyword OR  
          CAST('#' || je.journal_number AS TEXT) ILIKE :keyword OR 
          CAST(je.audit_id AS TEXT) ILIKE :keyword OR 
          CAST(je.journal_description AS TEXT) ILIKE :keyword OR 
          CAST(je.dynamic_values AS TEXT) ILIKE :keyword OR 
          CAST(je.transaction_account_id AS TEXT) ILIKE :keyword OR 
          CAST(je.debit_amount AS TEXT) ILIKE :keyword OR 
          CAST(je.credit_amount AS TEXT) ILIKE :keyword OR 
          TO_CHAR(je.journal_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
          CAST(je.journal_process_id AS TEXT) ILIKE :keyword OR 
          CAST(je.entry_type AS TEXT) ILIKE :keyword OR 
          CAST(jt.process_type AS TEXT) ILIKE :keyword OR 
          CAST(jt.process_name AS TEXT) ILIKE :keyword OR 
          CAST(jt.process_description AS TEXT) ILIKE :keyword
          )))`,
        {
          keyword: `%${getListOfpaymentsInput.search}%`,
          tz: timezone,
        },
      );
    }

    if (getListOfpaymentsInput.cash_retention_type) {
      queryBuilder.andWhere('pc.cash_retention_type = :cash_retention_type', {
        cash_retention_type: getListOfpaymentsInput.cash_retention_type,
      });
    }

    if (getListOfpaymentsInput.payment_type) {
      if (getListOfpaymentsInput.payment_type == 'All') {
        const allPayments = [
          'Full',
          'Part',
          'Pay Less - Full',
          'Pay Less - Part',
          'Pay - Zero',
          '3rd Party',
        ];
        queryBuilder.andWhere('payments.payment_type IN(:...allPayments)', {
          allPayments: allPayments,
        });
      } else if (getListOfpaymentsInput.payment_type == 'Other') {
        const otherPayments = [
          'Interest Received',
          'Bank Charge Applied',
          'Bank Charge Top Up',
          'Interest Withdrawal',
          'Top Up',
          'Top Up Retention',
          'Overpayment refund from supplier',
          'Overpayment refund to client',
          'Overpayment to supplier',
          'Underpayment to supplier',
          'Overpayment from client',
          'Underpayment from client',
          'Withdrawal',
        ];
        queryBuilder.andWhere('payments.payment_type IN(:...otherPayments)', {
          otherPayments: otherPayments,
        });
      } else if (getListOfpaymentsInput.payment_type == 'Overpayment') {
        const overPayments = [
          'Overpayment to supplier',
          'Overpayment from client',
        ];
        queryBuilder.andWhere(
          `payments.payment_type IN(:...overpayments) AND payments.current_status IN ('Unconfirmed - Matched', 'Paid - Matched', 'Received - Matched', 'Paid - Unmatched', 'Received - Unmatched')`,
          {
            overpayments: overPayments,
          },
        );
      } else {
        queryBuilder.andWhere('payments.payment_type = :payment_type', {
          payment_type: getListOfpaymentsInput.payment_type,
        });
      }
    }

    if (getListOfpaymentsInput.status) {
      queryBuilder.andWhere('payments.list_status = :status', {
        status: getListOfpaymentsInput.status,
      });
    } else {
      queryBuilder.andWhere('payments.list_status != :deleteStatus', {
        deleteStatus: 'Void',
      });
    }

    if (getListOfpaymentsInput.is_paid_confirmed !== undefined) {
      queryBuilder.andWhere('payment.is_paid_confirmed = :is_paid', {
        is_paid: getListOfpaymentsInput.is_paid_confirmed,
      });
    }

    if (getListOfpaymentsInput.keyword) {
      queryBuilder.andWhere(
        `(LOWER(CAST(payments.payment_type AS text)) LIKE :keyword)`,
        { keyword: `%${getListOfpaymentsInput.keyword.toLowerCase()}%` },
      );
    }

    if (getListOfpaymentsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getListOfpaymentsInput.date_filter === 'Custom' &&
        getListOfpaymentsInput.start_date &&
        getListOfpaymentsInput.end_date
      ) {
        startDate = moment(getListOfpaymentsInput.start_date)
          .startOf('day')
          .toDate();
        endDate = moment(getListOfpaymentsInput.end_date).endOf('day').toDate();
      } else if (getListOfpaymentsInput.date_filter === 'This Month') {
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
      } else if (getListOfpaymentsInput.date_filter === 'Last Month') {
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
      }
      queryBuilder.andWhere(
        'payments.payment_date::date BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getListOfpaymentsInput.sorting_order
      ? getListOfpaymentsInput.sorting_order
      : 'DESC';
    if (!getListOfpaymentsInput.sorting_field) {
      queryBuilder.orderBy({ 'payments.created_on': sorting_order });
      if (
        getListOfpaymentsInput.page_number &&
        getListOfpaymentsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getListOfpaymentsInput.page_number - 1) *
            getListOfpaymentsInput.page_size,
          )
          .limit(getListOfpaymentsInput.page_size);
      }
    }
    if (getListOfpaymentsInput.sorting_field) {
      switch (getListOfpaymentsInput.sorting_field) {
        case 'project_name':
          {
            queryBuilder.orderBy({
              'LOWER(project.project_name)': sorting_order,
            });
          }
          break;
        case 'payment_type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(payments.payment_type AS text))': sorting_order,
            });
          }
          break;
        case 'contract_name':
          {
            queryBuilder.orderBy({
              'LOWER(contract.contract_name)': sorting_order,
            });
          }
          break;
        case 'payment_from_account_name':
          {
            queryBuilder.orderBy({
              'LOWER(fromAccount.account_name)': sorting_order,
            });
          }
          break;
        case 'payment_to_account_name':
          {
            queryBuilder.orderBy({
              'LOWER(toAccount.account_name)': sorting_order,
            });
          }
          break;
        case 'payment_amount':
          {
            queryBuilder.orderBy({ 'ABS(payment.amount)': sorting_order });
          }
          break;
        case 'list_status':
          {
            queryBuilder.orderBy({ 'payments.list_status': sorting_order });
          }
          break;
        case 'payment_date':
          {
            queryBuilder.orderBy({ 'payments.payment_date': sorting_order });
          }
          break;
      }
      if (
        getListOfpaymentsInput.page_number &&
        getListOfpaymentsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getListOfpaymentsInput.page_number - 1) *
            getListOfpaymentsInput.page_size,
          )
          .limit(getListOfpaymentsInput.page_size);
      }
    }

    const [results, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    // console.log'rawResults: ', results);
    const rawResults = Array.from(
      new Map(results.map((result) => [result.id, result])).values(),
    );

    //Change payment_from_account details based upon the cash_retention_type.
    for (const payment of rawResults) {
      if (
        payment.cash_retention_type == 'Retention claim' &&
        payment.claim_type == 'Billable'
      ) {
        const bankAccountDetailsFromContract = await this.bankAccountsRepo
          .createQueryBuilder('ba')
          .select([
            'ba.bank_account_id AS payment_from_account',
            'ba.account_name AS payment_from_account_name',
          ])
          .where('ba.bank_account_id = :bank_account_id', {
            bank_account_id: payment.payment_from_account,
          })
          .getRawOne();

        payment.payment_from_account =
          bankAccountDetailsFromContract.payment_from_account;
        payment.payment_from_account_name =
          bankAccountDetailsFromContract.payment_from_account_name;

        //Formatted currency results.
        payment.formatted_claim_amount = formatCurrencyWithoutDollars(
          payment.claim_amount,
        );
        payment.formatted_retention_amount = formatCurrencyWithoutDollars(
          payment.retention_amount,
        );
        payment.formatted_payment_amount = formatCurrencyWithoutDollars(
          payment.payment_amount,
        );
        payment.formatted_total_amount = formatCurrencyWithoutDollars(
          payment.total_amount,
        );
        payment.formatted_payless_amount = formatCurrencyWithoutDollars(
          payment.payless_amount,
        );
      }
    }

    return { total_count, payments: rawResults };
  }

  async generateAbaFile(
    paymentList: FetchDetailsOfSubPayment[],
    mark_paid: string,
    decoded: any,
    company_id?: number,
  ) {
    this.logger.log(`[ABA] generateAbaFile called with mark_paid="${mark_paid}", ${paymentList?.length || 0} payments`);
    let payments_to_send_notice = [];
    const formatField = (
      value: string | null | undefined,
      length: number,
      padRight = false,
    ) => {
      const safeValue = value ? value.toString().trim() : ''; // Ensure a string
      return padRight
        ? safeValue.padEnd(length, ' ')
        : safeValue.padStart(length, '0').slice(-length);
    };

    const formatBSB = (bsb: string | null | undefined): string => {
      const safeBSB = bsb ? bsb.toString().trim() : ''; // Ensure a string
      const paddedBSB = safeBSB.padStart(6, '0'); // Pad to ensure at least 6 digits
      return `${paddedBSB.slice(0, 3)}-${paddedBSB.slice(3, 6)}`; // Format as XXX-XXX
      // return paddedBSB;
    };

    try {
      //grouping the transactions from each 'from-accounts'
      const groupedTransactions: {
        [key: string]: { transactions: any[]; FI_id: string };
      } = {};

      for (const tx of paymentList) {
        if (!tx.payment_from_account_number) {
          this.logger.warn(
            `Skipping transaction for ${tx.payment_type} (Sender account details not found)`,
          );
          continue;
        } else if (!tx.payment_to_account_bsb_number) {
          this.logger.warn(
            `Skipping transaction for ${tx.payment_type} (Reciever bsb details not found)`,
          );
          continue;
        }

        const fromAccount = tx.payment_from_account_number;
        const from_account_FI = tx.payment_from_account_fin_ins
          ? await this.financialInsRepo.findOne({
            where: { id: tx.payment_from_account_fin_ins },
          })
          : null;
        const from_account_FI_id = from_account_FI
          ? from_account_FI.institution_code
          : 'NIL';

        if (!groupedTransactions[fromAccount]) {
          groupedTransactions[fromAccount] = {
            transactions: [],
            FI_id: from_account_FI_id,
          };
        }
        groupedTransactions[fromAccount].transactions.push(tx);
      }

      //separate aba files for each txn groups
      for (const fromAccount in groupedTransactions) {
        const accountDetails = fromAccount
          ? await this.bankAccountsRepo.findOne({
            where: { account_number: fromAccount },
            select: [
              'account_name',
              'apca_number',
              'bank_account_id',
              'company_id',
            ],
          })
          : null;

        this.logger.log(`accountDetails: ${JSON.stringify(accountDetails)}`);

        if (accountDetails.apca_number) {
          // Always generate the ABA file - the mark_paid flag only determines if payments get marked as paid
          const { transactions, FI_id } = groupedTransactions[fromAccount];

            let abaFileContent = '';

            const fromTxnDetails = {
              apcaId: accountDetails.apca_number,
              userName: transactions[0].payment_from_account_name.substring(
                0,
                26,
              ), // Max 26 chars
              lodgmentReference: `Payments from-${fromAccount}`.substring(
                0,
                12,
              ), // Custom reference
              traceBsb: formatBSB(
                transactions[0].payment_from_account_bsb_number,
              ), // Placeholder, adjust per account
              traceAccount: fromAccount, // The current sending account
              remitterName: transactions[0].payment_from_account_name.substring(
                0,
                16,
              ), // Max 16 chars
            };

            // Header Record (Type 0)
            abaFileContent +=
              `0` + // Record type
              ' '.repeat(17) +
              `01` + // Service class
              formatField(FI_id, 3, true) +
              ' '.repeat(7) +
              formatField(fromTxnDetails.userName, 26, true) + // User name, padded to 26 characters
              formatField(
                fromTxnDetails.apcaId
                  ? fromTxnDetails.apcaId.toString().padEnd(6, ' ')
                  : '      ',
                6,
              ) + // APCA ID or blank spaces
              formatField(
                fromTxnDetails.lodgmentReference.trim().padEnd(12, ' '),
                12,
                true,
              ) + // Lodgment reference, padded to 12 characters
              formatField(
                new Date().toISOString().slice(8, 10) + // Day (DD)
                new Date().toISOString().slice(5, 7) + // Month (MM)
                new Date().toISOString().slice(2, 4), // Year (YY)
                6,
              ) + // Date in DDMMYY format
              ' '.repeat(40); // 40 spaces for unused space

            abaFileContent = abaFileContent.padEnd(120, ' ') + '\n';

            let totalAmount = 0;
            let transactionCount = 0;

            // Transaction Records (Type 1)
            transactions.forEach((tx) => {
              const absoluteAmount = Math.abs(Math.round(tx.amount * 100)); // Convert to cents

              let transactionLine =
                `1` +
                formatBSB(tx.payment_to_account_bsb_number) +
                formatField(tx.payment_to_account_number, 9) + // Ensure 9 characters
                ' ' +
                (tx.amount >= 0 ? '50' : '13') + // 50 for Credit, 13 for Debit
                formatField(absoluteAmount.toString(), 10) + // Ensure 10 characters, padded with leading zeros
                formatField(tx.payment_to_account_name, 28, true) + // Ensure up to 28 characters
                formatField(tx.payment_type, 22, true) + // Ensure up to 18 characters
                fromTxnDetails.traceBsb +
                formatField(fromTxnDetails.traceAccount, 9) + // Ensure 9 characters
                formatField(fromTxnDetails.remitterName, 8, true) + // Ensure up to 12 characters
                `00000000`; // Withholding

              abaFileContent += transactionLine.padEnd(120, ' ') + '\n';

              totalAmount += Math.abs(tx.amount);
              transactionCount++;
            });

            const absoluteTotalAmount = Math.abs(Math.round(totalAmount * 100)); // Convert to cents

            const aboo = 0;

            let footerLine =
              `7` +
              '999-999' +
              ' '.repeat(12) +
              formatField(absoluteTotalAmount.toString(), 10) +
              formatField(aboo.toString(), 10) +
              formatField(absoluteTotalAmount.toString(), 10) +
              '                    ' +
              formatField(transactionCount.toString(), 6) +
              ' '.repeat(28);
            abaFileContent += footerLine.padEnd(120, ' ') + '\n';

            const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
            const outputFolderName = 'generated_aba_files';
            const outputFileName = `${transactions[0].payment_from_account_number}-${transactions[0].payment_from_account_name.replace(/\s+/g, '_')}-${timestamp}.aba`;

            const outputFilePath = `${outputFolderName}/${outputFileName}`;

            // Upload ABA file to Object Storage
            const fileBuffer = Buffer.from(abaFileContent, 'utf8');
            const uploadSuccess = await this.objectStorageService.uploadFileDirect(
              outputFilePath,
              fileBuffer,
            );

            if (!uploadSuccess) {
              this.logger.error(`Failed to upload ABA file to Object Storage: ${outputFilePath}`);
              throw new Error('Failed to upload ABA file to storage');
            }

            this.logger.log(`ABA file uploaded successfully to Object Storage: ${outputFilePath}`);

            const createFileUploadInput: Partial<CreateFileUploadInput> = {
              bank_account_id: transactions[0].bank_account_id,
              file_path: outputFilePath,
              file_name: outputFileName,
              file_type: 'text/plain',
              attachment_type: 'Aba_file_upload',
            };

            const fileData = await this.fileUploadService.saveFile(
              decoded,
              createFileUploadInput as CreateFileUploadInput,
            );

            if (fileData?.id) {
              const createABAFileHistoryInput =
                await this.generateABAFileHistory.create({
                  aba_file_id: fileData?.id,
                  company_id: company_id,
                  created_by: decoded?.userId,
                  bank_account_id: Number(accountDetails?.bank_account_id),
                  generated_by: decoded?.userId,
                  mark_paid:
                    String(mark_paid ? mark_paid : '').toLowerCase() === 'yes'
                      ? true
                      : false,
                });

              const savedABAFileHistory =
                await this.generateABAFileHistory.save(
                  createABAFileHistoryInput,
                );
            }

            if (String(mark_paid ? mark_paid : '').toLowerCase() === 'yes') {
              this.logger.log(`[ABA] Marking ${transactions.length} transactions as paid...`);
              let processedCount = 0;
              for (const tx of transactions) {
                processedCount++;
                try {
                  if (
                    tx.sub_payment_type === 'Payment' &&
                    ((tx.claim_type === 'Billable' &&
                      [
                        'Full',
                        'Part',
                        'Pay Less - Full',
                        'Pay Less - Part',
                      ].includes(tx.payment_type)) ||
                      [
                        'Interest Withdrawal',
                        'Bank Charge Applied',
                        'Withdrawal',
                        'Overpayment to supplier',
                        'Underpayment to supplier',
                      ].includes(tx.payment_type))
                  ) {
                    this.logger.log(`[ABA] Processing payment ${processedCount}/${transactions.length}: payment_id=${tx.payment_id}`);
                    const mark_paid_payment = {
                      payment_id: tx.payment_id,
                      is_paid_confirmed: true,
                      is_received_confirmed: null,
                      is_retention_confirmed: null,
                    };
                    await this.editDetailsOfAPayment(
                      decoded,
                      mark_paid_payment,
                      decoded?.userId,
                    );
                  } else if (tx.sub_payment_type === 'Retention Out') {
                    this.logger.log(`[ABA] Processing retention ${processedCount}/${transactions.length}: payment_id=${tx.payment_id}`);
                    const mark_paid_payment = {
                      payment_id: tx.payment_id,
                      is_paid_confirmed: null,
                      is_received_confirmed: null,
                      is_retention_confirmed: true,
                    };
                    await this.editDetailsOfAPayment(
                      decoded,
                      mark_paid_payment,
                      decoded?.userId,
                    );
                  } else {
                    this.logger.log(`[ABA] Skipping ${processedCount}/${transactions.length}: payment_id=${tx.payment_id} (sub_payment_type=${tx.sub_payment_type})`);
                  }
                } catch (markPaidError) {
                  const errorStr = String(markPaidError);
                  // Gracefully handle known non-fatal errors - these shouldn't stop ABA file generation
                  if (errorStr.includes('No changes to save')) {
                    this.logger.log(`[ABA] Payment ${tx.payment_id} already confirmed, skipping`);
                  } else if (errorStr.includes('Delete the retention claim')) {
                    this.logger.warn(`[ABA] Payment ${tx.payment_id} has retention claim constraints, skipping mark as paid`);
                  } else if (errorStr.includes('retention') || errorStr.includes('unmatch')) {
                    this.logger.warn(`[ABA] Payment ${tx.payment_id} has retention issues: ${errorStr}, skipping`);
                  } else {
                    // Re-throw unexpected errors
                    this.logger.error(`[ABA] Error marking payment ${tx.payment_id}: ${markPaidError}`);
                    throw markPaidError;
                  }
                }

                if (!payments_to_send_notice.includes(tx.payment_id)) {
                  payments_to_send_notice.push(tx.payment_id);
                }
              }
              this.logger.log(`[ABA] Finished marking ${transactions.length} transactions as paid`);
            }

          return {
            ...fileData,
            file_path: fileData.file_path?.startsWith('/') ? fileData.file_path : `/${fileData.file_path}`,
            notice_trigger: payments_to_send_notice,
          };
        } else {
          return {
            bank_account_id: accountDetails.bank_account_id,
            company_id: accountDetails.company_id,
            aba_message:
              'Please update your APCA number along with the account details',
          };
        }
      }

      // If we got here without returning, no transactions qualified for ABA generation
      if (Object.keys(groupedTransactions).length === 0) {
        this.logger.warn('No transactions qualified for ABA file generation - all were skipped');
        return {
          aba_message: 'No transactions qualified for ABA file generation. Please check that payment accounts have valid account numbers and BSB numbers.',
        };
      }

      // If mark_paid was not set, we already returned confirmation message above
      // If we reach here with mark_paid set, something unexpected happened
      this.logger.warn('generateAbaFile completed without returning a file - unexpected state');
      return {
        aba_message: 'No ABA file was generated. Please verify that payment details are complete.',
      };
    } catch (error) {
      this.logger.error(`Error generating ABA file: ${error.message}`);
      throw error;
    }
  }

  async getListOfSubpayments(
    getSubpaymentsInput: ListSubPaymentsInput,
    user_id,
    timezone,
  ) {
    const company_id = getSubpaymentsInput.company_id;

    const queryBuilder = await this.subPaymentsRepo
      .createQueryBuilder('subpayment')
      .select([
        'subpayment.id AS id',
        'subpayment.payment_id AS payment_id',
        'subpayment.amount AS amount',
        `CASE
          WHEN subpayment.amount > 0 THEN ABS(subpayment.amount)
            ELSE NULL
          END AS received_amount`,
        `CASE
          WHEN subpayment.amount < 0 THEN ABS(subpayment.amount)
            ELSE NULL
          END AS spent_amount`,
        'subpayment.status AS status',
        'subpayment.sub_payment_id AS sub_payment_id',
        'subpayment.sub_payment_type AS sub_payment_type',
        'subpayment.is_paid_confirmed AS is_paid_confirmed',
        'subpayment.is_received_confirmed AS is_received_confirmed',
        'subpayment.is_retention_confirmed AS is_retention_confirmed',
      ])

      .leftJoin('subpayment.paymentDetails', 'payments')
      .addSelect('payments.payment_date AS payment_date')
      .addSelect('payments.payment_type AS payment_type')
      .addSelect('payments.paymentFromAccount AS payment_from_account')
      .addSelect('payments.paymentToAccount AS payment_to_account')
      .addSelect('payments.payment_claim_id AS payment_claim_id')
      .addSelect('payments.project_id AS project_id')
      .addSelect('pc.contract_id AS contract_id')
      .leftJoin('payments.projectDetails', 'project')
      .addSelect('project.project_name', 'project_name')
      .leftJoin('payments.paymentClaims', 'pc')
      .addSelect('pc.payment_claim_id AS payment_claim_id')
      .addSelect('pc.claim_amount AS claim_amount')
      .addSelect('pc.claim_type AS claim_type')
      .addSelect('pc.due_date AS due_date')
      .addSelect('pc.cash_retention_type AS cash_retention_type')
      .leftJoin('pc.contractDetails', 'contract')
      .addSelect('contract.contract_name', 'contract_name')
      .leftJoin('payments.clientSupplierDetails', 'clientSupplier')
      .addSelect('clientSupplier.client_supplier_name', 'client_supplier_name')
      .addSelect('clientSupplier.client_supplier_type', 'client_supplier_type')
      .leftJoin('payments.paymentFromAccount', 'fromAccount')
      .addSelect(
        `CASE WHEN (pc.claim_type = 'Receivable' OR 
          payments.payment_type IN ('Overpayment from client','Underpayment from client')
          ) THEN clientSupplier.client_supplier_name ELSE fromAccount.account_name 
        END`,
        'payment_from_account_name',
      )
      .addSelect('fromAccount.bsb_number', 'payment_from_account_bsb_number')
      .addSelect('fromAccount.account_number', 'payment_from_account_number')
      .addSelect(
        'fromAccount.financial_institution',
        'payment_from_account_fin_ins',
      )
      .leftJoin('payments.paymentToAccount', 'toAccount')
      .leftJoin('payments.retentionAccount', 'retentionAcc')
      .addSelect(
        `
        CASE 
          WHEN subpayment.sub_payment_type IN ('Retention Out', 'Retention In') THEN retentionAcc.account_name 
          WHEN payments.payment_type IN ('Overpayment to supplier','Underpayment to supplier') THEN clientSupplier.client_supplier_name 
          ELSE toAccount.account_name 
        END`,
        'payment_to_account_name',
      )
      .addSelect(
        `
        CASE 
          WHEN subpayment.sub_payment_type IN ('Retention Out', 'Retention In') 
          THEN retentionAcc.bsb_number 
          ELSE toAccount.bsb_number 
        END`,
        'payment_to_account_bsb_number',
      )
      .addSelect(
        `
        CASE 
          WHEN subpayment.sub_payment_type IN ('Retention Out', 'Retention In') 
          THEN retentionAcc.account_number 
          ELSE toAccount.account_number 
        END`,
        'payment_to_account_number',
      )
      .addSelect('retentionAcc.account_name', 'retention_account_name')
      .addSelect('retentionAcc.account_number', 'retention_account_number')
      .where('payments.company_id = :companyId', { companyId: company_id })
      .andWhere('payments.current_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });

    if (getSubpaymentsInput.project_id) {
      queryBuilder.andWhere('payments.project_id = :project_id', {
        project_id: getSubpaymentsInput.project_id,
      });
    }

    if (getSubpaymentsInput.contract_id) {
      queryBuilder.andWhere('payments.contract_id = :contract_id', {
        contract_id: getSubpaymentsInput.contract_id,
      });
    }

    if (getSubpaymentsInput.claim_type) {
      if (getSubpaymentsInput.claim_type === 'Receivable') {
        queryBuilder.andWhere(
          `((pc.claim_type IS NULL AND subpayment.amount > 0) OR pc.claim_type = :claim_type OR (
            ((subpayment.sub_payment_type = :subpaymentType1) AND :bankAccount = payments.retention_account)
            OR
            ((subpayment.sub_payment_type = :subpaymentType2 AND pc.cash_retention_type = :retention)
              AND :bankAccount = payments.payment_from_account)
            OR
            (:bankAccount = payments.payment_from_account OR :bankAccount = payments.payment_to_account)
          ))`,

          {
            claim_type: getSubpaymentsInput.claim_type,
            bankAccount: getSubpaymentsInput.bank_account_id,
            subpaymentType1: 'Retention In',
            subpaymentType2: 'Payment',
            retention: 'Retention claim',
          },
        );
      } else if (getSubpaymentsInput.claim_type === 'Billable') {
        queryBuilder.andWhere(
          `((pc.claim_type IS NULL AND subpayment.amount < 0) OR pc.claim_type = :claim_type OR (
            ((subpayment.sub_payment_type = :subpaymentType1) AND :bankAccount = payments.retention_account)
            OR
            ((subpayment.sub_payment_type = :subpaymentType2 AND pc.cash_retention_type = :retention)
              AND :bankAccount = payments.payment_from_account)
            OR
            (:bankAccount = payments.payment_from_account OR :bankAccount = payments.payment_to_account)
          ))`,
          {
            claim_type: getSubpaymentsInput.claim_type,
            bankAccount: getSubpaymentsInput.bank_account_id,
            subpaymentType1: 'Retention In',
            subpaymentType2: 'Payment',
            retention: 'Retention claim',
          },
        );
      }
    }

    if (getSubpaymentsInput.client_supplier_id) {
      queryBuilder.andWhere(
        'payments.client_supplier_id = :client_supplier_id',
        {
          client_supplier_id: getSubpaymentsInput.client_supplier_id,
        },
      );
    }

    if (getSubpaymentsInput.bank_account_id) {
      queryBuilder.andWhere(
        `
        (payments.payment_from_account = :bank_account_id OR 
        payments.payment_to_account = :bank_account_id OR
        payments.retention_account = :bank_account_id)
      `,
        { bank_account_id: getSubpaymentsInput.bank_account_id },
      );
    }

    if (getSubpaymentsInput.sub_payment_type) {
      if (getSubpaymentsInput.sub_payment_type == 'ToDo') {
        const PaymentsToDo = ['Payment', 'Retention Out', 'Retention In'];
        queryBuilder.andWhere(
          'subpayment.sub_payment_type  IN (:...toDoPayments)',
          {
            toDoPayments: PaymentsToDo,
          },
        );
      } else if (getSubpaymentsInput.sub_payment_type == 'All') {
        const AllPayments = [
          'Payment',
          'Retention Out',
          'Retention In',
          'Retention',
        ];
        queryBuilder.andWhere(
          'subpayment.sub_payment_type  IN (:...allPayments)',
          {
            allPayments: AllPayments,
          },
        );
      } else {
        queryBuilder.andWhere(
          'subpayment.sub_payment_type  = :sub_payment_type',
          {
            sub_payment_type: getSubpaymentsInput.sub_payment_type,
          },
        );
      }
    }
    const allowedPaidStatuses = [
      'Unconfirmed - Matched',
      'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
      'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
      'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
      'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
      'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
      'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
      'Paid - Unmatched',
      'Paid - Matched',
      'Received - Unmatched',
      'Received - Matched',
    ];

    const allowedUnPaidStatuses = [
      'Unconfirmed - Unmatched',
      'Unconfirmed - Matched',
      'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
      'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
      'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
      'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
      'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched',
      'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched',
    ];

    if (
      getSubpaymentsInput.sub_payment_type &&
      getSubpaymentsInput.is_confirmed !== undefined &&
      getSubpaymentsInput.sub_payment_type == 'ToDo' &&
      getSubpaymentsInput.status
    ) {
      if (getSubpaymentsInput.is_confirmed === true) {
        queryBuilder.andWhere(
          `(payments.current_status IN (:...status) OR (payments.current_status IN (:...unpaidstatus) 
          AND (subpayment.is_paid_confirmed = true OR subpayment.is_received_confirmed = true OR subpayment.is_retention_confirmed = true)))`,
          {
            status: allowedPaidStatuses,
            unpaidstatus: allowedUnPaidStatuses,
          },
        );
      } else if (getSubpaymentsInput.is_confirmed === false) {
        // For ToDo + is_confirmed=false, filter by subpayment status instead of payment current_status
        // This ensures items with paid/received payment status but unconfirmed subpayments are still shown
        queryBuilder.andWhere('subpayment.status = :subpayment_status', {
          subpayment_status: getSubpaymentsInput.status,
        });
      }
    } else if (getSubpaymentsInput.status) {
      queryBuilder.andWhere('subpayment.status = :status', {
        status: getSubpaymentsInput.status,
      });
    }

    const currentDate = moment.tz(timezone).toDate();
    //  console.log'currentDate: ', currentDate);

    if (getSubpaymentsInput.is_confirmed !== undefined) {
      if (getSubpaymentsInput.is_confirmed === true) {
        // queryBuilder.andWhere(
        //   '(subpayment.is_paid_confirmed = true OR subpayment.is_received_confirmed = true OR subpayment.is_retention_confirmed = true)',
        // );
      } else if (getSubpaymentsInput.is_confirmed === false) {
        queryBuilder.andWhere(
          '(COALESCE(subpayment.is_paid_confirmed, false) = false OR COALESCE(subpayment.is_received_confirmed, false) = false OR COALESCE(subpayment.is_retention_confirmed, false) = false)',
        );

        queryBuilder.addSelect(
          `CASE WHEN due_date < :currentDate THEN true ELSE false END`,
          'is_late',
        );
        queryBuilder.setParameter('currentDate', currentDate);
      }
    }

    if (getSubpaymentsInput.is_late !== undefined) {
      if (getSubpaymentsInput.is_late !== null) {
        queryBuilder.andWhere(
          'CASE WHEN due_date < :currentDate THEN true ELSE false END = :is_late',
          { is_late: getSubpaymentsInput.is_late },
        );
      }
    }

    if (getSubpaymentsInput.keyword) {
      queryBuilder.andWhere(
        `(
        LOWER(CAST(subpayment.sub_payment_type AS text)) LIKE :keyword OR
        LOWER(CAST(pc.payment_claim_id AS text)) LIKE :keyword OR
        LOWER(CAST(project.project_name AS text)) LIKE :keyword OR
        LOWER(CAST(fromAccount.account_name AS text)) LIKE :keyword OR
        LOWER(CAST(toAccount.account_name AS text)) LIKE :keyword OR
        LOWER(CAST(retentionAcc.account_name AS text)) LIKE :keyword 
         ${!isNaN(Number(getSubpaymentsInput.keyword)) ? 'OR ABS(subpayment.amount) = ABS(:exactAmount)' : ''}
        )`,
        {
          keyword: `%${getSubpaymentsInput.keyword.trim().toLowerCase()}%`,
          ...(isNaN(Number(getSubpaymentsInput.keyword))
            ? {}
            : { exactAmount: Number(getSubpaymentsInput.keyword.trim()) }),
        },
      );
    }

    if (getSubpaymentsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getSubpaymentsInput.date_filter === 'Custom' &&
        getSubpaymentsInput.start_date &&
        getSubpaymentsInput.end_date
      ) {
        startDate = moment(getSubpaymentsInput.start_date)
          .startOf('day')
          .toDate();
        endDate = moment(getSubpaymentsInput.end_date).endOf('day').toDate();
      } else if (getSubpaymentsInput.date_filter === 'This Month') {
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
      } else if (getSubpaymentsInput.date_filter === 'Last Month') {
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
      }
      queryBuilder.andWhere(
        'payments.payment_date::date BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getSubpaymentsInput.sorting_order
      ? getSubpaymentsInput.sorting_order
      : 'DESC';
    if (!getSubpaymentsInput.sorting_field) {
      queryBuilder.orderBy({ 'subpayment.payment_id': sorting_order });
      if (getSubpaymentsInput.page_number && getSubpaymentsInput.page_size) {
        queryBuilder
          .offset(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size,
          )
          .limit(getSubpaymentsInput.page_size);
      }
    }
    if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field !== 'payment_from_account_name' &&
      getSubpaymentsInput.sorting_field !== 'payment_to_account_name' &&
      getSubpaymentsInput.sorting_field !== 'payment_to_account_bsb_number' &&
      getSubpaymentsInput.sorting_field !== 'payment_to_account_number' &&
      getSubpaymentsInput.sorting_field !== 'list_status'
    ) {
      switch (getSubpaymentsInput.sorting_field) {
        case 'payment_id':
          {
            queryBuilder.orderBy({ 'subpayment.payment_id': sorting_order });
          }
          break;
        case 'payment_type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(payments.payment_type AS text))': sorting_order,
            });
          }
          break;
        case 'amount':
          {
            queryBuilder.orderBy({ 'ABS(subpayment.amount)': sorting_order });
          }
          break;
      }
      if (getSubpaymentsInput.page_number && getSubpaymentsInput.page_size) {
        queryBuilder
          .offset(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size,
          )
          .limit(getSubpaymentsInput.page_size);
      }
    }

    const [rawResults, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    rawResults.forEach((result) => {
      if (
        getSubpaymentsInput.status === 'Unmatched' &&
        result.status === 'Unmatched'
      ) {
        result.list_status = result.is_late ? 'Overdue' : 'Not paid';
      } else {
        result.list_status = result.status;
      }
    });

    let finalResult, finalCount;
    if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field === 'payment_from_account_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.payment_from_account_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.payment_from_account_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.payment_from_account_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.payment_from_account_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? (getSubpaymentsInput.page_number - 1) *
          getSubpaymentsInput.page_size
          : 0;
      const endIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? Math.min(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size +
            getSubpaymentsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field === 'payment_to_account_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.payment_to_account_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.payment_to_account_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.payment_to_account_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.payment_to_account_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? (getSubpaymentsInput.page_number - 1) *
          getSubpaymentsInput.page_size
          : 0;
      const endIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? Math.min(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size +
            getSubpaymentsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field === 'payment_to_account_bsb_number'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) =>
            a.payment_to_account_bsb_number - b.payment_to_account_bsb_number,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) =>
            b.payment_to_account_bsb_number - a.payment_to_account_bsb_number,
        );
      }

      const startIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? (getSubpaymentsInput.page_number - 1) *
          getSubpaymentsInput.page_size
          : 0;
      const endIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? Math.min(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size +
            getSubpaymentsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field === 'payment_to_account_number'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.payment_to_account_number
            ?.trim()
            ?.localeCompare(b.payment_to_account_number?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.payment_to_account_number
            ?.trim()
            ?.localeCompare(a.payment_to_account_number?.trim()),
        );
      }

      const startIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? (getSubpaymentsInput.page_number - 1) *
          getSubpaymentsInput.page_size
          : 0;
      const endIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? Math.min(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size +
            getSubpaymentsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getSubpaymentsInput.sorting_field &&
      getSubpaymentsInput.sorting_field === 'list_status'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.list_status?.trim()?.localeCompare(b.list_status?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.list_status?.trim()?.localeCompare(a.list_status?.trim()),
        );
      }

      const startIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? (getSubpaymentsInput.page_number - 1) *
          getSubpaymentsInput.page_size
          : 0;
      const endIndex =
        getSubpaymentsInput.page_number && getSubpaymentsInput.page_size
          ? Math.min(
            (getSubpaymentsInput.page_number - 1) *
            getSubpaymentsInput.page_size +
            getSubpaymentsInput.page_size,
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

    //Insert formatted amounts.
    finalResult.forEach((result) => {
      result.formatted_amount = formatCurrencyWithoutDollars(result.amount);
      result.formatted_received_amount = formatCurrencyWithoutDollars(
        result.received_amount,
      );
      result.formatted_spent_amount = formatCurrencyWithoutDollars(
        result.spent_amount,
      );
      result.formatted_claim_amount = formatCurrencyWithoutDollars(
        result.claim_amount,
      );
    });

    return { total_count: finalCount, payments: finalResult };
  }

  async getABAFileHistoryList(
    payload: GetABAFileHistoryInput,
    decoded: any,
  ): Promise<FetchAllABAGeneratedFileHistoryResponse> {
    try {
      const {
        page_number,
        items_per_page,
        company_id,
        bank_account_id,
        sorting_field,
        sorting_order,
      } = payload;
      const pageNo = page_number ? page_number : 1,
        dataPerPage = items_per_page ? items_per_page : 10;

      const queryBuilder = this.generateABAFileHistory
        .createQueryBuilder('h')
        .select([
          'h.id as id',
          'h.bank_account_id as bank_account_id',
          'ba.account_name as account_name',
          'h.company_id as company_id',
          'c.company_name as company_name',
          'h.aba_file_id as aba_file_id',
          'af.file_path as aba_file_path',
          'af.file_name as aba_file_name',
          'h.generated_by as generated_by',
          'h.mark_paid as mark_paid',
          'h.created_on as created_on',
        ])
        .leftJoin('company_details', 'c', 'c.company_id = h.company_id')
        .leftJoin(
          'bank_accounts',
          'ba',
          'ba.bank_account_id = h.bank_account_id',
        )
        .innerJoin('h.fileAttachments', 'af')
        .where('h.status = :status', { status: 'Active' })
        .andWhere('h.company_id = :company_id', { company_id });

      if (bank_account_id) {
        queryBuilder.andWhere('h.bank_account_id = :bank_account_id', {
          bank_account_id,
        });
      }

      // Default sorting field and order
      const sortField = sorting_field || 'created_on'; // Default sort field
      const sortOrder = sorting_order ? sorting_order : 'DESC'; // Default order is DESC

      queryBuilder.orderBy({ [sortField]: sortOrder });

      let [result, total_count] = await Promise.all([
        page_number && page_number
          ? queryBuilder
            .offset((pageNo - 1) * page_number)
            .limit(dataPerPage)
            .getRawMany()
          : queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      if (result?.length > 0) {
        result = result?.map((fileHistory) => {
          let aba_file_path = fileHistory?.aba_file_path
            ? fileHistory?.aba_file_path.replace(/\\/g, '/')
            : fileHistory?.aba_file_path;
          // Ensure path starts with / for browser URL
          if (aba_file_path && !aba_file_path.startsWith('/')) {
            aba_file_path = '/' + aba_file_path;
          }
          return { ...fileHistory, aba_file_path };
        });
      }

      return framedResponse(
        'SUCCESS',
        'Fetched ABA generated file history list',
        { list: result, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all aba generated file history with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async fetchAllRetentionInPaymentsList(
    data: FetchAllRetentionInPaymentsListInput,
  ) {
    const {
      company_id,
      project_id,
      contract_id,
      status,
      page_number,
      items_per_page,
    } = data;

    try {
      //Retention bank account name need to be fetched from bank accounts entity.
      const queryBuilder = await this.retentionDetailsRepo
        .createQueryBuilder('rd')
        .select([
          'rd.payment_id AS payment_id',
          'rd.retained_amount AS retained_amount',
          'rd.retention_id AS retention_list_id',
          `rd.retention_status AS status`,
          'rd.sub_payment_id AS sub_payment_id',
          'rd.beneficiary_type AS beneficiary_type',
          'rd.client_supplier_id AS client_supplier_id',
          'rd.company_id AS company_id',
          'p.payment_claim_id AS payment_claim_id',
          'p.payment_type AS payment_type',
          'p.project_id AS project_id',
          'p.contract_id AS contract_id',
          'pc.claim_type AS claim_type',
          'pc.cash_retention_type AS cash_retention_type',
          'pc.sent_date AS sent_date',
          'pc.received_date AS received_date',
          'pc.due_date AS due_date',
          'pc.created_on AS claim_created_on',
          'cd.contract_name AS contract_name',
          'pd.project_name AS project_name',
          'ra.account_name AS retention_trust_account_name',
          'ra.bank_account_id AS retention_account_id',
          'cs.client_supplier_name AS client_supplier_name',
        ])
        .leftJoin('rd.paymentDetails', 'p')
        .leftJoin('p.paymentClaims', 'pc')
        .leftJoin('p.contractDetails', 'cd')
        .leftJoin('p.projectDetails', 'pd')
        .leftJoin('p.companyDetails', 'com')
        .leftJoin('p.retentionAccount', 'ra')
        .leftJoin('cd.clientSuppliersDetails', 'cs')
        .where(`rd.company_id = :company_id`, { company_id });

      if (project_id) {
        queryBuilder.andWhere('p.project_id = :project_id', { project_id });
      }

      if (contract_id) {
        queryBuilder.andWhere('p.contract_id = :contract_id', { contract_id });
      }

      // if (status) {
      //   queryBuilder.andWhere('rd.retention_status = :status', { status });
      // } else if (!status) {
      //   const activeStatuses = [
      //     'Retained',
      //     'Claim generated',
      //     'Claim completed',
      //     'Payment generated',
      //     'Deleted',
      //   ];
      //   queryBuilder.andWhere('rd.retention_status IN(:...activeStatuses)', {
      //     activeStatuses,
      //   });
      // }

      if (status && status === ('Archived' as any)) {
        const archivedStatuses = ['Completed', 'Deleted'];
        queryBuilder.andWhere('rd.retention_status IN (:...archivedStatuses)', {
          archivedStatuses,
        });
      } else if (status && status != ('Archived' as any)) {
        queryBuilder.andWhere('rd.retention_status = :status', { status });
      } else if (!status) {
        const activeStatuses = [
          'Retained',
          'Claim generated',
          'Claim completed',
          'Payment generated',
        ];
        queryBuilder.andWhere('rd.retention_status IN (:...activeStatuses)', {
          activeStatuses,
        });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'rd.created_on': sorting_order });
        if (data.page_number && data.items_per_page) {
          queryBuilder
            .offset((data.page_number - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }
      if (
        data.sorting_field &&
        data.sorting_field !== 'beneficiary_name' &&
        data.sorting_field !== 'status'
      ) {
        switch (data.sorting_field) {
          case 'project_name':
            {
              queryBuilder.orderBy({ 'LOWER(pd.project_name)': sorting_order });
            }
            break;
          case 'contract_name':
            {
              queryBuilder.orderBy({ '(cd.contract_name)': sorting_order });
            }
            break;
          case 'claim_type':
            {
              queryBuilder.orderBy({ 'pc.claim_type': sorting_order });
            }
            break;
          case 'retention_trust_account_name':
            {
              queryBuilder.orderBy({ 'LOWER(ra.account_name)': sorting_order });
            }
            break;
          case 'retained_amount':
            {
              queryBuilder.orderBy({
                'ABS(rd.retained_amount)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.items_per_page) {
          queryBuilder
            .offset((data.page_number - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      // console.log'retentionInPayments', rawResults);

      for (const retentionInPayment of rawResults) {
        //Checking the presence of retention trust account name.
        if (!retentionInPayment.retention_trust_account_name) {
          const retentionAccountDetails = await this.contractDetailsRepo
            .createQueryBuilder('c')
            .select([
              'c.retention_from_account AS retention_from_account',
              'ba.account_name AS retention_trust_account_name',
              'ba.bank_account_id AS retention_account_id',
            ])
            .leftJoin(
              BankAccounts,
              'ba',
              'ba.bank_account_id = c.retention_from_account',
            )
            .where('c.contract_id = :contract_id', {
              contract_id: retentionInPayment.contract_id,
            })
            .getRawOne();
          retentionInPayment.retention_trust_account_name =
            retentionAccountDetails.retention_trust_account_name;
          if (!retentionInPayment.retention_account_id) {
            retentionInPayment.retention_account_id =
              retentionAccountDetails.retention_account_id;
          }
        }
        //Provide the client name if the claim type is RECEIVABLES
        if (retentionInPayment.claim_type == 'Receivable') {
          // console.log'-------->');
          retentionInPayment.retention_trust_account_name =
            retentionInPayment.client_supplier_name;
        }

        //Format the amounts and currency info.
        retentionInPayment.formatted_retained_amount =
          formatCurrencyWithoutDollars(retentionInPayment.retained_amount);

        //Setting the beneficiary_name based upon the beneficiary_type
        const company_details = await this.companyDetailsRepo.findOne({
          where: { company_id: retentionInPayment.company_id },
          select: ['company_name'],
        });

        if (
          retentionInPayment.beneficiary_type == 'Current supplier' ||
          retentionInPayment.beneficiary_type == 'Other supplier'
        ) {
          const client_supplier_details =
            await this.clientSupplierDetailsRepo.findOne({
              where: {
                client_supplier_id: retentionInPayment.client_supplier_id,
              },
              select: ['client_supplier_name'],
            });
          retentionInPayment.beneficiary_name =
            client_supplier_details.client_supplier_name
              ? client_supplier_details.client_supplier_name
              : retentionInPayment.client_supplier_name;
        } else if (retentionInPayment.beneficiary_type == 'Self') {
          retentionInPayment.beneficiary_name = company_details.company_name;
        }

        retentionInPayment.cash_retention_type = 'Retention claim';

        if (
          retentionInPayment.beneficiary_type == 'Current supplier' ||
          retentionInPayment.beneficiary_type == 'Self'
        ) {
          // console.log'retentionInPayment', retentionInPayment);
          const fetchedPaymentAndClaimDetails = await this.paymentsRepo
            .createQueryBuilder('p')
            .select([
              'p.payment_id AS payment_id',
              'p.payment_claim_id AS payment_claim_id',
              'p.current_status AS payment_status',
              'p.total_amount AS payment_amount',
              'p.payless_amount AS payless_amount',
              'p.payment_type AS payment_type',
              'pc.claim_amount AS claim_amount',
              'pc.claim_type AS claim_type',
            ])
            .leftJoin(
              PaymentClaims,
              'pc',
              'pc.payment_claim_id = p.payment_claim_id',
            )
            .where(`p.retention_id = :retention_id`, {
              retention_id: retentionInPayment.retention_list_id,
            })
            .andWhere(`p.current_status IN(:...matchedStatuses)`, {
              matchedStatuses: [
                'Unconfirmed - Matched',
                'Paid - Matched',
                'Received - Matched',
                'No Match Required',
                'Unconfirmed - Unmatched',
                'Received - Unmatched',
                'Paid - Unmatched',
              ],
            })
            .getRawMany();
          // console.log(
          //   'fetchedPaymentAndClaimDetails',
          //   fetchedPaymentAndClaimDetails,
          // );

          let total_payment_amounts = [];
          const completedPayments = await fetchedPaymentAndClaimDetails.filter(
            (payment) =>
              [
                'Unconfirmed - Matched',
                'Paid - Matched',
                'Received - Matched',
                'No Match Required',
                'Received - Unmatched',
                'Paid - Unmatched',
              ].includes(payment.payment_status),
          );
          // console.log'completedPayments', completedPayments);

          const inCompletePayments = await fetchedPaymentAndClaimDetails.filter(
            (payment) =>
              [
                'Unconfirmed - Unmatched',
                // 'Received - Unmatched',
                // 'Paid - Unmatched',
              ].includes(payment.payment_status),
          );
          // console.log'inCompletePayments', inCompletePayments);

          for (const payment of inCompletePayments) {
            let payment_amount;
            if (payment.claim_type == 'Receivable') {
              if (
                payment.payment_type == 'Pay Less - Full' ||
                payment.payment_type == 'Pay Less - Part'
              ) {
                payment_amount =
                  Number(payment.claim_amount) - Number(payment.payless_amount);
              }
              total_payment_amounts.push({
                payment_amount,
                payment_claim_id: payment.payment_claim_id,
              });
            }
          }

          for (const payment of completedPayments) {
            let payment_amount;
            if (payment.payment_type == 'Pay Less - Full') {
              payment_amount = Number(payment.claim_amount);
            } else if (payment.payment_type == 'Pay Less - Part') {
              const preExistingPaylessPayments = total_payment_amounts.filter(
                (pushed_payment) => {
                  if (
                    payment.payment_claim_id == pushed_payment.payment_claim_id
                  )
                    return pushed_payment;
                },
              );
              // console.log(
              //   'preExistingPaylessPayments',
              //   preExistingPaylessPayments,
              // );

              payment_amount = !preExistingPaylessPayments.length
                ? Number(payment.claim_amount) -
                Number(payment.payless_amount) +
                Number(payment.payment_amount)
                : Number(payment.payment_amount);
            } else if (
              payment.payment_type == 'Part' ||
              payment.payment_type == 'Withdrawal'
            ) {
              payment_amount = Number(payment.payment_amount);
            } else if (payment.payment_type == '3rd Party') {
              payment_amount = Number(payment.claim_amount);
            } else if (payment.payment_type == 'Pay - Zero') {
              payment_amount = Number(payment.claim_amount);
            } else {
              payment_amount = Number(payment.payment_amount);
            }
            // console.log'payment_amount', payment_amount);
            // console.log'fetchedPayment', payment);
            total_payment_amounts.push({
              payment_amount,
              payment_claim_id: payment.payment_claim_id,
            });
          }

          if (total_payment_amounts.length) {
            this.logger.log(`total_payment_amounts: ${JSON.stringify(total_payment_amounts)}`);
            const sum_of_total_payment_amounts = total_payment_amounts.reduce(
              (acc, payment_info) => acc + payment_info.payment_amount,
              0,
            );
            this.logger.log(
              `sum_of_total_amounts: ${sum_of_total_payment_amounts}, retained_amount: ${retentionInPayment.retained_amount}`,
            );

            retentionInPayment.retained_amount =
              Number(retentionInPayment.retained_amount) -
              sum_of_total_payment_amounts;

            if (
              retentionInPayment.status != 'Completed' &&
              retentionInPayment.retained_amount == 0
            ) {
              await this.retentionDetailsRepo
                .createQueryBuilder()
                .update(RetentionDetails)
                .set({
                  retention_status: 'Completed',
                })
                .where('retention_id = :retention_id', {
                  retention_id: retentionInPayment.retention_list_id,
                })
                .execute();
            }
          }
        }
      }

      for (const element of rawResults) {
        if (element.status === 'Deleted') element.status = 'Void';
      }

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'beneficiary_name') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.beneficiary_name
              ?.toLowerCase()
              ?.trim()
              ?.localeCompare(b.beneficiary_name?.toLowerCase()?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.beneficiary_name
              ?.toLowerCase()
              ?.trim()
              ?.localeCompare(a.beneficiary_name?.toLowerCase()?.trim()),
          );
        }

        const startIndex =
          data.page_number && items_per_page
            ? (data.page_number - 1) * items_per_page
            : 0;
        const endIndex =
          data.page_number && items_per_page
            ? Math.min(
              (data.page_number - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (data.sorting_field && data.sorting_field === 'status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.status?.trim()?.localeCompare(b.status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.status?.trim()?.localeCompare(a.status?.trim()),
          );
        }

        const startIndex =
          data.page_number && items_per_page
            ? (data.page_number - 1) * items_per_page
            : 0;
        const endIndex =
          data.page_number && items_per_page
            ? Math.min(
              (data.page_number - 1) * items_per_page + items_per_page,
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

      return framedResponse(
        'SUCCESS',
        `All retention in payments fetched successfully.`,
        {
          total_count: finalCount,
          data: finalResult,
        } as FetchAllRetentionInPaymentListWithCount,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all matched retention in payments with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async fetchRetentionSummary(data: FetchRetentionSummaryInput) {
    try {
      this.logger.log(
        `Request received for fetching all the retention summary of a sub payment with id: ${data.retention_id}`,
      );

      const { retention_id, page_number, items_per_page, status } = data;
      // console.log'data', data);
      const queryBuilder = await this.retentionSummaryRepo
        .createQueryBuilder('rsd')
        .select([
          'rsd.retention_summary_id as retention_summary_id',
          'rsd.retention_id as retention_id',
          'rsd.sub_payment_id as sub_payment_id',
          'rsd.amount as amount',
          'rsd.payment_amount as payment_amount',
          'rsd.status as status',
          'rsd.event_id AS event_id',
          'sp.created_on as retained_on',
          'sp.payment_id AS payment_id',
          'pc.claim_type as retention_type',
          'ba.account_type as retained_account_type',
          'rsd.beneficiary_type as beneficiary_type',
          'rsd.client_supplier_id as client_supplier_id',
          'rsd.retained_account_name as retained_account_name',
          'rsd.beneficiary_name as beneficiary_name',
          'rd.company_id as company_id',
          'p.project_id AS project_id',
          'p.payment_from_account AS retention_account_id',
          'p.payment_date AS payment_date',
        ])
        .leftJoin(RetentionDetails, 'rd', 'rd.retention_id = rsd.retention_id')
        .leftJoin(SubPayments, 'sp', 'sp.sub_payment_id = rsd.sub_payment_id')
        .leftJoin(PaymentDetails, 'p', 'p.payment_id = sp.payment_id')
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = p.payment_claim_id',
        )
        .leftJoin(
          BankAccounts,
          'ba',
          'ba.bank_account_id = p.payment_from_account',
        )
        .where('rsd.retention_id = :retention_id', {
          retention_id,
        });

      if (status == 'Active') {
        const activeStatuses = ['Retained', 'Completed'];
        queryBuilder.andWhere('rsd.status IN(:...activeStatuses)', {
          activeStatuses,
        });
      } else if (status == 'Deleted') {
        queryBuilder.andWhere('rsd.status = :status', { status: 'Deleted' });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'rsd.created_on': sorting_order });
        if (data.page_number && data.items_per_page) {
          queryBuilder
            .offset((data.page_number - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'event_id':
            {
              queryBuilder.orderBy({ 'rsd.event_id': sorting_order });
            }
            break;
          case 'retained_on':
            {
              queryBuilder.orderBy({ 'sp.created_on': sorting_order });
            }
            break;
          case 'payment_date':
            {
              queryBuilder.orderBy({ 'p.payment_date': sorting_order });
            }
            break;
          case 'retention_type':
            {
              queryBuilder.orderBy({ 'pc.claim_type': sorting_order });
            }
            break;
          case 'amount':
            {
              queryBuilder.orderBy({ 'rsd.amount': sorting_order });
            }
            break;
          case 'payment_amount':
            {
              queryBuilder.orderBy({ 'rsd.payment_amount': sorting_order });
            }
            break;
          case 'beneficiary_name':
            {
              queryBuilder.orderBy({
                'LOWER(rsd.beneficiary_name)': sorting_order,
              });
            }
            break;
          case 'retained_account_name':
            {
              queryBuilder.orderBy({
                'LOWER(rsd.retained_account_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.items_per_page) {
          queryBuilder
            .offset((data.page_number - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      this.logger.log(
        `Retention summary of the provided sub payment with id: ${retention_id} has been fetched successfully with data: ${JSON.stringify(results)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Retention summary fetched successfully.`,
        { retention_summary: results, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching retention summary with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async fetchAllSubPaymentsOfAPayment(
    data: FetchAllSubPaymentsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all sub payments of a payment with data: ${JSON.stringify(data)}`,
      );

      const { payment_id } = data;
      const fetchedSubPayments = await this.subPaymentsRepo
        .createQueryBuilder('sp')
        .select([
          'sp.sub_payment_id as payment_transaction_id',
          'sp.sub_payment_type as sub_payment_type',
          'sp.amount as payment_amount',
          'sp.status as status',
          'pd.retention_account as retention_to_account_id',
          'pd.payment_to_account as payment_to_account_id',
          'pd.client_supplier_id as client_supplier_id',
          'cs.client_supplier_name as client_supplier_name',
        ])
        .leftJoin(PaymentDetails, 'pd', 'pd.payment_id = sp.payment_id')
        .leftJoin(ContractDetails, 'c', 'c.contract_id = pd.contract_id')
        .leftJoin(
          ClientSuppliersDetails,
          'cs',
          'cs.client_supplier_id = pd.client_supplier_id',
        )
        .where('sp.payment_id = :payment_id', { payment_id })
        .getRawMany();

      if (fetchedSubPayments && fetchedSubPayments.length) {
        for (const subPayment of fetchedSubPayments) {
          const payment_to_account_id =
            subPayment.sub_payment_type == 'Retention In' ||
              subPayment.sub_payment_type == 'Retention Out'
              ? subPayment.retention_to_account_id
              : subPayment.payment_to_account_id;
          subPayment.payment_amount = Number(subPayment.payment_amount);
          const payment_to_account_name = payment_to_account_id
            ? await this.bankAccountsRepo.findOne({
              where: { bank_account_id: payment_to_account_id },
              select: ['account_name'],
            })
            : null;
          subPayment.payment_to_account_name = payment_to_account_name
            ? payment_to_account_name.account_name
            : null;
        }
      }
      return framedResponse(
        'SUCCESS',
        `All sub payments of a payment fetched successfully.`,
        fetchedSubPayments,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all sub payments of a payment with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async fetchAllTheMatchedTransactionsOfAPayment(
    data: FetchAllTheMatchedTransactionsOfAPaymentInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all the matched transactions of a payment with data: ${JSON.stringify(data)}`,
      );

      const { payment_id } = data;
      //Fetched matched transaction ids of all sub payments.
      const allSubPayments = await this.subPaymentsRepo
        .createQueryBuilder('sp')
        .select([
          'sp.matched_transactions AS matched_transactions',
          'sp.sub_payment_id AS sub_payment_id',
        ])
        .where(`sp.payment_id = :payment_id`, { payment_id })
        .getRawMany();

      allSubPayments.forEach((subPayment) => {
        if (subPayment.matched_transactions) {
          subPayment.matched_transactions = parseCommaSeparatedInput(
            subPayment.matched_transactions,
          );
        }
      });

      let matchedTransactions = [];
      for (const subPayment of allSubPayments) {
        const matched_transactions = subPayment.matched_transactions;
        if (matched_transactions) {
          for (const transaction_id of matched_transactions) {
            const transaction_details = await this.transactionsRepo
              .createQueryBuilder('td')
              .select([
                'td.description AS description',
                'td.txn_amount AS txn_amount',
                'td.txn_date AS transaction_date',
              ])
              .where('td.id = :transaction_id', { transaction_id })
              .getRawOne();
            if (transaction_details)
              matchedTransactions.push(transaction_details);
          }
        }
      }

      return framedResponse(
        'SUCCESS',
        `All matched transactions of a payment fetched successfully.`,
        matchedTransactions,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all matched transactions of a payment with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async fetchAllUnmatchedPaymentsOfACompany(company_id) {
    const rawResults = await this.paymentsRepo
      .createQueryBuilder('pd')
      .select([
        'pd.id AS id',
        'pd.payment_id AS payment_id',
        'pd.payment_claim_id AS payment_claim_id',
        'pc.cash_retention_type AS cash_retention_type',
        'sp.sub_payment_id AS sub_payment_id',
        'sp.sub_payment_type AS sub_payment_type',
        'sp.status AS status',
        'ABS(sp.amount) AS amount',
        `CASE 
          WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_from_account
          WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_to_account
          WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention Out' THEN pd.payment_from_account
          WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention' THEN pd.payment_to_account
          WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention In' THEN pd.retention_account 
          WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Retention claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_from_account
          WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Retention claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_to_account 
          WHEN pd.payment_type IN ('Interest Received','Bank Charge Top Up','Top Up','Overpayment refund from supplier','Top Up Retention') THEN pd.payment_to_account
          WHEN pd.payment_type IN ('Interest Withdrawal','Bank Charge Applied','Withdrawal','Overpayment refund to client') THEN pd.payment_from_account
          ELSE 0 END AS payment_account`,
        'ba.account_name AS account_name',
        'ba.account_type AS account_type',
      ])
      .distinct(true)
      .leftJoin(
        PaymentClaims,
        'pc',
        'pc.payment_claim_id = pd.payment_claim_id',
      )
      .innerJoin(SubPayments, 'sp', 'pd.payment_id = sp.payment_id')
      .leftJoin(
        BankAccounts,
        'ba',
        `ba.bank_account_id = CASE 
        WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_from_account
        WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_to_account
        WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention Out' THEN pd.payment_from_account
        WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention' THEN pd.payment_to_account
        WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Claim' AND sp.sub_payment_type = 'Retention In' THEN pd.retention_account 
        WHEN pc.claim_type = 'Billable' AND pc.cash_retention_type = 'Retention claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_from_account
        WHEN pc.claim_type = 'Receivable' AND pc.cash_retention_type = 'Retention claim' AND sp.sub_payment_type = 'Payment' THEN pd.payment_to_account 
        WHEN pd.payment_type IN ('Interest Received','Bank Charge Top Up','Top Up','Overpayment refund from supplier','Top Up Retention') THEN pd.payment_to_account
        WHEN pd.payment_type IN ('Interest Withdrawal','Bank Charge Applied','Withdrawal','Overpayment refund to client') THEN pd.payment_from_account
        ELSE 0 END`,
      )
      .where(`pd.current_status <> 'Deleted' AND sp.status = 'Unmatched'`)
      .andWhere(
        `pd.payment_type NOT IN ('Overpayment from client','Underpayment from client', 'Overpayment to supplier','Underpayment to supplier')`,
      )
      .andWhere('pd.company_id = :companyId', { companyId: company_id })
      .orderBy('sp.sub_payment_id', 'DESC')
      .getRawMany();

    rawResults.forEach((result) => {
      result.formatted_amount = formatCurrency(result.amount);
    });

    return rawResults;
  }

  async fetchPaymentList(payment_claim_id: number) {
    const claimAndPaymentdetails = await this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .select([
        'pc.payment_claim_id AS payment_claim_id',
        'pc.company_id AS company_id',
        'pc.claim_type AS claim_type',
        'pc.cash_retention_type AS cash_retention_type',
        'pc.due_date AS due_date',
        'pc.claim_amount AS claim_amount',
        'pc.status AS claim_status',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select(
            `JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'payment_id', p.payment_id,
                'payment_type', p.payment_type,
                'cash_retention', p.cash_retention,
                'payment_status', p.current_status,
                'payless_amount', p.payless_amount,
                'total_amount', p.total_amount
              )
            )`,
            'payments',
          )
          .from(PaymentDetails, 'p')
          .where('p.payment_claim_id = pc.payment_claim_id')
          .andWhere(`p.current_status != 'Deleted'`)
          .andWhere(
            `p.payment_type NOT IN ('Overpayment from client',
            'Underpayment from client','Overpayment to supplier',
            'Underpayment to supplier')`,
          )
          .groupBy('p.payment_claim_id')
          .orderBy('MAX(p.created_on)', 'DESC');
      }, 'payment_list')
      .where('pc.payment_claim_id =:payment_claim_id', {
        payment_claim_id: payment_claim_id,
      })
      .getRawOne();

    //  console.log'claimAndPaymentdetails: ', claimAndPaymentdetails);
    return claimAndPaymentdetails?.payment_list ?? [];
  }

  async fetchPaymentDetails(payment_id: number) {
    return await this.paymentsRepo.findOne({
      where: { payment_id: payment_id },
      relations: [
        'subPayments',
        'paymentClaims',
        'projectDetails',
        'clientSupplierDetails',
        'paymentFromAccount',
        'paymentToAccount',
        'retentionAccount',
        'associatedPayment',
        'associatedOverPayment',
      ],
    });
  }

  async fetchOverPaymentDetails(payment_id: number) {
    return await this.paymentsRepo
      .createQueryBuilder('payment')
      .where('payment.associated_payment_id =:payment_id', { payment_id })
      .andWhere('payment.payment_type IN (:...payment_types)', {
        payment_types: ['Overpayment to supplier', 'Overpayment from client'],
      })
      .getMany();
  }

  async createOrDeleteRetentionEntries(
    transactionalEntityManager,
    sub_payment_ids?: any,
    undoRetention?: any,
  ): Promise<boolean> {
    try {
      this.logger.log('--- createOrDeleteRetentionEntries ---');
      if (!undoRetention) {
        const payments = await transactionalEntityManager
          .createQueryBuilder(SubPayments, 'subpayment')
          .select([
            'subpayment.id AS id',
            'subpayment.payment_id AS payment_id',
            'subpayment.amount AS amount',
            `CASE
                WHEN subpayment.amount > 0 THEN ABS(subpayment.amount)
                  ELSE NULL
                END AS received_amount`,
            `CASE
                WHEN subpayment.amount < 0 THEN ABS(subpayment.amount)
                  ELSE NULL
                END AS spent_amount`,
            'subpayment.status AS status',
            'subpayment.sub_payment_id AS sub_payment_id',
            'subpayment.sub_payment_type AS sub_payment_type',
            'subpayment.is_paid_confirmed AS is_paid_confirmed',
            'subpayment.is_received_confirmed AS is_received_confirmed',
            'subpayment.is_retention_confirmed AS is_retention_confirmed',
            'claim.cash_retention_type AS cash_retention_type',
            'claim.claim_amount AS claim_amount',
            'claim.claim_type AS claim_type',
            'claim.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
            'claim.retention_id AS retention_id',
            'claim.status AS claim_status',
            'claim.client_supplier_id AS client_supplier_id',
            'claim.payment_claim_id AS payment_claim_id',
            'payment.cash_retention AS cash_retention',
            'cs.client_supplier_name AS client_supplier_name',
            'cs.id AS client_supplier_id_string',
            'payment.company_id AS company_id',
            'payment.payment_from_account AS payment_from_account',
            'payment.payment_to_account AS payment_to_account',
            'payment.retention_account AS retention_account',
            'payment.payment_type AS payment_type',
            'payment.total_amount AS total_amount',
            // Add other fields as needed
          ])
          .leftJoin('subpayment.paymentDetails', 'payment')
          .addSelect('payment.company_id AS company_id')
          .addSelect('payment.payment_date AS payment_date')
          // .addSelect('payment.payment_type AS payment_type')
          .addSelect('payment.payless_amount AS payless_amount')
          .addSelect('payment.payment_claim_id AS payment_claim_id')
          .addSelect('payment.cash_retention AS cash_retention')
          .addSelect('payment.current_status AS payment_current_status')
          .addSelect('payment.previous_status AS payment_previous_status')
          .addSelect('payment.notice_generated AS notice_generated')
          .leftJoin('payment.paymentClaims', 'claim')
          .leftJoin('payment.clientSupplierDetails', 'cs')
          .where('sub_payment_id IN (:...ids)', { ids: sub_payment_ids })
          .getRawMany();
        this.logger.log(`payments: ${JSON.stringify(payments)}`);

        await Promise.all(payments.map(async (payment) => {
          // if (payment.payment_type == 'Withdrawal') {
          //   const paymentDetails = await this.paymentsRepo.findOne({
          //     where: { payment_id: payment.payment_id },
          //     select: ['retention_id'],
          //   });
          //   // this.logger.log(`fetchedPaymentDetails: ${JSON.stringify(paymentDetails)}`);

          //   if (paymentDetails && paymentDetails.retention_id) {
          //     const retentionInPaymentsList =
          //       await this.paymentsService.fetchAllRetentionInPaymentsList({
          //         company_id: payment.company_id,
          //         page_number: 1,
          //         project_id: null,
          //         contract_id: null,
          //         items_per_page: 10,
          //         status: null,
          //       });
          //     console.log(
          //       'retentionInPAymentsList ',
          //       retentionInPaymentsList,
          //     );
          //   }
          // }
          if (
            ![
              'Overpayment from client',
              'Underpayment from client',
              'Overpayment to supplier',
              'Underpayment to supplier',
              'Overpayment refund from supplier',
              'Overpayment refund to client',
            ].includes(payment?.payment_type)
          ) {
            if (payment.sub_payment_type == 'Retention In') {
              const data = {
                sub_payment_id: payment.sub_payment_id,
                payment_id: payment.payment_id,
                retained_amount: payment.amount,
                beneficiary_type: 'Current supplier' as BeneficiaryType,
                payment_type: payment.payment_type,
                retention_account: payment.retention_account,
                company_id: payment.company_id,
                status: payment.status,
                created_by: payment.company_id,
                client_supplier_id: payment.client_supplier_id,
                claim_type: payment.claim_type,
                cash_retention_type: payment.cash_retention_type,
              };
              // this.logger.log(`dataRetentionIn: ${JSON.stringify(data)}`);
              this.logger.log(
                `Function for creating retention list and retention summary called with data:  ${JSON.stringify(data)}`,
              );
              const createdRetentions =
                await this.retentionProgressionFns.createMatchedRetentionInPaymentForRetentionList(
                  transactionalEntityManager,
                  data,
                );
              // this.logger.log(`createdRetentions1: ${JSON.stringify(createdRetentions)}`);
              if (createdRetentions.status == 'ERROR')
                throw `${createdRetentions.message}`;
            } else if (
              payment.sub_payment_type == 'Payment' &&
              payment.claim_type == 'Billable' &&
              payment.cash_retention_type == 'Claim' &&
              payment.cash_retention
            ) {
              const retention_payment_details = await transactionalEntityManager
                .createQueryBuilder(SubPayments, 'sp')
                .select([
                  'sp.sub_payment_type AS sub_payment_type',
                  'sp.sub_payment_id AS sub_payment_id',
                  'sp.status AS status',
                  'sp.amount AS retained_amount',
                  'sp.payment_id AS payment_id',
                  'pd.payment_type AS payment_type',
                  'pd.company_id AS company_id',
                  'pd.client_supplier_id AS client_supplier_id',
                  'pd.retention_account AS retention_account',
                ])
                .leftJoin(PaymentDetails, 'pd', 'sp.payment_id = pd.payment_id')
                .where(`sp.payment_id = :payment_id`, {
                  payment_id: payment.payment_id,
                })
                .andWhere(
                  `sp.sub_payment_type = 'Retention In' AND sp.status = 'Auto matched'`,
                )
                .getRawOne();
              this.logger.log(
                `retention_payment_details::::transaction::: ${JSON.stringify(retention_payment_details)}`,
              );

              if (retention_payment_details) {
                const createdRetentions =
                  await this.retentionProgressionFns.createMatchedRetentionInPaymentForRetentionList(
                    transactionalEntityManager,
                    {
                      ...retention_payment_details,
                      ...{
                        beneficiary_type: 'Current supplier' as BeneficiaryType,
                        claim_type: payment.claim_type,
                        cash_retention_type: payment.cash_retention_type,
                      },
                    },
                  );
                this.logger.log(
                  `createdRetentions3:::createdRetentions3::: ${JSON.stringify(createdRetentions)}`,
                );
                if (createdRetentions.status == 'ERROR')
                  throw `${createdRetentions.message}`;
              }
            } else if (
              payment.sub_payment_type == 'Payment' &&
              payment.claim_type == 'Receivable' &&
              payment.cash_retention_type == 'Claim' &&
              payment.cash_retention
            ) {
              const retention_payment_details = await transactionalEntityManager
                .createQueryBuilder(SubPayments, 'sp')
                .select([
                  'sp.sub_payment_type AS sub_payment_type',
                  'sp.sub_payment_id AS sub_payment_id',
                  'sp.status AS status',
                  'sp.amount AS retained_amount',
                  'sp.payment_id AS payment_id',
                  'pd.payment_type AS payment_type',
                  'pd.company_id AS company_id',
                  'pd.client_supplier_id AS client_supplier_id',
                  'pd.payment_to_account AS payment_to_account',
                ])
                .leftJoin(PaymentDetails, 'pd', 'sp.payment_id = pd.payment_id')
                .where(`sp.payment_id = :payment_id`, {
                  payment_id: payment.payment_id,
                })
                .andWhere(`sp.sub_payment_type = 'Retention'`)
                .getRawOne();
              this.logger.log(
                `retention_payment_details::::transaction::: ${JSON.stringify(retention_payment_details)}`,
              );

              const createdRetentions =
                await this.retentionProgressionFns.createMatchedRetentionInPaymentForRetentionList(
                  transactionalEntityManager,
                  {
                    ...retention_payment_details,
                    ...{
                      beneficiary_type: 'Current supplier' as BeneficiaryType,
                      claim_type: payment.claim_type,
                      cash_retention_type: payment.cash_retention_type,
                    },
                  },
                );
              this.logger.log(
                `createdRetentions4:::createdRetentions4::: ${JSON.stringify(createdRetentions)}`,
              );
              if (createdRetentions.status == 'ERROR')
                throw `${createdRetentions.message}`;
            } else if (
              payment.cash_retention_type == 'Retention claim' &&
              payment.sub_payment_type == 'Payment'
            ) {
              const data = {
                associated_retention_sub_payment_id:
                  payment.associated_retention_sub_payment_id,
                retention_id: payment.retention_id,
                retention_account: payment.retention_account,
                payment_from_account: payment.payment_from_account,
                payment_to_account: payment.payment_to_account,
                payment_id: payment.payment_id,
                sub_payment_id: payment.sub_payment_id,
                payment_type: payment.payment_type,
                total_amount: payment.amount,
                beneficiary_type: 'Current supplier' as BeneficiaryType,
                created_by: payment.company_id,
                payless_amount: payment.payless_amount,
                company_id: payment.company_id,
                payment_claim_id: payment.payment_claim_id,
                claim_amount: payment.claim_amount,
                client_supplier_id: payment.client_supplier_id,
                claim_type: payment.claim_type,
                cash_retention_type: payment.cash_retention_type,
              };
              // this.logger.log(`data: ${JSON.stringify(data)}`);
              this.logger.log(
                `Function for creating retention summary called with data:  ${JSON.stringify(data)}`,
              );
              const createdRetentions =
                await this.retentionProgressionFns.createMatchedRetentionPaymentInRetentionSummary(
                  transactionalEntityManager,
                  data,
                );
              // this.logger.log(`createdRetentions3: ${JSON.stringify(createdRetentions)}`);
              if (createdRetentions.status == 'ERROR')
                throw `${createdRetentions.message}`;

              const updatedClaimCompletedStatusOfRetentions =
                await this.retentionStatusFns.updateClaimCompletedStatusOfRetention(
                  transactionalEntityManager,
                  {
                    sub_payment_id: payment.sub_payment_id,
                  },
                );
              this.logger.log(
                `updatedClaimCompletedStatusOfRetentions: ${JSON.stringify(updatedClaimCompletedStatusOfRetentions)}`,
              );
              if (updatedClaimCompletedStatusOfRetentions.status == 'ERROR')
                throw `${updatedClaimCompletedStatusOfRetentions.message}`;

              const updatedCompletionStatusOfRetentions =
                await this.retentionStatusFns.updateCompletionStatusOfRetention(
                  transactionalEntityManager,
                  {
                    retention_id: payment.retention_id,
                    payment_id: payment.payment_id,
                  },
                );
              this.logger.log(
                `updatedCompletionStatusOfRetentions: ${JSON.stringify(updatedCompletionStatusOfRetentions)}`,
              );
              if (updatedCompletionStatusOfRetentions.status == 'ERROR')
                throw `${updatedCompletionStatusOfRetentions.message}`;
            }
          }
        }));
      } else {
        const payments = await transactionalEntityManager
          .createQueryBuilder(SubPayments, 'subpayment')
          .select([
            'subpayment.id AS id',
            'subpayment.payment_id AS payment_id',
            'subpayment.amount AS amount',
            `CASE
                        WHEN subpayment.amount > 0 THEN ABS(subpayment.amount)
                          ELSE NULL
                        END AS received_amount`,
            `CASE
                        WHEN subpayment.amount < 0 THEN ABS(subpayment.amount)
                          ELSE NULL
                        END AS spent_amount`,
            'subpayment.status AS status',
            'subpayment.sub_payment_id AS sub_payment_id',
            'subpayment.sub_payment_type AS sub_payment_type',
            'payment.client_supplier_id AS client_supplier_id',
            'cs.client_supplier_name AS client_supplier_name',
            'pc.cash_retention_type AS cash_retention_type',
            'payment.company_id AS company_id',
            'pc.payment_claim_id AS payment_claim_id',
            'pc.retention_id AS retention_id',
            `CASE
                        WHEN payment.payment_type IN ( 'Interest Received',
                      'Interest Withdrawal',
                      'Bank Charge Applied',
                      'Bank Charge Top Up',
                      'Top Up',
                      'Withdrawal',
                      'Overpayment refund from supplier',
                      'Overpayment refund to client',
                      'Top Up Retention') THEN true
                          ELSE false
                        END AS is_other_payment`,
            `CASE
                        WHEN subpayment.amount > 0 THEN true
                        ELSE false
                      END AS is_receivable`,
            'payment.payment_from_account AS payment_from_account',
            'payment.payment_to_account AS payment_to_account',
            'payment.retention_account AS retention_account',
            'payment.payment_date AS payment_date',
            'payment.payment_type AS payment_type',
            // Add other fields as needed
          ])
          .leftJoin('subpayment.paymentDetails', 'payment')

          .leftJoin('payment.clientSupplierDetails', 'cs')

          .leftJoin('payment.paymentClaims', 'pc')
          .addSelect('pc.claim_type AS claim_type')
          .addSelect('pc.claim_amount AS claim_amount')

          .leftJoin('payment.paymentFromAccount', 'fromAccount')
          .addSelect('fromAccount.account_name', 'payment_from_account_name')

          .leftJoin('payment.paymentToAccount', 'toAccount')
          .addSelect('toAccount.account_name', 'payment_to_account_name')

          .leftJoin('payment.retentionAccount', 'retentionAcc')
          .addSelect('retentionAcc.account_name', 'retention_account_name')
          .where('subpayment.sub_payment_id IN (:...ids)', {
            ids: sub_payment_ids,
          })
          .getRawMany();
        for (const payment of payments) {
          if (
            ![
              'Overpayment to supplier',
              'Underpayment to supplier',
              'Overpayment from client',
              'Underpayment from client',
              'Overpayment refund from supplier',
              'Overpayment refund to client',
            ].includes(payment.payment_type)
          ) {
            if (payment.sub_payment_type == 'Retention In') {
              this.logger.log(
                `Function for deleting retention list and retention summary called with data:  ${JSON.stringify(payment.sub_payment_id)}`,
              );
              const data = {
                claim_type: payment.claim_type,
                sub_payment_id: payment.sub_payment_id,
              };
              const deletedRetentions =
                await this.retentionReversalFns.deleteRetentionInPaymentEntries(
                  transactionalEntityManager,
                  data,
                );
              if (deletedRetentions.status == 'ERROR')
                throw deletedRetentions.message;
            } else if (
              payment.sub_payment_type == 'Payment' &&
              payment.claim_type == 'Billable' &&
              payment.cash_retention_type == 'Claim'
            ) {
              this.logger.log(
                `Function for deleting retention list and retention summary called with data:  ${JSON.stringify(payment.sub_payment_id)}`,
              );
              const retention_payment_details = await this.subPaymentsRepo
                .createQueryBuilder('sp')
                .select(['sp.sub_payment_id AS sub_payment_id'])
                .leftJoin(PaymentDetails, 'pd', 'sp.payment_id = pd.payment_id')
                .where(`sp.payment_id = :payment_id`, {
                  payment_id: payment.payment_id,
                })
                .andWhere(
                  `sp.sub_payment_type = 'Retention In' AND sp.status = 'Auto matched'`,
                )
                .getRawOne();

              if (retention_payment_details) {
                const deletedRetentions =
                  await this.retentionReversalFns.deleteRetentionInPaymentEntries(
                    transactionalEntityManager,
                    {
                      ...{ claim_type: payment.claim_type },
                      ...retention_payment_details,
                    },
                  );
                if (deletedRetentions.status == 'ERROR')
                  throw deletedRetentions.message;
              }
            } else if (
              payment.sub_payment_type == 'Payment' &&
              payment.claim_type == 'Receivable' &&
              payment.cash_retention_type == 'Claim'
            ) {
              const retention_payment_details = await this.subPaymentsRepo
                .createQueryBuilder('sp')
                .select(['sp.sub_payment_id AS sub_payment_id'])
                .leftJoin(PaymentDetails, 'pd', 'sp.payment_id = pd.payment_id')
                .where(`sp.payment_id = :payment_id`, {
                  payment_id: payment.payment_id,
                })
                .andWhere(`sp.sub_payment_type = 'Retention'`)
                .getRawOne();

              const deletedRetentions =
                await this.retentionReversalFns.deleteRetentionInPaymentEntries(
                  transactionalEntityManager,
                  {
                    ...{ claim_type: payment.claim_type },
                    ...retention_payment_details,
                  },
                );
              if (deletedRetentions.status == 'ERROR')
                throw deletedRetentions.message;
            } else if (
              payment.sub_payment_type == 'Payment' &&
              payment.cash_retention_type == 'Retention claim'
            ) {
              this.logger.log(
                `Function for deleting retention summary called with data:  ${JSON.stringify(payment.sub_payment_id)}`,
              );
              const data = {
                sub_payment_id: payment.sub_payment_id,
                retention_id: payment.retention_id,
                payment_type: payment.payment_type,
                payment_id: payment.payment_id,
                payment_claim_id: payment.payment_claim_id,
              };
              // this.logger.log(`dataWhileUnmatchingRetentionPayment: ${JSON.stringify(data)}`);
              const deletedRetentions =
                await this.retentionReversalFns.deleteAllRetentionPaymentEntriesInSummaryAndList(
                  transactionalEntityManager,
                  data,
                );
              // this.logger.log(`deletedRetentions: ${JSON.stringify(deletedRetentions)}`);
              if (deletedRetentions.status == 'ERROR')
                throw `${deletedRetentions.message}`;
            }
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }
}
