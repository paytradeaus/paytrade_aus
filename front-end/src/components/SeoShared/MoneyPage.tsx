import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GuestFooter from "@/components/GuestFooter";
import SeoJsonLd from "./SeoJsonLd";
import DisclaimerBox from "./DisclaimerBox";
import LastReviewed from "./LastReviewed";
import FAQAccordion from "./FAQAccordion";
import DemoCTA from "./DemoCTA";
import PlaceholderImage from "./PlaceholderImage";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  type FaqItem,
} from "./schema";

export interface MoneyPageSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  placeholders?: { label: string; description?: string }[];
  links?: { href: string; label: string }[];
}

export interface MoneyPageConfig {
  path: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  breadcrumbName: string;
  intro: string[];
  sections: MoneyPageSection[];
  faqs: FaqItem[];
  faqHeading?: string;
  relatedLinks: { href: string; label: string }[];
  lastReviewed: string;
}

export function buildMoneyPageMetadata(config: MoneyPageConfig): Metadata {
  const url = absoluteUrl(config.path);
  return {
    title: config.title,
    description: config.description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: config.title,
      description: config.description,
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
      title: config.title,
      description: config.description,
      images: [absoluteUrl("images/ogFavicon.png")],
    },
  };
}

export default function MoneyPage({ config }: { config: MoneyPageConfig }) {
  const schemas = [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(),
    buildWebPageSchema({
      name: config.title,
      description: config.description,
      path: config.path,
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: config.breadcrumbName, path: config.path },
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
              <h1>{config.h1}</h1>
              {config.intro.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <LastReviewed date={config.lastReviewed} />

              {config.sections.map((section, index) => (
                <section key={index}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs?.map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}
                  {section.list && (
                    <ul>
                      {section.list.map((item, lIndex) => (
                        <li key={lIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.placeholders?.map((placeholder, phIndex) => (
                    <PlaceholderImage
                      key={phIndex}
                      label={placeholder.label}
                      description={placeholder.description}
                    />
                  ))}
                  {section.links && (
                    <ul>
                      {section.links.map((link, lkIndex) => (
                        <li key={lkIndex}>
                          <Link href={link.href}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              <FAQAccordion faqs={config.faqs} heading={config.faqHeading} />

              <DemoCTA />

              <section>
                <h2>Related trust account software pages</h2>
                <ul>
                  {config.relatedLinks.map((link, index) => (
                    <li key={index}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>

              <DisclaimerBox />
            </div>
          </main>
          <GuestFooter />
        </div>
      </div>
    </>
  );
}
