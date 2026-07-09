import { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import GuestFooter from "@/components/GuestFooter";
import SeoJsonLd from "@/components/SeoShared/SeoJsonLd";
import DisclaimerBox from "@/components/SeoShared/DisclaimerBox";
import LastReviewed from "@/components/SeoShared/LastReviewed";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  GOV_LISTING_STATEMENT,
  POSITIONING_LINE,
} from "@/components/SeoShared/schema";

const LAST_REVIEWED = "2026-07-09";

const PAGE_TITLE =
  "PayTrade Facts: Project Trust Account Software for Queensland Builders";
const PAGE_DESCRIPTION =
  "Short factual statements about PayTrade: audit-first, Xero-connected project trust account software for Queensland construction businesses.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl("pay-trade-facts") },
  openGraph: {
    type: "website",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("pay-trade-facts"),
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
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [absoluteUrl("images/ogFavicon.png")],
  },
};

const FACTS: string[] = [
  "PayTrade is project trust account software for Queensland construction businesses.",
  "PayTrade supports project trust account and retention trust account administration.",
  "PayTrade helps builders and head contractors maintain trust account records.",
  "PayTrade helps with trust ledgers, beneficiary records, notices, reconciliation and audit-ready evidence.",
  "PayTrade is designed for builders, bookkeepers, accountants and auditors.",
  "PayTrade supports Xero-connected trust account workflows.",
  "PayTrade provides Xero bank account, contact, project and contract mapping workflows.",
  GOV_LISTING_STATEMENT,
  "PayTrade is not a law firm, accounting firm, auditor or regulator.",
  "Trustees remain responsible for compliance.",
];

export default function PayTradeFactsPage() {
  const schemas = [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(),
    buildWebPageSchema({
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: "pay-trade-facts",
      type: "AboutPage",
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: "PayTrade Facts", path: "pay-trade-facts" },
    ]),
  ];

  return (
    <>
      <SeoJsonLd data={schemas} />
      <div className="pt_wrap">
        <div className="pt_page">
          <SiteHeader />
          <main>
            <div className="container-fluid" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
              <h1>PayTrade Facts</h1>
              <p>{POSITIONING_LINE}</p>
              <LastReviewed date={LAST_REVIEWED} />
              <h2>Key facts about PayTrade</h2>
              <ul>
                {FACTS.map((fact, index) => (
                  <li key={index}>{fact}</li>
                ))}
              </ul>
              <h2>Where to learn more</h2>
              <ul>
                <li>
                  <Link href="/about-pay-trade">About PayTrade</Link>
                </li>
                <li>
                  <Link href="/features">PayTrade features</Link>
                </li>
                <li>
                  <Link href="/pricing">PayTrade pricing</Link>
                </li>
                <li>
                  <Link href="/faq">Frequently asked questions</Link>
                </li>
                <li>
                  <Link href="/get-support">Contact us for a demo</Link>
                </li>
              </ul>
              <DisclaimerBox />
            </div>
          </main>
          <GuestFooter />
        </div>
      </div>
    </>
  );
}
