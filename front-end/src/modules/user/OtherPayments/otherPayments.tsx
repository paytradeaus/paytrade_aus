"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import {
  AddInterestChargesPayment,
  GetPaymentById,
} from "./otherPayments.functions";
import { FetchAllBankAccounts } from "../BankAccounts/bankAccount.functions";
import InterestReceivedForm from "./OtherPaymentTypes/interestReceived";
import { getCompanyIdFromStorage } from "@/utils";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import BankChargeAppliedForm from "./OtherPaymentTypes/bankChargeApplied";
import BankChargeTopUpForm from "./OtherPaymentTypes/bankChargeTopUp";
import TopUpForm from "./OtherPaymentTypes/topUp";
import WithdrawalForm from "./OtherPaymentTypes/withdrawal";
import InterestWithdrawalForm from "./OtherPaymentTypes/interestWithdrawal";
import TopUpRetentionForm from "./OtherPaymentTypes/topUpRetention";
import OverPaymentRefundFromSupplier from "./OtherPaymentTypes/overPaymentRefendFromSupplier";
import OverPaymentRefundToClient from "./OtherPaymentTypes/overPaymentRefendToClient";
import OverPaymentToSupplierForm from "./OtherPaymentTypes/overPaymentToSupplier";
import UnderPaymentToSupplierForm from "./OtherPaymentTypes/underPaymentToSupplier";
import UnderPaymentFromClientForm from "./OtherPaymentTypes/underPaymentFromClient";
import OverPaymentFromClientForm from "./OtherPaymentTypes/overPaymentFromClient";
import { useLoaderContext } from "@/context/useLoader";
import { quickAddRoutes } from "@/shared/constant/general";
import { ApiResponse } from "@/shared/constant/messages";

const OtherPayment = (props: any) => {
  const {
    isEdit,
    isView,
    fromMatchScreen = false,
    fromMatchScreenBankID,
    onAddClosingModal,
  } = props;
  const dispatch = useDispatch();
  const { setLoader }: any = useLoaderContext();

  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const params = useParams();
  const queryParams = useSearchParams();
  let claimType = queryParams.get("claim");
  const [editData, setEditData] = useState<any>();
  const [selectedPaymentType, setSelectedPaymentType] = useState<any>("");

  const [selectedPaymentTypeObj, setSelectedPaymentTypeObj] = useState<any>("");

  const [accountList, setAccountList] = useState<any>();
  const router = useRouter();
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

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

  useEffect(() => {
    if (
      retrieveAfterAddingQuickRecord ==
      quickAddRoutes.RETRIEVE_INTEREST_AND_CHARGES
    ) {
      getStoredFormData();
    }

    (async () => {
      try {
        handleGetAccountlist();
        if (params?.id) {
          setLoader(true);
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
      } finally {
        setLoader(false);
      }
    })();
  }, []);

  useEffect(() => {
    let type = queryParams.get("type");
    if (type && type?.length > 0 && !isEdit && !isView) {
      setSelectedPaymentType(type);
      setSelectedPaymentTypeObj({ value: type, label: type });
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
        setSelectedPaymentTypeObj(val);
      }
    }
  }, [editData]);

  const handleGetAccountlist = async () => {
    try {
      const companyId =
        typeof window !== "undefined" ? getCompanyIdFromStorage() : null;

      let payload = {
        company_id: companyId,
        page: null,
        items_per_page: null,
        is_alphabetical_order: true,
        // account_type: paymentType,
      };

      const response = await FetchAllBankAccounts({ payload: payload });

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

  const handleAddPayment = async (payload: any) => {
    try {
      const response = await AddInterestChargesPayment(payload);
      if (response) {
        if (fromMatchScreen) {
          onAddClosingModal && onAddClosingModal();
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
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Interest Withdrawal":
        return (
          <InterestWithdrawalForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
            paymentType={selectedPaymentTypeObj}
          />
        );
      case "Bank Charge Applied":
        return (
          <BankChargeAppliedForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Bank Charge Top Up":
        return (
          <BankChargeTopUpForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Top Up":
        return (
          <TopUpForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Top Up Retention":
        return (
          <TopUpRetentionForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Withdrawal":
        return (
          <WithdrawalForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
            paymentType={selectedPaymentTypeObj}
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
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Overpayment to supplier":
        return (
          <OverPaymentToSupplierForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Underpayment to supplier":
        return (
          <UnderPaymentToSupplierForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );

      case "Overpayment from client":
        return (
          <OverPaymentFromClientForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );
      case "Underpayment from client":
        return (
          <UnderPaymentFromClientForm
            handleAddPayment={handleAddPayment}
            trustAccountList={accountList}
            data={editData}
            isView={isView}
            isEdit={isEdit}
            fromMatchScreen={fromMatchScreen}
            fromMatchScreenBankID={fromMatchScreenBankID}
          />
        );

      default:
        return <></>;
    }
  };

  async function getStoredFormData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        const formData = result?.data;

        if (formData?.quickAddFromInterestAndCharges) {
          setSelectedPaymentTypeObj(formData?.accountType);
          setSelectedPaymentType(formData?.accountType?.value);
        }
      }
    } catch {}
  }

  return (
    <>
      {fromMatchScreen ? (
        <div style={{ minHeight: "400px" }}>
          <div style={{ marginBottom: "0.8rem" }}>
            <SearchableSelect
              placeholder="Select Type"
              name="Payment Type"
              label="Payment Type"
              options={paymentTypeOptions}
              onChange={(selected: any) => {
                setSelectedPaymentType(selected?.value);
                setSelectedPaymentTypeObj(selected);
              }}
              selectedData={selectedPaymentTypeObj}
              renderKey="label"
              valueKey="value"
              required
              disabled={isEdit || isView || claimType ? true : false}
            />
          </div>
          {renderInterestTypes()}
        </div>
      ) : (
        <div className="pt_other_payment_image">
          <div>
            <div className="grid">
              <div>
                <div style={{ marginBottom: "0.8rem" }}>
                  <h5 style={{ margin: "3px 0" }}>{`${
                    isEdit ? "Edit" : isView ? "View" : "Add"
                  } Other payment`}</h5>

                  {(isEdit || isView) && (
                    <h4 style={{ fontSize: "x-small", margin: "5px 0" }}>
                      <b>PAYMENT ID :</b> {editData?.payment_id}
                    </h4>
                  )}

                  <h4
                    style={{ fontSize: "small", margin: "3px 0" }}
                    className={editData?.status_in_ui ? "valid" : "invalid"}
                  >
                    <b>
                      {editData?.status_in_ui
                        ? editData?.status_in_ui
                        : editData?.status || "DRAFT"}
                    </b>
                  </h4>
                </div>

                <div style={{ marginBottom: "0.8rem" }}>
                  <SearchableSelect
                    placeholder="Select Type"
                    name="Payment Type"
                    label="Payment Type"
                    options={paymentTypeOptions}
                    onChange={(selected: any) => {
                      setSelectedPaymentType(selected?.value);
                      setSelectedPaymentTypeObj(selected);
                    }}
                    selectedData={selectedPaymentTypeObj}
                    renderKey="label"
                    valueKey="value"
                    required
                    disabled={isEdit || isView || claimType ? true : false}
                  />
                </div>
                {renderInterestTypes()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default OtherPayment;
