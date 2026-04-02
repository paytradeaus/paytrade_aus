"use client";
import FormikControl from "@/components/FormikControl";
import { useCustomDebounce, useTokenDetails } from "@/hooks";
import { multipleFileUploadApi } from "@/network/apolloClient";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  buttonType,
  DEBOUNCE_TIMER,
  findSelectedOptions,
  InputType,
  NUMBER_REGEX,
  QUICK_ADD_RECORD_VALUE,
  quickAddRoutes,
  uploadFile,
} from "@/shared/constant/general";
import { useFormik } from "formik";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { FileUploadResponseData } from "../CompanyVerification";
import {
  ReadFileAttachmentsOrDocuments,
  UpdateFileAttachmentsOrDocuments,
} from "@/app/api/commonApi";
import {
  auditAccounts,
  bankAccountTypes,
  bankProjectGridHeaders,
  projectRenderData,
  quickAddOnRoute,
  trusteeWarningMessage,
} from "./AddUpdateBankAccount.constant";
import { getCompanyProfilesWithLogos } from "@/app/api/companyRegistrationService";
import {
  AddBankAccount,
  AdminListAllFinancialInstitution,
  CheckExistenceOfBankAccountNumber,
  CreateAccountInPaytrade,
  CreateOrUpdateAccountInPaytrade,
  EditDetailsOfABankAccount,
  FetchAllBankAccounts,
  FetchBankAccountDetailsForEditing,
  projectArraysCompare,
  SendMailForNotices,
  SendQbccMailForNotices,
  skipXeroAutoCreate,
  TriggerAccountNotices,
} from "./AddUpdateBankAccount.function";
import { CreateBankAccountsInXero, getXeroDetailsForCompany } from "../UserIntegrations/integration.functions";
import {
  getClientSupplierLists,
  getProjectsLists,
} from "../Contracts/contracts.functions";
import CustomButton from "@/components/CustomButton/CustomButton";
import { ApiResponse, FileErrors } from "@/shared/constant/messages";
import {
  generateUniqueId,
  getCompanyIdFromStorage,
  getDatePickerFormat,
  dateStringToUtcConversion,
} from "@/utils";
import RetentionTrustGrid from "./RetentionTrustGrid";
import ContractDetails from "./ContractDetails";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BaseModal from "@/components/BaseModal";
import DynamicTable from "@/components/Table";
import { isEqual } from "lodash";
import { useLoaderContext } from "@/context/useLoader";
import { setAddBankAccountDetails } from "@/redux/slices/dashboardSlices";
import _ from "lodash";
import { queryParamsData } from "../BankAccounts/bankAccount.constant";
import { getSubscriptionDetailsByCompanyId } from "../Subscriptions/subscriptions.function";
import { viewXeroSyncLog } from "../UserIntegrations/integration.functions";

const AUTO_CLOSE_TIME = 30;

