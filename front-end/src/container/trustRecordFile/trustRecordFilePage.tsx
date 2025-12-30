"use client";
import React, { useState } from "react";
import styles from "./trustRecordFilePage.module.scss";
import { usePathname, useRouter } from "next/navigation";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ExclamationTriangleFill,
  FiletypeDoc,
  Paperclip,
  XCircle,
} from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import { Col, Form, Row } from "react-bootstrap";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "react-toastify";
import { DD_MM_YYYY, onlyDOCandPDF } from "@/common/constants/general";
import { RootState, useAppSelector } from "@/redux/store";
import { toUpper } from "lodash";
import { useDispatch } from "react-redux";
import { setAddTrustRecord } from "@/redux/slices/companyRegistrationDetails";
import _ from "lodash";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import AttachmentPreview from "@/components/AttachmentPreview/AttachmentPreview";

const TrustRecordFilePage = (props: any) => {
  const { isView, setViewPages, isEdit, ...rest } = props;
  const router = useRouter();
  const routePath = usePathname();
  const dispatch = useDispatch();

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails
  );
  const prevDoc: any = useAppSelector((state: RootState) => state?.imagestores);
  const prevAtt: File[] = prevDoc === null ? [] : prevDoc;

  // State to control the visibility of the table grid
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [viewFileData, setViewFileData] = useState<any>();

  const handleAddFileClick = () => {
    router.push("/user/records/add");
  };

  const validationSchema = Yup.object().shape({
    Name: Yup.string().required("Name is required"),
    date: Yup.date()
      .required("Date is required")
      .max(new Date(), "Date cannot be a future date"),
    file: Yup.array().required("file is required"),
  });

  const formik = useFormik({
    initialValues: {
      Name: "",
      date: "",
      file: [],
    },
    validationSchema,
    onSubmit: (values) => {
      const newFile: any = files;
      const formData = {
        ...values,
        files: files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          file: newFile,
        })),
      };
      // Dispatch action to store form data in Redux
      // dispatch(setImageFile([...prevAtt, newFile]));
      dispatch(
        setAddTrustRecord([...companyDetails?.addTrustRecord, formData])
      );

      // Redirect or perform other actions after form submission
      if (isEdit) {
        setViewPages("viewPage");
        // router.push("/user/edit-business/trust-and-training-records");
      } else {
        router.push("/user/add-business/trust-and-training-records");
      }
    },
  });

  const handleFileChange = (newFiles: File[]) => {
    if (newFiles.length !== 1) {
      toast.error("Please select only one file.");
      return;
    }

    const newFile = newFiles[0];

    // Update state with new file
    setFiles([newFile]);
    // Update selected file names
    setSelectedFileNames([newFile.name]);

    // Update formik values with the new file
    formik.setFieldValue("file", [newFile]);
  };
  const handleNavigateToList = () => {
    if (isEdit) {
      setViewPages("viewPage");
      // router.push("/user/edit-business/trust-and-training-records");
    } else {
      router.push("/user/add-business/trust-and-training-records");
    }
  };

  const handleCancelClick = () => {
    router.back();
  };

  return (
    <div className={styles.card}>
      <div
        className={styles.headerAndButtonCon}
        onClick={handleAddFileClick}
      ></div>
      <h4 className={styles.businessHeadingStyles}>
        {toUpper(companyDetails?.name) || ""}
      </h4>

      <h4 className={styles.businessSubHeadingStyles}>
        Trust And Training Records
      </h4>
      <Form onSubmit={formik.handleSubmit} className={styles.formStyles}>
        <div className={styles.textFieldStyles}>
          <TextField
            placeholder=""
            type="text"
            labelText="Name *"
            id="Name"
            name="Name"
            onChange={formik.handleChange("Name")}
            onBlur={formik.handleBlur("Name")}
            value={formik.values.Name}
            endingDataStyles={styles.endIconStyle}
            classNames={styles.inputFieldControl}
            isInvalid={!!(formik.touched.Name && formik.errors.Name)}
            endingData={
              formik.touched.Name && formik.errors.Name ? (
                <XCircle
                  className={styles.crossiconsSyles}
                  onClick={() => {
                    formik.setFieldValue("Name", ""); // Clear the name field on icon click if desired
                  }}
                />
              ) : null
            }
          />

          {formik.touched.Name &&
          formik.errors.Name &&
          typeof formik.errors.Name === "string" ? (
            <div className={styles.errorText}>
              <ExclamationTriangleFill className={styles.icon} />
              {formik.errors.Name}
            </div>
          ) : null}
        </div>

        <div className={styles.textFieldStyles}>
          <CustomDatePicker
            showIcon={true}
            label="Date *"
            toggleCalendarOnIconClick
            placeholderText="&nbsp;Select date"
            className={
              formik.touched.date && formik.errors.date
                ? `${styles.datePicker} ${styles.datePickerError}`
                : styles.datePicker
            }
            selected={formik.values.date}
            onChange={(selectedDate: string) =>
              formik.setFieldValue("date", selectedDate)
            }
            disabled={false}
            format={DD_MM_YYYY}
            maxDate={new Date()}
            value={formik?.values?.date}
          />
          {formik.touched.date && formik.errors.date && (
            <div className={styles.errorContainer}>
              <ExclamationTriangleFill className={styles.error} />
              <span className={styles.errorTextStyles}>
                {formik.errors.date}
              </span>
            </div>
          )}
        </div>

        <div>
          {/* {(files?.length > 0 || viewFileData?.length > 0) && (
            <Col className={styles.filesviewContanier}>
              {(files.length > 0 ? files : viewFileData).map(
                (eachFile: any, index: number) => {
                  return (
                    <div className={styles.eachFielDetailsView} key={index}>
                      {!isView && (
                        <XCircle
                          className={styles.fileRemoveIcon}
                          onClick={() => {
                            // Filter out the file that needs to be removed
                            const updatedFiles = files.filter(
                              (file, i) => i !== index
                            );
                            setFiles(updatedFiles);
                          }}
                        />
                      )}
                      <div className={styles.eachFile}>
                        <FiletypeDoc />
                      </div>
                      <span
                        className={styles.nameStyles}
                        title={eachFile?.name || eachFile?.file_name}
                      >
                        {eachFile?.name || eachFile?.file_name}
                      </span>
                    </div>
                  );
                }
              )}
            </Col>
          )} */}
          <Row>
            <Col xs={5}>
              <FileSelector
                handleSave={handleFileChange}
                acceptedFileFormats={onlyDOCandPDF}
                multiple={false}
                maximumSize={5 * 1024}
                onError={() => {
                  toast.error(`Max Allowed file size is 5 Mb`);
                }}
                disabled={files.length > 0}
              >
                <div className={styles.fileselectorWidthStyles}>
                  <span
                    className={
                      files?.length > 0
                        ? `${styles.fileSelectorContainer} ${styles.selectedFile}`
                        : styles.fileSelectorContainer
                    }
                  >
                    <Paperclip />
                    {files?.length > 0 ? "File selected" : "select file"}
                  </span>
                </div>
              </FileSelector>
            </Col>
            <Col xs={7} className="d-flex align-items-end">
              {(files?.length > 0 || viewFileData?.length) && (
                <AttachmentPreview
                  uploadedFile={files?.length ? files[0] : viewFileData[0]}
                  onDelete={() => setFiles([])}
                />
              )}
            </Col>
            {formik.touched.file &&
            formik.errors.file &&
            typeof formik.errors.file === "string" &&
            files.length === 0 ? (
              <div className={styles.errorText}>
                <ExclamationTriangleFill className={styles.icon} />
                {formik.errors.file}
              </div>
            ) : null}
          </Row>
        </div>
        <div className={styles.btnContianer}>
          <FormButton
            type="button"
            className={styles.cancelBtnStyle}
            // onClick={() => router.back()}
            onClick={() => handleCancelClick()}
          >
            Cancel
          </FormButton>
          <FormButton
            type="submit"
            disabled={
              !formik.isValid ||
              Object.values(formik.values).every((value) => _.isEmpty(value)) ||
              files?.length == 0
            }
            // onClick={() => handleNavigateToList()}
            className={styles.saveBtnStyle}
          >
            Save
          </FormButton>
        </div>
      </Form>
    </div>
  );
};

export default TrustRecordFilePage;
