"use client";
import React, { useEffect, useState } from "react";
import styles from "./manageSubscriptions.module.scss";
import { BsFillCaretDownFill, BsFillCaretRightFill } from "react-icons/bs";
import { Card, Modal } from "react-bootstrap";
import { PencilSquare, XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../public/assets/payTradeLogo.png";
import { useRouter } from "next/navigation";
import {
  getSubscriptionDetailsByCompanyId,
  cancelSubscriptionForUser,
} from "./manageSubscriptions.function";
import { useLoaderContext } from "@/context/useLoader";
import { formatDate, getCompanyIdFromCookies } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  getAuthToken,
  getCompanyProfilesWithLogos,
} from "@/app/api/CompanyRegistrationServices";
import { getCookie, setCookie } from "cookies-next";
import { AppModal } from "@/components/model/model";
import { useSubscriptionDispatch } from "@/redux/subscriptions.store";
import { setSelectedPlanDetails } from "@/redux/slices/SubscriptionDetails";
import { useTokenDetails } from "@/common/commonHooks";
import {
  durationType,
  planType,
  subscriptionStatus,
  urlQueries,
} from "./manageSubscriptions.constant";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";
import { commonCookies } from "@/common/constants/general";
import { jwtDecode } from "jwt-decode";
import { CustomJwtPayload } from "@/container/userLogin/userLoginPage";
import CryptoJS from "crypto-js";

function ManageSubscriptions() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const { setLoader }: any = useLoaderContext();
  const [subscriptionData, setSubscriptionData] = useState<any>([]);

  const dispatch: any = useSubscriptionDispatch();
  const [openModal, setOpenModal] = useState(false);
  const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    updateAccessToken();
    getSubscriptionPlanTypes();
  }, []);

  function onClose() {
    const navigatedFrom =
      sessionStorage.getItem(commonCookies.NAVIGATED_FROM) ??
      ApplicationURLS.USER_DASHBOARD;

    sessionStorage.removeItem(commonCookies.NAVIGATED_FROM);

    router.push(navigatedFrom);
  }

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

      const profiles = await getCompanyProfilesWithLogos();

      const companyId = Number(getCookie("companyId"));

      const data = profiles?.filter(
        (v: any, i: number) => String(v?.company_id) === String(companyId)
      );
      if (data?.length > 0) {
        dispatch(setUpdatedCompany(data[0]));
      }
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
      // router.push(ApplicationURLS.USER_DASHBOARD); // Redirect to dashboard after cancellation
      getSubscriptionPlanTypes();
    }
  }

  function handleAnnualBilling() {
    dispatch(
      setSelectedPlanDetails({
        ...subscriptionData,
        plan_price: `${subscriptionData?.annual_price_amount} /yr`,
        price_id: subscriptionData?.annual_price_id,
        active_plan: subscriptionData,
      })
    );
    router.push(ApplicationURLS.USER_SUBSCRIPTIONS_BILLING);
  }

  function isExpiryDateGreaterThanPresent() {
    if (subscriptionData?.expiry_date)
      return new Date(subscriptionData?.expiry_date) > new Date();
    else return false;
  }

  function isMonthOrYear(planPrice: number, isBasic?: boolean) {
    if (planPrice) {
      return `${
        !isBasic
          ? subscriptionData?.bill_cycle === durationType.MONTHLY
            ? "/mo"
            : "/yr"
          : ""
      }`;
    } else {
      return "";
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
              {subscriptionData?.card_type && (
                <div className={styles.details}>
                  <strong>Payment method</strong>

                  <p>
                    <span className={styles.cardInfo}>
                      <i className="bi bi-credit-card-2-front"></i>{" "}
                      {getCardDetails()}
                      {subscriptionData?.status !==
                        subscriptionStatus.CANCELLED && (
                        <PencilSquare
                          className={styles.editIcon}
                          onClick={() =>
                            router.push(
                              `${ApplicationURLS.USER_SUBSCRIPTION_MANAGE_CARDS}?type=${urlQueries.UPDATE_PAYMENT}&subscription=${subscriptionData?.subscription_id}`
                            )
                          }
                        />
                      )}
                    </span>
                  </p>
                </div>
              )}
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
                  <div className="d-flex align-items-center my-2">
                    {subscriptionData?.plan_type !== planType.FREE && (
                      <span className={styles.badge}>
                        {subscriptionData?.status
                          ? subscriptionData?.status.toUpperCase()
                          : ""}
                      </span>
                    )}
                    {subscriptionData?.expiry_date && (
                      <span className={styles.planDuration}>
                        {`${
                          subscriptionData?.status ===
                          subscriptionStatus.CANCELLED
                            ? "Plan expires"
                            : "Next charge"
                        } on ${formatDate(subscriptionData?.expiry_date)}`}
                      </span>
                    )}
                  </div>
                  <div className="d-flex align-items-center">
                    <h2>{subscriptionData?.amount}</h2>
                    <p className={`${styles.lightGrey} ${"my-1"}`}>
                      {isMonthOrYear(
                        subscriptionData?.amount,
                        subscriptionData?.plan_type === planType.FREE
                      )}{" "}
                    </p>
                  </div>
                  <p className={styles.lightGrey}> + VAT</p>
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
                    {subscriptionData?.plan_type !== planType.FREE &&
                      subscriptionData?.status !==
                        subscriptionStatus.CANCELLED && (
                        <li>
                          <div
                            onClick={handleCancelSubscription}
                            className={styles.furtherPages}
                          >
                            Cancel subscription
                          </div>
                        </li>
                      )}
                    {subscriptionData?.has_upgrade_plans &&
                      subscriptionData?.status !==
                        subscriptionStatus.CANCELLED && (
                        <div
                          onClick={() =>
                            router.push(
                              ApplicationURLS.USER_SUBSCRIPTION_UPGRADE
                            )
                          }
                          className={styles.furtherPages}
                        >
                          Upgrade your plan
                        </div>
                      )}
                    {subscriptionData?.has_upgrade_plans &&
                      subscriptionData?.has_annual_billing &&
                      subscriptionData?.status !==
                        subscriptionStatus.CANCELLED &&
                      isExpiryDateGreaterThanPresent() && (
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
}

export default ManageSubscriptions;
