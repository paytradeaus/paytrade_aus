"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Formik, useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import {
  InputType,
  NUMBER_REGEX,
  UploadImage,
  VIEW,
} from "@/shared/constant/general";
import * as Yup from "yup";

import GooglePlacesInput from "@/components/GooglePlaces";
import {
  convertCanvasToFile,
  getDecryptedToken,
  handleSelectedImage,
} from "@/utils";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  insertProjectDetails,
  CreateProjectInput,
} from "../../../user/Projects/ProjectList/projects.functions";
import { debounce, every, isEqual, omit, some } from "lodash";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import { useParams, useRouter } from "next/navigation";
import { AdminListAllUsers } from "../../../admin/Users/users.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  AdminCreateCompanyDetails,
  AdminGetCompanyById,
  AdminUpdateCompany,
  DeleteFile,
} from "./AddBusinessProfile.function";
import { singleUploadApi } from "@/network/apolloClient";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useDebouncedFieldCheck, useTokenDetails } from "@/hooks";
import {
  entityType,
  options,
} from "@/modules/user/BusinessProfile/BusinessProfile.constant";
import PhoneInputField from "@/components/PhoneNumberInput";
import AsyncSelect from "react-select/async";
import ImageUploader from "@/components/ImageUploader";
import ImageCropper from "@/components/ImageCropper";
import {
  CheckCompanyEmailExistence,
  checkCompanyExistence,
} from "@/network/existanceAPIsCheck";
import TextField from "@/components/Inputs/TextField";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";
import BreadCrumbs from "@/components/BreadCrumbs";
interface Option {
  value: string;
  label: string;
  controlStyles?: any;
}
type OptionType = { value: string | number; label: string };
const AddBusinessProfiles = (props: any) => {
  const { isEdit = false, ...rest } = props;
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialFormikValues, setInitialFormikValues] = useState<any>();
  const params = useParams();
  const fileInputRef = useRef<any>(null);

  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const dispatch = useAppDispatch();
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const router = useRouter();
  const [cropImage, setCropImage] = useState<any>();
  const [editBase64url, setEditBase64url] = useState("");
  const [selectedData, setSingleSelectedData] = useState<any>();

  const [clearImageName, setClearImageName] = useState(false);
  const [displayImage, setDisplayImage] = useState<any>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [editData, setEditData] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<any>("");
  const [disabledBtn, setDisabledBtn] = useState(false);
  const companyDetails: any = useAppSelector(
    (state: RootState) => state?.companyDetails
  );

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  function isLightTheme() {
    return getTheme === "light";
  }

  const [blockedOptions, setBlockedOPtions] = useState({
    value: "UnBlocked",
    label: "Un Blocked",
  });
  const [selectedRelatedEntityType, setSelectedRelatedEntityType] =
    useState<any>("UnBlocked");
  const handleBusinessNameChange = useCallback((e: any) => {
    let businessName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();

    formik.setFieldValue("BusinessName", businessName);
  }, []);

  function handleCancel() {
    const newFormikValue = omit(formik.values, "project");

    if (isEqual(formik?.values, initialFormikValues) || !some(newFormikValue)) {
      onClose();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  const customStyles = useMemo(
    () => ({
      option: (provided: any, { isSelected }: any) => ({
        ...provided,
        padding: "2px 10px",
        backgroundColor: isSelected
          ? isLightTheme()
            ? "#ddd"
            : "#444"
          : "transparent",
        color: isLightTheme() ? "#1c212c" : "#fbfcfc", // Ensure text is white in dark mode
        "&:hover": {
          backgroundColor: isLightTheme() ? "#f0f0f0" : "#555",
          color: isLightTheme() ? "#1c212c" : "#fff",
        },
      }),
      control: (provided: any) => ({
        ...provided,
        boxShadow: "none",
        minHeight: "30px",
        height: "48px",
        background: isLightTheme() ? "#fbfcfc" : "#1c212c",
        border: isLightTheme()
          ? "0.12rem solid #cfd5e2"
          : "0.12rem solid #2a3140",
        color: isLightTheme() ? "#1c212c" : "#fbfcfc", // Ensure text is white in dark mode
      }),
      menu: (provided: any) => ({
        ...provided,
        margin: "0px",
        borderRadius: "0px",
        zIndex: "2",
        backgroundColor: isLightTheme() ? "#fbfcfc" : "#1c212c",
        padding: 0,
      }),
      menuList: (provided: any) => ({
        ...provided,
        paddingTop: "0px",
        paddingBottom: "0px",
      }),
      valueContainer: (provided: any) => ({
        ...provided,
      }),
      indicatorsContainer: (provided: any) => ({
        ...provided,
        height: "48px",
      }),
      input: (provided: any) => ({
        ...provided,
        color: isLightTheme() ? "#1c212c" : "#fbfcfc", // 🔥 Fix: Ensure typed text is visible immediately
        height: "48px",
        marginTop: "-4px",
        paddingBottom: "4px",
        paddingLeft: "4px",
      }),
      placeholder: (provided: any) => ({
        ...provided,
        paddingLeft: "4px",
        color: isLightTheme() ? "#676e7c" : "#7d8496",
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: isLightTheme() ? "#1c212c" : "#fbfcfc", // 🔥 Fix: Ensure selected value is visible immediately in dark mode
        paddingBottom: "4px",
        paddingLeft: "4px",
      }),
    }),
    [getTheme]
  );

  useEffect(() => {
    (async () => {
      setLoader(true);

      if (isEdit && params?.id) {
        const payload: any = {
          companyId: Number(params?.id) || "",
        };
        const companyDataByID = await AdminGetCompanyById(payload);

        if (companyDataByID?.id) {
          setEditData(companyDataByID);
        } else {
          setWrongIdCheck(true);
        }
      }
      setLoader(false);
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        BusinessName: editData?.company_name || "",
        CompanyName: editData?.legal_company_name || "",
        EntityType: editData?.entity_type || "",
        QBCCNO: editData?.qbcc_number || "",

        Email: editData?.company_email_id || "",

        Address: editData?.company_address || "",
        PhoneNumber: editData?.company_phone_no || "",
        country: editData?.country || "",
        latitude: editData?.latitude || "",
        longitude: editData?.longitude || "",
        place_id: editData?.place_id || "",
        region: editData?.region || "",
        ACN: editData?.acn_number || "",
        ABN: editData?.abn_number || "",
        TFN: editData?.tfn_number || "",
        AdminBlocked: editData?.is_admin_blocked ? "Blocked" : "UnBlocked",
        UserId: isEdit ? editData?.user_id || "" : "",
        isEmailExistance: false,
        isBusinessExistance: false,
        isQBCCExistance: false,
        imageFile: "",
        image: editData?.icon_base64,
      });
      let entityOpt =
        entityType.find((each) => each.value === editData?.entity_type) || {};
      setSelectedEntityType(entityOpt);
      setBlockedOPtions(
        editData?.is_admin_blocked
          ? { value: "Blocked", label: "Blocked" }
          : { value: "UnBlocked", label: "Un Blocked" }
      );
      setEditBase64url(editData?.icon_base64);
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Email: Yup.string()
      .required("Email is required")
      .matches(
        /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
        "Please enter a valid email address"
      )
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.company_email_id) return true;
        if (!value || value.trim().length < 5) return true; // Handle empty email

        // Call the function to check company email existence
        const companyEmailExistenceResponse = formData.parent.isEmailExistance;
        // await CheckCompanyEmailExistence(value);
        // Check if the email already exists
        if (companyEmailExistenceResponse === "Business email already exists") {
          return this.createError({
            path: this.path,
            message: "Business email already exists",
          });
        }
        if (
          companyEmailExistenceResponse ===
          "Personal and Business email cannot be same."
        ) {
          return this.createError({
            path: this.path,
            message: "Personal and Business email cannot be same.",
          });
        }
        return true;
      }),
    BusinessName: Yup.string()
      .required(" Business name is required")
      .max(100, "Business name must be at most 100 characters")
      .test(function (value, formData: any) {
        console.log("🚀 ~ formData:", formData);
        if (isEdit && value === editData?.company_name) return true;
        if (!value.trim()) return true; // Handle empty email

        const companylExists = formData.parent.isBusinessExistance;
        console.log("🚀 ~ companylExists:", companylExists);
        if (companylExists) {
          return this.createError({
            path: this.path,
            message: "Business Name already exists.",
          });
        }
        return true;
      }),
    CompanyName: Yup.string().max(
      100,
      "Legal Business name must be at most 100 characters"
    ),
    EntityType: Yup.string().required("Entity type is required"),
    AdminBlocked: Yup.string().required("Please select Status"),
    ABN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
    TFN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
    ACN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
    QBCCNO: Yup.string()
      .notRequired()
      .matches(/^\d{8}$/, "QBCC number must be exactly 8 digits")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.qbcc_number) return true;
        if (!value?.trim() || value?.trim().length < 7) return true; // Handle empty email

        const QBCCNOExists = formData.parent.isQBCCExistance;
        if (QBCCNOExists) {
          return this.createError({
            path: this.path,
            message: "QBCC Number already exists.",
          });
        }
        return true;
      }),
    Address: Yup.string().required("Address is required"),
    PhoneNumber: Yup.string()
      .required("Phone number is required")
      .test(
        "is-valid-phone-number",
        "Please enter a valid phone number",
        (value) => isValidPhoneNumber(value)
      ),
    ...(isEdit
      ? {}
      : {
          UserId: Yup.string().required("User is required"),
        }),
  });

  function handleNumberFieldChange(e: any, fieldName: string) {
    let value = e?.target?.value.trim();

    if (NUMBER_REGEX.test(value) || value === "") {
      formik.setFieldValue(fieldName, value);
    }
  }
  function handlePlacesInputChange(value: string, placeDetails: any) {
    // Handle the input change and place details here

    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    formik.setValues({
      BusinessName: formik.values.BusinessName,
      CompanyName: formik.values.CompanyName,
      EntityType: formik.values.EntityType,
      QBCCNO: formik.values.QBCCNO,
      ACN: formik.values.ACN,
      ABN: formik.values.ABN,
      TFN: formik.values.TFN,
      Address: value,
      PhoneNumber: formik.values.PhoneNumber,
      Email: formik.values.Email,
      country: placeDetailsString.country,
      latitude: placeDetailsString.latitude,
      longitude: placeDetailsString.longitude,
      place_id: placeDetailsString.place_id,
      region: placeDetailsString.region,
      AdminBlocked: formik.values.AdminBlocked,
      UserId: formik.values.UserId,
      isEmailExistance: formik.values.isEmailExistance,
      isBusinessExistance: formik.values.isBusinessExistance,
      isQBCCExistance: formik.values.isQBCCExistance,
      imageFile: formik.values.imageFile,
      image: "",
    });
  }
  function handleAfterCrop(isCancel: any) {
    if (isCancel) {
      setClearImageName(true);
    }

    setCropImage([]);
    setDisplayImage([]);
    setTimeout(() => {
      setClearImageName(false);
    });
  }
  const handleSelectChange = (newOption: any) => {
    formik.setFieldValue("UserId", newOption.value);
    setSelectedOption(newOption);
  };
  const handleImageCrop = async (uploadedFile: File) => {
    const convertedCanvasToFile: any = await convertCanvasToFile(
      uploadedFile,
      cropImage
    );

    // If validations pass, set the image file

    formik?.setFieldValue("imageFile", convertedCanvasToFile);

    dispatch(
      setCompanyDetails({
        placeDetails: companyDetails?.companyDetails?.placeDetails,
        values: {
          imageFile: convertedCanvasToFile,
          ...companyDetails?.companyDetails?.values,
        },
      })
    );

    // dispatch()
    setDisplayImage([]);
    setCropImage([]);
  };
  const formik = useFormik({
    initialValues: {
      Email: "",
      BusinessName: "",
      CompanyName: "",
      EntityType: "",
      QBCCNO: "",
      Address: "",
      PhoneNumber: "",
      ACN: "",
      ABN: "",
      TFN: "",
      country: "",
      latitude: "",
      longitude: "",
      place_id: "",
      region: "",
      AdminBlocked: "UnBlocked",
      UserId: "",
      isEmailExistance: false,
      isBusinessExistance: false,
      isQBCCExistance: false,
      // primary_admin_name: null,
      image: "", // Add this line to prevent TypeScript errors
      imageFile: "",
      // userId: null,
    },
    validationSchema,
    onSubmit: async (values) => {
      const {
        BusinessName,
        CompanyName,
        EntityType,
        QBCCNO,
        ACN,
        ABN,
        TFN,
        Address,
        PhoneNumber,
        Email,
        // primary_admin_name,
        // userId,
      } = values;
      setDisabledBtn(true);
      let inputPayload = {
        company_id: editData?.company_id,
        company_name: values.BusinessName,
        legal_company_name: values.CompanyName,
        entity_type: values.EntityType,
        qbcc_number: values.QBCCNO,
        acn_number: values.ACN,
        abn_number: values.ABN,
        tfn_number: values.TFN,
        company_address: values.Address,
        company_phone_no: values.PhoneNumber,
        company_email_id: values.Email,
        country: values.country,
        latitude: values.latitude.toString(),
        longitude: values.longitude.toString(),
        place_id: values.place_id,
        region: values.region,
        is_admin_blocked:
          values.AdminBlocked === "Blocked" ? true : false || false,
      };
      try {
        setLoader(true);
        if (isEdit) {
          setLoaderInfo("Updating business profile...");
          // if (
          //   editData?.company_name === BusinessName &&
          //   editData?.legal_company_name === CompanyName &&
          //   editData?.entity_type === EntityType &&
          //   editData?.qbcc_number === QBCCNO &&
          //   editData?.company_email_id === Email &&
          //   editData?.company_address === Address &&
          //   editData?.company_phone_no === PhoneNumber &&
          //   editData?.acn_number === ACN &&
          //   editData?.abn_number === ABN &&
          //   editData?.tfn_number === TFN &&
          //   editData?.is_admin_blocked === inputPayload?.is_admin_blocked &&
          //   files.length === 0
          // ) {
          //   showInfoToast("No changes to save");
          //   setDisabledBtn(false);
          //   return;
          // }
          let modifiedPayload = {
            ...inputPayload,
            company_id: editData?.company_id,
          };
          if (formik.values.imageFile) {
            let userData = {
              company_id: editData?.company_id,
              uploaded_by: decodeTokenData?.emailId || "",
              attachment_type: "Company_logo",
            };
            const fileResponse = await singleUploadApi(
              formik.values.imageFile,
              userData,
              accessTokenId
            );
          }
          let response = await AdminUpdateCompany(
            modifiedPayload,
            "Business profile updated",
            setDisabledBtn
          );
          if (response) {
            router.push(AppRoutes.ADMIN_BUSINESS_LIST);
          }
        } else {
          setLoaderInfo("Saving business profile...");
          // let createdOn = format(new Date(), "yyyy-MM-dd HH:mm:ss"); //"2024-01-25 00:00:00",
          let modifiedPayload = {
            ...inputPayload,
            user_id: Number(formik.values.UserId),
            // created_by: decodeTokenData?.emailId || "",
            // created_on: createdOn,
          };
          const response = await AdminCreateCompanyDetails(
            modifiedPayload,
            "New business profile has been added and email has been sent to the primary admin user.",
            setDisabledBtn
          );

          if (response?.company_id) {
            if (formik.values.imageFile) {
              let userData = {
                company_id: response.company_id,
                uploaded_by: decodeTokenData?.emailId || "",
                attachment_type: "Company_logo",
              };
              const fileResponse = await singleUploadApi(
                formik.values.imageFile,
                userData,
                accessTokenId
              );
            }
            router.push(AppRoutes.ADMIN_BUSINESS_LIST);
          }
        }
      } catch (error) {
        console.error("Error saving business:", error);
      } finally {
        setLoader(false);
        setLoaderInfo(""); // 👈 Clear the loader info after both add/update
      }
    },
  });

  async function handleDeleteLogo() {
    if (isEdit && formik?.values?.image) {
      try {
        const postData = {
          attachmentType: "Company_logo",
          companyId: editData?.company_id,
        };

        const response = await DeleteFile(postData);

        if (response) {
          const tokenData = getDecryptedToken();
          dispatch(setAppUserDetails({ ...tokenData, image: "" }));
          dispatch(setUpdatedCompany({ ...updatedCompany }));
        }
      } catch (err) {}
    }
  }

  const checkNameExistence = async (name: string) => {
    try {
      // Call your API or validation logic for checking email
      const response = await checkCompanyExistence(name); // Example API call

      if (response?.length > 0) {
        formik.setFieldError("BusinessName", "Business Name already exists.");
        formik.setFieldValue("isBusinessExistance", true);
      } else {
        formik.setFieldError("BusinessName", "");
        formik.setFieldValue("isBusinessExistance", false);
      }
      return response;
    } catch (error) {
      throw error; // Propagate the error if the API call fails
    }
  };

  const checkEmailExistence = async (email: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckCompanyEmailExistence(email); // Example API call
    return response;
  };

  const handleRelatedEntityChange = (selectedOption: any) => {
    setSelectedRelatedEntityType(selectedOption);
    formik.setFieldValue("AdminBlocked", selectedOption); // Update the formik field value
    formik.setFieldTouched("AdminBlocked", false); // Reset the touched status
  };
  function onClose() {
    router.push(AppRoutes.ADMIN_BUSINESS_LIST);
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }
  function onImageChange(e: any) {
    const response: any = handleSelectedImage(e);

    if (response?.length > 0) {
      setDisplayImage(response);
      setCropImage(response);
      return true;
    } else {
      setCropImage([]);
      setDisplayImage([]);
      return false;
    }
  }
  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }
  const getAdminUsersList = async (inputValue: any) => {
    if (inputValue.length > 2) {
      const responseData = await AdminListAllUsers({
        page: null,
        perPage: null,
        keyWord: inputValue,
        status: "",
      });
      const modifiedData =
        responseData?.users &&
        responseData?.users.map((each: any) => ({
          value: each?.user_id.toString(),
          label: `${each?.first_name} ${
            each?.last_name ? each?.last_name : ""
          } (${each?.email_id})`,
        }));
      // setUserOptions(modifiedData);
      return modifiedData;
    } else {
      return [];
    }
  };
  const debouncedLoadOptions = debounce(async (inputValue, callback) => {
    try {
      const options = await getAdminUsersList(inputValue);
      callback(options);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  }, 500); // Customizable debounce delay in milliseconds
  const loadOptions = useCallback(
    (inputValue: any, callback: any) => {
      debouncedLoadOptions(inputValue, callback);
    },
    [debouncedLoadOptions]
  );

  const handleEmailfieldChange = (e: any) => {
    let email = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Email", email);
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Dashboard",
              },
              {
                path: AppRoutes.ADMIN_BUSINESS_LIST,
                name: "Business Profiles",
              },
            ]}
            activeRoute={
              isEdit ? "Edit business profile" : "Add business profile"
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
                        ? "Edit business profile"
                        : "Add business profile"}
                    </h4>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Business name"}
                        name={"BusinessName"}
                        id={"BusinessName"}
                        error={formik.errors.BusinessName}
                        showError={
                          formik.touched.BusinessName &&
                          formik.errors.BusinessName
                        }
                        required
                        onChange={handleBusinessNameChange}
                        onBlur={formik.handleBlur}
                        // onBlur={formik.handleBlur("BusinessName")}
                        value={formik.values?.BusinessName}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Legal business name (If applicable)"}
                        name={"CompanyName"}
                        error={formik.errors.CompanyName}
                        showError={
                          formik.touched.CompanyName &&
                          formik.errors.CompanyName
                        }
                        onChange={formik?.handleChange}
                        onBlur={formik.handleBlur("CompanyName")}
                        value={formik.values.CompanyName}
                      />
                      <FormikControl
                        placeholder={"Select an entity type"}
                        required
                        label={"Entity type"}
                        name={"EntityType"}
                        options={entityType}
                        control={InputType.SELECT}
                        error={formik.errors.EntityType}
                        showError={
                          formik.touched.EntityType && formik.errors.EntityType
                        }
                        value={selectedEntityType}
                        onBlur={formik.handleBlur("EntityType")}
                        renderKey="label"
                        valueKey="value"
                        onChange={(value: any) => {
                          setSelectedEntityType(value);
                          formik.setFieldValue("EntityType", value); // Update the formik field value
                          formik.setFieldTouched("EntityType", false); // Reset the touched status to hide error
                        }}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"QBCC No"}
                        type={"text"}
                        name={"QBCCNO"}
                        maxLength={8}
                        error={formik.errors.QBCCNO}
                        showError={
                          formik.touched.QBCCNO && formik.errors.QBCCNO
                        }
                        onChange={(e: any) =>
                          handleNumberFieldChange(e, "QBCCNO")
                        }
                        onBlur={formik.handleBlur("QBCCNO")}
                        value={formik.values.QBCCNO}
                      />
                      <div>
                        <label htmlFor="phonenumber">
                          <small>
                            Phone number<span className="required">*</span>
                          </small>
                        </label>
                        <PhoneInputField
                          id="PhoneNumber"
                          name="PhoneNumber"
                          error={
                            !!(
                              formik.touched.PhoneNumber &&
                              formik.errors.PhoneNumber
                            )
                          }
                          value={formik?.values?.PhoneNumber || ""}
                          onChange={formik.handleChange("PhoneNumber")}
                          onBlur={formik.handleBlur("PhoneNumber")}
                          showErrorIcon={Boolean(
                            formik.touched.PhoneNumber &&
                              formik.errors.PhoneNumber
                          )}
                        />
                        {formik.touched.PhoneNumber &&
                          formik.errors.PhoneNumber && (
                            <div className="mb_1">
                              <small className={"invalid"}>
                                <i className="fa-light fa-circle-x" />
                                {formik.errors.PhoneNumber}
                              </small>
                            </div>
                          )}
                      </div>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Email"}
                        required
                        name={"Email"}
                        disabled={isEdit}
                        error={formik.errors.Email}
                        showError={formik.touched.Email && formik.errors.Email}
                        onChange={handleEmailfieldChange}
                        onBlur={formik.handleBlur("Email")}
                        value={formik.values.Email}
                      />
                      <div className="address-field">
                        <label htmlFor="address">
                          <small>
                            Registered address
                            <span className="required">*</span>
                          </small>
                        </label>
                        <div className={`google-places-field`}>
                          <GooglePlacesInput
                            apiKey={
                              process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
                            }
                            value={formik.values.Address}
                            onChange={handlePlacesInputChange}
                            onBlur={formik.handleBlur("Address")}
                          />
                          {formik.touched.Address && formik.errors.Address && (
                            <div className={"error_wrap"}>
                              <small className={"invalid "}>
                                <i className="fa-light fa-circle-x" />
                                {formik.errors.Address}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                      <FormikControl
                        placeholder={""}
                        required
                        label={"Admin Blocked"}
                        name={"AdminBlocked"}
                        selectedData={formik.values.AdminBlocked}
                        options={options}
                        control={"select"} // Assuming InputType.SELECT resolves to "select"
                        error={formik.errors.AdminBlocked}
                        showError={
                          formik.touched.AdminBlocked &&
                          !!formik.errors.AdminBlocked
                        }
                        value={formik.values.AdminBlocked}
                        onBlur={formik.handleBlur("AdminBlocked")}
                        renderKey="label"
                        valueKey="value"
                        onChange={handleRelatedEntityChange}
                      />
                      {isEdit ? (
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label="Business Primary Admin "
                          required
                          placeholder={" Search the User"}
                          value={
                            editData?.primary_admin_name ||
                            editData?.primary_admin_id
                          }
                        />
                      ) : (
                        <>
                          <label className="labelStyle">
                            <small>
                              Business Primary Admin{" "}
                              <span className="linkStyles">*</span>
                            </small>
                          </label>
                          <AsyncSelect
                            cacheOptions
                            loadOptions={loadOptions}
                            onChange={handleSelectChange}
                            value={selectedOption}
                            placeholder={" "}
                            openMenuOnClick={false}
                            styles={customStyles}
                          />
                          {/* Ensure the error message is displayed if there's an error */}
                          {formik.errors.UserId && formik.touched.UserId && (
                            <small className="invalid">
                              <i className="fa-light fa-circle-xmark"></i>
                              <span>{formik.errors.UserId}</span>
                            </small>
                          )}
                        </>
                      )}

                      <br />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"TFN (if applicable)"}
                        name={"TFN"}
                        maxLength={9}
                        showError={formik.touched.TFN && formik.errors.TFN}
                        onChange={(e: any) => handleNumberFieldChange(e, "TFN")}
                        onBlur={formik.handleBlur("TFN")}
                        value={formik.values.TFN}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"ACN (if applicable)"}
                        name={"ACN"}
                        maxLength={9}
                        error={formik.errors.ACN}
                        showError={formik.touched.ACN && formik.errors.ACN}
                        onChange={(e: any) => handleNumberFieldChange(e, "ACN")}
                        onBlur={formik.handleBlur("ACN")}
                        value={formik.values.ACN}
                      />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"ABN (if applicable)"}
                        name={"ABN"}
                        maxLength={11}
                        error={formik.errors.ABN}
                        showError={formik.touched.ABN && formik.errors.ABN}
                        onChange={(e: any) => handleNumberFieldChange(e, "ABN")}
                        onBlur={formik.handleBlur("ABN")}
                        value={formik.values.ABN}
                      />
                      <ImageUploader
                        onImageSelect={(e: any) => onImageChange(e)}
                        accept={UploadImage.jpegAndPng}
                        label="Upload company logo"
                        selectedImage={
                          cropImage?.length > 0
                            ? cropImage[0]
                            : formik?.values?.imageFile || ""
                        }
                        onImageRemove={() => {
                          setCropImage([]);
                          handleDeleteLogo();
                          formik?.setFieldValue("imageFile", "");
                          formik?.setFieldValue("image", "");
                          setDisplayImage([]);
                        }}
                        imageRef={fileInputRef}
                        disabled={
                          !!formik?.values?.imageFile || !!formik?.values?.image
                        }
                        clearImageName={clearImageName}
                        base64Image={isEdit ? formik?.values?.image : ""}
                      />
                      {displayImage?.length > 0 && (
                        <ImageCropper
                          selectedImage={displayImage}
                          displayCropper={displayImage?.length > 0}
                          handleCroppedImage={(selectedCanvas: any) => {
                            handleImageCrop(selectedCanvas);
                            setDisplayImage([]);
                          }}
                          removeSelectedImage={handleAfterCrop}
                        />
                      )}
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
              <h4 className="text_center">
                {" "}
                Are you sure to close and not save?
              </h4>
            </BaseModal>
          )}
        </div>
      </div>
    </div>
  );
};
export default AddBusinessProfiles;
