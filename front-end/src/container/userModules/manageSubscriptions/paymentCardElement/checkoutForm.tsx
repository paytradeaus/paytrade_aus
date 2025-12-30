import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button, Col, Form, Row } from "react-bootstrap";
import customStyles from "./paymentCardElement.module.scss";
import { useSubscriptionDispatch } from "@/redux/subscriptions.store";
import { setStripeCardPaymentDetails } from "@/redux/slices/SubscriptionDetails";
import { useRouter, useSearchParams } from "next/navigation";
import { ApplicationURLS } from "@/common/applicationURLS";
import { toast } from "@/app/Toaster";
import {
  paymentMethodSuccess,
  urlQueries,
} from "../manageSubscriptions.constant";
import { getCompanyIdFromCookies } from "@/common/commonFunctions";
import { associatePaymentMethodToCustomer } from "../manageSubscriptions.function";
import { useLoaderContext } from "@/context/useLoader";

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const dispatch: any = useSubscriptionDispatch();
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const queryParams: any = useSearchParams();
  const screenType = queryParams.get("type");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    const { error, paymentMethod }: any = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement!,
    });

    if (error) {
      setError(error?.message);
      dispatch(setStripeCardPaymentDetails(null));
    } else {
      if (screenType === urlQueries.UPDATE_PAYMENT) {
        handleAddCard(paymentMethod?.id);
      } else {
        router.push(ApplicationURLS.USER_SUBSCRIPTIONS_BILLING);
      }
      setError("");
      dispatch(setStripeCardPaymentDetails(paymentMethod));

      // toast.success(paymentMethodSuccess);
    }
    setLoading(false);
  }

  async function handleAddCard(paymentMethodId: string) {
    try {
      setLoader(true);
      const postData = {
        company_id: getCompanyIdFromCookies(),
        payment_method_id: paymentMethodId,
      };
      const response = await associatePaymentMethodToCustomer(postData);
      if (response) {
        router.back();
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  return (
    <Form>
      <Form.Group>
        <Form.Label>Card Information</Form.Label>
        <CardElement className={customStyles.cardElement} />
      </Form.Group>
      {error && <div className={customStyles.errorMessage}>{error}</div>}
      <Row className="mt-3">
        <Col>
          <Button
            variant="primary"
            onClick={handleSubmit}
            className={customStyles.submitButton}
            disabled={!stripe || loading}
          >
            {loading ? "Processing..." : " Submit"}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default CheckoutForm;
