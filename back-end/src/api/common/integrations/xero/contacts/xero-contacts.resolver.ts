import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { XeroContactsService } from './xero-contacts.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  GetMappedXeroContactListsInput,
  GetPaytradeContactListsInput,
  GetXeroContactListsInput,
  YetToMapContactsInput,
} from './dto/xero.input';
import {
  BatchCreateContactsResponse,
  GetPaytradeContactsListResponse,
  GetPaytradeContactsResponse,
  GetXeroContactsListResponse,
  GetXeroContactsResponse,
} from './response/xero.response';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { AutoMapResponse } from '../xero.response';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CreateClientSuppliersDetailInput } from 'src/api/users/client-suppliers-details/dto/create-client-suppliers-detail.input';
import { XeroWebhookService } from 'src/api/common/xero-webhooks/webhook.service';
import { XeroService } from '../xero.service';
import { XeroResolver } from '../xero.resolver';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver('XeroContacts')
export class XeroContactsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly xeroContactsService: XeroContactsService,
    private readonly xeroWebhookService: XeroWebhookService,
    private readonly xeroService: XeroService,
    private readonly xeroResolver: XeroResolver,
  ) {
    this.logger = new PaytradeLogger('XERO_CONTACTS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroContactsResponse, {
    name: 'createContactInXero',
    description: `Creates a new client/supplier contact in Xero for the authenticated user's company.`,
  })
  async createContactInXero(
    @Context() context,
    @Args('client_supplier_id', {
      description:
        'Unique identifier of the client or supplier to create in Xero.',
    })
    client_supplier_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating client supplier details with arguments client_supplier_id: ${client_supplier_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        client_supplier_id,
        mapped_status: 'System',
        sync_id,
      };

      const response: any = await this.xeroContactsService.createContact(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Client supplier details created successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact created in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contact in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroContactsResponse, {
    name: 'editContactInXero',
    description:
      'Edits an existing client/supplier contact in Xero using the provided client_supplier_id.',
  })
  async editContactInXero(
    @Context() context,
    @Args('client_supplier_id', {
      description:
        'Unique identifier of the client or supplier to edit in Xero.',
    })
    client_supplier_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for editing client supplier details with arguments client_supplier_id: ${client_supplier_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        client_supplier_id,
        sync_id,
      };

      const response: any = await this.xeroContactsService.editContact(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Client supplier details edited successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact edited in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to edit contact in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetXeroContactsResponse, {
    name: 'deleteContactInXero',
    description: `Deletes a client/supplier contact in Xero for the authenticated user's company.`,
  })
  async deleteContactInXero(
    @Context() context,
    @Args('client_supplier_id', {
      description:
        'Unique identifier of the client or supplier to delete in Xero.',
    })
    client_supplier_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Xero.',
    })
    sync_id?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting client supplier details with arguments client_supplier_id: ${client_supplier_id}`,
      );
      const { headers } = context.req;
      var companyId = headers?.companyid;
      var decoded = await this.jwtInternalService.decodeJwtToken(context);

      const xeroPayload = {
        client_supplier_id,
        sync_id,
      };

      const response: any = await this.xeroContactsService.deleteContact(
        decoded,
        xeroPayload,
      );
      this.logger.log(
        `Xero Client supplier details deleted successfully with data: ${JSON.stringify(response)}`,
      );

      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact deleted in Xero successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to delete contact in xero');
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            companyId,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeContactsResponse, {
    name: 'createContactInPaytrade',
    description:
      'Creates a new client/supplier contact in Paytrade for the specified company.',
  })
  async createContactInPaytrade(
    @Context() context,
    @Args('contact_id', {
      description:
        'Unique identifier of the client/supplier to create in Paytrade.',
    })
    contact_id: string,
    @Args('company_id', {
      description: 'ID of the company to associate the contact with.',
    })
    company_id: number,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload with additional contact details.',
    })
    payload?: CreateClientSuppliersDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating client supplier details with arguments client_supplier_id: ${contact_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      let response: any;

      if (payload) {
        const xeroPayload = {
          company_id,
          contact_id,
          sync_id,
          payload,
        };
        response =
          await this.xeroContactsService.insertContactDetailsInPaytrade(
            decoded,
            xeroPayload,
          );
      } else {
        response =
          await this.xeroContactsService.autoCreateSingleContactInPaytrade(
            decoded,
            company_id,
            contact_id,
          );
      }

      this.logger.log(
        `Paytrade Client supplier details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contact in paytrade');
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => BatchCreateContactsResponse, {
    name: 'batchCreateContactsInPaytrade',
    description:
      'Creates all unmapped Xero contacts in PayTrade for the specified company.',
  })
  async batchCreateContactsInPaytrade(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to create contacts for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for batch creating contacts in PayTrade for company: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const result =
        await this.xeroContactsService.batchCreateContactsInPaytrade(
          decoded,
          company_id,
        );
      this.logger.log(
        `Batch create contacts in PayTrade completed: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`,
      );
      return framedResponse(
        'SUCCESS',
        `Created ${result.created} contacts in PayTrade (${result.skipped} skipped, ${result.failed} failed)`,
        result,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => BatchCreateContactsResponse, {
    name: 'batchCreateContactsInXero',
    description:
      'Creates all unmapped PayTrade contacts in Xero for the specified company.',
  })
  async batchCreateContactsInXero(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company to create contacts for.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for batch creating contacts in Xero for company: ${company_id}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const result =
        await this.xeroContactsService.batchCreateContactsInXero(
          decoded,
          company_id,
        );
      this.logger.log(
        `Batch create contacts in Xero completed: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`,
      );
      return framedResponse(
        'SUCCESS',
        `Created ${result.created} contacts in Xero (${result.skipped} skipped, ${result.failed} failed)`,
        result,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => GetPaytradeContactsResponse, {
    name: 'createContactInPaytradeThroughWebhook',
    description:
      'Creates or updates a client/supplier contact in Paytrade via webhook integration.',
  })
  async createContactInPaytradeThroughWebhook(
    @Context() context,
    @Args('contact_id', {
      description:
        'Unique identifier of the client/supplier to create or update.',
    })
    contact_id: string,
    @Args('tenant_id', {
      description: 'Tenant identifier used for the webhook operation.',
    })
    tenant_id: string,
    @Args('sync_id', {
      nullable: true,
      description: 'Optional synchronization ID for Paytrade.',
    })
    sync_id?: string,
    @Args('payload', {
      nullable: true,
      description: 'Optional payload with additional contact details.',
    })
    payload?: CreateClientSuppliersDetailInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for creating client supplier details with arguments client_supplier_id: ${contact_id}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const response: any =
        await this.xeroWebhookService.handleContactCreateUpdate(
          contact_id,
          tenant_id,
          sync_id,
          payload,
          decoded,
        );
      this.logger.log(
        `Paytrade Client supplier details created successfully with data: ${JSON.stringify(response)}`,
      );
      if (response) {
        return framedResponse(
          'SUCCESS',
          'Contact created in paytrade successfully',
          response,
        );
      }
      return framedResponse('ERROR', 'Unable to create contact in paytrade');
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => StringResponse, {
    name: 'getContactByContactId',
    description:
      'Fetches a client/supplier contact using the contact_id for a specific company.',
  })
  async getContactByContactId(
    @Context() context,
    @Args('contact_id', {
      description: 'Unique identifier of the client/supplier contact to fetch.',
    })
    contact_id: string,
    @Args('company_id', {
      description: 'ID of the company to which the contact belongs.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      const response = await this.xeroContactsService.getContactByContactId(
        contact_id,
        company_id,
      );
      return framedResponse('SUCCESS', JSON.stringify(response));
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AutoMapResponse, {
    name: 'syncAllContactsByCompanyId',
    description:
      'Synchronizes all client/supplier contacts from Xero for the specified company.',
  })
  async syncAllContactsByCompanyId(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose contacts will be synchronized.',
    })
    company_id: number,
  ): Promise<any> {
    try {
      var decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroContactsService.syncAllContactsByCompanyId(
        decoded,
        company_id,
      );
      // return framedResponse('SUCCESS', response);
    } catch (error) {
      const isRefreshToken = this.xeroResolver.refreshTokenReAuthenticate({
        error,
      });

      if (isRefreshToken) {
        try {
          const response = await this.xeroService.getAuthUrl(
            company_id,
            decoded?.userId,
            decoded?.isAdmin,
            decoded?.timezone,
          );

          return framedResponse('XERO_REFRESH', response);
        } catch (error) {
          return framedResponse(
            'ERROR',
            error?.message ? error.message : error,
          );
        }
      }

      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroContactsListResponse, {
    name: 'getXeroContactListsForCompany',
    description:
      'Retrieves a list of all Xero client/supplier contacts for the given company.',
  })
  async getXeroContactListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, filters, and sync status to retrieve Xero contacts.',
    })
    payload: GetXeroContactListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contact lists: ${JSON.stringify(payload)}`,
      );
      const contactLists =
        await this.xeroContactsService.getXeroContactListsForCompany(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contactLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched contacts successfully`,
        contactLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetPaytradeContactsListResponse, {
    name: 'getPaytradeContactListsForCompany',
    description:
      'Retrieves a list of all Paytrade client/supplier contacts for the given company.',
  })
  async getPaytradeContactListsForCompany(
    @Args('payload', {
      description:
        'Input payload containing company identifier, pagination, and filters to retrieve Paytrade contacts.',
    })
    payload: GetPaytradeContactListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contact lists: ${JSON.stringify(payload)}`,
      );
      const contactLists =
        await this.xeroContactsService.getPaytradeContactListsForCompany(
          payload,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contactLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched contacts successfully`,
        contactLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => GetXeroContactsListResponse, {
    name: 'getMappedContactLists',
    description:
      'Fetches a list of Xero contacts that have been mapped to company client/supplier.',
  })
  async getMappedContactLists(
    @Args('payload', {
      description:
        'Input payload containing company identifier and filters to fetch mapped Xero contacts.',
    })
    payload: GetMappedXeroContactListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting contact lists: ${JSON.stringify(payload)}`,
      );
      const contactLists =
        await this.xeroContactsService.getMappedContactLists(payload);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(contactLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched mapped contacts successfully`,
        contactLists,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'manualMappingContact',
    description: 'Manually maps unmapped contacts to company client/supplier.',
  })
  async manualMappingContact(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing contact mapping details for manual association with company contacts.',
    })
    payload: YetToMapContactsInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroContactsService.manualMappingContact(
        payload,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => AutoMapResponse, {
    name: 'autoMappingContact',
    description:
      'Automatically maps all unmapped contacts for the specified company.',
  })
  async autoMappingContact(
    @Context() context,
    @Args('company_id', {
      description: 'ID of the company whose contacts will be auto-mapped.',
    })
    company_id: number,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return await this.xeroContactsService.autoMappingContact(
        company_id,
        decoded,
      );
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'unMappingContact',
    description:
      'Removes the mapping of a client/supplier contact from the company client/suppliers.',
  })
  async unMappingContact(
    @Context() context,
    @Args('contact_id', {
      description: 'Unique identifier of the contact to unmap.',
    })
    contact_id: string,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const companyId = headers?.companyid;
      const response = await this.xeroContactsService.unMappingContact(
        contact_id,
        companyId,
        decoded,
      );
      return framedResponse('SUCCESS', response);
    } catch (error) {
      return framedResponse('ERROR', error?.message ? error.message : error);
    }
  }
}
