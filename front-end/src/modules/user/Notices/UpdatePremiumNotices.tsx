"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import CustomButton from "@/components/CustomButton/CustomButton";
import ToggleInputGroup from "@/components/Inputs/ToggleInputGroup";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType, uploadFile } from "@/shared/constant/general";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useRef, useState } from "react";
import {
  attachmentType,
  noticesAutomationType,
  noticeSourceType,
  QBCCNoticeTypesOnly,
  SupportDocNotRequiredNoticeTypes,
} from "./notices.constants";
import {
  GenerateMailForANotice,
  ListAllMailsOfANotice,
  UpdateNotice,
} from "./notices.functions";
import FormikControl from "@/components/FormikControl";
import { showErrorToast } from "@/components/Toaster";
import { FileErrors } from "@/shared/constant/messages";
import BaseModal from "@/components/BaseModal";
import { useTokenDetails } from "@/hooks";
import { deleteAttachment, multipleFileUploadApi } from "@/app/api/commonApi";
import { useLoaderContext } from "@/context/useLoader";
import { formatDate, getCompanyIdFromStorage } from "@/utils";
import { getFileUrl } from "@/utils/fileUrl";
import { RootState, useAppSelector } from "@/redux/store";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";

export default function UpdatePremiumNotices({
  apiData,
  isAdmin,
  isArchived,
}: any) {
  const router = useRouter();

  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const queryParams = useSearchParams();
  const complianceTab = queryParams.get("complianceTab");
  const complianceProjectId = queryParams.get("projectId");
  const noticeFileInputRef = useRef<any>(null);
  const supportDocFileInputRef = useRef<any>(null);

  const [noticeData, setNoticeData] = useState<any>(null);

  const [selectedAutomationType, setSelectedAutomationType] =
    useState("Premium");

  const [warningModal, setWarningModal] = useState(false);
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const [noticeAttachment, setNoticeAttachment] = useState<any>([]);

  const [existingNoticeAttachment, setExistingNoticeAttachment] = useState<any>(
    []
  );

  const [supportAttachment, setSupportAttachment] = useState<any>([]);

  const [existingSupportAttachment, setExistingSupportAttachment] =
    useState<any>([]);

  const [sentCheckBox, setSentCheckBox] = useState(false);
  const [noticesFileName, setNoticesFileName] = useState("");

  const [selectedFileError, setSelectedFileError] = useState("");
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [disabledSaveBtn, setDisabledSaveBtn] = useState(false);
  const [s75Document, setS75Document] = useState<any>({});
  const [deleteSelectedSupportNoticeData, setDeleteSelectedSupportNoticeData] =
    useState<any>();
  const [historyData, setHistoryData] = useState([]);
  const [qbccNoticeDocument, setQbccNoticeDocument] = useState<any>({});

  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  const pathname = usePathname();
  const isAdminRoute = pathname?.includes("/admin");
  const hasNoticeSource = !!noticeData?.source_type;

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  useEffect(() => {
    if (apiData?.notice_id) {
      patchNoticesData();
      fetchSentByList();
    }
    if (apiData?.qbccNotice?.id) {
      setQbccNoticeDocument(apiData?.qbccNotice);
    }
    if (apiData?.s75_file?.id) {
      setS75Document(apiData?.s75_file);
    }
    if (apiData?.s75_file?.id) {
      setS75Document(apiData?.s75_file);
    }
  }, [apiData]);

  async function fetchSentByList() {
    const mailData = await ListAllMailsOfANotice({
      notice_id: apiData?.notice_id,
      items_per_page: 1000,
      page: 1,
    });
    setHistoryData(mailData?.mails_list || []);
  }

  async function patchNoticesData() {
    try {
      if (apiData?.notice_id) {
        setNoticeData(apiData);

        setSentCheckBox(
          apiData?.status === "Sent" ||
            apiData?.status === "Sent - Onboarded" ||
            false
        );

        if (apiData?.supportDoc) {
          setExistingSupportAttachment(apiData?.supportDoc);
        }
        if (apiData?.uploadedNotice?.file) {
          setExistingNoticeAttachment([apiData?.uploadedNotice]);
          setNoticesFileName(apiData?.uploadedNotice?.file_name);
        }
      }
    } catch (err: any) {
      console.log("patchNoticesData ~ err:", err);
    }
  }

  function handleViewFile(displayFile: any) {
    if (displayFile?.file_path) {
      window.open(
        getFileUrl(displayFile?.file_path),
        "_blank" // Opens in new tab
      );
    } else if (
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

  function handleCheckboxChange(e: any) {
    // const isPaidViewType =
    //   noticeData?.ViewType === "Paid" ||
    //   noticeData?.ViewType === "Paid-delegated";
    // console.log("🚀 ~ onHandleSaveClick ~ isPaidViewType:", isPaidViewType);
    if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
      if (
        noticeAttachment?.length === 0 &&
        existingNoticeAttachment?.length == 0 &&
        supportAttachment?.length === 0 &&
        existingSupportAttachment?.length == 0 &&
        !sentCheckBox
      ) {
        showErrorToast(
          "Please upload the notice template and supporting Document"
        );
        return;
      }
    if (
      noticeAttachment?.length == 0 &&
      existingNoticeAttachment?.length == 0 &&
      !sentCheckBox
    ) {
      showErrorToast("Please upload the notice template ");
      return;
    }
    // if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
    //   if (
    //     supportAttachment?.length === 0 &&
    //     existingSupportAttachment?.length == 0 &&
    //     !sentCheckBox
    //   ) {
    //     showErrorToast("Please upload the supporting document  ");
    //     return;
    //   }
    if (
      !sentCheckBox &&
      QBCCNoticeTypesOnly.includes(noticeData?.notice_type)
    ) {
      setWarningModal(true);
    }
    setSentCheckBox(!sentCheckBox);
  }

  function onFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: string
  ) {
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
        //Handle when file size exceeds maximum size
        setSelectedFileError(FileErrors.FILE_LIMIT_EXCEEDS_5MB);
        // formik?.setFieldValue("trainingRecordFile", null);
        noticeFileInputRef.current.value = "";
        return;
      }

      if (fileType == attachmentType.NOTICE_UPLOAD) {
        setNoticesFileName(filesToUpload[0]?.name);
        setNoticeAttachment(filesToUpload);
      } else if (fileType == attachmentType.COMPULSORY_ATTACHMENTS) {
        setSupportAttachment(filesToUpload);
      }

      setSelectedFileError("");
    }
  }

  // Function to handle the file input click
  function handleButtonClick(typeOfAttachment: string) {
    if (noticeFileInputRef.current || supportDocFileInputRef.current) {
      if (typeOfAttachment == attachmentType.NOTICE_UPLOAD) {
        noticeFileInputRef.current.click(); // Programmatically click the file input
      } else {
        supportDocFileInputRef.current.click();
      }
    }
  }

  function truncateName(file: any, isDeleteHidden?: boolean) {
    const fileName = file?.name || file?.file_name;
    return fileName?.length > 70 && !isDeleteHidden
      ? fileName.slice(0, 70).concat("...")
      : fileName;
  }

  function handleDeleteFiles(fileObj: any) {
    if (fileObj?.name == noticesFileName) {
      setNoticeAttachment([]);
      setNoticesFileName("");
    } else if (fileObj?.file_name == noticesFileName) {
      setExistingNoticeAttachment([]);
      setNoticesFileName("");
    } else {
      setDeleteConfirmationModal(true);
      setDeleteSelectedSupportNoticeData(fileObj);
    }
  }

  async function onHandleSaveDraftClick() {
    try {
      setDisabledSaveBtn(true);
      if (!noticeData?.notice_id) {
        setDisabledSaveBtn(false);
        return;
      }
      setLoader(true);
      setLoaderInfo("Saving notice...");
      if (noticeAttachment?.length > 0 || supportAttachment.length > 0)
        await handleFileUploads();
      let payload = {
        notice_id: noticeData?.notice_id,
        status:
          noticeData?.status === "Not Sent" ? "Draft" : noticeData?.status,
      };
      if (
        existingNoticeAttachment?.length == 0 &&
        noticeData?.uploadedNotice?.id &&
        noticeAttachment?.length === 0
      ) {
        const payLoadFile = {
          attachmentId: noticeData?.uploadedNotice?.id,
          attachmentType: "Notices_uploads",
          id: noticeData?.id,
        };
        await deleteAttachment(payLoadFile);
      }
      if (
        existingSupportAttachment?.length == 0 &&
        noticeData?.supportDoc?.id &&
        supportAttachment?.length === 0
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
        if (complianceTab) {
          handleClose();
          return;
        } else {
          router.back();
        }
      }
      setLoader(false);
      setLoaderInfo("");
    } catch {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function onHandleSaveClick() {
    try {
      setDisabledSaveBtn(true);
      if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
        if (
          noticeAttachment?.length === 0 &&
          existingNoticeAttachment?.length == 0 &&
          supportAttachment?.length === 0 &&
          existingSupportAttachment?.length == 0
        ) {
          showErrorToast(
            "Please upload the Notice Template and Supporting Document"
          );
          setDisabledSaveBtn(false);
          return;
        }
      if (
        noticeAttachment?.length == 0 &&
        existingNoticeAttachment?.length == 0
      ) {
        showErrorToast("Please upload the Notice Template ");
        setDisabledSaveBtn(false);
        return;
      }
      // if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
      //   if (
      //     supportAttachment?.length === 0 &&
      //     existingSupportAttachment?.length == 0
      //   ) {
      //     showErrorToast("Please upload the Supporting Document  ");
      //     setDisabledSaveBtn(false);
      //     return;
      //   }
      setLoader(true);
      setLoaderInfo("Saving notice...");
      if (noticeAttachment?.length > 0 || supportAttachment?.length > 0)
        await handleFileUploads();
      let payload = {
        notice_id: noticeData?.notice_id,
        status: sentCheckBox ? "Sent" : noticeData?.status,
      };
      if (
        existingSupportAttachment?.length == 0 &&
        noticeData?.supportDoc?.id &&
        supportAttachment?.length === 0
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
        if (complianceTab) {
          handleClose();
          return;
        }
        router.back();
      }
      setLoader(false);
      setLoaderInfo("");
    } catch {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function onSaveSendClick() {
    try {
      setDisabledSaveBtn(true);
      if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
        if (
          noticeAttachment?.length === 0 &&
          existingNoticeAttachment?.length == 0 &&
          supportAttachment?.length === 0 &&
          existingSupportAttachment?.length == 0
        ) {
          showErrorToast(
            "Please upload the Notice Template and Supporting Document"
          );
          setDisabledSaveBtn(false);
          return;
        }
      if (
        noticeAttachment?.length == 0 &&
        existingNoticeAttachment?.length == 0
      ) {
        showErrorToast("Please upload the Notice Template ");
        setDisabledSaveBtn(false);
        return;
      }
      // if (!SupportDocNotRequiredNoticeTypes.includes(noticeData?.notice_type))
      //   if (
      //     supportAttachment?.length === 0 &&
      //     existingSupportAttachment?.length == 0
      //   ) {
      //     showErrorToast("Please upload the Supporting Document  ");
      //     setDisabledSaveBtn(false);
      //     return;
      //   }
      setLoader(true);
      setLoaderInfo("Saving notice...");
      if (noticeAttachment?.length > 0 || supportAttachment?.length > 0)
        await handleFileUploads();
      let payload = {
        notice_id: noticeData?.notice_id,
        status:
          noticeData?.status === "Not Sent" ? "Draft" : noticeData?.status,
        auto_sent: false,
      };
      if (
        existingSupportAttachment?.length == 0 &&
        noticeData?.supportDoc?.id &&
        supportAttachment?.length === 0
      ) {
        const payLoadFile = {
          attachmentId: noticeData?.supportDoc?.id,
          attachmentType: "Notices_support_docs",
          id: noticeData?.id,
        };
        await deleteAttachment(payLoadFile);
      }
      const response = await UpdateNotice(payload, false, setDisabledSaveBtn);
      if (response) {
        let payloadForMailGen = {
          id: noticeData?.id,
        };
        const genMail = await GenerateMailForANotice(payloadForMailGen);
        if (genMail?.id) {
          router.push(`${AppRoutes.USER_SEND_NOTICES}/${genMail?.id}`);
          setDisabledSaveBtn(false);
        } else {
          setDisabledSaveBtn(false);
        }
      }
      setLoader(false);
      setLoaderInfo("");
    } catch {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function handleFileUploads() {
    try {
      let fileIds = [];
      let multiUserData = [];
      if (noticeAttachment.length > 0) {
        multiUserData.push({
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Notices_uploads",
          notice_id: noticeData?.notice_id,
        });
      }
      if (supportAttachment.length > 0) {
        multiUserData.push({
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Notices_support_docs",
          notice_id: noticeData?.notice_id,
        });
      }
      if (noticeAttachment.length > 0 || supportAttachment.length > 0) {
        const fileResponse = await multipleFileUploadApi(
          [...noticeAttachment, ...supportAttachment],
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
    }
  }

  function handleClose() {
    if (complianceTab) {
      router.push(
        `${AppRoutes.USER_COMPLIANCE_VIEW}?project=${complianceProjectId}&tab=${complianceTab}`
      );
    } else {
      router.back();
    }
  }

  function navigateToClaimViewMode(data: any) {
    let paymentObj: any = 0;

    if (data?.source_claim_details?.payments?.length > 0) {
      const isPartPayment = data?.source_claim_details?.payments.some(
        (x: any) =>
          x?.payment_type === tabTypes.PART ||
          x?.payment_type === tabTypes.PAY_LESS_PART
      );

      if (isPartPayment) {
        paymentObj = data?.source_claim_details?.payments.findLast(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );
      }
    }

    router.push(
      `${AppRoutes.USER_VIEW_CLAIMS}/${data?.payment_claim_id}?type=${
        data?.source_claim_details?.cash_retention_type
      }&cash-retention-type=${
        data?.source_claim_details?.cash_retention_type === "Claim"
          ? ""
          : "RetentionClaim"
      }&beneficiary=${
        data?.source_claim_details?.beneficiary_type ?? ""
      }&payment-type=${
        paymentObj
          ? paymentObj?.payment_type
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_type
          : ""
      }&payment=${
        paymentObj
          ? paymentObj?.payment_id
          : data?.payments?.length > 0
          ? data?.payments[0]?.payment_id
          : ""
      }&ctype=${data?.source_claim_details?.claim_type}`
    );
  }

  function routeToNoticesSource(rowData: any) {
    if (rowData?.source_type == noticeSourceType.CLAIM) {
      navigateToClaimViewMode(rowData);
    } else if (rowData?.source_type == noticeSourceType.PAYMENT) {
      router.push(
        `${AppRoutes.USER_ADD_PAYMENT}?claim=${rowData?.payment_claim_id}&mode=view&payment=${rowData?.payment_id}`
      );
    } else if (
      rowData?.source_type == noticeSourceType.BANK_ACCOUNT ||
      rowData?.source_type == noticeSourceType.AUDIT
    ) {
      router.push(
        `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
          rowData?.bank_account_id
        }/${getCompanyIdFromStorage()}`
      );
    } else if (rowData?.source_type == noticeSourceType.CONTRACT) {
      router.push(
        `${AppRoutes.USER_CONTRACTS_OVERVIEW}/${rowData.contract_uuid}`
      );
    }
  }

  return (
    <Fragment>
      <div className="pt_fullpage">
        <div>
          <div>
            <div className="pt_crumbclose">
              <BreadCrumbs
                routePaths={[
                  {
                    path: AppRoutes.ADMIN_DASHBOARD,
                    name: "Home",
                  },
                  {
                    path: isAdmin
                      ? AppRoutes.ADMIN_NOTICES_CURRENT
                      : AppRoutes.USER_NOTICES,
                    name: "Notices",
                  },
                ]}
                activeRoute={"View Notices"}
              />
              <div className="pt_topfilters">
                <div className="pt_pageactions">
                  <CustomButton
                    actionType="button"
                    buttonName="Close"
                    buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                    onClick={() => handleClose()}
                    iconClassName={"fa-light fa-xmark-large"}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid pt_data">
            <div className="pt_data_clear">
              <h4>{noticeData?.notice_source ?? ""}</h4>
              <h5>
                <b>Notice ID:</b> {noticeData?.notice_id}
              </h5>
              {/* <h5>
                Status:{" "}
                <b
                  className={
                    noticeData?.status === "Draft" ||
                    noticeData?.status === "Not Sent"
                      ? "invalid"
                      : "valid"
                  }
                >
                  {noticeData?.status ? noticeData?.status.toUpperCase() : ""}
                </b>
              </h5> */}
              <h5>
                Status:{" "}
                <b
                  className={
                    noticeData?.status === "Draft" ||
                    noticeData?.status === "Not Sent" ||
                    noticeData?.notice_document_gen_failed === true
                      ? "invalid"
                      : "valid"
                  }
                >
                  {noticeData?.status
                    ? noticeData?.notice_document_gen_failed === true
                      ? `${noticeData?.status} – Notice Attachment Failed`
                      : noticeData?.status.toUpperCase()
                    : ""}
                </b>
              </h5>
            </div>
            <div>
              <h5>Notice automation type</h5>

              <ToggleInputGroup
                type="radio"
                name="noticesAutomationType"
                options={noticesAutomationType}
                selectedValue={selectedAutomationType}
                onChange={(e: any) =>
                  setSelectedAutomationType(e?.target?.value)
                }
                disabled
              />
            </div>
          </div>

          <div className="pt_expandtable">
            <details open>
              <summary>Notice</summary>

              <div className="grid pt_infocol">
                <div>
                  <h5>Notice type</h5>

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    value={noticeData?.notice_type}
                    name={"notice_type"}
                    type="text"
                    onChange={(e: any) => {}}
                    disabled
                    aria-label="Text"
                  />
                </div>
                <div>
                  <br />
                  <a href="#">
                    <button
                      className="secondary smallbutton"
                      onClick={() => {
                        handleViewFile(noticeData?.notice_template);
                      }}
                    >
                      <i className="fa-light fa-eye"></i>View QBCC Example
                      Template
                    </button>
                  </a>
                </div>
              </div>

              <div className="grid pt_infocol">
                <div>
                  <h5>User Notes</h5>

                  <FormikControl
                    control={InputType.TEXT_AREA}
                    placeholder={noticeData?.memo_notes}
                    aria-label="User notes"
                    name={"memo"}
                    onChange={(e: any) => {}}
                    disabled
                  />
                </div>
              </div>

              <div className="grid pt_infocol">
                <div>
                  <h5>Account</h5>
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    value={noticeData?.bank_account_name}
                    name={"bank_account_name"}
                    onChange={(e: any) => {}}
                    disabled
                  />
                </div>
                <div>
                  <h5>Project</h5>
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    value={noticeData?.project_name}
                    name={"project_name"}
                    onChange={(e: any) => {}}
                    disabled
                  />
                </div>
                {/* <div>
                  <h5>Notice Source</h5>
                  <FormikControl
                    style={{
                      cursor: noticeData?.source_type ? "pointer" : "default",
                      textDecoration: noticeData?.source_type
                        ? "underline"
                        : "none",
                      color: noticeData?.source_type ? "#007bff" : "#333",
                      margin: 0,
                    }}
                    control={InputType.TEXT_FIELD}
                    value={noticeData?.notice_source}
                    name={"notice_source"}
                    onChange={(e: any) => {}}
                    // disabled
                    onClick={() => routeToNoticesSource(noticeData)}
                  />
                </div> */}
                <div className="mb_1">
                  <h5 className=" mb_0_5">Notice Source</h5>
                  <p
                    onClick={() => {
                      if (!isAdminRoute && noticeData?.source_type) {
                        routeToNoticesSource(noticeData);
                      }
                    }}
                    style={{
                      cursor:
                        !isAdminRoute && noticeData?.source_type
                          ? "pointer"
                          : "default",
                      textDecoration:
                        !isAdminRoute && noticeData?.source_type
                          ? "underline"
                          : "none",
                      color:
                        !isAdminRoute && hasNoticeSource
                          ? "#1583db" // keep blue
                          : isAdminRoute && hasNoticeSource
                          ? "var(--text-disabled)" // disabled in admin
                          : "var(--text-primary)", // normal text

                      marginTop: "0.8rem",
                      fontSize: "12px",
                    }}
                  >
                    {noticeData?.notice_source || ""}
                  </p>
                </div>
              </div>

              <div className="pt_attachments">
                <div className="grid">
                  <div>
                    <div className="mb_0_5">
                      <h5>
                        {"Required Documents"}
                        {/* {<span className="required">*</span>} */}
                      </h5>
                    </div>
                    <input
                      type="file"
                      onChange={(e: any) =>
                        onFileChange(e, attachmentType.NOTICE_UPLOAD)
                      }
                      accept={uploadFile.pdf}
                      ref={noticeFileInputRef}
                      // disabled={formik?.values?.trainingRecordFile?.length > 0}
                      className="dis_none"
                    />
                    <input
                      type="file"
                      onChange={(e: any) =>
                        onFileChange(e, attachmentType.COMPULSORY_ATTACHMENTS)
                      }
                      accept={uploadFile.pdf}
                      ref={supportDocFileInputRef}
                      // disabled={formik?.values?.trainingRecordFile?.length > 0}
                      className="dis_none"
                    />
                    {noticeAttachment?.length == 0 &&
                      existingNoticeAttachment?.length == 0 &&
                      !isArchived && (
                        <CustomButton
                          buttonName={"Add Notice"}
                          actionType={"button"}
                          buttonType={`${buttonType.SECONDARY} mr_1`}
                          onClick={() =>
                            handleButtonClick(attachmentType.NOTICE_UPLOAD)
                          }
                        />
                      )}

                    {supportAttachment?.length == 0 &&
                      existingSupportAttachment?.length == 0 &&
                      !isArchived && (
                        <CustomButton
                          buttonName={"Add support document"}
                          actionType={"button"}
                          buttonType={buttonType.SECONDARY}
                          onClick={() =>
                            handleButtonClick(
                              attachmentType.COMPULSORY_ATTACHMENTS
                            )
                          }
                        />
                      )}
                    {(noticeAttachment?.length > 0 ||
                      supportAttachment?.length > 0 ||
                      existingNoticeAttachment?.length > 0 ||
                      existingSupportAttachment?.length > 0 ||
                      qbccNoticeDocument?.id ||
                      s75Document?.id) &&
                      [
                        ...noticeAttachment,
                        ...supportAttachment,
                        ...existingNoticeAttachment,
                        ...existingSupportAttachment,
                        ...(qbccNoticeDocument?.id ? [qbccNoticeDocument] : []),
                        ...(s75Document?.id ? [s75Document] : []),
                      ].map((fileObj: any) => (
                        <Fragment key={fileObj?.id}>
                          <div className="pt_itemwithremove mb_1">
                            <span>
                              {truncateName(
                                fileObj,
                                fileObj?.attachment_type !==
                                  attachmentType.QBCC_ATTACHMENT && isArchived
                              )}
                            </span>

                            <div>
                              <div className="notices_view_button">
                                <a
                                  className="downloadfile mr_zero_point_five mb_0.5"
                                  onClick={() => handleViewFile(fileObj)}
                                >
                                  <button
                                    className="secondary smallbutton"
                                    type="button"
                                  >
                                    <i className="fa-light fa-eye"></i>View
                                  </button>
                                </a>

                                {fileObj?.attachment_type !==
                                  attachmentType.QBCC_ATTACHMENT &&
                                  fileObj?.id !== s75Document?.id &&
                                  !isArchived && (
                                    <a className="downloadfile">
                                      <button
                                        className="contrast smallbutton"
                                        onClick={() =>
                                          handleDeleteFiles(fileObj)
                                        }
                                        type="button"
                                      >
                                        <i className="fa-light fa-trash"></i>
                                        Delete
                                      </button>
                                    </a>
                                  )}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                  </div>
                  <div>
                    <h5>Sent History</h5>
                    <br />
                    <FormikControl
                      control={InputType.CHECKBOX}
                      name={"sent"}
                      // selectedValue={sentCheckBox}
                      disabled={
                        isArchived ||
                        noticeData?.status === "Sent" ||
                        noticeData?.status === "Sent - Onboarded"
                      }
                      value={sentCheckBox}
                      checked={sentCheckBox}
                      onChange={handleCheckboxChange}
                    />
                    Sent
                    {historyData?.length > 0 && (
                      <div className="mt_0_5">
                        {historyData.map((each: any) => {
                          return (
                            <div key={each?.id}>
                              {`${formatDate(each?.email_date)} - Sent by ${
                                each?.email_from
                              } - Sent to ${each?.email_to} ${
                                each?.client_supplier_name && !isAdmin
                                  ? ` - ${each?.client_supplier_name}`
                                  : ""
                              }`}

                              {userMode !== "Onboarding" &&
                                noticeData?.status !== "Sent - Onboarded" &&
                                !isAdmin &&
                                !QBCCNoticeTypesOnly.includes(
                                  apiData?.notice_type
                                ) && (
                                  <span
                                    className={"cu-pointer"}
                                    onClick={() =>
                                      router.push(
                                        `${AppRoutes.USER_SEND_NOTICES}/${each?.id}`
                                      )
                                    }
                                  >
                                    {` - View`}
                                  </span>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div>
          <div className="pt_fullpageactions">
            <div>
              <CustomButton
                buttonName={"Cancel"}
                actionType={"button"}
                buttonType={buttonType.CONTRAST}
                iconClassName="fa-light fa-xmark-large"
                onClick={() => router.back()}
              />
            </div>
            <div>
              {!sentCheckBox && !isArchived && (
                <CustomButton
                  buttonName={
                    noticeData?.status === "Not Sent" ? "Save as draft" : "Save"
                  }
                  actionType={"button"}
                  buttonType={buttonType.SECONDARY}
                  iconClassName="fa-light fa-floppy-disk"
                  onClick={() => {
                    setDisabledSaveBtn(true);
                    onHandleSaveDraftClick();
                  }}
                />
              )}
              {noticeData?.status !== "Sent - Onboarded" &&
                sentCheckBox &&
                !isArchived && (
                  <CustomButton
                    buttonName={"Save"}
                    actionType={"button"}
                    buttonType={buttonType.SECONDARY}
                    iconClassName="fa-light fa-floppy-disk"
                    onClick={() => {
                      setDisabledSaveBtn(true);
                      onHandleSaveClick();
                    }}
                  />
                )}
              &nbsp; &nbsp;
              {!QBCCNoticeTypesOnly.includes(noticeData?.notice_type) &&
                noticeData?.status !== "Sent - Onboarded" &&
                !isArchived && (
                  <CustomButton
                    buttonName={
                      noticeData?.status !== "Sent" && sentCheckBox
                        ? "Send"
                        : "Save and send"
                    }
                    actionType={"button"}
                    buttonType={buttonType.PRIMARY}
                    iconClassName="fa-light fa-paper-plane-top"
                    onClick={() => onSaveSendClick()}
                  />
                )}
            </div>
          </div>
        </div>
      </div>
      {deleteConfirmationModal && (
        <BaseModal
          modalId={"delete confirmation modal"}
          displayModal={deleteConfirmationModal}
          onHeaderIconClose={() => setDeleteConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDeleteConfirmationModal(false)}
          onConfirm={async () => {
            setSupportAttachment([]);
            // setExistingSupportAttachment([]);
            if (deleteSelectedSupportNoticeData) {
              const payLoadFile = {
                attachmentId: deleteSelectedSupportNoticeData.id,
                attachmentType: "Notices_support_docs",
                id: noticeData?.id,
              };
              const res = await deleteAttachment(payLoadFile);
              if (res) {
                setExistingSupportAttachment(
                  existingSupportAttachment.filter(
                    (val: any) => val.id !== deleteSelectedSupportNoticeData.id
                  )
                );
              }
            }
            setDeleteConfirmationModal(false);
            setDeleteSelectedSupportNoticeData("");
            return true;
          }}
          firstButtonName={"No"}
          secondButtonName={"Yes"}
        >
          <h4>Do you need to Remove the attached supporting document?</h4>
        </BaseModal>
      )}
      {warningModal && (
        <BaseModal
          modalId={"delete confirmation modal"}
          displayModal={warningModal}
          onHeaderIconClose={() => setWarningModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setWarningModal(false)}
          hideSecondButton
          firstButtonName={"Ok"}
        >
          <h4>
            {" "}
            Please upload the notice to the QBCC portal or post to them as per
            the template.
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
