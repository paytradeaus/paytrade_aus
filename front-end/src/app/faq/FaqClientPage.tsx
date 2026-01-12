"use client";

import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";
import { useEffect, useState } from "react";
import { fetchFaqList } from "@/modules/general/FAQS/Faq.functions";

export default function FaqClientPage() {
  const [jsonLd, setJsonLd] = useState<object | null>(null);

  useEffect(() => {
    async function loadFaqData() {
      try {
        const data = await fetchFaqList({
          category: null,
          keyword: "",
          page: null,
          perPage: null,
          status: "Active",
        });
        
        const JSON_LDData = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: seoMetadata.faq.title,
          url: seoMetadata.faq.alternates?.canonical,
          description: seoMetadata.faq.description,
          mainEntity:
            data?.FAQs?.map((faq: { question: any; answer: any }) => ({
              "@type": "Question",
              name: faq?.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq?.answer,
              },
            })) || [],
        };
        setJsonLd(JSON_LDData);
      } catch (error) {
        console.error("Error loading FAQ data for JSON-LD:", error);
      }
    }
    loadFaqData();
  }, []);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      )}
      <Home screen={"FAQS"} />
    </>
  );
}
