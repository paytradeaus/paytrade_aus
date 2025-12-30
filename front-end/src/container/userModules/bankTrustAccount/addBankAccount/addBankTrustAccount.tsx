"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Row, Col, Form, Container, Button, Table } from "react-bootstrap";
import styles from "./addBankTrustAccount.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  Bank2,
  CaretRightFill,
  ExclamationTriangleFill,
  Paperclip,
} from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  multipleFileUploadApi,
  ReadFileAttachmentsOrDocuments,
  UpdateFileAttachmentsOrDocuments,
} from "@/app/api/commonAPIs";
import {
  commonCookies,
  DD_MM_YYYY,
  NUMBER_REGEX,
  onlyDOCandPDF,
} from "@/common/constants/general";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "@/app/Toaster";
import { bankAccountTypes } from "../bankTrustAccount.constant";
import commonStyles from "./../../../../common/commonStyles.module.scss";
import ContractDetails from "./contractDetails/contractDetails";
import ProjectDetails from "./projectDetails/projectDetails";
import { getCompanyProfilesWithLogos } from "@/app/api/CompanyRegistrationServices";
import { getCookie } from "cookies-next";
import {
  AddBankAccount,
  EditDetailsOfABankAccount,
  FetchAllBankAccounts,
  FetchBankAccountDetailsForEditing,
  projectArraysCompare,
  TriggerAccountNotices,
} from "../backTrustAccount.functions";
import {
  getClientSupplierLists,
  getProjectsLists,
} from "@/container/contracts/contracts.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { CheckExistenceOfBankAccountNumber } from "@/app/api/existanceAPIsCheck";
import { FileUploadResponseData } from "@/container/adminModules/sendEmailTemplate/sendEmailTemplate.types";
import { useDebouncedFieldCheck, useTokenDetails } from "@/common/commonHooks";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import PulseLoader from "react-spinners/PulseLoader";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { tabId } from "@/container/userProjectOverview/userProjectOverview.constant";
import {
  findSelectedOptions,
  mapDropdownOptions,
} from "@/common/commonFunctions";
import AttachmentPreview from "@/components/AttachmentPreview/AttachmentPreview";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import CheckReload from "@/components/checkReload/checkReload";
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import { AppModal } from "@/components/model/model";
import { AdminlistAllFinancialInstituion } from "@/container/adminModules/financialInstitution/financialInstitutionList/financialInstitutionList.functions";
import { setAddBankAccountDetails } from "@/redux/slices/dashboardSlices";

type VIEW_PAGE_TYPES = "mainPage" | "contactDetailsPage" | "projectListPage";

