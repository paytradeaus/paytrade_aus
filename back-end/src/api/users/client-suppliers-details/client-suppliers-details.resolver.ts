import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { ClientSuppliersDetailsService } from './client-suppliers-details.service';
import {
  ClientSuppliersDetailsResponse,
  FetchClientSupplierDetailsForPaymentClaimResponse,
} from './response/client-supplier-details.response';
import { CreateClientSuppliersDetailInput } from './dto/create-client-suppliers-detail.input';
import { UpdateClientSuppliersDetailInput } from './dto/update-client-suppliers-detail.input';
import {
  GetClientSuppliersListForProjectsInput,
  GetClientSuppliersListsInput,
} from './dto/get-client-suppliers-lists.input';
import { ViewClientSuppliersListResponse } from './response/view-client-suppliers-list.response';
import { ViewClientSuppliersResponse } from './response/view-client-suppliers.response';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { GetClientSuppliersListResponse } from './response/get-client-suppliers-list.response';
import { handleError } from 'src/api/common/error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { CheckExistenceForClientResponse } from './response/check-company-existence.response';
import {
  FetchClientSupplierDetailsForPaymentClaimInput,
  GetContractsListInput,
  GetProjectsListInput,
} from './dto/client-supplier-details.input';
import {
  GetContractsListResponse,
  GetProjectListResponse,
} from './response/get-project-contract-list.response';
import { XeroService } from 'src/api/common/integrations/xero/xero.service';
import { XeroContactsService } from 'src/api/common/integrations/xero/contacts/xero-contacts.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var errorMessage = '';

