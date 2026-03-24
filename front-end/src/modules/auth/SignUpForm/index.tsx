"use client";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
// import { CheckCircleFill, ExclamationTriangleFill, Eye, EyeSlash } from "react-bootstrap-icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import React from "react";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { CheckUserExistence } from "@/network/apolloClient";
import { useCustomDebounce } from "@/hooks";
import { setUserDetails } from "@/redux/slices/userRegistrationSlice";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import Link from "next/link";
import PrivacyPolicyModal from "@/modules/general/PrivacyPolicy";
import TermsConditionsModal from "@/modules/general/TermsAndConditions";
import CookiePolicyModal from "@/modules/general/CookiePolicy";

export default function SignUpForm() {
  // Modal display states
  const [displayPrivacyPolicy, setDisplayPrivacyPolicy] = useState(false);
  const [displayTermsConditions, setDisplayTermsConditions] = useState(false);
  const [displayCookiePolicy, setDisplayCookiePolicy] = useState(false);
  const cardsRef = useRef<NodeListOf<Element> | null>(null);
  const router = useRouter();
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [errValidate, setErrValidate] = React.useState({
    upperCase: false,
    lowercase: false,
    eigthChar: false,
    specialChar: false,
    number: false,
  });
  const [email, setEmail] = useState("");
  const debouncedEmail = useCustomDebounce(email, 700);
  const [emailExists, setEmailExists] = useState(false);
  const dispatch = useAppDispatch();
  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  useEffect(() => {
    const handleMouseMove = (ev: MouseEvent) => {
      const all = cardsRef.current;
      if (all) {
        all.forEach((e) => {
          const blob = e.querySelector(".blob") as HTMLElement;
          const fblob = e.querySelector(".fakeblob") as HTMLElement;

          if (blob && fblob) {
            const rec = fblob.getBoundingClientRect();
            blob.style.opacity = "1";

            blob.animate(
              [
                {
                  transform: `translate(${
                    ev.clientX - rec.left - rec.width / 2
                  }px, ${ev.clientY - rec.top - rec.height / 2}px)`,
                },
              ],
              {
                duration: 300,
                fill: "forwards",
              }
            );
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (debouncedEmail) {
      const checkEmailExistence = async () => {
        const response = await CheckUserExistence(debouncedEmail.trim());
        setEmailExists(response.length > 0);
      };
      checkEmailExistence();
    } else setEmailExists(false);
  }, [debouncedEmail]);

  const validationSchema = Yup.object().shape({
    email:
      Yup.string()
        .matches(
          /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
          "Please enter a valid email address"
        )
        .required("Email is required") || "",
    password: Yup.string().required("Password is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      email: userDetails?.userDetails?.email || "",
      password: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Check if the password is valid
        if (isPasswordValid) {
          // Password is valid, proceed with checking user by email ID
          const response: any = await CheckUserExistence(values.email.trim());

          if (response?.length > 0) {
            setEmailExists(response?.length > 0);
            // You can display an error message, prevent navigation, etc.
          } else {
            // Password is valid and email doesn't exist, navigate to the next step
            router.push(AppRoutes.USER_REGISTRATION);
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

  useEffect(() => {
    validatepassword(formik.values.password);
  }, [formik.values.password]);

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

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };

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

  useEffect(() => {
    const hasErrors = PasswordCheck.some((item) => item.error);
    setIsPasswordValid(!hasErrors);
  }, [PasswordCheck]);

  const handleEmailChange = (e: any) => {
    const value = e.target.value.trim();
    formik.setFieldValue("email", value);
    setEmail(value);
  };

  return (
    <div
      className="pt_glow"
      ref={(el: any) => (cardsRef.current = el?.querySelectorAll(".card"))}
    >
      <div className="card">
        <div className="inner">
          <div className="pt_signup">
            <h4>Join paytrade today</h4>
            <p>Create a new paytrade account today</p>
            {/* <FormikControl
              control={InputType.TEXT_FIELD}
              label={"Email"}
              name={"email"}
              value={formik.values.email}
              placeholder={"Email address"}
              error={formik.errors.email}
              showError={formik.touched.email && formik.errors.email}
              required={true}
              disableAutoComplete={false}
              onChange={handleEmailChange}
              onBlur={formik.handleBlur}
              showHintIcon
            />
            {emailExists && formik.values.email && !formik.errors.email && (
              <small className={"invalid"}>
                <i className="fa-light fa-circle-x" />
                This email address is taken
              </small>
            )} */}

            <label htmlFor="Email">
              <small>Email</small> <span className="required">*</span>
            </label>
            <div
              className={`passwordInputWrapper ${
                formik?.errors?.email || emailExists ? "" : "mb_1"
              }`}
            >
              <input
                style={{ margin: "0px" }}
                type={InputType.TEXT_FIELD}
                id="email"
                name="email"
                placeholder="Email address"
                required
                value={formik.values.email}
                onChange={handleEmailChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.email && formik.errors.email
                    ? "invalid-borders" // Apply red border if there’s an error
                    : "" // No border if valid
                }
              />
              <div className="tooltip signup_tooltip">
                <i className="fa-light fa-circle-info attachment_info ml_zero_point_five"></i>
                <span className="tooltiptext">
                  {
                    "Please use your personal email for you personal account. You will have the opportunity to setup a business profile shortly where your business email address can be used. The same email can't be used twice."
                  }
                </span>
              </div>
            </div>

            <div className="mb_1">
              {formik.errors.email && formik.touched.email && (
                <small className="invalid">
                  <i className="fa-light fa-circle-xmark"></i>
                  {formik?.errors.email}
                </small>
              )}
              {emailExists && formik.values.email && !formik.errors.email && (
                <small className={"invalid"}>
                  <i className="fa-light fa-circle-x" />
                  This email address is taken
                </small>
              )}
            </div>

            <label htmlFor="password">
              <small>Password</small> <span className="required">*</span>
            </label>
            <div className="passwordInputWrapper">
              <input
                style={{ margin: "0px" }}
                type={isPWDShow ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Password"
                required
                maxLength={16}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={
                  formik.touched.password && formik.errors.password
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

            {formik.errors.password && formik.touched.password && (
              <small className="invalid">
                <i className="fa-light fa-circle-xmark"></i>
                {formik.errors.password}
              </small>
            )}

            {formik.values.password.length > 0 && !isPasswordValid && (
              <div style={{ paddingTop: "1rem" }}>
                {PasswordCheck.map((check, index) => (
                  <div key={index}>
                    <small className={check.error ? "invalid" : "valid"}>
                      {check.icon} <span>{check.msg}</span>
                    </small>
                  </div>
                ))}
              </div>
            )}

            <br />
            <small>
              By clicking sign up, you agree to the paytrade{" "}
              <a onClick={() => setDisplayTermsConditions(true)}>
                user agreement
              </a>
              , <a onClick={() => setDisplayPrivacyPolicy(true)}>privacy</a>,
              and{" "}
              <a onClick={() => setDisplayCookiePolicy(true)}>cookie policy</a>.
            </small>

            <div>
              {" "}
              {displayPrivacyPolicy && (
                <PrivacyPolicyModal
                  display={displayPrivacyPolicy}
                  onClose={() => setDisplayPrivacyPolicy(false)}
                />
              )}
              {displayTermsConditions && (
                <TermsConditionsModal
                  display={displayTermsConditions}
                  onClose={() => setDisplayTermsConditions(false)}
                />
              )}
              {displayCookiePolicy && (
                <CookiePolicyModal
                  display={displayCookiePolicy}
                  onClose={() => setDisplayCookiePolicy(false)}
                />
              )}
            </div>
            <br />
            <CustomButton
              buttonName={"Sign up"}
              buttonType={buttonType.PRIMARY}
              actionType="submit"
              onClick={formik.handleSubmit}
              inputButton
            />
          </div>
        </div>
        <div className="blob"></div>
        <div className="fakeblob"></div>
      </div>
    </div>
  );
}
