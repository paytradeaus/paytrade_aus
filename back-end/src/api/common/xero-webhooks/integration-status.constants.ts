/**
 * Centralised allow-list of `integration_details.integration_status` values
 * that should be treated as "live enough" to process inbound Xero webhook
 * events.
 *
 * Background: Task #42 introduced a re-OAuth flow that can leave a tenant
 * sitting on `Connected - pending settings/mapping` for an extended period
 * while the primary admin re-completes account/project/contract mapping in
 * the Xero Settings UI. During that window Xero is still actively pushing
 * webhook events for that tenant, and the data IS valid for ingestion —
 * the integration row already has a refreshed token set and the tenant is
 * still mapped 1:1 to a PT company. Dropping these events causes a silent
 * data-staleness bug where claims edited in Xero never appear in PT until
 * the 15-min fallback scheduler polls them.
 *
 * The previous strict gate (`status === 'Connected - active'`) only
 * accepted the steady-state value and silently dropped every event during
 * the pending-mapping window. This list now also accepts the pending state
 * so that webhook ingestion is uninterrupted across re-auth cycles.
 *
 * Inactive states (`Inactive`, `Disconnected`, etc.) are intentionally
 * still rejected — those tenants have no usable token set and downstream
 * Xero API calls would fail.
 */
export const WEBHOOK_PROCESSABLE_INTEGRATION_STATUSES: ReadonlyArray<string> =
  ['Connected - active', 'Connected - pending settings/mapping'];

export function isWebhookProcessableStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return WEBHOOK_PROCESSABLE_INTEGRATION_STATUSES.includes(status);
}
