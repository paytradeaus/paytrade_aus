"use client";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { isValidPhoneNumber } from "react-phone-number-input";
import _ from "lodash";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { showErrorToast } from "@/components/Toaster";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { useCustomDebounce } from "@/hooks";
import { CheckCompanyEmailExistence } from "@/network/apolloClient";
import GooglePlacesInput from "@/components/GooglePlaces";
import PhoneInputField from "@/components/PhoneNumberInput";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";

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
    .test("is-valid-phone-number", "Please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
});

export default function ContactBusinessForm() {
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
      router.push(AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE);
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
        router.push(AppRoutes.USER_TAX);
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
        showErrorToast("Error occurred while processing the request");
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

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div className="pt_login">
              <h4>How do we contact legal business name</h4>

              <label htmlFor="address">
                <small>
                  Registered address <span className="required">*</span>
                </small>
              </label>
              <div className={`google-places-field`}>
                <GooglePlacesInput
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  // isInvalid={
                  //   !!(formik.touched.Address && formik.errors.Address)
                  // }
                  value={formik.values.Address}
                  onChange={handlePlacesInputChange}
                  onBlur={formik.handleBlur("Address")}
                />
                {formik.touched.Address &&
                formik.errors.Address &&
                typeof formik.errors.Address === "string" ? (
                  <small className={"invalid"}>
                    <i className="fa-light fa-circle-x" />
                    {formik.errors.Address}
                  </small>
                ) : null}
              </div>

              <br />

              <div>
                <label htmlFor="phonenumber">
                  <small>
                    Phone number <span className="required">*</span>
                  </small>
                </label>
                <PhoneInputField
                  id="PhoneNumber"
                  name="PhoneNumber"
                  error={
                    !!(formik.touched.PhoneNumber && formik.errors.PhoneNumber)
                  }
                  value={formik.values.PhoneNumber}
                  onChange={formik.handleChange("PhoneNumber")}
                  onBlur={formik.handleBlur("PhoneNumber")}
                  showErrorIcon={Boolean(
                    formik.touched.PhoneNumber && formik.errors.PhoneNumber
                  )}
                ></PhoneInputField>
                {formik.touched.PhoneNumber &&
                formik.errors.PhoneNumber &&
                typeof formik.errors.PhoneNumber === "string" ? (
                  <small className={"invalid"}>
                    <i className="fa-light fa-circle-x" />
                    {formik.errors.PhoneNumber}
                  </small>
                ) : null}
              </div>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Email"}
                error={formik.errors.Email}
                showError={formik.touched.Email && formik.errors.Email}
                required={true}
                disableAutoComplete={false}
                maxLength={100}
                name="Email"
                id="Email"
                value={formik.values.Email}
                onChange={(e: any) => {
                  formik.setFieldValue(
                    "Email",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  );
                  setEmailId(e.target.value);
                }}
                onBlur={formik.handleBlur}
              ></FormikControl>
              {(emailError && (
                <small className="invalid">{emailError}</small>
              )) ||
                null}

              <br />
              <br />
              <div className="button-container">
                <CustomButton
                  buttonName={"Previous"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="submit"
                  onClick={() =>
                    router.push(AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE)
                  }
                  inputButton
                />
                <CustomButton
                  buttonName={"Next"}
                  buttonType={buttonType.SECONDARY}
                  actionType="submit"
                  onClick={formik.handleSubmit}
                  inputButton
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
