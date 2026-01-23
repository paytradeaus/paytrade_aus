import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import * as archiver from 'archiver';
import * as jwt from 'jsonwebtoken';
import { jwtConstants } from 'src/api/auth/constants';
import * as fs from 'fs';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ExportExcelDataInput } from './dto/export-data-excel.input';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
import { format } from 'date-fns';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import {
  ComplianceChecks,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { ComplianceRTAFunctions } from 'src/api/users/compliances/functions/rta-functions';
import { CompliancePTAFunctions } from 'src/api/users/compliances/functions/pta-functions';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import { DummyTable } from 'src/entities/dummy-table.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { ContactSubmissions } from 'src/entities/contact-submissions.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { FAQ } from 'src/entities/admin-faq.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { JournalsService } from 'src/api/users/banking/journals/journals.service';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { paytradeLogo } from 'src/api/users/notices/doc-images-base64';
import { ExportDataGateway } from './pdf.gateway';
import { pipeline } from 'stream/promises';
const { PassThrough } = require('stream');
import * as path from 'path';
import { PdfTemplates } from 'src/entities/pdf-template.entity';
import { formatCurrency } from 'src/libs/@currency-formattor/currency-formattor';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';

@Injectable()
export class ExportDataService {
  private readonly jwtSecret = jwtConstants.secret;
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(VariationDetails)
    private variationDetails: Repository<VariationDetails>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(NoticeDetails)
    private noticesRepo: Repository<NoticeDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(SubPayments)
    private subPayments: Repository<SubPayments>,
    @InjectRepository(ActivityLogNew)
    private activityLog: Repository<ActivityLogNew>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(ActivityLogTemplates)
    private eventTemplates: Repository<ActivityLogTemplates>,
    @InjectRepository(TransactionDetails)
    private transactionDetailsRepo: Repository<TransactionDetails>,
    @InjectRepository(BankStatements)
    private bankStatements: Repository<BankStatements>,
    @InjectRepository(ReconciliationReport)
    private reconciliationReport: Repository<ReconciliationReport>,
    @InjectRepository(ComplianceChecks)
    private readonly complianceChecks: Repository<ComplianceChecks>,
    @InjectRepository(RtaCompliances)
    private readonly rtaCompliances: Repository<RtaCompliances>,
    @InjectRepository(PtaCompliances)
    private readonly ptaCompliances: Repository<PtaCompliances>,
    @InjectRepository(SubscriptionPlanDetails)
    private subscriptionPlanDetails: Repository<SubscriptionPlanDetails>,
    @InjectRepository(SubscriptionItems)
    private subscriptionItems: Repository<SubscriptionItems>,
    @InjectRepository(SubscriptionDetails)
    private subscriptionDetails: Repository<SubscriptionDetails>,
    @InjectRepository(DummyTable)
    private dummyTable: Repository<DummyTable>,
    @InjectRepository(SubscriptionTransaction)
    private subscriptionTransaction: Repository<SubscriptionTransaction>,
    @InjectRepository(JournalEntries)
    private journalEntries: Repository<JournalEntries>,
    @InjectRepository(ContactSubmissions)
    private contactSubmissions: Repository<ContactSubmissions>,
    @InjectRepository(Contents) private contentDetails: Repository<Contents>,
    @InjectRepository(FAQ) private faqDetails: Repository<FAQ>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    @InjectRepository(BlogResource)
    private blogResource: Repository<BlogResource>,
    @InjectRepository(AdminGroupDetails)
    private admingroupdetails: Repository<AdminGroupDetails>,
    @InjectRepository(PdfTemplates)
    private pdfTemplates: Repository<PdfTemplates>,
    @InjectRepository(HolidayDetails)
    private holidayDetails: Repository<HolidayDetails>,
    @InjectRepository(StripeCoupons)
    private stripeCoupons: Repository<StripeCoupons>,
    private readonly complianceRTAFunctions: ComplianceRTAFunctions,
    private readonly compliancePTAFunctions: CompliancePTAFunctions,
    private journalsService: JournalsService,
    private complianceService: CompliancesService,
    private readonly exportGateway: ExportDataGateway,
  ) {
    this.logger = new PaytradeLogger('EXPORT_DATA_SERVICE');
  }

  async generateSignedUrl(data: ExportExcelDataInput): Promise<string> {
    try {
      const file_name = (await this.getFileName(data)).fileName;
      data = { ...data, file_name };
      const totalRecords = await this.getTotalRecordCount(data);
      const batchSize = 50000;
      const numBatches = Math.ceil(totalRecords / batchSize); // Calculate total batches

      const excelBuffers: Buffer[] = [];
      const excelPromises = [];

      for (let i = 0; i < numBatches; i++) {
        const offset = i * batchSize;

        excelPromises.push(
          this.generateExcelBuffers(data, offset, batchSize, excelBuffers),
        );
      }

      // Wait for all Excel to be generated
      await Promise.all(excelPromises);

      let fileName, contentType;
      if (numBatches > 1) {
        fileName = file_name + '.zip';
        contentType = 'application/zip';
        const zipBuffer = await this.createZipBuffer(
          excelBuffers,
          file_name,
          '.xlsx',
        );
        fs.writeFileSync(fileName, zipBuffer);
      } else {
        fileName = file_name + '.xlsx';
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fs.writeFileSync(fileName, excelBuffers[0]);
      }

      const expiration = Math.floor(Date.now() / 1000) + 60 * 10;
      const token = jwt.sign(
        { fileName, contentType, exp: expiration },
        this.jwtSecret,
      );

      return token;
    } catch (error) {
      this.logger.error(`Error in generateSignedUrl: ${error.message}`);
      throw new Error('Failed to generate signed URL');
    }
  }

  async generateExcelBuffers(
    data: ExportExcelDataInput,
    offset: number,
    limit: number,
    excelBuffers: Buffer[],
  ): Promise<any> {
    const { timezone } = data;
    const datas: any = await this.fetchBatchData(data, offset, limit);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Add Border
    const setBorderRowEnd = (excel: any, lastColNo?: Number) => {
      if (excel) {
        const rightBorderStyle = (excel
          .getRow(excel.lastRow.number)
          .getCell(lastColNo ? lastColNo : 6).border = {
          ...excel
            .getRow(excel.lastRow.number)
            .getCell(lastColNo ? lastColNo : 6).border,
          right: { style: 'thin' },
        });
      }
    };

    // format value
    const numFmt = '"$"#,##0.00',
      dateFmt = 'DD/MM/YYYY';

    // Header Style
    const borderStyle = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
    };

    const headerStyle: any = {
      font: { bold: true },
      alignment: { horizontal: 'center' },
      border: borderStyle,
    };

    let excelTitle = (await this.getFileName(data)).pdfTitle;

    if (data?.screen_name === 'journal_by_accountId') {
      const bankDetails = await this.getBankDetails(data);

      // Determine the number of columns based on your data for merging header title
      const columnCount = data?.is_audit_view ? 5 : 4; // Adjust this number as needed

      let titleText = `${
        bankDetails?.account_name
          ? excelTitle + ' - ' + bankDetails?.account_name
          : excelTitle
      }`;

      // Add the title row
      const titleRow = worksheet.addRow([titleText]);

      // Merge the title row across all columns
      worksheet.mergeCells(1, 1, 1, columnCount);
      // Center align the title
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      // Apply bold font to the title
      titleRow.getCell(1).font = { bold: true, size: 11 };

      let startDate = datas?.filter_dates?.start_date,
        endDate = datas?.filter_dates?.end_date;

      if (startDate && endDate) {
        const dateFilterText = `From: ${this.getFormattedDate(startDate, timezone)} To: ${this.getFormattedDate(endDate, timezone)}`;
        const dateFilter = worksheet.addRow([dateFilterText]);
        // Apply bold font to the dateFilterText
        dateFilter.getCell(1).font = { bold: true, size: 11 };
      }

      datas?.ledger_journals_list?.forEach((entry, i) => {
        // add header
        const headerTitleArr = ['', 'Account', 'Debit', 'Credit'];
        if (data?.is_audit_view) {
          headerTitleArr.splice(2, 0, 'Audit Id');
        }
        worksheet.addRow(headerTitleArr);
        const headerRow = worksheet.getRow(worksheet.lastRow?.number);
        headerRow.eachCell((cell, colNumber) => {
          colNumber === 1
            ? (cell.style = {
                font: { bold: true },
                alignment: { horizontal: 'center' },
              })
            : (cell.style = headerStyle);
        });

        entry.accounts.forEach((account, accIndex) => {
          const rowData = [
            entry.date && accIndex === 0
              ? moment(new Date(entry.date)).tz(timezone).format(dateFmt)
              : '',
            account.account_name,
            account.debit,
            account.credit,
          ];
          if (data?.is_audit_view) {
            rowData.splice(2, 0, account?.audit_id);
          }
          worksheet.addRow(rowData);

          if (accIndex === 0) {
            worksheet.getRow(worksheet.lastRow.number).getCell(1).alignment = {
              horizontal: 'left',
            };
          }
        });

        // Add journal description and totals
        const accountLastRow = [
          '',
          entry.journal_description,
          entry.total_debit,
          entry.total_credit,
        ];
        if (data?.is_audit_view) {
          accountLastRow.splice(2, 0, '');
        }
        worksheet.addRow(accountLastRow);
        worksheet.getRow(worksheet.lastRow?.number).font = { bold: true };
      });

      const widthDetails = [
        { key: 'date', width: 20 },
        { key: 'account', width: 50 },
        { key: 'debit', width: 25 },
        { key: 'credit', width: 25 },
      ];
      if (data?.is_audit_view) {
        widthDetails.splice(2, 0, { key: 'Audit Id', width: 25 });
      }
      worksheet.columns = widthDetails;
    } else if (data?.screen_name === 'ledger_by_accountId') {
      const bankDetails = await this.getBankDetails(data);

      // Determine the number of columns based on your data for merging header title
      const columnCount = 6; // Adjust this number as needed

      let titleText = `${
        bankDetails?.account_name
          ? excelTitle + ' - ' + bankDetails?.account_name
          : excelTitle
      }`;

      // Add the title row
      const titleRow = worksheet.addRow([titleText]);

      // Merge the title row across all columns
      worksheet.mergeCells(1, 1, 1, columnCount);

      // Center align the title
      titleRow.getCell(1).alignment = { horizontal: 'center' };

      // Apply bold font to the title
      titleRow.getCell(1).font = { bold: true, size: 11 };

      let startDate = datas?.filter_dates?.start_date,
        endDate = datas?.filter_dates?.end_date;

      if (startDate && endDate) {
        const dateFilterText = `From: ${this.getFormattedDate(startDate, timezone)} To: ${this.getFormattedDate(endDate, timezone)}`;
        const dateFilter = worksheet.addRow([dateFilterText]);
        // Apply bold font to the dateFilterText
        dateFilter.getCell(1).font = { bold: true, size: 11 };
      }

      worksheet.addRow([
        'Date',
        'Transaction',
        'Reference',
        'Debit',
        'Credit',
        'Balance',
      ]);
      const headerRow = worksheet.getRow(worksheet.lastRow?.number);
      headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
      });
      setBorderRowEnd(worksheet);

      datas?.grid_entries?.forEach((entry, i) => {
        // New Row
        worksheet.addRow([
          entry?.account_name,
          'Opening Balance',
          '',
          '',
          '',
          entry?.opening_balance,
        ]);
        worksheet.getRow(worksheet.lastRow?.number).getCell(6).numFmt = numFmt;
        // Make row font bold
        worksheet.getRow(worksheet.lastRow?.number).font = { bold: true };
        setBorderRowEnd(worksheet);
        entry?.entries?.forEach((accObj, index) => {
          // New Row

          worksheet.addRow([
            accObj?.journal_date
              ? moment(new Date(accObj?.journal_date)).format(dateFmt)
              : '',
            accObj?.journal_description,
            accObj?.journal_number ? `#${accObj?.journal_number}` : '',
            accObj?.debit_amount,
            accObj?.credit_amount,
            accObj?.balance_amount,
          ]);
          // Amount format cell
          [4, 5, 6]?.map(
            (cellNo) =>
              (worksheet
                .getRow(worksheet.lastRow?.number)
                .getCell(cellNo).alignment = { horizontal: 'right' }),
          );
          // format cell to right alignment
          [4, 5, 6]?.map(
            (cellNo) =>
              (worksheet
                .getRow(worksheet.lastRow?.number)
                .getCell(cellNo).numFmt = numFmt),
          );
          // Text bold last cell in row
          worksheet.getRow(worksheet.lastRow?.number).getCell(6).font = {
            bold: true,
          };
          setBorderRowEnd(worksheet);
        });

        // New Row
        worksheet.addRow([
          '',
          `Total ${entry?.account_name}`,
          '',
          entry?.total_debit_amount,
          entry?.total_credit_amount,
        ]);

        // Amount format cell
        [4, 5]?.map(
          (cellNo) =>
            (worksheet
              .getRow(worksheet.lastRow?.number)
              .getCell(cellNo).numFmt = numFmt),
        );
        worksheet.getRow(worksheet.lastRow?.number).font = { bold: true };
        setBorderRowEnd(worksheet);

        // New Row
        const netMovement = worksheet.addRow([
          '',
          'Closing Balance',
          '',
          entry?.debit_net_movement ? entry?.debit_net_movement : '',
          entry?.credit_net_movement ? entry?.credit_net_movement : '',
          '',
        ]);

        // Amount format cell
        [4, 5]?.map(
          (cellNo) =>
            (worksheet
              .getRow(worksheet.lastRow?.number)
              .getCell(cellNo).numFmt = numFmt),
        );
        worksheet.getRow(worksheet.lastRow?.number).font = { bold: true };
        netMovement.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            ...{},
          };
        });

        setBorderRowEnd(worksheet);
      });

      // Set width
      worksheet.columns = [
        { key: 'date', width: 25 },
        { key: 'Transaction', width: 50 },
        { key: 'Reference', width: 10 },
        { key: 'debit', width: 15 },
        { key: 'credit', width: 15 },
        {
          key: 'Balance',
          width: 20,
        },
      ];
    } else if (data?.screen_name === 'trial_balance_by_accountId') {
      const bankDetails = await this.getBankDetails(data);

      // Determine the number of columns based on your data for merging header title
      const columnCount = 2; // Adjust this number as needed

      // Add the title row
      const titleRow = worksheet.addRow([
        `${
          bankDetails?.account_name
            ? excelTitle + ' - ' + bankDetails?.account_name
            : excelTitle
        }`,
      ]);

      // Merge the title row across all columns
      worksheet.mergeCells(1, 1, 1, columnCount);

      // Center align the title
      titleRow.getCell(1).alignment = { horizontal: 'center' };

      // Apply bold font to the title
      titleRow.getCell(1).font = { bold: true, size: 11 };
      titleRow.getCell(1).border = { right: { style: 'thin' } };

      if (data?.start_date) {
        const dateFilterText = `${this.getFormattedDate(data?.start_date, timezone)}`;
        const dateFilter = worksheet.addRow([dateFilterText]);
        // Apply bold font to the dateFilterText
        dateFilter.getCell(1).font = { bold: true, size: 11 };
      }

      const header = worksheet.addRow(['Account', 'Closing Balance']);

      header.eachCell(
        (cell, i) =>
          (cell.style = {
            font: { bold: true },
            alignment: { readingOrder: i === 1 ? 'ltr' : 'rtl' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
          }),
      );

      setBorderRowEnd(worksheet, 2);

      const result = datas?.trial_balance_list;

      result?.forEach((entry) => {
        const row = worksheet.addRow([
          entry?.account_name,
          entry?.closing_balance,
        ]);
        row.eachCell(
          (cell, i) =>
            (cell.alignment = { readingOrder: i === 1 ? 'ltr' : 'rtl' }),
        );
        setBorderRowEnd(worksheet, 2);
        row.getCell(2).numFmt = numFmt;
      });

      const balanceRow = worksheet.addRow([
        'Balance',
        datas?.total_closing_balance,
      ]);

      balanceRow.eachCell(
        (cell, i) =>
          (cell.style = {
            font: { bold: true },
            alignment: { readingOrder: i === 1 ? 'ltr' : 'rtl' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
          }),
      );

      setBorderRowEnd(worksheet, 2);
      balanceRow.getCell(2).numFmt = numFmt;

      worksheet.columns = [
        { key: 'account', width: 50 },
        { key: 'balance', width: 20 },
      ];
    } else if (data?.screen_name === 'deposit_withdrawal_by_accountId') {
      const bankDetails = await this.getBankDetails(data);

      // Determine the number of columns based on your data for merging header title
      const columnCount = 9; // Adjust this number as needed

      let titleText = `${
        bankDetails?.account_name
          ? excelTitle + ' - ' + bankDetails?.account_name
          : excelTitle
      }`;
      // Add the title row
      const titleRow = worksheet.addRow([titleText]);

      // Merge the title row across all columns
      worksheet.mergeCells(1, 1, 1, columnCount);

      // Center align the title
      titleRow.getCell(1).alignment = { horizontal: 'center' };

      // Apply bold font to the title
      titleRow.getCell(1).font = { bold: true, size: 11 };
      titleRow.getCell(1).border = { right: { style: 'thin' } };

      let startDate = datas?.filter_dates?.start_date,
        endDate = datas?.filter_dates?.end_date;

      if (startDate && endDate) {
        const dateFilterText = `From: ${this.getFormattedDate(startDate, timezone)} To: ${this.getFormattedDate(endDate, timezone)}`;
        const dateFilter = worksheet.addRow([dateFilterText]);
        // Apply bold font to the dateFilterText
        dateFilter.getCell(1).font = { bold: true, size: 11 };
      }

      const header = worksheet.addRow([
        'Date',
        'Type',
        'Transaction',
        'Account Name',
        'Account Number',
        'Bsb Number',
        'Reference',
        'Amount',
        'Balance',
      ]);

      header.eachCell(
        (cell, i) =>
          (cell.style = {
            font: { bold: true },
            alignment: { horizontal: 'center' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
          }),
      );

      setBorderRowEnd(worksheet, 9);

      const result = datas?.grid_entries;

      // Add opening balance
      const firstRow = worksheet.addRow([
        datas?.opening_date
          ? moment(new Date(datas?.opening_date)).format(dateFmt)
          : '',
        '',
        'Opening Balance',
        '',
        '',
        '',
        '',
        '',
        datas?.opening_balance,
      ]);

      firstRow.font = { bold: true };
      firstRow.getCell(9).alignment = { readingOrder: 'rtl' };
      setBorderRowEnd(worksheet, 9);

      result?.forEach((entry) => {
        worksheet.addRow([
          entry?.journal_date
            ? moment(new Date(entry?.journal_date)).format(dateFmt)
            : '',
          entry?.type,
          entry?.journal_description,
          entry?.account_name,
          entry?.account_number,
          entry?.bsb_number,
          `#${entry?.journal_number}`,
          entry?.amount,
          entry?.balance_amount,
        ]);
        worksheet
          ?.getRow(worksheet?.lastRow?.number)
          .eachCell((cell, cellNo) => {
            if (cellNo > 7) {
              cell.style = {
                alignment: { readingOrder: 'rtl' },
                font: { bold: cellNo === 9 ? true : false },
              };
              cell.numFmt = numFmt;
            }
          });

        setBorderRowEnd(worksheet, 9);
      });

      // Add closing balance
      const lastRow = worksheet.addRow([
        datas?.closing_date
          ? moment(new Date(datas?.closing_date)).tz(timezone).format(dateFmt)
          : '',
        '',
        'Closing Balance',
        '',
        '',
        '',
        '',
        '',
        datas?.closing_balance,
      ]);
      lastRow.eachCell((cell, i) => {
        cell.style = {
          font: { bold: true },
          alignment: { readingOrder: i === 9 ? 'rtl' : 'ltr' },
          border: { bottom: { style: 'thin' } },
        };
      });
      setBorderRowEnd(worksheet, 9);

      // set width
      worksheet.columns = [
        { key: 'date', width: 20 },
        { key: 'type', width: 5 },
        { key: 'transaction', width: 40 },
        { key: 'account_name', width: 25 },
        { key: 'account_number', width: 20 },
        { key: 'bsb_number', width: 15 },
        { key: 'reference', width: 10 },
        { key: 'amount', width: 15 },
        { key: 'balance', width: 15 },
      ];
    } else {
      if (data?.screen_name === 'reconciliation') {
        const bankDetails = await this.getBankDetails(data);

        // Determine the number of columns based on your data for merging header title
        const columnCount = 9; // Adjust this number as needed

        let titleText = `${
          bankDetails?.account_name
            ? excelTitle + ' - ' + bankDetails?.account_name
            : excelTitle
        }`;
        // Add the title row
        const titleRow = worksheet.addRow([titleText]);

        // Merge the title row across all columns
        worksheet.mergeCells(1, 1, 1, columnCount);

        // Center align the title
        titleRow.getCell(1).alignment = { horizontal: 'center' };

        // Apply bold font to the title
        titleRow.getCell(1).font = { bold: true, size: 11 };
        titleRow.getCell(1).border = { right: { style: 'thin' } };

        if (
          data?.date_filter === 'Custom' &&
          data?.start_date &&
          data?.end_date
        ) {
          const dateFilterText = `From: ${this.getFormattedDate(data?.start_date, timezone)} To: ${this.getFormattedDate(data?.end_date, timezone)}`;
          const dateFilter = worksheet.addRow([dateFilterText]);
          // Apply bold font to the dateFilterText
          dateFilter.getCell(1).font = { bold: true, size: 11 };
        }
      }
      // Add custom headers and format
      const customHeaders = this.getCustomHeaders(data);
      this.addHeadersToWorksheet(
        data.screen_name,
        worksheet,
        customHeaders,
        data,
      );
      this.addDataToWorksheet(worksheet, datas, customHeaders, data);
    }

    excelBuffers.push(Buffer.from(await workbook.xlsx.writeBuffer()));
    return excelBuffers;
  }

  async generateDynamicPdf(
    data: ExportExcelDataInput,
    clientId,
  ): Promise<void> {
    try {
      const folderPath = `uploads/generated-pdf/${data.decodedToken?.userId}-${moment.utc().format('DDMMYYYYHHMMSS')}`;
      const fileName = (await this.getFileName(data)).fileName;
      if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
      }

      const batchSize = 15000;
      const totalRecords = (await this.getTotalRecordCount(data)) || 0;
      const numBatches = Math.ceil(totalRecords / batchSize);
      const pdfPaths: string[] = [];
      const isBatchNeeded = totalRecords < batchSize ? false : true;
      if (totalRecords > 0) {
        for (let i = 0; i < numBatches; i++) {
          const offset = i * batchSize;
          const pdfPath = await this.generatePdfBuffers(
            data,
            offset,
            batchSize,
            folderPath,
            fileName,
            i,
            isBatchNeeded,
          );
          pdfPaths.push(pdfPath);
        }

        let fileUrl = '';

        if (numBatches > 1) {
          const zipPath = join(folderPath, `${fileName}.zip`);
          await this.createZipFromFiles(pdfPaths, zipPath);
          fileUrl = process.env.UPLOAD_BASE_URL + zipPath.replace(/\\/g, '/');
        } else {
          fileUrl =
            process.env.UPLOAD_BASE_URL + pdfPaths[0].replace(/\\/g, '/');
        }

        this.logger.log(
          'PDF generation complete - sending WebSocket notification.',
        );

        // Notify client via WebSocket with the download URL
        this.exportGateway.notifyClient(clientId, {
          message: 'PDF generation completed',
          downloadUrl: fileUrl,
        });
      } else {
        this.exportGateway.notifyClient(clientId, {
          message: 'No records to download PDF.',
          error: 'ERROR',
        });
      }
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error}`);
      this.exportGateway.notifyClient(clientId, {
        message: 'PDF generation failed. Please try again.',
        error: error.message || error,
      });
    }
  }

  private async generatePdfBuffers(
    data: ExportExcelDataInput,
    offset: number,
    batchSize: number,
    folderPath: string,
    fileName: string,
    batchIndex: number,
    isBatchNeeded: boolean,
  ): Promise<string> {
    try {
      const { timezone } = data;
      const trustScreens = [
        'journal_by_accountId',
        'ledger_by_accountId',
        'trial_balance_by_accountId',
        'deposit_withdrawal_by_accountId',
      ];
      const [pdfTemplateFromDb, pdfStylingFromDb] = await Promise.all([
        this.pdfTemplates.findOne({
          where: {
            screen_name: 'pdf-template',
          },
        }),
        this.pdfTemplates.findOne({
          where: {
            screen_name:
              trustScreens.includes(data?.screen_name) ||
              data?.screen_name === 'reconciliation_trial'
                ? 'pdf-trust-styling'
                : 'pdf-styling',
          },
        }),
      ]);

      let htmlTemplate = pdfTemplateFromDb?.pdf_content || '';
      let additionalStyles = pdfStylingFromDb?.pdf_content;
      let fullHtml = htmlTemplate?.replace(
        '</style>',
        `${additionalStyles}</style>`,
      );
      const screenResponse = await this.getFileName(data);
      let pdfTitle = screenResponse.pdfTitle;
      const estimatedRowHeight = screenResponse.estimatedRowHeight;
      let subTitle = '',
        subTitleForTrial = '',
        isCustomDate = false;
      const customHeaders = this.getCustomHeaders(data);
      const pdfData = await this.fetchBatchData(data, offset, batchSize);
      const dateFmt = 'DD/MM/YYYY';

      if (data?.screen_name !== 'trial_balance_by_accountId') {
        let startDate = pdfData?.filter_dates?.start_date,
          endDate = pdfData?.filter_dates?.end_date;
        if (startDate && endDate) {
          subTitle = `From: ${this.getFormattedDate(startDate, timezone)} To: ${this.getFormattedDate(endDate, timezone)}`;
          isCustomDate = true;
        }
      }

      if (data?.screen_name === 'trial_balance_by_accountId') {
        subTitleForTrial = `${this.getFormattedDate(data?.start_date, timezone)}`;
        isCustomDate = true;
      }

      if (trustScreens.includes(data?.screen_name)) {
        const bankDetails = await this.getBankDetails(data);
        pdfTitle += `${
          bankDetails?.account_name ? ' - ' + bankDetails?.account_name : ''
        }`;
      } else {
        if (data?.screen_name === 'reconciliation') {
          const bankDetails = await this.getBankDetails(data);
          pdfTitle += `${
            bankDetails?.account_name ? ' - ' + bankDetails?.account_name : ''
          }`;
        } else if (data?.screen_name === 'reconciliation_trial') {
          pdfTitle += `${
            pdfData[0]?.account_name ? ' - ' + pdfData[0]?.account_name : ''
          }`;
        }
        pdfData.forEach((element) => {
          // Keys that should be formatted  as dates
          const dateKeys = [
            'project_date',
            'contract_date',
            'created_on',
            'updated_on',
            'claim_date',
            'due_date',
            'payment_date',
            'txn_date',
            'statement_date',
            'report_date',
            'month_end_date',
            'project_added_on_date',
            'start_date',
            'expiry_date',
            'paid_at',
            'received_date',
            'published_on',
            'holiday_date',
          ];

          // Keys that should be formatted as currency
          const currencyKeys = [
            'initial_contract_sum',
            'variation_amount',
            'current_balance',
            'claim_amount',
            'retained_amount',
            'payment_amount',
            'received_amount',
            'spent_amount',
            'bank_statement_balance',
            'adjustments',
            'expected_balance',
            'deposit_withdrawal_balance',
            'account_ledger_balance',
            'monthly_price',
            'yearly_price',
            'subscribed_amount',
            'amount_paid',
          ];

          Object.keys(element).forEach((key) => {
            if (dateKeys.includes(key)) {
              if (element[key]) {
                // Format date fields
                if (
                  ['report_date', 'month_end_date'].includes(key) &&
                  data?.screen_name === 'reconciliation_trial'
                ) {
                  element[key] = moment(new Date(element[key]))
                    .tz(timezone)
                    .format('MM/YYYY');
                } else {
                  element[key] = moment(new Date(element[key]))
                    .tz(timezone)
                    .format(dateFmt);
                }
              } else if (
                [
                  'published_on',
                  data?.screen_name === 'business_profile' ? 'expiry_date' : '',
                ].includes(key)
              ) {
                // Apply 'N/A' if value is missing
                element[key] = 'N/A';
              }
            } else if (currencyKeys.includes(key)) {
              // Format currency fields
              if (['received_amount', 'spent_amount'].includes(key)) {
                element[key] = element[key]
                  ? formatCurrency(element[key] || 0)
                  : '';
              } else {
                element[key] = formatCurrency(element[key] || 0);
              }
            }
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
          startDate = moment.tz(timezone).startOf('month').utc().toDate();
          endDate = moment.tz(timezone).endOf('month').utc().toDate();
        } else if (data?.date_filter === 'Last Month') {
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
        if (startDate && endDate) {
          subTitle = `From: ${this.getFormattedDate(startDate, timezone)} To: ${this.getFormattedDate(endDate, timezone)}`;
          isCustomDate = true;
        }
      }

      Handlebars.registerHelper('generateTable', function (data) {
        if (data.screen_name === 'journal_by_accountId') {
          const showAudit = data.is_audit_view;
          const dateWidth = '10%';
          let accountWidth = '';
          let auditWidth = '';
          let debitWidth = '';
          let creditWidth = '';

          if (showAudit) {
            // If Audit is shown
            accountWidth = '50%';
            auditWidth = '10%';
            debitWidth = '15%';
            creditWidth = '15%';
          } else {
            // If Audit is hidden
            accountWidth = '50%';
            debitWidth = '20%';
            creditWidth = '20%';
          }

          let tableHtml = '<div class="containe_block">';
          let currentHeight = 0;
          let pageIndex = 1;
          // Adjust these as needed
          const maxPageHeight = isCustomDate
            ? pageIndex === 1
              ? 720
              : 850
            : pageIndex === 1
              ? 720
              : 850;
          //   ? 600 //data.firstPage
          //   : 690 //data.remainingPage
          // : pageIndex === 1
          //   ? 690
          //   : 780; // Adjust as needed
          let rowsHtml = '';

          for (const rowData of data.pdfData?.ledger_journals_list || []) {
            // Convert the date
            const journalDate = moment(new Date(rowData.date))
              .tz(timezone) // Change to required timezone
              .format(dateFmt); //new Date(rowData.date).toLocaleDateString();

            // Build a single table chunk
            let journalEntry = `
              <table class="pt_bottom">
                <thead>
                  <tr>
                    <th class="pt_head" style="border-radius: 10px 0px 0px 0px; width: ${dateWidth};">DATE</th>
                    <th class="pt_head" style="width: ${accountWidth};">ACCOUNT</th>
                    ${
                      showAudit
                        ? `<th class="pt_head" style="width: ${auditWidth};">AUDIT ID</th>`
                        : ''
                    }
                    <th class="pt_head" style="width: ${debitWidth};">DEBIT</th>
                    <th class="pt_head" style="border-radius: 0px 10px 0px 0px; width: ${creditWidth};">CREDIT</th>
                  </tr>
                </thead>
                <tbody class="pt_body">
            `;

            let index = 0;
            // Each "account" row
            for (const account of rowData.accounts) {
              const rowClass = index % 2 === 1 ? 'alt_block' : '';
              const dateCell = index === 0 ? journalDate : ''; // date only on first row
              journalEntry += `
                <tr class="${rowClass}">
                  <td style="width: ${dateWidth};">${dateCell}</td>
                  <td style="width: ${accountWidth};">${account.account_name || ''}</td>
                  ${
                    showAudit
                      ? `<td class="pt_head" style="width: ${auditWidth};">${account.audit_id || ''}</td>`
                      : ''
                  }
                  <td class="pt_head" style="width: ${debitWidth};">${account.debit || ''}</td>
                  <td class="pt_head" style="width: ${creditWidth};">${account.credit || ''}</td>
                </tr>
              `;
              index++;
            }

            // Final row (description & totals)
            journalEntry += `
                  <tr class="pt_journal">
                    <td></td>
                    <td>${rowData.journal_description}</td>
                    ${showAudit ? '<td class="pt_head"></td>' : ''}
                    <td class="pt_head">${rowData.total_debit}</td>
                    <td class="pt_head">${rowData.total_credit}</td>
                  </tr>
                </tbody>
              </table>
            `;

            // Estimate row height for pagination
            const estimatedRowHeight =
              60 + rowData.accounts.length * data.estimatedRowHeight;
            // currentHeight += estimatedRowHeight;

            if (currentHeight + estimatedRowHeight > maxPageHeight) {
              // Close previous chunk, start new page
              tableHtml +=
                rowsHtml +
                '</div><div style="page-break-before: always;" class="containe_block">';
              rowsHtml = journalEntry;
              currentHeight = estimatedRowHeight;
              pageIndex++;
            } else {
              rowsHtml += journalEntry;
              currentHeight += estimatedRowHeight;
            }
          }

          // Append final chunk
          if (rowsHtml) {
            tableHtml += rowsHtml;
          }
          tableHtml += '</div>';

          return new Handlebars.SafeString(tableHtml);
        } else if (data.screen_name === 'ledger_by_accountId') {
          let tableHtml = '';

          function openTable() {
            return `
                  <table>
                    <thead>
                      <tr>
                        <th class="pt_body" style="border-radius: 10px 0px 0px 0px;width:15%">DATE</th>
                        <th class="pt_body" style="width:45%">TRANSACTION</th>
                        <th class="pt_body" style="width:7%">REFERENCE</th>
                        <th class="pt_body" style="width:10%">DEBIT</th>
                        <th class="pt_body" style="width:10%">CREDIT</th>
                        <th class="pt_body" style="border-radius: 0px 10px 0px 0px;width:13%">BALANCE</th>
                      </tr>
                    </thead>
                    <tbody class="pt_body">`;
          }

          function closeTable() {
            return `</tbody></table>`;
          }

          for (const ledger of data.pdfData?.grid_entries || []) {
            tableHtml += `<div class="container_block">`;

            const rowList = [];

            rowList.push({
              date: ledger.account_name,
              transaction: 'Opening Balance',
              reference: '',
              debit: '',
              credit: '',
              balance: ledger.opening_balance || '',
              isOpening: true,
            });

            for (const entry of ledger.entries || []) {
              rowList.push({
                date: entry.journal_date
                  ? moment(new Date(entry.journal_date)).format(dateFmt)
                  : '',
                transaction: entry.journal_description || '',
                reference: entry.journal_number_format || '',
                debit: entry.debit_amount || '',
                credit: entry.credit_amount || '',
                balance: entry.balance_amount || '',
              });
            }

            rowList.push({
              date: '', //ledger.account_name ||
              transaction: `Total ${ledger.account_name || ''}`,
              reference: '',
              debit: ledger.total_debit_amount || '',
              credit: ledger.total_credit_amount || '',
              balance: '',
              isTotals: true,
            });

            rowList.push({
              date: '',
              transaction: 'Closing Balance', //'Net Movement'
              reference: '',
              debit: ledger.debit_net_movement || '',
              credit: ledger.credit_net_movement || '',
              balance: '',
              isNet: true,
            });

            tableHtml += openTable();

            let rowIndex = 0;

            for (const row of rowList) {
              let rowClass = '';
              if (!row.isOpening && !row.isTotals && !row.isNet) {
                rowClass += rowIndex % 2 === 0 ? ' alt_block' : '';
                rowIndex++;
              }

              if (row.isOpening || row.isTotals) rowClass += ' pt_journal';
              if (row.isNet) rowClass += ' pt_journal net_movement_block';

              const leftRadius = row.isNet
                ? 'border-radius: 0px 0px 0px 10px;'
                : '';
              const rightRadius = row.isNet
                ? 'border-radius: 0px 0px 10px 0px;'
                : '';

              tableHtml += `
                    <tr class="${rowClass.trim()}">
                      <td style="width: 15%; ${leftRadius}">${row.date}</td>
                      <td style="width: 45%;">${row.transaction}</td>
                      <td style="width: 7%; text-align: center;">${row.reference}</td>
                      <td style="width: 10%;" class="flow_wrap">${row.debit}</td>
                      <td style="width: 10%;" class="flow_wrap">${row.credit}</td>
                      <td style="width: 13%; ${rightRadius}" class="flow_wrap">${row.balance}</td>
                    </tr>`;
            }

            tableHtml += closeTable();
            tableHtml += '</div>';
          }
          return new Handlebars.SafeString(tableHtml);
        } else if (data.screen_name === 'trial_balance_by_accountId') {
          let tableHtml = '';
          let pageIndex = 1;
          let currentHeight = 0;

          let maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

          function openTable() {
            return `
                  <table>
                      <thead>
                          <tr>
                              <th class="pt_body" style="border-radius: 10px 0px 0px 0px;">ACCOUNT</th>
                              <th class="pt_body" style="border-radius: 0px 10px 0px 0px;text-align: right;">CLOSING BALANCE</th>
                          </tr>
                      </thead>
                      <tbody class="pt_body">
              `;
          }

          function closeTable() {
            return `
                      </tbody>
                  </table>
              `;
          }

          // Open the first container
          tableHtml += `<div style="display: flex; justify-content: center;">
                          <div class="containe_block" style="width: 80%;">`;

          let isTableOpen = false;
          let rowBuffer = openTable(); // Start table
          let index = 0;
          for (const entry of data.pdfData.trial_balance_list || []) {
            const account_name = entry.account_name || '';
            const closing_balance = entry.closing_balance || '';

            // Estimate row height (adjust if needed)
            const estimatedRowHeight = data.estimatedRowHeight;

            // If there's no open table yet, open one
            if (!isTableOpen) {
              rowBuffer = openTable();
              isTableOpen = true;
            }

            // Check if adding this row exceeds the page
            if (currentHeight + estimatedRowHeight > maxPageHeight) {
              // Close current table
              rowBuffer += closeTable();
              tableHtml += rowBuffer;

              // Start a new page
              tableHtml += `</div></div><div style="page-break-before: always; display: flex; justify-content: center;">
                                  <div class="containe_block" style="width: 80%;">`;

              // Reset counters
              currentHeight = estimatedRowHeight;
              pageIndex++;
              maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

              // Open a new table
              rowBuffer = openTable();
            } else {
              currentHeight += estimatedRowHeight;
            }

            const rowClass = index % 2 === 1 ? 'alt_block' : '';

            // Add row to buffer
            rowBuffer += `
                  <tr class="${rowClass}">
                      <td style="width: 50%;">${account_name}</td>
                      <td style="width: 50%;text-align: right;">${closing_balance}</td>
                  </tr>
              `;
            index++;
          }

          // Totals row
          const totalClosingBalance =
            data.pdfData.total_closing_balance || '$0.00';

          rowBuffer += `
              <tr class="pt_journal">
                  <td style="width: 50%;">Balance</td>
                  <td style="width: 50%;text-align: right;">${totalClosingBalance}</td>
              </tr>
          `;

          // Close the table if it's open
          if (isTableOpen) {
            rowBuffer += closeTable();
            tableHtml += rowBuffer;
          }

          // Close the main container
          tableHtml += `</div></div>`;

          return new Handlebars.SafeString(tableHtml);
        } else if (data.screen_name === 'deposit_withdrawal_by_accountId') {
          let tableHtml = '';
          let pageIndex = 1;
          let currentHeight = 0;
          let maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

          function openTable() {
            return `
                  <table>
                      <thead>
                          <tr>
                              <th class="pt_head" style="border-radius: 10px 0px 0px 0px;">DATE</th>
                              <th class="pt_head">TYPE</th>
                              <th class="pt_head">TRANSACTION</th>
                              <th class="pt_head">ACCOUNT NAME</th>
                              <th class="pt_head">ACCOUNT NUMBER</th>
                              <th class="pt_head">BSB NUMBER</th>
                              <th class="pt_head">REFERENCE</th>
                              <th class="pt_head">AMOUNT</th>
                              <th class="pt_head" style="border-radius: 0px 10px 0px 0px;">BALANCE</th>
                          </tr>
                      </thead>
                      <tbody class="pt_body">
              `;
          }

          function closeTable() {
            return `
                      </tbody>
                  </table>
              `;
          }

          tableHtml += `<div class="containe_block">`;

          let isTableOpen = false;
          let rowBuffer = openTable(); // Start table

          // Extract relevant values
          const openingBalance = data.pdfData.opening_balance || '';
          const closingBalance = data.pdfData.closing_balance || '';

          // Opening Balance Row
          let estimatedRowHeight = data.estimatedRowHeight;

          if (!isTableOpen) {
            rowBuffer = openTable();
            isTableOpen = true;
          }

          if (currentHeight + estimatedRowHeight > maxPageHeight) {
            rowBuffer += closeTable();
            tableHtml += rowBuffer;

            // Start a new page
            tableHtml += `</div><div style="page-break-before: always;" class="containe_block">`;

            currentHeight = estimatedRowHeight;
            pageIndex++;
            maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

            rowBuffer = openTable();
          } else {
            currentHeight += estimatedRowHeight;
          }

          rowBuffer += `
              <tr class="pt_journal">
                  <td style="width: 10%;" class="pt_journal">${moment(new Date(data.pdfData.opening_date)).format(dateFmt)}</td>
                  <td style="width: 5%;"></td>
                  <td style="width: 50%;">Opening Balance</td>
                  <td style="width: 10%;"></td>
                  <td style="width: 15%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;" class="flow_wrap pt_journal">${openingBalance}</td>
              </tr>
          `;

          // Insert each transaction entry
          for (const entry of data.pdfData.grid_entries || []) {
            const dateStr = entry.journal_date
              ? moment(new Date(entry.journal_date)).format(dateFmt)
              : '';
            const type = entry.type || '';
            const transaction = entry.journal_description || '';
            const accountName = entry.account_name || '';
            const accountNumber = entry.account_number || '';
            const bsbNumber = entry.bsb_number || '';
            const reference = entry.journal_number || '';
            const amount = entry.amount || '';
            const balance = entry.balance_amount || '';

            estimatedRowHeight = data.estimatedRowHeight;

            if (currentHeight + estimatedRowHeight > maxPageHeight) {
              rowBuffer += closeTable();
              tableHtml += rowBuffer;

              // Start a new page
              tableHtml += `</div><div style="page-break-before: always;" class="containe_block">`;

              currentHeight = estimatedRowHeight;
              pageIndex++;
              maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

              rowBuffer = openTable();
            } else {
              currentHeight += estimatedRowHeight;
            }

            rowBuffer += `
                  <tr class="alt_block">
                      <td style="width: 10%;">${dateStr}</td>
                      <td style="width: 5%;">${type}</td>
                      <td style="width: 50%;">${transaction}</td>
                      <td style="width: 10%; text-align: left;" class="flow_wrap">${accountName}</td>
                      <td style="width: 15%; text-align: left;" class="flow_wrap">${accountNumber}</td>
                      <td style="width: 10%; text-align: left;" class="flow_wrap">${bsbNumber}</td>
                      <td style="width: 10%; text-align: center;" class="flow_wrap">#${reference}</td>
                      <td style="width: 10%;" class="flow_wrap">${amount}</td>
                      <td style="width: 10%;" class="flow_wrap pt_journal">${balance}</td>
                  </tr>
              `;
          }

          // Closing Balance Row
          estimatedRowHeight = data.estimatedRowHeight;

          if (currentHeight + estimatedRowHeight > maxPageHeight) {
            rowBuffer += closeTable();
            tableHtml += rowBuffer;

            // Start a new page
            tableHtml += `</div><div style="page-break-before: always;" class="containe_block">`;

            currentHeight = estimatedRowHeight;
            pageIndex++;
            maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

            rowBuffer = openTable();
          } else {
            currentHeight += estimatedRowHeight;
          }

          rowBuffer += `
              <tr class="pt_journal">
                  <td style="width: 10%;" class="pt_journal">${moment(new Date(data.pdfData.closing_date)).tz(timezone).format(dateFmt)}</td>
                  <td style="width: 5%;"></td>
                  <td style="width: 50%;">Closing Balance</td>
                  <td style="width: 10%;"></td>
                  <td style="width: 15%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;"></td>
                  <td style="width: 10%;" class="flow_wrap pt_journal">${closingBalance}</td>
              </tr>
          `;

          // Close table if open
          if (isTableOpen) {
            rowBuffer += closeTable();
            tableHtml += rowBuffer;
          }

          tableHtml += `</div>`;

          return new Handlebars.SafeString(tableHtml);
        } else if (data.screen_name === 'reconciliation_trial') {
          let tableHtml = '';
          let pageIndex = 1;
          let currentHeight = 0;

          let maxPageHeight = pageIndex === 1 ? 540 : 600;

          function openTable() {
            return `
                  <table>
                      <thead>
                          <tr>
                              <th class="pt_body" style="border-radius: 10px 0px 0px 0px;">ACCOUNT</th>
                              <th class="pt_body" style="border-radius: 0px 10px 0px 0px;text-align: right;">CLOSING BALANCE</th>
                          </tr>
                      </thead>
                      <tbody class="pt_body">
              `;
          }

          function closeTable() {
            return `</tbody></table>`;
          }
          // <div style="max-width: 600px;margin: 30px auto;background-color: #ffffff;padding: 30px;border: 1px solid #ccc;border-radius: 10px;box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);">
          tableHtml += `<div style="max-width: 600px;margin: 30px auto;background-color: #ffffff;">
                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Account</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.account_name}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Created</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.report_date}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Month end</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.month_end_date}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Bank statement balance</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.bank_statement_balance}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Adjustments</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.adjustments}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Adjustments comments</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.adjustment_comment}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Expected balance</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.expected_balance}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Deposit and Withdrawal Balance</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.deposit_withdrawal_balance}" readonly/>
                          </div>

                          <div style="margin-bottom: 16px">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Trust account ledger balance</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.account_ledger_balance}" readonly/>
                          </div>

                          <div style="margin-bottom: 0">
                            <label style="display: block;font-size: 14px;margin-bottom: 8px;font-weight: 600;">Reconcile status</label>
                            <input style="width: 100%;padding: 10px 12px;font-size: 14px;border: 1px solid #ccc;border-radius: 4px;box-sizing: border-box;" value="${data.pdfData[0]?.reconcile_status}" readonly/>
                          </div>
                        </div>
                        </br>`;

          if (
            data.pdfData[0].trial_balance_list &&
            data.pdfData[0].trial_balance_list?.length > 0
          ) {
            tableHtml += `<div style="page-break-before: always;max-width: 600px;margin: 30px auto;background-color: #ffffff;">
                            <div style="font-size: 16px; font-weight: bold; margin-bottom: 12px">Trial Balance Statement</div>`;

            // Open the first container
            tableHtml += `<div style="display: flex; justify-content: center;">
                           <div class="containe_block" style="width: 80%;">`;

            let isTableOpen = false;
            let rowBuffer = openTable(); // Start table
            let index = 0;
            for (const entry of data.pdfData[0].trial_balance_list || []) {
              const account_name = entry.account_name || '';
              const closing_balance = entry.closing_balance || '';

              // Estimate row height (adjust if needed)
              const estimatedRowHeight = data.estimatedRowHeight;

              // If there's no open table yet, open one
              if (!isTableOpen) {
                rowBuffer = openTable();
                isTableOpen = true;
              }

              // Check if adding this row exceeds the page
              if (currentHeight + estimatedRowHeight > maxPageHeight) {
                // Close current table
                rowBuffer += closeTable();
                tableHtml += rowBuffer;

                // Start a new page
                tableHtml += `</div></div><div style="page-break-before: always; display: flex; justify-content: center;">
                                   <div class="containe_block" style="width: 80%;">`;

                // Reset counters
                currentHeight = estimatedRowHeight;
                pageIndex++;
                maxPageHeight = pageIndex === 1 ? 540 : 600; // data.firstPage : data.remainingPage; //210 : 270; // Adjust as needed

                // Open a new table
                rowBuffer = openTable();
              } else {
                currentHeight += estimatedRowHeight;
              }

              const rowClass = index % 2 === 1 ? 'alt_block' : '';

              // Add row to buffer
              rowBuffer += `
                   <tr class="${rowClass}">
                       <td style="width: 50%;">${account_name}</td>
                       <td style="width: 50%;text-align: right;">${closing_balance}</td>
                   </tr>
               `;
              index++;
            }

            // Totals row
            const totalClosingBalance =
              data.pdfData.total_closing_balance || '$0.00';

            rowBuffer += `
               <tr class="pt_journal">
                   <td style="width: 50%;">Balance</td>
                   <td style="width: 50%;text-align: right;">${totalClosingBalance}</td>
               </tr>
           `;

            // Close the table if it's open
            if (isTableOpen) {
              rowBuffer += closeTable();
              tableHtml += rowBuffer;
            }

            // Close the main container
            tableHtml += `</div></div></div>`;
          }
          return new Handlebars.SafeString(tableHtml);
        } else {
          let tableHtml = '';
          let currentHeight = 0;
          let pageIndex = 1;
          const maxPageHeight = isCustomDate
            ? pageIndex === 1
              ? 270
              : 360
            : pageIndex === 1
              ? 300
              : 390; // Adjust as needed

          let rowsHtml = '';

          for (const rowData of data.pdfData) {
            let rowHtml = '<tr style="text-align: left;">';
            for (const header of data.customHeaders) {
              let cellValue = rowData[header.key];
              if (header.key === 'descriptions') {
                rowHtml += `<td><pre>${cellValue}</pre></td>`;
              } else if (
                data.screen_name === 'billing_history' &&
                header.key === 'status'
              ) {
                rowHtml += `<td style="text-transform: capitalize;">${cellValue}</td>`;
              } else {
                rowHtml += `<td>${cellValue}</td>`;
              }
            }
            rowHtml += '</tr>';

            let estimatedRowHeight = data.estimatedRowHeight; // Adjust as needed
            currentHeight += estimatedRowHeight;

            if (currentHeight > maxPageHeight) {
              tableHtml += `
                <table>
                  <thead>
                    <tr>
                      ${data.customHeaders.map((header) => `<th>${header.header}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
                <div style="page-break-before: always;"></div>
              `;
              rowsHtml = rowHtml;
              currentHeight = estimatedRowHeight;
              pageIndex++;
            } else {
              rowsHtml += rowHtml;
            }
          }

          // Append last table
          if (rowsHtml) {
            tableHtml += `
              <table>
                <thead>
                  <tr>
                    ${data.customHeaders.map((header) => `<th>${header.header}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            `;
          }
          return new Handlebars.SafeString(tableHtml);
        }
      });

      const templateCompiler = Handlebars.compile(fullHtml);
      const htmlOutput = templateCompiler({
        paytradeLogo: paytradeLogo,
        pdfTitle,
        subTitle,
        subTitleForTrial,
        data: {
          customHeaders,
          pdfData,
          is_audit_view: data.is_audit_view || false,
          screen_name: data.screen_name,
          estimatedRowHeight,
        },
      });

      const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';
      const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        headless: true,
        protocolTimeout: 900000,
      });

      const page = await browser.newPage();
      await page.setContent(htmlOutput, { waitUntil: 'load' });
      if (additionalStyles) {
        await page.addStyleTag({ content: additionalStyles });
      }
      page.on('console', (msg) => this.logger.log(`BROWSER LOG: ${msg.text()}`));

      await page.evaluate(() => {
        setTimeout(() => {
          const PAGE_HEIGHT = 1100;
          const MARGIN_TOP = 20;
          const MARGIN_BOTTOM = 20;
          const HEADER_HEIGHT = 140;
          const maxPageHeight =
            PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - HEADER_HEIGHT;

          let currentPageRemainingHeight = maxPageHeight;

          const blocks = document.querySelectorAll('.container_block');

          blocks?.forEach((block) => {
            const el = block as HTMLElement;
            const blockHeight = el.getBoundingClientRect().height;

            el.style.pageBreakBefore = '';
            el.style.breakBefore = '';

            // If block is taller than a page, let it flow (don't break)
            if (blockHeight > maxPageHeight) {
              currentPageRemainingHeight = 0;
              return;
            }

            // Insert break if not enough space on current page
            if (currentPageRemainingHeight < blockHeight) {
              el.style.pageBreakBefore = 'always';
              el.style.breakBefore = 'page';
              currentPageRemainingHeight = maxPageHeight - blockHeight;
            } else {
              currentPageRemainingHeight -= blockHeight;
            }
          });
        }, 0);
      });

      const pdfPath = isBatchNeeded
        ? join(folderPath, `${fileName}_${batchIndex + 1}.pdf`)
        : join(folderPath, `${fileName}.pdf`);
      const pdfStream = await page.createPDFStream({
        format: 'A4',
        landscape:
          trustScreens.includes(data?.screen_name) ||
          data?.screen_name === 'reconciliation_trial'
            ? false
            : true,
        displayHeaderFooter: true,
        printBackground: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="width: 100%; font-size:10px; text-align:center;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>`,
        margin: {
          top: '20px',
          left: '20px',
          bottom: '20px',
          right: '20px',
        },
        timeout: 900000,
      });
      const writeStream = fs.createWriteStream(pdfPath);
      await pipeline(pdfStream, writeStream);

      this.logger.log(`PDF batch ${batchIndex + 1} saved: ${pdfPath}`);
      await browser.close();
      return pdfPath;
    } catch (error) {
      this.logger.error(`Error generating PDF batch ${batchIndex + 1}: ${error}`);
      throw error;
    }
  }

  private async createZipFromFiles(
    filePaths: string[],
    zipFilePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
        return reject(new Error('No valid files provided for zipping.'));
      }

      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        this.logger.error(`Archiving error: ${err}`);
        reject(err);
      });

      archive.pipe(output);

      filePaths.forEach((filePath, index) => {
        if (
          !filePath ||
          typeof filePath !== 'string' ||
          !fs.existsSync(filePath)
        ) {
          this.logger.warn(`Skipping invalid file at index ${index}: ${filePath}`);
          return;
        }
        archive.file(filePath, { name: path.basename(filePath) });
      });

      archive.finalize();

      output.on('close', async () => {
        this.logger.log(
          `ZIP file created: ${zipFilePath} (${archive.pointer()} bytes)`,
        );

        //  Delete the original PDF files after zipping
        for (const filePath of filePaths) {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              this.logger.log(`Deleted file: ${filePath}`);
            } catch (err) {
              this.logger.error(`Error deleting file ${filePath}: ${err}`);
            }
          }
        }

        resolve();
      });

      output.on('error', reject);
    });
  }

  private async createZipBuffer(
    buffers: Buffer[],
    fileName: string,
    fileExtension: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const zipStream = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(zipStream);

      // Add each buffer to the archive
      buffers.forEach((buffer, index) => {
        archive.append(buffer, {
          name: `${fileName}_${index + 1}${fileExtension}`,
        });
      });

      archive.finalize();

      // Collect the zip buffer
      const zipChunks: Buffer[] = [];
      zipStream.on('data', (chunk) => zipChunks.push(chunk));
      zipStream.on('end', () => resolve(Buffer.concat(zipChunks)));
      zipStream.on('error', reject);
    });
  }

  private addHeadersToWorksheet(
    screen_name,
    worksheet: ExcelJS.Worksheet,
    customHeaders: Array<{ header: string; key: string }>,
    data?: ExportExcelDataInput,
  ): void {
    const headers = customHeaders.map(({ header }) => header);

    const headerRow = worksheet.addRow(headers);

    // Apply styling to headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      // cell.border = {
      //   top: { style: 'thin' },
      //   left: { style: 'thin' },
      //   bottom: { style: 'thin' },
      //   right: { style: 'thin' },
      // };
    });

    // worksheet.columns = customHeaders.map(() => ({ width: 20 }));
    // Assign custom column widths
    switch (screen_name) {
      case 'project':
        {
          worksheet.columns = [
            { width: 30 }, // for project_name
            { width: 15 }, // for project_date
            { width: 40 }, // for site_address
            { width: 20 }, // for project_role
            { width: 15 }, // for compliance
            { width: 20 }, // for number_of_units
            { width: 15 }, // for pta_eligibility
            { width: 15 }, // for rta_eligibility
          ];
        }
        break;
      case 'contract':
        {
          worksheet.columns = [
            { width: 11 }, // for contract_date
            { width: 30 }, // for project_name
            { width: 30 }, // for contract_name
            { width: 30 }, // for buyer_name
            { width: 30 }, // for seller_name
            { width: 20 }, // for initial_contract_sum
            { width: 20 }, // for variation_amount
          ];
        }
        break;
      case 'client_supplier':
        {
          worksheet.columns = [
            { width: 30 }, // for client_supplier_name
            { width: 30 }, // for business_name
            { width: 20 }, // for client_supplier_type
            { width: 60 }, // for client_supplier_address
            { width: 20 }, // for claim_count
            { width: 20 }, // for contract_count
            { width: 20 }, // for client_supplier_status
          ];
        }
        break;
      case 'notices':
        {
          if (data?.delegated_qbcc) {
            worksheet.columns = [
              { width: 30 }, // for notice_date
              { width: 30 }, // for company_name
              { width: 30 }, // for project_name
              { width: 30 }, // for account_name
              { width: 30 }, // for bank_account_type
              { width: 50 }, // for notice_type
              { width: 40 }, // for notice_source
              { width: 20 }, // for status
            ];
          } else {
            worksheet.columns = [
              { width: 30 }, // for notice_date
              { width: 30 }, // for project_name
              { width: 30 }, // for account_name
              { width: 30 }, // for bank_account_type
              { width: 50 }, // for notice_type
              { width: 40 }, // for notice_source
              { width: 20 }, // for status
            ];
          }
        }
        break;
      case 'bank_account':
        {
          worksheet.columns = [
            { width: 20 }, // for bank_account_id
            { width: 30 }, // for account_name
            { width: 30 }, // for account_type
            { width: 15 }, // for projects_count
            { width: 20 }, // for created_on
            { width: 30 }, // for current_balance
            { width: 20 }, // for updated_on
            { width: 15 }, // for last_updated_type
            { width: 20 }, // for status
          ];
        }
        break;
      case 'payment_claims':
        {
          worksheet.columns = [
            { width: 15 }, // for claim_date
            { width: 15 }, // for cash_retention_type
            { width: 20 }, // for claim_type
            { width: 20 }, // for client_supplier_name
            { width: 30 }, // for project_name
            { width: 20 }, // for contract_name
            { width: 15 }, // for due_date
            { width: 30 }, // for claim_amount
            { width: 25 }, // for status
          ];
        }
        break;
      case 'retention':
        {
          worksheet.columns = [
            { width: 15 }, // for retention_list_id
            { width: 30 }, // for project_name
            { width: 20 }, // for contract_name
            { width: 20 }, // for claim_type
            { width: 30 }, // for Retention_Trust_Account
            { width: 20 }, // for Retained_Amount
            { width: 20 }, // for Beneficiary
            { width: 20 }, // for status
          ];
        }
        break;
      case 'payment':
        {
          worksheet.columns = [
            { width: 15 }, // for payment_date
            { width: 30 }, // for payment_type
            { width: 30 }, // for project_name
            { width: 25 }, // for contract_name
            { width: 30 }, // for payment_from_account_name
            { width: 30 }, // for payment_to_account_name
            { width: 20 }, // for payment_amount
            { width: 25 }, // for status
          ];
        }
        break;
      case 'sub_payment':
        {
          const ColumnArr = [
            { width: 20 }, // for payment_id
            { width: 20 }, // for payment_type
            { width: 20 }, // for payment_amount
            { width: 30 }, // for payment_from_account_name
            { width: 30 }, // for payment_to_account_name
            { width: 20 }, // for payment_to_account_number
            { width: 20 }, // for payment_to_account_bsb_number
          ];
          if (!data?.is_confirmed) {
            ColumnArr?.push({ width: 20 }); // for status);
          }
          worksheet.columns = ColumnArr;
        }
        break;
      case 'activity_log':
        {
          worksheet.columns = [
            { width: 40 }, // for event_date
            { width: 35 }, // for user
            { width: 45 }, // for event_text
          ];
        }
        break;
      case 'transaction':
        {
          worksheet.columns = [
            { width: 20 }, // for txn_date
            { width: 30 }, // for description
            { width: 20 }, // for spent_amount
            { width: 20 }, // for received_amount
            { width: 20 }, // for matched_to
            { width: 20 }, // for payment id
            { width: 20 }, // for status
            // { width: 20 }, // for unique_txn_id
          ];
        }
        break;
      case 'bank_statement':
        {
          worksheet.columns = [
            { width: 20 }, // for statement_date
            { width: 20 }, // for created_on
            { width: 40 }, // for bank_statement_name
          ];
        }
        break;
      case 'reconciliation':
        {
          worksheet.columns = [
            { width: 20 }, // for report_date
            { width: 20 }, // for month_end_date
            { width: 25 }, // for account_name
            { width: 25 }, // for bank_statement_balance
            { width: 20 }, // for adjustments
            { width: 25 }, // for adjustment_comment
            { width: 20 }, // for expected_balance
            { width: 20 }, // for deposit_withdrawal_balance
            { width: 20 }, // for account_ledger_balance
            { width: 20 }, // for reconcile_status
          ];
        }
        break;
      case 'compliance':
        {
          worksheet.columns = [
            { width: 30 }, // for project_name
            { width: 20 }, // for project_added_on_date
            { width: 40 }, // for site_address
            { width: 20 }, // for role
            { width: 20 }, // for pta_compliance
            { width: 20 }, // for rta_compliance
          ];
        }
        break;
      case 'user':
        {
          worksheet.columns = [
            { width: 20 }, // for id
            { width: 20 }, // for first_name
            { width: 20 }, // for last_name
            { width: 30 }, // for email_id
            { width: 20 }, // for user_role
            { width: 20 }, // for position_title
            { width: 20 }, // for user_phone_no
            { width: 20 }, // for new_user
            { width: 20 }, // for user_status
          ];
        }
        break;
      case 'business_profile':
        {
          worksheet.columns = [
            { width: 20 }, // for company_id
            { width: 20 }, // for entity_type
            { width: 20 }, // for company_name
            { width: 25 }, // for legal_company_name
            { width: 20 }, // for expiry_date
            { width: 20 }, // for plan_name
            { width: 20 }, // for is_admin_blocked
          ];
        }
        break;
      case 'subscription_plan':
        {
          worksheet.columns = [
            { width: 20 }, // for plan_name
            { width: 20 }, // for plan_type
            { width: 20 }, // for monthly_price
            { width: 20 }, // for yearly_price
            { width: 35 }, // for description
            { width: 20 }, // for trial_period
            { width: 20 }, // for plan_status
            { width: 60 }, // for plan_items
          ];
        }
        break;
      case 'subscription_item':
        {
          worksheet.columns = [
            { width: 35 }, // for item_name
            { width: 35 }, // for description
            { width: 10 }, // for item_status
          ];
        }
        break;
      case 'subscription_user':
        {
          worksheet.columns = [
            { width: 30 }, // for company_name
            { width: 25 }, // for plan_name
            { width: 25 }, // for subscribed_amount
            { width: 20 }, // for start_date
            { width: 20 }, // for expiry_date
            { width: 20 }, // for bill_cycle
            { width: 20 }, // for subscription_status
          ];
        }
        break;
      case 'billing_history':
        {
          worksheet.columns = [
            { width: 20 }, // for paid_at
            { width: 25 }, // for invoice_number
            { width: 25 }, // for billing_period
            { width: 25 }, // for payment_method
            { width: 15 }, // for amount_paid
            { width: 15 }, // for status
          ];
        }
        break;
      case 'journals':
        {
          worksheet.columns = [
            { width: 25 }, // for company_name
            { width: 40 }, // for account_name
            { width: 30 }, // for account_type
            { width: 15 }, // for status
            { width: 15 }, // for balance_check
          ];
        }
        break;
      case 'delegation':
        {
          worksheet.columns = [
            { width: 30 }, // for company_name
            { width: 30 }, // for account_name
            { width: 30 }, // for account_type
            { width: 20 }, // for delegation
          ];
        }
        break;
      case 'contact':
        {
          worksheet.columns = [
            { width: 20 }, // for name
            { width: 25 }, // for email
            { width: 20 }, // for status
            { width: 30 }, // for message
            { width: 20 }, // for received_date
          ];
        }
        break;
      case 'content_page':
        {
          worksheet.columns = [
            { width: 40 }, // for heading
            { width: 60 }, // for descriptions
            { width: 20 }, // for updated_on
          ];
        }
        break;
      case 'content_faq':
        {
          worksheet.columns = [
            { width: 35 }, // for category
            { width: 40 }, // for question
            { width: 40 }, // for answer
            { width: 20 }, // for faq_status
          ];
        }
        break;
      case 'content_email_template':
        {
          worksheet.columns = [
            { width: 20 }, // for category
            { width: 60 }, // for email_subject
            { width: 20 }, // for updated_on
          ];
        }
        break;
      case 'blog':
        {
          worksheet.columns = [
            { width: 20 }, // for category
            { width: 30 }, // for title
            { width: 20 }, // for authorName
            { width: 20 }, // for created_on
            { width: 20 }, // for published_on
            { width: 20 }, // for blog_status
          ];
        }
        break;
      case 'resource':
        {
          worksheet.columns = [
            { width: 20 }, // for category
            { width: 30 }, // for title
            { width: 20 }, // for authorName
            { width: 20 }, // for created_on
            { width: 20 }, // for published_on
            { width: 20 }, // for blog_status
          ];
        }
        break;
      case 'admin_user':
        {
          worksheet.columns = [
            { width: 20 }, // for first_name
            { width: 20 }, // for last_name
            { width: 40 }, // for email_id
            { width: 20 }, // for admin_role
            { width: 15 }, // for admin_status
            { width: 15 }, // for created_on
          ];
        }
        break;
      case 'admin_group':
        {
          worksheet.columns = [
            { width: 20 }, // for group_name
            { width: 20 }, // for group_description
            { width: 20 }, // for group_status
            { width: 20 }, // for created_on
          ];
        }
        break;
      case 'variation':
        {
          worksheet.columns = [
            { width: 20 }, // for created_on
            { width: 15 }, // for variation_id
            { width: 20 }, // for project_name
            { width: 25 }, // for contract_name
            { width: 25 }, // for variation_amount
            { width: 20 }, // for variation_status
          ];
        }
        break;
      case 'client_supplier_by_projectId':
        {
          worksheet.columns = [
            { width: 20 }, // for client_supplier_name
            { width: 30 }, // for business_name
            { width: 15 }, // for client_supplier_type
            { width: 30 }, // for client_supplier_address
            { width: 15 }, // for contract_count
            { width: 15 }, // for client_supplier_status
          ];
        }
        break;
      case 'interest_charges':
        {
          worksheet.columns = [
            { width: 20 }, // for payment_type
            { width: 20 }, // for payment_date
            { width: 20 }, // for payment_amount
            { width: 25 }, // for status
          ];
        }
        break;
      case 'holidays':
        {
          worksheet.columns = [
            { width: 30 }, // for holiday_name
            { width: 20 }, // for holiday_date
            { width: 20 }, // for recurring_every_year
            { width: 25 }, // for status
          ];
        }
        break;
      case 'coupons':
        {
          worksheet.columns = [
            { width: 30 }, // for coupon_name
            { width: 30 }, // for duration
            { width: 20 }, // for duration_in_months
            { width: 25 }, // for percent_off
            { width: 25 }, // for coupon_status
          ];
        }
        break;
    }
  }

  private addDataToWorksheet(
    worksheet: ExcelJS.Worksheet,
    data: any[],
    customHeaders: Array<{ header: string; key: string }>,
    payload?: ExportExcelDataInput,
  ): void {
    const rows = data.map((item) => {
      return customHeaders.map(({ key }) => {
        if (key === 'project_date' && item[key]) {
          return new Date(item[key]); // Convert date to JavaScript Date object
        }
        return item[key] !== undefined && item[key] !== null ? item[key] : '';
      });
    });

    // Add data rows to worksheet
    rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.addRow(row);

      row.forEach((value, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);

        if (
          [
            'project_date',
            'created_on',
            'updated_on',
            'claim_date',
            'due_date',
            'payment_date',
            'txn_date',
            'statement_date',
            'report_date',
            'month_end_date',
            'project_added_on_date',
            'start_date',
            'expiry_date',
            'paid_at',
            'received_date',
            'published_on',
            'holiday_date',
          ].includes(customHeaders[colIndex].key) &&
          value
        ) {
          // Apply explicit date format to the cell
          cell.value = new Date(value); // Ensure it's treated as a date
          cell.numFmt = 'DD/MM/YYYY'; // Set the desired date format
        }
        if (
          [
            'published_on',
            `${payload?.screen_name === 'business_profile' ? 'expiry_date' : ''}`,
          ]?.includes(customHeaders[colIndex].key) &&
          !value
        ) {
          cell.value = 'N/A';
        }

        if (
          [
            'initial_contract_sum',
            'variation_amount',
            'current_balance',
            'claim_amount',
            'retained_amount',
            'payment_amount',
            'received_amount',
            'spent_amount',
            'bank_statement_balance',
            'adjustments',
            'expected_balance',
            'deposit_withdrawal_balance',
            'account_ledger_balance',
            'monthly_price',
            'yearly_price',
            'subscribed_amount',
            'amount_paid',
          ].includes(customHeaders[colIndex].key) &&
          value
        ) {
          // Check for fields like "total_amount", "price_amount", etc.
          cell.value = parseFloat(value) || 0; // Ensure value is numeric
          cell.numFmt = '"$"#,##0.00'; // Format as dollar currency
        }
      });
    });
  }

  private getCustomHeaders(data: any): Array<{ header: string; key: string }> {
    const { screen_name, delegated_qbcc, timezone } = data;
    let headers = [];
    switch (screen_name) {
      case 'project':
        {
          headers = [
            { key: 'project_name', header: 'Project Name' },
            {
              key: 'project_date',
              header: 'Date Added',
              formatter: (value: any, timezone: string) =>
                value ? this.getFormattedDate(value, timezone) : '',
            },
            { key: 'site_address', header: 'Site Address' },
            { key: 'project_role', header: 'Role' },
            { key: 'compliance', header: 'Compliance' },
            { key: 'number_of_units', header: 'Number of Units' },
            { key: 'pta_eligibility', header: 'PTA Eligibility' },
            { key: 'rta_eligibility', header: 'RTA Eligibility' },
          ];
        }
        break;
      case 'contract':
        {
          headers = [
            { key: 'contract_date', header: 'Date Created' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'buyer_name', header: 'Buyer Name' },
            { key: 'seller_name', header: 'Seller Name' },
            { key: 'initial_contract_sum', header: 'Contract Sum' },
            { key: 'variation_amount', header: 'Agreed Variations' },
          ];
        }
        break;
      case 'client_supplier':
        {
          headers = [
            { key: 'client_supplier_name', header: 'Name' },
            { key: 'business_name', header: 'Business Name (if applicable)' },
            { key: 'client_supplier_type', header: 'Client/Supplier' },
            { key: 'client_supplier_address', header: 'Address' },
            { key: 'claim_count', header: 'Payment Claims' },
            { key: 'contract_count', header: 'Contracts' },
            { key: 'client_supplier_status', header: 'Status' },
          ];
        }
        break;
      case 'notices':
        {
          if (delegated_qbcc) {
            headers = [
              { key: 'notice_date', header: 'Date Generated' },
              { key: 'company_name', header: 'Business Profile' },
              { key: 'project_name', header: 'Project Name' },
              { key: 'account_name', header: 'Account Name' },
              { key: 'bank_account_type', header: 'Account Type' },
              { key: 'notice_type', header: 'Notice Type' },
              { key: 'notice_source', header: 'Notice Source' },
              { key: 'status', header: 'Status' },
            ];
          } else {
            headers = [
              { key: 'notice_date', header: 'Date Generated' },
              { key: 'project_name', header: 'Project Name' },
              { key: 'account_name', header: 'Account Name' },
              { key: 'bank_account_type', header: 'Account Type' },
              { key: 'notice_type', header: 'Notice Type' },
              { key: 'notice_source', header: 'Notice Source' },
              { key: 'status', header: 'Status' },
            ];
          }
        }
        break;
      case 'bank_account':
        {
          headers = [
            { key: 'bank_account_id', header: 'Bank Account ID' },
            { key: 'account_name', header: 'Account Name' },
            { key: 'account_type', header: 'Account Type' },
            { key: 'projects_count', header: 'Projects Count' },
            { key: 'created_on', header: 'Added on Date' },
            { key: 'current_balance', header: 'Current Balance' },
            { key: 'updated_on', header: 'Last Updated' },
            { key: 'last_updated_type', header: 'Updated Type' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'payment_claims':
        {
          headers = [
            { key: 'claim_date', header: 'Received/Sent Date' },
            { key: 'cash_retention_type', header: 'Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'client_supplier_name', header: 'Supplier/Client' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'due_date', header: 'Due Date' },
            { key: 'claim_amount', header: 'Total Claim (Gross of GST)' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'retention':
        {
          headers = [
            { key: 'retention_list_id', header: 'Retention Id' },
            { key: 'project_name', header: 'Project' },
            { key: 'contract_name', header: 'Contract' },
            { key: 'claim_type', header: 'Retention Type' },
            {
              key: 'retention_trust_account_name',
              header: 'Retention Trust Account',
            },
            { key: 'retained_amount', header: 'Retained Amount' },
            { key: 'beneficiary_name', header: 'Beneficiary' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'payment':
        {
          headers = [
            { key: 'payment_date', header: 'Payment Date' },
            { key: 'payment_type', header: 'Payment Type' },
            { key: 'project_name', header: 'Project' },
            { key: 'contract_name', header: 'Contract' },
            {
              key: 'payment_from_account_name',
              header: 'Payment From Account Name',
            },
            {
              key: 'payment_to_account_name',
              header: 'Payment To Account Name',
            },
            { key: 'payment_amount', header: 'Payment Amount' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'sub_payment':
        {
          headers = [
            { key: 'payment_id', header: 'Payment Id' },
            { key: 'payment_type', header: 'Payment Type' },
            { key: 'payment_amount', header: 'Payment Amount' },
            {
              key: 'payment_from_account_name',
              header: 'Payment From Account',
            },
            {
              key: 'payment_to_account_name',
              header: 'Payment To Account Name',
            },
            {
              key: 'payment_to_account_number',
              header: 'Payment To Account Number',
            },
            {
              key: 'payment_to_account_bsb_number',
              header: 'Payment To Account BSB',
            },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'activity_log':
        {
          headers = [
            { key: 'event_date', header: 'Date Changed' },
            { key: 'first_name', header: 'User' },
            {
              key: 'event_text',
              header: 'Event',
            },
          ];
        }
        break;
      case 'transaction':
        {
          headers = [
            { key: 'txn_date', header: 'Txn Date' },
            { key: 'description', header: 'Description' },
            { key: 'spent_amount', header: 'Spent' },
            { key: 'received_amount', header: 'Received' },
            { key: 'matched_to', header: 'Matched to' },
            { key: 'matched_to_payment_id', header: 'Payment ID' },
            { key: 'status', header: 'Status' },
            // { key: 'unique_txn_id', header: 'Txn ID' },
          ];
        }
        break;
      case 'bank_statement':
        {
          headers = [
            { key: 'statement_date', header: 'Statement Date' },
            { key: 'created_on', header: 'Added on Date' },
            { key: 'bank_statement_name', header: 'View' },
          ];
        }
        break;
      case 'reconciliation':
        {
          headers = [
            { key: 'report_date', header: 'Created' },
            { key: 'month_end_date', header: 'Month End' },
            { key: 'account_name', header: 'Bank Account Name' },
            {
              key: 'bank_statement_balance',
              header: 'Bank Statement Balance',
            },
            { key: 'adjustments', header: 'Adjustments' },
            { key: 'adjustment_comment', header: 'Adjustment Comments' },
            { key: 'expected_balance', header: 'Expected Balance' },
            {
              key: 'deposit_withdrawal_balance',
              header: 'Record of Deposit and Withdrawals Balance',
            },
            {
              key: 'account_ledger_balance',
              header: 'Trust Account Ledger Balance',
            },
            { key: 'reconcile_status', header: 'Reconcile Status' },
          ];
        }
        break;
      case 'compliance':
        {
          headers = [
            { key: 'project_name', header: 'Project Name' },
            { key: 'project_added_on_date', header: 'Date Added' },
            { key: 'site_address', header: 'Site Address' },
            { key: 'role', header: 'Role' },
            { key: 'pta_compliance', header: 'PTA Compliance' },
            { key: 'rta_compliance', header: 'RTA Compliance' },
          ];
        }
        break;
      case 'user':
        {
          headers = [
            { key: 'user_id', header: 'User ID' },
            { key: 'first_name', header: 'First Name' },
            { key: 'last_name', header: 'Last Name' },
            { key: 'email_id', header: 'Email ID' },
            { key: 'user_role', header: 'User Role' },
            { key: 'position_title', header: 'Position' },
            { key: 'user_phone_no', header: 'User Phone Number' },
            { key: 'new_user', header: 'New Users' },
            { key: 'user_status', header: 'User Status' },
          ];
        }
        break;
      case 'business_profile':
        {
          headers = [
            { key: 'company_id', header: 'Business ID' },
            { key: 'entity_type', header: 'Trading Type' },
            { key: 'company_name', header: 'Business Name' },
            { key: 'legal_company_name', header: 'Legal Business Name' },
            { key: 'expiry_date', header: 'Subscription Valid' },
            { key: 'plan_name', header: 'Subscription Type' },
            { key: 'is_admin_blocked', header: 'Admin Blocked' },
          ];
        }
        break;
      case 'subscription_plan':
        {
          headers = [
            { key: 'plan_name', header: 'Plan Name' },
            { key: 'plan_type', header: 'Plan Type' },
            { key: 'monthly_price', header: 'Monthly Price' },
            { key: 'yearly_price', header: 'Yearly Price' },
            { key: 'description', header: 'Description' },
            { key: 'trial_period', header: 'Trial Period' },
            { key: 'plan_status', header: 'Status' },
            { key: 'plan_items', header: 'Items' },
          ];
        }
        break;
      case 'subscription_item':
        {
          headers = [
            { key: 'item_name', header: 'Item Name' },
            { key: 'description', header: 'Description' },
            { key: 'item_status', header: 'Status' },
          ];
        }
        break;
      case 'subscription_user':
        {
          headers = [
            { key: 'company_name', header: 'Business Name' },
            { key: 'plan_name', header: 'Subscription Name' },
            { key: 'subscribed_amount', header: 'Subscribed Amount' },
            { key: 'start_date', header: 'Start Date' },
            { key: 'expiry_date', header: 'Expiry Date' },
            { key: 'bill_cycle', header: 'Bill Cycle' },
            { key: 'subscription_status', header: 'Status' },
          ];
        }
        break;
      case 'dummy':
        {
          headers = [
            { key: 'id', header: 'id' },
            { key: 'currency_name', header: 'currency_name' },
            { key: 'short_code', header: 'short_code' },
            { key: 'symbol', header: 'symbol' },
            { key: 'project_role', header: 'project_role' },
            { key: 'client_supplier_type', header: 'client_supplier_type' },
            { key: 'related_entity', header: 'related_entity' },
            { key: 'client_supplier_role', header: 'client_supplier_role' },
            { key: 'contract_type', header: 'contract_type' },
            { key: 'validation', header: 'validation' },
            { key: 'status', header: 'status' },
          ];
        }
        break;
      case 'billing_history':
        {
          headers = [
            { key: 'paid_at', header: 'Date' },
            { key: 'invoice_number', header: 'Invoice or Credit Number' },
            { key: 'billing_period', header: 'Billing Period' },
            { key: 'payment_method', header: 'Payment Method' },
            { key: 'amount_paid', header: 'Amount' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'journals':
        {
          headers = [
            { key: 'company_name', header: 'Business Profile' },
            { key: 'account_name', header: 'Account Name' },
            { key: 'account_type', header: 'Account Type' },
            { key: 'status', header: 'Status' },
            { key: 'balance_check', header: 'Balance Check' },
          ];
        }
        break;
      case 'delegation':
        {
          headers = [
            { key: 'company_name', header: 'Business Name' },
            { key: 'account_name', header: 'Bank Account Name' },
            { key: 'account_type', header: 'Account Type' },
            { key: 'delegation', header: 'Delegation' },
          ];
        }
        break;
      case 'contact':
        {
          headers = [
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'status', header: 'Status' },
            { key: 'message', header: 'Message' },
            { key: 'received_date', header: 'Date Received' },
          ];
        }
        break;
      case 'content_page':
        {
          headers = [
            { key: 'heading', header: 'Page Type' },
            { key: 'descriptions', header: 'Descriptions' },
            { key: 'updated_on', header: 'Last Updated' },
          ];
        }
        break;
      case 'content_faq':
        {
          headers = [
            { key: 'category', header: 'Category' },
            { key: 'question', header: 'Questions' },
            { key: 'answer', header: 'Answers' },
            { key: 'faq_status', header: 'Status' },
          ];
        }
        break;
      case 'content_email_template':
        {
          headers = [
            { key: 'category', header: 'Email Type' },
            { key: 'email_subject', header: 'Subject' },
            { key: 'updated_on', header: 'Last Updated' },
          ];
        }
        break;
      case 'blog':
        {
          headers = [
            { key: 'category', header: 'Category' },
            { key: 'title', header: 'Title' },
            { key: 'authorName', header: 'Author' },
            { key: 'created_on', header: 'Date Posted' },
            { key: 'published_on', header: 'Published Date' },
            { key: 'blog_status', header: 'Status' },
          ];
        }
        break;
      case 'resource':
        {
          headers = [
            { key: 'category', header: 'Category' },
            { key: 'title', header: 'Title' },
            { key: 'authorName', header: 'Author' },
            { key: 'created_on', header: 'Date Posted' },
            { key: 'published_on', header: 'Published Date' },
            { key: 'blog_status', header: 'Status' },
          ];
        }
        break;
      case 'admin_user':
        {
          headers = [
            { key: 'first_name', header: 'First Name' },
            { key: 'last_name', header: 'Last Name' },
            { key: 'email_id', header: 'Email ID' },
            { key: 'admin_role', header: 'Admin Role' },
            { key: 'admin_status', header: 'Admin Status' },
            { key: 'created_on', header: 'Created On' },
          ];
        }
        break;
      case 'admin_group':
        {
          headers = [
            { key: 'group_name', header: 'Group Name' },
            { key: 'group_description', header: 'Group Description' },
            { key: 'group_status', header: 'Group Status' },
            { key: 'created_on', header: 'Created On' },
          ];
        }
        break;
      case 'variation':
        {
          headers = [
            { key: 'created_on', header: 'Date Created' },
            { key: 'variation_id', header: 'Variation ID' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'variation_amount', header: 'Variation Amount' },
            { key: 'variation_status', header: 'Status' },
          ];
        }
        break;
      case 'client_supplier_by_projectId':
        {
          headers = [
            { key: 'client_supplier_name', header: 'Name' },
            { key: 'business_name', header: 'Business Name (if applicable)' },
            { key: 'client_supplier_type', header: 'Client' },
            { key: 'client_supplier_address', header: 'Address' },
            { key: 'contract_count', header: 'Contracts' },
            { key: 'client_supplier_status', header: 'Status' },
          ];
        }
        break;
      case 'interest_charges':
        {
          headers = [
            { key: 'payment_type', header: 'Type' },
            { key: 'payment_date', header: 'Payment Date' },
            { key: 'payment_amount', header: 'Amount' },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case 'holidays':
        {
          headers = [
            { key: 'holiday_name', header: 'Holiday Name' },
            { key: 'holiday_date', header: 'Holiday Date' },
            { key: 'recurring_every_year', header: 'Recurring yearly' },
          ];
        }
        break;
      case 'coupons':
        {
          headers = [
            { key: 'coupon_name', header: 'Coupon Name' },
            { key: 'duration', header: 'Coupon Type' },
            { key: 'duration_in_months', header: 'Duration' },
            { key: 'percent_off', header: 'Discount' },
            { key: 'coupon_status', header: 'Status' },
          ];
        }
        break;
    }
    return headers;
  }

  private async fetchBatchData(
    data: ExportExcelDataInput,
    offset: number,
    limit: number,
  ): Promise<any> {
    let result = [];
    switch (data.screen_name) {
      case 'project':
        {
          const queryBuilder = await this.getProjectList(data);
          const raw_result = await queryBuilder
            .orderBy({ project_date: 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          const formattedData = raw_result?.map((res) => ({
            ...res,
            compliance: '',
          }));
          const resultsWithCompliances = await Promise.all(
            formattedData?.map(async (result) => {
              //Fetching compliance results of a project.
              const complianceResultsOfProject =
                await this.complianceService.fetchComplianceStatusesOfAProject({
                  project_id: result.project_id,
                });
              result.pta_compliance =
                complianceResultsOfProject.data.pta_compliance;
              result.rta_compliance =
                complianceResultsOfProject.data.rta_compliance;
              if (
                complianceResultsOfProject.data.pta_compliance ==
                  'Action required' ||
                complianceResultsOfProject.data.rta_compliance ==
                  'Action required'
              ) {
                result.compliance = 'Action required';
              } else result.compliance = 'Ok';

              return result;
            }),
          );
          result = resultsWithCompliances;
        }
        break;
      case 'contract':
        {
          const queryBuilder = await this.getContractList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'contract.contract_date': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const companyDetails = await this.companyDetails.findOne({
            where: { company_id: data?.company_id },
          });

          result = raw_result.map((res) => ({
            contract_date: res.contract_date,
            project_name: res.projectDetails.project_name,
            contract_name: res.contract_name,
            buyer_name:
              res.clientSuppliersDetails.client_supplier_type === 'Client'
                ? res.clientSuppliersDetails.client_supplier_name
                : companyDetails.company_name,
            seller_name:
              res.clientSuppliersDetails.client_supplier_type === 'Supplier'
                ? res.clientSuppliersDetails.client_supplier_name
                : companyDetails.company_name,
            initial_contract_sum: res.initial_contract_sum,
            variation_amount: res?.variationDetails?.reduce(
              (sum, variation) => {
                if (variation.variation_status === 'Agreed') {
                  return sum + Number(variation.variation_amount);
                }
                return sum;
              },
              0,
            ),
          }));
        }
        break;
      case 'client_supplier':
        {
          const queryBuilder = await this.getClientSupplierList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'cs.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result.map((res) => ({
            client_supplier_name: res.client_supplier_name,
            business_name: res.business_name,
            client_supplier_type: res.client_supplier_type,
            client_supplier_address: res.client_supplier_address,
            client_supplier_status: res.client_supplier_status,
            contract_count: res?.contractDetails?.reduce((sum, contract) => {
              if (
                contract.contract_status === 'In Progress' ||
                contract.contract_status === 'Completed'
              ) {
                return sum + 1;
              }
              return sum;
            }, 0),
            // claim_count:
            //   res?.paymentClaims?.filter(
            //     (obj) => obj?.client_supplier_id === res?.client_supplier_id,
            //   )?.length || '',
            claim_count: res?.paymentClaims?.reduce((sum, claim) => {
              if (claim.status !== 'Draft' && claim.status !== 'Deleted') {
                return sum + 1;
              }
              return sum;
            }, 0),
          }));
        }
        break;
      case 'notices':
        {
          const queryBuilder = await this.getNoticesList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'notices.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            notice_date: res?.notice_date
              ? format(new Date(res?.notice_date), 'dd MMM yyyy h:mm a')
              : null,
            company_name: res?.companyDetails?.company_name,
            project_name: res?.projectDetails?.project_name,
            account_name: res?.accountDetails?.account_name,
            bank_account_type: res?.accountDetails?.account_type,
            notice_type: res?.notice_type,
            notice_source: res?.notice_source,
            status: res?.status,
          }));
        }
        break;
      case 'bank_account':
        {
          const queryBuilder = await this.getBankAccountList(data);
          const raw_result = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            bank_account_id: res?.bank_account_id,
            account_name: res?.account_name,
            account_type: res?.account_type,
            projects_count: res?.project_ids ? res?.project_ids?.length : 0,
            created_on: res?.created_on,
            current_balance: res?.current_balance,
            updated_on: res?.updated_on,
            last_updated_type: res?.last_updated_type,
            status: res?.status,
          }));
        }
        break;
      case 'payment_claims':
        {
          const queryBuilder = await this.getPaymentClaimList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'pc.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            claim_date:
              res?.claim_type == 'Billable'
                ? res?.received_date
                : res?.sent_date,
            cash_retention_type: res?.cash_retention_type,
            claim_type: res?.claim_type,
            client_supplier_name:
              res?.clientSupplierDetails?.client_supplier_name,
            project_name: res?.projectDetails?.project_name,
            contract_name: res?.contractDetails?.contract_name,
            due_date: res?.due_date,
            claim_amount: res?.claim_amount,
            status: res?.list_status,
          }));
        }
        break;
      case 'retention':
        {
          const queryBuilder = await this.getRetentionInPaymentList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'rd.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const retentionInPayments = raw_result?.map((res) => ({
            retention_list_id: res?.retention_id,
            project_name: res?.paymentDetails?.projectDetails?.project_name,
            contract_name: res?.paymentDetails?.contractDetails?.contract_name,
            claim_type: res?.paymentDetails?.paymentClaims?.claim_type,
            retention_trust_account_name:
              res?.paymentDetails?.retentionAccount?.account_name,
            retained_amount: res?.retained_amount,
            status:
              res?.retention_status === 'Deleted'
                ? 'Void'
                : res?.retention_status,
            beneficiary_name: '',
            // Above only need for excel
            contract_id: res?.paymentDetails?.contract_id,
            retention_account_id:
              res?.paymentDetails?.retentionAccount?.bank_account_id,
            client_supplier_name:
              res?.paymentDetails?.contractDetails?.clientSuppliersDetails
                ?.client_supplier_name,
            company_id: res?.company_id,
            beneficiary_type: res?.beneficiary_type,
            client_supplier_id: res?.client_supplier_id,
            cash_retention_type:
              res?.paymentDetails?.paymentClaims?.cash_retention_type,
          }));

          for (const retentionInPayment of retentionInPayments) {
            //Checking the presence of retention trust account name.
            if (!retentionInPayment.retention_trust_account_name) {
              const retentionAccountDetails = await this.contractDetails
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
              retentionInPayment.retention_trust_account_name =
                retentionInPayment.client_supplier_name;
            }

            //Setting the beneficiary_name based upon the beneficiary_type
            const company_details = await this.companyDetails.findOne({
              where: { company_id: retentionInPayment.company_id },
              select: ['company_name'],
            });

            if (
              retentionInPayment.beneficiary_type == 'Current supplier' ||
              retentionInPayment.beneficiary_type == 'Other supplier'
            ) {
              const client_supplier_details =
                await this.clientSuppliersDetails.findOne({
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
              retentionInPayment.beneficiary_name =
                company_details.company_name;
            }

            retentionInPayment.cash_retention_type = 'Retention claim';

            if (
              retentionInPayment.beneficiary_type == 'Current supplier' ||
              retentionInPayment.beneficiary_type == 'Self'
            ) {
              const fetchedPaymentAndClaimDetails = await this.paymentDetails
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
                  ],
                })
                .getRawMany();

              let total_payment_amounts = [];
              const completedPayments =
                await fetchedPaymentAndClaimDetails.filter((payment) =>
                  [
                    'Unconfirmed - Matched',
                    'Paid - Matched',
                    'Received - Matched',
                    'No Match Required',
                    'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                    'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
                    'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                    'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
                    'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
                    'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                    'Paid - Unmatched',
                    'Received - Unmatched',
                  ].includes(payment.payment_status),
                );

              const inCompletePayments =
                await fetchedPaymentAndClaimDetails.filter((payment) =>
                  [
                    'Unconfirmed - Unmatched',
                    'Received - Unmatched',
                    'Paid - Unmatched',
                  ].includes(payment.payment_status),
                );

              for (const payment of inCompletePayments) {
                let payment_amount;
                if (payment.claim_type == 'Receivable') {
                  if (
                    payment.payment_type == 'Pay Less - Full' ||
                    payment.payment_type == 'Pay Less - Part'
                  ) {
                    payment_amount =
                      Number(payment.claim_amount) -
                      Number(payment.payless_amount);
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
                  const preExistingPaylessPayments =
                    total_payment_amounts.filter((pushed_payment) => {
                      if (
                        payment.payment_claim_id ==
                        pushed_payment.payment_claim_id
                      )
                        return pushed_payment;
                    });

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
                total_payment_amounts.push({
                  payment_amount,
                  payment_claim_id: payment.payment_claim_id,
                });
              }

              if (total_payment_amounts.length) {
                const sum_of_total_payment_amounts =
                  total_payment_amounts.reduce(
                    (acc, payment_info) => acc + payment_info.payment_amount,
                    0,
                  );

                retentionInPayment.retained_amount =
                  Number(retentionInPayment.retained_amount) -
                  sum_of_total_payment_amounts;
              }
            }
          }

          result = retentionInPayments;
        }
        break;
      case 'payment':
        {
          const queryBuilder = await this.getPaymentList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'payments.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const modifiedDataList = raw_result?.map((res) => ({
            payment_type: res?.payment_type,
            project_name: res?.projectDetails?.project_name || '',
            contract_name: res?.contractDetails?.contract_name || '',
            payment_from_account_name:
              res?.paymentFromAccount?.account_name || '',
            payment_to_account_name: res?.paymentToAccount?.account_name || '',
            payment_amount: res?.subPayments?.find(
              (ele) => ele?.sub_payment_type === 'Payment',
            )
              ? Math.abs(
                  res?.subPayments?.find(
                    (ele) => ele?.sub_payment_type === 'Payment',
                  )?.amount,
                )
              : 0,
            status: res?.list_status,
            // other fields
            payment_from_account: res?.payment_from_account,
            payment_to_account: res?.payment_to_account,
            cash_retention_type: res?.paymentClaims?.cash_retention_type,
            claim_type: res?.paymentClaims?.claim_type,
            claim_amount: res?.paymentClaims?.claim_amount,
            total_amount: res?.total_amount,
            payless_amount: res?.payless_amount,
            payment_date: res?.payment_date,
            // new added field
          }));

          //Change payment_from_account details based upon the cash_retention_type.
          for (const payment of modifiedDataList) {
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

              payment.payment_from_account_name =
                bankAccountDetailsFromContract.payment_from_account_name;
            }
          }
          result = modifiedDataList;
        }
        break;
      case 'sub_payment':
        {
          const queryBuilder = await this.getSubpaymentList(data);
          const raw_result = await queryBuilder
            // .orderBy({ 'subpayment.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const modifiedDataList = raw_result?.map((res) => ({
            payment_id: res?.payment_id,
            payment_type: res?.paymentDetails?.payment_type,
            payment_amount: Math.abs(res?.amount),
            payment_from_account_name:
              (res?.paymentDetails?.paymentClaims?.claim_type ===
                'Receivable' ||
              ['Overpayment from client', 'Underpayment from client']?.includes(
                res?.paymentDetails?.payment_type,
              )
                ? res?.paymentDetails?.clientSupplierDetails
                    ?.client_supplier_name
                : res?.paymentDetails?.paymentFromAccount?.account_name) || '',
            // res?.paymentDetails?.paymentFromAccount?.account_name,
            payment_to_account_number:
              (['Retention Out', 'Retention In']?.includes(
                res?.sub_payment_type,
              )
                ? res?.paymentDetails?.retentionAccount?.account_number
                : res?.paymentDetails?.paymentToAccount?.account_number) || '',
            payment_to_account_name:
              (['Retention Out', 'Retention In']?.includes(
                res?.sub_payment_type,
              )
                ? res?.paymentDetails?.retentionAccount?.account_name
                : [
                      'Overpayment to supplier',
                      'Underpayment to supplier',
                    ]?.includes(res?.paymentDetails?.payment_type)
                  ? res?.paymentDetails?.clientSupplierDetails
                      ?.client_supplier_name
                  : res?.paymentDetails?.paymentToAccount?.account_name) || '',
            // res?.paymentDetails?.paymentToAccount?.account_number,
            payment_to_account_bsb_number:
              (['Retention Out', 'Retention In']?.includes(
                res?.sub_payment_type,
              )
                ? res?.paymentDetails?.retentionAccount?.bsb_number
                : res?.paymentDetails?.paymentToAccount?.bsb_number) || '',
            status: data?.is_late ? 'Overdue' : 'Not paid',
          }));

          result = modifiedDataList;
        }
        break;
      case 'activity_log':
        {
          const queryBuilder = await this.getActivityLogList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'log.created_on': 'DESC' })
            .offset(offset)
            .limit(limit)
            .getRawMany();
          //Manipulate the event_text based on user_mode.
          for (const result of raw_result) {
            if (result.user_mode == 'Onboarding') {
              //Modify the event_text for 'Onboarding'
              result.event_text = `Onboarding - ${result.event_text}`;
            }

            let user_timezone;
            let timeZone;
            if (result.admin_id) {
              const admin_details = await this.adminDetails.findOne({
                where: { admin_id: result.admin_id },
                select: ['user_timezone', 'first_name', 'last_name'],
              });
              // console.log('admin_details', admin_details);
              user_timezone = admin_details.user_timezone;
              timeZone = await this.getFullTimezoneName(
                result.event_date,
                user_timezone,
              );
            }

            if ((result.from_user || result.to_user) && !result.admin_id) {
              const user_details = await this.userDetails.findOne({
                where: {
                  user_id: result.from_user ? result.from_user : result.to_user,
                },
                select: ['user_timezone'],
              });

              user_timezone = user_details.user_timezone;
              timeZone = await this.getFullTimezoneName(
                result.event_date,
                user_timezone,
              );
            }
            result.timezone = timeZone ? timeZone.split(', ').pop() : null;
            result.event_date = `${format(new Date(result?.event_date), 'dd MMM yyyy h:mm a')} ${
              result?.timezone === 'India Standard Time'
                ? 'Indian Standard Time'
                : result?.timezone || ''
            }`;
          }
          const iterateLogRes: any = await this.iterateLogArray(raw_result); // get dynamic_values
          const finalResponse: any = iterateLogRes?.map((res) => ({
            ...res,
            event_text: res?.event_text
              ? res?.event_text
                  .replace(/<\/?p>/g, '') // removes <p> and </p>
                  .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1') // removes <a> tags and keeps the inner text
              : '',
          }));
          result = finalResponse;
        }
        break;
      case 'transaction':
        {
          const queryBuilder = await this.getTransactionList(data);
          const raw_result = await queryBuilder
            .orderBy({ 't.created_on': 'DESC' })
            .offset(offset)
            .limit(limit)
            .getRawMany();
          const modifiedDataList = raw_result?.map((res) => ({
            description: res?.description,
            status:
              res?.status === 'To Review' ? 'For Review' : res?.status || '',
            received_amount: res?.received_amount
              ? Math.abs(res?.received_amount)
              : '',
            spent_amount: res?.spent_amount ? Math.abs(res?.spent_amount) : '',
            txn_date: res?.txn_date ? new Date(res?.txn_date) : null,
            is_receivable: res?.is_receivable,
            // below field not there but in frontend they show in excel
            unique_txn_id: '',
            matched_to: res?.matched_to || '',
            matched_to_payment_id: res?.matched_to_payment_id || '',
          }));

          result = modifiedDataList;
        }
        break;
      case 'bank_statement':
        {
          const queryBuilder = await this.getBankStatementList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'bs.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result;
        }
        break;
      case 'reconciliation':
        {
          const queryBuilder = await this.getReconciliationReportList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'report.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          const modifiedDataList = raw_result?.map((res) => ({
            report_date: res?.created_on,
            month_end_date: res?.month_end_date,
            account_name: res?.bankAccounts?.account_name,
            bank_statement_balance: res?.bank_statement_balance,
            adjustments: res?.adjustments,
            adjustment_comment: res?.adjustment_comment,
            expected_balance: res?.expected_balance,
            deposit_withdrawal_balance: res?.deposit_withdrawal_balance,
            account_ledger_balance: res?.account_ledger_balance,
            reconcile_status: res?.reconcile_status,
          }));

          result = modifiedDataList;
        }
        break;
      case 'compliance':
        {
          const { pta_compliance, rta_compliance } = data;
          const queryBuilder = await this.getCompliancesList(data);
          let raw_result = await queryBuilder
            .orderBy({ 'p.project_date': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          // Filter results based on compliance statuses if provided
          raw_result = await Promise.all(
            raw_result.map(async (result) => {
              const fetchedComplianceStatuses =
                await this.fetchComplianceStatusesOfAProject({
                  project_id: result.project_id,
                });
              result.pta_compliance =
                fetchedComplianceStatuses.data.pta_compliance;
              result.rta_compliance =
                fetchedComplianceStatuses.data.rta_compliance;
              return result;
            }),
          );

          // Apply compliance filters and recalculate total_count
          if (pta_compliance) {
            raw_result = raw_result.filter(
              (result) => result.pta_compliance === pta_compliance,
            );
          }

          if (rta_compliance) {
            raw_result = raw_result.filter(
              (result) => result.rta_compliance === rta_compliance,
            );
          }
          result = raw_result?.map((res) => ({
            project_name: res?.project_name,
            project_added_on_date: res?.created_on,
            site_address: res?.site_address,
            role: res?.project_role,
            pta_compliance: res?.pta_compliance,
            rta_compliance: res?.rta_compliance,
          }));
        }
        break;
      case 'user':
        {
          const queryBuilder = await this.getUserList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'user.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            user_id: res.user_id,
            first_name: res?.first_name,
            last_name: res?.last_name,
            email_id: res?.email_id,
            user_role: res?.user_role,
            position_title: res?.position_title,
            user_phone_no: res?.user_phone_no,
            user_status: res?.user_status,
            new_user: res?.is_admin_contacted ? 'Contacted' : 'New User',
          }));
        }
        break;
      case 'business_profile':
        {
          const queryBuilder = await this.getCompaniesList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'company.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result?.map((res) => ({
            company_id: res?.company_id,
            entity_type: res?.entity_type,
            company_name: res?.company_name,
            legal_company_name: res?.legal_company_name,
            expiry_date: res?.subscriptionDetails?.expiry_date,
            plan_name: res?.subscriptionDetails?.planDetails?.plan_name,
            is_admin_blocked: res?.is_admin_blocked ? 'Blocked' : 'Unblocked',
          }));
        }
        break;
      case 'subscription_plan':
        {
          const queryBuilder = await this.getSubscriptionPlanList(data);
          const raw_result = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result?.map((res) => {
            const filteredPlanItems = res?.planItem
              ?.map((subPlanItemObj) => {
                if (
                  res?.plan_id === subPlanItemObj?.plan_id &&
                  subPlanItemObj?.plan_id === res?.plan_id &&
                  subPlanItemObj?.item_id ===
                    subPlanItemObj?.item?.subscription_item_id &&
                  subPlanItemObj?.item?.item_status === 'Active'
                ) {
                  return {
                    id: subPlanItemObj?.id,
                    item_id: subPlanItemObj?.item_id,
                    item_name: subPlanItemObj?.item?.item_name,
                    description: subPlanItemObj?.item?.description || '',
                    item_status: subPlanItemObj?.item?.item_status,
                  };
                }
              })
              ?.filter((value) => value);
            return {
              plan_name: res?.plan_name,
              plan_type: res?.plan_type,
              plan_items: filteredPlanItems
                ?.map((ele) => ele?.item_name)
                ?.toLocaleString(),
              monthly_price: res?.pricingPlan?.find(
                (ele) =>
                  res?.plan_id === ele?.plan_id &&
                  res?.associated_price_ids?.includes?.(ele?.id) &&
                  ele?.bill_cycle === 'Month',
                // && ele?.is_active,
              )
                ? res?.pricingPlan?.find(
                    (ele) =>
                      res?.plan_id === ele?.plan_id &&
                      res?.associated_price_ids?.includes?.(ele?.id) &&
                      ele?.bill_cycle === 'Month',
                    // && ele?.is_active,
                  )?.plan_price
                : 0,
              yearly_price: res?.pricingPlan?.find(
                (ele) =>
                  res?.plan_id === ele?.plan_id &&
                  res?.associated_price_ids?.includes(ele?.id) &&
                  ele?.bill_cycle === 'Year',
                // && ele?.is_active,
              )
                ? res?.pricingPlan?.find(
                    (ele) =>
                      res?.plan_id === ele?.plan_id &&
                      res?.associated_price_ids?.includes(ele?.id) &&
                      ele?.bill_cycle === 'Year',
                    // && ele?.is_active,
                  )?.plan_price
                : 0,
              description: res?.description,
              trial_period: res?.trial_period,
              plan_status: res?.plan_status,
            };
          });
        }
        break;
      case 'subscription_item':
        {
          const queryBuilder = await this.getSubscriptionItemList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'subitems.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            item_name: res?.item_name,
            description: res?.description || '',
            item_status: res?.item_status,
          }));
        }
        break;
      case 'subscription_user':
        {
          const queryBuilder = await this.getSubscribedUserList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'sd.updated_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            company_name: res?.companyDetails?.company_name,
            plan_name: res?.planDetails?.plan_name,
            subscribed_amount: res?.amount,
            start_date: res?.start_date,
            expiry_date: res?.expiry_date,
            bill_cycle: res?.pricingPlan?.bill_cycle,
            subscription_status: res?.status,
          }));
        }
        break;
      case 'dummy':
        {
          const queryBuilder = await this.getDummyList();
          result = await queryBuilder.skip(offset).take(limit).getMany();
        }
        break;
      case 'billing_history':
        {
          const queryBuilder = await this.getPaymentHistoryByCompanyId(data);
          const raw_result = await queryBuilder
            .orderBy({ 'payment.paid_at': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            paid_at: res?.paid_at,
            invoice_number: res?.invoice_number,
            billing_period:
              `${
                res?.start_date ? format(res?.start_date, 'dd/MM/yyyy') : ''
              } - ${
                res?.expiry_date ? format(res?.expiry_date, 'dd/MM/yyyy') : ''
              }` || '',
            payment_method: res?.payment_method,
            amount_paid: res?.amount_paid,
            status: res?.status,
          }));
        }
        break;
      case 'journals':
        {
          const queryBuilder = await this.getBankAccountsForJournalsList(data);
          const raw_result = await queryBuilder
            .orderBy({
              'ba.bank_account_id': 'DESC',
            })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result?.map((res, index) => {
            const debit_amount = res?.journalEntries
              ?.filter(
                (obj) =>
                  obj?.bank_account_id === res?.bank_account_id &&
                  obj?.company_id === res?.company_id,
              )
              ?.reduce((pre, curr, i) => {
                return (
                  pre +
                  (curr?.debit_amount === null
                    ? 0.0
                    : Number(curr?.debit_amount))
                );
              }, 0.0);
            const credit_amount = res?.journalEntries
              ?.filter(
                (obj) =>
                  obj?.bank_account_id === res?.bank_account_id &&
                  obj?.company_id === res?.company_id,
              )
              ?.reduce((pre, curr) => {
                return (
                  pre +
                  (curr?.credit_amount === null
                    ? 0.0
                    : Number(curr?.credit_amount))
                );
              }, 0.0);

            return {
              company_name: res?.companyId?.company_name,
              account_name: res?.account_name,
              account_type: res?.account_type,
              status: res?.status,
              balance_check:
                debit_amount - credit_amount === 0.0 ? 'Ok' : 'Error',
            };
          });
        }
        break;
      case 'delegation':
        {
          const queryBuilder = await this.getDelegatedAccountList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'banks.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const filteredResults = [];

          for (const result of raw_result) {
            const subscribedPlan = await this.subscriptionDetails.findOne({
              where: { company_id: result.company_id },
              relations: ['planDetails'],
            });

            if (
              subscribedPlan &&
              subscribedPlan.planDetails.plan_type !== 'Free'
            ) {
              filteredResults.push(result);
            }
          }

          result = filteredResults?.map((res) => ({
            company_name: res?.companyId?.company_name,
            account_name: res?.account_name,
            account_type: res?.account_type,
            delegation: res?.delegate_powers,
          }));
        }
        break;
      case 'contact':
        {
          const queryBuilder = await this.getContactList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'c.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            name: res?.name,
            email: res?.email,
            status: res?.status,
            message: res?.message,
            received_date: res?.created_on,
          }));
        }
        break;
      case 'content_page':
        {
          const queryBuilder = await this.getContentPageList(data);
          const raw_result = await queryBuilder
            .orderBy({
              'content.created_on': 'DESC',
            })
            .skip(offset)
            .take(limit)
            .getMany();

          raw_result.forEach((content) => {
            if (content.body.length > 200) {
              content.body = content.body.substring(0, 200) + '...';
            }
          });
          result = raw_result?.map((res) => ({
            heading: res?.heading,
            descriptions: res?.body,
            updated_on: res?.updated_on,
          }));
        }
        break;
      case 'content_faq':
        {
          const queryBuilder = await this.getFAQsList(data);
          const raw_result = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            category: res?.category?.value,
            question: res?.question,
            answer: res?.answer,
            faq_status: res?.faq_status,
          }));
        }
        break;
      case 'content_email_template':
        {
          const queryBuilder = await this.getMailTemplateList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'mails.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          raw_result.forEach((mailTemplates) => {
            if (mailTemplates.email_content.length > 200) {
              mailTemplates.email_content =
                mailTemplates.email_content.substring(0, 200) + '...';
            }
          });
          result = raw_result?.map((res) => ({
            category: res?.category,
            email_subject: res?.email_subject,
            updated_on: res?.updated_on,
          }));
        }
        break;
      case 'blog':
        {
          const queryBuilder = await this.getBlogList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'blog.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result.map((blog) => ({
            category: blog?.category?.value,
            title: blog?.title,
            authorName: blog?.author?.first_name
              ? `${blog?.author?.first_name} ${blog?.author?.last_name || ''}`
              : blog?.author?.last_name || '',
            created_on: blog?.created_on,
            published_on: blog?.published_on,
            blog_status: blog?.blog_status,
          }));
        }
        break;
      case 'resource':
        {
          const queryBuilder = await this.getBlogList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'blog.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result.map((blog) => ({
            category: blog?.category?.value,
            title: blog?.title,
            authorName: blog?.author?.first_name
              ? `${blog?.author?.first_name} ${blog?.author?.last_name || ''}`
              : blog?.author?.last_name || '',
            created_on: blog?.created_on,
            published_on: blog?.published_on,
            blog_status: blog?.blog_status,
          }));
        }
        break;
      case 'admin_user':
        {
          const queryBuilder = await this.getAdminUserList(data);
          const raw_result = await queryBuilder
            .orderBy({ created_on: 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          result = raw_result?.map((admin) => ({
            first_name: admin?.first_name,
            last_name: admin?.last_name,
            email_id: admin?.email_id,
            admin_role:
              admin.admin_role === 'RESTRICTED PORTAL ADMIN'
                ? 'Admin'
                : 'Super Admin',
            admin_status: admin?.admin_status,
            created_on: admin?.created_on,
          }));
        }
        break;
      case 'admin_group':
        {
          const queryBuilder = await this.getGroupList(data);
          const raw_result = await queryBuilder
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            group_name: res?.group_name,
            group_description: res?.group_description,
            group_status: res?.group_status,
            created_on: res?.created_on,
          }));
        }
        break;
      case 'variation':
        {
          const queryBuilder = await this.getVariationList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'variation.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            created_on: res?.created_on,
            variation_id: res?.variation_id,
            project_name: res?.projectDetails?.project_name,
            contract_name: res?.contractDetails?.contract_name,
            variation_amount: res?.variation_amount,
            variation_status: res?.variation_status,
          }));
        }
        break;
      case 'holidays':
        {
          const queryBuilder = await this.getHolidaysList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'holiday.holiday_date': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            holiday_name: res?.holiday_name,
            holiday_date: res?.holiday_date || '',
            holiday_status: res?.holiday_status,
            recurring_every_year: res?.recurring_every_year ? 'Yes' : 'No',
          }));
        }
        break;
      case 'coupons':
        {
          const queryBuilder = await this.getCouponsList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'sc.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getRawMany();
          result = raw_result?.map((res) => ({
            coupon_name: res?.coupon_name,
            duration: res?.duration,
            duration_in_months:
              res?.duration_in_months && Number(res?.duration_in_months) > 0
                ? Number(res?.duration_in_months) === 1
                  ? '1 month'
                  : `${res?.duration_in_months} months`
                : '',
            percent_off:
              res?.percent_off && Number(res?.percent_off) > 0
                ? `${res?.percent_off} %`
                : '',
            coupon_status: res?.coupon_status,
          }));
        }
        break;
      case 'client_supplier_by_projectId':
        {
          const queryBuilder =
            await this.getClientSuppliersListByProjectId(data);
          const raw_result = await queryBuilder
            .orderBy({ 'cs.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();
          result = raw_result?.map((res) => ({
            client_supplier_name: res?.client_supplier_name,
            business_name: res?.business_name,
            client_supplier_type: res?.client_supplier_type,
            client_supplier_address: res?.client_supplier_address,
            client_supplier_status: res?.client_supplier_status,
            contract_count: res?.contractDetails
              ? res?.contractDetails?.filter(
                  (contractObj) =>
                    res?.client_supplier_id ===
                      contractObj?.client_supplier_id &&
                    ['In Progress', 'Completed']?.includes(
                      contractObj?.contract_status,
                    ),
                )?.length
              : 0,
          }));
        }
        break;
      case 'journal_by_accountId':
        {
          const raw_result = await this.getJournalByAccountId(data);
          const res: any = raw_result?.data;
          result = res;
        }
        break;
      case 'ledger_by_accountId':
        {
          const raw_result = await this.getLedgerByAccountId(data);
          const res: any = raw_result?.data;
          result = res;
        }
        break;
      case 'trial_balance_by_accountId':
        {
          const raw_result = await this.getTrialBalanceStatement(data);
          const res: any = raw_result?.data;
          result = res;
        }
        break;
      case 'deposit_withdrawal_by_accountId':
        {
          const raw_result = await this.getDepositAndWithdrawal(data);
          const res: any = raw_result?.data;
          result = res;
        }
        break;
      case 'interest_charges':
        {
          const queryBuilder = await this.getPaymentList(data);
          const raw_result = await queryBuilder
            .orderBy({ 'payments.created_on': 'DESC' })
            .skip(offset)
            .take(limit)
            .getMany();

          const modifiedDataList = raw_result?.map((res) => ({
            payment_type: res?.payment_type,
            project_name: res?.projectDetails?.project_name,
            contract_name: res?.contractDetails?.contract_name,
            payment_from_account_name: res?.paymentFromAccount?.account_name,
            payment_to_account_name: res?.paymentToAccount?.account_name,
            payment_amount: res?.subPayments?.find(
              (ele) => ele?.sub_payment_type === 'Payment',
            )
              ? Math.abs(
                  res?.subPayments?.find(
                    (ele) => ele?.sub_payment_type === 'Payment',
                  )?.amount,
                )
              : 0,
            status: res?.current_status,
            // other fields
            payment_from_account: res?.payment_from_account,
            payment_to_account: res?.payment_to_account,
            cash_retention_type: res?.paymentClaims?.cash_retention_type,
            claim_type: res?.paymentClaims?.claim_type,
            claim_amount: res?.paymentClaims?.claim_amount,
            total_amount: res?.total_amount,
            payless_amount: res?.payless_amount,
            payment_date: res?.payment_date,
            // new added field
          }));

          //Change payment_from_account details based upon the cash_retention_type.
          for (const payment of modifiedDataList) {
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

              payment.payment_from_account_name =
                bankAccountDetailsFromContract.payment_from_account_name;
            }
          }
          result = modifiedDataList?.map((res) => ({
            payment_type: res?.payment_type,
            payment_date: res?.payment_date,
            payment_amount: res?.payment_amount,
            status: res?.status,
          }));
        }
        break;
      case 'reconciliation_trial':
        {
          const queryBuilder = await this.getReconciliationReportList(data);
          const raw_result = await queryBuilder.getMany();

          const modifiedDataList = raw_result?.map((res) => ({
            report_date: res?.created_on,
            month_end_date: res?.month_end_date,
            bank_account_id: res?.bank_account_id,
            account_name: res?.bankAccounts?.account_name,
            bank_statement_balance: res?.bank_statement_balance,
            adjustments: res?.adjustments,
            adjustment_comment: res?.adjustment_comment,
            expected_balance: res?.expected_balance,
            deposit_withdrawal_balance: res?.deposit_withdrawal_balance,
            account_ledger_balance: res?.account_ledger_balance,
            reconcile_status: res?.reconcile_status,
          }));
          const res: any = modifiedDataList || [];
          let trial_res = {};
          if (modifiedDataList) {
            const raw_trial_result = await this.getTrialBalanceStatement({
              bank_account_id: modifiedDataList[0]?.bank_account_id,
              start_date: modifiedDataList[0]?.month_end_date,
            });
            trial_res = raw_trial_result?.data || {};
          }
          result = [{ ...res[0], ...trial_res }];
        }
        break;
    }
    return result;
  }

  private async getTotalRecordCount(
    data: ExportExcelDataInput,
  ): Promise<number> {
    let recordCount = 0;
    switch (data.screen_name) {
      case 'project':
        {
          recordCount = await (await this.getProjectList(data)).getCount();
        }
        break;
      case 'contract':
        {
          recordCount = await (await this.getContractList(data)).getCount();
        }
        break;
      case 'client_supplier':
        {
          recordCount = await (
            await this.getClientSupplierList(data)
          ).getCount();
        }
        break;
      case 'notices':
        {
          recordCount = await (await this.getNoticesList(data)).getCount();
        }
        break;
      case 'bank_account':
        {
          recordCount = await (await this.getBankAccountList(data)).getCount();
        }
        break;
      case 'payment_claims':
        {
          recordCount = await (await this.getPaymentClaimList(data)).getCount();
        }
        break;
      case 'retention':
        {
          recordCount = await (
            await this.getRetentionInPaymentList(data)
          ).getCount();
        }
        break;
      case 'payment':
        {
          recordCount = await (await this.getPaymentList(data)).getCount();
        }
        break;
      case 'sub_payment':
        {
          recordCount = await (await this.getSubpaymentList(data)).getCount();
        }
        break;
      case 'activity_log':
        {
          recordCount = await (await this.getActivityLogList(data)).getCount();
        }
        break;
      case 'transaction':
        {
          recordCount = await (await this.getTransactionList(data)).getCount();
        }
        break;
      case 'bank_statement':
        {
          recordCount = await (
            await this.getBankStatementList(data)
          ).getCount();
        }
        break;
      case 'reconciliation':
        {
          recordCount = await (
            await this.getReconciliationReportList(data)
          ).getCount();
        }
        break;
      case 'compliance':
        {
          recordCount = await (await this.getCompliancesList(data)).getCount();
        }
        break;
      case 'user':
        {
          recordCount = await (await this.getUserList(data)).getCount();
        }
        break;
      case 'business_profile':
        {
          recordCount = await (await this.getCompaniesList(data)).getCount();
        }
        break;
      case 'subscription_plan':
        {
          recordCount = await (
            await this.getSubscriptionPlanList(data)
          ).getCount();
        }
        break;
      case 'subscription_item':
        {
          recordCount = await (
            await this.getSubscriptionItemList(data)
          ).getCount();
        }
        break;
      case 'subscription_user':
        {
          recordCount = await (
            await this.getSubscribedUserList(data)
          ).getCount();
        }
        break;
      case 'dummy':
        {
          recordCount = await (await this.getDummyList()).getCount();
        }
        break;
      case 'billing_history':
        {
          recordCount = await (
            await this.getPaymentHistoryByCompanyId(data)
          ).getCount();
        }
        break;
      case 'journals':
        {
          recordCount = await (
            await this.getBankAccountsForJournalsList(data)
          ).getCount();
        }
        break;
      case 'delegation':
        {
          recordCount = await (
            await this.getDelegatedAccountList(data)
          ).getCount();
        }
        break;
      case 'contact':
        {
          recordCount = await (await this.getContactList(data)).getCount();
        }
        break;
      case 'content_page':
        {
          recordCount = await (await this.getContentPageList(data)).getCount();
        }
        break;
      case 'content_faq':
        {
          recordCount = await (await this.getFAQsList(data)).getCount();
        }
        break;
      case 'content_email_template':
        {
          recordCount = await (await this.getMailTemplateList(data)).getCount();
        }
        break;
      case 'blog':
        {
          recordCount = await (await this.getBlogList(data)).getCount();
        }
        break;
      case 'resource':
        {
          recordCount = await (await this.getBlogList(data)).getCount();
        }
        break;
      case 'admin_user':
        {
          recordCount = await (await this.getAdminUserList(data)).getCount();
        }
        break;
      case 'admin_group':
        {
          recordCount = await (await this.getGroupList(data)).getCount();
        }
        break;
      case 'variation':
        {
          recordCount = await (await this.getVariationList(data)).getCount();
        }
        break;
      case 'holidays':
        {
          recordCount = await (await this.getHolidaysList(data)).getCount();
        }
        break;
      case 'coupons':
        {
          recordCount = await (await this.getCouponsList(data)).getCount();
        }
        break;
      case 'client_supplier_by_projectId':
        {
          recordCount = await (
            await this.getClientSuppliersListByProjectId(data)
          ).getCount();
        }
        break;
      case 'journal_by_accountId':
        {
          recordCount = await (
            await this.getJournalByAccountId(data)
          )?.data?.total_count;
        }
        break;
      case 'ledger_by_accountId':
        {
          recordCount = await (
            await this.getLedgerByAccountId(data)
          )?.data?.total_count;
        }
        break;
      case 'trial_balance_by_accountId':
        {
          recordCount =
            (await (
              await this.getTrialBalanceStatement(data)
            )?.data?.trial_balance_list?.length) || 0;
        }
        break;
      case 'deposit_withdrawal_by_accountId':
        {
          recordCount =
            (await (
              await this.getDepositAndWithdrawal(data)
            )?.data?.grid_entries?.length) || 0;
        }
        break;
      case 'interest_charges':
        {
          recordCount = await (await this.getPaymentList(data)).getCount();
        }
        break;
      case 'reconciliation_trial':
        {
          recordCount = await (
            await this.getReconciliationReportList(data)
          ).getCount();
        }
        break;
    }
    return recordCount;
  }

  private async getFileName(data: ExportExcelDataInput): Promise<any> {
    let fileName = 'data',
      estimatedRowHeight = 30;

    let dateRange,
      trustName,
      finalFileName = 'data';
    const date = moment.utc().tz(data.timezone).format('DDMMYYYY');

    if (data.bank_account_id) {
      trustName = (await this.getBankDetails(data)).account_name;
    }

    if (data.date_filter) {
      if (data.date_filter === 'Custom') {
        if (data.start_date && data.end_date) {
          const fromDate = moment.utc(data.start_date).format('DDMMYYYY');
          const toDate = moment.utc(data.end_date).format('DDMMYYYY');
          dateRange = `-${fromDate}-${toDate}`;
        }
      } else if (data.date_filter === 'This Month') {
        const fromDate = moment
          .tz(data.timezone)
          .startOf('month')
          .utc()
          .format('DDMMYYYY');
        const toDate = moment
          .tz(data.timezone)
          .endOf('month')
          .utc()
          .format('DDMMYYYY');
        dateRange = `-${fromDate}-${toDate}`;
      } else if (data.date_filter === 'Last Month') {
        const fromDate = moment
          .tz(data.timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .format('DDMMYYYY');
        const toDate = moment
          .tz(data.timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .format('DDMMYYYY');
        dateRange = `-${fromDate}-${toDate}`;
      }
    } else {
      dateRange = ' ';
    }
    switch (data.screen_name) {
      case 'project':
        {
          fileName = 'Projects';
          estimatedRowHeight = 30;
        }
        break;
      case 'contract':
        {
          fileName = 'Contracts';
          estimatedRowHeight = 20;
        }
        break;
      case 'client_supplier':
        {
          fileName = 'Clients & suppliers';
          estimatedRowHeight = 30;
        }
        break;
      case 'notices':
        {
          fileName = 'Notices';
          estimatedRowHeight = 30;
        }
        break;
      case 'bank_account':
        {
          fileName = 'Bank trust accounts';
          estimatedRowHeight = 20;
        }
        break;
      case 'payment_claims':
        {
          fileName = 'Claims';
          estimatedRowHeight = 20;
        }
        break;
      case 'retention':
        {
          fileName = 'Retentions';
          estimatedRowHeight = 20;
        }
        break;
      case 'payment':
        {
          fileName = 'Payments list';
          estimatedRowHeight = 30;
        }
        break;
      case 'sub_payment':
        {
          fileName = 'Payments to do';
          estimatedRowHeight = 30;
        }
        break;
      case 'activity_log':
        {
          fileName = 'Activity log';
          estimatedRowHeight = 19;
        }
        break;
      case 'transaction':
        {
          fileName = 'Transaction list';
          estimatedRowHeight = 20;
        }
        break;
      case 'bank_statement':
        {
          fileName = 'Bank statements';
          estimatedRowHeight = 20;
        }
        break;
      case 'reconciliation':
        {
          if (data.bank_account_id) {
            finalFileName = `PayTrade-${date}-${trustName}-Reconciliation${dateRange}`;
            fileName = 'Reconciliation';
          } else {
            fileName = 'Reconciliation';
          }
          estimatedRowHeight = 20;
        }
        break;
      case 'compliance':
        {
          fileName = 'Compliance';
          estimatedRowHeight = 30;
        }
        break;
      case 'user':
        {
          fileName = 'Users';
          estimatedRowHeight = 30;
        }
        break;
      case 'business_profile':
        {
          fileName = 'Business profiles';
          estimatedRowHeight = 20;
        }
        break;
      case 'subscription_plan':
        {
          fileName = 'Subscription plan';
          estimatedRowHeight = 20;
        }
        break;
      case 'subscription_item':
        {
          fileName = 'Subscription item';
          estimatedRowHeight = 20;
        }
        break;
      case 'subscription_user':
        {
          fileName = 'Subscription user';
          estimatedRowHeight = 20;
        }
        break;
      case 'dummy':
        {
          fileName = 'Dummy';
          estimatedRowHeight = 30;
        }
        break;
      case 'billing_history':
        {
          fileName = 'Billing history';
          estimatedRowHeight = 20;
        }
        break;
      case 'journals':
        {
          fileName = 'Journals';
          estimatedRowHeight = 20;
        }
        break;
      case 'delegation':
        {
          fileName = 'Delegation list';
          estimatedRowHeight = 20;
        }
        break;
      case 'contact':
        {
          fileName = 'Contacts';
          estimatedRowHeight = 20;
        }
        break;
      case 'content_page':
        {
          fileName = 'Content page';
          estimatedRowHeight = 30;
        }
        break;
      case 'content_faq':
        {
          fileName = 'Content faq';
          estimatedRowHeight = 30;
        }
        break;
      case 'content_email_template':
        {
          fileName = 'Content email template';
          estimatedRowHeight = 30;
        }
        break;
      case 'blog':
        {
          fileName = 'Blog';
          estimatedRowHeight = 20;
        }
        break;
      case 'resource':
        {
          fileName = 'Resource guides';
          estimatedRowHeight = 20;
        }
        break;
      case 'admin_user':
        {
          fileName = 'Manage admin user';
          estimatedRowHeight = 20;
        }
        break;
      case 'admin_group':
        {
          fileName = 'Manage admin group';
          estimatedRowHeight = 20;
        }
        break;
      case 'variation':
        {
          fileName = 'Variations';
          estimatedRowHeight = 20;
        }
        break;
      case 'client_supplier_by_projectId':
        {
          fileName = 'Clients & suppliers';
          estimatedRowHeight = 30;
        }
        break;
      case 'journal_by_accountId':
        {
          if (data.bank_account_id) {
            finalFileName = `PayTrade-${date}-${trustName}-Journals${dateRange}`;
            fileName = 'Journals';
          } else {
            fileName = 'Journals';
          }
          estimatedRowHeight = 30;
        }
        break;
      case 'ledger_by_accountId':
        {
          if (data.bank_account_id) {
            finalFileName = `PayTrade-${date}-${trustName}-Account ledger${dateRange}`;
            fileName = 'Account ledger';
          } else {
            fileName = 'Account ledger';
          }
          estimatedRowHeight = 30;
        }
        break;
      case 'trial_balance_by_accountId':
        {
          if (data.bank_account_id) {
            finalFileName = `PayTrade-${date}-${trustName}-Trial balance${dateRange}`;
            fileName = 'Trial balance';
          } else {
            fileName = 'Trial balance';
          }
          estimatedRowHeight = 30;
        }
        break;
      case 'deposit_withdrawal_by_accountId':
        {
          if (data.bank_account_id) {
            finalFileName = `PayTrade-${date}-${trustName}-Deposits & withdrawals${dateRange}`;
            fileName = 'Deposits & withdrawals';
          } else {
            fileName = 'Deposits & withdrawals';
          }
          estimatedRowHeight = 30;
        }
        break;
      case 'interest_charges':
        {
          fileName = 'Interest and charges';
          estimatedRowHeight = 20;
        }
        break;
      case 'holidays':
        {
          fileName = 'Holidays';
          estimatedRowHeight = 20;
        }
        break;
      case 'coupons':
        {
          fileName = 'Coupons';
          estimatedRowHeight = 20;
        }
        break;
      case 'reconciliation_trial':
        {
          fileName = 'Reconciliation';
          estimatedRowHeight = 20;
        }
        break;
    }

    let FileName;
    if (finalFileName === 'data') {
      FileName = `${fileName}_${date}`;
    } else {
      FileName = finalFileName;
    }
    return {
      fileName: FileName,
      pdfTitle: fileName,
      estimatedRowHeight,
    };
  }

  private getFormattedDate(inputdate: any, timezone: string) {
    return moment.utc(inputdate).tz(timezone).format('DD/MM/YYYY');
  }

  async getBankDetails(data: ExportExcelDataInput) {
    return await this.bankAccountsRepo.findOne({
      where: { bank_account_id: data?.bank_account_id },
    });
  }

  async getProjectList(data: ExportExcelDataInput) {
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];
    const queryBuilder = await this.projectDetails
      .createQueryBuilder('project')
      .distinct(true)
      .where(`project.company_id = :companyId`, {
        companyId: data.company_id,
      });
    if (data.project_status) {
      if (data.project_status === 'Archived') {
        queryBuilder.andWhere('project.project_status IN(:...excludedStatus)', {
          excludedStatus,
        });
      } else {
        queryBuilder.andWhere('project.project_status = :project_status', {
          project_status: data.project_status,
        });
      }
    } else {
      queryBuilder.andWhere(
        'project.project_status NOT IN(:...excludedStatus)',
        { excludedStatus },
      );
    }

    if (data.project_role) {
      queryBuilder.andWhere('project.project_role = :project_role', {
        project_role: data.project_role,
      });
    }

    if (data.project_name_or_id) {
      queryBuilder.andWhere(
        `(LOWER(project.project_name) LIKE LOWER(:keyword))`,
        {
          keyword: `%${data.project_name_or_id.toLowerCase()}%`,
        },
      );
    }
    return queryBuilder;
  }

  async getContractList(data: ExportExcelDataInput) {
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    const queryBuilder = await this.contractDetails
      .createQueryBuilder('contract')
      .distinct(true)
      .leftJoinAndSelect('contract.projectDetails', 'projectDetails')
      .leftJoinAndSelect(
        'contract.clientSuppliersDetails',
        'clientSuppliersDetails',
      )
      .leftJoinAndSelect('contract.variationDetails', 'variationDetails');

    queryBuilder.where(`contract.company_id = :companyId`, {
      companyId: data.company_id,
    });
    if (data.contract_status) {
      if (data.contract_status === 'Archived') {
        queryBuilder.andWhere(
          'contract.contract_status IN(:...excludedStatus)',
          { excludedStatus: excludedStatus },
        );
      } else {
        queryBuilder.andWhere('contract.contract_status = :contract_status', {
          contract_status: data.contract_status,
        });
      }
    } else {
      queryBuilder.andWhere(
        'contract.contract_status NOT IN(:...excludedStatus)',
        { excludedStatus: excludedStatus },
      );
    }

    if (data.project_id) {
      queryBuilder.andWhere('contract.project_id = :project_id', {
        project_id: data.project_id,
      });
    }

    if (data.client_supplier_type) {
      queryBuilder.andWhere(
        'clientSuppliersDetails.client_supplier_type = :client_supplier_type',
        {
          client_supplier_type: data.client_supplier_type,
        },
      );
    }

    if (data.search) {
      queryBuilder.andWhere(
        `(LOWER(contract.contract_name) LIKE LOWER(:keyword) OR CAST(contract.contract_id AS TEXT) LIKE :keyword 
          OR LOWER(projectDetails.project_name) LIKE LOWER(:keyword)
          )`,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
    }
    return queryBuilder;
  }

  async getClientSupplierList(data: ExportExcelDataInput) {
    const company_id = data.company_id;

    const queryBuilder = await this.clientSuppliersDetails
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.contractDetails', 'contractDetails')
      .leftJoinAndSelect('cs.paymentClaims', 'paymentClaims')
      // .leftJoinAndSelect(
      //   PaymentClaims,
      //   'paymentClaims',
      //   'paymentClaims.client_supplier_id = cs.client_supplier_id',
      // )
      .where(`cs.company_id = :companyId`, {
        companyId: company_id,
      });

    if (data.list_type === 'Archived') {
      queryBuilder.andWhere('cs.is_deleted = true');
    } else {
      queryBuilder.andWhere('cs.is_deleted = false');
    }

    if (data.client_supplier_type) {
      queryBuilder.andWhere('cs.client_supplier_type = :client_supplier_type', {
        client_supplier_type: data.client_supplier_type,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `(LOWER(cs.client_supplier_name) LIKE LOWER(:keyword))`,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
    }

    return queryBuilder;
  }

  async getNoticesList(data: ExportExcelDataInput) {
    const {
      company_id,
      bank_account_id,
      project_id,
      notice_type,
      contract_id,
      payment_claim_id,
      payment_id,
      delegated_qbcc,
      status,
    } = data;

    const queryBuilder = await this.noticesRepo
      .createQueryBuilder('notices')
      .leftJoinAndSelect('notices.contractDetails', 'contractDetails')
      .leftJoinAndSelect('notices.projectDetails', 'projectDetails')
      .leftJoinAndSelect('notices.companyDetails', 'companyDetails')
      .leftJoinAndSelect('notices.accountDetails', 'accountDetails');

    if (company_id) {
      queryBuilder.andWhere('(notices.company_id = :company_id)', {
        company_id,
      });
    }

    if (delegated_qbcc) {
      queryBuilder.andWhere('(notices.delegated_qbcc = :delegated_qbcc)', {
        delegated_qbcc,
      });
    }

    if (bank_account_id) {
      queryBuilder.andWhere('(notices.bank_account_id = :bank_account_id)', {
        bank_account_id,
      });
    }

    if (project_id) {
      queryBuilder.andWhere('(notices.project_id = :project_id)', {
        project_id,
      });
    }

    if (contract_id) {
      queryBuilder.andWhere('(notices.contract_id = :contract_id)', {
        contract_id,
      });
    }

    if (payment_id) {
      queryBuilder.andWhere('(notices.payment_id = :payment_id)', {
        payment_id,
      });
    }

    if (payment_claim_id) {
      queryBuilder.andWhere('(notices.payment_claim_id = :payment_claim_id)', {
        payment_claim_id,
      });
    }

    if (notice_type) {
      queryBuilder.andWhere('notices.notice_type = :notice_type', {
        notice_type: notice_type,
      });
    }

    if (delegated_qbcc === true || delegated_qbcc === false) {
      queryBuilder.andWhere('notices.delegated_qbcc = :qbcc_delegation', {
        qbcc_delegation: delegated_qbcc,
      });
    }

    if (status) {
      if (status === 'Deleted') {
        queryBuilder.andWhere('notices.status IN (:...deleteStatuses)', {
          deleteStatuses: ['Delete-Unsent', 'Delete-Sent'],
        });
      } else {
        queryBuilder.andWhere('notices.status = :noticeStatus', {
          noticeStatus: status,
        });
      }
    } else {
      queryBuilder.andWhere('notices.status NOT IN (:...deleteStatuses)', {
        deleteStatuses: ['Delete-Unsent', 'Delete-Sent'],
      });
    }

    return queryBuilder;
  }

  async getBankAccountList(data: ExportExcelDataInput) {
    const {
      company_id,
      account_type,
      project_id,
      page,
      search,
      status,
      items_per_page,
    } = data;

    const account_types_array =
      account_type && account_type.length
        ? account_type.split(', ').map((item) => item.trim())
        : null;

    const queryBuilder = await this.bankAccountsRepo
      .createQueryBuilder('ba')
      .where(`ba.company_id = :company_id`, {
        company_id,
      })
      .andWhere('ba.added_by_client_supplier = :added_by_client_supplier', {
        added_by_client_supplier: false,
      });

    if (search) {
      queryBuilder.andWhere(`(LOWER(ba.account_name) LIKE :search)`, {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (account_types_array && account_types_array.length) {
      queryBuilder.andWhere('ba.account_type IN(:...account_types_array)', {
        account_types_array,
      });
    }

    if (project_id) {
      queryBuilder.andWhere(
        'ba.added_by_client_supplier = :added_by_client_supplier',
        { added_by_client_supplier: false },
      );
      queryBuilder.andWhere(
        ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
        {
          project_id,
        },
      );
    }

    if (status && status === ('Archived' as any)) {
      const archivedStatuses = ['Deleted', 'Closed', 'Transferred'];
      queryBuilder.andWhere('ba.status IN(:...archivedStatuses)', {
        archivedStatuses,
      });
    } else if (status && status != ('Archived' as any)) {
      queryBuilder.andWhere('ba.status = :status', {
        status,
      });
    } else if (!status) {
      const unarchivedStatuses = ['Draft', 'Open', 'Active'];
      queryBuilder.andWhere('ba.status IN(:...unarchivedStatuses)', {
        unarchivedStatuses,
      });
    }

    if (data.is_alphabetical_order) {
      queryBuilder.orderBy({ 'ba.account_name': 'ASC' });
    } else {
      queryBuilder.orderBy({ 'ba.created_on': 'DESC' });
    }

    return queryBuilder;
  }

  async getPaymentClaimList(data: ExportExcelDataInput) {
    const {
      company_id,
      claim_type,
      cash_retention_type,
      status,
      project_id,
      contract_id,
      client_supplier_id,
    } = data;

    // Queried all the payment claims belonging to the company along with the payments belonging to the claim.
    let queryBuilder = await this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.clientSupplierDetails', 'clientSupplierDetails')
      .leftJoinAndSelect('pc.projectDetails', 'projectDetails')
      .leftJoinAndSelect('pc.contractDetails', 'contractDetails')
      .where('pc.company_id = :company_id', { company_id });

    // Subquery to aggregate payments into a single array per claim
    queryBuilder.addSelect((subQuery) => {
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
    }, 'payments');

    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select(
          `JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'payment_id', pd.payment_id,
                'payment_type', pd.payment_type,
                'cash_retention', pd.cash_retention,
                'payment_status', pd.current_status,
                'payless_amount', pd.payless_amount,
                'total_amount', pd.total_amount
              )
              ORDER BY pd.created_on DESC
            )`,
          'payment_list',
        )
        .from(PaymentDetails, 'pd')
        .where('pd.payment_claim_id = pc.payment_claim_id')
        .andWhere("pd.current_status != 'Deleted'")
        .andWhere(
          `pd.payment_type NOT IN ('Overpayment from client',
            'Underpayment from client','Overpayment to supplier',
            'Underpayment to supplier')`,
        );
    }, 'payment_list');

    // Subquery to aggregate notices (if applicable)
    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select(
          "json_agg(json_build_object('notice_id', n.id, 'notice_type', n.notice_type, 'status', n.status))",
          'notices',
        )
        .from(NoticeDetails, 'n')
        .where('n.payment_claim_id = pc.payment_claim_id');
    }, 'notices');

    if (claim_type) {
      queryBuilder.andWhere('pc.claim_type = :claim_type', { claim_type });
    }
    if (cash_retention_type) {
      queryBuilder.andWhere('pc.cash_retention_type = :cash_retention_type', {
        cash_retention_type,
      });
    }
    if (status && status === ('Archived' as any)) {
      const archivedStatuses = ['Void'];
      queryBuilder.andWhere('pc.list_status IN(:...archivedStatuses)', {
        archivedStatuses,
      });
    } else {
      queryBuilder.andWhere(`pc.list_status != 'Void'`);
    }
    if (project_id) {
      queryBuilder.andWhere('pc.project_id = :project_id', { project_id });
    }
    if (contract_id) {
      queryBuilder.andWhere('pc.contract_id = :contract_id', { contract_id });
    }

    if (client_supplier_id) {
      queryBuilder.andWhere('pc.client_supplier_id = :client_supplier_id', {
        client_supplier_id,
      });
    }

    return queryBuilder;
  }

  async getRetentionInPaymentList(data: ExportExcelDataInput) {
    const { company_id, project_id, contract_id, status } = data;

    //Retention bank account name need to be fetched from bank accounts entity.
    const queryBuilder = await this.retentionDetailsRepo
      .createQueryBuilder('rd')
      .leftJoinAndSelect('rd.paymentDetails', 'paymentDetails') // p
      .leftJoinAndSelect('paymentDetails.paymentClaims', 'paymentClaims') // pc
      .leftJoinAndSelect('paymentDetails.contractDetails', 'contractDetails') // cd
      .leftJoinAndSelect('paymentDetails.projectDetails', 'projectDetails') // pd
      .leftJoinAndSelect('paymentDetails.companyDetails', 'companyDetails') // com
      .leftJoinAndSelect('paymentDetails.retentionAccount', 'retentionAccount') // ra
      .leftJoinAndSelect(
        'contractDetails.clientSuppliersDetails',
        'clientSuppliersDetails',
      ) // cs
      .where(`rd.company_id = :company_id`, { company_id });

    if (project_id) {
      queryBuilder.andWhere('paymentDetails.project_id = :project_id', {
        project_id,
      });
    }

    if (contract_id) {
      queryBuilder.andWhere('paymentDetails.contract_id = :contract_id', {
        contract_id,
      });
    }

    if (status) {
      queryBuilder.andWhere('rd.retention_status = :status', { status });
    } else if (!status) {
      const activeStatuses = [
        'Retained',
        'Claim generated',
        'Claim completed',
        'Payment generated',
        'Deleted',
      ];
      queryBuilder.andWhere('rd.retention_status IN(:...activeStatuses)', {
        activeStatuses,
      });
    }
    return queryBuilder;
  }

  async getPaymentList(data: ExportExcelDataInput) {
    const company_id = data.company_id;

    const queryBuilder = await this.paymentDetails
      .createQueryBuilder('payments')
      //other table joins
      .innerJoinAndSelect('payments.companyDetails', 'company')
      .leftJoinAndSelect('payments.projectDetails', 'project')
      .leftJoinAndSelect('payments.contractDetails', 'contract')
      .leftJoinAndSelect('payments.clientSupplierDetails', 'clientSupplier')
      .leftJoinAndSelect('payments.paymentFromAccount', 'fromAccount')
      .leftJoinAndSelect('payments.paymentToAccount', 'toAccount')
      .leftJoinAndSelect('payments.retentionAccount', 'retentionAcc')
      .leftJoinAndSelect('payments.paymentClaims', 'pc')
      .leftJoinAndSelect('payments.subPayments', 'payment')
      .where(`payments.company_id = :companyId`, {
        companyId: company_id,
      });

    if (data.project_id) {
      queryBuilder.andWhere('payments.project_id = :project_id', {
        project_id: data.project_id,
      });
    }

    if (data.contract_id) {
      queryBuilder.andWhere('payments.contract_id = :contract_id', {
        contract_id: data.contract_id,
      });
    }

    if (data.claim_id) {
      queryBuilder.andWhere('payments.payment_claim_id = :claim_id', {
        claim_id: data.claim_id,
      });
    }

    if (data.bank_account_id) {
      queryBuilder.andWhere(
        `
        (payments.payment_from_account = :bank_account_id OR 
        payments.payment_to_account = :bank_account_id OR
        payments.retention_account = :bank_account_id)
      `,
        { bank_account_id: data.bank_account_id },
      );
    }

    if (data.client_supplier_id) {
      queryBuilder.andWhere(
        'payments.client_supplier_id = :client_supplier_id',
        {
          client_supplier_id: data.client_supplier_id,
        },
      );
    }

    if (data.claim_type) {
      queryBuilder.andWhere(
        'pc.claim_type = :claim_type AND payments.associated_payment_id IS NULL',
        {
          claim_type: data.claim_type,
        },
      );
    }

    if (data.cash_retention_type) {
      queryBuilder.andWhere('pc.cash_retention_type = :cash_retention_type', {
        cash_retention_type: data.cash_retention_type,
      });
    }

    if (data.payment_type) {
      if (data.payment_type == 'All') {
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
      } else if (data.payment_type == 'Other') {
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
      } else {
        queryBuilder.andWhere('payments.payment_type = :payment_type', {
          payment_type: data.payment_type,
        });
      }
    }

    if (data.status) {
      queryBuilder.andWhere('payments.list_status = :status', {
        status: data.status,
      });
    } else {
      queryBuilder.andWhere('payments.list_status != :deleteStatus', {
        deleteStatus: 'Void',
      });
    }

    if (data.is_paid_confirmed !== undefined) {
      queryBuilder.andWhere('payment.is_paid_confirmed = :is_paid', {
        is_paid: data.is_paid_confirmed,
      });
    }

    if (data.keyword) {
      queryBuilder.andWhere(
        `(LOWER(CAST(payments.payment_type AS text)) LIKE :keyword)`,
        { keyword: `%${data.keyword.toLowerCase()}%` },
      );
    }

    return queryBuilder;
  }

  async getSubpaymentList(data: ExportExcelDataInput) {
    const company_id = data.company_id;

    const queryBuilder = await this.subPayments
      .createQueryBuilder('subpayment')
      .leftJoinAndSelect('subpayment.paymentDetails', 'payments')
      .leftJoinAndSelect('payments.projectDetails', 'project')
      .leftJoinAndSelect('payments.paymentClaims', 'pc')
      .leftJoinAndSelect('pc.contractDetails', 'contract')
      .leftJoinAndSelect('payments.clientSupplierDetails', 'clientSupplier')
      .leftJoinAndSelect('payments.paymentFromAccount', 'fromAccount')
      .leftJoinAndSelect('payments.paymentToAccount', 'toAccount')
      .leftJoinAndSelect('payments.retentionAccount', 'retentionAcc')
      .where('payments.company_id = :companyId', { companyId: company_id })
      .andWhere('payments.current_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });

    if (data.project_id) {
      queryBuilder.andWhere('payments.project_id = :project_id', {
        project_id: data.project_id,
      });
    }

    if (data.contract_id) {
      queryBuilder.andWhere('payments.contract_id = :contract_id', {
        contract_id: data.contract_id,
      });
    }

    if (data.claim_type) {
      if (data.claim_type === 'Receivable') {
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
            claim_type: data.claim_type,
            bankAccount: data.bank_account_id,
            subpaymentType1: 'Retention In',
            subpaymentType2: 'Payment',
            retention: 'Retention claim',
          },
        );
      } else if (data.claim_type === 'Billable') {
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
            claim_type: data.claim_type,
            bankAccount: data.bank_account_id,
            subpaymentType1: 'Retention In',
            subpaymentType2: 'Payment',
            retention: 'Retention claim',
          },
        );
      }
    }

    if (data.client_supplier_id) {
      queryBuilder.andWhere(
        'payments.client_supplier_id = :client_supplier_id',
        {
          client_supplier_id: data.client_supplier_id,
        },
      );
    }

    if (data.bank_account_id) {
      queryBuilder.andWhere(
        `
        (payments.payment_from_account = :bank_account_id OR 
        payments.payment_to_account = :bank_account_id OR
        payments.retention_account = :bank_account_id)
      `,
        { bank_account_id: data.bank_account_id },
      );
    }

    if (data.sub_payment_type) {
      if (data.sub_payment_type == 'ToDo') {
        const PaymentsToDo = ['Payment', 'Retention Out'];
        queryBuilder.andWhere(
          'subpayment.sub_payment_type  IN (:...toDoPayments)',
          {
            toDoPayments: PaymentsToDo,
          },
        );
      } else if (data.sub_payment_type == 'All') {
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
            sub_payment_type: data.sub_payment_type,
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
      data.sub_payment_type &&
      data.is_confirmed !== undefined &&
      data.sub_payment_type == 'ToDo' &&
      data.status
    ) {
      if (data.is_confirmed === true) {
        queryBuilder.andWhere(
          `(payments.current_status IN (:...status) OR (payments.current_status IN (:...unpaidstatus) 
          AND (subpayment.is_paid_confirmed = true OR subpayment.is_received_confirmed = true OR subpayment.is_retention_confirmed = true)))`,
          {
            status: allowedPaidStatuses,
            unpaidstatus: allowedUnPaidStatuses,
          },
        );
      } else if (data.is_confirmed === false) {
        queryBuilder.andWhere('payments.current_status NOT IN  (:...status)', {
          status: allowedPaidStatuses,
        });
      }
    } else if (data.status) {
      queryBuilder.andWhere('subpayment.status = :status', {
        status: data.status,
      });
    }

    const currentDate = moment.tz(data?.timezone).toDate();

    if (data.is_confirmed !== undefined) {
      if (data.is_confirmed === true) {
        // queryBuilder.andWhere(
        //   '(subpayment.is_paid_confirmed = true OR subpayment.is_received_confirmed = true OR subpayment.is_retention_confirmed = true)',
        // );
      } else if (data.is_confirmed === false) {
        queryBuilder.andWhere(
          '(subpayment.is_paid_confirmed = false OR subpayment.is_received_confirmed = false OR subpayment.is_retention_confirmed = false)',
        );

        queryBuilder.addSelect(
          `CASE WHEN due_date < :currentDate THEN true ELSE false END`,
          'is_late',
        );
        queryBuilder.setParameter('currentDate', currentDate);
      }
    }

    if (data.is_late !== undefined) {
      if (data.is_late !== null) {
        queryBuilder.andWhere(
          'CASE WHEN due_date < :currentDate THEN true ELSE false END = :is_late',
          { is_late: data.is_late },
        );
      }
    }

    if (data.keyword) {
      queryBuilder.andWhere(
        `(
        LOWER(CAST(subpayment.sub_payment_type AS text)) LIKE :keyword OR
        LOWER(CAST(pc.payment_claim_id AS text)) LIKE :keyword OR
        LOWER(CAST(project.project_name AS text)) LIKE :keyword OR
        LOWER(CAST(fromAccount.account_name AS text)) LIKE :keyword OR
        LOWER(CAST(toAccount.account_name AS text)) LIKE :keyword OR
        LOWER(CAST(retentionAcc.account_name AS text)) LIKE :keyword 
         ${!isNaN(Number(data.keyword)) ? 'OR ABS(subpayment.amount) = ABS(:exactAmount)' : ''}
        )`,
        {
          keyword: `%${data.keyword.trim().toLowerCase()}%`,
          ...(isNaN(Number(data.keyword))
            ? {}
            : { exactAmount: Number(data.keyword.trim()) }),
        },
      );
    }

    return queryBuilder;
  }

  async getActivityLogList(data: ExportExcelDataInput) {
    const { company_id, admin_id, event_group, timezone } = data;
    const decoded = data?.decodedToken;

    const admin_role = (
      await this.adminDetails.findOne({ where: { admin_id } })
    )?.admin_role;
    const is_super = admin_role === 'PORTAL ADMIN';

    const queryBuilder = await this.activityLog
      .createQueryBuilder('log')
      // .select('log.from_user', 'from_user')
      // .addSelect('user.first_name', 'first_name')
      // .addSelect('user.last_name', 'last_name')
      // .addSelect('user.email_id', 'email_id')
      .select(
        'CASE WHEN log.from_user IS NOT NULL THEN log.from_user ELSE log.admin_id END',
        'from_user',
      )
      .addSelect(
        `CASE 
          WHEN log.is_admin IS TRUE AND log.admin_id IS NOT NULL AND template.event_by <> 'SYSTEM' THEN CASE WHEN ${is_super ? 'TRUE' : 'FALSE'} THEN 'Paytrade Admin (' || admin.email_id || ')' ELSE 'Admin (' || admin.email_id || ')' END 
          WHEN log.is_admin IS FALSE AND log.from_user IS NULL AND log.to_user IS NOT NULL AND log.admin_id IS NOT NULL AND template.event_by <> 'SYSTEM' THEN 'Admin' 
          WHEN log.is_admin IS FALSE AND log.from_user IS NOT NULL AND log.to_user IS NULL AND log.admin_id IS NULL AND template.event_by <> 'SYSTEM' THEN user.first_name 
          WHEN template.event_by = 'SYSTEM' THEN 'SYSTEM' 
          ELSE ''
        END`,
        'first_name',
      ) //admin.first_name
      .addSelect(
        `CASE 
          WHEN log.from_user IS NOT NULL AND log.to_user IS NULL AND log.admin_id IS NULL AND template.event_by <> 'SYSTEM' THEN user.last_name 
          ELSE '' 
        END`,
        'last_name',
      ) //admin.last_name
      .addSelect(
        'CASE WHEN log.from_user IS NOT NULL THEN user.email_id ELSE admin.email_id END',
        'email_id',
      )
      .addSelect('log.to_user', 'to_user')
      .addSelect('log.company_id', 'company_id')
      .addSelect('log.user_mode', 'user_mode')
      .addSelect('log.admin_id', 'admin_id')
      .addSelect('company.company_name', 'company_name')
      .addSelect('company.company_email_id', 'company_email_id')
      .addSelect('log.event_template_id', 'event_template_id')
      .addSelect('template.event_group', 'event_group')
      .addSelect('template.event_type', 'event_type')
      .addSelect('template.event_text', 'event_text')
      // .addSelect('log.dynamic_values', 'dynamic_values')
      .addSelect('CAST(log.dynamic_values AS TEXT)', 'dynamic_values')
      .addSelect('log.event_date', 'event_date')
      .addSelect('log.is_admin', 'is_admin')
      .addSelect('log.created_on', 'created_on')
      .distinct(true)
      .innerJoin('log.logTemplates', 'template')
      .leftJoin('log.userDetails', 'user')
      .leftJoin('log.companyDetails', 'company')
      .leftJoin('log.adminDetails', 'admin');

    // if (user_id) {
    //   queryBuilder.where('log.to_user = :user_id', { user_id });
    //   queryBuilder.where('log.from_user = :user_id', { user_id });
    // }
    if (admin_id) {
      queryBuilder.where(`log.admin_id = :admin_id`, {
        admin_id: admin_id,
      });
    } else {
      if (decoded?.isAdmin && decoded?.role === Role.PORTAL_ADMIN) {
        const admin_ids = await this.adminDetails
          .createQueryBuilder('a')
          .select('ARRAY_AGG(a.admin_id)', 'id_array')
          .distinct(true)
          .where(`a.admin_status = 'Active'`)
          .getRawOne();
        const id_array =
          admin_ids && admin_ids.id_array
            ? admin_ids.id_array
            : [decoded?.admin_id];
        this.logger.log(`id_array: ${JSON.stringify(id_array)}`);
        queryBuilder.where(
          'log.admin_id IN(:...idArray) AND log.is_admin IS TRUE',
          {
            idArray: id_array,
          },
        );
      } else if (
        decoded?.isAdmin &&
        decoded?.role === Role.RESTRICTED_PORTAL_ADMIN
      ) {
        queryBuilder.where('log.admin_id = :user_id AND log.is_admin IS TRUE', {
          user_id: decoded?.userId,
        });
      } else {
        const is_system_added = company_id
          ? (await this.companyDetails.findOne({ where: { company_id } }))
              ?.is_system_added
          : null;
        if (is_system_added) {
          queryBuilder.where(
            '(log.from_user = :user_id OR log.to_user = :user_id) AND log.is_admin IS FALSE',
            {
              user_id: decoded?.userId,
            },
          );
        }
      }
    }

    if (company_id) {
      queryBuilder.andWhere(`log.company_id = :companyId`, {
        companyId: company_id,
      });
    }

    if (event_group) {
      const event_template_ids = await this.eventTemplates
        .createQueryBuilder('e')
        .select('ARRAY_AGG(e.id)', 'id_array')
        .addSelect('e.event_group', 'event_group')
        .distinct(true)
        .where('e.event_group ILike :event_group', {
          event_group: `%${event_group}%`,
        })
        .orderBy('e.event_group')
        .groupBy('e.event_group')
        .getRawOne();

      queryBuilder.andWhere(`log.event_template_id IN(:...idArray)`, {
        idArray: event_template_ids.id_array,
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
      }
      queryBuilder.andWhere(
        'log.event_date BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    return queryBuilder;
  }

  async getFullTimezoneName(event_date: string, user_timezone: string) {
    const dateInUserTimezone = moment
      .utc(event_date)
      .tz(user_timezone)
      .toDate();

    // Use Intl.DateTimeFormat to get the full timezone name
    const fullTimezoneName = new Intl.DateTimeFormat('en-US', {
      timeZone: user_timezone,
      timeZoneName: 'long',
    }).format(dateInUserTimezone);

    return fullTimezoneName;
  }

  async iterateLogArray(activityLogArray) {
    return new Promise(async (resolve, reject) => {
      activityLogArray.forEach(async (element) => {
        if (element.dynamic_values) {
          element.dynamic_values = JSON.parse(element.dynamic_values);
          const replaceVariablesRes = await this.replaceVariables(
            element.event_text,
            element.dynamic_values,
          );
          element.event_text = replaceVariablesRes;
        }
      });
      resolve(activityLogArray);
    });
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
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

  async getTransactionList(data: ExportExcelDataInput) {
    const {
      company_id,
      bank_account_id,
      date_filter,
      date_from,
      date_to,
      is_receivable,
      status,
      search,
      timezone,
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
      ])
      .leftJoin(
        SubPayments,
        'sub',
        `sub.sub_payment_id = ANY(string_to_array(t.matched_payment_ids, ',')::BIGINT[])`,
      )
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

    return queryBuilder;
  }

  async getBankStatementList(data: ExportExcelDataInput) {
    const {
      company_id,
      bank_account_id,
      date_filter,
      added_date_from,
      added_date_to,
      search,
      status,
      timezone,
    } = data;

    const queryBuilder = await this.bankStatements
      .createQueryBuilder('bs')
      .where('bs.company_id = :company_id', { company_id });

    if (bank_account_id) {
      queryBuilder.andWhere('bs.bank_account_id = :bank_account_id', {
        bank_account_id,
      });
    }

    if (status) {
      queryBuilder.andWhere('bs.status = :status', { status });
    }

    if (search) {
      const keywords = search.split(/\s+/);
      keywords.forEach((keywordPart, index) => {
        queryBuilder.andWhere(
          `LOWER(bs.bank_statement_name) LIKE :keyword${index}`,
          { [`keyword${index}`]: `%${keywordPart.toLowerCase()}%` },
        );
      });
    }

    if (date_filter && timezone) {
      const moment = require('moment-timezone');
      moment.tz.setDefault('UTC');

      let start_date, end_date;
      if (date_filter === 'Custom' && added_date_from && added_date_to) {
        start_date = moment
          .tz(added_date_from, timezone)
          .startOf('day')
          .utc()
          .toDate();
        end_date = moment
          .tz(added_date_to, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (date_filter === 'This Month') {
        start_date = moment.tz(timezone).startOf('month').utc().toDate();
        end_date = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (date_filter === 'Last Month') {
        start_date = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        end_date = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      } else if (
        date_filter === 'Custom' &&
        !added_date_from &&
        added_date_to
      ) {
        start_date = moment
          .utc(added_date_to)
          .tz(timezone)
          .startOf('year')
          .utc()
          .toDate();
        end_date = moment.utc(added_date_to).tz(timezone).utc().toDate();
      }

      if (start_date && end_date) {
        queryBuilder.andWhere(
          'bs.created_on BETWEEN :start_date AND :end_date',
          {
            start_date,
            end_date,
          },
        );
      }
    }

    return queryBuilder;
  }

  async getReconciliationReportList(data: ExportExcelDataInput) {
    const { timezone } = data;

    const queryBuilder = await this.reconciliationReport
      .createQueryBuilder('report')
      .distinct(true)
      .innerJoinAndSelect('report.bankAccounts', 'ba')
      .where(`1=1`);

    if (data.company_id) {
      queryBuilder.andWhere(`report.company_id = :company_id`, {
        company_id: data.company_id,
      });
    }

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

    if (data.report_id) {
      queryBuilder.andWhere(`report.report_id = :report_id`, {
        report_id: data.report_id,
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

    return queryBuilder;
  }

  async getCompliancesList(data: ExportExcelDataInput) {
    const {
      company_id,
      project_id,
      bank_account_id,
      account_type,
      date_filter,
      start_date,
      end_date,
    } = data;

    let queryBuilder = await this.projectDetails
      .createQueryBuilder('p')
      .leftJoinAndSelect(CompanyDetails, 'c', 'c.company_id = p.company_id')
      .andWhere(`p.project_status != 'Deleted'`);

    if (company_id) {
      queryBuilder.andWhere('p.company_id = :company_id', { company_id });
    }

    if (project_id) {
      queryBuilder.andWhere('p.project_id = :project_id', { project_id });
    }

    if (bank_account_id) {
      const bank_accounts = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
        select: ['project_ids'],
      });
      if (bank_accounts) {
        queryBuilder.andWhere('p.project_id IN (:...project_ids)', {
          project_ids: bank_accounts.project_ids,
        });
      }
    }

    if (account_type && account_type == 'Project Trust Account') {
      queryBuilder.andWhere('p.pta_eligibility = :pta_eligibility', {
        pta_eligibility: 'Yes',
      });
    }

    if (account_type && account_type == 'Retention Trust Account') {
      queryBuilder.andWhere('p.rta_eligibility = :rta_eligibility', {
        rta_eligibility: 'Yes',
      });
    }

    if (date_filter) {
      if (date_filter === 'Custom' && start_date && end_date) {
        queryBuilder.andWhere(
          'p.project_date BETWEEN :start_date AND :end_date',
          { start_date, end_date },
        );
      } else if (date_filter === 'This Month') {
        const startDate = moment().startOf('month').toDate();
        const endDate = moment().endOf('month').toDate();
        queryBuilder.andWhere(
          'p.project_date BETWEEN :start_date AND :end_date',
          { start_date: startDate, end_date: endDate },
        );
      } else if (date_filter === 'Last Month') {
        const startDate = moment()
          .subtract(1, 'month')
          .startOf('month')
          .toDate();
        const endDate = moment().subtract(1, 'month').endOf('month').toDate();
        queryBuilder.andWhere(
          'p.project_date BETWEEN :start_date AND :end_date',
          { start_date: startDate, end_date: endDate },
        );
      }
    }

    return queryBuilder;
  }

  async fetchComplianceStatusesOfAProject(data: { project_id: number }) {
    try {
      const { project_id } = data;

      let pta_compliance;
      let rta_compliance;

      const complianceResultsOfPta =
        await this.fetchComplianceResultsOfAProject({
          project_id,
          bank_account_type: 'Project Trust Account',
        });
      const complianceResultsOfRta =
        await this.fetchComplianceResultsOfAProject({
          project_id,
          bank_account_type: 'Retention Trust Account',
        });

      const statusesOfPTA = [];
      const statusesOfRTA = [];
      for (let i = 0; i < complianceResultsOfPta.data.length; i++) {
        for (
          let j = 0;
          j < complianceResultsOfPta.data[i].results.length;
          j++
        ) {
          if (
            complianceResultsOfPta.data[i].results[j].check_status &&
            complianceResultsOfPta.data[i].results[j].check_status == 'FAILED'
          ) {
            statusesOfPTA.push('FAILED');
          }
        }
      }
      for (let i = 0; i < complianceResultsOfRta.data.length; i++) {
        for (
          let j = 0;
          j < complianceResultsOfRta.data[i].results.length;
          j++
        ) {
          if (
            complianceResultsOfRta.data[i].results[j].check_status &&
            complianceResultsOfRta.data[i].results[j].check_status == 'FAILED'
          ) {
            statusesOfRTA.push('FAILED');
          }
        }
      }

      const projectDetails = await this.projectDetails.findOne({
        where: { project_id },
        select: ['project_name'],
      });

      if (statusesOfPTA.length) {
        pta_compliance = 'Action required';
      } else pta_compliance = 'Ok';
      if (statusesOfRTA.length) {
        rta_compliance = 'Action required';
      } else rta_compliance = 'Ok';

      return {
        status: 'SUCCESS',
        message: `Project details fetched successfully.`,
        data: {
          project_name: projectDetails.project_name,
          pta_compliance,
          rta_compliance,
          number_of_issues_in_pta: statusesOfPTA.length,
          number_of_issues_in_rta: statusesOfRTA.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchComplianceResultsOfAProject(data: {
    project_id: number;
    bank_account_type: 'Retention Trust Account' | 'Project Trust Account';
  }) {
    try {
      this.logger.log(
        `Request received for fetching the compliance results of a project with data: ${JSON.stringify(data)}`,
      );

      const { project_id, bank_account_type } = data;
      let complianceResults = [];
      const requiredProjectDetails = await this.projectDetails.findOne({
        where: { project_id },
        select: [
          'pta_eligibility',
          'rta_eligibility',
          'retention_type',
          'number_of_units',
          'head_contract_sum',
          'project_role',
          'id',
        ],
      });

      switch (bank_account_type) {
        case 'Project Trust Account':
          {
            const fetchedAllContents = await this.complianceChecks.find({
              where: { bank_account_type: 'Project Trust Account' },
            });

            const fetchedAllRules = await this.ptaCompliances.find({
              where: { bank_account_type: 'Project Trust Account' },
              select: [
                'check_number',
                'check_name',
                'display_message',
                'display_message_colour',
                'action_button_type',
                'check_status',
                'rule_number',
              ],
            });

            const projectTrustAccount = await this.bankAccountsRepo
              .createQueryBuilder('ba')
              .select([
                'ba.bank_account_id AS bank_account_id',
                'ba.account_type AS bank_account_type',
                'ba.opening_date AS opening_date',
                'ba.delegate_powers AS delegate_powers',
                'ba.current_balance AS current_balance',
              ])
              .where(
                ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
                { project_id },
              )
              .andWhere('ba.account_type = :bank_account_type', {
                bank_account_type,
              })
              .orderBy({ 'ba.created_on': 'ASC' })
              .getRawOne();

            const checksOfPTA = await this.complianceChecks.find({
              where: {
                rule_number: 1,
                bank_account_type: 'Project Trust Account',
              },
              select: ['check_name', 'check_number', 'is_active'],
            });

            const activeComplianceChecks = checksOfPTA.filter(
              (check) => check.is_active === true,
            );

            for (let i = 0; i < activeComplianceChecks.length; i++) {
              const functionName = await this.changeCheckNameToCamelCase(
                activeComplianceChecks[i].check_name,
              );

              const complianceResultsOfPTA = await this.compliancePTAFunctions[
                functionName
              ](
                { ...requiredProjectDetails, ...data },
                fetchedAllContents,
                fetchedAllRules,
                projectTrustAccount,
              );

              const redColourCode = complianceResultsOfPTA.filter(
                (result) => result.display_message_colour == '#ff1042',
              );
              const yellowColourCode = complianceResultsOfPTA.filter(
                (result) => result.display_message_colour == '#ffc810',
              );

              const colourCodeOfCheck = redColourCode.length
                ? '#ff1042'
                : yellowColourCode.length
                  ? '#ffc810'
                  : '#08b560';
              complianceResults.push({
                check_number: complianceResultsOfPTA[0]?.check_number,
                check_colour_code: colourCodeOfCheck,
                results: complianceResultsOfPTA,
              });
            }

            const inactiveComplianceChecks = checksOfPTA.filter(
              (check) => check.is_active === false,
            );

            for (let i = 0; i < inactiveComplianceChecks.length; i++) {
              const functionName = await this.changeCheckNameToCamelCase(
                inactiveComplianceChecks[i].check_name,
              );

              const complianceResultsOfInActiveChecksInPTA =
                await this.compliancePTAFunctions[functionName](
                  {
                    ...requiredProjectDetails,
                    ...data,
                  },
                  fetchedAllContents,
                  fetchedAllRules,
                  projectTrustAccount,
                );

              for (
                let j = 0;
                j < complianceResultsOfInActiveChecksInPTA.length;
                j++
              ) {
                if (complianceResultsOfInActiveChecksInPTA.length - j == 1) {
                  delete complianceResultsOfInActiveChecksInPTA[j]
                    .action_button_type;
                  delete complianceResultsOfInActiveChecksInPTA[j].check_status;
                  delete complianceResultsOfInActiveChecksInPTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInPTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInPTA[j].rule_number;
                  delete complianceResultsOfInActiveChecksInPTA[j]
                    .display_message_colour;
                  complianceResultsOfInActiveChecksInPTA[j].display_message =
                    'This compliance check is inactive. Please contact administrator.';
                } else {
                  delete complianceResultsOfInActiveChecksInPTA[j]
                    .action_button_type;
                  delete complianceResultsOfInActiveChecksInPTA[j].check_status;
                  delete complianceResultsOfInActiveChecksInPTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInPTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInPTA[j].rule_number;
                  delete complianceResultsOfInActiveChecksInPTA[j]
                    .display_message_colour;
                  delete complianceResultsOfInActiveChecksInPTA[j]
                    .display_message;
                }
              }
              complianceResults.push({
                check_number:
                  complianceResultsOfInActiveChecksInPTA[0]?.check_number,
                check_colour_code: null,
                results: complianceResultsOfInActiveChecksInPTA,
              });
            }
          }
          break;
        case 'Retention Trust Account':
          {
            const fetchedAllContents = await this.complianceChecks.find({
              where: { bank_account_type: 'Retention Trust Account' },
            });

            const fetchedAllRules = await this.rtaCompliances.find({
              where: { bank_account_type: 'Retention Trust Account' },
              select: [
                'check_number',
                'check_name',
                'display_message',
                'display_message_colour',
                'action_button_type',
                'check_status',
                'rule_number',
              ],
            });

            const retentionTrustAccount = await this.bankAccountsRepo
              .createQueryBuilder('ba')
              .select([
                'ba.bank_account_id AS bank_account_id',
                'ba.opening_date AS opening_date',
                'ba.account_type AS bank_account_type',
                'ba.delegate_powers AS delegate_powers',
                'ba.retention_trust_certificate_attachment_ids AS retention_trust_certificate_attachment_ids',
                'ba.company_id AS company_id',
              ])
              .where(
                ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
                { project_id },
              )
              .andWhere('ba.account_type = :bank_account_type', {
                bank_account_type,
              })
              .orderBy({ 'ba.created_on': 'ASC' })
              .getRawOne();

            const checksOfRTA = await this.complianceChecks.find({
              where: {
                rule_number: 1,
                bank_account_type: 'Retention Trust Account',
              },
              select: ['check_name', 'check_number', 'is_active'],
            });
            const activeComplianceChecks = checksOfRTA.filter(
              (check) => check.is_active === true,
            );

            for (let i = 0; i < activeComplianceChecks.length; i++) {
              const functionName = await this.changeCheckNameToCamelCase(
                activeComplianceChecks[i].check_name,
              );
              const complianceResultsOfActiveChecksInRTA =
                await this.complianceRTAFunctions[functionName](
                  {
                    ...requiredProjectDetails,
                    ...data,
                  },
                  fetchedAllContents,
                  fetchedAllRules,
                  retentionTrustAccount,
                );
              const redColourCode = complianceResultsOfActiveChecksInRTA.filter(
                (result) => result.display_message_colour == '#ff1042',
              );
              const yellowColourCode =
                complianceResultsOfActiveChecksInRTA.filter(
                  (result) => result.display_message_colour == '#ffc810',
                );

              const colourCodeOfCheck = redColourCode.length
                ? '#ff1042'
                : yellowColourCode.length
                  ? '#ffc810'
                  : '#08b560';
              complianceResults.push({
                check_number:
                  complianceResultsOfActiveChecksInRTA[0]?.check_number,
                check_colour_code: colourCodeOfCheck,
                results: complianceResultsOfActiveChecksInRTA,
              });
            }

            const inactiveComplianceChecks = checksOfRTA.filter(
              (check) => check.is_active === false,
            );
            for (let i = 0; i < inactiveComplianceChecks.length; i++) {
              const functionName = await this.changeCheckNameToCamelCase(
                inactiveComplianceChecks[i].check_name,
              );
              const complianceResultsOfInActiveChecksInRTA =
                await this.complianceRTAFunctions[functionName](
                  {
                    ...requiredProjectDetails,
                    ...data,
                  },
                  retentionTrustAccount,
                );

              for (
                let j = 0;
                j < complianceResultsOfInActiveChecksInRTA.length;
                j++
              ) {
                if (complianceResultsOfInActiveChecksInRTA.length - j == 1) {
                  delete complianceResultsOfInActiveChecksInRTA[j]
                    .action_button_type;
                  delete complianceResultsOfInActiveChecksInRTA[j].check_status;
                  delete complianceResultsOfInActiveChecksInRTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInRTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInRTA[j].rule_number;
                  delete complianceResultsOfInActiveChecksInRTA[j]
                    .display_message_colour;
                  complianceResultsOfInActiveChecksInRTA[j].display_message =
                    'This compliance check is inactive. Please contact administrator.';
                } else {
                  delete complianceResultsOfInActiveChecksInRTA[j]
                    .action_button_type;
                  delete complianceResultsOfInActiveChecksInRTA[j].check_status;
                  delete complianceResultsOfInActiveChecksInRTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInRTA[j].reference_id;
                  delete complianceResultsOfInActiveChecksInRTA[j].rule_number;
                  delete complianceResultsOfInActiveChecksInRTA[j]
                    .display_message_colour;
                  delete complianceResultsOfInActiveChecksInRTA[j]
                    .display_message;
                }
              }
              complianceResults.push({
                check_number:
                  complianceResultsOfInActiveChecksInRTA[0]?.check_number,
                check_colour_code: null,
                results: complianceResultsOfInActiveChecksInRTA,
              });
            }
          }
          break;
      }
      this.logger.log(
        `Compliance results obtained successfully with data: ${JSON.stringify(complianceResults)}`,
      );

      const flattenedData = complianceResults.flat();
      const sortedData = flattenedData.sort(
        (a, b) => a.check_number - b.check_number,
      );

      return {
        status: 'SUCCESS',
        message: `Compliance results obtained successfully.`,
        data: sortedData,
      };
    } catch (error) {
      this.logger.error(
        `Errored while obtaining compliance results with message: ${error}`,
      );
      throw error;
    }
  }

  async changeCheckNameToCamelCase(checkName: string) {
    try {
      const upperCasedCheckName = checkName.toLowerCase();
      const allElementssOfCheckName = [];
      for (const element of upperCasedCheckName) {
        allElementssOfCheckName.push(element);
      }
      for (const [i, element] of allElementssOfCheckName.entries()) {
        if (element == ' ') {
          allElementssOfCheckName[i + 1] =
            allElementssOfCheckName[i + 1].toUpperCase();
        }
      }
      const finalResult = allElementssOfCheckName
        .filter((element) => element != ' ')
        .join('');
      return finalResult;
    } catch (error) {
      throw error;
    }
  }

  // Below function are Admin Module
  async getUserList(data: ExportExcelDataInput) {
    const { keyword, status } = data;
    const queryBuilder = this.userDetails.createQueryBuilder('user');

    if (status) {
      queryBuilder.andWhere('user.user_status = :status', { status });
    } else {
      queryBuilder.andWhere('user.user_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(user.email_id) LIKE :keyword OR CONCAT(LOWER(user.first_name), ' ', LOWER(user.last_name)) LIKE :keyword)`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }
    return queryBuilder;
  }

  // business profile
  async getCompaniesList(data: ExportExcelDataInput) {
    const { keyword, plan, blocked } = data;
    const queryBuilder = await this.companyDetails
      .createQueryBuilder('company')
      .leftJoinAndSelect(
        CompanyUserRoles,
        'role',
        `company.company_id = role.company_id and role.company_role = 'PRIMARY ADMIN' and role.status = 'Active'`,
      )
      .leftJoinAndSelect(UserDetails, 'user', `role.user_id = user.user_id`)
      .leftJoinAndSelect('company.subscriptionDetails', 'subscriptionDetails')
      .leftJoinAndSelect('subscriptionDetails.planDetails', 'planDetails')
      .where('company.is_system_added = false');

    if (plan) {
      queryBuilder.andWhere('pd.plan_name = :plan', { plan });
    }

    if (blocked !== undefined) {
      if (blocked !== null) {
        queryBuilder.andWhere('company.is_admin_blocked = :blocked', {
          blocked,
        });
      }
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(company.company_name) LIKE :keyword OR
        LOWER(company.legal_company_name) LIKE LOWER(:keyword) OR
        LOWER(company.company_email_id) LIKE LOWER(:keyword) OR
        LOWER(company.qbcc_number) LIKE LOWER(:keyword))`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }
    return queryBuilder;
  }

  async getSubscriptionPlanList(data: ExportExcelDataInput) {
    const queryBuilder = await this.subscriptionPlanDetails
      .createQueryBuilder('pd')
      .leftJoinAndSelect('pd.pricingPlan', 'subscriptionPricingPlan')
      .leftJoinAndSelect('pd.planItem', 'pi')
      .leftJoinAndSelect('pi.item', 'subscriptionItems');

    if (data.status) {
      queryBuilder.andWhere(`pd.plan_status = :status`, {
        status: data.status,
      });
    }

    if (data.plan_type) {
      queryBuilder.andWhere('pd.plan_type = :plan_type', {
        plan_type: data.plan_type,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `LOWER(pd.plan_name) LIKE LOWER(:keyword)
          `,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
    }

    if (data.is_alphabetical_order) {
      queryBuilder.orderBy({ 'pd.plan_name': 'ASC' });
    } else {
      queryBuilder.orderBy({ 'pd.created_on': 'DESC' });
    }

    return queryBuilder;
  }

  async getSubscriptionItemList(data: ExportExcelDataInput) {
    const { keyword, status } = data;
    const queryBuilder = this.subscriptionItems.createQueryBuilder('subitems');

    if (status) {
      queryBuilder.andWhere('subitems.item_status = :itemStatus', {
        itemStatus: status,
      });
    } else {
      queryBuilder.andWhere('subitems.item_status != :status', {
        status: 'Deleted',
      });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(subitems.item_name) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }
    return queryBuilder;
  }

  async getHolidaysList(data: ExportExcelDataInput) {
    const { keyword, status } = data;
    const queryBuilder = this.holidayDetails.createQueryBuilder('holiday');

    if (status) {
      queryBuilder.andWhere('holiday.holiday_status = :status', { status });
    } else {
      queryBuilder.andWhere('holiday.holiday_status != :status', {
        status: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        'LOWER(holiday.holiday_name) LIKE LOWER(:keyword)',
        {
          keyword: `%${keyword.toLowerCase()}%`,
        },
      );
    }
    return queryBuilder;
  }

  async getCouponsList(data: ExportExcelDataInput) {
    const { keyword, status } = data;
    const queryBuilder = this.stripeCoupons
      .createQueryBuilder('sc')
      .select([
        'sc.id as id',
        'sc.coupon_id as coupon_id',
        'sc.stripe_coupon_id as stripe_coupon_id',
        'sc.coupon_name as coupon_name',
        'sc.percent_off as percent_off',
        'sc.duration as duration',
        'sc.duration_in_months as duration_in_months',
        'sc.coupon_status as coupon_status',
        'sc.created_on as created_on',
        'sc.created_by as created_by',
        'sc.updated_on as updated_on',
        'sc.created_group as created_group',
      ]);

    if (keyword) {
      queryBuilder.andWhere('sc.coupon_name ILIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('sc.coupon_status = :itemStatus', {
        itemStatus: status,
      });
    } else {
      queryBuilder.andWhere('sc.coupon_status NOT IN (:...status)', {
        status: ['Deleted', 'Inactive'],
      });
    }
    return queryBuilder;
  }

  async getSubscribedUserList(data: ExportExcelDataInput) {
    const { timezone } = data;

    const queryBuilder = await this.subscriptionDetails
      .createQueryBuilder('sd')
      .innerJoinAndSelect('sd.companyDetails', 'companyDetails')
      .innerJoinAndSelect('sd.planDetails', 'planDetails')
      .leftJoinAndSelect('sd.pricingPlan', 'pricingPlan')
      .where(`planDetails.plan_type = 'Paid'`);

    if (data.company_id) {
      queryBuilder.andWhere('sd.company_id = :company_id', {
        company_id: data.company_id,
      });
    }

    if (data.status) {
      queryBuilder.andWhere(`sd.status = :status`, {
        status: data.status,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `LOWER(companyDetails.company_name) LIKE LOWER(:keyword)
          `,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
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
      queryBuilder.andWhere('sd.updated_on BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    return queryBuilder;
  }

  async getPaymentHistoryByCompanyId(data: ExportExcelDataInput) {
    const { timezone } = data;
    const skip = (data.page_number - 1) * data.page_size;

    const queryBuilder = await this.subscriptionTransaction
      .createQueryBuilder('payment')
      .distinct(true)
      .leftJoinAndSelect('payment.subscriptionDetails', 'subscription')
      .leftJoinAndSelect(
        CompanyDetails,
        'company',
        'subscription.company_id = company.company_id',
      );

    if (data.company_id) {
      queryBuilder.andWhere(`subscription.company_id = :companyId`, {
        companyId: data.company_id,
      });
    }

    if (data.status) {
      queryBuilder.andWhere(`payment.status = :status`, {
        status: data.status,
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
      }
      queryBuilder.andWhere(
        'payment.paid_at BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    return queryBuilder;
  }

  async getBankAccountsForJournalsList(data: ExportExcelDataInput) {
    // Main Query
    const queryBuilder = this.bankAccountsRepo
      .createQueryBuilder('ba')
      .leftJoinAndSelect('ba.companyId', 'company')
      .innerJoinAndSelect('ba.journalEntries', 'journal')
      .leftJoinAndSelect(
        CompanyUserRoles,
        'r',
        `r.company_id = ba.company_id AND r.company_role = 'PRIMARY ADMIN' AND r.status = 'Active'`,
      )
      .leftJoinAndSelect(
        UserDetails,
        'u',
        `u.user_id = r.user_id AND u.user_status = 'Active'`,
      )
      .where(
        `ba.added_by_client_supplier = false AND ba.status NOT IN ('Draft', 'Deleted')`,
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

    return queryBuilder;
  }

  async getDelegatedAccountList(data: ExportExcelDataInput) {
    const { company_id, bank_account_id } = data;

    const queryBuilder = await this.bankAccountsRepo
      .createQueryBuilder('banks')
      .leftJoinAndSelect('banks.companyId', 'company')
      .where('banks.delegate_powers = :degatePower', { degatePower: 'Yes' });

    if (company_id) {
      queryBuilder.andWhere('(company.company_id = :company_id)', {
        company_id,
      });
    }

    if (bank_account_id) {
      queryBuilder.andWhere('(banks.bank_account_id = :bank_account_id)', {
        bank_account_id,
      });
    }

    return queryBuilder;
  }

  async getContactList(data: ExportExcelDataInput) {
    const { date_filter, start_date, end_date, search, status, timezone } =
      data;

    const queryBuilder = this.contactSubmissions.createQueryBuilder('c');

    if (search) {
      const keywords = search.split(/\s+/);
      keywords.forEach((keyword, index) => {
        const param = `search_${index}`;
        if (index === 0) {
          queryBuilder.where('c.name ILIKE :search', {
            search: `%${keyword}%`,
          });
        } else {
          queryBuilder.orWhere(`c.name ILIKE :${param}`, {
            [param]: `%${keyword}%`,
          });
        }
      });
    }

    if (status) {
      queryBuilder.andWhere('c.status = :status', { status });
    }

    if (date_filter && timezone) {
      let startDate, endDate;
      if (date_filter === 'Custom' && start_date && end_date) {
        startDate = moment
          .tz(start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment.tz(end_date, timezone).endOf('day').utc().toDate();
      } else if (date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (date_filter === 'Last Month') {
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
      queryBuilder.andWhere('c.created_on BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return queryBuilder;
  }

  async getContentPageList(data: ExportExcelDataInput) {
    const { keyword, pageType } = data;
    const queryBuilder = this.contentDetails.createQueryBuilder('content');
    if (pageType) {
      queryBuilder.andWhere('content.pageType = :pageType', { pageType });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(content.heading) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }
    return queryBuilder;
  }

  async getFAQsList(data: ExportExcelDataInput) {
    const { keyword, category, faq_status } = data;
    const queryBuilder = this.faqDetails.createQueryBuilder('faq');
    queryBuilder
      .leftJoinAndSelect('faq.category', 'category')
      .where('faq.faq_status != :status', { status: 'Deleted' });

    if (faq_status) {
      queryBuilder.andWhere('faq.faq_status = :faq_status', { faq_status });
    }
    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(faq.question) LIKE :keyword OR LOWER(faq.answer) LIKE :keyword)`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }
    if (category) {
      queryBuilder.andWhere('category.value = :category', { category });
      queryBuilder.orderBy({ 'faq.categoryOrder': 'ASC' });
    } else {
      queryBuilder.orderBy({ 'faq.globalOrder': 'ASC' });
    }
    return queryBuilder;
  }

  async getMailTemplateList(data: ExportExcelDataInput) {
    const { keyword, category, mailType, skip, take } = data;
    const queryBuilder = this.emailTemplates.createQueryBuilder('mails');
    if (category) {
      queryBuilder.andWhere('mails.category = :category', { category });
    }
    if (mailType) {
      queryBuilder.andWhere('mails.email_type = :mailType', { mailType });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(mails.email_subject) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }
    return queryBuilder;
  }

  async getBlogList(data: ExportExcelDataInput) {
    const { timezone } = data;
    const queryBuilder = this.blogResource.createQueryBuilder('blog');
    queryBuilder.leftJoinAndSelect('blog.category', 'category');
    queryBuilder.leftJoinAndSelect('blog.comment', 'comment');
    queryBuilder.leftJoinAndSelect('blog.author', 'author');
    queryBuilder.leftJoinAndSelect('blog.attachment', 'attachment');
    queryBuilder.leftJoinAndSelect('blog.banner', 'banner');
    if (data.status) {
      queryBuilder.andWhere('blog.blog_status = :status', {
        status: data.status,
      });
    } else {
      queryBuilder.andWhere('blog.blog_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }
    if (data.category) {
      queryBuilder.andWhere('category.value = :category', {
        category: data.category,
      });
    }
    if (data.author) {
      queryBuilder.andWhere('author.id = :id', {
        id: data.author,
      });
    }
    if (data.contentType) {
      queryBuilder.andWhere('blog.content_type = :contentType', {
        contentType: data.contentType,
      });
    }
    if (data.keyword) {
      queryBuilder.andWhere(`(LOWER(blog.title) LIKE :keyword)`, {
        keyword: `%${data.keyword.toLowerCase()}%`,
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
      }
      queryBuilder.andWhere(
        `(blog.published_on BETWEEN :start_date AND :end_date OR blog.created_on BETWEEN :start_date AND :end_date)`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    return queryBuilder;
  }

  async getAdminUserList(data: ExportExcelDataInput) {
    const { keyword, status } = data;
    const queryBuilder = this.adminDetails.createQueryBuilder('admin');

    if (status) {
      queryBuilder.andWhere('admin.admin_status = :status', { status });
    } else {
      queryBuilder.andWhere('admin.admin_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(admin.email_id) LIKE :keyword OR CONCAT(LOWER(admin.first_name), ' ', LOWER(admin.last_name)) LIKE :keyword)`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }

    return queryBuilder;
  }

  async getGroupList(data: ExportExcelDataInput) {
    const { keyword, status, isAlphabeticalOrder } = data;
    const queryBuilder = this.admingroupdetails.createQueryBuilder('group');

    if (status) {
      queryBuilder.andWhere('group.group_status = :status', { status });
    } else {
      // Exclude groups with "Deleted" status when no specific status is provided
      queryBuilder.andWhere('group.group_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere('LOWER(group.group_name) LIKE :keyword', {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    // Set the ordering based on the isAlphabeticalOrder flag
    if (isAlphabeticalOrder) {
      queryBuilder.orderBy('group.group_name', 'ASC');
    } else {
      queryBuilder.orderBy('group.created_on', 'DESC');
    }

    return queryBuilder;
  }

  async getVariationList(data: ExportExcelDataInput) {
    const { timezone } = data;
    const excludedStatus = ['Archived', 'Deleted'];

    const queryBuilder = this.variationDetails
      .createQueryBuilder('variation')
      .distinct(true)
      .innerJoinAndSelect('variation.projectDetails', 'project')
      .innerJoinAndSelect('variation.contractDetails', 'contract');

    queryBuilder.where(`variation.company_id = :companyId`, {
      companyId: data.company_id,
    });

    if (data.variation_status) {
      if (data.variation_status === 'Archived') {
        queryBuilder.andWhere(
          '(variation.variation_status IN(:...excludedStatus) OR variation.is_archived = true)',
          {
            excludedStatus: excludedStatus,
          },
        );
      } else {
        queryBuilder.andWhere(
          'variation.variation_status = :variation_status',
          {
            variation_status: data.variation_status,
          },
        );
      }
    } else {
      queryBuilder.andWhere(
        'variation.variation_status NOT IN(:...excludedStatus) AND variation.is_archived = false',
        { excludedStatus: excludedStatus },
      );
    }

    if (data.project_id) {
      queryBuilder.andWhere('variation.project_id = :project_id', {
        project_id: data.project_id,
      });
    }

    if (data.contract_id) {
      queryBuilder.andWhere('variation.contract_id = :contract_id', {
        contract_id: data.contract_id,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `(LOWER(variation.variation_name) LIKE LOWER(:keyword))`,
        { keyword: `%${data.search.toLowerCase()}%` },
      );
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
      }
      queryBuilder.andWhere(
        'variation.created_on BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    return queryBuilder;
  }

  async getClientSuppliersListByProjectId(data: ExportExcelDataInput) {
    const { timezone } = data;
    const company_id = data.company_id;

    const queryBuilder = await this.clientSuppliersDetails
      .createQueryBuilder('cs')
      .distinct(true)
      .innerJoinAndSelect('cs.contractDetails', 'contractDetails')
      .where(`cs.company_id = :companyId`, {
        companyId: company_id,
      })
      .andWhere("cs.client_supplier_status = 'Completed'")
      .andWhere('cs.is_deleted = false')
      .andWhere(`contractDetails.project_id = :project_id`, {
        project_id: data.project_id,
      });

    if (data.client_supplier_type) {
      queryBuilder.andWhere('cs.client_supplier_type = :client_supplier_type', {
        client_supplier_type: data.client_supplier_type,
      });
    }

    if (data.search) {
      queryBuilder.andWhere(
        `(LOWER(cs.client_supplier_name) LIKE LOWER(:keyword))`,
        {
          keyword: `%${data.search.toLowerCase()}%`,
        },
      );
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
      }
      queryBuilder.andWhere('cs.created_on BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    return queryBuilder;
  }

  async getJournalByAccountId(payload: any) {
    return await this.journalsService.fetchLedgerJournalsByAccountId(
      payload,
      payload?.decodedToken,
    );
  }

  async getLedgerByAccountId(data: any) {
    return await this.journalsService.fetchAccountLedgerByAccountId(
      data,
      data?.decodedToken,
    );
  }

  async getTrialBalanceStatement(data: any) {
    return await this.journalsService.fetchLedgerTrialBalanceByAccountId(
      data,
      data?.decodedToken,
    );
  }

  async getDepositAndWithdrawal(data: any) {
    return await this.journalsService.fetchDepositsAndWithdrawalsByAccountId(
      data,
      data?.decodedToken,
    );
  }

  async getDummyList() {
    return this.dummyTable.createQueryBuilder('d').distinct(true);
  }
}
