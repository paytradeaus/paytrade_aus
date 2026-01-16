import React, { useEffect, useRef, useState } from "react";
import { buttonType, EMAIL_REGEX, InputType } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import CustomButton from "@/components/CustomButton/CustomButton";
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { postUserData } from "./getSupport.functions";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import ReCaptchaComponent from "../../../components/GoogleRecaptcha/index";
import { useTokenDetails } from "@/hooks";

export default function SupportPage() {
  const reCaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [disableField, setDisableField] = useState<boolean>(false);

  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (recaptchaToken) {
      handleSubmit();
    }
  }, [recaptchaToken]);

  useEffect(() => {
    const { decodeTokenData } = useTokenDetails();
    if (decodeTokenData) {
      formik.setValues({
        ...formik.values,
        firstName: decodeTokenData?.userFirstName,
        lastName: decodeTokenData?.userLastName,
        email: decodeTokenData?.emailId,
      });
      setDisableField(true);
    } else {
      setDisableField(false);
    }
  }, []);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required("Please enter your first name"),
    lastName: Yup.string().required("Please enter your last name"),
    companyName: Yup.string().notRequired(),
    email: Yup.string()
      .email("Please enter a valid email address")
      .matches(EMAIL_REGEX, "Please enter a valid email address")
      .required("Please enter your email address"),
    message: Yup.string().required("Please enter a message"),
  });

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      message: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      verifyButtonRef?.current?.click();
    },
  });

  async function handleSubmit() {
    const postData = {
      name: `${formik.values.firstName} ${formik.values.lastName}`.trim(),
      companyName: formik.values.companyName,
      email: formik.values.email,
      message: formik.values.message,
      recaptcha_token: recaptchaToken ?? "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    await postUserData(postData)
      .then((data: any) => {
        console.log("🚀 ~ handleSubmit ~ data:", data);
        if (data?.data?.RaiseATicket?.status === SUCCESS) {
          showSuccessToast(
            "We have received your query. Paytrade team will contact you soon."
          );
        } else {
          showErrorToast(SOMETHING_WENT_WRONG);
        }
        router.back();
      })
      .catch((error: any) => console.log("~ handleSubmit ~ error:", error));
    setIsSubmitting(false); // Re-enable the button once the request is complete
  }

  function handleReCaptchaVerify(token: string) {
    setRecaptchaToken(token);
  }

  function handleReCaptchaError(error: string) {
    showErrorToast(error);
    setIsSubmitting(false);
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={reCaptchaKey}>
      <main>
        <div className="pt_centered">
          <div className="pt_centeredinner">
            <div>
              <div className="pt_box_transparent">
                <div className="pt_topfilters">
                  <div className="pt_pageactions">
                    <CustomButton
                      actionType="button"
                      buttonName="Close"
                      buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                      onClick={() => router.back()}
                      iconClassName={"fa-light fa-xmark-large"}
                    />
                  </div>
                </div>
                <div className="grid">
                  <div className="pt_login">
                    <h1>Get support</h1>
                    <h5>
                      Please get in touch with our support team with any
                      enquiries.
                    </h5>
                    <div>
                      With PayTrade you get free online support from our
                      customer support team. When you're looking for answers,
                      start by searching the support guides. If you still have a
                      question, login and raise a support case.
                    </div>
                    <br />
                    <ReCaptchaComponent
                      onVerify={handleReCaptchaVerify}
                      onError={handleReCaptchaError}
                      verifyButtonRef={verifyButtonRef}
                    />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"First name"}
                        placeholder="Enter your first name"
                        name="firstName"
                        required
                        value={formik.values.firstName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.firstName}
                        showError={
                          formik.touched.firstName && formik.errors.firstName
                        }
                        disableAutoComplete={false}
                        disabled={disableField}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Last name"}
                        placeholder="Enter your last name"
                        name="lastName"
                        required
                        value={formik.values.lastName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.lastName}
                        showError={
                          formik.touched.lastName && formik.errors.lastName
                        }
                        disableAutoComplete={false}
                        disabled={disableField}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Email"}
                        name="email"
                        placeholder="Enter your email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.email}
                        showError={formik.touched.email && formik.errors.email}
                        required
                        disableAutoComplete={false}
                        disabled={disableField}
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Company"}
                        placeholder="Enter business name"
                        name="companyName"
                        value={formik.values.companyName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disableAutoComplete={false}
                      />
                      <FormikControl
                        control={InputType.TEXT_AREA}
                        label={"Please let us know how we can help you"}
                        name="message"
                        required
                        value={formik.values.message}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.errors.message}
                        showError={
                          formik.touched.message && formik.errors.message
                        }
                        placeholder="Your message"
                      />
                      <br />
                      <CustomButton
                        buttonName={"Send support request"}
                        buttonType={buttonType.SECONDARY}
                        actionType="submit"
                        inputButton
                        disabled={isSubmitting}
                      />
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </GoogleReCaptchaProvider>
  );
}
