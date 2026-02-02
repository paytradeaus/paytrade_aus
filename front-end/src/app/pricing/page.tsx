import RenderSubscriptionPricing from "@/modules/general/RenderSubscriptionPricing";
import seoMetadata from "@/utils/seoMetadata";
import { Metadata } from "next";
import { fetchGetAllSubscriptionPlanListForUser } from "../api/commonApi";

export const metadata: Metadata = seoMetadata.pricing;

function generatePricingSchema(subscriptionData: any) {
  if (!subscriptionData) return [];

  const schemas: any[] = [];

  const addPlans = (planList: any[]) => {
    for (const plan of planList || []) {
      if (!plan?.plan_name || plan?.unformatted_price === undefined) continue;

      schemas.push({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: `${plan.plan_name} (${plan.bill_cycle})`,
        description:
          plan.description ||
          `${plan.plan_name} subscription billed ${plan.bill_cycle}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        brand: {
          "@type": "Brand",
          name: "Paytrade",
        },
        offers: {
          "@type": "Offer",
          price: plan.unformatted_price.toString(),
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
          url: metadata.alternates?.canonical,
        },
      });
    }
  };

  addPlans(subscriptionData.monthly_plan_list);
  addPlans(subscriptionData.yearly_plan_list);

  // Free plan (if available)
  if (subscriptionData.free_plan) {
    const freePlan = subscriptionData.free_plan;

    schemas.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: freePlan.plan_name || "Free Plan",
      description: freePlan.description || "Free software subscription",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      brand: {
        "@type": "Brand",
        name: "Paytrade",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
        availability: "https://schema.org/InStock",
        url: metadata.alternates?.canonical,
      },
    });
  }

  return schemas;
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
