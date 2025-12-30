import React, { useEffect, useState } from "react";
import TitleSection from "@/components/TitleSection";
import Accordion from "@/components/Accordion";
import { showErrorToast } from "@/components/Toaster";
import { FAQ, fetchFaqList } from "./Faq.functions";

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch FAQs on component mount
  useEffect(() => {
    async function getFaqs() {
      setLoading(true);
      try {
        const data = await fetchFaqList({
          category: null, // Replace with desired category value
          keyword: "", // Replace with desired keyword
          page: null, // Replace with desired page number
          perPage: null, // Replace with desired per-page count
          status: "Active", // Replace with desired status value
          // showInHome: true,
        });
        setFaqs(data?.FAQs || []);
      } catch (error) {
        showErrorToast("Failed to load FAQs");
      } finally {
        setLoading(false);
      }
    }

    getFaqs();
  }, []);

  return (
    <>
      <TitleSection
        title="FAQs"
        subtitle="Find answers to common questions about PayTrade"
        description=""
      />
      <Accordion faqs={faqs} loading={loading} fullPage={true}>
        <div>
          <details>
            <summary>No FAQs available</summary>
            <p>
              It seems there are no FAQs at the moment. Please check back later.
            </p>
          </details>
        </div>
      </Accordion>
    </>
  );
}
