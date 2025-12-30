import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { Repository } from 'typeorm';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class UserActivityLogService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetailsRepo: Repository<CompanyDetails>,
    private activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('USER_ACTIVITY_LOG_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async triggerActivityLogWhileSwitchingBusinessProfile(
    decoded,
    data: {
      company_id: number;
    },
  ) {
    try {
      const { company_id } = data;

      const fetchedCompanyDetails = await this.companyDetailsRepo.findOne({
        where: { company_id },
        select: ['company_name'],
      });
      console.log('fetchedCompanyDetails', fetchedCompanyDetails);

      //Generating company link.
      const companyLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[2]}` +
        `${company_id}` +
        `?from=log`;
      console.log('companyLink', companyLink);

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 31,
        admin_id:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.admin_id
            : null,
        to_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.userId
            : null,
        from_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? null
            : decoded?.userId,
        company_id,
        dynamic_values: {
          companyName: fetchedCompanyDetails.company_name,
          companyLink,
        },
        is_admin: false,
        created_by: decoded?.userId,
      };
      //console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        'Activity log has been triggered while switching business profile.',
      );
    } catch (error) {
      this.logger.error(
        `Errored while triggering activity log as soon as a business profile is switched with message: ${error}`,
      );
      throw error;
    }
  }

  async triggerActivityLogAfterAnUserIsSignedOut(
    admin_id?: number,
    user_id?: number,
    is_automatic?: boolean,
  ) {
    try {
      let event_template_id;
      if (is_automatic) {
        event_template_id = 181;
      } else {
        event_template_id = admin_id && user_id ? 194 : admin_id ? 4 : 2;
      }
      let createActivityLogInput: CreateActivityLogInput = {
        event_template_id: event_template_id,
        from_user: user_id ? user_id : null,
        company_id: user_id
          ? await this.activityLogService.getSystemAddedCompanyId(user_id)
          : null,
        admin_id: admin_id ? admin_id : null,
        is_admin: admin_id ? true : false,
        created_by: user_id ? user_id : admin_id,
      };

      if (admin_id && user_id) {
        const fetchedUserDetails = await this.userDetails.findOne({
          where: { user_id },
        });

        const userLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[18]}` +
          `${fetchedUserDetails?.user_id}` +
          `?from=log`;

        createActivityLogInput = {
          ...createActivityLogInput,
          dynamic_values: {
            userName:
              fetchedUserDetails?.first_name +
              ' ' +
              fetchedUserDetails?.last_name,
            userLink,
          },
        };
      }

      //console.log('createActivityLogInput', createActivityLogInput);
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      if (user_id && admin_id) {
        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 4,
          // from_user: user_id ? user_id : null,
          to_user: user_id ? user_id : null,
          company_id: user_id
            ? await this.activityLogService.getSystemAddedCompanyId(user_id)
            : null,
          admin_id: admin_id ? admin_id : null,
          is_admin: false,
          created_by: admin_id,
          created_group: 'ADMIN',
        };
        //console.log('createActivityLogInput', createActivityLogInput);
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      }

      return framedResponse(
        'SUCCESS',
        'Activity log has been triggered after an user is signed out.',
      );
    } catch (error) {
      this.logger.error(
        `Errored while triggering activity log as soon as a business profile is switched with message: ${error}`,
      );
      throw error;
    }
  }
}
