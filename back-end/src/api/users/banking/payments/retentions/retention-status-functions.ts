import { InjectRepository } from '@nestjs/typeorm';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { EntityManager, Repository } from 'typeorm';
import {
  IUpdateClaimCompletedStatusOfRetention,
  IUpdateRetentionStatus,
} from './retention-functions.interfaces';
import { Injectable } from '@nestjs/common';
import { PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';

@Injectable()
export class RetentionStatusFunctions {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('RETENTION_STATUS_FUNCTIONS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async updateClaimCompletedStatusOfRetention(
    transactionalEntityManager: EntityManager,
    data: IUpdateClaimCompletedStatusOfRetention,
  ) {
    try {
      this.logger.log(
        `Request received for updating the claim completed status of retention with data: ${JSON.stringify(data)}`,
      );

      const { sub_payment_id } = data;
      
      // First check if the sub_payment exists (using transaction manager to see uncommitted data)
      const subPaymentExists = await transactionalEntityManager.findOne(SubPayments, {
        where: { sub_payment_id: sub_payment_id as any },
      });
      this.logger.log(`subPaymentExists: ${JSON.stringify(subPaymentExists)}`);
      
      if (!subPaymentExists) {
        this.logError(`Sub payment with ID ${sub_payment_id} does not exist in database`);
        return framedResponse(
          'ERROR',
          `Sub payment with ID ${sub_payment_id} does not exist`,
        );
      }
      
      // Use transactionalEntityManager to query within the same transaction
      const payment_details = await transactionalEntityManager
        .createQueryBuilder(SubPayments, 'sp')
        .select([
          'pd.payment_type AS payment_type',
          'pd.payment_claim_id AS payment_claim_id',
          'pc.retention_id AS retention_id',
        ])
        .leftJoin(PaymentDetails, 'pd', 'sp.payment_id = pd.payment_id')
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = pd.payment_claim_id',
        )
        .where('sp.sub_payment_id = :sub_payment_id', { sub_payment_id })
        .getRawOne();
      this.logger.log(`payment_details: ${JSON.stringify(payment_details)}`);

      // Check if payment_details exists before accessing properties
      if (!payment_details) {
        this.logError(`No payment details found for sub_payment_id: ${sub_payment_id}. SubPayment exists but join query returned no results.`);
        return framedResponse(
          'ERROR',
          `No payment details found for sub_payment_id: ${sub_payment_id}`,
        );
      }

      //Update the status of retention list entry if the payment type is Pay Less - Full or Pay Less - Part.
      if (
        payment_details.payment_type == 'Pay Less - Full' ||
        payment_details.payment_type == 'Full'
      ) {
        this.logger.log('------3');
        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionDetails)
          .set({
            retention_status: 'Claim completed',
          })
          .where('retention_id = :retention_id', {
            retention_id: payment_details.retention_id,
          })
          .execute();
        this.logger.log('------2');
      } else if (payment_details.payment_type == 'Pay Less - Part') {
        const payless_part_payment_details = await transactionalEntityManager
          .createQueryBuilder(PaymentDetails, 'pd')
          .select([
            'pc.retention_id AS retention_id',
            'pc.claim_amount AS claim_amount',
            'pd.total_amount AS payment_amount',
            'pd.payless_amount AS payless_amount',
          ])
          .leftJoin(
            PaymentClaims,
            'pc',
            'pc.payment_claim_id = pd.payment_claim_id',
          )
          .where('pd.payment_claim_id = :payment_claim_id', {
            payment_claim_id: payment_details.payment_claim_id,
          })
          .getRawMany();
        this.logger.log(
          `payless_part_payment_details: ${JSON.stringify(payless_part_payment_details)}`,
        );

        const payment_amounts = [];
        let payless_amount;

        for (const payment of payless_part_payment_details) {
          this.logger.log(`payment: ${JSON.stringify(payment)}`);
          payment_amounts.push(Number(payment.payment_amount));
          payless_amount = Number(payment.payless_amount);
        }

        const total_payment_amounts = payment_amounts.reduce(
          (acc, curr) => acc + curr,
          0,
        );
        this.logger.log(`total_payment_amounts: ${JSON.stringify(total_payment_amounts)}`);
        this.logger.log(`payless_amount: ${JSON.stringify(payless_amount)}`);

        //Update the status as Claim completed if sum of all the payment amounts is equal to claim amount.
        if (payless_amount == total_payment_amounts) {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionDetails)
            .set({
              retention_status: 'Claim completed',
            })
            .where('retention_id = :retention_id', {
              retention_id: payless_part_payment_details[0].retention_id,
            })
            .execute();
        }
      } else if (payment_details.payment_type == 'Part') {
        const part_payment_details = await transactionalEntityManager
          .createQueryBuilder(PaymentDetails, 'pd')
          .select([
            'pc.claim_amount AS claim_amount',
            'pd.total_amount AS payment_amount',
            'pd.payless_amount AS payless_amount',
          ])
          .leftJoin(
            PaymentClaims,
            'pc',
            'pc.payment_claim_id = pd.payment_claim_id',
          )
          .where('pd.payment_claim_id = :payment_claim_id', {
            payment_claim_id: payment_details.payment_claim_id,
          })
          .getRawMany();
        this.logger.log(`part_payment_details: ${JSON.stringify(part_payment_details)}`);

        const payment_amounts = [];

        part_payment_details.forEach((pp) =>
          payment_amounts.push(Number(pp.payment_amount)),
        );

        const total_payment_amounts = payment_amounts.reduce(
          (acc, curr) => acc + curr,
          0,
        );
        this.logger.log(`total_payment_amounts: ${JSON.stringify(total_payment_amounts)}`);

        //Update the status as Claim completed if sum of all the payment amounts is equal to claim amount.
        if (part_payment_details[0].claim_amount == total_payment_amounts) {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionDetails)
            .set({
              retention_status: 'Claim completed',
            })
            .where('retention_id = :retention_id', {
              retention_id: payment_details.retention_id,
            })
            .execute();
        }
      }
      return framedResponse(
        'SUCCESS',
        'Status of retentions updated successfully.',
      );
    } catch (error) {
      this.logger.error(
        `Errored while updating the claim completed status of retention with message: ${error}`,
      );
      return framedResponse('ERROR', `${error}`);
    }
  }

  async updateCompletionStatusOfRetention(
    transactionalEntityManager,
    data: IUpdateRetentionStatus,
  ) {
    // Use the passed transactionalEntityManager directly to stay within the same transaction
    try {
      this.logger.log(
        `Request received for updating the retention status with data: ${JSON.stringify(data)}`,
      );

      //Fetched retention IN payment.
      const retention_in_payment = await transactionalEntityManager
        .createQueryBuilder(RetentionDetails, 'rd')
        .select([
          'rd.beneficiary_type AS beneficiary_type',
          'rd.retention_id AS retention_id',
          'rd.retained_amount AS retained_amount',
        ])
        .where('rd.retention_id = :retention_id', {
          retention_id: data.retention_id,
        })
        .andWhere(`rd.retention_status != 'Deleted'`)
        .getRawOne();

      //Check presence of claims.
      const presence_of_claims = await transactionalEntityManager
        .createQueryBuilder(PaymentClaims, 'pc')
        .select([
          'pc.status AS status, pc.claim_amount AS claim_amount',
          'pc.payment_claim_id AS payment_claim_id',
        ])
        .where(`pc.retention_id = :retention_id`, {
          retention_id: retention_in_payment.retention_id,
        })
        .andWhere(`pc.status != 'Deleted'`)
        .orderBy('pc.created_on', 'DESC')
        .getRawMany();
      this.logger.log(`presence_of_claims: ${JSON.stringify(presence_of_claims)}`);

      if (presence_of_claims && presence_of_claims.length) {
        const claim_amounts = [];
        const matched_payment_amounts = [];

        for (const claim of presence_of_claims) {
          claim_amounts.push(Number(claim.claim_amount));

          const presence_of_payments = await transactionalEntityManager
            .createQueryBuilder(PaymentDetails, 'p')
            .select([
              'p.total_amount AS amount',
              'p.current_status AS current_status',
              'p.payless_amount AS payless_amount',
              'p.payment_type AS payment_type',
            ])
            .where('p.payment_claim_id = :payment_claim_id', {
              payment_claim_id: claim.payment_claim_id,
            })
            .andWhere(`p.current_status != 'Deleted'`)
            .getRawMany();
          this.logger.log(`presence_of_payments: ${JSON.stringify(presence_of_payments)}`);

          if (presence_of_payments && presence_of_payments.length) {
            for (const payment of presence_of_payments) {
              if (
                [
                  'Unconfirmed - Matched',
                  'Paid - Matched',
                  'Received - Matched',
                  'Paid - Unmatched',
                  'Received - Unmatched',
                ].includes(payment.current_status) &&
                payment.payment_type != `Pay - Zero`
              ) {
                const payment_amount =
                  payment.payment_type == 'Pay Less - Full'
                    ? Number(payment.payless_amount) +
                      (Number(claim.claim_amount) -
                        Number(payment.payless_amount))
                    : Number(payment.amount);
                matched_payment_amounts.push(payment_amount);
              }
            }
          }
        }

        const sum_of_total_payment_amounts = matched_payment_amounts.reduce(
          (acc, curr) => acc + curr,
          0,
        );
        const sum_of_claim_amounts = claim_amounts.reduce(
          (acc, curr) => acc + curr,
          0,
        );
        this.logger.log(
          `sum_of_total_payment_amount: ${sum_of_total_payment_amounts}`,
        );
        this.logger.log(`sum_of_claim_amounts: ${JSON.stringify(sum_of_claim_amounts)}`);
        this.logger.log(`retained_amount: ${retention_in_payment.retained_amount}`);

        if (
          sum_of_total_payment_amounts == sum_of_claim_amounts &&
          retention_in_payment.retained_amount == sum_of_claim_amounts
        ) {
          this.logger.log('---------->');
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionDetails)
            .set({
              retention_status: 'Completed',
            })
            .where('retention_id = :retention_id', {
              retention_id: data.retention_id,
            })
            .execute();
        }
      }
      return framedResponse(
        'SUCCESS',
        'Status of retentions updated successfully.',
      );
    } catch (error) {
      // Don't catch - let the parent transaction handle it
      this.logger.error(
        `Errored while updating the retention status with message: ${error}`,
      );
      throw error;
    }
  }
}
