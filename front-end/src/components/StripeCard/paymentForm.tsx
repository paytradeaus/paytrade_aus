import {
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import customStyles from "./stripeCard.module.scss";
import FormButton from "../Button/button";

export default function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/completion`,
      },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message);
    } else {
      setMessage("An unexpected error occurred.");
    }

    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      {/* <AddressElement options={{ mode: "shipping" }} /> */}
      {stripe && elements && (
        <div
          key={`default-checkbox`}
          className={customStyles.confirmationRadio}
        >
          <Form.Check // prettier-ignore
            type={"checkbox"}
            id={`default-checkbox`}
            label={
              "By selecting Save and use, I understand that I am enrolling in a pay Trade subscription program. I authorise Pay Trade, to charge my payment method for subscription(s) selected, unless i cancel. To cancel, sign in and go to billing and subscriptions if you are receiving discounted price, you will automatically be charged the full price when the discount period ends."
            }
          />
        </div>
      )}

      {stripe && elements && (
        <div>
          {/* <Button
            className={`${customStyles.button} ${customStyles.closeButton}`}
            // onClick={() => onClose()}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className={customStyles.button}
            // onClick={() => formik.handleSubmit()}
            disabled={isProcessing || !stripe || !elements}
            id="submit"
            type="submit"
          >
            {isProcessing ? "Processing ... " : "Save"}
          </Button> */}
          <FormButton className={customStyles.buttonStyles} type="submit">
            {isProcessing ? "Processing ... " : "Save"}
          </FormButton>
          <Button
            className={customStyles.SkipButtonStyles}
            type="button"
            // onClick={handleFormCancelClick}
          >
            Cancel
          </Button>
        </div>
      )}
      {/* Show any error or success messages */}
      {message && <div id="payment-message">{message}</div>}
    </form>
  );
}
