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
import {
  DeleteTrustTrainingRecordById,
  getAuthToken,
  insertCompanyDetails,
  multipleFileUploadApi,
  singleUploadApi,
  updateBusinessDetails,
} from "@/network/apolloClient";
import CustomButton from "@/components/CustomButton/CustomButton";
import CryptoJS from "crypto-js";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useTokenDetails } from "@/hooks";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { insertCompanyEmailVerificationDetails } from "@/modules/auth/LoginForm/loginService";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";

export interface FileUploadResponseData {
  attachment_type: string;
  file_path: string;
  file_type: string;
  id: string;
}

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

export default function CompanyVerification() {
  const THREE_MINUTES = 3 * 60 * 1000;

  const [accessTokenId, setAccessTokenId] = useState<string>("");
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loader, setLoader }: any = useLoaderContext();
  const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    // Get access token from local storage
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setAccessTokenId(accessToken);
    }
  }, []);

  const router = useRouter();
  const dispatch = useAppDispatch();

  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails?.companyDetails
  );

  useEffect(() => {
    if (_.isEmpty(companyDetails)) {
      router.push(AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE);
    }
  }, [companyDetails]);

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
        verification_code: values.Verification,
        region: companyDetails.region,
        qbcc_number: companyDetails.Qbccno,
        place_id: companyDetails.place_id,
        mail_type: "Verify_Company",
        longitude: String(companyDetails.longitude),
        latitude: String(companyDetails.latitude),
        is_verified: false,
        entity_type: companyDetails.EntityType,
        email_id: companyDetails.email_id,
        country: companyDetails.country,
        company_phone_no: companyDetails.PhoneNumber,
        company_name: companyDetails.Name,
        company_email_id: companyDetails?.Email,
        company_address: companyDetails?.fullAddress,
        abn_number: companyDetails.values?.ABN,
        acn_number: companyDetails?.values?.ACN,
        tfn_number: companyDetails?.values?.TFN,
        legal_company_name: companyDetails?.legalname,
      };
      try {
        // Call the function to insert email verification details
        const response = await insertCompanyDetails(Entiredetails);

        // Handle the response as needed

        if (response?.company_id) {
          const token = response?.company_id;

          // Fetch new token
          const isAdmin = false;

          const newToken: any = await getAuthToken(
            decodeTokenData?.emailId,
            isAdmin
          );
          localStorage.setItem("accessToken", newToken);
          const decodeTokensData: CustomJwtPayload = jwtDecode(newToken);
          const userDetails = JSON.parse(JSON.stringify(decodeTokensData));
          //changes for cookie storage issue
          const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
            JSON.stringify({
              role: userDetails?.role,
              status: userDetails?.status,
              id: userDetails?.id,
              userName: userDetails?.userName,
              userFirstName: userDetails?.userFirstName,
              userLastName: userDetails?.userLastName,
              emailId: userDetails?.emailId,
              isAdmin: userDetails?.isAdmin,
              timezone: userDetails?.timezone,
              iat: userDetails?.iat,
              exp: userDetails?.exp,
            }),
            "token-verification"
          ).toString();

          setCookie("accessVerification", userTokenDetailsForMiddleware);
          // setCookie("accessToken", newToken);

          // Handle the response as needed

          const expirationTime = 23 * 60 * 60; //23hours
          const tokenExpired = setInterval(() => {
            localStorage.clear();
            dispatch(setCompanyDetails({}));
            router.replace("/");
            clearInterval(tokenExpired);
          }, expirationTime * 1000);
          if (imageFile) {
            let userData = {
              company_id: response?.company_id,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Company_logo",
            };
            const fileResponse = await singleUploadApi(
              imageFile,
              userData,
              newToken
            );
          }
        }
        if (response) {
          toast.success("This Business has been added.");
          localStorage.setItem("userMode", "Normal");
          setCookie("userMode", "Normal");
          // You can perform other actions or navigate based on the response
          router.push(AppRoutes.USER_REGISTRATION_SELECT_PROFILE);
        }
      } catch (error) {
        // Handle errors
        console.error("Error in insertCompanyDetails company:", error);
      } finally {
        setLoader(false);
        setIsSubmitting(false);
      }
    },
  });

  const resendEmailVerificationCode = async () => {
    try {
      setDisableResendEmail(true);
      // Decode the access token to get user information
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        const decodedToken: any = jwtDecode(accessToken);
        const userId = decodedToken.user_id;

        // Prepare the data object to be passed to the service
        const data = {
          user_id: userId,
          first_name: decodedToken?.userFirstName,
          last_name: decodedToken?.userLastName,
          email_id: decodedToken?.emailId,
          company_name: companyDetails?.Name,
          company_email_id: companyDetails?.Email,
          type: "Resend",
          mail_type: "Verify_Company",
          verification_code: formik.values.Verification,
        };
        setTimeout(() => {
          setDisableResendEmail(false);
        }, THREE_MINUTES);
        if (!disableResendEmail) {
          // Call the insertEmailVerificationDetails function with the prepared data
          const response = await insertCompanyEmailVerificationDetails(data);

          // Handle response as needed
          if (response) {
            toast.success(
              "Please use OTP received in email to verify your business"
            );
          }
        } else {
          console.error("Access token not found.");
          // Handle the case where the access token is not available
        }
      }
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
              We just sent you a code to{" "}
              <u>{companyDetails?.Email || companyDetails?.values?.Email} </u>
              to verify your mail
            </h4>
            <p>
              If you didn’t receive an email, please check your spam folder.
            </p>
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
                actionType="submit"
                onClick={() => {
                  router.push(AppRoutes.USER_TAX);
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
                  router.push(AppRoutes.USER_CONTACT_BUSINESS); // Redirect to the desired page
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
