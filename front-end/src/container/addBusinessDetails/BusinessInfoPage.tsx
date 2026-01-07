"use client";

import React, { useEffect, useState } from "react";
import { Row, Col, Form, Container, Table, Button } from "react-bootstrap";
import styles from "./BusinessInfoPage.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  BuildingsFill,
  CaretRightFill,
  ExclamationTriangleFill,
  XCircle,
} from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import { useRouter } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  setBusinessProfile,
  setCompanyDetails,
  setDefaultFiles,
  setEditBusinessDetails,
  setName,
  setRemovedFiles,
} from "@/redux/slices/companyRegistrationDetails";
import {
  checkCompanyExistence,
  insertEmailVerificationDetails,
  requestToJoinCompany,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { isValidPhoneNumber } from "react-phone-number-input";
import ImageUploader from "@/components/fileUpload/fileUpload";
import { setImageName, setImageFile } from "@/redux/slices/imageUploadSlice";
import { toast } from "react-toastify";
import { AppModal } from "@/components/model/model";
import { useSelector } from "react-redux";
import {
  CheckCompanyEmailExistence,
  CheckQbccExistence,
} from "@/app/api/existanceAPIsCheck";
import { fetchSubscriptionType } from "./BusinessInfo.function";
import {
  convertCanvasToFile,
  mapDropdownOptions,
} from "@/common/commonFunctions";
import StripeCard from "@/components/StripeCard/stripeCard";
import NewPaymentMethod from "./subscriptions";
import Subscriptions from "./subscriptions";
import Avatar from "react-avatar";
import ImageCropper from "@/components/ImageCropper/imageCropper";

// ... (imports and other code)

const validationSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  // BusinessName: Yup.string().required("Please provide a business name"),
  TrustTrainingRecord: Yup.string(),

  Qbccno: Yup.string()
    .notRequired()
    .matches(/^[0-9]+$/, "Only numbers are allowed")
    .test(
      "unique",
      "This QBCC is associated with another business",
      async function (value) {
        if (!value?.trim() || value?.trim().length < 7) return true; // Handle empty email

        const QBCCNOExists = await CheckQbccExistence(value);
        if (QBCCNOExists) {
          return this.createError({
            path: this.path,
            message: "This QBCC is associated with another business.",
          });
        }
        return true; // QBCC number is unique
      }
    ),
  EntityType: Yup.object().required("Entity type is required"),
  SubscriptionType: Yup.object().required("Subscription type is required"),
  Address: Yup.string().required("Address is required"),
  PhoneNumber: Yup.string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required")
    .test("unique", "Email Id already exists", async function (value) {
      try {
        if (!value || value.trim().length < 5) return true; // Handle empty email
        // Call the function to check company email existence
        const companyEmailExistenceResponse = await CheckCompanyEmailExistence(
          value
        );
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
      } catch (error) {
        // Handle errors
        console.error("Error checking company email existence:", error);
        // You may want to display an error message to the user
        throw new Error("Error checking company email existence");
      }
    }),

  ACN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  ABN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  TFN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
});

