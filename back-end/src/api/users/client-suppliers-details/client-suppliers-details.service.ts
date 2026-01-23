import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import {
  CreateAccountDetailInput,
  CreateClientSuppliersDetailInput,
} from './dto/create-client-suppliers-detail.input';
import { UpdateClientSuppliersDetailInput } from './dto/update-client-suppliers-detail.input';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import {
  GetClientSuppliersListForProjectsInput,
  GetClientSuppliersListsInput,
} from './dto/get-client-suppliers-lists.input';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  FetchClientSupplierDetailsForPaymentClaimInput,
  GetContractsListInput,
  GetProjectsListInput,
} from './dto/client-supplier-details.input';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { formatCurrencyWithoutDollars } from 'src/libs/@currency-formattor/currency-formattor';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { handleError } from 'src/api/common/error-handler';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class ClientSuppliersDetailsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersDetails: Repository<ClientSuppliersDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(VariationDetails)
    private variationDetails: Repository<VariationDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentClaimInvoices)
    private paymentClaimInvoicesRepo: Repository<PaymentClaimInvoices>,
    @InjectRepository(PaymentDetails)
    private paymentsRepo: Repository<PaymentDetails>,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('CLIENT_SUPPLIERS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getCompanyDetailsById(company_id) {
    return await this.companyDetails.findOne({ where: { company_id } });
  }

  async insertClientSupplierDetails(
    decoded,
    createClientSuppliersDetailInput: CreateClientSuppliersDetailInput,
  ) {
    try {
      this.logger.log(
        `Add client-supplier details service initiated with payload: ${JSON.stringify(createClientSuppliersDetailInput)}`,
      );
      const checkExistence = await this.checkExistenceForClient(
        createClientSuppliersDetailInput.company_id,
        createClientSuppliersDetailInput.client_supplier_type,
        createClientSuppliersDetailInput.client_supplier_name,
      );
      if (!checkExistence || checkExistence?.length == 0) {
        if (
          createClientSuppliersDetailInput.client_supplier_type === 'Client' &&
          createClientSuppliersDetailInput.account_details.length > 1
        ) {
          throw `Only one account can be added per client.`;
        } else if (
          createClientSuppliersDetailInput.client_supplier_type ===
            'Supplier' &&
          createClientSuppliersDetailInput.account_details.length > 10
        ) {
          throw `You can only have up to 10 accounts per supplier. To add a new one, please delete an existing account.`;
        }

        createClientSuppliersDetailInput.client_supplier_name =
          await startCasePreserveUnicode(
            createClientSuppliersDetailInput.client_supplier_name,
          );
        createClientSuppliersDetailInput.business_name =
          await startCasePreserveUnicode(
            createClientSuppliersDetailInput.business_name,
          );
        createClientSuppliersDetailInput.created_on = moment.tz('UTC');
        createClientSuppliersDetailInput.created_by = decoded?.userId;
        createClientSuppliersDetailInput.created_group = 'USER';

        const clientSuppliersDetails = await this.clientSuppliersDetails.create(
          createClientSuppliersDetailInput,
        );
        const response = await this.clientSuppliersDetails.save(
          clientSuppliersDetails,
        );
        if (response) {
          response.client_supplier_id =
            1000000000 + Number(response.client_supplier_id);

          //Generating client supplier link.
          const clientSupplierLink =
            `${process.env.LOG_BASE_URL}` +
            `${linkExtensions[5]}` +
            response.id +
            `?tab=current` +
            `&from=log`;
          this.logger.log(`clientSupplierLink: ${clientSupplierLink}`);

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id:
              createClientSuppliersDetailInput.client_supplier_type === 'Client'
                ? 46
                : 50,
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
            company_id: createClientSuppliersDetailInput.company_id,
            dynamic_values: {
              clientSupplierName: await startCasePreserveUnicode(
                createClientSuppliersDetailInput.client_supplier_name,
              ),
              clientSupplierLink,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          if (
            createClientSuppliersDetailInput.account_details &&
            createClientSuppliersDetailInput.account_details.length > 0
          ) {
            createClientSuppliersDetailInput.account_details.forEach(
              (element) => {
                element.company_id =
                  createClientSuppliersDetailInput.company_id;
                element.status = 'Open';
                element.client_supplier_id = response.client_supplier_id;
                element.added_by_client_supplier = true;
                element.created_on = moment.tz('UTC');
                element.created_by = decoded?.userId;
                element.created_group = 'USER';
              },
            );
            createClientSuppliersDetailInput.account_details =
              await this.accountToBeInserted(
                createClientSuppliersDetailInput.account_details,
                [],
              );
            if (
              createClientSuppliersDetailInput.account_details &&
              createClientSuppliersDetailInput.account_details[0] !== null &&
              createClientSuppliersDetailInput.account_details.length > 0
            ) {
              const accountDetails = await this.insertAccountDetails(
                createClientSuppliersDetailInput.account_details,
              );

              const createActivityLogInput: CreateActivityLogInput = {
                event_template_id: 54,
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
                company_id: createClientSuppliersDetailInput.company_id,
                dynamic_values: {
                  clientSupplierName: await startCasePreserveUnicode(
                    createClientSuppliersDetailInput.client_supplier_name,
                  ),
                  clientSupplierLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
          }
        }
        this.logger.log(`response: ${JSON.stringify(response)}`);
        return response;
      }
      throw `Name already exist`;
    } catch (error) {
      error = error?.message ? error?.message : error;
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      this.logger.log(
        `Add client-supplier details errored out with message: ${JSON.stringify(errMsg)}`,
      );
      throw new Error(errMsg);
    }
  }

  async getClientSupplierListsForCompany(
    getClientSuppliersListsInput: GetClientSuppliersListsInput,
    timezone,
  ) {
    const company_id = getClientSuppliersListsInput.company_id;

    this.logger.log(
      `List of client suppliers of a company call initiated with payload: ${JSON.stringify(getClientSuppliersListsInput)}`,
    );

    const contractSubQuery = await this.contractDetails
      .createQueryBuilder('c')
      .select('c.client_supplier_id', 'client_supplier_id')
      .addSelect('COUNT(c.client_supplier_id)::numeric', 'contract_count')
      .where("c.contract_status IN('In Progress', 'Completed')")
      .andWhere(`c.company_id = :companyId`, {
        companyId: company_id,
      })
      .groupBy('c.client_supplier_id')
      .having('COUNT(c.client_supplier_id) > 0');

    const claimSubQuery = await this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .select('pc.client_supplier_id', 'client_supplier_id')
      .addSelect('COUNT(pc.client_supplier_id)::numeric', 'claim_count')
      .where("pc.status NOT IN('Draft', 'Deleted')")
      .andWhere(`pc.company_id = :companyId`, {
        companyId: company_id,
      })
      .groupBy('pc.client_supplier_id')
      .having('COUNT(pc.client_supplier_id) > 0');

    const queryBuilder = await this.clientSuppliersDetails
      .createQueryBuilder('cs')
      .select('cs.id', 'id')
      .addSelect('cs.client_supplier_id', 'client_supplier_id')
      .addSelect('cs.company_id', 'company_id')
      .addSelect('cs.client_supplier_name', 'client_supplier_name')
      .addSelect('cs.business_name', 'business_name')
      .addSelect('cs.client_supplier_type', 'client_supplier_type')
      .addSelect('cs.client_supplier_status', 'client_supplier_status')
      .addSelect('cs.related_entity', 'related_entity')
      .addSelect('cs.country', 'country')
      .addSelect('cs.region', 'region')
      .addSelect('cs.place_id', 'place_id')
      .addSelect('cs.latitude', 'latitude')
      .addSelect('cs.longitude', 'longitude')
      .addSelect('cs.entity_type', 'entity_type')
      .addSelect('cs.client_supplier_address', 'client_supplier_address')
      .addSelect('cs.client_phone_no', 'client_phone_no')
      .addSelect('cs.client_email_id', 'client_email_id')
      .addSelect('cs.client_website', 'client_website')
      .addSelect('cs.qbcc_number', 'qbcc_number')
      .addSelect('cs.acn_number', 'acn_number')
      .addSelect('cs.abn_number', 'abn_number')
      .addSelect('cs.tfn_number', 'tfn_number')
      .addSelect('cs.payment_terms', 'payment_terms')
      .addSelect('cs.created_by', 'created_by')
      .addSelect('cs.created_on', 'created_on')
      .addSelect('contract.contract_count', 'contract_count')
      .addSelect('claims.claim_count', 'claim_count')
      .leftJoin(
        '(' + contractSubQuery.getQuery() + ')',
        'contract',
        'contract.client_supplier_id = cs.client_supplier_id',
      )
      .leftJoin(
        '(' + claimSubQuery.getQuery() + ')',
        'claims',
        'claims.client_supplier_id = cs.client_supplier_id',
      )
      .where(`cs.company_id = :companyId`, {
        companyId: company_id,
      });

    if (getClientSuppliersListsInput.list_type === 'Archived') {
      queryBuilder.andWhere('cs.is_deleted = true');
    } else {
      queryBuilder.andWhere('cs.is_deleted = false');
    }

    if (getClientSuppliersListsInput.client_supplier_type) {
      queryBuilder.andWhere('cs.client_supplier_type = :client_supplier_type', {
        client_supplier_type: getClientSuppliersListsInput.client_supplier_type,
      });
    }

    if (getClientSuppliersListsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(cs.client_supplier_name) LIKE LOWER(:keyword))`,
        { keyword: `%${getClientSuppliersListsInput.search.toLowerCase()}%` },
      );
    }

    if (getClientSuppliersListsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getClientSuppliersListsInput.date_filter === 'Custom' &&
        getClientSuppliersListsInput.start_date &&
        getClientSuppliersListsInput.end_date
      ) {
        startDate = moment
          .tz(getClientSuppliersListsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getClientSuppliersListsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (getClientSuppliersListsInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (getClientSuppliersListsInput.date_filter === 'Last Month') {
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
      queryBuilder.andWhere('cs.created_on BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    const sorting_order = getClientSuppliersListsInput.sorting_order
      ? getClientSuppliersListsInput.sorting_order
      : 'DESC';
    if (!getClientSuppliersListsInput.sorting_field) {
      queryBuilder.orderBy({ 'cs.created_on': sorting_order });
      if (
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getClientSuppliersListsInput.page_number - 1) *
              getClientSuppliersListsInput.page_size,
          )
          .limit(getClientSuppliersListsInput.page_size);
      }
    }
    if (
      getClientSuppliersListsInput.sorting_field &&
      getClientSuppliersListsInput.sorting_field !== 'contract_count' &&
      getClientSuppliersListsInput.sorting_field !== 'claim_count'
    ) {
      switch (getClientSuppliersListsInput.sorting_field) {
        case 'client_supplier_name':
          {
            queryBuilder.orderBy({
              'LOWER(cs.client_supplier_name)': sorting_order,
            });
          }
          break;
        case 'business_name':
          {
            queryBuilder.orderBy({ 'LOWER(cs.business_name)': sorting_order });
          }
          break;
        case 'client_supplier_type':
          {
            queryBuilder.orderBy({ 'cs.client_supplier_type': sorting_order });
          }
          break;
        case 'client_supplier_address':
          {
            queryBuilder.orderBy({
              'LOWER(cs.client_supplier_address)': sorting_order,
            });
          }
          break;
        case 'client_supplier_status':
          {
            queryBuilder.orderBy({
              'cs.client_supplier_status': sorting_order,
            });
          }
          break;
      }
      if (
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getClientSuppliersListsInput.page_number - 1) *
              getClientSuppliersListsInput.page_size,
          )
          .limit(getClientSuppliersListsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;
    if (
      getClientSuppliersListsInput.sorting_field &&
      getClientSuppliersListsInput.sorting_field === 'contract_count'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.contract_count - b.contract_count,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.contract_count - a.contract_count,
        );
      }

      const startIndex =
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
          ? (getClientSuppliersListsInput.page_number - 1) *
            getClientSuppliersListsInput.page_size
          : 0;
      const endIndex =
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
          ? Math.min(
              (getClientSuppliersListsInput.page_number - 1) *
                getClientSuppliersListsInput.page_size +
                getClientSuppliersListsInput.page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getClientSuppliersListsInput.sorting_field &&
      getClientSuppliersListsInput.sorting_field === 'claim_count'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.claim_count - b.claim_count,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.claim_count - a.claim_count,
        );
      }

      const startIndex =
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
          ? (getClientSuppliersListsInput.page_number - 1) *
            getClientSuppliersListsInput.page_size
          : 0;
      const endIndex =
        getClientSuppliersListsInput.page_number &&
        getClientSuppliersListsInput.page_size
          ? Math.min(
              (getClientSuppliersListsInput.page_number - 1) *
                getClientSuppliersListsInput.page_size +
                getClientSuppliersListsInput.page_size,
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

    return { total_count: finalCount, client_suppliers_list: finalResult };
  }

  async viewClientSuppliersDetails(id: string) {
    const whereConditions: any = { id };

    this.logger.log(
      `View client-supplier details service initiated with id: ${JSON.stringify(id)}`,
    );

    const result = await this.clientSuppliersDetails.findOne({
      where: whereConditions,
      relations: ['accountDetails'],
    });

    result.created_on = result.created_on
      ? new Date(result.created_on)
      : new Date(0);

    return {
      id: result.id,
      client_supplier_id: result.client_supplier_id,
      company_id: result.company_id,
      client_supplier_name: result.client_supplier_name,
      business_name: result.business_name,
      client_supplier_type: result.client_supplier_type,
      client_supplier_status: result.client_supplier_status,
      related_entity: result.related_entity,
      country: result.country,
      region: result.region,
      place_id: result.place_id,
      latitude: result.latitude,
      longitude: result.longitude,
      entity_type: result.entity_type,
      client_supplier_address: result.client_supplier_address,
      client_phone_no: result.client_phone_no,
      client_email_id: result.client_email_id,
      client_website: result.client_website,
      qbcc_number: result.qbcc_number,
      acn_number: result.acn_number,
      abn_number: result.abn_number,
      tfn_number: result.tfn_number,
      payment_terms: result.payment_terms,
      account_details: result?.accountDetails
        .filter((element) => element.added_by_client_supplier)
        .map((element) => {
          return {
            id: element?.id,
            bank_account_id: element?.bank_account_id,
            client_supplier_id: element?.client_supplier_id,
            account_number: element?.account_number,
            account_name: element?.account_name,
            account_type: element?.account_type,
            bsb_number: element?.bsb_number,
          };
        }),
      created_by: result.created_by,
      created_on: result.created_on,
      // contract_id: result?.contractDetails?.contract_id,
      // contract_name: result?.contractDetails?.contract_name,
    };
  }

  async getClientSuppliersDetailsById(id: string) {
    return await this.clientSuppliersDetails.findOne({
      where: { id },
      relations: [
        'accountDetails',
        'contractDetails',
        'paymentClaims',
        'paymentDetails',
      ],
    });
  }

  async editClientSuppliersDetailsById(
    updateClientSuppliersDetailInput: UpdateClientSuppliersDetailInput,
    decoded,
  ) {
    try {
      this.logger.log(
        `Update client-supplier details service initiated with payload: ${JSON.stringify(updateClientSuppliersDetailInput)}`,
      );
      if (
        updateClientSuppliersDetailInput.client_supplier_type === 'Client' &&
        updateClientSuppliersDetailInput.account_details.length > 1
      ) {
        throw `Only one account can be added per client.`;
      } else if (
        updateClientSuppliersDetailInput.client_supplier_type === 'Supplier' &&
        updateClientSuppliersDetailInput.account_details.length > 10
      ) {
        throw `You can only have up to 10 accounts per supplier. To add a new one, please delete an existing account.`;
      }
      const clientSuppliersDetails = await this.getClientSuppliersDetailsById(
        updateClientSuppliersDetailInput.id,
      );
      if (clientSuppliersDetails) {
        var completedCount = 0,
          claimCount = 0,
          payment = 0;
        if (
          clientSuppliersDetails.contractDetails &&
          clientSuppliersDetails.contractDetails.length > 0
        ) {
          clientSuppliersDetails.contractDetails.forEach((element) => {
            if (element.contract_status !== 'Deleted') {
              completedCount += 1;
            }
          });
        }
        if (
          clientSuppliersDetails.paymentClaims &&
          clientSuppliersDetails.paymentClaims.length > 0
        ) {
          clientSuppliersDetails?.paymentClaims.forEach((element) => {
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
          clientSuppliersDetails.paymentDetails &&
          clientSuppliersDetails.paymentDetails.length > 0
        ) {
          clientSuppliersDetails?.paymentDetails.forEach((element) => {
            if (
              element.current_status === 'Paid - Matched' ||
              element.current_status === 'Received - Matched' ||
              element.current_status === 'No Match Required'
            ) {
              payment += 1;
            }
          });
        }
        let restrictEdit = false;
        if (
          updateClientSuppliersDetailInput.removed_account_ids &&
          updateClientSuppliersDetailInput.removed_account_ids[0] !== null &&
          updateClientSuppliersDetailInput.removed_account_ids.length > 0
        ) {
          const removedDetails = await this.getBankAccounts(
            updateClientSuppliersDetailInput.removed_account_ids,
          );
          if (
            removedDetails &&
            removedDetails?.contract_count &&
            removedDetails?.payment_count
          ) {
            restrictEdit =
              Number(removedDetails?.contract_count) > 0 ||
              Number(removedDetails?.payment_count) > 0;
          }
        }
        if (
          updateClientSuppliersDetailInput.client_supplier_status ===
            'Completed' &&
          (completedCount > 0 || claimCount > 0) &&
          restrictEdit
        ) {
          throw `This contact is linked to one or more contracts, claims or payments and cannot be updated.`;
        } else {
          updateClientSuppliersDetailInput.client_supplier_name =
            await startCasePreserveUnicode(
              updateClientSuppliersDetailInput.client_supplier_name,
            );
          updateClientSuppliersDetailInput.business_name =
            await startCasePreserveUnicode(
              updateClientSuppliersDetailInput.business_name,
            );
          updateClientSuppliersDetailInput.updated_by = decoded?.userId;
          updateClientSuppliersDetailInput.updated_on = moment.tz('UTC');
          updateClientSuppliersDetailInput.updated_group = 'USER';

          const response = await this.clientSuppliersDetails.save(
            updateClientSuppliersDetailInput,
          );
          if (response) {
            if (
              updateClientSuppliersDetailInput.account_details &&
              updateClientSuppliersDetailInput.account_details.length > 0
            ) {
              updateClientSuppliersDetailInput.account_details.forEach(
                (element) => {
                  element.company_id =
                    updateClientSuppliersDetailInput.company_id;
                  element.status = 'Open';
                  element.added_by_client_supplier = true;
                  element.updated_on = moment.tz('UTC');
                  element.updated_by = decoded?.userId;
                  element.updated_group = 'USER';
                },
              );
              const account_details_to_be_added: CreateAccountDetailInput[] =
                await this.accountToBeInserted(
                  updateClientSuppliersDetailInput.account_details,
                  clientSuppliersDetails.accountDetails,
                );
              if (
                account_details_to_be_added &&
                account_details_to_be_added[0] !== null &&
                account_details_to_be_added.length > 0
              ) {
                const accountDetails = await this.insertAccountDetails(
                  account_details_to_be_added,
                );
                this.logger.log(
                  `Response recieved while inserting accountDetails: ${JSON.stringify(accountDetails)}`,
                );
              }
            }
            if (
              updateClientSuppliersDetailInput.removed_account_ids &&
              updateClientSuppliersDetailInput.removed_account_ids[0] !==
                null &&
              updateClientSuppliersDetailInput.removed_account_ids.length > 0
            ) {
              const deletedAccountDetails = await this.deleteAccountDetails(
                updateClientSuppliersDetailInput.removed_account_ids,
              );
              this.logger.log(
                `Response recieved after deleting accountDetails: ${JSON.stringify(deletedAccountDetails)}`,
              );
            }

            //Generating client supplier link.
            const clientSupplierLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[5]}` +
              response.id +
              `?tab=current` +
              `&from=log`;
            this.logger.log(`clientSupplierLink: ${clientSupplierLink}`);

            let eventTemplateId;
            if (
              clientSuppliersDetails.client_supplier_status !==
                updateClientSuppliersDetailInput.client_supplier_status &&
              updateClientSuppliersDetailInput.client_supplier_status ===
                'Completed'
            ) {
              eventTemplateId = 56;
            } else if (
              updateClientSuppliersDetailInput.client_supplier_type ===
                'Client' &&
              (updateClientSuppliersDetailInput.client_supplier_status ===
                'Draft' ||
                (clientSuppliersDetails.client_supplier_status ===
                  updateClientSuppliersDetailInput.client_supplier_status &&
                  updateClientSuppliersDetailInput.client_supplier_status ===
                    'Completed'))
            ) {
              eventTemplateId = 47;
            } else if (
              updateClientSuppliersDetailInput.client_supplier_type ===
                'Supplier' &&
              (updateClientSuppliersDetailInput.client_supplier_status ===
                'Draft' ||
                (clientSuppliersDetails.client_supplier_status ===
                  updateClientSuppliersDetailInput.client_supplier_status &&
                  updateClientSuppliersDetailInput.client_supplier_status ===
                    'Completed'))
            ) {
              eventTemplateId = 51;
            }
            if (eventTemplateId) {
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
                company_id: updateClientSuppliersDetailInput.company_id,
                dynamic_values: {
                  clientSupplierName: await startCasePreserveUnicode(
                    updateClientSuppliersDetailInput.client_supplier_name,
                  ),
                  clientSupplierLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput,
              );
            }
            const oldAccountsCount = clientSuppliersDetails.accountDetails
              ? clientSuppliersDetails.accountDetails.length
              : 0;
            const newAccountsCount =
              updateClientSuppliersDetailInput.account_details
                ? updateClientSuppliersDetailInput.account_details.length
                : 0;
            const removedAccountsCount =
              updateClientSuppliersDetailInput.removed_account_ids
                ? updateClientSuppliersDetailInput.removed_account_ids.length
                : 0;
            if (newAccountsCount > oldAccountsCount - removedAccountsCount) {
              const createActivityLogInput1: CreateActivityLogInput = {
                event_template_id: 54,
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
                company_id: updateClientSuppliersDetailInput.company_id,
                dynamic_values: {
                  clientSupplierName: await startCasePreserveUnicode(
                    updateClientSuppliersDetailInput.client_supplier_name,
                  ),
                  clientSupplierLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput1,
              );
            }
            if (removedAccountsCount > 0) {
              const createActivityLogInput2: CreateActivityLogInput = {
                event_template_id: 55,
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
                company_id: updateClientSuppliersDetailInput.company_id,
                dynamic_values: {
                  clientSupplierName: await startCasePreserveUnicode(
                    updateClientSuppliersDetailInput.client_supplier_name,
                  ),
                  clientSupplierLink,
                },
                is_admin: false,
                created_by: decoded?.userId,
              };
              await this.activityLogService.insertActivityLog(
                createActivityLogInput2,
              );
            }
            return response;
          }
          throw `Failed to edit the Client/Supplier, please try again`;
        }
      }
      throw `Failed to edit the Client/Supplier, please try again`;
    } catch (error) {
      error = error?.message ? error?.message : error;
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      this.logger.log(
        `Update client-supplier details service failed with error: ${JSON.stringify(errMsg)}`,
      );
      throw new Error(errMsg);
    }
  }

  async updateClientSuppliersStatusById(id, is_deleted, decoded) {
    try {
      this.logger.log(
        `Update status of client-supplier service initiated with id=${id}, is_deleted=${is_deleted}`,
      );
      const clientSuppliersDetails =
        await this.getClientSuppliersDetailsById(id);
      if (clientSuppliersDetails) {
        var completedCount = 0,
          claimCount = 0,
          payment = 0;
        if (
          clientSuppliersDetails.contractDetails &&
          clientSuppliersDetails.contractDetails.length > 0
        ) {
          clientSuppliersDetails.contractDetails.forEach((element) => {
            if (element.contract_status !== 'Deleted') {
              completedCount += 1;
            }
          });
        }
        if (
          clientSuppliersDetails.paymentClaims &&
          clientSuppliersDetails.paymentClaims.length > 0
        ) {
          clientSuppliersDetails?.paymentClaims.forEach((element) => {
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
          clientSuppliersDetails.paymentDetails &&
          clientSuppliersDetails.paymentDetails.length > 0
        ) {
          clientSuppliersDetails?.paymentDetails.forEach((element) => {
            if (
              element.current_status === 'Paid - Matched' ||
              element.current_status === 'Received - Matched' ||
              element.current_status === 'No Match Required'
            ) {
              payment += 1;
            }
          });
        }
        if (is_deleted === true && completedCount > 0) {
          throw new Error(
            `This contact is linked to one or more contracts/claims or payments. You are unable to delete this contact from the Client/Supplier list to avoid system error.`,
          );
        } else {
          //Delete client or supplier.
          clientSuppliersDetails.is_deleted = is_deleted;
          clientSuppliersDetails.updated_by = decoded?.userId;
          clientSuppliersDetails.updated_on = moment.tz('UTC');
          clientSuppliersDetails.updated_group = 'USER';
          const response = await this.clientSuppliersDetails.save(
            clientSuppliersDetails,
          );
          if (response) {
            //Generating client supplier link.
            const clientSupplierLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[5]}${response.id}${is_deleted ? '?tab=archived' : '?tab=current'}` +
              `&from=log`;

            this.logger.log(`clientSupplierLink: ${clientSupplierLink}`);

            //Generating company link.
            const companyLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[2]}` +
              `${clientSuppliersDetails.company_id}` +
              `?from=log`;
            this.logger.log(`companyLink: ${companyLink}`);

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id:
                clientSuppliersDetails.client_supplier_type === 'Client'
                  ? is_deleted
                    ? 48
                    : 49
                  : is_deleted
                    ? 52
                    : 53,
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
              company_id: clientSuppliersDetails.company_id,
              dynamic_values: {
                clientSupplierName: await startCasePreserveUnicode(
                  clientSuppliersDetails.client_supplier_name,
                ),
                clientSupplierLink,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };

            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );

            return response;
          }
          throw new Error(
            `Unable to edit the Client/Supplier, please try again`,
          );
        }
      }
      throw `Unable to edit the Client/Supplier, please try again`;
    } catch (error) {
      error = error?.message ? error?.message : error;
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      this.logger.log(
        `Update status of client-supplie service failed with error: ${JSON.stringify(errMsg)}`,
      );
      throw new Error(errMsg);
    }
  }

  async insertAccountDetails(
    createAccountDetailInput: CreateAccountDetailInput[],
  ) {
    const accountDetails = await this.bankAccountsRepo.create(
      createAccountDetailInput,
    );
    return await this.bankAccountsRepo.save(accountDetails);
  }

  async deleteAccountDetails(removed_account_ids) {
    return await this.bankAccountsRepo.delete(removed_account_ids);
  }

  async getClientSupplierLists(company_id: number) {
    const results = await this.clientSuppliersDetails.find({
      where: {
        company_id,
        client_supplier_status: 'Completed',
        is_deleted: false,
      },
      order: { client_supplier_name: 'ASC' },
    });

    return results.map((result) => {
      return {
        id: result.id,
        client_supplier_id: result.client_supplier_id,
        client_supplier_name: result.client_supplier_name,
        client_supplier_type: result.client_supplier_type,
        client_supplier_status: result.client_supplier_status,
        client_email_id: result.client_email_id,
        related_entity: result.related_entity,
      };
    });
  }

  async getClientSuppliersListByProjectId(
    getClientSuppliersListForProjectsInput: GetClientSuppliersListForProjectsInput,
    timezone,
  ) {
    const company_id = getClientSuppliersListForProjectsInput.company_id;

    const contractSubQuery = await this.contractDetails
      .createQueryBuilder('c')
      .select('c.client_supplier_id', 'client_supplier_id')
      .addSelect(
        'CAST(COUNT(c.client_supplier_id) AS numeric)',
        'contract_count',
      )
      .where("c.contract_status IN('In Progress', 'Completed')")
      .andWhere(`c.company_id = :companyId`, {
        companyId: company_id,
      })
      .andWhere(`c.project_id = :project_id`, {
        project_id: getClientSuppliersListForProjectsInput.project_id,
      })
      .groupBy('c.client_supplier_id')
      .having('COUNT(c.client_supplier_id) > 0');

    const claimSubQuery = await this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .select('pc.client_supplier_id', 'client_supplier_id')
      .addSelect('COUNT(pc.client_supplier_id)::numeric', 'claim_count')
      .where("pc.status NOT IN('Draft', 'Deleted')")
      .andWhere(`pc.company_id = :companyId`, {
        companyId: company_id,
      })
      .andWhere(`pc.project_id = :project_id`, {
        project_id: getClientSuppliersListForProjectsInput.project_id,
      })
      .groupBy('pc.client_supplier_id')
      .having('COUNT(pc.client_supplier_id) > 0');

    const queryBuilder = await this.clientSuppliersDetails
      .createQueryBuilder('cs')
      .distinct(true)
      .select('cs.id', 'id')
      .addSelect('cs.client_supplier_id', 'client_supplier_id')
      .addSelect('cs.company_id', 'company_id')
      .addSelect('cs.client_supplier_name', 'client_supplier_name')
      .addSelect('cs.business_name', 'business_name')
      .addSelect('cs.client_supplier_type', 'client_supplier_type')
      .addSelect('cs.client_supplier_status', 'client_supplier_status')
      .addSelect('cs.related_entity', 'related_entity')
      .addSelect('cs.country', 'country')
      .addSelect('cs.region', 'region')
      .addSelect('cs.place_id', 'place_id')
      .addSelect('cs.latitude', 'latitude')
      .addSelect('cs.longitude', 'longitude')
      .addSelect('cs.entity_type', 'entity_type')
      .addSelect('cs.client_supplier_address', 'client_supplier_address')
      .addSelect('cs.client_phone_no', 'client_phone_no')
      .addSelect('cs.client_email_id', 'client_email_id')
      .addSelect('cs.client_website', 'client_website')
      .addSelect('cs.qbcc_number', 'qbcc_number')
      .addSelect('cs.acn_number', 'acn_number')
      .addSelect('cs.abn_number', 'abn_number')
      .addSelect('cs.tfn_number', 'tfn_number')
      .addSelect('cs.payment_terms', 'payment_terms')
      .addSelect('cs.created_by', 'created_by')
      .addSelect('cs.created_on', 'created_on')
      .addSelect('contract.contract_count', 'contract_count')
      .addSelect('claims.claim_count', 'claim_count')
      .innerJoin('cs.contractDetails', 'cd')
      .leftJoin(
        '(' + contractSubQuery.getQuery() + ')',
        'contract',
        'contract.client_supplier_id = cs.client_supplier_id',
      )
      .leftJoin(
        '(' + claimSubQuery.getQuery() + ')',
        'claims',
        'claims.client_supplier_id = cs.client_supplier_id',
      )
      .where(`cs.company_id = :companyId`, {
        companyId: company_id,
      })
      .andWhere("cs.client_supplier_status = 'Completed'")
      .andWhere('cs.is_deleted = false')
      .andWhere(`cd.project_id = :project_id`, {
        project_id: getClientSuppliersListForProjectsInput.project_id,
      });

    if (getClientSuppliersListForProjectsInput.client_supplier_type) {
      queryBuilder.andWhere('cs.client_supplier_type = :client_supplier_type', {
        client_supplier_type:
          getClientSuppliersListForProjectsInput.client_supplier_type,
      });
    }

    if (getClientSuppliersListForProjectsInput.search) {
      queryBuilder.andWhere(
        `(LOWER(cs.client_supplier_name) LIKE LOWER(:keyword))`,
        {
          keyword: `%${getClientSuppliersListForProjectsInput.search.toLowerCase()}%`,
        },
      );
    }

    if (getClientSuppliersListForProjectsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        getClientSuppliersListForProjectsInput.date_filter === 'Custom' &&
        getClientSuppliersListForProjectsInput.start_date &&
        getClientSuppliersListForProjectsInput.end_date
      ) {
        startDate = moment
          .tz(getClientSuppliersListForProjectsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(getClientSuppliersListForProjectsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (
        getClientSuppliersListForProjectsInput.date_filter === 'This Month'
      ) {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (
        getClientSuppliersListForProjectsInput.date_filter === 'Last Month'
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
      queryBuilder.andWhere('cs.created_on BETWEEN :start_date AND :end_date', {
        start_date: startDate,
        end_date: endDate,
      });
    }

    const sorting_order = getClientSuppliersListForProjectsInput.sorting_order
      ? getClientSuppliersListForProjectsInput.sorting_order
      : 'DESC';
    if (!getClientSuppliersListForProjectsInput.sorting_field) {
      queryBuilder.orderBy({ 'cs.created_on': sorting_order });
      if (
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getClientSuppliersListForProjectsInput.page_number - 1) *
              getClientSuppliersListForProjectsInput.page_size,
          )
          .limit(getClientSuppliersListForProjectsInput.page_size);
      }
    }
    if (
      getClientSuppliersListForProjectsInput.sorting_field &&
      getClientSuppliersListForProjectsInput.sorting_field !==
        'contract_count' &&
      getClientSuppliersListForProjectsInput.sorting_field !== 'claim_count'
    ) {
      switch (getClientSuppliersListForProjectsInput.sorting_field) {
        case 'client_supplier_name':
          {
            queryBuilder.orderBy({
              'LOWER(cs.client_supplier_name)': sorting_order,
            });
          }
          break;
        case 'business_name':
          {
            queryBuilder.orderBy({ 'LOWER(cs.business_name)': sorting_order });
          }
          break;
        case 'client_supplier_type':
          {
            queryBuilder.orderBy({ 'cs.client_supplier_type': sorting_order });
          }
          break;
        case 'client_supplier_address':
          {
            queryBuilder.orderBy({
              'LOWER(cs.client_supplier_address)': sorting_order,
            });
          }
          break;
        case 'client_supplier_status':
          {
            queryBuilder.orderBy({
              'cs.client_supplier_status': sorting_order,
            });
          }
          break;
      }
      if (
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getClientSuppliersListForProjectsInput.page_number - 1) *
              getClientSuppliersListForProjectsInput.page_size,
          )
          .limit(getClientSuppliersListForProjectsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    let finalResult, finalCount;
    if (
      getClientSuppliersListForProjectsInput.sorting_field &&
      getClientSuppliersListForProjectsInput.sorting_field === 'contract_count'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.contract_count - b.contract_count,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.contract_count - a.contract_count,
        );
      }

      const startIndex =
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
          ? (getClientSuppliersListForProjectsInput.page_number - 1) *
            getClientSuppliersListForProjectsInput.page_size
          : 0;
      const endIndex =
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
          ? Math.min(
              (getClientSuppliersListForProjectsInput.page_number - 1) *
                getClientSuppliersListForProjectsInput.page_size +
                getClientSuppliersListForProjectsInput.page_size,
              sortedResult?.length,
            )
          : sortedResult?.length;
      // Slice the results array to get the results for the current page
      finalResult = sortedResult?.slice(startIndex, endIndex);
      finalCount = sortedResult?.length || 0;
    } else if (
      getClientSuppliersListForProjectsInput.sorting_field &&
      getClientSuppliersListForProjectsInput.sorting_field === 'claim_count'
    ) {
      let sortedResult: any[] = [];
      if (sorting_order === 'ASC') {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => a.claim_count - b.claim_count,
        );
      } else {
        sortedResult = Array.from(rawResults).sort(
          (a, b) => b.claim_count - a.claim_count,
        );
      }

      const startIndex =
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
          ? (getClientSuppliersListForProjectsInput.page_number - 1) *
            getClientSuppliersListForProjectsInput.page_size
          : 0;
      const endIndex =
        getClientSuppliersListForProjectsInput.page_number &&
        getClientSuppliersListForProjectsInput.page_size
          ? Math.min(
              (getClientSuppliersListForProjectsInput.page_number - 1) *
                getClientSuppliersListForProjectsInput.page_size +
                getClientSuppliersListForProjectsInput.page_size,
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

    return { total_count: finalCount, client_suppliers_list: finalResult };
  }

  async checkExistenceForClient(
    company_id: number,
    client_supplier_type: string,
    client_supplier_name?: string,
    client_email_id?: string,
    qbcc_number?: string,
  ) {
    const whereConditions: any = { company_id, client_supplier_type };
    if (client_supplier_name) {
      whereConditions.client_supplier_name = ILike(`${client_supplier_name}`);
    } else if (client_email_id) {
      whereConditions.client_email_id = ILike(`${client_email_id}`);
    } else if (qbcc_number) {
      whereConditions.qbcc_number = ILike(`${qbcc_number}`);
    }
    const clientSuppliersDetails = await this.clientSuppliersDetails.find({
      where: whereConditions,
    });
    this.logger.log(`clientSuppliersDetails: ${JSON.stringify(clientSuppliersDetails)}`);
    return clientSuppliersDetails;
  }

  async fetchClientSupplierDetailsForPaymentClaim(
    data: FetchClientSupplierDetailsForPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching client supplier details for payment claim with contract_id: ${data.contract_id}`,
      );

      const { contract_id, cash_retention_type, payment_id } = data;

      const variationSubQuery = await this.variationDetails
        .createQueryBuilder('v')
        .select('v.contract_id', 'contract_id')
        .addSelect('SUM(v.variation_amount)::numeric', 'variation_amount')
        .where("v.variation_status = 'Agreed'")
        .groupBy('v.contract_id');
      // .having('SUM(v.variation_amount) > 0');

      // const claimSubQuery = await this.paymentClaimsRepo
      //   .createQueryBuilder('pc')
      //   .select('pc.contract_id', 'contract_id')
      //   .addSelect('SUM(pc.claim_amount)::numeric', 'claim_amount')
      //   .where("pc.status NOT IN('Draft', 'Deleted')")
      //   .groupBy('pc.contract_id');

      const queriedDetails = await this.contractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.client_supplier_id AS client_supplier_id',
          'client.client_supplier_name AS client_supplier_name',
          'client.client_supplier_address AS client_supplier_address',
          'client.client_supplier_type AS client_supplier_type',
          'contract.payment_terms AS payment_terms',
          'contract.payment_from_account AS payment_from_account',
          'contract.retention_from_account AS payment_retention_account',
          'contract.payment_to_account AS payment_to_account',
          'contract.initial_contract_sum AS initial_contract_sum',
          'CASE WHEN variation.variation_amount <> 0 THEN variation.variation_amount ELSE 0 END AS variation_amount',
          // 'claim.claim_amount AS claim_amount',
        ])
        .distinct(true)
        .leftJoin(
          ClientSuppliersDetails,
          'client',
          'contract.client_supplier_id = client.client_supplier_id',
        )
        .leftJoin(
          '(' + variationSubQuery.getQuery() + ')',
          'variation',
          'contract.contract_id = variation.contract_id',
        )
        // .leftJoin(
        //   '(' + claimSubQuery.getQuery() + ')',
        //   'claim',
        //   'contract.contract_id = claim.contract_id',
        // )
        .where(`contract.contract_id = :contract_id`, {
          contract_id,
        })
        .getRawOne();
      this.logger.log(`queriedDetails: ${JSON.stringify(queriedDetails)}`);

      if (!queriedDetails)
        throw `Invalid data. Contract details not found. Please provide a valid contract_id.`;

      if (!queriedDetails.payment_to_account)
        throw `No payment_to_account found in the contracts entity.`;

      let fetchedPaymentFromAccountDetails = {};
      if (queriedDetails.client_supplier_type == 'Supplier') {
        const paymentDetails = await this.paymentsRepo.findOne({
          where: { payment_id },
        });
        const bank_account_id =
          cash_retention_type == 'Claim'
            ? queriedDetails.payment_from_account
            : paymentDetails.retention_account;

        this.logger.log(`bank_account_id: ${bank_account_id}`);
        fetchedPaymentFromAccountDetails = await this.bankAccountsRepo
          .createQueryBuilder('ba')
          .select([
            'ba.account_name AS payment_from_account_name',
            'ba.account_type AS payment_from_account_type',
            'ba.account_number AS payment_from_account_number',
            'ba.bsb_number AS payment_from_account_bsb_number',
          ])
          .where('ba.bank_account_id = :bank_account_id', {
            bank_account_id,
          })
          .getRawOne();
        this.logger.log(`fetchedPaymentFromAccountDetails: ${JSON.stringify(fetchedPaymentFromAccountDetails)}`);

        if (!fetchedPaymentFromAccountDetails)
          throw `Payment from account id present in the contracts entity is invalid or not present in the bank accounts entity.`;
      }

      const fetchedPaymentToAccountDetails = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_type AS payment_to_account_type',
          'ba.account_name AS payment_to_account_name',
          'ba.bsb_number AS payment_to_account_bsb_number',
          'ba.account_number AS payment_to_account_number',
        ])
        .where('ba.bank_account_id = :bank_account_id', {
          bank_account_id: queriedDetails.payment_to_account,
        })
        .getRawOne();
      this.logger.log(`fetchedPaymentToAccountDetails: ${JSON.stringify(fetchedPaymentToAccountDetails)}`);

      if (!fetchedPaymentToAccountDetails)
        throw `Payment to account id present in the contracts entity is invalid or not present in the bank accounts entity.`;

      let previous_claim_amount = 0;
      const claimDetails = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select('ARRAY_AGG(pc.payment_claim_id)', 'payment_claim_id_array')
        .distinct(true)
        .where("pc.status NOT IN('Draft', 'Deleted')")
        .andWhere('pc.contract_id = :contract_id', {
          contract_id: contract_id,
        })
        .getRawOne();

      if (
        claimDetails &&
        claimDetails.payment_claim_id_array &&
        claimDetails.payment_claim_id_array.length > 0
      ) {
        const fetchedInvoiceDetailsOfClaims =
          await this.paymentClaimInvoicesRepo
            .createQueryBuilder('i')
            .select([
              'i.description AS description',
              'i.quantity AS quantity',
              'i.unit_price AS unit_price',
              'i.gst AS gst',
              'i.total_amount_including_gst AS total_amount_including_gst',
              'i.payment_claim_id AS payment_claim_id',
            ])
            .where('i.payment_claim_id IN (:...payment_claim_id)', {
              payment_claim_id: claimDetails.payment_claim_id_array,
            })
            .getRawMany();

        if (
          fetchedInvoiceDetailsOfClaims &&
          fetchedInvoiceDetailsOfClaims.length
        ) {
          const subTotalSummaries = [];
          await fetchedInvoiceDetailsOfClaims.map((invoice) => {
            subTotalSummaries.push(invoice.quantity * invoice.unit_price);
          });
          previous_claim_amount = subTotalSummaries.reduce(
            (acc, curr) => acc + curr,
            0,
          );
        }
      }

      const allClientSupplierDetails = {
        ...queriedDetails,
        ...fetchedPaymentFromAccountDetails,
        ...fetchedPaymentToAccountDetails,
        ...{ claim_amount: previous_claim_amount },
      };
      this.logger.log(`allClientSupplierDetails: ${JSON.stringify(allClientSupplierDetails)}`);

      this.logger.log(
        `Client supplier details fetched successfully with data: ${JSON.stringify(allClientSupplierDetails)}`,
      );
      return allClientSupplierDetails;
    } catch (error) {
      this.logger.error(
        `Errored while fetching client supplier details fpr payment claim with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async accountToBeInserted(
    new_account_details: CreateAccountDetailInput[],
    old_account_details: CreateAccountDetailInput[],
  ) {
    return new Promise<any[]>((resolve, reject) => {
      var account_details: CreateAccountDetailInput[] = [];
      if (
        old_account_details &&
        old_account_details[0] !== null &&
        old_account_details.length > 0
      ) {
        account_details = new_account_details.filter(
          (obj1) => !old_account_details.some((obj2) => obj2.id === obj1.id),
        );
      } else {
        account_details = new_account_details;
      }
      account_details = account_details.map((obj) => {
        const { id, ...rest } = obj;
        return rest;
      });
      resolve(account_details);
    });
  }

  async getProjectsListByClientSupplierId(data: GetProjectsListInput) {
    try {
      this.logger.log(
        `Request received for fetching details for payment claim with client_supplier_id: ${data.client_supplier_id}`,
      );

      const projectIdDetails = await this.contractDetails.find({
        where: {
          client_supplier_id: data.client_supplier_id,
          contract_status: 'In Progress',
        },
        select: ['project_id'],
      });

      if (!projectIdDetails) throw `Contract details not found.`;
      this.logger.log(`projectIdDetails: ${JSON.stringify(projectIdDetails)}`);

      let projectIds = [];
      projectIdDetails.forEach((element) => {
        if (!projectIds.includes(element.project_id)) {
          projectIds.push(element.project_id);
        }
      });

      return await this.projectDetails.find({
        where: { project_id: In(projectIds) },
        order: { project_name: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Errored while fetching project details for payment claim with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async getContractsListByClientSupplierId(data: GetContractsListInput) {
    try {
      this.logger.log(
        `Request received for fetching details for payment claim with client_supplier_id: ${data.client_supplier_id} and project_id: ${data.project_id}`,
      );

      const variationSubQuery = await this.variationDetails
        .createQueryBuilder('v')
        .select('v.contract_id', 'contract_id')
        .addSelect('SUM(v.variation_amount)::numeric', 'variation_amount')
        .where("v.variation_status = 'Agreed'")
        .groupBy('v.contract_id');
      // .having('SUM(v.variation_amount) > 0');

      const claimSubQuery = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select('pc.contract_id', 'contract_id')
        .addSelect('SUM(pc.claim_amount)::numeric', 'claim_amount')
        .where("pc.status NOT IN('Draft', 'Deleted')")
        .groupBy('pc.contract_id');

      const results = await this.contractDetails
        .createQueryBuilder('contract')
        .select('contract.id', 'id')
        .addSelect('contract.contract_id', 'contract_id')
        .addSelect('contract.contract_name', 'contract_name')
        .addSelect('contract.client_supplier_role', 'client_supplier_role')
        .addSelect('contract.contract_type', 'contract_type')
        .addSelect('contract.contract_status', 'contract_status')
        .addSelect('contract.contract_date', 'contract_date')
        .addSelect('contract.project_id', 'project_id')
        .addSelect('contract.client_supplier_id', 'client_supplier_id')
        .addSelect('contract.retention_type', 'retention_type')
        .addSelect('contract.payment_terms', 'payment_terms')
        .addSelect('contract.initial_contract_sum', 'initial_contract_sum')
        .addSelect(
          'contract.defect_liability_end_date',
          'defect_liability_end_date',
        )
        .addSelect('variation.variation_amount', 'variation_amount')
        .addSelect('claim.claim_amount', 'claim_amount')
        .distinct(true)
        .leftJoin(
          '(' + variationSubQuery.getQuery() + ')',
          'variation',
          'contract.contract_id = variation.contract_id',
        )
        .leftJoin(
          '(' + claimSubQuery.getQuery() + ')',
          'claim',
          'contract.contract_id = claim.contract_id',
        )
        .where(`contract.project_id = :project_id`, {
          project_id: data.project_id,
        })
        .andWhere(`contract.client_supplier_id = :client_supplier_id`, {
          client_supplier_id: data.client_supplier_id,
        })
        .andWhere(`contract.contract_status = 'In Progress'`)
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      //Formatted amounts in the results.
      for (const contract of results) {
        contract.formatted_initial_contract_sum = formatCurrencyWithoutDollars(
          contract.initial_contract_sum,
        );
        contract.formatted_variation_amount = formatCurrencyWithoutDollars(
          contract.variation_amount,
        );
        contract.formatted_claim_amount = formatCurrencyWithoutDollars(
          contract.claim_amount,
        );
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Errored while fetching contract details for payment claim with message: ${error}`,
      );
      throw `${error}`;
    }
  }

  async getBankAccounts(removed_ids) {
    const removedAccountDetails = await this.bankAccountsRepo.find({
      where: { id: In(removed_ids) },
    });
    const removedIds = removedAccountDetails
      ? removedAccountDetails?.map((obj) => Number(obj.bank_account_id))
      : [];

    this.logger.log(`removedIds: ${JSON.stringify(removedIds)}`);

    if (removedIds && removedIds?.length > 0) {
      const contractDetails = await this.contractDetails
        .createQueryBuilder('c')
        .select('COUNT(c.contract_id)::numeric', 'contract_count')
        .where("c.contract_status NOT IN ('Deleted')")
        .andWhere(
          `c.payment_from_account IN (:...accountId) OR c.payment_to_account IN (:...accountId) OR c.retention_from_account IN (:...accountId)`,
          {
            accountId: removedIds,
          },
        )
        .getRawOne();

      const paymentDetails = await this.paymentsRepo
        .createQueryBuilder('c')
        .select('COUNT(c.payment_id)::numeric', 'payment_count')
        .where("c.current_status NOT IN ('Deleted')")
        .andWhere(
          `c.payment_from_account IN (:...accountId) OR c.payment_to_account IN (:...accountId) OR c.retention_account IN (:...accountId)`,
          {
            accountId: removedIds,
          },
        )
        .getRawOne();

      return { ...contractDetails, ...paymentDetails };
    } else {
      return {};
    }
  }
}
