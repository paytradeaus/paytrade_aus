import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeoKeywordBySlug } from "@/modules/general/SeoKeywords/seo-keywords.functions";
import SeoLandingPage from "@/modules/general/SeoLandingPage";

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
  const keywordData = await getSeoKeywordBySlug(params.slug);

  if (!keywordData) {
    notFound();
  }

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
      <SeoLandingPage initialData={keywordData} />
    </>
  );
}