const BusinessInfoPage = () => {
  const [accessTokenId, setAccessTokenId] = useState<string>("");
  const [modalShow, setModalShow] = React.useState(false);
  const [selectedId, setSelectedId] = useState<any>({});
  const [clickedIndex, setClickedIndex] = useState(null);
  const [companyNames, setCompanyNames] = useState<any>([]);
  const [companyMatch, setCompanyMatch] = useState<any>([]);
  const [companyExists, setCompanyExists] = useState<boolean>(false); // Added state to track company existence
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [displayPaymentForm, setdisplayPaymentForm] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState(false);

  useEffect(() => {
    // Get access token from local storage
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setAccessTokenId(accessToken);
    }

    // getSubscriptionPlans();
  }, []);

  const router = useRouter();

  const dispatch = useAppDispatch();

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails
  );

  const placeholderText = "Add your training certificates";

  const options = [
    { value: "Business", label: "Business" },
    { value: "Sole Trader", label: "Sole Trader" },
    { value: "Personal", label: "Personal" },
  ];

  useEffect(() => {
    formik.setFieldValue(
      "SubscriptionType",
      businessProfileObj?.SubscriptionType
        ? businessProfileObj?.SubscriptionType
        : singleSelectedData || null
    );
  }, []);

  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Basic",
    label: "Basic",
  });

  const businessProfileObj: any = useSelector(
    (state: RootState) => state?.companyDetails?.businessProfile
  );

  const addTrustRecord: any = useSelector(
    (state: RootState) => state?.companyDetails?.addTrustRecord
  );

  const setSearch: any = useSelector(
    (state: RootState) => state?.companyDetails?.searchName
  );

  const [imageFile, setImage] = useState<any>(
    businessProfileObj?.imageFile ? businessProfileObj?.imageFile : null
  );

  const [cropImage, setCropImage] = useState<any>([]);

  const formik: any = useFormik({
    initialValues: {
      Name: businessProfileObj?.Name || setSearch || "",
      BusinessName: businessProfileObj?.BusinessName || "",
      EntityType: businessProfileObj?.EntityType || "",
      Address: businessProfileObj?.Address || "",
      PhoneNumber: businessProfileObj?.PhoneNumber || "",
      Email: businessProfileObj?.Email || "",
      Qbccno: businessProfileObj?.Qbccno || "",
      ACN: businessProfileObj?.ACN || "",
      ABN: businessProfileObj?.ABN || "",
      TFN: businessProfileObj?.TFN || "",
      Subscription: businessProfileObj?.Subscription || "",
      SubscriptionType: businessProfileObj?.SubscriptionType || "Basic",
      TrustTrainingRecord:
        addTrustRecord?.length > 0
          ? `${addTrustRecord.length} ${
              addTrustRecord.length > 1 ? "Records" : "Record"
            }`
          : "",
      CookiePreferences: businessProfileObj?.CookiePreferences || "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  const handleCompanyNameClick = (name: any, index: any) => {
    // Handle the click event here, for example, you can navigate to a specific page
    setSelectedId(name);
    setClickedIndex(index);
  };

  const handleCancelClick = () => {
    setModalShow(false);
    // Handle the cancellation, for example, navigate to a specific page
    // router.push("/user/dashboard");
  };

  const handleJoinClick = async () => {
    const currentDate = new Date();
    // const utcDate = currentDate.toISOString();
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      var decodedToken: any = jwtDecode(accessToken);

      // Check if selectedId exists and has a valid id
      if (!selectedId || !selectedId.id) {
        toast.error("Please select a business to join.");
        return; // Exit function early if company_id is not selected
      }

      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id: selectedId?.id,
          is_user_exists: true,
          // created_on: utcDate,
          // created_by: decodedToken["emailId"],
          email_id: decodedToken["emailId"],
          user_first_name: decodedToken["userFirstName"],
          manage_user: "No",
          manage_subscription: "No",
          manage_project_trust_payment: "No",
          manage_company: "No",
          company_role: "STANDARD USER",
        };
        // Call requestToJoinCompany when "Join" is clicked
        let joinResponce = await requestToJoinCompany(data);
        if (joinResponce) {
          // Handle success or show toast notification
          toast.success("Request to join company sent successfully!");
          // Close modal
          setModalShow(false);
          // Redirect or handle next steps
          router.push("/user/dashboard");
        }
      } catch (error) {
        // Handle errors
        toast.error("Error occurred while processing the request");
        console.error("Error joining the company:", error);
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update formik values
    formik.handleChange(event);
    const fieldName = event.target.name;
    // Dispatch action to store the name in Redux
    updateBusinessProfileValues(fieldName, event?.target?.value);
  };

  const updateBusinessProfileValues = (fieldName: any, value: any) => {
    dispatch(
      setBusinessProfile({
        ...businessProfileObj,
        [fieldName]: value,
      })
    );
  };

  // Function to handle change in the Name field
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update formik values
    formik.handleChange(event);
    // Dispatch action to store the name in Redux
    dispatch(setName(event.target.value));
    const fieldName = event.target.name;
    updateBusinessProfileValues(fieldName, event?.target?.value);
  };

  const allowedFileTypes = ["image/jpeg", "image/png"]; // Add more as needed
  const maxFileSize = 2 * 1024 * 1024; // 2 MB

  const handleImageSelect = async (file: File, path: string) => {
    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      // Show toast message for invalid file type
      toast.error(
        "Invalid file type. Please select a valid image file (JPEG/PNG)."
      );
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      // Show toast message for invalid file size
      toast.error(
        "File size exceeds the limit (2MB). Please select a smaller file."
      );
      return;
    }

    // If validations pass, set the image file
    setCropImage([file]);
  };

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here
    const placeDetailsString = JSON.stringify(placeDetails);

    dispatch(setCompanyDetails({ placeDetails }));

    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetailsString);
    updateBusinessProfileValues("Address", placeDetails?.fullAddress);
  };

  const handleSubmit = async (values: any) => {
    // const currentDate = new Date();
    // const utcDate = currentDate.toISOString();
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      var decodedToken: any = jwtDecode(accessToken);
      const details = {
        user_id: decodedToken["userId"],
        mail_type: "Verify_Company",
        email_id: decodedToken["emailId"],
        type: "Send",
        first_name: decodedToken["userFirstName"],
        last_name: decodedToken["userLastName"],
        company_name: values.BusinessName,
        company_email_id: values.Email,
      };

      try {
        // Check company existence
        const companyExistenceData: any = await checkCompanyExistence(
          values.Name,
          true
        );

        const names = companyExistenceData?.map((company: any) => {
          return {
            name: company.company_name,
            id: company.company_id,
            file: company?.file,
            type: company?.entity_type,
            legalName: company?.legal_company_name,
          };
        });

        setCompanyNames(names);
        setCompanyMatch(companyExistenceData);
        if (companyExistenceData?.length === 0) {
          setModalShow(false);
          router.push("/user/registration/business-verification");
        } else {
          setModalShow(true);
          return;
        }

        const doesCompanyExist = companyExistenceData?.length > 0;
        setCompanyExists(doesCompanyExist);

        // Call the function to insert email verification details
        const response = await insertEmailVerificationDetails(details);
        dispatch(
          setCompanyDetails({
            ...companyDetails?.companyDetails,
            ...details,
            values,
          })
        );

        // Handle the response as needed
        if (response) {
          toast.success(
            "Please use OTP received in email to verify your business"
          );
          // You can perform other actions or navigate based on the response
          router.push("/user/registration/business-verification");
        }
      } catch (error) {
        // Handle errors
        console.error("Error in insertEmailVerificationDetails:", error);
      }
    }
  };

  const handleFormCancelClick = () => {
    router.push("/user/add-company"); // Send the user back to the previous page
  };

  async function getSubscriptionPlans() {
    try {
      const response: any[] = await fetchSubscriptionType();

      // Early return if response is empty or an error occurs
      if (!response || !Array.isArray(response) || response.length === 0) {
        setSubscriptionPlans([]);
        return;
      }

      const modifiedSubscriptionOptions = mapDropdownOptions(
        response,
        "plan_name",
        "plan_name"
      );

      setSubscriptionPlans(modifiedSubscriptionOptions);
    } catch (err) {
      console.error("Error fetching subscription plans:", err);
    }
  }
  useEffect(() => {
    dispatch(setEditBusinessDetails({}));
    dispatch(setDefaultFiles(null));
    dispatch(setRemovedFiles(null));
  }, []);

  async function handleFileConversion(selectedCanvas: any) {
    try {
      const convertedCanvasToFile = await convertCanvasToFile(
        selectedCanvas,
        cropImage
      );

      setImage(convertedCanvasToFile);
      dispatch(setImageFile(convertedCanvasToFile));
      updateBusinessProfileValues("imageFile", convertedCanvasToFile);
      setCropImage([]);
    } catch (err: any) {
      console.log(" ~ handleFileConversion ~ err:", err);
    }
  }
  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            {!displayPaymentForm && !editPaymentForm ? (
              <Form
                className={styles.formStyles}
                onSubmit={formik.handleSubmit}
              >
                <BuildingsFill
                  className={styles.AddCompanyIconStyles}
                ></BuildingsFill>
                <h5 className={styles.title}>Business Profile</h5>

                <h5 className={styles.SubHeading}>Business Info</h5>

                <div className={styles.textFieldStyles}>
                  <TextField
                    type="text"
                    labelText="Business Name *"
                    name="Name"
                    id="Name"
                    value={formik.values.Name}
                    onChange={handleNameChange}
                    onBlur={formik.handleBlur}
                    maxLength={150}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Name && formik.errors.Name
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.Name && formik.errors.Name ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.Name}
                    </div>
                  ) : null}
                </div>

                <div className={styles.textFieldStyles}>
                  <TextField
                    type="text"
                    labelText="Legal Business Name (if applicable)"
                    name="BusinessName"
                    id="BusinessName"
                    maxLength={100}
                    value={formik.values.BusinessName}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.BusinessName && formik.errors.BusinessName
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.BusinessName && formik.errors.BusinessName ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.BusinessName}
                    </div>
                  ) : null}
                </div>

                <div className={styles.DropdownStyles}>
                  <SearchableSelect
                    options={options}
                    label="Entity type *"
                    selectedData={formik.values.EntityType}
                    onChange={(option) => {
                      formik.setFieldValue("EntityType", option);
                      updateBusinessProfileValues("EntityType", option);
                    }}
                    errorMessage="Please select an entity type"
                    disabled={false}
                    placeholder=""
                  />
                  {formik.touched.EntityType && formik.errors.EntityType && (
                    <div className={`${styles.errorText} ${styles.icon}`}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.EntityType}
                    </div>
                  )}
                </div>

                <div className={styles.textFieldStyles}>
                  <label className={styles.addresstextFieldStyles}>
                    Address *
                  </label>
                  <div className={styles.instructionText}>Search location</div>

                  <GooglePlacesInput
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                    isInvalid={
                      !!(formik.touched.Address && formik.errors.Address)
                    }
                    value={formik.values.Address}
                    // onChange={formik.handleChange("Address")}
                    onChange={handlePlacesInputChange}
                    onBlur={formik.handleBlur("Address")}
                  />
                  {formik.touched.Address && formik.errors.Address && (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.Address}
                    </div>
                  )}
                </div>

                <div className={styles.textFieldStyles}>
                  <label className={styles.textFieldStyles}>
                    Phone Number *
                  </label>

                  <PhoneInputField
                    id="PhoneNumber"
                    name="PhoneNumber"
                    error={
                      formik.touched.PhoneNumber && formik.errors.PhoneNumber
                        ? true
                        : false
                    }
                    value={formik.values.PhoneNumber}
                    onChange={(e: any) => {
                      formik.setFieldValue("PhoneNumber", e); // Set the value in Formik
                      updateBusinessProfileValues("PhoneNumber", e);
                    }}
                    onBlur={formik.handleBlur("PhoneNumber")}
                    // onPhoneNumberValidChange={handlePhoneValidityChange}
                    showErrorIcon={Boolean(
                      formik.touched.PhoneNumber && formik.errors.PhoneNumber
                    )}
                  />
                  {formik.touched.PhoneNumber && formik.errors.PhoneNumber && (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.PhoneNumber}
                    </div>
                  )}
                </div>

                <div className={styles.textFieldStyles}>
                  <TextField
                    type="text"
                    labelText="Email Address *"
                    name="Email"
                    id="Email"
                    value={formik.values.Email}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Email && formik.errors.Email
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.Email && formik.errors.Email ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.Email}
                    </div>
                  ) : null}
                </div>

                <div className={styles.textFieldStyles}>
                  <TextField
                    placeholder=""
                    type="text"
                    inputMode="numeric"
                    labelText="ACN (if applicable)"
                    name="ACN"
                    id="ACN"
                    maxLength={9}
                    value={formik.values.ACN}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.ACN && formik.errors.ACN
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.ACN && formik.errors.ACN ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.ACN}
                    </div>
                  ) : null}
                </div>
                <div className={styles.textFieldStyles}>
                  <TextField
                    placeholder=""
                    type="text"
                    inputMode="numeric"
                    labelText="ABN (if applicable)"
                    name="ABN"
                    id="ABN"
                    maxLength={11}
                    value={formik.values.ABN}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.ABN && formik.errors.ABN
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.ABN && formik.errors.ABN ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.ABN}
                    </div>
                  ) : null}
                </div>
                <div className={styles.textFieldStyles}>
                  <TextField
                    placeholder=""
                    type="text"
                    inputMode="numeric"
                    labelText="TFN (if applicable)"
                    name="TFN"
                    id="TFN"
                    maxLength={9}
                    value={formik.values.TFN}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.TFN && formik.errors.TFN
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.TFN && formik.errors.TFN ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.TFN}
                    </div>
                  ) : null}
                </div>

                <div className={styles.textFieldStyles}>
                  <TextField
                    placeholder=""
                    type="text"
                    inputMode="numeric"
                    labelText="QBCC No"
                    name="Qbccno"
                    id="Qbccno"
                    maxLength={8}
                    value={formik.values.Qbccno}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Qbccno && formik.errors.Qbccno
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.Qbccno && formik.errors.Qbccno ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.Qbccno}
                    </div>
                  ) : null}
                </div>
                {/* <div className={styles.textFieldStyles}>
                  <SearchableSelect
                    options={subscriptionPlans}
                    label="Subscription type"
                    selectedData={formik.values.SubscriptionType}
                    onChange={(option) => {
                      setSingleSelectedData(option);
                      formik.setFieldValue("SubscriptionType", option); // Set the value in Formik
                      updateBusinessProfileValues("SubscriptionType", option);
                    }}
                    errorMessage="Please select an Subscription type"
                    disabled={false}
                    placeholder=""
                  />
                  {formik.touched.SubscriptionType &&
                  formik.errors.SubscriptionType ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.SubscriptionType}
                    </div>
                  ) : null}
                </div> */}

                <div className={styles.textFieldStyles}>
                  <TextField
                    type="text"
                    // disabled
                    labelText="Trust Training Record"
                    onBodyClick={() =>
                      router.push(
                        addTrustRecord?.length > 0
                          ? "/user/add-business/trust-and-training-records"
                          : "/user/add-business/add"
                      )
                    }
                    placeholder={placeholderText}
                    name="TrustTrainingRecord"
                    id="TrustTrainingRecord"
                    value={formik.values.TrustTrainingRecord}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={`${styles.disabledTextField} ${
                      formik.touched.TrustTrainingRecord &&
                      formik.errors.TrustTrainingRecord
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }`}
                    endingData={
                      <div>
                        <CaretRightFill className={styles.editIcon} />
                      </div>
                    }
                  />
                  {formik.touched.TrustTrainingRecord &&
                  formik.errors.TrustTrainingRecord ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.TrustTrainingRecord}
                    </div>
                  ) : null}
                </div>

                {/* <div className={styles.textFieldStyles}>
                  <TextField
                    type="text"
                    labelText="Cookie Preferences"
                    name="CookiePreferences"
                    id="CookiePreferences"
                    value={formik.values.CookiePreferences}
                    onChange={handleChange}
                    onBlur={formik.handleBlur}
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.CookiePreferences &&
                      formik.errors.CookiePreferences
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.CookiePreferences &&
                  formik.errors.CookiePreferences ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.CookiePreferences}
                    </div>
                  ) : null}
                </div> */}

                <p className={styles.InfoTextStyle}>
                  Click or drag a file to this area to upload
                </p>
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  accept="image/jpeg, image/png"
                  inputLabelStyles={styles.CustomInputStyles}
                  imagePlaceholder="Add Logo"
                  imageStyles={{
                    borderRadius: "10px",
                    objectFit: "fill",
                    display: imageFile ? "block" : "none", // Only display the image if imageFile is set
                  }}
                  image={imageFile}
                />

                <FormButton className={styles.buttonStyles} type="submit">
                  Save
                </FormButton>
                <Button
                  className={styles.SkipButtonStyles}
                  type="button"
                  onClick={handleFormCancelClick}
                >
                  Cancel
                </Button>
                <AppModal
                  show={modalShow}
                  onHide={handleCancelClick}
                  secondButtonLabel="Cancel"
                  firstButtonLabel="Join"
                  modalHeading="Business Match"
                  modalBodyTitle=""
                  onConfirm={handleJoinClick}
                  modalBodyContent={
                    <ul className={styles.matchedCompanyList}>
                      {companyNames.map((name: any, index: any) => (
                        <li
                          key={index}
                          onClick={() => handleCompanyNameClick(name, index)}
                          className={`${styles.matchedCompany} ${
                            clickedIndex === index ? styles.clicked : ""
                          }`} // Apply 'clicked' class if clickedIndex matches the current index
                        >
                          <div className={styles.companyItem}>
                            <div className={styles.companyDetails}>
                              <span className={styles.companyName}>
                                {name?.name}
                              </span>
                              •
                              <span
                                className={`${styles.companyName} ${styles.companyType}`}
                              >
                                {name?.type}
                              </span>
                              •
                              <span
                                className={`${styles.companyName} ${styles.companyType}`}
                              >
                                {name?.legalName}
                              </span>
                            </div>
                            <div>
                              <Avatar
                                className={styles.addCompanyFileStyles}
                                size={"36"}
                                round="18px"
                                // facebook-id="invalidfacebookusername"
                                // name={popoverProfile?.name}
                                src={name?.file}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  }
                />
              </Form>
            ) : (
              <div className={styles.paymentForm}>
                {!displayPaymentForm ? <StripeCard /> : <Subscriptions />}
              </div>
            )}
          </Col>
        </Row>
        {cropImage?.length > 0 ? (
          <ImageCropper
            selectedImage={cropImage}
            displayCropper={cropImage?.length > 0}
            handleCroppedImage={(selectedCanvas: any) =>
              handleFileConversion(selectedCanvas)
            }
            removeSelectedImage={() => setCropImage([])}
          />
        ) : (
          ""
        )}
      </Container>
    </div>
  );
};

export default BusinessInfoPage;
