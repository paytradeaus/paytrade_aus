import React from "react";
import { Metadata } from "next";
import ComparisonPageLayout from "./ComparisonPageLayout";
import CompetitorHero from "./CompetitorHero";
import CompetitorStrengthsSection from "./CompetitorStrengthsSection";
import WhyPayTradeSection from "./WhyPayTradeSection";
import FitDecisionSection from "./FitDecisionSection";
import BuyerQuestionsSection from "./BuyerQuestionsSection";
import EvidenceProofSection from "./EvidenceProofSection";
import RelatedComparisonLinks from "./RelatedComparisonLinks";
import FAQAccordion from "../FAQAccordion";
import FinalCta from "@/components/HomeScreen/sections/FinalCta";
import DisclaimerBox from "../DisclaimerBox";
import SourceNoteBox from "../SourceNoteBox";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  buildItemListSchema,
} from "../schema";
import {
  COMPARISON_HUB_PATH,
  COMPARISON_SOURCE_NOTES,
  type Competitor,
  type CompetitorPageCopy,
} from "./comparisonData";

export type CompetitorPageVariant = "vs" | "alternative";

export function buildCompetitorPageMetadata(
  competitor: Competitor,
  variant: CompetitorPageVariant
): Metadata {
  const copy = getCopy(competitor, variant);
  const path = getPath(competitor, variant);
  const url = absoluteUrl(path);
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: copy.title,
      description: copy.description,
      url,
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
      title: copy.title,
      description: copy.description,
      images: [absoluteUrl("images/ogFavicon.png")],
    },
  };
}

function getCopy(
  competitor: Competitor,
  variant: CompetitorPageVariant
): CompetitorPageCopy {
  return variant === "vs" ? competitor.vs : competitor.alternative;
}

function getPath(
  competitor: Competitor,
  variant: CompetitorPageVariant
): string {
  return variant === "vs" ? competitor.vsPath : competitor.alternativePath;
}

export default function CompetitorPage({
  competitor,
  variant,
  lastReviewed,
}: {
  competitor: Competitor;
  variant: CompetitorPageVariant;
  lastReviewed: string;
}) {
  const copy = getCopy(competitor, variant);
  const path = getPath(competitor, variant);

  const schemas = [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(),
    buildWebPageSchema({
      name: copy.title,
      description: copy.description,
      path,
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: "Compare project trust account software", path: COMPARISON_HUB_PATH },
      { name: copy.breadcrumbName, path },
    ]),
    buildItemListSchema({
      name: copy.title,
      path,
      items: [
        { name: "PayTrade", url: absoluteUrl("") },
        { name: competitor.name },
      ],
    }),
  ];

  return (
    <ComparisonPageLayout schemas={schemas}>
      <CompetitorHero
        h1={copy.h1}
        paragraphs={copy.hero}
        lastReviewed={lastReviewed}
        ctas={[
          { href: "/get-support", label: "Book a demo" },
          {
            href: `/${COMPARISON_HUB_PATH}`,
            label: "See the full comparison",
            outline: true,
          },
        ]}
      />

      <section>
        <h2>{copy.quickVerdictHeading}</h2>
        {copy.quickVerdict.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <CompetitorStrengthsSection
        heading={copy.strengthsHeading}
        paragraphs={copy.strengthsIntro}
        points={copy.strengths}
      />

      <WhyPayTradeSection
        paragraphs={copy.whyPayTradeIntro}
        points={copy.whyPayTrade}
      />

      {copy.extraSections?.map((section, index) => (
        <section key={index}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={pIndex}>{paragraph}</p>
          ))}
        </section>
      ))}

      <FitDecisionSection intro={copy.fitIntro} decisions={copy.fitDecisions} />

      <BuyerQuestionsSection questions={copy.demoQuestions} />

      <EvidenceProofSection />

      <FAQAccordion faqs={copy.faqs} />

      <FinalCta />

      <RelatedComparisonLinks currentPath={path} />

      <SourceNoteBox sources={COMPARISON_SOURCE_NOTES} />
      <DisclaimerBox />
    </ComparisonPageLayout>
  );
}
