---
name: Prod DB access via RAILWAY_DATABASE_URL
description: How to inspect Railway production Postgres from this repl when debugging prod-only data issues.
---

The Replit `checkDatabase` tool only talks to the Replit-provisioned dev DB. To inspect the actual Railway production database, use the `RAILWAY_DATABASE_URL` secret directly:

```
psql "$RAILWAY_DATABASE_URL" -c "SELECT …"
```

**Why:** several "I can't reproduce, must be a deploy issue" debugging spirals have been caused by not realising prod data was queryable from here all along. Always check prod state first before guessing about caches, deploy timing, or upstream producer bugs.

**How to apply:** any time a bug report describes prod-only behaviour (stale value, wrong ID in a URL, missing row, "Railway only"), run `psql "$RAILWAY_DATABASE_URL"` against the relevant table BEFORE touching code. The schema and the live row will tell you whether you're looking at a code bug, a data bug, or both.

Read-only safe by default; treat any UPDATE/DELETE on this URL as a prod write — require explicit user confirmation first.
