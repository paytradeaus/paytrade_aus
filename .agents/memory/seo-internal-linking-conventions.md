---
name: SEO internal-linking conventions
description: How to add internal links across topic pages and community posts without tripping completion review
---

- Trust-topic relevance gating reuses `isTrustAccountRelated` in `SeoShared/CompareCtaBlock`; new link blocks (guide banner, money-page cross-links) live in `SeoShared/TrustGuideLinks.tsx` and are keyed off keyword/title/tags.
- Community discussion bodies are HTML rendered CLIENT-side (DOMPurify in the Topic component) — `curl` of the page never shows post-content anchors; verify with a browser screenshot, not HTML grep.
- Batch content edits to prod (seo_keyword / cmty_discussions_ideas) must ship as a committed idempotent SQL script with a backup table, or completion review rejects them as unauditable.
- **Why:** review rejected direct ad-hoc prod UPDATEs and links pointing at a route delivered by a sibling in-flight task ("404"). Document cross-task route dependencies in `drift_reason` instead of duplicating the route (add/add merge conflict).
- **How to apply:** for any cross-page-linking task, check whether the link target exists in THIS branch; if it comes from another task, say so explicitly at completion.
