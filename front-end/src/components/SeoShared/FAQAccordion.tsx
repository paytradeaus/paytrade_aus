import React from "react";
import SeoJsonLd from "./SeoJsonLd";
import { buildFaqPageSchema, type FaqItem } from "./schema";

export default function FAQAccordion({
  faqs,
  heading = "Frequently asked questions",
  includeSchema = true,
}: {
  faqs: FaqItem[];
  heading?: string;
  includeSchema?: boolean;
}) {
  if (!faqs?.length) return null;
  return (
    <section>
      {includeSchema && <SeoJsonLd data={buildFaqPageSchema(faqs)} />}
      <h2>{heading}</h2>
      {faqs.map((faq, index) => (
        <details key={index} open={index === 0}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </section>
  );
}
