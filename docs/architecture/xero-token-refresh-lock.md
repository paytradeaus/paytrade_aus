# Xero Token Refresh Lock

Redis-based per-company mutex (`xero-token-lock:{company_id}`) in `XeroService.refreshTokenSet()` prevents concurrent OAuth2 token refreshes from invalidating each other. Uses `SET NX EX` for acquire, Lua compare-and-delete for safe release, with 15s TTL and 10s wait. Waiters re-read the DB for freshly refreshed tokens.
