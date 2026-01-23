import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_DEPLOYED_URL ?? "https://paytradeaus.replit.app/";

const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

const defaultImage = {
  url: `${normalizedBaseUrl}images/ogFavicon.png`,
  alt: "Paytrade QBCC Trust Accounting Software for the Australian Construction Industry Logo",
  width: 1200,
  height: 630,
};

const sharedMetadata = {
  metadataBase: new URL(normalizedBaseUrl),
  robots: {
    index: true,
    follow: true,
  },
  icons: [
    {
      rel: "icon",
      url: "/favicon.png",
      media: "(prefers-color-scheme: light)",
    },
    {
      rel: "icon",
      url: "/favicon.png",
      media: "(prefers-color-scheme: dark)",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
      sizes: "180x180",
    },
  ],
  other: {
    "color-scheme": "light dark",
  },
};

const createSocialMetadata = (
  title: string,
  description: string,
  path: string = ""
) => {
  const url = path ? `${normalizedBaseUrl}${path}` : normalizedBaseUrl;

  return {
    openGraph: {
      title,
      description,
      url,
      siteName: "Paytrade",
      images: [defaultImage],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${normalizedBaseUrl}images/ogFavicon.png`],
      creator: "@paytrade",
      site: "@paytrade",
    },
  };
};

export const seoMetadata: Record<string, Metadata> = {
  default: {
    ...sharedMetadata,
    title:
      "QBCC Trust Accounting Software for the Australian Construction Industry | Paytrade",
    description:
      "Make construction project and trust administration and accounting easy with Paytrade's comprehensive platform",
    keywords: [
      "construction trust",
      "project management",
      "trust administration",
      "construction accounting",
      "paytrade",
    ],
    alternates: {
      canonical: normalizedBaseUrl,
    },
    ...createSocialMetadata(
      "QBCC Trust Accounting Software for the Australian Construction Industry | Paytrade",
      "Make construction project and trust administration and accounting easy with Paytrade's comprehensive platform"
    ),
  },

  accountants: {
    ...sharedMetadata,
    title: "Accountants | Paytrade",
    description:
      "Accountants can check and monitor their clients project trust eligibility, manage their project and retention trust accounts, process claims and payments, monitor their compliance, submit regulatory notices, automate trust accounts and reporting and integrate with other apps. See how Pay Trade can help you support your clients.",
    keywords: [
      "accountants",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}accountants` },
    ...createSocialMetadata(
      "Accountants | Paytrade",
      "Accountants can check and monitor their clients project trust eligibility, manage their project and retention trust accounts, process claims and payments, monitor their compliance, submit regulatory notices, automate trust accounts and reporting and integrate with other apps.",
      "accountants"
    ),
  },

  subcontractors: {
    ...sharedMetadata,
    title: "Subcontractors | Paytrade",
    description:
      "Subcontractors can check and monitor projects trust eligibility, manage your project and retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting and integrate with other apps. See how PayTrade can help you.",
    keywords: [
      "subcontractors",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}subcontractors` },
    ...createSocialMetadata(
      "Subcontractors | Paytrade",
      "Subcontractors can check and monitor projects trust eligibility, manage your project and retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting.",
      "subcontractors"
    ),
  },

  principals: {
    ...sharedMetadata,
    title: "Principals & Clients | Paytrade",
    description:
      "Check and monitor projects trust eligibility, manage your retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting and integrate with other apps. See how PayTrade can help you.",
    keywords: [
      "principals",
      "clients",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}principals` },
    ...createSocialMetadata(
      "Principals & Clients | Paytrade",
      "Check and monitor projects trust eligibility, manage your retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting.",
      "principals"
    ),
  },

  headContractors: {
    ...sharedMetadata,
    title: "Head Contractors | Paytrade",
    description:
      "Check and monitor projects trust eligibility, manage your retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting and integrate with other apps. See how PayTrade can help you.",
    keywords: [
      "head contractors",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}headcontractors` },
    ...createSocialMetadata(
      "Head Contractors | Paytrade",
      "Check and monitor projects trust eligibility, manage your retention trust accounts, process claims and payments, monitor your compliance, submit regulatory notices, automate your trust accounts and reporting.",
      "headcontractors"
    ),
  },

  getSupport: {
    ...sharedMetadata,
    title: "Get Support | Paytrade",
    description:
      "With PayTrade you get free online support from our customer support team. When you're looking for answers, start by searching the support guides. If you still have a question, login and raise a support case.",
    keywords: [
      "support",
      "customer support",
      "support guides",
      "support case",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}get-support` },
    ...createSocialMetadata(
      "Get Support | Paytrade",
      "With PayTrade you get free online support from our customer support team. When you're looking for answers, start by searching the support guides.",
      "get-support"
    ),
  },

  features: {
    ...sharedMetadata,
    title: "Features | Paytrade",
    description:
      "Check and monitor projects trust eligibility, manage project and retention trust accounts, process claims and payments, monitor compliance, submit regulatory notices, automate your trust accounts and reporting and integrate with other apps. See how PayTrade can help you.",
    keywords: [
      "features",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}features` },
    ...createSocialMetadata(
      "Features | Paytrade",
      "Check and monitor projects trust eligibility, manage project and retention trust accounts, process claims and payments, monitor compliance, submit regulatory notices, automate your trust accounts and reporting.",
      "features"
    ),
  },

  faq: {
    ...sharedMetadata,
    title: "FAQs | Paytrade",
    description:
      "Find answers to common questions about PayTrade and construction trust management",
    keywords: [
      "faqs",
      "common questions",
      "trust management",
      "construction FAQs",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}faq` },
    ...createSocialMetadata(
      "FAQs | Paytrade",
      "Find answers to common questions about PayTrade and construction trust management",
      "faq"
    ),
  },

  community: {
    ...sharedMetadata,
    title: "Community | Paytrade",
    description:
      "Learn how to use PayTrade and get help from our community of construction industry professionals",
    keywords: [
      "community",
      "help",
      "construction professionals",
      "trust management community",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}community` },
    ...createSocialMetadata(
      "Community | Paytrade",
      "Learn how to use PayTrade and get help from our community of construction industry professionals",
      "community"
    ),
  },

  bookkeepers: {
    ...sharedMetadata,
    title: "Bookkeepers | Paytrade",
    description:
      "Bookkeepers can check and monitor their clients project trust eligibility, manage their project and retention trust accounts, process claims and payments, monitor their compliance, submit regulatory notices, automate trust accounts and reporting and integrate with other apps. See how Pay Trade can help you support your clients.",
    keywords: [
      "bookkeepers",
      "project trust eligibility",
      "trust accounts",
      "claims and payments",
      "compliance",
      "regulatory notices",
      "trust accounts automation",
      "reporting",
      "integration",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}bookkeepers` },
    ...createSocialMetadata(
      "Bookkeepers | Paytrade",
      "Bookkeepers can check and monitor their clients project trust eligibility, manage their project and retention trust accounts, process claims and payments, monitor their compliance, submit regulatory notices, automate trust accounts and reporting.",
      "bookkeepers"
    ),
  },

  auditors: {
    ...sharedMetadata,
    title: "Auditors | Paytrade",
    description:
      "Auditors can gather the required audit documentation and submit audits to the QBCC easily. See how Pay Trade can help you support your clients.",
    keywords: [
      "auditors",
      "audit documentation",
      "QBCC",
      "construction audits",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}auditors` },
    ...createSocialMetadata(
      "Auditors | Paytrade",
      "Auditors can gather the required audit documentation and submit audits to the QBCC easily. See how Pay Trade can help you support your clients.",
      "auditors"
    ),
  },

  legalPractitioners: {
    ...sharedMetadata,
    title: "Legal Practitioners | Paytrade",
    description:
      "Legal practitioners can ensure their clients remain compliant with the QBCC regulatory requirements and the evolving construction payment laws by using the PayTrade system with the automatic compliance monitoring system",
    keywords: [
      "legal practitioners",
      "QBCC compliance",
      "construction payment laws",
      "compliance monitoring",
      "legal construction advice",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}legal-practitioners` },
    ...createSocialMetadata(
      "Legal Practitioners | Paytrade",
      "Legal practitioners can ensure their clients remain compliant with the QBCC regulatory requirements and the evolving construction payment laws by using the PayTrade system.",
      "legal-practitioners"
    ),
  },

  howToGuides: {
    ...sharedMetadata,
    title: "How to Guides | Paytrade",
    description:
      "Learn how to use PayTrade to its full potential with our step-by-step construction trust management guides",
    keywords: [
      "how to guides",
      "tutorials",
      "construction trust management",
      "step-by-step guides",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}how-to-guides` },
    ...createSocialMetadata(
      "How to Guides | Paytrade",
      "Learn how to use PayTrade to its full potential with our step-by-step construction trust management guides",
      "how-to-guides"
    ),
  },

  resources: {
    ...sharedMetadata,
    title: "Construction Industry Resources & Updates | Paytrade",
    description:
      "Stay informed with the latest construction industry news, trust management updates, and expert insights from Paytrade's resource center",
    keywords: [
      "construction resources",
      "industry updates",
      "trust management guides",
      "construction news",
      "paytrade articles",
      "construction industry insights",
    ],
    alternates: { canonical: `${normalizedBaseUrl}articles` },
    ...createSocialMetadata(
      "Construction Industry Resources & Updates | Paytrade",
      "Stay informed with the latest construction industry news, trust management updates, and expert insights from Paytrade's resource center",
      "articles"
    ),
  },

  blog: {
    ...sharedMetadata,
    title: "Blog | Paytrade",
    description:
      "Read about the latest news, trends, and updates from PayTrade and the construction trust management industry",
    keywords: [
      "blog",
      "news",
      "updates",
      "construction industry trends",
      "trust management insights",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}blog` },
    ...createSocialMetadata(
      "Blog | Paytrade",
      "Read about the latest news, trends, and updates from PayTrade and the construction trust management industry",
      "blog"
    ),
  },

  pricing: {
    ...sharedMetadata,
    title: "Pricing | Paytrade",
    description:
      "Compare Paytrade pricing plans. Choose from Free, Premium, or Platinum options with monthly and yearly billing cycles.",
    keywords: [
      "pricing",
      "plans",
      "project trust compliance",
      "subscription options",
      "construction software pricing",
      "paytrade",
    ],
    alternates: { canonical: `${normalizedBaseUrl}pricing` },
    ...createSocialMetadata(
      "Pricing | Paytrade",
      "All pricing plans cover the essentials to remain project trust compliant. Find the right Paytrade plan for your construction business needs.",
      "pricing"
    ),
  },
};

export default seoMetadata;
