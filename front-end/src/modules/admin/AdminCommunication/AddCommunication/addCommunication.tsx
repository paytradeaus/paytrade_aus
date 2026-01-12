"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import FormikControl from "@/components/FormikControl";
import {
  buttonType,
  fileTypeFormats,
  imageTypeFormats,
  InputType,
} from "@/shared/constant/general";
import * as Yup from "yup";
import { useFormik } from "formik";
import debounce from "lodash/debounce";
import BaseModal from "@/components/BaseModal";
import AsyncSelect from "react-select/async";
import CustomEditor from "@/components/editor/editor";
import { useTokenDetails } from "@/hooks";
import { multipleFileUploadApi } from "@/app/api/commonApi";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useParams, useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton/CustomButton";
import FileSelector from "@/components/fileSelector/fileSelector";
import { showErrorToast } from "@/components/Toaster";
import BreadCrumbs from "@/components/BreadCrumbs";
import dynamic from "next/dynamic";
import { RootState, useAppSelector } from "@/redux/store";
import { AdminListAllUsers } from "../../Users/users.functions";
import { FileUploadResponseData } from "../../AdminFullScreenEmailTemplate/contact.types";
import {
  FetchEmailDetailsById,
  SendSystemEmailToTheClients,
} from "../../AdminFullScreenEmailTemplate/contact.functions";
import { useLoaderContext } from "@/context/useLoader";

