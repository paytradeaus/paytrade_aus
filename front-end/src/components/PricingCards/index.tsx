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

const PlanCard: React.FC<PlanProps & { tierIndex: number; tierTotal: number }> = ({
  planType,
  isCurrentPlan = false,
  title,
  description,
  price,
  buttonText,
  href,
  offerText,
  OfferMonths,
  tierIndex,
  tierTotal,
}) => {
  const style = getTierStyle(tierIndex, tierTotal);

  return (
    <div
      className={`pt_plan pt_${planType}`}
      style={{ borderColor: style.borderColor }}
    >
      <span style={{ background: style.spanBg, color: style.spanColor }}>
        {isCurrentPlan ? "Current plan" : "Upgrade plan"}
      </span>
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
        <PlanCard key={index} {...plan} tierIndex={index} tierTotal={plans.length} />
      ))}
    </>
  );
};

export default PricingPlansHOC;
