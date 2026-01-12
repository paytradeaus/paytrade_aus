"use client";
import React, { useCallback, useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";

import { useRouter, useSearchParams } from "next/navigation";

import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import { useLoaderContext } from "@/context/useLoader";

import { useFormik } from "formik";

import { showErrorToast, showInfoToast } from "@/components/Toaster";
import {
  DeletePayments,
  GetPaymentAttachments,
  UpdateInterestChargesPaymentStatus,
} from "../otherPayments.functions";
import { useTokenDetails } from "@/hooks";
import {
  dateStringToUtcConversion,
  formatDate,
  formatDollars,
  getDatePickerFormat,
  removeCommas,
} from "@/utils";
import { getListActionButtons } from "@/app/api/commonApi";
import { multipleFileUploadApi } from "@/network/apolloClient";
import BaseModal from "@/components/BaseModal";
import { checkBoxConfirmationMessage } from "../otherPayments.constants";
import FormikControl from "@/components/FormikControl";
import {
  buttonType,
  DateFormat,
  InputType,
  NUMBER_REGEX,
  quickAddRoutes,
} from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import FileSelector from "@/components/fileSelector/fileSelector";
import ShowMatchTxnTable from "../showingMatchTransactions";
import ShowPaymentTxnTable from "../showingPaymentTransactions";
import { ApiResponse } from "@/shared/constant/messages";

const WithdrawalForm = (props: any) => {
  const queryParams = useSearchParams();
  let claimType = queryParams.get("claim");
  console.log("🚀 ~ WithdrawalForm ~ claimType:", claimType);
  let DueDate = queryParams.get("due");
  let CreateDate = queryParams.get("create");

  const convertToISO = (dateStr: string | null) => {
    if (!dateStr) return undefined;
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`; // Convert to ISO format
  };

  const MaxRtaAmount = parseFloat(queryParams.get("amount") || "0");
  const retentionId = queryParams?.get("rid");
  const {
    isEdit,
    handleAddPayment,
    trustAccountList,
    data,
    isView,
    fromMatchScreen,
    fromMatchScreenBankID,
    paymentType,
  } = props;
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();

  const [fromSelectedValue, setFromSelectedValue] = useState<any>("");
  const [toSelectedValue, setToSelectedValue] = useState("");
  const [cashAccountList, setCashAccountList] = useState<any>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);
  const [accountError, setAccountError] = useState<any>();
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const validationSchema = Yup.object().shape({
    fromAccount: Yup.number().required("Payment from account is required"),
    toAccount: Yup.number().required("Payment to account is required"),
    bsb: Yup.number().required("BSB is required"),
    accountNumber: Yup.number().required("Account number amount is required"),
    paymentAmount: Yup.string().required("Payment amount is required"),
    paymentDate: Yup.string()
      .required("Payment date is required")
      .test(
        "payment Date",
        "Payment Date must be greater then bank account opening Date",
        function (value) {
          if (fromSelectedValue?.value) {
            let dataCon = new Date(fromSelectedValue?.data?.opening_date);
            return new Date(value) > dataCon;
          } else {
            return true;
          }
        }
      ),
    confirmPaid: Yup.boolean(),
  });

  useEffect(() => {
    if (
      retrieveAfterAddingQuickRecord ==
      quickAddRoutes.RETRIEVE_INTEREST_AND_CHARGES
    ) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    const bankIDFrom = queryParams?.get("bid");
    if (bankIDFrom) {
      try {
        const isRetentionClaim =
          claimType === "RetentionClaim" ||
          (isEdit && props?.data?.beneficiary_type === "Self");

        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        if (
          accountList?.data?.account_type !== "Retention Trust Account" ||
          isRetentionClaim
        ) {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          setAccountError("");
        } else if (!isRetentionClaim) {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);

          setAccountError(
            "Withdrawal cannot be added against the Retention Trust Account"
          );
        }
      } catch {}
    }
  }, [queryParams, isEdit, props?.data?.beneficiary_type, trustAccountList]);

  useEffect(() => {
    const bankIDFrom = fromMatchScreen ? fromMatchScreenBankID : null;
    if (bankIDFrom) {
      try {
        const isRetentionClaim =
          claimType === "RetentionClaim" ||
          (isEdit && props?.data?.beneficiary_type === "Self");

        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};

        if (
          accountList?.data?.account_type !== "Retention Trust Account" ||
          isRetentionClaim
        ) {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          setAccountError("");
        } else if (!isRetentionClaim) {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          // showErrorToast(
          //   "Withdrawal cannot be added against the Retention Trust Account"
          // );
          setAccountError(
            "Withdrawal cannot be added against the Retention Trust Account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [fromMatchScreen, fromMatchScreenBankID]);

  useEffect(() => {
    if (files.length > 0) {
      formik?.setFieldValue("uploaded_file", files);
    } else if (originalFiles.length > 0) {
      formik?.setFieldValue("uploaded_file", originalFiles);
    } else {
      formik?.setFieldValue("uploaded_file", "");
    }
  }, [files, originalFiles]);

  useEffect(() => {
    if (trustAccountList && data?.payment_id) {
      handleGetFileAttachments();
      let fAccountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_from_account?.toString()
        ) || {};
      setFromSelectedValue(fAccountList);

      let tAccountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_to_account?.toString()
        ) || {};
      setToSelectedValue(tAccountList);
      formik.setValues({
        fromAccount: data ? String(data?.payment_from_account) : "",
        toAccount: data ? String(data?.payment_to_account) : "",
        bsb: tAccountList?.data?.bsb_number || "",
        accountNumber: tAccountList?.data?.account_number || "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
        memo: data ? String(data?.memo) : "",
        confirmPaid: data ? data?.is_paid_confirmed : false,
      });
      (async () => {
        const Payload = {
          payment_id: data?.payment_id,
        };
        const response = await getListActionButtons(Payload);

        if (response && response?.payment_overview_buttons) {
          setActionsBtnData(response?.payment_overview_buttons);
        } else {
          setActionsBtnData({});
        }
      })();
    }
  }, [data, isEdit, isView, trustAccountList]);

  useEffect(() => {
    if (trustAccountList) {
      const filteredValue = trustAccountList?.filter(
        (d: any) => d?.data?.account_type === "Cash Account"
      );
      setCashAccountList(filteredValue);
    }
  }, [trustAccountList]);

  const handleFileChange = (newFiles: File[]) => {
    if (isEdit && originalFiles.length + files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      showErrorToast("You can only select up to five files.");
      return;
    }
    if (!isEdit && files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      showErrorToast("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    setFiles([...files, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames([...selectedFileNames, ...newFileNames]);
  };

  const formik: any = useFormik({
    initialValues: {
      fromAccount: data ? String(data?.payment_from_account) : "",
      toAccount: data ? String(data?.payment_to_account) : "",
      bsb: "",
      accountNumber: "",
      paymentAmount: "",
      paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
      memo: data ? String(data?.memo) : "",
      confirmPaid: data ? data?.is_paid_confirmed : false,

      // Add other form fields here
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      if (accountError) return;
      setLoader(true);
      // Handle form submission
      const companyId = Number(localStorage.getItem("companyId"));
      const paymentValues = removeCommas(values?.paymentAmount);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const payload: any = {
        company_id: companyId,
        payment_type: "Withdrawal",
        payment_to_account: Number(values?.toAccount),
        payment_from_account: Number(values?.fromAccount),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate || null,
        memo: values?.memo,
        is_paid_confirmed: values?.confirmPaid,
        retention_id:
          claimType === "RetentionClaim" ? Number(retentionId) : null,
      };
      try {
        let paymentResponse;
        if (!isEdit) {
          paymentResponse = await handleAddPayment(payload);
        } else {
          if (formik.values.confirmPaid === data?.is_paid_confirmed) {
            showInfoToast("No changes to save");
            return;
          }
          paymentResponse = await handleUpdatePayment(values?.confirmPaid);
        }

        if (files?.length > 0 && paymentResponse) {
          const paymentId = paymentResponse?.payment_id;
          const fileIds = await handleFileUploads(paymentId);
        }
        dispatch(
          setScreenDetails({
            fromScreen: "Interest and Charges",
            toScreen: "Project Overview",
            mainActiveTab: "",
            selectTab: "Retentions",
            subSelectTab: "",
          })
        );

        //if directed from retentions list to withdraw existing amount after claim then route back to retention list
        if (claimType == "RetentionClaim") {
          router.push(AppRoutes.USER_RETENTION_LIST);
        } else {
          router.back();
        }
      } catch {
      } finally {
        setLoader(false);
      }
    },
  });
  const handleDeleteInterestCharges = async () => {
    try {
      setDeleteDisabled(true);
      const payload = {
        payment_id: data?.payment_id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
            selectTab: "archivedAccounts",
          })
        );

        // need to change once overview done
        router.back();

        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_to_account}`
        // );
      }
      setInterestOpenModal(false);
    } catch (error: any) {
      console.log(error);
    }
  };
  const onDeleteClick = () => {
    setDeleteDisabled(false);
    setInterestOpenModal(!interestOpenModal);
    setPopupMessage((prev) => ({
      headerMsg: "",
      subHeaderMsg: "Are you sure you wish to delete this payment?",
    }));
  };
  const handleFileUploads = async (paymentId: number) => {
    try {
      let fileIds = [];
      if (files.length > 0) {
        let userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_attachments",
          payment_id: paymentId,
        };
        let multiUserData = files.map(() => userData);

        const fileResponse = await multipleFileUploadApi(
          files,
          multiUserData,
          accessTokenId
        );
        if (fileResponse?.length > 0) {
          fileIds = fileResponse.map((each: any) => each?.id);
        }
      }
      return fileIds;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  // Main function to handle contract value formatting
  const handleAmountChange = useCallback(
    (e: any) => {
      let { value } = e.target;
      let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

      // Allow clearing the input value (setting to empty)
      if (rawValue === "" || rawValue === "$ ") {
        formik.setFieldValue("paymentAmount", "");
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
        decimalPart !== undefined
          ? `${integerPart}.${decimalPart}`
          : integerPart;

      if (finalValue.replace(".", "").length > 13) {
        return; // Prevent more than 13 characters total (ignoring the decimal)
      }

      const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

      // Check if claimType is "RetentionClaim"
      if (claimType === "RetentionClaim") {
        if (rawValue && parseFloat(rawValue) > MaxRtaAmount) {
          formik.setFieldError(
            "paymentAmount",
            "Payment amount exceeds retained amount"
          );
        } else {
          formik.setFieldError("paymentAmount", "");
          formik.setFieldValue("paymentAmount", formattedValue);
        }
      } else {
        // Update form value
        formik.setFieldValue("paymentAmount", formattedValue);
      }
    },
    [MaxRtaAmount, claimType, formik]
  );

  const handleGetFileAttachments = async () => {
    try {
      const payload = {
        payment_id: data?.payment_id,
      };
      const response = await GetPaymentAttachments(payload);
      if (response?.length > 0) {
        setOriginalFiles(response);
      }
    } catch (error: any) {}
  };
  const handleViewFile = (item: any) => {
    if (
      isEdit &&
      item &&
      typeof item?.file === "string" &&
      item.file?.includes("base64")
    ) {
      fetch(item?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(item), "_blank");
    }
  };

  const handleUpdatePayment = async (status: any) => {
    try {
      const payload = {
        is_paid_confirmed: status,
        is_received_confirmed: false,
        payment_id: data?.payment_id,
        is_retention_confirmed: false,
      };
      const response = await UpdateInterestChargesPaymentStatus(payload);
      if (response) {
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
          })
        );
        // need to change once overview done
        router.back();
        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
        // );
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleBackWithReduxSet = (isFromProjectOverview = false) => {
    if (!isView && !isEdit) {
      showInfoToast("No changes saved");
    }

    // dispatch(
    //   setScreenDetails({
    //     ...screenDetails,
    //     fromScreen: "addInterest",
    //     toScreen: "bankOverView",
    //     mainActiveTab: isFromProjectOverview
    //       ? projectOverviewTabs.RETENTIONS
    //       : "Interest and Charges",
    //   })
    // );

    router.back();
  };

  const handleSelectToAccount = (selectedOption: any) => {
    formik.handleChange("toAccount")(selectedOption?.value || "");
    formik.setFieldValue("bsb", selectedOption?.data?.bsb_number || "");
    setToSelectedValue(selectedOption);
    formik.setFieldValue(
      "accountNumber",
      selectedOption?.data?.account_number || ""
    );
    const isRetentionClaim =
      claimType === "RetentionClaim" ||
      (isEdit && props?.data?.beneficiary_type === "Self");
    if (formik?.values?.fromAccount !== selectedOption?.value) {
      // setAccountError(null);
      if (fromSelectedValue?.data?.account_type !== "Retention Trust Account") {
        setAccountError(null);
      } else if (!isRetentionClaim) {
        // showErrorToast(
        //   "Withdrawal cannot be added against the Retention Trust Account"
        // );
        setAccountError(
          "Withdrawal cannot be added against the Retention Trust Account"
        );
      }
    } else {
      if (!isRetentionClaim) {
        // showErrorToast("From and To accounts shouldn't be same accounts");
        setAccountError("From and To accounts shouldn't be same accounts");
      }
    }
  };

  const handleBack = () => {
    if (fromMatchScreen) {
      showInfoToast("No changes saved");
      router.back();
      // return;
    }
    if (
      isEdit &&
      actionsBtnData?.edit &&
      formik.values.confirmPaid !== data?.is_paid_confirmed
    ) {
      setDisplayOnCancel(true);
      router.back();
      // return;
    }
    handleBackWithReduxSet();
  };

  function onConfirmPaidChange(value: boolean) {
    if (value) {
      setOpenModal(true);
    } else {
      formik.setFieldValue("confirmPaid", value);
    }
  }
  function handleConfirmCheck() {
    formik.setFieldValue("confirmPaid", true);
    setOpenModal(false);
  }

  async function handleAddQuickRecord(route: string) {
    const postData = {
      ...formik?.values,
      bid: queryParams?.get("bid"),
      accountType: paymentType,
      fromAccount: fromSelectedValue,
      quickAddFromInterestAndCharges: true,
    };

    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        router.push(route);
      }
    } catch {}
  }

  async function getStoredFormData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        const formData = result?.data;

        if (formData?.quickAddFromInterestAndCharges) {
          formik.setValues({
            fromAccount: formData?.fromAccount ? formData?.fromAccount : "",
            toAccount: formData?.toAccount ? formData?.toAccount : "",
            bsb: formData?.bsb ? formData?.bsb : "",
            accountNumber: formData?.accountNumber
              ? formData?.accountNumber
              : "",
            paymentAmount: formData?.paymentAmount
              ? formData?.paymentAmount
              : "",
            paymentDate: formData?.paymentDate ? formData?.paymentDate : "",
            confirmPaid: formData?.confirmPaid ? formData?.confirmPaid : false,
          });
          setFromSelectedValue(formData?.fromAccount);
        }
      }
    } catch {}
  }

  return (
    <>
      <div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Account Type"
            name="Payment From Account"
            label="Payment From Account"
            // secondLabel={data?.payment_id ? "" : "Add account"}
            // onSecondLabelClick={() =>
            //   handleAddQuickRecord(
            //     `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`
            //   )
            // }
            onChange={(selectedOption: any) => {
              formik.handleChange("fromAccount")(selectedOption?.value || "");
              setFromSelectedValue(selectedOption);
              const isRetentionClaim =
                claimType === "RetentionClaim" ||
                (isEdit && props?.data?.beneficiary_type === "Self");

              const selectedToAccount = trustAccountList?.find(
                (acc: any) => acc?.value === formik?.values?.toAccount
              );

              // ✅ Check if both accounts are of type "Cash Account"
              if (
                selectedOption?.data?.account_type === "Cash Account" &&
                selectedToAccount?.data?.account_type === "Cash Account" &&
                isRetentionClaim
              ) {
                setAccountError(null);
                return;
              }

              if (formik?.values?.toAccount !== selectedOption?.value) {
                // setAccountError(null);
                if (
                  selectedOption?.data?.account_type !==
                  "Retention Trust Account"
                ) {
                  setAccountError(null);
                } else if (!isRetentionClaim) {
                  // showErrorToast(
                  //   "Withdrawal cannot be added against the Retention Trust Account"
                  // );
                  setAccountError(
                    "Withdrawal cannot be added against the Retention Trust Account"
                  );
                }
              } else {
                // showErrorToast(
                //   "From and To accounts shouldn't be same accounts"
                // );
                setAccountError(
                  "From and To accounts shouldn't be same accounts"
                );
              }
            }}
            disabled={
              data?.payment_id ||
              claimType === "RetentionClaim" ||
              screenDetails?.fromScreen === "bankOverView"
            }
            selectedData={fromSelectedValue}
            options={trustAccountList}
            isRequired={
              !formik.values.fromAccount && formik.touched.fromAccount
                ? true
                : false
            }
            errorMessage={formik.errors.fromAccount}
            renderKey="label"
            valueKey="value"
            required
          />
          {accountError && !formik.errors.fromAccount && (
            <small className="invalid mt_0_5">
              <i className="fa-light fa-circle-xmark"></i>
              {accountError}
            </small>
          )}
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Account Type"
            name="Payment To Account"
            label="Payment To Account"
            secondLabel={data?.payment_id ? "" : "Add account"}
            onSecondLabelClick={() =>
              handleAddQuickRecord(
                `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`
              )
            }
            onChange={(selectedOption: any) => {
              handleSelectToAccount(selectedOption);
            }}
            disabled={data?.payment_id}
            selectedData={toSelectedValue}
            options={cashAccountList}
            isRequired={
              !formik.values.toAccount && formik.touched.toAccount
                ? true
                : false
            }
            errorMessage={formik.errors.toAccount}
            renderKey="label"
            valueKey="value"
            required
          />
          {accountError && !formik.errors.toAccount && (
            <small className="invalid mt_0_5">
              <i className="fa-light fa-circle-xmark"></i>
              {accountError}
            </small>
          )}
        </div>
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"BSB Number"}
          name={"BsbNumber"}
          placeholder="BSB Number"
          error={formik.errors?.bsb}
          // maxLength={11}
          showError={formik.touched.bsb && formik.errors.bsb}
          disabled={true}
          required
          onChange={(e: any) => {
            let number = e?.target?.value.trim();
            if (NUMBER_REGEX.test(number) || number === "") {
              formik.setFieldValue("bsb", number);
            }
          }}
          onBlur={formik.handleBlur("bsb")}
          value={formik.values?.bsb}
        />
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Account Number"}
          name={"Account Number"}
          placeholder="Account Number"
          error={formik.errors?.accountNumber}
          // maxLength={11}
          showError={
            formik.touched.accountNumber && formik.errors.accountNumber
          }
          disabled={true}
          required
          onChange={(e: any) => {
            let number = e?.target?.value.trim();
            if (NUMBER_REGEX.test(number) || number === "") {
              formik.setFieldValue("accountNumber", number);
            }
          }}
          onBlur={formik.handleBlur("accountNumber")}
          value={formik.values?.accountNumber}
        />
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Payment Amount"}
          error={formik?.errors?.paymentAmount}
          name="paymentAmount"
          id={"paymentAmount"}
          placeholder="Enter payment Amount"
          disabled={data?.payment_id ? true : false}
          value={formik?.values?.paymentAmount || ""}
          onChange={handleAmountChange}
          onBlur={formik.handleBlur}
          showError={
            formik.touched.paymentAmount && formik.errors.paymentAmount
          }
          required
        />
        <FormikControl
          control={InputType.DATE_PICKER}
          label={"Payment Date"}
          name={"paymentDate"}
          id={"paymentDate"}
          error={formik.errors.paymentDate}
          showError={formik.touched.paymentDate && formik.errors.paymentDate}
          required
          onChange={(selectedDateValue: any) => {
            formik.setFieldValue("paymentDate", selectedDateValue);
          }}
          onBlur={formik.handleBlur("paymentDate")}
          value={formik.values.paymentDate}
          disabled={data?.payment_id ? true : false}
          minDate={
            claimType === "RetentionClaim"
              ? convertToISO(CreateDate) || undefined // Set only if RetentionClaim
              : undefined // Don't set anything
          }
          maxDate={
            claimType === "RetentionClaim"
              ? convertToISO(DueDate) // Use DueDate when claimType is "RetentionClaim"
              : formatDate(new Date(), DateFormat.YYYY_MM_DD)
          }
        />

        <FormikControl
          // required
          id={"confirmPaid"}
          // label={"Confirm - Paid"}
          name={"confirmPaid"}
          control={InputType.CHECKBOX}
          options={[
            {
              value: Boolean(formik.values.confirmPaid),
              label: "Confirm - Paid",
            },
          ]}
          disabled={isView || (isEdit && !actionsBtnData?.edit)}
          selectedValue={formik.values.confirmPaid || "false"}
          onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
        />

        {/* <FormikControl
          as="textArea"
          // placeholder={"Input short project description/summary"}
          // required
          label={"Memo"}
          name={"memo"}
          id={"memo"}
          control={InputType.TEXT_AREA}
          renderKey="label"
          valueKey="value"
          disabled={data?.payment_id}
          error={formik.errors.memo}
          showError={formik.touched.memo && formik.errors.memo}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur("memo")}
          value={formik.values.memo}
          maxLength={250}
        /> */}
        <label>
          <small>Attachments</small>
        </label>
        <i className={"fa-light fa-paperclip"}></i>
        <small>&nbsp;&thinsp;Maximum Size: 20MB</small>
        <br />

        {!data?.payment_id && files?.length < 5 && (
          <FileSelector
            handleSave={(files) => {
              if (files.length > 0) {
                const fileArray = Array.from(files) as File[];
                // changeFileName
                const newFileArray = fileArray.map((file) => {
                  // const fileNameUUID = v4();
                  const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                  const newFile = new File([file], newFileName, {
                    type: file.type,
                  });
                  return newFile;
                });
                handleFileChange(newFileArray);
              }
            }}
            acceptedFileFormats={["application/pdf"]}
            multiple={true}
            maximumSize={20 * 1024}
            onError={(error) => {
              showErrorToast(`Max Allowed file size is ${20} Mb`);
            }}
          >
            <CustomButton
              buttonName={"Choose Files"}
              buttonType={buttonType.PRIMARY}
              actionType="button"
            />
          </FileSelector>
        )}

        {(isEdit || isView) &&
          originalFiles?.map((eachFile: any, index: number) => {
            return (
              <div
                className="pt_itemwithremove"
                style={{ margin: "5px 0px" }}
                key={index}
              >
                <span> {eachFile?.name || eachFile?.file_name}</span>
                <CustomButton
                  buttonName={"View"}
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName={"fa-light fa-eye"}
                  actionType="button"
                  onClick={() => handleViewFile(eachFile)}
                />
              </div>
            );
          })}
        {files?.map((eachFile: any, index: number) => {
          return (
            <div
              className="pt_itemwithremove"
              style={{ margin: "5px 0px" }}
              key={index}
            >
              <span> {eachFile?.name || eachFile?.file_name}</span>
              <div>
                <CustomButton
                  buttonName={"View"}
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName={"fa-light fa-eye"}
                  actionType="button"
                  onClick={() => handleViewFile(eachFile)}
                />
                {!isEdit && !isView && (
                  <CustomButton
                    buttonName={"Delete"}
                    buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                    iconClassName={"fa-light fa-trash"}
                    actionType="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Filter out the file that needs to be removed
                      const updatedFiles = files.filter(
                        (file, i) => i !== index
                      );
                      setFiles(updatedFiles);
                      let filterNames = selectedFileNames.filter(
                        (each: any) => each !== eachFile?.name
                      );
                      setSelectedFileNames(filterNames);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {(isView || isEdit) && (
          <div className="pt_expandtable" style={{ marginTop: "0.8rem" }}>
            <details>
              <summary>History </summary>

              <h4>Matched Transactions</h4>
              <ShowMatchTxnTable paymentId={data?.payment_id} />
              <br />
              <h4>Payment Transactions</h4>
              <ShowPaymentTxnTable paymentId={data?.payment_id} />
              <br />
            </details>
          </div>
        )}

        <br />
        {fromMatchScreen ? (
          <footer style={{ textAlign: "right" }}>
            <button
              type="submit"
              className="secondary"
              style={{ width: "auto" }}
              data-target="addpayment"
              onClick={() => {
                formik?.handleSubmit();
              }}
            >
              Add
            </button>
          </footer>
        ) : (
          <div className="grid">
            <CustomButton
              buttonName={"Cancel"}
              buttonType={buttonType.OUTLINE_CONTRAST}
              actionType="button"
              onClick={() => handleBack()}
              inputButton
            />

            {(isView || isEdit) && actionsBtnData?.delete && (
              <CustomButton
                buttonName={"Delete"}
                buttonType={buttonType.PRIMARY}
                actionType="button"
                onClick={() => onDeleteClick()}
                inputButton
              />
            )}
            {isView && actionsBtnData?.edit && (
              <CustomButton
                buttonName={"Edit"}
                buttonType={buttonType.SECONDARY}
                actionType="button"
                onClick={() => {
                  dispatch(
                    setScreenDetails({
                      fromScreen: "bankOverView",
                      toScreen: "Interest and Charges",
                      mainActiveTab: "",
                      selectTab: "",
                      subSelectTab: "",
                    })
                  );
                  router.push(
                    `${AppRoutes.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
                  );
                }}
                inputButton
              />
            )}
            {((!isView && isEdit && actionsBtnData?.edit) ||
              (!isView && !isEdit)) && (
              <CustomButton
                buttonName={isEdit ? "Update" : "Save"}
                buttonType={buttonType.SECONDARY}
                actionType="submit"
                onClick={() => {
                  formik?.handleSubmit();
                }}
                inputButton
              />
            )}
          </div>
        )}
      </div>
      {interestOpenModal && (
        <BaseModal
          modalId={"Delete type"}
          title={popupMessage?.headerMsg || ""}
          displayModal={interestOpenModal}
          onClose={() => setInterestOpenModal(false)}
          // onHeaderIconClose={() => setInterestOpenModal(false)}
          onConfirm={() => {
            handleDeleteInterestCharges();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
          disableSecondButton={deleteDisabled}
          // restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">{popupMessage?.subHeaderMsg || ""}</h4>
        </BaseModal>
      )}
      {openModal && (
        <BaseModal
          modalId={"checkbox status popup"}
          displayModal={openModal}
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            handleConfirmCheck();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {`${checkBoxConfirmationMessage} Paid?`}
          </h4>
        </BaseModal>
      )}

      {displayOnCancel && (
        <BaseModal
          modalId={"Display cancel popup"}
          displayModal={displayOnCancel}
          onHeaderIconClose={() => setDisplayOnCancel(false)}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setDisplayOnCancel(false);
            handleBackWithReduxSet();
          }}
          onConfirm={() => {
            setDisplayOnCancel(false);
            formik?.handleSubmit();
            return true;
          }}
          firstButtonName="Yes"
          secondButtonName="Save"
        >
          <h4 className="text_center">
            {"Are you sure to close and not save?"}
          </h4>
        </BaseModal>
      )}
    </>
  );
};

export default WithdrawalForm;
