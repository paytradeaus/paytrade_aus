"use client";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, EMAIL_REGEX, InputType } from "@/shared/constant/general";
import { setCookie } from "cookies-next";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useLoaderContext } from "@/context/useLoader";
import { triggerForgotPasswordEmail } from "./forgorPasswordFunction";

interface FormData {
  emailId: string;
}

function ForgotPassword() {
  const { setLoader }: any = useLoaderContext();
  const router = useRouter();

  const validationSchema = Yup.object().shape({
    emailId: Yup.string()
      .email("Invalid email address")
      .matches(EMAIL_REGEX, "Invalid email address")
      .required("Email address is required"),
  });

  const formik = useFormik({
    initialValues: {
      emailId: "",
    },
    validationSchema,
    onSubmit: (values) => handleSubmit(values),
  });

  async function handleSubmit(values: FormData) {
    if (formik.isValid) {
      setLoader(true);
      await triggerForgotPasswordEmail(values)
        .then((res: any) => {
          if (res) {
            setCookie("userMail", values?.emailId);
            router.push(AppRoutes.USER_VERIFY_CODE);
          }
        })
        .catch((error: any) => console.log("~ handleSubmit ~ error:", error))
        .finally(() => setLoader(false));
    }
  }

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div>
              <h4>Forgot password?</h4>
              <form onSubmit={formik.handleSubmit}>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Input email address to send code"}
                  name="emailId"
                  value={formik.values.emailId}
                  isInvalid={
                    !!(formik.touched.emailId && formik.errors.emailId)
                  }
                  placeholder={"Enter the email address"}
                  required
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.emailId}
                  showError={formik.touched.emailId && formik.errors.emailId}
                />
                <br />
                <br />
                <CustomButton
                  buttonName={"Send code"}
                  buttonType={buttonType.SECONDARY}
                  actionType="submit"
                  inputButton
                />
                <br />
                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                  New to pay trade?{" "}
                  <a className="contrast" href="/user/login">
                    Create an account
                  </a>
                </p>
                <p style={{ textAlign: "center" }}>
                  Already registered?{" "}
                  <a href="/user/login" className="contrast">
                    Login
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

export default ForgotPassword;
