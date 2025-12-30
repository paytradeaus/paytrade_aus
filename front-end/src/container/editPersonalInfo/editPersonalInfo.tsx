//default imports
"use client";
import React, { Fragment, useEffect, useState } from "react";
import Image from "next/image";
//import from reactstrap components
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { ExclamationTriangleFill, Trash, XCircle } from "react-bootstrap-icons";
//import from customized components
import customStyles from "./editPersonalInfo.module.scss";
import commonStyles from "./../../common/commonStyles.module.scss";
import TextField from "@/components/TextField/textField";
//import customized styles
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import { DD_MM_YYYY, imageTypeFormats } from "@/common/constants/general";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import {
  deleteUserImage,
  fetchPersonalInfo,
  updatePersonalInfo,
} from "./editPersonalInfo.function";
import { toast } from "react-toastify";
import FileSelector from "@/components/fileSelector/fileSelector";
import { AppModal } from "@/components/model/model";
import {
  convertCanvasToFile,
  getDecryptedToken,
} from "@/common/commonFunctions";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { getCookie } from "cookies-next";
import { useAppDispatch } from "@/redux/store";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import ImageCropper from "@/components/ImageCropper/imageCropper";
import { useLoaderContext } from "@/context/useLoader";
import SignatureUploader from "@/components/SignatureUploader";
import { isValidPhoneNumber } from "react-phone-number-input";

//import from constants, interfaces ,functions and services
//module level constants and interfaces
interface EditPersonalInfoProps {
  onClose: () => void;
}

