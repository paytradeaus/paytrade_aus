import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import ComparisonPageLayout from "@/components/SeoShared/Comparison/ComparisonPageLayout";
import CompetitorHero from "@/components/SeoShared/Comparison/CompetitorHero";
import CompetitorSummaryCards from "@/components/SeoShared/Comparison/CompetitorSummaryCards";
import ComparisonTable from "@/components/SeoShared/Comparison/ComparisonTable";
import BuyerQuestionsSection from "@/components/SeoShared/Comparison/BuyerQuestionsSection";
import EvidenceProofSection from "@/components/SeoShared/Comparison/EvidenceProofSection";
import RelatedComparisonLinks from "@/components/SeoShared/Comparison/RelatedComparisonLinks";
import FAQAccordion from "@/components/SeoShared/FAQAccordion";
import FinalCta from "@/components/HomeScreen/sections/FinalCta";
import DisclaimerBox from "@/components/SeoShared/DisclaimerBox";
import SourceNoteBox from "@/components/SeoShared/SourceNoteBox";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  buildItemListSchema,
} from "@/components/SeoShared/schema";
import {
  COMPARISON_HUB_PATH,
  COMPARISON_SOURCE_NOTES,
  COMPETITORS,
  HUB_POSITIONING_ROWS,
  HUB_DIFFERENTIATOR_CARDS,
  MATRIX_COLUMNS,
  MATRIX_ROWS,
  HUB_BUYER_QUESTIONS,
  HUB_FAQS,
} from "@/components/SeoShared/Comparison/comparisonData";

const LAST_REVIEWED = "2026-07-09";

const TITLE = "Best Project Trust Account Software Compared | PayTrade";
const DESCRIPTION =
  "Compare PayTrade, BuildTrust, Cabenet, E2EFi, Cheops, Premier and Bizprac for Queensland project trust accounts, retention trusts, Xero workflows, ledgers, reconciliation and audit-ready records.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl(COMPARISON_HUB_PATH) },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(COMPARISON_HUB_PATH),
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

