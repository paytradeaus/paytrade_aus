import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import React from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";

export default function HeaderContent() {
  const { router }: any = useSubscriptionsContext();
  return (
    <div className="pt_titletop">
      <div className="container-fluid">
        <div className="pt_pageactions">
          <CustomButton
            actionType="button"
            buttonName="Close"
            buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
            onClick={() => router.back()}
            iconClassName={"fa-light fa-xmark-large"}
          />
        </div>

        <div className="center">
          <h1>Subscription</h1>
          <h5>Plans to suit your construction business</h5>
          <p>
            All pricing plans cover the essentials to remain project trust
            compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
