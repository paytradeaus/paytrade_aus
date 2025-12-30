import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { UserActivityLogService } from './activity-log.service';
import { TriggerActivityLogWhileSwitchingBusinessProfileInput } from './activity-log.input';
import {
  TriggerActivityLogAfterAnUserIsSignedOutResponse,
  TriggerActivityLogWhileSwitchingBusinessProfileResponse,
} from './activity-log.response';

@Resolver()
export class UserActivityLogResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly userActivityLogService: UserActivityLogService,
  ) {
    this.logger = new PaytradeLogger('USER_ACTIVITY_LOG_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => TriggerActivityLogWhileSwitchingBusinessProfileResponse, {
    name: 'triggerActivityLogWhileSwitchingBusinessProfile',
    description: `Trigger an activity log entry when a user switches their business profile. 
      Requires JWT context for identifying the user.`,
  })
  async triggerActivityLogWhileSwitchingBusinessProfile(
    @Context() context,
    @Args('payload', {
      description:
        'Payload containing details of the business profile switch event.',
    })
    payload: TriggerActivityLogWhileSwitchingBusinessProfileInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Handling request for triggering actvity log while switching business profile with data: ${JSON.stringify(payload)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      return this.userActivityLogService.triggerActivityLogWhileSwitchingBusinessProfile(
        decoded,
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while triggering actvity log while switching business profile with data: ${JSON.stringify(error)}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Mutation(() => TriggerActivityLogAfterAnUserIsSignedOutResponse, {
    name: 'triggerActivityLogAfterAnUserIsSignedOut',
    description: `Trigger an activity log entry after a user has been signed out, either manually or automatically. 
      Accepts optional admin_id, user_id, and is_automatic flag.`,
  })
  async triggerActivityLogAfterAnUserIsSignedOut(
    @Args('admin_id', {
      nullable: true,
      description:
        'Optional ID of the admin performing the sign-out, if applicable.',
    })
    admin_id?: number,
    @Args('user_id', {
      nullable: true,
      description: 'Optional ID of the user being signed out.',
    })
    user_id?: number,
    @Args('is_automatic', {
      nullable: true,
      description:
        'Flag indicating whether the sign-out was automatic (true) or manual (false).',
    })
    is_automatic?: boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `Handling request for triggering actvity log after an user is signed out with data: ${JSON.stringify({ user_id, admin_id, is_automatic })}`,
      );

      return this.userActivityLogService.triggerActivityLogAfterAnUserIsSignedOut(
        admin_id,
        user_id,
        is_automatic,
      );
    } catch (error) {
      this.logger.error(
        `Errored while triggering actvity log after an user is signed out with data: ${JSON.stringify(error)}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }
}
