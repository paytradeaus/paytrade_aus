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
  RtaCompliances,
} from 'src/entities/compliances.entity';
import {
  IFetchedAllContents,
  IFetchedAllRules,
  IProjectDetails,
  IRetentionTrustAccount,
} from './functions.interfaces';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import {
  filterPendingLatePayments,
  filterPendingNonLatePayments,
  todayIsGreaterThanOpeningDatePlusBusinessDays,
} from './functions';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';
import { AuditReport } from 'src/entities/audit-report.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import {
  fetchComplianceRuleDetails,
  filterComplianceContentDetails,
} from './functions';
import { HolidayDetails } from 'src/entities/holiday-details.entity';

@Injectable()
export class ComplianceRTAFunctions {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(VariationDetails)
    private variationsRepo: Repository<VariationDetails>,
    @InjectRepository(ContractDetails)
    private contractsRepo: Repository<ContractDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(RtaCompliances)
    private rtaCompliancesRepo: Repository<RtaCompliances>,
    @InjectRepository(ComplianceChecks)
    private complianceChecksRepo: Repository<ComplianceChecks>,
    @InjectRepository(NoticeDetails)
    private noticeDetailsRepo: Repository<NoticeDetails>,
    @InjectRepository(ReconciliationReport)
    private reconcileReportRepo: Repository<ReconciliationReport>,
    @InjectRepository(AuditReport)
    private auditReportRepo: Repository<AuditReport>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    @InjectRepository(ComplianceSettings)
    private complianceSettingsRepo: Repository<ComplianceSettings>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersRepo: Repository<ClientSuppliersDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(HolidayDetails)
    private holidayDetails: Repository<HolidayDetails>,
  ) {
    this.logger = new PaytradeLogger('COMPLIANCE_RTA_FUNCTIONS');
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
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      //ALGORITHMS:
      /*
      - Initialize a variable named fetchedProjectDetails and fetch the pta_eligibility, rta_eligibility, retention_type, number_of_units and head_contract_sum 
        from the project_details entity using project_id.
      - Initialize a variable named fetchedContractDetails and fetch the initial_contract_sum of all contracts using 
        project_id.
      - Initialize a variable named fetchedVariationDetails and fetch the variation_amount with the variation_status of Agreed 
        of all contracts using project_id.
        Find the sum of all initial_contract_sum using .reduce and save it inside a variable named sum_of_all_initial_contract_sum.
        Find the sum of all variation_amount using .reduce and save it inside a variable named sum_of_all_variation_amounts.

      - If the rta_eligibility is No, 
        If( head_contract_sum < 10,000,000 && (sum_of_all_contract_initial_sum + sum_of_all_variation_amounts < 10,000,000) && number_of_units < 3 )
         || (pta_eligibility == No) || (retention_type != Cash)) 
        fetch the check_number 1 and rule_number 1 from the compliance entity with action_button_type as NONE and return it.

      - Else if the rta_eligibility is Yes, 
        If( (head_contract_sum >= 10,000,000) || ((sum_of_all_contract_initial_sum + sum_of_all_variation_amounts < 10,000,000) && (number_of_units >= 3 )) 
        || (pta_eligibility == Yes && retention_type == Cash))
        fetch the check_number 1 and rule_number 2 from the compliances entity with action_button_type as ADD_BANK_ACCOUNT and reference_id as project_id ans return it.
      **/
      this.logger.log(
        `Request received for verifying the compliance check named check contract eligibility with data: ${JSON.stringify(data)}`,
      );

      const {
        id,
        project_id,
        pta_eligibility,
        rta_eligibility,
        retention_type,
        number_of_units,
        head_contract_sum,
        bank_account_type,
      } = data;
      const resultsOfCheck = [];

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
      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 1,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      const contractValueDetails = await this.complianceSettingsRepo.find();

      if (rta_eligibility == 'No') {
        if (retentionTrustAccount) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            1,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{ reference_id: String(retentionTrustAccount.bank_account_id) },
            ...fetchedContent,
          });
        } else if (
          (sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
            contractValueDetails[0].contract_value &&
            number_of_units < 3) ||
          pta_eligibility == 'No' ||
          retention_type != 'Cash'
        ) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            1,
            1,
            fetchedAllRules,
          );
          resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            1,
            2,
            fetchedAllRules,
          );
          resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
        }
      } else if (rta_eligibility == 'Yes') {
        if (
          (sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
            contractValueDetails[0].contract_value &&
            number_of_units >= 3) ||
          (pta_eligibility == 'Yes' && retention_type == 'Cash')
        ) {
          if (retentionTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              1,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(retentionTrustAccount.bank_account_id),
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
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            1,
            1,
            fetchedAllRules,
          );
          resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContent });
        }
      } else if (
        Number(head_contract_sum) < contractValueDetails[0].contract_value
      ) {
        if (retentionTrustAccount) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            1,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{ reference_id: String(retentionTrustAccount.bank_account_id) },
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
      }
      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named check contract eligibility with message: ${error}`,
      );
      throw error;
    }
  }

  async openRetentionTrustAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for verifying the compliance check named open retention trust account with data: ${JSON.stringify(data)}`,
      );

      const {
        id,
        project_id,
        pta_eligibility,
        rta_eligibility,
        retention_type,
        number_of_units,
        head_contract_sum,
        bank_account_type,
      } = data;
      const resultsOfCheck = [];
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
      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 2,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      const contractValueDetails = await this.complianceSettingsRepo.find();

      if (Number(head_contract_sum) > contractValueDetails[0].contract_value) {
        if (retentionTrustAccount) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            2,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{ reference_id: String(retentionTrustAccount.bank_account_id) },
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
      } else if (rta_eligibility == 'No') {
        if (retentionTrustAccount) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            2,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{ reference_id: String(retentionTrustAccount.bank_account_id) },
            ...fetchedContent,
          });
        } else if (
          (sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
            contractValueDetails[0].contract_value &&
            number_of_units < 3) ||
          pta_eligibility == 'No' ||
          retention_type != 'Cash'
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
      } else if (rta_eligibility == 'Yes') {
        if (
          (sum_of_all_contract_initial_sum + sum_of_all_variation_amounts <
            contractValueDetails[0].contract_value &&
            number_of_units >= 3) ||
          (pta_eligibility == 'Yes' && retention_type == 'Cash')
        ) {
          if (retentionTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(retentionTrustAccount.bank_account_id),
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
          if (retentionTrustAccount) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              2,
              3,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(retentionTrustAccount.bank_account_id),
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
      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named open retention trust account with message: ${error}`,
      );
      throw error;
    }
  }

  async notifyPartiesOfTheTrustAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, rta_eligibility, bank_account_type } = data;

      const holidayDetails = await this.holidayDetails.find({
        where: { holiday_status: 'Active' },
      });
      const resultsOfCheck = [];

      //Check 3 rule 1

      //Checking the status of the QBCC TA1 Retention Trust Account Notice created against a retention trust account.
      const qbccTa1RetentionTrustAccountNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'QBCC TA1 Retention Trust Account Notice',
          })
          .andWhere('n.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: ['Delete-Sent', 'Delete-Unsent'],
          })
          .getRawOne();
      //   'qbccTa1RetentionTrustAccountNotice',
      //   qbccTa1RetentionTrustAccountNoticeDetails,
      // );

      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
      });

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          1,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf1stRule,
        });
      } else {
        const fetchedContractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.retention_from_account AS retention_from_account',
            'c.retention_type AS retention_type',
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

        if (fetchedContractDetails && fetchedContractDetails.length) {
          if (
            (qbccTa1RetentionTrustAccountNoticeDetails &&
              qbccTa1RetentionTrustAccountNoticeDetails?.status ==
              'Not Sent') ||
            qbccTa1RetentionTrustAccountNoticeDetails?.status == 'Sending'
          ) {
            //Check if today > RTA opening date + 5 business days.
            const isTodayGreaterThanOpeningDatePlus5BusinessDays =
              await todayIsGreaterThanOpeningDatePlusBusinessDays({
                startDate: retentionTrustAccount.opening_date,
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
                  reference_id: qbccTa1RetentionTrustAccountNoticeDetails.id,
                },
                ...fetchedContentOf1stRule,
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
                  reference_id: qbccTa1RetentionTrustAccountNoticeDetails.id,
                },
                ...fetchedContentOf1stRule,
              });
            }
          } else if (
            qbccTa1RetentionTrustAccountNoticeDetails &&
            qbccTa1RetentionTrustAccountNoticeDetails?.status == 'Sent'
          ) {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              3,
              4,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf1stRule,
            });
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              3,
              4,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf1stRule,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            1,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf1stRule,
          });
        }
      }

      //Check 3 rule 2
      //Checking the status of the Supplier S23 Retention Trust Account notice created against a project.
      const unsentSupplierS23TrustAccountNoticeDetails =
        await this.noticeDetailsRepo
          .createQueryBuilder('n')
          .select([
            'n.id AS id',
            'n.notice_type AS notice_type',
            'n.status AS status',
          ])
          .where('n.project_id = :project_id', { project_id })
          .andWhere('n.notice_type = :notice_type', {
            notice_type: 'Supplier S23 Retention Trust Account Notice',
          })
          .andWhere('n.status IN (:...unsentStatuses)', {
            unsentStatuses: ['Not Sent'],
          })
          .getRawMany();
      //   'unsentSupplierS23TrustAccountNoticeDetails',
      //   unsentSupplierS23TrustAccountNoticeDetails,
      // );

      const contractDetails = await this.contractsRepo
        .createQueryBuilder('c')
        .select([
          'c.retention_from_account AS retention_from_account',
          'c.retention_type AS retention_type',
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

      const filteredContractsWithoutRetentionTrustAccount =
        contractDetails.length
          ? await contractDetails.filter(
            (contract) => !contract.retention_from_account,
          )
          : [];
      //   'filteredContractsWithoutRetentionTrustAccount',
      //   filteredContractsWithoutRetentionTrustAccount,
      // );

      const fetchedContentOf2ndRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 2,
          bank_account_type: 'Retention Trust Account',
        },
      });

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          5,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf2ndRule,
        });
      } else {
        if (contractDetails && contractDetails.length) {
          if (
            unsentSupplierS23TrustAccountNoticeDetails &&
            unsentSupplierS23TrustAccountNoticeDetails.length
          ) {
            if (filteredContractsWithoutRetentionTrustAccount.length) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                3,
                6,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id:
                    unsentSupplierS23TrustAccountNoticeDetails[0].id,
                },
                ...fetchedContentOf2ndRule,
              });
            } else {
              if (
                await todayIsGreaterThanOpeningDatePlusBusinessDays({
                  startDate: retentionTrustAccount.opening_date,
                  businessDays: 5,
                  holidayDetails,
                })
              ) {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  3,
                  8,
                  fetchedAllRules,
                );

                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...{
                    reference_id:
                      unsentSupplierS23TrustAccountNoticeDetails[0].id,
                  },
                  ...fetchedContentOf2ndRule,
                });
              } else {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  3,
                  7,
                  fetchedAllRules,
                );

                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...{
                    reference_id:
                      unsentSupplierS23TrustAccountNoticeDetails[0].id,
                  },
                  ...fetchedContentOf2ndRule,
                });
              }
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              3,
              9,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf2ndRule,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            13,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf2ndRule,
          });
        }
      }

      //Check 3 rule 3
      //Checking the status of the QBCC TA3 Notice Of Related Entities created against a project.
      const unsentQbccNoticeOfRelatedEntityDetails =
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
          .andWhere('n.status IN (:...unsentStatuses)', {
            unsentStatuses: ['Not Sent'],
          })
          .getRawOne();
      //   'unsentQbccNoticeOfRelatedEntityDetails',
      //   unsentQbccNoticeOfRelatedEntityDetails,
      // );

      const supplierContractDetails = await this.contractsRepo
        .createQueryBuilder('c')
        .select([
          'c.retention_from_account AS retention_from_account',
          'c.retention_type AS retention_type',
          'c.client_supplier_id AS client_supplier_id',
          'cs.client_supplier_type AS client_supplier_type',
        ])
        .leftJoin(
          ClientSuppliersDetails,
          'cs',
          'cs.client_supplier_id = c.client_supplier_id',
        )
        .where('c.project_id = :project_id', { project_id })
        .andWhere('cs.client_supplier_type = :client_supplier_type', {
          client_supplier_type: 'Supplier',
        })
        .getRawMany();

      const clientSupplierDetails =
        supplierContractDetails && supplierContractDetails.length
          ? await this.clientSuppliersRepo.findOne({
            where: {
              client_supplier_id:
                supplierContractDetails[0].client_supplier_id,
            },
          })
          : null;

      const fetchedContentOf3rdRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 3,
          rule_number: 3,
          bank_account_type: 'Retention Trust Account',
        },
      });

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          3,
          10,
          fetchedAllRules,
        );

        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...fetchedContentOf3rdRule,
        });
      } else {
        if (supplierContractDetails && supplierContractDetails.length) {
          if (clientSupplierDetails.related_entity == 'Yes') {
            if (unsentQbccNoticeOfRelatedEntityDetails) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                3,
                11,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: unsentQbccNoticeOfRelatedEntityDetails.id,
                },
                ...fetchedContentOf3rdRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                3,
                12,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf3rdRule,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              3,
              14,
              fetchedAllRules,
            );

            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf3rdRule,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            3,
            14,
            fetchedAllRules,
          );

          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf3rdRule,
          });
        }
      }

      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async administrationOfTheAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for checking the compliance check named administration of the account with data: ${JSON.stringify(data)}`,
      );

      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];

      //Check 4 rule 1

      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the delegate powers.
      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          4,
          1,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
            ...fetchedContentOf1stRule,
          },
        });
      } else if (retentionTrustAccount) {
        if (retentionTrustAccount.delegate_powers == 'No') {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            2,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(retentionTrustAccount.bank_account_id),
            },
            ...fetchedContentOf1stRule,
          });
        } else if (retentionTrustAccount.delegate_powers == 'Yes') {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            3,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf1stRule,
          });
        }
      }

      //Check 4 rule 2
      const fetchedContentOf2ndRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 2,
          bank_account_type: 'Retention Trust Account',
        },
      });
      resultsOfCheck.push(fetchedContentOf2ndRule);

      // if (!retentionTrustAccount) {
      //   const fetchedRuleDetails = await fetchComplianceRuleDetails(4, 4);
      //   resultsOfCheck.push({
      //     ...fetchedRuleDetails,
      //     ...{
      //       reference_id: String(id),
      //       ...fetchedContentOf1stRule,
      //     },
      //   });
      // } else if (retentionTrustAccount) {
      //   //Fetch the retention trust account opening date + 1 year.
      //   //Fetch the last payment withdrawal paid matched date.
      //   //Fetch all the Interest Received other payments of the specific retention trust account.
      //   //Fetch all the Bank Charge Applied of the specific retention trust account.
      //   //Fetch all the Interest Withdrawal payments of the specific retention trust account.
      //   //Provide the if condition provided in the Compliance check process document.
      // }

      //Check 4 rule 3
      const fetchedContentOf3rdRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 3,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          4,
          20,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf3rdRule,
        });
      } else {
        if (!retentionTrustAccount.retention_trust_certificate_attachment_ids) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            21,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(retentionTrustAccount.bank_account_id),
            },
            ...fetchedContentOf3rdRule,
          });
        } else if (
          retentionTrustAccount.retention_trust_certificate_attachment_ids
        ) {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            4,
            22,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContentOf3rdRule,
          });
        }
      }

      //Check 4 rule 4
      const fetchedContentOf4thrule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 4,
          bank_account_type: 'Retention Trust Account',
        },
        // select: ['rule_number', 'content'],
      });

      resultsOfCheck.push(fetchedContentOf4thrule);

      //Check 4 rule 5
      const fetchedContentOf5thrule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 4,
          rule_number: 5,
          bank_account_type: 'Retention Trust Account',
        },
        // select: ['rule_number', 'content'],
      });

      resultsOfCheck.push(fetchedContentOf5thrule);

      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named administration of the account with message: ${error}`,
      );
      throw error;
    }
  }

  async withholdingRetentionAmountsFromPayment(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];


      //Check 5 rule 1
      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 5,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });
      //   'fetchedContentOfWithholdingRetentionAmountsFromPayment1stRule',
      //   fetchedContentOf1stRule,
      // );

      const contractDetails = await this.contractsRepo
        .createQueryBuilder('c')
        .select([
          'c.retention_from_account AS retention_from_account',
          'c.retention_type AS retention_type',
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

      //Fetch rule details if no retention trust account has been created yet.
      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          5,
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
        if (contractDetails && contractDetails.length) {
          const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
            where: { project_id, cash_retention_type: 'Claim' },
          });

          if (paymentClaimDetails) {
            const paymentWithRetentionDetails = await this.paymentsRepo.findOne(
              { where: { project_id, cash_retention: true } },
            );
            //   'paymentWithRetentionDetails',
            //   paymentWithRetentionDetails,
            // );
            if (paymentWithRetentionDetails) {
              //Fetching the NOT SENT retention schedule notice details of a project.
              const fetchedUnsentRetentionScheduleNoticeDetails =
                await this.noticeDetailsRepo
                  .createQueryBuilder('n')
                  .select([
                    'n.id AS notice_id',
                    'n.notice_type AS notice_type',
                    'n.status AS notice_status',
                  ])
                  .leftJoin(
                    ContractDetails,
                    'c',
                    'c.contract_id = n.contract_id',
                  )
                  .where('n.project_id = :project_id', { project_id })
                  .andWhere('n.notice_type = :notice_type', {
                    notice_type:
                      'Supplier Payment with Retention Schedule Notice',
                  })
                  .andWhere('n.status = :status', { status: 'Not Sent' })
                  .getRawMany();
              //   'fetchedUnsentRetentionScheduleNoticeDetails',
              //   fetchedUnsentRetentionScheduleNoticeDetails,
              // );

              if (
                fetchedUnsentRetentionScheduleNoticeDetails &&
                fetchedUnsentRetentionScheduleNoticeDetails.length
              ) {
                //Fetch rule details if any of the Supplier Payment with Retention Schedule Notice hasn't been sent.
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  5,
                  2,
                  fetchedAllRules,
                );
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...{
                    reference_id: String(
                      fetchedUnsentRetentionScheduleNoticeDetails[0].notice_id,
                    ),
                  },
                  ...fetchedContentOf1stRule,
                });
              } else {
                //Fetch rule details if all the Supplier Payment with Retention Schedule Notice has been sent.
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  5,
                  3,
                  fetchedAllRules,
                );
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContentOf1stRule,
                });
              }
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                9,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              5,
              8,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf1stRule,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            5,
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

      //Check 5 rule 2
      const fetchedContentOf2ndRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 5,
          rule_number: 2,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });
      //   'fetchedContentOfWithholdingRetentionAmountsFromPayment2ndRule',
      //   fetchedContentOf2ndRule,
      // );

      if (!retentionTrustAccount || !contractDetails.length) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          5,
          4,
          fetchedAllRules,
        );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
          },
          ...fetchedContentOf2ndRule,
        });
      } else {
        //Fetch the Retention IN sub payments by joining it with Payment details to fetch the payments belonging to this Project.
        const fetchedSubPayments = await this.subPaymentsRepo
          .createQueryBuilder('sp')
          .select([
            'sp.sub_payment_id AS sub_payment_id',
            'sp.sub_payment_type AS sub_payment_type',
            'sp.status AS sub_payment_status',
            'sp.is_paid_confirmed AS is_paid_confirmed',
            'pd.payment_id AS payment_id',
          ])
          .leftJoin(PaymentDetails, 'pd', 'pd.payment_id = sp.payment_id')
          .leftJoin(ContractDetails, 'c', 'c.contract_id = c.contract_id')
          .where('sp.sub_payment_type = :sub_payment_type', {
            sub_payment_type: 'Retention In',
          })
          .andWhere('pd.cash_retention = :cash_retention', {
            cash_retention: true,
          })
          .andWhere('pd.project_id = :project_id', { project_id })
          .andWhere('c.retention_type = :retention_type', {
            retention_type: 'Cash',
          })
          .getRawMany();

        if (fetchedSubPayments && fetchedSubPayments.length) {
          //Filter out the UNMATCHED retention In Sub payments.
          const filteredUnmatchedRetentionInPayments =
            await fetchedSubPayments.filter(
              (subPayment) => subPayment.sub_payment_status == 'Unmatched',
            );
          //   'filteredUnmatchedRetentionInPayments',
          //   filteredUnmatchedRetentionInPayments,
          // );

          if (
            filteredUnmatchedRetentionInPayments &&
            filteredUnmatchedRetentionInPayments.length
          ) {
            //Fetch rule details if any of the Retention In payments is not matched.
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              5,
              5,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...{
                reference_id: String(retentionTrustAccount.bank_account_id),
              },
              ...fetchedContentOf2ndRule,
            });
          } else {
            //Fetching the retention withheld notice details of a project.
            const fetchedRetentionWithheldNoticeDetails =
              await this.noticeDetailsRepo
                .createQueryBuilder('n')
                .select([
                  'n.id AS notice_id',
                  'n.notice_type AS notice_type',
                  'n.status AS notice_status',
                ])
                .leftJoin(ContractDetails, 'c', 'c.contract_id = n.contract_id')
                .where('n.project_id = :project_id', { project_id })
                .andWhere('n.notice_type = :notice_type', {
                  notice_type:
                    'Supplier Payment with Retention Withheld Notice',
                })
                .andWhere('c.retention_type = :retention_type', {
                  retention_type: 'Cash',
                })
                .andWhere('n.status = :status', { status: 'Not Sent' })
                .getRawMany();
            //   'fetchedRetentionWithdrawalNoticeDetails',
            //   fetchedRetentionWithheldNoticeDetails,
            // );

            if (
              fetchedRetentionWithheldNoticeDetails &&
              fetchedRetentionWithheldNoticeDetails.length
            ) {
              //Fetch rule details if any of the retention withheld notice is NOT SENT.
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                6,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...{
                  reference_id: String(
                    fetchedRetentionWithheldNoticeDetails[0].notice_id,
                  ),
                },
                ...fetchedContentOf2ndRule,
              });
            } else {
              //Fetch rule details if all the retention withheld notice is SENT.
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                7,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf2ndRule,
              });
            }
          }
        } else {
          const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
            where: { project_id, cash_retention_type: 'Claim' },
          });

          if (paymentClaimDetails) {
            const paymentWithRetentionDetails = await this.paymentsRepo.findOne(
              { where: { project_id, cash_retention: true } },
            );
            //   'paymentWithRetentionDetails',
            //   paymentWithRetentionDetails,
            // );

            if (paymentWithRetentionDetails) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                7,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf2ndRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                5,
                9,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf2ndRule,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              5,
              8,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContentOf1stRule,
            });
          }
        }
      }

      //   'resultsOfWithholdingRetentionAmountsFromPayment',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async releasingRetentionAmountsToContractedParties(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];


      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 6,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          6,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
        //   fetchedRuleDetails,
        // );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
            ...fetchedContent,
          },
        });
      } else {
        const supplierContractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.retention_from_account AS retention_from_account',
            'c.retention_type AS retention_type',
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

        if (supplierContractDetails && supplierContractDetails.length) {
          const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
            where: { project_id, cash_retention_type: 'Retention claim' },
          });

          if (paymentClaimDetails) {
            const fetchedRetentionSubPayments = await this.subPaymentsRepo
              .createQueryBuilder('sp')
              .select([
                'sp.sub_payment_id AS sub_payment_id',
                'sp.sub_payment_type AS sub_payment_type',
                'sp.status AS sub_payment_status',
                'sp.is_paid_confirmed AS is_paid_confirmed',
                'sp.updated_on AS updated_on',
                'pd.payment_id AS payment_id',
              ])
              .leftJoin(PaymentDetails, 'pd', 'pd.payment_id = sp.payment_id')
              .leftJoin(ContractDetails, 'c', 'c.contract_id = c.contract_id')
              .where('sp.sub_payment_type IN(:...sub_payment_types)', {
                sub_payment_types: ['Retention', 'Payment'],
              })
              .andWhere('sp.status = :status', { status: 'Matched' })
              .andWhere('pd.project_id = :project_id', { project_id })
              .andWhere('c.retention_type = :retention_type', {
                retention_type: 'Cash',
              })
              .getRawMany();
            //   'fetchedRetentionSubPayments',
            //   fetchedRetentionSubPayments,
            // );

            if (
              fetchedRetentionSubPayments &&
              fetchedRetentionSubPayments.length
            ) {
              const fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails =
                await this.noticeDetailsRepo
                  .createQueryBuilder('n')
                  .select([
                    'n.id AS notice_id',
                    'n.notice_type AS notice_type',
                    'n.status AS notice_status',
                    'n.payment_id AS payment_id',
                    'p.payment_date AS payment_date',
                  ])
                  .leftJoin(PaymentDetails, 'p', 'p.payment_id = n.payment_id')
                  .where('n.project_id = :project_id', { project_id })
                  .andWhere('n.notice_type = :notice_type', {
                    notice_type: 'Supplier Retention Payment Remittance Notice',
                  })
                  .andWhere('n.status = :status', { status: 'Not Sent' })
                  .getRawMany();
              //   'fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails',
              //   fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails,
              // );

              if (
                fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails &&
                fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails.length
              ) {
                //Check for the payment date to check whether TODAY > PAYMENT DATE + 5 days
                const filteredPendingLatePayments =
                  await filterPendingLatePayments(
                    fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails,
                  );
                //   'filteredPendingLatePayments',
                //   filteredPendingLatePayments,
                // );
                //Check for the payment date to check whether TODAY < PAYMENT DATE + 5 days
                const filteredPendingNonLatePayments =
                  await filterPendingNonLatePayments(
                    fetchedUnsentSupplierRetentionPaymentRemittanceNoticeDetails,
                  );
                //   'filteredPendingNonLatePayments',
                //   filteredPendingNonLatePayments,
                // );

                if (
                  filteredPendingLatePayments &&
                  filteredPendingLatePayments.length
                ) {
                  //Fetch rule details if any of the Pending LATE payments are present along with any of the Retention remittance notices are NOT SENT.
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    6,
                    3,
                    fetchedAllRules,
                  );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    ...{
                      reference_id: String(
                        filteredPendingLatePayments[0].notice_id,
                      ),
                      ...fetchedContent,
                    },
                  });
                } else if (
                  filteredPendingNonLatePayments &&
                  filteredPendingNonLatePayments.length
                ) {
                  //Fetch rule details if any of the Retention remittance notices are NOT SENT.
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    6,
                    2,
                    fetchedAllRules,
                  );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    ...{
                      reference_id: String(
                        filteredPendingNonLatePayments[0].notice_id,
                      ),
                      ...fetchedContent,
                    },
                  });
                }
              } else {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  6,
                  4,
                  fetchedAllRules,
                );
                //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties4',
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
                6,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContent,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              6,
              5,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            6,
            1,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
          //   fetchedRuleDetails,
          // );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(id),
              ...fetchedContent,
            },
          });
        }
      }

      //   'resultsOfReleasingRetetionAmountsToContractedParties',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async releasingRetentionAmountsToSomeoneElseFromTheAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;
      const resultsOfCheck = [];

      //Fetch content of 7th check.
      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 7,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });
      //   'fetchedContentOfReleasingRetentionAmountsToSomeoneElseFromTheAccount',
      //   fetchedContent,
      // );

      //Fetch rule details if no retention trust account has been created yet.
      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          7,
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
      } else {
        const supplierContractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.retention_from_account AS retention_from_account',
            'c.retention_type AS retention_type',
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

        if (supplierContractDetails && supplierContractDetails.length) {
          const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
            where: { project_id, cash_retention_type: 'Retention claim' },
          });

          if (paymentClaimDetails) {
            const fetchedRetentionPayments = await this.paymentsRepo
              .createQueryBuilder('pd')
              .select([
                'pd.payment_id AS payment_id',
                'pd.payment_claim_id AS payment_claim_id',
                'pd.current_status AS payment_status',
                'pc.claim_type AS claim_type',
                'pc.cash_retention_type AS cash_retention_type',
              ])
              .leftJoin(
                PaymentClaims,
                'pc',
                'pc.payment_claim_id = pd.payment_claim_id',
              )
              .where('pd.project_id = :project_id', { project_id })
              .andWhere('pc.cash_retention_type = :cash_retention_type', {
                cash_retention_type: 'Retention claim',
              })
              .andWhere('pc.claim_type = :claim_type', {
                claim_type: 'Billable',
              })
              .getRawMany();

            //Filter completed retention payments.
            const filteredInCompleteRetentionPayments =
              await fetchedRetentionPayments.filter((payment) =>
                ['Unconfirmed - Unmatched', 'Paid - Unmatched'].includes(
                  payment.payment_status,
                ),
              );
            //   'filteredInCompleteRetentionPayments',
            //   filteredInCompleteRetentionPayments,
            // );

            if (
              fetchedRetentionPayments &&
              fetchedRetentionPayments.length &&
              !filteredInCompleteRetentionPayments.length
            ) {
              //Fetching the Retention Supplier Payment Schedule Notice details of a project.
              const fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails =
                await this.noticeDetailsRepo
                  .createQueryBuilder('n')
                  .select([
                    'n.id AS notice_id',
                    'n.notice_type AS notice_type',
                    'n.status AS notice_status',
                    'n.payment_id AS payment_id',
                    'p.payment_date AS payment_date',
                  ])
                  .leftJoin(PaymentDetails, 'p', 'p.payment_id = n.payment_id')
                  .leftJoin(
                    ContractDetails,
                    'c',
                    'c.contract_id = n.contract_id',
                  )
                  .where('n.project_id = :project_id', { project_id })
                  .andWhere('n.notice_type = :notice_type', {
                    notice_type: 'Supplier Retention Payment Schedule Notice',
                  })
                  .andWhere('c.retention_type = :retention_type', {
                    retention_type: 'Cash',
                  })
                  .andWhere('n.status = :status', { status: 'Not Sent' })
                  .getRawMany();
              //   'fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails',
              //   fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails,
              // );

              if (
                fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails &&
                fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails.length
              ) {
                //Check for the payment date to check whether TODAY > PAYMENT DATE + 5 days
                const filteredPendingLatePayments =
                  await filterPendingLatePayments(
                    fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails,
                  );
                //   'filteredPendingLatePayments',
                //   filteredPendingLatePayments,
                // );
                //Check for the payment date to check whether TODAY < PAYMENT DATE + 5 days
                const filteredPendingNonLatePayments =
                  await filterPendingNonLatePayments(
                    fetchedUnsentRetentionSupplierPaymentScheduleNoticeDetails,
                  );
                //   'filteredPendingNonLatePayments',
                //   filteredPendingNonLatePayments,
                // );

                if (
                  filteredPendingLatePayments &&
                  filteredPendingLatePayments.length
                ) {
                  //Fetch rule details if any of the Pending LATE payments are present along with any of the Retention remittance notices are NOT SENT.
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    7,
                    3,
                    fetchedAllRules,
                  );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    ...{
                      reference_id: String(
                        filteredPendingLatePayments[0].notice_id,
                      ),
                      ...fetchedContent,
                    },
                  });
                } else if (
                  filteredPendingNonLatePayments &&
                  filteredPendingNonLatePayments.length
                ) {
                  //Fetch rule details if any of the Retention remittance notices are NOT SENT.
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    7,
                    2,
                    fetchedAllRules,
                  );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    ...{
                      reference_id: String(
                        filteredPendingNonLatePayments[0].notice_id,
                      ),
                      ...fetchedContent,
                    },
                  });
                }
              } else {
                //Fetch rule details if all the notices are sent.
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  7,
                  4,
                  fetchedAllRules,
                );
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContent,
                });
              }
            } else {
              //Fetch rule details if any of the retention payments are NOT COMPLETED.
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                7,
                6,
                fetchedAllRules,
              );
              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContent,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              7,
              5,
              fetchedAllRules,
            );
            resultsOfCheck.push({
              ...fetchedRuleDetails,
              ...fetchedContent,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            7,
            4,
            fetchedAllRules,
          );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...fetchedContent,
          });
        }
      }

      //   'resultsOfReleasingRetentionAmountsToSomeoneElseFromTheAccount',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async releasingRetentionAmountsToYourselfAsTrustee(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      this.logger.log(
        `Request received for verifying the compliance check named releasing retention amounts to yourself as trustee with data: ${JSON.stringify(data)}`,
      );

      //ALGORITHMS:
      /*
     - Fetch the retention account by selecting the  using project_id from the Bank accounts entity.
     - If there is no retention trust account fetch the check number 8 and rule number 1 and push 
       it inside results of check with reference_id as payment_id.
     - If there is retention trust account, Declare a variable named fetchedAllPaylessPayments and 
       fetch all the payments with the payment_type of Pay Less - Part and Pay Less - Full from the payments 
       entity using project_id and select current_status, payment_id, payment_type and payment_date. 
       This can be done by joining the payment claim entity where cash_retention_type is Retention Claim. 
       Also, join the contracts entity and select defect_liability_end_date
     - If the fetchedAllPaylessPayments is empty, fetch the check number 8 and rule number 2 and push 
       it inside results of check with reference_id as null
     - Else loop through the fetchedAllPaylessPayments and check the current status of the payment.
     - If the status is not equal to 'Unconfirmed - Matched' or 'Paid - Matched', check whether today 
       is less than Defect liability date, if yes,
       fetch the check number 8 and rule number 3 from the entity and return it with reference_id as 
       Else if today is greater than or equal to defect liability end date, fetch the check number 8 
       and rule number 4 from the entity and return it with reference_id as 
     **/
      const { id, project_id, bank_account_type } = data;

      //Check 8 rule 1
      const resultsOfCheck = [];

      const fetchedContent = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 8,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });
      //   'fetchedContentOfReleasingRetentionAmountsToYourselfAsTrustee',
      //   fetchedContent,
      // );

      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          8,
          1,
          fetchedAllRules,
        );
        //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
        //   fetchedRuleDetails,
        // );
        resultsOfCheck.push({
          ...fetchedRuleDetails,
          ...{
            reference_id: String(id),
            ...fetchedContent,
          },
        });
      } else {
        const supplierContractDetails = await this.contractsRepo
          .createQueryBuilder('c')
          .select([
            'c.retention_from_account AS retention_from_account',
            'c.retention_type AS retention_type',
            'c.client_supplier_id AS client_supplier_id',
            'c.defect_liability_end_date AS defect_liability_end_date',
            'cs.client_supplier_type AS client_supplier_type',
          ])
          .leftJoin(
            ClientSuppliersDetails,
            'cs',
            'cs.client_supplier_id = c.client_supplier_id',
          )
          .where('c.project_id = :project_id', { project_id })
          .andWhere('cs.client_supplier_type = :client_supplier_type', {
            client_supplier_type: 'Supplier',
          })
          .orderBy({ 'c.created_on': 'DESC' })
          .getRawMany();

        if (supplierContractDetails && supplierContractDetails.length) {
          const paymentClaimDetails = await this.paymentClaimsRepo.findOne({
            where: { project_id, cash_retention_type: 'Retention claim' },
          });

          if (paymentClaimDetails) {
            const paymentWithRetentionDetails = await this.paymentsRepo.findOne(
              { where: { project_id, cash_retention: true } },
            );
            //   'paymentWithRetentionDetails',
            //   paymentWithRetentionDetails,
            // );
            if (paymentWithRetentionDetails) {
              if (
                new Date() <
                new Date(supplierContractDetails[0].defect_liability_end_date)
              ) {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(
                  8,
                  3,
                  fetchedAllRules,
                );
                //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
                //   fetchedRuleDetails,
                // );
                resultsOfCheck.push({
                  ...fetchedRuleDetails,
                  ...fetchedContent,
                });
              } else if (
                new Date() >=
                new Date(supplierContractDetails[0].defect_liability_end_date)
              ) {
                const fetchedUnmatchedRetentionSubPayments =
                  await this.subPaymentsRepo
                    .createQueryBuilder('sp')
                    .select([
                      'sp.sub_payment_id AS sub_payment_id',
                      'sp.sub_payment_type AS sub_payment_type',
                      'sp.status AS sub_payment_status',
                      'sp.is_paid_confirmed AS is_paid_confirmed',
                      'pd.payment_id AS payment_id',
                    ])
                    .leftJoin(
                      PaymentDetails,
                      'pd',
                      'pd.payment_id = sp.payment_id',
                    )
                    .leftJoin(
                      ContractDetails,
                      'c',
                      'c.contract_id = c.contract_id',
                    )
                    .where('sp.sub_payment_type = :sub_payment_type', {
                      sub_payment_type: 'Retention',
                    })
                    .andWhere('pd.project_id = :project_id', { project_id })
                    .andWhere('c.retention_type = :retention_type', {
                      retention_type: 'Cash',
                    })
                    .andWhere('sp.status = :status', { status: 'Unmatched' })
                    .getRawMany();
                //   'fetchedUnmatchedRetentionSubPayments',
                //   fetchedUnmatchedRetentionSubPayments,
                // );

                if (
                  fetchedUnmatchedRetentionSubPayments &&
                  fetchedUnmatchedRetentionSubPayments.length
                ) {
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    8,
                    4,
                    fetchedAllRules,
                  );
                  //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties1',
                  //   fetchedRuleDetails,
                  // );
                  resultsOfCheck.push({
                    ...fetchedRuleDetails,
                    ...fetchedContent,
                  });
                } else {
                  const fetchedRuleDetails = await fetchComplianceRuleDetails(
                    8,
                    5,
                    fetchedAllRules,
                  );
                  //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties2',
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
                8,
                7,
                fetchedAllRules,
              );
              //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
              //   fetchedRuleDetails,
              // );
              resultsOfCheck.push({
                ...fetchedRuleDetails,

                ...fetchedContent,
              });
            }
          } else {
            const fetchedRuleDetails = await fetchComplianceRuleDetails(
              8,
              6,
              fetchedAllRules,
            );
            //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
            //   fetchedRuleDetails,
            // );
            resultsOfCheck.push({
              ...fetchedRuleDetails,

              ...fetchedContent,
            });
          }
        } else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            8,
            1,
            fetchedAllRules,
          );
          //   'fetchedRuleDetailsOfReleasingRetentionAmountsToContractedParties',
          //   fetchedRuleDetails,
          // );
          resultsOfCheck.push({
            ...fetchedRuleDetails,
            ...{
              reference_id: String(id),
              ...fetchedContent,
            },
          });
        }
      }
      //   'resultsOfReleasingRetentionAmountsToYouselfAsTrustee',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      this.logger.error(
        `Errored while verifying the compliance check named releasing retention amounts to yourself as trustee with message: ${error}`,
      );
      throw error;
    }
  }

  async monthlyReconciliationsAndRecordkeeping(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;

      const holidayDetails = await this.holidayDetails.find({
        where: { holiday_status: 'Active' },
      });

      //Check 9 rule 1
      const resultsOfCheck = [];

      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 9,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the monthly reconciliation record.
      if (!retentionTrustAccount) {
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
      } else if (retentionTrustAccount) {
        if (
          (await todayIsGreaterThanOpeningDatePlusBusinessDays({
            startDate: retentionTrustAccount.opening_date,
            businessDays: 30,
            holidayDetails,
          })) == false
        ) {
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
              bank_account_id: retentionTrustAccount.bank_account_id,
            })
            .orderBy({ 'rr.created_on': 'DESC' })
            .getRawOne();
          //   'fetchedReconcileReportDetails',
          //   fetchedReconcileReportDetails,
          // );
          const today = new Date();
          if (fetchedReconcileReportDetails) {
            if (
              today > fetchedReconcileReportDetails.month_end_date &&
              fetchedReconcileReportDetails.reconcile_status != 'Balanced' &&
              (await todayIsGreaterThanOpeningDatePlusBusinessDays({
                startDate: retentionTrustAccount.opening_date,
                businessDays: 30,
                holidayDetails,
              }))
            ) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                3,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else if (
              today > fetchedReconcileReportDetails.month_end_date &&
              fetchedReconcileReportDetails.reconcile_status != 'Balanced'
            ) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                4,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else if (
              (await todayIsGreaterThanOpeningDatePlusBusinessDays({
                startDate: fetchedReconcileReportDetails.month_end_date,
                businessDays: 15,
                holidayDetails,
              })) == false &&
              fetchedReconcileReportDetails.reconcile_status == 'Balanced'
            ) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                5,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            } else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                3,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          } else {
            {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                9,
                3,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          }
        }
      }

      //   'resultsOfMonthlyReconciliationsAndRecordKeeping',
      //   resultsOfCheck,
      // );
      return resultsOfCheck;
    } catch (error) {
      throw error;
    }
  }

  async annualAccountReviewReports(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { id, project_id, bank_account_type } = data;

      //Check 10 rule 1
      let resultsOfCheck = [];

      const fetchedContentOf1stRule = await this.complianceChecksRepo.findOne({
        where: {
          check_number: 10,
          rule_number: 1,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['rule_number', 'content'],
      });

      //Returning the results of the rule based upon the monthly reconciliation record.
      if (!retentionTrustAccount) {
        const fetchedRuleDetails = await fetchComplianceRuleDetails(
          10,
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

        const { bank_account_id } = retentionTrustAccount;

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
            .where(`ar.company_id = :company_id`, {
              company_id: contractDetails[0].company_id,
            })
            .andWhere(`ba.account_type = :account_type`, {
              account_type: 'Retention Trust Account',
            })
            .orderBy({ 'ar.created_on': 'DESC' })
            .getRawOne();

          if (fetchedLatestAuditDetails) {
            const auditDate = fetchedLatestAuditDetails.audit_date;
            const expectedYearEnd = await this.getLastFYEnd();

            if (auditDate > expectedYearEnd) {
              // RULE 6 – Audit uploaded for current year-end
              const fetchedRuleDetails = await fetchComplianceRuleDetails(10, 3, fetchedAllRules);
              resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContentOf1stRule });
            }
            else {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                10,
                6,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
          }
          else {
            const expectedYearEnd = await this.getLastFYEnd();
            const hasRetentions = await this.paymentsRepo.findOne(
              {
                where:
                {
                  project_id,
                  cash_retention: true,
                  retention_account: Number(bank_account_id),
                  payment_date: Between(
                    new Date(`${expectedYearEnd.getFullYear()}-07-01T00:00:00Z`),
                    new Date(`${expectedYearEnd.getFullYear() + 1}-06-30T23:59:59Z`)
                  ),
                }
              });
            if (hasRetentions) {
              const fetchedRuleDetails = await fetchComplianceRuleDetails(
                10,
                2,
                fetchedAllRules,
              );

              resultsOfCheck.push({
                ...fetchedRuleDetails,
                ...fetchedContentOf1stRule,
              });
            }
            else {
              const expectedYear = expectedYearEnd.getFullYear();
              const ta5Notice =
                await this.noticeDetailsRepo
                  .createQueryBuilder('n')
                  .select([
                    'n.id AS id',
                    'n.notice_type AS notice_type',
                    'n.status AS status',
                    'n.created_on AS notice_date'
                  ])
                  .where('n.bank_account_id = :bank_account_id', { bank_account_id: Number(bank_account_id) })
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
                // RULE – TA5 required but NOT sent
                const fetchedRuleDetails = await fetchComplianceRuleDetails(10, 4, fetchedAllRules); // Use rule ID 4 or your system’s TA5 rule
                resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContentOf1stRule });
              }
              else if (ta5Notice.status !== 'Sent') {
                const fetchedRuleDetails = await fetchComplianceRuleDetails(10, 5, fetchedAllRules); // Use rule ID 4 or your system’s TA5 rule
                resultsOfCheck.push({ ...fetchedRuleDetails, ...fetchedContentOf1stRule });
              }
            }
          }
        }
        else {
          const fetchedRuleDetails = await fetchComplianceRuleDetails(
            10,
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
    const fyYear = today.getMonth() + 1 > 6 ? today.getFullYear() : today.getFullYear() - 1;

    return new Date(`${fyYear}-06-30T00:00:00Z`);
  }

  async closeTheAccount(
    data: IProjectDetails,
    fetchedAllContents: IFetchedAllContents[],
    fetchedAllRules: IFetchedAllRules[],
    retentionTrustAccount?: IRetentionTrustAccount,
  ) {
    try {
      const { project_id, bank_account_type } = data;
      const fetchedContent = await this.complianceChecksRepo.find({
        where: {
          check_number: 11,
          bank_account_type: 'Retention Trust Account',
        },
        select: ['check_number', 'check_name', 'rule_number', 'content'],
      });

      return fetchedContent;
    } catch (error) {
      throw error;
    }
  }
}
