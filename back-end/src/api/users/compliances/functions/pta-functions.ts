import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Between, Repository } from 'typeorm';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import {
  ComplianceChecks,
  ComplianceSettings,
  PtaCompliances,
} from 'src/entities/compliances.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import {
  IFetchedAllContents,
  IFetchedAllRules,
  IProjectDetails,
  IProjectTrustAccount,
} from './functions.interfaces';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { todayIsGreaterThanOpeningDatePlusBusinessDays } from './functions';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { TransactionDetails } from 'src/entities/transaction-details.entity';
import {
  fetchComplianceRuleDetails,
  filterComplianceContentDetails,
} from './functions';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';

@Injectable()
export class CompliancePTAFunctions {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(VariationDetails)
    private variationsRepo: Repository<VariationDetails>,
    @InjectRepository(ContractDetails)
    private contractsRepo: Repository<ContractDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PtaCompliances)
    private ptaCompliancesRepo: Repository<PtaCompliances>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(ComplianceChecks)
    private complianceChecksRepo: Repository<ComplianceChecks>,
    @InjectRepository(NoticeDetails)
    private noticeDetailsRepo: Repository<NoticeDetails>,
    @InjectRepository(ReconciliationReport)
    private reconcileReportRepo: Repository<ReconciliationReport>,
    @InjectRepository(AuditReport)
    private auditReportRepo: Repository<AuditReport>,
    @InjectRepository(TransactionDetails)
    private transactionsRepo: Repository<TransactionDetails>,
    @InjectRepository(ComplianceSettings)
    private complianceSettingsRepo: Repository<ComplianceSettings>,
    @InjectRepository(HolidayDetails)
    private holidayDetails: Repository<HolidayDetails>,
    @InjectRepository(ProjectDetails)
    private readonly projectsRepo: Repository<ProjectDetails>,
  ) {
    this.logger = new PaytradeLogger('COMPLIANCE_PTA_FUNCTIONS');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async checkContractEligibility(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for verifying the compliance check named check contract eligibility with data: ${JSON.stringify(data)}`,
      );

      const {
        id,
        project_id,
        pta_eligibility,
        number_of_units,
        head_contract_sum,
        bank_account_type,
        project_role,
      } = data;
      const resultsOfCheck = [];

      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 1,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      const projectData = await this.projectsRepo.findOne({
        where: { project_id },
        select: ['project_role'],
      });

      if (projectData.project_role === 'Principal') {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          1,
          1,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContent,
        });
      } else {
        const fetchedContractDetails = await this.contractsRepo.find({
          where: { project_id, client_supplier_role: 'Head Contractor' },
          select: ['initial_contract_sum'],
        });
        const fetchedVariationDetails = await this.variationsRepo.find({
          where: { project_id, variation_status: 'Agreed' },
          select: ['variation_amount'],
        });
        const sum_of_all_contract_initial_sum = fetchedContractDetails.length
          ? fetchedContractDetails
              .map((contract) => Number(contract.initial_contract_sum))
              .reduce((arr, curr) => arr + curr)
          : 0;
        //   'sum_of_all_contract_initial_sum',
        //   sum_of_all_contract_initial_sum,
        // );
        const sum_of_all_variation_amounts = fetchedVariationDetails.length
          ? fetchedVariationDetails
              .map((variation) => Number(variation.variation_amount))
              .reduce((arr, curr) => arr + curr)
          : 0;


        const contractValueDetails = await this.complianceSettingsRepo.find();


        if (
          Number(head_contract_sum) > contractValueDetails[0].contract_value
        ) {
          if (projectTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              3,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(projectTrustAccount.bank_account_id) },
              ...fetchedContent,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              2,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(id) },
              ...fetchedContent,
            });
          }
        } else if (pta_eligibility == 'No') {
          if (projectTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(projectTrustAccount.bank_account_id) },
              ...fetchedContent,
            });
          } else if (
            sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
              contractValueDetails[0].contract_value &&
            number_of_units < 3
          ) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              1,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              1,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        } else if (pta_eligibility == 'Yes') {
          if (
            sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
              contractValueDetails[0].contract_value &&
            number_of_units >= 3
          ) {
            if (projectTrustAccount) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                1,
                3,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: String(projectTrustAccount.bank_account_id),
                },
                ...fetchedContent,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                1,
                2,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{ reference_id: String(id) },
                ...fetchedContent,
              });
            }
          } else {
            /*
             This block will be executed if the sum of all contract initial sum and 
             all variation amounts is not less than 10000000.
            **/
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              1,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        }
      }
      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named check contract eligibility with message: ${error}`,
      );
      throw error;
    }
  }

  async openProjectTrustAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for verifying the compliance check named open project trust account with data: ${JSON.stringify(data)}`,
      );

      const {
        id,
        project_id,
        pta_eligibility,
        number_of_units,
        head_contract_sum,
        bank_account_type,
        project_role,
      } = data;
      const resultsOfCheck = [];

      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 2,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      const projectData = await this.projectsRepo.findOne({
        where: { project_id },
        select: ['project_role'],
      });

      if (projectData.project_role === 'Principal') {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          2,
          1,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContent,
        });
      } else {
        const fetchedContractDetails = await this.contractsRepo.find({
          where: { project_id },
          select: ['initial_contract_sum'],
        });
        const fetchedVariationDetails = await this.variationsRepo.find({
          where: { project_id, variation_status: 'Agreed' },
          select: ['variation_amount'],
        });
        const sum_of_all_contract_initial_sum = fetchedContractDetails.length
          ? fetchedContractDetails
              .map((contract) => Number(contract.initial_contract_sum))
              .reduce((arr, curr) => arr + curr)
          : 0;
        //   'sum_of_all_contract_initial_sum',
        //   sum_of_all_contract_initial_sum,
        // );
        const sum_of_all_variation_amounts = fetchedVariationDetails.length
          ? fetchedVariationDetails
              .map((variation) => Number(variation.variation_amount))
              .reduce((arr, curr) => arr + curr)
          : 0;

        const contractValueDetails = await this.complianceSettingsRepo.find();

        if (
          Number(head_contract_sum) > contractValueDetails[0].contract_value
        ) {
          if (projectTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(projectTrustAccount.bank_account_id) },
              ...fetchedContent,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              2,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(id) },
              ...fetchedContent,
            });
          }
        } else if (pta_eligibility == 'No') {
          if (projectTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{ reference_id: String(projectTrustAccount.bank_account_id) },
              ...fetchedContent,
            });
          } else if (
            sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
              contractValueDetails[0].contract_value &&
            number_of_units < 3
          ) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              1,
              fetchedAllRules,
            );
            resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              1,
              fetchedAllRules,
            );
            resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
          }
        } else if (pta_eligibility == 'Yes') {
          if (
            sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
              contractValueDetails[0].contract_value &&
            number_of_units >= 3
          ) {
            if (projectTrustAccount) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                2,
                3,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: String(projectTrustAccount.bank_account_id),
                },
                ...fetchedContent,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                2,
                2,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{ reference_id: String(id) },
                ...fetchedContent,
              });
            }
          } else {
            /*
             This block will be executed if the sum of all contract initial sum and 
             all variation amounts is not less than 10000000.
            **/
            if (projectTrustAccount) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                2,
                3,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: String(projectTrustAccount.bank_account_id),
                },
                ...fetchedContent,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                2,
                1,
                fetchedAllRules,
              );
              resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
            }
          }
        }
      }
      return resultsOfCheck;
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      throw error;
    }
  }

  async notifyPartiesOfTheTrustAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { project_id, id, bank_account_type } = data;
      const resultsOfCheck = [];

      //Check 3 rule 1
      //Checking the status of the QBCC TA1 project trust account notice created against a project.
      const qbccTA1ProjectTrustAccountNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'QBCC TA1 Project Trust Account Notice',
          })
          .andWhere('n.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
          })
          .getRawOne();
      //   'qbccTA1ProjectTrustAccountNoticeDetails',
      //   qbccTA1ProjectTrustAccountNoticeDetails,
      // );

      const fetchedContentOfFirstRule = await this.complianceChecksRepo.findOne(
        {
          where: {
            check_number: 3,
            rule_number: 1,
            bank_account_type: 'Project Trust Account',
          },
          select: ['rule_number', 'content'],
        },
      );

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          1,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOfFirstRule,
        });
      } else if (
        projectTrustAccount &&
        qbccTA1ProjectTrustAccountNoticeDetails &&
        (qbccTA1ProjectTrustAccountNoticeDetails.status == 'Not Sent' ||
          qbccTA1ProjectTrustAccountNoticeDetails.status == 'Draft')
      ) {
        //Check if today > PTA opening date + 5 business days.
        const holidayDetails = await this.holidayDetails.find({
          where: { holiday_status: 'Active' },
        });

        const isTodayGreaterThanOpeningDatePlus5BusinessDays =
          await todayIsGreaterThanOpeningDatePlusBusinessDays({
            startDate: projectTrustAccount.opening_date,
            businessDays: 5,
            holidayDetails,
          });
        //   'isTodayGreaterThanOpeningDatePlus5BusinessDays',
        //   isTodayGreaterThanOpeningDatePlus5BusinessDays,
        // );
        if (isTodayGreaterThanOpeningDatePlus5BusinessDays) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            3,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: qbccTA1ProjectTrustAccountNoticeDetails.id,
            },
            ...fetchedContentOfFirstRule,
          });
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            2,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: qbccTA1ProjectTrustAccountNoticeDetails.id,
            },
            ...fetchedContentOfFirstRule,
          });
        }
      } else if (
        projectTrustAccount &&
        qbccTA1ProjectTrustAccountNoticeDetails &&
        (qbccTA1ProjectTrustAccountNoticeDetails.status == 'Sent' ||
          qbccTA1ProjectTrustAccountNoticeDetails.status == 'Sent - Onboarded')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          4,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOfFirstRule,
        });
      }

      //Check 3 rule 2
      //Checking the status of the Client S18B Project Trust Account Notice created against a project.
      const clientS18BProjectTrustAccountNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'Client S18B Project Trust Account Notice',
          })
          .andWhere('n.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
          })
          .getRawOne();
      //   'clientS18BProjectTrustAccountNoticeDetails',
      //   clientS18BProjectTrustAccountNoticeDetails,
      // );

      const fetchedContentOf3rdRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 3,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          5,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(project_id),
          },
          ...fetchedContentOf3rdRule,
        });
      } else if (
        projectTrustAccount &&
        clientS18BProjectTrustAccountNoticeDetails &&
        (clientS18BProjectTrustAccountNoticeDetails.status == 'Not Sent' ||
          clientS18BProjectTrustAccountNoticeDetails.status == 'Draft')
      ) {
        const holidayDetails = await this.holidayDetails.find({
          where: { holiday_status: 'Active' },
        });
        //Check if today > PTA opening date + 5 business days.
        const isTodayGreaterThanOpeningDatePlus5BusinessDays =
          await todayIsGreaterThanOpeningDatePlusBusinessDays({
            startDate: projectTrustAccount.opening_date,
            businessDays: 5,
            holidayDetails,
          });
        //   'isTodayGreaterThanOpeningDatePlus5BusinessDays',
        //   isTodayGreaterThanOpeningDatePlus5BusinessDays,
        // );
        if (isTodayGreaterThanOpeningDatePlus5BusinessDays) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            7,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: clientS18BProjectTrustAccountNoticeDetails.id,
            },
            ...fetchedContentOf3rdRule,
          });
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            6,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: clientS18BProjectTrustAccountNoticeDetails.id,
            },
            ...fetchedContentOf3rdRule,
          });
        }
      } else if (
        projectTrustAccount &&
        clientS18BProjectTrustAccountNoticeDetails &&
        (clientS18BProjectTrustAccountNoticeDetails.status == 'Sent' ||
          clientS18BProjectTrustAccountNoticeDetails.status ==
            'Sent - Onboarded')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          8,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf3rdRule,
        });
      }

      //Check 3 rule 3
      //Checking the status of the Supplier S23 Project Trust Account Notice created against a project.
      const supplierS23ProjectTrustAccountNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'Supplier S23 Project Trust Account Notice',
          })
          .andWhere('n.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
          })
          .getRawOne();
      //   'supplierS23ProjectTrustAccountNoticeDetails',
      //   supplierS23ProjectTrustAccountNoticeDetails,
      // );

      const fetchedContentOf2ndRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 2,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          9,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf2ndRule,
        });
      } else if (
        projectTrustAccount &&
        supplierS23ProjectTrustAccountNoticeDetails &&
        (supplierS23ProjectTrustAccountNoticeDetails.status == 'Not Sent' ||
          supplierS23ProjectTrustAccountNoticeDetails.status == 'Draft')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          10,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: supplierS23ProjectTrustAccountNoticeDetails.id,
          },
          ...fetchedContentOf2ndRule,
        });
      } else if (
        projectTrustAccount &&
        supplierS23ProjectTrustAccountNoticeDetails &&
        (supplierS23ProjectTrustAccountNoticeDetails.status == 'Sent' ||
          supplierS23ProjectTrustAccountNoticeDetails.status ==
            'Sent - Onboarded')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          11,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf2ndRule,
        });
      }

      //Check 3 rule 4
      //Checking the status of the QBCC TA3 notice of related entities notices of Project Trust Account Notice created against a project.
      const qbccTa3NoticeOfRelatedEntitiesNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'QBCC TA3 Notice Of Related Entities',
          })
          .andWhere('n.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
          })
          .getRawOne();
      //   'qbccTa3NoticeOfRelatedEntitiesNoticeDetails',
      //   qbccTa3NoticeOfRelatedEntitiesNoticeDetails,
      // );

      const fetchedContentOf4thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 4,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          12,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(project_id),
          },
          ...fetchedContentOf4thRule,
        });
      } else if (
        projectTrustAccount &&
        qbccTa3NoticeOfRelatedEntitiesNoticeDetails &&
        (qbccTa3NoticeOfRelatedEntitiesNoticeDetails.status == 'Not Sent' ||
          qbccTa3NoticeOfRelatedEntitiesNoticeDetails.status == 'Draft')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          13,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: qbccTa3NoticeOfRelatedEntitiesNoticeDetails.id,
          },
          ...fetchedContentOf4thRule,
        });
      } else if (
        projectTrustAccount &&
        !qbccTa3NoticeOfRelatedEntitiesNoticeDetails
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          15,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf4thRule,
        });
      } else if (
        projectTrustAccount &&
        qbccTa3NoticeOfRelatedEntitiesNoticeDetails &&
        (qbccTa3NoticeOfRelatedEntitiesNoticeDetails.status == 'Sent' ||
          qbccTa3NoticeOfRelatedEntitiesNoticeDetails.status ==
            'Sent - Onboarded')
      ) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          14,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf4thRule,
        });
      }

      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while notifying parties of the trust account with message: ${error}`,
      );
      throw error;
    }
  }

  async administrationOfTheAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for verifying the compliance check named administration of the account with data: ${JSON.stringify(data)}`,
      );

      //ALGORITHMS:
      /* 
      - Check the presence of Project Trust Account created against a project.
        If there is no project trust account associated with the project, fetch the check_number 4 and rule number 1 and return 
        the result with data [check_number, check_name, rule_number, status_message, action_required_content, action_button_type, compliance_status];
      - Check if the delegated powers are Yes or No. 
        If the delegated powers is No, fetch and return the check no 4 and rule number 2 along with other details.
      - If the delegated powers is Yes, return check no 4 and rule number 3.
      */

      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];

      //Check 4 rule 1
      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the delegate powers.
      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          4,
          1,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContent,
        });
      } else if (projectTrustAccount) {
        if (projectTrustAccount.delegate_powers == 'No') {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            2,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(projectTrustAccount.bank_account_id),
            },
            ...fetchedContent,
          });
        } else if (projectTrustAccount.delegate_powers == 'Yes') {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContent,
          });
        }
      }
      //Check 4 rule 2
      const fetchedContentOf2ndRule = await filterComplianceContentDetails(
        4,
        2,
        fetchedAllContents,
      );

      resultsOfCheck.push(fetchedContentOf2ndRule);

      //Check 4 rule 3
      const fetchedContentOf3rdRule = await filterComplianceContentDetails(
        4,
        3,
        fetchedAllContents,
      );

      resultsOfCheck.push(fetchedContentOf3rdRule);

      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named administration of the account with message: ${error}`,
      );
      throw error;
    }
  }

  async paymentsFromThePrincipal(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];

      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 5,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Check 5 rule 1
      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          5,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsFromThePrincipal',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContent,
        });
      } else if (projectTrustAccount) {
        const contractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.payment_from_account AS payment_from_account',
            'c.payment_to_account AS payment_to_account',
            'c.contract_id AS contract_id',
            'ba.account_type AS bank_account_type',
          ])
          // .leftJoin(
          //   BankAccounts,
          //   'ba',
          //   'ba.bank_account_id = c.payment_from_account',
          // )
          .leftJoin(
            BankAccounts,
            'ba',
            `ba.bank_account_id = 
              CASE 
                WHEN c.payment_from_account IS NOT NULL THEN c.payment_from_account 
                ELSE c.payment_to_account 
              END`,
          )
          .where('c.project_id = :project_id', { project_id })
          .getRawOne();

        //Check if the account selected in the payment from account of contract is Project trust Account.
        if (
          contractDetails &&
          contractDetails.bank_account_type == 'Project Trust Account'
        ) {
          //Check if any of the Client Payment Claim notice related to the project is NOT SENT.
          const noticeDetails = await this.noticeDetailsRepo
            .createQueryBuilder('n')
            .select([
              'n.notice_type AS notice_type',
              'n.id AS id',
              'n.status AS status',
            ])
            .where('n.notice_type = :notice_type', {
              notice_type: 'Client Payment Claim Notice',
            })
            .andWhere('n.project_id = :project_id', { project_id })
            .andWhere('n.status NOT IN (:...excludedStatuses)', {
              excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
            })
            .getRawMany();
          if (noticeDetails && noticeDetails.length) {
            //Filtering all the notices in both SENT and NOT SENT status.
            const unsentNotices = noticeDetails.filter(
              (notice) =>
                notice.status === 'Not Sent' || notice.status === 'Draft',
            );

            const sentNotices = noticeDetails.filter(
              (notice) =>
                notice.status === 'Sent' ||
                notice.status === 'Sent - Onboarded',
            );

            if (unsentNotices.length) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                3,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOf5thCheck3rdRule',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{ reference_id: unsentNotices[0].id },
                ...fetchedContent,
              });
            } else if (sentNotices.length) {
              //Check whether any of the unmatched Receivable payments are present against a project.
              const fetchedPayments = await this.paymentsRepo
                .createQueryBuilder('p')
                .select([
                  'p.project_id AS projeect_id',
                  'p.payment_id AS payment_id',
                  'p.payment_claim_id AS payment_claim_id',
                  'p.current_status AS payment_status',
                  'pc.claim_type As claim_type',
                  'pc.cash_retention_type AS cash_retention_type',
                ])
                .leftJoin(
                  PaymentClaims,
                  'pc',
                  'pc.payment_claim_id = p.payment_claim_id',
                )
                .where('p.project_id = :project_id', { project_id })
                .andWhere('pc.claim_type = :claim_type', {
                  claim_type: 'Receivable',
                })
                .getRawMany();

              const unmatchedPayments = fetchedPayments.filter((payment) => {
                if (
                  payment.payment_status == 'Received - Unmatched' ||
                  payment.payment_status == 'Unconfirmed - Unmatched' ||
                  payment.payment_status == 'Confirmed'
                ) {
                  return payment;
                }
              });

              const paymentIds = fetchedPayments.map((p) => p.payment_id);
              let lateSubpayments = [];

              if (paymentIds.length) {
                // Fetch SubPayments of type 'Payment' for these payments
                const subPayments = await this.subPaymentsRepo
                  .createQueryBuilder('sp')
                  .select([
                    'sp.sub_payment_id AS sub_payment_id',
                    'sp.payment_id AS payment_id',
                    'sp.amount AS amount',
                    'sp.created_on AS created_on',
                    'sp.is_received_confirmed AS is_received_confirmed',
                    'sp.is_paid_confirmed AS is_paid_confirmed',
                    'sp.sub_payment_type AS sub_payment_type',
                  ])
                  .where('sp.payment_id IN (:...paymentIds)', { paymentIds })
                  .andWhere('sp.sub_payment_type = :type', { type: 'Payment' })
                  .getRawMany();

                const holidayDetails = await this.holidayDetails.find({
                  where: { holiday_status: 'Active' },
                });

                for (const sp of subPayments) {
                  const isOld =
                    await todayIsGreaterThanOpeningDatePlusBusinessDays({
                      startDate: sp.created_on,
                      businessDays: 3,
                      holidayDetails,
                    });

                  if (
                    isOld &&
                    !sp.is_received_confirmed &&
                    !sp.is_paid_confirmed
                  ) {
                    lateSubpayments.push(sp);
                  }
                }

                if (lateSubpayments.length) {
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    5,
                    6,
                    fetchedAllRules,
                  );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    reference_id: lateSubpayments[0].sub_payment_id,
                    ...fetchedContent,
                  });
                }
              }

              if (unmatchedPayments && unmatchedPayments.length) {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  5,
                  4,
                  fetchedAllRules,
                );
                //   'fetchedRuleDetailsOfCheck5Rule4',
                //   fetchedRuleDetails,
                // );

                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...{
                    reference_id: Number(projectTrustAccount.bank_account_id),
                  },
                  ...fetchedContent,
                });
              } else {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  5,
                  5,
                  fetchedAllRules,
                );
                //   'fetchedRuleDetailsOfCheck5Rule4',
                //   fetchedRuleDetails,
                // );

                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContent,
                });
              }
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              5,
              5,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsFromThePrincipal',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            5,
            5,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsFromThePrincipal',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContent,
          });
        }
      }

      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async paymentsToSubcontractors(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      // ALGORITHMS:
      /*
       - Check for the presence of payments by fetching all the payments created against a project. Select the payment_id and status
       If not present, fetch the check number 6 and rule number 9 from the entity and return it.
       - If present and not all the payments are in matched state, fetch the check number 6 and rule number 10 from the entity and return it along with action_button_type MATCH_TRANSACTIONS and reference_id as project_id.
       - If present and all the payments are in matched state, fetch the check number 6 and rule number 11 and return it along with action_button_type as NONE.
      */

      this.logger.log(
        `Request received for verifying the compliance check named payments to sub-contractors with data: ${JSON.stringify(data)}`,
      );

      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];
      const fetchedBillablePayments = await this.paymentsRepo
        .createQueryBuilder('p')
        .select([
          'p.payment_id AS payment_id',
          'p.current_status AS current_status',
          'p.payment_from_account AS bank_account_id',
          'p.company_id AS company_id',
        ])
        .leftJoin(
          PaymentClaims,
          'pc',
          'pc.payment_claim_id = p.payment_claim_id',
        )
        .where('p.project_id = :project_id', { project_id })
        .andWhere('pc.claim_type = :claim_type', { claim_type: 'Billable' })
        .andWhere(`p.current_status != 'Deleted'`)
        .getRawMany();

      //Check 6 rule 1
      const fetchedContentOf1stRule = await filterComplianceContentDetails(
        6,
        1,
        fetchedAllContents,
      );

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf1stRule,
        });
      } else {
        const fetchedAllPayments = await this.paymentsRepo
          .createQueryBuilder('p')
          .select(['p.current_status AS payment_status'])
          .leftJoin(
            BankAccounts,
            'ba',
            'p.payment_from_account = ba.bank_account_id',
          )
          .where(`p.project_id = :project_id`, { project_id })
          .andWhere(`ba.account_type = :account_type`, {
            account_type: 'Project Trust Account',
          })
          .getRawMany();
        //   'fetchedPaymentsInPaymentsToSubcontractorsRule1',
        //   fetchedAllPayments,
        // );

        if (fetchedAllPayments.length) {
          const filteredUnmatchedPayments = fetchedAllPayments.filter(
            (payment) =>
              ['Unconfirmed - Unmatched', 'Paid - Unmatched'].includes(
                payment.payment_status,
              ),
          );

          if (!filteredUnmatchedPayments.length) {
            //There is no incomplete payments present against a project.
            //Check for the status of Supplier Payment Schedule Notice for this project.

            const fetchedNoticeDetails = await this.noticeDetailsRepo
              .createQueryBuilder('n')
              .select([
                'n.id AS id',
                'n.notice_id AS notice_id',
                'n.status AS status',
                'n.notice_type AS notice_type',
              ])
              .where(`n.project_id = :project_id`, { project_id })
              .andWhere(`n.notice_type = :notice_type`, {
                notice_type: 'Supplier Payment Schedule Notice',
              })
              .andWhere(`n.status IN(:...status)`, {
                status: ['Sent', 'Not Sent', 'Sent - Onboarded', 'Draft'],
              })
              .getRawMany();

            //Filter the SENT and NOT SENT notices separately.
            const filteredUnsentNotices = fetchedNoticeDetails.filter(
              (notice) =>
                notice.status === 'Not Sent' || notice.status === 'Draf',
            );

            if (filteredUnsentNotices.length) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                3,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
              //   fetchedRuleDetails, filteredUnsentNotices,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{ reference_id: String(filteredUnsentNotices[0].id) },
                ...fetchedContentOf1stRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                4,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          } else {
            //There is incomplete payments present against a project.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              2,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf1stRule,
            });
          }
        } else {
          //There is incomplete payments present against a project.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            2,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf1stRule,
          });
        }
      }

      //Check 6 rule 2
      const fetchedContentOf2ndRule = await filterComplianceContentDetails(
        6,
        2,
        fetchedAllContents,
      );

      if (!projectTrustAccount) {
        //No project trust account found for the project.
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          5,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf2ndRule,
        });
      } else {
        //Check for the presence of transactions uploaded against a project trust account.
        const fetchedTransactions = await this.transactionsRepo
          .createQueryBuilder('tr')
          .select([
            'tr.transaction_id AS transaction_id',
            'tr.status AS transaction_status',
            'tr.is_matched AS is_matched',
            'tr.bank_account_id AS bank_account_id',
            'tr.updated_on AS updated_on',
          ])
          .where(`tr.bank_account_id = :bank_account_id`, {
            bank_account_id: projectTrustAccount.bank_account_id,
          })
          .orderBy({ 'tr.updated_on': 'DESC' })
          .getRawMany();

        const totalClaimAmount = await this.paymentClaimsRepo.query(`
          SELECT 
                SUM(claim_amount) AS total_claim_amount
          FROM 
                public.payment_claims
          WHERE 
                project_id = ${project_id}
                AND claim_type = 'Billable'
                AND status NOT IN ('No Match Required', 
                'Paid - Matched', 
                'Received - Matched', 
                'Deleted', 
                'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
                'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
                'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
                'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                'Paid - Unmatched',
                'Received - Unmatched');
        `);
        const sumOfUnpaidClaims = Number(
          totalClaimAmount[0]?.total_claim_amount,
        );
        const current_balance = projectTrustAccount.current_balance
          ? Number(projectTrustAccount.current_balance)
          : 0;

        if (fetchedTransactions.length) {
          //Check if the transaction was last updated one week ago.
          const lastUpdatedDate = new Date(fetchedTransactions[0].updated_on);
          const today = new Date();
          const diffInMs = today.getTime() - lastUpdatedDate.getTime();
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          //If the CSV transaction was updated more than 1 week ago.
          if (diffInDays > 7) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              6,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(projectTrustAccount.bank_account_id),
              },
              ...fetchedContentOf2ndRule,
            });

            //If the CSV transaction was updated less than 1 week ago and sum of unpaid total claim amounts <= current bank account balance..
          } else if (diffInDays < 7 && sumOfUnpaidClaims <= current_balance) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              7,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf2ndRule,
            });

            //If the CSV transaction was updated less than 1 week ago and sum of unpaid total claim amounts > current bank account balance..
          } else if (diffInDays < 7 && sumOfUnpaidClaims > current_balance) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              8,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(projectTrustAccount.bank_account_id),
              },
              ...fetchedContentOf2ndRule,
            });
          }
        } else {
          //If no transactions CSV files are found.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            7,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf2ndRule,
          });
        }
      }


      //Check 6 Rule 3
      const fetchedContentOf3rdRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 3,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          12,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf3rdRule,
        });
      } else {
        if (fetchedBillablePayments && !fetchedBillablePayments.length) {
          const fetched3rdRuleDetails = await fetchComplianceRuleDetails(
            6,
            9,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetched3rdRuleDetails,
            ...fetchedContentOf3rdRule,
          });
        } else {
          const filteredInCompletePayments =
            await fetchedBillablePayments.filter(
              (payment) =>
                payment.current_status != 'Unconfirmed - Matched' &&
                payment.current_status != 'No Match Required' &&
                payment.current_status != 'Paid - Matched' &&
                payment.current_status != 'Received - Matched',
            );

          if (filteredInCompletePayments.length) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              10,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(
                  filteredInCompletePayments[0].bank_account_id +
                    ',' +
                    filteredInCompletePayments[0].company_id,
                ),
              },
              ...fetchedContentOf3rdRule,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              11,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf3rdRule,
            });
          }
        }
      }

      //Check 6 rule 4
      const fetchedContentOf4thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 4,
          bank_account_type: 'Project Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          12,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf4thRule,
        });
      } else {
        if (fetchedBillablePayments.length) {
          //Check whether any unmatched payments are present or not.
          const filteredUnmatchedBillablePayments =
            fetchedBillablePayments.filter((payment) =>
              [
                'Unconfirmed - Unmatched',
                'Paid - Unmatched',
                'Confirmed',
              ].includes(payment.current_status),
            );
          //   'filteredUnmatchedBillablePayments',
          //   filteredUnmatchedBillablePayments,
          // );

          //Fetch rule details if all the payments are in MATCHED state.
          if (
            filteredUnmatchedBillablePayments.length !=
            fetchedBillablePayments.length
          ) {
            //Fetch Supplier Payment Remittance Advice notice details.
            const fetchedUnsentSupplierNoticeDetails =
              await this.noticeDetailsRepo
                .createQueryBuilder('n')
                .select([
                  'n.notice_type AS notice_type',
                  'n.id AS notice_id',
                  'n.status AS status',
                ])
                .where('n.notice_type = :notice_type', {
                  notice_type: 'Supplier Payment Remittance Advice Notice',
                })
                .andWhere('n.status = :status', { status: 'Not Sent' })
                .andWhere('n.project_id = :project_id', { project_id })
                .getRawMany();
            //   'fetchedUnsentSupplierNoticeDetails',
            //   fetchedUnsentSupplierNoticeDetails,
            // );

            if (fetchedUnsentSupplierNoticeDetails.length) {
              //Fetch rule details if any of the Supplier Remittance Advice Notices are not being SENT.
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                14,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: fetchedUnsentSupplierNoticeDetails[0].id,
                },
                ...fetchedContentOf4thRule,
              });
            }
          } else {
            //Fetch rule details if all the Supplier Remittance Advice Notices are being sent.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              15,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf4thRule,
            });
          }
          //NOTE : RESULTS of unmatched billable payments was not handled because of it's absence in Compliance process document.
        } else {
          //Fetch rule details if no payments have been created so far.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            13,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf4thRule,
          });
        }
      }

      //Check 6 rule 5
      const fetchedContentOf5thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 5,
          bank_account_type: 'Project Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      const fetchedRuleDetails = await fetchComplianceRuleDetails(
        6,
        20,
        fetchedAllRules,
      );
      //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
      //   fetchedRuleDetails,
      // );
      resultsOfCheck.push({
        ...fetchedRuleDetails,
        ...{
          reference_id: String(id),
        },
        ...fetchedContentOf5thRule,
      });

      //Check 6 rule 6
      const fetchedContentOf6thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 6,
          bank_account_type: 'Project Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          12,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf6thRule,
        });
      } else {
        if (fetchedBillablePayments.length) {
          //Check whether any unmatched payments are present or not.
          const filteredUnmatchedBillablePayments =
            fetchedBillablePayments.filter((payment) =>
              [
                'Unconfirmed - Unmatched',
                'Paid - Unmatched',
                'Confirmed',
              ].includes(payment.current_status),
            );
          //   'filteredUnmatchedBillablePayments',
          //   filteredUnmatchedBillablePayments,
          // );

          //Fetch rule details if all the payments are in MATCHED state.
          if (
            filteredUnmatchedBillablePayments.length !=
            fetchedBillablePayments.length
          ) {
            //Fetch Supplier Payment Remittance Advice notice details.
            const fetchedUnsentSupplierNoticeDetails =
              await this.noticeDetailsRepo
                .createQueryBuilder('n')
                .select([
                  'n.notice_type AS notice_type',
                  'n.id AS notice_id',
                  'n.status AS status',
                ])
                .where('n.notice_type = :notice_type', {
                  notice_type: 'Supplier Payment Remittance Advice Notice',
                })
                .andWhere('n.status = :status', { status: 'Not Sent' })
                .andWhere('n.project_id = :project_id', { project_id })
                .getRawMany();
            //   'fetchedUnsentSupplierNoticeDetails',
            //   fetchedUnsentSupplierNoticeDetails,
            // );

            if (fetchedUnsentSupplierNoticeDetails.length) {
              //Fetch rule details if any of the Supplier Remittance Advice Notices are not being SENT.
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                14,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: fetchedUnsentSupplierNoticeDetails[0].notice_id,
                },
                ...fetchedContentOf6thRule,
              });
            }
          } else {
            //Fetch rule details if all the Supplier Remittance Advice Notices are being sent.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              15,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf6thRule,
            });
          }
          //NOTE : RESULTS of unmatched billable payments was not handled because of it's absence in Compliance process document.
        } else {
          //Fetch rule details if no payments have been created so far.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            13,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf6thRule,
          });
        }
      }

      //Check 6 rule 7
      const fetchedContentOf7thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 7,
          bank_account_type: 'Project Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          16,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf7thRule,
        });
      } else {
        //Fetch all the confirmed part payments.
        const fetchedAllPartPayments = await this.paymentsRepo
          .createQueryBuilder('p')
          .select(['p.current_status AS payment_status'])
          .leftJoin(
            BankAccounts,
            'ba',
            'p.payment_from_account = ba.bank_account_id',
          )
          .where(`p.project_id = :project_id`, { project_id })
          .andWhere(`p.current_status IN(:...confirmedStatuses)`, {
            confirmedStatuses: ['Paid - Unmatched', 'Paid - Matched'],
          })
          .andWhere(`ba.account_type = :account_type`, {
            account_type: 'Project Trust Account',
          })
          .andWhere(`p.payment_type = :payment_type`, { payment_type: 'Part' })
          .getRawMany();
        //   'fetchedAllPaymentsInPaymentsToSubContractorsRule5',
        //   fetchedAllPartPayments,
        // );

        if (fetchedAllPartPayments.length) {
          //Fetched rule details by checking whether QBCC TA4 Part Payment notice for this project has been sent or not.
          const fetchedPartPaymentNoticeDetails = await this.noticeDetailsRepo
            .createQueryBuilder('n')
            .select([
              'n.id AS notice_id',
              'n.status AS notice_status',
              'n.notice_type AS notice_type',
            ])
            .where(`n.project_id = :project_id`, { project_id })
            .andWhere(`n.notice_type = :notice_type`, {
              notice_type: 'QBCC TA4 Part Payment Notice',
            })
            .andWhere('n.status NOT IN (:...excludedStatuses)', {
              excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
            })
            .getRawMany();
          //   'fetchedPartPaymentNoticeDetailsOfPaymentsToSubContractorsInRule5',
          //   fetchedPartPaymentNoticeDetails,
          // );

          //Filter QBCC TA4 Part Payment notice.
          if (fetchedPartPaymentNoticeDetails) {
            const filteredUnsentNotices =
              await fetchedPartPaymentNoticeDetails.filter(
                (notice) =>
                  notice.notice_status == 'Not Sent' ||
                  notice.notice_status == 'Sending' ||
                  notice.notice_status == 'Draft',
              );

            if (filteredUnsentNotices.length) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                18,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: String(
                    fetchedPartPaymentNoticeDetails[0].notice_id,
                  ),
                },
                ...fetchedContentOf7thRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                6,
                19,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
              //   fetchedRuleDetails,
              // );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf7thRule,
              });
            }
          } else {
            //Fetch rule details when no Part payment notices are present.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              17,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf7thRule,
            });
          }
        } else {
          //Fetch rule details when no confirmed part payments are present.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            17,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf7thRule,
          });
        }
      }

      //Check 6 Rule 8
      /*
       - Check if contracts are present against a project from the contracts entity by selecting the contract_id, project_id and uploaded_contract_pdf_id.
       - If not present, fetch the check number 6 and rule number 18 where reference id is project_id.
       - If present, check whether the contract PDF is uploaded or not.
         If contract PDF uploaded, fetch the check number 6 and rule number 20 where reference id is null.
         If contract PDF was not uploaded, fetch the check number 6 and rule number 19 where reference id is contract_id.
      **/
      const fetchedContentOf8thRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          rule_number: 8,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      const presenceOfContracts = await this.contractsRepo.find({
        where: { project_id },
        select: ['attachment_id', 'project_id', 'contract_id'],
      });
      if (presenceOfContracts && !presenceOfContracts.length) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          22,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{ reference_id: String(id) },
          ...fetchedContentOf8thRule,
        });
      } else if (presenceOfContracts && presenceOfContracts.length) {
        const filteredContractsWithoutAttachments =
          await presenceOfContracts.filter(
            (contract) => !contract.attachment_id,
          );
        //   'filteredContractWithoutAttachments',
        //   filteredContractsWithoutAttachments,
        // );

        if (
          filteredContractsWithoutAttachments &&
          filteredContractsWithoutAttachments.length
        ) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            23,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(
                filteredContractsWithoutAttachments[0].contract_id,
              ),
            },
            ...fetchedContentOf8thRule,
          });
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            21,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf8thRule,
          });
        }
      }

      //Check 6 rule 9
      const fetchedContentOf9stRule = await filterComplianceContentDetails(
        6,
        9,
        fetchedAllContents,
      );

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf9stRule,
        });
      } else {
        // const fetchedAllPayments = await this.paymentsRepo
        //   .createQueryBuilder('p')
        //   .select([
        //     'p.current_status AS payment_status',
        //     'p.payment_id AS payment_id'
        //   ])
        //   .leftJoin(
        //     BankAccounts,
        //     'ba',
        //     'p.payment_from_account = ba.bank_account_id',
        //   )
        //   .where(`p.project_id = :project_id`, { project_id })
        //   .andWhere(`ba.account_type = :account_type`, {
        //     account_type: 'Project Trust Account',
        //   })
        //   .getRawMany();
        //   'fetchedPaymentsInPaymentsToSubcontractorsRule1',
        //   fetchedAllPayments,
        // );

        const paymentIds = fetchedBillablePayments.map((p) => p.payment_id);
        let lateSubpayments = [];

        if (paymentIds.length) {
          // Fetch SubPayments of type 'Payment' for these payments
          const subPayments = await this.subPaymentsRepo
            .createQueryBuilder('sp')
            .select([
              'sp.sub_payment_id AS sub_payment_id',
              'sp.payment_id AS payment_id',
              'sp.amount AS amount',
              'sp.created_on AS created_on',
              'sp.is_received_confirmed AS is_received_confirmed',
              'sp.is_paid_confirmed AS is_paid_confirmed',
              'sp.sub_payment_type AS sub_payment_type',
            ])
            .where('sp.payment_id IN (:...paymentIds)', { paymentIds })
            .andWhere('sp.sub_payment_type = :type', { type: 'Payment' })
            .getRawMany();

          const holidayDetails = await this.holidayDetails.find({
            where: { holiday_status: 'Active' },
          });

          for (const sp of subPayments) {
            const isOld = await todayIsGreaterThanOpeningDatePlusBusinessDays({
              startDate: sp.created_on,
              businessDays: 3,
              holidayDetails,
            });

            if (isOld && !sp.is_received_confirmed && !sp.is_paid_confirmed) {
              lateSubpayments.push(sp);
            }
          }

          if (lateSubpayments.length) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              25,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              reference_id: lateSubpayments[0].sub_payment_id,
              ...fetchedContentOf9stRule,
            });
          } else {
            //There is incomplete payments present against a project.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              24,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf9stRule,
            });
          }
        } else {
          //There is incomplete payments present against a project.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            24,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf9stRule,
          });
        }
      }

      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named payments to sub-contractors with message: ${error}`,
      );
    }
  }

  async paymentsToYourselfAsTrustee(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;

      //Check 7 rule 1
      const resultsOfCheck = [];

      // const fetchedContent = await this.complianceChecksRepo.findOne({
      //   where: { check_number: 7, bank_account_type: 'Project Trust Account' },
      //   select: ['check_number', 'check_name', 'rule_number', 'content'],
      // });

      const fetchedContent = await filterComplianceContentDetails(
        7,
        1,
        fetchedAllContents,
      );

      //   'fetcheedContentOfPaymentsToYourselfAsTrustee',
      //   fetchedContent,
      // );
      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          7,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToYourselfAsTrustee',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContent,
        });
      } else {
        //Check for the presence of transactions uploaded against a project trust account.
        const fetchedTransactions = await this.transactionsRepo
          .createQueryBuilder('tr')
          .select([
            'tr.transaction_id AS transaction_id',
            'tr.status AS transaction_status',
            'tr.is_matched AS is_matched',
            'tr.bank_account_id AS bank_account_id',
            'tr.updated_on AS updated_on',
          ])
          .where(`tr.bank_account_id = :bank_account_id`, {
            bank_account_id: projectTrustAccount.bank_account_id,
          })
          .orderBy({ 'tr.updated_on': 'DESC' })
          .getRawMany();

        const totalClaimAmount = await this.paymentClaimsRepo.query(`
          SELECT 
                SUM(claim_amount) AS total_claim_amount
          FROM 
                public.payment_claims
          WHERE 
                project_id = ${project_id}
                AND cash_retention_type  = 'Claim'
                AND status NOT IN ('No Match Required', 
                'Paid - Matched', 
                'Received - Matched', 
                'Deleted', 
                'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
                'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
                'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
                'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
                'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
                'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
                'Paid - Unmatched',
                'Received - Unmatched');
        `);
        const sumOfUnpaidClaims = Number(
          totalClaimAmount[0]?.total_claim_amount,
        );
        const current_balance = projectTrustAccount.current_balance
          ? Number(projectTrustAccount.current_balance)
          : 0;

        if (fetchedTransactions.length) {
          //Check if the transaction was last updated one week ago.
          const lastUpdatedDate = new Date(fetchedTransactions[0].updated_on);
          const today = new Date();
          const diffInMs = today.getTime() - lastUpdatedDate.getTime();
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          //If the CSV transaction was updated more than 1 week ago.
          if (diffInDays > 7) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              2,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(projectTrustAccount.bank_account_id),
              },
              ...fetchedContent,
            });
          } else if (diffInDays < 7 && sumOfUnpaidClaims < current_balance) {
            const surplusAmount = current_balance - sumOfUnpaidClaims;

            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              3,
              fetchedAllRules,
            );

            //update fetchedRuleDetails
            fetchedRuleDetails.display_message = `
                  ${fetchedRuleDetails.display_message}
                  <div style="margin-top: 8px;">
                    <strong>Surplus Amount (withdrawable): ${surplusAmount.toLocaleString(
                      'en-AU',
                      {
                        style: 'currency',
                        currency: 'AUD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}</strong>
                  </div>
                `;

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(projectTrustAccount.bank_account_id),
              },
              ...fetchedContent,
            });
          } else if (diffInDays < 7 && sumOfUnpaidClaims == current_balance) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              4,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule4',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          } else if (diffInDays < 7 && sumOfUnpaidClaims >= current_balance) {
            const shortfallAmount = sumOfUnpaidClaims - current_balance;

            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              5,
              fetchedAllRules,
            );

            fetchedRuleDetails.display_message = `
                  ${fetchedRuleDetails.display_message}
                  <div style="margin-top: 8px;">
                    <strong>Shortfall Amount: ${shortfallAmount.toLocaleString(
                      'en-AU',
                      {
                        style: 'currency',
                        currency: 'AUD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}</strong>
                  </div>
                `;
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule3',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(projectTrustAccount.bank_account_id),
              },
              ...fetchedContent,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              4,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule1',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            7,
            2,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(projectTrustAccount.bank_account_id),
            },
            ...fetchedContent,
          });
        }
      }

      // check 7 Rule 2
      const fetchedContentOf2ndRule = await filterComplianceContentDetails(
        7,
        2,
        fetchedAllContents,
      );

      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          7,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfPaymentsToYourselfAsTrustee',
        //   fetchedRuleDetails,
        // );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf2ndRule,
        });
      } else {
        const fetchedAllPayments = await this.paymentsRepo
          .createQueryBuilder('p')
          .select([
            'p.current_status AS payment_status',
            'p.payment_id AS payment_id',
          ])
          .leftJoin(
            BankAccounts,
            'ba',
            'p.payment_from_account = ba.bank_account_id',
          )
          .where(`p.project_id = :project_id`, { project_id })
          .andWhere(`ba.account_type = :account_type`, {
            account_type: 'Project Trust Account',
          })
          .getRawMany();

        const paymentIds = fetchedAllPayments.map((p) => p.payment_id);
        let lateSubpayments = [];

        if (paymentIds.length) {
          // Fetch SubPayments of type 'Payment' for these payments
          const subPayments = await this.subPaymentsRepo
            .createQueryBuilder('sp')
            .select([
              'sp.sub_payment_id AS sub_payment_id',
              'sp.payment_id AS payment_id',
              'sp.amount AS amount',
              'sp.created_on AS created_on',
              'sp.is_received_confirmed AS is_received_confirmed',
              'sp.is_paid_confirmed AS is_paid_confirmed',
              'sp.sub_payment_type AS sub_payment_type',
            ])
            .where('sp.payment_id IN (:...paymentIds)', { paymentIds })
            .andWhere('sp.sub_payment_type = :type', { type: 'Payment' })
            .getRawMany();

          const holidayDetails = await this.holidayDetails.find({
            where: { holiday_status: 'Active' },
          });

          for (const sp of subPayments) {
            const isOld = await todayIsGreaterThanOpeningDatePlusBusinessDays({
              startDate: sp.created_on,
              businessDays: 3,
              holidayDetails,
            });

            if (isOld && !sp.is_received_confirmed && !sp.is_paid_confirmed) {
              lateSubpayments.push(sp);
            }
          }

          if (lateSubpayments.length) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              6,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              reference_id: lateSubpayments[0].sub_payment_id,
              ...fetchedContentOf2ndRule,
            });
          } else {
            //There is incomplete payments present against a project.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              7,
              fetchedAllRules,
            );
            //   'fetchedRule2---------------->>',
            //   fetchedRuleDetails,
            // );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf2ndRule,
            });
          }
        } else {
          //There is incomplete payments present against a project.
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            7,
            7,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfPaymentsToSubcontractorsRule2',
          //   fetchedRuleDetails,
          // );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf2ndRule,
          });
        }
      }

      //   'resultsOfCheckInPaymentsToYourselfAsTrustee',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async monthlyReconciliationsAndRecordkeeping(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;

      //Check 8 rule 1
      const resultsOfCheck = [];
      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 8,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the monthly reconciliation record.
      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          8,
          1,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf1stRule,
        });
      } else if (projectTrustAccount) {
        //Check whether monthly reconciliation report is added and completed before the month end date or not.
        const fetchedReconcileReportDetails = await this.reconcileReportRepo
          .createQueryBuilder('rr')
          .select([
            'rr.month_end_date AS month_end_date',
            'rr.id AS id',
            'rr.bank_account_id AS bank_account_id',
            'rr.reconcile_status AS reconcile_status',
          ])
          .where('rr.bank_account_id = :bank_account_id', {
            bank_account_id: projectTrustAccount.bank_account_id,
          })
          .orderBy({ 'rr.created_on': 'DESC' })
          .getRawOne();
        //   'fetchedReconcileReportDetails',
        //   fetchedReconcileReportDetails,
        // );
        const today = new Date();
        const firstDayOfCurrentMonth = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );
        const lastMonthEndDate = new Date(firstDayOfCurrentMonth.getTime() - 1); // Previous month's end date
        const lastMonth = lastMonthEndDate.getUTCMonth();
        const lastMonthYear = lastMonthEndDate.getUTCFullYear();

        const holidayDetails = await this.holidayDetails.find({
          where: { holiday_status: 'Active' },
        });

        if (
          !fetchedReconcileReportDetails &&
          (await todayIsGreaterThanOpeningDatePlusBusinessDays({
            startDate: projectTrustAccount.opening_date,
            businessDays: 30,
            holidayDetails,
          }))
        ) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            8,
            3,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: projectTrustAccount.bank_account_id,
            },
            ...fetchedContentOf1stRule,
          });
        } else if (fetchedReconcileReportDetails) {
          if (
            fetchedReconcileReportDetails &&
            new Date(
              fetchedReconcileReportDetails.month_end_date,
            ).getUTCMonth() === lastMonth &&
            new Date(
              fetchedReconcileReportDetails.month_end_date,
            ).getUTCFullYear() === lastMonthYear
          ) {
            if (fetchedReconcileReportDetails.reconcile_status === 'Balanced') {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                8,
                4,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else {
              // Previous month's reconciliation exists but is not balanced
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                8,
                3,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: fetchedReconcileReportDetails.id,
                },
                ...fetchedContentOf1stRule,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              8,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: fetchedReconcileReportDetails.id,
              },
              ...fetchedContentOf1stRule,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            8,
            4,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf1stRule,
          });
        }
      }

      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async annualAccountReviewReports(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;

      //Check 9 rule 1
      const resultsOfCheck = [];
      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 9,
          rule_number: 1,
          bank_account_type: 'Project Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the annual audit report.
      if (!projectTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          9,
          1,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf1stRule,
        });
      } else {
        const { bank_account_id } = projectTrustAccount;

        const contractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.retention_from_account AS retention_from_account',
            'c.retention_type AS retention_type',
            'c.company_id AS company_id',
            'cs.client_supplier_type AS client_supplier_type',
          ])
          .leftJoin(
            ClientSuppliersDetails,
            'cs',
            'cs.client_supplier_id = c.client_supplier_id',
          )
          .where('c.project_id = :project_id', { project_id })
          .andWhere('c.retention_type = :retention_type', {
            retention_type: 'Cash',
          })
          .andWhere('cs.client_supplier_type = :client_supplier_type', {
            client_supplier_type: 'Supplier',
          })
          .getRawMany();

        if (contractDetails && contractDetails.length) {
          const fetchedLatestAuditDetails = await this.auditReportRepo
            .createQueryBuilder('ar')
            .select([
              'ar.audit_id AS audit_id',
              'ar.audit_date AS audit_date',
              'ar.bank_account_id AS bank_account_id',
              'ba.account_name AS bank_account_name',
              'ba.account_type AS bank_account_type',
            ])
            .leftJoin(
              BankAccounts,
              'ba',
              'ba.bank_account_id = ar.bank_account_id',
            )
            .where(`ba.account_type = :account_type`, {
              account_type: 'Retention Trust Account',
            })
            .where(
              ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
              { project_id },
            )
            .orderBy({ 'ar.created_on': 'DESC' })
            .getRawOne();
          if (fetchedLatestAuditDetails) {
            const auditDate = fetchedLatestAuditDetails.audit_date;
            const expectedYearEnd = await this.getLastFYEnd();

            if (auditDate > expectedYearEnd) {
              // RULE 6 - Audit uploaded for current year-end
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                3,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                6,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          } else {
            const expectedYearEnd = await this.getLastFYEnd();
            const hasRetentions = await this.paymentsRepo.findOne({
              where: {
                project_id,
                cash_retention: true,
                payment_from_account: Number(bank_account_id),
                payment_date: Between(
                  new Date(`${expectedYearEnd.getFullYear()}-07-01T00:00:00Z`),
                  new Date(
                    `${expectedYearEnd.getFullYear() + 1}-06-30T23:59:59Z`,
                  ),
                ),
              },
            });
            if (hasRetentions) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                2,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else {
              const expectedYear = expectedYearEnd.getFullYear();
              const ta5Notice = await this.noticeDetailsRepo
                .createQueryBuilder('n')
                .select([
                  'n.id AS id',
                  'n.notice_type AS notice_type',
                  'n.status AS status',
                  'n.created_on AS notice_date',
                ])
                .where('n.bank_account_id = :bank_account_id', {
                  bank_account_id: Number(bank_account_id),
                })
                .andWhere('n.notice_type = :notice_type', {
                  notice_type: 'QBCC TA5 Nil Return Notice',
                })
                .andWhere('EXTRACT(YEAR FROM n.created_on) = :expectedYear', {
                  expectedYear,
                })
                .andWhere('n.status NOT IN (:...excludedStatuses)', {
                  excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
                })
                .orderBy({ 'n.created_on': 'DESC' })
                .getRawOne();

              if (!ta5Notice) {
                // RULE - TA5 required but NOT sent
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  9,
                  4,
                  fetchedAllRules,
                ); // Use rule ID 4 or your system's TA5 rule
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContentOf1stRule,
                });
              } else if (ta5Notice.status !== 'Sent') {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  9,
                  5,
                  fetchedAllRules,
                ); // Use rule ID 4 or your system's TA5 rule
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContentOf1stRule,
                });
              }
            }
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            9,
            1,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(id),
            },
            ...fetchedContentOf1stRule,
          });
        }
      }
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async getLastFYEnd() {
    const today = new Date();

    // If today is after June, then current year's June 30 is the FY end
    // If today is before or on June, then last year's June 30 is the FY end
    const fyYear =
      today.getMonth() + 1 > 6 ? today.getFullYear() : today.getFullYear() - 1;

    return new Date(`${fyYear}-06-30T00:00:00Z`);
  }

  async closeTheAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    projectTrustAccount?: IProjectTrustAccount,
  ) {
    try {
      const { project_id, bank_account_type } = data;
      const fetchedContent = await this.complianceChecksRepo.find({
        where: { check_number: 10, bank_account_type: 'Project Trust Account' },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
        order: { rule_number: 'ASC' },
      });

      return fetchedContent;
    } catch (error) {
      throw error;
    }
  }
}
