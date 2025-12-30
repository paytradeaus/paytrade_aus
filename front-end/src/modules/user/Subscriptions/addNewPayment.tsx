import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import React from "react";
import { availableCountries, paymentType } from "./subscriptions.constants";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./checkoutForm";

const stripePromise = loadStripe(
  `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`
);

export default function AddNewPayment({ hideCardValidationButton }: any) {
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
      {/* <fieldset className="grid">
        <div>
          <label>Card number</label>
          <input name="card" placeholder="**** **** **** 1234" />
        </div>
        <div className="grid">
          <div>
            <label>Expiry date</label>
            <input name="expiry" placeholder="08/27" />
          </div>
          <div>
            <label>CVC</label>
            <input name="cvc" placeholder="***" />
          </div>
        </div>
        <div className="grid">
          <div>
            <label>ZIP</label>
            <input name="zip" placeholder="1234567" />
          </div>
          <div className="">
            <label>&nbsp;</label>
            <input type="submit" className="secondary" value="Add card" />
          </div>
        </div>
      </fieldset> */}
      <Elements stripe={stripePromise}>
        <CheckoutForm hideCardValidationButton={hideCardValidationButton} />
      </Elements>
    </div>
  );
}
