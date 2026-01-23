import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { XeroService } from './xero.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { Response } from 'express';
import { IntegrationsService } from '../common/integrations.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { jwtConstants } from 'src/api/auth/constants';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { IntegrationStatus } from 'src/libs/@paytrade-types/paytrade-types';

@Controller('xero')
export class XeroController {
  private logger: PaytradeLogger;
  private readonly jwtSecret = jwtConstants.secret;
  constructor(
    private readonly xeroService: XeroService,
    private readonly integrationsService: IntegrationsService,
  ) {
    this.logger = new PaytradeLogger('XERO_CONTROLLER');
  }

  @Public()
  @Get('callback')
  async handleCallback(
    @Query() query: any,
    @Res() response: Response,
  ): Promise<any> {
    try {
      const callbackUrl = `${process.env.XERO_CALLBACK_URL}xero/callback?${new URLSearchParams(query)}`;
      // Create a URL object
      const url = new URL(callbackUrl);
      this.logger.log(`url: ${url}`);
      // Get query parameters
      const state = url.searchParams.get('state');
      if (!state) throw new Error('State not found');
      this.logger.log(`state: ${state}`);

      const stateData = JSON.parse(state);
      // const stateData = JSON.parse(
      //   Buffer.from(state, 'base64').toString('utf8'),
      // );
      this.logger.log(`stateData: ${JSON.stringify(stateData)}`);

      const companyId = stateData?.company_id;
      if (!companyId) throw new Error('Company Id not found');

      const userid = stateData?.userid ?? null;
      const isadmin = stateData?.isadmin ?? null;
      const timezone = stateData?.timezone ?? 'UTC';

      const decoded: any = { userId: userid, isAdmin: isadmin, timezone };

      const integration_details =
        await this.integrationsService.getIntegrationDetails(companyId);

      this.logger.log(`integration_details: ${JSON.stringify(integration_details)}`);

      let integration_id =
        integration_details && integration_details?.integration_id
          ? integration_details?.integration_id
          : null;

      if (!integration_id) {
        let integrationDetails =
          await this.integrationsService.insertIntegrationDetails(decoded, {
            company_id: companyId,
            integration_name: 'Xero',
            integration_status: 'Inactive',
          });
        integration_id =
          integrationDetails && integrationDetails?.integration_id
            ? integrationDetails?.integration_id
            : null;
      }

      if (!integration_id) throw new Error(`Integration failed`);

      const tenantDetails: any = await this.xeroService.handleCallback(
        decoded,
        callbackUrl,
        integration_id,
      );

      const updatedIntegratedValue =
        await this.integrationsService.getIntegrationDetails(companyId);

      this.logger.log(`updatedIntegratedValue: ${JSON.stringify(updatedIntegratedValue)}`);

      this.logger.log(`tenantDetails: ${JSON.stringify(tenantDetails)}`);

      let updateIntegrationDetails =
        await this.integrationsService.updateIntegrationDetails(decoded, {
          integration_id,
          integration_status: !tenantDetails
            ? 'Inactive'
            : updatedIntegratedValue?.integration_status ===
                'Connected - active'
              ? updatedIntegratedValue?.integration_status
              : null, // 'Connected - pending settings/mapping',
        });

      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(updateIntegrationDetails)}`,
      );

      return response.redirect(
        `${process.env.LOG_BASE_URL}user/integrations/xero`,
      );
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      this.logger.error(`callback:: error ${JSON.stringify(error)}`);
      this.logger.error(`callback:: errorMessage ${errorMessage}`);
      return response.redirect(
        `${process.env.LOG_BASE_URL}user/integrations?error=${encodeURIComponent(
          `Xero Authentication Failed: ${errorMessage}`,
        )}`,
      );
    }
  }
}
