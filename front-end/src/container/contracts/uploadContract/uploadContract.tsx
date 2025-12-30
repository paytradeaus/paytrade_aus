"use client";

import React, { useEffect, useState } from "react";
import styles from "./uploadContract.module.scss";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill, XCircle } from "react-bootstrap-icons";
import AttachmentUpload from "@/components/attachmentUpload/attachmentUpload";
import { toast } from "react-toastify";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import { RootState, useAppSelector } from "@/redux/store";

const UploadContract = (props: any) => {
  const {
    setViewPages,
    setUploadData,
    paymentDetails,
    setUploadValues,
    uploadfile,
    uploadvalues,
    isEdit,
  } = props;

  const [selectedFile, setSelectedFile] = useState<File | null | any>(
    uploadfile?.selectedFile ? uploadfile?.selectedFile : null
  );
  const [removedFile, setRemovedFile] = useState<File | null>(null);

  const AllowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const [minDate, setMinDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (userMode === "Onboarding") {
      setMinDate(undefined); // Allow past dates
    } else {
      setMinDate(new Date()); // Restrict to today and future dates
    }
  }, [userMode]);

  const validationSchema = Yup.object().shape({
    ContractStartDate: Yup.string().required("Contract start date is required"),
    DefectLiabilityEndDate: Yup.string().required(
      "Defect liability end date is required"
    ),
  });

  const start_date = new Date(paymentDetails?.contract_start_date);
  const defect_liability_date = new Date(
    paymentDetails?.defect_liability_end_date
  );

  const formik: any = useFormik({
    initialValues: {
      ContractStartDate: uploadvalues?.ContractStartDate || "",
      DefectLiabilityEndDate: uploadvalues?.DefectLiabilityEndDate || "",
    },
    validationSchema,
    onSubmit: (values) => {
      if (!selectedFile) {
        toast.error("Please upload an attachment");
        return;
      }
      setViewPages("mainPage");
      setUploadData({ selectedFile, removedFile });
      setUploadValues(values);
      toast.success("Uploaded contract has been saved.");
    },
  });

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
    if (!isEdit && !selectedFile) {
      toast.error("Uploaded contract is not saved.");
    }
  };

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    toast.success("Contract uploaded.");
  };

  const handleImageRemove = () => {
    if (selectedFile || uploadfile?.selectedFile) {
      setRemovedFile(selectedFile); // Store the selectedFile in removedFile
      setSelectedFile(null); // Reset selectedFile
      setUploadData(null);
      toast.success("Uploaded contract has been removed.");
    }
  };
  const isBase64 = (str: any) => {
    try {
      return window.btoa(window.atob(str)) === str;
    } catch (err) {
      return false;
    }
  };

  const base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  const handleViewFile = () => {
    if (
      isEdit &&
      selectedFile &&
      typeof selectedFile === "string" &&
      selectedFile.includes("base64")
    ) {
      fetch(selectedFile)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(selectedFile), "_blank");
    }
  };

  useEffect(() => {
    if (
      paymentDetails?.contract_start_date &&
      paymentDetails?.defect_liability_end_date
    ) {
      formik.setValues({
        ContractStartDate: start_date || "",
        DefectLiabilityEndDate: defect_liability_date || "",
      });
      setSelectedFile(paymentDetails?.file);
    }
  }, [paymentDetails]);

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Contract</h5>
              <p>Please upload the signed contract.</p>

              <AttachmentUpload
                onFileSelect={handleImageSelect}
                placeholder="Please select or drag and drop"
                selected_file={selectedFile || uploadfile?.selectedFile}
                selected_filename={paymentDetails?.file_name || ""}
                disabled={selectedFile !== null}
                allowedTypes={AllowedTypes}
              ></AttachmentUpload>

              <div className={styles.textFieldStyles}>
                <CustomDatePicker
                  showIcon={true}
                  label="Contract start date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.ContractStartDate}
                  value={formik?.values?.ContractStartDate}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("ContractStartDate", selectedDate);
                    setUploadValues((pre: any) => ({
                      ...pre,
                      ContractStartDate: selectedDate,
                    }));
                  }}
                  disabled={false}
                  format={DD_MM_YYYY}
                  maxDate={new Date()}
                  className={
                    formik.touched.ContractStartDate &&
                    formik.errors.ContractStartDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.ContractStartDate &&
                formik.errors.ContractStartDate ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.ContractStartDate}
                  </div>
                ) : null}
              </div>

              <div className={styles.textFieldStyles}>
                <CustomDatePicker
                  showIcon={true}
                  label="Defect liability end date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.DefectLiabilityEndDate}
                  value={formik?.values?.DefectLiabilityEndDate}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue(
                      "DefectLiabilityEndDate",
                      selectedDate
                    );
                    setUploadValues((pre: any) => ({
                      ...pre,
                      DefectLiabilityEndDate: selectedDate,
                    }));
                  }}
                  disabled={false}
                  format={DD_MM_YYYY}
                  minDate={minDate}
                  maxYear={new Date().getFullYear() + 50}
                  className={
                    formik.touched.DefectLiabilityEndDate &&
                    formik.errors.DefectLiabilityEndDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.DefectLiabilityEndDate &&
                formik.errors.DefectLiabilityEndDate ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.DefectLiabilityEndDate}
                  </div>
                ) : null}
              </div>

              <FormButton className={styles.buttonStyles} type="submit">
                Save
              </FormButton>
              {(selectedFile || uploadfile?.selectedFile) && (
                <>
                  <Button
                    className={styles.ViewButtonStyles}
                    type="button"
                    onClick={handleViewFile}
                  >
                    View
                  </Button>

                  <Button
                    className={styles.RemoveButtonStyles}
                    type="button"
                    onClick={handleImageRemove}
                  >
                    Remove
                  </Button>
                </>
              )}
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

export default UploadContract;
