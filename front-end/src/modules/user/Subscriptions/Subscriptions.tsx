import React, { Fragment } from "react";
import HeaderContent from "./headerContent";
import PlanFeaturesGrid from "./planFeaturesGrid";
import PaymentMethodsGrid from "./paymentMethods";
import AddNewPayment from "./addNewPayment";
import BillingHistoryGrid from "./BillingHistoryGrid";
import CancellationForm from "./cancellationForm";
import { useSubscriptionsContext } from "./SubscriptionContext";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { durationType, subscriptionStatus } from "./subscriptions.constants";
import { formatDate } from "@/utils";
import PlanCardWrapper from "./planCard";
import BillingSummary from "./billingSummary";
import PlanTable from "@/components/PricingGrid";

export default function Subscriptions() {
  const {
    subscriptionData,
    isDemo,
    cardPlans,
    isYearly,
    setIsYearly,
    subscriptionPlanTypes,
    displayBillingDetails,
    setDisplayBillingDetails,
    setAnnualBilling,
  }: any = useSubscriptionsContext();

  function handleToggle() {
    setIsYearly((prev: any) => !prev);
  }

  function isExpiryDateGreaterThanPresent() {
    if (subscriptionData?.expiry_date)
      return new Date(subscriptionData?.expiry_date) > new Date();
    else return false;
  }

  return !displayBillingDetails ? (
    <Fragment>
      <HeaderContent />

      <div className="pt_centered pt_pricing">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent">
            <div className="grid pt_data">
              <div>
                <h6 style={{ margin: "0" }}>Company ID</h6>
                <h4>{subscriptionData?.company_id}</h4>
              </div>
              <div>
                <h6 style={{ margin: "0" }}>Current plan</h6>
                <h4 className="rivertext">{subscriptionData?.plan_name}</h4>

                {subscriptionData?.has_upgrade_plans &&
                  subscriptionData?.has_annual_billing &&
                  subscriptionData?.status !== subscriptionStatus.CANCELLED &&
                  isExpiryDateGreaterThanPresent() && (
                    <CustomButton
                      actionType="button"
                      buttonType={`${buttonType.SECONDARY_SMALL}`}
                      buttonName={"Switch to annual billing"}
                      onClick={() => {
                        setDisplayBillingDetails(true);
                        setAnnualBilling(true);
                      }}
                    />
                  )}
              </div>
              <div>
                <h6 style={{ margin: "0" }}>Status</h6>
                <h4>
                  <span className="valid">
                    {subscriptionData?.status ?? ""}
                  </span>
                </h4>
                {subscriptionData?.status !=
                  subscriptionStatus.UNSUBSCRIBED && (
                  <h6 style={{ margin: "0" }}>
                    {" "}
                    {`${
                      subscriptionData?.status === subscriptionStatus.CANCELLED
                        ? "Plan expires"
                        : "Next charge"
                    } on ${formatDate(subscriptionData?.expiry_date)}`}
                  </h6>
                )}
              </div>
            </div>

            {cardPlans.length > 0 && (
              <div className="center">
                <h2>Upgrade your plan</h2>
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
                      disabled={
                        subscriptionData?.bill_cycle === durationType?.YEARLY
                      }
                    />
                    &nbsp;Yearly plan
                  </label>
                </fieldset>
              </div>
            )}

            {cardPlans.length > 0 && (
              <div className="grid center">
                <PlanCardWrapper typeOfCards={cardPlans} />
              </div>
            )}

            <PlanTable subscriptionPlanTypes={subscriptionPlanTypes} isYearly={isYearly} />

            <div
              className="pt_box pt_faqs pt_paymentmethods"
              style={{ marginTop: cardPlans.length > 0 ? "" : "2rem" }}
            >
              {(subscriptionPlanTypes?.free_plan ||
                (subscriptionPlanTypes?.monthly_plan_list?.length ?? 0) > 0 ||
                (subscriptionPlanTypes?.yearly_plan_list?.length ?? 0) > 0) && (
                <>
                  <details>
                    <summary>View detailed plan features</summary>
                    <PlanFeaturesGrid />
                  </details>
                  <hr />
                </>
              )}

              {(subscriptionData?.payment_method_id ||
                subscriptionData?.coupon_id) && (
                <Fragment>
                  <details>
                    <summary>Payment methods</summary>

                    <PaymentMethodsGrid />

                    <br />
                    <p>Add a new payment method to your account</p>
                    <AddNewPayment isDemo={isDemo} />
                  </details>
                  <hr />
                </Fragment>
              )}

              {(subscriptionData?.payment_method_id ||
                subscriptionData?.coupon_id) && (
                <details>
                  <summary>Billing history</summary>

                  <BillingHistoryGrid />
                </details>
              )}

              {(subscriptionData?.payment_method_id ||
                subscriptionData?.coupon_id) &&
                subscriptionData?.status !== subscriptionStatus.CANCELLED && (
                  <Fragment>
                    <hr />
                    <details id="cancel">
                      <summary>Cancel subscription</summary>
                      <CancellationForm />
                    </details>
                    <hr />
                  </Fragment>
                )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  ) : (
    <BillingSummary />
  );
}
