import * as Yup from "yup";

export const validationSchema = Yup.object().shape({
  coupon_name: Yup.string().required("Coupon name is required"),

  offer_percentage: Yup.string()
    .required("Discount percentage is required")
    .test("offer_percentage", function (value, ctx) {
      if (!value) return true;

      const num = Number(value);
      if (num < 1 || num > 100) {
        return ctx.createError({
          path: ctx.path,
          message: "Percentage must be between 1 and 100",
        });
      }
      return true;
    }),

  coupon_months: Yup.string().when(
    "coupon_duration",
    (coupon_duration: any, schema) => {
      console.log("🚀 ~ coupon_duration:", coupon_duration);

      // Case 1: if it's an array like ['repeating']
      const value = Array.isArray(coupon_duration)
        ? coupon_duration[0]
        : coupon_duration?.value || coupon_duration;

      if (value === "repeating") {
        return schema
          .required("Duration in months is required")
          .test("coupon_months", function (value, ctx) {
            if (!value) return true;

            const num = Number(value);
            if (num < 1 || num > 12) {
              return ctx.createError({
                path: ctx.path,
                message: "Months must be between 1 and 12",
              });
            }
            return true;
          });
      }

      return schema.notRequired();
    }
  ),

  coupon_duration: Yup.mixed().required("Coupon type is required"),

  item_status: Yup.mixed().required("Status is required"),
});
