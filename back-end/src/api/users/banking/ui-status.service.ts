import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, EntityManager } from 'typeorm';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { UiStatusAndActionButtons } from 'src/entities/ui-status-and-action-buttons.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class StatusService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(UiStatusAndActionButtons)
    private statusRepo: Repository<UiStatusAndActionButtons>,
    private entityManager: EntityManager,
  ) {
    this.logger = new PaytradeLogger('STATUS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getUiStatusAndActionButtonsForClaims(data) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );
      //payment_claim_id, payment_id, payment_type,
      const payableTypes = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
      var whereConditions = {};
      // if (data.payment_type) {
      const queryBuilder = this.paymentClaimsRepo
        .createQueryBuilder('pc')
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
        payment_claim_id: data.payment_claim_id,
      });

      const claimAndPaymentdetails = data.payment_claim_id
        ? await queryBuilder.getRawOne()
        : null;
      // this.logger.log(`claimAndPaymentdetails: : ${JSON.stringify(claimAndPaymentdetails)}`);
      const payment_list =
        claimAndPaymentdetails && claimAndPaymentdetails.payment_list
          ? claimAndPaymentdetails.payment_list
          : null;
      let paidAmount = 0,
        outstandingAmount = 0;
      if (
        payment_list !== null &&
        payment_list[0] !== null &&
        payableTypes.includes(payment_list[0].payment_type)
      ) {
        payment_list.forEach((element) => {
          paidAmount += element.total_amount;
        });
        if (
          ['Full', 'Part', '3rd Party'].includes(payment_list[0].payment_type)
        ) {
          outstandingAmount = claimAndPaymentdetails.claim_amount - paidAmount;
        } else if (
          ['Pay Less - Full', 'Pay Less - Part'].includes(
            payment_list[0].payment_type,
          )
        ) {
          outstandingAmount = payment_list[0].payless_amount - paidAmount;
        } else {
          outstandingAmount = 0;
        }
      }

      // this.logger.log(`outstandingAmount: : ${JSON.stringify(outstandingAmount)}`);
      const confirmationStatus = [
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
      ];
      let isNextAddAllowed = false,
        payment_type = data.payment_type ? data.payment_type : '',
        current_status = '',
        claim_type = '';
      if (
        outstandingAmount > 0 &&
        payment_list &&
        confirmationStatus.includes(payment_list[0].payment_status) &&
        ['Part', 'Pay Less - Part'].includes(payment_list[0].payment_type) &&
        !data.payment_type
      ) {
        isNextAddAllowed = true;
        payment_type = payment_list[0].payment_type;
        claim_type = claimAndPaymentdetails.claim_type;
        current_status = 'Add Next Payment';
      }

      if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        payment_list &&
        !isNextAddAllowed &&
        !data.payment_type
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = payment_list[0].payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !payment_list &&
        !isNextAddAllowed &&
        !data.payment_type
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = '';
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !isNextAddAllowed &&
        data.payment_type
      ) {
        current_status = '';
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = data.payment_type;
      }

      if (
        [
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier',
        ].includes(payment_type)
      ) {
        claim_type = null;
      }

      whereConditions = {
        claim_type: claim_type,
        payment_type: payment_type,
        current_status: current_status,
      };
      // }
      // this.logger.log(`whereConditions: : ${JSON.stringify(whereConditions)}`);
      const statusDetails = await this.statusRepo.findOne({
        where: whereConditions,
      });

      // this.logger.log(`statusDetails :: : ${JSON.stringify(statusDetails)}`);

      const noticesOfClaims = await this.noticesRepo.find({
        where: { payment_claim_id: data.payment_claim_id },
      });

      if (
        statusDetails?.claim_overview_buttons &&
        statusDetails?.claim_list_buttons
      ) {
        if (
          noticesOfClaims &&
          noticesOfClaims[0] !== null &&
          noticesOfClaims.length > 0
        ) {
          (statusDetails?.claim_overview_buttons as any).view_notice = true;
          (statusDetails?.claim_list_buttons as any).view_notice = true;
        } else {
          (statusDetails?.claim_overview_buttons as any).view_notice = false;
          (statusDetails?.claim_list_buttons as any).view_notice = false;
        }
      }

      if (
        // isNextAddAllowed &&
        payment_list &&
        payment_list[0] !== null &&
        payment_list.length > 0 &&
        statusDetails?.claim_overview_buttons &&
        statusDetails?.claim_list_buttons
      ) {
        if (payment_list.length > 1) {
          (statusDetails?.claim_overview_buttons as any).view_all_payment =
            true;
          (statusDetails?.claim_overview_buttons as any).view_payment = false;
          (statusDetails?.claim_list_buttons as any).view_all_payment = true;
          (statusDetails?.claim_list_buttons as any).view_payment = false;
        } else {
          (statusDetails?.claim_overview_buttons as any).view_all_payment =
            false;
          (statusDetails?.claim_overview_buttons as any).view_payment = true;
          (statusDetails?.claim_list_buttons as any).view_all_payment = false;
          (statusDetails?.claim_list_buttons as any).view_payment = true;
        }
      }

      // this.logger.log(`statusDetails: : ${JSON.stringify(statusDetails)}`);

      if (current_status) {
        const response = await this.paymentClaimsRepo
          .createQueryBuilder()
          .update(PaymentClaims)
          .set({
            claim_list_buttons: statusDetails?.claim_list_buttons,
            claim_overview_buttons: statusDetails?.claim_overview_buttons,
            updated_on: moment.tz('UTC'),
          })
          .where(`payment_claim_id = :payment_claim_id`, {
            payment_claim_id: data?.payment_claim_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForClaims: ',
        //   response,
        // );
      }
      return statusDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getUiStatusAndActionButtonsForClaimsTransaction(
    transactionalEntityManager,
    data,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );
      //payment_claim_id, payment_id, payment_type,
      const payableTypes = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
      var whereConditions = {};
      // if (data.payment_type) {
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
        payment_claim_id: data.payment_claim_id,
      });

      const claimAndPaymentdetails = data.payment_claim_id
        ? await queryBuilder.getRawOne()
        : null;
      // this.logger.log(`claimAndPaymentdetails: : ${JSON.stringify(claimAndPaymentdetails)}`);
      const payment_list =
        claimAndPaymentdetails && claimAndPaymentdetails.payment_list
          ? claimAndPaymentdetails.payment_list
          : null;
      let paidAmount = 0,
        outstandingAmount = 0;
      if (
        payment_list !== null &&
        payment_list[0] !== null &&
        payableTypes.includes(payment_list[0].payment_type)
      ) {
        payment_list.forEach((element) => {
          paidAmount += element.total_amount;
        });
        if (
          ['Full', 'Part', '3rd Party'].includes(payment_list[0].payment_type)
        ) {
          outstandingAmount = claimAndPaymentdetails.claim_amount - paidAmount;
        } else if (
          ['Pay Less - Full', 'Pay Less - Part'].includes(
            payment_list[0].payment_type,
          )
        ) {
          outstandingAmount = payment_list[0].payless_amount - paidAmount;
        } else {
          outstandingAmount = 0;
        }
      }

      // this.logger.log(`outstandingAmount: : ${JSON.stringify(outstandingAmount)}`);
      const confirmationStatus = [
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
      ];
      let isNextAddAllowed = false,
        payment_type = data.payment_type ? data.payment_type : '',
        current_status = '',
        claim_type = '';
      if (
        outstandingAmount > 0 &&
        payment_list &&
        confirmationStatus.includes(payment_list[0].payment_status) &&
        ['Part', 'Pay Less - Part'].includes(payment_list[0].payment_type) &&
        !data.payment_type
      ) {
        isNextAddAllowed = true;
        payment_type = payment_list[0].payment_type;
        claim_type = claimAndPaymentdetails.claim_type;
        current_status = 'Add Next Payment';
      }

      if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        payment_list &&
        !isNextAddAllowed &&
        !data.payment_type
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = payment_list[0].payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !payment_list &&
        !isNextAddAllowed &&
        !data.payment_type
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = '';
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !isNextAddAllowed &&
        data.payment_type
      ) {
        current_status = '';
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = data.payment_type;
      }

      if (
        [
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier',
        ].includes(payment_type)
      ) {
        claim_type = null;
      }

      whereConditions = {
        claim_type: claim_type,
        payment_type: payment_type,
        current_status: current_status,
      };
      // }
      // this.logger.log(`whereConditions: : ${JSON.stringify(whereConditions)}`);
      const statusDetails = await transactionalEntityManager.findOne(
        UiStatusAndActionButtons,
        {
          where: whereConditions,
        },
      );

      this.logger.log(`statusDetails :: : ${JSON.stringify(statusDetails)}`);

      const noticesOfClaims = await transactionalEntityManager.find(
        NoticeDetails,
        {
          where: { payment_claim_id: data.payment_claim_id },
        },
      );

      if (
        statusDetails?.claim_overview_buttons &&
        statusDetails?.claim_list_buttons
      ) {
        if (
          noticesOfClaims &&
          noticesOfClaims[0] !== null &&
          noticesOfClaims.length > 0
        ) {
          (statusDetails?.claim_overview_buttons as any).view_notice = true;
          (statusDetails?.claim_list_buttons as any).view_notice = true;
        } else {
          (statusDetails?.claim_overview_buttons as any).view_notice = false;
          (statusDetails?.claim_list_buttons as any).view_notice = false;
        }
      }

      if (
        // isNextAddAllowed &&
        payment_list &&
        payment_list[0] !== null &&
        payment_list.length > 0 &&
        statusDetails?.claim_overview_buttons &&
        statusDetails?.claim_list_buttons
      ) {
        if (payment_list.length > 1) {
          (statusDetails?.claim_overview_buttons as any).view_all_payment =
            true;
          (statusDetails?.claim_overview_buttons as any).view_payment = false;
          (statusDetails?.claim_list_buttons as any).view_all_payment = true;
          (statusDetails?.claim_list_buttons as any).view_payment = false;
        } else {
          (statusDetails?.claim_overview_buttons as any).view_all_payment =
            false;
          (statusDetails?.claim_overview_buttons as any).view_payment = true;
          (statusDetails?.claim_list_buttons as any).view_all_payment = false;
          (statusDetails?.claim_list_buttons as any).view_payment = true;
        }
      }

      // this.logger.log(`statusDetails: : ${JSON.stringify(statusDetails)}`);
      if (current_status) {
        const response = await transactionalEntityManager
          .createQueryBuilder()
          .update(PaymentClaims)
          .set({
            claim_list_buttons: statusDetails?.claim_list_buttons,
            claim_overview_buttons: statusDetails?.claim_overview_buttons,
            updated_on: moment.tz('UTC'),
          })
          .where(`payment_claim_id = :payment_claim_id`, {
            payment_claim_id: data?.payment_claim_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForClaimsTransaction: ',
        //   response,
        // );
      }
      return statusDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getUiStatusAndActionButtonsForPaymentsTransaction(
    transactionalEntityManager,
    data,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );
      const payableTypes = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
      var whereConditions = {};

      const paymentDetails = data.payment_id
        ? await transactionalEntityManager.findOne(PaymentDetails, {
            where: { payment_id: data.payment_id },
            relations: ['paymentClaims'],
          })
        : null;
      this.logger.log(`paymentDetails: : ${JSON.stringify(paymentDetails)}`);

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
        payment_claim_id: paymentDetails?.payment_claim_id,
      });

      const claimAndPaymentdetails = paymentDetails?.payment_claim_id
        ? await queryBuilder.getRawOne()
        : null;
      // this.logger.log(`claimAndPaymentdetails: : ${JSON.stringify(claimAndPaymentdetails)}`);
      const payment_list =
        claimAndPaymentdetails && claimAndPaymentdetails?.payment_list
          ? claimAndPaymentdetails?.payment_list
          : null;
      let paidAmount = 0,
        outstandingAmount = 0;
      if (
        payment_list !== null &&
        payment_list[0] !== null &&
        payableTypes.includes(payment_list[0]?.payment_type)
      ) {
        payment_list.forEach((element) => {
          paidAmount += element?.total_amount;
        });
        if (
          ['Full', 'Part', '3rd Party'].includes(payment_list[0].payment_type)
        ) {
          outstandingAmount = claimAndPaymentdetails.claim_amount - paidAmount;
        } else if (
          ['Pay Less - Full', 'Pay Less - Part'].includes(
            payment_list[0].payment_type,
          )
        ) {
          outstandingAmount = payment_list[0].payless_amount - paidAmount;
        } else {
          outstandingAmount = 0;
        }
      }
      const confirmationStatus = [
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
      ];
      let payment_type = '',
        current_status = '',
        claim_type = '';

      if (paymentDetails && paymentDetails !== null) {
        current_status = paymentDetails?.current_status;
        claim_type = paymentDetails?.paymentClaims?.claim_type ?? '';
        payment_type = paymentDetails.payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        payment_list
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = payment_list[0].payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !payment_list
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = '';
      }

      let overrideDelete = false;
      if (
        claimAndPaymentdetails &&
        paymentDetails &&
        claimAndPaymentdetails?.claim_type == 'Billable' &&
        claimAndPaymentdetails?.cash_retention_type == 'Claim' &&
        paymentDetails?.cash_retention &&
        paymentDetails?.payment_id
      ) {
        const retention_payment_details = await transactionalEntityManager
          .createQueryBuilder(SubPayments, 'sp')
          .select([
            'sp.sub_payment_type AS sub_payment_type',
            'sp.sub_payment_id AS sub_payment_id',
            'sp.status AS status',
            'sp.amount AS retained_amount',
            'sp.payment_id AS payment_id',
          ])
          .where(`sp.payment_id = :payment_id`, {
            payment_id: paymentDetails?.payment_id,
          })
          .andWhere(
            `sp.sub_payment_type IN ('Retention Out', 'Retention In') AND sp.status = 'Auto matched'`,
          )
          .getRawMany();
        this.logger.log(
          `retention_payment_details::::action buttons::: ${JSON.stringify(retention_payment_details)}`,
        );
        if (
          retention_payment_details &&
          retention_payment_details.length > 0 &&
          retention_payment_details[0] !== null
        ) {
          overrideDelete = true;
        }
      }

      if (
        [
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier',
          'Overpayment refund from supplier',
          'Overpayment refund to client',
        ].includes(payment_type)
      ) {
        claim_type = null;
      }

      whereConditions = {
        claim_type: claim_type,
        payment_type: payment_type,
        current_status: current_status,
      };
      this.logger.log(`whereConditions: : ${JSON.stringify(whereConditions)}`);
      let statusDetails = await transactionalEntityManager.findOne(
        UiStatusAndActionButtons,
        {
          where: whereConditions,
        },
      );
      if (
        statusDetails &&
        overrideDelete &&
        statusDetails?.payment_overview_buttons &&
        statusDetails?.payment_list_buttons
      ) {
        statusDetails.payment_overview_buttons['delete'] = true;
        statusDetails.payment_list_buttons['delete'] = true;
      }

      if (paymentDetails?.payment_claim_id && claim_type) {
        let isNextAddAllowed = false;
        if (
          outstandingAmount > 0 &&
          payment_list &&
          confirmationStatus.includes(payment_list[0].payment_status) &&
          ['Part', 'Pay Less - Part'].includes(payment_list[0].payment_type)
        ) {
          isNextAddAllowed = true;
          payment_type = payment_list[0].payment_type;
          claim_type = claimAndPaymentdetails.claim_type;
          current_status = 'Add Next Payment';
        }
        let claimStatusDetails = await transactionalEntityManager.findOne(
          UiStatusAndActionButtons,
          {
            where: {
              claim_type: claim_type,
              payment_type: payment_type,
              current_status: current_status,
            },
          },
        );
        const noticesOfClaims = await transactionalEntityManager.find(
          NoticeDetails,
          {
            where: { payment_claim_id: paymentDetails?.payment_claim_id },
          },
        );

        if (
          claimStatusDetails?.claim_overview_buttons &&
          claimStatusDetails?.claim_list_buttons
        ) {
          if (
            noticesOfClaims &&
            noticesOfClaims[0] !== null &&
            noticesOfClaims.length > 0
          ) {
            (claimStatusDetails?.claim_overview_buttons as any).view_notice =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_notice = true;
          } else {
            (claimStatusDetails?.claim_overview_buttons as any).view_notice =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_notice = false;
          }
        }

        if (
          // isNextAddAllowed &&
          payment_list &&
          payment_list[0] !== null &&
          payment_list.length > 0 &&
          claimStatusDetails?.claim_overview_buttons &&
          claimStatusDetails?.claim_list_buttons
        ) {
          if (payment_list.length > 1) {
            (
              claimStatusDetails?.claim_overview_buttons as any
            ).view_all_payment = true;
            (claimStatusDetails?.claim_overview_buttons as any).view_payment =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_all_payment =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_payment =
              false;
          } else {
            (
              claimStatusDetails?.claim_overview_buttons as any
            ).view_all_payment = false;
            (claimStatusDetails?.claim_overview_buttons as any).view_payment =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_all_payment =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_payment = true;
          }
        }

        const response = await transactionalEntityManager
          .createQueryBuilder()
          .update(PaymentClaims)
          .set({
            claim_list_buttons: claimStatusDetails?.claim_list_buttons,
            claim_overview_buttons: claimStatusDetails?.claim_overview_buttons,
            updated_on: moment.tz('UTC'),
          })
          .where(`payment_claim_id = :payment_claim_id`, {
            payment_claim_id: paymentDetails?.payment_claim_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForClaimsTransaction claims: ',
        //   response,
        // );
      }

      if (data?.payment_id) {
        const noticesOfPayments = await transactionalEntityManager.find(
          NoticeDetails,
          {
            where: { payment_id: data?.payment_id },
          },
        );

        if (
          statusDetails?.payment_list_buttons &&
          statusDetails?.payment_overview_buttons
        ) {
          if (
            noticesOfPayments &&
            noticesOfPayments[0] !== null &&
            noticesOfPayments.length > 0
          ) {
            (statusDetails.payment_list_buttons as any).view_notice = true;
            (statusDetails.payment_overview_buttons as any).view_notice = true;
          } else {
            (statusDetails.payment_list_buttons as any).view_notice = false;
            (statusDetails.payment_overview_buttons as any).view_notice = false;
          }
        }

        const response = await transactionalEntityManager
          .createQueryBuilder()
          .update(PaymentDetails)
          .set({
            payment_list_buttons: statusDetails?.payment_list_buttons,
            payment_overview_buttons: statusDetails?.payment_overview_buttons,
            updated_by: data?.user_id,
            updated_on: moment.tz('UTC'),
            updated_group: 'USER',
          })
          .where(`payment_id = :payment_id`, {
            payment_id: data?.payment_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForPaymentsTransaction payments: ',
        //   response,
        // );
      }

      // console.log('statusDetails: ', overrideDelete, statusDetails);
      return statusDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getUiStatusAndActionButtonsForPayments(data) {
    try {
      this.logger.log(
        `Handling request for fetching the details of a payment with data: ${JSON.stringify(data)}`,
      );
      const payableTypes = [
        'Full',
        'Part',
        'Pay Less - Full',
        'Pay Less - Part',
        'Pay - Zero',
        '3rd Party',
      ];
      var whereConditions = {};

      const paymentDetails = data.payment_id
        ? await this.paymentsRepo.findOne({
            where: { payment_id: data.payment_id },
            relations: ['paymentClaims'],
          })
        : null;
      // this.logger.log(`paymentDetails: : ${JSON.stringify(paymentDetails)}`);

      const queryBuilder = this.paymentClaimsRepo
        .createQueryBuilder('pc')
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
        payment_claim_id: paymentDetails?.payment_claim_id,
      });

      const claimAndPaymentdetails = paymentDetails?.payment_claim_id
        ? await queryBuilder.getRawOne()
        : null;
      // this.logger.log(`claimAndPaymentdetails: : ${JSON.stringify(claimAndPaymentdetails)}`);
      const payment_list =
        claimAndPaymentdetails && claimAndPaymentdetails.payment_list
          ? claimAndPaymentdetails.payment_list
          : null;
      let paidAmount = 0,
        outstandingAmount = 0;
      if (
        payment_list !== null &&
        payment_list[0] !== null &&
        payableTypes.includes(payment_list[0].payment_type)
      ) {
        payment_list.forEach((element) => {
          paidAmount += element.total_amount;
        });
        if (
          ['Full', 'Part', '3rd Party'].includes(payment_list[0].payment_type)
        ) {
          outstandingAmount = claimAndPaymentdetails.claim_amount - paidAmount;
        } else if (
          ['Pay Less - Full', 'Pay Less - Part'].includes(
            payment_list[0].payment_type,
          )
        ) {
          outstandingAmount = payment_list[0].payless_amount - paidAmount;
        } else {
          outstandingAmount = 0;
        }
      }
      const confirmationStatus = [
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
      ];
      let payment_type = '',
        current_status = '',
        claim_type = '';

      if (paymentDetails && paymentDetails !== null) {
        current_status = paymentDetails?.current_status;
        claim_type = paymentDetails?.paymentClaims?.claim_type ?? '';
        payment_type = paymentDetails.payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        payment_list
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = payment_list[0].payment_type;
      } else if (
        claimAndPaymentdetails &&
        claimAndPaymentdetails !== null &&
        !payment_list
      ) {
        current_status = claimAndPaymentdetails.claim_status;
        claim_type = claimAndPaymentdetails.claim_type;
        payment_type = '';
      }

      let overrideDelete = false;
      if (
        claimAndPaymentdetails &&
        paymentDetails &&
        claimAndPaymentdetails?.claim_type == 'Billable' &&
        claimAndPaymentdetails?.cash_retention_type == 'Claim' &&
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
            payment_id: paymentDetails?.payment_id,
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
          overrideDelete = true;
        }
      }

      if (
        [
          'Overpayment from client',
          'Underpayment from client',
          'Overpayment to supplier',
          'Underpayment to supplier',
          'Overpayment refund from supplier',
          'Overpayment refund to client',
        ].includes(payment_type)
      ) {
        claim_type = null;
      }

      whereConditions = {
        claim_type: claim_type,
        payment_type: payment_type,
        current_status: current_status,
      };
      // this.logger.log(`whereConditions: : ${JSON.stringify(whereConditions)}`);
      let statusDetails = await this.statusRepo.findOne({
        where: whereConditions,
      });
      if (
        statusDetails &&
        overrideDelete &&
        statusDetails?.payment_overview_buttons &&
        statusDetails?.payment_list_buttons
      ) {
        statusDetails.payment_overview_buttons['delete'] = true;
        statusDetails.payment_list_buttons['delete'] = true;
      }

      if (paymentDetails?.payment_claim_id && claim_type) {
        let isNextAddAllowed = false;
        if (
          outstandingAmount > 0 &&
          payment_list &&
          confirmationStatus.includes(payment_list[0].payment_status) &&
          ['Part', 'Pay Less - Part'].includes(payment_list[0].payment_type)
        ) {
          isNextAddAllowed = true;
          payment_type = payment_list[0].payment_type;
          claim_type = claimAndPaymentdetails.claim_type;
          current_status = 'Add Next Payment';
        }
        let claimStatusDetails = await this.statusRepo.findOne({
          where: {
            claim_type: claim_type,
            payment_type: payment_type,
            current_status: current_status,
          },
        });
        const noticesOfClaims = await this.noticesRepo.find({
          where: { payment_claim_id: paymentDetails?.payment_claim_id },
        });

        if (
          claimStatusDetails?.claim_overview_buttons &&
          claimStatusDetails?.claim_list_buttons
        ) {
          if (
            noticesOfClaims &&
            noticesOfClaims[0] !== null &&
            noticesOfClaims.length > 0
          ) {
            (claimStatusDetails?.claim_overview_buttons as any).view_notice =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_notice = true;
          } else {
            (claimStatusDetails?.claim_overview_buttons as any).view_notice =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_notice = false;
          }
        }

        if (
          // isNextAddAllowed &&
          payment_list &&
          payment_list[0] !== null &&
          payment_list.length > 0 &&
          claimStatusDetails?.claim_overview_buttons &&
          claimStatusDetails?.claim_list_buttons
        ) {
          if (payment_list.length > 1) {
            (
              claimStatusDetails?.claim_overview_buttons as any
            ).view_all_payment = true;
            (claimStatusDetails?.claim_overview_buttons as any).view_payment =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_all_payment =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_payment =
              false;
          } else {
            (
              claimStatusDetails?.claim_overview_buttons as any
            ).view_all_payment = false;
            (claimStatusDetails?.claim_overview_buttons as any).view_payment =
              true;
            (claimStatusDetails?.claim_list_buttons as any).view_all_payment =
              false;
            (claimStatusDetails?.claim_list_buttons as any).view_payment = true;
          }
        }

        const response = await this.paymentClaimsRepo
          .createQueryBuilder()
          .update(PaymentClaims)
          .set({
            claim_list_buttons: claimStatusDetails?.claim_list_buttons,
            claim_overview_buttons: claimStatusDetails?.claim_overview_buttons,
            updated_on: moment.tz('UTC'),
          })
          .where(`payment_claim_id = :payment_claim_id`, {
            payment_claim_id: paymentDetails?.payment_claim_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForPayments claims: ',
        //   response,
        // );
      }

      if (data?.payment_id) {
        const noticesOfPayments = await this.noticesRepo.find({
          where: { payment_id: data?.payment_id },
        });

        if (
          statusDetails?.payment_list_buttons &&
          statusDetails?.payment_overview_buttons
        ) {
          if (
            noticesOfPayments &&
            noticesOfPayments[0] !== null &&
            noticesOfPayments.length > 0
          ) {
            (statusDetails.payment_list_buttons as any).view_notice = true;
            (statusDetails.payment_overview_buttons as any).view_notice = true;
          } else {
            (statusDetails.payment_list_buttons as any).view_notice = false;
            (statusDetails.payment_overview_buttons as any).view_notice = false;
          }
        }

        const response = await this.paymentsRepo
          .createQueryBuilder()
          .update(PaymentDetails)
          .set({
            payment_list_buttons: statusDetails?.payment_list_buttons,
            payment_overview_buttons: statusDetails?.payment_overview_buttons,
            updated_by: data?.user_id,
            updated_on: moment.tz('UTC'),
            updated_group: 'USER',
          })
          .where(`payment_id = :payment_id`, {
            payment_id: data?.payment_id,
          })
          .execute();
        // console.log(
        //   'response in getUiStatusAndActionButtonsForPayments payments: ',
        //   response,
        // );
      }

      // console.log('statusDetails: ', overrideDelete, statusDetails);

      return statusDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching the details of a payment with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