const AddCommunication = (props: any) => {
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  const mailToData: any = useAppSelector(
    (state: RootState) => state.homePage.mailValue
  );

  const showModel: any = useAppSelector(
    (state: RootState) => state.homePage.showContactModel
  );

  const {
    isView,
    // isEdit,
    isFullScreenModal = false,
    mailTo = mailToData,
    ...rest
  } = props;

  const validationSchema = Yup.object().shape({
    from: Yup.string(),
    toEmails: Yup.string()
      // .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
      .required("At least one recipient is required"),
    // body: Yup.string().required("Body message is required"),
    subject: Yup.string().required("Subject message is required"),
  });
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
  const [editorContent, setEditorContent] = useState("");
  const [toEmailSelectedOpt, setToEmailSelectedOpt] = useState<any>(null);
  const [ccEmailSelectedOpt, setCcEmailSelectedOpt] = useState<any>(null);
  const params = useParams();
  const printPreviewRef = useRef<HTMLDivElement>(null); // Specify the type of ref
  const [emailViewData, setEmailViewData] = useState<any>({});
  const [originalFiles, setOriginalFiles] = useState([]);
  const [disabledBtn, setDisabledBtn] = useState(false);
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [viewFileData, setViewFileData] = useState<any>();
  const [showModal, setShowModal] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const fromEmailData =
    `${decodeTokenData?.userName}<${decodeTokenData?.emailId}>` || "";
  const [loadingOptions, setLoadingOptions] = useState(false);
  const handleEditorChange = (content: any) => {
    setEditorContent(content);
  };
  const handleSendAndCloseClick = () => {
    formik.handleSubmit();
  };
  // useEffect(() => {
  //   // if (isFullScreenModal && mailTo) {
  //   //   setRenderAsFullScreen(true);
  //   formik.setFieldValue("toEmails", mailTo);
  //   setToEmailSelectedOpt([{ label: mailTo, value: mailTo }]);
  //   // }
  // }, [mailTo, isFullScreenModal]);
  useEffect(() => {
    formik.setFieldValue("toEmails", ""); // Ensure it's empty
    setToEmailSelectedOpt([]); // Ensure selected options are cleared
  }, [isFullScreenModal]);

  useEffect(() => {
    (async () => {
      if (isView && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const emailDataResponse = await FetchEmailDetailsById(payload);
        if (emailDataResponse.id) {
          setEmailViewData(emailDataResponse);
          setViewFileData(emailDataResponse?.attachments);
        } else {
          setWorngIdCheck(true);
        }
      }
    })();
  }, []);
  const handleSelectToEmailsChange = (newOption: any) => {
    // formik.setFieldValue("UserId", newOption.value);
    formik.setFieldValue(
      "toEmails",
      newOption.map((option: any) => option.value).join(",")
    );
    setToEmailSelectedOpt(newOption);
  };
  const getAdminUsersList = async (inputValue: any) => {
    if (inputValue.length > 2) {
      const responseData = await AdminListAllUsers({
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
  const handleModalPopUpFunction = async () => {
    try {
      setLoaderInfo("Sending mail...");
      setLoader(true);

      let ccEmailsArray: any = [];
      let toEmailsArray: any = [];
      ccEmailSelectedOpt?.forEach((each: any) =>
        ccEmailsArray.push(each.value)
      );
      toEmailSelectedOpt?.forEach((each: any) =>
        toEmailsArray.push(each.value)
      );
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
          //    closeFullScreenModal();
        } else {
          router.push(AppRoutes.ADMIN_COMMUNICATION_LIST);
        }
      }
    } catch (error) {
      console.error("Error sending communication:", error);
    } finally {
      setLoader(false);
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
  const handleFileChange = (newFiles: File[]) => {
    if (originalFiles.length + files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      showErrorToast("You can only select up to five files.");
      return;
    }
    if (files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      showErrorToast("You can only select up to five files.");
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

  useEffect(() => {
    if (isView && emailViewData?.id) {
      formik.setValues({
        toEmails: emailViewData?.toEmails.toString(),
        ccEmails: emailViewData?.emailCcIds.toString(),
        subject: emailViewData?.subject,
      });

      setToEmailSelectedOpt(
        emailViewData?.toEmails.map((email: string) => ({
          label: email,
          value: email,
        }))
      );

      setCcEmailSelectedOpt(
        emailViewData?.emailCcIds.map((email: string) => ({
          label: email,
          value: email,
        }))
      );

      setEditorContent(emailViewData?.body);
    }
  }, [isView, emailViewData]);

  // const handlePrintClick = () => {
  //   const printContent = printPreviewRef.current?.innerHTML;

  //   // Create a new element to contain the print content
  //   const printContainer = document.createElement("div");
  //   printContainer.innerHTML = printContent || "";

  //   // Hide all other elements on the page
  //   document.body.querySelectorAll("*").forEach((element) => {
  //     if (element !== printContainer) {
  //       element.classList.add("hide-on-print"); // Apply a CSS class to hide elements
  //     }
  //   });

  //   // Append the print container to the document body
  //   document.body.appendChild(printContainer);

  //   // Print the print container
  //   window.print();

  //   // Remove the print container after printing
  //   document.body.removeChild(printContainer);

  //   // Show all other elements on the page
  //   document.body.querySelectorAll("*").forEach((element) => {
  //     if (element !== printContainer) {
  //       element.classList.remove("hide-on-print"); // Remove the CSS class to show elements
  //     }
  //   });
  // };
  const handlePrintClick = () => {
    const printContent = printPreviewRef.current?.innerHTML;

    // Create a new element to contain the print content
    const printContainer = document.createElement("div");
    printContainer.innerHTML = printContent || "";

    // Add a temporary print-specific CSS style to hide the red borders
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        .invalid, 
        .invalid i, 
        .invalid span {
          display: none !important;
        }
        .css-v7duua { 
          border-color: transparent !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Append the print container to the document body
    document.body.appendChild(printContainer);

    // Print the print container
    window.print();

    // Remove the print container and style after printing
    document.body.removeChild(printContainer);
    document.head.removeChild(style);
  };

  const getFileIcon = (file?: File) => {
    if (!file || !file.name) {
      return "/images/default-file-icon.png"; // Fallback icon if file is undefined
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    switch (fileExtension) {
      case "pdf":
        return "/images/pdf-icon.png";
      default:
        return "/images/default-file-icon.png"; // Default icon for other file types
    }
  };

  return (
    <div className="pt_fullpage">
      <br />
      <div className="container-fluid">
        <div className="pt_title">
          <div className="grid">
            <div className="pt_pagetitle">
              <h4>Send email</h4>
            </div>
            <div className="pt_pagetitle">
              <h4>Preview</h4>
            </div>
          </div>
        </div>
        <div className="pt_filtergroup">
          <div className="grid">
            <div>
              <form onSubmit={formik.handleSubmit}>
                <FormikControl
                  label={"From"}
                  name={"from"}
                  id={"from"}
                  control={InputType.TEXT_FIELD}
                  renderKey="label"
                  valueKey="value"
                  disabled
                  value={fromEmailData}
                  maxLength={26}
                />
                {true && (
                  <label className="labelStyle">
                    <small>To</small>
                  </label>
                )}
                <AsyncSelect
                  isMulti
                  isDisabled={isView}
                  cacheOptions
                  loadOptions={loadOptions}
                  onChange={handleSelectToEmailsChange}
                  value={toEmailSelectedOpt} // Updated value to reflect selected option
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
                      marginTop: "-20px",
                    }),
                  }}
                />
                {formik.touched.toEmails && formik.errors.toEmails && (
                  <small className="invalid">
                    <i className="fa-light fa-circle-xmark"></i>
                    <span>{formik.errors.toEmails}</span>
                  </small>
                )}
                <br />
                {true && (
                  <label className="labelStyle">
                    <small>CC</small>
                  </label>
                )}
                <AsyncSelect
                  isMulti
                  isDisabled={isView}
                  cacheOptions
                  loadOptions={loadOptions}
                  onChange={handleSelectCCEmailsChange}
                  value={ccEmailSelectedOpt} // Updated value to reflect selected option
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
                      marginTop: "-20px",
                    }),
                  }}
                />
                <br />
                <FormikControl
                  label={"Subject"}
                  name={"subject"}
                  id={"subject"}
                  isDisabled={isView}
                  required
                  control={InputType.TEXT_FIELD}
                  renderKey="label"
                  valueKey="value"
                  error={formik.errors.subject}
                  showError={formik.touched.subject && formik.errors.subject}
                  onChange={handleSubjectChange}
                  onBlur={formik.handleBlur("subject")}
                  value={formik.values.subject} // Ensuring subject field displays selected value
                  maxLength={26}
                />
                <br />
                {true && (
                  <label className="labelStyle">
                    <small>Email body</small>
                  </label>
                )}
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
                <br />
                {(files?.length > 0 || viewFileData?.length > 0) && (
                  <label>
                    <small>Attachments</small>
                  </label>
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
                    acceptedFileFormats={["application/pdf"]}
                    multiple={true}
                    maximumSize={5 * 1024}
                    onError={(error) => {
                      showErrorToast(`Max Allowed file size is ${5} Mb`);
                    }}
                  >
                    <div className="hideOnPrint">
                      <CustomButton
                        buttonName={"Choose files"}
                        buttonType={buttonType.PRIMARY}
                        actionType="button"
                      />
                    </div>
                  </FileSelector>
                )}
                {(files?.length > 0 || viewFileData?.length > 0) && (
                  <div>
                    {(files.length > 0 ? files : viewFileData).map(
                      (eachFile: any, index: number) => {
                        return (
                          <div
                            className="pt_itemwithremove iconItem"
                            style={{ margin: "5px 0px" }}
                            key={index}
                          >
                            <>
                              {/* {!isView && (
                                <img
                                  src={getFileIcon(eachFile)}
                                  alt="file icon"
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    marginRight: "10px",
                                  }}
                                />
                              )} */}
                              <span>
                                {isView
                                  ? eachFile?.file_name || eachFile?.name
                                  : `${eachFile.name}`}
                              </span>
                              <div className="hideOnPrint">
                                <CustomButton
                                  buttonName={"View"}
                                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                                  iconClassName={"fa-light fa-eye"}
                                  actionType="button"
                                  onClick={() => handleViewFile(eachFile)}
                                />

                                {!isView && (
                                  <CustomButton
                                    buttonName={"Delete"}
                                    buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                                    iconClassName={"fa-light fa-trash"}
                                    actionType="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Filter out the file that needs to be removed
                                      const updatedFiles = files.filter(
                                        (file, i) => i !== index
                                      );
                                      setFiles(updatedFiles);
                                      let filterNames =
                                        selectedFileNames.filter(
                                          (each: any) => each !== eachFile?.name
                                        );
                                      setSelectedFileNames(filterNames);
                                    }}
                                  />
                                )}
                              </div>
                            </>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </form>
            </div>
            <div className="previewBoxStyle ">
              <div>
                <b>From:</b> <span>{fromEmailData}</span>
              </div>
              <br />
              <div>
                <b>To:</b> <span>{formik?.values?.toEmails}</span>
              </div>
              <br />
              <div>
                <b>CC:</b> <span>{formik?.values?.ccEmails}</span>
              </div>
              {!isView &&
                originalFiles?.map((eachFile: any, index: number) => {
                  return (
                    <div
                      className="pt_itemwithremove"
                      style={{ margin: "5px 0px" }}
                      key={index}
                    >
                      <img
                        src={getFileIcon(eachFile)}
                        alt="file icon"
                        style={{
                          width: "20px",
                          height: "20px",
                          marginRight: "10px",
                        }}
                      />
                      <span>
                        {isView && [eachFile?.name || eachFile?.file_name]}
                      </span>
                      <CustomButton
                        buttonName={"View"}
                        buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                        iconClassName={"fa-light fa-eye"}
                        actionType="button"
                        onClick={() => handleViewFile(eachFile)}
                      />
                    </div>
                  );
                })}
              {(files?.length > 0 || viewFileData?.length > 0) && (
                <div>
                  {(files.length > 0 ? files : viewFileData).map(
                    (eachFile: any, index: number) => {
                      return (
                        <div
                          className="pt_itemwithremove"
                          style={{ margin: "5px 0px" }}
                          key={index}
                        >
                          <span>
                            {isView
                              ? eachFile?.file_name || eachFile?.name
                              : `${eachFile.name}`}
                          </span>
                          {/* <div>{!isView && []}</div> */}
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              <p className="thirdHeaderText">{formik.values.subject}</p>
              <div className="paymentId">
                <div
                  dangerouslySetInnerHTML={{
                    __html: editorContent,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="pt_fullpageactions hideOnPrint">
          <div>
            <a href="#">
              <button className="contrast" onClick={() => router.back()}>
                <i className="fa-light fa-xmark-large"></i>
                {"Cancel"}
              </button>
            </a>
          </div>
          <div>
            <CustomButton
              buttonName="Print"
              iconClassName="fa-sharp-duotone fa-light fa-print"
              buttonType={buttonType.SECONDARY}
              actionType="button"
              onClick={handlePrintClick}
            />
            &nbsp;
            {!isView && (
              <CustomButton
                buttonName="Send and Close"
                iconClassName="fa-light fa-circle-check"
                buttonType={buttonType.PRIMARY}
                actionType="button"
                disabled={disabledBtn}
                onClick={() => handleSendAndCloseClick()}
              />
            )}
          </div>
        </div>
        {showModal && (
          <BaseModal
            displayModal={showModal}
            onClose={() => setShowModal(false)}
            secondButtonName="Send"
            firstButtonName="Cancel"
            onConfirm={() => {
              handleModalPopUpFunction();
              return true;
            }}
          >
            <p className="text_center">Do you want to send your mail?</p>
          </BaseModal>
        )}
      </div>
    </div>
  );
};

export default AddCommunication;
