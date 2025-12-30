"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Image from "next/image";
import { Row, Col, Form, Button } from "react-bootstrap";
import { ExclamationTriangleFill, XCircle } from "react-bootstrap-icons";
import { useParams, useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import AsyncCreatableSelect from "react-select/async-creatable";
import CustomEditor from "@/components/editor/editor";
import dynamic from "next/dynamic";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import {
  FetchDetailsOfANoticeMail,
  handlePrintClick,
  handleViewFile,
  SentMailForANotice,
  UpdateNoticeMail,
} from "../notices.functions";
import { AdminlistAllUsers } from "@/container/adminModules/usersList/userList.functions";
import styles from "./sendNoticeMail.module.scss";
import commonStyles from "./../../../../common/commonStyles.module.scss";
import TextField from "@/components/TextField/textField";
import { AppModal } from "@/components/model/model";
import pdfIcon from "./../../../../../public/assets/pdf-icon.png";
import { ApplicationURLS } from "@/common/applicationURLS";
const validationSchema = Yup.object().shape({
  from: Yup.string(),
  toEmails: Yup.string().required("At least one recipient is required"),
  subject: Yup.string().required("Subject message is required"),
});

const SendNoticeMail = (props: any) => {
  const { isView, ...rest } = props;
  const params = useParams();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const [ccEmailSelectedOpt, setCcEmailSelectedOpt] = useState<any>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [emailViewData, setEmailViewData] = useState<any>({});
  const [openFullScreen, setOpenFullScreen] = useState(true);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [options, setOptions] = useState<any>([]);
  const printPreviewRef = useRef<HTMLDivElement>(null); // Specify the type of ref
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    (async () => {
      if (params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const emailDataResponse = await FetchDetailsOfANoticeMail(payload);
        if (emailDataResponse?.id) {
          setEmailViewData(emailDataResponse);
          setEditorContent(emailDataResponse?.email_content);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  const formik = useFormik({
    initialValues: {
      ccEmails: "",
      subject: "",
    },
    validationSchema,
    onSubmit: (values) => {
      setShowModal(true);
    },
  });

  useEffect(() => {
    if (emailViewData?.id) {
      formik.setValues({
        ccEmails: emailViewData?.emailCcIds?.toString(),
        subject: emailViewData?.email_subject,
      });
      setEditorContent(emailViewData?.email_content);
    }
  }, [emailViewData]);

  useEffect(() => {
    if (!openFullScreen) {
      router.back();
    }
  }, [openFullScreen]);

  const handleEditorChange = (content: any) => {
    setEditorContent(content);
  };

  const getAdminUsersList = async (inputValue: any) => {
    if (inputValue.length > 4) {
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
      return modifiedData;
    } else {
      return [];
    }
  };
  const handleSelectCCEmailsChange = (newOption: any) => {
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
  }, 500);

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

  // Function to format the label for creating new options
  const formatCreateLabel = (inputValue: any) => `"${inputValue}"`;

  // Function to validate if an input is a valid email
  const isValidEmail = (email: string): boolean => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
  };

  // Function to handle the creation of a new option
  const handleCreate = (inputValue: any) => {
    if (isValidEmail(inputValue)) {
      const newOption = { value: inputValue, label: inputValue };
      setOptions((prevOptions: any) => [...prevOptions, newOption]);
      setCcEmailSelectedOpt((prevSelected: any) => [
        ...prevSelected,
        newOption,
      ]);
      formik.setFieldValue(
        "ccEmails",
        [...ccEmailSelectedOpt, newOption]
          .map((option: any) => option.value)
          .join(",")
      );
    } else {
      setEmailError("Invalid email address");
      setTimeout(() => {
        setEmailError("");
      }, 3000);
    }
  };
  const onSaveSendClick = async () => {
    setDisabledSaveBtn(true);
    if (!emailViewData?.notice_id) {
      setDisabledSaveBtn(false);
      return;
    }
    const payloadData = {
      email_cc: formik?.values?.ccEmails || emailViewData?.email_cc || "",
      email_content: editorContent || emailViewData?.email_content,
      email_from: emailViewData?.email_from,
      email_subject: emailViewData?.email_subject,
      email_to: emailViewData?.email_to,
      notice_mail_id: emailViewData?.notice_mail_id,
    };
    const responseData = await UpdateNoticeMail(payloadData);
    if (responseData?.id) {
      let sendmailData = await SentMailForANotice({ id: responseData?.id });
      if (sendmailData) {
        router.push(ApplicationURLS.USER_NOTICES);
      } else {
        setDisabledSaveBtn(false);
      }
    } else {
      setDisabledSaveBtn(false);
    }
  };
  return (
    <ModalFullScreen
      displayFullScreenModal={openFullScreen}
      onClose={() => {
        if (!disabledSaveBtn) setOpenFullScreen(false);
      }}
      customButtons={true}
      btnConfig={
        <div className={styles.btnContainer}>
          <Button
            className={`${styles.modalpopupBtn} ${styles.cancelButton}`}
            onClick={() => {
              if (!disabledSaveBtn) setOpenFullScreen(false);
            }}
          >
            Cancel
          </Button>
          <div className={styles.saveBtnsContianer}>
            <Button
              className={`${styles.modalpopupBtn} ${styles.cancelButton}`}
              disabled={disabledSaveBtn}
              onClick={() => handlePrintClick(printPreviewRef)}
            >
              Print
            </Button>

            {!isView && (
              <Button
                className={styles.modalpopupBtn}
                disabled={disabledSaveBtn}
                onClick={() => {
                  setDisabledSaveBtn(true);
                  onSaveSendClick();
                }}
              >
                Send and close
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.dataContainer}>
        {wrongIdCheck ? (
          <div className={styles.noDataStyle}>No data available on this id</div>
        ) : (
          <div className="row w-100">
            <div className="col-md-6">
              <Form
                onSubmit={formik.handleSubmit}
                noValidate
                className={styles.formStyle}
              >
                <Row>
                  <span className={styles.headerText}>Send Notice</span>
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
                      value={emailViewData?.email_from}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      endingDataStyles={styles.endIconStyle}
                      classNames={commonStyles.inputFieldControl}
                    />
                  </Col>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    <TextField
                      placeholder=""
                      type="text"
                      labelText="To"
                      name="to"
                      id="to"
                      required
                      disabled
                      value={emailViewData?.email_to}
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
                      <Form.Label className={styles.labelStyle}>
                        CC (Separate all emails by a comma with no spaces)
                      </Form.Label>
                    )}
                    <AsyncCreatableSelect
                      isMulti
                      cacheOptions
                      isDisabled={isView}
                      defaultOptions={options}
                      loadOptions={loadOptions}
                      onChange={handleSelectCCEmailsChange}
                      value={ccEmailSelectedOpt}
                      placeholder={" "}
                      openMenuOnClick={false}
                      onCreateOption={handleCreate}
                      formatCreateLabel={formatCreateLabel}
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          height: "40px",
                          width: "100%",
                        }),
                        valueContainer: (provided: any) => ({
                          ...provided,
                          height: "35px",
                          overflowY: "auto",
                        }),
                      }}
                    />
                    {emailError && (
                      <div className={styles.errorContainer}>
                        <ExclamationTriangleFill
                          className={styles.crossiconsSyles}
                        />
                        <span className={styles.errorTextStyles}>
                          {emailError}
                        </span>
                      </div>
                    )}
                  </Col>
                </Row>
                <Row className={`${styles.textFieldStyles}`}>
                  <Col className={styles.eachFieldBottom}>
                    <TextField
                      disabled={true}
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
                        onChange={(data: any) => {
                          handleEditorChange(data);
                        }}
                        value={editorContent}
                        disabled={isView}
                      />
                    </div>
                  </Col>
                </Row>
                <Col>
                  <span>Attachments</span>
                  {emailViewData?.supportDoc?.id && (
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => handleViewFile(emailViewData?.supportDoc)}
                    >
                      <Image
                        src={pdfIcon}
                        alt="file icon"
                        width={34}
                        height={36}
                        className="mx-1"
                      />
                      <span>{emailViewData?.supportDoc?.file_name}</span>
                    </div>
                  )}
                  {emailViewData?.uploadedNotice?.id && (
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        handleViewFile(emailViewData?.uploadedNotice)
                      }
                    >
                      <Image
                        src={pdfIcon}
                        alt="file icon"
                        width={34}
                        height={36}
                        className="mx-1"
                      />
                      <span>{emailViewData?.uploadedNotice?.file_name}</span>
                    </div>
                  )}
                </Col>
              </Form>
            </div>
            <div id="printpreview" className="col-md-6" ref={printPreviewRef}>
              <Row>
                <Col>
                  <span className={styles.secondHeaderText}>Preview</span>
                  <div className={styles.previewBoxStyle}>
                    <span className={styles.fromStyle}>From:</span>{" "}
                    <span>{emailViewData?.email_from}</span>
                    <div className={styles.emailsViewCon}>
                      <span className={styles.fromStyle}>To:</span>{" "}
                      <span className={styles.toDataStyle}>
                        &nbsp;{emailViewData?.email_to}
                      </span>
                    </div>
                    <div className={styles.emailsViewCon}>
                      <span className={styles.fromStyle}>Cc:</span>{" "}
                      <span>{formik?.values?.ccEmails}</span>
                    </div>
                    <div className="mt-2">
                      {emailViewData?.supportDoc?.id && (
                        <span>
                          <Image
                            src={pdfIcon}
                            alt="file icon"
                            width={34}
                            height={36}
                            className="mx-1"
                          />
                          <span>{emailViewData?.supportDoc?.file_name}</span>
                        </span>
                      )}
                      {emailViewData?.uploadedNotice?.id && (
                        <span>
                          <Image
                            src={pdfIcon}
                            alt="file icon"
                            width={34}
                            height={36}
                            className="mx-1"
                          />
                          <span>
                            {emailViewData?.uploadedNotice?.file_name}
                          </span>
                        </span>
                      )}
                    </div>
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
            <AppModal
              show={showModal}
              onHide={() => setShowModal(false)}
              secondButtonLabel="Cancel"
              firstButtonLabel="Send"
              modalHeading=""
              modalBodyTitle=""
              modalBodyContent={"Do you want to send your mail?"}
              onConfirm={() => {
                // handleModalPopUpFunction();
              }}
            />
          </div>
        )}
      </div>
    </ModalFullScreen>
  );
};

export default dynamic(() => Promise.resolve(SendNoticeMail), {
  ssr: false,
});