@Resolver()
export class ClientSuppliersDetailsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly clientSuppliersDetailsService: ClientSuppliersDetailsService,
    private readonly xeroService: XeroService,
    private readonly xeroContactsService: XeroContactsService,
  ) {
    this.logger = new PaytradeLogger('CLIENT_SUPPLIERS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BASIC_USER, Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => ClientSuppliersDetailsResponse, {
    name: 'insertClientSupplierDetails',
    description:
      'Insert new client or supplier details. Automatically syncs with Xero if integration is active.',
  })
  async insertClientSupplierDetails(
    @Context() context,
    @Args('createClientSuppliersDetailInput', {
      description:
        'Input payload containing client or supplier details to insert.',
    })
    createClientSuppliersDetailInput: CreateClientSuppliersDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating client supplier details with arguments: ${JSON.stringify(createClientSuppliersDetailInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const clientSupplierDetails =
        await this.clientSuppliersDetailsService.insertClientSupplierDetails(
          decoded,
          createClientSuppliersDetailInput,
        );
      this.logger.log(
        `Client supplier details inserted successfully with data: ${JSON.stringify(clientSupplierDetails)}`,
      );
      if (clientSupplierDetails) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          createClientSuppliersDetailInput.company_id,
        );

        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          if (
            createClientSuppliersDetailInput.client_supplier_status === 'Draft' &&
            xeroDetails.pt_to_xero_contact_auto_create
          ) {
            const payload = {
              tenant_id: xeroDetails.tenant_id,
              integration_id: xeroDetails.integration_id,
              pt_contact_id: clientSupplierDetails.client_supplier_id,
              contact_id: clientSupplierDetails.id,
              contact_name:
                createClientSuppliersDetailInput.client_supplier_name,
              contact_status: 'DRAFT',
              mapped_status: 'System',
              client_email_id: createClientSuppliersDetailInput.client_email_id,
              client_phone_no: createClientSuppliersDetailInput.client_phone_no,
              client_supplier_address:
                createClientSuppliersDetailInput.client_supplier_address,
              country: createClientSuppliersDetailInput.country,
              created_by: createClientSuppliersDetailInput.created_by,
              created_on: createClientSuppliersDetailInput.created_on,
              created_group: createClientSuppliersDetailInput.created_group,
            };

            const response: any =
              await this.xeroContactsService.insertContactDetails(payload);
            this.logger.log(
              `Xero Client supplier details inserted successfully for contact: ${payload?.contact_name}`,
            );

            if (response) {
              const addSyncLogResponse =
                await this.xeroService.insertXeroSyncLogs(decoded, {
                  integration_id: xeroDetails.integration_id,
                  log_template_id: 18,
                  dynamic_values: { contact_name: response?.contact_name },
                  project_id: null,
                  contract_id: null,
                  reference: {
                    xeroId: response?.id,
                    paytradeId: clientSupplierDetails?.id,
                  },
                  reference_id: clientSupplierDetails?.id,
                  history: [
                    `API triggered from client/suppliers ${payload?.contact_name}`,
                    'Export will not occur in draft state',
                  ],
                  important_checks: {},
                  error_message: null,
                  xero_records: [],
                  paytrade_records: [clientSupplierDetails],
                  new_records: null,
                  updated_records: null,
                  synced_records: null,
                });
            }
          } else if (
            createClientSuppliersDetailInput.client_supplier_status ===
            'Completed'
          ) {
            if (xeroDetails.pt_to_xero_contact_auto_create) {
              const xeroPayload = {
                client_supplier_id: clientSupplierDetails.client_supplier_id,
                mapped_status: 'System',
              };

              const xeroResponse: any =
                await this.xeroContactsService.createContact(
                  decoded,
                  xeroPayload,
                );
              this.logger.log(
                `Xero Client supplier auto-created for contact: ${clientSupplierDetails.client_supplier_id}`,
              );
            }
          }
        }
        return framedResponse(
          'SUCCESS',
          `This Client/Supplier has been added.`,
          clientSupplierDetails,
        );
      }
      throw new Error(`Failed to add Client/ Suppliers details`);
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
  @Query(() => ViewClientSuppliersListResponse, {
    name: 'getClientSupplierListsForCompany',
    description: 'Retrieve the list of client/supplier records for a company.',
  })
  async getClientSupplierListsForCompany(
    @Context() context,
    @Args('getClientSupplierListsInput', {
      description:
        'Input containing company ID and optional filters for listing clients/suppliers.',
    })
    getClientSupplierListsInput: GetClientSuppliersListsInput,
  ) {
    try {
      this.logger.log(
        `Handling request for getting client supplier lists with data: ${JSON.stringify(getClientSupplierListsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const response =
        await this.clientSuppliersDetailsService.getClientSupplierListsForCompany(
          getClientSupplierListsInput,
          timezone,
        );
      this.logger.log(
        `Response received with client supplier lists: ${JSON.stringify(response)}`,
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
  @Query(() => ViewClientSuppliersResponse, {
    name: 'viewClientSuppliersDetails',
    description: 'View details of a specific client or supplier by ID.',
  })
  async viewClientSuppliersDetails(
    @Context() context,
    @Args('id', {
      description: 'The unique identifier of the client or supplier',
    })
    id: string,
  ) {
    try {
      this.logger.log(
        `Request received for viewing client supplier details with id: ${id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.clientSuppliersDetailsService.viewClientSuppliersDetails(id);
      this.logger.log(
        `Fetched client supplier details with data: ${JSON.stringify(response)}`,
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
  @Mutation(() => ClientSuppliersDetailsResponse, {
    name: 'editClientSuppliersDetailsById',
    description:
      'Edit existing client/supplier details by ID and sync changes with Xero if integration is active.',
  })
  async editClientSuppliersDetailsById(
    @Context() context,
    @Args('updateClientSuppliersDetailInput', {
      description:
        'Input payload containing the updated client or supplier details.',
    })
    updateClientSuppliersDetailInput: UpdateClientSuppliersDetailInput,
  ) {
    try {
      this.logger.log(
        `Request received for editing the client supplier details with input: ${JSON.stringify(updateClientSuppliersDetailInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const clientSuppliersDetails =
        await this.clientSuppliersDetailsService.getClientSuppliersDetailsById(
          updateClientSuppliersDetailInput.id,
        );

      const editClientSuppliersDetailsRes =
        await this.clientSuppliersDetailsService.editClientSuppliersDetailsById(
          updateClientSuppliersDetailInput,
          decoded,
        );
      this.logger.log(`editClientSupplierDetails: id=${editClientSuppliersDetailsRes?.id}`);
      this.logger.log(
        `Response received for editing client supplier: id=${editClientSuppliersDetailsRes?.id}`,
      );

      if (editClientSuppliersDetailsRes) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          updateClientSuppliersDetailInput.company_id,
        );
        if (
          xeroDetails &&
          xeroDetails.integration_id &&
          xeroDetails?.integrationDetails &&
          xeroDetails?.integrationDetails?.integration_status ===
            'Connected - active'
        ) {
          const isContactExists =
            await this.xeroContactsService.getContactDetails(
              clientSuppliersDetails.client_supplier_id,
              xeroDetails.integration_id,
            );
          if (!isContactExists && xeroDetails.pt_to_xero_contact_auto_create) {
            if (
              updateClientSuppliersDetailInput.client_supplier_status ===
                'Completed'
            ) {
              const xeroPayload = {
                client_supplier_id: clientSuppliersDetails.client_supplier_id,
                mapped_status: 'System',
              };
              try {
                const xeroResponse: any =
                  await this.xeroContactsService.createContact(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(
                  `Auto-created contact in Xero for PT contact ${clientSuppliersDetails.client_supplier_id}: id=${xeroResponse?.id || xeroResponse}`,
                );
              } catch (xeroErr) {
                this.logger.warn(
                  `Auto-create contact in Xero failed for PT contact ${clientSuppliersDetails.client_supplier_id}: ${xeroErr?.message || xeroErr}`,
                );
              }
            }
          } else if (isContactExists) {
            if (
              clientSuppliersDetails.client_supplier_status === 'Draft' &&
              updateClientSuppliersDetailInput.client_supplier_status ===
                'Draft'
            ) {
              const payload = {
                tenant_id: xeroDetails.tenant_id,
                integration_id: xeroDetails.integration_id,
                contact_id: clientSuppliersDetails.id,
                contact_name:
                  updateClientSuppliersDetailInput.client_supplier_name,
                pt_contact_id: clientSuppliersDetails.client_supplier_id,
                updated_by: updateClientSuppliersDetailInput.updated_by,
                updated_on: updateClientSuppliersDetailInput.updated_on,
                updated_group: updateClientSuppliersDetailInput.updated_group,
              };

              const response: any =
                await this.xeroContactsService.updateContactDetails(payload);
              this.logger.log(
                `Xero Client supplier details updated successfully for contact: ${payload?.contact_name}`,
              );
              if (response) {
                const addSyncLogResponse =
                  await this.xeroService.insertXeroSyncLogs(decoded, {
                    integration_id: xeroDetails.integration_id,
                    log_template_id: 22,
                    dynamic_values: {
                      contact_name: response?.contact_name,
                    },
                    project_id: null,
                    contract_id: null,
                    reference: {
                      xeroId: response?.id,
                      paytradeId: clientSuppliersDetails?.id,
                    },
                    reference_id: clientSuppliersDetails?.id,
                    history: [
                      `API triggered from client/suppliers ${payload?.contact_name}`,
                      'Export will not occur in draft state',
                    ],
                    important_checks: {},
                    error_message: null,
                    xero_records: [],
                    paytrade_records: [clientSuppliersDetails],
                    new_records: null,
                    updated_records: null,
                    synced_records: null,
                  });
              }
            } else if (
              clientSuppliersDetails.client_supplier_status === 'Draft' &&
              updateClientSuppliersDetailInput.client_supplier_status ===
                'Completed'
            ) {
              if (xeroDetails.pt_to_xero_contact_auto_create) {
                const xeroPayload = {
                  client_supplier_id: clientSuppliersDetails.client_supplier_id,
                  mapped_status: 'System',
                };

                try {
                  const xeroResponse: any =
                    await this.xeroContactsService.createContact(
                      decoded,
                      xeroPayload,
                    );
                  this.logger.log(
                    `Xero Client supplier auto-created for contact: ${clientSuppliersDetails.client_supplier_id}: id=${xeroResponse?.id || xeroResponse}`,
                  );
                } catch (xeroErr) {
                  this.logger.warn(
                    `Auto-create contact in Xero failed (Draft→Completed) for PT contact ${clientSuppliersDetails.client_supplier_id}: ${xeroErr?.message || xeroErr}`,
                  );
                }
              }
            } else if (
              clientSuppliersDetails.client_supplier_status === 'Completed'
            ) {
              const xeroPayload = {
                client_supplier_id: clientSuppliersDetails.client_supplier_id,
              };
              try {
                const xeroResponse: any =
                  await this.xeroContactsService.editContact(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(
                  `Xero Client supplier details synced for contact: ${clientSuppliersDetails.client_supplier_id}`,
                );
              } catch (xeroErr) {
                this.logger.warn(
                  `Xero edit contact sync failed for PT contact ${clientSuppliersDetails.client_supplier_id}: ${xeroErr?.message || xeroErr}`,
                );
              }
            }
          }
        }

        return framedResponse(
          'SUCCESS',
          `Client/Supplier has been updated.`,
          editClientSuppliersDetailsRes,
        );
      }
      throw new Error(`Failed to edit the Client/Supplier, please try again`);
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
  @Mutation(() => ClientSuppliersDetailsResponse, {
    name: 'updateClientSuppliersStatusById',
    description:
      'Update the status of a client/supplier record (archive or restore). Syncs with Xero if integration is active.',
  })
  async updateClientSuppliersStatusById(
    @Context() context,
    @Args('id', {
      description: 'The unique identifier of the client or supplier record',
    })
    id: string,
    @Args('is_deleted', {
      description:
        'Boolean flag to archive (true) or restore (false) the record',
    })
    is_deleted: Boolean,
  ) {
    try {
      this.logger.log(
        `Request received for updating the client supplier status with id: ${id} and is_deleted: ${is_deleted}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const clientSuppliersDetails =
        await this.clientSuppliersDetailsService.getClientSuppliersDetailsById(
          id,
        );
      if (clientSuppliersDetails) {
        const xeroDetails = await this.xeroService.getIntegrationDetails(
          clientSuppliersDetails.company_id,
        );
        if (xeroDetails) {
          const xeroContactDetails =
            await this.xeroContactsService.getContactDetails(
              clientSuppliersDetails.client_supplier_id,
              xeroDetails.integration_id,
            );
          if (
            !is_deleted &&
            xeroContactDetails &&
            xeroContactDetails.contact_status === 'ARCHIVED'
          )
            throw `The specified Client/Supplier details match an archived Xero contact. Since archived contacts cannot be edited via the Xero API, the client/supplier cannot be removed from the archive.`;
        }

        const updateClientSuppliersDetailsRes =
          await this.clientSuppliersDetailsService.updateClientSuppliersStatusById(
            id,
            is_deleted,
            decoded,
          );
        this.logger.log(
          `Response received after updating the client suppliers status with data: ${JSON.stringify(updateClientSuppliersDetailsRes)}`,
        );
        if (updateClientSuppliersDetailsRes) {
          if (
            xeroDetails &&
            xeroDetails.integration_id &&
            xeroDetails?.integrationDetails &&
            xeroDetails?.integrationDetails?.integration_status ===
              'Connected - active'
          ) {
            if (is_deleted) {
              const isContactExists =
                await this.xeroContactsService.getContactDetails(
                  clientSuppliersDetails.client_supplier_id,
                  xeroDetails.integration_id,
                );
              if (isContactExists) {
                const xeroPayload = {
                  client_supplier_id: clientSuppliersDetails.client_supplier_id,
                };
                const xeroResponse: any =
                  await this.xeroContactsService.deleteContact(
                    decoded,
                    xeroPayload,
                  );
                this.logger.log(
                  `Xero Client supplier details deleted successfully with data: ${JSON.stringify(xeroResponse)}`,
                );
              }
            }
          }
          const successMessage = is_deleted
            ? 'This Client/Supplier record has been archived.'
            : 'This record has been removed from the archive.';
          return framedResponse(
            'SUCCESS',
            successMessage,
            updateClientSuppliersDetailsRes,
          );
        }
        throw new Error(`Unable to edit the Client/Supplier, please try again`);
      }
      throw new Error(`Unable to edit the Client/Supplier, please try again`);
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
  @Query(() => GetClientSuppliersListResponse, {
    name: 'getClientSupplierLists',
    description: 'Fetch all client/supplier lists for a given company.',
  })
  async getClientSupplierLists(
    @Context() context,
    @Args('company_id', { description: 'The unique identifier of the company' })
    company_id: number,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.clientSuppliersDetailsService.getClientSupplierLists(
          company_id,
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
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => ViewClientSuppliersListResponse, {
    name: 'getClientSuppliersListByProjectId',
    description:
      'Retrieve client/supplier lists associated with a specific project.',
  })
  async getClientSuppliersListByProjectId(
    @Context() context,
    @Args('getClientSuppliersListForProjectsInput', {
      description:
        'Input containing project ID and optional filters to fetch client/supplier lists.',
    })
    getClientSuppliersListForProjectsInput: GetClientSuppliersListForProjectsInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with input:: ${JSON.stringify(getClientSuppliersListForProjectsInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const response =
        await this.clientSuppliersDetailsService.getClientSuppliersListByProjectId(
          getClientSuppliersListForProjectsInput,
          timezone,
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
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => CheckExistenceForClientResponse, {
    name: 'checkExistenceForClient',
    description:
      'Check if a client/supplier exists based on name, email, QBCC number, and type for a given company.',
  })
  async checkExistenceForClient(
    @Context() context,
    @Args('company_id', { description: 'The unique identifier of the company' })
    company_id: number,
    @Args('client_supplier_type', {
      description: 'Type of record: either "Client" or "Supplier"',
    })
    client_supplier_type: string,
    @Args('client_supplier_name', {
      nullable: true,
      description: 'Name of the client or supplier (optional)',
    })
    client_supplier_name?: string,
    @Args('client_email_id', {
      nullable: true,
      description: 'Email address of the client or supplier (optional)',
    })
    client_email_id?: string,
    @Args('qbcc_number', {
      nullable: true,
      description: 'QBCC license number of the client or supplier (optional)',
    })
    qbcc_number?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: company_id:: ${company_id} and client_supplier_name:: ${client_supplier_name} and client_email_id:: ${client_email_id} and qbcc_number:: ${qbcc_number} `,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const clientSuppliersDetails =
        await this.clientSuppliersDetailsService.checkExistenceForClient(
          company_id,
          client_supplier_type,
          client_supplier_name,
          client_email_id,
          qbcc_number,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(clientSuppliersDetails)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        clientSuppliersDetails,
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
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => FetchClientSupplierDetailsForPaymentClaimResponse, {
    name: 'fetchClientSupplierDetailsForPaymentClaim',
    description:
      'Fetch client/supplier details relevant to a specific payment claim.',
  })
  async fetchClientSupplierDetailsForPaymentClaim(
    @Context() context,
    @Args('payload', {
      nullable: true,
      description:
        'Optional input containing contract or project details for fetching client/supplier information.',
    })
    payload?: FetchClientSupplierDetailsForPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching client supplier details for payment claim with contract_id: ${payload.contract_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const clientSuppliersDetails =
        await this.clientSuppliersDetailsService.fetchClientSupplierDetailsForPaymentClaim(
          payload,
        );

      return framedResponse(
        'SUCCESS',
        `Client supplier details fetched successfully for payment claim.`,
        clientSuppliersDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching client supplier details for payment claim with contract_id: ${payload.contract_id} with message: ${error}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetProjectListResponse, {
    name: 'getProjectsListByClientSupplierId',
    description:
      'Get a list of projects associated with a specific client/supplier ID.',
  })
  async getProjectsListByClientSupplierId(
    @Context() context,
    @Args('getProjectsListInput', {
      description:
        'Input containing the client/supplier ID to fetch associated projects.',
    })
    getProjectsListInput: GetProjectsListInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with input:: ${JSON.stringify(getProjectsListInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.clientSuppliersDetailsService.getProjectsListByClientSupplierId(
          getProjectsListInput,
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
  @Query(() => GetContractsListResponse, {
    name: 'getContractsListByClientSupplierId',
    description:
      'Get a list of contracts associated with a specific client/supplier ID.',
  })
  async getContractsListByClientSupplierId(
    @Context() context,
    @Args('getContractsListInput', {
      description:
        'Input containing the client/supplier ID to fetch associated contracts.',
    })
    getContractsListInput: GetContractsListInput,
  ) {
    try {
      this.logger.log(
        `Request recieved while entering the client with input:: ${JSON.stringify(getContractsListInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response =
        await this.clientSuppliersDetailsService.getContractsListByClientSupplierId(
          getContractsListInput,
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
}
