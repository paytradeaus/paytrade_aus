import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { IntegrationsService } from './integrations.service';
import { handleError } from '../../error-handler';
import {
  GetIntegrationListsInput,
  integrateAdatreeInput,
} from './dto/integrations.input';
import {
  integrateAdatreeResponse,
  ViewIntegrationListResponse,
} from './response/integrations.response';
import {
  Integrations,
  IntegrationStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { EmailService } from 'src/libs/@email-services/email.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaymentGatewayService } from '../../payment-gateway/payment-gateway.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
var errorMessage = '';
@Resolver('Integrations')
export class IntegrationsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly integrationsService: IntegrationsService,
    private readonly emailServices: EmailService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('INTEGRATIONS_RESOLVER');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
  )
  @Query(() => ViewIntegrationListResponse, {
    name: 'getIntegrationListsForCompany',
    description:
      'Fetches a list of all integrations associated with a specific company.',
  })
  async getIntegrationListsForCompany(
    @Args('getIntegrationListsInput', {
      description:
        'Input payload containing company identifier, filters, pagination, and sorting options to retrieve the list of integrations for a company.',
    })
    getIntegrationListsInput: GetIntegrationListsInput,
  ) {
    try {
      this.logger.log(
        `Request received for getting integration lists: ${JSON.stringify(getIntegrationListsInput)}`,
      );
      const integrationLists =
        await this.integrationsService.getIntegrationListsForCompany(
          getIntegrationListsInput,
        );
      this.logger.log(
        `Response recieved while leaving the client: ${JSON.stringify(integrationLists)}`,
      );
      return framedResponse(
        'SUCCESS',
        `Fetched integration list successfully`,
        integrationLists,
      );
    } catch (error) {
      errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the client with message: ${errorMessage}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => integrateAdatreeResponse, {
    name: 'integrateAdatree',
    description:
      'Initiates Adatree integration for a company and sends notification email to support.',
  })
  async integrateAdatree(
    @Context() context,
    @Args('integrateAdatreeInput', {
      description:
        'Input payload containing the company identifier and required details to initiate the Adatree bank feed integration.',
    })
    integrateAdatreeInput: integrateAdatreeInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const subscriptionDetails =
        await this.paymentGatewayService.getSubscriptionDetailsByCompanyId(
          integrateAdatreeInput?.company_id,
        );
      const subscriptionItemForRestriction =
        subscriptionDetails &&
        subscriptionDetails?.plan_items &&
        subscriptionDetails?.plan_items?.length > 0
          ? subscriptionDetails?.plan_items?.filter(
              (item) => item?.item_name === 'Bank Feeds',
            )
          : [];
      if (
        !subscriptionDetails?.is_free_plan_eligible &&
        (!subscriptionItemForRestriction ||
          (subscriptionItemForRestriction &&
            subscriptionItemForRestriction?.length > 0 &&
            subscriptionItemForRestriction[0]?.limit_value != 'true'))
      ) {
        return framedResponse(
          'WARNING',
          `Adatree cannot be integrated. Please upgrade your subscription plan.`,
        );
      }

      const adatreeIntegerationInput = {
        company_id: integrateAdatreeInput.company_id,
        integration_name: 'Adatree' as Integrations,
        integration_status: 'Activation in Progress' as IntegrationStatus,
      };

      // Reusable function to convert date
      function convertDate(dateString) {
        if (!dateString) return ''; // Handle empty dates gracefully

        const date = new Date(dateString);
        return (
          date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          }) +
          ' ' +
          date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        );
      }

      const newAdatreeIntegeration =
        await this.integrationsService.insertIntegrationDetails(
          decoded,
          adatreeIntegerationInput,
        );
      if (newAdatreeIntegeration) {
        console.log('newAdatreeIntegeration: ', newAdatreeIntegeration);

        const integrationRequestData = {
          name: newAdatreeIntegeration.companyDetails.company_name,
          email: newAdatreeIntegeration.companyDetails.company_email_id,
          created_date: convertDate(newAdatreeIntegeration.created_on),
        };

        const mailTemplate =
          await this.integrationsService.getMailTemplateByMailType(
            'adatree-integration',
          );

        if (!mailTemplate) {
          this.logger.error(
            `Mail template not found for type: adatree-integration`,
          );
          return;
        }

        const Keys = mailTemplate.selected_dynamic || [];
        const dynamicData: { [key: string]: any } = {};

        Keys.forEach((key) => {
          dynamicData[key] = integrationRequestData[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        const mailDetails = {
          toEmail: process.env.SUPPORT_EMAIL,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.adatreeIntegration,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully`);

        return framedResponse(
          'SUCCESS',
          `We will start with the adatree integration process shortly. Our executive will be contacting you regarding this in 2-3 business days.`,
        );
      } else {
        throw new HttpException(
          'Failed to integrate Adatree',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while adding a new disc / idea: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }
}
