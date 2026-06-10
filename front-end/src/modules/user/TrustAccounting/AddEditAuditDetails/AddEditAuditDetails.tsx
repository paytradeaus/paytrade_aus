"use client";

import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { useTokenDetails } from "@/hooks";
import { useAppSelector } from "@/redux/store";
import {
  buttonType,
  InputType,
  quickAddRoutes,
  SUBSCRIPTION_UPGRADE,
  uploadFile,
} from "@/shared/constant/general";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import _, { isEqual } from "lodash";
import CustomButton from "@/components/CustomButton/CustomButton";
import { ApiResponse, FileErrors } from "@/shared/constant/messages";
import { singleUploadApi } from "@/network/apolloClient";
import BaseModal from "@/components/BaseModal";
import { deleteAttachment } from "@/app/api/commonApi";
import { getCookie } from "cookies-next";
import { useDispatch } from "react-redux";
import {
  FetchAllBankAccounts,
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../../AddUpdateBankAccount/AddUpdateBankAccount.function";
import {
  checkAuditReportExistence,
  checkNilReturnForAudit,
  editAuditReportDetails,
  GenerateAuditReport,
  GetBankAssociatedProject,
  getStartAuditDate,
  insertAuditReportDetails,
  triggerAuditNotices,
  viewAuditReportById,
} from "./AddEditAuditDetails.functions";
import { SubscriptionPlanTypes } from "../../AddUpdateClaims/AddUpdateClaims.constant";
import { endOfMonth, format, isValid, lastDayOfMonth } from "date-fns";
import { base64ToFile, fileToBase64, getDatePickerFormat } from "@/utils";
import { setAuditDetails } from "@/redux/slices/subscribeRouteBackDetails";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { returnOptions } from "../trustAccounting.constant";
import {
  showErrorToast,
  showInfoToast,
  showWarningToast,
} from "@/components/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { downloadAuditZipFromPath } from "@/utils/export";
import { setReduxAuditData } from "@/redux/slices/auditDetails";
import { getSubscriptionDetailsByCompanyId } from "../../Subscriptions/subscriptions.function";
const AUTO_CLOSE_TIME = 30;

export default function AddEditAuditDetails(props: any) {
  const { isAdd = false, isView = false, isEdit = false } = props;

  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const queryParams: any = useSearchParams();
  const routedFrom = queryParams.get("routedFrom");
  const AdminCompanyId = getCookie("compId");
  const dispatch = useDispatch();
  const params = useParams();
  const fileInputRef = useRef<any>(null); // Reference to the file input
  const router = useRouter();
  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.auditDetails
  );
  const retainedGeneratedData: any = useAppSelector(
    (state: any) => state?.auditReport?.auditData
  );
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [openPlanModal, setOpenPlanModal] = useState<boolean>(false);

  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [auditData, setAuditData] = useState<any>({});
  const [popUpMessagesData, setPopUpMessagesData] = useState<any>({});
  const [generatedFile, setGeneratedFile] = useState<any>({});
  const [generatedEditAuditResponse, setGeneratedEditAuditResponse] =
    useState<any>({});
  const [showDeleteGeneratedModal, setShowDeleteGeneratedModal] =
    useState(false);
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [isFreePlanEligible, setIsFreePlanEligible] = useState(false);

  const [isOriginalFileDeleted, setIsOriginalFileDeleted] = useState(false);
  const [accountList, setAccountList] = useState([]);
  const [accountNumber, setAccountNumber] = useState("");
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [hasWarning, setHasWarning] = useState(false);
  const { loader, setLoader, setLoaderInfo }: any = useLoaderContext();
  const [selectedFileError, setSelectedFileError] = useState<any>("");
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan
  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>({
    AccountName: "",
    MonthEnd: "",
    AuditReport: "",
    NilReturn: "",
  });
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);

  const hideSecondButtonMessages = [
    "Audit has been made already for the selected year.",
    "A generic audit without project preference exists for this account in the selected year.",
    "An audit already exists for the selected project and account in the given year.",
    "Audit reports already exist for some projects of this account. You must select a project to create a new audit.",
  ];

  const [auditStartDate, setAuditStartDate] = useState<Date | null | any>(null);
  const [auditEndDate, setAuditEndDate] = useState<Date | null | any>(null);
  // 🔹 New state for Audit Export
  const [auditExportAllowed, setAuditExportAllowed] = useState<boolean | null>(
    null
  );

  const [selectedProject, setSelectedProject] = useState<any>([]);
  const [projectBankAccounts, setProjectBankAccounts] = useState<any>([]);

  const [removedGeneratedAttachmentIds, setRemovedGeneratedAttachmentIds] =
    useState<string[]>([]);

  const [removedUploadAttachmentIds, setRemovedUploadAttachmentIds] = useState<
    string[]
  >([]);
  const [minStartAuditDate, setMinStartAuditDate] = useState<
    string | null | any
  >(null);

  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const validationSchema = Yup.object().shape({
    AccountName: Yup.string().required("Account is required"),
    MonthEnd: Yup.string().required("Audit Date is required"),

    AuditReport: Yup.mixed().nullable().notRequired(),

    NilReturn: Yup.string().required("Nil Return is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      AccountName: "",
      MonthEnd: "",
      AuditReport: "",
      NilReturn: "",
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();

        // 🔹 FREE PLAN OVERRIDE
        const freePlan = subscriptionResponse?.is_free_plan_eligible === true;
        setIsFreePlanEligible(freePlan);

        // 🔹 Check Audit Export
        const auditExportItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Audit export"
          ) || null;

        let isAuditExportAllowed =
          auditExportItem &&
          String(auditExportItem.limit_value).toLowerCase() === "true";

        // setAuditExportAllowed(!!isAuditExportAllowed);
        // 🔥 If free plan → ALWAYS allow audit export
        if (freePlan) {
          isAuditExportAllowed = true;
        }

        // 🔹 Set final boolean state
        setAuditExportAllowed(!!isAuditExportAllowed);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setAuditExportAllowed(false); // fail-safe
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    };

    fetchSubscription();
  }, []);

  useEffect(() => {
    if (retrieveAfterAddingQuickRecord == quickAddRoutes.RETRIEVE_AUDIT) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    if (retrieveAfterAddingQuickRecord == quickAddRoutes.RETRIEVE_AUDIT) {
      setGeneratedFile(retainedGeneratedData);
    } else {
      dispatch(setReduxAuditData({}));
    }
  }, []);

  // Reset timer when popup opens
  useEffect(() => {
    if (
      showNoticePopup &&
      (noticeFiles?.length > 0 || qbccNoticeFiles?.length > 0)
    ) {
      setTimeLeft(AUTO_CLOSE_TIME);
    }
  }, [showNoticePopup]);

  // Countdown effect
  useEffect(() => {
    if (!showNoticePopup) return;

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
  }, [timeLeft, showNoticePopup]);

  useEffect(() => {
    if (formik?.values?.AccountName) {
      getProjectBankAccounts(formik?.values?.AccountName);
    }
  }, [formik?.values?.AccountName]);

  useEffect(() => {
    const isViewOrEdit = isView || isEdit;

    if (
      isViewOrEdit &&
      auditData?.aud_gen_from_date &&
      auditData?.aud_gen_to_date
    ) {
      const from = new Date(auditData.aud_gen_from_date);
      from.setHours(0, 0, 0, 0);

      const to = new Date(auditData.aud_gen_to_date);
      to.setHours(23, 59, 59, 999);

      setAuditStartDate(from);
      setAuditEndDate(to);
    } else {
      const isMinStartValid =
        minStartAuditDate && isValid(new Date(minStartAuditDate));
      const isMonthEndValid =
        formik.values.MonthEnd && isValid(new Date(formik.values.MonthEnd));

      if (isMinStartValid && isMonthEndValid) {
        const from = new Date(minStartAuditDate);
        from.setHours(0, 0, 0, 0);

        const to = endOfMonth(new Date(formik.values.MonthEnd));
        to.setHours(23, 59, 59, 999);

        setAuditStartDate(from);
        setAuditEndDate(to);
      }
    }
  }, [
    minStartAuditDate,
    formik.values.MonthEnd,
    auditData?.aud_gen_from_date,
    auditData?.aud_gen_to_date,
    isView,
    isEdit,
  ]);

  useEffect(() => {
    if (auditData?.project_id && projectBankAccounts?.length) {
      const matched = projectBankAccounts.find(
        (p: any) => p.project_id === auditData.project_id
      );
      if (matched) {
        // Add label and value properties
        const formattedProject = {
          ...matched,
          label: matched.project_name,
          value: matched.project_id,
        };
        setSelectedProject(formattedProject);
      }
    }
  }, [auditData?.project_id, projectBankAccounts]);

  useEffect(() => {
    async function fetchStartDate() {
      if (isView || isEdit) {
        // Use auditData if in view or edit mode
        if (auditData?.min_aud_from_date) {
          setMinStartAuditDate(
            format(new Date(auditData.min_aud_from_date), "yyyy-MM-dd")
          );
        } else {
          setMinStartAuditDate(null);
        }
      } else if (formik.values.AccountName) {
        // Call API only in create mode
        const response = await getStartAuditDate(
          Number(formik.values.AccountName)
        );
        if (response?.start_audit_date) {
          setMinStartAuditDate(
            format(new Date(response.start_audit_date), "yyyy-MM-dd")
          );
        } else {
          setMinStartAuditDate(null);
        }
      } else {
        setMinStartAuditDate(null);
      }
    }

    fetchStartDate();
  }, [formik.values.AccountName, auditData?.min_aud_from_date, isView, isEdit]);

  useEffect(() => {
    (async () => {
      const response = await FetchAllBankAccounts({
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        page: 1,
        items_per_page: null,
        is_alphabetical_order: true,
        status: "Open",
        account_type: "Project Trust Account, Retention Trust Account",
      });
      if (response?.extendedBankAccounts?.length > 0) {
        const customOption = response.extendedBankAccounts.map((data: any) => ({
          label: data?.account_name,
          value: data?.bank_account_id.toString(),
          type: data?.account_type,
          bankAccount: data?.account_number,
        }));
        setAccountList(customOption);
        if (BankAccId) {
          const matchingAccount = customOption.find(
            (option: { value: any }) => option.value === BankAccId
          );
          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            formik.setFieldValue("AccountName", matchingAccount.value);
          }
        }
      }
    })();
  }, [AdminCompanyId, selectedCompanyId]);

  useEffect(() => {
    (async () => {
      try {
        if (params?.id) {
          setLoader(true);
          const payload = {
            id: params.id || "",
          };
          const resAuditData: any = await viewAuditReportById(payload); // Replace this with the actual service function to view the audit report by ID
          if (resAuditData?.id) {
            setAuditData(resAuditData);
          } else {
            handleRouteBack();
            showWarningToast("No data in this id");
          }
          setLoader(false);
        }
      } catch {}
    })();
  }, [params?.id]);

  useEffect(() => {
    if ((!isAdd && auditData?.id) || routePathStoredData?.quickAddFromAudit) {
      const formData = auditData?.bank_account_id
        ? auditData
        : routePathStoredData;

      let auditReportFile = null;
      let zipFileObject = null;

      if (formData?.file_details?.length) {
        formData.file_details.forEach((fileObj: any) => {
          if (fileObj.file_type === "application/zip") {
            // ✅ Structure zip file correctly
            zipFileObject = {
              file: {
                attachment_id: fileObj.id,
                file_name: fileObj.file_name,
                file_path: fileObj.file_path,
                file_type: fileObj.file_type,
              },
            };
          } else {
            auditReportFile = {
              file: fileObj.file || null,
              name: fileObj.file_name,
              path: fileObj.file_path,
              type: fileObj.file_type,
            };
          }
        });
      }

      const fetchedDataSet = {
        AccountName: formData?.AccountName
          ? formData?.AccountName
          : formData?.bank_account_id?.toString(),
        MonthEnd: formData?.MonthEnd
          ? formData?.MonthEnd
          : getDatePickerFormat(formData?.audit_date, true),
        AuditReport: formData?.AuditReport
          ? [
              base64ToFile(
                formData?.AuditReport?.file,
                formData?.AuditReport?.name,
                formData?.AuditReport?.type
              ),
            ]
          : auditReportFile
          ? [auditReportFile]
          : null,

        NilReturn: formData?.NilReturn
          ? formData?.NilReturn
          : formData?.nil_return,
      };

      formik.setValues(fetchedDataSet);
      setInitialPatchedValues(fetchedDataSet);
      // ✅ If zip file exists, set it to generatedFile state
      if (zipFileObject) {
        setGeneratedFile(zipFileObject);
      }
      if (routePathStoredData?.quickAddFromAudit) {
        setSelectedAccount(formData?.selectedAcc);
      } else {
        const selectedBank = accountList.find(
          (each: any) => each.value === auditData?.bank_account_id?.toString()
        );
        setSelectedAccount(selectedBank);
      }
      // ✅ Set selectedProject if exists
      const selectedProj = projectBankAccounts?.find(
        (project: any) =>
          project.project_id === formData?.selectedProject?.project_id
      );
      if (selectedProj) {
        const formattedProject = {
          ...selectedProj,
          label: selectedProj.project_name,
          value: selectedProj.project_id,
        };
        setSelectedProject(formattedProject);
      }
    }
  }, [auditData, routePathStoredData, projectBankAccounts]);

  const handleNoticesAndQbcc = async (
    auditId: string,
    {
      setLoaderInfo,
      setNoticeFiles,
      setNoticeMailUuids,
      setQbccNoticeFiles,
      setQbccNoticeUuids,
      setShowNoticePopup,
      handleRouteBack,
      resetRetainedAuditData,
    }: {
      setLoaderInfo: (val: string) => void;
      setNoticeFiles: (val: any[]) => void;
      setNoticeMailUuids: (val: string[]) => void;
      setQbccNoticeFiles: (val: any[]) => void;
      setQbccNoticeUuids: (val: string[]) => void;
      setShowNoticePopup: (val: boolean) => void;
      handleRouteBack: () => void;
      resetRetainedAuditData: () => void;
    }
  ) => {
    setLoaderInfo("Generating notice...");

    const noticeResponse = await triggerAuditNotices({
      audit_id: auditId,
    });

    setLoaderInfo("");

    if (noticeResponse) {
      const { notice_previews = [], qbcc_notice_previews = [] } =
        noticeResponse;

      // Standard notices
      setNoticeFiles(notice_previews.map((n: any) => n.file_details));
      setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));

      // QBCC notices
      setQbccNoticeFiles(
        qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
      );
      setQbccNoticeUuids(qbcc_notice_previews.map((n: any) => n.notice_uuid));

      // If any preview exists → show popup, stop routing
      if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
        setShowNoticePopup(true);
        return;
      }
    }

    // No notices → continue routing
    handleRouteBack();
    resetRetainedAuditData();
  };

  async function handleSubmit(skipSubscriptionUpgrade?: boolean) {
    const { values }: any = formik || {};
    if (
      routePathStoredData?.quickAddFromAudit &&
      routePathStoredData?.MonthEnd
    ) {
      let res: any = await onStatementChange(routePathStoredData?.MonthEnd);
      if (res) {
        return;
      }
    }

    setLoader(true);
    if (hasWarning) {
      // If there is a warning, show the modal and stop form submission
      setOpenWarningModal(true);
      setLoader(false);
      return; // Prevent form submission if there is a warning
    }

    //condition to show upgrade subscription modal
    if (
      !isFreePlanEligible &&
      subscriptionPlanName === SubscriptionPlanTypes.BASIC &&
      !skipSubscriptionUpgrade &&
      values?.NilReturn?.value === "Yes"
    ) {
      setDisplaySubscriptionModal(true);
      setLoader(false);
      return;
    }

    const nilCheckResult = await checkNilReturnIfNeeded();

    if (!nilCheckResult.valid) {
      setLoader(false);
      setOpenConfirmModal(true); // Open the confirmation modal
      setPopUpMessagesData({ message: nilCheckResult.message }); // Set the message to show in the modal
      return; // Prevent form submission
    }

    const nilPayValue: any = values.NilReturn;

    const selectedDate = values.MonthEnd ? new Date(values.MonthEnd) : null;
    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    const formattedMonthEndDate = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    const payload: any = {
      company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      bank_account_id: Number(selectedAccount?.value),
      audit_date: formattedMonthEndDate,
      nil_return: nilPayValue || "No", // Default to "No" if value is undefined
      project_id: selectedProject?.project_id || null,
    };

    try {
      if (isEdit && auditData?.id) {
        // Call the update service when isEdit is true
        const isNewFileAdded = !!values?.AuditReport?.[0]?.size;
        const isAttachmentRemoved =
          removedGeneratedAttachmentIds.length > 0 ||
          removedUploadAttachmentIds.length > 0;
        const isNilReturnChanged =
            auditData?.NilReturn === "NA" && values?.nil_return !== "NA",
          isEditTimeGenerated =
            generatedEditAuditResponse &&
            Object.keys(generatedEditAuditResponse).length > 0;
        // Proceed only if there's any actual change
        if (
          isNewFileAdded ||
          isAttachmentRemoved ||
          isNilReturnChanged ||
          isEditTimeGenerated
        ) {
          setLoaderInfo("Updating audit report...");
          payload.id = auditData?.id;
          await updateAuditDetails(payload);
        } else {
          handleRouteBack();
          showInfoToast("No changes to save");
        }
      }
      if (isAdd) {
        setLoaderInfo("Saving audit report...");
        // ✅ Save & Download: build the Audit Pack as part of the save path
        // (right before insert) so a pack is never produced without a saved
        // row. There is no standalone pre-save generate step in Add mode.
        const packForDelivery: any = await buildAuditPack();
        if (!packForDelivery) {
          // Gating modal / error already surfaced by buildAuditPack
          setLoader(false);
          return;
        }
        setGeneratedFile(packForDelivery);
        payload.aud_gen_from_date = getDatePickerFormat(auditStartDate);
        payload.aud_gen_to_date = getDatePickerFormat(auditEndDate);
        payload.min_aud_from_date = getDatePickerFormat(minStartAuditDate);
        // ✅ Include attachment_id only if the pack is a non-empty object
        if (packForDelivery && Object.keys(packForDelivery)?.length > 0) {
          payload.attachment_id = packForDelivery?.file?.attachment_id || "";
        }
        // Call the insert service when isEdit is false
        let result = await insertAuditReportDetails(payload);
        if (result) {
          // ✅ Save & Download: deliver the pack right after the row is saved,
          // before any notices / route-back early returns.
          if (packForDelivery?.file?.file_path) {
            const downloaded = await downloadAuditZipFromPath(
              packForDelivery?.file?.file_path,
              packForDelivery?.file?.file_name,
              selectedAccount?.bankAccount
            );
            if (!downloaded) {
              showInfoToast(
                "Audit saved. The audit pack couldn't be downloaded automatically — you can download it anytime from the audit list."
              );
            }
          }
          if (values?.AuditReport?.length > 0) {
            const uploadPayload = {
              audit_id: result?.audit_id,
              uploaded_by: decodeTokenData?.emailId || "unknown", // Default to "unknown" if emailId is not available
              attachment_type: "Audit",
            };

            // Ensure singleUploadApi is correctly defined and used
            const fileResponse = await singleUploadApi(
              values?.AuditReport[0],
              uploadPayload,
              accessTokenId
            );
            // trigger
            if (result?.audit_id && result?.nil_return === "Yes") {
              await handleNoticesAndQbcc(result.audit_id, {
                setLoaderInfo,
                setNoticeFiles,
                setNoticeMailUuids,
                setQbccNoticeFiles,
                setQbccNoticeUuids,
                setShowNoticePopup,
                handleRouteBack,
                resetRetainedAuditData,
              });
              return;
            }
            if (fileResponse) {
              handleRouteBack();
              resetRetainedAuditData();
            }
          } else {
            // trigger
            if (result?.audit_id && result?.nil_return === "Yes") {
              await handleNoticesAndQbcc(result.audit_id, {
                setLoaderInfo,
                setNoticeFiles,
                setNoticeMailUuids,
                setQbccNoticeFiles,
                setQbccNoticeUuids,
                setShowNoticePopup,
                handleRouteBack,
                resetRetainedAuditData,
              });
              return;
            }
            handleRouteBack();
            resetRetainedAuditData();
          }
          // Handle successful audit report insertion
        }
      }
    } catch {
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  const proceedWithFormSubmission = async (values: any) => {
    const nilPayValue: any = values.NilReturn;
    // Prepare the payload for the service

    const selectedDate = values.MonthEnd ? new Date(values.MonthEnd) : null;
    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    const formattedMonthEndDate = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    const payload: any = {
      company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      bank_account_id: Number(selectedAccount?.value),
      audit_date: formattedMonthEndDate,
      nil_return: nilPayValue || "No",
      project_id: selectedProject?.project_id || null,
    };

    try {
      if (isEdit && auditData?.id) {
        const isNewFileAdded = !!values?.AuditReport?.[0]?.size;
        const isAttachmentRemoved =
          removedGeneratedAttachmentIds.length > 0 ||
          removedUploadAttachmentIds.length > 0;
        const isNilReturnChanged =
            auditData?.NilReturn === "NA" && values?.nil_return !== "NA",
          isEditTimeGenerated =
            generatedEditAuditResponse &&
            Object.keys(generatedEditAuditResponse).length > 0;

        // Proceed only if there's any actual change
        if (
          isNewFileAdded ||
          isAttachmentRemoved ||
          isNilReturnChanged ||
          isEditTimeGenerated
        ) {
          payload.id = auditData?.id;
          await updateAuditDetails(payload);
        } else {
          handleRouteBack();
          showInfoToast("No changes to save");
        }
      }
      if (isAdd) {
        // ✅ Save & Download: build the Audit Pack as part of the save path
        // (right before insert) so a pack is never produced without a saved
        // row. There is no standalone pre-save generate step in Add mode.
        const packForDelivery: any = await buildAuditPack();
        if (!packForDelivery) {
          // Gating modal / error already surfaced by buildAuditPack
          setLoader(false);
          return;
        }
        setGeneratedFile(packForDelivery);
        // ✅ Add generated date range to payload
        payload.aud_gen_from_date = getDatePickerFormat(auditStartDate);
        payload.aud_gen_to_date = getDatePickerFormat(auditEndDate);
        payload.min_aud_from_date = getDatePickerFormat(minStartAuditDate);
        // ✅ Include attachment_id only if the pack is a non-empty object
        if (packForDelivery && Object.keys(packForDelivery)?.length > 0) {
          payload.attachment_id = packForDelivery?.file?.attachment_id || "";
        }
        // Call the insert service when isEdit is false
        let result = await insertAuditReportDetails(payload);

        if (result) {
          // ✅ Save & Download: deliver the pack right after the row is saved,
          // before any notices / route-back early returns.
          if (packForDelivery?.file?.file_path) {
            const downloaded = await downloadAuditZipFromPath(
              packForDelivery?.file?.file_path,
              packForDelivery?.file?.file_name,
              selectedAccount?.bankAccount
            );
            if (!downloaded) {
              showInfoToast(
                "Audit saved. The audit pack couldn't be downloaded automatically — you can download it anytime from the audit list."
              );
            }
          }
          if (values?.AuditReport?.length > 0) {
            const uploadPayload = {
              audit_id: result?.audit_id,
              uploaded_by: decodeTokenData?.emailId || "unknown",
              attachment_type: "Audit",
            };

            const fileResponse = await singleUploadApi(
              values?.AuditReport[0],
              uploadPayload,
              accessTokenId
            );

            if (!fileResponse) {
              console.error("File upload failed.");
            }
          }

          // Trigger audit notices if required
          if (result?.audit_id && result?.nil_return === "Yes") {
            await handleNoticesAndQbcc(result.audit_id, {
              setLoaderInfo,
              setNoticeFiles,
              setNoticeMailUuids,
              setQbccNoticeFiles,
              setQbccNoticeUuids,
              setShowNoticePopup,
              handleRouteBack,
              resetRetainedAuditData,
            });
            return;
          }
          setLoaderInfo("");
          handleRouteBack();
          resetRetainedAuditData();
        }
      }
    } catch {
    } finally {
      setLoader(false);
    }
  };

  const updateAuditDetails = async (payloads: any) => {
    try {
      // ✅ Add audit date range to payload
      payloads.aud_gen_from_date = getDatePickerFormat(auditStartDate);
      payloads.aud_gen_to_date = getDatePickerFormat(auditEndDate);
      // Combine both removed ID arrays
      const allRemovedIds = [
        ...removedGeneratedAttachmentIds,
        ...removedUploadAttachmentIds,
      ];

      // Only add the key if at least one ID exists
      if (allRemovedIds.length > 0) {
        payloads.removed_attachment_ids = allRemovedIds;
      }

      // ✅ Add new_attachment_ids if generatedEditAuditResponse has data
      if (
        generatedEditAuditResponse &&
        Object.keys(generatedEditAuditResponse).length > 0
      ) {
        payloads.new_attachment_ids = [
          generatedEditAuditResponse?.file?.attachment_id || "",
        ];
      }

      let result;
      result = await editAuditReportDetails(payloads);
      if (result) {
        // if (isOriginalFileDeleted) {
        //   const deletePayload = {
        //     attachmentId: auditData?.attachment_id,
        //     attachmentType: "Audit",
        //     id: auditData?.id,
        //   };

        //   const deleteResponse = await deleteAttachment(deletePayload);

        //   const uploadPayload = {
        //     audit_id: result?.audit_id,
        //     uploaded_by: decodeTokenData?.emailId || "unknown",
        //     attachment_type: "Audit",
        //   };

        //   const fileResponse = await singleUploadApi(
        //     formik?.values?.AuditReport[0],
        //     uploadPayload,
        //     accessTokenId
        //   );

        //   if (!fileResponse) {
        //     console.error("File upload failed.");
        //   }
        // }

        // Trigger audit notices if required
        if (result?.audit_id && result?.nil_return === "Yes") {
          await handleNoticesAndQbcc(result.audit_id, {
            setLoaderInfo,
            setNoticeFiles,
            setNoticeMailUuids,
            setQbccNoticeFiles,
            setQbccNoticeUuids,
            setShowNoticePopup,
            handleRouteBack,
            resetRetainedAuditData,
          });
          return;
        }

        handleRouteBack();
        resetRetainedAuditData();
      }
    } catch {
    } finally {
      setLoader(false);
    }
  };

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  async function onStatementChange(value: any) {
    if (!selectedAccount?.value) return;

    const bank_account_id = Number(selectedAccount?.value);
    const selectedDate = value ? new Date(value) : null;
    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    const formattedMonthEndDate = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    formik.setFieldValue("MonthEnd", value);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!formattedMonthEndDate) return;

    checkNilReturnIfNeeded({ auditDate: value });

    try {
      const auditReportExistenceResponse = await checkAuditReportExistence({
        bank_account_id,
        month_end_date: formattedMonthEndDate,
        timezone,
        project_id: selectedProject?.project_id || null,
      });

      if (auditReportExistenceResponse?.warning) {
        setPopUpMessagesData(auditReportExistenceResponse?.message);
        setOpenWarningModal(true);
        setHasWarning(true);
        return true;
      } else {
        setHasWarning(false);
        setOpenWarningModal(false);
        return false;
      }
      // }
    } catch {
      return false;
    }
  }

  async function checkNilReturnIfNeeded(obj?: {
    auditDate?: any;
    auditNil?: any;
  }): Promise<{ valid: boolean; message?: string }> {
    if (!selectedAccount?.value) return { valid: false };

    const bank_account_id = Number(selectedAccount?.value);
    const account_type = selectedAccount?.type;

    const selectedDate = obj?.auditDate
      ? new Date(obj?.auditDate)
      : formik.values.MonthEnd
      ? new Date(formik.values.MonthEnd)
      : null;

    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    const formattedMonthEndDate: any = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    const nilValue: any = obj?.auditNil
      ? obj?.auditNil
      : formik.values.NilReturn;

    if (nilValue === "Yes" && account_type === "Retention Trust Account") {
      try {
        const nilReturnResponse = await checkNilReturnForAudit({
          bank_account_id,
          year_end_date: formattedMonthEndDate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        if (nilReturnResponse?.warning) {
          // Return the warning message
          return { valid: false, message: nilReturnResponse?.message };
        } else {
          return { valid: true };
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
        return { valid: true };
      }
    } else {
      return { valid: true };
    }
  }

  const handleSelectChange = (selectedValue: any) => {
    if (selectedValue) {
      formik.setFieldValue("NilReturn", selectedValue);
      checkNilReturnIfNeeded({ auditNil: selectedValue });
    } else {
      formik.setFieldValue("NilReturn", "");
    }
    // Perform any other actions based on the selected value
  };

  function handleCancel() {
    if (isEqual(initialPatchedValues, formik.values) || isView) {
      handleFormCancelClick();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  const handleFormCancelClick = () => {
    handleRouteBack();
    resetRetainedAuditData();
  };

  function handleManualNotices() {
    setDisplaySubscriptionModal(false);
    handleSubmit(true);
  }

  function handleUpgradeSubscription() {
    // sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
    // dispatch(setAuditDetails(formik?.values));
    // router.push(AppRoutes.USER_SUBSCRIPTION_UPGRADE);
  }

  /**
   * Resets retained Audit data in the global subscription details state.
   * Checks if there is any retained Audit data from a subscription and clears it if present.
   */
  function resetRetainedAuditData() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setAuditDetails({}));
    }
  }

  const handleViewFile = (item: any) => {
    if (
      (isEdit || isView) &&
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

  const handleDeleteAttachmentPopup = () => {
    const uploadedFile = formik?.values?.AuditReport?.[0];

    // Save attachment ID if it exists
    if (uploadedFile?.attachment_id) {
      setRemovedUploadAttachmentIds((prev) => [
        ...prev,
        uploadedFile.attachment_id,
      ]);
    }

    // Clear formik field
    formik?.setFieldValue("AuditReport", null);

    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Track deletion state
    setIsOriginalFileDeleted(true);

    // Close modal
    setDisplayConfirmationModal(false);
    return true;
  };

  const handleDeleteGeneratedAttachment = () => {
    if (generatedFile?.file?.attachment_id) {
      setRemovedGeneratedAttachmentIds((prev) => [
        ...prev,
        generatedFile.file.attachment_id,
      ]);
    }

    setGeneratedFile({});
    setShowDeleteGeneratedModal(false);
    return true;
  };

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      const filesToUpload: File[] = Array.from(files);

      // Check for Maximum Size

      const filesExceedSize = filesToUpload.some((file) => {
        // from bytes to kb
        const fileSize = file.size / 1024;
        return fileSize > uploadFile.fiveMB;
      });
      if (filesExceedSize) {
        // TODO: Handle when file size exceeds maximum size
        setSelectedFileError(FileErrors.FILE_LIMIT_EXCEEDS_5MB);
        formik?.setFieldValue("AuditReport", null);
        fileInputRef.current.value = "";
        return;
      }
      formik?.setFieldValue("AuditReport", filesToUpload);

      setSelectedFileError("");
    }
  }

  async function handleAddQuickRecord(route: string, selectedProject?: any) {
    let base64File: any = "";
    const formFileValue = formik?.values?.AuditReport?.length
      ? formik?.values?.AuditReport[0]
      : [];
    if (formFileValue?.name) {
      base64File = await fileToBase64(formFileValue);
    }

    const postData = {
      ...formik?.values,
      AuditReport: formFileValue?.name
        ? {
            file: base64File,
            name: formFileValue?.name,
            type: formFileValue?.type,
            size: formFileValue?.size,
            lastModifiedDate: formFileValue?.lastModifiedDate,
            lastModified: formFileValue?.lastModified,
          }
        : null,
      quickAddFromAudit: true,
      selectedAcc: selectedAccount,
      selectedProject: selectedProject,
    };

    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        handleRouteBack(route);
      }
    } catch {}
  }

  async function getStoredFormData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutePathStoredData(result?.data);
      }
    } catch {}
  }

  async function handleAddBankStatement() {
    dispatch(setReduxAuditData(generatedFile));
    handleAddQuickRecord(
      `${AppRoutes.USER_BANK_OVERVIEW_BANK_STATEMENT}?screen=add&bank=${selectedAccount?.value}&from=audit&date=${formik?.values?.MonthEnd}&quick-add=${quickAddRoutes.BANK_STATEMENT}`,
      selectedProject
    );

    setOpenWarningModal(false);
  }

  function handleRouteBack(dynamicRoute?: string) {
    if (dynamicRoute) {
      router.push(dynamicRoute);
    } else if (routedFrom == "auditList") {
      router.push(AppRoutes.USER_TRUST_ACCOUNTING_AUDIT);
    } else {
      router.back();
    }
  }

  // Build (and store on the server) the Audit Pack from the current form
  // params. Returns the generated file response, or null when blocked by the
  // subscription gate / on failure. Does NOT deliver the file to the user —
  // delivery happens via "Save & Download" or the list Download action.
  async function buildAuditPack(): Promise<any> {
    // 🔹 Check subscription first (gating left as-is)
    if (!auditExportAllowed) {
      setModalHeading("Upgrade Subscription");
      setModalBodyContent(
        "Your current subscription does not allow generate audit export. Please upgrade your plan to access this feature."
      );
      setOpenPlanModal(true);
      return null; // stop further execution
    }

    const payload = {
      payload: {
        bank_account_id: +formik?.values?.AccountName,
        start_date: getDatePickerFormat(auditStartDate),
        end_date: getDatePickerFormat(auditEndDate),
        project_id: selectedProject?.project_id,
      },
    };
    const response: any = await GenerateAuditReport(payload);
    return response || null;
  }

  async function handleGenerateAudit() {
    try {
      setLoader(true);
      const response: any = await buildAuditPack();

      if (response) {
        setGeneratedFile(response);
        if (isEdit) {
          // Save generated response separately during edit
          setGeneratedEditAuditResponse(response);
        }
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  async function getProjectBankAccounts(bankId: string) {
    try {
      const response: any = await GetBankAssociatedProject({
        bankAccountId: +bankId,
      });

      if (response?.length) {
        setProjectBankAccounts(response);
      } else {
        setProjectBankAccounts([]);
      }
    } catch {}
  }

  const handleViewFileFromPath = (filePath: string, fileName: string) => {
    if (!filePath || typeof filePath !== "string") {
      showErrorToast("Invalid file path.");
      return;
    }

    try {
      // window.open(filePath, "_blank");
      downloadAuditZipFromPath(
        filePath,
        fileName,
        selectedAccount?.bankAccount
      );
    } catch (error) {
      console.error("❌ Failed to open file:", error);
      showErrorToast("Failed to open the file.");
    }
  };

  function handleViewNoticeFileFromPath(filePath: string, fileName: string) {
    const pdfWindow = window.open("");
    pdfWindow?.document.write(
      `<iframe width='100%' height='100%' src='${filePath}' title='${fileName}'></iframe>`
    );
  }

  // Send Mail
  const handleSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      handleRouteBack();
      resetRetainedAuditData();
      return true;
    }

    return false;
  };

  // Cancel
  const handleCancelSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      handleRouteBack();
      resetRetainedAuditData();
      return true;
    }

    return false;
  };

  // Common cleanup
  const cleanupNoticePopup = () => {
    setShowNoticePopup(false);
    setLoader(false);
    setLoaderInfo("");
    setNoticeFiles([]);
    setNoticeMailUuids([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  return (
    <Fragment>
      <div className="pt_smallbgimage">
        <div className="pt_centered">
          <div className="pt_centeredinner">
            <div className="pt_box_transparent_cp">
              <div className="grid">
                <div className="pt_login">
                  <h4>
                    {isEdit
                      ? "Edit audit"
                      : isView
                      ? "View audit"
                      : "Add audit"}
                  </h4>

                  <FormikControl
                    label="Account"
                    secondLabel={isView || isEdit ? "" : "Add account"}
                    onSecondLabelClick={() =>
                      handleAddQuickRecord(
                        `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.PTA_RTA_ACCOUNT}`
                      )
                    }
                    name="Account"
                    id="Account"
                    options={accountList}
                    disabled={isView || isEdit}
                    control={InputType.SELECT}
                    value={formik.values.AccountName}
                    error={formik.errors.AccountName}
                    showError={
                      formik.touched.AccountName && !formik.values.AccountName
                    }
                    required
                    renderKey="label"
                    valueKey="value"
                    placeholder="Select trust account"
                    onBlur={formik.handleBlur}
                    returnSelectedObject
                    onChange={(selectedOption: any) => {
                      setSelectedAccount(selectedOption);
                      formik.setFieldValue(
                        "AccountName",
                        selectedOption?.value
                      );
                      // getProjectBankAccounts(selectedOption?.value);
                      setAuditStartDate(null);
                      setAuditEndDate(null);
                      setSelectedProject(null);
                    }}
                  />

                  <SearchableSelect
                    placeholder="Select a project"
                    name="project"
                    options={projectBankAccounts}
                    onChange={(selected: any) => {
                      setSelectedProject(selected);
                    }}
                    selectedData={selectedProject}
                    disabled={!formik.values.AccountName || isView}
                    renderKey="project_name"
                    valueKey="project_id"
                  />
                  <br />
                  <FormikControl
                    control={InputType.MONTH_YEAR_PICKER}
                    type={InputType.MONTH_YEAR_PICKER}
                    label={"Reference Date"}
                    name={"ReferenceDate"}
                    error={formik.errors.MonthEnd}
                    showError={
                      formik.touched.MonthEnd && formik.errors.MonthEnd
                    }
                    required
                    onChange={
                      (selectedDate: any) => onStatementChange(selectedDate)
                      // formik.setFieldValue("OpeningDate", selectedDate)
                    }
                    disableAutoComplete={false}
                    disabled={!selectedAccount?.value || isView || isEdit}
                    onBlur={formik.handleBlur("MonthEnd")}
                    value={formik.values.MonthEnd}
                    maxDate={getDatePickerFormat("", true)}
                    hint={"Month, yyyy"}
                  />
                  <div className="grid">
                    <div>
                      <FormikControl
                        label="From date"
                        name="activityLogStartDate"
                        control={InputType.DATE_PICKER}
                        type="date"
                        // value={
                        //   auditStartDate
                        //     ? format(new Date(auditStartDate), "yyyy-MM-dd")
                        //     : ""
                        // }

                        value={
                          auditStartDate && isValid(new Date(auditStartDate))
                            ? format(new Date(auditStartDate), "yyyy-MM-dd")
                            : ""
                        }
                        disabled={
                          !formik.values.AccountName ||
                          !formik.values.MonthEnd ||
                          isView
                        }
                        onChange={(selectedDate: any) => {
                          if (!selectedDate) {
                            setAuditStartDate(null);
                            return;
                          }

                          const fromDate = new Date(
                            new Date(selectedDate).setHours(0, 0, 0, 0)
                          );

                          setAuditStartDate(fromDate);

                          if (fromDate > auditEndDate) {
                            setAuditEndDate(fromDate);
                          }
                        }}
                        minDate={
                          minStartAuditDate &&
                          isValid(new Date(minStartAuditDate))
                            ? format(new Date(minStartAuditDate), "yyyy-MM-dd")
                            : ""
                        } // Set any minimum date if needed
                        maxDate={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div>
                      <FormikControl
                        label="To date"
                        name="activityLogEndDate"
                        type="date"
                        control={InputType.DATE_PICKER}
                        // value={
                        //   auditEndDate
                        //     ? format(new Date(auditEndDate), "yyyy-MM-dd")
                        //     : ""
                        // }

                        value={
                          auditEndDate && isValid(new Date(auditEndDate))
                            ? format(new Date(auditEndDate), "yyyy-MM-dd")
                            : ""
                        }
                        onChange={(selectedDate: any) => {
                          if (!selectedDate) {
                            setAuditEndDate(null);
                            return;
                          }
                          const toDate = new Date(
                            new Date(selectedDate).setHours(23, 59, 59, 999)
                          );

                          // Ensure end date is not before start date

                          setAuditEndDate(toDate);
                        }}
                        minDate={
                          auditStartDate
                            ? format(new Date(auditStartDate), "yyyy-MM-dd")
                            : ""
                        }
                        // maxDate="" // Set any maximum date if needed
                        maxDate={
                          formik.values.MonthEnd &&
                          isValid(new Date(formik.values.MonthEnd))
                            ? format(
                                endOfMonth(new Date(formik.values.MonthEnd)),
                                "yyyy-MM-dd"
                              )
                            : ""
                        }
                        disabled={
                          !formik.values.AccountName ||
                          !formik.values.MonthEnd ||
                          isView
                        }
                      />
                    </div>
                  </div>

                  {!formik?.values?.AuditReport && (
                    <>
                      <label htmlFor="Audit Report">
                        <small>Audit Report</small>
                      </label>
                      <input
                        type="file"
                        onChange={onFileChange}
                        accept={`${uploadFile.pdf}, ${uploadFile.word}`}
                        ref={fileInputRef}
                        disabled={formik?.values?.AuditReport?.length > 0}
                      />
                    </>
                  )}
                  {formik.touched.AuditReport &&
                    (selectedFileError || formik.errors.AuditReport) && (
                      <small className="invalid error_wrap">
                        <i className="fa-light fa-circle-xmark"></i>
                        {selectedFileError || formik.errors.AuditReport}
                      </small>
                    )}

                  {formik?.values?.AuditReport?.length > 0 && (
                    <>
                      <label htmlFor="Uploaded Document">
                        <small>Uploaded Document</small>
                        <span className="required">*</span>
                      </label>

                      <div
                        className="pt_itemwithremove"
                        // style={{ margin: "3px 0px" }}
                      >
                        <span>{formik?.values?.AuditReport[0]?.name}</span>
                        <div>
                          <CustomButton
                            buttonName={"View"}
                            buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                            iconClassName={"fa-light fa-eye"}
                            actionType="button"
                            onClick={() =>
                              handleViewFile(formik?.values?.AuditReport[0])
                            }
                          />
                          {!isView &&
                            Object.keys(generatedFile).length === 0 && (
                              <button
                                className="contrast smallbutton"
                                onClick={() => {
                                  if (isEdit) {
                                    setDisplayConfirmationModal(true);
                                    return;
                                  }
                                  formik?.setFieldValue("AuditReport", null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }}
                              >
                                <i
                                  className="fa-light fa-xmark"
                                  style={{ margin: 0 }}
                                ></i>
                              </button>
                            )}
                        </div>
                      </div>
                    </>
                  )}

                  {Object?.keys(generatedFile).length > 0 ? (
                    <>
                      <label htmlFor="Uploaded Document">
                        <small>Generated Document</small>
                      </label>

                      <div className="pt_itemwithremove">
                        <span
                          title={generatedFile?.file?.file_name}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginRight: "8px",
                          }}
                        >
                          {generatedFile?.file?.file_name}
                        </span>
                        <div style={{ flexShrink: 0, display: "flex" }}>
                          <CustomButton
                            buttonName={"Download"}
                            buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                            iconClassName={"fa-light fa-download"}
                            actionType="button"
                            onClick={() =>
                              handleViewFileFromPath(
                                generatedFile?.file?.file_path,
                                generatedFile?.file?.file_name
                              )
                            }
                          />
                          {!isView && (
                            <button
                              className="contrast smallbutton"
                              onClick={() => {
                                if (isEdit) {
                                  setShowDeleteGeneratedModal(true);
                                } else {
                                  setGeneratedFile({});
                                }
                              }}
                            >
                              <i
                                className="fa-light fa-xmark"
                                style={{ margin: 0 }}
                              ></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Standalone "Generate audit" is only available in Edit mode
                    // (which already has a saved audit row). In Add mode the pack
                    // is produced solely by "Save & Download", so a pack is never
                    // created server-side without a corresponding saved record.
                    isEdit && (
                      <div className="width_20">
                        <CustomButton
                          buttonName={"Generate audit"}
                          buttonType={buttonType.SECONDARY}
                          actionType="submit"
                          onClick={() => handleGenerateAudit()}
                          disabled={
                            loader ||
                            !formik.values.AccountName ||
                            isView ||
                            !auditStartDate ||
                            !auditEndDate
                          }
                          inputButton
                        />
                      </div>
                    )
                  )}

                  <FormikControl
                    control={InputType.SELECT}
                    placeholder="Select Status"
                    options={returnOptions}
                    label={"Nil Return"}
                    name="NilReturn"
                    id="NilReturn"
                    disabled={!selectedAccount?.value || isView}
                    required
                    error={formik.errors.NilReturn}
                    showError={
                      formik.touched.NilReturn && formik.errors.NilReturn
                    }
                    value={formik.values.NilReturn}
                    renderKey="label"
                    valueKey="value"
                    onBlur={formik.handleBlur("NilReturn")}
                    onChange={(selectedOption: any) => {
                      handleSelectChange(selectedOption);
                    }}
                  />

                  <br />
                  {/* <div className="width_20">
                    <CustomButton
                      buttonName={"Generate audit"}
                      buttonType={buttonType.SECONDARY}
                      actionType="submit"
                      onClick={() => handleGenerateAudit()}
                      disabled={loader || !formik.values.AccountName}
                      inputButton
                    />
                  </div> */}

                  <br />
                  <br />
                  <div className="button-container">
                    <CustomButton
                      buttonName={"Cancel"}
                      buttonType={buttonType.OUTLINE_CONTRAST}
                      actionType="button"
                      onClick={handleCancel}
                      inputButton
                      disabled={formik?.isSubmitting}
                    />
                    {!isView && (
                      <CustomButton
                        buttonName={isEdit ? "Update" : "Save & Download"}
                        buttonType={buttonType.SECONDARY}
                        actionType="submit"
                        onClick={() => {
                          formik?.handleSubmit();
                        }}
                        disabled={loader}
                        inputButton
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openWarningModal && (
        <BaseModal
          modalId={"warning modal"}
          title={
            hideSecondButtonMessages.includes(popUpMessagesData)
              ? "Audit Already Exists"
              : "Bank Statement Needed"
          }
          displayModal={openWarningModal}
          onClose={(e: any) => {
            if (e) {
              formik.setFieldValue("MonthEnd", "");
              setAuditStartDate(null);
              setAuditEndDate(null);
              setOpenWarningModal(false);
            }
          }}
          onHeaderIconClose={() => {
            formik.setFieldValue("MonthEnd", "");
            setAuditStartDate(null);
            setAuditEndDate(null);
            setOpenWarningModal(false);
          }}
          restrictOncloseFunctionInHeader
          onConfirm={() => {
            handleAddBankStatement();
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Add bank statement"
          hideSecondButton={hideSecondButtonMessages.includes(
            popUpMessagesData
          )}
        >
          <h4 className="text_center">{popUpMessagesData}</h4>
        </BaseModal>
      )}
      {openConfirmModal && (
        <BaseModal
          modalId={"Confirmation Required"}
          title={"Confirmation Required"}
          displayModal={openConfirmModal}
          onClose={() => setOpenConfirmModal(false)}
          onHeaderIconClose={() => setOpenConfirmModal(false)}
          onConfirm={() => {
            setOpenConfirmModal(false);
            setLoader(true);
            proceedWithFormSubmission(formik.values);
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">
            {popUpMessagesData?.message}
          </h4>
        </BaseModal>
      )}

      {displayConfirmationModal && (
        <BaseModal
          modalId={"Delete attachment"}
          displayModal={displayConfirmationModal}
          onClose={() => setDisplayConfirmationModal(false)}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          onConfirm={handleDeleteAttachmentPopup}
          firstButtonName="No"
          secondButtonName="Yes"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">
            Are you sure you want to delete the attachment?
          </h4>
        </BaseModal>
      )}

      {showDeleteGeneratedModal && (
        <BaseModal
          modalId="DeleteGeneratedAttachment"
          displayModal={showDeleteGeneratedModal}
          onClose={() => setShowDeleteGeneratedModal(false)}
          onHeaderIconClose={() => setShowDeleteGeneratedModal(false)}
          onConfirm={handleDeleteGeneratedAttachment}
          firstButtonName="No"
          secondButtonName="Yes"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">
            Are you sure you want to delete the generated attachment?
          </h4>
        </BaseModal>
      )}

      {displaySubscriptionModal && (
        <BaseModal
          modalId={"Upgrade Subscription"}
          title={"Upgrade Subscription"}
          displayModal={displaySubscriptionModal}
          onClose={handleManualNotices}
          onHeaderIconClose={() => setDisplaySubscriptionModal(false)}
          onConfirm={() => {
            handleUpgradeSubscription();
            return true;
          }}
          firstButtonName="Proceed with manual notices"
          secondButtonName="Upgrade now"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">{SUBSCRIPTION_UPGRADE}</h4>
        </BaseModal>
      )}

      {displayClosePageConfirmation && (
        <BaseModal
          modalId={"Payment confirmation"}
          displayModal={displayClosePageConfirmation}
          onClose={handleFormCancelClick}
          onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
          onConfirm={handlePageConfirmSave}
          firstButtonName="Yes"
          secondButtonName="Save"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">
            {" "}
            Are you sure to close and not save?
          </h4>
        </BaseModal>
      )}
      {showNoticePopup && (
        <BaseModal
          modalId="Generated Notices"
          displayModal={showNoticePopup}
          title="Preview generated notices"
          hideHeaderCloseIcon={true}
          onClose={(e: any) => {
            // 👈 closing modal via "X" or backdrop = just close, no API
            if (e === true) {
              setShowNoticePopup(false);
              return handleCancelSendMail();
            }
          }}
          onConfirm={() => {
            setShowNoticePopup(false);
            return handleSendMail();
          }}
          // onCancel={handleCancelSendMail}
          firstButtonName="Close"
          secondButtonName="Send Mail"
        >
          <p className="">
            <span className="pt_yellow">Note:</span> We have generated the
            documents below, and they are available to view. The system will
            send an email with these documents attached in{" "}
            <b className="pt_green">{timeLeft}</b> seconds.
            {qbccNoticeFiles?.length > 0 && (
              <>
                <br />
                <span className="pt_red">
                  QBCC documents will be verified by Paytrade admin and
                  submitted on your behalf.
                </span>
              </>
            )}
          </p>
          <br></br>
          {noticeFiles.map((file: any, idx: number) => (
            <div key={idx} className="pt_itemwithremove">
              <span>{file.file_name}</span>
              <div>
                <CustomButton
                  buttonName="View"
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName="fa-light fa-eye"
                  actionType="button"
                  onClick={
                    () =>
                      handleViewNoticeFileFromPath(file.file, file.file_name) // base64 PDF
                  }
                />
              </div>
            </div>
          ))}
          {qbccNoticeFiles?.length > 0 && (
            <>
              {qbccNoticeFiles.map((file: any, idx: number) => (
                <div key={idx} className="pt_itemwithremove">
                  <span>{file?.file_name}</span>
                  <div>
                    <CustomButton
                      buttonName="View"
                      buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                      iconClassName="fa-light fa-eye"
                      actionType="button"
                      onClick={() =>
                        handleViewNoticeFileFromPath(
                          file.file_path || file.file, // prefer path, fallback to base64
                          file.file_name
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </BaseModal>
      )}
      {openPlanModal && (
        <BaseModal
          displayModal={openPlanModal}
          onClose={async (triggered: any) => {
            if (triggered) {
              setOpenPlanModal(false);
            }
          }}
          title={modalHeading}
          secondButtonName="Upgrade Now"
          firstButtonName="Close"
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => {
            setOpenPlanModal(false);
          }}
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
