"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import {
  CheckCircleFill,
  ExclamationTriangleFill,
  EyeSlash,
  Eye,
} from "react-bootstrap-icons";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./changePassword.module.scss";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTokenDetails } from "@/common/commonHooks";
import { UpdateAdminDetails } from "@/container/adminModules/addAdminUser/addAdminUser.functions";
const validationSchema = Yup.object().shape({
  Password: Yup.string().required("New password is required"),
  ConfirmPassword: Yup.string()
    .required("Confirm password is required")
    .test("passwords-match", "Passwords doesn't match", function (value) {
      return this.parent.Password === value;
    }),
});

function ChangePassword(props: any) {
  const { SetScreenType } = props;
  const { decodeTokenData } = useTokenDetails();

  //Formik Handling
  const formik = useFormik({
    initialValues: {
      Password: "",
      ConfirmPassword: "",
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  //useState and useEffect Management

  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isConfirmPWDShow, setIsConfirmPWDShow] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [errValidate, setErrValidate] = useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });

  useEffect(() => {
    validatePassword(formik.values.Password);
  }, [formik.values.Password]);

  useEffect(() => {
    // Check if all password validations are satisfied
    const isValid = Object.values(errValidate).every((value) => value === true);
    setIsPasswordValid(isValid); // Update isPasswordValid state
  }, [errValidate]);

  const PasswordCheck = [
    {
      error: !errValidate?.eigthChar,
      msg: "Use 8 or more characters",
      color: !errValidate?.eigthChar ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.upperCase || !errValidate?.lowercase,
      msg: "Use upper and lower case letters(e.g. Aa)",
      color:
        !errValidate?.upperCase || !errValidate?.lowercase ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.number,
      msg: "Use a number(e.g. 1234)",
      color: !errValidate?.number ? "red" : "#3D9A58",
    },
    {
      error: !errValidate?.specialChar,
      msg: "Use a symbol(e.g. !@#$)",
      color: !errValidate?.specialChar ? "red" : "#3D9A58",
    },
  ];

  const hasErrors = PasswordCheck.some((item) => item.error);

  //Other Hooks
  const router = useRouter();

  //Functions

  function togglePasswordVisibility() {
    setIsPWDShow((prevState) => !prevState);
  }

  function toggleConfirmPasswordVisibility() {
    setIsConfirmPWDShow((prevState) => !prevState);
  }

  function validatePassword(value: any) {
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
  }

  async function handleSubmit() {
    try {
      setDisableBtn(true);
      // Check if the password is valid
      if (isPasswordValid) {
        let modifiedPayload = {
          password: formik?.values.Password,
          id: decodeTokenData?.id,
        };

        let response = await UpdateAdminDetails(
          modifiedPayload,
          "Your password has been updated.",
          setDisableBtn
        );

        if (response) {
          SetScreenType("mainScreen");
        }
      } else {
        setDisableBtn(false);
      }
    } catch (error) {
      setDisableBtn(false);
      console.error("Error updating password:", error);
    }
  }

  //Render Template
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col className={styles.card}>
          <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
            <h5 className={styles.title}>Update your password</h5>

            <div className={styles.textFieldStyles}>
              <TextField
                type={isPWDShow ? "text" : "password"}
                labelText="New Password *"
                name="Password"
                id="Password"
                placeholder="Enter new password"
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
                labelText="Confirm Password *"
                name="ConfirmPassword"
                id="ConfirmPassword"
                placeholder="Enter confirm password"
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
            {decodeTokenData?.id && (
              <FormButton
                className={styles.buttonStyles}
                type="submit"
                disabled={disableBtn}
              >
                Save
              </FormButton>
            )}
            <Button
              className="cancel-button mt-3"
              // onClick={() => router.back()}
              disabled={disableBtn}
              onClick={() => SetScreenType("mainScreen")}
            >
              Close
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default ChangePassword;
