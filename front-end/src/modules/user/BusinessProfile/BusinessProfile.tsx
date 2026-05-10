"use client";
import React, { Fragment, useEffect, useState } from "react";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter, useSearchParams } from "next/navigation";
import FormikControl from "@/components/FormikControl";
import {
  DEBOUNCE_TIMER,
  InputType,
  NUMBER_REGEX,
  UploadImage,
} from "@/shared/constant/general";
import { requestDataDeletion } from "@/modules/user/PersonalInfo/personalInfo.functions";
import Image from "next/image";
import { entityType } from "./BusinessProfile.constant";
import PhoneInputField from "@/components/phoneNumberInput";
import GooglePlacesInput from "@/components/GooglePlaces";
import ImageUploader from "@/components/ImageUploader";
import {
  convertCanvasToFile,
  formatDate,
  getCompanyIdFromStorage,
  getDecryptedToken,
  handleSelectedImage,
} from "@/utils";
import userImage from "../../../../public/images/avatar.png";
import dynamic from "next/dynamic";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";

const ImageCropper = dynamic(() => import("@/components/ImageCropper"), {
  ssr: false,
});
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { useBusinessProfileContext } from "./BusinessProfileContext";
import TrustRecordForms from "./TrustRecordForms";
import TrustRecordGrid from "./TrustRecordGrid";
import { isEqual } from "lodash";
import BaseModal from "@/components/BaseModal";
import UpdateSignature from "./UpdateSignature";
import {
  DeleteFile,
  fetchBusinessDetails,
  fetchTrustTrackingById,
} from "./BusinessProfile.function";
import _ from "lodash";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import {
  setUpdateActiveProfile,
  setUpdatedCompany,
} from "@/redux/slices/companyDetails";
import { useLoaderContext } from "@/context/useLoader";
import { checkCompanyExistence } from "@/network/existanceAPIsCheck";
import { requestToJoinCompany } from "@/network/apolloClient";
import { showSuccessToast } from "@/components/Toaster";
import { jwtDecode } from "jwt-decode";
import { useCustomDebounce } from "@/hooks";

