import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { jwtConstants } from 'src/api/auth/constants';
import * as jwt from 'jsonwebtoken';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { Repository } from 'typeorm';
import {
  AuditReportModuleEnum,
  AuditReportServiceInput,
} from './dto/export-audit-report.input';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import {
  BankAccounts,
  BankStatements,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import axios from 'axios';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { format } from 'date-fns';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { GenerateABAFileHistory } from 'src/entities/generate-aba-history.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { JournalsService } from 'src/api/users/banking/journals/journals.service';
import { ExportDataService } from './export-data.service';
import { ExportExcelDataInput } from './dto/export-data-excel.input';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { Readable } from 'stream';
var moment = require('moment-timezone');

@Injectable()
export class AuditReportExportDataService {
  private readonly jwtSecret = jwtConstants.secret;
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(BankAccounts)
    private bankAccounts: Repository<BankAccounts>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(NoticeDetails)
    private noticeDetails: Repository<NoticeDetails>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(BankStatements)
    private bankStatements: Repository<BankStatements>,
    @InjectRepository(GenerateABAFileHistory)
    private generateABAFileHistory: Repository<GenerateABAFileHistory>,
    @InjectRepository(JournalEntries)
    private journalsRepo: Repository<JournalEntries>,
    @InjectRepository(FileAttachments)
    private readonly fileAttachments: Repository<FileAttachments>,

    private journalsService: JournalsService,
    private exportDataService: ExportDataService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('AUDIT_REPORT_EXPORT_DATA_SERVICE');
  }

  private async getFileName(payload: Partial<AuditReportServiceInput>) {
    const { start_date, end_date, bank_account_id, project_id } = payload;
    let fileName = 'data';

    switch (payload.module_name) {
      case AuditReportModuleEnum.AuditReport:
        {
          let bankName = null,
            projectName = null,
            startDate = new Date(start_date).toISOString().slice(0, 10),
            endDate = new Date(end_date).toISOString().slice(0, 10);
          const bank = await this.getBankDetail({ bank_account_id });
          if (bank) bankName = bank?.account_name;
          if (project_id) {
            const project = await this.getProjectDetail({ project_id });
            if (project) {
              projectName = project?.project_name;
            }
          }
          if (projectName) {
            fileName = `Audit Pack - ${bankName} - ${projectName} - ${startDate} - ${endDate}`;
          } else {
            fileName = `Audit Pack - ${bankName} - ${startDate} - ${endDate}`;
          }
        }
        break;
    }

    return { fileName };
  }

  private getCustomHeadersMaster(
    data: any,
  ): Array<{ header: string; key: string }> {
    const { module_name } = data;
    let headers = [];

    switch (module_name) {
      case AuditReportModuleEnum.Contract:
        {
          headers = [
            { key: 'contract_id', header: 'Contract ID' },
            { key: 'contract_name', header: 'Contract name' },
            { key: 'file_name', header: 'Document Name' },
            { key: 'contract_status', header: 'Contract status' },
          ];
        }
        break;
      case AuditReportModuleEnum.Variation:
        {
          headers = [
            { key: 'variation_id', header: 'Variation ID' },
            { key: 'variation_name', header: 'Variation Name' },
            { key: 'contract_name', header: 'Contract name' },
            { key: 'file_name', header: 'Document Name' },
            { key: 'variation_status', header: 'Variation status' },
          ];
        }
        break;
      case AuditReportModuleEnum.ClientPaymentClaim:
        {
          headers = [
            { key: 'payment_claim_id', header: 'Claim ID' },
            { key: 'cash_retention_type', header: 'Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'contract_name', header: 'Contract Name' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
            { key: 'status', header: 'Status' },
          ];
        }
        break;
      case AuditReportModuleEnum.ClientNotice:
        {
          headers = [
            { key: 'notice_type', header: 'Notice Type' },
            { key: 'notice_source', header: 'Notice Source' },
            { key: 'notice_date', header: 'Notice Date' },
            { key: 'status', header: 'Status' },
            { key: 'uploaded_notice_details', header: 'Uploaded Notice File' },
            { key: 'support_file_details', header: 'Supporting File' },
          ];
        }
        break;
      case AuditReportModuleEnum.ReceivedNotice:
        {
          headers = [
            { key: 'notice_type', header: 'Notice Type' },
            { key: 'notice_date', header: 'Notice Date' },
            { key: 'status', header: 'Status' },
            { key: 'uploaded_notice_details', header: 'Uploaded Notice File' },
          ];
        }
        break;

      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        {
          headers = [
            { key: 'payment_claim_id', header: 'Claim ID' },
            { key: 'cash_retention_type', header: 'Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'status', header: 'Status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        {
          headers = [
            { key: 'payment_id', header: 'Payment ID' },
            { key: 'payment_type', header: 'Payment Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'retention_amount_with_gst', header: 'Retention Amount' },
            { key: 'retention_release_date', header: 'Retention Release Date' },
            { key: 'payment_amount', header: 'Payment Amount' },
            { key: 'status', header: 'Status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.BankStatement:
        {
          headers = [
            { key: 'bank_statement_name', header: 'Bank Statement Name' },
            { key: 'statement_date', header: 'Statement Date' },
            { key: 'file_name', header: 'File Name' },
          ];
        }
        break;
      case AuditReportModuleEnum.PaymentInstructionFile:
        {
          headers = [
            { key: 'payment_date', header: 'Payment Name' },
            { key: 'total_amount', header: 'Total Amount' },
            { key: 'aba_file_name', header: 'ABA File Name' },
          ];
        }
        break;
      case AuditReportModuleEnum.AccountingRecords: {
        headers = [
          { key: 'file_name', header: 'File Name' },
          { key: 'description', header: 'Description' },
        ];
        break;
      }
    }
    return headers;
  }

  private getCustomHeaders(data: any): Array<{ header: string; key: string }> {
    const { module_name } = data;
    let headers = [];

    switch (module_name) {
      case AuditReportModuleEnum.ContractWithClient:
        {
          headers = [
            { key: 'contract_id', header: 'Contract ID' },
            { key: 'contract_name', header: 'Contract name' },
            { key: 'client_supplier_role', header: 'Client supplier role' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_date', header: 'Contract date' },
            { key: 'contract_status', header: 'Contract status' },
          ];
        }
        break;
      case AuditReportModuleEnum.Contract:
        {
          headers = [
            { key: 'contract_id', header: 'Contract ID' },
            { key: 'contract_name', header: 'Contract name' },
            { key: 'client_supplier_role', header: 'Client supplier role' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_date', header: 'Contract date' },
            { key: 'contract_status', header: 'Contract status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.ContractWithSupplier:
        {
          headers = [
            { key: 'contract_id', header: 'Contract ID' },
            { key: 'contract_name', header: 'Contract name' },
            { key: 'client_supplier_role', header: 'Client supplier role' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_date', header: 'Contract date' },
            { key: 'contract_status', header: 'Contract status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.Variation:
        {
          headers = [
            { key: 'created_on', header: 'Date Created' },
            { key: 'variation_id', header: 'Variation ID' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'variation_amount', header: 'Variation Amount' },
            { key: 'variation_status', header: 'status' },
          ];
        }
        break;
      case AuditReportModuleEnum.ClientPaymentClaim:
        {
          headers = [
            { key: 'payment_claim_id', header: 'Claim ID' },
            { key: 'claim_date', header: 'Received/Sent Date' },
            { key: 'cash_retention_type', header: 'Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'client_supplier_name', header: 'Supplier/Client' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'due_date', header: 'Due Date' },
            { key: 'claim_amount', header: 'Total Claim (Gross of GST)' },
            { key: 'status', header: 'Status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.ClientNotice:
        {
          headers = [
            { key: 'notice_date', header: 'Date Uploaded' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'account_name', header: 'Account Name' },
            { key: 'notice_type', header: 'Notice Type' },
            { key: 'notice_source', header: 'Notice Source' },
            { key: 'status', header: 'Status' },
            { key: 'uploaded_notice_details', header: 'Uploaded Notice File' },
            { key: 'support_file_details', header: 'Supporting File' },
          ];
        }
        break;
      case AuditReportModuleEnum.ReceivedNotice:
        {
          headers = [
            { key: 'notice_date', header: 'Date Generated' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'account_name', header: 'Account Name' },
            { key: 'notice_type', header: 'Notice Type' },
            ,
            { key: 'status', header: 'Status' },
            { key: 'uploaded_notice_details', header: 'Uploaded Notice File' },
          ];
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        {
          headers = [
            { key: 'payment_claim_id', header: 'Claim ID' },
            { key: 'claim_date', header: 'Received/Sent Date' },
            { key: 'cash_retention_type', header: 'Type' },
            { key: 'claim_type', header: 'Billable/Receivable' },
            { key: 'client_supplier_name', header: 'Supplier/Client' },
            { key: 'project_name', header: 'Project Name' },
            { key: 'contract_name', header: 'Contract Name' },
            { key: 'due_date', header: 'Due Date' },
            { key: 'claim_amount', header: 'Total Claim (Gross of GST)' },
            { key: 'status', header: 'Status' },
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        {
          headers = [
            { key: 'payment_id', header: 'Payment ID' },
            { key: 'payment_date', header: 'Payment Date' },
            { key: 'payment_type', header: 'Payment Type' },
            { key: 'retention_amount_with_gst', header: 'Retention Amount' },
            { key: 'retention_release_date', header: 'Retention Release Date' },
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
            {
              key: 'compulsory_attachment_names',
              header: 'Supporting Attachment Name',
            },
            {
              key: 'optional_attachment_names',
              header: 'Optional Attachment Name',
            },
          ];
        }
        break;
      case AuditReportModuleEnum.BankStatement:
        {
          headers = [
            { key: 'statement_date', header: 'Statement Date' },
            { key: 'created_on', header: 'Added on Date' },
            { key: 'bank_statement_name', header: 'View' },
          ];
        }
        break;
      case AuditReportModuleEnum.PaymentInstructionFile:
        {
          headers = [
            { key: 'payment_date', header: 'Payment Name' },
            { key: 'total_amount', header: 'Total Amount' },
            { key: 'aba_file_name', header: 'ABA File Name' },
          ];
        }
        break;
      case AuditReportModuleEnum.AccountingRecords:
        {
          headers = [
            { key: 'accounting_record_name', header: 'Accounting Record Name' },
            { key: 'record_type', header: 'Record Type' },
            { key: 'record_date', header: 'Record Date' },
            { key: 'file_name', header: 'File Name' },
          ];
        }
        break;
    }
    return headers;
  }

  private async addHeadersToWorksheetMaster({
    module_name,
    worksheet,
    customHeaders,
  }: {
    module_name;
    worksheet: ExcelJS.Worksheet;
    customHeaders: Array<{ header: string; key: string }>;
    sheetName?: string;
  }) {
    const headers = customHeaders.map(({ header }) => header);

    const headerRow = worksheet.addRow(headers);

    // Apply styling to headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    switch (module_name) {
      case AuditReportModuleEnum.Contract:
        worksheet.columns = [
          { width: 15 }, // contract_id
          { width: 25 }, // contract_name
          { width: 25 }, // file_name
          { width: 20 }, // contract_status
        ];
        break;

      case AuditReportModuleEnum.Variation:
        worksheet.columns = [
          { width: 15 }, // variation_id
          { width: 25 }, // variation_name
          { width: 25 }, // contract_name
          { width: 25 }, // file_name
          { width: 20 }, // variation_status
        ];
        break;

      case AuditReportModuleEnum.ClientPaymentClaim:
        worksheet.columns = [
          { width: 15 }, // claim_id
          { width: 20 }, // cash_retention_type
          { width: 20 }, // claim_type
          { width: 25 }, // contract_name
          { width: 30 }, // compulsory_attachment_names
          { width: 30 }, // optional_attachment_names
          { width: 20 }, // status
        ];
        break;

      case AuditReportModuleEnum.ClientNotice:
        worksheet.columns = [
          { width: 25 }, // notice_type
          { width: 25 }, // notice_source
          { width: 20 }, // notice_date
          { width: 20 }, // status
          { width: 35 }, // uploaded_notice_details
          { width: 35 }, // support_file_details
        ];
        break;

      case AuditReportModuleEnum.ReceivedNotice:
        worksheet.columns = [
          { width: 25 }, // notice_type
          { width: 20 }, // notice_date
          { width: 20 }, // status
          { width: 35 }, // uploaded_notice_details
        ];
        break;

      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        worksheet.columns = [
          { width: 15 }, // claim_id
          { width: 20 }, // cash_retention_type
          { width: 20 }, // claim_type
          { width: 25 }, // contract_name
          { width: 20 }, // status
          { width: 30 }, // compulsory_attachment_names
          { width: 30 }, // optional_attachment_names
        ];
        break;

      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        worksheet.columns = [
          { width: 15 }, // payment_id
          { width: 20 }, // payment_type
          { width: 20 }, // claim_type
          { width: 20 }, // retention_amount_with_gst
          { width: 20 }, // retention_release_date
          { width: 20 }, // payment_amount
          { width: 20 }, // status
          { width: 30 }, // compulsory_attachment_names
          { width: 30 }, // optional_attachment_names
        ];
        break;

      case AuditReportModuleEnum.BankStatement:
        worksheet.columns = [
          { width: 30 }, // bank_statement_name
          { width: 20 }, // statement_date
          { width: 30 }, // file_name
        ];
        break;

      case AuditReportModuleEnum.PaymentInstructionFile:
        worksheet.columns = [
          { width: 25 }, // payment_date
          { width: 20 }, // total_amount
          { width: 30 }, // aba_file_name
        ];
        break;

      case AuditReportModuleEnum.AccountingRecords:
        worksheet.columns = [
          { width: 30 }, // file_name
          { width: 40 }, // description
        ];
        break;
    }
  }

  private async addHeadersToWorksheet({
    module_name,
    worksheet,
    customHeaders,
    payload,
  }: {
    module_name;
    worksheet: ExcelJS.Worksheet;
    customHeaders: Array<{ header: string; key: string }>;
    payload?: AuditReportServiceInput;
  }) {
    const headers = customHeaders.map(({ header }) => header);

    const headerRow = worksheet.addRow(headers);

    // Apply styling to headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // set width for each column
    switch (module_name) {
      case AuditReportModuleEnum.ContractWithClient:
      case AuditReportModuleEnum.ContractWithSupplier:
        {
          worksheet.columns = [
            { width: 15 }, // contract_id
            { width: 25 }, // contract_name
            { width: 20 }, // client_supplier_role
            { width: 15 }, // contract_date
            { width: 20 }, // contract_status
            { width: 20 }, // project_name
            { width: 35 }, // compulsory_attachment_names
            { width: 35 }, // optional_attachment_names
          ];
        }
        break;

      case AuditReportModuleEnum.Variation:
        {
          worksheet.columns = [
            { width: 15 }, // created_on
            { width: 20 }, // variation_id
            { width: 25 }, // project_name
            { width: 20 }, // contract_name
            { width: 25 }, // variation_amount
            { width: 20 }, // variation_status
          ];
        }
        break;
      case AuditReportModuleEnum.ClientPaymentClaim:
      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        {
          worksheet.columns = [
            { width: 20 }, // claim_id
            { width: 20 }, // claim_date
            { width: 20 }, // cash_retention_type
            { width: 25 }, // claim_type
            { width: 25 }, // client_supplier_name
            { width: 25 }, // project_name
            { width: 25 }, // contract_name
            { width: 20 }, // due_date
            { width: 30 }, // claim_amount
            { width: 20 }, // status
            { width: 35 }, // compulsory_attachment_names
            { width: 35 }, // optional_attachment_names
          ];
        }
        break;
      case AuditReportModuleEnum.ClientNotice:
        {
          worksheet.columns = [
            { width: 30 }, // for notice_date
            { width: 30 }, // for project_name
            { width: 30 }, // for account_name
            { width: 50 }, // for notice_type
            { width: 40 }, // for notice_source
            { width: 20 }, // for status
            { width: 35 }, // uploaded_notice_details
            { width: 35 }, // support_file_details
          ];
        }
        break;
      case AuditReportModuleEnum.ReceivedNotice:
        {
          worksheet.columns = [
            { width: 30 }, // for notice_date
            { width: 30 }, // for project_name
            { width: 30 }, // for account_name
            { width: 40 }, // for notice_source
            { width: 20 }, // for status
            { width: 35 }, // uploaded_notice_details
          ];
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        {
          worksheet.columns = [
            { width: 15 }, // for payment_date
            { width: 20 }, // for payment_type
            { width: 20 }, // retention_amount_with_gst
            { width: 20 }, // retention_release_date
            { width: 25 }, // for project_name
            { width: 25 }, // for contract_name
            { width: 30 }, // for payment_from_account_name
            { width: 30 }, // for payment_to_account_name
            { width: 20 }, // for payment_amount
            { width: 25 }, // for status
          ];
        }
        break;
      case AuditReportModuleEnum.BankStatement:
        {
          worksheet.columns = [
            { width: 20 }, // for statement_date
            { width: 20 }, // for created_on
            { width: 40 }, // for bank_statement_name
          ];
        }
        break;
      case AuditReportModuleEnum.PaymentInstructionFile:
        worksheet.columns = [
          { width: 30 }, // payment_date
          { width: 20 }, // total_amount
          { width: 30 }, // aba_file_name
        ];
        break;

      case AuditReportModuleEnum.AccountingRecords:
        worksheet.columns = [
          { width: 30 }, // accounting_record_name
          { width: 20 }, // record_type
          { width: 20 }, // record_date
          { width: 30 }, // file_name
        ];
        break;
    }
  }

  private addDataToWorksheet({
    worksheet,
    data,
    customHeaders,
    payload,
  }: {
    worksheet: ExcelJS.Worksheet;
    data: any[];
    customHeaders: Array<{ header: string; key: string }>;
    payload?: AuditReportServiceInput;
  }) {
    const rows = data.map((item) => {
      return customHeaders.map(({ key }) => {
        return item[key] !== undefined && item[key] !== null ? item[key] : '';
      });
    });

    // Add data rows to worksheet
    rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.addRow(row);

      row.forEach((value, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        const dateFieldNames = [
          'contract_date',
          'created_on',
          'claim_date',
          'due_date',
          'payment_date',
          'statement_date',
          'record_date',
          'retention_release_date',
        ];
        if (dateFieldNames.includes(customHeaders[colIndex].key) && value) {
          // Apply explicit date format to the cell
          cell.value = new Date(value); // Ensure it's treated as a date
          cell.numFmt = 'DD/MM/YYYY'; // Set the desired date format
        }

        const currencyFieldNames = [
          'variation_amount',
          'claim_amount',
          'payment_amount',
          'total_amount',
          'retention_amount_with_gst',
        ];
        if (currencyFieldNames.includes(customHeaders[colIndex].key) && value) {
          cell.value = parseFloat(value) || 0; // Ensure value is numeric
          cell.numFmt = '"$"#,##0.00'; // Format as dollar currency
        }
      });
    });
  }

  private async getTotalRecordCount({
    payload,
  }: {
    payload: AuditReportServiceInput;
  }): Promise<number> {
    let recordCount = 0;
    switch (payload.module_name) {
      case AuditReportModuleEnum.ContractWithClient:
        {
          recordCount = await (
            await this.getClientSupplierList({
              ...payload,
              module_name: AuditReportModuleEnum.ContractWithClient,
            })
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.ContractWithSupplier:
        {
          recordCount = await (
            await this.getClientSupplierList({
              ...payload,
              module_name: AuditReportModuleEnum.ContractWithSupplier,
            })
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.ClientPaymentClaim:
        {
          recordCount = await (
            await this.getClientPaymentClaimList(payload)
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.ClientNotice:
        {
          recordCount = await (await this.getNoticesList(payload)).getCount();
        }
        break;
      case AuditReportModuleEnum.ReceivedNotice:
        {
          recordCount = await (
            await this.getNoticesList(payload, { onlyReceived: true })
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        {
          recordCount = await (
            await this.getClientPaymentClaimList(payload)
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        {
          recordCount = await (
            await this.getSupplierSubConPaymentList(payload)
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.BankStatement:
        {
          recordCount = await (
            await this.getBankStatementList(payload)
          ).getCount();
        }
        break;
      case AuditReportModuleEnum.PaymentInstructionFile:
        {
          recordCount = await (
            await this.getPaymentInstructionFileList(payload)
          ).getCount();
        }
        break;

      case AuditReportModuleEnum.AccountingRecords:
        {
          recordCount = await (
            await this.getAccountingRecordsList(payload)
          ).getCount();
        }
        break;
    }
    return recordCount;
  }

  private zipFileDetails() {
    return {
      zipName: 'Audit Report',
      readMeFile: {
        fileName: 'README.md',
      },
      folders: [
        {
          moduleName: AuditReportModuleEnum.Contract,
          insideFolder: [],
          subFolders: [
            {
              moduleName: AuditReportModuleEnum.ContractWithClient,
            },
            {
              moduleName: AuditReportModuleEnum.ContractWithSupplier,
            },
          ],
          readMeFile: {
            fileName: 'README.md',
            content: `# Contracts and Variations

This folder contains a detailed breakdown of contract-related documents and data used in the audit process.

## Structure

**Contracts with Clients**  
Contains individual client folders. Each folder includes a list of contracts associated with that client and any attached documents (PDFs, Excels, etc.).

**Contracts with Suppliers**  
Similar to the client structure, this section holds contract information for suppliers, grouped by supplier name.

## Files Included

'Contract List.xlsx' - Spreadsheet of contract records for each client/supplier.
Attached files for each contract (PDF, Excel, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.ClientPaymentClaim,
          readMeFile: {
            fileName: 'README.md',
            content: `# Claims - Client Payment

This folder contains a detailed breakdown of Client Payment Claims related documents and data used in the audit process.

## Files Included

'Client Payment Claims List.xlsx' - Spreadsheet of Client Payment Claims records.
Attached files for each Client Payment Claims (PDF, Docx, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.ClientNotice,
          readMeFile: {
            fileName: 'README.md',
            content: `# Client notices

This folder contains a detailed breakdown of Client notices related documents and data used in the audit process.

## Files Included

'Client notices List.xlsx' - Spreadsheet of Client notices.
Attached files for each Client notices (PDF, Docx, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.ReceivedNotice,
          readMeFile: {
            fileName: 'README.md',
            content: `# Received notices

This folder contains a detailed breakdown of Received notices which are manually uploaded and related documents used in the audit process.

## Files Included

'Received notices List.xlsx' - Spreadsheet of Received notices which are uploaded.
Attached files for each Client notices (PDF, Docx, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.SupplierSubConPaymentClaim,
          readMeFile: {
            fileName: 'README.md',
            content: `# Claims - Supplier-Subcontractor Payment 

This folder contains a detailed breakdown of Supplier-Subcontractor Payment Claims related documents and data used in the audit process.

## Files Included

'Supplier-Subcontractor Payment Claims List.xlsx' - Spreadsheet of Supplier-Subcontractor Payment Claims records.
Attached files for each Supplier-Subcontractor Payment Claims (PDF, Docx, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.SupplierSubConPaymentSchedule,
          readMeFile: {
            fileName: 'README.md',
            content: `# Supplier-Subcontractor Payment Schedules

This folder contains a detailed breakdown of Supplier-Subcontractor Payment Schedules related documents and data used in the audit process.

## Files Included

'Supplier-Subcontractor Payment Schedules List.xlsx' - Spreadsheet of Supplier-Subcontractor Payment Schedules records.
Attached files for each Supplier-Subcontractor Payment Schedules (PDF, Docx, etc.), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.BankStatement,
          readMeFile: {
            fileName: 'README.md',
            content: `# Bank Statements

This folder contains a detailed breakdown of Bank Statements related documents and data used in the audit process.

## Files Included

'Bank Statements List.xlsx' - Spreadsheet of Bank Statements records.
Attached files for each Bank Statements (PDF), if available.`,
          },
        },
        {
          moduleName: AuditReportModuleEnum.PaymentInstructionFile,
          readMeFile: {
            fileName: 'README.md',
            content: `# Payment Instruction Files (ABA)

This folder contains ABA files generated during payment runs and includes relevant audit metadata.

## Files Included

- Payment Instruction Files List.xlsx – Spreadsheet of ABA file generation logs.
- Attached ABA (.aba) files, if available.`,
          },
        },

        {
          moduleName: AuditReportModuleEnum.AccountingRecords,
          readMeFile: {
            fileName: 'README.md',
            content: `# Accounting Records

This folder contains multiple types of accounting data exported as a single spreadsheets.

## Files Included

accounting_records.xlsx

with sheets for:
- trial_balance
- account_ledger
- deposits_withdrawals
- journals

Each file contains records relevant to that category as part of the audit trail.
- Attached files, if available.`,
          },
        },
      ],
    };
  }

  async generateAuditReport(payload: any) {
    try {
      const expiration = Math.floor(Date.now() / 1000) + 60 * 10;
      const downloadName = await this.getFileName({
        ...payload,
        module_name: AuditReportModuleEnum.AuditReport,
      });

      const filePathLink = `audit_reports/${downloadName?.fileName}.zip`;

      const token = jwt.sign(
        {
          fileName: `${downloadName?.fileName}.zip`,
          downloadName: `${downloadName?.fileName}.zip`,
          filePath: filePathLink,
          contentType: 'application/zip',
          exp: expiration,
        },
        this.jwtSecret,
      );

      const contractClient = await this.fetchBatchData({
          payload: {
            ...payload,
            module_name: AuditReportModuleEnum.ContractWithClient,
          },
        }),
        contractSupplier = await this.fetchBatchData({
          payload: {
            ...payload,
            module_name: AuditReportModuleEnum.ContractWithSupplier,
          },
        });

      const hasRecords = async (): Promise<boolean> => {
        if (
          (Array.isArray(contractClient) && contractClient.length > 0) ||
          (Array.isArray(contractSupplier) && contractSupplier.length > 0)
        ) {
          return true;
        }

        const modulesToCheck = [
          AuditReportModuleEnum.ClientPaymentClaim,
          AuditReportModuleEnum.ClientNotice,
          AuditReportModuleEnum.ReceivedNotice,
          AuditReportModuleEnum.SupplierSubConPaymentClaim,
          AuditReportModuleEnum.SupplierSubConPaymentSchedule,
          AuditReportModuleEnum.BankStatement,
          AuditReportModuleEnum.PaymentInstructionFile,
          AuditReportModuleEnum.AccountingRecords,
        ];

        for (const module of modulesToCheck) {
          const count = await this.getTotalRecordCount({
            payload: { ...payload, module_name: module },
          });
          if (count > 0) return true;
        }

        return false;
      };

      if (await hasRecords()) {
        // Generate zip as buffer and upload to Object Storage
        const zipBuffer = await this.generateZipFileToBuffer({
          zipDetails: this.zipFileDetails(),
          payload,
        });

        // Upload to Object Storage
        await this.objectStorageService.uploadFileDirect(
          filePathLink,
          zipBuffer,
        );

        const savedFile = await this.fileAttachments.save({
          name: `${downloadName?.fileName}`,
          file_name: `${downloadName?.fileName}.zip`,
          file_path: filePathLink,
          file_type: 'application/zip',
          attachment_type: 'Audit',
          uploaded_by: 'SYSTEM',
          uploaded_group: 'SYSTEM',
          uploaded_on: moment.tz('UTC'),
        });

        const fileData = {
          file_name: `${downloadName?.fileName}.zip`,
          file_path: `/${filePathLink}`,
          file_type: 'application/zip',
          attachment_id: savedFile.id,
        };

        return {
          token: token,
          file: fileData,
        };
      } else {
        throw new Error(`Record not found`);
      }
    } catch (error) {
      this.logger.error(`Error generating audit report: ${error.message}`);
      throw error;
    }
  }

  async createExcelBuffer({
    payload,
    records,
    sheetName = 'Sheet1',
    isMultiSheet,
  }: {
    payload: AuditReportServiceInput;
    records?: any[] | Record<string, any[]>;
    sheetName?: string;
    isMultiSheet?: boolean;
  }): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();

      // Mapping for consistent, clean sheet labels
      const sheetNameMap: Record<string, string> = {
        trial_balance_by_accountId: 'Trial Balance',
        ledger_by_accountId: 'Ledger',
        deposit_withdrawal_by_accountId: 'Deposits & Withdrawals',
        journal_by_accountId: 'Journal',
      };

      const isAccountingScreen = (screen: string) =>
        [
          'journal_by_accountId',
          'ledger_by_accountId',
          'trial_balance_by_accountId',
          'deposit_withdrawal_by_accountId',
        ].includes(screen);

      // Handle accounting modules via generateExcelBuffers

      if (isMultiSheet) {
        if (payload.module_name === AuditReportModuleEnum.AccountingRecords) {
          const screenModules = [
            'journal_by_accountId',
            'ledger_by_accountId',
            'trial_balance_by_accountId',
            'deposit_withdrawal_by_accountId',
          ];
          for (const screen of screenModules) {
            const buffers: Buffer[] = [];
            const exportPayload: ExportExcelDataInput = {
              ...payload,
              screen_name: screen,
              page: 1,
              items_per_page: 5000,
              timezone: payload.timezone,
              start_date:
                screen === 'trial_balance_by_accountId'
                  ? payload.end_date
                  : payload.start_date,
              end_date: payload.end_date,
              date_filter: 'Custom',
            };

            const buffer = await this.exportDataService.generateExcelBuffers(
              exportPayload,
              0,
              5000,
              buffers,
            );

            if (!buffer || !buffers[0]) {
              this.logger.warn(`No data buffer for accounting screen: ${screen}`);
              continue;
            }
            const tempWorkbook = new ExcelJS.Workbook();
            // @ts-ignore - Buffer type compatibility issue between Node versions
            await tempWorkbook.xlsx.load(buffers[0]);

            const tempWorksheet = tempWorkbook.getWorksheet(1);
            const safeSheetName = sheetNameMap[screen] || `Sheet_${screen}`;

            // Avoid duplicate sheet error
            if (workbook.getWorksheet(safeSheetName)) {
              this.logger.warn(`Skipping duplicate sheet: ${safeSheetName}`);
              continue;
            }

            const copiedSheet = workbook.addWorksheet(safeSheetName);
            copiedSheet.model = {
              ...tempWorksheet.model,
              name: safeSheetName, // force unique name
            };
          }
          return Buffer.from(await workbook.xlsx.writeBuffer());
        }

        if (Array.isArray(records)) {
          for (const [sheetIndex, record] of records.entries()) {
            const data = record?.records ?? [];

            //attachment filess
            for (const row of data) {
              if (
                !row.compulsory_attachment_names &&
                !row.optional_attachment_names &&
                Array.isArray(row?.attachment_details)
              ) {
                const normalizeFileName = (name: string = '') =>
                  name.trim().toLowerCase();
                const compulsoryFileMap = new Map<string, string>();
                const optionalFileMap = new Map<string, string>();

                for (const f of row.attachment_details) {
                  const normalized = normalizeFileName(f?.file_name);
                  if (!normalized) continue;

                  const isCompulsory =
                    f?.attachment_type === 'Compulsory_attachments' ||
                    f?.attachment_type ===
                      'Optional_supporting_statement_attachments';

                  const isOptional =
                    f?.attachment_type === 'Optional_attachments';

                  if (isCompulsory && !compulsoryFileMap.has(normalized)) {
                    compulsoryFileMap.set(normalized, f?.file_name);
                  } else if (
                    isOptional &&
                    !compulsoryFileMap.has(normalized) && // don't allow overlap
                    !optionalFileMap.has(normalized) // avoid optional duplicates
                  ) {
                    optionalFileMap.set(normalized, f?.file_name);
                  }
                }

                // const compulsoryFiles = row.attachment_details.filter((f) => {
                //   const isCompulsory = f?.attachment_type === 'Compulsory_attachments' ||
                //     f?.attachment_type === 'Optional_supporting_statement_attachments';
                //   const normalized = normalizeFileName(f?.file_name);
                //   if (isCompulsory && normalized) {
                //     compulsoryFileMap.set(normalized, f?.file_name);
                //   }
                //   return isCompulsory;
                // });

                // const optionalFiles = row.attachment_details.filter((f) => {
                //   const isOptional = f?.attachment_type === 'Optional_attachments';
                //   const normalized = normalizeFileName(f?.file_name);
                //   return isOptional && normalized && !compulsoryFileMap.has(normalized);
                // });

                row.compulsory_attachment_names =
                  Array.from(compulsoryFileMap.values())
                    .filter(Boolean)
                    .join(', ') || '';

                row.optional_attachment_names =
                  Array.from(optionalFileMap.values())
                    .filter(Boolean)
                    .join(', ') || '';
              }
            }

            const shortSheetNameMap: Record<AuditReportModuleEnum, string> = {
              [AuditReportModuleEnum.AuditReport]: 'Audit',
              [AuditReportModuleEnum.Contract]: 'Contract',
              [AuditReportModuleEnum.ContractWithClient]: 'Client Contracts',
              [AuditReportModuleEnum.ContractWithSupplier]:
                'Supplier Contracts',
              [AuditReportModuleEnum.Variation]: 'Variation',
              [AuditReportModuleEnum.ClientPaymentClaim]: 'Client Claims',
              [AuditReportModuleEnum.ClientNotice]: 'Client Notices',
              [AuditReportModuleEnum.ReceivedNotice]: 'Received Notices',
              [AuditReportModuleEnum.SupplierSubConPaymentClaim]:
                'Supplier Claims',
              [AuditReportModuleEnum.SupplierSubConPaymentSchedule]:
                'Payment Schedules',
              [AuditReportModuleEnum.BankStatement]: 'Bank Statements',
              [AuditReportModuleEnum.PaymentInstructionFile]: 'ABA Files',
              [AuditReportModuleEnum.AccountingRecords]: 'Trust Accounting',
            };

            const rawModuleName = record?.module_name;
            const shortSheetLabel = shortSheetNameMap[rawModuleName];

            // Ensure each sheet has a unique, valid name
            const sheetLabel = this.sanitizeSheetName(
              record?.sheetName ||
                shortSheetLabel ||
                `${sheetName}_${sheetIndex + 1}`,
            );

            const worksheet = workbook.addWorksheet(sheetLabel);
            const customHeaders = this.getCustomHeadersMaster({
              module_name: rawModuleName,
            });

            await this.addHeadersToWorksheetMaster({
              worksheet,
              customHeaders,
              module_name: rawModuleName,
            });

            await this.addDataToWorksheet({
              worksheet,
              data,
              customHeaders,
            });
          }
        } else if (records && typeof records === 'object') {
          for (const [sheetLabel, data] of Object.entries(records)) {
            for (const row of data) {
              if (
                !row.compulsory_attachment_names &&
                !row.optional_attachment_names &&
                Array.isArray(row?.attachment_details)
              ) {
                const normalizeFileName = (name: string = '') =>
                  name.trim().toLowerCase();
                const compulsoryFileMap = new Map<string, string>();
                const optionalFileMap = new Map<string, string>();

                for (const f of row.attachment_details) {
                  const normalized = normalizeFileName(f?.file_name);
                  if (!normalized) continue;

                  const isCompulsory =
                    f?.attachment_type === 'Compulsory_attachments' ||
                    f?.attachment_type ===
                      'Optional_supporting_statement_attachments';

                  const isOptional =
                    f?.attachment_type === 'Optional_attachments';

                  if (isCompulsory && !compulsoryFileMap.has(normalized)) {
                    compulsoryFileMap.set(normalized, f?.file_name);
                  } else if (
                    isOptional &&
                    !compulsoryFileMap.has(normalized) && // avoid overlap
                    !optionalFileMap.has(normalized) // avoid duplicates
                  ) {
                    optionalFileMap.set(normalized, f?.file_name);
                  }
                }

                row.compulsory_attachment_names =
                  Array.from(compulsoryFileMap.values()).join(', ') || '';
                row.optional_attachment_names =
                  Array.from(optionalFileMap.values()).join(', ') || '';
              }
            }

            const worksheet = workbook.addWorksheet(sheetLabel);

            const customHeaders = this.getCustomHeaders({
              module_name: payload?.module_name,
            });

            await this.addHeadersToWorksheet({
              payload,
              worksheet,
              customHeaders,
              module_name: payload?.module_name,
            });

            await this.addDataToWorksheet({
              worksheet,
              payload,
              data,
              customHeaders,
            });
          }
        }
      } else {
        const moduleName = payload?.module_name;
        const data =
          Array.isArray(records) && records !== null
            ? records
            : await this.fetchBatchData({ payload });
        const worksheet = workbook.addWorksheet(
          payload?.module_name ?? sheetName,
        );

        const customHeaders = this.getCustomHeaders(payload);
        await this.addHeadersToWorksheet({
          payload,
          worksheet,
          customHeaders,
          module_name: moduleName,
        });
        await this.addDataToWorksheet({
          worksheet,
          payload,
          data,
          customHeaders,
        });
      }

      return Buffer.from(await workbook.xlsx.writeBuffer());
    } catch (error) {
      const fallbackWorkbook = new ExcelJS.Workbook();
      fallbackWorkbook.addWorksheet('ErrorGeneratingSheet');
      return Buffer.from(await fallbackWorkbook.xlsx.writeBuffer());
    }
  }

  async createReadMeFile({ data, archive }: { data: any; archive: any }) {
    try {
      const readmeContent = data?.content || `Audit Report\nDocumentation`;
      const readmeBuffer = Buffer.from(readmeContent, 'utf-8');

      archive.append(readmeBuffer, {
        name: data?.path ? path.join(data.path, data.fileName) : data.fileName,
      });
    } catch (error) {
      throw error;
    }
  }

  public async fetchBatchData({
    payload,
    offset,
    limit,
  }: {
    payload: any;
    offset?: number;
    limit?: number;
  }): Promise<any[]> {
    let result = [];

    const { timezone } = payload;

    switch (payload.module_name) {
      case AuditReportModuleEnum.ContractWithClient:
      case AuditReportModuleEnum.ContractWithSupplier:
        {
          const queryBuilder = await this.getClientSupplierList(payload);
          result = await queryBuilder.getRawMany();
        }
        break;
      case AuditReportModuleEnum.ClientPaymentClaim:
      case AuditReportModuleEnum.SupplierSubConPaymentClaim:
        {
          const queryBuilder = await this.getClientPaymentClaimList(payload);
          const raw_result = await queryBuilder
            .orderBy({ 'pc.created_on': 'DESC' })
            .getRawMany();

          const formatDate = (date: Date | null, timezone: string) =>
            date
              ? moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss')
              : null;

          result = raw_result?.map((res) => ({
            payment_claim_id: res?.payment_claim_id,
            claim_date:
              res?.claim_type == 'Billable'
                ? res?.received_date
                : res?.sent_date,
            cash_retention_type: res?.cash_retention_type,
            claim_type: res?.claim_type,
            client_supplier_name: res?.client_supplier_name,
            project_name: res?.project_name,
            contract_name: res?.contract_name,
            due_date: res?.due_date,
            claim_amount: res?.claim_amount,
            status: res?.list_status,
            retention_amount: res?.retention_amount,
            attachment_details: res?.attachment_details,
          }));
        }
        break;
      case AuditReportModuleEnum.ClientNotice:
        {
          const formatDate = (date: Date | null, timezone: string) =>
            date
              ? moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss')
              : null;

          const queryBuilder = await this.getNoticesList(payload);
          const raw_result = await queryBuilder.getRawMany();
          result = raw_result?.map((res) => {
            return {
              ...res,
              notice_date: res?.notice_date
                ? formatDate(res?.notice_date, timezone)
                : null,
            };
          });
        }
        break;

      case AuditReportModuleEnum.ReceivedNotice:
        {
          const formatDate = (date: Date | null, timezone: string) =>
            date
              ? moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss')
              : null;

          const queryBuilder = await this.getNoticesList(payload, {
            onlyReceived: true,
          });
          const raw_result = await queryBuilder.getRawMany();
          result = raw_result?.map((res) => {
            return {
              ...res,
              notice_date: res?.notice_date
                ? formatDate(res?.notice_date, timezone)
                : null,
            };
          });
        }
        break;

      case AuditReportModuleEnum.SupplierSubConPaymentSchedule:
        {
          const formatDate = (date: Date | null, timezone: string) =>
            date
              ? moment(date)
                  .tz(timezone ?? 'UTC')
                  .format('YYYY-MM-DD')
              : null;

          const queryBuilder = await this.getSupplierSubConPaymentList(payload);
          const raw_result = await queryBuilder
            .orderBy({ 'pd.created_on': 'DESC' })
            .getRawMany();
          const modifiedDataList = raw_result?.map((res) => ({
            payment_id: res?.payment_id,
            payment_type: res?.payment_type,
            project_name: res?.project_name || '',
            contract_name: res?.contract_name || '',
            payment_from_account_name:
              res?.from_account_details?.account_name || '',
            payment_to_account_name:
              res?.to_account_details?.account_name || '',
            payment_amount: res?.sub_payment_details?.find(
              (ele) => ele?.sub_payment_type === 'Payment',
            )
              ? Math.abs(
                  res?.sub_payment_details?.find(
                    (ele) => ele?.sub_payment_type === 'Payment',
                  )?.amount,
                )
              : 0,
            status: res?.status,
            payment_from_account: res?.from_account_details?.bank_account_id,
            payment_to_account: res?.to_account_details?.bank_account_id,
            cash_retention_type: res?.cash_retention_type,
            claim_type: res?.claim_type,
            retention_amount_with_gst: res?.retention_amount_with_gst,
            retention_release_date: res?.retention_release_date,
            payment_date: res?.payment_date,
            attachment_details: res?.attachment_details,
          }));

          //Change payment_from_account details based upon the cash_retention_type.
          for (const payment of modifiedDataList) {
            if (
              payment.cash_retention_type == 'Retention claim' &&
              payment.claim_type == 'Billable'
            ) {
              const bankAccountDetailsFromContract = await this.bankAccounts
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
      case AuditReportModuleEnum.BankStatement:
        {
          const queryBuilder = await this.getBankStatementList(payload);
          result = await queryBuilder
            .orderBy({ 'bs.statement_date': 'DESC' })
            .getRawMany();
        }
        break;

      case AuditReportModuleEnum.PaymentInstructionFile: {
        const queryBuilder = await this.getPaymentInstructionFileList(payload);

        const raw_result = await queryBuilder
          .orderBy('h.created_on', 'DESC')
          .getMany();

        result = raw_result?.map((res) => ({
          payment_date: res?.created_on,
          // total_amount: res?.,
          aba_file_name: res?.fileAttachments.file_name,
          file_path: res?.fileAttachments?.file_path || '',
          aba_file_attachment_id: res?.aba_file_id || null,
        }));
        break;
      }

      case AuditReportModuleEnum.AccountingRecords: {
        result = [];

        const enhancedPayload = {
          ...payload,
          date_filter: 'Custom',
        };

        const journalRes =
          await this.journalsService.fetchLedgerJournalsByAccountId(
            enhancedPayload,
            enhancedPayload?.decodedToken,
          );

        if (journalRes?.data) {
          result.push({
            module_name: 'journal_by_accountId',
            sheetName: 'Journal',
            records: journalRes.data.ledger_journals_list || [],
          });
        }

        const ledgerRes =
          await this.journalsService.fetchAccountLedgerByAccountId(
            enhancedPayload,
            enhancedPayload?.decodedToken,
          );
        if (ledgerRes?.data) {
          result.push({
            module_name: 'ledger_by_accountId',
            sheetName: 'Account Ledger',
            records: ledgerRes.data.grid_entries || [],
          });
        }

        const trialBalanceRes =
          await this.journalsService.fetchLedgerTrialBalanceByAccountId(
            enhancedPayload,
            enhancedPayload?.decodedToken,
          );
        if (trialBalanceRes?.data) {
          result.push({
            module_name: 'trial_balance_by_accountId',
            sheetName: 'Trial Balance',
            records: trialBalanceRes.data.trial_balance_list || [],
          });
        }

        const depositWithdrawalsRes =
          await this.journalsService.fetchDepositsAndWithdrawalsByAccountId(
            enhancedPayload,
            enhancedPayload?.decodedToken,
          );
        if (depositWithdrawalsRes?.data) {
          result.push({
            module_name: 'deposit_withdrawal_by_accountId',
            sheetName: 'Deposits & Withdrawals',
            records: depositWithdrawalsRes.data.grid_entries || [],
          });
        }

        break;
      }
    }
    return result;
  }

  private sanitizeSheetName(name: string): string {
    return name.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
  }

  // Generate zip file to buffer for Object Storage upload
  async generateZipFileToBuffer({
    zipDetails,
    payload,
  }: {
    zipDetails: Record<string, any>;
    payload: AuditReportServiceInput;
  }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      const masterSummary = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      const addToArchive = async ({
        zipDetails,
        currentPath = '',
      }: {
        zipDetails: any[];
        currentPath?: string;
      }) => {
        type ModuleObject = {
          moduleName: string;
          subFolders: any[];
          readMeFile: {
            fileName: string;
            content: any;
          };
        };

        for (const moduleObj of zipDetails as ModuleObject[]) {
          const folderName =
            moduleObj?.moduleName === AuditReportModuleEnum.Contract
              ? 'Contracts and variations'
              : moduleObj?.moduleName;
          const modulePath = path.join(currentPath, folderName);

          // === Handle Accounting Records ===
          if (
            moduleObj?.moduleName === AuditReportModuleEnum.AccountingRecords
          ) {
            const accountingRecords = await this.fetchBatchData({
              payload: {
                ...payload,
                module_name: AuditReportModuleEnum.AccountingRecords,
              },
            });

            const formattedRecords =
              accountingRecords?.map((record) => ({
                sheetName: record.sheetName,
                records: record.records,
                module_name: record.module_name,
              })) ?? [];

            const accountingBuffer = await this.createExcelBuffer({
              payload: {
                ...payload,
                module_name: AuditReportModuleEnum.AccountingRecords,
              },
              records: formattedRecords,
              isMultiSheet: true,
            });

            archive.append(accountingBuffer, {
              name: path.join(folderName, 'Accounting Records.xlsx'),
            });

            masterSummary.push({
              module_name: AuditReportModuleEnum.AccountingRecords,
              records: [
                {
                  file_name: 'Accounting Records.xlsx',
                  description:
                    'Contains Trial Balance, Ledger, Deposits & Withdrawals, and Journal',
                },
              ],
            });

            if (moduleObj?.readMeFile?.fileName) {
              await this.createReadMeFile({
                data: {
                  ...moduleObj.readMeFile,
                  path: modulePath,
                },
                archive,
              });
            }

            continue;
          }

          if (
            moduleObj?.moduleName ===
              AuditReportModuleEnum.ClientPaymentClaim ||
            moduleObj?.moduleName === AuditReportModuleEnum.ClientNotice ||
            moduleObj?.moduleName === AuditReportModuleEnum.ReceivedNotice ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.SupplierSubConPaymentClaim ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.SupplierSubConPaymentSchedule ||
            moduleObj?.moduleName === AuditReportModuleEnum.BankStatement ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.PaymentInstructionFile
          ) {
            const records = await this.fetchBatchData({
              payload: { ...payload, module_name: moduleObj?.moduleName },
            });

            let attachments = [];

            if (moduleObj?.moduleName === AuditReportModuleEnum.BankStatement) {
              attachments = records
                ?.filter(
                  (bs) => bs?.bank_statement_attachment_id && bs?.file_path,
                )
                ?.map((f) => ({
                  attachment_id: f?.id,
                  file_path: f?.file_path,
                  file_type: f?.file_type,
                  attachment_type: f?.attachment_type,
                  file_name: f?.file_name,
                }));
            } else if (
              moduleObj?.moduleName ===
              AuditReportModuleEnum.PaymentInstructionFile
            ) {
              attachments = records
                ?.filter((r) => r?.aba_file_attachment_id && r?.file_path)
                ?.map((f) => ({
                  attachment_id: f?.aba_file_attachment_id,
                  file_path: f?.file_path,
                  file_type: f?.file_type,
                  attachment_type: 'ABA File',
                  file_name: f?.aba_file_name,
                }));
            }

            // Add Excel file for this module
            if (records?.length > 0) {
              const excelBuffer = await this.createExcelBuffer({
                payload: { ...payload, module_name: moduleObj?.moduleName },
                records,
              });
              archive.append(excelBuffer, {
                name: path.join(folderName, `${folderName}.xlsx`),
              });
            }

            // Add attachments from Object Storage
            for (const attachment of attachments) {
              if (attachment?.file_path) {
                try {
                  const fileBuffer = await this.objectStorageService.downloadFile(
                    attachment.file_path,
                  );
                  if (fileBuffer) {
                    archive.append(fileBuffer, {
                      name: path.join(folderName, 'Attachments', attachment.file_name),
                    });
                  }
                } catch (e) {
                  this.logger.error(`Failed to download attachment: ${attachment.file_path}`);
                }
              }
            }

            if (moduleObj?.readMeFile?.fileName) {
              await this.createReadMeFile({
                data: {
                  ...moduleObj.readMeFile,
                  path: modulePath,
                },
                archive,
              });
            }

            continue;
          }

          // Handle contracts with subfolders
          if (
            moduleObj?.moduleName === AuditReportModuleEnum.Contract &&
            moduleObj?.subFolders?.length
          ) {
            for (const subFolder of moduleObj.subFolders) {
              const subFolderName = subFolder?.moduleName;
              const subFolderPath = path.join(modulePath, subFolderName);

              const records = await this.fetchBatchData({
                payload: { ...payload, module_name: subFolder?.moduleName },
              });

              if (records?.length > 0) {
                const excelBuffer = await this.createExcelBuffer({
                  payload: { ...payload, module_name: subFolder?.moduleName },
                  records,
                });
                archive.append(excelBuffer, {
                  name: path.join(subFolderPath, `${subFolderName}.xlsx`),
                });

                // Add file attachments from records
                for (const record of records) {
                  if (record?.file_path) {
                    try {
                      const fileBuffer = await this.objectStorageService.downloadFile(
                        record.file_path,
                      );
                      if (fileBuffer) {
                        archive.append(fileBuffer, {
                          name: path.join(subFolderPath, 'Attachments', record.file_name),
                        });
                      }
                    } catch (e) {
                      this.logger.error(`Failed to download: ${record.file_path}`);
                    }
                  }
                }
              }

              if (subFolder?.readMeFile?.fileName) {
                await this.createReadMeFile({
                  data: {
                    ...subFolder.readMeFile,
                    path: subFolderPath,
                  },
                  archive,
                });
              }
            }

            if (moduleObj?.readMeFile?.fileName) {
              await this.createReadMeFile({
                data: {
                  ...moduleObj.readMeFile,
                  path: modulePath,
                },
                archive,
              });
            }
          }
        }
      };

      try {
        await addToArchive({ zipDetails: zipDetails.folders });

        // Add master summary
        const summaryBuffer = await this.createExcelBuffer({
          payload: { ...payload, module_name: AuditReportModuleEnum.AuditReport },
          records: masterSummary,
          sheetName: 'Summary',
        });
        archive.append(summaryBuffer, { name: 'Summary.xlsx' });

        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
  }

  // zipFromStructure - legacy method for local file system
  async generateZipFile({
    zipDetails,
    zipOutputPath,
    payload,
  }: {
    zipDetails: Record<string, any>;
    payload: AuditReportServiceInput;
    zipOutputPath: string;
  }) {
    return new Promise(async (resolve, reject) => {
      const output = fs.createWriteStream(zipOutputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      const masterSummary = [];

      archive.pipe(output);

      output.on('close', () => {
        resolve(true);
      });

      archive.on('error', (err) => reject(err));

      const addToArchive = async ({
        zipDetails,
        currentPath = '',
      }: {
        zipDetails: any[];
        currentPath?: string;
      }) => {
        type ModuleObject = {
          moduleName: string;
          subFolders: any[];
          readMeFile: {
            fileName: string;
            content: any;
          };
        };

        for (const moduleObj of zipDetails as ModuleObject[]) {
          const folderName =
            moduleObj?.moduleName === AuditReportModuleEnum.Contract
              ? 'Contracts and variations'
              : moduleObj?.moduleName;
          const modulePath = path.join(currentPath, folderName);

          // === Handle Accounting Records ===
          if (
            moduleObj?.moduleName === AuditReportModuleEnum.AccountingRecords
          ) {
            const accountingRecords = await this.fetchBatchData({
              payload: {
                ...payload,
                module_name: AuditReportModuleEnum.AccountingRecords,
              },
            });

            const formattedRecords =
              accountingRecords?.map((record) => ({
                sheetName: record.sheetName,
                records: record.records,
                module_name: record.module_name,
              })) ?? [];

            const accountingBuffer = await this.createExcelBuffer({
              payload: {
                ...payload,
                module_name: AuditReportModuleEnum.AccountingRecords,
              },
              records: formattedRecords,
              isMultiSheet: true,
            });

            archive.append(accountingBuffer, {
              name: path.join(folderName, 'Accounting Records.xlsx'),
            });

            masterSummary.push({
              module_name: AuditReportModuleEnum.AccountingRecords,
              records: [
                {
                  file_name: 'Accounting Records.xlsx',
                  description:
                    'Contains Trial Balance, Ledger, Deposits & Withdrawals, and Journal',
                },
              ],
            });

            if (moduleObj?.readMeFile?.fileName) {
              await this.createReadMeFile({
                data: {
                  ...moduleObj.readMeFile,
                  path: modulePath,
                },
                archive,
              });
            }

            continue; // skip rest of the loop
          }

          if (
            moduleObj?.moduleName ===
              AuditReportModuleEnum.ClientPaymentClaim ||
            moduleObj?.moduleName === AuditReportModuleEnum.ClientNotice ||
            moduleObj?.moduleName === AuditReportModuleEnum.ReceivedNotice ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.SupplierSubConPaymentClaim ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.SupplierSubConPaymentSchedule ||
            moduleObj?.moduleName === AuditReportModuleEnum.BankStatement ||
            moduleObj?.moduleName ===
              AuditReportModuleEnum.PaymentInstructionFile
          ) {
            const records = await this.fetchBatchData({
              payload: { ...payload, module_name: moduleObj?.moduleName },
            });

            let attachments = [];

            if (moduleObj?.moduleName === AuditReportModuleEnum.BankStatement) {
              attachments = records
                ?.filter(
                  (bs) => bs?.bank_statement_attachment_id && bs?.file_path,
                )
                ?.map((f) => ({
                  attachment_id: f?.id,
                  file_path: f?.file_path,
                  file_type: f?.file_type,
                  attachment_type: f?.attachment_type,
                  file_name: f?.file_name,
                }));
            } else if (
              moduleObj?.moduleName ===
              AuditReportModuleEnum.PaymentInstructionFile
            ) {
              attachments = records
                ?.filter((r) => r?.aba_file_attachment_id && r?.file_path)
                ?.map((f) => ({
                  attachment_id: f?.aba_file_attachment_id,
                  file_path: f?.file_path,
                  file_type: f?.file_type,
                  attachment_type: 'ABA File',
                  file_name: f?.aba_file_name,
                }));
            }
            if (
              moduleObj?.moduleName ===
                AuditReportModuleEnum.ClientPaymentClaim ||
              moduleObj?.moduleName ===
                AuditReportModuleEnum.SupplierSubConPaymentClaim ||
              moduleObj?.moduleName ===
                AuditReportModuleEnum.SupplierSubConPaymentSchedule
            ) {
              for (const obj of records) {
                const normalizeFileName = (name: string = '') =>
                  name.trim().toLowerCase();
                const compulsoryFileMap = new Map<string, string>();
                const optionalFileMap = new Map<string, string>();

                const attachments = Array.isArray(obj.attachment_details)
                  ? obj.attachment_details
                  : [];

                for (const f of attachments) {
                  const normalized = normalizeFileName(f?.file_name);
                  if (!normalized) continue;

                  const isCompulsory =
                    f?.attachment_type === 'Compulsory_attachments' ||
                    f?.attachment_type ===
                      'Optional_supporting_statement_attachments';

                  const isOptional =
                    f?.attachment_type === 'Optional_attachments';

                  if (isCompulsory && !compulsoryFileMap.has(normalized)) {
                    compulsoryFileMap.set(normalized, f?.file_name);
                  } else if (
                    isOptional &&
                    !compulsoryFileMap.has(normalized) && // prevent overlap
                    !optionalFileMap.has(normalized)
                  ) {
                    optionalFileMap.set(normalized, f?.file_name);
                  }
                }

                obj.compulsory_attachment_names = [
                  ...compulsoryFileMap.values(),
                ].join(', ');
                obj.optional_attachment_names = [
                  ...optionalFileMap.values(),
                ].join(', ');
              }
              attachments = records.flatMap((r) => r.attachment_details || []);
            } else {
              attachments = records.flatMap((r) => r.attachment_details || []);
            }

            if (attachments?.length) {
              await this.addAttachments({
                record: attachments,
                archive,
                moduleNames: folderName,
                payload,
              });
            }

            if (records?.length) {
              const excelBuffer = await this.createExcelBuffer({
                records,
                payload: { ...payload, module_name: moduleObj?.moduleName },
              });

              archive.append(excelBuffer, {
                name: path.join(
                  folderName,
                  `${moduleObj?.moduleName ?? 'Data'} List.xlsx`,
                ),
              });

              masterSummary.push({
                module_name: moduleObj?.moduleName,
                records: records?.map((obj) => {
                  if (
                    moduleObj?.moduleName ===
                      AuditReportModuleEnum.ClientPaymentClaim ||
                    moduleObj?.moduleName ===
                      AuditReportModuleEnum.SupplierSubConPaymentClaim ||
                    moduleObj?.moduleName ===
                      AuditReportModuleEnum.SupplierSubConPaymentSchedule
                  ) {
                    const normalizeFileName = (name: string = '') =>
                      name.trim().toLowerCase();

                    const compulsoryFileMap = new Map<string, string>();

                    const compulsory_attachment_names =
                      obj?.attachment_details?.filter((f) => {
                        const isCompulsory =
                          f?.attachment_type === 'Compulsory_attachments' ||
                          f?.attachment_type ===
                            'Optional_supporting_statement_attachments';
                        const normalized = normalizeFileName(f?.file_name);
                        if (isCompulsory && normalized) {
                          compulsoryFileMap.set(normalized, f?.file_name);
                        }
                        return isCompulsory;
                      });

                    const compulsory_attachment_names_joined = [
                      ...compulsoryFileMap.values(),
                    ].join(', ');

                    const optional_attachment_names = obj?.attachment_details
                      ?.filter((f) => {
                        const isOptional =
                          f?.attachment_type === 'Optional_attachments';
                        const normalized = normalizeFileName(f?.file_name);
                        return isOptional && !compulsoryFileMap.has(normalized);
                      })
                      ?.map((attachment) => attachment?.file_name)
                      ?.join(',');

                    return {
                      ...obj,
                      compulsory_attachment_names:
                        compulsory_attachment_names_joined,
                      optional_attachment_names,
                    };
                  }
                  if (
                    moduleObj?.moduleName === AuditReportModuleEnum.ClientNotice
                  ) {
                    return {
                      notice_type: obj?.notice_type,
                      notice_source: obj?.notice_source,
                      notice_date: obj?.notice_date,
                      status: obj?.status,
                      uploaded_notice_details:
                        obj?.uploaded_notice_details?.file_name ?? '',
                      support_file_details:
                        obj?.support_file_details?.file_name ?? '',
                    };
                  }

                  if (
                    moduleObj?.moduleName ===
                    AuditReportModuleEnum.ReceivedNotice
                  ) {
                    return {
                      notice_type: obj?.notice_type,
                      notice_date: obj?.notice_date,
                      status: obj?.status,
                      uploaded_notice_details:
                        obj?.uploaded_notice_details?.file_name ?? '',
                    };
                  }

                  if (
                    moduleObj?.moduleName ===
                    AuditReportModuleEnum.BankStatement
                  ) {
                    return {
                      bank_statement_name: obj?.bank_statement_name,
                      statement_date: obj?.statement_date,
                      file_name: obj?.file_name,
                    };
                  }

                  if (
                    moduleObj?.moduleName ===
                    AuditReportModuleEnum.PaymentInstructionFile
                  ) {
                    return {
                      payment_date: obj?.payment_date,
                      total_amount: obj?.total_amount,
                      aba_file_name: obj?.aba_file_name,
                    };
                  }
                }),
              });
            }
          }

          if (Array.isArray(moduleObj.subFolders)) {
            for (const subModuleObj of moduleObj.subFolders) {
              const subFolderPath = path.join(
                modulePath,
                subModuleObj?.moduleName,
              );

              const data = await this.fetchBatchData({
                payload: { ...payload, module_name: subModuleObj.moduleName },
              });

              for (const record of data) {
                const buffer = await this.createExcelBuffer({
                  records: record.contract_details ?? [],
                  payload: { ...payload, module_name: subModuleObj.moduleName },
                });

                archive.append(buffer, {
                  name: path.join(
                    subFolderPath,
                    record.client_supplier_name,
                    'Contract List.xlsx',
                  ),
                });

                const preRecord = masterSummary.find(
                    (ele) =>
                      ele?.module_name === AuditReportModuleEnum.Contract,
                  ),
                  preVariationRecord = masterSummary.find(
                    (ele) =>
                      ele?.module_name === AuditReportModuleEnum.Variation,
                  );
                const contractRecord: any[] = record.contract_details ?? [];
                const variationRecord = contractRecord
                  ?.filter((c) => c?.variation_details?.length)
                  ?.flatMap((e) => e?.variation_details);

                if (preRecord) {
                  const prevDataIndex = masterSummary.findIndex(
                    (ele) =>
                      ele?.module_name === AuditReportModuleEnum.Contract,
                  );
                  masterSummary.splice(prevDataIndex, 1, {
                    module_name: AuditReportModuleEnum.Contract,
                    records: [...preRecord?.records, ...(contractRecord ?? [])],
                  });
                } else {
                  masterSummary.push({
                    module_name: AuditReportModuleEnum.Contract,
                    records: contractRecord ?? [],
                  });
                }

                if (preVariationRecord && variationRecord?.length) {
                  const prevDataIndex = masterSummary.findIndex(
                    (ele) =>
                      ele?.module_name === AuditReportModuleEnum.Variation,
                  );

                  masterSummary.splice(prevDataIndex, 1, {
                    module_name: AuditReportModuleEnum.Variation,
                    records: [
                      ...preVariationRecord?.records,
                      ...(variationRecord ?? []),
                    ],
                  });
                } else if (variationRecord?.length) {
                  masterSummary.push({
                    module_name: AuditReportModuleEnum.Variation,
                    records: variationRecord,
                  });
                }

                await this.addAttachments({
                  record: record?.contract_details || [],
                  archive,
                  moduleNames: path.join(
                    subFolderPath,
                    record?.client_supplier_name,
                  ),
                  payload: { ...payload, module_name: subModuleObj.moduleName },
                });
              }
            }
          }

          if (moduleObj?.readMeFile?.fileName) {
            await this.createReadMeFile({
              data: {
                ...moduleObj.readMeFile,
                path: modulePath,
              },
              archive,
            });
          }
        }
      };

      await addToArchive({ zipDetails: zipDetails?.folders });

      if (masterSummary.length) {
        const buffer = await this.createExcelBuffer({
          records: masterSummary,
          payload,
          isMultiSheet: true,
        });
        archive.append(buffer, {
          name: path.join(`Master Summary.xlsx`),
        });
      }
      await archive.finalize();
    });
  }

  // Add attachments
  async addAttachments({
    archive,
    record,
    moduleNames,
    payload,
  }: {
    archive: any;
    record: any[];
    moduleNames: string;
    payload: AuditReportServiceInput;
  }) {
    const seenAttachmentPaths = new Set<string>();
    for (const attachment of record || []) {
      if (
        payload?.module_name === AuditReportModuleEnum.PaymentInstructionFile
      ) {
        const attachmentPath = attachment?.file_path?.replace(/\\/g, '/');
        const attachmentName =
          attachment?.aba_file_name ?? path.basename(attachmentPath);
        const zipPath = path.join(moduleNames, attachmentName);

        if (
          attachmentPath &&
          attachment?.aba_file_attachment_id &&
          !seenAttachmentPaths.has(zipPath)
        ) {
          seenAttachmentPaths.add(zipPath);
          const fileUrl = `${process.env.UPLOAD_BASE_URL}${attachmentPath}`;

          try {
            const response = await axios.get(fileUrl, {
              responseType: 'stream',
            });

            if (response.status === 200) {
              archive.append(response.data, { name: zipPath });
            } else {
              this.logger.warn(`⚠️ Skipped: File not found (${fileUrl})`);
            }
          } catch (err) {
            this.logger.error(`Failed to fetch ABA file: ${fileUrl} - ${err.message}`);
          }
        }

        continue; // Skip rest of the loop for this type
      }

      const attachmentPath = attachment?.file_path?.replace(/\\/g, '/');
      if (attachmentPath) {
        const attachmentName = path.basename(attachmentPath);
        const zipPath = path.join(moduleNames, attachmentName);

        if (!seenAttachmentPaths.has(zipPath)) {
          seenAttachmentPaths.add(zipPath);
          const fileUrl = `${process.env.UPLOAD_BASE_URL}${attachmentPath}`;

          try {
            const response = await axios.get(fileUrl, {
              responseType: 'stream',
            });

            if (response.status === 200) {
              archive.append(response.data, {
                name: zipPath,
              });
            } else {
              this.logger.warn(`⚠️ Skipped: File not found (${fileUrl})`);
            }
          } catch (err) {
            this.logger.error(`Failed to fetch file: ${fileUrl} - ${err.message}`);
          }
        }

        // Generate Variation List.xlsx in-memory and append
        if (
          payload?.module_name === AuditReportModuleEnum.ContractWithClient ||
          payload?.module_name === AuditReportModuleEnum.ContractWithSupplier
        ) {
          const variationRecords =
            attachment?.variation_details?.map((v) => ({
              ...v,
              contract_name: attachment?.contract_name,
            })) ?? [];

          if (variationRecords.length > 0) {
            const buffer = await this.createExcelBuffer({
              records: variationRecords,
              payload: {
                ...payload,
                module_name: AuditReportModuleEnum.Variation,
              },
            });

            const excelName = `${attachment?.contract_name} - Variation List.xlsx`;
            const zipPath = path.join(moduleNames, excelName);

            if (!seenAttachmentPaths.has(zipPath)) {
              seenAttachmentPaths.add(zipPath);
              archive.append(buffer, { name: zipPath });
            }
          }

          // Attach variation files
          for (const variation of attachment?.variation_details || []) {
            const variationFilePath = variation?.file_path?.replace(/\\/g, '/');
            if (variationFilePath) {
              const variationFileName = path.basename(variationFilePath);
              const zipPath = path.join(moduleNames, variationFileName);

              if (!seenAttachmentPaths.has(zipPath)) {
                seenAttachmentPaths.add(zipPath);
                const fileUrl = `${process.env.UPLOAD_BASE_URL}${variationFilePath}`;

                try {
                  const response = await axios.get(fileUrl, {
                    responseType: 'stream',
                    timeout: 10000,
                  });

                  if (response.status === 200) {
                    archive.append(response.data, { name: zipPath });
                  } else {
                    this.logger.warn(
                      `⚠️ Could not fetch variation file: ${fileUrl}`,
                    );
                  }
                } catch (err) {
                  this.logger.error(
                    `❌ Failed to fetch variation file: ${fileUrl} - ${err.message}`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  async getBankDetail({ bank_account_id }: { bank_account_id: number }) {
    try {
      const whereCondition = { bank_account_id };

      const bank = await this.bankAccounts.findOne({ where: whereCondition });

      if (bank === null || !bank) {
        throw new Error(`Bank with ${bank_account_id} not found`);
      }

      return bank;
    } catch (error) {
      throw error;
    }
  }

  async getProjectDetail({ project_id }: { project_id: number }) {
    try {
      const whereCondition = { project_id };

      const project = await this.projectDetails.findOne({
        where: whereCondition,
      });

      if (project === null || !project) {
        throw new Error(`Bank with ${project_id} not found`);
      }

      return project;
    } catch (error) {
      throw error;
    }
  }

  async getClientSupplierList(payload: AuditReportServiceInput) {
    try {
      const {
        bank_account_id,
        start_date,
        end_date,
        timezone,
        client_supplier_type,
        module_name,
        project_id,
      } = payload;
      const excludedStatus = ['Archived', 'Deleted', 'Completed'];

      const queryBuilder = await this.clientSuppliersDetails
        .createQueryBuilder('cs')
        .select([
          'cs.client_supplier_id as client_supplier_id',
          'cs.client_supplier_name as client_supplier_name',
          'cs.client_supplier_type as client_supplier_type',
        ])
        .addSelect(
          `
          CASE
            WHEN COUNT(c.contract_id) > 0
            THEN JSON_AGG(
              JSON_BUILD_OBJECT(
                'contract_id', c.contract_id,
                'contract_name', c.contract_name,
                'client_supplier_role', c.client_supplier_role,
                'contract_status', c.contract_status,
                'project_id', c.project_id,
                'project_name', p.project_name,
                'contract_date', c.contract_date,
                'attachment_id',c.attachment_id,
                'file_path',f.file_path,
                'file_name',f.file_name,
                'variation_details',(
                  SELECT COALESCE(
                    JSON_AGG(
                      JSON_BUILD_OBJECT(
                        'variation_id',v.variation_id,
                        'variation_name',v.variation_name,
                        'contract_id',v.contract_id,
                        'contract_name',vc.contract_name,
                        'variation_amount',v.variation_amount,
                        'variation_status',v.variation_status,
                        'attachment_id',v.attachment_id,
                        'file_path',vf.file_path,
                        'file_name',vf.file_name,
                        'created_on',v.created_on,
                        'project_id', v.project_id,
                        'project_name', p.project_name
                      )
                    ),'[]'
                  ) 
                  FROM variation_details v
                  LEFT JOIN file_attachments vf ON vf.id = v.attachment_id
                  LEFT JOIN project_details vp ON vp.project_id = v.project_id
                  INNER JOIN contract_details vc ON vc.contract_id = v.contract_id
                  WHERE v.contract_id = c.contract_id
                )
              )
            )
            ELSE '[]'
          END as contract_details
          `,
        )
        .innerJoin(
          ContractDetails,
          'c',
          'c.client_supplier_id = cs.client_supplier_id',
        )
        .leftJoin(FileAttachments, 'f', 'f.id = c.attachment_id')
        .leftJoin(VariationDetails, 'v', 'v.contract_id = c.contract_id')
        .leftJoin(ProjectDetails, 'p', 'p.project_id = c.project_id');

      if (module_name === AuditReportModuleEnum.ContractWithClient) {
        queryBuilder.innerJoin(
          BankAccounts,
          'b',
          '((b.bank_account_id = c.payment_to_account OR b.bank_account_id = c.retention_from_account) AND cs.client_supplier_type = :client_supplier_type)',
          {
            client_supplier_type: 'Client',
          },
        );
      } else if (module_name === AuditReportModuleEnum.ContractWithSupplier) {
        queryBuilder.innerJoin(
          BankAccounts,
          'b',
          '((b.bank_account_id = c.payment_from_account OR b.bank_account_id = c.retention_from_account) AND cs.client_supplier_type = :client_supplier_type)',
          {
            client_supplier_type: 'Supplier',
          },
        );
      }

      queryBuilder.groupBy(
        `cs.client_supplier_id,cs.client_supplier_name,cs.client_supplier_type`,
      );

      if (bank_account_id) {
        queryBuilder.andWhere('b.bank_account_id = :bank_account_id', {
          bank_account_id,
        });
      }

      if (project_id) {
        queryBuilder.andWhere('p.project_id = :project_id', {
          project_id,
        });
      }

      if (client_supplier_type) {
        queryBuilder.andWhere(
          'c.client_supplier_type = :client_supplier_type',
          {
            client_supplier_type,
          },
        );
      }

      if (start_date && end_date && timezone) {
        let startDate = moment(start_date).startOf('day').toDate(),
          endDate = moment(end_date).endOf('day').toDate();

        queryBuilder.andWhere(
          'c.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      return queryBuilder;
    } catch (error) {}
  }

  async getBankAssociatedProject(bank_account_id: number) {
    try {
      const excludedStatus = ['Archived', 'Deleted', 'Completed'];

      const bankAccount = await this.bankAccounts.findOne({
        where: { bank_account_id },
      });

      if (!bankAccount || !bankAccount.project_ids?.length) return [];

      const allowedProjectIds = bankAccount.project_ids;

      const queryBuilder = this.projectDetails
        .createQueryBuilder('p')
        .select([
          'p.project_id as project_id',
          'p.project_name as project_name',
          'p.project_description as project_description',
        ])
        .leftJoin(
          ContractDetails,
          'c',
          '(c.payment_to_account = :bank_account_id OR c.retention_from_account = :bank_account_id OR c.payment_from_account = :bank_account_id) AND c.project_id = p.project_id',
          { bank_account_id },
        )
        .leftJoin(
          PaymentDetails,
          'pd',
          '(pd.payment_to_account = :bank_account_id OR pd.retention_account = :bank_account_id OR pd.payment_from_account = :bank_account_id) AND pd.project_id = p.project_id',
          { bank_account_id },
        )
        .leftJoin(
          NoticeDetails,
          'n',
          'n.project_id = p.project_id AND n.bank_account_id = :bank_account_id AND n.notice_type NOT IN (:...qbccNotices)',
          {
            bank_account_id,
            qbccNotices: [
              'QBCC TA1 Project Trust Account Notice',
              'QBCC TA3 Notice Of Related Entities',
              'QBCC TA4 Part Payment Notice',
              'QBCC TA2 Account Closing Notice',
              'QBCC TA5 Nil Return Notice',
              'QBCC TA1 Retention Trust Account Notice',
              'QBCC TA2 Retention Account Closing Notice',
            ],
          },
        )
        .where('p.project_status NOT IN (:...excludedStatus)', {
          excludedStatus,
        })
        .andWhere('p.project_id IN (:...allowedProjectIds)', {
          allowedProjectIds,
        })
        // .andWhere(
        //   '(c.contract_id IS NOT NULL OR pd.payment_id IS NOT NULL)',
        // )
        .distinct(true);

      const result = await queryBuilder.getRawMany();

      return result;
    } catch (error) {
      this.logger.error(
        `Error while fetching associated projects for bank_account_id ${bank_account_id}: ${error.message}`,
      );
      throw error;
    }
  }

  async getClientPaymentClaimList(payload: AuditReportServiceInput) {
    const {
      bank_account_id,
      start_date,
      end_date,
      timezone,
      project_id,
      module_name,
    } = payload;
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    const queryBuilder = this.paymentClaims
      .createQueryBuilder('pc')
      .select([
        'pc.id as id',
        'pc.payment_claim_id as payment_claim_id',
        'pc.claim_type as claim_type',
        'pc.cash_retention_type as cash_retention_type',
        'pc.retention_amount as retention_amount',
        'pc.retention_amount_with_gst as retention_amount_with_gst',
        'pc.status as status',
        'pc.project_id as project_id',
        'pc.created_on as created_on',
        'pc.received_date as received_date',
        'pc.sent_date as sent_date',
        'p.project_name as project_name',
        'c.contract_name as contract_name',
        'pc.due_date as due_date',
        'pc.claim_amount as claim_amount',
        'pc.list_status as list_status',
        'cs.client_supplier_name as client_supplier_name',
      ])
      .addSelect(
        `COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'attachment_id', f.id,
                'file_path', f.file_path,
                'file_type', f.file_type,
                'attachment_type', f.attachment_type,
                'file_name', f.file_name
              )
            ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::JSONB
          ) as attachment_details
        `,
      )
      .innerJoin(ContractDetails, 'c', `c.contract_id = pc.contract_id`)
      .innerJoin(
        BankAccounts,
        'b',
        '(b.bank_account_id = c.payment_to_account OR b.bank_account_id = c.retention_from_account OR b.bank_account_id = c.payment_from_account)',
      )
      .innerJoin(ProjectDetails, 'p', 'p.project_id = pc.project_id')
      .leftJoin(
        FileAttachments,
        'f',
        `(f.id = ANY(string_to_array(pc.compulsory_attachment_ids,',')::UUID[]) OR f.id = ANY(string_to_array(pc.optional_attachment_ids,',')::UUID[]))`,
      );

    if (module_name === AuditReportModuleEnum.ClientPaymentClaim) {
      queryBuilder.innerJoin(
        ClientSuppliersDetails,
        'cs',
        `cs.client_supplier_id = pc.client_supplier_id AND cs.client_supplier_type = 'Client'`,
      );
    }

    if (module_name === AuditReportModuleEnum.SupplierSubConPaymentClaim) {
      queryBuilder.innerJoin(
        ClientSuppliersDetails,
        'cs',
        `cs.client_supplier_id = pc.client_supplier_id AND cs.client_supplier_type = 'Supplier'`,
      );
      queryBuilder.andWhere('c.client_supplier_role = :client_supplier_role', {
        client_supplier_role: 'Sub Contractor',
      });
    }

    if (bank_account_id) {
      queryBuilder.andWhere('b.bank_account_id = :bank_account_id', {
        bank_account_id,
      });
    }

    if (project_id) {
      queryBuilder.andWhere('pc.project_id = :project_id', {
        project_id,
      });
    }

    if (start_date && end_date && timezone) {
      let startDate = moment(start_date).startOf('day').toDate(),
        endDate = moment(end_date).endOf('day').toDate();

      queryBuilder.andWhere(
        `((pc.claim_type = 'Billable' AND (pc.received_date BETWEEN :start_date AND :end_date)) OR (pc.claim_type <> 'Billable' AND (pc.sent_date BETWEEN :start_date AND :end_date)))`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    queryBuilder.groupBy(
      `pc.id,p.project_name,c.contract_name,cs.client_supplier_name`,
    );

    return queryBuilder;
  }

  async getNoticesList(
    payload: AuditReportServiceInput,
    options?: { onlyReceived?: boolean },
  ) {
    const { bank_account_id, project_id, start_date, end_date, timezone } =
      payload;

    const queryBuilder = await this.noticeDetails
      .createQueryBuilder('n')
      .select([
        'n.notice_id as notice_id',
        'n.notice_date as notice_date',
        'n.notice_type as notice_type',
        'p.project_name as project_name',
        'b.account_name as account_name',
        'n.notice_source as notice_source',
        'n.status as status',
      ])
      .addSelect(
        `COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'attachment_id', f.id,
                'file_path', f.file_path,
                'file_type', f.file_type,
                'attachment_type', f.attachment_type,
                'file_name', f.file_name
              )
            ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::JSONB
          ) as attachment_details
        `,
      )
      .addSelect(
        `CASE 
           WHEN uploaded_notice.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
             'attachment_id', uploaded_notice.id,
             'file_path', uploaded_notice.file_path,
             'file_type', uploaded_notice.file_type,
             'attachment_type', uploaded_notice.attachment_type,
             'file_name', uploaded_notice.file_name
           )
           ELSE NULL
         END AS uploaded_notice_details`,
      )
      // .addSelect(
      //   `CASE
      //      WHEN support_file.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
      //        'attachment_id', support_file.id,
      //        'file_path', support_file.file_path,
      //        'file_type', support_file.file_type,
      //        'attachment_type', support_file.attachment_type,
      //        'file_name', support_file.file_name
      //      )
      //      ELSE NULL
      //    END AS support_file_details`,
      // )
      .leftJoin('n.contractDetails', 'c')
      .leftJoin('n.projectDetails', 'p')
      .leftJoin('n.accountDetails', 'b')
      .leftJoin('n.uploaded_notice', 'uploaded_notice')
      // .leftJoin('n.supportingFileAttachment', 'support_file')
      .leftJoin(
        FileAttachments,
        'f',
        `(f.id = ANY(string_to_array(n.supporting_file_attachment_ids, ',')::uuid[])   OR f.id = n.uploadedNotice)`,
      );

    if (options?.onlyReceived) {
      queryBuilder.where('n.status = :status', { status: 'Received' });
    } else {
      queryBuilder.where('n.status NOT IN (:...avoidStatuses)', {
        avoidStatuses: [
          'Delete-Unsent',
          'Delete-Sent',
          'Received',
          'Delete-Received',
        ],
      });
    }

    if (bank_account_id) {
      queryBuilder.andWhere('(n.bank_account_id = :bank_account_id)', {
        bank_account_id,
      });
    }

    if (project_id) {
      queryBuilder.andWhere('(n.project_id = :project_id)', {
        project_id,
      });
    }

    // queryBuilder.andWhere('n.notice_type NOT IN (:...qbccNotices)', {
    //   qbccNotices: [
    //     'QBCC TA1 Project Trust Account Notice',
    //     'QBCC TA3 Notice Of Related Entities',
    //     'QBCC TA4 Part Payment Notice',
    //     'QBCC TA2 Account Closing Notice',
    //     'QBCC TA5 Nil Return Notice',
    //     'QBCC TA1 Retention Trust Account Notice',
    //     'QBCC TA2 Retention Account Closing Notice',
    //   ],
    // });

    if (start_date && end_date && timezone) {
      let startDate = moment
          .tz(start_date, timezone)
          .startOf('day')
          .utc()
          .toDate(),
        endDate = moment.tz(end_date, timezone).endOf('day').utc().toDate();

      queryBuilder.andWhere('n.notice_date BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    queryBuilder.groupBy(
      `n.notice_id,n.notice_date,n.notice_type,n.notice_source,p.project_name,b.account_name,n.status,
      uploaded_notice.id,uploaded_notice.file_path,uploaded_notice.file_type,uploaded_notice.attachment_type,uploaded_notice.file_name`,
      // support_file.id,support_file.file_path,support_file.file_type,support_file.attachment_type,support_file.file_name
    );

    return queryBuilder;
  }

  async getSupplierSubConPaymentList(payload: AuditReportServiceInput) {
    const { bank_account_id, project_id, start_date, end_date, timezone } =
      payload;

    const queryBuilder = await this.paymentDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id as id',
        'pd.payment_id as payment_id',
        'pd.payment_date as payment_date',
        'pd.payment_type as payment_type',
        'pd.payment_type as payment_type',
        'pd.list_status as status',
        'pd.project_id as project_id',
        'p.project_name as project_name',
        'p.project_name as project_name',
        'pc.cash_retention_type as cash_retention_type',
        'pc.claim_type as claim_type',
        'pc.retention_amount_with_gst as retention_amount_with_gst',
        'pd.retention_release_date as retention_release_date',
        'c.contract_name as contract_name',
        'payment.is_paid_confirmed as is_paid_confirmed',
        'payment.is_received_confirmed as is_received_confirmed',
        'retention.amount as retention_amount',
        'retention.is_retention_confirmed as is_retention_confirmed',
      ])
      .addSelect(
        `COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'attachment_id', f.id,
                'file_path', f.file_path,
                'file_type', f.file_type,
                'attachment_type', f.attachment_type,
                'file_name', f.file_name
              )
            ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::JSONB
          ) as attachment_details
        `,
      )
      .addSelect(
        `COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'id', sp.id,
                'sub_payment_id', sp.sub_payment_id,
                'sub_payment_type', sp.sub_payment_type,
                'amount', sp.amount
              )
            ) FILTER (WHERE sp.id IS NOT NULL),
          '[]'::JSONB
          ) as sub_payment_details
        `,
      )
      .addSelect(
        `CASE 
           WHEN from_account.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
             'bank_account_id', from_account.bank_account_id,
             'account_name', from_account.account_name
           )
           ELSE NULL
         END AS from_account_details`,
      )
      .addSelect(
        `CASE 
           WHEN to_account.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
             'bank_account_id', to_account.bank_account_id,
             'account_name', to_account.account_name
           )
           ELSE NULL
         END AS to_account_details`,
      )
      .addSelect(
        `CASE 
           WHEN retention_acc.id IS NOT NULL THEN JSONB_BUILD_OBJECT(
             'bank_account_id', retention_acc.bank_account_id,
             'account_name', retention_acc.account_name
           )
           ELSE NULL
         END AS retention_account_details`,
      )
      .leftJoin(ProjectDetails, 'p', 'p.project_id = pd.project_id')
      .innerJoin(
        PaymentClaims,
        'pc',
        'pc.payment_claim_id = pd.payment_claim_id',
      )
      .innerJoin(ContractDetails, 'c', 'c.contract_id = pd.contract_id')
      .leftJoin(
        'pd.subPayments',
        'payment',
        `payment.sub_payment_type = 'Payment'`,
      )
      .leftJoin(
        'pd.subPayments',
        'retention',
        `retention.sub_payment_type IN ('Retention', 'Retention Out')`,
      )
      .leftJoin(
        FileAttachments,
        'f',
        `(f.id = ANY(string_to_array(pd.compulsory_attachment_ids,',')::UUID[]) OR f.id = ANY(string_to_array(pd.optional_attachment_ids,',')::UUID[]))`,
      )
      .leftJoin('pd.paymentFromAccount', 'from_account')
      .leftJoin('pd.paymentToAccount', 'to_account')
      .leftJoin('pd.retentionAccount', 'retention_acc')
      .leftJoin(SubPayments, 'sp', 'sp.payment_id = pd.payment_id');

    if (bank_account_id) {
      queryBuilder.where(
        `
          (pd.payment_from_account = :bank_account_id OR 
          pd.payment_to_account = :bank_account_id OR
          pd.retention_account = :bank_account_id)
        `,
        { bank_account_id },
      );
    }

    if (project_id) {
      queryBuilder.andWhere('pd.project_id = :project_id', {
        project_id,
      });
    }

    if (start_date && end_date && timezone) {
      let startDate = moment(start_date).startOf('day').toDate(),
        endDate = moment(end_date).endOf('day').toDate();

      queryBuilder.andWhere(
        'pd.payment_date BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    queryBuilder.andWhere('pd.list_status != :deleteStatus', {
      deleteStatus: 'Void',
    });

    queryBuilder.groupBy(
      `pd.id,p.project_name,payment.amount,payment.is_paid_confirmed,payment.is_received_confirmed,retention.amount,retention.is_retention_confirmed
      ,from_account.bank_account_id,from_account.account_name,from_account.id,
      to_account.bank_account_id,to_account.account_name,to_account.id,
      retention_acc.bank_account_id,retention_acc.account_name,retention_acc.id,
      c.contract_name,pd.payment_date,pd.payment_type,pd.list_status,
      pc.cash_retention_type,pc.claim_type,pc.retention_amount_with_gst,pd.retention_release_date`,
    );

    return queryBuilder;
  }

  async getBankStatementList(payload: AuditReportServiceInput) {
    const { bank_account_id, start_date, end_date, timezone } = payload;

    const queryBuilder = await this.bankStatements
      .createQueryBuilder('bs')
      .select([])
      .leftJoin(
        FileAttachments,
        'f',
        'f.id = (bs.bank_statement_attachment_id)::UUID',
      );

    if (bank_account_id) {
      queryBuilder.andWhere('bs.bank_account_id = :bank_account_id', {
        bank_account_id,
      });
    }

    if (start_date && end_date && timezone) {
      let startDate = moment
          .tz(start_date, timezone)
          .startOf('month')
          .format('YYYY-MM-DD'),
        endDate = moment
          .tz(end_date, timezone)
          .endOf('month')
          .format('YYYY-MM-DD');

      queryBuilder.andWhere(
        `bs.statement_date BETWEEN :start_date AND :end_date`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    return queryBuilder;
  }

  async getPaymentInstructionFileList(payload: AuditReportServiceInput) {
    const { bank_account_id, start_date, end_date, timezone } = payload;

    const queryBuilder = this.generateABAFileHistory
      .createQueryBuilder('h')
      .select([]) // overridden with 'h.id' in getCount
      .leftJoin('company_details', 'c', 'c.company_id = h.company_id')
      .leftJoin('bank_accounts', 'ba', 'ba.bank_account_id = h.bank_account_id')
      .innerJoin('h.fileAttachments', 'af')
      .where('h.status = :status', { status: 'Active' });

    if (bank_account_id) {
      queryBuilder.andWhere('h.bank_account_id = :bank_account_id', {
        bank_account_id,
      });
    }

    if (start_date && end_date && timezone) {
      const start = moment
        .tz(start_date, timezone)
        .startOf('day')
        .utc()
        .toDate();
      const end = moment.tz(end_date, timezone).endOf('day').utc().toDate();

      queryBuilder.andWhere('h.created_on BETWEEN :start_date AND :end_date', {
        start_date: start,
        end_date: end,
      });
    }

    return queryBuilder;
  }

  async getAccountingRecordsList(payload: AuditReportServiceInput) {
    const { project_id, start_date, end_date } = payload;

    const queryBuilder = this.journalsRepo
      .createQueryBuilder('j')
      .where('j.project_id = :project_id', { project_id });

    if (start_date && end_date) {
      queryBuilder.andWhere('j.entry_date BETWEEN :start AND :end', {
        start: start_date,
        end: end_date,
      });
    }

    return queryBuilder;
  }
}
