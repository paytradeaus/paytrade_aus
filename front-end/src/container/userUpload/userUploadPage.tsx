"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./userUploadPage.module.scss";
import FormButton from "@/components/Button/button";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import ImageUploader from "@/components/fileUpload/fileUpload";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { insertEmailVerificationDetails } from "@/app/api/RegistrationServices";
import { setUserDetails } from "@/redux/slices/userRegistrationDetails";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import ReCaptchaComponent from "../../components/googleRecaptchaWrapper/googleRecaptchaWrapper";
import { toast } from "react-toastify";
import { setImageFile } from "@/redux/slices/imageUploadSlice";
import ImageCropper from "@/components/ImageCropper/imageCropper";
import { convertCanvasToFile } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";
const SUBMIT = "submit";
const SKIP = "skip";

const UserProfileUploadPage: React.FC = () => {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY || "";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);
  const [triggerPoint, setTriggerPoint] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<any>([]);

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
      router.push(ApplicationURLS.USER_SIGNUP);
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

    // If validations pass, set the image file

    dispatch(setImageFile(convertedCanvasToFile));
    setSelectedImage([]);
  };

  function clickRecaptchaButton(typeOfButton: string) {
    setTriggerPoint(typeOfButton);
    verifyButtonRef?.current?.click();
  }

  async function handleSkipClick() {
    try {
      const details = {
        // created_by: userDetails?.userDetails.email,
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
        toast.success("OTP has been sent to your registered email address");
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
        toast.error("Please select an image file.");
        return; // Stop form submission
      }

      const details = {
        // created_by: userDetails?.userDetails.email,
        // created_on: getCurrentUtcTime(),
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
        dispatch(setUserDetails({ ...userDetails?.userDetails, ...details }));

        if (response) {
          toast.success("OTP has been sent to your registered email address");
          router.push("/user/registration/verification");
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
    // router.push("/user/registration/details");
    router.push("/user/registration/details"); // Send the user back to the previous page
  }

  function handleReCaptchaVerify(token: string) {
    // Handle the reCAPTCHA token verification logic here

    setRecaptchaToken(token);
    // You can send this token to your server for verification or other actions
  }

  function onImageSelection(image: any) {
    // Validate file type
    if (!allowedFileTypes.includes(image.type)) {
      // Show toast message for invalid file type
      // You can use any toast library here, such as react-toastify
      // Example using react-toastify
      dispatch(setImageFile(null));
      toast.error(
        "Invalid file type. Please select a valid image file (JPEG/PNG)."
      );
      return;
    }

    // Validate file size
    if (image.size > maxFileSize) {
      // Show toast message for invalid file size
      // Example using react-toastify
      dispatch(setImageFile(null));

      toast.error(
        "File size exceeds the limit (2MB). Please select a smaller file."
      );
      setSelectedImage([]);
      return;
    }

    setSelectedImage([image]);
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey ?? "UNDEFINED"}>
      <Container fluid>
        <Row>
          <Col className={styles.UploadPageStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <ImageUploader
                title="Adding a photo helps people to recognize you"
                onImageSelect={(image: any) => onImageSelection(image)}
                inputLabelStyles={styles.InputStyles}
                imagePlaceholder=""
                imageStyles={{
                  borderRadius: "50%",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  display: imageFile ? "block" : "none", // Only display the image if imageFile is set
                }}
                // Pass the imageFile to the component to display the image
                image={selectedImage?.length > 0 ? selectedImage[0] : imageFile}
              />
              <p className={styles.InfoTextStyle}>
                Click or drag a file to this area to upload
              </p>
              <div className={styles.ButtonContainerStyles}>
                <FormButton className={styles.buttonStyles} type="submit">
                  Next
                </FormButton>
                <FormButton
                  className={styles.PreviousButtonStyles}
                  type="button"
                  textPlainBtn
                  onClick={handlePreviousClick}
                >
                  Previous
                </FormButton>
                <Button
                  className={styles.SkipButtonStyles}
                  type="button"
                  onClick={() => clickRecaptchaButton(SKIP)}
                >
                  Skip
                </Button>
              </div>
            </Form>
            <ReCaptchaComponent
              onVerify={handleReCaptchaVerify}
              verifyButtonRef={verifyButtonRef}
            />
          </Col>
        </Row>
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
      </Container>
    </GoogleReCaptchaProvider>
  );
};

export default UserProfileUploadPage;
