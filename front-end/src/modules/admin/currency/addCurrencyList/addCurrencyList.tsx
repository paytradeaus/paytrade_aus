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

import Link from "next/link";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  CreateProjectInput,
  insertProjectDetails,
} from "@/modules/user/Projects/ProjectList/projects.functions";

import { useDebouncedFieldCheck } from "@/hooks";
import { CheckCurrencyNameExistence } from "@/network/existanceAPIsCheck";
import {
  AdminAddCurrencyMaterDetails,
  AdminGetCurrencyById,
  AdminUpdateCurrencyMastesDetails,
} from "./addCurrencyList.functions";
import BreadCrumbs from "@/components/BreadCrumbs";
interface Option {
  value: string;
  label: string;
}
interface FormValues {
  CurrencySymbol: string;
  Name: string;
  Status: any;
  CurrencyCode: string;
  isCodeExistence: boolean;
}
const AddCurrency = (props: any) => {
  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Currency Name is required")
      .max(25, "Total characters cannot be more than 25")
      .test(async function (value, formData: any) {
        if (isEdit && value === editData?.currency_name) return true;
        if (!value.trim()) return true;

        const planNames = formData?.parent?.isCodeExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Currency Name already exists.",
          });
        }
        return true;
      }),
    CurrencySymbol: Yup.string().required("Currency Symbol is required"),
    CurrencyCode: Yup.string()
      .required("Currency Code is required")
      .max(5, "Total characters cannot be more than 5"),
  });
  const { setActionScreen, isEdit = false, ...rest } = props;
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [isLoading, setIsLoading] = useState(false);
  const [statusOptionsData, setStatusOptionsData] = useState("Active");
  // const [singleSelectedData, setSingleSelectedData] = useState<any>({
  //   value: "Active",
  //   label: "Active",
  // });
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [singleSelectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [editData, setEditData] = useState<any>({});
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
      Name: isEdit ? editData?.currency_name : "",
      CurrencyCode: isEdit ? editData?.short_code : "",
      CurrencySymbol: isEdit ? editData?.symbol : "",
      Status: isEdit
        ? options.find((option) => option.value === editData?.admin_status) // Find the option matching editData
        : options[0],
      isCodeExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, CurrencyCode, CurrencySymbol } = formik.values;
      let payload = {
        currency_name: Name,
        short_code: CurrencyCode,
        status: Status,
        symbol: CurrencySymbol,
      };
      setLoaderInfo(isEdit ? "Updating currency..." : "Adding currency...");
      setLoader(true);
      setIsLoading(true);

      try {
        if (isEdit) {
          let modifiedPayload = {
            ...payload,
            id: editData?.id,
          };

          let response = await AdminUpdateCurrencyMastesDetails(
            modifiedPayload,
            "Currency has been updated",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_CURRENCY_LIST);
          }
        } else {
          let modifiedPayload = {
            ...payload,
          };
          const response = await AdminAddCurrencyMaterDetails(
            modifiedPayload,
            "Currency has been added.",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_CURRENCY_LIST);
          }
        }
      } catch (error) {
        console.error("Error while saving currency:", error);
        showErrorToast("Something went wrong while saving currency.");
      } finally {
        setLoader(false);
        setLoaderInfo("");
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    (async () => {
      if (isEdit && params?.id) {
        const payload: any = {
          currencyId: params?.id || "",
        };
        const userData = await AdminGetCurrencyById(payload);
        if (userData?.id) {
          setEditData(userData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (isEdit && editData?.id) {
      formik.setValues({
        Name: editData?.currency_name || "",
        CurrencyCode: editData?.short_code || "",
        CurrencySymbol: editData?.symbol || "",
        Status: editData?.status || "Active",
        isCodeExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.status) || {};
      setSingleSelectedData(selOpt);

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const checkCodeExistence = async (value: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckCurrencyNameExistence(value); // Example API call
    return response;
  };

  const isCodeChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkCodeExistence,
    () => {
      formik.setFieldError("Name", "Currency Name already exists.");
      formik.setFieldValue("isCodeExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isCodeExistence", false);
    } // Success: clear error
  );

  const handleCurrencyNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
  }, []);
  const handleCodeChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("CurrencyCode", lastname);
  }, []);
  const handleSymbolChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("CurrencySymbol", lastname);
  }, []);

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    router.push(AppRoutes.ADMIN_CURRENCY_LIST);
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
      ? editData?.currency_name === existingFormValues?.Name &&
        editData?.short_code === existingFormValues?.CurrencyCode &&
        editData?.status === existingFormValues?.Status &&
        editData?.symbol === existingFormValues?.CurrencySymbol
      : isEqual(initialFormValues, existingFormValues);

    if (!isUnchanged) {
      setDisplayClosePageConfirmation(true);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else {
      router.push(AppRoutes.ADMIN_CURRENCY_LIST);
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
                name: "Currency",
                path: AppRoutes.ADMIN_CURRENCY_LIST,
              },
            ]}
            activeRoute={isEdit ? "Edit currency" : "Add currency"}
          />
        </div>
        <br />
        <div className="pt_smallbgimage">
          <div className="pt_centered">
            <div className="pt_centeredinner">
              <div className="pt_box_transparent_cp">
                <div className="grid">
                  <div className="pt_login">
                    <h4>{isEdit ? "Edit currency" : "Add currency"}</h4>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        label={"Currency name"}
                        name={"Name"}
                        id={"Name"}
                        required
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        error={formik.errors.Name}
                        showError={formik.touched.Name && formik.errors.Name}
                        onChange={handleCurrencyNameChange}
                        onBlur={formik.handleBlur("Name")}
                        value={formik.values.Name}
                        maxLength={26}
                      />
                      <FormikControl
                        label={"Currency short code"}
                        name={"CurrencyCode"}
                        id={"CurrencyCode"}
                        required
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        error={formik.errors.CurrencyCode}
                        showError={
                          formik.touched.CurrencyCode &&
                          formik.errors.CurrencyCode
                        }
                        onChange={handleCodeChange}
                        onBlur={formik.handleBlur("CurrencyCode")}
                        value={formik.values.CurrencyCode}
                        maxLength={5}
                      />
                      <FormikControl
                        label={"Currency symbol"}
                        name={"CurrencySymbol"}
                        id={"CurrencySymbol"}
                        required
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        error={formik.errors.CurrencySymbol}
                        showError={
                          formik.touched.CurrencySymbol &&
                          formik.errors.CurrencySymbol
                        }
                        onChange={handleSymbolChange}
                        onBlur={formik.handleBlur("CurrencySymbol")}
                        value={formik.values.CurrencySymbol}
                        maxLength={5}
                      />
                      <FormikControl
                        placeholder={""}
                        label={"Status"}
                        required
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
                        // onChange={(value: any) => {
                        //   setSingleSelectedData(value);
                        //   formik.setFieldValue("Status", value); // Update the formik field value
                        //   formik.setFieldTouched("Status", false); // Reset the touched status to hide error
                        // }}
                        onChange={(selectedOption: any) => {
                          formik.handleChange("Status")(selectedOption.value);
                          setSingleSelectedData(selectedOption);
                        }}
                        returnSelectedObject
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
export default AddCurrency;
