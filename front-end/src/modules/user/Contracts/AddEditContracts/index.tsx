"use client";

import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { useCustomDebounce, useTokenDetails } from "@/hooks";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  buttonType,
  DEBOUNCE_TIMER,
  InputType,
  quickAddRoutes,
} from "@/shared/constant/general";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  checkExistenceForContract,
  createContractInPaytradeFromXeroData,
  editContractDetailsById,
  getClientSupplierLists,
  getProjectsLists,
  insertContractDetails,
  TriggerContractNotices,
  viewContractDetailsById,
} from "../contracts.functions";
import * as Yup from "yup";
import { useFormik } from "formik";
import {
  formatDate,
  getCompanyIdFromStorage,
  getCurrentUtcTime,
} from "@/utils";
import { deleteAttachment, singleUploadApi } from "@/app/api/commonApi";
import { setAddContractDetails } from "@/redux/slices/dashboardSlices";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { showInfoToast } from "@/components/Toaster";
import _ from "lodash";
import CustomButton from "@/components/CustomButton/CustomButton";
import PaymentDetailsPage from "./PaymentDetails";
import UploadContract from "./UploadContract";
import BaseModal from "@/components/BaseModal";
import { ApiResponse } from "@/shared/constant/messages";
import {
  FetchAllBankAccounts,
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../../AddUpdateBankAccount/AddUpdateBankAccount.function";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  getSubscriptionDetailsByCompanyId,
  updateDelegatePowers,
} from "../../Subscriptions/subscriptions.function";
import { viewXeroSyncLog } from "../../UserIntegrations/integration.functions";

interface ProjectOption {
  value: string;
  label: string;
  project_role: string;
  project_id: number;
}

interface Option {
  value: string;
  label: string;
}

type VIEW_PAGE_TYPES =
  | "mainPage"
  | "PaymentDetailsPage"
  | "UploadContractsPage";

const AUTO_CLOSE_TIME = 30;

