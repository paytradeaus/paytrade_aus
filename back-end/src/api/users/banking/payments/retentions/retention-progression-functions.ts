import { InjectRepository } from '@nestjs/typeorm';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository } from 'typeorm';
import {
  ICreateMatchedRetentionInPayment,
  ICreateMatchedRetentionPaymentInRetentionSummary,
} from './retention-functions.interfaces';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { Injectable } from '@nestjs/common';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import {
  CashRetentionType,
  PaymentClaimTypes,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';
import { eventIdsArray } from './event-ids';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';

@Injectable()
export class RetentionProgressionFunctions {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(RetentionSummaryDetails)
    private retentionSummaryRepo: Repository<RetentionSummaryDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepo: Repository<PaymentDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersRepo: Repository<ClientSuppliersDetails>,
  ) {
    this.logger = new PaytradeLogger('RETENTION_PROGRESSION_FUNCTIONS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async eventIdHandler(data: {
    claim_type: PaymentClaimTypes;
    cash_retention_type: CashRetentionType;
    payment_type: PaymentTypes;
  }) {
    try {
      this.logger.log(
        `Request received for handling the eventId with data: ${JSON.stringify(data)}`,
      );

      const { cash_retention_type, claim_type, payment_type } = data;
      this.logger.log(`data: ${JSON.stringify(data)}`);
      for (let i = 0; i < eventIdsArray.length; i++) {
        if (
          eventIdsArray[i].cash_retention_type == cash_retention_type &&
          eventIdsArray[i].claim_type == claim_type &&
          eventIdsArray[i].payment_type == payment_type
        ) {
          return eventIdsArray[i].event_id;
        }
      }
    } catch (error) {
      this.logger.error(
        `Errored while fetching eh eventID with message: ${error}`,
      );
      throw error;
    }
  }

  async createMatchedRetentionInPaymentForRetentionList(
    transactionalEntityManager,
    data: ICreateMatchedRetentionInPayment,
  ) {
    // Use the passed transactionalEntityManager directly to stay within the same transaction
    // This ensures we can see uncommitted data from the parent transaction (like payment_details)
    try {
      this.logger.log(
        `Request received for creating matched retention payment for retention list with data: ${JSON.stringify(data)}`,
      );

      const {
        sub_payment_id,
        payment_id,
        retained_amount,
        cash_retention_type,
        claim_type,
        beneficiary_type,
        company_id,
        payment_to_account,
        retention_account,
        payment_type,
        status,
        created_by,
        client_supplier_id,
      } = data;
      this.logger.log(
        `[RETENTION_DEBUG] data: ${JSON.stringify(data)}`,
      );
      this.logger.log('[RETENTION_DEBUG] Starting database queries (using parent transaction)...');

      //Fetch retained account name.
      const bankAccountIdToFetch = claim_type == 'Billable' ? retention_account : payment_to_account;
      this.logger.log(`[RETENTION_DEBUG] Fetching retainedAccountDetails for bank_account_id: ${bankAccountIdToFetch}`);
      const retainedAccountDetails = await transactionalEntityManager.findOne(BankAccounts, {
        where: {
          bank_account_id: bankAccountIdToFetch,
        },
        select: ['account_name'],
      });
      this.logger.log(`[RETENTION_DEBUG] retainedAccountDetails: ${JSON.stringify(retainedAccountDetails)}`);

      //Fetch client supplier details.
      this.logger.log(`[RETENTION_DEBUG] Fetching clientSupplierDetails for client_supplier_id: ${client_supplier_id}`);
      const clientSupplierDetails = await transactionalEntityManager.findOne(ClientSuppliersDetails, {
        where: { client_supplier_id },
        select: ['client_supplier_name'],
      });
      this.logger.log(`[RETENTION_DEBUG] clientSupplierDetails: ${JSON.stringify(clientSupplierDetails)}`);

      //Fetch company details.
      this.logger.log(`[RETENTION_DEBUG] Fetching companyDetails for company_id: ${company_id}`);
      const companyDetails = await transactionalEntityManager.findOne(CompanyDetails, {
        where: { company_id },
        select: ['company_name'],
      });
      this.logger.log(`[RETENTION_DEBUG] companyDetails: ${JSON.stringify(companyDetails)}`);

      // Check if there are entries present without the status of deleted.
      this.logger.log(`[RETENTION_DEBUG] Checking existing retention entries for sub_payment_id: ${sub_payment_id}`);
      const createdRetentionSubPaymentInRetentionList =
        await transactionalEntityManager
          .createQueryBuilder(RetentionDetails, 'rd')
          .select(['rd.retained_amount AS retained_amount'])
          .where('rd.sub_payment_id = :sub_payment_id', { sub_payment_id })
          .andWhere(`rd.retention_status != 'Deleted'`)
          .orderBy('rd.created_on', 'DESC')
          .getRawMany();
      this.logger.log(
        `[RETENTION_DEBUG] createdRetentionSubPaymentInRetentionList: ${JSON.stringify(createdRetentionSubPaymentInRetentionList)}`,
      );

      if (!createdRetentionSubPaymentInRetentionList.length) {
        // Creating the retention list entry.
        var moment = require('moment-timezone').tz.setDefault('UTC');
        
        const paymentIdNum = Number(payment_id);
        this.logger.log(`[RETENTION_DEBUG] Creating retention_details with payment_id: ${paymentIdNum}`);
        
        if (!paymentIdNum || isNaN(paymentIdNum)) {
          this.logger.error(`[RETENTION_DEBUG] Invalid payment_id: ${payment_id} - cannot create retention_details`);
          throw new Error(`Invalid payment_id for retention: ${payment_id}`);
        }
        
        this.logger.log(`[RETENTION_DEBUG] Creating retention_details record with payment_id: ${paymentIdNum}`);
        const createdRetentionList = await transactionalEntityManager.save(
          RetentionDetails,
          {
            sub_payment_id: Number(sub_payment_id),
            payment_id: paymentIdNum,
            retained_amount: Math.abs(retained_amount),
            retention_status: 'Retained',
            beneficiary_type: 'Current supplier',
            client_supplier_id,
            company_id,
            created_by,
            created_on: moment.tz('UTC'),
          },
        );
        const retention_id = createdRetentionList.retention_id;
        this.logger.log(`[RETENTION_DEBUG] retention_id created: ${retention_id}, createdRetentionList.id: ${createdRetentionList.id}`);
        const updateRetentionId = await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionDetails)
          .set({
            retention_id: 10000000000 + Number(retention_id),
          })
          .where('id = :id', {
            id: createdRetentionList.id,
          })
          .execute();

        this.logger.log(`[RETENTION_DEBUG] updateRetentionId result: ${JSON.stringify(updateRetentionId)}`);

        this.logger.log(
          `Retention list entry created successfully with id: ${JSON.stringify({ retention_id })}`,
        );

        // Creating the retention summary.
        this.logger.log(`[RETENTION_DEBUG] Checking existing retention summary for sub_payment_id: ${sub_payment_id}, amount: ${retained_amount}`);
        const createdRetentionSummary = await transactionalEntityManager
          .createQueryBuilder(RetentionSummaryDetails, 'rs')
          .select(['rs.retention_summary_id AS retention_summary_id'])
          .where('rs.sub_payment_id = :sub_payment_id', { sub_payment_id })
          .andWhere('rs.amount = :amount', { amount: retained_amount })
          .andWhere(`rs.status != 'Deleted'`)
          .getRawMany();

        this.logger.log(
          `[RETENTION_DEBUG] createdRetentionSummary: ${JSON.stringify(createdRetentionSummary)}, needsCreation: ${!createdRetentionSummary.length}`,
        );

        const event_id = await this.eventIdHandler({
          claim_type,
          cash_retention_type,
          payment_type,
        });
        this.logger.log(`[RETENTION_DEBUG] event_id: ${event_id}`);

        if (!createdRetentionSummary.length) {
          this.logger.log(`[RETENTION_DEBUG] Creating retention summary...`);
          const retentionSummary = await transactionalEntityManager.save(
            RetentionSummaryDetails,
            {
              sub_payment_id,
              amount: Math.abs(retained_amount),
              retention_id: Number(retention_id) + 10000000000,
              beneficiary_type: 'Current supplier',
              retained_account_name:
                claim_type == 'Receivable'
                  ? clientSupplierDetails.client_supplier_name
                  : retainedAccountDetails.account_name,
              beneficiary_name:
                claim_type == 'Receivable'
                  ? companyDetails.company_name
                  : clientSupplierDetails.client_supplier_name,
              event_id,
              client_supplier_id,
              status: 'Retained',
              created_by,
              created_on: moment.tz('UTC'),
            },
          );
          this.logger.log(`[RETENTION_DEBUG] retentionSummary created: ${JSON.stringify(retentionSummary)}`);

          this.logger.log(`Retention summary entry created successfully.`);
          return framedResponse('SUCCESS', 'Retentions created successfully.');
        } else {
          return framedResponse(
            'ERROR',
            `Matched retention payment with type Pay Less - Part and Pay Less - Full cannot be added in the retention list.`,
          );
        }
      } else {
        return framedResponse('SUCCESS', 'Retentions created successfully.');
      }
    } catch (error) {
      // Don't rollback - let the parent transaction handle it
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`[RETENTION_ERROR] createMatchedRetentionInPaymentForRetentionList failed: ${errorMessage}`);
      this.logger.error(`[RETENTION_ERROR] Stack: ${errorStack}`);
      this.logger.error(
        `Errored while creating matched retention payment for retention list with message: ${errorMessage}`,
      );
      throw error; // Re-throw to let parent transaction handle rollback
    }
  }

  async createMatchedRetentionPaymentInRetentionSummary(
    transactionalEntityManager,
    data: ICreateMatchedRetentionPaymentInRetentionSummary,
  ) {
    // Use the passed transactionalEntityManager directly to stay within the same transaction
    try {
      this.logger.log(
        `Request received for creating matched retentions payments in retention summary with data: ${JSON.stringify(data)}`,
      );
      const {
        payment_type,
        total_amount,
        created_by,
        associated_retention_sub_payment_id,
        payless_amount,
        sub_payment_id,
        beneficiary_type,
        payment_claim_id,
        company_id,
        claim_amount,
        payment_id,
        retention_id,
        payment_from_account,
        payment_to_account,
        client_supplier_id,
        claim_type,
        cash_retention_type,
      } = data;
      this.logger.log(`dataInSummary: ${JSON.stringify(data)}`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Starting createMatchedRetentionPaymentInRetentionSummary`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] payment_type: ${payment_type}, claim_type: ${claim_type}, payment_claim_id: ${payment_claim_id}`);
      let event_id;

      const moment = require('moment-timezone').tz.setDefault('UTC');
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Calling eventIdHandler...`);

      event_id = await this.eventIdHandler({
        claim_type,
        cash_retention_type,
        payment_type,
      });
      this.logger.log(`event_id: ${JSON.stringify(event_id)}`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] event_id: ${event_id}`);

      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Fetching claimDetails for payment_claim_id: ${payment_claim_id}`);
      const claimDetails = await this.paymentClaimsRepo.findOne({
        where: { payment_claim_id },
        select: ['claim_amount'],
      });
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] claimDetails: ${JSON.stringify(claimDetails)}`);

      if (payment_type == 'Pay Less - Full') {
        //Need to reduce the retained amount of the Beneficiary as current supplier entry from which the retention claim is created.

        //Create retained amount for beneficiary as companySTP in retention list if the claim type is Receivable.
        const retained_amount =
          Number(claimDetails.claim_amount) - Number(payless_amount);
        this.logger.log(`retained_amount: ${JSON.stringify(retained_amount)}`);

        //Create Self beneficiary only if the claim_type is Billable.
        if (claim_type == 'Billable') {
          //Fetch retained account name.
          const retainedAccountDetails = await this.bankAccountsRepo.findOne({
            where: { bank_account_id: payment_from_account },
            select: ['account_name'],
          });
          this.logger.log(`retainedAccountDetails: ${JSON.stringify(retainedAccountDetails)}`);

          //Fetch company details.
          const companyDetails = await this.companyDetailsRepo.findOne({
            where: { company_id },
            select: ['company_name'],
          });
          this.logger.log(`companyDetails: ${JSON.stringify(companyDetails)}`);

          //Fetch client supplier details.
          const clientSupplierDetails = await this.clientSuppliersRepo.findOne({
            where: { client_supplier_id },
            select: ['client_supplier_name'],
          });
          const createdRetainedBeneficiaryAmountEntryInRetentionList =
            await transactionalEntityManager.save(
              RetentionDetails,
              {
                sub_payment_id,
                payment_id,
                retained_amount,
                retention_status: 'Retained',
                beneficiary_type: 'Self',
                client_supplier_id,
                company_id,
                created_by,
                created_on: moment.tz('UTC'),
              },
            );
          const created_retention_id =
            createdRetainedBeneficiaryAmountEntryInRetentionList.retention_id;
          this.logger.log(
            `createdRetainedBeneficiaryAmountEntryInRetentionList: ${JSON.stringify(createdRetainedBeneficiaryAmountEntryInRetentionList)}`,
          );

          const updateRetentionId = await transactionalEntityManager
            .createQueryBuilder()
            .update(RetentionDetails)
            .set({
              retention_id: 10000000000 + Number(created_retention_id),
            })
            .where('id = :id', {
              id: createdRetainedBeneficiaryAmountEntryInRetentionList.id,
            })
            .execute();

          this.logger.log(`updateRetentionId: ${JSON.stringify(updateRetentionId)}`);

          //Create retained amount for beneficiary as companySTP in retention summary.
          const createdRetainedBeneficiaryAmountEntryInRetentionSummary =
            await transactionalEntityManager.save(
              RetentionSummaryDetails,
              {
                sub_payment_id,
                amount: retained_amount,
                status: 'Retained',
                beneficiary_type: 'Self',
                event_id: event_id + 2,
                retention_id: Number(created_retention_id) + 10000000000,
                retained_account_name: retainedAccountDetails?.account_name,
                beneficiary_name: companyDetails.company_name,
                client_supplier_id,
                company_id,
                created_by,
                created_on: moment.tz('UTC'),
              },
            );
          this.logger.log(
            `createdRetainedBeneficiaryAmountEntryInRetentionSummary: ${JSON.stringify(createdRetainedBeneficiaryAmountEntryInRetentionSummary)}`,
          );

          const retained_payment_amount =
            Number(claimDetails.claim_amount) - Number(payless_amount);
          this.logger.log(`retained_payment_amount: ${JSON.stringify(retained_payment_amount)}`);

          const createdPaylessReducedRetainedAmountEntryInSummary =
            await transactionalEntityManager.save(
              RetentionSummaryDetails,
              {
                sub_payment_id: associated_retention_sub_payment_id,
                event_id: event_id,
                amount: -retained_payment_amount,
                status: 'Retained',
                beneficiary_type: 'Current supplier',
                retained_account_name: retainedAccountDetails?.account_name,
                beneficiary_name: clientSupplierDetails.client_supplier_name,
                retention_id,
                client_supplier_id,
                created_by,
                created_on: moment.tz('UTC'),
              },
            );
          this.logger.log(
            `createdPaylessRetainedAmountEntryInSummary: ${JSON.stringify(createdPaylessReducedRetainedAmountEntryInSummary)}`,
          );

          //Create another payment amount entry in retention summary while self beneficiary is made against a retained amount.
          const createdPaylessAdditionalPaymentAmountEntryInSummary =
            await transactionalEntityManager.save(
              RetentionSummaryDetails,
              {
                sub_payment_id: associated_retention_sub_payment_id,
                payment_amount: retained_payment_amount,
                event_id: event_id,
                status: 'Retained',
                beneficiary_type: 'Self',
                retained_account_name: retainedAccountDetails?.account_name,
                beneficiary_name: companyDetails.company_name,
                client_supplier_id,
                retention_id,
                company_id,
                created_by,
                created_on: moment.tz('UTC'),
              },
            );
          this.logger.log(
            `createdPaylessAdditionalPaymentAmountEntryInSummary: ${JSON.stringify(createdPaylessAdditionalPaymentAmountEntryInSummary)}`,
          );
        }
      } else if (payment_type == 'Pay Less - Part') {
        //--------Need to reduce the retained amount of the Beneficiary as current supplier entry from which the retention claim is created.-------

        //Check for the presence of payments associated with the current payment claim and make entry in retention list based on that.

        if (claim_type == 'Billable') {
          //Fetch retained account name.
          const retainedAccountDetails = await this.bankAccountsRepo.findOne({
            where: { bank_account_id: payment_from_account },
            select: ['account_name'],
          });
          this.logger.log(`retainedAccountDetails: ${JSON.stringify(retainedAccountDetails)}`);

          //Fetch company details.
          const companyDetails = await this.companyDetailsRepo.findOne({
            where: { company_id },
            select: ['company_name'],
          });
          this.logger.log(`companyDetails: ${JSON.stringify(companyDetails)}`);

          //Fetch client supplier details.
          const clientSupplierDetails = await this.clientSuppliersRepo.findOne({
            where: { client_supplier_id },
            select: ['client_supplier_name'],
          });
          this.logger.log(`clientSupplierDetails: ${JSON.stringify(clientSupplierDetails)}`);
          const checkExistenceOfMatchedPaylessPartPayment =
            await transactionalEntityManager
              .createQueryBuilder(PaymentDetails, 'pd')
              .select(['pd.payment_type AS payment_type'])
              .where(`pd.payment_claim_id = :payment_claim_id`, {
                payment_claim_id,
              })
              .andWhere(`pd.current_status != 'Deleted'`)
              .getRawMany();

          this.logger.log(
            `checkExistenceOfMatchedPaylessPartPayment: ${JSON.stringify(checkExistenceOfMatchedPaylessPartPayment)}`,
          );
          if (
            checkExistenceOfMatchedPaylessPartPayment &&
            !(checkExistenceOfMatchedPaylessPartPayment.length >= 2)
          ) {
            const retention_retained_amount =
              Number(claimDetails.claim_amount) - Number(payless_amount);
            this.logger.log(`retention_retained_amount: ${JSON.stringify(retention_retained_amount)}`);
            const createdRetainedBeneficiaryAmountEntryInRetentionsList =
              await transactionalEntityManager.save(
                RetentionDetails,
                {
                  sub_payment_id,
                  payment_id,
                  retained_amount: retention_retained_amount,
                  retention_status: 'Retained',
                  beneficiary_type: 'Self',
                  client_supplier_id,
                  company_id,
                  created_by,
                  created_on: moment.tz('UTC'),
                },
              );
            const generated_retention_id =
              createdRetainedBeneficiaryAmountEntryInRetentionsList.retention_id;
            this.logger.log(
              `createdRetainedBeneficiaryAmountEntryInRetentionsList: ${JSON.stringify(createdRetainedBeneficiaryAmountEntryInRetentionsList)}`,
            );

            const updateRetentionId = await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionDetails)
              .set({
                retention_id: 10000000000 + Number(generated_retention_id),
              })
              .where('id = :id', {
                id: createdRetainedBeneficiaryAmountEntryInRetentionsList.id,
              })
              .execute();

            this.logger.log(`updateRetentionId: : ${JSON.stringify(updateRetentionId)}`);

            //Create retained amount for beneficiary as companySTP in retention summary.
            const createdRetainedBeneficiaryAmountEntryInRetentionSummary =
              await transactionalEntityManager.save(
                RetentionSummaryDetails,
                {
                  sub_payment_id,
                  amount: retention_retained_amount,
                  status: 'Retained',
                  beneficiary_type: 'Self',
                  retention_id: Number(generated_retention_id) + 10000000000,
                  retained_account_name: retainedAccountDetails?.account_name,
                  beneficiary_name: companyDetails.company_name,
                  client_supplier_id,
                  company_id,
                  created_by,
                  created_on: moment.tz('UTC'),
                  event_id: event_id,
                },
              );
            this.logger.log(
              `createdRetainedBeneficiaryAmountEntryInRetentionSummary: ${JSON.stringify(createdRetainedBeneficiaryAmountEntryInRetentionSummary)}`,
            );
          }

          //Make self beneficiary entry if it's not already present.
          const checkPresenceOfSelfBeneficiaryEntryInSummary =
            await this.retentionSummaryRepo
              .createQueryBuilder('rs')
              .select(['rs.retention_id AS retention_id'])
              .where('rs.retention_id = :retention_id', { retention_id })
              .andWhere('rs.beneficiary_type = :beneficiary_type', {
                beneficiary_type: 'Self',
              })
              .andWhere(`rs.status != 'Deleted'`)
              .orderBy('rs.created_on', 'DESC')
              .limit(1)
              .getRawOne();
          this.logger.log(
            `checkPresenceOfSelfBeneficiaryEntryInSummary: ${JSON.stringify(checkPresenceOfSelfBeneficiaryEntryInSummary)}`,
          );

          if (!checkPresenceOfSelfBeneficiaryEntryInSummary) {
            const payment_amount =
              Number(claimDetails.claim_amount) - Number(payless_amount);
            this.logger.log(`payment_amount: ${JSON.stringify(payment_amount)}`);

            const createdPaylessReducedRetainedAmountEntryInRetentionSummary =
              await transactionalEntityManager.save(
                RetentionSummaryDetails,
                {
                  sub_payment_id: associated_retention_sub_payment_id,
                  amount: -payment_amount,
                  status: 'Retained',
                  beneficiary_type: 'Current supplier',
                  retained_account_name: retainedAccountDetails?.account_name,
                  beneficiary_name: clientSupplierDetails.client_supplier_name,
                  retention_id,
                  client_supplier_id,
                  created_by,
                  created_on: moment.tz('UTC'),
                  event_id: event_id,
                },
              );
            this.logger.log(
              `createdPaylessReducedRetainedAmountEntryInRetentionSummary: ${JSON.stringify(createdPaylessReducedRetainedAmountEntryInRetentionSummary)}`,
            );

            //Create another payment amount entry in retentnion summary while self beneficiary is made against a retained amount.
            const createdPaylessAdditionalPaymentAmountEntryInRetentionSummary =
              await transactionalEntityManager.save(
                RetentionSummaryDetails,
                {
                  sub_payment_id: associated_retention_sub_payment_id,
                  payment_amount: payment_amount,
                  status: 'Retained',
                  beneficiary_type: 'Self',
                  retained_account_name: retainedAccountDetails?.account_name,
                  beneficiary_name: companyDetails.company_name,
                  client_supplier_id,
                  retention_id,
                  company_id,
                  created_by,
                  created_on: moment.tz('UTC'),
                  event_id: event_id,
                },
              );
            this.logger.log(
              `createdPaylessAdditionalPaymentAmountEntryInSummary: ${JSON.stringify(createdPaylessAdditionalPaymentAmountEntryInRetentionSummary)}`,
            );
          }
        }
      }

      if (payment_type == 'Part') {
        //Checking the existence of retention PART payments for incrementing the event id.
        const fetchedRetentionSummaryDetails = await this.retentionSummaryRepo
          .createQueryBuilder('rs')
          .select([
            'rs.event_id AS event_id',
            'rs.retention_id AS retention_id',
            'rs.sub_payment_id AS sub_payment_id',
          ])
          .where('rs.retention_id = :retention_id', { retention_id })
          .orderBy('rs.created_on', 'DESC')
          .getRawMany();

        this.logger.log(
          `fetchedRetentionSummaryDetails: ${JSON.stringify(fetchedRetentionSummaryDetails)}`,
        );

        this.logger.log(
          `fetchedRetentionSummaryDetails[0]: ${JSON.stringify(fetchedRetentionSummaryDetails[0])}`,
        );

        if (fetchedRetentionSummaryDetails.length) {
          //Checking the payment type of the latest created
          const paymentDetails = await this.subPaymentsRepo
            .createQueryBuilder('sp')
            .select([
              'sp.sub_payment_id AS sub_payment_id',
              'pd.payment_id AS payment_id',
              'pd.payment_type AS payment_type',
              'pc.claim_type AS claim_type',
              'pc.cash_retention_type AS cash_retention_type',
            ])
            .innerJoin('sp.paymentDetails', 'pd')
            .innerJoin('pd.paymentClaims', 'pc')
            .where('sp.sub_payment_id = :sub_payment_id', {
              sub_payment_id: fetchedRetentionSummaryDetails[0].sub_payment_id,
            })
            .getRawOne();
          this.logger.log(`paymentDetails---: ${JSON.stringify(paymentDetails)}`);

          if (paymentDetails.payment_type == 'Part') {
            event_id = Number(fetchedRetentionSummaryDetails[0].event_id) + 1;
            this.logger.log(`event_id_after_increment: ${JSON.stringify(event_id)}`);
          }
        }
      }

      //Fetch retained account name.
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Reached common code section - fetching account details`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] claim_type: ${claim_type}, payment_to_account: ${payment_to_account}, payment_from_account: ${payment_from_account}`);
      const retentionAccountDetails = await this.bankAccountsRepo.findOne({
        where: {
          bank_account_id:
            claim_type == 'Receivable'
              ? payment_to_account
              : payment_from_account,
        },
        select: ['account_name'],
      });
      this.logger.log(`retentionAccountDetails: ${JSON.stringify(retentionAccountDetails)}`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] retentionAccountDetails: ${JSON.stringify(retentionAccountDetails)}`);

      //Fetch company details.
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Fetching companyDetails for company_id: ${company_id}`);
      const companyDetails = await this.companyDetailsRepo.findOne({
        where: { company_id },
        select: ['company_name'],
      });
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] companyDetails: ${JSON.stringify(companyDetails)}`);

      //Fetch client supplier details.
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] Fetching clientSupplierDetails for client_supplier_id: ${client_supplier_id}`);
      const clientSupplierDetails = await this.clientSuppliersRepo.findOne({
        where: { client_supplier_id },
        select: ['client_supplier_name'],
      });
      this.logger.log(`clientSupplierDetails: ${JSON.stringify(clientSupplierDetails)}`);
      this.logger.log(`[RETENTION_SUMMARY_DEBUG] clientSupplierDetails: ${JSON.stringify(clientSupplierDetails)}`);

      this.logger.log(`[RETENTION_SUMMARY_DEBUG] About to create retention summary with sub_payment_id: ${sub_payment_id}, retention_id: ${retention_id}`);
      const createdRetentionSummary = await transactionalEntityManager.save(
        RetentionSummaryDetails,
        {
          sub_payment_id,
          amount: -Math.abs(Number(total_amount)),
          payment_amount: Math.abs(Number(total_amount)),
          beneficiary_type: 'Current supplier',
          retention_id,
          retained_account_name: retentionAccountDetails?.account_name,
          beneficiary_name:
            claim_type == 'Receivable'
              ? companyDetails.company_name
              : clientSupplierDetails.client_supplier_name,
          client_supplier_id,
          event_id: Number(event_id) + 1,
          status: 'Completed',
          created_by,
          created_on: moment.tz('UTC'),
        },
      );
      this.logger.log(`createdRetentionSummary: ${JSON.stringify(createdRetentionSummary)}`);

      if (
        (payment_type == 'Pay Less - Full' ||
          payment_type == 'Pay Less - Part') &&
        claimDetails.claim_amount -
          Math.abs(Number(total_amount)) -
          (claimDetails.claim_amount - payless_amount) ==
          0
      ) {
        await transactionalEntityManager
          .createQueryBuilder()
          .update(RetentionDetails)
          .set({
            retention_status: 'Completed',
          })
          .where('retention_id = :retention_id', {
            retention_id,
          })
          .execute();
      }

      //---- THIS NEEDS TO BE HANDLED ----
      // if (payment_type == 'Pay Less - Part') {
      //   const allPayments = await this.paymentDetailsRepo
      //     .createQueryBuilder('pd')
      //     .select([
      //       'pd.payment_id AS payment_id',
      //       'pd.total_amount AS total_amount',
      //       'pd.payless_amount AS payless_amount'
      //     ])
      //     .where('pd.payment_claim_id = :payment_claim_id', { payment_claim_id })
      //     .andWhere(`pd.current_status IN(:...matchedStatuses)`, {
      //       matchedStatuses: [
      //         'Unconfirmed - Matched',
      //         'Paid - Matched',
      //         'Received - Matched',
      //       ],
      //     })
      //     .getRawMany();
      //   this.logger.log(`allPayments: ${JSON.stringify(allPayments)}`);

      //   if (allPayments.length) {

      //   }
      // }

      this.logger.log(
        `Matched retention payment created in retention summary successfully.`,
      );
      return framedResponse('SUCCESS', 'Retentions created successfully.');
    } catch (error) {
      // Don't rollback - let the parent transaction handle it
      this.logger.error(
        `Errored while creating matched retention payments in retention summary with message: ${JSON.stringify(error)}`,
      );
      throw error; // Re-throw to let parent transaction handle rollback
    }
  }
}
