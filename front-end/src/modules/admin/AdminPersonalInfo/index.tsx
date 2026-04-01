"use client";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch } from "@/redux/store";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import {
  GetAdminDetailsById,
  UpdateAdminDetails,
} from "./personalInfo.functions";
import {
  convertCanvasToFile,
  getDecryptedToken,
  handleSelectedImage,
} from "@/utils";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { singleUploadApi } from "@/app/api/commonApi";
import { InputType, UploadImage } from "@/shared/constant/general";
import Image from "next/image";
import FormikControl from "@/components/FormikControl";
import ImageUploader from "@/components/ImageUploader";
import dynamic from "next/dynamic";
import { AppRoutes } from "@/shared/constant/appRoutes";

const ImageCropper = dynamic(() => import("@/components/ImageCropper"), {
  ssr: false,
});
import { AdminRoles, Roles } from "@/shared/constant/role";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import UpdateSignature from "@/modules/user/BusinessProfile/UpdateSignature";
import { useTokenDetails } from "@/hooks";
import { deleteUserImage } from "@/modules/user/PersonalInfo/personalInfo.functions";
declare global {
  interface Window {
    CookieConsent: any;
  }
}
export default function AdminPersonalInfo() {
  // const { setLoader }: any = useLoaderContext();
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
  const [cropImage, setCropImage] = useState<any>();

  const [clearImageName, setClearImageName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | any>(null);
  const [userData, setUserData] = useState<any>({});

  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const adminUUID = decodeTokenData?.id;

  useEffect(() => {
    (async () => {
      const payload: any = {
        id: adminUUID || "",
      };
      const resUserData = await GetAdminDetailsById(payload);
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
  });

  const formik: any = useFormik({
    initialValues: {
      first_name: "",
      last_name: "",
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
        showInfoToast("No changes to save");
        return;
      }
      setLoader(true);
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
        "User status has been updated"
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
        setLoader(false);
      } else {
        setLoader(false);
      }
    },
  });

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
        cropImage
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
        showSuccessToast("Image uploaded successfully");
      } else {
        showErrorToast("Image upload failed");
      }

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handleCancel() {
    let userData: any = getDecryptedToken();
    AdminRoles.includes(userData?.role)
      ? router.push(AppRoutes.ADMIN_DASHBOARD)
      : router.push(AppRoutes.USER_DASHBOARD);
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

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <button
              className="contrast smallbutton"
              style={{ float: "right" }}
              onClick={() => router.push(AppRoutes.ADMIN_DASHBOARD)}
              type="button"
            >
              <i className="fa-light fa-xmark"></i>Close
            </button>
            <div className="grid">
              <div className="pt_login">
                <h4>Personal Info</h4>
                <br />
                <form onSubmit={formik.handleSubmit}>
                  <div>
                    <ImageUploader
                      onImageSelect={(e: any) => onImageChange(e)}
                      accept={UploadImage.jpegAndPng}
                      label="Upload Profile Picture"
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
                        removeSelectedImage={() => setCropImage([])}
                      />
                    )}
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      label={"First Name"}
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
                      label={"Last Name"}
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
                    {userData?.admin_role === Roles.SUPER_ADMIN_ROLE &&
                      decodeTokenData?.id === userData?.id && (
                        <Fragment>
                          <label>
                            <small>Delegated authority signature</small>
                          </label>
                          {(signature || userData?.signature) ? (
                            <Image
                              width={0}
                              height={0}
                              src={signature || userData?.signature}
                              alt={"signature"}
                              onClick={() => setDisplaySignature(true)}
                              className="pt_profileimageupload cu-pointer business_signature_image"
                            />
                          ) : (
                            <input
                              type="button"
                              value="Add Signature"
                              className="outline secondary"
                              onClick={() => setDisplaySignature(true)}
                              style={{ width: "auto" }}
                            />
                          )}
                          <br />
                        </Fragment>
                      )}
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
      {displaySignature &&
        userData?.admin_role === Roles.SUPER_ADMIN_ROLE &&
        decodeTokenData?.id === userData?.id && (
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
              file: signature || userData?.signature,
              type: signatureType || userData?.signature_type,
            }}
          />
        )}
    </div>
  );
}
