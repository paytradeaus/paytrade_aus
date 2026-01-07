"use client";
import { IGroupsData, listAllGroups } from "@/app/api/adminApi/adminApi";
import { useDebouncedFieldCheck, useTokenDetails } from "@/hooks";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import Image from "next/image";
import * as Yup from "yup";
import { showInfoToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { CheckAdminExistence } from "@/network/apolloClient";
import {
  GetAdminDetailsById,
  insertAdminDetails,
  UpdateAdminDetails,
} from "./AddAdminUsers.function";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import CustomButton from "@/components/CustomButton/CustomButton";
import { Roles } from "@/shared/constant/role";
import { format } from "date-fns";
import BaseModal from "@/components/BaseModal";
import _ from "lodash";

const AddAdminUser = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const routePath = usePathname();
  const router = useRouter();
  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [groupOptions, setGroupOptions] = useState([]);
  const [multiSelectedData, setMultiSelectedData] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [editData, setEditData] = useState<any>({});
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [wrongStatusCheck, setWrongStatusCheck] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const [hasFormChanged, setHasFormChanged] = useState(false);

  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState("");
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [errValidate, setErrValidate] = React.useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });

  useEffect(() => {
    (async () => {
      const groupsList = await listAllGroups({
        page: null,
        perPage: null,
        keyword: null,
        status: null,
        isAlphabeticalOrder: true,
      });
      if (groupsList?.groups?.length > 0) {
        let convetedOptions = groupsList?.groups
          .filter((each: IGroupsData) => each.group_status === "Active")
          .map((each: IGroupsData) => {
            return {
              value: each?.id,
              label: each?.group_name,
            };
          });
        setGroupOptions(convetedOptions || []);
      }
      if (isEdit && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const userData = await GetAdminDetailsById(payload);
        if (userData?.id) {
          setWrongStatusCheck(userData?.admin_status);
          setEditData(userData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        Name: editData?.first_name || "",
        LastName: editData?.last_name || "",
        Email: editData?.email_id || "",
        Status: editData?.admin_status || "Active",
        Password: "", // Don't pre-fill password in edit mode
        Group: editData?.groupIds || [],
        isEmailExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.admin_status) || {};
      setSingleSelectedData(selOpt);

      const idsToFilterSet = new Set(editData?.groupIds);
      const mulOpts = groupOptions.filter((obj: any) =>
        idsToFilterSet.has(obj.value)
      );
      setMultiSelectedData(mulOpts);

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("First name is required")
      .max(25, "First name must be at most 25 characters"),
    LastName: Yup.string().max(25, "Last name must be at most 25 characters"),
    Email: Yup.string()
      .required("Email is required")
      .matches(
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
        "Please enter a valid email address"
      )
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.email_id) return true;
        if (!value || value.trim().length < 5) return true; // Handle empty email

        const isEmailExist = formData.parent.isEmailExistence;
        if (isEmailExist) {
          return formData.createError({
            path: formData.path,
            message: "Email already exists",
          });
        }
        return true;
      }),
    ...(isEdit
      ? {}
      : {
          Password: Yup.string().required("Password is required"),
        }),
    Status: Yup.string().required("Please select a status"),
    Group: Yup.array()
      .required("Groups is required")
      .min(1, "Groups is required"),
  });
  const formik = useFormik({
    initialValues: {
      Name: isEdit ? editData?.first_name : "",
      LastName: isEdit ? editData?.last_name : "",
      Email: isEdit ? editData?.email_id : "",
      Status: isEdit ? editData?.admin_status : "Active",
      Password: "", // Don't pre-fill password in edit mode
      Group: isEdit ? editData?.groupIds : [],
      isEmailExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!isPasswordValid && !isEdit) {
        return;
      }
      const { Name, LastName, Status, Email, Group } = formik.values;
      let payload = {
        admin_status: formik?.values?.Status,
        email_id: formik?.values?.Email,
        first_name: formik?.values?.Name,
        group_ids: formik?.values?.Group,
        last_name: formik?.values?.LastName,
        signature: signature || editData?.signature || "",
        signature_type: signatureType || editData?.signature_type || "",
        // password: formik.values.Password,
      };
      if (!signatureType && !editData?.signature_type) {
        delete payload?.signature;
        delete payload?.signature_type;
      }
      setIsLoading(true);
      if (isEdit) {
        if (
          editData?.first_name === Name &&
          editData?.last_name === LastName &&
          editData?.email_id === Email &&
          editData?.admin_status === Status &&
          editData?.groupIds === Group &&
          !signature &&
          !signatureType
        ) {
          setIsLoading(false);
          showInfoToast("No changes to save");
          return;
        }
        let modifiedPayload = {
          ...payload,
          id: editData?.id,
        };

        let response = await UpdateAdminDetails(
          modifiedPayload,
          "User status has been updated",
          setIsLoading
        );
        if (response) {
          router.push(AppRoutes.ADMIN_USERS_LIST);
        }
      } else {
        let createdOn = format(new Date(), "yyyy-MM-dd HH:mm:ss"); //"2024-01-25 00:00:00",
        let modifiedPayload = {
          ...payload,
          password: formik?.values?.Password,
          created_by: decodeTokenData?.userId || "",
          created_on: createdOn,
        };
        const response = await insertAdminDetails(
          modifiedPayload,
          "Admin user has been added.",
          setIsLoading
        );
        if (response) {
          router.push(AppRoutes.ADMIN_USERS_LIST);
        }
      }
    },
  });
  console.log("🚀 ~ AddAdminUser ~ formik:", formik);

  const checkEmailExistence = async (email: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckAdminExistence(email); // Example API call
    return response;
  };

  const isEmailChecking = useDebouncedFieldCheck(
    formik.values.Email,
    checkEmailExistence,
    () => {
      formik.setFieldError("Email", "Email already exists");
      formik.setFieldValue("isEmailExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Email", "");
      formik.setFieldValue("isEmailExistence", false);
    } // Success: clear error
  );

  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      height: "40px",
      overflowY: "auto",
    }),
  };

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

  const handlePasswordChange = useCallback((e: any) => {
    let pwd = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Password", pwd);
  }, []);

  useEffect(() => {
    validatepassword(formik.values.Password);
  }, [formik.values.Password]);

  useEffect(() => {
    checkFormChanges();
  }, [formik.values]);

  const PasswordCheck = [
    {
      error: !errValidate.eigthChar,
      msg: "Use 8 or more characters",
      icon: errValidate.eigthChar ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
    {
      error: !errValidate.upperCase || !errValidate.lowercase,
      msg: "Use upper and lower case letters",
      icon:
        errValidate.upperCase && errValidate.lowercase ? (
          <i className="fa-light fa-circle-check" />
        ) : (
          <i className="fa-light fa-circle-x" />
        ),
    },
    {
      error: !errValidate.number,
      msg: "Use a number",
      icon: errValidate.number ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
    {
      error: !errValidate.specialChar,
      msg: "Use a symbol",
      icon: errValidate.specialChar ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
  ];

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  React.useEffect(() => {
    // Check if all password validations are satisfied
    const isValid = Object.values(errValidate).every((value) => value === true);
    setIsPasswordValid(isValid); // Update isPasswordValid state
  }, [errValidate]);

  const hasErrors = PasswordCheck.some((item) => item.error);

  const validatepassword = (value: any) => {
    let val = value?.split("");
    let error = {
      eg: false,
      up: false,
      lc: false,
      num: false,
      sch: false,
    };
    if (value?.length >= 8) {
      error.eg = true;
    }
    val?.map((value: any) => {
      let sch = /^([@$!%*#?&])$/;
      let up = /^([A-Z])$/;
      let lc = /^([a-z])$/;
      let num = /^([0-9])$/;
      if (up.test(value)) {
        error.up = true;
      }
      if (lc.test(value)) {
        error.lc = true;
      }
      if (num.test(value)) {
        error.num = true;
      }
      if (sch.test(value)) {
        error.sch = true;
      }

      return error;
    });

    setErrValidate({
      upperCase: error?.up,
      lowercase: error?.lc,
      eigthChar: error?.eg,
      specialChar: error?.sch,
      number: error?.num,
    });
  };

  useEffect(() => {
    const hasErrors = PasswordCheck.some((item) => item.error);
    setIsPasswordValid(!hasErrors);
  }, [PasswordCheck]);

  const checkFormChanges = () => {
    const { Name, LastName, Email, Status, Group } = formik.values;
    if (
      Name !== editData?.first_name ||
      LastName !== editData?.last_name ||
      Email !== editData?.email_id ||
      Status !== editData?.admin_status ||
      JSON.stringify(Group) !== JSON.stringify(editData?.groupIds)
    ) {
      setHasFormChanged(true);
    } else {
      setHasFormChanged(false);
    }
  };

  function onClose() {
    setDisplayClosePageConfirmation(true);
    router.push(AppRoutes.ADMIN_USERS_LIST);
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
      router.push(AppRoutes.ADMIN_USERS_LIST);
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
                name: "Dashboard",
              },
              {
                path: AppRoutes.ADMIN_USERS_LIST,
                name: "Admin Users",
              },
            ]}
            activeRoute={isEdit ? "Edit Admin User" : "Add Admin User"}
          />
        </div>
        <br />
        {wrongIdCheck ? (
          <div className="text_center">No data available on this ID</div>
        ) : wrongStatusCheck === "Deleted" ? (
          <div className="text_center">
            Respective details are no longer available
          </div>
        ) : (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{`${isEdit ? "Edit" : "Add"}  admin user`}</h4>
                      <br />
                      <form onSubmit={formik.handleSubmit}>
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"First Name"}
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
                          label={"Last Name"}
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
                        {!isEdit && (
                          <>
                            <label htmlFor="password">
                              <small>Password</small>{" "}
                              <span className="required">*</span>
                            </label>
                            <div className="passwordInputWrapper">
                              <input
                                style={{ margin: "0px" }}
                                type={isPWDShow ? "text" : "password"}
                                id="Password"
                                name="Password"
                                placeholder="Password"
                                maxLength={16}
                                value={formik.values.Password}
                                onChange={handlePasswordChange}
                                onBlur={formik.handleBlur}
                                className={
                                  formik.touched.Password &&
                                  formik.errors.Password
                                    ? "invalid-borders" // Apply red border if there’s an error
                                    : "" // No border if valid
                                }
                              />
                              <i
                                className={
                                  isPWDShow
                                    ? "fa-sharp fa-light fa-eye"
                                    : "fa-light fa-eye-slash"
                                }
                                onClick={togglePasswordVisibility}
                              ></i>
                            </div>

                            {formik.errors.Password &&
                              formik.touched.Password && (
                                <small className="invalid">
                                  <i className="fa-light fa-circle-xmark"></i>
                                  {formik.errors.Password}
                                </small>
                              )}

                            {formik.values.Password.length > 0 &&
                              !isPasswordValid && (
                                <div style={{ paddingTop: "1rem" }}>
                                  {PasswordCheck.map((check, index) => (
                                    <div key={index}>
                                      <small
                                        className={
                                          check.error ? "invalid" : "valid"
                                        }
                                      >
                                        {check.icon} <span>{check.msg}</span>
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </>
                        )}
                        <br />

                        <SearchableSelect
                          placeholder="Select groups"
                          label="Groups"
                          name="Group"
                          required
                          isMulti={true}
                          options={groupOptions}
                          multiSelectedData={multiSelectedData}
                          onChange={(selectedOption) => {
                            setMultiSelectedData(selectedOption);
                            let optValues = selectedOption?.map(
                              (each: any) => each.value
                            );
                            formik.setFieldValue("Group", optValues);
                          }}
                          //   isRequired={
                          //     !formik.values.Group && formik.touched.Group
                          //       ? true
                          //       : false
                          //   }
                          isRequired={Boolean(
                            formik.errors.Group && formik.touched.Group
                          )}
                          renderKey="label"
                          valueKey="value"
                          errorMessage={formik?.errors?.Group as string}
                        />
                        <br />

                        <SearchableSelect
                          options={options}
                          selectedData={singleSelectedData}
                          onChange={(selectedOption) => {
                            formik.handleChange("Status")(selectedOption.value);
                            setSingleSelectedData(selectedOption);
                          }}
                          placeholder="Status"
                          label="Status"
                          isRequired={
                            !formik?.values?.Status && formik.touched.Status
                              ? true
                              : false
                          }
                          errorMessage={formik?.errors?.Status as string}
                          renderKey="label"
                          valueKey="value"
                        />
                        <br />
                        <br />
                        {isEdit &&
                          editData?.admin_role === Roles.SUPER_ADMIN_ROLE &&
                          decodeTokenData?.role === Roles.SUPER_ADMIN_ROLE &&
                          decodeTokenData?.id === editData?.id && (
                            <Fragment>
                              <label>
                                <small>Delegated authority signature</small>
                              </label>
                              <Image
                                width={0} // Fixed width
                                height={0} // Fixed height
                                src={signature || editData?.signature || ""}
                                alt={"signature"}
                                onClick={() => setDisplaySignature(true)}
                                className="pt_profileimageupload cu-pointer business_signature_image"
                              />
                              <br />
                            </Fragment>
                          )}
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

export default AddAdminUser;
