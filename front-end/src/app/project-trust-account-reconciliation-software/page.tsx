import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";

const config: MoneyPageConfig = {
  path: "project-trust-account-reconciliation-software",
  keyword: "project trust account reconciliation software",
  title: "Project Trust Account Reconciliation Software | PayTrade",
  description:
    "PayTrade is project trust account reconciliation software: smart matching between trust bank transactions and ledger records, month-end evidence, and Xero-connected reconciliation for Queensland trustees.",
  h1: "Project Trust Account Reconciliation Software",
  breadcrumbName: "Trust Account Reconciliation Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is project trust account reconciliation software for Queensland construction businesses: audit-first, Xero-connected and built to make month-end reconciliation an evidence trail rather than a chore.",
    "A project trust account must reconcile — not just in total, but line by line, with each bank transaction explained by a trust record. That is what auditors and the QBCC expect the trustee to be able to show.",
  ],
  sections: [
    {
      heading: "How project trust account reconciliation software should work",
      list: [
        "Import or sync trust bank transactions",
        "Smart matching against claims, payments and retentions",
        "Exact and near matches with configurable tolerance",
        "Quick-adjust for minor differences, recorded transparently",
        "Month-end reconciliation stored with its evidence",
      ],
    },
    {
      heading: "Smart matching, not manual ticking",
      paragraphs: [
        "PayTrade's QuickBooks-style smart matching proposes matches between bank transactions and trust records, so reconciliation becomes review-and-confirm instead of hunt-and-tick. Every match is recorded, and every unmatched line is visible until resolved.",
      ],
    },
    {
      heading: "Reconciliation that stays aligned with Xero",
      paragraphs: [
        "Because trust bank accounts map to Xero bank accounts, the reconciliation in PayTrade and the accounting records in Xero describe the same transactions — no parallel spreadsheets.",
      ],
      links: [
        {
          href: "/xero-project-trust-account-software",
          label: "See the Xero project trust account workflow",
        },
      ],
    },
    {
      heading: "Reconciliation as audit evidence",
      paragraphs: [
        "Each completed reconciliation is kept with its matched transactions and adjustments, ready for the audit pack. When the auditor asks how the account reconciled in March, the answer is an export, not an archaeology project.",
      ],
      links: [
        {
          href: "/audit-ready-project-trust-account-software",
          label: "Learn about audit-ready trust account software",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "What is project trust account reconciliation software?",
      answer:
        "Project trust account reconciliation software matches trust bank transactions against ledger records — claims, payments and retentions — and stores each reconciliation with its evidence for review by auditors and the QBCC.",
    },
    {
      question: "How often must a project trust account be reconciled?",
      answer:
        "Queensland's framework requires regular reconciliation of trust accounts, typically monthly. Trustees should confirm their exact obligations with the QBCC or their advisers.",
    },
    {
      question: "Can PayTrade match bank transactions automatically?",
      answer:
        "Yes. PayTrade proposes exact and near matches between bank transactions and trust records, with configurable tolerance and transparent quick-adjustments.",
    },
    {
      question: "Does reconciliation software guarantee compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("project-trust-account-reconciliation-software"),
};

export const dynamic = "force-dynamic";

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
