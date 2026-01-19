import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentClaims, BankAccounts } from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, Between, Not } from 'typeorm';
import { AddPaymentInput } from './payments.input';
import {
  validatePresenceOfMandatoryParams,
  validatePresenceOfValidParams,
} from 'src/libs/@validators/validator';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PaymentsValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    private readonly bankAccountsService: BankAccountsService,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
  ) {
    this.logger = new PaytradeLogger('PAYMENTS_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateAddPayment(
    data: AddPaymentInput,
    timezone: string,
    user_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for validating add payment with data: ${JSON.stringify(data)}`,
      );
      const {
        company_id,
        payment_claim_id,
        payment_type,
        cash_retention,
        payment_from_account,
        payment_to_account,
        payment_amount,
        retention_amount,
        payless_amount,
        total_amount,
        payment_date,
        input_date,
        retention_id,
      } = data;
      console.log('data', data);

      const payable_payment_types = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
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

      const userMode = (await this.userDetails.findOne({ where: { user_id } }))
        .user_mode;

      /**
       //VALIDATIONS

       * The presence of payment claim details in the entity.
       * The total amount (Retention and payment) should be less than the payment claim amount if the type is Part payment.
       * Validate whether the payment date is less than the due date of the payment claim.
       * The presence of part payment advice attachment ids if the type is Part.
       * The presence of Pay Less - Full payment advice attachment ids and Pay Less - Part paymen advice attachment ids if the type is Pay Less - Full or Pay Less - Part.
       * The presence of retention payment status if the payment claim type is Retention billable.
       * Avoiding retention details if the payment claim type is not Retention billable or Retention receivable.
       * Total amount should be the sum of retention amount and payment amount.
       * Pay Less - Part type should have payless amount field.
       * Presence of mandatory params according to the type.
       
       //TO-DO
       * Check the presence of payments added before in the associated payment claim id. The sum of all the total amounts of the payments made shouldn't exceed the claim_amount of the associated payment claim.
       */

      if (
        userMode != 'Normal' &&
        [
          'Pay Less - Full',
          'Pay Less - Part',
          'Pay - Zero',
          '3rd Party',
        ].includes(payment_type) &&
        !input_date
      )
        throw `Only for onboarding mode for the related transactions requiring the input date. Please input the required input date which will be input into your journal records if different from today.`;

      // if (
      //   data.payment_date &&
      //   moment
      //     .tz(data.payment_date, timezone)
      //     .isAfter(moment.tz(timezone).startOf('day'))
      // )
      //   throw `The payment date is in the future. Please check your system date and adjust it if needed.`;
      if (
        userMode === 'Normal' &&
        data.retention_release_date &&
        moment
          .tz(data.retention_release_date, timezone)
          .isBefore(moment.tz(timezone).startOf('day'))
      )
        throw `The retention release date is in the past. Please check your system date and adjust it if needed.`;

      if (payable_payment_types.includes(payment_type)) {
        const payment_claim_details = await this.paymentClaimsRepo.findOne({
          where: { payment_claim_id: payment_claim_id },
          relations: ['contractDetails'],
        });
        console.log('payment_claim_details', payment_claim_details);
        if (!payment_claim_details)
          throw `Payment claim details not found. Please provide a valid payment_claim_id.`;

        //Checking the presence of retention id while adding a retention payment.
        if (
          payment_claim_details.cash_retention_type == 'Retention claim' &&
          !retention_id
        )
          throw `Please provide retention_id while adding a retention payment.`;

        console.log(
          new Date(payment_date),
          new Date(
            payment_claim_details.contractDetails.defect_liability_end_date,
          ),
        );
        // if (
        //   payment_claim_details.cash_retention_type === 'Retention claim' &&
        //   new Date(payment_date) <
        //     new Date(
        //       payment_claim_details?.contractDetails?.defect_liability_end_date,
        //     )
        // )
        //   throw `A payment to self can only be carried out for retention payments after the Latent defect period has ended.`;

        if (total_amount > payment_claim_details.claim_amount)
          throw `Total amount of the payment is greater than the total summary of the associated payment claim. Please provide a lesser amount in total.`;

        // if (new Date(payment_date) > new Date(payment_claim_details.due_date))
        //   throw `Payment date is exceeding the due date. Please add payment date before the due date of the payment claim.`;

        //Validating the completion of payments
        const payments = await this.paymentsRepo
          .createQueryBuilder('p')
          .select([
            'p.payment_id AS payment_id',
            'p.total_amount AS total_amount',
            'p.payless_amount AS payless_amount',
            'p.current_status AS current_status',
          ])
          .where('p.payment_claim_id = :payment_claim_id', {
            payment_claim_id,
          })
          .andWhere("p.current_status != 'Deleted'")
          .orderBy({ 'p.created_on': 'DESC' })
          .getRawMany();

        const payless_payments = payments?.filter(
          (payment) =>
            payment?.payment_type == 'Pay Less - Full' ||
            payment?.payment_type == 'Pay Less - Part',
        );

        let outstanding_amount = 0,
          outstanding_retention_amount = 0;
        if (
          payments &&
          payments.length > 0 &&
          payment_claim_details.list_status !== 'Add payment'
          // payments[0].current_status !== 'Unconfirmed - Matched' &&
          // payments[0].current_status !== 'Paid - Matched' &&
          // payments[0].current_status !== 'Received - Matched'
        ) {
          throw `Addition of payments are not allowed. Please match an existing payment associated with this claim.`;
        } else {
          let existingTotalAmount = 0,
            totalRetentionAmount = 0;

          if (payments && payments[0] !== null && payments.length > 0) {
            if (
              payment_type === 'Full' ||
              payment_type === 'Part' ||
              payment_type === 'Pay Less - Full' ||
              payment_type === 'Pay Less - Part'
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

                  console.log({ retentionDetails });

                  totalRetentionAmount += retentionDetails
                    ? parseFloat(retentionDetails?.retention_amount)
                    : 0;
                  existingTotalAmount += parseFloat(payment.total_amount);
                }
              }
              console.log('existingTotalAmount', existingTotalAmount);
              outstanding_amount = payless_payments.length
                ? payless_payments[0].payless_amount - existingTotalAmount
                : payment_claim_details.claim_amount - existingTotalAmount;
              outstanding_retention_amount =
                payment_claim_details?.retention_amount_with_gst -
                totalRetentionAmount;
            }
          } else {
            outstanding_amount = payment_claim_details.claim_amount;
            outstanding_retention_amount =
              payment_claim_details?.retention_amount_with_gst;
          }
        }
        console.log('outstanding_amount', outstanding_amount);

        // if (outstanding_amount <= 0)
        //   throw `Payments associated with this claim has been completed and closed.`;

        const genericMandatoryParams = [
          'company_id',
          'payment_claim_id',
          'project_id',
          'contract_id',
          'client_supplier_id',
          'memo',
          'input_date',
          'withhold_payment_reason',
        ];
        let validParams;
        let mandatoryParams;
        if (payment_claim_details.claim_type == 'Billable' && !cash_retention) {
          // if (payment_type !== 'Pay - Zero' && payment_type !== '3rd Party') {
          //   if (payment_amount != total_amount)
          //     throw `Payment amount and total amount should be equal.`;
          // }

          if (payment_type == 'Full') {
            if (total_amount != payment_claim_details.claim_amount)
              throw `The Total amount for a full payment must be equal to the Claim amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'payment_amount',
              'total_amount',
              'payment_date',
              'is_paid_confirmed',
            ];
          } else if (payment_type == 'Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a part payment must be less than the Claim amount or this is a Full Payment.`;

            // if (total_amount > outstanding_amount)
            //   throw `This total payment will pay a combined total more than the original claim amount. Please adjust the payment amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'payment_amount',
              'total_amount',
              'payment_date',
              'is_paid_confirmed',
            ];
          } else if (payment_type == 'Pay Less - Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less part payment must be less than the Claim amount.`;

            console.log('payments', payments);
            // if (
            //   payments &&
            //   payments.length &&
            //   payments[0].payless_amount !== payless_amount
            // )
            //   throw `The payless amount for the previous and current payment must be same.`;

            // if (total_amount > outstanding_amount)
            //   throw `The Total amount for a pay less payment must be less than the Part Payment Outstanding Amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'payless_amount',
              'payment_amount',
              'total_amount',
              'payment_date',
              'is_paid_confirmed',
            ];
          } else if (payment_type == 'Pay Less - Full') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less payment must be less than the Claim amount or please carry out a full payment.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'payment_amount',
              'payless_amount',
              'total_amount',
              'payment_date',
              'is_paid_confirmed',
            ];
          } else if (payment_type == 'Pay - Zero') {
            mandatoryParams = [
              'payment_type',
              'payment_from_account',
              'total_amount',
            ];
          } else if (payment_type == '3rd Party') {
            mandatoryParams = [
              'payment_type',
              'payment_from_account',
              'total_amount',
              'third_party_payment_reason',
            ];
          }
        } else if (
          payment_claim_details.claim_type == 'Receivable' &&
          !cash_retention
        ) {
          if (payment_type !== 'Pay - Zero' && payment_type !== '3rd Party') {
            // if (payment_amount != total_amount)
            //   throw `Payment amount and total amount should be equal.`;
          }

          if (payment_type == 'Full') {
            if (total_amount != payment_claim_details.claim_amount)
              throw `The Total amount for a full payment must be equal to the Claim amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'is_received_confirmed',
              'payment_amount',
              'payment_date',
              'total_amount',
            ];
          } else if (payment_type == 'Part') {
            if (total_amount >= payment_claim_details.claim_amount)
              throw `The Total amount for a part payment must be less than the Claim amount or this is a Full Payment.`;

            // if (total_amount > outstanding_amount)
            //   throw `This total payment will pay a combined total more than the original claim amount. Please adjust the payment amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'payment_amount',
              'is_received_confirmed',
              'payment_date',
              'total_amount',
            ];
          } else if (payment_type == 'Pay Less - Full') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less payment must be less than the Claim amount or please carry out a full payment.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'payless_amount',
              'payment_amount',
              'is_received_confirmed',
              'payment_date',
              'total_amount',
            ];
          } else if (payment_type == 'Pay Less - Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less part payment must be less than the Claim amount.`;

            // if (
            //   payments &&
            //   payments.length &&
            //   Number(payments[0].payless_amount) !== Number(payless_amount)
            // )
            //   throw `The payless amount for the previous and current payment must be same.`;

            // if (total_amount > outstanding_amount)
            //   throw `The Total amount for a pay less payment must be less than the Part Payment Outstanding Amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'is_received_confirmed',
              'payless_amount',
              'payment_amount',
              'payment_date',
              'total_amount',
            ];
          } else if (payment_type == 'Pay - Zero') {
            mandatoryParams = [
              'payment_type',
              'payment_to_account',
              'total_amount',
            ];
          } else if (payment_type == '3rd Party') {
            mandatoryParams = [
              'payment_type',
              'payment_to_account',
              'total_amount',
            ];
          }
        } else if (
          payment_claim_details.claim_type == 'Billable' &&
          cash_retention
        ) {
          console.log('paymentt_amount', payment_amount);
          console.log('retention_amount', retention_amount);
          console.log('totall_amount', total_amount);
          console.log(
            'result',
            Number((payment_amount + retention_amount).toFixed(2)),
          );
          console.log('typeof payment_amount', typeof payment_amount);
          console.log('typeof retention_amount', typeof retention_amount);
          console.log('typeof total_amount', typeof total_amount);
          if (payment_type !== 'Pay - Zero' && payment_type !== '3rd Party') {
            // if (
            //   Number((payment_amount + retention_amount).toFixed(2)) !==
            //   total_amount
            // )
            //   throw `Sum of payment amount and retention amount should be equal to total amount.`;
          }

          if (payment_type == 'Full') {
            // if (total_amount != payment_claim_details.claim_amount)
            //   throw `The Total amount for a full payment must be equal to the Claim amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'retention_amount',
              'total_amount',
              'retention_account',
              'retention_release_date',
              'is_paid_confirmed',
              'is_retention_confirmed',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a part payment must be less than the Claim amount or this is a Full Payment.`;

            // if (total_amount > outstanding_amount)
            //   throw `This total payment will pay a combined total more than the original claim amount. Please adjust the payment amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'total_amount',
              'retention_amount',
              'retention_account',
              'retention_release_date',
              'is_paid_confirmed',
              'is_retention_confirmed',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay Less - Part') {
            if (total_amount >= payment_claim_details.claim_amount)
              throw `The Total amount for a pay less part payment must be less than the Claim amount.`;

            if (
              payments &&
              payments.length &&
              Number(payments[0].payless_amount) !== Number(payless_amount)
            )
              throw `The payless amount for the previous and current payment must be same.`;

            if (total_amount > outstanding_amount)
              throw `The Total amount for a pay less payment must be less than the Part Payment Outstanding Amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'retention_amount',
              'retention_account',
              'total_amount',
              'retention_release_date',
              'is_paid_confirmed',
              'is_retention_confirmed',
              'payless_amount',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay Less - Full') {
            if (total_amount >= payment_claim_details.claim_amount)
              throw `The Total amount for a pay less payment must be less than the Claim amount or please carry out a full payment.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_from_account',
              'payment_to_account',
              'retention_amount',
              'retention_account',
              'total_amount',
              'retention_release_date',
              'is_paid_confirmed',
              'is_retention_confirmed',
              'payless_amount',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay - Zero') {
            mandatoryParams = [
              'payment_type',
              'payment_from_account',
              'total_amount',
            ];
          } else if (payment_type == '3rd Party') {
            mandatoryParams = [
              'payment_type',
              'payment_from_account',
              'total_amount',
              'third_party_payment_reason',
            ];
          }
        } else if (
          payment_claim_details.claim_type == 'Receivable' &&
          cash_retention
        ) {
          if (payment_type !== 'Pay - Zero' && payment_type !== '3rd Party') {
            // if (payment_amount + retention_amount != total_amount)
            //   throw `Sum of payment amount and retention amount should be equal to total amount.`;
          }

          if (payment_type == 'Full') {
            // if (total_amount != payment_claim_details.claim_amount)
            //   throw `The Total amount for a full payment must be equal to the Claim amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'retention_amount',
              'is_received_confirmed',
              'total_amount',
              'retention_release_date',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a part payment must be less than the Claim amount or this is a Full Payment.`;

            // if (total_amount > outstanding_amount)
            //   throw `This total payment will pay a combined total more than the original claim amount. Please adjust the payment amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'retention_amount',
              'is_received_confirmed',
              'total_amount',
              'retention_release_date',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay Less - Full') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less payment must be less than the Claim amount or please carry out a full payment.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'retention_amount',
              'is_received_confirmed',
              'total_amount',
              'retention_release_date',
              'payless_amount',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay Less - Part') {
            // if (total_amount >= payment_claim_details.claim_amount)
            //   throw `The Total amount for a pay less part payment must be less than the Claim amount.`;

            // if (
            //   payments &&
            //   payments.length &&
            //   Number(payments[0].payless_amount) !== Number(payless_amount)
            // )
            //   throw `The payless amount for the previous and current payment must be same.`;

            // if (total_amount > outstanding_amount)
            //   throw `The Total amount for a pay less payment must be less than the Part Payment Outstanding Amount.`;

            mandatoryParams = [
              'payment_type',
              'cash_retention',
              'payment_to_account',
              'retention_amount',
              'is_received_confirmed',
              'total_amount',
              'retention_release_date',
              'payless_amount',
              'payment_amount',
              'payment_date',
            ];
          } else if (payment_type == 'Pay - Zero') {
            mandatoryParams = [
              'payment_type',
              'payment_to_account',
              'total_amount',
            ];
          } else if (payment_type == '3rd Party') {
            mandatoryParams = [
              'payment_type',
              'payment_to_account',
              'total_amount',
            ];
          }
        }
        if (retention_id) mandatoryParams.push('retention_id');
        validParams = genericMandatoryParams.concat(mandatoryParams);
        await validatePresenceOfMandatoryParams(validParams, data);
        await validatePresenceOfValidParams(validParams, data);
      } else if (other_payment_types.includes(payment_type)) {
        //other payments
        const genericMandatoryParams = [
          'company_id',
          'payment_type',
          'payment_amount',
          'payment_date',
          'total_amount',
        ];
        const optionalParams = ['input_date'];
        let validParams, mandatoryParams;
        if (payment_type == 'Interest Received') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'memo',
          ];
        } else if (payment_type == 'Interest Withdrawal') {
          mandatoryParams = [
            'payment_from_account',
            'payment_to_account',
            'is_paid_confirmed',
          ];

          const currentPaymentDate = new Date(payment_date);
          const oneYearAgo = new Date(currentPaymentDate);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          const recent_payments = await this.paymentsRepo.find({
            where: {
              company_id,
              payment_from_account,
              payment_type,
              payment_date: Between(oneYearAgo, currentPaymentDate),
              current_status: Not('Deleted'),
            },
            select: ['payment_date', 'payment_type'],
          });

          const account_details = await this.bankAccountsRepo.findOne({
            where: { bank_account_id: payment_from_account },
            select: ['opening_date', 'account_type'],
          });
          const accountCreationDate = new Date(account_details.opening_date);
          const oneYearAfterCreation = new Date(accountCreationDate);
          oneYearAfterCreation.setFullYear(
            oneYearAfterCreation.getFullYear() + 1,
          );

          if (account_details.account_type === 'Cash Account')
            throw `Interest can only be withdrawn from a Bank/Trust Account with type Retention or Project Trust Account.`;

          if (
            recent_payments.length > 0 ||
            currentPaymentDate < oneYearAfterCreation
          ) {
            throw `As per the legislation, you are only permitted to withdraw account interest once per year.
              You must wait for a year to pass from the account opening or the last interest withdrawal before proceeding`;
          }

          const interest_charges_sum =
            await this.bankAccountsService.calculateInterestChargesSum(
              payment_from_account,
            );
          if (interest_charges_sum && interest_charges_sum < 0)
            throw `At present you have a negative interest balance and are unable to withdraw interest from the account. Please instead proceed with a Bank Charge Top up and pay the required amount into the bank account.`;
        } else if (payment_type == 'Bank Charge Applied') {
          mandatoryParams = ['payment_from_account', 'is_paid_confirmed'];
        } else if (payment_type == 'Bank Charge Top Up') {
          mandatoryParams = ['payment_to_account', 'is_received_confirmed'];
          const interest_charges_sum =
            await this.bankAccountsService.calculateInterestChargesSum(
              payment_to_account,
            );
          if (interest_charges_sum && interest_charges_sum > 0)
            throw `At present you have a positive interest/charge balance associated with this account. There is no need to proceed with a Bank Charge Top Up.`;
        } else if (payment_type == 'Overpayment refund from supplier') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'associated_overpayment_id',
            'memo',
          ];
        } else if (payment_type == 'Overpayment refund to client') {
          mandatoryParams = [
            'payment_from_account',
            'is_paid_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'associated_overpayment_id',
            'memo',
          ];
        } else if (payment_type == 'Overpayment to supplier') {
          mandatoryParams = [
            'payment_from_account',
            'is_paid_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'memo',
          ];
        } else if (payment_type == 'Underpayment to supplier') {
          mandatoryParams = [
            'payment_from_account',
            'is_paid_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'memo',
          ];
        } else if (payment_type == 'Overpayment from client') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'memo',
          ];
        } else if (payment_type == 'Underpayment from client') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'project_id',
            'client_supplier_id',
            'payment_claim_id',
            'associated_payment_id',
            'memo',
          ];
        } else if (payment_type == 'Top Up Retention') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'project_id',
            'client_supplier_id',
          ];
        } else if (payment_type == 'Top Up') {
          mandatoryParams = [
            'payment_to_account',
            'is_received_confirmed',
            'memo',
          ];
        } else if (payment_type == 'Withdrawal') {
          mandatoryParams = [
            'payment_to_account',
            'payment_from_account',
            'is_paid_confirmed',
            'memo',
            'retention_id',
          ];
          //validation needs to be added
          //Can only process a Withdrawal when all other claims and payments have been processed and marked in a completed status.
        }
        validParams = genericMandatoryParams.concat(mandatoryParams).concat(optionalParams);
        await validatePresenceOfMandatoryParams(genericMandatoryParams.concat(mandatoryParams), data);
        await validatePresenceOfValidParams(validParams, data);
      } else {
        throw `Payment type is mandatory.`;
      }
      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating add payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
