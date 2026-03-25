import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminMenuDetails } from 'src/entities/admin-menu-details.entity';
import { AdminGroupMenuPriv } from 'src/entities/admin-group-menu-priv.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

interface SubMenu {
  name: string;
  route: string;
  icon: string;
}

interface MenuSeed {
  id: string;
  menu_name: string;
  route_path: string;
  menu_order: number;
  menu_icon: string;
  sub_menus: SubMenu[];
}

const MASTER_MENUS: MenuSeed[] = [
  { id: 'a0000001-0000-0000-0000-000000000001', menu_name: 'Dashboard',          route_path: '/admin/dashboard',              menu_order: 1,  menu_icon: 'fa-light fa-objects-column',     sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000002', menu_name: 'Users',              route_path: '/admin/users',                  menu_order: 2,  menu_icon: 'fa-light fa-users',              sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000003', menu_name: 'Business',           route_path: '/admin/business',               menu_order: 3,  menu_icon: 'fa-light fa-building',           sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000004', menu_name: 'Admin Users',        route_path: '/admin/admin-users',            menu_order: 4,  menu_icon: 'fa-light fa-user-shield',        sub_menus: [{ name: 'Admin users', route: '/admin/admin-users', icon: '' }, { name: 'Admin groups', route: '/admin/groups', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000005', menu_name: 'Compliances',        route_path: '/admin/compliances',            menu_order: 5,  menu_icon: 'fa-light fa-clipboard-check',    sub_menus: [{ name: 'All compliances', route: '/admin/compliances', icon: '' }, { name: 'Manage compliances', route: '/admin/manage-compliances', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000006', menu_name: 'Notices',            route_path: '/admin/notices/current',        menu_order: 6,  menu_icon: 'fa-light fa-bell',               sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000007', menu_name: 'Communication',      route_path: '/admin/communication',          menu_order: 7,  menu_icon: 'fa-light fa-envelope',           sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000008', menu_name: 'Content Management', route_path: '/admin/content-management',     menu_order: 8,  menu_icon: 'fa-light fa-file-lines',         sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000009', menu_name: 'Subscriptions',      route_path: '/admin/subscriptions/current',  menu_order: 9,  menu_icon: 'fa-light fa-credit-card',        sub_menus: [{ name: 'Manage plans', route: '/admin/subscriptions/current', icon: '' }, { name: 'Manage items', route: '/admin/subscriptions/manage-items/current', icon: '' }, { name: 'Manage profiles', route: '/admin/subscriptions/manage-profiles', icon: '' }, { name: 'Manage coupons', route: '/admin/subscriptions/manage-coupons/current', icon: '' }, { name: 'Billing history', route: '/admin/subscriptions/billing-history', icon: '' }, { name: 'Pricing table', route: '/admin/subscriptions/pricing-table', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000010', menu_name: 'Masters',            route_path: '/admin/masters',                menu_order: 10, menu_icon: 'fa-light fa-sliders',            sub_menus: [{ name: 'All masters', route: '/admin/masters', icon: '' }, { name: 'Currency', route: '/admin/currency', icon: '' }, { name: 'Financial institution', route: '/admin/financial-institution', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000011', menu_name: 'Contacts',           route_path: '/admin/contact',                menu_order: 11, menu_icon: 'fa-light fa-address-book',       sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000012', menu_name: 'Journals',           route_path: '/admin/journals',               menu_order: 12, menu_icon: 'fa-light fa-journal-whills',     sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000013', menu_name: 'Delegation',         route_path: '/admin/delegation',             menu_order: 13, menu_icon: 'fa-light fa-users-cog',          sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000014', menu_name: 'Holidays',           route_path: '/admin/holidays',               menu_order: 14, menu_icon: 'fa-light fa-calendar-star',      sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000015', menu_name: 'Activity Log',       route_path: '/admin/activity-log',           menu_order: 15, menu_icon: 'fa-light fa-clock-rotate-left',  sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000016', menu_name: 'Community',          route_path: '/admin/community/discussions',  menu_order: 16, menu_icon: 'fa-light fa-people-group',       sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000017', menu_name: 'Blog',              route_path: '/admin/blog',                   menu_order: 17, menu_icon: 'fa-light fa-pen-to-square',      sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000018', menu_name: 'Resource Guides',    route_path: '/admin/resource',               menu_order: 18, menu_icon: 'fa-light fa-book-open',          sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000019', menu_name: 'How To Guides',      route_path: '/admin/how-to-guides',          menu_order: 19, menu_icon: 'fa-light fa-chalkboard-teacher', sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000020', menu_name: 'SEO Keywords',       route_path: '/admin/seo-keywords',           menu_order: 20, menu_icon: 'fa-light fa-magnifying-glass',   sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000021', menu_name: 'Admin Guides',      route_path: '/admin/admin-guides',           menu_order: 21, menu_icon: 'fa-light fa-book-bookmark',      sub_menus: [{ name: '', route: '', icon: '' }] },
  { id: 'a0000001-0000-0000-0000-000000000022', menu_name: 'Admin Menus',       route_path: '/admin/admin-menus',            menu_order: 22, menu_icon: 'fa-light fa-bars',               sub_menus: [{ name: '', route: '', icon: '' }] },
];

@Injectable()
export class AdminMenuSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(AdminMenuDetails)
    private menuRepo: Repository<AdminMenuDetails>,
    @InjectRepository(AdminGroupDetails)
    private groupRepo: Repository<AdminGroupDetails>,
    @InjectRepository(AdminGroupMenuPriv)
    private groupMenuRepo: Repository<AdminGroupMenuPriv>,
  ) {
    this.logger = new PaytradeLogger('ADMIN_MENU_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.cleanupOldDuplicates();
      await this.seedMenus();
      await this.grantPermissionsToAllGroups();
      this.logger.log('Admin menu seeding complete');
    } catch (error) {
      this.logger.error(`Admin menu seeding failed: ${error.message}`);
    }
  }

  private async cleanupOldDuplicates() {
    const manager = this.menuRepo.manager;
    const seededRoutes = new Map(MASTER_MENUS.map((m) => [m.route_path, m.id]));

    const allMenus = await this.menuRepo.find();
    const seededIds = MASTER_MENUS.map((m) => m.id);

    const oldDuplicateIds: string[] = [];
    for (const menu of allMenus) {
      if (seededIds.includes(menu.id)) continue;
      if (seededRoutes.has(menu.route_path)) {
        oldDuplicateIds.push(menu.id);
      }
    }

    if (oldDuplicateIds.length === 0) return;

    for (const oldId of oldDuplicateIds) {
      await manager.query(
        `DELETE FROM admin_group_menu_priv WHERE menu_id = $1`,
        [oldId],
      );
    }

    const placeholders = oldDuplicateIds.map((_, i) => `$${i + 1}`).join(', ');
    await manager.query(
      `DELETE FROM admin_menu_details WHERE id IN (${placeholders})`,
      oldDuplicateIds,
    );

    this.logger.log(
      `Cleaned up ${oldDuplicateIds.length} old duplicate menu(s) and their permissions`,
    );
  }

  private buildSubMenusSQL(subMenus: SubMenu[]): string {
    const elements = subMenus.map(
      (sm) => `'${JSON.stringify(sm).replace(/'/g, "''")}'::json`,
    );
    return `ARRAY[${elements.join(', ')}]`;
  }

  private async seedMenus() {
    let created = 0;
    let updated = 0;
    const manager = this.menuRepo.manager;

    for (const menu of MASTER_MENUS) {
      const existing = await this.menuRepo.findOne({ where: { id: menu.id } });

      if (existing) {
        const subMenusChanged =
          JSON.stringify(existing.sub_menus) !== JSON.stringify(menu.sub_menus);
        if (
          existing.menu_name !== menu.menu_name ||
          existing.route_path !== menu.route_path ||
          existing.menu_order !== menu.menu_order ||
          existing.menu_icon !== menu.menu_icon ||
          subMenusChanged
        ) {
          const subMenusSQL = this.buildSubMenusSQL(menu.sub_menus);
          await manager.query(
            `UPDATE admin_menu_details
             SET menu_name = $1, route_path = $2, menu_order = $3,
                 menu_icon = $4, sub_menus = ${subMenusSQL}
             WHERE id = $5`,
            [menu.menu_name, menu.route_path, menu.menu_order, menu.menu_icon, menu.id],
          );
          updated++;
        }
      } else {
        const subMenusSQL = this.buildSubMenusSQL(menu.sub_menus);
        await manager.query(
          `INSERT INTO admin_menu_details (id, menu_name, route_path, menu_order, menu_icon, menu_status, menu_type, sub_menus)
           VALUES ($1, $2, $3, $4, $5, 'Active', 'Admin', ${subMenusSQL})`,
          [menu.id, menu.menu_name, menu.route_path, menu.menu_order, menu.menu_icon],
        );
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      this.logger.log(`Menus seeded: ${created} created, ${updated} updated`);
    }
  }

  private async grantPermissionsToAllGroups() {
    const activeGroups = await this.groupRepo.find({
      where: { group_status: 'Active' as any },
    });

    const seededMenuIds = MASTER_MENUS.map((m) => m.id);

    for (const group of activeGroups) {
      for (const menuId of seededMenuIds) {
        const existing = await this.groupMenuRepo.findOne({
          where: { group_id: group.id, menu_id: menuId },
        });

        if (!existing) {
          const priv = this.groupMenuRepo.create({
            group_id: group.id,
            menu_id: menuId,
            all_permission: true,
            list_permission: true,
            insert_permission: true,
            update_permission: true,
            delete_permission: true,
            export_permission: true,
            print_permission: true,
            view_permission: true,
          });
          await this.groupMenuRepo.save(priv);
          this.logger.log(
            `Granted menu "${MASTER_MENUS.find((m) => m.id === menuId)?.menu_name}" to group "${group.group_name}"`,
          );
        }
      }
    }
  }
}
