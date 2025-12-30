"use client";
import React, { useEffect, useState } from "react";
import styles from "./paymentMethodCards.module.scss";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Modal,
  Form,
} from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter, useSearchParams } from "next/navigation";
import Mastercard from "../../../../../public/assets/mastercard-logo.png";
import {
  deleteCardByPaymentMethodId,
  getAllCardDetailsByCompanyId,
  setAsDefaultByPaymentMethodId,
  updatePaymentMethodForSubscription,
} from "../manageSubscriptions.function";
import { useLoaderContext } from "@/context/useLoader";
import { AppModal } from "@/components/model/model";
import {
  cardButtons,
  confirmationModalMessage,
  urlQueries,
} from "../manageSubscriptions.constant";
import FormButton from "@/components/Button/button";
import { MdDelete } from "react-icons/md";
import { getCookie } from "cookies-next";
import { getCompanyIdFromCookies } from "@/common/commonFunctions";

interface CardActionProps {
  display: boolean;
  type: string;
  data?: any;
}

function PaymentMethods() {
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [allExistingCardDetails, setAllExistingCardDetails] = useState<any>([]);
  const queryParams: any = useSearchParams();
  const screenType = queryParams.get("type");

  const subscriptionId = queryParams.get("subscription");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState<CardActionProps>({
      display: false,
      type: "",
      data: [],
    });

  useEffect(() => {
    getExistingCardDetails();
  }, []);

  function onClose() {
    if (screenType === urlQueries.UPDATE_PAYMENT) {
      router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
    } else {
      router.back();
    }
  }

  function handleAddPayment() {
    if (screenType === urlQueries.UPDATE_PAYMENT) {
      router.push(
        `${ApplicationURLS.USER_SUBSCRIPTIONS_PAYMENT}?type=${urlQueries.UPDATE_PAYMENT}`
      );
    } else {
      router.push(ApplicationURLS.USER_SUBSCRIPTIONS_PAYMENT);
    }
  }

  async function getExistingCardDetails() {
    try {
      setLoader(true);
      const response: any = await getAllCardDetailsByCompanyId();

      if (response) {
        setAllExistingCardDetails(response);
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function handleConfirmation() {
    try {
      setLoader(true);
      if (displayConfirmationModal?.type === cardButtons.UPDATE_PAYMENT) {
        await updatePaymentMethod();
      } else {
        await deleteExistingCard();
      }
      setLoader(false);
      setDisplayConfirmationModal((prev: any) => {
        return { ...prev, display: false };
      });
    } catch (err: any) {
      setDisplayConfirmationModal((prev: any) => {
        return { ...prev, display: false };
      });
      setLoader(false);
    }
  }

  async function setAsDefaultCard(cardData: any) {
    setLoader(true);
    try {
      const postData = {
        customer_id: cardData?.customer_id || null,
        payment_method_id: cardData?.payment_method_id || null,
      };

      const response: any = await setAsDefaultByPaymentMethodId(postData);

      if (response) {
        await getExistingCardDetails();
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function deleteExistingCard() {
    try {
      const postData = {
        paymentMethodId:
          displayConfirmationModal?.data?.payment_method_id || null,
        companyId: Number(getCookie("companyId")) || null,
      };

      const response: any = await deleteCardByPaymentMethodId(postData);

      if (response) {
        setSelectedRow(null);
        await getExistingCardDetails();
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  function dynamicCardBodyStyle(cardData: any) {
    if (
      screenType === urlQueries.UPDATE_PAYMENT &&
      selectedRow?.payment_method_id === cardData?.payment_method_id
    ) {
      return styles?.selectedCardBody;
    } else if (screenType === urlQueries.UPDATE_PAYMENT) {
      return styles.cardBody;
    } else {
      return "";
    }
  }

  async function updatePaymentMethod() {
    try {
      const postData = {
        payment_method_id:
          displayConfirmationModal?.data?.payment_method_id ||
          selectedRow?.payment_method_id ||
          null,
        subscription_id: subscriptionId ? +subscriptionId : null,
      };

      const response: any = await updatePaymentMethodForSubscription(postData);

      if (response) {
        router.push(ApplicationURLS.USER_MANAGE_SUBSCRIPTIONS);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  function dynamicConfirmationMessage() {
    if (displayConfirmationModal?.type === cardButtons.SET_DEFAULT) {
      return confirmationModalMessage.CHANGE_DEFAULT_CARD;
    } else if (displayConfirmationModal?.type === cardButtons.UPDATE_PAYMENT) {
      return confirmationModalMessage.UPDATE_PAYMENT_CARD;
    } else {
      return confirmationModalMessage.DELETE_PAYMENT_CARD;
    }
  }

  function handleOnCardClick(cardData: any) {
    if (
      allExistingCardDetails.some(
        (data: any) =>
          data?.payment_method_id === selectedRow?.payment_method_id
      )
    ) {
      setSelectedRow(null);
    } else if (screenType === urlQueries.UPDATE_PAYMENT) {
      setSelectedRow(cardData);
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
        <Container className={styles.paymentMethodsContainer}>
          <Row>
            <Col className="text-center">
              <h1 className={styles.mainHeader}>Payment Methods</h1>
              <p className={styles.subHeader}>Manage the payment methods</p>
            </Col>
          </Row>

          <Row className="justify-content-center">
            <Col xs={12} md={10} lg={8} className={styles.boxContainer}>
              <Row className={styles.paymentInfoHeader}>
                <Col xs={12}>
                  <h2>Payment info</h2>
                  <p>Save the credit cards and accounts you like to pay with</p>

                  <Button
                    variant="outline-primary"
                    className={styles.addPaymentBtn}
                    onClick={() => handleAddPayment()}
                  >
                    Add Payment Method
                  </Button>
                </Col>
              </Row>

              <Row className={styles.paymentMethodList}>
                {allExistingCardDetails?.length > 0 &&
                  allExistingCardDetails.map((cardData: any) => (
                    <Col
                      xs={12}
                      key={cardData.payment_method_id}
                      className={styles.paymentCardCol}
                    >
                      <Card className={styles.paymentCard}>
                        <Card.Body
                          className={`${"border border-1 rounded"} ${dynamicCardBodyStyle(
                            cardData
                          )}`}
                          onClick={() => handleOnCardClick(cardData)}
                        >
                          <Row justify className="align-content-center px-0">
                            <Col
                              className="d-flex"
                              xs={12}
                              sm={12}
                              md={12}
                              lg={6}
                            >
                              <div className={styles.paymentCardIcon}>
                                <img
                                  src={Mastercard.src}
                                  alt={`${cardData.card_type} icon`}
                                />
                              </div>
                              <div className={styles.paymentCardDetails}>
                                <div className={styles.cardNumber}>
                                  {cardData.card_type} *
                                  {cardData.last_four_digits}
                                </div>
                                <div className={styles.cardExpiry}>
                                  Expires:{" "}
                                  {`${cardData.expiry_month}/${cardData?.expiry_year}`}
                                </div>
                              </div>
                            </Col>
                            <Col
                              className={`${
                                styles.cardButtonRow
                              } ${"display-flex justify-content-end"}`}
                              xs={12}
                              sm={12}
                              md={12}
                              lg={6}
                            >
                              <Row className="px-2 w-100">
                                <Col
                                  xs={10}
                                  className={
                                    "d-flex justify-content-end align-items-center"
                                  }
                                >
                                  {/* <Button
                                    variant="dark"
                                    className={
                                      cardData?.is_default
                                        ? `${styles.activeCard} ${styles.cardButton}`
                                        : styles.cardButton
                                    }
                                    onClick={() =>
                                      cardData?.is_default
                                        ? {}
                                        : setDisplayConfirmationModal({
                                            display: true,
                                            type: cardButtons.SET_DEFAULT,
                                            data: cardData,
                                          })
                                    }
                                  >
                                    {cardData?.is_default
                                      ? "Active Card"
                                      : "Set as Default"}
                                  </Button> */}
                                  <Form.Group>
                                    <Form.Check
                                      type="radio"
                                      checked={cardData?.is_default}
                                      label={
                                        cardData?.is_default
                                          ? "Active Card"
                                          : "Set as Default"
                                      }
                                      name="paymentMethod"
                                      onChange={() =>
                                        cardData?.is_default
                                          ? {}
                                          : setAsDefaultCard(cardData)
                                      }
                                      id={
                                        cardData?.is_default
                                          ? "Active Card"
                                          : "Set as Default"
                                      }
                                      disabled={cardData?.is_default}
                                      className={`${"my-3"} ${
                                        styles.radioButton
                                      }`}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col
                                  xs={2}
                                  className="d-flex justify-content-start align-items-center"
                                >
                                  {/* <Button
                                    variant="danger"
                                    className={styles.cardButton}
                                    disabled={cardData?.is_default}
                                    onClick={() =>
                                      cardData?.is_default
                                        ? {}
                                        : setDisplayConfirmationModal({
                                            display: true,
                                            type: cardButtons.DELETE,
                                            data: cardData,
                                          })
                                    }
                                  >
                                    Delete
                                  </Button> */}
                                  <div
                                    title={
                                      cardData?.is_default
                                        ? "Active card cannot be deleted"
                                        : "Delete"
                                    }
                                  >
                                    <MdDelete
                                      size={24}
                                      onClick={() =>
                                        cardData?.is_default
                                          ? {}
                                          : setDisplayConfirmationModal({
                                              display: true,
                                              type: cardButtons.DELETE,
                                              data: cardData,
                                            })
                                      }
                                      className={
                                        cardData?.is_default
                                          ? styles.disableDeleteCardIcon
                                          : styles.deleteCard
                                      }
                                    />
                                  </div>
                                </Col>
                              </Row>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
              </Row>
              {screenType === urlQueries.UPDATE_PAYMENT && (
                <div className="d-flex justify-content-center">
                  <FormButton
                    type="button"
                    className={styles.updatePaymentButton}
                    onClick={() =>
                      setDisplayConfirmationModal({
                        display: true,
                        type: cardButtons.UPDATE_PAYMENT,
                      })
                    }
                    disabled={!selectedRow?.payment_method_id}
                  >
                    Update Payment Method
                  </FormButton>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </Modal.Body>

      {/* <Modal.Footer className={styles.footer}>
        <Button
          className={`${styles.closeButton} ${closeButtonStyle}`}
          onClick={onClose}
        >
          Close
        </Button>
      </Modal.Footer> */}
      {displayConfirmationModal?.display && (
        <AppModal
          show={displayConfirmationModal?.display}
          onHide={() =>
            setDisplayConfirmationModal((prev: any) => {
              return { ...prev, display: false };
            })
          }
          secondButtonLabel="No"
          firstButtonLabel="Yes"
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={dynamicConfirmationMessage()}
          onConfirm={() => handleConfirmation()}
        />
      )}
    </Modal>
  );
}

export default PaymentMethods;
