import { Injectable } from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDetails } from '../../../entities/user-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PtAdminService } from 'src/api/admin/pt-admin/pt-admin.service';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { JwtService } from '@nestjs/jwt';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { AdminGroup } from 'src/entities/admin-group.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminGroupMenuPriv } from 'src/entities/admin-group-menu-priv.entity';
import { AdminMenuDetails } from 'src/entities/admin-menu-details.entity';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';

var moment = require('moment-timezone');
moment.tz.setDefault('UTC');
var bcrypt = require('bcryptjs');

@Injectable()
export class LoginAsUserService {
  private logger: PaytradeLogger;
  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private adminDetailsRepo: Repository<AdminDetails>,
    private readonly ptAdminService: PtAdminService,
    private authService: AuthService,
    private activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('LOGIN_AS_USER_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async allowAdminToLoginAsUser(data: {
    admin_email_id: string;
    admin_password: string;
    user_id: number;
  }) {
    try {
      this.logger.log(
        `Request received for allowing admin to login as user with user_id: ${data.admin_email_id}`,
      );
      const { admin_email_id, admin_password, user_id } = data;

      //Validating the admin credentials obtained while reentering the admin password.
      const adminDetails: AdminDetails =
        await this.ptAdminService.getAdminByEmail(admin_email_id);

      if (!adminDetails)
        throw `Admin details not found. Please provide a valid emailId.`;
      const admin_id = adminDetails.id;

      const adminGroupMenuPrivilegeDetails = await this.adminDetailsRepo
        .createQueryBuilder('ad')
        .select([
          'ad.id AS admin_id',
          'amd.id AS menu_id',
          'agmp.all_permission AS all_permission',
          'amd.menu_name AS menu_name',
        ])
        .distinct(true)
        .leftJoin(AdminGroup, 'ag', 'ag.admin_id = ad.id')
        .leftJoin(AdminGroupDetails, 'agd', 'agd.id = ag.group_id')
        .leftJoin(AdminGroupMenuPriv, 'agmp', 'agmp.group_id = agd.id')
        .leftJoin(AdminMenuDetails, 'amd', 'amd.id = agmp.menu_id')
        .where(`amd.menu_name = :menu_name`, { menu_name: 'Users' })
        .andWhere(`agmp.all_permission = :all_permission`, {
          all_permission: true,
        })
        .andWhere(
          `ad.admin_status = 'Active' and agd.group_status = 'Active' and ad.id = :admin_id`,
          { admin_id },
        )
        .getRawOne();

      if (adminGroupMenuPrivilegeDetails) {
        if (
          adminDetails &&
          adminDetails !== null &&
          adminDetails.admin_status === 'Active'
        ) {
          const isBothPasswordsOfAdminMatched = await bcrypt.compareSync(
            admin_password,
            String(adminDetails.password),
          );

          if (isBothPasswordsOfAdminMatched) {
            //Fetching the user details from the user details entity.
            const fetchedUserDetails: UserDetails =
              await this.userDetails.findOne({ where: { user_id } });

            if (
              fetchedUserDetails &&
              fetchedUserDetails !== null
              // && fetchedUserDetails.user_status === 'Active'
            ) {
              //Updating the mode of an user.
              fetchedUserDetails.user_mode = 'Normal';
              await this.userDetails.save(fetchedUserDetails);
              this.logger.log(
                `User mode has been updated to Normal for an user with id: ${user_id}`,
              );

              //Fetching the generated token along with two additional keys.
              const token: any = (
                await this.authService.getAuthToken(
                  fetchedUserDetails.email_id,
                  false,
                  'ADMIN',
                  adminDetails.admin_id,
                )
              ).data;
              this.logger.log(
                `Token of the user generated successfully for ${user_id}`,
              );

              const userLink =
                `${process.env.LOG_BASE_URL}` +
                `${linkExtensions[18]}` +
                `${fetchedUserDetails.user_id}` +
                `?from=log`;

              const decoded = this.jwtService.decode(token.access_token);
              const createActivityLogInput1: CreateActivityLogInput = {
                event_template_id: 135,
                admin_id: adminDetails.admin_id,
                to_user: fetchedUserDetails.user_id,
                company_id:
                  await this.activityLogService.getSystemAddedCompanyId(
                    fetchedUserDetails.user_id,
                  ),
                dynamic_values: {
                  userName:
                    fetchedUserDetails.first_name +
                    ' ' +
                    fetchedUserDetails.last_name,
                  userLink,
                },
                is_admin: true,
                created_by: decoded?.userId,
              };

              await this.activityLogService.insertActivityLog(
                createActivityLogInput1,
              );

              const createActivityLogInput2: CreateActivityLogInput = {
                event_template_id: 182,
                admin_id: adminDetails.admin_id,
                to_user: fetchedUserDetails.user_id,
                company_id:
                  await this.activityLogService.getSystemAddedCompanyId(
                    fetchedUserDetails.user_id,
                  ),
                is_admin: false,
                created_by: decoded?.userId,
              };

              await this.activityLogService.insertActivityLog(
                createActivityLogInput2,
              );

              return framedResponse(
                'SUCCESS',
                `Token of the user generated successfully.`,
                token,
              );
            }
            return framedResponse('SUCCESS', `Provided user is not active.`);
          }
          return framedResponse('ERROR', `Password is incorrect.`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Errored while allowing admin to login as user with message: ${error}`,
      );
      throw error;
    }
  }
}
