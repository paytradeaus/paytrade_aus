"use client";
import React, { useCallback, useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./otherPayment.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Col, Form, Row } from "react-bootstrap";
import { ExclamationTriangleFill, Paperclip } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "@/app/Toaster";
import {
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR_ONLY,
  onlyDOCandPDF,
  onlyPDFFiles,
} from "@/common/constants/general";
import * as Yup from "yup";
import { useFormik } from "formik";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import CheckBox from "@/components/CheckBox/checkBox";
import {
  GetPaymentAttachments,
  UpdateInterestChargesPaymentStatus,
} from "./bankInterest.function";
import { multipleFileUploadApi } from "@/app/api/commonAPIs";
import { useTokenDetails } from "@/common/commonHooks";
import { useLoaderContext } from "@/context/useLoader";
import { DeletePayments } from "../backTrustAccount.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { getListActionButtons } from "@/app/api/commonAPIs";
import { AppModal } from "@/components/model/model";
import ShowMatchTxnTable from "./showingMatchTransactions";
import { checkBoxConfirmationMessage } from "../../payApps/payments/payments.constant";
import { formatDollars, removeCommas } from "@/common/commonFunctions";

const WithdrawalForm = (props: any) => {
  const queryParams = useSearchParams();
  let claimType = queryParams.get("claim");
  const MaxRtaAmount = parseFloat(queryParams.get("amount") || "0");
  const retentionId = queryParams?.get("rid");

  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
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
    // memo: Yup.string().required("Memo is required"),
    confirmPaid: Yup.boolean(),
  });

  const {
    isEdit,
    handleAddPayment,
    fromAccountList,
    toAccountList,
    data,
    isView,
    fromMatchScreen,
    setIsShowAddOtherPayments,
    fromMatchScreenBankID,
  } = props;
  const router: any = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [fromSelectedValue, setFromSelectedValue] = useState<any>("");
  const [toSelectedValue, setToSelectedValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [cashAccountList, setCashAccountList] = useState<any>();
  const [fromAccountData, setFromAccountData] = useState<any>();
  const [isdueDate, setDueDate] = useState<Date | undefined>(undefined);

  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [accountError, setAccountError] = useState<any>();
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);

  useEffect(() => {
    const dueDate = queryParams.get("due");

    // if (dueDate) {
    //   const parsedDueDate = parseDate(dueDate);
    //   if (!isNaN(parsedDueDate.getTime())) {
    //     setDueDate(parsedDueDate);
    //   } else {
    //     console.error("Invalid due date format:", dueDate);
    //   }
    // }
    const bankIDFrom = queryParams?.get("bid");
    const claimType = queryParams?.get("claim");
    if (bankIDFrom) {
      try {
        const isRetentionClaim =
          claimType === "RetentionClaim" ||
          (isEdit && props?.data?.beneficiary_type === "Self");
        // console.log("🚀 ~ useEffect ~ isRetentionClaim:", isRetentionClaim);

        let accountList =
          toAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        // console.log("🚀 ~ useEffect ~ accountList:", accountList);

        // formik.setFieldValue("fromAccount", bankIDFrom);
        // setFromSelectedValue(accountList);

        if (
          accountList?.data?.account_type !== "Retention Trust Account" ||
          isRetentionClaim
        ) {
          // console.log("1");
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          setAccountError("");
        } else if (!isRetentionClaim) {
          // console.log("2");

          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          toast.error(
            "Withdrawal cannot be added against the Retention Trust Account"
          );
          setAccountError(
            "Withdrawal cannot be added against the Retention Trust Account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [queryParams, isEdit, props?.data?.beneficiary_type, toAccountList]);

  useEffect(() => {
    const bankIDFrom = fromMatchScreen ? fromMatchScreenBankID : null;
    const claimType = queryParams?.get("claim");
    if (bankIDFrom) {
      try {
        const isRetentionClaim =
          claimType === "RetentionClaim" ||
          (isEdit && props?.data?.beneficiary_type === "Self");

        let accountList =
          toAccountList?.find(
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
          toast.error(
            "Withdrawal cannot be added against the Retention Trust Account"
          );
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
    if (fromAccountList && data?.payment_id && toAccountList) {
      handleGetFileAttachments();
      let fAccountList =
        fromAccountList.find(
          (each: any) => each?.value === data?.payment_from_account?.toString()
        ) || {};
      setFromSelectedValue(fAccountList);

      let tAccountList =
        toAccountList.find(
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
        paymentDate: data ? new Date(data?.payment_date) : "",
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
  }, [data, isEdit, isView, toAccountList]);

  useEffect(() => {
    if (toAccountList) {
      const filteredvalue = toAccountList?.filter(
        (d: any) => d?.data?.account_type === "Cash Account"
      );
      setCashAccountList(filteredvalue);
      setFromAccountData(toAccountList);
    }
  }, [toAccountList]);
  const handleFileChange = (newFiles: File[]) => {
    if (isEdit && originalFiles.length + files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
      return;
    }
    if (!isEdit && files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
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
  const formik = useFormik({
    initialValues: {
      fromAccount: data ? String(data?.payment_from_account) : "",
      toAccount: data ? String(data?.payment_to_account) : "",
      bsb: "",
      accountNumber: "",
      paymentAmount: "",
      paymentDate: data ? new Date(data?.payment_date) : "",
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
      const payload = {
        company_id: companyId,
        payment_type: "Withdrawal",
        payment_to_account: Number(values?.toAccount),
        payment_from_account: Number(values?.fromAccount),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate,
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
            toast.info("No changes to save");
            return;
          }
          paymentResponse = await handleUpdatePayment(values?.confirmPaid);
        }

        if (files?.length > 0 && paymentResponse) {
          const paymentId = paymentResponse?.payment_id;
          const fileIds = await handleFileUploads(paymentId);
        }
      } catch (error) {
        console.error("Error handling form submission:", error);
      } finally {
        // Stop loading
        setLoader(false);
      }
    },
  });

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

  const handleSelectToAccount = (selectedOption: any) => {
    formik.handleChange("toAccount")(selectedOption?.value || "");
    formik.setFieldValue("bsb", selectedOption?.data?.bsb_number || "");
    setToSelectedValue(selectedOption);
    formik.setFieldValue(
      "accountNumber",
      selectedOption?.data?.account_number || ""
    );
    const claimType = queryParams.get("claim");
    const isRetentionClaim =
      claimType === "RetentionClaim" ||
      (isEdit && props?.data?.beneficiary_type === "Self");
    if (formik?.values?.fromAccount !== selectedOption?.value) {
      // setAccountError(null);
      if (fromSelectedValue?.data?.account_type !== "Retention Trust Account") {
        setAccountError(null);
      } else if (!isRetentionClaim) {
        toast.error(
          "Withdrawal cannot be added against the Retention Trust Account"
        );
        setAccountError(
          "Withdrawal cannot be added against the Retention Trust Account"
        );
      }
    } else {
      if (!isRetentionClaim) {
        toast.error("From and To accounts shouldn't be same accounts");
        setAccountError("From and To accounts shouldn't be same accounts");
      }
    }
  };

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
        // router.back();
        const companyId = Number(localStorage.getItem("companyId"));
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
        );
      }
    } catch (error: any) {
      console.log(error);
    }
  };
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
        // router.back();
        const companyId = Number(localStorage.getItem("companyId"));
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
        );
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

  const handleBackWithReduxSet = () => {
    if (!isView && !isEdit) {
      toast.info("No changes saved");
    }
    dispatch(
      setScreenDetails({
        ...screenDetails,
        fromScreen: "addInterest",
        toScreen: "bankOverView",
        mainActiveTab: "Interest and Charges",
      })
    );
    router.back();
  };

  const handleBack = () => {
    if (fromMatchScreen) {
      toast.info("No changes saved");
      setIsShowAddOtherPayments && setIsShowAddOtherPayments(false);
      return;
    }
    if (
      isEdit &&
      actionsBtnData?.edit &&
      formik.values.confirmPaid !== data?.is_paid_confirmed
    ) {
      setDisplayOnCancel(true);
      return;
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
  return (
    <>
      <div>
        <Form onSubmit={formik.handleSubmit}>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <SearchableSelect
                key={accountError}
                label="Payment From Account *"
                singleSelectedData={fromSelectedValue}
                onChange={(selectedOption) => {
                  formik.handleChange("fromAccount")(
                    selectedOption?.value || ""
                  );
                  setFromSelectedValue(selectedOption);
                  const claimType = queryParams.get("claim");
                  const isRetentionClaim =
                    claimType === "RetentionClaim" ||
                    (isEdit && props?.data?.beneficiary_type === "Self");
                  if (formik?.values?.toAccount !== selectedOption?.value) {
                    // setAccountError(null);
                    if (
                      selectedOption?.data?.account_type !==
                      "Retention Trust Account"
                    ) {
                      setAccountError(null);
                    } else if (!isRetentionClaim) {
                      toast.error(
                        "Withdrawal cannot be added against the Retention Trust Account"
                      );
                      setAccountError(
                        "Withdrawal cannot be added against the Retention Trust Account"
                      );
                    }
                  } else {
                    toast.error(
                      "From and To accounts shouldn't be same accounts"
                    );
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
                options={fromAccountData}
                isRequired={
                  !formik.values.fromAccount && formik.touched.fromAccount
                    ? true
                    : false
                }
                errorMessage={formik.errors.fromAccount}
              />
              {accountError && !formik.errors.fromAccount && (
                <div className={styles.errorContainer}>
                  <ExclamationTriangleFill className={styles.error} />
                  <span className={styles.errorTextStyles}>{accountError}</span>
                </div>
              )}
            </Col>
            <Col lg={4}></Col>
            <Col lg={4}></Col>
          </Row>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <SearchableSelect
                label="Payment To Account *"
                singleSelectedData={toSelectedValue}
                onChange={(selectedOption) => {
                  handleSelectToAccount(selectedOption);
                }}
                disabled={data?.payment_id}
                options={cashAccountList}
                isRequired={
                  !formik.values.toAccount && formik.touched.toAccount
                    ? true
                    : false
                }
                errorMessage={formik.errors.toAccount}
              />
              {accountError && !formik.errors.toAccount && (
                <div className={styles.errorContainer}>
                  <ExclamationTriangleFill className={styles.error} />
                  <span className={styles.errorTextStyles}>{accountError}</span>
                </div>
              )}
            </Col>
            <Col lg={4}>
              <TextField
                type="number"
                min={0}
                labelText="BSB *"
                name="bsb"
                id="bsb"
                disabled={true}
                maxLength={11}
                className={styles.text}
                value={formik.values.bsb}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={formik.errors.bsb}
                isInvalid={
                  formik.touched.bsb && formik.errors.bsb ? true : false
                }
              />
            </Col>
            <Col lg={4}>
              <TextField
                labelText="Account Number *"
                name="accountNumber"
                id="accountNumber"
                className={styles.text}
                disabled={true}
                value={formik.values.accountNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={formik.errors.accountNumber}
                isInvalid={
                  formik.touched.accountNumber && formik.errors.accountNumber
                    ? true
                    : false
                }
              />
            </Col>
          </Row>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <TextField
                type="text"
                labelText="Payment Amount *"
                name="paymentAmount"
                id="paymentAmount"
                disabled={data?.payment_id}
                className={styles.text}
                value={formik.values.paymentAmount}
                onChange={handleAmountChange}
                onBlur={formik.handleBlur}
                errorText={formik.errors.paymentAmount}
                isInvalid={
                  formik.touched.paymentAmount && formik.errors.paymentAmount
                    ? true
                    : false
                    ? true
                    : false
                }
              />
            </Col>
            <Col lg={4}>
              <div>
                <CustomDatePicker
                  showIcon={true}
                  label="Payment Date *"
                  key={fromSelectedValue?.data?.opening_date}
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.paymentDate}
                  value={formik?.values?.paymentDate}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("paymentDate", selectedDate);
                  }}
                  disabled={data?.payment_id}
                  format={DD_MM_YYYY}
                  maxDate={new Date()}
                  // minDate={
                  //   claimType === "RetentionClaim" && isdueDate
                  //     ? isdueDate
                  //     : fromSelectedValue?.data?.opening_date
                  //     ? new Date(
                  //         new Date(fromSelectedValue?.data?.opening_date)
                  //       )
                  //     : new Date()
                  // }
                  className={
                    formik.touched.paymentDate && formik.errors.paymentDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.paymentDate && formik.errors.paymentDate && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill className={styles.error} />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.paymentDate}
                    </span>
                  </div>
                )}
              </div>
            </Col>
            <Col lg={4}>
              <div className={styles.confirmation}>
                <CheckBox
                  label="Confirm - Paid"
                  id="confirmPaid"
                  className={styles.checkBoxHeights}
                  disabled={isView || (isEdit && !actionsBtnData?.edit)}
                  checked={formik.values.confirmPaid}
                  // onChange={(e) => {
                  //   formik.setFieldValue("confirmPaid", e.target.checked);
                  // }}
                  onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
                />
              </div>
            </Col>
          </Row>
          {/* attachments */}
          <div className={styles.attachText}>Attachments</div>
          <span className={styles.fileSelectorContainer}>
            <Paperclip />
            <span className={styles.sizeStyles}>
              &nbsp;&thinsp;Maximum Size: 20MB
            </span>
          </span>
          <Row>
            <Col lg={5}>
              {(isEdit || isView) &&
                originalFiles?.map((eachFile: any, index: number) => {
                  return (
                    <div key={index}>
                      <Row className="mt-2">
                        <Col lg={7}>
                          <div
                            className={styles.eachFielDetailsView}
                            key={index}
                          >
                            <span
                              className={styles.nameStyles}
                              title={eachFile?.name || eachFile?.file_name}
                            >
                              {eachFile?.name || eachFile?.file_name}
                            </span>
                          </div>
                        </Col>
                        <Col lg={2}>
                          <span
                            className={styles.fileText}
                            onClick={() => handleViewFile(eachFile)}
                          >
                            - View
                          </span>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              {files?.map((eachFile: any, index: number) => {
                return (
                  <div key={index}>
                    <Row className="mt-2">
                      <Col lg={7}>
                        <div className={styles.eachFielDetailsView} key={index}>
                          <span
                            className={styles.nameStyles}
                            title={eachFile?.name || eachFile?.file_name}
                          >
                            {eachFile?.name || eachFile?.file_name}
                          </span>
                        </div>
                      </Col>
                      <Col lg={2}>
                        <span
                          className={styles.fileText}
                          onClick={() => handleViewFile(eachFile)}
                        >
                          - View
                        </span>
                      </Col>
                      {!isEdit && !isView && (
                        <Col lg={2}>
                          <span
                            onClick={() => {
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
                            className={styles.removeTxt}
                          >
                            Remove
                          </span>
                        </Col>
                      )}
                    </Row>
                  </div>
                );
              })}
            </Col>

            <Col lg={5}>
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
                  acceptedFileFormats={onlyPDFFiles}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                >
                  <span className={styles.fileSelectorContainer}>
                    <FormButton className={styles.btn1}>+ Add</FormButton>
                  </span>
                </FileSelector>
              )}
            </Col>
            <Col lg={2}></Col>
            <Col lg={5}></Col>
          </Row>
          {(isView || isEdit) && (
            <ShowMatchTxnTable paymentId={data?.payment_id} />
          )}
          <Row className="mt-5">
            <Col lg={6} md={6} sm={12} xs={12}>
              <Button
                onClick={() => handleBack()}
                className={styles.cancelStyle}
              >
                Cancel
              </Button>
            </Col>

            <Col lg={6} className={styles.saveStyles}>
              {(isView || isEdit) && actionsBtnData?.delete && (
                <Button
                  onClick={() => onDeleteClick()}
                  className={styles.deleteButton}
                >
                  Delete
                </Button>
              )}
              {isView && actionsBtnData?.edit && (
                <Button
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
                      `${ApplicationURLS.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
                    );
                  }}
                  className={styles.buttonStyles}
                >
                  Edit
                </Button>
              )}
              {((!isView && isEdit && actionsBtnData?.edit) ||
                (!isView && !isEdit)) && (
                <Button type="submit" className={styles.buttonStyles}>
                  {isEdit ? "Update" : "Save"}
                </Button>
              )}
            </Col>
          </Row>
        </Form>
      </div>
      <AppModal
        show={interestOpenModal}
        onHide={() => setInterestOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        disabled={deleteDisabled}
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleDeleteInterestCharges();
        }}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={""}
        modalBodyContent={`${checkBoxConfirmationMessage} Paid?`}
        onConfirm={() => {
          handleConfirmCheck();
        }}
      />
      <AppModal
        show={displayOnCancel}
        onHide={() => {
          setDisplayOnCancel(false);
          formik?.handleSubmit();
        }}
        secondButtonLabel="Save"
        firstButtonLabel="Yes"
        modalBodyContent={"Are you sure to close and not save?"}
        onConfirm={() => handleBackWithReduxSet()}
        closeButton={true}
        onCloseIconClick={() => setDisplayOnCancel(false)}
      />
    </>
  );
};

export default WithdrawalForm;
