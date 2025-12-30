"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, Container, Button } from "react-bootstrap";
import OtpInput from "react-otp-input";
import customStyles from "./authenticateEmail.module.scss";
import FormButton from "@/components/Button/button";
import { VerifyAdminCode } from "./authenticateEmail.function";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useTokenDetails } from "@/common/commonHooks";
import { InsertAdminEmailVerificationDetails } from "../changeEmail/changeEmail.function";
const THREE_MINUTES = 3 * 60 * 1000;

function AuthenticateEmail(props: any) {
  const { setViewScreenType, newEmailID } = props;
  const [otp, setOtp] = useState("");
  const [isValidationError, setIsValidationError] = useState(false);
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();

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

    const postData: any = {
      verificationCode: otpValue,
      newEmailId: newEmailID,
    };

    await VerifyAdminCode(postData).then((response: any) => {
      if (response) {
        router.push(ApplicationURLS.ADMIN_SIGN_IN_AND_SECURITY);
      }
    });
  }

  async function triggerResendCode() {
    setDisableResendEmail(true);
    setTimeout(() => {
      setDisableResendEmail(false);
    }, THREE_MINUTES);

    const postData: any = {
      createAdminEmailVerificationInput: {
        email_id: newEmailID,
        type: "Send",
        id: decodeTokenData?.id,
      },
    };
    if (!disableResendEmail) InsertAdminEmailVerificationDetails(postData);
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
