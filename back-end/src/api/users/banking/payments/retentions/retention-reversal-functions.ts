import { InjectRepository } from '@nestjs/typeorm';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { EntityManager, In, Repository } from 'typeorm';
import {
  IDelateRetentionInPaymentEntries,
  IDeleteAllRetentionPaymentEntriesInSummaryAndList,
} from './retention-functions.interfaces';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import { Injectable } from '@nestjs/common';
import { PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';

@Injectable()
export class RetentionReversalFunctions {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(RetentionSummaryDetails)
    private retentionSummaryRepo: Repository<RetentionSummaryDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('RETENTION_REVERSAL_FUNCTIONS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async deleteRetentionInPaymentEntries(
    transactionalEntityManager,
    data: IDelateRetentionInPaymentEntries,
  ) {
    try {
      this.logger.log(
        `Request received for deleting the retention In payment entries with data: ${JSON.stringify(data)}`,
      );

      const { claim_type, sub_payment_id } = data;
      const presence_of_claims = await transactionalEntityManager
        .createQueryBuilder(PaymentClaims, 'pc')
        .select([
          'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
          'pc.payment_claim_id AS payment_claim_id',
          'pc.status AS status',
        ])
        .where('pc.associated_retention_sub_payment_id = :sub_payment_id', {
          sub_payment_id,
        })
        .andWhere(`pc.status != 'Deleted'`)
        .getRawMany();

      if (presence_of_claims.length > 1) {
        throw `Cannot unmatch. Multiple retention claims has been generated already.`;
      }
      this.logger.log(`presence_of_claims: ${JSON.stringify(presence_of_claims)}`);

      const retention_details = await transactionalEntityManager
        .createQueryBuilder(RetentionDetails, 'rd')
        .select([
          'rd.retention_status AS status',
          'rd.payment_id AS payment_id',
          'rd.retention_id AS retention_id',
        ])
        .where(`rd.retention_status != 'Deleted'`)
        .andWhere('rd.sub_payment_id = :sub_payment_id', { sub_payment_id })
        .getRawOne();
      this.logger.log(`retention_details: ${JSON.stringify(retention_details)}`);

      if (retention_details) {
        if (retention_details.status == 'Payment generated') {
          throw `Cannot unmatch. Multiple retention payments has been generated already.`;
        } else if (retention_details.status == 'Claim generated') {
          //Updating the status of payment claim with status Draft as Deleted.
          if (presence_of_claims[0].status == 'Draft') {
            await transactionalEntityManager
              .createQueryBuilder()
              .update(PaymentClaims)
              .set({
                status: 'Deleted',
              })
              .where('payment_claim_id = :payment_claim_id', {
                payment_claim_id: presence_of_claims[0].payment_claim_id,
              })
              .execute();
            this.logger.log('------>');

            //Update the status as Deleted in the retention list entry.
            await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionDetails)
              .set({
                retention_status: 'Deleted',
              })
              .where('sub_payment_id = :sub_payment_id', {
                sub_payment_id,
              })
              .execute();
            this.logger.log('--------/');

            //Update the status as Deleted in the retention summary entry.
            await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionSummaryDetails)
              .set({
                status: 'Deleted',
                event_id: 13, //Line no. 106
              })
              .where('sub_payment_id = :sub_payment_id', {
                sub_payment_id,
              })
              .execute();
            this.logger.log('--------//');
          } else
            throw `Delete the retention claim generated against the retention and unmatch again.`;
        } else if (retention_details.status == 'Retained') {
          //Update the status as Deleted in the retention list entry.
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionDetails)
            .set({
              retention_status: 'Deleted',
            })
            .where('sub_payment_id = :sub_payment_id', {
              sub_payment_id,
            })
            .execute();
          this.logger.log('--------/');

          //Update the status as Deleted in the retention summary entry.
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionSummaryDetails)
            .set({
              status: 'Deleted',
              event_id: 13, //Line no. 106
            })
            .where('sub_payment_id = :sub_payment_id', {
              sub_payment_id,
            })
            .execute();
          this.logger.log('--------//');
        }
      }

      return framedResponse('SUCCESS', 'Retentions deleted successfully.');
    } catch (error) {
      this.logger.error(
        `Errored while deleting retention In payment entries in retention list and summary with message: ${error}`,
      );
      return framedResponse('ERROR', `${error}`);
    }
  }

  async deleteAllRetentionPaymentEntriesInSummaryAndList(
    transactionalEntityManager,
    data: IDeleteAllRetentionPaymentEntriesInSummaryAndList,
  ) {
    try {
      this.logger.log(
        `Request received for deleting all retention in receivable entries with data: ${JSON.stringify(data)}`,
      );

      const {
        sub_payment_id,
        retention_id,
        payment_type,
        payment_id,
        payment_claim_id,
      } = data;
      this.logger.log(`data: ${JSON.stringify(data)}`);

      const latestPayment = await transactionalEntityManager
        .createQueryBuilder(PaymentDetails, 'pd')
        .select(['pd.payment_id AS payment_id'])
        .where(
          'pd.payment_claim_id = :payment_claim_id AND pd.associated_payment_id IS NULL',
          {
            payment_claim_id,
          },
        )
        .andWhere(`pd.current_status IN(:...matchedStatuses)`, {
          matchedStatuses: [
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
          ],
        })
        .orderBy({ 'pd.created_on': 'DESC' })
        .getRawOne();
      this.logger.log(`latestPayment: ${JSON.stringify(latestPayment)}`);

      if (latestPayment && latestPayment.payment_id != payment_id) {
        throw `Cannot unmatch. Multiple payments has been generated after the matching of current payment. Please unmatch payments in descending order.`;
      }

      if (
        payment_type == 'Pay Less - Full' ||
        payment_type == 'Pay Less - Part'
      ) {
        //Update the status as Deleted in the retention summary entry.
        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionSummaryDetails)
          .set({
            status: 'Deleted',
          })
          .where('sub_payment_id = :sub_payment_id', {
            sub_payment_id,
          })
          .andWhere(`status != 'Deleted'`)
          .execute();
        this.logger.log('-------1');

        //Update the status as Deleted in the retention list entry.
        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionDetails)
          .set({
            retention_status: 'Deleted',
          })
          .where('sub_payment_id = :sub_payment_id', {
            sub_payment_id,
          })
          .andWhere(`retention_status != 'Deleted'`)
          .execute();
        this.logger.log('-------2');

        //Update the latest two entries created in the retention summary.
        const latestEntries = await transactionalEntityManager
          .createQueryBuilder(RetentionSummaryDetails, 'rs')
          .select(['rs.sub_payment_id AS sub_payment_id'])
          .where('rs.retention_id = :retention_id', {
            retention_id: retention_id,
          })
          .andWhere('rs.status != :status', { status: 'Deleted' })
          .orderBy('rs.created_on', 'DESC')
          .limit(2)
          .getRawMany();
        this.logger.log(`latestEntries: ${JSON.stringify(latestEntries)}`);

        const sub_payment_ids = latestEntries.map((entry) =>
          Number(entry.sub_payment_id),
        );
        this.logger.log(`sub_payment_ids: ${JSON.stringify(sub_payment_ids)}`);

        if (sub_payment_ids.length > 0) {
          // Update the entries with the fetched sub_payment_ids.
          await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionSummaryDetails)
            .set({ status: 'Deleted' })
            .where('sub_payment_id IN (:...sub_payment_ids)', {
              sub_payment_ids,
            })
            .execute();
          this.logger.log('-------3');
        }
      }

      //Delete the latest payment amount summary entry for all the other payment types.
      const latestSummaryEntry = await transactionalEntityManager
        .createQueryBuilder(RetentionSummaryDetails, 'rsd')
        .select([
          'rsd.retention_summary_id AS retention_summary_id',
          'rsd.retention_id AS retention_id',
        ])
        .where('rsd.retention_id = :retention_id', {
          retention_id,
        })
        .andWhere('rsd.status != :status', { status: 'Deleted' })
        .orderBy('rsd.created_on', 'DESC')
        .limit(1)
        .getRawOne();
      this.logger.log(`latestSummaryEntry: ${JSON.stringify(latestSummaryEntry)}`);

      if (latestSummaryEntry) {
        // Update the status of the latest summary entry
        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionSummaryDetails)
          .set({ status: 'Deleted' })
          .where('retention_summary_id = :retention_summary_id', {
            retention_summary_id: latestSummaryEntry.retention_summary_id,
          })
          .execute();

        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionDetails)
          .set({ retention_status: 'Deleted' })
          .where('retention_id = :retention_id', {
            retention_id: latestSummaryEntry.retention_id,
          })
          .execute();
      }
      return framedResponse('SUCCESS', 'Retentions deleted successfully.');
    } catch (error) {
      this.logger.error(
        `Errored while deleting all retention in receivable entries with message: ${error}`,
      );
      return framedResponse('ERROR', `${error}`);
    }
  }
}
