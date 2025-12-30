"use client";

import React, { useEffect, useState } from "react";
import styles from "./companyVerification.module.scss";
import { Row, Col, Form, Container } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";

import { useFormik } from "formik";
import * as Yup from "yup";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  getAuthToken,
  insertCompanyDetails,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { insertCompanyEmailVerificationDetails } from "@/app/api/LoginServices";
import { getCookie, setCookie } from "cookies-next";
import { useLoaderContext } from "@/context/useLoader";
import Link from "next/link";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { toast } from "react-toastify";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";
import { useTokenDetails } from "@/common/commonHooks";
import { CustomJwtPayload } from "../userLogin/userLoginPage";
import CryptoJS from "crypto-js";

const validationSchema = Yup.object().shape({
  Verification: Yup.string()
    .required("Please provide a verification code")
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
});

const CompanyVerificationPage = () => {
  const THREE_MINUTES = 3 * 60 * 1000;

  const [accessTokenId, setAccessTokenId] = useState<string>("");
  const [disableResendEmail, setDisableResendEmail] = useState(false);
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
      router.push(ApplicationURLS.USER_BUSINESS_REGISTRATIONPAGE);
    }
  }, [companyDetails]);

  const formik = useFormik({
    initialValues: {
      Verification: "",
    },
    validationSchema,
    onSubmit: async (values) => {
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
        entity_type: companyDetails.EntityType?.value,
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
          // You can perform other actions or navigate based on the response
          router.push("/user/select-profile");
        }
      } catch (error) {
        // Handle errors
        console.error("Error in insertCompanyDetails company:", error);
      } finally {
        setLoader(false); // Ensure that the loader is always set to false
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

  const handlePreviousClick = () => {
    router.back();
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <div className={styles.title}>We just sent you a code to</div>
              <span className={styles.RegisterEmail}>
                {companyDetails?.Email}
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
                  onChange={formik.handleChange}
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
              <FormButton
                className={styles.PreviousButtonStyles}
                type="button"
                onClick={handlePreviousClick}
                textPlainBtn
              >
                Previous
              </FormButton>
            </Form>
            <div
              className={
                disableResendEmail
                  ? `${styles.navigationLink} ${styles.disabledNavigationLink}`
                  : styles.navigationLink
              }
              onClick={() => resendEmailVerificationCode()}
            >
              Send verification email again
            </div>
            <Link
              className={styles.TurquoiseTitle}
              href={"/user/registration/contact-business"}
            >
              I have entered an incorrect email address
            </Link>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CompanyVerificationPage;
