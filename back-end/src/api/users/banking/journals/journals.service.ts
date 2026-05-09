import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  And,
  Between,
  DataSource,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  AddAuditReportInput,
  AddReconciliationReportInput,
  CheckNilReturnForAuditInput,
  CheckReportExistenceByAccountIdInput,
  EditAuditReportInput,
  EditReconciliationReportInput,
  FetchAccountLedgerByAccountIdInput,
  FetchDepositsAndWithdrawalsByAccountIdInput,
  FetchLedgerJournalsByAccountIdInput,
  FetchLedgerTrialBalanceByAccountIdInput,
  GetAllAuditReportInput,
  GetAllBankAccountsForJournalsInput,
  GetAllReconciliationReportInput,
  GetTrustAccountingBalanceInput,
} from './journals.input';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { GetFileRes } from '../../file-upload/response/get-file.response';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class JournalsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(JournalEntries)
    private journalsRepo: Repository<JournalEntries>,
    @InjectRepository(ReconciliationReport)
    private reconciliationReportRepo: Repository<ReconciliationReport>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(BankStatements)
    private bankStatementsRepo: Repository<BankStatements>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(AuditReport)
    private auditReportRepo: Repository<AuditReport>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(FileAttachments)
    private readonly fileAttachments: Repository<FileAttachments>,
    private readonly objectStorageService: ObjectStorageService,
    private readonly dataSource: DataSource,
  ) {
    this.logger = new PaytradeLogger('JOURNALS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async fetchLedgerJournalsByAccountId(
    data: FetchLedgerJournalsByAccountIdInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching Ledger journals with data: ${JSON.stringify(data)}`,
      );

      const timezone = decoded?.timezone || data.timezone;
      this.logger.log('timezone: ' + timezone);

      const skip = (data.page_number - 1) * data.page_size;

      const queryBuilder = await this.journalsRepo
        .createQueryBuilder('journal')
        .select('journal.id', 'id')
        .addSelect('journal.journal_system_ref', 'journal_system_ref')
        .addSelect('journal.company_id', 'company_id')
        .addSelect('journal.project_id', 'project_id')
        .addSelect('journal.contract_id', 'contract_id')
        .addSelect('journal.supplier_id', 'supplier_id')
        .addSelect('journal.bank_account_id', 'bank_account_id')
        .addSelect(
          `CASE WHEN journalType.beneficiary_type = 'trustee' THEN company.company_name 
            WHEN journalType.beneficiary_type = 'supplier' THEN clientSupplier.client_supplier_name 
            WHEN journalType.beneficiary_type = 'client' THEN clientSupplier.client_supplier_name 
            WHEN journalType.beneficiary_type = 'bank' THEN txnAccount.account_name 
            ELSE account.account_name 
          END`,
          'account_name',
        )
        .addSelect('journal.journal_number', 'journal_number')
        .addSelect('journal.journal_process_id', 'journal_process_id')
        .addSelect('journal.audit_id', 'audit_id')
        .addSelect('journal.journal_date', 'journal_date')
        .addSelect('CAST(journal.dynamic_values AS TEXT)', 'dynamic_values')
        .addSelect(
          'CASE WHEN journal.transaction_account_id IS NULL THEN 00000000000 ELSE journal.transaction_account_id END',
          'transaction_account_id',
        )
        .addSelect('journal.debit_amount', 'debit_amount')
        .addSelect('journal.credit_amount', 'credit_amount')
        .addSelect('journalType.process_description', 'process_description')
        .addSelect('journalType.process_type', 'process_type')
        .addSelect(
          `CASE WHEN pc.payment_claim_id IS NOT NULL THEN 'claim' ELSE 'payment' END`,
          'route_to',
        )
        .addSelect(
          'CASE WHEN pc.payment_claim_id IS NOT NULL THEN pc.payment_claim_id WHEN pd.payment_claim_id IS NOT NULL THEN pd.payment_claim_id ELSE NULL END',
          'payment_claim_id',
        )
        .addSelect('pc.claim_type', 'claim_type')
        .addSelect('pc.cash_retention_type', 'cash_retention_type')
        .addSelect('pc.retention_id', 'retention_id')
        .addSelect('rd.beneficiary_type', 'beneficiary_type')
        .addSelect('pd.payment_id', 'payment_id')
        .addSelect((subQuery) => {
          return subQuery
            .select(
              `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'payment_id', p.payment_id,
                  'payment_type', p.payment_type,
                  'cash_retention', p.cash_retention
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
        .distinct(true)
        .leftJoin('journal.companyDetails', 'company')
        .leftJoin('journal.projectDetails', 'project')
        .leftJoin('journal.clientSupplierDetails', 'clientSupplier')
        .leftJoin('journal.contractDetails', 'contractDetails')
        .leftJoin('journal.accountDetails', 'account')
        .leftJoin('journal.txnAccountDetails', 'txnAccount')
        .leftJoin('journal.journalType', 'journalType')
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .leftJoin(
          PaymentDetails,
          'pd',
          'pd.payment_id = journal.audit_id AND journalType.process_type NOT IN (3, 22, 41, 44)',
        )
        .leftJoin(
          RetentionDetails,
          'rd',
          'rd.retention_id = pc.retention_id AND pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .leftJoin('contractDetails.contractPaymentFromAccount', 'cpf')
        .leftJoin('contractDetails.contractPaymentToAccount', 'cpt')
        .leftJoin('contractDetails.contractRetentionFromAccount', 'crf')
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });

      if (data.search) {
        queryBuilder.andWhere(`CAST(journal.audit_id AS TEXT) LIKE :keyword`, {
          keyword: data.search,
        });
      }

      if (data.global_search) {
        queryBuilder.andWhere(
          `(
           CAST(journal.journal_number AS TEXT) ILIKE :keyword OR   
           CAST('#' || journal.journal_number AS TEXT) ILIKE :keyword OR 
           CAST('JNL - ' || journal.journal_number AS TEXT) ILIKE :keyword OR 
           CAST(journal.audit_id AS TEXT) ILIKE :keyword OR 
           CAST(journal.journal_description AS TEXT) ILIKE :keyword OR 
           CAST(journal.dynamic_values AS TEXT) ILIKE :keyword OR 
           CAST(journal.transaction_account_id AS TEXT) ILIKE :keyword OR 
           CAST(journal.debit_amount AS TEXT) ILIKE :keyword OR 
           CAST(journal.credit_amount AS TEXT) ILIKE :keyword OR 
           TO_CHAR(journal.journal_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(journal.journal_process_id AS TEXT) ILIKE :keyword OR 
           CAST(journal.entry_type AS TEXT) ILIKE :keyword OR 
           CAST(journalType.process_type AS TEXT) ILIKE :keyword OR 
           CAST(journalType.process_name AS TEXT) ILIKE :keyword OR 
           CAST(journalType.process_description AS TEXT) ILIKE :keyword OR
           CAST(company.company_name AS TEXT) ILIKE :keyword OR 
           CAST(pc.payment_claim_id AS TEXT) ILIKE :keyword OR 
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
           CAST(pd.payment_id AS TEXT) ILIKE :keyword OR  
           CAST(pd.payment_type AS TEXT) ILIKE :keyword OR 
           CAST(pd.cash_retention AS TEXT) ILIKE :keyword OR 
           CAST(pd.current_status AS TEXT) ILIKE :keyword OR 
           CAST(pd.list_status AS TEXT) ILIKE :keyword OR 
           CAST(pd.payless_amount AS TEXT) ILIKE :keyword OR 
           CAST(pd.total_amount AS TEXT) ILIKE :keyword OR 
           TO_CHAR(pd.payment_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           TO_CHAR(pd.retention_release_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(pd.memo AS TEXT) ILIKE :keyword OR 
           CAST(pd.third_party_payment_reason AS TEXT) ILIKE :keyword OR 
           CAST(pd.withhold_payment_reason AS TEXT) ILIKE :keyword OR
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
           CAST(contractDetails.contract_name AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.client_supplier_role AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.contract_type AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.contract_status AS TEXT) ILIKE :keyword OR 
           TO_CHAR(contractDetails.contract_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(contractDetails.payment_terms AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.initial_contract_sum AS TEXT) ILIKE :keyword OR 
           TO_CHAR(contractDetails.contract_start_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           TO_CHAR(contractDetails.defect_liability_end_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(contractDetails.payment_from_account AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.retention_from_account AS TEXT) ILIKE :keyword OR 
           CAST(contractDetails.payment_to_account AS TEXT) ILIKE :keyword OR 
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
           EXISTS (SELECT 1 FROM payment_claim_invoices pci WHERE pci.payment_claim_id = pc.payment_claim_id AND (
            CAST(pci.description AS TEXT) ILIKE :keyword OR  
            CAST(pci.quantity AS TEXT) ILIKE :keyword OR 
            CAST(pci.unit_price AS TEXT) ILIKE :keyword OR 
            CAST(pci.gst AS TEXT) ILIKE :keyword OR 
            CAST(pci.total_amount_including_gst AS TEXT) ILIKE :keyword  
            )))`,
          {
            keyword: `%${data.global_search}%`,
            tz: timezone,
          },
        );
      }

      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment(data.start_date).startOf('day').toDate();
          endDate = moment(data.end_date).endOf('day').toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment().subtract(1, 'month').startOf('month').toDate();
          endDate = moment().subtract(1, 'month').endOf('month').toDate();
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          startDate = moment(data.end_date).startOf('year').toDate();
          endDate = moment(data.end_date).toDate();
        }
        queryBuilder.andWhere(
          'journal.journal_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder
          .orderBy({
            'journal.journal_date': 'ASC',
            'journal.journal_system_ref': 'ASC',
          })
          .getRawMany(),
        queryBuilder.getCount(),
      ]);

      type FormattedEntry = {
        date: string;
        journal_number: number;
        journal_description: string;
        total_debit: string;
        total_credit: string;
        route: {
          route_to: string | null;
          payment_claim_id: number | null;
          claim_type: string | null;
          cash_retention_type: string | null;
          beneficiary_type: string | null;
          payment_id: number | null;
          retention_id: number | null;
          payment_list: {} | null;
        };
        accounts: {
          account_name: string;
          description: string;
          audit_id: number;
          debit: string | null;
          credit: string | null;
        }[];
      };

      const entriesByDateAndActivity: { [key: string]: FormattedEntry } = {};

      for (const entry of rawResults) {
        entry.dynamic_values = JSON.parse(entry.dynamic_values);
        if (
          Object.keys(entry.dynamic_values).length !== 0 &&
          Object.keys(entry.dynamic_values).includes('due_date')
        ) {
          entry.dynamic_values.due_date = moment(
            entry.dynamic_values.due_date,
          ).format('DD/MM/YYYY');
        }
        entry['journal_description'] = await this.replaceVariables(
          entry.process_description,
          entry.dynamic_values,
        );

        const date = new Date(entry.journal_date).toString();
        const key = `${date}-${entry.journal_number}`;

        if (!entriesByDateAndActivity[key]) {
          entriesByDateAndActivity[key] = {
            date,
            journal_number: entry.journal_number,
            journal_description: `(JNL - ${entry.journal_number} ${entry.journal_description})`,
            total_debit: '0.00',
            total_credit: '0.00',
            accounts: [],
            route: {
              route_to: entry.route_to,
              payment_claim_id: entry.payment_claim_id || null,
              claim_type: entry.claim_type || null,
              cash_retention_type: entry.cash_retention_type || null,
              beneficiary_type: entry.beneficiary_type || null,
              payment_id: entry.payment_id || null,
              retention_id: entry.retention_id || null,
              payment_list: entry.payment_list || null,
            },
          };
        }

        const formattedEntry = entriesByDateAndActivity[key];

        // Calculate total debit and credit amounts
        if (entry.debit_amount) {
          formattedEntry.total_debit = (
            parseFloat(formattedEntry.total_debit) +
            parseFloat(entry.debit_amount)
          ).toFixed(2);
        }
        if (entry.credit_amount) {
          formattedEntry.total_credit = (
            parseFloat(formattedEntry.total_credit) +
            parseFloat(entry.credit_amount)
          ).toFixed(2);
        }

        formattedEntry?.accounts.push({
          account_name: entry.account_name,
          description: entry.journal_description,
          audit_id: entry.audit_id,
          debit: entry.debit_amount,
          credit: entry.credit_amount,
        });
      }

      const result = Object.values(entriesByDateAndActivity);

      const startIndex = data.page_number && data.page_size ? skip : 0;
      const endIndex =
        data.page_number && data.page_size
          ? Math.min(skip + data.page_size, result.length)
          : result.length;
      // Slice the results array to get the results for the current page
      const results = result.slice(startIndex, endIndex);

      results.forEach((entry) => {
        entry.total_debit = formatCurrency(entry.total_debit);
        entry.total_credit = formatCurrency(entry.total_credit);

        entry.accounts.forEach(async (account) => {
          account.debit = formatCurrency(account.debit);
          account.credit = formatCurrency(account.credit);
        });
      });

      let startDate = null,
        endDate = null;
      if (
        data?.date_filter === 'Custom' &&
        data?.start_date &&
        data?.end_date
      ) {
        startDate = data?.start_date;
        endDate = data?.end_date;
      } else if (data?.date_filter === 'This Month') {
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
      } else if (data?.date_filter === 'Last Month') {
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
      } else if (
        data?.date_filter === 'Custom' &&
        !data?.start_date &&
        data?.end_date
      ) {
        startDate = moment(data.end_date).startOf('year').toDate();
        endDate = moment(data.end_date).toDate();
      } else {
        if (results && results.length > 0) {
          const journalDates = results.map((entry) => new Date(entry.date));

          startDate = new Date(
            Math.min(...journalDates.map((d) => d.getTime())),
          );
          endDate = new Date(Math.max(...journalDates.map((d) => d.getTime())));
        }
      }

      this.logger.log(
        `Ledger journals of a bank account with id: ${data.bank_account_id} fetched successfully with data: ${JSON.stringify(results)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Ledger journals of a bank account fetched successfully.`,
        {
          total_count: results.length,
          ledger_journals_list: results,
          filter_dates: { start_date: startDate, end_date: endDate },
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching ledger journals of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchAccountLedgerByAccountId(
    data: FetchAccountLedgerByAccountIdInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching Ledger journals with data: ${JSON.stringify(data)}`,
      );

      const timezone = decoded?.timezone || data.timezone;
      this.logger.log('timezone: ' + timezone);

      const skip = (data.page_number - 1) * data.page_size;

      const subQuery = await this.journalsRepo
        .createQueryBuilder('je')
        .select('je.transaction_account_id', 'bank_account_id')
        .addSelect('jt.beneficiary_type', 'beneficiary_type')
        .addSelect(
          `CASE 
            WHEN jt.beneficiary_type = 'trustee' THEN c.company_name 
            WHEN jt.beneficiary_type ='supplier' THEN cs.client_supplier_name 
            WHEN jt.beneficiary_type = 'client' THEN cs.client_supplier_name
            WHEN jt.beneficiary_type = 'bank' THEN b.account_name 
            ELSE b.account_name 
          END`,
          'account_name',
        )
        .distinct(true)
        .leftJoin('je.journalType', 'jt')
        .leftJoin('je.clientSupplierDetails', 'cs')
        .leftJoin('je.txnAccountDetails', 'b')
        .leftJoin('je.companyDetails', 'c')
        .where(`je.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      // console.log(await subQuery.getRawMany());

      const queryBuilder = await this.journalsRepo
        .createQueryBuilder('journal')
        .select('journal.id', 'id')
        .addSelect('journal.journal_system_ref', 'journal_system_ref')
        .addSelect('journal.company_id', 'company_id')
        .addSelect('journal.project_id', 'project_id')
        .addSelect('journal.contract_id', 'contract_id')
        .addSelect('journal.supplier_id', 'supplier_id')
        .addSelect('journal.bank_account_id', 'bank_account_id')
        // .addSelect('account.account_name', 'account_name')
        .addSelect(
          `CASE WHEN account.account_name IS NULL AND journalType.beneficiary_type = 'client' THEN client.client_supplier_name ELSE account.account_name END`,
          'account_name',
        )
        .addSelect('journal.journal_number', 'journal_number')
        .addSelect('journal.audit_id', 'audit_id')
        .addSelect('journal.journal_date', 'journal_date')
        .addSelect('CAST(journal.dynamic_values AS TEXT)', 'dynamic_values')
        .addSelect(
          'CASE WHEN journal.transaction_account_id IS NULL THEN 00000000000 ELSE journal.transaction_account_id END',
          'transaction_account_id',
        )
        .addSelect('journal.debit_amount::numeric', 'debit_amount')
        .addSelect('journal.credit_amount::numeric', 'credit_amount')
        .addSelect('journalType.beneficiary_type', 'beneficiary_type')
        .addSelect('journalType.process_description', 'process_description')
        .addSelect(
          `CASE WHEN pc.payment_claim_id IS NOT NULL THEN 'claim' ELSE 'payment' END`,
          'route_to',
        )
        .addSelect(
          'CASE WHEN pc.payment_claim_id IS NOT NULL THEN pc.payment_claim_id WHEN pd.payment_claim_id IS NOT NULL THEN pd.payment_claim_id ELSE NULL END',
          'payment_claim_id',
        )
        .addSelect('pc.claim_type', 'claim_type')
        .addSelect('pc.cash_retention_type', 'cash_retention_type')
        .addSelect('pc.retention_id', 'retention_id')
        .addSelect('rd.beneficiary_type', 'retention_beneficiary_type')
        .addSelect('pd.payment_id', 'payment_id')
        .addSelect((subQuery) => {
          return subQuery
            .select(
              `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'payment_id', p.payment_id,
                  'payment_type', p.payment_type,
                  'cash_retention', p.cash_retention
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
        .distinct(true)
        .leftJoin(
          JournalEntries,
          'cj',
          `cj.bank_account_id = journal.bank_account_id and cj.journal_number = journal.journal_number 
              and cj.transaction_account_id <> journal.transaction_account_id`,
        )
        .leftJoin('journal.journalType', 'journalType')
        .leftJoin('journal.clientSupplierDetails', 'client')
        .leftJoin(
          '(' + subQuery.getQuery() + ')',
          'account',
          'journal.transaction_account_id = account.bank_account_id and journalType.beneficiary_type = account.beneficiary_type ',
        )
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .leftJoin(
          PaymentDetails,
          'pd',
          'pd.payment_id = journal.audit_id AND journalType.process_type NOT IN (3, 22, 41, 44)',
        )
        .leftJoin(
          RetentionDetails,
          'rd',
          'rd.retention_id = pc.retention_id AND pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });

      if (data.beneficiary_type) {
        queryBuilder.andWhere(
          'journalType.beneficiary_type = :beneficiary_type',
          {
            beneficiary_type: data.beneficiary_type,
          },
        );
      }

      if (data.search) {
        queryBuilder.andWhere(`CAST(journal.audit_id AS TEXT) LIKE :keyword`, {
          keyword: data.search,
        });
      }

      let openingBalanceResult;
      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment(data.start_date).startOf('day').toDate();
          endDate = moment(data.end_date).endOf('day').toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment().subtract(1, 'month').startOf('month').toDate();
          endDate = moment().subtract(1, 'month').endOf('month').toDate();
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          startDate = moment(data.end_date).startOf('year').toDate();
          endDate = moment(data.end_date).toDate();
        }
        const tempQuery = queryBuilder.clone();
        const openingBalanceResults = await tempQuery
          .andWhere('journal.journal_date < :start_date', {
            start_date: startDate,
          })
          .getRawMany();
        if (openingBalanceResults && openingBalanceResults.length > 0) {
          // opening_balance = openingBalanceResults.reduce((sum, record) => {
          //   return sum + parseFloat(record.amount);
          // }, 0);
          const gridMapOpeningBalance: { [key: string]: any } = {};
          openingBalanceResults.forEach((entry) => {
            const account_name = entry.account_name;
            if (!gridMapOpeningBalance[account_name]) {
              gridMapOpeningBalance[account_name] = {
                account_name: account_name,
                opening_balance: 0,
              };
            }

            // Calculate net movement
            const debit = entry.debit_amount
              ? parseFloat(entry.debit_amount)
              : 0;
            const credit = entry.credit_amount
              ? parseFloat(entry.credit_amount)
              : 0;
            gridMapOpeningBalance[account_name].opening_balance =
              parseFloat(gridMapOpeningBalance[account_name].opening_balance) +
              debit +
              credit;
          });

          openingBalanceResult = Object.values(gridMapOpeningBalance);
        }
        // console.log('openingBalanceResult: ', openingBalanceResult);
        queryBuilder.andWhere(
          'journal.journal_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder
          .orderBy({
            'journal.journal_date': 'ASC',
            'journal.journal_system_ref': 'ASC',
          })
          .getRawMany(),
        queryBuilder.getCount(),
      ]);

      //
      type GridEntry = {
        account_name: string;
        beneficiary_type: string;
        net_movement: any;
        debit_net_movement: any;
        credit_net_movement: any;
        opening_balance: any;
        total_debit_amount: any;
        total_credit_amount: any;
        entries: any[];
      };

      const gridMap: { [key: string]: GridEntry } = {};

      for (const entry of rawResults) {
        const transaction_account_id =
          entry.account_name + '-' + entry.beneficiary_type;
        // console.log('transaction_account_id: ', transaction_account_id);
        if (!gridMap[transaction_account_id]) {
          gridMap[transaction_account_id] = {
            account_name: entry.account_name,
            beneficiary_type: entry.beneficiary_type,
            net_movement: 0,
            debit_net_movement: null,
            credit_net_movement: null,
            opening_balance: 0,
            total_debit_amount: 0,
            total_credit_amount: 0,
            entries: [],
          };
        }

        // Calculate net movement
        const debit = entry.debit_amount ? parseFloat(entry.debit_amount) : 0;
        const credit = entry.credit_amount
          ? parseFloat(entry.credit_amount)
          : 0;
        gridMap[transaction_account_id].total_debit_amount =
          parseFloat(gridMap[transaction_account_id].total_debit_amount) +
          debit;
        gridMap[transaction_account_id].total_credit_amount =
          parseFloat(gridMap[transaction_account_id].total_credit_amount) +
          credit;
        gridMap[transaction_account_id].net_movement =
          parseFloat(gridMap[transaction_account_id].net_movement) +
          debit -
          credit;

        // Calculate balance
        const previousEntries = gridMap[transaction_account_id].entries;
        if (previousEntries.length === 0) {
          entry.balance_amount = debit - credit;
        } else {
          const lastBalance = parseFloat(
            previousEntries[previousEntries.length - 1].balance_amount,
          );
          entry.balance_amount = debit - credit + lastBalance;
        }

        entry.route = {
          route_to: entry.route_to,
          payment_claim_id: entry.payment_claim_id || null,
          claim_type: entry.claim_type || null,
          cash_retention_type: entry.cash_retention_type || null,
          beneficiary_type: entry.retention_beneficiary_type || null,
          payment_id: entry.payment_id || null,
          retention_id: entry.retention_id || null,
          payment_list: entry.payment_list || null,
        };
        gridMap[transaction_account_id].entries.push(entry);
      }

      const result = Object.values(gridMap);
      // console.log('result: ', result);

      const startIndex = data.page_number && data.page_size ? skip : 0;
      const endIndex =
        data.page_number && data.page_size
          ? Math.min(skip + data.page_size, result.length)
          : result.length;
      // Slice the results array to get the results for the current page
      let results = result.slice(startIndex, endIndex);

      let beneficiary_list = [];
      for (const entry of results) {
        let matchingOpeningBalance = openingBalanceResult?.find(
          (balance) => balance.account_name === entry.account_name,
        );
        if (matchingOpeningBalance) {
          entry.opening_balance = matchingOpeningBalance.opening_balance;
        }
        entry.opening_balance = formatCurrency(entry.opening_balance);
        if (entry.net_movement > 0) {
          entry.debit_net_movement = formatCurrency(entry.net_movement);
          entry.credit_net_movement = null;
        } else {
          entry.debit_net_movement = null;
          entry.credit_net_movement = formatCurrency(
            Math.abs(parseFloat(entry.net_movement)),
          );
        }
        entry.net_movement = formatCurrency(entry.net_movement);
        entry.total_debit_amount = formatCurrency(entry.total_debit_amount);
        entry.total_credit_amount = formatCurrency(entry.total_credit_amount);

        for (const account of entry?.entries) {
          account.dynamic_values = JSON.parse(account.dynamic_values);
          if (
            Object.keys(account.dynamic_values).length !== 0 &&
            Object.keys(account.dynamic_values).includes('due_date')
          ) {
            account.dynamic_values.due_date = moment(
              account.dynamic_values.due_date,
            ).format('DD/MM/YYYY');
          }
          account['journal_description'] = await this.replaceVariables(
            account.process_description,
            account.dynamic_values,
          );
          account.debit_amount = formatCurrency(account.debit_amount);
          account.credit_amount = formatCurrency(account.credit_amount);
          account.balance_amount = formatCurrency(account.balance_amount);
          account.journal_number_format = '#' + account.journal_number;
        }

        beneficiary_list.push({
          name: entry.account_name,
          value: entry.account_name + '-' + entry.beneficiary_type,
        });
      }

      results = results?.sort((a, b) =>
        a.beneficiary_type?.trim()?.localeCompare(b.beneficiary_type?.trim()),
      );

      if (data.beneficiary) {
        results = results?.filter(
          (result) =>
            result.account_name + '-' + result.beneficiary_type ===
            data.beneficiary,
        );
        beneficiary_list = [];
      }

      let startDate = null,
        endDate = null;
      if (
        data?.date_filter === 'Custom' &&
        data?.start_date &&
        data?.end_date
      ) {
        startDate = data?.start_date;
        endDate = data?.end_date;
      } else if (data?.date_filter === 'This Month') {
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
      } else if (data?.date_filter === 'Last Month') {
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
      } else if (
        data?.date_filter === 'Custom' &&
        !data?.start_date &&
        data?.end_date
      ) {
        startDate = moment(data.end_date).startOf('year').toDate();
        endDate = moment(data.end_date).toDate();
      } else {
        let allEntries: any[] = [];
        for (const item of results) {
          if (Array.isArray(item.entries)) {
            allEntries = allEntries.concat(item.entries);
          }
        }
        if (allEntries && allEntries.length > 0) {
          const journalDates = allEntries.map(
            (entry) => new Date(entry.journal_date),
          );

          startDate = new Date(
            Math.min(...journalDates.map((d) => d.getTime())),
          );
          endDate = new Date(Math.max(...journalDates.map((d) => d.getTime())));
        }
      }

      this.logger.log(
        `Account Ledger of a bank account with id: ${data.bank_account_id} fetched successfully with data: ${JSON.stringify(results)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Account Ledger of a bank account fetched successfully.`,
        {
          total_count: results.length,
          grid_entries: results,
          beneficiary_list,
          filter_dates: { start_date: startDate, end_date: endDate },
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Account Ledger of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchLedgerTrialBalanceByAccountId(
    data: FetchLedgerTrialBalanceByAccountIdInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching Ledger journals with data: ${JSON.stringify(data)}`,
      );

      const startDate = moment(data.start_date).endOf('day').toDate();

      const subQuery = await this.journalsRepo
        .createQueryBuilder('je')
        .select('je.transaction_account_id', 'bank_account_id')
        .addSelect('jt.beneficiary_type', 'beneficiary_type')
        .addSelect(
          `CASE 
            WHEN jt.beneficiary_type = 'trustee' THEN c.company_name 
            WHEN jt.beneficiary_type ='supplier' THEN cs.client_supplier_name 
            WHEN jt.beneficiary_type = 'client' THEN cs.client_supplier_name 
            WHEN jt.beneficiary_type = 'bank' THEN b.account_name 
            ELSE b.account_name 
          END`,
          'account_name',
        )
        .distinct(true)
        .leftJoin('je.journalType', 'jt')
        .leftJoin('je.clientSupplierDetails', 'cs')
        .leftJoin('je.txnAccountDetails', 'b')
        .leftJoin('je.companyDetails', 'c')
        .where(`je.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      // console.log(await subQuery.getRawMany());

      const queryBuilder = await this.journalsRepo
        .createQueryBuilder('journal')
        .select('journal.id', 'id')
        .addSelect('journal.journal_system_ref', 'journal_system_ref')
        .addSelect('journal.company_id', 'company_id')
        .addSelect('journal.project_id', 'project_id')
        .addSelect('journal.contract_id', 'contract_id')
        .addSelect('journal.supplier_id', 'supplier_id')
        .addSelect('journal.bank_account_id', 'bank_account_id')
        // .addSelect('account.account_name', 'account_name')
        .addSelect(
          `CASE WHEN account.account_name IS NULL AND journalType.beneficiary_type = 'client' THEN client.client_supplier_name ELSE account.account_name END`,
          'account_name',
        )
        .addSelect('journal.journal_number', 'journal_number')
        .addSelect('journal.audit_id', 'audit_id')
        .addSelect('journal.journal_date', 'journal_date')
        .addSelect('CAST(journal.dynamic_values AS TEXT)', 'dynamic_values')
        .addSelect(
          'CASE WHEN journal.transaction_account_id IS NULL THEN 00000000000 ELSE journal.transaction_account_id END',
          'transaction_account_id',
        )
        .addSelect('journal.debit_amount::numeric', 'debit_amount')
        .addSelect('journal.credit_amount::numeric', 'credit_amount')
        .addSelect('journalType.beneficiary_type', 'beneficiary_type')
        .addSelect('journalType.process_description', 'process_description')
        .distinct(true)
        .leftJoin(
          JournalEntries,
          'cj',
          `cj.bank_account_id = journal.bank_account_id and cj.journal_number = journal.journal_number 
              and cj.transaction_account_id <> journal.transaction_account_id`,
        )
        .leftJoin('journal.journalType', 'journalType')
        .leftJoin('journal.clientSupplierDetails', 'client')
        .leftJoin(
          '(' + subQuery.getQuery() + ')',
          'account',
          'journal.transaction_account_id = account.bank_account_id and journalType.beneficiary_type = account.beneficiary_type ',
        )
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });

      queryBuilder.andWhere('journal.journal_date <= :specific_date', {
        specific_date: startDate,
      });

      let rawResults = await queryBuilder
        .orderBy({
          'journal.journal_date': 'ASC',
          'journal.journal_system_ref': 'ASC',
        })
        .getRawMany();

      type GridEntry = {
        transaction_account_id: any;
        account_name: string;
        beneficiary_type: string;
        closing_balance: any;
      };

      const gridMap: { [key: string]: GridEntry } = {};

      for (const entry of rawResults) {
        const transaction_account_id =
          entry.account_name + '-' + entry.beneficiary_type;
        if (!gridMap[transaction_account_id]) {
          gridMap[transaction_account_id] = {
            transaction_account_id: entry.transaction_account_id,
            account_name: entry.account_name,
            beneficiary_type: entry.beneficiary_type,
            closing_balance: 0,
          };
        }

        // Calculate net movement
        const debit = entry.debit_amount ? parseFloat(entry.debit_amount) : 0;
        const credit = entry.credit_amount
          ? parseFloat(entry.credit_amount)
          : 0;
        gridMap[transaction_account_id].closing_balance =
          parseFloat(gridMap[transaction_account_id].closing_balance) +
          debit -
          credit;
      }

      let result = Object.values(gridMap);

      // console.log('result: ', result);

      const totalClosingBal = result.reduce((sum, account) => {
        return sum + parseFloat(account.closing_balance);
      }, 0);
      const totalClosingBalance = formatCurrency(totalClosingBal);

      result.forEach((entry) => {
        entry.closing_balance = formatCurrency(entry.closing_balance);
      });

      result = result?.sort((a, b) =>
        a.beneficiary_type?.trim()?.localeCompare(b.beneficiary_type?.trim()),
      );

      this.logger.log(
        `Ledger Trial Balance Statement of a bank account with id: ${data.bank_account_id} fetched successfully with data: ${JSON.stringify(rawResults)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Ledger Trial Balance Statement of a bank account fetched successfully.`,
        {
          total_closing_balance: totalClosingBalance,
          trial_balance_list: result,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Ledger Trial Balance Statement of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchDepositsAndWithdrawalsByAccountId(
    data: FetchDepositsAndWithdrawalsByAccountIdInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching Deposits and Withdrawals with data: ${JSON.stringify(data)}`,
      );

      const timezone = decoded?.timezone || data.timezone;

      const subQuery = await this.journalsRepo
        .createQueryBuilder('je')
        .select('je.transaction_account_id', 'bank_account_id')
        .addSelect('jt.beneficiary_type', 'beneficiary_type')
        .addSelect(
          `CASE 
            WHEN jt.beneficiary_type = 'trustee' THEN c.company_name 
            WHEN jt.beneficiary_type ='supplier' THEN cs.client_supplier_name 
            WHEN jt.beneficiary_type = 'client' THEN cs.client_supplier_name
            WHEN jt.beneficiary_type = 'bank' THEN b.account_name 
            ELSE b.account_name 
          END`,
          'account_name',
        )
        .addSelect(
          `CASE WHEN jt.beneficiary_type = 'supplier' THEN b.bsb_number ELSE NULL END`,
          'bsb_number',
        )
        .addSelect(
          `CASE WHEN jt.beneficiary_type = 'supplier' THEN b.account_number ELSE NULL END`,
          'account_number',
        )
        .distinct(true)
        .leftJoin('je.journalType', 'jt')
        .leftJoin('je.clientSupplierDetails', 'cs')
        .leftJoin('je.txnAccountDetails', 'b')
        .leftJoin('je.companyDetails', 'c')
        .where(`je.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      this.logger.log(JSON.stringify(await subQuery.getRawMany()));

      const queryBuilder = await this.journalsRepo
        .createQueryBuilder('journal')
        .select('journal.id', 'id')
        .addSelect('journal.journal_system_ref', 'journal_system_ref')
        .addSelect('journal.company_id', 'company_id')
        .addSelect('journal.project_id', 'project_id')
        .addSelect('journal.contract_id', 'contract_id')
        .addSelect('journal.supplier_id', 'supplier_id')
        .addSelect('journal.bank_account_id', 'bank_account_id')
        .addSelect(
          'CASE WHEN journal.transaction_account_id IS NULL THEN 00000000000 ELSE journal.transaction_account_id END',
          'transaction_account_id',
        )
        .addSelect('journalType.beneficiary_type', 'beneficiary_type')
        // .addSelect('account.account_name', 'account_name')
        .addSelect(
          `CASE WHEN account.account_name IS NULL AND journalType.beneficiary_type = 'client' THEN client.client_supplier_name ELSE account.account_name END`,
          'account_name',
        )
        .addSelect('account.bsb_number', 'bsb_number')
        .addSelect('account.account_number', 'account_number')
        .addSelect('journal.journal_number', 'journal_number')
        .addSelect('journal.audit_id', 'audit_id')
        .addSelect('journal.journal_date', 'journal_date')
        // .addSelect('journal.journal_description', 'journal_description')
        .addSelect('CAST(journal.dynamic_values AS TEXT)', 'dynamic_values')
        .addSelect(
          `case when journal.debit_amount is NULL then 'wdl' else 'dep' end`,
          'type',
        )
        .addSelect(
          `case when journal.debit_amount is NULL then ('-' || journal.credit_amount)::numeric else journal.debit_amount end`,
          'amount',
        )
        .addSelect('journalType.process_description', 'process_description')
        .addSelect(
          `CASE WHEN pc.payment_claim_id IS NOT NULL THEN 'claim' ELSE 'payment' END`,
          'route_to',
        )
        .addSelect(
          'CASE WHEN pc.payment_claim_id IS NOT NULL THEN pc.payment_claim_id WHEN pd.payment_claim_id IS NOT NULL THEN pd.payment_claim_id ELSE NULL END',
          'payment_claim_id',
        )
        .addSelect('pc.claim_type', 'claim_type')
        .addSelect('pc.cash_retention_type', 'cash_retention_type')
        .addSelect('pc.retention_id', 'retention_id')
        .addSelect('rd.beneficiary_type', 'retention_beneficiary_type')
        .addSelect('pd.payment_id', 'payment_id')
        .addSelect((subQuery) => {
          return subQuery
            .select(
              `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'payment_id', p.payment_id,
                  'payment_type', p.payment_type,
                  'cash_retention', p.cash_retention
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
        .distinct(true)
        .leftJoin(
          JournalEntries,
          'cj',
          `cj.bank_account_id = journal.bank_account_id and cj.journal_number = journal.journal_number 
              and cj.transaction_account_id <> journal.transaction_account_id`,
        )
        .leftJoin('journal.journalType', 'journalType')
        .leftJoin('journal.clientSupplierDetails', 'client')
        .leftJoin(
          '(' + subQuery.getQuery() + ')',
          'account',
          'journal.transaction_account_id = account.bank_account_id and journalType.beneficiary_type = account.beneficiary_type',
        )
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .leftJoin(
          PaymentDetails,
          'pd',
          'pd.payment_id = journal.audit_id AND journalType.process_type NOT IN (3, 22, 41, 44)',
        )
        .leftJoin(
          RetentionDetails,
          'rd',
          'rd.retention_id = pc.retention_id AND pc.payment_claim_id = journal.audit_id AND journalType.process_type IN (3, 22, 41, 44)',
        )
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });

      queryBuilder.andWhere(`journalType.beneficiary_type = 'bank'`);

      let opening_balance = 0.0;
      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment(data.start_date).startOf('day').toDate();
          endDate = moment(data.end_date).endOf('day').toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment().subtract(1, 'month').startOf('month').toDate();
          endDate = moment.subtract(1, 'month').endOf('month').toDate();
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          startDate = moment(data.end_date)
            .tz(timezone)
            .startOf('year')
            .toDate();
          endDate = moment(data.end_date).toDate();
        }
        const tempQuery = queryBuilder.clone();
        const openingBalanceResults = await tempQuery
          .andWhere('journal.journal_date < :start_date', {
            start_date: startDate,
          })
          .getRawMany();
        this.logger.log('openingBalanceResults: ' + JSON.stringify(openingBalanceResults));

        if (openingBalanceResults && openingBalanceResults.length > 0) {
          opening_balance = openingBalanceResults.reduce((sum, record) => {
            return sum + parseFloat(record.amount);
          }, 0);
        }

        queryBuilder.andWhere(
          'journal.journal_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      if (data.search) {
        queryBuilder.andWhere(`CAST(journal.audit_id AS TEXT) LIKE :keyword`, {
          keyword: data.search,
        });
      }

      const rawResults = await queryBuilder
        .orderBy({
          'journal.journal_date': 'ASC',
          'journal.journal_system_ref': 'ASC',
        })
        .getRawMany();

      let opening_date, closing_date;
      if (data.date_filter && timezone) {
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          opening_date = moment(data.start_date).startOf('day').toDate();
          closing_date = moment(data.end_date).endOf('day').toDate();
        } else if (data.date_filter === 'This Month') {
          opening_date = moment().startOf('month').toDate();
          closing_date = moment().endOf('month').toDate();
        } else if (data.date_filter === 'Last Month') {
          opening_date = moment()
            .subtract(1, 'month')
            .startOf('month')
            .toDate();
          closing_date = moment().subtract(1, 'month').endOf('month').toDate();
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          opening_date = moment(data.end_date).startOf('year').toDate();
          closing_date = moment(data.end_date).toDate();
        }
      } else {
        opening_date =
          rawResults && rawResults.length > 0
            ? rawResults[0].journal_date
            : null;
        closing_date =
          rawResults && rawResults.length > 0
            ? rawResults[rawResults.length - 1].journal_date
            : null;
      }
      let balance = opening_balance;

      let gridEntries: any[] = [];
      rawResults.forEach((entry, index) => {
        const amount = parseFloat(entry.amount);
        if (index === 0) {
          balance = amount;
        } else {
          const lastBalance = parseFloat(gridEntries[index - 1].balance_amount);
          balance = lastBalance + amount;
        }
        entry.route = {
          route_to: entry.route_to,
          payment_claim_id: entry.payment_claim_id || null,
          claim_type: entry.claim_type || null,
          cash_retention_type: entry.cash_retention_type || null,
          beneficiary_type: entry.retention_beneficiary_type || null,
          payment_id: entry.payment_id || null,
          retention_id: entry.retention_id || null,
          payment_list: entry.payment_list || null,
        };
        gridEntries.push({ ...entry, balance_amount: balance.toFixed(2) });
      });

      const closing_balance = balance;

      const result = {
        opening_balance: formatCurrency(opening_balance),
        closing_balance: formatCurrency(closing_balance),
        opening_date: opening_date,
        closing_date: closing_date,
        grid_entries: gridEntries,
      };

      for (const entry of result?.grid_entries) {
        entry.dynamic_values = JSON.parse(entry.dynamic_values);
        if (
          Object.keys(entry.dynamic_values).length !== 0 &&
          Object.keys(entry.dynamic_values).includes('due_date')
        ) {
          entry.dynamic_values.due_date = moment(
            entry.dynamic_values.due_date,
          ).format('DD/MM/YYYY');
        }
        entry['journal_description'] = await this.replaceVariables(
          entry.process_description,
          entry.dynamic_values,
        );
        entry.amount = formatCurrency(entry.amount);
        entry.balance_amount = formatCurrency(entry.balance_amount);
        entry.journal_number = '#' + entry.journal_number;
      }

      let startDate = null,
        endDate = null;
      if (
        data?.date_filter === 'Custom' &&
        data?.start_date &&
        data?.end_date
      ) {
        startDate = data?.start_date;
        endDate = data?.end_date;
      } else if (data?.date_filter === 'This Month') {
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
      } else if (data?.date_filter === 'Last Month') {
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
      } else if (
        data?.date_filter === 'Custom' &&
        !data?.start_date &&
        data?.end_date
      ) {
        startDate = moment(data.end_date).startOf('year').toDate();
        endDate = moment(data.end_date).toDate();
      } else {
        startDate = new Date(result?.opening_date);
        endDate = new Date(result?.closing_date);
      }

      this.logger.log(
        `Account Ledger of a bank account with id: ${data.bank_account_id} fetched successfully with data: ${JSON.stringify(result)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Account Ledger of a bank account fetched successfully.`,
        {
          ...result,
          filter_dates: { start_date: startDate, end_date: endDate },
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching Account Ledger of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async checkReportExistence(
    data: CheckReportExistenceByAccountIdInput,
    decoded,
  ) {
    const timezone = decoded?.timezone || data.timezone;
    this.logger.log('timezone: ' + timezone);

    const startOfDayUTC = moment(data.month_end_date).startOf('day').toDate();
    const endOfDayUTC = moment(data.month_end_date).endOf('day').toDate();
    return await this.reconciliationReportRepo.find({
      where: {
        bank_account_id: data.bank_account_id,
        month_end_date: And(
          MoreThanOrEqual(startOfDayUTC),
          LessThanOrEqual(endOfDayUTC),
        ),
        report_status: 'Active',
      },
    });
  }

  async checkAndGetStatementBalance(
    data: CheckReportExistenceByAccountIdInput,
    decoded,
  ) {
    const startOfDayUTC = moment(data.month_end_date).startOf('day').toDate();
    const endOfDayUTC = moment(data.month_end_date).endOf('day').toDate();
    this.logger.log(startOfDayUTC + ' ' + endOfDayUTC + ' ' + data.month_end_date);
    return await this.bankStatementsRepo.findOne({
      where: {
        bank_account_id: data.bank_account_id,
        statement_date: And(
          MoreThanOrEqual(startOfDayUTC),
          LessThanOrEqual(endOfDayUTC),
        ),
        status: 'Open',
      },
    });
  }

  async getTrustAccountingBalanceByAccountId(
    data: GetTrustAccountingBalanceInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching balance with data: ${JSON.stringify(data)}`,
      );
      const timezone = decoded?.timezone || data.timezone;
      this.logger.log('timezone: ' + timezone);

      const endDate = moment(data.month_end_date).endOf('day').toDate();

      const depositAndWithdrawalResponse = await this.journalsRepo
        .createQueryBuilder('journal')
        .select(
          `SUM(case when journal.debit_amount is NULL then ('-' || journal.credit_amount)::numeric else journal.debit_amount::numeric end)`,
          'deposit_and_withdrawal_balance',
        )
        .distinct(true)
        .leftJoin(
          JournalEntries,
          'cj',
          `cj.bank_account_id = journal.bank_account_id and cj.journal_number = journal.journal_number 
              and cj.transaction_account_id <> journal.transaction_account_id`,
        )
        .leftJoin('journal.journalType', 'journalType')
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        })
        .andWhere(`journalType.beneficiary_type = 'bank'`)
        .andWhere('journal.journal_date <= :endDate', {
          endDate: endDate,
        })
        .getRawOne();

      this.logger.log('depositAndWithdrawalResponse: ' + JSON.stringify(depositAndWithdrawalResponse));
      depositAndWithdrawalResponse.deposit_and_withdrawal_balance =
        depositAndWithdrawalResponse.deposit_and_withdrawal_balance ?? 0;

      const accountLedgerClientResponse = await this.journalsRepo
        .createQueryBuilder('journal')
        .select(
          `SUM(case when journal.debit_amount is NULL then ('-' || journal.credit_amount)::numeric else journal.debit_amount::numeric end)`,
          'account_ledger_balance',
        )
        .distinct(true)
        .leftJoin(
          JournalEntries,
          'cj',
          `cj.bank_account_id = journal.bank_account_id and cj.journal_number = journal.journal_number 
              and cj.transaction_account_id <> journal.transaction_account_id`,
        )
        .leftJoin('journal.journalType', 'journalType')
        .where(`journal.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        })
        .andWhere(`journalType.beneficiary_type = 'bank'`)
        .andWhere('journal.journal_date <= :endDate', {
          endDate: endDate,
        })
        .getRawOne();

      this.logger.log('accountLedgerClientResponse: ' + JSON.stringify(accountLedgerClientResponse));
      accountLedgerClientResponse.account_ledger_balance =
        accountLedgerClientResponse.account_ledger_balance ?? 0;

      this.logger.log(
        `Balance of a bank account with id: ${data.bank_account_id} fetched successfully)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Balance of a bank account fetched successfully.`,
        {
          unformatted_deposit_and_withdrawal_balance:
            depositAndWithdrawalResponse.deposit_and_withdrawal_balance,
          unformatted_account_ledger_balance:
            accountLedgerClientResponse.account_ledger_balance,
          formatted_deposit_and_withdrawal_balance: formatCurrency(
            depositAndWithdrawalResponse.deposit_and_withdrawal_balance,
          ),
          formatted_account_ledger_balance: formatCurrency(
            accountLedgerClientResponse.account_ledger_balance,
          ),
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching balance of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getAllBankAccountsForJournals(
    data: GetAllBankAccountsForJournalsInput,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching all bank accounts for Journals with data: ${JSON.stringify(data)}`,
      );

      const subQuery = await this.journalsRepo
        .createQueryBuilder('journal')
        .select('journal.bank_account_id', 'bank_account_id')
        .addSelect('journal.company_id', 'company_id')
        .addSelect(
          `sum(case when journal.debit_amount is NULL then 0.00 else journal.debit_amount end - case when journal.credit_amount is NULL then 0.00 else journal.credit_amount end)`,
          'closing_balance',
        )
        .addSelect(
          `CASE WHEN (sum(case when journal.debit_amount is NULL then 0.00 else journal.debit_amount end - case when journal.credit_amount is NULL then 0.00 else journal.credit_amount end) = 0.00) THEN 'Ok' ELSE 'Error' END`,
          'balance_check',
        )
        .distinct(true)
        .groupBy('journal.bank_account_id, journal.company_id');

      const queryBuilder = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select('ba.id', 'id')
        .addSelect('ba.bank_account_id', 'bank_account_id')
        .addSelect('ba.company_id', 'company_id')
        .addSelect('c.company_name', 'company_name')
        .addSelect('ba.account_name', 'account_name')
        .addSelect('ba.account_type', 'account_type')
        .addSelect('ba.status', 'status')
        .addSelect('journal.closing_balance', 'closing_balance')
        .addSelect('journal.balance_check', 'balance_check')
        .addSelect('r.user_id', 'primary_admin_id')
        .addSelect(`u.first_name || ' ' || u.last_name`, 'primary_admin_name')
        .addSelect('u.email_id', 'primary_admin_email')
        .innerJoin('ba.companyId', 'c')
        .innerJoin(
          CompanyUserRoles,
          'r',
          `r.company_id = ba.company_id AND r.company_role = 'PRIMARY ADMIN' AND r.status = 'Active'`,
        )
        .innerJoin(
          UserDetails,
          'u',
          `u.user_id = r.user_id AND u.user_status = 'Active'`,
        )
        .innerJoin(
          '(' + subQuery.getQuery() + ')',
          'journal',
          'journal.bank_account_id = ba.bank_account_id and journal.company_id = ba.company_id',
        )
        .where(
          `ba.added_by_client_supplier = false and ba.status not in ('Draft', 'Deleted')`,
        );

      if (data.company_id) {
        queryBuilder.andWhere(`ba.company_id = :company_id`, {
          company_id: data.company_id,
        });
      }

      if (data.bank_account_id) {
        queryBuilder.andWhere(`ba.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      }

      if (data.account_type) {
        queryBuilder.andWhere(`ba.account_type = :account_type`, {
          account_type: data.account_type,
        });
      }

      if (data.status) {
        queryBuilder.andWhere(`ba.status = :status`, {
          status: data.status,
        });
      }

      if (data.balance_check) {
        queryBuilder.andWhere(`journal.balance_check = :balance_check`, {
          balance_check: data.balance_check,
        });
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'ba.bank_account_id': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'company_name':
            {
              queryBuilder.orderBy({ 'LOWER(c.company_name)': sorting_order });
            }
            break;
          case 'account_name':
            {
              queryBuilder.orderBy({ 'LOWER(ba.account_name)': sorting_order });
            }
            break;
          case 'account_type':
            {
              queryBuilder.orderBy({ 'ba.account_type': sorting_order });
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({ 'ba.status': sorting_order });
            }
            break;
          case 'closing_balance':
            {
              queryBuilder.orderBy({
                'journal.closing_balance': sorting_order,
              });
            }
            break;
          case 'balance_check':
            {
              queryBuilder.orderBy({ 'journal.balance_check': sorting_order });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      // console.log('results: ', rawResults);

      rawResults.forEach((entry) => {
        entry.closing_balance = formatCurrency(entry.closing_balance);
      });

      this.logger.log(
        `Fetched all bank accounts for Journals successfully with data: ${JSON.stringify(rawResults)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Fetched all bank accounts for Journals successfully.`,
        { account_list: rawResults, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank accounts for Journals with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getFiltersForAdmin() {
    try {
      this.logger.log(`Handling request for fetching filters for Admin}`);

      // Initialize sets to avoid duplicates
      const companySet = new Set<string>();
      const accountSet = new Set<string>();
      const accountTypeSet = new Set<string>();
      const companyResults = await this.companyDetailsRepo
        .createQueryBuilder('c')
        .select('c.company_id', 'value')
        .addSelect('c.company_name', 'name')
        .distinct(true)
        .where(`c.is_admin_blocked = false `)
        .getRawMany();
      companyResults.forEach((record) => {
        companySet.add(
          JSON.stringify({
            name: record.name,
            value: record.value,
          }),
        );
      });

      const accountResults = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select('ba.bank_account_id', 'value')
        .addSelect('ba.account_name', 'name')
        .addSelect('ba.account_type', 'account_type')
        .addSelect('ba.opening_date', 'opening_date')
        .distinct(true)
        .where(
          `ba.added_by_client_supplier = false and ba.account_type <> 'Cash Account' and ba.status not in ('Draft', 'Deleted') `,
        )
        .getRawMany();
      accountResults.forEach((record) => {
        accountSet.add(
          JSON.stringify({
            name: record.name,
            value: record.value,
            account_type: record.account_type,
            opening_date: new Date(record.opening_date),
          }),
        );
      });
      this.logger.log('accountResults: ' + JSON.stringify(accountResults));
      const typeResults = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select('ba.account_type', 'value')
        .addSelect('ba.account_type', 'name')
        .distinct(true)
        .getRawMany();

      typeResults.forEach((record) => {
        accountTypeSet.add(
          JSON.stringify({
            name: record.name,
            value: record.value,
          }),
        );
      });

      // Convert sets to lists of objects
      const company_list: any[] = Array.from(companySet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));
      const account_list: any[] = Array.from(accountSet)
        .map((item) => {
          const parsedItem = JSON.parse(item);
          return {
            ...parsedItem,
            opening_date: new Date(parsedItem.opening_date), // Re-convert to Date object
          };
        })
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));
      const account_type_list: any[] = Array.from(accountTypeSet)
        .map((item) => JSON.parse(item))
        .sort((a, b) => a.name?.trim()?.localeCompare(b.name?.trim()));

      this.logger.log('company_list: ' + JSON.stringify(company_list));
      this.logger.log('account_list: ' + JSON.stringify(account_list));
      this.logger.log('account_type_list: ' + JSON.stringify(account_type_list));

      this.logger.log(
        `Fetched filters for Admin successfully with data: ${JSON.stringify({ company_list, account_list, account_type_list })}`,
      );

      return framedResponse(
        'SUCCESS',
        `Fetched filters for Admin successfully.`,
        { company_list, account_list, account_type_list },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters for Admin with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async insertReconciliationReportDetails(
    decoded,
    data: AddReconciliationReportInput,
  ) {
    data.created_on = moment.tz('UTC');
    data.created_by = decoded?.userId;
    data.created_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
    const reconciliationDetails =
      await this.reconciliationReportRepo.create(data);
    return await this.reconciliationReportRepo.save(reconciliationDetails);
  }

  async editReconciliationReportDetails(
    decoded: any,
    data: EditReconciliationReportInput,
  ) {
    const reconciliationDetails = await this.reconciliationReportRepo.findOne({
      where: { id: data.id },
    });
    reconciliationDetails.company_id = data.company_id;
    reconciliationDetails.month_end_date = data.month_end_date;
    reconciliationDetails.bank_account_id = data.bank_account_id;
    reconciliationDetails.bank_statement_balance = data.bank_statement_balance;
    reconciliationDetails.adjustments = data.adjustments;
    reconciliationDetails.adjustment_comment = data.adjustment_comment;
    reconciliationDetails.expected_balance = data.expected_balance;
    reconciliationDetails.deposit_withdrawal_balance =
      data.deposit_withdrawal_balance;
    reconciliationDetails.account_ledger_balance = data.account_ledger_balance;
    reconciliationDetails.reconcile_status = data.reconcile_status;
    reconciliationDetails.updated_by = decoded?.userId;
    reconciliationDetails.updated_on = moment.tz('UTC');
    reconciliationDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
    return await this.reconciliationReportRepo.save(reconciliationDetails);
  }

  async viewReconciliationReportById(id: string) {
    const result = await this.reconciliationReportRepo
      .createQueryBuilder('report')
      .select('report.id', 'id')
      .addSelect('report.report_id', 'report_id')
      .addSelect('report.company_id', 'company_id')
      .addSelect('c.company_name', 'company_name')
      .addSelect('report.bank_account_id', 'bank_account_id')
      .addSelect('ba.account_name', 'account_name')
      .addSelect('ba.account_type', 'account_type')
      .addSelect('report.month_end_date', 'month_end_date')
      .addSelect('report.bank_statement_balance', 'bank_statement_balance')
      .addSelect('report.adjustments', 'adjustments')
      .addSelect('report.adjustment_comment', 'adjustment_comment')
      .addSelect('report.expected_balance', 'expected_balance')
      .addSelect(
        'report.deposit_withdrawal_balance',
        'deposit_withdrawal_balance',
      )
      .addSelect('report.account_ledger_balance', 'account_ledger_balance')
      .addSelect('report.reconcile_status', 'reconcile_status')
      .addSelect('report.report_status', 'report_status')
      .addSelect('report.created_on', 'report_date')
      .distinct(true)
      .innerJoin('report.companyDetails', 'c')
      .innerJoin('report.bankAccounts', 'ba')
      .where(`report.id = :id`, {
        id: id,
      })
      .getRawOne();

    result.bank_statement_balance = formatCurrency(
      result.bank_statement_balance,
    );
    result.adjustments = formatCurrency(result.adjustments);
    result.expected_balance = formatCurrency(result.expected_balance);
    result.deposit_withdrawal_balance = formatCurrency(
      result.deposit_withdrawal_balance,
    );
    result.account_ledger_balance = formatCurrency(
      result.account_ledger_balance,
    );
    return result;
  }

  async getReconciliationaDataForCompliance(id: string) {
    const result = await this.reconciliationReportRepo
      .createQueryBuilder('report')
      .select('report.id', 'id')
      .addSelect('report.report_id', 'report_id')
      .addSelect('report.company_id', 'company_id')
      .addSelect('report.bank_account_id', 'bank_account_id')
      .addSelect('ba.account_name', 'account_name')
      .addSelect('ba.account_type', 'account_type')
      .addSelect('ba.project_ids', 'project_ids')
      .distinct(true)
      .innerJoin('report.bankAccounts', 'ba')
      .where(`report.id = :id`, {
        id: id,
      })
      .getRawOne();
    return result;
  }

  async deleteReconciliationReportDetails(decoded: any, id: string) {
    const reconciliationDetails = await this.reconciliationReportRepo.findOne({
      where: { id },
    });
    reconciliationDetails.report_status = 'Deleted';
    reconciliationDetails.updated_by = decoded?.userId;
    reconciliationDetails.updated_on = moment.tz('UTC');
    reconciliationDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';
    return await this.reconciliationReportRepo.save(reconciliationDetails);
  }

  async getAllReconciliationReportList(
    data: GetAllReconciliationReportInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Handling request for fetching all reconciliation report with data: ${JSON.stringify(data)}`,
      );

      const timezone = decoded?.timezone || data.timezone;
      this.logger.log('timezone: ' + timezone);

      const queryBuilder = await this.reconciliationReportRepo
        .createQueryBuilder('report')
        .select('report.id', 'id')
        .addSelect('report.report_id', 'report_id')
        .addSelect('report.company_id', 'company_id')
        .addSelect('c.company_name', 'company_name')
        .addSelect('report.bank_account_id', 'bank_account_id')
        .addSelect('ba.account_name', 'account_name')
        .addSelect('ba.account_type', 'account_type')
        .addSelect('report.month_end_date', 'month_end_date')
        .addSelect('report.bank_statement_balance', 'bank_statement_balance')
        .addSelect('report.adjustments', 'adjustments')
        .addSelect('report.adjustment_comment', 'adjustment_comment')
        .addSelect('report.expected_balance', 'expected_balance')
        .addSelect(
          'report.deposit_withdrawal_balance',
          'deposit_withdrawal_balance',
        )
        .addSelect('report.account_ledger_balance', 'account_ledger_balance')
        .addSelect('report.reconcile_status', 'reconcile_status')
        .addSelect('report.report_status', 'report_status')
        .addSelect('report.created_on', 'report_date')
        .innerJoin('report.companyDetails', 'c')
        .innerJoin('report.bankAccounts', 'ba')
        .where(`report.company_id = :company_id`, {
          company_id: data.company_id,
        });

      if (data.bank_account_id) {
        queryBuilder.andWhere(`report.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      }

      if (data.account_type) {
        queryBuilder.andWhere(`ba.account_type = :account_type`, {
          account_type: data.account_type,
        });
      }

      if (data.isArchived) {
        queryBuilder.andWhere(`report.report_status = 'Deleted'`);
      } else {
        queryBuilder.andWhere(`report.report_status = 'Active'`);
      }

      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment
            .tz(data.start_date, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment
            .tz(data.end_date, timezone)
            .endOf('day')
            .utc()
            .toDate();
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
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          startDate = moment
            .utc(data.end_date)
            .tz(timezone)
            .startOf('year')
            .utc()
            .toDate();
          endDate = moment
            .utc(data.end_date)
            .tz(timezone)
            // .endOf('day')
            .utc()
            .toDate();
        }
        queryBuilder.andWhere(
          'report.created_on BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'report.created_on': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'company_name':
            {
              queryBuilder.orderBy({ 'LOWER(c.company_name)': sorting_order });
            }
            break;
          case 'account_name':
            {
              queryBuilder.orderBy({ 'LOWER(ba.account_name)': sorting_order });
            }
            break;
          case 'account_type':
            {
              queryBuilder.orderBy({ 'ba.account_type': sorting_order });
            }
            break;
          case 'month_end_date':
            {
              queryBuilder.orderBy({ 'report.month_end_date': sorting_order });
            }
            break;
          case 'bank_statement_balance':
            {
              queryBuilder.orderBy({
                'report.bank_statement_balance': sorting_order,
              });
            }
            break;
          case 'report_status':
            {
              queryBuilder.orderBy({ 'report.report_status': sorting_order });
            }
            break;
          case 'report_date':
            {
              queryBuilder.orderBy({ 'report.created_on': sorting_order });
            }
            break;
          case 'adjustments':
            {
              queryBuilder.orderBy({ 'report.adjustments': sorting_order });
            }
            break;
          case 'adjustment_comment':
            {
              queryBuilder.orderBy({
                'LOWER(report.adjustment_comment)': sorting_order,
              });
            }
            break;
          case 'expected_balance':
            {
              queryBuilder.orderBy({
                'report.expected_balance': sorting_order,
              });
            }
            break;
          case 'deposit_withdrawal_balance':
            {
              queryBuilder.orderBy({
                'report.deposit_withdrawal_balance': sorting_order,
              });
            }
            break;
          case 'account_ledger_balance':
            {
              queryBuilder.orderBy({
                'report.account_ledger_balance': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);
      // console.log('results: ', rawResults)

      rawResults.forEach((entry) => {
        entry.bank_statement_balance = formatCurrency(
          entry.bank_statement_balance,
        );
        entry.adjustments = formatCurrency(entry.adjustments);
        entry.expected_balance = formatCurrency(entry.expected_balance);
        entry.deposit_withdrawal_balance = formatCurrency(
          entry.deposit_withdrawal_balance,
        );
        entry.account_ledger_balance = formatCurrency(
          entry.account_ledger_balance,
        );
      });

      this.logger.log(
        `Fetched all reconciliation reports successfully with data: ${JSON.stringify(rawResults)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Fetched all reconciliation reports successfully.`,
        { report_list: rawResults, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all reconciliation report with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async checkNilReturnForAudit(data: CheckNilReturnForAuditInput, decoded) {
    const timezone = decoded?.timezone || data.timezone;
    this.logger.log('timezone: ' + timezone);

    const startOfDayUTC = moment(data.year_end_date).startOf('day').toDate();
    const endOfDayUTC = moment(data.year_end_date).endOf('day').toDate();

    return await this.bankAccountsRepo
      .createQueryBuilder('ba')
      .leftJoinAndSelect(
        (qb) => {
          return qb
            .select(
              'UNNEST(ARRAY[payment_from_account, payment_to_account, retention_account])',
              'account_id',
            )
            .addSelect('payment_id')
            .addSelect('payment_date')
            .from(PaymentDetails, 'pd')
            .where('pd.current_status <> :status', { status: 'Deleted' })
            .andWhere(
              'pd.payment_date BETWEEN :startOfDayUTC AND :endOfDayUTC',
              { startOfDayUTC, endOfDayUTC },
            );
        },
        's',
        'ba.bank_account_id = s.account_id',
      )
      .where(
        `ba.added_by_client_supplier = false and ba.account_type = 'Retention Trust Account'`,
      )
      .andWhere('ba.bank_account_id = :bankAccountId', {
        bankAccountId: data.bank_account_id,
      })
      .select([
        'ba.id',
        'ba.bank_account_id',
        'ba.account_type',
        'ba.account_number',
        'ba.opening_date',
        'ba.status',
        's.payment_id',
        's.payment_date',
      ])
      .getRawMany();
  }

  async insertAuditReportDetails(decoded, data: AddAuditReportInput) {
    const attachments: string[] = [];
    if (data.attachment_id) {
      attachments.push(data.attachment_id);
    }
    const auditDetails = this.auditReportRepo.create({
      ...data,
      attachment_ids: attachments.length > 0 ? attachments : null,
      created_on: moment.tz('UTC'),
      created_by: decoded?.userId,
      created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
    });
    const auditReport = await this.auditReportRepo.save(auditDetails);
    return auditReport;
  }

  async editAuditReportDetails(decoded: any, data: EditAuditReportInput) {
    const auditDetails = await this.auditReportRepo.findOne({
      where: { id: data.id },
    });

    if (!auditDetails) throw new Error('Audit report not found');

    if (data.company_id !== undefined) auditDetails.company_id = data.company_id;
    if (data.project_id !== undefined) auditDetails.project_id = data.project_id;
    if (data.audit_date !== undefined) auditDetails.audit_date = data.audit_date;
    if (data.aud_gen_from_date !== undefined) auditDetails.aud_gen_from_date = data.aud_gen_from_date;
    if (data.aud_gen_to_date !== undefined) auditDetails.aud_gen_to_date = data.aud_gen_to_date;
    if (data.bank_account_id !== undefined) auditDetails.bank_account_id = data.bank_account_id;
    if (data.nil_return !== undefined) auditDetails.nil_return = data.nil_return;
    auditDetails.updated_by = decoded?.userId;
    auditDetails.updated_on = moment.tz('UTC');
    auditDetails.updated_group = decoded?.isAdmin ? 'ADMIN' : 'USER';

    const existingIds = auditDetails.attachment_ids || [];
    const newIds = data.new_attachment_ids || [];
    const removedIds = data.removed_attachment_ids || [];

    const finalAttachmentIds = [
      ...existingIds.filter((id) => !removedIds.includes(id)),
      ...newIds.filter((id) => !existingIds.includes(id)),
    ];

    auditDetails.attachment_ids = finalAttachmentIds;

    const updatedAudit = await this.auditReportRepo.save(auditDetails);

    // if (removedIds.length > 0) {
    //   await this.fileAttachments.delete(removedIds);
    // }

    if (updatedAudit) {
      const auditNotices = await this.noticesRepo.find({
        where: {
          bank_account_id: data.bank_account_id,
          audit_id: auditDetails.audit_id,
        },
      });

      for (const notice of auditNotices) {
        const updatedStatus =
          notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';

        await this.noticesRepo.update(notice.id, {
          status: updatedStatus,
        });
      }
    }

    return updatedAudit;
  }

  async viewAuditReportById(id: string) {
    const audit = await this.auditReportRepo
      .createQueryBuilder('a')
      .select([
        'a.id AS id',
        'a.audit_id AS audit_id',
        'a.company_id AS company_id',
        'a.project_id AS project_id',
        'a.audit_date AS audit_date',
        'a.bank_account_id AS bank_account_id',
        'a.attachment_ids AS attachment_ids',
        'a.aud_gen_from_date AS aud_gen_from_date',
        'a.aud_gen_to_date AS aud_gen_to_date',
        'a.nil_return AS nil_return',
        'a.created_on AS report_date',
        'ba.account_name AS account_name',
        'ba.account_type AS account_type',
      ])
      .innerJoin('a.bankAccounts', 'ba')
      .where('a.id = :id', { id })
      .getRawOne();

    if (!audit) return null;

    const file_details: GetFileRes[] = [];

    if (audit.attachment_ids?.length > 0) {
      const files = await this.fileAttachments
        .createQueryBuilder('f')
        .select([
          'f.id',
          'f.file_type',
          'f.file_path',
          'f.attachment_type',
          'f.file_name',
          'f.custom_file_name',
        ])
        .where('f.id IN (:...ids)', { ids: audit.attachment_ids })
        .getMany();

      for (const file of files) {
        let base64Data: string = null;
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(file.file_path);
          if (fileBuffer) {
            base64Data = `data:${file.file_type};base64,${fileBuffer.toString('base64')}`;
          }
        } catch (err) {
          this.logger.warn(
            `File read failed at ${file.file_path}: ${err.message}`,
          );
        }
        const cleanPath = file.file_path.replace(/\\/g, '/');
        file_details.push({
          id: file.id,
          file: base64Data,
          file_path: cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`,
          file_type: file.file_type,
          attachment_type: file.attachment_type,
          file_name: file.custom_file_name ?? file.file_name,
        });
      }
    }
    return {
      ...audit,
      file_details: file_details, // multiple files
    };
  }

  async getAllAuditReportList(data: GetAllAuditReportInput, decoded) {
    try {
      this.logger.log(
        `Handling request for fetching all audit report with data: ${JSON.stringify(data)}`,
      );

      const timezone = decoded?.timezone || data.timezone;
      this.logger.log('timezone: ' + timezone);

      const queryBuilder = this.auditReportRepo
        .createQueryBuilder('report')
        .select([
          'report.id AS id',
          'report.audit_id AS audit_id',
          'report.company_id AS company_id',
          'c.company_name AS company_name',
          'report.bank_account_id AS bank_account_id',
          'ba.account_name AS account_name',
          'ba.account_type AS account_type',
          'report.audit_date AS audit_date',
          'report.nil_return AS nil_return',
          'report.created_on AS report_date',
          'report.attachment_ids AS attachment_ids',
          'b.bank_statement_id AS statement_id',
        ])
        .innerJoin('report.companyDetails', 'c')
        .innerJoin('report.bankAccounts', 'ba')
        .leftJoin(
          BankStatements,
          'b',
          'report.bank_account_id = b.bank_account_id AND report.audit_date = b.statement_date',
        )
        .where('report.company_id = :company_id', {
          company_id: data.company_id,
        });

      if (data.bank_account_id) {
        queryBuilder.andWhere(`report.bank_account_id = :bank_account_id`, {
          bank_account_id: data.bank_account_id,
        });
      }

      if (data.account_type) {
        queryBuilder.andWhere(`ba.account_type = :account_type`, {
          account_type: data.account_type,
        });
      }

      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment
            .tz(data.start_date, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment
            .tz(data.end_date, timezone)
            .endOf('day')
            .utc()
            .toDate();
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
        } else if (
          data.date_filter === 'Custom' &&
          !data.start_date &&
          data.end_date
        ) {
          startDate = moment
            .utc(data.end_date)
            .tz(timezone)
            .startOf('year')
            .utc()
            .toDate();
          endDate = moment
            .utc(data.end_date)
            .tz(timezone)
            // .endOf('day')
            .utc()
            .toDate();
        }
        queryBuilder.andWhere(
          'report.created_on BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'report.created_on': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'company_name':
            {
              queryBuilder.orderBy({ 'LOWER(c.company_name)': sorting_order });
            }
            break;
          case 'account_name':
            {
              queryBuilder.orderBy({ 'LOWER(ba.account_name)': sorting_order });
            }
            break;
          case 'account_type':
            {
              queryBuilder.orderBy({ 'ba.account_type': sorting_order });
            }
            break;
          case 'audit_date':
            {
              queryBuilder.orderBy({ 'report.audit_date': sorting_order });
            }
            break;
          case 'report_date':
            {
              queryBuilder.orderBy({ 'report.created_on': sorting_order });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const allAttachmentIds = rawResults
        .map((r) => r.attachment_ids)
        .filter(Boolean)
        .flat();

      const uniqueIds = [...new Set(allAttachmentIds)];

      let fileMap = {};
      if (uniqueIds.length > 0) {
        const files = await this.fileAttachments
          .createQueryBuilder('f')
          .select([
            'f.id',
            'f.file_name',
            'f.file_type',
            'f.file_path',
            'f.attachment_type',
          ])
          .where('f.id IN (:...ids)', { ids: uniqueIds })
          .getMany();

        fileMap = files.reduce((acc, file) => {
          const cleanPath = file.file_path.replace(/\\/g, '/');
          acc[file.id] = {
            ...file,
            file_path: cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`,
          };
          return acc;
        }, {});
      }
      const report_list = rawResults.map((row) => {
        const attachments = (row.attachment_ids || [])
          .map((id) => fileMap[id])
          .filter(Boolean);
        return {
          ...row,
          file_details: attachments,
        };
      });

      this.logger.log(
        `Fetched all audit reports successfully with data: ${JSON.stringify(rawResults)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Fetched all audit reports successfully.`,
        {
          report_list,
          total_count,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all audit report with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getBankAccountDetails(bank_account_id) {
    return await this.bankAccountsRepo.findOne({ where: { bank_account_id } });
  }

  async getLatestAuditReportForBankAccount(bank_account_id: number) {
    return this.auditReportRepo
      .createQueryBuilder('audit')
      .where('audit.bank_account_id = :bank_account_id', { bank_account_id })
      .orderBy('audit.audit_date', 'DESC')
      .limit(1)
      .getOne();
  }

  async checkAuditReportExistence(
    data: CheckReportExistenceByAccountIdInput,
    openingDate,
    decoded,
  ) {
    const timezone = decoded?.timezone || data.timezone;
    this.logger.log('timezone: ' + timezone);

    const openingDateUTC = moment(openingDate).startOf('day').toDate();

    // Get the start and end of the year for the given month_end_date
    const startOfYearUTC = moment(data.month_end_date).startOf('year').toDate();
    const endOfYearUTC = moment(data.month_end_date).endOf('year').toDate();

    // Ensure the start of the year is after the opening date
    const startDateForAudit =
      startOfYearUTC > openingDateUTC ? startOfYearUTC : openingDateUTC;

    const existingAudits = await this.auditReportRepo.find({
      where: {
        bank_account_id: data.bank_account_id,
        audit_date: And(
          MoreThanOrEqual(startDateForAudit),
          LessThanOrEqual(endOfYearUTC),
        ),
      },
    });

    if (!data.project_id) {
      // If project_id is not provided, just return all matches
      return existingAudits;
    }

    if (!existingAudits.length) return [];

    const auditsWithNullProject = existingAudits.filter(
      (audit) => !audit.project_id,
    );
    const auditsWithSameProject = existingAudits.filter(
      (audit) => audit.project_id === data.project_id,
    );

    if (auditsWithNullProject.length > 0) {
      // Existing audit with no project preference - block any new audits
      return existingAudits;
    }

    if (auditsWithSameProject.length > 0) {
      // Audit for the same project already exists in the same year
      return existingAudits;
    }

    // Different project exists, return to indicate conflict
    return existingAudits;
  }

  async replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }

  /**
   * Task #91 — Returns PayTrade trust-ledger journal_entries rows tied to a
   * single claim. Mirrors the producer pattern in fetchLedgerJournalsByAccountId:
   *   - claim-level rows: journal_type.process_type IN (3,22,41,44) and
   *     journal_entries.audit_id = claim.payment_claim_id
   *   - payment-level rows: journal_type.process_type NOT IN (3,22,41,44)
   *     and journal_entries.audit_id IN (payment_details.payment_id under
   *     this claim)
   * Newest-first, capped at 100 rows. Read-only.
   */
  async getTrustJournalsForClaim(
    payment_claim_id: number,
    company_id: number,
  ): Promise<any[]> {
    if (!payment_claim_id || !company_id) return [];
    // Pre-validate that the claim belongs to the caller's company before
    // selecting any journal_entries — prevents cross-company data exposure
    // when callers pass another company's payment_claim_id.
    const claimOwner: { company_id: number }[] = await this.dataSource.query(
      `SELECT company_id FROM payment_claims WHERE payment_claim_id = $1 LIMIT 1`,
      [payment_claim_id],
    );
    if (
      !claimOwner.length ||
      Number(claimOwner[0].company_id) !== Number(company_id)
    ) {
      return [];
    }
    const rows: any[] = await this.dataSource.query(
      `SELECT je.id::text                                AS id,
              je.journal_number                          AS journal_number,
              je.journal_date                            AS journal_date,
              je.audit_id                                AS audit_id,
              je.debit_amount                            AS debit_amount,
              je.credit_amount                           AS credit_amount,
              je.dynamic_values                          AS dynamic_values,
              jt.process_type                            AS process_type,
              jt.process_name                            AS process_name,
              jt.process_description                     AS process_description,
              ba.account_name                            AS account_name,
              pd.payment_id                              AS payment_id_ref
         FROM journal_entries je
         INNER JOIN journal_type jt
                 ON jt.process_id = je.journal_process_id
         LEFT JOIN bank_accounts ba
                ON ba.bank_account_id = je.bank_account_id
         LEFT JOIN payment_details pd
                ON jt.process_type NOT IN (3, 22, 41, 44)
               AND pd.payment_id = je.audit_id
               AND pd.payment_claim_id = $1
        WHERE je.company_id = $2
          AND (
            (jt.process_type IN (3, 22, 41, 44) AND je.audit_id = $1)
            OR (jt.process_type NOT IN (3, 22, 41, 44)
                AND je.audit_id IN (
                  SELECT payment_id FROM payment_details
                   WHERE payment_claim_id = $1
                ))
          )
        ORDER BY je.journal_date DESC,
                 je.journal_number DESC,
                 je.created_on DESC
        LIMIT 100`,
      [payment_claim_id, company_id],
    );

    const out: any[] = [];
    for (const r of rows) {
      const isClaim = [3, 22, 41, 44].includes(Number(r.process_type));
      let label: string =
        r.process_description || r.process_name || '';
      if (label && r.dynamic_values && typeof r.dynamic_values === 'object') {
        try {
          label = await this.replaceVariables(label, r.dynamic_values);
        } catch {
          /* swallow — fall back to raw template */
        }
      }
      label = (label || '').replace(/<[^>]*>/g, '').trim();
      out.push({
        id: r.id,
        journal_number: Number(r.journal_number) || 0,
        journal_date: r.journal_date
          ? new Date(r.journal_date).toISOString()
          : null,
        account_name: r.account_name || null,
        process_label: label || r.process_name || null,
        audit_kind: isClaim ? 'claim' : 'payment',
        payment_id_ref:
          !isClaim && r.payment_id_ref != null
            ? Number(r.payment_id_ref)
            : null,
        debit_amount:
          r.debit_amount != null ? String(r.debit_amount) : null,
        credit_amount:
          r.credit_amount != null ? String(r.credit_amount) : null,
      });
    }
    return out;
  }
}
