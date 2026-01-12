"use client";

import { RootState, useAppSelector } from "@/redux/store";
import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import AttachmentUpload from "@/components/attachmentUpload";
import { format } from "date-fns";

const UploadContract = (props: any) => {
  const {
    setViewPages,
    setUploadData,
    paymentDetails,
    setUploadValues,
    uploadfile,
    uploadvalues,
    showUploadModel,
    setShowUploadModel,
    isEdit,
  } = props;

  const [selectedFile, setSelectedFile] = useState<File | null | any>(
    uploadfile?.selectedFile ? uploadfile?.selectedFile : null
  );
  const [removedFile, setRemovedFile] = useState<File | null>(null);
  const [fileError, setfileError] = useState<boolean>(false);

  const AllowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  const toastShownRef = useRef(false);
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

  const formik: any = useFormik({
    initialValues: {
      ContractStartDate: uploadvalues?.ContractStartDate
        ? format(new Date(uploadvalues.ContractStartDate), "yyyy-MM-dd")
        : "",
      DefectLiabilityEndDate: uploadvalues?.DefectLiabilityEndDate || "",
    },
    validationSchema,
    onSubmit: (values) => {
      setViewPages("mainPage");
      setShowUploadModel(false);
      setUploadData({ selectedFile, removedFile });
      setUploadValues(values);
      showSuccessToast("Uploaded contract has been saved.");
    },
  });

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
    setShowUploadModel(false);
    if (!isEdit && !selectedFile && !toastShownRef.current) {
      showErrorToast("Uploaded contract is not saved.");
      toastShownRef.current = true;
    }
  };

  const handleImageSelect = (file: File) => {
    setfileError(false);
    setSelectedFile(file);
  };

  const handleImageRemove = () => {
    if (selectedFile || uploadfile?.selectedFile) {
      setRemovedFile(selectedFile); // Store the selectedFile in removedFile
      setSelectedFile(null); // Reset selectedFile
      setUploadData(null);
    }
  };

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
      const formattedContractStartDate = format(
        new Date(paymentDetails.contract_start_date),
        "yyyy-MM-dd"
      );
      const formattedDefectLiabilityEndDate = format(
        new Date(paymentDetails.defect_liability_end_date),
        "yyyy-MM-dd"
      );

      formik.setValues({
        ContractStartDate: formattedContractStartDate,
        DefectLiabilityEndDate: formattedDefectLiabilityEndDate,
      });
      setSelectedFile(paymentDetails?.file);
    }
  }, [paymentDetails]);

  function defectLiabilityEndDate(utcDateStr: string) {
    const date = new Date(utcDateStr);
    date.setDate(date.getDate() + 1);

    // Format back to yyyy-mm-dd
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return (
    <BaseModal
      modalId={"Contract"}
      title="Upload Contract"
      displayModal={showUploadModel}
      onClose={() => handleFormCancelClick()}
      onConfirm={() => {
        if (!selectedFile) {
          setfileError(true);
        } else {
          setfileError(false);
          formik.handleSubmit();
          if (
            formik?.values?.ContractStartDate &&
            formik?.values?.DefectLiabilityEndDate
          ) {
            return true;
          }
        }
      }}
      secondButtonName="Save"
    >
      <p>Please upload the signed contract.</p>

      <AttachmentUpload
        onFileSelect={handleImageSelect}
        placeholder="Please select or drag and drop"
        selected_file={selectedFile || uploadfile?.selectedFile}
        selected_filename={paymentDetails?.file_name || ""}
        disabled={selectedFile !== null}
        allowedTypes={AllowedTypes}
        onView={handleViewFile}
        onFileRemove={handleImageRemove}
        showViewRemoveBtn={true}
        IsRequired={fileError}
      />

      <FormikControl
        control={InputType.DATE_PICKER}
        label="Contract start date"
        name="ContractStartDate"
        error={formik.errors.ContractStartDate}
        showError={
          formik.touched.ContractStartDate && formik.errors.ContractStartDate
        }
        required
        onChange={(selectedDate: any) => {
          // Pass only the date value to Formik
          formik.setFieldValue("ContractStartDate", selectedDate);
          setUploadValues((pre: any) => ({
            ...pre,
            ContractStartDate: selectedDate,
          }));
          if (
            new Date(selectedDate) >=
            new Date(formik?.values?.DefectLiabilityEndDate)
          ) {
            formik.setFieldValue("DefectLiabilityEndDate", "");
          }
        }}
        onBlur={formik.handleBlur("ContractStartDate")}
        value={formik.values.ContractStartDate}
      />

      <FormikControl
        control={InputType.DATE_PICKER}
        label="Defect liability end date"
        name="DefectLiabilityEndDate"
        error={formik.errors.DefectLiabilityEndDate}
        showError={
          formik.touched.DefectLiabilityEndDate &&
          formik.errors.DefectLiabilityEndDate
        }
        required
        onChange={(selectedDate: any) => {
          formik.setFieldValue("DefectLiabilityEndDate", selectedDate);
          setUploadValues((pre: any) => ({
            ...pre,
            DefectLiabilityEndDate: selectedDate,
          }));
        }}
        onBlur={formik.handleBlur("DefectLiabilityEndDate")}
        value={formik.values.DefectLiabilityEndDate}
        minDate={defectLiabilityEndDate(formik.values.ContractStartDate)}
      />
    </BaseModal>
  );
};

export default UploadContract;
