import { useEffect, useState } from "react";

import { Elements } from "@stripe/react-stripe-js";

import { loadStripe } from "@stripe/stripe-js";
import { AddressElement } from "@stripe/react-stripe-js";
import PaymentForm from "./paymentForm";
import customStyles from "./stripeCard.module.scss";
import { MdOutlinePayments } from "react-icons/md";

function StripeCard() {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    const publishableKey: any =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    setStripePromise(loadStripe(publishableKey));
  }, []);

  //   useEffect(() => {
  //     fetch("/create-payment-intent", {
  //       method: "POST",
  //       headers: { contentType: "plain/TEXT" },
  //       body: JSON.stringify({}),
  //     }).then(async (result) => {
  //       var { clientSecret } = await result.json();
  //       setClientSecret(clientSecret);
  //     });
  //   }, []);

  return (
    <div>
      <div className="text-center">
        <MdOutlinePayments size={60} />
      </div>
      <div className={customStyles.title}>New Payment Method</div>
      {stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{ mode: "setup", currency: "usd" }}
        >
          <PaymentForm />
        </Elements>
      )}
    </div>
  );
}

export default StripeCard;
