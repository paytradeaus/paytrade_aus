import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType as btnType } from "@/shared/constant/general";
import React from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";

const TIER_STYLES: Record<string, { headingClass: string; buttonClass: string }> = {
  "basic":      { headingClass: "",          buttonClass: "contrast" },
  "standard":   { headingClass: "oceantext", buttonClass: "secondary" },
  "premium":    { headingClass: "oceantext", buttonClass: "secondary" },
  "advanced":   { headingClass: "crabtext",  buttonClass: "secondary" },
  "platinum":   { headingClass: "crabtext",  buttonClass: "" },
  "pro-audit":  { headingClass: "crabtext",  buttonClass: "" },
};

function getTierStyle(planType: string) {
  return TIER_STYLES[planType] || { headingClass: "", buttonClass: "secondary" };
}

export default function PlanCardWrapper({ typeOfCards }: any) {
  // typeOfCards?.length > 0 &&
  // typeOfCards.map((plan: any, index: number) => (
  //   <PlanCard key={index} {...plan} />
  // ))
  // <div className="grid center">
  //   <div className="pt_plan pt_basic">
  //     <span>Downgrade plan</span>
  //     <h3>Basic</h3>
  //     <p>
  //       gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor
  //       hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci
  //       ligula
  //     </p>
  //     <h5>$0.00 +VAT</h5>
  //     <a href="#cancel">
  //       <button className="contrast">Downgrade plan</button>
  //     </a>
  //   </div>

  //   <div className="pt_plan pt_premium">
  //     <span>Current plan</span>
  //     <h3 className="oceantext">Premium</h3>
  //     <p>
  //       gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor
  //       hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci
  //       ligula
  //     </p>
  //     <h5>$275.00/yr +VAT</h5>
  //     <a href="#">
  //       <button className="secondary" disabled>
  //         Current plan
  //         <i className="fa-light fa-arrow-right right"></i>
  //       </button>
  //     </a>
  //   </div>

  //   <div className="pt_plan pt_platinum">
  //     <span>Upgrade plan</span>
  //     <h3 className="crabtext">Platinum</h3>
  //     <p>
  //       gilla lacus eu tempor eleifend. Suspendisse potenti. Nunc eu tortor
  //       hendrerit, porta arcu non, scelerisque quam. Donec porttitor orci
  //       ligula
  //     </p>
  //     <h5>$500.00/yr +VAT</h5>
  //     <a href="upgrade.html">
  //       <button>
  //         Choose plan<i className="fa-light fa-arrow-right right"></i>
  //       </button>
  //     </a>
  //     <div className="offer">
  //       <b>3</b> months free trial
  //     </div>
  //   </div>
  // </div>
  // );
  if (!typeOfCards || typeOfCards.length === 0) return null;

  // 1. Get current plan
  const currentPlan = typeOfCards.find((plan: any) => plan?.isCurrentPlan);

  const currentPrice = currentPlan?.overallData?.unformatted_price ?? 0;

  // 2. Filter out downgrade plans
  const filteredPlans = typeOfCards.filter((plan: any) => {
    const planPrice = plan?.overallData?.unformatted_price ?? 0;

    // Always show current plan
    if (plan.isCurrentPlan) return true;

    // Show only upgrade or same-price plans
    return planPrice >= currentPrice;
  });

  return (
    <>
      {filteredPlans.map((plan: any, index: number) => (
        <PlanCard key={index} {...plan} />
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

  const style = getTierStyle(planType);

  return (
    <div className={`pt_plan pt_${planType}`}>
      <span>{isCurrentPlan ? "Current plan" : "Upgrade plan"}</span>
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
