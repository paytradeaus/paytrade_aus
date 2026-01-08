"use client";
import { Metadata } from "next";
import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";
import { JSON_LD } from "@/utils/JSON-LD";

export const metadata: Metadata = seoMetadata.subcontractors;
const JSON_LDData = JSON_LD.subcontractors;

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LDData),
        }}
      />
      <Home screen={"SUBCONTRACTOR"} />
    </>
  );
}
