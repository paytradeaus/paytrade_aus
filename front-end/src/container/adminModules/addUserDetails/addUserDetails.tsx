"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import styles from "./addUserDetails.module.scss";
import commonStyles from "./../../../common/commonStyles.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useLoaderContext } from "@/context/useLoader";
import {
  AdminCreateUserDetails,
  AdminGetUserById,
  AdminUpdateUser,
} from "./addUserDetails.fucntions";
import { isValidPhoneNumber } from "react-phone-number-input";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useDebouncedFieldCheck, useTokenDetails } from "@/common/commonHooks";
import { format } from "date-fns";
import { EMAIL_REGEX } from "@/common/constants/general";
import { toast } from "react-toastify";
import { CheckUserExistence } from "@/app/api/existanceAPIsCheck";

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Blocked", label: "Blocked" },
  { value: "Inactive", label: "In Active" },
];
const roleOptions = [
  // { value: "STANDARD USER", label: "Standard User" },
  { value: "BASIC USER", label: "Basic User" },
];

const AddUserDetails = (props: any) => {
  const { isEdit = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const { setLoader }: any = useLoaderContext();
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
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.email_id) return true;
        if (!value || value.trim().length < 5) return true; // Handle empty email

        const isEmailExist = formData.parent.isEmailExistance;
        if (!value) return true; // Handle empty email
        if (isEmailExist) {
          return formData.createError({
            path: formData.path,
            message: "Email already exists",
          });
        }
        return true;
      }),
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
        let modifiedPayload = {
          ...inputPayload,
          user_id: editData?.user_id,
        };

        let response = await AdminUpdateUser(
          modifiedPayload,
          "User has been updated",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_NORMAL_USERS_LIST);
        }
      } else {
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
        if (response) {
          router.push(ApplicationURLS.ADMIN_NORMAL_USERS_LIST);
        }
      }
    },
  });

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
  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_NORMAL_USERS_LIST,
            label: "Users List",
            active: false,
          },
          {
            href: isEdit ? "" : ApplicationURLS.ADMIN_NORMAL_USERS_ADD,
            label: isEdit ? "Edit User" : "Add User",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      {wrongIdCheck ? (
        <div className={styles.noDataStyle}>No data available on this id</div>
      ) : (
        <Form
          onSubmit={formik.handleSubmit}
          noValidate
          className={styles.formStyle}
        >
          <Row>
            <span className={styles.headerText}>{`${
              isEdit ? "Edit" : "Add"
            }  User`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                maxLength={26}
                errorText={formik.errors.Name as string}
                isInvalid={
                  formik.touched.Name && formik.errors.Name ? true : false
                }
                labelText="First Name *"
                name="Name"
                id="Name"
                value={formik.values.Name}
                onChange={handleFirstNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                maxLength={26}
                type="text"
                labelText="Last Name"
                errorText={formik.errors.LastName as string}
                isInvalid={
                  formik.touched.LastName && formik.errors.LastName
                    ? true
                    : false
                }
                name="LastName"
                id="LastName"
                value={formik.values.LastName}
                onChange={handleLastNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.Email as string}
                isInvalid={
                  formik.touched.Email && formik.errors.Email ? true : false
                }
                labelText="Email * "
                name="Email"
                id="Email"
                required
                disabled={isEdit}
                value={formik.values.Email}
                onChange={handleEmailfieldChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                maxLength={31}
                errorText={formik.errors.Position}
                isInvalid={
                  formik.touched.Position && formik.errors.Position
                    ? true
                    : false
                }
                labelText="Position *"
                name="Position"
                id="Position"
                required
                value={formik.values.Position}
                onChange={handlePositionChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.Company}
                isInvalid={
                  formik.touched.Company && formik.errors.Company ? true : false
                }
                maxLength={51}
                labelText="Company *"
                name="Company"
                id="Company"
                required
                value={formik.values.Company}
                onChange={handleCompanyChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <div className={styles.phoneNumberStyles}>
                <label className={styles.labelStyle}>Phone Number *</label>

                <PhoneInputField
                  id="PhoneNumber"
                  name="PhoneNumber"
                  error={
                    formik.touched.PhoneNumber && formik.errors.PhoneNumber
                      ? true
                      : false
                  }
                  value={formik.values.PhoneNumber}
                  onChange={formik.handleChange("PhoneNumber")}
                  onBlur={formik.handleBlur("PhoneNumber")}
                  showErrorIcon={Boolean(
                    formik.touched.PhoneNumber && formik.errors.PhoneNumber
                  )}
                />
                {formik.touched.PhoneNumber && formik.errors.PhoneNumber && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.PhoneNumber}
                    </span>
                  </div>
                )}
              </div>
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder="Role"
                type="text"
                // errorText={formik.errors.Company}
                // isInvalid={
                //   formik.touched.Company && formik.errors.Company ? true : false
                // }
                maxLength={51}
                labelText="Role  *"
                name="Role"
                id="Role"
                required
                disabled
                value={formik.values.Role}
                // onChange={handleCompanyChange}
                // onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <SearchableSelect
                key={timeKey}
                options={statusOptions}
                selectedData={singleselectedStatus}
                onChange={(selectedOption) => {
                  setSingleSelectedStatus(selectedOption);
                  formik.handleChange("Status")(selectedOption.value);
                }}
                placeholder="Status"
                controlStyles={customStyles}
                label="Status  *"
                isRequired={
                  !formik.values.Status && formik.touched.Status ? true : false
                }
                errorMessage={formik.errors.Status}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <div className={styles.googlFiledStyles} key={timeKey}>
                <label className={styles.labelStyle}>Address *</label>
                <GooglePlacesInput
                  key={timeKey}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    formik.touched.Address && formik.errors.Address
                      ? true
                      : false
                  }
                  value={formik.values.Address}
                  onChange={handlePlacesInputChange} //{formik.handleChange("Address")}
                  onBlur={formik.handleBlur("Address")}
                />
                {formik.touched.Address && formik.errors.Address && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.Address}
                    </span>
                  </div>
                )}
              </div>
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.occupation}
                isInvalid={
                  formik.touched.occupation && formik.errors.occupation
                    ? true
                    : false
                }
                labelText="Occupation "
                name="occupation"
                id="occupation"
                value={formik.values.occupation}
                onChange={handleOccupationChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>

          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_NORMAL_USERS_LIST);
              }}
            >
              Cancel
            </FormButton>
            <FormButton
              type={"submit"}
              className={styles.saveBtnStyle}
              disabled={isLoading}
            >
              {isEdit ? "Update" : "Save"}
            </FormButton>
          </div>
        </Form>
      )}
    </div>
  );
};

export default AddUserDetails;
