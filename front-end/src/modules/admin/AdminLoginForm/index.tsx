"use client";
import BaseModal from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Formik, useFormik } from "formik";
import * as Yup from "yup";
// import styles from "./adminLogin.module.css";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
// import { setCompanyId } from "./companyDetails";
import Link from "next/link";
import PrivacyPolicyModal from "@/modules/general/PrivacyPolicy";
import TermsConditionsModal from "@/modules/general/TermsAndConditions";
import CookiePolicyModal from "@/modules/general/CookiePolicy";
import {
  AdminLogInUserData,
  checkAdminLogin,
} from "@/app/api/adminApi/adminApi";
import { setUserDetails } from "@/redux/slices/dashboardSlices";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import CryptoJS from "crypto-js";
import { useTokenDetails } from "@/hooks";
import { handleUserActivity } from "@/utils";

export interface CustomJwtPayload extends JwtPayload {
  userId: string; // Define your custom property here
  companySpecificRoles?: any;
}
const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  Password: Yup.string().required("Password is required"),
  rememberMe: Yup.boolean(),
});
export default function AdminLoginForm() {
  const [displayPrivacyPolicy, setDisplayPrivacyPolicy] = useState(false);
  const [displayTermsConditions, setDisplayTermsConditions] = useState(false);
  const [displayCookiePolicy, setDisplayCookiePolicy] = useState(false);
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const togglePasswordVisibility = () => {
    setIsPWDShow(!isPWDShow);
  };

  const validationSchema = Yup.object().shape({
    Email: Yup.string()
      .required("Email is required")
      .matches(
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
        "Please enter a valid email address"
      ),
    Password: Yup.string().required("Password is required"),
    rememberMe: Yup.boolean(),
  });

  const formik = useFormik({
    initialValues: {
      Email: "",
      Password: "",
      rememberMe: false,
      // isPWDShow: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      const response: any = await checkAdminLogin(values);
      if (response?.adminLoginByEmailId?.data?.access_token) {
        handleUserActivity();
        let token = response?.adminLoginByEmailId?.data?.access_token;
        const decodeTokenData = jwtDecode(token);
        const userDetails: AdminLogInUserData = JSON.parse(
          JSON.stringify(decodeTokenData)
        );

        dispatch(setUserDetails(userDetails));
        dispatch(setAppUserDetails(userDetails));
        // const expireTime: any = new Date(userDetails.exp * 1000);
        // const currentTime: any = new Date(); // Current time in seconds
        // const timeDiff = expireTime - currentTime; // Remaining time until expiration in seconds
        // setCookie("accessToken", token);
        localStorage.setItem("accessToken", token);

        //changes for cookie storage issue
        const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
          JSON.stringify({
            ...userDetails,
          }),
          "token-verification"
        ).toString();

        setCookie("accessVerification", userTokenDetailsForMiddleware);
        window.location.href = AppRoutes.ADMIN_DASHBOARD;
        return;
        // toast.success("Login Successful");
      }
      setLoading(false);
    },
  });

  useEffect(() => {
    if (decodeTokenData && getCookie("accessVerification")) {
      if (decodeTokenData?.isAdmin) {
        router.push(AppRoutes.ADMIN_DASHBOARD);
      } else {
        router.push(AppRoutes.USER_DASHBOARD);
      }
    }
  }, []);

  return (
    // <form className={styles.formStyles} onSubmit={formik.handleSubmit}>
    <div className="pt_login">
      <h4>Administrator</h4>
      {/* <p>If you already have an account with us, please sign in here</p> */}

      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"Email"}
        name="Email"
        placeholder={"Email address"}
        required
        onChange={formik.handleChange} // ensure this uses formik.handleChange
        onBlur={formik.handleBlur} // ensure this uses formik.handleBlur
        error={formik.errors.Email}
        showError={formik.touched.Email && formik.errors.Email}
      />
      <label htmlFor="password">
        <small>Password</small> <span className="required">*</span>
      </label>
      <div className="passwordInputWrapper">
        <input
          style={{ margin: "0px" }}
          type={isPWDShow ? "text" : "password"}
          id="Password"
          name="Password"
          placeholder="Password"
          required
          maxLength={16}
          value={formik.values.Password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={
            formik.touched.Password && formik.errors.Password
              ? "invalid-borders" // Apply red border if there’s an error
              : "" // No border if valid
          }
        />
        <i
          className={
            isPWDShow ? "fa-sharp fa-light fa-eye" : "fa-light fa-eye-slash"
          }
          onClick={togglePasswordVisibility}
        ></i>
      </div>

      {formik.errors.Password && formik.touched.Password && (
        <small className="invalid">
          <i className="fa-light fa-circle-xmark"></i>
          {formik.errors.Password}
        </small>
      )}
      <br />
      <small>
        By clicking sign in, you agree to the paytrade{" "}
        <a onClick={() => setDisplayTermsConditions(true)}>user agreement</a>,{" "}
        <a onClick={() => setDisplayPrivacyPolicy(true)}>privacy policy</a>, and{" "}
        <a onClick={() => setDisplayCookiePolicy(true)}>cookie policy</a>.
      </small>
      <>
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
      </>
      <br />
      <br />

      <CustomButton
        buttonName={"Sign in"}
        buttonType={buttonType.SECONDARY}
        actionType="submit"
        disabled={isLoading}
        onClick={() => formik.handleSubmit()}
        // onClick={() => router.push(AppRoutes.USER_DASHBOARD)}
        inputButton
      />
    </div>
  );
}
