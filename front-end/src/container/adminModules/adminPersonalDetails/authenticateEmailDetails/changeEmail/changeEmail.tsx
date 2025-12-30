"use client";
import React, { useState } from "react";
import { useRouter as useNavigation } from "next/navigation";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import { XCircle } from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import customStyles from "./changeEmail.module.scss";
import commonStyles from "./../../../../../common/commonStyles.module.scss";
import { useFormik } from "formik";
import * as Yup from "yup";

import { EMAIL_REGEX } from "@/common/constants/general";
import { InsertAdminEmailVerificationDetails } from "./changeEmail.function";
import { CheckAdminExistence } from "@/app/api/existanceAPIsCheck";
import { useTokenDetails } from "@/common/commonHooks";

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email("Please enter a valid email address")
    .matches(EMAIL_REGEX, "Invalid email format")
    .required("Email address is required"),

  confirmEmail: Yup.string()
    .email("Please enter a valid email address")
    .matches(EMAIL_REGEX, "Invalid email format")
    .required("Confirm email address is required")
    .oneOf([Yup.ref("email")], "Emails address doesn't match"),
});

function ChangeEmail(props: any) {
  const { setNewEmailId, setViewScreenType } = props;
  const [emailExist, setEmailExist] = useState(false);
  const router: any = useNavigation();
  const { decodeTokenData } = useTokenDetails();

  const formik = useFormik({
    initialValues: {
      email: "",
      confirmEmail: "",
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  //Functions
  async function checkEmailExistence(email: any) {
    try {
      setEmailExist(false);
      formik?.setFieldValue("email", email);
      const userExistenceData: any = await CheckAdminExistence(email);
      setEmailExist(userExistenceData);
      return userExistenceData;
    } catch (error) {
      console.error("Error while checking user by email ID:", error);
      return false;
    }
  }

  async function handleSubmit() {
    if (formik.values.email) {
      const postData: any = {
        createAdminEmailVerificationInput: {
          email_id: formik.values.email,
          type: "Send",
          id: decodeTokenData?.id,
        },
      };

      await InsertAdminEmailVerificationDetails(postData).then(
        (response: any) => {
          if (response) {
            // setCookie("updatedMail", formik.values.email);
            // router.push(ApplicationURLS.USER_AUTHENTICATE_EMAIL);
            setViewScreenType("codeScreen");
            setNewEmailId(formik.values.email);
          }
        }
      );
    }
  }

  //Render Template
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col className={customStyles.card}>
          <Form
            className={customStyles.formStyles}
            onSubmit={formik.handleSubmit}
          >
            <h5 className={customStyles.title}>Email address</h5>
            <div className={customStyles.subHeading}>
              We&apos;ll use this email to help you sign in if you forget your
              password
            </div>
            <div className={customStyles.textFieldStyles}>
              <TextField
                labelText="New email address *"
                name="email"
                id="email"
                placeholder="Enter email"
                value={formik.values.email}
                onChange={(e) => checkEmailExistence(e?.target?.value)}
                onBlur={formik.handleBlur}
                errorText={
                  emailExist
                    ? "This email address is taken"
                    : formik.errors.email
                }
                autoCorrect="a"
                isInvalid={
                  !!(
                    formik.touched.email &&
                    (emailExist || formik.errors.email)
                  )
                }
                endingData={
                  formik.touched.email &&
                  (emailExist || formik.errors.email) && (
                    <XCircle className={customStyles.error} />
                  )
                }
                endingDataStyles={customStyles.endIconStyle}
                classNames={commonStyles.inputFieldControl}
              />
            </div>

            <div className={customStyles.textFieldStyles}>
              <TextField
                labelText="Confirm email address *"
                name="confirmEmail"
                id="confirmEmail"
                placeholder="Enter confirm email address"
                value={formik.values.confirmEmail}
                onChange={(e) =>
                  formik.setFieldValue("confirmEmail", e.target.value)
                }
                onBlur={formik.handleBlur}
                errorText={formik.errors.confirmEmail}
                isInvalid={
                  !!(formik.touched.confirmEmail && formik.errors.confirmEmail)
                }
                endingData={
                  formik.touched.confirmEmail &&
                  formik.errors.confirmEmail && (
                    <XCircle className={customStyles.error} />
                  )
                }
                endingDataStyles={customStyles.endIconStyle}
                classNames={commonStyles.inputFieldControl}
              />
            </div>
            <FormButton className={customStyles.buttonStyles} type="submit">
              Save
            </FormButton>
            <Button
              className="cancel-button mt-3"
              onClick={() => router.back()}
            >
              Close
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default ChangeEmail;
