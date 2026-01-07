"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import Image from "next/image";
import * as Yup from "yup";
import { Eye, EyeSlash } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./addAdminUser.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import commonStyles from "./../../../common/commonStyles.module.scss";
import { IGroupsData, listAllGroups } from "@/app/api/adminAPIs/adminAPIs";
import { format } from "date-fns";
import { useDebouncedFieldCheck, useTokenDetails } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams } from "next/navigation";
import { toast } from "@/app/Toaster";
import { CheckAdminExistence } from "@/app/api/existanceAPIsCheck";
import {
  GetAdminDetailsById,
  insertAdminDetails,
  UpdateAdminDetails,
} from "./addAdminUser.functions";
import SignatureUploader from "@/components/SignatureUploader";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";

const AddAdminUser = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const [isPWDShow, setIsPWDShow] = useState(false);
  const routePath = usePathname();
  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [groupOptions, setGroupOptions] = useState([]);
  const [multiSelectedData, setMultiSelectedData] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [editData, setEditData] = useState<any>({});
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();

  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState("");

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
          Password: Yup.string()
            .required("Password is required")
            .min(
              8,
              "Password must contain 8 or more characters with at least one of each: uppercase, lowercase, number, and special"
            )
            .matches(
              /^(?=.*[a-z])/,
              "Password must contain at least 1 lowercase letter"
            )
            .matches(
              /^(?=.*[A-Z])/,
              "Password must contain at least 1 uppercase letter"
            )
            .matches(/^(?=.*\d)/, "Password must contain at least 1 number")
            .matches(
              /^(?=.*[@$!%*?&])/,
              "Password must contain at least 1 special character"
            ),
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
          toast.info("No changes to save");
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
          router.push(ApplicationURLS.ADMIN_USERS_LIST);
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
          router.push(ApplicationURLS.ADMIN_USERS_LIST);
        }
      }
    },
  });

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

  const togglePasswordVisibility = () => {
    setIsPWDShow(!isPWDShow);
  };

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
            href: ApplicationURLS.ADMIN_USERS_LIST,
            label: "Admin Users",
            active: false,
          },
          {
            href: "",
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
            } Admin User`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik?.errors?.Name as string}
                isInvalid={
                  formik?.touched?.Name && formik?.errors?.Name ? true : false
                }
                labelText="First Name *"
                name="Name"
                id="Name"
                required
                value={formik.values.Name}
                onChange={handleFirstNameChange}
                // onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                labelText="Last Name"
                errorText={formik.errors.LastName as string}
                isInvalid={
                  formik?.touched?.LastName && formik?.errors?.LastName
                    ? true
                    : false
                }
                name="LastName"
                id="LastName"
                value={formik?.values?.LastName}
                onChange={handleLastNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={styles.textFieldStyles}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                autoComplete="off" // Add this line
                errorText={formik?.errors?.Email as string}
                isInvalid={
                  formik?.touched?.Email && formik?.errors?.Email ? true : false
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
            {!isEdit ? (
              <Col lg={6}>
                <TextField
                  placeholder=""
                  autoComplete="new-password" // Add this line
                  type={isPWDShow ? "text" : "password"}
                  errorText={formik.errors.Password}
                  labelText="Password *"
                  isInvalid={
                    formik?.touched?.Password && formik?.errors?.Password
                      ? true
                      : false
                  }
                  name="Password"
                  id="Password"
                  required
                  value={formik.values.Password}
                  onChange={handlePasswordChange}
                  onBlur={formik.handleBlur}
                  endingData={
                    isPWDShow ? (
                      <Eye className={styles.eyeIconStyle} />
                    ) : (
                      <EyeSlash className={styles.eyeIconStyle} />
                    )
                  }
                  endingDataStyles={styles.endIconStyle}
                  onEndIconClick={togglePasswordVisibility}
                  classNames={commonStyles.inputFieldControl}
                />
              </Col>
            ) : (
              <Col lg={6}>
                <SearchableSelect
                  key={timeKey}
                  options={groupOptions}
                  isMulti
                  multiSelectedData={multiSelectedData}
                  onChange={(selectedOption) => {
                    setMultiSelectedData(selectedOption);
                    let optValues = selectedOption.map(
                      (each: any) => each.value
                    );
                    formik.setFieldValue("Group", optValues);
                  }}
                  placeholder="Select groups"
                  controlStyles={customStyles}
                  label="Groups *"
                  isRequired={
                    !formik?.values?.Group?.length && formik.touched.Group
                      ? true
                      : false
                  }
                  errorMessage={formik?.errors?.Group as string}
                />
              </Col>
            )}
          </Row>
          <Row className={styles.textFieldStyles}>
            {!isEdit && (
              <Col lg={6} className={styles.eachFieldBottom}>
                <SearchableSelect
                  key={timeKey}
                  options={groupOptions}
                  isMulti
                  multiSelectedData={multiSelectedData}
                  onChange={(selectedOption) => {
                    setMultiSelectedData(selectedOption);
                    let optValues = selectedOption.map(
                      (each: any) => each.value
                    );
                    formik.setFieldValue("Group", optValues);
                  }}
                  placeholder="Select groups"
                  controlStyles={customStyles}
                  label="Groups *"
                  isRequired={
                    !formik?.values?.Group?.length && formik.touched.Group
                      ? true
                      : false
                  }
                  errorMessage={formik?.errors?.Group as string}
                />
              </Col>
            )}
            <Col lg={6}>
              <SearchableSelect
                key={timeKey}
                options={options}
                selectedData={selectedData}
                onChange={(selectedOption) => {
                  formik.handleChange("Status")(selectedOption.value);
                  setSingleSelectedData(selectedOption);
                }}
                placeholder="Status"
                controlStyles={customStyles}
                label="Status *"
                isRequired={
                  !formik?.values?.Status && formik.touched.Status
                    ? true
                    : false
                }
                errorMessage={formik?.errors?.Status as string}
              />
            </Col>
          </Row>

          {isEdit &&
            editData?.admin_role === SUPER_ADMIN_ROLE &&
            decodeTokenData?.role === SUPER_ADMIN_ROLE &&
            decodeTokenData?.id === editData?.id && (
              <>
                <p className={styles.InfoTextStyle}>
                  Delegated authority signature
                </p>
                <div
                  className={styles.imageContainer}
                  onClick={() => setDisplaySignature(true)}
                >
                  {signature || editData?.signature ? (
                    <Image
                      width={0}
                      height={0}
                      // src={imageUrl}
                      src={signature || editData?.signature || ""}
                      alt="Uploaded"
                      style={{
                        objectFit: "contain",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  ) : (
                    <span style={{ paddingLeft: "7px" }}>Upload sign</span>
                  )}
                </div>
              </>
            )}

          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_USERS_LIST);
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
      {displaySignature &&
        isEdit &&
        editData?.admin_role === SUPER_ADMIN_ROLE &&
        decodeTokenData?.role === SUPER_ADMIN_ROLE &&
        decodeTokenData?.id === editData?.id && (
          <SignatureUploader
            isDisplay={displaySignature}
            handleClose={() => setDisplaySignature(false)}
            onConfirmation={(signature: string, type: string) => {
              setSignature(signature);
              setSignatureType(type);
              setDisplaySignature(false);
            }}
            title="Edit Signature"
            buttonName={"Apply Changes"}
            data={{
              file: signature || editData?.signature,
              type: signatureType || editData?.signature_type,
            }}
          />
        )}
    </div>
  );
};

export default AddAdminUser;
