"use client";

import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useEffect, useState } from "react";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { useLoaderContext } from "@/context/useLoader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import _ from "lodash";
import { setCookie } from "cookies-next";
import { setImageFile } from "@/redux/slices/imageUploadSlice";
import {
  checkCompanyInviteAndUpdate,
  insertIncorrectEmailVerificationDetails,
  insertUserDetails,
  singleUploadApi,
} from "@/network/apolloClient";
import { showSuccessToast } from "@/components/Toaster";
import CustomButton from "@/components/CustomButton/CustomButton";
import CryptoJS from "crypto-js";
import { insertEmailVerificationDetails } from "@/network/existanceAPIsCheck";

interface PageProps {
  nextRoute: string;
  previousRoute: string;
}

interface CustomJwtPayload extends JwtPayload {
  userId: string; // Define your custom property here
  companySpecificRoles?: any;
}

const validationSchema = Yup.object().shape({
  Verification: Yup.string()
    .required("Please provide a verification code")
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
});

export default function RegistrationVerificationForms() {
  const THREE_MINUTES = 3 * 60 * 1000;

  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loader, setLoader }: any = useLoaderContext();

  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

  // const { loader, setLoader }: any = useLoaderContext();

  useEffect(() => {
    if (_.isEmpty(userDetails) || _.isEmpty(userDetails?.userDetails)) {
      router.push(AppRoutes.USER_SIGNUP);
    }
  }, [userDetails]);

  const formik = useFormik({
    initialValues: {
      Verification: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      if (isSubmitting) return; // Prevent multiple submissions
      setIsSubmitting(true);
      setLoader(true);
      const Entiredetails = {
        first_name: userDetails?.userDetails.FirstName,
        last_name: userDetails?.userDetails.LastName,
        email_id: userDetails?.userDetails.email,
        position_title: userDetails?.userDetails.Position,
        occupation: userDetails?.userDetails.Occupation,
        company_name: userDetails?.userDetails.Company,
        user_address: userDetails?.userDetails.fullAddress,
        country: userDetails?.userDetails.country,
        user_phone_no: userDetails?.userDetails.PhoneNumber,
        password: userDetails?.userDetails.password,
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
              uploaded_by: userDetails.userDetails.email,
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
          router.push(AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE);
        }
        // You can perform other actions or navigate based on the response
      } catch (error) {
        // Handle errors
        console.error("Error in insertUserDetails:", error);
        // You may want to display an error message to the user
      } finally {
        setLoader(false);
        setIsSubmitting(false);
      }
    },
  });

  const resendEmailVerificationCode = async () => {
    try {
      setDisableResendEmail(true);
      // Prepare the data object to be passed to the service
      const data = {
        first_name: userDetails?.userDetails.FirstName,
        email_id: userDetails?.userDetails.email,
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
          showSuccessToast(
            "OTP has been resent to your registered email address"
          );
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
        old_email_id: userDetails?.userDetails.email, // Replace with the appropriate old email id
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
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="pt_login">
            <h4>
              We just sent you a code to <u>{userDetails?.userDetails.email}</u>{" "}
              to verify your mail
            </h4>
            <p>
              If you didn’t receive an email, please check your spam folder.
            </p>

            <br />
            <br />
            <FormikControl
              control={InputType.TEXT_FIELD}
              label={"Please enter the code:"}
              name={"email"}
              value={formik.values.Verification}
              placeholder={""}
              required={true}
              error={formik.errors.Verification}
              showError={
                formik.touched.Verification && formik.errors.Verification
              }
              maxLength={6}
              disableAutoComplete={true}
              onChange={(e: any) =>
                formik.setFieldValue(
                  "Verification",
                  e.target.value.trim() ? e.target.value : e.target.value.trim()
                )
              }
              onBlur={formik.handleBlur}
            ></FormikControl>

            <br />
            <br />
            <div className="button-container">
              <CustomButton
                buttonName={"Previous"}
                buttonType={buttonType.OUTLINE_CONTRAST}
                actionType="button"
                onClick={() => {
                  router.push(AppRoutes.USER_PROFILE_UPLOAD);
                }}
                inputButton
              />
              <CustomButton
                buttonName={"Next"}
                buttonType={buttonType.SECONDARY}
                actionType="submit"
                onClick={formik.handleSubmit}
                inputButton
                disabled={isSubmitting} // Prevent multiple clicks
              />
            </div>
          </div>
          <div className="text_center">
            <p>
              <a
                href="#"
                className={
                  disableResendEmail
                    ? `${"contrast"} ${"disabledNavigationLink"}`
                    : "contrast"
                }
                onClick={() => resendEmailVerificationCode()}
              >
                Send verification email again
              </a>
            </p>
            <p>
              <a
                href="#"
                className="contrast"
                onClick={(e) => {
                  e.preventDefault(); // Prevent default behavior of the link
                  handleIncorrectEmailAddress(); // Call your function
                  router.push(AppRoutes.USER_SIGNUP); // Redirect to the desired page
                }}
              >
                I have entered an incorrect email address
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
