import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";

const config: MoneyPageConfig = {
  path: "retention-trust-account-software",
  keyword: "retention trust account software",
  title: "Retention Trust Account Software for Queensland Builders | PayTrade",
  description:
    "PayTrade is retention trust account software helping Queensland builders track cash retentions per contract and beneficiary, with retention ledgers, release workflows, Xero sync and audit-ready records.",
  h1: "Retention Trust Account Software",
  breadcrumbName: "Retention Trust Account Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is retention trust account software for Queensland construction businesses: audit-first, Xero-connected, and built to track every retained dollar to its contract and beneficiary.",
    "Cash retentions held in a retention trust account belong to subcontractors until they are properly released. The trustee must be able to show whose money is held, under which contract, and when and how it was released or returned.",
  ],
  sections: [
    {
      heading: "What retention trust account software must track",
      list: [
        "Retention amounts withheld per claim, contract and beneficiary",
        "Retention trust account balance against the retention ledger",
        "Retention release and return workflows",
        "Retention movements between trust accounts and general accounts",
        "Notices and records supporting each retention movement",
      ],
    },
    {
      heading: "Retentions from claim to release",
      paragraphs: [
        "When a payment claim includes retention, PayTrade records the withheld amount against the contract and beneficiary at the moment it is withheld. When retention is released, the payment traces back to the original claims, so the ledger always explains the balance in the retention trust account.",
      ],
    },
    {
      heading: "Xero-connected retention accounting",
      paragraphs: [
        "PayTrade syncs retention movements with Xero, including retention journals, so the accounting file reflects the retention position without manual re-keying.",
      ],
      links: [
        {
          href: "/xero-project-trust-account-software",
          label: "See how PayTrade connects trust accounts to Xero",
        },
      ],
    },
    {
      heading: "Audit-ready retention records",
      paragraphs: [
        "Every retention movement carries its evidence: the claim it came from, the contract it belongs to, the beneficiary it is held for and the bank transaction that moved it. Auditors can trace the retention trust account without reconstructing spreadsheets.",
      ],
      links: [
        {
          href: "/audit-ready-project-trust-account-software",
          label: "Learn about audit-ready project trust account software",
        },
      ],
    },
  ],
  faqs: [
    {
      question: "What is retention trust account software?",
      answer:
        "Retention trust account software helps Queensland trustees administer retention trust accounts: tracking cash retentions per contract and beneficiary, managing releases, and keeping ledgers, notices and reconciliations audit-ready.",
    },
    {
      question: "Who must operate a retention trust account in Queensland?",
      answer:
        "Queensland's trust account framework requires certain contractors withholding cash retentions to hold them in a retention trust account. Trustees should confirm their own obligations with the QBCC or their advisers.",
    },
    {
      question: "Can PayTrade handle both project trusts and retention trusts?",
      answer:
        "Yes. PayTrade supports project trust account and retention trust account administration in one system, with shared beneficiary, contract and project records.",
    },
    {
      question: "Does retention trust account software guarantee compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("retention-trust-account-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
