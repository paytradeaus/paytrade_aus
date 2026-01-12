import * as Yup from "yup";
import { getCookie } from "cookies-next";

import { tabTypes } from "./Payments.constants";
import { replaceDollarSymbol } from "@/utils";

const popupUserMode = getCookie("userMode") || "";

const initialValues = {
  claim_type: "",
  payment_claim_id: "",
  due_date: "",
  project_id: "",
  contract_id: "",
  client_supplier_id: "",
  payment_to: "",
  payment_type: "",
  total_amount: "",
  cash_retention: "",
  payment_from_account: "",
  payment_to_account: "",
  payment_amount: "",
  payment_date: "",
  retention_amount: null,
  retention_account: {},
  retention_release_date: null,
  is_retention_confirmed: false,
  is_paid_confirmed: false,
  is_received_confirmed: false,
  optional_attachment_ids: [],
  compulsory_attachment_ids: [],
  memo: "",
  third_party_payment_reason: "",
  payless_amount: "",
  outstanding_amount: 0,
  view_mode: false,
  formatted_claim_amount: "",
  formatted_payless_amount: "",
  formatted_payment_amount: "",
  formatted_retention_amount: "",
  formatted_total_amount: "",
  input_date: "",
  isOnboardingModelOpen: false,
  withHoldReson: "",
};

