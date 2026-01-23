import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { GqlExecutionContext } from '@nestjs/graphql';
import { jwtConstants } from '../constants';
import { TokenExpiredError } from 'jsonwebtoken';
import { JwtService } from '@nestjs/jwt';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private logger: PaytradeLogger;

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {
    super();
    this.logger = new PaytradeLogger('JWT_AUTH_GUARD');
  }

  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = ctx.getContext().req;
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new ForbiddenException('Authorization Token Required');
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
      });
      request['user'] = payload;
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new ForbiddenException(
          'Your session has expired. Please log in again.',
        );
      }
      this.logger.error(`JWT Verification Error: ${JSON.stringify(error)}`);
      throw new ForbiddenException('Invalid token');
    }
  }

  private extractTokenFromHeader(request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
