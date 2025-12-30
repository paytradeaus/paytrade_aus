import { Injectable } from '@nestjs/common';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  activateComplianceRulesInput,
  FetchActivenessOfComplianceChecksInput,
  FetchAllFiltersInAdminCompliancesListInput,
  FetchContractValueToCheckContractEligibilityInput,
  SetContractValueToCheckContractEligibilityInput,
  SwitchComplianceChecksInput,
} from './compliances.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  ComplianceChecks,
  ComplianceSettings,
} from 'src/entities/compliances.entity';
import {
  compliancePTAChecks,
  complianceRTAChecks,
} from 'src/api/users/compliances/compliances.checks';
import { BankAccounts } from 'src/entities/banking.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import {
  IListOfBankAccounts,
  IListOfCompanies,
  IListOfProjects,
} from './compliances.interfaces';
import { FetchActivenessOfComplianceChecks } from './compliances.response';
import { CompliancesService } from 'src/api/users/compliances/compliances.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class AdminCompliancesService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ComplianceChecks)
    private readonly complianceChecksRepo: Repository<ComplianceChecks>,
    @InjectRepository(BankAccounts)
    private readonly bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(ProjectDetails)
    private readonly projectDetailsRepo: Repository<ProjectDetails>,
    @InjectRepository(CompanyDetails)
    private readonly companyDetailsRepo: Repository<CompanyDetails>,
    @InjectRepository(ComplianceSettings)
    private readonly complianceSettingsRepo: Repository<ComplianceSettings>,
     private readonly ptContentService: CompliancesService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_COMPLIANCES_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async switchComplianceChecks(data: SwitchComplianceChecksInput) {
    try {
      this.logger.log(
        `Request received for switching compliance checks with data: ${JSON.stringify(data)}`,
      );

      //ALGORITHMS
      /*
      - Initialize a variable with an empty array named inactiveChecks.
      - Fetch all the check names of the incoming names from the compliance checks object where the value is false.
        and push them inside the inactiveChecks.
      - Update all the checks inside the inactiveChecks of PTA or RTA with the value of is_active as false and return 
        the response of the API as SUCCESS.
      **/
      const { projectTrustAccount, retentionTrustAccount } = data;
      // console.log('pta', projectTrustAccount);
      // console.log('rta', retentionTrustAccount);
      if (!projectTrustAccount && !retentionTrustAccount)
        throw `Expecting compliance checks of either project trust account or retention trust account with data: ${JSON.stringify(data)}`;

      if (projectTrustAccount) {
        //Updating inactive checks of PTA.
        const inactiveChecksOfPTA = Object.entries(projectTrustAccount).reduce(
          (acc, [key, value]) => {
            if (!value) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );
        console.log('inactiveChecksOfPTA', inactiveChecksOfPTA);
        const inactiveChecksArray = Object.keys(inactiveChecksOfPTA);
        console.log('inactiveChecksArray', inactiveChecksArray);
        const inactiveCheckNames = [];
        for (let i = 0; i < inactiveChecksArray.length; i++) {
          for (let j = 0; j < compliancePTAChecks.length; j++) {
            if (compliancePTAChecks[j].function == inactiveChecksArray[i]) {
              inactiveCheckNames.push(compliancePTAChecks[j].name);
            }
          }
        }
        console.log('inactiveCheckNames', inactiveCheckNames);

        if (inactiveCheckNames.length) {
          await this.complianceChecksRepo
            .createQueryBuilder()
            .update(ComplianceChecks)
            .set({ is_active: false })
            .where('check_name IN (:...names)', { names: inactiveCheckNames })
            .andWhere({ bank_account_type: 'Project Trust Account' })
            .execute();
          console.log('--------->1');
        }

        //Updating active checks of PTA.
        const activeChecksOfPTA = Object.entries(projectTrustAccount).reduce(
          (acc, [key, value]) => {
            if (value) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );
        console.log('activeChecksOfPTA', activeChecksOfPTA);
        const activeChecksArray = Object.keys(activeChecksOfPTA);
        console.log('activeChecksArray', activeChecksArray);
        const activeCheckNames = [];
        for (let i = 0; i < activeChecksArray.length; i++) {
          for (let j = 0; j < compliancePTAChecks.length; j++) {
            if (compliancePTAChecks[j].function == activeChecksArray[i]) {
              activeCheckNames.push(compliancePTAChecks[j].name);
            }
          }
        }
        console.log('activeCheckNames', activeCheckNames);

        if (activeCheckNames.length) {
          await this.complianceChecksRepo
            .createQueryBuilder()
            .update(ComplianceChecks)
            .set({ is_active: true })
            .where('check_name IN (:...names)', { names: activeCheckNames })
            .andWhere({ bank_account_type: 'Project Trust Account' })
            .execute();
        }
        console.log('--------->2');
      } else if (retentionTrustAccount) {
        //Updating the inactive checks of RTA.
        const inactiveChecksOfRTA = Object.entries(
          retentionTrustAccount,
        ).reduce((acc, [key, value]) => {
          if (!value) {
            acc[key] = value;
          }
          return acc;
        }, {});
        console.log('inactiveChecksOfRTA', inactiveChecksOfRTA);
        const inactiveChecksArray = Object.keys(inactiveChecksOfRTA);
        console.log('inactiveChecksArray', inactiveChecksArray);

        const inactiveCheckNames = [];
        for (let i = 0; i < inactiveChecksArray.length; i++) {
          for (let j = 0; j < complianceRTAChecks.length; j++) {
            if (complianceRTAChecks[j].function == inactiveChecksArray[i]) {
              inactiveCheckNames.push(complianceRTAChecks[j].name);
            }
          }
        }
        console.log('inactiveCheckNames', inactiveCheckNames);

        if (inactiveCheckNames.length) {
          await this.complianceChecksRepo
            .createQueryBuilder()
            .update(ComplianceChecks)
            .set({ is_active: false })
            .where('check_name IN (:...names)', { names: inactiveCheckNames })
            .andWhere({ bank_account_type: 'Retention Trust Account' })
            .execute();
          console.log('--------->2');
        }

        //Updating the active checks of RTA.
        const activeChecksOfRTA = Object.entries(retentionTrustAccount).reduce(
          (acc, [key, value]) => {
            if (value) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );
        console.log('activeChecksOfRTA', activeChecksOfRTA);
        const activeChecksArray = Object.keys(activeChecksOfRTA);
        console.log('activeChecksArray', activeChecksArray);

        const activeCheckNames = [];
        for (let i = 0; i < activeChecksArray.length; i++) {
          for (let j = 0; j < complianceRTAChecks.length; j++) {
            if (complianceRTAChecks[j].function == activeChecksArray[i]) {
              activeCheckNames.push(complianceRTAChecks[j].name);
            }
          }
        }
        console.log('activeCheckNames', activeCheckNames);

        if (activeCheckNames.length) {
          await this.complianceChecksRepo
            .createQueryBuilder()
            .update(ComplianceChecks)
            .set({ is_active: true })
            .where('check_name IN (:...names)', { names: activeCheckNames })
            .andWhere({ bank_account_type: 'Retention Trust Account' })
            .execute();
          console.log('--------->2');
        }
      }
      this.logger.log(
        `Activeness of compliance checks updated successfully with data: ${JSON.stringify(data)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Activeness of compliance checks updated successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while switching compliance checks with message: ${error}`,
      );
      throw error;
    }
  }

  async updateComplianceRuleStatus(input: activateComplianceRulesInput) {

    try {
      const { bank_account_type, check_number, rule_number, is_active } = input;

      if (rule_number !== undefined && rule_number !== null) {
        // Update a specific rule
        const result = await this.complianceChecksRepo.update(
          { bank_account_type, check_number, rule_number },
          { is_active }
        );

        return framedResponse(
          'SUCCESS',
          `Activeness of compliance rules updated successfully.`,
        );
      }

      // Update all rules under the specified check_number
      const result = await this.complianceChecksRepo.update(
        { bank_account_type, check_number },
        { is_active }
      );

      return framedResponse(
        'SUCCESS',
        `Activeness of compliance checks updated successfully.`,
      );
    }
    catch (error) {
      this.logger.error(
        `Errored while switching compliance checks with message: ${error}`,
      );
      throw error;
    }
  }

  async recalculateComplianceForAllProjects(check_number: number, bank_account_type: string) {
    try {
      const projects = await this.projectDetailsRepo.find({
        where: { project_status: 'In Progress' },
        select: ['project_id'],
      });
      const projectIds = projects.map((project) => project.project_id);

      for (const projectId of projectIds) {
        const isPTA = bank_account_type === 'Project Trust Account'
        await this.ptContentService.syncCompliancesOfProject(projectId, check_number, isPTA);
        console.log("Updated Project Compliance - ", projectId)
      }
    } catch (error) {
      this.logger.error(
        `Errored while generating a mail for compliance of all projectswith message: ${error}`,
      );
      throw new Error(error);
    }
  }


  async fetchActivenessOfComplianceChecks(
    data: FetchActivenessOfComplianceChecksInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching activeness of compliance checks with data: ${JSON.stringify(data)}`,
      );
      const { bank_account_type } = data;

      const rawRules = await this.complianceChecksRepo.find({
        where: { bank_account_type },
        select: ['check_name', 'check_number', 'rule_number', 'content', 'is_active'],
        order: {
          check_number: 'ASC',
          rule_number: 'ASC',
        },
      });


      const groupedResults: FetchActivenessOfComplianceChecks[] = [];

      for (const rule of rawRules) {
        let checkGroup = groupedResults.find(
          group => group.check_number === rule.check_number && group.check_name === rule.check_name
        );

        if (!checkGroup) {
          checkGroup = {
            check_name: rule.check_name,
            check_number: rule.check_number,
            check_active: null,
            rules: [],
          };
          groupedResults.push(checkGroup);
        }

        checkGroup.rules.push({
          rule_number: rule.rule_number,
          content: rule.content,
          is_active: rule.is_active,
        });
      }

      for (const group of groupedResults) {
        group.check_active = group.rules.some(rule => rule.is_active);
      }

      return framedResponse(
        'SUCCESS',
        `Activeness results of all compliance checks fetched successfully.`,
        groupedResults,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching activeness of compliance checks by admin with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchAllFiltersInAdminCompliancesList(
    data: FetchAllFiltersInAdminCompliancesListInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all filters in admin compliances list with data: ${JSON.stringify(data)}`,
      );

      const { company_id, project_id, bank_account_id } = data;
      console.log('data', data);
      const companyDetails =
        await this.companyDetailsRepo.createQueryBuilder('company');
      const bankAccountDetails =
        await this.bankAccountsRepo.createQueryBuilder('account');
      const projectDetails =
        await this.projectDetailsRepo.createQueryBuilder('project');

      if (company_id) {
        companyDetails.andWhere('company.company_id = :company_id', {
          company_id,
        });
        bankAccountDetails.andWhere('account.company_id = :company_id', {
          company_id,
        });
        projectDetails.andWhere('project.company_id = :company_id', {
          company_id,
        });
      }

      if (project_id) {
        projectDetails.andWhere('project.project_id = :project_id', {
          project_id,
        });
        bankAccountDetails.andWhere(
          ":project_id = ANY(string_to_array(account.project_ids, ',')::int[])",
          {
            project_id,
          },
        );
      }

      if (bank_account_id) {
        bankAccountDetails.andWhere(
          'account.bank_account_id = :bank_account_id',
          { bank_account_id },
        );
      }

      const companies = await companyDetails.getMany();
      console.log('companies', companies);
      const accounts = await bankAccountDetails.getMany();
      console.log('accounts', accounts);
      const projects = await projectDetails.getMany();
      console.log('projects', projects);

      const accountTypes = await bankAccountDetails
        .select('DISTINCT account.account_type')
        .getRawMany();
      console.log('accountTypes', accountTypes);
      const account_types = accountTypes
        .filter((result) => result.account_type !== 'Cash Account')
        .map((result) => result.account_type);
      console.log('account_types', account_types);
      const company_list: IListOfCompanies[] = companies.map((company) => ({
        company_id: company.company_id,
        company_name: company.company_name,
      }));
      console.log('company_list', company_list);

      const account_list: IListOfBankAccounts[] = accounts.map((account) => ({
        bank_account_id: account.bank_account_id,
        bank_account_name: account.account_name,
      }));
      console.log('account_list', account_list);

      const project_list: IListOfProjects[] = projects.map((project) => ({
        project_id: project.project_id,
        project_name: project.project_name,
      }));
      console.log('project_list', project_list);

      this.logger.log(
        `Fetched filters for admin compliances list with data: ${JSON.stringify({ company_list, account_list, project_list })}`,
      );

      return framedResponse(
        'SUCCESS',
        `Fetched filters for admin compliances list successfully.`,
        { company_list, account_list, project_list, account_types },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all filters in admin compliances list with message: ${error}`,
      );
      throw error;
    }
  }

  async setContractValueToCheckContractEligibility(
    data: SetContractValueToCheckContractEligibilityInput,
  ) {
    try {
      const { contract_value, admin_id } = data;
      console.log('contract_value', contract_value);

      const createdContractDetails =
        await this.complianceSettingsRepo.create(data);

      await this.complianceSettingsRepo.save(createdContractDetails);
      return framedResponse(
        'SUCCESS',
        `Contract value has been set for checking contract eligibility successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while setting contract value to check contract eligibility with message: ${error}`,
      );
      throw error;
    }
  }

  async fetchContractValueToCheckContractEligibility(
    data: FetchContractValueToCheckContractEligibilityInput,
  ) {
    try {
      const fetchedContractDetails = await this.complianceSettingsRepo.findOne({
        where: { admin_id: data.admin_id },
        select: ['contract_value'],
        order: { created_on: 'DESC' },
      });
      console.log('fetchedContractDetails', fetchedContractDetails);
      const contractValue = fetchedContractDetails?.contract_value;
      console.log('contractValue', contractValue);

      return framedResponse(
        'SUCCESS',
        `Contract value has been fetched successfully.`,
        { contract_value: contractValue },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching contract value with message: ${error}`,
      );
      throw error;
    }
  }
}
