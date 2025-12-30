import { months } from "moment";
import React, { ReactNode } from "react";

interface PlanProps {
  planType: "basic" | "premium" | "platinum";
  isCurrentPlan?: boolean;
  title: string;
  description: string;
  price: string;
  buttonText: string;
  href?: string;
  offerText?: string;
  OfferMonths?: string;
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
      <p>{description}</p>
      <h5>{price}</h5>
      {isCurrentPlan ? (
        <button className="contrast" disabled>
          {buttonText}
        </button>
      ) : (
        <a href={href || "#"}>
          <button className={planType === "platinum" ? "" : "secondary"}>
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
