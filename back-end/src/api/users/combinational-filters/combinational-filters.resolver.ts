import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { UserCombinationalFiltersService } from './combinational-filters.service';
import { FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput } from './combinational-filters.input';
import { FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListResponse } from './combinational-filters.response';

@Resolver()
export class UserCombinationalFiltersResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly userCombinationalFiltersService: UserCombinationalFiltersService,
  ) {
    this.logger = new PaytradeLogger('USER_COMBINATIONAL_FILTERS_RESOLVER');
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
  @Query(() => FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListResponse, {
    name: 'fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList',
    description:
      'Fetch available filters for payment claims, payments, and retentions list based on the provided payload.',
  })
  async fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
    @Args('payload', {
      description:
        'Input payload containing criteria to fetch filters for payment claims, payments, and retentions.',
    })
    payload: FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput,
  ) {
    try {
      this.logger.log(
        `Request received while fetching the filters of payment claims and retentions list with data: ${JSON.stringify(payload)}`,
      );

      return await this.userCombinationalFiltersService.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the filters of payment claims and retention list with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching the filters of payment claims and retentions list with message: ${error}`,
      );
    }
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(
  //   Role.RESTRICTED_PORTAL_ADMIN,
  //   Role.PORTAL_ADMIN,
  //   Role.STANDARD_USER,
  //   Role.ADMIN,
  //   Role.PRIMARY_ADMIN,
  // )
  // @Query(() => FetchFiltersOfReconciliationRecordAndAuditListResponse, {
  //   name: 'fetchFiltersOfReconciliationRecordAndAuditList',
  // })
  // async fetchFiltersOfReconciliationRecordAndAuditList(
  //   @Args('payload')
  //   payload: FetchFiltersOfReconciliationRecordAndAuditListInput,
  // ) {
  //   try {
  //     this.logger.log(
  //       `Request received while fetching the filters of payment claims and retentions list with data: ${JSON.stringify(payload)}`,
  //     );

  //     return await this.userCombinationalFiltersService.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
  //       payload,
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Errored while fetching the filters of payment claims and retention list with message: ${error}`,
  //     );
  //     return framedResponse(
  //       'ERROR',
  //       `Errored while fetching the filters of payment claims and retentions list with message: ${error}`,
  //     );
  //   }
  // }
}
