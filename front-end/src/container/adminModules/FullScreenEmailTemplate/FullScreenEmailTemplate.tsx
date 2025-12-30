"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form, Button } from "react-bootstrap";
import {
  ExclamationTriangleFill,
  XCircle,
  Paperclip,
} from "react-bootstrap-icons";
import { useRouter } from "next/navigation";
import styles from "../sendEmailTemplate/sendEmailTemplate.module.scss";
import commonStyles from "../../../common/commonStyles.module.scss";
import { AppModal } from "@/components/model/model";
import TextField from "@/components/TextField/textField";
import { useTokenDetails } from "@/common/commonHooks";
import debounce from "lodash/debounce";
import AsyncSelect from "react-select/async";
import { SendSystemEmailToTheClients } from "../sendEmailTemplate/sendEmailTemplate.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import CustomEditor from "@/components/editor/editor";
import { multipleFileUploadApi } from "@/app/api/commonAPIs";
import dynamic from "next/dynamic";
import { imageTypeFormats, fileTypeFormats } from "@/common/constants/general";
import { toast } from "@/app/Toaster";
import FileSelector from "@/components/fileSelector/fileSelector";
import { AdminlistAllUsers } from "../usersList/userList.functions";
import { FileUploadResponseData } from "../sendEmailTemplate/sendEmailTemplate.types";
import AttachmentPreview from "@/components/AttachmentPreview/AttachmentPreview";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";

const validationSchema = Yup.object().shape({
  from: Yup.string(),
  toEmails: Yup.string()
    // .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
    .required("At least one recipient is required"),
  // body: Yup.string().required("Body message is required"),
  subject: Yup.string().required("Subject message is required"),
});

