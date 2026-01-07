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

import PhoneInputField from "@/components/PhoneNumberInput";
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
import {
  CheckCurrencyNameExistence,
  CheckFinInstitutionNameExistence,
} from "@/network/existanceAPIsCheck";
import {
  AdminAddFinancialInstitutionDetails,
  AdminGetFinancialInstitutionById,
  AdminUpdateFinancialInstitutionDetails,
} from "./addFinancialInstitution.functions";
import BreadCrumbs from "@/components/BreadCrumbs";

interface Option {
  value: string;
  label: string;
}
interface FormValues {
  AccountLength: Number;
  Name: string;
  Status: any;
  InstitutionCode: string;
  Place: string;
  country: any;
  latitude: any;
  longitude: any;
  place_id: any;
  region: any;
  isCodeExistence: boolean;
  isNameExistence: boolean;
}
const AddFinancialInstitution = (props: any) => {
  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Financial institution Name is required")
      .max(100, "Total characters cannot be more than 100")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.institution_name) return true;
        if (!value.trim()) return true;

        const planNames = formData.parent.isNameExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Financial institution Name already exists.",
          });
        }
        return true;
      }),
    AccountLength: Yup.number()
      .required("Account Number Length is required")
      .min(5, "Account number length should be between 5 and 25 digits")
      .max(25, "Account number length should be between 5 and 25 digits"),
    InstitutionCode: Yup.string()
      .required("Financial institution Code is required")
      .max(10, "Total characters cannot be more than 10")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.institution_code) return true;
        if (!value.trim()) return true;

        const planNames = formData.parent.isCodeExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Financial institution Code already exists.",
          });
        }
        return true;
      }),
    Status: Yup.string().required("Please select a status"),
  });
  const { setActionScreen, isEdit = false, ...rest } = props;
  const router = useRouter();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [isLoading, setIsLoading] = useState(false);
  const [statusOptionsData, setStatusOptionsData] = useState("Active");
  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const params = useParams();
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
    { value: "Archived", label: "Archived" },
    { value: "Blocked", label: "Blocked" },
  ];
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);

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
      Name: isEdit ? editData?.first_name : "",
      AccountLength: isEdit ? editData?.last_name : "",
      InstitutionCode: isEdit ? editData?.email_id : "",
      Place: "",
      Status: isEdit ? editData?.admin_status : "Active",
      country: "",
      latitude: "",
      longitude: "",
      place_id: "",
      region: "",
      isCodeExistence: false,
      isNameExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, AccountLength, InstitutionCode, Place } =
        formik.values;
      let payload = {
        acc_number_maxlength: Number(AccountLength),
        institution_code: InstitutionCode,
        institution_name: Name,
        institution_status: Status,
        place: Place,
        institution_address: Place,
        country: values.country,
        latitude: values.latitude.toString(),
        longitude: values.longitude.toString(),
        place_id: values.place_id,
        region: values.region,
      };
      setLoaderInfo(
        isEdit ? "Updating institution..." : "Adding institution..."
      );
      setLoader(true);
      setIsLoading(true);
      try {
        if (isEdit) {
          let modifiedPayload = {
            ...payload,
            id: editData?.id,
          };

          let response = await AdminUpdateFinancialInstitutionDetails(
            modifiedPayload,
            "Financial institution has been updated",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_FINANCIAL_INSTITUTION);
          }
        } else {
          let modifiedPayload = {
            ...payload,
          };
          const response = await AdminAddFinancialInstitutionDetails(
            modifiedPayload,
            "Financial institution has been added.",
            setIsLoading
          );
          if (response) {
            router.push(AppRoutes.ADMIN_FINANCIAL_INSTITUTION);
          }
        }
      } catch (error) {
        console.error("Error while saving institution:", error);
        showErrorToast("Something went wrong while saving institution.");
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
          id: params?.id || "",
        };
        const userData = await AdminGetFinancialInstitutionById(payload);
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
        Name: editData?.institution_name || "",
        AccountLength: editData?.acc_number_maxlength || "",
        InstitutionCode: editData?.institution_code || "",
        Place: editData?.institution_address || "",
        Status: editData?.institution_status || "Active",
        country: editData?.country || "",
        latitude: editData?.latitude || "",
        longitude: editData?.longitude || "",
        place_id: editData?.place_id || "",
        region: editData?.region || "",
        isCodeExistence: false,
        isNameExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.institution_status) ||
        {};
      setSingleSelectedData(selOpt);

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const checkNameExistence = async (name: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckFinInstitutionNameExistence(name); // Example API call
    return response;
  };

  const isNameChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkNameExistence,
    () => {
      formik.setFieldError(
        "Name",
        "Financial institution Name already exists."
      );
      formik.setFieldValue("isNameExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isNameExistence", false);
    } // Success: clear error
  );

  const handleFirstNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
  }, []);
  const handleLastNameChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("InstitutionCode", lastname);
  }, []);
  const handleAccNumberChange = useCallback((e: any) => {
    const value = e.target.value.trim();
    if (NUMBER_REGEX.test(value) || value === "") {
      formik.setFieldValue("AccountLength", value);
    }
  }, []);
  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    formik.setValues({
      Name: formik.values.Name,
      Status: formik.values.Status,
      AccountLength: formik.values.AccountLength,
      InstitutionCode: formik.values.InstitutionCode,
      Place: value,
      country: placeDetailsString.country,
      latitude: placeDetailsString.latitude,
      longitude: placeDetailsString.longitude,
      place_id: placeDetailsString.place_id,
      region: placeDetailsString.region,
      isCodeExistence: formik.values.isCodeExistence,
      isNameExistence: formik.values.isNameExistence,
    });
  };

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    router.push(AppRoutes.ADMIN_FINANCIAL_INSTITUTION);
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
      ? editData?.institution_name === existingFormValues?.Name &&
        editData?.acc_number_maxlength ===
          Number(existingFormValues?.AccountLength) &&
        editData?.institution_code === existingFormValues?.InstitutionCode &&
        editData?.institution_status === existingFormValues?.Status &&
        editData?.institution_address === existingFormValues?.Place
      : isEqual(initialFormValues, existingFormValues);

    if (!isUnchanged) {
      setDisplayClosePageConfirmation(true);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else {
      router.push(AppRoutes.ADMIN_FINANCIAL_INSTITUTION);
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
                name: "Financial institution",
                path: AppRoutes.ADMIN_FINANCIAL_INSTITUTION,
              },
            ]}
            activeRoute={
              isEdit
                ? "Edit financial institution"
                : "Add financial institution"
            }
          />
        </div>
        <br />
        <div className="pt_smallbgimage">
          <div className="pt_centered">
            <div className="pt_centeredinner">
              <div className="pt_box_transparent_cp">
                <div className="grid">
                  <div className="pt_login">
                    <h4>
                      {isEdit
                        ? "Edit financial institution"
                        : "Add financial institution"}
                    </h4>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        label={"Financial institution name"}
                        name={"Name"}
                        id={"Name"}
                        required
                        disabled={false}
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        error={formik.errors.Name}
                        showError={formik.touched.Name && formik.errors.Name}
                        onChange={handleFirstNameChange}
                        onBlur={formik.handleBlur("Name")}
                        value={formik.values.Name}
                        maxLength={101}
                      />
                      <FormikControl
                        label={"Financial institution code"}
                        name={"InstitutionCode"}
                        id={"InstitutionCode"}
                        required
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        disabled={false}
                        error={formik.errors.InstitutionCode}
                        showError={
                          formik.touched.InstitutionCode &&
                          formik.errors.InstitutionCode
                        }
                        onChange={handleLastNameChange}
                        onBlur={formik.handleBlur("InstitutionCode")}
                        value={formik.values.InstitutionCode}
                        maxLength={11}
                      />
                      <FormikControl
                        label={"Account number length"}
                        name={"AccountLength"}
                        id={"AccountLength"}
                        required
                        control={InputType.TEXT_FIELD}
                        renderKey="label"
                        valueKey="value"
                        disabled={false}
                        error={formik.errors.AccountLength}
                        showError={
                          formik.touched.AccountLength &&
                          formik.errors.AccountLength
                        }
                        onChange={handleAccNumberChange}
                        onBlur={formik.handleBlur("AccountLength")}
                        value={formik.values.AccountLength}
                        maxLength={2}
                      />
                      <div className="address-field">
                        <label htmlFor="address">
                          <small>Head office</small>
                        </label>
                        <div className={`google-places-field`}>
                          <GooglePlacesInput
                            apiKey={
                              process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
                            }
                            value={formik.values.Place}
                            onChange={handlePlacesInputChange}
                            onBlur={formik.handleBlur("Place")}
                            disabled={false}
                          />
                          {formik.touched.Place && formik.errors.Place && (
                            <div className={"error_wrap"}>
                              <small className={"invalid "}>
                                <i className="fa-light fa-circle-x" />
                                {formik.errors.Place}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                      <FormikControl
                        placeholder={""}
                        label={"Status"}
                        name={"Status"}
                        required
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
export default AddFinancialInstitution;
