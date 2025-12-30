import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommonApiService } from './common-api.service';
import { AccountingSystemResponse } from './response/accounting-system.response';
import { CISRateResponse } from './response/cis-rate.response';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { SettingsResponse } from './response/settings.response';

@Resolver()
export class CommonApiResolver {
  private logger: PaytradeLogger;
  constructor(private readonly commonApiService: CommonApiService) {
    this.logger = new PaytradeLogger('COMMON_API');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AccountingSystemResponse, {
    name: 'getAccountingSystemDetails',
    description: 'Fetch the configured accounting system details.',
  })
  async getAccountingSystemDetails() {
    try {
      this.logger.log(`Request received for getting system details.`);
      const response = await this.commonApiService.getAccountingSystemDetails();
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the accounting system details with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => CISRateResponse, {
    name: 'getCisRateDetails',
    description:
      'Retrieve the Construction Industry Scheme (CIS) tax rate details configured in the system.',
  })
  async getCisRateDetails() {
    try {
      this.logger.log(`Request received for getting Cis rate details.`);
      const response = await this.commonApiService.getCisRateDetails();
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(response)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting Cis rate details with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => SettingsResponse, {
    name: 'generateSequenceId',
    description:
      'Generate a unique sequential identifier based on the provided profile type.',
  })
  async generateSequenceId(
    @Args('profile_type', {
      description:
        'Profile type for which the sequential identifier needs to be generated.',
    })
    profile_type: string,
  ) {
    try {
      this.logger.log(
        `Request received for getting system details using profile_type:: ${profile_type}`,
      );
      const generatedId =
        await this.commonApiService.generateSequenceId(profile_type);
      this.logger.log(
        `Response recieved while leaving the client: ${generatedId}`,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        generatedId,
      );
    } catch (error) {
      this.logger.error(
        `Errored while getting the settings details with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }
}
