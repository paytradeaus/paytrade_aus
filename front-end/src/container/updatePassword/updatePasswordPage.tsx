"use client";

import React, { useState } from "react";
import { Row, Col, Form, Container } from "react-bootstrap";
import styles from "./updatePasswordPage.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  CheckCircleFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import { Eye } from "react-bootstrap-icons";
import { EyeSlash } from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";
import { updatePassword } from "@/app/api/LoginServices";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";

// ... (imports and other code)

const validationSchema = Yup.object().shape({
  Password: Yup.string().required("New password is required"),
  ConfirmPassword: Yup.string()
    .required("Confirm password is required")
    .test("passwords-match", "Passwords must match", function (value) {
      return this.parent.Password === value;
    }),
});

const UpdatePasswordPage = () => {
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const [isConfirmPWDShow, setIsConfirmPWDShow] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPWDShow((prevState) => !prevState);
  };

  const formik = useFormik({
    initialValues: {
      Password: "",
      ConfirmPassword: "",
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  React.useEffect(() => {
    validatepassword(formik.values.Password);
  }, [formik.values.Password]);

  const [errValidate, setErrValidate] = React.useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });

  const PasswordCheck = [
    {
      error: !errValidate?.eigthChar,
      msg: "Use 8 or more characters",
      color: !errValidate?.eigthChar ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.upperCase || !errValidate?.lowercase,
      msg: "Use upper and lower case letters",
      color:
        !errValidate?.upperCase || !errValidate?.lowercase ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.number,
      msg: "Use a number",
      color: !errValidate?.number ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.specialChar,
      msg: "Use a symbol",
      color: !errValidate?.specialChar ? "red" : "#3D9A58",
    },
  ];

  React.useEffect(() => {
    // Check if all password validations are satisfied
    const isValid = Object.values(errValidate).every((value) => value === true);
    setIsPasswordValid(isValid); // Update isPasswordValid state
  }, [errValidate]);

  const hasErrors = PasswordCheck.some((item) => item.error);

  const validatepassword = (value: any) => {
    let val = value?.split("");
    let error = {
      eg: false,
      up: false,
      lc: false,
      num: false,
      sch: false,
    };
    if (value?.length >= 8) {
      error.eg = true;
    }
    val?.map((value: any) => {
      let sch = /^([@$!%*#?&])$/;
      let up = /^([A-Z])$/;
      let lc = /^([a-z])$/;
      let num = /^([0-9])$/;
      if (up.test(value)) {
        error.up = true;
      }
      if (lc.test(value)) {
        error.lc = true;
      }
      if (num.test(value)) {
        error.num = true;
      }
      if (sch.test(value)) {
        error.sch = true;
      }

      return error;
    });

    setErrValidate({
      upperCase: error?.up,
      lowercase: error?.lc,
      eigthChar: error?.eg,
      specialChar: error?.sch,
      number: error?.num,
    });
  };

  async function handleSubmit() {
    try {
      setLoader(true);
      // Check if the password is valid
      if (isPasswordValid) {
        // Password is valid, proceed with updating the password
        const response = await updatePassword(formik?.values?.Password);
        if (response) {
          router.push(ApplicationURLS.USER_DASHBOARD);
        }
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Set Password</h5>
              <div className={styles.textFieldStyles}>
                <TextField
                  type={isPWDShow ? "text" : "password"}
                  labelText="New Password"
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
                  className={`${styles.inputFieldControl} ${
                    formik.touched.Password &&
                    formik.errors.Password &&
                    !isPasswordValid
                      ? `${styles.inputError}`
                      : ""
                  }`}
                />
                {formik.values.Password.length > 0 && (
                  <div className={styles.errorText}>
                    {hasErrors &&
                      PasswordCheck?.map((item, index) => {
                        return (
                          <div key={index}>
                            <div
                              data-testid={`password${index + 1}`}
                              style={{
                                fontSize: "12px",
                                textAlign: "start",
                                color: item.color,
                                marginTop: "5px",
                              }}
                            >
                              {item.error ? (
                                <ExclamationTriangleFill
                                  className={styles.PasswordErrorIconStyles}
                                />
                              ) : (
                                <CheckCircleFill
                                  className={styles.PasswordErrorIconStyles}
                                />
                              )}
                              {item?.msg}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                {formik.touched.Password && formik.errors.Password ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Password}
                  </div>
                ) : null}
              </div>

              <div className={styles.textFieldStyles}>
                <TextField
                  type={isConfirmPWDShow ? "text" : "password"}
                  labelText="Confirm Password"
                  name="ConfirmPassword"
                  id="ConfirmPassword"
                  required
                  value={formik.values.ConfirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  endingData={
                    isConfirmPWDShow ? (
                      <Eye
                        className={styles.eyeIconStyle}
                        onClick={toggleConfirmPasswordVisibility}
                      />
                    ) : (
                      <EyeSlash
                        className={styles.eyeIconStyle}
                        onClick={toggleConfirmPasswordVisibility}
                      />
                    )
                  }
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.ConfirmPassword &&
                    formik.errors.ConfirmPassword
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.ConfirmPassword &&
                formik.errors.ConfirmPassword ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.ConfirmPassword}
                  </div>
                ) : null}
              </div>
              <FormButton className={styles.buttonStyles} type="submit">
                Change Password
              </FormButton>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UpdatePasswordPage;
