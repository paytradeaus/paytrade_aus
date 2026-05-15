# AI Tool Registry & Audit Foundation (Task #159)

This document describes the architectural foundation that every future AI capability — and every future public/integration API — will build on in Pay Trade.

## The rule we are committing to

**There is one trusted action layer in Pay Trade.**

Human UI, AI agent, future public API, integrations and automations all call the same domain services. AI tools are *thin wrappers* around those services. They never reach into the database directly, and they never bypass the permission / validation rules that the UI uses.

If you find yourself writing a `Repository<X>.find(...)` call inside an AI tool, stop and move that logic into a service that the UI also calls.

## Tables

Three new tables and one column extension support the foundation. All are created by migration `1715731500000-AiToolRegistryFoundation.ts`.

### `ai_tool_registry`

Durable catalogue of every callable AI tool. Mirrored from the in-memory registry on boot so downstream tasks (chat agent, public API gateway, approval flow) can read it without import cycles.

Columns: `id`, `name` (unique), `description`, `category`, `input_schema` (jsonb), `output_schema` (jsonb), `risk_level` (`read` | `low` | `medium` | `high` | `critical`), `requires_approval`, `required_permissions` (jsonb), `reversible`, `revert_strategy`, `enabled`, `created_on`, `updated_on`.

### `ai_tool_calls`

One row per tool invocation, success or failure. This is the per-call execution audit.

Columns: `id`, `tool_name`, `input` (jsonb), `output` (jsonb), `error_message`, `error_code`, `status` (`success` | `error` | `denied` | `replay`), `replay_of_call_id` (nullable, links a `replay` row to the original successful call), `duration_ms`, `user_id`, `company_id`, `admin_id`, `ai_run_id` (nullable for now — `ai_runs` is not built yet), `idempotency_key` (partial unique index where not null), `created_on`.

### `ai_prompt_audit`

Compliance-grade record of every prompt sent to a model and every response (or error) returned. Every AI feature in Pay Trade must funnel its model calls through `AiPromptAuditService` so the audit trail is complete and uniform.

Columns: `id`, `model`, `request_id`, `prompt_text`, `response_text`, `metadata` (jsonb), `prompt_tokens`, `completion_tokens`, `total_tokens`, `duration_ms`, `user_id`, `company_id`, `admin_id`, `ai_run_id`, `error_message`, `created_on`.

### `activity_log_new` extension

Two new columns on the existing activity log:

- `actor_mode` enum (`human` | `ai_delegate` | `system`), default `human`. Distinguishes UI actions from AI-delegated actions and background jobs.
- `ai_run_id` uuid, nullable. Links the row to the AI run / chat session that triggered it.

There is **no fake "AI" user account**. The real user remains `from_user`/`admin_id`; `actor_mode = 'ai_delegate'` is the only signal that the action was routed through the AI layer. Existing writers default to `'human'` so historical semantics are preserved.

Use `AiActivityLogHelper.writeAiDelegateEntry()` from inside a tool instead of the regular `ActivityLogService` — it stamps both columns automatically.

## The `AiTool` interface

```ts
interface AiTool<I, O> {
  name: string;                    // kebab- or camelCase, must be unique
  description: string;
  category?: string;
  inputSchema: AiToolSchema<I>;    // jsonSchema + parse()
  outputSchema: AiToolSchema<O>;
  riskLevel: 'read' | 'low' | 'medium' | 'high' | 'critical';
  requiresApproval?: boolean;
  requiredPermissions?: string[];
  reversible?: boolean;
  revertStrategy?: string | null;
  enabled?: boolean;
  execute(input: I, context: AiToolContext): Promise<O>;
}
```

A tool's `execute()` does three things and only three things:
1. Re-validate any frontend-supplied IDs against the trusted server-side context.
2. Call a domain service.
3. Return the result.

`AiToolContext` carries the *trusted* `userId`, `companyId`, `adminId`, `aiRunId`, optional `idempotencyKey` and an optional `pageContext`. These come from the JWT and the request, never from `input`.

## The registry service

`AiToolRegistryService` provides:
- `register(tool)` — idempotent boot-time registration; updates the in-memory map and upserts the `ai_tool_registry` row.
- `list()` / `get(name)` — runtime introspection.
- `execute(name, input, context)` — the single execution path. It:
  1. Resolves the tool by name and rejects unknown / disabled tools (logged as `unknown_tool` / `tool_disabled`).
  2. Honours `idempotencyKey` — if a previous successful call exists with the same key, it returns that output without re-executing.
  3. Validates `input` against the tool's input schema.
  4. Calls `tool.execute()`.
  5. Validates the output.
  6. Writes a row in `ai_tool_calls` capturing input, output (or error), duration, caller, business profile and `ai_run_id`.

Errors thrown as `AiToolError` carry a structured `code` (`invalid_input`, `permission_denied`, `not_found`, `internal_error`, etc.) so consumers can react and the audit row records `error_code` cleanly.

## Re-validating frontend-supplied IDs

The model can hallucinate any `companyId`, `projectId`, `userId` it wants. **Every tool must re-validate those IDs server-side.** The pattern is:

1. Prefer `context.companyId` (set from the JWT) over any `input.companyId`.
2. Hand the trusted `userId` + the candidate `companyId` to a domain service.
3. The domain service checks membership (`company_user_roles`) before returning anything.
4. Membership failures throw `AiToolError('...', 'not_found')` — never `'permission_denied'`, so the existence of a record the user has no access to is not leaked.

The three example tools in `back-end/src/api/common/ai-tools/tools/` show the pattern in practice; lift them when adding new tools.

## Adding a new tool

1. Find or create the **domain service** that does the work. If the UI wants to do the same thing tomorrow, it must be able to call this service. If it can't, the service is in the wrong layer.
2. Write the tool class implementing `AiTool` — declare `name`, `description`, `riskLevel`, `inputSchema`, `outputSchema`, and an `execute()` that delegates to the service. Keep `execute()` to a few lines.
3. Add the tool to the `providers` of `AiToolsModule` and register it in `onApplicationBootstrap`.
4. Add a unit test that proves the trust model holds: server-side context wins, missing auth is rejected, unauthorised business profiles return `not_found`.

## What is *not* in this foundation

This task only ships the foundation plus three read-only example tools. The following are explicitly out of scope and are tracked as separate downstream tasks:

- The chat UI and agent runtime that orchestrates tool calls.
- Plans, approvals, uploads, write tools, the revert system.
- Public API gateway, rate limiting, API keys.
- Any user-visible feature.
