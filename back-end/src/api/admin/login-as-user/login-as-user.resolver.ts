import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AllowAdminToLoginAsUserResponse } from './login-as-user.response';
import { AllowAdminToLoginAsUserInput } from './login-as-user.input';
import { LoginAsUserService } from './login-as-user.service';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Resolver()
export class LoginAsUserResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly loginAsUserService: LoginAsUserService,
  ) {
    this.logger = new PaytradeLogger('LOGIN_AS_USER_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => AllowAdminToLoginAsUserResponse, {
    name: 'allowAdminToLoginAsUser',
    description:
      'Allows a portal admin to login as a specific user by providing user ID and admin password.',
  })
  async allowAdminToLoginAsUser(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing the user ID to login as and the admin password for verification',
    })
    payload: AllowAdminToLoginAsUserInput,
  ) {
    try {
      this.logger.log(
        `Request recieved to allow admin to login as user with payload: ${JSON.stringify(payload.user_id)}`,
      );
      const { admin_password, user_id } = payload;

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      return this.loginAsUserService.allowAdminToLoginAsUser({
        admin_email_id: decoded?.emailId,
        admin_password,
        user_id,
      });
    } catch (error) {
      this.logger.error(`Errored inside the client with message: ${error}`);
      return framedResponse('ERROR', error);
    }
  }
}
