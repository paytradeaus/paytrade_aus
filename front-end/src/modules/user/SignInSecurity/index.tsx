"use client";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  fetchPersonalInfo,
  resendCode,
  updateEmail,
  updatePassword,
  verifyEmailCode,
} from "./signInSecurity.function";
import Style from "./signInSecurity.module.css";
import FormikControl from "@/components/FormikControl";
import { buttonType, EMAIL_REGEX, InputType } from "@/shared/constant/general";
import * as Yup from "yup";
import { useRouter as useNavigation } from "next/navigation";
import { useFormik } from "formik";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { getDecryptedToken } from "@/utils";
import { CheckUserExistence } from "@/network/apolloClient";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { AdminRoles } from "@/shared/constant/role";
import { showErrorToast } from "@/components/Toaster";
const THREE_MINUTES = 3 * 60 * 1000;

const changeEmailValidationSchema = Yup.object().shape({
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

const changePasswordValidationSchema = Yup.object().shape({
  Password: Yup.string().required("New password is required"),
  ConfirmPassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("Password"), ""], "Passwords must match"),
});

const emailOTPValidationSchema = Yup.object().shape({
  otp: Yup.string().required("Please enter the OTP").min(6).max(6),
});

export default function SignInSecurity() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [emailExist, setEmailExist] = useState(false);
  const [changeEmailInprogress, setChangeEmailInprogress] = useState(false);
  const router: any = useNavigation();
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isConfirmPWDShow, setIsConfirmPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [errValidate, setErrValidate] = useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });
  const [changePasswordLoader, setChangePasswordLoader] = useState(false);
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);

  useEffect(() => {
    getPersonalInfo();
  }, []);

  async function getPersonalInfo() {
    const authToken: any = localStorage.getItem("accessToken");
    const decryptedToken: any = authToken ? jwtDecode(authToken) : "";
    await fetchPersonalInfo({
      emailId: decryptedToken?.emailId,
    })
      .then((data: any) => {
        const token = localStorage.getItem("accessToken") ?? "";

        if (data?.length) {
          const response = data[0];
          setUserInfo(response);
        }
      })

      .catch((err: any) => console.log("~ handleSubmit ~ err:", err));
  }

  function setEmailFromToken() {
    const tokenData: any = getDecryptedToken();
    const lowerCaseEmail = tokenData?.emailId
      ? tokenData?.emailId.toLowerCase()
      : tokenData?.emailId;

    changeEmailFormik.setFieldValue("email", lowerCaseEmail);
  }

  useEffect(() => {
    setEmailFromToken();
  }, []);

  const changeEmailFormik = useFormik({
    initialValues: {
      email: "",
      confirmEmail: "",
    },
    validationSchema: changeEmailValidationSchema,
    onSubmit: () => handleChangeEmailSubmit(),
  });

  async function checkEmailExistence(email: any) {
    try {
      setEmailExist(false);
      changeEmailFormik?.setFieldValue("email", email);
      const userExistenceData: any = await CheckUserExistence(email);
      setEmailExist(userExistenceData?.length > 0);
      if (userExistenceData?.length !== 0)
        showErrorToast("This email address is taken");
      return userExistenceData?.length === 0;
    } catch (error) {
      console.error("Error while checking user by email ID:", error);
      return false;
    }
  }

  async function handleChangeEmailSubmit() {
    const tokenData: any = getDecryptedToken();
    if (await checkEmailExistence(changeEmailFormik.values.email)) {
      const postData: any = {
        createEmailVerificationInput: {
          first_name: tokenData?.userFirstName,
          last_name: tokenData?.userLastName,
          email_id: changeEmailFormik.values.email,
          type: "Send",
          mail_type: "Verify_User",
        },
      };
      setChangeEmailInprogress(true);
      await updateEmail(postData).then((response: any) => {
        if (response) {
          setCookie("updatedMail", changeEmailFormik.values.email);
          setShowOTPVerification(true);
        }
      });
      setChangeEmailInprogress(false);
    }
  }

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
  const changePasswordFormik = useFormik({
    initialValues: {
      Password: "",
      ConfirmPassword: "",
      isPWDShow: false,
    },
    validationSchema: changePasswordValidationSchema,
    onSubmit: () => handleChangePasswordSubmit(),
  });
  const hasErrors = PasswordCheck.some((item) => item.error);

  useEffect(() => {
    setIsPasswordValid(!hasErrors);
  }, [errValidate]);

  useEffect(() => {
    validatePassword(changePasswordFormik.values.Password);
  }, [changePasswordFormik.values.Password]);

  // --------------------------------------
  const emailOTPFormik = useFormik({
    initialValues: {
      otp: "",
    },
    validationSchema: emailOTPValidationSchema,
    onSubmit: () => handleEmailOTPSubmit(),
  });

  async function handleChangePasswordSubmit() {
    try {
      setChangePasswordLoader(true);
      if (isPasswordValid) {
        const response = await updatePassword(
          changePasswordFormik?.values?.Password
        );
        if (response) {
          changePasswordFormik.resetForm();
        }
      }
      setChangePasswordLoader(false);
    } catch (error) {
      setChangePasswordLoader(false);
    }
  }

  async function handleEmailOTPSubmit() {
    // Extract the authentication token from cookies
    const authToken = localStorage.getItem("accessToken");
    const updatedEmail = getCookie("updatedMail");

    // Decrypt the authentication token
    const decryptedToken: any = authToken ? jwtDecode(authToken) : "";

    const postData: any = {
      emailId: decryptedToken?.emailId,
      verificationCode: emailOTPFormik.values.otp,
      newEmailId: updatedEmail,
    };

    await verifyEmailCode(postData).then((response: any) => {
      if (response) {
        deleteCookie("updatedMail");
        setShowOTPVerification(false);
        emailOTPFormik.resetForm();
        changeEmailFormik.resetForm();
        getPersonalInfo();
        setEmailFromToken();
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

  const handelCancel = () => {
    let userData: any = getDecryptedToken();
    AdminRoles.includes(userData?.role)
      ? router.push(AppRoutes.ADMIN_DASHBOARD)
      : router.push(AppRoutes.USER_DASHBOARD);
  };

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="pt_login">
              <h4>Sign In & Security</h4>
              <div className="pt_expandtable">
                <details>
                  <summary>
                    Email address &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span className={Style.email}>{userInfo?.email_id}</span>
                    &nbsp;&nbsp;
                    <span
                      className={
                        userInfo?.is_verified === true
                          ? Style.verified
                          : Style.notVerified
                      }
                    >
                      {userInfo?.is_verified === true
                        ? "Verified"
                        : userInfo?.is_verified === false
                        ? "Not Verified"
                        : ""}
                    </span>
                  </summary>
                  <div>
                    {!showOTPVerification && (
                      <div className="grid pt_infocol">
                        <div>
                          <h6>
                            <span className={Style.emailFormTitle}>
                              We&apos;ll use this email to help you sign in if
                              you forget your password
                            </span>
                          </h6>
                          <form onSubmit={changeEmailFormik.handleSubmit}>
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              label={"Email address"}
                              name={"email"}
                              onBlur={changeEmailFormik.handleBlur}
                              placeholder=""
                              required
                              value={changeEmailFormik.values.email}
                              showError={
                                changeEmailFormik.touched.email &&
                                changeEmailFormik.errors.email
                              }
                              onChange={(e: { target: { value: any } }) =>
                                changeEmailFormik.setFieldValue(
                                  "email",
                                  e.target.value
                                )
                              }
                              error={changeEmailFormik.errors?.email}
                            />
                            <br />
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              label={"Confirm email address"}
                              name={"confirmEmail"}
                              placeholder=""
                              value={changeEmailFormik.values.confirmEmail}
                              onBlur={changeEmailFormik.handleBlur}
                              onChange={(e: { target: { value: any } }) =>
                                changeEmailFormik.setFieldValue(
                                  "confirmEmail",
                                  e.target.value
                                )
                              }
                              showError={
                                changeEmailFormik.touched.confirmEmail &&
                                changeEmailFormik.errors.confirmEmail
                              }
                              error={changeEmailFormik.errors?.confirmEmail}
                              required
                            />
                            <br />
                            <div className="grid">
                              <input
                                type="submit"
                                value={"Save"}
                                className="secondary"
                                disabled={changeEmailInprogress}
                              />
                              <input
                                type="button"
                                value={"Cancel"}
                                className="secondary"
                                onClick={() => handelCancel()}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    {showOTPVerification && (
                      <div className="grid pt_infocol">
                        <div>
                          <h6>
                            <span className={Style.emailFormTitle}>
                              We have sent you an email with a 6 digit code.
                              Please enter this below
                            </span>
                          </h6>
                          <form onSubmit={emailOTPFormik.handleSubmit}>
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              label={"Please enter the code:"}
                              name={"otp"}
                              value={emailOTPFormik.values.otp}
                              placeholder={""}
                              required
                              error={emailOTPFormik.errors.otp}
                              showError={
                                emailOTPFormik.touched.otp &&
                                emailOTPFormik.errors.otp
                              }
                              maxLength={6}
                              disableAutoComplete={true}
                              onChange={(e: any) =>
                                emailOTPFormik.setFieldValue(
                                  "otp",
                                  e.target.value.trim()
                                    ? e.target.value
                                    : e.target.value.trim()
                                )
                              }
                              onBlur={emailOTPFormik.handleBlur}
                            ></FormikControl>
                            <br />
                            <div className="grid">
                              <input
                                type="submit"
                                value={"Authenticate"}
                                className="secondary"
                              />
                              <input
                                type="button"
                                value={"Cancel"}
                                className="secondary"
                                onClick={() => {
                                  emailOTPFormik.resetForm();
                                  changeEmailFormik.resetForm();
                                  getPersonalInfo();
                                  setEmailFromToken();
                                  setShowOTPVerification(false);
                                }}
                              />
                              <input
                                type="button"
                                value={"Re-send code"}
                                className="secondary"
                                onClick={triggerResendCode}
                                disabled={disableResendEmail}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
              <div className="pt_expandtable">
                <details>
                  <summary>
                    Password
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span>*********</span>
                  </summary>
                  <div>
                    <div className="grid pt_infocol">
                      <div>
                        <h6>
                          {" "}
                          <span className={Style.emailFormTitle}>
                            Update your password
                          </span>
                        </h6>
                        <form onSubmit={changePasswordFormik.handleSubmit}>
                          {/* <div className="formGroup position">
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              label={"New Password"}
                              type={isPWDShow ? "text" : "password"}
                              name="Password"
                              value={changePasswordFormik.values.Password}
                              placeholder=""
                              onChange={(e: any) => {
                                changePasswordFormik.handleChange(e);
                                validatePassword(e.target.value);
                              }}
                              onBlur={changePasswordFormik.handleBlur}
                              error={changePasswordFormik.errors.Password}
                              showError={
                                changePasswordFormik.touched.Password &&
                                changePasswordFormik.errors.Password
                              }
                              endingData={
                                isPWDShow ? (
                                  <i
                                    className="fa-sharp fa-light fa-eye"
                                    onClick={togglePasswordVisibility}
                                  ></i>
                                ) : (
                                  <i
                                    className="fa-light fa-eye-slash"
                                    onClick={togglePasswordVisibility}
                                  ></i>
                                )
                              }
                            />
                          </div>
                          {changePasswordFormik.values.Password.length > 0 &&
                            !isPasswordValid && (
                              <div>
                                {PasswordCheck.map((check, index) => (
                                  <div key={index}>
                                    <small
                                      className={
                                        check.error ? "invalid" : "valid"
                                      }
                                    >
                                      {check.icon} <span>{check.msg}</span>
                                    </small>
                                  </div>
                                ))}
                              </div>
                            )}
                          <div className="formGroup position">
                            <FormikControl
                              control={InputType.TEXT_FIELD}
                              label={"Confirm Password"}
                              type={isConfirmPWDShow ? "text" : "password"}
                              name="ConfirmPassword"
                              value={
                                changePasswordFormik.values.ConfirmPassword
                              }
                              placeholder=""
                              onChange={changePasswordFormik.handleChange}
                              onBlur={changePasswordFormik.handleBlur}
                              error={
                                changePasswordFormik.errors.ConfirmPassword
                              }
                              showError={
                                changePasswordFormik.touched.ConfirmPassword &&
                                changePasswordFormik.errors.ConfirmPassword
                              }
                              endingData={
                                isConfirmPWDShow ? (
                                  <i
                                    className="fa-sharp fa-light fa-eye"
                                    onClick={toggleConfirmPasswordVisibility}
                                  ></i>
                                ) : (
                                  <i
                                    className="fa-light fa-eye-slash"
                                    onClick={toggleConfirmPasswordVisibility}
                                  ></i>
                                )
                              }
                            />
                          </div> */}

                          <div className="passwordInputWrapper">
                            <label htmlFor="Password">
                              <small>New password</small>{" "}
                              <span className="required">*</span>
                            </label>
                            <div className="passwordInputWrapper">
                              <input
                                style={{ margin: "0px" }}
                                type={isPWDShow ? "text" : "Password"}
                                id="Password"
                                name="Password"
                                placeholder=""
                                maxLength={16}
                                value={changePasswordFormik.values.Password}
                                onChange={(e: any) => {
                                  changePasswordFormik.handleChange(e);
                                  validatePassword(e.target.value);
                                }}
                                onBlur={changePasswordFormik.handleBlur}
                                className={
                                  changePasswordFormik.touched.Password &&
                                  changePasswordFormik.errors.Password
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

                            {changePasswordFormik.errors.Password &&
                              changePasswordFormik.touched.Password && (
                                <small className="invalid">
                                  {changePasswordFormik.errors.Password}
                                </small>
                              )}
                          </div>
                          {changePasswordFormik.values.Password.length > 0 &&
                            !isPasswordValid && (
                              <div>
                                {PasswordCheck.map((check, index) => (
                                  <div key={index}>
                                    <small
                                      className={
                                        check.error ? "invalid" : "valid"
                                      }
                                    >
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
                                value={
                                  changePasswordFormik.values.ConfirmPassword
                                }
                                placeholder=""
                                onChange={changePasswordFormik.handleChange}
                                onBlur={changePasswordFormik.handleBlur}
                                className={
                                  changePasswordFormik.touched
                                    .ConfirmPassword &&
                                  changePasswordFormik.errors.ConfirmPassword
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
                            {changePasswordFormik.errors.ConfirmPassword &&
                              changePasswordFormik.touched.ConfirmPassword && (
                                <small className="invalid">
                                  {changePasswordFormik.errors.ConfirmPassword}
                                </small>
                              )}
                          </div>
                          <br />
                          <br />
                          <div className="grid">
                            <CustomButton
                              buttonName={"Change Password"}
                              buttonType={buttonType.SECONDARY}
                              actionType="submit"
                              inputButton
                              disabled={changePasswordLoader}
                            />
                            <CustomButton
                              buttonName={"Cancel"}
                              buttonType={buttonType.SECONDARY}
                              actionType="button"
                              inputButton
                              disabled={changePasswordLoader}
                              onClick={() => {
                                handelCancel();
                              }}
                            />
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
