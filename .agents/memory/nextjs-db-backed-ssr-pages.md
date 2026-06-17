---
name: Next.js App Router DB-backed public/SEO pages
description: Two recurring traps when a public Next.js App Router page renders admin-editable DB content (e.g. /topics/[slug]) — stale route cache and SSR sanitization.
---

# DB-backed public SSR pages (Next.js App Router)

Public pages whose content is edited in the admin (SEO landing pages, topic
pages, etc.) hit two non-obvious traps.

## 1. Stale content: route is statically cached
A page that fetches DB content but uses NO dynamic API (no `cookies()`,
`headers()`, read `searchParams`) and sets no `dynamic`/`revalidate` is treated
as **static**: Next renders it once and serves cached HTML from `.next`. Admin
edits then never appear, and the cache **persists across dev-server restarts**
(it lives on disk in `.next`). A `?cachebust=` query param does NOT bust it
because the page doesn't read searchParams.

**Why:** the whole point of the admin "generate/edit copy" tooling is that
public pages reflect DB changes; static caching silently defeats it.

**How to apply:** add `export const dynamic = "force-dynamic"` to the page
segment for freshness-critical, admin-edited content. If you flipped a route
from static to dynamic, also clear the stale on-disk cache once
(`rm -rf front-end/.next/cache front-end/.next/server/app/<route>`) and restart
the frontend, or the old HTML keeps serving. Verify with a live DB marker:
inject a unique string into the column, curl the page, confirm it appears and
the old content is gone, then restore the DB.

## 2. SSR XSS: dompurify must be isomorphic
Plain `dompurify` is browser-only; on the server (SSR) it has no DOM and
returns the **raw, unsanitized HTML**, so `dangerouslySetInnerHTML` of
admin/DB HTML is an XSS hole in the server-rendered output.

**How to apply:** use `isomorphic-dompurify` (works server + client) for any
SSR-sanitized HTML. Its `sanitize(html, options)` overload returns
`TrustedHTML | string` when options is loosely typed — cast the result
`as unknown as string` to satisfy `dangerouslySetInnerHTML`.

## Package-install gotcha (this monorepo)
`installLanguagePackages(nodejs)` installs into a STRAY root
`package.json`/`node_modules`, NOT `front-end/`. Install frontend deps with
`cd front-end && npm install <pkg>` (remove any stray root
package.json/package-lock/node_modules first).
