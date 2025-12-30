"use client";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { jwtDecode } from "jwt-decode";
import _ from "lodash";
import { showSuccessToast } from "@/components/Toaster";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";

import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { insertEmailVerificationDetails } from "@/network/existanceAPIsCheck";

const validationSchema = Yup.object().shape({
  ACN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  ABN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  TFN: Yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
});

export default function TaxRegistrationForm() {
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
      router.push(AppRoutes.REGISTRATION_ADD_BUSINESS_PROFILE);
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
            showSuccessToast(
              "Please use OTP received in email to verify your business"
            );
            // You can perform other actions or navigate based on the response
            router.push(AppRoutes.USER_COMPANY_VERIFICATION);
          }
        } catch (error) {
          // Handle errors
          console.error("Error in insertEmailVerificationDetails:", error);
          // You may want to display an error message to the user
        }
      }
    },
  });

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid">
            <div className="pt_login">
              <h4>Please confirm the tax details for legal business name</h4>

              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"ACN (if applicable)"}
                error={formik.errors.ACN}
                showError={formik.touched.ACN && formik.errors.ACN}
                required={false}
                inputMode="numeric"
                disableAutoComplete={false}
                name="ACN"
                id="ACN"
                maxLength={9}
                value={formik.values.ACN}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "ACN",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur}
              ></FormikControl>

              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"ABN (if applicable)"}
                error={formik.errors.ABN}
                showError={formik.touched.ABN && formik.errors.ABN}
                required={false}
                inputMode="numeric"
                disableAutoComplete={false}
                labelText="ABN (if applicable)"
                name="ABN"
                id="ABN"
                maxLength={11}
                value={formik.values.ABN}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "ABN",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur}
              ></FormikControl>

              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"TFN (if applicable)"}
                error={formik.errors.TFN}
                showError={formik.touched.TFN && formik.errors.TFN}
                required={false}
                inputMode="numeric"
                disableAutoComplete={false}
                name="TFN"
                id="TFN"
                maxLength={9}
                value={formik.values.TFN}
                onChange={(e: any) =>
                  formik.setFieldValue(
                    "TFN",
                    e.target.value.trim()
                      ? e.target.value
                      : e.target.value.trim()
                  )
                }
                onBlur={formik.handleBlur}
              ></FormikControl>

              <br />
              <br />
              <div className="button-container">
                <CustomButton
                  buttonName={"Previous"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="submit"
                  onClick={() => router.push(AppRoutes.USER_CONTACT_BUSINESS)}
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
