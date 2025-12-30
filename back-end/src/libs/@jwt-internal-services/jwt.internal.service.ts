import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtInternalService {
  private logger: PaytradeLogger;
  constructor(private readonly jwtService: JwtService) {
    this.logger = new PaytradeLogger('JWT_INTERNAL_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async decodeJwtToken(context: any) {
    try {
      this.logger.log(`Request received for decoding the jwt token.`);
      const { headers } = context.req;
      const authorizationHeader = headers?.authorization;
      const token = authorizationHeader?.split(' ')[1];
      const decoded = this.jwtService.decode(token);
      const companyId = headers?.companyid;
      console.log('companyId in header: ', companyId);
      if (companyId) {
        if (
          decoded?.companySpecificRoles &&
          decoded?.companySpecificRoles.length > 0 &&
          decoded?.companySpecificRoles[0] !== null
        ) {
          const roles = decoded?.companySpecificRoles.filter((item) => {
            return item.companyId === parseFloat(companyId);
          });
          this.logger.log(
            `Response received with roles: ${JSON.stringify(roles)}`,
          );
          if (
            !roles ||
            (roles && roles.length == 0) ||
            (roles && roles.length > 0 && roles[0] == null) ||
            (roles &&
              roles.length > 0 &&
              roles[0] !== null &&
              roles[0]?.role &&
              !['PRIMARY ADMIN', 'ADMIN', 'STANDARD USER'].includes(
                roles[0]?.role,
              ))
          ) {
            throw `Unauthorized to perform this action`;
          }
        }
      }
      return decoded;
    } catch (error) {
      this.logger.error(
        `Errored while decoding the jwt token with message: ${error.message}`,
      );
      throw error;
    }
  }
}
