import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";
import { GOV_LISTING_STATEMENT } from "@/components/SeoShared/schema";

const config: MoneyPageConfig = {
  path: "qbcc-trust-accounting-software",
  keyword: "QBCC trust accounting software",
  title: "QBCC Trust Accounting Software for Queensland Builders | PayTrade",
  description:
    "PayTrade is QBCC trust accounting software that helps Queensland builders administer project trust and retention trust accounts with audit-ready ledgers, notices, reconciliation and Xero-connected workflows.",
  h1: "QBCC Trust Accounting Software",
  breadcrumbName: "QBCC Trust Accounting Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is QBCC trust accounting software for Queensland construction businesses: audit-first, Xero-connected, and built around the record-keeping obligations of the QBCC project trust framework.",
    "The QBCC trust account framework requires trustees to keep records that show who trust money belongs to, which project and contract it relates to, and how every movement is evidenced. Generic accounting software was not designed for this.",
  ],
  sections: [
    {
      heading: "Why QBCC trust accounting software is different",
      paragraphs: [
        "Standard bookkeeping tracks money in and money out. QBCC trust accounting also has to track who the money is held for, what claim it supports, what notices were issued and how the account reconciles — all in a form an auditor or the QBCC can review.",
      ],
      list: [
        "Trust ledgers per project and beneficiary",
        "Retention trust account cash tracking",
        "Trust account notices and records",
        "Month-end reconciliation with evidence",
        "Audit-ready record packs",
      ],
    },
    {
      heading: "Queensland Government listing",
      paragraphs: [
        GOV_LISTING_STATEMENT,
        "PayTrade is not a law firm, accounting firm, auditor or regulator, and never claims to be QBCC certified or government approved.",
      ],
    },
    {
      heading: "Works with your existing Xero file",
      paragraphs: [
        "PayTrade connects QBCC trust accounting to Xero: bank accounts, contacts, projects and contracts are mapped so trust records and accounting records stay aligned.",
      ],
      links: [
        {
          href: "/xero-qbcc-trust-accounting-software",
          label: "Learn more about Xero QBCC trust accounting software",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "What is QBCC trust accounting software?",
      answer:
        "QBCC trust accounting software helps Queensland trustees administer project trust and retention trust accounts under the QBCC framework, keeping ledgers, beneficiary records, notices, reconciliations and audit evidence.",
    },
    {
      question: "Is PayTrade QBCC certified or government approved?",
      answer:
        "No software is QBCC certified. PayTrade is listed on the Queensland Government assessed trust account software solutions page, and trustees remain responsible for their own compliance.",
    },
    {
      question: "Can my bookkeeper or accountant use PayTrade?",
      answer:
        "Yes. PayTrade is designed for builders, bookkeepers, accountants and auditors, so the whole team works from the same trust records.",
    },
    {
      question: "Why not manage QBCC trust accounts in spreadsheets?",
      answer:
        "Spreadsheets become difficult to audit, reconcile and control. QBCC trust accounting benefits from structured records linking projects, contracts, beneficiaries, claims, trust bank accounts, ledgers, notices and reconciliations.",
    },
  ],
  relatedLinks: relatedLinksFor("qbcc-trust-accounting-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
