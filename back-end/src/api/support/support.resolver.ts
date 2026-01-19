import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SupportService } from './support.service';
import { Public } from '../auth/jwt-guard/public.decorator';
import { RaiseATicketResponse } from './responses/support.responses';
import {
  CreateSupportTicketInput,
  FetchAllTicketsInput,
  UpdateStatusOfASupportInput,
} from './dto/support.dto';
import axios from 'axios';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-guard/jwt-auth.guard';
import {
  GetSupportTicketByIdResponse,
  GetSupportTicketListResponse,
  UpdateSupportTicketResponse,
} from './responses/support-ticket.response';
import { RolesGuard } from '../auth/role-guard/roles.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CreateActivityLogInput } from '../common/activity-log/dto/create-activity-log.input';
import { Role } from '../auth/role-guard/role.enum';
import { Roles } from '../auth/role-guard/roles.decorator';
import { ActivityLogService } from '../common/activity-log/activity-log.service';

@Resolver()
export class SupportResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly supportService: SupportService,
    private readonly jwtInternalService: JwtInternalService,
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
  @Mutation(() => RaiseATicketResponse, {
    name: 'RaiseATicket',
    description:
      'Allow a public user to submit a support ticket after validating through reCAPTCHA.',
  })
  async raiseATicket(
    @Args('payload', {
      description:
        'Payload containing support ticket details and reCAPTCHA token.',
    })
    payload: CreateSupportTicketInput,
  ) {
    try {
      this.logger.log(
        `Request received for creating a support ticket with data: ${JSON.stringify(payload)}`,
      );
      
      if (!payload.recaptcha_token) {
        this.logger.error('reCAPTCHA token is missing');
        return framedResponse(
          'ERROR',
          'Security verification is required. Please refresh the page and try again.',
        );
      }

      const recaptchaUri = process.env.RECAPTCHA_URI;
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      
      if (!recaptchaUri || !recaptchaSecret) {
        this.logger.error('reCAPTCHA configuration is missing');
        return framedResponse(
          'ERROR',
          'Server configuration error. Please contact support.',
        );
      }
      
      // Verify reCAPTCHA with timeout
      let recaptchaResponse;
      try {
        recaptchaResponse = await axios.post(
          `${recaptchaUri}${recaptchaSecret}&response=${payload.recaptcha_token}`,
          {},
          { timeout: 10000 },
        );
      } catch (recaptchaError) {
        this.logger.error(`reCAPTCHA request failed: ${recaptchaError.message}`);
        return framedResponse(
          'ERROR',
          'Security verification service is temporarily unavailable. Please try again later.',
        );
      }

      if (!recaptchaResponse.data.success) {
        this.logger.error(`reCAPTCHA verification failed: ${JSON.stringify(recaptchaResponse.data)}`);
        return framedResponse(
          'ERROR',
          'Security verification failed. Please refresh the page and try again.',
        );
      }

      // Create the support ticket
      try {
        const result = await this.supportService.createSupportTicket(payload);
        return result;
      } catch (serviceError) {
        this.logger.error(`Failed to create support ticket: ${serviceError.message}`);
        return framedResponse(
          'ERROR',
          'Failed to submit your support request. Please try again or email us directly at support@paytrade.app',
        );
      }
    } catch (error) {
      this.logger.error(
        `Unexpected error in RaiseATicket: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        'An unexpected error occurred. Please try again later or contact support.',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => GetSupportTicketByIdResponse, {
    name: 'getTicketById',
    description:
      'Fetch full details of a specific support ticket using its unique identifier.',
  })
  async getTicketById(
    @Args('id', {
      description: 'Unique identifier of the support ticket to fetch.',
    })
    id: string,
  ) {
    try {
      this.logger.log(`Request received for getTicketById with id: ${id}`);
      return await this.supportService.getTicketById(id);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => GetSupportTicketListResponse, {
    name: 'fetchAllSupportTicket',
    description:
      'Retrieve a paginated and filtered list of all submitted support tickets.',
  })
  async fetchAllSupportTicket(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing filters and pagination for support tickets.',
    })
    payload: FetchAllTicketsInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all submitted support ticket with data: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      return this.supportService.fetchAllSupportTicket(payload, timezone);
    } catch (error) {
      this.logger.error(
        `Errored while fetching all submitted support ticket with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all submitted support ticket with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => UpdateSupportTicketResponse, {
    name: 'updateSupportTicket',
    description:
      'Update the status or response message of an existing support ticket and trigger corresponding activity logs.',
  })
  async updateSupportTicket(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing support ticket ID, status, and response message.',
    })
    payload: UpdateStatusOfASupportInput,
  ) {
    try {
      this.logger.log(
        `Request received for updating the status of a support ticket with data: ${JSON.stringify(payload)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const contact = await this.supportService.updateSupportTicket(payload);

      let template_id;
      if (
        payload?.status === 'Contacted' ||
        (payload?.status === 'Received' && payload?.message)
      ) {
        template_id = 190;
      } else if (payload?.status === 'Closed') {
        template_id = 191;
      }

      if (template_id && contact?.data) {
        const ticketData = contact.data as { name?: string; email?: string };
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: template_id,
          admin_id: decoded?.userId,
          dynamic_values: {
            name: ticketData.name,
            mail_id: ticketData.email,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        console.log('ActivityLog:', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }

      return contact;
    } catch (error) {
      this.logger.error(
        `Errored while updating the status of a support ticket with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while updating the status of a support ticket with message: ${error.message}`,
      );
    }
  }
}
