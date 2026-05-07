"use client";
import React, { useEffect, useRef, useState } from "react";

import { useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import {
  ADD,
  ALPHANUMERIC,
  DEBOUNCE_TIMER,
  EDIT,
  findSelectedOptions,
  getCurrentUtcTime,
  InputType,
  NUMBER_REGEX,
  quickAddRoutes,
  VIEW,
} from "@/shared/constant/general";
import * as Yup from "yup";

import GooglePlacesInput from "@/components/GooglePlaces";
import {
  commonCookies,
  convertCanvasToFile,
  getCompanyIdFromStorage,
  handleSelectedImage,
} from "@/utils";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  insertProjectDetails,
  CreateProjectInput,
  getProjectListsForCompany,
  createProjectInPaytradeFromXeroData,
} from "../ProjectList/projects.functions";
import { every, isEqual, omit, some } from "lodash";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckExistenceForProject,
  editProjectDetailsById,
  viewProjectDetails,
} from "./AddProject.functions";
import { roleTypeOptions } from "../ProjectList/projects.constant";
import {
  ptaEligibleOptions,
  retentionTypedOptions,
  roleTypedOptions,
  rtaEligibleOptions,
  statusOptions,
} from "./Addproject.constant";
import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { quickAddOnRoute } from "../../AddUpdateBankAccount/AddUpdateBankAccount.constant";
import { ApiResponse } from "@/shared/constant/messages";
import { useCustomDebounce } from "@/hooks";
import { getSubscriptionDetailsByCompanyId } from "../../Subscriptions/subscriptions.function";
import { viewXeroSyncLog } from "../../UserIntegrations/integration.functions";
import { CreateOrUpdateProjectInPaytrade } from "../../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";
interface Option {
  value: string;
  label: string;
}

