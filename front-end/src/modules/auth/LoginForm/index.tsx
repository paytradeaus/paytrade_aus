"use client";
import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { loginByEmailId } from "./loginService";
import { useFormik } from "formik";
import * as Yup from "yup";
import styles from "./userLogin.module.css";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setCompanyId } from "./companyDetails";
import PrivacyPolicyModal from "@/modules/general/PrivacyPolicy";
import TermsConditionsModal from "@/modules/general/TermsAndConditions";
import CookiePolicyModal from "@/modules/general/CookiePolicy";
import CryptoJS from "crypto-js";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";
import { getFileByAttachmentType } from "@/app/api/commonApi";
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
export default function LoginForm() {
  const [displayPrivacyPolicy, setDisplayPrivacyPolicy] = useState(false);
  const [displayTermsConditions, setDisplayTermsConditions] = useState(false);
  const [displayCookiePolicy, setDisplayCookiePolicy] = useState(false);
  const router = useRouter();

  const togglePasswordVisibility = () => {
    setIsPWDShow((prevState) => !prevState);
  };
  const [email, setEmail] = useState("");
  const blogDetailsForRouting: any = useAppSelector(
    (state: RootState) => state.dashBoard.blogDetailsForRouting
  );
  const userDetails: any = {};
  const [loading, setLoading] = useState(false);
  const [isPWDShow, setIsPWDShow] = useState(false);
  const queryParams = useSearchParams();
  const dispatch = useAppDispatch();
  const ImportCompanyId: any = queryParams.get("company_id");
  const { decodeTokenData } = useTokenDetails();

  useEffect(() => {
    if (decodeTokenData && getCookie("accessVerification")) {
      if (decodeTokenData?.isAdmin) {
        router.push(AppRoutes.ADMIN_DASHBOARD);
      } else {
        router.push(AppRoutes.USER_DASHBOARD);
      }
    }
  }, []);

  const formik = useFormik({
    initialValues: {
      Email: userDetails?.userDetails?.Email || "",
      Password: "",
      rememberMe: false,
      isPWDShow: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        // Call the login service on form submission
        const response = await loginByEmailId(
          values.Email,
          values.Password,
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );

        if (response?.data?.access_token) {
          handleUserActivity();
          const token = response?.data?.access_token;
          localStorage.setItem("accessToken", token);
          localStorage.setItem("userMode", "Normal");
          setCookie("userMode", "Normal");
          localStorage.setItem("ProfileType", "User");
          setCookie("ProfileType", "User");
          const decodeTokenData: CustomJwtPayload = jwtDecode(token);
          const companySpecificRoles = decodeTokenData?.companySpecificRoles;

          if (companySpecificRoles && companySpecificRoles.length > 0) {
            const userPrivilage = companySpecificRoles.find(
              (data: any) => data?.isSystemAdded === true
            );
            if (userPrivilage) {
              localStorage.setItem("UserCompanyId", userPrivilage?.companyId);
              setCookie("UserCompanyId", userPrivilage?.companyId);
            }
          }
          const userDetailsRes = JSON.parse(JSON.stringify(decodeTokenData));

          //changes for cookie storage issue
          const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
            JSON.stringify({
              role: userDetailsRes?.role,
              status: userDetailsRes?.status,
              id: userDetailsRes?.id,
              userName: userDetailsRes?.userName,
              userFirstName: userDetailsRes?.userFirstName,
              userLastName: userDetailsRes?.userLastName,
              emailId: userDetailsRes?.emailId,
              isAdmin: userDetailsRes?.isAdmin,
              timezone: userDetailsRes?.timezone,
              iat: userDetailsRes?.iat,
              exp: userDetailsRes?.exp,
            }),
            "token-verification"
          ).toString();

          setCookie("accessVerification", userTokenDetailsForMiddleware);

          // Clear the company ID from local storage
          localStorage.removeItem("companyId");
          deleteCookie("companyId");

          // Check if redirectAfterLogin cookie exists
          const redirectAfterLogin = getCookie("redirectAfterLogin");
          if (redirectAfterLogin) {
            const parsedUrl = new URL(redirectAfterLogin);
            const companyId = parsedUrl.searchParams.get("company_id");
            const userPrivilage = companySpecificRoles?.find(
              (role: any) => role.companyId === Number(companyId)
            );
            // Redirect to the URL stored in the cookie
            // Check if isSystemAdded is true and set the ProfileType accordingly
            if (userPrivilage && companyId) {
              if (userPrivilage?.isSystemAdded === true) {
                // If isSystemAdded is true, set profile type to "User"
                localStorage.setItem("ProfileType", "User");
                setCookie("ProfileType", "User");
              } else {
                // Otherwise, set profile type to "Business"
                localStorage.setItem("ProfileType", "Business");
                setCookie("ProfileType", "Business");
              }

              // If company is found, set necessary data in storage and cookies
              localStorage.setItem("companyId", companyId);
              dispatch(setCompanyId(companyId));
              setCookie("companyId", companyId);
              deleteCookie("redirectAfterLogin");
              router.push(redirectAfterLogin as string);
              return;
            } else {
              deleteCookie("redirectAfterLogin");
            }
          }
          if (blogDetailsForRouting?.url) {
            router.push(blogDetailsForRouting?.url);
            return;
          }
          const imageFile: any = await getFileByAttachmentType("User_profile");
          dispatch(setAppUserDetails({ ...userDetailsRes, image: imageFile }));

          if (
            Array.isArray(userDetailsRes?.companySpecificRoles) &&
            userDetailsRes?.companySpecificRoles?.length === 0
          ) {
            // Redirect to the dashboard if companySpecificRoles is null or empty
            router.push(AppRoutes.USER_DASHBOARD);
          } else {
            // Redirect to choose profile if companySpecificRoles is not null
            router.push(AppRoutes.USER_SELECT_PROFILE);
          }
        }
      } catch (error) {
        console.error("Login failed:", error);
        // Handle other errors if needed
      } finally {
        setLoading(false);
      }
    },
  });
  const handleEmailChange = (e: any) => {
    const value = e.target.value.trim();
    formik.setFieldValue("Email", value);
    setEmail(value);
  };
  return (
    <form className={styles.formStyles} onSubmit={formik.handleSubmit}>
      <div className="pt_login">
        <h4>Sign in</h4>
        <p>If you already have an account with us, please sign in here</p>

        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Email"}
          name="Email"
          placeholder={"Email address"}
          required
          disableAutoComplete={false}
          onChange={formik.handleChange} // ensure this uses formik.handleChange
          onBlur={formik.handleBlur} // ensure this uses formik.handleBlur
          error={formik.errors.Email}
          showError={formik.touched.Email && formik.errors.Email}
        />
        <label htmlFor="Password">
          <small>Password</small> <span className="required">*</span>
        </label>
        <div className="passwordInputWrapper">
          <input
            style={{ margin: "0px" }}
            type={isPWDShow ? "text" : "Password"}
            id="Password"
            name="Password"
            placeholder="Password"
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

        {/* {formik.values.Password.length > 0 && !isPasswordValid && (
          <div>
            {PasswordCheck.map((check, index) => (
              <div key={index}>
                <small className={check.error ? "invalid" : "valid"}>
                  {check.icon} <span>{check.msg}</span>
                </small>
              </div>
            ))}
          </div>
        )} */}

        {/* <div className="formGroup position">
          <FormikControl
            control={InputType.TEXT_FIELD}
            label={"Password"}
            type={isPWDShow ? "text" : "password"}
            name="Password"
            placeholder={"Password"}
            required
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`form-control ${
              formik.touched.Password && formik.errors.Password
                ? "invalid-borders"
                : ""
            }`}
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
        {formik.errors.Password && formik.touched.Password && (
          <small className="invalid">
            <i className="fa-light fa-circle-xmark"></i>
            {formik.errors.Password}
          </small>
        )} */}

        <br />
        <small>
          By clicking sign in, you agree to the paytrade{" "}
          <a onClick={() => setDisplayTermsConditions(true)}>user agreement</a>,{" "}
          <a onClick={() => setDisplayPrivacyPolicy(true)}>privacy</a>, and{" "}
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
          // onClick={() => router.push(AppRoutes.USER_DASHBOARD)}
          inputButton
        />
        <CustomButton
          buttonName={"Forgot password"}
          buttonType={buttonType.OUTLINE_CONTRAST}
          actionType="button"
          onClick={() => router.push(AppRoutes.USER_FORGOT_PASSWORD)}
          inputButton
        />
      </div>
    </form>
  );
}
