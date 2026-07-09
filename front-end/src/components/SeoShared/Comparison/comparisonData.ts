import { type FaqItem } from "../schema";
import { type SummaryCard } from "./CompetitorSummaryCards";
import { type FitDecision } from "./FitDecisionSection";

export const COMPARISON_HUB_PATH = "compare/project-trust-account-software";

export const COMPARISON_SOURCE_NOTES = [
  {
    label:
      "This comparison is based on public information available at the time of writing and PayTrade's own product documentation. Feature availability may change. Ask each provider to demonstrate features on a demo.",
  },
  {
    label:
      "PayTrade is listed on the Queensland Government assessed trust account software solutions page.",
  },
];

export type MatrixCell =
  | "Yes"
  | "Publicly claimed"
  | "Ask provider"
  | "ERP/module dependent"
  | "PayTrade focus"
  | "Not clear from public information"
  | "Confirm in demo";

export interface Competitor {
  slug: string;
  name: string;
  vsPath: string;
  alternativePath: string;
  vs: CompetitorPageCopy;
  alternative: CompetitorPageCopy;
}

export interface CompetitorPageCopy {
  title: string;
  description: string;
  h1: string;
  breadcrumbName: string;
  hero: string[];
  quickVerdictHeading: string;
  quickVerdict: string[];
  strengthsHeading: string;
  strengthsIntro?: string[];
  strengths: string[];
  whyPayTradeIntro?: string[];
  whyPayTrade: string[];
  extraSections?: { heading: string; paragraphs: string[] }[];
  fitIntro?: string[];
  fitDecisions: FitDecision[];
  demoQuestions: string[];
  faqs: FaqItem[];
}

const SHARED_DEMO_CTA_NOTE =
  "Ask PayTrade to demonstrate the Xero mapping and audit pack.";

