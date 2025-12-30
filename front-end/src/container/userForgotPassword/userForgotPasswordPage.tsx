"use client";

import React, { useState } from "react";
import { Row, Col, Form, Container } from "react-bootstrap";
import styles from "./userForgotPasswordPage.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { Eye } from "react-bootstrap-icons";
import { EyeSlash } from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Invalid email format"
    )
    .required("Please enter a valid email address"),
  Password: Yup.string().required("Please provide a password"),
  rememberMe: Yup.boolean(),
});

const UserForgotPasswordPage = () => {
  const [isPWDShow, setIsPWDShow] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  const formik = useFormik({
    initialValues: {
      Email: "",
      Password: "",
      rememberMe: false,
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: (values) => {
      console.log(values);
    },
  });

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Forgot Password ?</h5>
              <p className={styles.InfoTextStyle}>
                Enter your email to reset your password
              </p>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="email"
                  labelText="Email"
                  name="Email"
                  id="Email"
                  required
                  value={formik.values.Email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Email && formik.errors.Email
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                  endingData={
                    formik.touched.Email && formik.errors.Email ? (
                      <XCircle
                        className={styles.crossiconsSyles}
                        onClick={() => {
                          formik.setFieldValue("Email", ""); // Clear the email field on icon click if desired
                        }}
                      />
                    ) : null
                  }
                />
                {formik.touched.Email && formik.errors.Email ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Email}
                  </div>
                ) : null}
              </div>
              <div className={styles.buttonLayoutStyles}>
                <div>
                  <FormButton className={styles.buttonStyles} type="submit">
                    Submit
                  </FormButton>
                </div>
                <div>
                  <FormButton
                    className={styles.CancelButtonStyles}
                    type="submit"
                  >
                    Cancel
                  </FormButton>
                </div>
              </div>
              <div className={styles.footerText}>
                Back to{" "}
                <a href="/user/login" className={styles.TurquoiseTitle}>
                  Login
                </a>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserForgotPasswordPage;
