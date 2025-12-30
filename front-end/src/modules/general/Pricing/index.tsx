import React, { useEffect, useState } from "react";
import TitleSection from "../../../components/TitleSection";
import PricingPlansHOC from "@/components/PricingCards";
import PlanTable from "@/components/PricingGrid";
import { features } from "./Pricing.constants";
import {
  BUTTON_SIGNUP_TEXT,
  BUTTON_VIEWFAQ_TEXT,
  FAQ_HEAD,
  FAQ_SUB_HEAD,
} from "@/components/HomeScreen/homeScreen.constants";
import { showErrorToast } from "@/components/Toaster";
import { FAQ, fetchFaqList } from "../FAQS/Faq.functions";
import Accordion from "@/components/Accordion";
import { fetchGetAllSubscriptionPlanListForUser } from "@/app/api/commonApi";
import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { setCurentHomePage } from "@/redux/slices/homePage";
import { useAppDispatch } from "@/redux/store";
import { useRouter } from "next/navigation";
import { subscriptionPlanFeatures } from "@/shared/constant/data";

export default function PricingPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionPlanTypes, setSubscriptionPlanTypes] = useState<any>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isYearly, setIsYearly] = useState(false); // State for toggle
  const [features, setFeatures] = useState<any>([]);
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Handle toggle change
  const handleToggle = () => {
    setIsYearly((prev) => !prev);
  };

  const handleSignUpClick = () => {
    router.push(AppRoutes.USER_LOGIN);
  };
  // Transform and set plans based on toggle
  function transformPlans(data: any, isYearly: boolean) {
    if (!data) {
      return [];
    }

    const planList = isYearly
      ? data.yearly_plan_list || [] // Ensure it's an array
      : data.monthly_plan_list || []; // Ensure it's an array

    const freePlan = data.free_plan ? [data.free_plan] : []; // Ensure it's an array

    return [
      ...freePlan.map((plan) => ({
        planType: plan.plan_name ? plan.plan_name.toLowerCase() : "",
        isCurrentPlan: true,
        title: plan.plan_name || "Free Plan",
        description: plan.description || "No description available",
        price: "$0.00 +VAT",
        buttonText: " Current plan",
        href: "#",
        offerText: null,
        OfferMonths: null,
      })),
      ...planList.map((plan: any) => ({
        planType: plan.plan_name ? plan.plan_name.toLowerCase() : "",
        title: plan.plan_name || "Plan Title",
        description: plan.description || "Plan Description",
        price: plan.price
          ? `${plan.price} ${isYearly ? "/yr +VAT" : "/mo +VAT"}`
          : "$0.00/yr +VAT",
        buttonText: "Choose plan",
        href: AppRoutes.USER_LOGIN || "#",
        offerText: null,
        OfferMonths: null,
      })),
    ];
  }

  function transformFeatures(data: any) {
    const freePlanItems = data?.free_plan?.plan_items || [];
    const monthlyPlanItems = data?.monthly_plan_list?.[0]?.plan_items || [];
    const yearlyPlanItems = data?.yearly_plan_list?.[0]?.plan_items || [];

    const featureSet = new Set([
      ...freePlanItems.map((item: any) => item.item_name),
      ...monthlyPlanItems.map((item: any) => item.item_name),
      ...yearlyPlanItems.map((item: any) => item.item_name),
    ]);

    return Array.from(featureSet).map((featureName) => ({
      name: featureName,
      basic: freePlanItems.some((item: any) => item.item_name === featureName),
      premium: monthlyPlanItems.some(
        (item: any) => item.item_name === featureName
      ),
      platinum: yearlyPlanItems.some(
        (item: any) => item.item_name === featureName
      ),
    }));
  }

  useEffect(() => {
    if (subscriptionPlanTypes) {
      const transformedPlans = transformPlans(subscriptionPlanTypes, isYearly);
      setPlans(transformedPlans);
    }
  }, [isYearly, subscriptionPlanTypes]);

  // Fetch subscription plans
  async function getSubscriptionPlanTypes() {
    try {
      const response: any = await fetchGetAllSubscriptionPlanListForUser();

      if (response) {
        const transformedPlans = transformPlans(response, isYearly);
        // const transformedFeatures = transformFeatures(response);
        setPlans(transformedPlans); // Update state with transformed plans
        // setFeatures(transformedFeatures);
        setSubscriptionPlanTypes(response); // Save raw data for future use
      }
    } catch {}
  }

  // Fetch FAQs on component mount
  useEffect(() => {
    async function getFaqs() {
      setLoading(true);
      try {
        const data = await fetchFaqList({
          category: null,
          keyword: "",
          page: null,
          perPage: null,
          status: "Active",
          showInHome: true,
        });
        setFaqs(data?.FAQs || []);
      } catch {
        showErrorToast("Failed to load FAQs");
      } finally {
        setLoading(false);
      }
    }

    getFaqs();
    getSubscriptionPlanTypes();
  }, []);

  return (
    <>
      <main>
        <TitleSection
          title="Pricing"
          subtitle="Plans to suit your construction business"
          description="All pricing plans cover the essentials to remain project trust compliant."
        />
      </main>
      <div className="pt_centered pt_pricing">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent">
            <div className="center">
              <h2 className="crabtext">
                Let's find the best fit for your business
              </h2>
              <fieldset
                className="center"
                style={{ margin: "0px", padding: "0px" }}
              >
                <label>
                  Monthly plan&nbsp;&nbsp;
                  <input
                    name="opt-in"
                    type="checkbox"
                    role="switch"
                    checked={isYearly}
                    onChange={handleToggle}
                  />
                  &nbsp;Yearly plan
                </label>
              </fieldset>
            </div>
            <div className="grid center">
              {plans.length > 0 ? (
                <PricingPlansHOC plans={plans} />
              ) : (
                <p>Loading Plans...</p>
              )}
            </div>
            <PlanTable features={subscriptionPlanFeatures} />
          </div>
        </div>
      </div>
      <div>
        <div className="container-fluid">
          <div className="center">
            <h3>{FAQ_HEAD}</h3>
            <p>{FAQ_SUB_HEAD}</p>
          </div>

          <Accordion
            faqs={faqs?.slice(0, 4)}
            loading={loading}
            fullPage={false}
          >
            <div>
              <details>
                <summary>No FAQs available</summary>
                <p>
                  It seems there are no FAQs at the moment. Please check back
                  later.
                </p>
              </details>
            </div>
          </Accordion>

          <div className="center">
            <Link href={"/faq"}>
              <button className="contrast">{BUTTON_VIEWFAQ_TEXT}</button>
            </Link>
          </div>
          <br />
          <br />
        </div>
      </div>

      <div>
        <div className="container-fluid">
          <div className="finalcta center">
            <div className="logolarge"></div>
            <br />
            <br />
            <h5>
              Take control of your project trust accounts today, sign up for Pay
              Trade and experience hassle-free compliance and streamlined trust
              account management and reporting
            </h5>
            <div className="pt_highlightscta">
              <div className="pt_highlightsctatext">
                <h3 className="crabtext">3 Months FREE Trial</h3>
                <p>
                  Access PayTrade for free today to see how we make construction
                  project and trust administration and accounting easy
                </p>
              </div>
              <div className="pt_highlightsctabutton">
                <a href={AppRoutes.USER_LOGIN} className="cta">
                  <button onClick={handleSignUpClick}>
                    {BUTTON_SIGNUP_TEXT}
                    <i className="fa-light fa-arrow-right right"></i>
                  </button>
                </a>
              </div>
            </div>
            <div className="blurblobthemecta"></div>
          </div>
        </div>
      </div>
    </>
  );
}