export const COMPETITORS: Competitor[] = [
  {
    slug: "buildtrust",
    name: "BuildTrust",
    vsPath: "compare/pay-trade-vs-buildtrust",
    alternativePath: "compare/buildtrust-alternative",
    vs: {
      title: "PayTrade vs BuildTrust: Project Trust Account Software Compared",
      description:
        "Compare PayTrade and BuildTrust for Queensland project trust accounts, retention trusts, Xero workflows, reconciliation, audit trails and trust account records.",
      h1: "PayTrade vs BuildTrust",
      breadcrumbName: "PayTrade vs BuildTrust",
      hero: [
        "BuildTrust is a recognised project and retention trust accounting platform. PayTrade is an audit-first, Xero-connected trust administration system for Queensland construction businesses. This page compares the two based on public information and PayTrade's product positioning.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "BuildTrust appears strong where the buyer wants a specialist statutory trust accounting platform with public claims around ISO27001, reconciliation, reporting, ABA files and multiple integrations and imports. PayTrade may be stronger where the buyer wants a practical Xero-connected trust administration workflow, strong audit-ready record structure, and a focused system for project trust and retention trust evidence.",
      ],
      strengthsHeading: "Where BuildTrust appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "Specialist statutory trust accounting positioning.",
        "Publicly claims project trust and retention trust support.",
        "Publicly claims reconciliation and reporting.",
        "Publicly claims ISO27001 security.",
        "Publicly claims integrations and imports involving Procore, Xero, MYOB and QBO.",
        "Listed on the Queensland Government assessed trust account software solutions page.",
      ],
      whyPayTrade: [
        "Stronger public Xero workflow education around bank account, contact, project and contract mapping.",
        "More focused positioning for builders and bookkeepers who already use Xero.",
        "A clearer, more practical audit-first message.",
        "Better fit where the buyer wants traceability from claim to ledger to reconciliation, not just transaction processing.",
        "Better fit where the buyer wants a simple trust-account layer rather than a larger platform decision.",
      ],
      extraSections: [
        {
          heading: "Xero workflow comparison",
          paragraphs: [
            "BuildTrust publicly claims Xero integration and import capability alongside Procore, MYOB and QBO. PayTrade's Xero integration is two-way and covers bank account mapping, contact mapping, project and contract mapping and ongoing sync of invoices, bills and payments. If your accounting stack is Xero, ask both providers to show — live, on a demo — how a Xero contact, bank account, project and contract line up against the trust records.",
          ],
        },
        {
          heading: "Audit and record keeping comparison",
          paragraphs: [
            "Both products position around statutory trust record keeping. The practical test is whether an auditor can trace a payment claim from source document through beneficiary, trust bank account, ledger, notices and reconciliation. PayTrade is built around exactly that trail and can export an audit-ready evidence pack. Ask each provider to walk the same claim end to end.",
          ],
        },
        {
          heading: "Builder and bookkeeper workflow comparison",
          paragraphs: [
            "PayTrade is designed for the practical team — builder, contracts administrator, bookkeeper, accountant and auditor — with the day-to-day claim, payment and reconciliation workflow living alongside the trust records rather than in a separate compliance silo. Ask each provider how much double handling the bookkeeper carries between the trust system and Xero.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You want a specialist statutory trust accounting platform with a broad set of publicly claimed integrations",
          recommendation: "shortlist BuildTrust and ask it to demonstrate those claims.",
        },
        {
          scenario: "Your accounting stack is Xero and you want audit-ready project trust and retention trust records",
          recommendation: "shortlist PayTrade and ask us to show the Xero mapping and audit evidence pack.",
        },
      ],
      demoQuestions: [
        "Is the Xero workflow two-way or import-based?",
        "How are projects, contracts and beneficiaries mapped?",
        "What does the audit pack look like?",
        "Can the auditor trace a claim from source document to trust ledger and reconciliation?",
        SHARED_DEMO_CTA_NOTE,
      ],
      faqs: [
        {
          question: "Is PayTrade a BuildTrust alternative?",
          answer:
            "Yes. PayTrade is a BuildTrust alternative for Queensland builders and advisers comparing project trust account and retention trust account software, especially where Xero-connected workflows and audit-ready records are important.",
        },
        {
          question: "Is PayTrade better than BuildTrust?",
          answer:
            "It depends on the buyer's workflow. BuildTrust appears strong as a specialist statutory trust accounting platform. PayTrade may be a better fit for Xero-using builders who want a focused, audit-first trust administration workflow.",
        },
        {
          question: "Does PayTrade integrate with Xero?",
          answer:
            "Yes. PayTrade's two-way Xero integration covers bank account, contact, project and contract mapping plus ongoing sync — a major differentiator for Xero-using builders and bookkeepers.",
        },
      ],
    },
    alternative: {
      title: "BuildTrust Alternative for Project Trust Account Software | PayTrade",
      description:
        "Comparing BuildTrust? PayTrade is a BuildTrust alternative for Xero-using Queensland builders who want audit-ready project trust and retention trust records without a separate compliance silo.",
      h1: "A BuildTrust Alternative for Xero-Using Queensland Builders",
      breadcrumbName: "BuildTrust alternative",
      hero: [
        "If you are comparing BuildTrust, also consider PayTrade if your team wants Xero-connected trust administration, audit-ready records and a focused workflow for project trust accounts and retention trusts.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "BuildTrust is a recognised specialist trust accounting platform, and for many buyers it will be a solid shortlist option. An alternative is worth evaluating when the deciding factor is how the trust records line up with your existing Xero workflow, and how easily an auditor can walk from a payment claim to the reconciliation evidence.",
      ],
      strengthsHeading: "What BuildTrust is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, BuildTrust positions itself around:",
      ],
      strengths: [
        "Purpose-built statutory trust accounting.",
        "Project trust account and retention trust account support.",
        "Reconciliation, reporting and ABA files.",
        "ISO27001 security claims.",
        "Integration and import claims involving Procore, Xero, MYOB and QBO.",
      ],
      whyPayTradeIntro: [
        "PayTrade may be a better fit where your team wants:",
      ],
      whyPayTrade: [
        "A two-way Xero workflow — bank account, contact, project and contract mapping — instead of an import-centred one.",
        "One system where the claim, payment, notice, ledger and reconciliation records already join up for the auditor.",
        "A focused trust-account layer that sits alongside Xero rather than a larger platform decision.",
        "A workflow designed for builders and bookkeepers together, with less double handling.",
      ],
      fitDecisions: [
        {
          scenario: "You want the specialist platform with the longest public feature list",
          recommendation: "keep BuildTrust on the shortlist and ask it to demonstrate each claim.",
        },
        {
          scenario: "You run your accounts in Xero and care most about audit-ready trust evidence",
          recommendation: "evaluate PayTrade side by side and compare the Xero mapping and audit pack directly.",
        },
      ],
      demoQuestions: [
        "How does each product map Xero bank accounts, contacts, projects and contracts?",
        "Can each product export an audit-ready evidence pack?",
        "How much double handling does the bookkeeper carry between the trust system and Xero?",
        "Can an auditor trace one claim end to end in each product?",
      ],
      faqs: [
        {
          question: "What is a good BuildTrust alternative for Xero users?",
          answer:
            "PayTrade is a BuildTrust alternative built around a two-way Xero integration — bank account, contact, project and contract mapping — with audit-ready project trust and retention trust records.",
        },
        {
          question: "Do I have to leave Xero to use trust account software?",
          answer:
            "No. PayTrade works as a trust-account administration layer alongside Xero rather than replacing your accounting system.",
        },
        {
          question: "Is switching trust account software disruptive?",
          answer:
            "Ask each provider about implementation time and data migration. PayTrade is a focused trust-account layer, which generally means a smaller change than adopting a broader platform.",
        },
      ],
    },
  },
  {
    slug: "cabenet",
    name: "Cabenet",
    vsPath: "compare/pay-trade-vs-cabenet",
    alternativePath: "compare/cabenet-alternative",
    vs: {
      title: "PayTrade vs Cabenet: QBCC Trust Accounting Software Compared",
      description:
        "Compare PayTrade and Cabenet for project trust accounts, retention trusts, Xero workflows, reconciliation, notices, ledgers, reporting and audit-ready records.",
      h1: "PayTrade vs Cabenet",
      breadcrumbName: "PayTrade vs Cabenet",
      hero: [
        "Cabenet publicly positions itself around QBCC construction project trust accounting. PayTrade is an audit-first, Xero-connected trust administration system for Queensland construction businesses. This page compares the two based on public information and PayTrade's product positioning.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "Cabenet publicly positions itself around QBCC construction project trust accounting, unlimited PTA ledgers, retention account cashbook, reconciliation, notices, month-end reports and secure record sharing. PayTrade may be a better fit where the buyer wants Xero-connected trust administration, clear audit evidence and a practical system for builders, bookkeepers and accountants.",
      ],
      strengthsHeading: "Where Cabenet appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "Unlimited PTA ledgers.",
        "Retention account cashbook.",
        "Easy reconciliation.",
        "Month-end compliance reporting.",
        "Beneficiary statements.",
        "Automated notices.",
        "Secure archive and read-only sharing for auditors and regulators.",
      ],
      whyPayTrade: [
        "Stronger Xero-connected positioning, with live bank account, contact, project and contract mapping.",
        "Better fit for businesses that do not want to run trust records separately from their Xero workflow.",
        "An audit-first workflow that connects claims, documents, beneficiaries, accounts, ledgers and reconciliations.",
        "Better fit for builders and bookkeepers who want operational trust administration rather than only reporting and storage.",
      ],
      extraSections: [
        {
          heading: "Xero workflow comparison",
          paragraphs: [
            "Ask Cabenet how it connects to Xero and how payment claims, contacts, bank accounts and contracts are mapped. PayTrade's two-way Xero integration keeps the trust records and the accounting records aligned, so the bookkeeper is not maintaining two disconnected systems.",
          ],
        },
        {
          heading: "Audit and record keeping comparison",
          paragraphs: [
            "Cabenet publicly emphasises compliance reports, secure archive and read-only auditor access. PayTrade's emphasis is the trail itself: a complete, connected record from claim to ledger to reconciliation, exportable as an audit-ready evidence pack. Ask both providers to show a full audit trail for one real claim.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You mainly want PTA ledgers, cashbook, month-end reports and secure record sharing",
          recommendation: "shortlist Cabenet and ask it to demonstrate those features.",
        },
        {
          scenario: "Your accounting stack is Xero and you want the trust workflow connected to it",
          recommendation: "shortlist PayTrade and compare the live Xero mapping and audit workflow.",
        },
      ],
      demoQuestions: [
        "How does Cabenet connect to Xero?",
        "How are payment claims, contacts, bank accounts and contracts mapped?",
        "Can users see a complete audit trail from claim to ledger to reconciliation?",
        SHARED_DEMO_CTA_NOTE,
      ],
      faqs: [
        {
          question: "Is PayTrade a Cabenet alternative?",
          answer:
            "Yes. PayTrade is a Cabenet alternative for Queensland construction businesses comparing QBCC trust accounting software, especially where Xero-connected workflows and audit-ready evidence are priorities.",
        },
        {
          question: "Is PayTrade better than Cabenet?",
          answer:
            "It depends on your workflow. Cabenet publicly emphasises ledgers, cashbook, reports, notices and secure record sharing. PayTrade may be a better fit where you want the trust workflow connected to Xero and a complete audit trail from claim to reconciliation.",
        },
        {
          question: "Does PayTrade support notices and beneficiary records?",
          answer:
            "Yes. PayTrade stores notices with proof of issue and keeps beneficiary-level records connected to claims, payments, ledgers and reconciliations.",
        },
      ],
    },
    alternative: {
      title: "Cabenet Alternative for QBCC Trust Accounting Software | PayTrade",
      description:
        "Comparing Cabenet? PayTrade is a Cabenet alternative for teams that want the trust account workflow connected to their Xero accounting workflow, not just a separate compliance record.",
      h1: "A Cabenet Alternative for Xero-Connected Trust Administration",
      breadcrumbName: "Cabenet alternative",
      hero: [
        "PayTrade is positioned for teams who want the trust account workflow connected to the accounting workflow, not just a separate compliance record. If you are comparing Cabenet, this page explains when PayTrade belongs on the same shortlist.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "Cabenet publicly offers strong ledger, cashbook, reporting and record-sharing capability. An alternative is worth evaluating when the deciding factor is whether trust administration lives inside your day-to-day accounting workflow — especially if that workflow is Xero — rather than in a separate compliance system.",
      ],
      strengthsHeading: "What Cabenet is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, Cabenet positions itself around:",
      ],
      strengths: [
        "Unlimited PTA ledgers and a retention account cashbook.",
        "Reconciliation and month-end compliance reporting.",
        "Beneficiary statements and automated notices.",
        "Secure archive and read-only access for auditors and regulators.",
      ],
      whyPayTradeIntro: ["PayTrade may be a better fit where your team wants:"],
      whyPayTrade: [
        "Trust administration connected to Xero rather than run as a separate record set.",
        "Live mapping of Xero bank accounts, contacts, projects and contracts.",
        "An operational workflow — claims, payments, notices, reconciliation — not only reporting and storage.",
        "An exportable, audit-ready evidence pack that joins the whole trail together.",
      ],
      fitDecisions: [
        {
          scenario: "You mainly need ledgers, reports and secure record storage",
          recommendation: "Cabenet's public positioning covers that ground; ask it for a demonstration.",
        },
        {
          scenario: "You want trust administration inside your Xero-connected workflow",
          recommendation: "evaluate PayTrade and compare how the two products handle one claim end to end.",
        },
      ],
      demoQuestions: [
        "Does the trust system connect to Xero, and is the connection two-way?",
        "Where do payment claims live — in the trust system, the accounting system, or both?",
        "How is the month-end reconciliation evidenced?",
        "What does the auditor receive, and how quickly can it be produced?",
      ],
      faqs: [
        {
          question: "What is a good Cabenet alternative for Xero users?",
          answer:
            "PayTrade is a Cabenet alternative built around Xero-connected trust administration — bank account, contact, project and contract mapping — with audit-ready records for project trust and retention trust accounts.",
        },
        {
          question: "Can PayTrade produce month-end reconciliation evidence?",
          answer:
            "Yes. PayTrade supports monthly reconciliation evidence and connects it to the claims, payments, ledgers and notices behind it.",
        },
        {
          question: "Does using PayTrade guarantee compliance?",
          answer:
            "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
        },
      ],
    },
  },
  {
    slug: "e2efi",
    name: "E2EFi",
    vsPath: "compare/pay-trade-vs-e2efi",
    alternativePath: "compare/e2efi-alternative",
    vs: {
      title: "PayTrade vs E2EFi: Trust Account Software Compared",
      description:
        "Compare PayTrade and E2EFi for Queensland project trust accounts, retention trusts, notices, bank and general-ledger workflows, Xero integration, reconciliation and audit-ready records.",
      h1: "PayTrade vs E2EFi",
      breadcrumbName: "PayTrade vs E2EFi",
      hero: [
        "E2EFi is a standalone trust and compliance system with publicly claimed bank and general-ledger feed sync. PayTrade is an audit-first, Xero-connected trust administration system for Queensland construction businesses. This page compares the two based on public information and PayTrade's product positioning.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "E2EFi publicly claims transactions, notices, reconciliations, bank and general-ledger feed sync, mapped rules, deadline tracking and immutable ledgers. PayTrade may be a better fit where the buyer wants Xero-specific mapping, a practical builder and bookkeeper workflow and audit-ready project trust records.",
      ],
      strengthsHeading: "Where E2EFi appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "Transactions, notices and reconciliations in one system.",
        "Bank and general ledger feed sync.",
        "Rules and deadlines mapped into the system.",
        "Beneficial interest tracking.",
        "Immutable ledger claims.",
      ],
      whyPayTrade: [
        "A Xero-specific mapping and sync story — bank accounts, contacts, projects and contracts.",
        "Clear operational trust administration for builders and bookkeepers.",
        "Audit pack and evidence trail positioning.",
        "A simpler, focused workflow for Xero-using construction businesses.",
      ],
      extraSections: [
        {
          heading: "Xero workflow comparison",
          paragraphs: [
            "E2EFi publicly claims general-ledger feed sync; ask which general ledgers are supported and how deep the mapping goes. PayTrade is built specifically around Xero: bank account, contact, project and contract mapping with two-way sync, so trust records and accounting records stay aligned without re-keying.",
          ],
        },
        {
          heading: "Audit and record keeping comparison",
          paragraphs: [
            "Both products position around compliance record keeping. The practical question is what the auditor export contains and whether a claim can be traced from source document through beneficiary, bank account, ledger, notices and reconciliation. PayTrade produces an audit-ready evidence pack built on exactly that trail.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You want a standalone trust and compliance system with rules and deadline tracking",
          recommendation: "shortlist E2EFi and ask it to demonstrate the feed sync and rules engine.",
        },
        {
          scenario: "Your business runs on Xero and you want practical trust administration with audit-ready evidence",
          recommendation: "shortlist PayTrade and compare the Xero mapping and audit pack live.",
        },
      ],
      demoQuestions: [
        "Which general ledgers are supported?",
        "How does the system map Xero contacts, bank accounts, projects and contracts?",
        "What does the auditor export contain?",
        SHARED_DEMO_CTA_NOTE,
      ],
      faqs: [
        {
          question: "Is PayTrade an E2EFi alternative?",
          answer:
            "Yes. PayTrade is an E2EFi alternative for builders, bookkeepers and accountants comparing trust account software, especially if the business wants Xero-connected project trust account workflows.",
        },
        {
          question: "Is PayTrade better than E2EFi?",
          answer:
            "It depends on the workflow. E2EFi publicly claims broad feed sync, rules and deadline tracking. PayTrade may be a better fit where the deciding factor is practical Xero-connected trust administration and a clear audit-ready evidence pack.",
        },
        {
          question: "Does PayTrade track beneficial interest?",
          answer:
            "PayTrade keeps beneficiary-level records connected to claims, payments, ledgers and reconciliations so the trustee can show who the money belonged to at each point. Ask us to demonstrate this on a demo.",
        },
      ],
    },
    alternative: {
      title: "E2EFi Alternative for Trust Account Software | PayTrade",
      description:
        "Comparing E2EFi? PayTrade is an E2EFi alternative for Xero-using Queensland builders who want practical, audit-first project trust and retention trust administration.",
      h1: "An E2EFi Alternative for Xero-Using Builders",
      breadcrumbName: "E2EFi alternative",
      hero: [
        "If you are comparing E2EFi, also consider PayTrade if the deciding factor is practical Xero-connected trust administration, a simple day-to-day builder and bookkeeper workflow and a clear audit-ready evidence pack.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "E2EFi publicly positions itself as a standalone trust and compliance system with bank and general-ledger feed sync. An alternative is worth evaluating when your accounting stack is specifically Xero and you want the trust workflow mapped to it — contacts, bank accounts, projects and contracts — rather than generalised feed sync.",
      ],
      strengthsHeading: "What E2EFi is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, E2EFi positions itself around:",
      ],
      strengths: [
        "Transactions, notices and reconciliations in one system.",
        "Automatic sync to bank and general ledger feeds.",
        "Mapped rules and commitment and deadline tracking.",
        "Beneficial interest tracking and immutable ledger claims.",
      ],
      whyPayTradeIntro: ["PayTrade may be a better fit where your team wants:"],
      whyPayTrade: [
        "Xero-specific two-way mapping instead of generalised ledger feeds.",
        "A day-to-day workflow designed for builders and bookkeepers, not just compliance officers.",
        "An exportable audit-ready evidence pack joining claim, beneficiary, ledger, notice and reconciliation.",
        "A focused system that is simple to implement alongside your existing Xero file.",
      ],
      fitDecisions: [
        {
          scenario: "You need rules, deadlines and feed sync across several general ledgers",
          recommendation: "keep E2EFi on the shortlist and ask which ledgers are supported.",
        },
        {
          scenario: "You run on Xero and want the simplest audit-ready trust workflow",
          recommendation: "evaluate PayTrade and compare the Xero mapping directly.",
        },
      ],
      demoQuestions: [
        "Which general ledgers does each product support, and how deep is the mapping?",
        "How are Xero contacts, bank accounts, projects and contracts matched to trust records?",
        "What does the auditor export contain in each product?",
        "How long does implementation take for a small or mid-sized builder?",
      ],
      faqs: [
        {
          question: "What is a good E2EFi alternative for Xero users?",
          answer:
            "PayTrade is an E2EFi alternative built specifically around Xero — bank account, contact, project and contract mapping with two-way sync — plus audit-ready project trust and retention trust records.",
        },
        {
          question: "Does PayTrade replace Xero?",
          answer:
            "No. PayTrade is a trust-account administration layer that works alongside Xero rather than replacing it as the accounting system.",
        },
        {
          question: "Why not just use spreadsheets?",
          answer:
            "Spreadsheets can become difficult to audit, reconcile and control. Project trust account administration benefits from structured records linking projects, contracts, beneficiaries, claims, trust bank accounts, ledgers, notices and reconciliations.",
        },
      ],
    },
  },
  {
    slug: "cheops",
    name: "Cheops",
    vsPath: "compare/pay-trade-vs-cheops",
    alternativePath: "compare/cheops-alternative",
    vs: {
      title: "PayTrade vs Cheops: Trust Account Software or Construction ERP?",
      description:
        "Compare PayTrade and Cheops/CSSP: a focused, Xero-connected project trust account system versus a broad construction ERP for job costing, contracts and accounting.",
      h1: "PayTrade vs Cheops",
      breadcrumbName: "PayTrade vs Cheops",
      hero: [
        "Cheops (by CSSP) is a broad construction ERP. PayTrade is a focused, audit-first, Xero-connected trust-account administration system. This page compares the two based on public information and PayTrade's product positioning — they solve different-sized problems.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "Cheops/CSSP is a broad construction ERP for job costing, contract management, project management and accounting. PayTrade is a focused trust-account administration system. If you want an ERP, review Cheops. If you already have Xero and need project trust account records, retention trust administration and audit-ready evidence, PayTrade may be the better fit.",
      ],
      strengthsHeading: "Where Cheops appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "Integrated ERP for larger construction businesses.",
        "Job costing and contract management.",
        "Financial accounting and project management.",
        "Dashboards and workflow approvals.",
        "API capacity and a large construction software footprint.",
      ],
      whyPayTrade: [
        "No ERP replacement: PayTrade layers trust administration over your existing Xero workflow.",
        "Faster, simpler implementation for smaller and mid-sized builders.",
        "Trust-specific record structure — beneficiaries, notices, ledgers, reconciliation, retention transfers.",
        "An exportable audit-ready evidence pack from claim through reconciliation.",
      ],
      extraSections: [
        {
          heading: "ERP or focused trust layer?",
          paragraphs: [
            "The real decision on this page is not feature-by-feature — it is architectural. An ERP such as Cheops asks the business to move job costing, contracts and accounting into one platform, which may suit larger contractors. A focused layer such as PayTrade asks for much less: keep Xero, and add structured trust administration on top. Ask what implementation time, cost and complexity look like for your size of business.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You are a larger contractor consolidating job costing, contracts and accounting into one ERP",
          recommendation: "review Cheops and ask how its trust workflow operates inside the ERP.",
        },
        {
          scenario: "You already use Xero and need trust accounts handled properly without an ERP project",
          recommendation: "shortlist PayTrade as the focused trust-account layer.",
        },
      ],
      demoQuestions: [
        "Do you need a full ERP replacement or a focused trust account system?",
        "What is implementation time?",
        "What is the cost and complexity for a smaller builder?",
        "How does the trust workflow connect to existing Xero records?",
      ],
      faqs: [
        {
          question: "Is PayTrade a Cheops alternative?",
          answer:
            "For the trust-account problem, yes. PayTrade is an alternative for businesses that need project trust and retention trust administration without adopting a full construction ERP. Businesses that want a complete ERP should still review Cheops.",
        },
        {
          question: "Does PayTrade do job costing or project management?",
          answer:
            "No. PayTrade focuses on project trust account and retention trust account administration — records, claims, payments, notices, ledgers, reconciliation and audit evidence — alongside your existing systems.",
        },
        {
          question: "Can PayTrade work with the accounting system we already have?",
          answer:
            "PayTrade is built around a two-way Xero integration. If your business runs on Xero, PayTrade maps your bank accounts, contacts, projects and contracts to the trust records.",
        },
      ],
    },
    alternative: {
      title: "Cheops Alternative for Project Trust Accounts | PayTrade",
      description:
        "Need project trust account capability without a full construction ERP? PayTrade is a focused, Xero-connected alternative to running trust accounts through Cheops/CSSP.",
      h1: "A Cheops Alternative for Trust Accounts Without the ERP",
      breadcrumbName: "Cheops alternative",
      hero: [
        "Cheops/CSSP is a substantial construction ERP. If the only thing driving your software search is Queensland project trust and retention trust obligations, PayTrade offers a much smaller decision: keep your existing systems and add a focused, Xero-connected, audit-first trust layer.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "An ERP is the right call for some larger contractors. But adopting one to solve a trust-account problem can mean long implementation, retraining and cost that a focused system avoids. Based on public information, Cheops is positioned as an end-to-end ERP; PayTrade is positioned as the trust-account layer for Xero-using builders.",
      ],
      strengthsHeading: "What Cheops is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, Cheops positions itself around:",
      ],
      strengths: [
        "End-to-end construction ERP capability.",
        "Job costing, contract management and financial accounting.",
        "Project management, dashboards and workflow approvals.",
        "API capacity and an established footprint with larger contractors.",
      ],
      whyPayTradeIntro: ["PayTrade may be a better fit where your team wants:"],
      whyPayTrade: [
        "Trust-account capability without replacing existing systems.",
        "A two-way Xero integration mapping bank accounts, contacts, projects and contracts.",
        "Audit-ready records from claim through beneficiary, ledger, notice and reconciliation.",
        "Implementation measured in days, sized for smaller and mid-sized builders.",
      ],
      fitDecisions: [
        {
          scenario: "You are consolidating the whole business onto one construction platform",
          recommendation: "an ERP review including Cheops makes sense.",
        },
        {
          scenario: "You need trust accounts done properly and everything else already works",
          recommendation: "evaluate PayTrade as the focused alternative.",
        },
      ],
      demoQuestions: [
        "Is the trust capability available without adopting the full ERP?",
        "What does implementation cost and take for a business our size?",
        "How does each option connect to our existing Xero records?",
        "What audit evidence can each option export for PTA and RTA reviews?",
      ],
      faqs: [
        {
          question: "Can I get project trust account software without buying an ERP?",
          answer:
            "Yes. PayTrade is a focused project trust and retention trust administration system that works alongside Xero, so you do not need to adopt a construction ERP to manage trust accounts.",
        },
        {
          question: "Who should still consider Cheops?",
          answer:
            "Larger construction businesses that want one integrated platform for job costing, contract management, project management and accounting should review Cheops and similar ERPs.",
        },
        {
          question: "Does PayTrade guarantee compliance?",
          answer:
            "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
        },
      ],
    },
  },
  {
    slug: "premier-construction-software",
    name: "Premier Construction Software",
    vsPath: "compare/pay-trade-vs-premier-construction-software",
    alternativePath: "compare/premier-construction-software-alternative",
    vs: {
      title: "PayTrade vs Premier Construction Software: Trust Account Software Compared",
      description:
        "Compare PayTrade and Premier Construction Software: a focused, Xero-connected project trust account layer versus an all-in-one cloud construction ERP.",
      h1: "PayTrade vs Premier Construction Software",
      breadcrumbName: "PayTrade vs Premier Construction Software",
      hero: [
        "Premier Construction Software is positioned as an all-in-one cloud ERP for Australian construction. PayTrade is a focused, audit-first, Xero-connected project trust account system. This page compares the two based on public information and PayTrade's product positioning.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "Premier is positioned as an all-in-one cloud ERP for Australian construction. PayTrade is focused on project trust account and retention trust account administration. PayTrade may be better for businesses that want a trust-account layer connected to their current accounting workflow rather than a full ERP adoption.",
      ],
      strengthsHeading: "Where Premier appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "All-in-one cloud ERP positioning for Australian construction.",
        "Financials, project management and field management in one platform.",
        "Suited to businesses that want to consolidate systems.",
      ],
      whyPayTrade: [
        "A focused trust-account layer rather than a whole-of-business platform decision.",
        "Two-way Xero integration — bank account, contact, project and contract mapping.",
        "Trust-specific structure: beneficiaries, notices, ledgers, reconciliation, retention transfers.",
        "Audit-ready evidence pack designed for PTA and RTA reviews.",
      ],
      extraSections: [
        {
          heading: "Trust module or trust system?",
          paragraphs: [
            "If you are evaluating Premier for trust accounts, ask whether the trust capability is available without full ERP adoption, and what records it produces for PTA and RTA audits. PayTrade approaches the problem from the other direction: it is only a trust system, built to connect to the Xero records you already keep.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You want one platform for financials, project and field management",
          recommendation: "review Premier as part of an ERP evaluation.",
        },
        {
          scenario: "You want trust accounts handled without changing your accounting stack",
          recommendation: "shortlist PayTrade as the Xero-connected trust layer.",
        },
      ],
      demoQuestions: [
        "Is the trust account module available without full ERP adoption?",
        "How does it connect to Xero?",
        "What records are produced for PTA/RTA audits?",
      ],
      faqs: [
        {
          question: "Is PayTrade a Premier Construction Software alternative?",
          answer:
            "For project trust and retention trust administration, yes. PayTrade is an alternative for businesses that want a focused, Xero-connected trust-account system rather than adopting an all-in-one construction ERP.",
        },
        {
          question: "Is PayTrade better than Premier?",
          answer:
            "They solve different problems. Premier is publicly positioned as an all-in-one construction ERP. PayTrade may be the better fit where the requirement is specifically audit-ready project trust and retention trust records connected to Xero.",
        },
        {
          question: "Does PayTrade integrate with Xero?",
          answer:
            "Yes. PayTrade's two-way Xero integration covers bank account, contact, project and contract mapping with ongoing sync of invoices, bills and payments.",
        },
      ],
    },
    alternative: {
      title: "Premier Construction Software Alternative for Trust Accounts | PayTrade",
      description:
        "Need Queensland trust account capability without adopting an all-in-one construction ERP? PayTrade is a focused, Xero-connected alternative to Premier for PTA and RTA administration.",
      h1: "A Premier Alternative for Xero-Connected Trust Accounts",
      breadcrumbName: "Premier Construction Software alternative",
      hero: [
        "Premier Construction Software is publicly positioned as an all-in-one cloud ERP. If what your business actually needs is project trust and retention trust administration, PayTrade offers a focused alternative that connects to the Xero workflow you already run.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "All-in-one platforms suit businesses ready to consolidate. But when the trigger for the software search is Queensland's project trust framework, a dedicated trust system can be evaluated, implemented and audited with far less disruption. Based on public information, Premier is an ERP; PayTrade is the trust-account layer.",
      ],
      strengthsHeading: "What Premier is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, Premier positions itself around:",
      ],
      strengths: [
        "All-in-one cloud ERP for Australian construction.",
        "Financials, project management and field management in one system.",
        "Consolidation of multiple point solutions.",
      ],
      whyPayTradeIntro: ["PayTrade may be a better fit where your team wants:"],
      whyPayTrade: [
        "Trust administration without a whole-of-business software change.",
        "Two-way Xero mapping of bank accounts, contacts, projects and contracts.",
        "Beneficiary records, notices, ledgers and reconciliations built for PTA and RTA obligations.",
        "An exportable audit-ready evidence pack.",
      ],
      fitDecisions: [
        {
          scenario: "You are ready to consolidate onto one construction platform",
          recommendation: "include Premier in an ERP evaluation.",
        },
        {
          scenario: "You want to keep Xero and add trust capability",
          recommendation: "evaluate PayTrade side by side.",
        },
      ],
      demoQuestions: [
        "Can trust capability be licensed without the full ERP?",
        "What is the implementation timeline for each option?",
        "How does each option map to our existing Xero records?",
        "What does the PTA/RTA audit evidence look like in each option?",
      ],
      faqs: [
        {
          question: "What is a good Premier alternative for trust accounts?",
          answer:
            "PayTrade is a focused alternative for project trust and retention trust administration, built around a two-way Xero integration and audit-ready records — without requiring ERP adoption.",
        },
        {
          question: "Does PayTrade replace our accounting system?",
          answer:
            "No. PayTrade is a trust-account administration layer that works alongside Xero rather than replacing it.",
        },
        {
          question: "How long does PayTrade take to implement?",
          answer:
            "Because PayTrade is a focused layer over your existing Xero records, implementation is typically much faster than an ERP project. Ask us to scope it for your business on a demo.",
        },
      ],
    },
  },
  {
    slug: "bizprac",
    name: "Bizprac",
    vsPath: "compare/pay-trade-vs-bizprac",
    alternativePath: "compare/bizprac-alternative",
    vs: {
      title: "PayTrade vs Bizprac: Trust Account Software Compared",
      description:
        "Compare PayTrade and Bizprac: a focused, audit-first, Xero-connected project trust account system versus a comprehensive construction management and accounting suite.",
      h1: "PayTrade vs Bizprac",
      breadcrumbName: "PayTrade vs Bizprac",
      hero: [
        "Bizprac is positioned as a comprehensive construction management and accounting system. PayTrade is a focused, audit-first, Xero-connected trust administration system. This page compares the two based on public information and PayTrade's product positioning.",
      ],
      quickVerdictHeading: "Quick verdict",
      quickVerdict: [
        "Bizprac is positioned as a comprehensive construction management and accounting system. PayTrade may be better for builders and advisers who want focused, audit-first project trust account software rather than a broader construction management suite.",
      ],
      strengthsHeading: "Where Bizprac appears strong",
      strengthsIntro: [
        "Based on public information available at the time of writing:",
      ],
      strengths: [
        "Construction management and estimating.",
        "Job costing and accounting in one system.",
        "Project tracking and retentions tracking.",
        "PTA/trust management claims.",
      ],
      whyPayTrade: [
        "Dedicated trust administration rather than trust capability inside a larger suite.",
        "Two-way Xero workflow — bank accounts, contacts, projects and contracts stay mapped.",
        "Audit-ready evidence pack from claim through beneficiary, ledger, notice and reconciliation.",
        "A workflow designed for smaller and mid-sized builders and their bookkeepers.",
      ],
      extraSections: [
        {
          heading: "Suite module or dedicated system?",
          paragraphs: [
            "Bizprac publicly claims PTA and trust management within its construction accounting suite. The practical questions are how cleanly those trust workflows operate with Xero, and how easily an audit pack can be produced. PayTrade is built solely around that trust workflow, connected to the Xero records the business already maintains.",
          ],
        },
      ],
      fitDecisions: [
        {
          scenario: "You want estimating, job costing and accounting in one construction suite",
          recommendation: "review Bizprac and ask how its trust workflows operate.",
        },
        {
          scenario: "You want dedicated, Xero-connected trust administration with audit-ready records",
          recommendation: "shortlist PayTrade.",
        },
      ],
      demoQuestions: [
        "Can trust-account workflows operate cleanly with Xero?",
        "How easy is the audit pack?",
        "Is the trust workflow designed for smaller and mid-sized builders and their bookkeepers?",
      ],
      faqs: [
        {
          question: "Is PayTrade a Bizprac alternative?",
          answer:
            "For project trust and retention trust administration, yes. PayTrade is an alternative for builders who want a dedicated, Xero-connected, audit-first trust system rather than trust capability inside a broader construction suite.",
        },
        {
          question: "Is PayTrade better than Bizprac?",
          answer:
            "It depends on what you need. Bizprac is publicly positioned as a comprehensive construction management and accounting system. PayTrade may be the better fit where the priority is audit-ready trust records connected to Xero.",
        },
        {
          question: "Does PayTrade track retentions?",
          answer:
            "Yes. PayTrade administers retention trust accounts including retention transfers, ledgers, reconciliation and audit evidence.",
        },
      ],
    },
    alternative: {
      title: "Bizprac Alternative for Trust Account Software | PayTrade",
      description:
        "Comparing Bizprac for trust accounts? PayTrade is a Bizprac alternative offering dedicated, Xero-connected, audit-first project trust and retention trust administration.",
      h1: "A Bizprac Alternative for Dedicated Trust Administration",
      breadcrumbName: "Bizprac alternative",
      hero: [
        "Bizprac is a comprehensive construction management and accounting system. If your priority is specifically Queensland project trust and retention trust administration, PayTrade offers a dedicated alternative that works alongside Xero instead of asking you to adopt a broader suite.",
      ],
      quickVerdictHeading: "Why consider an alternative?",
      quickVerdict: [
        "A construction suite makes sense when you want estimating, job costing and accounting together. An alternative is worth evaluating when the trust-account obligations are the driver: a dedicated system can keep the trust records, Xero mapping and audit evidence at the centre rather than as one module among many.",
      ],
      strengthsHeading: "What Bizprac is publicly known for",
      strengthsIntro: [
        "Based on public information available at the time of writing, Bizprac positions itself around:",
      ],
      strengths: [
        "Construction management and estimating.",
        "Job costing, accounting and project tracking.",
        "Retentions tracking and PTA/trust management.",
      ],
      whyPayTradeIntro: ["PayTrade may be a better fit where your team wants:"],
      whyPayTrade: [
        "A system whose whole design is trust administration and audit evidence.",
        "Two-way Xero mapping of bank accounts, contacts, projects and contracts.",
        "Notices, beneficiary records, ledgers and monthly reconciliation evidence connected end to end.",
        "A lighter footprint for smaller and mid-sized Xero-using builders.",
      ],
      fitDecisions: [
        {
          scenario: "You want one construction suite for estimating through accounting",
          recommendation: "keep Bizprac on the list and test its trust workflows.",
        },
        {
          scenario: "You want trust accounts handled with the least disruption to your Xero workflow",
          recommendation: "evaluate PayTrade as the dedicated alternative.",
        },
      ],
      demoQuestions: [
        "How does each product keep trust records aligned with Xero?",
        "What does the audit pack contain and how fast can it be produced?",
        "How are retention transfers recorded and evidenced?",
        "What does the bookkeeper's month-end look like in each product?",
      ],
      faqs: [
        {
          question: "What is a good Bizprac alternative for trust accounts?",
          answer:
            "PayTrade is a Bizprac alternative for project trust and retention trust administration, built around a two-way Xero integration and an audit-ready evidence trail.",
        },
        {
          question: "Can PayTrade work alongside our existing construction tools?",
          answer:
            "Yes. PayTrade is a focused trust-account layer, so it sits alongside your existing estimating, job costing and accounting tools rather than replacing them.",
        },
        {
          question: "Does using PayTrade guarantee compliance?",
          answer:
            "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
        },
      ],
    },
  },
];

