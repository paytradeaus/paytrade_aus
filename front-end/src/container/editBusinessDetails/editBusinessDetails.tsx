"use client";

import React, { Fragment, useEffect, useState } from "react";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import styles from "./editBusinessDetails.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  BuildingsFill,
  CaretRightFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import { usePathname, useRouter } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  setAddTrustRecord,
  setBusinessProfile,
  setCompanyDetails,
  setDefaultFiles,
  setEditBusinessDetails,
  setName,
  setRemovedFiles,
} from "@/redux/slices/companyRegistrationDetails";
import {
  checkCompanyExistence,
  getCompanyProfilesWithLogos,
  insertEmailVerificationDetails,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { isValidPhoneNumber } from "react-phone-number-input";
import ImageUploader from "@/components/fileUpload/fileUpload";
import { setImageFile } from "@/redux/slices/imageUploadSlice";
import { toast } from "react-toastify";

import { useSelector } from "react-redux";
import {
  CheckCompanyEmailExistence,
  CheckQbccExistence,
} from "@/app/api/existanceAPIsCheck";
import {
  DeleteTrustTrainingRecordById,
  fetchBusinessDetails,
  fetchTrustTrackingById,
  updateBusinessDetails,
} from "./editBusinessDetails.function";
import { convertCanvasToFile, formatDate } from "@/common/commonFunctions";
import { useTokenDetails } from "@/common/commonHooks";
import { multipleFileUploadApi, singleUploadApi } from "@/app/api/commonAPIs";
import { FileUploadResponseData } from "../adminModules/sendEmailTemplate/sendEmailTemplate.types";
import PulseLoader from "react-spinners/PulseLoader";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";
import TrustRecordFilePage from "../trustRecordFile/trustRecordFilePage";
import TrustAndTraining from "../trustandtraining/trustAndTraining";
import ImageCropper from "@/components/ImageCropper/imageCropper";
import { getCookie } from "cookies-next";
import Image from "next/image";
import SignatureUploader from "@/components/SignatureUploader";
import { useLoaderContext } from "@/context/useLoader";

// ... (imports and other code)

const validationSchema = Yup.object().shape({
  Name: Yup.string().required("Name is required"),
  TrustTrainingRecord: Yup.string().required("TrustTrainingRecord is required"),

  Qbccno: Yup.string()
    .notRequired()
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
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
    .required("Email is required"),
  ACN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  ABN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  TFN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
});

type VIEW_PAGE_TYPES = "mainPage" | "addPage" | "viewPage";

const EditBusinessDetails = (props: any) => {
  const { isEdit } = props;
  const { setLoader }: any = useLoaderContext();

  const router = useRouter();
  const pathname = usePathname();

  // Extracting the ID from the pathname
  const editCompanyId: any = pathname.split("/").pop();
  const isValidId = /^\d+$/.test(editCompanyId);
  const dispatch = useAppDispatch();
  const [viewPages, setViewPages] = useState<VIEW_PAGE_TYPES>("mainPage");
  const savedCompanyId = Number(getCookie("companyId")) || 0;

  const [modalShow, setModalShow] = React.useState(false);
  const [btndisable, setBtnDisable] = useState<boolean>(false);

  const [companyNames, setCompanyNames] = useState<any>([]);
  const [companyMatch, setCompanyMatch] = useState<any>([]);
  const [companyExists, setCompanyExists] = useState<boolean>(false); // Added state to track company existence
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);

  const [businessData, setBusinessData] = useState<any>();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const [cropImage, setCropImage] = useState<any>([]);
  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");

  const [signatureType, setSignatureType] = useState("");

  useEffect(() => {
    // Get access token from local storage
    setIsLoading(true);
    setBusinessData(null);
  }, []);

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
    formik.setFieldValue("SubscriptionType", singleSelectedData || null); // Update value if singleSelectedData or defaultValue changes
  }, []);

  const [singleSelectedData, setSingleSelectedData] = useState<any>({
    value: "Basic",
    label: "Basic",
  });

  const businessProfileObj: any = useSelector(
    (state: RootState) => state?.companyDetails?.businessProfile
  );

  const selectedcompanyid = useSelector(
    (state: RootState) => state.companyStore.companyid
  );

  const addTrustRecord: any = useSelector(
    (state: RootState) => state?.companyDetails?.addTrustRecord
  );
  const removedFiles: any = useSelector(
    (state: RootState) => state?.companyDetails?.removedFiles
  );
  const editBusinessDetails: any = useSelector(
    (state: RootState) => state?.companyDetails?.editBusinessDetails
  );

  const defaultFiles: any = useSelector(
    (state: RootState) => state?.companyDetails?.defaultFiles
  );

  const setSearch: any = useSelector(
    (state: RootState) => state?.companyDetails?.searchName
  );

  const [imageFile, setImage] = useState<any>();

  useEffect(() => {
    setIsLoading(true);
    (async () => {
      try {
        dispatch(setDefaultFiles(null));
        // const companyId: any =
        //   typeof window !== "undefined"
        //     ? Number(localStorage.getItem("companyId"))
        //     : null;

        // const response = await fetchBusinessDetails(companyId);

        const [response, trackRecord] = await Promise.all([
          fetchBusinessDetails(savedCompanyId),
          fetchTrustTrackingById(savedCompanyId),
        ]);
        setBusinessData(response);
        if (response) {
          setSingleSelectedData({
            label: response?.plan_type,
            value: response?.plan_type,
          });
        }

        const formattedDataArray = trackRecord.map((item: any) => ({
          name: item?.name,
          type: item?.file_type,
          size: item?.file.size,
          file: item?.file,
          file_path: item?.file_path,
          file_id: item?.id,
          date: item?.uploaded_on,
        }));

        if (
          removedFiles?.length < 1 &&
          formattedDataArray.length > 0 &&
          !isDuplicateArray(companyDetails?.addTrustRecord, formattedDataArray)
        ) {
          dispatch(setDefaultFiles(formattedDataArray));
        }

        const businessObject = {
          Name: response?.company_name,
          BusinessName: response?.legal_company_name,
          EntityType: options.filter(
            (a: any) => a.value === response?.entity_type
          )?.[0],
          Address: response?.company_address,
          PhoneNumber: response?.company_phone_no,
          Email: response?.company_email_id,
          Qbccno: response?.qbcc_number,
          ACN: response?.acn_number,
          ABN: response?.abn_number,
          TFN: response?.tfn_number,
          Subscription: response?.subscription_id,
          SubscriptionType: response?.plan_type,
          CookiePreferences: null,
          imageFile: response?.file as string,
          country: response?.latitude,
          latitude: response?.latitude,
          longitude: response?.longitude,
          place_id: response?.place_id,
          planType: response?.plan_type,
          region: response?.region,
          oldEmail: response?.company_email_id,
          companyId: response?.company_id,
        };
        dispatch(setBusinessProfile(businessObject));
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
            company_name: response?.company_name,
            company_email_id: response?.company_email_id,
          };
          dispatch(setEditBusinessDetails(businessObject));
          setIsLoading(false);

          const totalTrustRecordLength =
            addTrustRecord?.length +
            (removedFiles?.length > 0 ? -removedFiles?.length : 0) +
            (trackRecord?.length || 0);

          const totalMessage = `${totalTrustRecordLength} ${
            totalTrustRecordLength > 1 ? "Records" : "Record"
          }`;
          formik.setValues({
            Name:
              businessObject?.Name ||
              businessProfileObj?.Name ||
              setSearch ||
              "",
            BusinessName:
              businessObject?.BusinessName ||
              businessProfileObj?.BusinessName ||
              "",
            EntityType:
              businessObject?.EntityType ||
              businessProfileObj?.EntityType ||
              "",
            Address:
              businessObject?.Address || businessProfileObj?.Address || "",
            PhoneNumber:
              businessObject?.PhoneNumber ||
              businessProfileObj?.PhoneNumber ||
              "",
            Email: businessObject?.Email || businessProfileObj?.Email || "",
            Qbccno: businessObject?.Qbccno || businessProfileObj?.Qbccno || "",
            ACN: businessObject?.ACN || businessProfileObj?.ACN || "",
            ABN: businessObject?.ABN || businessProfileObj?.ABN || "",
            TFN: businessObject?.TFN || businessProfileObj?.TFN || "",
            Subscription: businessObject?.Subscription || "",
            SubscriptionType: singleSelectedData,
            TrustTrainingRecord: totalMessage,
            CookiePreferences: businessProfileObj?.CookiePreferences || "",
          });
        }
      } catch (error: any) {
        console.log({ error });
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const totalTrustRecordLength =
      addTrustRecord?.length + defaultFiles?.length;

    const totalMessage = `${totalTrustRecordLength} ${
      totalTrustRecordLength > 1 ? "Records" : "Record"
    }`;
    formik?.setFieldValue("TrustTrainingRecord", totalMessage);
  }, [removedFiles]);

  useEffect(() => {
    const totalLength = Array.isArray(addTrustRecord)
      ? addTrustRecord?.length
      : 0;

    const defaultary = Array.isArray(defaultFiles) ? defaultFiles?.length : 0;

    const totalTrustRecordLength = totalLength + defaultary;

    const totalMessage = `${totalTrustRecordLength} ${
      totalTrustRecordLength > 1 ? "Records" : "Record"
    }`;
    formik?.setFieldValue("TrustTrainingRecord", totalMessage);
  }, [addTrustRecord]);

  useEffect(() => {
    if (
      subscriptionPlans?.length > 1 &&
      editBusinessDetails?.SubscriptionType
    ) {
      const defaultType = subscriptionPlans?.filter(
        (d: any) => d?.value === editBusinessDetails?.SubscriptionType
      );

      formik?.setFieldValue("SubscriptionType", defaultType[0]);
      formik?.setFieldValue("PhoneNumber", editBusinessDetails?.PhoneNumber);
    }
  }, [subscriptionPlans, editBusinessDetails?.SubscriptionType]);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update formik values
    formik.handleChange(event);
    const fieldName = event.target.name;
    const fieldValue = event?.target.value;

    if (fieldName === "Qbccno" && fieldValue !== businessData.qbcc_number) {
      const QBCCNOExists = await CheckQbccExistence(event?.target?.value);
      if (QBCCNOExists) {
        formik.setFieldError(
          "Qbccno",
          "This QBCC is associated with another business"
        );
      }
    } else if (
      fieldName === "Email" &&
      fieldValue !== businessData.company_email_id
    ) {
      // Call the function to check company email existence
      const companyEmailExistenceResponse = await CheckCompanyEmailExistence(
        fieldValue
      );
      // Check if the email already exists
      if (companyEmailExistenceResponse === "Business email already exists") {
        formik.setFieldError("Email", "Business email already exists");
      }
      if (
        companyEmailExistenceResponse ===
        "Personal and Business email cannot be same."
      ) {
        formik.setFieldError(
          "Email",
          "Personal and Business email cannot be same"
        );
      }
    }
    // Dispatch action to store the name in Redux
    updateBusinessProfileValues(fieldName, event?.target?.value);
  };

  const updateBusinessProfileValues = (fieldName: any, value: any) => {
    if (isEdit) {
      dispatch(
        setEditBusinessDetails({ ...editBusinessDetails, [fieldName]: value })
      );
    }

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

    if (isEdit) {
      Object.entries(placeDetails).forEach(([key, value]) => {
        if (editBusinessDetails.hasOwnProperty(key)) {
          dispatch(
            setEditBusinessDetails({
              ...editBusinessDetails,
              [key]: value,
            })
          );
        }
      });
    }
    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetailsString);
    dispatch(
      setEditBusinessDetails({
        ...editBusinessDetails,
        ...{
          Address: placeDetails?.fullAddress,
          region: placeDetails?.region,
          place_id: placeDetails?.place_id,
          latitude: placeDetails?.latitude,
          longitude: placeDetails?.longitude,
          country: placeDetails?.country,
        },
      })
    );
  };
  const formik: any = useFormik({
    initialValues: {
      Name:
        editBusinessDetails?.Name ||
        businessProfileObj?.Name ||
        setSearch ||
        "",
      BusinessName:
        editBusinessDetails?.BusinessName ||
        businessProfileObj?.BusinessName ||
        "",
      EntityType:
        editBusinessDetails?.EntityType || businessProfileObj?.EntityType || "",
      Address:
        editBusinessDetails?.Address || businessProfileObj?.Address || "",
      PhoneNumber:
        editBusinessDetails?.PhoneNumber ||
        businessProfileObj?.PhoneNumber ||
        "",
      Email: editBusinessDetails?.Email || businessProfileObj?.Email || "",
      Qbccno: editBusinessDetails?.Qbccno || businessProfileObj?.Qbccno || "",
      ACN: editBusinessDetails?.ACN || businessProfileObj?.ACN || "",
      ABN: editBusinessDetails?.ABN || businessProfileObj?.ABN || "",
      TFN: editBusinessDetails?.TFN || businessProfileObj?.TFN || "",
      Subscription: businessProfileObj?.Subscription || "",
      SubscriptionType:
        editBusinessDetails?.plan_type ||
        businessProfileObj?.SubscriptionType ||
        "Basic",
      TrustTrainingRecord: "",
      CookiePreferences: businessProfileObj?.CookiePreferences || "",
    },
    validationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  const handleSubmit = async (values: any) => {
    try {
      setLoader(true);
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        let decodedToken: any = jwtDecode(accessToken);
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

        // Check company existence
        if (
          values.Name !== businessData?.company_name ||
          values.Email !== businessData?.company_email_id
        ) {
          const companyExistenceData: any = await checkCompanyExistence(
            values.Name,
            true
          );

          const names = companyExistenceData?.map((company: any) => {
            return { name: company.company_name, id: company.company_id };
          });
          setCompanyNames(names);
          setCompanyMatch(companyExistenceData);

          if (!isEdit) {
            if (companyExistenceData?.length === 0) {
              setModalShow(false);
              router.push("/user/registration/business-verification");
            } else {
              setModalShow(true);
              return;
            }
            setLoader(false);
          }

          const doesCompanyExist = companyExistenceData?.length > 0;
          setCompanyExists(doesCompanyExist);

          // Call the function to insert email verification details
          if (values.Email !== businessData?.company_email_id) {
            const EditDetails = {
              user_id: decodedToken["userId"],
              mail_type: "Verify_Company",
              email_id: decodedToken["emailId"],
              type: "Send",
              first_name: decodedToken["userFirstName"],
              last_name: decodedToken["userLastName"],
              company_name: values.BusinessName,
              company_email_id: values.Email,
              old_company_email_id: businessData?.company_email_id,
            };

            const response = await insertEmailVerificationDetails(
              isEdit ? EditDetails : details
            );
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
            // }
          } else if (isEdit) {
            handleUpdateBusinessDetails(values);
          }
          setLoader(false);
        } else if (!companyExists) {
          // If the company doesn't exist, call handleUpdateBusinessDetails
          handleUpdateBusinessDetails(values);
        }
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  };

  const handleFormCancelClick = () => {
    if (isValidId) {
      router.push("/user/dashboard");
    }
  };

  function isDuplicateArray(arr1: any, arr2: any) {
    return arr1.some((item: any) =>
      arr2.some(
        (item2: any) =>
          item.name === item2.name &&
          item.type === item2.type &&
          item.size === item2.size &&
          item.file === item2.file &&
          item.file_path === item2.file_path &&
          item.file_id === item2.file_id
      )
    );
  }

  const handleUpdateBusinessDetails = async (values: any) => {
    try {
      setBtnDisable(true);
      const UpdatedDetails = {
        region: editBusinessDetails?.region,
        qbcc_number: editBusinessDetails?.Qbccno,
        place_id: editBusinessDetails?.place_id,
        longitude: String(editBusinessDetails?.longitude),
        latitude: String(editBusinessDetails?.latitude),
        entity_type: editBusinessDetails?.EntityType?.value,
        country: editBusinessDetails?.country,
        company_phone_no: editBusinessDetails?.PhoneNumber,
        company_name: editBusinessDetails?.Name,
        company_id: businessData?.company_id,
        company_email_id: editBusinessDetails?.Email,
        company_address: editBusinessDetails?.Address,
        abn_number: editBusinessDetails?.ABN,
        tfn_number: editBusinessDetails?.TFN,
        acn_number: editBusinessDetails?.ACN,
        legal_company_name: editBusinessDetails?.BusinessName,
        signature: signature || businessData?.signature,
        signature_type: signatureType || businessData?.signature_type,
        is_signature_updated: !!signature,
      };
      const response: any = await updateBusinessDetails(UpdatedDetails);

      if (imageFile) {
        let userData = {
          company_id: response?.company_id,
          uploaded_by: decodeTokenData?.emailId,
          attachment_type: "Company_logo",
        };
        const fileResponse = await singleUploadApi(
          imageFile,
          userData,
          accessTokenId
        );
      }

      // Upload files if files array is present
      let fileIds: Array<string> = [];
      // var decodedToken: any = jwtDecode(accessToken);

      const files =
        companyDetails?.addTrustRecord?.map((item: any, i: number) => {
          const attachment = item?.files?.[0]?.file || "";
          const formattedDate = item?.date ? formatDate(item?.date) : "";
          return attachment?.[0];
        }) || [];

      if (files.length > 0) {
        let multiUserData: any[] =
          companyDetails?.addTrustRecord?.map((item: any, i: number) => {
            const attachment = item?.files?.[0]?.name || "";
            const formattedDate = item?.date ? item?.date : "";
            return {
              company_id: UpdatedDetails?.company_id,
              name: item.Name || "",
              uploaded_on: formattedDate || "",
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Trust_Training_Records",
            };
          }) || [];
        const fileResponse: FileUploadResponseData[] =
          await multipleFileUploadApi(files, multiUserData, accessTokenId);
        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: FileUploadResponseData) =>
            fileIds.push(each?.id)
          );
        }
      }

      if (removedFiles?.length > 0) {
        // const companyId: any =
        //   typeof window !== "undefined"
        //     ? Number(localStorage.getItem("companyId"))
        //     : null;

        const payload = {
          companyId: savedCompanyId,
          idArray: removedFiles,
        };
        const deleteResponse = await DeleteTrustTrainingRecordById(payload);
      }

      // You can perform other actions or navigate based on the response
      if (response?.company_id) {
        toast.success("This Business has been updated.");
        dispatch(setEditBusinessDetails({}));
        setBusinessData(null);
        dispatch(setCompanyDetails({}));
        dispatch(setAddTrustRecord([]));
        dispatch(setRemovedFiles([]));
        dispatch(setName(""));
        const fetchCompanyProfiles = async () => {
          try {
            const storedCompanyId = await localStorage.getItem("companyId");

            const profiles = await getCompanyProfilesWithLogos();
            const companyId =
              selectedcompanyid !== "" ? selectedcompanyid : storedCompanyId;
            const data = profiles?.filter(
              (v: any, i: number) => String(v?.company_id) === String(companyId)
            );
            if (data?.length > 0) {
              dispatch(setUpdatedCompany(data[0]));
            } else {
              dispatch(setUpdatedCompany({}));
            }
          } catch (error) {
            console.error("Error fetching company profiles:", error);
          }
        };
        fetchCompanyProfiles();
      } else {
        toast.error(response?.message);
      }
      router.push("/user/dashboard");
      setLoader(false);
    } catch (error: any) {
      setLoader(false);
    } finally {
      setBtnDisable(false); // Re-enable the button
    }
  };

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

  switch (viewPages) {
    case "mainPage":
      return (
        <div>
          <Container fluid>
            {isLoading && formik?.values?.Name === "" && (
              <div className={styles.loaderContainer}>
                {/* <CircleLoader size={50} color="blue" /> */}
                <PulseLoader
                  color={"#1c2475"}
                  size={22}
                  aria-label="Loading Spinner"
                />
              </div>
            )}
            {!isLoading && (
              <Row>
                <Col className={styles.signInForm}>
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
                        maxLength={150}
                        onChange={handleNameChange}
                        onBlur={formik.handleBlur}
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
                          formik.touched.BusinessName &&
                          formik.errors.BusinessName
                            ? `${styles.inputFieldControl} ${styles.inputError}`
                            : styles.inputFieldControl
                        }
                      />
                      {formik.touched.BusinessName &&
                      formik.errors.BusinessName ? (
                        <div className={styles.errorText}>
                          <ExclamationTriangleFill className={styles.icon} />
                          {formik.errors.BusinessName}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.DropdownStyles}>
                      <SearchableSelect
                        options={options}
                        key={timeKey}
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
                      {formik.touched.EntityType &&
                        formik.errors.EntityType && (
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
                      <div className={styles.instructionText}>
                        Search location
                      </div>

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
                          formik.touched.PhoneNumber &&
                          formik.errors.PhoneNumber
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
                          formik.touched.PhoneNumber &&
                            formik.errors.PhoneNumber
                        )}
                      />
                      {formik.touched.PhoneNumber &&
                        formik.errors.PhoneNumber && (
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
                        key={timeKey}
                        options={subscriptionPlans}
                        label="Subscription type"
                        selectedData={singleSelectedData}
                        onChange={(option) => {
                          setSingleSelectedData(option);
                          formik.setFieldValue("SubscriptionType", option); // Set the value in Formik
                          // updateBusinessProfileValues(
                          //   "SubscriptionType",
                          //   option
                          // );
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
                          setViewPages(
                            (addTrustRecord?.length || defaultFiles?.length) > 0
                              ? "viewPage"
                              : "addPage"
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
                    {businessData?.signature && (
                      <Fragment>
                        {" "}
                        <p className={styles.InfoTextStyle}>Signature</p>
                        <div
                          className={styles.imageContainer}
                          onClick={() => setDisplaySignature(true)}
                        >
                          <Image
                            width={0}
                            height={0}
                            // src={imageUrl}
                            src={signature || businessData?.signature}
                            alt="Uploaded"
                            style={{
                              objectFit: "contain",
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        </div>{" "}
                      </Fragment>
                    )}
                    <p className={styles.InfoTextStyle}>
                      Click or drag a file to this area to upload
                    </p>
                    <ImageUploader
                      onImageSelect={handleImageSelect}
                      accept="image/jpeg, image/png"
                      inputLabelStyles={styles.CustomInputStyles}
                      imagePlaceholder="Add Logo"
                      initialImageUrl={
                        imageFile ? "" : businessProfileObj?.imageFile
                      }
                      imageStyles={{
                        borderRadius: "10px",
                        objectFit: "fill",
                        display:
                          imageFile || businessProfileObj?.imageFile
                            ? "block"
                            : "none", // Only display the image if imageFile is set
                      }}
                    />

                    <FormButton
                      className={styles.buttonStyles}
                      type="submit"
                      disabled={btndisable}
                    >
                      Update
                    </FormButton>
                    <Button
                      className={styles.SkipButtonStyles}
                      type="button"
                      onClick={handleFormCancelClick}
                    >
                      Cancel
                    </Button>
                  </Form>
                </Col>
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
              </Row>
            )}
          </Container>
          {displaySignature && (
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
                file: signature || businessData?.signature,
                type: signatureType || businessData?.signature_type,
              }}
            />
          )}
        </div>
      );
    case "addPage":
      return (
        <TrustRecordFilePage
          setViewPages={(v: VIEW_PAGE_TYPES) => setViewPages(v)}
          isEdit={true}
        />
      );
    case "viewPage":
      return (
        <TrustAndTraining
          setViewPages={(v: VIEW_PAGE_TYPES) => setViewPages(v)}
          isEdit={true}
        />
      );
  }
};

export default EditBusinessDetails;
