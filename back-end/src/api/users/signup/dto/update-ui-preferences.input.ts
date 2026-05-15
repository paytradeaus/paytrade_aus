import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@InputType({
  description:
    'UI shell preferences for the AI panel & collapsible left navigation. Stored verbatim under user_details.ui_preferences. Future shell controls can extend the JSON without a schema change.',
})
export class UpdateUiPreferencesInput {
  @Field({
    nullable: true,
    description:
      'Whether the left navigation should render in collapsed (icons-only) mode.',
  })
  navCollapsed?: boolean;

  @Field({
    nullable: true,
    description:
      'AI messenger column state: "open" (full panel), "rail" (thin collapsed rail), or "hidden".',
  })
  aiPanelState?: string;

  @Field({
    nullable: true,
    description: 'Width in pixels of the AI messenger column when state="open".',
  })
  aiPanelWidth?: number;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      'Free-form bag for additional UI preferences. Merged on top of existing values.',
  })
  extra?: Record<string, any>;
}