const paymentsSchema = () =>
  Yup.object().shape(
    {
      payment_to: Yup.string().notRequired(),
      payment_type: Yup.string().notRequired(),
      cash_retention: Yup.string().notRequired(),
      claim_type: Yup.string().notRequired(),
      view_mode: Yup.string().notRequired(),
      isOnboardingModelOpen: Yup.boolean().notRequired(),

      input_date: Yup.string().when(["payment_type"], (otherFieldData: any) => {
        if (
          otherFieldData[0] !== tabTypes.FULL &&
          otherFieldData[0] !== tabTypes.PART
        ) {
          return Yup.string().test(
            "input date",
            function (value, formData: any) {
              const isOnboardingModelOpen =
                formData.parent.isOnboardingModelOpen;

              if (popupUserMode && isOnboardingModelOpen) {
                return formData.createError({
                  path: formData.path,
                  message: "Input date is required",
                });
              }
              return true;
            }
          );
        }
        return Yup.string().notRequired(); // Return the schema without any additional validation
      }),

      payment_amount: Yup.string().when(
        ["payment_type", "payment_to", "cash_retention"],
        (formValue: any) => {
          if (
            formValue[0] !== tabTypes.PAY_LESS_ZERO &&
            formValue[1] !== tabTypes.THIRD_PARTY
          ) {
            return Yup.string()
              .required("Payment amount is required")
              .test("payment_amount", function (value, formData: any) {
                const {
                  claim_amount,
                  payment_type,
                  payless_amount,
                  outstanding_amount,
                  view_mode,
                } = formData.parent;

                if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payment amount should be greater than zero",
                  });
                } else if (
                  payment_type === tabTypes.FULL &&
                  formValue[2] !== tabTypes.RETENTION &&
                  (+replaceDollarSymbol(value) < claim_amount ||
                    +replaceDollarSymbol(value) > claim_amount)
                ) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payment amount should be equal to claim amount",
                  });
                } else if (
                  payment_type === tabTypes.PART &&
                  (+replaceDollarSymbol(value) >= claim_amount ||
                    +replaceDollarSymbol(value) >
                      outstanding_amount?.toFixed(2)) &&
                  view_mode === "false"
                ) {
                  const dynamicMessage =
                    +replaceDollarSymbol(value) >= claim_amount
                      ? "claim amount"
                      : "or equal to outstanding amount";
                  return formData.createError({
                    path: formData.path,
                    message: `Payment amount must be lesser than ${dynamicMessage}`,
                  });
                } else if (payment_type === tabTypes.PAY_LESS_PART) {
                  if (
                    +replaceDollarSymbol(value) >=
                    +replaceDollarSymbol(payless_amount)
                  ) {
                    return formData.createError({
                      path: formData.path,
                      message:
                        "Payment amount should be lesser than payless amount",
                    });
                  } else if (
                    +replaceDollarSymbol(value) >
                      outstanding_amount?.toFixed(2) &&
                    view_mode === "false"
                  ) {
                    return formData.createError({
                      path: formData.path,
                      message:
                        "Payment amount should be lesser than outstanding amount",
                    });
                  }
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),
      payment_date: Yup.string().when(
        ["payment_type", "payment_to"],
        (formValue: any) => {
          // Check if paymentType is not PAY_LESS_ZERO and paymentAmount is empty
          if (
            formValue[0] !== tabTypes.PAY_LESS_ZERO &&
            formValue[1] !== tabTypes.THIRD_PARTY
          ) {
            return Yup.string().required("Payment date is required");
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),
      retention_amount: Yup.string().when(
        ["payment_type", "cash_retention", "payment_to", "cash_retention_type"],
        (otherFieldData: any) => {
          // Check if paymentType is not PAY_LESS_ZERO and paymentAmount is empty
          if (
            otherFieldData[0] !== tabTypes.PAY_LESS_ZERO &&
            otherFieldData[2] !== tabTypes.THIRD_PARTY &&
            otherFieldData[1] === tabTypes.RETENTION &&
            otherFieldData[3] !== "Retention claim"
          ) {
            return Yup.string()
              .required("Retention amount is required")
              .test("retention amount", function (value, formData: any) {
                const { claim_amount, payless_amount } = formData.parent;

                let claimAmount = 0;
                let claimType = "";
                if (
                  otherFieldData[0] === tabTypes.PAY_LESS_FULL ||
                  otherFieldData[0] === tabTypes.PAY_LESS_PART
                ) {
                  claimAmount = replaceDollarSymbol(payless_amount);
                  claimType = "payless";
                } else {
                  claimAmount = claim_amount;
                  claimType = "claim";
                }

                if (+replaceDollarSymbol(value) >= +claimAmount) {
                  return formData.createError({
                    path: formData.path,
                    message: `Retention amount should be lesser than ${claimType} amount`,
                  });
                } else if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: `Retention amount should be greater than zero`,
                  });
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),
      formatted_retention_amount: Yup.string().when(
        ["payment_type", "cash_retention", "payment_to", "cash_retention_type"],
        (otherFieldData: any) => {
          // Check if paymentType is not PAY_LESS_ZERO and paymentAmount is empty
          if (
            otherFieldData[0] !== tabTypes.PAY_LESS_ZERO &&
            otherFieldData[2] !== tabTypes.THIRD_PARTY &&
            otherFieldData[1] === tabTypes.RETENTION &&
            otherFieldData[3] !== "Retention claim"
          ) {
            return Yup.string()
              .required("Retention amount is required")
              .test("retention amount", function (value, formData: any) {
                const { claim_amount, payless_amount } = formData.parent;

                let claimAmount = 0;
                let claimType = "";
                if (
                  otherFieldData[0] === tabTypes.PAY_LESS_FULL ||
                  otherFieldData[0] === tabTypes.PAY_LESS_PART
                ) {
                  claimAmount = replaceDollarSymbol(payless_amount);
                  claimType = "payless";
                } else {
                  claimAmount = claim_amount;
                  claimType = "claim";
                }

                if (+replaceDollarSymbol(value) >= +claimAmount) {
                  return formData.createError({
                    path: formData.path,
                    message: `Retention amount should be lesser than ${claimType} amount`,
                  });
                } else if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: `Retention amount should be greater than zero`,
                  });
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),

      retention_release_date: Yup.string().when(
        [
          "payment_type",
          "cash_retention",
          "payment_to",
          "payment_date",
          "cash_retention_type",
        ],
        (otherFieldData: any, schema: any) => {
          // Check if paymentType is not PAY_LESS_ZERO, and paymentTo is not THIRD_PARTY, and cashRetention is RETENTION
          if (
            otherFieldData[0] !== tabTypes.PAY_LESS_ZERO &&
            otherFieldData[2] !== tabTypes.THIRD_PARTY &&
            otherFieldData[1] === tabTypes.RETENTION &&
            otherFieldData[4] !== "Retention claim"
          ) {
            return schema
              .required("Retention release date is required")
              .test(
                "retention-release-date",
                "Retention release date should not be less than the payment date",
                function (value: any, formData: any) {
                  const { payment_date } = formData.parent;

                  if (value && payment_date) {
                    const retentionReleaseDate = new Date(value);
                    const paymentDate = new Date(payment_date);

                    if (retentionReleaseDate < paymentDate) {
                      return formData.createError({
                        path: formData.path,
                        message:
                          "Retention release date should not be less than the payment date",
                      });
                    }
                  }

                  return true;
                }
              );
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),

      third_party_payment_reason: Yup.string().when(
        ["payment_to", "claim_type"],
        (otherFieldData: any) => {
          // Check if paymentType is not PAY_LESS_ZERO and paymentAmount is empty
          if (
            otherFieldData[0] === tabTypes.THIRD_PARTY &&
            otherFieldData[1] === tabTypes.BILLABLES
          ) {
            return Yup.string().required(
              "Reason for payment to 3rd party is required"
            );
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),

      payless_amount: Yup.string().when(
        ["payment_type", "retention_amount"],
        (otherFieldData: any) => {
          if (
            otherFieldData[0] === tabTypes.PAY_LESS_FULL ||
            otherFieldData[0] === tabTypes.PAY_LESS_PART
          ) {
            return Yup.string()
              .required("Payless amount is required")
              .test("payless amount", function (value, formData: any) {
                const claim_amount = formData.parent.claim_amount;
                const retention_amount = formData.parent.retention_amount;

                const paylessValue = +replaceDollarSymbol(value);
                const retentionValue = +replaceDollarSymbol(retention_amount);

                if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payless amount should be greater than zero",
                  });
                } else if (+replaceDollarSymbol(value) >= claim_amount) {
                  return formData.createError({
                    path: formData.path,
                    message:
                      "Payless amount should be lesser than claim amount",
                  });
                } // 3. NEW RULE: If retention exists → payless must be greater
                else if (retention_amount && paylessValue <= retentionValue) {
                  return formData.createError({
                    path: formData.path,
                    message:
                      "Payless amount should be greater than retention amount",
                  });
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),
      formatted_payless_amount: Yup.string().when(
        ["payment_type", "retention_amount"],
        (otherFieldData: any) => {
          if (
            otherFieldData[0] === tabTypes.PAY_LESS_FULL ||
            otherFieldData[0] === tabTypes.PAY_LESS_PART
          ) {
            return Yup.string()
              .required("Payless amount is required")
              .test("payless amount", function (value, formData: any) {
                const claim_amount = formData.parent.claim_amount;
                const retention_amount = formData.parent.retention_amount;

                const paylessValue = +replaceDollarSymbol(value);
                const retentionValue = +replaceDollarSymbol(retention_amount);

                if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payless amount should be greater than zero",
                  });
                } else if (+replaceDollarSymbol(value) >= claim_amount) {
                  return formData.createError({
                    path: formData.path,
                    message:
                      "Payless amount should be lesser than claim amount",
                  });
                } else if (retention_amount && paylessValue <= retentionValue) {
                  return formData.createError({
                    path: formData.path,
                    message:
                      "Payless amount should be greater than retention amount",
                  });
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),

      formatted_payment_amount: Yup.string().when(
        ["payment_type", "payment_to", "cash_retention"],
        (formValue: any) => {
          if (
            formValue[0] !== tabTypes.PAY_LESS_ZERO &&
            formValue[1] !== tabTypes.THIRD_PARTY
          ) {
            return Yup.string()
              .required("Payment amount is required")
              .test("payment_amount", function (value, formData: any) {
                const {
                  claim_amount,
                  payment_type,
                  payless_amount,
                  outstanding_amount,
                  view_mode,
                } = formData.parent;

                if (+replaceDollarSymbol(value) <= 0) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payment amount should be greater than zero",
                  });
                } else if (
                  payment_type === tabTypes.FULL &&
                  formValue[2] !== tabTypes.RETENTION &&
                  (+replaceDollarSymbol(value) < claim_amount ||
                    +replaceDollarSymbol(value) > claim_amount)
                ) {
                  return formData.createError({
                    path: formData.path,
                    message: "Payment amount should be equal to claim amount",
                  });
                } else if (
                  payment_type === tabTypes.PART &&
                  (+replaceDollarSymbol(value) >= claim_amount ||
                    +replaceDollarSymbol(value) >
                      outstanding_amount?.toFixed(2)) &&
                  view_mode === "false"
                ) {
                  const dynamicMessage =
                    +replaceDollarSymbol(value) >= claim_amount
                      ? "claim amount"
                      : "or equal to outstanding amount";
                  return formData.createError({
                    path: formData.path,
                    message: `Payment amount must be lesser than ${dynamicMessage}`,
                  });
                } else if (payment_type === tabTypes.PAY_LESS_PART) {
                  if (
                    +replaceDollarSymbol(value) >=
                    +replaceDollarSymbol(payless_amount)
                  ) {
                    return formData.createError({
                      path: formData.path,
                      message:
                        "Payment amount should be lesser than payless amount",
                    });
                  } else if (
                    +replaceDollarSymbol(value) >
                      outstanding_amount?.toFixed(2) &&
                    view_mode === "false"
                  ) {
                    return formData.createError({
                      path: formData.path,
                      message:
                        "Payment amount should be lesser than outstanding amount",
                    });
                  }
                }
                return true;
              });
          }
          return Yup.string().notRequired(); // Return the schema without any additional validation
        }
      ),

      retention_account: Yup.object().when(
        ["claim_type", "payment_type", "cash_retention", "payment_to"],
        (otherFieldData: any) => {
          // Check if paymentType is not PAY_LESS_ZERO and paymentAmount is empty
          if (
            otherFieldData[0] === tabTypes.BILLABLES &&
            otherFieldData[1] !== tabTypes.PAY_LESS_ZERO &&
            otherFieldData[3] !== tabTypes.THIRD_PARTY &&
            otherFieldData[2] === tabTypes.RETENTION
          ) {
            return Yup.object().required("Retention account is required");
          }
          return Yup.object().notRequired(); // Return the schema without any additional validation
        }
      ),
      // withHoldReson: Yup.string().when(
      //   ["claim_type", "payment_type", "payment_to"],
      //   (otherFieldData: any, schema: any) => {
      //     const [claim_type, payment_type, payment_to] = otherFieldData;
      //     if (
      //       claim_type === tabTypes.BILLABLES &&
      //       (payment_type !== tabTypes.FULL ||
      //         payment_to === tabTypes.THIRD_PARTY) &&
      //       noticesAutomated
      //     ) {
      //       return schema.required("Reason is required");
      //     }

      //     return schema.notRequired();
      //   }
      // ),
    },

    [
      ["payment_type", "payment_type"],
      ["payment_type", "cash_retention"],
      ["payment_to", "claim_type"],
    ]
  );

export { initialValues, paymentsSchema };
