import { Injectable } from '@nestjs/common';
import { CreateContractDetailInput } from './dto/create-contract-detail.input';
import { UpdateContractDetailInput } from './dto/update-contract-detail.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Not, Repository, EntityManager } from 'typeorm';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import {
  GetContractListForProjectsInput,
  GetContractListsInput,
} from './dto/get-contract-lists.input';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractType } from 'src/entities/contract-type.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import {
  formatCurrency,
  formatCurrencyWithoutDollars,
} from 'src/libs/@currency-formattor/currency-formattor';
import { CompliancesService } from '../compliances/compliances.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { NoticesService } from '../notices/notices.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class ContractDetailsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(VariationDetails)
    private variationDetails: Repository<VariationDetails>,
    @InjectRepository(ContractType)
    private contractType: Repository<ContractType>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersRepo: Repository<ClientSuppliersDetails>,
    private entityManager: EntityManager,
    private readonly complianceService: CompliancesService,
    private readonly activityLogService: ActivityLogService,
    private readonly noticeService: NoticesService,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('CONTRACT_DETAILS_SERVICE');
  }
  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getContractType(createContractDetailInput) {
    return await this.contractType.findOne({
      where: {
        project_role: createContractDetailInput.project_role,
        client_supplier_type: createContractDetailInput.client_supplier_type,
        related_entity: createContractDetailInput.related_entity,
        client_supplier_role: createContractDetailInput.client_supplier_role,
      },
    });
  }

  async insertContractDetails(
    decoded,
    createContractDetailInput: CreateContractDetailInput,
  ) {
    try {
      this.logger.log(`Add new contract service initiated`);
      const contractTypeDetails = await this.getContractType(
        createContractDetailInput,
      );
      this.logger.log(
        `Response recieved while getting the contract type from the database: ${JSON.stringify(contractTypeDetails)}`,
      );
      if (
        !contractTypeDetails ||
        contractTypeDetails.contract_type === 'Error'
      ) {
        throw (
          contractTypeDetails?.validation ??
          `Pay Trade doesn't allow ${createContractDetailInput.project_role}/${createContractDetailInput.client_supplier_role} contract types`
        );
      }
      if (
        createContractDetailInput?.company_id &&
        createContractDetailInput?.client_supplier_type &&
        createContractDetailInput?.contract_name
      ) {
        const checkContractName = await this.checkExistenceForContract(
          createContractDetailInput.company_id,
          createContractDetailInput?.client_supplier_type,
          createContractDetailInput.contract_name,
        );
        if (
          checkContractName &&
          checkContractName?.length > 0 &&
          checkContractName[0] !== null
        ) {
          throw `Contract name already exists`;
        }
      }

      createContractDetailInput.contract_type =
        contractTypeDetails.contract_type;
      createContractDetailInput.contract_billing_type =
        createContractDetailInput.contract_billing_type === 'Hourly'
          ? 'Hourly'
          : 'Fixed';
      createContractDetailInput.contract_name =
        await startCasePreserveUnicode(
          createContractDetailInput.contract_name,
        );
      createContractDetailInput.created_on = moment.tz('UTC');
      createContractDetailInput.created_by = decoded?.userId;
      createContractDetailInput.created_group = 'USER';

      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Create entity
          const createContract =
            this.contractDetails.create(createContractDetailInput);

          // Save contract
          const saved = await transactionalEntityManager.save(createContract);

          // Update contract_id format (100000 + id)
          const updatedContractId =
            100000 + Number(saved.contract_id);

          await transactionalEntityManager
            .createQueryBuilder()
            .update(ContractDetails)
            .set({ contract_id: updatedContractId })
            .where(`id = :id`, { id: saved.id })
            .execute();

          let noticeResult = null
          if (createContractDetailInput.client_supplier_type === 'Supplier') {
            try {
              noticeResult = await this.noticeService.handleTriggerContractNotices(
                decoded,
                {
                  contract_id: updatedContractId,
                  view_preview: true,
                },
                transactionalEntityManager,
              );
            } catch (err) {
              this.logger.log(
                `Error triggering contract notices for the contract: ${JSON.stringify(noticeResult)}`,
              );
              this.logger.error(`Error triggering contract notices: ${err}`);
              throw new Error('Notice generation failed');
            }
          }
          // Return updated details
          return {
            ...saved,
            contract_id: updatedContractId,
            notices: noticeResult?.data,
          };
        },
      );


      // const createContract = await this.contractDetails.create(
      //   createContractDetailInput,
      // );
      // const contractDetails = await this.contractDetails.save(createContract);
      // if (contractDetails) {
      //   contractDetails.contract_id =
      //     100000 + Number(contractDetails.contract_id);

      if (!response) {
        this.logger.log(`Contract addition failed`);
        throw `Unable to add Contract details`;
      }

      if (response.notices?.mails_to_sent.length) {
        for (let i = 0; i < response.notices?.mails_to_sent.length; i++) {
          const mailDetails = response.notices?.mails_to_sent[i];
          const updatePayload = response.notices?.update_notice_inputs[i];

          // 1. SEND THE MAIL
          await this.emailQueueProducer.emailQueueProducer({
            ...mailDetails,
            mail_type: EmailTypeEnum.notice,
          });

          // 2. UPDATE THE NOTICE
          await this.noticeService.handleUpdateNotice(decoded, updatePayload);
        }
      }

      if (response.project_id) {
        this.logger.log(
          `Compliance recalculation started with the addition of contract: ${JSON.stringify(response)}`,
        );
        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: response.project_id,
          bank_account_type: 'Project Trust Account',
          failedFilter: false,
        });
        await this.complianceService.fetchComplianceResultsOfAProject({
          project_id: response.project_id,
          bank_account_type: 'Retention Trust Account',
          failedFilter: false,
        });
        this.logger.log(`Compliance recalculation success`);
      }

      //Generating link to view created contract.
      const contractLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[6]}` +
        response.id +
        `?from=log`;
      this.logger.log(`contractLink: ${contractLink}`);

      const clientSupplierDetails = await this.clientSuppliersRepo.findOne({
        where: {
          client_supplier_id: response.client_supplier_id,
        },
      });
      this.logger.log(`clientSupplierDetails: ${JSON.stringify(clientSupplierDetails)}`);

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 57,
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
        company_id: createContractDetailInput.company_id,
        dynamic_values: {
          contractName: await startCasePreserveUnicode(
            createContractDetailInput.contract_name,
          ),
          contractLink,
          clientSupplierType: clientSupplierDetails.client_supplier_type,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(
        createActivityLogInput,
      );

      return {
        ...response,
        // notices: notices?.data,
      };

    } catch (error) {
      error = error?.message ? error?.message : error;
      this.logger.log(`Error in contract addition: ${JSON.stringify(error)}`);
      throw new Error(error);
    }
  }


  async getCompanyDetailsById(company_id) {
    return await this.companyDetails.findOne({ where: { company_id } });
  }

  async getContractListsForCompany(
    getContractListsInput: GetContractListsInput,
  ) {
    const company_id = getContractListsInput.company_id;
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    this.logger.log(
      `Contract list query called with payload: ${JSON.stringify(getContractListsInput)}`,
    );

    const subQuery = await this.variationDetails
      .createQueryBuilder('v')
      .select('v.contract_id', 'contract_id')
      .addSelect('SUM(v.variation_amount)::numeric', 'variation_amount')
      .where("v.variation_status = 'Agreed'")
      .andWhere(`v.company_id = :companyId`, {
        companyId: company_id,
      })
      .groupBy('v.contract_id');
    // .having('SUM(v.variation_amount) > 0');

    const queryBuilder = await this.contractDetails
      .createQueryBuilder('contract')
      .select('contract.id', 'id')
      .addSelect('contract.contract_id', 'contract_id')
      .addSelect('contract.company_id', 'company_id')
      .addSelect('company.company_name', 'company_name')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('contract.contract_type', 'contract_type')
      .addSelect('contract.contract_billing_type', 'contract_billing_type')
      .addSelect('contract.client_supplier_role', 'client_supplier_role')
      .addSelect('contract.contract_date', 'contract_date')
      .addSelect('contract.contract_status', 'contract_status')
      .addSelect('contract.previous_status', 'previous_status')
      .addSelect('contract.project_id', 'project_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('project.project_status', 'project_status')
      .addSelect('contract.client_supplier_id', 'client_supplier_id')
      .addSelect('clientSupplier.client_supplier_name', 'client_supplier_name')
      .addSelect('clientSupplier.client_supplier_type', 'client_supplier_type')
      .addSelect('contract.retention_type', 'retention_type')
      .addSelect('contract.payment_terms', 'payment_terms')
      .addSelect('contract.initial_contract_sum', 'initial_contract_sum')
      .addSelect('contract.attachment_id', 'attachment_id')
      .addSelect('contract.contract_start_date', 'contract_start_date')
      .addSelect(
        'contract.defect_liability_end_date',
        'defect_liability_end_date',
      )
      .addSelect(
        "CASE WHEN clientSupplier.client_supplier_type = 'Client' THEN clientSupplier.client_supplier_name ELSE company.company_name END",
        'buyer_name',
      )
      .addSelect('contract.payment_from_account', 'payment_from_account')
      .addSelect('contract.retention_from_account', 'retention_from_account')
      .addSelect('contract.payment_to_account', 'payment_to_account')
      .addSelect('contract.notice_generated', 'notice_generated')
      .addSelect(
        "CASE WHEN clientSupplier.client_supplier_type = 'Supplier' THEN clientSupplier.client_supplier_name ELSE company.company_name END",
        'seller_name',
      )
      .addSelect('variation.variation_amount', 'variation_amount')
      .innerJoin('contract.companyDetails', 'company')
      .leftJoin('contract.projectDetails', 'project')
      .leftJoin('contract.clientSuppliersDetails', 'clientSupplier')
      .leftJoin(
        '(' + subQuery.getQuery() + ')',
        'variation',
        'contract.contract_id = variation.contract_id',
      );
    queryBuilder.where(`contract.company_id = :companyId`, {
      companyId: company_id,
    });
    if (getContractListsInput.contract_status) {
      if (getContractListsInput.contract_status === 'Archived') {
        queryBuilder.andWhere(
          'contract.contract_status IN(:...excludedStatus)',
          { excludedStatus: excludedStatus },
        );
      } else {
        queryBuilder.andWhere('contract.contract_status = :contract_status', {
          contract_status: getContractListsInput.contract_status,
        });
      }
    } else {
      queryBuilder.andWhere(
        'contract.contract_status NOT IN(:...excludedStatus)',
        { excludedStatus: excludedStatus },
      );
    }

    if (getContractListsInput.project_id) {
      queryBuilder.andWhere('contract.project_id = :project_id', {
        project_id: getContractListsInput.project_id,
      });
    }

    if (getContractListsInput.client_supplier_type) {
      queryBuilder.andWhere(
        'clientSupplier.client_supplier_type = :client_supplier_type',
        {
          client_supplier_type: getContractListsInput.client_supplier_type,
        },
      );
    }

    if (getContractListsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(contract.contract_name) LIKE LOWER(:keyword) OR CAST(contract.contract_id AS TEXT) LIKE :keyword 
          OR LOWER(project.project_name) LIKE LOWER(:keyword)
          )`,
        { keyword: `%${getContractListsInput.search.toLowerCase()}%` },
      );
    }

    if (getContractListsInput.date_filter) {
      if (
        getContractListsInput.date_filter === 'Custom' &&
        getContractListsInput.start_date &&
        getContractListsInput.end_date
      ) {
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: getContractListsInput.start_date,
            end_date: getContractListsInput.end_date,
          },
        );
      } else if (getContractListsInput.date_filter === 'This Month') {
        const startDate = moment().startOf('month').toDate();
        const endDate = moment().endOf('month').toDate();
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      } else if (getContractListsInput.date_filter === 'Last Month') {
        const startDate = moment()
          .subtract(1, 'month')
          .startOf('month')
          .toDate();
        const endDate = moment().subtract(1, 'month').endOf('month').toDate();
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }
    }

    const sorting_order = getContractListsInput.sorting_order
      ? getContractListsInput.sorting_order
      : 'DESC';
    if (
      !getContractListsInput.sorting_field &&
      !getContractListsInput.isAlphabeticalOrder
    ) {
      queryBuilder.orderBy({ 'contract.contract_date': sorting_order });
      if (
        getContractListsInput.page_number &&
        getContractListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getContractListsInput.page_number - 1) *
            getContractListsInput.page_size,
          )
          .limit(getContractListsInput.page_size);
      }
    }
    if (
      getContractListsInput.sorting_field &&
      getContractListsInput.sorting_field !== 'buyer_name' &&
      getContractListsInput.sorting_field !== 'seller_name' &&
      getContractListsInput.sorting_field !== 'variation_amount' &&
      !getContractListsInput.isAlphabeticalOrder
    ) {
      switch (getContractListsInput.sorting_field) {
        case 'contract_date':
          {
            queryBuilder.orderBy({ 'contract.contract_date': sorting_order });
          }
          break;
        case 'contract_name':
          {
            queryBuilder.orderBy({
              'LOWER(contract.contract_name)': sorting_order,
            });
          }
          break;
        case 'initial_contract_sum':
          {
            queryBuilder.orderBy({
              'contract.initial_contract_sum': sorting_order,
            });
          }
          break;
        case 'project_name':
          {
            queryBuilder.orderBy({
              'LOWER(project.project_name)': sorting_order,
            });
          }
          break;
      }
      if (
        getContractListsInput.page_number &&
        getContractListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getContractListsInput.page_number - 1) *
            getContractListsInput.page_size,
          )
          .limit(getContractListsInput.page_size);
      }
    }

    //Set the ordering based on the isAlphabeticalOrder flag.
    if (getContractListsInput.isAlphabeticalOrder) {
      queryBuilder.orderBy('LOWER(contract.contract_name)', 'ASC');
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;
    if (
      getContractListsInput.sorting_field &&
      getContractListsInput.sorting_field === 'buyer_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.buyer_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.buyer_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.buyer_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.buyer_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? (getContractListsInput.page_number - 1) *
          getContractListsInput.page_size
          : 0;
      const endIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? Math.min(
            (getContractListsInput.page_number - 1) *
            getContractListsInput.page_size +
            getContractListsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getContractListsInput.sorting_field &&
      getContractListsInput.sorting_field === 'seller_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.seller_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.seller_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.seller_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.seller_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? (getContractListsInput.page_number - 1) *
          getContractListsInput.page_size
          : 0;
      const endIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? Math.min(
            (getContractListsInput.page_number - 1) *
            getContractListsInput.page_size +
            getContractListsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getContractListsInput.sorting_field &&
      getContractListsInput.sorting_field === 'variation_amount'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.variation_amount - b.variation_amount,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.variation_amount - a.variation_amount,
        );
      }

      const startIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? (getContractListsInput.page_number - 1) *
          getContractListsInput.page_size
          : 0;
      const endIndex =
        getContractListsInput.page_number && getContractListsInput.page_size
          ? Math.min(
            (getContractListsInput.page_number - 1) *
            getContractListsInput.page_size +
            getContractListsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else {
      finalResult = rawResults;
      finalCount = totalCount;
    }

    for (const element of finalResult) {
      element.formatted_initial_contract_sum = formatCurrency(
        element.initial_contract_sum,
      );
      element.formatted_variation_amount = formatCurrency(
        element.variation_amount,
      );
    }

    const qryBuilder = await this.contractDetails
      .createQueryBuilder('contract')
      .select('contract.project_id', 'project_id')
      .addSelect('project.project_name', 'project_name')
      .distinct(true)
      .innerJoin('contract.projectDetails', 'project')
      .where(`contract.company_id = :companyId`, { companyId: company_id });

    if (
      getContractListsInput.contract_status &&
      getContractListsInput.contract_status === 'Archived'
    ) {
      qryBuilder.andWhere('contract.contract_status IN(:...excludedStatus)', {
        excludedStatus: excludedStatus,
      });
    } else {
      qryBuilder.andWhere(
        'contract.contract_status NOT IN(:...excludedStatus)',
        { excludedStatus: excludedStatus },
      );
    }
    const projectList = await qryBuilder.getRawMany();

    return {
      total_count: finalCount,
      contract_list: finalResult,
      project_list: projectList,
    };
  }

  async viewContractDetailsById(id: string) {
    const whereConditions: any = { id };

    const result = await this.contractDetails.findOne({
      where: whereConditions,
      relations: [
        'companyDetails',
        'projectDetails',
        'clientSuppliersDetails',
        'variationDetails',
        'fileAttachments',
        'contractPaymentFromAccount',
        'contractPaymentToAccount',
        'contractRetentionFromAccount',
      ],
    });

    if (!result) throw `Contract details not found`;

    result.contract_date = result.contract_date
      ? new Date(result.contract_date)
      : new Date(0);
    result.created_on = result.created_on
      ? new Date(result.created_on)
      : new Date(0);

    result.contract_start_date = result.contract_start_date
      ? new Date(result.contract_start_date)
      : new Date(0);

    result.defect_liability_end_date = result.defect_liability_end_date
      ? new Date(result.defect_liability_end_date)
      : new Date(0);

    const sumOfVariationAmounts = result.variationDetails.reduce(
      (sum, variation) => {
        if (variation.variation_status === 'Agreed') {
          return sum + variation.variation_amount;
        }
        return sum;
      },
      0,
    );
    const buyerName =
      result?.clientSuppliersDetails?.client_supplier_type === 'Client'
        ? result?.clientSuppliersDetails?.client_supplier_name
        : result?.companyDetails?.company_name;
    const sellerName =
      result?.clientSuppliersDetails?.client_supplier_type === 'Supplier'
        ? result?.clientSuppliersDetails?.client_supplier_name
        : result?.companyDetails?.company_name;
    const client_supplier_address =
      result?.clientSuppliersDetails?.client_supplier_address;

    const contractDetails = await this.getContractsDetailsById(id);
    var claimCount = 0,
      payment = 0,
      active_payment_claims = false;
    if (
      contractDetails.paymentClaims &&
      contractDetails.paymentClaims.length > 0
    ) {
      contractDetails?.paymentClaims.forEach((element) => {
        if (
          element.status === 'Paid - Matched' ||
          element.status === 'Received - Matched' ||
          element.status === 'No Match Required'
        ) {
          claimCount += 1;
        }
      });
    }
    if (
      contractDetails.paymentDetails &&
      contractDetails.paymentDetails.length > 0
    ) {
      contractDetails?.paymentDetails.forEach((element) => {
        if (
          element.current_status === 'Paid - Matched' ||
          element.current_status === 'Received - Matched' ||
          element.current_status === 'No Match Required'
        ) {
          payment += 1;
        }
      });
    }
    if (
      (contractDetails.paymentClaims &&
        contractDetails.paymentClaims.length !== claimCount) ||
      (contractDetails.paymentDetails &&
        contractDetails.paymentDetails.length !== payment)
    ) {
      active_payment_claims = true;
    }
    return {
      id: result.id,
      contract_id: result.contract_id,
      company_id: result.company_id,
      company_name: result?.companyDetails?.company_name,
      contract_name: result.contract_name,
      contract_type: result.contract_type,
      contract_billing_type: result.contract_billing_type,
      client_supplier_role: result.client_supplier_role,
      contract_date: result.contract_date,
      contract_status: result.contract_status,
      previous_status: result.previous_status,
      notice_generated: result.notice_generated,
      project_id: result.project_id,
      project_name: result?.projectDetails?.project_name,
      project_role: result?.projectDetails?.project_role,
      related_entity: result?.clientSuppliersDetails?.related_entity,
      site_address: result?.projectDetails?.site_address,
      client_supplier_id: result.client_supplier_id,
      client_supplier_name:
        result?.clientSuppliersDetails?.client_supplier_name,
      client_supplier_type:
        result?.clientSuppliersDetails?.client_supplier_type,
      client_supplier_address,
      retention_type: result.retention_type,
      payment_terms: result.payment_terms,
      initial_contract_sum: result.initial_contract_sum,
      formatted_initial_contract_sum: formatCurrencyWithoutDollars(
        result.initial_contract_sum,
      ),
      attachment_id: result.attachment_id,
      contract_start_date: result.contract_start_date
        ? new Date(result.contract_start_date)
        : new Date(0),
      defect_liability_end_date: result.defect_liability_end_date
        ? new Date(result.defect_liability_end_date)
        : new Date(0),
      buyer_name: buyerName,
      seller_name: sellerName,
      // variation_id: result?.variationDetails?.variation_id,
      variation_amount: sumOfVariationAmounts,
      payment_from_account: result.payment_from_account,
      retention_from_account: result.retention_from_account,
      payment_to_account: result.payment_to_account,
      payment_from_account_name:
        result?.contractPaymentFromAccount?.account_name,
      retention_from_account_name:
        result?.contractRetentionFromAccount?.account_name,
      payment_to_account_name: result?.contractPaymentToAccount?.account_name,
      payment_from_account_type:
        result?.contractPaymentFromAccount?.account_type,
      retention_from_account_type:
        result?.contractRetentionFromAccount?.account_type,
      payment_to_account_type: result?.contractPaymentToAccount?.account_type,
      file_name:
        result?.fileAttachments?.custom_file_name ??
        result?.fileAttachments?.file_name,
      file_type: result?.fileAttachments?.file_type,
      file_path: result?.fileAttachments?.file_path,
      active_payment_claims: active_payment_claims,
    };
  }

  async getContractDetailsById(contract_id: number) {
    const whereConditions: any = { contract_id };

    this.logger.log(
      `View contract query called with payload: ${JSON.stringify(contract_id)}`,
    );

    const result = await this.contractDetails.findOne({
      where: whereConditions ? whereConditions : {},
    });

    return {
      id: result.id,
      contract_id: result.contract_id,
      company_id: result.company_id,
      contract_name: result.contract_name,
      contract_type: result.contract_type,
      contract_billing_type: result.contract_billing_type,
      client_supplier_role: result.client_supplier_role,
      contract_date: result.contract_date,
      contract_status: result.contract_status,
      notice_generated: result.notice_generated,
      project_id: result.project_id,
      project_name: result?.projectDetails?.project_name,
      client_supplier_id: result.client_supplier_id,
      retention_type: result.retention_type,
      payment_terms: result.payment_terms,
      initial_contract_sum: result.initial_contract_sum,
      formatted_initial_contract_sum: formatCurrency(
        result.initial_contract_sum,
      ),
      attachment_id: result.attachment_id,
      contract_start_date: result.contract_start_date
        ? new Date(result.contract_start_date)
        : new Date(0),
      defect_liability_end_date: result.defect_liability_end_date
        ? new Date(result.defect_liability_end_date)
        : new Date(0),
    };
  }

  async getContractsDetailsById(id: string) {
    const contractDetails = await this.contractDetails.findOne({
      where: { id },
      relations: ['companyDetails', 'projectDetails', 'clientSuppliersDetails'],
    });
    let paymentClaims = [],
      paymentDetails = [];
    if (contractDetails) {
      paymentClaims = await this.paymentClaims.find({
        where: {
          contract_id: contractDetails.contract_id,
          status: Not('Deleted'),
        },
      });

      paymentDetails = await this.paymentDetails.find({
        where: {
          contract_id: contractDetails.contract_id,
          current_status: Not('Deleted'),
        },
      });
    }
    this.logger.log(`result: ${JSON.stringify({ ...contractDetails, paymentClaims, paymentDetails })}`);
    return { ...contractDetails, paymentClaims, paymentDetails };
  }

  async editContractDetailsById(
    decoded,
    updateContractDetailInput: UpdateContractDetailInput,
    userId,
  ) {
    this.logger.log(
      `Update contract called with payload: ${JSON.stringify(updateContractDetailInput)}`,
    );

    const status = updateContractDetailInput.contract_status;
    const isArchived =
      status === 'Completed' || status === 'Deleted' ? true : false;
    try {
      const txResult = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const contractTypeDetails = await this.getContractType(
            updateContractDetailInput,
          );
          this.logger.log(
            `Response recieved while getting the contract type from the database: ${JSON.stringify(contractTypeDetails)}`,
          );
          if (contractTypeDetails && contractTypeDetails.contract_type) {
            if (contractTypeDetails.contract_type !== 'Error') {
              updateContractDetailInput.contract_type =
                contractTypeDetails.contract_type;
              const contractDetails = await this.getContractsDetailsById(
                updateContractDetailInput.id,
              );
              this.logger.log(
                `Response recieved while fetching contract: ${JSON.stringify(contractDetails)}`,
              );
              if (contractDetails) {
                if (
                  updateContractDetailInput?.company_id &&
                  updateContractDetailInput?.client_supplier_type &&
                  updateContractDetailInput?.contract_name
                ) {
                  const checkContractName =
                    await this.checkExistenceForContract(
                      updateContractDetailInput.company_id,
                      updateContractDetailInput?.client_supplier_type,
                      updateContractDetailInput.contract_name,
                    );
                  if (
                    checkContractName &&
                    checkContractName?.length > 0 &&
                    checkContractName[0] !== null &&
                    contractDetails?.contract_id !==
                    checkContractName[0]?.contract_id
                  ) {
                    throw new Error(`Contract name already exists`);
                  }
                }

                var claimCount = 0,
                  payment = 0;
                if (
                  contractDetails.paymentClaims &&
                  contractDetails.paymentClaims.length > 0
                ) {
                  contractDetails?.paymentClaims.forEach((element) => {
                    if (
                      element.status === 'Paid - Matched' ||
                      element.status === 'Received - Matched' ||
                      element.status === 'No Match Required'
                    ) {
                      claimCount += 1;
                    }
                  });
                }
                if (
                  contractDetails.paymentDetails &&
                  contractDetails.paymentDetails.length > 0
                ) {
                  contractDetails?.paymentDetails.forEach((element) => {
                    if (
                      element.current_status === 'Paid - Matched' ||
                      element.current_status === 'Received - Matched' ||
                      element.current_status === 'No Match Required'
                    ) {
                      payment += 1;
                    }
                  });
                }
                if (
                  (updateContractDetailInput.contract_status === 'Completed' ||
                    updateContractDetailInput.contract_status === 'Deleted') &&
                  ((contractDetails.paymentClaims &&
                    contractDetails.paymentClaims.length !== claimCount) ||
                    (contractDetails.paymentDetails &&
                      contractDetails.paymentDetails.length !== payment))
                ) {
                  throw new Error(
                    `There are claims and payments in progress. You can't move this contract to the archive list to avoid system error.`,
                  );
                } else {
                  if (
                    (contractDetails.contract_status === 'Draft' &&
                      (updateContractDetailInput.contract_status === 'Draft' ||
                        updateContractDetailInput.contract_status ===
                        'In Progress')) ||
                    (contractDetails.contract_status === 'In Progress' &&
                      updateContractDetailInput.contract_status ===
                      'In Progress') ||
                    (contractDetails.contract_status === 'Completed' &&
                      contractDetails.projectDetails.project_status ===
                      'Completed' &&
                      status === 'In Progress')
                  ) {
                    if (
                      contractDetails.contract_status === 'Completed' &&
                      contractDetails.projectDetails.project_status ===
                      'Completed' &&
                      status === 'In Progress'
                    ) {
                      const projectDetails =
                        await transactionalEntityManager.findOne(
                          ProjectDetails,
                          {
                            where: { id: contractDetails.projectDetails.id },
                            lock: { mode: 'pessimistic_write' },
                          },
                        );
                      projectDetails.project_status = 'In Progress';
                      projectDetails.updated_by = userId;
                      projectDetails.updated_on = moment().tz('UTC');
                      projectDetails.updated_group = 'USER';
                      await transactionalEntityManager.save(projectDetails);
                    }
                    const variationDetails =
                      await transactionalEntityManager.find(VariationDetails, {
                        where: { contract_id: contractDetails.contract_id },
                        lock: { mode: 'pessimistic_write' },
                      });

                    if (variationDetails && variationDetails.length > 0) {
                      variationDetails.forEach((element) => {
                        if (
                          ((status === 'Completed' ||
                            status === 'In Progress') &&
                            (element.variation_status === 'Draft' ||
                              element.variation_status === 'In Review' ||
                              element.variation_status === 'Refused')) ||
                          status === 'Deleted'
                        ) {
                          element.is_archived = isArchived;
                          element.updated_by = userId;
                          element.updated_on = moment().tz('UTC');
                          element.updated_group = 'USER';
                        }
                      });
                      await transactionalEntityManager.save(variationDetails);
                    }

                    const contract = await transactionalEntityManager.findOne(
                      ContractDetails,
                      {
                        where: { id: contractDetails.id },
                        lock: { mode: 'pessimistic_write' },
                      },
                    );
                    contract.contract_name = await startCasePreserveUnicode(
                      updateContractDetailInput.contract_name,
                    );
                    contract.company_id = updateContractDetailInput.company_id;
                    contract.project_id = updateContractDetailInput.project_id;
                    contract.client_supplier_role =
                      updateContractDetailInput.client_supplier_role;
                    contract.contract_type =
                      updateContractDetailInput.contract_type;
                    if (
                      updateContractDetailInput.contract_billing_type !==
                      undefined
                    ) {
                      contract.contract_billing_type =
                        updateContractDetailInput.contract_billing_type ||
                        'Fixed';
                    }
                    contract.contract_date =
                      updateContractDetailInput.contract_date;
                    contract.retention_type =
                      updateContractDetailInput.retention_type;
                    contract.client_supplier_id =
                      updateContractDetailInput.client_supplier_id;
                    contract.payment_terms =
                      updateContractDetailInput.payment_terms;
                    contract.initial_contract_sum =
                      updateContractDetailInput.initial_contract_sum;
                    contract.contract_start_date =
                      updateContractDetailInput.contract_start_date;
                    contract.defect_liability_end_date =
                      updateContractDetailInput.defect_liability_end_date;
                    contract.payment_from_account =
                      updateContractDetailInput.payment_from_account;
                    contract.retention_from_account =
                      updateContractDetailInput.retention_from_account;
                    contract.payment_to_account =
                      updateContractDetailInput.payment_to_account;
                    contract.previous_status =
                      status === 'Completed' || status === 'Deleted'
                        ? contractDetails.contract_status
                        : null;
                    contract.contract_status = status;
                    contract.updated_by = userId;
                    contract.updated_on = moment.tz('UTC');
                    contract.updated_group = 'USER';
                    const response =
                      await transactionalEntityManager.save(contract);

                    // Task #235: contract save committed. All post-save side
                    // effects (notice trigger, compliance recalcs, activity
                    // logs) are returned here and executed AFTER the
                    // transaction commits — see the post-commit block below.
                    // They were previously inline inside this transaction,
                    // which meant a slow query inside the Supplier S23
                    // notice pipeline (Postgres statement_timeout) would
                    // abort the transaction and 500 the entire edit even
                    // though the contract row itself saved fine.
                    return {
                      response,
                      contractDetails,
                      contract,
                    };
                  }
                  throw new Error(`Unable to edit the contract.`);
                }
              }
              throw new Error(`Unable to edit the contract, please try again`);
            }
            throw new Error(contractTypeDetails.validation);
          }
          throw new Error(
            `Pay Trade doesn't allow ${updateContractDetailInput.project_role}/${updateContractDetailInput.client_supplier_role} contract types`,
          );
        },
      );

      // Task #235: post-commit side effects. The contract row is already
      // saved by this point. Each block is wrapped in try/catch so a slow
      // or failing notice/compliance/activity-log call no longer rolls
      // back the contract edit or returns a 500 to the client. Errors are
      // logged so they remain visible in Railway for follow-up.
      const { response, contractDetails, contract } = txResult ?? {};
      let notices;

      if (response) {
        if (
          updateContractDetailInput.client_supplier_type === 'Supplier'
        ) {
          try {
            notices =
              await this.noticeService.handleTriggerContractNotices(
                decoded,
                {
                  contract_id: contract.contract_id,
                  view_preview: true,
                },
              );
          } catch (err) {
            this.logger.error(
              `[POST_COMMIT] Error triggering contract notices for contract_id=${contract?.contract_id}: ${err?.message || err}`,
            );
          }
        }

        if (contract.project_id) {
          try {
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: contract.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            });
          } catch (err) {
            this.logger.error(
              `[POST_COMMIT] PTA compliance recalc failed for project_id=${contract.project_id}: ${err?.message || err}`,
            );
          }

          try {
            await this.complianceService.fetchComplianceResultsOfAProject({
              project_id: contract.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            });
          } catch (err) {
            this.logger.error(
              `[POST_COMMIT] RTA compliance recalc failed for project_id=${contract.project_id}: ${err?.message || err}`,
            );
          }
        }

        const contractLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[6]}` +
          contractDetails.id +
          `?from=log`;
        this.logger.log(`contractLink: ${contractLink}`);

        try {
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 58,
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
            company_id: updateContractDetailInput.company_id,
            dynamic_values: {
              contractName: await startCasePreserveUnicode(
                updateContractDetailInput.contract_name,
              ),
              contractLink,
              clientSupplierType:
                contractDetails.clientSuppliersDetails
                  ?.client_supplier_type,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        } catch (err) {
          this.logger.error(
            `[POST_COMMIT] Activity log (template 58) insert failed for contract_id=${contract?.contract_id}: ${err?.message || err}`,
          );
        }

        if (
          contractDetails.payment_from_account !=
            updateContractDetailInput.payment_from_account ||
          contractDetails.payment_to_account !=
            updateContractDetailInput.payment_to_account ||
          contractDetails.retention_from_account !=
            updateContractDetailInput.retention_from_account
        ) {
          try {
            const createActivityLogInput1: CreateActivityLogInput = {
              event_template_id: 62,
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
              company_id: updateContractDetailInput.company_id,
              dynamic_values: {
                contractName: await startCasePreserveUnicode(
                  updateContractDetailInput.contract_name,
                ),
                contractLink,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput1,
            );
          } catch (err) {
            this.logger.error(
              `[POST_COMMIT] Activity log (template 62) insert failed for contract_id=${contract?.contract_id}: ${err?.message || err}`,
            );
          }
        }
      }

      return {
        ...(response ?? {}),
        notices: notices?.data,
      };
    } catch (error) {
      error = error?.message ? error?.message : error;
      this.logger.log(
        `Error in edit contract with message: ${JSON.stringify(error)}`,
      );

      throw new Error(error);
    }
  }

  async updateContractStatusById(decoded, id, status) {
    const isArchived =
      status === 'Completed' || status === 'Deleted' ? true : false;
    try {
      this.logger.log(
        `Update contract status service called for id: ${JSON.stringify(id)}`,
      );
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const contractDetails = await this.getContractsDetailsById(id);
          this.logger.log(
            `Response recieved while fetching contract: ${JSON.stringify(contractDetails)}`,
          );
          if (contractDetails) {
            var claimCount = 0,
              payment = 0;
            if (
              contractDetails.paymentClaims &&
              contractDetails.paymentClaims.length > 0
            ) {
              contractDetails?.paymentClaims.forEach((element) => {
                if (
                  element.status === 'Paid - Matched' ||
                  element.status === 'Received - Matched' ||
                  element.status === 'No Match Required'
                ) {
                  claimCount += 1;
                }
              });
            }
            if (
              contractDetails.paymentDetails &&
              contractDetails.paymentDetails.length > 0
            ) {
              contractDetails?.paymentDetails.forEach((element) => {
                if (
                  element.current_status === 'Paid - Matched' ||
                  element.current_status === 'Received - Matched' ||
                  element.current_status === 'No Match Required'
                ) {
                  payment += 1;
                }
              });
            }
            if (
              (status === 'Completed' || status === 'Deleted') &&
              ((contractDetails.paymentClaims &&
                contractDetails.paymentClaims.length !== claimCount) ||
                (contractDetails.paymentDetails &&
                  contractDetails.paymentDetails.length !== payment))
            ) {
              throw new Error(
                `There are claims and payments in progress. You can't move this contract to the archive list to avoid system error.`,
              );
            } else {
              if (
                contractDetails.contract_status === 'Completed' &&
                contractDetails.projectDetails.project_status === 'Completed' &&
                status === 'In Progress'
              ) {
                const projectDetails = await transactionalEntityManager.findOne(
                  ProjectDetails,
                  {
                    where: { id: contractDetails.projectDetails.id },
                    lock: { mode: 'pessimistic_write' },
                  },
                );
                projectDetails.project_status = 'In Progress';
                projectDetails.updated_by = decoded?.userId;
                projectDetails.updated_on = moment().tz('UTC');
                projectDetails.updated_group = 'USER';
                await transactionalEntityManager.save(projectDetails);
              }
              const variationDetails = await transactionalEntityManager.find(
                VariationDetails,
                {
                  where: { contract_id: contractDetails.contract_id },
                  lock: { mode: 'pessimistic_write' },
                },
              );

              if (variationDetails && variationDetails.length > 0) {
                variationDetails.forEach((element) => {
                  if (
                    ((status === 'Completed' || status === 'In Progress') &&
                      (element.variation_status === 'Draft' ||
                        element.variation_status === 'In Review' ||
                        element.variation_status === 'Refused')) ||
                    status === 'Deleted'
                  ) {
                    element.is_archived = isArchived;
                    element.updated_by = decoded?.userId;
                    element.updated_on = moment().tz('UTC');
                    element.updated_group = 'USER';
                  }
                });
                await transactionalEntityManager.save(variationDetails);
              }

              const contract = await transactionalEntityManager.findOne(
                ContractDetails,
                {
                  where: { id: contractDetails.id },
                  lock: { mode: 'pessimistic_write' },
                },
              );
              contract.previous_status =
                status === 'Completed' || status === 'Deleted'
                  ? contractDetails.contract_status
                  : null;
              contract.contract_status = status;
              contract.updated_by = decoded?.userId;
              contract.updated_on = moment.tz('UTC');
              contract.updated_group = 'USER';
              const response = await transactionalEntityManager.save(contract);

              if (response) {
                if (contract.project_id) {
                  const compliance_pta_init =
                    await this.complianceService.fetchComplianceResultsOfAProject(
                      {
                        project_id: contract.project_id,
                        bank_account_type: 'Project Trust Account',
                        failedFilter: false,
                      },
                    );

                  const compliance_rta_init =
                    await this.complianceService.fetchComplianceResultsOfAProject(
                      {
                        project_id: contract.project_id,
                        bank_account_type: 'Retention Trust Account',
                        failedFilter: false,
                      },
                    );
                }

                if (status === 'Deleted') {
                  const notices = await transactionalEntityManager.find(
                    NoticeDetails,
                    {
                      where: {
                        contract_id: contractDetails.contract_id,
                        notice_type: In([
                          'Supplier S23 Project Trust Account Notice',
                          'Supplier S23 Retention Trust Account Notice',
                          'QBCC TA3 Notice Of Related Entities',
                        ]),
                      },
                      lock: { mode: 'pessimistic_write' },
                    },
                  );

                  if (notices && notices.length > 0) {
                    notices.forEach((notice) => {
                      notice.status =
                        notice.status === 'Sent'
                          ? 'Delete-Sent'
                          : 'Delete-Unsent';
                      notice.updated_by = decoded?.userId;
                      notice.updated_on = moment().tz('UTC');
                      notice.updated_group = 'USER';
                    });
                    await transactionalEntityManager.save(notices);
                  }
                }

                response.contract_date = response.contract_date
                  ? new Date(response.contract_date)
                  : new Date(0);

                response.contract_start_date = response.contract_start_date
                  ? new Date(response.contract_start_date)
                  : new Date(0);

                response.defect_liability_end_date =
                  response.defect_liability_end_date
                    ? new Date(response.defect_liability_end_date)
                    : new Date(0);

                //Generating link to view updated contract.
                const contractLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[6]}` +
                  contractDetails.id +
                  `?from=log`;
                this.logger.log(`contractLink: ${contractLink}`);

                let eventTemplateId;
                if (status === 'Completed') {
                  eventTemplateId = 61;
                } else if (status === 'Deleted') {
                  eventTemplateId = 59;
                } else if (status === 'In Progress' || status === 'Draft') {
                  eventTemplateId = 60;
                }
                const createActivityLogInput: CreateActivityLogInput = {
                  event_template_id: eventTemplateId,
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
                  company_id: contractDetails.company_id,
                  dynamic_values: {
                    contractName: await startCasePreserveUnicode(
                      contractDetails.contract_name,
                    ),
                    contractLink,
                    clientSupplierType:
                      contractDetails?.clientSuppliersDetails
                        ?.client_supplier_type,
                  },
                  is_admin: false,
                  created_by: decoded?.userId,
                };
                await this.activityLogService.insertActivityLog(
                  createActivityLogInput,
                );
              }
              // throw new Error('Error');
              return response;
            }
          }
          throw new Error(`Unable to update the contract, please try again`);
        },
      );
    } catch (error) {
      this.logger.log(
        `Update contract status errored out with messgae ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async updateContractNoticeStatus(contract_id) {
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const contract = await transactionalEntityManager.findOne(
            ContractDetails,
            {
              where: { contract_id: contract_id },
              lock: { mode: 'pessimistic_write' },
            },
          );
          contract.notice_generated = true;
          contract.updated_on = moment.tz('UTC');
          contract.updated_group = 'USER';
          const response = await transactionalEntityManager.save(contract);
          // throw new Error('Error');
          return response;
        },
      );
    } catch (error) {
      this.logger.log(
        `Contract notice status update errored out with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async getContractLists(company_id: number, project_id?: number) {
    const whereConditions: any = { company_id, contract_status: 'In Progress' };

    if (project_id) {
      whereConditions.project_id = project_id;
    }
    const results = await this.contractDetails.find({
      where: whereConditions ? whereConditions : {},
      order: { contract_name: 'ASC' },
    });

    return results.map((result) => {
      return {
        id: result.id,
        contract_id: result.contract_id,
        contract_name: result.contract_name,
        contract_type: result.contract_type,
        client_supplier_role: result.client_supplier_role,
        contract_status: result.contract_status,
        contract_date: result.contract_date,
        project_id: result.project_id,
        client_supplier_id: result.client_supplier_id,
        retention_type: result.retention_type,
        payment_terms: result.payment_terms,
        initial_contract_sum: result.initial_contract_sum,
        formatted_initial_contract_sum: formatCurrency(
          result.initial_contract_sum,
        ),
      };
    });
  }

  async getContractListForProjects(
    getContractListForProjectsInput: GetContractListForProjectsInput,
  ) {
    const company_id = getContractListForProjectsInput.company_id;
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    const subQuery = await this.variationDetails
      .createQueryBuilder('v')
      .select('v.contract_id', 'contract_id')
      .addSelect('SUM(v.variation_amount)::numeric', 'variation_amount')
      .where("v.variation_status = 'Agreed'")
      .andWhere(`v.company_id = :companyId`, {
        companyId: company_id,
      })
      .groupBy('v.contract_id')
      .having('SUM(v.variation_amount) > 0');

    const queryBuilder = await this.contractDetails
      .createQueryBuilder('contract')
      .select('contract.id', 'id')
      .addSelect('contract.contract_id', 'contract_id')
      .addSelect('contract.company_id', 'company_id')
      .addSelect('company.company_name', 'company_name')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('contract.contract_type', 'contract_type')
      .addSelect('contract.contract_billing_type', 'contract_billing_type')
      .addSelect('contract.client_supplier_role', 'client_supplier_role')
      .addSelect('contract.contract_date', 'contract_date')
      .addSelect('contract.contract_status', 'contract_status')
      .addSelect('contract.project_id', 'project_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('contract.client_supplier_id', 'client_supplier_id')
      .addSelect('clientSupplier.client_supplier_name', 'client_supplier_name')
      .addSelect('clientSupplier.client_supplier_type', 'client_supplier_type')
      .addSelect('contract.retention_type', 'retention_type')
      .addSelect('contract.payment_terms', 'payment_terms')
      .addSelect('contract.initial_contract_sum', 'initial_contract_sum')
      .addSelect('contract.attachment_id', 'attachment_id')
      .addSelect('contract.contract_start_date', 'contract_start_date')
      .addSelect('contract.notice_generated', 'notice_generated')
      .addSelect(
        'contract.defect_liability_end_date',
        'defect_liability_end_date',
      )
      .addSelect(
        "CASE WHEN clientSupplier.client_supplier_type = 'Client' THEN clientSupplier.client_supplier_name ELSE company.company_name END",
        'buyer_name',
      )
      .addSelect('contract.payment_from_account', 'payment_from_account')
      .addSelect('contract.retention_from_account', 'retention_from_account')
      .addSelect('contract.payment_to_account', 'payment_to_account')
      .addSelect(
        "CASE WHEN clientSupplier.client_supplier_type = 'Supplier' THEN clientSupplier.client_supplier_name ELSE company.company_name END",
        'seller_name',
      )
      .addSelect('variation.variation_amount', 'variation_amount')
      .innerJoin('contract.companyDetails', 'company')
      .innerJoin('contract.projectDetails', 'project')
      .innerJoin('contract.clientSuppliersDetails', 'clientSupplier')
      .leftJoin(
        '(' + subQuery.getQuery() + ')',
        'variation',
        'contract.contract_id = variation.contract_id',
      );
    queryBuilder.where(`contract.company_id = :companyId`, {
      companyId: company_id,
    });
    queryBuilder.andWhere('contract.project_id = :project_id', {
      project_id: getContractListForProjectsInput.project_id,
    });
    queryBuilder.andWhere('contract.contract_status = :contract_status', {
      contract_status: 'Completed',
    });

    if (getContractListForProjectsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(contract.contract_name) LIKE LOWER(:keyword) OR CAST(contract.contract_id AS TEXT) LIKE :keyword 
          OR LOWER(project.project_name) LIKE LOWER(:keyword)
          )`,
        {
          keyword: `%${getContractListForProjectsInput.search.toLowerCase()}%`,
        },
      );
    }
    if (getContractListForProjectsInput.date_filter) {
      if (
        getContractListForProjectsInput.date_filter === 'Custom' &&
        getContractListForProjectsInput.start_date &&
        getContractListForProjectsInput.end_date
      ) {
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: getContractListForProjectsInput.start_date,
            end_date: getContractListForProjectsInput.end_date,
          },
        );
      } else if (getContractListForProjectsInput.date_filter === 'This Month') {
        const startDate = moment().startOf('month').toDate();
        const endDate = moment().endOf('month').toDate();
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      } else if (getContractListForProjectsInput.date_filter === 'Last Month') {
        const startDate = moment()
          .subtract(1, 'month')
          .startOf('month')
          .toDate();
        const endDate = moment().subtract(1, 'month').endOf('month').toDate();
        queryBuilder.andWhere(
          'contract.contract_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }
    }

    const sorting_order = getContractListForProjectsInput.sorting_order
      ? getContractListForProjectsInput.sorting_order
      : 'DESC';
    if (!getContractListForProjectsInput.sorting_field) {
      queryBuilder.orderBy({ 'contract.contract_date': sorting_order });
      if (
        getContractListForProjectsInput.page_number &&
        getContractListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getContractListForProjectsInput.page_number - 1) *
            getContractListForProjectsInput.page_size,
          )
          .limit(getContractListForProjectsInput.page_size);
      }
    }
    if (
      getContractListForProjectsInput.sorting_field &&
      getContractListForProjectsInput.sorting_field !== 'buyer_name' &&
      getContractListForProjectsInput.sorting_field !== 'seller_name' &&
      getContractListForProjectsInput.sorting_field !== 'variation_amount'
    ) {
      switch (getContractListForProjectsInput.sorting_field) {
        case 'contract_date':
          {
            queryBuilder.orderBy({ 'contract.contract_date': sorting_order });
          }
          break;
        case 'contract_name':
          {
            queryBuilder.orderBy({
              'LOWER(contract.contract_name)': sorting_order,
            });
          }
          break;
        case 'initial_contract_sum':
          {
            queryBuilder.orderBy({
              'contract.initial_contract_sum': sorting_order,
            });
          }
          break;
        case 'project_name':
          {
            queryBuilder.orderBy({
              'LOWER(project.project_name)': sorting_order,
            });
          }
          break;
      }
      if (
        getContractListForProjectsInput.page_number &&
        getContractListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getContractListForProjectsInput.page_number - 1) *
            getContractListForProjectsInput.page_size,
          )
          .limit(getContractListForProjectsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;
    if (
      getContractListForProjectsInput.sorting_field &&
      getContractListForProjectsInput.sorting_field === 'buyer_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.buyer_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.buyer_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.buyer_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.buyer_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? (getContractListForProjectsInput.page_number - 1) *
          getContractListForProjectsInput.page_size
          : 0;
      const endIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? Math.min(
            (getContractListForProjectsInput.page_number - 1) *
            getContractListForProjectsInput.page_size +
            getContractListForProjectsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getContractListForProjectsInput.sorting_field &&
      getContractListForProjectsInput.sorting_field === 'seller_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.seller_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.seller_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.seller_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.seller_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? (getContractListForProjectsInput.page_number - 1) *
          getContractListForProjectsInput.page_size
          : 0;
      const endIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? Math.min(
            (getContractListForProjectsInput.page_number - 1) *
            getContractListForProjectsInput.page_size +
            getContractListForProjectsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getContractListForProjectsInput.sorting_field &&
      getContractListForProjectsInput.sorting_field === 'variation_amount'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.variation_amount - b.variation_amount,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.variation_amount - a.variation_amount,
        );
      }

      const startIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? (getContractListForProjectsInput.page_number - 1) *
          getContractListForProjectsInput.page_size
          : 0;
      const endIndex =
        getContractListForProjectsInput.page_number &&
          getContractListForProjectsInput.page_size
          ? Math.min(
            (getContractListForProjectsInput.page_number - 1) *
            getContractListForProjectsInput.page_size +
            getContractListForProjectsInput.page_size,
            sortedResult?.length,
          )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else {
      finalResult = rawResults;
      finalCount = totalCount;
    }

    for (const element of finalResult) {
      element.formatted_initial_contract_sum = formatCurrency(
        element.initial_contract_sum,
      );
      element.formatted_variation_amount = formatCurrency(
        element.variation_amount,
      );
    }

    return {
      total_count: finalCount,
      contract_list: finalResult,
    };
  }

  async checkExistenceForContract(
    company_id: number,
    client_supplier_type: string,
    contract_name?: string,
  ) {
    const contractDetails = await this.contractDetails
      .createQueryBuilder('contract')
      .select('contract.id', 'id')
      .addSelect('contract.contract_id', 'contract_id')
      .addSelect('contract.company_id', 'company_id')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('contract.contract_status', 'contract_status')
      .addSelect('contract.project_id', 'project_id')
      .addSelect('contract.client_supplier_id', 'client_supplier_id')
      .addSelect('contract.notice_generated', 'notice_generated')
      .innerJoin(
        ClientSuppliersDetails,
        'clientSupplier',
        `contract.client_supplier_id = clientSupplier.client_supplier_id and  clientSupplier.client_supplier_type = '${client_supplier_type}'`,
      )
      .where('contract.company_id = :company_id', { company_id })
      .andWhere('LOWER(TRIM(contract.contract_name)) = :contract_name', {
        contract_name: contract_name?.trim()?.toLowerCase(),
      })
      .getRawMany();
    this.logger.log(`contractDetails: ${JSON.stringify(contractDetails)}`);
    return contractDetails;
  }
}
