//default imports
"use client";
//import from reactstrap components
import { Col, Container, Form, Row } from "react-bootstrap";
//import from customized components
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
//import customized styles
import styles from "./VerifyCode.module.scss";
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
//import from constants, interfaces ,functions and services
import {
  triggerForgotPasswordEmail,
  verifyForgotPasswordCode,
} from "@/app/api/LoginServices";
import { AdminLogInUserData } from "@/app/api/adminAPIs/adminAPIs";
import { useAppDispatch } from "@/redux/store";
import { setUserDetails } from "@/redux/slices/dashboardSlices";
import Link from "next/link";
import { useLoaderContext } from "@/context/useLoader";
import { NUMBER_REGEX } from "@/common/constants/general";
import { useState } from "react";
import CryptoJS from "crypto-js";

//module level constants and interfaces
const THREE_MINUTES = 3 * 60 * 1000;
interface FormData {
  code: string;
}

function VerifyCode() {
  //useState and Effect Management
  const { setLoader }: any = useLoaderContext();
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  //other Hooks
  const router = useRouter();
  const dispatch = useAppDispatch();

  //Formik Handling
  const validationSchema = Yup.object().shape({
    code: Yup.string()
      .matches(NUMBER_REGEX, "Only numbers are allowed")
      .min(6, "Enter six digit code")
      .max(6, "Enter six digit code")
      .required("code is required"),
  });

  const formik = useFormik({
    initialValues: {
      code: "",
    },
    validationSchema,
    onSubmit: (values) => handleSubmit(values),
  });

  //functions
  async function handleSubmit(values: FormData) {
    setLoader(true);
    const postData = {
      emailId: getCookie("userMail") ?? "",
      verificationCode: String(values?.code),
    };
    await verifyForgotPasswordCode(postData)
      .then((data: any) => {
        const token = data?.verifyCode?.data?.access_token;
        // setCookie("accessToken", token);
        localStorage.setItem("accessToken", token);
        const decodeTokenData = jwtDecode(token);
        const userDetails: any = JSON.parse(JSON.stringify(decodeTokenData));

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

        dispatch(setUserDetails(userDetails));
        setCookie("userRole", userDetails?.role);
        deleteCookie("userMail");
        router.push("/user/update-password");
      })
      .catch((err: any) => console.log("handleSubmit ~ err:", err))
      .finally(() => setLoader(false));
  }

  async function resendVerificationCode() {
    setDisableResendEmail(true);
    // setLoader(true);
    const postData = {
      emailId: getCookie("userMail") ?? "",
    };
    setTimeout(() => {
      setDisableResendEmail(false);
    }, THREE_MINUTES);
    //trigger api call only if verification email is in enabled state
    if (!disableResendEmail) await triggerForgotPasswordEmail(postData);
  }

  //render Template
  return (
    <Container fluid>
      <Row className={styles.card}>
        <Form onSubmit={formik.handleSubmit}>
          <Col xs={12}>
            <p className={styles.title}>Forgot Password?</p>
          </Col>
          <Col xs={12}>
            <p className={styles.formLabel}>
              Input the code received in your registered email address
            </p>
          </Col>

          <Col xs={12} className="mt-3">
            <TextField
              placeholder="Enter code"
              errorText={formik.errors.code}
              isInvalid={!!(formik.touched.code && formik.errors.code)}
              name="code"
              value={formik.values.code}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              classNames={styles.inputFieldControl}
            />
          </Col>

          <Col xs={12} className="mt-4">
            <FormButton type={"submit"} className={styles.buttonStyles}>
              Verify
            </FormButton>
          </Col>

          <Col xs={12} className="text-center mt-3">
            <div
              className={
                disableResendEmail
                  ? `${styles.navigationLink} ${styles.disabledNavigationLink}`
                  : styles.navigationLink
              }
              onClick={() => resendVerificationCode()}
            >
              Send verification email again
            </div>
          </Col>
          <Col xs={12} className="text-center">
            <Link
              className={styles.navigationLink}
              href={"/user/forgot-password"}
            >
              I have entered an incorrect email address
            </Link>
          </Col>
        </Form>
      </Row>
    </Container>
  );
}

export default VerifyCode;