export default function AddEditContracts(props: any) {
  const { isEdit = false, ...rest } = props;
  const [paymentData, setPaymentData] = useState<any>({});
  const [uploadData, setUploadData] = useState<any>({});
  const [uploadvalues, setUploadValues] = useState<any>({});
  const [status, setstatus] = useState<any>("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);
  const [noticeEligible, SetNoticeEligible] = useState<boolean>(false);
  const [showPaymentModel, setShowPaymentModel] = useState<boolean>(false);
  const [showUploadModel, setShowUploadModel] = useState<boolean>(false);
  const [viewPages, setViewPages] = useState<VIEW_PAGE_TYPES>("mainPage");
  const [roleSelectedData, setRoleSelectedData] = useState<any>({});
  const [clientRoleSelectedData, setClientRoleSelectedData] = useState<any>();
  const [clientSupplierSelectedData, setClientSupplierSelectedData] =
    useState<any>();
  const [delegateAuthorityAllowed, setDelegateAuthorityAllowed] = useState<
    boolean | null
  >(null);
  const [projectSelectedData, setProjectSelectedData] = useState<any>();
  const [timeKey, setTimekey] = useState(new Date().getTime());
  const [retentionSelectedData, setRetentionSelectedData] = useState<any>(); // State for retention options
  const [selectedProjectID, setSelectedProjectId] = useState<number>();
  const [selectedRelatedEntity, setSelectedRelatedEntity] =
    useState<string>("");
  const [selectedClientSuplierType, setSelectedClientSuplierType] =
    useState<string>("");
  const [selectedClientSuplierID, setSelectedClientSuplierID] =
    useState<number>();
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [clientSupplierOptions, setClientSupplierOptions] = useState<any>([]);
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [contractData, setContractData] = useState<any>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [data, setData] = useState({});
  const [openPlanModal, setOpenPlanModal] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>("Basic"); // Example state, set accordingly
  const [delegatePlanName, setDelegatePlanName] = useState<string>(""); // Example state, set accordingly

  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [displayStatusInfo, setDisplayStatusInfo] = useState(false);
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);

  const [bankAccountsOptions, setBankAccountsOptions] = useState<
    { label: string; value: number }[]
  >([]);

  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);
  const [multiSelectedData, setMultiSelectedData] = useState<
    { label: string; value: number }[]
  >([]);

  const [isAllSelected, setIsAllSelected] = useState(false);

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const progressPercent =
    ((AUTO_CLOSE_TIME - timeLeft) / AUTO_CLOSE_TIME) * 100;
  const [lastInsertedContractId, setLastInsertedContractId] = useState(null);
  const [lastInsertedClientSupplierType, setLastInsertedClientSupplierType] =
    useState(null);
  const [syncLogData, setSyncLogData] = useState<any>("");

  const complianceOverviewData: any = useAppSelector(
    (state: any) => state?.complianceOverview?.timeLineData
  );

  const { loader, setLoader, setLoaderInfo }: any = useLoaderContext();
  const params = useParams();
  const queryParams: any = useSearchParams();
  const quickAddRecord: any = queryParams.get("quick-add");
  const overviewId = queryParams.get("overview");

  const overviewProjectId = queryParams.get("projectid");
  const overviewProjectname = queryParams.get("projectname");
  const overviewProjectrole = queryParams.get("projectrole");
  const rawProjectId = queryParams.get("proj_id");
  const syncId = queryParams.get("syncId");
  const QuickProjectId = rawProjectId?.trim() || null;
  const isProjectPreselected =
    QuickProjectId !== null &&
    QuickProjectId !== "" &&
    !isNaN(Number(QuickProjectId)) &&
    Number(QuickProjectId) > 0;

  const dispatch = useAppDispatch();
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const router = useRouter();

  const addContractDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addContractDetails
  );

  const disableCondition =
    isEdit && contractData?.contract_status === "In Progress";

  const isValidUploadValue = (value: unknown): boolean => {
    if (value == null) return false;
    if (value instanceof Date && value.getTime() === 0) return false;
    return true;
  };
  const isValidSelectedFile = (file: unknown): boolean => {
    if (!file) return false;
    if (typeof file === "string") {
      return file.startsWith("data:"); // base64 check
    }
    if (file instanceof File) {
      return true;
    }
    return false;
  };

  const isUploadDataPresent: boolean =
    (uploadvalues &&
      Object.values(uploadvalues as Record<string, unknown>).some(
        isValidUploadValue
      )) ||
    isValidSelectedFile(uploadData?.selectedFile);

  const uploadButtonName: string =
    (isEdit &&
      contractData?.contract_status === "Draft" &&
      isUploadDataPresent) ||
    (!isEdit && isUploadDataPresent) ||
    (isEdit &&
      contractData?.contract_status === "In Progress" &&
      isUploadDataPresent)
      ? "Contract attachments added"
      : "Please upload your signed contract";

  const isNoticeSent = contractData?.notice_generated;

  const MakePaymentReset = () => {
    setPaymentData({});
    formik.setFieldValue("PaymentDetails", null);
  };

  function resetRetainedContractData() {
    if (!_.isEmpty(addContractDetails)) {
      dispatch(setAddContractDetails({}));
    }
  }

  const companyId: any =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("companyId"))
      : null;

  const roleOptions = [
    { value: "Head Contractor", label: "Head Contractor" },
    { value: "Principal", label: "Principal" },
    {
      value: "Related Entity Sub Contractor",
      label: "Related Entity Subcontractor",
    },
    { value: "Sub Contractor", label: "Subcontractor" },
  ];

  const retentionOptions = [
    {
      value: "Bank guaranteed",
      label: "Bank guaranteed",
    },
    { value: "Cash", label: "Cash" },
    { value: "None", label: "None" },
  ];

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        const delegateItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Delegate authority"
          ) || null;

        const isAllowed =
          delegateItem &&
          String(delegateItem.limit_value).toLowerCase() === "true";
        setDelegateAuthorityAllowed(!!isAllowed);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setDelegateAuthorityAllowed(false); // fail-safe
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    };

    fetchSubscription();
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
    if (delegatePlanName !== "" && delegatePlanName !== "Basic") {
      getFetchBankAccountsLists();
    }
  }, [delegatePlanName, paymentData, contractData]);

  useEffect(() => {
    if (
      QuickProjectId &&
      !formik.values.ProjectName &&
      Array.isArray(projectOptions) &&
      projectOptions.length > 0
    ) {
      const matchingProject = projectOptions.find(
        (proj: any) => String(proj.project_id) === String(QuickProjectId)
      );

      if (matchingProject) {
        handleProjectChange(matchingProject.value);
      }
    }
  }, [QuickProjectId, projectOptions]);

  // Modify the value passed to the dropdown
  const displayedOptions = isAllSelected
    ? [{ label: "All", value: -1 }]
    : multiSelectedData;

  const handleSelectChange = (
    selectedOptions: { label: string; value: number }[] | null
  ) => {
    if (!selectedOptions) {
      setMultiSelectedData([]);
      setIsAllSelected(false);
      return;
    }

    const isSelectAllSelected = selectedOptions.some((opt) => opt.value === -1);

    if (isSelectAllSelected) {
      setMultiSelectedData(
        bankAccountsOptions.filter((opt) => opt.value !== -1)
      );
      setIsAllSelected(true);
    } else {
      setMultiSelectedData(selectedOptions);
      setIsAllSelected(false);
    }
  };

  async function getFetchBankAccountsLists() {
    const postData = {
      account_type: "Retention Trust Account, Project Trust Account",
      company_id: getCompanyIdFromStorage(),
      items_per_page: null,
      page: null,
      search: null,
      status: null,
      sorting_field: "",
      sorting_order: "",
      delegate_powers: "No",
    };
    const response = await FetchAllBankAccounts(postData);

    if (response?.extendedBankAccounts?.length > 0) {
      // Extract bank accounts from paymentData (for new contracts)
      const newBankAccountIds: string[] = [
        paymentData?.PaymentToAccount,
        paymentData?.PaymentFromAccount,
        paymentData?.RetentionFromAccount,
      ].filter((id): id is string => Boolean(id)); // Remove null/undefined

      // Extract bank accounts from contractData (for editing existing contracts)
      const existingBankAccountIds: string[] = isEdit
        ? [
            contractData?.payment_to_account,
            contractData?.payment_from_account,
            contractData?.retention_from_account,
          ].filter((id): id is string => Boolean(id))
        : [];

      // Merge both lists while ensuring unique values
      const validBankAccountIds = Array.from(
        new Set([...newBankAccountIds, ...existingBankAccountIds].map(Number)) // Convert all values to numbers
      );

      // Filter response to match valid bank accounts
      const matchedAccounts = response.extendedBankAccounts.filter(
        (account: { bank_account_id: any }) =>
          validBankAccountIds.includes(account.bank_account_id) // Convert to string for comparison
      );

      // If matches exist, set all accounts; otherwise, set an empty array
      const options =
        matchedAccounts.length > 0
          ? response.extendedBankAccounts.map(
              (account: {
                account_name: string;
                bank_account_id: string | number;
              }) => ({
                label: account.account_name,
                value: account.bank_account_id,
              })
            )
          : [];

      // Add "Select All" if there are multiple accounts
      const updatedOptions =
        options.length > 1
          ? [{ label: "Select All", value: -1 }, ...options]
          : options;

      setBankAccountsOptions(updatedOptions);
    } else {
      setBankAccountsOptions([]); // Set empty if no match
    }
  }

  const handleUpdateDelegatePowers = async () => {
    if (!multiSelectedData.length) {
      // alert("Please select at least one bank account.");
      return;
    }

    const selectedBankAccountIds = multiSelectedData.map(
      (account) => account.value
    );
    const payload = {
      account_ids: selectedBankAccountIds,
      company_id: getCompanyIdFromStorage(),
    };
    try {
      setLoader(true); // Show loader while calling API
      const response = await updateDelegatePowers(payload);
      if (response) {
        getFetchBankAccountsLists();
        setDisplayDelegationModel(false); // Close modal on success
        setstatus("completed");
        formik?.handleSubmit();
        return true;
      } else {
        console.warn("Failed to update delegate powers. Please try again.");
      }
    } catch {
    } finally {
      setLoader(false); // Hide loader
    }
  };

  useEffect(() => {
    if (
      (addContractDetails && Object.keys(addContractDetails).length > 0) ||
      routePathStoredData?.quickAddFromContract ||
      (isEdit && routePathStoredData?.fromDraftContract)
    ) {
      const formValues = addContractDetails?.ContractName
        ? addContractDetails
        : routePathStoredData;
      formik.setValues({
        ContractName: formValues?.ContractName || "",
        ClientSupplier: formValues?.ClientSupplier || "",
        ClientSupplierRole: formValues?.ClientSupplierRole || "",
        ProjectName: formValues?.ProjectName || "",
        RetentionType: formValues?.RetentionType || "",
        PaymentTerms: formValues?.PaymentTerms || "",
        InitialContractSum: formValues?.InitialContractSum || "",
        modifiedInitialContractSum:
          formValues?.modifiedInitialContractSum || "",
        Upload: formValues?.Upload || "",
        ProjectRole: formValues?.ProjectRole || "",
        RelatedEntity: formValues?.RelatedEntity || "",
        PaymentDetails: {
          PaymentFromAccount:
            formValues?.PaymentDetails?.PaymentFromAccount || null,
          RetentionFromAccount:
            formValues?.PaymentDetails?.RetentionFromAccount || null,
          PaymentToAccount:
            formValues?.PaymentDetails?.PaymentToAccount || null,
        },
      });

      // Populate dropdowns and related fields
      dropdownData(
        formValues?.ClientSupplierRole,
        roleOptions,
        setClientRoleSelectedData
      );
      dropdownData(
        formValues?.RetentionType,
        retentionOptions,
        setRetentionSelectedData
      );

      setSelectedClientSuplierID(formValues?.ClientSupplyId);
      setSelectedProjectId(formValues?.ReduxProjectId);
      setSelectedClientSuplierType(formValues?.ClientOrSupplier || "");
      let clientOpts =
        clientSupplierOptions.find(
          (each: any) => each.value === formValues?.ClientSupplier
        ) || {};
      setClientSupplierSelectedData(
        Object.keys(clientOpts).length ? clientOpts : null
      );
      let projectOpts =
        projectOptions.find(
          (each: any) => each.value === formValues?.ProjectName
        ) || {};
      setProjectSelectedData(
        Object.keys(projectOpts).length ? projectOpts : null
      );

      // Set payment data
      setPaymentData({
        PaymentFromAccount:
          formValues?.PaymentDetails?.PaymentFromAccount || null,
        RetentionFromAccount:
          formValues?.PaymentDetails?.RetentionFromAccount || null,
        PaymentToAccount: formValues?.PaymentDetails?.PaymentToAccount || null,
      });

      setUploadValues({
        ContractStartDate: formValues?.ContractDate,
        DefectLiabilityEndDate: formValues?.DefectDate,
      });
      setUploadData(formValues?.ReduxFile);
      setShowPaymentModel(formValues?.displayPaymentDetails ?? false);
    }
  }, [
    addContractDetails,
    clientSupplierOptions,
    projectOptions,
    isEdit,
    routePathStoredData,
  ]);

  useEffect(() => {
    getSyncLogData();
  }, [syncId]);

  async function getSyncLogData() {
    const data = await viewXeroSyncLog({
      viewXeroSyncLogId: syncId,
    });
    formik.setFieldValue("ContractName", data?.api_payload?.contract_name);
    setSyncLogData(data);
  }

  useEffect(() => {
    if (overviewId && overviewProjectname) {
      setProjectSelectedData({
        value: overviewProjectname,
        label: overviewProjectname,
      });
      formik.setFieldValue("ProjectName", overviewProjectname);

      formik.setFieldValue("ProjectRole", overviewProjectrole);
      setSelectedProjectId(Number(overviewProjectId));
    }
  }, [overviewId]);

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && companyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const planName = subscription?.plan_name;

      setPlanName(planName); // Assuming setPlanName exists to store the plan name
      setDelegatePlanName(planName);
    }
  }, [companyId]);

  useEffect(() => {
    initialInvoke();
    if (
      retrieveAfterAddingQuickRecord == quickAddRoutes.CONTRACT ||
      quickAddRecord
    ) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        const postData = {
          companyId: Number(localStorage.getItem("companyId")),
          contractName: debouncedSearchTerm.trim(),
          clientSupplierType: selectedClientSuplierType || "",
        };

        // Check data existence using verifyClientSuppliersExistence
        const response = await checkExistenceForContract(postData);

        // Update error field based on existence check results
        if (response?.length > 0) {
          const nameExists = response?.length > 0;

          // Update Formik state
          await formik.setFieldValue("isContractNameExist", nameExists);
        } else {
          await formik.setFieldValue("isContractNameExist", false);
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
    if (
      Object.keys(uploadvalues).length > 0 &&
      uploadData?.selectedFile != null
    ) {
      formik.setFieldValue("Upload", "Contract attachments added");
    } else {
      formik.setFieldValue("Upload", null);
    }
  }, [uploadData]);

  // Utility function to check if an object is empty
  const isEmptyObject = (obj: any) => {
    return Object.keys(obj || {}).length === 0;
  };

  useEffect(() => {
    (async () => {
      setLoader(true);
      if (isEmptyObject(addContractDetails) && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const userData = await viewContractDetailsById(payload);
        if (userData) {
          setContractData(userData);
          const RTA = "Retention Trust Account";
          const PTA = "Project Trust Account";
          if (
            userData?.payment_from_account_type === RTA ||
            userData?.payment_from_account_type === PTA ||
            userData?.payment_to_account_type === RTA ||
            userData?.payment_to_account_type === PTA ||
            userData?.retention_from_account_type === RTA ||
            userData?.retention_from_account_type === PTA
          ) {
            SetNoticeEligible(true);
          } else {
            SetNoticeEligible(false);
          }
        } else {
          setWorngIdCheck(true);
        }
      }
      setLoader(false);
    })();
  }, [isEdit, addContractDetails]);

  useEffect(() => {
    if (complianceOverviewData?.addContract && projectOptions?.length > 0) {
      const selectedProject = projectOptions.find(
        (data: any) => data?.project_id == complianceOverviewData?.referenceId
      );

      handleProjectChange(selectedProject);
    }
  }, [complianceOverviewData, projectOptions]);

  // Function to set selected data for role or retention
  const dropdownData = (
    selectedValue: string,
    optionsArray: Option[] | any,
    setterFunction: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const selectedOption = optionsArray.find(
      (opt: Option) => opt?.value === selectedValue
    );
    if (selectedOption) {
      setterFunction(selectedOption);
    } else {
      setterFunction("");
    }
  };

  useEffect(() => {
    // ✅ Skip this block if routePathStoredData has any keys
    if (routePathStoredData && Object.keys(routePathStoredData).length > 0) {
      return;
    }
    if (Object.keys(contractData).length > 0) {
      formik.setValues({
        ContractName: contractData?.contract_name || "",
        PaymentTerms: contractData?.payment_terms || "",
        InitialContractSum: contractData?.initial_contract_sum || "",
        modifiedInitialContractSum: contractData?.formatted_initial_contract_sum
          ? `$ ${contractData?.formatted_initial_contract_sum}`
          : "",
        ProjectRole: contractData?.project_role || "",
        RelatedEntity: contractData?.related_entity || "",
        ClientSupplier: contractData?.client_supplier_name || "",
        ClientSupplierRole: contractData?.client_supplier_role || "",
        RetentionType: contractData?.retention_type || "",
        ProjectName: contractData?.project_name,
      });
      dropdownData(
        contractData?.client_supplier_role,
        roleOptions,
        setClientRoleSelectedData
      );
      dropdownData(
        contractData?.retention_type,
        retentionOptions,
        setRetentionSelectedData
      );
      setSelectedClientSuplierID(contractData?.client_supplier_id);
      setSelectedProjectId(contractData?.project_id);
      setSelectedClientSuplierType(contractData?.client_supplier_type || "");
      setPaymentData({
        PaymentFromAccount: contractData?.payment_from_account || null,
        RetentionFromAccount: contractData?.retention_from_account || null,
        PaymentToAccount: contractData?.payment_to_account || null,
      });
      setUploadValues({
        ContractStartDate: contractData?.contract_start_date
          ? new Date(contractData?.contract_start_date)
          : null,
        DefectLiabilityEndDate: contractData?.defect_liability_end_date
          ? new Date(contractData?.defect_liability_end_date)
          : null,
      });
      setUploadData({ selectedFile: contractData?.file });
      const editpaymentdata = {
        PaymentFromAccount: contractData?.payment_from_account || null,
        RetentionFromAccount: contractData?.retention_from_account || null,
        PaymentToAccount: contractData?.payment_to_account || null,
      };

      formik.setFieldValue("PaymentDetails", editpaymentdata);
      let clientOpts =
        clientSupplierOptions.find(
          (each: any) => each.value === contractData?.client_supplier_name
        ) || {};
      setClientSupplierSelectedData(
        Object.keys(clientOpts).length ? clientOpts : null
      );
      let projectOpts =
        projectOptions.find(
          (each: any) => each.value === contractData?.project_name
        ) || {};
      setProjectSelectedData(
        Object.keys(projectOpts).length ? projectOpts : null
      );
    }
  }, [isEdit, contractData, routePathStoredData]);

  let validationSchema = Yup.object().shape({
    ContractName: Yup.string()
      .required("Contract name is required")
      .test("name", function (value, formData: any) {
        const isContractNameExist = formData.parent.isContractNameExist;
        if (!value) return true; // Allow empty values
        if (isContractNameExist) {
          return formData.createError({
            path: formData.path,
            message: "Name already exists",
          });
        }
        return true;
      }),
    ClientSupplier: Yup.string().required("Client/Supplier is required"),
    ClientSupplierRole: Yup.string().required(
      "Client/Supplier role is required"
    ),
    ProjectName: Yup.string().required("Project name is required"),
    RetentionType: Yup.string().required("Retention type is required"),
    PaymentTerms: Yup.string()
      .matches(/^\d+$/, "Only numbers are allowed")
      .required("Payment terms is required"),
    InitialContractSum: Yup.string().required(
      "Initial contract sum is required"
    ),
    modifiedInitialContractSum: Yup.string().required(
      "Initial contract sum is required"
    ),
    PaymentDetails: Yup.object().required("Payment details is required"),
    Upload: Yup.string().required("Upload is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      ContractName: isEdit ? contractData?.contract_name || "" : "",
      isContractNameExist: false,
      // ClientSupplier: isEdit ? contractData?.client_supplier_name || "" : "",
      ClientSupplier: "",

      ClientSupplierRole: isEdit
        ? contractData?.client_supplier_role || ""
        : "",
      // ProjectName: isEdit ? contractData?.project_name || "" : "",
      ProjectName: "",

      RetentionType: isEdit ? contractData?.retention_type || "" : "",
      PaymentDetails: null,
      PaymentTerms: isEdit ? contractData?.payment_terms || "" : "",
      InitialContractSum: isEdit
        ? contractData?.initial_contract_sum || ""
        : "",
      modifiedInitialContractSum: "",
      Upload: null,
      ProjectRole: isEdit ? contractData?.project_role || "" : "",
      RelatedEntity: isEdit ? contractData?.related_entity || "" : "",
    },
    validationSchema,
    onSubmit: async (values) => handleSubmit(),
  });

  async function initialInvoke() {
    const [projects, clientSuppliers] = await Promise.all([
      getProjectsLists({
        companyId: companyId,
        isArchived: false,
      }),
      getClientSupplierLists(companyId),
    ]);

    if (projects) {
      const options = projects.map((project) => ({
        value: project?.project_name,
        label: project?.project_name,
        project_role: project?.project_role,
        project_id: project?.project_id,
      }));

      setProjectOptions(options);
    }
    if (clientSuppliers) {
      const options = clientSuppliers.map((supplier) => ({
        value: supplier?.client_supplier_name,
        label: supplier?.client_supplier_name,
        related_entity: supplier?.related_entity,
        client_supplier_type: supplier?.client_supplier_type,
        client_supplier_id: supplier?.client_supplier_id,
        client_supplier_form_id: supplier?.id,
      }));
      setClientSupplierOptions(options);
    }
  }

  async function handleSubmit(skipStatusInfo?: boolean) {
    const values = formik?.values || {};

    if (status == "completed") {
      handleComplete(values);
      return;
    } else if (!skipStatusInfo && selectedClientSuplierType == "Supplier") {
      setDisplayStatusInfo(true);
      return true;
    }

    setLoader(true);

    try {
      let payload = {
        company_id: companyId,
        contract_name: values?.ContractName,
        contract_date: getCurrentUtcTime(),
        client_supplier_role: formik?.values?.ClientSupplierRole,
        contract_status:
          selectedClientSuplierType === "Client" || !noticeEligible
            ? "In Progress"
            : "Draft",
        retention_type: formik?.values?.RetentionType,
        payment_terms: Number(values?.PaymentTerms),
        project_id: selectedProjectID,
        client_supplier_id: selectedClientSuplierID,
        contract_start_date: new Date(uploadvalues?.ContractStartDate),
        initial_contract_sum: Number(values?.InitialContractSum),
        defect_liability_end_date: new Date(
          uploadvalues?.DefectLiabilityEndDate
        ),
        related_entity: values?.RelatedEntity,
        project_role: values?.ProjectRole,
        client_supplier_type: selectedClientSuplierType,
        payment_from_account: Number(paymentData?.PaymentFromAccount) || null,
        retention_from_account:
          Number(paymentData?.RetentionFromAccount) || null,
        payment_to_account: Number(paymentData?.PaymentToAccount) || null,
      };
      if (isEdit) {
        setLoaderInfo("Updating contract...");
        let modifiedPayload = {
          ...payload,
          id: contractData?.id,
        };
        const editSuccess = await editContractDetailsById(modifiedPayload);
        if (editSuccess?.contract_id) {
          if (uploadData?.removedFile) {
            const postData = {
              attachmentId: contractData?.attachment_id,
              attachmentType: "Contracts",
              id: contractData?.id,
            };
            const success = await deleteAttachment(postData);
            // Reset selectedFile to null regardless of success or failure
          }
          if (uploadData?.selectedFile) {
            let UploadData = {
              contract_id: contractData?.contract_id,
              name: uploadData?.selectedFile?.name,
              uploaded_on: getCurrentUtcTime,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Contracts",
            };
            const fileResponse = await singleUploadApi(
              uploadData?.selectedFile,
              UploadData,
              accessTokenId
            );
          }
          handleRouterBack();
          setLoader(false);
          setLoaderInfo("");
        } else {
          setLoader(false);
          setLoaderInfo("");
        }
      } else {
        setFormSubmitted(true);
        setLoaderInfo("Saving contract...");

        const response = syncId
          ? await createContractInPaytradeFromXeroData({
              companyId,
              contractId: syncLogData?.api_payload?.contract_id,
              syncId,
              payload: payload,
            })
          : await insertContractDetails(payload);
        if (response?.contract_id) {
          if (uploadData?.selectedFile) {
            let UploadData = {
              contract_id: response?.contract_id,
              name: uploadData?.selectedFile?.name,
              uploaded_on: getCurrentUtcTime,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Contracts",
            };
            const fileResponse = await singleUploadApi(
              uploadData?.selectedFile,
              UploadData,
              accessTokenId
            );
          }

          handleRouterBack(
            response?.contract_id,
            response?.client_supplier_type
          );
          setLoader(false);
        } else {
          setLoader(false);
          setLoaderInfo("");
        }
      }
    } catch {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  const isDraft = contractData?.contract_status === "Draft";
  const isFormValid =
    formik?.values?.ClientSupplierRole &&
    formik?.values?.ClientSupplier &&
    formik?.values?.ProjectName &&
    formik?.values?.RetentionType &&
    formik?.values?.ProjectRole &&
    formik?.values?.RelatedEntity;

  const hasPaymentData = paymentData && Object.keys(paymentData).length > 0;

  // const PaymentdisableCondition = isEdit
  //   ? contractData?.contract_status === "In Progress"
  //   : !(
  //       formik?.values?.ClientSupplierRole &&
  //       formik?.values?.ClientSupplier &&
  //       formik?.values?.ProjectName &&
  //       formik?.values?.RetentionType &&
  //       formik?.values?.ProjectRole &&
  //       formik?.values?.RelatedEntity
  //     );

  const PaymentdisableCondition =
    isEdit && !isDraft // if editing and NOT draft → disable
      ? true
      : !isFormValid; // otherwise, disable if form is incomplete

  const isPaymentDataFilled =
    paymentData &&
    typeof paymentData === "object" &&
    Object.values(paymentData).some(
      (value) => value !== null && value !== undefined
    );

  const buttonName = isPaymentDataFilled
    ? "Payment details added"
    : "Input payment details";

  useEffect(() => {
    if (formik?.values) {
      let payload = {
        company_id: companyId,
        contract_name: formik?.values?.ContractName,
        contract_date: getCurrentUtcTime(),
        client_supplier_role: formik?.values?.ClientSupplierRole,

        contract_status: "In Progress",
        retention_type: formik?.values?.RetentionType,
        payment_terms: Number(formik?.values?.PaymentTerms),
        project_id: selectedProjectID,
        client_supplier_id: selectedClientSuplierID,
        contract_start_date: new Date(uploadvalues?.ContractStartDate),
        initial_contract_sum: Number(formik?.values?.InitialContractSum),
        defect_liability_end_date: new Date(
          uploadvalues?.DefectLiabilityEndDate
        ),
        related_entity: formik?.values?.RelatedEntity,
        project_role: formik?.values?.ProjectRole,
        client_supplier_type: selectedClientSuplierType,
        payment_from_account: Number(paymentData?.PaymentFromAccount) || null,
        retention_from_account:
          Number(paymentData?.RetentionFromAccount) || null,
        payment_to_account: Number(paymentData?.PaymentToAccount) || null,
      };
      setData(payload);
    }
  }, [formik.values]);

  // const handleButtonClick = () => {
  //   if (planName === "Basic") {
  //     setModalHeading("Upgrade Subscription");
  //     setModalBodyContent(
  //       "You have a basic free subscription. Please complete and send the required notices in the notices list or if you would like Pay Trade to auto submit for you, Upgrade now"
  //     );
  //     setOpenPlanModal(true);
  //   } else if (
  //     bankAccountsOptions?.length > 0 &&
  //     Object.keys(formik?.errors ? formik?.errors : {}).length === 0
  //   ) {
  //     // Open modal if only one bank account is available
  //     setDisplayDelegationModel(true);
  //   } else {
  //     setOpenPlanModal(false);
  //     setstatus("completed");
  //     formik?.handleSubmit();
  //   }
  // };

  const handleButtonClick = () => {
    if (!delegateAuthorityAllowed) {
      // 🚨 Delegate authority not allowed → show upgrade modal
      setModalHeading("Upgrade Subscription");
      setModalBodyContent(
        "Please complete and send the required notices in the notices list or if you would like Pay Trade to auto submit for you, Upgrade now"
      );
      setOpenPlanModal(true);
    } else if (
      bankAccountsOptions?.length > 0 &&
      Object.keys(formik?.errors ?? {}).length === 0 &&
      delegateAuthorityAllowed
    ) {
      // ✅ Delegate authority allowed → show delegation popup
      setDisplayDelegationModel(true);
    } else {
      // 🚨 No bank accounts or form errors → just submit
      setOpenPlanModal(false);
      setstatus("completed");
      formik?.handleSubmit();
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Redirect to subscription management page

    dispatch(
      setAddContractDetails({
        ...addContractDetails,
        ...formik?.values,
        ClientOrSupplier: selectedClientSuplierType,
        ClientSupplyId: selectedClientSuplierID,
        ReduxProjectId: selectedProjectID,
        ContractDate: new Date(uploadvalues?.ContractStartDate),
        DefectDate: new Date(uploadvalues?.DefectLiabilityEndDate),
        ReduxFile: uploadData,
        PaymentDetails: paymentData,
      })
    );
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  const handleFormCancelClick = () => {
    resetRetainedContractData();
    handleRouterBack();
    showInfoToast(
      isEdit
        ? "This contract has not been updated."
        : "This contract has not been added."
    );
  };

  const formatDollars = (value: string): string => {
    // Split the number by the decimal point
    const parts = value.split(".");
    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Join the integer and decimal parts (if present)
    return `$${parts.join(".")}`;
  };

  const handleInitialContractSum = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("modifiedInitialContractSum", ""); // Clear formatted value
      formik.setFieldValue("InitialContractSum", ""); // Clear raw value
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

    formik.setFieldValue("modifiedInitialContractSum", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("InitialContractSum", finalValue); // Raw numeric value
  };

  const handleComplete = async (values: any) => {
    setLoader(true);
    try {
      if (isEdit) {
        const modifiedPayload = { ...data, id: contractData?.id };
        const editSuccess = await editContractDetailsById(modifiedPayload);
        if (editSuccess?.contract_id) {
          if (uploadData?.removedFile) {
            const postData = {
              attachmentId: contractData?.attachment_id,
              attachmentType: "Contracts",
              id: contractData?.id,
            };
            const success = await deleteAttachment(postData);
            if (!success) {
              console.error("Failed to delete attachment");
            }
          }
          if (uploadData?.selectedFile) {
            let UploadData = {
              contract_id: contractData?.contract_id,
              name: uploadData?.selectedFile?.name,
              uploaded_on: getCurrentUtcTime,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Contracts",
            };
            const fileResponse = await singleUploadApi(
              uploadData?.selectedFile,
              UploadData,
              accessTokenId
            );
          }
          // ✅ Extract notices directly from edit API response
          const { notice_previews = [], qbcc_notice_previews = [] } =
            editSuccess?.notices || {};

          setNoticeFiles(notice_previews.map((n: any) => n.file_details));
          setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));
          setQbccNoticeFiles(
            (qbcc_notice_previews || []).map((n: any) => n.qbcc_file_details)
          );
          setQbccNoticeUuids(
            (qbcc_notice_previews || []).map((n: any) => n.notice_uuid)
          );

          if (notice_previews.length > 0 || qbcc_notice_previews?.length > 0) {
            setLoader(false);
            setShowNoticePopup(true);
            return; // stop routing → popup decides
          }

          // Plan-specific routing
          if (
            !delegateAuthorityAllowed &&
            (notice_previews.length > 0 || qbcc_notice_previews?.length > 0)
          ) {
            setLoader(false);
            resetRetainedContractData();
            router.push(AppRoutes.USER_NOTICES);
            return;
          }
          setLoader(false);
          resetRetainedContractData();
          handleRouterBack();
        } else {
          setLoader(false);
        }
      } else {
        setLoaderInfo("Saving contract...");
        const response = await insertContractDetails(data);
        if (response?.contract_id) {
          // 👇 Save for later use in send/cancel popup handlers
          setLastInsertedContractId(response?.contract_id);
          setLastInsertedClientSupplierType(response?.client_supplier_type);
          if (uploadData?.selectedFile) {
            let UploadData = {
              contract_id: response?.contract_id,
              name: uploadData?.selectedFile?.name,
              uploaded_on: getCurrentUtcTime,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Contracts",
            };
            const fileResponse = await singleUploadApi(
              uploadData?.selectedFile,
              UploadData,
              accessTokenId
            );
          }
          // ✅ Extract notices directly from add API response
          const { notice_previews = [], qbcc_notice_previews = [] } =
            response?.notices || {};

          setNoticeFiles(notice_previews.map((n: any) => n.file_details));
          setNoticeMailUuids(notice_previews.map((n: any) => n.mail_uuid));
          setQbccNoticeFiles(
            (qbcc_notice_previews || []).map((n: any) => n.qbcc_file_details)
          );
          setQbccNoticeUuids(
            (qbcc_notice_previews || []).map((n: any) => n.notice_uuid)
          );

          if (notice_previews.length > 0 || qbcc_notice_previews?.length > 0) {
            setLoader(false);
            setShowNoticePopup(true);
            return; // stop routing → popup decides
          }

          // Plan-specific routing
          if (
            !delegateAuthorityAllowed &&
            (notice_previews.length > 0 || qbcc_notice_previews?.length > 0)
          ) {
            setLoader(false);
            resetRetainedContractData();
            router.push(AppRoutes.USER_NOTICES);
            return;
          }

          setLoader(false);
          resetRetainedContractData();
          handleRouterBack(
            response?.contract_id,
            response?.client_supplier_type
          );
        } else {
          setLoader(false);
        }
      }
    } catch (error) {
      setLoaderInfo("");
      setLoader(false);
    }
  };

  const handleAlphaNumericChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Update formik values
    const fieldName = event.target.name;
    let value = event.target.value.replace(/[^a-zA-Z0-9 ]/g, ""); // Allow only alphanumeric characters and space
    formik.handleChange({
      target: {
        name: fieldName,
        value: value,
      },
    });
    setSearchTerm(value);
  };

  const handleAllowOnlyNumbers = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Update formik values
    const fieldName = event.target.name;
    let value = event.target.value.replace(/[^0-9]/g, ""); // Allow only numbers
    formik.handleChange({
      target: {
        name: fieldName,
        value: value,
      },
    });
  };

  function handleProjectChange(selectedOption: any) {
    // Find the selected project object from projectOptions
    const selectedObj = projectOptions.find(
      (val: any) => val.value === selectedOption
    );

    // Update formik value for "ProjectName"
    formik.setFieldValue("ProjectName", selectedOption || "");

    // Update selected project data
    setProjectSelectedData({
      value: selectedObj?.project_id || null,
      label: selectedObj?.label || "",
    });

    // Update role selection data
    setRoleSelectedData(selectedOption);

    // Update related formik fields and state only if a valid project is selected
    if (selectedObj) {
      formik.setFieldValue("ProjectRole", selectedObj.project_role || null);
      setSelectedProjectId(Number(selectedObj.project_id));
    }
  }

  function handleRouterBack(contractId?: any, clientSupplierType?: any) {
    resetRetainedContractData();
    if (overviewId) {
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewId}?from=contracts`
      );
    } else if (
      complianceOverviewData?.addContract ||
      complianceOverviewData?.editContract
    ) {
      router.push(
        `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.referenceId}&tab=${complianceOverviewData?.typeOfTrustAccount}`
      );
    } else if (quickAddRecord) {
      if (routePathStoredData?.quickAddFromVariations) {
        router.push(
          `${AppRoutes.USER_ADD_VARIATIONS}?retrieve-record=${quickAddRoutes.RETRIEVE_VARIATION}`
        );
      } else if (routePathStoredData?.quickAddFromClaims) {
        router.push(
          `${AppRoutes.USER_ADD_CLAIMS}?retrieve-record=${quickAddRoutes.RETRIEVE_CLAIMS}` +
            `${selectedProjectID ? `&quickproj_id=${selectedProjectID}` : ""}` +
            `${contractId ? `&quickcont_id=${contractId}` : ""}` +
            `${
              clientSupplierType
                ? `&client-supplier-type=${clientSupplierType}`
                : ""
            }`
        );
      } else {
        router.back();
      }
    } else if (retrieveAfterAddingQuickRecord) {
      router.push(AppRoutes.USER_CONTRACTS_LIST);
    } else {
      router.back();
    }
  }

  async function handleAddQuickRecord(
    route: string,
    displayPaymentDetails?: boolean,
    displayClientForms?: boolean,
    fromDraftContract?: boolean
  ) {
    const postData = {
      ...addContractDetails,
      ...formik?.values,
      ClientOrSupplier: selectedClientSuplierType,
      ClientSupplyId: selectedClientSuplierID,
      ReduxProjectId: selectedProjectID,
      ContractDate: uploadvalues?.ContractStartDate,
      DefectDate: uploadvalues?.DefectLiabilityEndDate,
      ReduxFile: uploadData,
      PaymentDetails: paymentData,
      quickAddFromContract: true,
      displayPaymentDetails: displayPaymentDetails ?? false,
      displayClientPaymentForm: displayClientForms ?? false,
      fromDraftContract: fromDraftContract ?? false,
      ...(isEdit && contractData?.id && { id: contractData.id }),
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
        setRoutePathStoredData(result?.data);
      }
    } catch {}
  }

  function isClientOrSupplier(smallCase?: boolean) {
    if (clientSupplierSelectedData?.type == "Client") {
      return smallCase ? "client" : "Client";
    } else if (clientSupplierSelectedData?.type == "Supplier") {
      return smallCase ? "supplier" : "Supplier";
    } else {
      return smallCase ? "client/supplier" : "Client/Supplier";
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
      resetRetainedContractData();

      // 🔹 Contract navigation logic
      if (isEdit) {
        handleRouterBack();
      } else {
        handleRouterBack(
          lastInsertedContractId,
          lastInsertedClientSupplierType
        );
      }

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
      resetRetainedContractData();

      // 🔹 Contract navigation logic
      if (isEdit) {
        handleRouterBack();
      } else {
        handleRouterBack(
          lastInsertedContractId,
          lastInsertedClientSupplierType
        );
      }

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
    setNoticeMailUuids([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
  };

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="grid">
              <div className="pt_login">
                <h4>{isEdit ? "Edit contract" : "Add contract"}</h4>

                {isEdit && (
                  <>
                    <h6>Contract id - {contractData?.contract_id || ""}</h6>
                    <h6>
                      Date -{" "}
                      {contractData?.contract_date &&
                        formatDate(contractData?.contract_date)}
                    </h6>
                  </>
                )}
                <FormikControl
                  control={InputType.SELECT}
                  label={isClientOrSupplier()}
                  secondLabel={
                    contractData == null || // handles null and undefined
                    (typeof contractData === "object" &&
                      Object.keys(contractData).length === 0) ||
                    (!isEdit &&
                      (!contractData?.contract_status ||
                        contractData.contract_status === "Draft")) ||
                    (isEdit && contractData?.contract_status === "Draft")
                      ? "Add client/supplier"
                      : ""
                  }
                  onSecondLabelClick={() => {
                    const isDraftContract: any =
                      (contractData?.contract_status &&
                        contractData.contract_status === "Draft") ||
                      (isEdit && contractData?.contract_status === "Draft");
                    handleAddQuickRecord(
                      `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?quick-add=${quickAddRoutes.CLIENT_SUPPLIER}`,
                      false,
                      false,
                      isDraftContract
                    );
                  }}
                  name="ClientSupplier"
                  required
                  placeholder="Select client or supplier"
                  value={formik.values.ClientSupplier}
                  options={clientSupplierOptions}
                  renderKey="value"
                  valueKey="label"
                  onChange={(selectedOption: any) => {
                    MakePaymentReset();
                    formik.handleChange("ClientSupplier")(selectedOption || "");
                    const selectedObj = clientSupplierOptions.find(
                      (val: any) => val.value === selectedOption
                    );

                    setClientSupplierSelectedData({
                      value: selectedObj?.value,
                      label: selectedObj?.label,
                      type: selectedObj?.client_supplier_type,
                      id: selectedObj?.client_supplier_form_id,
                    });
                    formik.setFieldValue(
                      "RelatedEntity",
                      selectedObj?.related_entity
                    );
                    setSelectedRelatedEntity(selectedObj?.related_entity);
                    setSelectedClientSuplierType(
                      selectedObj?.client_supplier_type
                    );
                    setSelectedClientSuplierID(selectedObj?.client_supplier_id);
                  }}
                  error={formik.errors.ClientSupplier}
                  showError={
                    formik.touched.ClientSupplier &&
                    formik.errors.ClientSupplier
                  }
                  disabled={disableCondition}
                  onBlur={formik.handleBlur("ClientSupplier")}
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Contract name"}
                  maxLength={150}
                  name="ContractName"
                  error={formik.errors.ContractName}
                  placeholder="Input a contract name"
                  id="ContractName"
                  disabled={
                    disableCondition || syncId || !selectedClientSuplierType
                  }
                  value={formik.values.ContractName}
                  onChange={handleAlphaNumericChange}
                  onBlur={formik.handleBlur}
                  showError={
                    formik.touched.ContractName && formik.errors.ContractName
                  }
                  required
                />

                <FormikControl
                  label={`${isClientOrSupplier()} role`}
                  placeholder={`Select ${isClientOrSupplier(true)} role`}
                  options={roleOptions}
                  required
                  disabled={disableCondition}
                  control={InputType.SELECT}
                  error={formik.errors.ClientSupplierRole}
                  showError={
                    formik.touched.ClientSupplierRole &&
                    formik.errors.ClientSupplierRole
                  }
                  value={formik.values.ClientSupplierRole}
                  renderKey="label"
                  valueKey="value"
                  onBlur={formik.handleBlur}
                  onChange={(selectedOption: any) => {
                    formik.setFieldValue("ClientSupplierRole", selectedOption);
                    setClientRoleSelectedData(selectedOption);
                  }}
                />

                <FormikControl
                  label="Project name"
                  secondLabel={
                    contractData == null || // handles null and undefined
                    (typeof contractData === "object" &&
                      Object.keys(contractData).length === 0) ||
                    (!isEdit &&
                      (!contractData?.contract_status ||
                        contractData.contract_status === "Draft")) ||
                    (isEdit && contractData?.contract_status === "Draft")
                      ? "Add project"
                      : ""
                  }
                  onSecondLabelClick={() => {
                    const isDraftContract: any =
                      (contractData?.contract_status &&
                        contractData.contract_status === "Draft") ||
                      (isEdit && contractData?.contract_status === "Draft");
                    handleAddQuickRecord(
                      `${AppRoutes.USER_ADD_PROJECTS}?quick-add=${quickAddRoutes.PROJECT}`,
                      false,
                      false,
                      isDraftContract
                    );
                  }}
                  options={projectOptions}
                  required
                  control={InputType.SELECT}
                  value={formik.values.ProjectName}
                  error={formik.errors.ProjectName}
                  showError={
                    formik.touched.ProjectName && formik.errors.ProjectName
                  }
                  renderKey="value"
                  valueKey="label"
                  onChange={(selectedOption: any) =>
                    handleProjectChange(selectedOption)
                  }
                  disabled={
                    isProjectPreselected ||
                    overviewId ||
                    complianceOverviewData?.addContract ||
                    complianceOverviewData?.editContract ||
                    disableCondition
                  }
                  placeholder="Select project"
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Project role"}
                  name="ProjectRole"
                  id="ProjectRole"
                  disabled={true}
                  error={formik.errors.ProjectRole}
                  value={formik.values.ProjectRole}
                  onBlur={formik.handleBlur}
                  showError={
                    formik.touched.ProjectRole && formik.errors.ProjectRole
                  }
                  required
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Related entity type"}
                  name="RelatedEntityType"
                  id="RelatedEntityType"
                  disabled={true}
                  value={formik.values.RelatedEntity}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.RelatedEntity}
                  showError={
                    formik.touched.RelatedEntity && formik.errors.RelatedEntity
                  }
                  required
                />

                <FormikControl
                  label="Retention type "
                  placeholder="Select retention type"
                  options={retentionOptions}
                  required
                  disabled={disableCondition}
                  control={InputType.SELECT}
                  value={formik.values.RetentionType}
                  error={formik.errors.RetentionType}
                  showError={
                    formik.touched.RetentionType && formik.errors.RetentionType
                  }
                  renderKey="value"
                  valueKey="label"
                  onChange={(selectedOption: any) => {
                    MakePaymentReset();
                    formik.setFieldValue("RetentionType", selectedOption);
                    setRetentionSelectedData(selectedOption);
                  }}
                />

                <label>
                  <small>
                    Payment details <span className="required">*</span>
                  </small>
                </label>

                <CustomButton
                  buttonName={
                    // isEdit || Object.keys(paymentData).length > 0
                    //   ? "Payment details added"
                    //   : "Input payment details"

                    buttonName
                  }
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  error={formik.errors.PaymentDetails}
                  showError={
                    formik.touched.PaymentDetails &&
                    formik.errors.PaymentDetails
                  }
                  disabled={PaymentdisableCondition}
                  actionType="submit"
                  onClick={() =>
                    !PaymentdisableCondition &&
                    // setViewPages("PaymentDetailsPage") &&
                    setShowPaymentModel(true)
                  }
                  inputButton
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Payment terms"}
                  maxLength={2}
                  rightAlignedTextStyles="endTextStyle"
                  rightAlignedText={{
                    text: "days",
                    isVisible: Boolean(formik.values.PaymentTerms), // Conditionally display based on value
                  }}
                  error={formik.errors.PaymentTerms}
                  name="PaymentTerms"
                  placeholder="Input business days for payment"
                  id="PaymentTerms"
                  disabled={disableCondition}
                  value={formik.values.PaymentTerms}
                  onChange={handleAllowOnlyNumbers}
                  onBlur={formik.handleBlur}
                  showError={
                    formik.touched.PaymentTerms && formik.errors.PaymentTerms
                  }
                  required
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Initial contract sum (excluding GST) "}
                  error={formik.errors.InitialContractSum}
                  name="modifiedInitialContractSum"
                  placeholder="Input initial contract sum (as appears in contract)"
                  id="modifiedInitialContractSum"
                  disabled={disableCondition}
                  value={formik.values.modifiedInitialContractSum}
                  onChange={handleInitialContractSum}
                  onBlur={formik.handleBlur}
                  showError={
                    (formik.touched.modifiedInitialContractSum &&
                      formik.errors.modifiedInitialContractSum) ||
                    (formik.touched.InitialContractSum &&
                      formik.errors.InitialContractSum)
                  }
                  required
                />

                <CustomButton
                  buttonName={
                    // isEdit ||
                    // (Object.keys(uploadvalues).length > 0 &&
                    //   uploadData?.selectedFile)
                    //   ? "Contract attachments added"
                    //   : "Please upload your signed contract"

                    uploadButtonName
                  }
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  error={formik.errors.Upload}
                  showError={formik.touched.Upload && formik.errors.Upload}
                  actionType="submit"
                  onClick={() => setShowUploadModel(true)}
                  inputButton
                  disabled={disableCondition}
                />

                {isEdit && (
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Status"}
                    name="status"
                    id="status"
                    disabled={true}
                    value={contractData?.contract_status}
                  />
                )}
                {contractData &&
                  contractData?.contract_status !== "In Progress" && (
                    <CustomButton
                      buttonName={isEdit ? "Update" : "Save"}
                      buttonType={buttonType.SECONDARY}
                      actionType="submit"
                      onClick={() => {
                        setstatus("");
                        formik?.handleSubmit();
                      }}
                      disabled={loader}
                      inputButton
                    />
                  )}
                {((selectedClientSuplierType !== "Client" &&
                  !isNoticeSent &&
                  !isEdit) ||
                  (noticeEligible &&
                    isEdit &&
                    selectedClientSuplierType !== "Client" &&
                    !isNoticeSent) ||
                  (isEdit &&
                    contractData?.contract_status === "Draft" &&
                    selectedClientSuplierType !== "Client" &&
                    !isNoticeSent)) && (
                  <CustomButton
                    buttonName={"Completed - Send notices"}
                    buttonType={buttonType.SECONDARY}
                    actionType="button"
                    onClick={handleButtonClick}
                    disabled={loader}
                    inputButton
                  />
                )}
                <CustomButton
                  buttonName={"Cancel"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="submit"
                  onClick={handleFormCancelClick}
                  inputButton
                />
              </div>
            </div>
          </div>
        </div>
        {openPlanModal && (
          <BaseModal
            displayModal={openPlanModal}
            onClose={async (triggered: any) => {
              if (triggered) {
                setOpenPlanModal(false);
                setstatus("completed");
                await formik?.handleSubmit();
              }
            }}
            title="Upgrade Subscription"
            secondButtonName="Upgrade Now"
            firstButtonName="Proceed with manual notices"
            onConfirm={() => {
              handleConfirm();
              return true;
            }}
            restrictOncloseFunctionInHeader
            onHeaderIconClose={() => {
              setOpenPlanModal(false);
            }}
          >
            <p className="text_center">
              Please complete and send the required notices in the notices list
              or if you would like Pay Trade to auto submit for you, Upgrade
              now.
            </p>
          </BaseModal>
        )}
      </div>

      {showPaymentModel && (
        <PaymentDetailsPage
          setViewPages={setViewPages}
          setPaymentData={(val: any) => {
            setPaymentData(val);
            formik.setFieldValue("PaymentDetails", val);
          }}
          SetNoticeEligible={SetNoticeEligible}
          contractType={selectedClientSuplierType}
          paymentDetails={contractData}
          showPaymentModel={showPaymentModel}
          setShowPaymentModel={setShowPaymentModel}
          paymentData={paymentData}
          selectedProjectId={selectedProjectID}
          selectedClientSuplierID={selectedClientSuplierID}
          isEdit={isEdit}
          handleAddQuickRecord={handleAddQuickRecord}
          clientSupplierSelectedData={clientSupplierSelectedData}
          {...formik.values} // pass the rest of the formik values as props
        />
      )}
      {showUploadModel && (
        <UploadContract
          setViewPages={setViewPages}
          paymentDetails={contractData}
          setUploadData={setUploadData}
          uploadfile={uploadData}
          showUploadModel={showUploadModel}
          setShowUploadModel={setShowUploadModel}
          setUploadValues={(newValue: any) => {
            setUploadValues(newValue);
            setData((pre: any) => ({
              ...pre,
              contract_start_date: new Date(newValue?.ContractStartDate),
              defect_liability_end_date: new Date(
                newValue?.DefectLiabilityEndDate
              ),
            }));
          }}
          uploadvalues={uploadvalues}
          isEdit={isEdit}
        />
      )}
      {displayStatusInfo && (
        <BaseModal
          modalId={"Status Confirmation"}
          displayModal={displayStatusInfo}
          onClose={() => setDisplayStatusInfo(false)}
          onConfirm={() => {
            handleSubmit(true);
            setDisplayStatusInfo(false);
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
        >
          <h4>
            This will save as draft. You won't be able to use this account in
            the system until marked as completed.
          </h4>
        </BaseModal>
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={(e: any) => {
            if (e === true) {
              setDisplayDelegationModel(false);
              setstatus("completed");
              formik?.handleSubmit();
            }
          }}
          secondButtonName="Save"
          firstButtonName="Close"
          onConfirm={() => {
            handleUpdateDelegatePowers();
          }}
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
          <div>
            <SearchableSelect
              placeholder={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              label={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              name="BankAccount"
              required
              isMulti={true}
              isInPopup={true}
              options={bankAccountsOptions}
              multiSelectedData={displayedOptions}
              onChange={handleSelectChange}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <br />
          <p className="text_center">
            <span className="pt_yellow">Note:</span> On close your notices will
            not be sent automatically. Visit the notices pages to send manually.
          </p>
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
    </div>
  );
}