export default function BusinessProfile({ isEditable }: any) {
  const {
    formik,
    displayTrainingRecords,
    setDisplayTrainingRecords,
    trustTrainingGridData,
    setTrustTrainingGridData,
    setDisplayTrainingRecordsGrid,
    displayTrainingRecordsGrid,
    fileInputRef,
    initialPatchedValues,
    setDisplaySignature,
    displaySignature,
    setEditMode,
    setBusinessDetails,
    businessDetails,
    signature,
    setSignature,
    signatureType,
    setSignatureType,
    editMode,
    updatedCompany,
    appUserDetails,
    setInitialPatchedValues,
    activeProfileStatus,
  }: any = useBusinessProfileContext();

  const router = useRouter();

  const companyDetails: any = useAppSelector(
    (state: RootState) => state?.companyDetails
  );

  const [cropImage, setCropImage] = useState<any>();
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>("");
  const [showNoticesInfo, setShowNoticesInfo] = useState(false);
  const [searchedBusiness, setSearchedBusiness] = useState<any>("");
  const [displayModal, setDisplayModal] = useState(false);
  const [showJoinBusinessError, setShowJoinBusinessError] = useState("");
  const [matchedCompanies, setMatchedCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState<any>("");
  const [displayImage, setDisplayImage] = useState<any>([]);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const { setLoader }: any = useLoaderContext();
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchValue, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [clearImageName, setClearImageName] = useState(false);
  const [deletionRequestSending, setDeletionRequestSending] = useState(false);
  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");
  const [initialRender, setInitialRender] = useState(true);

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (companyDetails?.companyDetails?.values) {
      formik?.setValues({
        ...companyDetails?.companyDetails?.values,
        SubscriptionType: "Basic",
        Address:
          companyDetails?.companyDetails?.placeDetails?.fullAddress ||
          companyDetails?.companyDetails?.values?.Address,
      });
    }

    if (companyDetails?.addTrustRecord?.length > 0) {
      setTrustTrainingGridData(companyDetails?.addTrustRecord);
    }

    if (isEditable) {
      invokeEditBusinessDetails();
    }

    setEditMode(isEditable);
  }, []);

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        handleBusinessSearch(searchValue);
      }
    }
    if (!initialRender) {
      afterDebounce();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  async function invokeEditBusinessDetails() {
    try {
      setLoader(true);
      const companyId = getCompanyIdFromStorage();

      let dynamicApi: any = [];

      const isEditBusinessDataExist = !_.isEmpty(
        companyDetails?.companyDetails?.values
      );

      if (
        !isEditBusinessDataExist &&
        companyDetails?.addTrustRecord?.length === 0
      ) {
        dynamicApi = [
          fetchBusinessDetails(+companyId),
          fetchTrustTrackingById(+companyId),
        ];
      } else if (!isEditBusinessDataExist) {
        dynamicApi = [fetchBusinessDetails(+companyId)];
      } else if (companyDetails?.addTrustRecord?.length === 0) {
        dynamicApi = [fetchTrustTrackingById(+companyId)];
      }
      if (dynamicApi?.length === 0) {
        setLoader(false);
        return;
      }

      const [businessDetailsResponse, trustTrainingRecords]: any =
        await Promise.all(dynamicApi);

      setBusinessDetails(businessDetailsResponse);

      if (trustTrainingRecords?.length > 0) {
        setTrustTrainingGridData(
          trustTrainingRecords.map((x: any) => {
            return {
              trainingRecordDate: formatDate(x?.uploaded_on),
              trainingRecordFile: x?.file,
              trainingRecordName: x?.name,
              id: x?.id,
            };
          })
        );
      }

      let patchBusinessObject = {};
      if (businessDetailsResponse?.company_name) {
        patchBusinessObject = {
          Name: businessDetailsResponse?.company_name,
          BusinessName: businessDetailsResponse?.legal_company_name,
          EntityType: businessDetailsResponse?.entity_type,
          Address: businessDetailsResponse?.company_address,
          PhoneNumber: businessDetailsResponse?.company_phone_no,
          Email: businessDetailsResponse?.company_email_id,
          existingEmail: businessDetailsResponse?.company_email_id,
          existingQbcc: businessDetailsResponse?.qbcc_number,
          Qbccno: businessDetailsResponse?.qbcc_number,
          ACN: businessDetailsResponse?.acn_number,
          ABN: businessDetailsResponse?.abn_number,
          TFN: businessDetailsResponse?.tfn_number,
          // Phase 2 — company GST registration flag (nullable: null = unknown).
          is_gst_registered:
            businessDetailsResponse?.is_gst_registered ?? null,
          // Task #97 — per-company notices auto-send opt-out (default true).
          notices_auto_send:
            businessDetailsResponse?.notices_auto_send !== false,
          Subscription: businessDetailsResponse?.subscription_id,
          SubscriptionType: businessDetailsResponse?.plan_type,
          CookiePreferences: null,
          image: businessDetailsResponse?.file,
          imageFile: "",
          country: businessDetailsResponse?.country,
          latitude: businessDetailsResponse?.latitude,
          longitude: businessDetailsResponse?.longitude,
          place_id: businessDetailsResponse?.place_id,
          planType: businessDetailsResponse?.plan_type,
          region: businessDetailsResponse?.region,
          oldEmail: businessDetailsResponse?.company_email_id,
          companyId: businessDetailsResponse?.company_id,
          editMode: isEditable,
          compliance: businessDetailsResponse?.email_preferences?.compliance,
          notices: true,
        };
      }

      if (businessDetailsResponse?.country) {
        dispatch(
          setCompanyDetails({
            placeDetails: {
              country: businessDetailsResponse?.country,
              Address: businessDetailsResponse?.company_address,
              latitude: businessDetailsResponse?.latitude,
              longitude: businessDetailsResponse?.longitude,
              place_id: businessDetailsResponse?.place_id,
              region: businessDetailsResponse?.region,
            },
          })
        );
      }

      if (!isEditBusinessDataExist) {
        const formValues = {
          ...patchBusinessObject,
          editMode: isEditable,
        };
        formik.setValues(formValues);

        setInitialPatchedValues(formValues);
      } else {
        formik?.setFieldValue("editMode", isEditable);
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
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

  const handleImageCrop = async (uploadedFile: File) => {
    const convertedCanvasToFile: any = await convertCanvasToFile(
      uploadedFile,
      cropImage
    );

    // Generate preview URL from the cropped file
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppedPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(convertedCanvasToFile);

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

  function handlePlacesInputChange(value: string, placeDetails: any) {
    // Handle the input change and place details here

    dispatch(setCompanyDetails({ placeDetails }));

    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", value);
  }

  function onClickOfAddTrustRecords() {
    if (trustTrainingGridData?.length > 0) {
      setDisplayTrainingRecordsGrid(true);
    } else {
      formik?.setFieldValue("isTrainingFieldsRequired", true);
      setDisplayTrainingRecords(true);
    }
  }

  function handleNumberFieldChange(e: any, fieldName: string) {
    let value = e?.target?.value.trim();

    if (NUMBER_REGEX.test(value) || value === "") {
      formik.setFieldValue(fieldName, value);
    }
  }

  function handleCancel() {
    if (
      isEqual(initialPatchedValues, formik?.values) &&
      trustTrainingGridData?.length === 0
    ) {
      onClose();
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  function onClose() {
    router.push(
      isEditable
        ? AppRoutes.USER_DASHBOARD
        : AppRoutes.USER_MATCH_BUSINESS_PROFILE
    );
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

  async function handleDeleteLogo() {
    if (editMode && formik?.values?.image) {
      try {
        const postData = {
          attachmentType: "Company_logo",
          companyId: businessDetails?.company_id,
        };

        const response = await DeleteFile(postData);

        if (response) {
          const tokenData = getDecryptedToken();
          dispatch(
            setAppUserDetails({
              ...tokenData,
              image: !updatedCompany?.company_id ? "" : appUserDetails?.image,
            })
          );
          dispatch(setUpdatedCompany({ ...updatedCompany }));
          dispatch(setUpdateActiveProfile(!activeProfileStatus));
        }
      } catch {}
    }
  }

  async function handleBusinessSearch(searchedValue: string) {
    setSearchValue(searchedValue);
    if (searchedValue.length) {
      try {
        setLoader(true);
        setSearchedBusiness(searchedValue);
        const companiesData = await checkCompanyExistence(searchedValue);
        if (companiesData?.length > 0) {
          const modifiedData = companiesData.map((x: any) => {
            return {
              ...x,
              label: `${x?.company_name} •${" "} ${x?.entity_type} ${
                x?.legal_company_name && "• " + x?.legal_company_name
              }`,
            };
          });

          setMatchedCompanies(modifiedData);
        } else {
          setMatchedCompanies([]);
          setSelectedCompany("");
        }
        setLoader(false);
      } catch {
        setLoader(false);
      }
    } else {
      setMatchedCompanies([]);
      setSelectedCompany("");
    }
  }

  function handleBusinessNameChange(e: any) {
    formik?.handleChange(e);
    setSearchValue(e?.target?.value);
  }

  async function joinBusiness() {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      const decodedToken: any = jwtDecode(accessToken);

      // Check if selectedId exists and has a valid id
      if (!selectedCompany?.company_id) {
        setShowJoinBusinessError("Please select a business to join.");
        return; // Exit function early if company_id is not selected
      } else {
        setShowJoinBusinessError("");
      }
      // setLoader(true);
      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id: selectedCompany?.company_id,
          is_user_exists: true,
          email_id: decodedToken["emailId"],
          user_first_name: decodedToken["userFirstName"],
          manage_user: "No",
          manage_subscription: "No",
          manage_project_trust_payment: "No",
          manage_company: "No",
          company_role: "STANDARD USER",
        };
        // Call requestToJoinCompany when "Join" is clicked
        let apiResponse = await requestToJoinCompany(data);
        if (apiResponse) {
          // Handle success or show toast notification
          showSuccessToast(`Join request sent successfully (${apiResponse}/3)`);
          // Close modal

          // Redirect or handle next steps
          dispatch(setUpdatedCompany({ ...updatedCompany }));
          router.push(AppRoutes.USER_DASHBOARD);
          setDisplayModal(false);
        }
        // setLoader(false);
      } catch {
        // Handle errors
        setShowJoinBusinessError("Error occurred while processing the request");
        // setLoader(false);
      }
    }
  }

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="grid">
              <div className="pt_login">
                <h4>Business profile information</h4>
                <p>{`${
                  isEditable ? "Update" : "Add"
                } your business profile information`}</p>
                <br />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Business name"}
                  name={"Name"}
                  error={formik.errors?.Name}
                  showError={formik.touched.Name && formik.errors.Name}
                  required
                  disabled={businessDetails?.has_bank_account}
                  onChange={(e: any) => handleBusinessNameChange(e)}
                  onBlur={formik.handleBlur("Name")}
                  value={formik.values?.Name}
                />

                <div className="pt_profilescroll" id="searchprofiles">
                  {matchedCompanies?.map((val: any) => (
                    <div
                      className="pt_profilename"
                      key={val?.id}
                      onClick={() => {
                        setSelectedCompany(val);
                        setDisplayModal(true);
                      }}
                      style={{ lineHeight: "unset" }}
                    >
                      <Image
                        src={val?.file_path || userImage}
                        alt={val?.file_name || "user-icon"}
                        width={300}
                        height={300}
                        className="avatar useravatar"
                      />
                      <div className="searchOption">
                        <span className="pt_user">{val.company_name}</span>
                        <span className="pt_email">
                          {val.entity_type}{" "}
                          {val?.legal_company_name &&
                            "• " + val?.legal_company_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Legal business name (If applicable)"}
                  name={"BusinessName"}
                  error={formik.errors.BusinessName}
                  showError={
                    formik.touched.BusinessName && formik.errors.BusinessName
                  }
                  onChange={formik?.handleChange}
                  onBlur={formik.handleBlur("BusinessName")}
                  value={formik.values.BusinessName}
                />

                <FormikControl
                  control={InputType.RADIO_BUTTON}
                  label={"Select an entity type"}
                  required
                  options={entityType}
                  name={"EntityType"}
                  showError={
                    formik.touched.EntityType && formik.errors.EntityType
                  }
                  error={formik.errors.EntityType}
                  disableAutoComplete={true}
                  onChange={(e: any) =>
                    formik?.setFieldValue("EntityType", e?.target?.value)
                  }
                  onBlur={formik.handleBlur("EntityType")}
                  selectedValue={formik.values.EntityType}
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
                        formik.touched.PhoneNumber && formik.errors.PhoneNumber
                      )
                    }
                    value={formik?.values?.PhoneNumber || ""}
                    onChange={formik.handleChange("PhoneNumber")}
                    onBlur={formik.handleBlur("PhoneNumber")}
                    showErrorIcon={Boolean(
                      formik.touched.PhoneNumber && formik.errors.PhoneNumber
                    )}
                  />
                  {formik.touched.PhoneNumber && formik.errors.PhoneNumber && (
                    <div className="mb_1">
                      <small className={"invalid"}>
                        <i className="fa-light fa-circle-x" />
                        {formik.errors.PhoneNumber}
                      </small>
                    </div>
                  )}
                </div>

                <div className="address-field">
                  <label htmlFor="address">
                    <small>
                      Address<span className="required">*</span>
                    </small>
                  </label>
                  <div className={`google-places-field`}>
                    <GooglePlacesInput
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
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
                  control={InputType.TEXT_FIELD}
                  label={"Email address"}
                  required
                  name={"Email"}
                  error={formik.errors.Email}
                  showError={formik.touched.Email && formik.errors.Email}
                  onChange={formik?.handleChange}
                  onBlur={formik.handleBlur("Email")}
                  value={formik.values.Email}
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
                  label={"QBCC No"}
                  type={"text"}
                  name={"Qbccno"}
                  maxLength={8}
                  error={formik.errors.Qbccno}
                  showError={formik.touched.Qbccno && formik.errors.Qbccno}
                  onChange={(e: any) => handleNumberFieldChange(e, "Qbccno")}
                  onBlur={formik.handleBlur("Qbccno")}
                  value={formik.values.Qbccno}
                />

                <label>
                  <small>Trust training record</small>
                </label>

                <button
                  className="secondary"
                  onClick={() => onClickOfAddTrustRecords()}
                >
                  {trustTrainingGridData?.length === 0 &&
                  companyDetails?.addTrustRecord?.length === 0
                    ? "Add your training certificates"
                    : `Added ${
                        trustTrainingGridData?.length ||
                        companyDetails?.addTrustRecord?.length
                      } ${
                        trustTrainingGridData?.length === 1
                          ? "record"
                          : "records"
                      }`}
                </button>

                {/* <!-- trainingrecords --> */}

                <br />

                <br />

                <ImageUploader
                  onImageSelect={(e: any) => onImageChange(e)}
                  accept={UploadImage.jpegAndPng}
                  label="Upload business logo"
                  selectedImage={
                    cropImage?.length > 0
                      ? cropImage[0]
                      : formik?.values?.imageFile || ""
                  }
                  onImageRemove={() => {
                    setCropImage([]);
                    setCroppedPreviewUrl("");
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
                  base64Image={croppedPreviewUrl || (isEditable ? formik?.values?.image : "")}
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

                {businessDetails?.signature && (
                  <Fragment>
                    <label>
                      <small>Update your signature</small>
                    </label>
                    <Image
                      width={0} // Fixed width
                      height={0} // Fixed height
                      src={signature || businessDetails?.signature}
                      alt={"signature"}
                      onClick={() => setDisplaySignature(true)}
                      className="pt_profileimageupload cu-pointer business_signature_image"
                    />
                    <br />
                    <br />
                  </Fragment>
                )}
                <label>
                  <small>Manage email preferences</small>
                </label>
                <div
                  style={{
                    marginBottom: "1rem",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "1rem",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "0.5rem",
                      }}
                    >
                      <FormikControl
                        id={"compliance"}
                        name={"compliance"}
                        label={"Receive email when a project compliance fails."}
                        control={InputType.CHECKBOX}
                        onChange={formik?.handleChange}
                        value={formik.values.compliance}
                      />
                    </div>
                  </div>
                </div>
                {/* Phase 2 — company GST registration flag. Used as the
                    PT-side fallback in resolveContactGstStatus when
                    neither the per-contact override nor the cached Xero
                    org default has a value. */}
                <label>
                  <small>GST registration</small>
                </label>
                <div style={{ marginBottom: "1rem", display: "block" }}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <FormikControl
                      id={"is_gst_registered"}
                      name={"is_gst_registered"}
                      label={
                        "This business is registered for GST (used as a fallback when Xero org settings are not available)."
                      }
                      control={InputType.CHECKBOX}
                      onChange={(e: any) =>
                        formik.setFieldValue(
                          "is_gst_registered",
                          !!e?.target?.checked,
                        )
                      }
                      value={!!formik.values.is_gst_registered}
                    />
                  </div>
                </div>
                {/* Task #97 — per-company notices auto-send opt-out. When
                    UNCHECKED, the auto-send pipeline still generates the
                    notice + mail file but skips the automatic send so the
                    user can manually review and dispatch. */}
                <label>
                  <small>Notices auto-send</small>
                </label>
                <div style={{ marginBottom: "1rem", display: "block" }}>
                  {(formik.values?.SubscriptionType ||
                    formik.values?.planType ||
                    "Basic") === "Basic" ? (
                    <div
                      style={{
                        padding: 12,
                        background: "#fff5f5",
                        border: "1px solid #f5c6cb",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      Auto-send is a paid-plan feature. Upgrade your
                      subscription to enable automatic delivery of compliance
                      notices on your behalf.
                    </div>
                  ) : (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <FormikControl
                        id={"notices_auto_send"}
                        name={"notices_auto_send"}
                        label={
                          "Automatically send compliance notices on my behalf when my plan supports delegated sending. Untick to generate notices but require a manual send."
                        }
                        control={InputType.CHECKBOX}
                        onChange={(e: any) =>
                          formik.setFieldValue(
                            "notices_auto_send",
                            !!e?.target?.checked,
                          )
                        }
                        value={formik.values.notices_auto_send !== false}
                      />
                    </div>
                  )}
                </div>
                <br />
                <br />
                <div style={{
                  border: "1px solid #f5c6cb",
                  borderRadius: "8px",
                  padding: "20px",
                  background: "#fff5f5",
                  marginBottom: "20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                    <i className="fa-light fa-shield-exclamation" style={{ color: "#dc3545", fontSize: "20px", marginRight: "10px" }}></i>
                    <h4 style={{ margin: 0, color: "#dc3545", fontSize: "16px", fontWeight: "700" }}>Delete My Data</h4>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#666", lineHeight: "1.5" }}>
                    Under applicable privacy regulations, you have the right to request deletion of your business profile data. 
                    Submitting this request will notify our team, who will review and process it accordingly.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (deletionRequestSending) return;
                      setDeletionRequestSending(true);
                      await requestDataDeletion("business", formik?.values?.companyName || "");
                      setDeletionRequestSending(false);
                    }}
                    disabled={deletionRequestSending}
                    style={{
                      background: "transparent",
                      border: "1px solid #dc3545",
                      color: "#dc3545",
                      padding: "8px 20px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: deletionRequestSending ? "not-allowed" : "pointer",
                      opacity: deletionRequestSending ? 0.6 : 1,
                    }}
                  >
                    {deletionRequestSending ? (
                      <><i className="fa-light fa-spinner-third fa-spin" style={{ marginRight: "6px" }}></i>Sending...</>
                    ) : (
                      <><i className="fa-light fa-envelope" style={{ marginRight: "6px" }}></i>Request Business Data Deletion</>
                    )}
                  </button>
                </div>
                <div className="grid">
                  <input
                    type="submit"
                    value="Cancel"
                    className="outline contrast"
                    onClick={handleCancel}
                  />
                  <input
                    type="submit"
                    value={isEditable ? "Update" : "Save"}
                    className="secondary"
                    onClick={() => formik?.handleSubmit()}
                  />
                </div>
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

      {displayTrainingRecords && <TrustRecordForms />}
      {displayTrainingRecordsGrid && <TrustRecordGrid />}
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
          <h4 className="text_center"> Are you sure to close and not save?</h4>
        </BaseModal>
      )}
      {displaySignature && (
        <UpdateSignature
          isDisplay={displaySignature}
          handleClose={() => setDisplaySignature(false)}
          onConfirmation={(signature: string, type: string) => {
            setSignature(signature);
            setSignatureType(type);
            setDisplaySignature(false);
          }}
          title="Edit Signature"
          buttonName={"Apply changes"}
          data={{
            file: signature || businessDetails?.signature,
            type: signatureType || businessDetails?.signature_type,
          }}
        />
      )}
      {showNoticesInfo && (
        <BaseModal
          modalId={"Information"}
          displayModal={showNoticesInfo}
          onClose={() => formik.setFieldValue("notices", true)}
          onHeaderIconClose={() => setShowNoticesInfo(false)}
          onConfirm={() => {
            formik.setFieldValue("notices", false);
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">
            When notices are turned off, you will not receive any notifications
            regarding claims and payments.
          </h4>
        </BaseModal>
      )}
      {displayModal && (
        <BaseModal
          displayModal={displayModal}
          onClose={() => setDisplayModal(false)}
          firstButtonName="Cancel"
          secondButtonName="Join"
          title="Business Info"
          onConfirm={() => {
            joinBusiness();
            return true;
          }}
        >
          <div
            className="pt_profilename"
            style={{
              height: "80px",
              pointerEvents: "none",
              lineHeight: "unset",
            }}
            key={selectedCompany?.id}
            onClick={() => {
              setSelectedCompany(selectedCompany);
              setDisplayModal(true);
            }}
          >
            <Image
              src={selectedCompany?.file_path || userImage}
              alt={selectedCompany?.file_name || "user-icon"}
              width={300}
              height={300}
              className="avatar useravatar"
            />
            <div className="searchOption" style={{ height: "75px" }}>
              <span className="pt_user">{selectedCompany.company_name}</span>
              {selectedCompany?.legal_company_name && (
                <span
                  className="pt_email"
                  style={{ fontStyle: "italic", color: "#1583d8" }}
                >
                  {selectedCompany?.legal_company_name}
                </span>
              )}
              <span className="pt_email">{selectedCompany.entity_type} </span>
              <span className="pt_email">
                {selectedCompany.company_address}
              </span>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
