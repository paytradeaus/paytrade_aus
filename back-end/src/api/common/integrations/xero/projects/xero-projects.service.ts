import { Injectable } from '@nestjs/common';
import { TrackingOption, XeroClient } from 'xero-node';
import * as dotenv from 'dotenv';
import {
  GetMappedXeroProjectListsInput,
  GetPaytradeProjectListsInput,
  GetXeroProjectListsInput,
  YetToMapProjectsInput,
} from './dto/xero.input';
import { XeroIntegrationDetails } from 'src/entities/xero-integration-details.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { XeroProjectDetails } from 'src/entities/xero-project-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { XeroService } from '../xero.service';
import { handleAxiosError } from 'src/api/common/error-handler';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ProjectsService } from 'src/api/users/projects/projects.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
dotenv.config();

@Injectable()
export class XeroProjectsService {
  private logger = new PaytradeLogger('XERO_PROJECTS_SERVICE');
  private xero: XeroClient;
  constructor(
    @InjectRepository(XeroIntegrationDetails)
    private xeroIntegrationDetails: Repository<XeroIntegrationDetails>,
    @InjectRepository(XeroProjectDetails)
    private xeroProjectDetails: Repository<XeroProjectDetails>,
    @InjectRepository(ProjectDetails)
    private projectDetails: Repository<ProjectDetails>,
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    private readonly xeroService: XeroService,
    private readonly projectsService: ProjectsService,
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

  async getProjectsDetails(project_id) {
    return await this.projectDetails.findOne({
      where: { project_id },
    });
  }

  async getXeroProjectDetails(pt_project_id: number) {
    return await this.xeroProjectDetails.findOne({
      where: { pt_project_id },
    });
  }

  async checkProjectName(company_id: number, project_name: string) {
    const projectDetails = await this.projectDetails.find({
      where: { company_id, project_name: ILike(`${project_name}`) },
    });
    this.logger.log(`projectDetails: ${JSON.stringify(projectDetails)}`);
    return projectDetails;
  }

  async createXeroProject(decoded: any, data: any) {
    const { company_id, contact_id } = data;
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
    await this.xeroService.refreshTokenSet(company_id, this.xero);

    const contactsResponse = await this.xero.accountingApi.getContacts(
      xeroDetails.tenant_id,
    );
    // console.log('contactsResponse: ', contactsResponse.body.contacts);
    const contact = contactsResponse.body.contacts.find(
      (c) => c.name === 'Peter Collis',
    );
    // console.log('contact: ', contact);

    if (!contact) throw new Error('Contact not found');
    const contactId = contact?.contactID;
    this.logger.log(`contactId: ${contactId}`);
    if (!contactId) throw new Error('Contact ID is missing');
    const projectData = {
      name: 'Website Redesign',
      deadlineUtc: new Date('2025-05-31T23:59:59Z'),
      estimateAmount: 15000,
      // customerId: contactId, // must be a valid customer from Projects
      // contactId: contactId,
    };

    const response = await this.xero.projectApi.createProject(
      xeroDetails.tenant_id,
      projectData,
    );
    this.logger.log(`Created project: ${JSON.stringify(response.body)}`);
    return response;
  }

  async createProjectTrackingOptions(decoded: any, data: any) {
    try {
      const projectDetails = await this.projectDetails.findOne({
        where: { project_id: data.project_id },
      });
      if (!projectDetails) {
        throw `Project details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: projectDetails.company_id, status: 'ACTIVE' },
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
        projectDetails.company_id,
        this.xero,
      );

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createProjectInXero',
          api_payload: {
            project_id: data.project_id,
            category_type: 'project',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 79,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: projectDetails?.id,
          },
          reference_id: projectDetails?.id,
          history: [
            `API triggered from project ${projectDetails?.project_name}`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [projectDetails],
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
              projectDetails.project_name?.trim()?.toLowerCase(),
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
        const project = checkExistenceInXero[0]?.options[0];
        let requestData: any = {
          project_id: project.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          project_name: project.name,
          project_status: project.status,
          pt_project_id: projectDetails.project_id,
          mapped_status: data.mapped_status,
        };
        const checkExistenceInDb = await this.getProjectDetailsByProjectId(
          project.trackingOptionID,
          xeroDetails.integration_id,
        );
        if (checkExistenceInDb && checkExistenceInDb?.id) {
          if (
            checkExistenceInDb.pt_project_id &&
            checkExistenceInDb.pt_project_id !== projectDetails.project_id
          ) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              api_name: 'createProjectInXero',
              api_payload: {
                pt_project_id: data.project_id,
                project_id: project.trackingOptionID,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 286,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: projectDetails?.id,
              },
              reference_id: projectDetails?.id,
              history: [
                `API triggered from project ${projectDetails?.project_name}`,
                'Export failed',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: `Project in Xero exists already and mapped to some other project in paytrade ${checkExistenceInDb.pt_project_id}`,
              xero_records: [project],
              paytrade_records: [projectDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }
          requestData = {
            ...requestData,
            created_on: moment.tz('UTC'),
            created_by: decoded?.userId,
            created_group: 'USER',
          };
          const response =
            await this.updateProjectDetailsByProjectId(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 11,
            dynamic_values: { project_name: projectDetails.project_name },
            project_id: response?.id,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: projectDetails?.id,
            },
            reference_id: projectDetails?.id,
            history: [
              `API triggered from project ${projectDetails?.project_name}`,
              'Export successful',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [project],
            paytrade_records: [projectDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        } else {
          requestData = {
            ...requestData,
            updated_on: moment.tz('UTC'),
            updated_by: decoded?.userId,
            updated_group: 'USER',
          };
          const response: any = await this.insertProjectDetails(requestData);
          await this.xeroService.insertXeroSyncLogs(decoded, {
            id: data?.sync_id,
            integration_id: xeroDetails.integration_id,
            log_template_id: 11,
            dynamic_values: { project_name: projectDetails.project_name },
            project_id: response?.id,
            contract_id: null,
            reference: {
              xeroId: response?.id,
              paytradeId: projectDetails?.id,
            },
            reference_id: projectDetails?.id,
            history: [
              `API triggered from project ${projectDetails?.project_name}`,
              'Export successful',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: null,
            xero_records: [project],
            paytrade_records: [projectDetails],
            new_records: null,
            updated_records: null,
            synced_records: null,
          });
          return response;
        }
      } else {
        try {
          const trackingOption: any = {
            name: projectDetails.project_name,
            status: TrackingOption.StatusEnum.ACTIVE,
            trackingCategoryID: xeroDetails.project_category_id,
          };
          const xeroResponse =
            await this.xero.accountingApi.createTrackingOptions(
              xeroDetails.tenant_id,
              xeroDetails.project_category_id,
              trackingOption,
            );

          this.logger.log(
            `New Option Added to Tracking Category: ${JSON.stringify(xeroResponse?.body)}`,
          );
          if (xeroResponse?.body?.options[0] !== null) {
            const project = xeroResponse.body.options[0];
            let requestData: any = {
              project_id: project.trackingOptionID,
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              project_name: project.name,
              project_status: project.status,
              pt_project_id: projectDetails.project_id,
              mapped_status: data.mapped_status,
              created_by: decoded?.userId,
              created_on: moment.tz('UTC'),
              created_group: 'USER',
            };
            const response: any = await this.insertProjectDetails(requestData);
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: data?.sync_id,
              integration_id: xeroDetails.integration_id,
              log_template_id: 11,
              dynamic_values: { project_name: projectDetails.project_name },
              project_id: response?.id,
              contract_id: null,
              reference: {
                xeroId: response?.id,
                paytradeId: projectDetails?.id,
              },
              reference_id: projectDetails?.id,
              history: [
                `API triggered from project ${projectDetails?.project_name}`,
                'Export successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [project],
              paytrade_records: [projectDetails],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return response;
          } else {
            const errMsg = await handleAxiosError(xeroResponse);
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                api_name: 'createProjectInXero',
                api_payload: {
                  project_id: data.project_id,
                },
                integration_id: xeroDetails.integration_id,
                log_template_id: 29,
                dynamic_values: {},
                project_id: null,
                contract_id: null,
                reference: {
                  xeroId: null,
                  paytradeId: projectDetails?.id,
                },
                reference_id: projectDetails?.id,
                history: [
                  `API triggered from project ${projectDetails?.project_name}`,
                  'Export failed',
                ],
                error_message: errMsg,
                important_checks: { 'Import tracking id validation': 'Ok' },
                xero_records: [],
                paytrade_records: [projectDetails],
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
              api_name: 'createProjectInXero',
              api_payload: {
                project_id: data.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 29,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: null,
                paytradeId: projectDetails?.id,
              },
              reference_id: projectDetails?.id,
              history: [
                `API triggered from project ${projectDetails?.project_name}`,
                'Export failed',
              ],
              error_message: errMsg,
              important_checks: { 'Import tracking id validation': 'Ok' },
              xero_records: [],
              paytrade_records: [projectDetails],
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

  async getProjectDetails(pt_project_id: number, integration_id: number) {
    return await this.xeroProjectDetails.findOne({
      where: { pt_project_id, integration_id },
    });
  }

  async getProjectDetailsByProjectId(
    project_id: string,
    integration_id: number,
  ) {
    return await this.xeroProjectDetails.findOne({
      where: { project_id, integration_id },
    });
  }

  async insertProjectDetails(requestData: any) {
    const xeroProjectDetails =
      await this.xeroProjectDetails.create(requestData);

    return await this.xeroProjectDetails.save(xeroProjectDetails);
  }

  async insertProjectDetailsInPaytrade(decoded: any, data: any) {
    try {
      const { company_id, project_id, sync_id } = data;

      const {
        project_name,
        project_role,
        project_date,
        project_description,
        site_address,
        country,
        region,
        place_id,
        latitude,
        longitude,
        head_contract_sum,
        retention_type,
        number_of_units,
        pta_eligibility,
        rta_eligibility,
        project_status,
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

      const checkExistenceInDb = await this.getProjectDetailsByProjectId(
        project_id,
        xeroDetails.integration_id,
      );
      if (!checkExistenceInDb) {
        throw `Project details not found`;
      }

      const project = await this.getProjectByProjectId(project_id, company_id);
      if (!project) {
        throw `Xero project details not found`;
      }

      if (
        checkExistenceInDb &&
        checkExistenceInDb.pt_project_id &&
        checkExistenceInDb.mapped_status
      ) {
        const checkExistenceInPaytrade = await this.getProjectsDetails(
          checkExistenceInDb.pt_project_id,
        );
        if (checkExistenceInPaytrade) {
          if (sync_id) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createProjectInPaytrade',
              api_payload: {
                project_id,
                project_name: project.name,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 15,
              dynamic_values: {
                project_name: checkExistenceInDb?.project_name,
                status: String(project?.status)?.toLowerCase(),
              },
              project_id: checkExistenceInDb?.id,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkExistenceInPaytrade?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from project ${checkExistenceInDb?.project_name}`,
                'Import successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [project],
              paytrade_records: [checkExistenceInPaytrade],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: checkExistenceInPaytrade.id,
              project_id: checkExistenceInPaytrade.project_id,
              project_name: checkExistenceInPaytrade.project_name,
              project_status: checkExistenceInPaytrade.project_status,
            };
          } else {
            throw `Project in Xero exists already and mapped to some other project in paytrade ${checkExistenceInDb.pt_project_id}`;
          }
        }
      }

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'createProjectInPaytrade',
          api_payload: {
            project_id: data.project_id,
            category_type: 'project',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 81,
          dynamic_values: {},
          project_id: checkExistenceInDb?.id,
          contract_id: null,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from project ${checkExistenceInDb?.project_name}`,
            'Import failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [project],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      if (
        !project_name ||
        !project_role ||
        !project_date ||
        !project_description ||
        !site_address ||
        !country ||
        !region ||
        !place_id ||
        !latitude ||
        !longitude ||
        !head_contract_sum ||
        !retention_type ||
        !number_of_units ||
        !pta_eligibility ||
        !rta_eligibility ||
        !project_status
      ) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id || null,
          api_name: 'createProjectInPaytrade',
          api_payload: {
            project_id,
            project_name: project.name,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 372,
          dynamic_values: {},
          project_id: checkExistenceInDb?.id,
          contract_id: null,
          reference: {
            xeroId: checkExistenceInDb?.id,
            paytradeId: null,
          },
          reference_id: checkExistenceInDb?.id,
          history: [
            `API triggered from project ${checkExistenceInDb?.project_name}`,
            'Import failed',
          ],
          error_message: `Missing mandatory fields`,
          xero_records: [project],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      } else {
        const checkNameExistence = await this.checkProjectName(
          company_id,
          project?.name,
        );

        if (!checkNameExistence || checkNameExistence?.length == 0) {
          const response: any = await this.projectsService.insertProjectDetails(
            decoded,
            data.payload,
          );
          this.logger.log(`response: ${JSON.stringify(response)}`);
          if (
            response &&
            response?.warning &&
            response?.warningMessage
              ?.toLowerCase()
              ?.includes('Please upgrade your subscription plan'.toLowerCase())
          ) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createProjectInPaytrade',
              api_payload: {
                project_id,
                project_name: project.name,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 398,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: null,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from project ${project?.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: response?.warningMessage,
              xero_records: [project],
              paytrade_records: [],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          }

          if (response) {
            const xeroProjectDetails = await this.xeroProjectDetails.findOne({
              where: {
                project_id,
                integration_id: xeroDetails.integration_id,
              },
            });
            xeroProjectDetails.pt_project_id = response.project_id;
            xeroProjectDetails.mapped_status = 'System';
            xeroProjectDetails.updated_by = response.created_by;
            xeroProjectDetails.updated_on = response.created_on;
            xeroProjectDetails.updated_group = response.created_group;
            await this.xeroProjectDetails.save(xeroProjectDetails);

            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createProjectInPaytrade',
              integration_id: xeroDetails.integration_id,
              log_template_id: 15,
              dynamic_values: {
                project_name: response?.project_name,
                status: String(project?.status)?.toLowerCase(),
              },
              project_id: xeroProjectDetails?.id,
              contract_id: null,
              reference: {
                xeroId: xeroProjectDetails?.id,
                paytradeId: response?.id,
              },
              reference_id: xeroProjectDetails?.id,
              history: [
                `API triggered from project ${response?.project_name}`,
                'Import successful',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: null,
              xero_records: [project],
              paytrade_records: [response],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });

            return {
              id: response.id,
              project_id: response.project_id,
              project_name: response.project_name,
              project_status: response.project_status,
            };
          }
        } else {
          const checkExistenceInXero = checkNameExistence[0]?.project_id
            ? await this.getProjectDetails(
                checkNameExistence[0]?.project_id,
                xeroDetails?.integration_id,
              )
            : null;
          if (!checkExistenceInXero) {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createProjectInPaytrade',
              api_payload: {
                project_id,
                project_name: project.name,
                mapping_project_id: checkNameExistence[0]?.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 373,
              dynamic_values: {},
              project_id: checkExistenceInDb?.id,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from project ${project.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `The project name already exists but is not linked to any Xero project`,
              xero_records: [project],
              paytrade_records: [checkNameExistence[0]],
              new_records: null,
              updated_records: null,
              synced_records: null,
            });
            return false;
          } else {
            await this.xeroService.insertXeroSyncLogs(decoded, {
              id: sync_id || null,
              api_name: 'createProjectInPaytrade',
              api_payload: {
                project_id,
                project_name: project.name,
                mapping_project_id: checkNameExistence[0]?.project_id,
                unmapping_project_id: checkExistenceInXero?.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 374,
              dynamic_values: {},
              project_id: checkExistenceInDb?.id,
              contract_id: null,
              reference: {
                xeroId: checkExistenceInDb?.id,
                paytradeId: checkNameExistence[0]?.id,
              },
              reference_id: checkExistenceInDb?.id,
              history: [
                `API triggered from project ${project.name}`,
                'Import failed',
              ],
              important_checks: {
                'Import data format validation': 'Failed',
              },
              error_message: `The project name already exists and is linked to some Xero project`,
              xero_records: [project],
              paytrade_records: [
                {
                  ...checkNameExistence[0],
                  unmapProjectDetails: checkExistenceInXero,
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

  async updateProjectDetailsByProjectId(data: any) {
    const xeroProjectDetails = await this.xeroProjectDetails.findOne({
      where: {
        project_id: data.project_id,
        integration_id: data.integration_id,
      },
    });
    xeroProjectDetails.tenant_id = data.tenant_id;
    xeroProjectDetails.integration_id = data.integration_id;
    xeroProjectDetails.project_id = data.project_id;
    xeroProjectDetails.project_name = data.project_name;
    xeroProjectDetails.project_status = data.project_status;
    xeroProjectDetails.mapped_status = data.mapped_status;
    xeroProjectDetails.pt_project_id = data.pt_project_id;
    xeroProjectDetails.updated_by = data.updated_by;
    xeroProjectDetails.updated_on = data.updated_on;
    xeroProjectDetails.updated_group = data.updated_group;
    return await this.xeroProjectDetails.save(xeroProjectDetails);
  }

  async deleteProjectTrackingOptions(decoded: any, data: any) {
    try {
      const projectDetails = await this.projectDetails.findOne({
        where: { project_id: data.project_id },
      });
      if (!projectDetails) {
        throw `Project details not found`;
      }

      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: projectDetails.company_id, status: 'ACTIVE' },
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

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteProjectInXero',
          api_payload: {
            project_id: data.project_id,
            category_type: 'project',
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 287,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: projectDetails?.id,
          },
          reference_id: projectDetails?.id,
          history: [
            `API triggered from project ${projectDetails?.project_name}`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Failed' },
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [projectDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const xeroProjectDetails = await this.xeroProjectDetails.findOne({
        where: {
          pt_project_id: data.project_id,
          integration_id: xeroDetails.integration_id,
        },
      });

      if (!xeroProjectDetails) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteProjectInXero',
          api_payload: {
            project_id: data.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 41,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: projectDetails?.id,
          },
          reference_id: projectDetails?.id,
          history: [
            `API triggered from project ${projectDetails?.project_name}`,
            `Delete project in xero failed - project is not mapped`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: `Project is not mapped`,
          xero_records: [],
          paytrade_records: [projectDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      await this.xeroService.refreshTokenSet(
        projectDetails.company_id,
        this.xero,
      );

      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const projects = await this.xero.accountingApi.getTrackingCategories(
        xeroDetails.tenant_id,
        where,
        order,
        includeArchived,
      );

      if (!projects || projects.body.trackingCategories.length === 0) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteProjectInXero',
          api_payload: {
            project_id: data.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 288,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: projectDetails?.id,
          },
          reference_id: projectDetails?.id,
          history: [
            `API triggered from project ${projectDetails?.project_name}`,
            `Delete project in xero failed - project is not found`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: `Tracking category was not found`,
          xero_records: [],
          paytrade_records: [projectDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      const isProjectExists = projects.body.trackingCategories.filter(
        (category) =>
          category.options.some(
            (option) =>
              option.trackingOptionID === xeroProjectDetails.project_id,
          ),
      );

      if (!isProjectExists || isProjectExists.length === 0) {
        const errMsg = await handleAxiosError(projects);
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: data?.sync_id,
          api_name: 'deleteProjectInXero',
          api_payload: {
            project_id: data.project_id,
          },
          integration_id: xeroDetails.integration_id,
          log_template_id: 288,
          dynamic_values: {},
          project_id: null,
          contract_id: null,
          reference: {
            xeroId: null,
            paytradeId: projectDetails?.id,
          },
          reference_id: projectDetails?.id,
          history: [
            `API triggered from project ${projectDetails?.project_name}`,
            `Delete project in xero failed - project is not found`,
            'Export failed',
          ],
          important_checks: { 'Import tracking id validation': 'Ok' },
          error_message: errMsg,
          xero_records: [],
          paytrade_records: [projectDetails],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        return false;
      }

      try {
        const deleteProjectResponse =
          await this.xero.accountingApi.deleteTrackingOptions(
            xeroDetails.tenant_id,
            xeroDetails.project_category_id,
            xeroProjectDetails.project_id,
          );

        this.logger.log(`trackingCategories: ${JSON.stringify(deleteProjectResponse)}`);
        if (deleteProjectResponse.body) {
          xeroProjectDetails.project_status = 'ARCHIVED';
          xeroProjectDetails.updated_by = decoded?.userId;
          xeroProjectDetails.updated_on = moment.tz('UTC');
          xeroProjectDetails.updated_group = 'USER';
          const xeroResponse =
            await this.xeroProjectDetails.save(xeroProjectDetails);
          if (xeroResponse) {
            const addSyncLogResponse =
              await this.xeroService.insertXeroSyncLogs(decoded, {
                id: data?.sync_id,
                integration_id: xeroDetails.integration_id,
                log_template_id: 25,
                dynamic_values: { project_name: projectDetails?.project_name },
                project_id: isProjectExists[0]?.trackingOptionID,
                contract_id: null,
                reference: {
                  xeroId: xeroResponse?.id,
                  paytradeId: projectDetails?.id,
                },
                reference_id: projectDetails?.id,
                history: [
                  `API triggered from project ${projectDetails?.project_name}`,
                  'Export successful',
                ],
                important_checks: { 'Import tracking id validation': 'Ok' },
                error_message: null,
                xero_records: [isProjectExists[0]],
                paytrade_records: [projectDetails],
                new_records: null,
                updated_records: null,
                synced_records: null,
              });
          }
          return xeroResponse;
        } else {
          const errMsg = await handleAxiosError(deleteProjectResponse);
          const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
            decoded,
            {
              id: data?.sync_id,
              api_name: 'deleteProjectInXero',
              api_payload: {
                project_id: data.project_id,
              },
              integration_id: xeroDetails.integration_id,
              log_template_id: 35,
              dynamic_values: {},
              project_id: null,
              contract_id: null,
              reference: {
                xeroId: xeroProjectDetails.id,
                paytradeId: projectDetails?.id,
              },
              reference_id: projectDetails?.id,
              history: [
                `API triggered from project ${projectDetails?.project_name}`,
                `Delete project in xero failed - project is not updated`,
                'Export failed',
              ],
              important_checks: { 'Import tracking id validation': 'Ok' },
              error_message: errMsg,
              xero_records: [isProjectExists[0]],
              paytrade_records: [projectDetails],
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
            api_name: 'deleteProjectInXero',
            api_payload: {
              project_id: data.project_id,
            },
            integration_id: xeroDetails.integration_id,
            log_template_id: 35,
            dynamic_values: {},
            project_id: null,
            contract_id: null,
            reference: {
              xeroId: xeroProjectDetails.id,
              paytradeId: projectDetails?.id,
            },
            reference_id: projectDetails?.id,
            history: [
              `API triggered from project ${projectDetails?.project_name}`,
              `Delete project in xero failed - project is not updated`,
              'Export failed',
            ],
            important_checks: { 'Import tracking id validation': 'Ok' },
            error_message: errMsg,
            xero_records: [isProjectExists[0]],
            paytrade_records: [projectDetails],
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

  async getProjectByProjectId(project_id: string, company_id: number) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;
      await this.xeroService.refreshTokenSet(company_id, this.xero);
      const where = 'Status=="ACTIVE"';
      const order = 'Name ASC';
      const includeArchived = true;

      const projects = await this.xero.accountingApi.getTrackingCategories(
        xeroDetails.tenant_id,
        where,
        order,
        includeArchived,
      );

      if (!projects || projects.body.trackingCategories.length === 0) {
        throw `Tracking category was not found`;
      }

      const projectDetails = projects.body.trackingCategories
        .map((category) => {
          const matchedOptions = category.options.filter(
            (option) => option.trackingOptionID === project_id,
          );

          return matchedOptions.length > 0
            ? { ...category, options: matchedOptions }
            : null;
        })
        .filter(Boolean);

      if (projectDetails[0] !== null) {
        return projectDetails[0]?.options[0] || false;
      }
      throw projects;
    } catch (error) {
      const errMsg = await handleAxiosError(error);
      throw errMsg;
    }
  }

  async syncAllProjectsByCompanyId(
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

      if (
        xeroDetails.action_buttons.import_project === false &&
        xeroDetails?.integrationDetails?.integration_status !==
          'Pending project tracking id mapping'
      ) {
        throw `Unauthorized to perform this action`;
      }

      if (!xeroDetails.project_category_id) {
        await this.xeroService.insertXeroSyncLogs(decoded, {
          id: sync_id,
          api_name: 'syncAllProjectsByCompanyId',
          api_payload: { company_id, category_type: 'project' },
          integration_id: xeroDetails.integration_id,
          log_template_id: 289,
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
          error_message: `Missing project tracking category ID. Please configure the mapping in Settings to continue.`,
          xero_records: [],
          paytrade_records: [],
          new_records: null,
          updated_records: null,
          synced_records: null,
        });
        throw `Missing project tracking category ID. Please configure the mapping in Settings to continue.`;
      }

      const where = null;
      const order = 'Name ASC';
      const includeArchived = true;

      let newProjects = [];
      let existingProjects = [];

      let oldData = [],
        newData = [],
        syncedData = [];

      const count = { mapped: 0, unmapped: 0, total: 0 };

      const projectDetails =
        await this.xero.accountingApi.getTrackingCategories(
          xeroDetails.tenant_id,
          where,
          order,
          includeArchived,
        );

      if (
        !projectDetails ||
        projectDetails.body.trackingCategories.length === 0
      ) {
        throw `No project was found`;
      }

      const projects = projectDetails.body.trackingCategories.filter(
        (category) =>
          category.trackingCategoryID === xeroDetails.project_category_id,
      );
      const existingXeroProjects =
        projects[0]?.options?.map((p) => p.trackingOptionID) || [];

      let projectIdsInDb = [];
      let existingProjectIds = new Set<string>();
      let existingProjectIdsSet = new Set<string>();
      let unFoundProjectIdsInDb = [];

      if (existingXeroProjects.length > 0) {
        projectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            project_id: In(existingXeroProjects),
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id'],
        });
        existingProjectIds = new Set(
          projectIdsInDb.map((p) => p.project_id),
        );
        existingProjectIdsSet = new Set(existingProjectIds);

        unFoundProjectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            project_id: Not(In(existingXeroProjects)),
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id', 'pt_project_id', 'project_name'],
        });
      } else {
        unFoundProjectIdsInDb = await this.xeroProjectDetails.find({
          where: {
            integration_id: xeroDetails.integration_id,
          },
          select: ['project_id', 'pt_project_id', 'project_name'],
        });
      }

      if (unFoundProjectIdsInDb && unFoundProjectIdsInDb?.length > 0) {
        const deletePtProjectIds = unFoundProjectIdsInDb.map(
          (c) => c.pt_project_id,
        );

        this.logger.log(`unFoundProjectIdsInDb: ${JSON.stringify(unFoundProjectIdsInDb)}, deletePtProjectIds: ${JSON.stringify(deletePtProjectIds)}`);

        const archiveQuery = this.xeroProjectDetails
          .createQueryBuilder()
          .update(XeroProjectDetails)
          .set({
            project_status: 'ARCHIVED',
            updated_by: decoded.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          });

        if (existingXeroProjects.length > 0) {
          archiveQuery.where(
            'project_id NOT IN (:...project_id) AND integration_id = :integration_id',
            {
              project_id: existingXeroProjects,
              integration_id: xeroDetails.integration_id,
            },
          );
        } else {
          archiveQuery.where(
            'integration_id = :integration_id',
            { integration_id: xeroDetails.integration_id },
          );
        }

        await archiveQuery.execute();

        const deletePtProjectDetails = await this.projectDetails.find({
          where: {
            project_id: In(deletePtProjectIds),
            project_status: Not('Deleted'),
          },
        });

        if (deletePtProjectDetails && deletePtProjectDetails?.length > 0) {
          for (const element of deletePtProjectDetails) {
            try {
              const updateProjectStatusRes =
                await this.projectsService.updateProjectStatusById(
                  element?.id,
                  decoded?.userId,
                  'Deleted',
                );
              this.logger.log(`updateProjectStatusRes: ${JSON.stringify(updateProjectStatusRes)}`);
            } catch (error) {
              throw error;
            }
          }
        }
      }

      // Separate new and existing projects
      projects[0]?.options?.forEach((project) => {
        this.logger.log(`project: ${project.status}`);
        const projectData: any = {
          project_id: project.trackingOptionID,
          tenant_id: xeroDetails.tenant_id,
          integration_id: xeroDetails.integration_id,
          project_name: project.name,
          project_status: project.status,
        };

        if (existingProjectIdsSet.has(String(project.trackingOptionID))) {
          if (
            !existingProjects.some(
              (c) => c.project_id === String(project.trackingOptionID),
            )
          ) {
            existingProjects.push(projectData);
            oldData.push(project);
          }
        } else {
          if (
            projectData &&
            projectData?.project_status === TrackingOption.StatusEnum.ACTIVE
          ) {
            newProjects.push(projectData);
            newData.push(project);
          }
        }
      });
      // Batch insert new projects
      if (newProjects.length > 0) {
        const xeroProjectDetails =
          await this.xeroProjectDetails.create(newProjects);
        await this.xeroProjectDetails.save(xeroProjectDetails);
      }

      // Batch update existing projects
      if (existingProjects.length > 0) {
        for (const project of existingProjects) {
          await this.xeroProjectDetails.update(
            {
              project_id: project.project_id,
              integration_id: xeroDetails.integration_id,
            },
            project,
          );
        }
      }

      //automapping
      const autoMappingRecords = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          'p.project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(
          ProjectDetails,
          'p',
          `LOWER(TRIM(project.project_name)) = LOWER(TRIM(p.project_name)) AND p.project_status <> 'Deleted'`,
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and p.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('project.pt_project_id IS NULL')
        .orderBy({ 'project.project_name': 'ASC' })
        .getRawMany();

      // console.log('autoMappingRecords: ', autoMappingRecords);

      const yet_to_map = autoMappingRecords?.map((res) => ({
        project_id: res.project_id,
        pt_project_id: res.pt_project_id,
      }));
      let mappedProjects = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroProjectDetails
            .createQueryBuilder()
            .update(XeroProjectDetails)
            .set({
              pt_project_id: element.pt_project_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'project_id = :project_id AND integration_id = :integration_id',
              {
                project_id: element.project_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedProjects.push(element.project_id);
        }
      }

      // synced records
      const syncedRecords = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          'p.project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(
          ProjectDetails,
          'p',
          'LOWER(TRIM(project.project_name)) = LOWER(TRIM(p.project_name))',
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and p.company_id = :companyId`, {
          companyId: company_id,
        })
        .orderBy({ 'project.project_name': 'ASC' })
        .getRawMany();
      // console.log('syncedRecords: ', syncedRecords);
      const newIds = new Set(newProjects.map((r) => r.project_id));
      const existingIds = new Set(existingProjects.map((r) => r.project_id));
      const syncedMap = new Map<number | string, any>();
      syncedRecords.forEach((record) => {
        syncedMap.set(record.project_id, record);
      });
      // console.log({ syncedMap });
      syncedData = projects[0]?.options
        .map((record) => {
          const project_id = record.trackingOptionID;
          const syncedData = syncedMap.get(project_id);
          // console.log({ syncedData });
          let sync_status = 'Unsynced';

          if (newIds.has(project_id) && syncedData) {
            sync_status = 'Synced';
          } else if (existingIds.has(project_id) && syncedData) {
            sync_status = 'Already synced';
          }

          return {
            ...record,
            ...{
              pt_project_id: syncedData?.pt_project_id ?? null,
            },
            ...{
              pt_project_name: syncedData?.pt_project_name ?? null,
            },
            sync_status,
          };
        })
        .filter((record) => record.sync_status !== 'Already synced');
      // console.log({ syncedData });

