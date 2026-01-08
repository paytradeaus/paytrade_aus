import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";

import "../../public/css/pico.min.css";
import "../styles/paytrade.css";
import "../styles/custom.css";
import "../styles/general.css";
import "../styles/reusableClasses.css";
import "../../public/icon/fontawesome.min.css";
import "../../public/icon/light.min.css";
import "./globals.css";

import { ReduxProvider } from "@/redux/provider";
import { ToastifyContainer } from "@/components/Toaster";
import { LoaderProvider } from "@/context/useLoader";
import GoogleAnalytics from "@/components/GoogleAnalytics/GoogleAnalytics";
import GoogleTagManager from "@/components/GoogleTagManager/GoogleTagManager";
import MultiTabManager from "@/components/MultiTabManager";
import seoMetadata from "@/utils/seoMetadata";

const outfit = Outfit({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: "normal",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = seoMetadata.default;

// Force dynamic rendering for all pages to avoid useContext errors during static generation
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.9,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link
          rel="preconnect"
          href="https://consentcdn.cookiebot.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://consentcdn.cookiebot.com" />

        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="48b179ab-203f-47bc-b6b8-f5ea4896aeaa"
          data-blockingmode="auto"
          type="text/javascript"
          strategy="lazyOnload"
        />
        <Script
          data-cookieconsent="ignore"
          id="google-consent"
          strategy="lazyOnload"
        >
          {`
            window.dataLayer = window.dataLayer || [];

            function gtag() {
              dataLayer.push(arguments);
            }

            gtag("consent", "default", {
              ad_personalization: "denied",
              ad_storage: "denied",
              analytics_storage: "denied",
              functionality_storage: "denied",
              personalization_storage: "denied",
              security_storage: "granted",
              wait_for_update: 500,
            });
            gtag("set", "ads_data_redaction", true);
            gtag("set", "url_passthrough", false);
          `}
        </Script>
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ""} />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
          `}
        </Script>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className={outfit.className}>
        <GoogleAnalytics />
        <ReduxProvider>
          <LoaderProvider>
            <Suspense>
              <ToastifyContainer />
              {children}
              <MultiTabManager />
            </Suspense>
          </LoaderProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
