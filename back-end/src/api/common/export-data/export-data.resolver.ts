import { Resolver, Mutation, Args, Context, Query } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ExportDataService } from './export-data.service';
import {
  auditExportResponse,
  StringResponse,
} from 'src/api/users/signup/response/auth.response';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ExportExcelDataInput } from './dto/export-data-excel.input';
import { AuditReportExportDataService } from './audit-report-export-data.service';
import { ExportAuditReportInput } from './dto/export-audit-report.input';
import { GetBankProjectResponse } from './response/get-bank-project.response';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';

@Resolver()
export class ExportDataResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly exportDataService: ExportDataService,
    private readonly auditReportExportDataService: AuditReportExportDataService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {
    this.logger = new PaytradeLogger('EXPORT_DATA');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => StringResponse, {
    name: 'generateSignedUrl',
    description:
      'Generate a secure signed URL to export data as an Excel file based on the provided filters and user context.',
  })
  async generateSignedUrl(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing filters, date range, and export configuration required to generate a signed Excel export URL.',
    })
    payload: ExportExcelDataInput,
  ): Promise<StringResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.timezone || 'UTC';
      const signedUrl = await this.exportDataService.generateSignedUrl({
        ...payload,
        timezone,
        decodedToken: decoded,
      });

      return framedResponse('SUCCESS', signedUrl); // Return the signed URL to the client
    } catch (error) {
      this.logError(`Error generating signed URL: ${error.message}`);
      return framedResponse(
        'ERROR',
        `Failed to generate signed URL in resolver: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => auditExportResponse, {
    name: 'generateAuditReport',
    description:
      'Generate an audit report for a specific date range with subscription validation and return a secure download link.',
  })
  async generateAuditReport(
    @Context() context,
    @Args('payload', {
      description:
        'Input payload containing start date, end date, and filtering options required to generate an audit report export.',
    })
    payload: ExportAuditReportInput,
  ) {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const { headers } = context.req;
      const company_id = headers?.companyid;

      const timezone = decoded?.timezone || 'UTC';

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          company_id,
        );
      const subscriptionItemForRestriction =
        subscriptionDetails &&
        subscriptionDetails?.plan_items &&
        subscriptionDetails?.plan_items?.length > 0
          ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Audit export',
            )
          : [];
      if (
        !subscriptionDetails?.is_free_plan_eligible && // true  -> false
        (!subscriptionItemForRestriction ||
          (subscriptionItemForRestriction &&
            subscriptionItemForRestriction?.length > 0 &&
            subscriptionItemForRestriction[0]?.limit_value != 'true'))
      ) {
        return framedResponse(
          'WARNING',
          `Audit report cannot be generated. Please upgrade your subscription plan.`,
        );
      }

      const { start_date, end_date } = payload;

      // Check if start_date is after end_date
      if (new Date(start_date) > new Date(end_date)) {
        return framedResponse(
          'ERROR',
          'Invalid date range: Start date cannot be after end date.',
        );
      } else if (
        new Date(start_date).getTime() === new Date(end_date).getTime()
      ) {
        return framedResponse(
          'ERROR',
          'Invalid date range: Start date and end date cannot be the same.',
        );
      }

      const signedUrl =
        await this.auditReportExportDataService.generateAuditReport({
          timezone,
          decodedToken: decoded,
          ...payload,
        });

      if (!signedUrl || typeof signedUrl !== 'object' || !signedUrl.token) {
        return framedResponse('ERROR', 'Failed to generate audit report. No records found for the selected date range.', null);
      }

      return {
        status: 'SUCCESS',
        message: signedUrl.token,
        file: signedUrl.file,
      };
    } catch (error) {
      this.logError(`Error generateAuditReport: ${error.message}`);
      const errorMessage = error.message === 'Record not found' 
        ? 'No records found for the selected date range.' 
        : `Failed to generate audit report: ${error.message}`;
      return framedResponse(
        'ERROR',
        errorMessage,
        null,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => GetBankProjectResponse, {
    name: 'getBankAssociatedProject',
    description:
      'Fetch the project details associated with a specific bank account.',
  })
  async getBankAssociatedProject(
    @Args('bank_account_id', {
      description:
        'Unique identifier of the bank account to fetch associated projects.',
    })
    bank_account_id: number,
  ) {
    try {
      const project =
        await this.auditReportExportDataService.getBankAssociatedProject(
          bank_account_id,
        );

      return framedResponse(
        'SUCCESS',
        'Fetched project list successfully',
        project,
      );
    } catch (error) {
      this.logError(`Error getBankAssociatedProject: ${error.message}`);
      return framedResponse(
        'ERROR',
        `Failed to get Bank Associated Project in resolver: ${error.message}`,
      );
    }
  }
}
