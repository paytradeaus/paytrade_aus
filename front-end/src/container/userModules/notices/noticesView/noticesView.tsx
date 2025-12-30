"use client";
import React, { useEffect, useState } from "react";
import TextField from "@/components/TextField/textField";
import Image from "next/image";
import Money from "../../../../../public/assets/Money.png";
import styles from "./noticesView.module.scss";
import { Anchor, Button, Col, Form, Row } from "react-bootstrap";

import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";

import { useFormik } from "formik";

import { useTokenDetails } from "@/common/commonHooks";
import { deleteAttachment, multipleFileUploadApi } from "@/app/api/commonAPIs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  INoticeViewData,
  SupportDocNotRequiredNoticeTypes,
} from "../notices.types";
import { ListAllMailsOfANotice, UpdateNotice } from "../notices.functions";
import FormButton from "@/components/Button/button";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "@/app/Toaster";
import CheckBox from "@/components/CheckBox/checkBox";
import { formatDate } from "@/common/commonFunctions";
import { commonCookies, DD_MM_YYYY } from "@/common/constants/general";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import { getCookie } from "cookies-next";
import { RootState, useAppSelector } from "@/redux/store";
const NoticesViewType = (props: any) => {
  const { data, isView = false, ...rest } = props;
  const [selectedToggled, setSelectedToggled] = useState<string>("Basic");
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const routePath = usePathname();
  const [noticeData, setNoticeData] = useState<INoticeViewData>();
  const [sentCheckBox, setSentCheckBox] = useState(false);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [updatedNoticeFile, setUpdatedNoticeFile] = useState<any>({});
  const [selectorEnable, setSelectorEnable] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const formik: any = useFormik({
    initialValues: {
      AccountName: "",
      ProjectName: "",
      NoticeSource: "",
      NoticeType: "",
      uploaded_file: "",
      useNotes: "",
    },
    onSubmit: async (values) => {
      // console.log(values, "values");
    },
  });

  const [openFullScreen, setOpenFullScreen] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [historyData, setHistoryData] = useState([]);
  const [supportDocument, setSupportDocument] = useState<any>({});

  const queryParams: any = useSearchParams();
  const complianceTab = queryParams.get("complianceTab");
  const complianceProjectId = queryParams.get("projectId");

  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;
  const [qbccNoticeDocument, setQbccNoticeDocument] = useState<any>({});

  useEffect(() => {
    (async () => {
      if (isView && data?.notice_id) {
        if (userMode === "Onboarding" && data?.status !== "Sent - Onboarded") {
          toast.info("You are in onboarding mode and cannot send notices");
        }
        setNoticeData(data);

        formik.setValues({
          AccountName: data?.bank_account_name || "",
          ProjectName: data?.project_name || "",
          NoticeSource: data?.notice_source || "",
          NoticeType: data?.notice_type || "",
          userNotes: data?.memo_notes || "",
        });
        setSentCheckBox(
          data?.status === "Sent" ||
            data?.status === "Sent - Onboarded" ||
            false
        );
        if (data?.uploadedNotice?.id) {
          setSelectorEnable(false);
          setUpdatedNoticeFile(data?.uploadedNotice);
          setSupportDocument(data?.supportDoc);
        }
        if (data?.supportDoc?.id) {
          setSupportDocument(data?.supportDoc);
        }
        if (data?.qbccNotice?.id) {
          setQbccNoticeDocument(data?.qbccNotice);
        }
        const mailData = await ListAllMailsOfANotice({
          notice_id: data?.notice_id,
          items_per_page: 1000,
          page: 1,
        });
        setHistoryData(mailData?.mails_list || []);
      }
    })();
  }, [data]);

  useEffect(() => {
    if (files.length > 0 || updatedNoticeFile?.id) {
      setSelectorEnable(false);
    } else {
      setSelectorEnable(true);
    }
  }, [files, updatedNoticeFile]);

  useEffect(() => {
    if (!openFullScreen) {
      const backToURLPath = getCookie("noticeListPath");

      //if routed from compliances
      if (complianceTab) {
        onRouteFromCompliance();
        return;
      }
      backToURLPath ? router.push(`${backToURLPath}`) : router.back();
      // console.log(backToURLPath, "backToURLPath");
      // router.back();
    }
  }, [openFullScreen]);
  const handleToggledChange = (value: any) => {
    setSelectedToggled(value);
  };

  function onRouteFromCompliance() {
    router.push(
      `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${complianceProjectId}&tab=${complianceTab}`
    );
  }
  function handleViewFile(displayFile: any) {
    if (
      displayFile &&
      typeof displayFile?.file === "string" &&
      displayFile.file?.includes("base64")
    ) {
      fetch(displayFile?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(displayFile), "_blank");
    }
  }
  const handleFileChange = (newFiles: File[]) => {
    // Update state with new files
    setFiles(newFiles);
  };
  const handleFileChange2 = (newFiles: File[]) => {
    // Update state with new files
    setSupportFiles(newFiles);
  };
  const handleFileUploads = async () => {
    try {
      let fileIds: any = [];
      let multiUserData = [];
      if (files.length > 0) {
        multiUserData.push({
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Notices_uploads",
          notice_id: noticeData?.notice_id,
        });
      }
      if (supportFiles.length > 0) {
        multiUserData.push({
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Notices_support_docs",
          notice_id: noticeData?.notice_id,
        });
      }
      if (files.length > 0 || supportFiles.length > 0) {
        const fileResponse = await multipleFileUploadApi(
          [...files, ...supportFiles],
          multiUserData,
          accessTokenId
        );
        if (fileResponse?.length > 0) {
          fileIds = fileResponse.map((each: any) => each?.id);
        }
      }
      return fileIds;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  const onHandleSaveClick = async () => {
    setDisabledSaveBtn(true);
    if (!SupportDocNotRequiredNoticeTypes.includes(data?.notice_type))
      if (
        files?.length === 0 &&
        !updatedNoticeFile?.id &&
        supportFiles?.length === 0 &&
        !supportDocument?.id
      ) {
        toast.error(
          "Please upload the Notice Template and Supporting Document"
        );
        setDisabledSaveBtn(false);
        return;
      }
    if (files?.length === 0 && !updatedNoticeFile?.id) {
      toast.error("Please upload the Notice Template ");
      setDisabledSaveBtn(false);
      return;
    }
    if (!SupportDocNotRequiredNoticeTypes.includes(data?.notice_type))
      if (supportFiles?.length === 0 && !supportDocument?.id) {
        toast.error("Please upload the Supporting Document ");
        setDisabledSaveBtn(false);
        return;
      }
    if (files?.length > 0 || supportFiles?.length > 0)
      await handleFileUploads();
    let payload = {
      notice_id: noticeData?.notice_id,
      status: sentCheckBox ? "Sent" : noticeData?.status,
    };
    if (
      !supportDocument?.id &&
      noticeData?.supportDoc?.id &&
      supportFiles?.length === 0
    ) {
      const payLoadFile = {
        attachmentId: noticeData?.supportDoc?.id,
        attachmentType: "Notices_support_docs",
        id: noticeData?.id,
      };
      await deleteAttachment(payLoadFile);
    }
    const response = await UpdateNotice(payload, true, setDisabledSaveBtn);
    if (response) {
      const backToURLPath = getCookie("noticeListPath");
      if (complianceTab) {
        onRouteFromCompliance();
        return;
      }
      backToURLPath ? router.push(`${backToURLPath}`) : router.back();
      // router.back();
    }
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    setSupportDocument({});
    setSupportFiles([]);
  };

  const renderViews = () => {
    switch (selectedToggled) {
      case "Basic":
        return (
          <>
            {" "}
            <Row>
              <Col lg={6} md={12} xs={12} sm={12}>
                <div className="mt-5">
                  <div>Required Documents *</div>
                  {selectorEnable && (
                    <div
                      className={styles.fileContainer}
                      style={{ marginRight: "5px" }}
                    >
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
                        acceptedFileFormats={["application/pdf"]}
                        multiple={false}
                        maximumSize={20 * 1024}
                        onError={(error) => {
                          toast.error(`Max Allowed file size is ${20} Mb`);
                        }}
                      >
                        <FormButton className={styles.btnStyles}>
                          Add Notice
                        </FormButton>
                      </FileSelector>
                    </div>
                  )}

                  {!supportDocument?.id && supportFiles.length == 0 && (
                    <div className={styles.fileContainer}>
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
                            handleFileChange2(newFileArray);
                          }
                        }}
                        acceptedFileFormats={["application/pdf"]}
                        multiple={false}
                        maximumSize={20 * 1024}
                        onError={(error) => {
                          toast.error(`Max Allowed file size is ${20} Mb`);
                        }}
                      >
                        <FormButton className={styles.btnStyles}>
                          Add Support Document
                        </FormButton>
                      </FileSelector>
                    </div>
                  )}
                  {supportDocument?.id && (
                    <Row className={styles.supportTxt}>
                      <div
                        onClick={() => handleViewFile(supportDocument)}
                        title={
                          supportDocument?.name || supportDocument?.file_name
                        }
                        className={`${styles.statusName} ${styles.viewCursor}`}
                      >
                        Supporting Statement - View
                        {noticeData?.status !== "Sent" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenModal(!openModal);
                              // setSupportDocument({});
                            }}
                            className={`${styles.removeTxt} ${styles.marginLeft10}`}
                          >
                            Remove
                          </span>
                        )}
                      </div>
                    </Row>
                  )}
                  {supportFiles?.map((eachFile: any, index: number) => {
                    return (
                      <Row className="mt-2" key={index}>
                        <Col>
                          <div
                            // className={styles.eachFielDetailsView}
                            className={`${styles.statusName} ${styles.viewCursor}`}
                            key={index}
                            title={eachFile?.name || eachFile?.file_name}
                            onClick={() => handleViewFile(eachFile)}
                          >
                            Supporting Statement - View
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenModal(!openModal);
                                // setSupportFiles([]);
                              }}
                              className={`${styles.removeTxt} ${styles.marginLeft10}`}
                            >
                              Remove
                            </span>
                          </div>
                        </Col>
                      </Row>
                    );
                  })}
                  {files?.map((eachFile: any, index: number) => {
                    return (
                      <Row className="mt-2" key={index}>
                        <Col>
                          <div
                            className={styles.eachFielDetailsView}
                            key={index}
                          >
                            <span
                              className={styles.statusName}
                              title={eachFile?.name || eachFile?.file_name}
                            >
                              {eachFile?.name || eachFile?.file_name}
                            </span>
                            <span
                              className={styles.fileText}
                              onClick={() => handleViewFile(eachFile)}
                            >
                              {`- View`}
                            </span>
                            <span
                              onClick={() => {
                                setFiles([]);
                              }}
                              className={styles.removeTxt}
                            >
                              Remove
                            </span>
                          </div>
                        </Col>
                      </Row>
                    );
                  })}
                  {updatedNoticeFile?.id && (
                    <Row className="mt-2">
                      <Col>
                        <div className={styles.eachFielDetailsView}>
                          <span
                            className={styles.statusName}
                            title={updatedNoticeFile?.file_name || ""}
                          >
                            {updatedNoticeFile?.file_name || ""}
                          </span>
                          <span
                            className={styles.fileText}
                            onClick={() => handleViewFile(updatedNoticeFile)}
                          >
                            {`- View`}
                          </span>
                          {noticeData?.status !== "Sent" && (
                            <span
                              onClick={() => {
                                setUpdatedNoticeFile({});
                              }}
                              className={styles.removeTxt}
                            >
                              Remove
                            </span>
                          )}
                        </div>
                      </Col>
                    </Row>
                  )}
                  {qbccNoticeDocument?.id && (
                    <Row className="mt-2">
                      <Col>
                        <div className={styles.eachFielDetailsView}>
                          <span
                            className={styles.statusName}
                            title={qbccNoticeDocument?.file_name || ""}
                          >
                            {qbccNoticeDocument?.file_name || ""}
                          </span>
                          <span
                            className={styles.fileText}
                            onClick={() => handleViewFile(qbccNoticeDocument)}
                          >
                            {`- View`}
                          </span>

                          {/* <span
                            onClick={() => {
                              setUpdatedNoticeFile({});
                            }}
                            className={styles.removeTxt}
                          >
                            Remove
                          </span> */}
                        </div>
                      </Col>
                    </Row>
                  )}
                </div>
              </Col>
              <Col lg={6} md={12} xs={12} sm={12} className="mt-5">
                <div className={styles.noticeBox}>
                  <div className={styles.headSection}>
                    AUTO NOTICE COMPLETION AND SUBMISSION
                  </div>
                  <div className="mt-3">
                    With a premium subscription Pay Trade automatically
                    completes your required notice documents and submits them to
                    your Client/Supplier or the QBCC as required.
                  </div>

                  <div className={`${styles.statusName} ${styles.effect}`}>
                    <Anchor
                      href={ApplicationURLS.USER_SUBSCRIPTION_UPGRADE}
                      onClick={() => {
                        sessionStorage.setItem(
                          commonCookies.NAVIGATED_FROM,
                          routePath
                          // ApplicationURLS.USER_NOTICES
                        );
                      }}
                    >
                      UPGRADE NOW
                    </Anchor>
                  </div>
                </div>
              </Col>
            </Row>
            <div className={`mt-3 ${styles.sentContainer}`}>
              <div className={styles.sendStyle}>Sent History</div>
              <CheckBox
                label={"- Sent"}
                checked={sentCheckBox}
                onChange={() => {
                  if (
                    !SupportDocNotRequiredNoticeTypes.includes(
                      data?.notice_type
                    )
                  )
                    if (
                      files?.length === 0 &&
                      !updatedNoticeFile?.id &&
                      supportFiles?.length === 0 &&
                      !supportDocument?.id &&
                      !sentCheckBox
                    ) {
                      toast.error(
                        "Please upload the Notice Template and Supporting Document"
                      );
                      return;
                    }
                  if (
                    files?.length === 0 &&
                    !updatedNoticeFile?.id &&
                    !sentCheckBox
                  ) {
                    toast.error("Please upload the Notice Template ");
                    return;
                  }
                  if (
                    !SupportDocNotRequiredNoticeTypes.includes(
                      data?.notice_type
                    )
                  )
                    if (
                      supportFiles?.length === 0 &&
                      !supportDocument?.id &&
                      !sentCheckBox
                    ) {
                      toast.error("Please upload the Supporting Document ");
                      return;
                    }
                  setSentCheckBox(!sentCheckBox);
                }}
                className={styles.checkBoxHeights}
                disabled={
                  noticeData?.status === "Sent" ||
                  userMode === "Onboarding" ||
                  noticeData?.status === "Sent - Onboarded"
                }
              />
            </div>
            {historyData?.length > 0 && (
              <div className={styles?.historyCon}>
                {historyData.map((each: any) => {
                  return (
                    <div key={each?.id}>
                      {`${formatDate(each?.email_date, DD_MM_YYYY)} - Sent by ${
                        each?.email_from
                      } - Sent to ${each?.email_to} ${
                        each?.client_supplier_name
                          ? ` - ${each?.client_supplier_name}`
                          : ""
                      }`}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );

      default:
        return <></>;
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
          {userMode !== "Onboarding" &&
            noticeData?.status !== "Sent - Onboarded" && (
              <Button
                className={styles.modalpopupBtn}
                disabled={disabledSaveBtn}
                onClick={() => {
                  setDisabledSaveBtn(true);
                  onHandleSaveClick();
                }}
              >
                Save
              </Button>
            )}
        </div>
      }
    >
      <div className={styles.dataContainer}>
        <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
          <Row>
            <Col lg={12} md={12} sm={12}>
              <div className="d-flex">
                <Image
                  src={Money.src}
                  alt="offer details"
                  layout="responsive"
                  className={styles.imgStyle}
                  width={210}
                  height={220}
                />
                <div className="ms-1">
                  <h6>{`Notice - Id ${noticeData?.notice_id}`}</h6>
                  <div className="d-flex">
                    <span className={styles.statusName}>{`Status -`}</span>
                    <span className={styles.paid}>
                      {noticeData?.status || ""}
                    </span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col lg={3} md={4} sm={12} xs={12} className={styles.switch1}>
              <div className="mt-4">Notice Automation Type</div>
              <div className={styles.radioSwitch}>
                <RadioSwitchToggle
                  radioOptions={[
                    {
                      value: "Basic",
                      label: "Basic",
                      hasError: false,
                    },
                    {
                      value: "Premium",
                      label: "Premium",
                      hasError: true,
                    },
                  ]}
                  selected={selectedToggled}
                  handleToggleChange={handleToggledChange}
                  disabled={isView}
                />
              </div>
            </Col>
            <Col lg={3} md={2}></Col>
            <Col lg={3} md={2}></Col>
            <Col lg={3} md={2} sm={12} xs={12} className="text-end"></Col>
          </Row>

          <div className="mt-4">
            <TextField
              type="text"
              labelText="Notice Type"
              name="PaymentTerms"
              id="PaymentTerms"
              value={formik.values.NoticeType}
              placeholder=""
              // onChange={formik.handleChange}
              classNames={styles.inputField2}
              disabled
            />
          </div>
          <div className={styles.exampleTem}>
            QBCC Example Template &nbsp;
            <span
              className={`${styles.statusName} ${styles.viewCursor}`}
              onClick={() => handleViewFile(noticeData?.notice_template)}
            >
              View
            </span>
          </div>
          <Row className="mt-3">
            <Col lg={6}>
              <TextField
                as="textarea"
                type="text"
                labelText="User Notes"
                placeholder=""
                name="Memo"
                id="Memo"
                maxLength={200}
                disabled
                value={formik.values.userNotes}
                classNames={styles.inputFieldControl}
              />
            </Col>
            <Col lg={6}></Col>
          </Row>
          <Row className="mt-4">
            <Col lg={4} md={4} sm={12} xs={12}>
              <TextField
                labelText="Account"
                name="Account"
                id="Account"
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputField2}
                value={formik.values.AccountName}
                disabled
              />
            </Col>
            <Col lg={4} md={4} sm={12} xs={12}>
              <TextField
                labelText="Project"
                name="Project"
                id="Project"
                endingDataStyles={styles.endIconStyle}
                classNames={styles.inputField2}
                value={formik.values.ProjectName}
                disabled
              />
            </Col>
            <Col lg={4} md={4} sm={12} xs={12}>
              <TextField
                labelText="Notice Source"
                name="Notice Source"
                id="Notice Source"
                endingDataStyles={styles.endIconStyle}
                placeholder=""
                classNames={styles.inputField2}
                disabled
                value={formik.values.NoticeSource}
              />
            </Col>
          </Row>
          {renderViews()}
        </Form>
        <AppModal
          show={openModal}
          onHide={() => setOpenModal(false)}
          secondButtonLabel="No"
          firstButtonLabel="Yes"
          modalHeading={""}
          modalBodyContent={
            "Do you need to Remove the attached supporting document?"
          }
          onConfirm={() => {
            handleModalPopUpFunction();
          }}
        />
      </div>
    </ModalFullScreen>
  );
};

export default NoticesViewType;
// do u need to removed the attached supporting document