export function getCompetitor(slug: string): Competitor {
  const competitor = COMPETITORS.find((item) => item.slug === slug);
  if (!competitor) {
    throw new Error(`Unknown competitor slug: ${slug}`);
  }
  return competitor;
}

// ---------------------------------------------------------------------------
// Hub page data
// ---------------------------------------------------------------------------

export interface PositioningRow {
  software: string;
  bestSuitedTo: string;
  publiclyClaimedStrengths: string;
  wherePayTradeMayBeStronger: string;
  questionsToAsk: string;
}

export const HUB_POSITIONING_ROWS: PositioningRow[] = [
  {
    software: "PayTrade",
    bestSuitedTo:
      "Queensland builders, head contractors, bookkeepers, accountants and auditors who want Xero-connected, audit-first project trust and retention trust administration.",
    publiclyClaimedStrengths:
      "Project and retention trust administration, Xero mapping/sync, trust account records, simple construction trust workflows, support for builders/bookkeepers/subcontractors.",
    wherePayTradeMayBeStronger:
      "Best fit where the user wants Xero-connected trust records, audit-ready evidence, clear relationship between claims/payments/beneficiaries/projects/contracts, and a simple system focused on trust administration rather than a large ERP replacement.",
    questionsToAsk:
      "Can PayTrade show Xero bank account, contact, project and contract mapping? Can PayTrade produce the audit record pack? Can it show project trust and retention trust records from claim through reconciliation?",
  },
  {
    software: "BuildTrust",
    bestSuitedTo:
      "Builders or accounting firms looking for a specialist statutory trust accounting platform.",
    publiclyClaimedStrengths:
      "Purpose-built statutory trust accounting, project trust accounts, retention trust accounts, reconciliation, reporting, ABA files, invoice scanning, ISO27001 security, Xero/API integration claims, Procore/MYOB/QBO import claims.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the buyer wants a simpler Xero-connected operational workflow and wants to inspect how project, contract, beneficiary, claim, bank account and reconciliation records join together inside the product.",
    questionsToAsk:
      "Is the Xero workflow two-way or import-based? How are projects, contracts and beneficiaries mapped? What does the audit pack look like? Can the auditor trace a claim from source document to trust ledger and reconciliation?",
  },
  {
    software: "Cabenet",
    bestSuitedTo:
      "Trustees seeking PTA ledgers, RTA cashbook, notices, compliance reports and secure record sharing.",
    publiclyClaimedStrengths:
      "Unlimited PTA ledgers, retention account cashbook, reconciliation, month-end compliance reports, automated notices, secure archive and read-only access for auditors/regulators.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the buyer's accounting stack is Xero and they want Xero-connected administration rather than only ledger/report storage. PayTrade emphasises live mapping, audit workflow and operational simplicity.",
    questionsToAsk:
      "How does Cabenet connect to Xero? How are payment claims, contacts, bank accounts and contracts mapped? Can users see a complete audit trail from claim to ledger to reconciliation?",
  },
  {
    software: "E2EFi",
    bestSuitedTo:
      "Teams wanting a standalone trust/compliance system with bank/general-ledger feed sync and rules/deadline tracking.",
    publiclyClaimedStrengths:
      "Transactions, notices and reconciliations in the E2EFi system, automatic sync to bank and general ledger feeds, mapped rules, commitment/deadline tracking, beneficial interest tracking, immutable ledgers.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the deciding factor is practical Xero-connected trust administration, simple day-to-day builder/bookkeeper use and a clear audit-ready evidence pack.",
    questionsToAsk:
      "Which general ledgers are supported? How does the system map Xero contacts, bank accounts, projects and contracts? What does the auditor export contain?",
  },
  {
    software: "Cheops / CSSP",
    bestSuitedTo:
      "Larger construction businesses wanting an end-to-end ERP for job costing, contract management, project management and financial accounting.",
    publiclyClaimedStrengths:
      "Integrated ERP, job costing, contract management, financial accounting, project management, dashboards, workflow approvals, API capacity, large construction software footprint.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the business already uses Xero or another system and does not want to replace its whole ERP. PayTrade is a focused trust-account administration layer rather than a broad enterprise construction management system.",
    questionsToAsk:
      "Do you need a full ERP replacement or a focused trust account system? What is implementation time? What is the cost and complexity for a smaller builder? How does the trust workflow connect to existing Xero records?",
  },
  {
    software: "Premier Construction Software",
    bestSuitedTo:
      "Construction businesses wanting a broader all-in-one ERP with financials, project and field management.",
    publiclyClaimedStrengths:
      "All-in-one cloud ERP for Australian construction, financials, project management and field management.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the buyer wants a focused, Xero-connected project trust account system instead of adopting an all-in-one construction ERP.",
    questionsToAsk:
      "Is the trust account module available without full ERP adoption? How does it connect to Xero? What records are produced for PTA/RTA audits?",
  },
  {
    software: "Bizprac",
    bestSuitedTo:
      "Construction businesses already using or wanting a comprehensive construction management/accounting system.",
    publiclyClaimedStrengths:
      "Construction management, estimating, job costing, accounting, project tracking, retentions tracking and PTA/trust management.",
    wherePayTradeMayBeStronger:
      "PayTrade may be a better fit where the buyer wants dedicated trust administration and audit-ready workflows without moving to a large construction accounting suite.",
    questionsToAsk:
      "Can trust-account workflows operate cleanly with Xero? How easy is the audit pack? Is the trust workflow designed for smaller/mid-sized builders and their bookkeepers?",
  },
];

