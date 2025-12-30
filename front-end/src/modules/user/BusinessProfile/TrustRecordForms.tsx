import BaseModal from "@/components/BaseModal";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useBusinessProfileContext } from "./BusinessProfileContext";
import FormikControl from "@/components/FormikControl";
import { InputType, uploadFile } from "@/shared/constant/general";
import { formatDate, generateUniqueId } from "@/utils";
import { FileErrors } from "@/shared/constant/messages";

export default function TrustRecordForms() {
  const {
    formik,
    displayTrainingRecords,
    setDisplayTrainingRecords,
    trustTrainingGridData,
    setTrustTrainingGridData,
    setDisplayTrainingRecordsGrid,
    fileInputRef,
  }: any = useBusinessProfileContext();

  const [selectedFileError, setSelectedFileError] = useState<any>("");

  useEffect(() => {
    setFieldsUntouched();
  }, []);

  function handleTrustTrainingClose() {
    formik?.setFieldValue("isTrainingFieldsRequired", false);

    formik?.setFieldValue("trainingRecordName", "");
    formik?.setFieldValue("trainingRecordDate", "");
    formik?.setFieldValue("trainingRecordFile", null);
    if (trustTrainingGridData?.length > 0) {
      setDisplayTrainingRecordsGrid(true);
    }
    setDisplayTrainingRecords(false);
  }

  async function handleSubmitTrainingRecords() {
    await formik?.setFieldTouched("trainingRecordName");
    await formik?.setFieldTouched("trainingRecordDate");
    await formik?.setFieldTouched("trainingRecordFile");

    if (
      formik?.values?.trainingRecordName &&
      formik?.values?.trainingRecordFile &&
      formik?.values?.trainingRecordDate
    ) {
      const { trainingRecordName, trainingRecordFile, trainingRecordDate } =
        formik?.values || {};
      setTrustTrainingGridData((prev: any) => [
        ...prev,
        {
          trainingRecordDate: formatDate(trainingRecordDate),
          trainingRecordFile,
          trainingRecordName,
          id: generateUniqueId(),
          isAdded: true,
        },
      ]);
      setDisplayTrainingRecordsGrid(true);
      await formik?.setFieldValue("trainingRecordName", "");
      await formik?.setFieldValue("trainingRecordDate", "");
      await formik?.setFieldValue("trainingRecordFile", null);
      setDisplayTrainingRecords(false);
      return true;
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      const filesToUpload: File[] = Array.from(files);

      // Check for Maximum Size

      const filesExceedSize = filesToUpload.some((file) => {
        // from bytes to kb
        const fileSize = file.size / 1024;
        return fileSize > uploadFile.fiveMB;
      });
      if (filesExceedSize) {
        // TODO: Handle when file size exceeds maximum size
        setSelectedFileError(FileErrors.FILE_LIMIT_EXCEEDS_5MB);
        formik?.setFieldValue("trainingRecordFile", null);
        fileInputRef.current.value = "";
        return;
      }
      formik?.setFieldValue("trainingRecordFile", filesToUpload);
      setSelectedFileError("");
    }
  }

  async function setFieldsUntouched() {
    await formik?.setFieldTouched("trainingRecordName", false);
    await formik?.setFieldTouched("trainingRecordDate", false);
    await formik?.setFieldTouched("trainingRecordFile", false);
  }

  return (
    <BaseModal
      modalId={"Trust And Training Records Id"}
      title="Trust and training records"
      displayModal={displayTrainingRecords}
      onClose={() => handleTrustTrainingClose()}
      onConfirm={() => handleSubmitTrainingRecords()}
      secondButtonName="Save"
    >
      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"Name"}
        name={"trainingRecordName"}
        error={formik.errors.trainingRecordName}
        showError={
          formik.touched.trainingRecordName && formik.errors.trainingRecordName
        }
        required
        onChange={formik?.handleChange}
        onBlur={formik.handleBlur("trainingRecordName")}
        value={formik.values.trainingRecordName}
      />
      <FormikControl
        control={InputType.DATE_PICKER}
        label={"Date"}
        name={"trainingRecordDate"}
        error={formik.errors.trainingRecordDate}
        showError={
          formik.touched.trainingRecordDate && formik.errors.trainingRecordDate
        }
        required
        onChange={(selectedDate: any) =>
          formik?.setFieldValue("trainingRecordDate", selectedDate)
        }
        onBlur={formik.handleBlur("trainingRecordDate")}
        value={formik.values.trainingRecordDate}
      />
      <h5>Upload Documents</h5>
      <input
        type="file"
        onChange={onFileChange}
        accept={`${uploadFile.pdf}, ${uploadFile.word}`}
        ref={fileInputRef}
        disabled={formik?.values?.trainingRecordFile?.length > 0}
        className="file_Selector"
      />
      {formik.touched.trainingRecordFile &&
        (selectedFileError || formik.errors.trainingRecordFile) && (
          <small className="invalid error_wrap">
            <i className="fa-light fa-circle-xmark"></i>

            {selectedFileError || formik.errors.trainingRecordFile}
          </small>
        )}

      {formik?.values?.trainingRecordFile?.length > 0 && (
        <Fragment>
          <hr />
          <h5>Uploaded Documents</h5>
          <div className="pt_itemwithremove">
            <span>{formik?.values?.trainingRecordFile[0]?.name}</span>

            <button
              className="contrast smallbutton"
              onClick={() => {
                formik?.setFieldValue("trainingRecordFile", null);
                fileInputRef.current.value = "";
              }}
            >
              <i className="fa-light fa-xmark" style={{ margin: 0 }}></i>
            </button>
          </div>{" "}
        </Fragment>
      )}
    </BaseModal>
  );
}
