import {
  FetchAllContactsInput,
  FetchInformationsOfAContactInput,
  SearchContactByEmailInput,
  SubmitAContactInput,
  UpdateStatusOfAContactInput,
} from './dto/contacts.dto';
import {
  FetchAllContactsResponse,
  FetchInformationsOfAContactResponse,
  SearchContactByEmailIdResponse,
  SubmitAContactResponse,
  UpdateStatusOfAContactResponse,
} from './responses/contacts.responses';
import { ContactsService } from './contacts.service';
import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-auth.guard';
import { Role } from '../auth/role-guard/role.enum';
import { Roles } from '../auth/role-guard/roles.decorator';
import { RolesGuard } from '../auth/role-guard/roles.guard';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Public } from '../auth/jwt-guard/public.decorator';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CreateActivityLogInput } from '../common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from '../common/activity-log/activity-log.service';
const axios = require('axios');

@Resolver()
export class ContactsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly contactsService: ContactsService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('CONTACTS_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @Public()
  @Mutation(() => SubmitAContactResponse, {
    name: 'submitAContact',
    description:
      'Allow a public user to submit a contact request after successful reCAPTCHA verification.',
  })
  async submitAContact(
    @Args('payload', {
      description: 'Payload containing contact details and reCAPTCHA token.',
    })
    payload: SubmitAContactInput,
  ) {
    try {
      this.logger.log(
        `Request received for submitting a contact with data: ${JSON.stringify(payload)}`,
      );
      if (payload.recaptcha_token) {
        const response = await axios.post(
          `${process.env.RECAPTCHA_URI}${process.env.RECAPTCHA_SECRET_KEY}&response=${payload.recaptcha_token}`,
        );
        if (response.data.success) {
          const contactDetails = payload;

          return await this.contactsService.submitAContact(contactDetails);
        }
        return framedResponse(
          'ERROR',
          `Robot detected while submitting a contact with message: ${response.data['error-codes']}`,
        );
      }
      return framedResponse(
        'ERROR',
        `Error in Token while submitting a contact`,
      );
    } catch (error) {
      this.logger.error(
        `Errored while submitting a contact with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while submitting a contact with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchInformationsOfAContactResponse, {
    name: 'fetchInformationsOfAContact',
    description:
      'Retrieve detailed information of a specific contact using the contact identifier.',
  })
  async fetchInformationsOfAContact(
    @Args('payload', {
      description: 'Payload containing the contact ID to fetch details for.',
    })
    payload: FetchInformationsOfAContactInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching informations of a contact with id: ${payload.contactId}`,
      );
      const contactId = payload.contactId;

      return await this.contactsService.fetchInformationsOfAContact(contactId);
    } catch (error) {
      this.logger.error(
        `Errored while fetching informations of a contact with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching informations of a contact with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Query(() => FetchAllContactsResponse, {
    name: 'fetchAllContacts',
    description:
      'Retrieve a paginated and filtered list of all submitted contact requests.',
  })
  async fetchAllContacts(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing filters and pagination options for contacts.',
    })
    payload: FetchAllContactsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all submitted contacts with data: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      return this.contactsService.fetchAllContacts(payload, timezone);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all submitted contacts with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all submitted contacts with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Query(() => SearchContactByEmailIdResponse, {
    name: 'searchContactByEmailId',
    description:
      'Search for an existing contact record using the contact email address.',
  })
  async searchContactByEmailId(
    @Args('payload', {
      description: 'Payload containing the email address to search for.',
    })
    payload: SearchContactByEmailInput,
  ) {
    try {
      this.logger.log(
        `Request received for searching a contact by emailId with data: ${JSON.stringify(payload)}`,
      );

      return this.contactsService.searchContactByEmailId(payload.searchEmail);
    } catch (error) {
      this.logger.error(
        `Errored while searching a contact by emailId with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while searching a contact by emailId with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => UpdateStatusOfAContactResponse, {
    name: 'updateStatusOfAContact',
    description:
      'Update the status of a contact request and log the corresponding admin activity.',
  })
  async updateStatusOfAContact(
    @Context() context,
    @Args('payload', {
      description: 'Payload containing contact ID and new status for update.',
    })
    payload: UpdateStatusOfAContactInput,
  ) {
    try {
      this.logger.log(
        `Request received for updating the status of a contact with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const contact =
        await this.contactsService.updateStatusOfAContact(payload);

      let template_id;
      if (payload.status === 'Contacted') {
        template_id = 190;
      } else if (payload.status === 'Closed') {
        template_id = 191;
      }

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: template_id,
        admin_id: decoded?.userId,
        dynamic_values: {
          name: contact.data.name,
          mail_id: contact.data.email,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      console.log('ActivityLog:', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return contact;
    } catch (error) {
      this.logger.error(
        `Errored while updating the status of a contact with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating the status of a contact with message: ${error.message}`,
      );
    }
  }
}
