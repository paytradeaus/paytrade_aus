import { useCallback } from "react";
import * as Yup from "yup";

import BaseModal from "@/components/BaseModal";
import { showSuccessToast } from "@/components/Toaster";
import { useFormik } from "formik";
import { formatDollars } from "@/utils";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import _ from "lodash";

export default function ContractDetails({
  isDisplay,
  onClose,
  formData,
  onSubmit,
  disabled,
  isEditable,
}: any) {
  const validationSchema = Yup.object().shape({
    ContractDate: Yup.date()
      .required("Contract Date is required")
      .test(
        "contractDateBeforeSubContractDate",
        "Contract Date must be before First Subcontract Date",
        function (value) {
          const subContractDate = this.parent.SubContractDate;
          return !subContractDate || value <= subContractDate;
        }
      ),
    SubContractDate: Yup.date()
      .required("First Subcontract Date is required")
      .test(
        "subContractDateBeforeContractCompletionDate",
        "First Subcontract Date must be before Contract Practical Completion Date",
        function (value) {
          const contractCompletionDate = this.parent.ContractCompletionDate;
          const contractDate = this.parent.ContractDate;
          return (
            !contractCompletionDate ||
            (value < contractCompletionDate && value >= contractDate)
          );
        }
      ),
    ContractCompletionDate: Yup.date().required(
      "Contract Practical Completion Date is required"
    ),
    ContractValue: Yup.string().required("Contract Value is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      ContractDate: formData?.ContractDate || "",
      SubContractDate: formData?.SubContractDate || "",
      ContractCompletionDate: formData?.ContractCompletionDate || "",
      ContractValue: formData?.ContractValue
        ? formatDollars(formData?.ContractValue.toString())
        : "",
    },
    validationSchema,
    onSubmit: async (values) => handleSubmit(values),
  });

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, "");
  };

  function handleSubmit(values: any) {
    console.log(values, "values");

    let ContractedValues = {
      ...values,
      ContractValue: removeCommas(values?.ContractValue),
    };

    showSuccessToast(
      `Contract details ${formData?.ContractDate ? "updated" : "added"}`
    );
    onSubmit(ContractedValues);
    return true;
  }

  // Main function to handle contract value formatting
  const handleContractValue = useCallback((e: any) => {
    let { value } = e.target;

    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      formik.setFieldValue("ContractValue", "");
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    // Update form value
    formik.setFieldValue("ContractValue", formattedValue);
  }, []);

  return (
    <BaseModal
      modalId={"Contract Details"}
      title="Contract details"
      displayModal={isDisplay}
      onClose={onClose}
      onConfirm={() => {
        formik?.handleSubmit();
        if (_.isEmpty(formik?.errors)) {
          return true;
        }
      }}
      secondButtonName="Save"
    >
      <h4>
        Please input the head contract details required for form TA1 for the
        QBCC
      </h4>

      <FormikControl
        control={InputType.DATE_PICKER}
        label={"Contract date"}
        value={formik.values.ContractDate}
        name={"ContractDate"}
        error={formik.errors.ContractDate}
        showError={formik.touched.ContractDate && formik.errors.ContractDate}
        required
        onChange={(selectedDate: any) => {
          formik.setFieldValue("ContractDate", selectedDate);
        }}
        disabled={disabled}
        onBlur={formik.handleBlur("ContractDate")}
      />

      <FormikControl
        control={InputType.DATE_PICKER}
        value={formik.values.ContractCompletionDate}
        label={"Contract practical completion date"}
        name={"ContractCompletionDate"}
        error={formik.errors.ContractCompletionDate}
        showError={
          formik.touched.ContractCompletionDate &&
          formik.errors.ContractCompletionDate
        }
        required
        disabled={disabled}
        onChange={(selectedDate: any) => {
          formik.setFieldValue("ContractCompletionDate", selectedDate);
        }}
        onBlur={formik.handleBlur("ContractCompletionDate")}
      />
      <FormikControl
        control={InputType.DATE_PICKER}
        label={"First subcontract date"}
        value={formik.values.SubContractDate}
        name={"SubContractDate"}
        error={formik.errors.SubContractDate}
        showError={
          formik.touched.SubContractDate && formik.errors.SubContractDate
        }
        required
        onChange={(selectedDate: any) => {
          formik.setFieldValue("SubContractDate", selectedDate);
        }}
        disabled={disabled}
        onBlur={formik.handleBlur("SubContractDate")}
      />
      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"Contract value (ex GST)"}
        name={"ContractValue"}
        placeholder="Contract value"
        error={formik.errors.ContractValue}
        showError={formik.touched.ContractValue && formik.errors.ContractValue}
        required
        disabled={isEditable}
        onChange={handleContractValue}
        onBlur={formik.handleBlur("ContractValue")}
        value={formik.values.ContractValue}
      />
    </BaseModal>
  );
}