export default function EditPersonalInfo({
  onClose,
}: Readonly<EditPersonalInfoProps>) {
  //useState and useEffect Management

  const { setLoader }: any = useLoaderContext();
  const [selectedImage, setSelectedImage] = useState<File[]>([]);
  const [savedImage, setSavedImage] = useState<any>("");

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState("");

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
              ? new Date(response?.date_of_birth)
              : null,
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
          });
          setSavedImage(response?.file);

          setTimeKey(new Date().getTime());
        }
      })
      .catch((err: any) => console.log("~ handleSubmit ~ err:", err));
  }

  async function handleSubmit() {
    try {
      setLoader(true);
      const postData: any = {
        updateSignupInput: {
          ...formik?.values,
          signature: signature || formik?.values?.signature,
          signature_type: signatureType || formik?.values?.signature_type,
          is_signature_updated: !!signature,
        },
      };

      await updatePersonalInfo(postData).then((response: any) => {
        if (response) {
          const tokenData = getDecryptedToken();

          dispatch(
            setAppUserDetails({
              ...tokenData,
              image: savedImage ?? "",
              userName: `${formik?.values?.first_name} ${formik?.values?.last_name}`,
            })
          );

          onClose();
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
      setSelectedImage([]);
      dispatch(setAppUserDetails({ ...tokenData, image: "" }));
      getPersonalInfo();
    }
  }

  async function handleFileUpload(uploadedFile: any) {
    try {
      setSelectedImage([]);
      setLoader(true);

      const convertedCanvasToFile = await convertCanvasToFile(
        uploadedFile,
        selectedImage
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
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Image upload failed");
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  //Render Template
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col className={customStyles.card}>
          <h5 className={customStyles.title}>Edit Personal Info</h5>

          <Form
            className={customStyles.formStyles}
            onSubmit={formik.handleSubmit}
          >
            <div>
              {!savedImage && (
                <div className={customStyles.selectContainerBtn}>
                  <FileSelector
                    handleSave={(files) => {
                      if (files.length > 0) {
                        const fileArray = Array.from(files);
                        const newFileArray = fileArray.map((file) => {
                          const newFileName = file.name;
                          const newFile = new File([file], newFileName, {
                            type: file.type,
                          });
                          return newFile;
                        });

                        setSelectedImage(newFileArray);
                      }
                    }}
                    acceptedFileFormats={imageTypeFormats}
                    multiple={false}
                    maximumSize={2 * 1024}
                    onError={(error) => {
                      toast.error(`Max Allowed file size is ${2} Mb`);
                    }}
                  >
                    <div className={customStyles.selectContainer}>
                      add image
                    </div>
                  </FileSelector>
                </div>
              )}
              {savedImage && (
                <div
                  style={{ display: "inline-block" }}
                  className={customStyles.imageViewStyle}
                >
                  <Trash
                    className={customStyles.fileRemoveIcon}
                    onClick={() => setDisplayConfirmationModal(true)}
                  />
                  <Image
                    width={100}
                    height={100}
                    src={savedImage}
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
            </div>

            <div className={customStyles.textFieldStyles}>
              <TextField
                placeholder="Enter first name"
                type="text"
                errorText={formik.errors.first_name}
                isInvalid={
                  !!(formik.touched.first_name && formik.errors.first_name)
                }
                labelText="First Name *"
                name="first_name"
                id="first_name"
                value={formik.values.first_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </div>

            <div className={customStyles.textFieldStyles}>
              <TextField
                placeholder="Enter last name"
                type="text"
                errorText={formik.errors.last_name}
                isInvalid={
                  !!(formik.touched.last_name && formik.errors.last_name)
                }
                labelText="Last Name *"
                name="last_name"
                id="last_name"
                value={formik.values.last_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </div>

            <div className={customStyles.textFieldStyles}>
              <CustomDatePicker
                showIcon={true}
                label="Date of Birth "
                toggleCalendarOnIconClick
                placeholderText="&nbsp;Select date of birth"
                className={
                  formik.touched.date_of_birth && formik.errors.date_of_birth
                    ? `${customStyles.datePicker} ${customStyles.datePickerError}`
                    : customStyles.datePicker
                }
                selected={formik.values.date_of_birth}
                onChange={(selectedDate: string) =>
                  formik.setFieldValue("date_of_birth", selectedDate)
                }
                disabled={false}
                format={DD_MM_YYYY}
                value={formik?.values?.date_of_birth}
                maxDate={new Date()}
              />
              {formik.touched.date_of_birth && formik.errors.date_of_birth && (
                <div className={customStyles.errorContainer}>
                  <ExclamationTriangleFill className={customStyles.error} />
                  <span className={customStyles.errorTextStyles}>
                    {formik.errors.date_of_birth}
                  </span>
                </div>
              )}
            </div>

            <div className={customStyles.textFieldStyles}>
              <TextField
                placeholder="Enter Position/Title"
                type="text"
                errorText={formik.errors.position_title}
                isInvalid={
                  !!(
                    formik.touched.position_title &&
                    formik.errors.position_title
                  )
                }
                labelText="Position/Title *"
                name="position_title"
                id="position_title"
                value={formik.values.position_title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </div>

            <div className={customStyles.textFieldStyles}>
              <TextField
                placeholder="Enter occupation"
                type="text"
                errorText={formik.errors.occupation}
                isInvalid={
                  !!(formik.touched.occupation && formik.errors.occupation)
                }
                labelText="Occupation"
                name="occupation"
                id="occupation"
                value={formik.values.occupation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </div>
            <div className={customStyles.textFieldStyles}>
              <div className={customStyles.googlFiledStyles}>
                <label>Address *</label>
                <GooglePlacesInput
                  key={timeKey}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    !!(
                      formik.touched.user_address && formik.errors.user_address
                    )
                  }
                  value={formik.values.user_address}
                  onChange={handleAddressChange}
                  onBlur={formik.handleBlur("user_address")}
                />
                {formik.touched.user_address && formik.errors.user_address && (
                  <div className={customStyles.errorContainer}>
                    <ExclamationTriangleFill className={customStyles.error} />
                    <span className={customStyles.errorTextStyles}>
                      {formik.errors.user_address}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className={customStyles.phoneNumberStyles}>
              <label className={customStyles.labelStyle} id="user_phone_no">
                Phone Number *
              </label>

              <PhoneInputField
                id="user_phone_no"
                name="user_phone_no"
                error={
                  !!(
                    formik.touched.user_phone_no && formik.errors.user_phone_no
                  )
                }
                value={formik.values.user_phone_no}
                onChange={formik.handleChange("user_phone_no")}
                onBlur={formik.handleBlur("user_phone_no")}
                showErrorIcon={Boolean(
                  formik.touched.user_phone_no && formik.errors.user_phone_no
                )}
              />
              {formik.touched.user_phone_no && formik.errors.user_phone_no && (
                <div className={customStyles.errorContainer}>
                  <ExclamationTriangleFill className={customStyles.error} />
                  <span className={customStyles.errorTextStyles}>
                    {formik.errors.user_phone_no}
                  </span>
                </div>
              )}
            </div>

            {formik?.values?.signature && (
              <Fragment>
                <p className={customStyles.InfoTextStyle}>Signature</p>
                <div
                  className={customStyles.imageContainer}
                  onClick={() => setDisplaySignature(true)}
                >
                  <Image
                    width={0}
                    height={0}
                    // src={imageUrl}
                    src={signature || formik?.values?.signature}
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

            <div className="d-flex justify-content-center mt-4 w-100">
              <Button
                className={`${customStyles.button} ${customStyles.closeButton}`}
                onClick={() => onClose()}
              >
                Close
              </Button>
              <Button
                className={customStyles.button}
                onClick={() => formik.handleSubmit()}
              >
                Save
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
      <AppModal
        show={displayConfirmationModal}
        onHide={() => setDisplayConfirmationModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalBodyContent="Are you sure you want to delete the image?"
        onConfirm={handleDeleteUserImage}
      />
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
            file: signature || formik?.values?.signature,
            type: signatureType || formik?.values?.signature_type,
          }}
        />
      )}
    </Container>
  );
}
