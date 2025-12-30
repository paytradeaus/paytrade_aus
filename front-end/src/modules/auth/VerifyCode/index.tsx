"use client";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  EMAIL_REGEX,
  InputType,
  NUMBER_REGEX,
} from "@/shared/constant/general";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useLoaderContext } from "@/context/useLoader";
import {
  triggerForgotPasswordEmail,
  verifyForgotPasswordCode,
} from "../ForgotPassword/forgorPasswordFunction";

import { useState } from "react";
import { useAppDispatch } from "@/redux/store";
import { jwtDecode } from "jwt-decode";
import { setUserDetails } from "@/redux/slices/dashboardSlices";
import { cursorTo } from "readline";

const THREE_MINUTES = 3 * 60 * 1000;
interface FormData {
  code: string;
}

function UpdatePassword() {
  const { setLoader }: any = useLoaderContext();
  const [disableResendEmail, setDisableResendEmail] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const validationSchema = Yup.object().shape({
    code: Yup.string()
      .matches(NUMBER_REGEX, "Only numbers are allowed")
      .min(6, "Enter six digit code")
      .max(6, "Enter six digit code")
      .required("code is required"),
  });

  const formik = useFormik({
    initialValues: {
      code: "",
    },
    validationSchema,
    onSubmit: (values) => handleSubmit(values),
  });

  async function handleSubmit(values: FormData) {
    setLoader(true);
    const postData = {
      emailId: getCookie("userMail") ?? "",
      verificationCode: String(values?.code),
    };
    await verifyForgotPasswordCode(postData)
      .then((data: any) => {
        const token = data?.verifyCode?.data?.access_token;
        console.log("data", data);
        router.push(AppRoutes.USER_UPDATE_PASSWORD);

        // setCookie("accessToken", token);
        localStorage.setItem("accessToken", token);
        const decodeTokenData = jwtDecode(token);
        const userDetails: any = JSON.parse(JSON.stringify(decodeTokenData));

        // const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
        //   JSON.stringify({
        //     role: userDetails?.role,
        //     status: userDetails?.status,
        //     id: userDetails?.id,
        //     userName: userDetails?.userName,
        //     userFirstName: userDetails?.userFirstName,
        //     userLastName: userDetails?.userLastName,
        //     emailId: userDetails?.emailId,
        //     isAdmin: userDetails?.isAdmin,
        //     timezone: userDetails?.timezone,
        //     iat: userDetails?.iat,
        //     exp: userDetails?.exp,
        //   }),
        //   "token-verification"
        // ).toString();

        // setCookie("accessVerification", userTokenDetailsForMiddleware);

        dispatch(setUserDetails(userDetails));
        setCookie("userRole", userDetails?.role);
        deleteCookie("userMail");
        router.push(AppRoutes.USER_UPDATE_PASSWORD);
      })
      .catch((err: any) => console.log("handleSubmit ~ err:", err))
      .finally(() => setLoader(false));
  }

  async function resendVerificationCode() {
    setDisableResendEmail(true);
    // setLoader(true);
    const postData = {
      emailId: getCookie("userMail") ?? "",
    };
    setTimeout(() => {
      setDisableResendEmail(false);
    }, THREE_MINUTES);
    //trigger api call only if verification email is in enabled state
    if (!disableResendEmail) await triggerForgotPasswordEmail(postData);
  }

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div>
              <h4>Forgot Password?</h4>
              <form onSubmit={formik.handleSubmit}>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={
                    "Input the code received in your registered email address"
                  }
                  name="code"
                  value={formik.values.code}
                  isInvalid={!!(formik.touched.code && formik.errors.code)}
                  placeholder={"Enter code"}
                  required
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.code}
                  showError={formik.touched.code && formik.errors.code}
                />
                <br />
                <br />
                <CustomButton
                  buttonName={"Verify"}
                  buttonType={buttonType.SECONDARY}
                  actionType="submit"
                  inputButton
                />
                <br />
                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                  <a
                    href="#"
                    className={
                      disableResendEmail
                        ? `${"contrast"} ${"disabledNavigationLink"}`
                        : "contrast"
                    }
                    onClick={() => resendVerificationCode()}
                  >
                    Send verification email again
                  </a>
                  {/* <div
                    onClick={() => resendVerificationCode()}
                    style={{ cursor: "pointer" }}
                  >
                    Send verification email again
                  </div> */}
                </p>
                <p style={{ textAlign: "center" }}>
                  <a className="contrast" href="/user/forgot-password">
                    I have entered an incorrect email address
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdatePassword;