const AddProjects = (props: any) => {
  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required("Name is required")
      .test("name", function (value, formData: any) {
        const isProjectNameExist = formData.parent.isProjectNameExist;
        if (!value) return true; // Allow empty values
        if (isProjectNameExist) {
          return formData.createError({
            path: formData.path,
            message: "Name already exists",
          });
        }
        return true;
      }),
    description: Yup.string().required("Description is required"),
    headSum: Yup.string().required("Head contract sum is required"),
    modifiedheadSum: Yup.string().required("Head contract sum is required"),
    units: Yup.string().required("Units is required"),
    rta: Yup.object().required("RTA eligibility is required"),
    pta: Yup.object().required("PTA eligibility is required"),
    project: Yup.object(),
    role: Yup.object().required("Role is required"),
    retention: Yup.object().required("Retention type is required"),
    Address: Yup.string().required("Address is required"),
  });
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [isLoading, setIsLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const { setActionScreen, isEdit = false, ...rest } = props;
  const [unitsSelectedData, setUnitsSelectedData] = useState<any>({}); // State for units options
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const params = useParams();
  const queryParams = useSearchParams();
  const quickAddProject: any = queryParams.get("quick-add");
  const syncId = queryParams.get("syncId");
  const errorCode = queryParams.get("errorCode");
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [userLimit, setUserLimit] = useState<number | null>(null);

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editProjectId, setEditProjectId] = useState<any>();
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);
  const contractCount = editData?.contract_count;
  const [selectedroleType, setSelectedroleType] = useState("");
  const [selectedprojectType, setSelectedprojectType] = useState<any>();
  const [selectedretentionType, setSelectedretentionType] = useState("");
  const [selectedptaEligibleType, setSelectedptaEligibleType] = useState("");
  const [selectedrtaEligibleType, setSelectedrtaEligibleType] = useState("");
  const [isViewMode, setIsViewMode] = useState(false);
  const dispatch = useAppDispatch();
  const [editProjectDate, setEditProjectDate] = useState<string>("");
  const [routedData, setRoutedData] = useState<any>(null);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [syncLogData, setSyncLogData] = useState<any>("");

  const [initialFormikValues, setInitialFormikValues] = useState<any>();
  const unitsOptions = [
    { value: "1", label: 1 },
    { value: "2", label: 2 },
    {
      value: "3",
      label: 3,
    },
  ];
  let statusOptions = [
    { value: "Completed", label: "Completed" },
    { value: "Deleted", label: "Deleted" },
    { value: "In Progress", label: "In Progress" },
  ];
  const draftOption = { value: "Draft", label: "Draft" };
  const inProgressOnly = [{ value: "In Progress", label: "In Progress" }];

  // Check if editData is an empty object
  const isEditDataEmpty =
    !editData ||
    (Object.keys(editData).length === 0 && editData.constructor === Object);

  let filteredStatusOptions = [...statusOptions];

  // Case: project_status is Draft → remove Completed & Deleted
  if (editData?.project_status === "Draft") {
    filteredStatusOptions = filteredStatusOptions.filter(
      (opt) => opt.value !== "Completed" && opt.value !== "Deleted"
    );
  }

  // Case: show only "In Progress" if editData is empty
  if (isEditDataEmpty) {
    filteredStatusOptions = inProgressOnly;
  }

  // Case: prepend "Draft" if project_role is null or "null" and isEdit
  const shouldAddDraftOption =
    (!editData?.project_role || editData.project_role === "null") && isEdit;

  const finalOptions = shouldAddDraftOption
    ? [draftOption, ...filteredStatusOptions]
    : filteredStatusOptions;

  const setSelectedData = (
    selectedValue: string,
    optionsArray: Option[] | any,
    setterFunction: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const selectedOption = optionsArray.find(
      (opt: Option) => opt?.value === selectedValue
    );
    console.log("selectedOption", selectedOption);

    if (selectedOption) {
      setterFunction(selectedOption?.value);
    } else {
      setterFunction("");
    }
  };
  const handleHeadSumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("modifiedheadSum", ""); // Clear formatted value
      formik.setFieldValue("headSum", ""); // Clear raw value
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

    formik.setFieldValue("modifiedheadSum", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("headSum", finalValue); // Raw numeric value
  };

  if (!isEdit) {
    // If it's not an edit mode, show only the "In progress" option
    statusOptions = [{ value: "In Progress", label: "In Progress" }];
  }
  const formik = useFormik({
    initialValues: {
      name: isEdit ? editData?.project_name : "",
      isProjectNameExist: false,
      description: isEdit ? editData?.project_description : "",
      Address: isEdit ? editData?.site_address : "",
      headSum: isEdit ? editData?.head_contract_sum : "",
      modifiedheadSum: "",
      units: isEdit ? editData?.number_of_units : "",
      retention: isEdit ? editData?.retention_type?.value : "",
      rta: isEdit ? editData?.rta_eligibility?.value : "",
      pta: isEdit ? editData?.pta_eligibility?.value : "",
      role: isEdit ? editData?.project_role?.value : "",
      // Default 'project_status' to "In Progress" if it isn't defined
      project:
        isEdit && editData?.project_status
          ? editData?.project_status
          : "In Progress",
    },
    validationSchema,
    // onSubmit: async (values) => {
    //   // Use placeDetails state variable here
    //   if (!placeDetails) {
    //     console.error("Place details are not available");
    //   }
    //   const {
    //     name,
    //     description,
    //     Address,
    //     headSum,
    //     units,
    //     retention,
    //     rta,
    //     pta,
    //     role,
    //     project,
    //   } = formik.values;

    //   let payload = {
    //     name: formik?.values?.name,
    //     description: formik?.values?.description,
    //     Address: formik?.values?.Address,
    //     headSum: formik?.values?.headSum,
    //     units: formik?.values?.units,
    //     retention: formik?.values?.retention?.value,
    //     rta: formik?.values?.rta?.value,
    //     pta: formik?.values?.pta?.value,
    //     role: formik?.values?.role?.value,
    //     project: formik?.values?.project?.value,
    //   };
    //   setIsLoading(true);
    //   if (isEdit) {
    //     if (
    //       editData?.project_name === name &&
    //       editData?.project_description === description &&
    //       editData?.site_address === Address &&
    //       editData?.head_contract_sum === headSum &&
    //       editData?.number_of_units === units &&
    //       editData?.retention_type?.value === retention &&
    //       editData?.rta_eligibility?.value === rta &&
    //       editData?.pta_eligibility?.value === pta &&
    //       editData?.project_role?.value === role &&
    //       editData?.project_status?.value === project
    //     ) {
    //       setIsLoading(false);
    //       showInfoToast("No changes to save");
    //       return;
    //     }
    //     const modifiedPayload = {
    //       ...payload,
    //       id: editData?.id,
    //       project_description: formik?.values?.description,
    //       head_contract_sum: Number(values.headSum),
    //       number_of_units: Number(formik?.values?.units),
    //       project_status: formik.values.project?.value,
    //       pta_eligibility: formik.values.pta?.value,
    //       retention_type: formik.values.retention?.value,
    //       project_role: formik.values.role?.value,
    //       rta_eligibility: formik.values.rta?.value,
    //       ...(contractCount <= 1 && {
    //         country: placeDetails?.country,
    //         latitude: placeDetails?.latitude.toString(),
    //         longitude: placeDetails?.longitude.toString(),
    //         place_id: placeDetails?.place_id,
    //         region: placeDetails?.region,
    //         site_address: placeDetails?.fullAddress,
    //       }),
    //     };
    //     try {
    //       setIsLoading(true);
    //       setLoader(true);
    //       setLoaderInfo("Updating project...");
    //       const response = await editProjectDetailsById(modifiedPayload);
    //       if (response) {
    //         // toast.success("This project has been added.");
    //         setLoaderInfo("");
    //         setLoader(false);
    //         onRouteBack();
    //         return;
    //       }
    //     } catch (error) {
    //       setLoader(false);
    //       // Handle error
    //       setLoaderInfo("");
    //       console.error(error);
    //     }
    //   } else {
    //     setFormSubmitted(true);
    //     const projectInput: CreateProjectInput = {
    //       country: placeDetails?.country,
    //       head_contract_sum: Number(values.headSum),
    //       latitude: placeDetails?.latitude.toString(),
    //       longitude: placeDetails?.longitude.toString(),
    //       number_of_units: Number(formik?.values?.units),
    //       place_id: placeDetails?.place_id,
    //       project_date: getCurrentUtcTime(),
    //       project_description: values.description,
    //       project_name: values.name,
    //       project_role: formik.values.role?.value,
    //       project_status: formik.values.project?.value,
    //       pta_eligibility: formik.values.pta?.value,
    //       region: placeDetails?.region,
    //       retention_type: formik.values.retention?.value,
    //       rta_eligibility: formik.values.rta?.value,
    //       site_address: placeDetails?.fullAddress,
    //       company_id: companyId,
    //     };
    //     setLoader(true);
    //     setLoaderInfo("Saving project...");
    //     const response = await insertProjectDetails(projectInput);
    //     if (response) {
    //       const insertedProjectId = response?.project_id;
    //       showSuccessToast("This project has been added.");
    //       setLoader(false);
    //       setLoaderInfo("");
    //       onRouteBack(AppRoutes.USER_PROJECTS, insertedProjectId);
    //     } else {
    //       setLoader(false);
    //       setLoaderInfo("");
    //       showErrorToast("Failed to insert project details");
    //     }
    //   }
    // },
    onSubmit: async (values) => {
      const {
        name,
        description,
        Address,
        headSum,
        units,
        retention,
        rta,
        pta,
        role,
        project,
      } = formik.values;

      try {
        setIsLoading(true);
        setLoader(true);
        setLoaderInfo("Checking subscription...");

        const isEditChangingToInProgress =
          isEdit &&
          editData?.project_status === "Draft" &&
          project?.value === "In Progress";

        let activeProjectsCount = 0;
        let projectLimit = 0;
        let projectsItem: {
          item_name: string;
          limit_value: number;
          limit_type: any;
          is_unlimited: any;
        } | null = null;

        // 🔹 Subscription check: Add OR Edit Draft → In Progress
        if (!isEdit || isEditChangingToInProgress) {
          const getProjectListsInput = {
            company_id: getCompanyIdFromStorage(),
            page_size: 1,
            page_number: 10,
            project_status: "In Progress",
          };

          const [projectListResponse, subscriptionResponse] = await Promise.all(
            [
              getProjectListsForCompany(getProjectListsInput),
              getSubscriptionDetailsByCompanyId(),
            ]
          );
          // ⭐ NEW: Free plan override
          const isFreePlanEligible =
            subscriptionResponse?.is_free_plan_eligible === true;

          // ⭐ If free plan → skip ALL restrictions
          if (isFreePlanEligible) {
            // Free plan: skip validations silently
          } else {
            activeProjectsCount = projectListResponse?.total_count || 0;

            projectsItem =
              subscriptionResponse?.plan_items?.find(
                (item: any) => item.item_name === "Projects"
              ) || null;

            if (!projectsItem) {
              setModalHeading("Upgrade Subscription");
              setModalBodyContent(
                "You need to upgrade your subscription to add or update multiple projects."
              );
              setOpenPlanModal(true);
              setLoader(false);
              setLoaderInfo("");
              setIsLoading(false);
              return;
            }

            if (projectsItem.limit_type === "Numeric") {
              if (projectsItem.is_unlimited) {
                // ✅ Unlimited projects allowed → skip validation
              } else {
                // Limited → validate against limit_value
                projectLimit = Number(projectsItem?.limit_value ?? 0);

                if (activeProjectsCount >= projectLimit) {
                  setModalHeading("Upgrade Subscription");
                  setModalBodyContent(
                    `You already have ${activeProjectsCount} active project${
                      activeProjectsCount === 1 ? "" : "s"
                    }. Your current subscription allows a maximum of ${projectLimit} project${
                      projectLimit === 1 ? "" : "s"
                    }. To add more projects, please upgrade your subscription.`
                  );
                  setOpenPlanModal(true);
                  setLoader(false);
                  setLoaderInfo("");
                  setIsLoading(false);
                  return;
                }
              }
            }
          }
        }

        // 🔹 Step 2: Proceed to add/update project
        setLoaderInfo(isEdit ? "Updating project..." : "Saving project...");

        // Construct payload
        const payload = {
          name,
          description,
          Address,
          headSum,
          units,
          retention: retention?.value ?? "",
          rta: rta?.value ?? "",
          pta: pta?.value ?? "",
          role: role?.value ?? "",
          project: project?.value ?? "",
        };

        // 🔹 Edit flow
        if (isEdit) {
          // Check if no changes
          if (
            editData?.project_name === name &&
            editData?.project_description === description &&
            editData?.site_address === Address &&
            editData?.head_contract_sum === headSum &&
            editData?.number_of_units === units &&
            editData?.retention_type === (retention?.value ?? "") &&
            editData?.rta_eligibility === (rta?.value ?? "") &&
            editData?.pta_eligibility === (pta?.value ?? "") &&
            editData?.project_role === (role?.value ?? "") &&
            editData?.project_status === (project?.value ?? "")
          ) {
            setIsLoading(false);
            setLoader(false);
            showInfoToast("No changes to save");
            return;
          }

          const modifiedPayload = {
            ...payload,
            id: editData?.id,
            project_description: description,
            head_contract_sum: Number(headSum),
            number_of_units: Number(units),
            project_status: project?.value ?? "",
            pta_eligibility: pta?.value ?? "",
            retention_type: retention?.value ?? "",
            project_role: role?.value ?? "",
            rta_eligibility: rta?.value ?? "",
            ...(contractCount <= 1 && {
              country: placeDetails?.country,
              latitude: placeDetails?.latitude.toString(),
              longitude: placeDetails?.longitude.toString(),
              place_id: placeDetails?.place_id,
              region: placeDetails?.region,
              site_address: placeDetails?.fullAddress,
            }),
          };

          const response = await editProjectDetailsById(modifiedPayload);
          if (response) {
            setLoaderInfo("");
            setLoader(false);
            setIsLoading(false);
            onRouteBack();
            return;
          }
        }
        // 🔹 Add flow
        else {
          const projectInput: CreateProjectInput = {
            country: placeDetails?.country,
            head_contract_sum: Number(headSum),
            latitude: placeDetails?.latitude.toString(),
            longitude: placeDetails?.longitude.toString(),
            number_of_units: Number(units),
            place_id: placeDetails?.place_id,
            project_date: getCurrentUtcTime(),
            project_description: description,
            project_name: name,
            project_role: role?.value ?? "",
            project_status: project?.value ?? "",
            pta_eligibility: pta?.value ?? "",
            region: placeDetails?.region,
            retention_type: retention?.value ?? "",
            rta_eligibility: rta?.value ?? "",
            site_address: placeDetails?.fullAddress,
            company_id: companyId,
          };
          // const response = syncId
          //   ? await createProjectInPaytradeFromXeroData({
          //       ...projectInput,
          //       syncId,
          //       project_id: syncLogData?.api_payload?.project_id,
          //     })
          //   : await insertProjectDetails(projectInput);
          let response;

          if (syncId && errorCode === "SCHEDULER_PROJECT_MISSING_FIELDS") {
            // 🔥 New flow
            response = await CreateOrUpdateProjectInPaytrade({
              payload: projectInput,
              companyId: Number(localStorage.getItem("companyId")),
              projectId: syncLogData?.api_payload?.project_id,
              projectStatus: syncLogData?.api_payload?.project_status,
              syncId,
            });
          } else if (syncId) {
            // 🟡 Usual sync support
            response = await createProjectInPaytradeFromXeroData({
              ...projectInput,
              syncId,
              project_id: syncLogData?.api_payload?.project_id,
            });
          } else {
            // 🟢 Manual project create
            response = await insertProjectDetails(projectInput);
          }
          if (response) {
            const insertedProjectId = response?.project_id;
            if (!syncId) {
              showSuccessToast("This project has been added.");
            }
            setLoader(false);
            setLoaderInfo("");
            setIsLoading(false);
            if (syncId) {
              router.push(AppRoutes.USER_SYNC_LOG + syncId);
            } else {
              onRouteBack(AppRoutes.USER_PROJECTS, insertedProjectId);
            }
            return;
          } else {
            setLoader(false);
            setLoaderInfo("");
            setIsLoading(false);
            showErrorToast("Failed to insert project details");
          }
        }
      } catch (error) {
        console.error("Error in project submit:", error);
        setLoader(false);
        setLoaderInfo("");
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        const postData = {
          companyId: Number(localStorage.getItem("companyId")),
          projectName: debouncedSearchTerm.trim(),
        };

        // Check data existence using verifyClientSuppliersExistence
        const response = await CheckExistenceForProject(postData);

        // Update error field based on existence check results
        if (response?.length > 0) {
          const nameExists = response?.length > 0;

          // Update Formik state
          await formik.setFieldValue("isProjectNameExist", nameExists);
        } else {
          await formik.setFieldValue("isProjectNameExist", false);
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
    (async () => {
      try {
        setLoader(true);
        const storedCompanyId = localStorage.getItem("companyId");
        if (storedCompanyId) {
          setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
        }
        if (isEdit && params?.id) {
          const payload: any = {
            viewProjectDetailsId: params?.id || "",
          };
          const userData = await viewProjectDetails(payload);
          if (userData?.id) {
            setEditData({
              ...userData,
              number_of_units: String(userData.number_of_units),
            });
            setEditProjectId(userData?.project_id);
            setEditProjectDate(userData?.project_date);
          } else {
            setWorngIdCheck(true);
          }
        }
        setLoader(false);
      } catch (error) {
        setLoader(false);

        console.error("Error fetching project ID:", error);
      }
    })();
  }, []);
  useEffect(() => {
    // Set default value in formik
    formik.setFieldValue("project", {
      value: "In Progress",
      label: "In Progress",
    });

    // Set default selected option in dropdown
    setSelectedprojectType("In Progress");

    if (quickAddProject) {
      getOnQuickAddRecord();
    }
  }, []);

  useEffect(() => {
    getSyncLogData();
  }, [syncId]);

  async function getSyncLogData() {
    const data = await viewXeroSyncLog({
      viewXeroSyncLogId: syncId,
    });
    formik.setFieldValue("name", data?.api_payload?.project_name);
    setSyncLogData(data);
  }

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && Object.keys(editData).length > 0) {
      const initialEditData = {
        name: editData?.project_name || "",
        isProjectNameExist: editData?.isProjectNameExist || false,
        description: editData?.project_description || "",
        Address: editData?.site_address || "",
        headSum: editData?.head_contract_sum || "",
        // modifiedheadSum: `$ ${editData?.formatted_head_contract_sum}` || "",
        modifiedheadSum:
          editData?.formatted_head_contract_sum != null
            ? `$ ${editData.formatted_head_contract_sum}`
            : "",
        // units: editData?.number_of_units || "",
        units:
          editData?.number_of_units && editData.number_of_units !== "null"
            ? editData.number_of_units
            : "",
        retention: editData?.retention_type
          ? {
              value: editData?.retention_type,
              label: editData?.retention_type,
            }
          : "",
        rta: editData?.rta_eligibility
          ? {
              value: editData?.rta_eligibility,
              label: editData?.rta_eligibility,
            }
          : "",
        pta: editData?.pta_eligibility
          ? {
              value: editData?.pta_eligibility,
              label: editData?.pta_eligibility,
            }
          : "",
        role: editData?.project_role
          ? { value: editData?.project_role, label: editData?.project_role }
          : "",
        project: editData?.project_status
          ? {
              value: editData?.project_status,
              label: editData?.project_status,
            }
          : "",
      };
      formik.setValues(initialEditData);
      setInitialFormikValues(initialEditData);
      setTimeKey(new Date().getTime());
      setSelectedData(
        editData?.project_role,
        roleTypedOptions,
        setSelectedroleType
      );
      setSelectedData(
        editData?.retention_type,
        retentionTypedOptions,
        setSelectedretentionType
      );
      setSelectedData(
        editData?.number_of_units,
        unitsOptions,
        setUnitsSelectedData
      );
      setSelectedData(
        editData?.pta_eligibility,
        ptaEligibleOptions,
        setSelectedptaEligibleType
      );
      setSelectedData(
        editData?.rta_eligibility,
        rtaEligibleOptions,
        setSelectedrtaEligibleType
      );
      setSelectedData(
        editData?.project_status,
        !editData?.project_role
          ? [{ value: "Draft", label: "Draft" }, ...statusOptions]
          : statusOptions,
        setSelectedprojectType
      );
    }
  }, [isEdit, editData]);
  console.log("selectedProjectType--", selectedprojectType);
  console.log("editData", editData, isEdit);

  const formatDollars = (value: string): string => {
    // Split the number by the decimal point
    const parts = value.split(".");
    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Join the integer and decimal parts (if present)
    return `$${parts.join(".")}`;
  };
  function handleCancel() {
    const newFormikValue = omit(formik.values, "project");

    console.log("editdata", editData);
    console.log("formikvalues", formik?.values);

    if (isEqual(formik?.values, initialFormikValues) || !some(newFormikValue)) {
      onRouteBack();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false); // Close confirmation modal
    onRouteBack(); // Navigate back to the appropriate page
    return true;
  }

  function handlePageConfirmSave() {
    setDisplayClosePageConfirmation(false);
    formik?.handleSubmit(); // Submit the form
    return true;
    // setDisplayClosePageConfirmation(false); // Close the confirmation modal
  }

  function handlePlacesInputChange(value: string, placeDetails: any) {
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));
    // Handle the input change and place details here
    setPlaceDetails(placeDetails);
    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", value);
    formik.setFieldValue("country", placeDetailsString.country);
    formik.setFieldValue("latitude", String(placeDetailsString.latitude));
    formik.setFieldValue("longitude", String(placeDetailsString.longitude));
    formik.setFieldValue("place_id", placeDetailsString.place_id);
    formik.setFieldValue("region", placeDetailsString.region);
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // const trimmedValue = e?.target?.value.trim();
    const valueToSet = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();

    formik.setFieldValue("Name", valueToSet);
    setSearchTerm(valueToSet);
    // Apply the regex pattern to check if the value is valid
    if (/^(?![-.,&_])[-.,&_\w\s]*$/.test(valueToSet)) {
      // If valid, update the formik values
      formik.setFieldValue("name", valueToSet);
    }
    // Otherwise, do nothing or show an error message
  };

  async function getOnQuickAddRecord() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutedData(result?.data);
      }
    } catch {}
  }
  function onRouteBack(dynamicRoute?: string, projectId?: number) {
    if (quickAddProject) {
      if (routedData?.quickAddFromBankAccount) {
        router.push(
          `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?retrieve-record=${quickAddOnRoute.BANK}`
        );
      } else if (routedData?.quickAddFromContract) {
        if (routedData?.fromDraftContract) {
          // Draft: Return to contract page without retrieve-record
          router.push(
            `${AppRoutes.USER_EDIT_CONTRACTS}/${routedData?.id}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_ADD_CONTRACTS}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        }
      } else if (routedData?.quickAddFromVariations) {
        router.push(
          `${AppRoutes.USER_ADD_VARIATIONS}?retrieve-record=${quickAddRoutes.RETRIEVE_VARIATION}`
        );
      } else if (routedData?.quickAddFromClaims) {
        router.push(
          `${AppRoutes.USER_ADD_CLAIMS}?retrieve-record=${
            quickAddRoutes.RETRIEVE_CLAIMS
          }${projectId ? `&quickproj_id=${projectId}` : ""}`
        );
      }
    } else if (dynamicRoute) {
      router.push(dynamicRoute);
    } else {
      router.back();
    }
  }

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Proceed with the action
    // sessionStorage.setItem(commonCookies.NAVIGATED_FROM, AppRoutes.USER_ACCESS);s
    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="grid">
              <div className="pt_login">
                <h4>{isEdit ? "Edit project" : "Add project"}</h4>
                <br />
                <form onSubmit={formik.handleSubmit}>
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Name"}
                    name={"name"}
                    placeholder="Add project name"
                    disabled={isEdit || syncId}
                    error={formik.errors.name}
                    showError={formik.touched.name && formik.errors.name}
                    required
                    id="name"
                    maxLength={150}
                    value={formik.values.name}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <FormikControl
                    placeholder={"Select your project role"}
                    required
                    label={"Role"}
                    name={"role"}
                    control={InputType.SELECT}
                    renderKey="label"
                    options={roleTypedOptions}
                    valueKey="value"
                    disabled={editData?.project_role ? isEdit : false}
                    error={formik.errors.role}
                    showError={formik.touched.role && formik.errors.role}
                    value={selectedroleType}
                    onBlur={formik.handleBlur("role")}
                    onChange={(value: any) => {
                      setSelectedroleType(value);
                      formik.setFieldValue("role", { value: value }); // Update the formik field value
                      formik.setFieldTouched("role", false); // Reset the touched status to hide error
                    }}
                  />

                  <FormikControl
                    as="textArea"
                    placeholder={"Input short project description/summary"}
                    required
                    label={"Description"}
                    name={"description"}
                    control={InputType.TEXT_AREA}
                    renderKey="label"
                    valueKey="value"
                    disabled={isViewMode}
                    error={formik.errors.description}
                    showError={
                      formik.touched.description && formik.errors.description
                    }
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur("description")}
                    value={formik.values.description}
                  />
                  <div className="address-field">
                    <label htmlFor="address">
                      <small>
                        Address<span className="required">*</span>
                      </small>
                    </label>
                    <div className={`google-places-field`}>
                      <GooglePlacesInput
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                        value={formik.values.Address}
                        onChange={handlePlacesInputChange}
                        onBlur={formik.handleBlur("Address")}
                        disabled={contractCount > 0}
                      />
                      {formik.touched.Address &&
                        !formik.values.Address &&
                        formik.errors.Address && (
                          <div className={"error_wrap"}>
                            <small className={"invalid "}>
                              <i className="fa-light fa-circle-x" />
                              {formik.errors.Address as string}
                            </small>
                          </div>
                        )}
                    </div>
                  </div>

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Head contract sum (excluding GST)"}
                    placeholder="Input head contract sum"
                    required
                    name={"client_email_id"}
                    disabled={isViewMode}
                    value={formik.values.modifiedheadSum}
                    onChange={handleHeadSumChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik?.errors?.modifiedheadSum || formik?.errors?.headSum
                    }
                    showError={
                      !!(
                        (formik.touched.modifiedheadSum &&
                          formik.errors.modifiedheadSum) ||
                        (formik.touched.headSum && formik.errors.headSum)
                      )
                    }
                  />

                  <FormikControl
                    placeholder={"Input retention type"}
                    required
                    label={"Retention type"}
                    name={"retention"}
                    control={InputType.SELECT}
                    renderKey="label"
                    options={retentionTypedOptions}
                    valueKey="value"
                    disabled={isViewMode}
                    error={formik.errors.retention}
                    showError={
                      formik.touched.retention && formik.errors.retention
                    }
                    value={selectedretentionType}
                    onBlur={formik.handleBlur("retention")}
                    onChange={(value: any) => {
                      setSelectedretentionType(value);
                      formik.setFieldValue("retention", { value: value }); // Update the formik field value
                      formik.setFieldTouched("retention", false); // Reset the touched status to hide error
                    }}
                  />

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Units"}
                    required
                    inputMode="numeric"
                    name={"units"}
                    disabled={isViewMode}
                    maxLength={7}
                    value={formik.values.units}
                    error={formik?.errors?.units}
                    showError={formik.touched.units && formik.errors.units}
                    onChange={(e: any) => {
                      let value = e.target.value.replace(/\D/g, ""); // Allow only digits
                      if (parseInt(value) === 0 || value === "") {
                        // Prevent zero from being entered at the beginning or if the value is empty
                        value = ""; // Reset the value to empty if zero is entered at the beginning
                      } else if (value.length > 1 && value[0] === "0") {
                        // If there are more than one character and the first character is zero, remove the leading zero
                        value = value.substring(1);
                      }
                      formik.handleChange({
                        target: {
                          name: "units",
                          value,
                        },
                      });
                    }}
                    onBlur={formik.handleBlur}
                  />
                  <div className="helpText">
                    Number of liveable units — e.g. in a block of 50 apartments,
                    Units = 50.
                  </div>
                  <div className="DropdownStyles">
                    <FormikControl
                      placeholder={"Is the project eligible for a PTA?"}
                      required
                      label={"PTA eligibility"}
                      name={"pta"}
                      control={InputType.SELECT}
                      renderKey="label"
                      options={ptaEligibleOptions}
                      valueKey="value"
                      disabled={contractCount > 0}
                      error={formik.errors.pta}
                      showError={formik.touched.pta && formik.errors.pta}
                      value={selectedptaEligibleType}
                      onBlur={formik.handleBlur("pta")}
                      onChange={(value: any) => {
                        setSelectedptaEligibleType(value);
                        formik.setFieldValue("pta", { value: value }); // Update the formik field value
                        formik.setFieldTouched("pta", false); // Reset the touched status to hide error
                      }}
                    />
                    <div className="helpText">
                      <Link
                        className="linkStyles"
                        href={
                          "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool"
                        }
                        target="_blank"
                      >
                        Help
                      </Link>
                    </div>
                  </div>

                  <div className="DropdownStyles">
                    <FormikControl
                      placeholder={"Is the project eligible for a RTA?"}
                      required
                      label={"RTA eligibility"}
                      name={"rta"}
                      control={InputType.SELECT}
                      renderKey="label"
                      options={rtaEligibleOptions}
                      valueKey="value"
                      disabled={contractCount > 0}
                      error={formik.errors.rta}
                      showError={formik.touched.rta && formik.errors.rta}
                      value={selectedrtaEligibleType}
                      onBlur={formik.handleBlur("rta")}
                      onChange={(value: any) => {
                        setSelectedrtaEligibleType(value);
                        formik.setFieldValue("rta", { value: value }); // Update the formik field value
                        formik.setFieldTouched("rta", false); // Reset the touched status to hide error
                      }}
                    />
                    <div className="helpText">
                      <Link
                        className="linkStyles"
                        href={
                          "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool"
                        }
                        target="_blank"
                      >
                        Help
                      </Link>
                    </div>
                  </div>

                  <FormikControl
                    placeholder={""}
                    label={"Project status"}
                    name={"project"}
                    control={InputType.SELECT}
                    renderKey="label"
                    options={
                      // !editData?.project_role && isEdit
                      //   ? [{ value: "Draft", label: "Draft" }, ...statusOptions]
                      //   : statusOptions
                      finalOptions
                    }
                    valueKey="value"
                    // disabled={isViewMode}
                    value={selectedprojectType}
                    // value={formik.values.project}
                    onBlur={formik.handleBlur("project")}
                    onChange={(value: any) => {
                      setSelectedprojectType(value);
                      formik.setFieldValue("project", { value: value }); // Update the formik field value
                      formik.setFieldTouched("project", false); // Reset the touched status to hide error
                    }}
                  />

                  <br />
                  <br />
                  <div className="grid">
                    <input
                      type="button"
                      value="Cancel"
                      className="outline contrast"
                      onClick={handleCancel}
                      // onClick={() => {
                      //   showInfoToast("No changes saved");
                      //   router.push("/user/projects");
                      // }}
                    />
                    <input
                      type="submit"
                      value={isEdit ? "Update" : "Save"} // Dynamic button text
                      className="secondary"
                      // onClick={() => formik?.handleSubmit()}
                    />{" "}
                    {/* {isEdit ? "Update" : "Save"} */}
                  </div>
                </form>
                <br />
                <br />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="paytradeffectwrap">
        <div className="paytradeffect">
          <div className="themeshade"></div>
          <div className="oceanshade"></div>
          <div className="crabshade"></div>
        </div>
      </div>
      <div className="noise"></div>
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
      {openPlanModal && (
        <BaseModal
          displayModal={openPlanModal}
          onClose={() => setOpenPlanModal(false)}
          firstButtonName="Cancel"
          secondButtonName="Upgrade Now"
          title={modalHeading}
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
    </div>
  );
};
export default AddProjects;
