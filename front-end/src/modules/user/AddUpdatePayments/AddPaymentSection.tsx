"use client";

import ToggleInputGroup from "@/components/Inputs/ToggleInputGroup";
import React, { Fragment, useEffect, useState } from "react";
import {
  checkBoxConfirmationMessage,
  checkBoxRTAConfirmationMessage,
  contractRetentionType,
  fileUploadType,
  payRetentionWarningMessage,
  retentionSwitchConfirmation,
  retentionSwitchOptions,
  routedFrom,
  tabTypes,
} from "./Payments.constants";
import { usePaymentsContext } from "./PaymentContextProvider";
import { formatDate, formatDollars, replaceDollarSymbol } from "@/utils";
import { useTokenDetails } from "@/hooks";
import BaseModal from "@/components/BaseModal";
import { DateFormat, InputType } from "@/shared/constant/general";
import { showErrorToast } from "@/components/Toaster";
import FormikControl from "@/components/FormikControl";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import _ from "lodash";
import PaymentAttachmentsSection from "./PaymentAttachements";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { getCookie, setCookie } from "cookies-next";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { fetchAllPaymentClaims } from "../PayApps/payApps.functions";

const { OPTIONAL_FILE_UPLOAD, COMPULSORY_FILE_UPLOAD } = fileUploadType;

