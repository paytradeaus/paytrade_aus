import { Metadata } from "next";
import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";
import { fetchFaqList } from "@/modules/general/FAQS/Faq.functions";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = seoMetadata.faq;

export default async function Page() {
  const data = await fetchFaqList({
    category: null,
    keyword: "",
    page: null,
    perPage: null,
    status: null,
  });
  const JSON_LDData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: metadata.title,
    url: metadata.alternates?.canonical,
    description: metadata.description,
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LDData),
        }}
      />
      <Home screen={"FAQS"} />
    </>
  );
}