export const HUB_DIFFERENTIATOR_CARDS: SummaryCard[] = [
  {
    title: "1. Audit-first by design",
    body: "PayTrade presents the trust record as evidence, not just data. The product makes it easy to show the relationship between project, contract, beneficiary, claim, trust bank account, ledger, reconciliation and supporting documents.",
  },
  {
    title: "2. Xero-connected workflows",
    body: "PayTrade emphasises Xero bank account mapping, contact mapping, project/contract mapping and Xero sync. This is the strongest commercial differentiator for builders and bookkeepers already using Xero.",
  },
  {
    title: "3. Trust-specific record structure",
    body: "Generic accounting software can record transactions, but project trust account administration requires a stronger structure around beneficial interests, notices, monthly reconciliation, trust ledgers and retention transfers.",
  },
  {
    title: "4. Built for builders and advisers",
    body: "PayTrade speaks to the practical team: builder, contracts administrator, bookkeeper, accountant and auditor. The product reduces the gap between site/project operations and trust-account evidence.",
  },
  {
    title: "5. Focused instead of bloated",
    body: "Some alternatives are broad ERP systems. That may suit larger contractors, but many Queensland builders need a focused trust account layer that works with their existing accounting workflow.",
  },
  {
    title: "6. Better for AI and search clarity",
    body: "PayTrade makes its public entity clear: Xero-connected project trust account software for Queensland builders. That description is used consistently across pages, schema, FAQs, comparison pages, the facts page and llms.txt.",
  },
];

