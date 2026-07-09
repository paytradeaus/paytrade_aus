import React from "react";
import SiteHeader from "@/components/SiteHeader";
import GuestFooter from "@/components/GuestFooter";
import SeoJsonLd from "../SeoJsonLd";

export default function ComparisonPageLayout({
  schemas,
  children,
}: {
  schemas: object[];
  children: React.ReactNode;
}) {
  return (
    <>
      <SeoJsonLd data={schemas} />
      <div className="pt_wrap">
        <div className="pt_page">
          <SiteHeader />
          <main>
            <div
              className="container-fluid"
              style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}
            >
              {children}
            </div>
          </main>
          <GuestFooter />
        </div>
      </div>
    </>
  );
}
