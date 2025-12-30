import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import React from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";

export default function PlanCardWrapper({ typeOfCards }: any) {
  return (
    typeOfCards?.length > 0 &&
    typeOfCards.map((plan: any, index: number) => (
      <PlanCard key={index} {...plan} />
    ))
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
    setSelectedPlanForSub({ ...overallData, planPrice: price });
  }
  return (
    <div className={`pt_plan pt_${planType}`}>
      <span>{isCurrentPlan ? "Current plan" : "Upgrade plan"}</span>
      <h3
        className={`${planType === "premium" ? "oceantext" : ""} ${
          planType === "platinum" ? "crabtext" : ""
        }`}
      >
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
          buttonType={planType === "platinum" ? "" : buttonType.SECONDARY}
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
