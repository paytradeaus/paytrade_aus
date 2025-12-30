import React, { useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import { Modal, Form, Button } from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import customStyles from "./paymentCardElement.module.scss";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import CheckoutForm from "./checkoutForm";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  RootState,
  useSubscriptionSelector,
} from "@/redux/subscriptions.store";
import { urlQueries } from "../manageSubscriptions.constant";
import { useLoaderContext } from "@/context/useLoader";

const stripePromise = loadStripe(
  "pk_test_51P3Exi09CG4uDqsqlIDvq51ye0erWymxSSb1Glv2kKT2wqEDFaL1ouLjTcAv2yqvAbKTrhruTYYI0Zwos6emYL1300o3YeI8p6"
);

export default function PaymentCardElement() {
  const router = useRouter();
  const queryParams: any = useSearchParams();
  const screenType = queryParams.get("type");

  const chosenPlan: any = useSubscriptionSelector(
    (state: RootState) => state?.subscription?.selectedPlanDetails
  );

  useEffect(() => {
    if (!chosenPlan && screenType !== urlQueries.UPDATE_PAYMENT) {
      router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
    }
  }, []);

  function onClose() {
    router.back();
  }

  return (
    <Modal
      show={true}
      fullscreen={true}
      scrollable
      className={customStyles.fullScreenModalContainer}
    >
      <Modal.Header className={customStyles.header}>
        <Image src={Logo.src} alt="Pay trade" width={80} height={40} />
        <XLg className={customStyles.closeImage} onClick={onClose} />
      </Modal.Header>
      <Modal.Body className={customStyles.modalBody}>
        <div className={customStyles.modalContent}>
          <h5 className={customStyles.modalTitle}>Add new payment method</h5>
          <Form>
            <Form.Group controlId="formCountry" className="mt-3">
              <Form.Label>Country</Form.Label>
              <Form.Control as="select" defaultValue="US">
                <option>Australia</option>
                <option>UK</option>

                {/* Add more countries as needed */}
              </Form.Control>
            </Form.Group>

            <Form.Group className="my-3">
              <Form.Label>Payment Method</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  label="Credit/Debit Card"
                  name="paymentMethod"
                  id="creditCard"
                  defaultChecked
                />
                <Form.Check
                  type="radio"
                  label="Bank Transfer"
                  name="paymentMethod"
                  id="bankTransfer"
                  disabled
                />
              </div>
            </Form.Group>

            <Elements stripe={stripePromise}>
              <CheckoutForm />
            </Elements>
          </Form>
        </div>
      </Modal.Body>
      <Modal.Footer className={customStyles.footer}>
        <Button className={`${customStyles.closeButton}`} onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
