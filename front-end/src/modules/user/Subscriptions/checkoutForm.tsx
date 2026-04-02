import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLoaderContext } from "@/context/useLoader";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { getCompanyIdFromStorage } from "@/utils";
import { associatePaymentMethodToCustomer } from "./subscriptions.function";
import { useSubscriptionsContext } from "./SubscriptionContext";

const CheckoutForm = ({ hideCardValidationButton }: any) => {
  const {
    setStripeCardPaymentDetails,
    stripeCardError,
    setStripeCardError,
    cardButtonRef,
    getAllExistingCardDetails,
    displayBillingDetails,
    setCardComplete,
  }: any = useSubscriptionsContext();
  const stripe = useStripe();
  const elements: any = useElements();
  const [loading, setLoading] = useState(false);

  const { setLoader }: any = useLoaderContext();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      return;
    }

    const cardElement: any = elements.getElement(CardElement);

    const { error, paymentMethod }: any = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement!,
    });

    if (error) {
      if (error?.message == "Your postal code is incomplete.") {
        setStripeCardError("Enter the zip code");
      } else {
        setStripeCardError(error?.message);
      }
      setStripeCardPaymentDetails(null);
    } else {
      if (!displayBillingDetails) {
        await handleAddCard(paymentMethod?.id);
        elements.getElement(CardElement).clear();
        getAllExistingCardDetails();
      }
      setStripeCardError("");
      setStripeCardPaymentDetails(paymentMethod);
    }
    setLoading(false);
  }

  async function handleAddCard(paymentMethodId: string) {
    try {
      setLoader(true);
      const postData = {
        company_id: getCompanyIdFromStorage(),
        payment_method_id: paymentMethodId,
      };
      const response = await associatePaymentMethodToCustomer(postData);
      if (response) {
        cardButtonRef.current.value = "";
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  return (
    <div className="grid">
      <div className="mb_1">
        <label htmlFor={"stripeCardElement"} className="mb_0_5">
          Card information
        </label>
        <CardElement
          className="stripeCardElement"
          id="stripeCardElement"
          onChange={(event) => {
            setCardComplete(event.complete);
            if (event.error) {
              setStripeCardError(event.error.message);
            } else {
              setStripeCardError("");
            }
          }}
        />
        {stripeCardError && <div className="invalid">{stripeCardError}</div>}
      </div>
      <div className={`${hideCardValidationButton ? "dis_none" : ""} p_1`}>
        <CustomButton
          buttonName={loading ? "Processing..." : " Add card"}
          buttonType={buttonType.SECONDARY}
          disabled={!stripe || loading}
          onClick={handleSubmit}
          inputButton
          buttonRef={cardButtonRef}
        />
      </div>
    </div>
  );
};

export default CheckoutForm;
