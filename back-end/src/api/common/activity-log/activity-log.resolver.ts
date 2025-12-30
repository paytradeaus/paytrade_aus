import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogResponse } from './response/activity-log.response';
import { CreateActivityLogInput } from './dto/create-activity-log.input';
import { ActivityLogListResponse } from './response/activity-log-list.response';
import { GetActivityLogInput } from './dto/get-activity-log.input';
import {
  EventGroupResponse,
  UsersListResponse,
} from './response/event-group-list.response';
import { handleError } from '../error-handler';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
var moment = require('moment-timezone');
// moment.tz.setDefault('UTC');

@Resolver(() => ActivityLogResponse)
export class ActivityLogResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('ACTIVITY_LOG');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => ActivityLogResponse, {
    name: 'insertActivityLog',
    description:
      'Create a new activity log entry for the current authenticated user or system event.',
  })
  async insertActivityLog(
    @Context() context,
    @Args('createActivityLogInput', {
      description:
        'Input payload containing event template ID, dynamic values, actor details, and metadata required to create a new activity log entry.',
    })
    createActivityLogInput: CreateActivityLogInput,
  ) {
    try {
      this.logger.log(
        `Request received for inserting the activity log with data: ${JSON.stringify(createActivityLogInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const activityLogResponse =
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(activityLogResponse)}`,
      );
      if (activityLogResponse) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          activityLogResponse,
        );
      }
      return framedResponse('ERROR', `Error in insertion of Activity Logs`);
    } catch (error) {
      this.logger.error(
        `Errored while inserting the activity log with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors
        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => ActivityLogListResponse, {
    name: 'getActivityLog',
    description:
      'Retrieve activity logs with filters, pagination, and timezone formatting for the current user.',
  })
  async getActivityLog(
    @Context() context,
    @Args('getActivityLogInput', {
      description:
        'Input payload containing filters, pagination, date range, event group, and user criteria to retrieve activity logs.',
    })
    getActivityLogInput: GetActivityLogInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting the activity log with input: ${JSON.stringify(getActivityLogInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      const getActivityLogRes = await this.activityLogService.getActivityLog(
        decoded,
        getActivityLogInput,
        timezone,
      );
      const finalResponse: any = await this.iterateLogArray(
        getActivityLogRes.activity_logs,
      );
      getActivityLogRes.activity_logs = finalResponse;
      this.logger.log(
        `Response received while leaving the client: ${JSON.stringify(getActivityLogRes)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        getActivityLogRes,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the activity log with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while getting the activity log with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => EventGroupResponse, {
    name: 'getEventGroup',
    description:
      'Fetch all configured activity event groups available for filtering and categorization.',
  })
  async getEventGroup(@Context() context): Promise<EventGroupResponse> {
    try {
      this.logger.log(
        `Request recieved while entering the client without arguments`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const getEventGroupRes =
        await this.activityLogService.getEventGroup(decoded);
      this.logger.log(
        `Fetched event group details with response: ${JSON.stringify(getEventGroupRes)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { list: getEventGroupRes, total_count: getEventGroupRes?.length ?? 0 },
      );
    } catch (error) {
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => UsersListResponse, {
    name: 'getUsersList',
    description:
      'Retrieve the list of users available for filtering activity logs by user.',
  })
  async getUsersList() {
    try {
      this.logger.log(
        `Request recieved while entering the client without arguments`,
      );
      const getUsersListRes = await this.activityLogService.getUsersList();
      this.logger.log(
        `Fetched user list with response: ${JSON.stringify(getUsersListRes)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        getUsersListRes,
      );
    } catch (error) {
      return framedResponse('ERROR', error.message);
    }
  }

  async iterateLogArray(activityLogArray) {
    return new Promise(async (resolve, reject) => {
      activityLogArray.forEach(async (element) => {
        if (element.dynamic_values) {
          element.dynamic_values = JSON.parse(element.dynamic_values);
          const replaceVariablesRes = await this.replaceVariables(
            element.event_text,
            element.dynamic_values,
          );
          element.event_text = replaceVariablesRes;
        }
      });
      resolve(activityLogArray);
    });
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }
}
