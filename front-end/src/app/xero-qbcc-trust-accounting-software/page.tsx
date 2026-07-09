import MoneyPage, {
  buildMoneyPageMetadata,
  type MoneyPageConfig,
} from "@/components/SeoShared/MoneyPage";
import { relatedLinksFor } from "@/components/SeoShared/moneyPageLinks";
import { GOV_LISTING_STATEMENT } from "@/components/SeoShared/schema";

const config: MoneyPageConfig = {
  path: "xero-qbcc-trust-accounting-software",
  keyword: "Xero QBCC trust accounting software",
  title: "Xero QBCC Trust Accounting Software | PayTrade",
  description:
    "PayTrade is Xero QBCC trust accounting software: connect your Xero file to QBCC project trust and retention trust administration with mapped bank accounts, contacts, projects, contracts and audit-ready records.",
  h1: "Xero QBCC Trust Accounting Software",
  breadcrumbName: "Xero QBCC Trust Accounting Software",
  lastReviewed: "2026-07-09",
  intro: [
    "PayTrade is Xero QBCC trust accounting software for Queensland construction businesses that already run their accounts in Xero and need a QBCC-focused trust administration layer on top.",
    "The QBCC project trust framework asks more of a trustee than standard bookkeeping. Trust money must be traceable to beneficiaries, projects, contracts, claims, notices and reconciliations — and the accounting file still has to stay accurate.",
  ],
  sections: [
    {
      heading: "How Xero QBCC trust accounting software joins the two systems",
      paragraphs: [
        "Instead of keeping a Xero file and a separate spreadsheet of trust obligations, PayTrade maps Xero bank accounts, contacts, projects and contracts to QBCC trust records. Each claim, payment and retention movement is recorded once and reflected in both systems.",
      ],
      list: [
        "Xero bank account mapping for project and retention trust accounts",
        "Xero contact mapping with GST defaults",
        "Xero project and contract mapping",
        "Two-way invoice, bill and payment sync",
        "Retention journals and trust movement sync",
      ],
    },
    {
      heading: "QBCC-focused records, not just bookkeeping",
      paragraphs: [
        "PayTrade keeps trust ledgers, beneficiary records, notices and reconciliations in a form designed for review by accountants, auditors and the QBCC — while Xero remains the accounting source of truth.",
      ],
    },
    {
      heading: "Queensland Government listing",
      paragraphs: [GOV_LISTING_STATEMENT],
    },
  ],
  faqs: [
    {
      question: "What is Xero QBCC trust accounting software?",
      answer:
        "Xero QBCC trust accounting software links a Xero accounting file to QBCC project trust and retention trust administration, so trust ledgers, beneficiary records, notices and reconciliations stay aligned with the accounting records.",
    },
    {
      question: "Do I still need Xero if I use PayTrade?",
      answer:
        "Yes. Xero remains your accounting system. PayTrade is the trust administration layer that connects QBCC trust records to your Xero file.",
    },
    {
      question: "How does PayTrade keep Xero and trust records in sync?",
      answer:
        "PayTrade uses mapped bank accounts, contacts, projects and contracts with webhook plus scheduled sync, so records created in either system can be matched and reconciled.",
    },
    {
      question: "Does this guarantee QBCC compliance?",
      answer:
        "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
    },
  ],
  relatedLinks: relatedLinksFor("xero-qbcc-trust-accounting-software"),
};

export const metadata = buildMoneyPageMetadata(config);

export default function Page() {
  return <MoneyPage config={config} />;
}
