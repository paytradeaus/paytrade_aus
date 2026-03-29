import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  PaymentClaims,
  Transactions,
} from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  Between,
  EntityManager,
  ILike,
  In,
  IsNull,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  FetchDetailsOfATransactionInBankAccountInput,
  FetchAllTransactionsOfABankAccountInput,
  AddTransactionsInput,
  FetchAllTransactionsInput,
  ExcludeTransactionInput,
  FetchAllUnmatchedTransactionsOfACompanyInput,
} from './transactions.input';
import {
  TempSaveTransactions,
  TransactionDetails,
} from 'src/entities/transaction-details.entity';
import { parse } from 'csv-parse/sync';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { csvTemplateFileDetailsResponse } from './transactions.response';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { getStatusForUpdateInDB } from 'src/libs/@json/get-payment-status';
import { PaymentClaimsService } from '../payment-claims/payment-claims.service';
import { PaymentsService } from '../payments/payments.service';
import { AddPaymentInput } from '../payments/payments.input';
import { PaymentTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { UserDetails } from 'src/entities/user-details.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import {
  formatCurrency,
  formatCurrencyWithoutDollars,
} from 'src/libs/@currency-formattor/currency-formattor';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { StatusService } from '../ui-status.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class TransactionsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(Transactions)
    private transactionsRepo: Repository<Transactions>,
    @InjectRepository(TransactionDetails)
    private transactionDetailsRepo: Repository<TransactionDetails>,
    @InjectRepository(TempSaveTransactions)
    private temperoryRepoTransactions: Repository<TempSaveTransactions>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(UserDetails)
    private userDetailsRepo: Repository<UserDetails>,
    private paymentsService: PaymentsService,
    private entityManager: EntityManager,
    private activityLogService: ActivityLogService,
    private readonly paymentClaimsService: PaymentClaimsService,
    private readonly statusService: StatusService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('TRANSACTIONS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  // api - csv upload

  async addTransactions(data: AddTransactionsInput, userId: number) {
    try {
      this.logger.log(
        `Handling request for adding transactions from a csv file with data: ${JSON.stringify(data)}`,
      );

      data.created_by = userId;
      const savedTransactionsDetails =
        await this.transactionDetailsRepo.save(data);
      const transactionsId = savedTransactionsDetails.id;
      this.logger.log(
        `Transactions added successfully with id: ${transactionsId}`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while adding transactions from csv with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async downloadCsvTemplate(
    financialInstitutionId: string,
    userId: number,
  ): Promise<csvTemplateFileDetailsResponse> {
    try {
      this.logger.log(`Handling request for downloading template`);

      //function to fetch file path according to the fin ins

      const filePath =
        'transaction_csv_file_attachments/transaction-upload-csv-template.csv';
      const fileType = 'text/csv';
      let file_base_64 = '';
      try {
        const fileBuffer = await this.objectStorageService.downloadFile(filePath);
        if (fileBuffer) {
          file_base_64 = fileBuffer.toString('base64');
        }
      } catch (fileError) {
        this.logger.error(`Failed to read file from storage: ${fileError.message}`);
      }
      const csvTemplate = `data: ${fileType};base64,${file_base_64}`;

      const template_details = {
        id: '5458790',
        file_path: filePath,
        file_name: 'transaction-upload-csv-template.csv',
        file: csvTemplate,
      };

      if (!template_details) throw new Error(`Details of template not found`);
      this.logger.log(
        `Details of a transaction fetched successfully with data: ${JSON.stringify(template_details)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Template fetched successfully.`,
        template_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching template with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchDetailsOfATransactionInBankAccount(
    data: FetchDetailsOfATransactionInBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching details of a transaction with data: ${JSON.stringify(data)}`,
      );

      const { company_id, transaction_id } = data;
      const transaction_details = await this.transactionsRepo
        .createQueryBuilder('t')
        .select([
          't.id AS transaction_id',
          't.company_id AS company_id',
          't.bank_account_id AS bank_account_id',
          't.transaction_csv_file_attachment_id AS transaction_csv_file_attachment_id',
          't.transaction_date AS transaction_date',
          't.description AS description',
          't.spent_amount AS spent_amount',
          't.received_amount AS received_amount',
          't.matched_to AS matched_to',
          't.status AS status',
        ])
        .where('t.id = :transaction_id', {
          transaction_id,
        })
        .andWhere('t.company_id = :company_id', { company_id })
        .getRawOne();
      if (!transaction_details)
        throw new Error(
          `Details of transaction with id: ${transaction_id} not found. Please provide a valid one.`,
        );
      this.logger.log(
        `Details of a transaction fetched successfully with data: ${JSON.stringify(transaction_details)}`,
      );
      transaction_details.transaction_date = new Date(
        transaction_details.transaction_date,
      );

      return framedResponse(
        'SUCCESS',
        `Details of a transaction fetched successfully.`,
        transaction_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of a transaction with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchAllTransactionsOfABankAccount(
    data: FetchAllTransactionsOfABankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching all transactions with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        bank_account_id,
        date_filter,
        created_date_from,
        created_date_to,
        page,
        status,
        search,
        items_per_page,
      } = data;
      const whereConditions: any = { company_id, bank_account_id };
      if (status) whereConditions.status = status;

      if (date_filter) {
        const moment = require('moment-timezone');
        moment.tz.setDefault('UTC');

        switch (date_filter) {
          case 'Custom':
            if (created_date_from && created_date_to) {
              whereConditions.created_on = Between(
                created_date_from,
                created_date_to,
              );
            }
            break;
          case 'This Month':
            whereConditions.created_on = Between(
              moment().startOf('month').utc().toDate(),
              moment().endOf('month').utc().toDate(),
            );
            break;
          case 'Last Month':
            const lastMonthStart = moment()
              .subtract(1, 'months')
              .startOf('month')
              .utc()
              .toDate();
            const lastMonthEnd = moment()
              .subtract(1, 'months')
              .endOf('month')
              .utc()
              .toDate();
            whereConditions.created_on = Between(lastMonthStart, lastMonthEnd);
            break;
        }
      }
      const skip = items_per_page
        ? (page - 1) * items_per_page
        : (page - 1) * 10;
      const take = items_per_page ? items_per_page : 10;
      const [transactions_list, total_count] = await this.transactionsRepo
        .createQueryBuilder('t')
        .select([
          't.id AS id',
          't.transaction_date AS transaction_date',
          't.description AS description',
          't.spent_amount AS spent_amount',
          't.received_amount AS received_amount',
          't.matched_to AS matched_to',
          't.status AS status',
        ])
        .where(whereConditions)
        .andWhere('t.description LIKE :searchableKeyword', {
          searchableKeyword: `%${search ? search : ''}%`,
        })
        .orderBy('t.created_at', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount();

      transactions_list.forEach((v) => {
        v.transaction_date = new Date(v.transaction_date);
      });
      this.logger.log(
        `All transactions of a bank account with id: ${bank_account_id} fetched successfully with data: ${JSON.stringify(transactions_list)}`,
      );

      return framedResponse(
        'SUCCESS',
        `All transactions of a bank account fetched successfully.`,
        { transactions_list, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all transactions of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchAllTransactions(data: FetchAllTransactionsInput, timezone) {
    try {
      this.logger.log(
        `Handling request for fetching all transactions with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        bank_account_id,
        date_filter,
        date_from,
        date_to,
        page,
        items_per_page,
        is_receivable,
        status,
        search,
      } = data;

      const queryBuilder = await this.transactionDetailsRepo
        .createQueryBuilder('t')
        .select([
          't.id AS id',
          't.txn_date AS txn_date',
          't.description AS description',
          `CASE
            WHEN t.txn_amount > 0 THEN t.txn_amount
            ELSE NULL
          END AS received_amount`,
          `CASE
            WHEN t.txn_amount < 0 THEN t.txn_amount
            ELSE NULL
          END AS spent_amount`,
          `CASE
            WHEN t.txn_amount > 0 THEN true
            ELSE false
          END AS is_receivable`,
          't.matched_payment_ids AS matched_to',
          't.status AS status',
          't.bank_account_id AS bank_account_id',
          `string_agg(DISTINCT sub.payment_id::TEXT, ',') FILTER (WHERE sub.id IS NOT NULL) AS matched_to_payment_id`,

          `json_agg(DISTINCT jsonb_build_object(
            'payment_id', sub.payment_id,
            'payment_claim_id', pd.payment_claim_id
          )) FILTER (WHERE sub.payment_id IS NOT NULL AND pd.payment_claim_id IS NOT NULL) AS matched_payment_claims`,
        ])
        .leftJoin(
          SubPayments,
          'sub',
          `sub.sub_payment_id = ANY(string_to_array(t.matched_payment_ids, ',')::BIGINT[])`,
        )
        .leftJoin(PaymentDetails, 'pd', 'pd.payment_id = sub.payment_id')
        .where('t.company_id = :company_id', { company_id })
        .groupBy('t.id');

      if (bank_account_id) {
        queryBuilder.andWhere('(t.bank_account_id = :bank_account_id)', {
          bank_account_id,
        });
      }

      if (is_receivable === true) {
        queryBuilder.andWhere('t.txn_amount > 0');
      } else if (is_receivable === false) {
        queryBuilder.andWhere('t.txn_amount < 0');
      }

      if (status) {
        // queryBuilder.andWhere('t.status = :status', { status });
        if (status === 'All') {
          const txnStatus = ['To Review', 'Unmatched', 'Matched', 'Excluded'];
          queryBuilder.andWhere('t.status IN(:...TxnStatus)', {
            TxnStatus: txnStatus,
          });
        } else if (status == 'ToMatch') {
          const txnStatus = ['To Review', 'Unmatched'];
          queryBuilder.andWhere('t.status IN(:...TxnStatus)', {
            TxnStatus: txnStatus,
          });
        } else {
          queryBuilder.andWhere('t.status = :TxnStatus', {
            TxnStatus: status,
          });
        }
      } else {
        const excludedStatus = 'Deleted';
        queryBuilder.andWhere('t.status != :excludedStatus', {
          excludedStatus,
        });
      }

      if (search) {
        queryBuilder.andWhere(
          `(LOWER(CAST(t.description AS text)) LIKE :keyword)`,
          { keyword: `%${search.toLowerCase()}%` },
        );
      }

      if (date_filter && timezone) {
        const moment = require('moment-timezone');
        moment.tz.setDefault('UTC');

        let startDate, endDate;
        if (data.date_filter === 'Custom' && date_from && date_to) {
          startDate = moment
            .tz(date_from, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment.tz(date_to, timezone).endOf('day').utc().toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment.tz(timezone).startOf('month').utc().toDate();
          endDate = moment.tz(timezone).endOf('month').utc().toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .startOf('month')
            .utc()
            .toDate();
          endDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .endOf('month')
            .utc()
            .toDate();
        }
        queryBuilder.andWhere('t.txn_date BETWEEN :start_date AND :end_date', {
          start_date: startDate,
          end_date: endDate,
        });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 't.created_on': sorting_order });
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }
      if (
        data.sorting_field &&
        data.sorting_field !== 'received_amount' &&
        data.sorting_field !== 'spent_amount' &&
        data.sorting_field !== 'is_receivable'
      ) {
        switch (data.sorting_field) {
          case 'txn_date':
            {
              queryBuilder.orderBy({ 't.txn_date': sorting_order });
            }
            break;
          case 'description':
            {
              queryBuilder.orderBy({ 'LOWER(t.description)': sorting_order });
            }
            break;
          case 'matched_to':
            {
              queryBuilder.orderBy({ 't.matched_payment_ids': sorting_order });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({ 't.status': sorting_order });
            }
            break;
          case 'bank_account_id':
            {
              queryBuilder.orderBy({ 't.bank_account_id': sorting_order });
            }
            break;
        }
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'received_amount') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort(
            (a, b) => a.received_amount - b.received_amount,
          );
        } else {
          sortedResult = Array.from(rawResults).sort(
            (a, b) => b.received_amount - a.received_amount,
          );
        }

        const startIndex =
          data.page && data.items_per_page
            ? (data.page - 1) * data.items_per_page
            : 0;
        const endIndex =
          data.page && data.items_per_page
            ? Math.min(
                (data.page - 1) * data.items_per_page + data.items_per_page,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (data.sorting_field && data.sorting_field === 'spent_amount') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort(
            (a, b) => a.spent_amount - b.spent_amount,
          );
        } else {
          sortedResult = Array.from(rawResults).sort(
            (a, b) => b.spent_amount - a.spent_amount,
          );
        }

        const startIndex =
          data.page && data.items_per_page
            ? (data.page - 1) * data.items_per_page
            : 0;
        const endIndex =
          data.page && data.items_per_page
            ? Math.min(
                (data.page - 1) * data.items_per_page + data.items_per_page,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (data.sorting_field && data.sorting_field === 'is_receivable') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.is_receivable?.trim()?.localeCompare(b.is_receivable?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.is_receivable?.trim()?.localeCompare(a.is_receivable?.trim()),
          );
        }

        const startIndex =
          data.page && data.items_per_page
            ? (data.page - 1) * data.items_per_page
            : 0;
        const endIndex =
          data.page && data.items_per_page
            ? Math.min(
                (data.page - 1) * data.items_per_page + data.items_per_page,
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
        result.formatted_spent_amount = formatCurrencyWithoutDollars(
          result.spent_amount,
        );
        result.formatted_received_amount = formatCurrencyWithoutDollars(
          result.received_amount,
        );
      });

      finalResult.forEach((v) => {
        v.txn_date = new Date(v.txn_date);
      });
      this.logger.log(
        `All transactions of a bank account with id: ${bank_account_id} fetched successfully with data: ${JSON.stringify(finalResult)}`,
      );

      return framedResponse(
        'SUCCESS',
        `All transactions of a bank account fetched successfully.`,
        { transactions_list: finalResult, total_count: finalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all transactions of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchPaymentsToMatch(transaction_ids: string[], timezone) {
    try {
      this.logger.log(
        `Handling request for fetching matching payments for transaction with IDs: ${JSON.stringify(transaction_ids)}`,
      );

      const txns = await this.transactionDetailsRepo
        .createQueryBuilder('t')
        .select([
          't.id AS id',
          't.txn_date AS txn_date',
          't.description AS description',
          't.bank_account_id AS bank_account_id',
          `CASE
            WHEN t.txn_amount > 0 THEN t.txn_amount
            ELSE NULL
          END AS received_amount`,
          `CASE
            WHEN t.txn_amount < 0 THEN t.txn_amount
            ELSE NULL
          END AS spent_amount`,
          `CASE
          WHEN t.txn_amount > 0 THEN true
          ELSE false
          END AS is_receivable`,
          't.status AS status',
          't.bank_account_id AS bank_account',
        ])
        .where('t.id IN (:...ids)', { ids: transaction_ids })
        .andWhere('t.is_matched = :isMatched', { isMatched: false })
        .getRawMany();

      const all_txn_amounts = [
        ...txns.map((txn) => Number(txn.received_amount) || 0),
        ...txns.map((txn) => Number(txn.spent_amount) || 0),
      ];

      const totalSum = Number(
        all_txn_amounts.reduce((sum, amount) => sum + amount, 0),
      ); //for multiple txns sum is also considered to match

      const txn_amounts = [
        ...all_txn_amounts,
        totalSum, // Sum of all received and spent amounts
      ];

      // console.log('_____)_)_)_)', txns, txn_amounts);

      // const bankAccount = await this.bankAccountsRepo.findOne({
      //   where: { bank_account_id: txns[0].bank_account },
      // });

      // const overUnderPayments = await this.subPaymentsRepo
      // .createQueryBuilder('subpayment')
      // .select([
      //   'subpayment.id AS id',
      //   'payment.id AS payment_id'
      // ])
      // .leftJoin('subpayment.paymentDetails', 'payment')
      // .leftJoin('payment', 'associatedPayment', 'associatedPayment.payment_id = payment.associated_payment_id')
      // .where(
      //   `
      //     (payment.payment_from_account IN (:...accounts) OR
      //     payment.payment_to_account IN (:...accounts) OR
      //     payment.retention_account IN (:...accounts))
      //   `,
      //   { accounts: txns.map((txn) => txn.bank_account) },
      // )
      // .andWhere('payment.associated_payment_id IS NOT NULL')
      // .andWhere('associatedPayment.id IS NOT NULL')
      // .andWhere('subpayment.status = :status', {
      //   status: 'Unmatched',
      // })
      // .andWhere('payment.current_status != :delstatus', {
      //   delstatus: 'Deleted',
      // })
      // .getRawMany();

      if (txns.length) {
        const matchingPayments = await this.subPaymentsRepo
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
            'payment.client_supplier_id AS client_supplier_id',
            'cs.client_supplier_name AS client_supplier_name',
            'pc.cash_retention_type AS cash_retention_type',
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
            'payment.payment_claim_id AS payment_claim_id',
            // Add other fields as needed
          ])
          .leftJoin('subpayment.paymentDetails', 'payment')

          .leftJoin('payment.clientSupplierDetails', 'cs')

          .leftJoin('payment.paymentClaims', 'pc')
          .addSelect('pc.claim_type AS claim_type')
          .addSelect('pc.claim_amount AS claim_amount')
          .addSelect((subQuery) => {
            return subQuery
              .select(
                "json_agg(json_build_object('payment_id', p.payment_id, 'payment_type', p.payment_type))",
                'payments',
              )
              .from(PaymentDetails, 'p')
              .where('p.payment_claim_id = pc.payment_claim_id')
              .andWhere("p.current_status != 'Deleted'")
              .andWhere(
                `p.payment_type NOT IN ('Overpayment from client',
                'Underpayment from client','Overpayment to supplier',
                'Underpayment to supplier')`,
              );
          }, 'payments')

          .leftJoin('payment.paymentFromAccount', 'fromAccount')
          .addSelect('fromAccount.account_name', 'payment_from_account_name')

          .leftJoin('payment.paymentToAccount', 'toAccount')
          .addSelect('toAccount.account_name', 'payment_to_account_name')

          .leftJoin('payment.retentionAccount', 'retentionAcc')
          .addSelect('retentionAcc.account_name', 'retention_account_name')

          .where('subpayment.amount IN (:...amounts)', {
            amounts: txn_amounts,
          })

          //   .where('(subpayment.amount IN (:...amounts) OR (subpayment.id IN (:...OverUnderPayments))', {
          //     amounts: txn_amounts,
          //     OverUnderPayments: paymentsWithOverPayments
          // })

          // .andWhere('DATE(payment.payment_date) IN (:...dates)', {
          //   dates: txns.map((txn) => txn.txn_date),
          // })

          .andWhere(
            ` 
              (payment.payment_from_account IN (:...accounts) OR 
              payment.payment_to_account IN (:...accounts) OR
              payment.retention_account IN (:...accounts)
          )`,
            { accounts: txns.map((txn) => txn.bank_account) },
          )
          .andWhere('subpayment.status = :status', {
            status: 'Unmatched',
          })
          .andWhere('payment.current_status != :delstatus', {
            delstatus: 'Deleted',
          })
          .andWhere(
            `(
              ((subpayment.sub_payment_type = :subpaymentType1) AND :bankAccount = payment.retention_account) 
              OR 
              ((subpayment.sub_payment_type = :subpaymentType2 AND pc.cash_retention_type = :retention) AND :bankAccount = payment.payment_from_account)
              OR 
              ((:bankAccount = payment.payment_from_account OR :bankAccount = payment.payment_to_account))
              )`,
            {
              bankAccount: txns[0].bank_account,
              subpaymentType1: 'Retention In',
              subpaymentType2: 'Payment',
              retention: 'Retention claim',
            },
          )
          .andWhere('payment.payment_date IS NOT NULL')
          // .orderBy(
          //   'ABS(EXTRACT(EPOCH FROM (payment.payment_date - :txnDate)))',
          //   'ASC',
          // )
          .orderBy(
            `ABS((payment.payment_date::date - ((CAST(:txnDate AS timestamptz) AT TIME ZONE :userTz)::date)))`,
            'ASC',
          )
          .setParameter('txnDate', txns[0].txn_date)
          .setParameter('userTz', timezone);

        const rawPayments = await matchingPayments.getRawMany();

        for (const result of rawPayments) {
          if (
            result.cash_retention_type === 'Retention claim' &&
            result.retention_id
          ) {
            const retentionDetails = await this.retentionDetailsRepo.findOne({
              where: { retention_id: result.retention_id },
              select: ['beneficiary_type'],
            });

            if (!retentionDetails) {
              throw new Error(
                'Retention list entry not found for the associated retention sub payment details present in claim.',
              );
            }

            result.beneficiary_type = retentionDetails.beneficiary_type;
          }
        }

        const matchingPayment = rawPayments.map((result) => ({
          ...result,
          claim_details: {
            beneficiary_type: result.beneficiary_type || null,
            payments: Array.isArray(result.payments)
              ? result.payments // If it's already an array, use it directly
              : result.payments
                ? JSON.parse(result.payments) // Parse only if it's a string
                : [],
          },
        }));

        // const matchingPayment = await matchingPayments.getRawMany();

        return framedResponse(
          'SUCCESS',
          `All matching payments fetched successfully.`,
          { transactions: txns, payments: matchingPayment },
        );
      } else {
        throw new Error('Transactions not Found');
      }
    } catch (error) {
      this.logger.error(
        `Errored while fetching matching payments with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async matchTxnsToPayments(
    transaction_ids: string[],
    sub_payment_ids: number[],
    userID: number,
    externalManager?: EntityManager,
  ) {
    try {
      const execute = async (transactionalEntityManager: EntityManager) => {
          this.logger.log(
            `Handling request for fetching matching payments for transaction with IDs: ${JSON.stringify(transaction_ids)}`,
          );

          let showJournalMessage = false;

          if (transaction_ids.length > 1 && sub_payment_ids.length > 1) {
            throw new Error(
              'Only one of transaction_ids or payment_ids can have multiple values.',
            );
          }

          const txns = await transactionalEntityManager
            .createQueryBuilder(TransactionDetails, 't')
            .select([
              't.id AS id',
              't.txn_date AS txn_date',
              't.status AS status',
              't.bank_account_id AS bank_account_id',
              `CASE
                WHEN t.txn_amount > 0 THEN t.txn_amount
                ELSE NULL
            END AS received_amount`,
              `CASE
                WHEN t.txn_amount < 0 THEN t.txn_amount
                ELSE NULL
            END AS spent_amount`,
              't.matched_payment_ids AS matched_to',
            ])
            .where('t.id IN (:...ids)', { ids: transaction_ids })
            .getRawMany();
          // console.log('txns', txns);

          if (txns.length === 0) {
            throw new Error('Transactions not found');
          }

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
          // console.log('payments', payments);

          if (payments.length === 0) {
            throw new Error('Payments not found');
          }

          const totalPaymentAmount = payments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount),
            0,
          );
          //  console.log('totalPaymentAmount', totalPaymentAmount);

          // Calculate the sum of all txn amounts
          const totalTxnAmount = txns.reduce((sum, txn) => {
            if (txn.spent_amount !== null) sum += parseFloat(txn.spent_amount);
            if (txn.received_amount !== null)
              sum += parseFloat(txn.received_amount);
            return sum;
          }, 0);
          //  console.log('totalTxnAmount', totalTxnAmount);

          // Compare the sums and throw error if they are not equal
          if (totalPaymentAmount !== totalTxnAmount) {
            throw new Error(
              'Total payment amount does not match total transaction amount.',
            );
          }

          const uniqueTxns = txns.map((txn) => txn.id);
          const uniquePaymentIds = payments.map(
            (payment) => payment.sub_payment_id,
          );

          await Promise.all(
            txns.map(async (txn) => {
              await transactionalEntityManager
                .createQueryBuilder()
                .update(TransactionDetails)
                .set({
                  matched_payment_ids: uniquePaymentIds,
                  status: 'Matched',
                  is_matched: true,
                })
                .where('id = :id', { id: txn.id })
                .execute();
            }),
          );

          for (const payment of payments) {
            await transactionalEntityManager
              .createQueryBuilder()
              .update(SubPayments)
              .set({
                matched_transactions: uniqueTxns,
                status: 'Matched',
              })
              .where('id = :id', { id: payment.id })
              .execute();

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

            let requestData: any = {
              user_id: userID,
              payment_id: payment.payment_id,
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

            if (
              paymentDetails?.payment_type !== 'Pay - Zero' &&
              paymentDetails?.payment_type !== '3rd Party'
            ) {
              let payment_matched, retention_out_matched, retention_in_matched;
              let is_paid, is_received, is_retained;

              for (const element of paymentDetails.subPayments) {
                // console.log('element: ', element);
                if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_paid_confirmed !== null &&
                  element.is_received_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  is_paid = element.is_paid_confirmed;
                  payment_matched =
                    element.status === 'Unmatched' ? false : true;
                } else if (
                  element.sub_payment_type === 'Retention Out' &&
                  element.is_retention_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_received_confirmed === null
                ) {
                  is_retained = element.is_retention_confirmed;
                  retention_out_matched =
                    element.status === 'Unmatched' ? false : true;
                } else if (element.sub_payment_type === 'Retention In') {
                  retention_in_matched =
                    element.status === 'Unmatched' ? false : true;
                } else if (
                  element.sub_payment_type === 'Payment' &&
                  element.is_received_confirmed !== null &&
                  element.is_paid_confirmed === null &&
                  element.is_retention_confirmed === null
                ) {
                  is_received = element.is_received_confirmed;
                  payment_matched =
                    element.status === 'Unmatched' ? false : true;
                }
              }

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
                  [
                    'Full',
                    'Part',
                    'Pay Less - Full',
                    'Pay Less - Part',
                  ].includes(paymentDetails?.payment_type)) ||
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
                  is_paid_confirmed: is_paid,
                  payment_matched: payment_matched,
                  is_retention_confirmed: paymentDetails?.cash_retention
                    ? is_retained
                    : undefined,
                  retention_out_matched: retention_out_matched,
                  retention_in_matched: retention_in_matched,
                };
              } else {
                requestData = {
                  ...requestData,
                  is_received_confirmed: is_received,
                  payment_matched: payment_matched,
                };
                // console.log('else : ', requestData);
              }
            }

            await this.updateClaimAndPaymentStatuses(
              transactionalEntityManager,
              requestData,
            );

            showJournalMessage = await this.paymentClaimsService.createJournals(
              transactionalEntityManager,
              claimDetails,
              paymentDetails,
              payment?.sub_payment_type,
              null,
              null,
              false,
              userID,
            );

            const userDetails = await this.userDetailsRepo.findOne({
              where: { user_id: userID },
            });

            if (
              ![
                'Overpayment from client',
                'Underpayment from client',
                'Overpayment to supplier',
                'Underpayment to supplier',
              ].includes(payment?.payment_type)
            ) {
              //Generating bank account link to view matched transactions. &mode=view&payment=10000000346
              const paymentId = paymentDetails?.payment_id;
              const paymentIdLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[9]}` +
                `${claimDetails?.payment_claim_id != null || claimDetails?.payment_claim_id != undefined ? claimDetails?.payment_claim_id : ''}` +
                `&mode=view&payment=` +
                `${paymentId}` +
                `&from=log`;
              // console.log('paymentIdLink', paymentIdLink);

              //Create activity log as soon a payment claim is created.
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 124,
                from_user: userID,
                company_id: payment.company_id,
                dynamic_values: {
                  userName: userDetails.first_name + userDetails.last_name,
                  paymentIdLink,
                  paymentId,
                },
                is_admin: false,
                created_by: userID,
              };
              //// console.log('createActivityLogInput', createActivityLogInput);
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            } else {
              const overunderPaymentId = payment.payment_id;
              // const overunderpaymentLink =
              //   `${process.env.LOG_BASE_URL}` +
              //   `${linkExtensions[9]}` +
              //   `${claimDetails?.payment_claim_id != null || claimDetails?.payment_claim_id != undefined ? claimDetails?.payment_claim_id : ''}` +
              //   `&mode=view&payment=` +
              //   `${overunderPaymentId}`;
              const overunderpaymentLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[13]}` +
                `${overunderPaymentId}` +
                `?from=log`;
              // console.log('overpaymentLink', overunderpaymentLink);

              const overunderpaymentAmount = Math.abs(
                parseFloat(payment.amount),
              );
              const clientSuppliername = payment.client_supplier_name;

              const clientSuppliernameLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[5]}` +
                payment.client_supplier_id_string +
                `?from=log`;
              // console.log('clientSupplierLink', clientSuppliernameLink);

              // const original_sub_payment_id = sub_payment_ids.filter(
              //   (id) => id !== Number(payment.sub_payment_id),
              // );

              // const original_payment_details = await transactionalEntityManager
              //   .createQueryBuilder(SubPayments, 'subpayment')
              //   .select([
              //     'subpayment.id AS id',
              //     'subpayment.payment_id AS payment_id',
              //   ])
              //   .where('sub_payment_id IN (:...ids)', {
              //     ids: original_sub_payment_id,
              //   })
              //   .getRawOne();

              //finding out the payment ID which the over/under payment is associated with.
              const original_payment_id = payment?.associated_payment_id;

              const paymentIdLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[9]}` +
                `${claimDetails?.payment_claim_id != null || claimDetails?.payment_claim_id != undefined ? claimDetails?.payment_claim_id : ''}` +
                `&mode=view&payment=` +
                `${original_payment_id}` +
                `&from=log`;
              // console.log('original_payment_link', paymentIdLink);

              let createActivityLogInput: CreateActivityLogInput | null = null;

              if (paymentDetails.payment_type === 'Overpayment from client') {
                createActivityLogInput = {
                  event_template_id: 120,
                  from_user: userID,
                  company_id: payment.company_id,
                  dynamic_values: {
                    userName: userDetails.first_name + userDetails.last_name,
                    overunderpaymentLink,
                    overunderpaymentAmount,
                    clientSuppliernameLink,
                    clientSuppliername,
                    paymentIdLink,
                    paymentId: original_payment_id,
                  },
                  is_admin: false,
                  created_by: userID,
                };
              } else if (
                paymentDetails.payment_type === 'Overpayment to supplier'
              ) {
                createActivityLogInput = {
                  event_template_id: 121,
                  from_user: userID,
                  company_id: payment.company_id,
                  dynamic_values: {
                    userName: userDetails.first_name + userDetails.last_name,
                    overunderpaymentLink,
                    overunderpaymentAmount,
                    clientSuppliernameLink,
                    clientSuppliername,
                    paymentIdLink,
                    paymentId: original_payment_id,
                  },
                  is_admin: false,
                  created_by: userID,
                };
              } else if (
                paymentDetails.payment_type === 'Underpayment to supplier'
              ) {
                createActivityLogInput = {
                  event_template_id: 122,
                  from_user: userID,
                  company_id: payment.company_id,
                  dynamic_values: {
                    userName: userDetails.first_name + userDetails.last_name,
                    overunderpaymentLink,
                    overunderpaymentAmount,
                    clientSuppliernameLink,
                    clientSuppliername,
                    paymentIdLink,
                    paymentId: original_payment_id,
                  },
                  is_admin: false,
                  created_by: userID,
                };
              } else if (
                paymentDetails.payment_type === 'Underpayment from client'
              ) {
                createActivityLogInput = {
                  event_template_id: 123,
                  from_user: userID,
                  company_id: payment.company_id,
                  dynamic_values: {
                    userName: userDetails.first_name + userDetails.last_name,
                    overunderpaymentLink,
                    overunderpaymentAmount,
                    clientSuppliernameLink,
                    clientSuppliername,
                    paymentIdLink,
                    paymentId: original_payment_id,
                  },
                  is_admin: false,
                  created_by: userID,
                };
              }
              //// console.log('createActivityLogInput', createActivityLogInput);
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          }

          // create retentions
          let subPaymentIds = [];
          for (const element of payments) {
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
              ])
              .where('subpayment.payment_id =:payment_id', {
                payment_id: element?.payment_id,
              })
              .getRawMany();

            if (element.sub_payment_type == 'Retention In') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Retention Out' &&
                  !p.is_retention_confirmed,
              );

              if (isConfirmed) {
                if (element.status === 'Auto matched') {
                  const isPayment = subPaymentDetails?.find(
                    (p) => p.sub_payment_type === 'Payment',
                  );
                  subPaymentIds.push(isPayment.sub_payment_id);
                } else {
                  subPaymentIds.push(element.sub_payment_id);
                }
              }
            } else if (element.sub_payment_type == 'Retention') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Payment' && !p.is_received_confirmed,
              );

              if (isConfirmed) {
                subPaymentIds.push(isConfirmed.sub_payment_id);
              }
            } else if (
              element.cash_retention_type == 'Retention claim' &&
              element.sub_payment_type == 'Payment' &&
              ((element.claim_type == 'Billable' &&
                !element.is_paid_confirmed) ||
                (element.claim_type == 'Receivable' &&
                  !element.is_received_confirmed))
            ) {
              subPaymentIds.push(element.sub_payment_id);
            }
          }

          if (subPaymentIds && subPaymentIds?.length > 0) {
            await this.paymentsService.createOrDeleteRetentionEntries(
              transactionalEntityManager,
              subPaymentIds,
              false,
            );
          }

          const PaymentIdsNotice = [
            ...new Set(
              payments
                .filter((item) => item.notice_generated === false)
                .map((item) => item.payment_id),
            ),
          ];

          return framedResponse(
            'SUCCESS',
            showJournalMessage
              ? 'Trust journal updated'
              : `Transactions matched successfully.`,
            {
              transactions: txns,
              payments: payments,
              payment_Ids: PaymentIdsNotice,
            },
          );
      };
      return externalManager ? await execute(externalManager) : await this.entityManager.transaction(execute);
    } catch (error) {
      this.logger.error(
        `Errored while matching transactions with message: ${error}`,
      );
      return framedResponse('ERROR', `${error.message}`);
    }
  }

  async unmatchTxnsPayments(
    transaction_id: string,
    confirm: boolean = false,
    userID: number,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          if (!transaction_id) {
            throw new Error('Transaction_id must be provided.');
          }

          this.logger.log(
            `Handling request for unmatching payments for transaction ID: ${transaction_id}`,
          );

          let txn, txns, payments;

          let showJournalMessage = false;

          txn = await transactionalEntityManager
            .createQueryBuilder(TransactionDetails, 't')
            .select([
              't.id AS id',
              't.status AS status',
              't.txn_date AS txn_date',
              't.description AS description',
              't.matched_payment_ids AS matched_to',
              `CASE
                WHEN t.txn_amount > 0 THEN ABS(t.txn_amount)
                  ELSE NULL
                END AS received_amount`,
              `CASE
                WHEN t.txn_amount < 0 THEN ABS(t.txn_amount)
                  ELSE NULL
                END AS spent_amount`,
            ])
            .where('t.id = :id', { id: transaction_id })
            .getRawMany();

          if (txn.length === 0) {
            throw new Error('Transaction not found');
          }

          if (txn[0].matched_to === '') {
            throw new Error('Transaction is not matched');
          }

          let matchedPaymentIds = txn[0].matched_to;
          let additionalTxns;
          matchedPaymentIds = matchedPaymentIds.split(',').map(Number);

          if (matchedPaymentIds.length === 1) {
            const matchedPaymentId = matchedPaymentIds[0];
            additionalTxns = await transactionalEntityManager
              .createQueryBuilder(TransactionDetails, 't')
              .select([
                't.id AS id',
                't.status AS status',
                't.txn_date AS txn_date',
                't.matched_payment_ids AS matched_to',
                't.description AS description',
                `CASE
                WHEN t.txn_amount > 0 THEN ABS(t.txn_amount)
                  ELSE NULL
                END AS received_amount`,
                `CASE
                WHEN t.txn_amount < 0 THEN ABS(t.txn_amount)
                  ELSE NULL
                END AS spent_amount`,
              ])
              .where('t.matched_payment_ids = :ids', { ids: matchedPaymentId })
              .andWhere('t.id != :excludedId', { excludedId: transaction_id })
              .getRawMany();

            txns = [...txn, ...additionalTxns];
          } else {
            txns = [...txn];
          }

          // Fetch the payments matched to the transaction
          payments = await transactionalEntityManager
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
              ids: matchedPaymentIds,
            })
            .getRawMany();

          if (!confirm) {
            return framedResponse('SUCCESS', `Please confirm to proceed.`, {
              transactions: txn,
              related_transactions: additionalTxns,
              payments: payments,
              groupTxn: true,
            });
          }

          let paymentIds = [];
          for (const payment of payments) {
            if (!paymentIds.includes(payment.payment_id)) {
              paymentIds.push(payment.payment_id);
            }
            // console.log('payment.payment_type: ', payment.payment_type);
            if (
              payment.payment_type == 'Part' ||
              payment.payment_type == 'Pay Less - Part'
            ) {
              const partPayments = await this.paymentsRepo.find({
                where: {
                  payment_claim_id: payment.payment_claim_id,
                  current_status: Not('Deleted'),
                  associatedPayment: IsNull(),
                },
                select: [
                  'payment_id',
                  'total_amount',
                  'current_status',
                  'payment_date',
                ],
                order: { payment_id: 'DESC' },
              });

              if (partPayments.length > 1) {
                const paymentIndex = partPayments.findIndex(
                  (p) => p.payment_id === payment.payment_id,
                );

                if (paymentIndex > 0) {
                  // If it's not the latest payment (not the first in the ordered list)
                  throw new Error(
                    'Cannot unmatch this part payment because other related part payments are matched already',
                  );
                }
              }
            }
          }

          await Promise.all(
            txns.map(async (txn) => {
              await transactionalEntityManager
                .createQueryBuilder()
                .update(TransactionDetails)
                .set({
                  matched_payment_ids: [],
                  status: 'Unmatched',
                  is_matched: false,
                })
                .where('id = :id', { id: txn.id })
                .execute();
            }),
          );

          await Promise.all(
            payments.map(async (payment) => {
              await transactionalEntityManager
                .createQueryBuilder()
                .update(SubPayments)
                .set({ matched_transactions: [], status: 'Unmatched' })
                .where('id = :id', { id: payment.id })
                .execute();
            }),
          );

          // create retentions
          let subPaymentIds = [];
          for (const element of payments) {
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
              ])
              .where('subpayment.payment_id =:payment_id', {
                payment_id: element?.payment_id,
              })
              .getRawMany();

            if (element.sub_payment_type == 'Retention In') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Retention Out' &&
                  !p.is_retention_confirmed,
              );

              if (isConfirmed) {
                if (element.status === 'Auto matched') {
                  const isPayment = subPaymentDetails?.find(
                    (p) => p.sub_payment_type === 'Payment',
                  );
                  subPaymentIds.push(isPayment.sub_payment_id);
                } else {
                  subPaymentIds.push(element.sub_payment_id);
                }
              }
            } else if (element.sub_payment_type == 'Retention') {
              const isConfirmed = subPaymentDetails?.find(
                (p) =>
                  p.sub_payment_type === 'Payment' && !p.is_received_confirmed,
              );

              if (isConfirmed) {
                subPaymentIds.push(isConfirmed.sub_payment_id);
              }
            } else if (
              element.cash_retention_type == 'Retention claim' &&
              element.sub_payment_type == 'Payment' &&
              ((element.claim_type == 'Billable' &&
                !element.is_paid_confirmed) ||
                (element.claim_type == 'Receivable' &&
                  !element.is_received_confirmed))
            ) {
              subPaymentIds.push(element.sub_payment_id);
            }
          }

          if (subPaymentIds && subPaymentIds?.length > 0) {
            await this.paymentsService.createOrDeleteRetentionEntries(
              transactionalEntityManager,
              subPaymentIds,
              true,
            );
          }

          //  console.log('paymentIds: ', paymentIds);

          if (paymentIds && paymentIds.length > 0) {
            const paymentDetails = await transactionalEntityManager.find(
              PaymentDetails,
              {
                where: { payment_id: In(paymentIds) },
                relations: ['subPayments'],
              },
            );

            for (const element of paymentDetails) {
              //getting the notices and archiving
              const notices = await transactionalEntityManager.find(
                NoticeDetails,
                {
                  where: {
                    payment_id: element.payment_id,
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
                  notice.updated_by = userID;
                  notice.updated_on = moment().tz('UTC');
                  notice.updated_group = 'USER';
                });
                await transactionalEntityManager.save(notices);
              }

              //marking payment as notice not-generated
              const payment = await transactionalEntityManager.findOne(
                PaymentDetails,
                {
                  where: { payment_id: element.payment_id },
                  lock: { mode: 'pessimistic_write' },
                },
              );
              payment.notice_generated = false;
              payment.updated_on = moment.tz('UTC');
              payment.updated_group = 'USER';
              await transactionalEntityManager.save(payment);

              const filteredSubPaymentIds = element.subPayments.map(
                (item) => item.sub_payment_id,
              );
              const filteredSubPayments = payments.filter((item) =>
                filteredSubPaymentIds.includes(item.sub_payment_id),
              );
              const claimDetails = element.payment_claim_id
                ? await transactionalEntityManager.findOne(PaymentClaims, {
                    where: { payment_claim_id: element.payment_claim_id },
                    lock: { mode: 'pessimistic_write' },
                  })
                : null;

              let requestData: any = {
                user_id: userID,
                payment_id: element.payment_id,
                payment_type: element.payment_type,
                current_payment_status: element.current_status,
                previous_payment_status: element.current_status,
                list_status: element.list_status,
              };

              if (element.payment_claim_id && claimDetails) {
                requestData = {
                  ...requestData,
                  payment_claim_id: element.payment_claim_id,
                  previous_claim_status: claimDetails?.status,
                  current_claim_status: claimDetails?.status,
                  cash_retention_type: claimDetails?.cash_retention_type,
                  claim_type: claimDetails?.claim_type,
                };
              }

              if (
                claimDetails?.claim_type === 'Billable' ||
                claimDetails?.claim_type === 'Receivable'
              ) {
                requestData = {
                  ...requestData,
                  cash_retention: element.cash_retention,
                };
              }

              let payment_matched,
                retention_out_matched,
                retention_in_matched,
                is_paid_confirmed,
                is_retention_confirmed,
                is_received_confirmed;

              if (
                (claimDetails?.claim_type === 'Billable' &&
                  [
                    'Full',
                    'Part',
                    'Pay Less - Full',
                    'Pay Less - Part',
                  ].includes(element?.payment_type)) ||
                [
                  'Interest Withdrawal',
                  'Bank Charge Applied',
                  'Withdrawal',
                  'Overpayment refund to client',
                  'Overpayment to supplier',
                  'Underpayment to supplier',
                ].includes(element.payment_type)
              ) {
                for (const ele of element.subPayments) {
                  if (ele.sub_payment_type === 'Payment') {
                    payment_matched = ele.status === 'Unmatched' ? false : true;
                    is_paid_confirmed = ele.is_paid_confirmed;
                  } else if (ele.sub_payment_type === 'Retention Out') {
                    retention_out_matched =
                      ele.status === 'Unmatched' ? false : true;
                    is_retention_confirmed = ele.is_retention_confirmed;
                  } else if (ele.sub_payment_type === 'Retention In') {
                    retention_in_matched =
                      ele.status === 'Unmatched' ? false : true;
                  }
                }
                requestData = {
                  ...requestData,
                  is_paid_confirmed: is_paid_confirmed,
                  payment_matched: payment_matched,
                  is_retention_confirmed: is_retention_confirmed,
                  retention_out_matched: retention_out_matched,
                  retention_in_matched: retention_in_matched,
                };
              } else {
                for (const ele of element.subPayments) {
                  if (ele.sub_payment_type === 'Payment') {
                    payment_matched = ele.status === 'Unmatched' ? false : true;
                    is_received_confirmed = ele.is_received_confirmed;
                  }
                }
                requestData = {
                  ...requestData,
                  is_received_confirmed: is_received_confirmed,
                  payment_matched: payment_matched,
                };
              }

              await this.updateClaimAndPaymentStatuses(
                transactionalEntityManager,
                requestData,
              );

              showJournalMessage =
                await this.paymentClaimsService.createJournals(
                  transactionalEntityManager,
                  claimDetails,
                  paymentDetails,
                  null,
                  element,
                  filteredSubPayments,
                  true,
                  userID,
                );
            }
          }

          const userDetails = await this.userDetailsRepo.findOne({
            where: { user_id: userID },
          });

          const paymentId = payments[0]?.payment_id;
          const paymentIdLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[9]}` +
            `${payments[0].payment_claim_id != null || payments[0]?.payment_claim_id != undefined ? payments[0]?.payment_claim_id : ''}` +
            `&mode=view&payment=` +
            `${paymentId}` +
            `&from=log`;
          // console.log('paymentIdLink', paymentIdLink);

          // Generating bank account link to view matched transactions.
          // const bankAccountLink =
          //   `${process.env.LOG_BASE_URL}` +
          //   `${linkExtensions[12]}` +
          //   `${payments[0].company_id}/` +
          //   `${payments[0].payment_from_account ? payments[0].payment_from_account : payments[0].payment_to_account}`;

          //Create activity log as soon a payment claim is created.
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 125,
            from_user: userID,
            company_id: payments[0].company_id,
            dynamic_values: {
              userName: userDetails.first_name + userDetails.last_name,
              paymentId,
              paymentIdLink,
            },
            is_admin: false,
            created_by: userID,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          if (txns.length > 1) {
            return framedResponse(
              'SUCCESS',
              `More than one transactions unmatched`,
              { transactions: txns, payments: payments },
            );
          }

          return framedResponse(
            'SUCCESS',
            showJournalMessage
              ? 'Trust journal updated'
              : `Transactions unmatched successfully.`,
            { transactions: txns, payments: payments },
          );
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while unmatching transactions with message: ${error}`,
      );
      return framedResponse('ERROR', `${error}`);
    }
  }

  async deleteTxns(transaction_ids: string[], decoded: any) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const txns = await transactionalEntityManager
            .createQueryBuilder(TransactionDetails, 't')
            .select([
              't.id AS id',
              't.txn_date AS txn_date',
              't.status AS status',
              't.bank_account_id AS bank_account_id',
              't.company_id AS company_id',
              't.txn_amount AS txn_amount',
            ])
            .where('t.id IN (:...ids)', { ids: transaction_ids })
            .andWhere('t.status IN (:...txnStatus)', {
              txnStatus: ['To Review', 'Unmatched'],
            })
            .getRawMany();

          const account_details = txns[0].bank_account_id
            ? await transactionalEntityManager.findOne(BankAccounts, {
                where: {
                  bank_account_id: txns[0].bank_account_id,
                },
              })
            : null;

          if (txns.length === 0) {
            throw new Error('Transactions not found');
          } else {
            const updateResult = await transactionalEntityManager
              .createQueryBuilder()
              .update(TransactionDetails)
              .set({ status: 'Deleted' }) // Set the new status
              .where('id IN (:...ids)', { ids: txns.map((txn) => txn.id) }) // Apply the update to the selected IDs
              .execute();

            const userId =
              decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : decoded?.user_id;

            await Promise.all(txns.map(async (txn) => {
              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 127,
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
                company_id: txn.company_id,
                dynamic_values: {
                  totalAmount: formatCurrency(txn.txn_amount),
                  accountName: account_details.account_name,
                },
                is_admin: false,
                created_by: userId,
              };
              //// console.log('createActivityLogInput', createActivityLogInput);
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }));
          }
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while deleting transactions with message: ${error}`,
      );
      return framedResponse('ERROR', `${error.message}`);
    }
  }

  async updateClaimAndPaymentStatuses(
    transactionalEntityManager,
    data: any,
  ): Promise<Boolean> {
    try {
      //  console.log('data: ', data);
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
      const x = await transactionalEntityManager
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
      // console.log('updatePaymentButtons: ', updatePaymentButtons);

      if (
        data?.payment_claim_id &&
        current_claim_status &&
        data?.previous_claim_status !== current_claim_status &&
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
        const y = await transactionalEntityManager
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
        // console.log('updateClaimButtons: ', updateClaimButtons);

        // throw new Error();
        return true;
      } else {
        return true;
      }
    } catch (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  async bulkUnmatchTxnsPayments(
    transaction_ids: string[],
    confirm: boolean = false,
    userId: number,
  ) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          if (!transaction_ids || transaction_ids.length === 0) {
            throw new Error('Transaction_ids must be provided.');
          }

          this.logger.log(
            `Handling request for unmatching payments for transaction IDs: ${transaction_ids.join(', ')}`,
          );

          let txns;
          let payments;

          txns = await transactionalEntityManager
            .createQueryBuilder(TransactionDetails, 't')
            .select([
              't.id AS id',
              't.status AS status',
              't.txn_date AS txn_date',
              't.matched_payment_ids AS matched_to',
            ])
            .where('t.id IN (:...ids)', { ids: transaction_ids })
            .andWhere('t.status = :status', { status: 'Matched' })
            .getRawMany();

          if (txns.length === 0) {
            throw new Error('Matched transactions not found for the given IDs');
          }

          let allMatchedPaymentIds = new Set<number>();
          txns.forEach((txn) => {
            if (txn.matched_to) {
              txn.matched_to
                .split(',')
                .forEach((id) => allMatchedPaymentIds.add(Number(id)));
            }
          });

          let matchedPaymentIds = Array.from(allMatchedPaymentIds);

          const additionalTxns = await transactionalEntityManager
            // this.transactionDetailsRepo
            .createQueryBuilder(TransactionDetails, 't')
            .select([
              't.id AS id',
              't.status AS status',
              't.txn_date AS txn_date',
              't.matched_payment_ids AS matched_to',
            ])

            .where('t.matched_payment_ids IN (:...ids)', {
              ids: matchedPaymentIds,
            })
            .andWhere('t.status = :status', { status: 'Matched' })
            .getRawMany();

          // Fetch the payments matched to the transaction
          payments = await transactionalEntityManager
            .createQueryBuilder(SubPayments, 'subpayment')
            .select([
              'subpayment.id AS id',
              'subpayment.sub_payment_id AS sub_payment_id',
              'subpayment.status AS status',
              'subpayment.amount AS amount',
              'subpayment.sub_payment_type AS sub_payment_type',
              'subpayment.matched_transactions AS matched_to',
            ])
            .where('subpayment.sub_payment_id IN (:...ids)', {
              ids: matchedPaymentIds,
            })
            .getRawMany();

          let nonRetainedPayments = [];

          for (let payment of payments) {
            if (payment.sub_payment_type === 'Retention In') {
              let retentionRecord = await transactionalEntityManager
                .createQueryBuilder(RetentionDetails, 'retention')
                .select('retention.retention_status AS status')
                .where('retention.sub_payment_id = :id', {
                  id: payment.sub_payment_id,
                })
                .getRawOne();

              if (retentionRecord && retentionRecord.status !== 'Retained') {
                nonRetainedPayments.push(payment);
              }
              this.logger.log(
                `Function for deleting retention list and retention summary called with data:  ${JSON.stringify(payment.sub_payment_id)}`,
              );
              const data = {
                sub_payment_id: payment.sub_payment_id,
                claim_type: payment.claim_type,
              };
            } else if (
              payment.sub_payment_type === 'payment' &&
              payment.cash_retention_type == 'Retention claim'
            ) {
              this.logger.log(
                `Function for deleting retention summary called with data:  ${JSON.stringify(payment.sub_payment_id)}`,
              );
              const data = {
                sub_payment_id: payment.sub_payment_id,
              };
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
            }
          }
          if (nonRetainedPayments.length) {
            return framedResponse(
              'ERROR',
              `Cannot unmatch Retention transactions which are already claimed. Delete retention claims and retry.`,
              { transactions: txns, payments: nonRetainedPayments },
            );
          }

          if (additionalTxns.length > txns.length && !confirm) {
            return framedResponse(
              'SUCCESS',
              `More transactions other than the selected list will be affected. Please confirm to proceed.`,
              {
                transactions: additionalTxns,
                payments: payments,
                groupTxn: true,
              },
            );
          }

          if (additionalTxns.length > txns.length) {
            txns = [...additionalTxns];
          }

          await Promise.all(
            txns.map(async (txn) => {
              await this.unmatchTxnsPayments(txn.id, true, userId);
            }),
          );

          return framedResponse(
            'SUCCESS',
            `Transactions unmatched successfully.`,
            { transactions: txns, payments: payments },
          );
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while unmatching transactions with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async excludeTransactions(data: ExcludeTransactionInput, userId: number) {
    try {
      this.logger.log(
        `Handling request for changing the status of transaction with data: ${JSON.stringify(data)}`,
      );

      const { txn_id, exclude_txn_id } = data;

      const transaction_one = await this.transactionDetailsRepo.findOne({
        where: { id: txn_id },
      });

      const transaction_exclude = await this.transactionDetailsRepo.findOne({
        where: { id: exclude_txn_id },
      });

      if (!transaction_one || !transaction_exclude) {
        throw new Error('Transactions to exclude not found.');
      }

      if (
        transaction_one.status === 'Matched' ||
        transaction_exclude.status === 'Matched'
      ) {
        throw new Error("You can't exclude matched transactions.");
      }

      if (
        transaction_one.status === 'Excluded' ||
        transaction_exclude.status === 'Excluded'
      ) {
        throw new Error('Already excluded transactions found.');
      }

      if (
        Number(transaction_one.txn_amount) !==
        -Number(transaction_exclude.txn_amount)
      ) {
        throw new Error(
          'Please select two equal and opposite transactions to proceed to exclude',
        );
      }

      await this.transactionDetailsRepo
        .createQueryBuilder()
        .update(TransactionDetails)
        .set({ status: 'Excluded', updated_by: userId })
        .where('id IN (:...txn_ids)', { txn_ids: [txn_id, exclude_txn_id] })
        .execute();
      this.logger.log(`Transactions excluded successfully.`);

      const transactionDetails = await this.transactionDetailsRepo
        .createQueryBuilder('tr')
        .select([
          'tr.company_id AS company_id',
          'tr.transaction_id AS transaction_id',
          'tr.bank_account_id AS bank_account_id',
        ])
        .where('tr.id = :transaction_id', { transaction_id: exclude_txn_id })
        .getRawOne();

      const userDetails = await this.userDetailsRepo.findOne({
        where: { user_id: userId },
      });
      // console.log('userDetails2', userDetails);

      const bankDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id: transactionDetails.bank_account_id },
      });
      // console.log('Account name', bankDetails.account_name);

      //Generating bank account link to view matched transactions.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[12]}` +
        `${transactionDetails.bank_account_id}/` +
        `${transactionDetails.company_id}` +
        `?from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a payment claim is created.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 126,
        from_user: userId,
        company_id: transactionDetails.company_id,
        dynamic_values: {
          userName: userDetails.first_name + userDetails.last_name,
          bankAccountLink,
          bankAccountName: bankDetails.account_name,
        },
        is_admin: false,
        created_by: userId,
      };
      //// console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse('SUCCESS', `Transactions excluded successfully.`);
    } catch (error) {
      this.logger.error(
        `Errored while excluding transaction with message: ${error}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async processUploadedTxnCsvFile(
    filePath: string,
    bank_account_id: number,
    userId: number,
  ): Promise<any> {
    try {
      // Download CSV file from Object Storage
      const fileBuffer = await this.objectStorageService.downloadFile(filePath);
      if (!fileBuffer) {
        throw new Error(`Failed to download CSV file from storage: ${filePath}`);
      }

      // Parse CSV from buffer
      const csvContent = fileBuffer.toString('utf-8');
      const records = parse(csvContent, { columns: true });

      await this.temperoryRepoTransactions
        .createQueryBuilder()
        .delete()
        .execute();

      await this.storeInTemporaryTable(records);

      const filteredrecords = await this.filterEntries(bank_account_id);

      this.log(`Successfully filtered uploaded CSV file: ${filePath}`);

      return framedResponse(
        'SUCCESS',
        `Transactions found successfully in the uploaded file.`,
        filteredrecords,
      );
    } catch (error) {
      this.logError(`Error processing CSV file: ${error.message}`);
      throw error;
    }
  }

  //storing the csv in a temp entity
  async storeInTemporaryTable(records) {
    try {
      await this.temperoryRepoTransactions
        .createQueryBuilder()
        .delete()
        .execute();

      const validationErrors = [];
      const singleValidationError = [];
      const emptyFields = [];
      const filteredRecords = records.filter((record) => {
        const allFieldsEmpty =
          record.txn_amount.trim() === '' &&
          record.txn_date.trim() === '' &&
          record.balance.trim() === '';

        if (allFieldsEmpty) {
          return false; // Exclude this record from filteredRecords
        }
        let isValid = true;

        if (record.txn_amount.trim() === '') {
          emptyFields.push('txn_amount');
          isValid = false;
        }
        if (record.txn_date.trim() === '') {
          emptyFields.push('txn_date');
          isValid = false;
        }
        if (record.balance.trim() === '') {
          emptyFields.push('balance');
          isValid = false;
        }

        return isValid;
      });
      if (records.length === 0) {
        throw new Error(
          `Error: There is no transactions found in uploaded csv`,
        );
      }

      if (emptyFields.length > 0) {
        throw new Error(
          `Mandatory fields missing: ${[...new Set(emptyFields)].join(', ')}`,
        );
      }

      const tempRecords = [];
      filteredRecords.map((record) => {
        const dateRegex = /^\d{2}[-\/]\d{2}[-\/]\d{4}$/;
        let txnDate = new Date(record.txn_date);
        if (dateRegex.test(record.txn_date)) {
          const [day, month, year] = record.txn_date.split(/[-\/]/);
          txnDate = new Date(`${year}-${month}-${day}`);
        }
        if (isNaN(record.txn_amount)) {
          validationErrors.push(`Txn_amount`);
          singleValidationError.push(
            `Amount fields cannot be a non numeric value`,
          );
        }
        if (Number(record.txn_amount) == 0) {
          validationErrors.push(`Txn_amount`);
          singleValidationError.push(
            `Transaction Amount field cannot be a zero`,
          );
        }
        if (isNaN(record.balance)) {
          validationErrors.push(`balance`);
          singleValidationError.push(
            `Amount fields cannot be a non numeric value`,
          );
        }
        if (isNaN(txnDate.getTime())) {
          validationErrors.push(`txn_date(use dd/mm/yyyy)`);
          singleValidationError.push(
            `Invalid date format in the transaction data uploaded csv. Please add dates in dd/mm/yyyy format. `,
          );
        }

        if (validationErrors.length === 0) {
          tempRecords.push({
            txn_date: txnDate,
            description: record.description,
            txn_amount: parseFloat(record.txn_amount),
            balance: parseFloat(record.balance),
            is_processed: false,
          });
        } else if (validationErrors.length === 1) {
          throw new Error(`Error : ${singleValidationError.join(',')}`);
        } else {
          throw new Error(
            `Invalid input syntax : ${validationErrors.join(',')}`,
          );
        }
      });
      await this.temperoryRepoTransactions.save(tempRecords);
    } catch (error) {
      this.logError(
        `Error temperory storing csv file - validations failed: ${error.message}`,
      );
      throw error;
    }
  }

  //function to filter the newly added records from csv upload
  async filterEntries(bank_account_id: number) {
    const tempRecords = await this.temperoryRepoTransactions
      .createQueryBuilder('temp')
      .getMany();
    const filteredRecords = [];
    const recordSet = new Set<string>();
    const duplicateKeysInFile = new Set<string>();

    for (const record of tempRecords) {
      const uniqueKey = `${record.txn_amount}-${record.txn_date}`;

      const existsInFile = recordSet.has(uniqueKey);

      const exists = await this.transactionDetailsRepo.findOne({
        where: {
          txn_amount: record.txn_amount,
          txn_date: record.txn_date,
          bank_account_id: bank_account_id,
          status: Not('Deleted'),
        },
      });
      if (existsInFile) {
        duplicateKeysInFile.add(uniqueKey);
        record.duplicate_check = 'file_duplicate';
        record.is_similar = true;
      } else {
        recordSet.add(uniqueKey);
        if (!exists) {
          // If it does not exist, add to filteredRecords
          record.duplicate_check = 'new';
        } else {
          record.duplicate_check = 'db_duplicate';
          record.is_similar = true;
        }
      }

      filteredRecords.push(record);

      tempRecords.forEach((record) => {
        const uniqueKey = `${record.txn_amount}-${record.txn_date}`;
        if (duplicateKeysInFile.has(uniqueKey)) {
          record.duplicate_check = 'file_duplicate';
          record.is_similar = true;
        }
      });
    } // Check if filteredRecords is empty and throw an error if true
    if (tempRecords.length === 0) {
      throw new Error('No transactions found in the uploaded csv');
    }

    return filteredRecords;
  }

  async fetchBankAccountDetailsforCompliance(bank_account_ids: number[]) {
    const results = await this.bankAccountsRepo
      .createQueryBuilder('ba')
      .select([
        'ba.bank_account_id AS bank_account_id',
        'ba.account_type AS account_type',
        'ba.project_ids AS project_ids',
      ])
      .where('ba.bank_account_id IN (:...bank_account_ids)', {
        bank_account_ids,
      })
      .andWhere('ba.added_by_client_supplier = false')
      .getRawMany();

    return results.map((row) => ({
      bank_account_id: row.bank_account_id,
      account_type: row.account_type,
      project_ids: row.project_ids || [],
    }));
  }

  async addSelectedTransactions(
    selectedIds: string[],
    balance_manual,
    userId,
    companyId,
    AccountId,
    confirm,
  ) {
    try {
      //Map selected IDs to temporary table entries
      const selectedRecords = await this.temperoryRepoTransactions.find({
        where: { id: In(selectedIds) },
        order: { txn_date: 'DESC' },
      });

      let currentBalance = 0;
      let historicTxn = false;

      // const latestRecord = selectedRecords[0];

      const latestDate = selectedRecords[0]?.txn_date;

      const latestTxnsfromDB = await this.transactionDetailsRepo.find({
        where: {
          bank_account_id: AccountId,
          txn_date: MoreThan(latestDate),
        },
        order: { created_on: 'DESC' },
      });

      const bankAccount = await this.bankAccountsRepo.findOne({
        where: { bank_account_id: AccountId },
      });

      if (latestTxnsfromDB.length) {
        const latestDBDate = latestTxnsfromDB[0]?.txn_date;

        const latestDateDBTransactions = latestTxnsfromDB.filter(
          (record) => record.txn_date === latestDBDate,
        );

        const latestDBRecord =
          latestDateDBTransactions[latestDateDBTransactions.length - 1];

        if (latestDBRecord) {
          currentBalance = latestDBRecord?.balance;
          historicTxn = true;
        }
      } else {
        const latestDateTransactions = selectedRecords.filter(
          (record) =>
            new Date(record.txn_date).getDate() ===
            new Date(latestDate).getDate(),
        );

        // The latest record based on txn_date
        const latestRecord =
          latestDateTransactions[latestDateTransactions.length - 1];

        if (latestRecord) {
          currentBalance = latestRecord?.balance;
        }
      }

      if (confirm) {
        if (balance_manual) {
          currentBalance = balance_manual;
        }

        // Add selected records to the main table
        for (const record of selectedRecords) {
          const txnData = this.transformRecordToTxnInput(record);
          txnData.bank_account_id = AccountId;
          txnData.company_id = companyId;

          await this.addTransactions(txnData, userId);
        }

        if (bankAccount) {
          // Update the current balance
          bankAccount.current_balance = currentBalance;
          await this.bankAccountsRepo.save(bankAccount);
        }

        //Clean up the processed temporary records
        await this.temperoryRepoTransactions
          .createQueryBuilder()
          .delete()
          .execute();

        return framedResponse('SUCCESS', `Transactions added successfully.`);
      } else {
        const current_balance = formatCurrency(currentBalance);
        if (historicTxn) {
          //found txn from the previos uploads in db
          return framedResponse(
            'SUCCESS',
            `We have identified the latest bank account balance to be ${current_balance}`,
          );
        } else {
          return framedResponse(
            'SUCCESS',
            `We have identified the latest bank account balance to be ${current_balance}`,
          );
        }
      }
    } catch (error) {
      this.logError(`Error processing selected records: ${error.message}`);
      throw new Error(error);
    }
  }

  private transformRecordToTxnInput(record: any): any {
    return {
      bank_account_id: parseInt(record.txn_from_account, 10),
      txn_date: new Date(record.txn_date),
      description: record.description,
      txn_amount: parseFloat(record.txn_amount),
      balance: parseFloat(record.balance),
    };
  }

  async fetchBatchSuggestedMatches(
    bank_account_id: number,
    company_id: number,
    timezone: string,
  ) {
    try {
      this.logger.log(
        `Handling request for batch suggested matches for bank account: ${bank_account_id}`,
      );

      const unmatchedTxns = await this.transactionDetailsRepo
        .createQueryBuilder('t')
        .select([
          't.id AS id',
          't.txn_amount AS txn_amount',
          't.txn_date AS txn_date',
          't.description AS description',
          't.bank_account_id AS bank_account_id',
        ])
        .where('t.bank_account_id = :bank_account_id', { bank_account_id })
        .andWhere('t.company_id = :company_id', { company_id })
        .andWhere('t.status IN (:...statuses)', {
          statuses: ['To Review', 'Unmatched'],
        })
        .andWhere('t.is_matched = :isMatched', { isMatched: false })
        .orderBy('t.txn_date', 'DESC')
        .getRawMany();

      if (!unmatchedTxns.length) {
        return framedResponse('SUCCESS', 'No unmatched transactions found.', {
          matches: [],
          total_unmatched: 0,
          exact_match_count: 0,
          near_match_count: 0,
        });
      }

      const unmatchedPayments = await this.subPaymentsRepo
        .createQueryBuilder('sp')
        .select([
          'sp.id AS id',
          'sp.sub_payment_id AS sub_payment_id',
          'sp.payment_id AS payment_id',
          'sp.sub_payment_type AS sub_payment_type',
          'sp.amount AS amount',
          'p.payment_type AS payment_type',
          'p.payment_date AS payment_date',
          'p.payment_from_account AS payment_from_account',
          'p.payment_to_account AS payment_to_account',
          'p.retention_account AS retention_account',
          'pc.claim_type AS claim_type',
          'pc.claim_amount AS claim_amount',
          'pc.payment_claim_id AS payment_claim_id',
          'cs.client_supplier_name AS client_supplier_name',
          'fa.account_name AS payment_from_account_name',
          'ta.account_name AS payment_to_account_name',
          'proj.project_name AS project_name',
          'cont.contract_name AS contract_name',
        ])
        .leftJoin('sp.paymentDetails', 'p')
        .leftJoin('p.paymentClaims', 'pc')
        .leftJoin('p.clientSupplierDetails', 'cs')
        .leftJoin('p.paymentFromAccount', 'fa')
        .leftJoin('p.paymentToAccount', 'ta')
        .leftJoin('p.projectDetails', 'proj')
        .leftJoin('p.contractDetails', 'cont')
        .where('sp.status = :status', { status: 'Unmatched' })
        .andWhere('p.current_status != :delstatus', { delstatus: 'Deleted' })
        .andWhere('p.company_id = :companyId', { companyId: company_id })
        .andWhere(
          '(p.payment_from_account = :bankAccId OR p.payment_to_account = :bankAccId OR p.retention_account = :bankAccId)',
          { bankAccId: bank_account_id },
        )
        .andWhere('p.payment_date IS NOT NULL')
        .getRawMany();

      const matches = [];
      let exactCount = 0;
      let nearCount = 0;
      const EPSILON = 0.005;
      const parsedTolerance = parseFloat(process.env.SMART_MATCH_TOLERANCE || '5.00');
      const NEAR_MATCH_TOLERANCE = isNaN(parsedTolerance) ? 5.00 : parsedTolerance;
      const consumedSubPaymentIds = new Set<number>();

      for (const txn of unmatchedTxns) {
        const txnAmount = parseFloat(txn.txn_amount);
        let bestMatch = null;
        let bestDiff = Infinity;
        let bestQuality = 'none';

        for (const payment of unmatchedPayments) {
          if (consumedSubPaymentIds.has(payment.sub_payment_id)) continue;

          const paymentAmount = parseFloat(payment.amount);
          const diff = Math.abs(txnAmount - paymentAmount);

          if (diff < bestDiff) {
            if (diff <= EPSILON) {
              bestMatch = payment;
              bestDiff = diff;
              bestQuality = 'exact';
            } else if (diff <= NEAR_MATCH_TOLERANCE) {
              bestMatch = payment;
              bestDiff = diff;
              bestQuality = 'near';
            } else if (!bestMatch) {
              bestMatch = null;
              bestQuality = 'none';
            }
          }
        }

        if (bestMatch) {
          consumedSubPaymentIds.add(bestMatch.sub_payment_id);
        }

        if (bestQuality === 'exact') exactCount++;
        if (bestQuality === 'near') nearCount++;

        const matchItem: any = {
          transaction_id: txn.id,
          txn_amount: txnAmount,
          match_quality: bestQuality,
          difference_amount: bestMatch ? parseFloat((txnAmount - parseFloat(bestMatch.amount)).toFixed(2)) : 0,
          suggested_payment: bestMatch
            ? {
                id: bestMatch.id,
                sub_payment_id: bestMatch.sub_payment_id,
                payment_id: bestMatch.payment_id,
                sub_payment_type: bestMatch.sub_payment_type,
                amount: parseFloat(bestMatch.amount),
                payment_type: bestMatch.payment_type,
                payment_date: bestMatch.payment_date,
                claim_type: bestMatch.claim_type,
                client_supplier_name: bestMatch.client_supplier_name,
                payment_from_account_name: bestMatch.payment_from_account_name,
                payment_to_account_name: bestMatch.payment_to_account_name,
                project_name: bestMatch.project_name,
                contract_name: bestMatch.contract_name,
                claim_amount: bestMatch.claim_amount ? parseFloat(bestMatch.claim_amount) : null,
                payment_claim_id: bestMatch.payment_claim_id,
                payment_from_account: bestMatch.payment_from_account,
                payment_to_account: bestMatch.payment_to_account,
                retention_account: bestMatch.retention_account,
              }
            : null,
        };

        matches.push(matchItem);
      }

      return framedResponse(
        'SUCCESS',
        'Batch suggested matches fetched successfully.',
        {
          matches,
          total_unmatched: unmatchedTxns.length,
          exact_match_count: exactCount,
          near_match_count: nearCount,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching batch suggested matches: ${error.message}`,
      );
      throw new Error(error);
    }
  }

  async batchMatchExactTransactions(
    matchPairs: Array<{ transaction_id: string; sub_payment_ids: number[] }>,
    userID: number,
    callerCompanyId?: number,
  ) {
    try {
      this.logger.log(
        `Handling batch match for ${matchPairs.length} pairs`,
      );

      const results = [];
      let succeeded = 0;
      let failed = 0;
      const allPaymentIds: number[] = [];

      for (const pair of matchPairs) {
        try {
          if (callerCompanyId) {
            const txn = await this.transactionDetailsRepo
              .createQueryBuilder('t')
              .select(['t.company_id AS company_id'])
              .where('t.id = :id', { id: pair.transaction_id })
              .getRawOne();
            if (!txn || parseInt(txn.company_id) !== callerCompanyId) {
              failed++;
              results.push({
                transaction_id: pair.transaction_id,
                success: false,
                error: 'Transaction does not belong to the caller company.',
              });
              continue;
            }

            const foreignPayments = await this.subPaymentsRepo
              .createQueryBuilder('sp')
              .innerJoin('sp.payment', 'p')
              .select('sp.sub_payment_id', 'sub_payment_id')
              .where('sp.sub_payment_id IN (:...ids)', { ids: pair.sub_payment_ids })
              .andWhere('p.company_id != :companyId', { companyId: callerCompanyId })
              .getRawMany();
            if (foreignPayments.length > 0) {
              failed++;
              results.push({
                transaction_id: pair.transaction_id,
                success: false,
                error: 'One or more sub-payments do not belong to the caller company.',
              });
              continue;
            }
          }

          const response = await this.matchTxnsToPayments(
            [pair.transaction_id],
            pair.sub_payment_ids,
            userID,
          );

          if (response?.status === 'SUCCESS') {
            succeeded++;
            const responseData = response?.data as Record<string, unknown>;
            if (responseData?.payment_Ids) {
              allPaymentIds.push(...(responseData.payment_Ids as number[]));
            }
            results.push({
              transaction_id: pair.transaction_id,
              success: true,
              error: null,
            });
          } else {
            failed++;
            results.push({
              transaction_id: pair.transaction_id,
              success: false,
              error: response?.message || 'Match failed',
            });
          }
        } catch (err) {
          failed++;
          results.push({
            transaction_id: pair.transaction_id,
            success: false,
            error: err.message,
          });
        }
      }

      const uniquePaymentIds = [...new Set(allPaymentIds)];

      return framedResponse(
        succeeded > 0 ? 'SUCCESS' : 'ERROR',
        `Batch match complete: ${succeeded} succeeded, ${failed} failed.`,
        {
          results,
          succeeded,
          failed,
          payment_ids: uniquePaymentIds,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored during batch match: ${error.message}`,
      );
      throw new Error(error);
    }
  }

  async quickAdjustAndMatch(
    transaction_id: string,
    sub_payment_id: number,
    decoded: { companyId: number; timezone?: string; [key: string]: unknown },
    userID: number,
  ) {
    try {
      this.logger.log(
        `Handling quick adjust and match for txn ${transaction_id} and sub_payment ${sub_payment_id}`,
      );

      return await this.entityManager.transaction(async (em) => {
        const txn = await em
          .createQueryBuilder(TransactionDetails, 't')
          .select([
            't.id AS id',
            't.txn_amount AS txn_amount',
            't.bank_account_id AS bank_account_id',
            't.company_id AS company_id',
          ])
          .where('t.id = :id', { id: transaction_id })
          .andWhere('t.is_matched = :isMatched', { isMatched: false })
          .getRawOne();

        if (!txn) {
          throw new Error('Transaction not found or already matched.');
        }

        const payment = await em
          .createQueryBuilder(SubPayments, 'sp')
          .select([
            'sp.id AS id',
            'sp.sub_payment_id AS sub_payment_id',
            'sp.payment_id AS payment_id',
            'sp.amount AS amount',
            'p.payment_claim_id AS payment_claim_id',
            'p.payment_from_account AS payment_from_account',
            'p.payment_to_account AS payment_to_account',
            'p.retention_account AS retention_account',
            'p.client_supplier_id AS client_supplier_id',
            'p.project_id AS project_id',
            'p.contract_id AS contract_id',
            'p.company_id AS company_id',
            'p.payment_type AS parent_payment_type',
            'pc.claim_type AS claim_type',
          ])
          .leftJoin('sp.paymentDetails', 'p')
          .leftJoin('p.paymentClaims', 'pc')
          .where('sp.sub_payment_id = :spid', { spid: sub_payment_id })
          .andWhere('sp.status = :status', { status: 'Unmatched' })
          .getRawOne();

        if (!payment) {
          throw new Error('Sub-payment not found or already matched.');
        }

        const txnCompanyId = parseInt(txn.company_id);
        const paymentCompanyId = parseInt(payment.company_id);
        if (txnCompanyId !== paymentCompanyId) {
          throw new Error(
            'Transaction and payment do not belong to the same company.',
          );
        }

        if (txnCompanyId !== decoded.companyId) {
          throw new Error(
            'Transaction does not belong to the caller company.',
          );
        }

        const bankAccId = parseInt(txn.bank_account_id);
        const payFromAcc = parseInt(payment.payment_from_account);
        const payToAcc = parseInt(payment.payment_to_account);
        const retAcc = payment.retention_account
          ? parseInt(payment.retention_account)
          : null;
        if (
          bankAccId !== payFromAcc &&
          bankAccId !== payToAcc &&
          bankAccId !== retAcc
        ) {
          throw new Error(
            'Payment does not belong to the same bank account as the transaction.',
          );
        }

        const txnAmount = parseFloat(txn.txn_amount);
        const paymentAmount = parseFloat(payment.amount);
        const difference = parseFloat((txnAmount - paymentAmount).toFixed(2));

        if (Math.abs(difference) < 0.005) {
          const matchResult = await this.matchTxnsToPayments(
            [transaction_id],
            [sub_payment_id],
            userID,
            em,
          );
          if (matchResult?.status !== 'SUCCESS') {
            throw new Error(
              matchResult?.message || 'Exact matching failed.',
            );
          }
          return framedResponse('SUCCESS', 'Exact match applied.', {
            adjustment_payment_id: 0,
            adjustment_type: 'none',
            adjustment_amount: 0,
            payment_ids: (matchResult?.data as Record<string, unknown>)?.payment_Ids || [],
          });
        }

        const claimType = payment.claim_type;
        const isOverpayment = Math.abs(txnAmount) > Math.abs(paymentAmount);
        let adjustmentType: string;

        if (claimType === 'Receivable') {
          adjustmentType = isOverpayment
            ? 'Overpayment from client'
            : 'Underpayment from client';
        } else {
          adjustmentType = isOverpayment
            ? 'Overpayment to supplier'
            : 'Underpayment to supplier';
        }

        const adjustmentAmount = Math.abs(difference);

        const isPaidType = [
          'Overpayment to supplier',
          'Underpayment to supplier',
        ].includes(adjustmentType);

        const adjustmentPaymentData = new AddPaymentInput();
        adjustmentPaymentData.company_id = parseInt(payment.company_id || txn.company_id);
        adjustmentPaymentData.payment_claim_id = parseInt(payment.payment_claim_id);
        adjustmentPaymentData.project_id = parseInt(payment.project_id);
        adjustmentPaymentData.contract_id = payment.contract_id ? parseInt(payment.contract_id) : undefined;
        adjustmentPaymentData.client_supplier_id = parseInt(payment.client_supplier_id);
        adjustmentPaymentData.payment_type = adjustmentType as PaymentTypes;
        adjustmentPaymentData.payment_from_account = parseInt(payment.payment_from_account);
        adjustmentPaymentData.payment_to_account = parseInt(payment.payment_to_account);
        adjustmentPaymentData.payment_amount = adjustmentAmount;
        adjustmentPaymentData.total_amount = adjustmentAmount;
        adjustmentPaymentData.associated_payment_id = parseInt(payment.payment_id);
        adjustmentPaymentData.input_date = new Date();
        adjustmentPaymentData.payment_date = new Date();
        adjustmentPaymentData.cash_retention = false;
        adjustmentPaymentData.is_paid_confirmed = isPaidType ? true : null;
        adjustmentPaymentData.is_received_confirmed = isPaidType ? null : true;

        const addPaymentResult = await this.paymentsService.addPayment(
          decoded,
          adjustmentPaymentData,
          userID,
          em,
        );

        if (!addPaymentResult?.data?.payment_id) {
          throw new Error('Failed to create adjustment payment.');
        }

        const newPaymentId = addPaymentResult.data.payment_id;

        const newSubPayment = await em
          .createQueryBuilder(SubPayments, 'sp')
          .select(['sp.sub_payment_id AS sub_payment_id'])
          .leftJoin('sp.paymentDetails', 'p')
          .where('p.payment_id = :pid', { pid: newPaymentId })
          .andWhere('sp.status = :status', { status: 'Unmatched' })
          .getRawOne();

        if (!newSubPayment) {
          throw new Error('Adjustment sub-payment not found after creation.');
        }

        const matchResult = await this.matchTxnsToPayments(
          [transaction_id],
          [sub_payment_id, newSubPayment.sub_payment_id],
          userID,
          em,
        );

        if (matchResult?.status !== 'SUCCESS') {
          throw new Error(
            matchResult?.message || 'Matching failed after adjustment creation.',
          );
        }

        return framedResponse(
          'SUCCESS',
          `Quick adjust and match completed. Created ${adjustmentType} of $${adjustmentAmount.toFixed(2)}.`,
          {
            adjustment_payment_id: newPaymentId,
            adjustment_type: adjustmentType,
            adjustment_amount: adjustmentAmount,
            payment_ids: (matchResult?.data as Record<string, unknown>)?.payment_Ids || [],
          },
        );
      });
    } catch (error) {
      this.logger.error(
        `Errored during quick adjust and match: ${error.message}`,
      );
      throw new Error(error.message || error);
    }
  }

  async fetchAllUnmatchedTransactionsOfACompany(
    data: FetchAllUnmatchedTransactionsOfACompanyInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all unmatched transactions of a company with data: ${data}`,
      );

      const { company_id } = data;
      const incompleteStatuses = ['To Review', 'Unmatched'];
      const results = await this.transactionDetailsRepo
        .createQueryBuilder('t')
        .select([
          't.txn_amount AS transaction_amount',
          't.bank_account_id AS bank_account_id',
          't.status AS status',
          't.id AS transaction_id',
          'ba.account_name AS bank_account_name',
        ])
        .leftJoin(BankAccounts, 'ba', 'ba.bank_account_id = t.bank_account_id')
        .where('t.company_id = :company_id', { company_id })
        .andWhere('t.status IN(:...incompleteStatuses)', { incompleteStatuses })
        .getRawMany();
      // console.log('results', results);

      if (results.length) {
        results.forEach(
          (result) =>
            (result.formatted_transaction_amount = formatCurrencyWithoutDollars(
              result.transaction_amount,
            )),
        );
      }
      // console.log('formattedResults', results);

      return framedResponse(
        'SUCCESS',
        `All unmatched transactions of a company successfully fetched.`,
        results,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all unmatched transactions of a company with message: ${error}`,
      );
      throw error;
    }
  }

  async getSmartMatchPreference(
    companyId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const role = await this.entityManager
        .createQueryBuilder(CompanyUserRoles, 'cur')
        .select("cur.email_preferences::JSON as email_preferences")
        .where('cur.company_id = :companyId', { companyId })
        .andWhere('cur.user_id = :userId', { userId })
        .getRawOne();

      return role?.email_preferences?.smart_match === true;
    } catch (error) {
      this.logger.error(`Error fetching smart match preference: ${error.message}`);
      return false;
    }
  }

  async setSmartMatchPreference(
    companyId: number,
    userId: number,
    enabled: boolean,
  ): Promise<{ status: string; message: string }> {
    try {
      const role = await this.entityManager.findOne(CompanyUserRoles, {
        where: { company_id: companyId, user_id: userId },
      });

      if (!role) {
        throw new Error('User role not found for this company.');
      }

      const currentPrefs = role.email_preferences || {};
      role.email_preferences = { ...currentPrefs, smart_match: enabled };
      await this.entityManager.save(CompanyUserRoles, role);

      return framedResponse(
        'SUCCESS',
        `Smart match preference ${enabled ? 'enabled' : 'disabled'}.`,
      );
    } catch (error) {
      this.logger.error(`Error setting smart match preference: ${error.message}`);
      throw error;
    }
  }
}
