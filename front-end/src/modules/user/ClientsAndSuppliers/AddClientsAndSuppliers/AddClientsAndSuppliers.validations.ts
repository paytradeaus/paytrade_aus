import { EMAIL_REGEX } from "@/shared/constant/general";
import * as yup from "yup";

// Permissive phone check: accepts any string that looks plausibly like a
// phone number (optional leading +, at least 6 digits, may contain spaces,
// dashes, parentheses). Replaces strict libphonenumber-based validation
// because Xero contacts routinely carry free-form numbers (incl. short
// toll-free strings like "+1 800 314 659") that the strict validator
// rejects, blocking save on contacts that were perfectly importable.
const isAcceptablePhoneNumber = (value: string | undefined | null): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!/^[+\d][\d\s()\-]*$/.test(s)) return false;
  return (s.match(/\d/g) || []).length >= 6;
};

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
  // Task #154 — soft-fail flag from inbound Xero contact import; drives the
  // "Missing email" warning badge on the email field.
  needs_email: false,
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
      isAcceptablePhoneNumber(value)
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

  // Bank details are optional at contact level. They're only needed when money
  // is actually paid OUT to the contact (e.g. an overpayment refund to a
  // client), so presence is enforced at that point in the backend payment
  // validator instead of being forced here. See payments.validator.ts
  // ('Overpayment refund to client').
  account_type: yup.string().notRequired(),

  account_name: yup.string().notRequired(),

  bsb_number: yup
    .string()
    .notRequired()
    .matches(/^[0-9]*$/, "Only numbers allowed"),

  account_number: yup.string().notRequired(),
  account_details: yup.array().notRequired(),
});

export { initialValues, validationSchema };