const AddBankTrustAccount = (props: any) => {
  const { isEdit } = props;
  const params = useParams();
  const queryParams = useSearchParams();
  // const reduxUserMode = useAppSelector(
  //   (state: RootState) => state.userMode.mode
  // );
  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  // const localStorageUserMode =
  //   typeof window !== "undefined" ? localStorage.getItem("userMode") : null;
  // const userModes = reduxUserMode || localStorageUserMode;

  const overviewId = queryParams.get("overview");
  const overviewProjectId = queryParams.get("project");
  const complianceProjectId = queryParams.get("projectId");
  const complianceTabType = queryParams.get("complianceTab");
  const [viewPages, setViewPages] = useState<VIEW_PAGE_TYPES>("mainPage");
  const { decodeTokenData, accessTokenId } = useTokenDetails();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [bankAccountTypeData, setBankAccountTypeData] = useState<any>();

  const router = useRouter();
  const routePath = usePathname();
  const [selectedBankType, setSelectedBankType] = useState("");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [financialInstituteOpt, setFinancialInstituteOpt] = useState([]);
  const [allFinancialInstituteOpt, setAllFinancialInstituteOpt] = useState([]);
  const [financialInstituteData, setFinancialInstituteData] = useState<any>();
  const [projectOpt, setProjectOpt] = useState([]);

  const [projectOptionsData, setProjectOptionsData] = useState<any>();

  const [clientListOpt, setClientListOpt] = useState([]);
  const [clientListOptData, setClientListOptData] = useState<any>();
  const [delegateTypeData, setDelegateTypeData] = useState<any>({
    value: "No",
    label: "No",
  });
  const [contactDetailsData, setContactDetailsData] = useState<any>({});
  const [selectedProjects, setSelectedProjects] = useState<any>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [editData, setEditData] = useState<any>({});
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [selectedBusinessData, setSelectedBusinessData] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountNumberLength, setAccountNumberLength] = useState(0);
  const [triggerBtnStatus, setTriggerBtnStatus] = useState<any>("");
  const DelegateOptions = [
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];
  const [cashAccounts, setCashAccounts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openFinalModal, setOpenFinalModal] = useState(false);
  const [archivedProjectOpt, setArchivedProjectOpt] = useState<any>([]);
  const [viewProjectsInEdit, setViewProjectsInEdit] = useState<any>([]);
  const [planName, setPlanName] = useState<string>("Basic"); // Example state, set accordingly

  const complianceOverviewData: any = useAppSelector(
    (state: any) => state?.complianceOverview?.timeLineData
  );

  // const updatedCompany: any = useAppSelector(
  //   (state: RootState) => state.companyStore.updatedcompany
  // );
  const addBankAccountDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addBankAccountDetails
  );
  const [valuesForSubmit, setValuesForSubmit] = useState<any>();
  const dispatch = useAppDispatch();
  // dispatch(setAddBankAccountDetails({}));
  // console.log(addBankAccountDetails, "addBankAccountDetails");

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      if (isEdit && params?.id?.length !== 2) {
        setWrongIdCheck(true);
        setIsLoading(false);
        return;
      }

      const bankListPostData = {
        account_type: bankAccountTypes[0].value,
        company_id: Number(getCookie("companyId")),
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
        AdminlistAllFinancialInstituion({
          page: null,
          perPage: null,
          keyword: null,
          status: null,
          isAlphabeticalOrder: true,
        }),
        getProjectsLists(selectedCompanyId),
        getProjectsLists(selectedCompanyId, true),
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

        setProjectOpt(modifiedOpt || []);
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
        setClientListOpt(modifiedOpt || []);
      }
      if (availableCashTypes?.total_count) {
        const modifiedData: any = mapDropdownOptions(
          availableCashTypes?.extendedBankAccounts,
          "account_name",
          "bank_account_id"
        );
        setCashAccounts(modifiedData);
      }
      if (isEdit && params?.id?.length === 2) {
        let payload = {
          company_id: Number(params?.id[0]),
          bank_account_id: Number(params?.id[1]),
        };
        let responseData = await FetchBankAccountDetailsForEditing(payload);

        if (responseData?.bank_account_id) {
          if (responseData?.account_type === "Project Trust Account") {
            setContactDetailsData({
              ContractDate: new Date(responseData?.contract_date),
              SubContractDate: new Date(responseData?.first_sub_contract_date),
              ContractCompletionDate: new Date(
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
              setOriginalFiles(filesData);
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
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit && addBankAccountDetails.haveAddedData) {
      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) => each?.value === addBankAccountDetails?.FinancialIns
        ) || {};
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);
      if (addBankAccountDetails?.BankAccountType === "Project Trust Account") {
        let projectOpts =
          [...projectOpt, ...archivedProjectOpt]?.find(
            (each: any) => each?.value === addBankAccountDetails?.ProjectName
          ) || {};
        let clientOpt =
          clientListOpt.find(
            (each: any) =>
              each?.value === addBankAccountDetails?.ClientName?.toString()
          ) || {};
        setClientListOptData(clientOpt);
        setProjectOptionsData(projectOpts);
        setContactDetailsData(addBankAccountDetails?.contactDetailsData);
      }
      if (
        addBankAccountDetails?.BankAccountType === "Retention Trust Account"
      ) {
        setSelectedProjects(addBankAccountDetails?.selectedProjects || []);

        let filterData = archivedProjectOpt?.filter((item: any) =>
          addBankAccountDetails?.selectedProjects.includes(Number(item?.value))
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
      }
    }
  }, [allFinancialInstituteOpt]);
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

      console.log("currentPlanName Plan Name:", currentPlanName);
      setPlanName(currentPlanName || "Basic"); // Assuming setPlanName exists to store the plan name
    }
  }, [selectedCompanyId]);

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
          setProjectOptionsData(findComplianceProject);
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
    let type = queryParams.get("type");
    if (type && type?.length > 0) {
      if (type === "Retention Trust Account") {
        setSelectedBankType(type);
        setBankAccountTypeData({
          value: "Retention Trust Account",
          label: "Retention Trust Account",
        });
        formik.setFieldValue("BankAccountType", type);
      }
      if (type === "Project Trust Account") {
        setSelectedBankType(type);
        setBankAccountTypeData({
          value: "Project Trust Account",
          label: "Project Trust Account",
        });
        formik.setFieldValue("BankAccountType", type);
      }
      if (type === "Cash Account") {
        setSelectedBankType(type);
        setBankAccountTypeData({
          value: "Cash Account",
          label: "Cash Account",
        });
        formik.setFieldValue("BankAccountType", type);
      }
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    if (contactDetailsData?.ContractDate) {
      formik.setFieldValue("headContractId", "contract details added");
    }
  }, [contactDetailsData]);
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
    if (files.length > 0) {
      formik?.setFieldValue("uploaded_file", files);
    } else if (originalFiles.length > 0) {
      formik?.setFieldValue("uploaded_file", originalFiles);
    } else {
      formik?.setFieldValue("uploaded_file", "");
    }
  }, [files, originalFiles]);
  useEffect(() => {
    if (isEdit && editData?.bank_account_id) {
      formik.setValues({
        BankAccountType: editData?.account_type || "Cash Account",
        AccountName: editData?.account_name || "",
        AccountNumber: editData?.account_number || "",
        BsbNumber: editData?.bsb_number || "",
        OpeningDate: new Date(editData?.opening_date) || "",
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
            ? findSelectedOptions(
                cashAccounts,
                editData?.associated_cash_account_id
              )
            : {},
        isNumberExistence: false,
      });

      let DelOpts =
        DelegateOptions.find(
          (each) => each.value === editData?.delegate_powers
        ) || {};
      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) => each?.value === editData?.financial_institution
        ) || {};
      let bankTypeOpt = bankAccountTypes.find(
        (each: any) => each?.value === editData?.account_type
      );
      setBankAccountTypeData(bankTypeOpt);
      setSelectedBankType(editData?.account_type);
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);
      setDelegateTypeData(
        Object.keys(DelOpts).length ? DelOpts : { value: "No", label: "No" }
      );
      if (editData?.account_type === "Project Trust Account") {
        let projectOpts =
          [...projectOpt, ...archivedProjectOpt]?.find(
            (each: any) => each?.value === editData?.project_ids[0].toString()
          ) || {};
        let clientOpt =
          clientListOpt.find(
            (each: any) =>
              each?.value === editData?.client_supplier_id?.toString()
          ) || {};
        setClientListOptData(clientOpt);
        setProjectOptionsData(projectOpts);
      }
      if (editData?.account_type === "Retention Trust Account") {
        setSelectedProjects(
          editData?.project_ids.map((each: any) => each.toString())
        );

        let filterData = archivedProjectOpt?.filter((item: any) =>
          editData?.project_ids.includes(Number(item?.value))
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
      }
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  useEffect(() => {
    if (!isEdit && addBankAccountDetails.haveAddedData) {
      formik.setValues({
        BankAccountType:
          addBankAccountDetails?.BankAccountType || "Cash Account",
        AccountName: addBankAccountDetails?.AccountName || "",
        AccountNumber: addBankAccountDetails?.AccountNumber || "",
        BsbNumber: addBankAccountDetails?.BsbNumber || "",
        OpeningDate: addBankAccountDetails?.OpeningDate
          ? new Date(addBankAccountDetails?.OpeningDate)
          : "",
        FinancialIns: addBankAccountDetails?.FinancialIns || "",
        Trustee:
          addBankAccountDetails?.Trustee ||
          selectedBusinessData[0]?.company_name ||
          "",
        ProjectName:
          addBankAccountDetails?.BankAccountType === "Project Trust Account"
            ? addBankAccountDetails?.ProjectName
            : "",
        ClientName: addBankAccountDetails?.ClientName?.toString() || "",
        headContractId: addBankAccountDetails?.headContractId || "",
        DelegateStatus:
          planName !== "Basic" ? addBankAccountDetails?.DelegateStatus : "No",
        MultiProjects: "",
        associated_cash_account_id:
          addBankAccountDetails?.BankAccountType !== "Cash Account"
            ? addBankAccountDetails?.associated_cash_account_id
            : {},
        isNumberExistence: addBankAccountDetails?.isNumberExistence || false,
      });

      let DelOpts =
        DelegateOptions.find(
          (each) =>
            each.value ===
            (planName !== "Basic"
              ? addBankAccountDetails?.DelegateStatus
              : "No")
        ) || {};

      let bankTypeOpt = bankAccountTypes.find(
        (each: any) => each?.value === addBankAccountDetails?.BankAccountType
      );
      let financialOpts: any =
        allFinancialInstituteOpt.find(
          (each: any) => each?.value === addBankAccountDetails?.FinancialIns
        ) || {};
      setBankAccountTypeData(bankTypeOpt);
      setSelectedBankType(addBankAccountDetails?.BankAccountType);
      setFinancialInstituteData(financialOpts);
      setAccountNumberLength(financialOpts?.maxlengthvalue || 0);
      setDelegateTypeData(
        Object.keys(DelOpts).length ? DelOpts : { value: "No", label: "No" }
      );
      if (addBankAccountDetails?.BankAccountType === "Project Trust Account") {
        let projectOpts =
          [...projectOpt, ...archivedProjectOpt]?.find(
            (each: any) => each?.value === addBankAccountDetails?.ProjectName
          ) || {};
        let clientOpt =
          clientListOpt.find(
            (each: any) =>
              each?.value === addBankAccountDetails?.ClientName?.toString()
          ) || {};
        setClientListOptData(clientOpt);
        setProjectOptionsData(projectOpts);
        setContactDetailsData(addBankAccountDetails?.contactDetailsData);
      }
      if (
        addBankAccountDetails?.BankAccountType === "Retention Trust Account"
      ) {
        setSelectedProjects(addBankAccountDetails?.selectedProjects || []);

        let filterData = archivedProjectOpt?.filter((item: any) =>
          addBankAccountDetails?.selectedProjects.includes(Number(item?.value))
        );

        setViewProjectsInEdit([...projectOpt, ...filterData]);
        setFiles(addBankAccountDetails?.files);
        setSelectedFileNames(addBankAccountDetails?.selectedFileNames);
      }

      setTimeKey(new Date().getTime());
    }
  }, [addBankAccountDetails]);

  useEffect(() => {
    if (addBankAccountDetails?.haveAddedData && planName !== "Basic") {
      formik.handleChange("DelegateStatus")(
        addBankAccountDetails?.DelegateStatus
      );
      let DelOpts =
        DelegateOptions.find(
          (each) => each.value === addBankAccountDetails?.DelegateStatus
        ) || {};
      setDelegateTypeData(
        Object.keys(DelOpts).length ? DelOpts : { value: "No", label: "No" }
      );
    }
  }, [planName]);

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

  const validationSchema = Yup.object().shape({
    AccountName: Yup.string()
      .required("Account Name is required")
      .max(100, "Name must be at most 100 characters")
      .test(
        "includesTrustee",
        "Please include trustee name and the word 'Trust'",
        (value, context) => {
          const { Trustee, BankAccountType } = context?.parent;
          if (BankAccountType === "Cash Account") return true;
          const containsTrustee =
            Trustee.length > 0
              ? value?.toLowerCase().includes(Trustee?.toLowerCase())
              : false;
          // const containsTrust = value.toLowerCase().includes("trust");
          // Check if the word "trust" is included as a full word and not part of another
          const containsTrust = /\btrust\b/i.test(value); // \b for word boundaries

          return containsTrustee && containsTrust;
        }
      ),
    OpeningDate: Yup.string().required("Opening date is required"),
    AccountNumber: Yup.string()
      .required("Account Number is required")
      // .matches(/^\d{6}$/, "BSB number must be exactly 6 digits")
      .test(async function (value, formData: any) {
        if (!value.trim()) return true; // Handle empty account number
        if (isEdit && value === editData?.account_number) return true;
        const regex = new RegExp(`^\\d{${accountNumberLength}}$`);

        if (!regex.test(value)) {
          return this.createError({
            path: this.path,
            message: `Account number length should be ${accountNumberLength} for ${financialInstituteData?.label}.`,
          });
        }

        const AccountNumber = formData?.parent?.isNumberExistence;
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
    FinancialIns: Yup.string().required("Financial Institution is required"),

    ...(selectedBankType === "Project Trust Account" && {
      ProjectName: Yup.string().required("Project is required"),
      ClientName: Yup.string().required("Client is required"),
      headContractId: Yup.string().required("Contract Details is  required"),
      Trustee: Yup.string().required("Trustee Name is required"),
      associated_cash_account_id: Yup.object().required(
        "Cash account is required"
      ),
      DelegateStatus: Yup.string().required("Delegate Power is required"),
    }),
    ...(selectedBankType === "Retention Trust Account" && {
      MultiProjects: Yup.string().required("Project is required"),
      Trustee: Yup.string().required("Trustee Name is required"),
      associated_cash_account_id: Yup.object().required(
        "Cash account is required"
      ),
      DelegateStatus: Yup.string().required("Delegate Power is required"),
    }),
  });

  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
  };

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
      isNumberExistence: false,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setIsLoading(true);
        if (triggerBtnStatus === "completed" && planName === "Basic") {
          setValuesForSubmit(values);
          setOpenFinalModal(true);
          return;
        }
        await handleFinalSubmit(values);
      } catch (error) {
        console.error("Error submitting form:", error);
      } finally {
        setSubmitting(false);
        // setIsSubmitting(false);
      }
    },
  });

  const handleFinalSubmit = async (values: any) => {
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
      } = values;

      const payload: any = {
        // bank_account_id: sequenceId,
        account_name: AccountName,
        account_number: AccountNumber,
        account_type: BankAccountType,
        company_id: selectedCompanyId,
        financial_institution: FinancialIns,
        bsb_number: Number(BsbNumber),
        opening_date: OpeningDate,
        associated_cash_account_id:
          formik?.values?.associated_cash_account_id?.value || null,
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
        // payload.delegate_powers = DelegateStatus;
        payload.contract_date = contactDetailsData?.ContractDate;
        payload.contract_value = parseFloat(amountString);
        payload.contract_practical_completion_date =
          contactDetailsData?.ContractCompletionDate;
        payload.first_sub_contract_date = contactDetailsData?.SubContractDate;
      }

      let fileIds: Array<string> = [];
      if (BankAccountType === "Retention Trust Account" && files.length > 0) {
        let userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Retention_trust_certificates",
        };
        let multiUserData: any[] = [];
        files.forEach((item: any) => multiUserData.push(userData));
        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(files, multiUserData, accessTokenId);
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
        // payload.delegate_powers = DelegateStatus;
        payload.retention_trust_certificate_attachment_ids = isEdit
          ? editData?.retention_trust_certificate_attachment_ids
          : fileIds;
      }
      if (
        isEdit &&
        BankAccountType === "Retention Trust Account" &&
        (originalFiles.length > 0 || fileIds.length > 0)
      ) {
        let originalFileIds = originalFiles.map((each: any) => each?.id) || [];

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
      if (isEdit) {
        if (
          triggerBtnStatus === "completed" &&
          BankAccountType !== "Cash Account"
        ) {
          payload.status = "Open";
        }
        let modifiedPayload = {
          ...payload,
          bank_account_id: editData.bank_account_id,
        };
        const response = await EditDetailsOfABankAccount(
          modifiedPayload,
          "This bank account has been updated"
        );
        if (response) {
          if (triggerBtnStatus === "completed") {
            let triggerRes = await TriggerAccountNotices({
              bank_account_id: editData.bank_account_id,
            });
            if (triggerRes && planName === "Basic") {
              router.push(ApplicationURLS.USER_NOTICES);
              return;
            } else {
              handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
              return;
            }
          } else if (
            BankAccountType === "Retention Trust Account" &&
            editData?.status === "Open" &&
            projectArraysCompare(
              editData?.project_ids,
              modifiedPayload?.project_ids
            )
          ) {
            let triggerRes = await TriggerAccountNotices({
              bank_account_id: editData.bank_account_id,
            });
            if (triggerRes && planName === "Basic") {
              router.push(ApplicationURLS.USER_NOTICES);
              return;
            } else {
              handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
              return;
            }
          } else {
            handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
            return;
          }
        } else {
          setIsLoading(false);
        }
      } else {
        if (BankAccountType !== "Cash Account") {
          payload.status = triggerBtnStatus === "save" ? "Draft" : "Open";
          const response = await AddBankAccount(
            payload,
            "This bank account has been added."
          );
          if (response) {
            if (triggerBtnStatus === "completed") {
              let triggerRes = await TriggerAccountNotices({
                bank_account_id: response,
              });
              if (triggerRes && planName === "Basic") {
                router.push(ApplicationURLS.USER_NOTICES);
                return;
              } else {
                handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
                return;
              }
            } else {
              handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
              return;
            }
          } else {
            setIsLoading(false);
            return;
          }
        } else {
          const response = await AddBankAccount(
            payload,
            "This bank account has been added."
          );
          if (response) {
            handleRoute(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
            return;
          } else {
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleDelegateStatus = (selectedOption: any) => {
    if (selectedOption.value === "Yes" && planName === "Basic") {
      setOpenModal(true);
      // setDelegateTypeData({ value: "No", label: "No" });
      formik.handleChange("DelegateStatus")(selectedOption?.value);
      setDelegateTypeData(selectedOption);
      return;
    } else {
      formik.handleChange("DelegateStatus")(selectedOption?.value);
      setDelegateTypeData(selectedOption);
    }
  };

  const handleFormCancelClick = () => {
    toast.info(
      `This bank account has not been ${isEdit ? "updated" : "added"}.`
    );
    handleRoute();
  };

  function handleRoute(dynamicRoute?: string) {
    dispatch(setAddBankAccountDetails({}));
    if (
      complianceOverviewData?.addBankAccount ||
      complianceOverviewData?.editBankAccount
    ) {
      router.push(
        `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.projectId}&tab=${complianceOverviewData?.typeOfTrustAccount}`
      );
    } else if (overviewId && overviewProjectId) {
      router.push(
        `${ApplicationURLS.USER_PROJECT_OVERVIEW}/${overviewId}?from=${tabId.ACCOUNTS}`
      );
    } else if (complianceTabType && complianceProjectId) {
      router.push(
        `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?tab=${complianceTabType}&project=${complianceProjectId}`
      );
    } else if (dynamicRoute) {
      router.push(dynamicRoute);
    } else {
      router.back(); // Send the user back to the previous page
    }
  }

  const handleNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("AccountName", firstname);
  }, []);
  const handleAccountNumber = useCallback((e: any) => {
    let number = e?.target?.value.trim();

    if (NUMBER_REGEX.test(number) || number === "") {
      formik.setFieldValue("AccountNumber", number);
    }
  }, []);

  const handleBsbNumber = useCallback((e: any) => {
    let number = e?.target?.value.trim();
    if (NUMBER_REGEX.test(number) || number === "") {
      formik.setFieldValue("BsbNumber", number);
    }
  }, []);

  const checkNameExistence = async (num: any) => {
    // Call your API or validation logic for checking email
    const response = await CheckExistenceOfBankAccountNumber(num); // Example API call
    return response;
  };

  const isNumberChecking = useDebouncedFieldCheck(
    formik.values.AccountNumber,
    checkNameExistence,
    () => {
      formik.setFieldError("AccountNumber", "Account Number already exists.");
      formik.setFieldValue("isNumberExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("AccountNumber", "");
      formik.setFieldValue("isNumberExistence", false);
    } // Success: clear error
  );
  const renderBankOptionsTypeSwitch = () => {
    switch (selectedBankType) {
      case "Cash Account":
        return <></>;
      case "Project Trust Account":
        return (
          <>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={projectOpt}
                label="Project *"
                placeholder="Select the Project"
                singleSelectedData={projectOptionsData}
                controlStyles={customStyles}
                onChange={(selectedOption) => {
                  formik.handleChange("ProjectName")(
                    selectedOption?.value || ""
                  );
                  setProjectOptionsData(selectedOption);
                }}
                disabled={
                  editData?.status === "Open" ||
                  complianceOverviewData?.addBankAccount ||
                  complianceOverviewData?.editBankAccount
                    ? true
                    : false
                }
                isRequired={
                  !formik.values.ProjectName && formik.touched.ProjectName
                    ? true
                    : false
                }
                errorMessage={formik.errors.ProjectName}
              />
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={clientListOpt}
                label="Client *"
                placeholder="Select the Client"
                singleSelectedData={clientListOptData}
                controlStyles={customStyles}
                onChange={(selectedOption) => {
                  formik.handleChange("ClientName")(
                    selectedOption?.value || ""
                  );
                  setClientListOptData(selectedOption);
                }}
                disabled={editData?.status === "Open" ? true : false}
                isRequired={
                  !formik.values.ClientName && formik.touched.ClientName
                    ? true
                    : false
                }
                errorMessage={formik.errors.ClientName}
              />
            </div>

            <div
              className={styles.textFieldStyles}
              onClick={() => {
                // let accessClcik = editData?.status === "Open" ? true : false;
                // if (!accessClcik) {
                //   setViewPages("contactDetailsPage");
                // }
                setViewPages("contactDetailsPage");
              }}
            >
              <TextField
                type="text"
                labelText="Contract Details *"
                placeholder="Input Contract Summary for TA1"
                name="Input contract summary for TA1"
                id="Input contract summary for TA1"
                errorText={formik.errors.headContractId}
                required
                isInvalid={
                  formik.touched.headContractId && formik.errors.headContractId
                    ? true
                    : false
                }
                value={formik.values.headContractId}
                // onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                className={`${styles.disabledTextField} ${
                  formik.touched.headContractId && formik.errors.headContractId
                    ? `${styles.inputFieldControl} ${styles.inputError}`
                    : styles.inputFieldControl
                }`}
                // disabled={editData?.status === "Open" ? true : false}
                endingData={
                  <div>
                    <CaretRightFill className={styles.editIcon} />
                  </div>
                }
              />
            </div>
          </>
        );
      case "Retention Trust Account":
        return (
          <>
            <div
              className={styles.textFieldStyles}
              onClick={() => {
                if (projectOpt?.length > 0) {
                  // let clickAccess = editData?.status === "Open" ? true : false;
                  // if (!clickAccess) setViewPages("projectListPage");
                  setViewPages("projectListPage");
                } else {
                  toast.warning("Please add project first");
                }
              }}
            >
              <TextField
                type="text"
                labelText="Project *"
                placeholder="Add a Project"
                name="Add a project"
                id="Add a project"
                errorText={formik.errors.MultiProjects}
                required
                isInvalid={
                  formik.touched.MultiProjects && formik.errors.MultiProjects
                    ? true
                    : false
                }
                value={formik.values.MultiProjects}
                // onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                className={`${styles.disabledTextField} ${
                  formik.touched.MultiProjects && formik.errors.MultiProjects
                    ? `${styles.inputFieldControl} ${styles.inputError}`
                    : styles.inputFieldControl
                }`}
                // disabled={editData?.status === "Open" ? true : false}
                endingData={
                  <div>
                    <CaretRightFill className={styles.editIcon} />
                  </div>
                }
              />
            </div>
            {selectedProjects?.length > 0 && (
              <Table bordered>
                <thead>
                  <tr className="text-center">
                    <th> Project Name</th>
                    <th> ID</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProjects?.length > 0 &&
                    [...projectOpt, ...archivedProjectOpt]?.map((each: any) => {
                      if (selectedProjects.includes(each?.value)) {
                        return (
                          <tr key={each?.id}>
                            <td>{each?.label}</td>
                            <td align="center" width={"60px"}>
                              {each?.value}
                            </td>
                          </tr>
                        );
                      } else {
                        return null;
                      }
                    })}
                </tbody>
              </Table>
            )}
            <div className={styles.textFieldStyles}>
              <div>Retention Trust Training </div>

              <Col className={styles.filesviewContanier}>
                {isEdit &&
                  originalFiles?.map((eachFile: any, index: number) => {
                    return (
                      <div className={styles.eachFielDetailsView} key={index}>
                        <AttachmentPreview
                          uploadedFile={eachFile}
                          onDelete={() => {
                            // Filter out the file that needs to be removed
                            const updatedFiles = originalFiles.filter(
                              (file, i) => i !== index
                            );
                            setOriginalFiles(updatedFiles);
                            let filterNames = selectedFileNames.filter(
                              (each: any) => each !== eachFile?.file_name
                            );
                            setSelectedFileNames(filterNames);
                          }}
                          isMultipleAttachment={true}
                        />
                      </div>
                    );
                  })}
                {files?.map((eachFile: any, index: number) => {
                  return (
                    <div className={styles.eachFielDetailsView} key={index}>
                      <AttachmentPreview
                        uploadedFile={eachFile}
                        onDelete={() => {
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
                        isMultipleAttachment={true}
                      />
                    </div>
                  );
                })}
              </Col>

              {isEdit && files.length + originalFiles.length < 5 && (
                <div className={styles.fileSelectContainer}>
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
                    acceptedFileFormats={onlyDOCandPDF}
                    multiple={true}
                    maximumSize={5 * 1024}
                    onError={(error) => {
                      toast.error(`Max Allowed file size is ${5} Mb`);
                    }}
                  >
                    <span className={styles.fileSelectorContainer}>
                      <Paperclip /> select files
                    </span>
                  </FileSelector>
                </div>
              )}
              {!isEdit && files?.length < 5 && (
                <div className={styles.fileSelectContainer}>
                  <FileSelector
                    handleSave={(files) => {
                      if (files.length > 0) {
                        const fileArray = Array.from(files) as File[];
                        const newFileArray = fileArray.map((file) => {
                          const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                          const newFile = new File([file], newFileName, {
                            type: file.type,
                          });
                          return newFile;
                        });
                        handleFileChange(newFileArray);
                      }
                    }}
                    acceptedFileFormats={onlyDOCandPDF}
                    multiple={true}
                    maximumSize={5 * 1024}
                    onError={(error) => {
                      toast.error(`Max Allowed file size is ${10} Mb`);
                    }}
                  >
                    <span className={styles.fileSelectorContainer}>
                      <Paperclip /> select files
                    </span>
                  </FileSelector>
                </div>
              )}
              {formik.touched.uploaded_file && formik.errors.uploaded_file ? (
                <div className={styles.errorContainer}>
                  <ExclamationTriangleFill
                    className={styles.warningIconStyle}
                  />
                  <span className={styles.errorTextStyles}>
                    {formik.errors.uploaded_file}
                  </span>
                </div>
              ) : null}
            </div>
          </>
        );

      default:
        return <></>;
    }
  };

  function handleRouteFromCompliance() {
    const findTypeOfAccount: any = bankAccountTypes.find(
      (x: any) => x?.value === complianceOverviewData?.typeOfTrustAccount
    );
    if (findTypeOfAccount?.value) {
      setBankAccountTypeData(findTypeOfAccount);
      formik.handleChange("BankAccountType")(findTypeOfAccount?.value);
      setSelectedBankType(findTypeOfAccount?.value);
    }
  }

  switch (viewPages) {
    case "mainPage":
      return (
        <div className={styles.mainCon}>
          {complianceOverviewData && (
            <CheckReload
              persistData={complianceOverviewData}
              afterReload={(data: any) => {
                dispatch(setComplianceOverviewData(data));
              }}
            />
          )}
          {isLoading && (
            <div className={styles.loaderContainer}>
              <PulseLoader
                color={"#1c2475"}
                size={22}
                aria-label="Loading Spinner"
              />
            </div>
          )}
          {!isLoading && (
            <Container fluid>
              <ReusableBreadcrumb
                items={[
                  {
                    href: ApplicationURLS.USER_DASHBOARD,
                    label: "Home",
                    active: routePath === ApplicationURLS.USER_DASHBOARD,
                  },

                  complianceOverviewData?.addBankAccount ||
                  complianceOverviewData?.editBankAccount
                    ? {
                        href: `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceOverviewData?.projectId}&tab=${complianceOverviewData?.typeOfTrustAccount}`,
                        label: "Compliance Overview",
                        active: false,
                      }
                    : {
                        href: ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT,
                        label: "Bank Accounts",
                        active:
                          routePath ===
                          ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT,
                      },
                  {
                    href: "",
                    label: `${isEdit ? "Edit" : "Add"} Bank Account`,
                    active: true,
                  },
                ]}
                separator={<span className={styles.separatorStyle}>&gt;</span>}
              />
              {wrongIdCheck ? (
                <div className={styles.noDataStyle}>
                  No data available on this id
                </div>
              ) : (
                <Row>
                  <Col className={styles.signInForm}>
                    <Form
                      className={styles.formStyles}
                      onSubmit={formik.handleSubmit}
                      noValidate
                    >
                      <Bank2 className={styles.contractsIconStyles}></Bank2>
                      <h5 className={styles.title}>{`${
                        isEdit ? "Edit" : "Add"
                      } Bank Account`}</h5>
                      <div className={styles.DropdownStyles}>
                        <SearchableSelect
                          key={timeKey}
                          options={bankAccountTypes}
                          singleSelectedData={bankAccountTypeData}
                          onChange={(option) => {
                            setBankAccountTypeData(option);
                            formik.handleChange("BankAccountType")(
                              option?.value
                            );
                            setSelectedBankType(option?.value);
                          }}
                          disabled={
                            !!(
                              editData?.status === "Open" ||
                              complianceOverviewData?.addBankAccount ||
                              complianceOverviewData?.editBankAccount
                            )
                          }
                          placeholder="Select Account Type"
                          controlStyles={customStyles}
                          label="Type *"
                          isRequired={
                            !formik.values.BankAccountType &&
                            formik.touched.BankAccountType
                              ? true
                              : false
                          }
                          errorMessage={formik.errors.BankAccountType}
                        />
                      </div>

                      <div className={styles.textFieldStyles}>
                        <TextField
                          type="text"
                          labelText="Account Name *"
                          name="AccountName"
                          placeholder="Add Account Name"
                          id="AccountName"
                          maxLength={100}
                          errorText={formik.errors.AccountName}
                          required
                          isInvalid={
                            formik.touched.AccountName &&
                            formik.errors.AccountName
                              ? true
                              : false
                          }
                          value={formik.values.AccountName}
                          onChange={handleNameChange}
                          onBlur={formik.handleBlur}
                          classNames={commonStyles.inputFieldControl}
                          disabled={editData?.status === "Open" ? true : false}
                        />
                      </div>
                      <div className={styles.DropdownStyles}>
                        <SearchableSelect
                          key={timeKey}
                          options={financialInstituteOpt}
                          label="Financial Institution *"
                          placeholder="Select Financial Institution"
                          singleSelectedData={financialInstituteData}
                          controlStyles={customStyles}
                          onChange={(selectedOption) => {
                            formik.setFieldValue("AccountNumber", "");
                            formik.handleChange("FinancialIns")(
                              selectedOption?.value || ""
                            );
                            setAccountNumberLength(
                              selectedOption?.maxlengthvalue
                            );
                            setFinancialInstituteData(selectedOption);
                          }}
                          disabled={editData?.status === "Open" ? true : false}
                          isRequired={
                            !formik.values.FinancialIns &&
                            formik.touched.FinancialIns
                              ? true
                              : false
                          }
                          errorMessage={formik.errors.FinancialIns}
                        />
                      </div>
                      <div className={styles.textFieldStyles}>
                        <TextField
                          type="text"
                          labelText="Account Number *"
                          name="AccountNumber"
                          placeholder="Account Number"
                          id="AccountNumber"
                          disabled={
                            editData?.status === "Open"
                              ? true
                              : accountNumberLength === 0
                          }
                          maxLength={accountNumberLength}
                          errorText={formik.errors.AccountNumber}
                          required
                          isInvalid={
                            formik.touched.AccountNumber &&
                            formik.errors.AccountNumber
                              ? true
                              : false
                          }
                          value={formik.values.AccountNumber}
                          onChange={handleAccountNumber}
                          onBlur={formik.handleBlur}
                          classNames={commonStyles.inputFieldControl}
                        />
                      </div>
                      <div className={styles.textFieldStyles}>
                        <TextField
                          type="text"
                          labelText="BSB Number *"
                          name="BsbNumber"
                          placeholder="BSB Number"
                          id="BsbNumber"
                          maxLength={6}
                          errorText={formik.errors.BsbNumber}
                          required
                          isInvalid={
                            formik.touched.BsbNumber && formik.errors.BsbNumber
                              ? true
                              : false
                          }
                          value={formik.values.BsbNumber}
                          onChange={handleBsbNumber}
                          onBlur={formik.handleBlur}
                          classNames={commonStyles.inputFieldControl}
                          disabled={editData?.status === "Open" ? true : false}
                        />
                      </div>

                      {selectedBankType &&
                        selectedBankType !== "Cash Account" && (
                          <div className={styles.DropdownStyles}>
                            <SearchableSelect
                              key={timeKey}
                              options={cashAccounts}
                              singleSelectedData={
                                formik?.values?.associated_cash_account_id
                              }
                              onChange={(selectedOption: any) => {
                                formik.setFieldValue(
                                  "associated_cash_account_id",
                                  selectedOption
                                );
                              }}
                              disabled={editData?.status === "Open"}
                              placeholder="Select Cash Type"
                              controlStyles={customStyles}
                              label="Select Cash Account *"
                              isRequired={
                                !!(
                                  !formik.values.associated_cash_account_id &&
                                  formik.touched.associated_cash_account_id
                                )
                              }
                              errorMessage={
                                formik.errors.associated_cash_account_id
                              }
                            />
                          </div>
                        )}

                      <div className={styles.textFieldStyles}>
                        <CustomDatePicker
                          showIcon={true}
                          label="Opening date *"
                          toggleCalendarOnIconClick
                          placeholderText="DD/MM/YYYY"
                          selected={formik?.values?.OpeningDate}
                          value={formik?.values?.OpeningDate}
                          onBlur={formik.handleBlur}
                          onChange={(selectedDate: string) => {
                            formik.setFieldValue("OpeningDate", selectedDate);
                          }}
                          disabled={editData?.status === "Open" ? true : false}
                          format={DD_MM_YYYY}
                          labelStyles={styles.datePickerLabel}
                          maxDate={new Date()}
                          className={
                            formik.touched.OpeningDate &&
                            formik.errors.OpeningDate
                              ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                              : styles.DatePickerCustomStyles
                          }
                        />
                        {formik.touched.OpeningDate &&
                        formik.errors.OpeningDate ? (
                          <div className={styles.errorContainer}>
                            <ExclamationTriangleFill
                              className={styles.warningIconStyle}
                            />
                            <span className={styles.errorTextStyles}>
                              {formik.errors.OpeningDate}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {selectedBankType &&
                        selectedBankType !== "Cash Account" && (
                          <div className={styles.textFieldStyles}>
                            <TextField
                              type="text"
                              labelText="Trustee"
                              name="Trustee"
                              placeholder="Trustee"
                              id="Trustee"
                              errorText={formik.errors.Trustee}
                              required
                              isInvalid={
                                formik.touched.Trustee && formik.errors.Trustee
                                  ? true
                                  : false
                              }
                              value={formik.values.Trustee}
                              // onChange={handleNameChange}
                              onBlur={formik.handleBlur}
                              disabled
                              classNames={commonStyles.inputFieldControl}
                            />
                          </div>
                        )}
                      {renderBankOptionsTypeSwitch()}
                      {selectedBankType && (
                        <div className={styles.DropdownStyles}>
                          <SearchableSelect
                            key={timeKey}
                            options={DelegateOptions}
                            label="Delegate Powers"
                            placeholder="Select Delegated Powers"
                            singleSelectedData={delegateTypeData}
                            onChange={(selectedOption) =>
                              handleDelegateStatus(selectedOption)
                            }
                            disabled={false}
                            controlStyles={customStyles}
                            isRequired={
                              !formik.values.DelegateStatus &&
                              formik.touched.DelegateStatus
                                ? true
                                : false
                            }
                            errorMessage={formik.errors.DelegateStatus}
                          />
                        </div>
                      )}

                      <FormButton
                        className={styles.buttonStyles}
                        disabled={formik?.isSubmitting}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();

                          setTriggerBtnStatus("save");
                          formik.handleSubmit();
                        }}
                      >
                        {isEdit ? "Update" : "Save"}
                      </FormButton>

                      {selectedBankType &&
                        selectedBankType !== "Cash Account" &&
                        (editData?.status === "Draft" || !editData?.status) && (
                          <Button
                            className={styles.SecondButtonStyles}
                            type="button"
                            disabled={formik?.isSubmitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();

                              setTriggerBtnStatus("completed");
                              formik.handleSubmit();
                            }}
                          >
                            {/* {userModes !== "Onboarding"
                              ? "Completed - Send notices"
                              : "Completed"} */}
                            Completed - Send notices
                          </Button>
                        )}

                      <Button
                        className={styles.SkipButtonStyles}
                        type="button"
                        disabled={formik?.isSubmitting}
                        onClick={handleFormCancelClick}
                      >
                        Cancel
                      </Button>
                    </Form>
                  </Col>
                </Row>
              )}
            </Container>
          )}
          <AppModal
            show={openModal}
            onHide={() => setOpenModal(false)}
            cancelfnButtonLabel="Back"
            firstButtonLabel="Upgrade now"
            onConfirm={() => {
              !isEdit &&
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
                    isNumberExistence:
                      formik?.values?.isNumberExistence || false,
                    contactDetailsData: contactDetailsData || {},
                    selectedProjects: selectedProjects || [],
                    files: files,
                    selectedFileNames: selectedFileNames,
                  })
                );
              sessionStorage.setItem(
                commonCookies.NAVIGATED_FROM,
                routePath
                // ApplicationURLS.USER_BANK_ACCOUNTS_ADD
              );
              router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
            }}
            modalHeading={""}
            modalBodyContent={
              "“If you wish Pay Trade to submit your notices automatically to the QBCC, please upgrade your subscription.”"
            }
            onCancel={() => {
              formik.handleChange("DelegateStatus")("No");
              setDelegateTypeData({ value: "No", label: "No" });
              setOpenModal(false);
            }}
          />
          <AppModal
            show={openFinalModal}
            onHide={() => {
              setOpenFinalModal(false);
              setIsLoading(false);
            }}
            cancelfnButtonLabel="Proceed with manual notices"
            firstButtonLabel="Upgrade Now"
            modalHeading={"Upgrade Subscription"}
            closeButton
            onConfirm={() => {
              !isEdit &&
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
                    isNumberExistence:
                      formik?.values?.isNumberExistence || false,
                    contactDetailsData: contactDetailsData || {},
                    selectedProjects: selectedProjects || [],
                    files: files,
                    selectedFileNames: selectedFileNames,
                  })
                );
              sessionStorage.setItem(
                commonCookies.NAVIGATED_FROM,
                routePath
                // ApplicationURLS.USER_BANK_ACCOUNTS_ADD
              );
              router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
            }}
            modalBodyContent={
              "“You have a basic free subscription. Please complete and send the required notices in the notices list or if you would like Pay Trade to auto submit for you, Upgrade now”."
            }
            onCancel={() => {
              setOpenFinalModal(false);
              handleFinalSubmit(valuesForSubmit);
            }}
          />
        </div>
      );

    case "contactDetailsPage":
      return (
        <ContractDetails
          setViewPages={setViewPages}
          contactDetailsData={contactDetailsData}
          setContactDetailsData={setContactDetailsData}
          disabled={editData?.status === "Open" ? true : false}
        />
      );
    case "projectListPage":
      return (
        <ProjectDetails
          projectOpt={isEdit ? viewProjectsInEdit : projectOpt}
          setViewPages={setViewPages}
          selectedProjects={selectedProjects}
          setSelectedProjects={setSelectedProjects}
        />
      );
    default:
      return <></>;
  }
};

export default AddBankTrustAccount;
