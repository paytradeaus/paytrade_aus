"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill, XCircle, Trash } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useParams, usePathname, useRouter } from "next/navigation";
import commonStyles from "./../../../common/commonStyles.module.scss";
import styles from "./addCompanyProfileDetails.module.scss";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  AdminCreateCompanyDetails,
  AdminGetCompanyById,
  AdminUpdateCompany,
  DeleteFile,
} from "./addCompanyProfileDetails.functions";
import { useLoaderContext } from "@/context/useLoader";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useDebouncedFieldCheck, useTokenDetails } from "@/common/commonHooks";
import { AdminlistAllUsers } from "../usersList/userList.functions";
import debounce from "lodash/debounce";
import AsyncSearchSelect from "@/components/AsyncSelect/AsyncSelect";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { toast } from "@/app/Toaster";
import { imageTypeFormats, NUMBER_REGEX } from "@/common/constants/general";
import Image from "next/image";
import FileSelector from "@/components/fileSelector/fileSelector";
import { AppModal } from "@/components/model/model";
import {
  CheckCompanyEmailExistence,
  CheckCompanyExistence,
  CheckQbccExistence,
} from "@/app/api/existanceAPIsCheck";
const AddCompanyProfileDetails = (props: any) => {
  const { isEdit = false, ...rest } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const { setLoader }: any = useLoaderContext();
  const [singleSelectedData, setSingleSelectedData] = useState<any>();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [editData, setEditData] = useState<any>({});
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [editBase64url, setEditBase64url] = useState("");
  const [blockedOptions, setBlockedOPtions] = useState({
    value: "UnBlocked",
    label: "Un Blocked",
  });

  const options = [
    { value: "Blocked", label: "Blocked" },
    { value: "UnBlocked", label: "Unblocked" },
  ];
  const entityOptions = [
    { value: "Business", label: "Business" },
    { value: "Sole Trader", label: "Sole Trader" },
    { value: "Personal", label: "Personal Profile" },
  ];

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
      });
      let entityOpt =
        entityOptions.find((each) => each.value === editData?.entity_type) ||
        {};
      setSingleSelectedData(entityOpt);
      setBlockedOPtions(
        editData?.is_admin_blocked
          ? { value: "Blocked", label: "Blocked" }
          : { value: "UnBlocked", label: "Un Blocked" }
      );
      setEditBase64url(editData?.icon_base64);
      setTimeKey(new Date().getTime());
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
        if (isEdit && value === editData?.company_name) return true;
        if (!value.trim()) return true; // Handle empty email

        const companylExists = formData.parent.isBusinessExistance;
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
  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
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
      } = values;
      setDisabledBtn(true);
      let inputPayload = {
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
      if (isEdit) {
        if (
          editData?.company_name === BusinessName &&
          editData?.legal_company_name === CompanyName &&
          editData?.entity_type === EntityType &&
          editData?.qbcc_number === QBCCNO &&
          editData?.company_email_id === Email &&
          editData?.company_address === Address &&
          editData?.company_phone_no === PhoneNumber &&
          editData?.acn_number === ACN &&
          editData?.abn_number === ABN &&
          editData?.tfn_number === TFN &&
          editData?.is_admin_blocked === inputPayload?.is_admin_blocked &&
          files.length === 0
        ) {
          toast.info("No changes to save");
          setDisabledBtn(false);
          return;
        }
        let modifiedPayload = {
          ...inputPayload,
          company_id: editData?.company_id,
        };
        if (files.length > 0) {
          let userData = {
            company_id: editData?.company_id,
            uploaded_by: decodeTokenData?.emailId || "",
            attachment_type: "Company_logo",
          };
          const fileResponse = await singleUploadApi(
            files[0],
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
          router.push(ApplicationURLS.ADMIN_COMPANY_LIST);
        }
      } else {
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

        if (response?.companyId) {
          if (files.length > 0) {
            let userData = {
              company_id: response.companyId,
              uploaded_by: decodeTokenData?.emailId || "",
              attachment_type: "Company_logo",
            };
            const fileResponse = await singleUploadApi(
              files[0],
              userData,
              accessTokenId
            );
          }
          router.push(ApplicationURLS.ADMIN_COMPANY_LIST);
        }
      }
    },
  });
  const handlePlacesInputChange = (value: string, placeDetails: any) => {
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
    });
  };

  const [selectedOption, setSelectedOption] = useState(null);

  const checkEmailExistence = async (email: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckCompanyEmailExistence(email); // Example API call
    return response;
  };

  const isEmailChecking = useDebouncedFieldCheck(
    formik.values.Email,
    checkEmailExistence,
    (res: any) => {
      formik.setFieldError("Email", "Email already exists");
      formik.setFieldValue("isEmailExistance", true);
      if (
        res === "Business email already exists" ||
        res === "Personal and Business email cannot be same."
      ) {
        formik.setFieldError("Email", res);
        formik.setFieldValue("isEmailExistance", res);
      } else {
        formik.setFieldError("Email", "");
        formik.setFieldValue("isEmailExistance", false);
      }
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Email", "");
      formik.setFieldValue("isEmailExistance", false);
    } // Success: clear error
  );

  const checkNameExistence = async (name: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckCompanyExistence(name); // Example API call
    return response;
  };

  const isNameChecking = useDebouncedFieldCheck(
    formik.values.BusinessName,
    checkNameExistence,
    () => {
      formik.setFieldError("BusinessName", "Business Name already exists.");
      formik.setFieldValue("isBusinessExistance", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("BusinessName", "");
      formik.setFieldValue("isBusinessExistance", false);
    } // Success: clear error
  );

  const checkQBCCExistence = async (qbcc: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckQbccExistence(qbcc); // Example API call
    return response;
  };

  const isQBCCChecking = useDebouncedFieldCheck(
    formik.values.QBCCNO,
    checkQBCCExistence,
    () => {
      formik.setFieldError("QBCCNO", "QBCC Number already exists.");
      formik.setFieldValue("isQBCCExistance", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("QBCCNO", "");
      formik.setFieldValue("isQBCCExistance", false);
    } // Success: clear error
  );
  const handleSelectChange = (newOption: any) => {
    formik.setFieldValue("UserId", newOption.value);
    setSelectedOption(newOption);
  };

  const handleRemoveConfirmed = async () => {
    setFiles([]);
    setOpenModal(false);
    const payload = {
      attachmentType: "Company_logo",
      companyId: editData?.company_id,
    };
    let response = await DeleteFile(payload);
    if (response) {
      setEditBase64url("");
    }
  };
  const handleBusinessNameChange = useCallback((e: any) => {
    let businessName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("BusinessName", businessName);
  }, []);
  const handleCompanyNameChange = useCallback((e: any) => {
    let companyName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("CompanyName", companyName);
  }, []);
  const handleEmailfieldChange = (e: any) => {
    let email = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Email", email);
  };
  const handleQBCCNOChange = useCallback((e: any) => {
    let QBno = e?.target?.value.trim();
    if (NUMBER_REGEX.test(QBno) || QBno === "") {
      formik.setFieldValue("QBCCNO", QBno);
    }
  }, []);
  const handleACNChange = useCallback((e: any) => {
    let acn = e?.target?.value.trim();
    if (NUMBER_REGEX.test(acn) || acn === "") {
      formik.setFieldValue("ACN", acn);
    }
  }, []);
  const handleABNChange = useCallback((e: any) => {
    let abn = e?.target?.value.trim();
    if (NUMBER_REGEX.test(abn) || abn === "") {
      formik.setFieldValue("ABN", abn);
    }
  }, []);
  const handleTFNChange = useCallback((e: any) => {
    let tfn = e?.target?.value.trim();
    if (NUMBER_REGEX.test(tfn) || tfn === "") {
      formik.setFieldValue("TFN", tfn);
    }
  }, []);
  const getAdminUsersList = async (inputValue: any) => {
    if (inputValue.length > 2) {
      const responseData = await AdminlistAllUsers({
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

  // Debounce function with default options (configurable)
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
            href: ApplicationURLS.ADMIN_COMPANY_LIST,
            label: "Business Profiles list",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Business Profile" : "Add Business Profile",
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
            } Business Profile`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.BusinessName}
                isInvalid={
                  formik.touched.BusinessName && formik.errors.BusinessName
                    ? true
                    : false
                }
                labelText="Business Name *"
                name="BusinessName"
                id="BusinessName"
                required
                value={formik.values.BusinessName}
                onChange={handleBusinessNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.CompanyName}
                isInvalid={
                  formik.touched.CompanyName && formik.errors.CompanyName
                    ? true
                    : false
                }
                labelText="Legal Business Name"
                name="CompanyName"
                id="CompanyName"
                required
                value={formik.values.CompanyName}
                onChange={handleCompanyNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={styles.textFieldStyles}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <SearchableSelect
                key={timeKey}
                options={entityOptions}
                selectedData={singleSelectedData}
                onChange={(option) => {
                  setSingleSelectedData(option);
                  formik.handleChange("EntityType")(option.value);
                }}
                placeholder=""
                controlStyles={customStyles}
                label="Entity Type *"
                isRequired={
                  !formik.values.EntityType && formik.touched.EntityType
                    ? true
                    : false
                }
                errorMessage={formik.errors.EntityType}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                inputMode="numeric"
                maxLength={8}
                errorText={formik.errors.QBCCNO}
                labelText="QBCC No"
                isInvalid={
                  formik.touched.QBCCNO && formik.errors.QBCCNO ? true : false
                }
                name="QBCCNO"
                id="QBCCNO"
                required
                value={formik.values.QBCCNO}
                onChange={handleQBCCNOChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
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
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                errorText={formik.errors.Email}
                isInvalid={
                  formik.touched.Email && formik.errors.Email ? true : false
                }
                labelText="Email *"
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
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <div className={styles.googlFiledStyles}>
                <label className={styles.labelStyle}>
                  Registered Address *
                </label>
                <GooglePlacesInput
                  key={timeKey}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    formik.touched.Address && formik.errors.Address
                      ? true
                      : false
                  }
                  value={formik.values.Address}
                  onChange={handlePlacesInputChange}
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
              <SearchableSelect
                key={timeKey}
                options={options}
                selectedData={blockedOptions}
                onChange={(option) => {
                  setBlockedOPtions(option);
                  formik.handleChange("AdminBlocked")(option.value);
                }}
                placeholder=""
                controlStyles={customStyles}
                label="Admin Blocked *"
                isRequired={
                  !formik.values.AdminBlocked && formik.touched.AdminBlocked
                    ? true
                    : false
                }
                errorMessage={formik.errors.AdminBlocked}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              {isEdit ? (
                <TextField
                  placeholder={" Search the User"}
                  labelText="Business Primary Admin *"
                  type="text"
                  required
                  value={
                    editData?.primary_admin_name || editData?.primary_admin_id
                  }
                />
              ) : (
                <AsyncSearchSelect
                  options={loadOptions}
                  onChange={handleSelectChange}
                  selectedOption={selectedOption}
                  placeholder={" Search the User"}
                  label="Business Primary Admin *"
                  controlStyles={customStyles}
                  isRequired={
                    !formik.values.UserId && formik.touched.UserId
                      ? true
                      : false
                  }
                  errorMessage={formik.errors.UserId}
                />
              )}
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                inputMode="numeric"
                maxLength={9}
                errorText={formik.errors.TFN}
                isInvalid={
                  formik.touched.TFN && formik.errors.TFN ? true : false
                }
                labelText="TFN (if applicable)"
                name="TFN"
                id="TFN"
                required
                value={formik.values.TFN}
                onChange={handleTFNChange}
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
                inputMode="numeric"
                maxLength={9}
                errorText={formik.errors.ACN}
                isInvalid={
                  formik.touched.ACN && formik.errors.ACN ? true : false
                }
                labelText="ACN (if applicable)"
                name="ACN"
                id="ACN"
                value={formik.values.ACN}
                onChange={handleACNChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            {/* addwed*/}
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                inputMode="numeric"
                maxLength={11}
                errorText={formik.errors.ABN}
                isInvalid={
                  formik.touched.ABN && formik.errors.ABN ? true : false
                }
                labelText="ABN (if applicable)"
                name="ABN"
                id="ABN"
                required
                value={formik.values.ABN}
                onChange={handleABNChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>

          <Col lg={6}>
            <span>Company Logo</span>
          </Col>
          <Col lg={6}>
            {!editBase64url && files.length === 0 && (
              <div className={styles.selectContainerBtn}>
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
                      setFiles(newFileArray);
                    }
                  }}
                  acceptedFileFormats={imageTypeFormats}
                  multiple={false}
                  maximumSize={2 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${2} Mb`);
                  }}
                >
                  <div className={styles.selectContainer}>add Logo</div>
                </FileSelector>
              </div>
            )}
            {(editBase64url || files.length > 0) && (
              <div
                style={{ display: "inline-block" }}
                className={styles.imageViewStyle}
              >
                {editBase64url ? (
                  <Trash
                    className={styles.fileRemoveIcon}
                    onClick={() => {
                      setOpenModal(true);
                    }}
                  />
                ) : (
                  <XCircle
                    className={styles.fileRemoveIcon}
                    onClick={() => {
                      setFiles([]);
                    }}
                  />
                )}
                <Image
                  width={100}
                  height={100}
                  src={editBase64url || URL.createObjectURL(files[0])}
                  alt={"image"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              </div>
            )}
          </Col>

          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_COMPANY_LIST);
              }}
            >
              Cancel
            </FormButton>
            <FormButton
              type={"submit"}
              className={styles.saveBtnStyle}
              disabled={disabledBtn}
            >
              {isEdit ? "Update" : "Save"}
            </FormButton>
          </div>
        </Form>
      )}
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Remove"
        secondButtonLabel="Cancel"
        modalBodyContent="Are you sure you want to remove the image?"
        onConfirm={handleRemoveConfirmed}
      />
    </div>
  );
};

export default AddCompanyProfileDetails;
