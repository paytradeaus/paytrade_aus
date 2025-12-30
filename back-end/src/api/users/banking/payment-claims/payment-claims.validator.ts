import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AddPaymentClaimInput,
  EditDetailsOfAPaymentClaimInput,
  FetchAllPaymentClaimsOfACompanyInput,
} from './payment-claims.input';
import { validatePresenceOfMandatoryParams } from 'src/libs/@validators/validator';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentClaims } from 'src/entities/banking.entity';
import { Repository } from 'typeorm';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PaymentClaimsValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(VariationDetails)
    private variationsRepo: Repository<VariationDetails>,
    @InjectRepository(ContractDetails)
    private contractsRepo: Repository<ContractDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
  ) {
    this.logger = new PaytradeLogger('PAYMENT_CLAIMS_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateAddPaymentClaim(
    data: AddPaymentClaimInput,
    timezone: string,
    user_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for validating add payment claims with data: ${JSON.stringify(data)}`,
      );
      const {
        compulsory_attachment_ids,
        claim_type,
        client_supplier_type,
        client_supplier_id,
        cash_retention_type,
        status,
        memo,
        invoices,
        claim_amount,
        project_id,
        contract_id,
        associated_retention_sub_payment_id,
        is_gst_optional,
      } = data;
      console.log('data', data);

      const userMode = (await this.userDetails.findOne({ where: { user_id } }))
        .user_mode;

      if (
        data.received_date &&
        moment(data.received_date).format('YYYY-MM-DD') >
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The received date is in the future. Please check your system date and adjust it if needed.`;
      }

      if (
        data.sent_date &&
        moment(data.sent_date).format('YYYY-MM-DD') >
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The sent date is in the future. Please check your system date and adjust it if needed.`;
      }

      if (
        userMode === 'Normal' &&
        data.due_date &&
        moment(data.due_date).format('YYYY-MM-DD') <
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The due date is in the past. Please check your system date and adjust it if needed.`;
      }

      if (status != 'Draft') {
        //Accepting only alpha numeric characters in memo.
        const regexForMemo = /^[a-zA-Z0-9. ]*$/;
        if (!regexForMemo.test(memo))
          throw `Invalid input. Expecting only alpha numberic characters including a-zA-Z0-9 in Memo.`;

        if (
          cash_retention_type == 'Claim' &&
          is_gst_optional == true &&
          (!invoices || !invoices.length)
        )
          throw `Invoices not found. Please add an invoice for creating a payment claim.`;

        if (
          cash_retention_type == 'Retention claim' &&
          !associated_retention_sub_payment_id
        )
          throw `Missing associated retention sub payment id.`;

        if (!client_supplier_id || !client_supplier_type)
          throw `Missing client supplier id or client supplier type.`;

        const subTotalSummaries = [];
        const gsts = [];
        const totalSummaries = [];

        if (invoices.length) {
          for (let invoice of invoices) {
            subTotalSummaries.push(invoice.quantity * invoice.unit_price);
            gsts.push(invoice.gst);
            totalSummaries.push(invoice.total_amount_including_gst);
          }

          const expectedCalculations = {
            subTotalSummary: subTotalSummaries.reduce(
              (acc, curr) => acc + curr,
              0,
            ),
            gsts: gsts.reduce((acc, curr) => acc + curr, 0),
            totalSummary: totalSummaries.reduce((acc, curr) => acc + curr, 0),
          };
          console.log('expectedCalculations', expectedCalculations);

          //Total amount inclusive of GST.
          if (claim_amount != expectedCalculations.totalSummary)
            throw `Invalid data. Provided Total summary is invalid. Please calculate it again.`;
        }

        //Validate whether the sum of claim amounts of all payment claims is exceeding the head contract sum of the project.
        /**ALGORITHMS
           Fetching the claim amounts of all the claims created under a project. 
           Fetching all the variation amounts of variations associated with the projects with the status of Agreed.
           Fetch the initial contract sum of the project for which the claim has been added.

           Check whether the sum of all claim amounts and variation amounts is greater than head contract sum.
           Throw validation error if the condition is satisfied, else continue;
        /** */
        const validClaimStatuses = [
          'Draft',
          'Confirmed',
          'No Match Required',
          'Unconfirmed - Unmatched',
          'Unconfirmed - Matched',
          'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
          'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
          'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
          'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
          'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched',
          'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched',
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

        const fetchedClaimAmounts = await this.paymentClaimsRepo
          .createQueryBuilder('pc')
          .select(['pc.claim_amount AS claim_amount'])
          .where('pc.contract_id = :contract_id', { contract_id })
          .where('pc.status IN(:...validClaimStatuses)', { validClaimStatuses })
          .getRawMany();

        if (fetchedClaimAmounts && fetchedClaimAmounts.length) {
          //Total claim amounts calculation
          const claimAmounts = [];
          for (let claimDetails of fetchedClaimAmounts) {
            claimAmounts.push(Number(claimDetails.claim_amount));
          }
          const totalClaimAmount = claimAmounts.reduce(
            (acc, curr) => acc + curr,
            0,
          );

          //Total variation amounts calculation
          const fetchedAllVariationAmounts = await this.variationsRepo
            .createQueryBuilder('v')
            .select(['v.variation_amount AS variation_amount'])
            .where('v.contract_id = :contract_id', { contract_id })
            .andWhere('v.variation_status = :variation_status', {
              variation_status: 'Agreed',
            })
            .getRawMany();
          console.log('fetchedAllVariationAmounts', fetchedAllVariationAmounts);

          let totalVariationAmount;
          if (fetchedAllVariationAmounts && fetchedAllVariationAmounts.length) {
            const allVariationAmounts = [];
            for (let variationDetails of fetchedAllVariationAmounts) {
              allVariationAmounts.push(variationDetails.variation_amount);
            }
            totalVariationAmount = allVariationAmounts.reduce(
              (acc, curr) => acc + curr,
              0,
            );
            console.log('allVariationAmounts', allVariationAmounts);
          } else {
            totalVariationAmount = 0;
          }
          console.log('totalVariationAmount', totalVariationAmount);

          //Fetching the head contract sum
          const contractDetails = await this.contractsRepo
            .createQueryBuilder('c')
            .select(['c.initial_contract_sum AS initial_contract_sum'])
            .where('c.contract_id = :contract_id', { contract_id })
            .getRawOne();

          if (!contractDetails) throw `Contract details not found.`;
          const initialContractSum = contractDetails.initial_contract_sum;
          const pendingContractAmount =
            initialContractSum + totalVariationAmount - totalClaimAmount;
          console.log('pendingContractAmount', pendingContractAmount);

          // if (totalClaimAmount > initialContractSum + totalVariationAmount)
          // if (claim_amount > pendingContractAmount)
          //   throw `The claim amount must not exceed the contract amount.`;
        }

        //Presence of supporting statement attachment.
        // if (claim_type == 'Receivable') {
        //   if (!compulsory_attachment_ids || !compulsory_attachment_ids.length)
        //     throw `Missing Supporting statement attachment ids.`;
        // }

        let mandatoryParams;
        if (
          claim_type == 'Billable' &&
          (cash_retention_type == 'Claim' || 'Retention claim')
        ) {
          mandatoryParams = [
            'client_supplier_type',
            'received_date',
            'optional_supporting_statement_attachment_ids',
          ];

          await validatePresenceOfMandatoryParams(mandatoryParams, data);

          if (client_supplier_type == 'Client')
            throw `Invalid data. Client is not accepted for types - Payment Billable. & Retention Billable.`;
        } else if (
          claim_type == 'Receivable' &&
          (cash_retention_type == 'Claim' || 'Retention claim')
        ) {
          mandatoryParams = [
            'client_supplier_type',
            'sent_date',
            // 'compulsory_attachment_ids',
          ];

          await validatePresenceOfMandatoryParams(mandatoryParams, data);

          if (client_supplier_type == 'Supplier')
            throw `Invalid data. Supplier is not accepted for types - Payment Receivable. & Retention Receivable.`;
        }
      }
      return data;
    } catch (error) {
      this.logger.error(`${error}`);
      throw new Error(error);
    }
  }

  async validateEditDetailsOfAPaymentClaim(
    data: EditDetailsOfAPaymentClaimInput,
    timezone: string,
    user_id: number,
  ) {
    try {
      this.logger.log(
        `Request received for validating edit details of a payment claim with data: ${JSON.stringify(data)}`,
      );

      const userMode = (await this.userDetails.findOne({ where: { user_id } }))
        .user_mode;

      const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
        where: { payment_claim_id: data.payment_claim_id },
        select: ['status'],
      });

      if (!paymentClaimDetails)
        throw `Invalid input. Payment claim not found. Please provide a valid payment claim id.`;

      if (
        paymentClaimDetails.status != 'Draft' &&
        paymentClaimDetails.status != 'Confirmed'
      ) {
        throw `Payment claims with the status of ${paymentClaimDetails.status} cannot be edited.`;
      }

      if (
        data.received_date &&
        moment(data.received_date).format('YYYY-MM-DD') >
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The received date is in the future. Please check your system date and adjust it if needed.`;
      }
      if (
        data.sent_date &&
        moment(data.sent_date).format('YYYY-MM-DD') >
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The sent date is in the future. Please check your system date and adjust it if needed.`;
      }
      if (
        userMode === 'Normal' &&
        data.due_date &&
        moment(data.due_date).format('YYYY-MM-DD') <
          moment().tz(timezone).format('YYYY-MM-DD')
      ) {
        throw `The due date is in the past. Please check your system date and adjust it if needed.`;
      }

      if (data.status != 'Deleted' && 'Draft') {
        const validClaimStatuses = [
          'Draft',
          'Confirmed',
          'No Match Required',
          'Unconfirmed - Unmatched',
          'Unconfirmed - Matched',
          'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
          'Unconfirmed - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
          'Unconfirmed - Payment Unmatched - Retention Out Matched - Retention In Matched',
          'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
          'Unconfirmed - Payment Matched - Retention Out Matched - Retention In Unmatched',
          'Unconfirmed - Payment Matched - Retention Out Unmatched - Retention In Matched',
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

        const fetchedClaimAmounts = await this.paymentClaimsRepo
          .createQueryBuilder('pc')
          .select(['pc.claim_amount AS claim_amount'])
          .where('pc.contract_id = :contract_id', {
            contract_id: data.contract_id,
          })
          .where('pc.status IN(:...validClaimStatuses)', { validClaimStatuses })
          .getRawMany();

        if (fetchedClaimAmounts && fetchedClaimAmounts.length) {
          //Total claim amounts calculation
          const claimAmounts = [];
          for (let claimDetails of fetchedClaimAmounts) {
            claimAmounts.push(Number(claimDetails.claim_amount));
          }
          const totalClaimAmount = claimAmounts.reduce(
            (acc, curr) => acc + curr,
            0,
          );
          console.log('claimAmounts', claimAmounts);
          console.log('totalClaimAmount', totalClaimAmount);

          //Total variation amounts calculation
          const fetchedAllVariationAmounts = await this.variationsRepo
            .createQueryBuilder('v')
            .select(['v.variation_amount AS variation_amount'])
            .where('v.contract_id = :contract_id', {
              contract_id: data.contract_id,
            })
            .andWhere('v.variation_status = :variation_status', {
              variation_status: 'Agreed',
            })
            .getRawMany();
          console.log('fetchedAllVariationAmounts', fetchedAllVariationAmounts);

          let totalVariationAmount;
          if (fetchedAllVariationAmounts && fetchedAllVariationAmounts.length) {
            const allVariationAmounts = [];
            for (let variationDetails of fetchedAllVariationAmounts) {
              allVariationAmounts.push(variationDetails.variation_amount);
            }
            totalVariationAmount = allVariationAmounts.reduce(
              (acc, curr) => acc + curr,
              0,
            );
            console.log('allVariationAmounts', allVariationAmounts);
          } else {
            totalVariationAmount = 0;
          }
          console.log('totalVariationAmount', totalVariationAmount);

          //Fetching the head contract sum
          const contractDetails = await this.contractsRepo
            .createQueryBuilder('c')
            .select(['c.initial_contract_sum AS initial_contract_sum'])
            .where('c.contract_id = :contract_id', {
              contract_id: data.contract_id,
            })
            .getRawOne();

          if (paymentClaimDetails.status != 'Draft') {
            if (!contractDetails) throw `Contract details not found.`;
            const initialContractSum = contractDetails.initial_contract_sum;
            const pendingContractAmount =
              initialContractSum + totalVariationAmount - totalClaimAmount;
            console.log('pendingContractAmount', pendingContractAmount);
          }
        }
      }
      return data;
    } catch (error) {
      this.logger.error(`${error}`);
      throw new Error(error);
    }
  }

  async validateFetchAllPaymentClaims(
    data: FetchAllPaymentClaimsOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for validating fetch all payment claims with data: ${JSON.stringify(data)}`,
      );
      const { claim_type, cash_retention_type } = data;
      const validPaymentClaimTypes = ['Receivable', 'Billable'];
      const validCashRetentionTypes = ['Claim', 'Retention claim'];

      if (claim_type && !validPaymentClaimTypes.includes(claim_type))
        throw `Invalid data. Provided Payment claim type is invalid.`;
      if (
        cash_retention_type &&
        !validCashRetentionTypes.includes(cash_retention_type)
      )
        throw `Invalid data. Provided Cash retention type is invalid.`;
      return data;
    } catch (error) {
      this.logger.error(`${error}`);
      throw new Error(error);
    }
  }
}
