import { UseGuards } from '@nestjs/common';
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  activateInactivateComplianceRulesResponse,
  FetchActivenessOfComplianceChecksResponse,
  FetchAllFiltersInAdminCompliancesListResponse,
  FetchContractValueToCheckContractEligibilityResponse,
  SetContractValueToCheckContractEligibilityResponse,
  SwitchComplianceChecksResponse,
} from './compliances.response';
import { AdminCompliancesService } from './compliances.service';
import {
  activateComplianceRulesInput,
  FetchActivenessOfComplianceChecksInput,
  FetchAllFiltersInAdminCompliancesListInput,
  FetchContractValueToCheckContractEligibilityInput,
  SetContractValueToCheckContractEligibilityInput,
  SwitchComplianceChecksInput,
} from './compliances.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ExportDataGateway } from 'src/api/common/export-data/pdf.gateway';

@Resolver()
export class AdminCompliancesResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly adminCompliancesService: AdminCompliancesService,
    private readonly exportGateway: ExportDataGateway,
  ) {
    this.logger = new PaytradeLogger('ADMIN_COMPLIANCES_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SwitchComplianceChecksResponse, {
    name: 'switchComplianceChecks',
    description:
      'Switches the specified compliance checks on or off based on the input payload.',
  })
  async switchComplianceChecks(
    @Args('payload', {
      description:
        'Input payload specifying compliance checks to switch and their desired state',
    })
    payload: SwitchComplianceChecksInput,
  ) {
    try {
      this.logger.log(
        `Request received for switching compliance checks with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCompliancesService.switchComplianceChecks(payload);
    } catch (error) {
      this.logger.error(
        `Errored while switching compliance checks with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while switching compliance checks with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => activateInactivateComplianceRulesResponse, {
    name: 'activateInactivateComplianceRules',
    description:
      'Activates or deactivates compliance rules for a client or globally and triggers recalculation of compliance for all projects if needed.',
  })
  async activateInactivateComplianceRules(
    @Args('payload', {
      description:
        'Input payload containing compliance rule IDs, client ID (optional), and desired active state',
    })
    payload: activateComplianceRulesInput,
  ) {
    try {
      this.logger.log(
        `Request received for switching compliance checks with data: ${JSON.stringify(payload)}`,
      );

      const complianceRulesStatus =
        await this.adminCompliancesService.updateComplianceRuleStatus(payload);

      if (payload.clientId) {
        this.adminCompliancesService
          .recalculateComplianceForAllProjects(
            payload.check_number,
            payload.bank_account_type,
          )
          .then(() => {
            if (payload.clientId) {
              this.exportGateway.notifyAdminComliance(payload.clientId, {
                message:
                  'Compliance update for all active projects completed successfully.',
              });
            }
          })
          .catch((err) => {
            this.logger.error(`Recalculation error: ${err}`);
            if (payload.clientId) {
              this.exportGateway.notifyClient(payload.clientId, {
                message: 'Compliance update failed.',
                error: err.message,
              });
            }
          });
      }

      return complianceRulesStatus;
    } catch (error) {
      this.logger.error(
        `Errored while switching compliance checks with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while switching compliance checks with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchActivenessOfComplianceChecksResponse, {
    name: 'fetchActivenessOfComplianceChecks',
    description:
      'Fetches the current activeness (enabled/disabled) status of compliance checks for a client or project.',
  })
  async fetchActivenessOfComplianceChecks(
    @Args('payload', {
      description:
        'Input payload specifying which compliance checks to fetch activeness for',
    })
    payload: FetchActivenessOfComplianceChecksInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching activeness of compliance checks with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCompliancesService.fetchActivenessOfComplianceChecks(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching activeness of compliance checks by admin with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching activeness of compliance checks by admin with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchAllFiltersInAdminCompliancesListResponse, {
    name: 'fetchAllFiltersInAdminCompliancesList',
    description:
      'Fetches all available filters that can be applied in the admin compliances list.',
  })
  async fetchAllFiltersInAdminCompliancesList(
    @Args('payload', {
      description:
        'Input payload specifying filter parameters or constraints for fetching admin compliance filters',
    })
    payload: FetchAllFiltersInAdminCompliancesListInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all filters in admin compliances list with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCompliancesService.fetchAllFiltersInAdminCompliancesList(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all filters in admin compliances list with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching all filters in admin compliances list with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SetContractValueToCheckContractEligibilityResponse, {
    name: 'setContractValueToCheckContractEligibility',
    description:
      'Sets the contract value threshold used to check contract eligibility for compliance purposes.',
  })
  async setContractValueToCheckContractEligibility(
    @Args('payload', {
      description:
        'Input payload containing the contract value threshold to set for eligibility checks',
    })
    payload: SetContractValueToCheckContractEligibilityInput,
  ) {
    try {
      this.logger.log(
        `Request received for setting contract value to check contract eligibility with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCompliancesService.setContractValueToCheckContractEligibility(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while setting contract value to check contract eligibility with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while setting contract value to check contract eligibility with message: ${error}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => FetchContractValueToCheckContractEligibilityResponse, {
    name: 'fetchContractValueToCheckContractEligibility',
    description:
      'Fetches the current contract value used to determine eligibility for compliance checks.',
  })
  async fetchContractValueToCheckContractEligibility(
    @Args('payload', {
      description:
        'Input payload specifying parameters to fetch the current contract value for compliance eligibility',
    })
    payload: FetchContractValueToCheckContractEligibilityInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the contract value with data: ${JSON.stringify(payload)}`,
      );

      return await this.adminCompliancesService.fetchContractValueToCheckContractEligibility(
        payload,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching the contract value with message: ${error}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while fetching the contract value with message: ${error}`,
      );
    }
  }
}
