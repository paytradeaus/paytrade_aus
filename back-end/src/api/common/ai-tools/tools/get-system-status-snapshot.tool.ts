import { Injectable } from '@nestjs/common';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import {
  SystemStatusService,
  SystemStatusSnapshot,
} from '../services/system-status.service';

interface SnapshotInput {
  companyId?: number;
}

/** Read-only example tool. Wraps SystemStatusService; server-side companyId wins. */
@Injectable()
export class GetSystemStatusSnapshotTool
  implements AiTool<SnapshotInput, SystemStatusSnapshot>
{
  name = 'getSystemStatusSnapshot';
  description =
    'Returns a snapshot of the current state of the calling user and their active business profile.';
  category = 'observability';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<SnapshotInput>({
    companyId: {
      type: 'integer',
      optional: true,
      description:
        'Optional business profile id. Server-side context wins when present.',
    },
  });
  outputSchema = objectSchema<SystemStatusSnapshot>({
    generatedAt: { type: 'string' },
    scope: { type: 'object' },
    company: { type: 'object', optional: true },
    membership: { type: 'object' },
  });

  constructor(private readonly statusService: SystemStatusService) {}

  async execute(
    input: SnapshotInput,
    context: AiToolContext,
  ): Promise<SystemStatusSnapshot> {
    if (context.userId == null) {
      throw new AiToolError(
        'getSystemStatusSnapshot requires an authenticated user',
        'permission_denied',
      );
    }
    // Server-side context always wins. The model-supplied id is a
    // fallback / hint only — the wrapped domain service still
    // re-validates membership.
    const companyId = context.companyId ?? input.companyId ?? null;
    return this.statusService.getSnapshotForUser(context.userId, companyId);
  }
}
