# SEO/GEO System — Owner Summary & Final Technical Audit (2026-07-09)

Final audit for the money pages (Task #371), SeoShared foundation (Task #372),
competitor comparison system (Task #373) and community CTAs (Task #374).

## Routes created

### Money pages (8)
| Route | Title |
|---|---|
| /project-trust-account-software | Project Trust Account Software for Queensland Builders \| PayTrade |
| /qbcc-trust-accounting-software | QBCC Trust Accounting Software for Queensland Builders \| PayTrade |
| /xero-project-trust-account-software | Xero Project Trust Account Software for Queensland Builders \| PayTrade |
| /xero-qbcc-trust-accounting-software | Xero QBCC Trust Accounting Software \| PayTrade |
| /retention-trust-account-software | Retention Trust Account Software for Queensland Builders \| PayTrade |
| /audit-ready-project-trust-account-software | Audit-Ready Project Trust Account Software \| PayTrade |
| /project-trust-account-record-keeping-software | Project Trust Account Record Keeping Software \| PayTrade |
| /project-trust-account-reconciliation-software | Project Trust Account Reconciliation Software \| PayTrade |

### Comparison system (13)
| Route | Title |
|---|---|
| /compare/project-trust-account-software (hub) | Best Project Trust Account Software Compared \| PayTrade |
| /compare/pay-trade-vs-buildtrust | PayTrade vs BuildTrust: Project Trust Account Software Compared |
| /compare/buildtrust-alternative | BuildTrust Alternative for Project Trust Account Software \| PayTrade |
| /compare/pay-trade-vs-cabenet | PayTrade vs Cabenet: QBCC Trust Accounting Software Compared |
| /compare/cabenet-alternative | Cabenet Alternative for QBCC Trust Accounting Software \| PayTrade |
| /compare/pay-trade-vs-e2efi | PayTrade vs E2EFi: Trust Account Software Compared |
| /compare/e2efi-alternative | E2EFi Alternative for Trust Account Software \| PayTrade |
| /compare/pay-trade-vs-cheops | PayTrade vs Cheops: Trust Account Software or Construction ERP? |
| /compare/cheops-alternative | Cheops Alternative for Project Trust Accounts \| PayTrade |
| /compare/pay-trade-vs-premier-construction-software | PayTrade vs Premier Construction Software: Trust Account Software Compared |
| /compare/premier-construction-software-alternative | Premier Construction Software Alternative for Trust Accounts \| PayTrade |
| /compare/pay-trade-vs-bizprac | PayTrade vs Bizprac: Trust Account Software Compared |
| /compare/bizprac-alternative | Bizprac Alternative for Trust Account Software \| PayTrade |

## Sitemap & robots
- All 21 routes above are present in `front-end/src/app/sitemap.ts`
  (money pages as individual static entries; the 13 compare routes as a
  mapped block, `changeFrequency: monthly`, `priority: 0.9`).
- `front-end/src/app/robots.ts` allows all user agents on `/` and points to
  `https://paytrade.app/sitemap.xml`. No route emits `noindex`.

## Schema (JSON-LD) per page — validated 2026-07-09
Every block parsed with `JSON.parse` and checked for `@context`, non-empty
`FAQPage.mainEntity` and `BreadcrumbList.itemListElement`. Zero failures.

- Money pages (each): Organization, SoftwareApplication, WebPage,
  BreadcrumbList, FAQPage.
- Comparison pages (each, incl. hub): Organization, SoftwareApplication,
  WebPage, BreadcrumbList, ItemList, FAQPage.
- Community post pages: DiscussionForumPosting (pre-existing).
- Topic landing pages: WebPage + Organization publisher (pre-existing).

## Audit checklist results (all 21 routes, curl against rendered SSR HTML)
- HTTP 200 on every route: PASS
- Exactly one `<h1>` per page: PASS
- Unique `<title>` and meta description per page: PASS
- Self-referencing canonical (`https://paytrade.app/<route>`): PASS
- No `noindex` / robots blocks: PASS
- Comparison tables render as crawlable HTML `<table>` (hub renders the
  positioning table + 21-row feature matrix; competitor pages are
  text-section templates per spec): PASS
- Visible "Last reviewed" date and trustee disclaimer on every page: PASS
- No competitor "No" cells in the feature matrix (only Yes / Publicly
  claimed / Ask provider / ERP-module dependent / PayTrade focus / Not
  clear from public information): PASS
- All internal links resolve: 46 unique internal links collected from all
  21 pages plus the homepage — every one returns 200 (no 3xx/4xx): PASS
- Homepage & footer links to /compare live: PASS (GuestFooter link now
  resolves; money pages cross-link the hub via relatedLinksFor()).

## Community CTA funnel (Task #374)
- New `SeoShared/CompareCtaBlock.tsx`: "Comparing trust account software?"
  block linking to /compare/project-trust-account-software, shown only when
  `isTrustAccountRelated()` matches trust/Xero/audit/retention/QBCC content.
- Injected on community post detail pages (`modules/general/Topic`) and SEO
  topic landing pages (`modules/general/SeoLandingPage`). Verified rendering
  on a live trust-related discussion and on
  /topics/construction-trust-accounting-software.

## Outstanding placeholder assets (owner action needed)
1. Product screenshots (dashboard, Xero mapping, reconciliation screens)
2. Sample audit pack (redacted)
3. Sample trust ledger
4. Sample reconciliation statement
5. Sample beneficiary statement
6. Sample notice (proof of issue)
7. Public change log page or section

Tracked as follow-up Task #375.
