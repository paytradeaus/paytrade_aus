"use client";

import React, { useState } from "react";

import BaseModal from "@/components/BaseModal";
import { uploadFile } from "@/shared/constant/general";
import AttachmentUpload from "@/components/AttachmentUpload";
import { fileButtonType } from "../../Notices/notices.constants";

function UploadBankStatement(props: any) {
  const {
    formik,

    paymentDetails,
    existingFile,
    isViewMode,
    showUploadModel,

    hideModal,
    isEdit,
  } = props;

  const [selectedFile, setSelectedFile] = useState<File | null | any>(
    existingFile || null
  );

  const [fileError, setFileError] = useState<boolean>(false);

  function handleFormCancelClick() {
    hideModal();
    // if (
    //   !isEdit &&
    //   !selectedFile &&
    //   (!formik?.values?.statement_file ||
    //     formik?.values?.statement_file?.length === 0)
    // ) {
    //   showInfoToast("Bank statement is not saved.");
    // }
  }

  const handleImageSelect = (file: File) => {
    setFileError(false);
    setSelectedFile([file]);
    formik?.setFieldValue("statement_file", [file]);
  };

  function handleImageRemove() {
    if (selectedFile || formik?.values?.statement_file) {
      setSelectedFile(null); // Reset selectedFile
      formik?.setFieldValue("statement_file", []);
    }
  }

  const handleViewFile = (fileObj: any) => {
    if (fileObj?.file_path) {
      window.open(
        fileObj?.file_path,
        "_blank" // Opens in new tab
      );
    } else if (
      fileObj?.file &&
      typeof fileObj?.file === "string" &&
      fileObj?.file.includes("base64")
    ) {
      fetch(fileObj?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(fileObj), "_blank");
    }
  };

  return (
    <BaseModal
      modalId={"Bank Statement"}
      title="Bank statement upload"
      displayModal={showUploadModel}
      onClose={() => handleFormCancelClick()}
      hideSecondButton={isViewMode}
      onConfirm={() => {
        if (
          !selectedFile &&
          (!formik?.values?.statement_file ||
            formik?.values?.statement_file?.length == 0)
        ) {
          setFileError(true);
        } else {
          setFileError(false);

          if (formik?.values?.statement_file) {
            return true;
          }
        }
      }}
      secondButtonName="Upload"
      firstButtonName={isViewMode ? "Close" : "Cancel"}
    >
      <p>Please upload the pdf bank statement.</p>

      <AttachmentUpload
        onFileSelect={handleImageSelect}
        placeholder="Please select or drag and drop"
        selected_file={
          (selectedFile?.length && selectedFile[0]) ||
          (formik?.values?.statement_file && formik?.values?.statement_file[0])
        }
        selected_filename={paymentDetails?.file_name || ""}
        disabled={isViewMode}
        allowedTypes={uploadFile.pdf}
        onView={() =>
          handleViewFile(
            (selectedFile?.length && selectedFile[0]) ||
              (formik?.values?.statement_file &&
                formik?.values?.statement_file[0])
          )
        }
        onFileRemove={handleImageRemove}
        showViewRemoveBtn={true}
        hideRemoveButton={isViewMode}
        IsRequired={fileError}
      />
    </BaseModal>
  );
}

export default UploadBankStatement;
