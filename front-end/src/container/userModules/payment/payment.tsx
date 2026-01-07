"use client";
import React, { useEffect, useState } from "react";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import Image from "next/image";
import Money from "../../../../public/assets/Money.png";
import styles from "./payment.module.scss";
import { Col, Form, Row, Table, Button } from "react-bootstrap";
import {
  ExclamationTriangleFill,
  PlusCircleFill,
  QuestionCircle,
  TrashFill,
} from "react-bootstrap-icons";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { toast } from "@/app/Toaster";
import {
  commonCookies,
  DD_MM_YYYY,
  SubscriptionPlanTypes,
} from "@/common/constants/general";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  getContractListsForCompany,
  getProjectsLists,
} from "@/container/contracts/contracts.functions";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import {
  addPaymentClaim,
  fetchClientSupplierDetailsForPaymentClaim,
  fetchDetailsOfAPaymentClaim,
  editDetailsOfAPaymentClaim,
  getProjectsListByClientSupplierId,
  getContractsListByClientSupplierId,
  TriggerPaymentClaimNotices,
  fetchDetailsOfAPaymentClaimForImport,
} from "./payments.functions";
import { ALPHANUMERIC } from "@/common/constants/general";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import PaymentClaimAttachments from "./paymentClaimAttachments";
import { useTokenDetails } from "@/common/commonHooks";
import { multipleFileUploadApi } from "@/app/api/commonAPIs";
import {
  useRouter,
  useParams,
  useSearchParams,
  usePathname,
} from "next/navigation";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ReadFileAttachmentsOrDocuments } from "@/app/api/commonAPIs";
import { AppModal } from "@/components/model/model";
import { changeStatusOfAPaymentClaim } from "../payApps/payApps.functions";
import {
  beneficiaryPaymentsModalOptions,
  paymentsModalOptions,
} from "../payApps/payApps.constant";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import { getNoticesListServices } from "../notices/notices.functions";
import {
  formatDate,
  formatDollars,
  getSubscriptionType,
  removeCommas,
} from "@/common/commonFunctions";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import TooltipInfoIcon from "@/components/customToolTip/customToolTip";
import {
  ClientSupplierBankDetails,
  ContractOption,
  customStyles,
  FileUploadResponseData,
  formikInitialValues,
  getTooltipMessage,
  initialUserData,
  ProjectOption,
  RowError,
  UserData,
} from "./payment.constant";
import { useLoaderContext } from "@/context/useLoader";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { SetProjectOverview } from "@/redux/slices/dashboardSlices";
import { SUBSCRIPTION_UPGRADE } from "@/common/constants/messages";
import { setPaymentClaims } from "@/redux/slices/subscribeRouteBackDetails";
import _ from "lodash";

