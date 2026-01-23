import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import {
  CreateIntegrationInput,
  GetIntegrationListsInput,
  UpdateIntegrationInput,
} from './dto/integrations.input';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

dotenv.config();

@Injectable()
export class IntegrationsService {
  private logger = new PaytradeLogger('INTEGRATIONS_SERVICE');
  constructor(
    @InjectRepository(IntegrationDetails)
    private integrationDetails: Repository<IntegrationDetails>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
  ) {}

  async getIntegrationDetails(company_id) {
    return await this.integrationDetails.findOne({
      where: {
        company_id,
        integration_name: 'Xero',
        integration_status: Not('Deleted - archived'),
      },
    });
  }

  async insertIntegrationDetails(
    decoded,
    createIntegrationInput: CreateIntegrationInput,
  ) {
    let integrationType = 'Accounting';
    switch (createIntegrationInput.integration_name) {
      case 'Xero':
        {
          integrationType = 'Accounting';
        }
        break;
      case 'Adatree':
        {
          integrationType = 'Open banking';
        }
        break;
    }
    const integrationInput: any = {
      company_id: createIntegrationInput.company_id,
      integration_name: createIntegrationInput.integration_name,
      integration_type: integrationType,
      integration_status: createIntegrationInput.integration_status,
      integration_date: moment.utc().tz(decoded?.timezone).format('YYYY-MM-DD'),
      created_on: moment.tz('UTC'),
      created_by: decoded?.userId,
      created_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
    };
    const integrationDetails: any = await this.integrationDetails.save(
      await this.integrationDetails.create(integrationInput),
    );
    this.logger.log(`integrationDetails: ${JSON.stringify(integrationDetails)}`);
    return await this.integrationDetails.findOne({
      where: { id: integrationDetails.id },
      relations: ['companyDetails'],
    });
  }

  async updateIntegrationDetails(
    decoded,
    updateIntegrationInput: UpdateIntegrationInput,
  ) {
    const integrationDetails = await this.integrationDetails.findOne({
      where: { integration_id: updateIntegrationInput.integration_id },
    });

    if (!integrationDetails) throw `No xero integration found`;
    const previousStatus = integrationDetails.integration_status;
    const updateIntegrationResult = await this.integrationDetails
      .createQueryBuilder()
      .update(IntegrationDetails)
      .set({
        previous_status: previousStatus,
        integration_status: updateIntegrationInput.integration_status
          ? updateIntegrationInput.integration_status
          : integrationDetails.previous_status
            ? () =>
                `(previous_status)::text::integration_details_integration_status_enum`
            : 'Connected - pending settings/mapping',
        updated_by: decoded?.userId,
        updated_on: moment.tz('UTC'),
        updated_group: decoded?.isAdmin ? 'ADMIN' : 'USER',
      })
      .where(`integration_id = :integration_id`, {
        integration_id: updateIntegrationInput.integration_id,
      })
      .execute();
    this.logger.log(`updateIntegrationResult: ${JSON.stringify(updateIntegrationResult)}`);
    return await this.integrationDetails.findOne({
      where: { integration_id: updateIntegrationInput.integration_id },
    });
  }

  async getIntegrationListsForCompany(
    getIntegrationListsInput: GetIntegrationListsInput,
  ) {
    const excludedStatus = ['Deleted - archived'];
    const queryBuilder = await this.integrationDetails
      .createQueryBuilder('integration')
      .select('integration.id', 'id')
      .addSelect('integration.integration_id', 'integration_id')
      .addSelect('integration.company_id', 'company_id')
      .addSelect('integration.integration_name', 'integration_name')
      .addSelect('integration.integration_type', 'integration_type')
      .addSelect('integration.integration_status', 'integration_status')
      .addSelect('integration.integration_date', 'integration_date')
      .where(`integration.company_id = :companyId`, {
        companyId: getIntegrationListsInput.company_id,
      });

    if (getIntegrationListsInput.integration_status) {
      if (getIntegrationListsInput.integration_status === 'Archived') {
        queryBuilder.andWhere(
          'integration.integration_status IN(:...excludedStatus)',
          {
            excludedStatus,
          },
        );
      } else {
        queryBuilder.andWhere(
          'integration.integration_status = :integration_status',
          {
            integration_status: getIntegrationListsInput.integration_status,
          },
        );
      }
    } else {
      queryBuilder.andWhere(
        'integration.integration_status NOT IN(:...excludedStatus)',
        { excludedStatus },
      );
    }

    const sorting_order = getIntegrationListsInput.sorting_order
      ? getIntegrationListsInput.sorting_order
      : 'DESC';
    if (!getIntegrationListsInput.sorting_field) {
      queryBuilder.orderBy({ integration_date: sorting_order });
      if (
        getIntegrationListsInput.page_number &&
        getIntegrationListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getIntegrationListsInput.page_number - 1) *
              getIntegrationListsInput.page_size,
          )
          .limit(getIntegrationListsInput.page_size);
      }
    }
    if (getIntegrationListsInput.sorting_field) {
      switch (getIntegrationListsInput.sorting_field) {
        case 'integration_name':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(integration.integration_name AS text))':
                sorting_order,
            });
          }
          break;
        case 'integration_date':
          {
            queryBuilder.orderBy({ integration_date: sorting_order });
          }
          break;
        case 'integration_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(integration.integration_status AS text))':
                sorting_order,
            });
          }
          break;
        case 'integration_type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(integration.integration_type AS text))':
                sorting_order,
            });
          }
          break;
      }
      if (
        getIntegrationListsInput.page_number &&
        getIntegrationListsInput.page_size
      ) {
        queryBuilder
          .offset(
            (getIntegrationListsInput.page_number - 1) *
              getIntegrationListsInput.page_size,
          )
          .limit(getIntegrationListsInput.page_size);
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    return { total_count: totalCount, integration_list: rawResults };
  }

  async getMailTemplateByMailType(mailType: string) {
    const result = await this.emailTemplates.findOne({
      where: { email_type: mailType },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Template ${mailType} not found`);
    }
    return result;
  }
}
