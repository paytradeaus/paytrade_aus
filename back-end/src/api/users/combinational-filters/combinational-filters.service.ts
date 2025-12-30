import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput } from './combinational-filters.input';
import { FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListResponse } from './combinational-filters.response';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentClaims } from 'src/entities/banking.entity';
import { Repository } from 'typeorm';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class UserCombinationalFiltersService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(RetentionDetails)
    private retentionDetails: Repository<RetentionDetails>,
  ) {
    this.logger = new PaytradeLogger('USER_COMBINATIONAL_FILTERS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
    filters: FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput,
  ): Promise<FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListResponse> {
    try {
      this.logger.log(
        `Request received for fetching filters of payment claims and retentions list with data: ${JSON.stringify(filters)}`,
      );
      const {
        project_id,
        contract_id,
        client_supplier_id,
        company_id,
        client_supplier_type,
      } = filters;

      // Create the base query for fetching both Projects and Contracts.
      const query = this.projectDetails
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.contractDetails', 'contract')
        .leftJoinAndSelect('contract.clientSuppliersDetails', 'clientSupplier')
        .leftJoinAndSelect(
          'contract.contractPaymentFromAccount',
          'paymentFromAcc',
        )
        .select([
          'project.project_id AS project_id',
          'project.project_name AS project_name',
          'contract.contract_id AS contract_id',
          'contract.contract_name AS contract_name',
          'clientSupplier.client_supplier_id AS client_supplier_id',
          'clientSupplier.client_supplier_name AS client_supplier_name',
          'clientSupplier.client_supplier_type AS client_supplier_type',
          'paymentFromAcc.bank_account_id AS from_account_id',
          'paymentFromAcc.account_name AS from_account_name',
          'paymentFromAcc.account_type AS from_account_type',
          'paymentFromAcc.account_number AS from_account_number',
        ])
        .where('project.company_id = :company_id', { company_id })
        .andWhere(`project.project_status <> 'Deleted'`);

      // Apply filtering logic based on provided input values.
      if (project_id) {
        query.andWhere('project.project_id = :project_id', { project_id });
      }

      if (contract_id) {
        query.andWhere('contract.contract_id = :contract_id', { contract_id });
      }

      if (client_supplier_id) {
        query.andWhere(
          'clientSupplier.client_supplier_id = :client_supplier_id',
          { client_supplier_id },
        );
      }

      if (client_supplier_type) {
        query.andWhere(
          `clientSupplier.client_supplier_type = :client_supplier_type`,
          { client_supplier_type },
        );
      }
      const rawResults = await query.getRawMany();

      const projects = rawResults
        .filter((result) => result.project_id != null)
        .map((result) => ({
          project_id: result.project_id,
          project_name: result.project_name,
        }));

      const contracts = rawResults
        .filter((result) => result.contract_id != null)
        .map((result) => ({
          contract_id: result.contract_id,
          contract_name: result.contract_name,
        }));

      const clientsSuppliers = rawResults
        .filter((result) => result.client_supplier_id != null)
        .map((result) => ({
          client_supplier_id: result.client_supplier_id,
          client_supplier_name: result.client_supplier_name,
          client_supplier_type: result.client_supplier_type,
        }));

      const fromAccountDetails = rawResults
        .filter((result) => result.from_account_id != null)
        .map((result) => ({
          from_account_id: result.from_account_id,
          from_account_name: result.from_account_name,
          from_account_type: result.from_account_type,
        }));

      // Remove duplicates to maintain unique values.
      const uniqueProjects = Array.from(
        new Map(projects.map((item) => [item.project_id, item])).values(),
      ).sort((a, b) =>
        a.project_name?.trim()?.localeCompare(b.project_name?.trim()),
      );
      const uniqueContracts = Array.from(
        new Map(contracts.map((item) => [item.contract_id, item])).values(),
      ).sort((a, b) =>
        a.contract_name?.trim()?.localeCompare(b.contract_name?.trim()),
      );

      const uniqueFromAccounts = Array.from(
        new Map(
          fromAccountDetails.map((item) => [item.from_account_id, item]),
        ).values(),
      ).sort((a, b) =>
        a.from_account_name?.trim()?.localeCompare(b.from_account_name?.trim()),
      );

      const uniqueClientsSuppliers = Array.from(
        new Map(
          clientsSuppliers.map((item) => [item.client_supplier_id, item]),
        ).values(),
      ).sort((a, b) =>
        a.client_supplier_name
          ?.trim()
          ?.localeCompare(b.client_supplier_name?.trim()),
      );

      this.logger.log(
        `Filters of payment claims and list with data: ${JSON.stringify(filters)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Filters of payment claims and retentions list successfully fetched.`,
        {
          projects: uniqueProjects,
          contracts: uniqueContracts,
          clientSuppliers: uniqueClientsSuppliers,
          fromAccounts: uniqueFromAccounts,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching filters of payment claims list with message: ${error}`,
      );
      throw error;
    }
  }
}
