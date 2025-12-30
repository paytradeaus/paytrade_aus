import {
  CheckCompanyEmailExistence,
  CheckQbccExistence,
} from "@/network/apolloClient";
import { isValidPhoneNumber } from "react-phone-number-input";
import * as yup from "yup";

const initialValues = {
  Name: "",
  BusinessName: "",
  EntityType: "",
  Address: "",
  PhoneNumber: "",
  Email: "",
  Qbccno: "",
  ACN: "",
  ABN: "",
  TFN: "",
  Subscription: "",
  SubscriptionType: "Basic",
  TrustTrainingRecord: "",
  CookiePreferences: "",
  trainingRecordName: "",
  trainingRecordDate: "",
  signature_type: "",
  trainingRecordFile: null,
  isTrainingFieldsRequired: false,
  notices: true,
  compliance: true,
};

const validationSchema = yup.object().shape({
  Name: yup.string().required("Name is required"),
  // BusinessName: yup.string().required("Please provide a business name"),
  TrustTrainingRecord: yup.string(),

  Qbccno: yup
    .string()
    .notRequired()
    .matches(/^[0-9]+$/, "Only numbers are allowed")
    .test(
      "unique",
      "This QBCC is associated with another business",
      async function (value, formData) {
        const { existingQbcc, editMode } = formData.parent;

        if (
          !value?.trim() ||
          value?.trim().length < 7 ||
          (editMode && existingQbcc === value)
        )
          return true; // Handle empty email

        const QBCCNOExists = await CheckQbccExistence(value);
        if (QBCCNOExists) {
          return this.createError({
            path: this.path,
            message: "This QBCC is associated with another business.",
          });
        }
        return true; // QBCC number is unique
      }
    ),
  EntityType: yup.string().required("Entity type is required"),
  // SubscriptionType: yup.string().required("Subscription type is required"),
  Address: yup.string().required("Address is required"),
  PhoneNumber: yup
    .string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
  Email: yup
    .string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required")
    .test(
      "unique",
      "Email Id already exists",
      async function (value, formData: any) {
        const { existingEmail, editMode } = formData.parent;

        try {
          if (
            !value ||
            value.trim().length < 5 ||
            (editMode && existingEmail === value)
          )
            return true; // Handle empty email
          // Call the function to check company email existence
          const companyEmailExistenceResponse =
            await CheckCompanyEmailExistence(value);
          // Check if the email already exists
          if (
            companyEmailExistenceResponse === "Business email already exists"
          ) {
            return this.createError({
              path: this.path,
              message: "Business email already exists",
            });
          }
          if (
            companyEmailExistenceResponse ===
            "Personal and Business email cannot be same."
          ) {
            return this.createError({
              path: this.path,
              message: "Personal and Business email cannot be same.",
            });
          }
          return true;
        } catch (error) {
          // Handle errors
          // You may want to display an error message to the user
          throw new Error("Error checking company email existence");
        }
      }
    ),

  ACN: yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  ABN: yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),
  TFN: yup.string().matches(/^[0-9]+$/, "Only numbers are allowed"),

  trainingRecordName: yup
    .string()
    .when("isTrainingFieldsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.string().required("Name is required");
      } else {
        return yup.string().notRequired();
      }
    }),

  trainingRecordDate: yup
    .string()
    .when("isTrainingFieldsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.string().required("Date is required");
      } else {
        return yup.string().notRequired();
      }
    }),

  trainingRecordFile: yup
    .array()
    .when("isTrainingFieldsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.array().required("File is required");
      } else {
        return yup.array().notRequired();
      }
    }),
  signature: yup.string().notRequired(),
});

export { initialValues, validationSchema };
