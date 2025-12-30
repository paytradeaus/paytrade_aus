import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { BankStatements } from 'src/entities/banking.entity';
import { EditDetailsOfABankStatementInput } from './bank-statements.input';

@Injectable()
export class BankStatementsValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(BankStatements)
    private bankStatementsRepo: Repository<BankStatements>,
  ) {
    this.logger = new PaytradeLogger('BANK_STATEMENTS_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateEditDetailsOfABankStatement(
    data: EditDetailsOfABankStatementInput,
  ) {
    try {
      this.logger.log(
        `Handling request for validating the details to be edited in a bank account with data: ${JSON.stringify(data)}`,
      );
      const { bank_statement_id } = data;

      const bankStatementToBeEdited = await this.bankStatementsRepo.findOne({
        where: { bank_statement_id },
        select: ['matched_payment_ids', 'status'],
      });
      console.log('bankStatementToBeEdited', bankStatementToBeEdited);
      if (!bankStatementToBeEdited)
        throw `Invalid data. Bank statement id which you have provided is invalid or not present.`;

      //Validate whether the statement is submitted for auditing in already. If yes, restrict the editing access.
      const matchedPaymentIds = bankStatementToBeEdited.matched_payment_ids;
      console.log('matchedPaymentIds', matchedPaymentIds);
      const statusOfBankStatement = bankStatementToBeEdited.status;

      if (matchedPaymentIds || statusOfBankStatement != 'Open') {
        throw `You are not allowed to edit the statement as it is submitted for auditing already.`;
      }

      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating the details to be edited in a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  //   async validateChangeStatusOfABankAccount(
  //     data: ChangeStatusOfBankAccountInput,
  //   ) {
  //     try {
  //       this.logger.log(
  //         `Handling request for validating details in change status of a bank account with data: ${JSON.stringify(data)}`,
  //       );

  //       const { status, bank_account_id } = data;
  //       const bankAccountToBeEdited = await this.bankAccountsRepo.findOne({
  //         where: { id: bank_account_id },
  //         select: ['status', 'account_type'],
  //       });
  //       if (!bankAccountToBeEdited)
  //         throw `Invalid data. Bank account id which you have provided is invalid or not present.`;

  //       const currentStatusOfTheBankAccount = bankAccountToBeEdited.status;
  //       const statusToBeUpdated = status;
  //       switch (currentStatusOfTheBankAccount) {
  //         case 'Active' || 'Open':
  //           {
  //             switch (statusToBeUpdated) {
  //               // Checking the completion status of activities including transactions, contracts, payments and claims are required before closing the bank account.
  //               case 'Closed':
  //                 {
  //                   throw `You have claims, payments or contracts in incomplete state. Please complete all actions related to this account before closing.`;
  //                 }
  //                 break;
  //               case 'Deleted':
  //                 {
  //                   throw `This account has activity as per system inputs. The account must be closed instead.`;
  //                 }
  //                 break;
  //             }
  //           }
  //           break;
  //       }
  //       return data;
  //     } catch (error) {
  //       this.logger.error(
  //         `Errored while validating the details in change status of a bank account with message: ${error}`,
  //       );
  //       throw new Error(error);
  //     }
  //   }
}
