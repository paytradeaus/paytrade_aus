import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GuestFooter from "@/components/GuestFooter";
import SeoJsonLd from "@/components/SeoShared/SeoJsonLd";
import DisclaimerBox from "@/components/SeoShared/DisclaimerBox";
import LastReviewed from "@/components/SeoShared/LastReviewed";
import FAQAccordion from "@/components/SeoShared/FAQAccordion";
import SourceNoteBox from "@/components/SeoShared/SourceNoteBox";
import KeywordAlignedContent from "@/components/SeoShared/KeywordAlignedContent";
import FinalCta from "@/components/HomeScreen/sections/FinalCta";
import {
  absoluteUrl,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildWebPageSchema,
  type FaqItem,
} from "@/components/SeoShared/schema";

const PATH = "project-trust-account";
const TITLE = "Project Trust Accounts Queensland: Complete Guide | PayTrade";
const DESCRIPTION =
  "What is a project trust account? A complete Queensland guide to project trust accounts under the BIF Act: current thresholds, who needs one, trustees and beneficiaries, the bank account, trust ledgers, notices, reconciliation, retention trusts, audits after BIFOLA 2024, and penalties.";
const DATE_PUBLISHED = "2026-08-14";
const LAST_REVIEWED = "2026-08-14";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    siteName: "PayTrade",
    images: [
      {
        url: absoluteUrl("images/ogFavicon.png"),
        alt: "PayTrade",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl("images/ogFavicon.png")],
  },
};

const faqs: FaqItem[] = [
  {
    question: "What is a project trust account in simple terms?",
    answer:
      "A project trust account is a special bank account a Queensland head contractor must open for an eligible building contract. Progress payments from the principal are paid into it, and subcontractors are paid out of it. The money is held on trust, so it legally belongs to the subcontractors and the head contractor according to their entitlements — it is not general working capital.",
  },
  {
    question: "Who needs a project trust account in Queensland?",
    answer:
      "Head contractors on eligible contracts under the Building Industry Fairness (Security of Payment) Act 2017. Eligibility depends on the contract price, the type of principal (for example Queensland government, hospital and health services, or private sector) and the kind of building work. Always check the current thresholds with the QBCC before contracting.",
  },
  {
    question: "Is a project trust account the same as a retention trust account?",
    answer:
      "No. A project trust account holds progress payments for a single eligible project. A retention trust account holds cash retention amounts withheld from payments, and one retention trust account can cover retentions across multiple contracts. A trustee may need both.",
  },
  {
    question: "Can I use one project trust account for several projects?",
    answer:
      "No. Each eligible contract needs its own project trust account. A retention trust account, by contrast, can hold retention amounts from multiple contracts.",
  },
  {
    question: "Are project trust accounts still audited every year?",
    answer:
      "Since the Building Industry Fairness (Security of Payment) and Other Legislation Amendment Act 2024 (BIFOLA), the standing annual account-review requirement was removed. Audits and reviews of trust accounts now occur when directed by the QBCC, and trustees must still keep full records ready for such a review at any time.",
  },
  {
    question: "What records must a trustee keep for a project trust account?",
    answer:
      "Trust records including a trust ledger with an account for each beneficiary, deposit and withdrawal records, payment claim and payment records, copies of required notices, monthly bank reconciliations, and supporting documents. Records generally must be kept for the required retention period after the trust ends and produced to the QBCC on request.",
  },
  {
    question: "What happens if a head contractor misuses project trust money?",
    answer:
      "Misusing trust money is one of the most serious breaches under the BIF Act. Penalties can include substantial fines and, for dishonest misappropriation, imprisonment. Directors and executives can be personally liable, and the QBCC can take licensing action.",
  },
  {
    question: "Do subcontractors have to do anything to be protected?",
    answer:
      "Subcontractor beneficiaries do not administer the account, but they should confirm they have received the required notices, check that payments come from the trust account, and can request information about the trust. The protections apply automatically once they are a beneficiary of the trust.",
  },
  {
    question: "Do I need software to run a project trust account?",
    answer:
      "The law does not mandate software, but the record-keeping, ledger, notice and reconciliation obligations are difficult to evidence reliably in spreadsheets. The Queensland Government publishes a list of assessed trust account software solutions, and PayTrade is one of the listed products.",
  },
];

const sources = [
  {
    label:
      "QBCC — Trust accounts (framework overview, thresholds and trustee obligations)",
    url: "https://www.qbcc.qld.gov.au/running-your-business/trust-accounts",
  },
  {
    label:
      "Building Industry Fairness (Security of Payment) Act 2017 (Qld), Chapter 2 — statutory trusts",
    url: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-2017-025",
  },
  {
    label:
      "Queensland Government — assessed trust account software solutions",
    url: "https://www.housing.qld.gov.au/news-publications/legislation/building/trust-accounts/assessed-trust-solutions",
  },
];