function Payment(props: any) {
  const { isEdit = false, isView = false } = props;

  const ClaimType: any = useSearchParams().get("claim-type");
  const ScreenName = useSearchParams().get("screenname");
  const ScreenType = useSearchParams().get("overtype");
  const CType: any = useSearchParams().get("ctype");
  const Type: any = useSearchParams().get("type");
  const RetentionContractId: any = useSearchParams().get("cid");
  const RetentionProjectId: any = useSearchParams().get("pid");
  const RetentionId: any = useSearchParams().get("rid");
  const CashRetentionType = useSearchParams().get("cash-retention-type");
  const SubPaymentId = useSearchParams().get("sid");
  const queryParams = useSearchParams();
  const ClientSupplierType = queryParams.get("client-supplier-type");
  const ClientSupplierId = queryParams.get("id");
  const paymentType = queryParams.get("payment-type");

  const beneficiaryType: any = queryParams.get("beneficiary");
  const paymentId: any = queryParams.get("payment");
  const Rpaymentid: any = queryParams.get("rpaymentid");
  const importScreen = useSearchParams().get("screen");
  const importCompanyId: any = useSearchParams().get("company_id");
  const ImportUuid: any = useSearchParams().get("importid");

  const routePath = usePathname();

  const dispatch = useAppDispatch();

  const [errors, setErrors] = useState<RowError[]>([]);
  const [gstFormData, setGstFormData] = useState<UserData[]>(() => [
    { ...initialUserData },
  ]);

  const [selectedToggle, setSelectedToggle] = useState<string>(
    CashRetentionType === "RetentionClaim" ? "Retention claim" : "Claim"
  );

  const [selectedToggled, setSelectedToggled] = useState<string>(
    CType || "Receivable"
  );
  const [contractTotal, setContractTotal] = useState(0);
  const [proceedWithExceedingAmount, setProceedWithExceedingAmount] =
    useState(false);

  const [optionalmultiplefiles, setOptionalMultipleFiles] = useState<File[]>(
    []
  );
  const [selectedPaymentType, setSelectedPaymentType] = useState<number>(0);

  const [btndisable, setBtnDisable] = useState<boolean>(false);
  const [optional2multiplefiles, setOptional2MultipleFiles] = useState<File[]>(
    []
  );
  const [compulsorymultiplefiles, setCompulsoryMultipleFiles] = useState<
    File[]
  >([]);
  const [displayNotices, setDisplayNotices] = useState(false);

  const router = useRouter();
  const params = useParams();

  const [openAddPaymentModal, setOpenAddPaymentModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);

  const [projectOptionsData, setProjectOptionsData] = useState<any>();

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const retentionAmount = Number(getCookie("retentionAmount")) || 0;
  const [projectOpt, setProjectOpt] = useState<ProjectOption[]>([]);
  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<any>();
  const [selectedProjectID, setSelectedProjectId] = useState<string>();
  const [selectedContractID, setSelectedContractId] = useState<number>();
  const [subtotal, setSubtotal] = useState<number>(0);
  const [gsttotal, setGsttotal] = useState<number>(0);
  const [claimtotal, setClaimtotal] = useState<number>(0);
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [claimData, setClaimData] = useState<any>({});
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [compulsoryattachmentIds, setCompulsoryAttachmentIds] = useState<
    string[]
  >([]);
  const [isGstregistered, setIsGstRegistered] = useState(true);

  const [optionalattachmentIds, setOptionalAttachmentIds] = useState<string[]>(
    []
  );
  const [optional2attachmentIds, setOptional2AttachmentIds] = useState<
    string[]
  >([]);
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [noticesListData, setNoticesListData] = useState([]);
  const [importDetails, setImportDetails] = useState<any>(null);
  const { setLoader }: any = useLoaderContext();
  const [companyExists, setCompanyExists] = useState(false);
  const [minDate, setMinDate] = useState<Date | undefined>(new Date());
  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan

  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);
  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.claimsData
  );

  const validationSchema = Yup.object().shape({
    ProjectId: Yup.string().required("Project is required"),
    // ContractId: Yup.string().required("Contract is required"),
    ContractId: Yup.object()
      .required("Contract is required")
      .test("has-properties", "Contract is required", function (value) {
        return value && Object.keys(value).length > 0;
      }),
    ReceivedDate: togglePaymentBillables()
      ? Yup.string().required("Received Date is required")
      : Yup.string(),
    DueDate: Yup.string().required("Due Date is required"),
    SentDate: togglePaymentReceivables()
      ? Yup.string().required("Sent Date is required")
      : Yup.string(),
  });

  const formik: any = useFormik({
    initialValues: formikInitialValues,
    validationSchema,
    onSubmit: async () => handleSubmit(),
  });

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const bothIdsPresent =
    ScreenName === "overview" && RetentionProjectId && RetentionContractId;

  const onlyProjectIdPresent =
    ScreenName === "overview" && RetentionProjectId && !RetentionContractId;

  const isToggleDisabled =
    isEdit ||
    ClientSupplierType === "Supplier" ||
    ClientSupplierType === "Client" ||
    importScreen === "import";

  useEffect(() => {
    if (userMode === "Onboarding") {
      setMinDate(undefined); // Allow past dates
    } else {
      setMinDate(new Date()); // Restrict to today and future dates
    }
  }, [userMode]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoader(true); // Show loader
        const { companySpecificRoles } = decodeTokenData || {};

        if (importScreen === "import") {
          // Check if importCompanyId exists in the companySpecificRoles array from the token
          const companyFound = companySpecificRoles?.some(
            (role: any) => role.companyId === Number(importCompanyId)
          );

          if (!companyFound) {
            setCompanyExists(false);
            // If importCompanyId is not found, route to another page
            router.push(ApplicationURLS.USER_LOGIN);
            return;
          }

          // Check if isSystemAdded is true and set the ProfileType accordingly
          const userPrivilage = companySpecificRoles?.find(
            (role: any) => role.companyId === Number(importCompanyId)
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

          // If company is found, set necessary data in storage and cookies
          setCompanyExists(true);
          localStorage.setItem("companyId", importCompanyId);
          dispatch(setCompanyId(importCompanyId));
          setCookie("companyId", importCompanyId);
          // setCookie("redirectAfterLogin", fullRoute);
        }

        if (!ClientSupplierId) {
          const projectListData = await getProjectsLists(
            importScreen === "import"
              ? Number(importCompanyId)
              : selectedCompanyId
          );

          if (projectListData && projectListData?.length > 0) {
            const modifiedOpt = projectListData?.map((each) => ({
              label: each?.project_name,
              value: each?.project_id.toString(),
              project_id: each?.project_id,
            }));
            setProjectOpt(modifiedOpt || []);
          }
        }

        // Set available payment options
        setAvailablePayments(
          beneficiaryType === "Self" || claimData?.beneficiary_type === "Self"
            ? beneficiaryPaymentsModalOptions
            : paymentsModalOptions
        );
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoader(false); // Hide loader when done
      }
    };

    fetchDetails();
  }, [
    importCompanyId,
    importScreen,
    selectedCompanyId,
    ClientSupplierId,
    beneficiaryType,
    claimData,
  ]);

  // Use useEffect if you need to set this based on some dynamic value or if the query params might change
  useEffect(() => {
    if (ClientSupplierType) {
      setSelectedToggled(
        ClientSupplierType === "Supplier" ? "Billable" : "Receivable"
      );
    } else {
      setSelectedToggled(ClaimType || "Receivable");
    }
    const fetchProjects = async () => {
      const projects = await getProjectsListByClientSupplierId({
        client_supplier_id: Number(ClientSupplierId),
      });
      if (projects) {
        const formattedProjects = projects.map((project: any) => ({
          label: project.project_name,
          value: project?.project_id.toString(),
          project_id: project?.project_id,
        }));
        setProjectOpt(formattedProjects || []);
      } else {
        console.error("Failed to fetch project details");
      }
    };

    if (ClientSupplierId) {
      fetchProjects();
    }

    subscriptionConfiguration();
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      if (ImportUuid && companyExists) {
        const result = await fetchDetailsOfAPaymentClaimForImport({
          fetchDetailsOfAPaymentClaimForImportId: ImportUuid,
        });

        if (result) {
          setImportDetails(result);
          setSelectedToggled(result?.claim_type);
          setSelectedToggle(result?.cash_retention_type);
          setClaimtotal(result?.claim_amount);
          setIsGstRegistered(result?.is_gst_optional);
          setSubtotal(result?.sub_total_summary);
          setGsttotal(result?.gst_summary);
          let invoiceArr = result?.invoice_list?.map((item: any) => {
            return {
              type: "",
              description: item?.description || "",
              quantity: item?.quantity || "",
              // price: item?.unit_price || "",
              price: item?.unit_price
                ? formatDollars(item?.unit_price.toFixed(2).toString())
                : "",
              gst: item?.gst || "0.00",
              amount: item?.total_amount_including_gst || "",
            };
          });

          if (invoiceArr && invoiceArr.length > 0) {
            setGstFormData(invoiceArr);
          } else {
            setGstFormData([{ ...initialUserData }, { ...initialUserData }]);
          }
        } else {
          console.error("Failed to fetch details.");
        }
      }
    };

    fetchDetails();
  }, [ImportUuid, companyExists]);

  const fetchContracts = async (projectId: number) => {
    const contracts = await getContractsListByClientSupplierId({
      client_supplier_id: Number(ClientSupplierId),
      project_id: projectId,
    });
    if (contracts) {
      const formattedContracts = contracts.map((contract: any) => ({
        label: contract.contract_name,
        value: contract.contract_id.toString(),
        contract_id: contract.contract_id,
        payment_terms: contract.payment_terms,
      }));
      setContractOptions(formattedContracts || []);
    }
  };

  useEffect(() => {
    const source = isEdit ? claimData : paymentDetails;

    const initialContractSum = source?.initial_contract_sum ?? 0;
    const variationAmount = source?.variation_amount ?? 0;
    const claimAmount = isEdit
      ? claimData?.previous_claim_amount
      : paymentDetails?.claim_amount ?? 0;

    const ContractTotal = initialContractSum + variationAmount - claimAmount;
    setContractTotal(ContractTotal);
    if (isEdit && togglePaymentReceivables()) {
      getNoticesList();
    }
  }, [paymentDetails, claimData, isEdit]);

  async function getNoticesList() {
    setDisplayNotices(true);
    const postData = {
      company_id: selectedCompanyId,
      payment_claim_id: params?.id ? Number(params?.id) : null,
      page: 1,
      items_per_page: 10,
    };
    const response = await getNoticesListServices(postData);

    if (response?.notices_list?.length > 0) {
      setNoticesListData(response?.notices_list);
    } else {
      setNoticesListData([]);
    }
  }

  useEffect(() => {
    if (!isView) {
      if (
        selectedToggle === "Retention claim" &&
        ((isEdit && claimtotal > (claimData?.retained_amount ?? 0)) ||
          (!isEdit && claimtotal > retentionAmount))
      ) {
        setOpenModal(true);
      } else {
        setOpenModal(false); // Close the modal if conditions are not met
      }
    }
  }, [
    selectedToggle,
    isEdit,
    claimtotal,
    claimData?.retained_amount,
    retentionAmount,
  ]);

  useEffect(() => {
    (async () => {
      if (!ClientSupplierId) {
        const projectListData = await getProjectsLists(selectedCompanyId);

        if (
          RetentionProjectId &&
          projectListData &&
          projectListData?.length > 0
        ) {
          let modifiedOpt = projectListData?.map((each) => {
            return {
              label: each?.project_name,
              value: each?.project_id.toString(),
              project_id: each?.project_id,
            };
          });
          const projectOpts =
            (modifiedOpt.find(
              (each: ProjectOption) => each.value === RetentionProjectId
            ) as ProjectOption) || ({} as ProjectOption);

          setProjectOptionsData(projectOpts);
          if (projectOpts?.value) {
            formik.setFieldValue("ProjectId", projectOpts?.value);
            setSelectedProjectId(projectOpts?.project_id?.toString());
            setTimeKey(new Date().getTime());
          }
          // Find the contract in contractOptions array
          const selectedContract: any = contractOptions.find(
            (contract) => contract?.value === RetentionContractId
          );

          // Set ContractId field value if the contract is found
          if (selectedContract) {
            formik.setFieldValue("ContractId", selectedContract);
            setSelectedContractId(selectedContract?.contract_id);
            formik.setFieldValue(
              "PaymentTerms",
              selectedContract?.payment_terms
            );
          }
        }
      }
    })();
  }, [RetentionProjectId, RetentionContractId, contractOptions]);

  useEffect(() => {
    (async () => {
      if (params?.id) {
        const payload: any = {
          payment_claim_id: params?.id ? Number(params?.id) : null,
          company_id: selectedCompanyId,
        };
        const userData = await fetchDetailsOfAPaymentClaim(payload);
        if (userData) {
          setClaimData(userData);
          // Set the default toggle value if isEdit is true
          if (isEdit) {
            setIsGstRegistered(userData?.is_gst_optional);
            setSelectedToggled(userData?.claim_type);
            setSelectedToggle(userData?.cash_retention_type);

            // Array of fileAttachmentOrDocumentTypes
            const attachmentTypes = [
              "Other optional payment claim attachment",
              "Supporting statement attachment",
              "Optional supporting statement attachment", // Add your new attachment type here
            ];

            // Loop through each attachment type and fetch files
            for (const attachmentType of attachmentTypes) {
              let attachPayload = {
                data: {
                  payment_claim_id: userData?.payment_claim_id,
                },
                fileAttachmentOrDocumentType: attachmentType,
              };
              let filesData = await ReadFileAttachmentsOrDocuments(
                attachPayload
              );

              if (filesData?.length > 0) {
                // Update state based on attachment type
                switch (attachmentType) {
                  case "Other optional payment claim attachment":
                    setOptionalMultipleFiles(filesData);
                    setSelectedFileNames(
                      filesData?.map((each: any) => each?.file_name)
                    );
                    break;
                  case "Supporting statement attachment":
                    setCompulsoryMultipleFiles(filesData);
                    setSelectedFileNames(
                      filesData?.map((each: any) => each?.file_name)
                    );
                    break;
                  case "Optional supporting statement attachment":
                    setOptional2MultipleFiles(filesData);
                    setSelectedFileNames(
                      filesData?.map((each: any) => each?.file_name)
                    );
                    break;
                  default:
                    break;
                }
              }
            }
          }
        } else {
          setWorngIdCheck(true);
        }
      }
    })();
  }, [isEdit]);

  useEffect(() => {
    (async () => {
      if (Object.keys(claimData).length > 0) {
        formik.setValues({
          ProjectId: claimData?.project_id || null,
          ContractId: null,
          PaymentTerms: claimData?.payment_terms || null,
          Supplier: claimData?.client_supplier_name || null,
          Address: claimData?.client_supplier_address || null,
          ReceivedDate: claimData?.received_date
            ? new Date(claimData?.received_date)
            : "",
          SentDate: claimData?.sent_date ? new Date(claimData?.sent_date) : "",
          DueDate: claimData?.due_date ? new Date(claimData?.due_date) : "",
          ClaimReference: claimData?.claim_reference || null,
          Memo: claimData?.memo || null,
          PaymentToAccount: claimData?.payment_to_account_type || null,
          PaymentFromAccount: claimData?.payment_from_account_type || null,
          PaymentToAccountName: claimData?.payment_to_account_name || null,
          PaymentToBSB: claimData?.payment_to_account_bsb_number || null,
          PaymentToAccountNumber: claimData?.payment_to_account_number || null,
          PaymentFromAccountName: claimData?.payment_from_account_name || null,
          PaymentFromBSB: claimData?.payment_from_account_bsb_number || null,
          PaymentFromAccountNumber:
            claimData?.payment_from_account_number || null,
          Client: claimData?.client_supplier_name || null,
        });

        const projectListData = await getProjectsLists(selectedCompanyId);

        if (projectListData && projectListData?.length > 0) {
          let modifiedOpt = projectListData?.map((each) => {
            return {
              label: each?.project_name,
              value: each?.project_id.toString(),
              project_id: each?.project_id,
            };
          });
          let projectOpts =
            modifiedOpt?.find(
              (each: any) => each?.value === claimData?.project_id?.toString()
            ) || {};
          setProjectOptionsData(projectOpts);
        }

        fetchContractsForProject(claimData?.project_id);

        let invoiceArr = claimData?.invoices?.map((item: any) => {
          return {
            type: "",
            description: item?.description || "",
            quantity: item?.quantity || "",
            // price: item?.unit_price || "",
            price: item?.unit_price
              ? formatDollars(item?.unit_price.toFixed(2).toString())
              : "",
            gst: item?.gst || "0.00",
            amount: item?.total_amount_including_gst || "",
          };
        });

        if (invoiceArr && invoiceArr.length > 0) {
          setGstFormData(invoiceArr);
        } else {
          setGstFormData([{ ...initialUserData }, { ...initialUserData }]);
        }
        setSubtotal(claimData?.sub_total_summary);
        setGsttotal(claimData?.gst_summary);
        setClaimtotal(claimData?.claim_amount);
      }
    })();
  }, [isEdit, claimData]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedContractID != null) {
        const payload = {
          contract_id: Number(selectedContractID),
          cash_retention_type: selectedToggle,
          payment_id: Rpaymentid ? Number(Rpaymentid) : null,
          // Add other required properties to the payload if needed
        };

        const clientSupplierDetails =
          await fetchClientSupplierDetailsForPaymentClaim(payload);

        if (clientSupplierDetails) {
          // Do something with the client supplier details
          setPaymentDetails(clientSupplierDetails);
          Object.keys(ClientSupplierBankDetails).map((k: any) => {
            formik.setFieldValue(
              k,
              clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
                ? clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
                : ""
            );
          });
        } else {
          Object.keys(ClientSupplierBankDetails).map((k: any) => {
            formik.setFieldValue(k, "");
          });
        }
      }
    };

    fetchData();

    // Cleanup function to prevent memory leaks
    return () => {
      // Cleanup code here if needed
    };
  }, [selectedContractID]); // Run this effect whenever selectedContractID changes

  useEffect(() => {
    if (selectedProjectID != null) {
      fetchContractsForProject();
      // Reset all other fields to empty strings
      formik.setValues({
        ProjectId: formik.values.ProjectId, // Keep the ProjectId value
        ContractId: "",
        PaymentTerms: "",
        Supplier: "",
        Address: "",
        ReceivedDate: "",
        SentDate: "",
        DueDate: "",
        ClaimReference: "",
        Memo: "",
        PaymentToAccount: "",
        PaymentFromAccount: "",
        PaymentToAccountName: "",
        PaymentToBSB: "",
        PaymentToAccountNumber: "",
        PaymentFromAccountName: "",
        PaymentFromBSB: "",
        PaymentFromAccountNumber: "",
        Client: "", // Reset the Client field
      });

      setOptionalMultipleFiles([]);
      setCompulsoryMultipleFiles([]);
    }
  }, [selectedProjectID, selectedToggled]);

  const fetchContractsForProject = async (projectId?: any) => {
    setLoader(true); // Start loader

    try {
      // Check if ClientSupplierId is present, if so, exit early
      if (ClientSupplierId) {
        setLoader(false); // Stop loader since no need to fetch data
        return true;
      }

      const data = {
        company_id: selectedCompanyId,
        project_id: selectedProjectID ? Number(selectedProjectID) : projectId,
        page_number: null,
        page_size: null,
        search: "",
        contract_status: "In Progress",
        isAlphabeticalOrder: true,
        client_supplier_type: togglePaymentReceivables()
          ? "Client"
          : "Supplier", // Determine client or supplier type
      };

      // Fetch contract list
      const contractListData = await getContractListsForCompany(data);

      if (contractListData && contractListData?.contract_list?.length > 0) {
        const modifiedContracts = contractListData?.contract_list?.map(
          (contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id.toString(),
            contract_id: contract?.contract_id.toString(),
            payment_terms: contract?.payment_terms,
          })
        );

        setContractOptions(modifiedContracts || []);

        // If projectId is provided, set the selected contract
        if (projectId) {
          const contractOpts =
            modifiedContracts?.find(
              (each: any) => each?.value === claimData?.contract_id?.toString()
            ) || {};
          formik.setFieldValue("ContractId", contractOpts || null);
        }
      } else {
        setContractOptions([]); // If no contracts are found, clear the options
      }
    } catch (error) {
      console.error("Error fetching contracts:", error); // Handle errors appropriately
    } finally {
      setLoader(false); // Stop loader after completion
    }
  };

  function togglePaymentReceivables() {
    return (
      (selectedToggle === "Claim" && selectedToggled === "Receivable") ||
      (selectedToggle === "Retention claim" && selectedToggled === "Receivable")
    );
  }

  function togglePaymentBillables() {
    return (
      (selectedToggle === "Claim" && selectedToggled === "Billable") ||
      (selectedToggle === "Retention claim" && selectedToggled === "Billable")
    );
  }

  function handleMemoChange(enteredValue: string) {
    if (
      (ALPHANUMERIC.test(enteredValue) || !enteredValue) &&
      enteredValue?.length <= 200
    ) {
      formik?.setFieldValue("Memo", enteredValue);
    }
  }

  function handleNoticesTrigger(proceedWithoutSubscription?: boolean) {
    if (proceedWithoutSubscription) {
      setDisplaySubscriptionModal(false);
      handleSubmit(true);
    } else if (selectedToggled === "Receivable") {
      const isSubscribed: boolean =
        subscriptionPlanName === SubscriptionPlanTypes.BASIC;
      setDisplaySubscriptionModal(isSubscribed);

      return isSubscribed;
    } else {
      return false;
    }
  }

  async function handleSubmit(skipNotices?: boolean) {
    try {
      const { values } = formik || {};
      // Perform row validation on form submission
      let newErrors: RowError[] = [];

      let hasUserEnteredData = false;

      gstFormData.forEach((row, index) => {
        let error: RowError = {};

        if (row.description && (!row.quantity || !row.price)) {
          if (!row.quantity) error.quantity = "Quantity is required";
          if (!row.price) error.price = "Unit Price is required";
        }
        if (row.quantity && (!row.description || !row.price)) {
          if (!row.description) error.description = "Description is required";
          if (!row.price) error.price = "Unit Price is required";
        }
        if (row.price && (!row.description || !row.quantity)) {
          if (!row.description) error.description = "Description is required";
          if (!row.quantity) error.quantity = "Quantity is required";
        }
        if (row.description || row.quantity || row.price) {
          hasUserEnteredData =
            hasUserEnteredData ||
            Boolean(row.description || row.quantity || row.price) ||
            false;
        }

        newErrors[index] = error;
      });

      setErrors(newErrors);

      // Check for validation errors in the table
      const hasErrors = newErrors.some(
        (error) => Object.keys(error).length > 0
      );
      if (hasErrors) {
        toast.error("Please fill all the mandatory fields.");
        return;
      }

      // Check if claim total is less than or equal to 0
      if (hasUserEnteredData && +claimtotal <= 0) {
        toast.error("Claim amount must be greater than zero");
        return;
      }

      if (
        selectedToggle !== "Retention claim" &&
        subtotal > contractTotal &&
        !proceedWithExceedingAmount
      ) {
        setOpenWarningModal(true);
        return; // Exit the function to prevent submission until the modal is confirmed
      }

      if (
        selectedToggle === "Retention claim" &&
        ((isEdit && claimtotal > claimData?.retained_amount) ||
          (!isEdit && claimtotal > retentionAmount))
      ) {
        setOpenModal(true);
        return; // Exit the function to prevent submission until the modal is confirmed
      }
      setBtnDisable(true);

      const filteredData = gstFormData.filter(
        (row) => row.description.trim() !== "" && row.quantity !== ""
      );

      // Map the filtered data to the desired format
      const formData = filteredData.map((row) => ({
        description: row.description,
        gst: row.gst,
        quantity: row.quantity,
        total_amount_including_gst: Number(row.amount),
        unitPrice: row.price,
      }));

      if (formData?.length <= 0) {
        toast.error("Add a line item to continue and save");
        return;
      }

      let compulsoryAttachmentIds: Array<string> = [];
      const newDoc = compulsorymultiplefiles?.filter((item: any) => !item?.id);
      const alreadyDoc = compulsorymultiplefiles?.filter(
        (item: any) => item?.id
      );
      if (alreadyDoc?.length > 0) {
        alreadyDoc.forEach((each: any) =>
          compulsoryAttachmentIds.push(each?.id)
        );
      }

      if (
        newDoc.length > 0 &&
        ((selectedToggle === "Claim" && selectedToggled === "Receivable") ||
          (selectedToggle === "Retention claim" &&
            selectedToggled === "Receivable"))
      ) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Compulsory_attachments",
        };
        const multiUserData: any[] = newDoc.map(() => userData);
        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(newDoc, multiUserData, accessTokenId);

        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: FileUploadResponseData) =>
            compulsoryAttachmentIds.push(each?.id)
          );
          setCompulsoryAttachmentIds(compulsoryAttachmentIds);
        }
      } else if (
        ((selectedToggle === "Claim" && selectedToggled === "Receivable") ||
          (selectedToggle === "Retention claim" &&
            selectedToggled === "Receivable")) &&
        alreadyDoc.length === 0
      ) {
        toast.error("Please add a supporting statement attachment");
        return;
      }

      //display subscription dialog to user before adding a claim
      if (!skipNotices && handleNoticesTrigger()) {
        return true;
      }
      setLoader(true);
      let optionalAttachmentIds: Array<string> = [];
      const newOptionalDoc = optionalmultiplefiles?.filter(
        (item: any) => !item?.id
      );
      const alreadyOptionalDoc = optionalmultiplefiles?.filter(
        (item: any) => item?.id
      );

      if (optionalmultiplefiles?.length > 0) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_attachments",
        };
        const multiUserData: any[] = newOptionalDoc.map(() => userData);
        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(
            newOptionalDoc,
            multiUserData,
            accessTokenId
          );

        if (alreadyOptionalDoc?.length > 0) {
          alreadyOptionalDoc.forEach((each: any) =>
            optionalAttachmentIds.push(each?.id)
          );
        }
        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: FileUploadResponseData) =>
            optionalAttachmentIds.push(each?.id)
          );
          setOptionalAttachmentIds(optionalAttachmentIds);
        }
      }

      let optional2AttachmentIds: Array<string> = [];
      const newOptional2Doc = optional2multiplefiles?.filter(
        (item: any) => !item?.id
      );
      const alreadyOptional2Doc = optional2multiplefiles?.filter(
        (item: any) => item?.id
      );

      if (optional2multiplefiles?.length > 0) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_supporting_statement_attachments",
        };
        const multiUserData: any[] = newOptional2Doc.map(() => userData);
        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(
            newOptional2Doc,
            multiUserData,
            accessTokenId
          );

        if (alreadyOptional2Doc?.length > 0) {
          alreadyOptional2Doc.forEach((each: any) =>
            optional2AttachmentIds.push(each?.id)
          );
        }
        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: FileUploadResponseData) =>
            optional2AttachmentIds.push(each?.id)
          );
          setOptional2AttachmentIds(optional2AttachmentIds);
        }
      }

      let payload: any = {
        claim_reference: values.ClaimReference,
        client_supplier_id: paymentDetails?.client_supplier_id,
        client_supplier_type: paymentDetails?.client_supplier_type,
        company_id: selectedCompanyId,
        contract_id: selectedContractID
          ? Number(selectedContractID)
          : Number(formik.values.ContractId?.value) || null,
        due_date: values.DueDate,
        memo: values.Memo,
        project_id: Number(values.ProjectId),
        status: "Confirmed",
        claim_amount: claimtotal,
        claim_type: selectedToggled,
        cash_retention_type: selectedToggle,
        is_gst_optional: isGstregistered,
        invoices: formData.map((item) => {
          const paymentValues = removeCommas(item.unitPrice);
          const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
          return {
            description: item.description,
            gst: Number(item.gst),
            quantity: Number(item.quantity),
            total_amount_including_gst: item.total_amount_including_gst,
            unit_price: Number(onlyValues) || 0,
          };
        }),
      };

      // Conditionally add associated_retention_sub_payment_id based on CashRetentionType
      if (CashRetentionType === "RetentionClaim") {
        payload = {
          ...payload,
          retention_id: Number(RetentionId),
          associated_retention_sub_payment_id: Number(SubPaymentId), // Replace existingValue with your actual value
        };
      }

      if (togglePaymentReceivables()) {
        payload = {
          ...payload,
          sent_date: values.SentDate || null,
          compulsory_attachment_ids: compulsoryAttachmentIds || [],
          optional_attachment_ids: optionalAttachmentIds || [],
        };
      } else {
        payload = {
          ...payload,
          received_date: values.ReceivedDate || null,
          optional_attachment_ids: optionalAttachmentIds || [],
          optional_supporting_statement_attachment_ids:
            optional2AttachmentIds || [],
        };
      }

      if (isEdit) {
        const modifiedPayload: any = {
          claim_amount: claimtotal,
          contract_id: selectedContractID
            ? Number(selectedContractID)
            : Number(formik.values.ContractId?.value) || null,
          project_id: Number(values.ProjectId) || null,
          claim_reference: formik.values.ClaimReference,
          memo: formik.values.Memo,
          due_date: formik.values.DueDate || null,
          status: "Confirmed",
          payment_claim_id: claimData?.payment_claim_id || null,
          company_id: selectedCompanyId,
          is_gst_optional: isGstregistered,
          invoices: formData.map((item) => {
            const paymentValues = removeCommas(item.unitPrice);
            const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
            return {
              description: item.description,
              gst: Number(item.gst),
              payment_claim_id: claimData?.payment_claim_id || null,
              quantity: Number(item.quantity),
              total_amount_including_gst: item.total_amount_including_gst,
              unit_price: Number(onlyValues) || 0,
            };
          }),
        };

        if (togglePaymentReceivables()) {
          modifiedPayload.sent_date = formik.values.SentDate || null;
          modifiedPayload.compulsory_attachment_ids =
            compulsoryAttachmentIds || [];
          modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
        } else {
          modifiedPayload.received_date = formik.values.ReceivedDate || null;
          modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
          modifiedPayload.optional_supporting_statement_attachment_ids =
            optional2AttachmentIds || [];
        }

        const editresponse = await editDetailsOfAPaymentClaim(modifiedPayload);

        if (editresponse) {
          !togglePaymentBillables() &&
            (await TriggerPaymentClaimNotices({
              payment_claim_id: claimData?.payment_claim_id,
            }));
          resetRetainedClaimsData();
          router.push(
            `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}&retention-type=${selectedToggle}`
          ); // Redirect to the success page
          setTimeout(() => {
            deleteCookie("retentionAmount");
          }, 1000);
        }
      } else {
        const response = await addPaymentClaim(payload);

        if (response) {
          !togglePaymentBillables() &&
            (await TriggerPaymentClaimNotices({
              payment_claim_id: response?.payment_claim_id,
            }));
          resetRetainedClaimsData();
          router.push(
            `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}&retention-type=${selectedToggle}`
          ); // Redirect to the success page
          setTimeout(() => {
            deleteCookie("retentionAmount");
          }, 1000);
        }
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    } finally {
      setBtnDisable(false);
    }
  }

  const handleAddRow = () => {
    const newRows = Array.from({ length: 4 }, () => ({
      type: "",
      description: "",
      quantity: "",
      price: "",
      gst: "",
      amount: "",
    }));

    setGstFormData((prevData) => {
      if (Array.isArray(prevData)) {
        return [...prevData, ...newRows];
      }
      return newRows;
    });
  };

  const handleDeleteRow = (index: number) => {
    const newData = [...gstFormData];
    newData.splice(index, 1);
    setGstFormData(newData);
    // Recalculate subtotal
    const subTotal = calculateSubtotal(newData);
    setSubtotal(Number(subTotal));

    // Recalculate total GST
    const totalgst = calculateTotalGST(newData, isGstregistered);
    setGsttotal(Number(totalgst));

    // Recalculate total
    const total = (parseFloat(subTotal) + parseFloat(totalgst)).toFixed(2);
    setClaimtotal(Number(total));
  };

  const [hoveredRow, setHoveredRow] = useState(null);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const handleHover = (index: any) => {
    setHoveredRow(index);
  };

  const handleMouseLeave = () => {
    setHoveredRow(null);
  };

  const addIntermediateRow = (index: number) => {
    const newData = [...gstFormData];
    // newData.push(index + 1, 0, { ...initialUserData });
    newData.splice(index + 1, 0, { ...initialUserData });
    setGstFormData(newData);
  };

  const calculateSubtotal = (data: UserData[]) => {
    let subtotal = 0;
    data.forEach((row) => {
      const quantity = parseFloat(row.quantity);
      // const price = parseFloat(row.price);
      const paymentValues = removeCommas(row.price);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const price = Number(onlyValues);

      if (!isNaN(quantity) && !isNaN(price)) {
        subtotal += quantity * price;
      }
    });
    return subtotal.toFixed(2);
  };

  const calculateTotalGST = (data: UserData[], isGstRegistered: boolean) => {
    if (!isGstRegistered) return "0.00"; // No GST calculation if unchecked

    let totalGST = 0;
    data.forEach((row) => {
      const gst = parseFloat(row.gst);
      if (!isNaN(gst)) {
        totalGST += gst;
      }
    });
    return totalGST.toFixed(2);
  };

  // Main function to handle contract value formatting
  const handleAmountChange = (e: any, index: number) => {
    let { name, value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    const newData = [...gstFormData];

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      newData[index][name] = "";
      newData[index].gst = "";
      newData[index].amount = "";
      // Recalculate subtotal and totals using updated data
      const subTotal = calculateSubtotal(newData);
      const totalgst = calculateTotalGST(newData, isGstregistered);
      const total = (parseFloat(subTotal) + parseFloat(totalgst)).toFixed(2);

      // Update the state with new values
      setGstFormData(newData);
      setSubtotal(Number(subTotal));
      setGsttotal(Number(totalgst));
      setClaimtotal(Number(total));
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

    // Update form value
    newData[index][name] = formattedValue;
    const quantity = parseFloat(newData[index].quantity);
    const price = parseFloat(rawValue);
    if (isGstregistered) {
      const gstAmount = (quantity * price * 0.1).toFixed(2);
      // If GST is registered, calculate GST
      newData[index].gst = gstAmount;
      newData[index].amount = (
        quantity * price +
        parseFloat(gstAmount)
      ).toFixed(2);
    } else {
      // If GST is not registered, set GST to 0
      newData[index].gst = "0.00";
      newData[index].amount = (quantity * price).toFixed(2);
    }

    // Recalculate subtotal and totals using updated data
    const subTotal = calculateSubtotal(newData);
    const totalgst = calculateTotalGST(newData, isGstregistered);
    const total = (parseFloat(subTotal) + parseFloat(totalgst)).toFixed(2);

    // Update the state with new values
    setGstFormData(newData);
    setSubtotal(Number(subTotal));
    setGsttotal(Number(totalgst));
    setClaimtotal(Number(total));
  };

  const handleNumericInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    try {
      let { name, value } = e.target;

      if (value.replace(".", "").length > 13) {
        return; // Prevent more than 13 numeric characters
      }

      // Allow only numeric values or empty string
      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
        const newData: any = JSON.parse(JSON.stringify(gstFormData));

        newData[index][name] = value;

        // Calculate gst based on the formula 10% * (Quantity * Unit price)
        const quantity = parseFloat(newData[index].quantity);
        const paymentValues = removeCommas(newData[index].price);
        const onlyValues = paymentValues.replace(/[^0-9.]/g, "");

        // const price = parseFloat(newData[index].price);
        const price = Number(onlyValues);

        if (!isNaN(quantity) && !isNaN(price)) {
          if (isGstregistered) {
            const gstAmount = (quantity * price * 0.1).toFixed(2);
            // If GST is registered, calculate GST
            newData[index].gst = gstAmount;
            newData[index].amount = (
              quantity * price +
              parseFloat(gstAmount)
            ).toFixed(2);
          } else {
            // If GST is not registered, set GST to 0
            newData[index].gst = "0.00";
            newData[index].amount = (quantity * price).toFixed(2);
          }
        } else {
          newData[index].gst = "";
          newData[index].amount = "";
        }
        // Recalculate subtotal and totals using updated data
        const subTotal = calculateSubtotal(newData);
        const totalgst = calculateTotalGST(newData, isGstregistered);
        const total = (parseFloat(subTotal) + parseFloat(totalgst)).toFixed(2);

        // Update the state with new values
        setGstFormData(newData);
        setSubtotal(Number(subTotal));
        setGsttotal(Number(totalgst));
        setClaimtotal(Number(total));
      }
    } catch (err: any) {
      console.log("🚀 ~ Payment ~ err:", err);
    }
  };

  const handleDeleteFunction = async (id: string) => {
    setOpenDeleteModal(false); // Close the modal
    try {
      await changeStatusOfAPaymentClaim({
        payment_claim_id: id,
        status: "Deleted",
      });
      resetRetainedClaimsData();
      router.back();
      // Refresh the contract list after deletion
    } catch (error) {
      console.error("Error deleting user from company:", error);
    }
  };

  function handleSelect(selectedvalue: any) {
    setSelectedPaymentType(selectedvalue);

    setOpenAddPaymentModal(false);
    resetRetainedClaimsData();
    router.push(
      `${ApplicationURLS.USER_PAYMENTS}?claim=${claimData?.payment_claim_id}&tab=${Type}&beneficiary=${beneficiaryType}`
    );
  }

  if (selectedPaymentType) {
    setCookie("from_page", ApplicationURLS.USER_PAY_APPS);
    setCookie("PaymentType", selectedPaymentType);
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const newData = [...gstFormData];
    newData[index][name] = value;

    setGstFormData(newData);
  };

  const handleClearAllLines = () => {
    setGstFormData([
      {
        type: "",
        description: "",
        quantity: "",
        price: "",
        gst: "",
        amount: "",
      },
    ]);
    setSubtotal(0);
    setGsttotal(0);
    setClaimtotal(0);
  };

  const handleToggledChange = (value: any) => {
    setSelectedToggled(value);
    setGstFormData([{ ...initialUserData }]);
  };

  const handleSaveAsDraft = async () => {
    if (
      selectedToggle === "Retention claim" &&
      ((isEdit && claimtotal > claimData?.retained_amount) ||
        (!isEdit && claimtotal > retentionAmount))
    ) {
      setOpenModal(true);
      return; // Exit the function to prevent submission until the modal is confirmed
    }
    setBtnDisable(true);
    // Manually submit the form without triggering validation
    const values = formik.values;
    const filteredData = gstFormData.filter(
      (row) => row.description.trim() !== ""
    );

    // Map the filtered data to the desired format
    const formData = filteredData.map((row) => ({
      description: row.description,
      gst: row.gst,
      quantity: row.quantity,
      // total_amount_excluding_gst: Number(row.amount) - Number(row.gst),
      total_amount_including_gst: Number(row.amount),
      unitPrice: row.price,
    }));
    let optionalAttachmentIds: Array<string> = [];
    const newOptionalDoc = optionalmultiplefiles?.filter(
      (item: any) => !item?.id
    );
    const alreadyOptionalDoc = optionalmultiplefiles?.filter(
      (item: any) => item?.id
    );
    if (optionalmultiplefiles.length > 0) {
      let fileIds: Array<string> = [];

      let userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Optional_attachments",
      };
      const multiUserData: any[] = newOptionalDoc.map(() => userData);
      const fileResponse: FileUploadResponseData[] =
        await multipleFileUploadApi(
          newOptionalDoc,
          multiUserData,
          accessTokenId
        );
      if (alreadyOptionalDoc?.length > 0) {
        alreadyOptionalDoc.forEach((each: any) =>
          optionalAttachmentIds.push(each?.id)
        );
      }
      if (fileResponse?.length > 0) {
        fileResponse.forEach((each: FileUploadResponseData) =>
          optionalAttachmentIds.push(each?.id)
        );
        setOptionalAttachmentIds(optionalAttachmentIds);
      }
    }
    let optional2AttachmentIds: Array<string> = [];
    const newOptional2Doc = optional2multiplefiles?.filter(
      (item: any) => !item?.id
    );
    const alreadyOptional2Doc = optional2multiplefiles?.filter(
      (item: any) => item?.id
    );

    if (optional2multiplefiles.length > 0) {
      let userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Optional_supporting_statement_attachments",
      };
      const multiUserData: any[] = newOptional2Doc.map(() => userData);
      const fileResponse: FileUploadResponseData[] =
        await multipleFileUploadApi(
          newOptional2Doc,
          multiUserData,
          accessTokenId
        );
      if (alreadyOptional2Doc?.length > 0) {
        alreadyOptional2Doc.forEach((each: any) =>
          optional2AttachmentIds.push(each?.id)
        );
      }
      if (fileResponse?.length > 0) {
        fileResponse.forEach((each: FileUploadResponseData) =>
          optional2AttachmentIds.push(each?.id)
        );
        setOptional2AttachmentIds(optional2AttachmentIds);
      }
    }
    let compulsoryAttachmentIds: Array<string> = [];

    const newDoc = compulsorymultiplefiles?.filter((item: any) => !item?.id);
    const alreadyDoc = compulsorymultiplefiles?.filter((item: any) => item?.id);
    if (alreadyDoc?.length > 0) {
      alreadyDoc.forEach((each: any) => compulsoryAttachmentIds.push(each?.id));
    }
    if (
      newDoc.length > 0 &&
      ((selectedToggle === "Claim" && selectedToggled === "Receivable") ||
        (selectedToggle === "Retention claim" &&
          selectedToggled === "Receivable"))
    ) {
      let userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Compulsory_attachments",
      };
      const multiUserData: any[] = newDoc.map(() => userData);
      const fileResponse: FileUploadResponseData[] =
        await multipleFileUploadApi(newDoc, multiUserData, accessTokenId);

      if (fileResponse?.length > 0) {
        fileResponse.forEach((each: FileUploadResponseData) =>
          compulsoryAttachmentIds.push(each?.id)
        );
        setCompulsoryAttachmentIds(compulsoryAttachmentIds);
      }
    } else if (
      ((selectedToggle === "Claim" && selectedToggled === "Receivable") ||
        (selectedToggle === "Retention claim" &&
          selectedToggled === "Receivable")) &&
      alreadyDoc.length === 0
    ) {
      console.log("");
    }

    let payload: any = {
      claim_reference: values.ClaimReference,
      client_supplier_id: paymentDetails?.client_supplier_id || null,
      client_supplier_type: paymentDetails?.client_supplier_type || null,
      company_id: selectedCompanyId,
      contract_id: Number(selectedContractID) || null,
      due_date: values.DueDate || null,
      memo: values.Memo,
      project_id: Number(values.ProjectId) || null,
      status: "Draft",
      claim_amount: claimtotal,
      claim_type: selectedToggled,
      cash_retention_type: selectedToggle,
      is_gst_optional: isGstregistered,
      invoices: formData.map((item) => {
        const paymentValues = removeCommas(item.unitPrice);
        const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
        return {
          description: item.description,
          gst: Number(item.gst),
          quantity: Number(item.quantity),
          total_amount_including_gst: item.total_amount_including_gst,
          unit_price: Number(onlyValues) || 0,
        };
      }),
    };

    // Conditionally add associated_retention_sub_payment_id based on CashRetentionType
    if (CashRetentionType === "RetentionClaim") {
      payload = {
        ...payload,
        retention_id: Number(RetentionId),
        associated_retention_sub_payment_id: Number(SubPaymentId), // Replace existingValue with your actual value
      };
    }
    if (togglePaymentReceivables()) {
      payload = {
        ...payload,
        sent_date: values.SentDate || null,
        compulsory_attachment_ids: compulsoryAttachmentIds || [],
        optional_attachment_ids: optionalAttachmentIds || [],
      };
    } else {
      payload = {
        ...payload,
        received_date: values.ReceivedDate || null,
        optional_attachment_ids: optionalAttachmentIds || [],
        optional_supporting_statement_attachment_ids:
          optional2AttachmentIds || [],
      };
    }
    if (isEdit) {
      const modifiedPayload: any = {
        claim_amount: claimtotal,
        claim_reference: formik.values.ClaimReference,
        client_supplier_id: paymentDetails?.client_supplier_id,
        company_id: selectedCompanyId,
        contract_id: selectedContractID
          ? Number(selectedContractID)
          : Number(formik.values.ContractId?.value) || null,
        project_id: Number(values.ProjectId) || null,
        memo: formik.values.Memo,
        due_date: formik.values.DueDate || null,
        payment_claim_id: claimData?.payment_claim_id || null,
        status: "Draft",
        is_gst_optional: isGstregistered,
        invoices: formData.map((item) => {
          const paymentValues = removeCommas(item.unitPrice);
          const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
          return {
            description: item.description,
            gst: Number(item.gst),
            payment_claim_id: claimData?.payment_claim_id || null,
            quantity: Number(item.quantity),
            total_amount_including_gst: item.total_amount_including_gst,
            unit_price: Number(onlyValues) || 0,
          };
        }),
      };
      if (togglePaymentReceivables()) {
        modifiedPayload.sent_date = formik.values.SentDate || null;
        modifiedPayload.compulsory_attachment_ids =
          compulsoryAttachmentIds || [];
        modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
      } else {
        modifiedPayload.received_date = formik.values.ReceivedDate || null;
        modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
        modifiedPayload.optional_supporting_statement_attachment_ids =
          optional2AttachmentIds || [];
      }
      const editresponse = await editDetailsOfAPaymentClaim(modifiedPayload);
      if (editresponse) {
        resetRetainedClaimsData();
        router.push(
          `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}`
        ); // Redirect to the success page
        setTimeout(() => {
          deleteCookie("retentionAmount");
        }, 1000);
      }
    } else {
      const response = await addPaymentClaim(payload);
      // Check if the submission was successful and redirect if it was
      if (response) {
        setBtnDisable(false);
        resetRetainedClaimsData();
        router.push(
          `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}`
        ); // Redirect to the success page
        setTimeout(() => {
          deleteCookie("retentionAmount");
        }, 1000);
      } else {
        setBtnDisable(false);
      }
    }
  };

  function handleNextPayment() {
    setCookie("PaymentType", paymentType);
    resetRetainedClaimsData();
    router.push(
      `${ApplicationURLS.USER_PAYMENTS}?claim=${claimData?.payment_claim_id}&tab=${Type}&next-payment=true`
    );
  }

  function handleViewPayments(isMultiplePayments: boolean) {
    if (isMultiplePayments) {
      router.push(ApplicationURLS.USER_PAYMENTS_LIST_CURRENT);
    } else {
      router.push(
        `${ApplicationURLS.USER_PAYMENTS}?claim=${
          claimData?.payment_claim_id
        }&mode=view&payment=${paymentId}&crt=${
          Type === "Claim" ? "" : "RetentionClaim"
        }`
      );
    }
    resetRetainedClaimsData();
  }

  function handleViewNotices() {
    resetRetainedClaimsData();
    router.push(
      `${ApplicationURLS.USER_NOTICES}?payment-claim=${claimData?.payment_claim_id}`
    );
  }

  const handleGSTChange = (event: any) => {
    const isChecked = event.target.checked;
    setIsGstRegistered(isChecked);

    // Recalculate values instantly based on the new checkbox value
    const newData = [...gstFormData].map((row) => {
      const quantity = parseFloat(row.quantity);
      // const price = parseFloat(row.price);

      const paymentValues = removeCommas(row.price);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const price = Number(onlyValues);
      if (!isNaN(quantity) && !isNaN(price)) {
        if (isChecked) {
          // If checked (GST registered), calculate GST
          row.gst = (quantity * price * 0.1).toFixed(2);
          // row.amount = (quantity * price * 1.1).toFixed(2);
          row.amount = (quantity * price + quantity * price * 0.1).toFixed(2);
        } else {
          // If unchecked (GST not registered), set GST to 0
          row.gst = "0.00";
          row.amount = (quantity * price).toFixed(2);
        }
      }
      return row;
    });

    setGstFormData(newData);

    // Recalculate subtotal and total GST based on the updatedData
    const subTotal = calculateSubtotal(newData);
    const totalgst = calculateTotalGST(newData, isChecked);
    const total = (parseFloat(subTotal) + parseFloat(totalgst)).toFixed(2);

    // Update the state with new values
    setGstFormData(newData);
    setSubtotal(Number(subTotal));
    setGsttotal(Number(totalgst));
    setClaimtotal(Number(total));
  };

  function navigateToNotices(rowData: any) {
    router.push(`${ApplicationURLS.USER_NOTICES_VIEW}/${rowData?.id}`);
  }

  /**
   * Patches claimData from retained claims redux state on route back from subscriptions.
   * This function updates the form, project options, GST registration status, and other related states
   * using retained data from the subscription claims.
   */
  function subscriptionConfiguration() {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name

    if (!_.isEmpty(retainedDataFromSubscription)) {
      formik.setValues(retainedDataFromSubscription);
      setProjectOptionsData(retainedDataFromSubscription?.project);
      setIsGstRegistered(retainedDataFromSubscription?.isGstChecked);
      setSelectedToggle(retainedDataFromSubscription?.isClaimOrRetention);
      setSelectedToggled(retainedDataFromSubscription?.isReceivableOrBillable);
      setGstFormData(retainedDataFromSubscription?.dynamicGridData);
      setSubtotal(Number(retainedDataFromSubscription?.subTotal));
      setGsttotal(Number(retainedDataFromSubscription?.gstTotal));
      setClaimtotal(Number(retainedDataFromSubscription?.claimTotal));
      setOptionalMultipleFiles(
        retainedDataFromSubscription?.optionalPrimaryAttachments || []
      );
      setOptional2MultipleFiles(
        retainedDataFromSubscription?.optionalSecondaryAttachments || []
      );
      setCompulsoryMultipleFiles(
        retainedDataFromSubscription?.compulsoryAttachments || []
      );
      setPaymentDetails(retainedDataFromSubscription?.clientSupplierDetails);
    }
  }

  /**
   * Handles navigation to the subscription upgrade page.
   * Saves the current route in session storage and dispatches subscription-related form data to the state.
   * Redirects the user to the subscription upgrade URL.
   */
  function handleRouteToSubscription() {
    sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
    dispatch(
      setPaymentClaims({
        ...formik.values,
        project: projectOptionsData,
        isGstChecked: isGstregistered,
        dynamicGridData: gstFormData,
        gstTotal: gsttotal,
        subTotal: subtotal,
        claimTotal: claimtotal,
        optionalPrimaryAttachments: optionalmultiplefiles,
        optionalSecondaryAttachments: optional2multiplefiles,
        compulsoryAttachments: compulsorymultiplefiles,
        isClaimOrRetention: selectedToggle,
        isReceivableOrBillable: selectedToggled,
        clientSupplierDetails: paymentDetails,
      })
    );
    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  }

  /**
   * Resets retained claims data in the global state.
   * Checks if there is any retained claims data from a subscription and clears it if present.
   */
  function resetRetainedClaimsData() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setPaymentClaims({}));
    }
  }

  return (
    <ModalFullScreen
      displayFullScreenModal
      onClose={() => {
        if (importScreen === "import") {
          router.push(
            `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}&retention-type=${selectedToggle}`
          );
        } else {
          resetRetainedClaimsData();
          router.back();
        }
      }}
      customButtons={true}
      btnConfig={
        <div className={styles.btnContainer}>
          <Col xs>
            <Button
              onClick={() => {
                if (importScreen === "import") {
                  router.push(
                    `${ApplicationURLS.USER_PAY_APPS}?claim-type=${selectedToggled}&retention-type=${selectedToggle}`
                  );
                }
                if (ScreenName === "overview" && ScreenType === "Project") {
                  dispatch(
                    SetProjectOverview({
                      toScreen: "Addclaim",
                      fromScreen: "ProjectOverview",
                      mainActiveTab: "Claims",
                      selectTab: "",
                      subSelectTab: "",
                    })
                  );
                  router.back();
                } else {
                  resetRetainedClaimsData();
                  router.back();
                }
              }}
            >
              {isView ? "Close" : "Cancel"}
            </Button>
          </Col>
          {/*added/modified below part as vishnu said */}
          {!isView && (
            <Row className={styles.gapStyles}>
              {claimData?.status !== "Confirmed" && (
                <Col
                  lg={3}
                  md={3}
                  sm={12}
                  xs={12}
                  className={styles.paymentButtonsAlign}
                >
                  <Button
                    className={styles.saveStyles}
                    type="button"
                    disabled={btndisable}
                    onClick={handleSaveAsDraft}
                  >
                    Save as Draft
                  </Button>
                </Col>
              )}
              <Col lg={3} md={3} sm={12} xs={12} className="text-end">
                <Button
                  type="submit"
                  disabled={btndisable}
                  className={styles.completeStyles}
                  onClick={formik.handleSubmit}
                >
                  {togglePaymentBillables() ? "Completed" : "Complete and Send"}
                </Button>
              </Col>
            </Row>
          )}
          {isView && (
            <Col
              xl={10}
              lg={10}
              md={10}
              sm={12}
              xs={12}
              className={styles.paymentButtonsAlign}
            >
              {claimData?.claim_overview_buttons?.delete && (
                <Button
                  className={`${styles.button} ${styles.deleteButton} `}
                  type="button"
                  onClick={() => setOpenDeleteModal(true)}
                >
                  Delete
                </Button>
              )}
              {claimData?.claim_overview_buttons?.edit && (
                <Button
                  className={`${styles.button} ${styles.editButton} `}
                  type="button"
                  onClick={() =>
                    router.push(
                      `${ApplicationURLS.USER_PAYMENT_CLAIMS_EDIT}/${
                        claimData?.payment_claim_id
                      }?&cash-retention-type=${
                        claimData?.cash_retention_type === "Retention claim"
                          ? "RetentionClaim"
                          : ""
                      }&ctype=${claimData?.claim_type}`
                    )
                  }
                >
                  Edit
                </Button>
              )}
              {claimData?.claim_overview_buttons?.add_payment && (
                <Button
                  className={`${styles.button} ${styles.editButton} `}
                  onClick={() => setOpenAddPaymentModal(true)}
                >
                  Add Payment
                </Button>
              )}
              {claimData?.claim_overview_buttons?.view_notice && (
                <Button
                  className={styles.editButton}
                  onClick={() => handleViewNotices()}
                >
                  View Notices
                </Button>
              )}
              {claimData?.claim_overview_buttons?.view_payment && (
                <Button
                  className={styles.editButton}
                  onClick={() => handleViewPayments(false)}
                >
                  View Payment
                </Button>
              )}
              {claimData?.claim_overview_buttons?.add_next_payment && (
                <Button
                  className={styles.editButton}
                  onClick={() => handleNextPayment()}
                >
                  Add Next Payment
                </Button>
              )}
              {claimData?.claim_overview_buttons?.view_all_payment && (
                <Button
                  className={styles.editButton}
                  onClick={() => handleViewPayments(true)}
                >
                  View All Payment
                </Button>
              )}
            </Col>
          )}
        </div>
      }
    >
      <div className={styles.dataContainer}>
        <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
          {isEdit ? (
            <Row>
              <Col lg={12} md={12} sm={12}>
                <div className="d-flex">
                  <Image
                    src={Money.src}
                    alt="offer details"
                    layout="responsive"
                    className={styles.imgStyle}
                    width={210}
                    height={220}
                  />
                  <div className="ms-1">
                    <h6>Payment Claim - {claimData?.payment_claim_id}</h6>
                    <div className="d-flex">
                      <div className={styles.statusName}>Status -&thinsp;</div>
                      <div className={styles.paid}>
                        {claimData?.status_in_ui
                          ? claimData?.status_in_ui
                          : claimData?.status}
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          ) : null}
          <div className={styles.typeStyles}>
            <div>
              <div>
                <Row className="w-100">
                  <Col lg={3} md={4} sm={12} xs={12}>
                    <div className="mb-2 mt-4">Claim Type</div>
                    <div>
                      <RadioSwitchToggle
                        radioOptions={[
                          {
                            value: "Claim",
                            label: "Claim",
                            hasError: false,
                          },
                          {
                            value: "Retention claim",
                            label: "Retention claim",
                            hasError: true,
                          },
                        ]}
                        selected={selectedToggle}
                        handleToggleChange={(e: any) => setSelectedToggle(e)}
                        disabled
                      />
                    </div>
                  </Col>
                  <Col lg={3} md={4} sm={12} xs={12} className={styles.switch1}>
                    <div className={styles.radioSwitch}>
                      <RadioSwitchToggle
                        radioOptions={[
                          {
                            value: "Receivable",
                            label: "Receivable",
                            hasError: false,
                          },
                          {
                            value: "Billable",
                            label: "Billable",
                            hasError: true,
                          },
                        ]}
                        selected={selectedToggled}
                        handleToggleChange={handleToggledChange}
                        disabled={isToggleDisabled}
                      />
                    </div>
                    {/* Render the dynamically changing text */}
                  </Col>
                  <Col lg={3} md={2}></Col>
                  <Col lg={3} md={2} sm={12} xs={12} className="text-end">
                    <div className={styles.claimAmt}>
                      <div className={styles.amountName}>Claim Amount</div>
                      <div className={styles.claimAmountStyles}>
                        $
                        {claimtotal
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                      </div>
                    </div>
                    <>
                      {CashRetentionType === "RetentionClaim" && (
                        <div className={styles.statusNameId}>
                          Retention List Id -
                          {claimData?.retention_id || RetentionId || ""}
                        </div>
                      )}
                    </>
                    <div className={styles.disputeStyles}>
                      <div className={styles.box}>
                        <div className={styles.boxStyles}></div>
                        <div>&nbsp;In Dispute</div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </div>

          {/* Selectable option */}
          <>
            <Row className="mt-4">
              <Col lg={3}>
                <SearchableSelect
                  key={timeKey}
                  label="Project *"
                  placeholder="Select project"
                  options={projectOpt}
                  controlStyles={customStyles}
                  selectedData={projectOptionsData}
                  onChange={(selectedOption) => {
                    formik.handleChange("ProjectId")(
                      selectedOption?.value || ""
                    );
                    setProjectOptionsData(selectedOption);
                    // Reset the contract field value to initial
                    formik.handleChange("ContractId")(""); // Set it to an empty string or initial valuec
                    formik.handleChange("PaymentTerms")("");
                    setSelectedContractId(undefined);
                    setTimeKey(new Date().getTime());
                    const selectedProject = projectOpt.find(
                      (project) => project.value === selectedOption?.value
                    );
                    if (selectedProject) {
                      setSelectedProjectId(
                        selectedProject?.project_id.toString()
                      );
                      // Fetch contracts based on the selected project ID
                      fetchContracts(selectedProject.project_id);
                    }
                  }}
                  disabled={
                    bothIdsPresent ||
                    onlyProjectIdPresent ||
                    isView ||
                    (claimData?.status === "Draft" ? false : isEdit) ||
                    selectedToggle === "Retention claim"
                  }
                  isRequired={
                    !formik.values.ProjectId && formik.touched.ProjectId
                      ? true
                      : false
                  }
                  errorMessage={formik.errors.ProjectId}
                />
              </Col>
              <Col lg={3}>
                <SearchableSelect
                  key={timeKey}
                  label="Contract *"
                  placeholder="Select contract"
                  options={contractOptions}
                  disabled={
                    isView ||
                    (claimData?.status === "Draft"
                      ? !formik.values.ProjectId
                      : isEdit || !formik.values.ProjectId) ||
                    selectedToggle === "Retention claim" ||
                    ScreenType === "Contracts"
                  }
                  controlStyles={customStyles}
                  selectedData={formik.values.ContractId}
                  onChange={(selectedOption) => {
                    formik.setFieldValue("ContractId", selectedOption || {});

                    const selectedContract = contractOptions.find(
                      (contract) => contract.value === selectedOption?.value
                    );
                    if (selectedContract) {
                      setSelectedContractId(selectedContract?.contract_id);
                      formik.setFieldValue(
                        "PaymentTerms",
                        selectedContract?.payment_terms
                      );
                    }
                  }}
                />
                {formik.touched.ContractId && formik.errors.ContractId && (
                  <div className={`${styles.errorText} ${styles.icon}`}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.ContractId}
                  </div>
                )}
              </Col>
              {togglePaymentReceivables() && (
                <Col lg={3}>
                  <TextField
                    key={timeKey}
                    labelText="Client"
                    name="Client"
                    id="Client"
                    disabled={true}
                    value={formik.values.Client}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Client && formik.errors.Client
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                </Col>
              )}

              {togglePaymentBillables() && (
                <Col lg={3}>
                  <TextField
                    key={timeKey}
                    labelText="Supplier"
                    name="Supplier"
                    id="Supplier"
                    disabled={true}
                    value={formik.values.Supplier}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Supplier && formik.errors.Supplier
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                </Col>
              )}
              <Col lg={3}>
                <TextField
                  as="textarea"
                  type="text"
                  labelText="Address"
                  name="Address"
                  id="Address"
                  disabled={true}
                  value={formik.values.Address}
                  maxLength={200}
                  endingDataStyles={styles.endIconStyle}
                  classNames={styles.inputFieldControl1}
                />
              </Col>
            </Row>
            <Row className="mt-4">
              <Col lg={3}>
                <TextField
                  key={timeKey}
                  labelText="Payment Terms"
                  name="PaymentTerms"
                  id="PaymentTerms"
                  disabled={true}
                  rightAlignedText={{
                    text: "days",
                    isVisible: formik.values.PaymentTerms ? true : false,
                  }}
                  rightAlignedTextStyles={styles.endTextStyle}
                  value={formik.values.PaymentTerms}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.PaymentTerms && formik.errors.PaymentTerms
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
              </Col>
              <Col lg={3}>
                {togglePaymentReceivables() && (
                  <div>
                    <CustomDatePicker
                      showIcon={true}
                      label="Sent Date *"
                      toggleCalendarOnIconClick
                      placeholderText="DD/MM/YYYY"
                      disabled={isView ? true : false}
                      selected={formik?.values?.SentDate || null}
                      value={formik?.values?.SentDate || null}
                      onChange={(selectedDate: string) => {
                        // formik.setFieldValue("SentDate", selectedDate);
                        if (
                          formik?.values?.DueDate &&
                          formik?.values?.DueDate <= selectedDate
                        ) {
                          formik.setFieldValue("SentDate", selectedDate);
                          formik.setFieldValue("DueDate", selectedDate);
                        } else {
                          formik.setFieldValue("SentDate", selectedDate);
                        }
                      }}
                      format={DD_MM_YYYY}
                      maxDate={new Date()}
                      className={
                        formik.touched.SentDate && formik.errors.SentDate
                          ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                          : styles.DatePickerCustomStyles
                      }
                    />
                    {formik.touched.SentDate && formik.errors.SentDate ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.SentDate}
                      </div>
                    ) : null}
                  </div>
                )}
                {togglePaymentBillables() && (
                  <div>
                    <CustomDatePicker
                      showIcon={true}
                      label="Received Date *"
                      toggleCalendarOnIconClick
                      placeholderText="DD/MM/YYYY"
                      disabled={isView ? true : false}
                      selected={formik?.values?.ReceivedDate}
                      value={formik?.values?.ReceivedDate}
                      onChange={(selectedDate: string) => {
                        // formik.setFieldValue("ReceivedDate", selectedDate);
                        if (
                          formik?.values?.DueDate &&
                          formik?.values?.DueDate <= selectedDate
                        ) {
                          formik.setFieldValue("ReceivedDate", selectedDate);
                          formik.setFieldValue("DueDate", selectedDate);
                        } else {
                          formik.setFieldValue("ReceivedDate", selectedDate);
                        }
                      }}
                      // disabled={false}
                      format={DD_MM_YYYY}
                      maxDate={new Date()}
                      className={
                        formik.touched.ReceivedDate &&
                        formik.errors.ReceivedDate
                          ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                          : styles.DatePickerCustomStyles
                      }
                    />
                    {formik.touched.ReceivedDate &&
                    formik.errors.ReceivedDate ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.ReceivedDate}
                      </div>
                    ) : null}
                  </div>
                )}
              </Col>
              <Col lg={3}>
                <CustomDatePicker
                  showIcon={true}
                  label="Due Date *"
                  disabled={isView ? true : false}
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.DueDate}
                  value={formik?.values?.DueDate}
                  onChange={(selectedDate: string) => {
                    if (
                      formik?.values?.SentDate &&
                      togglePaymentReceivables() &&
                      formik?.values?.SentDate >= selectedDate
                    ) {
                      formik.setFieldValue("DueDate", formik?.values?.SentDate);
                    } else if (
                      formik?.values?.ReceivedDate &&
                      togglePaymentBillables() &&
                      formik?.values?.ReceivedDate >= selectedDate
                    ) {
                      formik.setFieldValue(
                        "DueDate",
                        formik?.values?.ReceivedDate
                      );
                    } else {
                      formik.setFieldValue("DueDate", selectedDate);
                    }
                  }}
                  // disabled={false}
                  format={DD_MM_YYYY}
                  minDate={minDate}
                  className={
                    formik.touched.DueDate && formik.errors.DueDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.DueDate && formik.errors.DueDate ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.DueDate}
                  </div>
                ) : null}
              </Col>
              <Col lg={3}>
                <TextField
                  type="text"
                  labelText="Claim Reference"
                  name="ClaimReference"
                  id="ClaimReference"
                  disabled={isView ? true : false}
                  className={styles.text}
                  value={formik.values.ClaimReference}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
            <Row className="mt-4">
              <Col lg={3}>
                {togglePaymentBillables() && (
                  <div className="mt-3">
                    <TextField
                      key={timeKey}
                      labelText="Payment From Account"
                      name="PaymentFromAccount"
                      id="PaymentFromAccount"
                      disabled={true}
                      value={formik.values.PaymentFromAccount}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      className={
                        formik.touched.PaymentFromAccount &&
                        formik.errors.PaymentFromAccount
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }
                    />
                  </div>
                )}
                <div className="mt-3">
                  <TextField
                    key={timeKey}
                    labelText="Payment To Account"
                    name="PaymentToAccount"
                    id="PaymentToAccount"
                    disabled={true}
                    value={formik.values.PaymentToAccount}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.PaymentToAccount &&
                      formik.errors.PaymentToAccount
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                </div>
              </Col>
              <Col lg={3}>
                <div>
                  {togglePaymentBillables() && (
                    <div className="mt-3">
                      <TextField
                        type="text"
                        labelText="Account Name"
                        name="Name"
                        id="Name"
                        disabled={true}
                        className={styles.text}
                        value={formik.values.PaymentFromAccountName}
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <TextField
                      type="text"
                      labelText="Account Name"
                      name="Name"
                      id="Name"
                      disabled={true}
                      className={styles.text}
                      value={formik.values.PaymentToAccountName}
                    />
                  </div>
                </div>
              </Col>
              <Col lg={3}>
                <div>
                  {togglePaymentBillables() && (
                    <div className="mt-3">
                      <TextField
                        type="text"
                        labelText="BSB"
                        name="Name"
                        id="Name"
                        disabled={true}
                        className={styles.text}
                        value={formik.values.PaymentFromBSB}
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <TextField
                      type="text"
                      labelText="BSB"
                      name="Name"
                      id="Name"
                      disabled={true}
                      className={styles.text}
                      value={formik.values.PaymentToBSB}
                    />
                  </div>
                </div>
              </Col>
              <Col lg={3}>
                <div>
                  {togglePaymentBillables() && (
                    <div className="mt-3">
                      <TextField
                        type="text"
                        labelText="Account Number"
                        name="Name"
                        id="Name"
                        disabled={true}
                        className={styles.text}
                        value={formik.values.PaymentFromAccountNumber}
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <TextField
                      type="text"
                      labelText="Account Number"
                      name="Name"
                      id="Name"
                      disabled={true}
                      className={styles.text}
                      value={formik.values.PaymentToAccountNumber}
                    />
                  </div>
                </div>
              </Col>
            </Row>

            <div className={styles.tableContainer}>
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th style={{ width: "20%" }}>Description *</th>
                    <th>Quantity *</th>
                    <th>Unit Price *</th>
                    <th className={styles.gstColumn}>
                      <div className={styles.gstContainer}>
                        <input
                          type="checkbox"
                          id="gstCheckbox"
                          name="gstCheckbox"
                          disabled={isView || importScreen === "import"}
                          checked={isGstregistered} // Manage with a state variable
                          onChange={handleGSTChange} // Handle the checkbox change event
                          className={styles.gstCheckbox} // Add a class for styling
                        />
                        {"GST (Optional)"}
                        <TooltipInfoIcon
                          tooltipText={
                            isGstregistered
                              ? "Disable this option if this business is not registered for GST "
                              : "Enable this option if this business is registered for GST"
                          }
                        />
                      </div>
                    </th>
                    <th>
                      {/* Change Amount label based on isGstregistered state */}
                      {isGstregistered
                        ? "Amount (including GST)"
                        : "Amount (excluding GST)"}
                    </th>

                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="w-75">
                  {gstFormData?.map((row, index) => (
                    <tr
                      key={index}
                      onMouseEnter={() => handleHover(index)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {" "}
                      <td className={styles.inStyle}>
                        {index + 1}
                        {hoveredRow === index && !isView && (
                          <div
                            onClick={() => addIntermediateRow(index)}
                            className={`${styles.plusIcon} ${styles.dataIcon}`}
                          >
                            <PlusCircleFill />
                          </div>
                        )}
                      </td>
                      <td className={styles.desc}>
                        <input
                          type="text"
                          name="description"
                          value={row.description}
                          disabled={
                            isView ? true : false || importScreen === "import"
                          }
                          onChange={(e) => handleInputChange(e, index)}
                          className={
                            isView || importScreen === "import"
                              ? styles.inputField3
                              : styles.descriptionField
                          }
                        />
                        {errors[index]?.description && (
                          <span className={styles.errorText}>
                            {errors[index].description}
                          </span>
                        )}
                      </td>
                      <td className={styles.quant}>
                        <input
                          type="text"
                          name="quantity"
                          maxLength={5}
                          value={row.quantity}
                          disabled={
                            isView ? true : false || importScreen === "import"
                          }
                          onChange={(e) => handleNumericInputChange(e, index)}
                          className={
                            isView || importScreen === "import"
                              ? styles.inputField3
                              : styles.inputField4
                          }
                        />
                        {errors[index]?.quantity && (
                          <span className={styles.errorText}>
                            {errors[index].quantity}
                          </span>
                        )}
                      </td>
                      <td className={styles.priceStyle}>
                        <input
                          type="text"
                          name="price"
                          value={row.price}
                          disabled={
                            isView ? true : false || importScreen === "import"
                          }
                          // onChange={(e) => handleNumericInputChange(e, index)}
                          onChange={(e) => handleAmountChange(e, index)}
                          className={
                            isView || importScreen === "import"
                              ? styles.inputField3
                              : styles.inputField2
                          }
                        />
                        {errors[index]?.price && (
                          <span className={styles.errorText}>
                            {errors[index].price}
                          </span>
                        )}
                      </td>
                      <td className={styles.gstStyle}>
                        <input
                          type="text"
                          name="gst"
                          disabled={true}
                          // value={row.gst}
                          value={
                            row?.gst
                              ? `$ ${Number(row?.gst)
                                  ?.toFixed(2)
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                              : ""
                          }
                          // onChange={(e) => handleNumericInputChange(e, index)}
                          className={styles.inputField3}
                          style={{ textAlign: "end" }}
                        />
                      </td>
                      <td className={styles.amtStyles}>
                        <input
                          type="text"
                          name="amount"
                          disabled={true}
                          value={
                            row?.amount
                              ? `$ ${Number(row?.amount)
                                  ?.toFixed(2)
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                              : ""
                          }
                          // onChange={(e) => handleInputChange(e, index)}
                          className={styles.inputField}
                          style={{ textAlign: "end" }}
                        />
                      </td>
                      <td>
                        {!isView && (
                          <div className={styles.dotsContainer}>
                            <TrashFill onClick={() => handleDeleteRow(index)} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            {!isView && (
              <div className="d-flex gap-3 mt-4">
                <Button
                  className={styles.buttonStyles3}
                  variant="primary"
                  onClick={handleAddRow}
                >
                  Add Lines
                </Button>
                <Button
                  className={styles.buttonStyles3}
                  onClick={handleClearAllLines}
                >
                  Clear All Lines
                </Button>
              </div>
            )}
            <Row className="mt-3 w-100">
              <Col lg={6} sm={12} xs={12}>
                <TextField
                  as="textarea"
                  type="text"
                  labelText="Memo"
                  name="Memo"
                  id="Memo"
                  disabled={isView ? true : false}
                  maxLength={200}
                  value={formik.values.Memo}
                  onChange={(e: any) => handleMemoChange(e?.target?.value)}
                  endingDataStyles={styles.endIconStyle}
                  classNames={styles.inputFieldControl2}
                />
              </Col>
              <Col lg={6} sm={12} xs={12} style={{ padding: "0px" }}>
                <div className={styles.valueTotal}>
                  <Row className="mt-3">
                    <Col lg={8} sm={4} xs={4} className={styles.amountValues}>
                      Sub Total:
                    </Col>
                    <Col lg={4} sm={8} xs={8} style={{ textAlign: "end" }}>
                      $
                      {subtotal
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col lg={8} sm={4} xs={4} className={styles.amountValues}>
                      GST:
                    </Col>
                    <Col lg={4} sm={8} xs={8} style={{ textAlign: "end" }}>
                      $
                      {gsttotal
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col lg={8} sm={4} xs={4} className={styles.amountValues}>
                      Total:
                    </Col>
                    <Col lg={4} sm={8} xs={8} style={{ textAlign: "end" }}>
                      $
                      {claimtotal
                        ?.toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
            <PaymentClaimAttachments
              selectedToggle={selectedToggle}
              selectedToggled={selectedToggled}
              setOptionalMultipleFiles={setOptionalMultipleFiles}
              setOptional2MultipleFiles={setOptional2MultipleFiles}
              setCompulsoryMultipleFiles={setCompulsoryMultipleFiles}
              optionalmultiplefiles={optionalmultiplefiles}
              optional2multiplefiles={optional2multiplefiles}
              compulsorymultiplefiles={compulsorymultiplefiles}
              isView={isView}
            />
            {isView && (
              <div className="mt-5">
                {displayNotices && <div className={styles.notice}>Notices</div>}

                {togglePaymentReceivables() && (
                  <Table>
                    <thead>
                      <tr>
                        <th>Notice Type</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noticesListData?.length > 0 &&
                        noticesListData?.map((data: any, index: number) => (
                          <tr key={index}>
                            <td>{data?.notice_type}</td>
                            <td>
                              {data?.notice_date
                                ? formatDate(data?.notice_date)
                                : ""}
                            </td>
                            <td>{data?.status}</td>
                            <td className={styles.dotsStyle}>
                              <span
                                className={styles.gridAction}
                                onClick={() => navigateToNotices(data)}
                              >
                                View
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                )}
                {togglePaymentBillables() && (
                  <div className={styles.disclaimerPolicy}>
                    Please pay the total amount on or before the due date for
                    payment. If you are unable to pay the total amount, Please
                    respond with a payment schedule within 15 business days
                    after the date you received this invoice/payment claim as
                    required under the Building Industry Fairness (Security of
                    Payment) ACT 2017
                  </div>
                )}
              </div>
            )}
          </>
        </Form>
        <AppModal
          show={openModal}
          onHide={() => setOpenModal(false)}
          secondButtonLabel="Back"
          secondButtonStyle={styles.closeBtn}
          modalHeading="Retention Claim Exceeds Limit"
          modalBodyTitle=""
          modalBodyContent={
            <div>
              <p className={styles.modelContentStyle}>
                The claim amount is more than the retained amount for the
                beneficiary in the retention trust account. You will need to top
                up the account or transfer beneficial interest.
              </p>
            </div>
          }
          onConfirm={() => {}}
        />
        <AppModal
          show={openWarningModal}
          onHide={() => setOpenWarningModal(false)}
          secondButtonLabel="Cancel"
          firstButtonLabel="Proceed"
          // firstButtonStyle={styles.closeBtn}
          // secondButtonStyle={styles.closeBtn}
          modalTitleStyle={styles.titleStyles}
          modalHeading="Claim Amount Exceeds Contract Value"
          modalBodyTitle=""
          modalBodyContent={
            <div>
              <p className={styles.modelContentStyle}>
                The claim amount is more than the contract value do you want to
                proceed?
              </p>
            </div>
          }
          onConfirm={() => {
            setProceedWithExceedingAmount(true);
            setOpenWarningModal(false);
          }}
        />
        <AppModal
          show={openAddPaymentModal}
          onHide={() => setOpenAddPaymentModal(false)}
          firstButtonStyle={styles.savebtn}
          secondButtonLabel="Close"
          secondButtonStyle={styles.closeBtn}
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={
            <div>
              <div>
                <p className="">
                  {" "}
                  {selectedToggled === "Billable"
                    ? "How do you intend to settle this claim?"
                    : "How did you receive the payment for this claim?"}
                </p>
              </div>
              <div>
                <div className={styles.paymentTypeBtnStyles}>
                  {availablePayments?.length > 0 &&
                    availablePayments.map((paymentType: any, index: number) => (
                      <div key={index} className={styles.paymentTypeWrapper}>
                        <FormButton
                          onClick={() => handleSelect(paymentType?.value)}
                          className={styles.formButtonWithIcon}
                        >
                          {paymentType?.label}
                          <TooltipInfoIcon
                            tooltipText={getTooltipMessage(paymentType?.label)}
                            className={styles.tooltipIcon}
                            icon={<QuestionCircle></QuestionCircle>}
                            iconColor="#FFFFFF"
                          />
                        </FormButton>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          }
        />
        <AppModal
          show={openDeleteModal}
          onHide={() => setOpenDeleteModal(false)}
          firstButtonLabel="Yes"
          secondButtonLabel="No"
          modalHeading=""
          modalBodyTitle=""
          modalBodyContent={
            "Are you sure you wish to move this claim to the archive list with status set to Deleted?"
          }
          onConfirm={() => handleDeleteFunction(claimData?.payment_claim_id)}
        />
        {displaySubscriptionModal && (
          <AppModal
            show={displaySubscriptionModal}
            cancelfnButtonLabel="Proceed with manual notices"
            firstButtonLabel="Upgrade now"
            modalHeading={"Upgrade Subscription"}
            onConfirm={() => handleRouteToSubscription()}
            modalBodyContent={SUBSCRIPTION_UPGRADE}
            onCancel={() => handleNoticesTrigger(true)}
          />
        )}
      </div>
    </ModalFullScreen>
  );
}

export default Payment;
