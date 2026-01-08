import RenderSubscriptionPricing from "@/modules/general/RenderSubscriptionPricing";
import seoMetadata from "@/utils/seoMetadata";
import { Metadata } from "next";
import { fetchGetAllSubscriptionPlanListForUser } from "../api/commonApi";

export const metadata: Metadata = seoMetadata.pricing;

function generatePricingSchema(subscriptionData: any) {
  const plans = [];
  if (!subscriptionData) return [];
  const addPlans = (planList: any[]) => {
    for (const plan of planList || []) {
      if (!plan.plan_name || !plan.unformatted_price) continue;

      plans.push({
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${plan?.plan_name} - ${plan?.bill_cycle}`,
        description:
          plan?.description || `${plan?.plan_name} plan (${plan?.bill_cycle})`,
        brand: "Paytrade",
        offers: {
          "@type": "Offer",
          price: plan?.unformatted_price.toString(),
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
          url: metadata.alternates?.canonical,
        },
      });
    }
  };
  addPlans(subscriptionData.monthly_plan_list);
  addPlans(subscriptionData.yearly_plan_list);
  const freePlan = subscriptionData.free_plan;
  if (freePlan) {
    plans.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: freePlan.plan_name || "Free Plan",
      description: freePlan.description || "Free subscription plan",
      brand: "Paytrade",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
        availability: "https://schema.org/InStock",
        url: metadata.alternates?.canonical,
      },
    });
  }

  return plans;
}

export default async function Page() {
  const response: any = await fetchGetAllSubscriptionPlanListForUser();
  const schema = generatePricingSchema(response);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />
      <RenderSubscriptionPricing />
    </>
  );
}
