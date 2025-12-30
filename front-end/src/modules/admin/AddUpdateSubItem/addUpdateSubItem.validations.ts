import * as Yup from "yup";

export const validationSchema = Yup.object().shape({
  item_name: Yup.string()
    .required("Item name is required")
    .test("unique-item-name", function (value: any, formData: any) {
      const isItemNameExist = formData.parent.isItemNameExist;
      if (!value) return true;
      if (isItemNameExist) {
        return formData.createError({
          path: formData.path,
          message: "Item name already exist",
        });
      }
      return true;
    }),
  item_status: Yup.string().required("Status is required"),
  description: Yup.string().max(
    200,
    "Description must be at most 200 characters"
  ),
  // ✅ New fields
  limit_type: Yup.string().required("Limit type is required"),

  unit_type: Yup.string().when("limit_type", {
    is: (val: string) => val === "Numeric",
    then: (schema) => schema.required("Unit type is required"),
    otherwise: (schema) => schema.notRequired(),
  }),

  dropdown_type: Yup.array().when("limit_type", {
    is: (val: string) => val === "Dropdown", // ✅ Only require when Dropdown
    then: (schema) =>
      schema
        .of(
          Yup.object().shape({
            value: Yup.string().trim().required("Value is required"), // ✅ only value is required
          })
        )
        .min(1, "At least one option is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const initialValues = {
  item_name: "",
  description: "",
  item_status: "",
  isItemNameExist: false,
  // 👇 new fields
  limit_type: "",
  dropdown_type: [{}], // array of key/value pairs
  unit_type: "",
};
