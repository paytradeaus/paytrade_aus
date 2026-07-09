import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getSeoKeywordBySlug,
  getSeoKeywordPageData,
  getActiveSeoKeywords,
} from "@/modules/general/SeoKeywords/seo-keywords.functions";
import SeoLandingPage from "@/modules/general/SeoLandingPage";
import SiteHeader from "@/components/SiteHeader";
import GuestFooter from "@/components/GuestFooter";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_DEPLOYED_URL ?? "https://paytrade.app/";
const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const keywordData = await getSeoKeywordBySlug(params.slug);

  if (!keywordData) {
    return {
      title: "Page Not Found | Paytrade",
      robots: { index: false, follow: false },
    };
  }

  // Redirected pages should not render under their own slug. With the root
  // loading boundary, Next may deliver this as a streamed in-body redirect
  // (meta refresh + NEXT_REDIRECT) rather than a 3xx; browsers follow both.
  if (keywordData.redirect_url) {
    redirect(keywordData.redirect_url);
  }

  return {
    title: keywordData.page_title,
    description: keywordData.meta_description,
    keywords: keywordData.tags || [keywordData.keyword],
    icons: { icon: "/favicon.png" },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${normalizedBaseUrl}topics/${keywordData.slug}`,
    },
    openGraph: {
      type: "website",
      title: keywordData.page_title,
      description: keywordData.meta_description,
      url: `${normalizedBaseUrl}topics/${keywordData.slug}`,
      siteName: "Paytrade",
      images: [
        {
          url: `${normalizedBaseUrl}images/ogFavicon.png`,
          alt: "Paytrade",
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: keywordData.page_title,
      description: keywordData.meta_description,
      images: [`${normalizedBaseUrl}images/ogFavicon.png`],
    },
  };
}

export default async function Page({
  params,
}: {
  params: { slug: string };
}) {
  const [pageData, activeKeywords] = await Promise.all([
    getSeoKeywordPageData(params.slug),
    getActiveSeoKeywords(),
  ]);

  const keywordData = pageData?.data;

  if (!keywordData) {
    notFound();
  }

  // Optional admin-configured redirect: when set, this slug forwards to the
  // specified URL instead of rendering its own landing page.
  if (keywordData.redirect_url) {
    redirect(keywordData.redirect_url);
  }

  const community = pageData?.community ?? [];
  const guides = pageData?.guides ?? [];
  const allKeywords = activeKeywords?.seoKeywords ?? [];

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: keywordData.page_title,
    description: keywordData.meta_description,
    url: `${normalizedBaseUrl}topics/${keywordData.slug}`,
    publisher: {
      "@type": "Organization",
      name: "PayTrade",
      url: normalizedBaseUrl,
    },
    about: {
      "@type": "Thing",
      name: keywordData.keyword,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData),
        }}
      />
      <div className="pt_wrap">
        <div className="pt_page">
          <SiteHeader />
          <SeoLandingPage
            initialData={keywordData}
            community={community}
            guides={guides}
            allKeywords={allKeywords}
          />
          <GuestFooter />
        </div>
      </div>
    </>
  );
}
