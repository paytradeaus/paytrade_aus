import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  AddBankAccountInput,
  ChangeStatusOfBankAccountInput,
  EditDetailsOfABankAccountInput,
} from './bank-accounts.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';

@Injectable()
export class BankAccountsValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(ProjectDetails)
    private projectDetailsRepo: Repository<ProjectDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
  ) {
    this.logger = new PaytradeLogger('BANK_ACCOUNTS_VALIDATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  /**
   * Task #260 — BSBs are now wired as 6-digit strings end-to-end so
   * leading zeros (e.g. "064000") survive the wire. Reject any input
   * that isn't exactly 6 digits. Empty / null is allowed (caller-side
   * decides whether the field is required); non-empty values must
   * match `^\d{6}$`. The service-layer `padBsb6` normalization is
   * still applied as a defensive no-op for legacy callers that send
   * numbers.
   */
  private validateBsb6(value: unknown, fieldLabel: string) {
    if (value === undefined || value === null || value === '') return;
    const str = String(value);
    if (!/^\d{6}$/.test(str)) {
      throw `${fieldLabel} must be exactly 6 digits (received "${str}").`;
    }
  }

  async validateBankAccountName(companyId: number, accountName: string) {
    try {
      const splittedAccountName = accountName.toLowerCase().split(' ');
      if (!splittedAccountName.includes('trust'))
        throw new Error(
          `Please enter a valid bank account name. Expecting characters including the trustee name, the company name and the word trust.`,
        );

      const companyName = (
        await this.companyDetailsRepo.findOne({
          where: { company_id: companyId },
          select: ['company_name'],
        })
      ).company_name
        .toLowerCase()
        .split(' ');
      const set = new Set(splittedAccountName);
      const isCompanyNamePresent = companyName.some((value) => set.has(value));
      if (!isCompanyNamePresent) {
        throw new Error(
          `Please enter a valid bank account name. Expecting characters including the trustee name, the company name and the word trust.`,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async validateAddBankAccountDetails(data: AddBankAccountInput) {
    try {
      this.logger.log(
        `Handling request for validating a bank account with data: ${JSON.stringify(data)}`,
      );

      const {
        account_name,
        account_number,
        account_type,
        company_id,
        client_supplier_id,
        trustee_id,
        project_ids,
        retention_trust_certificate_attachment_ids,
        delegate_powers,
        contract_date,
        contract_practical_completion_date,
        first_sub_contract_date,
        contract_value,
        opening_date,
        associated_cash_account_id,
      } = data;
      this.logger.log(`project_ids: ${JSON.stringify(project_ids)}`);

      // Task #260 — wire-level BSB shape guard. The DB column is
      // varchar(6); reject anything that isn't a 6-digit string so a
      // bad client doesn't silently get its leading zeros stripped
      // downstream by the defensive `padBsb6` no-op.
      this.validateBsb6((data as any).bsb_number, 'BSB number');

      const bankAccountDetails = await this.bankAccountsRepo.find({
        where: {
          account_number: account_number,
          added_by_client_supplier: false,
          company_id: company_id,
          status: In(['Draft', 'Open', 'Active']),
        },
      });
      if (
        bankAccountDetails &&
        bankAccountDetails[0] !== null &&
        bankAccountDetails.length > 0
      )
        throw `Account number already exists`;

      if (project_ids && project_ids.length) {
        //Validate whether the project is in completed state or not.
        const projectDetails = await this.projectDetailsRepo.find({
          where: { project_id: In(project_ids) },
          select: ['project_status'],
        });
        this.logger.log(`projectDetails: ${JSON.stringify(projectDetails)}`);

        if (projectDetails && projectDetails.length) {
          const projectWithCompletedStatus = projectDetails.filter(
            (project) => {
              if (
                project.project_status == 'Completed' ||
                project.project_status == 'Archived' ||
                project.project_status == 'Deleted'
              )
                return project;
            },
          );
          this.logger.log(`projectWithCompletedStatus: ${JSON.stringify(projectWithCompletedStatus)}`);
          if (projectWithCompletedStatus.length)
            throw 'Provided project is either completed or deleted. Please add a project which in In Progress state.';
        }
      }

      switch (account_type) {
        case 'Project Trust Account':
          {
            // await this.validateBankAccountName(company_id, account_name);
            if (!opening_date) throw `Missing opening date.`;
            if (!client_supplier_id) throw `Missing client details.`;
            if (!project_ids || !project_ids.length)
              throw `Missing project details.`;
            if (
              retention_trust_certificate_attachment_ids &&
              retention_trust_certificate_attachment_ids.length
            )
              throw `Invalid data. Retention trust account certificates are not accepted in Project trust account.`;
            if (!contract_date)
              throw `Missing contract details. Expecting contract date.`;
            if (!contract_practical_completion_date)
              throw `Missing contract details. Expecting contract practical completion date.`;
            if (!first_sub_contract_date)
              throw `Missing contract details. Expecting first sub contract date.`;
            if (!contract_value)
              throw `Missing contract details. Expecting contract value.`;
            if (!associated_cash_account_id)
              throw `Missing associated general account. Expecting general account to associate with Project Trust Account.`;
          }
          break;
        case 'Retention Trust Account':
          {
            // await this.validateBankAccountName(company_id, account_name);
            if (!opening_date) throw `Missing opening date.`;
            // if (
            //   !retention_trust_certificate_attachment_ids ||
            //   !retention_trust_certificate_attachment_ids.length
            // )
            //   throw `Bank account type is Retention trust account. Missing Retention trust account certificate. Expecting atleast one.`;
            if (client_supplier_id)
              throw `Invalid data. Bank account type is Retention trust account. Client supplier details are not accepted in retention trust account.`;
            if (!project_ids || !project_ids.length)
              throw `Missing project details. Expecting atleast one.`;
            if (!associated_cash_account_id)
              throw `Missing associated general account. Expecting general account to associate with Project Trust Account.`;
          }
          break;
        case 'Cash Account': {
          // if (delegate_powers)
          //   throw `Invalid data. Delegate powers are not accepted in Cash accounts.`;
          if (project_ids)
            throw `Invalid data. Project ids are not allowed for general accounts.`;
          if (client_supplier_id)
            throw `Invalid data. Client supplier is not allowed for general accounts.`;
          if (trustee_id)
            throw `Invalid data. Trustee id is not allowed for general accounts.`;
          if (project_ids)
            throw `Invalid data. Project ids are not allowed for general accounts.`;
          if (retention_trust_certificate_attachment_ids)
            throw `Invalid data. Retention trust certificate attachment ids are not allowed for general accounts.`;
        }
      }
      this.logger.log(
        `Bank account details validated successfully with data: ${JSON.stringify(data)}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Errored while adding a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async validateEditDetailsOfABankAccount(
    data: EditDetailsOfABankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling request for validating the details to be edited in a bank account with data: ${JSON.stringify(data)}`,
      );
      const {
        company_id,
        account_name,
        account_number,
        bank_account_id,
        account_type,
        project_ids,
      } = data;

      const bankAccountToBeEdited = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
        select: ['status', 'account_type', 'project_ids'],
      });
      if (!bankAccountToBeEdited)
        throw `Invalid data. Bank account id which you have provided is invalid or not present.`;

      const status = bankAccountToBeEdited.status;

      // Task #260 — wire-level BSB shape guard on edits too.
      this.validateBsb6((data as any).bsb_number, 'BSB number');

      if (account_number) {
        const duplicateAccounts = await this.bankAccountsRepo.find({
          where: {
            account_number: account_number,
            added_by_client_supplier: false,
            company_id: company_id,
            status: In(['Draft', 'Open', 'Active']),
            bank_account_id: Not(bank_account_id),
          },
        });
        if (duplicateAccounts && duplicateAccounts.length > 0)
          throw `Account number already exists`;
      }

      //Validate whether the project is in completed state or not.
      if (project_ids && project_ids.length) {
        const oldProjectIds = bankAccountToBeEdited.project_ids.map(Number);
        const newProjectIds =
          project_ids.filter((id) => !oldProjectIds.includes(Number(id))) || [];
        // console.log(
        //   bankAccountToBeEdited.project_ids,
        //   project_ids,
        //   newProjectIds,
        // );

        const projectDetails = await this.projectDetailsRepo.find({
          where: { project_id: In(newProjectIds) },
          select: ['project_status'],
        });
        // this.logger.log(`projectDetails: ${JSON.stringify(projectDetails)}`);

        if (projectDetails && projectDetails.length) {
          const projectWithCompletedStatus = projectDetails.filter(
            (project) => {
              if (
                project.project_status == 'Completed' ||
                project.project_status == 'Archived' ||
                project.project_status == 'Deleted'
              )
                return project;
            },
          );
          this.logger.log(`projectWithCompletedStatus: ${JSON.stringify(projectWithCompletedStatus)}`);
          if (projectWithCompletedStatus.length)
            throw 'Provided project is either completed or deleted. Please add a project which in In Progress state.';
        }
      }

      // if (account_name && account_type != 'Cash Account') {
      //   await this.validateBankAccountName(company_id, account_name);
      // }

      if (
        bankAccountToBeEdited.account_type === 'Retention Trust Account' &&
        bankAccountToBeEdited.project_ids
      ) {
        const oldProjectIds = bankAccountToBeEdited.project_ids; //.split(',').map(id => Number(id.trim()));
        const projectIdsSet = new Set(project_ids);
        const removedProjectIds =
          oldProjectIds.filter((id) => !projectIdsSet.has(Number(id))) || [];
        this.logger.log(`oldProjectIds: ${JSON.stringify(oldProjectIds)}, project_ids: ${JSON.stringify(project_ids)}, removedProjectIds: ${JSON.stringify(removedProjectIds)}`);
        if (
          removedProjectIds &&
          removedProjectIds.length > 0 &&
          removedProjectIds[0] !== null
        ) {
          const contractDetails = await this.contractDetails
            .createQueryBuilder('c')
            .select('c.id', 'id')
            .distinct(true)
            .where(
              `(c.payment_from_account = :accountId OR c.payment_to_account = :accountId OR c.retention_from_account = :accountId)`,
              { accountId: bank_account_id },
            )
            .andWhere(`c.project_id IN (:...projectIds)`, {
              projectIds: removedProjectIds,
            })
            .andWhere(`c.contract_status <> 'Deleted'`)
            .getRawMany();

          const paymentClaimDetails = await this.paymentClaims
            .createQueryBuilder('p')
            .select('p.id', 'id')
            .distinct(true)
            .leftJoin('p.contractDetails', 'c')
            .where(
              `(c.payment_from_account = :accountId OR c.payment_to_account = :accountId OR c.retention_from_account = :accountId)`,
              { accountId: bank_account_id },
            )
            .andWhere(`p.project_id IN (:...projectIds)`, {
              projectIds: removedProjectIds,
            })
            .andWhere(`p.status <> 'Deleted'`)
            .getRawMany();

          const paymentDetails = await this.paymentDetails
            .createQueryBuilder('p')
            .select('p.id', 'id')
            .distinct(true)
            .where(
              `(p.payment_from_account = :accountId OR p.payment_to_account = :accountId OR p.retention_account = :accountId)`,
              { accountId: bank_account_id },
            )
            .andWhere(`p.project_id IN (:...projectIds)`, {
              projectIds: removedProjectIds,
            })
            .andWhere(`p.current_status <> 'Deleted'`)
            .getRawMany();

          const contractCount = contractDetails ? contractDetails.length : 0;
          const claimsCount = paymentClaimDetails
            ? paymentClaimDetails.length
            : 0;
          const paymentsCount = paymentDetails ? paymentDetails.length : 0;
          this.logger.log(`contractCount: ${contractCount}, claimsCount: ${claimsCount}, paymentsCount: ${paymentsCount}`);
          if (contractCount > 0 || claimsCount > 0 || paymentsCount > 0)
            throw `There are still contracts or payments/claims that are in process. You can't edit this account to avoid system error.`;
        }
      }

      // if (status === 'Active' || status === 'Open') {
      //   let acceptedPropertiesForUpdation;
      //   switch (account_type) {
      //     case 'Project Trust Account':
      //       {
      //         acceptedPropertiesForUpdation = [
      //           'delegate_powers',
      //           'bank_account_id',
      //           'company_id',
      //         ];
      //       }
      //       break;
      //     case 'Retention Trust Account':
      //       {
      //         acceptedPropertiesForUpdation = [
      //           'retention_trust_certificate_attachment_ids',
      //           'project_ids',
      //           'delegate_powers',
      //           'bank_account_id',
      //           'company_id',
      //         ];
      //       }
      //       break;
      //     case 'Cash Account':
      //       {
      //         acceptedPropertiesForUpdation = [
      //           'delegate_powers',
      //           'bank_account_id',
      //           'company_id',
      //         ];
      //       }
      //       break;
      //   }
      //   const receivedPropertiesForUpdation = Object.keys(data);
      //   for (let i = 0; i < receivedPropertiesForUpdation.length; i++) {
      //     if (
      //       !acceptedPropertiesForUpdation.includes(
      //         receivedPropertiesForUpdation[i],
      //       )
      //     )
      //       throw `Invalid input. Accepted updatable fields are ${acceptedPropertiesForUpdation.join(', ')}.`;
      //   }
      // }
      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating the details to be edited in a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async validateChangeStatusOfABankAccount(
    data: ChangeStatusOfBankAccountInput,
  ) {
    try {
      this.logger.log(
        `Handling request for validating details in change status of a bank account with data: ${JSON.stringify(data)}`,
      );

      const { status, bank_account_id } = data;
      const bankAccountToBeEdited = await this.bankAccountsRepo.findOne({
        where: { bank_account_id },
        select: ['status', 'account_type'],
      });
      if (!bankAccountToBeEdited)
        throw `Invalid data. Bank account id which you have provided is invalid or not present.`;

      if (
        bankAccountToBeEdited.account_type == 'Cash Account' &&
        data.status == 'Deleted'
      ) {
        const associatedCashAccounts = await this.bankAccountsRepo.findOne({
          where: {
            associated_cash_account_id: bank_account_id,
            bank_account_id: Not(bank_account_id),
            status: Not('Deleted'),
          },
        });
        if (associatedCashAccounts) {
          throw `This account cannot be deleted since it is associated with trust accounts`;
        }
      }

      const contractDetails = await this.contractDetails
        .createQueryBuilder('c')
        .select('c.id', 'id')
        .addSelect('c.contract_status', 'contract_status')
        .distinct(true)
        .where(
          `c.payment_from_account = :accountId OR c.payment_to_account = :accountId OR c.retention_from_account = :accountId`,
          { accountId: bank_account_id },
        )
        .getRawMany();

      const paymentDetails = await this.paymentDetails
        .createQueryBuilder('p')
        .select('p.id', 'id')
        .addSelect('p.current_status', 'current_status')
        .distinct(true)
        .where(
          `p.payment_from_account = :accountId OR p.payment_to_account = :accountId OR p.retention_account = :accountId`,
          { accountId: bank_account_id },
        )
        .getRawMany();

      let totalContractCount = 0,
        deletedContractsCount = 0,
        completedContractsCount = 0,
        totalPaymentCount = 0,
        deletedPaymentsCount = 0,
        completedPaymentsCount = 0;
      if (contractDetails) {
        totalContractCount = contractDetails.length;
        deletedContractsCount = contractDetails.filter(
          (c) => c.contract_status === 'Deleted',
        ).length;
        completedContractsCount = contractDetails.filter(
          (c) => c.contract_status === 'Completed',
        ).length;
      }

      if (paymentDetails) {
        totalPaymentCount = paymentDetails.length;
        deletedPaymentsCount = paymentDetails.filter(
          (p) => p.current_status === 'Deleted',
        ).length;
        completedPaymentsCount = paymentDetails.filter(
          (p) =>
            p.current_status === 'Paid - Matched' ||
            p.current_status === 'Received - Matched' ||
            p.current_status === 'No Match Required',
        ).length;
      }

      const currentStatus = bankAccountToBeEdited.status;
      const statusToBeUpdated = status;

      if (currentStatus === 'Active' || currentStatus === 'Open') {
        if (
          statusToBeUpdated === 'Closed' &&
          (totalContractCount - deletedContractsCount ===
            completedContractsCount ||
            totalPaymentCount - deletedPaymentsCount === completedPaymentsCount)
        ) {
          throw `There are still contracts, payments/claims that are in process. Please ensure all are in a completed state before closing the account.`;
        } else if (
          statusToBeUpdated === 'Deleted' &&
          (totalContractCount > 0 || totalPaymentCount > 0)
        ) {
          throw `There are still contracts, payments/claims that are in process. You can't move this account to the archive list to avoid system error.`;
        }
      }
      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating the details in change status of a bank account with message: ${error}`,
      );
      throw new Error(error);
    }
  }
}
