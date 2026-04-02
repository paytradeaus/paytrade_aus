"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  fetchAdminListSubscriptionItems,
  fetchCompanyDemoStatus,
  getAllCardDetailsByCompanyId,
  getCardDetailsByCompanyId,
  getSubscriptionDetailsByCompanyId,
  setAsDefaultByPaymentMethodId,
} from "./subscriptions.function";
import { useLoaderContext } from "@/context/useLoader";
import { durationType } from "./subscriptions.constants";
import { fetchGetAllSubscriptionPlanListForUser } from "@/app/api/commonApi";
import { subscriptionStatus } from "./subscriptions.constants";

const SubscriptionsContext: any = createContext(null);

export const SubscriptionsContextProvider = ({ children }: any) => {
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const [subscriptionPlansItems, setSubscriptionPlansItems] = useState<any>([]);

  const [subscriptionPlanTypes, setSubscriptionPlanTypes] = useState<any>([]);
  const [displayBillingDetails, setDisplayBillingDetails] = useState(false);
  const [selectedPlanForSub, setSelectedPlanForSub] = useState([]);
  const [allExistingCardDetails, setAllExistingCardDetails] = useState<any>([]);
  const [selectedCard, setSelectedCard] = useState([]);
  const [existingCardDetails, setExistingCardDetails] = useState<any>([]);

  const [isYearly, setIsYearly] = useState(false); // State for toggle
  const [cardPlans, setCardPlans] = useState<any[]>([]);
  const [updateSubscriptionData, setUpdateSubscriptionData] = useState(false);
  const [stripeCardPaymentDetails, setStripeCardPaymentDetails] =
    useState(null);
  const [stripeCardError, setStripeCardError] = useState("");
  const [annualBilling, setAnnualBilling] = useState(false);
  const [companyIsDemo, setCompanyIsDemo] = useState(false);
  const cardButtonRef = useRef(null);

  useEffect(() => {
    initialInvoke();
  }, [updateSubscriptionData]);

  useEffect(() => {
    if (subscriptionPlanTypes?.free_plan && subscriptionData?.plan_id) {
      const transformedPlans = transformPlans(subscriptionPlanTypes, isYearly);
      setCardPlans(transformedPlans);
    }
  }, [isYearly, subscriptionPlanTypes, subscriptionData]);

  async function initialInvoke() {
    try {
      setLoader(true);

      // [Replit Update 2026-04-02] Fetch demo status directly from company, independent of subscription
      const [isDemoCompany] = await Promise.all([
        fetchCompanyDemoStatus(),
        getSubscriptionPlanItems(),
        getExistingSubscriptionPlan(),
        getAllExistingCardDetails(),
        getExistingCardDetails(),
      ]);

      setCompanyIsDemo(isDemoCompany);
      await getSubscriptionPlanTypes(isDemoCompany);

      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  //existing all subscription plan items
  async function getSubscriptionPlanItems() {
    try {
      const response: any = await fetchAdminListSubscriptionItems();

      if (response) {
        setSubscriptionPlansItems(response?.subscriptionItems);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  //selectedCompany's subscription details
  async function getExistingSubscriptionPlan() {
    try {
      const response: any = await getSubscriptionDetailsByCompanyId();

      if (response) {
        setSubscriptionData(response);
        setIsYearly(response?.bill_cycle === durationType?.YEARLY);
        return response;
      }

      return null;
    } catch (err: any) {
      return false;
    }
  }
  // [Replit Update 2026-03-30] Accept isDemoCompany to filter sandbox plans
  async function getSubscriptionPlanTypes(isDemoCompany: boolean = false) {
    try {
      const response: any = await fetchGetAllSubscriptionPlanListForUser(isDemoCompany);

      if (response) {
        const transformedPlans = transformPlans(response, isYearly);

        setCardPlans(transformedPlans);

        setSubscriptionPlanTypes(response);
      }
    } catch (err) {
      console.error("Error fetching subscription plans:", err);
    }
  }

  async function getAllExistingCardDetails() {
    try {
      setLoader(true);
      const response: any = await getAllCardDetailsByCompanyId();

      if (response?.length > 0) {
        const modifiedResponse = response.map((x: any) => {
          return {
            ...x,
            dropdownLabel: ` **** **** ${x?.last_four_digits} - ${x?.card_type}`,
          };
        });
        setAllExistingCardDetails(modifiedResponse);
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function getExistingCardDetails() {
    try {
      setLoader(true);
      const response: any = await getCardDetailsByCompanyId();

      if (response) {
        setExistingCardDetails(response);
      }

      // if (!chosenPlan && !response?.payment_method_id) {
      //   router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
      // }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  // [Replit Update 2026-03-29] Deduplicate plans by name, preferring plans with descriptions
  function normalizePlanKey(name: string): string {
    return (name || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
  }

  function deduplicatePlans(planList: any[]): any[] {
    const seen = new Map<string, any>();
    for (const plan of planList) {
      const key = normalizePlanKey(plan.plan_name);
      if (!seen.has(key)) {
        seen.set(key, plan);
      } else {
        const existing = seen.get(key);
        if (!existing.description && plan.description) {
          seen.set(key, plan);
        }
      }
    }
    return Array.from(seen.values());
  }

  // Transform and set plans based on toggle
  function transformPlans(data: any, isYearly: boolean) {
    if (!data) {
      return [];
    }

    const rawPlanList = isYearly
      ? data.yearly_plan_list || []
      : data.monthly_plan_list || [];
    const planList = deduplicatePlans(rawPlanList);

    const freePlan = !subscriptionData?.payment_method_id
      ? [data.free_plan]
      : []; // Ensure it's an array

    return [
      ...freePlan.map((plan) => ({
        overallData: plan,
        planType: plan.plan_name ? plan.plan_name.toLowerCase() : "",
        isCurrentPlan: true,
        title: plan.plan_name || "Free Plan",
        description: plan.description || "hideDescription",
        price: "$0.00 +VAT",
        buttonText: "Current plan",
      })),
      ...planList
        .map((plan: any) => {
          if (
            (subscriptionData?.has_upgrade_plans &&
              subscriptionData?.status !== subscriptionStatus.CANCELLED) ||
            subscriptionData?.plan_id == plan?.plan_id
          ) {
            return {
              overallData: plan,
              planType: plan.plan_name ? plan.plan_name.toLowerCase() : "",
              title: plan.plan_name || "Plan Title",
              description: plan.description || "hideDescription",
              price: plan.price
                ? `${plan.price} ${isYearly ? "/yr +VAT" : "/mo +VAT"}`
                : "$0.00/yr +VAT",
              isCurrentPlan: isCurrentPlan(plan),
              buttonText: isCurrentPlan(plan) ? "Current plan" : "Choose plan",
            };
          } else {
            return null;
          }
        })
        .filter((modifiedValues: any) => modifiedValues !== null),
    ];
  }

  function isCurrentPlan(plan: any) {
    return Boolean(
      subscriptionData?.plan_id == plan?.plan_id &&
        subscriptionData?.price_id == plan?.price_id
    );
  }

  async function setAsDefaultCard(
    cardData: any,
    fromDropdownSelection?: boolean
  ) {
    setLoader(true);
    try {
      const postData = {
        customer_id: cardData?.customer_id || null,
        payment_method_id: cardData?.payment_method_id || null,
      };

      const response: any = await setAsDefaultByPaymentMethodId(postData);

      if (response && !fromDropdownSelection) {
        await getExistingCardDetails();
        await getAllExistingCardDetails();
      }
      if (!fromDropdownSelection) {
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  return (
    <SubscriptionsContext.Provider
      value={{
        router,
        subscriptionData,
        isDemo: companyIsDemo || subscriptionData?.is_demo || false,
        subscriptionPlansItems,
        cardPlans,
        isYearly,
        setIsYearly,
        subscriptionPlanTypes,
        isCurrentPlan,
        displayBillingDetails,
        setDisplayBillingDetails,
        selectedPlanForSub,
        setSelectedPlanForSub,
        setLoader,
        allExistingCardDetails,
        setAllExistingCardDetails,
        selectedCard,
        setSelectedCard,
        existingCardDetails,
        setUpdateSubscriptionData,
        stripeCardPaymentDetails,
        setStripeCardPaymentDetails,
        stripeCardError,
        setStripeCardError,
        cardButtonRef,
        getAllExistingCardDetails,
        getExistingCardDetails,
        annualBilling,
        setAnnualBilling,
        getSubscriptionPlanTypes,
        setAsDefaultCard,
        getExistingSubscriptionPlan,
        setLoaderInfo,
      }}
    >
      {children}
    </SubscriptionsContext.Provider>
  );
};

// Create a custom hook for using the global context
const useSubscriptionsContext = () => {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error("Error in Subscriptions Context");
  }
  return context;
};

export { useSubscriptionsContext };
