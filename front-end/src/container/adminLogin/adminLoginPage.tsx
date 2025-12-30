"use client";
import React, { useState } from "react";
import { Form } from "react-bootstrap";
import styles from "./adminLoginPage.module.scss";
import TextField from "@/components/TextField/textField";
import CheckBox from "@/components/CheckBox/checkBox";
import FormButton from "@/components/Button/button";
import { Eye } from "react-bootstrap-icons";
import { EyeSlash } from "react-bootstrap-icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import Navbar from "@/components/header/navbar";
import {
  AdminLogInUserData,
  checkAdminLogin,
} from "@/app/api/adminAPIs/adminAPIs";
import { jwtDecode } from "jwt-decode";
import { useAppDispatch } from "@/redux/store";
import { setUserDetails } from "@/redux/slices/dashboardSlices";
import { toast } from "@/app/Toaster";
import { setCookie } from "cookies-next";
import { ApplicationURLS } from "@/common/applicationURLS";
import { setAppUserDetails } from "@/redux/slices/userRegistrationDetails";
import CryptoJS from "crypto-js";
const AdminLoginPage = () => {
  const [isPWDShow, setIsPWDShow] = useState(false);
  const [isLoading, setLoading] = useState(false);

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

        router.push(ApplicationURLS.ADMIN_DASHBOARD);
        return;
        // toast.success("Login Successful");
      }
      setLoading(false);
    },
  });

  return (
    <div className={styles.mainContainer}>
      <Navbar navlinkClass={""} />
      <div className={styles.loginPage}>
        <div className={styles.signInForm}>
          <Form
            className={`${styles.formStyles}`}
            onSubmit={formik.handleSubmit}
            noValidate
          >
            <h5 className={styles.title}>Administrator</h5>
            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="email"
                errorText={formik.errors.Email}
                isInvalid={
                  formik.touched.Email && formik.errors.Email ? true : false
                }
                labelText="Email"
                name="Email"
                id="Email"
                autoComplete="on"
                required
                value={formik.values.Email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onEndIconClick={() => formik.setFieldValue("Email", "")}
                classNames={styles.inputFieldControl}
              />
            </div>
            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type={isPWDShow ? "text" : "password"}
                errorText={formik.errors.Password}
                labelText="Password"
                isInvalid={
                  !!(formik.touched.Password && formik.errors.Password)
                }
                name="Password"
                id="Password"
                required
                value={formik.values.Password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                endingData={
                  isPWDShow ? (
                    <Eye className={styles.eyeIconStyle} />
                  ) : (
                    <EyeSlash className={styles.eyeIconStyle} />
                  )
                }
                endingDataStyles={styles.endIconStyle}
                onEndIconClick={togglePasswordVisibility}
                classNames={styles.inputFieldControl}
              />{" "}
            </div>
            <div className={styles.subBoxContainer}>
              <CheckBox
                checked={formik.values.rememberMe}
                onChange={(e) =>
                  formik.setFieldValue("rememberMe", e.target.checked)
                }
                label="Remember me"
                id="Remember me"
              />
            </div>

            <FormButton
              type={"submit"}
              className={styles.buttonStyles}
              disabled={isLoading}
            >
              Sign In
            </FormButton>
          </Form>
          <div className={styles.footerText}>
            By selecting Sign In, you agree to our
            <span className={styles.colorTextStyle}> Terms</span> and
            acknowledge our
            <span className={styles.colorTextStyle}> Privacy Statement</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
