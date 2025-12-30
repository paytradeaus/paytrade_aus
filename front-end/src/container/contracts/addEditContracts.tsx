"use client";

import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Form,
  Container,
  Button,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import styles from "./addEditContracts.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  CaretRightFill,
  ExclamationTriangleFill,
  LayoutTextWindowReverse,
} from "react-bootstrap-icons";
import commonStyles from "../../common/commonStyles.module.scss";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { deleteAttachment, singleUploadApi } from "@/app/api/commonAPIs";
import { formatDate, getCurrentUtcTime } from "@/common/commonFunctions";
import {
  editContractDetailsById,
  getClientSupplierLists,
  getProjectsLists,
  insertContractDetails,
  TriggerContractNotices,
  viewContractDetailsById,
} from "./contracts.functions";
import { useTokenDetails } from "@/common/commonHooks";
import PaymentDetailsPage from "./paymentDetails/paymentDetails";
import UploadContract from "./uploadContract/uploadContract";
import { useLoaderContext } from "@/context/useLoader";
import { toast } from "react-toastify";
import { ApplicationURLS } from "@/common/applicationURLS";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { commonCookies, DECIMAL_WITH_DOLLAR } from "@/common/constants/general";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import CheckReload from "@/components/checkReload/checkReload";
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import { AppModal } from "@/components/model/model";
import CustomTooltip from "@/components/customToolTip/customToolTip";
import TooltipInfoIcon from "@/components/customToolTip/customToolTip";
import { setAddContractDetails } from "@/redux/slices/dashboardSlices";
import { setContractDeatils } from "@/redux/slices/contractPaymentDetails";
import _ from "lodash";
// import Tooltip from "@/components/Tooltip/tooltip";

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

