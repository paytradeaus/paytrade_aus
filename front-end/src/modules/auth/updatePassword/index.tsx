"use client";
import React, { useEffect, useState } from "react";
import FormikControl from "@/components/FormikControl";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";
import { buttonType, InputType } from "@/shared/constant/general";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { updatePassword } from "../LoginForm/loginService";

const SetPassword = () => {
  const { setLoader }: any = useLoaderContext();
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isConfirmPWDShow, setIsConfirmPWDShow] = useState(false);
  const router = useRouter();
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [errValidate, setErrValidate] = useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });

  const validationSchema = Yup.object().shape({
    Password: Yup.string().required("New password is required"),
    ConfirmPassword: Yup.string()
      .required("Confirm password is required")
      .oneOf([Yup.ref("Password"), ""], "Passwords must match"),
  });

  const togglePasswordVisibility = () => setIsPWDShow((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPWDShow((prevState) => !prevState);
  };

  const validatePassword = (value: string) => {
    const error = {
      eigthChar: value.length >= 8,
      upperCase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      specialChar: /[@$!%*#?&]/.test(value),
    };
    setErrValidate(error);
  };

  const PasswordCheck = [
    {
      error: !errValidate.eigthChar,
      msg: "Use 8 or more characters",
      icon: errValidate.eigthChar ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
    {
      error: !errValidate.upperCase || !errValidate.lowercase,
      msg: "Use upper and lower case letters",
      icon:
        errValidate.upperCase && errValidate.lowercase ? (
          <i className="fa-light fa-circle-check" />
        ) : (
          <i className="fa-light fa-circle-x" />
        ),
    },
    {
      error: !errValidate.number,
      msg: "Use a number",
      icon: errValidate.number ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
    {
      error: !errValidate.specialChar,
      msg: "Use a symbol",
      icon: errValidate.specialChar ? (
        <i className="fa-light fa-circle-check" />
      ) : (
        <i className="fa-light fa-circle-x" />
      ),
    },
  ];
  const formik = useFormik({
    initialValues: {
      Password: "",
      ConfirmPassword: "",
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });
  const hasErrors = PasswordCheck.some((item) => item.error);

  useEffect(() => {
    setIsPasswordValid(!hasErrors);
  }, [errValidate]);

  React.useEffect(() => {
    validatePassword(formik.values.Password);
  }, [formik.values.Password]);

  async function handleSubmit() {
    try {
      setLoader(true);
      // Check if the password is valid
      if (isPasswordValid) {
        // Password is valid, proceed with updating the password
        const response = await updatePassword(formik?.values?.Password);
        if (response) {
          router.push(AppRoutes.USER_SIGNUP);
        }
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <h4>Set password</h4>
          <form onSubmit={formik.handleSubmit}>
            <div className="passwordInputWrapper">
              {/* <FormikControl
                control={InputType.TEXT_FIELD}
                label={"New password"}
                type={isPWDShow ? "text" : "password"}
                name="Password"
                value={formik.values.Password}
                placeholder=""
                onChange={(e: any) => {
                  formik.handleChange(e);
                  validatePassword(e.target.value);
                }}
                style={{ margin: "0px" }}
                onBlur={formik.handleBlur}
                error={formik.errors.Password}
                showError={formik.touched.Password && formik.errors.Password}
                // endingData={
                //   isPWDShow ? (
                //     <i
                //       className="fa-sharp fa-light fa-eye"
                //       onClick={togglePasswordVisibility}
                //     ></i>
                //   ) : (
                //     <i
                //       className="fa-light fa-eye-slash"
                //       onClick={togglePasswordVisibility}
                //     ></i>
                //   )
                // }
                endingData={
                  <i
                    className={`fa-light ${
                      isPWDShow ? "fa-eye" : "fa-eye-slash"
                    } pswdIcon`}
                    onClick={togglePasswordVisibility}
                  ></i>
                }
              /> */}
              <label htmlFor="Password">
                <small>New password</small> <span className="required">*</span>
              </label>
              <div className="passwordInputWrapper">
                <input
                  style={{ margin: "0px" }}
                  type={isPWDShow ? "text" : "Password"}
                  id="Password"
                  name="Password"
                  placeholder=""
                  maxLength={16}
                  value={formik.values.Password}
                  onChange={(e: any) => {
                    formik.handleChange(e);
                    validatePassword(e.target.value);
                  }}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.Password && formik.errors.Password
                      ? "invalid-borders" // Apply red border if there’s an error
                      : "" // No border if valid
                  }
                />
                <i
                  className={
                    isPWDShow
                      ? "fa-sharp fa-light fa-eye"
                      : "fa-light fa-eye-slash"
                  }
                  onClick={togglePasswordVisibility}
                ></i>
              </div>

              {formik.errors.Password && formik.touched.Password && (
                <small className="invalid">{formik.errors.Password}</small>
              )}
            </div>
            {formik.values.Password.length > 0 && !isPasswordValid && (
              <div>
                {PasswordCheck.map((check, index) => (
                  <div key={index}>
                    <small className={check.error ? "invalid" : "valid"}>
                      {check.icon} <span>{check.msg}</span>
                    </small>
                  </div>
                ))}
              </div>
            )}
            <div className="passwordInputWrapper">
              <label htmlFor="Password">
                <small>Confirm password</small>{" "}
                <span className="required">*</span>
              </label>
              <div className="passwordInputWrapper">
                <input
                  style={{ margin: "0px" }}
                  type={isConfirmPWDShow ? "text" : "password"}
                  id="ConfirmPassword"
                  maxLength={16}
                  name="ConfirmPassword"
                  value={formik.values.ConfirmPassword}
                  placeholder=""
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.touched.ConfirmPassword &&
                    formik.errors.ConfirmPassword
                      ? "invalid-borders" // Apply red border if there’s an error
                      : "" // No border if valid
                  }
                />
                <i
                  className={
                    isConfirmPWDShow
                      ? "fa-sharp fa-light fa-eye"
                      : "fa-light fa-eye-slash"
                  }
                  onClick={toggleConfirmPasswordVisibility}
                ></i>
              </div>
              {formik.errors.ConfirmPassword &&
                formik.touched.ConfirmPassword && (
                  <small className="invalid">
                    {formik.errors.ConfirmPassword}
                  </small>
                )}
              {/* <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Confirm password"}
                type={isConfirmPWDShow ? "text" : "password"}
                name="ConfirmPassword"
                value={formik.values.ConfirmPassword}
                placeholder=""
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.ConfirmPassword}
                showError={
                  formik.touched.ConfirmPassword &&
                  formik.errors.ConfirmPassword
                }
                // endingData={
                //   isConfirmPWDShow ? (
                //     <i
                //       className="fa-sharp fa-light fa-eye"
                //       onClick={toggleConfirmPasswordVisibility}
                //     ></i>
                //   ) : (
                //     <i
                //       className="fa-light fa-eye-slash"
                //       onClick={toggleConfirmPasswordVisibility}
                //     ></i>
                //   )
                // }
                endingData={
                  <i
                    className={`fa-light ${
                      isConfirmPWDShow ? "fa-eye" : "fa-eye-slash"
                    } pswdIcon`}
                    onClick={toggleConfirmPasswordVisibility}
                  ></i>
                }
              /> */}
            </div>
            <br />
            <br />
            <CustomButton
              buttonName={"Change password"}
              buttonType={buttonType.SECONDARY}
              actionType="submit"
              inputButton
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
