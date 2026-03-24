import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminGroupDetails,
  GroupStatus,
} from '../../../entities/admin-group-details.entity';
import { ILike, In, Not, Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { AddGroupInput, MenuPrivileges } from './dto/add.group.dto';
import { AddAdminMenuInput, UpdateAdminMenuInput } from './dto/admin-menu.dto';
import { UpdateGroupInput } from './dto/update.group.dto';
import { AdminMenuDetails } from '../../../entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from '../../../entities/admin-group-menu-priv.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { AdminGroup } from 'src/entities/admin-group.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';

@Injectable()
export class PtGroupsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(AdminGroupDetails)
    private admingroupdetails: Repository<AdminGroupDetails>,
    @InjectRepository(AdminMenuDetails)
    private adminmenudetails: Repository<AdminMenuDetails>,
    @InjectRepository(AdminGroupMenuPriv)
    private admingroupmenupriv: Repository<AdminGroupMenuPriv>,
    @InjectRepository(AdminGroup)
    private adminGroup: Repository<AdminGroup>,
  ) {
    this.logger = new PaytradeLogger('ADMIN_GROUP_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async getGroupByName(group_name: string): Promise<any> {
    return await this.admingroupdetails.findOne({
      where: {
        group_name: ILike(`${group_name}`),
        group_status: Not('Deleted'),
      },
    });
  }

  async adminfetchListOfAllMenus() {
    return await this.adminmenudetails.find({ order: { menu_order: 'ASC' } });
  }

  async insertAdminGroupDetails(addPTGroupInput: AddGroupInput) {
    const createGroup = this.admingroupdetails.create(addPTGroupInput);
    const group = await this.admingroupdetails.save(createGroup);

    if (addPTGroupInput.menuPrivileges) {
      for (const menuPrivilegeInput of addPTGroupInput.menuPrivileges) {
        const menuId = menuPrivilegeInput.menuId;
        const menu = await this.adminmenudetails.findOne({
          where: { id: menuId },
        });
        if (!menu) throw 'Menu not found.';
        if (menuPrivilegeInput.allPermission) {
          const groupMenuPriv = new AdminGroupMenuPriv();
          groupMenuPriv.adminGroupDetails = group;
          groupMenuPriv.adminMenuDetails = menu;
          groupMenuPriv.all_permission = menuPrivilegeInput.allPermission;
          groupMenuPriv.list_permission =
            menuPrivilegeInput.listPermission ?? true;
          groupMenuPriv.insert_permission =
            menuPrivilegeInput.insertPermission ?? true;
          groupMenuPriv.update_permission =
            menuPrivilegeInput.updatePermission ?? true;
          groupMenuPriv.delete_permission =
            menuPrivilegeInput.deletePermission ?? true;
          groupMenuPriv.export_permission =
            menuPrivilegeInput.exportPermission ?? true;
          groupMenuPriv.print_permission =
            menuPrivilegeInput.printPermission ?? true;
          groupMenuPriv.view_permission =
            menuPrivilegeInput.viewPermission ?? true;

          await this.admingroupmenupriv.save(groupMenuPriv);
        }
      }
    }
    return group;
  }

  async updateGroupDetails(updateGroupInput: UpdateGroupInput): Promise<any> {
    const groupId = updateGroupInput.id;
    const group = await this.admingroupdetails.findOne({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const updatedGroup = {
      ...group,
      group_name: updateGroupInput.group_name ?? group.group_name,
      group_description:
        updateGroupInput.group_description ?? group.group_description,
      group_status:
        updateGroupInput.group_status ?? group.group_status ?? 'Active',
    };

    const savedGroup = await this.admingroupdetails.save(updatedGroup);

    if (
      updateGroupInput.menuPrivileges &&
      updateGroupInput.menuPrivileges.length > 0
    ) {
      const menuIdsInInput = updateGroupInput.menuPrivileges.map(
        (menuPrivilege) => menuPrivilege.menuId,
      );

      for (const menuPrivilegeInput of updateGroupInput.menuPrivileges) {
        const { menuId } = menuPrivilegeInput;

        let groupMenuPriv = await this.admingroupmenupriv.findOne({
          where: { group_id: savedGroup.id, menu_id: menuId },
        });

        const menu = await this.adminmenudetails.findOne({
          where: { id: menuId },
        });
        if (!menu) {
          throw new NotFoundException(`Menu with ID ${menuId} not found`);
        }

        if (!groupMenuPriv) {
          groupMenuPriv = new AdminGroupMenuPriv();
        }

        // Update the permissions
        groupMenuPriv.adminGroupDetails = savedGroup;
        groupMenuPriv.adminMenuDetails = menu;
        groupMenuPriv.all_permission =
          menuPrivilegeInput.allPermission ?? false;
        groupMenuPriv.list_permission =
          menuPrivilegeInput.listPermission ?? true;
        groupMenuPriv.insert_permission =
          menuPrivilegeInput.insertPermission ?? true;
        groupMenuPriv.update_permission =
          menuPrivilegeInput.updatePermission ?? true;
        groupMenuPriv.delete_permission =
          menuPrivilegeInput.deletePermission ?? true;
        groupMenuPriv.export_permission =
          menuPrivilegeInput.exportPermission ?? true;
        groupMenuPriv.print_permission =
          menuPrivilegeInput.printPermission ?? true;
        groupMenuPriv.view_permission =
          menuPrivilegeInput.viewPermission ?? true;

        await this.admingroupmenupriv.save(groupMenuPriv);
      }

      const menuPrivsToRemove = await this.admingroupmenupriv.find({
        where: {
          group_id: savedGroup.id,
          all_permission: false, // Check for allPermission set to false
          menu_id: In(menuIdsInInput), // Ensure it's in the provided menu privilege list
        },
      });

      if (menuPrivsToRemove.length > 0) {
        await this.admingroupmenupriv.remove(menuPrivsToRemove);
      }
    }

    if (savedGroup.group_status === 'Deleted') {
      const menuPrivsToRemove = await this.admingroupmenupriv.find({
        where: {
          group_id: savedGroup.id,
        },
      });
      if (menuPrivsToRemove.length > 0) {
        await this.admingroupmenupriv.remove(menuPrivsToRemove);
      }
    }

    return savedGroup;
  }

  async getAdminDetails(id: string) {
    return this.adminGroup.find({ where: { group_id: id } });
  }

  async updateGroupStatus(id: string): Promise<any> {
    const group = await this.admingroupdetails.findOne({
      where: { id: id },
    });
    if (!group) {
      throw new NotFoundException(`Group not found`);
    } else {
      const menuPrivsToRemove = await this.admingroupmenupriv.find({
        where: {
          group_id: id,
        },
      });
      if (menuPrivsToRemove.length > 0) {
        await this.admingroupmenupriv.remove(menuPrivsToRemove);
      }
      group.group_status = 'Deleted';
      return await this.admingroupdetails.save(group);
    }
  }

  async getGroupDetailsById(id: string) {
    const queryBuilder: SelectQueryBuilder<AdminGroupDetails> =
      this.admingroupdetails
        .createQueryBuilder('group')
        .where('group.id = :id', { id })
        .leftJoinAndSelect('group.groupMenuDetails', 'groupMenuDetails')
        .leftJoinAndSelect(
          'groupMenuDetails.adminMenuDetails',
          'adminMenuDetails',
        )
        .select([
          'group.id',
          'group.group_name',
          'group.group_description',
          'group.group_status',
          'group.created_on',
          'groupMenuDetails.menu_id',
          'groupMenuDetails.all_permission',
          'groupMenuDetails.list_permission',
          'groupMenuDetails.insert_permission',
          'groupMenuDetails.update_permission',
          'groupMenuDetails.delete_permission',
          'groupMenuDetails.export_permission',
          'groupMenuDetails.print_permission',
          'groupMenuDetails.view_permission',
          'adminMenuDetails.menu_name', // Add menuName along with menuId
        ]);
    return await queryBuilder.getOne();
  }

  async listAllGroups(
    keyword: string,
    status: GroupStatus,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
    isAlphabeticalOrder?: boolean,
  ): Promise<any> {
    const queryBuilder = this.admingroupdetails.createQueryBuilder('group');

    if (status) {
      queryBuilder.andWhere('group.group_status = :status', { status });
    } else {
      // Exclude groups with "Deleted" status when no specific status is provided
      queryBuilder.andWhere('group.group_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (keyword) {
      queryBuilder.andWhere('LOWER(group.group_name) LIKE :keyword', {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'group.created_on': sorting_order });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'group_name':
          {
            queryBuilder.orderBy({ 'LOWER(group.group_name)': sorting_order });
          }
          break;
        case 'group_description':
          {
            queryBuilder.orderBy({
              'LOWER(group.group_description)': sorting_order,
            });
          }
          break;

        case 'group_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(group.group_status AS text))': sorting_order,
            });
          }
          break;
        case 'created_on':
          {
            queryBuilder.orderBy({ 'group.created_on': sorting_order });
          }
          break;
      }
    }

    const [allGroups, totalCount] = await Promise.all([
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
    const groups = allGroups?.slice(startIndex, endIndex);

    return { groups, totalCount };
  }

  async getSideMenusForAdmin(id: string) {
    this.logger.log(
      `Handling request for fetching side menus for an admin with data: ${id}`,
    );

    const rawResults = await this.adminDetails
      .createQueryBuilder('a')
      .select('a.id', 'id')
      .addSelect('a.admin_id', 'admin_id')
      .addSelect('ag.group_id', 'group_id')
      .addSelect('agd.group_name', 'group_name')
      .addSelect('agmp.menu_id', 'menu_id')
      .addSelect('am.menu_name', 'menu_name')
      .addSelect('am.menu_description', 'menu_description')
      .addSelect('am.menu_icon', 'menu_icon')
      .addSelect('am.route_path', 'route_path')
      .addSelect('am.menu_order', 'menu_order')
      .addSelect('am.parent_id', 'parent_id')
      .addSelect('am.menu_status', 'menu_status')
      .addSelect('am.menu_type', 'menu_type')
      .addSelect('array_to_json(am.sub_menus)::jsonb', 'sub_menus')
      .addSelect('agmp.all_permission', 'all_permission')
      .addSelect('agmp.list_permission', 'list_permission')
      .addSelect('agmp.insert_permission', 'insert_permission')
      .addSelect('agmp.update_permission', 'update_permission')
      .addSelect('agmp.delete_permission', 'delete_permission')
      .addSelect('agmp.export_permission', 'export_permission')
      .addSelect('agmp.print_permission', 'print_permission')
      .addSelect('agmp.view_permission', 'view_permission')
      .distinct(true)
      .leftJoin(AdminGroup, 'ag', 'a.id = ag.admin_id')
      .leftJoin(AdminGroupDetails, 'agd', 'ag.group_id = agd.id')
      .leftJoin(
        AdminGroupMenuPriv,
        'agmp',
        'ag.group_id = agmp.group_id and agmp.all_permission = true',
      )
      .leftJoin(AdminMenuDetails, 'am', 'am.id = agmp.menu_id')
      .where(
        `a.admin_status = 'Active' and agd.group_status = 'Active' and a.id = :id`,
        {
          id,
        },
      )
      .orderBy({ 'am.menu_order': 'ASC' })
      .getRawMany();

    this.logger.log(
      `Fetched Side menus for an admin with id: ${id} successfully with data: ${JSON.stringify(rawResults)}`,
    );
    return rawResults.map((element) => {
      return {
        id: element.id,
        admin_id: element.admin_id,
        group_id: element.group_id,
        group_name: element.group_name,
        menu_id: element.menu_id,
        menu_name: element.menu_name,
        menu_description: element.menu_description,
        menu_icon: element.menu_icon,
        route_path: element.route_path,
        menu_order: element.menu_order,
        parent_id: element.parent_id,
        menu_status: element.menu_status,
        menu_type: element.menu_type,
        all_permission: element.all_permission,
        list_permission: element.list_permission,
        insert_permission: element.insert_permission,
        update_permission: element.update_permission,
        delete_permission: element.delete_permission,
        export_permission: element.export_permission,
        print_permission: element.print_permission,
        view_permission: element.view_permission,
        sub_menus: element?.sub_menus.map((element) => {
          return {
            name: element?.name,
            route: element?.route,
            icon: element?.icon,
          };
        }),
      };
    });
  }

  private buildSubMenusSQL(subMenus: any[]): string {
    if (!subMenus || subMenus.length === 0) {
      return `ARRAY['{"name":"","route":"","icon":""}'::json]`;
    }
    const elements = subMenus.map(
      (sm) => `'${JSON.stringify({ name: sm.name || '', route: sm.route || '', icon: sm.icon || '' }).replace(/'/g, "''")}'::json`,
    );
    return `ARRAY[${elements.join(', ')}]`;
  }

  async adminFetchAllMenuDetails() {
    return await this.adminmenudetails.find({
      where: { menu_status: Not('Deleted') as any },
      order: { menu_order: 'ASC' },
    });
  }

  async adminAddMenu(input: AddAdminMenuInput) {
    const manager = this.adminmenudetails.manager;
    const subMenusSQL = this.buildSubMenusSQL(input.sub_menus);

    const result = await manager.query(
      `INSERT INTO admin_menu_details (menu_name, route_path, menu_order, menu_icon, menu_description, menu_status, menu_type, sub_menus)
       VALUES ($1, $2, $3, $4, $5, $6, 'Admin', ${subMenusSQL})
       RETURNING id`,
      [input.menu_name, input.route_path, input.menu_order, input.menu_icon || '', input.menu_description || '', input.menu_status || 'Active'],
    );

    const newId = result[0]?.id;
    if (newId) {
      const activeGroups = await this.admingroupdetails.find({
        where: { group_status: 'Active' as any },
      });
      for (const group of activeGroups) {
        const priv = this.admingroupmenupriv.create({
          group_id: group.id,
          menu_id: newId,
          all_permission: true,
          list_permission: true,
          insert_permission: true,
          update_permission: true,
          delete_permission: true,
          export_permission: true,
          print_permission: true,
          view_permission: true,
        });
        await this.admingroupmenupriv.save(priv);
      }
    }

    return await this.adminmenudetails.findOne({ where: { id: newId } });
  }

  async adminUpdateMenu(input: UpdateAdminMenuInput) {
    const existing = await this.adminmenudetails.findOne({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundException(`Menu with id ${input.id} not found`);
    }

    const manager = this.adminmenudetails.manager;
    const subMenusSQL = input.sub_menus ? this.buildSubMenusSQL(input.sub_menus) : null;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (input.menu_name !== undefined && input.menu_name !== null) {
      updates.push(`menu_name = $${paramIdx++}`);
      params.push(input.menu_name);
    }
    if (input.route_path !== undefined && input.route_path !== null) {
      updates.push(`route_path = $${paramIdx++}`);
      params.push(input.route_path);
    }
    if (input.menu_order !== undefined && input.menu_order !== null) {
      updates.push(`menu_order = $${paramIdx++}`);
      params.push(input.menu_order);
    }
    if (input.menu_icon !== undefined && input.menu_icon !== null) {
      updates.push(`menu_icon = $${paramIdx++}`);
      params.push(input.menu_icon);
    }
    if (input.menu_description !== undefined && input.menu_description !== null) {
      updates.push(`menu_description = $${paramIdx++}`);
      params.push(input.menu_description);
    }
    if (input.menu_status !== undefined && input.menu_status !== null) {
      updates.push(`menu_status = $${paramIdx++}`);
      params.push(input.menu_status);
    }
    if (subMenusSQL) {
      updates.push(`sub_menus = ${subMenusSQL}`);
    }

    if (updates.length > 0) {
      params.push(input.id);
      await manager.query(
        `UPDATE admin_menu_details SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        params,
      );
    }

    return await this.adminmenudetails.findOne({ where: { id: input.id } });
  }

  async adminDeleteMenu(id: string) {
    const existing = await this.adminmenudetails.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu with id ${id} not found`);
    }

    await this.admingroupmenupriv.delete({ menu_id: id });
    await this.adminmenudetails.delete({ id });

    return true;
  }

  async adminBulkUpdateMenus(menus: UpdateAdminMenuInput[]) {
    const results: any[] = [];
    for (const menu of menus) {
      const updated = await this.adminUpdateMenu(menu);
      if (updated) results.push(updated);
    }
    return results;
  }
}
