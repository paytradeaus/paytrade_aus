import { Injectable } from '@nestjs/common';

export interface PageContext {
  path: string | null;
  entity: string | null;
  /** Always a string at the service boundary; numeric IDs are coerced. */
  entityId: string | null;
  resolvedAt: string;
}

/** Normalises the frontend-supplied page-context hint. No DB work. */
@Injectable()
export class PageContextService {
  resolve(pageContext?: {
    path?: string;
    entity?: string;
    entityId?: string | number;
  }): PageContext {
    const path = pageContext?.path?.trim() || null;
    const entity = pageContext?.entity?.trim() || null;
    const raw = pageContext?.entityId;
    const entityId = raw === undefined || raw === null ? null : String(raw);
    return {
      path,
      entity,
      entityId,
      resolvedAt: new Date().toISOString(),
    };
  }
}
