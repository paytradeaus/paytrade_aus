import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";

const config: MoneyPageConfig = {
  path: "project-trust-account-record-keeping-software",
  keyword: "project trust account record keeping software",
  title: "Project Trust Account Record Keeping Software | PayTrade",
  description:
    "PayTrade is project trust account record keeping software for Queensland trustees: structured beneficiary records, trust ledgers, notices, documents and change history instead of fragile spreadsheets.",
  h1: "Project Trust Account Record Keeping Software",
  breadcrumbName: "Trust Account Record Keeping Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is project trust account record keeping software for Queensland construction businesses: audit-first, Xero-connected and built to replace fragile spreadsheets with structured trust records.",
    "Queensland's trust framework is, at its core, a record-keeping obligation. The trustee must be able to show whose money is in the account, what project and contract it relates to, what claims it supports, what notices were issued and how it reconciled.",
  ],
  sections: [
    {
      heading: "What project trust account record keeping software must hold",
      list: [
        "Beneficiary records linked to contracts and projects",
        "Trust ledgers explaining every account movement",
        "Payment claim records from submission to payment",
        "Retention records per contract and beneficiary",
        "Trust account notices and stored documents",
        "Reconciliation records with supporting evidence",
        "Change history showing who did what, when",
      ],
    },
    {
      heading: "Why spreadsheets fall short for record keeping",
      paragraphs: [
        "Spreadsheets can hold numbers, but they cannot hold relationships. Project trust account record keeping requires each record to stay linked — beneficiary to contract, claim to ledger entry, ledger to bank transaction — and to survive edits with an audit trail. PayTrade keeps those links by design.",
      ],
    },
    {
      heading: "Records that stay aligned with Xero",
      paragraphs: [
        "Because PayTrade maps bank accounts, contacts, projects and contracts to Xero, trust records and accounting records reflect the same events without double entry.",
      ],
      links: [
        {
          href: "/xero-project-trust-account-software",
          label: "See the Xero project trust account workflow",
        },
      ],
    },
    {
      heading: "From record keeping to audit evidence",
      paragraphs: [
        "Good record keeping is what makes an audit painless. Every record in PayTrade keeps its evidence attached, so producing an audit pack is an export, not a reconstruction.",
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
      question: "What is project trust account record keeping software?",
      answer:
        "Project trust account record keeping software keeps the records Queensland trustees must maintain — beneficiary records, trust ledgers, claims, notices, reconciliations and change history — structured, linked and reviewable.",
    },
    {
      question: "What records must a Queensland project trustee keep?",
      answer:
        "Trustees must keep records showing trust money movements, beneficiary entitlements, notices and reconciliations. Trustees should confirm the full requirements with the QBCC or their advisers.",
    },
    {
      question: "Can I keep trust records in a spreadsheet instead?",
      answer:
        "Spreadsheets become difficult to audit, reconcile and control as projects grow. Structured record keeping software keeps records linked and preserves change history.",
    },
    {
      question: "Does using record keeping software guarantee compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("project-trust-account-record-keeping-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
