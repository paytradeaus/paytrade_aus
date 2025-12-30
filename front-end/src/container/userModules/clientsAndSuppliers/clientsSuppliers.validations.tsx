import { EMAIL_REGEX } from "@/common/constants/general";
import { isValidPhoneNumber } from "react-phone-number-input";
import * as Yup from "yup";

export const addClientSuppliersSchema = Yup.object().shape({
  client_supplier_name: Yup.string()
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

  client_supplier_type: Yup.object().required("Client/Supplier is required"),
  related_entity: Yup.object().notRequired(),
  business_name: Yup.string()
    .max(150, "Maximum 150 characters allowed")
    .notRequired(),
  entity_type: Yup.object().required("Entity type is required"),
  client_supplier_address: Yup.string().required("Address is required"),
  // client_phone_no: Yup.number()
  //   .typeError("only numbers allowed")
  //   .required("Phone number is required"),
  client_phone_no: Yup.string()
    .required("Phone number is required")
    .test("is-valid-phone-number", "please enter valid phone number", (value) =>
      isValidPhoneNumber(value)
    ),
  client_email_id: Yup.string()
    .matches(EMAIL_REGEX, "Invalid email format")
    .required("Email address is required")
    .test("email", function (value, formData: any) {
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

  client_website: Yup.string().notRequired(),
  acn_number: Yup.number().typeError("Only numbers allowed").notRequired(),
  abn_number: Yup.number().typeError("Only numbers allowed").notRequired(),
  tfn_number: Yup.number().typeError("Only numbers allowed").notRequired(),

  qbcc_number: Yup.number()
    .typeError("only numbers allowed")
    .notRequired()
    .test("Qbcc", function (value, formData: any) {
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

  account_details: Yup.array().notRequired(),
  // .required("Account details is required")
  // .min(1, "Minimum 1 account should be added"),
  client_supplier_status: Yup.object().required("Status is required"),
});
