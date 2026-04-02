import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import React, { useMemo } from "react";
import { availableCountries, paymentType } from "./subscriptions.constants";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./checkoutForm";

// [Replit Update 2026-03-30] Conditional Stripe key for demo companies
const liveStripePromise = loadStripe(
  `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`
);

const testStripePromise = process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
  ? loadStripe(`${process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY}`)
  : null;

export default function AddNewPayment({ hideCardValidationButton, isDemo }: any) {
  const stripePromise = useMemo(() => {
    return isDemo && testStripePromise ? testStripePromise : liveStripePromise;
  }, [isDemo]);

  return (
    <div className="faq_form">
      <FormikControl
        placeholder={"Select country"}
        required
        name={"country"}
        control={InputType.SELECT}
        renderKey="label"
        options={availableCountries}
        valueKey="value"
        disabled
        value={availableCountries[0]?.value}
        onChange={(selectedOption: any) => {}}
      />

      <legend className="mb_0_5">Payment method</legend>
      <FormikControl
        control={InputType.RADIO_BUTTON}
        options={paymentType}
        disabled
        name={"paymentMethod"}
        disableAutoComplete={true}
        onChange={(e: any) => {}}
        selectedValue={paymentType[0]?.value}
      />
      <Elements key={isDemo ? "stripe-test" : "stripe-live"} stripe={stripePromise}>
        <CheckoutForm hideCardValidationButton={hideCardValidationButton} />
      </Elements>
    </div>
  );
}
