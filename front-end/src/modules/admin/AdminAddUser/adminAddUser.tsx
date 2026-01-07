"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";
import { isValidPhoneNumber } from "react-phone-number-input";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useDebouncedFieldCheck, useTokenDetails } from "@/hooks";
import {
  AdminCreateUserDetails,
  AdminGetUserById,
  AdminUpdateUser,
} from "./adminAddUser.functions";
import { buttonType, EMAIL_REGEX, InputType } from "@/shared/constant/general";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { CheckUserExistence } from "@/network/apolloClient";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import PhoneInputField from "@/components/phoneNumberInput";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import GooglePlacesInput from "@/components/GooglePlaces";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Blocked", label: "Blocked" },
  { value: "Inactive", label: "In Active" },
];

const AdminAddUser = (props: any) => {
  const { isEdit = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();
  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");

  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [hasFormChanged, setHasFormChanged] = useState(false);

  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<any>({});
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [singleselectedStatus, setSingleSelectedStatus] = useState<any>({
    value: "Active",
    label: "Active",
  });

  useEffect(() => {
    (async () => {
      setLoader(true);
      if (isEdit && params?.id) {
        const payload: any = {
          userId: Number(params?.id) || "",
        };
        const userDataByID = await AdminGetUserById(payload);

        if (userDataByID?.id) {
          setEditData(userDataByID);
        } else {
          setWorngIdCheck(true);
        }
      }
      setLoader(false);
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        Name: editData?.first_name || "",
        LastName: editData?.last_name || "",
        Email: editData?.email_id || "",
        // Password: "", // Don't pre-fill password in edit mode
        Position: editData?.position_title || "",
        Company: editData?.company_name || "",
        Address: editData?.user_address || "",
        PhoneNumber: editData?.user_phone_no || "",
        country: editData?.country || "",
        latitude: editData?.latitude || "",
        longitude: editData?.longitude || "",
        place_id: editData?.place_id || "",
        region: editData?.region || "",
        Status: editData?.user_status || "Active",
        Role: editData?.user_role || "STANDARD USER",
        occupation: editData?.occupation || "",
        isEmailExistance: false,
      });
      let statusOpt =
        statusOptions.find((each) => each.value === editData?.user_status) ||
        {};
      // let rolesOpt =
      //   roleOptions.find((each) => each.value === editData?.user_role) || {};
      setSingleSelectedStatus(statusOpt);
      // setSingleSelectedRole(rolesOpt);
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("First Name is required")
      .max(25, "First Name must be at most 25 characters"),
    LastName: Yup.string().max(25, "Last Name must be at most 25 characters"),
    Position: Yup.string()
      .required("Position is required")
      .max(30, "Position must be at most 30 characters"),
    // occupation: Yup.string()
    //   .required("Occupation is required")
    //   .max(30, "Occupation must be at most 30 characters"),
    Company: Yup.string()
      .required("Company name is required")
      .max(50, "Company name must be at most 50 characters"),
    Address: Yup.string().required("Address is required"),
    Status: Yup.string().required("Status is required"),
    Role: Yup.string().required("Role is required"),
    PhoneNumber: Yup.string()
      .required("Phone number is required")
      .test(
        "is-valid-phone-number",
        "Please enter a valid phone number",
        (value) => isValidPhoneNumber(value)
      ),
    Email: Yup.string()
      .required("Email is required")
      .matches(EMAIL_REGEX, "Please enter a valid email address")
      .test("check-email", "Email already exists", async function (value) {
        // Skip check if in edit mode and the email hasn’t changed
        if (isEdit && value === editData?.email_id) return true;
        if (!value || value.trim().length < 5) return true;
        try {
          // Call your API to check email existence.
          // The API returns a non-empty array if the email exists.
          const response = await CheckUserExistence(value);
          if (response && Array.isArray(response) && response.length > 0) {
            return this.createError({ message: "Email already exists" });
          }
          return true;
        } catch (err) {
          // Optionally, log the error or decide what to do if the check fails.
          return true;
        }
      }),
    // Email: Yup.string()
    //   .required("Email is required")
    //   .matches(EMAIL_REGEX, "Please enter a valid email address")
    //   .test(function (value, formData: any) {
    //     console.log("🚀 ~ formData:", formData);
    //     console.log("🚀 ~ value:", value);
    //     if (isEdit && value === editData?.email_id) return true;
    //     if (!value || value.trim().length < 5) return true; // Handle empty email

    //     const isEmailExist = formData.parent.isEmailExistance;
    //     console.log("🚀 ~ isEmailExist:", isEmailExist);
    //     if (!value) return true; // Handle empty email
    //     if (isEmailExist) {
    //       return formData.createError({
    //         path: formData.path,
    //         message: "Email already exists",
    //       });
    //     }
    //     return true;
    //   }),
  });

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here

    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    formik.setValues({
      Name: formik.values.Name,
      LastName: formik.values.LastName,
      Position: formik.values.Position,
      Company: formik.values.Company,
      Status: formik.values.Status,
      Role: formik.values.Role,
      occupation: formik.values.occupation,
      Address: value,
      PhoneNumber: formik.values.PhoneNumber,
      Email: formik.values.Email,
      // Password: formik.values.Password,
      country: placeDetailsString.country,
      latitude: placeDetailsString.latitude,
      longitude: placeDetailsString.longitude,
      place_id: placeDetailsString.place_id,
      region: placeDetailsString.region,
      isEmailExistance: formik.values.isEmailExistance,
    });
  };
  const formik = useFormik({
    initialValues: {
      Name: "",
      LastName: "",
      Position: "",
      Company: "",
      Address: "",
      PhoneNumber: "",
      Status: "Active",
      Role: "STANDARD USER",
      occupation: "",
      Email: "",
      // Password: "",
      country: "",
      latitude: "",
      longitude: "",
      place_id: "",
      region: "",
      isEmailExistance: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      const {
        Name,
        LastName,
        Position,
        Company,
        Address,
        PhoneNumber,
        Email,
        occupation,
        Role,
        Status,
      } = values;
      let inputPayload = {
        first_name: values.Name,
        last_name: values.LastName,
        position_title: values.Position,
        company_name: values.Company,
        user_address: values.Address,
        user_phone_no: values.PhoneNumber,
        email_id: values.Email,
        country: values.country,
        latitude: values.latitude.toString(),
        longitude: values.longitude.toString(),
        place_id: values.place_id,
        region: values.region,
        occupation: values.occupation,
        user_status: values.Status,
        user_role: values.Role,
      };
      if (isEdit) {
        if (
          Name === editData?.first_name &&
          LastName === editData?.last_name &&
          Email === editData?.email_id &&
          Company === editData?.company_name &&
          Position === editData?.position_title &&
          Address === editData?.user_address &&
          PhoneNumber === editData?.user_phone_no &&
          Status === editData?.user_status &&
          Role === editData?.user_role &&
          occupation === editData?.occupation
        ) {
          toast.info("No changes to save");
          setIsLoading(false);
          return;
        }
        setLoader(true);
        setLoaderInfo("Updating user...");
        let modifiedPayload = {
          ...inputPayload,
          user_id: editData?.user_id,
        };

        let response = await AdminUpdateUser(
          modifiedPayload,
          "User has been updated",
          setIsLoading
        );
        setLoaderInfo("");
        setLoader(false);
        if (response) {
          router.push(AppRoutes.ADMIN_NORMAL_USERS_LIST);
        }
      } else {
        setLoader(true);
        setLoaderInfo("Saving user...");
        let createdOn = format(new Date(), "yyyy-MM-dd HH:mm:ss"); //"2024-01-25 00:00:00",
        let modifiedPayload = {
          ...inputPayload,
          created_by: decodeTokenData?.userId || "",
          created_on: createdOn,
        };
        const response = await AdminCreateUserDetails(
          modifiedPayload,
          "New user has been added and email has been sent to the user.",
          setIsLoading
        );
        setLoaderInfo("");
        setLoader(false);
        if (response) {
          router.push(AppRoutes.ADMIN_NORMAL_USERS_LIST);
        }
      }
    },
  });
  console.log("🚀 ~ AdminAddUser ~ formik:", formik);

  const checkEmailExistence = async (email: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckUserExistence(email); // Example API call
    return response;
  };

  const isEmailChecking = useDebouncedFieldCheck(
    formik.values.Email,
    checkEmailExistence,
    () => {
      formik.setFieldError("Email", "Email already exists");
      formik.setFieldValue("isEmailExistance", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Email", "");
      formik.setFieldValue("isEmailExistance", false);
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
    formik.setFieldValue("LastName", lastname);
  }, []);
  const handleEmailfieldChange = (e: any) => {
    let email = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Email", email);
  };
  const handlePositionChange = useCallback((e: any) => {
    let position = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Position", position);
  }, []);
  const handleCompanyChange = useCallback((e: any) => {
    let company = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Company", company);
  }, []);
  const handleOccupationChange = useCallback((e: any) => {
    let occupation = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("occupation", occupation);
  }, []);
  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
  };
  useEffect(() => {
    checkFormChanges();
  }, [formik.values]);

  const checkFormChanges = () => {
    const {
      Name,
      LastName,
      Email,
      Status,
      Position,
      Company,
      Address,
      PhoneNumber,
      Role,
      occupation,
    } = formik.values;
    if (
      Name !== editData?.first_name ||
      LastName !== editData?.last_name ||
      Email !== editData?.email_id ||
      Position !== editData?.position_title ||
      Company !== editData?.company_name ||
      Address !== editData?.user_address ||
      PhoneNumber !== editData?.user_phone_no ||
      Status !== editData?.user_status ||
      Role !== editData?.user_role ||
      occupation !== editData?.occupation
    ) {
      setHasFormChanged(true);
    } else {
      setHasFormChanged(false);
    }
  };

  function onClose() {
    setDisplayClosePageConfirmation(true);
    router.push(AppRoutes.ADMIN_NORMAL_USERS_LIST);
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  const handleCancelClick = () => {
    if (isEdit && hasFormChanged) {
      setDisplayClosePageConfirmation(true);
    } else if (!isEdit) {
      setDisplayClosePageConfirmation(true);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else {
      router.push(AppRoutes.ADMIN_NORMAL_USERS_LIST);
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Home",
              },
              {
                path: AppRoutes.ADMIN_NORMAL_USERS_LIST,
                name: "Manage users",
              },
            ]}
            activeRoute={isEdit ? "Edit user" : "Add user"}
          />
        </div>
        <br />
        {wrongIdCheck ? (
          <div className="text_center">No data available on this id</div>
        ) : (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{`${isEdit ? "Edit" : "Add"}  user`}</h4>
                      <br />
                      <form onSubmit={formik.handleSubmit}>
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"First name"}
                          name={"Name"}
                          maxLength={26}
                          required
                          placeholder=""
                          error={formik.errors?.Name}
                          showError={formik.touched.Name && formik.errors.Name}
                          onChange={handleFirstNameChange}
                          onBlur={formik.handleBlur}
                          value={formik.values?.Name}
                        />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Last name"}
                          maxLength={26}
                          name={"LastName"}
                          placeholder=""
                          error={formik.errors?.LastName}
                          showError={
                            formik.touched.LastName && formik.errors.LastName
                          }
                          value={formik.values.LastName}
                          onChange={handleLastNameChange}
                          onBlur={formik.handleBlur}
                        />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Email"}
                          name={"Email"}
                          required
                          placeholder=""
                          error={formik.errors.Email}
                          showError={
                            formik.touched.Email && formik.errors.Email
                          }
                          disabled={isEdit}
                          value={formik.values.Email}
                          onChange={handleEmailfieldChange}
                          onBlur={formik.handleBlur}
                        />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Position"}
                          maxLength={31}
                          name={"Position"}
                          required
                          placeholder=""
                          error={formik.errors?.Position}
                          showError={
                            formik.touched.Position && formik.errors.Position
                          }
                          value={formik.values.Position}
                          onChange={handlePositionChange}
                          onBlur={formik.handleBlur}
                        />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Company"}
                          maxLength={51}
                          name={"Company"}
                          required
                          placeholder=""
                          error={formik.errors?.Company}
                          showError={
                            formik.touched.Company && formik.errors.Company
                          }
                          value={formik.values.Company}
                          onChange={handleCompanyChange}
                          onBlur={formik.handleBlur}
                        />
                        <div>
                          <label htmlFor="phonenumber">
                            <small>
                              Phone number <span className="required">*</span>
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
                            value={formik.values.PhoneNumber}
                            onChange={formik.handleChange("PhoneNumber")}
                            onBlur={formik.handleBlur("PhoneNumber")}
                            showErrorIcon={Boolean(
                              formik.touched.PhoneNumber &&
                                formik.errors.PhoneNumber
                            )}
                          ></PhoneInputField>
                          {formik.touched.PhoneNumber &&
                          formik.errors.PhoneNumber &&
                          typeof formik.errors.PhoneNumber === "string" ? (
                            <small className={"invalid"}>
                              <i className="fa-light fa-circle-x" />
                              {formik.errors.PhoneNumber}
                            </small>
                          ) : null}
                        </div>
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Role"}
                          maxLength={51}
                          name={"Role"}
                          required
                          placeholder=""
                          disabled={true}
                          error={formik.errors?.Role}
                          showError={formik.touched.Role && formik.errors.Role}
                          value={formik.values.Role}
                          //   onChange={handleCompanyChange}
                          //   onBlur={formik.handleBlur}
                        />
                        <SearchableSelect
                          placeholder=""
                          label="Status"
                          required
                          name="claimSelect"
                          options={statusOptions}
                          onChange={(selectedOption) => {
                            setSingleSelectedStatus(selectedOption);
                            formik.handleChange("Status")(selectedOption.value);
                          }}
                          isRequired={
                            !formik.values.Status && formik.touched.Status
                              ? true
                              : false
                          }
                          errorMessage={formik.errors.Status}
                          selectedData={singleselectedStatus}
                          renderKey="label"
                          valueKey="value"
                        />
                        <br />
                        <label htmlFor="address">
                          <small>
                            Address <span className="required">*</span>
                          </small>
                        </label>
                        <div className={`google-places-field`}>
                          <GooglePlacesInput
                            apiKey={
                              process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
                            }
                            isInvalid={
                              !!(
                                formik.touched.Address && formik.errors.Address
                              )
                            }
                            value={formik.values.Address}
                            onChange={handlePlacesInputChange}
                            onBlur={formik.handleBlur("Address")}
                          />
                          {formik.touched.Address &&
                          formik.errors.Address &&
                          typeof formik.errors.Address === "string" ? (
                            <div className={"error_wrap"}>
                              <small className={"invalid"}>
                                <i className="fa-light fa-circle-x" />
                                {formik.errors.Address}
                              </small>
                            </div>
                          ) : null}
                        </div>
                        <br />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Occupation"}
                          name={"Occupation"}
                          placeholder=""
                          error={formik.errors?.occupation}
                          showError={
                            formik.touched.occupation &&
                            formik.errors.occupation
                          }
                          value={formik.values.occupation}
                          onChange={handleOccupationChange}
                          onBlur={formik.handleBlur}
                        />
                        <br />
                        <br />
                        <div className="button-container">
                          <CustomButton
                            buttonName={"Cancel"}
                            buttonType={buttonType.OUTLINE_CONTRAST}
                            actionType="button"
                            onClick={() => handleCancelClick()}
                            inputButton
                          />
                          <CustomButton
                            buttonName={isEdit ? "Update" : "Save"}
                            buttonType={buttonType.SECONDARY}
                            actionType="submit"
                            inputButton
                            disabled={isLoading}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {displayClosePageConfirmation && (
          <BaseModal
            modalId={"updatePlan confirmation"}
            displayModal={displayClosePageConfirmation}
            onClose={handlePageConfirmClose}
            onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
            onConfirm={handlePageConfirmSave}
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

export default AdminAddUser;
