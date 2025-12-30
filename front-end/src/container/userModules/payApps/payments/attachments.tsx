import { onlyDOCandPDF } from "@/common/constants/general";
import TextField from "@/components/TextField/textField";
import FileSelector from "@/components/fileSelector/fileSelector";
import React, { Fragment, useEffect, useState } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { ExclamationTriangleFill, Paperclip } from "react-bootstrap-icons";
import { toast } from "react-toastify";
import customStyles from "./payments.module.scss";
import { fileUploadType, tabTypes } from "./payments.constant";
import { usePaymentsContext } from "./paymentsContext";

const { OPTIONAL_FILE_UPLOAD, COMPULSORY_FILE_UPLOAD } = fileUploadType;

export default function Attachments({
  displayCompulsoryOptionalAttachment,
}: any) {
  const {
    formik,
    optionalFiles,
    compulsoryFiles,
    setOptionalFiles,
    setCompulsoryFiles,
    setIsCompulsoryAttachmentRequired,
    isViewMode,
    getAttachmentFileName,
  }: any = usePaymentsContext();

  useEffect(() => {
    setIsCompulsoryAttachmentRequired(displayCompulsoryOptionalAttachment);
  }, [displayCompulsoryOptionalAttachment]);

  function handleFileUpload(uploadedFile: any, fileUploadType: string) {
    let fileArray = Array.from(uploadedFile);

    let newFileArray = fileArray.map((fileObject: any) => {
      let newFileName = fileObject.name;
      let newFile = new File([fileObject], newFileName, {
        type: fileObject.type,
      });
      return newFile;
    });
    saveUploadedFile(newFileArray, fileUploadType);
  }

  function saveUploadedFile(newFiles: File[], fileUploadType: string) {
    if (
      newFiles?.length > 5 ||
      (fileUploadType === OPTIONAL_FILE_UPLOAD && optionalFiles?.length == 5) ||
      (fileUploadType === COMPULSORY_FILE_UPLOAD &&
        compulsoryFiles?.length == 5)
    ) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
      return;
    }

    if (fileUploadType === OPTIONAL_FILE_UPLOAD) {
      if (optionalFiles?.length + newFiles?.length <= 5) {
        setOptionalFiles([...optionalFiles, ...newFiles]);
      } else {
        toast.error("You can only select up to five files.");
        return;
      }
    } else if (fileUploadType === COMPULSORY_FILE_UPLOAD) {
      if (compulsoryFiles?.length + newFiles?.length <= 5) {
        setCompulsoryFiles([...compulsoryFiles, ...newFiles]);
      } else {
        toast.error("You can only select up to five files.");
        return;
      }
    }
  }

  function deleteAttachment(fileOrder: number, fileType: string) {
    const isOptional = fileType === OPTIONAL_FILE_UPLOAD;

    const availableFiles = isOptional
      ? [...optionalFiles]
      : [...compulsoryFiles];

    availableFiles.splice(fileOrder, 1);
    isOptional
      ? setOptionalFiles([...availableFiles])
      : setCompulsoryFiles([...availableFiles]);
  }

  function handleViewFile(displayFile: any) {
    if (displayFile?.file) {
      fetch(displayFile?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(displayFile), "_blank");
    }
  }

  return (
    <Fragment>
      <Row>
        <div className="w-50 mt-4">
          <TextField
            as="textarea"
            type="text"
            labelText="Memo"
            name="memo"
            id="memo"
            maxLength={200}
            value={formik?.values?.memo}
            onChange={formik.handleChange}
            disabled={isViewMode}
            classNames={customStyles.inputFieldControl2}
          />
        </div>

        {formik?.values?.claim_type === tabTypes.BILLABLES &&
          formik?.values?.payment_to === tabTypes.THIRD_PARTY && (
            <div className="w-50 mt-4">
              <TextField
                as="textarea"
                type="text"
                labelText="Reason for payment to 3rd party *"
                disabled={isViewMode}
                name="third_party_payment_reason"
                id="third_party_payment_reason"
                maxLength={200}
                value={formik?.values?.third_party_payment_reason}
                onChange={formik.handleChange}
                className={
                  formik.touched.third_party_payment_reason &&
                  formik.errors.third_party_payment_reason
                    ? `${customStyles.inputFieldControl2} ${customStyles.inputError}`
                    : customStyles.inputFieldControl2
                }
              />
              {formik.touched.third_party_payment_reason &&
              formik.errors.third_party_payment_reason ? (
                <div className={customStyles.errorText}>
                  <ExclamationTriangleFill className={customStyles.icon} />
                  {formik.errors.third_party_payment_reason}
                </div>
              ) : null}
            </div>
          )}
      </Row>
      {(optionalFiles?.length > 0 ||
        compulsoryFiles?.length > 0 ||
        !isViewMode) && (
        <Fragment>
          <div className={customStyles.attachText}>Attachments</div>
          {displayCompulsoryOptionalAttachment ? (
            <Row>
              <Col lg={5}>
                <div className={customStyles.reqText}>
                  Compulsory Requirement
                </div>

                <FileSelector
                  handleSave={(files) => {
                    if (files.length > 0) {
                      handleFileUpload(files, COMPULSORY_FILE_UPLOAD);
                    }
                  }}
                  acceptedFileFormats={onlyDOCandPDF}
                  multiple={true}
                  maximumSize={5 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                  disabled={isViewMode}
                >
                  <span className={customStyles.fileSelectorContainer}>
                    <Paperclip /> {getAttachmentFileName()}
                    <span className={customStyles.sizeStyles}>
                      &nbsp;&thinsp;Maximum Size: 20MB
                    </span>
                  </span>
                </FileSelector>

                <Row className="mt-2">
                  {compulsoryFiles?.length > 0 &&
                    compulsoryFiles.map((fileObj: any, index: number) => (
                      <Fragment key={index}>
                        <Col
                          lg={10}
                          md={10}
                          sm={12}
                          className={`${customStyles.fileText} ${
                            isViewMode ? "mt-2" : ""
                          } ${"d-flex"}`}
                          onClick={() => handleViewFile(fileObj)}
                        >
                          <span className={customStyles.ellipsis}>
                            {fileObj?.name ?? fileObj?.file_name}
                          </span>{" "}
                          - View
                        </Col>
                        {!isViewMode && (
                          <Col
                            lg={2}
                            md={2}
                            sm={12}
                            className={customStyles.removeTxt}
                            onClick={() =>
                              deleteAttachment(index, COMPULSORY_FILE_UPLOAD)
                            }
                          >
                            Remove
                          </Col>
                        )}
                      </Fragment>
                    ))}
                </Row>
                {!isViewMode && compulsoryFiles?.length <= 4 && (
                  <div className={customStyles.removeTxt}>
                    <FileSelector
                      handleSave={(uploadedFile) =>
                        handleFileUpload(uploadedFile, COMPULSORY_FILE_UPLOAD)
                      }
                      acceptedFileFormats={onlyDOCandPDF}
                      multiple={true}
                      maximumSize={5 * 1024 * 1024}
                      onError={() => {
                        toast.error(`Max Allowed file size is ${20} Mb`);
                      }}
                    >
                      <Button className={customStyles.attachmentButton}>
                        + Add
                      </Button>
                    </FileSelector>
                  </div>
                )}
              </Col>
              <Col lg={1}></Col>
              <Col lg={5}>
                <div className={customStyles.optionPart}>Optional</div>

                <FileSelector
                  handleSave={(files) => {
                    if (files.length > 0) {
                      handleFileUpload(files, OPTIONAL_FILE_UPLOAD);
                    }
                  }}
                  acceptedFileFormats={onlyDOCandPDF}
                  multiple={true}
                  maximumSize={5 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                  disabled={isViewMode}
                >
                  <span className={customStyles.fileSelectorContainer}>
                    <Paperclip /> Other Attachments{" "}
                    <span className={customStyles.sizeStyles}>
                      &nbsp;&thinsp;Maximum Size: 20MB
                    </span>
                  </span>
                </FileSelector>

                <Row className="mt-2">
                  {optionalFiles?.length > 0 &&
                    optionalFiles.map((fileObj: any, index: number) => (
                      <Fragment key={index}>
                        <Col
                          lg={10}
                          md={10}
                          sm={12}
                          className={`${customStyles.fileText} ${
                            isViewMode ? "mt-2" : ""
                          } ${"d-flex"} `}
                          onClick={() => handleViewFile(fileObj)}
                        >
                          <span className={customStyles.ellipsis}>
                            {fileObj?.name ?? fileObj?.file_name}
                          </span>{" "}
                          - View
                        </Col>
                        {!isViewMode && (
                          <Col
                            lg={2}
                            md={2}
                            sm={12}
                            className={customStyles.removeTxt}
                            onClick={() =>
                              deleteAttachment(index, OPTIONAL_FILE_UPLOAD)
                            }
                          >
                            Remove
                          </Col>
                        )}
                      </Fragment>
                    ))}
                </Row>

                {!isViewMode && optionalFiles?.length <= 4 && (
                  <Row className="mt-1">
                    <Col lg={12} className={customStyles.removeTxt}>
                      <FileSelector
                        handleSave={(uploadedFile) =>
                          handleFileUpload(uploadedFile, OPTIONAL_FILE_UPLOAD)
                        }
                        acceptedFileFormats={onlyDOCandPDF}
                        multiple={true}
                        maximumSize={5 * 1024}
                        onError={() => {
                          toast.error(`Max Allowed file size is ${20} Mb`);
                        }}
                      >
                        <Button className={customStyles.attachmentButton}>
                          + Add
                        </Button>
                      </FileSelector>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>
          ) : (
            <Row>
              <Col lg={5} md={12} sm={12}>
                <FileSelector
                  handleSave={(files) => {
                    if (files.length > 0) {
                      handleFileUpload(files, OPTIONAL_FILE_UPLOAD);
                    }
                  }}
                  acceptedFileFormats={onlyDOCandPDF}
                  multiple={true}
                  maximumSize={5 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                  disabled={isViewMode}
                >
                  <span className={customStyles.fileSelectorContainer}>
                    <Paperclip />
                    <span className={customStyles.sizeStyles}>
                      &nbsp;&thinsp;Maximum Size: 20MB
                    </span>
                  </span>
                </FileSelector>

                <Row className="mt-2">
                  {optionalFiles?.length > 0 &&
                    optionalFiles.map((fileObj: any, index: number) => (
                      <Fragment key={index}>
                        <Col
                          lg={10}
                          md={10}
                          sm={12}
                          className={`${customStyles.fileText} ${
                            isViewMode ? "mt-2" : ""
                          } ${"d-flex"}`}
                          onClick={() => handleViewFile(fileObj)}
                        >
                          <span className={customStyles.ellipsis}>
                            {fileObj?.name ?? fileObj?.file_name}
                          </span>{" "}
                          - View
                        </Col>
                        {!isViewMode && (
                          <Col
                            lg={2}
                            md={2}
                            sm={12}
                            className={customStyles.removeTxt}
                            onClick={() =>
                              deleteAttachment(index, OPTIONAL_FILE_UPLOAD)
                            }
                          >
                            Remove
                          </Col>
                        )}
                      </Fragment>
                    ))}
                </Row>

                {!isViewMode && optionalFiles?.length <= 4 && (
                  <Row className="mt-1">
                    <Col lg={12} className={customStyles.removeTxt}>
                      <FileSelector
                        handleSave={(uploadedFile) =>
                          handleFileUpload(uploadedFile, OPTIONAL_FILE_UPLOAD)
                        }
                        acceptedFileFormats={onlyDOCandPDF}
                        multiple={true}
                        maximumSize={5 * 1024}
                        onError={() => {
                          toast.error(`Max Allowed file size is ${20} Mb`);
                        }}
                      >
                        <Button className={customStyles.attachmentButton}>
                          + Add
                        </Button>
                      </FileSelector>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>
          )}
        </Fragment>
      )}
    </Fragment>
  );
}
