"use client";
import { useFormik } from "formik";
import { createContext, useState, useContext, useEffect } from "react";
import { deleteCookie, getCookie } from "cookies-next";
import { useLoaderContext } from "@/context/useLoader";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { isEqual } from "lodash";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import _ from "lodash";
import { getBankAccountLists } from "../Contracts/contracts.functions";
import {
  addPayments,
  fetchPayments,
  fetchViewPayments,
  TriggerPaymentNotices,
  updatePayments,
} from "./Payment.functions";
import { useTokenDetails } from "@/hooks";
import {
  multipleFileUploadApi,
  ReadFileAttachmentsOrDocuments,
} from "@/app/api/commonApi";
import {
  convertPositiveDecimalTwoDigit,
  dateStringToUtcConversion,
  formatDollars,
  getDatePickerFormat,
  mapDropdownOptions,
  replaceDollarSymbol,
} from "@/utils";
import {
  findSelectedOptions,
  VIEW,
  VIEW_ARCHIVE,
} from "@/shared/constant/general";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { SubscriptionPlanTypes } from "../AddUpdateClaims/AddUpdateClaims.constant";
import { routedFrom, tabTypes } from "./Payments.constants";
import { initialValues, paymentsSchema } from "./Payment.validations";
import {
  setPaymentAttachments,
  setPayments,
} from "@/redux/slices/subscribeRouteBackDetails";
import { showErrorToast } from "@/components/Toaster";
import {
  unMappingPayments,
  viewXeroSyncLog,
} from "../UserIntegrations/integration.functions";
import { CreateClaimInPaytrade } from "../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";

const PaymentsContext: any = createContext(null);

const AUTO_CLOSE_TIME = 30;
const PAUSE_DURATION_SECONDS = 5 * 60; // 5 minutes

