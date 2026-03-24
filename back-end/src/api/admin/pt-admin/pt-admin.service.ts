import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { AddPTAdminInput, SortingOrder } from './dto/add-admin.dto';
import {
  AdminDetails,
  AdminStatus,
} from '../../../entities/admin-details.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminGroup } from '../../../entities/admin-group.entity';
import {
  CreateAdminEmailVerificationInput,
  UpdateAdminInput,
} from './dto/update-admin.dto';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { v4 as uuidv4 } from 'uuid';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';

var bcrypt = require('bcryptjs');
const saltOrRounds = bcrypt.genSaltSync(5);
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PtAdminService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(AdminGroupDetails)
    private groupDetails: Repository<AdminGroupDetails>,
    @InjectRepository(AdminGroup)
    private admingroups: Repository<AdminGroup>,
    @InjectRepository(AdminEmailVerificationDetails)
    private adminEmailVerificationDetails: Repository<AdminEmailVerificationDetails>,
  ) {
    this.logger = new PaytradeLogger('ADMIN_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getActiveAdminCount(): Promise<number> {
    return this.adminDetails.count({
      where: { admin_status: 'Active' as AdminStatus },
    });
  }

  async ensureNotLastActiveAdmin(adminId: string, action: string): Promise<void> {
    const admin = await this.adminDetails.findOne({ where: { id: adminId } });
    if (!admin || admin.admin_status !== 'Active') return;

    const activeCount = await this.getActiveAdminCount();
    if (activeCount <= 1) {
      throw new ForbiddenException(
        `Cannot ${action} the last active admin user. At least one active admin must exist at all times.`,
      );
    }
  }

  async create(addPTAdminInput: AddPTAdminInput) {
    this.logger.log(
      `New Admin add initiated with payload: ${JSON.stringify(addPTAdminInput)}`,
    );
    addPTAdminInput.password = await bcrypt.hashSync(
      String(addPTAdminInput.password),
      saltOrRounds,
    );
    const admin = this.adminDetails.create(addPTAdminInput);
    return await this.adminDetails.save(admin);
  }

  async createAdminGroup(adminGroup: AdminGroup): Promise<AdminGroup> {
    this.logger.log(
      `New Admin Group add initiated with payload: ${JSON.stringify(adminGroup)}`,
    );
    return this.admingroups.save(adminGroup);
  }

  async update(id: string, updateAdminInput: UpdateAdminInput): Promise<any> {
    const admin = await this.getAdminById(id);

    this.logger.log(
      `Update admin details initiated with payload: ${JSON.stringify(updateAdminInput)}`,
    );

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    } else {
      //  const allowedProperties = ['first_name', 'last_name', 'password', 'email_id'];
      if (updateAdminInput.password) {
        const EncrypNewPassword = await bcrypt.hashSync(
          String(updateAdminInput.password),
          saltOrRounds,
        );
        updateAdminInput.password = EncrypNewPassword;
      }
      if (updateAdminInput.email_id) {
        if (admin.email_id !== updateAdminInput.email_id) {
          throw new ForbiddenException(
            `Admin mail ID can only be updated in the profile settings`,
          );
        }
      }
      const updatedAdmin = { ...admin, ...updateAdminInput };

      return await this.adminDetails.save(updatedAdmin);
    }
  }

  async verifyAdminEmail(
    createAdminEmailVerificationInput: CreateAdminEmailVerificationInput,
  ) {
    this.logger.log(
      `Admin email verification initiated with payload: ${JSON.stringify(createAdminEmailVerificationInput)}`,
    );
    var adminEmailVerificationDetails;

    if (createAdminEmailVerificationInput.type != 'Resend') {
      const whereConditions = {
        email_id: ILike(`${createAdminEmailVerificationInput.email_id}`),
      };
      const checkEmailExists = await this.adminEmailVerificationDetails.find({
        where: whereConditions,
      });

      const adminNameDetails = await this.adminDetails.findOne({
        where: { id: createAdminEmailVerificationInput.id },
      });

      if (
        checkEmailExists &&
        checkEmailExists !== null &&
        checkEmailExists.length > 0 &&
        checkEmailExists[0] !== null
      ) {
        const deleteUser =
          await this.adminEmailVerificationDetails.delete(whereConditions);
      }

      adminEmailVerificationDetails = this.adminEmailVerificationDetails.create(
        createAdminEmailVerificationInput,
      );
      adminEmailVerificationDetails.first_name = adminNameDetails.first_name;
      adminEmailVerificationDetails.last_name = adminNameDetails.last_name;
    } else {
      adminEmailVerificationDetails =
        await this.adminEmailVerificationDetails.findOne({
          where: {
            email_id: ILike(`${createAdminEmailVerificationInput.email_id}`),
          },
        });

      const adminNameDetails = await this.adminDetails.findOne({
        where: { id: createAdminEmailVerificationInput.id },
      });

      adminEmailVerificationDetails.verification_code =
        createAdminEmailVerificationInput.verification_code;
      adminEmailVerificationDetails.code_expires_in =
        createAdminEmailVerificationInput.code_expires_in;

      adminEmailVerificationDetails.first_name = adminNameDetails.first_name;
      adminEmailVerificationDetails.last_name = adminNameDetails.last_name;
    }

    return await this.adminEmailVerificationDetails.save(
      adminEmailVerificationDetails,
    );
  }

  async getAdminEmailVerifyDetails(createInput) {
    const response = await this.adminEmailVerificationDetails.findOne({
      where: { email_id: ILike(`${createInput.email_id}`) },
    });
    return response;
  }

  async updateAdminEmail(email_id: string, new_email_id: string) {
    this.logger.log(
      `List Projects initiated with company-id=${email_id}, new mail-d = ${new_email_id}`,
    );
    const adminDetails = await this.adminDetails.findOne({
      where: { email_id: ILike(`${email_id}`) },
    });
    adminDetails.email_id = new_email_id;
    adminDetails.updated_by = adminDetails.admin_id;
    adminDetails.updated_on = moment.tz('UTC');
    adminDetails.updated_group = 'USER';
    return await this.adminDetails.save(adminDetails);
  }

  async PortalAdminUpdate(
    portalAdminId: string,
    updateAdminInput: UpdateAdminInput,
  ) {
    this.logger.log(
      `Update to Portal Admin initiated with payload: ${JSON.stringify(updateAdminInput)}`,
    );
    const admin = await this.adminDetails.findOne({
      where: { id: updateAdminInput.id },
    });
    if (!admin) {
      throw new NotFoundException(`Admin details not found`);
    } else {
      if (
        updateAdminInput.admin_status &&
        updateAdminInput.admin_status !== 'Active' &&
        admin.admin_status === 'Active'
      ) {
        await this.ensureNotLastActiveAdmin(updateAdminInput.id, updateAdminInput.admin_status === 'Deleted' ? 'delete' : 'deactivate');
      }
      if (updateAdminInput.password) {
        const EncrypNewPassword = await bcrypt.hashSync(
          String(updateAdminInput.password),
          saltOrRounds,
        );
        updateAdminInput.password = EncrypNewPassword;
      }
      const updatedAdmin = { ...admin, ...updateAdminInput };
      updatedAdmin.admin_status =
        updateAdminInput.admin_status || admin.admin_status || 'Active';

      //if a new admin is given the Super Admin Role
      if (updateAdminInput.admin_role == Role.PORTAL_ADMIN) {
        const portalAdmin = await this.adminDetails.findOne({
          where: { id: portalAdminId },
        });
        portalAdmin.admin_role = Role.RESTRICTED_PORTAL_ADMIN; //portal Admin role is revoked
        await this.adminDetails.save(portalAdmin);
      }

      if (updateAdminInput.group_ids) {
        const existingAdminGroups = await this.admingroups.find({
          where: {
            admin_id: updateAdminInput.id,
          },
        });
        const existingGroupIds = existingAdminGroups.map(
          (group) => group.group_id,
        );

        // Identify group IDs to be deleted
        const groupIdsToDelete = existingGroupIds.filter(
          (groupId) => !updateAdminInput.group_ids.includes(groupId),
        );
        // Delete entries in admin-group table for the identified group IDs
        await this.admingroups.delete({
          admin_id: admin.id,
          group_id: In(groupIdsToDelete),
        });

        //avoiding existing groupIDs
        const newGroupIds = updateAdminInput.group_ids.filter(
          (groupId) => !existingGroupIds.includes(groupId),
        );

        // Fetch group details of groups newly added
        const newGroupDetails = await this.groupDetails.find({
          where: {
            id: In(newGroupIds),
          },
        });

        const newAdminGroups = newGroupIds.map((groupId) => {
          const groupDetail = newGroupDetails.find(
            (detail) => detail.id === groupId,
          );
          return this.admingroups.create({
            admin_id: admin.id,
            group_id: groupId,
            adminDetails: admin,
            adminGroupDetails: groupDetail,
          });
        });

        await this.admingroups.save(newAdminGroups);
      }

      const updatedAdminData = await this.adminDetails.save(updatedAdmin);
      return updatedAdminData;
    }
  }

  async getAdminByEmail(email_id: any) {
    const result = await this.adminDetails.findOne({
      where: { email_id: ILike(`${email_id}`), admin_status: Not('Deleted') },
    });
    return result;
  }

  async checkAdminExistence(email_id: any) {
    const result = await this.adminDetails.findOne({
      where: {
        email_id: ILike(`${email_id}`),
        admin_status: Not('Deleted'),
      },
    });
    return result;
  }

  async getAdminById(id: string) {
    const result = await this.adminDetails.findOne({
      where: { id },
      relations: ['adminDetailsGroup', 'fileAttachments'],
    });
    return result;
  }

  async resetAdminPassword(id: string) {
    const admin = await this.adminDetails.findOne({
      where: { id },
    });

    this.logger.log(
      `Admin password reset initiated for id: ${JSON.stringify(id)}`,
    );

    const newPassword = uuidv4().slice(0, 8);
    const EncrypNewPassword = await bcrypt.hashSync(
      String(newPassword),
      saltOrRounds,
    );
    admin.password = EncrypNewPassword;
    await this.adminDetails.save(admin);

    return { admin: { ...admin, newPassword } };
  }

  async getAllAdmins(skip: number, take: number): Promise<any> {
    return this.adminDetails.find({
      skip,
      take,
      order: { created_on: 'DESC' },
    });
  }

  async getAdminsCount(): Promise<number> {
    return this.adminDetails.count();
  }

  async searchAdmins(
    keyword: string,
    status: AdminStatus | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<{ admins: any[]; totalCount: number }> {
    const queryBuilder = this.adminDetails.createQueryBuilder('admin');

    if (status) {
      queryBuilder.andWhere('admin.admin_status = :status', { status });
    } else {
      queryBuilder.andWhere('admin.admin_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        `(LOWER(admin.email_id) LIKE :keyword OR CONCAT(LOWER(admin.first_name), ' ', LOWER(admin.last_name)) LIKE :keyword)`,
        { keyword: `%${keyword.toLowerCase()}%` },
      );
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'admin.created_on': 'DESC' });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'first_name':
          {
            queryBuilder.orderBy({ 'LOWER(admin.first_name)': sorting_order });
          }
          break;
        case 'email_id':
          {
            queryBuilder.orderBy({ 'LOWER(admin.email_id)': sorting_order });
          }
          break;
        case 'admin_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(admin.admin_status AS text))': sorting_order,
            });
          }
          break;

        case 'created_on':
          {
            queryBuilder.orderBy({ 'admin.created_on': sorting_order });
          }
          break;
        case 'admin_role':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(admin.admin_role AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [allAdmins, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
          (page_number - 1) * items_per_page + items_per_page,
          totalCount,
        )
        : totalCount;
    // Slice the results array to get the results for the current page
    const admins = allAdmins?.slice(startIndex, endIndex);

    const transformedAdmins = admins.map((admin) => ({
      ...admin,
      admin_role:
        admin.admin_role === 'RESTRICTED PORTAL ADMIN'
          ? 'Admin'
          : 'Super Admin',
    }));

    return { admins: transformedAdmins, totalCount };
  }

  async updateLoginInfo(
    email_id: any,
    lastLoggedIn: any,
    user_timezone: string,
  ) {
    const user = await this.adminDetails.findOne({
      where: { email_id: ILike(`${email_id}`), admin_status: 'Active' },
    });
    if (user) {
      user.last_logged_in = lastLoggedIn;
      user.user_timezone = user_timezone;
      var result = await this.adminDetails.save(user);
      return result;
    } else {
      return result;
    }
  }
}
