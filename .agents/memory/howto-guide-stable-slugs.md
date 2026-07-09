---
name: How-to guide links must use urlSlug, not UUID
description: Linking to /how-to-guides detail pages from coded pages — dev and prod ids differ, urlSlug is stable.
---

Guide detail routes are `/how-to-guides/{category-slug}/{title-slug}/{slugOrId}` and the last segment resolves via `getBlogResourceByIdSlug`, which accepts either the row UUID or the `urlSlug` column.

**Why:** Seeded guides have DIFFERENT UUIDs in dev vs Railway prod, but the seeder-assigned `urlSlug` values are identical in both. Hardcoding UUIDs in coded pages produces links that 404 in prod.

**How to apply:** When any coded page (SEO pages, footers, widgets) deep-links a blog/resource/how-to guide, use the `urlSlug` as the final segment and verify it exists in BOTH dev and prod (`psql "$RAILWAY_DATABASE_URL"`).
