"use client";
import GooglePlacesInput from "@/components/GooglePlaces";
import PhoneInputField from "@/components/phoneNumberInput";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { isValidPhoneNumber } from "react-phone-number-input";
import { setUserDetails } from "@/redux/slices/userRegistrationSlice";
import { useEffect } from "react";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import _ from "lodash";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";

const validationSchema = Yup.object().shape({
  FirstName: Yup.string().required("First Name is required"),
  LastName: Yup.string().required("Last Name is required"),
  Position: Yup.string().required("Position/Title is required"),
  Address: Yup.string().required("Address is required"),
  PhoneNumber: Yup.string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "Please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
});

export default function RegistrationDetails() {
  const router = useRouter();

  const dispatch = useAppDispatch();

  const { userDetails }: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  useEffect(() => {
    if (_.isEmpty(userDetails)) {
      router.push(AppRoutes.USER_SIGNUP);
    }
  }, [userDetails]);

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
      router.push(AppRoutes.USER_PROFILE_UPLOAD);
    },
  });

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here

    const placeDetailsString = JSON.stringify(placeDetails);
    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetails?.fullAddress);
    dispatch(setUserDetails({ ...userDetails, ...placeDetails }));
  };

  const handlePreviousClick = () => {
    router.push("/user/registration/signup");
  };

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div className="pt_login">
              <h4>Your details</h4>
              <p>Please provide a few further details</p>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"First name "}
                name={"FirstName"}
                error={formik.errors.FirstName}
                showError={formik.touched.FirstName && formik.errors.FirstName}
                required={true}
                disableAutoComplete={true}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "FirstName",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("FirstName")}
                value={formik.values.FirstName}
              />
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Last name "}
                name={"LastName"}
                error={formik.errors.LastName}
                showError={formik.touched.LastName && formik.errors.LastName}
                required={true}
                disableAutoComplete={true}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "LastName",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("LastName")}
                value={formik.values.LastName}
              ></FormikControl>
              <br />
              <br />
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Position/title "}
                name={"Position"}
                error={formik.errors.Position}
                showError={formik.touched.Position && formik.errors.Position}
                required={true}
                disableAutoComplete={true}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "Position",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Position")}
                value={formik.values.Position}
              ></FormikControl>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Occupation "}
                name={"Occupation"}
                error={formik.errors.Occupation}
                showError={
                  formik.touched.Occupation && formik.errors.Occupation
                }
                disableAutoComplete={true}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "Occupation",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Occupation")}
                value={formik.values.Occupation}
              ></FormikControl>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Company "}
                name={"Company"}
                error={formik.errors.Company}
                showError={formik.touched.Company && formik.errors.Company}
                disableAutoComplete={true}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "Company",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur("Company")}
                value={formik.values.Company}
              ></FormikControl>
              <br />
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

              <label htmlFor="address">
                <small>
                  Address <span className="required">*</span>
                </small>
              </label>
              <div className={`google-places-field`}>
                <GooglePlacesInput
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    !!(formik.touched.Address && formik.errors.Address)
                  }
                  value={formik.values.Address}
                  onChange={handlePlacesInputChange}
                  onBlur={formik.handleBlur("Address")}
                />
                {formik.touched.Address &&
                formik.errors.Address &&
                typeof formik.errors.Address === "string" ? (
                  <div className={"error_wrap"}>
                    <small className={"invalid"}>
                      <i className="fa-light fa-circle-x" />
                      {formik.errors.Address}
                    </small>
                  </div>
                ) : null}
              </div>
              <br />
              <br />
              <div className="button-container">
                <CustomButton
                  buttonName={"Previous"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="submit"
                  onClick={() => router.push(AppRoutes.USER_LOGIN)}
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
