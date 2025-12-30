"use client";

import React, { useEffect, useState } from "react";
import styles from "./userSignupPage.module.scss";
import { Row, Col, Form, Container } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { CheckCircleFill } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { Eye } from "react-bootstrap-icons";
import { EyeSlash } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";

import { useFormik } from "formik";
import * as Yup from "yup";
import { CheckUserExistence } from "../../../app/api/RegistrationServices";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setUserDetails } from "@/redux/slices/userRegistrationDetails";
import Link from "next/link";
import { useCustomDebounce } from "@/common/commonHooks";

const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  Password: Yup.string().required("Password is required"),
});

const UserSignupPage = () => {
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [email, setEmail] = useState("");
  const debouncedEmail = useCustomDebounce(email, 700);
  const router = useRouter();

  const dispatch = useAppDispatch();
  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  useEffect(() => {
    if (debouncedEmail) {
      const checkEmailExistence = async () => {
        const response = await CheckUserExistence(debouncedEmail.trim());
        setEmailExists(response.length > 0);
      };
      checkEmailExistence();
    }
  }, [debouncedEmail]);

  const handleEmailChange = (e: any) => {
    const value = e.target.value.trim();
    formik.setFieldValue("Email", value);
    setEmail(value);
  };

  const formik = useFormik({
    initialValues: {
      Email: userDetails?.userDetails?.Email || "", // Set Email field with value from Redux if available
      Password: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Check if the password is valid
        if (isPasswordValid) {
          // Password is valid, proceed with checking user by email ID
          const response: any = await CheckUserExistence(values.Email.trim());

          if (response?.length > 0) {
            setEmailExists(response?.length > 0);
            // You can display an error message, prevent navigation, etc.
          } else {
            // Password is valid and email doesn't exist, navigate to the next step
            router.push("/user/registration/details");
            let newData: any;
            if (userDetails?.userDetails?.FirstName) {
              newData = { ...userDetails?.userDetails, ...values };
            }
            dispatch(
              setUserDetails(
                userDetails?.userDetails?.FirstName
                  ? { ...newData }
                  : { ...values }
              )
            );
          }
        } else {
          console.log("Password validation failed!");
        }
      } catch (error) {
        console.error("Error while checking user by email ID:", error);
      }
    },
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

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Join Pay Trade Today</h5>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  labelText="Email *"
                  name="Email"
                  id="Email"
                  value={formik.values.Email}
                  onChange={handleEmailChange}
                  onBlur={(e: any) => {
                    formik.handleBlur(e);
                  }}
                  endingDataStyles={styles.endIconStyle}
                  className={`${styles.inputFieldControl} ${
                    (formik.touched.Email && formik.errors.Email) || emailExists
                      ? `${styles.inputError}`
                      : ""
                  }`}
                />

                {formik.touched.Email &&
                formik.errors.Email &&
                typeof formik.errors.Email === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Email}
                  </div>
                ) : emailExists ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    This email address is taken
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
                    maxLength={16}
                    value={formik.values.Password}
                    onChange={(e) =>
                      formik.setFieldValue("Password", e.target.value.trim())
                    }
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
              </div>
              <div className={styles.footerText}>
                By clicking Agree and Join, you agree to the Pay Trade
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
              <FormButton className={styles.buttonStyles} type="submit">
                Agree & Join
              </FormButton>
              <div className={styles.footerText}>
                Already registered?{" "}
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

export default UserSignupPage;
