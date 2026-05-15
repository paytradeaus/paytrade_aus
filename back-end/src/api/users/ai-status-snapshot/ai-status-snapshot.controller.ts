import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { jwtConstants } from 'src/api/auth/constants';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiStatusSnapshotService } from './ai-status-snapshot.service';
import { assertCompanyAccess, DecodedJwtPayload } from './auth-helper';

/**
 * REST counterpart of the GraphQL `getAiStatusSnapshot` query.
 *
 * Authentication: same JWT bearer token used by the GraphQL endpoints.
 * Authorisation: cross-checked against the JWT's company-specific roles
 * via `assertCompanyAccess` — payload `company_id` is never trusted alone.
 */
@Controller('api/ai')
export class AiStatusSnapshotController {
  private readonly logger = new PaytradeLogger('AI_STATUS_SNAPSHOT_CONTROLLER');

  constructor(
    private readonly snapshotService: AiStatusSnapshotService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get('status-snapshot')
  async getStatusSnapshot(
    @Req() req: Request,
    @Headers('authorization') authHeader: string | undefined,
    @Query('company_id') companyIdParam: string | undefined,
    @Query('force_refresh') forceRefreshParam: string | undefined,
  ) {
    try {
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;
      if (!token) {
        throw new ForbiddenException('Authorization Token Required');
      }

      let decoded: DecodedJwtPayload;
      try {
        decoded = this.jwtService.verify<DecodedJwtPayload>(token, {
          secret: jwtConstants.secret,
        });
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          throw new ForbiddenException(
            'Your session has expired. Please log in again.',
          );
        }
        throw new ForbiddenException('Invalid token');
      }

      const companyId = Number(companyIdParam);
      if (!companyId || Number.isNaN(companyId)) {
        throw new HttpException(
          'company_id query parameter is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Optional belt-and-braces: if the client also sent a `companyid`
      // header (the in-app convention), it must agree with the query param.
      const headerCompanyId = (req.headers['companyid'] ??
        req.headers['companyId']) as string | undefined;
      if (
        headerCompanyId !== undefined &&
        Number(headerCompanyId) !== companyId
      ) {
        throw new ForbiddenException(
          'Unauthorized: company_id does not match the active company on the session.',
        );
      }

      assertCompanyAccess(decoded, companyId);

      const forceRefresh =
        forceRefreshParam === 'true' || forceRefreshParam === '1';

      const snapshot = await this.snapshotService.getSnapshot(
        companyId,
        forceRefresh,
      );

      this.logger.log(
        `REST snapshot for company ${companyId} (user ${decoded?.userId}) — ` +
          `${snapshot.summary.total} issues`,
      );

      return { status: 'SUCCESS', data: snapshot };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`REST snapshot failed: ${msg}`);
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
