"use client";
//default imports
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
//import from reactstrap components
import { Button, Col, Form, Row } from "react-bootstrap";
import { ExclamationTriangleFill, XCircle } from "react-bootstrap-icons";
//import from customized components
import { FullScreenModal } from "@/components/FullScreenModal/FullScreenModal";
import TextField from "@/components/TextField/textField";
//import customized styles
import customStyles from "./contactUs.module.scss";
//import from external libraries
import * as Yup from "yup";
import { useFormik } from "formik";
import { toast } from "@/app/Toaster";
//import from constants, interfaces ,functions and services
import { EMAIL_REGEX } from "@/common/constants/general";
import { postUserData } from "./contactUs.function";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import ReCaptchaComponent from "../../components/googleRecaptchaWrapper/googleRecaptchaWrapper";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";
//module level constants and interfaces
const reCaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY ?? "";
const SUCCESS = "SUCCESS";
interface FormData {
  name: string;
  companyName: string;
  email: string;
  message: string;
}

export const ContactUs = () => {
  //useState and useEffect Management
  const [isFullScreenModalDisplay, setIsFullScreenModalDisplay] =
    useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (recaptchaToken) {
      handleSubmit();
    }
  }, [recaptchaToken]);
  //other Hooks
  const router = useRouter();

  //Formik Handling

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Please enter your name"),
    companyName: Yup.string().notRequired(),
    email: Yup.string()
      .email("Please enter valid email address")
      .matches(EMAIL_REGEX, "Please enter valid email address")
      .required("Please enter your email address"),
    message: Yup.string().required("Please enter message"),
  });

  const formik: any = useFormik({
    initialValues: {
      name: "",
      companyName: "",
      email: "",
      message: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      verifyButtonRef?.current?.click();
    },
  });

  //functions
  function handleNavigation() {
    setIsFullScreenModalDisplay(false);
    router.back();
  }

  async function handleSubmit() {
    const postData = {
      ...formik.values,
      recaptcha_token: recaptchaToken ?? "",
    };
    await postUserData(postData)
      .then((data: any) => {
        if (data?.data?.submitAContact?.status === SUCCESS) {
          toast.success(
            "We have received your query. Paytrade team will contact you soon."
          );
        } else {
          toast.error(SOMETHING_WENT_WRONG);
        }
        router.back();
      })
      .catch((error: any) => console.log("~ handleSubmit ~ error:", error));
  }

  function handleReCaptchaVerify(token: string) {
    // Handle the reCAPTCHA token verification logic here
    setRecaptchaToken(token);
  }

  //render Template
  return (
    <GoogleReCaptchaProvider reCaptchaKey={reCaptchaKey}>
      <FullScreenModal
        displayFullScreenModal={isFullScreenModalDisplay}
        onClose={() => handleNavigation()}
        closeButtonStyle={customStyles.modalCloseButton}
      >
        <Row className="pt-4 pb-1 px-5">
          <Col>
            <h2 className={customStyles.getInTouch}>
              get in <span>touch</span>{" "}
            </h2>
            <p className={customStyles.formContentStyle}>
              Our mission is to make construction trust administration and
              compliance for all parties to the construction industry simple.
              Speak to our team to get the most out of your integration. We can
              help you integrate your existing payment application and processes
              into the required project trust and retention trust accounts to
              remain compliant with the latest regulations and laws.
            </p>
          </Col>
          <Col>
            <ReCaptchaComponent
              onVerify={handleReCaptchaVerify}
              verifyButtonRef={verifyButtonRef}
            />
            <Form>
              <Form.Group className="mb-3" controlId="name">
                <TextField
                  labelText="YOUR NAME"
                  name="name"
                  id="name"
                  placeholder="Enter your name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  errorText={formik.errors.name}
                  isInvalid={!!(formik.touched.name && formik.errors.name)}
                  classNames={customStyles.inputStyles}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="company name">
                <TextField
                  labelText="COMPANY NAME"
                  name="companyName"
                  id="companyName"
                  placeholder="Enter company name"
                  value={formik.values.companyName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  classNames={customStyles.inputStyles}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="yourEmail">
                <TextField
                  labelText="YOUR EMAIL"
                  name="email"
                  id="email"
                  placeholder="Enter your email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  errorText={formik.errors.email}
                  isInvalid={!!(formik.touched.email && formik.errors.email)}
                  classNames={customStyles.inputStyles}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="message">
                <div className={customStyles.inputLabelStyle}>
                  <Form.Label>MESSAGE</Form.Label>
                </div>

                <Form.Control
                  id="message"
                  name="message"
                  as="textarea"
                  rows={3}
                  value={formik?.values?.message}
                  className={
                    formik.touched.message && formik.errors.message
                      ? `${customStyles.inputStyles} ${customStyles.errorInputField}`
                      : customStyles.inputStyles
                  }
                  onChange={(e: any) =>
                    formik.setFieldValue("message", e.target.value)
                  }
                  placeholder="Your message"
                />
                {formik.touched.message && formik.errors.message && (
                  <div className={customStyles.errorContainer}>
                    <ExclamationTriangleFill
                      className={customStyles.crossiconsSyles}
                    />
                    <span className={customStyles.errorTextStyles}>
                      {formik.errors.message}
                    </span>
                  </div>
                )}
              </Form.Group>
              <div className={customStyles.formButtonStyle}>
                <Button onClick={() => formik.handleSubmit()}>Submit</Button>
              </div>
            </Form>
          </Col>
        </Row>
      </FullScreenModal>
    </GoogleReCaptchaProvider>
  );
};