export default function AddUpdateBankAccounts({ isEditable }: any) {
  const params = useParams();
  const queryParams = useSearchParams();
  const overviewId = queryParams.get("overview");
  const overviewProjectId = queryParams.get("project");
  const complianceProjectId = queryParams.get("projectId");
  const routedFrom = queryParams.get("routedFrom");
  const tab = queryParams.get("complianceTab");
  const syncId = queryParams.get("syncId");
  const ErrorCode = queryParams.get("errorCode");

  const [isConfirmed, setIsConfirmed] = useState(false);
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const dispatch = useAppDispatch();
  const selectedCompanyId = +getCompanyIdFromStorage();
  const router = useRouter();
  const fileInputRef = useRef<any>(null); // Reference to the retention file input
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [displayTrusteeNameWarning, setDisplayTrusteeNameWarning] =
    useState(false);
  const [enteredAccountNumber, setEnteredAccountNumber] = useState("");
  const retainedSubscriptionBankDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addBankAccountDetails
  );
  const debouncedSearchTerm = useCustomDebounce(
    enteredAccountNumber,
    DEBOUNCE_TIMER
  ); // Debounce delay of 700ms
  const [trusteeNameWarningMessage, setTrusteeNameWarningMessage] =
    useState("");
  const [isFree, setIsFree] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [accountNumberLength, setAccountNumberLength] = useState(0);
  const [financialInstituteData, setFinancialInstituteData] = useState<any>();
  const [selectedBankType, setSelectedBankType] = useState("");
  const [triggerBtnStatus, setTriggerBtnStatus] = useState<any>("");
  const [planName, setPlanName] = useState<string>("Basic");
  const [openFinalModal, setOpenFinalModal] = useState(false);
  const [valuesForSubmit, setValuesForSubmit] = useState<any>();
  const [contactDetailsData, setContactDetailsData] = useState<any>({});
  const accountType = queryParams.get("type");
  const [initialRender, setInitialRender] = useState(true);
  const [financialInstituteOpt, setFinancialInstituteOpt] = useState([]);
  const [allFinancialInstituteOpt, setAllFinancialInstituteOpt] = useState([]);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [clientListOpt, setClientListOpt] = useState<any>([]);
  const [selectedProjects, setSelectedProjects] = useState<any>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [uploadFiles, setUploadedFiles] = useState([]);
  const [selectedBusinessData, setSelectedBusinessData] = useState<any>([]);
  const [displayRetentionGrid, setDisplayRetentionGrid] = useState(false);
  const [displayContractForms, setDisplayContractForms] = useState(false);
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [xeroAccountId, setXeroAccountId] = useState("");
  const [xeroAccountStatus, setXeroAccountStatus] = useState("");

  const [displayStatusInfo, setDisplayStatusInfo] = useState(false);

  const DelegateOptions = [
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];
  const [cashAccounts, setCashAccounts] = useState<any>([]);

  const [openModal, setOpenModal] = useState(false);

  const [archivedProjectOpt, setArchivedProjectOpt] = useState<any>([]);
  const [viewProjectsInEdit, setViewProjectsInEdit] = useState<any>([]);
  const { decodeTokenData, accessTokenId } = useTokenDetails();
  const [selectedFileError, setSelectedFileError] = useState("");
  const [retentionFiles, setRetentionFiles] = useState<any>([]);
  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);
  const [showXeroConfirm, setShowXeroConfirm] = useState(false);
  const [pendingXeroBankId, setPendingXeroBankId] = useState<number | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string>("");
  const [xeroCreating, setXeroCreating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const progressPercent =
    ((AUTO_CLOSE_TIME - timeLeft) / AUTO_CLOSE_TIME) * 100;

  const quickAddRecord: any = queryParams.get("quick-add");

  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const complianceOverviewData: any = useAppSelector(
    (state: any) => state?.complianceOverview?.timeLineData
  );

  const validationSchema = Yup.object().shape({
    AccountName: Yup.string()
      .required("Account Name is required")
      .max(100, "Name must be at most 100 characters")
      .test(
        "includesTrustee",
        "Please include the word 'Trust'",
        (value, context) => {
          const { Trustee, BankAccountType } = context?.parent;

          if (BankAccountType === "Cash Account") return true;
          // const containsTrustee =
          //   Trustee?.length > 0
          //     ? hasAtLeastTwoMatches(
          //         Trustee ? Trustee.toLowerCase() : "",
          //         value ? value.toLowerCase() : ""
          //       )
          //     : false;

          // Check if the word "trust" is included as a full word and not part of another
          const containsTrust = /\btrust\b/i.test(value); // \b for word boundaries

          // return containsTrustee && containsTrust;
          return containsTrust;
        }
      ),
    OpeningDate: Yup.string()
      .test("maxDate", "Opening date cannot be in the future", (value): any => {
        if (!value) return true; // Allow empty values
        const date = new Date(value);
        return date <= new Date();
      })
      .required("Opening date is required"),

    AccountNumber: Yup.string()
      .required("Account number is required")
      // .matches(/^\d{6}$/, "BSB number must be exactly 6 digits")
      .test(async function (value, formData: any) {
        if (!value.trim()) return true; // Handle empty account number

        const regex = new RegExp(`^\\d{${accountNumberLength}}$`);

        if (!regex.test(value)) {
          return this.createError({
            path: this.path,
            message: `Account number length should be ${accountNumberLength} for ${financialInstituteData?.label}.`,
          });
        }

        const AccountNumber = formData?.parent?.isAccountNumberExist;
        if (AccountNumber) {
          return this.createError({
            path: this.path,
            message: "Account Number already exists.",
          });
        }
        return true;
      }),
    BsbNumber: Yup.string()
      .required("BSB Number is required")
      // .matches(/^[0-9]+$/, "Only numbers are allowed")
      .matches(/^\d{6}$/, "BSB number must be exactly 6 digits"),
    BankAccountType: Yup.string().required("Bank Account Type is required"),
    FinancialIns: Yup.string().required("Financial institution is required"),

    ...(selectedBankType === "Project Trust Account" && {
      ProjectName: Yup.string().required("Project is required"),
      ClientName: Yup.string().required("Client is required"),
      headContractId: Yup.string().required("Contract Details is  required"),
      Trustee: Yup.string().required("Trustee Name is required"),
      associated_cash_account_id: Yup.string().required(
        "Cash account is required"
      ),
      DelegateStatus: Yup.string().required("Delegate Power is required"),
    }),
    ...(selectedBankType === "Retention Trust Account" && {
      MultiProjects: Yup.string().required("Project is required"),
      Trustee: Yup.string().required("Trustee Name is required"),
      associated_cash_account_id: Yup.string().required(
        "Cash account is required"
      ),
      DelegateStatus: Yup.string().required("Delegate Power is required"),
    }),
    ...(isEditable
      ? {
          apca_number: Yup.string().matches(
            /^\d{6}$/,
            "APCA number must be exactly 6 digits"
          ),
        }
      : { apca_number: Yup.string().notRequired() }),
  });

  const formik: any = useFormik({
    initialValues: {
      BankAccountType: "",
      AccountName: "",
      AccountNumber: "",
      BsbNumber: "",
      FinancialIns: "",
      Trustee: "",
      ProjectName: "",
      ClientName: "",
      headContractId: "",
      DelegateStatus: "No",
      uploaded_file: "",
      MultiProjects: "",
      OpeningDate: "",
      associated_cash_account_id: "",
      isAccountNumberExist: false,
    },
    validationSchema,
    // onSubmit: async (values, { setSubmitting }) => {
    //   try {
    //     if (triggerBtnStatus === "completed" && planName === "Basic") {
    //       setValuesForSubmit(values);
    //       setOpenFinalModal(true);
    //       return;
    //     }
    //     if (
    //       triggerBtnStatus === "completed" &&
    //       planName != "Basic" &&
    //       formik?.values?.DelegateStatus === "No"
    //     ) {
    //       setValuesForSubmit(values);
    //       setDisplayDelegationModel(true);
    //       return;
    //     }

    //     await handleFinalSubmit(values);
    //   } catch {
    //   } finally {
    //     setSubmitting(false);
    //   }
    // },
    onSubmit: async (values, { setSubmitting }) => {
      try {
        if (triggerBtnStatus === "completed") {
          // 🔹 Build payload early so we know status change
          const payloadStatus =
            isEditable && values?.BankAccountType !== "Cash Account"
              ? "Open"
              : triggerBtnStatus === "save"
              ? "Draft"
              : "Open";

          const shouldCheckCount =
            !isEditable || // Add time → always check
            (isEditable &&
              editData?.status === "Draft" &&
              payloadStatus === "Open"); // Edit time → only check if Draft → Open

          if (shouldCheckCount) {
            setLoader(true);
            setLoaderInfo("Checking subscription...");

            try {
              const [subscriptionResponse, bankResponse] = await Promise.all([
                getSubscriptionDetailsByCompanyId(),
                FetchAllBankAccounts({
                  company_id: getCompanyIdFromStorage(),
                  status: "Open",
                  page: 1,
                  items_per_page: 10,
                  account_type:
                    "Retention Trust Account, Project Trust Account",
                }),
              ]);
              // ⭐ NEW CHECK: get free plan eligibility
              const isFreePlanEligible =
                subscriptionResponse?.is_free_plan_eligible === true;

              // 🔹 Step 1: Find Trusts plan item
              const trustsItem =
                subscriptionResponse?.plan_items?.find(
                  (item: any) => item.item_name === "Trusts"
                ) || null;
              // 🔥 If free plan eligible → SKIP RESTRICTIONS COMPLETELY
              if (!isFreePlanEligible) {
                if (!trustsItem) {
                  setModalHeading("Upgrade Subscription");
                  setModalBodyContent(
                    "Please complete and send the required notices in the notices list or if you would like Pay Trade to auto submit for you, Upgrade now."
                  );
                  setOpenFinalModal(true);
                  setLoader(false);
                  setLoaderInfo("");
                  return;
                }

                // 🔹 Step 2: Check only if NOT unlimited numeric
                if (
                  trustsItem.limit_type === "Numeric" &&
                  !trustsItem.is_unlimited
                ) {
                  const trustLimit = Number(trustsItem.limit_value ?? 0);
                  const bankTotalCount = Number(bankResponse?.total_count ?? 0);

                  if (bankTotalCount >= trustLimit) {
                    setModalHeading("Upgrade Subscription");
                    setModalBodyContent(
                      `You already have ${bankTotalCount} Trust account${
                        bankTotalCount === 1 ? "" : "s"
                      }. Your current subscription allows a maximum of ${trustLimit} Trust account${
                        trustLimit === 1 ? "" : "s"
                      }. Please upgrade your plan to add more.`
                    );
                    setOpenFinalModal(true);
                    setLoader(false);
                    setLoaderInfo("");
                    return;
                  }
                }
              }

              // else → unlimited numeric OR non-numeric → skip restriction

              // 🔹 Step 3: Check Delegate authority subscription
              if (formik?.values?.DelegateStatus === "No") {
                const delegateItem =
                  subscriptionResponse?.plan_items?.find(
                    (item: any) => item.item_name === "Delegate authority"
                  ) || null;

                if (
                  delegateItem?.limit_value === "true" ||
                  isFreePlanEligible
                ) {
                  setLoader(false);
                  setLoaderInfo("");
                  setIsFree(isFreePlanEligible);
                  setValuesForSubmit(values);
                  setDisplayDelegationModel(true);
                  return;
                }
              }
            } catch (error) {
              console.error("Error validating Trusts/Delegate flow:", error);
            } finally {
              setLoader(false);
              setLoaderInfo("");
            }
          }

          await handleFinalSubmit(values);
        } else {
          // 🔹 Fallback for non-completed triggers
          await handleFinalSubmit(values);
        }
      } catch {
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionRes = await getSubscriptionDetailsByCompanyId();

        // FREE PLAN → ALWAYS ALLOW (no popup, no restriction)
        const isEligible = subscriptionRes?.is_free_plan_eligible === true;

        setIsFree(isEligible);
      } catch (err) {
        console.error("Error fetching subscription details:", err);
        setIsFree(false);
      }
    };

    fetchSubscription();
  }, []); // runs on initial render only

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
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        const postData = {
          payload: {
            bank_account_number: enteredAccountNumber.trim(),
          },
        };

        // Check data existence using CheckExistenceOfBankAccountNumber
        const response = await CheckExistenceOfBankAccountNumber(postData);

        // Update error field based on existence check results
        if (response?.is_present) {
          await formik.setFieldValue("isAccountNumberExist", true);
        } else {
          await formik.setFieldValue("isAccountNumberExist", false);
        }
      }
    }
    if (!initialRender) {
      afterDebounce();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    initialInvoke();
  }, []);

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && selectedCompanyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) =>
          String(x.companyId) === String(selectedCompanyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const currentPlanName = subscription?.plan_name;

      setPlanName(currentPlanName || "Basic"); // Assuming setPlanName exists to store the plan name
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (
      accountType ||
      quickAddRecord == quickAddRoutes.RTA_ACCOUNT ||
      quickAddRecord == quickAddRoutes.PTA_ACCOUNT
    ) {
      if (
        accountType === queryParamsData.RTA ||
        quickAddRecord == quickAddRoutes.RTA_ACCOUNT
      ) {
        setSelectedBankType("Retention Trust Account");

        formik.setFieldValue("BankAccountType", "Retention Trust Account");
      }
      if (
        accountType === queryParamsData.PTA ||
        quickAddRecord == quickAddRoutes.PTA_ACCOUNT
      ) {
        setSelectedBankType("Project Trust Account");

        formik.setFieldValue("BankAccountType", "Project Trust Account");
      }
      if (accountType === queryParamsData.cash) {
        setSelectedBankType("Cash Account");

        formik.setFieldValue("BankAccountType", "Cash Account");
      }
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    if (contactDetailsData?.ContractDate) {
      formik.setFieldValue("headContractId", "contract details added");
    }
  }, [contactDetailsData]);

  useEffect(() => {
    if (
      complianceOverviewData?.addBankAccount ||
      complianceOverviewData?.editBankAccount
    ) {
      handleRouteFromCompliance();
    }

    if (complianceOverviewData?.addBankAccount) {
      if (projectOpt?.length > 0) {
        const findComplianceProject: any = findSelectedOptions(
          projectOpt,
          complianceOverviewData?.projectId
        );

        if (findComplianceProject?.value) {
          formik.handleChange("ProjectName")(
            findComplianceProject?.value || ""
          );
        }
      }

      if (
        complianceOverviewData?.typeOfTrustAccount === "Retention Trust Account"
      ) {
        setSelectedProjects(
          complianceOverviewData?.projectId
            ? [complianceOverviewData?.projectId]
            : []
        );
      }
    }
  }, [complianceOverviewData, projectOpt]);

  useEffect(() => {
    if (selectedProjects.length > 0) {
      let projectsLength = selectedProjects.length;
      let nameStringis = `${projectsLength} Record${
        projectsLength > 1 ? "s" : ""
      } added`;
      formik.setFieldValue("MultiProjects", nameStringis);
    } else {
      formik.setFieldValue("MultiProjects", "");
    }
  }, [selectedProjects]);

  useEffect(() => {
    if (
      retainedSubscriptionBankDetails?.haveAddedData &&
      planName !== "Basic"
    ) {
      formik.handleChange("DelegateStatus")(
        retainedSubscriptionBankDetails?.DelegateStatus
      );
    }
  }, [planName]);

  useEffect(() => {
    if (isEditable && editData?.bank_account_id) {
      const formValues = {
        BankAccountType: editData?.account_type || "Cash Account",
        AccountName: editData?.account_name || "",
        AccountNumber: editData?.account_number || "",
        BsbNumber: editData?.bsb_number || "",
        OpeningDate: editData?.opening_date
          ? getDatePickerFormat(editData?.opening_date)
          : "",
        FinancialIns: editData?.financial_institution || "",
        Trustee: selectedBusinessData[0]?.company_name || "",
        ProjectName:
          editData?.account_type === "Project Trust Account"
            ? editData?.project_ids[0].toString()
            : "",
        ClientName: editData?.client_supplier_id?.toString() || "",
        headContractId: editData?.contract_date ? "contract details added" : "",
        DelegateStatus: editData?.delegate_powers || "No",
        uploaded_file:
          editData?.retention_trust_certificate_attachment_ids || "",
        MultiProjects: "",
        associated_cash_account_id:
          editData?.account_type !== "Cash Account"
            ? editData?.associated_cash_account_id
            : {},
        isAccountNumberExist: false,
        apca_number: editData?.apca_number || "",
      };
      formik.setValues(formValues);
      setInitialPatchedValues(formValues);

      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) => each?.value === editData?.financial_institution
        ) || {};

      setSelectedBankType(editData?.account_type || "");
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);

      if (editData?.account_type === "Retention Trust Account") {
        const findProject = editData?.project_ids.map((each: any) =>
          each.toString()
        );
        setSelectedProjects(findProject);
        setInitialPatchedValues({
          ...formValues,
          MultiProjects: findProject?.length
            ? `${findProject?.length} Record added`
            : "",
        });
        let filterData = archivedProjectOpt?.filter((item: any) =>
          editData?.project_ids.includes(Number(item?.value))
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
      }
    }
  }, [isEditable, editData]);

  useEffect(() => {
    if (retentionFiles.length > 0) {
      formik?.setFieldValue("uploaded_file", retentionFiles);
    } else if (uploadFiles.length > 0) {
      formik?.setFieldValue("uploaded_file", uploadFiles);
    } else {
      formik?.setFieldValue("uploaded_file", "");
    }
  }, [retentionFiles, uploadFiles]);

  useEffect(() => {
    if (
      routePathStoredData?.quickAddFromContract &&
      routePathStoredData?.ReduxProjectId
    ) {
      if (quickAddRecord == quickAddRoutes.PTA_ACCOUNT)
        formik?.setFieldValue(
          "ProjectName",
          routePathStoredData?.ReduxProjectId
        );
      else if (quickAddRecord == quickAddRoutes.RTA_ACCOUNT) {
        setSelectedProjects([routePathStoredData?.ReduxProjectId.toString()]);
      }
    }

    patchStoredFormData();
  }, [
    retainedSubscriptionBankDetails,
    routePathStoredData,
    allFinancialInstituteOpt,
  ]);

  useEffect(() => {
    if (!isEditable && retainedSubscriptionBankDetails.haveAddedData) {
      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) =>
            each?.value === retainedSubscriptionBankDetails?.FinancialIns
        ) || {};
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);
      if (
        retainedSubscriptionBankDetails?.BankAccountType ===
        "Project Trust Account"
      ) {
        setContactDetailsData(
          retainedSubscriptionBankDetails?.contactDetailsData
        );
      }
      if (
        retainedSubscriptionBankDetails?.BankAccountType ===
        "Retention Trust Account"
      ) {
        setSelectedProjects(
          retainedSubscriptionBankDetails?.selectedProjects || []
        );

        let filterData = archivedProjectOpt?.filter((item: any) =>
          retainedSubscriptionBankDetails?.selectedProjects.includes(
            Number(item?.value)
          )
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
      }
    }
  }, [allFinancialInstituteOpt]);

  async function initialInvoke() {
    try {
      setLoader(true);

      if (
        retrieveAfterAddingQuickRecord == quickAddOnRoute.BANK ||
        quickAddRecord == quickAddRoutes.PTA_RTA_ACCOUNT ||
        quickAddRecord == quickAddRoutes.BANK_ACCOUNT ||
        quickAddRecord == quickAddRoutes.RTA_ACCOUNT ||
        quickAddRecord == quickAddRoutes.PTA_ACCOUNT
      ) {
        getStoredBankAccountData();
      }

      if (isEditable && params?.id?.length !== 2) {
        setWrongIdCheck(true);
        setLoader(false);
        return;
      }

      const bankListPostData = {
        account_type: bankAccountTypes[0].value,
        company_id: getCompanyIdFromStorage(),
        items_per_page: null,
        page: 1,
        is_alphabetical_order: true,
      };

      const [
        businessProfiles,
        financialListData,
        projectListData,
        archivedProjects,
        clientListData,
        availableCashTypes,
      ] = await Promise.all([
        getCompanyProfilesWithLogos(),
        AdminListAllFinancialInstitution({
          page: null,
          perPage: null,
          keyword: null,
          status: null,
          isAlphabeticalOrder: true,
        }),
        getProjectsLists({
          companyId: selectedCompanyId || 0,
          isArchived: false,
        }),
        getProjectsLists({
          companyId: selectedCompanyId || 0,
          isArchived: true,
        }),
        getClientSupplierLists(selectedCompanyId),
        FetchAllBankAccounts(bankListPostData),
      ]);

      if (businessProfiles?.length > 0) {
        let selectedData = businessProfiles.filter(
          (each: any) => each?.company_id === selectedCompanyId
        );
        if (selectedData?.length > 0) {
          setSelectedBusinessData(selectedData);
          formik.setFieldValue("Trustee", selectedData[0].company_name);
          setInitialPatchedValues({
            ...formik?.initialValues,
            Trustee: selectedData[0]?.company_name,
          });
        } else {
          if (decodeTokenData?.companySpecificRoles?.length > 0) {
            let userCompanyIDData = decodeTokenData?.companySpecificRoles
              .filter((each: any) => each?.companyId === selectedCompanyId)
              .map((eachone: any) => {
                return {
                  company_name: eachone?.companyName,
                  company_id: eachone?.companyId,
                };
              });
            if (userCompanyIDData?.length > 0) {
              setSelectedBusinessData(userCompanyIDData);
              formik.setFieldValue(
                "Trustee",
                userCompanyIDData[0].company_name
              );
              setInitialPatchedValues({
                ...formik?.initialValues,
                Trustee: userCompanyIDData[0]?.company_name,
              });
            }
          }
        }
      } else {
        if (decodeTokenData?.companySpecificRoles?.length > 0) {
          let userCompanyIDData = decodeTokenData?.companySpecificRoles
            .filter((each: any) => each?.companyId === selectedCompanyId)
            .map((eachone: any) => {
              return {
                company_name: eachone?.companyName,
                company_id: eachone?.companyId,
              };
            });
          if (userCompanyIDData?.length > 0) {
            setSelectedBusinessData(userCompanyIDData);
            setInitialPatchedValues({
              ...formik?.initialValues,
              Trustee: userCompanyIDData[0]?.company_name,
            });
            formik.setFieldValue("Trustee", userCompanyIDData[0].company_name);
          }
        }
      }
      if (financialListData?.institutions?.length > 0) {
        let modifiedFinancialOpt = financialListData?.institutions?.map(
          (item: any) => {
            return {
              label: item?.institution_name,
              value: item?.id,
              maxlengthvalue: item?.acc_number_maxlength,
              status: item?.institution_status,
            };
          }
        );
        if (modifiedFinancialOpt?.length > 0) {
          let filterData = modifiedFinancialOpt?.filter(
            (each: any) => each.status === "Active"
          );
          setAllFinancialInstituteOpt(modifiedFinancialOpt);
          setFinancialInstituteOpt(filterData);
        }
      }
      if (projectListData && projectListData?.length > 0) {
        let modifiedOpt: any = projectListData?.map((each: any) => {
          return {
            label: each?.project_name,
            value: each?.project_id.toString(),
          };
        });

        setProjectOpt(modifiedOpt);
      }
      if (archivedProjects && archivedProjects?.length > 0) {
        let modifiedOpt: any = archivedProjects?.map((each: any) => {
          return {
            label: each?.project_name,
            value: each?.project_id.toString(),
          };
        });

        setArchivedProjectOpt(modifiedOpt || []);
      }
      if (clientListData && clientListData?.length > 0) {
        let modifiedOpt: any = clientListData
          ?.filter((each: any) => each?.client_supplier_type === "Client")
          .map((each: any) => {
            return {
              label: each?.client_supplier_name,
              value: each?.client_supplier_id.toString(),
            };
          });
        setClientListOpt(modifiedOpt);
      }

      if (availableCashTypes?.total_count) {
        setCashAccounts(availableCashTypes.extendedBankAccounts);
      }
      if (isEditable && params?.id?.length === 2) {
        let payload = {
          company_id: Number(params?.id[0]),
          bank_account_id: Number(params?.id[1]),
        };
        let responseData = await FetchBankAccountDetailsForEditing(payload);

        if (responseData?.bank_account_id) {
          if (responseData?.account_type === "Project Trust Account") {
            setContactDetailsData({
              ContractDate: getDatePickerFormat(responseData?.contract_date),
              SubContractDate: getDatePickerFormat(
                responseData?.first_sub_contract_date
              ),
              ContractCompletionDate: getDatePickerFormat(
                responseData?.contract_practical_completion_date
              ),
              ContractValue: `$ ${responseData?.contract_value}`,
            });
          }
          if (responseData?.account_type === "Retention Trust Account") {
            let payload = {
              data: {
                bank_account_id: responseData?.bank_account_id,
              },
              fileAttachmentOrDocumentType: "Retention trust certificate",
            };

            let filesData = await ReadFileAttachmentsOrDocuments(payload);
            if (filesData?.length > 0) {
              setUploadedFiles(filesData);
              setSelectedFileNames(
                filesData?.map((each: any) => each?.file_name)
              );
            }
          }
          setEditData(responseData);
        } else {
          setWrongIdCheck(true);
        }
      }
      if (syncId && !retainedSubscriptionBankDetails?.haveAddedData) {
        const data = await viewXeroSyncLog({
          viewXeroSyncLogId: syncId,
        });
        const {
          account_name = "",
          account_number = "",
          bsb_number = "",
          account_id,
          account_status,
        } = data.api_payload;
        setXeroAccountId(account_id);
        setXeroAccountStatus(account_status);
        setInitialPatchedValues({
          ...formik?.values,
          AccountName: account_name || "",
          AccountNumber: account_number || "",
          BsbNumber: bsb_number || "",
        });
        formik.setFieldValue("AccountName", account_name);
        formik.setFieldValue("AccountNumber", account_number);
        formik.setFieldValue("BsbNumber", bsb_number);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function getAllBankAccounts() {
    try {
      const bankListPostData = {
        account_type: bankAccountTypes[0].value,
        company_id: getCompanyIdFromStorage(),
        items_per_page: null,
        page: 1,
        is_alphabetical_order: true,
      };
      const response: any = await FetchAllBankAccounts(bankListPostData);
      if (response?.total_count) {
        setCashAccounts(response.extendedBankAccounts);
      }
    } catch {}
  }

  function patchStoredFormData() {
    if (
      !isEditable &&
      (retainedSubscriptionBankDetails.haveAddedData ||
        routePathStoredData?.quickAddFromBankAccount)
    ) {
      const formData = retainedSubscriptionBankDetails?.haveAddedData
        ? retainedSubscriptionBankDetails
        : routePathStoredData;

      setSelectedBankType(formData?.BankAccountType);
      formik.setValues({
        BankAccountType: formData?.BankAccountType,
        AccountName: formData?.AccountName || "",
        AccountNumber: formData?.AccountNumber || "",
        BsbNumber: formData?.BsbNumber || "",
        OpeningDate: formData?.OpeningDate ? formData?.OpeningDate : "",
        FinancialIns: formData?.FinancialIns || "",
        Trustee:
          formData?.Trustee || selectedBusinessData[0]?.company_name || "",
        ProjectName:
          formData?.BankAccountType === "Project Trust Account"
            ? formData?.ProjectName
            : "",
        ClientName: formData?.ClientName?.toString() || "",
        headContractId: formData?.headContractId || "",
        DelegateStatus: planName !== "Basic" ? formData?.DelegateStatus : "No",
        MultiProjects: "",
        associated_cash_account_id:
          formData?.BankAccountType !== "Cash Account"
            ? formData?.associated_cash_account_id
            : {},
        isAccountNumberExist: formData?.isAccountNumberExist || false,
      });

      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) => each?.value === formData?.FinancialIns
        ) || {};

      setSelectedBankType(formData?.BankAccountType);
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);

      if (formData?.BankAccountType === "Project Trust Account") {
        setContactDetailsData(formData?.contactDetailsData);
      }
      if (formData?.BankAccountType === "Retention Trust Account") {
        setSelectedProjects(formData?.selectedProjects || []);

        let filterData = archivedProjectOpt?.filter((item: any) =>
          formData?.selectedProjects.includes(Number(item?.value))
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
        setRetentionFiles(formData?.files);
        setSelectedFileNames(formData?.selectedFileNames);
      }
    }
  }

  async function getStoredBankAccountData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutePathStoredData(result?.data);
      }
    } catch {}
  }

  function handleSelectedFinInstitution(selectedOption: any) {
    if (!syncId) {
      formik.setFieldValue("AccountNumber", "");
    }
    formik.handleChange("FinancialIns")(selectedOption?.value || "");
    setAccountNumberLength(selectedOption?.maxlengthvalue);
    setFinancialInstituteData(selectedOption);
  }

  // function hasAtLeastOneMatchesWithTrustee(str1: string, str2: string) {
  //   // Convert strings to sets of characters
  //   const set1: any = new Set(str1);

  //   const set2: any = new Set(str2);

  //   // Count matching characters
  //   let matchCount = 0;
  //   for (const char of set1) {
  //     if (set2.has(char)) {
  //       matchCount++;
  //       if (matchCount >= 1) {
  //         return true; // Early return if at least 2 matches are found
  //       }
  //     }
  //   }

  //   return false; // Fewer than 2 matches
  // }

  function hasAtLeastOneMatchesWithTrustee(str1: string, str2: string) {
    if (!str1 || !str2) return false;

    const words1 = str1.toLowerCase().split(/\s+/).filter(Boolean);
    const words2 = str2.toLowerCase().split(/\s+/).filter(Boolean);

    return words1.some((word) => words2.includes(word));
  }

  async function handleFinalSubmit(
    values: any,
    skipTrusteeNameValidation?: boolean,
    skipDraftStatus?: boolean
  ) {
    try {
      const {
        BankAccountType,
        AccountName,
        AccountNumber,
        BsbNumber,
        FinancialIns,
        ProjectName,
        ClientName,
        DelegateStatus,
        OpeningDate,
        Trustee,
      } = values;

      if (
        BankAccountType !== "Cash Account" &&
        !AccountName?.toLowerCase().includes(Trustee?.toLowerCase()) &&
        !skipTrusteeNameValidation
      ) {
        if (hasAtLeastOneMatchesWithTrustee(Trustee, AccountName)) {
          setTrusteeNameWarningMessage(
            trusteeWarningMessage.ON_PARTIAL_MATCHES
          );
        } else {
          setTrusteeNameWarningMessage(trusteeWarningMessage.ON_NO_MATCHES);
        }
        setDisplayTrusteeNameWarning(true);
        return true;
      } else if (
        BankAccountType !== "Cash Account" &&
        triggerBtnStatus == "save"
      ) {
        if (
          ((isEditable && editData?.status == "Draft") || !isEditable) &&
          !skipDraftStatus
        ) {
          setDisplayStatusInfo(true);
          return true;
        }
      }

      setLoader(true);
      const payload: any = {
        account_name: AccountName,
        account_number: AccountNumber,
        account_type: BankAccountType,
        company_id: selectedCompanyId,
        financial_institution: FinancialIns,
        bsb_number: Number(BsbNumber),
        opening_date: OpeningDate || null,
        associated_cash_account_id:
          +formik?.values?.associated_cash_account_id || null,
        delegate_powers: DelegateStatus,
      };

      if (BankAccountType === "Project Trust Account") {
        let amountString = contactDetailsData?.ContractValue.replace(
          /[^0-9.]/g,
          ""
        );
        payload.project_ids = [Number(ProjectName)];
        payload.client_supplier_id = Number(ClientName);
        payload.trustee_id = selectedCompanyId;

        payload.contract_date = contactDetailsData?.ContractDate || null;
        payload.contract_value = parseFloat(amountString);
        payload.contract_practical_completion_date =
          contactDetailsData?.ContractCompletionDate || null;
        payload.first_sub_contract_date =
          contactDetailsData?.SubContractDate || null;
      }

      let fileIds: Array<string> = [];
      if (
        BankAccountType === "Retention Trust Account" &&
        retentionFiles.length > 0
      ) {
        let userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Retention_trust_certificates",
        };
        let multiUserData: any = [userData];

        const modifiedFiles = retentionFiles.map((obj: any) => obj.file);

        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(
            modifiedFiles,
            multiUserData,
            accessTokenId
          );

        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: FileUploadResponseData) =>
            fileIds.push(each?.id)
          );
        }
      }
      if (BankAccountType === "Retention Trust Account") {
        payload.project_ids = selectedProjects?.map((each: any) =>
          Number(each)
        );
        payload.trustee_id = selectedCompanyId;

        payload.retention_trust_certificate_attachment_ids = isEditable
          ? editData?.retention_trust_certificate_attachment_ids
          : fileIds;
      }
      if (
        isEditable &&
        BankAccountType === "Retention Trust Account" &&
        (uploadFiles.length > 0 || fileIds.length > 0)
      ) {
        let originalFileIds = uploadFiles.map((each: any) => each?.id) || [];

        payload.retention_trust_certificate_attachment_ids = [
          ...fileIds,
          ...originalFileIds,
        ];
        let makeUploadPayload = {
          fileAttachmentOrDocumentType: "Retention trust certificate",
          data: {
            bank_account_id: payload.bank_account_id,
            retention_trust_certificate_attachment_ids:
              payload.retention_trust_certificate_attachment_ids,
          },
        };

        await UpdateFileAttachmentsOrDocuments(makeUploadPayload);
      }

      if (isEditable) {
        setLoaderInfo("Updating bank account...");
        if (
          BankAccountType === "Cash Account" &&
          triggerBtnStatus !== "completed"
        ) {
          payload.status = "Open";
        } else if (
          triggerBtnStatus === "completed" &&
          BankAccountType !== "Cash Account"
        ) {
          payload.status = "Open";
        }

        let modifiedPayload = {
          ...payload,
          bank_account_id: editData.bank_account_id,
          apca_number: +formik?.values?.apca_number,
        };

        const response = await EditDetailsOfABankAccount(
          modifiedPayload,
          "This bank account has been updated"
        );
        setLoaderInfo("");

        if (response) {
          const { notice_previews = [], qbcc_notice_previews = [] } =
            response?.notices || {};

          if (triggerBtnStatus === "completed") {
            if (
              (planName !== "Basic" && values?.DelegateStatus === "Yes") ||
              isFree
            ) {
              // if (planName !== "Basic" && values?.DelegateStatus === "Yes") {
              if (
                notice_previews.length > 0 ||
                qbcc_notice_previews.length > 0
              ) {
                setNoticeFiles(notice_previews.map((n: any) => n.file_details));
                setNoticeMailUuids(
                  notice_previews.map((n: any) => n.mail_uuid)
                );
                setQbccNoticeFiles(
                  qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
                );
                setQbccNoticeUuids(
                  qbcc_notice_previews.map((n: any) => n.notice_uuid)
                );
                setShowNoticePopup(true);
                return;
              }
              if (syncId) {
                handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
              } else {
                handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
              }
              return;
            } else {
              if (planName === "Basic" && notice_previews.length > 0) {
                handleRoute(AppRoutes.USER_NOTICES);
                return;
              } else {
                if (syncId) {
                  handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
                } else {
                  handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
                }
                return;
              }
            }
          } else if (
            BankAccountType === "Retention Trust Account" &&
            editData?.status === "Open" &&
            projectArraysCompare(
              editData?.project_ids,
              modifiedPayload?.project_ids
            )
          ) {
            if (planName === "Basic" && notice_previews.length > 0) {
              handleRoute(AppRoutes.USER_NOTICES);
              return;
            } else {
              if (syncId) {
                handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
              } else {
                handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
              }
              return;
            }
          } else {
            if (syncId) {
              handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
            } else {
              handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
            }
            return;
          }
        } else {
          if (syncId) {
            handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
          } else {
            handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
          }
          setLoader(false);
        }
      } else {
        setLoaderInfo("Saving bank account...");

        if (BankAccountType !== "Cash Account") {
          payload.status = triggerBtnStatus === "save" ? "Draft" : "Open";
          let response;
          if (ErrorCode === "SCHEDULER_BANK_MISSING_FIELDS") {
            // 🔁 Special case: call the scheduler API
            response = await CreateOrUpdateAccountInPaytrade(
              {
                syncId,
                accountId: xeroAccountId,
                companyId: selectedCompanyId,
                accountStatus: xeroAccountStatus,
                payload,
              },
              "This bank account has been added."
            );
          } else {
            if (syncId) {
              response = await CreateAccountInPaytrade(
                {
                  syncId,
                  accountId: xeroAccountId,
                  companyId: selectedCompanyId,
                  payload,
                },
                "This bank account has been added."
              );
            } else {
              response = await AddBankAccount(
                payload,
                "This bank account has been added."
              );
            }
          }
          setLoaderInfo("");

          if (response) {
            const { notice_previews = [], qbcc_notice_previews = [] } =
              response?.notices || {};

            if (triggerBtnStatus === "completed") {
              if (
                (planName !== "Basic" && values?.DelegateStatus === "Yes") ||
                isFree
              ) {
                // if (planName !== "Basic" && values?.DelegateStatus === "Yes") {
                if (
                  notice_previews.length > 0 ||
                  qbcc_notice_previews.length > 0
                ) {
                  setNoticeFiles(
                    notice_previews.map((n: any) => n.file_details)
                  );
                  setNoticeMailUuids(
                    notice_previews.map((n: any) => n.mail_uuid)
                  );
                  setQbccNoticeFiles(
                    qbcc_notice_previews.map((n: any) => n.qbcc_file_details)
                  );
                  setQbccNoticeUuids(
                    qbcc_notice_previews.map((n: any) => n.notice_uuid)
                  );
                  setShowNoticePopup(true);
                  return;
                }
                if (syncId) {
                  handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
                } else {
                  await checkXeroAndRoute(response?.bank_account_id, AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
                }
                return;
              } else {
                if (planName === "Basic" && notice_previews.length > 0) {
                  handleRoute(AppRoutes.USER_NOTICES);
                  return;
                } else {
                  if (syncId) {
                    handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
                  } else {
                    await checkXeroAndRoute(response?.bank_account_id, AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
                  }
                  return;
                }
              }
            } else {
              if (syncId) {
                handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
              } else {
                await checkXeroAndRoute(response?.bank_account_id, AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
              }
              return;
            }
          } else {
            setLoader(false);
            return;
          }
        } else {
          let response;
          if (ErrorCode === "SCHEDULER_BANK_MISSING_FIELDS") {
            response = await CreateOrUpdateAccountInPaytrade(
              {
                syncId,
                accountId: xeroAccountId,
                companyId: selectedCompanyId,
                accountStatus: xeroAccountStatus,
                payload,
              },
              "This bank account has been added."
            );
          } else {
            if (syncId) {
              response = await CreateAccountInPaytrade(
                {
                  syncId,
                  accountId: xeroAccountId,
                  companyId: selectedCompanyId,
                  payload,
                },
                "This bank account has been added."
              );
            } else {
              response = await AddBankAccount(
                payload,
                "This bank account has been added."
              );
            }
          }
          setLoaderInfo("");
          if (response) {
            if (syncId) {
              handleRoute(AppRoutes.USER_SYNC_LOG + syncId);
            } else {
              await checkXeroAndRoute(response?.bank_account_id, AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
            }
            return;
          } else {
            setLoader(false);
            return;
          }
        }
      }

      setLoader(false);
    } catch {
      setLoader(false);
    } finally {
      return true;
    }
  }

  function handleViewFileFromPath(filePath: string, fileName: string) {
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

    if (success) {
      cleanupNoticePopup();
      handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
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

    if (success) {
      cleanupNoticePopup();
      handleRoute(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
      return true;
    }

    return false;
  };

  // Common cleanup (avoid repeating)
  const cleanupNoticePopup = () => {
    setShowNoticePopup(false);
    setLoader(false);
    setLoaderInfo("");
    setNoticeFiles([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
    setNoticeMailUuids([]);
  };

  const checkXeroAndRoute = async (
    bankAccountId: number,
    targetRoute: string
  ) => {
    try {
      const xeroDetails = await getXeroDetailsForCompany();
      if (
        xeroDetails?.integration_status === "Connected - active" &&
        xeroDetails?.pt_to_xero_bank_auto_create === true
      ) {
        setPendingXeroBankId(bankAccountId);
        setPendingRoute(targetRoute);
        setShowXeroConfirm(true);
        setLoader(false);
        return;
      }
    } catch {}
    handleRoute(targetRoute);
  };

  const handleXeroConfirmYes = async () => {
    if (!pendingXeroBankId) return;
    setXeroCreating(true);
    await CreateBankAccountsInXero({ bankAccountId: pendingXeroBankId });
    setXeroCreating(false);
    setShowXeroConfirm(false);
    handleRoute(pendingRoute || AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
  };

  const handleXeroConfirmNo = async () => {
    if (pendingXeroBankId) {
      await skipXeroAutoCreate(pendingXeroBankId);
    }
    setShowXeroConfirm(false);
    handleRoute(pendingRoute || AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
  };

  const handleXeroConfirmDismiss = () => {
    setShowXeroConfirm(false);
    handleRoute(pendingRoute || AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
  };

  async function handleDelegateStatus(selectedOption: any) {
    if (selectedOption.value === "Yes") {
      try {
        setLoader(true);
        setLoaderInfo("Checking subscription...");

        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        // 🔥 FREE PLAN → ALWAYS ALLOW (no popup, no restriction)
        const isFreePlanEligible =
          subscriptionResponse?.is_free_plan_eligible === true;

        if (isFreePlanEligible) {
          formik.handleChange("DelegateStatus")(selectedOption?.value);
          setLoader(false);
          setLoaderInfo("");
          setIsFree(isFreePlanEligible);
          return;
        }
        // -----------------------------
        // 🔹 NORMAL DELEGATE AUTHORITY CHECK
        // -----------------------------
        const delegateItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Delegate authority"
          ) || null;

        if (delegateItem) {
          if (delegateItem.limit_value === "true") {
            // ✅ Allowed → update formik value
            formik.handleChange("DelegateStatus")(selectedOption?.value);
          } else {
            // 🚨 Item exists but not allowed
            setModalHeading("Upgrade Subscription");
            setModalBodyContent(
              "Your current subscription does not allow delegate authority. Please upgrade your plan to enable this feature."
            );
            setOpenModal(true);
          }
        } else {
          // 🚨 Item missing → special message
          setModalHeading("Upgrade Subscription");
          setModalBodyContent(
            "If you wish Pay Trade to submit your notices automatically to the QBCC, please upgrade your subscription."
          );
          setOpenModal(true);
        }
      } catch (error) {
        console.error("Error checking Delegate authority subscription:", error);
        setModalHeading("Error");
        setModalBodyContent(
          "We were unable to verify your subscription. Please try again."
        );
        setOpenModal(true);
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    } else {
      // If "No" selected → just update formik
      formik.handleChange("DelegateStatus")(selectedOption?.value);
    }
  }

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

      if (filesExceedSize && filesToUpload?.length <= 5) {
        //Handle when file size exceeds maximum size
        setSelectedFileError(FileErrors.MAX_ALLOWED_FILE_SIZE_5MB);

        fileInputRef.current.value = "";
        return;
      } else if (
        filesToUpload?.length + retentionFiles?.length + uploadFiles?.length >
        5
      ) {
        setSelectedFileError(FileErrors.MAX_FILE_COUNT);
        return;
      } else {
        setSelectedFileError("");
        const existingFiles = retentionFiles?.length ? retentionFiles : [];

        let selectedFiles: any = [];
        if (filesToUpload?.length === 1) {
          selectedFiles = [
            ...existingFiles,
            { keyId: generateUniqueId(), file: filesToUpload[0] },
          ];
        } else {
          selectedFiles = filesToUpload.map((x: any) => {
            return { keyId: generateUniqueId(), file: x };
          });
        }
        setRetentionFiles(selectedFiles);
      }
    }
  }

  function handleDeleteFiles(fileObj: any) {
    if (fileObj?.keyId) {
      setRetentionFiles(() =>
        retentionFiles.filter((x: any) => x?.keyId !== fileObj?.id)
      );
    } else {
      setUploadedFiles(
        () => uploadFiles.filter((x: any) => x?.id !== fileObj?.id) || []
      );
    }

    fileInputRef.current.value = "";
    if (selectedFileError) {
      setSelectedFileError("");
    }
  }

  function RenderBankOptionsTypeSwitch() {
    switch (selectedBankType) {
      case "Cash Account":
        return <></>;
      case "Project Trust Account":
        return (
          <>
            <FormikControl
              control={InputType.SELECT}
              label={"Project"}
              secondLabel={isEditable ? undefined : "Add project"}
              onSecondLabelClick={() =>
                handleAddQuickRecord(
                  `${AppRoutes.USER_ADD_PROJECTS}?quick-add=${quickAddRoutes.PROJECT}`
                )
              }
              name={"ProjectName"}
              value={formik.values?.ProjectName}
              options={projectOpt}
              renderKey="label"
              valueKey="value"
              placeholder="Select the Project"
              error={formik.errors?.ProjectName}
              showError={
                formik.touched.ProjectName && formik.errors.ProjectName
              }
              required
              onChange={(selectedOption: any) =>
                handleProjectAccChange(selectedOption)
              }
              returnSelectedObject
              disabled={
                editData?.status === "Open" ||
                complianceOverviewData?.addBankAccount ||
                complianceOverviewData?.editBankAccount ||
                quickAddRecord == quickAddRoutes.PTA_ACCOUNT
              }
              onBlur={formik.handleBlur("ProjectName")}
            />

            <FormikControl
              control={InputType.SELECT}
              label={"Client"}
              secondLabel={isEditable ? undefined : "Add client"}
              onSecondLabelClick={() =>
                handleAddQuickRecord(
                  `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?quick-add=${quickAddRoutes.CLIENT}`
                )
              }
              name={"ClientName"}
              value={formik.values?.ClientName}
              options={clientListOpt}
              renderKey="label"
              valueKey="value"
              placeholder="Select the client"
              error={formik.errors?.ClientName}
              showError={formik.touched.ClientName && formik.errors.ClientName}
              onChange={(selectedOption: any) =>
                handleClientChange(selectedOption)
              }
              disabled={editData?.status === "Open"}
              onBlur={formik.handleBlur("ClientName")}
              returnSelectedObject
              required
            />

            <label>
              <small>
                Contract details <span className="required">*</span>
              </small>
            </label>
            <button
              className="secondary"
              onClick={() => setDisplayContractForms(true)}
            >
              {"Input contract summary for TA1"}
            </button>
            {formik.errors.headContractId && (
              <div>
                <small className="invalid">
                  <i className="fa-light fa-circle-xmark"></i>
                  {/* Icon for the error message */}
                  {formik?.errors?.headContractId}
                </small>
              </div>
            )}
            <br />
            <br />
          </>
        );
      case "Retention Trust Account":
        return (
          <>
            {" "}
            <label>
              <small>
                Project <span className="required">*</span>
              </small>
            </label>
            <button
              className="secondary mb_0_5"
              onClick={() => setDisplayRetentionGrid(true)}
            >
              {formik?.values?.MultiProjects || "Add a Project"}
            </button>
            {formik?.touched?.MultiProjects &&
              formik?.errors?.MultiProjects && (
                <div>
                  <small className="invalid ">
                    <i className="fa-light fa-circle-xmark"></i>
                    {/* Icon for the error message */}
                    {formik?.errors?.MultiProjects}
                  </small>
                </div>
              )}
            {selectedProjects?.length > 0 && (
              <DynamicTable
                headers={bankProjectGridHeaders}
                gridData={
                  [...projectOpt, ...archivedProjectOpt]?.filter((x: any) =>
                    selectedProjects.includes(x?.value)
                  ) || []
                }
                renderRowList={projectRenderData}
              />
            )}
            <br />
            <Fragment>
              <div>
                <small>Retention Trust Training</small>
                <small style={{ display: "block", color: "#888", fontStyle: "italic", marginTop: "2px" }}>
                  Note: Retention trust training is no longer legally compulsory.
                </small>
              </div>
              <input
                type="file"
                multiple={true}
                onChange={onFileChange}
                accept={`${uploadFile.pdf}, ${uploadFile.word}`}
                ref={fileInputRef}
                className="disable_default_file_name"
              />
              {selectedFileError && (
                <small className="invalid error_wrap">
                  <i className="fa-light fa-circle-xmark"></i>

                  {selectedFileError}
                </small>
              )}
              <br />

              {(retentionFiles?.length > 0 || uploadFiles?.length > 0) &&
                [...retentionFiles, ...uploadFiles].map((fileObj: any) => (
                  <Fragment key={fileObj?.id}>
                    <div className="pt_itemwithremove mb_1">
                      <span>{fileObj?.file?.name || fileObj?.file_name}</span>

                      <button
                        className="contrast smallbutton"
                        onClick={() => handleDeleteFiles(fileObj)}
                      >
                        <i
                          className="fa-light fa-xmark"
                          style={{ margin: 0 }}
                        ></i>
                      </button>
                    </div>
                  </Fragment>
                ))}
              <br />
            </Fragment>
          </>
        );
    }
  }

  function handleRouteFromCompliance() {
    const findTypeOfAccount: any = bankAccountTypes.find(
      (x: any) => x?.value === complianceOverviewData?.typeOfTrustAccount
    );
    if (findTypeOfAccount?.value) {
      formik.handleChange("BankAccountType")(findTypeOfAccount?.value);
      setSelectedBankType(findTypeOfAccount?.value);
    }
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    handleRoute();
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  function handleCancel(e: any) {
    e?.preventDefault();

    if (isEqual(initialPatchedValues, formik?.values)) {
      handleRoute();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  function handleSubscriptionUpgrade() {
    dispatch(
      setAddBankAccountDetails({
        haveAddedData: true,
        BankAccountType: formik?.values?.BankAccountType || "",
        AccountName: formik?.values?.AccountName || "",
        AccountNumber: formik?.values?.AccountNumber || "",
        BsbNumber: formik?.values?.BsbNumber || "",
        FinancialIns: formik?.values?.FinancialIns || "",
        Trustee: formik?.values?.Trustee || "",
        ProjectName: formik?.values?.ProjectName || "",
        ClientName: formik?.values?.ClientName || "",
        headContractId: formik?.values?.headContractId || "",
        DelegateStatus: formik?.values?.DelegateStatus || "No",
        MultiProjects: formik?.values?.MultiProjects || "",
        OpeningDate: formik?.values?.OpeningDate || "",
        associated_cash_account_id:
          formik?.values?.associated_cash_account_id || "",
        isAccountNumberExist: formik?.values?.isAccountNumberExist || false,
        contactDetailsData: contactDetailsData || {},
        selectedProjects: selectedProjects || [],
        files: retentionFiles,
        selectedFileNames: selectedFileNames,
      })
    );

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  }

  /**
   * Resets retained claims data in the global state.
   * Checks if there is any retained claims data from a subscription and clears it if present.
   */
  function resetRetainedBankData() {
    if (!_.isEmpty(retainedSubscriptionBankDetails)) {
      dispatch(setAddBankAccountDetails({}));
    }
  }

  function onRtaProjectChange() {
    let isNewProjectAdded = false;

    if (
      isEditable &&
      editData?.project_ids?.length > 0 &&
      selectedProjects?.length > 0
    ) {
      isNewProjectAdded = !selectedProjects.every((data: any) =>
        editData?.project_ids.includes(+data)
      );
    }

    return isNewProjectAdded;
  }

  async function handleAccountNumberChange(e: any) {
    const enteredValue = e?.target?.value;
    formik?.setFieldValue("AccountNumber", enteredValue);
    if (!enteredValue) {
      await formik?.setFieldError("Account number is required");
      await formik.setFieldValue("isAccountNumberExist", false);
      return; // Early return if field is empty
    }
    if (
      !isEditable ||
      (isEditable && enteredValue !== editData?.account_number)
    ) {
      setEnteredAccountNumber(enteredValue);
    }
  }

  async function handleAddQuickRecord(
    route: string,
    internalQuickAdd?: boolean
  ) {
    const postData = {
      haveAddedData: true,
      BankAccountType: formik?.values?.BankAccountType || "",
      AccountName: formik?.values?.AccountName || "",
      AccountNumber: formik?.values?.AccountNumber || "",
      BsbNumber: formik?.values?.BsbNumber || "",
      FinancialIns: formik?.values?.FinancialIns || "",
      Trustee: formik?.values?.Trustee || "",
      ProjectName: formik?.values?.ProjectName || "",
      ClientName: formik?.values?.ClientName || "",
      headContractId: formik?.values?.headContractId || "",
      DelegateStatus: formik?.values?.DelegateStatus || "No",
      MultiProjects: formik?.values?.MultiProjects || "",
      OpeningDate: formik?.values?.OpeningDate || "",
      associated_cash_account_id:
        formik?.values?.associated_cash_account_id || "",
      isAccountNumberExist: formik?.values?.isAccountNumberExist || false,
      contactDetailsData: contactDetailsData || {},
      selectedProjects: selectedProjects || [],
      files: retentionFiles,
      selectedFileNames: selectedFileNames,
      quickAddFromBankAccount: true,
    };
    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        if (internalQuickAdd) {
          formik.resetForm();
          onAccountTypeChange(bankAccountTypes[0]?.value);
        }
        router.push(route);
      } else {
        console.warn("Quick add failed, not redirecting", data);
      }
    } catch (err) {
      console.error("Quick add error:", err);
    }
  }

  function onAccountTypeChange(selectedValue: string) {
    formik?.setFieldValue("BankAccountType", selectedValue);

    setSelectedBankType(selectedValue);
  }

  function handleCashAccChange(selectedOption: any) {
    if (selectedOption == QUICK_ADD_RECORD_VALUE) {
      handleAddQuickRecord(
        `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=cashacc`,
        true
      );
    } else {
      formik.setFieldValue("associated_cash_account_id", selectedOption);
    }
  }

  function handleProjectAccChange(selectedOption: any) {
    formik.handleChange("ProjectName")(selectedOption?.value || "");
  }

  function handleClientChange(selectedOption: any) {
    if (selectedOption?.value == QUICK_ADD_RECORD_VALUE) {
      handleAddQuickRecord(
        `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?quick-add=client`
      );
    } else {
      formik.handleChange("ClientName")(selectedOption?.value || "");
    }
  }

  const handleConfirmDelegation = async () => {
    setIsConfirmed(true);
    await formik.setFieldValue("DelegateStatus", "Yes");
    formik.handleBlur("DelegateStatus");

    const responce = await handleFinalSubmit(
      { ...formik?.values, DelegateStatus: "Yes" },
      true
    ); // Submit after delay

    setDisplayDelegationModel(false); // Close modal after submission
    return responce;
  };

  function handleRoute(dynamicRoute?: string) {
    resetRetainedBankData();

    if (quickAddRecord) {
      if (quickAddRecord == quickAddOnRoute.CASH_ACC) {
        formik.resetForm();
        getAllBankAccounts();
        router.push(
          `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?retrieve-record=${quickAddOnRoute.PTA}`
        );
        getStoredBankAccountData();
      } else if (routePathStoredData?.quickAddFromAudit) {
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_ADD}?retrieve-record=${quickAddRoutes.RETRIEVE_AUDIT}`
        );
      } else if (routePathStoredData?.quickAddFromInterestAndCharges) {
        router.push(
          `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?bid=${routePathStoredData?.bid}&retrieve-record=${quickAddRoutes.RETRIEVE_INTEREST_AND_CHARGES}`
        );
      } else if (routePathStoredData?.quickAddFromReconciliation) {
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_ADD}?retrieve-record=${quickAddRoutes.RETRIEVE_RECONCILIATION}`
        );
      } else if (routePathStoredData?.quickAddFromContract) {
        if (routePathStoredData?.fromDraftContract) {
          // Draft: Return to contract page without retrieve-record
          router.push(
            `${AppRoutes.USER_EDIT_CONTRACTS}/${routePathStoredData?.id}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_ADD_CONTRACTS}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        }
      } else {
        router.back();
      }
    } else if (retrieveAfterAddingQuickRecord == quickAddOnRoute.PTA) {
      router.push(AppRoutes.USER_BANK_ACCOUNTS_CURRENT);
    } else if (overviewId && overviewProjectId) {
      router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewId}`);
    } else if (routedFrom) {
      if (routedFrom == "compliance") {
        router.push(
          `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${complianceProjectId}&tab=${tab}`
        );
      } else {
        router.back();
      }
    } else if (dynamicRoute) {
      router.push(dynamicRoute);
    } else {
      router.back(); // Send the user back to the previous page
    }

    setLoader(false);
    setLoaderInfo("");
  }

  return (
    <Fragment>
      <div className="pt_smallbgimage">
        <div className="pt_centered">
          <div className="pt_centeredinner">
            <div className="pt_box_transparent_cp">
              <div className="grid">
                <div className="pt_login">
                  <h4>Bank account information</h4>
                  <p>{`${
                    isEditable ? "Update" : "Add"
                  } your bank account information`}</p>
                  <br />

                  <FormikControl
                    control={InputType.SELECT}
                    label={"Type"}
                    name={"BankAccountType"}
                    options={
                      quickAddRecord == quickAddRoutes.PTA_RTA_ACCOUNT
                        ? auditAccounts
                        : bankAccountTypes
                    }
                    renderKey="label"
                    valueKey="value"
                    placeholder="Select account type"
                    error={formik.errors?.BankAccountType}
                    showError={
                      formik.touched.BankAccountType &&
                      formik.errors.BankAccountType
                    }
                    required
                    onChange={(selectedOption: any) => {
                      onAccountTypeChange(selectedOption?.value);
                    }}
                    disabled={
                      !!(
                        editData?.status === "Open" ||
                        complianceOverviewData?.addBankAccount ||
                        complianceOverviewData?.editBankAccount ||
                        isEditable ||
                        quickAddRecord == quickAddOnRoute.CASH_ACC ||
                        quickAddRecord == quickAddRoutes.RTA_ACCOUNT ||
                        quickAddRecord == quickAddRoutes.PTA_ACCOUNT
                      )
                    }
                    onBlur={formik.handleBlur("BankAccountType")}
                    value={formik.values?.BankAccountType}
                    returnSelectedObject
                  />

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Account name"}
                    name={"AccountName"}
                    placeholder="Add account name"
                    error={formik.errors?.AccountName}
                    maxLength={100}
                    showError={
                      formik.touched.AccountName && formik.errors.AccountName
                    }
                    disabled={isEditable}
                    required
                    onChange={(e: any) =>
                      formik?.setFieldValue("AccountName", e?.target?.value)
                    }
                    onBlur={formik.handleBlur("AccountName")}
                    value={formik.values?.AccountName}
                  />

                  <FormikControl
                    control={InputType.SELECT}
                    label={"Financial institution"}
                    name={"FinancialIns"}
                    value={formik.values?.FinancialIns}
                    options={financialInstituteOpt}
                    renderKey="label"
                    valueKey="value"
                    placeholder="Select financial institution"
                    error={formik.errors?.FinancialIns}
                    showError={
                      formik.touched.FinancialIns && formik.errors.FinancialIns
                    }
                    required
                    onChange={handleSelectedFinInstitution}
                    returnSelectedObject
                    disabled={
                      !editData?.financial_institution
                        ? false
                        : editData?.status === "Open" || isEditable
                    }
                    onBlur={formik.handleBlur("FinancialIns")}
                  />

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Account number"}
                    name={"AccountNumber"}
                    placeholder="Account number"
                    error={formik.errors?.AccountNumber}
                    disabled={
                      editData?.status === "Open" || accountNumberLength === 0
                    }
                    maxLength={accountNumberLength}
                    showError={
                      formik.touched.AccountNumber &&
                      formik.errors.AccountNumber
                    }
                    required
                    onChange={handleAccountNumberChange}
                    onBlur={formik.handleBlur("AccountNumber")}
                    value={formik.values?.AccountNumber}
                  />

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"BSB number"}
                    name={"BsbNumber"}
                    placeholder="BSB number"
                    error={formik.errors?.BsbNumber}
                    maxLength={6}
                    showError={
                      formik.touched.BsbNumber && formik.errors.BsbNumber
                    }
                    disabled={!editData?.bsb_number ? false : isEditable}
                    required
                    onChange={(e: any) => {
                      let number = e?.target?.value.trim();
                      if (NUMBER_REGEX.test(number) || number === "") {
                        formik.setFieldValue("BsbNumber", number);
                      }
                    }}
                    onBlur={formik.handleBlur("BsbNumber")}
                    value={formik.values?.BsbNumber}
                  />

                  {isEditable && (
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"APCA number"}
                      name={"apca_number"}
                      placeholder="APCA number"
                      value={formik.values?.apca_number}
                      maxLength={6}
                      onChange={(e: any) => {
                        let number = e?.target?.value.trim();

                        if (NUMBER_REGEX.test(number) || number === "") {
                          formik.setFieldValue("apca_number", number);
                        }
                      }}
                      onBlur={formik.handleBlur("apca_number")}
                      showError={
                        formik.touched.apca_number && formik.errors.apca_number
                      }
                      error={formik.errors?.apca_number}
                    />
                  )}

                  {selectedBankType && selectedBankType !== "Cash Account" && (
                    <FormikControl
                      control={InputType.SELECT}
                      label={"Select cash account"}
                      secondLabel={isEditable ? "" : "Add cash account"}
                      onSecondLabelClick={() =>
                        handleAddQuickRecord(
                          `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=cashacc`,
                          true
                        )
                      }
                      name={"associated_cash_account_id"}
                      value={formik.values?.associated_cash_account_id}
                      options={cashAccounts || []}
                      renderKey="account_name"
                      valueKey="bank_account_id"
                      placeholder="Select account"
                      error={formik.errors?.associated_cash_account_id}
                      showError={
                        formik.touched.associated_cash_account_id &&
                        formik.errors.associated_cash_account_id
                      }
                      required
                      onChange={(selectedOption: any) =>
                        handleCashAccChange(selectedOption)
                      }
                      disabled={editData?.status === "Open" || isEditable}
                      onBlur={formik.handleBlur("associated_cash_account_id")}
                    />
                  )}
                  <FormikControl
                    control={InputType.DATE_PICKER}
                    label={"Opening date"}
                    name={"OpeningDate"}
                    error={formik.errors.OpeningDate}
                    showError={
                      formik.touched.OpeningDate && formik.errors.OpeningDate
                    }
                    required
                    onChange={(selectedDate: any) =>
                      formik.setFieldValue("OpeningDate", selectedDate)
                    }
                    disabled={
                      !editData?.opening_date
                        ? false
                        : editData?.status === "Open" || isEditable
                    }
                    onBlur={formik.handleBlur("OpeningDate")}
                    value={formik.values.OpeningDate}
                    maxDate={getDatePickerFormat()}
                  />

                  {selectedBankType && selectedBankType !== "Cash Account" && (
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"Trustee"}
                      name={"Trustee"}
                      placeholder="BSB Number"
                      error={formik.errors?.Trustee}
                      showError={
                        formik.touched.Trustee && formik.errors.Trustee
                      }
                      required
                      disabled
                      onBlur={formik.handleBlur("Trustee")}
                      value={formik.values?.Trustee}
                    />
                  )}

                  {RenderBankOptionsTypeSwitch()}

                  {selectedBankType && (
                    <FormikControl
                      control={InputType.SELECT}
                      label={"Delegate powers"}
                      name={"DelegateStatus"}
                      value={formik.values?.DelegateStatus}
                      options={DelegateOptions}
                      renderKey="label"
                      valueKey="value"
                      placeholder="Select delegated powers"
                      error={formik.errors?.DelegateStatus}
                      showError={
                        formik.touched.DelegateStatus &&
                        formik.errors.DelegateStatus
                      }
                      required
                      onChange={handleDelegateStatus}
                      returnSelectedObject
                      onBlur={formik.handleBlur("DelegateStatus")}
                    />
                  )}

                  <br />
                  <br />
                  <br />

                  <CustomButton
                    actionType="submit"
                    buttonType={buttonType.SECONDARY}
                    buttonName={isEditable ? "Update" : "Save"}
                    onClick={() => {
                      formik?.handleSubmit();
                      setTriggerBtnStatus("save");
                    }}
                    inputButton
                  />

                  {selectedBankType &&
                    selectedBankType !== "Cash Account" &&
                    (editData?.status === "Draft" ||
                      !editData?.status ||
                      onRtaProjectChange()) && (
                      <CustomButton
                        actionType="submit"
                        buttonType={buttonType.OUTLINE_SECONDARY}
                        buttonName={"Completed - send notices"}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          e.preventDefault();

                          setTriggerBtnStatus("completed");
                          formik?.handleSubmit();
                        }}
                        inputButton
                      />
                    )}

                  <CustomButton
                    actionType="button"
                    buttonType={buttonType.OUTLINE_CONTRAST}
                    buttonName={"Cancel"}
                    disabled={formik?.isSubmitting}
                    onClick={handleCancel}
                    inputButton
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {displayRetentionGrid && (
        <RetentionTrustGrid
          isDisplay={displayRetentionGrid}
          onClose={() => setDisplayRetentionGrid(false)}
          gridData={isEditable ? viewProjectsInEdit : projectOpt}
          selectedProjects={selectedProjects}
          onSubmit={(selectedRow: any) => setSelectedProjects(selectedRow)}
          // disable={quickAddRecord == quickAddRoutes.RTA_ACCOUNT}
        />
      )}

      {displayContractForms && (
        <ContractDetails
          isDisplay={displayContractForms}
          onClose={() => setDisplayContractForms(false)}
          formData={contactDetailsData}
          onSubmit={(formData: any) => setContactDetailsData(formData)}
          disabled={editData?.status === "Open"}
          isEditable={isEditable}
        />
      )}

      {openModal && (
        <BaseModal
          modalId={"upgrade Subscription"}
          displayModal={openModal}
          title={modalHeading}
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            handleSubscriptionUpgrade();
            return true;
          }}
          firstButtonName="Back"
          secondButtonName="Upgrade now"
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
      {openFinalModal && (
        <BaseModal
          // title="Upgrade subscription"
          title={modalHeading}
          modalId={"upgrade Subscription"}
          displayModal={openFinalModal}
          onHeaderIconClose={() => setOpenFinalModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setOpenFinalModal(false);
            // handleFinalSubmit(valuesForSubmit);
          }}
          onConfirm={() => {
            handleSubscriptionUpgrade();
            return true;
          }}
          firstButtonName="Close"
          secondButtonName="Upgrade now"
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
      {displayClosePageConfirmation && (
        <BaseModal
          modalId={"Payment confirmation"}
          displayModal={displayClosePageConfirmation}
          onClose={handlePageConfirmClose}
          onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
          onConfirm={handlePageConfirmSave}
          firstButtonName="Yes"
          secondButtonName="Save"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center"> Are you sure to close and not save?</h4>
        </BaseModal>
      )}
      {displayTrusteeNameWarning && (
        <BaseModal
          modalId={"Trustee Name Warning"}
          displayModal={displayTrusteeNameWarning}
          onClose={() => setDisplayTrusteeNameWarning(false)}
          onHeaderIconClose={() => setDisplayTrusteeNameWarning(false)}
          onConfirm={() => {
            handleFinalSubmit(formik?.values, true);
            setDisplayTrusteeNameWarning(false);
            return true;
          }}
          // hideSecondButton={Boolean(
          //   trusteeNameWarningMessage == trusteeWarningMessage.ON_NO_MATCHES
          // )}
          hideFirstButton={Boolean(
            trusteeNameWarningMessage == trusteeWarningMessage.ON_NO_MATCHES
          )}
          firstButtonName="No"
          // firstButtonName={
          //   trusteeNameWarningMessage == trusteeWarningMessage.ON_NO_MATCHES
          //     ? "Ok"
          //     : "No"
          // }
          // secondButtonName="Yes"
          secondButtonName={
            trusteeNameWarningMessage == trusteeWarningMessage.ON_NO_MATCHES
              ? "Ok"
              : "Yes"
          }
          restrictOncloseFunctionInHeader
        >
          <h4 className="">{trusteeNameWarningMessage}</h4>
        </BaseModal>
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={(e: any) => {
            if (e === true) {
              setDisplayDelegationModel(false);
              handleFinalSubmit(formik?.values);
            }
          }}
          // halfScreenPopup={true}
          secondButtonName="Set delegation YES"
          firstButtonName="Close"
          onConfirm={handleConfirmDelegation}
          onHeaderIconClose={() => {
            setDisplayDelegationModel(false);
          }}
          restrictOncloseFunctionInHeader
        >
          <p className="text_center">
            You need to authorize Pay Trade to act on your behalf to automate
            notices (also known as delegated authority). <br />
            For project trusts, this needs to be done on the QBCC portal. <br />
            Once done, you can confirm here, and we can issue notices on your
            behalf. <br />
            Do you want to enable it now?
          </p>
          <br />
          <p className="text_center">
            <span className="pt_yellow">Note:</span> On close your notices will
            not be sent automatically. Visit the notices pages to send manually.
          </p>
        </BaseModal>
      )}
      {displayStatusInfo && (
        <BaseModal
          modalId={"Status Confirmation"}
          displayModal={displayStatusInfo}
          onClose={() => setDisplayStatusInfo(false)}
          onConfirm={() => {
            setTriggerBtnStatus("");
            setTimeout(() => {
              handleFinalSubmit(formik?.values, true, true);
              setDisplayStatusInfo(false);
            });
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
        >
          <h4>
            {" "}
            This will save as draft. You won't be able to use this account in
            the system until marked as completed.
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
                    () => handleViewFileFromPath(file.file, file.file_name) // base64 PDF
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
                        handleViewFileFromPath(
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
      {showXeroConfirm && (
        <BaseModal
          modalId="xero-bank-create-confirm"
          displayModal={showXeroConfirm}
          onHeaderIconClose={handleXeroConfirmDismiss}
          restrictOncloseFunctionInHeader
          title="Create in Xero?"
          onClose={handleXeroConfirmNo}
          onConfirm={() => {
            handleXeroConfirmYes();
            return true;
          }}
          firstButtonName="No, skip"
          secondButtonName={xeroCreating ? "Creating..." : "Yes, create now"}
        >
          <h4 className="text_center">
            Your Xero integration is active with automatic bank account sync
            enabled. Would you like to create this bank account in Xero now?
          </h4>
          <p className="text_center" style={{ marginTop: "8px", color: "#666" }}>
            If you skip, you can still create it manually from the Xero Bank
            Accounts sync page. The automatic scheduler will not retry skipped
            accounts.
          </p>
        </BaseModal>
      )}
    </Fragment>
  );
}