const FullScreenEmailTemplate = (props: any) => {
  const { isView, isFullScreenModal = false, mailTo, onClose, ...rest } = props;

  const [showModal, setShowModal] = useState(false); // State to control the modal visibility

  const router = useRouter();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const fromEmailData =
    `${decodeTokenData?.userName}<${decodeTokenData?.emailId}>` || "";

  const [toEmailSelectedOpt, setToEmailSelectedOpt] = useState<any>(null);
  const [ccEmailSelectedOpt, setCcEmailSelectedOpt] = useState<any>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const printPreviewRef = useRef<HTMLDivElement>(null); // Specify the type of ref
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [renderAsFullScreen, setRenderAsFullScreen] = useState(false);

  useEffect(() => {
    if (isFullScreenModal && mailTo) {
      setRenderAsFullScreen(true);
      formik.setFieldValue("toEmails", mailTo);
      setToEmailSelectedOpt([{ label: mailTo, value: mailTo }]);
    }
  }, [mailTo, isFullScreenModal]);

  const handlePrintClick = () => {
    const printContent = printPreviewRef.current?.innerHTML;

    // Create a new element to contain the print content
    const printContainer = document.createElement("div");
    printContainer.innerHTML = printContent || "";

    // Hide all other elements on the page
    document.body.querySelectorAll("*").forEach((element) => {
      if (element !== printContainer) {
        element.classList.add("hide-on-print"); // Apply a CSS class to hide elements
      }
    });

    // Append the print container to the document body
    document.body.appendChild(printContainer);

    // Print the print container
    window.print();

    // Remove the print container after printing
    document.body.removeChild(printContainer);

    // Show all other elements on the page
    document.body.querySelectorAll("*").forEach((element) => {
      if (element !== printContainer) {
        element.classList.remove("hide-on-print"); // Remove the CSS class to show elements
      }
    });
  };

  const formik = useFormik({
    initialValues: {
      toEmails: "",
      ccEmails: "",
      subject: "",
    },

    validationSchema,
    onSubmit: (values) => {
      // Handle form submission
      setShowModal(true); // Show modal after successful form submission
    },
  });

  const handleEditorChange = (content: any) => {
    setEditorContent(content);
  };

  // Function to handle file change
  const handleFileChange = (newFiles: File[]) => {
    if (files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    setFiles([...files, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames([...selectedFileNames, ...newFileNames]);
  };

  const handleModalPopUpFunction = async () => {
    let ccEmailsArray: any = [];
    let toEmailsArray: any = [];
    ccEmailSelectedOpt?.forEach((each: any) => ccEmailsArray.push(each.value));
    toEmailSelectedOpt?.forEach((each: any) => toEmailsArray.push(each.value));
    setShowModal(false);
    setDisabledBtn(true);
    let fileIds: Array<string> = [];
    if (files.length > 0) {
      let userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Communication_attach",
      };
      let multiUserData: any[] = [];
      files.forEach((item: any) => multiUserData.push(userData));
      const fileResponse: FileUploadResponseData[] =
        await multipleFileUploadApi(files, multiUserData, accessTokenId);
      if (fileResponse?.length > 0) {
        fileResponse.forEach((each: FileUploadResponseData) =>
          fileIds.push(each?.id)
        );
      }
    }
    let payload = {
      attachmentIds: fileIds || null,
      body: editorContent,
      emailCcIds: ccEmailsArray || [],
      emailFromId: decodeTokenData.emailId,
      subject: formik.values.subject.trim(),
      toEmails: toEmailsArray || [],
      type: null,
    };
    let response = await SendSystemEmailToTheClients(
      payload,
      "",
      setDisabledBtn
    );
    if (response) {
      if (isFullScreenModal) {
        closeFullScreenModal();
      } else {
        router.push(ApplicationURLS.ADMIN_COMMUNICATION);
      }
    }
  };

  const handleSendAndCloseClick = () => {
    formik.handleSubmit();
  };
  const getAdminUsersList = async (inputValue: any) => {
    if (inputValue.length > 2) {
      const responseData = await AdminlistAllUsers({
        page: null,
        perPage: null,
        keyWord: inputValue,
        status: "",
      });
      const modifiedData =
        responseData?.users &&
        responseData?.users.map((each: any) => ({
          value: each?.email_id,
          label: `${each?.first_name} ${
            each?.last_name ? each?.last_name : ""
          } (${each?.email_id})`,
        }));
      // setUserOptions(modifiedData);
      return modifiedData;
    } else {
      return [];
    }
  };

  function handleViewFile(displayFile: any) {
    if (
      displayFile &&
      typeof displayFile?.attachmentImage === "string" &&
      displayFile.attachmentImage?.includes("base64") &&
      isView
    ) {
      fetch(displayFile?.attachmentImage)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(displayFile), "_blank");
    }
  }
  const handleSelectToEmailsChange = (newOption: any) => {
    // formik.setFieldValue("UserId", newOption.value);
    formik.setFieldValue(
      "toEmails",
      newOption.map((option: any) => option.value).join(",")
    );
    setToEmailSelectedOpt(newOption);
  };
  const handleSelectCCEmailsChange = (newOption: any) => {
    // formik.setFieldValue("UserId", newOption.value);
    formik.setFieldValue(
      "ccEmails",
      newOption.map((option: any) => option.value).join(",")
    );
    setCcEmailSelectedOpt(newOption);
  };

  const debouncedLoadOptions = debounce(async (inputValue, callback) => {
    try {
      setLoadingOptions(true);
      const options = await getAdminUsersList(inputValue);
      callback(options);
    } catch (error) {
      console.error("Error fetching options:", error);
    } finally {
      setLoadingOptions(false);
    }
  }, 500); // Customizable debounce delay in milliseconds

  const loadOptions = useCallback(
    (inputValue: any, callback: any) => {
      debouncedLoadOptions(inputValue, callback);
    },
    [debouncedLoadOptions]
  );
  const handleSubjectChange = (e: any) => {
    let sub = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("subject", sub);
  };

  function closeFullScreenModal() {
    setRenderAsFullScreen(false);
    onClose();
  }
  return (
    <ModalFullScreen
      displayFullScreenModal={renderAsFullScreen}
      onClose={() => closeFullScreenModal()}
      customButtons={true}
      btnConfig={
        <Row className="w-100 d-flex align-items-center">
          <Col xl={7} lg={7} md={6} sm={12} xs={12}>
            <Button
              className={`${styles.buttonStyle} ${styles.fullScreenCancelBtn}`}
              onClick={() => closeFullScreenModal()}
            >
              Cancel
            </Button>
          </Col>
          <Col
            xl={5}
            lg={5}
            md={5}
            sm={12}
            xs={12}
            className={`${styles.modalButtonsAlign} ${"text-end"}`}
          >
            {" "}
            <Button
              type="button"
              className={`${styles.buttonStyle} ${styles.fullScreenPrintBtn}`}
              onClick={handlePrintClick}
            >
              Print
            </Button>
            <Button
              type="button"
              className={`${styles.buttonStyle} ${styles.fullScreenSaveBtn}`}
              onClick={() => handleSendAndCloseClick()}
              disabled={disabledBtn}
            >
              Send and Close
            </Button>
          </Col>
        </Row>
      }
    >
      <div className={styles.mainCon}>
        <div className="w-100">
          <div className="row">
            <div className="col-md-6">
              <Form
                onSubmit={formik.handleSubmit}
                noValidate
                className={styles.formStyle}
              >
                <Row>
                  <span className={styles.headerText}>Send email</span>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    <TextField
                      placeholder=""
                      type="text"
                      labelText="From"
                      name="from"
                      id="from"
                      required
                      disabled
                      value={fromEmailData}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      classNames={commonStyles.inputFieldControl}
                    />
                  </Col>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    {true && (
                      <Form.Label className={styles.labelStyle}>To</Form.Label>
                    )}
                    <AsyncSelect
                      isMulti
                      isDisabled={isView}
                      cacheOptions
                      loadOptions={loadOptions}
                      onChange={handleSelectToEmailsChange}
                      value={toEmailSelectedOpt}
                      placeholder={" "}
                      openMenuOnClick={false}
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          height: "40px",
                          width: "100%",
                        }),
                        valueContainer: (provided: any) => ({
                          ...provided,
                          height: "40px",
                          overflowY: "auto",
                        }),
                      }}
                    />
                    {formik.touched.toEmails && formik.errors.toEmails && (
                      <div className={styles.errorContainer}>
                        <ExclamationTriangleFill
                          className={styles.crossiconsSyles}
                        />
                        <span className={styles.errorTextStyles}>
                          {formik.errors.toEmails}
                        </span>
                      </div>
                    )}
                  </Col>
                </Row>
                {/* (Seperate all emails by a comma with no spaces) */}
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    {true && (
                      <Form.Label className={styles.labelStyle}>CC</Form.Label>
                    )}
                    <AsyncSelect
                      isMulti
                      isDisabled={isView}
                      cacheOptions
                      loadOptions={loadOptions}
                      onChange={handleSelectCCEmailsChange}
                      value={ccEmailSelectedOpt}
                      placeholder={" "}
                      openMenuOnClick={false}
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          height: "40px",
                          width: "100%",
                        }),
                        valueContainer: (provided: any) => ({
                          ...provided,
                          height: "40px",
                          overflowY: "auto",
                        }),
                      }}
                    />
                  </Col>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    <TextField
                      disabled={isView}
                      placeholder=""
                      type="text"
                      errorText={formik.errors.subject}
                      isInvalid={
                        formik.touched.subject && formik.errors.subject
                          ? true
                          : false
                      }
                      labelText="Subject"
                      name="subject"
                      id="subject"
                      required
                      value={formik.values.subject}
                      onChange={handleSubjectChange}
                      onBlur={formik.handleBlur}
                      endingData={
                        formik.touched.subject &&
                        formik.errors.subject && (
                          <XCircle className={styles.crossiconsSyles} />
                        )
                      }
                      endingDataStyles={styles.endIconStyle}
                      classNames={commonStyles.inputFieldControl}
                    />
                  </Col>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    <div>
                      <label className={styles.desc}>Email Body</label>
                      <CustomEditor
                        disabled={isView}
                        onChange={(data: any) => {
                          if (!isView) {
                            handleEditorChange(data);
                          }
                        }}
                        // suppresshydrationwarning={true}
                        value={editorContent}
                      />
                    </div>
                  </Col>
                </Row>
                <Col>
                  <span>Attachments</span>
                </Col>

                {files?.length > 0 && (
                  <Col className={styles.filesviewContanier}>
                    {files.map((eachFile: any, index: number) => {
                      return (
                        <div
                          className={styles.eachFielDetailsView}
                          key={index}
                          onClick={() => handleViewFile(eachFile)}
                        >
                          <AttachmentPreview
                            uploadedFile={
                              isView
                                ? { ...eachFile, type: eachFile?.file_type }
                                : eachFile
                            }
                            hideDeleteButton={isView}
                            onDelete={(e) => {
                              e.stopPropagation();
                              // Filter out the file that needs to be removed
                              const updatedFiles = files.filter(
                                (file, i) => i !== index
                              );
                              setFiles(updatedFiles);
                              let filterNames = selectedFileNames.filter(
                                (each: any) => each !== eachFile?.file_name
                              );
                              setSelectedFileNames(filterNames);
                            }}
                            isMultipleAttachment={true}
                          />
                        </div>
                      );
                    })}
                  </Col>
                )}
                {files?.length < 5 && !isView && (
                  <FileSelector
                    handleSave={(files) => {
                      if (files.length > 0) {
                        const fileArray = Array.from(files) as File[];
                        // changeFileName
                        const newFileArray = fileArray.map((file) => {
                          // const fileNameUUID = v4();
                          const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                          const newFile = new File([file], newFileName, {
                            type: file.type,
                          });
                          return newFile;
                        });
                        handleFileChange(newFileArray);
                      }
                    }}
                    acceptedFileFormats={[
                      ...fileTypeFormats,
                      ...imageTypeFormats,
                    ]}
                    multiple={true}
                    maximumSize={5 * 1024}
                    onError={(error) => {
                      toast.error(`Max Allowed file size is ${5} Mb`);
                    }}
                  >
                    <span className={styles.fileSelectorContainer}>
                      <Paperclip /> select files
                    </span>
                  </FileSelector>
                )}
              </Form>
            </div>

            <div id="printpreview" className="col-md-6" ref={printPreviewRef}>
              <Row>
                <Col>
                  <span className={styles.secondHeaderText}>Preview</span>
                  <div className={styles.previewBoxStyle}>
                    <span className={styles.fromStyle}>From:</span>{" "}
                    <span>{fromEmailData}</span>
                    <div className={styles.emailsViewCon}>
                      <span className={styles.fromStyle}>To:</span>{" "}
                      <span>{formik?.values?.toEmails}</span>
                    </div>
                    <div className={styles.emailsViewCon}>
                      <span className={styles.fromStyle}>Cc:</span>{" "}
                      <span>{formik?.values?.ccEmails}</span>
                    </div>
                    {files?.length > 0 && (
                      <Col className={styles.filesviewContanier}>
                        {files.map((eachFile: any, index: number) => {
                          return (
                            <div
                              className={styles.eachFielDetailsView}
                              key={index}
                            >
                              <AttachmentPreview
                                uploadedFile={
                                  isView
                                    ? {
                                        ...eachFile,
                                        type: eachFile?.file_type,
                                      }
                                    : eachFile
                                }
                                hideDeleteButton={true}
                                onDelete={() => {}}
                                isMultipleAttachment={true}
                              />
                            </div>
                          );
                        })}
                      </Col>
                    )}
                    <p className={styles.thirdHeaderText}>
                      {formik.values.subject}
                    </p>
                    <div className={styles.paymentId}>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: editorContent,
                        }}
                      />
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          <AppModal
            show={showModal}
            onHide={() => setShowModal(false)}
            secondButtonLabel="Cancel"
            firstButtonLabel="Send"
            modalHeading=""
            modalBodyTitle=""
            modalBodyContent={"Do you want to send your mail?"}
            onConfirm={() => {
              handleModalPopUpFunction();
            }}
          />
        </div>
      </div>
    </ModalFullScreen>
  );
};

export default dynamic(() => Promise.resolve(FullScreenEmailTemplate), {
  ssr: false,
});