export default function Page() {
  const schemas = [
    buildOrganizationSchema(),
    buildWebPageSchema({
      name: TITLE,
      description: DESCRIPTION,
      path: PATH,
    }),
    buildArticleSchema({
      headline: "What Is a Project Trust Account?",
      description: DESCRIPTION,
      path: PATH,
      datePublished: DATE_PUBLISHED,
      dateModified: LAST_REVIEWED,
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Project Trust Account", path: PATH },
    ]),
  ];

  return (
    <>
      <SeoJsonLd data={schemas} />
      <div className="pt_wrap">
        <div className="pt_page">
          <SiteHeader />
          <main>
            <div
              className="container-fluid"
              style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}
            >
              <h1>What Is a Project Trust Account?</h1>
              <p>
                A <strong>project trust account (PTA)</strong> is a dedicated bank
                account that a head contractor in Queensland must open for an
                eligible building contract under the{" "}
                <em>Building Industry Fairness (Security of Payment) Act 2017</em>{" "}
                (the BIF Act). Progress payments from the principal are deposited
                into the account, and subcontractors are paid from it. The money in
                the account is held <strong>on trust</strong>: it belongs to the
                subcontractor beneficiaries and the head contractor according to
                their entitlements, and it cannot be used as the head
                contractor&apos;s general working capital.
              </p>
              <p>
                This guide explains how Queensland&apos;s project trust framework
                works end to end — who needs a project trust account, how the money
                moves, what records the trustee must keep, how retention trusts fit
                in, what changed with the 2024 BIFOLA amendments, and what the
                penalties are for getting it wrong.
              </p>
              <LastReviewed date={LAST_REVIEWED} />

              <section>
                <h2>Why project trust accounts exist</h2>
                <p>
                  Queensland introduced statutory trusts after a series of
                  construction insolvencies left subcontractors unpaid for work
                  they had already completed. Before the framework, a progress
                  payment from a principal simply landed in the head
                  contractor&apos;s general account, where it could be absorbed by
                  other debts. The BIF Act changes the legal character of that
                  money: from the moment it is deposited, it is trust property. If
                  the head contractor becomes insolvent, trust money for
                  subcontractors is quarantined from ordinary creditors.
                </p>
                <p>
                  For a deeper walk-through of the mechanics, see{" "}
                  <Link href="/topics/how-project-trust-accounts-work">
                    how project trust accounts work
                  </Link>{" "}
                  and the{" "}
                  <Link href="/topics/building-industry-fairness-act">
                    Building Industry Fairness Act overview
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2>Current thresholds: which contracts need one</h2>
                <p>
                  A project trust is required for an <strong>eligible contract</strong>.
                  Eligibility depends on three things: who the principal is, the
                  contract price, and whether more than 50% of the contract price
                  is for &quot;project trust work&quot; (broadly, building work as
                  defined in the framework, with exclusions such as purely civil
                  construction, maintenance-only work and residential work of fewer
                  than three living units).
                </p>
                <ul>
                  <li>
                    <strong>Queensland government and hospital &amp; health service
                    contracts</strong> — project trusts apply from a lower contract
                    value threshold (contracts of $1&nbsp;million or more).
                  </li>
                  <li>
                    <strong>Private sector, local government, statutory authority
                    and government-owned corporation contracts</strong> — project
                    trusts apply at a higher threshold ($10&nbsp;million or more).
                    The previously legislated expansion to lower private-sector
                    tiers was deferred and then paused by later amendments.
                  </li>
                </ul>
                <p>
                  The thresholds and the rollout timetable have changed several
                  times since 2021, including under the 2024 BIFOLA amendments, so
                  always confirm the current position on the{" "}
                  <a
                    href="https://www.qbcc.qld.gov.au/running-your-business/trust-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    QBCC trust accounts page
                  </a>{" "}
                  before contracting. See also{" "}
                  <Link href="/topics/qbcc-project-trust-threshold">
                    QBCC project trust thresholds
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/need-project-trust-account-qld">
                    do you need a project trust account in Queensland?
                  </Link>
                </p>
              </section>

              <section>
                <h2>Who needs one — and who is protected</h2>
                <p>
                  The <strong>head contractor</strong> on an eligible contract is
                  the party required to establish the project trust and act as{" "}
                  <strong>trustee</strong>. The obligation sits with the head
                  contractor even though the principal&apos;s payments fund the
                  account. Principals have their own obligations, including paying
                  into the trust account and, in some circumstances, notifying the
                  QBCC.
                </p>
                <p>
                  The <strong>beneficiaries</strong> are the subcontractors engaged
                  by the head contractor for the project, together with the head
                  contractor itself (for its own entitlement). Subcontractors do
                  not run the account, but they gain real protections: trust money
                  is quarantined from the head contractor&apos;s other creditors,
                  and beneficiaries are entitled to certain notices and
                  information. More detail:{" "}
                  <Link href="/topics/project-trust-head-contractors">
                    head contractor obligations
                  </Link>
                  ,{" "}
                  <Link href="/topics/project-trust-principals">
                    principal obligations
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/project-trust-subcontractors">
                    what subcontractors should know
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2>The bank account itself</h2>
                <p>
                  A project trust account must be opened with an approved
                  financial institution in Queensland, in the trustee&apos;s name,
                  and its name must include the word &quot;trust&quot;. One project
                  trust account is required <strong>per eligible contract</strong> —
                  trustees cannot pool multiple projects into a single PTA. The
                  trustee must notify the QBCC when the account is opened, closed,
                  transferred or renamed, and must tell the principal and
                  beneficiaries the account details.
                </p>
                <p>
                  All progress payments from the principal must be deposited into
                  the account, and payments to subcontractor beneficiaries must be
                  made from it. The trustee may only withdraw its own entitlement
                  once beneficiary entitlements are covered — deliberately keeping
                  the account &quot;topped up&quot; is part of the trustee&apos;s
                  duty. See{" "}
                  <Link href="/topics/open-project-trust-account-qld">
                    opening a project trust account
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/trust-account-bank-requirements">
                    trust account bank requirements
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2>Trust ledgers and record keeping</h2>
                <p>
                  The bank account is only half of the system. The trustee must
                  also keep <strong>trust records</strong>, including a trust
                  ledger with a separate account for each beneficiary showing every
                  deposit and withdrawal affecting that beneficiary, records of
                  payment claims and payments, copies of notices, and supporting
                  documents for every transaction. Records must be kept for the
                  statutory retention period after the trust ends and produced to
                  the QBCC on request.
                </p>
                <p>
                  In practice this means every dollar in the account must be
                  traceable to a project, a contract, a claim and a beneficiary at
                  all times. See{" "}
                  <Link href="/topics/trust-account-record-keeping-qbcc">
                    QBCC record-keeping rules
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/document-trust-transactions">
                    documenting trust transactions
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2>Notices</h2>
                <p>
                  The framework relies on transparency, so trustees must give
                  written notices at defined moments: to the QBCC when a trust
                  account is opened, changed or closed; to the principal about the
                  account; and to each subcontractor beneficiary when they become
                  (and cease to be) a beneficiary, including the account details.
                  Beneficiaries can also request information about the trust.
                  Missing or late notices are themselves offences, independent of
                  whether any money was mishandled.
                </p>
              </section>

              <section>
                <h2>Reconciliation</h2>
                <p>
                  Trustees must reconcile each trust account at least{" "}
                  <strong>monthly</strong> (within the statutory window after the
                  end of the month), comparing the bank balance against the trust
                  ledger and investigating and correcting any discrepancy. The
                  reconciliation itself is a trust record and must be kept.
                  Reconciliation failures are one of the most common findings when
                  the QBCC reviews trust accounts. See{" "}
                  <Link href="/topics/reconcile-trust-account">
                    how to reconcile a trust account
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/trust-reconciliation-example">
                    a worked reconciliation example
                  </Link>
                  . If you are evaluating tooling for this,{" "}
                  <Link href="/project-trust-account-reconciliation-software">
                    project trust account reconciliation software
                  </Link>{" "}
                  explains what good looks like.
                </p>
              </section>

              <section>
                <h2>Retention trust accounts</h2>
                <p>
                  Cash retentions withheld under eligible contracts must be held in
                  a <strong>retention trust account</strong> — a second kind of
                  statutory trust. Unlike project trusts, one retention trust
                  account can hold retentions across multiple contracts, and the
                  trustee must complete approved retention trust training. Amounts
                  move out of the retention trust only when they are properly
                  released to the subcontractor or properly claimed by the
                  trustee.
                </p>
                <p>
                  The distinction matters day to day: a progress payment with
                  retention withheld touches both trusts. Read{" "}
                  <Link href="/topics/project-vs-retention-trust">
                    project trust vs retention trust
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/retention-account-explained">
                    retention accounts explained
                  </Link>
                  , or see{" "}
                  <Link href="/retention-trust-account-software">
                    retention trust account software
                  </Link>{" "}
                  for the administration side.
                </p>
              </section>

              <section>
                <h2>Audits and reviews after BIFOLA 2024</h2>
                <p>
                  Originally the framework contemplated regular account reviews by
                  auditors. The{" "}
                  <em>
                    Building Industry Fairness (Security of Payment) and Other
                    Legislation Amendment Act 2024
                  </em>{" "}
                  (BIFOLA) simplified this: the standing annual review requirement
                  was removed, and trust account audits/reviews now occur{" "}
                  <strong>when directed by the QBCC</strong>. The QBCC retains
                  broad powers to require an independent review of a trust account
                  at any time.
                </p>
                <p>
                  Practically, this raises rather than lowers the bar on records:
                  there is no scheduled annual clean-up, so a trustee must be able
                  to produce complete, reconciled, audit-ready records on demand.
                  See{" "}
                  <Link href="/topics/project-trust-audit-requirements">
                    project trust audit requirements
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/trust-audit-process-qld">
                    the QBCC trust audit process
                  </Link>
                  , or{" "}
                  <Link href="/audit-ready-project-trust-account-software">
                    audit-ready project trust account software
                  </Link>{" "}
                  for how to keep evidence continuously ready.
                </p>
              </section>

              <section>
                <h2>Penalties</h2>
                <p>
                  The BIF Act attaches significant penalties to trust breaches.
                  Failing to open a required trust account, paying trust money to
                  the wrong account, failing to keep records, missing notices and
                  failing to reconcile are all offences carrying fines. The most
                  serious offences — dishonestly withdrawing or misappropriating
                  trust money — carry maximum penalties that include{" "}
                  <strong>imprisonment</strong>, and liability can extend
                  personally to directors and influential persons. The QBCC can
                  also take licensing action against the contractor.
                </p>
                <p>
                  See{" "}
                  <Link href="/topics/qbcc-trust-account-penalties">
                    QBCC trust account penalties
                  </Link>{" "}
                  and{" "}
                  <Link href="/topics/enforcement-penalties-examples">
                    real enforcement examples
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2>Administering a project trust account in practice</h2>
                <p>
                  Most trustees find that the hard part of a project trust account
                  is not the banking — it is proving, month after month, that
                  every claim, payment, notice, ledger entry and reconciliation
                  lines up. That is the problem purpose-built software solves.
                  PayTrade is audit-first, Xero-connected{" "}
                  <Link href="/project-trust-account-software">
                    project trust account software
                  </Link>{" "}
                  for Queensland construction businesses, and it is listed on the
                  Queensland Government&apos;s assessed trust account software
                  solutions page. It links every trust record — project, contract,
                  claim, beneficiary, bank account, ledger, notice,{" "}
                  <Link href="/project-trust-account-reconciliation-software">
                    reconciliation
                  </Link>{" "}
                  and{" "}
                  <Link href="/audit-ready-project-trust-account-software">
                    audit evidence
                  </Link>{" "}
                  — and covers{" "}
                  <Link href="/retention-trust-account-software">
                    retention trust accounts
                  </Link>{" "}
                  in the same system.
                </p>
              </section>

              <FAQAccordion
                faqs={faqs}
                heading="Project trust account FAQs"
              />

              <FinalCta />

              <section>
                <h2>Keep reading</h2>
                <ul>
                  <li>
                    <Link href="/project-trust-account-software">
                      Project trust account software
                    </Link>
                  </li>
                  <li>
                    <Link href="/retention-trust-account-software">
                      Retention trust account software
                    </Link>
                  </li>
                  <li>
                    <Link href="/project-trust-account-reconciliation-software">
                      Project trust account reconciliation software
                    </Link>
                  </li>
                  <li>
                    <Link href="/audit-ready-project-trust-account-software">
                      Audit-ready project trust account software
                    </Link>
                  </li>
                  <li>
                    <Link href="/topics/setup-project-trust-account">
                      Setting up a project trust account
                    </Link>
                  </li>
                  <li>
                    <Link href="/topics/project-trust-compliance-checklist">
                      Project trust compliance checklist
                    </Link>
                  </li>
                  <li>
                    <Link href="/topics/close-project-trust-account">
                      Closing a project trust account
                    </Link>
                  </li>
                  <li>
                    <Link href="/compare/project-trust-account-software">
                      Compare project trust account software
                    </Link>
                  </li>
                </ul>
              </section>

              <KeywordAlignedContent keyword="project trust account" />

              <SourceNoteBox sources={sources} />
              <DisclaimerBox />
            </div>
          </main>
          <GuestFooter />
        </div>
      </div>
    </>
  );
}
