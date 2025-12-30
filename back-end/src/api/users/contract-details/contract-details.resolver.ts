import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { ContractDetailsService } from './contract-details.service';
import {
  CheckExistenceForContractResponse,
  ContractDetailsResponse,
} from './response/contract-detail.response';
import { CreateContractDetailInput } from './dto/create-contract-detail.input';
import { UpdateContractDetailInput } from './dto/update-contract-detail.input';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  GetContractListForProjectsInput,
  GetContractListsInput,
} from './dto/get-contract-lists.input';
import {
  ViewContractListResponse,
  ViewContractResponse,
} from './response/view-contract-list.response';
import { handleError } from 'src/api/common/error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  GetContractListResponse,
  GetContractResponse,
} from './response/get-contract-list.response';
import { readFileSync } from 'fs';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroContractsService } from 'src/api/common/integrations/xero/contracts/xero-contracts.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Resolver()
export class ContractDetailsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly contractDetailsService: ContractDetailsService,
    private readonly xeroService: XeroService,
    private readonly xeroContractsService: XeroContractsService,
  ) {
    this.logger = new PaytradeLogger('CONTRACT_DETAILS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ContractDetailsResponse, {
    name: 'insertContractDetails',
    description:
      'Insert a new contract into the system. Handles integration with Xero if active.',
  })
  async insertContractDetails(
    @Context() context,
    @Args('createContractDetailInput', {
      description: 'Payload containing contract details to be inserted',
    })
    createContractDetailInput: CreateContractDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(createContractDetailInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const contractDetails: any =
        await this.contractDetailsService.insertContractDetails(
          decoded,
          createContractDetailInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractDetails)}`,
      );

      const xeroDetails = await this.xeroService.getIntegrationDetails(
        createContractDetailInput.company_id,
      );
      if (
        xeroDetails &&
        xeroDetails.integration_id &&
        xeroDetails?.integrationDetails &&
        xeroDetails?.integrationDetails?.integration_status ===
          'Connected - active'
      ) {
        if (createContractDetailInput.contract_status === 'Draft') {
          const xeroPayload = {
            tenant_id: xeroDetails.tenant_id,
            integration_id: xeroDetails.integration_id,
            company_id: contractDetails.company_id,
            contract_name: contractDetails.contract_name,
            pt_contract_id: contractDetails.contract_id,
            contract_status: 'DRAFT',
            mapped_status: 'System',
            created_by: contractDetails.created_by,
            created_on: contractDetails.created_on,
            created_group: contractDetails.created_group,
          };

          const xeroResponse: any =
            await this.xeroContractsService.insertContractDetails(xeroPayload);
          this.logger.log(
            `Xero Contract details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
          );
          if (xeroResponse) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                integration_id: xeroDetails.integration_id,
                log_template_id: 20,
                dynamic_values: {
                  contract_name: xeroResponse?.contract_name,
                },
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: contractDetails?.id,
                },
                reference_id: contractDetails?.id,
                history: [
                  `API triggered from contract ${xeroPayload?.contract_name}`,
                  'Export will not occur in draft state',
                ],
                important_checks: {},
                error_message: null,
                xero_records: [],
                paytrade_records: [contractDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
        } else if (
          createContractDetailInput.contract_status === 'In Progress'
        ) {
          const xeroPayload = {
            contract_id: contractDetails.contract_id,
            mapped_status: 'System',
          };

          const xeroResponse: any =
            await this.xeroContractsService.createContractTrackingOptions(
              decoded,
              xeroPayload,
            );
          this.logger.log(
            `Xero Contract details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
          );
        }
      }

      const successMessage =
        contractDetails.contract_status === 'Draft'
          ? 'This contract has been added as draft.'
          : createContractDetailInput.client_supplier_type === 'Client'
            ? 'This contract has been added.'
            : 'This contract has been added and notices have been triggered successfully';

      contractDetails.client_supplier_type =
        createContractDetailInput.client_supplier_type;

      return framedResponse('SUCCESS', successMessage, contractDetails);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ViewContractListResponse, {
    name: 'getContractListsForCompany',
    description: 'Fetch a list of contracts associated with a company.',
  })
  async getContractListsForCompany(
    @Args('getContractListsInput', {
      description: 'Input payload to fetch contracts associated with a company',
    })
    getContractListsInput: GetContractListsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(getContractListsInput)}`,
      );
      const contractLists =
        await this.contractDetailsService.getContractListsForCompany(
          getContractListsInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        contractLists,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ViewContractResponse, {
    name: 'viewContractDetailsById',
    description:
      'Retrieve the details of a specific contract by its ID, including base64-encoded file if exists.',
  })
  async viewContractDetailsById(
    @Args('id', {
      description: 'The unique identifier of the contract to fetch details for',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}`,
      );
      const response =
        await this.contractDetailsService.viewContractDetailsById(id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      if (response && response !== null && response.file_path) {
        const image = readFileSync(response.file_path, {
          encoding: 'base64',
        });
        response['file'] = `data:${response.file_type};base64,${image}`;
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ViewContractResponse, {
    name: 'editContractDetailsById',
    description:
      'Edit an existing contract. Handles Xero integration updates if applicable.',
  })
  async editContractDetailsById(
    @Context() context,
    @Args('updateContractDetailInput', {
      description: 'Payload containing updated contract details',
    })
    updateContractDetailInput: UpdateContractDetailInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${JSON.stringify(updateContractDetailInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const contractDetails =
        await this.contractDetailsService.getContractsDetailsById(
          updateContractDetailInput.id,
        );
      if (!contractDetails) {
        throw new Error(`Unable to edit the contract, please try again`);
      }
      const editContractDetailsRes =
        await this.contractDetailsService.editContractDetailsById(
          decoded,
          updateContractDetailInput,
          decoded?.userId,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(editContractDetailsRes)}`,
      );
      console.log(
        'editContractDetailsRes: ',
        JSON.stringify(editContractDetailsRes),
      );
      if (editContractDetailsRes) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          updateContractDetailInput.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const isContractExists =
            await this.xeroContractsService.getContractDetail(
              editContractDetailsRes.contract_id,
              xeroDetails.integration_id,
            );
          if (isContractExists) {
            if (updateContractDetailInput.contract_status === 'Draft') {
              const xeroPayload = {
                tenant_id: xeroDetails.tenant_id,
                integration_id: xeroDetails.integration_id,
                contract_name: updateContractDetailInput.contract_name,
                pt_contract_id: editContractDetailsRes.contract_id,
                updated_by: updateContractDetailInput.updated_by,
                updated_on: updateContractDetailInput.updated_on,
                updated_group: updateContractDetailInput.updated_group,
              };

              const xeroResponse =
                await this.xeroContractsService.updateContractDetails(
                  xeroPayload,
                );
              this.logger.log(
                `Xero contract details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
              );
              if (xeroResponse) {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 78,
                    dynamic_values: {
                      contract_name: xeroResponse?.contract_name,
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: xeroResponse?.id,
                      paytradeId: editContractDetailsRes?.id,
                    },
                    reference_id: editContractDetailsRes?.id,
                    history: [
                      `API triggered from contract ${xeroPayload?.contract_name}`,
                      'Export will not occur in draft state',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: [],
                    paytrade_records: [editContractDetailsRes],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              }
            } else if (
              contractDetails.contract_status === 'Draft' &&
              updateContractDetailInput.contract_status === 'In Progress'
            ) {
              const xeroPayload = {
                contract_id: editContractDetailsRes.contract_id,
                mapped_status: 'System',
              };

              const xeroResponse =
                await this.xeroContractsService.createContractTrackingOptions(
                  decoded,
                  xeroPayload,
                );
              this.logger.log(
                `Xero contract details inserted successfully with data: ${JSON.stringify(xeroResponse)}`,
              );
            }
          }
        }

        const successMessage =
          editContractDetailsRes.contract_status === 'Draft'
            ? 'This contract has been updated.'
            : 'This contract has been added and notices have been triggered successfully';
        return framedResponse(
          'SUCCESS',
          successMessage,
          editContractDetailsRes,
        );
      }
      throw new Error(`Unable to edit the contract, please try again`);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ViewContractResponse, {
    name: 'updateContractStatusById',
    description:
      'Update the status of a contract (e.g., In Progress, Deleted). Also handles Xero deletion if required.',
  })
  async updateContractStatusById(
    @Context() context,
    @Args('id', {
      description: 'The unique identifier of the contract to update',
    })
    id: string,
    @Args('status', {
      description:
        'The new status to assign to the contract (In Progress, Deleted)',
    })
    status: string,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${id}, status:: ${status}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const updateContractStatusRes =
        await this.contractDetailsService.updateContractStatusById(
          decoded,
          id,
          status,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(updateContractStatusRes)}`,
      );
      if (updateContractStatusRes) {
        if (status === 'Deleted' || status === 'In Progress') {
          const xeroDetails = await this.xeroService.getIntegrationDetails(
            updateContractStatusRes.company_id,
          );
          if (
            xeroDetails &&
            xeroDetails.integration_id &&
            xeroDetails?.integrationDetails &&
            xeroDetails?.integrationDetails?.integration_status ===
              'Connected - active'
          ) {
            const isContractExists =
              await this.xeroContractsService.getContractDetail(
                updateContractStatusRes.contract_id,
                xeroDetails.integration_id,
              );
            if (isContractExists) {
              const xeroPayload = {
                contract_id: updateContractStatusRes.contract_id,
              };
              const xeroResponse: any =
                await this.xeroContractsService.deleteContractTrackingOptions(
                  decoded,
                  xeroPayload,
                );
              this.logger.log(
                `Xero contract details deleted successfully with data: ${JSON.stringify(xeroResponse)}`,
              );
            }
          }
        }

        const successMessage =
          status === 'Deleted'
            ? 'This contract has been deleted.'
            : `This contract has been ${status}`;
        return framedResponse(
          'SUCCESS',
          successMessage,
          updateContractStatusRes,
        );
      }
      throw new Error(`Unable to update the contract, please try again`);
    } catch (error) {
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        this.logger.error(`Errored inside the client with message: ${error}`);
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetContractListResponse, {
    name: 'getContractLists',
    description:
      'Fetch contracts for a company and optionally a specific project.',
  })
  async getContractLists(
    @Args('company_id', {
      description:
        'The unique identifier of the company to fetch contracts for',
    })
    company_id: number,
    @Args('project_id', {
      description:
        'Optional: The project ID to filter contracts for a specific project',
      nullable: true,
    })
    project_id?: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id: ${company_id}, project_id: ${project_id}`,
      );
      const response = await this.contractDetailsService.getContractLists(
        company_id,
        project_id,
      );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      if (response && response.length > 0) {
        response.forEach((element) => {
          element.contract_date = element.contract_date
            ? new Date(element.contract_date)
            : new Date(0);
        });
      }
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetContractResponse, {
    name: 'getContractDetailsByContractId',
    description:
      'Fetch detailed information for a specific contract using contract_id.',
  })
  async getContractDetailsByContractId(
    @Args('contract_id', {
      description: 'The unique identifier of the contract to fetch details for',
    })
    contract_id: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: id:: ${contract_id}`,
      );
      const response =
        await this.contractDetailsService.getContractDetailsById(contract_id);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      if (response) {
        response.contract_date = response.contract_date
          ? new Date(response.contract_date)
          : new Date(0);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          response,
        );
      }
      throw new Error(`Unable to fetch the contract, please try again`);
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ViewContractListResponse, {
    name: 'getContractDetailsByProjectId',
    description: 'Get all contracts associated with a specific project.',
  })
  async getContractDetailsByProjectId(
    @Args('getContractListForProjectsInput', {
      description:
        'Input payload to fetch all contracts associated with a specific project',
    })
    getContractListForProjectsInput: GetContractListForProjectsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with input:: ${JSON.stringify(getContractListForProjectsInput)}`,
      );
      const response =
        await this.contractDetailsService.getContractListForProjects(
          getContractListForProjectsInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => CheckExistenceForContractResponse, {
    name: 'checkExistenceForContract',
    description:
      'Check if a contract with the given name already exists for a company and type (Client/Supplier).',
  })
  async checkExistenceForContract(
    @Args('company_id', { description: 'The unique identifier of the company' })
    company_id: number,
    @Args('client_supplier_type', {
      description: 'Type of the client/supplier (Client or Supplier)',
    })
    client_supplier_type: string,
    @Args('contract_name', {
      description: 'Optional: The contract name to check existence for',
      nullable: true,
    })
    contract_name?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id:: ${company_id} and contract_name:: ${contract_name}`,
      );
      const contractDetails =
        await this.contractDetailsService.checkExistenceForContract(
          company_id,
          client_supplier_type,
          contract_name,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contractDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        contractDetails,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }
}
