import React from "react";

interface PlanProps {
  planType: string;
  isCurrentPlan?: boolean;
  title: string;
  description: string;
  price: string;
  buttonText: string;
  href?: string;
  offerText?: string;
  OfferMonths?: string;
}

const TIER_STYLES: Record<string, { headingClass: string; buttonClass: string }> = {
  "basic":      { headingClass: "",          buttonClass: "contrast" },
  "standard":   { headingClass: "oceantext", buttonClass: "secondary" },
  "advanced":   { headingClass: "crabtext",  buttonClass: "secondary" },
  "pro-audit":  { headingClass: "crabtext",  buttonClass: "" },
};

function getTierStyle(planType: string) {
  return TIER_STYLES[planType] || { headingClass: "", buttonClass: "secondary" };
}

const PlanCard: React.FC<PlanProps> = ({
  planType,
  isCurrentPlan = false,
  title,
  description,
  price,
  buttonText,
  href,
  offerText,
  OfferMonths,
}) => {
  const style = getTierStyle(planType);

  return (
    <div className={`pt_plan pt_${planType}`}>
      <span>{isCurrentPlan ? "Current plan" : "Upgrade plan"}</span>
      <h3 className={style.headingClass}>{title}</h3>
      <p>{description}</p>
      <h5>{price}</h5>
      {isCurrentPlan ? (
        <button className="contrast" disabled>
          {buttonText}
        </button>
      ) : (
        <a href={href || "#"}>
          <button className={style.buttonClass}>
            {buttonText}
            <i className="fa-light fa-arrow-right right"></i>
          </button>
        </a>
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

interface PricingPlansHOCProps {
  plans: PlanProps[];
}

const PricingPlansHOC: React.FC<PricingPlansHOCProps> = ({ plans }) => {
  return (
    <>
      {plans.map((plan, index) => (
        <PlanCard key={index} {...plan} />
      ))}
    </>
  );
};

export default PricingPlansHOC;
