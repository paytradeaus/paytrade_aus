import { UseGuards } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AiStatusSnapshotService } from './ai-status-snapshot.service';
import { GetAiStatusSnapshotInput } from './input';
import { GetAiStatusSnapshotResponse } from './response';
import { StatusIssue, StatusSnapshot } from './types';
import { assertCompanyAccess, DecodedJwtPayload } from './auth-helper';

interface GqlContext {
  req: Request;
}

@Resolver()
export class AiStatusSnapshotResolver {
  private logger = new PaytradeLogger('AI_STATUS_SNAPSHOT_RESOLVER');

  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly snapshotService: AiStatusSnapshotService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
  )
  @Query(() => GetAiStatusSnapshotResponse, {
    name: 'getAiStatusSnapshot',
    description:
      'Returns a deterministic snapshot of issues across compliance, notices, reconciliation, payments, contracts, claims, contacts and Xero sync for the requested company. No LLM involvement; cached briefly per company.',
  })
  async getAiStatusSnapshot(
    @Context() context: GqlContext,
    @Args('payload') payload: GetAiStatusSnapshotInput,
  ) {
    try {
      if (!payload?.company_id) {
        return framedResponse('ERROR', 'company_id is required');
      }

      const decoded = (await this.jwtInternalService.decodeJwtToken(
        context,
      )) as DecodedJwtPayload | null;

      // Enforce company access against the JWT's company-specific roles
      // unconditionally — never trust the request payload's company_id alone.
      assertCompanyAccess(decoded, Number(payload.company_id));

      const snapshot = await this.snapshotService.getSnapshot(
        Number(payload.company_id),
        Boolean(payload.force_refresh),
      );

      this.logger.log(
        `Snapshot for company ${payload.company_id} (user ${decoded?.userId}) — ` +
          `${snapshot.summary.total} issues (${snapshot.summary.critical}c/${snapshot.summary.warning}w/${snapshot.summary.info}i)`,
      );

      return framedResponse('SUCCESS', 'Snapshot generated', toGql(snapshot));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to build AI status snapshot for company ${payload?.company_id}: ${msg}`,
      );
      return framedResponse('ERROR', msg || 'Failed to build snapshot');
    }
  }
}

function toGql(s: StatusSnapshot) {
  const mapIssue = (i: StatusIssue) => ({
    ...i,
    affectedRecordId: i.affectedRecordId == null ? null : String(i.affectedRecordId),
  });
  return {
    companyId: s.companyId,
    generatedAt: s.generatedAt,
    summary: s.summary,
    categories: s.categories.map((c) => ({
      ...c,
      issues: c.issues.map(mapIssue),
    })),
    topIssues: s.topIssues.map(mapIssue),
  };
}
