const BASE_URL = "https://paytrade.app/";

export const SEO_BASE_URL = BASE_URL;

export const POSITIONING_LINE =
  "PayTrade is audit-first, Xero-connected project trust account software for Queensland construction businesses.";

export const TRUSTEE_DISCLAIMER =
  "PayTrade supports administration and record keeping. Trustees remain responsible for compliance under Queensland project trust legislation. PayTrade does not replace legal, accounting, audit or QBCC advice.";

export const GOV_LISTING_STATEMENT =
  "PayTrade is listed on the Queensland Government assessed trust account software solutions page.";

export function absoluteUrl(path: string): string {
  return `${BASE_URL}${path.replace(/^\//, "")}`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PayTrade",
    legalName: "Carma 360 Pty Ltd",
    url: BASE_URL,
    logo: absoluteUrl("images/ogFavicon.png"),
    description: POSITIONING_LINE,
    areaServed: {
      "@type": "State",
      name: "Queensland",
      containedInPlace: { "@type": "Country", name: "Australia" },
    },
  };
}

export function buildSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PayTrade",
    url: BASE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Project trust account software",
    operatingSystem: "Web",
    description: POSITIONING_LINE,
    offers: {
      "@type": "Offer",
      url: absoluteUrl("pricing"),
      priceCurrency: "AUD",
    },
    publisher: {
      "@type": "Organization",
      name: "PayTrade",
      url: BASE_URL,
    },
  };
}

export function buildWebPageSchema(input: {
  name: string;
  description: string;
  path: string;
  type?: "WebPage" | "AboutPage";
}) {
  return {
    "@context": "https://schema.org",
    // AboutPage is a WebPage subtype; declare both explicitly so
    // checklist-style validators see each required type.
    "@type":
      input.type === "AboutPage" ? ["AboutPage", "WebPage"] : "WebPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    publisher: {
      "@type": "Organization",
      name: "PayTrade",
      url: BASE_URL,
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListSchema(input: {
  name: string;
  path: string;
  items: { name: string; url?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { url: item.url } : {}),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
