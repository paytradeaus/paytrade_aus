import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";
import { GOV_LISTING_STATEMENT } from "@/components/SeoShared/schema";

const config: MoneyPageConfig = {
  path: "project-trust-account-software",
  keyword: "project trust account software",
  title: "Project Trust Account Software for Queensland Builders | PayTrade",
  description:
    "PayTrade is audit-first, Xero-connected project trust account software helping Queensland builders and head contractors manage trust ledgers, beneficiary records, claims, notices, reconciliation and audit-ready evidence.",
  h1: "Project Trust Account Software",
  breadcrumbName: "Project Trust Account Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is audit-first, Xero-connected project trust account software for Queensland construction businesses.",
    "A project trust account is not just another bank account. Queensland's project trust framework creates serious record-keeping obligations for trustees. Project trust account software must help the trustee keep reliable records of who the money belongs to, what project it relates to, which claims and payments it supports, what notices have been issued, and how reconciliations are evidenced.",
  ],
  sections: [
    {
      heading: "What project trust account software should do",
      paragraphs: [
        "For project trust accounts, the question is not only whether payments were made. The question is whether the trustee can prove what happened. PayTrade links every trust record so a claim can be traced from project and contract through payment claim, beneficiary, bank account, ledger, notice, reconciliation and audit evidence.",
      ],
      list: [
        "Project and retention trust account administration",
        "Trust ledgers and beneficiary records",
        "Payment claim workflows from claim to payment",
        "Trust account notices and document records",
        "Bank reconciliation with audit-ready evidence",
      ],
      placeholders: [
        {
          label: "PayTrade dashboard",
          description:
            "Payments, notices, compliance and trust account balances in one view.",
          src: "/images/seo-screenshots/dashboard.png",
        },
      ],
    },
    {
      heading: "Built for the whole team",
      paragraphs: [
        "PayTrade is designed for builders, head contractors, bookkeepers, accountants and auditors. Each role sees the trust records they need, and auditors can review a clear evidence trail rather than reconstructing spreadsheets.",
      ],
    },
    {
      heading: "Xero-connected trust workflows",
      paragraphs: [
        "PayTrade works alongside Xero rather than replacing it. Xero bank accounts, contacts, projects and contracts map to PayTrade trust records, keeping the accounting system and the trust administration layer aligned.",
      ],
      links: [
        {
          href: "/xero-project-trust-account-software",
          label: "Learn more about Xero project trust account software",
        },
      ],
    },
    {
      heading: "Queensland Government listing",
      paragraphs: [GOV_LISTING_STATEMENT],
    },
  ],
  faqs: [
    {
      question: "What is project trust account software?",
      answer:
        "Project trust account software helps Queensland trustees administer project trust accounts: keeping trust ledgers, beneficiary records, payment claim records, notices, reconciliations and audit evidence in a structured, reviewable form.",
    },
    {
      question: "Who needs project trust account software in Queensland?",
      answer:
        "Builders and head contractors operating under Queensland's project trust framework, plus the bookkeepers, accountants and auditors who support them, benefit from purpose-built project trust account software instead of spreadsheets.",
    },
    {
      question: "Does PayTrade replace Xero?",
      answer:
        "No. PayTrade is a trust-account administration layer that works alongside Xero rather than replacing the accounting system.",
    },
    {
      question: "Does using PayTrade guarantee compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("project-trust-account-software"),
};

export const dynamic = "force-dynamic";

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
