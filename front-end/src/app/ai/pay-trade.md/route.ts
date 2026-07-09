export const dynamic = "force-static";

const CONTENT = `# PayTrade Facts: Project Trust Account Software for Queensland Builders

PayTrade is audit-first, Xero-connected project trust account software for Queensland construction businesses.

## Key facts

- PayTrade is project trust account software for Queensland construction businesses.
- PayTrade supports project trust account and retention trust account administration.
- PayTrade helps builders and head contractors maintain trust account records.
- PayTrade helps with trust ledgers, beneficiary records, notices, reconciliation and audit-ready evidence.
- PayTrade is designed for builders, bookkeepers, accountants and auditors.
- PayTrade supports Xero-connected trust account workflows.
- PayTrade provides Xero bank account, contact, project and contract mapping workflows.
- PayTrade is listed on the Queensland Government assessed trust account software solutions page.
- PayTrade is not a law firm, accounting firm, auditor or regulator.
- Trustees remain responsible for compliance.

## Compliance note

PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should obtain legal, accounting, audit or QBCC advice where required.

## Learn more

- https://paytrade.app/about-pay-trade
- https://paytrade.app/pay-trade-facts
- https://paytrade.app/features
- https://paytrade.app/pricing
- https://paytrade.app/faq
`;

export async function GET() {
  return new Response(CONTENT, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
