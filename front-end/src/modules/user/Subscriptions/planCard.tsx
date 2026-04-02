import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType as btnType } from "@/shared/constant/general";
import React from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";

const TIER_SEQUENCE = [
  { headingClass: "",          buttonClass: "contrast",  borderColor: "var(--pico-contrast)", spanBg: "transparent",          spanColor: "var(--pico-contrast)" },
  { headingClass: "oceantext", buttonClass: "secondary", borderColor: "var(--ocean)",         spanBg: "var(--oceangradient)", spanColor: "var(--wind-lighter)"  },
  { headingClass: "crabtext",  buttonClass: "secondary", borderColor: "var(--crab)",          spanBg: "var(--crabgradient)",  spanColor: "var(--wind-lighter)"  },
  { headingClass: "crabtext",  buttonClass: "",          borderColor: "var(--crab)",          spanBg: "var(--crabgradient)",  spanColor: "var(--wind-lighter)"  },
];

function getTierStyle(index: number, total: number) {
  if (total <= 1) return TIER_SEQUENCE[0];
  if (index === 0) return TIER_SEQUENCE[0];
  if (index === total - 1) return TIER_SEQUENCE[3];
  if (index <= Math.floor((total - 1) / 2)) return TIER_SEQUENCE[1];
  return TIER_SEQUENCE[2];
}

export default function PlanCardWrapper({ typeOfCards }: any) {
  if (!typeOfCards || typeOfCards.length === 0) return null;

  const currentPlan = typeOfCards.find((plan: any) => plan?.isCurrentPlan);
  const currentPrice = currentPlan?.overallData?.unformatted_price ?? 0;

  const filteredPlans = typeOfCards.filter((plan: any) => {
    const planPrice = plan?.overallData?.unformatted_price ?? 0;
    if (plan.isCurrentPlan) return true;
    return planPrice >= currentPrice;
  });

  return (
    <>
      {filteredPlans.map((plan: any, index: number) => (
        <PlanCard key={index} {...plan} tierIndex={index} tierTotal={filteredPlans.length} />
      ))}
    </>
  );
}

const PlanCard: React.FC<any> = ({
  planType,
  isCurrentPlan = false,
  title,
  description,
  price,
  buttonText,
  href,
  offerText,
  OfferMonths,
  overallData,
  tierIndex,
  tierTotal,
}) => {
  const { setDisplayBillingDetails, setSelectedPlanForSub }: any =
    useSubscriptionsContext();

  function handleUpdatePlan() {
    setDisplayBillingDetails(true);
    setSelectedPlanForSub({
      ...overallData,
      planPrice: price,
      description: overallData?.description
        ? overallData?.description
        : overallData?.plan_name,
    });
  }

  const style = getTierStyle(tierIndex, tierTotal);

  return (
    <div
      className={`pt_plan pt_${planType}`}
      style={{ borderColor: style.borderColor }}
    >
      <span style={{ background: style.spanBg, color: style.spanColor }}>
        {isCurrentPlan ? "Current plan" : "Upgrade plan"}
      </span>
      <h3 className={style.headingClass}>
        {title}
      </h3>
      <p className={description == "hideDescription" ? "visibleHidden" : ""}>
        {description}
      </p>
      <h5>{price}</h5>
      {isCurrentPlan ? (
        <button className="contrast" disabled>
          {buttonText}
        </button>
      ) : (
        <CustomButton
          buttonName={buttonText}
          buttonType={style.buttonClass || btnType.SECONDARY}
          suffixIconClassName="fa-light fa-arrow-right right"
          actionType="button"
          onClick={() => handleUpdatePlan()}
        />
      )}
      {offerText && (
        <div className="offer">
          <b>{OfferMonths}</b>
          {offerText}
        </div>
      )}
    </div>
  );
};
