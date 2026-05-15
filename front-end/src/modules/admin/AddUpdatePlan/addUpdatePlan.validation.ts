import { replaceDollarSymbol } from "@/utils";
import * as Yup from "yup";

export const validationSchema = Yup.object().shape(
  {
    plan_name: Yup.string()
      .required("Plan name is required")
      .max(20, "Plan name must be at most 20 characters")
      .test("plan_name", function (value, formData: any) {
        const isPlanNameExist = formData.parent.isPlanNameExist;
        if (!value) return true; // Handle empty email
        if (isPlanNameExist) {
          return formData.createError({
            path: formData.path,
            message: "Plan name already exist",
          });
        }
        return true;
      }),
    plan_status: Yup.string().required("status is required"),
    plan_type: Yup.string().required("plan type is required"),

    trial_period: Yup.string().notRequired(),
    monthly_ai_credit: Yup.number()
      .typeError("AI credit must be a number")
      .min(0, "AI credit cannot be negative")
      .notRequired(),

    yearly_price: Yup.string().when(["plan_type"], (otherFieldData: any) => {
      if (otherFieldData[0] !== "Free") {
        return Yup.string()
          .required("Yearly price is required")
          .test("yearly_price", function (value, formData: any) {
            if (replaceDollarSymbol(value) <= 0) {
              return formData.createError({
                path: formData.path,
                message: "Yearly price should be greater than zero",
              });
            }
            return true;
          });
      }
      return Yup.string().notRequired(); // Return the schema without any additional validation
    }),

    description: Yup.string().max(
      200,
      "Description must be at most 200 characters"
    ),

    item_specification: Yup.mixed().when("tab_type", ([tab_type, schema]) => {
      if (tab_type === "details") {
        return Yup.array()
          .of(
            Yup.object().shape({
              item_id: Yup.string(),
              limit_value: Yup.mixed(),
              is_unlimited: Yup.boolean(),
              is_checked: Yup.boolean(),
            })
          )
          .notRequired();
      }

      return Yup.array()
        .of(
          Yup.object().shape({
            id: Yup.string().required("Item id required"),
            limit_value: Yup.mixed().when(
              ["checked", "limit_type", "is_unlimited"],
              ([checked, limit_type, is_unlimited], schema) => {
                if (checked && limit_type === "Dropdown") {
                  return schema.required("Option is required");
                }

                if (checked && limit_type === "Numeric" && !is_unlimited) {
                  return schema.required("Value is required");
                }

                return schema.notRequired();
              }
            ),
            is_unlimited: Yup.boolean(),
            is_checked: Yup.boolean(),
          })
        )
        .required("Item specification is required");
    }),
  },
  [
    ["plan_type", "plan_type"],
    ["yearly_price", "yearly_price"],
    ["tab_type", "tab_type"],
  ]
);
