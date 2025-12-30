"use client";

import React, { useEffect, useState } from "react";
import styles from "./legalBusinessPage.module.scss";
import { Row, Col, Form, Container } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "react-toastify";
import { CheckCompanyEmailExistence } from "@/app/api/existanceAPIsCheck";
import { useCustomDebounce } from "@/common/commonHooks";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";

const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required")
    .test("unique", "Email Id already exists", async function (value) {
      try {
        if (!value || value.trim().length < 5) return true; // Handle empty email
        return true;
      } catch (error) {
        // Handle errors
        console.error("Error checking company email existence:", error);
        // You may want to display an error message to the user
        throw new Error("Error checking company email existence");
      }
    }),
  Address: Yup.string().required("Address is required"),
  PhoneNumber: Yup.string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
});

const LegalBusinessPage = () => {
  const router = useRouter();

  const dispatch = useAppDispatch();
  const [emailid, setEmailId] = useState<string>("");
  const debouncedemailid = useCustomDebounce(emailid, 700);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const checkEmailId = async () => {
      if (debouncedemailid) {
        const companyEmailExistenceResponse = await CheckCompanyEmailExistence(
          debouncedemailid
        );
        if (companyEmailExistenceResponse === "Business email already exists") {
          setEmailError("Business email already exists");
        } else if (
          companyEmailExistenceResponse ===
          "Personal and Business email cannot be same."
        ) {
          setEmailError("Personal and Business email cannot be same.");
        } else {
          setEmailError(null);
        }
      }
    };
    checkEmailId();
  }, [debouncedemailid]);

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails?.companyDetails
  );

  useEffect(() => {
    if (_.isEmpty(companyDetails)) {
      router.push(ApplicationURLS.USER_BUSINESS_REGISTRATIONPAGE);
    }
  }, [companyDetails]);

  const formik = useFormik({
    initialValues: {
      Email: companyDetails?.Email || "",
      Address: companyDetails?.Address || "",
      PhoneNumber: companyDetails?.PhoneNumber || "",
    },
    validationSchema,
    onSubmit: async (values) => {
      if (emailError) {
        return;
      }
      try {
        // Proceed with form submission
        router.push("/user/registration/tax");
        const currentTime =
          new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";
        const combinedDetails = {
          ...companyDetails,
          ...values,
          DateTime: currentTime,
        };
        dispatch(setCompanyDetails(combinedDetails));
      } catch (error) {
        // Handle errors
        console.error("Error occurred while processing the request:", error);
        // You may want to display an error message to the user
        toast.error("Error occurred while processing the request");
      }
    },
  });

  useEffect(() => {
    // Clear qbccError when formik errors are cleared
    if (!formik.errors.Email) {
      setEmailError(null);
    }
  }, [formik.errors.Email]);

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here
    const placeDetailsString = JSON.stringify(placeDetails);

    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetails?.fullAddress);
    dispatch(setCompanyDetails({ ...companyDetails, ...placeDetails }));
  };

  const handlePreviousClick = () => {
    router.push("/user/registration/business-profile");
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>
                {`How do we contact Legal Business Name`}
              </h5>
              <div className={styles.textFieldStyles}>
                <label className={styles.addresstextFieldStyles}>
                  Registered Address *
                </label>
                <div className={styles.instructionText}>Search location</div>
                <GooglePlacesInput
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    formik.touched.Address && formik.errors.Address
                      ? true
                      : false
                  }
                  value={formik.values.Address}
                  onChange={handlePlacesInputChange}
                  onBlur={formik.handleBlur("Address")}
                />
                {formik.touched.Address &&
                formik.errors.Address &&
                typeof formik.errors.Address === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Address}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  labelText="Email *"
                  name="Email"
                  id="Email"
                  value={formik.values.Email}
                  onChange={(e) => {
                    formik.setFieldValue(
                      "Email",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    );
                    setEmailId(e.target.value);
                  }}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Email && formik.errors.Email
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Email &&
                formik.errors.Email &&
                typeof formik.errors.Email === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Email}
                  </div>
                ) : null}
                {(emailError && (
                  <div className={styles.errorText}>{emailError}</div>
                )) ||
                  null}
              </div>
              <div className={styles.textFieldStyles}>
                <label className={styles.textFieldStyles}>Phone Number *</label>

                <PhoneInputField
                  id="PhoneNumber"
                  name="PhoneNumber"
                  error={
                    formik.touched.PhoneNumber && formik.errors.PhoneNumber
                      ? true
                      : false
                  }
                  value={formik.values.PhoneNumber}
                  onChange={formik.handleChange("PhoneNumber")}
                  onBlur={formik.handleBlur("PhoneNumber")}
                  // onPhoneNumberValidChange={handlePhoneValidityChange}
                  showErrorIcon={Boolean(
                    formik.touched.PhoneNumber && formik.errors.PhoneNumber
                  )}
                />
                {formik.touched.PhoneNumber &&
                formik.errors.PhoneNumber &&
                typeof formik.errors.PhoneNumber === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.PhoneNumber}
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

export default LegalBusinessPage;