export default function ComparisonHubPage() {
  const schemas = [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(),
    buildWebPageSchema({
      name: TITLE,
      description: DESCRIPTION,
      path: COMPARISON_HUB_PATH,
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Compare project trust account software", path: COMPARISON_HUB_PATH },
    ]),
    buildItemListSchema({
      name: "Project trust account software compared",
      path: COMPARISON_HUB_PATH,
      items: [
        { name: "PayTrade", url: absoluteUrl("") },
        ...HUB_POSITIONING_ROWS.slice(1).map((row) => ({ name: row.software })),
      ],
    }),
  ];

  return (
    <ComparisonPageLayout schemas={schemas}>
      <CompetitorHero
        h1="Best Project Trust Account Software for Queensland Builders"
        paragraphs={[
          "Choosing project trust account software is not just an accounting decision. Queensland builders and head contractors need records that connect the contract, project, beneficiaries, payment claims, trust bank account, trust ledger, notices, reconciliation and audit evidence.",
          "PayTrade is built for teams that want an audit-first, Xero-connected way to administer project trust accounts and retention trust accounts without relying on spreadsheets or generic accounting workflows.",
        ]}
        lastReviewed={LAST_REVIEWED}
        ctas={[
          { href: "/get-support", label: "Book a demo" },
          { href: "/project-trust-account-software", label: "Compare PayTrade", outline: true },
          { href: "/xero-project-trust-account-software", label: "See Xero integration", outline: true },
        ]}
      />

      <section>
        <h2>How the project trust account software options compare</h2>
        <p>
          Queensland&apos;s project trust account framework creates serious
          record-keeping obligations for trustees. A project trust account is
          not just another bank account. The software must help the trustee
          keep reliable records of who the money belongs to, what project it
          relates to, which claims and payments it supports, what notices have
          been issued, and how reconciliations are evidenced.
        </p>
        <p>
          Several software options exist, including PayTrade, BuildTrust,
          Cabenet, E2EFi, Premier Construction Software, Cheops/CSSP and
          Bizprac. Some are specialist trust tools. Some are broader
          construction ERP systems with trust-account capability. The right
          choice depends on whether the builder wants a full ERP, a standalone
          trust system, or a Xero-connected trust administration layer.
        </p>
      </section>

      <ComparisonTable
        heading="Positioning at a glance"
        caption="Based on public information available at the time of writing. Feature availability may change."
        columns={[
          "Software",
          "Best suited to",
          "Publicly claimed strengths",
          "Where PayTrade may be stronger",
          "Questions to ask on demo",
        ]}
        rows={HUB_POSITIONING_ROWS.map((row) => [
          row.software,
          row.bestSuitedTo,
          row.publiclyClaimedStrengths,
          row.wherePayTradeMayBeStronger,
          row.questionsToAsk,
        ])}
      />

      <CompetitorSummaryCards
        heading="Why PayTrade may be the better project trust account software choice"
        intro={[
          "PayTrade is not trying to be a generic accounting package or a full construction ERP. It is designed around the trust administration problem itself: project trust accounts, retention trusts, beneficiaries, claims, payments, notices, ledgers, reconciliation and audit evidence.",
          "That matters because the practical risk for builders is rarely just \u201ccan we make a payment?\u201d The real risk is whether the business can later prove what happened, why it happened, who the money belonged to, which claim it related to, whether the record was complete, and whether the reconciliation and notices line up.",
        ]}
        cards={HUB_DIFFERENTIATOR_CARDS}
      />

      <ComparisonTable
        heading="Feature comparison checklist"
        caption="Values reflect public information at the time of writing: Yes, Publicly claimed, Ask provider, ERP/module dependent, PayTrade focus, or Not clear from public information. No competitor is marked \u201cNo\u201d. Ask each provider to demonstrate features on a demo."
        columns={MATRIX_COLUMNS}
        rows={MATRIX_ROWS.map((row) => [...row])}
        notes={[
          "Feature availability may change. This comparison is based on public information and PayTrade's own product documentation.",
        ]}
      />

      <BuyerQuestionsSection
        heading="Questions every buyer should ask before choosing project trust account software"
        questions={HUB_BUYER_QUESTIONS}
      />

      <section>
        <h2>The short answer</h2>
        <p>
          If you want a full construction ERP, compare Cheops, Premier and
          Bizprac. If you want a specialist trust accounting system, compare
          PayTrade, BuildTrust, Cabenet and E2EFi. If your business uses Xero
          and your main concern is audit-ready project trust and retention
          trust records, PayTrade should be on the shortlist.
        </p>
        <p>
          Start with the{" "}
          <Link href="/project-trust-account-software">
            project trust account software
          </Link>{" "}
          overview, the{" "}
          <Link href="/retention-trust-account-software">
            retention trust account software
          </Link>{" "}
          page and <Link href="/pricing">PayTrade pricing</Link>, or browse the{" "}
          <Link href="/faq">FAQ</Link>.
        </p>
      </section>

      <EvidenceProofSection />

      <FAQAccordion faqs={HUB_FAQS} />

      <FinalCta />

      <section>
        <h2>Individual comparisons</h2>
        <ul>
          {COMPETITORS.flatMap((competitor) => [
            <li key={`${competitor.slug}-vs`}>
              <Link href={`/${competitor.vsPath}`}>
                PayTrade vs {competitor.name}
              </Link>
            </li>,
            <li key={`${competitor.slug}-alt`}>
              <Link href={`/${competitor.alternativePath}`}>
                {competitor.name} alternative
              </Link>
            </li>,
          ])}
        </ul>
      </section>

      <RelatedComparisonLinks
        currentPath={COMPARISON_HUB_PATH}
        heading="More trust account software pages"
      />

      <SourceNoteBox sources={COMPARISON_SOURCE_NOTES} />
      <DisclaimerBox />
    </ComparisonPageLayout>
  );
}
