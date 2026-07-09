import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";

const config: MoneyPageConfig = {
  path: "xero-project-trust-account-software",
  keyword: "Xero project trust account software",
  title: "Xero Project Trust Account Software for Queensland Builders | PayTrade",
  description:
    "PayTrade helps Xero-using Queensland builders manage project trust accounts, retention trusts, bank account mapping, contact mapping, project and contract mapping, reconciliation and audit-ready records.",
  h1: "Xero Project Trust Account Software",
  breadcrumbName: "Xero Project Trust Account Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is Xero project trust account software: an audit-first trust administration layer that connects your Xero file to Queensland project trust and retention trust workflows.",
    "Xero is excellent accounting software, but project trust account administration requires a trust-specific layer. PayTrade helps connect Xero records to the project trust workflow so builders and advisers can maintain clearer trust ledgers, beneficiary records, notices, reconciliations and audit evidence.",
  ],
  sections: [
    {
      heading: "Why Xero users need Xero project trust account software",
      paragraphs: [
        "Xero tracks the accounting position, but Queensland trustees also have to show who trust money is held for, which project and contract each movement relates to, and how the trust account reconciles. Xero project trust account software adds that layer without duplicating your bookkeeping.",
      ],
      placeholders: [
        {
          label: "Xero integration dashboard",
          description:
            "Bank accounts, contacts, contracts, projects, invoices, bills and payments syncing between PayTrade and Xero, with a full sync log.",
          src: "/images/seo-screenshots/xero-integration.png",
        },
      ],
    },
    {
      heading: "Xero bank account mapping",
      paragraphs: [
        "Map each PayTrade trust bank account to its Xero bank account so trust movements and accounting records stay aligned. Payments recorded in PayTrade can push to Xero, and Xero transactions can be matched back to trust records.",
      ],
    },
    {
      heading: "Xero contact mapping",
      paragraphs: [
        "Subcontractors, suppliers and principals in PayTrade map to Xero contacts, including GST defaults, so invoices and bills are created against the right contact with the right tax treatment.",
      ],
    },
    {
      heading: "Xero project and contract mapping",
      paragraphs: [
        "PayTrade projects and contracts map to Xero so claims, invoices and bills carry the project trust context into the accounting file — and inbound Xero invoices can be matched to the right contract.",
      ],
    },
    {
      heading: "Payment claim and trust record workflow",
      paragraphs: [
        "From payment claim to approval, payment, retention and notice, each step writes to the trust ledger and, where mapped, syncs to Xero. The claim-to-ledger trail stays visible end to end.",
      ],
    },
    {
      heading: "Reconciliation and audit pack",
      paragraphs: [
        "Bank transactions reconcile against trust records with smart matching, and PayTrade can produce an audit pack that shows the evidence trail from claim through ledger to reconciliation.",
      ],
      links: [
        {
          href: "/audit-ready-project-trust-account-software",
          label: "See how PayTrade keeps trust records audit-ready",
        },
      ],
    },
    {
      heading: "Stronger than generic accounting workflows",
      paragraphs: [
        "Running project trusts on spreadsheets plus a generic Xero setup leaves gaps between the accounting record and the trust record. PayTrade closes that gap: one Xero-connected system where projects, contracts, beneficiaries, claims, bank accounts, ledgers, notices and reconciliations join together.",
      ],
    },
    {
      heading: "Xero how-to guides",
      paragraphs: [
        "Step-by-step guides cover connecting Xero, mapping bank accounts, contacts, projects and contracts, and managing two-way sync.",
      ],
      links: [
        {
          href: "/how-to-guides/integrations/connecting-xero-to-paytrade/integrations-connecting-xero-to-paytrade",
          label: "How to connect Xero to PayTrade",
        },
        {
          href: "/how-to-guides/integrations/mapping-bank-accounts-contacts-projects-and-contracts-in-xero/integrations-mapping-bank-accounts-contacts-projects-and-contracts-in-xero",
          label: "Mapping bank accounts, contacts, projects and contracts in Xero",
        },
        {
          href: "/how-to-guides/integrations/syncing-invoices-and-bills-with-xero/syncing-invoices-and-bills-with-xero",
          label: "Syncing invoices and bills with Xero",
        },
        {
          href: "/how-to-guides/integrations/xero-payment-synchronisation/integrations-xero-payment-synchronisation",
          label: "Xero payment synchronisation",
        },
        {
          href: "/how-to-guides/integrations/understanding-xero-sync-logs-and-error-resolution/integrations-understanding-xero-sync-logs-and-error-resolution",
          label: "Understanding Xero sync logs and error resolution",
        },
        { href: "/how-to-guides", label: "Browse all PayTrade how-to guides" },
      ],
    },
  ],
  faqs: [
    {
      question: "What is Xero project trust account software?",
      answer:
        "Xero project trust account software connects a Xero accounting file to Queensland project trust administration: trust ledgers, beneficiary records, claims, notices and reconciliation, with bank account, contact, project and contract mapping between the two systems.",
    },
    {
      question: "Does PayTrade replace Xero?",
      answer:
        "No. PayTrade is a trust-account administration layer that works alongside Xero rather than replacing Xero as the accounting system.",
    },
    {
      question: "Is the Xero integration two-way?",
      answer:
        "Yes. PayTrade pushes trust records such as invoices, bills and payments to Xero and matches inbound Xero records back to trust workflows, with webhook and scheduled sync.",
    },
    {
      question: "Does using PayTrade with Xero guarantee compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("xero-project-trust-account-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