export const MATRIX_COLUMNS = [
  "Feature",
  "PayTrade",
  "BuildTrust",
  "Cabenet",
  "E2EFi",
  "Cheops/CSSP",
  "Premier",
  "Bizprac",
];

// Cell values restricted to the allowed vocabulary. Competitors are never
// marked "No"; unverified capability is "Ask provider" or "Not clear from
// public information".
export const MATRIX_ROWS: [string, MatrixCell, MatrixCell, MatrixCell, MatrixCell, MatrixCell, MatrixCell, MatrixCell][] = [
  ["Project trust account support", "Yes", "Publicly claimed", "Publicly claimed", "Publicly claimed", "ERP/module dependent", "ERP/module dependent", "Publicly claimed"],
  ["Retention trust account support", "Yes", "Publicly claimed", "Publicly claimed", "Publicly claimed", "ERP/module dependent", "ERP/module dependent", "Publicly claimed"],
  ["Trust ledgers", "Yes", "Publicly claimed", "Publicly claimed", "Publicly claimed", "ERP/module dependent", "Ask provider", "Ask provider"],
  ["Reconciliation statements", "Yes", "Publicly claimed", "Publicly claimed", "Publicly claimed", "ERP/module dependent", "Ask provider", "Ask provider"],
  ["Beneficiary records/statements", "Yes", "Publicly claimed", "Publicly claimed", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider"],
  ["Notices", "Yes", "Ask provider", "Publicly claimed", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider"],
  ["Audit trail", "PayTrade focus", "Ask provider", "Publicly claimed", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider"],
  ["Audit pack/export", "Yes", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider"],
  ["Xero bank account mapping", "Yes", "Ask provider", "Ask provider", "Ask provider", "Not clear from public information", "Ask provider", "Ask provider"],
  ["Xero contact mapping", "Yes", "Ask provider", "Ask provider", "Ask provider", "Not clear from public information", "Ask provider", "Ask provider"],
  ["Xero project/contract mapping", "Yes", "Ask provider", "Ask provider", "Ask provider", "Not clear from public information", "Ask provider", "Ask provider"],
  ["Two-way Xero sync", "Yes", "Ask provider", "Ask provider", "Ask provider", "Not clear from public information", "Ask provider", "Ask provider"],
  ["General ledger sync/import", "Yes", "Publicly claimed", "Ask provider", "Publicly claimed", "ERP/module dependent", "ERP/module dependent", "ERP/module dependent"],
  ["Bank feed support", "Yes", "Ask provider", "Ask provider", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider"],
  ["Payment claim workflow", "Yes", "Ask provider", "Ask provider", "Ask provider", "ERP/module dependent", "ERP/module dependent", "Ask provider"],
  ["ABA/payment file support", "Yes", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider"],
  ["Accountant/bookkeeper workflow", "PayTrade focus", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider"],
  ["Auditor/regulator read-only access", "Ask provider", "Ask provider", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider", "Ask provider"],
  ["Full ERP replacement", "Not clear from public information", "Not clear from public information", "Not clear from public information", "Not clear from public information", "Publicly claimed", "Publicly claimed", "Publicly claimed"],
  ["Focused trust-account layer", "PayTrade focus", "Publicly claimed", "Publicly claimed", "Publicly claimed", "Ask provider", "Ask provider", "Ask provider"],
  ["Best for smaller/mid-sized Xero-using builders", "PayTrade focus", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider", "Ask provider"],
];

export const HUB_BUYER_QUESTIONS = [
  "Can the software show the full record from payment claim to trust ledger to reconciliation?",
  "Can it map bank accounts, contacts, projects and contracts from Xero?",
  "Is the Xero integration two-way, import-only, or manual?",
  "Can it support both project trust accounts and retention trust accounts?",
  "Can it produce monthly reconciliation evidence?",
  "Can it show beneficiary-level records?",
  "Can it store notices and proof of issue?",
  "Can an auditor quickly review the trust records?",
  "Does it require replacing your accounting system or ERP?",
  "How long does implementation take?",
  "What happens if a record is edited?",
  "Can the software explain who had beneficial interest in funds at each point in time?",
  "Can it export an audit-ready evidence pack?",
  "Does it create extra double handling for bookkeepers?",
  "What compliance responsibility remains with the trustee?",
];

export const HUB_FAQS: FaqItem[] = [
  {
    question: "What is the best project trust account software for Queensland builders?",
    answer:
      "The best software depends on the builder's workflow. Businesses wanting a full ERP may compare Cheops, Premier or Bizprac. Businesses wanting specialist trust account software may compare PayTrade, BuildTrust, Cabenet and E2EFi. PayTrade may be a strong choice for Xero-using builders who want audit-first trust records and project trust/retention trust administration.",
  },
  {
    question: "Is PayTrade a BuildTrust alternative?",
    answer:
      "Yes. PayTrade is a BuildTrust alternative for Queensland builders comparing project trust account and retention trust account software, especially where Xero-connected workflows and audit-ready records are priorities.",
  },
  {
    question: "Is PayTrade a Cabenet alternative?",
    answer:
      "Yes. PayTrade is a Cabenet alternative for teams comparing QBCC trust accounting software, particularly where Xero integration, audit trail and operational trust administration are important.",
  },
  {
    question: "Is PayTrade an E2EFi alternative?",
    answer:
      "Yes. PayTrade is an E2EFi alternative for builders, bookkeepers and accountants comparing trust account software, especially if the business wants Xero-connected project trust account workflows.",
  },
  {
    question: "Does PayTrade replace Xero?",
    answer:
      "No. PayTrade is a trust-account administration layer that works alongside Xero, rather than replacing Xero as the accounting system.",
  },
  {
    question: "Why not just use spreadsheets?",
    answer:
      "Spreadsheets can become difficult to audit, reconcile and control. Project trust account administration benefits from structured records linking projects, contracts, beneficiaries, claims, trust bank accounts, ledgers, notices and reconciliations.",
  },
  {
    question: "Does using PayTrade guarantee compliance?",
    answer:
      "No. PayTrade supports administration and record keeping. Trustees remain responsible for compliance and should seek legal, accounting, audit or QBCC advice where required.",
  },
];
