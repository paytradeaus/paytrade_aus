import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
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
import AnalyticsWrapper from "@/components/Analytics/AnalyticsWrapper";
import MultiTabManager from "@/components/MultiTabManager";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import seoMetadata from "@/utils/seoMetadata";
import NextTopLoader from "nextjs-toploader";

const outfit = Outfit({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: "normal",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = seoMetadata.default;

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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://consentcdn.cookiebot.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://consentcdn.cookiebot.com" />
      </head>

      <body className={outfit.className} suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener("error",function(e){var s=e.filename||"";if(!e.error||s.indexOf("cookiebot")>-1||s.indexOf("googletagmanager")>-1||s.indexOf("stripe")>-1||s.indexOf("gtag")>-1||s.indexOf("consent")>-1){e.preventDefault();e.stopImmediatePropagation();return false;}});window.addEventListener("unhandledrejection",function(e){if(!e.reason||!(e.reason instanceof Error)){e.preventDefault();e.stopImmediatePropagation();return false;}});})();`,
          }}
        />
        <NextTopLoader
          color="#dc3545"
          height={3}
          showSpinner={false}
          speed={300}
          shadow="0 0 10px #dc3545, 0 0 5px #dc3545"
        />
        <AnalyticsWrapper
          gtmId={process.env.NEXT_PUBLIC_GTM_ID || ""}
          gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""}
          cookiebotId="48b179ab-203f-47bc-b6b8-f5ea4896aeaa"
        />
        <ReduxProvider>
          <LoaderProvider>
            <GlobalErrorHandler />
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
