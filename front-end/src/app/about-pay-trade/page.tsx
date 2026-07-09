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
  "About PayTrade | Project Trust Account Software for Queensland Builders";
const PAGE_DESCRIPTION =
  "PayTrade is audit-first, Xero-connected project trust account software helping Queensland builders, bookkeepers, accountants and auditors administer project trust and retention trust accounts.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl("about-pay-trade") },
  openGraph: {
    type: "website",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("about-pay-trade"),
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

export default function AboutPayTradePage() {
  const schemas = [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(),
    buildWebPageSchema({
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: "about-pay-trade",
      type: "AboutPage",
    }),
    buildBreadcrumbSchema([
      { name: "Home", path: "" },
      { name: "About PayTrade", path: "about-pay-trade" },
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
              <h1>About PayTrade</h1>
              <p>{POSITIONING_LINE}</p>
              <LastReviewed date={LAST_REVIEWED} />

              <h2>What PayTrade does</h2>
              <p>
                PayTrade helps builders, head contractors, bookkeepers,
                accountants and auditors administer project trust accounts and
                retention trust accounts in Queensland. PayTrade links
                projects, contracts, beneficiaries, payment claims, trust bank
                accounts, ledgers, notices and reconciliations into one
                structured record.
              </p>
              <p>
                For project trust accounts, the question is not only whether
                payments were made. The question is whether the trustee can
                prove what happened. PayTrade makes it easier to trace a record
                from project and contract through payment claim, beneficiary,
                bank account, ledger, notice, reconciliation and audit
                evidence.
              </p>

              <h2>Audit-first by design</h2>
              <p>
                PayTrade is built so that every trust movement leaves an
                audit-ready trail. Trust ledgers, beneficiary records, notices
                and reconciliations are kept in a form designed to support
                review by accountants, auditors and the QBCC.
              </p>

              <h2>Xero-connected workflows</h2>
              <p>
                PayTrade supports Xero-connected trust account workflows,
                including Xero bank account mapping, contact mapping, and
                project and contract mapping. PayTrade does not replace Xero;
                it works alongside Xero as a trust-account administration
                layer.
              </p>

              <h2>Queensland Government listing</h2>
              <p>{GOV_LISTING_STATEMENT}</p>

              <h2>Who PayTrade is for</h2>
              <ul>
                <li>Builders and head contractors operating project trusts</li>
                <li>Bookkeepers maintaining trust records for clients</li>
                <li>Accountants advising construction businesses</li>
                <li>Auditors reviewing trust account evidence</li>
              </ul>

              <h2>Learn more</h2>
              <ul>
                <li>
                  <Link href="/pay-trade-facts">PayTrade facts</Link>
                </li>
                <li>
                  <Link href="/features">Features</Link>
                </li>
                <li>
                  <Link href="/pricing">Pricing</Link>
                </li>
                <li>
                  <Link href="/faq">FAQ</Link>
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
