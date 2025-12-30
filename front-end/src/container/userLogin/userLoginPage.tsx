"use client";

import React, { useEffect, useState } from "react";
import { Row, Col, Form, Container } from "react-bootstrap";
import styles from "./userLoginPage.module.scss";
import CheckBox from "@/components/CheckBox/checkBox";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { Eye } from "react-bootstrap-icons";
import { EyeSlash } from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { loginByEmailId } from "../../app/api/LoginServices";
import { JwtPayload, jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { ApplicationURLS } from "@/common/applicationURLS";
import CryptoJS from "crypto-js";
import { setCompanyId } from "@/redux/slices/companyDetails";

export interface CustomJwtPayload extends JwtPayload {
  userId: string; // Define your custom property here
  companySpecificRoles?: any;
}

const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  Password: Yup.string().required("Password is required"),
  rememberMe: Yup.boolean(),
});

const UserLoginPage = () => {
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryParams = useSearchParams();
  const dispatch = useAppDispatch();

  const ImportCompanyId: any = queryParams.get("company_id");

  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );
  const blogDetailsForRouting: any = useAppSelector(
    (state: RootState) => state.dashBoard.blogDetailsForRouting
  );
  const router = useRouter();

  useEffect(() => {
    const savedCredentials = localStorage.getItem("credentials");
    if (savedCredentials) {
      const decryptedData = JSON.parse(
        CryptoJS.AES.decrypt(savedCredentials, "secret-key").toString(
          CryptoJS.enc.Utf8
        )
      );
      formik.setFieldValue("Email", decryptedData.Email);
      formik.setFieldValue("Password", decryptedData.Password);
      formik.setFieldValue("rememberMe", true);
    }
  }, []);

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  const formik = useFormik({
    initialValues: {
      Email: userDetails?.userDetails?.Email || "",
      Password: "",
      rememberMe: false,
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        // Call the login service on form submission
        const response = await loginByEmailId(
          values.Email,
          values.Password,
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );

        if (response?.data?.access_token) {
          const token = response?.data?.access_token;
          localStorage.setItem("accessToken", token);
          localStorage.setItem("userMode", "Normal");
          setCookie("userMode", "Normal");
          localStorage.setItem("ProfileType", "User");
          setCookie("ProfileType", "User");

          const decodeTokenData: CustomJwtPayload = jwtDecode(token);
          const companySpecificRoles = decodeTokenData?.companySpecificRoles;

          if (companySpecificRoles && companySpecificRoles.length > 0) {
            const userPrivilage = companySpecificRoles.find(
              (data: any) => data?.isSystemAdded === true
            );
            if (userPrivilage) {
              localStorage.setItem("UserCompanyId", userPrivilage?.companyId);
              setCookie("UserCompanyId", userPrivilage?.companyId);
            }
          }
          const userDetailsRes = JSON.parse(JSON.stringify(decodeTokenData));

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

          // const expireTime: any = new Date(userDetails.exp * 1000);
          // const currentTime: any = new Date(); // Current time in seconds
          // const timeDiff = expireTime - currentTime; // Remaining time until expiration in seconds

          // setCookie("accessToken", token);

          // Save credentials if remember me is checked
          if (values.rememberMe) {
            const encryptedData = CryptoJS.AES.encrypt(
              JSON.stringify({
                Email: values.Email,
                Password: values.Password,
              }),
              "secret-key"
            ).toString();
            localStorage.setItem("credentials", encryptedData);
          } else {
            localStorage.removeItem("credentials");
          }

          // Clear the company ID from local storage
          localStorage.removeItem("companyId");
          deleteCookie("companyId");

          // Check if redirectAfterLogin cookie exists
          const redirectAfterLogin = getCookie("redirectAfterLogin");
          console.log(
            "🚀 ~ onSubmit: ~ redirectAfterLogin:",
            redirectAfterLogin
          );

          if (redirectAfterLogin) {
            console.log("jbjhbn");
            // Redirect to the URL stored in the cookie
            router.push(redirectAfterLogin as string);
            // Check if isSystemAdded is true and set the ProfileType accordingly
            const userPrivilage = companySpecificRoles?.find(
              (role: any) => role.companyId === Number(ImportCompanyId)
            );

            if (userPrivilage?.isSystemAdded === true) {
              // If isSystemAdded is true, set profile type to "User"
              localStorage.setItem("ProfileType", "User");
              setCookie("ProfileType", "User");
            } else {
              // Otherwise, set profile type to "Business"
              localStorage.setItem("ProfileType", "Business");
              setCookie("ProfileType", "Business");
            }

            // If company is found, set necessary data in storage and cookies
            localStorage.setItem("companyId", ImportCompanyId);
            dispatch(setCompanyId(ImportCompanyId));
            setCookie("companyId", ImportCompanyId);
            return;
          }
          if (blogDetailsForRouting?.blogResource?.id) {
            setCookie("blogId", blogDetailsForRouting?.blogResource?.id);
            router.push(
              `${ApplicationURLS.USER_BLOG_RECOMMENDED}${blogDetailsForRouting?.blogResource?.id}`
            );
            return;
          }
          if (
            Array.isArray(userDetailsRes?.companySpecificRoles) &&
            userDetailsRes?.companySpecificRoles?.length === 0
          ) {
            // Redirect to the dashboard if companySpecificRoles is null or empty
            router.push("/user/dashboard");
          } else {
            // Redirect to choose profile if companySpecificRoles is not null
            router.push("/user/choose-profile");
          }
        }
      } catch (error) {
        console.error("Login failed:", error);
        // Handle other errors if needed
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Sign In</h5>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  labelText="Email *"
                  name="Email"
                  id="Email"
                  autoComplete="on"
                  value={formik.values.Email}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "Email",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Email && formik.errors.Email
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Email &&
                formik.errors.Email &&
                typeof formik.errors.Email === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Email}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <div className={styles.passwordInputWrapper}>
                  <TextField
                    type={isPWDShow ? "text" : "password"}
                    labelText="Password *"
                    name="Password"
                    id="Password"
                    value={formik.values.Password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    endingData={
                      isPWDShow ? (
                        <Eye
                          className={styles.eyeIconStyle}
                          onClick={togglePasswordVisibility}
                        />
                      ) : (
                        <EyeSlash
                          className={styles.eyeIconStyle}
                          onClick={togglePasswordVisibility}
                        />
                      )
                    }
                    endingDataStyles={styles.endIconStyle}
                    className={
                      formik.touched.Password && formik.errors.Password
                        ? `${styles.inputFieldControl} ${styles.inputError}`
                        : styles.inputFieldControl
                    }
                  />
                  {formik.touched.Password && formik.errors.Password ? (
                    <div className={styles.errorText}>
                      <ExclamationTriangleFill className={styles.icon} />
                      {formik.errors.Password}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={styles.subBoxContainer}>
                <Link
                  className={styles.forgotTextStyle}
                  href={ApplicationURLS.USER_FORGOT_PASSWORD}
                >
                  Forgot Password?
                </Link>
                <CheckBox
                  label="Remember me"
                  id="rememberMe"
                  checked={formik.values.rememberMe}
                  onChange={(e) => {
                    formik.setFieldValue("rememberMe", e.target.checked);
                  }}
                />
              </div>
              <FormButton
                className={styles.buttonStyles}
                type="submit"
                disabled={loading}
              >
                Sign In
              </FormButton>
              <div className={styles.footerText}>
                By clicking Sign In, you agree to the Pay Trade
                <Link
                  className={`${styles.TurquoiseTitle} ${styles.linkStyles}`}
                  href={"/terms-and-conditions"}
                >
                  {" "}
                  User Agreement
                </Link>
                ,
                <Link
                  className={`${styles.TurquoiseTitle} ${styles.linkStyles}`}
                  href={"/privacy-policy"}
                >
                  {""} Privacy {""}
                </Link>
                and
                <Link
                  className={`${styles.TurquoiseTitle} ${styles.linkStyles}`}
                  href={"/cookies-policy"}
                >
                  {""} Cookie Policy
                </Link>
                .
              </div>
              <div className={styles.footerText}>
                New to Pay Trade?{" "}
                <a
                  href="/user/registration/signup"
                  className={styles.TurquoiseTitle}
                >
                  Create an account
                </a>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserLoginPage;
