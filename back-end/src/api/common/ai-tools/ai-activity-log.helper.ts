import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { Group } from 'src/entities/user-details.entity';

export interface AiActivityLogEntry {
  eventTemplateId: number;
  fromUser?: number | null;
  toUser?: number | null;
  companyId?: number | null;
  adminId?: number | null;
  isAdmin?: boolean;
  dynamicValues?: Record<string, any>;
  loggedInBy?: string | null;
  createdGroup?: Group;
  aiRunId?: string | null;
}

/** Writes an activity-log entry stamped with actor_mode='ai_delegate' (+ optional ai_run_id). */
@Injectable()
export class AiActivityLogHelper {
  constructor(
    @InjectRepository(ActivityLogNew)
    private readonly repo: Repository<ActivityLogNew>,
  ) {}

  async writeAiDelegateEntry(entry: AiActivityLogEntry): Promise<string> {
    const row = await this.repo.save(
      this.repo.create({
        event_template_id: entry.eventTemplateId,
        from_user: entry.fromUser ?? null,
        to_user: entry.toUser ?? null,
        company_id: entry.companyId ?? null,
        admin_id: entry.adminId ?? null,
        is_admin: entry.isAdmin ?? false,
        dynamic_values: entry.dynamicValues ?? {},
        logged_in_by: entry.loggedInBy ?? null,
        created_group: entry.createdGroup ?? 'USER',
        actor_mode: 'ai_delegate',
        ai_run_id: entry.aiRunId ?? null,
      } as Partial<ActivityLogNew>),
    );
    return row.id;
  }
}
