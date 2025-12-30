//default imports
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
//import from reactstrap components
import { Row, Col, Container, Button } from "react-bootstrap";
//import from customized components
import OtpInput from "react-otp-input";
//import customized styles
import customStyles from "./authenticateEmail.module.scss";
import FormButton from "@/components/Button/button";
import { jwtDecode } from "jwt-decode";
import { deleteCookie, getCookie } from "cookies-next";
import { resendCode, verifyEmailCode } from "./authenticateEmail.function";
import { ApplicationURLS } from "@/common/applicationURLS";
import { getCurrentUtcTime } from "@/common/commonFunctions";
const THREE_MINUTES = 3 * 60 * 1000;

function AuthenticateEmail() {
  //useState and useEffect Management
  const [otp, setOtp] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  //other Hooks
  const router = useRouter();

  //functions
  function validateInput(otpValue: string) {
    setOtp(otpValue);
    if (otpValue?.length <= 5) {
      setIsValidationError(true);
      return false;
    } else {
      setIsValidationError(false);
      return true;
    }
  }

  async function handleSubmit(otpValue: string) {
    if (!validateInput(otpValue)) {
      return;
    }
    // Extract the authentication token from cookies
    const authToken = localStorage.getItem("accessToken");
    const updatedEmail = getCookie("updatedMail");

    // Decrypt the authentication token
    const decryptedToken: any = authToken ? jwtDecode(authToken) : "";

    const postData: any = {
      emailId: decryptedToken?.emailId,
      verificationCode: otpValue,
      newEmailId: updatedEmail,
    };

    await verifyEmailCode(postData).then((response: any) => {
      if (response) {
        deleteCookie("updatedMail");
        router.push(ApplicationURLS.USER_SIGN_IN_AND_SECURITY);
      }
    });
  }

  async function triggerResendCode() {
    setDisableResendEmail(true);
    setTimeout(() => {
      setDisableResendEmail(false);
    }, THREE_MINUTES);

    // Extract the authentication token from cookies
    const authToken = localStorage.getItem("accessToken");
    const updatedEmail = getCookie("updatedMail");
    // Decrypt the authentication token
    const decryptedToken: any = authToken ? jwtDecode(authToken) : "";

    const postData: any = {
      createEmailVerificationInput: {
        first_name: decryptedToken?.userFirstName,
        last_name: decryptedToken?.userLastName,
        email_id: updatedEmail,
        type: "Resend",
        mail_type: "Verify_User",
      },
    };
    if (!disableResendEmail) resendCode(postData);
  }

  //render Template
  return (
    <Container fluid>
      <Row className="justify-content-center mt-5">
        <Col className={customStyles.card}>
          <h5 className={customStyles.title}>Authenticate Email</h5>
          <div className={customStyles.subHeading}>
            We have sent you an email with a 6 digit code. Please enter this
            below
          </div>
          <OtpInput
            value={otp}
            onChange={(value: string) => validateInput(value)}
            numInputs={6}
            renderSeparator={<span> </span>}
            renderInput={(props) => <input {...props} />}
            inputStyle={
              isValidationError
                ? `${customStyles.inputStyle} ${customStyles.error}`
                : customStyles.inputStyle
            }
          />
          <FormButton
            className={customStyles.buttonStyles}
            onClick={() => handleSubmit(otp)}
          >
            Authenticate
          </FormButton>
          <Button className="cancel-button mt-3" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            className="cancel-button mt-3"
            onClick={() => triggerResendCode()}
            disabled={disableResendEmail}
          >
            Re-send code
          </Button>
        </Col>
      </Row>
    </Container>
  );
}

export default AuthenticateEmail;
