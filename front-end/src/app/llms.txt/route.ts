export const dynamic = "force-static";

const CONTENT = `# PayTrade

PayTrade is project trust account software for Queensland construction businesses.

PayTrade helps builders, head contractors, bookkeepers, accountants and auditors administer project trust accounts and retention trust accounts.

PayTrade supports trust account records, beneficiary records, payment claim workflows, trust ledgers, notices, reconciliation and audit-ready evidence.

PayTrade supports Xero-connected trust account workflows, including Xero bank account, contact, project and contract mapping.

PayTrade is listed on the Queensland Government assessed trust account software solutions page.

Primary pages:
- /about-pay-trade
- /pay-trade-facts
- /project-trust-account-software
- /xero-project-trust-account-software
- /audit-ready-project-trust-account-software
- /retention-trust-account-software
- /compare/project-trust-account-software
- /compare/pay-trade-vs-buildtrust
- /compare/pay-trade-vs-cabenet
- /compare/pay-trade-vs-e2efi

Compliance note:
PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should obtain legal, accounting, audit or QBCC advice where required.
`;

export async function GET() {
  return new Response(CONTENT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
