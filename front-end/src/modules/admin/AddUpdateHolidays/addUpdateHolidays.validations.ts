import * as Yup from "yup";

export const validationSchema = Yup.object().shape({
  holiday_name: Yup.string().required("Holiday name is required"),

  holiday_date: Yup.date().required("Date is required"),
});

export const initialValues = {
  holiday_date: "",
  holiday_name: "",
  holiday_status: "",
  recurring_every_year: false,
};
