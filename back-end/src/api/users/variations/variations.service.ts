import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, Not, Repository } from 'typeorm';
import { CreateVariationInput } from './dto/create-variation.input';
import { UpdateVariationInput } from './dto/update-variation.input';
import { ContractDetails } from '../contract-details/response/contract-detail.response';
import { VariationDetails } from 'src/entities/variation-details.entity';
import {
  GetVariationListForProjectsInput,
  GetVariationListsInput,
} from './dto/get-variation-lists.input';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { formatCurrencyWithoutDollars } from 'src/libs/@currency-formattor/currency-formattor';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class VariationsService {
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(VariationDetails)
    private variationDetails: Repository<VariationDetails>,
  ) {}
  async insertVariationDetails(
    decoded,
    createVariationInput: CreateVariationInput,
  ) {
    createVariationInput.variation_name = await startCasePreserveUnicode(
      createVariationInput.variation_name,
    );
    createVariationInput.created_on = moment.tz('UTC');
    createVariationInput.created_by = decoded?.userId;
    createVariationInput.created_group = 'USER';
    const variationDetails =
      await this.variationDetails.create(createVariationInput);
    return await this.variationDetails.save(variationDetails);
  }

  async getCompanyDetailsById(company_id) {
    return await this.companyDetails.findOne({ where: { company_id } });
  }

  async getVariationListsForCompany(
    getVariationListsInput: GetVariationListsInput,
    timezone,
  ) {
    const excludedStatus = ['Archived', 'Deleted'];

    const queryBuilder = this.variationDetails
      .createQueryBuilder('variation')
      .select('variation.id', 'id')
      .addSelect('variation.variation_id', 'variation_id')
      .addSelect('variation.company_id', 'company_id')
      .addSelect('variation.variation_name', 'variation_name')
      .addSelect('variation.variation_status', 'variation_status')
      .addSelect('variation.created_on', 'created_on')
      .addSelect('variation.project_id', 'project_id')
      .addSelect('variation.contract_id', 'contract_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('variation.variation_amount', 'variation_amount')
      .addSelect('variation.attachment_id', 'attachment_id')
      .addSelect('file.file_name', 'file_name')
      .addSelect('file.file_type', 'file_type')
      .addSelect('file.file_path', 'file_path')
      .distinct(true)
      .innerJoin('variation.projectDetails', 'project')
      .innerJoin('variation.contractDetails', 'contract')
      .leftJoin('variation.fileAttachments', 'file');

    queryBuilder.where(`variation.company_id = :companyId`, {
      companyId: getVariationListsInput.company_id,
    });

    if (getVariationListsInput.variation_status) {
      if (getVariationListsInput.variation_status === 'Archived') {
        queryBuilder.andWhere(
          '(variation.variation_status IN(:...excludedStatus) OR variation.is_archived = true)',
          {
            excludedStatus: excludedStatus,
          },
        );
      } else {
        queryBuilder.andWhere(
          'variation.variation_status = :variation_status',
          {
            variation_status: getVariationListsInput.variation_status,
          },
        );
      }
    } else {
      queryBuilder.andWhere(
        'variation.variation_status NOT IN(:...excludedStatus) AND variation.is_archived = false',
        { excludedStatus: excludedStatus },
      );
    }

    if (getVariationListsInput.project_id) {
      queryBuilder.andWhere('variation.project_id = :project_id', {
        project_id: getVariationListsInput.project_id,
      });
    }

    if (getVariationListsInput.contract_id) {
      queryBuilder.andWhere('variation.contract_id = :contract_id', {
        contract_id: getVariationListsInput.contract_id,
      });
    }

    if (getVariationListsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(variation.variation_name) LIKE LOWER(:keyword))`,
        { keyword: `%${getVariationListsInput.search.toLowerCase()}%` },
      );
    }

    if (getVariationListsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getVariationListsInput.date_filter === 'Custom' &&
        getVariationListsInput.start_date &&
        getVariationListsInput.end_date
      ) {
        startDate = moment
          .tz(getVariationListsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getVariationListsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (getVariationListsInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (getVariationListsInput.date_filter === 'Last Month') {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere(
        'variation.created_on BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getVariationListsInput.sorting_order
      ? getVariationListsInput.sorting_order
      : 'DESC';
    if (!getVariationListsInput.sorting_field) {
      queryBuilder.orderBy({ 'variation.created_on': sorting_order });
      if (
        getVariationListsInput.page_number &&
        getVariationListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getVariationListsInput.page_number - 1) *
              getVariationListsInput.page_size,
          )
          .limit(getVariationListsInput.page_size);
      }
    }
    if (
      getVariationListsInput.sorting_field &&
      getVariationListsInput.sorting_field !== 'project_name' &&
      getVariationListsInput.sorting_field !== 'contract_name'
    ) {
      switch (getVariationListsInput.sorting_field) {
        case 'created_on':
          {
            queryBuilder.orderBy({ 'variation.created_on': sorting_order });
          }
          break;
        case 'variation_id':
          {
            queryBuilder.orderBy({ 'variation.variation_id': sorting_order });
          }
          break;
        case 'variation_amount':
          {
            queryBuilder.orderBy({
              'variation.variation_amount': sorting_order,
            });
          }
          break;
        case 'variation_status':
          {
            queryBuilder.orderBy({
              'variation.variation_status': sorting_order,
            });
          }
          break;
      }
      if (
        getVariationListsInput.page_number &&
        getVariationListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getVariationListsInput.page_number - 1) *
              getVariationListsInput.page_size,
          )
          .limit(getVariationListsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;

    if (
      getVariationListsInput.sorting_field &&
      getVariationListsInput.sorting_field === 'project_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.project_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.project_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.project_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.project_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getVariationListsInput.page_number && getVariationListsInput.page_size
          ? (getVariationListsInput.page_number - 1) *
            getVariationListsInput.page_size
          : 0;
      const endIndex =
        getVariationListsInput.page_number && getVariationListsInput.page_size
          ? Math.min(
              (getVariationListsInput.page_number - 1) *
                getVariationListsInput.page_size +
                getVariationListsInput.page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getVariationListsInput.sorting_field &&
      getVariationListsInput.sorting_field === 'contract_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.contract_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.contract_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.contract_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.contract_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getVariationListsInput.page_number && getVariationListsInput.page_size
          ? (getVariationListsInput.page_number - 1) *
            getVariationListsInput.page_size
          : 0;
      const endIndex =
        getVariationListsInput.page_number && getVariationListsInput.page_size
          ? Math.min(
              (getVariationListsInput.page_number - 1) *
                getVariationListsInput.page_size +
                getVariationListsInput.page_size,
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

    for (const result of finalResult) {
      result.formatted_variation_amount = await formatCurrencyWithoutDollars(
        result.variation_amount,
      );
      if (result.file_path) {
        const cleanPath = result.file_path.replace(/\\/g, '/');
        result.file_path = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      }
    }

    return { total_count: finalCount, variation_list: finalResult };
  }

  async viewVariationDetailsById(id: string) {
    const whereConditions: any = { id };

    const result = await this.variationDetails.findOne({
      where: whereConditions ? whereConditions : {},
      relations: ['projectDetails', 'contractDetails', 'fileAttachments'],
    });

    return {
      id: result.id,
      variation_id: result.variation_id,
      company_id: result.company_id,
      variation_name: result.variation_name,
      variation_status: result.variation_status,
      is_archived: result.is_archived,
      created_on: result.created_on,
      project_id: result.project_id,
      contract_id: result.contract_id,
      project_name: result?.projectDetails?.project_name,
      contract_name: result?.contractDetails?.contract_name,
      attachment_id: result.attachment_id,
      variation_amount: result.variation_amount,
      file_name:
        result?.fileAttachments?.custom_file_name ??
        result?.fileAttachments?.file_name,
      file_type: result?.fileAttachments?.file_type,
      file_path: result?.fileAttachments?.file_path,
    };
  }

  async getVariationDetailsById(variation_id: number) {
    const whereConditions: any = { variation_id };

    const result = await this.variationDetails.findOne({
      where: whereConditions ? whereConditions : {},
    });

    return {
      id: result.id,
      variation_id: result.variation_id,
      company_id: result.company_id,
      variation_name: result.variation_name,
      variation_status: result.variation_status,
      project_id: result.project_id,
      contract_id: result.contract_id,
      attachment_id: result.attachment_id,
      variation_amount: result.variation_amount,
    };
  }

  async getVariationsDetailsById(id: string) {
    return await this.variationDetails.findOne({
      where: { id },
      relations: ['companyDetails'],
    });
  }

  async editVariationDetailsById(
    updateVariationInput: UpdateVariationInput,
    userId,
  ) {
    updateVariationInput.variation_name = await startCasePreserveUnicode(
      updateVariationInput.variation_name,
    );
    updateVariationInput.is_archived =
      updateVariationInput.variation_status === 'Deleted' ? true : false;
    updateVariationInput.updated_by = userId;
    updateVariationInput.updated_on = moment.tz('UTC');
    updateVariationInput.updated_group = 'USER';
    return await this.variationDetails.save(updateVariationInput);
  }

  async updateVariationStatusById(variationDetails, userId, status) {
    variationDetails.is_archived = status === 'Deleted' ? true : false;
    variationDetails.variation_status = status;
    variationDetails.updated_by = userId;
    variationDetails.updated_on = moment.tz('UTC');
    variationDetails.updated_group = 'USER';
    return await this.variationDetails.save(variationDetails);
  }

  async getVariationDetailsByProjectId(
    getVariationListForProjectsInput: GetVariationListForProjectsInput,
    timezone,
  ) {
    const queryBuilder = this.variationDetails
      .createQueryBuilder('variation')
      .select('variation.id', 'id')
      .addSelect('variation.variation_id', 'variation_id')
      .addSelect('variation.company_id', 'company_id')
      .addSelect('variation.variation_name', 'variation_name')
      .addSelect('variation.variation_status', 'variation_status')
      .addSelect('variation.created_on', 'created_on')
      .addSelect('variation.project_id', 'project_id')
      .addSelect('variation.contract_id', 'contract_id')
      .addSelect('project.project_name', 'project_name')
      .addSelect('contract.contract_name', 'contract_name')
      .addSelect('variation.attachment_id', 'attachment_id')
      .addSelect('variation.variation_amount', 'variation_amount')
      .distinct(true)
      .innerJoin('variation.projectDetails', 'project')
      .innerJoin('variation.contractDetails', 'contract')
      .where(`variation.company_id = :companyId`, {
        companyId: getVariationListForProjectsInput.company_id,
      })
      .andWhere('variation.variation_status = :variation_status', {
        variation_status: 'Agreed',
      })
      .andWhere('variation.project_id = :project_id', {
        project_id: getVariationListForProjectsInput.project_id,
      });

    if (getVariationListForProjectsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(variation.variation_name) LIKE LOWER(:keyword))`,
        {
          keyword: `%${getVariationListForProjectsInput.search.toLowerCase()}%`,
        },
      );
    }

    if (getVariationListForProjectsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getVariationListForProjectsInput.date_filter === 'Custom' &&
        getVariationListForProjectsInput.start_date &&
        getVariationListForProjectsInput.end_date
      ) {
        startDate = moment
          .tz(getVariationListForProjectsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getVariationListForProjectsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (
        getVariationListForProjectsInput.date_filter === 'This Month'
      ) {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (
        getVariationListForProjectsInput.date_filter === 'Last Month'
      ) {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere(
        'variation.created_on BETWEEN :start_date AND :end_date',
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = getVariationListForProjectsInput.sorting_order
      ? getVariationListForProjectsInput.sorting_order
      : 'DESC';
    if (!getVariationListForProjectsInput.sorting_field) {
      queryBuilder.orderBy({ 'variation.created_on': sorting_order });
      if (
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getVariationListForProjectsInput.page_number - 1) *
              getVariationListForProjectsInput.page_size,
          )
          .limit(getVariationListForProjectsInput.page_size);
      }
    }
    if (
      getVariationListForProjectsInput.sorting_field &&
      getVariationListForProjectsInput.sorting_field !== 'project_name' &&
      getVariationListForProjectsInput.sorting_field !== 'contract_name'
    ) {
      switch (getVariationListForProjectsInput.sorting_field) {
        case 'created_on':
          {
            queryBuilder.orderBy({ 'variation.created_on': sorting_order });
          }
          break;
        case 'variation_id':
          {
            queryBuilder.orderBy({ 'variation.variation_id': sorting_order });
          }
          break;
        case 'variation_amount':
          {
            queryBuilder.orderBy({
              'variation.variation_amount': sorting_order,
            });
          }
          break;
        case 'variation_status':
          {
            queryBuilder.orderBy({
              'variation.variation_status': sorting_order,
            });
          }
          break;
      }
      if (
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getVariationListForProjectsInput.page_number - 1) *
              getVariationListForProjectsInput.page_size,
          )
          .limit(getVariationListForProjectsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;

    if (
      getVariationListForProjectsInput.sorting_field &&
      getVariationListForProjectsInput.sorting_field === 'project_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.project_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.project_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.project_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.project_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
          ? (getVariationListForProjectsInput.page_number - 1) *
            getVariationListForProjectsInput.page_size
          : 0;
      const endIndex =
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
          ? Math.min(
              (getVariationListForProjectsInput.page_number - 1) *
                getVariationListForProjectsInput.page_size +
                getVariationListForProjectsInput.page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getVariationListForProjectsInput.sorting_field &&
      getVariationListForProjectsInput.sorting_field === 'contract_name'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          a.contract_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(b.contract_name?.toLowerCase()?.trim()),
        );
      } else {
        sortedResult = Array.from(rawResults).sort((a, b) =>
          b.contract_name
            ?.toLowerCase()
            ?.trim()
            ?.localeCompare(a.contract_name?.toLowerCase()?.trim()),
        );
      }

      const startIndex =
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
          ? (getVariationListForProjectsInput.page_number - 1) *
            getVariationListForProjectsInput.page_size
          : 0;
      const endIndex =
        getVariationListForProjectsInput.page_number &&
        getVariationListForProjectsInput.page_size
          ? Math.min(
              (getVariationListForProjectsInput.page_number - 1) *
                getVariationListForProjectsInput.page_size +
                getVariationListForProjectsInput.page_size,
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

    for (const result of finalResult) {
      result.formatted_variation_amount = await formatCurrencyWithoutDollars(
        result.variation_amount,
      );
    }

    return { total_count: finalCount, variation_list: finalResult };
  }
}