export const PaymentsProvider = ({ children }: any) => {
  const previousPage = getCookie("from_page");
  const dispatch = useAppDispatch();

  //useState and useEffect Management
  const [optionalFiles, setOptionalFiles] = useState<File[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isFree, setIsFree] = useState(false);
  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan
  const [retentionDisable, setRetentionAccountDisable] = useState(false);

  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);
  const [compulsoryFiles, setCompulsoryFiles] = useState<File[]>([]);
  const [isCompulsoryAttachmentRequired, setIsCompulsoryAttachmentRequired] =
    useState(false);
  const [disablePaymentTo, setDisablePaymentTo] = useState(false);
  const [disableSaveButton, setDisableSaveButton] = useState(false);
  const [displayPopup, setDisplayPopup] = useState(false); // State to control the popup

  //other Hooks
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const router = useRouter();

  const { setLoader, loader, setLoaderInfo }: any = useLoaderContext();

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);
  const [delegateAuthorityAllowed, setDelegateAuthorityAllowed] = useState<
    boolean | null
  >(null);
  const [noticesAutomated, setNoticesAutomated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const [isNoticePopupPaused, setIsNoticePopupPaused] = useState(false);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(0);
  const progressPercent =
    ((AUTO_CLOSE_TIME - timeLeft) / AUTO_CLOSE_TIME) * 100;

  const pauseNoticePopup = () => {
    if (isNoticePopupPaused) return;
    setIsNoticePopupPaused(true);
    setPauseSecondsLeft(PAUSE_DURATION_SECONDS);
  };

  const resetNoticePauseState = () => {
    setIsNoticePopupPaused(false);
    setPauseSecondsLeft(0);
  };

  const queryParams = useSearchParams();
  const claimId: any = queryParams.get("claim");
  const ImportId: any = queryParams.get("importid");
  const routedFromPage: any = queryParams.get("routed-from");
  const ImportScreen: any = queryParams.get("screen");
  const CashRetentionType: any = queryParams.get("crt");
  const screenMode = queryParams.get("mode");
  const paymentId: any = queryParams.get("payment");
  const overViewId: any = queryParams.get("overview");
  const overViewTab: any = queryParams.get("from");
  const IsActivity: any = queryParams.get("from");
  const tabType: any = queryParams.get("tab");
  const isNextPayment: any = queryParams.get("next-payment");
  const overviewType = queryParams.get("overviewType");
  const overviewProjectId = queryParams.get("overviewProjectId");
  const overViewPage: any = queryParams.get("overview-type");
  const beneficiaryType: any = queryParams.get("beneficiary");

  const deleteParam: any = queryParams.get("delete");
  const unmapidParam: any = queryParams.get("unmapid");
  const syncId: any = queryParams.get("syncId");
  const paymentType = getCookie("PaymentType");
  const [isViewMode] = useState(
    screenMode === VIEW || screenMode === VIEW_ARCHIVE
  );
  const [isImportMode] = useState(ImportScreen === "import");
  const [patchData, setPatchData] = useState<any>(null);

  const [retentionBankAccounts, setRetentionBankAccounts] = useState<any[]>([]);
  const [isEditable, setIsEditable] = useState(false);
  const [disablePayLessAmount, setDisablePayLessAmount] = useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.paymentsData
  );
  const retainedAttachmentFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.paymentAttachments
  );

  //Formik Handling

  const formik: any = useFormik({
    initialValues: initialValues,
    validationSchema: paymentsSchema(),
    onSubmit: () => handleSubmit(),
  });

  const userMode = localStorage.getItem("userMode");
  const OnboardpaymentType = formik?.values?.payment_type;

  const paymentTypesRequiringPopup = [
    "Pay Less - Full",
    "Pay Less - Part",
    "Pay - Zero",
    "pay 3rd party only",
    "3rd Party",
    null,
  ];

  // Reset timer when popup opens
  useEffect(() => {
    if (
      showNoticePopup &&
      (noticeFiles?.length > 0 || qbccNoticeFiles?.length > 0)
    ) {
      setTimeLeft(AUTO_CLOSE_TIME);
      resetNoticePauseState();
    }
    if (!showNoticePopup) {
      resetNoticePauseState();
    }
  }, [showNoticePopup]);

  useEffect(() => {
    if (
      (noticeFiles.length > 0 || qbccNoticeFiles.length > 0) &&
      showNoticePopup === false
    ) {
      setLoader(false);
      setShowNoticePopup(true);
    }
  }, [noticeFiles, qbccNoticeFiles]);

  // Countdown effect
  useEffect(() => {
    if (!showNoticePopup) return;
    if (isNoticePopupPaused) return;

    // 👉 Simulate confirm (same as clicking "Send Mail")
    if (timeLeft === 0) {
      const modal = document.getElementById(
        "Generated Notices"
      ) as HTMLDialogElement;

      if (modal) {
        const confirmBtn = modal.querySelector(
          "footer button:last-child"
        ) as HTMLButtonElement; // last button = confirm
        confirmBtn?.click();
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showNoticePopup, isNoticePopupPaused]);

  // Pause countdown effect — counts down the 5-minute pause window,
  // then auto-resumes the original auto-send countdown from where it was frozen.
  useEffect(() => {
    if (!showNoticePopup) return;
    if (!isNoticePopupPaused) return;

    if (pauseSecondsLeft <= 0) {
      setIsNoticePopupPaused(false);
      return;
    }

    const timer = setTimeout(() => {
      setPauseSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pauseSecondsLeft, showNoticePopup, isNoticePopupPaused]);

  useEffect(() => {
    if (ImportScreen != "import") {
      initialInvoke();
    }
  }, []);

  useEffect(() => {
    if (selectedClaim) {
      getPayments(); // Call the API only when selectedClaim is available
    }
  }, [selectedClaim]);

  useEffect(() => {
    if (patchData?.project_id) {
      getRetentionBankAccounts();
    }
    if (patchData?.payment_overview_buttons?.edit) {
      setIsEditable(true);
    }
  }, [patchData]);

  // This effect runs to set initial patched values from formik values specifically after retention account update completes.
  // Specifically, it only sets values if the current and initial patched values are not equal
  // and if `initialPatchedValues` either hasn't been set or requires updating.
  useEffect(() => {
    if (
      // Check if initial values and patched values are not equal by calling `isInitialAndPatchedValuesEqual`
      !isInitialAndPatchedValuesEqual() &&
      // Ensure we need to set initial patched values:
      // - `initialPatchedValues.retention_account` is null and `patchData.retention_from_account` exists
      (!initialPatchedValues ||
        (initialPatchedValues?.retention_account === null &&
          patchData?.retention_from_account &&
          !isViewMode) ||
        (isViewMode &&
          ((patchData?.cash_retention === "Retention" &&
            patchData?.retention_account) ||
            patchData?.cash_retention !== "Retention")))
    ) {
      // Destructure `formik.values` to exclude `total_amount` since it is not user editable and dependent on other fields, ensuring we do not set it in `initialPatchedValues`
      const { total_amount, ...formikValuesWithoutTotal } =
        formik?.values || {};
      // Update `initialPatchedValues` with all values from `formik.values`,
      setInitialPatchedValues(formikValuesWithoutTotal);
    }
  }, [formik?.values?.retention_account]);

  useEffect(() => {
    const { claim_type, payment_type, payment_to } = formik?.values;
    if (isViewMode && claim_type && payment_type && payment_to) {
      findAttachmentType();
    }
  }, [
    formik?.values?.claim_type,
    formik?.values?.payment_type,
    formik?.values?.payment_to,
  ]);

  //Functions

  function initialInvoke() {
    getPayments();

    if (
      tabType === routedFrom.RETENTION_CLAIM_ONE ||
      tabType === routedFrom.RETENTION_CLAIM_TWO
    ) {
      formik.setFieldValue("cash_retention", tabTypes.NO_RETENTION);
    }
  }

  async function getRetentionBankAccounts() {
    try {
      const companyId: any = getCookie("companyId");

      const postData = {
        company_id: +companyId,
        type: patchData?.client_supplier_type,
        project_id: patchData?.project_id,
        client_supplier_id: patchData?.client_supplier_id,
        retention_type: "Cash",

        client_supplier_role: patchData?.client_supplier_role,
      };

      const response: any = await getBankAccountLists(postData);

      if (response) {
        const modifiedOptions = mapDropdownOptions(
          response?.retention_from_account,
          "account_name",
          "bank_account_id"
        );
        setRetentionBankAccounts(modifiedOptions);

        if (isViewMode) {
          formik?.setFieldValue(
            "retention_account",
            findSelectedOptions(modifiedOptions, patchData?.retention_account)
          );
        }
      } else {
        setRetentionBankAccounts([]);
      }
    } catch {}
  }

  function isInitialAndPatchedValuesEqual() {
    return isEqual(formik?.initialValues, formik?.values);
  }
  function setRetainedDataFromSubscription() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      formikPatchValues(retainedDataFromSubscription);
      setPatchData(retainedDataFromSubscription);
      setLoader(false);
      if (!_.isEmpty(retainedAttachmentFromSubscription)) {
        setOptionalFiles(retainedAttachmentFromSubscription?.optional);
        setCompulsoryFiles(retainedAttachmentFromSubscription?.compulsory);
      }
      return true;
    }
  }

  function handleRoute(dynamicRoute?: string, actionType?: string) {
    setRetainedDataFromSubscription();

    if (dynamicRoute) {
      router.push(dynamicRoute);
    } else if (actionType == "deleted" && routedFromPage == "claim") {
      router.push(`${AppRoutes.USER_VIEW_CLAIMS}/${claimId}?mode=view`);
    } else {
      router.back();
    }
    setLoader(false);
  }

  async function getPayments() {
    try {
      setLoader(true);
      if (setRetainedDataFromSubscription()) {
        return;
      }
      const companyId = getCookie("companyId");

      const addPostData = {
        payload: {
          company_id: companyId ? Number(companyId) : "",
          payment_claim_id:
            ImportScreen === "import"
              ? selectedClaim?.value
                ? Number(selectedClaim?.value)
                : null // If `selectedClaim` is present, use it, otherwise null
              : claimId
              ? Number(claimId)
              : "", // If `ImportScreen` is not "import", check `claimId`
          payment_type: paymentType,
          import_id: ImportId || "",
        },
      };
      const viewPostData = {
        payload: {
          payment_id: paymentId ? Number(paymentId) : "",
        },
      };

      const api = isViewMode
        ? fetchViewPayments(viewPostData)
        : fetchPayments(addPostData);

      const response: any = await api;

      if (response) {
        setPatchData(response);

        formikPatchValues(response);
      } else {
        setPatchData([]);
      }
      setLoader(false);
      return true;
    } catch {
      setLoader(false);
      return false;
    }
  }

  async function formikPatchValues(values: any) {
    await formik.setValues({
      ...values,
      isOnboardingModelOpen: false,
      cash_retention: getCashRetentionType(values),
      payment_to:
        values?.payment_type === tabTypes.THIRD_PARTY
          ? tabTypes.THIRD_PARTY
          : tabTypes.SUPPLIER,
      payment_date: values?.payment_date
        ? getDatePickerFormat(values?.payment_date)
        : "",

      payment_amount: ImportId
        ? `$ ${convertPositiveDecimalTwoDigit(values?.payment_amount)}`
        : values?.payment_amount
        ? `$ ${convertPositiveDecimalTwoDigit(values.payment_amount)}`
        : "",

      retention_amount: ImportId
        ? `$ ${convertPositiveDecimalTwoDigit(values.retention_amount)}`
        : values?.retention_amount
        ? `$ ${convertPositiveDecimalTwoDigit(values.retention_amount)}`
        : "",
      retention_release_date: values?.retention_release_date
        ? getDatePickerFormat(values?.retention_release_date)
        : values?.defect_liability_end_date
        ? getDatePickerFormat(values?.defect_liability_end_date)
        : "",
      payment_type: values?.payment_type,
      memo: values?.memo ?? "",
      is_paid_confirmed:
        values?.is_paid_confirmed || values?.is_received_confirmed || false,
      total_amount: values?.total_amount ?? 0,
      third_party_payment_reason: values?.third_party_payment_reason,
      payless_amount: values?.payless_amount
        ? `$ ${
            values?.payless_amount
              ? convertPositiveDecimalTwoDigit(values?.payless_amount)
              : ""
          }`
        : "",
      client_supplier_name:
        values?.client_supplier_name ?? values?.client_supplier_type,
      ...(isViewMode ? {} : { retention_account: null }),
      is_retention_confirmed: values?.is_retention_confirmed ?? false,
      status: values?.status || "",
      outstanding_amount: values?.outstanding_amount,
      status_in_ui: values?.status_in_ui,
      view_mode: screenMode === VIEW,
      payments_minimum_date: values?.sent_date ?? values?.received_date ?? "",
      formatted_claim_amount: values?.formatted_claim_amount
        ? `$ ${values?.formatted_claim_amount?.replace("-", "")}`
        : "",
      formatted_payless_amount: values?.formatted_payless_amount
        ? `$ ${values?.formatted_payless_amount?.replace("-", "")}`
        : "",
      formatted_payment_amount: values?.formatted_payment_amount
        ? `$ ${values?.formatted_payment_amount?.replace("-", "")}`
        : "",
      formatted_retention_amount: ImportScreen
        ? values?.retention_amount
          ? `$ ${values?.formatted_retention_amount?.replace("-", "")}`
          : ""
        : values?.formatted_retention_amount
        ? `$ ${values?.formatted_retention_amount?.replace("-", "")}`
        : "",
      formatted_total_amount: values?.formatted_total_amount
        ? `$ ${values?.formatted_total_amount?.replace("-", "")}`
        : "",
      cashRetention: values?.cash_retention ? "Retention" : "No Retention",
      retentionAmount: values?.claim_retention_amount
        ? formatDollars(values.claim_retention_amount.toString())
        : null,
      retentionPercentage: values?.retention_percentage || null,
      withHoldReson: values?.withhold_payment_reason || "",
    });
    if (!isViewMode) {
      if (ImportScreen != "import") {
        setPaymentType(values);
      }
      setDisablePayLessAmount(!!values?.payless_amount);
    }
  }

  function getCashRetentionType(responseData: any) {
    if (
      tabType === routedFrom?.RETENTION_CLAIM_ONE ||
      tabType === routedFrom?.RETENTION_CLAIM_TWO
    ) {
      return tabTypes.NO_RETENTION;
    } else if (ImportScreen === "import" && !responseData?.cash_retention) {
      return tabTypes.NO_RETENTION;
    } else if ((isViewMode || ImportScreen) && responseData?.cash_retention) {
      return tabTypes.RETENTION;
    } else {
      return responseData?.cash_retention &&
        responseData?.cash_retention !== tabTypes.NO_RETENTION
        ? tabTypes.RETENTION
        : tabTypes.NO_RETENTION;
    }
  }

  async function setPaymentType(paymentData: any) {
    if (paymentType === tabTypes.THIRD_PARTY) {
      await formik.setFieldValue("payment_to", paymentType);
      setDisablePaymentTo(true);
    } else {
      await formik.setFieldValue("payment_type", paymentType);
    }

    if (paymentType === tabTypes.FULL) {
      formik.setFieldValue(
        "payment_amount",
        `$ ${
          paymentData?.claim_amount
            ? convertPositiveDecimalTwoDigit(paymentData?.claim_amount)
            : ""
        }`
      );
      formik.setFieldValue(
        "formatted_payment_amount",
        `$ ${paymentData?.formatted_claim_amount?.replace("-", "")}`
      );
    } else if (paymentType === tabTypes.PAY_LESS_FULL) {
      formik.setFieldValue("payment_amount", "$ 0.00");
      formik.setFieldValue("formatted_payment_amount", "$ 0.00");
    }
  }

  async function optionalFileUpload(paymentId: number) {
    const filePostDetails: any = {
      uploaded_by: String(decodeTokenData?.userId),
      attachment_type: "Optional_attachments",
      payment_id: paymentId,
    };

    const modifiedPostDetails = optionalFiles.map(() => filePostDetails);
    const fileUploadResponse = await multipleFileUploadApi(
      optionalFiles,
      modifiedPostDetails,
      accessTokenId
    );

    return fileUploadResponse;
  }

  async function compulsoryFileUpload(paymentId: number) {
    const filePostDetails: any = {
      uploaded_by: String(decodeTokenData?.userId),
      attachment_type: "Compulsory_attachments",
      payment_id: paymentId,
    };

    const modifiedPostDetails = compulsoryFiles.map(() => filePostDetails);
    const fileUploadResponse = await multipleFileUploadApi(
      compulsoryFiles,
      modifiedPostDetails,
      accessTokenId
    );

    return fileUploadResponse;
  }

  function additionalPostDataModification() {
    const { values } = formik;
    if (values?.payment_to === tabTypes.PAY_LESS_ZERO) {
      return {
        // payment_from_account: +values?.payment_from_account,
        payment_date: values?.payment_date,
      };
    } else if (values?.payment_to === tabTypes.THIRD_PARTY) {
      return {
        third_party_payment_reason: values?.third_party_payment_reason,
      };
    } else if (
      values?.payment_type === tabTypes.PAY_LESS_PART ||
      values?.payment_type === tabTypes.PAY_LESS_FULL
    ) {
      return { payless_amount: +replaceDollarSymbol(values?.payless_amount) };
    }
  }

  function navigateTo(actionType?: string) {
    if (syncId) {
      router.back();
      setLoader(false);
      return;
    }
    if (ImportScreen === "import") {
      handleRoute(AppRoutes?.USER_PAY_APPS);
    } else if (previousPage) {
      handleRoute(`${previousPage}?claim-type=${formik?.values.claim_type}`);
      deleteCookie("from_page");
    } else {
      handleRoute("", actionType);
    }
  }

  async function handleSubmit() {
    if (disableSaveButton) return; // Block double clicks
    setDisableSaveButton(true);
    try {
      if (
        userMode !== "Normal" &&
        paymentTypesRequiringPopup.includes(OnboardpaymentType) &&
        !isViewMode &&
        !formik.values.input_date
      ) {
        setDisplayPopup(true); // Show the popup
        formik.setFieldValue("isOnboardingModelOpen", true);
        setDisableSaveButton(false);
        return;
      }
      const { values } = formik;

      if (isEditable && isViewMode) {
        await updateChangedCheckbox();
        setDisableSaveButton(false);
        return;
      }

      if (isCompulsoryAttachmentRequired && compulsoryFiles?.length === 0) {
        toast.error(`Please upload the ${getAttachmentFileName()}`);
        setDisableSaveButton(false);
        return;
      }

      // Safely parse numbers from payment and outstanding amounts
      const parseAmount = (amount: string | number | undefined): number => {
        if (amount === undefined || amount === null) return 0;
        if (typeof amount === "number") return amount;
        // Remove anything that's not a digit or decimal point
        return Number(amount.replace(/[^0-9.]/g, "")) || 0;
      };

      const paymentAmount = parseAmount(values?.payment_amount);
      const outstandingAmount = parseAmount(values?.outstanding_amount);
      // 1️⃣ Check for mandatory memo
      const isWithholdingRequired =
        values?.claim_type === tabTypes.BILLABLES &&
        (values?.payment_type !== tabTypes.FULL ||
          values?.payment_to === tabTypes.THIRD_PARTY) &&
        noticesAutomated;

      if (
        isWithholdingRequired &&
        paymentAmount !== outstandingAmount &&
        !values?.withHoldReson?.trim()
      ) {
        // show error toast
        showErrorToast("Reason for withholding payment is required");
        return; // prevent submission
      }

      const triggerNotices =
        (values?.is_paid_confirmed ||
          values?.payment_to === "3rd Party" ||
          values?.payment_type === "Pay - Zero") &&
        values?.claim_type !== "Receivable";

      //condition to show upgrade subscription modal
      if (
        !delegateAuthorityAllowed &&
        !formik?.values?.skipSubscription &&
        triggerNotices
      ) {
        setDisplaySubscriptionModal(true);
        setDisableSaveButton(false);
        return;
      }

      setLoader(true);
      setLoaderInfo("Submitting payment...");
      const postData = handleDynamicPostData();

      const paymentResponse = await addPayments(postData);

      if (paymentResponse?.status) {
        if (compulsoryFiles?.length > 0) {
          await compulsoryFileUpload(paymentResponse?.data?.payment_id);
        }
        if (optionalFiles?.length > 0) {
          await optionalFileUpload(paymentResponse?.data?.payment_id);
        }
        if (triggerNotices) {
          const { notices = {} } = paymentResponse?.data || {};
          const { notice_previews = [], qbcc_notice_previews = [] } = notices;

          // Set standard notices
          setNoticeFiles(notice_previews.map((n: any) => n.file_details));
          setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

          // Set QBCC notices
          setQbccNoticeFiles(
            qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
          );
          setQbccNoticeUuids(
            qbcc_notice_previews.map((n: any) => n.notice_uuid)
          );

          // Show popup if any notices exist
          if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
            setShowNoticePopup(true);
            return; // stop further routing, popup handles it
          }

          if (
            subscriptionPlanName === SubscriptionPlanTypes.BASIC &&
            triggerNotices
          ) {
            resetRetainedPaymentsData();
            setLoader(false);
            setLoaderInfo("");
            router.push(AppRoutes.USER_NOTICES);
            return;
          }
        }

        resetRetainedPaymentsData();
        setLoaderInfo("");
        navigateTo();
      }

      setLoader(false);
    } catch {
      setLoader(false);
      setLoaderInfo("");
    } finally {
      setLoader(false);
      setLoaderInfo("");
      setDisableSaveButton(false); // Always re-enable at the end
    }
  }

  function handleDynamicPostData() {
    const { values } = formik;

    const commonPayload = {
      payment_claim_id: values?.payment_claim_id,
      project_id: values?.project_id,
      contract_id: values?.contract_id,
      input_date: getDatePickerFormat(formik.values?.input_date) || null,
      company_id: getCookie("companyId") ? Number(getCookie("companyId")) : "",
      memo: values?.memo ?? "",

      client_supplier_id: values?.client_supplier_id,

      ...(values?.cash_retention === tabTypes.RETENTION &&
      values?.payment_type !== tabTypes.PAY_LESS_ZERO &&
      values?.payment_to !== tabTypes.THIRD_PARTY
        ? {
            retention_account: values?.retention_account?.value,
            retention_amount: +replaceDollarSymbol(values?.retention_amount),
            retention_release_date: values?.retention_release_date || null,
            is_retention_confirmed:
              values?.claim_type === tabTypes?.BILLABLES
                ? values?.is_retention_confirmed
                : undefined,
          }
        : {}),
      payment_type:
        values?.payment_to === tabTypes.THIRD_PARTY
          ? values?.payment_to
          : values?.payment_type,
      total_amount:
        values?.payment_to === tabTypes.THIRD_PARTY ||
        values?.payment_type === tabTypes.PAY_LESS_ZERO
          ? +values?.claim_amount
          : +values?.total_amount,
      ...(values?.retention_id
        ? {
            retention_id: values.retention_id,
          }
        : {}),
      ...(values?.claim_type === tabTypes.BILLABLES
        ? { payment_from_account: +values?.payment_from_account }
        : {}),
      ...(values?.claim_type === tabTypes.BILLABLES &&
      (values?.payment_type === tabTypes.PAY_LESS_ZERO ||
        values?.payment_to === tabTypes.THIRD_PARTY)
        ? {}
        : { payment_to_account: +values?.payment_to_account }),
      withhold_payment_reason: values?.withHoldReson || "",
    };

    if (
      values?.payment_type === tabTypes.PAY_LESS_ZERO ||
      values?.payment_to === tabTypes.THIRD_PARTY
    ) {
      return {
        payload: {
          ...commonPayload,
          ...additionalPostDataModification(),
        },
      };
    } else {
      return {
        payload: {
          ...commonPayload,
          [values?.claim_type === tabTypes.BILLABLES
            ? "is_paid_confirmed"
            : "is_received_confirmed"]: values?.is_paid_confirmed,

          payment_type:
            values?.payment_to === tabTypes.THIRD_PARTY
              ? values?.payment_to
              : values?.payment_type,

          cash_retention: Boolean(
            values?.cash_retention === tabTypes.RETENTION
          ),

          payment_amount: +replaceDollarSymbol(values?.payment_amount) || null,
          payment_date: values?.payment_date || null,

          ...additionalPostDataModification(),
        },
      };
    }
  }

  async function getAttachments(
    attachmentType: string,
    isCompulsoryAttachment: boolean
  ) {
    const postData = {
      data: {
        payment_claim_id: +claimId,
        payment_id: +paymentId,
      },
      fileAttachmentOrDocumentType: attachmentType,
    };

    const response = await ReadFileAttachmentsOrDocuments(postData);
    if (response?.length > 0 && isCompulsoryAttachment) {
      setCompulsoryFiles(response);
    } else {
      setOptionalFiles(response);
    }
  }

  function findAttachmentType() {
    getAttachments("Other optional payment attachment", false);
    const { values } = formik;

    if (
      (values?.claim_type === tabTypes.BILLABLES &&
        values?.payment_type !== tabTypes.FULL) ||
      values?.payment_to === tabTypes.THIRD_PARTY
    ) {
      getAttachments(getPaymentType(), true);
    }
  }

  function getPaymentType() {
    const { values } = formik;

    switch (values?.payment_type) {
      case `${tabTypes.PART}`:
        return "Part payment advice attachment";
      case `${tabTypes.PAY_LESS_FULL}`:
        return "Payless full payment advice attachment";
      case `${tabTypes.PAY_LESS_PART}`:
        return "Payless part payment advice attachment";
      case `${tabTypes.PAY_LESS_ZERO}`:
        return "Pay zero payment advice attachment";
      case `${tabTypes.THIRD_PARTY}`:
        return "3rd party payment attachment";
      default:
        return "";
    }
  }

  async function updateChangedCheckbox() {
    if (disableSaveButton) return; // Prevent multiple trigger
    setDisableSaveButton(true);
    setLoader(true);

    let syncData: any = null;
    // ✅ MOVE helper function here (outside block → allowed in ES5)
    async function createClaim() {
      await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: syncData?.api_payload?.invoice_id || null,
        tenantId: syncData?.api_payload?.tenant_id || null,
        syncId: syncData?.id,
        syncRunType: syncData?.api_payload?.sync_run_type || null,
      });
    }
    try {
      const {
        claim_type,
        is_retention_confirmed,
        is_paid_confirmed,
        payment_type,
        payment_to,
      } = formik.values;
      const postData: any = {
        payload: {
          is_paid_confirmed:
            claim_type === tabTypes.BILLABLES ? is_paid_confirmed : null,
          is_received_confirmed:
            claim_type === tabTypes.RECEIVABLES ? is_paid_confirmed : null,
          is_retention_confirmed: is_retention_confirmed,
          payment_id: patchData?.payment_id,
        },
      };
      // 🌟 If `delete=true` → include delete flag in payload
      if (deleteParam === "true") {
        postData.payload.delete_paytrade_only = true;
      }

      const response = await updatePayments(postData);
      // Fetch syncLog data early so we can use it later
      if (syncId) {
        syncData = await viewXeroSyncLog({
          viewXeroSyncLogId: syncId,
        });
      }
      if (response) {
        if (
          is_paid_confirmed ||
          payment_to === "3rd Party" ||
          payment_type === "Pay - Zero"
        ) {
          const { notice_previews = [], qbcc_notice_previews = [] } =
            response?.notices || {};

          // Set standard notices
          setNoticeFiles(notice_previews.map((n: any) => n.file_details));
          setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

          // Set QBCC notices
          setQbccNoticeFiles(
            qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
          );
          setQbccNoticeUuids(
            qbcc_notice_previews.map((n: any) => n.notice_uuid)
          );

          // Show popup if any notices exist
          if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
            setShowNoticePopup(true);
            return; // stop further routing, popup handles it
          }

          if (
            (subscriptionPlanName === SubscriptionPlanTypes.BASIC &&
              is_paid_confirmed) ||
            payment_to === "3rd Party" ||
            payment_type === "Pay - Zero"
          ) {
            resetRetainedPaymentsData();
            setLoader(false);
            router.push(AppRoutes.USER_NOTICES);
            return;
          }
        }

        // --- CASE A: UNMAP ---
        if (unmapidParam) {
          await unMappingPayments({ paymentId: unmapidParam });
          setLoaderInfo("");
          navigateTo();
          return;
        }

        // --- CASE B: NORMAL FLOW ---
        if (syncId) {
          await createClaim();
        }
        setLoaderInfo("");
        navigateTo();
        return;
      }
      setLoader(false);
    } catch {
      setLoader(false);
    } finally {
      setLoader(false);
      setDisableSaveButton(false); // Always re-enable
    }
  }

  function getAttachmentFileName() {
    const { values } = formik;
    switch (values?.payment_type) {
      case `${tabTypes.PART}`:
        return "Part payment supporting statement";
      case `${tabTypes.PAY_LESS_FULL}`:
        return "Pay less full payment supporting statement";
      case `${tabTypes.PAY_LESS_PART}`:
        return "Pay less part payment supporting statement";
      case `${tabTypes.PAY_LESS_ZERO}`:
        return "Pay zero payment supporting statement";
      default:
        return "supporting statement";
    }
  }

  const resetRetainedPaymentsData = () => {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setPayments({}));
    }
    if (!_.isEmpty(retainedAttachmentFromSubscription)) {
      dispatch(setPaymentAttachments({}));
    }
  };

  //render Template
  return (
    <PaymentsContext.Provider
      value={{
        formik,
        claimId,
        router,
        CashRetentionType,
        isViewMode,
        isImportMode,
        selectedClaim,
        optionalFiles,
        patchData,
        previousPage,
        isEditable,
        setIsEditable,
        compulsoryFiles,
        setOptionalFiles,
        setCompulsoryFiles,
        setSelectedClaim,
        disablePaymentTo,
        retentionBankAccounts,
        disableSaveButton,
        setDisableSaveButton,
        navigateTo,
        setIsCompulsoryAttachmentRequired,
        setLoader,
        screenMode,
        overViewId,
        overViewTab,
        tabType,
        overViewPage,
        overviewType,
        overviewProjectId,
        disablePayLessAmount,
        paymentId,
        beneficiaryType,
        setDisablePayLessAmount,
        getAttachmentFileName,
        loader,
        isNextPayment,
        initialPatchedValues,
        displayPopup,
        setDisplayPopup,
        subscriptionPlanName,
        setSubscriptionPlanName,
        displaySubscriptionModal,
        setDisplaySubscriptionModal,
        retainedDataFromSubscription,
        retainedAttachmentFromSubscription,
        resetRetainedPaymentsData,
        handleRoute,
        IsActivity,
        retentionDisable,
        setRetentionAccountDisable,
        showNoticePopup,
        setShowNoticePopup,
        noticeFiles,
        setNoticeFiles,
        noticeMailUuids,
        setNoticeMailUuids,
        timeLeft,
        setTimeLeft,
        isNoticePopupPaused,
        pauseSecondsLeft,
        pauseNoticePopup,
        resetNoticePauseState,
        setLoaderInfo,
        qbccNoticeFiles,
        setQbccNoticeFiles,
        qbccNoticeUuids,
        setQbccNoticeUuids,
        delegateAuthorityAllowed,
        setDelegateAuthorityAllowed,
        noticesAutomated,
        setNoticesAutomated,
        isFree,
        setIsFree,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  );
};

// Create a custom hook for using the global context
const usePaymentsContext: any = () => {
  const context = useContext(PaymentsContext);
  if (!context) {
    throw new Error("Error in payment Context");
  }
  return context;
};

export { usePaymentsContext };
