"use client";
import CustomButton from "@/components/CustomButton/CustomButton";
import ImageUploader from "@/components/ImageUploader";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

import { setImageFile } from "@/redux/slices/imageUploadSlice";
import { setUserDetails } from "@/redux/slices/userRegistrationSlice";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, UploadImage } from "@/shared/constant/general";
import { useFormik } from "formik";
import _ from "lodash";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import ReCaptchaComponent from "../../../components/GoogleRecaptcha/index";
import ImageCropper from "@/components/ImageCropper";
import { convertCanvasToFile } from "@/utils";
import { insertEmailVerificationDetails } from "@/network/existanceAPIsCheck";
const SUBMIT = "submit";
const SKIP = "skip";

export default function AddUserProfileForm() {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY || "";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);
  const [triggerPoint, setTriggerPoint] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<any>([]);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>("");
  const [isSkipDisabled, setIsSkipDisabled] = useState(false);
  const [imageError, setImageError] = useState<string>("");
  const router = useRouter();

  const dispatch = useAppDispatch();

  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

  useEffect(() => {
    if (_.isEmpty(userDetails) || _.isEmpty(userDetails?.userDetails)) {
      router.push(AppRoutes.USER_SIGNUP);
    }
  }, [userDetails]);

  useEffect(() => {
    if (recaptchaToken) {
      if (triggerPoint === SUBMIT) {
        onSubmit();
      } else if (triggerPoint === SKIP) {
        handleSkipClick();
      }
    }
  }, [recaptchaToken]);

  const formik = useFormik({
    initialValues: {},
    onSubmit: () => {
      clickRecaptchaButton(SUBMIT);
    },
  });

  const allowedFileTypes = ["image/jpeg", "image/png"]; // Add more as needed
  const maxFileSize = 2 * 1024 * 1024; // 2 MB

  const handleImageCrop = async (uploadedFile: File) => {
    const convertedCanvasToFile: any = await convertCanvasToFile(
      uploadedFile,
      selectedImage
    );

    // Generate preview URL from the cropped file
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppedPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(convertedCanvasToFile);

    // If validations pass, set the image file

    dispatch(setImageFile(convertedCanvasToFile));
    setSelectedImage([]);
    setImageError("");
  };

  function clickRecaptchaButton(typeOfButton: string) {
    setTriggerPoint(typeOfButton);
    if (typeOfButton === SKIP) {
      setIsSkipDisabled(true);
    }
    verifyButtonRef?.current?.click();
  }

  async function handleSkipClick() {
    try {
      const details = {
        // created_by: userDetails?.userDetails.Email,
        // created_on: getCurrentUtcTime(),
        email_id: userDetails?.userDetails.email,
        first_name: userDetails?.userDetails.FirstName,
        last_name: userDetails?.userDetails.LastName,
        mail_type: "Verify_User",
        type: "Send",
        verification_code: "",
        recaptcha_token: recaptchaToken ?? "",
      };

      // Call the function to insert email verification details
      const response = await insertEmailVerificationDetails(details);
      dispatch(setUserDetails({ ...userDetails?.userDetails, ...details }));

      if (response) {
        showSuccessToast("OTP has been sent to your registered email address");
        router.push("/user/registration/verification");
      }
    } catch (error) {
      console.error("Error in insertEmailVerificationDetails:", error);
      // Handle errors, e.g., show an error message to the user
    }
  }

  async function onSubmit() {
    if (recaptchaToken) {
      // Ensure you have the token
      // You can now send both the form values and the reCAPTCHA token to your server or perform other actions
      // Check if image file is not selected
      if (!imageFile) {
        // Show error message or toast notification
        setImageError(
          "Please upload an image or click the Skip button to continue."
        );

        return; // Stop form submission
      }

      setImageError("");

      const details = {
        email_id: userDetails?.userDetails.email,
        first_name: userDetails?.userDetails.FirstName,
        last_name: userDetails?.userDetails.LastName,
        mail_type: "Verify_User",
        type: "Send",
        verification_code: "",
        recaptcha_token: recaptchaToken,
      };

      try {
        // Call the function to insert email verification details
        const response = await insertEmailVerificationDetails(details);
        dispatch(setUserDetails({ ...userDetails?.userDetails, ...details }));

        if (response) {
          showSuccessToast(
            "OTP has been sent to your registered email address"
          );

          router.push(AppRoutes.USER_VERIFICATION);
        }
        // Handle the response as needed

        // You can perform other actions or navigate based on the response
      } catch (error) {
        // Handle errors
        console.error("Error in insertEmailVerificationDetails:", error);
        // You may want to display an error message to the user
      }
    }
  }

  function handlePreviousClick() {
    router.push(AppRoutes.USER_REGISTRATION);
  }

  function handleReCaptchaVerify(token: string) {
    // Handle the reCAPTCHA token verification logic here

    setRecaptchaToken(token);
    // You can send this token to your server for verification or other actions
  }

  async function onImageSelection(image: any) {
    // Validate file type
    if (!allowedFileTypes.includes(image.type)) {
      // Show toast message for invalid file type
      // You can use any toast library here, such as react-toastify
      // Example using react-toastify
      dispatch(setImageFile(null));
      showErrorToast(
        "Invalid file type. Please select a valid image file (JPEG/PNG)."
      );
      return;
    }

    // Validate file size
    if (image.size > maxFileSize) {
      console.log("valid");

      // Show toast message for invalid file size
      // Example using react-toastify
      dispatch(setImageFile(null));

      showErrorToast(
        "File size exceeds the limit (2MB). Please select a smaller file."
      );
      setSelectedImage([]);
      return;
    }

    setSelectedImage([image]);
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey ?? "UNDEFINED"}>
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent">
            <div className="grid">
              <div className="pt_login">
                <h4>Adding a photo helps people to recognize you</h4>
                <br />
                <br />
                <ImageUploader
                  onImageSelect={async (image: any) =>
                    await onImageSelection(image)
                  }
                  displayCenterAligned
                  imagePlaceholder="Select image"
                  imageStyles={{
                    borderRadius: "50%",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    display: imageFile ? "block" : "none", // Only display the image if imageFile is set
                  }}
                  accept={UploadImage.jpegAndPng}
                  // Pass the imageFile to the component to display the image
                  selectedImage={
                    selectedImage?.length > 0 ? selectedImage[0] : imageFile
                  }
                  base64Image={croppedPreviewUrl}
                />
                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                  Click or drag a file to this area to upload
                </p>
                {imageError && (
                  <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                    <small className="invalid error_wrap">
                      <i className="fa-light fa-circle-xmark"></i>
                      {imageError}
                    </small>
                  </div>
                )}
                <br />
                <br />
                <CustomButton
                  buttonName={"Next"}
                  buttonType={buttonType.SECONDARY}
                  actionType="submit"
                  onClick={formik.handleSubmit}
                  inputButton
                />
                <CustomButton
                  buttonName={"Previous"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="submit"
                  onClick={() => handlePreviousClick()}
                  inputButton
                />
                <CustomButton
                  buttonName={"Skip"}
                  buttonType={buttonType.SECONDARY}
                  actionType="submit"
                  disabled={isSkipDisabled}
                  onClick={() => clickRecaptchaButton(SKIP)}
                  inputButton
                />
              </div>
            </div>
          </div>
          <ReCaptchaComponent
            onVerify={handleReCaptchaVerify}
            verifyButtonRef={verifyButtonRef}
          />
        </div>
        {selectedImage?.length > 0 ? (
          <ImageCropper
            selectedImage={selectedImage}
            displayCropper={selectedImage?.length > 0}
            handleCroppedImage={(selectedCanvas: any) =>
              handleImageCrop(selectedCanvas)
            }
            removeSelectedImage={() => setSelectedImage([])}
          />
        ) : (
          ""
        )}
      </div>
    </GoogleReCaptchaProvider>
  );
}
