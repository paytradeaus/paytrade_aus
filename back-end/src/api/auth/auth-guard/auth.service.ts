import { Injectable } from '@nestjs/common';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from '../../../entities/company-user-roles.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { JwtService } from '@nestjs/jwt';
const crypto = require('crypto');

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(CompanyDetails)
    private readonly companyDetails: Repository<CompanyDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly userRoles: Repository<CompanyUserRoles>,
  ) {}

  async getAuthToken(email_id, is_admin, logged_in_by?, admin_id?) {
    // const secretKey = crypto.randomBytes(32).toString('hex'); // 32 bytes = 64 hex characters
    // console.log(secretKey);
    var payload = {},
      user,
      userStatus,
      rolesArray: any = [];
    if (is_admin) {
      user = await this.adminDetails.findOne({
        where: { email_id },
      });
      if (!user) return framedResponse('ERROR', `User could not be found`);
      userStatus = user.admin_status;
      payload = {
        userId: user.admin_id,
        role: user.admin_role,
        status: user.admin_status,
      };
    } else {
      user = await this.userDetails.findOne({
        where: { email_id },
      });
      userStatus = user.user_status;
      if (!user) return framedResponse('ERROR', `User could not be found`);
      rolesArray = await this.getRolesArray(
        user.user_id,
        logged_in_by,
        admin_id,
      );
      payload = {
        userId: user.user_id,
        role: user.user_role,
        status: user.user_status,
        firstTimeLoggedIn: user.first_time_logged_in,
        showPopup: user.show_popup,
        companySpecificRoles: rolesArray,
      };
    }
    if (user) {
      payload = {
        ...payload,
        id: user.id,
        userName: user.first_name + ' ' + user.last_name,
        userFirstName: user.first_name,
        userLastName: user.last_name,
        emailId: user.email_id,
        isAdmin: is_admin,
        timezone: user.user_timezone,
        ...(logged_in_by && admin_id ? { logged_in_by, admin_id } : {}),
      };

      if (userStatus === 'Active' || (logged_in_by && admin_id)) {
        const token = {
          access_token: await this.jwtService.signAsync(payload, {
            expiresIn: '1d',
          }),
          refresh_token: await this.jwtService.signAsync(payload, {
            expiresIn: '2d',
          }),
        };

        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          token,
        );
      }
      return framedResponse(
        'ERROR',
        `Your account is inactive. Please contact the Paytrade admin.`,
      );
    }
    return framedResponse('ERROR', `User could not be found`);
  }

  async refreshToken(refreshToken) {
    try {
      // Verify the refresh token
      const decodedPayload = await this.jwtService.verify(refreshToken);
      const { isAdmin, ...userPayload } = decodedPayload;

      // Generate a new access token
      const newAccessToken = await this.jwtService.signAsync(decodedPayload, {
        expiresIn: '1d',
      });

      return framedResponse('SUCCESS', 'Access token refreshed successfully', {
        access_token: newAccessToken,
      });
    } catch (error) {
      return framedResponse('ERROR', 'Invalid refresh token');
    }
  }

  async getRolesArray(user_id: number, logged_in_by?, admin_id?) {
    return new Promise(async (resolve, reject) => {
      var rolesArray = [];
      const userRolesRes = await this.userRoles.find({
        where: { user_id },
        relations: ['companyDetails'],
      });
      if (userRolesRes) {
        const companySet = new Set<number>();
        userRolesRes.forEach(async (element) => {
          if (
            (element &&
              element?.companyDetails &&
              element?.companyDetails?.is_admin_blocked !== true) ||
            (logged_in_by && admin_id)
          ) {
            let roleObj = {
              companyId: element.company_id,
              companyName: element?.companyDetails?.company_name,
              role: element.company_role,
              status: element.status,
              isSystemAdded: element.is_system_added,
              isAdminBlocked: element?.companyDetails?.is_admin_blocked,
            };
            if (element.company_role === 'STANDARD USER') {
              roleObj['manageUser'] = element.manage_user;
              roleObj['manageCompany'] = element.manage_company;
              roleObj['manageSubscription'] = element.manage_subscription;
              roleObj['manageProjectTrustPayment'] =
                element.manage_project_trust_payment;
            }
            rolesArray.push(roleObj);
            companySet.add(element.company_id);
          }
        });
        const companyArray = Array.from(companySet);

        if (companyArray.length > 0) {
          const subscriptionDetails = await this.companyDetails
            .createQueryBuilder('c')
            .select([
              'c.company_id AS company_id',
              's.plan_id AS plan_id',
              'p.plan_name AS plan_name',
              's.expiry_date AS expiry_date',
              's.status AS status',
            ])
            .leftJoin(SubscriptionDetails, 's', 's.company_id = c.company_id')
            .leftJoin(SubscriptionPlanDetails, 'p', 'p.plan_id = s.plan_id')
            .where(
              `c.company_id IN (:...companyArray) ${logged_in_by && admin_id ? ' and c.is_admin_blocked = false' : ''}`,
              {
                companyArray: companyArray,
              },
            )
            .getRawMany();

          rolesArray.forEach((role) => {
            const subscriptionDetail = subscriptionDetails.find(
              (sub) => sub.company_id === role.companyId,
            );

            if (subscriptionDetail) {
              role.subscription = {
                plan_id: subscriptionDetail.plan_id,
                plan_name: subscriptionDetail.plan_name,
                expiry_date: subscriptionDetail.expiry_date,
                status: subscriptionDetail.status,
              };
            } else {
              role.subscription = null;
            }
          });
        }
      }
      resolve(rolesArray);
    });
  }
}
