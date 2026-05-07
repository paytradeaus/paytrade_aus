import { EMAIL_REGEX } from "@/shared/constant/general";
import { isValidPhoneNumber } from "react-phone-number-input";
import * as yup from "yup";

const initialValues = {
  client_supplier_name: "",
  client_supplier_type: "",
  business_name: "",
  entity_type: "",
  client_supplier_address: "",
  client_phone_no: "",
  client_email_id: "",
  qbcc_number: "",
  acn_number: "",
  related_entity: "No",
  abn_number: "",
  tfn_number: "",
  client_supplier_status: { value: "Completed", label: "Completed" },
  latitude: "",
  longitude: "",
  place_id: "",
  region: "",
  country: "",
  account_details: "",
  // Phase 2 — per-contact Xero GST overrides.
  xero_sales_gst_setting: "",
  xero_purchases_gst_setting: "",
  // Task #41 — per-supplier default Xero account code (variable bill code mode).
  xero_default_account_code: "",
};

const validationSchema = yup.object().shape({
  client_supplier_name: yup
    .string()
    .required("Name is required")
    .test("client_supplier_name", function (value, formData: any) {
      const isNameExist = formData.parent.isNameExist;
      if (!value) return true; // Handle empty email
      if (isNameExist) {
        return formData.createError({
          path: formData.path,
          message: "Name already exist",
        });
      }
      return true;
    }),
  // BusinessName: yup.string().required("Please provide a business name"),
  TrustTrainingRecord: yup.string(),
  client_supplier_status: yup.object().required(""),
  client_supplier_type: yup.object().required("Client/Supplier is required"),
  related_entity: yup.string().required(""),
  qbcc_number: yup
    .number()
    .typeError("only numbers allowed")
    .notRequired()
    .test("Qbcc", function (value: any, formData: any) {
      const isQbccExist = formData.parent.isQbccExist;
      if (!value) return true; // Handle empty email
      if (isQbccExist) {
        return formData.createError({
          path: formData.path,
          message: "Qbcc number already exist",
        });
      }
      return true;
    }),
  entity_type: yup.object().required("Entity type is required"),
  client_supplier_address: yup.string().required("Address is required"),
  client_phone_no: yup
    .string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
  client_email_id: yup
    .string()
    .matches(EMAIL_REGEX, "Invalid email format")
    .required("Email address is required")
    .test("email", function (value: any, formData: any) {
      const isEmailExist = formData.parent.isEmailExist;
      if (!value) return true; // Handle empty email
      if (isEmailExist) {
        return formData.createError({
          path: formData.path,
          message: "Email already exist",
        });
      }
      return true;
    }),
  business_name: yup.string().nullable().optional(),
  acn_number: yup
    .string()
    .nullable()
    .optional()
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
  abn_number: yup
    .string()
    .nullable()
    .optional()
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
  tfn_number: yup
    .string()
    .nullable()
    .optional()
    .matches(/^[0-9]+$/, "Only numbers are allowed"),

  account_type: yup
    .string()
    .when("isPaymentDetailsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.string().required("Type is required");
      } else {
        return yup.string().notRequired();
      }
    }),

  account_name: yup
    .string()
    .when("isPaymentDetailsRequired", (fieldData: any) => {
      // New Fields
      if (fieldData[0]) {
        return yup.string().required("Name is required");
      } else {
        return yup.string().notRequired();
      }
    }),

  bsb_number: yup
    .number()
    .typeError("Only numbers allowed")
    .when("isPaymentDetailsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.number().required("BSB is required");
      } else {
        return yup.number().notRequired();
      }
    }),

  account_number: yup
    .string()
    .when("isPaymentDetailsRequired", (fieldData: any) => {
      if (fieldData[0]) {
        return yup.string().required("Number is required");
      } else {
        return yup.string().notRequired();
      }
    }),
  account_details: yup.array().notRequired(),
});

export { initialValues, validationSchema };
