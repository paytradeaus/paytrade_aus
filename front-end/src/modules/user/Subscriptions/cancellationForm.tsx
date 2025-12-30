import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, InputType } from "@/shared/constant/general";
import React, { Fragment, useState } from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";
import { getCompanyIdFromStorage } from "@/utils";
import { cancelSubscriptionForUser } from "./subscriptions.function";
import FormikControl from "@/components/FormikControl";

export default function CancellationForm() {
  const { getExistingSubscriptionPlan }: any = useSubscriptionsContext();
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [disableButton, setDisableButton] = useState(false);

  async function handleConfirmCancelSubscription() {
    try {
      if (disableButton) {
        return;
      }
      setDisableButton(true);
      const success = await cancelSubscriptionForUser({
        companyId: getCompanyIdFromStorage(),
        cancellationReason: cancellationReason,
      });
      setDisableButton(false);
      setDisplayConfirmationModal(false);
      if (success) {
        setCancellationReason("");
        getExistingSubscriptionPlan();
      }
    } catch (err: any) {
      setDisableButton(false);
    }
  }

  return (
    <Fragment>
      <p>
        We're sorry to see you lose your extra features. Please let us know why
        you're cancelling your subscription.
      </p>
      <form className="faq_form">
        <fieldset>
          <div>
            <label>Reason for cancellation</label>

            <FormikControl
              control={InputType.TEXT_AREA}
              name={"reason"}
              value={cancellationReason}
              placeholder="Please let us know why you're cancelling your subscription"
              onChange={(e: any) => setCancellationReason(e?.target?.value)}
            />
          </div>
          <div className="">
            <label>&nbsp;</label>

            <CustomButton
              buttonName={"Cancel subscription and switch to basic plan"}
              buttonType={buttonType.CONTRAST}
              onClick={() => setDisplayConfirmationModal(true)}
              actionType={"button"}
              inputButton
            />
          </div>
        </fieldset>
      </form>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"cancel subscription modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleConfirmCancelSubscription();
            return true;
          }}
          disableFirstButton={disableButton}
          disableSecondButton={disableButton}
          firstButtonName="No"
          secondButtonName={
            disableButton ? "On progress..." : "Continue to cancel"
          }
        >
          <p className="text_center">Sorry to see you go</p>
          <div className="text_center">
            {
              "Are you sure you want to cancel your subscription? This action cannot be undone."
            }
          </div>
        </BaseModal>
      )}
    </Fragment>
  );
}
