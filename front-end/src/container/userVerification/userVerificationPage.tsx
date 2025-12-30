"use client";

import React, { useEffect, useState } from "react";
import styles from "./userVerificationPage.module.scss";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";

import { useFormik } from "formik";
import * as Yup from "yup";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { insertUserDetails } from "@/app/api/RegistrationServices";
import { JwtPayload, jwtDecode } from "jwt-decode";
import { setUserDetails } from "@/redux/slices/userRegistrationDetails";
import {
  insertEmailVerificationDetails,
  insertIncorrectEmailVerificationDetails,
} from "@/app/api/LoginServices";
import { getCookie } from "cookies-next";
import { useLoaderContext } from "@/context/useLoader";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { toast } from "@/app/Toaster";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { checkCompanyInviteAndUpdate } from "@/app/api/CompanyRegistrationServices";
import { setImageFile } from "@/redux/slices/imageUploadSlice";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";
import CryptoJS from "crypto-js";

// Define an interface that extends JwtPayload
interface CustomJwtPayload extends JwtPayload {
  userId: string; // Define your custom property here
  companySpecificRoles?: any;
}

const validationSchema = Yup.object().shape({
  Verification: Yup.string()
    .required("Please provide a verification code")
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
});

const UserVerificationPage = () => {
  const THREE_MINUTES = 3 * 60 * 1000;

  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

  const { loader, setLoader }: any = useLoaderContext();

  useEffect(() => {
    if (_.isEmpty(userDetails) || _.isEmpty(userDetails?.userDetails)) {
      router.push(ApplicationURLS.USER_SIGNUP);
    }
  }, [userDetails]);

  const formik = useFormik({
    initialValues: {
      Verification: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoader(true);
      const Entiredetails = {
        first_name: userDetails?.userDetails.FirstName,
        last_name: userDetails?.userDetails.LastName,
        email_id: userDetails?.userDetails.Email,
        position_title: userDetails?.userDetails.Position,
        occupation: userDetails?.userDetails.Occupation,
        company_name: userDetails?.userDetails.Company,
        user_address: userDetails?.userDetails.fullAddress,
        country: userDetails?.userDetails.country,
        user_phone_no: userDetails?.userDetails.PhoneNumber,
        password: userDetails?.userDetails.Password,
        latitude: String(userDetails?.userDetails.latitude),
        longitude: String(userDetails?.userDetails.longitude),
        place_id: userDetails?.userDetails.place_id,
        region: userDetails?.userDetails.region,
        is_verified: false,
        verification_code: values.Verification,
        mail_type: "Verify_User",
        user_status: "Pending",
      };
      try {
        // Call the function to insert email verification details
        const response = await insertUserDetails(Entiredetails);
        // Handle the response as needed

        if (response) {
          const token = response;

          // Decode the access token
          const decodedToken: CustomJwtPayload = jwtDecode(token);
          const companySpecificRoles = decodedToken?.companySpecificRoles;

          if (companySpecificRoles && companySpecificRoles.length > 0) {
            const userPrivilage = companySpecificRoles.find(
              (data: any) => data?.isSystemAdded === true
            );
            if (userPrivilage) {
              localStorage.setItem("UserCompanyId", userPrivilage?.companyId);
              setCookie("UserCompanyId", userPrivilage?.companyId);
            }
          }
          const decodeTokensData: CustomJwtPayload = jwtDecode(token);

          localStorage.setItem("accessToken", token);

          const userDetailsRes = JSON.parse(JSON.stringify(decodeTokensData));
          //changes for cookie storage issue
          const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
            JSON.stringify({
              role: userDetailsRes?.role,
              status: userDetailsRes?.status,
              id: userDetailsRes?.id,
              userName: userDetailsRes?.userName,
              userFirstName: userDetailsRes?.userFirstName,
              userLastName: userDetailsRes?.userLastName,
              emailId: userDetailsRes?.emailId,
              isAdmin: userDetailsRes?.isAdmin,
              timezone: userDetailsRes?.timezone,
              iat: userDetailsRes?.iat,
              exp: userDetailsRes?.exp,
            }),
            "token-verification"
          ).toString();

          setCookie("accessVerification", userTokenDetailsForMiddleware);

          // setCookie("accessToken", token, { maxAge: userDetails.exp });

          // Set the userId from decoded token
          const userId = decodedToken.userId;

          // Perform the file upload if imageFile exists
          if (imageFile) {
            let userData = {
              user_id: userId,
              uploaded_by: userDetails.userDetails.Email,
              attachment_type: "User_profile",
            };

            const fileResponse = await singleUploadApi(
              imageFile,
              userData,
              token
            );
          }

          // Call the checkCompanyInviteAndUpdate function
          try {
            const companyInviteResponse = await checkCompanyInviteAndUpdate();

            // Handle the response as needed
          } catch (error) {
            // Handle errors from checkCompanyInviteAndUpdate function
            console.error("Error in checkCompanyInviteAndUpdate:", error);
            // You may want to display an error message to the user
          }
          dispatch(setImageFile(null));
          router.push("/user/registration/business-profile");
        }
        // You can perform other actions or navigate based on the response
      } catch (error) {
        // Handle errors
        console.error("Error in insertUserDetails:", error);
        // You may want to display an error message to the user
      } finally {
        setLoader(false); // Ensure that the loader is always set to false
      }
    },
  });

  const handlePreviousClick = () => {
    router.push("/user/registration/profile-upload");
  };

  const resendEmailVerificationCode = async () => {
    try {
      setDisableResendEmail(true);
      // Prepare the data object to be passed to the service
      const data = {
        first_name: userDetails?.userDetails.FirstName,
        email_id: userDetails?.userDetails.Email,
        type: "Resend",
        mail_type: "Verify_User",
        // created_by: userDetails?.userDetails.Email,
        // created_on: new Date().toISOString().slice(0, 19).replace("T", " "),
        verification_code: formik.values.Verification,
      };
      setTimeout(() => {
        setDisableResendEmail(false);
      }, THREE_MINUTES);
      if (!disableResendEmail) {
        // Call the insertEmailVerificationDetails function with the prepared data
        const response = await insertEmailVerificationDetails(data);

        // Handle response as needed
        if (response) {
          toast.success("OTP has been resent to your registered email address");
        }
      }
    } catch (error) {
      // Handle errors
      console.error("Error inserting email verification details:", error);
      // Show error message or handle as needed
    }
  };

  const handleIncorrectEmailAddress = async () => {
    try {
      // Prepare the data object to be passed to the service
      const data = {
        old_email_id: userDetails?.userDetails.Email, // Replace with the appropriate old email id
      };
      // Call the insertEmailVerificationDetails function with the prepared data
      const response = await insertIncorrectEmailVerificationDetails(data);

      // Handle response as needed
    } catch (error) {
      // Handle errors
      console.error("Error inserting email verification details:", error);
      // Show error message or handle as needed
    }
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <div className={styles.title}>We just sent you a code to </div>{" "}
              <span className={styles.RegisterEmail}>
                {userDetails?.userDetails.Email}
              </span>
              <span className={styles.title1}>to verify your email</span>
              <p className={styles.InfoTextStyle}>
                If you didn&rsquo;t receive an email, please check your spam
                folder.
              </p>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="Please enter the code:"
                  name="Verification"
                  id="Verification"
                  maxLength={6}
                  value={formik.values.Verification}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "Verification",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Verification && formik.errors.Verification
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Verification && formik.errors.Verification ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Verification}
                  </div>
                ) : null}
              </div>
              <FormButton
                className={styles.buttonStyles}
                type="submit"
                disabled={loader}
              >
                Verify
              </FormButton>
              <Button
                className={styles.PreviousButtonStyles}
                type="button"
                onClick={handlePreviousClick}
              >
                Previous
              </Button>
            </Form>
            <div
              className={
                disableResendEmail
                  ? `${styles.navigationLink} ${styles.disabledNavigationLink}`
                  : styles.navigationLink
              }
              onClick={() => resendEmailVerificationCode()}
              // style={{ cursor: disableResendEmail ? "not-allowed" : "pointer" }}
            >
              Send verification email again
            </div>
            <Link
              className={styles.TurquoiseTitle}
              href={""}
              // onClick={handleIncorrectEmailAddress}
              onClick={(e) => {
                e.preventDefault(); // Prevent default behavior of the link
                handleIncorrectEmailAddress(); // Call your function
                router.push("/user/registration/signup"); // Redirect to the desired page
              }}
            >
              I have entered an incorrect email address
            </Link>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserVerificationPage;
