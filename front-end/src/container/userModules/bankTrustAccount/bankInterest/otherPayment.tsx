"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Money from "../../../../../public/assets/Money.png";
import styles from "./otherPayment.module.scss";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Col, Row } from "react-bootstrap";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import InterestReceivedForm from "./interestReceived";
import InterestWithdrawalForm from "./interestWithdrawal";
import OverPaymentForm from "./overPayment";
import BankChargeForm from "./bankCharge";
import WithdrawalForm from "./withdrawal";
import TopupForm from "./topup";
import ChargeTopupForm from "./chargeTopup";
import {
  AddInterestChargesPayment,
  GetPaymentById,
} from "./bankInterest.function";
import TopupRetention from "./topupRetention";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { FetchAllBankAccounts } from "../backTrustAccount.functions";
import NewOverPaymentTypeForm from "./newOverPaymentTypeToSupplier";
import UnderPaymentForm from "./newUnderPaymentTypeToSupplier";
import OverPaymentFromClientTypeForm from "./overPaymentFromClientType";
import UnderPaymentFromClientTypeForm from "./underPaymentFromClientType";
import OverPaymentRefundFromSupplier from "./overPaymentRefundFromSupplier";
import OverPaymentRefundToClient from "./overPaymentRefundToClient";

const OtherPayment = (props: any) => {
  const {
    isEdit,
    isView,
    fromMatchScreen = false,
    fromMatchScreenBankID,
    setIsShowAddOtherPayments,
    setRefetchLatestPayments,
  } = props;
  const dispatch = useDispatch();

  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const params = useParams();
  const queryParams = useSearchParams();
  let claimType = queryParams.get("claim");
  const [editData, setEditData] = useState<any>();
  const [selectedPaymentType, setSelectedPaymentType] = useState<any>(null);
  const [accountList, setAccountList] = useState<any>();
  const router = useRouter();

  const paymentTypeOptions = [
    { value: "Interest Received", label: "Interest Received" },
    { value: "Interest Withdrawal", label: "Interest Withdrawal" },
    { value: "Bank Charge Applied", label: "Bank Charge Applied" },
    { value: "Bank Charge Top Up", label: "Bank Charge Top-up" },
    { value: "Top Up", label: "Top Up" },
    { value: "Top Up Retention", label: "Top Up Retention" },
    { value: "Withdrawal", label: "Withdrawal" },
    {
      value: "Overpayment refund from supplier",
      label: "Overpayment refund from supplier",
    },
    {
      value: "Overpayment refund to client",
      label: "Overpayment refund to client",
    },
    { value: "Overpayment to supplier", label: "Overpayment to supplier" },
    { value: "Underpayment to supplier", label: "Underpayment to supplier" },
    { value: "Overpayment from client", label: "Overpayment from client" },
    { value: "Underpayment from client", label: "Underpayment from client" },
  ];
  const [selectedValue, setSelectedValue] = useState<any>("");

  useEffect(() => {
    (async () => {
      try {
        handleGetAccountlist();
        if (params?.id) {
          const payload: any = {
            payment_id: Number(params?.id?.[0]) || "",
          };
          const response = await GetPaymentById(payload);
          if (response?.payment_id) {
            setEditData(response);
          }
        }
      } catch (error) {
        console.error("Error fetching project ID:", error);
      }
    })();
  }, []);

  useEffect(() => {
    let type = queryParams.get("type");
    if (type && type?.length > 0 && !isEdit && !isView) {
      setSelectedPaymentType(type);
      setSelectedValue({
        value: type,
        label: type,
      });
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    let payType = editData?.payment_type;
    if (editData?.payment_id && payType) {
      const val: any = paymentTypeOptions.find(
        (each: any) => each?.value == payType
      );
      if (val?.value) {
        setSelectedPaymentType(val?.value);
        setSelectedValue(val);
      }
    }
  }, [editData]);

  const handleGetAccountlist = async () => {
    try {
      const companyId =
        typeof window !== "undefined"
          ? Number(localStorage.getItem("companyId"))
          : null;

      const payload = {
        company_id: companyId,
        page: 1,
        items_per_page: null,
        is_alphabetical_order: true,
        // account_type: paymentType,
      };

      const response = await FetchAllBankAccounts(payload);

      if (
        response?.extendedBankAccounts &&
        response?.extendedBankAccounts.length > 0
      ) {
        let customOption = response.extendedBankAccounts.map((data: any) => ({
          label: data.account_name,
          value: data.bank_account_id.toString(),
          data: data,
        }));
        setAccountList(customOption || []);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handlePaymentTypeChange = (selectedValue: any) => {
    setSelectedPaymentType(selectedValue?.value);
    setSelectedValue(selectedValue);

    // You can add logic here based on the selected payment type
  };
  const handleAddPayment = async (payload: any) => {
    try {
      console.log(payload, "payload");
      const response = await AddInterestChargesPayment(payload);
      if (response) {
        if (fromMatchScreen) {
          setIsShowAddOtherPayments && setIsShowAddOtherPayments(false);
          setRefetchLatestPayments && setRefetchLatestPayments(true);
          return;
        }
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
          })
        );
        router?.back();
      }
      return response;
    } catch (error: any) {
      console.log("add payment failed ", error);
    }
  };

  const renderInterestTypes = () => {
    switch (selectedPaymentType) {
      case "Interest Received":
        return (
          <InterestReceivedForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Interest Withdrawal":
        return (
          <InterestWithdrawalForm
            handleAddPayment={handleAddPayment}
            fromAccountList={accountList}
            toAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Bank Charge Applied":
        return (
          <BankChargeForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Bank Charge Top Up":
        return (
          <ChargeTopupForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Top Up":
        return (
          <TopupForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Top Up Retention":
        return (
          <TopupRetention
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Withdrawal":
        return (
          <WithdrawalForm
            handleAddPayment={handleAddPayment}
            fromAccountList={accountList}
            toAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Overpayment refund from supplier":
        return (
          <OverPaymentRefundFromSupplier
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Overpayment refund to client":
        return (
          <OverPaymentRefundToClient
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Overpayment to supplier":
        return (
          <NewOverPaymentTypeForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Underpayment to supplier":
        return (
          <UnderPaymentForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );

      case "Overpayment from client":
        return (
          <OverPaymentFromClientTypeForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Underpayment from client":
        return (
          <UnderPaymentFromClientTypeForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            setIsShowAddOtherPayments={setIsShowAddOtherPayments}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );

      default:
        return <></>;
    }
  };
  return (
    <div className={styles.dataContainer}>
      <div className={styles.firstPart}>
        <div>
          <Row>
            <Col style={{ display: "flex" }}>
              <Image
                src={Money.src}
                alt="offer details"
                layout="responsive"
                className={styles.imgStyle}
                width={210}
                height={220}
              />
              <div className="ms-1">
                <h6>Payment Id - {editData?.payment_id}</h6>
                <div className="d-flex">
                  <span className={styles.statusName}>
                    Status -&thinsp;
                    <span className={styles.paid}>
                      {/* {editData?.status ? editData?.status : "Draft"} */}
                      {editData?.status_in_ui
                        ? editData?.status_in_ui
                        : editData?.status || "Draft"}
                    </span>
                  </span>
                </div>
              </div>
            </Col>
          </Row>
          <Row className="mt-4 w-100">
            <Col lg={4}>
              <SearchableSelect
                label="Payment Type *"
                options={paymentTypeOptions}
                singleSelectedData={selectedValue}
                onChange={handlePaymentTypeChange}
                disabled={isEdit || isView || claimType ? true : false}
                placeholder="Select..."
              />
            </Col>
            <Col lg={4}></Col>
            <Col lg={4}></Col>
          </Row>
          {renderInterestTypes()}
        </div>
      </div>
    </div>
  );
};
export default OtherPayment;
