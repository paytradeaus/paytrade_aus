import React from "react";
import TitleSection from "@/components/TitleSection";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  fullPage?: boolean;
}

type AccordionProps = {
  faqs: FAQ[];
  loading: boolean;
  fullPage?: boolean;
  children?: React.ReactNode; // Make children optional
};

function Accordion({ faqs, loading, children, fullPage }: AccordionProps) {
  // Apply the fullPage class only when fullPage is true
  const className = `pt_box pt_faqs ${fullPage ? "pt_faqs_fullpage" : ""}`;
  return (
    <div className={className}>
      {loading ? (
        <p>Loading FAQs...</p>
      ) : faqs.length > 0 ? (
        faqs.map((faq) => (
          <details key={faq.id}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))
      ) : (
        // If no FAQ data, render the children instead
        children
      )}
    </div>
  );
}

export default Accordion;
