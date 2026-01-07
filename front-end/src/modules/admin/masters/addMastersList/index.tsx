"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import {
  ADD,
  ALPHANUMERIC,
  EDIT,
  findSelectedOptions,
  getCurrentUtcTime,
  InputType,
  NUMBER_REGEX,
  VIEW,
} from "@/shared/constant/general";
import * as Yup from "yup";
import moment from "moment";

import PhoneInputField from "@/components/phoneNumberInput";
import GooglePlacesInput from "@/components/GooglePlaces";
import { convertCanvasToFile, handleSelectedImage } from "@/utils";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";

import { debounce, isEqual } from "lodash";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ptaEligibleOptions,
  retentionTypedOptions,
  roleTypedOptions,
  rtaEligibleOptions,
} from "./addMastersList.constant";
import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  CreateProjectInput,
  insertProjectDetails,
} from "@/modules/user/Projects/ProjectList/projects.functions";
import {
  AdminAddMasterTypeDetails,
  AdminGetMasterTypeById,
  AdminUpdateMasterTypeDetails,
  CheckCategoryNameExistence,
} from "./addMastersList.functions";
import { AdminfetchAllMasterTypeDetails } from "../mastersList/mastersList.functions";
import { useDebouncedFieldCheck } from "@/hooks";
import BreadCrumbs from "@/components/BreadCrumbs";
interface Option {
  value: string;
  label: string;
}
interface FormValues {
  MasterType: any;
  Name: string;
  Status: any;
  Description: string;
  isValueExistence: boolean;
}
const AddMasters = (props: any) => {
  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Category value is required")
      .max(25, "Total characters cannot be more than 25")
      .test(function (value, context) {
        if (isEdit && value === editData?.value) return true;
        if (!value.trim()) return true; // Handle empty email
        const valueExists = context?.parent?.isValueExistence;
        if (valueExists) {
          return this.createError({
            path: this.path,
            message: "Category value already exists.",
          });
        }
        return true;
      }),
    // description: Yup.string().required("Description is required"),
    MasterType: Yup.string().required("Master type is required"),
  });
  const { setActionScreen, isEdit = false, ...rest } = props;
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [isLoading, setIsLoading] = useState(false);
  const [clientListOpt, setClientListOpt] = useState([]);
  const [clientListOptData, setClientListOptData] = useState<any>();
  const [masterOptionsData, setMasterOptionsData] = useState<any>();
  const [statusOptionsData, setStatusOptionsData] = useState("Active");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [selectedMasterType, setSelectedMasterType] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const params = useParams();
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In active" },
  ];
  const [timeKey, setTimeKey] = useState(new Date().getTime());

  const dispatch = useAppDispatch();

  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");

  const setSelectedData = (
    selectedValue: string,
    optionsArray: Option[] | any,
    setterFunction: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const selectedOption = optionsArray.find(
      (opt: Option) => opt?.value === selectedValue
    );

    if (selectedOption) {
      setterFunction(selectedOption?.value);
    } else {
      setterFunction("");
    }
  };

  if (!isEdit) {
    // If it's not an edit mode, show only the "In progress" option
    // statusOptions = [{ value: "In Progress", label: "In Progress" }];
  }

  const formik = useFormik<FormValues>({
    initialValues: {
      MasterType: isEdit ? editData?.master_type : null,

      Name: isEdit ? editData?.first_name : "",

      Status: isEdit
        ? options.find((option) => option.value === editData?.admin_status) // Find the option matching editData
        : options[0], // If not editing, use the first option as default

      Description: isEdit ? editData?.description : "",
      isValueExistence: false,
    },

    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, MasterType, Description } = formik.values;

      let payload = {
        description: Description,
        master_type: MasterType,
        status: Status?.value || Status || "Active",
        value: Name,
      };
      setLoaderInfo(isEdit ? "Updating master..." : "Adding master...");
      setLoader(true);
      setIsLoading(true);

      try {
        if (isEdit) {
          let modifiedPayload = {
            ...payload,
            id: editData?.id,
          };

          let response = await AdminUpdateMasterTypeDetails(
            modifiedPayload,
            "Master Category  has been updated",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_MASTERS_LIST);
          }
        } else {
          let modifiedPayload = {
            ...payload,
          };
          const response = await AdminAddMasterTypeDetails(
            modifiedPayload,
            "Master Category has been added.",
            setIsLoading
          );

          if (response) {
            router.push(AppRoutes.ADMIN_MASTERS_LIST);
          }
        }
      } catch (error) {
        console.error("Error in master type submission:", error);
      } finally {
        setLoader(false);
        setLoaderInfo("");
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    (async () => {
      const categoryData = await AdminfetchAllMasterTypeDetails();
      if (categoryData?.length > 0) {
        setClientListOpt(categoryData);
      }
      if (isEdit && params?.id) {
        const payload: any = {
          categoryId: params?.id || "",
        };
        const userData = await AdminGetMasterTypeById(payload);
        if (userData?.id) {
          setEditData(userData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoader(true);
        const storedCompanyId = localStorage.getItem("companyId");
        if (storedCompanyId) {
          setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
        }
        setLoader(false);
      } catch (error) {
        setLoader(false);
        console.error("Error fetching company data:", error);
      }
    };

    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (isEdit && editData?.id) {
      formik.setValues({
        MasterType: editData?.master_type || "",
        Name: editData?.value || "",
        Status: editData?.status || "Active",
        Description: editData?.description || "",
        isValueExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.status) || {};
      setSingleSelectedData(selOpt);
      let masterOpt =
        clientListOpt.find(
          (each: any) => each?.value === editData?.master_type
        ) || {};

      setClientListOptData(masterOpt);
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const checkValueExistence = async (value: string) => {
    // Call your API or validation logic for checking email
    const masterTypes = formik.values.MasterType;
    const response = await CheckCategoryNameExistence({
      category: value,
      masterType: masterTypes,
    }); // Example API call
    return response;
  };
  const isValueChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkValueExistence,
    () => {
      formik.setFieldError("Name", "Category Value already exists.");
      formik.setFieldValue("isValueExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isValueExistence", false);
    } // Success: clear error
  );

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    router.push(AppRoutes.ADMIN_MASTERS_LIST);
  }

  function handlePageConfirmSave() {
    formik.handleSubmit();
    setDisplayClosePageConfirmation(false);
  }

  function handleCancel() {
    const existingFormValues = formik.values || {};
    const initialFormValues = isEdit ? editData : formik.initialValues || {};

    // Check for changes based on mode (Add vs Edit)
    const isUnchanged = isEdit
      ? editData?.value === existingFormValues.Name &&
        editData?.status === existingFormValues.Status &&
        editData?.master_type === existingFormValues.MasterType &&
        editData?.description === existingFormValues.Description
      : isEqual(initialFormValues, existingFormValues);

    if (!isUnchanged) {
      setDisplayClosePageConfirmation(true);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else {
      router.push(AppRoutes.ADMIN_MASTERS_LIST);
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
              {
                name: "Masters",
                path: AppRoutes.ADMIN_MASTERS_LIST,
              },
            ]}
            activeRoute={isEdit ? "Edit masters" : "Add masters"}
          />
        </div>
        <br />
        <div className="pt_smallbgimage">
          <div className="pt_centered">
            <div className="pt_centeredinner">
              <div className="pt_box_transparent_cp">
                <div className="grid">
                  <div className="pt_login">
                    <h4>{isEdit ? "Edit masters" : "Add masters"}</h4>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        placeholder={"Select the master type"}
                        required
                        label={"Master type"}
                        name={"masterType"}
                        control={InputType.SELECT}
                        renderKey="label"
                        options={clientListOpt}
                        valueKey="value"
                        disabled={false}
                        error={formik.errors.MasterType}
                        showError={
                          formik.touched.MasterType && formik.errors.MasterType
                        }
                        value={
                          isEdit
                            ? formik.values?.MasterType
                            : formik.values?.MasterType?.value
                        }
                        onBlur={formik.handleBlur("MasterType")}
                        onChange={(selectedOption: any) => {
                          formik.setFieldValue(
                            "MasterType",
                            selectedOption?.value
                          );
                          setMasterOptionsData(selectedOption);
                        }}
                        returnSelectedObject
                      />

                      <FormikControl
                        placeholder={""}
                        required
                        label={"Status"}
                        name={"Status"}
                        control={InputType.SELECT}
                        renderKey="label"
                        options={options}
                        valueKey="value"
                        disabled={false}
                        error={formik.errors.Status} // Ensure the name matches case-sensitive Formik field
                        showError={
                          formik.touched.Status && formik.errors.Status
                        }
                        value={formik.values.Status} // Bind the value to Formik's `values`
                        onBlur={formik.handleBlur("Status")} // Handle blur using Formik's function
                        onChange={(selectedOption: any) => {
                          formik.setFieldValue("Status", selectedOption?.value); // Set only the value in the Formik field
                          setStatusOptionsData(selectedOption); // Update local state if needed
                        }}
                        returnSelectedObject
                      />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Category value"}
                        name={"Name"}
                        placeholder=""
                        error={formik.errors?.Name}
                        disabled={
                          !formik.values.MasterType ||
                          formik.values.MasterType.length === 0
                        }
                        showError={formik.touched.Name && formik.errors.Name}
                        required
                        onChange={(e: any) =>
                          formik?.setFieldValue("Name", e?.target?.value)
                        }
                        onBlur={formik.handleBlur("Name")}
                        value={formik.values?.Name}
                      />
                      <FormikControl
                        as="textArea"
                        label={"Description"}
                        name={"Description"}
                        id={"Description"}
                        control={InputType.TEXT_AREA}
                        renderKey="label"
                        valueKey="value"
                        error={formik.errors.Description}
                        showError={
                          formik.touched.Description &&
                          formik.errors.Description
                        }
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur("Description")}
                        value={formik.values.Description}
                        maxLength={250}
                      />
                      <br />
                      <br />
                      <div className="grid">
                        <input
                          type="button"
                          value="Cancel"
                          className="outline contrast"
                          onClick={handleCancel}
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
        </div>
        {displayClosePageConfirmation && (
          <BaseModal
            modalId={"updatePlan confirmation"}
            displayModal={displayClosePageConfirmation}
            onClose={handlePageConfirmClose}
            onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
            onConfirm={() => {
              handlePageConfirmSave();
              return true;
            }}
            firstButtonName="Yes"
            secondButtonName="Save"
            restrictOncloseFunctionInHeader
          >
            <h4 className="text_center">Are you sure to close and not save?</h4>
          </BaseModal>
        )}
      </div>
    </div>
  );
};
export default AddMasters;
