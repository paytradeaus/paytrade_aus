"use client";
import React, { useEffect, useState } from "react";
import Home from "../../../app/page";
import Subscriptions from "@/modules/user/Subscriptions";
import { useTokenDetails } from "@/hooks";
import { getCompanyIdFromStorage } from "@/utils";
import { SubscriptionPlanType } from "@/shared/constant/general";
import GuestFooter from "@/components/GuestFooter";

export default function RenderSubscriptionPricing() {
  const { decodeTokenData } = useTokenDetails();
  const selectedCompanyId = +getCompanyIdFromStorage();
  const [planName, setPlanName] = useState<string>("");

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && selectedCompanyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) =>
          String(x.companyId) === String(selectedCompanyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const currentPlanName = subscription?.plan_name;

      setPlanName(currentPlanName || SubscriptionPlanType.BASIC); // Assuming setPlanName exists to store the plan name
    }
  }, [selectedCompanyId]);

  return getCompanyIdFromStorage() ? (
    <Home screen={"SUBSCRIPTIONS"} />
  ) : (
    <Home screen={"PRICING"} />
  );
}
