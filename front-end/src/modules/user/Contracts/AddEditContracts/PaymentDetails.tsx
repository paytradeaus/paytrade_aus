"use client";

import { RootState, useAppSelector } from "@/redux/store";
import React, { Fragment, useEffect, useState } from "react";
import { getBankAccountLists } from "../contracts.functions";
import { useFormik } from "formik";
import * as Yup from "yup";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import BaseModal, { baseModalConstants } from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { InputType, quickAddRoutes } from "@/shared/constant/general";
import { AppRoutes } from "@/shared/constant/appRoutes";

const PaymentDetailsPage = (props: any) => {
  const {
    setViewPages,
    setPaymentData,
    contractType,
    selectedProjectId,
    selectedClientSuplierID,
    paymentData,
    setShowPaymentModel,
    isEdit,
    SetNoticeEligible,
    showPaymentModel,
    handleAddQuickRecord,
    clientSupplierSelectedData,
    paymentDetails,
  } = props;

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [paymentToSelectedData, setPaymentToSelectedData] = useState<any>({});

  const [paymentFromSelectedData, setPaymentFromSelectedData] = useState<any>(
    {}
  );

  const [retentioinFromSelectedData, setRetentioinFromSelectedData] =
    useState<any>({});

  const [paymentToAccounts, setPaymentToAccounts] = useState<any[]>([]);
  const [paymentFromAccounts, setPaymentFromAccounts] = useState<any[]>([]);
  const [retentionFromAccounts, setRetentionFromAccounts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const addContractDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addContractDetails
  );
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const companyId = Number(localStorage.getItem("companyId"));
        let payload: any = {
          company_id: companyId || "",
          type: contractType || "", // Assuming type can be either "Client" or "Supplier"
          project_id: selectedProjectId || "",
          client_supplier_id: selectedClientSuplierID || null,
          retention_type: props.RetentionType || "",
          client_supplier_role: props?.ClientSupplierRole || "",
        };
        const response: any = await getBankAccountLists(payload);
        if (response) {
          setPaymentToAccounts(response?.payment_to_account || []);
          setPaymentFromAccounts(response?.payment_from_account || []);
          setRetentionFromAccounts(response?.retention_from_account || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (Object.keys(paymentData).length > 0) {
      formik.setValues({
        PaymentFromAccount: paymentData?.PaymentFromAccount || null,
        RetentionFromAccount: paymentData?.RetentionFromAccount || null,
        PaymentToAccount: paymentData?.PaymentToAccount || null,
      });

      let paymentFromAccountsOpt =
        paymentFromAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.PaymentFromAccount ||
            addContractDetails?.PaymentDetails?.PaymentFromAccount
        ) || {};

      let retentionFromAccountsOpt =
        retentionFromAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.RetentionFromAccount ||
            addContractDetails?.PaymentDetails?.RetentionFromAccount
        ) || {};

      let paymentToAccountsOpt =
        paymentToAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.PaymentToAccount ||
            addContractDetails?.PaymentDetails?.PaymentToAccount
        ) || {};

      if (paymentToAccountsOpt?.bank_account_id) {
        setPaymentToSelectedData({
          label: paymentToAccountsOpt?.account_name,
          value: paymentToAccountsOpt?.bank_account_id,
          type: paymentToAccountsOpt?.account_type,
        });
      }

      if (retentionFromAccountsOpt?.bank_account_id) {
        setRetentioinFromSelectedData({
          label: retentionFromAccountsOpt?.account_name,
          value: retentionFromAccountsOpt?.bank_account_id,
          type: retentionFromAccountsOpt?.account_type,
        });
      }

      if (paymentFromAccountsOpt?.bank_account_id) {
        setPaymentFromSelectedData({
          label: paymentFromAccountsOpt?.account_name,
          value: paymentFromAccountsOpt?.bank_account_id,
          type: paymentFromAccountsOpt?.account_type,
        });
      }
      setTimeKey(new Date().getTime());
    }
  }, [
    paymentData,
    paymentFromAccounts,
    paymentToAccounts,
    retentionFromAccounts,
    addContractDetails,
  ]);

  const validationSchema = Yup.lazy((values) => {
    return Yup.object().shape({
      ...(contractType === "Supplier" && {
        PaymentFromAccount: Yup.string().required(
          "Payment from account is required"
        ),
        ...(props.RetentionType === "Cash" && {
          RetentionFromAccount: Yup.string().required(
            "Retention from account is required"
          ),
        }),
      }),
      PaymentToAccount: Yup.string().required("Payment to account is required"),
    });
  });

  const formik: any = useFormik({
    initialValues: {
      PaymentToAccount: paymentData?.PaymentToAccount || null,
      PaymentFromAccount: paymentData?.PaymentFromAccount || null,
      RetentionFromAccount: paymentData?.RetentionFromAccount || null,
    },
    validationSchema,
    onSubmit: (values: any) => {
      const RTA = "Retention Trust Account";
      const PTA = "Project Trust Account";
      if (
        paymentFromSelectedData?.account_type === RTA ||
        paymentFromSelectedData?.account_type === PTA ||
        retentioinFromSelectedData?.account_type === RTA ||
        retentioinFromSelectedData?.account_type === PTA ||
        paymentToSelectedData?.account_type === RTA ||
        paymentToSelectedData?.account_type === RTA
      ) {
        SetNoticeEligible(true);
      } else {
        SetNoticeEligible(false);
      }
      // Pass the form values as props
      setViewPages("mainPage");
      setShowPaymentModel(false);
      setPaymentData(values);
      showSuccessToast("This payment detail has been added.");
    },
  });

  const handleFormCancelClick = (data: any) => {
    // setViewPages("mainPage");
    setShowPaymentModel(false);
    const isValid =
      Object.keys(paymentFromSelectedData).length == 0 &&
      Object.keys(paymentToSelectedData).length == 0;
    if (
      !isEdit &&
      data &&
      ((contractType === "Supplier" && isValid) ||
        (props.RetentionType === "Cash" &&
          isValid &&
          Object.keys(retentioinFromSelectedData).length == 0))
    ) {
      showErrorToast("This payment detail will not be added.");
    }
  };

  async function toggleModal(
    event?: React.MouseEvent<HTMLButtonElement>,
    buttonType?: string // Determine if the toggle is a 'close' or 'confirm' action
  ) {
    event?.preventDefault();
    const modal = document.getElementById(
      "Payment Details"
    ) as HTMLDialogElement;
    if (!modal) return; // Prevent action if already submitting

    closeModal(modal);
  }

  function closeModal(modal: HTMLDialogElement) {
    const { documentElement: html } = document;
    // Add class for closing transition
    html.classList.add(baseModalConstants.closingClass);
    setTimeout(() => {
      // Remove transition classes and reset the scrollbar width
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);
    setShowPaymentModel(false);
  }

  return (
    <BaseModal
      modalId={"Payment Details"}
      title="Payment Details"
      displayModal={showPaymentModel}
      onClose={(data: any) => handleFormCancelClick(data)}
      onConfirm={() => {
        formik.handleSubmit();
        if (
          ((contractType === "Supplier" &&
            props.RetentionType === "Cash" &&
            formik?.values?.PaymentFromAccount &&
            formik?.values?.RetentionFromAccount) ||
            (contractType === "Supplier" &&
              props.RetentionType != "Cash" &&
              formik?.values?.PaymentFromAccount) ||
            contractType != "Supplier") &&
          formik?.values?.PaymentToAccount
        ) {
          return true;
        }
      }}
      secondButtonName="Save"
    >
      <p>Input the payment from and to account details</p>
      {contractType === "Supplier" && (
        <>
          <FormikControl
            label="Payment from account "
            options={paymentFromAccounts?.map((account) => ({
              label: account?.account_name,
              value: account?.bank_account_id,
              type: account?.account_type,
            }))}
            secondLabel={
              paymentData == null || // handles null and undefined
              (typeof paymentData === "object" &&
                Object.keys(paymentData).length === 0) ||
              (!isEdit &&
                (!paymentData?.contract_status ||
                  paymentData.contract_status === "Draft")) ||
              (isEdit && paymentData?.contract_status === "Draft")
                ? "Add PTA account"
                : ""
            }
            onSecondLabelClick={(e: any) => {
              const isDraftContract: any =
                (paymentDetails?.contract_status &&
                  paymentDetails.contract_status === "Draft") ||
                (isEdit && paymentDetails?.contract_status === "Draft");
              handleAddQuickRecord(
                `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.PTA_ACCOUNT}`,
                true,
                false,
                isDraftContract
              );
              toggleModal();
            }}
            placeholder="Select"
            required
            control={InputType.SELECT}
            value={formik.values.PaymentFromAccount}
            error={formik.errors.PaymentFromAccount}
            showError={
              formik.touched.PaymentFromAccount &&
              formik.errors.PaymentFromAccount
            }
            renderKey="label"
            valueKey="value"
            onChange={(selectedOption: any) => {
              const value = selectedOption;
              if (value != null) {
                formik.setFieldValue("PaymentFromAccount", value);
              }
              const selectedObj = paymentFromAccounts.filter(
                (val: any) => val.bank_account_id == selectedOption
              );
              if (selectedObj.length > 0) {
                setPaymentFromSelectedData(selectedObj?.[0]);
              }
            }}
          />
          {props.RetentionType === "Cash" && (
            <FormikControl
              label="Retention from account "
              secondLabel={
                paymentData == null || // handles null and undefined
                (typeof paymentData === "object" &&
                  Object.keys(paymentData).length === 0) ||
                (!isEdit &&
                  (!paymentData?.contract_status ||
                    paymentData.contract_status === "Draft")) ||
                (isEdit && paymentData?.contract_status === "Draft")
                  ? "Add RTA account"
                  : ""
              }
              onSecondLabelClick={() => {
                const isDraftContract: any =
                  (paymentDetails?.contract_status &&
                    paymentDetails.contract_status === "Draft") ||
                  (isEdit && paymentDetails?.contract_status === "Draft");
                handleAddQuickRecord(
                  `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.RTA_ACCOUNT}`,
                  true,
                  false,
                  isDraftContract
                );
                toggleModal();
              }}
              options={retentionFromAccounts?.map((account) => ({
                label: account?.account_name,
                value: account?.bank_account_id,
                type: account?.account_type,
              }))}
              placeholder="Select"
              required
              control={InputType.SELECT}
              value={formik.values.RetentionFromAccount}
              error={formik.errors.RetentionFromAccount}
              showError={
                formik.touched.RetentionFromAccount &&
                formik.errors.RetentionFromAccount
              }
              renderKey="label"
              valueKey="value"
              onChange={(selectedOption: any) => {
                const value = selectedOption;
                if (value != null) {
                  formik.setFieldValue("RetentionFromAccount", value);
                }
                const selectedObj = retentionFromAccounts.filter(
                  (val: any) => val.bank_account_id == selectedOption
                );
                if (selectedObj.length > 0) {
                  setRetentioinFromSelectedData(selectedObj?.[0]);
                }
              }}
            />
          )}
        </>
      )}

      <FormikControl
        label="Payment to account "
        secondLabel={
          paymentData == null ||
          (typeof paymentData === "object" &&
            Object.keys(paymentData).length === 0) ||
          (!isEdit &&
            (!paymentData?.contract_status ||
              paymentData.contract_status === "Draft"))
            ? contractType === "Supplier"
              ? "Add Client/Supplier account"
              : "Add bank account"
            : ""
        }
        onSecondLabelClick={() => {
          const isDraftContract: any =
            (paymentDetails?.contract_status &&
              paymentDetails.contract_status === "Draft") ||
            (isEdit && paymentDetails?.contract_status === "Draft");
          handleAddQuickRecord(
            contractType === "Supplier"
              ? `${AppRoutes.USER_EDIT_CLIENTS_AND_SUPPLIERS}/${clientSupplierSelectedData?.id}?quick-add=${quickAddRoutes.CLIENT_SUPPLIER}`
              : `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`,
            true,
            true,
            isDraftContract
          );
          toggleModal();
        }}
        options={paymentToAccounts?.map((account) => ({
          label: account?.account_name,
          value: account?.bank_account_id,
          type: account?.account_type,
        }))}
        placeholder="Select"
        required
        control={InputType.SELECT}
        value={formik.values.PaymentToAccount}
        error={formik.errors.PaymentToAccount}
        showError={
          formik.touched.PaymentToAccount && formik.errors.PaymentToAccount
        }
        renderKey="label"
        valueKey="value"
        onChange={(selectedOption: any) => {
          const value = selectedOption;
          if (value != null) {
            formik.setFieldValue("PaymentToAccount", value);
          }
          const selectedObj = paymentToAccounts.filter(
            (val: any) => val.bank_account_id == selectedOption
          );
          if (selectedObj.length > 0) {
            setPaymentToSelectedData(selectedObj?.[0]);
          }
        }}
      />
    </BaseModal>
  );
};

export default PaymentDetailsPage;