export default function AddPaymentSection({ props }: any) {
  const {
    isEditable,
    patchData,
    formik,
    isViewMode,
    isImportMode,
    setLoader,
    tabType,
    retentionBankAccounts,
    disablePayLessAmount,
    setSelectedClaim,
    setDisableSaveButton,
    setRetentionAccountDisable,
    isNextPayment,
    noticesAutomated,
  }: any = usePaymentsContext();
  const queryParams = useSearchParams();

  const ImportScreen: any = queryParams.get("screen");
  const ImportCompanyId: any = queryParams.get("company_id");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [displayImportModal, setDisplayImportModal] = useState(false);
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();

  const [claimOptions, setClaimOptions] = useState<any[]>([]);
  const [tempSelectedClaim, setTempSelectedClaim] = useState<any>(null);

  const [displayRetentionConfirmation, setDisplayRetentionConfirmation] =
    useState(false);
  const [displayDefectDateConfirmation, setDisplayDefectDateConfirmation] =
    useState(false);
  const [displayRtaPending, setDisplayRtaPending] = useState(false);

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const dispatch = useAppDispatch();

  const [displayPayRetentionWarning, setDisplayPayRetentionWarning] =
    useState(false);
  const [minDate, setMinDate] = useState<Date | undefined>(new Date());
  const [displayCheckboxConfirmation, setDisplayCheckboxConfirmation] =
    useState(false);
  const [displayRTACheckboxConfirmation, setDisplayRTACheckboxConfirmation] =
    useState(false);

  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const shouldForceNoRetention =
    (formik?.values?.payment_type === "Part" ||
      formik?.values?.payment_type === tabTypes.PAY_LESS_PART) &&
    patchData?.cash_retention === true &&
    Number(patchData?.outstanding_retention_amount) <= 0;

  useEffect(() => {
    if (shouldForceNoRetention) {
      formik.setFieldValue("cash_retention", tabTypes.NO_RETENTION);
    }
  }, [shouldForceNoRetention]);

  useEffect(() => {
    populateTotalAmount();
    console.log("  populateTotalAmount();");
  }, [
    formik?.values?.payment_amount,
    formik?.values?.retention_amount,
    formik?.values?.claim_amount,
    formik?.values?.payless_amount,
    formik?.values?.payment_type,
  ]);

  useEffect(() => {
    if (!isViewMode && !isImportMode) {
      if (patchData?.formatted_retention_amount_with_gst)
        handleRetentionAmount({
          target: { value: patchData.formatted_retention_amount_with_gst },
        });
    }
  }, [patchData?.formatted_retention_amount_with_gst]);

  useEffect(() => {
    if (patchData?.has_claim_retention == false) {
      handleRetentionTypeChange(false, tabTypes.NO_RETENTION);
      setTimeout(() => {
        setDisplayRetentionConfirmation(false);
      }, 10);
    }
  }, [patchData?.has_claim_retention]);

  useEffect(() => {
    if (userMode === "Onboarding") {
      setMinDate(undefined); // Allow past dates
    } else {
      setMinDate(new Date()); // Restrict to today and future dates
    }
  }, [userMode]);

  useEffect(() => {
    if (
      !isViewMode &&
      !formik?.values?.retention_account &&
      retentionBankAccounts?.length > 0 &&
      patchData?.retention_from_account
    ) {
      const paymentsRetentionAccount = retentionBankAccounts.find(
        (x: any) => x?.value === patchData?.retention_from_account
      );

      if (paymentsRetentionAccount) {
        formik?.setFieldValue("retention_account", paymentsRetentionAccount);
        if (!_.isEmpty(paymentsRetentionAccount)) {
          setRetentionAccountDisable(true);
        } else {
          setRetentionAccountDisable(false);
        }
      }
    }
  }, [patchData, retentionBankAccounts]);

  // import
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoader(true); // Show loader
        const { companySpecificRoles } = decodeTokenData || {};

        // Fetch company profiles if screen is 'import'
        if (ImportScreen === "import") {
          // Check if importCompanyId exists in the companySpecificRoles array from the token
          const companyExists = companySpecificRoles?.some(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          // Redirect if the company is not found
          if (!companyExists) {
            router.push(AppRoutes.USER_LOGIN);
            return;
          }

          // Check if isSystemAdded is true and set the ProfileType accordingly
          const userPrivilage = companySpecificRoles?.find(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          if (userPrivilage?.isSystemAdded === true) {
            // If isSystemAdded is true, set profile type to "User"
            localStorage.setItem("ProfileType", "User");
            setCookie("ProfileType", "User");
          } else {
            // Otherwise, set profile type to "Business"
            localStorage.setItem("ProfileType", "Business");
            setCookie("ProfileType", "Business");
          }

          // Set company data if found

          localStorage.setItem("companyId", ImportCompanyId);
          dispatch(setCompanyId(ImportCompanyId));
          setCookie("companyId", ImportCompanyId);

          // Only fetch data and show modal if company exists
          if (companyExists && ImportScreen === "import") {
            fetchData(page, perPage); // Fetch relevant data
            setDisplayImportModal(true); // Display the import modal
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoader(false); // Hide loader when done
      }
    };

    fetchDetails();
  }, [
    ImportCompanyId,
    ImportScreen,
    page, // Include page and perPage for pagination in fetchData
    perPage,
  ]);

  // Fetch data
  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) return; // Early return if selectedCompanyId is not present

    const response = await fetchAllPaymentClaims({
      cash_retention_type: null,
      claim_type: "Receivable",
      contract_id: null,
      company_id: selectedCompanyId || null,
      items_per_page: null,
      page: page,
      project_id: null,
      status: "",
    });

    // Assuming response contains a list of claims with claim_id and claim_name
    if (response) {
      const responseData = JSON.parse(JSON.stringify(response?.payment_claims));
      setClaimOptions(response.payment_claims || []);
      const options = responseData.map((claim: any) => ({
        label: claim?.payment_claim_id, // You can replace this with any appropriate label field
        value: claim?.payment_claim_id,
      }));
      setClaimOptions(options || []);
    }
  };

  async function handleRetentionTypeChange(
    reverseFieldValue: boolean,
    value?: any
  ) {
    const { cash_retention, payment_type, outstanding_retention_amount } =
      formik.values;
    const dynamicValue =
      value ??
      (reverseFieldValue && cash_retention === tabTypes.RETENTION
        ? tabTypes.NO_RETENTION
        : tabTypes.RETENTION);

    await formik?.setFieldValue("cash_retention", dynamicValue);

    // 🧩 New condition check for RTA pending
    const shouldForceNoRetention =
      (payment_type === tabTypes.PART ||
        payment_type === tabTypes.PAY_LESS_PART) &&
      patchData?.cash_retention === true &&
      Number(patchData?.outstanding_retention_amount) > 0;

    // 🧠 New popup if condition matches
    if (shouldForceNoRetention) {
      setDisplayRtaPending(true); // your custom popup state handler
      return; // stop further execution so old logic doesn't trigger
    }

    if (
      (patchData?.retention_type === contractRetentionType.none &&
        value === tabTypes.NO_RETENTION) ||
      ((patchData?.retention_type === contractRetentionType.bankGuaranteed ||
        patchData?.retention_type === contractRetentionType.cash) &&
        value === tabTypes.RETENTION)
    ) {
      setDisplayRetentionConfirmation(false);
      onRetentionConfirmation();
    } else {
      setDisplayRetentionConfirmation(!reverseFieldValue);
    }
  }

  async function onRetentionConfirmation() {
    const {
      payment_type,
      claim_amount,
      payless_amount,
      outstanding_retention_amount,
      cash_retention,
    } = formik.values;

    // if (
    //   payment_type === "Part" &&
    //   patchData?.cash_retention === true &&
    //   Number(outstanding_retention_amount) <= 0 &&
    //   cash_retention === tabTypes.NO_RETENTION
    // ) {
    //   await formik.setFieldValue("cash_retention", tabTypes.NO_RETENTION);
    //   setDisplayRetentionConfirmation(false); // ✅ Close popup
    //   return;
    // }
    if (
      payment_type === tabTypes.PAY_LESS_PART ||
      payment_type === tabTypes.PART ||
      payment_type === tabTypes.PAY_LESS_ZERO ||
      payment_type === tabTypes.THIRD_PARTY
    )
      return;
    formik?.setFieldValue("retention_amount", "");
    formik.setFieldValue("formatted_retention_amount", "");
    formik?.setFieldValue("retention_release_date", "");
    formik?.setFieldValue(
      "payment_amount",
      payment_type === tabTypes.FULL
        ? claim_amount && `$ ${claim_amount?.toFixed(2)}`
        : payment_type === tabTypes.PAY_LESS_FULL
        ? payless_amount &&
          `$ ${Number(replaceDollarSymbol(payless_amount)).toFixed(2)}`
        : ""
    );

    formik?.setFieldValue(
      "formatted_payment_amount",
      payment_type === tabTypes.FULL
        ? claim_amount && formatDollars(claim_amount?.toFixed(2))
        : payment_type === tabTypes.PAY_LESS_FULL
        ? payless_amount &&
          formatDollars((+replaceDollarSymbol(payless_amount)).toFixed(2))
        : ""
    );
    setDisplayRetentionConfirmation(false);
  }

  const handleRetentionAmount = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }
  ) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_retention_amount", ""); // Clear formatted value
      formik.setFieldValue("retention_amount", ""); // Clear raw value
      autoCalculatePaymentAmount("", formik?.values?.payless_amount);
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    formik.setFieldValue("formatted_retention_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("retention_amount", `$ ${finalValue}`);
    autoCalculatePaymentAmount(finalValue, formik?.values?.payless_amount); // Raw numeric value
  };

  function autoCalculatePaymentAmount(
    retentionAmount: any,
    paylessAmount: any
  ) {
    const { claim_amount, cash_retention, payment_type } = formik.values;

    let paymentAmount: any = "";

    if (
      payment_type === tabTypes.FULL ||
      (payment_type === tabTypes.PAY_LESS_FULL &&
        cash_retention === tabTypes.RETENTION)
    ) {
      let claimAmount = 0;

      if (payment_type === tabTypes.FULL) {
        claimAmount = claim_amount;
      } else {
        claimAmount = replaceDollarSymbol(paylessAmount);
      }
      // if (patchData?.has_claim_retention) {
      //   paymentAmount = claimAmount;
      // } else {
      paymentAmount =
        +replaceDollarSymbol(retentionAmount) <= claimAmount
          ? claimAmount - +replaceDollarSymbol(retentionAmount)
          : "";
      // }
      formik.setFieldValue(
        "formatted_payment_amount",
        paymentAmount ? formatDollars(paymentAmount.toFixed(2)) : paymentAmount
      ); // Clear formatted value
      formik.setFieldValue(
        "payment_amount",
        paymentAmount ? `$ ${paymentAmount.toFixed(2)}` : paymentAmount
      ); // Clear raw value
    }
  }

  function validateTotalClaimAmount(e: any) {
    formik.setFieldTouched("payment_amount", true);

    const {
      retention_amount,
      payment_amount,
      payment_type,
      claim_amount,
      payless_amount,
      outstanding_amount,
    } = formik.values;
    if (
      payment_type !== tabTypes.PART &&
      payment_type !== tabTypes.PAY_LESS_PART
    ) {
      return;
    } else if (
      payment_type === tabTypes.PART &&
      (!payment_amount || !claim_amount)
    ) {
      return;
    } else if (
      payment_type === tabTypes.PAY_LESS_PART &&
      (!payless_amount || !payment_amount)
    ) {
      return;
    }

    let totalGreaterThanClaim = false;

    if (payment_type === tabTypes.PART) {
      totalGreaterThanClaim =
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >=
        claim_amount;
    } else if (payment_type === tabTypes.PAY_LESS_PART) {
      // totalGreaterThanClaim =
      if (
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >=
        +replaceDollarSymbol(payless_amount)
      ) {
        totalGreaterThanClaim = true;
      } else if (
        +replaceDollarSymbol(retention_amount) +
          +replaceDollarSymbol(payment_amount) >
        outstanding_amount
      ) {
        totalGreaterThanClaim = true;
      }
    }

    setDisplayPayRetentionWarning(totalGreaterThanClaim);
  }

  const handlePaymentAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_payment_amount", ""); // Clear formatted value
      formik.setFieldValue("payment_amount", ""); // Clear raw value
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
      integerPart = integerPart.slice(0, 11);
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    formik.setFieldValue("formatted_payment_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("payment_amount", `$ ${finalValue}`);
  };

  function paymentMinimumDate() {
    const dateString = formik?.values?.payments_minimum_date;

    // Parse the date string to create a Date object
    return new Date(dateString);
  }

  function populateTotalAmount() {
    const {
      payment_amount,
      retention_amount,
      claim_amount,
      payless_amount,
      payment_type,
      outstanding_amount,
      payment_to,
      outstanding_retention_amount,
    } = formik.values;

    const safeNumber = (value: any) => {
      const num = Number(replaceDollarSymbol(value));
      return isNaN(num) ? 0 : num;
    };

    const concatValue =
      safeNumber(payment_amount) + safeNumber(retention_amount);

    const outstandingConcatValue =
      safeNumber(payment_amount) + safeNumber(outstanding_retention_amount);

    let claimAmount = 0;
    if (payment_type === tabTypes.FULL || payment_type === tabTypes.PART) {
      claimAmount = claim_amount;
    } else if (
      payment_type === tabTypes.PAY_LESS_FULL ||
      payment_type === tabTypes.PAY_LESS_PART
    ) {
      claimAmount = +replaceDollarSymbol(payless_amount);
    }
    // 🧩 New condition for forcing No Retention
    const shouldForceNoRetention =
      (payment_type === tabTypes.PART ||
        payment_type === tabTypes.PAY_LESS_PART) &&
      patchData?.cash_retention === true &&
      Number(patchData?.outstanding_retention_amount) <= 0;

    // 🧠 Disable Save button logic
    if (shouldForceNoRetention) {
      // 🔸 New condition: when forcing no retention
      setDisableSaveButton(
        Number(outstandingConcatValue?.toFixed(2)) >
          Number(outstanding_amount?.toFixed(2))
      );
    } else if (
      payment_type === tabTypes.FULL ||
      payment_type === tabTypes.PAY_LESS_FULL
    ) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) !== Number(claimAmount?.toFixed(2))
      );
    } else if (
      payment_type === tabTypes.PART &&
      isNextPayment &&
      outstanding_amount
    ) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) > Number(outstanding_amount?.toFixed(2))
      );
    } else if (payment_type === tabTypes.PART) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) >= Number(claimAmount?.toFixed(2))
      );
    } else if (payment_type === tabTypes.PAY_LESS_PART && !isViewMode) {
      setDisableSaveButton(
        Number(concatValue?.toFixed(2)) >= Number(claimAmount?.toFixed(2)) ||
          Number(concatValue?.toFixed(2)) >
            Number(outstanding_amount?.toFixed(2))
      );
    } // 👉 Override condition
    // 🧩 Override total_amount logic
    if (
      payment_type === tabTypes.PAY_LESS_ZERO ||
      payment_to === tabTypes.THIRD_PARTY
    ) {
      // 🔸 Case 1: Pay Zero or 3rd Party → Blank total
      formik?.setFieldValue("total_amount", "");
    } else if (shouldForceNoRetention) {
      // 🔸 Case 2: Force No Retention → Use outstanding amount instead
      formik?.setFieldValue(
        "total_amount",
        Number(outstandingConcatValue)?.toFixed(2)
      );
    } else {
      // 🔸 Default case
      formik?.setFieldValue("total_amount", concatValue?.toFixed(2));
    }
  }

  // else {
  // }
  // formik?.setFieldValue("total_amount", concatValue?.toFixed(2));
  // }

  function handleAccountSelection(value: any) {
    formik.setFieldValue("retention_account", value);
  }

  function onConfirmPaidChange(value: boolean) {
    if (value) {
      setDisplayCheckboxConfirmation(true);
    } else {
      formik.setFieldValue("is_paid_confirmed", value);
    }
  }

  function onConfirmRTAPaidChange(value: boolean) {
    if (value) {
      setDisplayRTACheckboxConfirmation(true);
    } else {
      formik.setFieldValue("is_retention_confirmed", value);
    }
  }

  function handleConfirmCheck() {
    formik.setFieldValue("is_paid_confirmed", displayCheckboxConfirmation);
    setDisplayCheckboxConfirmation(false);
  }

  function handleRtaConfirmCheck() {
    formik.setFieldValue(
      "is_retention_confirmed",
      displayRTACheckboxConfirmation
    );
    setDisplayRTACheckboxConfirmation(false);
  }

  function whetherToDisplayRetentionWarningMessage() {
    if (formik?.values?.payment_type === tabTypes.PART) {
      return payRetentionWarningMessage.partPayment;
    } else if (formik?.values?.payment_type === tabTypes.PAY_LESS_PART) {
      return payRetentionWarningMessage.paylessPart;
    } else {
      return payRetentionWarningMessage.payLessOrFullPayment;
    }
  }

  const handlePaylessAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    const { payment_type, cash_retention, retention_amount } = formik.values;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("formatted_payless_amount", ""); // Clear formatted value
      formik.setFieldValue("payless_amount", ""); // Clear raw value
      if (
        payment_type === tabTypes.PAY_LESS_FULL &&
        cash_retention === tabTypes.NO_RETENTION
      ) {
        formik.setFieldValue("formatted_payment_amount", "");
        formik.setFieldValue("payment_amount", "");
      }
      autoCalculatePaymentAmount(retention_amount, "");
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
      integerPart = integerPart.slice(0, 11);
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    formik.setFieldValue("formatted_payless_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("payless_amount", `$ ${finalValue}`);
    if (
      payment_type === tabTypes.PAY_LESS_FULL &&
      cash_retention === tabTypes.NO_RETENTION
    ) {
      formik.setFieldValue("formatted_payment_amount", formattedValue);
      formik.setFieldValue("payment_amount", `$ ${finalValue}`);
    }

    autoCalculatePaymentAmount(retention_amount, finalValue); // Raw numeric value
  };

  function paymentLiabilityDate(utcDateStr: string) {
    // Convert string to Date object
    const date = new Date(utcDateStr);

    // Add one day (24 hours in milliseconds)
    date.setUTCDate(date.getUTCDate() + 1);

    // Convert back to UTC ISO string
    const updatedUTC = date.toISOString();

    return formatDate(new Date(updatedUTC), DateFormat.YYYY_MM_DD);
  }

  function formatToYYYYMMDD(dateInput: string | Date): string {
    if (!dateInput) return "";

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return ""; // handle invalid date safely

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return (
    <Fragment>
      <div className="pt_expandtable pt_payment">
        <details open>
          <summary>{isViewMode ? "View Payment" : "Add payment"}</summary>
          <div className="grid pt_data">
            <div className="pt_data_clear">
              <h3>
                {formik?.values?.payment_type
                  ? formik?.values?.payment_type
                  : formik?.values?.payment_to}
              </h3>
              {formik?.values?.payment_id && (
                <h5>
                  <b>PAYMENT ID:</b> {formik?.values?.payment_id ?? ""}
                </h5>
              )}
            </div>
            {formik?.values?.claim_type === tabTypes.BILLABLES && (
              <div>
                <h5>Payment to</h5>
                <h4>{formik?.values?.payment_to}</h4>
              </div>
            )}
            {formik?.values?.payment_to === tabTypes.SUPPLIER &&
              formik?.values?.payment_type !== tabTypes.PAY_LESS_ZERO &&
              tabType !== routedFrom.RETENTION_CLAIM_ONE &&
              tabType !== routedFrom.RETENTION_CLAIM_TWO &&
              !patchData?.retention_id &&
              (formik?.values?.payment_type === tabTypes.FULL ||
                formik?.values?.payment_type === tabTypes.PART ||
                formik?.values?.payment_type === tabTypes.PAY_LESS_FULL ||
                formik?.values?.payment_type === tabTypes.PAY_LESS_PART) && (
                <div>
                  <h5>Retention</h5>
                  <ToggleInputGroup
                    type="radio"
                    name="claim_type"
                    options={retentionSwitchOptions}
                    // selectedValue={
                    //   formik?.values?.has_claim_retention
                    //     ? formik?.values?.cash_retention
                    //     : tabTypes.NO_RETENTION
                    // }
                    // onChange={(e) => {
                    //   return handleRetentionTypeChange(false, e?.target?.value);
                    // }}
                    // disabled={
                    //   isViewMode ||
                    //   ImportScreen === "import" ||
                    //   !formik?.values?.has_claim_retention
                    // }
                    selectedValue={
                      shouldForceNoRetention
                        ? tabTypes.NO_RETENTION
                        : formik?.values?.has_claim_retention
                        ? formik?.values?.cash_retention
                        : tabTypes.NO_RETENTION
                    }
                    onChange={(e) => {
                      if (shouldForceNoRetention) return; // prevent user change
                      handleRetentionTypeChange(false, e?.target?.value);
                    }}
                    disabled={
                      isViewMode ||
                      ImportScreen === "import" ||
                      !formik?.values?.has_claim_retention ||
                      shouldForceNoRetention
                    }
                  />
                </div>
              )}
            {(formik?.values?.payment_type === tabTypes.PART ||
              formik?.values?.payment_type === tabTypes.PAY_LESS_PART) &&
              (isViewMode || isNextPayment) && (
                <div>
                  <h5>Part payment outstanding amount</h5>
                  <h4>
                    $
                    {formik?.values?.outstanding_amount
                      ? Number(formik?.values?.outstanding_amount)
                          ?.toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </h4>
                  &nbsp;
                  <h6>{`${
                    formik?.values?.gst_summary ? "inc" : "exc"
                  } GST`}</h6>
                  <h5>
                    <b>GST:</b> $
                    {formik?.values?.gst_summary
                      ? Number(formik?.values?.gst_summary)
                          ?.toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </h5>
                </div>
              )}
          </div>
          {formik?.values?.payment_to === tabTypes.SUPPLIER &&
            (formik?.values?.payment_type === tabTypes.FULL ||
              formik?.values?.payment_type === tabTypes.PART ||
              formik?.values?.payment_type === tabTypes.PAY_LESS_FULL ||
              formik?.values?.payment_type === tabTypes.PAY_LESS_PART) && (
              <div className="grid">
                <div className="pt_table pt_formtable paymentClaims">
                  <table className="dataTable compact stripe nowrap hover order-column payment-table-style TableFontSmall">
                    <thead>
                      <tr>
                        <th>ID</th>
                        {formik?.values?.cash_retention ===
                          tabTypes.RETENTION &&
                          formik?.values?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <th>
                                Retention Amount (including gst)
                                <span className="required">*</span>
                              </th>
                              {/* <th>
                                Reten Release Date
                                <span className="required">*</span>
                              </th> */}
                              <th>
                                Retention Release Date
                                <span className="required">*</span>
                              </th>
                            </>
                          )}
                        {(formik?.values?.payment_type ===
                          tabTypes.PAY_LESS_PART ||
                          formik?.values?.payment_type ===
                            tabTypes.PAY_LESS_FULL) && (
                          <th>
                            Pay Less Amount<span className="required">*</span>
                          </th>
                        )}
                        <th>
                          Payment Amount<span className="required">*</span>
                        </th>
                        <th>
                          Payment Date<span className="required">*</span>
                        </th>
                        {/* Place both checkboxes at the end */}

                        <th>
                          {`Confirm ${
                            formik?.values?.claim_type === tabTypes.BILLABLES
                              ? "Paid"
                              : "Received"
                          }`}
                        </th>
                        {formik?.values?.cash_retention ===
                          tabTypes.RETENTION &&
                          formik?.values?.cash_retention_type !==
                            "Retention claim" &&
                          formik?.values?.claim_type === tabTypes.BILLABLES && (
                            <th>{"Confirm Paid RTA"}</th>
                          )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="form_array_table_row">
                        <td>001</td>
                        {/* Retention Fields */}
                        {formik?.values?.cash_retention ===
                          tabTypes.RETENTION &&
                          formik?.values?.cash_retention_type !==
                            "Retention claim" && (
                            <>
                              <td data-label="Retention Amount">
                                <FormikControl
                                  control={InputType.TEXT_FIELD}
                                  label={""}
                                  name="formatted_retention_amount"
                                  id="formatted_retention_amount"
                                  value={
                                    formik?.values?.formatted_retention_amount
                                  }
                                  onChange={handleRetentionAmount}
                                  onBlur={(e: any) =>
                                    validateTotalClaimAmount(e)
                                  }
                                  placeholder="Enter retention amount"
                                  required
                                  disableAutoComplete={false}
                                  disabled={isViewMode || isImportMode}
                                  customizeErrorFont={"paymentsErrorFont"}
                                  error={
                                    (formik.touched
                                      .formatted_retention_amount &&
                                      formik.errors
                                        .formatted_retention_amount) ||
                                    ((formik.touched
                                      .formatted_retention_amount ||
                                      formik.touched.retention_amount) &&
                                      formik.errors.retention_amount)
                                  }
                                  showError={
                                    formik.touched.retention_amount &&
                                    formik.errors.retention_amount
                                  }
                                />
                              </td>
                              {/* {formik?.values?.claim_type ===
                            tabTypes.BILLABLES && (
                            <td data-label="Retention Paid into Account">
                              <FormikControl
                                control={InputType.SELECT}
                                name={""}
                                renderKey="label"
                                valueKey="value"
                                placeholder="Select account"
                                disabled={isViewMode || retentionDisable}
                                options={retentionBankAccounts}
                                returnSelectedObject
                                onChange={handleAccountSelection}
                                value={formik?.values?.retention_account}
                                showError={
                                  formik.touched.retention_account &&
                                  formik.errors.retention_account
                                }
                                error={formik.errors.retention_account}
                              />
                            </td>
                          )} */}
                              {/* <td data-label="Retention Paid into Account">
                                <FormikControl
                                  control={InputType.SELECT}
                                  name={""}
                                  renderKey="label"
                                  valueKey="value"
                                  placeholder="Select account"
                                  disabled={isViewMode || retentionDisable}
                                  options={retentionBankAccounts}
                                  returnSelectedObject
                                  onChange={handleAccountSelection}
                                  value={formik?.values?.retention_account}
                                  showError={
                                    formik.touched.retention_account &&
                                    formik.errors.retention_account
                                  }
                                  error={formik.errors.retention_account}
                                />
                              </td> */}
                              <td data-label="Retention Release Date">
                                <FormikControl
                                  control={InputType.DATE_PICKER}
                                  required
                                  showError={
                                    formik?.touched?.retention_release_date &&
                                    formik?.errors?.retention_release_date
                                  }
                                  selected={
                                    formik?.values?.retention_release_date
                                  }
                                  onChange={(selectedDate: string) =>
                                    formik.setFieldValue(
                                      "retention_release_date",
                                      selectedDate
                                    )
                                  }
                                  customizeErrorFont={"paymentsErrorFont"}
                                  error={
                                    formik?.touched?.retention_release_date &&
                                    formik?.errors?.retention_release_date
                                  }
                                  format={DD_MM_YYYY}
                                  value={formik?.values?.retention_release_date}
                                  minDate={
                                    userMode === "Onboarding"
                                      ? minDate
                                      : formatDate(
                                          new Date(),
                                          DateFormat.YYYY_MM_DD
                                        )
                                  }
                                  maxDate={paymentMinimumDate()}
                                  maxYear={new Date().getFullYear() + 50}
                                  disabled={isViewMode}
                                />
                              </td>
                            </>
                          )}
                        {/* Payment Fields */}
                        {(formik?.values?.payment_type ===
                          tabTypes.PAY_LESS_PART ||
                          formik?.values?.payment_type ===
                            tabTypes.PAY_LESS_FULL) && (
                          <td data-label="Pay Less Amount">
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              placeholder={"Enter pay less amount"}
                              name="formatted_payless_amount"
                              id="formatted_payless_amount"
                              value={formik?.values?.formatted_payless_amount}
                              onChange={handlePaylessAmount}
                              onBlur={(e: any) => validateTotalClaimAmount(e)}
                              required
                              disableAutoComplete={false}
                              disabled={
                                isViewMode ||
                                disablePayLessAmount ||
                                isImportMode
                              }
                              customizeErrorFont={"paymentsErrorFont"}
                              error={
                                formik.errors.payless_amount ||
                                formik.errors.formatted_payless_amount
                              }
                              showError={
                                (formik.touched.formatted_payless_amount &&
                                  formik.errors.formatted_payless_amount) ||
                                ((formik.touched.formatted_payless_amount ||
                                  formik.touched.payless_amount) &&
                                  formik.errors.payless_amount)
                              }
                            />
                          </td>
                        )}
                        <td data-label="Payment Amount">
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={""}
                            placeholder={"Enter payment amount"}
                            name="paymentamount"
                            id="formatted_payment_amount"
                            value={formik?.values?.formatted_payment_amount}
                            onChange={handlePaymentAmount}
                            onBlur={(e: any) => validateTotalClaimAmount(e)}
                            required
                            disableAutoComplete={false}
                            customizeErrorFont={"paymentsErrorFont"}
                            disabled={
                              isViewMode ||
                              formik?.values?.payment_type === tabTypes.FULL ||
                              formik?.values?.payment_type ===
                                tabTypes.PAY_LESS_FULL ||
                              isImportMode
                            }
                            error={
                              formik.errors.payment_amount ||
                              formik.errors.formatted_payment_amount
                            }
                            showError={
                              (formik.touched.formatted_payment_amount &&
                                formik.errors.formatted_payment_amount) ||
                              ((formik.touched.formatted_payment_amount ||
                                formik.touched.payment_amount) &&
                                formik.errors.payment_amount)
                            }
                          />
                        </td>
                        <td data-label="Payment Date">
                          <FormikControl
                            control={InputType.DATE_PICKER}
                            required
                            showError={
                              formik.touched.payment_date &&
                              formik.errors.payment_date
                            }
                            customizeErrorFont={"paymentsErrorFont"}
                            selected={formik.values.payment_date}
                            // onChange={(selectedDate: string) =>
                            //   formik.setFieldValue("payment_date", selectedDate)
                            // }
                            onChange={(selectedDate: string) => {
                              if (!selectedDate) return;

                              // 🧩 Skip validation for Onboarding mode
                              if (userMode === "Onboarding") {
                                formik.setFieldValue(
                                  "payment_date",
                                  selectedDate
                                );
                                return;
                              }

                              const defectDate =
                                patchData?.defect_liability_end_date
                                  ? paymentLiabilityDate(
                                      patchData.defect_liability_end_date
                                    )
                                  : null;

                              const chosenDate = formatToYYYYMMDD(selectedDate);
                              // 🧠 Validation: check if selected < defect liability end date
                              if (
                                tabType === routedFrom.RETENTION_CLAIM_ONE &&
                                defectDate &&
                                chosenDate < defectDate
                              ) {
                                // Show warning modal and clear invalid date
                                formik.setFieldValue("payment_date", null); // instantly clear
                                setDisplayDefectDateConfirmation(true);
                                return;
                              }
                              // ✅ Valid date, update formik value
                              formik.setFieldValue(
                                "payment_date",
                                selectedDate
                              );
                            }}
                            error={
                              formik?.touched?.payment_date &&
                              formik?.errors?.payment_date
                            }
                            format={DD_MM_YYYY}
                            value={formik?.values?.payment_date}
                            disabled={isViewMode}
                            minDate={userMode === "Onboarding" ? undefined : ""}
                          />
                        </td>
                        {/* Place both checkboxes at the end */}

                        <td data-label="Confirm - Paid">
                          <FormikControl
                            id={"confirmPaid"}
                            name={"confirmPaid"}
                            control={InputType.CHECKBOX}
                            options={[
                              {
                                value: Boolean(
                                  formik?.values?.is_paid_confirmed
                                ),
                              },
                            ]}
                            onChange={(e: any) =>
                              onConfirmPaidChange(e?.target?.checked)
                            }
                            selectedValue={
                              formik.values.is_paid_confirmed || "false"
                            }
                            disabled={!isEditable && isViewMode}
                          />
                        </td>
                        {formik?.values?.cash_retention ===
                          tabTypes.RETENTION &&
                          formik?.values?.cash_retention_type !==
                            "Retention claim" &&
                          formik?.values?.claim_type === tabTypes.BILLABLES && (
                            <td data-label="Confirm - Paid RTA">
                              <FormikControl
                                control={InputType.CHECKBOX}
                                id={"confirmRtaPaid"}
                                name={"confirmRtaPaid"}
                                // checked={formik?.values?.is_retention_confirmed}
                                onChange={(e: any) =>
                                  onConfirmRTAPaidChange(e?.target?.checked)
                                }
                                options={[
                                  {
                                    value: Boolean(
                                      formik?.values?.is_retention_confirmed
                                    ),
                                  },
                                ]}
                                selectedValue={
                                  formik.values.is_retention_confirmed ||
                                  "false"
                                }
                                disabled={!isEditable && isViewMode}
                              />
                            </td>
                          )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          <div className="grid pt_memototal">
            <div className="pt_memowrap">
              <div className="pt_memo">
                <FormikControl
                  as="textArea"
                  placeholder="Memo"
                  name="memo"
                  id="memo"
                  maxLength={200}
                  value={formik?.values?.memo}
                  onChange={formik.handleChange}
                  disabled={isViewMode}
                  control={InputType.TEXT_AREA}
                  renderKey="label"
                  valueKey="value"
                />
              </div>
              {formik?.values?.claim_type === tabTypes.BILLABLES &&
                (formik?.values?.payment_type !== tabTypes.FULL ||
                  formik?.values?.payment_to === tabTypes.THIRD_PARTY) &&
                noticesAutomated && (
                  <div className="pt_memowrap">
                    <div className="pt_memo">
                      <FormikControl
                        as="textArea"
                        placeholder="Enter a reason for withholding payment"
                        name="withHoldReson"
                        id="withHoldReson"
                        maxLength={200}
                        value={formik?.values?.withHoldReson}
                        onChange={formik.handleChange}
                        disabled={isViewMode}
                        control={InputType.TEXT_AREA}
                        renderKey="label"
                        valueKey="value"
                        // error={formik.errors.withHoldReson}
                        // showError={
                        //   formik.errors.withHoldReson &&
                        //   formik.touched.withHoldReson
                        // }
                        // smallTextAreaError
                      />
                    </div>
                  </div>
                )}
            </div>
            {formik?.values?.claim_type === tabTypes.BILLABLES &&
              formik?.values?.payment_to === tabTypes.THIRD_PARTY && (
                <div className="pt_memowrap">
                  <div className="pt_memo">
                    <FormikControl
                      as="textArea"
                      placeholder="Reason for payment to 3rd party"
                      disabled={isViewMode}
                      name="third_party_payment_reason"
                      id="third_party_payment_reason"
                      maxLength={200}
                      smallTextAreaError
                      value={formik?.values?.third_party_payment_reason}
                      onChange={formik.handleChange}
                      control={InputType.TEXT_AREA}
                      renderKey="label"
                      valueKey="value"
                      error={formik.errors.third_party_payment_reason}
                      showError={
                        formik.touched.third_party_payment_reason &&
                        formik.errors.third_party_payment_reason
                      }
                    />
                  </div>
                </div>
              )}
          </div>
          <RenderDynamicAttachments />
        </details>
      </div>
      {displayRetentionConfirmation && (
        <dialog id="retention-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => handleRetentionTypeChange(true)}
                ></button>
              </div>
              {/* <strong>Confirmation</strong> */}
            </header>
            <h4 className="text_center">
              {formik?.values?.cash_retention === tabTypes.RETENTION
                ? retentionSwitchConfirmation.noRetention
                : retentionSwitchConfirmation.retention}
            </h4>
            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => handleRetentionTypeChange(true)}
              >
                No
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => onRetentionConfirmation()}
              >
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayCheckboxConfirmation && (
        <dialog id="checkbox-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayCheckboxConfirmation(false)}
                ></button>
              </div>
            </header>
            <h4 className="text_center">
              {`${checkBoxConfirmationMessage} ${
                formik?.values?.claim_type === tabTypes.BILLABLES
                  ? "Paid"
                  : "Received"
              }?`}
            </h4>
            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayCheckboxConfirmation(false)}
              >
                No
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => handleConfirmCheck()}
              >
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayRTACheckboxConfirmation && (
        <dialog id="checkbox-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayRTACheckboxConfirmation(false)}
                ></button>
              </div>
            </header>
            <h4 className="text_center">
              {`${checkBoxRTAConfirmationMessage} ${
                formik?.values?.claim_type === tabTypes.BILLABLES
                  ? "Paid"
                  : "Received"
              }?`}
            </h4>
            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayRTACheckboxConfirmation(false)}
              >
                No
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => handleRtaConfirmCheck()}
              >
                Yes
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayPayRetentionWarning && (
        <BaseModal
          displayModal={displayPayRetentionWarning}
          onClose={() => setDisplayPayRetentionWarning(false)}
          firstButtonName={"Ok"}
          hideSecondButton
          onConfirm={() => setDisplayPayRetentionWarning(false)}
        >
          <div className="text_center">
            {whetherToDisplayRetentionWarningMessage()}
          </div>
        </BaseModal>
      )}
      {displayDefectDateConfirmation && (
        <BaseModal
          displayModal={displayDefectDateConfirmation}
          onClose={() => {
            formik.setFieldValue("payment_date", ""); // clear when closed
            setDisplayDefectDateConfirmation(false);
          }}
          firstButtonName={"Close"}
          hideSecondButton
          hideHeaderCloseIcon
          onConfirm={() => {
            formik.setFieldValue("payment_date", ""); // clear when closed
            setDisplayDefectDateConfirmation(false);
          }}
        >
          <h4 className="text_center">
            A payment to self can only be carried out for retention payments
            after the Latent defect period has ended.
          </h4>
        </BaseModal>
      )}

      {displayRtaPending && (
        <BaseModal
          displayModal={displayDefectDateConfirmation}
          onClose={() => setDisplayRtaPending(false)}
          firstButtonName={"Close"}
          hideSecondButton
          onConfirm={() => setDisplayRtaPending(false)}
        >
          <h4 className="text_center">RTA payment amount is pending.</h4>
        </BaseModal>
      )}

      {ImportScreen === "import" && displayImportModal && (
        <dialog id="import-modal" open>
          <article>
            {/* Modal Header */}
            <header>
              <h4>Select appropriate claim</h4>
              {/* <button
                rel="prev"
                aria-label="Close"
                onClick={() => {
                  setDisplayImportModal(false);
                  router.back();
                }}
              ></button> */}
            </header>

            {/* Modal Body */}
            <p>Please select the appropriate claim id from the list below.</p>
            <div style={{ marginBottom: "0.8rem" }}>
              {/* Searchable Select Field */}
              <SearchableSelect
                placeholder="Select a claim id"
                required
                isInPopup={true}
                name="claimSelect"
                options={claimOptions}
                onChange={(selectedObj: any) =>
                  setTempSelectedClaim(selectedObj)
                }
                selectedData={tempSelectedClaim}
                renderKey="label"
                valueKey="value"
              />
            </div>

            {/* Modal Footer */}
            <footer>
              {/* <button
                className="secondary"
                type="button"
                onClick={() => {
                  setDisplayImportModal(false);
                  router.back();
                }}
              >
                Cancel
              </button> */}
              <button
                className="primary"
                type="button"
                onClick={() => {
                  if (tempSelectedClaim) {
                    setSelectedClaim(tempSelectedClaim);
                    setDisplayImportModal(false);
                  } else {
                    console.warn("No claim selected. Please select a claim.");
                  }
                }}
              >
                Confirm
              </button>
            </footer>
          </article>
        </dialog>
      )}
    </Fragment>
  );
}
function RenderDynamicAttachments() {
  const { formik, noticesAutomated, isFree }: any = usePaymentsContext();

  function checkIsAttachmentCompulsory() {
    // If free plan → attachment NOT required
    if (isFree === true) {
      return false;
    }
    // Existing conditions
    if (
      formik?.values?.claim_type === tabTypes.BILLABLES &&
      (formik?.values?.payment_type !== tabTypes.FULL ||
        formik?.values?.payment_to === tabTypes.THIRD_PARTY) &&
      !noticesAutomated
    ) {
      return true;
    } else {
      return false;
    }
  }

  return (
    <PaymentAttachmentsSection
      displayCompulsoryOptionalAttachment={checkIsAttachmentCompulsory()}
    />
  );
}
