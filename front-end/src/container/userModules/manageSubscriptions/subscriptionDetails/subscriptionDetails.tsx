"use client";
import React, { useEffect, useState } from "react";
import styles from "./subscriptionDetails.module.scss";
import { BsFillCaretDownFill, BsFillCaretRightFill } from "react-icons/bs";
import { Card, Modal } from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import { useRouter } from "next/navigation";
import { getSubscriptionDetailsByCompanyId } from "../manageSubscriptions.function";
import { useLoaderContext } from "@/context/useLoader";
import { formatDate, getCompanyIdFromCookies } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ADMIN_ROLE, USER_PRIMARY_ADMIN } from "@/common/constants/roles";
import { RootState, useAppSelector } from "@/redux/store";
import { getAuthToken } from "@/app/api/CompanyRegistrationServices";
import { setCookie } from "cookies-next";
import { cancelSubscriptionForUser } from "./subscriptionDetails.function";
import { AppModal } from "@/components/model/model";
import { useSubscriptionDispatch } from "@/redux/subscriptions.store";
import { setSelectedPlanDetails } from "@/redux/slices/SubscriptionDetails";
import { useTokenDetails } from "@/common/commonHooks";
import { CustomJwtPayload } from "@/container/userLogin/userLoginPage";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";

const SubscriptionDetails = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const { setLoader }: any = useLoaderContext();
  const [subscriptionData, setSubscriptionData] = useState<any>([]);

  const dispatch: any = useSubscriptionDispatch();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>(null);
  const { decodeTokenData } = useTokenDetails();

  function onClose() {
    router.push(ApplicationURLS.USER_DASHBOARD);
  }

  useEffect(() => {
    updateAccessToken();
    getSubscriptionPlanTypes();
  }, []);

  async function getSubscriptionPlanTypes() {
    try {
      setLoader(true);
      const response: any = await getSubscriptionDetailsByCompanyId();

      if (response) {
        setSubscriptionData(response);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function updateAccessToken() {
    if (!decodeTokenData?.emailId) return;
    try {
      const newToken: any = await getAuthToken(decodeTokenData?.emailId, false);

      localStorage.setItem("accessToken", newToken);
      const decodeTokensData: CustomJwtPayload = jwtDecode(newToken);

      const userDetails = JSON.parse(JSON.stringify(decodeTokensData));
      //changes for cookie storage issue
      const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
        JSON.stringify({
          role: userDetails?.role,
          status: userDetails?.status,
          id: userDetails?.id,
          userName: userDetails?.userName,
          userFirstName: userDetails?.userFirstName,
          userLastName: userDetails?.userLastName,
          emailId: userDetails?.emailId,
          isAdmin: userDetails?.isAdmin,
          timezone: userDetails?.timezone,
          iat: userDetails?.iat,
          exp: userDetails?.exp,
        }),
        "token-verification"
      ).toString();

      setCookie("accessVerification", userTokenDetailsForMiddleware);

      // setCookie("accessToken", newToken);
    } catch (err: any) {
      console.log("updateAccessToken ~ err:", err);
    }
  }

  function getCardDetails() {
    if (
      subscriptionData?.card_type ||
      subscriptionData?.last_four_digits ||
      subscriptionData?.expiry_month ||
      subscriptionData?.expiry_year
    ) {
      return `${subscriptionData?.card_type} *${subscriptionData?.last_four_digits}
(expires ${subscriptionData?.expiry_month}/${subscriptionData?.expiry_year})`;
    } else {
      return "";
    }
  }

  function handleCancelSubscription() {
    setActionData({ option: "Cancel", id: getCompanyIdFromCookies() });
    setOpenModal(true);
  }

  async function handleConfirmCancelSubscription() {
    setLoader(true);
    const success = await cancelSubscriptionForUser({
      companyId: getCompanyIdFromCookies(),
    });
    setLoader(false);
    setOpenModal(false);
    if (success) {
      router.push(ApplicationURLS.USER_DASHBOARD); // Redirect to dashboard after cancellation
    }
  }

  function handleAnnualBilling() {
    dispatch(
      setSelectedPlanDetails({
        ...subscriptionData,
        plan_price: `${subscriptionData?.annual_price_amount} /yr`,
        price_id: subscriptionData?.annual_price_id,
      })
    );
    router.push(ApplicationURLS.USER_SUBSCRIPTIONS_BILLING);
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
        <div className={`container ${styles.subscriptionContainer}`}>
          <div className="row">
            <div className="col-12">
              <h2 className="mb-4">{subscriptionData?.company_name ?? ""}</h2>
              <p>
                Manage by updating your subscription details and looking over
                your product info.
              </p>
            </div>
          </div>

          <div className="row my-4">
            <div className="col-12 col-md-6">
              <div className={styles.details}>
                <strong>Company ID</strong>
                <p>{subscriptionData?.company_id ?? ""}</p>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className={styles.details}>
                <strong>Payment method</strong>
                <p>
                  <span className={styles.cardInfo}>
                    <i className="bi bi-credit-card-2-front"></i>{" "}
                    {getCardDetails()}
                    {/* <PencilSquare className={styles.editIcon} /> */}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className={styles.subscriptionContainer}>
            <div
              className={styles.collapseBar}
              onClick={() => setIsOpen(!isOpen)}
            >
              <h5>Your Subscriptions</h5>
              <span className={styles.collapseIcon}>
                {isOpen ? <BsFillCaretDownFill /> : <BsFillCaretRightFill />}
              </span>
            </div>
            {isOpen && (
              <Card className={styles.subscriptionBox}>
                <div className={styles.planBox}>
                  <h5>{subscriptionData?.plan_name}</h5>
                  <span className={styles.badge}>SUBSCRIBED</span>
                  <p>
                    Next charge on{" "}
                    {subscriptionData?.expiry_date
                      ? formatDate(subscriptionData?.expiry_date)
                      : ""}
                  </p>
                  <h2>{subscriptionData?.amount} + VAT</h2>
                  <ul className={styles.actionList}>
                    <li>
                      <div
                        onClick={() =>
                          router.push(
                            ApplicationURLS.USER_SUBSCRIPTION_PAYMENT_HISTORY
                          )
                        }
                        className={styles.furtherPages}
                      >
                        View payment history
                      </div>
                    </li>
                    <li>
                      <div
                        onClick={handleCancelSubscription}
                        className={styles.furtherPages}
                      >
                        Cancel subscription
                      </div>
                    </li>
                    {subscriptionData?.has_upgrade_plans && (
                      <div
                        onClick={() =>
                          router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE)
                        }
                        className={styles.furtherPages}
                      >
                        Upgrade your plan
                      </div>
                    )}
                    {subscriptionData?.has_upgrade_plans &&
                      subscriptionData?.has_annual_billing && (
                        <li>
                          <div
                            onClick={() => handleAnnualBilling()}
                            className={styles.furtherPages}
                          >
                            Switch to annual billing
                          </div>
                        </li>
                      )}
                  </ul>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Modal.Body>
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Continue to cancel"
        secondButtonLabel="No"
        modalHeading="Sorry To See You Go"
        modalBodyTitle=""
        modalBodyContent="Are you sure you want to cancel your subscription? This action cannot be undone."
        onConfirm={handleConfirmCancelSubscription}
      />
    </Modal>
  );
};

export default SubscriptionDetails;
