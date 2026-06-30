import { Injectable } from '@nestjs/common';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Not, Repository } from 'typeorm';
import { ProjectDetails } from 'src/entities/project-details.entity';
import {
  GetProjectContractListsInput,
  GetProjectListsInput,
} from './dto/get-project-lists.input';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { BankAccounts, PaymentClaims } from 'src/entities/banking.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { CompliancesService } from '../compliances/compliances.service';
import { formatCurrencyWithoutDollars } from 'src/libs/@currency-formattor/currency-formattor';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class ProjectsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(PaymentClaims)
    private paymentClaims: Repository<PaymentClaims>,
    @InjectRepository(PaymentDetails)
    private paymentDetails: Repository<PaymentDetails>,
    @InjectRepository(BankAccounts)
    private bankAccounts: Repository<BankAccounts>,
    private complianceService: CompliancesService,
    private readonly activityLogService: ActivityLogService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {
    this.logger = new PaytradeLogger('PROJECTS_SERVICE');
  }

  async getCompanyDetailsById(company_id) {
    return await this.companyDetails.findOne({ where: { company_id } });
  }

  async insertProjectDetails(decoded, createProjectInput: CreateProjectInput) {
    try {
      this.logger.log(
        `Add Project details service initiated with payload: ${JSON.stringify(createProjectInput.project_name)}`,
      );

      if (createProjectInput.project_status === 'In Progress') {
        const getCount = await this.getProjectListsForCompany({
          company_id: createProjectInput.company_id,
          project_status: 'In Progress',
          page_number: 1,
          page_size: 10,
        });
        this.logger.log(`Project count: ${JSON.stringify(getCount)}`);

        const subscriptionDetails =
          await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
            createProjectInput.company_id,
          );
        const subscriptionItem =
          subscriptionDetails &&
          subscriptionDetails?.plan_items &&
          subscriptionDetails?.plan_items?.length > 0
            ? subscriptionDetails?.plan_items?.filter(
                (item) => item?.item_name === 'Projects',
              )
            : [];

        if (
          !subscriptionDetails?.is_free_plan_eligible &&
          (!subscriptionItem ||
            (subscriptionItem &&
              subscriptionItem?.length > 0 &&
              !subscriptionItem[0]?.is_unlimited &&
              (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                  getCount &&
                  getCount?.total_count &&
                  getCount?.total_count >= subscriptionItem[0]?.limit_value))))
        ) {
          return {
            warning: true,
            warningMessage: `Project cannot be added. Please upgrade your subscription plan.`,
          };
        }
      }

      // createProjectInput.project_name = await startCasePreserveUnicode(
      //   createProjectInput.project_name,
      // );
      createProjectInput.created_on = moment.tz('UTC');
      createProjectInput.created_by = decoded?.userId;
      createProjectInput.created_group = 'USER';
      const createProject =
        await this.projectDetails.create(createProjectInput);
      const projectDetails = await this.projectDetails.save(createProject);
      this.logger.log(`Project created with id: ${projectDetails?.project_id}`);
      if (projectDetails) {
        projectDetails.project_id = 1000 + Number(projectDetails.project_id);

        //Generating project link.
        const projectLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[4]}` +
          `${projectDetails.id}` +
          `?from=log`;
        this.logger.log(`projectLink: ${projectLink}`);

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 42,
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
          company_id: createProjectInput.company_id,
          dynamic_values: {
            projectName: createProjectInput.project_name,
            projectLink,
          },
          is_admin: false,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);

        // Draft projects (e.g. the Xero "Create in PayTrade" name-only import)
        // have no compliance-relevant fields yet; running compliance here would
        // dereference their empty values and throw, orphaning the new project.
        // Compliance is recomputed once the project is populated / activated.
        if (createProjectInput.project_status !== 'Draft') {
          this.logger.log(
            `Compliance update for new project added initiated for project: ${JSON.stringify(projectDetails.project_id)}`,
          );

          await this.complianceService.fetchComplianceResultsOfAProject({
            project_id: projectDetails.project_id,
            bank_account_type: 'Project Trust Account',
            failedFilter: false,
          });

          await this.complianceService.fetchComplianceResultsOfAProject({
            project_id: projectDetails.project_id,
            bank_account_type: 'Retention Trust Account',
            failedFilter: false,
          });

          // Invalidate cached compliance so the freshness layer recomputes.
          try {
            await this.complianceService.markComplianceDirty(
              projectDetails.project_id,
              'project.create',
            );
          } catch (err) {
            this.logger.error(
              `markComplianceDirty failed for project ${projectDetails.project_id}: ${err?.message || err}`,
            );
          }
        }
      }
      return projectDetails;
    } catch (error) {
      error = error?.message ? error?.message : error;
      this.logger.log(
        `Add project details service failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async getProjectListsForCompany(getProjectListsInput: GetProjectListsInput) {
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];
    const queryBuilder = await this.projectDetails
      .createQueryBuilder('project')
      .select('project.id', 'id')
      .addSelect('project.project_id', 'project_id')
      .addSelect('project.company_id', 'company_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('project.project_role', 'project_role')
      .addSelect('project.project_date', 'project_date')
      .addSelect('project.project_description', 'project_description')
      .addSelect('project.site_address', 'site_address')
      .addSelect('project.country', 'country')
      .addSelect('project.region', 'region')
      .addSelect('project.place_id', 'place_id')
      .addSelect('project.latitude', 'latitude')
      .addSelect('project.longitude', 'longitude')
      .addSelect('project.head_contract_sum', 'head_contract_sum')
      .addSelect('project.retention_type', 'retention_type')
      .addSelect('project.retention_type', 'retention_type')
      .addSelect('project.number_of_units', 'number_of_units')
      .addSelect('project.pta_eligibility', 'pta_eligibility')
      .addSelect('project.rta_eligibility', 'rta_eligibility')
      .addSelect('project.project_status', 'project_status')
      .where(`project.company_id = :companyId`, {
        companyId: getProjectListsInput.company_id,
      });
    if (getProjectListsInput.project_status) {
      if (getProjectListsInput.project_status === 'Archived') {
        queryBuilder.andWhere('project.project_status IN(:...excludedStatus)', {
          excludedStatus,
        });
      } else {
        queryBuilder.andWhere('project.project_status = :project_status', {
          project_status: getProjectListsInput.project_status,
        });
      }
    } else {
      queryBuilder.andWhere(
        'project.project_status NOT IN(:...excludedStatus)',
        { excludedStatus },
      );
    }

    if (getProjectListsInput.project_role) {
      queryBuilder.andWhere('project.project_role = :project_role', {
        project_role: getProjectListsInput.project_role,
      });
    }

    if (getProjectListsInput.project_name_or_id) {
      queryBuilder.andWhere(
        `(LOWER(project.project_name) LIKE LOWER(:keyword))`,
        {
          keyword: `%${getProjectListsInput.project_name_or_id.toLowerCase()}%`,
        },
      );
    }

    if (getProjectListsInput.date_filter) {
      if (
        getProjectListsInput.date_filter === 'Custom' &&
        getProjectListsInput.start_date &&
        getProjectListsInput.end_date
      ) {
        queryBuilder.andWhere(
          'project.project_date BETWEEN :start_date AND :end_date',
          {
            start_date: getProjectListsInput.start_date,
            end_date: getProjectListsInput.end_date,
          },
        );
      } else if (getProjectListsInput.date_filter === 'This Month') {
        const startDate = moment().startOf('month').toDate();
        const endDate = moment().endOf('month').toDate();
        queryBuilder.andWhere(
          'project.project_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      } else if (getProjectListsInput.date_filter === 'Last Month') {
        const startDate = moment()
          .subtract(1, 'month')
          .startOf('month')
          .toDate();
        const endDate = moment().subtract(1, 'month').endOf('month').toDate();
        queryBuilder.andWhere(
          'project.project_date BETWEEN :start_date AND :end_date',
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }
    }

    const sorting_order = getProjectListsInput.sorting_order
      ? getProjectListsInput.sorting_order
      : 'DESC';
    if (!getProjectListsInput.sorting_field) {
      queryBuilder.orderBy({ project_date: sorting_order });
      if (getProjectListsInput.page_number && getProjectListsInput.page_size) {
        queryBuilder
          .offset(
            (getProjectListsInput.page_number - 1) *
              getProjectListsInput.page_size,
          )
          .limit(getProjectListsInput.page_size);
      }
    }
    if (
      getProjectListsInput.sorting_field &&
      getProjectListsInput.sorting_field !== 'compliance'
    ) {
      switch (getProjectListsInput.sorting_field) {
        case 'project_name':
          {
            queryBuilder.orderBy({
              'LOWER(project.project_name)': sorting_order,
            });
          }
          break;
        case 'project_date':
          {
            queryBuilder.orderBy({ project_date: sorting_order });
          }
          break;
        case 'site_address':
          {
            queryBuilder.orderBy({
              'LOWER(project.site_address)': sorting_order,
            });
          }
          break;
        case 'project_role':
          {
            queryBuilder.orderBy({ project_role: sorting_order });
          }
          break;
        case 'number_of_units':
          {
            queryBuilder.orderBy({ number_of_units: sorting_order });
          }
          break;
        case 'pta_eligibility':
          {
            queryBuilder.orderBy({ pta_eligibility: sorting_order });
          }
          break;
        case 'rta_eligibility':
          {
            queryBuilder.orderBy({ rta_eligibility: sorting_order });
          }
          break;
      }
      if (getProjectListsInput.page_number && getProjectListsInput.page_size) {
        queryBuilder
          .offset(
            (getProjectListsInput.page_number - 1) *
              getProjectListsInput.page_size,
          )
          .limit(getProjectListsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const resultsWithCompliances = await Promise.all(
      rawResults?.map(async (result) => {
        //Fetching compliance results of a project.
        const complianceResultsOfProject =
          await this.complianceService.fetchComplianceStatusesOfAProject({
            project_id: result.project_id,
          });
        // console.log('complianceResultsOfProject', complianceResultsOfProject);
        result.pta_compliance = complianceResultsOfProject.data.pta_compliance;
        result.rta_compliance = complianceResultsOfProject.data.rta_compliance;
        if (
          complianceResultsOfProject.data.pta_compliance == 'Action required' ||
          complianceResultsOfProject.data.rta_compliance == 'Action required'
        ) {
          result.compliance = 'Action required';
        } else {
          result.compliance = 'Ok';
        }

        //Add formatted contract sum.
        result.formatted_head_contract_sum = formatCurrencyWithoutDollars(
          result.head_contract_sum,
        );
        return result;
      }),
    );

    let finalResult, finalCount;
    if (
      getProjectListsInput.sorting_field &&
      getProjectListsInput.sorting_field === 'compliance'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(resultsWithCompliances).sort((a, b) =>
          a.compliance?.trim()?.localeCompare(b.compliance?.trim()),
        );
      } else {
        sortedResult = Array.from(resultsWithCompliances).sort((a, b) =>
          b.compliance?.trim()?.localeCompare(a.compliance?.trim()),
        );
      }

      const startIndex =
        getProjectListsInput.page_number && getProjectListsInput.page_size
          ? (getProjectListsInput.page_number - 1) *
            getProjectListsInput.page_size
          : 0;
      const endIndex =
        getProjectListsInput.page_number && getProjectListsInput.page_size
          ? Math.min(
              (getProjectListsInput.page_number - 1) *
                getProjectListsInput.page_size +
                getProjectListsInput.page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else {
      finalResult = resultsWithCompliances;
      finalCount = totalCount;
    }

    return { total_count: finalCount, project_list: finalResult };
  }

  async viewProjectDetailsById(id: string) {
    const whereConditions: any = { id };

    const result = await this.projectDetails.findOne({
      where: whereConditions,
    });

    const contractDetails = await this.contractDetails.find({
      where: {
        project_id: result.project_id,
        contract_status: Not(In(['Draft', 'Deleted'])),
      },
    });

    result.project_date = result.project_date
      ? new Date(result.project_date)
      : new Date(0);
    result.created_on = result.created_on
      ? new Date(result.created_on)
      : new Date(0);

    //Fetching compliance results of a project.
    const complianceResultsOfProject =
      await this.complianceService.fetchComplianceStatusesOfAProject({
        project_id: result.project_id,
      });
    // console.log('complianceResultsOfProject', complianceResultsOfProject);

    return {
      id: result.id,
      project_id: result.project_id,
      company_id: result.company_id,
      project_name: result.project_name,
      project_role: result.project_role,
      project_date: result.project_date,
      project_description: result.project_description,
      site_address: result.site_address,
      country: result.country,
      region: result.region,
      place_id: result.place_id,
      latitude: result.latitude,
      longitude: result.longitude,
      head_contract_sum: result.head_contract_sum,
      formatted_head_contract_sum: formatCurrencyWithoutDollars(
        result.head_contract_sum,
      ),
      retention_type: result.retention_type,
      number_of_units: result.number_of_units,
      pta_eligibility: result.pta_eligibility,
      rta_eligibility: result.rta_eligibility,
      project_status: result.project_status,
      contract_count:
        contractDetails && contractDetails.length > 0
          ? contractDetails.length
          : 0,
      pta_compliance: complianceResultsOfProject.data.pta_compliance,
      rta_compliance: complianceResultsOfProject.data.rta_compliance,
      compliance:
        complianceResultsOfProject.data.pta_compliance == 'Action required' ||
        complianceResultsOfProject.data.rta_compliance == 'Action required'
          ? 'Action required'
          : 'Ok',
      compliance_paused: result.compliance_paused,
      compliance_paused_reason: result.compliance_paused_reason,
    };
  }

  async getProjectDetailsById(id: string) {
    const projectDetails = await this.projectDetails.findOne({
      where: { id },
    });
    let contractDetails = [],
      paymentClaims = [],
      paymentDetails = [];
    if (projectDetails) {
      contractDetails = await this.contractDetails.find({
        where: {
          project_id: projectDetails.project_id,
          contract_status: Not(In(['Draft', 'Deleted'])),
        },
      });

      if (contractDetails) {
        paymentClaims = await this.paymentClaims.find({
          where: {
            project_id: projectDetails.project_id,
            status: Not('Deleted'),
          },
        });

        paymentDetails = await this.paymentDetails.find({
          where: {
            project_id: projectDetails.project_id,
            current_status: Not('Deleted'),
          },
        });
      }
    }

    return {
      ...projectDetails,
      contractDetails,
      paymentClaims,
      paymentDetails,
    };
  }

  async editProjectDetailsById(
    updateProjectInput: UpdateProjectInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Edit project details service initiated for project: ${JSON.stringify(updateProjectInput.id)}`,
      );
      const projectDetails = await this.projectDetails.findOne({
        where: { id: updateProjectInput.id },
      });
      if (projectDetails) {
        if (
          projectDetails.project_status === 'Draft' &&
          updateProjectInput.project_status === 'In Progress'
        ) {
          const getCount = await this.getProjectListsForCompany({
            company_id: projectDetails.company_id,
            project_status: 'In Progress',
            page_number: 1,
            page_size: 10,
          });
          this.logger.log(`getCount: ${JSON.stringify(getCount)}`);

          const subscriptionDetails =
            await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
              projectDetails.company_id,
            );
          const subscriptionItem =
            subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
              ? subscriptionDetails?.plan_items?.filter(
                  (item) => item?.item_name === 'Projects',
                )
              : [];

          if (
            !subscriptionDetails?.is_free_plan_eligible &&
            (!subscriptionItem ||
              (subscriptionItem &&
                subscriptionItem?.length > 0 &&
                !subscriptionItem[0]?.is_unlimited &&
                (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                  (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                    getCount &&
                    getCount?.total_count &&
                    getCount?.total_count >=
                      subscriptionItem[0]?.limit_value))))
          ) {
            return {
              warning: true,
              warningMessage: `Project cannot be made active. Please upgrade your subscription plan.`,
            };
          }
        }

        var completedCount = 0,
          claimCount = 0,
          payment = 0,
          contractCount = 0;
        if (
          projectDetails.contractDetails &&
          projectDetails.contractDetails.length > 0
        ) {
          projectDetails.contractDetails.forEach((element) => {
            if (element.contract_status === 'Completed') {
              completedCount += 1;
            }
          });
          contractCount = projectDetails.contractDetails.length;
        }
        if (
          projectDetails.paymentClaims &&
          projectDetails.paymentClaims.length > 0
        ) {
          projectDetails?.paymentClaims.forEach((element) => {
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
          projectDetails.paymentDetails &&
          projectDetails.paymentDetails.length > 0
        ) {
          projectDetails?.paymentDetails.forEach((element) => {
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
          updateProjectInput.project_status === 'Completed' &&
          ((projectDetails.contractDetails &&
            projectDetails.contractDetails.length !== completedCount) ||
            (projectDetails.paymentClaims &&
              projectDetails.paymentClaims.length !== claimCount) ||
            (projectDetails.paymentDetails &&
              projectDetails.paymentDetails.length !== payment))
        ) {
          throw `There are still contracts, payments/claims that are in process. Please ensure all are in a completed state before moving the project to the archive as completed.`;
        } else if (
          updateProjectInput.project_status === 'Deleted' &&
          ((projectDetails.contractDetails &&
            projectDetails.contractDetails.length !== completedCount) ||
            (projectDetails.paymentClaims &&
              projectDetails.paymentClaims.length !== claimCount) ||
            (projectDetails.paymentDetails &&
              projectDetails.paymentDetails.length !== payment))
        ) {
          throw `There are still contracts, payments/claims that are in process. Please ensure all are in a completed state before deleting the project.`;
        } else {
          projectDetails.project_description =
            updateProjectInput.project_description;
          if (contractCount <= 0) {
            projectDetails.site_address = updateProjectInput.site_address;
            projectDetails.country = updateProjectInput.country;
            projectDetails.region = updateProjectInput.region;
            projectDetails.place_id = updateProjectInput.place_id;
            projectDetails.latitude = updateProjectInput.latitude;
            projectDetails.longitude = updateProjectInput.longitude;
            projectDetails.pta_eligibility = updateProjectInput.pta_eligibility;
            projectDetails.rta_eligibility = updateProjectInput.rta_eligibility;
          }
          projectDetails.project_role = updateProjectInput.project_role;
          projectDetails.head_contract_sum =
            updateProjectInput.head_contract_sum;
          projectDetails.retention_type = updateProjectInput.retention_type;
          projectDetails.number_of_units = updateProjectInput.number_of_units;
          projectDetails.project_status = updateProjectInput.project_status;
          projectDetails.updated_by = decoded?.userId;
          projectDetails.updated_on = moment.tz('UTC');
          projectDetails.updated_group = 'USER';
          const result = await this.projectDetails.save(projectDetails);
          this.logger.log(`result: ${JSON.stringify(result)}`);
          if (result && Object.keys(result).length !== 0) {
            result.project_date = result.project_date
              ? new Date(result.project_date)
              : new Date(0);
          }
          if (result) {
            const companyDetails = await this.getCompanyDetailsById(
              projectDetails.company_id,
            );

            //Generating user link.
            const projectLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[4]}` +
              `${projectDetails.id}` +
              `?from=log`;
            this.logger.log(`projectLink: ${projectLink}`);

            let eventTemplateId;
            if (
              ['Draft', 'In Progress'].includes(
                updateProjectInput.project_status,
              )
            ) {
              eventTemplateId = 43;
            } else if (updateProjectInput.project_status === 'Completed') {
              eventTemplateId = 45;
            } else if (updateProjectInput.project_status === 'Deleted') {
              eventTemplateId = 44;
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
              company_id: projectDetails.company_id,
              dynamic_values: {
                projectName: projectDetails.project_name,
                projectLink,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );

            this.logger.log(
              `Compliance updates initiated for edited project : ${JSON.stringify(projectDetails.project_id)}`,
            );

            const compliance_pta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: projectDetails.project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              });

            const compliance_rta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: projectDetails.project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              });

            try {
              await this.complianceService.markComplianceDirty(
                projectDetails.project_id,
                'project.edit',
              );
            } catch (err) {
              this.logger.error(
                `markComplianceDirty failed for project ${projectDetails.project_id}: ${err?.message || err}`,
              );
            }
          }
          return result;
        }
      }
      throw `Unable to edit the project`;
    } catch (error) {
      error = error?.message ? error?.message : error;
      this.logger.log(
        `Edit Project details service failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async updateProjectStatusById(id, decoded, status) {
    try {
      this.logger.log(
        `Update status of project service initiated with id=${id}, status=${status}`,
      );
      const projectDetails = await this.projectDetails.findOne({
        where: { id },
      });
      if (projectDetails) {
        if (
          projectDetails.project_status === 'Draft' &&
          status === 'In Progress'
        ) {
          const getCount = await this.getProjectListsForCompany({
            company_id: projectDetails.company_id,
            project_status: 'In Progress',
            page_number: 1,
            page_size: 10,
          });
          this.logger.log(`getCount: ${JSON.stringify(getCount)}`);

          const subscriptionDetails =
            await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
              projectDetails.company_id,
            );
          const subscriptionItem =
            subscriptionDetails &&
            subscriptionDetails?.plan_items &&
            subscriptionDetails?.plan_items?.length > 0
              ? subscriptionDetails?.plan_items?.filter(
                  (item) => item?.item_name === 'Projects',
                )
              : [];

          if (
            !subscriptionDetails?.is_free_plan_eligible &&
            (!subscriptionItem ||
              (subscriptionItem &&
                subscriptionItem?.length > 0 &&
                !subscriptionItem[0]?.is_unlimited &&
                (Number(subscriptionItem[0]?.limit_value ?? 0) === 0 ||
                  (Number(subscriptionItem[0]?.limit_value ?? 0) > 0 &&
                    getCount &&
                    getCount?.total_count &&
                    getCount?.total_count >=
                      subscriptionItem[0]?.limit_value))))
          ) {
            return {
              warning: true,
              warningMessage: `Project cannot be made active. Please upgrade your subscription plan.`,
            };
          }
        }

        var completedCount = 0,
          claimCount = 0,
          payment = 0;
        if (
          projectDetails.contractDetails &&
          projectDetails.contractDetails.length > 0
        ) {
          projectDetails?.contractDetails.forEach((element) => {
            if (element.contract_status === 'Completed') {
              completedCount += 1;
            }
          });
        }
        if (
          projectDetails.paymentClaims &&
          projectDetails.paymentClaims.length > 0
        ) {
          projectDetails?.paymentClaims.forEach((element) => {
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
          projectDetails.paymentDetails &&
          projectDetails.paymentDetails.length > 0
        ) {
          projectDetails?.paymentDetails.forEach((element) => {
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
          status === 'Completed' &&
          ((projectDetails.contractDetails &&
            projectDetails.contractDetails.length !== completedCount) ||
            (projectDetails.paymentClaims &&
              projectDetails.paymentClaims.length !== claimCount) ||
            (projectDetails.paymentDetails &&
              projectDetails.paymentDetails.length !== payment))
        ) {
          throw `There are still contracts, payments/claims that are in process. Please ensure all are in a completed state before moving the project to the archive as completed.`;
        } else if (
          status === 'Deleted' &&
          ((projectDetails.contractDetails &&
            projectDetails.contractDetails.length !== completedCount) ||
            (projectDetails.paymentClaims &&
              projectDetails.paymentClaims.length !== claimCount) ||
            (projectDetails.paymentDetails &&
              projectDetails.paymentDetails.length !== payment))
        ) {
          throw `There are still contracts, payments/claims that are in process. Please ensure all are in a completed state before deleting the project.`;
        } else {
          projectDetails.project_status = status;
          projectDetails.updated_by = decoded?.userId;
          projectDetails.updated_on = moment.tz('UTC');
          projectDetails.updated_group = 'USER';
          const updateProjectStatusRes =
            await this.projectDetails.save(projectDetails);
          if (updateProjectStatusRes) {
            updateProjectStatusRes.project_date =
              updateProjectStatusRes.project_date
                ? new Date(updateProjectStatusRes.project_date)
                : new Date(0);
            const companyDetails = await this.getCompanyDetailsById(
              projectDetails.company_id,
            );

            //Generating user link.
            const projectLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[4]}` +
              `${projectDetails.id}` +
              `?from=log`;
            this.logger.log(`projectLink: ${projectLink}`);

            // console.log('decoded', decoded);
            let eventTemplateId;
            if (status === 'Completed') {
              eventTemplateId = 45;
            } else if (status === 'Deleted') {
              eventTemplateId = 44;
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
              company_id: projectDetails.company_id,
              dynamic_values: {
                projectName: projectDetails.project_name,
                projectLink,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );

            this.logger.log(
              `Compliance updates initiated for project status update: ${JSON.stringify(projectDetails.project_id)}`,
            );

            const compliance_pta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: projectDetails.project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              });

            const compliance_rta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: projectDetails.project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              });

            try {
              await this.complianceService.markComplianceDirty(
                projectDetails.project_id,
                'project.status-update',
              );
            } catch (err) {
              this.logger.error(
                `markComplianceDirty failed for project ${projectDetails.project_id}: ${err?.message || err}`,
              );
            }
          }
          return updateProjectStatusRes;
        }
      }
      throw `Unable to update the project, please try again`;
    } catch (error) {
      error = error?.message ? error?.message : error;
      this.logger.log(
        `Update Project status failed with message: ${JSON.stringify(error)}`,
      );
      throw new Error(error);
    }
  }

  async getProjectsLists(
    company_id: number,
    is_archived?: boolean,
    bank_account_id?: number,
  ) {
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    this.logger.log(`List Projects initiated with company-id=${company_id}`);
    // const whereConditions: any = {
    //   company_id,
    // };
    // if (is_archived) {
    //   whereConditions.project_status = In(excludedStatus);
    // } else {
    //   whereConditions.project_status = Not(In(excludedStatus));
    // }
    // const results = await this.projectDetails.find({
    //   where: whereConditions ? whereConditions : {},
    //   order: { project_name: 'ASC' },
    // });

    const queryBuilder = this.projectDetails
      .createQueryBuilder('p')
      .where('p.company_id = :company_id', { company_id })
      .andWhere(
        is_archived
          ? 'p.project_status IN (:...excludedStatus)'
          : 'p.project_status NOT IN (:...excludedStatus)',
        { excludedStatus },
      );
    if (bank_account_id) {
      queryBuilder.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('bank_accounts', 'ba')
          .where(
            "p.project_id = ANY(string_to_array(ba.project_ids, ',')::int[]) AND ba.bank_account_id = :bank_account_id",
            { bank_account_id },
          )
          .getQuery();
        return `EXISTS (${subQuery})`;
      });
    }

    const results = await queryBuilder
      .orderBy('p.project_name', 'ASC')
      .getMany();

    return results.map((result) => {
      return {
        id: result.id,
        project_id: result.project_id,
        project_name: result.project_name,
        project_role: result.project_role,
        project_status: result.project_status,
        pta_eligibility: result.pta_eligibility,
        rta_eligibility: result.rta_eligibility,
      };
    });
  }

  async getProjectsContractsLists(data: GetProjectContractListsInput) {
    const excludedStatus = ['Archived', 'Deleted', 'Completed'];

    const projectQueryBuilder = await this.projectDetails
      .createQueryBuilder('pd')
      .select([
        'pd.id AS id',
        'pd.project_id AS value',
        'pd.project_name AS label',
      ])
      .leftJoin(ContractDetails, 'cd', 'pd.project_id = cd.project_id')
      .where('pd.company_id = :company_id', {
        company_id: data.company_id,
      });

    const contractQueryBuilder = await this.contractDetails
      .createQueryBuilder('cd')
      .select([
        'cd.id AS id',
        'cd.contract_id AS value',
        'cd.contract_name AS label',
      ])
      .where('cd.company_id = :company_id', {
        company_id: data.company_id,
      });

    if (data.contract_id) {
      projectQueryBuilder.andWhere('cd.contract_id = :contract_id', {
        contract_id: data.contract_id,
      });

      contractQueryBuilder.andWhere('cd.contract_id = :contract_id', {
        contract_id: data.contract_id,
      });
    }

    if (data.project_id) {
      projectQueryBuilder.andWhere('pd.project_id = :project_id', {
        project_id: data.project_id,
      });

      contractQueryBuilder.andWhere('cd.project_id = :project_id', {
        project_id: data.project_id,
      });
    }

    if (data.is_archived) {
      projectQueryBuilder.andWhere(
        'pd.project_status IN (:...excludedStatus)',
        {
          excludedStatus: excludedStatus,
        },
      );

      contractQueryBuilder.andWhere(
        'cd.contract_status IN (:...excludedStatus)',
        {
          excludedStatus: excludedStatus,
        },
      );
    } else {
      projectQueryBuilder.andWhere(
        'pd.project_status NOT IN (:...excludedStatus)',
        {
          excludedStatus: excludedStatus,
        },
      );

      contractQueryBuilder.andWhere(
        'cd.contract_status NOT IN (:...excludedStatus)',
        {
          excludedStatus: excludedStatus,
        },
      );
    }

    const project_list = projectQueryBuilder
      .orderBy({ 'pd.project_name': 'ASC' })
      .getRawMany();

    const contract_list = contractQueryBuilder
      .orderBy({ 'cd.contract_name': 'ASC' })
      .getRawMany();

    return { project_list, contract_list };
  }

  async checkExistenceForProject(company_id: number, project_name?: string) {
    const projectDetails = await this.projectDetails
      .createQueryBuilder('project')
      .where('project.company_id = :company_id', { company_id })
      .andWhere('LOWER(TRIM(project.project_name)) = :project_name', {
        project_name: project_name?.trim()?.toLowerCase(),
      })
      .andWhere('project.project_status NOT IN (:...project_status)', {
        project_status: ['Archived', 'Deleted'],
      })
      .getMany();

    this.logger.log(`projectDetails: ${JSON.stringify(projectDetails)}`);
    return projectDetails;
  }

  async checkCompanyAuthorized(decoded: any, company_id: number) {
    return new Promise(async (resolve, reject) => {
      const user_id = decoded?.userId;
      if (user_id && company_id) {
        const queryBuilder = this.userDetails
          .createQueryBuilder('u')
          .select('u.id', 'id')
          .addSelect('u.user_id', 'user_id')
          .addSelect('r.company_id', 'company_id')
          .distinct(true)
          .leftJoin(CompanyUserRoles, 'r', 'u.user_id = r.user_id')
          .leftJoin(
            CompanyDetails,
            'c',
            `c.company_id = r.company_id ${!decoded?.logged_in_by || !decoded?.admin_id ? ' and c.is_admin_blocked = false' : ''}`,
          )
          .where('r.user_id = :user_id and r.company_id = :company_id', {
            user_id,
            company_id,
          });
        if (!decoded?.logged_in_by || !decoded?.admin_id) {
          queryBuilder.andWhere(`u.user_status = 'Active'`);
        }

        const result = await queryBuilder.getRawOne();
        if (result && result.id) {
          resolve(true);
        }
      }
      resolve(false);
    });
  }
}
