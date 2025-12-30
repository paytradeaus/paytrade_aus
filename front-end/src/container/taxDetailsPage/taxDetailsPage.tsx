"use client";

import React, { useEffect } from "react";
import styles from "./taxDetailsPage.module.scss";
import { Row, Col, Form, Container } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
// import { useRouter } from "next/navigation";

import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { insertEmailVerificationDetails } from "@/app/api/CompanyRegistrationServices";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";

const validationSchema = Yup.object().shape({
  ACN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  ABN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  TFN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
});

const TaxDetailsPage = () => {
  const router = useRouter();

  const dispatch = useAppDispatch();

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails?.companyDetails
  );
  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  useEffect(() => {
    if (_.isEmpty(companyDetails)) {
      router.push(ApplicationURLS.USER_BUSINESS_REGISTRATIONPAGE);
    }
  }, [companyDetails]);

  const formik = useFormik({
    initialValues: {
      ACN: companyDetails?.values?.ACN || "",
      ABN: companyDetails?.values?.ABN || "",
      TFN: companyDetails?.values?.TFN || "",
    },
    validationSchema,
    onSubmit: async (values) => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        var decodedToken: any = jwtDecode(accessToken);
        const details = {
          user_id: decodedToken["userId"],
          email_id: decodedToken["emailId"],
          first_name: decodedToken["userFirstName"],
          last_name: decodedToken["userLastName"],
          company_name: companyDetails?.Name,
          company_email_id: companyDetails?.Email,
          mail_type: "Verify_Company",
          type: "Send",
        };
        try {
          // Call the function to insert email verification details
          const response = await insertEmailVerificationDetails(details);
          dispatch(
            setCompanyDetails({
              ...companyDetails,
              ...details,
              values,
            })
          );

          // Handle the response as needed
          if (response) {
            toast.success(
              "Please use OTP received in email to verify your business"
            );
            // You can perform other actions or navigate based on the response

            router.push("/user/registration/company-verification");
          }
        } catch (error) {
          // Handle errors
          console.error("Error in insertEmailVerificationDetails:", error);
          // You may want to display an error message to the user
        }
      }
    },
  });

  const handlePreviousClick = () => {
    router.push("/user/registration/contact-business");
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>
                {`Please confirm the tax details for Legal Business Name`}
              </h5>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="ACN (if applicable)"
                  name="ACN"
                  id="ACN"
                  maxLength={9}
                  value={formik.values.ACN}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "ACN",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.ACN && formik.errors.ACN
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                  endingData={
                    formik.touched.ACN && formik.errors.ACN ? (
                      <XCircle
                        className={styles.errorIcon}
                        onClick={() => {
                          formik.setFieldValue("ACN", ""); // Clear the Name field on icon click if desired
                        }}
                      />
                    ) : null
                  }
                />
                {formik.touched.ACN &&
                formik.errors.ACN &&
                typeof formik.errors.ACN === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.ACN}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="ABN (if applicable)"
                  name="ABN"
                  id="ABN"
                  maxLength={11}
                  value={formik.values.ABN}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "ABN",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.ABN && formik.errors.ABN
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                  endingData={
                    formik.touched.ABN && formik.errors.ABN ? (
                      <XCircle
                        className={styles.errorIcon}
                        onClick={() => {
                          formik.setFieldValue("ABN", ""); // Clear the Name field on icon click if desired
                        }}
                      />
                    ) : null
                  }
                />
                {formik.touched.ABN &&
                formik.errors.ABN &&
                typeof formik.errors.ABN === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.ABN}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="TFN (if applicable)"
                  name="TFN"
                  id="TFN"
                  maxLength={9}
                  value={formik.values.TFN}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "TFN",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.TFN && formik.errors.TFN
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                  endingData={
                    formik.touched.TFN && formik.errors.TFN ? (
                      <XCircle
                        className={styles.errorIcon}
                        onClick={() => {
                          formik.setFieldValue("TFN", ""); // Clear the Name field on icon click if desired
                        }}
                      />
                    ) : null
                  }
                />
                {formik.touched.TFN &&
                formik.errors.TFN &&
                typeof formik.errors.TFN === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.TFN}
                  </div>
                ) : null}
              </div>
              <FormButton className={styles.buttonStyles} type="submit">
                Next
              </FormButton>
              <FormButton
                className={styles.PreviousButtonStyles}
                type="button"
                onClick={handlePreviousClick}
                textPlainBtn
              >
                Previous
              </FormButton>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default TaxDetailsPage;
