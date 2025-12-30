"use client";

import React, { Fragment, useEffect, useState } from "react";
import {
  Container,
  Col,
  Card,
  Button,
  Row,
  Table,
  Modal,
  Form,
} from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import customStyles from "./upgradePlan.module.scss";
import { useRouter } from "next/navigation";
import {
  fetchAdminListSubscriptionItems,
  fetchGetAllSubscriptionPlanListForUser,
  getSubscriptionDetailsByCompanyId,
} from "../manageSubscriptions.function";
import { useLoaderContext } from "@/context/useLoader";

import { FaCheck } from "react-icons/fa";
import { formatDate } from "@/common/commonFunctions";
import { durationType } from "../manageSubscriptions.constant";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useSubscriptionDispatch } from "@/redux/subscriptions.store";
import { setSelectedPlanDetails } from "@/redux/slices/SubscriptionDetails";

export default function UpgradePlan() {
  const dispatch: any = useSubscriptionDispatch();
  const [subscriptionPlanTypes, setSubscriptionPlanTypes] = useState<any>([]);

  const [isMonthlyPlanSelected, setIsMonthlyPlanSelected] = useState<boolean>();
  const { setLoader }: any = useLoaderContext();
  const [subscriptionPlansItems, setSubscriptionPlansItems] = useState<any>([]);
  const [activePlan, setActivePlan] = useState<any>(null);

  // const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    initialInvoke();
    // setActivePlan(getActivePlanFromToken());
  }, []);

  async function initialInvoke() {
    try {
      // Show loader before starting
      setLoader(true);

      // Execute all API calls in parallel
      await Promise.allSettled([
        getSubscriptionPlanTypes(),
        getSubscriptionPlanItems(),
        getExistingSubscriptionPlan(),
      ]);

      // Hide loader after all API calls are completed
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  const router = useRouter();

  function onClose() {
    router.back();
  }

  async function getSubscriptionPlanTypes() {
    try {
      const response: any = await fetchGetAllSubscriptionPlanListForUser();

      if (response) {
        setSubscriptionPlanTypes(response);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getSubscriptionPlanItems() {
    try {
      const response: any = await fetchAdminListSubscriptionItems();

      if (response) {
        setSubscriptionPlansItems(response?.subscriptionItems);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getExistingSubscriptionPlan() {
    try {
      const response: any = await getSubscriptionDetailsByCompanyId();

      if (response) {
        setActivePlan(response);
        setIsMonthlyPlanSelected(
          response?.bill_cycle === durationType?.MONTHLY
        );
        return true;
      }

      return false;
    } catch (err: any) {
      return false;
    }
  }

  function findActivePlan(
    planDetails: any,
    returnBoolean?: boolean,
    isBasicPlan?: boolean
  ) {
    // const activePlanObj = getActivePlanFromToken();

    if (!activePlan?.plan_id) return;

    const isCurrentPlan =
      planDetails?.plan_id == activePlan?.plan_id &&
      planDetails?.price_id == activePlan?.price_id;

    if (isBasicPlan) {
      if (planDetails?.plan_id == activePlan?.plan_id) {
        return true;
      } else {
        return false;
      }
    } else if (isCurrentPlan) {
      return returnBoolean ? true : "Stay on plan";
    } else {
      return returnBoolean ? false : "Choose plan";
    }
  }

  function isPlanItemActive(planItems: any, rowPlan: any) {
    if (planItems?.length > 0) {
      return planItems.some((data: any) => data?.id == rowPlan?.id);
    } else {
      return false;
    }
  }

  function isMonthOrYear(
    planType: string,
    planPrice: number,
    isBasic?: boolean
  ) {
    return `${planPrice}${
      !isBasic ? (planType === durationType.MONTHLY ? "/mo" : "/yr") : ""
    }`;
  }

  function paymentPlans() {
    return isMonthlyPlanSelected
      ? subscriptionPlanTypes?.monthly_plan_list
      : subscriptionPlanTypes?.yearly_plan_list;
  }

  function getExpiryTime(planDetails: any, isBasic?: boolean) {
    if (!activePlan?.plan_id) return;

    const isPlanActive = findActivePlan(planDetails, true);

    if (activePlan?.expiry_date && isPlanActive) {
      return `Expires on ${formatDate(activePlan?.expiry_date)}`;
    } else if (!activePlan?.expiry_date && isBasic) {
      return "Current plan";
    } else {
      return "Upgrade your plan";
    }
  }

  function handleRadioChange(e: any) {
    setIsMonthlyPlanSelected((prev: any) => !prev);
  }

  function onPlanUpgrade(data: any) {
    dispatch(
      setSelectedPlanDetails({
        ...data,
        plan_price: isMonthOrYear(data?.bill_cycle, data?.price),
        active_plan: activePlan,
      })
    );
    if (!findActivePlan(data, true)) {
      router.push(ApplicationURLS.USER_SUBSCRIPTIONS_BILLING);
    }
  }

  function getButtonVariant(data: any) {
    const isButtonActive = findActivePlan(data, true);

    if (isButtonActive) {
      return "dark";
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
      <Modal.Header className={customStyles.header}>
        <Image src={Logo.src} alt="Pay trade" width={80} height={40} />
        <XLg className={customStyles.closeImage} onClick={onClose} />
      </Modal.Header>
      <Modal.Body>
        {" "}
        <Container className="my-5">
          <h1 className="text-center mb-4">
            Let’s find the best fit for your business
          </h1>
          <Row className="justify-content-center">
            <div className="mb-3 d-flex justify-content-center">
              <Form.Check
                type={"radio"}
                value={durationType.MONTHLY}
                id={"monthly-radio"}
                label={"Monthly plan"}
                className="px-4"
                checked={isMonthlyPlanSelected}
                disabled={activePlan?.bill_cycle === durationType?.YEARLY}
                onChange={(e: any) => handleRadioChange(e)}
              />
              <Form.Check // prettier-ignore
                type={"radio"}
                value={durationType.YEARLY}
                id={"yearly-radio"}
                label={"Yearly plan"}
                checked={!isMonthlyPlanSelected}
                disabled={activePlan?.bill_cycle === durationType?.YEARLY}
                onChange={(e: any) => handleRadioChange(e)}
              />
            </div>
            {subscriptionPlanTypes?.monthly_plan_list?.length ||
            subscriptionPlanTypes?.yearly_plan_list?.length
              ? paymentPlans().map((data: any, index: number) => (
                  <Fragment key={index}>
                    {findActivePlan(
                      subscriptionPlanTypes?.free_plan,
                      false,
                      true
                    ) &&
                      index === 0 && (
                        <Col xs={12} md={4} lg={3}>
                          <Card className={"text-center mb-4 bg-light"}>
                            <Card.Header className={"bg-dark text-white"}>
                              {`${subscriptionPlanTypes?.free_plan?.plan_name} (Current Plan)`}
                            </Card.Header>
                            <Card.Body>
                              <Card.Title>
                                {data?.price
                                  ? isMonthOrYear(
                                      subscriptionPlanTypes?.free_plan
                                        ?.bill_cycle,
                                      subscriptionPlanTypes?.free_plan?.price,
                                      true
                                    )
                                  : "$0.00"}
                              </Card.Title>
                              <Card.Subtitle className="mb-2 text-muted">
                                + VAT
                              </Card.Subtitle>
                              <Button
                                variant={"dark"}
                                className={customStyles.cursorPointerNone}
                              >
                                Stay on plan
                              </Button>
                            </Card.Body>
                            <Card.Footer>Current plan</Card.Footer>
                          </Card>
                        </Col>
                      )}
                    <Col xs={12} md={4} lg={3}>
                      <Card
                        className={
                          data?.plan_type !== "Free"
                            ? "text-center mb-4"
                            : "text-center mb-4 bg-light"
                        }
                      >
                        <Card.Header
                          className={
                            findActivePlan(data, true)
                              ? "bg-dark text-white"
                              : ""
                          }
                        >
                          {data?.plan_name}{" "}
                          {`${
                            findActivePlan(data, true) ? "(Current Plan)" : ""
                          }`}
                        </Card.Header>
                        <Card.Body>
                          <Card.Title>
                            {data?.price
                              ? isMonthOrYear(data?.bill_cycle, data?.price)
                              : "$0.00"}
                          </Card.Title>
                          <Card.Subtitle className="mb-2 text-muted">
                            + VAT
                          </Card.Subtitle>
                          <Button
                            variant={getButtonVariant(data)}
                            className={
                              findActivePlan(data, true)
                                ? customStyles.cursorPointerNone
                                : customStyles.choosePlan
                            }
                            onClick={() => onPlanUpgrade(data)}
                          >
                            {findActivePlan(data)}
                          </Button>
                        </Card.Body>
                        <Card.Footer>{getExpiryTime(data)}</Card.Footer>
                      </Card>
                    </Col>
                  </Fragment>
                ))
              : ""}
          </Row>

          <Table
            striped
            bordered
            hover
            responsive
            className={customStyles.tableHeader}
          >
            <thead>
              <tr>
                <th>Feature</th>
                {(subscriptionPlanTypes?.monthly_plan_list?.length > 0 ||
                  subscriptionPlanTypes?.yearly_plan_list?.length > 0) &&
                  paymentPlans().map((data: any, index: number) => (
                    <Fragment key={index}>
                      {findActivePlan(
                        subscriptionPlanTypes?.free_plan,
                        false,
                        true
                      ) &&
                        index === 0 && (
                          <th className="text-center">
                            {subscriptionPlanTypes?.free_plan?.plan_name}
                          </th>
                        )}
                      <th className="text-center">{data?.plan_name}</th>
                    </Fragment>
                  ))}

                {/* <th>Plus</th> */}
              </tr>
            </thead>
            <tbody className={customStyles.tableBody}>
              {subscriptionPlansItems?.length > 0 &&
                subscriptionPlansItems.map((planItems: any, index: number) => (
                  <tr key={index}>
                    <td>{planItems?.item_name}</td>

                    {(subscriptionPlanTypes?.monthly_plan_list?.length > 0 ||
                      subscriptionPlanTypes?.yearly_plan_list?.length > 0) &&
                      paymentPlans().map((data: any, index: number) => (
                        <Fragment key={index}>
                          {findActivePlan(
                            subscriptionPlanTypes?.free_plan,
                            false,
                            true
                          ) &&
                            index === 0 && (
                              <Fragment>
                                {isPlanItemActive(
                                  subscriptionPlanTypes?.free_plan?.plan_items,
                                  planItems
                                ) ? (
                                  <td
                                    className="text-center"
                                    style={{ color: "red" }}
                                  >
                                    <FaCheck
                                      style={{ color: "#1c2475" }}
                                      size={22}
                                    />
                                  </td>
                                ) : (
                                  <td className="text-center"></td>
                                )}
                              </Fragment>
                            )}
                          {isPlanItemActive(data?.plan_items, planItems) ? (
                            <td
                              className="text-center"
                              style={{ color: "red" }}
                            >
                              <FaCheck style={{ color: "#1c2475" }} size={22} />
                            </td>
                          ) : (
                            <td className="text-center"></td>
                          )}
                        </Fragment>
                      ))}
                  </tr>
                ))}
            </tbody>
          </Table>
        </Container>
      </Modal.Body>
      {/* <Modal.Footer className={customStyles.footer}>
        <Button
          className={`${customStyles.closeButton} ${closeButtonStyle}`}
          onClick={onClose}
        >
          Close
        </Button>
      </Modal.Footer> */}
    </Modal>
  );
}
