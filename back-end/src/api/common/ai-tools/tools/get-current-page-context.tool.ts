import { Injectable } from '@nestjs/common';
import { AiTool, AiToolContext } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import {
  PageContext,
  PageContextService,
} from '../services/page-context.service';

interface PageContextInput {
  // Intentionally empty: page context comes from `AiToolContext`,
  // not from the model. Listed here so the registry persists a
  // self-documenting empty input schema.
}

/** Read-only example tool. Page context comes from AiToolContext, never from model input. */
@Injectable()
export class GetCurrentPageContextTool
  implements AiTool<PageContextInput, PageContext>
{
  name = 'getCurrentPageContext';
  description =
    'Returns the path/entity/entityId of the page the user is currently viewing.';
  category = 'observability';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<PageContextInput>({});
  outputSchema = objectSchema<PageContext>({
    path: { type: 'string', optional: true },
    entity: { type: 'string', optional: true },
    entityId: { type: 'string', optional: true },
    resolvedAt: { type: 'string' },
  });

  constructor(private readonly pageContextService: PageContextService) {}

  async execute(
    _input: PageContextInput,
    context: AiToolContext,
  ): Promise<PageContext> {
    return this.pageContextService.resolve(context.pageContext);
  }
}
