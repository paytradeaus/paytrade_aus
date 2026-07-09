import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";

const config: MoneyPageConfig = {
  path: "audit-ready-project-trust-account-software",
  keyword: "audit-ready project trust account software",
  title: "Audit-Ready Project Trust Account Software | PayTrade",
  description:
    "PayTrade is audit-ready project trust account software: every Queensland trust record — claim, ledger, notice, reconciliation and change history — is kept as evidence an auditor can follow.",
  h1: "Audit-Ready Project Trust Account Software",
  breadcrumbName: "Audit-Ready Trust Account Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is audit-ready project trust account software for Queensland construction businesses: audit-first, Xero-connected, and built so the trustee can prove what happened.",
    "The real risk in a project trust account is not usually a missing payment. It is poor evidence — records that cannot show an auditor who the money belonged to, what claim it supported and how the account reconciled.",
  ],
  sections: [
    {
      heading: "What audit-ready project trust account software should show",
      list: [
        "Which project and contract each trust movement belongs to",
        "Which beneficiary the money was held for",
        "The payment claim behind each ledger entry",
        "The bank transaction that moved the money",
        "The notices issued and when",
        "How the account reconciled at each month end",
        "Who changed what, and when",
      ],
    },
    {
      heading: "Project, contract and beneficiary trail",
      paragraphs: [
        "Every trust record in PayTrade starts from a project and contract, with beneficiaries linked to their contracts. An auditor can pick any beneficiary and see their claims, payments, retentions and notices in one trail.",
      ],
      placeholders: [
        {
          label: "Beneficiary statement",
          description: "Sample beneficiary statement showing claims, payments and retention held.",
        },
      ],
    },
    {
      heading: "Payment claim to ledger trail",
      paragraphs: [
        "Each payment claim flows to approval, payment and ledger entry without re-keying, so the ledger always explains itself back to a source claim.",
      ],
      placeholders: [
        {
          label: "Trust ledger",
          description: "Sample trust ledger showing claim-linked entries per beneficiary.",
        },
      ],
    },
    {
      heading: "Bank account and reconciliation trail",
      paragraphs: [
        "Trust bank transactions match against ledger records with smart matching, and each reconciliation is stored with its evidence.",
      ],
      placeholders: [
        {
          label: "Reconciliation statement",
          description: "Sample reconciliation statement with matched bank transactions.",
        },
      ],
    },
    {
      heading: "Notices and document evidence",
      paragraphs: [
        "Trust account notices are generated and stored against the record they relate to, so document evidence sits next to the ledger entry it supports.",
      ],
      placeholders: [
        {
          label: "Notice record",
          description: "Sample trust account notice stored against its trust record.",
        },
      ],
    },
    {
      heading: "Change history and record integrity",
      paragraphs: [
        "PayTrade keeps activity history on trust records, so reviewers can see who changed what and when — a key part of record integrity.",
      ],
      placeholders: [
        {
          label: "Change history",
          description: "Sample activity history for a trust record.",
        },
      ],
    },
    {
      heading: "Audit pack and export",
      paragraphs: [
        "PayTrade can produce an audit pack that bundles the evidence trail — ledgers, claims, notices, reconciliations and linked Xero documents — into a reviewable export.",
      ],
      placeholders: [
        {
          label: "Sample audit pack",
          description: "Sample audit pack export with summary and supporting documents.",
        },
      ],
    },
    {
      heading: "Why PayTrade is audit-first",
      paragraphs: [
        "Audit-readiness is not a report PayTrade generates at the end. It is how records are structured from the first claim: every entry keeps its links to project, contract, beneficiary, bank account and evidence, so the audit trail exists by design.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is audit-ready project trust account software?",
      answer:
        "Audit-ready project trust account software keeps Queensland trust records in a form an auditor can follow: every ledger entry linked to its project, contract, beneficiary, claim, bank transaction, notices and reconciliation evidence.",
    },
    {
      question: "What does a project trust account audit look at?",
      answer:
        "Auditors typically review whether trust money is traceable to beneficiaries, whether ledgers reconcile with the bank account, whether notices were issued, and whether records are complete and reliable.",
    },
    {
      question: "Can my auditor access PayTrade records?",
      answer:
        "Yes. PayTrade is designed for builders, bookkeepers, accountants and auditors, and can produce audit packs that bundle the evidence trail for review.",
    },
    {
      question: "Does audit-ready software guarantee a clean audit?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("audit-ready-project-trust-account-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
