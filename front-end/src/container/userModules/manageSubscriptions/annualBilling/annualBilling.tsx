"use client";

import React, { Fragment, useEffect, useState } from "react";
import styles from "./annualBilling.module.scss";
import { Card, Button, Form, Row, Col, Modal } from "react-bootstrap";
import creditCardLogo from "../../../../../public/assets/mastercard-logo.png";
import { Pencil, XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import { useRouter } from "next/navigation";
import {
  RootState,
  useSubscriptionSelector,
} from "@/redux/subscriptions.store";
import { ApplicationURLS } from "@/common/applicationURLS";
import { BsPlusCircle } from "react-icons/bs";
import {
  getCardDetailsByCompanyId,
  upgradeSubscriptionPlan,
} from "../manageSubscriptions.function";

import { useLoaderContext } from "@/context/useLoader";
import { getCompanyIdFromCookies } from "@/common/commonFunctions";
import SignatureUploader from "@/components/SignatureUploader";

function AnnualBilling() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { setLoader }: any = useLoaderContext();
  const [existingCardDetails, setExistingCardDetails] = useState<any>([]);
  const [displayAddPaymentButton, setDisplayAddPaymentButton] = useState(false);
  const [displaySignatureUploader, setDisplaySignatureUploader] =
    useState(false);

  const chosenPlan: any = useSubscriptionSelector(
    (state: RootState) => state?.subscription?.selectedPlanDetails
  );

  const addedPaymentDetails: any = useSubscriptionSelector(
    (state: RootState) => state?.subscription?.cardPaymentDetails
  );

  const router = useRouter();

  useEffect(() => {
    getExistingCardDetails();
  }, []);

  async function getExistingCardDetails() {
    try {
      setLoader(true);
      const response: any = await getCardDetailsByCompanyId();

      if (response) {
        setExistingCardDetails(response);
      }
      setDisplayAddPaymentButton(!response?.payment_method_id);

      if (!chosenPlan && !response?.payment_method_id) {
        router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  function onClose() {
    router.back();
  }

  function displaySubscriptionBtn() {
    if (isPlanChosen() && isAuthorized) {
      return false;
    } else {
      return true;
    }
  }

  async function handleSubscription(
    signedSignature?: string,
    signatureType?: string
  ) {
    try {
      setLoader(true);
      const postData = {
        createOrUpdateSubscriptionInput: {
          company_id: getCompanyIdFromCookies(),
          price_id:
            chosenPlan?.price_id || existingCardDetails?.payment_method_id,
          payment_method_id:
            addedPaymentDetails?.id || existingCardDetails?.payment_method_id,

          signature: signedSignature ?? chosenPlan?.active_plan?.signature,
          signature_type:
            signatureType ?? chosenPlan?.active_plan?.signature_type,
        },
      };

      const response = await upgradeSubscriptionPlan(postData);
      if (response) {
        router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  function isPlanChosen() {
    return addedPaymentDetails?.id || existingCardDetails?.payment_method_id;
  }

  function handleSignature() {
    if (chosenPlan?.active_plan?.signature) {
      handleSubscription();
    } else {
      setDisplaySignatureUploader(true);
    }
  }

  return (
    <Modal
      show={true}
      fullscreen={true}
      scrollable
      className="full-screen-modal-container"
    >
      <Modal.Header className={styles.header}>
        <Image src={Logo.src} alt="Pay trade" width={80} height={40} />
        <XLg className={styles.closeImage} onClick={onClose} />
      </Modal.Header>
      <Modal.Body>
        <div className={styles.billingContainer}>
          <Row>
            <Col md={6} className={styles.subscriptionSection}>
              <Card className={styles.subscriptionCard}>
                <Card.Body>
                  <Card.Title className={styles.title}>
                    Subscription summary
                  </Card.Title>
                  <div className={styles.subscriptionDetails}>
                    <h4>{chosenPlan?.plan_name}</h4>
                    <h3 className={styles.price}>
                      {chosenPlan?.plan_price}{" "}
                      <span className={styles.vat}>+ VAT</span>
                    </h3>
                    {/* <p className={styles.dueDate}>
                      Due on your next annual billing date: 10/08/2025
                    </p> */}
                    <hr />
                    <p className={styles.totalDue}>What you’ll pay today</p>
                    <h4 className={styles.discountedPrice}>
                      {`You’ll pay ${chosenPlan?.plan_price} (+ VAT) to cover the rest of
                      this billing period.`}
                    </h4>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className={styles.billingInfoSection}>
              <Card className={styles.billingCard}>
                <Card.Body>
                  <Card.Title className={styles.title}>
                    Review your billing info
                  </Card.Title>
                  <Card.Text>
                    <strong>Payment method</strong>
                  </Card.Text>
                  <div className={styles.paymentMethod}>
                    {isPlanChosen() && (
                      <Fragment>
                        <img
                          src={creditCardLogo.src}
                          alt="MasterCard"
                          className={styles.cardImage}
                        />
                        <span>{`${
                          addedPaymentDetails?.card?.brand ||
                          existingCardDetails?.card_type
                        } *${
                          addedPaymentDetails?.card?.last4 ||
                          existingCardDetails?.last_four_digits
                        } (expires ${
                          addedPaymentDetails?.card?.exp_month ||
                          existingCardDetails?.expiry_month
                        }/${
                          addedPaymentDetails?.card?.exp_year ||
                          existingCardDetails?.expiry_year
                        })`}</span>
                        {isPlanChosen() && (
                          <span className={styles.editIcon}>
                            <Pencil
                              onClick={() =>
                                router.push(
                                  ApplicationURLS.USER_SUBSCRIPTION_MANAGE_CARDS
                                )
                              }
                            />
                          </span>
                        )}
                      </Fragment>
                    )}
                    {!isPlanChosen() &&
                      !!chosenPlan?.plan_price &&
                      displayAddPaymentButton && (
                        <Button
                          variant="outline-primary"
                          className={styles.addPaymentButton}
                          onClick={() =>
                            router.push(
                              ApplicationURLS.USER_SUBSCRIPTIONS_PAYMENT
                            )
                          }
                        >
                          <BsPlusCircle className={styles.addPaymentIcon} />
                          Add Payment Method
                        </Button>
                      )}
                  </div>
                  <Form.Check
                    type="checkbox"
                    id="authorizePayment"
                    onChange={() => setIsAuthorized((prev: any) => !prev)}
                    checked={isAuthorized}
                    disabled={
                      !addedPaymentDetails?.id &&
                      !existingCardDetails?.payment_method_id
                    }
                    label={
                      <span>
                        I authorize payment at the discounted amount, if any,
                        for the time periods specified above. If the
                        Subscription Summary section indicates I’m in a free
                        trial, I authorize payment at the end of the trial
                        period. Otherwise, I authorize payment today. After any
                        discount period ends, I authorize payment for the then
                        current monthly or annual subscription price plus tax. I
                        understand I can cancel my subscription at any time by
                        going to the Billing & subscription page.
                      </span>
                    }
                  />
                  <Button
                    className={styles.switchButton}
                    disabled={displaySubscriptionBtn()}
                    // onClick={() => handleSubscription()}
                    onClick={() => handleSignature()}
                  >
                    Subscribe
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal.Body>
      <SignatureUploader
        isDisplay={displaySignatureUploader}
        handleClose={() => setDisplaySignatureUploader(false)}
        onConfirmation={(signature: string, type: string) => {
          setDisplaySignatureUploader(false);
          handleSubscription(signature, type);
        }}
      />
    </Modal>
  );
}

export default AnnualBilling;
