import { Injectable } from '@nestjs/common';
import { TrackingOption, XeroClient } from 'xero-node';
import * as dotenv from 'dotenv';
import {
  GetMappedXeroContractListsInput,
  GetPaytradeContractListsInput,
  GetXeroContractListsInput,
  YetToMapContractsInput,
} from './dto/xero.input';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { XeroContractDetails } from 'src/entities/xero-contract-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { ContractDetailsService } from 'src/api/users/contract-details/contract-details.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroContractsService {
  private logger = new PaytradeLogger('XERO_CONTRACTS_SERVICE');
  private xero: XeroClient;
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(XeroContractDetails)
    private xeroContractDetails: Repository<XeroContractDetails>,
    @InjectRepository(ContractDetails)
    private contractDetails: Repository<ContractDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    private readonly xeroService: XeroService,
    private readonly contractDetailsService: ContractDetailsService,
  ) {
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_CALLBACK_URL + 'xero/callback'],
      scopes: [
        'openid',
        'email',
        'profile',
        'accounting.transactions',
        'accounting.settings', // Required for tenants
        'accounting.settings.read',
        'offline_access', // Required for token refresh
        'projects', // Required for projects
        'accounting.contacts', // Required for contacts
        'accounting.contacts.read',
      ],
      state: '',
      httpTimeout: 10000, // Set timeout for requests
    });
  }

  async getContractDetail(pt_contract_id: number, integration_id: number) {
    return await this.xeroContractDetails.findOne({
      where: { pt_contract_id, integration_id },
    });
  }

  async getContractsDetails(contract_id) {
    return await this.contractDetails.findOne({
      where: { contract_id },
    });
  }

  async createContractTrackingOptions(decoded: any, data: any) {
    try {
      const contractDetails = await this.contractDetails.findOne({
        where: { contract_id: data.contract_id },
      });
      if (!contractDetails) {
        throw `Contract details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: contractDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      await this.xeroService.refreshTokenSet(
        contractDetails.company_id,
        this.xero,
      );

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createContractInXero',
          api_payload: {
            contract_id: data.contract_id,
            category_type: 'contract',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 80,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const checkExistence =
        await this.xero.accountingApi.getTrackingCategories(
          xeroDetails.tenant_id,
          `Status=="ACTIVE"`,
          'Name ASC',
          true,
        );

      const checkExistenceInXero = checkExistence?.body?.trackingCategories
        .map((category) => {
          const matchedOptions = category.options.filter(
            (option) =>
              option.name?.trim()?.toLowerCase() ===
              contractDetails.contract_name?.trim()?.toLowerCase(),
          );

          return matchedOptions.length > 0
            ? { ...category, options: matchedOptions }
            : null;
        })
        .filter(Boolean);
      this.logger.log(`response.body: ${JSON.stringify(checkExistenceInXero)}`);

      if (
        checkExistenceInXero &&
        checkExistenceInXero.length > 0 &&
        checkExistenceInXero[0] !== null &&
        checkExistenceInXero[0]?.options &&
        checkExistenceInXero[0]?.options?.length > 0 &&
        checkExistenceInXero[0]?.options[0] !== null
      ) {
        const contract = checkExistenceInXero[0]?.options[0];
        let requestData: any = {
          contract_id: contract.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          contract_name: contract.name,
          contract_status: contract.status,
          pt_contract_id: contractDetails.contract_id,
          mapped_status: data.mapped_status,
        };
        const checkExistenceInDb = await this.getContractDetailsByContractId(
          contract.trackingOptionID,
          xeroDetails.integration_id,
        );
        if (checkExistenceInDb && checkExistenceInDb?.id) {
          if (
            checkExistenceInDb.pt_contract_id &&
            checkExistenceInDb.pt_contract_id !== contractDetails.contract_id
          ) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createContractInXero',
              api_payload: {
                pt_contract_id: data.contract_id,
                contract_id: contract.trackingOptionID,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 291,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: contractDetails?.id,
              },
              reference_id: contractDetails?.id,
              history: [
                `API triggered from contract ${contractDetails?.contract_name}`,
                'Export failed',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: `Contract in Xero exists already and mapped to some other contract in paytrade ${checkExistenceInDb.pt_contract_id}`,
              xero_records: [contract],
              paytrade_records: [contractDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
          requestData = {
            ...requestData,
            mapped_status: data.mapped_status,
            created_on: moment.tz('UTC'),
            created_by: decoded?.userId,
            created_group: 'USER',
          };
          const response =
            await this.updateContractDetailsByContactId(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 12,
            dynamic_values: { contract_name: contractDetails.contract_name },
            project_id: null,
            contract_id: response?.id,
            reference: {
              xeroId: response?.id,
              paytradeId: contractDetails?.id,
            },
            reference_id: contractDetails?.id,
            history: [
              `API triggered from contract ${contractDetails?.contract_name}`,
              'Export successful',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [contract],
            paytrade_records: [contractDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        } else {
          requestData = {
            ...requestData,
            mapped_status: data.mapped_status,
            updated_on: moment.tz('UTC'),
            updated_by: decoded?.userId,
            updated_group: 'USER',
          };
          const response: any = await this.insertContractDetails(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 12,
            dynamic_values: { contract_name: contractDetails.contract_name },
            project_id: null,
            contract_id: response?.id,
            reference: {
              xeroId: response?.id,
              paytradeId: contractDetails?.id,
            },
            reference_id: contractDetails?.id,
            history: [
              `API triggered from contract ${contractDetails?.contract_name}`,
              'Export successful',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [contract],
            paytrade_records: [contractDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        }
      } else {
        try {
          const trackingOption: any = {
            name: contractDetails.contract_name,
            status: TrackingOption.StatusEnum.ACTIVE,
            trackingCategoryID: xeroDetails.contract_category_id,
          };
          const xeroResponse =
            await this.xero.accountingApi.createTrackingOptions(
              xeroDetails.tenant_id,
              xeroDetails.contract_category_id,
              trackingOption,
            );

          this.logger.log(
            `New Option Added to Tracking Category: ${JSON.stringify(xeroResponse.body)}`,
          );
          if (xeroResponse?.body?.options[0] !== null) {
            const contract = xeroResponse.body.options[0];
            let requestData: any = {
              contract_id: contract.trackingOptionID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              contract_name: contract.name,
              contract_status: contract.status,
              pt_contract_id: contractDetails.contract_id,
              mapped_status: data.mapped_status,
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: 'USER',
            };

            const is_edit = await this.xeroContractDetails.findOne({
              where: {
                pt_contract_id: data.contract_id,
                integration_id: xeroDetails.integration_id,
              },
            });

            if (!is_edit) {
              requestData = {
                ...requestData,
                mapped_status: data.mapped_status,
                created_by: decoded?.userId,
                created_on: moment.tz('UTC'),
                created_group: 'USER',
              };
              const response: any =
                await this.insertContractDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 12,
                dynamic_values: {
                  contract_name: contractDetails.contract_name,
                },
                project_id: null,
                contract_id: response?.id,
                reference: {
                  xeroId: response?.id,
                  paytradeId: contractDetails?.id,
                },
                reference_id: contractDetails?.id,
                history: [
                  `API triggered from contract ${contractDetails?.contract_name}`,
                  'Export successful',
                ],
                important_checks: { 'Import tracking id validation': 'Ok' },
                error_message: null,
                xero_records: [contract],
                paytrade_records: [contractDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            } else {
              requestData = {
                ...requestData,
                mapped_status: data.mapped_status,
                updated_by: decoded?.userId,
                updated_on: moment.tz('UTC'),
                updated_group: 'USER',
              };
              const response: any =
                await this.updateContractDetails(requestData);
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 12,
                dynamic_values: {
                  contract_name: contractDetails.contract_name,
                },
                project_id: null,
                contract_id: response?.id,
                reference: {
                  xeroId: response?.id,
                  paytradeId: contractDetails?.id,
                },
                reference_id: contractDetails?.id,
                history: [
                  `API triggered from contract ${contractDetails?.contract_name}`,
                  'Export successful',
                ],
                important_checks: { 'Import tracking id validation': 'Ok' },
                error_message: null,
                xero_records: [contract],
                paytrade_records: [contractDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
              return response;
            }
          } else {
            const errMsg = await handleAxiosError(xeroResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createContractInXero',
                api_payload: {
                  contract_id: data.contract_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 30,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: null,
                  paytradeId: contractDetails?.id,
                },
                reference_id: contractDetails?.id,
                history: [
                  `API triggered from contract ${contractDetails?.contract_id}`,
                  'Export failed',
                ],
                error_message: errMsg,
                important_checks: { 'Import tracking id validation': 'Ok' },
                xero_records: [],
                paytrade_records: [contractDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });

            return false;
          }
        } catch (error) {
          const errMsg = await handleAxiosError(error);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'createContractInXero',
              api_payload: {
                contract_id: data.contract_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 30,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: null,
                paytradeId: contractDetails?.id,
              },
              reference_id: contractDetails?.id,
              history: [
                `API triggered from contract ${contractDetails?.contract_id}`,
                'Export failed',
              ],
              error_message: errMsg,
              important_checks: { 'Import tracking id validation': 'Ok' },
              xero_records: [],
              paytrade_records: [contractDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getPaytradeContractDetails(contract_id) {
    return await this.contractDetails.findOne({
      where: { contract_id },
    });
  }

  async getContractDetails(pt_contract_id: number) {
    return await this.xeroContractDetails.findOne({
      where: { pt_contract_id },
    });
  }

  async getContractDetailsByContractId(
    contract_id: string,
    integration_id: number,
  ) {
    return await this.xeroContractDetails.findOne({
      where: { contract_id, integration_id },
    });
  }

  async checkContractName(company_id: number, contract_name: string) {
    const contractDetails = await this.contractDetails.find({
      where: { company_id, contract_name: ILike(`${contract_name}`) },
    });
    this.logger.log(`contractDetails: ${JSON.stringify(contractDetails)}`);
    return contractDetails;
  }

  async insertContractDetails(requestData: any) {
    const xeroContractDetails =
      await this.xeroContractDetails.create(requestData);

    return await this.xeroContractDetails.save(xeroContractDetails);
  }

  async updateContractDetails(data: any) {
    const xeroContractDetails = await this.xeroContractDetails.findOne({
      where: {
        pt_contract_id: data.pt_contract_id,
        integration_id: data.integration_id,
      },
    });
    xeroContractDetails.tenant_id = data.tenant_id;
    xeroContractDetails.integration_id = data.integration_id;
    xeroContractDetails.contract_id = data.contract_id;
    xeroContractDetails.contract_name = data.contract_name;
    xeroContractDetails.contract_status = data.contract_status;
    xeroContractDetails.mapped_status = data.mapped_status;
    xeroContractDetails.updated_by = data.updated_by;
    xeroContractDetails.updated_on = data.updated_on;
    xeroContractDetails.updated_group = data.updated_group;
    return await this.xeroContractDetails.save(xeroContractDetails);
  }

  async insertContractDetailsInPaytrade(decoded: any, data: any) {
    try {
      const { company_id, contract_id, sync_id } = data;

      const {
        contract_name,
        client_supplier_role,
        contract_status,
        contract_date,
        project_id,
        project_role,
        client_supplier_id,
        client_supplier_type,
        related_entity,
        retention_type,
        payment_terms,
        initial_contract_sum,
        contract_start_date,
        defect_liability_end_date,
      } = data.payload || {};

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails?.integrationDetails?.integration_status !==
        'Connected - active'
      )
        throw `Paytrade is currently not active in Xero.`;

      const checkExistenceInDb = await this.getContractDetailsByContractId(
        contract_id,
        xeroDetails.integration_id,
      );
      if (!checkExistenceInDb) {
        throw `Contract details not found`;
      }

      const contract = await this.getContractByContractId(
        contract_id,
        company_id,
      );
      if (!contract) {
        throw `Xero contract details not found`;
      }

      if (
        checkExistenceInDb &&
        checkExistenceInDb.pt_contract_id &&
        checkExistenceInDb.mapped_status
      ) {
        const checkExistenceInPaytrade = await this.getPaytradeContractDetails(
          checkExistenceInDb.pt_contract_id,
        );
        if (checkExistenceInPaytrade) {
          if (sync_id) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContractInPaytrade',
              api_payload: {
                contract_id,
                contract_name: contract.name,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 16,
              dynamic_values: {
                contract_name: checkExistenceInDb?.contract_name,
                status: String(contract?.status)?.toLowerCase(),
              },
              project_id: null,
              contract_id: checkExistenceInDb?.id,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkExistenceInPaytrade?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from contract ${checkExistenceInDb?.contract_name}`,
                'Import successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [contract],
              paytrade_records: [checkExistenceInPaytrade],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: checkExistenceInPaytrade.id,
              contract_id: checkExistenceInPaytrade.contract_id,
              contract_name: checkExistenceInPaytrade.contract_name,
              contract_status: checkExistenceInPaytrade.contract_status,
            };
          } else {
            throw `Contract in Xero exists already and mapped to some other contract in paytrade ${checkExistenceInDb.pt_contract_id}`;
          }
        }
      }

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createContractInPaytrade',
          api_payload: {
            contract_id: data.contract_id,
            category_type: 'contract',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 82,
          dynamic_values: {},
          project_id: null,
          contract_id: checkExistenceInDb?.id,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from contract ${checkExistenceInDb?.contract_name}`,
            'Import failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [contract],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        !contract_name ||
        !client_supplier_role ||
        !contract_status ||
        !contract_date ||
        !project_id ||
        !project_role ||
        !client_supplier_id ||
        !client_supplier_type ||
        !related_entity ||
        !retention_type ||
        !payment_terms ||
        !initial_contract_sum ||
        !contract_start_date ||
        !defect_liability_end_date
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createContractInPaytrade',
          api_payload: {
            contract_id,
            contract_name: contract.name,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 375,
          dynamic_values: {},
          project_id: null,
          contract_id: checkExistenceInDb?.id,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from contract ${checkExistenceInDb?.contract_name}`,
            'Import failed',
          ],
          error_message: `Missing mandatory fields`,
          xero_records: [contract],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      } else {
        const checkNameExistence = await this.checkContractName(
          company_id,
          contract?.name,
        );

        if (!checkNameExistence || checkNameExistence?.length == 0) {
          const response =
            await this.contractDetailsService.insertContractDetails(
              decoded,
              data?.payload,
            );
          this.logger.log(`response: ${JSON.stringify(response)}`);
          if (response) {
            const xeroContractDetails = await this.xeroContractDetails.findOne({
              where: {
                contract_id,
                integration_id: xeroDetails.integration_id,
              },
            });
            xeroContractDetails.pt_contract_id = response.contract_id;
            xeroContractDetails.mapped_status = 'System';
            xeroContractDetails.updated_by = response.created_by;
            xeroContractDetails.updated_on = response.created_on;
            xeroContractDetails.updated_group = response.created_group;
            await this.xeroContractDetails.save(xeroContractDetails);

            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 16,
              dynamic_values: {
                contract_name: response?.contract_name,
                status: String(contract?.status)?.toLowerCase(),
              },
              project_id: null,
              contract_id: xeroContractDetails?.id,
              reference: {
                xeroId: xeroContractDetails?.id,
                paytradeId: response?.id,
              },
              reference_id: xeroContractDetails?.id,
              history: [
                `API triggered from contract ${response?.contract_name}`,
                'Import successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [contract],
              paytrade_records: [response],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: response.id,
              contract_id: response.contract_id,
              contract_name: response.contract_name,
              contract_status: response.contract_status,
            };
          }
        } else {
          const checkExistenceInXero = checkNameExistence[0]?.contract_id
            ? await this.getContractDetail(
                checkNameExistence[0]?.contract_id,
                xeroDetails?.integration_id,
              )
            : null;
          if (!checkExistenceInXero) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContractInPaytrade',
              api_payload: {
                contract_id,
                contract_name: contract.name,
                mapping_contract_id: checkNameExistence[0]?.contract_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 376,
              dynamic_values: {},
              project_id: null,
              contract_id: checkExistenceInDb?.id,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from contract ${contract.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `The contract name already exists but is not linked to any Xero contract`,
              xero_records: [contract],
              paytrade_records: [checkNameExistence[0]],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createContractInPaytrade',
              api_payload: {
                contract_id,
                contract_name: contract.name,
                mapping_contract_id: checkNameExistence[0]?.contract_id,
                unmapping_contract_id: checkExistenceInXero?.contract_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 377,
              dynamic_values: {},
              project_id: null,
              contract_id: checkExistenceInDb?.id,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from contract ${contract.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `The contract name already exists and is linked to some Xero contract`,
              xero_records: [contract],
              paytrade_records: [
                {
                  ...checkNameExistence[0],
                  unmapContractDetails: checkExistenceInXero,
                },
              ],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
        }
      }
    } catch (error) {
      error = error?.message ? error?.message : error;
      throw new Error(error);
    }
  }

  async updateContractDetailsByContactId(data: any) {
    const xeroContractDetails = await this.xeroContractDetails.findOne({
      where: {
        contract_id: data.contract_id,
        integration_id: data.integration_id,
      },
    });
    xeroContractDetails.tenant_id = data.tenant_id;
    xeroContractDetails.integration_id = data.integration_id;
    xeroContractDetails.contract_id = data.contract_id;
    xeroContractDetails.contract_name = data.contract_name;
    xeroContractDetails.contract_status = data.contract_status;
    xeroContractDetails.mapped_status = data.mapped_status;
    xeroContractDetails.pt_contract_id = data.pt_contract_id;
    xeroContractDetails.updated_by = data.updated_by;
    xeroContractDetails.updated_on = data.updated_on;
    xeroContractDetails.updated_group = data.updated_group;
    return await this.xeroContractDetails.save(xeroContractDetails);
  }

  async deleteContractTrackingOptions(decoded: any, data: any) {
    try {
      const contractDetails = await this.contractDetails.findOne({
        where: { contract_id: data.contract_id },
      });
      if (!contractDetails) {
        throw `Contract details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: contractDetails.company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });

      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      if (
        xeroDetails.integrationDetails.integration_status !==
        'Connected - active'
      ) {
        throw `Paytrade is currently not active in Xero.`;
      }

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContractInXero',
          api_payload: {
            contract_id: data.contract_id,
            category_type: 'contract',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 292,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroContractDetails = await this.xeroContractDetails.findOne({
        where: {
          pt_contract_id: data.contract_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroContractDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContractInXero',
          api_payload: {
            contract_id: data.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 42,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            `Delete contract in xero failed - contract is not mapped`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: `Contract is not mapped`,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      await this.xeroService.refreshTokenSet(
        contractDetails.company_id,
        this.xero,
      );

      if (
        !xeroContractDetails.contract_id &&
        xeroContractDetails.contract_status === 'DRAFT'
      ) {
        xeroContractDetails.contract_status =
          contractDetails.contract_status === 'Deleted' ? 'ARCHIVED' : 'ACTIVE';
        xeroContractDetails.updated_by = decoded?.userId;
        xeroContractDetails.updated_on = moment.tz('UTC');
        xeroContractDetails.updated_group = 'USER';
        const xeroResponse =
          await this.xeroContractDetails.save(xeroContractDetails);
        if (xeroResponse) {
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id:
                contractDetails.contract_status === 'Deleted' ? 26 : 47,
              dynamic_values: { contract_name: contractDetails?.contract_name },
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroResponse?.id,
                paytradeId: contractDetails?.id,
              },
              reference_id: contractDetails?.id,
              history: [
                `API triggered from contract ${contractDetails?.contract_name}`,
                'Export successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [],
              paytrade_records: [contractDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );
        }
        return xeroResponse;
      }

      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const contracts = await this.xero.accountingApi.getTrackingCategories(
        xeroDetails.tenant_id,
        where,
        order,
        includeArchived,
      );

      if (!contracts || contracts.body.trackingCategories.length === 0) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContractInXero',
          api_payload: {
            contract_id: data.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 293,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            `Delete contract in xero failed - contract is not found`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: `Tracking category was not found`,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const isContractExists = contracts.body.trackingCategories.filter(
        (category) =>
          category.options.some(
            (option) =>
              option.trackingOptionID === xeroContractDetails.contract_id,
          ),
      );
      if (
        contractDetails.contract_status === 'Deleted' &&
        (!isContractExists || isContractExists.length === 0)
      ) {
        const errMsg = await handleAxiosError(contracts);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContractInXero',
          api_payload: {
            contract_id: data.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 293,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            `Delete contract in xero failed - contract is not found`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      } else if (
        contractDetails.contract_status !== 'Deleted' &&
        (!isContractExists || isContractExists.length === 0)
      ) {
        const errMsg = await handleAxiosError(contracts);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteContractInXero',
          api_payload: {
            contract_id: data.contract_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 295,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: contractDetails?.id,
          },
          reference_id: contractDetails?.id,
          history: [
            `API triggered from contract ${contractDetails?.contract_name}`,
            `Undo delete contract in xero failed - contract is not found`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [contractDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }
      try {
        const trackingOptionsResponse =
          contractDetails.contract_status === 'Deleted'
            ? await this.xero.accountingApi.deleteTrackingOptions(
                xeroDetails.tenant_id,
                xeroDetails.contract_category_id,
                xeroContractDetails.contract_id,
              )
            : await this.xero.accountingApi.createTrackingOptions(
                xeroDetails.tenant_id,
                xeroDetails.contract_category_id,
                {
                  name: xeroContractDetails.contract_name,
                  status: TrackingOption.StatusEnum.ACTIVE,
                  trackingCategoryID: xeroDetails.contract_category_id,
                },
              );
        this.logger.log(`trackingCategories: ${JSON.stringify(trackingOptionsResponse.body)}`);

        if (trackingOptionsResponse.body) {
          xeroContractDetails.contract_id =
            contractDetails.contract_status === 'Deleted'
              ? xeroContractDetails.contract_id
              : trackingOptionsResponse.body?.options[0]?.trackingOptionID;
          xeroContractDetails.contract_status =
            contractDetails.contract_status === 'Deleted'
              ? 'ARCHIVED'
              : 'ACTIVE';
          xeroContractDetails.updated_by = decoded?.userId;
          xeroContractDetails.updated_on = moment.tz('UTC');
          xeroContractDetails.updated_group = 'USER';
          const xeroResponse =
            await this.xeroContractDetails.save(xeroContractDetails);
          if (xeroResponse) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id:
                  contractDetails.contract_status === 'Deleted' ? 26 : 47,
                dynamic_values: {
                  contract_name: contractDetails?.contract_name,
                },
                project_id: null,
                contract_id: isContractExists[0]?.trackingOptionID,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: contractDetails?.id,
                },
                reference_id: contractDetails?.id,
                history: [
                  `API triggered from contract ${contractDetails?.contract_name}`,
                  'Export successful',
                ],
                important_checks: { 'Import tracking id validation': 'Ok' },
                error_message: null,
                xero_records: [isContractExists[0]],
                paytrade_records: [contractDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
          return xeroResponse;
        } else {
          const errMsg = await handleAxiosError(trackingOptionsResponse);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'deleteContractInXero',
              api_payload: {
                contract_id: data.contract_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 36,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroContractDetails.id,
                paytradeId: contractDetails?.id,
              },
              reference_id: contractDetails?.id,
              history: [
                `API triggered from contract ${contractDetails?.contract_name}`,
                `Delete contract in xero failed - contract is not updated`,
                'Export failed',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: errMsg,
              xero_records: [isContractExists[0]],
              paytrade_records: [contractDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            },
          );

          return false;
        }
      } catch (error) {
        const errMsg = await handleAxiosError(error);
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: data?.sync_id,
            api_name: 'deleteContractInXero',
            api_payload: {
              contract_id: data.contract_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 36,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: xeroContractDetails.id,
              paytradeId: contractDetails?.id,
            },
            reference_id: contractDetails?.id,
            history: [
              `API triggered from contract ${contractDetails?.contract_name}`,
              `Delete contract in xero failed - contract is not updated`,
              'Export failed',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: errMsg,
            xero_records: [isContractExists[0]],
            paytrade_records: [contractDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          },
        );

        return false;
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);

      throw errMsg;
    }
  }

  async getContractByContractId(contract_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const contracts = await this.xero.accountingApi.getTrackingCategories(
        xeroDetails.tenant_id,
        where,
        order,
        includeArchived,
      );

      if (!contracts || contracts.body.trackingCategories.length === 0) {
        throw `Tracking category was not found`;
      }

      const contractDetails = contracts.body.trackingCategories
        .map((category) => {
          const matchedOptions = category.options.filter(
            (option) => option.trackingOptionID === contract_id,
          );

          return matchedOptions.length > 0
            ? { ...category, options: matchedOptions }
            : null;
        })
        .filter(Boolean);
      this.logger.log(`contractDetails: ${JSON.stringify(contractDetails)}`);
      if (contractDetails[0] !== null) {
        return contractDetails[0]?.options[0] || false;
      }
      throw contracts;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async syncAllContractsByCompanyId(
    decoded: any,
    company_id: number,
    sync_id?: string,
  ) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
        relations: ['integrationDetails'],
      });
      if (
        !xeroDetails ||
        !xeroDetails.integration_id ||
        !xeroDetails?.integrationDetails
      ) {
        throw `No xero integration found`;
      }

      await this.xeroService.refreshTokenSet(company_id, this.xero);

      if (!xeroDetails.contract_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'syncAllContractsByCompanyId',
          api_payload: { company_id, category_type: 'contract' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 294,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: null,
          },
          reference_id: null,
          history: [`API triggered from application`, 'Import failed'],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw `Missing contract tracking category ID. Please configure the mapping in Settings to continue.`;
      }

      const where = null; // 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const newContracts = [];
      const existingContracts = [];

      let oldData = [],
        newData = [],
        syncedData = [];

      const count = { mapped: 0, unmapped: 0, total: 0 };

      const contractDetails =
        await this.xero.accountingApi.getTrackingCategories(
          xeroDetails.tenant_id,
          where,
          order,
          includeArchived,
        );

      if (
        !contractDetails ||
        contractDetails.body.trackingCategories.length === 0
      ) {
        throw `No contract was found`;
      }

      const contracts = contractDetails.body.trackingCategories.filter(
        (category) =>
          category.trackingCategoryID === xeroDetails.contract_category_id,
      );
      const existingXeroContracts =
        contracts[0]?.options?.map((c) => c.trackingOptionID) || [];

      // Fetch all contract IDs from DB in a single query
      const contractIdsInDb = await this.xeroContractDetails.find({
        where: {
          contract_id: In(existingXeroContracts),
          integration_id: xeroDetails.integration_id,
        },
        select: ['contract_id'],
      });
      const existingContractIds = new Set(
        contractIdsInDb.map((c) => c.contract_id),
      );
      const existingContractIdsSet = new Set(existingContractIds);

      //Existing contracts need to be archived if not present in xero
      const unFoundContractIdsInDb = await this.xeroContractDetails.find({
        where: {
          contract_id: Not(In(existingXeroContracts)),
          integration_id: xeroDetails.integration_id,
        },
        select: ['contract_id', 'pt_contract_id', 'contract_name'],
      });

      if (unFoundContractIdsInDb && unFoundContractIdsInDb?.length > 0) {
        const deletePtContractIds = unFoundContractIdsInDb.map(
          (c) => c.pt_contract_id,
        );

        this.logger.log(`unFoundContractIdsInDb: ${JSON.stringify(unFoundContractIdsInDb)}, deletePtContractIds: ${JSON.stringify(deletePtContractIds)}`);

        await this.xeroContractDetails
          .createQueryBuilder()
          .update(XeroContractDetails)
          .set({
            contract_status: 'ARCHIVED',
            updated_by: decoded.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(
            'contract_id NOT IN (:...contract_id) AND integration_id = :integration_id',
            {
              contract_id: existingXeroContracts,
              integration_id: xeroDetails.integration_id,
            },
          )
          .execute();

        const deletePtContractDetails = await this.contractDetails.find({
          where: {
            contract_id: In(deletePtContractIds),
            contract_status: Not('Deleted'),
          },
        });

        if (deletePtContractDetails && deletePtContractDetails?.length > 0) {
          for (const element of deletePtContractDetails) {
            try {
              const updateContractStatusRes =
                await this.contractDetailsService.updateContractStatusById(
                  element?.id,
                  decoded?.userId,
                  'Deleted',
                );
              this.logger.log(`updateContractStatusRes: ${JSON.stringify(updateContractStatusRes)}`);
            } catch (error) {
              throw error;
            }
          }
        }
      }

      // Separate new and existing contracts
      contracts[0]?.options?.forEach((contract) => {
        this.logger.log(`contract: ${contract.status}`);
        const contractData: any = {
          contract_id: contract.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          contract_name: contract.name,
          contract_status: contract.status,
        };
        if (existingContractIdsSet.has(String(contract.trackingOptionID))) {
          if (
            !existingContracts.some(
              (c) => c.contact_id === String(contract.trackingOptionID),
            )
          ) {
            existingContracts.push(contractData);
            oldData.push(contract);
          }
        } else {
          if (
            contractData &&
            contractData?.contract_status === TrackingOption.StatusEnum.ACTIVE
          ) {
            newContracts.push(contractData);
            newData.push(contract);
          }
        }
      });

      // Batch insert new contracts
      if (newContracts.length > 0) {
        const xeroContractDetails =
          await this.xeroContractDetails.create(newContracts);
        await this.xeroContractDetails.save(xeroContractDetails);
        // console.log(`Inserted ${xeroContractDetails.length} new contracts.`);
      }

      // Batch update existing contracts
      if (existingContracts.length > 0) {
        for (const contract of existingContracts) {
          await this.xeroContractDetails.update(
            {
              contract_id: contract.contract_id,
              integration_id: xeroDetails.integration_id,
            },
            contract,
          );
        }
        // console.log(`Updated ${existingContracts.length} existing contracts.`);
      }

      //automapping
      const autoMappingRecords = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          'c.contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          `LOWER(TRIM(contract.contract_name)) = LOWER(TRIM(c.contract_name)) AND c.contract_status <> 'Deleted'`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and c.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('contract.pt_contract_id IS NULL')
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      // console.log('autoMappingRecords: ', autoMappingRecords);

      const yet_to_map = autoMappingRecords?.map((res) => ({
        contract_id: res.contract_id,
        pt_contract_id: res.pt_contract_id,
      }));

      let mappedContracts = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroContractDetails
            .createQueryBuilder()
            .update(XeroContractDetails)
            .set({
              pt_contract_id: element.pt_contract_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'contract_id = :contract_id AND integration_id = :integration_id',
              {
                contract_id: element.contract_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedContracts.push(element.contract_id);
        }
      }

      // synced records
      const syncedRecords = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          'c.contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          'LOWER(TRIM(contract.contract_name)) = LOWER(TRIM(c.contract_name))',
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and c.company_id = :companyId`, {
          companyId: company_id,
        })
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      // console.log('syncedRecords: ', syncedRecords);
      const newIds = new Set(newContracts.map((r) => r.contract_id));
      const existingIds = new Set(existingContracts.map((r) => r.contract_id));
      const syncedMap = new Map<number | string, any>();
      syncedRecords.forEach((record) => {
        syncedMap.set(record.contract_id, record);
      });
      // console.log({ syncedMap });
      syncedData = contracts[0]?.options
        .map((record) => {
          const contract_id = record.trackingOptionID;
          const syncedData = syncedMap.get(contract_id);
          // console.log({ syncedData });
          let sync_status = 'Unsynced';

          if (newIds.has(contract_id) && syncedData) {
            sync_status = 'Synced';
          } else if (existingIds.has(contract_id) && syncedData) {
            sync_status = 'Already synced';
          }

          // return {
          //   ...record,
          //   ...(syncedData?.pt_contract_id && {
          //     pt_contract_id: syncedData.pt_contract_id,
          //   }),
          //   ...(syncedData?.pt_contract_name && {
          //     pt_contract_name: syncedData.pt_contract_name,
          //   }),
          //   sync_status,
          // };
          return {
            ...record,
            ...{
              pt_contract_id: syncedData?.pt_contract_id ?? null,
            },
            ...{
              pt_contract_name: syncedData?.pt_contract_name ?? null,
            },
            sync_status,
          };
        })
        .filter((record) => record.sync_status !== 'Already synced');
      // console.log({ syncedData });

      const allrecords = await this.xeroContractDetails
        .createQueryBuilder('x')
        .select([
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
          'COUNT(*)::int AS count',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId`, {
          companyId: company_id,
        })
        .groupBy(
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
        )
        .getRawMany();

      allrecords.forEach((row) => {
        count[row.status] = row.count;
        count.total += row.count;
      });
      count.mapped =
        mappedContracts && mappedContracts[0] !== null
          ? mappedContracts.length
          : 0;

      if (
        xeroDetails?.integrationDetails?.integration_status ===
        'Pending contract tracking id mapping'
      ) {
        const updateIntegrationResult = await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            integration_status: 'Connected - active',
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroDetails?.integrationDetails?.id })
          .execute();
        // console.log(updateIntegrationResult);

        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: sync_id,
            integration_id: xeroDetails?.integrationDetails?.integration_id,
            log_template_id: 4,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Import successful'],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      } else {
        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: sync_id,
            integration_id: xeroDetails?.integrationDetails?.integration_id,
            log_template_id: 8,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {},
            reference_id: null,
            history: [`API triggered from application`, 'Sync successful'],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [],
            paytrade_records: [],
            new_records: newData,
            updated_records: oldData,
            synced_records: syncedData,
          },
        );
        //
      }

      this.logger.log('All contracts fetched, inserted, and updated successfully.');
      if (newContracts || existingContracts) {
        // return 'Data synced and automapped successfully';
        return framedResponse(
          'SUCCESS',
          `Data synced and automapped successfully`,
          count,
        );
      } else {
        // return 'No data available to sync';
        return framedResponse('ERROR', `No data available to sync`, count);
      }
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async getXeroContractListsForCompany(data: GetXeroContractListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select('contract.id', 'id')
        .addSelect('contract.contract_id', 'contract_id')
        .addSelect('contract.tenant_id', 'tenant_id')
        .addSelect('contract.contract_name', 'contract_name')
        .addSelect('contract.contract_status', 'contract_status')
        .addSelect('contract.pt_contract_id', 'pt_contract_id')
        .addSelect(
          `CASE WHEN contract.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .addSelect('xero.company_id', 'company_id')
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .where(`xero.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`contract.contract_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(contract.contract_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `contract.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`contract.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(contract.contract_name)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'contract_name':
            {
              queryBuilder.orderBy({
                'LOWER(contract.contract_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
                (data.page_number - 1) * data.page_size + data.page_size,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, contract_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getPaytradeContractListsForCompany(
    data: GetPaytradeContractListsInput,
  ) {
    try {
      const queryBuilder = await this.contractDetails
        .createQueryBuilder('c')
        .select('c.id', 'id')
        .addSelect('c.contract_id', 'contract_id')
        .addSelect('c.contract_name', 'contract_name')
        .addSelect('c.contract_status', 'contract_status')
        .addSelect('contract.contract_id', 'xero_contract_id')
        .addSelect(
          `CASE WHEN contract.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = c.company_id`,
        )
        .leftJoin(
          XeroContractDetails,
          'contract',
          'contract.pt_contract_id = c.contract_id AND xero.integration_id = contract.integration_id',
        )
        .where(`c.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`c.contract_status not in ('Archived', 'Deleted')`);

      if (data.search) {
        queryBuilder.andWhere(`(LOWER(c.contract_name) LIKE LOWER(:keyword))`, {
          keyword: `%${data.search.toLowerCase()}%`,
        });
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `contract.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`contract.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(c.contract_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'contract_name':
            {
              queryBuilder.orderBy({
                'LOWER(c.contract_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      let finalResult, finalCount;
      if (data.sorting_field && data.sorting_field === 'mapped_status') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.mapped_status?.trim()?.localeCompare(b.mapped_status?.trim()),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.mapped_status?.trim()?.localeCompare(a.mapped_status?.trim()),
          );
        }

        const startIndex =
          data.page_number && data.page_size
            ? (data.page_number - 1) * data.page_size
            : 0;
        const endIndex =
          data.page_number && data.page_size
            ? Math.min(
                (data.page_number - 1) * data.page_size + data.page_size,
                sortedResult?.length,
              )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        finalResult = rawResults;
        finalCount = total_count;
      }

      return { total_count: finalCount, contract_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getMappedContractLists(data: GetMappedXeroContractListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          `CASE WHEN contract.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
          'contract.pt_contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          'contract.pt_contract_id = c.contract_id',
        )
        .where(`contract.mapped_status IN (:...mappedStatuses)`, {
          mappedStatuses: ['Manual', 'Auto', 'System'],
        })
        .andWhere(
          `xero.company_id = :companyId and c.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        )
        .andWhere(`contract.contract_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(contract.contract_name) LIKE LOWER(:keyword) OR LOWER(c.contract_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({
          'LOWER(contract.contract_name)': sorting_order,
        });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'contract_name':
            {
              queryBuilder.orderBy({
                'LOWER(contract.contract_name)': sorting_order,
              });
            }
            break;
          case 'pt_contract_name':
            {
              queryBuilder.orderBy({
                'LOWER(c.contract_name)': sorting_order,
              });
            }
            break;
        }
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      const [results, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      const rawResults = Array.from(
        new Map(results.map((result) => [result.id, result])).values(),
      );

      return { total_count, contract_list: rawResults };
    } catch (error) {
      throw error;
    }
  }

  async manualMappingContract(
    data: YetToMapContractsInput,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const checkPaytradeId = await this.xeroContractDetails.findOne({
        where: {
          pt_contract_id: data.pt_contract_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.contract_name) {
        throw `This contract has been already mapped to xero contract ${checkPaytradeId?.contract_name}`;
      }

      const checkXeroId = await this.xeroContractDetails.findOne({
        where: {
          contract_id: data.contract_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_contract_id &&
        checkXeroId?.contractDetails?.contract_name
      ) {
        throw `This contract has been already mapped to paytrade contract ${checkXeroId?.contractDetails?.contract_name ? checkXeroId?.contractDetails?.contract_name : checkXeroId.pt_contract_id}`;
      }
      const response = await this.xeroContractDetails
        .createQueryBuilder()
        .update(XeroContractDetails)
        .set({
          pt_contract_id: data.pt_contract_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contract_id = :contract_id AND integration_id = :integration_id',
          {
            contract_id: data.contract_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();
      if (response?.affected > 0) {
        return `Contracts has been mapped successfully`;
      } else {
        return `Contract is not mapped`;
      }
    } catch (error) {
      throw error;
    }
  }

  async autoMappingContract(company_id: number, decoded: any) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroContractDetails
        .createQueryBuilder('contract')
        .select([
          'contract.id AS id',
          'contract.contract_id AS contract_id',
          'contract.tenant_id AS tenant_id',
          'contract.contract_name AS contract_name',
          'contract.contract_status AS contract_status',
          'c.contract_id AS pt_contract_id',
          'c.contract_name AS pt_contract_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = contract.integration_id`,
        )
        .innerJoin(
          ContractDetails,
          'c',
          'LOWER(TRIM(contract.contract_name)) = LOWER(TRIM(c.contract_name))',
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and c.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('contract.pt_contract_id IS NULL');

      const rawResults = await queryBuilder
        .orderBy({ 'contract.contract_name': 'ASC' })
        .getRawMany();

      const yet_to_map = rawResults?.map((res) => ({
        contract_id: res.contract_id,
        pt_contract_id: res.pt_contract_id,
      }));

      let mappedContracts = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroContractDetails
            .createQueryBuilder()
            .update(XeroContractDetails)
            .set({
              pt_contract_id: element.pt_contract_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'contract_id = :contract_id AND integration_id = :integration_id',
              {
                contract_id: element.contract_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedContracts.push(element.contract_id);
        }
      }

      const allrecords = await this.xeroContractDetails
        .createQueryBuilder('x')
        .select([
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END AS status`,
          'COUNT(*)::int AS count',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId`, {
          companyId: company_id,
        })
        .groupBy(
          `CASE WHEN x.mapped_status IS NULL THEN 'unmapped' ELSE 'mapped' END`,
        )
        .getRawMany();

      const count = { mapped: 0, unmapped: 0, total: 0 };

      allrecords.forEach((row) => {
        count[row.status] = row.count;
        count.total += row.count;
      });
      count.mapped =
        mappedContracts && mappedContracts[0] !== null
          ? mappedContracts.length
          : 0;
      if (yet_to_map && yet_to_map.length > 0) {
        return framedResponse(
          'SUCCESS',
          `Contracts has been auto mapped successfully`,
          count,
        );
      } else {
        return framedResponse(
          'ERROR',
          `No Contracts available for automapping.`,
          count,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async unMappingContract(
    contract_id: string,
    company_id: number,
    decoded: any,
  ) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const response = await this.xeroContractDetails
        .createQueryBuilder()
        .update(XeroContractDetails)
        .set({
          pt_contract_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'contract_id = :contract_id AND integration_id = :integration_id',
          {
            contract_id: contract_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();
      if (response?.affected > 0) {
        return `Contracts has been unmapped successfully`;
      } else {
        return `Contracts are not unmapped`;
      }
    } catch (error) {
      throw error;
    }
  }
}