const AddEditContracts = (props: any) => {
  const { isEdit = false, ...rest } = props;
  const [paymentData, setPaymentData] = useState<any>({});
  const [uploadData, setUploadData] = useState<any>({});
  const [uploadvalues, setUploadValues] = useState<any>({});
  const [status, setstatus] = useState<any>("");
  const [noticeEligible, SetNoticeEligible] = useState<boolean>(false);

  const routePath = usePathname();

  const [viewPages, setViewPages] = useState<VIEW_PAGE_TYPES>("mainPage");
  const [roleSelectedData, setRoleSelectedData] = useState<any>({});
  const [clientRoleSelectedData, setClientRoleSelectedData] = useState<any>();
  const [clientSupplierSelectedData, setClientSupplierSelectedData] =
    useState<any>();
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
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");

  const complianceOverviewData: any = useAppSelector(
    (state: any) => state?.complianceOverview?.timeLineData
  );

  const { loader, setLoader }: any = useLoaderContext();
  const params = useParams();
  const queryParams: any = useSearchParams();
  const overviewId = queryParams.get("overview");
  const overviewProjectId = queryParams.get("projectid");
  const overviewProjectname = queryParams.get("projectname");
  const overviewProjectrole = queryParams.get("projectrole");
  const dispatch = useAppDispatch();

  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const router = useRouter();

  const addContractDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addContractDetails
  );

  const disableCondition =
    isEdit && contractData?.contract_status === "In Progress";

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
      label: "Related Entity Sub Contractor",
    },
    { value: "Sub Contractor", label: "Sub Contractor" },
  ];

  const retentionOptions = [
    {
      value: "Bank guaranteed",
      label: "Bank guaranteed",
    },
    { value: "Cash", label: "Cash" },
    { value: "None", label: "None" },
  ];

  useEffect(() => {
    if (addContractDetails && Object.keys(addContractDetails).length > 0) {
      formik.setValues({
        ContractName: addContractDetails?.ContractName || "",
        ClientSupplier: addContractDetails?.ClientSupplier || "",
        ClientSupplierRole: addContractDetails?.ClientSupplierRole || "",
        ProjectName: addContractDetails?.ProjectName || "",
        RetentionType: addContractDetails?.RetentionType || "",
        PaymentTerms: addContractDetails?.PaymentTerms || "",
        InitialContractSum: addContractDetails?.InitialContractSum || "",
        modifiedInitialContractSum:
          addContractDetails?.modifiedInitialContractSum || "",
        Upload: addContractDetails?.Upload || "",
        ProjectRole: addContractDetails?.ProjectRole || "",
        RelatedEntity: addContractDetails?.RelatedEntity || "",
        PaymentDetails: {
          PaymentFromAccount:
            addContractDetails?.PaymentDetails?.PaymentFromAccount || null,
          RetentionFromAccount:
            addContractDetails?.PaymentDetails?.RetentionFromAccount || null,
          PaymentToAccount:
            addContractDetails?.PaymentDetails?.PaymentToAccount || null,
        },
      });

      // Populate dropdowns and related fields
      dropdownData(
        addContractDetails?.ClientSupplierRole,
        roleOptions,
        setClientRoleSelectedData
      );
      dropdownData(
        addContractDetails?.RetentionType,
        retentionOptions,
        setRetentionSelectedData
      );

      setSelectedClientSuplierID(addContractDetails?.ClientSupplyId);
      setSelectedProjectId(addContractDetails?.ReduxProjectId);
      setSelectedClientSuplierType(addContractDetails?.ClientOrSupplier || "");
      let clientOpts =
        clientSupplierOptions.find(
          (each: any) => each.value === addContractDetails?.ClientSupplier
        ) || {};
      setClientSupplierSelectedData(
        Object.keys(clientOpts).length ? clientOpts : null
      );
      let projectOpts =
        projectOptions.find(
          (each: any) => each.value === addContractDetails?.ProjectName
        ) || {};
      setProjectSelectedData(
        Object.keys(projectOpts).length ? projectOpts : null
      );

      // Set payment data
      setPaymentData({
        PaymentFromAccount:
          addContractDetails?.PaymentDetails?.PaymentFromAccount || null,
        RetentionFromAccount:
          addContractDetails?.PaymentDetails?.RetentionFromAccount || null,
        PaymentToAccount:
          addContractDetails?.PaymentDetails?.PaymentToAccount || null,
      });

      setUploadValues({
        ContractStartDate: addContractDetails?.ContractDate,
        DefectLiabilityEndDate: addContractDetails?.DefectDate,
      });
      setUploadData(addContractDetails?.ReduxFile);
    }
  }, [addContractDetails, clientSupplierOptions, projectOptions]);

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
    }
  }, [companyId]);

  useEffect(() => {
    (async () => {
      const [projects, clientSuppliers] = await Promise.all([
        getProjectsLists(companyId),
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
        }));
        setClientSupplierOptions(options);
      }
    })();
  }, []);

  // useEffect(() => {
  //   if (Object.keys(paymentData).length > 0) {
  //     console.log("check");
  //     formik.setFieldValue("PaymentDetails", paymentData || {});
  //   } else {
  //     console.log("not");
  //   }
  // }, [paymentData]);

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
    if (Object.keys(contractData).length > 0) {
      formik.setValues({
        ContractName: contractData?.contract_name || "",
        PaymentTerms: contractData?.payment_terms || "",
        InitialContractSum: contractData?.initial_contract_sum || "",
        modifiedInitialContractSum:
          `$ ${contractData?.formatted_initial_contract_sum}` || "",
        ProjectRole: contractData?.project_role || "",
        RelatedEntity: contractData?.related_entity || "",
        ClientSupplier: contractData?.client_supplier_id || "",
        ClientSupplierRole: contractData?.client_supplier_role || "",
        RetentionType: contractData?.retention_type || "",
        ProjectName: contractData?.project_name,
        // label: contractData?.project_name,
        // project_role: contractData?.project_role,
        // project_id: contractData?.project_id,
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
        ContractStartDate: new Date(contractData?.contract_start_date),
        DefectLiabilityEndDate: new Date(
          contractData?.defect_liability_end_date
        ),
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
  }, [isEdit, contractData]);

  let validationSchema = Yup.object().shape({
    ContractName: Yup.string().required("Contract name is required"),
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

  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
  };

  const formik: any = useFormik({
    initialValues: {
      ContractName: isEdit ? contractData?.contract_name || "" : "",
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
    onSubmit: async (values) => {
      setLoader(true);

      if (status == "completed") {
        handleComplete(values);
        return;
      }
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
          payment_from_account: paymentData?.PaymentFromAccount || null,
          retention_from_account: paymentData?.RetentionFromAccount || null,
          payment_to_account: paymentData?.PaymentToAccount || null,
        };
        if (isEdit) {
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
              // setSelectedFile(null);
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
            handleRouteAfterSubmit();
            setLoader(false);
          } else {
            setLoader(false);
          }
        } else {
          setFormSubmitted(true);
          const response = await insertContractDetails(payload);
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

            handleRouteAfterSubmit();
            setLoader(false);
          } else {
            setLoader(false);
          }
        }
      } catch (error) {
        setLoader(false);
        console.error("Error inserting contract details:", error);
      }
    },
  });

  console.log("formik", formik);

  const PaymentdisableCondition = isEdit
    ? contractData?.contract_status === "In Progress"
    : !(
        formik?.values?.ClientSupplierRole &&
        formik?.values?.ClientSupplier &&
        formik?.values?.ProjectName &&
        formik?.values?.RetentionType &&
        formik?.values?.ProjectRole &&
        formik?.values?.RelatedEntity
      );

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
        payment_from_account: paymentData?.PaymentFromAccount || null,
        retention_from_account: paymentData?.RetentionFromAccount || null,
        payment_to_account: paymentData?.PaymentToAccount || null,
      };
      setData(payload);
    }
  }, [formik.values]);

  // useEffect(() => {
  //   if (
  //     formik.values.PaymentDetails &&
  //     Object.keys(formik.values.PaymentDetails).length > 0
  //   ) {
  //     setPaymentData({});
  //     formik.setFieldValue("PaymentDetails", null);
  //     console.log("in");
  //   }
  // }, [formik.values.RetentionType, formik.values.ProjectName]);

  const handleButtonClick = () => {
    if (planName === "Basic") {
      setModalHeading("Upgrade Subscription");
      setModalBodyContent(
        "You have a basic free subscription. Please complete and send the required notices in the notices list or if you would like Pay Trade to auto submit for you, Upgrade now"
      );
      setOpenPlanModal(true);
    } else {
      setOpenPlanModal(false);
      setstatus("completed");
      formik?.handleSubmit();
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Redirect to subscription management page
    sessionStorage.setItem(
      commonCookies.NAVIGATED_FROM,
      ApplicationURLS.USER_CONTRACT_LIST_ADD
    );
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
    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  };

  const handleProceedManual = () => {
    setOpenPlanModal(false);
    setstatus("completed");
    formik?.handleSubmit();
  };

  const handleFormCancelClick = () => {
    resetRetainedContractData();
    router.back(); // Send the user back to the previous page
    toast.error("This contract has not been updated.");
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
          if (editSuccess?.client_supplier_type !== "Client") {
            const noticeResponse = await TriggerContractNotices({
              contract_id: editSuccess?.contract_id,
            });

            // Check if the plan is "basic"
            if (planName === "basic") {
              // If the notice was successful, route to /user/notices
              if (noticeResponse) {
                setLoader(false);
                resetRetainedContractData();
                router.push(ApplicationURLS.USER_NOTICES);
                return;
              }
            }
          }
          setLoader(false);
          resetRetainedContractData();
          router.push("/user/contracts/current");
        } else {
          setLoader(false);
        }
      } else {
        const response = await insertContractDetails(data);
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
          if (selectedClientSuplierType !== "Client") {
            const noticeResponse = await TriggerContractNotices({
              contract_id: response?.contract_id,
            });
            // Check if the plan is "basic"
            if (planName === "basic") {
              // If the notice was successful, route to /user/notices
              if (noticeResponse) {
                setLoader(false);
                resetRetainedContractData();
                router.push(ApplicationURLS.USER_NOTICES);
                return;
              }
            }
          }

          setLoader(false);
          resetRetainedContractData();
          router.push("/user/contracts/current");
        } else {
          setLoader(false);
        }
      }
    } catch (error) {
      console.error("Error handling complete:", error);
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
    formik.handleChange("ProjectName")(selectedOption?.value || "");
    setProjectSelectedData({
      value: selectedOption?.project_id,
      label: selectedOption?.label,
    });
    setRoleSelectedData(selectedOption);
    const selectedProject =
      projectOptions.find(
        (project) => project.value === selectedOption?.value
      ) || selectedOption;
    if (selectedProject) {
      formik.setFieldValue("ProjectRole", selectedProject?.project_role);
    }
    if (selectedProject) {
      setSelectedProjectId(Number(selectedProject?.project_id));
    }
  }

  function handleRouteAfterSubmit() {
    if (overviewId) {
      resetRetainedContractData();
      router.push(
        `${ApplicationURLS.USER_PROJECT_OVERVIEW}/${overviewId}?from=contracts`
      );
    } else if (
      complianceOverviewData?.addContract ||
      complianceOverviewData?.editContract
    ) {
      resetRetainedContractData();
      router.push(
        `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.referenceId}&tab=${complianceOverviewData?.typeOfTrustAccount}`
      );
    } else {
      resetRetainedContractData();
      router.back();
    }
  }

  switch (viewPages) {
    case "mainPage":
      return (
        <div>
          {complianceOverviewData && (
            <CheckReload
              persistData={complianceOverviewData}
              afterReload={(data: any) => {
                dispatch(setComplianceOverviewData(data));
              }}
            />
          )}
          <Container fluid>
            <div className={styles?.breadcrumb}>
              <ReusableBreadcrumb
                items={[
                  {
                    href: ApplicationURLS.USER_DASHBOARD,
                    label: "Home",
                    active: routePath === ApplicationURLS.USER_DASHBOARD,
                  },
                  complianceOverviewData?.addContract ||
                  complianceOverviewData?.editContract
                    ? {
                        href: `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.projectId}&tab=${complianceOverviewData?.typeOfTrustAccount}`,
                        label: "Compliance Overview",
                        active: false,
                      }
                    : {
                        href: ApplicationURLS.USER_CONTRACT_LIST_CURRENT,
                        label: "Contracts",
                        active:
                          routePath ===
                          ApplicationURLS.USER_CONTRACT_LIST_CURRENT,
                      },
                  {
                    href: isEdit ? "" : ApplicationURLS.USER_ADD_CONTRACTS,
                    label: isEdit ? "Edit Contract" : "Add Contract",
                    active: isEdit
                      ? routePath.startsWith(
                          ApplicationURLS.USER_EDIT_CONTRACTS
                        )
                      : true,
                  },
                ]}
                separator={
                  <span className={styles.breadcrumbSeparator}>&gt;</span>
                }
              />
            </div>
            <Row>
              <Col className={styles.signInForm}>
                <Form
                  className={styles.formStyles}
                  onSubmit={formik.handleSubmit}
                >
                  <LayoutTextWindowReverse
                    className={styles.contractsIconStyles}
                  ></LayoutTextWindowReverse>
                  <h5 className={styles.title}>
                    {isEdit ? "Edit" : "Add"} Contract
                  </h5>
                  {isEdit && (
                    <>
                      <div className={styles.headingFlexStyles}>
                        <div>
                          <h5 className={styles.SubHeading}>Contract Id -</h5>
                        </div>
                        <div>
                          <h5 className={styles.IdValueSubHeading}>
                            {contractData?.contract_id || ""}
                          </h5>
                        </div>
                      </div>

                      <div className={styles.headingFlexStyles}>
                        <div>
                          <h6 className={styles.DateSubHeading}>Date -</h6>
                        </div>
                        <div>
                          <h6 className={styles.DateSubHeading}>
                            {isEdit &&
                              contractData?.contract_date &&
                              formatDate(contractData?.contract_date)}
                          </h6>
                        </div>
                      </div>
                    </>
                  )}
                  <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      maxLength={150}
                      labelText="Contract name *"
                      name="ContractName"
                      placeholder="Input a contract name"
                      id="ContractName"
                      disabled={disableCondition}
                      value={formik.values.ContractName}
                      onChange={handleAlphaNumericChange}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      className={
                        formik.touched.ContractName &&
                        formik.errors.ContractName
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }
                    />
                    {formik.touched.ContractName &&
                    formik.errors.ContractName ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.ContractName}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.DropdownStyles}>
                    <SearchableSelect
                      key={timeKey}
                      options={clientSupplierOptions}
                      label="Client/Supplier *"
                      singleSelectedData={clientSupplierSelectedData}
                      placeholder="Select client or supplier"
                      onChange={(selectedOption) => {
                        MakePaymentReset();
                        formik.handleChange("ClientSupplier")(
                          selectedOption?.value || ""
                        );
                        setClientSupplierSelectedData({
                          value: selectedOption?.value,
                          label: selectedOption?.label,
                        });
                        formik.setFieldValue(
                          "RelatedEntity",
                          selectedOption?.related_entity
                        );
                        setSelectedRelatedEntity(
                          selectedOption?.related_entity
                        );
                        setSelectedClientSuplierType(
                          selectedOption?.client_supplier_type
                        );
                        setSelectedClientSuplierID(
                          selectedOption?.client_supplier_id
                        );
                      }}
                      disabled={disableCondition}
                      isRequired={
                        !formik.values.ClientSupplier &&
                        formik.touched.ClientSupplier
                          ? true
                          : false
                      }
                      errorMessage={formik.errors.ClientSupplier}
                    />
                  </div>
                  <div className={styles.DropdownStyles}>
                    <SearchableSelect
                      key={timeKey}
                      options={roleOptions}
                      label="Client/Supplier role *"
                      singleSelectedData={clientRoleSelectedData}
                      onChange={(selectedOption) => {
                        formik.setFieldValue(
                          "ClientSupplierRole",
                          selectedOption.value
                        );
                        setClientRoleSelectedData(selectedOption);
                      }}
                      disabled={disableCondition}
                    />
                    {formik.touched.ClientSupplierRole &&
                      formik.errors.ClientSupplierRole && (
                        <div className={`${styles.errorText} ${styles.icon}`}>
                          <ExclamationTriangleFill className={styles.icon} />
                          {formik.errors.ClientSupplierRole}
                        </div>
                      )}
                  </div>
                  <div className={styles.DropdownStyles}>
                    <SearchableSelect
                      key={timeKey}
                      options={projectOptions}
                      label="Project name *"
                      singleSelectedData={projectSelectedData}
                      onChange={(selectedOption) =>
                        handleProjectChange(selectedOption)
                      }
                      disabled={
                        overviewId ||
                        complianceOverviewData?.addContract ||
                        complianceOverviewData?.editContract ||
                        disableCondition
                      }
                      placeholder="Select project"
                      isRequired={
                        !formik.values.ProjectName && formik.touched.ProjectName
                          ? true
                          : false
                      }
                      errorMessage={formik.errors.ClientSupplier}
                    />
                  </div>
                  <div className={styles.textFieldStyles}>
                    <TextField
                      key={timeKey}
                      type="text"
                      labelText="Project role"
                      name="ProjectRole"
                      id="ProjectRole"
                      disabled={true}
                      value={formik.values.ProjectRole}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      className={
                        formik.touched.ProjectRole && formik.errors.ProjectRole
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }
                    />
                  </div>
                  <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      labelText="Related entity type"
                      name="RelatedEntityType"
                      id="RelatedEntityType"
                      disabled={true}
                      value={formik.values.RelatedEntity}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      className={
                        formik.touched.RelatedEntityType &&
                        formik.errors.RelatedEntityType
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }
                    />
                  </div>
                  <div className={styles.DropdownStyles}>
                    <SearchableSelect
                      key={timeKey}
                      options={retentionOptions}
                      singleSelectedData={retentionSelectedData}
                      placeholder="Select retention type"
                      onChange={(selectedOption) => {
                        MakePaymentReset();
                        formik.setFieldValue(
                          "RetentionType",
                          selectedOption.value
                        );
                        setRetentionSelectedData(selectedOption);
                      }}
                      controlStyles={customStyles}
                      label="Retention type *"
                      disabled={disableCondition}
                    />
                    {formik.touched.RetentionType &&
                      formik.errors.RetentionType && (
                        <div className={`${styles.errorText} ${styles.icon}`}>
                          <ExclamationTriangleFill className={styles.icon} />
                          {formik?.errors?.RetentionType as string}
                        </div>
                      )}
                  </div>
                  <div className={styles.textFieldStyles}>
                    <label htmlFor="PaymentTerms" className="pb-1">
                      Payment details *
                      <TooltipInfoIcon tooltipText="Please complete all mandatory fields above to enable adding payment details." />
                    </label>
                    <TextField
                      type="text"
                      onBodyClick={() =>
                        !PaymentdisableCondition &&
                        setViewPages("PaymentDetailsPage")
                      }
                      // labelText="Payment details *"
                      placeholder={
                        isEdit || Object.keys(paymentData).length > 0
                          ? "Payment Details Added"
                          : "Input payment details"
                      }
                      name="PaymentDetails"
                      id="PaymentDetails"
                      errorText={formik.errors.PaymentDetails}
                      isInvalid={
                        formik.touched.PaymentDetails &&
                        formik.errors.PaymentDetails
                          ? true
                          : false
                      }
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={PaymentdisableCondition}
                      endingDataStyles={styles.endIconStyle}
                      className={`${styles.disabledTextField} ${
                        formik.touched.PaymentDetails &&
                        formik.errors.PaymentDetails
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }`}
                      endingData={
                        <div>
                          <CaretRightFill className={styles.editIcon} />
                        </div>
                      }
                    />
                  </div>
                  {/* <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      labelText="Payment terms *"
                      name="PaymentTerms"
                      placeholder="Input business days for payment"
                      id="PaymentTerms"
                      maxLength={2}
                      disabled={disableCondition}
                      rightAlignedText={{
                        text: "days",
                        isVisible: formik.values.PaymentTerms ? true : false,
                      }}
                      value={formik.values.PaymentTerms}
                      onChange={handleAllowOnlyNumbers}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      rightAlignedTextStyles={styles.endTextStyle}
                      className={
                        formik.touched.PaymentTerms &&
                        formik.errors.PaymentTerms
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : formik.values.PaymentTerms
                          ? styles.inputFieldControlWithDays
                          : styles.inputFieldControl
                      }
                    />
                    {formik.touched.PaymentTerms &&
                    formik.errors.PaymentTerms ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.PaymentTerms}
                      </div>
                    ) : null}
                  </div> */}
                  <div className={styles.textFieldStyles}>
                    {/* Wrap the TextField inside OverlayTrigger */}
                    <label htmlFor="PaymentTerms" className="pb-1">
                      Payment terms *
                      <TooltipInfoIcon
                        tooltipText="Under the BIF Act, a progress payment or final payment must be paid by the date stated in the construction contract (due date), or if the contract does not state a due date within 10 business days after the payment claim is given to the respondent.
For some contracts, the due date stated in a contract cannot be greater than the following maximum timeframes set out under the QBCC Act, otherwise they become void and the default timeframe of 10 business days applies:
subcontracts or construction management trade contracts the maximum payment term is 25 business days
commercial building contracts the maximum payment term is 15 business days.
A person given a payment claim, the respondent, must respond to all payment claims."
                      />
                    </label>
                    <TextField
                      type="text"
                      // labelText="Payment terms *"
                      name="PaymentTerms"
                      placeholder="Input business days for payment"
                      id="PaymentTerms"
                      maxLength={2}
                      disabled={disableCondition}
                      rightAlignedText={{
                        text: "days",
                        isVisible: formik.values.PaymentTerms ? true : false,
                      }}
                      value={formik.values.PaymentTerms}
                      onChange={handleAllowOnlyNumbers}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      rightAlignedTextStyles={styles.endTextStyle}
                      className={
                        formik.touched.PaymentTerms &&
                        formik.errors.PaymentTerms
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : formik.values.PaymentTerms
                          ? styles.inputFieldControlWithDays
                          : styles.inputFieldControl
                      }
                    />

                    {formik.touched.PaymentTerms &&
                    formik.errors.PaymentTerms ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.PaymentTerms}
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      labelText="Initial contract sum (excluding GST) *"
                      name="modifiedInitialContractSum"
                      placeholder="Input initial contract sum (as appears in contract)"
                      id="modifiedInitialContractSum"
                      value={formik.values.modifiedInitialContractSum}
                      onChange={handleInitialContractSum}
                      onBlur={formik.handleBlur}
                      disabled={disableCondition}
                      endingDataStyles={styles.endIconStyle}
                      className={`${commonStyles.inputFieldControl} ${
                        (formik.touched.modifiedInitialContractSum &&
                          formik.errors.modifiedInitialContractSum) ||
                        (formik.touched.InitialContractSum &&
                          formik.errors.InitialContractSum)
                          ? `${styles.inputError}`
                          : ""
                      }`}
                    />
                    {(formik.touched.modifiedInitialContractSum &&
                      formik.errors.modifiedInitialContractSum) ||
                    (formik.touched.InitialContractSum &&
                      formik.errors.InitialContractSum) ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.modifiedInitialContractSum ||
                          formik.errors.InitialContractSum}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      onBodyClick={() => setViewPages("UploadContractsPage")}
                      labelText="Upload *"
                      placeholder="Please upload your signed contract"
                      name="Upload"
                      id="Upload"
                      disabled={disableCondition}
                      value={formik.values.Upload}
                      errorText={formik.errors.Upload}
                      isInvalid={
                        formik.touched.Upload && formik.errors.Upload
                          ? true
                          : false
                      }
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      className={`${styles.disabledTextField} ${
                        formik.touched.Upload && formik.errors.Upload
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }`}
                      endingData={
                        <div>
                          <CaretRightFill className={styles.editIcon} />
                        </div>
                      }
                    />
                  </div>
                  {isEdit && (
                    <div className={styles.textFieldStyles}>
                      <TextField
                        type="text"
                        labelText="Status"
                        disabled={true}
                        value={contractData?.contract_status}
                        endingDataStyles={styles.endIconStyle}
                        className={
                          formik.touched.ProjectRole &&
                          formik.errors.ProjectRole
                            ? `${styles.inputFieldControl} ${styles.inputError}`
                            : styles.inputFieldControl
                        }
                      />
                    </div>
                  )}
                  {contractData &&
                    contractData?.contract_status !== "In Progress" && (
                      <FormButton
                        className={styles.buttonStyles}
                        type="button"
                        onClick={() => {
                          setstatus("");
                          formik?.handleSubmit();
                        }}
                        disabled={loader}
                      >
                        {isEdit ? "Update" : "Save"}
                      </FormButton>
                    )}
                  {((selectedClientSuplierType !== "Client" &&
                    !isNoticeSent &&
                    !isEdit) ||
                    (noticeEligible &&
                      isEdit &&
                      selectedClientSuplierType !== "Client" &&
                      !isNoticeSent)) && (
                    <Button
                      className={styles.SecondButtonStyles}
                      type="button"
                      // onClick={() => {
                      //   setstatus("completed");
                      //   formik?.handleSubmit();
                      // }}
                      onClick={handleButtonClick}
                      disabled={loader}
                    >
                      Completed - Send notices
                    </Button>
                  )}
                  <Button
                    className={styles.SkipButtonStyles}
                    type="button"
                    onClick={handleFormCancelClick}
                  >
                    Cancel
                  </Button>
                </Form>
              </Col>
            </Row>
          </Container>
          <AppModal
            show={openPlanModal}
            onHide={handleProceedManual}
            firstButtonLabel="Upgrade Now"
            secondButtonLabel="Proceed with manual notices"
            modalHeading={modalHeading}
            modalBodyTitle=""
            modalBodyContent={modalBodyContent}
            onConfirm={handleConfirm}
          />
        </div>
      );
    case "PaymentDetailsPage":
      return (
        <PaymentDetailsPage
          setViewPages={setViewPages}
          setPaymentData={(val: any) => {
            setPaymentData(val);
            formik.setFieldValue("PaymentDetails", val);
          }}
          SetNoticeEligible={SetNoticeEligible}
          contractType={selectedClientSuplierType}
          paymentDetails={contractData}
          paymentData={paymentData}
          selectedProjectId={selectedProjectID}
          selectedClientSuplierID={selectedClientSuplierID}
          isEdit={isEdit}
          {...formik.values} // pass the rest of the formik values as props
        />
      );

    case "UploadContractsPage":
      return (
        <UploadContract
          setViewPages={setViewPages}
          paymentDetails={contractData}
          setUploadData={setUploadData}
          uploadfile={uploadData}
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
      );
    default:
      return <></>;
  }
};

export default AddEditContracts;