      const allrecords = await this.xeroProjectDetails
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
        mappedProjects && mappedProjects[0] !== null
          ? mappedProjects.length
          : 0;

      if (
        xeroDetails.action_buttons.import_project === false &&
        xeroDetails?.integrationDetails?.integration_status ===
          'Pending project tracking id mapping'
      ) {
        const updateIntegrationResult = await this.integrationDetails
          .createQueryBuilder()
          .update(IntegrationDetails)
          .set({
            integration_status: 'Pending contract tracking id mapping',
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroDetails?.integrationDetails?.id })
          .execute();
        // console.log(updateIntegrationResult);

        xeroDetails.action_buttons.import_project = true;
        const updateXeroResult = await this.xeroIntegrationDetails
          .createQueryBuilder()
          .update(XeroIntegrationDetails)
          .set({
            action_buttons: xeroDetails.action_buttons,
            updated_by: decoded?.userId,
            updated_on: moment.tz('UTC'),
            updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
          })
          .where(`id = :id`, { id: xeroDetails.id })
          .execute();
        // console.log(updateXeroResult);

        const addSyncLogResponse = await this.xeroService.insertXeroSyncLogs(
          decoded,
          {
            id: sync_id,
            integration_id: xeroDetails?.integrationDetails?.integration_id,
            log_template_id: 3,
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
            log_template_id: 7,
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

      this.logger.log('All projects fetched, inserted, and updated successfully.');
      if (newProjects || existingProjects) {
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

  async getXeroProjectListsForCompany(data: GetXeroProjectListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select('project.id', 'id')
        .addSelect('project.project_id', 'project_id')
        .addSelect('project.tenant_id', 'tenant_id')
        .addSelect('project.project_name', 'project_name')
        .addSelect('project.project_status', 'project_status')
        .addSelect('project.pt_project_id', 'pt_project_id')
        .addSelect(
          `CASE WHEN project.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .addSelect('xero.company_id', 'company_id')
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .where(`xero.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`project.project_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(project.project_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `project.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`project.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(project.project_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'project_name':
            {
              queryBuilder.orderBy({
                'LOWER(project.project_name)': sorting_order,
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

      return { total_count: finalCount, project_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getPaytradeProjectListsForCompany(data: GetPaytradeProjectListsInput) {
    try {
      const queryBuilder = await this.projectDetails
        .createQueryBuilder('p')
        .select('p.id', 'id')
        .addSelect('p.project_id', 'project_id')
        .addSelect('p.project_name', 'project_name')
        .addSelect('p.project_status', 'project_status')
        .addSelect('project.project_id', 'xero_project_id')
        .addSelect(
          `CASE WHEN project.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
        )
        .leftJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.company_id = p.company_id`,
        )
        .leftJoin(
          XeroProjectDetails,
          'project',
          'project.pt_project_id = p.project_id AND xero.integration_id = project.integration_id',
        )
        .where(`p.company_id = :companyId`, {
          companyId: data.company_id,
        })
        .andWhere(`p.project_status not in ('Archived', 'Deleted')`);

      if (data.search) {
        queryBuilder.andWhere(`(LOWER(p.project_name) LIKE LOWER(:keyword))`, {
          keyword: `%${data.search.toLowerCase()}%`,
        });
      }

      if (data.mapped_status) {
        if (data.mapped_status === 'Mapped') {
          queryBuilder.andWhere(
            `project.mapped_status IN (:...mappedStatuses)`,
            {
              mappedStatuses: ['Manual', 'Auto', 'System'],
            },
          );
        } else {
          queryBuilder.andWhere(`project.mapped_status IS NULL`);
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'ASC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(p.project_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field && data.sorting_field !== 'mapped_status') {
        switch (data.sorting_field) {
          case 'project_name':
            {
              queryBuilder.orderBy({
                'LOWER(p.project_name)': sorting_order,
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

      return { total_count: finalCount, project_list: finalResult };
    } catch (error) {
      throw error;
    }
  }

  async getMappedProjectLists(data: GetMappedXeroProjectListsInput) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id: data.company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          `CASE WHEN project.mapped_status IN ('Manual', 'Auto', 'System') THEN 'Mapped' ELSE 'Unmapped' END`,
          'mapped_status',
          'project.pt_project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(ProjectDetails, 'p', 'project.pt_project_id = p.project_id')
        .where(`project.mapped_status IN (:...mappedStatuses)`, {
          mappedStatuses: ['Manual', 'Auto', 'System'],
        })
        .andWhere(
          `xero.company_id = :companyId and p.company_id = :companyId`,
          {
            companyId: data.company_id,
          },
        )
        .andWhere(`project.project_status <> 'ARCHIVED'`);

      if (data.search) {
        queryBuilder.andWhere(
          `(LOWER(project.project_name) LIKE LOWER(:keyword) OR LOWER(p.project_name) LIKE LOWER(:keyword))`,
          {
            keyword: `%${data.search.toLowerCase()}%`,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'LOWER(project.project_name)': sorting_order });
        if (data.page_number && data.page_size) {
          queryBuilder
            .offset((data.page_number - 1) * data.page_size)
            .limit(data.page_size);
        }
      }

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'project_name':
            {
              queryBuilder.orderBy({
                'LOWER(project.project_name)': sorting_order,
              });
            }
            break;
          case 'pt_project_name':
            {
              queryBuilder.orderBy({
                'LOWER(p.project_name)': sorting_order,
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

      return { total_count, project_list: rawResults };
    } catch (error) {
      throw error;
    }
  }

  async manualMappingProject(
    data: YetToMapProjectsInput,
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

      const checkPaytradeId = await this.xeroProjectDetails.findOne({
        where: {
          pt_project_id: data.pt_project_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (checkPaytradeId && checkPaytradeId?.project_name) {
        throw `This project has been already mapped to xero project ${checkPaytradeId?.project_name}`;
      }

      const checkXeroId = await this.xeroProjectDetails.findOne({
        where: {
          project_id: data.project_id,
          integration_id: xeroDetails.integration_id,
        },
      });
      if (
        checkXeroId &&
        checkXeroId.pt_project_id &&
        checkXeroId?.projectDetails?.project_name
      ) {
        throw `This project has been already mapped to paytrade project ${checkXeroId?.projectDetails?.project_name ? checkXeroId?.projectDetails?.project_name : checkXeroId.pt_project_id}`;
      }

      const response = await this.xeroProjectDetails
        .createQueryBuilder()
        .update(XeroProjectDetails)
        .set({
          pt_project_id: data.pt_project_id,
          mapped_status: 'Manual',
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'project_id = :project_id AND integration_id = :integration_id',
          {
            project_id: data.project_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();
      if (response?.affected > 0) {
        return `Projects has been mapped successfully`;
      } else {
        return `Project is not mapped`;
      }
    } catch (error) {
      throw error;
    }
  }

  async autoMappingProject(company_id: number, decoded: any) {
    try {
      const xeroDetails = await this.xeroIntegrationDetails.findOne({
        where: { company_id, status: 'ACTIVE' },
      });
      if (!xeroDetails) throw `No xero integration found`;

      const queryBuilder = await this.xeroProjectDetails
        .createQueryBuilder('project')
        .select([
          'project.id AS id',
          'project.project_id AS project_id',
          'project.tenant_id AS tenant_id',
          'project.project_name AS project_name',
          'project.project_status AS project_status',
          'p.project_id AS pt_project_id',
          'p.project_name AS pt_project_name',
        ])
        .innerJoin(
          XeroIntegrationDetails,
          'xero',
          `xero.status = 'ACTIVE' AND xero.integration_id = project.integration_id`,
        )
        .innerJoin(
          ProjectDetails,
          'p',
          'LOWER(TRIM(project.project_name)) = LOWER(TRIM(p.project_name))',
        )
        .distinct(true)
        .where(`xero.company_id = :companyId and p.company_id = :companyId`, {
          companyId: company_id,
        })
        .andWhere('project.pt_project_id IS NULL');

      const rawResults = await queryBuilder
        .orderBy({ 'project.project_name': 'ASC' })
        .getRawMany();

      const yet_to_map = rawResults?.map((res) => ({
        project_id: res.project_id,
        pt_project_id: res.pt_project_id,
      }));
      let mappedProjects = [];
      if (yet_to_map && yet_to_map.length > 0) {
        for (const element of yet_to_map) {
          await this.xeroProjectDetails
            .createQueryBuilder()
            .update(XeroProjectDetails)
            .set({
              pt_project_id: element.pt_project_id,
              mapped_status: 'Auto',
              updated_by: decoded.userId,
              updated_on: moment.tz('UTC'),
              updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
            })
            .where(
              'project_id = :project_id AND integration_id = :integration_id',
              {
                project_id: element.project_id,
                integration_id: xeroDetails.integration_id,
              },
            )
            .execute();
          mappedProjects.push(element.project_id);
        }

        // const unmappedRecords = await this.xeroProjectDetails
        //   .createQueryBuilder('x')
        //   .select(['x.id AS id', 'x.mapped_status AS mapped_status'])
        //   .innerJoin(XeroIntegrationDetails, 'xero', `xero.status = 'ACTIVE' AND xero.integration_id = x.integration_id`)
        //   .distinct(true)
        //   .where(`xero.company_id = :companyId`, {
        //     companyId: company_id,
        //   })
        //   .getRawMany();
      }

      const allrecords = await this.xeroProjectDetails
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
        mappedProjects && mappedProjects[0] !== null
          ? mappedProjects.length
          : 0;
      if (yet_to_map && yet_to_map.length > 0) {
        return framedResponse(
          'SUCCESS',
          `Projects has been auto mapped successfully`,
          count,
        );
      } else {
        return framedResponse(
          'ERROR',
          `No Projects available for automapping.`,
          count,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async unMappingProject(project_id: string, company_id: number, decoded: any) {
    try {
      const xeroDetails = company_id
        ? await this.xeroIntegrationDetails.findOne({
            where: { company_id, status: 'ACTIVE' },
          })
        : null;
      if (!xeroDetails) throw `No xero integration found`;

      const response = await this.xeroProjectDetails
        .createQueryBuilder()
        .update(XeroProjectDetails)
        .set({
          pt_project_id: null,
          mapped_status: null,
          updated_by: decoded.userId,
          updated_on: moment.tz('UTC'),
          updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
        })
        .where(
          'project_id = :project_id AND integration_id = :integration_id',
          {
            project_id: project_id,
            integration_id: xeroDetails.integration_id,
          },
        )
        .execute();
      if (response?.affected > 0) {
        return `Projects has been unmapped successfully`;
      } else {
        return `Projects are not unmapped`;
      }
    } catch (error) {
      throw error;
    }
  }
}
