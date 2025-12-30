"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Container, Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./userDetailsPage.module.scss";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import { ExclamationTriangleFill, XCircle } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setUserDetails } from "@/redux/slices/userRegistrationDetails";
import { isValidPhoneNumber } from "react-phone-number-input";
import { ApplicationURLS } from "@/common/applicationURLS";
import _ from "lodash";

const validationSchema = Yup.object().shape({
  FirstName: Yup.string().required("First Name is required"),
  LastName: Yup.string().required("Last Name is required"),
  Position: Yup.string().required("Position/Title is required"),
  Address: Yup.string().required("Address is required"),
  PhoneNumber: Yup.string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
});

function UserDetailsPage() {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY || "";
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const verifyButtonRef = useRef<HTMLButtonElement | null>(null);

  const dispatch = useAppDispatch();

  const { userDetails }: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  useEffect(() => {
    if (_.isEmpty(userDetails)) {
      router.push(ApplicationURLS.USER_SIGNUP);
    }
  }, [userDetails]);

  const handleReCaptchaVerify = (token: string) => {
    // Handle the reCAPTCHA token verification logic here

    setRecaptchaToken(token);
    // You can send this token to your server for verification or other actions
  };

  const formik = useFormik({
    initialValues: {
      FirstName: userDetails?.FirstName || "",
      LastName: userDetails?.LastName || "",
      Position: userDetails?.Position || "",
      Occupation: userDetails?.Occupation || "",
      Company: userDetails?.Company || "",
      Address: userDetails?.fullAddress || "",
      PhoneNumber: userDetails?.PhoneNumber || "",
    },
    validationSchema,
    onSubmit: () => {
      const currentTime =
        new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";

      const combinedDetails = {
        ...formik.values,
        DateTime: currentTime,
        ...userDetails,
      };

      dispatch(setUserDetails(combinedDetails));

      router.push("/user/registration/profile-upload");
    },
  });

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here

    const placeDetailsString = JSON.stringify(placeDetails);

    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetailsString);
    dispatch(setUserDetails({ ...userDetails, ...placeDetails }));
  };

  const handlePreviousClick = () => {
    router.push("/user/registration/signup");
  };

  return (
    <Container fluid>
      <Row>
        <Col className={styles.signInForm}>
          <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
            <h5 className={styles.title}>Your Details</h5>

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="text"
                labelText="First Name *"
                id="FirstName"
                name="FirstName"
                onChange={(e) =>
                  formik.setFieldValue(
                    "FirstName",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("FirstName")}
                value={formik.values.FirstName}
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputFieldControl}
                isInvalid={
                  !!(formik.touched.FirstName && formik.errors.FirstName)
                }
              />

              {formik.touched.FirstName &&
              formik.errors.FirstName &&
              typeof formik.errors.FirstName === "string" ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.FirstName}
                </div>
              ) : null}
            </div>

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="text"
                labelText="Last Name *"
                id="LastName"
                name="LastName"
                onChange={(e) =>
                  formik.setFieldValue(
                    "LastName",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("LastName")}
                value={formik.values.LastName}
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputFieldControl}
                isInvalid={
                  !!(formik.touched.LastName && formik.errors.LastName)
                }
              />

              {formik.touched.LastName &&
              formik.errors.LastName &&
              typeof formik.errors.LastName === "string" ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.LastName}
                </div>
              ) : null}
            </div>

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="text"
                labelText="Position/Title *"
                id="Position"
                name="Position"
                onChange={(e) =>
                  formik.setFieldValue(
                    "Position",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Position")}
                value={formik.values.Position}
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputFieldControl}
                isInvalid={
                  !!(formik.touched.Position && formik.errors.Position)
                }
              />

              {formik.touched.Position &&
              formik.errors.Position &&
              typeof formik.errors.Position === "string" ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.Position}
                </div>
              ) : null}
            </div>

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="text"
                labelText="Occupation"
                id="Occupation"
                name="Occupation"
                onChange={(e) =>
                  formik.setFieldValue(
                    "Occupation",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Occupation")}
                value={formik.values.Occupation}
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputFieldControl}
                isInvalid={
                  !!(formik.touched.Occupation && formik.errors.Occupation)
                }
              />

              {formik.touched.Occupation &&
              formik.errors.Occupation &&
              typeof formik.errors.Occupation === "string" ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.Occupation}
                </div>
              ) : null}
            </div>

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder=""
                type="text"
                labelText="Company"
                id="Company"
                name="Company"
                onChange={(e) =>
                  formik.setFieldValue(
                    "Company",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Company")}
                value={formik.values.Company}
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputFieldControl}
              />
            </div>
            <div className={styles.textFieldStyles}>
              <label className={styles.textFieldStyles}>Phone Number *</label>

              <PhoneInputField
                id="PhoneNumber"
                name="PhoneNumber"
                error={
                  !!(formik.touched.PhoneNumber && formik.errors.PhoneNumber)
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
            <div className={styles.textFieldStyles}>
              <label className={styles.addresstextFieldStyles}>Address *</label>
              <div className={styles.instructionText}>Search location</div>
              <GooglePlacesInput
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                isInvalid={!!(formik.touched.Address && formik.errors.Address)}
                value={formik.values.Address}
                // onChange={formik.handleChange("Address")}
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

            <FormButton className={styles.buttonStyles} type="submit">
              Next
            </FormButton>
            <FormButton
              className={styles.PreviousButtonStyles}
              type="button"
              textPlainBtn
              onClick={handlePreviousClick}
            >
              Previous
            </FormButton>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default UserDetailsPage;
