import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccounts, BankStatements } from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Between, ILike, Repository } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  AddBankStatementInput,
  ChangeStatusOfBankStatementInput,
  CheckExistenceOfBankStatementInput,
  EditDetailsOfABankStatementInput,
  FetchAllBankStatementsInput,
  FetchBankStatementDetailsInput,
} from './bank-statements.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { FileUploadService } from '../../file-upload/file-upload.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class BankStatementsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(BankStatements)
    private bankStatementsRepo: Repository<BankStatements>,
    private activityLogService: ActivityLogService,
    private fileUploadService: FileUploadService,
  ) {
    this.logger = new PaytradeLogger('BANK_STATEMENTS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async addBankStatement(data: AddBankStatementInput, decoded?: any) {
    try {
      this.logger.log(
        `Handling request for adding a bank statement with data: ${JSON.stringify({ data, userId: decoded?.userId })}`,
      );
      const bankAccountDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id: data.bank_account_id },
      });

      if (!bankAccountDetails) throw 'Bank account not found';

      const openingDateUTC = moment(bankAccountDetails.opening_date)
        .startOf('day')
        .toDate();

      const statementDateUTC = moment(data.statement_date)
        .startOf('day')
        .toDate();

      if (statementDateUTC < openingDateUTC) {
        throw `Bank statement cannot be added prior to opening date`;
      }

      const bankAcc = await this.getBankAccountDetail(
        Number(data?.bank_account_id),
      );

      const formattedDate = (
        date?: Date,
        format: 'MM' | 'DDMMYYYY' = 'DDMMYYYY',
      ) => moment(date ?? new Date()).format(format);

      data.created_by = decoded?.userId;
      data.bank_statement_name = `Paytrade-${formattedDate()}-${bankAcc?.account_name}-${bankAcc?.account_number}-Statement-${formattedDate(data?.statement_date)}`;

      const savedBankStatementDetails = await this.bankStatementsRepo.save(
        this.bankStatementsRepo.create(data),
      );
      const bank_statement_id =
        1000 + Number(savedBankStatementDetails.bank_statement_id);
      this.logger.log(
        `Bank statement added successfully with id: ${bank_statement_id}`,
      );

      // renaming the attachment name
      await this.fileUploadService.updateFileName({
        attachment_type: 'Bank_statements',
        attachment_ids: savedBankStatementDetails?.bank_statement_attachment_id,
        module_id: bank_statement_id,
        decoded,
      });

      //Generating bank account link to view added bank account.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[40]}` +
        `${data.bank_account_id}&statement=` +
        `${bank_statement_id}` +
        `&from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a bank account is added.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 178,
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
        company_id: data.company_id,
        dynamic_values: {
          bankAccountName: bankAccountDetails?.account_name,
          bankAccountLink,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      // console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse('SUCCESS', `Bank statement added successfully.`, {
        bank_statement_id,
      });
    } catch (error) {
      this.logger.error(
        `Errored while adding a bank statement with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async getBankAccountDetail(bank_account_id: number) {
    const bankAcc = await this.bankAccountsRepo
      .createQueryBuilder('bc')
      .where('bc.bank_account_id = :bank_account_id', { bank_account_id })
      .getOne();

    if (!bankAcc) throw new Error('Bank account record not found');

    return bankAcc;
  }

  async checkExistenceOfBankStatement(
    data: CheckExistenceOfBankStatementInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking the existence of a Bank statement with data: ${JSON.stringify(data)}`,
      );

      const { company_id, bank_account_id, statement_date } = data;

      const statementDate = new Date(data.statement_date);
      const statementMonth = new Date(statementDate).getMonth() + 1;
      const statementYear = new Date(statementDate).getFullYear();
      this.logger.log(`statementMonth: ${statementMonth}`);
      this.logger.log(`statementYear: ${statementYear}`);

      const startDate = new Date(
        Date.UTC(statementYear, statementMonth - 1, 1),
      ).toISOString();
      const endDate = new Date(
        Date.UTC(statementYear, statementMonth, 0, 23, 59, 59, 999),
      ).toISOString();

      this.logger.log(`startDate: ${startDate}`);
      this.logger.log(`endDate: ${endDate}`);

      const whereConditions: any = { company_id, bank_account_id };
      whereConditions.statement_date = Between(startDate, endDate);

      const [bank_statements, total_count] =
        await this.bankStatementsRepo.findAndCount({
          where: whereConditions ? whereConditions : {},
          select: ['statement_date'],
        });

      const isBankStatementAlreadyExists = bank_statements.length
        ? true
        : false;

      return framedResponse(
        'SUCCESS',
        `Existence of bank statement has been checked successfully`,
        { isBankStatementAlreadyExists },
      );
    } catch (error) {
      throw new Error(error);
    }
  }

  async fetchBankStatementDetails(data: FetchBankStatementDetailsInput) {
    try {
      this.logger.log(
        `Handling request for fetching bank statement details with data: ${JSON.stringify(data)}`,
      );

      const { bank_account_id, bank_statement_id } = data;
      const bank_statement_details = await this.bankStatementsRepo
        .createQueryBuilder('bs')
        .select([
          'bs.bank_statement_id AS bank_statement_id',
          'bs.company_id AS company_id',
          'bs.bank_account_id AS bank_account_id',
          'bs.bank_statement_name AS bank_statement_name',
          'bs.status AS status',
          'bs.bank_statement_balance AS bank_statement_balance',
          'bs.bank_statement_attachment_id AS bank_statement_attachment_id',
          'bs.created_by AS created_by',
          'bs.created_on AS created_on',
          'bs.statement_date AS statement_date',
        ])
        .where('bs.bank_statement_id = :bank_statement_id', {
          bank_statement_id,
        })
        .andWhere('bs.bank_account_id = :bank_account_id', { bank_account_id })
        .getRawOne();
      if (!bank_statement_details)
        throw new Error(
          `Bank statement details not found. Please provide a valid one.`,
        );
      this.logger.log(`Bank statement details fetched successfully.`);

      bank_statement_details.created_on = bank_statement_details.created_on
        ? new Date(bank_statement_details.created_on)
        : new Date(0);
      bank_statement_details.added_on_date =
        bank_statement_details.added_on_date
          ? new Date(bank_statement_details.added_on_date)
          : new Date(0);

      return framedResponse(
        'SUCCESS',
        `Bank statement details fetched successfully.`,
        bank_statement_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching bank statement details with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchAllBankStatements(data: FetchAllBankStatementsInput, timezone) {
    try {
      this.logger.log(
        `Handling request for fetching all bank statements with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        bank_account_id,
        date_filter,
        added_date_from,
        added_date_to,
        page,
        search,
        status,
        items_per_page,
      } = data;
      const skip = items_per_page
        ? (page - 1) * items_per_page
        : (page - 1) * 10;
      const take = items_per_page ? items_per_page : 10;
      const whereConditions: any = { company_id, status, bank_account_id };

      if (search) {
        const keywords = search.split(/\s+/);
        keywords.forEach((keywordPart) => {
          whereConditions.bank_statement_name = ILike(`%${keywordPart}%`);
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
          end_date = moment
            .utc(added_date_to)
            .tz(timezone)
            // .endOf('day')
            .utc()
            .toDate();
        }
        whereConditions.created_on = Between(start_date, end_date);
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      let order_by: any = { created_on: sorting_order };
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'statement_date':
            {
              order_by = { statement_date: sorting_order };
            }
            break;
          case 'created_on':
            {
              order_by = { created_on: sorting_order };
            }
            break;
          case 'bank_statement_name':
            {
              order_by = { bank_statement_name: sorting_order };
            }
            break;
        }
      }

      const [bank_statements, total_count] =
        await this.bankStatementsRepo.findAndCount({
          where: whereConditions ? whereConditions : {},
          select: [
            'bank_statement_id',
            'company_id',
            'bank_account_id',
            'bank_statement_name',
            'status',
            'bank_statement_balance',
            'bank_statement_attachment_id',
            'created_on',
            'created_by',
            'statement_date',
          ],
          order: order_by,
          skip,
          take,
        });
      this.logger.log(
        `All bank statements fetched successfully with data: ${JSON.stringify(bank_statements)}`,
      );

      bank_statements.forEach((bank_statement) => {
        bank_statement.statement_date = bank_statement.statement_date
          ? new Date(bank_statement.statement_date)
          : new Date(0);
      });

      return framedResponse(
        'SUCCESS',
        `All bank statements fetched successfully.`,
        { bank_statements, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all bank statements with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async changeStatusOfBankStatement(
    data: ChangeStatusOfBankStatementInput,
    decoded?: any,
  ) {
    try {
      this.logger.log(
        `Handling request for changing the status of bank statement with data: ${JSON.stringify(data)}`,
      );

      const { bank_statement_id, status } = data;
      const bankStatementsDetails = await this.bankStatementsRepo.findOne({
        where: { bank_statement_id },
      });

      await this.bankStatementsRepo
        .createQueryBuilder()
        .update(BankStatements)
        .set({ status, updated_by: decoded?.userId })
        .where('bank_statement_id = :bank_statement_id', { bank_statement_id })
        .execute();
      this.logger.log(`Status of bank statement changed successfully.`);

      const bankAccountDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id: bankStatementsDetails.bank_account_id },
      });
      //Generating bank account link to view added bank account.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[40]}` +
        `${bankStatementsDetails.bank_account_id}&statement=` +
        `${bank_statement_id}` +
        `&from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a bank account is added.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 180,
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
        company_id: bankStatementsDetails.company_id,
        dynamic_values: {
          bankAccountName: bankAccountDetails?.account_name,
          bankAccountLink,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      // console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Status of bank statement with id: ${bank_statement_id} changed successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of bank statement with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async editDetailsOfABankStatement(
    data: EditDetailsOfABankStatementInput,
    decoded: any,
  ) {
    try {
      this.logger.log(
        `Handling request for editing the details of a bank statement with data: ${JSON.stringify(data)}`,
      );

      //Validate whether the status is open or locked. If locked, throw error saying audit records found.

      const { bank_statement_id } = data;
      const bankStatementsDetails = await this.bankStatementsRepo.findOne({
        where: { bank_statement_id },
      });

      let savedDate = new Date(bankStatementsDetails?.statement_date);
      let userDate = new Date(data?.statement_date);

      if (
        savedDate?.getMonth() !== userDate?.getMonth() ||
        savedDate?.getFullYear() !== userDate?.getFullYear()
      ) {
        const bankAcc = await this.getBankAccountDetail(
          Number(bankStatementsDetails?.bank_account_id),
        );

        const formattedDate = (
          date?: Date,
          format: 'MM' | 'DDMMYYYY' = 'DDMMYYYY',
        ) => moment(date ?? new Date()).format(format);

        data.bank_statement_name = `Paytrade-${formattedDate()}-${bankAcc?.account_name}-${bankAcc?.account_number}-Statement-${formattedDate(data?.statement_date)}`;
      }

      delete data.bank_statement_id;
      await this.bankStatementsRepo
        .createQueryBuilder()
        .update(BankStatements)
        .set({
          ...data,
          updated_by: decoded?.userId,
        })
        .where('bank_statement_id = :bank_statement_id', { bank_statement_id })
        .execute();
      this.logger.log(`Details of a bank statement edited successfully.`);

      // renaming the attachment name
      await this.fileUploadService.updateFileName({
        attachment_type: 'Bank_statements',
        attachment_ids: data?.bank_statement_attachment_id,
        module_id: bank_statement_id,
        decoded,
      });

      const bankAccountDetails = await this.bankAccountsRepo.findOne({
        where: { bank_account_id: bankStatementsDetails.bank_account_id },
      });
      //Generating bank account link to view added bank account.
      const bankAccountLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[40]}` +
        `${bankStatementsDetails.bank_account_id}&statement=` +
        `${bank_statement_id}` +
        `&from=log`;
      // console.log('bankAccountLink', bankAccountLink);

      //Create activity log as soon a bank account is added.
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 179,
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
        company_id: bankStatementsDetails.company_id,
        dynamic_values: {
          bankAccountName: bankAccountDetails?.account_name,
          bankAccountLink,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      // console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Details of a bank statement with id: ${bank_statement_id} has edited successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while editing the details of a bank statement with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
