"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { ExclamationTriangleFill, Trash, XCircle } from "react-bootstrap-icons";
import customStyles from "./editPersonalInfo.module.scss";
import commonStyles from "./../../../../common/commonStyles.module.scss";
import TextField from "@/components/TextField/textField";

import { useFormik } from "formik";
import * as Yup from "yup";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import { DD_MM_YYYY, imageTypeFormats } from "@/common/constants/general";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
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
import {
  GetAdminDetailsById,
  UpdateAdminDetails,
} from "../../addAdminUser/addAdminUser.functions";
import SignatureUploader from "@/components/SignatureUploader";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import { useTokenDetails } from "@/common/commonHooks";
import { deleteUserImage } from "@/container/editPersonalInfo/editPersonalInfo.function";

interface EditPersonalInfoProps {
  onClose: () => void;
  adminUUID: string;
}

export default function EditPersonalInfo({
  onClose,
  adminUUID,
}: Readonly<EditPersonalInfoProps>) {
  const { setLoader }: any = useLoaderContext();
  const [selectedImage, setSelectedImage] = useState<File[]>([]);
  const [savedImage, setSavedImage] = useState<any>("");
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const [userData, setUserData] = useState<any>({});
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [displaySkeletonLoader, setDisplaySkeletonLoader] = useState(false);
  const [disabledBtn, setDisabledBtn] = useState(false);

  const [displaySignature, setDisplaySignature] = useState(false);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState("");

  useEffect(() => {
    (async () => {
      const payload: any = {
        id: adminUUID || "",
      };
      setDisplaySkeletonLoader(true);
      const resUserData = await GetAdminDetailsById(
        payload,
        setDisplaySkeletonLoader
      );
      if (resUserData?.id) {
        setUserData(resUserData);
      } else {
        setUserData({});
      }
    })();
  }, []);

  useEffect(() => {
    if (userData?.id) {
      formik.setValues({
        first_name: userData?.first_name,
        last_name: userData?.last_name,
      });
      setSavedImage(userData?.file || "");
      // setTimeKey(new Date().getTime());
    }
  }, [userData]);

  const dispatch = useAppDispatch();

  const validationSchema = Yup.object().shape({
    first_name: Yup.string()
      .required("First name is required")
      .max(25, "Maximum 25 characters allowed"),
    last_name: Yup.string()
      .required("Last name is required")
      .max(25, "Maximum 25 characters allowed"),
    // date_of_birth: Yup.date()
    //   .required("Date of birth is required")
    //   .typeError("Invalid date format"),
    // occupation: Yup.string()
    //   .notRequired()
    //   .max(50, "Maximum 50 characters allowed"),
    // position_title: Yup.string()
    //   .required("Position is required")
    //   .max(50, "Maximum 50 characters allowed"),
    // user_address: Yup.string()
    //   .required("Address is required")
    //   .max(200, "Maximum 200 characters allowed"),
    // user_phone_no: Yup.number()
    //   .typeError("only numbers allowed")
    //   .required("Phone number is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      first_name: "",
      last_name: "",
      // date_of_birth: "",
      // occupation: "",
      // user_address: "",
      // user_phone_no: "",
      // country: "",
      // latitude: "",
      // longitude: "",
      // place_id: "",
      // region: "",
      // position_title: "",
    },
    validationSchema,
    onSubmit: async (value) => {
      const { first_name, last_name } = formik.values;
      if (
        userData?.first_name === first_name &&
        userData?.last_name === last_name &&
        !signature &&
        !signatureType
      ) {
        setDisabledBtn(false);
        toast.info("No changes to save");
        return;
      }

      let modifiedPayload = {
        admin_status: userData?.admin_status,
        email_id: userData?.email_id,
        first_name: formik?.values?.first_name,
        group_ids: userData?.groupIds || [],
        last_name: formik?.values?.last_name,
        id: userData?.id,
        signature: signature || userData?.signature || "",
        signature_type: signatureType || userData?.signature_type || "",
      };
      if (!signatureType && !userData?.signature_type) {
        delete modifiedPayload?.signature;
        delete modifiedPayload?.signature_type;
      }

      let response = await UpdateAdminDetails(
        modifiedPayload,
        "User status has been updated",
        setDisabledBtn
      );
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
    },
  });

  // function handleAddressChange(value: string, placeDetails: any) {
  //   const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

  //   formik.setFieldValue("user_address", value);
  //   formik.setFieldValue("country", placeDetailsString.country);
  //   formik.setFieldValue("latitude", String(placeDetailsString.latitude));
  //   formik.setFieldValue("longitude", String(placeDetailsString.longitude));
  //   formik.setFieldValue("place_id", placeDetailsString.place_id);
  //   formik.setFieldValue("region", placeDetailsString.region);
  // }

  async function handleDeleteUserImage() {
    setDisplayConfirmationModal(false);
    const payload = {
      attachmentType: "Admin_profile",
    };
    let response = await deleteUserImage(payload);
    if (response) {
      const tokenData = getDecryptedToken();
      setSavedImage("");
      setSelectedImage([]);
      dispatch(setAppUserDetails({ ...tokenData, image: "" }));
      // getPersonalInfo();
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
        admin_id: decodedToken?.userId,
        uploaded_by: decodedToken?.emailId,
        attachment_type: "Admin_profile",
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
                    // disabled
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
            {userData?.admin_role === SUPER_ADMIN_ROLE &&
              decodeTokenData?.role === SUPER_ADMIN_ROLE &&
              decodeTokenData?.id === userData?.id && (
                <div className={customStyles.dataRow2}>
                  <p className={customStyles.InfoTextStyle}>
                    Delegated authority signature
                  </p>
                  <div
                    className={customStyles.imageContainer}
                    onClick={() => setDisplaySignature(true)}
                  >
                    {signature || userData?.signature ? (
                      <Image
                        width={0}
                        height={0}
                        // src={imageUrl}
                        src={signature || userData?.signature}
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
                </div>
              )}

            <div className="d-flex justify-content-center mt-4 w-100">
              <Button
                className={`${customStyles.button} ${customStyles.closeButton}`}
                onClick={() => onClose()}
                disabled={disabledBtn}
              >
                Close
              </Button>
              {userData?.id && (
                <Button
                  className={customStyles.button}
                  disabled={disabledBtn}
                  onClick={() => {
                    setDisabledBtn(true);
                    formik.handleSubmit();
                  }}
                >
                  Save
                </Button>
              )}
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
      {displaySignature &&
        userData?.admin_role === SUPER_ADMIN_ROLE &&
        decodeTokenData?.role === SUPER_ADMIN_ROLE &&
        decodeTokenData?.id === userData?.id && (
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
              file: signature || userData?.signature,
              type: signatureType || userData?.signature_type,
            }}
          />
        )}
    </Container>
  );
}
