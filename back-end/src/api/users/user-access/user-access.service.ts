import { Injectable } from '@nestjs/common';
import { CreateUserAccessInput } from './dto/create-user-access.input';
import { UpdateUserAccessInput } from './dto/update-user-access.input';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { Brackets, ILike, In, IsNull, Like, Repository } from 'typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Invitations } from 'src/entities/invitations.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { startCasePreserveUnicode } from 'src/libs/@title-case-convertor/title-case-convertor';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  FetchModeOfAnUserInput,
  SwitchModeOfAnUserInput,
} from './dto/switch-user-mode.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class UserAccessService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyUserRoles)
    private userRoles: Repository<CompanyUserRoles>,
    @InjectRepository(Invitations) private invitations: Repository<Invitations>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
  ) {
    this.logger = new PaytradeLogger('USER_ACCESS_SERVICE');
  }

  async getUserListsForCompany(
    decoded,
    company_id: number,
    pageNumber: number,
    pageSize: number,
    search?: string,
    sorting_field?: string,
    sortingOrder?: 'ASC' | 'DESC',
  ) {
    const queryBuilder = this.userRoles
      .createQueryBuilder('role')
      .select('user.id', 'id')
      .addSelect('user.user_id', 'user_id')
      .addSelect('role.user_name', 'user_name')
      .addSelect('user.email_id', 'email_id')
      .addSelect('role.company_role', 'user_type')
      .addSelect('role.status', 'status')
      .addSelect('role.created_on', 'date_added')
      .addSelect('role.manage_user', 'manage_user')
      .addSelect('role.manage_company', 'manage_company')
      .addSelect('role.manage_subscription', 'manage_subscription')
      .addSelect(
        'role.manage_project_trust_payment',
        'manage_project_trust_payment',
      )
      .distinct(true)
      .innerJoin('role.userDetails', 'user')
      .where(`role.company_id = :companyId`, {
        companyId: company_id,
      })
      .andWhere('role.status = :status', {
        status: 'Active',
      })
      .andWhere('role.is_system_added = false');

    if (search) {
      queryBuilder.andWhere(`(LOWER(role.user_name) LIKE LOWER(:keyword))`, {
        keyword: `%${search.toLowerCase()}%`,
      });
    }

    const sorting_order = sortingOrder ? sortingOrder : 'DESC';
    if (!sorting_field) {
      queryBuilder.orderBy({ 'role.created_on': sorting_order });
      if (pageNumber && pageSize) {
        queryBuilder.offset((pageNumber - 1) * pageSize).limit(pageSize);
      }
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'date_added':
          {
            queryBuilder.orderBy({ 'role.created_on': sorting_order });
          }
          break;
        case 'user_name':
          {
            queryBuilder.orderBy({ 'LOWER(role.user_name)': sorting_order });
          }
          break;
        case 'email_id':
          {
            queryBuilder.orderBy({ 'LOWER(user.email_id)': sorting_order });
          }
          break;
        case 'user_type':
          {
            queryBuilder.orderBy({ 'role.company_role': sorting_order });
          }
          break;
        case 'status':
          {
            queryBuilder.orderBy({ 'role.status': sorting_order });
          }
          break;
      }
      if (pageNumber && pageSize) {
        queryBuilder.offset((pageNumber - 1) * pageSize).limit(pageSize);
      }
    }

    const [rawResults, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const getPendingInvitations = await this.getInvitationListsForCompany(
      decoded,
      'Sent',
      1,
      10,
      company_id,
      null,
      null,
      null,
      true,
    );

    const pending_invitations = getPendingInvitations?.total_count ?? 0;

    return { total_count, user_list: rawResults, pending_invitations };
  }

  async getUserByEmail(search: any, company_id: any) {
    const queryBuilder = this.userDetails
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.user_id', 'user_id')
      .addSelect('u.first_name', 'first_name')
      .addSelect('u.last_name', 'last_name')
      .addSelect('u.email_id', 'email_id')
      .addSelect('u.user_status', 'user_status')
      .addSelect('u.is_verified', 'is_verified')
      .addSelect('f.file_path', 'file_path')
      .addSelect('f.file_type', 'file_type')
      .addSelect('f.file_name', 'file_name')
      .addSelect('r.company_id', 'company_id')
      .addSelect('r.user_name', 'user_name')
      .addSelect('r.company_role', 'user_type')
      .addSelect('r.status', 'status')
      .addSelect('r.created_on', 'date_added')
      .addSelect('r.manage_user', 'manage_user')
      .addSelect('r.manage_company', 'manage_company')
      .addSelect(
        'r.manage_project_trust_payment',
        'manage_project_trust_payment',
      )
      .addSelect('r.manage_subscription', 'manage_subscription')
      .leftJoin(FileAttachments, 'f', 'u.profile_id = f.id')
      .leftJoin(
        CompanyUserRoles,
        'r',
        'u.user_id = r.user_id and r.company_id = :company_id and r.is_system_added = false',
        { company_id },
      );
    queryBuilder.andWhere(
      `(LOWER(u.email_id) LIKE :keyword OR CONCAT(LOWER(u.first_name), ' ', LOWER(u.last_name)) LIKE :keyword)`,
      { keyword: `%${search.toLowerCase()}%` },
    );
    queryBuilder.distinct(true);
    const results = await queryBuilder.getRawMany();
    return results;
  }

  async getInvitationListsForCompany(
    decoded: any,
    type: string,
    pageNumber: number,
    pageSize: number,
    company_id?: number,
    search?: string,
    sorting_field?: string,
    sortingOrder?: 'ASC' | 'DESC',
    checkPending?: boolean,
  ) {
    var isAdminRequested = false,
      roles,
      userId;
    if (company_id) {
      roles = await this.getCompanySpecificRole(decoded, company_id);
    }
    if (type === 'Sent') {
      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes') ||
          (roles.role === 'STANDARD USER' &&
            roles.manageUser === 'View Only')) &&
        !roles.isSystemAdded
      ) {
        isAdminRequested = true;
      } else {
        isAdminRequested = false;
        userId = decoded?.userId;
      }
    } else {
      if (
        roles &&
        roles.role &&
        (roles.role === 'PRIMARY ADMIN' ||
          roles.role === 'ADMIN' ||
          (roles.role === 'STANDARD USER' && roles.manageUser === 'Yes') ||
          (roles.role === 'STANDARD USER' &&
            roles.manageUser === 'View Only')) &&
        !roles.isSystemAdded
      ) {
        isAdminRequested = false;
      } else {
        isAdminRequested = true;
        userId = decoded?.userId;
      }
    }
    const queryBuilder = this.invitations
      .createQueryBuilder('invite')
      .select('invite.id', 'id')
      .addSelect('invite.user_name', 'user_name')
      .addSelect('invite.email_id', 'email_id')
      .addSelect('invite.user_action', 'user_action')
      .addSelect('invite.decline_count', 'decline_count')
      .addSelect('invite.is_admin_requested', 'is_admin_requested')
      .addSelect('invite.requested_by', 'requested_by')
      .addSelect('invite.user_id', 'user_id')
      .addSelect('invite.company_id', 'company_id')
      .addSelect('c.company_name', 'company_name')
      .addSelect('invite.created_on', 'created_on')
      .addSelect(`u.first_name || u.last_name`, 'admin_name')
      .addSelect('u.email_id', 'admin_email')
      .leftJoin(CompanyDetails, 'c', 'c.company_id = invite.company_id')
      .innerJoin(
        CompanyUserRoles,
        'r',
        `c.company_id = invite.company_id and c.company_id = r.company_id and r.company_role = 'PRIMARY ADMIN'`,
      )
      .innerJoin(
        UserDetails,
        'u',
        `r.user_id = u.user_id ${!decoded?.logged_in_by || !decoded?.admin_id ? " and u.user_status = 'Active'" : ''}`,
      )
      .where(`invite.is_admin_requested = :isAdminRequested`, {
        isAdminRequested: isAdminRequested,
      });

    if (company_id) {
      queryBuilder.andWhere('invite.company_id = :company_id', {
        company_id: company_id,
      });
    }

    if (type !== 'Sent' || checkPending) {
      queryBuilder.andWhere(
        'invite.user_action IS NULL', //need to remove
      );
    }

    if (userId) {
      queryBuilder.andWhere('invite.user_id = :userId', {
        userId: userId,
      });
    }

    if (search) {
      queryBuilder.andWhere(`(LOWER(invite.user_name) LIKE LOWER(:keyword))`, {
        keyword: `%${search.toLowerCase()}%`,
      });
    }

    const sorting_order = sortingOrder ? sortingOrder : 'DESC';
    if (!sorting_field) {
      queryBuilder.orderBy({ 'invite.created_on': sorting_order });
      if (pageNumber && pageSize) {
        queryBuilder.offset((pageNumber - 1) * pageSize).limit(pageSize);
      }
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'created_on':
          {
            queryBuilder.orderBy({ 'invite.created_on': sorting_order });
          }
          break;
        case 'user_name':
          {
            queryBuilder.orderBy({ 'LOWER(invite.user_name)': sorting_order });
          }
          break;
        case 'email_id':
          {
            queryBuilder.orderBy({ 'LOWER(invite.email_id)': sorting_order });
          }
          break;
        case 'user_action':
          {
            queryBuilder.orderBy({ 'invite.user_action': sorting_order });
          }
          break;
        case 'company_name':
          {
            queryBuilder.orderBy({ 'LOWER(c.company_name)': sorting_order });
          }
          break;
      }
      if (pageNumber && pageSize) {
        queryBuilder.offset((pageNumber - 1) * pageSize).limit(pageSize);
      }
    }

    const [results, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const rawResults = Array.from(
      new Map(results.map((result) => [result.id, result])).values(),
    );

    return { total_count, invitation_list: rawResults };
  }

  async checkCompanyInviteForUser(email_id: any) {
    const result = await this.invitations.find({
      where: { email_id: ILike(`${email_id}`), is_admin_requested: true },
    });
    return result;
  }

  async updateAcceptOrDecline(
    decoded,
    emailId,
    companyId,
    userAction,
    isAdminRequested,
    declineCount,
  ) {
    const inviteDetails = await this.invitations.findOne({
      where: {
        email_id: ILike(`${emailId}`),
        company_id: companyId,
        is_admin_requested: isAdminRequested,
      },
    });
    inviteDetails.user_action = userAction;
    inviteDetails.decline_count = declineCount;
    inviteDetails.updated_by = decoded?.userId;
    inviteDetails.updated_on = moment.tz('UTC');
    inviteDetails.updated_group = 'USER';
    return await this.invitations.save(inviteDetails);
  }

  async updateCompanyUserRole(decoded, userId, companyId, user_action) {
    const userRoles = await this.userRoles.findOne({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });
    if (user_action === 'Accept') {
      userRoles.status = 'Active';
      userRoles.joined_on = moment.tz('UTC');
    } else {
      userRoles.status = 'Declined';
    }
    userRoles.updated_by = decoded?.userId;
    userRoles.updated_on = moment.tz('UTC');
    userRoles.updated_group = 'USER';
    return await this.userRoles.save(userRoles);
  }

  async updateUserRole(decoded, email_id: any) {
    const user = await this.userDetails.findOne({
      where: { user_id: decoded?.userId },
    });
    if (user.user_role == Role.BASIC_USER) {
      user.user_role = Role.STANDARD_USER;
      user.updated_by = decoded?.userId;
      user.updated_on = moment.tz('UTC');
      user.updated_group = 'USER';
      return await this.userDetails.save(user);
    }
    return 'No update required';
  }

  async getInviteDetails(email_id: any, companyId: any, isAdminRequested: any) {
    const result = await this.invitations.findOne({
      where: {
        company_id: companyId,
        email_id: ILike(`${email_id}`),
        is_admin_requested: isAdminRequested,
      },
    });
    return result;
  }

  async getUserDetails(userId: any) {
    const result = await this.userDetails.findOne({
      where: {
        user_id: userId,
      },
    });
    return result;
  }

  async getUserDetailsByEmailId(email_id: any) {
    const result = await this.userDetails.findOne({
      where: {
        email_id: ILike(`${email_id}`),
        user_status: 'Active',
      },
    });
    return result;
  }

  async getCompanyDetails(companyId: any) {
    const result = await this.companyDetails.findOne({
      where: {
        company_id: companyId,
      },
    });
    return result;
  }

  async insertCompanyUserRoles(createUserAccessInput) {
    createUserAccessInput.user_first_name = await startCasePreserveUnicode(
      createUserAccessInput.user_first_name,
    );
    createUserAccessInput.user_name = await startCasePreserveUnicode(
      createUserAccessInput.user_name,
    );
    const companyUserRoles = await this.userRoles.create(createUserAccessInput);
    return await this.userRoles.save(companyUserRoles);
  }

  async updateInvites(inviteDetails) {
    return await this.invitations.save(inviteDetails);
  }

  async updateCompanyUserRoles(decoded, createUserAccessInput) {
    const userRoles = await this.userRoles.findOne({
      where: {
        user_id: createUserAccessInput.user_id,
        company_id: createUserAccessInput.company_id,
      },
    });
    userRoles.user_name = createUserAccessInput.user_name;
    userRoles.company_role = createUserAccessInput.company_role;
    userRoles.status = 'Inactive';
    userRoles.manage_user = createUserAccessInput.manage_user;
    userRoles.manage_company = createUserAccessInput.manage_company;
    userRoles.manage_project_trust_payment =
      createUserAccessInput.manage_project_trust_payment;
    userRoles.manage_subscription = createUserAccessInput.manage_subscription;
    userRoles.updated_by = decoded?.userId;
    userRoles.updated_on = moment.tz('UTC');
    userRoles.updated_group = 'USER';
    return await this.userRoles.save(userRoles);
  }

  async insertInvitation(createInvitationInput) {
    const invitationRes = await this.invitations.create(createInvitationInput);
    return await this.invitations.save(invitationRes);
  }

  async updateInvitation(getInviteDetails, createUserAccessInput) {
    getInviteDetails.updated_by = createUserAccessInput.created_by;
    getInviteDetails.updated_on = createUserAccessInput.created_on;
    return await this.invitations.save(getInviteDetails);
  }

  async getUserById(user_id: any, company_id: any) {
    const result = await this.userRoles.findOne({
      where: {
        user_id,
        company_id,
      },
      relations: ['userDetails', 'companyDetails'],
    });
    return result;
  }

  async getExistingAdmin(companyId: any) {
    const result = await this.userRoles.findOne({
      where: {
        company_id: companyId,
        company_role: Role.PRIMARY_ADMIN,
      },
      relations: ['userDetails', 'companyDetails'],
    });
    return result;
  }

  async updatePrimaryAdmin(userDetails, userId) {
    userDetails.company_role = Role.PRIMARY_ADMIN;
    userDetails.updated_by = userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userRoles.save(userDetails);
  }

  async updateAdmin(userDetails, userId) {
    userDetails.company_role = Role.ADMIN;
    userDetails.updated_by = userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userRoles.save(userDetails);
  }

  async deleteUserFromCompany(userDetails, userId) {
    userDetails.status = 'Deleted';
    userDetails.updated_by = userId;
    userDetails.updated_on = moment.tz('UTC');
    userDetails.updated_group = 'USER';
    return await this.userRoles.save(userDetails);
  }

  async editUserFromCompany(updateUserAccessInput, userId) {
    updateUserAccessInput.user_first_name = await startCasePreserveUnicode(
      updateUserAccessInput.user_first_name,
    );
    updateUserAccessInput.user_name = await startCasePreserveUnicode(
      updateUserAccessInput.user_name,
    );
    updateUserAccessInput.updated_by = userId;
    updateUserAccessInput.updated_on = moment.tz('UTC');
    updateUserAccessInput.updated_group = 'USER';
    return await this.userRoles.save(updateUserAccessInput);
  }

  async switchModeOfAnUser(data: SwitchModeOfAnUserInput) {
    try {
      const { user_id, user_mode } = data;
      this.logger.log(`Switching user mode with data: ${JSON.stringify(data)}`);

      await this.userDetails
        .createQueryBuilder()
        .update(UserDetails)
        .set({ user_mode })
        .where(`user_id = :user_id`, { user_id })
        .execute();
      this.logger.log(`User mode switched successfully`);

      const responseMessage =
        user_mode == 'Onboarding'
          ? `You are redirected into "Onboarding Mode"`
          : `You are redirected into "Normal Mode"`;
      return framedResponse('SUCCESS', responseMessage);
    } catch (error) {
      throw error;
    }
  }

  async fetchModeOfAnUser(data: FetchModeOfAnUserInput) {
    try {
      const { user_id } = data;

      const userDetails = await this.userDetails.findOne({
        where: { user_id },
        select: ['user_id', 'user_mode'],
      });
      this.logger.log(`Fetched user mode: ${JSON.stringify(userDetails)}`);

      return framedResponse(
        'SUCCESS',
        'Mode of an user successfully fetched.',
        userDetails,
      );
    } catch (error) {
      throw error;
    }
  }

  async getCompanySpecificRole(decoded, company_id): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          decoded?.companySpecificRoles &&
          decoded?.companySpecificRoles.length > 0 &&
          decoded?.companySpecificRoles[0] !== null
        ) {
          const roles = decoded?.companySpecificRoles.filter((item) => {
            return item.companyId === company_id;
          });
          // this.logger.log(
          //   `Response received with roles: ${JSON.stringify(roles)}`,
          // );
          if (roles && roles.length > 0 && roles[0] !== null) {
            resolve(roles[0]);
          }
          resolve('');
        }
        resolve('');
      } catch (error) {
        this.logger.error(`Errored while getting company specific role with message: ${error?.message ? error?.message : error}`);
      }
    });
  }
}
