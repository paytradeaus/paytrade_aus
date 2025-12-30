"use client";

import React, { useCallback } from "react";
import styles from "./contractDetails.module.scss";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill, XCircle } from "react-bootstrap-icons";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import {
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR_ONLY,
} from "@/common/constants/general";
import commonStyles from "./../../../../../common/commonStyles.module.scss";
import { toast } from "@/app/Toaster";
import { formatDollars } from "@/common/commonFunctions";

const ContractDetails = (props: any) => {
  const { setViewPages, contactDetailsData, setContactDetailsData, disabled } =
    props;
  console.log(contactDetailsData, "contactDetailsData");

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
      ContractDate: contactDetailsData?.ContractDate || "",
      SubContractDate: contactDetailsData?.SubContractDate || "",
      ContractCompletionDate: contactDetailsData?.ContractCompletionDate || "",
      ContractValue: contactDetailsData?.ContractValue
        ? formatDollars(contactDetailsData?.ContractValue.toString())
        : "",
    },
    validationSchema,
    onSubmit: async (values) => {
      console.log(values, "values");

      let ContractedValues = {
        ...values,
        ContractValue: removeCommas(values?.ContractValue),
      };
      console.log(ContractedValues, "ContractedValues");

      toast.success(
        `Contract details ${
          contactDetailsData?.ContractDate ? "updated" : "added"
        }`
      );
      setContactDetailsData(ContractedValues);
      setViewPages("mainPage");
    },
  });

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
  };

  const removeCommas = (value: string): string => {
    return value.replace(/,/g, "");
  };

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
      integerPart = integerPart.slice(0, 11);
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
    <div className={styles.mainCon}>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form
              className={styles.formStyles}
              onSubmit={formik.handleSubmit}
              noValidate
            >
              <h5 className={styles.title}>Contract Details</h5>
              <p>
                Please input the head contract details required for form TA1 for
                the QBCC
              </p>

              <div className={styles.textFieldStyles}>
                <CustomDatePicker
                  maxYear={2080}
                  showIcon={true}
                  label="Contract Date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY "
                  selected={formik?.values?.ContractDate}
                  value={formik?.values?.ContractDate}
                  onBlur={formik.handleBlur}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("ContractDate", selectedDate);
                  }}
                  disabled={disabled}
                  format={DD_MM_YYYY}
                  className={
                    formik.touched.ContractDate && formik.errors.ContractDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.ContractDate && formik.errors.ContractDate ? (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.ContractDate}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className={styles.textFieldStyles}>
                <CustomDatePicker
                  maxYear={2080}
                  showIcon={true}
                  label="Contract Practical Completion Date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY "
                  selected={formik?.values?.ContractCompletionDate}
                  value={formik?.values?.ContractCompletionDate}
                  onBlur={formik.handleBlur}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue(
                      "ContractCompletionDate",
                      selectedDate
                    );
                  }}
                  disabled={disabled}
                  format={DD_MM_YYYY}
                  className={
                    formik.touched.ContractCompletionDate &&
                    formik.errors.ContractCompletionDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.ContractCompletionDate &&
                formik.errors.ContractCompletionDate ? (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.ContractCompletionDate}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <CustomDatePicker
                  maxYear={2080}
                  showIcon={true}
                  label="First Subcontract Date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY "
                  selected={formik?.values?.SubContractDate}
                  value={formik?.values?.SubContractDate}
                  onBlur={formik.handleBlur}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("SubContractDate", selectedDate);
                  }}
                  disabled={disabled}
                  format={DD_MM_YYYY}
                  className={
                    formik.touched.SubContractDate &&
                    formik.errors.SubContractDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.SubContractDate &&
                formik.errors.SubContractDate ? (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.SubContractDate}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className={styles.textFieldStyles}>
                <TextField
                  type="text"
                  disabled={disabled}
                  labelText="Contract value (ex GST) *"
                  name="ContractValue"
                  required
                  isInvalid={
                    formik.touched.ContractValue && formik.errors.ContractValue
                      ? true
                      : false
                  }
                  placeholder=""
                  id="ContractValue"
                  value={formik.values.ContractValue}
                  errorText={formik.errors.ContractValue}
                  onChange={handleContractValue}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </div>

              <FormButton
                className={styles.buttonStyles}
                type="submit"
                disabled={disabled}
              >
                {contactDetailsData?.ContractDate ? "Update" : "Save"}
              </FormButton>

              <Button
                className={styles.CancelButtonStyles}
                type="button"
                onClick={handleFormCancelClick}
              >
                Cancel
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ContractDetails;
