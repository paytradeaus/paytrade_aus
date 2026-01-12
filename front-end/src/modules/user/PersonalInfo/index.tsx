"use client";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import {
  deleteUserImage,
  fetchPersonalInfo,
  updatePersonalInfo,
} from "./personalInfo.functions";
import {
  convertCanvasToFile,
  getDatePickerFormat,
  getDecryptedToken,
  handleSelectedImage,
} from "@/utils";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { singleUploadApi } from "@/app/api/commonApi";
import { InputType, UploadImage } from "@/shared/constant/general";
import Image from "next/image";
import FormikControl from "@/components/FormikControl";
import GooglePlacesInput from "@/components/GooglePlaces";
import { isValidPhoneNumber } from "react-phone-number-input";
import PhoneInputField from "@/components/phoneNumberInput";
import ImageUploader from "@/components/ImageUploader";
import ImageCropper from "@/components/ImageCropper";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { AdminRoles } from "@/shared/constant/role";
import { useRouter, useSearchParams } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import UpdateSignature from "../BusinessProfile/UpdateSignature";
import { isEqual } from "lodash";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";

declare global {
  interface Window {
    CookieConsent: any;
  }
}
export default function PersonalInfo() {
  // const { setLoader }: any = useLoaderContext();
  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");

  const [loader, setLoader] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File[]>([]);
  const [savedImage, setSavedImage] = useState<any>("");

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState("");

  const [displayImage, setDisplayImage] = useState<any>([]);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [showNoticesInfo, setShowNoticesInfo] = useState(false);
  const [cropImage, setCropImage] = useState<any>();

  const [clearImageName, setClearImageName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | any>(null);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  const router = useRouter();

  useEffect(() => {
    getPersonalInfo();
  }, []);
  //other Hooks

  const dispatch = useAppDispatch();

  //Formik Handling
  const validationSchema = Yup.object().shape({
    first_name: Yup.string()
      .required("First name is required")
      .max(100, "Maximum 100 characters allowed"),
    last_name: Yup.string()
      .required("Surname is required")
      .max(100, "Maximum 100 characters allowed"),
    date_of_birth: Yup.date()
      // .required("Date of birth is required")
      .notRequired()
      .typeError("Invalid date format"),
    occupation: Yup.string()
      .notRequired()
      .max(50, "Maximum 50 characters allowed"),
    position_title: Yup.string()
      .required("Position is required")
      .max(50, "Maximum 50 characters allowed"),
    user_address: Yup.string()
      .required("Address is required")
      .max(200, "Maximum 200 characters allowed"),
    user_phone_no: Yup.string()

      .required("Phone number is required")
      .test(
        "is-valid-phone-number",
        "Please enter a valid phone number",
        (value: any) => isValidPhoneNumber(value)
      ),
  });

  const formik: any = useFormik({
    initialValues: {
      first_name: "",
      last_name: "",
      date_of_birth: "",
      occupation: "",
      user_address: "",
      user_phone_no: "",
      country: "",
      latitude: "",
      longitude: "",
      place_id: "",
      region: "",
      position_title: "",
      community: true,
      compliance: true,
      notices: true,
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  //functions
  function handleAddressChange(value: string, placeDetails: any) {
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    // Set the formik field value for the "Address" field as a string

    formik.setFieldValue("user_address", value);
    formik.setFieldValue("country", placeDetailsString.country);
    formik.setFieldValue("latitude", String(placeDetailsString.latitude));
    formik.setFieldValue("longitude", String(placeDetailsString.longitude));
    formik.setFieldValue("place_id", placeDetailsString.place_id);
    formik.setFieldValue("region", placeDetailsString.region);
  }

  async function getPersonalInfo() {
    await fetchPersonalInfo()
      .then((data: any) => {
        if (data?.length) {
          const response = data[0];

          formik.setValues({
            first_name: response?.first_name,
            last_name: response?.last_name,
            date_of_birth: response?.date_of_birth
              ? getDatePickerFormat(response?.date_of_birth)
              : "",
            occupation: response?.occupation,
            user_address: response?.user_address,
            user_phone_no: response?.user_phone_no,
            latitude: response?.latitude,
            longitude: response?.longitude,
            country: response?.country,
            region: response?.region,
            place_id: response?.place_id,
            position_title: response?.position_title,
            signature: response?.signature,
            signature_type: response?.signature_type,
            community: response?.email_preferences?.community,
            compliance: response?.email_preferences?.compliance,
          });
          setSavedImage(response?.file);

          setTimeKey(new Date().getTime());
          setInitialPatchedValues({
            first_name: response?.first_name,
            last_name: response?.last_name,
            date_of_birth: response?.date_of_birth
              ? getDatePickerFormat(response?.date_of_birth)
              : "",
            occupation: response?.occupation,
            user_address: response?.user_address,
            user_phone_no: response?.user_phone_no,
            latitude: response?.latitude,
            longitude: response?.longitude,
            country: response?.country,
            region: response?.region,
            place_id: response?.place_id,
            position_title: response?.position_title,
            signature: response?.signature,
            signature_type: response?.signature_type,
            community: response?.email_preferences?.community,
            compliance: response?.email_preferences?.compliance,
          });
        }
      })
      .catch((err: any) => console.log("~ handleSubmit ~ err:", err));
  }

  async function handleSubmit() {
    try {
      setLoader(true);
      const { community, compliance, notices, ...restValues } = formik?.values;
      const postData: any = {
        updateSignupInput: {
          ...restValues,
          signature: signature || formik?.values?.signature,
          signature_type: signatureType || formik?.values?.signature_type,
          is_signature_updated: !!signature,
          date_of_birth: formik?.values?.date_of_birth
            ? formik?.values?.date_of_birth
            : null,
          email_preferences: {
            community,
            compliance,
            notices: true,
          },
        },
      };

      await updatePersonalInfo(postData).then((response: any) => {
        if (response) {
          const tokenData = getDecryptedToken();

          setInitialPatchedValues(formik.values);
          dispatch(
            setAppUserDetails({
              ...tokenData,
              image: savedImage ?? "",
              userName: `${formik?.values?.first_name} ${formik?.values?.last_name}`,
            })
          );

          // onClose();
        }
      });
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function handleDeleteUserImage() {
    setDisplayConfirmationModal(false);
    const payload = {
      attachmentType: "User_profile",
    };
    let response = await deleteUserImage(payload);
    if (response) {
      const tokenData = getDecryptedToken();
      setSavedImage("");
      setCropImage([]);
      // setSavedImage("");
      // setSelectedImage([]);
      dispatch(setAppUserDetails({ ...tokenData, image: "" }));
      dispatch(setUpdatedCompany({ ...updatedCompany }));
      getPersonalInfo();
    }
  }

  async function handleFileUpload(uploadedFile: any) {
    try {
      // setSelectedImage([]);
      setLoader(true);

      const convertedCanvasToFile = await convertCanvasToFile(
        uploadedFile,
        cropImage
      );

      // Decode the access token
      const decodedToken: any = getDecryptedToken();
      const userData = {
        user_id: decodedToken?.userId,
        uploaded_by: decodedToken?.emailId,
        attachment_type: "User_profile",
      };
      const token = localStorage.getItem("accessToken") ?? "";
      const fileResponse: any = await singleUploadApi(
        convertedCanvasToFile,
        userData,
        token
      );

      if (fileResponse) {
        setSavedImage(fileResponse?.file);

        const tokenData = getDecryptedToken();

        dispatch(
          setAppUserDetails({ ...tokenData, image: fileResponse?.file })
        );
        dispatch(setUpdatedCompany({ ...updatedCompany }));

        showSuccessToast("Image uploaded successfully");
      } else {
        showErrorToast("Image upload failed");
      }

      setLoader(false);
    } catch (err: any) {
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

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    router.push(AppRoutes.USER_DASHBOARD);
  }

  function handleCancel() {
    if (isEqual(initialPatchedValues, formik?.values) && !signature) {
      router.push(AppRoutes.USER_DASHBOARD);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  function handleClose() {
    if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      router.push(AppRoutes.USER_DASHBOARD);
    }
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <button
              className="contrast smallbutton"
              style={{ float: "right" }}
              onClick={() => handleClose()}
              type="button"
            >
              <i className="fa-light fa-xmark"></i>Close
            </button>
            <div className="grid">
              <div className="pt_login">
                <h4>Personal info</h4>
                <br />
                <form onSubmit={formik.handleSubmit}>
                  <div>
                    <ImageUploader
                      onImageSelect={(e: any) => onImageChange(e)}
                      accept={UploadImage.jpegAndPng}
                      label="Upload profile picture"
                      selectedImage={cropImage?.length > 0 ? cropImage[0] : ""}
                      onImageRemove={() => {
                        setDisplayConfirmationModal(true);
                      }}
                      imageRef={fileInputRef}
                      disabled={
                        !!formik?.values?.imageFile || !!formik?.values?.image
                      }
                      clearImageName={clearImageName}
                      base64Image={savedImage || ""}
                    />
                    {displayImage?.length > 0 && (
                      <ImageCropper
                        selectedImage={displayImage}
                        displayCropper={displayImage?.length > 0}
                        handleCroppedImage={(selectedCanvas: any) => {
                          handleFileUpload(selectedCanvas);
                          setDisplayImage([]);
                        }}
                        removeSelectedImage={() => {
                          setCropImage([]);
                          setDisplayImage([]);
                        }}
                      />
                    )}
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"First name"}
                      name={"first_name"}
                      placeholder=""
                      error={formik.errors?.first_name}
                      showError={
                        formik.touched.first_name && formik.errors.first_name
                      }
                      required
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.first_name}
                    />
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"Last name"}
                      name={"last_name"}
                      placeholder=""
                      error={formik.errors?.last_name}
                      showError={
                        formik.touched.last_name && formik.errors.last_name
                      }
                      required
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.last_name}
                    />
                    <FormikControl
                      control={InputType.DATE_PICKER}
                      label={"Date of birth"}
                      name={"date_of_birth"}
                      placeholder=""
                      error={formik.errors?.date_of_birth}
                      showError={
                        formik.touched.date_of_birth &&
                        formik.errors.date_of_birth
                      }
                      onChange={(selectedDate: string) =>
                        formik.setFieldValue("date_of_birth", selectedDate)
                      }
                      onBlur={formik.handleBlur}
                      value={formik.values.date_of_birth}
                    />
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"Position/title"}
                      name={"position_title"}
                      placeholder=""
                      error={formik.errors?.position_title}
                      showError={
                        formik.touched.position_title &&
                        formik.errors.position_title
                      }
                      required
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.position_title}
                    />
                    <label htmlFor={"user_address"}>
                      <small>
                        Address <span className="required">*</span>
                      </small>
                    </label>
                    <GooglePlacesInput
                      key={timeKey}
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                      isInvalid={
                        !!(
                          formik.touched.user_address &&
                          formik.errors.user_address
                        )
                      }
                      value={formik.values.user_address}
                      onChange={handleAddressChange}
                      onBlur={formik.handleBlur("user_address")}
                    />
                    {formik.touched.user_address &&
                      formik.errors.user_address && (
                        <small>
                          <i
                            className="fa fa-exclamation-triangle"
                            style={{ color: "#e23b30" }}
                          ></i>
                          &nbsp;&nbsp;
                          <span style={{ color: "#e23b30" }}>
                            {formik.errors.user_address}
                          </span>
                        </small>
                      )}
                    <br />
                    <label htmlFor={"user_phone_no"}>
                      <small>
                        Phone number <span className="required">*</span>
                      </small>
                    </label>
                    <PhoneInputField
                      id="user_phone_no"
                      name="user_phone_no"
                      error={
                        !!(
                          formik.touched.user_phone_no &&
                          formik.errors.user_phone_no
                        )
                      }
                      value={formik.values.user_phone_no}
                      onChange={formik.handleChange("user_phone_no")}
                      onBlur={formik.handleBlur("user_phone_no")}
                      showErrorIcon={Boolean(
                        formik.touched.user_phone_no &&
                          formik.errors.user_phone_no
                      )}
                    />
                    {formik.touched.user_phone_no &&
                      formik.errors.user_phone_no && (
                        <small>
                          <i
                            className="fa fa-exclamation-triangle"
                            style={{ color: "#e23b30" }}
                          ></i>
                          &nbsp;&nbsp;
                          <span style={{ color: "#e23b30" }}>
                            {formik.errors.user_phone_no}
                          </span>
                        </small>
                      )}
                    {formik?.values?.signature && (
                      <Fragment>
                        <label>
                          <small>Update your signature</small>
                        </label>
                        <Image
                          width={0} // Fixed width
                          height={0} // Fixed height
                          src={signature || formik?.values?.signature}
                          alt={"signature"}
                          onClick={() => setDisplaySignature(true)}
                          className="pt_profileimageupload cu-pointer business_signature_image"
                        />
                        <br />
                      </Fragment>
                    )}
                    <label>
                      <small>Manage email preferences</small>
                      <div className="tooltip">
                        <i className="fa-light fa-circle-info attachment_info ml_zero_point_five"></i>
                        <span className="tooltiptext">
                          To turn off business communication switch profiles to
                          update this settings in business profile
                        </span>
                      </div>
                    </label>
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
                          id={"community"}
                          name={"community"}
                          label={
                            "Receive email when someone comments on or likes your discussion or idea."
                          }
                          control={InputType.CHECKBOX}
                          value={formik.values.community}
                          onChange={formik?.handleChange}
                        />
                      </div>
                      <div
                        style={{
                          marginBottom: "0.5rem",
                        }}
                      >
                        <FormikControl
                          id={"compliance"}
                          name={"compliance"}
                          label={
                            "Receive email when a project compliance fails."
                          }
                          control={InputType.CHECKBOX}
                          onChange={formik?.handleChange}
                          value={formik.values.compliance}
                        />
                      </div>
                      <div
                        style={{
                          marginBottom: "0.5rem",
                        }}
                      >
                        {/* <FormikControl
                          id={"notices"}
                          name={"notices"}
                          label={
                            "Receive email for notices triggered on adding contract, claims and payments against your trust accounts."
                          }
                          control={InputType.CHECKBOX}
                          onChange={(e: any) => {
                            if (e?.target?.checked) {
                              formik.setFieldValue("notices", true);
                            } else {
                              setShowNoticesInfo(true);
                            }
                          }}
                          value={formik.values.notices}
                        /> */}
                      </div>
                    </div>
                    <div>
                      <small>Manage cookies</small>
                      <a
                        style={{
                          textDecoration: "none",
                          marginLeft: "3rem",
                          color: "#1c2475",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (
                            window.CookieConsent &&
                            typeof window.CookieConsent.show === "function"
                          ) {
                            window.CookieConsent.show();
                          } else {
                            console.warn(
                              "CookieConsent or show method is not available yet."
                            );
                          }
                        }}
                      >
                        <small>Update</small>
                      </a>
                    </div>
                  </div>
                  <br />
                  <div className="grid">
                    <input
                      type="button"
                      value="Cancel"
                      className="outline contrast"
                      onClick={handleCancel}
                      disabled={loader}
                    />
                    <input
                      type="submit"
                      value="Update"
                      className="secondary"
                      disabled={loader}
                    />
                  </div>
                </form>
                <br />
                <br />
              </div>
            </div>
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          displayModal={displayConfirmationModal}
          onClose={() => setDisplayConfirmationModal(false)}
          secondButtonName="Yes"
          firstButtonName="No"
          onConfirm={() => {
            handleDeleteUserImage();
            return true;
          }}
        >
          Are you sure you want to delete the image?
        </BaseModal>
      )}
      {selectedImage?.length > 0 ? (
        <ImageCropper
          selectedImage={selectedImage}
          displayCropper={selectedImage?.length > 0}
          handleCroppedImage={(selectedCanvas: any) =>
            handleFileUpload(selectedCanvas)
          }
          removeSelectedImage={() => setSelectedImage([])}
        />
      ) : (
        ""
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
          buttonName={"Apply Changes"}
          useContext={false}
          data={{
            file: signature || formik?.values?.signature,
            type: signatureType || formik?.values?.signature_type,
          }}
        />
      )}
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
    </div>
  );
}
