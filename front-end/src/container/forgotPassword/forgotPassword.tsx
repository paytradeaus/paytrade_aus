//default imports
"use client";
//import from reactstrap components
import { Col, Container, Row, Form } from "react-bootstrap";
//import from customized components
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
//import customized styles
import styles from "./forgotPassword.module.scss";
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
//import from constants and services
import { triggerForgotPasswordEmail } from "@/app/api/LoginServices";
import Link from "next/link";
import { useLoaderContext } from "@/context/useLoader";
import { EMAIL_REGEX } from "@/common/constants/general";
import { ApplicationURLS } from "@/common/applicationURLS";
//module level constants and interfaces

interface FormData {
  emailId: string;
}

function ForgotPassword() {
  //useState and Effect Management
  const { setLoader }: any = useLoaderContext();
  //other Hooks
  const router = useRouter();

  //Formik Handling
  const validationSchema = Yup.object().shape({
    emailId: Yup.string()
      .email("Invalid email format")
      .matches(EMAIL_REGEX, "Invalid email format")
      .required("Email address is required"),
  });

  const formik = useFormik({
    initialValues: {
      emailId: "",
    },
    validationSchema,
    onSubmit: (values) => handleSubmit(values),
  });

  //functions
  async function handleSubmit(values: FormData) {
    setLoader(true);
    await triggerForgotPasswordEmail(values)
      .then((res: any) => {
        if (res) {
          setCookie("userMail", values?.emailId);
          router.push(ApplicationURLS.USER_VERIFY_CODE);
        }
      })
      .catch((error: any) => console.log("~ handleSubmit ~ error:", error))
      .finally(() => setLoader(false));
  }

  //render Template
  return (
    <Container fluid>
      <Row className={styles.card}>
        <Form onSubmit={formik.handleSubmit}>
          <Col xs={12}>
            <p className={styles.title}>Forgot Password?</p>
          </Col>
          <Col xs={12}>
            <p className={styles.formLabel}>Input email address to send code</p>
          </Col>
          <Col xs={12}>
            <TextField
              placeholder="Enter the Email Address"
              errorText={formik.errors.emailId}
              isInvalid={!!(formik.touched.emailId && formik.errors.emailId)}
              name="emailId"
              value={formik.values.emailId}
              onChange={formik.handleChange} // value={formik.values.email}
              onBlur={formik.handleBlur}
              classNames={styles.inputFieldControl}
            />
          </Col>
          <Col xs={12} className="mt-4">
            <div className="text-center">
              <FormButton type={"submit"} className={styles.buttonStyles}>
                Send Code
              </FormButton>
            </div>
          </Col>
          <Col xs={12} className="d-flex justify-content-center mt-3">
            <p className={styles.hintQuestionText}> New to Pay Trade?</p>

            <Link
              href={ApplicationURLS.USER_SIGNUP}
              className={styles.hintAnswerText}
            >
              Create an account
            </Link>
          </Col>
          <Col xs={12} className="d-flex justify-content-center">
            <p className={styles.hintQuestionText}>Already registered?</p>

            <Link
              href={ApplicationURLS.USER_LOGIN}
              className={styles.hintAnswerText}
            >
              Login
            </Link>
          </Col>
        </Form>
      </Row>
    </Container>
  );
}

export default ForgotPassword;
